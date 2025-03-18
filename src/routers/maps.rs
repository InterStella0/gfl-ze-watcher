use std::fmt::{Display, Formatter};
use chrono::Duration;
use poem::web::{Data};
use poem_openapi::{Enum, OpenApi};
use poem_openapi::param::{Path, Query};
use sqlx::{Pool, Postgres};
use crate::{response, AppData};
use crate::model::{DbMap, DbMapAnalyze, DbServer, DbServerMap, DbServerMapPlayed};
use crate::routers::api_models::{ErrorCode, MapAnalyze, MapPlayedPaginated, Response, ServerMap, ServerMapPlayedPaginated};
use crate::utils::IterConvert;

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


pub struct MapApi;

#[OpenApi]
impl MapApi{
    pub async fn get_server(&self, pool: &Pool<Postgres>, server_id: &str) -> Option<DbServer>{
        sqlx::query_as!(DbServer, "SELECT * FROM server WHERE server_id=$1 LIMIT 1", server_id)
            .fetch_one(pool)
            .await
            .ok()
    }
    #[oai(path = "/servers/:server_id/maps/autocomplete", method = "get")]
    async fn get_maps_autocomplete(
        &self, data: Data<&AppData>, server_id: Path<String>, map: Query<String>
    ) -> Response<Vec<ServerMap>>{
        let pool = &data.0.pool;
        let Some(server) = self.get_server(pool, &server_id.0).await else {
            return response!(err "Server not found", ErrorCode::NotFound);
        };
        let Ok(result) = sqlx::query_as!(DbMap, "
            SELECT server_id, map FROM (
                SELECT server_id, map, STRPOS(map, $2) AS ranked
                FROM server_map
                WHERE server_id=$3 AND LOWER(map) LIKE $1
                ORDER BY ranked ASC
                LIMIT 20
            ) a
        ", format!("%{}%", map.0.to_lowercase()), map.0, server.server_id
        ).fetch_all(&data.pool).await else {
            return response!(ok vec![])
        };
        response!(ok result.iter_into())
    }
    #[oai(path = "/servers/:server_id/maps/last/sessions", method = "get")]
    async fn get_maps_last_session(
        &self, data: Data<&AppData>, server_id: Path<String>, page: Query<usize>,
        sorted_by: Query<MapLastSessionMode>, search_map: Query<Option<String>>
    ) -> Response<MapPlayedPaginated>{
        let pool = &data.0.pool;
        let Some(server) = self.get_server(pool, &server_id.0).await else {
            return response!(err "Server not found", ErrorCode::NotFound);
        };
        let pagination = 20;
        let offset = pagination * page.0 as i64;
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
                smp.ended_at as last_played_ended
            FROM server_map sm
            LEFT JOIN map_sessions mp
                ON sm.server_id=mp.server_id AND sm.map=mp.map
            LEFT JOIN server_map_played smp
                ON smp.server_id=mp.server_id AND smp.map=mp.map AND smp.started_at=mp.last_played
            WHERE sm.server_id=$1 AND ($6 OR LOWER(sm.map) LIKE $5)
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
				server.server_id, offset, pagination, sorted_by.0.to_string(),
                format!("%{map_target}%"), map_target.trim() == ""
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
        &self, data: Data<&AppData>, server_id: Path<String>, page: Query<usize>
    ) -> Response<ServerMapPlayedPaginated>{
        let pool = &data.0.pool;
        let Some(server) = self.get_server(pool, &server_id.0).await else {
            return response!(err "Server not found", ErrorCode::NotFound);
        };
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
        &self, data: Data<&AppData>, server_id: Path<String>, map_name: Path<String>
    ) -> Response<MapAnalyze>{
        let pool = &data.0.pool;
        let Some(server) = self.get_server(pool, &server_id.0).await else {
            return response!(err "Server not found", ErrorCode::NotFound);
        };
        let Ok(result) = sqlx::query_as!(DbMapAnalyze, "
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
              ROUND(md.total_playtime, 3)::FLOAT AS total_playtime,
              md.total_sessions,
              pd.unique_players,
              (SELECT MAX(started_at)
               FROM server_map_played
               WHERE server_id=(
                   SELECT target_server FROM params
               ) AND map=(
                   SELECT map_target FROM params
               ) LIMIT 1) AS last_played,
              ROUND(COALESCE(pd.avg_playtime_before_quitting, 0.0), 3)::FLOAT AS avg_playtime_before_quitting,
              COALESCE(pd.dropoff_rate, 0) AS dropoff_rate,
              ROUND(pc.avg_players_per_session, 3)::FLOAT AS avg_players_per_session
            FROM map_data md
            JOIN player_metrics pd ON true
            JOIN player_counts pc ON true
        ", server.server_id, map_name.0)
            .fetch_one(pool)
            .await else {
            return response!(internal_server_error)
        };

        response!(ok result.into())
    }
    #[oai(path = "/servers/:server_id/maps/:map_name/sessions", method="get")]
    async fn get_maps_sessions(
        &self, data: Data<&AppData>, server_id: Path<String>, map_name: Path<String>, page: Query<usize>
    ) -> Response<ServerMapPlayedPaginated>{
        let pool = &data.0.pool;
        let Some(server) = self.get_server(pool, &server_id.0).await else {
            return response!(err "Server not found", ErrorCode::NotFound);
        };
        let pagination = 5;
        let offset = pagination * page.0 as i64;
        let Ok(result) = sqlx::query_as!(DbServerMapPlayed,
            "SELECT *, COUNT(time_id) OVER()::integer AS total_sessions
                FROM server_map_played
                WHERE server_id=$1 AND map=$2
                ORDER BY started_at DESC
                LIMIT $3
                OFFSET $4",
            server.server_id, map_name.0, pagination, offset
        ).fetch_all(pool).await else {
            return response!(internal_server_error)
        };

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
}