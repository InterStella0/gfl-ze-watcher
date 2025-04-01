use std::cmp::Ordering;
use std::fmt::Display;
use std::panic;
use std::sync::Arc;
use std::time::Instant;
use chrono::{DateTime, Utc};
use poem::http::StatusCode;
use poem::{Endpoint, Middleware, Request};
use uri_pattern_matcher::UriPattern;
use redis_macros::{FromRedisValue, ToRedisArgs};
use poem_openapi::{ApiResponse, Enum, Object};
use poem_openapi::payload::Json;
use poem_openapi::types::{ParseFromJSON, ToJSON};
use sentry::{TransactionContext};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use crate::AppData;
use crate::model::DbServer;
use crate::utils::get_server;

#[derive(Object)]
pub struct PlayerSessionTime{
    pub bucket_time: DateTime<Utc>,
    pub hours: f64,
}

#[derive(Object)]
pub struct PlayerInfraction{
    pub id: String,
    pub by: String,
    pub reason: Option<String>,
    pub infraction_time: Option<DateTime<Utc>>,
    pub flags: i64,
    pub admin_avatar: Option<String>
}


#[derive(Object)]
pub struct PlayerInfractionUpdate{
    pub id: i64,
    pub infractions: Vec<PlayerInfraction>,
}

#[derive(Object)]
pub struct PlayerProfilePicture{
    pub id: String,
    pub full: String,
    pub medium: String,
}
#[derive(Serialize, Deserialize, FromRedisValue, ToRedisArgs)]
pub struct ProviderResponse{
    pub provider: String,
    pub url: String
}
#[derive(Object)]
pub struct SearchPlayer{
    pub(crate) name: String,
    pub(crate) id: String
}
#[derive(Object)]
pub struct DetailedPlayer{
    pub id: String,
    pub name: String,
    pub aliases: Vec<PlayerAlias>,
    pub created_at: DateTime<Utc>,
    pub category: Option<String>,
    pub tryhard_playtime: f64,
    pub casual_playtime: f64,
    pub total_playtime: f64,
    pub favourite_map: Option<String>,
    pub rank: i64,
    pub online_since: Option<DateTime<Utc>>,
    pub last_played: DateTime<Utc>,
    pub last_played_duration: f64,
}

#[derive(Object)]
pub struct PlayerAlias{
    pub name: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Object)]
pub struct BriefPlayers {
    pub total_players: i64,
    pub players: Vec<PlayerBrief>
}
#[derive(Object)]
pub struct PlayerBrief{
    pub id: String,
    pub name: String,
    pub created_at: DateTime<Utc>,
    pub total_playtime: f64,
    pub rank: i64,
    pub online_since: Option<DateTime<Utc>>,
    pub last_played: DateTime<Utc>,
    pub last_played_duration: f64,
}
#[derive(Object)]
pub struct MapSessionDistribution{
    pub session_range: String,
    pub session_count: i64,
}
#[derive(Object)]
pub struct MapEventAverage{
    pub event_name: String,
    pub average: f64,
}
#[derive(Object)]
pub struct MapRegion {
    pub region_name: String,
    pub total_play_duration: f64
}
#[derive(Object)]
pub struct DailyMapRegion{
    pub date: DateTime<Utc>,
    pub regions: Vec<MapRegion>
}
#[derive(Object)]
pub struct Region{
    pub region_name: String,
    pub region_id: i64,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
}
#[derive(Object)]
pub struct PlayerMostPlayedMap{
    pub map: String,
    pub duration: f64
}
#[derive(Object)]
pub struct PlayerRegionTime{
    pub id: i16,
    pub name: String,
    pub duration: f64,
}

#[derive(Object)]
pub struct ServerCountData{
    pub bucket_time: DateTime<Utc>,
    pub player_count: i32
}

#[derive(Object)]
pub struct ServerMapPlayed{
    pub time_id: i32,
    pub server_id: String,
    pub map: String,
    pub player_count: i32,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
}

#[derive(Object)]
pub struct ServerMapPlayedPaginated{
    pub total_sessions: i32,
    pub maps: Vec<ServerMapPlayed>
}

#[derive(Object)]
pub struct PlayerSession{
    pub id: String,
    pub player_id: String,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub duration: Option<f64>,
}

#[derive(Enum)]
pub enum EventType{
    Join,
    Leave
}

impl Display for EventType{
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let result = match self {
            EventType::Join => "join",
            EventType::Leave => "leave"
        };
        write!(f, "{}", String::from(result))
    }
}


