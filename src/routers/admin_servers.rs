use poem::web::Data;
use poem_openapi::payload::Json;
use poem_openapi::{Object, OpenApi};
use poem_openapi::param::{Path, Query};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::core::api_models::*;
use crate::core::utils::*;
use crate::{response, AppData};

pub struct AdminServersApi;

const VALID_COOLDOWN_TYPES: &[&str] = &["unknown", "datetime", "map_count"];

// ─── Community ────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Object, Clone)]
pub struct AdminCommunity {
    pub id: String,
    pub name: Option<String>,
    pub shorten_name: Option<String>,
    pub icon_url: Option<String>,
    pub server_count: i64,
}

#[derive(Debug, Serialize, Deserialize, Object)]
pub struct CreateCommunityPayload {
    pub name: String,
    pub shorten_name: Option<String>,
    pub icon_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Object)]
pub struct UpdateCommunityPayload {
    pub name: Option<String>,
    pub shorten_name: Option<String>,
    pub icon_url: Option<String>,
}

// ─── Server Browser ───────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Object, Clone)]
pub struct AdminServerBrowser {
    pub ip: String,
    pub port: i16,
    pub tracking: bool,
    pub cooldown_type: String,
}

#[derive(Debug, Serialize, Deserialize, Object)]
pub struct CreateServerBrowserPayload {
    pub ip: String,
    pub port: i16,
    pub tracking: Option<bool>,
    pub cooldown_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Object)]
pub struct UpdateServerBrowserPayload {
    pub tracking: Option<bool>,
    pub cooldown_type: Option<String>,
}

// ─── Scraped Server ───────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Object, Clone)]
pub struct AdminServer {
    pub server_id: String,
    pub server_name: Option<String>,
    pub server_fullname: Option<String>,
    pub server_ip: Option<String>,
    pub server_port: Option<i32>,
    pub community_id: Option<String>,
    pub online: Option<bool>,
    pub readable_link: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Object)]
pub struct UpdateServerPayload {
    pub server_name: Option<String>,
    pub readable_link: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Object)]
pub struct SetServerCommunityPayload {
    /// UUID string to assign, or null/empty string to detach
    pub community_id: Option<String>,
}

#[OpenApi]
impl AdminServersApi {
    // ─── Community CRUD ───────────────────────────────────────────────────────

    #[oai(path = "/admin/communities", method = "get")]
    async fn list_communities(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
    ) -> Response<Vec<AdminCommunity>> {
        if !check_superuser(data, user_token.id).await {
            return response!(err "Unauthorized", ErrorCode::Forbidden);
        }

        struct DbRow {
            community_id: Uuid,
            community_name: Option<String>,
            community_shorten_name: Option<String>,
            community_icon_url: Option<String>,
            server_count: Option<i64>,
        }

        let rows = match sqlx::query_as!(
            DbRow,
            r#"
            SELECT c.community_id, c.community_name, c.community_shorten_name, c.community_icon_url,
                   COUNT(s.server_id) AS server_count
            FROM community c
            LEFT JOIN server s ON s.community_id = c.community_id
            GROUP BY c.community_id
            ORDER BY c.community_name NULLS LAST
            "#
        )
        .fetch_all(&*data.pool)
        .await
        {
            Ok(r) => r,
            Err(e) => {
                tracing::error!("Failed to list communities: {}", e);
                return response!(internal_server_error);
            }
        };

        response!(ok rows.into_iter().map(|r| AdminCommunity {
            id: r.community_id.to_string(),
            name: r.community_name,
            shorten_name: r.community_shorten_name,
            icon_url: r.community_icon_url,
            server_count: r.server_count.unwrap_or(0),
        }).collect())
    }

