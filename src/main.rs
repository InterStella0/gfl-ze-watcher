use poem::middleware::Cors;
use poem::{listener::TcpListener, Route, EndpointExt, Server};
use poem_openapi::OpenApiService;
mod routers;
mod model;
mod utils;
use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres};
use utils::get_env_default;
use crate::routers::graphs::GraphApi;
use crate::routers::players::PlayerApi;
use crate::utils::get_env;
use dotenv::dotenv;
use std::env;

#[derive(Clone)]

struct AppData{
    pool: Pool<Postgres>,
    steam_provider: Option<String>,
}



#[tokio::main]
async fn main() -> Result<(), std::io::Error>  {
    dotenv().expect("Unable to load environment.");
    if env::var_os("RUST_LOG").is_none() {
        env::set_var("RUST_LOG", "poem=debug");
    }

    let pg_conn = get_env("DATABASE_URL");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&pg_conn).await
        .expect("Couldn't load postgresql connection!");



    let steam_url = match get_env_default("STEAM_PFP_PROVIDER"){
        None => {
            println!("NO STEAM PFP PROVIDER FOUND. PROFILE PICTURES ARE DISABLED");
            None
        }
        Some(s) => Some(s)
    };

    let data = AppData { pool, steam_provider: steam_url };
    tracing_subscriber::fmt::init();

    let apis = (
        PlayerApi,
        GraphApi
    );
    let api_service = OpenApiService::new(apis, "GFL ZE Watcher", "0.0")
        .server("http://localhost:3000/");

    let mut route = Route::new();
    let environment = get_env_default("ENVIRONMENT").unwrap_or(String::from("DEVELOPMENT"));
    if &environment.to_uppercase() == "DEVELOPMENT"{
        let ui = api_service.swagger_ui();
        route = route.nest("/ui", ui);
    }
    let app = route.nest("/", api_service)
        .with(Cors::new())
        .data(data);

    Server::new(TcpListener::bind("0.0.0.0:3000"))
        .run(app)
        .await
}
