use std::collections::HashMap;
use poem::web::{Data};
use poem_openapi::{ApiResponse, Object, OpenApi};
use poem_openapi::payload::{PlainText};
use serde::{Deserialize, Serialize};
use crate::model::{DbPlayerSitemap};
use crate::{response, AppData};
use crate::routers::api_models::Response;

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
struct VauffMapImage{
    map_name: String,
    url: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct VauffResponseData {
    #[serde(flatten)]
    maps: HashMap<String, Vec<String>>,
    #[allow(dead_code)]
    last_updated: u64,
}

fn default_ns() -> String {
    "http://www.sitemaps.org/schemas/sitemap/0.9".to_string()
}

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
    async fn map_list_images(&self) -> Response<Vec<VauffMapImage>> {
        let game_type = "730_cs2";
        let base_url = "https://vauff.com/mapimgs";
        let list_maps = format!("{base_url}/list.php");

        let Ok(response) = self.get_url(&list_maps).await else {
            return response!(ok vec![])
        };

        let Some(data) = response.maps.get(game_type) else {
            return response!(ok vec![])
        };

        let maps = data.into_iter().map(|e| VauffMapImage {
            map_name: e.clone(),
            url: format!("{base_url}/{game_type}/{e}.jpg")
        }).collect();
        response!(ok maps)
    }
}