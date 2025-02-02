use poem::{listener::TcpListener, Route, Server};
use poem_openapi::OpenApiService;
mod routers;
use crate::routers::graphs::GraphApi;
use crate::routers::players::PlayerApi;

#[tokio::main]
async fn main() -> Result<(), std::io::Error>  {
    if std::env::var_os("RUST_LOG").is_none() {
        std::env::set_var("RUST_LOG", "poem=debug");
    }
    tracing_subscriber::fmt::init();

    let apis = (
        PlayerApi,
        GraphApi
    );
    let api_service = OpenApiService::new(apis, "GFL ZE Watcher", "0.0")
        .server("http://localhost:3000/api");
    let ui = api_service.swagger_ui();

    let route = Route::new()
        .nest("/", api_service)
        .nest("/ui", ui);

    Server::new(TcpListener::bind("localhost:3000"))
        .run(route)
        .await
}
