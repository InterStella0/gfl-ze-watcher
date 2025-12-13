use std::fmt::{Display, Formatter};
use poem::http::StatusCode;
use poem::web::{Data, Json};
use poem_openapi::{Enum, OpenApi};
use poem_openapi::param::{Path, Query};
use poem_openapi::types::{ParseFromJSON, ToJSON};
use serde::{Deserialize, Serialize};
use sqlx::{Pool, Postgres};
use crate::{response, AppData, FastCache};
use crate::core::model::{DbContinentStatistic, DbMap, DbMapIsPlaying, DbMapLastPlayed, DbPlayerBrief, DbServer, DbServerMap, DbServerMapPlayed, DbServerMatch, DbServerSessionMatch};
use crate::core::api_models::{ContinentStatistics, DailyMapRegion, ErrorCode, MapAnalyze, MapEventAverage, MapInfo, MapPlayedPaginated, MapPlayerTypeTime, MapRegion, MapSessionDistribution, MapSessionMatch, PlayerBrief, Response, RoutePattern, ServerExtractor, ServerMap, ServerMapMatch, ServerMapPlayed, ServerMapPlayedPaginated, UriPatternExt};
use crate::core::utils::{cached_response, db_to_utc, get_map_image, get_map_images, get_server, handle_worker_result, update_online_brief, CacheKey, IterConvert, MapImage, OptionalTokenBearer, TokenBearer, DAY};
use crate::core::workers::{MapContext, WorkError, WorkResult};

#[derive(Enum)]
enum MapLastSessionMode{
    LastPlayed,
    HighestHour,
    FrequentlyPlayed,
    HighestCumHour,
    UniquePlayers,
}
#[derive(Enum)]
enum MapFilterMode{
    Casual,
    TryHard,
    Available,
    Favorite
}
#[derive(Serialize, Deserialize)]
struct SetMapFavorite {
    pub map_name: String,
}


impl Display for MapFilterMode {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            MapFilterMode::Casual => write!(f, "casual"),
            MapFilterMode::TryHard => write!(f, "tryhard"),
            MapFilterMode::Available => write!(f, "available"),
            MapFilterMode::Favorite => write!(f, "favorite"),
        }
    }
}
impl Display for MapLastSessionMode{
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            MapLastSessionMode::LastPlayed => write!(f, "last_played"),
            MapLastSessionMode::HighestHour => write!(f, "highest_hour"),
            MapLastSessionMode::HighestCumHour => write!(f, "highest_cum_hour"),
            MapLastSessionMode::FrequentlyPlayed => write!(f, "frequently_played"),
            MapLastSessionMode::UniquePlayers => write!(f, "unique_players"),
        }
    }
}
async fn get_map(pool: &Pool<Postgres>, cache: &FastCache, server_id: &str, map_name: &str) -> Option<DbMap> {
    let func = || sqlx::query_as!(DbMap,
            "SELECT server_id, map
                FROM server_map_played
                WHERE server_id=$1
                  AND map=$2
                LIMIT 1",
            server_id,
            map_name
        )
        .fetch_one(pool);

    let key = format!("server-map-exist:{server_id}:{map_name}");
    cached_response(&key, cache, 60 * 60, func).await.and_then(|s| Ok(s.result)).ok()
}
async fn get_map_cache_key(pool: &Pool<Postgres>, cache: &FastCache, server_id: &str, map_name: &str) -> CacheKey{
    let func = || sqlx::query_as!(DbMapLastPlayed,
            "SELECT started_at last_played
                FROM server_map_played
                WHERE server_id=$1
                    AND map=$2
                    AND ended_at IS NOT NULL
                ORDER BY started_at DESC
                LIMIT 2",
            server_id,
            map_name
        )
        .fetch_all(pool);

    let key = format!("last-played:{server_id}:{map_name}");
    let Ok(result) = cached_response(&key, cache, 60, func).await else {
        return CacheKey {
            current: "first-time".to_string(),
            previous: None
        }
    };

    let d = result.result;
    let current = d
        .first()
        .and_then(|e| e.last_played)
        .and_then(|e| Some(db_to_utc(e).to_rfc3339()))
        .unwrap_or_default();

    let previous = d
        .get(1)
        .and_then(|e| e.last_played)
        .and_then(|e| Some(db_to_utc(e).to_rfc3339()));
    CacheKey { current, previous }
}
struct MapExtractor{
    pub server: DbServer,
    pub map: DbMap,
    pub cache_key: CacheKey,
}
impl From<MapExtractor> for MapContext {
    fn from(extract: MapExtractor) -> Self {
        MapContext {
            map: extract.map,
            server: extract.server,
            cache_key: extract.cache_key,
        }
    }
}
impl MapExtractor{
    pub async fn new(app_data: &AppData, server: DbServer, map: DbMap) -> Self {
        let pool = &app_data.pool;
        let cache = &app_data.cache;
        let cache_key = get_map_cache_key(pool, cache, &server.server_id, &map.map).await;
        Self{ server, map, cache_key }
    }
}
impl<'a> poem::FromRequest<'a> for MapExtractor {
    async fn from_request(req: &'a poem::Request, _body: &mut poem::RequestBody) -> poem::Result<Self> {
        let server_id = req.raw_path_param("server_id")
            .ok_or_else(|| poem::Error::from_string("Invalid server_id", StatusCode::BAD_REQUEST))?;

        let map_name = req.raw_path_param("map_name")
            .ok_or_else(|| poem::Error::from_string("Invalid map_name", StatusCode::BAD_REQUEST))?;

        let data: &AppData = req.data()
            .ok_or_else(|| poem::Error::from_string("Invalid data", StatusCode::BAD_REQUEST))?;

        let Some(server) = get_server(&data.pool, &data.cache, &server_id).await else {
            return Err(poem::Error::from_string("Server not found", StatusCode::NOT_FOUND))
        };
        let Some(map) = get_map(&data.pool, &data.cache, &server.server_id, map_name).await else {
            return Err(poem::Error::from_string("Map not found", StatusCode::NOT_FOUND))
        };

        Ok(MapExtractor::new(data, server, map).await)
    }
}
fn handle_worker_map_result<T>(result: WorkResult<T>) -> Response<T>
    where T: ParseFromJSON + ToJSON + Send + Sync{
    handle_worker_result(result, "No map found")
}

