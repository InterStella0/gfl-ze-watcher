use std::collections::HashMap;
use std::fmt::Display;
use std::ops::Add;
use chrono::{DateTime, TimeDelta, TimeZone, Utc};
use poem::web::Data;
use poem_openapi::{param::{Path, Query}, Enum, Object, OpenApi};
use serde::{Deserialize, Deserializer};
use futures::future::join_all;
use poem::http::StatusCode;
use sqlx::{Pool, Postgres};
use tokio::task;
use crate::core::model::{DbCountryStatistic, DbPlayer, DbPlayerDetailSession, DbPlayerSession, DbPlayerSessionMapPlayed, DbPlayerSessionPage, DbPlayerTable, DbPlayerWithLegacyRanks, DbPlayersStatistic, DbServer};
use crate::core::api_models::{CountryStatistic, DetailedPlayer, ErrorCode, MatchData, PlayerDetailSession, PlayerHourDay, PlayerInfraction, PlayerInfractionUpdate, PlayerMostPlayedMap, PlayerProfilePicture, PlayerRegionTime, PlayerSeen, PlayerSession, PlayerSessionMapPlayed, PlayerSessionPage, PlayerSessionTime, PlayerWithLegacyRanks, PlayersStatistic, PlayersTableRanked, Response, RoutePattern, SearchPlayer, ServerExtractor, UriPatternExt};
use crate::{response, AppData, FastCache};
use crate::core::model::DbPlayerInfraction;
use crate::core::utils::{CacheKey, ChronoToTime, IterConvert};
use crate::core::utils::{cached_response, get_profile, get_server, DAY};
use crate::core::workers::{PlayerContext, WorkError};

pub struct PlayerApi;

pub const PLAYER_DEFAULT_KEY: &str = "first-time";

#[derive(Deserialize)]
#[allow(dead_code)]
pub struct PlayerInfractionUpdateData {
    pub id: String,
    pub admin: i64,
    pub reason: Option<String>,
    #[serde(rename = "created", deserialize_with = "timestamp_to_datetime")]
    pub infraction_time: Option<DateTime<Utc>>,
    pub flags: i64
}
pub struct InfractionCombined{
    pub new_infraction: Option<PlayerInfractionUpdateData>,
    pub old_infraction: PlayerInfraction
}
impl Into<PlayerInfraction> for InfractionCombined {
    fn into(self) -> PlayerInfraction {
        let Some(new_infraction) = self.new_infraction else {
            return self.old_infraction
        };
        PlayerInfraction{
            id: new_infraction.id,
            by: self.old_infraction.by,
            reason: new_infraction.reason,
            infraction_time: new_infraction.infraction_time,
            flags: new_infraction.flags,
            admin_avatar: self.old_infraction.admin_avatar,
        }
    }
}

fn timestamp_to_datetime<'de, D>(deserializer: D) -> Result<Option<DateTime<Utc>>, D::Error>
where
    D: Deserializer<'de>,
{
    let timestamp = Option::<i64>::deserialize(deserializer)?;
    Ok(timestamp.and_then(|ts| DateTime::from_timestamp(ts, 0)))
}

async fn fetch_infraction(id: &str) -> Result<PlayerInfractionUpdateData, reqwest::Error> {
    let url = format!("https://bans.gflclan.com/api/infractions/{}/info", id);
    let response = reqwest::get(url).await?.json().await?;
    Ok(response)
}
#[derive(Enum)]
enum PlayerTableMode{
    Casual,
    TryHard,
    Total
}
impl Display for PlayerTableMode{
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let value = match self {
            PlayerTableMode::Casual => "casual",
            PlayerTableMode::TryHard => "tryhard",
            PlayerTableMode::Total => "total",
        };
        write!(f, "{value}")
    }
}