    #[oai(path = "/admin/communities", method = "post")]
    async fn create_community(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
        Json(payload): Json<CreateCommunityPayload>,
    ) -> Response<AdminCommunity> {
        if !check_superuser(data, user_token.id).await {
            return response!(err "Unauthorized", ErrorCode::Forbidden);
        }
        if payload.name.trim().is_empty() {
            return response!(err "Name is required", ErrorCode::BadRequest);
        }
        if let Some(ref s) = payload.shorten_name {
            if s.len() > 20 {
                return response!(err "Short name must be 20 characters or fewer", ErrorCode::BadRequest);
            }
        }

        let row = match sqlx::query!(
            r#"
            INSERT INTO community (community_name, community_shorten_name, community_icon_url)
            VALUES ($1, $2, $3)
            RETURNING community_id
            "#,
            payload.name,
            payload.shorten_name,
            payload.icon_url,
        )
        .fetch_one(&*data.pool)
        .await
        {
            Ok(r) => r,
            Err(e) => {
                tracing::error!("Failed to create community: {}", e);
                return response!(internal_server_error);
            }
        };

        response!(ok AdminCommunity {
            id: row.community_id.to_string(),
            name: Some(payload.name),
            shorten_name: payload.shorten_name,
            icon_url: payload.icon_url,
            server_count: 0,
        })
    }

    #[oai(path = "/admin/communities/:id", method = "put")]
    async fn update_community(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
        Path(id): Path<String>,
        Json(payload): Json<UpdateCommunityPayload>,
    ) -> Response<AdminCommunity> {
        if !check_superuser(data, user_token.id).await {
            return response!(err "Unauthorized", ErrorCode::Forbidden);
        }
        let id = match Uuid::parse_str(&id) {
            Ok(u) => u,
            Err(_) => return response!(err "Invalid community ID", ErrorCode::BadRequest),
        };
        if let Some(ref s) = payload.shorten_name {
            if s.len() > 20 {
                return response!(err "Short name must be 20 characters or fewer", ErrorCode::BadRequest);
            }
        }

        struct DbRow {
            community_id: Uuid,
            community_name: Option<String>,
            community_shorten_name: Option<String>,
            community_icon_url: Option<String>,
        }

        let row = match sqlx::query_as!(
            DbRow,
            r#"
            UPDATE community SET
                community_name         = COALESCE($2, community_name),
                community_shorten_name = CASE WHEN $3 THEN $4 ELSE community_shorten_name END,
                community_icon_url     = CASE WHEN $5 THEN $6 ELSE community_icon_url END
            WHERE community_id = $1
            RETURNING community_id, community_name, community_shorten_name, community_icon_url
            "#,
            id,
            payload.name,
            payload.shorten_name.is_some(),
            payload.shorten_name,
            payload.icon_url.is_some(),
            payload.icon_url,
        )
        .fetch_optional(&*data.pool)
        .await
        {
            Ok(Some(r)) => r,
            Ok(None) => return response!(err "Community not found", ErrorCode::NotFound),
            Err(e) => {
                tracing::error!("Failed to update community: {}", e);
                return response!(internal_server_error);
            }
        };

        let server_count = sqlx::query_scalar!(
            "SELECT COUNT(*) FROM server WHERE community_id = $1",
            id
        )
        .fetch_one(&*data.pool)
        .await
        .unwrap_or(Some(0))
        .unwrap_or(0);

        response!(ok AdminCommunity {
            id: row.community_id.to_string(),
            name: row.community_name,
            shorten_name: row.community_shorten_name,
            icon_url: row.community_icon_url,
            server_count,
        })
    }

    #[oai(path = "/admin/communities/:id", method = "delete")]
    async fn delete_community(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
        Path(id): Path<String>,
    ) -> Response<bool> {
        if !check_superuser(data, user_token.id).await {
            return response!(err "Unauthorized", ErrorCode::Forbidden);
        }
        let id = match Uuid::parse_str(&id) {
            Ok(u) => u,
            Err(_) => return response!(err "Invalid community ID", ErrorCode::BadRequest),
        };

        let result = match sqlx::query!("DELETE FROM community WHERE community_id = $1", id)
            .execute(&*data.pool)
            .await
        {
            Ok(r) => r,
            Err(e) => {
                tracing::error!("Failed to delete community: {}", e);
                return response!(internal_server_error);
            }
        };

        if result.rows_affected() == 0 {
            return response!(err "Community not found", ErrorCode::NotFound);
        }
        response!(ok true)
    }

