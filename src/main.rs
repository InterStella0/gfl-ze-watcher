use poem::middleware::Cors;
use poem::{listener::TcpListener, EndpointExt, Route, Server};
use poem_openapi::OpenApiService;
mod routers;
mod global_serializer;
mod core;

use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres};
use core::utils::get_env_default;
use crate::routers::graphs::GraphApi;
use crate::routers::players::PlayerApi;
use core::utils::get_env;
use std::env;
use std::sync::Arc;
use std::time::Duration;
use deadpool_redis::{
    Config,
    Runtime,
};
use dotenv::dotenv;
use tracing::level_filters::LevelFilter;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};
use core::api_models::{PatternLogger, UriPatternExt};
use crate::routers::maps::MapApi;
use crate::routers::misc::MiscApi;
use crate::routers::radars::RadarApi;
use core::updater::{listen_new_update, maps_updater, recent_players_updater};
use moka::future::Cache;
use crate::core::workers::{MapWorker, PlayerWorker};
use crate::routers::servers::ServerApi;

#[derive(Clone)]
struct AppData{
    pool: Arc<Pool<Postgres>>,
    steam_provider: Option<String>,
    cache: Arc<FastCache>,
    player_worker: Arc<PlayerWorker>,
    map_worker: Arc<MapWorker>,
}
#[derive(Clone)]
struct FastCache{
    redis_pool: deadpool_redis::Pool,
    memory: Arc<Cache<String, String>>
}


async fn run_main() {
    let environment = get_env_default("ENVIRONMENT").unwrap_or(String::from("DEVELOPMENT"));

    let cfg = Config::from_url(get_env("REDIS_URL"));
    let redis_pool = cfg.create_pool(Some(Runtime::Tokio1))
                                .expect("Failed to create pool");
    let tracing_filter = EnvFilter::default()
        .add_directive(LevelFilter::INFO.into());

    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(tracing_filter)
        .init();
    tracing::info!("ENVIRONMENT: {environment}");
    let pg_conn = get_env("DATABASE_URL");
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&pg_conn).await
        .expect("Couldn't load postgresql connection!");

    let memory = Arc::new(Cache::builder()
        .time_to_live(Duration::from_secs(60))
        .max_capacity(10_000)
        .build());

    let cache = Arc::new(FastCache { redis_pool, memory });
    let pool = Arc::new(pool);
    let player_worker = Arc::new(PlayerWorker::new(cache.clone(), pool.clone()));
    let map_worker = Arc::new(MapWorker::new(cache.clone(), pool.clone()));
    let data = AppData {
        pool,
        steam_provider: Some("http://pfp-provider:3000/api".to_string()),
        cache,
        player_worker,
        map_worker,
    };

    let apis = (
        ServerApi,
        PlayerApi,
        GraphApi,
        MapApi,
        RadarApi,
        MiscApi
    );
    // For logging endpoints, because poem dev rly makes it hard for me
    let registered: Vec<Arc<dyn UriPatternExt + Send + Sync>> = vec![
        Arc::new(MapApi),
        Arc::new(ServerApi),
        Arc::new(PlayerApi),
        Arc::new(GraphApi),
        Arc::new(RadarApi),
        Arc::new(MiscApi),
    ];
    let port = "3000";
    let api_service = OpenApiService::new(apis, "GFL ZE Watcher", "0.0")
        .server(format!("http://127.0.0.1:{port}/"));

    let mut route = Route::new();
    if &environment.to_uppercase() == "DEVELOPMENT"{
        let ui = api_service.swagger_ui();
        route = route.nest("/ui", ui);
    }
    let app = route.nest("/", api_service)
        .with(Cors::new())
        .with(PatternLogger::new(registered))
        .data(data);

    if environment.to_uppercase() == "PRODUCTION"{
        let redis_pool = cfg.create_pool(Some(Runtime::Tokio1))
            .expect("Failed to create pool");
        let redis_pool = redis_pool;
        let memory = Arc::new(Cache::builder()
            .time_to_live(Duration::from_secs(60))
            .max_capacity(10_000)
            .build());
        let fast = FastCache { redis_pool, memory };
        let pool = PgPoolOptions::new()
            .max_connections(5)
            .connect(&pg_conn).await
            .expect("Couldn't load postgresql connection!");

        tokio::spawn(async move {
            listen_new_update(&pg_conn, port).await;
        });

        let arc_pool = Arc::new(pool);
        let pool1 = arc_pool.clone();
        let pool2 = arc_pool.clone();
        let redis1 = fast.clone();
        let redis2 = fast.clone();
        tokio::spawn(async move {
            maps_updater(pool1, port, redis1).await;
        });
        tokio::spawn(async move {
            recent_players_updater(pool2, port, redis2).await;
        });
    }

    Server::new(TcpListener::bind(format!("0.0.0.0:{port}")))
        .run(app)
        .await
        .expect("Couldn't run the server!");
}
fn main(){
    dotenv().ok();
    if env::var_os("RUST_LOG").is_none() {
        unsafe{
            env::set_var("RUST_LOG", "poem=debug");
        }
    }
    let environment = get_env_default("ENVIRONMENT").unwrap_or(String::from("DEVELOPMENT"));
    let sentry_url = get_env_default("SENTRY_URL");
    let _guard = sentry::init((sentry_url, sentry::ClientOptions {
        release: sentry::release_name!(),
        environment: Some(environment.into()),
        traces_sample_rate: 1.0,
        ..sentry::ClientOptions::default()
    }));
    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(async {
            run_main().await
        });
}
