use crate::routers::api_models::*;
use crate::utils::{db_to_utc, format_pg_time_tz, pg_interval_to_f64, smallest_date};
use crate::global_serializer::*;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_macros::{auto_serde_with};
use sqlx::{postgres::types::PgInterval, types::time::{OffsetDateTime}};
use sqlx::postgres::types::PgTimeTz;

#[derive(Serialize, Deserialize)]
#[allow(dead_code)]
pub struct DbServer{
    pub server_name: Option<String>,
    pub server_id: String,
    pub server_ip: Option<String>,
    pub server_port: Option<i32>,
    pub max_players: Option<i16>,
    pub server_fullname: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct DbServerCommunity{
    pub community_id: String,
    pub community_name: Option<String>,
    pub community_icon_url: Option<String>,
    pub server_id: Option<String>,
    pub server_name: Option<String>,
    pub server_port: Option<i32>,
    pub server_ip: Option<String>,
    pub max_players: Option<i16>,
    pub server_fullname: Option<String>,
    pub player_count: Option<i64>,
    pub online: Option<bool>,
}

impl Into<Server> for DbServerCommunity{
    fn into(self) -> Server{
        Server {
            name: self.server_name.unwrap_or("Unknown".into()),
            server_name:  self.server_fullname.unwrap_or("Unknown".into()),
            player_count: self.player_count.unwrap_or(0) as u16,
            id: self.server_id.unwrap_or("Unknown".into()),
            max_players: self.max_players.unwrap_or(0) as u16,
            ip: self.server_ip.unwrap_or("No IP".into()),
            port: self.server_port.unwrap_or(0) as u16,
            online: self.online.unwrap_or(false),
        }
    }
}

pub struct DbPlayerSitemap{
    pub player_id: Option<String>,
    pub recent_online: Option<OffsetDateTime>,
}

pub struct DbMapSitemap{
    pub map_name: Option<String>,
    pub last_played: Option<OffsetDateTime>,
}
#[auto_serde_with]
pub struct DbPlayerSession{
    pub player_id: String,
    pub session_id: String,
    pub server_id: String,
    pub started_at: OffsetDateTime,
    pub ended_at: Option<OffsetDateTime>,
}

impl Into<PlayerSession> for DbPlayerSession {
    fn into(self) -> PlayerSession {
        PlayerSession{
            id: self.session_id,
            player_id: self.player_id,
            server_id: self.server_id,
            started_at: db_to_utc(self.started_at),
            ended_at: self.ended_at.map(db_to_utc)
        }
    }
}
#[auto_serde_with]
pub struct DbPlayerSeen{
    pub player_id: String,
    pub player_name: String,
    pub total_time_together: Option<PgInterval>,
    pub last_seen: Option<OffsetDateTime>,
}
impl Into<PlayerSeen> for DbPlayerSeen{
    fn into(self) -> PlayerSeen {
        PlayerSeen{
            id: self.player_id,
            name: self.player_name,
            total_time_together: self.total_time_together.map(pg_interval_to_f64).unwrap_or(0.),
            last_seen: db_to_utc(self.last_seen.unwrap_or(smallest_date()))
        }
    }
}
#[allow(dead_code)]
#[auto_serde_with]
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
#[auto_serde_with]
pub struct DbMapLastPlayed{
    pub last_played: Option<OffsetDateTime>,
}
#[derive(Serialize, Deserialize)]
pub struct DbEvent{
    pub event_name: Option<String>,
    pub average: Option<f64>
}
impl Into<MapEventAverage> for DbEvent {
    fn into(self) -> MapEventAverage {
        MapEventAverage{
            event_name: self.event_name.unwrap_or("Unknown".to_string()),
            average: self.average.unwrap_or_default(),
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
#[auto_serde_with]
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
pub struct DbMapRegionDate {
    pub date: Option<OffsetDateTime>,
    pub region_name: Option<String>,
    pub total_play_duration: Option<PgInterval>
}
pub struct DbRegion{
    pub region_name: String,
    pub region_id: i64,
    pub start_time: PgTimeTz,
    pub end_time: PgTimeTz,
}

impl Into<Region> for DbRegion {
    fn into(self) -> Region {
        Region {
            region_name: self.region_name,
            region_id: self.region_id,
            start_time: format_pg_time_tz(&self.start_time),
            end_time: format_pg_time_tz(&self.end_time),
        }
    }
}

pub struct MapRegionDate{
    pub region_name: String,
    pub total_play_duration: f64,
    pub date: Option<DateTime<Utc>>
}
impl Into<MapRegionDate> for DbMapRegionDate {
    fn into(self) -> MapRegionDate {
        MapRegionDate{
            region_name: self.region_name.unwrap_or_default(),
            total_play_duration: self.total_play_duration.map(pg_interval_to_f64).unwrap_or(0.),
            date: self.date.map(db_to_utc)
        }
    }
}
impl Into<MapRegion> for MapRegionDate{
    fn into(self) -> MapRegion {
        MapRegion {
            region_name: self.region_name,
            total_play_duration: self.total_play_duration,
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
#[auto_serde_with]
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
#[auto_serde_with]
pub struct DbServerCountData{
	pub server_id: Option<String>,
    pub bucket_time: Option<OffsetDateTime>,
    pub player_count: Option<i64>
}

#[derive(Serialize, Deserialize)]
pub struct DbMapIsPlaying{
    pub result: Option<bool>
}

#[auto_serde_with]
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
#[auto_serde_with]
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
#[auto_serde_with]
#[allow(dead_code)]
pub struct DbServerMapPartial{
    pub map: String,
    pub total_playtime: Option<f64>,
    pub total_sessions: Option<i64>,
    pub last_played: Option<OffsetDateTime>
}
#[auto_serde_with]
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
    pub last_session_id: Option<i32>
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
            last_played_ended: self.last_played_ended.map(db_to_utc),
            last_session_id: self.last_session_id.unwrap_or_default(),
        }
    }
}
#[derive(Serialize, Deserialize)]
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
#[derive(Serialize, Deserialize)]
pub struct DbCountryStatistic{
    pub country_code: Option<String>,
    pub country_name: Option<String>,
    pub players_per_country: Option<i64>,
    pub total_players: Option<i64>,
}
impl Into<CountryStatistic> for DbCountryStatistic{
    fn into(self) -> CountryStatistic {
        CountryStatistic{
            code: self.country_code.unwrap_or(String::from("Unknown")),
            name: self.country_name.unwrap_or(String::from("Unknown")),
            count: self.players_per_country.unwrap_or(0),
        }
    }
}
#[auto_serde_with]
pub struct DbCountryPlayer{
    pub player_id: Option<String>,
    pub player_name: Option<String>,
    pub session_count: Option<i64>,
    pub location_country: Option<String>,
    pub total_playtime: Option<PgInterval>,
    pub total_player_count: Option<i64>,
}

impl Into<CountryPlayer> for DbCountryPlayer{
    fn into(self) -> CountryPlayer {
        CountryPlayer{
            id: self.player_id.unwrap_or(String::from("Unknown")),
            name: self.player_name.unwrap_or(String::from("Unknown")),
            total_playtime: self.total_playtime.map(pg_interval_to_f64).unwrap_or_default(),
            total_player_count: self.total_player_count.unwrap_or(0),
            session_count: self.session_count.unwrap_or(0),
        }
    }
}
#[derive(Serialize, Deserialize)]
pub struct DbCountryGeometry{
    pub country_name: Option<String>,
    pub geometry: Option<String>,
    pub country_code: Option<String>,
}
