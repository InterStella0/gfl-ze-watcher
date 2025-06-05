use std::fmt::Display;
use std::io::Cursor;
use std::path::PathBuf;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use futures::stream::{empty, BoxStream};
use futures::{StreamExt, TryFutureExt};
use image::imageops::{FilterType};
use poem::{Request};
use poem::web::{Data};
use poem_openapi::{ApiResponse, Object, OpenApi};
use poem_openapi::param::{Path, Query};
use poem_openapi::payload::{Binary, EventStream, Json, PlainText};
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgListener;
use tokio::fs;
use tokio::time::interval;
use crate::model::{DbPlayerSitemap, DbMapSitemap, DbPlayer};
use crate::{response, AppData};
use crate::utils::{cached_response, get_env_default, get_map_image, get_map_images, get_profile, IterConvert, ThumbnailType, BASE_URL, DAY, GAME_TYPE};
use url;
extern crate rust_fuzzy_search;
use crate::routers::api_models::{Response, RoutePattern, UriPatternExt};

#[derive(Object, Serialize, Deserialize)]
struct Url {
    loc: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename="changefreq")]
    change_freq: Option<String>,
    priority: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[serde(rename="lastmod")]
    last_mod: Option<String>,
}

#[derive(Object, Serialize, Deserialize)]
#[serde(rename_all = "lowercase", rename = "urlset")]
struct UrlSet {
    #[serde(rename = "@xmlns")]
    namespace: String,
    #[serde(rename = "url")]
    urls: Vec<Url>,
}
#[derive(ApiResponse)]
enum SitemapResponse {
    #[oai(status = 200, content_type = "application/xml")]
    Xml(PlainText<String>),
}

#[derive(Object)]
struct IAmOkie{
    response: String
}
#[derive(Object)]
struct NewRowEvent {
    channel: String,
    payload: String,
}

enum ThumbnailError{
    FetchUrlError(String),
    ImageGeneratorError(String),
}

impl Display for ThumbnailError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ThumbnailError::FetchUrlError(err)
            | ThumbnailError::ImageGeneratorError(err) => write!(f, "{err}"),

        }
    }
}
fn default_ns() -> String {
    "http://www.sitemaps.org/schemas/sitemap/0.9".to_string()
}


#[derive(Object)]
struct OEmbedMapResponse {
    r#type: String,
    version: String,
    title: String,
    description: String,
    author_name: String,
    author_url: String,
    url: String,
    width: i32,
    height: i32,
}

#[derive(Object)]
struct OEmbedPlayerResponse {
    r#type: String,
    version: String,
    title: String,
    description: String,
    author_name: String,
    author_url: String,
    url: String,
}

#[derive(ApiResponse)]
enum OEmbedResponseType{
    #[oai(status = 200, content_type = "application/json+oembed")]
    Player(Json<OEmbedPlayerResponse>),
    #[oai(status = 200, content_type = "application/json+oembed")]
    Map(Json<OEmbedMapResponse>),
    #[oai(status = 400)]
    Err(PlainText<String>)
}

pub struct MiscApi;


