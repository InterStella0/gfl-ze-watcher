use std::fmt::{Display, Formatter};
use poem::http::StatusCode;
use poem::web::{Data};
use poem_openapi::{Enum, OpenApi};
use poem_openapi::param::{Path, Query};
use sqlx::{Pool, Postgres};
use crate::{response, AppData, FastCache};
use crate::core::model::{
    DbMap, DbMapLastPlayed, DbPlayerBrief, DbServer, DbServerMap, DbServerMapPlayed, 
    DbServerSessionMatch
};
use crate::core::api_models::{
    DailyMapRegion, ErrorCode, MapAnalyze, MapEventAverage, MapInfo, MapPlayedPaginated, MapRegion, 
    MapSessionDistribution, MapSessionMatch, PlayerBrief, Response, RoutePattern, ServerExtractor, 
    ServerMap, ServerMapPlayedPaginated, UriPatternExt
};
use crate::core::utils::{
    cached_response, db_to_utc, get_map_image, get_map_images, get_server, update_online_brief,
    CacheKey, IterConvert, MapImage, DAY
};
use crate::core::workers::{MapContext, WorkError};

#[derive(Enum)]
enum MapLastSessionMode{
    LastPlayed,
    HighestHour,
    FrequentlyPlayed
}

impl Display for MapLastSessionMode{
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            MapLastSessionMode::LastPlayed => write!(f, "last_played"),
            MapLastSessionMode::HighestHour => write!(f, "highest_hour"),
            MapLastSessionMode::FrequentlyPlayed => write!(f, "frequently_played")
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
    #[oai(path = "/servers/:server_id/maps/last/sessions", method = "get")]
    async fn get_maps_last_session(
        &self, Data(data): Data<&AppData>, ServerExtractor(server): ServerExtractor, Query(page): Query<usize>,
        Query(sorted_by): Query<MapLastSessionMode>, search_map: Query<Option<String>>
    ) -> Response<MapPlayedPaginated>{
        let pool = &*data.pool.clone();
        let pagination = 20;
        let offset = pagination * page as i64;
        let map_target = search_map.0.unwrap_or_default();
        let rows = match sqlx::query_as!(DbServerMap,
			"WITH map_sessions AS (
                SELECT server_id, map,
                    SUM(ended_at - started_at) total_time,
                    COUNT(*) total_sessions,
		            MAX(started_at) last_played
                FROM server_map_played
                GROUP BY server_id, map
            )
            SELECT
                COUNT(*) OVER() total_maps,
                sm.server_id,
                sm.map,
                sm.first_occurrence,
                sm.pending_cooldown,
                sm.enabled,
                sm.current_cooldown AS cooldown,
                sm.is_tryhard,
                sm.is_casual,
                sm.cleared_at,
                mp.total_time,
                mp.total_sessions,
                mp.last_played,
                smp.ended_at as last_played_ended,
                smp.time_id as last_session_id
            FROM server_map sm
            LEFT JOIN map_sessions mp
                ON sm.server_id=mp.server_id AND sm.map=mp.map
            LEFT JOIN server_map_played smp
                ON smp.server_id=mp.server_id AND smp.map=mp.map AND smp.started_at=mp.last_played
            WHERE sm.server_id=$1 AND ($6 OR sm.map ILIKE '%' || $5 || '%') AND smp.time_id IS NOT NULL
            ORDER BY
               CASE
                   WHEN $4 = 'last_played' THEN mp.last_played
               END DESC,
               CASE
                   WHEN $4 = 'highest_hour' THEN mp.total_time
               END DESC,
               CASE
                   WHEN $4 = 'frequently_played' THEN mp.total_sessions
               END DESC,
               mp.last_played DESC
            LIMIT $3
            OFFSET $2",
				server.server_id, offset, pagination, sorted_by.to_string(),
                map_target, map_target.trim() == ""
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

        match app.map_worker.get_detail(&context).await {
            Ok(result) => response!(ok result),
            Err(WorkError::NotFound) => response!(err "No map found", ErrorCode::NotFound),
            Err(WorkError::Database(_)) => response!(internal_server_error),
            Err(WorkError::Calculating) => response!(calculating),
        }
    }

    #[oai(path = "/servers/:server_id/maps/:map_name/analyze", method = "get")]
    async fn get_maps_highlight(
        &self, Data(app): Data<&AppData>, extract: MapExtractor
    ) -> Response<MapAnalyze>{
        let context = MapContext::from(extract);

        match app.map_worker.get_statistics(&context).await {
            Ok(result) => response!(ok result),
            Err(WorkError::NotFound) => response!(err "No map found", ErrorCode::NotFound),
            Err(WorkError::Database(_)) => response!(internal_server_error),
            Err(WorkError::Calculating) => response!(calculating),
        }
    }
    #[oai(path = "/servers/:server_id/maps/:map_name/sessions", method="get")]
    async fn get_maps_sessions(
        &self, Data(app): Data<&AppData>, extract: MapExtractor, Query(page): Query<usize>
    ) -> Response<ServerMapPlayedPaginated>{
        let context = MapContext::from(extract);

        match app.map_worker.get_sessions(&context, page).await {
            Ok(result) => response!(ok result),
            Err(WorkError::NotFound) => response!(err "No map found", ErrorCode::NotFound),
            Err(WorkError::Database(_)) => response!(internal_server_error),
            Err(WorkError::Calculating) => response!(calculating),
        }
    }

