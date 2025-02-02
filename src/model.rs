use chrono::{DateTime, Utc};
use poem_openapi::{payload::Json, types::{ParseFromJSON, ToJSON}, ApiResponse, Object};
use sqlx::types::time::OffsetDateTime;

use crate::routers::graphs::ServerCountData;

struct DbServer{
    server_name: String,
    server_id: String,
    server_ip: String
}

pub struct DbServerCountData{
	pub server_id: String,
    pub bucket_time: OffsetDateTime,
    pub player_count: i32
}
impl Into<ServerCountData> for DbServerCountData{
    fn into(self) -> ServerCountData {
        ServerCountData { 
            bucket_time: DateTime::<Utc>::from_timestamp(self.bucket_time.unix_timestamp(), 0).unwrap(), 
            player_count: self.player_count
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