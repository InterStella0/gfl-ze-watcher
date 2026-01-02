use std::fmt::{Display, Formatter};
use poem::http::StatusCode;
use poem::web::{Data, Json};
use poem_openapi::{Enum, OpenApi};
use poem_openapi::param::{Path, Query};
use poem_openapi::types::{ParseFromJSON, ToJSON};
use serde::{Deserialize, Serialize};
use sqlx::{Pool, Postgres};
use crate::{response, AppData, FastCache};
use crate::core::model::{DataVoteType, DbAnyMap, DbAssociatedMapMusic, DbContinentStatistic, DbGuide, DbGuideBrief, DbGuideComment, DbGuideCommentBrief, DbMap, DbMapIsPlaying, DbMapLastPlayed, DbPlayerBrief, DbServer, DbServerMap, DbServerMapPlayed, DbServerMatch, DbServerSessionMatch};
use crate::core::api_models::{ContinentStatistics, ReportMapMusicDto, CreateGuideDto, CreateUpdateCommentDto, DailyMapRegion, ErrorCode, Guide, GuideComment, GuideCommentPaginated, GuidesPaginated, MapAnalyze, MapEventAverage, MapInfo, MapPlayedPaginated, MapPlayerTypeTime, MapRegion, MapSessionDistribution, MapSessionMatch, PlayerBrief, ReportGuideDto, Response, RoutePattern, ServerExtractor, ServerMap, ServerMapMatch, ServerMapMusic, ServerMapPlayed, ServerMapPlayedPaginated, UpdateGuideDto, UriPatternExt, VoteDto};
use crate::core::utils::{cached_response, check_superuser, check_user_guide_ban, db_to_utc, generate_unique_guide_slug, get_map_image, get_map_images, get_server, handle_worker_result, update_online_brief, CacheKey, IterConvert, MapImage, OptionalTokenBearer, TokenBearer, DAY};
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
#[derive(Enum)]
enum GuideSortType {
    TopRated,
    Newest,
    Oldest,
    MostDiscussed
}


impl Display for GuideSortType {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            GuideSortType::MostDiscussed => write!(f, "most_discussed"),
            GuideSortType::Newest => write!(f, "newest"),
            GuideSortType::Oldest => write!(f, "oldest"),
            GuideSortType::TopRated => write!(f, "top_rated"),
        }
    }
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
async fn get_any_map(pool: &Pool<Postgres>, cache: &FastCache, map_name: &str) -> Option<DbAnyMap> {
    let func = || sqlx::query_as!(DbAnyMap,
            "SELECT map
                FROM server_map
                WHERE map=$1
                LIMIT 1",
            map_name
        )
        .fetch_one(pool);

    let key = format!("any-map-exist:{map_name}");
    cached_response(&key, cache, 60 * 60, func).await.and_then(|s| Ok(s.result)).ok()
}
async fn get_any_guide(pool: &Pool<Postgres>, cache: &FastCache, map_name: &str, guide_id: &str) -> Option<DbGuideBrief> {
    let func = || sqlx::query_as!(DbGuideBrief,
            "SELECT id,
                map_name,
                server_id,
                author_id
            FROM website.guides
            WHERE id=$1::TEXT::UUID AND map_name=$2
            LIMIT 1",
            guide_id, map_name
        )
        .fetch_one(pool);

    let key = format!("any-guide-exist:{map_name}:{guide_id}");
    cached_response(&key, cache, 60, func).await.and_then(|s| Ok(s.result)).ok()
}
async fn get_any_guide_slug(pool: &Pool<Postgres>, cache: &FastCache, map_name: &str, guide_slug: &str) -> Option<DbGuideBrief> {
    let func = || sqlx::query_as!(DbGuideBrief,
            "SELECT id,
                map_name,
                server_id,
                author_id
            FROM website.guides
            WHERE slug=$1 AND map_name=$2
            LIMIT 1",
            guide_slug, map_name
        )
        .fetch_one(pool);

    let key = format!("any-guide-slug-exist:{map_name}:{guide_slug}");
    cached_response(&key, cache, 60, func).await.and_then(|s| Ok(s.result)).ok()
}

