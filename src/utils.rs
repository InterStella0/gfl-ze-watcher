use std::env;
use std::future::Future;
use std::pin::Pin;
use chrono::{DateTime, Utc};
use deadpool_redis::Pool;
use itertools::Itertools;
use poem::web::Data;
use redis::{AsyncCommands, RedisResult};
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use serde::de::DeserializeOwned;
use sqlx::{postgres::types::PgInterval, types::time::{Date, OffsetDateTime, Time, UtcOffset}};
use time::format_description::well_known::Rfc3339;
use crate::{response, AppData};

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
                tracing::info!("Cache hit for {}", redis_key);
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