struct PlayerExtractor{
    server: DbServer,
    player: DbPlayer,
    key: CacheKey
}
impl From<PlayerExtractor> for PlayerContext {
    fn from(extract: PlayerExtractor) -> Self {
        PlayerContext {
            player: extract.player,
            server: extract.server,
            cache_key: extract.key,
        }
    }
}
async fn get_player_cache_key(pool: &Pool<Postgres>, cache: &FastCache, server_id: &str, player_id: &str) -> CacheKey {
    let func = || sqlx::query_as!(DbPlayerSession,
            "SELECT player_id, server_id, session_id, started_at, ended_at
             FROM player_server_session
             WHERE server_id=$1
             AND player_id=$2
             AND ended_at IS NOT NULL
             ORDER BY started_at DESC
             LIMIT 2
            ",
            server_id,
            player_id
        ).fetch_all(pool);

    let key = format!("player-last-played-new:{server_id}:{player_id}");
    let Ok(result) = cached_response(&key, &cache, 2 * 60, func).await else {
        return CacheKey {
            current: String::from(PLAYER_DEFAULT_KEY),
            previous: None
        };
    };
    let current = result.result.first()
        .and_then(|e| Some(e.session_id.clone()));
    let previous = result.result.get(1)
        .and_then(|e| Some(e.session_id.clone()));

    CacheKey {
        current: current.unwrap_or(String::from(PLAYER_DEFAULT_KEY)),
        previous
    }
}
async fn get_player(pool: &Pool<Postgres>, cache: &FastCache, player_id: &str) -> Option<DbPlayer>{
    let func = || sqlx::query_as!(DbPlayer,
            "SELECT player_id, player_name, created_at, associated_player_id
             FROM player
             WHERE player_id=$1
             LIMIT 1
            ",
            player_id.to_string()
        ).fetch_one(pool);

    let key = format!("player-data:{player_id}");
    match cached_response(&key, cache, 120 * DAY, func).await {
        Ok(r) => Some(r.result),
        Err(e) => {
            tracing::warn!("Failed to fetch player's data {}", e);
            None
        }
    }

}

impl PlayerExtractor {
    pub async fn new(app_data: &AppData, server: DbServer, player: DbPlayer) -> Self {
        let pool = &app_data.pool;
        let cache = &app_data.cache;
        let key = get_player_cache_key(pool, cache, &server.server_id, &player.player_id).await;
        Self{ server, player, key }
    }

}

impl<'a> poem::FromRequest<'a> for PlayerExtractor {
    async fn from_request(req: &'a poem::Request, _body: &mut poem::RequestBody) -> poem::Result<Self> {
        let server_id = req.raw_path_param("server_id")
            .ok_or_else(|| poem::Error::from_string("Invalid server_id", StatusCode::BAD_REQUEST))?;

        let player_id = req.raw_path_param("player_id")
            .ok_or_else(|| poem::Error::from_string("Invalid player_id", StatusCode::BAD_REQUEST))?;

        let data: &AppData = req.data()
            .ok_or_else(|| poem::Error::from_string("Invalid data", StatusCode::BAD_REQUEST))?;

        let Some(player) = get_player(&data.pool, &data.cache, &player_id).await else {
            return Err(poem::Error::from_string("Player not found", StatusCode::NOT_FOUND))
        };

        let Some(server) = get_server(&data.pool, &data.cache, &server_id).await else {
            return Err(poem::Error::from_string("Server not found", StatusCode::NOT_FOUND))
        };

        Ok(PlayerExtractor::new(data, server, player).await)
    }
}
#[derive(Object)]
struct ServerPlayersStatistic{
    all_time: PlayersStatistic,
    week1: PlayersStatistic,
}
#[derive(Object)]
struct ServerCountriesStatistics{
    countries: Vec<CountryStatistic>
}

