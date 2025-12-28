use poem::web::Data;
use poem_openapi::payload::Json;
use poem_openapi::{Object, OpenApi};
use poem_openapi::param::Path;
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use tokio::time::sleep;
use uuid::Uuid;

use crate::core::api_models::{ErrorCode, Response, RoutePattern, SteamApiResponse, SteamProfile, UriPatternExt, UserAnonymization};
use crate::core::model::{CommunityVisibilityState, DbSteam, DbUserAnonymization, PersonaState};
use crate::core::utils::{check_superuser, get_env, IterConvert, TokenBearer};
use crate::{response, AppData};

pub struct AccountsApi;

#[derive(Debug, Serialize, Deserialize, Object, Clone)]
pub struct AnonymizationRequest {
    pub community_id: String,
    pub anonymize: Option<bool>,
    pub hide_location: Option<bool>,
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
}
impl UriPatternExt for AccountsApi{
    fn get_all_patterns(&self) -> Vec<RoutePattern<'_>> {
        vec![
            "/auth/refresh",
            "/auth/callback",
            "/auth/logout",
            "/accounts/me",
            "/accounts/me/anonymize",
            "/accounts/{user_id}/anonymize",
        ].iter_into()
    }
}