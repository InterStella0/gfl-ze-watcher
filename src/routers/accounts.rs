use std::fmt::Display;
use chrono::Utc;
use poem::web::Data;
use poem_openapi::payload::Json;
use poem_openapi::{Enum, Object, OpenApi};
use poem_openapi::param::{Path, Query};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use tokio::time::sleep;
use uuid::Uuid;

use crate::core::api_models::{Announcement, AnnouncementStatus, AnnouncementType, AnnouncementsPaginated, BanStatus, CommentReportAdmin, CommentReportsPaginated, CreateAnnouncementDto, CreateBanDto, ErrorCode, GuideBanAdmin, GuideBansPaginated, GuideReportAdmin, GuideReportsPaginated, MapMusicReportAdmin, MapMusicReportsPaginated, Response, RoutePattern, SteamApiResponse, SteamProfile, UpdateAnnouncementDto, UpdateMapMusicDto, UpdateReportStatusDto, UriPatternExt, UserAnonymization};
use crate::core::model::{AnnouncementTypeState, CommunityVisibilityState, DbAnnouncement, DbCommentReportFull, DbGuideBan, DbGuideReportFull, DbMapMusicReportFull, DbSteam, DbUserAnonymization, PersonaState};
use crate::core::utils::{check_superuser, db_to_utc, get_env, ChronoToTime, IterConvert, TokenBearer};
use crate::{response, AppData};

pub struct AccountsApi;

#[derive(Debug, Serialize, Deserialize, Object, Clone)]
pub struct AnonymizationRequest {
    pub community_id: String,
    pub anonymize: Option<bool>,
    pub hide_location: Option<bool>,
}

// Helper function to extract YouTube video ID from various URL formats
fn extract_youtube_id(url: &str) -> Option<String> {
    // Handle different YouTube URL formats:
    // - https://www.youtube.com/watch?v=VIDEO_ID
    // - https://youtu.be/VIDEO_ID
    // - Just VIDEO_ID (if user pastes only the ID)

    if url.contains("youtube.com/watch?v=") {
        url.split("v=")
            .nth(1)
            .and_then(|s| s.split('&').next())
            .map(|s| s.to_string())
    } else if url.contains("youtu.be/") {
        url.split("youtu.be/")
            .nth(1)
            .and_then(|s| s.split('?').next())
            .map(|s| s.to_string())
    } else {
        // Assume it's already a video ID
        Some(url.to_string())
    }
}

#[derive(Debug, Clone)]
enum UserRole {
    Superuser,
    CommunityAdmin(Uuid),
    Regular,
}


async fn get_user_role(data: &AppData, user_id: i64) -> Result<UserRole, ErrorCode> {
    // Check if superuser
    let is_superuser = sqlx::query_scalar!(
        "SELECT website.is_superuser($1) ",
        user_id
    )
    .fetch_optional(&*data.pool)
    .await
    .map_err(|_| ErrorCode::InternalServerError)?;

    if is_superuser == Some(Some(true)) {
        return Ok(UserRole::Superuser);
    }

    struct AdminCommunity {
        community_id: Option<Uuid>,
    }
    let admin_communities = sqlx::query_as!(
        AdminCommunity,
        "SELECT community_id FROM website.user_roles
         WHERE user_id = $1 AND role = 'community_admin'",
        user_id
    )
    .fetch_all(&*data.pool)
    .await
    .map_err(|_| ErrorCode::InternalServerError)?;

    if let Some(admin_comm) = admin_communities.first() {
        if let Some(community_id) = admin_comm.community_id{
            return Ok(UserRole::CommunityAdmin(community_id));
        }
    }

    Ok(UserRole::Regular)
}

async fn check_permission(
    data: &AppData,
    requester_id: i64,
    target_user_id: i64,
    community_id: Uuid
) -> Result<bool, ErrorCode> {
    if requester_id == target_user_id {
        return Ok(true);
    }

    let role = get_user_role(data, requester_id).await?;

    match role {
        UserRole::Superuser => Ok(true),
        UserRole::CommunityAdmin(admin_community) => {
            Ok(admin_community == community_id)
        }
        UserRole::Regular => Ok(false),
    }
}

async fn fetch_steam_info(steam_id: &i64) -> Result<SteamProfile, ErrorCode> {
    let base_url = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002";
    let client = reqwest::Client::new();
    let mut attempt = 0;
    let max_backoff = 300;

    loop {
        let res = client
            .get(base_url)
            .query(&[
                ("key", get_env("STEAM_API_KEY")),
                ("steamids", steam_id.to_string())
            ])
            .send()
            .await;

        match res {
            Ok(resp) => {
                if resp.status().is_success() {
                    let response = resp.json::<SteamApiResponse>()
                        .await
                        .map_err(|_| ErrorCode::InternalServerError)?;
                    let Some(profile) = response.response.players.first() else {
                        return Err(ErrorCode::NotFound)
                    };
                    return Ok(profile.clone());
                } else if resp.status() == StatusCode::TOO_MANY_REQUESTS.as_u16() {
                    attempt += 1;
                    let backoff = std::time::Duration::from_secs(2u64.pow(attempt).min(max_backoff));
                    sleep(backoff).await;
                    continue;
                } else {
                    return Err(ErrorCode::InternalServerError);
                }
            }
            Err(_) => {
                attempt += 1;
                let backoff = std::time::Duration::from_secs(2u64.pow(attempt).min(max_backoff));
                if attempt > 7 {
                    return Err(ErrorCode::FailedRetry);
                }
                sleep(backoff).await;
                continue;
            }
        }
    }
}

