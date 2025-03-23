use crate::routers::api_models::{
    DetailedPlayer, MapAnalyze, MapPlayed, MapRegion, MapSessionDistribution, PlayerAlias,
    PlayerBrief, PlayerInfraction, PlayerMostPlayedMap, PlayerRegionTime, PlayerSessionTime,
    SearchPlayer, ServerCountData, ServerMap, ServerMapPlayed
};
use crate::utils::pg_interval_to_f64;
use crate::global_serializer::*;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_macros::{auto_serde_with};
use sqlx::{postgres::types::PgInterval, types::time::{Date, OffsetDateTime, Time, UtcOffset}};

#[derive(Serialize, Deserialize)]
#[allow(dead_code)]
pub struct DbServer{
    pub server_name: Option<String>,
    pub server_id: String,
    pub server_ip: Option<String>
}

pub struct DbPlayerSitemap{
    pub player_id: Option<String>,
    pub recent_online: Option<OffsetDateTime>,
}

pub struct DbMapSitemap{
    pub map_name: Option<String>,
    pub last_played: Option<OffsetDateTime>,
}
#[allow(dead_code)]
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
#[derive(Clone)]
#[auto_serde_with]
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
impl Into<DbPlayerBrief> for DbPlayerDetail{
    fn into(self) -> DbPlayerBrief {
        DbPlayerBrief{
            player_id: self.player_id,
            player_name: self.player_name,
            created_at: self.created_at,
            total_playtime: self.total_playtime,
            total_players: Some(0),
            rank: self.rank,
            online_since: self.online_since,
            last_played: self.last_played,
            last_played_duration: self.last_played_duration,
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct DbMapSessionDistribution{
    pub session_range: Option<String>,
    pub session_count: Option<i64>,
}
impl Into<MapSessionDistribution> for DbMapSessionDistribution {
    fn into(self) -> MapSessionDistribution {
        MapSessionDistribution{
            session_range: self.session_range.unwrap_or_default(),
            session_count: self.session_count.unwrap_or_default(),
        }
    }
}
#[allow(dead_code)]
pub struct DbMapRegion {
    pub map: Option<String>,
    pub region_name: Option<String>,
    pub total_play_duration: Option<PgInterval>
}
impl Into<MapRegion> for DbMapRegion {
    fn into(self) -> MapRegion {
        MapRegion{
            region_name: self.region_name.unwrap_or("Unknown Region".to_string()),
            total_play_duration: self.total_play_duration.map(pg_interval_to_f64).unwrap_or(0.0),
        }
    }
}

#[auto_serde_with]
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
#[allow(dead_code)]
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
    pub flags: Option<i64>
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
#[allow(dead_code)]
pub struct DbServerMapPartial{
    pub map: String,
    pub total_playtime: Option<f64>,
    pub total_sessions: Option<i64>,
    pub last_played: Option<OffsetDateTime>
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
            ended_at: self.ended_at.map(db_to_utc),
            player_count: self.player_count,
            time_id: self.time_id,
            server_id: self.server_id,
            map: self.map.unwrap_or_default(),
        }
    }
}


#[auto_serde_with]
pub struct DbMapAnalyze{
    pub map: String,
    pub unique_players: Option<i64>,
    pub map_score: Option<f64>,
    pub total_playtime: Option<f64>,
    pub total_sessions: Option<i64>,
    pub last_played: Option<OffsetDateTime>,
    pub avg_playtime_before_quitting: Option<f64>,
    pub dropoff_rate: Option<f64>,
    pub avg_players_per_session: Option<f64>,
}

impl Into<MapAnalyze> for DbMapAnalyze{
    fn into(self) -> MapAnalyze {
        MapAnalyze{
            map: self.map,
            unique_players: self.unique_players.unwrap_or_default(),
            map_score: self.map_score.unwrap_or_default(),
            total_playtime: self.total_playtime.unwrap_or_default(),
            total_sessions: self.total_sessions.unwrap_or_default(),
            avg_playtime_before_quitting: self.avg_playtime_before_quitting.unwrap_or_default(),
            dropoff_rate: self.dropoff_rate.unwrap_or_default(),
            avg_players_per_session: self.avg_players_per_session.unwrap_or_default(),
            last_played: db_to_utc(self.last_played.unwrap_or(smallest_date()))
        }
    }
}
pub struct DbServerMap{
    pub total_maps: Option<i64>,
    #[allow(dead_code)]
    pub server_id: String,
    pub map: String,
    pub first_occurrance: OffsetDateTime,
    pub is_tryhard: Option<bool>,
    pub is_casual: Option<bool>,
    pub cleared_at: Option<OffsetDateTime>,
    pub total_time: Option<PgInterval>,
    pub total_sessions: Option<i64>,
    pub last_played: Option<OffsetDateTime>,
    pub last_played_ended: Option<OffsetDateTime>,
}

impl Into<MapPlayed> for DbServerMap{
    fn into(self) -> MapPlayed {
        MapPlayed {
            map: self.map,
            first_occurrance: db_to_utc(self.first_occurrance),
            is_tryhard: self.is_tryhard,
            is_casual: self.is_casual,
            cleared_at: self.cleared_at.map(db_to_utc),
            total_time: self.total_time.map(|e| pg_interval_to_f64(e)).unwrap_or_default(),
            total_sessions: self.total_sessions.unwrap_or_default() as i32,
            last_played: self.last_played.map(db_to_utc),
            last_played_ended: self.last_played_ended.map(db_to_utc)
        }
    }
}
pub struct DbMap{
    pub server_id: String,
    pub map: String
}
impl Into<ServerMap> for DbMap{
    fn into(self) -> ServerMap {
        ServerMap{
            map: self.map,
            server_id: self.server_id,
        }
    }
}