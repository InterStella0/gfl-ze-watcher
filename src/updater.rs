use std::fmt::Display;
use std::sync::Arc;
use sqlx::postgres::{PgListener, PgNotification};
use rand::{rng, Rng};
use std::time::Duration;
use reqwest::Client;
use serde::de::DeserializeOwned;
use serde::Deserialize;
use sqlx::{Pool, Postgres};
use tokio::time::sleep;
use crate::model::{DbMap, DbPlayerBrief};

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
            "player_activity" => self.update_player_metadata_notify(notification).await,
            "map_update" => self.update_map_metadata_notify(notification).await,
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
    async fn update_player_metadata(&self, server_id: &str, player_id: &str) -> Updated{
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
            url.replace("{server_id}", server_id)
                .replace("{player_id}", player_id))
            .collect();

        self.calls(formatted.iter()).await;
        Ok(())
    }
    async fn update_player_metadata_notify(&self, notification: PgNotification) -> Updated{
        let value: EventPlayerActivity = self.parse_payload(notification)?;
        if value.event_name != "leave"{
            return Ok(())
        }
        self.update_player_metadata(&value.server_id, &value.player_id).await
    }
    async fn update_map_metadata(&self, server_id: &str, map: &str) -> Updated{
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
            url.replace("{server_id}", server_id)
                .replace("{map_name}", map))
            .collect();

        self.calls(formatted.iter()).await;
        Ok(())
    }
    async fn update_map_metadata_notify(&self, notification: PgNotification) -> Updated{
        let value: EventMapEnded = self.parse_payload(notification)?;
        self.update_map_metadata(&value.server_id, &value.map).await
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
pub async fn maps_updater(pool: Arc<Pool<Postgres>>, port: &str){
    let pool = &*pool;
    let Ok(result) = sqlx::query_as!(DbMap, "
            WITH maps AS (
                SELECT server_id, map, MAX(started_at) recent
                FROM server_map_played
                GROUP BY server_id, map
                ORDER BY recent DESC
            )
            SELECT server_id, map
            FROM maps
        ").fetch_all(pool).await else {
        tracing::warn!("Couldn't update 100 players top recent players");
        return
    };
    let updater = Updater::new(port);
    let delay = Duration::from_secs(1);
    for row in result{
        if let Err(e) = updater.update_map_metadata(&row.server_id, &row.map).await{
            tracing::warn!("Updater couldn't update maps metadata: {}", e)
        }
        sleep(delay).await;
    }
}
struct DbServerSimple{
    server_id: String,
}

async fn recent_players(pool: &Pool<Postgres>, server_id: &str, port: &str){
    let Ok(result) = sqlx::query_as!(DbPlayerBrief, "
    		WITH pre_vars AS (
				SELECT $1 AS server_id
			),
			vars AS (
				SELECT
					CURRENT_TIMESTAMP AS right_now,
					CURRENT_TIMESTAMP - INTERVAL '6 month' AS min_start
				FROM pre_vars pv
			),
			sessions_selection AS (
				SELECT *,
					CASE
						WHEN ended_at IS NOT NULL THEN ended_at - started_at
						WHEN ended_at IS NULL AND CURRENT_TIMESTAMP - started_at < INTERVAL '12 hours'
							THEN CURRENT_TIMESTAMP - started_at
						ELSE INTERVAL '0'
					END AS duration
				FROM player_server_session
				WHERE server_id = (SELECT server_id FROM pre_vars)
				  AND (
						(ended_at IS NOT NULL AND ended_at >= (SELECT min_start FROM vars))
						OR (ended_at IS NULL)
					  )
				  AND started_at <= (SELECT right_now FROM vars)
			),
			session_duration AS (
				SELECT
					player_id,
					SUM(duration) AS played_time,
					COUNT(*) OVER () AS total_players
				FROM sessions_selection
				GROUP BY player_id
			),
			top_players AS (
				SELECT *
				FROM session_duration
				ORDER BY played_time DESC
				LIMIT 100
			)
			SELECT
				p.player_id,
				p.player_name,
				p.created_at,
				sp.played_time AS total_playtime,
				ROW_NUMBER() OVER (ORDER BY sp.played_time DESC)::int AS rank,
				COALESCE(op.started_at, NULL) AS online_since,
				lp.ended_at AS last_played,
				(lp.ended_at - lp.started_at) AS last_played_duration,
				sp.total_players
			FROM top_players sp
			JOIN player p
				ON p.player_id = sp.player_id
			LEFT JOIN LATERAL (
				SELECT s.started_at, s.ended_at
				FROM player_server_session s
				WHERE s.player_id = p.player_id
				  AND s.ended_at IS NOT NULL
				ORDER BY s.ended_at DESC
				LIMIT 1
			) lp ON TRUE
			LEFT JOIN LATERAL (
				SELECT s.started_at
				FROM player_server_session s
				WHERE s.player_id = p.player_id
				  AND s.ended_at IS NULL
				  AND CURRENT_TIMESTAMP - s.started_at < INTERVAL '12 hours'
				ORDER BY s.started_at ASC
				LIMIT 1
			) op ON TRUE
			ORDER BY sp.played_time DESC;
        ", server_id).fetch_all(pool).await else {
        tracing::warn!("Couldn't update 100 players top recent players");
        return
    };
    let delay = Duration::from_secs(1);
    let updater = Updater::new(port);
    for row in result{
        if let Err(e) = updater.update_player_metadata(server_id, &row.player_id).await{
            tracing::warn!("Updater couldn't update player metadata: {}", e)
        }
        sleep(delay).await;
    }

}
pub async fn recent_players_updater(pool: Arc<Pool<Postgres>>, port: &str){
    let pool = &*pool;
    let Ok(servers) = sqlx::query_as!(DbServerSimple, "
        SELECT DISTINCT server_id FROM public.player_server_session
    ").fetch_all(pool).await else {
        tracing::warn!("Couldn't get server for player updater");
        return
    };

    for server in servers{
        recent_players(pool, &server.server_id, port).await
    }
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
