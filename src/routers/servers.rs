use indexmap::IndexMap;
use poem::web::Data;
use poem_openapi::OpenApi;
use crate::{response, AppData};
use crate::core::model::*;
use crate::core::api_models::*;
use crate::core::utils::*;

pub struct ServerApi;
#[OpenApi]
impl ServerApi {
    #[oai(path = "/communities", method="get")]
    async fn get_communities(&self, Data(data): Data<&AppData>) -> Response<Vec<Community>> {
        let pool = &*data.pool.clone();
        let func = || sqlx::query_as!(DbServerCommunity, "
            SELECT
                c.community_id,
                c.community_name,
                c.community_shorten_name,
                c.community_icon_url,
                s.server_id,
                s.server_name,
                s.server_port,
                s.server_ip,
                s.max_players,
                s.server_fullname,
                s.online,
                s.readable_link,
                LEAST((SELECT COUNT(DISTINCT player_id) FROM player_server_session p
                    WHERE p.server_id = s.server_id
                    AND p.ended_at IS NULL
                    AND CURRENT_TIMESTAMP - p.started_at < INTERVAL '24 hours'),
                    COALESCE(s.max_players, 64)
                ) AS player_count,
                sm.server_website,
                sm.server_discord_link,
                sm.server_source,
                COALESCE(sm.source_by_id, false) source_by_id,
                COALESCE(smp.map, NULL) AS map
            FROM server s
            INNER JOIN community c
                ON c.community_id = s.community_id
            LEFT JOIN LATERAL (
                SELECT map
                FROM server_map_played
                WHERE server_id = s.server_id
                  AND ended_at IS NULL
                ORDER BY started_at DESC
                LIMIT 1
            ) smp ON true
            LEFT JOIN server_metadata sm
                ON sm.server_id=s.server_id
            ORDER BY player_count DESC, online DESC, c.community_name
        ").fetch_all(pool);

        let Ok(response) = cached_response("communities", &data.cache, 60, func).await else {
            return response!(internal_server_error)
        };
        let mut results: IndexMap<String, Community> = IndexMap::new();
        let data = response.result;

        for d in data {
            let id = &d.community_id;
            let com = results.entry(id.clone()).or_insert(Community {
                id: id.clone(),
                name: d.community_name.clone().unwrap_or_default(),
                shorten_name: d.community_shorten_name.clone(),
                icon_url: d.community_icon_url.clone(),
                servers: vec![]
            });
            com.servers.push(d.into())
        }

        response!(ok results.into_values().collect())
    }

    #[oai(path = "/fetch-status", method="get")]
    async fn get_fetch_status(&self, Data(data): Data<&AppData>) -> Response<Vec<FetchStatusEntry>> {
        let pool = &*data.pool.clone();
        let func = || async {
            sqlx::query_as!(DbFetchStatus, "
                SELECT
                    fs.fetch_id,
                    fs.server_id,
                    s.server_fullname AS server_name,
                    c.community_id::TEXT AS community_id,
                    c.community_name,
                    fs.op_name,
                    fs.source_name,
                    fs.fetched_at,
                    fs.ok,
                    fs.error
                FROM server_fetch_status fs
                LEFT JOIN server s ON s.server_id = fs.server_id
                LEFT JOIN community c ON c.community_id = s.community_id
                WHERE fs.fetched_at >= CURRENT_TIMESTAMP - INTERVAL '1 day'
                ORDER BY fs.fetched_at DESC
            ")
            .fetch_all(pool)
            .await
        };

        let Ok(response) = cached_response("fetch_status", &data.cache, 60, func).await else {
            return response!(internal_server_error)
        };

        response!(ok response.result.iter_into())
    }
}
impl UriPatternExt for ServerApi {
    fn get_all_patterns(&self) -> Vec<RoutePattern<'_>> {
        vec![
            "/communities",
            "/fetch-status",
        ].iter_into()
    }
}