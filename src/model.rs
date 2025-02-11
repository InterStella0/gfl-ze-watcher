use chrono::{DateTime, Utc};
use poem::Result;
use poem_openapi::{payload::Json, types::{ParseFromJSON, ToJSON}, ApiResponse, Object};
use sqlx::{postgres::types::PgInterval, types::{time::{Date, OffsetDateTime, Time, UtcOffset}}};
use crate::{routers::{graphs::{PlayerSession, ServerCountData, ServerMapPlayed}, players::{DetailedPlayer, PlayerInfraction, PlayerSessionTime}}, utils::pg_interval_to_f64};

pub struct DbServer{
    pub server_name: Option<String>,
    pub server_id: String,
    pub server_ip: Option<String>
}
pub struct DbPlayer{
    pub player_id: String,
    pub player_name: String,
    pub created_at: OffsetDateTime
}
pub struct DbPlayerDetail{
    pub player_id: String,
    pub player_name: String,
    pub created_at: OffsetDateTime,
    pub category: Option<String>,
    pub tryhard_playtime: Option<PgInterval>,
    pub casual_playtime: Option<PgInterval>,
    pub total_playtime: Option<PgInterval>,
    pub total_players: Option<i64>,
    pub favourite_map: Option<String>
}

impl Into<DetailedPlayer> for DbPlayerDetail{
    fn into(self) -> DetailedPlayer {
        DetailedPlayer {
            id: self.player_id,
            name: self.player_name,
            created_at: db_to_utc(self.created_at),
            category: self.category,
            casual_playtime: self.casual_playtime.map(pg_interval_to_f64).unwrap_or(0.),
            tryhard_playtime: self.tryhard_playtime.map(pg_interval_to_f64).unwrap_or(0.),
            total_playtime: self.total_playtime.map(pg_interval_to_f64).unwrap_or(0.),
            favourite_map: self.favourite_map
        }
    }
}
pub struct DbPlayerInfraction{
    pub infraction_id: String,
    pub by: Option<String>,
    pub reason: Option<String>,
    pub infraction_time: Option<OffsetDateTime>,
    pub admin_avatar: Option<String>,
    pub flags: Option<i32>
}
impl Into<PlayerInfraction> for DbPlayerInfraction{
    fn into(self) -> PlayerInfraction {
        PlayerInfraction{
            id: self.infraction_id,
            by: self.by.unwrap_or("Unknown".into()),
            reason: self.reason,
            infraction_time: self.infraction_time.map(db_to_utc),
            admin_avatar: self.admin_avatar,
            flags: self.flags.unwrap_or(0)
        }
    }
}
#[derive(PartialEq, Clone)]
pub struct DbServerCountData{
	pub server_id: Option<String>,
    pub bucket_time: Option<OffsetDateTime>,
    pub player_count: Option<i64>
}

#[derive(PartialEq, Clone)]
pub struct DbPlayerSessionTime{
    pub bucket_time: Option<OffsetDateTime>,
    pub hour_duration: Option<f64>
}
impl Into<PlayerSessionTime> for DbPlayerSessionTime{
    fn into(self) -> PlayerSessionTime {
        PlayerSessionTime{
            bucket_time: db_to_utc(self.bucket_time.unwrap_or(smallest_date())),
            hours: self.hour_duration.unwrap_or(0.)
        }
    }
}
pub fn smallest_date() -> OffsetDateTime{
    return OffsetDateTime::new_in_offset(Date::MIN, Time::MIDNIGHT, UtcOffset::UTC)
}

pub fn db_to_utc(date: OffsetDateTime) -> DateTime<Utc>{
    DateTime::<Utc>::from_timestamp(date.unix_timestamp(), 0).unwrap_or_default()
}

impl Into<ServerCountData> for DbServerCountData{
    fn into(self) -> ServerCountData {
        ServerCountData { 
            bucket_time: db_to_utc(
                self.bucket_time.unwrap_or(smallest_date())
            ),
            player_count: self.player_count.unwrap_or(0) as i32
        }
    }
}

#[derive(Clone)]
pub struct DbPlayerSession{
    pub session_id: String,
    pub player_id: Option<String>,
    pub player_name: Option<String>,
    pub started_at: OffsetDateTime,
    pub ended_at: Option<OffsetDateTime>,
    pub duration: Option<PgInterval>,
    pub played_time: Option<PgInterval>,
    pub total_players: Option<i64>
}

impl Into<PlayerSession> for DbPlayerSession{
    fn into(self) -> PlayerSession {
        PlayerSession { 
            id: self.session_id,
            duration: self.duration.map(pg_interval_to_f64),
            player_id: self.player_id.clone().unwrap_or("-1".into()),
            started_at: db_to_utc(self.started_at),
            ended_at: self.ended_at.map(db_to_utc)
        }
    }
}



pub struct DbServerMapPlayed{
    pub time_id: i32,
    pub server_id: String,
    pub map: Option<String>,
    pub player_count: i32,
    pub started_at: OffsetDateTime,
    pub ended_at: Option<OffsetDateTime>,
}
impl Into<ServerMapPlayed> for DbServerMapPlayed{
    fn into(self) -> ServerMapPlayed {
        ServerMapPlayed { 
            started_at: db_to_utc(self.started_at), 
            ended_at: self.ended_at.map(db_to_utc) , 
            player_count: self.player_count,
            time_id: self.time_id,
            server_id: self.server_id,
            map: self.map.unwrap_or_default(),
        }
    }
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

#[derive(ApiResponse)]
pub enum GenericResponse<T: ParseFromJSON + ToJSON + Send + Sync> {
    #[oai(status = 200)]
    Ok(Json<ResponseObject<T>>),
}

#[macro_export]
macro_rules! response {
    (ok $data: expr) => {
        Ok(crate::model::GenericResponse::Ok(poem_openapi::payload::Json(crate::model::ResponseObject::ok($data))))
    };
    (err $msg: expr, $code: expr) => {
        Ok(crate::model::GenericResponse::Ok(poem_openapi::payload::Json(crate::model::ResponseObject::err($msg, $code))))
    };
    (internal_server_error) => {
        Ok(crate::model::GenericResponse::Ok(poem_openapi::payload::Json(
            crate::model::ResponseObject::err(
                "Something went wrong", crate::model::ErrorCode::InternalServerError
            ))
        ))
    };
    (todo) => {
        Ok(crate::model::GenericResponse::Ok(poem_openapi::payload::Json(crate::model::ResponseObject::err(
            "Haven't done this yet sry.", crate::model::ErrorCode::NotImplemented
        ))))
    }
}
pub type Response<T> = Result<GenericResponse<T>>;