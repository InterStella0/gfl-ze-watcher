use std::collections::HashMap;
use std::sync::Arc;
use std::future::Future;
use std::time::Duration;
use redis::{AsyncCommands, RedisResult};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use sqlx::{Pool, Postgres};
use tokio::sync::{RwLock, Semaphore};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::postgres::PgQueryResult;
use sqlx::postgres::types::PgInterval;
use crate::core::model::{DbEvent, DbMap, DbMapAnalyze, DbMapBriefInfo, DbMapInfo, DbMapMeta, DbMapRank, DbMapRegion, DbMapRegionDate, DbMapSessionDistribution, DbPlayer, DbPlayerAlias, DbPlayerBrief, DbPlayerDetail, DbPlayerHourCount, DbPlayerMapPlayed, DbPlayerRank, DbPlayerRegionTime, DbPlayerSeen, DbPlayerSession, DbPlayerSessionTime, DbServer, DbServerMapPartial, DbServerMapPlayed, MapRegionDate};
use crate::core::utils::{acquire_redis_lock, interval_to_duration, release_redis_lock, CacheKey, CachedResult, IterConvert, DAY};
use crate::{FastCache};
use crate::core::api_models::{DailyMapRegion, DetailedPlayer, MapAnalyze, MapEventAverage, MapInfo, MapRank, MapRegion, MapSessionDistribution, PlayerBrief, PlayerHourDay, PlayerMostPlayedMap, PlayerRanks, PlayerRegionTime, PlayerSeen, PlayerSessionTime, ServerMapPlayedPaginated};

#[derive(Clone, Copy)]
pub enum QueryPriority {
    Light,
    Heavy,
}

#[allow(dead_code)]
struct DbWorkerLastCalculated{
    player_id: String,
    server_id: String,
    worker_type: String,
    last_calculated: String,
}

#[async_trait]
pub trait WorkerQuery<T>: Send + Sync {
    type Error: Send;

    async fn execute(&self) -> Result<T, Self::Error>;
    fn cache_key_pattern(&self) -> String;
    fn ttl(&self) -> u64;
    fn priority(&self) -> QueryPriority;
}

pub struct BackgroundWorker {
    cache: Arc<FastCache>,
    heavy_semaphore: Arc<Semaphore>,
    active_tasks: Arc<RwLock<HashMap<String, tokio::task::JoinHandle<()>>>>,
}

