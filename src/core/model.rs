use crate::core::api_models::*;
use crate::core::utils::{db_to_utc, format_pg_time_tz, pg_interval_to_f64, smallest_date};
use crate::global_serializer::*;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_macros::auto_serde_with;
use sqlx::postgres::types::PgTimeTz;
use sqlx::{postgres::types::PgInterval, types::time::OffsetDateTime};
use std::fmt::{Display, Formatter};

#[derive(Serialize, Deserialize, Clone)]
#[allow(dead_code)]
pub struct DbServer{
    pub server_name: Option<String>,
    pub server_id: String,
    pub server_ip: Option<String>,
    pub server_port: Option<i32>,
    pub max_players: Option<i16>,
    pub server_fullname: Option<String>,
    pub readable_link: Option<String>,
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
    pub readable_link: Option<String>,
    pub server_website: Option<String>,
    pub server_discord_link: Option<String>,
    pub server_source: Option<String>,
    pub source_by_id: Option<bool>,
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
            readable_link: self.readable_link,
            website: self.server_website,
            discord_link: self.server_discord_link,
            source: self.server_source,
            by_id: self.source_by_id.unwrap_or(false),
        }
    }
}

pub struct DbPlayerSitemap{
    pub server_id: Option<String>,
    pub server_readable_link: Option<String>,
    pub player_id: Option<String>,
    pub recent_online: Option<OffsetDateTime>,
}

pub struct DbMapSitemap{
    pub server_id: Option<String>,
    pub server_readable_link: Option<String>,
    pub map_name: Option<String>,
    pub last_played: Option<OffsetDateTime>,
}

pub struct DbServerSitemap{
    pub server_id: Option<String>,
    pub readable_link: Option<String>,
}
#[derive(Clone)]
#[auto_serde_with]
pub struct DbPlayerSession{
    pub player_id: String,
    pub session_id: String,
    pub server_id: String,
    pub started_at: OffsetDateTime,
    pub ended_at: Option<OffsetDateTime>,
}
#[derive(Clone)]
#[auto_serde_with]
pub struct DbPlayerDetailSession{
    pub player_id: String,
    pub player_name: Option<String>,
    pub session_id: String,
    pub server_id: String,
    pub started_at: OffsetDateTime,
    pub ended_at: Option<OffsetDateTime>,
}
#[derive(Clone)]
#[auto_serde_with]
pub struct DbPlayerSessionPage{
    pub player_id: String,
    pub session_id: String,
    pub server_id: String,
    pub started_at: OffsetDateTime,
    pub ended_at: Option<OffsetDateTime>,
    pub total_rows: Option<i64>
}
impl Into<PlayerSession> for DbPlayerSessionPage{
    fn into(self) -> PlayerSession{
        PlayerSession{
            id: self.session_id,
            server_id: self.server_id,
            player_id: self.player_id,
            started_at: db_to_utc(self.started_at),
            ended_at: self.ended_at.map(db_to_utc),
        }
    }
}
impl Into<PlayerDetailSession> for DbPlayerDetailSession{
    fn into(self) -> PlayerDetailSession{
        PlayerDetailSession{
            id: self.player_id,
            session_id: self.session_id,
            name: self.player_name.unwrap_or("Unknown".into()),
            started_at: db_to_utc(self.started_at),
            ended_at: self.ended_at.map(db_to_utc),
        }
    }
}
#[derive(Serialize, Deserialize)]
pub struct DbPlayerWithLegacyRanks {
    pub steamid64: Option<String>,
    pub points: Option<f64>,
    pub human_time: Option<i64>,
    pub zombie_time: Option<i64>,
    pub zombie_killed: Option<i32>,
    pub headshot: Option<i32>,
    pub infected_time: Option<i32>,
    pub item_usage: Option<i32>,
    pub boss_killed: Option<i32>,
    pub leader_count: Option<i32>,
    pub td_count: Option<i32>,
    pub rank_total_playtime: Option<i64>,
    pub rank_points: Option<i64>,
    pub rank_human_time: Option<i64>,
    pub rank_zombie_time: Option<i64>,
    pub rank_zombie_killed: Option<i64>,
    pub rank_headshot: Option<i64>,
    pub rank_infected_time: Option<i64>,
    pub rank_item_usage: Option<i64>,
    pub rank_boss_killed: Option<i64>,
    pub rank_leader_count: Option<i64>,
    pub rank_td_count: Option<i64>,
}