    // ─── Server Browser CRUD ──────────────────────────────────────────────────

    #[oai(path = "/admin/server-browsers", method = "get")]
    async fn list_server_browsers(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
    ) -> Response<Vec<AdminServerBrowser>> {
        if !check_superuser(data, user_token.id).await {
            return response!(err "Unauthorized", ErrorCode::Forbidden);
        }

        let rows = match sqlx::query!(
            "SELECT ip, port, tracking, cooldown_type FROM server_browser ORDER BY ip, port"
        )
        .fetch_all(&*data.pool)
        .await
        {
            Ok(r) => r,
            Err(e) => {
                tracing::error!("Failed to list server_browsers: {}", e);
                return response!(internal_server_error);
            }
        };

        response!(ok rows.into_iter().map(|r| AdminServerBrowser {
            ip: r.ip,
            port: r.port,
            tracking: r.tracking,
            cooldown_type: r.cooldown_type,
        }).collect())
    }

    #[oai(path = "/admin/server-browsers", method = "post")]
    async fn create_server_browser(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
        Json(payload): Json<CreateServerBrowserPayload>,
    ) -> Response<AdminServerBrowser> {
        if !check_superuser(data, user_token.id).await {
            return response!(err "Unauthorized", ErrorCode::Forbidden);
        }
        if payload.ip.trim().is_empty() {
            return response!(err "IP is required", ErrorCode::BadRequest);
        }
        let cooldown_type = payload.cooldown_type.unwrap_or_else(|| "unknown".to_string());
        if !VALID_COOLDOWN_TYPES.contains(&cooldown_type.as_str()) {
            return response!(err "cooldown_type must be unknown, datetime, or map_count", ErrorCode::BadRequest);
        }
        let tracking = payload.tracking.unwrap_or(true);

        let row = match sqlx::query!(
            r#"
            INSERT INTO server_browser (ip, port, tracking, cooldown_type)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (ip, port) DO UPDATE
                SET tracking = EXCLUDED.tracking, cooldown_type = EXCLUDED.cooldown_type
            RETURNING ip, port, tracking, cooldown_type
            "#,
            payload.ip,
            payload.port,
            tracking,
            cooldown_type,
        )
        .fetch_one(&*data.pool)
        .await
        {
            Ok(r) => r,
            Err(e) => {
                tracing::error!("Failed to create server_browser: {}", e);
                return response!(internal_server_error);
            }
        };

        response!(ok AdminServerBrowser {
            ip: row.ip,
            port: row.port,
            tracking: row.tracking,
            cooldown_type: row.cooldown_type,
        })
    }

    #[oai(path = "/admin/server-browsers", method = "put")]
    async fn update_server_browser(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
        Query(ip): Query<String>,
        Query(port): Query<i16>,
        Json(payload): Json<UpdateServerBrowserPayload>,
    ) -> Response<AdminServerBrowser> {
        if !check_superuser(data, user_token.id).await {
            return response!(err "Unauthorized", ErrorCode::Forbidden);
        }
        if let Some(ref ct) = payload.cooldown_type {
            if !VALID_COOLDOWN_TYPES.contains(&ct.as_str()) {
                return response!(err "cooldown_type must be unknown, datetime, or map_count", ErrorCode::BadRequest);
            }
        }

        let row = match sqlx::query!(
            r#"
            UPDATE server_browser SET
                tracking     = COALESCE($3, tracking),
                cooldown_type = COALESCE($4, cooldown_type)
            WHERE ip = $1 AND port = $2
            RETURNING ip, port, tracking, cooldown_type
            "#,
            ip,
            port,
            payload.tracking,
            payload.cooldown_type,
        )
        .fetch_optional(&*data.pool)
        .await
        {
            Ok(Some(r)) => r,
            Ok(None) => return response!(err "Entry not found", ErrorCode::NotFound),
            Err(e) => {
                tracing::error!("Failed to update server_browser: {}", e);
                return response!(internal_server_error);
            }
        };

        response!(ok AdminServerBrowser {
            ip: row.ip,
            port: row.port,
            tracking: row.tracking,
            cooldown_type: row.cooldown_type,
        })
    }

