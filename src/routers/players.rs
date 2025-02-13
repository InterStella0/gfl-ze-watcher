use chrono::{DateTime, Utc};
use poem::web::{Data};
use poem_openapi::{param::{Path, Query}, Object, OpenApi};
use serde::{Deserialize, Serialize};

use crate::{model::{DbPlayerDetail, DbPlayerInfraction, DbPlayerMapPlayed, DbPlayerRegionTime, DbPlayerSessionTime, ErrorCode, Response}, response, utils::iter_convert, AppData};
use crate::model::DbPlayer;

#[derive(Object)]
pub struct PlayerSessionDetail;


#[derive(Object)]
pub struct PlayerSessionTime{
    pub bucket_time: DateTime<Utc>,
    pub hours: f64,
}

#[derive(Object)]
pub struct PlayerInfraction{
    pub id: String,
    pub by: String,
    pub reason: Option<String>,
    pub infraction_time: Option<DateTime<Utc>>,
    pub flags: i32,
    pub admin_avatar: Option<String>
}


#[derive(Object)]
pub struct PlayerProfilePicture{
    id: i64,
    url: String,
}
#[derive(Serialize, Deserialize)]
struct ProviderResponse{
    provider: String,
    url: String
}
#[derive(Object)]
pub struct SearchPlayer{
    pub(crate) name: String,
    pub(crate) id: String
}
#[derive(Object)]
pub struct DetailedPlayer{
    pub id: String,
    pub name: String,
    pub created_at: DateTime<Utc>,
    pub category: Option<String>,
    pub tryhard_playtime: f64,
    pub casual_playtime: f64,
    pub total_playtime: f64,
    pub favourite_map: Option<String>
}
#[derive(Object)]
pub struct DetailedPlayerSearch{
    total_players: i64,
    players: Vec<DetailedPlayer>
}
#[derive(Object)]
pub struct PlayerMostPlayedMap{
    pub map: String,
    pub duration: f64
}
#[derive(Object)]
pub struct PlayerRegionTime{
    pub id: i16,
    pub name: String,
    pub duration: f64,
}

pub struct PlayerApi;


