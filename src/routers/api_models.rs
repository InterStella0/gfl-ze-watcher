use std::fmt::Display;
use chrono::{DateTime, Utc};
use poem_openapi::{Enum, Object};
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
    pub flags: i32,
    pub admin_avatar: Option<String>
}


#[derive(Object)]
pub struct PlayerProfilePicture{
    pub id: i64,
    pub url: String,
}
#[derive(Serialize, Deserialize)]
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