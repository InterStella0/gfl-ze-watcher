use chrono::{DateTime, Utc};
use poem::Result;
use poem_openapi::{payload::Json, types::{ParseFromJSON, ToJSON}, ApiResponse, Object};
use sqlx::{postgres::types::PgInterval, types::{time::{Date, OffsetDateTime, Time, UtcOffset}}};
use crate::{routers::graphs::{PlayerSession, ServerCountData, ServerMapPlayed}, utils::pg_interval_to_f64};

pub struct DbServer{
    pub server_name: Option<String>,
    pub server_id: String,
    pub server_ip: Option<String>
}

#[derive(PartialEq, Clone)]
pub struct DbServerCountData{
	pub server_id: Option<String>,
    pub bucket_time: Option<OffsetDateTime>,
    pub player_count: Option<i64>
}

pub fn db_to_utc(date: OffsetDateTime) -> DateTime<Utc>{
    DateTime::<Utc>::from_timestamp(date.unix_timestamp(), 0).unwrap_or_default()
}

impl Into<ServerCountData> for DbServerCountData{
    fn into(self) -> ServerCountData {
        ServerCountData { 
            bucket_time: db_to_utc(
                self.bucket_time.unwrap_or(OffsetDateTime::new_in_offset(Date::MIN, Time::MIDNIGHT, UtcOffset::UTC))
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