#[OpenApi]
impl MiscApi {
    #[oai(path = "/sitemap.xml", method = "get")]
    async fn sitemap(&self, req: &Request, data: Data<&AppData>) -> SitemapResponse{
        let raw_host = req.header("Host").unwrap_or_default();
        let host = format!("{}://{raw_host}", req.uri().scheme_str().unwrap_or("http"));
        let Ok(players) = sqlx::query_as!(DbPlayerSitemap, "
            SELECT player_id, MAX(started_at) recent_online
            FROM player_server_session
            WHERE started_at >= CURRENT_TIMESTAMP - INTERVAL '1 days'
            GROUP BY player_id",
        ).fetch_all(&data.pool).await else {
            return SitemapResponse::Xml(PlainText(String::new()))
        };
        let Ok(maps) = sqlx::query_as!(DbMapSitemap, "
            SELECT map AS map_name, MAX(started_at) last_played
            FROM server_map_played
            GROUP BY map",
        ).fetch_all(&data.pool).await else {
            return SitemapResponse::Xml(PlainText(String::new()))
        };
        let mut urls = vec![];
        urls.push(Url {
            loc: format!("{host}/"),
            change_freq: Some("hourly".to_string()),
            priority: Some(1.0),
            last_mod: None,
        });

        urls.push(Url {
            loc: format!("{host}/maps/"),
            change_freq: Some("daily".to_string()),
            priority: Some(1.0),
            last_mod: None,
        });
        urls.extend(maps
            .into_iter()
            .filter_map(|e| {
                Some(Url {
                    loc: format!("{host}/maps/{}/", e.map_name.unwrap_or_default()),
                    change_freq: None,
                    priority: Some(0.9),
                    last_mod: Some(e.last_played?.date().to_string()),
                })
            })
        );

        urls.push(Url {
            loc: format!("{host}/players/"),
            change_freq: Some("daily".to_string()),
            priority: Some(1.0),
            last_mod: None,
        });
        urls.extend(players
            .into_iter()
            .filter_map(|e| {
                Some(Url {
                    loc: format!("{host}/players/{}/", e.player_id.unwrap_or_default()),
                    change_freq: None,
                    priority: Some(0.7),
                    last_mod: Some(e.recent_online?.date().to_string()),
                })
            })
        );

        let d = UrlSet {
            namespace: default_ns(),
            urls,
        };
        let resp = quick_xml::se::to_string(&d).unwrap_or_default();
        SitemapResponse::Xml(PlainText(resp))
    }
    #[oai(path = "/health", method = "get")]
    async fn am_i_okie(&self) -> Response<IAmOkie>{
        response!(ok IAmOkie{
            response: "ok".to_string()
        })
    }
    async fn generate_thumbnail(&self, thumbnail_type: &ThumbnailType, filename: &str) -> Result<Vec<u8>, ThumbnailError> {
        let image_url = format!("{BASE_URL}/{GAME_TYPE}/{filename}");

        tracing::debug!("Fetching {image_url}");
        let response = reqwest::get(&image_url).await
            .map_err(|_| ThumbnailError::FetchUrlError(image_url))?;
        let bytes = response.bytes()
            .await
            .map_err(
            |_e| ThumbnailError::FetchUrlError("Couldn't get image response bytes!".to_string())
        )?;
        let img = image::load_from_memory(&bytes)
            .map_err(|e| ThumbnailError::ImageGeneratorError(format!("Error loading image memory: {e}")))?;

        let ratio = img.width() / img.height() ;
        let width = match thumbnail_type {
            ThumbnailType::Small => 180,
            ThumbnailType::Medium => 500,
            ThumbnailType::Large => 1122,
            ThumbnailType::ExtraLarge => img.width(),
        };
        let height = ratio * width;
        let thumbnail = img.resize(width, height, FilterType::Lanczos3);

        let path = get_env_default("CACHE_THUMBNAIL").unwrap_or_default();
        let save_path = PathBuf::from(path).join(thumbnail_type.to_string());
        fs::create_dir_all(&save_path)
            .map_err(|e| ThumbnailError::ImageGeneratorError(format!("Error creating folder: {e}")))
            .await?;
        let save_path= save_path.join(filename);
        tracing::debug!("Saving {}", save_path.display());
        let mut buffer = Cursor::new(Vec::new());
        thumbnail.write_to(&mut buffer, image::ImageFormat::Jpeg)
            .map_err(|e| ThumbnailError::ImageGeneratorError(format!("Error writing buffer: {e}")))?;

        fs::write(&save_path, buffer.get_ref()).await
            .map_err(|e| ThumbnailError::ImageGeneratorError(format!("Error writing thumbnail: {e}")))?;

        Ok(buffer.into_inner())
    }
    async fn get_map_thumbnail(&self, thumbnail_type: &ThumbnailType, filename: &str) -> Result<Vec<u8>, ThumbnailError> {
        let path = get_env_default("CACHE_THUMBNAIL").unwrap_or_default();
        let file_path = PathBuf::from(path).join(thumbnail_type.to_string()).join(filename);

        if file_path.exists() {
            let reading = fs::read(file_path).await
                .map_err(|e| ThumbnailError::ImageGeneratorError(format!("Error writing thumbnail: {e}")))?;
            return Ok(reading);
        }

        self.generate_thumbnail(thumbnail_type, &filename).await
    }
    #[oai(path = "/thumbnails/:thumbnail_type/:filename", method = "get")]
    async fn get_thumbnail(&self, thumbnail_type: Path<ThumbnailType>, filename: Path<String>) -> Binary<Vec<u8>> {
        match self.get_map_thumbnail(&thumbnail_type.0, &filename).await {
            Ok(image_data) => Binary(image_data),
            Err(e) => {
                tracing::warn!("{e}");
                Binary(vec![])
            },
        }
    }
    #[oai(path="/meta_thumbnails", method="get")]
    async fn get_meta_thumbnails(
        &self, req: &Request, Data(app): Data<&AppData>, Query(url): Query<String>
    ) -> Binary<Vec<u8>> {
        let rand = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos()
            .to_string();
        let raw_host = req.header("Host").unwrap_or_else(|| &rand);
        let host = format!("{}://{raw_host}", req.uri().scheme_str().unwrap_or("http"));
        let Ok(parsed) = url::Url::parse(&url) else {
            return Binary(vec![])
        };

        let domain = parsed.host_str().unwrap_or("");
        if !host.contains(&domain) {
            return Binary(vec![])
        }

        let path_segments = parsed.path_segments()
            .map(|c| c.collect::<Vec<_>>())
            .unwrap_or_default();

        match path_segments.as_slice() {
            [server_id, "maps", map_name] => {
                let maps = get_map_images(&app.cache).await;
                let map_names: Vec<String> = maps.iter().map(|e| e.map_name.clone()).collect();
                let Some(map_image) = get_map_image(map_name, &map_names) else {
                    return Binary(vec![])
                };

                match self.get_map_thumbnail(&ThumbnailType::Large, &format!("{map_image}.jpg")).await {
                    Ok(image_data) => Binary(image_data),
                    Err(e) => {
                        tracing::warn!("{e}");
                        Binary(vec![])
                    },
                }
            },
            [server_id, "players", player_id] => {
                let Some(provider) = &app.steam_provider else {
                    tracing::warn!("No pfp provider! This feature is disabled.");
                    return Binary(vec![])
                };
                let func = || sqlx::query_as!(
                    DbPlayer, "SELECT  player_id, player_name, created_at, associated_player_id
                                FROM player WHERE player_id=$1 LIMIT 1", player_id
                ).fetch_one(&app.pool);
                let key = format!("info:{player_id}");

                let Ok(result) = cached_response(&key, &app.cache, 7 * DAY, func).await else {
                    return Binary(vec![])
                };
                let player_id = match player_id.parse::<i64>() {
                    Ok(p) => p,
                    Err(_) => {
                        if let Some(p_id) = result.result.associated_player_id{
                            let Ok(converted) = p_id.parse::<i64>() else {
                                tracing::warn!("Found invalid player_id from associated_player_id.");
                                return Binary(vec![])
                            };
                            converted
                        }else{
                            return Binary(vec![])
                        }
                    }
                };

                let Ok(profile) = get_profile(&app.cache, provider, &player_id).await else {
                    tracing::warn!("Provider is broken");
                    return Binary(vec![])
                };
                let Ok(resp) = reqwest::get(profile.url).await else {
                    return Binary(vec![])
                };
                Binary(resp.bytes().await.unwrap_or_default().into())
            },
            _ => Binary(vec![])
        }
    }
    #[oai(path="/oembed/", method="get")]
    async fn get_oembed(&self, req: &Request, Data(app): Data<&AppData>, Query(url): Query<String>) -> OEmbedResponseType {
        let rand = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos().to_string();
        let raw_host = req.header("Host").unwrap_or_else(|| &rand);
        let host = format!("{}://{raw_host}", req.uri().scheme_str().unwrap_or("http"));
        let Ok(parsed) = url::Url::parse(&url) else {
            return OEmbedResponseType::Err(PlainText("Error".to_string()));
        };

        let domain = parsed.host_str().unwrap_or("");
        if !host.contains(&domain) {
            return OEmbedResponseType::Err(PlainText("Error".to_string()));
        }

        let path_segments = parsed.path_segments().map(|c| c.collect::<Vec<_>>()).unwrap_or_default();

        match path_segments.as_slice() {
            [server_id, "maps", map_name] => {
                let response = OEmbedMapResponse {
                    r#type: "photo".to_string(),
                    version: "1.0".to_string(),
                    title: map_name.to_string(),
                    description: format!("{} activity and its performance in ZE Server.", map_name),
                    author_name:  map_name.to_string(),
                    author_url: format!("{host}/{server_id}/maps/{map_name}"),
                    url: format!("{host}/thumbnails/large/{map_name}.jpg"),
                    width: 240,
                    height: 160,
                };
                OEmbedResponseType::Map(Json(response))
            },
            [server_id, "players", player_id] => {
                let func = || sqlx::query_as!(
                    DbPlayer, "SELECT  player_id, player_name, created_at, associated_player_id
                                FROM player WHERE player_id=$1 LIMIT 1", player_id
                ).fetch_one(&app.pool);
                let key = format!("info:{player_id}");

                let Ok(result) = cached_response(&key, &app.cache, 7 * DAY, func).await else {
                    return OEmbedResponseType::Err(PlainText("Invalid player id".to_string()))
                };
                let player = result.result;
                let base_path = req.uri().path().replacen("/oembed/", "", 1);
                let response = OEmbedPlayerResponse {
                    r#type: "link".to_string(),
                    version: "1.0".to_string(),
                    description: format!("{}'s activity on ZE Server", &player.player_name),
                    title: player.player_name.clone(),
                    author_name: player.player_name,
                    author_url: format!("{host}/{server_id}/players/{player_id}"),
                    url: format!("{base_path}/meta_thumbnails?url={host}/players/{player_id}"),
                };
                OEmbedResponseType::Player(Json(response))
            },
            _ => OEmbedResponseType::Err(PlainText("Invalid URL".to_string()))
        }
    }
    #[oai(path = "/events/data-updates", method = "get")]
    async fn sse_new_rows(&self) -> EventStream<BoxStream<'static, NewRowEvent>> {
        let Some(db_url) = get_env_default("DATABASE_URL") else {
            let empty_stream: BoxStream<'static, NewRowEvent> = empty().boxed();
            return EventStream::new(empty_stream);
        };

