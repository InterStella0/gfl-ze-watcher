use std::collections::HashMap;
use std::fmt::Display;
use std::io::Cursor;
use std::path::PathBuf;
use futures::TryFutureExt;
use image::imageops::{thumbnail, FilterType};
use poem::web::{Data};
use poem_openapi::{ApiResponse, Enum, Object, OpenApi};
use poem_openapi::param::Path;
use poem_openapi::payload::{Binary, PlainText};
use poem_openapi::types::ToJSON;
use serde::{Deserialize, Serialize};
use tokio::fs;
use crate::model::{DbPlayerSitemap};
use crate::{response, AppData};
use crate::routers::api_models::Response;
use crate::utils::get_env_default;

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


pub struct MiscApi;


#[OpenApi]
impl MiscApi {
    #[oai(path = "/sitemap.xml", method = "get")]
    async fn sitemap(&self, data: Data<&AppData>) -> SitemapResponse{
        let base_url = "https://gflgraph.prettymella.site";
        let Ok(result) = sqlx::query_as!(DbPlayerSitemap, "
            SELECT player_id, MAX(started_at) recent_online
            FROM public.player_server_session
            GROUP BY player_id
        ",
        ).fetch_all(&data.pool).await else {
            return SitemapResponse::Xml(PlainText(String::new()))
        };
        let mut urls = vec![];
        urls.push(Url {
            loc: format!("{base_url}/"),
            change_freq: Some("hourly".to_string()),
            priority: Some(1.0),
            last_mod: None,
        });
        urls.push(Url {
            loc: format!("{base_url}/players/"),
            change_freq: Some("daily".to_string()),
            priority: Some(1.0),
            last_mod: None,
        });
        urls.extend(result
            .into_iter()
            .filter_map(|e| {
                Some(Url {
                    loc: format!("{base_url}/players/{}/", e.player_id?),
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
    async fn get_url(&self, url: &str) -> reqwest::Result<VauffResponseData>{
        Ok(reqwest::get(url).await?.json().await?)
    }
    #[oai(path="/map_list_images", method = "get")]
    async fn map_list_images(&self) -> Response<Vec<MapImage>> {
        let list_maps = format!("{BASE_URL}/list.php");

        let Ok(response) = self.get_url(&list_maps).await else {
            return response!(ok vec![])
        };

        let Some(data) = response.maps.get(GAME_TYPE) else {
            return response!(ok vec![])
        };

        let maps = data.into_iter().map(|e| MapImage {
            map_name: e.clone(),
            small: format!("/thumbnails/{}/{}.jpg", ThumbnailType::Small, e),
            medium: format!("/thumbnails/{}/{}.jpg", ThumbnailType::Medium, e),
            large: format!("/thumbnails/{}/{}.jpg", ThumbnailType::Large, e),
            extra_large: format!("/thumbnails/{}/{}.jpg", ThumbnailType::ExtraLarge, e),
        }).collect();
        response!(ok maps)
    }
    async fn generate_thumbnail(&self, thumbnail_type: &ThumbnailType, filename: &str) -> Result<Vec<u8>, ThumbnailError> {
        let image_url = format!("{BASE_URL}/{GAME_TYPE}/{filename}");

        tracing::info!("Fetching {image_url}");
        let response = reqwest::get(&image_url).await
            .map_err(|_| ThumbnailError::FetchUrlError(image_url))?;
        let bytes = response.bytes()
            .await
            .map_err(
            |e| ThumbnailError::FetchUrlError("Couldn't get image response bytes!".to_string())
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
        tracing::info!("Saving {}", save_path.display());
        let mut buffer = Cursor::new(Vec::new());
        thumbnail.write_to(&mut buffer, image::ImageFormat::Jpeg)
            .map_err(|e| ThumbnailError::ImageGeneratorError(format!("Error writing buffer: {e}")))?;

        fs::write(&save_path, buffer.get_ref()).await
            .map_err(|e| ThumbnailError::ImageGeneratorError(format!("Error writing thumbnail: {e}")))?;

        Ok(buffer.into_inner())
    }
    #[oai(path = "/thumbnails/:thumbnail_type/:filename", method = "get")]
    async fn get_thumbnail(&self, thumbnail_type: Path<ThumbnailType>, filename: Path<String>) -> Binary<Vec<u8>> {
        let path = get_env_default("CACHE_THUMBNAIL").unwrap_or_default();
        let file_path = PathBuf::from(path).join(thumbnail_type.0.to_string()).join(&*filename);

        if file_path.exists() {
            let Ok(reading) = fs::read(file_path).await else {
                return Binary(vec![])
            };
            return Binary(reading);
        }

        match self.generate_thumbnail(&thumbnail_type.0, &filename).await {
            Ok(image_data) => Binary(image_data),
            Err(e) => {
                tracing::warn!("{e}");
                Binary(vec![])
            },
        }
    }
}