    #[oai(path="/servers/:server_id/sessions/:session_id/players", method="get")]
    async fn get_map_player_session(
        &self, data: Data<&AppData>, ServerExtractor(server): ServerExtractor, session_id: Path<i64>
    ) -> Response<Vec<PlayerBrief>>{
        let pool = &*data.pool.clone();
        let time_id =  session_id.0 as i32;
        let func = async || {
            sqlx::query_as!(DbPlayerBrief, "
                WITH params AS (
                    SELECT $2::INTEGER AS time_id,
                    $1 AS target_server,
                    CURRENT_TIMESTAMP AS right_now
                ), timespent AS (
                    SELECT
                        pss.player_id, SUM(
                        LEAST(pss.ended_at, smp.ended_at) - GREATEST(pss.started_at, smp.started_at)
                    ) AS total
                    FROM public.server_map_played smp
                    INNER JOIN player_server_session pss
                    ON pss.started_at < COALESCE(smp.ended_at, (SELECT right_now FROM params))
                        AND COALESCE(pss.ended_at, (SELECT right_now FROM params)) > smp.started_at
                    WHERE smp.time_id = (SELECT time_id FROM params)
                        AND pss.server_id=(SELECT target_server FROM params)
                    GROUP BY pss.player_id
                ),
                online_players AS (
                    SELECT player_id, started_at
                    FROM player_server_session
                    WHERE server_id=(SELECT target_server FROM params)
                        AND ended_at IS NULL
                        AND ((SELECT right_now FROM params) - started_at) < INTERVAL '12 hours'
                ),
                last_player_sessions AS (
                    SELECT DISTINCT ON (player_id) player_id, started_at, ended_at
                    FROM player_server_session
                    WHERE ended_at IS NOT NULL
                    ORDER BY player_id, started_at DESC
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
        let key = format!("map_player_session:{}:{}", server.server_id, session_id.0);
        let Ok(rows) = cached_response(&key, &data.cache, DAY, func).await else {
            tracing::warn!("Couldn't get player session");
            return  response!(ok vec![])
        };

        let mut players: Vec<PlayerBrief> = rows.result.iter_into();
        if !rows.is_new{
            update_online_brief(&pool, &data.cache, &server.server_id, &mut players).await;
        }
        response!(ok players)
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
                WHERE time_id = $2 AND server_id=$1;
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

        match app.map_worker.get_events(&context).await {
            Ok(result) => response!(ok result),
            Err(WorkError::NotFound) => response!(err "No map found", ErrorCode::NotFound),
            Err(WorkError::Database(_)) => response!(internal_server_error),
            Err(WorkError::Calculating) => response!(calculating),
        }
    }
    #[oai(path="/servers/:server_id/maps/:map_name/heat-regions", method="get")]
    async fn get_heat_regions(
        &self, Data(app): Data<&AppData>, extract: MapExtractor
    ) -> Response<Vec<DailyMapRegion>> {
        let context = MapContext::from(extract);

        match app.map_worker.get_heat_regions(&context).await {
            Ok(result) => response!(ok result),
            Err(WorkError::NotFound) => response!(err "No map found", ErrorCode::NotFound),
            Err(WorkError::Database(_)) => response!(internal_server_error),
            Err(WorkError::Calculating) => response!(calculating),
        }
    }
    #[oai(path="/servers/:server_id/maps/:map_name/regions", method="get")]
    async fn get_map_regions(
        &self, Data(app): Data<&AppData>, extract: MapExtractor
    ) -> Response<Vec<MapRegion>>{
        let context = MapContext::from(extract);

        match app.map_worker.get_regions(&context).await {
            Ok(result) => response!(ok result),
            Err(WorkError::NotFound) => response!(err "No map found", ErrorCode::NotFound),
            Err(WorkError::Database(_)) => response!(internal_server_error),
            Err(WorkError::Calculating) => response!(calculating),
        }
    }
    #[oai(path="/servers/:server_id/maps/:map_name/sessions_distribution", method="get")]
    async fn get_map_sessions_distribution(
        &self, Data(app): Data<&AppData>, extract: MapExtractor
    ) -> Response<Vec<MapSessionDistribution>>{
        let context = MapContext::from(extract);

        match app.map_worker.get_session_distributions(&context).await {
            Ok(result) => response!(ok result),
            Err(WorkError::NotFound) => response!(err "No map found", ErrorCode::NotFound),
            Err(WorkError::Database(_)) => response!(internal_server_error),
            Err(WorkError::Calculating) => response!(calculating),
        }
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
            "/servers/{server_id}/sessions/{session_id}/players",
            "/servers/{server_id}/sessions/{session_id}/match"
        ].iter_into()
    }
}