impl BackgroundWorker {
    pub fn new(cache: Arc<FastCache>, max_heavy_concurrent: usize) -> Self {
        Self {
            cache,
            heavy_semaphore: Arc::new(Semaphore::new(max_heavy_concurrent)),
            active_tasks: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn execute_with_session_fallback<T, Q>(
        &self,
        query: Q,
        current_session: &str,
        previous_session: Option<&str>,
    ) -> WorkResult<CachedResult<T>>
    where
        T: Serialize + for<'de> Deserialize<'de> + Send + Sync + Clone + 'static,
        Q: WorkerQuery<T> + Send + Sync + Clone + 'static,
        Q::Error: Send + 'static + std::fmt::Display,
    {
        let pattern = query.cache_key_pattern();
        let current_key = pattern.replace("{session}", current_session);
        let fallback_key = previous_session.map(|prev| pattern.replace("{session}", prev));

        self.get_with_fallback(
            &current_key,
            fallback_key.as_deref(),
            query.ttl(),
            query.priority(),
            move || {
                let query = query.clone();
                async move { query.execute().await }
            },
        ).await
    }
    pub async fn execute_get<T, Q>(
        &self,
        query: Q,
        current_session: &str,
    ) -> WorkResult<CachedResult<T>>
    where
        T: Serialize + for<'de> Deserialize<'de> + Send + Sync + Clone + 'static,
        Q: WorkerQuery<T> + Send + Sync + Clone + 'static,
        Q::Error: Send + 'static + std::fmt::Display,
        WorkError: From<Q::Error>,
    {
        let pattern = query.cache_key_pattern();
        let current_key = pattern.replace("{session}", current_session);

        self.execute(
            &current_key,
            query.ttl(),
            move || {
                let query = query.clone();
                async move { query.execute().await }
            },
        ).await
    }
    pub async fn execute<T, E, F, Fut>(
        &self,
        current_key: &str,
        ttl: u64,
        query_fn: F,
    ) -> WorkResult<CachedResult<T>>
    where
        T: Serialize + DeserializeOwned + Send + Sync + Clone + 'static,
        E: Send + 'static + std::fmt::Display,
        F: Fn() -> Fut + Send + Clone + 'static,
        WorkError: From<E>,
        Fut: Future<Output = Result<T, E>> + Send + 'static,
    {

        if let Ok(result) = self.try_cache_lookup(current_key).await {
            return Ok(CachedResult::current_data(result));
        }

        let result = query_fn().await
            .map_err(|e| WorkError::from(e))?;

        self.cache_result(&current_key, &result, ttl).await;
        Ok(CachedResult::new_data(result))
    }
    pub async fn get_with_fallback<T, E, F, Fut>(
        &self,
        current_key: &str,
        fallback_key: Option<&str>,
        ttl: u64,
        priority: QueryPriority,
        query_fn: F,
    ) -> WorkResult<CachedResult<T>>
    where
        T: Serialize + DeserializeOwned + Send + Sync + Clone + 'static,
        E: Send + 'static + std::fmt::Display,
        F: Fn() -> Fut + Send + Clone + 'static,
        Fut: Future<Output = Result<T, E>> + Send + 'static,
    {

        if let Ok(result) = self.try_cache_lookup(current_key).await {
            tracing::debug!("FOUND FIRST CACHE");
            return Ok(CachedResult::current_data(result));
        }

        if let Some(fallback) = fallback_key {
            if let Ok(result) = self.try_cache_lookup(fallback).await {
                tracing::debug!("FOUND SECOND CACHE");
                self.spawn_refresh_task(current_key, ttl, priority, query_fn).await;
                return Ok(CachedResult::backup_data(result));
            }
        }

        tracing::debug!("CALCULATING INSTEAD");

        self.spawn_refresh_task(current_key, ttl, priority, query_fn).await;
        Err(WorkError::Calculating)
    }

    async fn spawn_refresh_task<T, E, F, Fut>(
        &self,
        key: &str,
        ttl: u64,
        priority: QueryPriority,
        query_fn: F,
    ) where
        T: Serialize + DeserializeOwned + Send + Sync + 'static,
        E: Send + 'static + std::fmt::Display,
        F: Fn() -> Fut + Send + 'static,
        Fut: Future<Output = Result<T, E>> + Send + 'static,
    {
        let task_key = format!("refresh:{}", key);
        let mut tasks = self.active_tasks.write().await;

        if let Some(handle) = tasks.get(&task_key) {
            if !handle.is_finished() {
                return;
            } else {
                tasks.remove(&task_key);
            }
        }

        let semaphore = match priority {
            QueryPriority::Heavy => Some(self.heavy_semaphore.clone()),
            QueryPriority::Light => None,
        };
        let cache = self.cache.clone();
        let active_tasks = self.active_tasks.clone();
        let key_owned = key.to_string();
        let task_key_clone = task_key.clone();

        let handle = tokio::spawn(async move {
            let _permit = if let Some(ref sem) = semaphore {
                Some(sem.acquire().await.expect("Failed to acquire semaphore?"))
            } else {
                None
            };

            tracing::info!("Starting background refresh ({}): {}",
                match priority {
                    QueryPriority::Heavy => "heavy",
                    QueryPriority::Light => "light",
                }, key_owned);

            match query_fn().await {
                Ok(result) => {
                    let temp_worker = BackgroundWorker {
                        cache,
                        heavy_semaphore: Arc::new(Semaphore::new(1)),
                        active_tasks: Arc::new(RwLock::new(HashMap::new())),
                    };
                    temp_worker.cache_result(&key_owned, &result, ttl).await;
                    tracing::info!("Background refresh completed: {}", key_owned);
                }
                Err(e) => {
                    tracing::warn!("Background refresh failed: {}:{}", key_owned, e);
                }
            }

            let mut tasks = active_tasks.write().await;
            tasks.remove(&task_key_clone);
        });

        tasks.insert(task_key, handle);
    }

    async fn try_cache_lookup<T>(&self, key: &str) -> Result<T, ()>
    where
        T: for<'de> Deserialize<'de>,
    {
        let cache_key = format!("gfl-ze-watcher:{}", key);

        if let Some(val) = self.cache.memory.get(key).await {
            if let Ok(deserialized) = serde_json::from_str::<T>(&val) {
                return Ok(deserialized);
            }
        }
        if let Ok(mut conn) = self.cache.redis_pool.get().await {
            if let Ok(result_str) = conn.get::<_, String>(&cache_key).await {
                self.cache.memory.insert(key.to_string(), result_str.clone()).await;
                if let Ok(deserialized) = serde_json::from_str::<T>(&result_str) {
                    return Ok(deserialized);
                }
            }
        }

        Err(())
    }

    async fn cache_result<T>(&self, key: &str, data: &T, ttl: u64)
    where
        T: Serialize,
    {
        if let Ok(json_value) = serde_json::to_string(data) {
            let cache_key = format!("gfl-ze-watcher:{key}");
            self.cache.memory.insert(key.to_string(), json_value.clone()).await;

            if let Ok(mut conn) = self.cache.redis_pool.get().await {
                let _: RedisResult<()> = conn.set_ex(&cache_key, &json_value, ttl).await;
            }
        }
    }
}

#[derive(Clone)]
pub struct PlayerContext {
    pub player: DbPlayer,
    pub server: DbServer,
    pub cache_key: CacheKey,
}
pub struct MapContext{
    pub server: DbServer,
    pub map: DbMap,
    pub cache_key: CacheKey,
}
pub type WorkResult<T> = Result<T, WorkError>;

#[derive(Clone)]
pub struct Query<T>{
    pub pool: Arc<Pool<Postgres>>,
    pub cache: Arc<FastCache>,
    pub data: T
}

#[derive(Clone)]
pub struct PlayerData{
    pub player_id: String,
    pub server_id: String,
    pub current_session: String,
}

#[derive(Clone)]
pub struct PlayerSessionData{
    pub player_id: String,
    pub server_id: String,
    pub session_id: String,
}
#[derive(Clone)]
pub struct MapData{
    pub map_name: String,
    pub server_id: String,
}

#[derive(Clone)]
pub struct MapBasicQuery<T> {
    pub context: Query<MapData>,
    _phantom: std::marker::PhantomData<T>,
}

#[derive(Clone)]
pub struct MapSessionData {
    pub map_name: String,
    pub server_id: String,
    pub session_page: usize
}

#[derive(Clone)]
pub struct MapSessionQuery {
    pub context: Query<MapSessionData>,
}
#[async_trait]
impl WorkerQuery<Vec<DbServerMapPlayed>> for MapSessionQuery {
    type Error = sqlx::Error;

    async fn execute(&self) -> Result<Vec<DbServerMapPlayed>, Self::Error> {
        let pagination = 5;
        let ctx = &self.context;
        let offset = pagination * ctx.data.session_page as i64;

        sqlx::query_as!(DbServerMapPlayed,
            "SELECT *, COUNT(time_id) OVER()::integer AS total_sessions
                FROM server_map_played
                WHERE server_id=$1 AND map=$2
                ORDER BY started_at DESC
                LIMIT $3
                OFFSET $4",
            ctx.data.server_id, ctx.data.map_name, pagination, offset
        ).fetch_all(&*ctx.pool).await
    }

    fn cache_key_pattern(&self) -> String {
        let ctx = &self.context;
        let page = ctx.data.session_page;
        format!("map-session-{page}:{}:{}:{{session}}",  ctx.data.server_id, ctx.data.map_name)
    }

    fn ttl(&self) -> u64 {
        7 * DAY
    }

    fn priority(&self) -> QueryPriority {
        QueryPriority::Light
    }
}


impl<T> MapBasicQuery<T> {
    fn new(ctx: &MapContext, pool: Arc<Pool<Postgres>>, cache: Arc<FastCache>) -> Self {
        Self {
            context: Query {
                pool,
                cache,
                data: MapData{
                    map_name: ctx.map.map.clone(),
                    server_id: ctx.server.server_id.clone(),
                },
            },
            _phantom: std::marker::PhantomData,
        }
    }
}
#[async_trait]
impl WorkerQuery<Vec<DbMapRegion>> for MapBasicQuery<Vec<DbMapRegion>> {
    type Error = sqlx::Error;

    async fn execute(&self) -> Result<Vec<DbMapRegion>, Self::Error> {
        let ctx = &self.context;
        sqlx::query_as!(DbMapRegion, "
            WITH session_data AS (
              SELECT
                g.map,
                g.started_at AT TIME ZONE 'UTC' AS started_at,
                g.ended_at AT TIME ZONE 'UTC' AS ended_at,
                date_trunc('day', g.started_at AT TIME ZONE 'UTC') AS start_day,
                date_trunc('day', g.ended_at AT TIME ZONE 'UTC') AS end_day
              FROM server_map_played g

              WHERE g.map = $2
                AND g.server_id = $1
                AND g.started_at AT TIME ZONE 'UTC'
                     BETWEEN (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' - interval '1 year')
                         AND CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
            ),
            game_days AS (
              SELECT
                sd.*,
                d::date AS play_day
              FROM session_data sd,
                   generate_series(sd.start_day, sd.end_day, interval '1 day') AS d
            ),
            region_intervals AS (
              SELECT
                gd.map,
                gd.started_at,
                gd.ended_at,
                gd.play_day,
                rt.region_id,
                rt.region_name,
                CASE
                  WHEN (rt.start_time AT TIME ZONE 'UTC')::time <= (rt.end_time AT TIME ZONE 'UTC')::time THEN
                       (gd.play_day + (rt.start_time AT TIME ZONE 'UTC')::time)
                  ELSE
                       (gd.play_day - interval '1 day' + (rt.start_time AT TIME ZONE 'UTC')::time)
                END AS region_start,
                CASE
                  WHEN (rt.start_time AT TIME ZONE 'UTC')::time <= (rt.end_time AT TIME ZONE 'UTC')::time THEN
                       (gd.play_day + (rt.end_time AT TIME ZONE 'UTC')::time)
                  ELSE
                       (gd.play_day + (rt.end_time AT TIME ZONE 'UTC')::time)
                END AS region_end
              FROM game_days gd
              CROSS JOIN region_time rt
            ),
            daily_region_play AS (
              SELECT
                region_id,
                region_name,
                map,
                play_day,
                SUM(
                  LEAST(ended_at, region_end) - GREATEST(started_at, region_start)
                ) AS region_play_duration
              FROM region_intervals
              WHERE ended_at > region_start
                AND started_at < region_end
              GROUP BY region_id, region_name, map, play_day
            ),
            all_days AS (
              SELECT day::date AS play_day
              FROM generate_series(
                CURRENT_TIMESTAMP AT TIME ZONE 'UTC' - interval '1 year',
                CURRENT_TIMESTAMP AT TIME ZONE 'UTC',
                interval '1 day'
              ) day
            ), final_calculation AS (
            SELECT
              ad.play_day::timestamptz AS date,
              rt.region_name,
              COALESCE(drp.region_play_duration, interval '0 seconds') AS total_play_duration
            FROM all_days ad
            CROSS JOIN region_time rt
            LEFT JOIN daily_region_play drp
              ON ad.play_day = drp.play_day
             AND rt.region_id = drp.region_id
            ORDER BY ad.play_day, total_play_duration DESC
			)
			SELECT region_name, $2 as map, SUM(total_play_duration) total_play_duration
			FROM final_calculation
			GROUP BY region_name
        ", ctx.data.server_id, ctx.data.map_name).fetch_all(&*ctx.pool).await
    }

    fn cache_key_pattern(&self) -> String {
        let ctx = &self.context;
        format!("map-regions:{}:{}:{{session}}", ctx.data.server_id, ctx.data.map_name)
    }

    fn ttl(&self) -> u64 {
        7 * DAY
    }

    fn priority(&self) -> QueryPriority {
        QueryPriority::Light
    }
}
#[async_trait]
impl WorkerQuery<Vec<DbMapRegionDate>> for MapBasicQuery<Vec<DbMapRegionDate>> {
    type Error = sqlx::Error;

    async fn execute(&self) -> Result<Vec<DbMapRegionDate>, Self::Error> {
        let ctx = &self.context;
        sqlx::query_as!(DbMapRegionDate, "
            WITH session_data AS (
              SELECT
                g.map,
                g.started_at AT TIME ZONE 'UTC' AS started_at,
                g.ended_at AT TIME ZONE 'UTC' AS ended_at,
                date_trunc('day', g.started_at AT TIME ZONE 'UTC') AS start_day,
                date_trunc('day', g.ended_at AT TIME ZONE 'UTC') AS end_day
              FROM server_map_played g
                WHERE g.map = $2
                  AND g.server_id = $1
                AND g.started_at AT TIME ZONE 'UTC'
                     BETWEEN (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' - interval '1 year')
                         AND CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
            ),
            game_days AS (
              SELECT
                sd.*,
                d::date AS play_day
              FROM session_data sd,
                   generate_series(sd.start_day, sd.end_day, interval '1 day') AS d
            ),
            region_intervals AS (
              SELECT
                gd.map,
                gd.started_at,
                gd.ended_at,
                gd.play_day,
                rt.region_id,
                rt.region_name,
                CASE
                  WHEN (rt.start_time AT TIME ZONE 'UTC')::time <= (rt.end_time AT TIME ZONE 'UTC')::time THEN
                       (gd.play_day + (rt.start_time AT TIME ZONE 'UTC')::time)
                  ELSE
                       (gd.play_day - interval '1 day' + (rt.start_time AT TIME ZONE 'UTC')::time)
                END AS region_start,
                CASE
                  WHEN (rt.start_time AT TIME ZONE 'UTC')::time <= (rt.end_time AT TIME ZONE 'UTC')::time THEN
                       (gd.play_day + (rt.end_time AT TIME ZONE 'UTC')::time)
                  ELSE
                       (gd.play_day + (rt.end_time AT TIME ZONE 'UTC')::time)
                END AS region_end
              FROM game_days gd
              CROSS JOIN region_time rt
            ),
            daily_region_play AS (
              SELECT
                region_id,
                region_name,
                map,
                play_day,
                SUM(
                  LEAST(ended_at, region_end) - GREATEST(started_at, region_start)
                ) AS region_play_duration
              FROM region_intervals
              WHERE ended_at > region_start
                AND started_at < region_end
              GROUP BY region_id, region_name, map, play_day
            ),
            all_days AS (
              SELECT day::date AS play_day
              FROM generate_series(
                CURRENT_TIMESTAMP AT TIME ZONE 'UTC' - interval '1 year',
                CURRENT_TIMESTAMP AT TIME ZONE 'UTC',
                interval '1 day'
              ) day
            )
            SELECT
              ad.play_day::timestamptz AS date,
              rt.region_name,
              COALESCE(drp.region_play_duration, interval '0 seconds') AS total_play_duration
            FROM all_days ad
            CROSS JOIN region_time rt
            LEFT JOIN daily_region_play drp
              ON ad.play_day = drp.play_day
             AND rt.region_id = drp.region_id
            ORDER BY ad.play_day, total_play_duration DESC
        ", ctx.data.server_id, ctx.data.map_name).fetch_all(&*ctx.pool).await
    }

    fn cache_key_pattern(&self) -> String {
        let ctx = &self.context;
        format!("heat-region:{}:{}:{{session}}", ctx.data.server_id, ctx.data.map_name)
    }

    fn ttl(&self) -> u64 {
        7 * DAY
    }

    fn priority(&self) -> QueryPriority {
        QueryPriority::Light
    }
}
#[async_trait]
impl WorkerQuery<Vec<DbEvent>> for MapBasicQuery<Vec<DbEvent>> {
    type Error = sqlx::Error;

    async fn execute(&self) -> Result<Vec<DbEvent>, Self::Error> {
        let ctx = &self.context;
        sqlx::query_as!(DbEvent, "
            WITH smp_filtered AS (
              SELECT *
              FROM server_map_played
              WHERE map = $2
                AND server_id = $1
            )
            SELECT vals.event_name, AVG(vals.counted)::FLOAT average
            FROM (
              SELECT psa.event_name, smp.time_id, COUNT(psa.event_name) AS counted
              FROM smp_filtered smp
              CROSS JOIN LATERAL (
                SELECT *
                FROM player_server_activity psa
                WHERE psa.created_at BETWEEN smp.started_at AND smp.ended_at
              ) psa
              GROUP BY psa.event_name, smp.time_id
            ) vals
            GROUP BY vals.event_name
        ", ctx.data.server_id, ctx.data.map_name).fetch_all(&*ctx.pool).await
    }

    fn cache_key_pattern(&self) -> String {
        let ctx = &self.context;
        format!("map-events:{}:{}:{{session}}", ctx.data.server_id, ctx.data.map_name)
    }

    fn ttl(&self) -> u64 {
        DAY
    }

    fn priority(&self) -> QueryPriority {
        QueryPriority::Light
    }
}
#[async_trait]
impl WorkerQuery<Vec<DbMapSessionDistribution>> for MapBasicQuery<Vec<DbMapSessionDistribution>> {
    type Error = sqlx::Error;

    async fn execute(&self) -> Result<Vec<DbMapSessionDistribution>, Self::Error> {
        let ctx = &self.context;
        // possible session_range to be invalid if there is a new key.
        let _ = sqlx::query!("
            WITH params AS (
                SELECT $2 AS map_target,
                       $1 AS target_server
            ),
            time_spent AS (
                SELECT
                    pss.player_id,
                    LEAST(pss.ended_at, smp.ended_at) - GREATEST(pss.started_at, smp.started_at) as total_duration
                FROM public.server_map_played smp
                INNER JOIN player_server_session pss
                    ON pss.started_at < smp.ended_at
                    AND pss.ended_at > smp.started_at
                WHERE smp.map = (SELECT map_target FROM params)
                    AND smp.server_id = (SELECT target_server FROM params)
            ),
            session_distribution AS (
                SELECT
                    CASE
                        WHEN total_duration < INTERVAL '10 minutes' THEN 'Under 10'
                        WHEN total_duration BETWEEN INTERVAL '10 minutes' AND INTERVAL '30 minutes' THEN '10 - 30'
                        WHEN total_duration BETWEEN INTERVAL '30 minutes' AND INTERVAL '45 minutes' THEN '30 - 45'
                        WHEN total_duration BETWEEN INTERVAL '45 minutes' AND INTERVAL '60 minutes' THEN '45 - 60'
                        ELSE 'Over 60'
                    END AS session_range
                FROM time_spent
            )
            INSERT INTO website.map_session_distribution(server_id, map, session_range, session_count)
            SELECT
                $1 AS server_id,
                $2 AS map,
                session_range,
                COUNT(*) AS session_count
            FROM session_distribution
            GROUP BY session_range
            ON CONFLICT(server_id, map, session_range)
            DO UPDATE SET
                session_count=EXCLUDED.session_count",
            ctx.data.server_id, ctx.data.map_name
            ).execute(&*ctx.pool).await?;
        sqlx::query_as!(DbMapSessionDistribution,
            "SELECT session_range, session_count
                FROM website.map_session_distribution
                WHERE server_id=$1 AND map=$2",
            ctx.data.server_id, ctx.data.map_name
        ).fetch_all(&*ctx.pool).await
    }

    fn cache_key_pattern(&self) -> String {
        let ctx = &self.context;
        format!("sessions_distribution:{}:{}:{{session}}", ctx.data.server_id, ctx.data.map_name)
    }

    fn ttl(&self) -> u64 {
        30 * DAY
    }

    fn priority(&self) -> QueryPriority {
        QueryPriority::Light
    }
}
#[async_trait]
impl WorkerQuery<DbServerMapPartial> for MapBasicQuery<DbServerMapPartial> {
    type Error = sqlx::Error;

    async fn execute(&self) -> Result<DbServerMapPartial, Self::Error> {
        let ctx = &self.context;
        sqlx::query_as!(DbServerMapPartial,
                "SELECT
                    map,
                    SUM(ended_at - started_at)AS total_playtime,
                    COUNT(time_id) AS total_sessions,
                    MAX(started_at) AS last_played
                    FROM server_map_played
                    WHERE server_id=$1 AND map=$2
                    GROUP BY map
                    LIMIT 1",
            ctx.data.server_id, ctx.data.map_name
            ).fetch_one(&*ctx.pool).await
    }

    fn cache_key_pattern(&self) -> String {
        let ctx = &self.context;
        format!("map-partial:{}:{}:{{session}}", ctx.data.server_id, ctx.data.map_name)
    }

    fn ttl(&self) -> u64 {
        7 * DAY
    }

    fn priority(&self) -> QueryPriority {
        QueryPriority::Light
    }
}
#[async_trait]
impl WorkerQuery<Vec<DbPlayerBrief>> for MapBasicQuery<Vec<DbPlayerBrief>> {
    // Can be reduced
    type Error = sqlx::Error;

    async fn execute(&self) -> Result<Vec<DbPlayerBrief>, Self::Error> {
        let ctx = &self.context;
        sqlx::query_as!(DbPlayerBrief,
                "
            WITH params AS (
                SELECT $2 AS map_target, $1 AS target_server
            ),
            time_spent AS (
                SELECT
                    pss.player_id, SUM(
                        LEAST(pss.ended_at, smp.ended_at) - GREATEST(pss.started_at, smp.started_at)
                    ) AS total
                FROM  public.server_map_played smp
                INNER JOIN player_server_session pss
                ON pss.started_at < smp.ended_at
                AND pss.ended_at > smp.started_at
                WHERE smp.map = (SELECT map_target FROM params)
                    AND smp.server_id=(SELECT target_server FROM params)
                GROUP BY pss.player_id
            )
            ,
            online_players AS (
                SELECT player_id, started_at
                FROM player_server_session
                WHERE server_id=(SELECT target_server FROM params)
                    AND ended_at IS NULL
                        AND (CURRENT_TIMESTAMP - started_at) < INTERVAL '12 hours'
                ),
            last_player_sessions AS (
                SELECT DISTINCT ON (player_id) player_id, started_at, ended_at
                FROM player_server_session
                WHERE ended_at IS NOT NULL
                    AND server_id=(SELECT target_server FROM params)
                ORDER BY player_id, started_at DESC
            )
            SELECT
                COUNT(p.player_id) OVER() total_players,
                p.player_id,
                p.player_name,
                p.created_at,
                ts.total AS total_playtime,
                COALESCE(op.started_at, NULL) as online_since,
                lps.started_at AS last_played,
                (lps.ended_at - lps.started_at) AS last_played_duration,
                0::int AS rank
            FROM player p
            JOIN time_spent ts
            ON ts.player_id = p.player_id
            LEFT JOIN online_players op
            ON op.player_id=p.player_id
            JOIN last_player_sessions lps
            ON lps.player_id=p.player_id
            ORDER BY total_playtime DESC
            LIMIT 10",
            ctx.data.server_id, ctx.data.map_name
            ).fetch_all(&*ctx.pool).await
    }

    fn cache_key_pattern(&self) -> String {
        let ctx = &self.context;
        format!("map-top-10:{}:{}:{{session}}", ctx.data.server_id, ctx.data.map_name)
    }

    fn ttl(&self) -> u64 {
        7 * DAY
    }

    fn priority(&self) -> QueryPriority {
        QueryPriority::Light
    }
}
#[async_trait]
impl WorkerQuery<Option<DbMapMeta>> for MapBasicQuery<Option<DbMapMeta>> {
    type Error = sqlx::Error;
    async fn execute(&self) -> Result<Option<DbMapMeta>, Self::Error> {
        let ctx = &self.context;
        sqlx::query_as!(DbMapMeta, "SELECT * FROM map_metadata WHERE name=$1 LIMIT 1", ctx.data.map_name)
            .fetch_optional(&*ctx.pool).await
    }

    fn cache_key_pattern(&self) -> String {
        let ctx = &self.context;
        format!("map_metadata:{}:{}:{{session}}", ctx.data.server_id, ctx.data.map_name)
    }

    fn ttl(&self) -> u64 {
        DAY
    }

    fn priority(&self) -> QueryPriority {
        QueryPriority::Light
    }
}
#[async_trait]
impl WorkerQuery<DbMapInfo> for MapBasicQuery<DbMapInfo> {
    type Error = sqlx::Error;
    async fn execute(&self) -> Result<DbMapInfo, Self::Error> {
        let ctx = &self.context;
        sqlx::query_as!(DbMapInfo, "
            SELECT map AS name,
                   first_occurrence,
                   cleared_at, is_tryhard,
                   is_casual, current_cooldown,
                   pending_cooldown, no_noms,
                   workshop_id, resolved_workshop_id,
                   enabled,
                   min_players,
                   max_players
            FROM server_map
            WHERE server_id=$1 AND map=$2
            LIMIT 1", ctx.data.server_id, ctx.data.map_name)
            .fetch_one(&*ctx.pool)
            .await
    }

    fn cache_key_pattern(&self) -> String {
        let ctx = &self.context;
        format!("map_info_data:{}:{}:{{session}}", ctx.data.server_id, ctx.data.map_name)
    }

    fn ttl(&self) -> u64 {
        60 * 60
    }

    fn priority(&self) -> QueryPriority {
        QueryPriority::Light
    }
}
#[async_trait]
impl WorkerQuery<DbMapAnalyze> for MapBasicQuery<DbMapAnalyze> {
    type Error = sqlx::Error;

    async fn execute(&self) -> Result<DbMapAnalyze, Self::Error> {
        let ctx = &self.context;
        let _ = sqlx::query!("
             WITH params AS (
               SELECT
                 $2::text AS map_target,
                 $1::text AS target_server
             ),
             map_data AS (
               SELECT
                 map,
                 COUNT(time_id) AS total_sessions,
                 SUM(ended_at - started_at) AS total_playtime
               FROM server_map_played smp
               CROSS JOIN params p
               WHERE smp.map = p.map_target
                 AND smp.server_id = p.target_server
               GROUP BY map
             ),
             player_metrics AS (
                SELECT
                   COUNT(DISTINCT pss.player_id) AS unique_players,
                   SUM(LEAST(pss.ended_at, smp.ended_at) - GREATEST(pss.started_at, smp.started_at)) cum_hours,
                  AVG(LEAST(pss.ended_at, smp.ended_at) - GREATEST(pss.started_at, smp.started_at))
                    AS avg_playtime_before_quitting,
                  SUM(CASE WHEN (LEAST(pss.ended_at, smp.ended_at) - GREATEST(pss.started_at, smp.started_at)) < INTERVAL '5 minutes'
                           THEN 1 ELSE 0 END)::float / COUNT(pss.session_id) AS dropoff_rate
                FROM player_server_session pss
                CROSS JOIN params p
                JOIN server_map_played smp
                  ON smp.server_id = pss.server_id
                  AND smp.map = p.map_target
                  AND tstzrange(pss.started_at, pss.ended_at) && tstzrange(smp.started_at, smp.ended_at)
                WHERE pss.server_id = p.target_server
             ),
             player_counts AS (
                SELECT
                  COALESCE(AVG(spc.player_count), 0) AS avg_players_per_session
                FROM server_player_counts spc
                CROSS JOIN params p
                JOIN server_map_played smp
                  ON smp.server_id = spc.server_id
                  AND smp.map = p.map_target
                  AND spc.bucket_time BETWEEN smp.started_at AND smp.ended_at
                WHERE spc.server_id = p.target_server
             )
             INSERT INTO website.map_analyze (
                server_id,
                map,
                total_playtime,
                total_sessions,
                cum_player_hours,
                unique_players,
                last_played,
                last_played_ended,
                avg_playtime_before_quitting,
                dropoff_rate,
                avg_players_per_session
            )
             SELECT
                  p.target_server,
                  md.map,
                  md.total_playtime,
                  md.total_sessions,
                  pd.cum_hours cum_player_hours,
                  pd.unique_players,
			    (SELECT MAX(started_at)
                    FROM server_map_played
                    WHERE server_id=(
                        SELECT target_server FROM params
                        ) AND map=(
                        SELECT map_target FROM params
                        ) LIMIT 1
                ) AS last_played,
                (SELECT MAX(ended_at)
                    FROM server_map_played
                    WHERE server_id=(
                        SELECT target_server FROM params
                    ) AND map=(
                        SELECT map_target FROM params
                    ) LIMIT 1
                ) AS last_played_ended,
                pd.avg_playtime_before_quitting,
               COALESCE(pd.dropoff_rate, 0) AS dropoff_rate,
               ROUND(pc.avg_players_per_session::numeric, 3)::FLOAT AS avg_players_per_session
             FROM map_data md
             JOIN player_metrics pd ON true
             JOIN player_counts pc ON true
             JOIN params p ON true
             ON CONFLICT (server_id, map) DO UPDATE SET
              total_playtime = EXCLUDED.total_playtime,
              total_sessions = EXCLUDED.total_sessions,
              cum_player_hours = EXCLUDED.cum_player_hours,
              unique_players = EXCLUDED.unique_players,
              last_played = EXCLUDED.last_played,
              last_played_ended = EXCLUDED.last_played_ended,
              avg_playtime_before_quitting = EXCLUDED.avg_playtime_before_quitting,
              dropoff_rate = EXCLUDED.dropoff_rate,
              avg_players_per_session = EXCLUDED.avg_players_per_session;
        ", ctx.data.server_id, ctx.data.map_name).execute(&*ctx.pool).await;
        sqlx::query_as!(DbMapAnalyze, "
            SELECT map,
                total_playtime,
                total_sessions,
                unique_players,
                cum_player_hours,
                last_played,
                last_played_ended,
                dropoff_rate,
                avg_playtime_before_quitting,
                avg_players_per_session
            FROM website.map_analyze WHERE server_id=$1 AND map=$2
            LIMIT 1
        ", ctx.data.server_id, ctx.data.map_name).fetch_one(&*ctx.pool).await
    }

    fn cache_key_pattern(&self) -> String {
        let ctx = &self.context;
        format!("map_analyze-2:{}:{}:{{session}}", ctx.data.server_id, ctx.data.map_name)
    }

    fn ttl(&self) -> u64 {
        30 * DAY
    }

    fn priority(&self) -> QueryPriority {
        QueryPriority::Heavy
    }
}
#[derive(Clone)]
pub struct PlayerSessionQuery<T> {
    pub context: Query<PlayerSessionData>,
    _phantom: std::marker::PhantomData<T>,
}
impl<T> PlayerSessionQuery<T> {
    fn new(ctx: &PlayerContext, pool: Arc<Pool<Postgres>>, cache: Arc<FastCache>, session_id: &str) -> Self {
        Self {
            context: Query {
                pool,
                cache,
                data: PlayerSessionData{
                    player_id: ctx.player.player_id.clone(),
                    server_id: ctx.server.server_id.clone(),
                    session_id: session_id.to_string(),
                },
            },
            _phantom: std::marker::PhantomData,
        }
    }
}
#[derive(Clone)]
pub struct PlayerBasicQuery<T> {
    pub context: Query<PlayerData>,
    _phantom: std::marker::PhantomData<T>,
}
impl<T> PlayerBasicQuery<T> {
    fn new(ctx: &PlayerContext, pool: Arc<Pool<Postgres>>, cache: Arc<FastCache>) -> Self {
        Self {
            context: Query {
                pool,
                cache,
                data: PlayerData{
                    player_id: ctx.player.player_id.clone(),
                    server_id: ctx.server.server_id.clone(),
                    current_session: ctx.cache_key.current.clone()
                },
            },
            _phantom: std::marker::PhantomData,
        }
    }
    fn raw(context: Query<PlayerData>) -> Self {
        Self {
            context, _phantom: std::marker::PhantomData,
        }
    }
}

#[async_trait]
impl WorkerQuery<Vec<DbPlayerSessionTime>> for PlayerBasicQuery<Vec<DbPlayerSessionTime>> {
    type Error = sqlx::Error;

    async fn execute(&self) -> Result<Vec<DbPlayerSessionTime>, Self::Error> {
        let ctx = &self.context;
        sqlx::query_as!(DbPlayerSessionTime, "
            SELECT
                DATE_TRUNC('day', started_at) AS bucket_time,
                ROUND((
                    SUM(EXTRACT(EPOCH FROM (ended_at - started_at))) / 3600
                )::numeric, 2)::double precision AS hour_duration
            FROM public.player_server_session
            WHERE player_id = $1 AND server_id = $2
            GROUP BY bucket_time
            ORDER BY bucket_time;
        ", ctx.data.player_id, ctx.data.server_id).fetch_all(&*ctx.pool).await
    }

    fn cache_key_pattern(&self) -> String {
        format!("player-session:{}:{}:{{session}}", self.context.data.server_id, self.context.data.player_id)
    }

    fn ttl(&self) -> u64 { 60 * DAY }
    fn priority(&self) -> QueryPriority { QueryPriority::Light }
}

async fn calculate_db_player_map(ctx: &Query<PlayerData>, worker_type: &str) -> Result<(), sqlx::Error> {
    let worker_data = get_worker_player_key(ctx, worker_type).await?;
    if worker_data.no_data || worker_data.start != worker_data.end{
        let plays = sqlx::query_as!(DbPlayerMapPlayed, "
                 WITH vars AS (
                    SELECT $3::text::uuid AS session_target_id,
                           $4::text::uuid AS session_end_id
                ),
                time_bounds AS (
                    SELECT
                        (SELECT CASE WHEN $5 THEN started_at ELSE ended_at END FROM player_server_session
                         WHERE server_id = $2
                           AND player_id = $1
                           AND session_id = v.session_target_id) AS start_time,
                        (SELECT started_at FROM player_server_session
                         WHERE server_id = $2
                           AND player_id = $1
                           AND session_id = v.session_end_id) AS end_time
                    FROM vars v
                )
                SELECT
                    mp.server_id,
                    mp.map,
                    SUM(LEAST(pss.ended_at, sm.ended_at) - GREATEST(pss.started_at, sm.started_at)) AS played
                FROM server_map_played sm
                JOIN server_map mp ON sm.map = mp.map AND sm.server_id = mp.server_id
                JOIN player_server_session pss ON pss.server_id = sm.server_id
                    AND pss.player_id = $1
                    AND pss.ended_at IS NOT NULL
                    AND tstzrange(sm.started_at, sm.ended_at) && tstzrange(pss.started_at, pss.ended_at)
                    AND pss.started_at BETWEEN (SELECT start_time FROM time_bounds)
                                           AND (SELECT end_time FROM time_bounds)
                WHERE sm.server_id = $2
                GROUP BY mp.server_id, mp.map
                ORDER BY played DESC;
            ", ctx.data.player_id, ctx.data.server_id, worker_data.start, worker_data.end, worker_data.no_data).fetch_all(&*ctx.pool).await?;

        let mut server_ids = vec![];
        let mut player_ids = vec![];
        let mut maps = vec![];
        let mut played = vec![];
        for row in plays{
            server_ids.push(ctx.data.server_id.clone());
            player_ids.push(ctx.data.player_id.clone());
            maps.push(row.map.unwrap_or_default());
            played.push(row.played.unwrap_or_default());
        }

        let _ = sqlx::query!("
                INSERT INTO website.player_map_time(player_id, server_id, map, total_playtime)
                SELECT * FROM UNNEST($1::text[], $2::text[], $3::text[], $4::INTERVAL[])
                ON CONFLICT(player_id, server_id, map)
                DO UPDATE SET
                    total_playtime = website.player_map_time.total_playtime + EXCLUDED.total_playtime
            ", &player_ids[..],
                &server_ids[..],
                &maps[..],
                &played[..])
            .execute(&*ctx.pool).await?;
        let _ = update_worker_time(ctx, worker_type, &worker_data.end).await?;
    }
    Ok(())
}


#[async_trait]
impl WorkerQuery<Vec<DbPlayerMapPlayed>> for PlayerBasicQuery<Vec<DbPlayerMapPlayed>>{
    type Error = sqlx::Error;
    async fn execute(&self) -> Result<Vec<DbPlayerMapPlayed>, Self::Error> {
        let ctx = &self.context;
        let redis_pool = ctx.cache.redis_pool.clone();
        let worker_type = "playermap";
        let lock_key = format!("lock:player_map_time:{}:{}", ctx.data.server_id, ctx.data.player_id);

        if let Some(lock_id) = acquire_redis_lock(&redis_pool, &lock_key, 60 * 5, 60).await {
            tracing::info!("LOCK ACQUIRED {}", &lock_key);

            let result = calculate_db_player_map(ctx, worker_type).await;

            release_redis_lock(&redis_pool, &lock_key, &lock_id).await;
            tracing::info!("LOCK RELEASED {}", &lock_key);

            result?; // propagate error if any
        } else {
            tracing::warn!("FAILED TO ACQUIRE LOCK {}", &lock_key);
            return Ok(vec![]); // or handle however you prefer
        }
        sqlx::query_as!(DbPlayerMapPlayed, "
            SELECT server_id, map, total_playtime AS played
            FROM website.player_map_time
            WHERE player_id = $1 AND server_id = $2
            ORDER BY total_playtime DESC
        ", ctx.data.player_id, ctx.data.server_id).fetch_all(&*ctx.pool).await
    }

    fn cache_key_pattern(&self) -> String {
        format!("player-map-played:{}:{}:{{session}}", self.context.data.server_id, self.context.data.player_id)
    }

    fn ttl(&self) -> u64 {
        60 * DAY
    }

    fn priority(&self) -> QueryPriority {
        QueryPriority::Heavy
    }
}
#[async_trait]
impl WorkerQuery<Option<DbPlayerRank>> for PlayerBasicQuery<Option<DbPlayerRank>> {
    type Error = sqlx::Error;
    async fn execute(&self) -> Result<Option<DbPlayerRank>, Self::Error> {
        sqlx::query_as!(DbPlayerRank, "
            SELECT global_playtime_rank AS global_playtime,
                playtime_rank AS total_playtime,
                casual_rank AS casual_playtime,
                tryhard_rank AS tryhard_playtime
            FROM website.player_playtime_ranks
            WHERE server_id=$1 AND player_id=$2
        ", self.context.data.server_id, self.context.data.player_id)
            .fetch_optional(&*self.context.pool.clone()).await
    }

    fn cache_key_pattern(&self) -> String {
        format!("player-play-ranks:{}:{}:{{session}}", self.context.data.server_id, self.context.data.player_id)
    }

    fn ttl(&self) -> u64 {
        2 * 60
    }

    fn priority(&self) -> QueryPriority {
        QueryPriority::Light
    }
}
#[async_trait]
impl WorkerQuery<Vec<DbMapRank>> for PlayerBasicQuery<Vec<DbMapRank>> {
    type Error = sqlx::Error;
    async fn execute(&self) -> Result<Vec<DbMapRank>, Self::Error> {
        sqlx::query_as!(DbMapRank, "
            SELECT pmr.map, pmr.map_rank AS rank, pmt.total_playtime
            FROM website.player_map_rank pmr
            JOIN website.player_map_time pmt 
                ON pmt.player_id = pmr.player_id 
                    AND pmt.map = pmr.map
                    AND pmt.server_id = pmr.server_id
            WHERE pmr.server_id=$1 AND pmr.player_id=$2
            ORDER BY pmr.map_rank, pmt.total_playtime DESC
        ", self.context.data.server_id, self.context.data.player_id)
            .fetch_all(&*self.context.pool.clone()).await
    }

    fn cache_key_pattern(&self) -> String {
        format!("player-map-ranks:{}:{}:{{session}}", self.context.data.server_id, self.context.data.player_id)
    }

    fn ttl(&self) -> u64 {
        2 * 60
    }

    fn priority(&self) -> QueryPriority {
        QueryPriority::Light
    }
}
#[async_trait]
impl WorkerQuery<Vec<DbPlayerAlias>> for PlayerBasicQuery<Vec<DbPlayerAlias>>{
    type Error = sqlx::Error;

    async fn execute(&self) -> Result<Vec<DbPlayerAlias>, Self::Error> {
        let ctx = &self.context;
        sqlx::query_as!(DbPlayerAlias, "
            SELECT event_value as name, created_at FROM player_activity
            WHERE event_name='name' AND player_id=$1
            ORDER BY created_at
        ", ctx.data.player_id).fetch_all(&*ctx.pool).await
    }

    fn cache_key_pattern(&self) -> String {
        let ctx = &self.context;
        format!("player-aliases:{}:{{session}}", ctx.data.player_id)
    }

    fn ttl(&self) -> u64 {
        60 * DAY
    }

    fn priority(&self) -> QueryPriority {
        QueryPriority::Light
    }
}
struct DbServerMapState{
    #[allow(dead_code)]
    server_id: String,
    sum_key: Option<String>,
}
#[allow(dead_code)]
struct DbPlayerPlayTime{
    server_id: String,
    player_id: String,
    total_playtime: PgInterval,
    casual_playtime: PgInterval,
    tryhard_playtime: PgInterval,
    sum_key: Option<String>,
}


async fn update_worker_time(context: &Query<PlayerData>, worker_type: &str, end_calculation: &str) -> Result<PgQueryResult, sqlx::Error>{
    sqlx::query!("
            INSERT INTO website.player_server_worker(player_id, server_id, type, last_calculated)
            VALUES ($1, $2, $3, $4::text::uuid)
            ON CONFLICT(player_id, server_id, type)
            DO UPDATE SET last_calculated = EXCLUDED.last_calculated
        ", context.data.player_id, context.data.server_id, worker_type, end_calculation)
        .execute(&*context.pool).await
}


#[async_trait]
impl WorkerQuery<DbPlayerDetail> for PlayerBasicQuery<DbPlayerDetail>{
    type Error = sqlx::Error;
    async fn execute(&self) -> Result<DbPlayerDetail, Self::Error> {
        let ctx = &self.context;
        let map_state = sqlx::query_as!(DbServerMapState, "
            SELECT
              server_id,
                  STRING_AGG(
                    map || ':' ||
                    COALESCE(CAST(is_tryhard AS INT), -1) || ':' ||
                    COALESCE(CAST(is_casual AS INT), -1),
                    '|' ORDER BY map
                ) AS sum_key
            FROM server_map
            WHERE server_id = $1 AND (is_tryhard IS NOT NULL or is_casual IS NOT NULL)
            GROUP BY server_id
        ", ctx.data.server_id).fetch_one(&*ctx.pool).await?;

        let sum_key =  map_state.sum_key.unwrap_or_default();

        let worker_type = "player_playtime";
        let worker_data = get_worker_player_key(ctx, worker_type).await?;

        let query: PlayerBasicQuery<Vec<DbPlayerMapPlayed>> = PlayerBasicQuery::raw(self.context.clone());
        let maps = query.execute().await?;

        let map_infos = sqlx::query_as!(DbMapBriefInfo, "
            SELECT map as name, is_tryhard, is_casual, first_occurrence
            FROM server_map WHERE server_id=$1
            ", ctx.data.server_id).fetch_all(&*ctx.pool).await?;

        let infos: HashMap<String, DbMapBriefInfo> = map_infos
            .into_iter()
            .map(|info| (info.name.clone(), info))
            .collect();
        let durations: Vec<(String, Duration)> = maps.iter()
            .map(|e| (e.map.clone().unwrap_or_default(), e.played.map(interval_to_duration).unwrap_or(Duration::ZERO)))
            .collect();
        let mut total = Duration::from_micros(0);
        let mut casual = Duration::from_micros(0);
        let mut tryhard = Duration::from_micros(0);
        for (map_name, duration) in durations{
            total += duration;
            let Some(info) = infos.get(&map_name) else {
                continue;
            };
            if info.is_casual.unwrap_or_default(){
                casual += duration;
            }
            if info.is_tryhard.unwrap_or_default(){
                tryhard += duration;
            }
        }
        let total_playtime: PgInterval = total.try_into().unwrap_or_default();
        let casual_playtime: PgInterval = casual.try_into().unwrap_or_default();
        let tryhard_playtime: PgInterval = tryhard.try_into().unwrap_or_default();
        sqlx::query!("
            INSERT INTO website.player_playtime(
                player_id, server_id, total_playtime, casual_playtime, tryhard_playtime, sum_key
            )
            VALUES($1, $2, $3, $4, $5, $6)
            ON CONFLICT (player_id, server_id)
            DO UPDATE
            SET
                total_playtime = EXCLUDED.total_playtime,
                casual_playtime = EXCLUDED.casual_playtime,
                tryhard_playtime = EXCLUDED.tryhard_playtime,
                sum_key = EXCLUDED.sum_key;
        ", ctx.data.player_id, ctx.data.server_id, total_playtime,
            casual_playtime, tryhard_playtime, sum_key
        ).execute(&*ctx.pool).await?;

        let _ = update_worker_time(ctx, worker_type, &worker_data.end).await?;

        sqlx::query_as!(DbPlayerDetail, "
            SELECT
                su.player_id,
                su.player_name,
                su.created_at,
                su.associated_player_id,
                pp.total_playtime, pp.casual_playtime, pp.tryhard_playtime,
                0::int AS rank,
                CASE
                  WHEN pp.total_playtime < INTERVAL '10 hours' THEN null
                  WHEN EXTRACT(EPOCH FROM pp.casual_playtime) / NULLIF(EXTRACT(EPOCH FROM pp.total_playtime), 1) >= 0.6 THEN 'casual'
                  WHEN EXTRACT(EPOCH FROM pp.tryhard_playtime) / NULLIF(EXTRACT(EPOCH FROM pp.total_playtime), 1) >= 0.6 THEN 'tryhard'
                  WHEN EXTRACT(EPOCH FROM pp.tryhard_playtime) / NULLIF(EXTRACT(EPOCH FROM pp.total_playtime), 1) BETWEEN 0.4 AND 0.6 THEN 'mixed'
                  ELSE null
                END AS category,
                NULL::timestamptz AS online_since,
                NULL::timestamptz AS last_played,
                NULL::interval AS last_played_duration
            FROM player su
            JOIN website.player_playtime pp on pp.player_id = su.player_id
            WHERE pp.server_id=$2 AND pp.player_id=$1
            LIMIT 1
        ", ctx.data.player_id, ctx.data.server_id).fetch_one(&*ctx.pool).await
    }

    fn cache_key_pattern(&self) -> String {
        let ctx = &self.context;
        format!("player_detail:{}:{}:{{session}}", ctx.data.server_id, ctx.data.player_id)
    }

    fn ttl(&self) -> u64 {
        60 * DAY
    }

    fn priority(&self) -> QueryPriority {
        QueryPriority::Heavy
    }
}
#[async_trait]
impl WorkerQuery<Vec<DbPlayerRegionTime>> for PlayerBasicQuery<Vec<DbPlayerRegionTime>>{
    type Error = sqlx::Error;
    async fn execute(&self) -> Result<Vec<DbPlayerRegionTime>, Self::Error> {
        let ctx = &self.context;
        sqlx::query_as!(DbPlayerRegionTime, "
            WITH session_days AS (
                SELECT
                    s.session_id,
                    generate_series(
                    date_trunc('day', s.started_at),
                    date_trunc('day', s.ended_at),
                    interval '1 day'
                    ) AS session_day,
                    s.started_at,
                    s.ended_at
                FROM player_server_session s
                WHERE player_id = $1 AND server_id=$2
            ),
            region_intervals AS (
                SELECT
                    sd.session_id,
                    rt.region_id,
                    ((sd.session_day::date || ' ' || rt.start_time::text)::timestamptz) AS region_start,
                    CASE
                    WHEN rt.start_time < rt.end_time THEN
                        ((sd.session_day::date || ' ' || rt.end_time::text)::timestamptz)
                    ELSE
                        (((sd.session_day::date + 1) || ' ' || rt.end_time::text)::timestamptz)
                    END AS region_end,
                    sd.started_at,
                    sd.ended_at
                FROM session_days sd
                CROSS JOIN region_time rt
            ),
            session_region_overlap AS (
                SELECT
                    session_id,
                    region_id,
                    GREATEST(region_start, started_at) AS overlap_start,
                    LEAST(region_end, ended_at) AS overlap_end
                FROM region_intervals
                WHERE LEAST(region_end, ended_at) > GREATEST(region_start, started_at)
            ), finished AS (
                SELECT
                region_id,
                sum(overlap_end - overlap_start) AS played_time
                FROM session_region_overlap
                GROUP BY region_id
            )
            SELECT *,
                (SELECT region_name FROM region_time WHERE region_id=o.region_id LIMIT 1) AS region_name
            FROM finished o
            ORDER BY o.played_time
        ", ctx.data.player_id, ctx.data.server_id)
            .fetch_all(&*ctx.pool).await
    }

    fn cache_key_pattern(&self) -> String {
        let ctx = &self.context;
        format!("player-region:{}:{}:{{session}}", ctx.data.server_id, ctx.data.player_id)
    }

    fn ttl(&self) -> u64 {
        60 * DAY
    }

    fn priority(&self) -> QueryPriority {
        QueryPriority::Light
    }
}

struct LastWorkerCalculate{
    start: String,
    end: String,
    no_data: bool,
}
async fn get_worker_player_key(ctx: &Query<PlayerData>, worker_type: &str) -> Result<LastWorkerCalculate, sqlx::Error> {
    let player_id = &ctx.data.player_id;
    let server_id = &ctx.data.server_id;
    let last_calculated_row = sqlx::query_as!(DbWorkerLastCalculated, "
            SELECT player_id, server_id, type worker_type, last_calculated
            FROM website.player_server_worker
            WHERE player_id=$1 AND server_id=$2 AND type=$3
            LIMIT 1
        ", player_id, server_id, worker_type)
        .fetch_optional(&*ctx.pool).await?;

    let has_data = last_calculated_row.is_some();
    let (start, end) = match last_calculated_row {
        Some(last_calculated) => (last_calculated.last_calculated, ctx.data.current_session.clone()),
        None => {
            let start = sqlx::query_as!(DbPlayerSession, "
                    SELECT session_id, player_id, server_id, started_at, ended_at
                    FROM player_server_session
                    WHERE server_id = $1
                      AND player_id = $2
                      AND ended_at IS NOT NULL
                    ORDER BY started_at
                    LIMIT 1
                ", ctx.data.server_id, ctx.data.player_id).fetch_one(&*ctx.pool).await?;
            (start.session_id, ctx.data.current_session.clone())
        }
    };
    Ok(LastWorkerCalculate { start, end, no_data: !has_data })
}



#[async_trait]
impl WorkerQuery<Vec<DbPlayerSeen>> for PlayerSessionQuery<Vec<DbPlayerSeen>> {
    type Error = sqlx::Error;

    async fn execute(&self) -> Result<Vec<DbPlayerSeen>, Self::Error> {
        let ctx = &self.context;

        sqlx::query_as!(DbPlayerSeen, "
            WITH overlapping AS (
              SELECT
                target_session.player_id,
                s2.player_id AS seen_player,
                LEAST(target_session.ended_at, COALESCE(s2.ended_at, target_session.ended_at)) - GREATEST(target_session.started_at, s2.started_at) AS overlap_duration,
                LEAST(target_session.ended_at, COALESCE(s2.ended_at, target_session.ended_at)) AS seen_on
            FROM (
              SELECT player_id, server_id, started_at, COALESCE(ended_at, current_timestamp) ended_at
              FROM player_server_session
              WHERE session_id = ($3::TEXT::uuid) AND server_id=$1 AND player_id=$2
              LIMIT 1
            ) AS target_session
            JOIN player_server_session s2
              ON s2.server_id = target_session.server_id
             AND s2.player_id <> target_session.player_id
             AND s2.started_at < target_session.ended_at
             AND COALESCE(s2.ended_at, target_session.ended_at) > target_session.started_at
            )
            SELECT
              o.seen_player AS player_id,
              p.player_name,
              SUM(o.overlap_duration) AS total_time_together,
              MAX(o.seen_on) AS last_seen
            FROM overlapping o
            JOIN player p ON p.player_id = o.seen_player
            GROUP BY o.seen_player, p.player_name
            ORDER BY total_time_together DESC
        ", ctx.data.server_id, ctx.data.player_id, ctx.data.session_id).fetch_all(&*ctx.pool).await
    }

    fn cache_key_pattern(&self) -> String {
        let ctx = &self.context;
        format!("player-seen-session:{}:{}:{}", ctx.data.server_id, ctx.data.player_id, ctx.data.session_id)
    }

    fn ttl(&self) -> u64 { 130 * DAY }
    fn priority(&self) -> QueryPriority { QueryPriority::Heavy }
}


#[async_trait]
impl WorkerQuery<Vec<DbPlayerHourCount>> for PlayerBasicQuery<Vec<DbPlayerHourCount>> {
    type Error = sqlx::Error;
    async fn execute(&self) -> Result<Vec<DbPlayerHourCount>, Self::Error> {
        let ctx = &self.context;
        sqlx::query_as!(DbPlayerHourCount, "
            WITH join_count AS (
                SELECT player_id, (
                    EXTRACT(hours FROM started_at AT TIME ZONE 'UTC')
                ) hours, COUNT(*) FROM public.player_server_session
                WHERE player_id=$2 AND server_id=$1
                GROUP BY player_id, hours
            ), leave_count AS (
                SELECT player_id, (
                    EXTRACT(hours FROM ended_at AT TIME ZONE 'UTC')
                ) hours, COUNT(*) FROM public.player_server_session
                WHERE player_id=$2 AND server_id=$1
                GROUP BY player_id, hours
            )
            SELECT
                gs hours,
                COALESCE(jc.count, 0) join_counted,
                COALESCE(lc.count, 0) leave_counted
            FROM generate_series(0, 23) gs
            LEFT JOIN join_count jc
            ON jc.hours=gs
            LEFT JOIN leave_count lc
            ON lc.hours=gs
            ORDER BY hours
        ", ctx.data.server_id, ctx.data.player_id).fetch_all(&*ctx.pool).await
    }

    fn cache_key_pattern(&self) -> String {
        let ctx = &self.context;
        format!("player-hour-day:{}:{}:{{session}}", ctx.data.server_id, ctx.data.player_id)
    }

    fn ttl(&self) -> u64 {
        60 * DAY
    }

    fn priority(&self) -> QueryPriority {
        QueryPriority::Light
    }
}
pub struct PlayerWorker {
    background_worker: Arc<BackgroundWorker>,
    pool: Arc<Pool<Postgres>>,
}

#[allow(dead_code)]
#[derive(Debug)]
pub enum WorkError {
    NotFound,
    Calculating,
    Database(sqlx::Error),
}

impl From<sqlx::Error> for WorkError {
    fn from(e: sqlx::Error) -> Self {
        WorkError::Database(e)
    }
}

impl PlayerWorker {
    pub fn new(cache: Arc<FastCache>, pool: Arc<Pool<Postgres>>) -> Self {
        Self {
            background_worker: Arc::new(BackgroundWorker::new(cache, 5)),
            pool,
        }
    }

    async fn query_player<T>(
        &self, context: &PlayerContext
    ) -> WorkResult<T>
    where
        PlayerBasicQuery<T>: WorkerQuery<T> + Send + Sync,
        <PlayerBasicQuery<T> as WorkerQuery<T>>::Error: std::fmt::Display,
        T: Serialize + for<'de> Deserialize<'de> + Send + Sync + Clone + 'static,
    {
        let query = PlayerBasicQuery::new(context, self.pool.clone(), self.background_worker.cache.clone());
        let result = self.background_worker.execute_with_session_fallback(
            query,
            &context.cache_key.current,
            context.cache_key.previous.as_deref(),
        ).await?;
        Ok(result.result)
    }

    async fn query_player_execute<T>(
        &self, context: &PlayerContext
    ) -> WorkResult<T>
    where
        PlayerBasicQuery<T>: WorkerQuery<T> + Send + Sync,
        <PlayerBasicQuery<T> as WorkerQuery<T>>::Error: std::fmt::Display,
        WorkError: From<<PlayerBasicQuery<T> as WorkerQuery<T>>::Error>,
        T: Serialize + for<'de> Deserialize<'de> + Send + Sync + Clone + 'static,
    {
        let query = PlayerBasicQuery::new(context, self.pool.clone(), self.background_worker.cache.clone());
        let result = self.background_worker.execute_get(
            query,
            &context.cache_key.current,
        ).await?;
        Ok(result.result)
    }
    async fn query_player_execute_session<T>(
        &self, context: &PlayerContext, session_id: &str
    ) -> WorkResult<T>
    where
        PlayerSessionQuery<T>: WorkerQuery<T> + Send + Sync,
        <PlayerSessionQuery<T> as WorkerQuery<T>>::Error: std::fmt::Display,
        WorkError: From<<PlayerSessionQuery<T> as WorkerQuery<T>>::Error>,
        T: Serialize + for<'de> Deserialize<'de> + Send + Sync + Clone + 'static,
    {
        let query = PlayerSessionQuery::new(context, self.pool.clone(), self.background_worker.cache.clone(), session_id);
        let result = self.background_worker.execute_get(
            query,
            &context.cache_key.current,
        ).await?;
        Ok(result.result)
    }
    pub async fn get_player_sessions(&self, context: &PlayerContext) -> WorkResult<Vec<PlayerSessionTime>> {
        let result: Vec<DbPlayerSessionTime> = self.query_player(context).await?;
        Ok(result.iter_into())
    }

    pub async fn get_player_approximate_friend(&self, context: &PlayerContext, session_id: &str) -> WorkResult<Vec<PlayerSeen>> {
        let result: Vec<DbPlayerSeen> = self.query_player_execute_session(context, session_id).await?;
        Ok(result.iter_into())
    }
    pub async fn get_most_played_maps(&self, context: &PlayerContext) -> WorkResult<Vec<PlayerMostPlayedMap>>{
        let result: Vec<DbPlayerMapPlayed> = self.query_player(context).await?;
        let values: Vec<PlayerMostPlayedMap> = result.iter_into();
        let ranks: Vec<DbMapRank> = self.query_player_execute(context).await?;
        let mut mapped_ranks: HashMap<String, MapRank> = HashMap::new();
        for rank in ranks{
            let map_rank: MapRank = rank.into();
            mapped_ranks.insert(map_rank.map.clone(), map_rank);
        }
        Ok(values
            .into_iter()
            .map(|mut e| { 
                e.rank = mapped_ranks.get(&e.map).map(|e| e.rank).unwrap_or_default();
                e
            })
            .collect())
        
    }
    pub async fn get_regions(&self, context: &PlayerContext) -> WorkResult<Vec<PlayerRegionTime>>{
        let result: Vec<DbPlayerRegionTime> = self.query_player(context).await?;
        Ok(result.iter_into())
    }
    pub async fn get_detail(&self, context: &PlayerContext) -> WorkResult<DetailedPlayer>{
        let detail_db: DbPlayerDetail = self.query_player(context).await?;
        let mut detail: DetailedPlayer = detail_db.into();
        let playtime_ranks: Option<DbPlayerRank> = self.query_player_execute(context).await?;
        if let Some(playtime_ranks) = playtime_ranks {
            let mut ranks: PlayerRanks = playtime_ranks.into();
            let map_ranks: Vec<DbMapRank> = self.query_player_execute(context).await?;
            let filtering = 3_600_000_000;  // 1 hr in microseconds
            ranks.highest_map_rank = map_ranks.into_iter() 
                .find(|e| e.total_playtime.map_or(false, |p| p.microseconds > filtering))
                .map(Into::into);
            detail.ranks = Some(ranks)
        }
        let aliases: Vec<DbPlayerAlias> = self.query_player(context).await?;
        let mut aliases_filtered = vec![];
        let mut last_seen = String::from("");
        for alias in aliases{ // due to buggy impl lol
            if alias.name != last_seen{
                last_seen = alias.name.to_string();
                aliases_filtered.push(alias);
            }
        }
        aliases_filtered.reverse();
        detail.aliases = aliases_filtered.iter_into();
        Ok(detail)
    }
    pub async fn get_hour_of_day(&self, context: &PlayerContext) -> WorkResult<Vec<PlayerHourDay>> {
        let result: Vec<DbPlayerHourCount> = self.query_player(context).await?;

        let mut to_return = vec![];
        for data in result{
            let (join, leave) = data.into();
            to_return.push(join);
            to_return.push(leave);
        }
        Ok(to_return)
    }
}

pub struct MapWorker {
    background_worker: Arc<BackgroundWorker>,
    pool: Arc<Pool<Postgres>>,
}

impl MapWorker {
    pub fn new(cache: Arc<FastCache>, pool: Arc<Pool<Postgres>>) -> Self {
        Self {
            background_worker: Arc::new(BackgroundWorker::new(cache, 5)),
            pool,
        }
    }
    async fn query_map<T>(
        &self, context: &MapContext
    ) -> WorkResult<CachedResult<T>>
    where
        MapBasicQuery<T>: WorkerQuery<T> + Send + Sync,
        <MapBasicQuery<T> as WorkerQuery<T>>::Error: std::fmt::Display,
        T: Serialize + for<'de> Deserialize<'de> + Send + Sync + Clone + 'static,
    {
        let query = MapBasicQuery::new(context, self.pool.clone(), self.background_worker.cache.clone());
        self.background_worker.execute_with_session_fallback(
            query,
            &context.cache_key.current,
            context.cache_key.previous.as_deref(),
        ).await
    }
    pub async fn get_detail(&self, context: &MapContext) -> WorkResult<MapInfo>{
        let value: CachedResult<DbMapInfo> = self.query_map(context).await?;
        let meta: CachedResult<Option<DbMapMeta>> = self.query_map(context).await?;
        let meta = meta.result;
        let mut result: MapInfo = value.result.into();
        if let Some(meta) = meta {
            result.workshop_id = meta.workshop_id;
            result.creators = meta.creators;
            result.file_bytes = meta.file_bytes;
        }
        Ok(result)
    }
    pub async fn get_statistics(&self, context: &MapContext) -> WorkResult<MapAnalyze> {
        let mut value: CachedResult<DbMapAnalyze> = self.query_map(context).await?;
        if !value.is_new{
            let partial: DbServerMapPartial = self.query_map(&context).await?.result;
            value.result.last_played = partial.last_played;
            value.result.total_sessions = partial.total_sessions.unwrap_or_default() as i32;
            value.result.total_playtime = partial.total_playtime;
        }
        Ok(value.result.into())
    }
    pub async fn get_regions(&self, context: &MapContext) -> WorkResult<Vec<MapRegion>> {
        let value: CachedResult<Vec<DbMapRegion>> = self.query_map(context).await?;
        Ok(value.result.iter_into())
    }
    pub async fn get_top_10_players(&self, context: &MapContext) -> WorkResult<Vec<PlayerBrief>> {
        let value: CachedResult<Vec<DbPlayerBrief>> = self.query_map(context).await?;
        Ok(value.result.iter_into())
    }
    pub async fn get_events(&self, context: &MapContext) -> WorkResult<Vec<MapEventAverage>> {
        let value: CachedResult<Vec<DbEvent>> = self.query_map(context).await?;
        Ok(value.result.iter_into())
    }
    pub async fn get_session_distributions(&self, context: &MapContext) -> WorkResult<Vec<MapSessionDistribution>> {
        let value: CachedResult<Vec<DbMapSessionDistribution>> = self.query_map(context).await?;
        Ok(value.result.iter_into())
    }
    pub async fn get_sessions(&self, context: &MapContext, page: usize) -> WorkResult<ServerMapPlayedPaginated> {
        let query = MapSessionQuery{
            context: Query {
                pool: self.pool.clone(),
                cache: self.background_worker.cache.clone(),
                data: MapSessionData{
                    map_name: context.map.map.clone(),
                    server_id: context.server.server_id.clone(),
                    session_page: page,
                },
            },
        };
        let result = self.background_worker.execute_with_session_fallback(
            query,
            &context.cache_key.current,
            context.cache_key.previous.as_deref(),
        ).await?;
        let result = result.result;
        let total_sessions = result
            .first()
            .and_then(|e| e.total_sessions)
            .unwrap_or_default();

        let resp = ServerMapPlayedPaginated{
            total_sessions,
            maps: result.iter_into()
        };
        Ok(resp)
    }
    pub async fn get_heat_regions(&self, context: &MapContext) -> WorkResult<Vec<DailyMapRegion>> {
        let value: CachedResult<Vec<DbMapRegionDate>> = self.query_map(context).await?;
        let resp: Vec<MapRegionDate> = value.result.iter_into();
        let mut grouped: HashMap<DateTime<Utc>, Vec<MapRegion>> = HashMap::new();

        for record in resp {
            let Some(date) = record.date else {
                tracing::warn!("Invalid date detected for heat region!");
                continue;
            };
            grouped.entry(date).or_insert_with(Vec::new).push(record.into());
        }

        let mut days:Vec<DailyMapRegion> = grouped
            .into_iter()
            .map(|(date, regions)| DailyMapRegion{
                date, regions: regions.into_iter().filter(|e| e.total_play_duration > 0.).collect()
            }).collect();

        days.sort_by(|a, b| a.date.cmp(&b.date));
        Ok(days)
    }
}