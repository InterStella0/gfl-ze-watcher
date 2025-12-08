use poem::web::Data;

use crate::core::api_models::{ErrorCode, Response, RoutePattern, SteamApiResponse, SteamProfile, UriPatternExt};
use crate::core::model::{CommunityVisibilityState, DbSteam, PersonaState};
use crate::core::utils::{get_env, IterConvert, TokenBearer};
use crate::{response, AppData};
use poem_openapi::OpenApi;
use reqwest::StatusCode;
use tokio::time::sleep;

pub struct AccountsApi;

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
                        .map_err(|_| ErrorCode::NotFound)?;
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
            return response!(err "User existed!", ErrorCode::NotFound)
        };
        let Ok(steam_profile) = fetch_steam_info(&user_token.id).await else {
            return response!(err "User Steam ID is invalid", ErrorCode::NotFound)
        };
        let Ok(cvs) = CommunityVisibilityState::try_from(steam_profile.communityvisibilitystate as i32) else {
            return response!(internal_server_error)
        };
        let Ok(ps) = PersonaState::try_from(steam_profile.personastate as i32) else {
            return response!(internal_server_error)
        };
        let Ok(steam_id) = steam_profile.steamid.parse::<i64>() else {
            return response!(internal_server_error)
        };
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
                steam_profile.profilestate,
                steam_profile.personaname,
                steam_profile.profileurl,
                steam_profile.avatar,
                steam_profile.avatarmedium,
                steam_profile.avatarfull,
                steam_profile.avatarhash,
                steam_profile.lastlogoff,
                ps as PersonaState,
                steam_profile.primaryclanid,
                steam_profile.timecreated,
                steam_profile.personastateflags,
                false
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

        response!(ok user.into())
    }
}
impl UriPatternExt for AccountsApi{
    fn get_all_patterns(&self) -> Vec<RoutePattern<'_>> {
        vec![
            "/auth/refresh",
            "/auth/callback",
            "/auth/logout",
            "/accounts/me",
        ].iter_into()
    }
}