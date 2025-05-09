use std::env;
use std::future::Future;
use chrono::{DateTime, Utc};
use deadpool_redis::Pool;
use redis::{AsyncCommands, RedisResult};
use serde::{Serialize};
use serde::de::DeserializeOwned;
use sqlx::{postgres::types::PgInterval, types::time::{Date, OffsetDateTime, Time, UtcOffset}, Postgres};
use sqlx::postgres::types::PgTimeTz;
use crate::model::{DbPlayerBrief, DbServer};
use crate::routers::api_models::{ErrorCode, PlayerBrief, ProviderResponse};


pub const DAY: u64 = 24 * 60 * 60;
pub fn get_env(name: &str) -> String{
    env::var(name).expect(&format!("Couldn't load environment '{name}'"))
}
pub fn get_env_default(name: &str) -> Option<String>{
    env::var(name).ok()
}

pub trait ChronoToTime {
    fn to_db_time(&self) -> OffsetDateTime;
}
impl ChronoToTime for DateTime<Utc> {
    fn to_db_time(&self) -> OffsetDateTime {
        OffsetDateTime::from_unix_timestamp(self.timestamp()).unwrap_or(OffsetDateTime::new_in_offset(Date::MIN, Time::MIDNIGHT, UtcOffset::UTC))
    }
}
pub fn format_pg_time_tz(pg_time: &PgTimeTz) -> DateTime<Utc> {
    db_to_utc(OffsetDateTime::new_in_offset(Date::MIN, pg_time.time.clone(), pg_time.offset))
}
pub fn smallest_date() -> OffsetDateTime{
    OffsetDateTime::new_in_offset(Date::MIN, Time::MIDNIGHT, UtcOffset::UTC)
}

pub fn db_to_utc(date: OffsetDateTime) -> DateTime<Utc>{
    DateTime::<Utc>::from_timestamp(date.unix_timestamp(), 0).unwrap_or_default()
}
pub fn retain_peaks<T: PartialEq + Clone>(points: Vec<T>, max_points: usize,
    comp_max: impl Fn(&T, &T) -> bool,
    comp_min: impl Fn(&T, &T) -> bool,
) -> Vec<T> {
    let total_points = points.len();
    if total_points <= max_points {
        return points;
    }

    let interval_size = (total_points as f64 / max_points as f64).ceil() as usize;
    let mut result: Vec<T> = Vec::with_capacity(max_points);

    for chunk in points.chunks(interval_size) {
        if chunk.is_empty() {
            continue;
        }

        let mut max_point = &chunk[0];
        let mut min_point = &chunk[0];

        for point in chunk.iter() {
            if comp_max(point, max_point) {
                max_point = point;
            }
            if comp_min(point, max_point) {
                min_point = point;
            }
        }

        result.push(chunk[0].clone());
        if min_point != &chunk[0] && min_point != &chunk[chunk.len() - 1] {
            result.push(min_point.clone());
        }
        if max_point != &chunk[0] && max_point != &chunk[chunk.len() - 1] {
            result.push(max_point.clone());
        }
        if chunk.len() > 1 {
            result.push(chunk[chunk.len() - 1].clone()); // Last point
        }
    }
    result
}

pub fn pg_interval_to_f64(interval: PgInterval) -> f64 {
    let months_to_seconds = (interval.months as f64) * 30.0 * 86400.0; // Approximate month length
    let days_to_seconds = (interval.days as f64) * 86400.0;
    let micros_to_seconds = (interval.microseconds as f64) / 1_000_000.0;

    months_to_seconds + days_to_seconds + micros_to_seconds
}

pub trait IterConvert<R>: Sized {
     fn iter_into(self) -> Vec<R>;
}
impl<T, R> IterConvert<R> for Vec<T>
where 
    T: Into<R>
{
    fn iter_into(self) -> Vec<R> {
        self.into_iter().map(|e| e.into()).collect()
    }
}

pub async fn get_server(pool: &sqlx::Pool<Postgres>, redis_pool: &Pool, server_id: &str) -> Option<DbServer>{
    let key = format!("find_server:{}", server_id);
    let func = ||
        sqlx::query_as!(DbServer, "SELECT * FROM server WHERE server_id=$1 LIMIT 1", server_id)
            .fetch_one(pool);
    let data = cached_response(&key, redis_pool, 60 * 60, func).await.ok();
    data.map(|e| e.result)
}