#[derive(Object)]
pub struct MapPlayedPaginated{
    pub total_maps: i32,
    pub maps: Vec<MapPlayed>
}
#[derive(Object)]
pub struct ServerMap{
    pub map: String,
    pub server_id: String,
}
#[derive(Object)]
pub struct MapPlayed{
    pub map: String,
    pub first_occurrance: DateTime<Utc>,
    pub is_tryhard: Option<bool>,
    pub is_casual: Option<bool>,
    pub cleared_at: Option<DateTime<Utc>>,
    pub total_time: f64,
    pub total_sessions: i32,
    pub last_played: Option<DateTime<Utc>>,
    pub last_played_ended: Option<DateTime<Utc>>,
}


pub enum ErrorCode{
    NotFound,
    BadRequest,
    InternalServerError,
    NotImplemented
}

impl From<ErrorCode> for i32{
    fn from(code: ErrorCode) -> i32 {
        match code {
            ErrorCode::NotFound => 404,
            ErrorCode::BadRequest => 400,
            ErrorCode::InternalServerError => 500,
            ErrorCode::NotImplemented => 501
        }
    }
}

#[derive(Object)]
pub struct ResponseObject<T: ParseFromJSON + ToJSON + Send + Sync> {
    code: i32,
    msg: String,
    data: Option<T>,
}
impl <T: ParseFromJSON + ToJSON + Send + Sync> ResponseObject<T>{
    pub fn ok(data: T) -> Self {
        Self {
            code: 0,
            msg: "OK".to_string(),
            data: Some(data),
        }
    }
    pub fn err(msg: &str, code: ErrorCode) -> Self {
        Self {
            code: code.into(),
            msg: msg.to_string(),
            data: None,
        }
    }
}

#[derive(Object)]
pub struct MapAnalyze{
    pub map: String,
    pub unique_players: i64,
    pub map_score: f64,
    pub total_playtime: f64,
    pub total_sessions: i64,
    pub avg_playtime_before_quitting: f64,
    pub dropoff_rate: f64,
    pub last_played: DateTime<Utc>,
    pub avg_players_per_session: f64,
}


#[derive(ApiResponse)]
pub enum GenericResponse<T: ParseFromJSON + ToJSON + Send + Sync> {
    #[oai(status = 200)]
    Ok(Json<ResponseObject<T>>),
}

#[macro_export]
macro_rules! response {
    (ok $data: expr) => {
        Ok(crate::routers::api_models::GenericResponse::Ok(poem_openapi::payload::Json(
            crate::routers::api_models::ResponseObject::ok($data)
        )))
    };
    (err $msg: expr, $code: expr) => {
        Ok(crate::routers::api_models::GenericResponse::Ok(poem_openapi::payload::Json(
            crate::routers::api_models::ResponseObject::err($msg, $code)))
        )
    };
    (internal_server_error) => {
        Ok(crate::routers::api_models::GenericResponse::Ok(poem_openapi::payload::Json(
            crate::routers::api_models::ResponseObject::err(
                "Something went wrong", crate::routers::api_models::ErrorCode::InternalServerError
            ))
        ))
    };
    (todo) => {
        Ok(crate::routers::api_models::GenericResponse::Ok(
            poem_openapi::payload::Json(
                crate::routers::api_models::ResponseObject::err(
            "Haven't done this yet sry.", crate::routers::api_models::ErrorCode::NotImplemented
        ))))
    }
}
pub type Response<T> = poem::Result<GenericResponse<T>>;

pub struct ServerExtractor(pub DbServer);


impl<'a> poem::FromRequest<'a> for ServerExtractor {
    async fn from_request(req: &'a poem::Request, _body: &mut poem::RequestBody) -> poem::Result<Self> {
        let server_id = req.raw_path_param("server_id")
            .ok_or_else(|| poem::Error::from_string("Invalid server_id", StatusCode::BAD_REQUEST))?;

        let data: &AppData = req.data()
            .ok_or_else(|| poem::Error::from_string("Invalid server_id", StatusCode::BAD_REQUEST))?;

        let Some(server) = get_server(&data.pool, &data.redis_pool, &server_id).await else {
            return Err(poem::Error::from_string("Server not found", StatusCode::NOT_FOUND))
        };

        Ok(ServerExtractor(server))
    }
}
type UriExtension = dyn UriPatternExt + Send + Sync;
pub struct PatternLogger {
    pub routers: Vec<Arc<UriExtension>>
}
impl PatternLogger{
    pub fn new(apis: Vec<Arc<UriExtension>>) -> PatternLogger {
        PatternLogger{
            routers: apis
        }
    }
}
impl<E: Endpoint<Output = poem::Response>> Middleware<E> for PatternLogger {
    type Output = PatternLoggerEndpoint<E>;

    fn transform(&self, ep: E) -> Self::Output {
        PatternLoggerEndpoint { ep, apis: self.routers.clone() }
    }
}


