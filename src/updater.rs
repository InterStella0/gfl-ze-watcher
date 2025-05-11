use std::fmt::Display;
use sqlx::postgres::{PgListener, PgNotification};
use rand::{rng, Rng};
use std::time::Duration;
use reqwest::Client;
use serde::de::DeserializeOwned;
use serde::Deserialize;
use tokio::time::sleep;

struct Updater{
    client: Client,
    port: String,
}
#[derive(Deserialize)]
#[allow(dead_code)]
struct EventPlayerActivity{
    player_id: String,
    server_id: String,
    event_name: String,
    event_value: String,
    created_at: String,
}
#[derive(Deserialize)]
#[allow(dead_code)]
struct EventMapEnded{
    time_id: i64,
    server_id: String,
    map: String,
    player_count: i64,
    started_at: String,
    ended_at: String,
}
enum UpdaterError{
    ParseError(String),
    ConnectionError(String),
}
impl Display for UpdaterError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::ConnectionError(e) => write!(f, "Connection error: {}", e),
            Self::ParseError(e) => write!(f, "Parse error: {}", e),
        }
    }
}
type UpdatedResult<T> = Result<T, UpdaterError>;
type Updated = UpdatedResult<()>;

impl Updater{
    pub fn new(port: &str) -> Self{
        Self{
            client: Client::builder()
                .user_agent("trigger-robot/1.0 (Rust)")
                .build()
                .expect("Could not build client"),
            port: port.to_string(),
        }
    }
    async fn call<T>(&self, endpoint: T)
    where
        T: AsRef<str>,
    {
        let url = format!("http://127.0.0.1:{}{}", self.port, endpoint.as_ref());
        tracing::debug!("Updater call {}", url);
        let Ok(resp) = self.client
            .get(&url)
            .send()
            .await else {
            tracing::warn!("Couldn't call {}", url);
            return
        };
        let Ok(_) = resp.text().await else {
            tracing::warn!("Couldn't read {}", url);
            return
        };
        tracing::debug!("Success call {}", url);
    }
    async fn calls<T>(&self, endpoints: impl IntoIterator<Item = T>)
    where
        T: AsRef<str>,
    {
        for endpoint in endpoints{
            self.call(endpoint).await;
        }
    }
    pub async fn notify(&self, notification: PgNotification) -> Updated{
        match notification.channel() {
            "player_activity" => self.update_player_metadata(notification).await,
            "map_update" => self.update_map_metadata(notification).await,
            other => {
                tracing::warn!("Received notification for unknown channel: {}", other);
                Ok(())
            }
        }
    }
    fn parse_payload<D: DeserializeOwned>(&self, notification: PgNotification) -> UpdatedResult<D>{
        serde_json::from_str(notification.payload())
            .map_err(|e| UpdaterError::ParseError(format!("Failed to deserialize payload: {e}")))
    }
    async fn update_player_metadata(&self, notification: PgNotification) -> Updated {
        let value: EventPlayerActivity = self.parse_payload(notification)?;
        if value.event_name != "leave"{
            return Ok(())
        }
        let urls = vec![
            "/servers/{server_id}/players/{player_id}/graph/sessions",
            "/servers/{server_id}/players/{player_id}/infractions",
            "/servers/{server_id}/players/{player_id}/detail",
            "/servers/{server_id}/players/{player_id}/pfp",
            "/servers/{server_id}/players/{player_id}/most_played_maps",
            "/servers/{server_id}/players/{player_id}/regions",
            "/servers/{server_id}/players/{player_id}/might_friends",
        ];
        let formatted: Vec<String> = urls.into_iter().map(|url|
            url.replace("{server_id}", &value.server_id)
                .replace("{player_id}", &value.player_id))
            .collect();

        self.calls(formatted.iter()).await;
        Ok(())
    }

    async fn update_map_metadata(&self, notification: PgNotification) -> Updated {
        let value: EventMapEnded = self.parse_payload(notification)?;
        let urls = vec![
            "/servers/{server_id}/maps/{map_name}/analyze",
            "/servers/{server_id}/maps/{map_name}/sessions",
            "/servers/{server_id}/maps/{map_name}/events",
            "/servers/{server_id}/maps/{map_name}/heat-regions",
            "/servers/{server_id}/maps/{map_name}/regions",
            "/servers/{server_id}/maps/{map_name}/sessions_distribution",
            "/servers/{server_id}/maps/{map_name}/top_players",
        ];
        let formatted: Vec<String> = urls.into_iter().map(|url|
            url.replace("{server_id}", &value.server_id)
                .replace("{map_name}", &value.map))
            .collect();

        self.calls(formatted.iter()).await;
        Ok(())
    }
}

async fn connect_and_listen(db_url: &str, valid_channels: &[&str]) -> UpdatedResult<PgListener> {
    let mut listener = PgListener::connect(db_url).await.map_err(
        |e| UpdaterError::ConnectionError(format!("Failed to connect to database: {e}"))
    )?;

    for channel in valid_channels {
        if let Err(e) = listener.listen(channel).await {
            tracing::warn!("Failed to LISTEN on channel '{}': {}", channel, e);
        }
    }

    Ok(listener)
}

pub async fn listen_new_update(db_url: &str, port: &str) {
    let valid_channels = ["player_activity", "map_update"];
    let mut attempt = 0;
    let updater = Updater::new(port);
    loop {
        match connect_and_listen(db_url, &valid_channels).await {
            Ok(mut listener) => {
                tracing::info!("Listening to channels...");

                attempt = 0;

                loop {
                    match listener.recv().await {
                        Ok(notification) => {
                            if let Err(e) = updater.notify(notification).await{
                                match e{
                                    UpdaterError::ParseError(e) => {
                                        tracing::error!("Error parsing notify: {e}");
                                    }
                                    _ => {}
                                }
                            }
                        },
                        Err(e) => {
                            tracing::error!("Error receiving notification: {}", e);
                            break;
                        }
                    }
                }
            }
            Err(e) => {
                tracing::error!("Failed to connect to PostgreSQL: {}", e);
            }
        }

        attempt += 1;
        let base_delay = 2_u64.pow(attempt.min(5));
        let jitter = rng().random_range(0..1000);
        let delay = Duration::from_millis((base_delay * 1000) + jitter);
        tracing::warn!("Reconnecting in {delay:.2?}...");
        sleep(delay).await;
    }
}
