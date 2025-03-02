use chrono::Duration;
use poem::web::{Data, Path};
use poem_openapi::OpenApi;
use poem_openapi::param::Query;
use sqlx::{Pool, Postgres};
use crate::{response, AppData};
use crate::model::{DbServer, DbServerMapPlayed};
use crate::routers::api_models::{ErrorCode, Response, ServerMapPlayed, ServerMapPlayedPaginated};
use crate::utils::IterConvert;

pub struct MapApi;

#[OpenApi]
impl MapApi{
    pub async fn get_server(&self, pool: &Pool<Postgres>, server_id: &str) -> Option<DbServer>{
        sqlx::query_as!(DbServer, "SELECT * FROM server WHERE server_id=$1 LIMIT 1", server_id)
            .fetch_one(pool)
            .await
            .ok()
    }
    #[oai(path = "/servers/:server_id/maps", method = "get")]
    async fn get_maps(
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
}