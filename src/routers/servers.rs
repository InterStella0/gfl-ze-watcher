use std::collections::HashMap;
use poem::web::Data;
use poem_openapi::OpenApi;
use crate::{response, AppData};
use crate::model::DbServerCommunity;
use crate::routers::api_models::{Community, Response, RoutePattern, UriPatternExt};
use crate::utils::{cached_response, IterConvert};

pub struct ServerApi;
#[OpenApi]
impl ServerApi {
    #[oai(path = "/communities", method="get")]
    async fn get_communities(&self, Data(data): Data<&AppData>) -> Response<Vec<Community>> {
        let pool = &data.pool;
        let func = || sqlx::query_as!(DbServerCommunity, "
            SELECT
                c.community_id,
                c.community_name,
                s.server_id,
                s.server_name,
                s.server_port,
                s.server_ip,
                s.max_players,
                s.server_fullname,
                s.online,
                LEAST((SELECT COUNT(DISTINCT player_id) FROM player_server_session p
                    WHERE p.server_id = s.server_id
                    AND p.ended_at IS NULL
                    AND CURRENT_TIMESTAMP - p.started_at < INTERVAL '24 hours'),
                    COALESCE(s.max_players, 64)
                ) AS player_count
            FROM server s
            INNER JOIN community c
                ON c.community_id = s.community_id
            ORDER BY c.community_name
        ").fetch_all(pool);

        let Ok(response) = cached_response("communities", &data.cache, 60, func).await else {
            return response!(internal_server_error)
        };
        let mut maps: HashMap<(String, String), Vec<DbServerCommunity>> = HashMap::new();
        let data = response.result;
        for d in data{
            let key = (d.community_id.clone(), d.community_name.clone().unwrap_or_default());
            maps.entry(key).or_default().push(d);
        }
        let mut results = vec![];
        for ((id, name), items) in maps{
            results.push(Community{
                id, name, servers: items.iter_into()
            })
        }
        results.sort();
        response!(ok results)
    }
}
impl UriPatternExt for ServerApi {
    fn get_all_patterns(&self) -> Vec<RoutePattern<'_>> {
        vec![
            "/communities",
        ].iter_into()
    }
}