#[OpenApi]
impl PlayerApi{
    #[oai(path = "/players/autocomplete", method = "get")]
    async fn get_players_autocomplete(
        &self, data: Data<&AppData>, player_name: Query<String>
    ) -> Response<Vec<SearchPlayer>>{
        let Ok(result) = sqlx::query_as!(DbPlayer, "
            SELECT player_id, player_name, created_at FROM (
                SELECT *, STRPOS(player_name, $2) AS ranked
                FROM player
                WHERE LOWER(player_name) LIKE $1
                ORDER BY ranked ASC
                LIMIT 20
            ) a
        ", format!("%{}%", player_name.0.to_lowercase()), player_name.0
        ).fetch_all(&data.pool).await else {
            return response!(ok vec![])
        };
        response!(ok iter_convert(result))
    }
    #[oai(path = "/players/search", method = "get")]
    async fn get_players_search(&self, data: Data<&AppData>, player_name: Query<String>, page: Query<usize>) -> Response<DetailedPlayerSearch>{
        let pagination = 40;
        let paging = page.0 as i64 * pagination;
        let Ok(result) = sqlx::query_as!(DbPlayerDetail, "
            WITH VARS as (
                SELECT 
                    LOWER($1::text) AS target
            ), searched_users AS (
                SELECT
                    p.player_id,
                    p.player_name,
                    p.created_at,
                    COALESCE(SUM(COALESCE(ps.ended_at - ps.started_at, INTERVAL '0 seconds')), INTERVAL '0 seconds') AS duration,
                    COUNT(ps.session_id) AS session_count,
                    strpos(p.player_name, (SELECT target FROM VARS)) AS ranked,
                    COUNT(p.player_id) OVER() AS total_players
                FROM public.player p
                LEFT JOIN player_server_session ps 
                    ON p.player_id = ps.player_id
                WHERE LOWER(p.player_name) LIKE CONCAT('%', (SELECT target FROM VARS), '%')
                GROUP BY p.player_id
                ORDER BY ranked ASC, duration DESC
                LIMIT $3 OFFSET $2
            ),
            user_played  AS (
                SELECT 
                    sp.player_id,
                    mp.server_id,
                    mp.map,
                    SUM(LEAST(pss.ended_at, sm.ended_at) - GREATEST(pss.started_at, sm.started_at)) AS played
                FROM player_server_session pss
                JOIN searched_users sp 
                ON pss.player_id = sp.player_id
                JOIN server_map_played sm 
                ON sm.server_id = pss.server_id
                AND pss.started_at < sm.ended_at
                AND pss.ended_at > sm.started_at
                LEFT JOIN server_map mp
                    ON sm.map=mp.map AND sm.server_id=mp.server_id
                GROUP BY sp.player_id, mp.server_id, mp.map
                ORDER BY played DESC
            ), categorized AS (
                SELECT
                    up.player_id,
                    mp.server_id, 
                COALESCE(is_casual, false) casual, COALESCE(is_tryhard, false) tryhard, SUM(played) total
                FROM user_played up
                LEFT JOIN server_map mp
                    ON mp.map=up.map AND mp.server_id=up.server_id
                GROUP BY up.player_id, mp.server_id, is_casual, is_tryhard
                ORDER BY total DESC
            ), hard_or_casual AS (
                SELECT 
                    player_id,
                    server_id,
                CASE WHEN tryhard THEN false ELSE casual END AS is_casual,
                CASE WHEN tryhard THEN true ELSE false END AS is_tryhard,
                SUM(total) summed
                FROM categorized
                GROUP BY player_id, server_id, is_casual, is_tryhard
                ORDER BY summed DESC
            ),
            ranked_data AS (
                SELECT *, 
                    ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY summed DESC) AS rnk,
                    SUM(summed) OVER(PARTITION BY player_id) AS full_play
                FROM hard_or_casual
            ), categorized_data AS (
                SELECT 
                    player_id,
                    SUM(CASE WHEN is_tryhard THEN summed ELSE INTERVAL '0 seconds' END) AS tryhard_playtime,
                    SUM(CASE WHEN is_casual THEN summed ELSE INTERVAL '0 seconds' END) AS casual_playtime,
                    SUM(summed) AS total_playtime
                FROM ranked_data
                GROUP BY player_id
            )
            SELECT
                su.total_players,
                su.player_id,
                su.player_name,
                su.created_at,
                cd.tryhard_playtime,
                cd.casual_playtime,
                cd.total_playtime,
                CASE 
                    WHEN total_playtime < INTERVAL '10 hours' THEN null
                    WHEN EXTRACT(EPOCH FROM tryhard_playtime) / NULLIF(EXTRACT(EPOCH FROM total_playtime), 0) <= 0.3 THEN 'casual'
                    WHEN EXTRACT(EPOCH FROM tryhard_playtime) / NULLIF(EXTRACT(EPOCH FROM total_playtime), 0) >= 0.7 THEN 'tryhard'
                    WHEN EXTRACT(EPOCH FROM tryhard_playtime) / NULLIF(EXTRACT(EPOCH FROM total_playtime), 0) BETWEEN 0.4 AND 0.6 THEN 'mixed'
                    ELSE 'unknown'
                END AS category,
	            (SELECT map FROM user_played WHERE player_id=su.player_id ORDER BY played DESC LIMIT 1) as favourite_map
            FROM categorized_data cd
            JOIN searched_users su
                ON cd.player_id=su.player_id
            ORDER BY ranked DESC, cd.total_playtime DESC;
        ", format!("%{}%", player_name.0), paging, pagination).fetch_all(&data.0.pool)
        .await else {
            return response!(ok DetailedPlayerSearch { total_players: 0, players: vec![] })
        };
        let total_player_count = result
            .first()
            .and_then(|e| e.total_players)
            .unwrap_or_default();
        return response!(ok DetailedPlayerSearch { total_players: total_player_count, players: iter_convert(result) })
    }

