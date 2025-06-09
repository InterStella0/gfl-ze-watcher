use std::collections::HashMap;
use std::fmt::{Display, Formatter};
use chrono::{DateTime, Utc};
use poem::http::StatusCode;
use poem::web::{Data};
use poem_openapi::{Enum, OpenApi};
use poem_openapi::param::{Path, Query};
use sqlx::{Pool, Postgres};
use crate::{response, AppData, FastCache};
use crate::core::model::{DbEvent, DbMap, DbMapAnalyze, DbMapLastPlayed, DbMapRegion, DbMapRegionDate, DbMapSessionDistribution, DbPlayerBrief, DbServer, DbServerMap, DbServerMapPartial, DbServerMapPlayed, MapRegionDate};
use crate::core::api_models::{DailyMapRegion, ErrorCode, MapAnalyze, MapEventAverage, MapPlayedPaginated, MapRegion, MapSessionDistribution, PlayerBrief, Response, RoutePattern, ServerExtractor, ServerMap, ServerMapPlayedPaginated, UriPatternExt};
use crate::core::utils::{cached_response, db_to_utc, get_map_image, get_map_images, get_server, update_online_brief, IterConvert, MapImage, DAY};

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
async fn get_map_cache_key(pool: &Pool<Postgres>, cache: &FastCache, server_id: &str, map_name: &str) -> String{
    let func = || sqlx::query_as!(DbMapLastPlayed,
            "SELECT MAX(started_at) last_played
                FROM server_map_played
                WHERE server_id=$1
                  AND map=$2
                  AND ended_at IS NOT NULL
                LIMIT 1",
            server_id,
            map_name
        )
        .fetch_one(pool);

    let key = format!("last-played:{server_id}:{map_name}");
    let Ok(result) = cached_response(&key, cache, 60, func).await else {
        return "first-time".to_string();
    };

    let d = result.result;

    d.last_played.and_then(|e| Some(db_to_utc(e).to_rfc3339())).unwrap_or_default()
}
struct MapExtractor{
    pub server: DbServer,
    pub map: DbMap,
    pub cache_key: String,
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
        let Ok(rows) = sqlx::query_as!(DbServerMap,
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
                sm.first_occurrance,
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
            WHERE sm.server_id=$1 AND ($6 OR sm.map ILIKE '%' || $5 || '%')
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
            .await else {
            return response!(internal_server_error)
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

    #[oai(path = "/servers/:server_id/maps/:map_name/analyze", method = "get")]
    async fn get_maps_highlight(
        &self, Data(app): Data<&AppData>, extract: MapExtractor
    ) -> Response<MapAnalyze>{
        let pool = &*app.pool.clone();
        let server_id = extract.server.server_id;
        let map_name = extract.map.map;
        let key = extract.cache_key;
        let func = || sqlx::query_as!(DbMapAnalyze, "
            WITH params AS (
              SELECT
                10 AS alpha,
                0.5 AS beta,
                1000 AS gamma,
                500 AS delta,
                $2::text AS map_target,
                $1::text AS target_server
            ),
            map_data AS (
              SELECT
                map,
                COUNT(time_id) AS total_sessions,
                SUM(EXTRACT(EPOCH FROM (ended_at - started_at)))/3600 AS total_playtime
              FROM server_map_played
              WHERE map = (SELECT map_target FROM params)
                AND server_id = (SELECT target_server FROM params)
              GROUP BY map
            ),
            player_metrics AS (
              SELECT
                 COUNT(DISTINCT pss.player_id) AS unique_players,
                AVG(EXTRACT(EPOCH FROM (LEAST(pss.ended_at, smp.ended_at) - GREATEST(pss.started_at, smp.started_at)))) / 3600
                  AS avg_playtime_before_quitting,
                SUM(CASE WHEN (LEAST(pss.ended_at, smp.ended_at) - GREATEST(pss.started_at, smp.started_at)) < INTERVAL '5 minutes'
                         THEN 1 ELSE 0 END)::float / COUNT(pss.session_id) AS dropoff_rate
              FROM player_server_session pss
              JOIN server_map_played smp
                ON smp.server_id = pss.server_id
                AND smp.map = (SELECT map_target FROM params)
                AND (pss.started_at < smp.ended_at AND pss.ended_at > smp.started_at)
              WHERE pss.server_id = (SELECT target_server FROM params)
            ),
            player_counts AS (
              SELECT
                COALESCE(AVG(spc.player_count), 0) AS avg_players_per_session
              FROM server_player_counts spc
              JOIN server_map_played smp
                ON smp.server_id = spc.server_id
                AND smp.map = (SELECT map_target FROM params)
                AND spc.bucket_time BETWEEN smp.started_at AND smp.ended_at
              WHERE spc.server_id = (SELECT target_server FROM params)
            )
            SELECT
              md.map,
              ((SELECT alpha FROM params) * md.total_playtime
               + (SELECT beta FROM params) * pd.unique_players
               + (SELECT gamma FROM params) * COALESCE(pd.avg_playtime_before_quitting, 0)
               - (SELECT delta FROM params) * COALESCE(pd.dropoff_rate, 0)
              ) AS map_score,
              ROUND(md.total_playtime::numeric, 3)::FLOAT AS total_playtime,
              md.total_sessions,
              pd.unique_players,
              (SELECT MAX(started_at)
               FROM server_map_played
               WHERE server_id=(
                   SELECT target_server FROM params
               ) AND map=(
                   SELECT map_target FROM params
               ) LIMIT 1) AS last_played,
              (SELECT MAX(ended_at)
               FROM server_map_played
               WHERE server_id=(
                   SELECT target_server FROM params
               ) AND map=(
                   SELECT map_target FROM params
               ) LIMIT 1) AS last_played_ended,
              ROUND(
                COALESCE(pd.avg_playtime_before_quitting, 0.0)::numeric, 3
              )::FLOAT AS avg_playtime_before_quitting,
              COALESCE(pd.dropoff_rate, 0) AS dropoff_rate,
              ROUND(pc.avg_players_per_session::numeric, 3)::FLOAT AS avg_players_per_session
            FROM map_data md
            JOIN player_metrics pd ON true
            JOIN player_counts pc ON true
        ", &server_id, map_name).fetch_one(pool);
        let redis_key = format!("map_analyze:{}:{}:{}", &server_id, map_name, key);
        let Ok(mut value) = cached_response(&redis_key, &app.cache, 30 * DAY, func).await else {
            return response!(internal_server_error)
        };
        if !value.is_new{
            let partial_func = || sqlx::query_as!(DbServerMapPartial,
                "SELECT
                    map,
                    (EXTRACT(EPOCH FROM SUM(ended_at - started_at)) / 3600)::FLOAT AS total_playtime,
                    COUNT(time_id) AS total_sessions,
                    MAX(started_at) AS last_played
                    FROM server_map_played
                    WHERE server_id=$1 AND map=$2
                    GROUP BY map
                    LIMIT 1",
            &server_id, map_name
            ).fetch_one(pool);
            let partial_key = format!("map-partial:{}:{}:{}", &server_id, map_name, key);
            let Ok(result) = cached_response(&partial_key, &app.cache, 7 * DAY, partial_func).await else {
                tracing::warn!("Unable to get server map partial.");
                return response!(ok value.result.into())
            };
            let partial = result.result;
            value.result.last_played = partial.last_played;
            value.result.total_sessions = partial.total_sessions;
            value.result.total_playtime = partial.total_playtime;
        }
        response!(ok value.result.into())
    }
    #[oai(path = "/servers/:server_id/maps/:map_name/sessions", method="get")]
    async fn get_maps_sessions(
        &self, Data(app): Data<&AppData>, extract: MapExtractor, Query(page): Query<usize>
    ) -> Response<ServerMapPlayedPaginated>{
        let pool = &*app.pool.clone();
        let server_id = extract.server.server_id;
        let map_name = extract.map.map;
        let key = extract.cache_key;
        let pagination = 5;
        let offset = pagination * page as i64;
        let func = || sqlx::query_as!(DbServerMapPlayed,
            "SELECT *, COUNT(time_id) OVER()::integer AS total_sessions
                FROM server_map_played
                WHERE server_id=$1 AND map=$2
                ORDER BY started_at DESC
                LIMIT $3
                OFFSET $4",
            server_id, map_name, pagination, offset
        ).fetch_all(pool);
        let redis_key = format!("map-session-{page}:{server_id}:{map_name}:{key}");
        let Ok(result) = cached_response(&redis_key, &app.cache, 7 * DAY, func).await else {
            return response!(internal_server_error)
        };
        let result = result.result;
        let total_sessions = result
            .first()
            .and_then(|e| e.total_sessions)
            .unwrap_or_default();

        let resp = ServerMapPlayedPaginated{
            total_sessions,
            maps: result.iter_into()
        };
        response!(ok resp)
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
        let pool = &*app.pool.clone();
        let server_id = extract.server.server_id;
        let map_name = extract.map.map;
        let key = extract.cache_key;
        let func = || sqlx::query_as!(DbEvent, "
            WITH smp_filtered AS (
              SELECT *
              FROM server_map_played
              WHERE map = $2
                AND server_id = $1
            )
            SELECT vals.event_name, AVG(vals.counted)::FLOAT average
            FROM (
              SELECT psa.event_name, smp.time_id, COUNT(psa.event_name) AS counted
              FROM smp_filtered smp
              CROSS JOIN LATERAL (
                SELECT *
                FROM player_server_activity psa
                WHERE psa.created_at BETWEEN smp.started_at AND smp.ended_at
              ) psa
              GROUP BY psa.event_name, smp.time_id
            ) vals
            GROUP BY vals.event_name
        ", server_id, map_name).fetch_all(pool);
        let redis_key = format!("map-events:{server_id}:{map_name}:{key}");
        let Ok(events) = cached_response(&redis_key, &app.cache, 24 * 60 * 60, func).await else {
            return response!(internal_server_error)
        };
        response!(ok events.result.iter_into())
    }
    #[oai(path="/servers/:server_id/maps/:map_name/heat-regions", method="get")]
    async fn get_heat_regions(
        &self, Data(app): Data<&AppData>, extract: MapExtractor
    ) -> Response<Vec<DailyMapRegion>> {
        let pool = &*app.pool.clone();
        let server_id = extract.server.server_id;
        let map_name = extract.map.map;
        let key = extract.cache_key;

        let func = || sqlx::query_as!(DbMapRegionDate, "
            WITH session_data AS (
              SELECT
                g.map,
                g.started_at AT TIME ZONE 'UTC' AS started_at,
                g.ended_at AT TIME ZONE 'UTC' AS ended_at,
                date_trunc('day', g.started_at AT TIME ZONE 'UTC') AS start_day,
                date_trunc('day', g.ended_at AT TIME ZONE 'UTC') AS end_day
              FROM server_map_played g
                WHERE g.map = $2
                  AND g.server_id = $1
                AND g.started_at AT TIME ZONE 'UTC'
                     BETWEEN (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' - interval '1 year')
                         AND CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
            ),
            game_days AS (
              SELECT
                sd.*,
                d::date AS play_day
              FROM session_data sd,
                   generate_series(sd.start_day, sd.end_day, interval '1 day') AS d
            ),
            region_intervals AS (
              SELECT
                gd.map,
                gd.started_at,
                gd.ended_at,
                gd.play_day,
                rt.region_id,
                rt.region_name,
                CASE
                  WHEN (rt.start_time AT TIME ZONE 'UTC')::time <= (rt.end_time AT TIME ZONE 'UTC')::time THEN
                       (gd.play_day + (rt.start_time AT TIME ZONE 'UTC')::time)
                  ELSE
                       (gd.play_day - interval '1 day' + (rt.start_time AT TIME ZONE 'UTC')::time)
                END AS region_start,
                CASE
                  WHEN (rt.start_time AT TIME ZONE 'UTC')::time <= (rt.end_time AT TIME ZONE 'UTC')::time THEN
                       (gd.play_day + (rt.end_time AT TIME ZONE 'UTC')::time)
                  ELSE
                       (gd.play_day + (rt.end_time AT TIME ZONE 'UTC')::time)
                END AS region_end
              FROM game_days gd
              CROSS JOIN region_time rt
            ),
            daily_region_play AS (
              SELECT
                region_id,
                region_name,
                map,
                play_day,
                SUM(
                  LEAST(ended_at, region_end) - GREATEST(started_at, region_start)
                ) AS region_play_duration
              FROM region_intervals
              WHERE ended_at > region_start
                AND started_at < region_end
              GROUP BY region_id, region_name, map, play_day
            ),
            all_days AS (
              SELECT day::date AS play_day
              FROM generate_series(
                CURRENT_TIMESTAMP AT TIME ZONE 'UTC' - interval '1 year',
                CURRENT_TIMESTAMP AT TIME ZONE 'UTC',
                interval '1 day'
              ) day
            )
            SELECT
              ad.play_day::timestamptz AS date,
              rt.region_name,
              COALESCE(drp.region_play_duration, interval '0 seconds') AS total_play_duration
            FROM all_days ad
            CROSS JOIN region_time rt
            LEFT JOIN daily_region_play drp
              ON ad.play_day = drp.play_day
             AND rt.region_id = drp.region_id
            ORDER BY ad.play_day, total_play_duration DESC
        ", server_id, map_name).fetch_all(pool);

        let redis_key = format!("heat-region:{server_id}:{map_name}:{key}");
        let Ok(resp) = cached_response(&redis_key, &app.cache, 7 * DAY, func).await else {
            return response!(internal_server_error)
        };
        let data: Vec<DbMapRegionDate> = resp.result;
        let resp: Vec<MapRegionDate> = data.iter_into();
        let mut grouped: HashMap<DateTime<Utc>, Vec<MapRegion>> = HashMap::new();

        for record in resp {
            let Some(date) = record.date else {
                tracing::warn!("Invalid date detected for heat region!");
                continue;
            };
            grouped.entry(date).or_insert_with(Vec::new).push(record.into());
        }

        let mut days:Vec<DailyMapRegion> = grouped
            .into_iter()
            .map(|(date, regions)| DailyMapRegion{
                date, regions: regions.into_iter().filter(|e| e.total_play_duration > 0.).collect()
            }).collect();
        days.sort_by(|a, b| a.date.cmp(&b.date));
        response!(ok days)
    }
    #[oai(path="/servers/:server_id/maps/:map_name/regions", method="get")]
    async fn get_map_regions(
        &self, Data(app): Data<&AppData>, extract: MapExtractor
    ) -> Response<Vec<MapRegion>>{
        let pool = &*app.pool.clone();
        let server_id = extract.server.server_id;
        let map_name = extract.map.map;
        let key = extract.cache_key;
        let region_key = format!("map-regions:{server_id}:{map_name}:{key}");
        let func = || sqlx::query_as!(DbMapRegion, "
            WITH session_data AS (
              SELECT
                g.map,
                g.started_at AT TIME ZONE 'UTC' AS started_at,
                g.ended_at AT TIME ZONE 'UTC' AS ended_at,
                date_trunc('day', g.started_at AT TIME ZONE 'UTC') AS start_day,
                date_trunc('day', g.ended_at AT TIME ZONE 'UTC') AS end_day
              FROM server_map_played g

              WHERE g.map = $2
                AND g.server_id = $1
                AND g.started_at AT TIME ZONE 'UTC'
                     BETWEEN (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' - interval '1 year')
                         AND CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
            ),
            game_days AS (
              SELECT
                sd.*,
                d::date AS play_day
              FROM session_data sd,
                   generate_series(sd.start_day, sd.end_day, interval '1 day') AS d
            ),
            region_intervals AS (
              SELECT
                gd.map,
                gd.started_at,
                gd.ended_at,
                gd.play_day,
                rt.region_id,
                rt.region_name,
                CASE
                  WHEN (rt.start_time AT TIME ZONE 'UTC')::time <= (rt.end_time AT TIME ZONE 'UTC')::time THEN
                       (gd.play_day + (rt.start_time AT TIME ZONE 'UTC')::time)
                  ELSE
                       (gd.play_day - interval '1 day' + (rt.start_time AT TIME ZONE 'UTC')::time)
                END AS region_start,
                CASE
                  WHEN (rt.start_time AT TIME ZONE 'UTC')::time <= (rt.end_time AT TIME ZONE 'UTC')::time THEN
                       (gd.play_day + (rt.end_time AT TIME ZONE 'UTC')::time)
                  ELSE
                       (gd.play_day + (rt.end_time AT TIME ZONE 'UTC')::time)
                END AS region_end
              FROM game_days gd
              CROSS JOIN region_time rt
            ),
            daily_region_play AS (
              SELECT
                region_id,
                region_name,
                map,
                play_day,
                SUM(
                  LEAST(ended_at, region_end) - GREATEST(started_at, region_start)
                ) AS region_play_duration
              FROM region_intervals
              WHERE ended_at > region_start
                AND started_at < region_end
              GROUP BY region_id, region_name, map, play_day
            ),
            all_days AS (
              SELECT day::date AS play_day
              FROM generate_series(
                CURRENT_TIMESTAMP AT TIME ZONE 'UTC' - interval '1 year',
                CURRENT_TIMESTAMP AT TIME ZONE 'UTC',
                interval '1 day'
              ) day
            ), final_calculation AS (
            SELECT
              ad.play_day::timestamptz AS date,
              rt.region_name,
              COALESCE(drp.region_play_duration, interval '0 seconds') AS total_play_duration
            FROM all_days ad
            CROSS JOIN region_time rt
            LEFT JOIN daily_region_play drp
              ON ad.play_day = drp.play_day
             AND rt.region_id = drp.region_id
            ORDER BY ad.play_day, total_play_duration DESC
			)
			SELECT region_name, $2 as map, SUM(total_play_duration) total_play_duration
			FROM final_calculation
			GROUP BY region_name
    ", server_id, map_name).fetch_all(pool);
        let Ok(result) = cached_response(&region_key, &app.cache, 30 * DAY, func).await else {
            return response!(internal_server_error);
        };
        response!(ok result.result.iter_into())
    }
    #[oai(path="/servers/:server_id/maps/:map_name/sessions_distribution", method="get")]
    async fn get_map_sessions_distribution(
        &self, Data(app): Data<&AppData>, extract: MapExtractor
    ) -> Response<Vec<MapSessionDistribution>>{
        let pool = &*app.pool.clone();
        let server_id = extract.server.server_id;
        let map_name = extract.map.map;
        let key = extract.cache_key;
        let func = || sqlx::query_as!(DbMapSessionDistribution, "
            WITH params AS (
                SELECT $2 AS map_target,
                       $1 AS target_server
            ),
            time_spent AS (
                SELECT
                    pss.player_id,
                    LEAST(pss.ended_at, smp.ended_at) - GREATEST(pss.started_at, smp.started_at) as total_duration
                FROM public.server_map_played smp
                INNER JOIN player_server_session pss
                    ON pss.started_at < smp.ended_at
                    AND pss.ended_at > smp.started_at
                WHERE smp.map = (SELECT map_target FROM params)
                    AND smp.server_id = (SELECT target_server FROM params)
            ),
            session_distribution AS (
                SELECT
                    CASE
                        WHEN total_duration < INTERVAL '10 minutes' THEN 'Under 10'
                        WHEN total_duration BETWEEN INTERVAL '10 minutes' AND INTERVAL '30 minutes' THEN '10 - 30'
                        WHEN total_duration BETWEEN INTERVAL '30 minutes' AND INTERVAL '45 minutes' THEN '30 - 45'
                        WHEN total_duration BETWEEN INTERVAL '45 minutes' AND INTERVAL '60 minutes' THEN '45 - 60'
                        ELSE 'Over 60'
                    END AS session_range
                FROM time_spent
            )
            SELECT
                session_range,
                COUNT(*) AS session_count
            FROM session_distribution
            GROUP BY session_range
        ", server_id, map_name)
            .fetch_all(pool);
        let redis_key = format!("sessions_distribution:{server_id}:{map_name}:{key}");
        let Ok(value) = cached_response(&redis_key, &app.cache, 30 * DAY, func).await else {
            return response!(internal_server_error)
        };
        response!(ok value.result.iter_into())
    }
    #[oai(path="/servers/:server_id/maps/:map_name/top_players", method="get")]
    async fn get_map_player_top_10(
        &self, Data(app): Data<&AppData>, extract: MapExtractor
    ) -> Response<Vec<PlayerBrief>>{
        let pool = &*app.pool.clone();
        let server_id = extract.server.server_id;
        let map_name = extract.map.map;
        let key = extract.cache_key;
        let func = || sqlx::query_as!(DbPlayerBrief, "
            WITH params AS (
                SELECT $2 AS map_target, $1 AS target_server
            ),
            time_spent AS (
                SELECT
                    pss.player_id, SUM(
                        LEAST(pss.ended_at, smp.ended_at) - GREATEST(pss.started_at, smp.started_at)
                    ) AS total
                FROM  public.server_map_played smp
                INNER JOIN player_server_session pss
                ON pss.started_at < smp.ended_at
                AND pss.ended_at > smp.started_at
                WHERE smp.map = (SELECT map_target FROM params)
                    AND smp.server_id=(SELECT target_server FROM params)
                GROUP BY pss.player_id
            )
            ,
            online_players AS (
                SELECT player_id, started_at
                FROM player_server_session
                WHERE server_id=(SELECT target_server FROM params)
                    AND ended_at IS NULL
                        AND (CURRENT_TIMESTAMP - started_at) < INTERVAL '12 hours'
                ),
            last_player_sessions AS (
                SELECT DISTINCT ON (player_id) player_id, started_at, ended_at
                FROM player_server_session
                WHERE ended_at IS NOT NULL
                    AND server_id=(SELECT target_server FROM params)
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
            JOIN time_spent ts
            ON ts.player_id = p.player_id
            LEFT JOIN online_players op
            ON op.player_id=p.player_id
            JOIN last_player_sessions lps
            ON lps.player_id=p.player_id
            ORDER BY total_playtime DESC
            LIMIT 10
        ", server_id, map_name).fetch_all(pool);

        let redis_key = format!("map-top-10:{server_id}:{map_name}:{key}");
        let Ok(rows) = cached_response(&redis_key, &app.cache, 30 * DAY, func).await else {
            tracing::warn!("Something went wrong with player_top_10 calculation.");
            return response!(ok vec![])
        };
        let mut players: Vec<PlayerBrief> = rows.result.iter_into();
        if !rows.is_new{
            update_online_brief(&pool, &app.cache, &server_id, &mut players).await;
        }
        response!(ok players)
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
            "/servers/{server_id}/maps/{map_name}/sessions",
            "/servers/{server_id}/maps/{map_name}/events",
            "/servers/{server_id}/maps/{map_name}/heat-regions",
            "/servers/{server_id}/maps/{map_name}/regions",
            "/servers/{server_id}/maps/{map_name}/sessions_distribution",
            "/servers/{server_id}/maps/{map_name}/top_players",
            "/servers/{server_id}/sessions/{session_id}/players",
        ].iter_into()
    }
}