use std::fmt::Display;
use chrono::{DateTime, Utc};
use redis_macros::{FromRedisValue, ToRedisArgs};
use poem_openapi::{ApiResponse, Enum, Object};
use poem_openapi::payload::Json;
use poem_openapi::types::{ParseFromJSON, ToJSON};
use serde::{Deserialize, Serialize};

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
    pub url: String,
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
pub struct MapRegion {
    pub region_name: String,
    pub total_play_duration: f64
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