#[OpenApi]
impl AccountsApi {
    #[oai(path="/accounts/create", method="post")]
    async fn create_user_info(&self, Data(data): Data<&AppData>, TokenBearer(user_token): TokenBearer) -> Response<SteamProfile>{
        let user_id = user_token.id;
        if let Ok(_) = sqlx::query_as!(DbSteam,
            "SELECT user_id,
                community_visibility_state AS \"community_visibility_state: CommunityVisibilityState\",
                profile_state,
                persona_name,
                profile_url,
                avatar,
                avatar_medium,
                avatar_full,
                avatar_hash,
                last_log_off,
                persona_state AS \"persona_state: PersonaState\",
                primary_clan_id,
                time_created,
                persona_state_flags,
                comment_permission
            FROM website.steam_user WHERE user_id=$1 LIMIT 1", user_id
        ).fetch_one(&*data.pool).await {
            return response!(err "User existed!", ErrorCode::Conflict)
        };
        let steam_profile = match fetch_steam_info(&user_token.id).await {
            Ok(r) => r,
            Err(e) => {
                tracing::error!("ERROR fetching for {} {e}", &user_token.id.to_string());
                return response!(err "User Steam ID is invalid", ErrorCode::NotFound)
            }
        };
        let Ok(cvs) = CommunityVisibilityState::try_from(steam_profile.communityvisibilitystate.unwrap_or(1) as i32) else {
            return response!(internal_server_error)
        };
        let Ok(ps) = PersonaState::try_from(steam_profile.personastate.unwrap_or(0) as i32) else {
            return response!(internal_server_error)
        };
        let Ok(steam_id) = steam_profile.steamid.parse::<i64>() else {
            return response!(internal_server_error)
        };
        let timecreated = steam_profile.timecreated.unwrap_or(-1);
        let clan_id = steam_profile.primaryclanid.unwrap_or("-1".to_string());
        let commentpermission = steam_profile.commentpermission.and_then(|e| Some(e == 1)).unwrap_or(false);
        let lastlogoff = steam_profile.lastlogoff.unwrap_or(-1);
        let personastateflags = steam_profile.personastateflags.unwrap_or_default();
        let avatarhash = steam_profile.avatarhash.unwrap_or_default();
        let avatarfull = steam_profile.avatarfull.unwrap_or_default();
        let avatarmedium = steam_profile.avatarmedium.unwrap_or_default();
        let avatar = steam_profile.avatar.unwrap_or_default();
        let profileurl = steam_profile.profileurl.unwrap_or_default();
        let personaname = steam_profile.personaname.unwrap_or_default();
        let profilestate = steam_profile.profilestate.unwrap_or_default();
        let steam_profile_db = match sqlx::query_as!(DbSteam,
            "INSERT INTO website.steam_user(user_id,
                community_visibility_state,
                profile_state,
                persona_name,
                profile_url,
                avatar,
                avatar_medium,
                avatar_full,
                avatar_hash,
                last_log_off,
                persona_state,
                primary_clan_id,
                time_created,
                persona_state_flags,
                comment_permission)
             VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING
             user_id,
                community_visibility_state AS \"community_visibility_state: CommunityVisibilityState\",
                profile_state,
                persona_name,
                profile_url,
                avatar,
                avatar_medium,
                avatar_full,
                avatar_hash,
                last_log_off,
                persona_state AS \"persona_state: PersonaState\",
                primary_clan_id,
                time_created,
                persona_state_flags,
                comment_permission
             ", steam_id,
                cvs as CommunityVisibilityState,
                profilestate,
                personaname,
                profileurl,
                avatar,
                avatarmedium,
                avatarfull,
                avatarhash,
                lastlogoff,
                ps as PersonaState,
                clan_id,
                timecreated,
                personastateflags,
                commentpermission
        ).fetch_one(&*data.pool).await {
            Ok(k) => k,
            Err(e) => {
                tracing::error!("ERROR {e}");
                return response!(internal_server_error)
            }
        };
        response!(ok steam_profile_db.into())

    }
    #[oai(path="/accounts/me", method="get")]
    async fn get_user_info(&self, Data(data): Data<&AppData>, TokenBearer(user_token): TokenBearer) -> Response<SteamProfile>{
        let Ok(user) = sqlx::query_as!(DbSteam,
            "SELECT user_id,
                community_visibility_state AS \"community_visibility_state: CommunityVisibilityState\",
                profile_state,
                persona_name,
                profile_url,
                avatar,
                avatar_medium,
                avatar_full,
                avatar_hash,
                last_log_off,
                persona_state AS \"persona_state: PersonaState\",
                primary_clan_id,
                time_created,
                persona_state_flags,
                comment_permission
            FROM website.steam_user WHERE user_id=$1 LIMIT 1", user_token.id
        ).fetch_one(&*data.pool).await else {
            return response!(err "User does not exist!", ErrorCode::NotFound)
        };

        let is_superuser = check_superuser(data, user_token.id).await;
        let mut profile: SteamProfile = user.into();
        profile.is_superuser = Some(is_superuser);

        response!(ok profile)
    }
    #[oai(path="/accounts/me/anonymize", method="post")]
    async fn set_user_anonymization(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
        Json(request): Json<AnonymizationRequest>,
    ) -> Response<UserAnonymization> {
        let user_id = user_token.id;
        let Ok(uuid) = Uuid::parse_str(&request.community_id) else {
            return response!(err "Invalid community ID", ErrorCode::BadRequest);
        };

        let result = sqlx::query_as!(DbUserAnonymization,
            "INSERT INTO website.user_anonymization (user_id, community_id, anonymized, hide_location)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, community_id)
             DO UPDATE SET anonymized = $3, hide_location=$4, updated_at = CURRENT_TIMESTAMP
             RETURNING user_id, community_id, anonymized, hide_location",
            user_id,
            uuid,
            request.anonymize,
            request.hide_location
        )
        .fetch_one(&*data.pool)
        .await;

        match result {
            Ok(setting) => {
                response!(ok setting.into())
            }
            Err(e) => {
                tracing::error!("Failed to set anonymization: {}", e);
                response!(internal_server_error)
            }
        }
    }

    #[oai(path="/accounts/me/anonymize", method="get")]
    async fn get_user_anonymization(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
    ) -> Response<Vec<UserAnonymization>> {
        let user_id = user_token.id;

        let settings = match sqlx::query_as!(
            DbUserAnonymization,
            "SELECT user_id, community_id, anonymized, hide_location FROM website.user_anonymization
             WHERE user_id = $1",
            user_id
        )
        .fetch_all(&*data.pool)
        .await {
            Ok(s) => s,
            Err(e) => {
                tracing::error!("Failed to fetch anonymization settings: {}", e);
                return response!(internal_server_error);
            }
        };

        response!(ok settings.iter_into())
    }

    #[oai(path="/accounts/me/guide-ban", method="get")]
    async fn get_my_ban_status(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
    ) -> Response<BanStatus> {
        let user_id = user_token.id;

        let ban = match sqlx::query!(
            r#"
            SELECT reason, expires_at
            FROM website.guide_user_ban
            WHERE user_id = $1
            AND is_active = true
            AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            "#,
            user_id
        )
        .fetch_optional(&*data.pool)
        .await
        {
            Ok(b) => b,
            Err(e) => {
                tracing::error!("Failed to check ban status: {}", e);
                return response!(internal_server_error);
            }
        };

        match ban {
            Some(b) => response!(ok BanStatus {
                is_banned: true,
                reason: Some(b.reason),
                expires_at: b.expires_at.map(db_to_utc),
            }),
            None => response!(ok BanStatus {
                is_banned: false,
                reason: None,
                expires_at: None,
            }),
        }
    }

    #[oai(path="/accounts/:user_id/anonymize", method="post")]
    async fn set_other_user_anonymization(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(requester_token): TokenBearer,
        user_id: Path<i64>,
        Json(request): Json<AnonymizationRequest>,
    ) -> Response<UserAnonymization> {
        let requester_id = requester_token.id;
        let target_user_id = user_id.0;

        let Ok(uuid) = Uuid::parse_str(&request.community_id) else {
            return response!(err "Invalid community ID", ErrorCode::BadRequest);
        };

        let has_permission = match check_permission(data, requester_id, target_user_id, uuid).await {
            Ok(p) => p,
            Err(_) => return response!(internal_server_error)
        };

        if !has_permission {
            return response!(err "Insufficient permissions", ErrorCode::Forbidden);
        }

        let user_exists = match sqlx::query_scalar!(
            "SELECT EXISTS(SELECT 1 FROM website.steam_user WHERE user_id = $1)",
            target_user_id
        )
        .fetch_one(&*data.pool)
        .await {
            Ok(e) => e,
            Err(_) => return response!(internal_server_error)
        };

        if user_exists != Some(true) {
            return response!(err "Target user not found", ErrorCode::NotFound);
        }

        // Insert or update anonymization setting
        let result = sqlx::query_as!(DbUserAnonymization,
            "INSERT INTO website.user_anonymization (user_id, community_id, anonymized, hide_location)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, community_id)
             DO UPDATE SET anonymized = $3, hide_location=$4, updated_at = CURRENT_TIMESTAMP
             RETURNING user_id, community_id, anonymized, hide_location",
            target_user_id,
            uuid,
            request.anonymize,
            request.hide_location
        )
        .fetch_one(&*data.pool)
        .await;

        match result {
            Ok(setting) => {
                response!(ok  setting.into())
            }
            Err(e) => {
                tracing::error!("Failed to set anonymization: {}", e);
                response!(internal_server_error)
            }
        }
    }

    #[oai(path="/accounts/:user_id/anonymize", method="get")]
    async fn get_other_user_anonymization(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(_requester_token): TokenBearer,
        Path(user_id): Path<i64>,
    ) -> Response<Vec<UserAnonymization>> {
        let target_user_id = user_id;

        match sqlx::query_as!(
            DbUserAnonymization,
            "SELECT community_id, anonymized, hide_location, user_id FROM website.user_anonymization
             WHERE user_id = $1",
            target_user_id
        )
        .fetch_all(&*data.pool)
        .await {
            Ok(s) => response!(ok s.iter_into()),
            Err(e) => {
                tracing::error!("Failed to fetch anonymization settings: {}", e);
                response!(internal_server_error)
            }
        }
    }

    // ============ ADMIN ENDPOINTS ============

    #[oai(path="/admin/reports/guides", method="get")]
    async fn get_guide_reports(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
        Query(page): Query<Option<i64>>,
        Query(status): Query<Option<String>>,
    ) -> Response<GuideReportsPaginated> {
        if !check_superuser(data, user_token.id).await {
            return response!(err "Unauthorized", ErrorCode::Forbidden);
        }

        let page = page.unwrap_or(1).max(1);
        let limit = 20i64;
        let offset = (page - 1) * limit;

        let status_filter = status.as_deref();

        let reports = match sqlx::query_as!(
            DbGuideReportFull,
            r#"
            SELECT
                r.id,
                r.guide_id,
                r.user_id,
                r.reason,
                r.details,
                r.status,
                r.resolved_by,
                r.resolved_at,
                r.timestamp,
                g.title AS guide_title,
                g.map_name AS guide_map_name,
                g.author_id AS guide_author_id,
                COALESCE(author.persona_name, NULL) AS guide_author_name,
                COALESCE(reporter.persona_name, NULL) AS reporter_name,
                COALESCE(resolver.persona_name, NULL) AS resolver_name,
                COUNT(*) OVER() AS total_reports
            FROM website.report_guide r
            LEFT JOIN website.guides g ON r.guide_id = g.id
            LEFT JOIN website.steam_user author ON g.author_id = author.user_id
            LEFT JOIN website.steam_user reporter ON r.user_id = reporter.user_id
            LEFT JOIN website.steam_user resolver ON r.resolved_by = resolver.user_id
            WHERE ($1::text IS NULL OR r.status = $1)
            ORDER BY r.timestamp DESC
            LIMIT $2 OFFSET $3
            "#,
            status_filter,
            limit,
            offset
        )
        .fetch_all(&*data.pool)
        .await
        {
            Ok(r) => r,
            Err(e) => {
                tracing::error!("Failed to fetch guide reports: {}", e);
                return response!(internal_server_error);
            }
        };

        let total = reports.first().and_then(|r| r.total_reports).unwrap_or(0);

        response!(ok GuideReportsPaginated {
            total,
            reports: reports.into_iter().map(Into::into).collect(),
        })
    }

    #[oai(path="/admin/reports/comments", method="get")]
    async fn get_comment_reports(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
        Query(page): Query<Option<i64>>,
        Query(status): Query<Option<String>>,
    ) -> Response<CommentReportsPaginated> {
        if !check_superuser(data, user_token.id).await {
            return response!(err "Unauthorized", ErrorCode::Forbidden);
        }

        let page = page.unwrap_or(1).max(1);
        let limit = 20i64;
        let offset = (page - 1) * limit;

        let status_filter = status.as_deref();

        let reports = match sqlx::query_as!(
            DbCommentReportFull,
            r#"
            SELECT
                r.id,
                r.comment_id,
                r.user_id,
                r.reason,
                r.details,
                r.status,
                r.resolved_by,
                r.resolved_at,
                r.timestamp,
                c.content AS comment_content,
                c.author_id AS comment_author_id,
                COALESCE(author.persona_name, NULL) AS comment_author_name,
                c.guide_id,
                COALESCE(reporter.persona_name, NULL) AS reporter_name,
                COALESCE(resolver.persona_name, NULL) AS resolver_name,
                COUNT(*) OVER() AS total_reports
            FROM website.report_guide_comment r
            LEFT JOIN website.guide_comments c ON r.comment_id = c.id
            LEFT JOIN website.steam_user author ON c.author_id = author.user_id
            LEFT JOIN website.steam_user reporter ON r.user_id = reporter.user_id
            LEFT JOIN website.steam_user resolver ON r.resolved_by = resolver.user_id
            WHERE ($1::text IS NULL OR r.status = $1)
            ORDER BY r.timestamp DESC
            LIMIT $2 OFFSET $3
            "#,
            status_filter,
            limit,
            offset
        )
        .fetch_all(&*data.pool)
        .await
        {
            Ok(r) => r,
            Err(e) => {
                tracing::error!("Failed to fetch comment reports: {}", e);
                return response!(internal_server_error);
            }
        };

        let total = reports.first().and_then(|r| r.total_reports).unwrap_or(0);

        response!(ok CommentReportsPaginated {
            total,
            reports: reports.into_iter().map(Into::into).collect(),
        })
    }

    #[oai(path="/admin/reports/guides/:report_id/status", method="put")]
    async fn update_guide_report_status(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
        Path(report_id): Path<String>,
        Json(payload): Json<UpdateReportStatusDto>,
    ) -> Response<GuideReportAdmin> {
        if !check_superuser(data, user_token.id).await {
            return response!(err "Unauthorized", ErrorCode::Forbidden);
        }

        let Ok(report_uuid) = Uuid::parse_str(&report_id) else {
            return response!(err "Invalid report ID", ErrorCode::BadRequest);
        };

        if !["resolved", "dismissed", "pending"].contains(&payload.status.as_str()) {
            return response!(err "Invalid status. Must be 'resolved', 'dismissed', or 'pending'", ErrorCode::BadRequest);
        }

        let resolved_by = if payload.status == "pending" { None } else { Some(user_token.id) };

        let report = match sqlx::query_as!(
            DbGuideReportFull,
            r#"
            UPDATE website.report_guide
            SET status = $1::TEXT, resolved_by = $2, resolved_at = CASE WHEN $1 = 'pending' THEN NULL ELSE CURRENT_TIMESTAMP END
            WHERE id = $3
            RETURNING
                id,
                guide_id,
                user_id,
                reason,
                details,
                status,
                resolved_by,
                resolved_at,
                timestamp,
                (SELECT title FROM website.guides WHERE id = guide_id) AS guide_title,
                (SELECT map_name FROM website.guides WHERE id = guide_id) AS guide_map_name,
                (SELECT author_id FROM website.guides WHERE id = guide_id) AS guide_author_id,
                (SELECT persona_name FROM website.steam_user WHERE user_id = (SELECT author_id FROM website.guides WHERE id = guide_id)) AS guide_author_name,
                (SELECT persona_name FROM website.steam_user WHERE user_id = report_guide.user_id) AS reporter_name,
                (SELECT persona_name FROM website.steam_user WHERE user_id = report_guide.resolved_by) AS resolver_name,
                1::bigint AS total_reports
            "#,
            payload.status,
            resolved_by,
            report_uuid
        )
        .fetch_optional(&*data.pool)
        .await
        {
            Ok(Some(r)) => r,
            Ok(None) => return response!(err "Report not found", ErrorCode::NotFound),
            Err(e) => {
                tracing::error!("Failed to update guide report: {}", e);
                return response!(internal_server_error);
            }
        };

        response!(ok report.into())
    }

    #[oai(path="/admin/reports/comments/:report_id/status", method="put")]
    async fn update_comment_report_status(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
        Path(report_id): Path<String>,
        Json(payload): Json<UpdateReportStatusDto>,
    ) -> Response<CommentReportAdmin> {
        if !check_superuser(data, user_token.id).await {
            return response!(err "Unauthorized", ErrorCode::Forbidden);
        }

        let Ok(report_uuid) = Uuid::parse_str(&report_id) else {
            return response!(err "Invalid report ID", ErrorCode::BadRequest);
        };

        if !["resolved", "dismissed", "pending"].contains(&payload.status.as_str()) {
            return response!(err "Invalid status. Must be 'resolved', 'dismissed', or 'pending'", ErrorCode::BadRequest);
        }

        let resolved_by = if payload.status == "pending" { None } else { Some(user_token.id) };

        let report = match sqlx::query_as!(
            DbCommentReportFull,
            r#"
            UPDATE website.report_guide_comment
            SET status = $1::TEXT, resolved_by = $2, resolved_at = CASE WHEN $1 = 'pending' THEN NULL ELSE CURRENT_TIMESTAMP END
            WHERE id = $3
            RETURNING
                id,
                comment_id,
                user_id,
                reason,
                details,
                status,
                resolved_by,
                resolved_at,
                timestamp,
                (SELECT content FROM website.guide_comments WHERE id = comment_id) AS comment_content,
                (SELECT author_id FROM website.guide_comments WHERE id = comment_id) AS comment_author_id,
                (SELECT persona_name FROM website.steam_user WHERE user_id = (SELECT author_id FROM website.guide_comments WHERE id = comment_id)) AS comment_author_name,
                (SELECT guide_id FROM website.guide_comments WHERE id = comment_id) AS guide_id,
                (SELECT persona_name FROM website.steam_user WHERE user_id = report_guide_comment.user_id) AS reporter_name,
                (SELECT persona_name FROM website.steam_user WHERE user_id = report_guide_comment.resolved_by) AS resolver_name,
                1::bigint AS total_reports
            "#,
            payload.status,
            resolved_by,
            report_uuid
        )
        .fetch_optional(&*data.pool)
        .await
        {
            Ok(Some(r)) => r,
            Ok(None) => return response!(err "Report not found", ErrorCode::NotFound),
            Err(e) => {
                tracing::error!("Failed to update comment report: {}", e);
                return response!(internal_server_error);
            }
        };

        response!(ok report.into())
    }

    // Music report admin endpoints
    #[oai(path="/admin/reports/music", method="get")]
    async fn get_music_reports(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
        Query(page): Query<Option<i64>>,
        Query(status): Query<Option<String>>,
    ) -> Response<MapMusicReportsPaginated> {
        if !check_superuser(data, user_token.id).await {
            return response!(err "Unauthorized", ErrorCode::Forbidden);
        }

        let page = page.unwrap_or(1).max(1);
        let limit = 20i64;
        let offset = (page - 1) * limit;

        let status_filter = status.as_deref();

        let reports = match sqlx::query_as!(
            DbMapMusicReportFull,
            r#"
            SELECT
                r.id,
                r.music_id,
                r.user_id,
                r.reason,
                r.details,
                r.suggested_youtube_url,
                r.current_youtube_music,
                r.status,
                r.resolved_by,
                r.resolved_at,
                r.timestamp,
                m.music_name,
                m.duration AS music_duration,
                m.source AS music_source,
                COALESCE(reporter.persona_name, NULL) AS reporter_name,
                COALESCE(resolver.persona_name, NULL) AS resolver_name,
                ARRAY_AGG(DISTINCT amm.map_name ORDER BY amm.map_name) FILTER (WHERE amm.map_name IS NOT NULL) AS associated_maps,
                COUNT(*) OVER() AS total_reports
            FROM website.report_map_music r
            LEFT JOIN map_music m ON r.music_id = m.id
            LEFT JOIN associated_map_music amm ON m.id = amm.map_music_id
            LEFT JOIN website.steam_user reporter ON r.user_id = reporter.user_id
            LEFT JOIN website.steam_user resolver ON r.resolved_by = resolver.user_id
            WHERE ($1::text IS NULL OR r.status = $1)
            GROUP BY r.id, r.music_id, r.user_id, r.reason, r.details, r.suggested_youtube_url,
                     r.current_youtube_music, r.status, r.resolved_by, r.resolved_at, r.timestamp,
                     m.music_name, m.duration, m.source, reporter.persona_name, resolver.persona_name
            ORDER BY r.timestamp DESC
            LIMIT $2 OFFSET $3
            "#,
            status_filter,
            limit,
            offset
        )
        .fetch_all(&*data.pool)
        .await
        {
            Ok(r) => r,
            Err(e) => {
                tracing::error!("Failed to fetch music reports: {}", e);
                return response!(internal_server_error);
            }
        };

        let total = reports.first().and_then(|r| r.total_reports).unwrap_or(0);

        response!(ok MapMusicReportsPaginated {
            total,
            reports: reports.into_iter().map(Into::into).collect(),
        })
    }

    #[oai(path="/admin/reports/music/:report_id/status", method="put")]
    async fn update_music_report_status(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
        Path(report_id): Path<String>,
        Json(payload): Json<UpdateReportStatusDto>,
    ) -> Response<MapMusicReportAdmin> {
        if !check_superuser(data, user_token.id).await {
            return response!(err "Unauthorized", ErrorCode::Forbidden);
        }

        let Ok(report_uuid) = Uuid::parse_str(&report_id) else {
            return response!(err "Invalid report ID", ErrorCode::BadRequest);
        };

        if !["resolved", "dismissed", "pending"].contains(&payload.status.as_str()) {
            return response!(err "Invalid status. Must be 'resolved', 'dismissed', or 'pending'", ErrorCode::BadRequest);
        }

        let resolved_by = if payload.status == "pending" { None } else { Some(user_token.id) };

        let report = match sqlx::query_as!(
            DbMapMusicReportFull,
            r#"
            UPDATE website.report_map_music
            SET status = $1::TEXT, resolved_by = $2, resolved_at = CASE WHEN $1 = 'pending' THEN NULL ELSE CURRENT_TIMESTAMP END
            WHERE id = $3
            RETURNING
                id,
                music_id,
                user_id,
                reason,
                details,
                suggested_youtube_url,
                current_youtube_music,
                status,
                resolved_by,
                resolved_at,
                timestamp,
                (SELECT music_name FROM map_music WHERE id = music_id) AS music_name,
                (SELECT duration FROM map_music WHERE id = music_id) AS music_duration,
                (SELECT source FROM map_music WHERE id = music_id) AS music_source,
                (SELECT persona_name FROM website.steam_user WHERE user_id = report_map_music.user_id) AS reporter_name,
                (SELECT persona_name FROM website.steam_user WHERE user_id = report_map_music.resolved_by) AS resolver_name,
                ARRAY(SELECT map_name FROM associated_map_music WHERE map_music_id = music_id ORDER BY map_name) AS associated_maps,
                1::bigint AS total_reports
            "#,
            payload.status,
            resolved_by,
            report_uuid
        )
        .fetch_optional(&*data.pool)
        .await
        {
            Ok(Some(r)) => r,
            Ok(None) => return response!(err "Report not found", ErrorCode::NotFound),
            Err(e) => {
                tracing::error!("Failed to update music report: {}", e);
                return response!(internal_server_error);
            }
        };

        // If report is resolved and has a suggested YouTube URL, credit the reporter
        if payload.status == "resolved" {
            if let Some(ref suggested_url) = report.suggested_youtube_url {
                if let Some(video_id) = extract_youtube_id(suggested_url) {
                    // Update map_music with the suggested video and credit the reporter
                    let update_result = sqlx::query!(
                        "UPDATE map_music SET youtube_music = $1, yt_source = $2 WHERE id = $3",
                        video_id,
                        report.user_id,  // Reporter gets credit!
                        report.music_id
                    )
                    .execute(&*data.pool)
                    .await;

                    if let Err(e) = update_result {
                        tracing::error!("Failed to update music with reporter credit: {}", e);
                        // Don't fail the whole request, just log the error
                    }
                }
            }
        }

        response!(ok report.into())
    }

    #[oai(path="/admin/music/:music_id/youtube", method="put")]
    async fn update_music_youtube(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
        Path(music_id): Path<String>,
        Json(payload): Json<UpdateMapMusicDto>,
    ) -> Response<String> {
        if !check_superuser(data, user_token.id).await {
            return response!(err "Unauthorized", ErrorCode::Forbidden);
        }

        let Ok(music_uuid) = Uuid::parse_str(&music_id) else {
            return response!(err "Invalid music ID", ErrorCode::BadRequest);
        };

        // Update youtube_music field and set yt_source to admin's Steam ID
        let result = sqlx::query!(
            r#"
            UPDATE map_music
            SET youtube_music = $1, yt_source = $2
            WHERE id = $3
            "#,
            payload.youtube_music,
            user_token.id,
            music_uuid
        )
        .execute(&*data.pool)
        .await;

        match result {
            Ok(result) => {
                if result.rows_affected() == 0 {
                    return response!(err "Music track not found", ErrorCode::NotFound);
                }
                response!(ok "Updated successfully".into())
            }
            Err(e) => {
                tracing::error!("Failed to update music YouTube ID: {}", e);
                response!(internal_server_error)
            }
        }
    }

    #[oai(path="/admin/bans", method="get")]
    async fn get_guide_bans(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
        Query(page): Query<Option<i64>>,
        Query(active_only): Query<Option<bool>>,
    ) -> Response<GuideBansPaginated> {
        if !check_superuser(data, user_token.id).await {
            return response!(err "Unauthorized", ErrorCode::Forbidden);
        }

        let page = page.unwrap_or(1).max(1);
        let limit = 20i64;
        let offset = (page - 1) * limit;
        let active_only = active_only.unwrap_or(true);

        let bans = match sqlx::query_as!(
            DbGuideBan,
            r#"
            SELECT
                b.id,
                b.user_id,
                b.banned_by,
                b.reason,
                b.created_at,
                b.expires_at,
                b.is_active,
                u.persona_name AS user_name,
                u.avatar AS user_avatar,
                admin.persona_name AS banned_by_name,
                COUNT(*) OVER() AS total_bans
            FROM website.guide_user_ban b
            LEFT JOIN website.steam_user u ON b.user_id = u.user_id
            LEFT JOIN website.steam_user admin ON b.banned_by = admin.user_id
            WHERE ($1 = false OR b.is_active = true)
            ORDER BY b.created_at DESC
            LIMIT $2 OFFSET $3
            "#,
            active_only,
            limit,
            offset
        )
        .fetch_all(&*data.pool)
        .await
        {
            Ok(b) => b,
            Err(e) => {
                tracing::error!("Failed to fetch guide bans: {}", e);
                return response!(internal_server_error);
            }
        };

        let total = bans.first().and_then(|b| b.total_bans).unwrap_or(0);

        response!(ok GuideBansPaginated {
            total,
            bans: bans.into_iter().map(Into::into).collect(),
        })
    }

    #[oai(path="/admin/users/:user_id/guide-ban", method="post")]
    async fn ban_user_from_guides(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
        Path(user_id): Path<i64>,
        Json(payload): Json<CreateBanDto>,
    ) -> Response<GuideBanAdmin> {
        if !check_superuser(data, user_token.id).await {
            return response!(err "Unauthorized", ErrorCode::Forbidden);
        }

        // Check if user exists
        let user_exists = match sqlx::query_scalar!(
            "SELECT EXISTS(SELECT 1 FROM website.steam_user WHERE user_id = $1)",
            user_id
        )
        .fetch_one(&*data.pool)
        .await
        {
            Ok(e) => e,
            Err(_) => return response!(internal_server_error),
        };

        if user_exists != Some(true) {
            return response!(err "User not found", ErrorCode::NotFound);
        }

        let ban = match sqlx::query_as!(
            DbGuideBan,
            r#"
            INSERT INTO website.guide_user_ban (user_id, banned_by, reason, expires_at, is_active)
            VALUES ($1, $2, $3, $4, true)
            ON CONFLICT (user_id) DO UPDATE SET
                banned_by = $2,
                reason = $3,
                expires_at = $4,
                is_active = true,
                created_at = CURRENT_TIMESTAMP
            RETURNING
                id,
                user_id,
                banned_by,
                reason,
                created_at,
                expires_at,
                is_active,
                (SELECT persona_name FROM website.steam_user WHERE user_id = $1) AS user_name,
                (SELECT avatar FROM website.steam_user WHERE user_id = $1) AS user_avatar,
                (SELECT persona_name FROM website.steam_user WHERE user_id = $2) AS banned_by_name,
                1::bigint AS total_bans
            "#,
            user_id,
            user_token.id,
            payload.reason,
            payload.expires_at.map(|s| s.to_db_time())
        )
        .fetch_one(&*data.pool)
        .await
        {
            Ok(b) => b,
            Err(e) => {
                tracing::error!("Failed to ban user: {}", e);
                return response!(internal_server_error);
            }
        };

        response!(ok ban.into())
    }

    #[oai(path="/admin/users/:user_id/guide-ban", method="delete")]
    async fn unban_user_from_guides(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
        Path(user_id): Path<i64>,
    ) -> Response<String> {
        if !check_superuser(data, user_token.id).await {
            return response!(err "Unauthorized", ErrorCode::Forbidden);
        }

        let result = match sqlx::query!(
            "UPDATE website.guide_user_ban SET is_active = false WHERE user_id = $1 AND is_active = true",
            user_id
        )
        .execute(&*data.pool)
        .await
        {
            Ok(r) => r,
            Err(e) => {
                tracing::error!("Failed to unban user: {}", e);
                return response!(internal_server_error);
            }
        };

        if result.rows_affected() == 0 {
            return response!(err "User is not banned", ErrorCode::NotFound);
        }

        response!(ok "User unbanned successfully".to_string())
    }

    #[oai(path="/admin/users/:user_id/guide-ban", method="get")]
    async fn get_user_ban_status(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
        Path(user_id): Path<i64>,
    ) -> Response<BanStatus> {
        if !check_superuser(data, user_token.id).await {
            return response!(err "Unauthorized", ErrorCode::Forbidden);
        }

        let ban = match sqlx::query!(
            r#"
            SELECT reason, expires_at
            FROM website.guide_user_ban
            WHERE user_id = $1
            AND is_active = true
            AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            "#,
            user_id
        )
        .fetch_optional(&*data.pool)
        .await
        {
            Ok(b) => b,
            Err(e) => {
                tracing::error!("Failed to check ban status: {}", e);
                return response!(internal_server_error);
            }
        };

        match ban {
            Some(b) => response!(ok BanStatus {
                is_banned: true,
                reason: Some(b.reason),
                expires_at: b.expires_at.map(db_to_utc),
            }),
            None => response!(ok BanStatus {
                is_banned: false,
                reason: None,
                expires_at: None,
            }),
        }
    }

    #[oai(path="/admin/announcements", method="get")]
    async fn get_announcements_admin(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
        Query(page): Query<Option<i64>>,
        Query(status): Query<Option<AnnouncementStatus>>,
        Query(r#type): Query<Option<AnnouncementType>>,
    ) -> Response<AnnouncementsPaginated> {
        if !check_superuser(data, user_token.id).await {
            return response!(err "Unauthorized", ErrorCode::Forbidden);
        }

        let page = page.unwrap_or(1).max(1);
        let limit = 20i64;
        let offset = (page - 1) * limit;

        // Fetch all announcements
        let mut all_announcements = match sqlx::query_as!(
            DbAnnouncement,
            r#"
            SELECT id, type as "type!: AnnouncementTypeState", title, text, created_at, published_at, expires_at, show
            FROM website.announce
            ORDER BY created_at DESC
            "#
        )
        .fetch_all(&*data.pool)
        .await
        {
            Ok(a) => a,
            Err(e) => {
                tracing::error!("Failed to fetch announcements: {}", e);
                return response!(internal_server_error);
            }
        };

        // Filter by type if specified
        if let Some(type_filter) = r#type {
            let type_state: AnnouncementTypeState = type_filter.into();
            all_announcements.retain(|a| a.r#type == type_state);
        }

        // Filter by status if specified
        if let Some(status_filter) = status {
            let now = chrono::Utc::now();
            all_announcements.retain(|a| {
                let published_at = db_to_utc(a.published_at);
                let expires_at = a.expires_at.map(db_to_utc);

                match status_filter {
                    AnnouncementStatus::Active => {
                        a.show && published_at <= now && expires_at.map_or(true, |exp| exp > now)
                    },
                    AnnouncementStatus::Scheduled => {
                        a.show && published_at > now
                    },
                    AnnouncementStatus::Expired => {
                        expires_at.map_or(false, |exp| exp <= now)
                    },
                    AnnouncementStatus::Hidden => {
                        !a.show
                    },
                    AnnouncementStatus::All => {
                        true
                    }
                }
            });
        }

        let total = all_announcements.len() as i64;

        // Apply pagination
        let paginated: Vec<DbAnnouncement> = all_announcements
            .into_iter()
            .skip(offset as usize)
            .take(limit as usize)
            .collect();

        response!(ok AnnouncementsPaginated {
            total,
            announcements: paginated.into_iter().map(|a| a.into()).collect(),
        })
    }

    #[oai(path="/admin/announcements", method="post")]
    async fn create_announcement(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
        Json(payload): Json<CreateAnnouncementDto>,
    ) -> Response<Announcement> {
        if !check_superuser(data, user_token.id).await {
            return response!(err "Unauthorized", ErrorCode::Forbidden);
        }
        match payload.r#type{
            AnnouncementType::Rich => {
                let Some(title) = &payload.title else {
                    return response!(err "Rich announcements require a title", ErrorCode::BadRequest);
                };
                if title.trim().is_empty(){
                    return response!(err "Rich announcements require a title", ErrorCode::BadRequest);
                }
            }
            _ => {}
        }
        if let Some(title) = &payload.title {
            if title.len() < 5 || title.len() > 200 {
                return response!(err "Title must be 5-200 characters", ErrorCode::BadRequest);
            }
        }
        if payload.text.len() < 10 || payload.text.len() > 10000 {
            return response!(err "Content must be 10-10000 characters", ErrorCode::BadRequest);
        }
        if let (Some(pub_at), Some(exp_at)) = (&payload.published_at, &payload.expires_at) {
            if pub_at > exp_at {
                return response!(err "published_at must be before expires_at", ErrorCode::BadRequest);
            }
        }

        let published_at = payload.published_at
            .unwrap_or_else(|| Utc::now())
            .to_db_time();

        let ptype: AnnouncementTypeState = payload.r#type.into();
        let announcement = match sqlx::query_as!(
            DbAnnouncement,
            r#"
            INSERT INTO website.announce (title, type, text, published_at, expires_at, show)
            VALUES ($1, $2, $3, $4, COALESCE($5::TIMESTAMPTZ, NULL), $6)
            RETURNING id, type AS "type: AnnouncementTypeState", title, text, created_at, published_at, expires_at, show
            "#,
            payload.title,
            ptype as AnnouncementTypeState,
            payload.text,
            published_at,
            payload.expires_at.map(|s| s.to_db_time()),
            payload.show
        )
        .fetch_one(&*data.pool)
        .await
        {
            Ok(a) => a,
            Err(e) => {
                tracing::error!("Failed to create announcement: {}", e);
                return response!(internal_server_error);
            }
        };

        response!(ok announcement.into())
    }

    #[oai(path="/admin/announcements/:id", method="put")]
    async fn update_announcement(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
        Path(id): Path<String>,
        Json(payload): Json<UpdateAnnouncementDto>,
    ) -> Response<Announcement> {
        if !check_superuser(data, user_token.id).await {
            return response!(err "Unauthorized", ErrorCode::Forbidden);
        }

        // Validation
        if let Some(ref title) = payload.title {
            if title.len() < 5 || title.len() > 200 {
                return response!(err "Title must be 5-200 characters", ErrorCode::BadRequest);
            }
        }
        if let Some(ref text) = payload.text {
            if text.len() < 10 || text.len() > 10_000 {
                return response!(err "Content must be 10-10000 characters", ErrorCode::BadRequest);
            }
        }
        if let (Some(pub_at), Some(exp_at)) = (&payload.published_at, &payload.expires_at) {
            if pub_at > exp_at {
                return response!(err "published_at must be before expires_at", ErrorCode::BadRequest);
            }
        }

        // Fetch current announcement
        let current = match sqlx::query_as!(
            DbAnnouncement,
            "SELECT id, type AS \"type: AnnouncementTypeState\", title, text, created_at, published_at, expires_at, show
             FROM website.announce WHERE id = $1::TEXT::UUID",
            id
        )
        .fetch_optional(&*data.pool)
        .await
        {
            Ok(Some(a)) => a,
            Ok(None) => return response!(err "Announcement not found", ErrorCode::NotFound),
            Err(e) => {
                tracing::error!("Failed to fetch announcement: {}", e);
                return response!(internal_server_error);
            }
        };

        // Update only provided fields
        let new_type: AnnouncementTypeState = payload.r#type.map(|e| e.into()).unwrap_or(current.r#type);
        let new_title = payload.title.or(current.title);
        let new_text = payload.text.unwrap_or(current.text);
        let new_published_at = payload.published_at.map(|e| e.to_db_time()).unwrap_or(current.published_at);
        let new_expires_at = payload.expires_at.map(|e| e.to_db_time()).or(current.expires_at);
        let new_show = payload.show.unwrap_or(current.show);

        let updated = match sqlx::query_as!(
            DbAnnouncement,
            r#"
            UPDATE website.announce
            SET type = $2, title = $3, text = $4, published_at = $5, expires_at = $6, show= $7
            WHERE id = $1::TEXT::UUID
            RETURNING id, type AS "type: AnnouncementTypeState", title, text, created_at, published_at, expires_at, show
            "#,
            id,
            new_type as AnnouncementTypeState,
            new_title,
            new_text,
            new_published_at,
            new_expires_at,
            new_show
        )
        .fetch_one(&*data.pool)
        .await
        {
            Ok(a) => a,
            Err(e) => {
                tracing::error!("Failed to update announcement: {}", e);
                return response!(internal_server_error);
            }
        };

        response!(ok updated.into())
    }

    #[oai(path="/admin/announcements/:id", method="delete")]
    async fn delete_announcement(
        &self,
        Data(data): Data<&AppData>,
        TokenBearer(user_token): TokenBearer,
        Path(id): Path<String>,
    ) -> Response<String> {
        if !check_superuser(data, user_token.id).await {
            return response!(err "Unauthorized", ErrorCode::Forbidden);
        }

        let result = match sqlx::query!(
            "DELETE FROM website.announce WHERE id = $1::TEXT::UUID",
            id
        )
        .execute(&*data.pool)
        .await
        {
            Ok(r) => r,
            Err(e) => {
                tracing::error!("Failed to delete announcement: {}", e);
                return response!(internal_server_error);
            }
        };

        if result.rows_affected() == 0 {
            return response!(err "Announcement not found", ErrorCode::NotFound);
        }

        response!(ok "Announcement deleted successfully".to_string())
    }
}
impl UriPatternExt for AccountsApi{
    fn get_all_patterns(&self) -> Vec<RoutePattern<'_>> {
        vec![
            "/auth/refresh",
            "/auth/callback",
            "/auth/logout",
            "/accounts/me",
            "/accounts/me/anonymize",
            "/accounts/me/guide-ban",
            "/accounts/{user_id}/anonymize",
            "/admin/reports/guides",
            "/admin/reports/comments",
            "/admin/reports/music",
            "/admin/reports/guides/{report_id}/status",
            "/admin/reports/comments/{report_id}/status",
            "/admin/reports/music/{report_id}/status",
            "/admin/music/{music_id}/youtube",
            "/admin/bans",
            "/admin/users/{user_id}/guide-ban",
            "/admin/announcements",
            "/admin/announcements/{id}",
        ].iter_into()
    }
}