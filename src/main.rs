use poem::middleware::Cors;
use poem::{listener::TcpListener, Route, web::Data, EndpointExt, Server};
use poem_openapi::OpenApiService;
mod routers;
mod utils;
use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres};
use crate::routers::graphs::GraphApi;
use crate::routers::players::PlayerApi;
use crate::utils::get_env;
use dotenv::dotenv;
use std::env;

#[derive(Clone)]

struct AppData{
    pool: Pool<Postgres>
}



#[tokio::main]
async fn main() -> Result<(), std::io::Error>  {
    dotenv().expect("Unable to load environment.");
    if env::var_os("RUST_LOG").is_none() {
        env::set_var("RUST_LOG", "poem=debug");
    }

    let pg_conn = get_env("PG_CONN");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&pg_conn).await
        .expect("Couldn't load postgresql connection!");
    let data = AppData { pool };
    tracing_subscriber::fmt::init();

    let apis = (
        PlayerApi,
        GraphApi
    );
    let api_service = OpenApiService::new(apis, "GFL ZE Watcher", "0.0")
        .server("http://localhost:3000/api");
    let ui = api_service.swagger_ui();

    let route = Route::new()
        .nest("/ui", ui)
        .at("/", api_service)
        .with(Cors::new())
        .data(data);

    Server::new(TcpListener::bind("localhost:3000"))
        .run(route)
        .await
}