    #[oai(path = "/admin/server-browsers", method = "delete")]
    async fn delete_server_browser(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
        Query(ip): Query<String>,
        Query(port): Query<i16>,
    ) -> Response<bool> {
        if !check_superuser(data, user_token.id).await {
            return response!(err "Unauthorized", ErrorCode::Forbidden);
        }

        let result = match sqlx::query!(
            "DELETE FROM server_browser WHERE ip = $1 AND port = $2",
            ip,
            port,
        )
        .execute(&*data.pool)
        .await
        {
            Ok(r) => r,
            Err(e) => {
                tracing::error!("Failed to delete server_browser: {}", e);
                return response!(internal_server_error);
            }
        };

        if result.rows_affected() == 0 {
            return response!(err "Entry not found", ErrorCode::NotFound);
        }
        response!(ok true)
    }

    // ─── Scraped Server endpoints ─────────────────────────────────────────────

    #[oai(path = "/admin/servers-list", method = "get")]
    async fn list_servers_admin(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
    ) -> Response<Vec<AdminServer>> {
        if !check_superuser(data, user_token.id).await {
            return response!(err "Unauthorized", ErrorCode::Forbidden);
        }

        struct DbRow {
            server_id: String,
            server_name: Option<String>,
            server_fullname: Option<String>,
            server_ip: Option<String>,
            server_port: Option<i32>,
            community_id: Option<Uuid>,
            online: Option<bool>,
            readable_link: Option<String>,
        }

        let rows = match sqlx::query_as!(
            DbRow,
            r#"
            SELECT server_id, server_name, server_fullname, server_ip, server_port,
                   community_id, online, readable_link
            FROM server
            ORDER BY server_fullname NULLS LAST, server_name NULLS LAST
            "#
        )
        .fetch_all(&*data.pool)
        .await
        {
            Ok(r) => r,
            Err(e) => {
                tracing::error!("Failed to list servers: {}", e);
                return response!(internal_server_error);
            }
        };

        response!(ok rows.into_iter().map(|r| AdminServer {
            server_id: r.server_id,
            server_name: r.server_name,
            server_fullname: r.server_fullname,
            server_ip: r.server_ip,
            server_port: r.server_port,
            community_id: r.community_id.map(|u| u.to_string()),
            online: r.online,
            readable_link: r.readable_link,
        }).collect())
    }

    #[oai(path = "/admin/servers-list/:server_id", method = "put")]
    async fn update_server_admin(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
        Path(server_id): Path<String>,
        Json(payload): Json<UpdateServerPayload>,
    ) -> Response<AdminServer> {
        if !check_superuser(data, user_token.id).await {
            return response!(err "Unauthorized", ErrorCode::Forbidden);
        }

        struct DbRow {
            server_id: String,
            server_name: Option<String>,
            server_fullname: Option<String>,
            server_ip: Option<String>,
            server_port: Option<i32>,
            community_id: Option<Uuid>,
            online: Option<bool>,
            readable_link: Option<String>,
        }

        let row = match sqlx::query_as!(
            DbRow,
            r#"
            UPDATE server SET
                server_name   = COALESCE($2, server_name),
                readable_link = CASE WHEN $3 THEN $4 ELSE readable_link END
            WHERE server_id = $1
            RETURNING server_id, server_name, server_fullname, server_ip, server_port,
                      community_id, online, readable_link
            "#,
            server_id,
            payload.server_name,
            payload.readable_link.is_some(),
            payload.readable_link,
        )
        .fetch_optional(&*data.pool)
        .await
        {
            Ok(Some(r)) => r,
            Ok(None) => return response!(err "Server not found", ErrorCode::NotFound),
            Err(e) => {
                tracing::error!("Failed to update server: {}", e);
                return response!(internal_server_error);
            }
        };

        response!(ok AdminServer {
            server_id: row.server_id,
            server_name: row.server_name,
            server_fullname: row.server_fullname,
            server_ip: row.server_ip,
            server_port: row.server_port,
            community_id: row.community_id.map(|u| u.to_string()),
            online: row.online,
            readable_link: row.readable_link,
        })
    }