#[OpenApi]
impl PlayerApi{
    #[oai(path="/servers/:server_id/players/countries", method="get")]
    async fn get_players_stats_countries(
        &self, Data(app): Data<&AppData>, ServerExtractor(server): ServerExtractor
    ) -> Response<ServerCountriesStatistics>{
        let func = || sqlx::query_as!(DbCountryStatistic, "
            WITH deduplicated_countries AS (
                SELECT
                    \"ISO_A2_EH\" AS country_code,
                    MIN(\"NAME\") AS country_name
                FROM layers.countries_fixed
                GROUP BY \"ISO_A2_EH\"
            ), countries_counted AS (
                SELECT
                    location_code->>'country' as country,
                    COUNT(*) as player_count
                FROM player p
                WHERE location_code IS NOT NULL
                    AND EXISTS (
                        SELECT 1
                        FROM player_server_session pss
                        WHERE pss.player_id = p.player_id
                            AND pss.server_id = $1
                    )
                GROUP BY location_code->>'country'
            )
            SELECT
                country AS country_code,
                dc.country_name country_name,
                player_count AS players_per_country,
                0::bigint total_players
            FROM countries_counted
            JOIN deduplicated_countries dc
            ON country_code=country
            ORDER BY players_per_country DESC
        ", server.server_id).fetch_all(&*app.pool);

        let key = format!("players_statistics_countries:{}", server.server_id);
        let Ok(result) = cached_response(&key, &*app.cache, DAY, func).await else {
            return response!(ok ServerCountriesStatistics{
                countries: vec![]
            })
        };

        response!(ok ServerCountriesStatistics{
            countries: result.result.iter_into()
        })
    }
    #[oai(path="/servers/:server_id/players/stats", method="get")]
    async fn get_players_stats(
        &self, Data(app): Data<&AppData>, ServerExtractor(server): ServerExtractor
    ) -> Response<ServerPlayersStatistic>{
        let cache = app.cache.clone();
        let calculate = async |all_time: bool| {
            let func = || sqlx::query_as!(DbPlayersStatistic, "
                SELECT
                    SUM(COALESCE(pss.ended_at, CURRENT_TIMESTAMP) - pss.started_at) as total_cum_playtime,
                    COUNT(DISTINCT pss.player_id) as total_players,
                    COUNT(DISTINCT p.location_code->>'country') as countries
                FROM player_server_session pss
                LEFT JOIN player p ON p.player_id = pss.player_id AND p.location_code IS NOT NULL
                WHERE pss.server_id = $1 AND ($2 OR pss.started_at > (CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int)::timestamp)
                LIMIT 1
            ", server.server_id, all_time).fetch_one(&*app.pool);
            let key = format!("players_statistics:{}:{}", server.server_id, all_time);
            cached_response(&key, &*cache, DAY, func).await
        };

        let default_value = PlayersStatistic {
            total_cum_playtime: 0.0,
            total_players: 0,
            countries: 0,
        };
        let all_time: Option<PlayersStatistic> = match calculate(true).await{
            Ok(e) => Some(e.result.into()),
            Err(_) => None
        };
        let week1: Option<PlayersStatistic> = match calculate(false).await{
            Ok(e) => Some(e.result.into()),
            Err(_) => None
        };
        let stats = ServerPlayersStatistic{
            all_time: all_time.unwrap_or(default_value.clone()),
            week1: week1.unwrap_or(default_value)
        };

        response!(ok stats)
    }
    #[oai(path = "/servers/:server_id/players/autocomplete", method = "get")]
    async fn get_players_autocomplete(
        &self, data: Data<&AppData>, ServerExtractor(server): ServerExtractor, Query(player_name): Query<String>
    ) -> Response<Vec<SearchPlayer>>{
        let Ok(result) = sqlx::query_as!(DbPlayer, "
            SELECT a.player_id, player_name, created_at, associated_player_id
            FROM (
                SELECT *,
                       CASE WHEN player_id = $2 THEN 0 ELSE 1 END AS id_rank,
                       NULLIF(STRPOS(LOWER(player_name), LOWER($2)), 0) AS name_rank
                FROM player
                WHERE player_id = $2 OR player_name ILIKE '%' || $1 || '%'
            ) a
            WHERE EXISTS (
                SELECT 1
                FROM player_server_session pss
                WHERE pss.player_id = a.player_id
                  AND pss.server_id = $3
            )
            ORDER BY id_rank ASC, name_rank ASC NULLS LAST
            LIMIT 20;
        ", format!("%{}%", player_name.to_lowercase()), player_name, server.server_id
        ).fetch_all(&*data.pool.clone()).await else {
            return response!(ok vec![])
        };
        response!(ok result.iter_into())
    }
    #[oai(path = "/servers/:server_id/players/table", method = "get")]
    async fn get_players_table(
        &self, data: Data<&AppData>, ServerExtractor(server): ServerExtractor,
        Query(player_name): Query<Option<String>>, Query(page): Query<usize>, Query(mode): Query<PlayerTableMode>
    ) -> Response<PlayersTableRanked>{
        let pagination = 5;
        let paging = page as i64 * pagination;
        let result = match player_name {
            Some(player_name) => {
                let player_name = player_name.trim();
                if player_name.is_empty() || player_name.len() < 2{
                    return response!(ok PlayersTableRanked{ players: vec![], total_players: 0 })
                }
                let player_name = format!("%{player_name}%");
                sqlx::query_as!(DbPlayerTable, "
                    SELECT
                        COUNT(*) OVER(PARTITION BY pp.server_id) total_players,
                        CASE
                            WHEN $5='total' THEN ppr.playtime_rank
                            WHEN $5='casual' THEN ppr.casual_rank
                            WHEN $5='tryhard' THEN ppr.tryhard_rank
                            ELSE ppr.playtime_rank
                        END ranked,
                        p.player_id,
                        player_name,
                        total_playtime,
                        casual_playtime,
                        tryhard_playtime
                    FROM website.player_playtime pp
                    JOIN player p ON p.player_id=pp.player_id
                    LEFT JOIN website.player_playtime_ranks ppr ON ppr.server_id=pp.server_id AND ppr.player_id=pp.player_id
                    WHERE pp.server_id=$4 AND player_name ILIKE $1
                    ORDER BY
                         CASE
                            WHEN $5='total' THEN total_playtime
                            WHEN $5='casual' THEN casual_playtime
                            WHEN $5='tryhard' THEN tryhard_playtime
                            else total_playtime
                        END DESC
                    LIMIT $3 OFFSET $2;
                ", player_name, paging, pagination, server.server_id, mode.to_string())
                    .fetch_all(&*data.pool.clone())
                    .await
            },
            None => {
                sqlx::query_as!(DbPlayerTable, "
                    SELECT
                        COUNT(*) OVER(PARTITION BY pp.server_id) total_players,
                        CASE
                            WHEN $4='total' THEN ppr.playtime_rank
                            WHEN $4='casual' THEN ppr.casual_rank
                            WHEN $4='tryhard' THEN ppr.tryhard_rank
                            ELSE ppr.playtime_rank
                        END ranked,
                        p.player_id,
                        player_name,
                        total_playtime,
                        casual_playtime,
                        tryhard_playtime
                    FROM website.player_playtime pp
                    JOIN player p ON p.player_id=pp.player_id
                    LEFT JOIN website.player_playtime_ranks ppr ON ppr.server_id=pp.server_id AND ppr.player_id=pp.player_id
                    WHERE pp.server_id=$3
                    ORDER BY
                         CASE
                            WHEN $4='total' THEN total_playtime
                            WHEN $4='casual' THEN casual_playtime
                            WHEN $4='tryhard' THEN tryhard_playtime
                            else total_playtime
                        END DESC
                    LIMIT $2 OFFSET $1;
                ", paging, pagination, server.server_id, mode.to_string())
                    .fetch_all(&*data.pool.clone())
                    .await
            }
        };
        let Ok(resulted) = result else {
            return response!(internal_server_error)
        };
        let total_player_count = resulted
            .first()
            .and_then(|e| e.total_players)
            .unwrap_or_default();
        response!(ok PlayersTableRanked {
            total_players: total_player_count,
            players: resulted.iter_into()
        })
    }
    #[oai(path="/servers/:server_id/players/:player_id/legacy_stats", method="get")]
    async fn get_legacy_stats(&self, Data(app): Data<&AppData>, extract: PlayerExtractor) -> Response<PlayerWithLegacyRanks>{
        if extract.server.server_id != "65bdad6379cefd7ebcecce5c"{
            return response!(err "Server does not have this stats", ErrorCode::NotFound)
        }
        let pool = &*app.pool.clone();
        let redis_pool = &app.cache;
        let player_id = extract.player.player_id;
        let server_id = extract.server.server_id;
        let func = || sqlx::query_as!(DbPlayerWithLegacyRanks, "
            WITH ranked AS (
              SELECT
                steamid64,
                points,
                human_time,
                zombie_time,
                zombie_killed,
                headshot,
                infected_time,
                item_usage,
                boss_killed,
                leader_count,
                td_count,
                RANK() OVER (ORDER BY human_time + zombie_time DESC) AS rank_total_playtime,
                RANK() OVER (ORDER BY zombie_time DESC) AS rank_zombie_time,
                RANK() OVER (ORDER BY points DESC) AS rank_points,
                RANK() OVER (ORDER BY human_time DESC) AS rank_human_time,
                RANK() OVER (ORDER BY zombie_killed DESC) AS rank_zombie_killed,
                RANK() OVER (ORDER BY headshot DESC) AS rank_headshot,
                RANK() OVER (ORDER BY infected_time DESC) AS rank_infected_time,
                RANK() OVER (ORDER BY item_usage DESC) AS rank_item_usage,
                RANK() OVER (ORDER BY boss_killed DESC) AS rank_boss_killed,
                RANK() OVER (ORDER BY leader_count DESC) AS rank_leader_count,
                RANK() OVER (ORDER BY td_count DESC) AS rank_td_count
              FROM legacy_gfl.players
            )
            SELECT *
            FROM ranked
            WHERE steamid64 = $1
            LIMIT 1
        ", player_id).fetch_one(pool);

        let key = format!("player-legacy:{server_id}:{player_id}:legacy");
        let Ok(result) = cached_response(&key, redis_pool, 120 * DAY, func).await else {
            return response!(err "Player has no cstats.", ErrorCode::NotFound)
        };
        response!(ok result.result.into())
    }
    #[oai(path="/servers/:server_id/players/playing", method="get")]
    async fn get_players_playing(&self, Data(app): Data<&AppData>, ServerExtractor(server): ServerExtractor) -> Response<Vec<PlayerDetailSession>>{
        let pool = &*app.pool.clone();
        let redis_pool = &app.cache;
        let server_id = server.server_id;
        let func = || sqlx::query_as!(DbPlayerDetailSession, "
            SELECT session_id, server_id, player_name, pss.player_id, started_at, ended_at
            FROM player_server_session pss
            JOIN player p
            ON p.player_id=pss.player_id
            WHERE server_id=$1 AND pss.ended_at IS NULL
            ORDER BY started_at
        ", server_id).fetch_all(pool);

        let key = format!("players-playing:{server_id}");
        let Ok(result) = cached_response(&key, redis_pool, 2 * 60, func).await else {
            return response!(internal_server_error)
        };
        response!(ok result.result.iter_into())
    }
    #[oai(path="/servers/:server_id/players/:player_id/playing", method="get")]
    async fn get_last_playing(&self, Data(app): Data<&AppData>, extract: PlayerExtractor) -> Response<PlayerSession>{
        let pool = &*app.pool.clone();
        let redis_pool = &app.cache;
        let player_id = extract.player.player_id;
        let server_id = extract.server.server_id;
        let func = || sqlx::query_as!(DbPlayerSession, "
            SELECT session_id, server_id, player_id, started_at, ended_at
            FROM player_server_session
            WHERE server_id=$1 AND player_id=$2
            ORDER BY started_at DESC
            LIMIT 1
        ", server_id, player_id).fetch_one(pool);

        let key = format!("player-playing:{server_id}:{player_id}");
        let Ok(result) = cached_response(&key, redis_pool, 2 * 60, func).await else {
            return response!(internal_server_error)
        };
        response!(ok result.result.into())
    }
    #[oai(path = "/servers/:server_id/players/:player_id/graph/sessions", method = "get")]
    async fn get_player_sessions(
        &self,
        Data(app): Data<&AppData>,
        extract: PlayerExtractor,
    ) -> Response<Vec<PlayerSessionTime>> {
        let context = PlayerContext::from(extract);

        match app.player_worker.get_player_sessions(&context).await {
            Ok(result) => response!(ok result),
            Err(WorkError::NotFound) => response!(ok vec![]),
            Err(WorkError::Database(_)) => response!(internal_server_error),
            Err(WorkError::Calculating) => response!(calculating),
        }
    }
    #[oai(path="/servers/:server_id/players/:player_id/hours_of_day", method="get")]
    async fn get_hours_of_day_player(&self, Data(app): Data<&AppData>, extract: PlayerExtractor) -> Response<Vec<PlayerHourDay>>{
        let context = PlayerContext::from(extract);

        match app.player_worker.get_hour_of_day(&context).await {
            Ok(result) => response!(ok result),
            Err(WorkError::NotFound) => response!(ok vec![]),
            Err(WorkError::Database(_)) => response!(internal_server_error),
            Err(WorkError::Calculating) => response!(calculating),
        }
    }
    #[oai(path="/servers/:server_id/players/:player_id/sessions", method="get")]
    async fn get_list_sessions(
        &self, Data(app): Data<&AppData>, extract: PlayerExtractor, Query(page): Query<usize>,
        Query(datetime): Query<Option<DateTime<Utc>>>,
    ) -> Response<PlayerSessionPage>{
        let pagination = 10;
        let offset = pagination * page as i64;
        let (start, end) = match datetime{
            Some(date) => {
                let end_date = date.clone();
                (date, end_date.add(TimeDelta::days(1)))
            },
            None => {
                // Date wont go past february. Im hardcoding this.
                (Utc.with_ymd_and_hms(2024, 2, 1, 0, 0, 0).unwrap(), Utc::now())
            }
        };
        let (start, end) = (start.to_db_time(), end.to_db_time());
        let Ok(result) = sqlx::query_as!(DbPlayerSessionPage,
            "WITH pss AS (
                SELECT * FROM player_server_session
                WHERE server_id=$1 AND player_id=$2
            )
            SELECT *, COUNT(session_id) OVER() AS total_rows
            FROM pss
            WHERE  started_at BETWEEN $5 AND $6
            ORDER BY started_at DESC
            LIMIT $3
            OFFSET $4",
            extract.server.server_id, extract.player.player_id, pagination, offset, start, end
        ).fetch_all(&*app.pool).await else {
            return response!(err "Player does not have sessions in this server.", ErrorCode::BadRequest);
        };
        let total_rows = result.first().and_then(|e| e.total_rows).unwrap_or_default();
        let total_pages = total_rows / pagination;
        response!(ok PlayerSessionPage{
            total_pages, rows: result.iter_into()
        })
    }
    #[oai(path="/servers/:server_id/players/:player_id/sessions/:session_id/info", method="get")]
    async fn get_session_info(
        &self, Data(app): Data<&AppData>, extract: PlayerExtractor, Path(session_id): Path<String>
    ) -> Response<PlayerSession>{
        let Ok(result) = sqlx::query_as!(DbPlayerSession,
            "SELECT * FROM player_server_session
                WHERE server_id=$1 AND player_id=$2 AND session_id=$3::Text::uuid",
            extract.server.server_id, extract.player.player_id, session_id
        ).fetch_one(&*app.pool).await else {
            return response!(err "This session does not exist.", ErrorCode::NotFound);
        };
        response!(ok result.into())
    }
    #[oai(path="/servers/:server_id/players/:player_id/sessions/:session_id/maps", method="get")]
    async fn get_session_server_graph(
        &self, Data(app): Data<&AppData>, extract: PlayerExtractor, Path(session_id): Path<String>
    ) -> Response<Vec<PlayerSessionMapPlayed>>{
        let map_played = match sqlx::query_as!(DbPlayerSessionMapPlayed,
            "WITH data_session AS (
                SELECT player_id, server_id, started_at, COALESCE(ended_at,current_timestamp) ended_at
                FROM player_server_session
                WHERE server_id=$1 AND player_id=$2 AND session_id=$3::TEXT::uuid
                LIMIT 1
            ), smp AS (
                SELECT time_id, server_id, started_at, COALESCE(ended_at, current_timestamp) ended_at, map, player_count
                FROM public.server_map_played
                WHERE started_at < (SELECT ended_at FROM data_session)
                    AND COALESCE(ended_at, current_timestamp) > (SELECT started_at FROM data_session)
                    AND server_id=$1
            )
            SELECT
            smp.time_id, smp.server_id, smp.map, smp.player_count, smp.started_at,
            COALESCE(smp.ended_at, NULL) ended_at,
            COALESCE(md.zombie_score, NULL) zombie_score, COALESCE(md.human_score, NULL) human_score,
            COALESCE(md.occurred_at, NULL) occurred_at, COALESCE(md.extend_count, NULL) extend_count
            FROM smp
            LEFT JOIN match_data md ON md.time_id=smp.time_id
            ORDER BY started_at DESC, occurred_at DESC
            ",
            extract.server.server_id, extract.player.player_id, session_id
        ).fetch_all(&*app.pool).await {
            Ok(res) => res,
            Err(err) => {
                tracing::warn!("Failed to fetch session maps: {}", err);
                return response!(internal_server_error);
            }
        };
        let mut mapped = HashMap::new();
        for map_data in map_played.into_iter(){
            let map_time_id = map_data.time_id.clone();
            if !mapped.contains_key(&map_time_id){
                let played: PlayerSessionMapPlayed = map_data.clone().into();
                mapped.insert(map_time_id, played);
            }
            if map_data.is_match_empty(){
                continue;
            }
            let match_data: MatchData = map_data.into();
            if let Some(data) = mapped.get_mut(&map_time_id){
                data.match_data.push(match_data);
            }
        }

        response!(ok mapped.into_values().collect())
    }
    #[oai(path = "/servers/:server_id/players/:player_id/infraction_update", method="get")]
    async fn get_force_player_infraction_update(
        &self, data: Data<&AppData>, ServerExtractor(server): ServerExtractor, player_id: Path<i64>
    ) -> Response<PlayerInfractionUpdate>{
        let pool = &*data.pool.clone();
        let Ok(result) = sqlx::query_as!(DbPlayerInfraction, "
            UPDATE public.server_infractions
            SET pending_update = TRUE
            WHERE payload->'player' ? 'gs_id'
                AND payload->>'server_id' = $2
                AND payload->'player'->>'gs_id' = $1
            RETURNING
                infraction_id,
                payload->>'reason' AS reason,
                payload->'admin'->>'admin_name' AS by,
                payload->'admin'->>'avatar_id' AS admin_avatar,
                (payload->>'flags')::bigint AS flags,
                to_timestamp((payload->>'created')::double precision::bigint) AS infraction_time
        ", player_id.0.to_string(), server.server_id).fetch_all(pool).await else {
            return response!(internal_server_error)
        };


        let mut tasks = vec![];
        for infraction in result {
            let task = task::spawn(async move {
                let new_infraction = match fetch_infraction(&infraction.infraction_id).await {
                    Ok(result) => Some(result),
                    Err(e) => {
                        tracing::warn!("Something went wrong fetching {}: {e}", infraction.infraction_id);
                        None
                    }
                };
                InfractionCombined {
                    new_infraction,
                    old_infraction: infraction.into(),
                }
            });

            tasks.push(task);
        }

        let fake_update: Vec<InfractionCombined> = join_all(tasks)
            .await
            .into_iter()
            .filter_map(Result::ok)
            .collect();
        response!(ok PlayerInfractionUpdate {
            id: player_id.0,
            infractions: fake_update.iter_into(),
        })
    }
    #[oai(path = "/servers/:server_id/players/:player_id/infractions", method = "get")]
    async fn get_player_infractions(&self, Data(data): Data<&AppData>, extract: PlayerExtractor) -> Response<Vec<PlayerInfraction>> {
        let pool = &*data.pool.clone();
        let Ok(result) = sqlx::query_as!(DbPlayerInfraction, "
            SELECT 
                infraction_id,
                payload->>'reason' reason, 
                payload->'admin'->>'admin_name' as by,
				payload->'admin'->>'avatar_id' as admin_avatar,
				(payload->>'flags')::bigint flags,
                to_timestamp((payload->>'created')::double precision::bigint) infraction_time
            FROM public.server_infractions
            WHERE payload->'player' ? 'gs_id'
                AND payload->>'server_id' = $2
                AND payload->'player'->>'gs_id' = $1
            ORDER BY infraction_time DESC
        ", extract.player.player_id, extract.server.server_id).fetch_all(pool).await else {
			return response!(internal_server_error)
        };
        response!(ok result.iter_into())
    }
    #[oai(path = "/servers/:server_id/players/:player_id/detail", method = "get")]
    async fn get_player_detail(&self, Data(app): Data<&AppData>, extract: PlayerExtractor) -> Response<DetailedPlayer>{
        let ctx = PlayerContext::from(extract);
        match app.player_worker.get_detail(&ctx).await {
            Ok(result) => response!(ok result),
            Err(WorkError::NotFound) => response!(err "Not Found", ErrorCode::NotFound),
            Err(WorkError::Database(_)) => response!(internal_server_error),
            Err(WorkError::Calculating) => response!(calculating),
        }
    }
    #[oai(path = "/servers/:server_id/players/:player_id/pfp", method = "get")]
    async fn get_player_pfp(
        &self, Data(app): Data<&AppData>, extract: PlayerExtractor
    ) -> Response<PlayerProfilePicture>{
        let Some(provider) = &app.steam_provider else {
            return response!(err "This feature is disabled.", ErrorCode::NotImplemented)
        };
        let player_id = match extract.player.player_id.parse::<i64>() {
            Ok(p) => p,
            Err(_) => {
                if let Some(p_id) = extract.player.associated_player_id{
                    let Ok(converted) = p_id.parse::<i64>() else {
                        tracing::warn!("Found invalid player_id from associated_player_id.");
                        return response!(internal_server_error);
                    };
                    converted
                }else{
                    return response!(err "No profile picture!!", ErrorCode::NotFound);
                }
            }
        };

        let Ok(profile) = get_profile(&app.cache, provider, &player_id).await else {
            tracing::warn!("Provider is broken");
            return response!(err "Broken", ErrorCode::InternalServerError)
        };

        let url_medium = match profile.url.split_once("_full"){
            Some((medium, ext)) => format!("{medium}_medium{ext}"),
            None => profile.url.clone()
        };
        response!(ok PlayerProfilePicture{
            id: extract.player.player_id,
            full: profile.url,
            medium: url_medium
        })
    }
    #[oai(path="/servers/:server_id/players/:player_id/sessions/:session_id/might_friends", method="get")]
    async fn get_player_approximate_friend(
        &self, Data(app): Data<&AppData>, extract: PlayerExtractor, Path(session_id): Path<String>
    ) -> Response<Vec<PlayerSeen>>{
        let ctx = PlayerContext::from(extract);
        let result = match app.player_worker.get_player_approximate_friend(&ctx, &session_id).await {
            Ok(result) => result,
            Err(WorkError::NotFound) => return response!(ok vec![]),
            Err(WorkError::Database(_)) => return response!(internal_server_error),
            Err(WorkError::Calculating) => return response!(calculating),
        };
        response!(ok result)
    }
    #[oai(path="/servers/:server_id/players/:player_id/most_played_maps", method="get")]
    async fn get_player_most_played(
        &self, Data(app): Data<&AppData>, extract: PlayerExtractor
    ) -> Response<Vec<PlayerMostPlayedMap>>{
        let ctx = PlayerContext::from(extract);
        match app.player_worker.get_most_played_maps(&ctx).await {
            Ok(result) => response!(ok result),
            Err(WorkError::NotFound) => response!(ok vec![]),
            Err(WorkError::Database(_)) => response!(internal_server_error),
            Err(WorkError::Calculating) => response!(calculating),
        }
    }
    #[oai(path="/servers/:server_id/players/:player_id/regions", method="get")]
    async fn get_player_region(
        &self, Data(app): Data<&AppData>, extract: PlayerExtractor
    ) -> Response<Vec<PlayerRegionTime>>{
        let ctx = PlayerContext::from(extract);
        match app.player_worker.get_regions(&ctx).await {
            Ok(result) => response!(ok result),
            Err(WorkError::NotFound) => response!(ok vec![]),
            Err(WorkError::Database(_)) => response!(internal_server_error),
            Err(WorkError::Calculating) => response!(calculating),
        }
    }
}
impl UriPatternExt for PlayerApi{
    fn get_all_patterns(&self) -> Vec<RoutePattern<'_>> {
        vec![
            "/servers/{server_id}/players/{player_id}/playing",
            "/servers/{server_id}/players/autocomplete",
            "/servers/{server_id}/players/players/stats",
            "/servers/{server_id}/players/players/countries",
            "/servers/{server_id}/players/players/table",
            "/servers/{server_id}/players/{player_id}/graph/sessions",
            "/servers/{server_id}/players/{player_id}/sessions",
            "/servers/{server_id}/players/{player_id}/sessions/{session_id}/info",
            "/servers/{server_id}/players/{player_id}/sessions/{session_id}/maps",
            "/servers/{server_id}/players/{player_id}/sessions/{session_id}/might_friends",
            "/servers/{server_id}/players/{player_id}/infraction_update",
            "/servers/{server_id}/players/{player_id}/infractions",
            "/servers/{server_id}/players/{player_id}/detail",
            "/servers/{server_id}/players/{player_id}/pfp",
            "/servers/{server_id}/players/{player_id}/most_played_maps",
            "/servers/{server_id}/players/{player_id}/regions",
            "/servers/{server_id}/players/{player_id}/legacy_stats",
            "/servers/{server_id}/players/{player_id}/hours_of_day",
        ].iter_into()
    }
}