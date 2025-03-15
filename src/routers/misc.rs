use poem::http::StatusCode;
use poem::web::{Data};
use poem_openapi::{ApiResponse, Object, OpenApi};
use poem_openapi::payload::{PlainText, Xml};
use poem_openapi::types::ToJSON;
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
            .filter(|e| !e.player_id.is_none() && !e.recent_online.is_none()).map(
                |e| Url{
                    loc: format!("{base_url}/players/{}/", e.player_id.unwrap_or_default()),
                    change_freq: None,
                    priority: Some(0.7),
                    last_mod: Some(e.recent_online.unwrap().date().to_string()),
                }
            ));

        let d = UrlSet {
            namespace: default_ns(),
            urls,
        };
        let resp = quick_xml::se::to_string(&d).unwrap_or_default();
        SitemapResponse::Xml(PlainText(resp))
    }
    #[oai(path = "/health", method = "get")]
    async fn am_i_okie(&self, data: Data<&AppData>) -> Response<IAmOkie>{
        response!(ok IAmOkie{
            response: "ok".to_string()
        })
    }
}