    #[oai(path = "/players/:player_id/graph/sessions", method = "get")]
    async fn get_player_sessions(&self, data: Data<&AppData>, player_id: Path<i64>) -> Response<Vec<PlayerSessionTime>>{
        let pool = &data.pool;
        let Ok(result) = sqlx::query_as!(DbPlayerSessionTime, "
            SELECT 
                DATE_TRUNC('day', started_at) AS bucket_time,
                ROUND((SUM(EXTRACT(EPOCH FROM (ended_at - started_at))) / 3600)::numeric, 2)::double precision AS hour_duration
            FROM public.player_server_session
            WHERE player_id = $1
            GROUP BY bucket_time
            ORDER BY bucket_time;
        ", player_id.0.to_string()).fetch_all(pool).await else {
            return response!(ok vec![])
        };
        response!(ok iter_convert(result))
    }
    #[oai(path = "/players/:player_id/infractions", method = "get")]
    async fn get_player_infractions(&self, data: Data<&AppData>, player_id: Path<i64>) -> Response<Vec<PlayerInfraction>> {
        let pool = &data.pool;
        let Ok(result) = sqlx::query_as!(DbPlayerInfraction, "
            SELECT 
                infraction_id,
                payload->>'reason' reason, 
                payload->'admin'->>'admin_name' as by,
				payload->'admin'->>'avatar_id' as admin_avatar,
				(payload->>'flags')::int flags,
                to_timestamp((payload->>'created')::double precision::bigint) infraction_time
            FROM public.server_infractions
            WHERE payload->'player' ? 'gs_id' 
            AND payload->'player'->>'gs_id' = $1
            ORDER BY infraction_time DESC
        ", player_id.0.to_string()).fetch_all(pool).await else {
			return response!(internal_server_error)
        };
        response!(ok iter_convert(result))
    }
    #[oai(path = "/players/:player_id/detail", method = "get")]
    async fn get_player_detail(&self, data: Data<&AppData>, player_id: Path<i64>) -> Response<DetailedPlayer>{
        let pool = &data.0.pool;
        let Ok(detail) = sqlx::query_as!(DbPlayerDetail, "
            WITH user_played  AS (
                SELECT 
                    mp.server_id,
                    mp.map,
                    SUM(LEAST(pss.ended_at, sm.ended_at) - GREATEST(pss.started_at, sm.started_at)) AS played
                FROM player_server_session pss
                JOIN server_map_played sm 
                	ON sm.server_id = pss.server_id
                JOIN server_map mp
                    ON sm.map=mp.map AND sm.server_id=mp.server_id
                WHERE pss.player_id=$1
                	AND pss.started_at < sm.ended_at
                	AND pss.ended_at   > sm.started_at
                GROUP BY mp.server_id, mp.map
                ORDER BY played DESC
            ), categorized AS (
                SELECT
                    mp.server_id, 
                COALESCE(is_casual, false) casual, COALESCE(is_tryhard, false) tryhard, SUM(played) total
                FROM user_played up
                LEFT JOIN server_map mp
                    ON mp.map=up.map AND mp.server_id=up.server_id
                GROUP BY mp.server_id, is_casual, is_tryhard
                ORDER BY total DESC
            ), hard_or_casual AS (
                SELECT 
                    server_id,
                CASE WHEN tryhard THEN false ELSE casual END AS is_casual,
                CASE WHEN tryhard THEN true ELSE false END AS is_tryhard,
                SUM(total) summed
                FROM categorized
                GROUP BY server_id, is_casual, is_tryhard
                ORDER BY summed DESC
            ),
            ranked_data AS (
                SELECT *, 
                    ROW_NUMBER() OVER (ORDER BY summed DESC) AS rnk,
                    SUM(summed) OVER() AS full_play
                FROM hard_or_casual
            ), categorized_data AS (
                SELECT 
                    SUM(CASE WHEN is_tryhard THEN summed ELSE INTERVAL '0 seconds' END) AS tryhard_playtime,
                    SUM(CASE WHEN is_casual THEN summed ELSE INTERVAL '0 seconds' END) AS casual_playtime,
                    SUM(summed) AS total_playtime
                FROM ranked_data
            )
            SELECT
                0::BIGINT AS total_players,
                su.player_id,
                su.player_name,
                su.created_at,
                cd.tryhard_playtime,
                cd.casual_playtime,
                cd.total_playtime,
                CASE 
                    WHEN total_playtime < INTERVAL '10 hours' THEN null
                    WHEN EXTRACT(EPOCH FROM tryhard_playtime) / NULLIF(EXTRACT(EPOCH FROM total_playtime), 0) <= 0.3 THEN 'casual'
                    WHEN EXTRACT(EPOCH FROM tryhard_playtime) / NULLIF(EXTRACT(EPOCH FROM total_playtime), 0) >= 0.7 THEN 'tryhard'
                    WHEN EXTRACT(EPOCH FROM tryhard_playtime) / NULLIF(EXTRACT(EPOCH FROM total_playtime), 0) BETWEEN 0.4 AND 0.6 THEN 'mixed'
                    ELSE 'unknown'
                END AS category,
	            (SELECT map FROM user_played WHERE player_id=su.player_id ORDER BY played DESC LIMIT 1) as favourite_map
			FROM player su
            JOIN categorized_data cd ON true
			WHERE su.player_id=$1
            LIMIT 1
        ", player_id.0.to_string())
        .fetch_one(pool)
        .await else {
			return response!(internal_server_error)
        };
        
        response!(ok detail.into())
    }
    #[oai(path = "/players/:player_id/pfp.png", method = "get")]
    async fn get_player_pfp(&self, data: Data<&AppData>, player_id: Path<i64>) -> Response<PlayerProfilePicture>{
        let Some(provider) = &data.0.steam_provider else {
            return response!(err "This feature is disabled.", ErrorCode::NotImplemented)
        };
        let url = format!("{provider}/steams/pfp/{}", player_id.0);
        let Ok(resp) = reqwest::get(url).await else {
            return response!(err "This feature is disabled.", ErrorCode::NotImplemented)
        };
        let Ok(result) = resp
        .json::<ProviderResponse>()
        .await else {
            return response!(err "Failed to get user profile.", ErrorCode::NotFound)
        };
        
        response!(ok PlayerProfilePicture{
            id: player_id.0,
            url: result.url
        })
    }
    #[oai(path="/players/:player_id/most_played_maps", method="get")]
    async fn get_player_most_played(&self, data: Data<&AppData>, player_id: Path<i64>) -> Response<Vec<PlayerMostPlayedMap>>{
        let Ok(result) = sqlx::query_as!(DbPlayerMapPlayed, "
            SELECT 
                mp.server_id,
                mp.map,
                SUM(LEAST(pss.ended_at, sm.ended_at) - GREATEST(pss.started_at, sm.started_at)) AS played
            FROM player_server_session pss
            JOIN server_map_played sm 
            	ON sm.server_id = pss.server_id
            JOIN server_map mp
                ON sm.map=mp.map AND sm.server_id=mp.server_id
            WHERE pss.player_id=$1
            	AND pss.started_at < sm.ended_at
            	AND pss.ended_at   > sm.started_at
            GROUP BY mp.server_id, mp.map
            ORDER BY played DESC
            LIMIT 10
        ", player_id.0.to_string()).fetch_all(&data.pool).await else {
            return response!(ok vec![])
        };
        response!(ok iter_convert(result))
    }
    #[oai(path="/players/:player_id/regions", method="get")]
    async fn get_player_region(&self, data: Data<&AppData>, player_id: Path<i64>) -> Response<Vec<PlayerRegionTime>>{
        let Ok(result) = sqlx::query_as!(DbPlayerRegionTime, "
            WITH session_days AS (
            SELECT 
                s.session_id,
                generate_series(
                date_trunc('day', s.started_at),
                date_trunc('day', s.ended_at),
                interval '1 day'
                ) AS session_day,
                s.started_at,
                s.ended_at
            FROM player_server_session s
            WHERE player_id = $1
            ),
            region_intervals AS (
            SELECT
                sd.session_id,
                rt.region_id,
                ((sd.session_day::date || ' ' || rt.start_time::text)::timestamptz) AS region_start,
                CASE 
                WHEN rt.start_time < rt.end_time THEN 
                    ((sd.session_day::date || ' ' || rt.end_time::text)::timestamptz)
                ELSE 
                    (((sd.session_day::date + 1) || ' ' || rt.end_time::text)::timestamptz)
                END AS region_end,
                sd.started_at,
                sd.ended_at
            FROM session_days sd
            CROSS JOIN region_time rt
            ),
            session_region_overlap AS (
            SELECT
                session_id,
                region_id,
                GREATEST(region_start, started_at) AS overlap_start,
                LEAST(region_end, ended_at) AS overlap_end
            FROM region_intervals
            WHERE LEAST(region_end, ended_at) > GREATEST(region_start, started_at)
            ), finished AS (
                SELECT 
                region_id,
                sum(overlap_end - overlap_start) AS played_time
                FROM session_region_overlap
                GROUP BY region_id
            )
            SELECT *, 
                (SELECT region_name FROM region_time WHERE region_id=o.region_id LIMIT 1) AS region_name
            FROM finished o
            ORDER BY o.played_time

        ", player_id.0.to_string())
            .fetch_all(&data.0.pool)
            .await else {
                return response!(internal_server_error)
            };

        response!(ok iter_convert(result))
    }

}