pub struct PatternLoggerEndpoint<E> {
    ep: E,
    apis: Vec<Arc<UriExtension>>,
}

impl<E> PatternLoggerEndpoint<E>
where
    E: Endpoint<Output = poem::Response>,
{
    fn find_pattern(&self, uri_path: &str) -> Option<RoutePattern> {
        let mut a = vec![];
        for api in &self.apis {
            for pattern in api.get_all_patterns() {
                a.push(pattern);
            }
        }
        a.iter()
            .filter(|pat| pat.is_match(uri_path))
            .max()
            .map(|e| e.clone())
    }
}
impl<E> Endpoint for PatternLoggerEndpoint<E>
where
    E: Endpoint<Output = poem::Response>,
{
    type Output = poem::Response;
    async fn call(&self, req: Request) -> poem::Result<Self::Output> {
        let uri = req.uri();
        let uri_path = String::from(uri.path());
        let transaction_name = match self.find_pattern(&uri_path) {
            Some(pattern) => pattern.uri.to_string(),
            None => {
                tracing::warn!("Unregistered pattern: {uri_path}");
                "unknown_pattern".to_string()
            },
        };

        let span = tracing::info_span!(
            "http_request",
            transaction_name = %transaction_name,
            http.request.method = %req.method().as_str(),
            http.uri = %uri_path,
            otel.kind = "server"
        );

        let result = span.in_scope(|| async {
            let tx_ctx = TransactionContext::new(&transaction_name, "http.server");
            let transaction = sentry::start_transaction(tx_ctx);
            transaction.set_tag("http.request.method", req.method().as_str());
            transaction.set_data("http.uri", json!(uri_path));

            let now = Instant::now();
            let res = self.ep.call(req).await;
            let duration = now.elapsed();

            match &res {
                Ok(resp) => {
                    let status = resp.status();

                    span.record("http.status_code", &status.as_u16());
                    span.record("duration_ms", &duration.as_millis());

                    transaction.set_tag("http.status_code", status.as_str());
                    transaction.set_data("duration_ms", json!(duration.as_millis()));

                    tracing::info!(
                        status = %status,
                        duration = ?duration,
                        "{uri_path} completed successfully"
                    );
                }
                Err(err) => {
                    let status = err.status();

                    // Record error in span
                    span.record("http.status_code", &status.as_u16());
                    span.record("error", &format!("{}", err));
                    span.record("duration_ms", &duration.as_millis());

                    // Also record in Sentry
                    transaction.set_tag("http.status_code", status.as_str());
                    transaction.set_data("error", Value::String(format!("{}", err)));
                    transaction.set_data("duration_ms", json!(duration.as_millis()));

                    tracing::error!(
                        status = %status,
                        error = %err,
                        duration = ?duration,
                        "{uri_path} failed"
                    );
                }
            };

            transaction.finish();
            res
        }).await;

        result
    }
}

#[derive(Clone)]
pub struct RoutePattern<'a> {
    pattern: UriPattern<'a>,
    uri: &'a str,
}
impl<'a> From<&'a str> for RoutePattern<'a> {
    fn from(uri: &'a str) -> Self {
        Self::new(uri)
    }
}
pub fn suppress_panic_logs<F, T>(f: F) -> Option<T>
where
    F: FnOnce() -> T + panic::UnwindSafe,
{
    let original_hook = panic::take_hook();
    panic::set_hook(Box::new(|_| {}));
    let result = panic::catch_unwind(f).ok();
    panic::set_hook(original_hook);
    result
}
impl<'a> RoutePattern<'a> {
    pub fn new(pattern: &'a str) -> Self {
        RoutePattern {
            pattern: UriPattern::from(pattern),
            uri: pattern,
        }
    }

    pub fn is_match(&self, path: &str) -> bool {
        suppress_panic_logs(|| self.pattern.is_match(path)).unwrap_or(false)
    }
}

impl Eq for RoutePattern<'_> {}

impl PartialEq<Self> for RoutePattern<'_> {
    fn eq(&self, other: &Self) -> bool {
        suppress_panic_logs(||
            other.pattern.eq(&self.pattern)
        ).unwrap_or(false)
    }
}

impl PartialOrd<Self> for RoutePattern<'_> {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        suppress_panic_logs(|| {
            other.pattern.partial_cmp(&self.pattern)
        }).unwrap_or(None)
    }
}

impl Ord for RoutePattern<'_> {
    fn cmp(&self, other: &Self) -> Ordering {
        suppress_panic_logs(|| {
            other.pattern.cmp(&self.pattern)
        }).unwrap_or(Ordering::Equal)
    }
}

pub trait UriPatternExt {
    fn get_all_patterns(&self) -> Vec<RoutePattern<'_>>;
}