impl Into<PlayerWithLegacyRanks> for DbPlayerWithLegacyRanks {
    fn into(self) -> PlayerWithLegacyRanks {
        PlayerWithLegacyRanks {
            steamid64: self.steamid64.unwrap_or("Invalid SteamID64".into()),
            points: self.points.unwrap_or_default(),
            human_time: self.human_time.unwrap_or_default(),
            zombie_time: self.zombie_time.unwrap_or_default(),
            zombie_killed: self.zombie_killed.unwrap_or_default(),
            headshot: self.headshot.unwrap_or_default(),
            infected_time: self.infected_time.unwrap_or_default(),
            item_usage: self.item_usage.unwrap_or_default(),
            boss_killed: self.boss_killed.unwrap_or_default(),
            leader_count: self.leader_count.unwrap_or_default(),
            td_count: self.td_count.unwrap_or_default(),
            rank_total_playtime: self.rank_total_playtime.unwrap_or_default(),
            rank_points: self.rank_points.unwrap_or_default(),
            rank_human_time: self.rank_human_time.unwrap_or_default(),
            rank_zombie_time: self.rank_zombie_time.unwrap_or_default(),
            rank_zombie_killed: self.rank_zombie_killed.unwrap_or_default(),
            rank_headshot: self.rank_headshot.unwrap_or_default(),
            rank_infected_time: self.rank_infected_time.unwrap_or_default(),
            rank_item_usage: self.rank_item_usage.unwrap_or_default(),
            rank_boss_killed: self.rank_boss_killed.unwrap_or_default(),
            rank_leader_count: self.rank_leader_count.unwrap_or_default(),
            rank_td_count: self.rank_td_count.unwrap_or_default(),
        }
    }
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
#[derive(Clone)]
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
#[derive(Clone)]
#[auto_serde_with]
pub struct DbPlayer{
    pub player_id: String,
    pub player_name: String,
    pub created_at: OffsetDateTime,
    pub associated_player_id: Option<String>
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
    pub rank: Option<i32>,
    pub online_since: Option<OffsetDateTime>,
    pub last_played: Option<OffsetDateTime>,
    pub last_played_duration: Option<PgInterval>,
    pub associated_player_id: Option<String>
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
#[derive(Serialize, Deserialize, Clone)]
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
#[derive(Serialize, Deserialize, Clone)]
pub struct DbMapSessionDistribution{
    pub session_range: String,
    pub session_count: i32,
}
impl Into<MapSessionDistribution> for DbMapSessionDistribution {
    fn into(self) -> MapSessionDistribution {
        MapSessionDistribution{
            session_range: self.session_range,
            session_count: self.session_count as i64,
        }
    }
}
#[derive(Clone)]
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
#[derive(Clone)]
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
#[derive(Clone)]
#[auto_serde_with]
pub struct DbPlayerRank{
    pub global_playtime: Option<i64>,
    pub total_playtime: Option<i64>,
    pub casual_playtime: Option<i64>,
    pub tryhard_playtime: Option<i64>,
}
impl Into<PlayerRanks> for DbPlayerRank {
    fn into(self) -> PlayerRanks {
        PlayerRanks {
            global_playtime: self.global_playtime.unwrap_or_default(),
            server_playtime: self.total_playtime.unwrap_or_default(),
            tryhard_playtime: self.tryhard_playtime.unwrap_or_default(),
            casual_playtime: self.casual_playtime.unwrap_or_default(),
            highest_map_rank: None
        }
    }
}
#[derive(Clone)]
#[auto_serde_with]
pub struct DbMapRank{
    pub map: Option<String>,
    pub rank: Option<i64>,
    pub total_playtime: Option<PgInterval>,
}

impl Into<MapRank> for DbMapRank {
    fn into(self) -> MapRank {
        MapRank {
            rank: self.rank.unwrap_or_default(),
            map: self.map.unwrap_or_default(),
            total_playtime: self.total_playtime.map(pg_interval_to_f64).unwrap_or(0.)
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
#[derive(Clone)]
#[auto_serde_with]
pub struct DbPlayerTable{
    pub ranked: Option<i64>,
    pub player_id: String,
    pub player_name: Option<String>,
    pub total_playtime: PgInterval,
    pub casual_playtime: PgInterval,
    pub tryhard_playtime: PgInterval,
    pub total_players: Option<i64>,
}
impl Into<PlayerTableRank> for DbPlayerTable{
    fn into(self) -> PlayerTableRank {
        PlayerTableRank {
            rank: self.ranked.unwrap_or(-1),
            id: self.player_id,
            name: self.player_name.unwrap_or("Unknown Player".to_string()),
            tryhard_playtime: pg_interval_to_f64(self.tryhard_playtime),
            casual_playtime: pg_interval_to_f64(self.casual_playtime),
            total_playtime: pg_interval_to_f64(self.total_playtime),
        }
    }
}
#[derive(Clone)]
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

#[derive(Clone)]
#[auto_serde_with]
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
            aliases: vec![],
            rank: self.rank.unwrap_or(-1) as i64,
            associated_player_id: self.associated_player_id,
            ranks: None,
        }
    }
}
#[derive(Clone)]
#[auto_serde_with]
pub struct DbAnnouncement{
    pub id: String,
    pub text: String,
    pub created_at: OffsetDateTime,
}
impl Into<Announcement> for DbAnnouncement{
    fn into(self) -> Announcement {
        Announcement{
            id: self.id,
            text: self.text,
            created_at: db_to_utc(self.created_at),
        }
    }
}

#[derive(Clone)]
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
            rank: 0,
        }
    }
}
pub struct DbPlayerInfraction{
    pub infraction_id: String,
    pub source: String,
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
            source: self.source,
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

#[derive(Clone)]
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
#[derive(Clone)]
#[auto_serde_with]
#[allow(dead_code)]
pub struct DbServerMapPartial{
    pub map: String,
    pub total_playtime: Option<PgInterval>,
    pub total_sessions: Option<i64>,
    pub last_played: Option<OffsetDateTime>
}
#[derive(Clone)]
#[auto_serde_with]
pub struct DbPlayerSessionMapPlayed{
    pub time_id: i32,
    pub server_id: String,
    pub map: String,
    pub player_count: i32,
    pub started_at: OffsetDateTime,
    pub ended_at: Option<OffsetDateTime>,
    pub zombie_score: Option<i16>,
    pub human_score: Option<i16>,
    pub occurred_at: Option<OffsetDateTime>,
    pub extend_count: Option<i16>,
}
impl DbPlayerSessionMapPlayed{
    pub fn is_match_empty(&self) -> bool{
        self.zombie_score.is_none() || self.human_score.is_none()
    }
}
impl Into<PlayerSessionMapPlayed> for DbPlayerSessionMapPlayed{
    fn into(self) -> PlayerSessionMapPlayed{
        PlayerSessionMapPlayed{
            time_id: self.time_id,
            server_id: self.server_id,
            map: self.map,
            player_count: self.player_count,
            started_at: db_to_utc(self.started_at),
            ended_at: self.ended_at.map(db_to_utc),
            match_data: vec![],
        }
    }
}
impl Into<MatchData> for DbPlayerSessionMapPlayed{
    fn into(self) -> MatchData{
        MatchData{
            zombie_score: self.zombie_score.unwrap_or_default(),
            human_score: self.human_score.unwrap_or_default(),
            occurred_at: db_to_utc(self.occurred_at.unwrap_or(smallest_date())),
            extend_count: self.extend_count.unwrap_or_default(),
        }
    }
}
#[auto_serde_with]
pub struct DbPlayersStatistic{
    pub total_cum_playtime: Option<PgInterval>,
    pub total_players: Option<i64>,
    pub countries: Option<i64>
}
impl Into<PlayersStatistic> for DbPlayersStatistic{
    fn into(self) -> PlayersStatistic{
        PlayersStatistic{
            total_cum_playtime: self.total_cum_playtime.map(pg_interval_to_f64).unwrap_or_default(),
            total_players: self.total_players.unwrap_or_default(),
            countries: self.countries.unwrap_or_default(),
        }
    }
}
#[derive(Clone)]
#[auto_serde_with]
pub struct DbServerMatch{
    pub time_id: i32,
    pub server_id: String,
    pub map: String,
    pub started_at: OffsetDateTime,
    pub player_count: Option<i64>,
    pub zombie_score: Option<i16>,
    pub human_score: Option<i16>,
    pub occurred_at: Option<OffsetDateTime>,
    pub estimated_time_end: Option<OffsetDateTime>,
    pub server_time_end: Option<OffsetDateTime>,
    pub extend_count: Option<i16>,
}
impl Into<ServerMapMatch> for DbServerMatch{
    fn into(self) -> ServerMapMatch {
        ServerMapMatch{
            time_id: self.time_id,
            server_id: self.server_id,
            map: self.map,
            player_count: self.player_count.unwrap_or_default() as i16,
            started_at: db_to_utc(self.started_at),
            zombie_score: self.zombie_score,
            human_score: self.human_score,
            occurred_at: self.occurred_at.map(db_to_utc),
            estimated_time_end: self.estimated_time_end.map(db_to_utc),
            server_time_end: self.server_time_end.map(db_to_utc),
            extend_count: self.extend_count,
        }
    }
}
#[derive(Clone)]
#[auto_serde_with]
pub struct DbServerSessionMatch{
    pub time_id: Option<i32>,
    pub server_id: Option<String>,
    pub zombie_score: Option<i16>,
    pub human_score: Option<i16>,
    pub occurred_at: Option<OffsetDateTime>
}
impl Into<MapSessionMatch> for DbServerSessionMatch{
    fn into(self) -> MapSessionMatch {
        MapSessionMatch{
            time_id: self.time_id.unwrap_or(-1),
            server_id: self.server_id.unwrap_or("Unknown".into()),
            zombie_score: self.zombie_score.unwrap_or_default(),
            human_score: self.human_score.unwrap_or_default(),
            occurred_at: db_to_utc(self.occurred_at.unwrap_or(smallest_date())),
        }
    }
}
#[derive(Clone)]
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

#[derive(Clone)]
#[auto_serde_with]
pub struct DbMapAnalyze{
    pub map: String,
    pub unique_players: i64,
    pub cum_player_hours: Option<PgInterval>,
    pub total_playtime: Option<PgInterval>,
    pub total_sessions: i32,
    pub last_played: Option<OffsetDateTime>,
    pub last_played_ended: Option<OffsetDateTime>,
    pub avg_playtime_before_quitting: Option<PgInterval>,
    pub dropoff_rate: Option<f64>,
    pub avg_players_per_session: Option<f64>,
}

impl Into<MapAnalyze> for DbMapAnalyze{
    fn into(self) -> MapAnalyze {
        MapAnalyze{
            map: self.map,
            unique_players: self.unique_players,
            cum_player_hours: self.cum_player_hours.map(pg_interval_to_f64).unwrap_or_default(),
            total_playtime: self.total_playtime.map(pg_interval_to_f64).unwrap_or_default(),
            total_sessions: self.total_sessions as i64,
            avg_playtime_before_quitting: self.avg_playtime_before_quitting.map(pg_interval_to_f64).unwrap_or_default(),
            dropoff_rate: self.dropoff_rate.unwrap_or_default(),
            avg_players_per_session: self.avg_players_per_session.unwrap_or_default(),
            last_played: db_to_utc(self.last_played.unwrap_or(smallest_date())),
            last_played_ended: self.last_played_ended.map(db_to_utc),
        }
    }
}

#[derive(Clone, Serialize, Deserialize)]
pub struct DbMapMeta{
    pub name: String,
    pub image_url: Option<String>,
    pub creators: Option<String>,
    pub workshop_id: i64,
    pub file_bytes: Option<i64>,
}
pub struct DbMapBriefInfo{
    pub name: String,
    pub is_tryhard: Option<bool>,
    pub is_casual: Option<bool>,
    #[allow(dead_code)]
    pub first_occurrence: OffsetDateTime,
}

#[derive(Clone)]
#[auto_serde_with]
pub struct DbMapPlayerTypeTime{
    pub category: Option<String>,
    pub time_spent: Option<PgInterval>
}

impl Into<MapPlayerTypeTime> for DbMapPlayerTypeTime{
    fn into(self) -> MapPlayerTypeTime {
        MapPlayerTypeTime {
            category: self.category.unwrap_or("Unknown".into()),
            time_spent: self.time_spent.map(pg_interval_to_f64).unwrap_or_default()
        }
    }
}
#[derive(Clone)]
#[auto_serde_with]
pub struct DbMapInfo{
    pub name: String,
    pub first_occurrence: OffsetDateTime,
    pub cleared_at: Option<OffsetDateTime>,
    pub is_tryhard: Option<bool>,
    pub is_casual: Option<bool>,
    pub current_cooldown: Option<OffsetDateTime>,
    pub pending_cooldown: Option<bool>,
    pub no_noms: bool,
    pub workshop_id: Option<i64>,
    pub resolved_workshop_id: Option<i64>,
    pub enabled: bool,
    pub min_players: Option<i16>,
    pub max_players: Option<i16>,
}

impl Into<MapInfo> for DbMapInfo{
    fn into(self) -> MapInfo {
        MapInfo {
            name: self.name,
            first_occurrence: db_to_utc(self.first_occurrence),
            cleared_at: self.cleared_at.map(db_to_utc),
            is_tryhard: self.is_tryhard.unwrap_or_default(),
            is_casual: self.is_casual.unwrap_or_default(),
            current_cooldown: self.current_cooldown.map(db_to_utc),
            pending_cooldown: self.pending_cooldown.unwrap_or_default(),
            no_noms: self.no_noms,
            enabled: self.enabled,
            min_players: self.min_players.unwrap_or_default(),
            max_players: self.max_players.unwrap_or_default(),
            workshop_id: self.workshop_id.unwrap_or(0),
            creators: None,
            file_bytes: None,
        }
    }
}
pub struct DbServerMap{
    pub total_maps: Option<i64>,
    #[allow(dead_code)]
    pub server_id: String,
    pub map: String,
    pub first_occurrence: OffsetDateTime,
    pub cooldown: Option<OffsetDateTime>,
    pub pending_cooldown: Option<bool>,
    pub enabled: Option<bool>,
    pub is_tryhard: Option<bool>,
    pub is_casual: Option<bool>,
    pub is_favorite: Option<bool>,
    pub cleared_at: Option<OffsetDateTime>,
    pub total_time: Option<PgInterval>,
    pub total_sessions: Option<i32>,
    pub unique_players: Option<i32>,
    pub last_played: Option<OffsetDateTime>,
    pub last_played_ended: Option<OffsetDateTime>,
    pub last_session_id: Option<i32>,
    pub cum_player_hours: Option<PgInterval>,
}

impl Into<MapPlayed> for DbServerMap{
    fn into(self) -> MapPlayed {
        MapPlayed {
            map: self.map,
            first_occurrence: db_to_utc(self.first_occurrence),
            cooldown: self.cooldown.map(db_to_utc),
            pending_cooldown: self.pending_cooldown.unwrap_or_default(),
            enabled: self.enabled.unwrap_or_default(),
            is_tryhard: self.is_tryhard,
            is_casual: self.is_casual,
            is_favorite: self.is_favorite,
            cleared_at: self.cleared_at.map(db_to_utc),
            total_time: self.total_time.map(|e| pg_interval_to_f64(e)).unwrap_or_default(),
            total_sessions: self.total_sessions.unwrap_or_default(),
            last_played: self.last_played.map(db_to_utc),
            last_played_ended: self.last_played_ended.map(db_to_utc),
            last_session_id: self.last_session_id.unwrap_or_default(),
            unique_players: self.unique_players.unwrap_or_default(),
            total_cum_time: self.cum_player_hours.map(pg_interval_to_f64).unwrap_or_default(),
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
#[derive(Serialize, Deserialize)]
pub struct DbContinentStatistic{
    pub continent: Option<String>,
    pub players_per_continent: Option<i64>,
    pub total_players: Option<i64>,
}
impl Into<ContinentStatistic> for DbContinentStatistic{
    fn into(self) -> ContinentStatistic {
        ContinentStatistic{
            name: self.continent.unwrap_or(String::from("Unknown")),
            count: self.players_per_continent.unwrap_or(0),
        }
    }
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

#[derive(Serialize, Deserialize, Clone)]
pub struct DbPlayerHourCount{
    pub hours: Option<i32>,
    pub join_counted: Option<i64>,
    pub leave_counted: Option<i64>,
}

impl Into<(PlayerHourDay, PlayerHourDay)> for DbPlayerHourCount{
    fn into(self) -> (PlayerHourDay, PlayerHourDay) {
        let join = PlayerHourDay{
            event_type: EventType::Join,
            hour: self.hours.unwrap_or_default() as u8,
            count: self.join_counted.unwrap_or(0),
        };
        let leave = PlayerHourDay{
            event_type: EventType::Leave,
            hour: self.hours.unwrap_or_default() as u8,
            count: self.leave_counted.unwrap_or(0),
        };
        (join, leave)
    }
}

pub struct DbUser{
    pub user_id: i64,
    pub display_name: Option<String>,
    pub avatar: Option<String>,
}


pub struct DbSteam{
    pub user_id: i64,
    pub community_visibility_state: CommunityVisibilityState,
    pub profile_state: i64,
    pub persona_name: String,
    pub profile_url: String,
    pub avatar: String,
    pub avatar_medium: String,
    pub avatar_full: String,
    pub avatar_hash: String,
    pub last_log_off: i64,
    pub persona_state: PersonaState,
    pub primary_clan_id: String,
    pub time_created: i64,
    pub persona_state_flags: i64,
    pub comment_permission: bool,
}

impl Into<SteamProfile> for DbSteam{
    fn into(self) -> SteamProfile {
        SteamProfile{
            steamid: self.user_id.to_string(),
            communityvisibilitystate: i32::try_from(self.community_visibility_state).unwrap_or_default() as i64,
            commentpermission: Some(if self.comment_permission { 1 } else { 0 }),
            profilestate: self.profile_state as i32,
            personaname: self.persona_name,
            profileurl: self.profile_url,
            avatar: self.avatar,
            avatarmedium: self.avatar_medium,
            avatarfull: self.avatar_full,
            avatarhash: self.avatar_hash,
            lastlogoff: if self.last_log_off == -1 { None } else { Some(self.last_log_off) },
            personastate: i32::try_from(self.persona_state).unwrap_or_default() as i64,
            primaryclanid: Some(self.primary_clan_id),
            timecreated: Some(self.time_created),
            personastateflags: self.persona_state_flags as i32,
            loccountrycode: Some("".to_string()),
        }
    }
}

#[derive(Clone, Debug, PartialEq, PartialOrd, sqlx::Type, Deserialize, Serialize)]
#[sqlx(type_name = "community_visibility_state_enum")]
pub enum CommunityVisibilityState {
    Private,
    Public
}
impl TryFrom<i32> for CommunityVisibilityState {
    type Error = &'static str;

    fn try_from(value: i32) -> Result<Self, Self::Error> {
        match value {
            1 => Ok(CommunityVisibilityState::Private),
            3 => Ok(CommunityVisibilityState::Public),
            _ => Err("Invalid CommunityVisibilityState value"),
        }
    }
}
impl Into<i32> for CommunityVisibilityState {

    fn into(self) -> i32 {
        match self {
            CommunityVisibilityState::Private => 1i32,
            CommunityVisibilityState::Public => 3i32
        }
    }
}
impl Display for CommunityVisibilityState {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            CommunityVisibilityState::Private => f.write_str("Private"),
            CommunityVisibilityState::Public => f.write_str("Public")
        }
    }
}
#[derive(Clone, Debug, PartialEq, PartialOrd, sqlx::Type, Deserialize, Serialize)]
#[sqlx(type_name = "persona_state_enum")]
pub enum PersonaState{
    Offline,
    Online,
    Busy,
    Away,
    Snooze,
    LookingToTrade,
    LookingToPlay,
}
impl TryFrom<i32> for PersonaState {
    type Error = &'static str;

    fn try_from(value: i32) -> Result<Self, Self::Error> {
        match value {
            0 => Ok(PersonaState::Offline),
            1 => Ok(PersonaState::Online),
            2 => Ok(PersonaState::Busy),
            3 => Ok(PersonaState::Away),
            4 => Ok(PersonaState::Snooze),
            5 => Ok(PersonaState::LookingToTrade),
            6 => Ok(PersonaState::LookingToPlay),
            _ => Err("Invalid PersonaState value"),
        }
    }
}

impl Into<i32> for PersonaState {

    fn into(self) -> i32 {
        match self {
            PersonaState::Offline => 0i32,
            PersonaState::Online => 1i32,
            PersonaState::Busy => 2i32,
            PersonaState::Away => 3i32,
            PersonaState::Snooze => 4i32,
            PersonaState::LookingToTrade => 5i32,
            PersonaState::LookingToPlay => 6i32,
        }
    }
}
impl Display for PersonaState{
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            PersonaState::Offline => f.write_str("Offline"),
            PersonaState::Online => f.write_str("Online"),
            PersonaState::Busy => f.write_str("Busy"),
            PersonaState::Away => f.write_str("Away"),
            PersonaState::Snooze => f.write_str("Snooze"),
            PersonaState::LookingToTrade => f.write_str("LookingToTrade"),
            PersonaState::LookingToPlay => f.write_str("LookingToPlay"),
        }
    }
}


impl Into<User> for DbUser{
    fn into(self) -> User {
        User{
            id: self.user_id.to_string(),
            global_name: self.display_name.unwrap_or(String::from("Unknown")),
            avatar: self.avatar,
        }
    }
}