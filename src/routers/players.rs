use chrono::{DateTime, Utc};
use poem::web::{Data};
use poem_openapi::{param::{Path, Query}, Object, OpenApi};
use serde::{Deserialize, Serialize};

use crate::{model::{DbPlayer, DbPlayerSearched, ErrorCode, Response}, response, AppData};

#[derive(Object)]
pub struct PlayerSessionDetail;

#[derive(Object)]
pub struct PlayerInfractions;

#[derive(Object)]
pub struct PlayerDetail;


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
    name: String,
    id: String
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
pub struct PlayerApi;


#[OpenApi]
impl PlayerApi{
    #[oai(path = "/players/autocomplete", method = "get")]
    async fn get_players_autocomplete(&self, data: Data<&AppData>, player_name: Query<String>) -> Response<Vec<SearchPlayer>>{
        response!(todo)
    }
    #[oai(path = "/players/search", method = "get")]
    async fn get_players_search(&self, data: Data<&AppData>, player_name: Query<String>, page: Query<usize>) -> Response<DetailedPlayerSearch>{
        let pagination = 40;
        let paging = page.0 as i64 * pagination;
        let Ok(result) = sqlx::query_as!(DbPlayerSearched, "
            WITH VARS as (
                SELECT 
                    $1::text AS target
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
        let resp: Vec<DetailedPlayer> = result.into_iter()
            .map(|e| e.into())
            .collect();
        return response!(ok DetailedPlayerSearch { total_players: total_player_count, players: resp })
    }

    #[oai(path = "/players/:player_id/graph/sessions", method = "get")]
    async fn get_player_sessions(&self) -> Response<PlayerSessionDetail>{
        response!(todo)
    }
    #[oai(path = "/players/:player_id/graph/infractions", method = "get")]
    async fn get_player_infractions(&self) -> Response<PlayerInfractions> {
        response!(todo)
    }
    #[oai(path = "/players/:player_id/details", method = "get")]
    async fn get_player_detail(&self) -> Response<PlayerDetail>{
        response!(todo)
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
}