    #[oai(path = "/admin/servers-list/:server_id/community", method = "put")]
    async fn set_server_community(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
        Path(server_id): Path<String>,
        Json(payload): Json<SetServerCommunityPayload>,
    ) -> Response<AdminServer> {
        if !check_superuser(data, user_token.id).await {
            return response!(err "Unauthorized", ErrorCode::Forbidden);
        }

        let community_id: Option<Uuid> = match payload.community_id.as_deref() {
            Some(id) if !id.is_empty() => match Uuid::parse_str(id) {
                Ok(u) => Some(u),
                Err(_) => return response!(err "Invalid community_id", ErrorCode::BadRequest),
            },
            _ => None,
        };

        struct DbRow {
            server_id: String,
            server_name: Option<String>,
            server_fullname: Option<String>,
            server_ip: Option<String>,
            server_port: Option<i32>,
            community_id: Option<Uuid>,
            online: Option<bool>,
            readable_link: Option<String>,
        }

        let row = match sqlx::query_as!(
            DbRow,
            r#"
            UPDATE server SET community_id = $2
            WHERE server_id = $1
            RETURNING server_id, server_name, server_fullname, server_ip, server_port,
                      community_id, online, readable_link
            "#,
            server_id,
            community_id,
        )
        .fetch_optional(&*data.pool)
        .await
        {
            Ok(Some(r)) => r,
            Ok(None) => return response!(err "Server not found", ErrorCode::NotFound),
            Err(e) => {
                tracing::error!("Failed to set server community: {}", e);
                return response!(internal_server_error);
            }
        };

        response!(ok AdminServer {
            server_id: row.server_id,
            server_name: row.server_name,
            server_fullname: row.server_fullname,
            server_ip: row.server_ip,
            server_port: row.server_port,
            community_id: row.community_id.map(|u| u.to_string()),
            online: row.online,
            readable_link: row.readable_link,
        })
    }

    #[oai(path = "/admin/servers-list/:server_id", method = "delete")]
    async fn delete_server_admin(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
        Path(server_id): Path<String>,
    ) -> Response<bool> {
        if !check_superuser(data, user_token.id).await {
            return response!(err "Unauthorized", ErrorCode::Forbidden);
        }

        let result = match sqlx::query!("DELETE FROM server WHERE server_id = $1", server_id)
            .execute(&*data.pool)
            .await
        {
            Ok(r) => r,
            Err(e) => {
                tracing::error!("Failed to delete server: {}", e);
                return response!(internal_server_error);
            }
        };

        if result.rows_affected() == 0 {
            return response!(err "Server not found", ErrorCode::NotFound);
        }
        response!(ok true)
    }
}

impl UriPatternExt for AdminServersApi {
    fn get_all_patterns(&self) -> Vec<RoutePattern<'_>> {
        vec![
            "/admin/communities",
            "/admin/communities/{id}",
            "/admin/server-browsers",
            "/admin/servers-list",
            "/admin/servers-list/{server_id}",
            "/admin/servers-list/{server_id}/community",
        ]
        .iter_into()
    }
}