async fn get_comment(pool: &Pool<Postgres>, cache: &FastCache, guide_id: &str, comment_id: &str) -> Option<DbGuideCommentBrief> {
    let func = || sqlx::query_as!(DbGuideCommentBrief,
            "SELECT id,
                guide_id,
                author_id
            FROM website.guide_comments
            WHERE id=$1::TEXT::UUID AND guide_id=$2::TEXT::UUID
            LIMIT 1",
            comment_id, guide_id
        )
        .fetch_one(pool);

    let key = format!("comment-exist:{guide_id}:{comment_id}");
    cached_response(&key, cache, 60, func).await.and_then(|s| Ok(s.result)).ok()
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
struct BasicMapExtractor{
    pub map: DbAnyMap
}
impl<'a> poem::FromRequest<'a> for BasicMapExtractor {
    async fn from_request(req: &'a poem::Request, _body: &mut poem::RequestBody) -> poem::Result<Self> {
        let map_name = req.raw_path_param("map_name")
            .ok_or_else(|| poem::Error::from_string("Invalid map_name", StatusCode::BAD_REQUEST))?;

        let data: &AppData = req.data()
            .ok_or_else(|| poem::Error::from_string("Invalid data", StatusCode::BAD_REQUEST))?;

        let Some(map) = get_any_map(&data.pool, &data.cache, map_name).await else {
            return Err(poem::Error::from_string("Map not found", StatusCode::NOT_FOUND))
        };

        Ok(BasicMapExtractor{
            map
        })
    }
}
struct GuideExtractor{
    pub map: DbAnyMap,
    pub guide: DbGuideBrief,
}
impl<'a> poem::FromRequest<'a> for GuideExtractor {
    async fn from_request(req: &'a poem::Request, _body: &mut poem::RequestBody) -> poem::Result<Self> {
        let map_name = req.raw_path_param("map_name")
            .ok_or_else(|| poem::Error::from_string("Invalid map_name", StatusCode::BAD_REQUEST))?;
        let guide_id = req.raw_path_param("guide_id")
            .ok_or_else(|| poem::Error::from_string("Invalid guide_id", StatusCode::BAD_REQUEST))?;

        let data: &AppData = req.data()
            .ok_or_else(|| poem::Error::from_string("Invalid data", StatusCode::BAD_REQUEST))?;

        let Some(map) = get_any_map(&data.pool, &data.cache, map_name).await else {
            return Err(poem::Error::from_string("Map not found", StatusCode::NOT_FOUND))
        };
        let Some(guide) = get_any_guide(&data.pool, &data.cache, &map.map, guide_id).await else {
            return Err(poem::Error::from_string("Guide not found", StatusCode::NOT_FOUND))
        };

        Ok(GuideExtractor { map, guide })
    }
}
struct GuideSlugExtractor{
    pub map: DbAnyMap,
    pub guide: DbGuideBrief,
}
impl<'a> poem::FromRequest<'a> for GuideSlugExtractor {
    async fn from_request(req: &'a poem::Request, _body: &mut poem::RequestBody) -> poem::Result<Self> {
        let map_name = req.raw_path_param("map_name")
            .ok_or_else(|| poem::Error::from_string("Invalid map_name", StatusCode::BAD_REQUEST))?;
        let guide_slug = req.raw_path_param("guide_slug")
            .ok_or_else(|| poem::Error::from_string("Invalid guide_slug", StatusCode::BAD_REQUEST))?;

        let data: &AppData = req.data()
            .ok_or_else(|| poem::Error::from_string("Invalid data", StatusCode::BAD_REQUEST))?;

        let Some(map) = get_any_map(&data.pool, &data.cache, map_name).await else {
            return Err(poem::Error::from_string("Map not found", StatusCode::NOT_FOUND))
        };
        let Some(guide) = get_any_guide_slug(&data.pool, &data.cache, &map.map, guide_slug).await else {
            return Err(poem::Error::from_string("Guide not found", StatusCode::NOT_FOUND))
        };

        Ok(GuideSlugExtractor { map, guide })
    }
}

struct GuideCommentExtractor{
    #[allow(dead_code)]
    pub guide: DbGuideBrief,
    pub comment: DbGuideCommentBrief
}
impl<'a> poem::FromRequest<'a> for GuideCommentExtractor {
    async fn from_request(req: &'a poem::Request, _body: &mut poem::RequestBody) -> poem::Result<Self> {
        let map_name = req.raw_path_param("map_name")
            .ok_or_else(|| poem::Error::from_string("Invalid map_name", StatusCode::BAD_REQUEST))?;
        let guide_id = req.raw_path_param("guide_id")
            .ok_or_else(|| poem::Error::from_string("Invalid guide_id", StatusCode::BAD_REQUEST))?;
        let comment_id = req.raw_path_param("comment_id")
            .ok_or_else(|| poem::Error::from_string("Invalid comment_id", StatusCode::BAD_REQUEST))?;

        let data: &AppData = req.data()
            .ok_or_else(|| poem::Error::from_string("Invalid data", StatusCode::BAD_REQUEST))?;

        let Some(map) = get_any_map(&data.pool, &data.cache, map_name).await else {
            return Err(poem::Error::from_string("Map not found", StatusCode::NOT_FOUND))
        };
        let Some(guide) = get_any_guide(&data.pool, &data.cache, &map.map, guide_id).await else {
            return Err(poem::Error::from_string("Guide not found", StatusCode::NOT_FOUND))
        };
        let Some(comment) = get_comment(&data.pool, &data.cache, guide_id, comment_id).await else {
            return Err(poem::Error::from_string("Guide not found", StatusCode::NOT_FOUND))
        };

        Ok(GuideCommentExtractor { comment, guide })
    }
}
fn handle_worker_map_result<T>(result: WorkResult<T>) -> Response<T>
    where T: ParseFromJSON + ToJSON + Send + Sync{
    handle_worker_result(result, "No map found")
}

pub struct MapApi;

#[OpenApi]
impl MapApi{
    #[oai(path = "/servers/:server_id/maps", method = "get")]
    async fn get_all_maps(
        &self, Data(data): Data<&AppData>, ServerExtractor(server): ServerExtractor
    ) -> Response<Vec<ServerMap>>{
        let Ok(result) = sqlx::query_as!(DbMap, "
            SELECT server_id, map
            FROM server_map
            WHERE server_id = $1
        ", server.server_id
        ).fetch_all(&*data.pool.clone()).await else {
            return response!(ok vec![])
        };
        response!(ok result.iter_into())
    }
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
                sm.removed,
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
                        WHEN $7 = 'available' THEN (sm.current_cooldown IS NULL OR CURRENT_TIMESTAMP > sm.current_cooldown) AND sm.enabled AND NOT sm.removed
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
    #[oai(path = "/servers/:server_id/maps/:map_name/musics", method = "get")]
    async fn get_maps_all_musics(
        &self, data: Data<&AppData>, extract: MapExtractor) -> Response<Vec<ServerMapMusic>>{
        let pool = &*data.pool.clone();
        let Ok(rows) = sqlx::query_as!(DbAssociatedMapMusic,
                "WITH form_associated_maps AS (
                    SELECT
                        amm.map_name AS current_map,
                        mm.*,
                        COALESCE(
                            ARRAY_AGG(amm2.map_name ORDER BY amm2.map_name)
                                FILTER (WHERE amm2.map_name IS NOT NULL),
                            ARRAY[]::text[]
                        ) AS other_maps
                    FROM associated_map_music amm
                    JOIN map_music mm
                        ON mm.id = amm.map_music_id
                    LEFT JOIN associated_map_music amm2
                        ON amm.map_music_id = amm2.map_music_id
                       AND amm.map_name <> amm2.map_name
                    WHERE amm.map_name = $1
                    GROUP BY amm.map_name, mm.id
                )
                SELECT amm.map_music_id AS id,
                    music_name,
                    duration,
                    youtube_music,
                    source,
                    map_name,
                    other_maps,
                    tags,
                    yt_source,
                    COALESCE(su.persona_name, NULL) AS yt_source_name
                FROM associated_map_music amm
                LEFT JOIN form_associated_maps fam ON fam.id=amm.map_music_id
                LEFT JOIN website.steam_user su ON su.user_id=yt_source
                WHERE amm.map_name = $1 AND music_name <> ''
                ",
				extract.map.map)
            .fetch_all(pool)
            .await else {
            return response!(internal_server_error)
        };

        response!(ok rows.iter_into())
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
    #[oai(path="/servers/:server_id/guides", method="get")]
    async fn get_all_map_guides(
        &self, Data(app): Data<&AppData>, ServerExtractor(server): ServerExtractor, OptionalTokenBearer(user): OptionalTokenBearer,
        Query(page): Query<usize>
    ) -> Response<GuidesPaginated> {
        let pool = &*app.pool.clone();
        let pagination = 10;
        let offset = pagination * page as i64;
        let optional_user_id = user.map(|u| u.id);
        let data = match sqlx::query_as!(DbGuide, "
              WITH ranked_guides AS (
                  SELECT g.id,
                      g.map_name,
                      g.server_id,
                      g.title,
                      g.content,
                      g.category,
                      g.created_at,
                      g.updated_at,
                      g.upvotes,
                      g.downvotes,
                      g.comment_count,
                      gv.vote_type,
                      g.author_id,
                      g.slug,
                      su.persona_name AS author_name,
                      su.avatar AS author_avatar,
                      ROW_NUMBER() OVER (PARTITION BY g.map_name ORDER BY g.upvotes DESC) AS rn
                  FROM website.guides g
                  JOIN server_map sm ON sm.server_id = $1 AND sm.map = g.map_name
                  LEFT JOIN website.steam_user su ON su.user_id = g.author_id
                  LEFT JOIN website.guide_votes gv ON gv.user_id = $2 AND gv.guide_id = g.id
                  WHERE g.server_id=$1 OR g.server_id IS NULL
              )
              SELECT id,
                  map_name,
                  server_id,
                  title,
                  content,
                  category,
                  created_at,
                  updated_at,
                  upvotes,
                  slug,
                  downvotes,
                  comment_count,
                  vote_type AS \"user_vote: Option<DataVoteType>\",
                  author_id,
                  author_name,
                  author_avatar,
                  COUNT(*) OVER()::integer AS total_guides
              FROM ranked_guides
              WHERE rn = 1
              ORDER BY upvotes DESC
              LIMIT 10
              OFFSET $3
            ", server.server_id, optional_user_id, offset).fetch_all(pool).await {
            Ok(r) => r,
            Err(_) => {
                return response!(internal_server_error)
            }
        };

        let total_guides = data
            .first()
            .and_then(|e| e.total_guides)
            .unwrap_or_default();
        let guides = data.iter_into();
        let paginated = GuidesPaginated{ total_guides, guides };
        response!(ok paginated)
    }

    #[oai(path="/maps/:map_name/guides", method="get")]
    async fn get_map_guides(
        &self, Data(app): Data<&AppData>, extract: BasicMapExtractor, OptionalTokenBearer(user): OptionalTokenBearer,
        Query(page): Query<usize>, Query(category): Query<Option<String>>, Query(sort): Query<GuideSortType>,
        Query(server_id): Query<Option<String>>
    ) -> Response<GuidesPaginated>{
        let pool = &*app.pool.clone();
        let pagination = 10;
        let offset = pagination * page as i64;
        let optional_user_id = user.map(|u| u.id);
        let sort_by = sort.to_string();
        let data = match sqlx::query_as!(DbGuide, "
            SELECT g.id,
                g.map_name,
                g.server_id,
                g.title,
                g.content,
                g.category,
                g.created_at,
                g.updated_at,
                g.upvotes,
                g.downvotes,
                g.comment_count,
                g.slug,
                gv.vote_type AS \"user_vote: Option<DataVoteType>\",
                g.author_id,
                su.persona_name AS author_name,
                su.avatar AS author_avatar,
                COUNT(*) OVER()::integer total_guides
            FROM website.guides g
            LEFT JOIN website.steam_user su ON su.user_id=g.author_id
            LEFT JOIN website.guide_votes gv ON gv.user_id=$2 AND gv.guide_id=g.id
            WHERE map_name = $1
              AND ($5::TEXT IS NULL OR g.category = $5::TEXT)
              AND (g.server_id IS NULL OR ($6::TEXT IS NULL OR g.server_id = $6::TEXT))
            ORDER BY
               CASE
                   WHEN $4 = 'most_discussed' THEN g.comment_count
               END DESC,
               CASE
                   WHEN $4 = 'newest' THEN g.created_at
               END DESC,
               CASE
                   WHEN $4 = 'oldest' THEN g.created_at
               END,
               CASE
                   WHEN $4 = 'top_rated' THEN g.upvotes
               END DESC
            LIMIT 10
            OFFSET $3
            ", extract.map.map, optional_user_id, offset, sort_by, category, server_id).fetch_all(pool).await {
            Ok(r) => r,
            Err(_) => {
                return response!(internal_server_error)
            }
        };

        let total_guides = data
            .first()
            .and_then(|e| e.total_guides)
            .unwrap_or_default();
        let guides = data.iter_into();
        let paginated = GuidesPaginated{ total_guides, guides };
        response!(ok paginated)
    }
    #[oai(path="/maps/:map_name/guides", method="post")]
    async fn create_map_guide(
        &self, Data(app): Data<&AppData>, extract: BasicMapExtractor, TokenBearer(user_token): TokenBearer,
        Json(payload): Json<CreateGuideDto>
    ) -> Response<Guide>{
        let pool = &*app.pool.clone();
        let user_id = user_token.id;
        let map_name = extract.map.map;

        // Check if user is banned from creating guides
        let ban = sqlx::query!(
            r#"
            SELECT reason FROM website.guide_user_ban
            WHERE user_id = $1 AND is_active = true
            AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            "#,
            user_id
        )
        .fetch_optional(pool)
        .await;

        if let Ok(Some(ban_record)) = ban {
            let reason = format!("You are banned from creating guides. Reason: {}", ban_record.reason);
            return response!(err &reason, ErrorCode::Forbidden);
        }

        let title_len = payload.title.trim().len();
        if title_len <= 5 || title_len >= 200 {
            return response!(err "Title must be between 5 and 200 characters", ErrorCode::BadRequest);
        }

        let content_len = payload.content.trim().len();
        if content_len <= 50 {
            return response!(err "Content must be bigger than 50 characters", ErrorCode::BadRequest);
        }

        if payload.category.trim().is_empty() {
            return response!(err "Category cannot be empty", ErrorCode::BadRequest);
        }

        let server_id = match payload.server_id {
            Some(s_id) => {
                let Some(s) = get_server(&app.pool, &app.cache, &s_id).await else {
                    return response!(err "Server not found", ErrorCode::BadRequest);
                };
                Some(s.server_id)
            },
            None => None,
        };

        // Generate unique slug from title
        let slug = match generate_unique_guide_slug(pool, &map_name, &payload.title).await {
            Ok(s) => s,
            Err(e) => {
                tracing::error!("Failed to generate slug: {}", e);
                return response!(err "Failed to generate slug", ErrorCode::InternalServerError);
            }
        };

        let Ok(guide_brief) = sqlx::query_as!(DbGuideBrief,
            "INSERT INTO website.guides (map_name, title, content, category, author_id, server_id, slug)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, map_name, server_id, author_id",
            map_name, payload.title, payload.content, payload.category, user_id, server_id, slug
        )
        .fetch_one(pool)
        .await else {
            return response!(err "Failed to create guide", ErrorCode::InternalServerError)
        };

        let Ok(guide) = sqlx::query_as!(DbGuide, "
            SELECT g.id,
                g.map_name,
                g.server_id,
                g.title,
                g.content,
                g.category,
                g.created_at,
                g.updated_at,
                g.upvotes,
                g.slug,
                g.downvotes,
                g.comment_count,
                NULL AS \"user_vote: DataVoteType\",
                g.author_id AS author_id,
                su.persona_name AS author_name,
                su.avatar AS author_avatar,
                COALESCE(0, null) AS total_guides
            FROM website.guides g
            LEFT JOIN website.steam_user su ON su.user_id=g.author_id
            WHERE g.id=$1
            LIMIT 1
        ", guide_brief.id).fetch_one(pool).await else {
            return response!(err "Failed to fetch created guide", ErrorCode::InternalServerError)
        };

        response!(ok guide.into())
    }

    #[oai(path="/maps/:map_name/guides/slugs/:guide_slug", method="get")]
    async fn get_map_guide_slug(&self, Data(app): Data<&AppData>, extract: GuideSlugExtractor, OptionalTokenBearer(user): OptionalTokenBearer) -> Response<Guide>{
        let pool = &*app.pool.clone();
        let optional_user_id = user.map(|u| u.id);
        let data = match sqlx::query_as!(DbGuide, "
            SELECT g.id,
                g.map_name,
                g.server_id,
                g.title,
                g.content,
                g.category,
                g.created_at,
                g.updated_at,
                g.upvotes,
                g.downvotes,
                g.comment_count,
                gv.vote_type AS \"user_vote: Option<DataVoteType>\",
                g.author_id AS author_id,
                su.persona_name AS author_name,
                su.avatar AS author_avatar,
                g.slug,
                COALESCE(0, null) AS total_guides
            FROM website.guides g
            LEFT JOIN website.steam_user su ON su.user_id=g.author_id
            LEFT JOIN website.guide_votes gv ON gv.user_id=$3 AND gv.guide_id=g.id
            WHERE g.id=$1 AND map_name=$2
            LIMIT 1
        ", extract.guide.id, extract.map.map, optional_user_id).fetch_one(pool).await {
            Ok(data) => data,
            Err(e) => {
                println!("ERROR DbGuide {e}");
                return response!(internal_server_error)
            }
        };
        response!(ok data.into())
    }
    #[oai(path="/maps/:map_name/guides/:guide_id", method="get")]
    async fn get_map_guide(&self, Data(app): Data<&AppData>, extract: GuideExtractor, OptionalTokenBearer(user): OptionalTokenBearer) -> Response<Guide>{
        let pool = &*app.pool.clone();
        let optional_user_id = user.map(|u| u.id);
        let data = match sqlx::query_as!(DbGuide, "
            SELECT g.id,
                g.map_name,
                g.server_id,
                g.title,
                g.content,
                g.category,
                g.created_at,
                g.updated_at,
                g.upvotes,
                g.downvotes,
                g.comment_count,
                gv.vote_type AS \"user_vote: Option<DataVoteType>\",
                g.author_id AS author_id,
                su.persona_name AS author_name,
                su.avatar AS author_avatar,
                g.slug,
                COALESCE(0, null) AS total_guides
            FROM website.guides g
            LEFT JOIN website.steam_user su ON su.user_id=g.author_id
            LEFT JOIN website.guide_votes gv ON gv.user_id=$3 AND gv.guide_id=g.id
            WHERE g.id=$1 AND map_name=$2
            LIMIT 1
        ", extract.guide.id, extract.map.map, optional_user_id).fetch_one(pool).await {
            Ok(data) => data,
            Err(e) => {
                println!("ERROR DbGuide {e}");
                return response!(internal_server_error)
            }
        };
        response!(ok data.into())
    }

    #[oai(path="/maps/:map_name/guides/:guide_id", method="put")]
    async fn edit_map_guide(
        &self, Data(app): Data<&AppData>, extract: GuideExtractor, TokenBearer(user_token): TokenBearer,
        Json(payload): Json<UpdateGuideDto>
    ) -> Response<Guide>{
        let pool = &*app.pool.clone();
        let user_id = user_token.id;
        let guide_id = extract.guide.id;

        // Check if user is banned
        if let Ok(Some(reason)) = check_user_guide_ban(pool, user_id).await {
            let msg = format!("You are banned from editing guides. Reason: {}", reason);
            return response!(err &msg, ErrorCode::Forbidden);
        }

        if extract.guide.author_id != user_id {
            return response!(err "You are not authorized to edit this guide", ErrorCode::Forbidden)
        }

        if payload.title.is_none() && payload.content.is_none() && payload.category.is_none() {
            return response!(err "No fields to update", ErrorCode::BadRequest)
        }
        if let Some(title) = payload.title.as_deref(){
            let title_len = title.trim().len();
            if title_len <= 5 || title_len >= 200 {
                return response!(err "Title must be between 5 and 200 characters", ErrorCode::BadRequest);
            }
        }

        if let Some(content) = payload.content.as_deref(){
            let content_len = content.trim().len();
            if content_len <= 50 {
                return response!(err "Content must be bigger than 50 characters", ErrorCode::BadRequest);
            }
        }

        if let Some(category) = payload.category.as_deref(){
            if category.trim().is_empty()  {
                return response!(err "Category cannot be empty", ErrorCode::BadRequest);
            }
        }
        if let Some(s_id) = payload.server_id.clone().flatten() {
            if let None = get_server(&app.pool, &app.cache, &s_id).await {
                return response!(err "Server not found", ErrorCode::BadRequest);
            }
        }
        let _r = match sqlx::query!(
            "UPDATE website.guides
             SET title = COALESCE($2, title),
                 content = COALESCE($3, content),
                 category = COALESCE($4, category),
                 server_id = CASE WHEN $5::boolean THEN $6 ELSE server_id END,
                 updated_at = NOW()
             WHERE id = $1",
            guide_id,
            payload.title,
            payload.content,
            payload.category,
            payload.server_id.is_some(),  // Flag if server_id was provided
            payload.server_id.flatten()   // The actual value (None means global)
        )
        .execute(pool)
        .await {
            Ok(s) => s,
            Err(e) => {
                println!("FAILED TO UPDATE GUIDE {e}");
                return response!(err "Failed to update guide", ErrorCode::InternalServerError)
            }
        };

        let Ok(updated_guide) = sqlx::query_as!(DbGuide, "
            SELECT g.id,
                g.map_name,
                g.server_id,
                g.title,
                g.content,
                g.category,
                g.created_at,
                g.updated_at,
                g.upvotes,
                g.downvotes,
                g.comment_count,
                NULL AS \"user_vote: DataVoteType\",
                g.author_id AS author_id,
                su.persona_name AS author_name,
                su.avatar AS author_avatar,
                g.slug,
                COALESCE(0, null) AS total_guides
            FROM website.guides g
            LEFT JOIN website.steam_user su ON su.user_id=g.author_id
            WHERE g.id=$1
            LIMIT 1
        ", guide_id).fetch_one(pool).await else {
            return response!(err "Failed to fetch updated guide", ErrorCode::InternalServerError)
        };

        response!(ok updated_guide.into())
    }

    #[oai(path="/maps/:map_name/guides/:guide_id", method="delete")]
    async fn delete_map_guide(&self, Data(app): Data<&AppData>, extract: GuideExtractor, TokenBearer(user_token): TokenBearer) -> Response<Guide>{
        let guide = extract.guide;
        if guide.author_id != user_token.id {
            if !check_superuser(app, user_token.id).await{
                return response!(err "You're not authorized!", ErrorCode::Forbidden)
            }
        }
        let Ok(updated_guide) = sqlx::query_as!(DbGuide, "
            SELECT g.id,
                g.map_name,
                g.server_id,
                g.title,
                g.content,
                g.category,
                g.created_at,
                g.updated_at,
                g.upvotes,
                g.downvotes,
                g.comment_count,
                NULL AS \"user_vote: DataVoteType\",
                g.author_id AS author_id,
                su.persona_name AS author_name,
                su.avatar AS author_avatar,
                g.slug,
                COALESCE(0, null) AS total_guides
            FROM website.guides g
            LEFT JOIN website.steam_user su ON su.user_id=g.author_id
            WHERE g.id=$1
            LIMIT 1
        ", guide.id).fetch_one(&*app.pool).await else {
            return response!(err "Failed to fetch delete guide", ErrorCode::InternalServerError)
        };
        let Ok(_) = sqlx::query!("
            DELETE FROM website.guides g
            WHERE g.id=$1
        ", guide.id).execute(&*app.pool).await else {
            return response!(err "Failed to fetch delete guide", ErrorCode::InternalServerError)
        };
        response!(ok updated_guide.into())
    }

    #[oai(path="/maps/:map_name/guides/:guide_id/report", method="post")]
    async fn report_map_guide(
        &self, Data(app): Data<&AppData>, extract: GuideExtractor, TokenBearer(user_token): TokenBearer,
        Json(payload): Json<ReportGuideDto>
    ) -> Response<String>{
        let pool = &*app.pool.clone();
        let user_id = user_token.id;
        let guide_id = extract.guide.id;

        let Ok(_) = sqlx::query!(
            "INSERT INTO website.report_guide(guide_id, user_id, reason, details)
             VALUES ($1, $2, $3, $4)",
            guide_id,
            user_id,
            payload.reason,
            payload.details
        )
        .execute(pool)
        .await else {
            return response!(err "Failed to submit report", ErrorCode::InternalServerError)
        };

        response!(ok "OK".into())
    }

    #[oai(path="/maps/:map_name/guides/:guide_id/comments/:comment_id/report", method="post")]
    async fn report_map_guide_comment(
        &self, Data(app): Data<&AppData>, extract: GuideCommentExtractor, TokenBearer(user_token): TokenBearer,
        Json(payload): Json<ReportGuideDto>
    ) -> Response<String>{
        let pool = &*app.pool.clone();
        let user_id = user_token.id;
        let comment_id = extract.comment.id;

        let Ok(_) = sqlx::query!(
            "INSERT INTO website.report_guide_comment(comment_id, user_id, reason, details)
             VALUES ($1, $2, $3, $4)",
            comment_id,
            user_id,
            payload.reason,
            payload.details
        )
        .execute(pool)
        .await else {
            return response!(err "Failed to submit report", ErrorCode::InternalServerError)
        };

        response!(ok "OK".into())
    }

    #[oai(path="/music/:music_id/report", method="post")]
    async fn report_map_music(
        &self,
        Data(app): Data<&AppData>,
        Path(music_id): Path<String>,
        TokenBearer(user_token): TokenBearer,
        Json(payload): Json<ReportMapMusicDto>
    ) -> Response<String> {
        let pool = &*app.pool.clone();
        let user_id = user_token.id;

        // Validate music_id is valid UUID
        let Ok(music_uuid) = uuid::Uuid::parse_str(&music_id) else {
            return response!(err "Invalid music ID", ErrorCode::BadRequest);
        };

        // Validate reason
        if !["video_unavailable", "wrong_video"].contains(&payload.reason.as_str()) {
            return response!(err "Invalid reason. Must be 'video_unavailable' or 'wrong_video'", ErrorCode::BadRequest);
        }

        // Optional: Validate YouTube URL format if provided
        if let Some(ref url) = payload.suggested_youtube_url {
            if !url.is_empty() && !url.contains("youtube.com") && !url.contains("youtu.be") {
                return response!(err "Invalid YouTube URL format", ErrorCode::BadRequest);
            }
        }

        // Get current youtube_music value for snapshot
        let current_youtube_music = match sqlx::query_scalar!(
            "SELECT youtube_music FROM map_music WHERE id = $1",
            music_uuid
        )
        .fetch_optional(pool)
        .await
        {
            Ok(Some(yt)) => yt,
            Ok(None) => return response!(err "Music track not found", ErrorCode::NotFound),
            Err(e) => {
                tracing::error!("Failed to fetch music: {}", e);
                return response!(internal_server_error);
            }
        };

        // Insert report
        let result = sqlx::query!(
            "INSERT INTO website.report_map_music(music_id, user_id, reason, details, suggested_youtube_url, current_youtube_music)
             VALUES ($1, $2, $3, $4, $5, $6)",
            music_uuid,
            user_id,
            payload.reason,
            payload.details,
            payload.suggested_youtube_url,
            current_youtube_music
        )
        .execute(pool)
        .await;

        match result {
            Ok(_) => response!(ok "OK".into()),
            Err(e) => {
                // Check for duplicate constraint violation
                if e.to_string().contains("unique_pending_music_report") {
                    return response!(err "You already have a pending report for this music track", ErrorCode::BadRequest);
                }
                tracing::error!("Failed to submit music report: {}", e);
                response!(internal_server_error)
            }
        }
    }

    #[oai(path="/maps/:map_name/guides/:guide_id/vote", method="post")]
    async fn vote_map_guide(
        &self, Data(app): Data<&AppData>, extract: GuideExtractor,
        TokenBearer(user_token): TokenBearer, Json(payload): Json<VoteDto>
    ) -> Response<Guide>{
        let pool = &*app.pool.clone();
        let user_id = user_token.id;
        let guide_id = extract.guide.id;

        // Check if user is banned
        if let Ok(Some(reason)) = check_user_guide_ban(pool, user_id).await {
            let msg = format!("You are banned from voting. Reason: {}", reason);
            return response!(err &msg, ErrorCode::Forbidden);
        }

        let Ok(author_id) = sqlx::query_scalar!(
            "SELECT author_id FROM website.guides WHERE id=$1",
            guide_id
        )
        .fetch_one(pool)
        .await else {
            return response!(err "Guide not found", ErrorCode::NotFound)
        };

        if author_id == user_id {
            return response!(err "You cannot vote on your own guide", ErrorCode::Forbidden)
        }

        let vote_type: DataVoteType = payload.vote_type.into();

        let _ = match sqlx::query!(
            "INSERT INTO website.guide_votes (guide_id, user_id, vote_type)
             VALUES ($1, $2, $3)
             ON CONFLICT (guide_id, user_id)
             DO UPDATE SET vote_type = EXCLUDED.vote_type, created_at = NOW()",
            guide_id,
            user_id,
            vote_type as DataVoteType
        )
        .execute(pool)
        .await {
            Ok(a) => a,
            Err(e) => {
                println!("ERROR VOTING {e}");
                return response!(err "Failed to record vote", ErrorCode::InternalServerError)
            }
        };
        let Ok(updated_guide) = sqlx::query_as!(DbGuide, "
            SELECT g.id,
                g.map_name,
                g.server_id,
                g.title,
                g.content,
                g.category,
                g.created_at,
                g.updated_at,
                g.upvotes,
                g.downvotes,
                g.comment_count,
                gv.vote_type AS \"user_vote: Option<DataVoteType>\",
                g.author_id AS author_id,
                su.persona_name AS author_name,
                su.avatar AS author_avatar,
                g.slug,
                COALESCE(0, null) AS total_guides
            FROM website.guides g
            LEFT JOIN website.steam_user su ON su.user_id=g.author_id
            LEFT JOIN website.guide_votes gv ON gv.user_id=$2 AND gv.guide_id=g.id
            WHERE g.id=$1
            LIMIT 1
        ", guide_id, user_id).fetch_one(&*app.pool).await else {
            return response!(err "Failed to fetch delete guide", ErrorCode::InternalServerError)
        };
        response!(ok updated_guide.into())
    }

    #[oai(path="/maps/:map_name/guides/:guide_id/vote", method="delete")]
    async fn delete_vote_map_guide(
        &self, Data(app): Data<&AppData>, extract: GuideExtractor,
        TokenBearer(user_token): TokenBearer
    ) -> Response<Guide>{
        let pool = &*app.pool.clone();
        let user_id = user_token.id;
        let guide_id = extract.guide.id;

        // Check if user is banned
        if let Ok(Some(reason)) = check_user_guide_ban(pool, user_id).await {
            let msg = format!("You are banned from voting. Reason: {}", reason);
            return response!(err &msg, ErrorCode::Forbidden);
        }

        // Delete the user's vote
        let Ok(result) = sqlx::query!(
            "DELETE FROM website.guide_votes
             WHERE guide_id = $1 AND user_id = $2",
            guide_id,
            user_id
        )
        .execute(pool)
        .await else {
            return response!(err "Failed to delete vote", ErrorCode::InternalServerError)
        };

        if result.rows_affected() == 0 {
            return response!(err "No vote found to delete", ErrorCode::NotFound)
        }
        let Ok(updated_guide) = sqlx::query_as!(DbGuide, "
            SELECT g.id,
                g.map_name,
                g.server_id,
                g.title,
                g.content,
                g.category,
                g.created_at,
                g.updated_at,
                g.upvotes,
                g.downvotes,
                g.comment_count,
                NULL AS \"user_vote: DataVoteType\",
                g.author_id AS author_id,
                su.persona_name AS author_name,
                su.avatar AS author_avatar,
                g.slug,
                COALESCE(0, null) AS total_guides
            FROM website.guides g
            LEFT JOIN website.steam_user su ON su.user_id=g.author_id
            WHERE g.id=$1
            LIMIT 1
        ", guide_id).fetch_one(&*app.pool).await else {
            return response!(err "Failed to fetch delete guide", ErrorCode::InternalServerError)
        };
        response!(ok updated_guide.into())
    }

    #[oai(path="/maps/:map_name/guides/:guide_id/comments", method="get")]
    async fn get_map_guide_comments(
        &self, Data(app): Data<&AppData>, extract: GuideExtractor, OptionalTokenBearer(user): OptionalTokenBearer,
        Query(page): Query<usize>
    ) -> Response<GuideCommentPaginated>{
        let pool = &*app.pool.clone();
        let pagination = 10;
        let offset = pagination * page as i64;
        let optional_user_id = user.map(|u| u.id);
        let guide_id = extract.guide.id;

        let data = match sqlx::query_as!(DbGuideComment, "
            SELECT gc.id,
                gc.guide_id,
                gc.author_id,
                su.persona_name AS author_name,
                su.avatar AS author_avatar,
                gc.content,
                gc.created_at,
                gc.updated_at,
                gc.upvotes,
                gc.downvotes,
                gcv.vote_type AS \"user_vote: Option<DataVoteType>\",
                COUNT(*) OVER()::Integer total_comments
            FROM website.guide_comments gc
            LEFT JOIN website.steam_user su ON su.user_id=gc.author_id
            LEFT JOIN website.guide_comment_votes gcv ON gcv.user_id=$2 AND gcv.comment_id=gc.id
            WHERE gc.guide_id=$1
            ORDER BY gc.created_at ASC
            LIMIT $3
            OFFSET $4
        ", guide_id, optional_user_id, pagination, offset).fetch_all(pool).await {
            Ok(d) => d,
            Err(e) => {
                println!("ERROR DbGuideComment {e}");
                return response!(internal_server_error)
            }
        };

        let total_comments = data.first()
            .and_then(|m| m.total_comments)
            .unwrap_or_default();
        let comments: Vec<GuideComment> = data.iter_into();

        let paginated = GuideCommentPaginated {
            total_comments,
            comments
        };
        response!(ok paginated)
    }
    #[oai(path="/maps/:map_name/guides/:guide_id/comments", method="post")]
    async fn create_map_guide_comment(
        &self, Data(app): Data<&AppData>, extract: GuideExtractor, TokenBearer(user_token): TokenBearer,
        Json(payload): Json<CreateUpdateCommentDto>
    ) -> Response<GuideComment>{
        let pool = &*app.pool.clone();
        let user_id = user_token.id;
        let guide_id = extract.guide.id;

        let ban = sqlx::query!(
            r#"
            SELECT reason FROM website.guide_user_ban
            WHERE user_id = $1 AND is_active = true
            AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            "#,
            user_id
        )
        .fetch_optional(pool)
        .await;

        if let Ok(Some(ban_record)) = ban {
            let reason = format!("You are banned from commenting. Reason: {}", ban_record.reason);
            return response!(err &reason, ErrorCode::Forbidden);
        }

        if payload.content.trim().is_empty() {
            return response!(err "Content cannot be empty.", ErrorCode::BadRequest);
        }

        let Ok(comment_brief) = sqlx::query!(
            "INSERT INTO website.guide_comments (guide_id, author_id, content)
             VALUES ($1, $2, $3)
             RETURNING id",
            guide_id, user_id, payload.content
        )
        .fetch_one(pool)
        .await else {
            return response!(err "Failed to create comment", ErrorCode::InternalServerError)
        };

        let Ok(comment) = sqlx::query_as!(DbGuideComment, "
            SELECT gc.id,
                gc.guide_id,
                gc.author_id,
                su.persona_name AS author_name,
                su.avatar AS author_avatar,
                gc.content,
                gc.created_at,
                gc.updated_at,
                gc.upvotes,
                gc.downvotes,
                NULL AS \"user_vote: DataVoteType\",
                COALESCE(0, NULL) AS total_comments
            FROM website.guide_comments gc
            LEFT JOIN website.steam_user su ON su.user_id=gc.author_id
            WHERE gc.id=$1
            LIMIT 1
        ", comment_brief.id).fetch_one(pool).await else {
            return response!(err "Failed to fetch created comment", ErrorCode::InternalServerError)
        };

        response!(ok comment.into())
    }
    #[oai(path="/maps/:map_name/guides/:guide_id/comments/:comment_id", method="delete")]
    async fn delete_map_guide_comment(
        &self, Data(app): Data<&AppData>, extract: GuideCommentExtractor, TokenBearer(user_token): TokenBearer
    ) -> Response<GuideComment>{
        let pool = &*app.pool.clone();
        let comment = extract.comment;

        if comment.author_id != user_token.id {
            if !check_superuser(app, user_token.id).await {
                return response!(err "You're not authorized to delete this comment", ErrorCode::Forbidden)
            }
        }

        let Ok(deleted_comment) = sqlx::query_as!(DbGuideComment, "
            SELECT gc.id,
                gc.guide_id,
                gc.author_id,
                su.persona_name AS author_name,
                su.avatar AS author_avatar,
                gc.content,
                gc.created_at,
                gc.updated_at,
                gc.upvotes,
                gc.downvotes,
                NULL AS \"user_vote: DataVoteType\",
                COALESCE(0, NULL) AS total_comments
            FROM website.guide_comments gc
            LEFT JOIN website.steam_user su ON su.user_id=gc.author_id
            WHERE gc.id=$1
            LIMIT 1
        ", comment.id).fetch_one(pool).await else {
            return response!(err "Failed to fetch comment", ErrorCode::InternalServerError)
        };

        let Ok(_) = sqlx::query!(
            "DELETE FROM website.guide_comments WHERE id=$1",
            comment.id
        ).execute(pool).await else {
            return response!(err "Failed to delete comment", ErrorCode::InternalServerError)
        };

        response!(ok deleted_comment.into())
    }
    #[oai(path="/maps/:map_name/guides/:guide_id/comments/:comment_id", method="put")]
    async fn update_map_guide_comment(
        &self, Data(app): Data<&AppData>, extract: GuideCommentExtractor, TokenBearer(user_token): TokenBearer, Json(payload): Json<CreateUpdateCommentDto>
    ) -> Response<GuideComment>{
        let pool = &*app.pool.clone();
        let comment = extract.comment;

        // Check if user is banned
        if let Ok(Some(reason)) = check_user_guide_ban(pool, user_token.id).await {
            let msg = format!("You are banned from editing comments. Reason: {}", reason);
            return response!(err &msg, ErrorCode::Forbidden);
        }

        if comment.author_id != user_token.id {
            return response!(err "You are not authorized to edit this comment", ErrorCode::Forbidden)
        }

        if payload.content.trim().is_empty() {
            return response!(err "Content cannot be empty.", ErrorCode::BadRequest);
        }

        let Ok(_) = sqlx::query!(
            "UPDATE website.guide_comments
             SET content = $2,
                 updated_at = NOW()
             WHERE id = $1",
            comment.id,
            payload.content
        )
        .execute(pool)
        .await else {
            return response!(err "Failed to update comment", ErrorCode::InternalServerError)
        };

        let Ok(updated_comment) = sqlx::query_as!(DbGuideComment, "
            SELECT gc.id,
                gc.guide_id,
                gc.author_id,
                su.persona_name AS author_name,
                su.avatar AS author_avatar,
                gc.content,
                gc.created_at,
                gc.updated_at,
                gc.upvotes,
                gc.downvotes,
                NULL AS \"user_vote: DataVoteType\",
                COALESCE(0, NULL) AS total_comments
            FROM website.guide_comments gc
            LEFT JOIN website.steam_user su ON su.user_id=gc.author_id
            WHERE gc.id=$1
            LIMIT 1
        ", comment.id).fetch_one(pool).await else {
            return response!(err "Failed to fetch updated comment", ErrorCode::InternalServerError)
        };

        response!(ok updated_comment.into())
    }
    #[oai(path="/maps/:map_name/guides/:guide_id/comments/:comment_id/vote", method="post")]
    async fn vote_map_guide_comment(
        &self, Data(app): Data<&AppData>, extract: GuideCommentExtractor,
        TokenBearer(user_token): TokenBearer, Json(payload): Json<VoteDto>
    ) -> Response<GuideComment>{
        let pool = &*app.pool.clone();
        let user_id = user_token.id;
        let comment_id = extract.comment.id;

        // Check if user is banned
        if let Ok(Some(reason)) = check_user_guide_ban(pool, user_id).await {
            let msg = format!("You are banned from voting. Reason: {}", reason);
            return response!(err &msg, ErrorCode::Forbidden);
        }

        // Prevent users from voting on their own comments
        if extract.comment.author_id == user_id {
            return response!(err "You cannot vote on your own comment", ErrorCode::Forbidden)
        }

        let vote_type: DataVoteType = payload.vote_type.into();

        let Ok(_) = sqlx::query!(
            "INSERT INTO website.guide_comment_votes (comment_id, user_id, vote_type)
             VALUES ($1, $2, $3)
             ON CONFLICT (comment_id, user_id)
             DO UPDATE SET vote_type = EXCLUDED.vote_type, created_at = NOW()",
            comment_id,
            user_id,
            vote_type as DataVoteType
        )
        .execute(pool)
        .await else {
            return response!(err "Failed to record vote", ErrorCode::InternalServerError)
        };

        // Fetch the updated comment with new vote counts
        let Ok(updated_comment) = sqlx::query_as!(DbGuideComment, "
            SELECT gc.id,
                gc.guide_id,
                gc.author_id,
                su.persona_name AS author_name,
                su.avatar AS author_avatar,
                gc.content,
                gc.created_at,
                gc.updated_at,
                gc.upvotes,
                gc.downvotes,
                gcv.vote_type AS \"user_vote: Option<DataVoteType>\",
                COALESCE(0, NULL) AS total_comments
            FROM website.guide_comments gc
            LEFT JOIN website.steam_user su ON su.user_id=gc.author_id
            LEFT JOIN website.guide_comment_votes gcv ON gcv.user_id=$2 AND gcv.comment_id=gc.id
            WHERE gc.id=$1
            LIMIT 1
        ", comment_id, user_id).fetch_one(pool).await else {
            return response!(err "Failed to fetch updated comment", ErrorCode::InternalServerError)
        };

        response!(ok updated_comment.into())
    }
    #[oai(path="/maps/:map_name/guides/:guide_id/comments/:comment_id/vote", method="delete")]
    async fn remove_vote_map_guide_comment(
        &self, Data(app): Data<&AppData>, extract: GuideCommentExtractor, TokenBearer(user_token): TokenBearer
    ) -> Response<GuideComment>{
        let pool = &*app.pool.clone();
        let user_id = user_token.id;
        let comment_id = extract.comment.id;

        // Check if user is banned
        if let Ok(Some(reason)) = check_user_guide_ban(pool, user_id).await {
            let msg = format!("You are banned from voting. Reason: {}", reason);
            return response!(err &msg, ErrorCode::Forbidden);
        }

        let Ok(result) = sqlx::query!(
            "DELETE FROM website.guide_comment_votes
             WHERE comment_id = $1 AND user_id = $2",
            comment_id,
            user_id
        )
        .execute(pool)
        .await else {
            return response!(err "Failed to delete vote", ErrorCode::InternalServerError)
        };

        if result.rows_affected() == 0 {
            return response!(err "No vote found to delete", ErrorCode::NotFound)
        }

        let Ok(updated_comment) = sqlx::query_as!(DbGuideComment, "
            SELECT gc.id,
                gc.guide_id,
                gc.author_id,
                su.persona_name AS author_name,
                su.avatar AS author_avatar,
                gc.content,
                gc.created_at,
                gc.updated_at,
                gc.upvotes,
                gc.downvotes,
                NULL AS \"user_vote: DataVoteType\",
                COALESCE(0, NULL) AS total_comments
            FROM website.guide_comments gc
            LEFT JOIN website.steam_user su ON su.user_id=gc.author_id
            WHERE gc.id=$1
            LIMIT 1
        ", comment_id).fetch_one(pool).await else {
            return response!(err "Failed to fetch updated comment", ErrorCode::InternalServerError)
        };

        response!(ok updated_comment.into())
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
            "/maps/{map_name}/guides",
            "/maps/{map_name}/guides/slugs/{guide_slug}",
            "/maps/{map_name}/guides/{guide_id}",
            "/maps/{map_name}/guides/{guide_id}/vote",
            "/maps/{map_name}/guides/{guide_id}/report",
            "/maps/{map_name}/guides/{guide_id}/comments",
            "/maps/{map_name}/guides/{guide_id}/comments/{comment_id}",
            "/maps/{map_name}/guides/{guide_id}/comments/{comment_id}/vote",
            "/music/{music_id}/report",
            "/servers/{server_id}/maps",
        ].iter_into()
    }
}