pub struct MapApi;

#[OpenApi]
impl MapApi{
    #[oai(path = "/servers/:server_id/maps/autocomplete", method = "get")]
    async fn get_maps_autocomplete(
        &self, Data(data): Data<&AppData>, ServerExtractor(server): ServerExtractor, Query(map): Query<String>
    ) -> Response<Vec<ServerMap>>{
        let Ok(result) = sqlx::query_as!(DbMap, "
            SELECT server_id, map
            FROM server_map
            WHERE server_id = $2
              AND map ILIKE '%' || $1 || '%'
            ORDER BY NULLIF(STRPOS(LOWER(map), LOWER($1)), 0) ASC NULLS LAST
            LIMIT 20;
        ", map, server.server_id
        ).fetch_all(&*data.pool.clone()).await else {
            return response!(ok vec![])
        };
        response!(ok result.iter_into())
    }
    #[oai(path="/servers/:server_id/maps/set-favorite", method="post")]
    async fn set_user_map_favorite(
        &self, Data(data): Data<&AppData>,
        Json(payload): Json<SetMapFavorite>, ServerExtractor(server): ServerExtractor,
        TokenBearer(user_token): TokenBearer
    ) -> Response<ServerMap>{
        let user_id = user_token.id;
        let Ok(_) = sqlx::query!("
            INSERT INTO website.user_favorite_maps(server_id, user_id, map)
            VALUES ($1, $2, $3)
            ON CONFLICT(server_id, user_id, map) DO NOTHING
        ", server.server_id, user_id, payload.map_name)
            .execute(&*data.pool).await else {
            return response!(err "Something went wrong :/", ErrorCode::InternalServerError)
        };

        response!(ok ServerMap{
            server_id: server.server_id,
            map: payload.map_name
        })
    }
    #[oai(path="/servers/:server_id/maps/:map_name/unset-favorite", method="post")]
    async fn unset_user_map_favorite(
        &self, Data(data): Data<&AppData>, extract: MapExtractor,
        TokenBearer(user_token): TokenBearer
    ) -> Response<ServerMap>{
        let user_id = user_token.id;
        let Ok(_) = sqlx::query!("
            DELETE FROM website.user_favorite_maps
            WHERE user_id=$2 AND server_id=$1 AND map=$3
        ", extract.server.server_id, user_id, extract.map.map)
            .execute(&*data.pool).await else {
            return response!(err "Something went wrong :/", ErrorCode::InternalServerError)
        };

        response!(ok extract.map.into())
    }
    #[oai(path = "/servers/:server_id/maps/last/sessions", method = "get")]
    async fn get_maps_last_session(
        &self, Data(data): Data<&AppData>, ServerExtractor(server): ServerExtractor, Query(page): Query<usize>,
        Query(sorted_by): Query<MapLastSessionMode>, Query(search_map): Query<Option<String>>, Query(filter): Query<Option<MapFilterMode>>,
        OptionalTokenBearer(user): OptionalTokenBearer,
    ) -> Response<MapPlayedPaginated>{
        let pool = &*data.pool.clone();
        let pagination = 25;
        let offset = pagination * page as i64;
        let map_target = search_map.unwrap_or_default();
        let filtering = filter.map(|e| e.to_string()).unwrap_or("all".into());
        let user_id = user.map(|e| e.id);
        let rows = match sqlx::query_as!(DbServerMap,
			"SELECT
                COUNT(*) OVER() total_maps,
                sm.server_id,
                sm.map,
                sm.first_occurrence,
                sm.pending_cooldown,
                sm.enabled,
                sm.current_cooldown AS cooldown,
                sm.is_tryhard,
                sm.is_casual,
                (ufm.user_id IS NOT NULL) AS is_favorite,
                sm.cleared_at,
                mp.total_playtime AS total_time,
                mp.total_sessions,
                mp.unique_players,
                mp.cum_player_hours,
                smp.started_at as last_played,
                smp.ended_at as last_played_ended,
                smp.time_id as last_session_id
            FROM server_map sm
            LEFT JOIN website.map_analyze mp
                ON sm.server_id=mp.server_id AND sm.map=mp.map
            LEFT JOIN (
                SELECT DISTINCT ON (server_id, map) *
                FROM server_map_played
                ORDER BY server_id, map, started_at DESC
            ) smp
                ON smp.server_id=mp.server_id AND smp.map=mp.map
            LEFT JOIN website.user_favorite_maps ufm
              ON ufm.server_id = sm.server_id
             AND ufm.map = sm.map
             AND ufm.user_id = $8
            WHERE sm.server_id=$1 AND ($6 OR sm.map ILIKE '%' || $5 || '%') AND smp.time_id IS NOT NULL
                AND CASE
                        WHEN $7 = 'all' THEN TRUE
                        WHEN $7 = 'casual' THEN sm.is_casual
                        WHEN $7 = 'tryhard' THEN sm.is_tryhard
                        WHEN $7 = 'available' THEN (sm.current_cooldown IS NULL OR CURRENT_TIMESTAMP > sm.current_cooldown) AND sm.enabled
                        WHEN $7 = 'favorite' AND $8 IS NOT NULL THEN ufm.map IS NOT NULL
                        ELSE FALSE
                    END
            ORDER BY
               CASE
                   WHEN $4 = 'last_played' THEN smp.started_at
               END DESC,
               CASE
                   WHEN $4 = 'highest_hour' THEN mp.total_playtime
               END DESC,
               CASE
                   WHEN $4 = 'frequently_played' THEN mp.total_sessions
               END DESC,
               CASE
                   WHEN $4 = 'highest_cum_hour' THEN mp.cum_player_hours
               END DESC,
               CASE
                   WHEN $4 = 'unique_players' THEN mp.unique_players
               END DESC,
               smp.started_at DESC
            LIMIT $3
            OFFSET $2",
				server.server_id, offset, pagination, sorted_by.to_string(),
                map_target, map_target.trim() == "", filtering, user_id
        )
            .fetch_all(pool)
            .await {
            Ok(r) => r,
            Err(e) => {
                tracing::error!("Error last session map: {e}");
                return response!(internal_server_error)
            }
        };

        let total_maps = rows
            .first()
            .and_then(|e| Some(e.total_maps))
            .unwrap_or_default();
        let resp = MapPlayedPaginated{
            total_maps: total_maps.unwrap_or_default() as i32,
            maps: rows.iter_into()
        };
        response!(ok resp)
    }
    #[oai(path = "/servers/:server_id/maps/all/sessions", method = "get")]
    async fn get_maps_all_sessions(
        &self, data: Data<&AppData>, ServerExtractor(server): ServerExtractor, page: Query<usize>
    ) -> Response<ServerMapPlayedPaginated>{
        let pool = &*data.pool.clone();
        let pagination = 10;
        let offset = pagination * page.0 as i64;
        let Ok(rows) = sqlx::query_as!(DbServerMapPlayed,
			"SELECT *, COUNT(*) OVER()::integer total_sessions
             FROM server_map_played
             WHERE server_id=$1
             ORDER BY started_at DESC
             LIMIT $3
             OFFSET $2",
				server.server_id, offset, pagination)
            .fetch_all(pool)
            .await else {
            return response!(internal_server_error)
        };

        let total_sessions = rows
            .first()
            .and_then(|e| e.total_sessions)
            .unwrap_or_default();

        let resp = ServerMapPlayedPaginated{
            total_sessions,
            maps: rows.iter_into()
        };
        response!(ok resp)
    }

    #[oai(path = "/servers/:server_id/maps/:map_name/info", method = "get")]
    async fn get_maps_info(
        &self, Data(app): Data<&AppData>, extract: MapExtractor
    ) -> Response<MapInfo>{
        let context = MapContext::from(extract);

        handle_worker_map_result(app.map_worker.get_detail(&context).await)
    }

    #[oai(path = "/servers/:server_id/maps/:map_name/player_types", method = "get")]
    async fn get_map_player_type(
        &self, Data(app): Data<&AppData>, extract: MapExtractor
    ) -> Response<Vec<MapPlayerTypeTime>>{
        let context = MapContext::from(extract);

        handle_worker_map_result(app.map_worker.get_player_types(&context).await)
    }

    #[oai(path = "/servers/:server_id/maps/:map_name/analyze", method = "get")]
    async fn get_maps_highlight(
        &self, Data(app): Data<&AppData>, extract: MapExtractor
    ) -> Response<MapAnalyze>{
        let context = MapContext::from(extract);
        handle_worker_map_result(app.map_worker.get_statistics(&context).await)
    }
    #[oai(path = "/servers/:server_id/maps/:map_name/sessions", method="get")]
    async fn get_maps_sessions(
        &self, Data(app): Data<&AppData>, extract: MapExtractor, Query(page): Query<usize>
    ) -> Response<ServerMapPlayedPaginated>{
        let context = MapContext::from(extract);
        handle_worker_map_result(app.map_worker.get_sessions(&context, page).await)
    }
    #[oai(path="/servers/:server_id/sessions/:session_id/info", method="get")]
    async fn get_map_session_info(
        &self, Data(data): Data<&AppData>, ServerExtractor(server): ServerExtractor, Path(session_id): Path<i64>
    ) -> Response<ServerMapPlayed>{
        let time_id =  session_id as i32;
        let func = || sqlx::query_as!(DbServerMapPlayed, "
            SELECT 0 total_sessions, time_id, server_id, map, player_count, started_at, ended_at
            FROM server_map_played
            WHERE time_id=$1 AND server_id=$2
            LIMIT 1
        ", time_id, server.server_id).fetch_one(&*data.pool);
        let key = format!("map_player_session_info:{}:{}", server.server_id, session_id);
        let Ok(row) = cached_response(&key, &data.cache, 60, func).await else {
            return response!(err "No session found with this id.", ErrorCode::NotFound)
        };
        response!(ok row.result.into())
    }
    #[oai(path="/servers/:server_id/sessions/:session_id/players", method="get")]
    async fn get_map_player_session(
        &self, Data(app): Data<&AppData>, ServerExtractor(server): ServerExtractor, Path(session_id): Path<i64>
    ) -> Response<Vec<PlayerBrief>>{
        let pool = &*app.pool.clone();
        let cache = &app.cache;
        let time_id =  session_id as i32;
        let checker = || sqlx::query_as!(DbMapIsPlaying,
			"WITH session AS (SELECT time_id,
    			       server_id,
    			       map,
    			       player_count,
    			       started_at,
    			       ended_at
    			FROM server_map_played
    			WHERE server_id=$1 AND time_id=$2)
    		 SELECT ended_at IS NULL AS result
    		 FROM session"
		, server.server_id, time_id
		).fetch_one(pool);
        let checker_key = format!("session-checker-players:{}:{}", server.server_id, session_id);
        let mut is_playing = false;
        if let Ok(result) = cached_response(&checker_key, cache, 5 * 60, checker).await {
            is_playing = result.result.result.unwrap_or_default();
        }

        let func = async || {
            sqlx::query_as!(DbPlayerBrief, "
				WITH params AS (
                    SELECT $2::INTEGER AS time_id,
                    $1 AS target_server,
                    CURRENT_TIMESTAMP AS right_now
                ), timespent AS (
                    SELECT
                        pss.player_id, SUM(
                        COALESCE(LEAST(pss.ended_at, smp.ended_at), p.right_now) - GREATEST(pss.started_at, smp.started_at)
                    ) AS total
                    FROM public.server_map_played smp
					CROSS JOIN params p
                    INNER JOIN player_server_session pss
                    ON pss.server_id=smp.server_id
						AND smp.time_id = p.time_id
						AND tstzrange(pss.started_at, pss.ended_at) && tstzrange(smp.started_at, smp.ended_at)
                    GROUP BY pss.player_id
                ),
                online_players AS (
                    SELECT player_id, started_at
                    FROM player_server_session
					CROSS JOIN params p
                    WHERE server_id=p.target_server
                        AND ended_at IS NULL
                        AND (p.right_now - started_at) < INTERVAL '12 hours'
                ),
                last_player_sessions AS (
                    SELECT DISTINCT ON (player_id) player_id, started_at, ended_at
                    FROM player_server_session
                    WHERE ended_at IS NOT NULL
                )
                SELECT
                    COUNT(p.player_id) OVER() total_players,
                    p.player_id,
                    p.player_name,
                    p.created_at,
                    ts.total AS total_playtime,
                    COALESCE(op.started_at, NULL) as online_since,
                    lps.started_at AS last_played,
                    (lps.ended_at - lps.started_at) AS last_played_duration,
                    0::int AS rank
                FROM player p
                JOIN timespent ts
                ON ts.player_id = p.player_id
                LEFT JOIN online_players op
                ON op.player_id=p.player_id
                JOIN last_player_sessions lps
                ON lps.player_id=p.player_id
                ORDER BY total_playtime DESC
            ", server.server_id, time_id).fetch_all(pool).await
        };
        let key = format!("map_player_session:{}:{}", server.server_id, session_id);
        let duration_cache = if is_playing { 60 } else { DAY };
        let Ok(rows) = cached_response(&key, cache, duration_cache, func).await else {
            tracing::warn!("Couldn't get player session");
            return  response!(ok vec![])
        };

        let mut players: Vec<PlayerBrief> = rows.result.iter_into();
        if !rows.is_new{
            update_online_brief(&pool, cache, &server.server_id, &mut players).await;
        }
        response!(ok players)
    }
    #[oai(path="/servers/:server_id/sessions/:session_id/continents", method="get")]
    async fn radar_statistic_session_continents(
        &self, Data(app): Data<&AppData>, ServerExtractor(server): ServerExtractor, Path(session_id): Path<i64>
    ) -> Response<ContinentStatistics> {
        let pool = &*app.pool.clone();
        let time_id =  session_id as i32;
        let server_id = server.server_id;
        let func = || sqlx::query_as!(DbContinentStatistic, "
            WITH  map_played AS (
                SELECT * FROM server_map_played
                WHERE server_id=$1
			    	AND time_id =$2
            ),
            all_players AS (
              SELECT pss.*, p.location_code->>'country' AS location_country
              FROM player_server_session pss
              CROSS JOIN map_played smp
              JOIN player p ON p.player_id=pss.player_id
              WHERE pss.server_id = $1
                AND tstzrange(pss.started_at, pss.ended_at) && tstzrange(smp.started_at, smp.ended_at)
				AND p.location_code->>'country' IS NOT NULL
            ),
            deduplicated_countries AS (
              SELECT
                \"ISO_A2_EH\" AS country_code,
                MIN(\"NAME\") AS country_name,
				MIN(\"CONTINENT\") as continent
              FROM layers.countries_fixed
              GROUP BY \"ISO_A2_EH\"
            ),
            country_players AS (
			    SELECT
			        dc.continent,
			        dc.country_code,
			        COUNT(DISTINCT fps.player_id) AS players_per_country
			    FROM all_players fps
			    LEFT JOIN deduplicated_countries dc
			      ON dc.country_code = fps.location_country
			    GROUP BY dc.continent, dc.country_code
			)
			SELECT
			    continent,
			    SUM(players_per_country)::BIGINT AS players_per_continent,
			    0::BIGINT AS total_players
			FROM country_players
			GROUP BY continent
			ORDER BY players_per_continent DESC;
        ", server_id, time_id)
            .fetch_all(pool);
        let key = format!("statistics-map-session-continents:{server_id}:{time_id}");
        let Ok(result) = cached_response(&key, &app.cache, 60, func).await else {
            tracing::warn!("Unable to cache statistics-map-session-continents");
            return response!(internal_server_error)
        };
        let data = result.result;
        let total = data.first().and_then(|m| m.total_players).unwrap_or(0);
        let available = data.iter().filter_map(|m| m.players_per_continent).sum();

        let stats = ContinentStatistics{
            contain_countries: available,
            total_count: total.max(available),
            continents: data.iter_into()
        };
        response!(ok stats)
    }

    #[oai(path="/servers/:server_id/match-now", method="get")]
    async fn get_map_now_match(
        &self, Data(app): Data<&AppData>, ServerExtractor(server): ServerExtractor
    ) -> Response<ServerMapMatch>{
        let pool = &*app.pool.clone();
        let func = ||
            sqlx::query_as!(DbServerMatch, "
                SELECT
                    smp.time_id,
                    smp.server_id,
                    smp.map,
                    smp.started_at,
                    COALESCE(md.zombie_score, NULL) zombie_score,
                    COALESCE(md.human_score, NULL) human_score,
                    COALESCE(md.occurred_at, NULL) occurred_at,
                    COALESCE(md.estimated_time_end, NULL) estimated_time_end,
                    COALESCE(md.server_time_end, NULL) server_time_end,
                    COALESCE(md.extend_count, NULL) extend_count,
                    LEAST((SELECT COUNT(DISTINCT player_id) FROM player_server_session p
                        WHERE p.server_id = smp.server_id
                        AND p.ended_at IS NULL
                        AND CURRENT_TIMESTAMP - p.started_at < INTERVAL '24 hours'),
                        COALESCE(s.max_players, 64)
                    ) AS player_count
                FROM server_map_played smp
                JOIN server s ON s.server_id = smp.server_id
                LEFT JOIN match_data md ON md.time_id = smp.time_id
                WHERE smp.server_id = $1 AND ended_at IS NULL
                ORDER BY md.occurred_at DESC
                LIMIT 1
            ", server.server_id).fetch_one(pool);
        let key = format!("map_session_current_match:{}", server.server_id);
        let Ok(rows) = cached_response(&key, &app.cache, 60, func).await else {
            return response!(err "No session and match found with this id.", ErrorCode::NotFound)
        };

        response!(ok rows.result.into())
    }
    #[oai(path="/servers/:server_id/sessions/:session_id/all-match", method="get")]
    async fn get_map_session_all_match(
        &self, Data(app): Data<&AppData>, ServerExtractor(server): ServerExtractor, Path(session_id): Path<i64>
    ) -> Response<Vec<MapSessionMatch>>{
        let pool = &*app.pool.clone();
        let time_id =  session_id as i32;
        let func = ||
            sqlx::query_as!(DbServerSessionMatch, "
                SELECT
                    time_id,
                    server_id,
                    zombie_score,
                    human_score,
                    occurred_at
                FROM match_data
                WHERE time_id = $2 AND server_id=$1
                ORDER BY occurred_at
            ", server.server_id, time_id).fetch_all(pool);
        let key = format!("map_player_session_all_match:{}:{}", server.server_id, session_id);
        let Ok(rows) = cached_response(&key, &app.cache, 2 * 60, func).await else {
            return response!(err "No session and match found with this id.", ErrorCode::NotFound)
        };

        response!(ok rows.result.iter_into())
    }
    #[oai(path="/servers/:server_id/sessions/:session_id/match", method="get")]
    async fn get_map_session_match(
        &self, Data(app): Data<&AppData>, ServerExtractor(server): ServerExtractor, Path(session_id): Path<i64>
    ) -> Response<Option<MapSessionMatch>>{
        let pool = &*app.pool.clone();
        let time_id =  session_id as i32;
        let func = async || {
            sqlx::query_as!(DbServerSessionMatch, "
                SELECT
                    time_id,
                    server_id,
                    zombie_score,
                    human_score,
                    occurred_at
                FROM match_data
                WHERE time_id = $2 AND server_id=$1
                ORDER BY occurred_at DESC
                LIMIT 1
            ", server.server_id, time_id).fetch_one(pool).await
        };
        let key = format!("map_player_session_match:{}:{}", server.server_id, session_id);
        let Ok(rows) = cached_response(&key, &app.cache, 12 * 60, func).await else {
            return response!(ok None)
        };

        response!(ok Some(rows.result.into()))
    }
    #[oai(path="/servers/:server_id/maps/:map_name/images", method="get")]
    async fn get_server_map_images(
        &self, Data(app): Data<&AppData>, extract: MapExtractor
    ) -> Response<MapImage>{
        let maps = get_map_images(&app.cache).await;
        let map_names: Vec<String> = maps.iter().map(|e| e.map_name.clone()).collect();
        let map_name = extract.map.map;
        let Some(map_image) = get_map_image(&map_name, &map_names) else {
            return response!(err "No map image", ErrorCode::NotFound)
        };

        let Some(d) = maps.into_iter().find(|e| e.map_name == map_image) else {
            return response!(internal_server_error)
        };
        response!(ok d)
    }
    #[oai(path="/servers/:server_id/maps/:map_name/events", method="get")]
    async fn get_event_counts(
        &self, Data(app): Data<&AppData>, extract: MapExtractor
    ) -> Response<Vec<MapEventAverage>>{
        let context = MapContext::from(extract);
        handle_worker_map_result(app.map_worker.get_events(&context).await)
    }
    #[oai(path="/servers/:server_id/maps/:map_name/heat-regions", method="get")]
    async fn get_heat_regions(
        &self, Data(app): Data<&AppData>, extract: MapExtractor
    ) -> Response<Vec<DailyMapRegion>> {
        let context = MapContext::from(extract);
        handle_worker_map_result(app.map_worker.get_heat_regions(&context).await)
    }
    #[oai(path="/servers/:server_id/maps/:map_name/regions", method="get")]
    async fn get_map_regions(
        &self, Data(app): Data<&AppData>, extract: MapExtractor
    ) -> Response<Vec<MapRegion>>{
        let context = MapContext::from(extract);
        handle_worker_map_result(app.map_worker.get_regions(&context).await)
    }
    #[oai(path="/servers/:server_id/maps/:map_name/sessions_distribution", method="get")]
    async fn get_map_sessions_distribution(
        &self, Data(app): Data<&AppData>, extract: MapExtractor
    ) -> Response<Vec<MapSessionDistribution>>{
        let context = MapContext::from(extract);
        handle_worker_map_result(app.map_worker.get_session_distributions(&context).await)
    }
    #[oai(path="/servers/:server_id/maps/:map_name/top_players", method="get")]
    async fn get_map_player_top_10(
        &self, Data(app): Data<&AppData>, extract: MapExtractor
    ) -> Response<Vec<PlayerBrief>>{
        let context = MapContext::from(extract);

        match app.map_worker.get_top_10_players(&context).await {
            Ok(result) => response!(ok result),
            Err(WorkError::NotFound) => response!(err "No players found for map", ErrorCode::NotFound),
            Err(WorkError::Database(_)) => response!(internal_server_error),
            Err(WorkError::Calculating) => response!(calculating),
        }
    }
}

impl UriPatternExt for MapApi{
    fn get_all_patterns(&self) -> Vec<RoutePattern<'_>> {
        vec![
            "/servers/{server_id}/maps/{map_name}/images",
            "/servers/{server_id}/maps/autocomplete",
            "/servers/{server_id}/match-now",
            "/servers/{server_id}/maps/last/sessions",
            "/servers/{server_id}/maps/all/sessions",
            "/servers/{server_id}/maps/{map_name}/analyze",
            "/servers/{server_id}/maps/{map_name}/info",
            "/servers/{server_id}/maps/{map_name}/sessions",
            "/servers/{server_id}/maps/{map_name}/events",
            "/servers/{server_id}/maps/{map_name}/heat-regions",
            "/servers/{server_id}/maps/{map_name}/regions",
            "/servers/{server_id}/maps/{map_name}/sessions_distribution",
            "/servers/{server_id}/maps/{map_name}/top_players",
            "/servers/{server_id}/maps/{map_name}/player_types",
            "/servers/{server_id}/sessions/{session_id}/players",
            "/servers/{server_id}/sessions/{session_id}/match",
            "/servers/{server_id}/sessions/{session_id}/all-match",
            "/servers/{server_id}/sessions/{session_id}/continents",
        ].iter_into()
    }
}