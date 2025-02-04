use chrono::{DateTime, Utc};
use poem_openapi::{payload::Json, types::{ParseFromJSON, ToJSON}, ApiResponse, Object};
use sqlx::types::time::OffsetDateTime;

use crate::routers::graphs::{ServerCountData, ServerMapPlayed};

pub struct DbServer{
    pub server_name: Option<String>,
    pub server_id: String,
    pub server_ip: Option<String>
}

#[derive(PartialEq, Clone)]
pub struct DbServerCountData{
	pub server_id: String,
    pub bucket_time: OffsetDateTime,
    pub player_count: i32
}

pub fn db_to_utc(date: OffsetDateTime) -> DateTime<Utc>{
    DateTime::<Utc>::from_timestamp(date.unix_timestamp(), 0).unwrap()
}

impl Into<ServerCountData> for DbServerCountData{
    fn into(self) -> ServerCountData {
        ServerCountData { 
            bucket_time: db_to_utc(self.bucket_time), 
            player_count: self.player_count
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
}

#[derive(ApiResponse)]
pub enum GenericResponse<T: ParseFromJSON + ToJSON + Send + Sync> {
    #[oai(status = 200)]
    Ok(Json<ResponseObject<T>>),
}