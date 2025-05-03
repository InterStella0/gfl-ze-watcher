use poem::middleware::Cors;
use poem::{listener::TcpListener, Route, EndpointExt, Server};
use poem_openapi::{OpenApiService};
mod routers;
mod model;
mod utils;
mod global_serializer;

use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres};
use utils::get_env_default;
use crate::routers::graphs::GraphApi;
use crate::routers::players::PlayerApi;
use crate::utils::get_env;
use std::env;
use std::sync::Arc;
use deadpool_redis::{
    Config,
    Runtime,
};
use dotenv::dotenv;
use tracing::level_filters::LevelFilter;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};
use crate::routers::api_models::{PatternLogger, UriPatternExt};
use crate::routers::maps::MapApi;
use crate::routers::misc::MiscApi;
use crate::routers::radars::RadarApi;

#[derive(Clone)]

struct AppData{
    pool: Pool<Postgres>,
    steam_provider: Option<String>,
    redis_pool: deadpool_redis::Pool
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
        .with(sentry_tracing::layer())
        .with(tracing_filter)
        .init();

    tracing::info!("ENVIRONMENT: {environment}");
    let pg_conn = get_env("DATABASE_URL");
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&pg_conn).await
        .expect("Couldn't load postgresql connection!");

    let data = AppData { pool, steam_provider: Some("http://pfp-provider:3000/api".to_string()), redis_pool };

    let apis = (
        PlayerApi,
        GraphApi,
        MapApi,
        RadarApi,
        MiscApi
    );
    // For logging endpoints, because poem dev rly makes it hard for me
    let registered: Vec<Arc<dyn UriPatternExt + Send + Sync>> = vec![
        Arc::new(MapApi),
        Arc::new(PlayerApi),
        Arc::new(GraphApi),
        Arc::new(RadarApi),
        Arc::new(MiscApi),
    ];
    let api_service = OpenApiService::new(apis, "GFL ZE Watcher", "0.0")
        .server("http://localhost:3000/");

    let mut route = Route::new();
    if &environment.to_uppercase() == "DEVELOPMENT"{
        let ui = api_service.swagger_ui();
        route = route.nest("/ui", ui);
    }
    let app = route.nest("/", api_service)
        .with(Cors::new())
        .with(PatternLogger::new(registered))
        .data(data);

    Server::new(TcpListener::bind("0.0.0.0:3000"))
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
