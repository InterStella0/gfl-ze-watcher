use std::collections::HashMap;
use std::fmt::Display;
use std::io::Cursor;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use deadpool_redis::Pool;
use futures::TryFutureExt;
use image::imageops::{FilterType};
use poem::Request;
use poem::web::{Data};
use poem_openapi::{ApiResponse, Enum, Object, OpenApi};
use poem_openapi::param::{Path, Query};
use poem_openapi::payload::{Binary, Json, PlainText};
use rust_fuzzy_search::fuzzy_search_threshold;
use serde::{Deserialize, Serialize};
use tokio::fs;
use crate::model::{DbPlayerSitemap, DbMapSitemap, DbPlayer};
use crate::{response, AppData};
use crate::utils::{cached_response, get_env_default, get_profile, IterConvert};
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

#[derive(Object, Serialize, Deserialize)]
struct MapImage{
    map_name: String,
    small: String,
    medium: String,
    large: String,
    extra_large: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct VauffResponseData {
    #[serde(flatten)]
    maps: HashMap<String, Vec<String>>,
    #[allow(dead_code)]
    last_updated: u64,
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


#[derive(Enum)]
#[oai(rename_all = "snake_case")]
enum ThumbnailType{
    Small,
    Medium,
    Large,
    ExtraLarge,
}

impl Display for ThumbnailType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ThumbnailType::Small => write!(f, "small"),
            ThumbnailType::Medium => write!(f, "medium"),
            ThumbnailType::Large => write!(f, "large"),
            ThumbnailType::ExtraLarge => write!(f, "extra_large"),
        }
    }
}


const GAME_TYPE: &str = "730_cs2";
const BASE_URL: &str = "https://vauff.com/mapimgs";


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
            WHERE started_at >= NOW() - INTERVAL '1 days'
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
    async fn fetch_map_images(&self) -> reqwest::Result<Vec<MapImage>>{
        let list_maps = format!("{BASE_URL}/list.php");

        let response: VauffResponseData = reqwest::get(&list_maps).await?.json().await?;

        let Some(data) = response.maps.get(GAME_TYPE) else {
            tracing::warn!("{} results in None", &list_maps);
            return Ok(vec![])
        };

        let maps = data.into_iter().map(|e| MapImage {
            map_name: e.clone(),
            small: format!("/thumbnails/{}/{}.jpg", ThumbnailType::Small, e),
            medium: format!("/thumbnails/{}/{}.jpg", ThumbnailType::Medium, e),
            large: format!("/thumbnails/{}/{}.jpg", ThumbnailType::Large, e),
            extra_large: format!("/thumbnails/{}/{}.jpg", ThumbnailType::ExtraLarge, e),
        }).collect();
        Ok(maps)
    }
    async fn get_map_images(&self, pool: &Pool) -> Vec<MapImage>{
        let resp = cached_response("map_images", pool, 7 * 24 * 60 * 60, || self.fetch_map_images());
        match resp.await {
            Ok(r) => r.result,
            Err(e) => {
                tracing::error!("Fetching map images results in an error {e}");
                vec![]
            }
        }
    }
    #[oai(path="/map_list_images", method = "get")]
    async fn map_list_images(&self, Data(app): Data<&AppData>) -> Response<Vec<MapImage>> {
        response!(ok self.get_map_images(&app.redis_pool).await)
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
        let file_path = PathBuf::from(path).join(thumbnail_type.to_string()).join(&*filename);

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
            ["maps", map_name] => {
                let maps = self.get_map_images(&app.redis_pool).await;
                let map_names: Vec<&String> = maps.iter().map(|e| &e.map_name).collect();
                let res = fuzzy_search_threshold(map_name, &map_names, 0.8);
                let Some((map_image, _)) = res.last() else {
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
            ["players", player_id] => {
                let Some(provider) = &app.steam_provider else {
                    tracing::warn!("No pfp provider! This feature is disabled.");
                    return Binary(vec![])
                };
                let Ok(parsed_id) = player_id.parse::<i64>() else {
                    return Binary(vec![])
                };
                let Ok(profile) = get_profile(&app.redis_pool, provider, &parsed_id).await else {
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
            ["maps", map_name] => {
                let response = OEmbedMapResponse {
                    r#type: "photo".to_string(),
                    version: "1.0".to_string(),
                    title: map_name.to_string(),
                    description: format!("{} activity and its performance in GFL Server.", map_name),
                    author_name:  map_name.to_string(),
                    author_url: format!("{host}/maps/{map_name}"),
                    url: format!("{host}/thumbnails/large/{map_name}.jpg"),
                    width: 240,
                    height: 160,
                };
                OEmbedResponseType::Map(Json(response))
            },
            ["players", player_id] => {
                let func = || sqlx::query_as!(
                    DbPlayer, "SELECT * FROM player WHERE player_id=$1 LIMIT 1", player_id
                ).fetch_one(&app.pool);
                let key = format!("info:{player_id}");

                let Ok(result) = cached_response(&key, &app.redis_pool, 7 * 24 * 60 * 60, func).await else {
                    return OEmbedResponseType::Err(PlainText("Invalid player id".to_string()))
                };
                let player = result.result;
                let base_path = req.uri().path().replacen("/oembed/", "", 1);
                let response = OEmbedPlayerResponse {
                    r#type: "link".to_string(),
                    version: "1.0".to_string(),
                    description: format!("{}'s activity on GFL Server", &player.player_name),
                    title: player.player_name.clone(),
                    author_name: player.player_name,
                    author_url: format!("{host}/players/{player_id}"),
                    url: format!("{base_path}/meta_thumbnails?url={host}/players/{player_id}"),
                };
                OEmbedResponseType::Player(Json(response))
            },
            _ => OEmbedResponseType::Err(PlainText("Invalid URL".to_string()))
        }
    }
}
impl UriPatternExt for MiscApi{
    fn get_all_patterns(&self) -> Vec<RoutePattern<'_>> {
        vec![
            "/oembed/",
            "/meta_thumbnails",
            "/thumbnails/{thumbnail_type}/{filename}",
            "/map_list_images",
            "/health",
            "/sitemap.xml",
        ].iter_into()
    }
}