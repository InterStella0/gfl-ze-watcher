use std::collections::HashMap;
use std::sync::Arc;
use std::future::Future;
use redis::{AsyncCommands, RedisResult};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use sqlx::{Pool, Postgres};
use tokio::sync::{RwLock, Semaphore};
use async_trait::async_trait;
use crate::core::model::{DbPlayer, DbPlayerAlias, DbPlayerDetail, DbPlayerHourCount, DbPlayerMapPlayed, DbPlayerRegionTime, DbPlayerSeen, DbPlayerSessionTime, DbServer};
use crate::core::utils::{CachedResult, IterConvert, DAY};
use crate::{FastCache};
use crate::core::api_models::{DetailedPlayer, PlayerHourDay, PlayerMostPlayedMap, PlayerRegionTime, PlayerSeen, PlayerSessionTime};

#[derive(Clone, Copy)]
pub enum QueryPriority {
    Light,
    Heavy,
}

// Fixed trait with async_trait and proper Send bounds
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
    ) -> Result<CachedResult<T>, Q::Error>
    where
        T: Serialize + for<'de> Deserialize<'de> + Send + Sync + Clone + 'static,
        Q: WorkerQuery<T> + Send + Sync + Clone + 'static,
        Q::Error: Send + 'static,
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

    pub async fn get_with_fallback<T, E, F, Fut>(
        &self,
        current_key: &str,
        fallback_key: Option<&str>,
        ttl: u64,
        priority: QueryPriority,
        query_fn: F,
    ) -> Result<CachedResult<T>, E>
    where
        T: Serialize + DeserializeOwned + Send + Sync + Clone + 'static,
        E: Send + 'static,
        F: Fn() -> Fut + Send + Clone + 'static,
        Fut: Future<Output = Result<T, E>> + Send + 'static,
    {

        if let Ok(result) = self.try_cache_lookup(current_key).await {
            tracing::info!("FOUND FIRST CACHE");
            return Ok(CachedResult::current_data(result));
        }

        if let Some(fallback) = fallback_key {
            if let Ok(result) = self.try_cache_lookup(fallback).await {
                tracing::info!("FOUND SECOND CACHE");
                self.spawn_refresh_task(current_key, ttl, priority, query_fn).await;
                return Ok(CachedResult::backup_data(result));
            }
        }

        tracing::info!("CALCULATING INSTEAD");
        let result = query_fn().await?;
        self.cache_result(current_key, &result, ttl).await;
        Ok(CachedResult::new_data(result))
    }

    async fn spawn_refresh_task<T, E, F, Fut>(
        &self,
        key: &str,
        ttl: u64,
        priority: QueryPriority,
        query_fn: F,
    ) where
        T: Serialize + DeserializeOwned + Send + Sync + 'static,
        E: Send + 'static,
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
                Err(_) => {
                    tracing::warn!("Background refresh failed: {}", key_owned);
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

pub struct PlayerKey {
    pub current: String,
    pub previous: Option<String>,
}

pub struct Context {
    pub player: DbPlayer,
    pub server: DbServer,
    pub cache_key: PlayerKey,
}

type WorkResult<T> = Result<T, WorkError>;

#[derive(Clone)]
pub struct Query<T>{
    pub pool: Arc<Pool<Postgres>>,
    pub data: T
}

#[derive(Clone)]
pub struct PlayerData{
    pub player_id: String,
    pub server_id: String,
}

#[derive(Clone)]
pub struct PlayerBasicQuery<T> {
    pub context: Query<PlayerData>,
    _phantom: std::marker::PhantomData<T>,
}

impl<T> PlayerBasicQuery<T> {
    fn new(ctx: &Context, pool: Arc<Pool<Postgres>>) -> Self {
        Self {
            context: Query {
                pool,
                data: PlayerData{
                    player_id: ctx.player.player_id.clone(),
                    server_id: ctx.server.server_id.clone(),
                },
            },
            _phantom: std::marker::PhantomData,
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


#[async_trait]
impl WorkerQuery<Vec<DbPlayerMapPlayed>> for PlayerBasicQuery<Vec<DbPlayerMapPlayed>>{
    type Error = sqlx::Error;
    async fn execute(&self) -> Result<Vec<DbPlayerMapPlayed>, Self::Error> {
        let ctx = &self.context;
        sqlx::query_as!(DbPlayerMapPlayed, "
            SELECT
                mp.server_id,
                mp.map,
                SUM(LEAST(pss.ended_at, sm.ended_at) - GREATEST(pss.started_at, sm.started_at)) AS played
            FROM player_server_session pss
            JOIN server_map_played sm
            	ON sm.server_id = pss.server_id
            JOIN server_map mp
                ON sm.map=mp.map AND sm.server_id=mp.server_id
            WHERE pss.player_id=$1 AND pss.server_id=$2
            	AND pss.started_at < sm.ended_at
            	AND pss.ended_at > sm.started_at
            GROUP BY mp.server_id, mp.map
            ORDER BY played DESC
            LIMIT 10
        ", ctx.data.player_id, ctx.data.server_id).fetch_all(&*ctx.pool).await
    }

    fn cache_key_pattern(&self) -> String {
        format!("player-most-played:{}:{}:{{session}}", self.context.data.server_id, self.context.data.player_id)
    }

    fn ttl(&self) -> u64 {
        60 * DAY
    }

    fn priority(&self) -> QueryPriority {
        QueryPriority::Heavy
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
#[async_trait]
impl WorkerQuery<DbPlayerDetail> for PlayerBasicQuery<DbPlayerDetail>{
    type Error = sqlx::Error;
    async fn execute(&self) -> Result<DbPlayerDetail, Self::Error> {
        let ctx = &self.context;
        sqlx::query_as!(DbPlayerDetail, "
            WITH filtered_pss AS (
                SELECT *
                FROM player_server_session
                WHERE player_id = $1 AND server_id = $2
            ),
            user_played AS (
              SELECT
                  mp.server_id,
                  mp.map,
                  SUM(LEAST(pss.ended_at, sm.ended_at) - GREATEST(pss.started_at, sm.started_at)) AS played
              FROM filtered_pss pss
              JOIN server_map_played sm
                ON sm.server_id = pss.server_id
              JOIN server_map mp
                ON mp.map = sm.map
               AND mp.server_id = sm.server_id
              WHERE pss.started_at < sm.ended_at
                AND pss.ended_at > sm.started_at
              GROUP BY mp.server_id, mp.map
            ),
            categorized AS (
              SELECT
                  mp.server_id,
                  COALESCE(mp.is_casual, false) AS casual,
                  COALESCE(mp.is_tryhard, false) AS tryhard,
                  SUM(up.played) AS total
              FROM user_played up
              LEFT JOIN server_map mp
                ON mp.map = up.map
               AND mp.server_id = up.server_id
              GROUP BY mp.server_id, mp.is_casual, mp.is_tryhard
            ),
            hard_or_casual AS (
              SELECT
                  server_id,
                  CASE WHEN tryhard THEN false ELSE casual END AS is_casual,
                  CASE WHEN tryhard THEN true ELSE false END AS is_tryhard,
                  SUM(total) AS summed
              FROM categorized
              GROUP BY server_id, is_casual, is_tryhard
            ),
            ranked_data AS (
              SELECT *,
                  SUM(summed) OVER() AS full_play
              FROM hard_or_casual
            ),
            categorized_data AS (
              SELECT
                  SUM(CASE WHEN is_tryhard THEN summed ELSE INTERVAL '0 seconds' END) AS tryhard_playtime,
                  SUM(CASE WHEN is_casual THEN summed ELSE INTERVAL '0 seconds' END) AS casual_playtime
              FROM ranked_data
            ),
            all_time_play AS (
              SELECT playtime, rank FROM (
                SELECT
                    s.player_id,
                    s.playtime,
                    RANK() OVER(ORDER BY s.playtime DESC) AS rank
                FROM (
                  SELECT
                      player_id,
                      SUM(
                        CASE
                          WHEN ended_at IS NULL
                               AND CURRENT_TIMESTAMP - started_at > INTERVAL '12 hours'
                          THEN INTERVAL '0 second'
                          ELSE COALESCE(ended_at, CURRENT_TIMESTAMP) - started_at
                        END
                      ) AS playtime
                  FROM player_server_session
                  WHERE server_id = $2
                  GROUP BY player_id
                ) s
              ) t
              WHERE t.player_id = $1
            ),
            last_played_detail AS (
              SELECT started_at, ended_at
              FROM player_server_session
              WHERE player_id = $1 AND server_id = $2
                AND ended_at IS NOT NULL
              ORDER BY ended_at DESC
              LIMIT 1
            )
            SELECT
                su.player_id,
                su.player_name,
                su.created_at,
                su.associated_player_id,
                cd.tryhard_playtime,
                cd.casual_playtime,
                tp.playtime AS total_playtime,
                CASE
                  WHEN tp.playtime < INTERVAL '10 hours' THEN null
                  WHEN EXTRACT(EPOCH FROM cd.casual_playtime) / NULLIF(EXTRACT(EPOCH FROM tp.playtime), 1) >= 0.6 THEN 'casual'
                  WHEN EXTRACT(EPOCH FROM cd.tryhard_playtime) / NULLIF(EXTRACT(EPOCH FROM tp.playtime), 1) >= 0.6 THEN 'tryhard'
                  WHEN EXTRACT(EPOCH FROM cd.tryhard_playtime) / NULLIF(EXTRACT(EPOCH FROM tp.playtime), 1) BETWEEN 0.4 AND 0.6 THEN 'mixed'
                  ELSE null
                END AS category,
                (
                  SELECT map
                  FROM user_played
                  ORDER BY played DESC
                  LIMIT 1
                ) AS favourite_map,
                tp.rank::int,
                (
                  SELECT started_at
                  FROM player_server_session s
                  WHERE ended_at IS NULL
                    AND s.player_id = su.player_id
                    AND CURRENT_TIMESTAMP - started_at < INTERVAL '12 hours'
                    AND server_id = $2
                  LIMIT 1
                ) AS online_since,
                lp.ended_at AS last_played,
                lp.ended_at - lp.started_at AS last_played_duration
            FROM player su
            JOIN categorized_data cd ON true
            JOIN all_time_play tp ON true
            JOIN last_played_detail lp ON true
            WHERE su.player_id = $1
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

#[async_trait]
impl WorkerQuery<Vec<DbPlayerSeen>> for PlayerBasicQuery<Vec<DbPlayerSeen>> {
    type Error = sqlx::Error;

    async fn execute(&self) -> Result<Vec<DbPlayerSeen>, Self::Error> {
        let ctx = &self.context;
        sqlx::query_as!(DbPlayerSeen, "
            WITH vars AS (
                SELECT '2024-03-01'::timestamp AS start_time
            ), overlapping_sessions AS (
                SELECT
                    s1.player_id AS player,
                    s2.player_id AS seen_player,
                    s1.server_id,
                    LEAST(s1.ended_at, s2.ended_at) - GREATEST(s1.started_at, s2.started_at) AS overlap_duration,
                    LEAST(s1.ended_at, s2.ended_at) seen_on
                FROM player_server_session s1
                CROSS JOIN LATERAL (
                    SELECT s2.player_id, s2.started_at, s2.ended_at
                    FROM player_server_session s2
                    WHERE s1.server_id = s2.server_id
                      AND s1.player_id <> s2.player_id
                      AND s1.started_at < s2.ended_at
                      AND s1.ended_at > s2.started_at
                ) s2
                WHERE (s1.started_at > (SELECT start_time FROM vars))
                  AND s1.player_id = $2
                  AND s1.server_id = $1
            )
            SELECT
                seen_player AS player_id,
                p.player_name,
                SUM(overlap_duration) AS total_time_together,
                MAX(seen_on) last_seen
            FROM overlapping_sessions
            JOIN player p
            ON p.player_id = seen_player
            GROUP BY seen_player, p.player_name
            ORDER BY total_time_together DESC
            LIMIT 10;
        ", ctx.data.server_id, ctx.data.player_id).fetch_all(&*ctx.pool).await
    }

    fn cache_key_pattern(&self) -> String {
        let ctx = &self.context;
        format!("player-seen:{}:{}:{{session}}", ctx.data.server_id, ctx.data.player_id)
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

#[derive(Debug)]
pub enum WorkError {
    NotFound,
    Database(sqlx::Error),
}

impl PlayerWorker {
    pub fn new(cache: Arc<FastCache>, pool: Arc<Pool<Postgres>>) -> Self {
        Self {
            background_worker: Arc::new(BackgroundWorker::new(cache, 1)),
            pool,
        }
    }

    async fn query_player<T>(
        &self, context: &Context
    ) -> WorkResult<T>
    where
        PlayerBasicQuery<T>: WorkerQuery<T> + Send + Sync,
        T: Serialize + for<'de> Deserialize<'de> + Send + Sync + Clone + 'static,
    {
        let query = PlayerBasicQuery::new(context, self.pool.clone());
        let Ok(result) = self.background_worker.execute_with_session_fallback(
            query,
            &context.cache_key.current,
            context.cache_key.previous.as_deref(),
        ).await else {
            return Err(WorkError::NotFound);
        };
        Ok(result.result)
    }

    pub async fn get_player_sessions(&self, context: &Context) -> WorkResult<Vec<PlayerSessionTime>> {
        let result: Vec<DbPlayerSessionTime> = self.query_player(context).await?;
        Ok(result.iter_into())
    }

    pub async fn get_player_approximate_friend(&self, context: &Context) -> WorkResult<Vec<PlayerSeen>> {
        let result: Vec<DbPlayerSeen> = self.query_player(context).await?;
        Ok(result.iter_into())
    }
    pub async fn get_most_played_maps(&self, context: &Context) -> WorkResult<Vec<PlayerMostPlayedMap>>{
        let result: Vec<DbPlayerMapPlayed> = self.query_player(context).await?;
        Ok(result.iter_into())
    }
    pub async fn get_regions(&self, context: &Context) -> WorkResult<Vec<PlayerRegionTime>>{
        let result: Vec<DbPlayerRegionTime> = self.query_player(context).await?;
        Ok(result.iter_into())
    }
    pub async fn get_detail(&self, context: &Context) -> WorkResult<DetailedPlayer>{
        let detail_db: DbPlayerDetail = self.query_player(context).await?;
        let mut detail: DetailedPlayer = detail_db.into();
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
    pub async fn get_hour_of_day(&self, context: &Context) -> WorkResult<Vec<PlayerHourDay>> {
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