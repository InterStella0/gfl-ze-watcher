use crate::routers::api_models::{DetailedPlayer, PlayerAlias, PlayerBrief, PlayerInfraction, PlayerMostPlayedMap, PlayerRegionTime, PlayerSessionTime, SearchPlayer, ServerCountData, ServerMapPlayed};
use crate::utils::pg_interval_to_f64;
use chrono::{DateTime, Utc};
use poem::web::Data;
use sqlx::{postgres::types::PgInterval, types::time::{Date, OffsetDateTime, Time, UtcOffset}};

pub struct DbServer{
    pub server_name: Option<String>,
    pub server_id: String,
    pub server_ip: Option<String>
}

pub struct DbPlayerSitemap{
    pub player_id: Option<String>,
    pub recent_online: Option<OffsetDateTime>,
}

pub struct DbPlayer{
    pub player_id: String,
    pub player_name: String,
    pub created_at: OffsetDateTime
}

impl Into<SearchPlayer> for DbPlayer {
    fn into(self) -> SearchPlayer {
        SearchPlayer{
            name: self.player_name,
            id: self.player_id,
        }
    }
}
pub struct DbPlayerDetail{
    pub player_id: String,
    pub player_name: String,
    pub created_at: OffsetDateTime,
    pub category: Option<String>,
    pub tryhard_playtime: Option<PgInterval>,
    pub casual_playtime: Option<PgInterval>,
    pub total_playtime: Option<PgInterval>,
    pub favourite_map: Option<String>,
    pub rank: Option<i32>,
    pub online_since: Option<OffsetDateTime>,
    pub last_played: Option<OffsetDateTime>,
    pub last_played_duration: Option<PgInterval>,
}
pub struct DbPlayerBrief{
    pub player_id: String,
    pub player_name: String,
    pub created_at: OffsetDateTime,
    pub total_playtime: Option<PgInterval>,
    pub total_players: Option<i64>,
    pub rank: Option<i32>,
    pub online_since: Option<OffsetDateTime>,
    pub last_played: Option<OffsetDateTime>,
    pub last_played_duration: Option<PgInterval>,
}

impl Into<PlayerBrief> for DbPlayerBrief {
    fn into(self) -> PlayerBrief {
        PlayerBrief{
            id: self.player_id,
            name: self.player_name,
            created_at: db_to_utc(self.created_at),
            total_playtime: self.total_playtime.map(pg_interval_to_f64).unwrap_or(0.),
            rank: self.rank.unwrap_or(-1) as i64,
            online_since: self.online_since.map(db_to_utc),
            last_played: db_to_utc(self.last_played.unwrap_or(smallest_date())),
            last_played_duration: self.last_played_duration.map(pg_interval_to_f64).unwrap_or(0.),
        }
    }
}

pub struct DbPlayerAlias{
    pub name: String,
    pub created_at: OffsetDateTime,
}

impl Into<PlayerAlias> for DbPlayerAlias {
    fn into(self) -> PlayerAlias {
        PlayerAlias{
            name: self.name,
            created_at: db_to_utc(self.created_at)
        }
    }
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
            favourite_map: self.favourite_map,
            aliases: vec![],
            rank: self.rank.unwrap_or(-1) as i64,
            online_since: self.online_since.map(db_to_utc),
            last_played: db_to_utc(self.last_played.unwrap_or(smallest_date())),
            last_played_duration: self.last_played_duration.map(pg_interval_to_f64).unwrap_or(0.),
        }
    }
}
pub struct DbPlayerMapPlayed{
    pub server_id: Option<String>,
    pub map: Option<String>,
    pub played: Option<PgInterval>
}
impl Into<PlayerMostPlayedMap> for DbPlayerMapPlayed{
    fn into(self) -> PlayerMostPlayedMap {
        PlayerMostPlayedMap{
            map: self.map.unwrap_or_default(),
            duration: self.played.map(pg_interval_to_f64).unwrap_or(0.),
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

pub struct DbPlayerRegionTime{
    pub region_id: Option<i16>,
    pub region_name: Option<String>,
    pub played_time: Option<PgInterval>,
}

impl Into<PlayerRegionTime> for DbPlayerRegionTime{
    fn into(self) -> PlayerRegionTime {
        PlayerRegionTime{
            id: self.region_id.unwrap_or(-1),
            name: self.region_name.unwrap_or("Unknown".into()),
            duration: self.played_time.map(pg_interval_to_f64).unwrap_or(0.),
        }
    }
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
    OffsetDateTime::new_in_offset(Date::MIN, Time::MIDNIGHT, UtcOffset::UTC)
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
pub struct DbPlayerTime{
    pub player_id: String,
    pub player_name: String,
    pub created_at: OffsetDateTime,
    pub played_time: Option<PgInterval>,
    pub total_players: Option<i64>
}


pub struct DbServerMapPlayed{
    pub total_sessions: Option<i32>,
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