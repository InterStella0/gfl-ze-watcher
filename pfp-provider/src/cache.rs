use redis::{AsyncCommands, RedisError, RedisResult};
use std::time::Duration;
use deadpool_redis::{Config, Pool, PoolError, Runtime};

pub struct RedisCache {
    pool: Pool,
}

impl RedisCache {
    pub async fn new(redis_url: &str) -> Result<Self, RedisError> {
        let cfg = Config::from_url(redis_url);
        let redis_pool = cfg.create_pool(Some(Runtime::Tokio1))
            .expect("Failed to create pool redis");
        Ok(Self { pool: redis_pool })
    }

    pub async fn get(&self, key: &str) -> Result<Option<String>, PoolError> {
        let mut con = self.pool.get().await?;
        let result: Option<String> = con.get(format!("steam_pfp:{}", key)).await?;
        Ok(result)
    }

    pub async fn set(&self, key: &str, value: &str, expiry: Duration) -> Result<(), PoolError> {
        let mut con = self.pool.get().await?;
        let _: RedisResult<()> = con.set_ex(format!("steam_pfp_provider:{}", key), value, expiry.as_secs()).await;
        Ok(())
    }
}