pub async fn update_online_brief(
    pool: &sqlx::Pool<Postgres>, redis_pool: &Pool, server_id: &str, briefs: &mut Vec<PlayerBrief>
){

    let func = || sqlx::query_as!(DbPlayerBrief, "
            WITH online AS (
              SELECT
                player_id,
                MIN(started_at) AS online_since
              FROM player_server_session
              WHERE server_id=$1 AND ended_at IS NULL
                AND CURRENT_TIMESTAMP - started_at < INTERVAL '12 hours'
              GROUP BY player_id
            )
            SELECT
              count(*) OVER () AS total_players,
              INTERVAL '0 seconds' AS total_playtime,
              0::int AS rank,
              p.player_id,
              p.player_name,
              p.created_at,
              online.online_since,
              lp.started_at AS last_played,
              lp.ended_at - lp.started_at AS last_played_duration
            FROM player p
            JOIN online
              ON online.player_id = p.player_id
            LEFT JOIN LATERAL (
              SELECT st.started_at, st.ended_at
              FROM player_server_session st
              WHERE st.player_id = p.player_id
              ORDER BY st.ended_at DESC NULLS LAST
              LIMIT 1
            ) lp ON true;
        ", server_id).fetch_all(pool);
    let key = format!("online_brief:{server_id}");
    if let Some(result) = cached_response(&key, redis_pool, 5 * 60, func).await.ok(){
        let new_briefs: Vec<PlayerBrief> = result.result.iter_into();
        for player in briefs{
            let Some(found) = new_briefs.iter().find(|e| e.id==player.id) else {
                continue
            };
            (*player).online_since = found.online_since;
            (*player).last_played = found.last_played;
            (*player).last_played_duration = found.last_played_duration;
        }
    }else{
        tracing::warn!("Couldn't update online brief!");
    }
}
pub async fn fetch_profile(provider: &str, player_id: &i64) -> Result<ProviderResponse, ErrorCode> {
    let url = format!("{provider}/steams/pfp/{player_id}");
    let resp = reqwest::get(&url).await.map_err(|_| ErrorCode::NotImplemented)?;
    let result = resp.json::<ProviderResponse>().await.map_err(|_| ErrorCode::NotFound)?;
    Ok(result)
}
pub async fn get_profile(pool: &Pool, provider: &str, player_id: &i64) -> Result<ProviderResponse, ErrorCode> {
    let callable = || fetch_profile(provider, &player_id);
    let redis_key = format!("pfp_cache:{}", player_id);
    let result = cached_response(&redis_key, pool, 7 * 24 * 60 * 60, callable).await
        .map_err(|_| ErrorCode::InternalServerError)?;

    Ok(result.result)
}

pub struct CachedResult<T>{
    pub result: T,
    pub is_new: bool,
}
pub async fn cached_response<'a, T, E, F, Fut>(
    key: &str,
    pool: &Pool,
    ttl: u64,
    callable: F,
) -> Result<CachedResult<T>, E>
where
    T: Serialize + DeserializeOwned + Sync,
    F: Fn() -> Fut,
    Fut: Future<Output = Result<T, E>>,
{
    let redis_key = format!("gfl-ze-watcher:{key}");
    tracing::debug!("Checking cache for {}", redis_key);

    let conn_result = pool.get().await;
    if let Err(e) = &conn_result {
        tracing::warn!("Redis connection failed: {}", e);
    }

    if let Ok(mut conn) = conn_result {
        if let Ok(result) = conn.get::<_, String>(&redis_key).await {
            tracing::debug!("Cache hit for {}", redis_key);
            if let Ok(deserialized) = serde_json::from_str::<T>(&result) {
                tracing::debug!("Cache hit for {}", redis_key);
                return Ok(CachedResult { result: deserialized, is_new: false });
            }else {
                tracing::warn!("Redis deserialize failed: for {}", redis_key);
            }
        }
        tracing::debug!("Cache miss for {}", redis_key);
    }

    let result = callable().await?;

    if let Ok(mut conn) = pool.get().await {
        if let Ok(json_value) = serde_json::to_string(&result) {
            let save: RedisResult<()> = conn.set_ex(&redis_key, &json_value, ttl).await;
            if let Err(e) =  save {
                tracing::warn!("Failed to cache {}: {}", redis_key, e);
            } else {
                tracing::debug!("Cached {} for {} seconds", redis_key, ttl);
            }
        } else {
            tracing::warn!("Failed to serialize cache {}", redis_key);
        }
    }

    Ok(CachedResult { result, is_new: true })
}