        let valid_listeners = vec![
            "player_activity", "map_changed", "map_update", "infraction_new", "infraction_update"
        ];
        let stream = async_stream::stream! {
            let mut heartbeat_interval = interval(Duration::from_secs(10));

            match PgListener::connect(&db_url).await {
                Ok(mut listener) => {
                    for listener_name in valid_listeners {
                        if let Err(e) = listener.listen(listener_name).await {
                            tracing::warn!("Failed to LISTEN on {listener_name}: {e}");
                        }
                    }

                    loop {
                        tokio::select! {
                            result = listener.recv() => {
                                match result {
                                    Ok(notification) => {
                                        yield NewRowEvent {
                                            channel: notification.channel().to_string(),
                                            payload: notification.payload().to_string(),
                                        };
                                    },
                                    Err(e) => {
                                        tracing::error!("Error receiving notification: {}", e);
                                        break;
                                    },
                                }
                            },
                            _ = heartbeat_interval.tick() => {
                                yield NewRowEvent {
                                    channel: "heartbeat".to_string(),
                                    payload: "{}".to_string(),
                                };
                            },
                        }

                    }
                },
                Err(e) => {
                    tracing::error!("PgListener connect error: {e}");
                }
            }
        };

        EventStream::new(stream.boxed())
    }
}
impl UriPatternExt for MiscApi{
    fn get_all_patterns(&self) -> Vec<RoutePattern<'_>> {
        vec![
            "/oembed/",
            "/meta_thumbnails",
            "/thumbnails/{thumbnail_type}/{filename}",
            "/health",
            "/events/data-updates",
            "/sitemap.xml",
        ].iter_into()
    }
}