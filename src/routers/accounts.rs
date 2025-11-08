use chrono::{DateTime, Duration, Utc};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use poem::session::Session;
use poem::web::Data;
use uuid::Uuid;
use sha2::{Sha256, Digest};

use poem_openapi::param::{Query};
use poem_openapi::{ApiResponse, Object, OpenApi};
use poem_openapi::payload::{PlainText};
use serde::{Deserialize, Serialize};
use crate::{response, AppData};
use crate::core::api_models::{Claims, ErrorCode, Response, RoutePattern, UriPatternExt, User};
use crate::core::model::DbUser;
use crate::core::utils::{get_env, get_user_session, ChronoToTime, IterConvert, ISSUER};

pub struct AccountsApi;
#[derive(Serialize, Deserialize)]
struct CodeExchangeResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: i64,
    pub refresh_token: String,
    pub scope: String,
}

#[derive(Serialize, Deserialize)]
struct PrimaryGuild {
    pub identity_guild_id: String,
    pub identity_enabled: bool,
    pub tag: String,
    pub badge: String,
}

#[derive(Serialize, Deserialize)]
struct Nameplate {
    pub sku_id: String,
    pub asset: String,
    pub label: String,
    pub palette: String,
}

#[derive(Serialize, Deserialize)]
struct Collectibles {
    pub nameplate: Nameplate,
}

#[derive(Serialize, Deserialize)]
struct AvatarDecorationData {
    pub sku_id: String,
    pub asset: String,
}

#[derive(Serialize, Deserialize)]
struct DiscordUser {
    pub id: String,
    pub username: String,
    pub discriminator: String,
    pub global_name: Option<String>,
    pub avatar: Option<String>,
    pub bot: Option<bool>,
    pub system: Option<bool>,
    pub mfa_enabled: Option<bool>,
    pub banner: Option<String>,
    pub accent_color: Option<i64>,
    pub locale: Option<String>,
    pub flags: Option<i64>,
    pub premium_type: Option<i64>,
    pub public_flags: Option<i64>,
    pub avatar_decoration_data: Option<AvatarDecorationData>,
    pub collectibles: Option<Collectibles>,
    pub primary_guild: Option<PrimaryGuild>,
}

#[derive(ApiResponse)]
enum LogoutResponse {
    #[oai(status = 200)]
    Success(PlainText<String>),
}
#[derive(ApiResponse)]
enum RefreshResponse {
    #[oai(status = 200)]
    Success(PlainText<String>),
    #[oai(status = 401)]
    Err(PlainText<String>),
}
fn generate_tokens(discord_id: &str, display_name: &str, secret: &str, device_id: &str) -> Result<TokenResponse, jsonwebtoken::errors::Error> {
    let now = Utc::now();

    let access_expiration = now
        .checked_add_signed(Duration::minutes(15))
        .expect("valid timestamp")
        .timestamp();

    let access_claims = Claims {
        sub: discord_id.to_string(),
        name: display_name.to_string(),
        exp: access_expiration as usize,
        iss: ISSUER.into(),
        device_id: device_id.to_string(),
    };

    let access_token = encode(
        &Header::default(),
        &access_claims,
        &EncodingKey::from_secret(secret.as_ref()),
    )?;

    let refresh_expiration = now
        .checked_add_signed(Duration::days(30))
        .expect("valid timestamp")
        .timestamp();

    let refresh_claims = RefreshClaims {
        sub: discord_id.to_string(),
        jti: Uuid::new_v4().to_string(),
        exp: refresh_expiration as usize,
        token_type: "refresh".to_string(),
        iss: ISSUER.into(),
        device_id: device_id.to_string(),
    };

    let refresh_token = encode(
        &Header::default(),
        &refresh_claims,
        &EncodingKey::from_secret(secret.as_ref()),
    )?;

    Ok(TokenResponse {
        access_token,
        refresh_token,
        expires_in: 15 * 60,
    })
}
async fn exchange_token(code: &str) -> Result<CodeExchangeResponse, reqwest::Error> {
    let client = reqwest::Client::new();
    let result = client
        .post("https://discord.com/api/oauth2/token")
        .form(&[
            ("grant_type", "authorization_code".into()),
            ("code", code),
            ("client_id", &get_env("DISCORD_AUTH2_CLIENT_ID")),
            ("client_secret", &get_env("DISCORD_AUTH2_CLIENT_SECRET")),
            ("redirect_uri", &get_env("DISCORD_AUTH2_REDIRECT_URI")),
        ])
        .send()
        .await?
        .json()
    .await?;
    Ok(result)
}


async fn get_user_info(access_token: &str) -> Result<DiscordUser, reqwest::Error> {
    let client = reqwest::Client::new();
    let user: DiscordUser = client
        .get("https://discord.com/api/users/@me")
        .bearer_auth(access_token)
        .send()
        .await?
        .json()
        .await?;

    Ok(user)
}

#[derive(Serialize, Deserialize)]
struct RefreshClaims {
    pub sub: String,
    pub jti: String,
    pub exp: usize,
    pub token_type: String,
    pub iss: String,
    pub device_id: String,
}

fn parse_refresh_token(token: &str) -> Option<RefreshClaims> {
    let mut validation = Validation::new(Algorithm::HS256);
    validation.set_issuer(&[ISSUER]);

    decode::<RefreshClaims>(
        token,
        &DecodingKey::from_secret(get_env("AUTH_SECRET").as_ref()),
        &validation
    ).ok()
        .map(|token_data| token_data.claims)
}

#[derive(Object)]
struct TokenResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
}

#[derive(Serialize, Deserialize)]
struct RefreshRequest {
    pub refresh_token: String,
}

#[derive(ApiResponse)]
enum CallbackResponse {
    #[oai(status = 307)]
    Redirect(#[oai(header = "Location")] String),
    #[oai(status = 401)]
    Err(PlainText<String>)
}
fn digest(refresh: &str) -> String{
    let token_hash = Sha256::digest(refresh);
    hex::encode(token_hash)
}

#[OpenApi]
impl AccountsApi {
    #[oai(path = "/auth/callback", method = "get")]
    async fn user_auth_callback(
        &self, Data(data): Data<&AppData>, session: &Session, Query(code): Query<String>
    ) -> CallbackResponse{
        let device_id = Uuid::new_v4().to_string();
        let Ok(token_resp) = exchange_token(&code).await else {
            return CallbackResponse::Err(PlainText("Invalid code".into()));
        };
        let Ok(user) = get_user_info(&token_resp.access_token).await else {
            return CallbackResponse::Err(PlainText("Invalid code".into()));
        };

        let Ok(_) = sqlx::query!(
            "INSERT INTO discord_user(user_id, display_name, avatar)
             VALUES($1::TEXT::BIGINT, $2, $3) ON CONFLICT(user_id)
             DO UPDATE SET
                display_name = $2,
                avatar = $3", user.id, user.global_name, user.avatar
        ).execute(&*data.pool).await else {
            return CallbackResponse::Err(PlainText("Something went wrong :/".into()));
        };
        let Ok(_) = sqlx::query!(
            "INSERT INTO website.discord_user(user_id, refresh_token)
             VALUES($1::TEXT::BIGINT, $2) ON CONFLICT(user_id)
             DO UPDATE SET
                 refresh_token = $2", user.id, "" // don't save for now, cos no use case token_resp.refresh_token
        ).execute(&*data.pool).await else {
            return CallbackResponse::Err(PlainText("Something went wrong :/".into()));
        };
        let resolved_name = user.global_name.unwrap_or("Unknown".into());
        let app_secret = get_env("AUTH_SECRET");
        let Ok(tokens) = generate_tokens(&user.id, &resolved_name, &app_secret, &device_id) else {
            return CallbackResponse::Err(PlainText("Something went wrong :/".into()));
        };

        let refresh = digest(&tokens.refresh_token);
        let Ok(_) = sqlx::query!(
            "INSERT INTO website.user_refresh_tokens(user_id, refresh_token_hash, expires_at, device_id)
             VALUES($1::TEXT::BIGINT, $2, current_timestamp + INTERVAL '7 days', $3)  ON CONFLICT(user_id, device_id)
             DO UPDATE SET
                device_id = $3,
                refresh_token_hash = $2,
                expires_at = current_timestamp + INTERVAL '7 days'",
            user.id,
            refresh,
            device_id
        ).execute(&*data.pool).await else {
            return CallbackResponse::Err(PlainText("Something went wrong :/".into()));
        };

        session.set("access_token", &tokens.access_token);
        session.set("refresh_token", &tokens.refresh_token);

        CallbackResponse::Redirect(format!("{}?auth=success", get_env("CLIENT_AUTH_REDIRECT_URI")))
    }
    #[oai(path = "/auth/refresh", method = "post")]
    async fn refresh_token(
        &self,
        Data(data): Data<&AppData>,
        session: &Session
    ) -> RefreshResponse {
        let Some(refresh_token) = session.get::<String>("refresh_token") else {
            return RefreshResponse::Err(PlainText("Invalid refresh token".into()));
        };
        let Some(refresh_claims) = parse_refresh_token(&refresh_token) else {
            return RefreshResponse::Err(PlainText("Invalid refresh token".into()));
        };
        let device_id = refresh_claims.device_id;
        if refresh_claims.token_type != "refresh" {
            return RefreshResponse::Err(PlainText("Invalid refresh token".into()));
        }

        let token_hash = digest(&refresh_token);
        let Ok(result) = sqlx::query!(
            "SELECT user_id, expires_at FROM website.user_refresh_tokens
             WHERE user_id = $1::TEXT::BIGINT AND refresh_token_hash = $2 AND expires_at > CURRENT_TIMESTAMP",
            refresh_claims.sub, token_hash
        ).fetch_optional(&*data.pool).await else {
            return RefreshResponse::Err(PlainText("Something went wrong".into()));
        };

        let Some(_) = result else {
            return RefreshResponse::Err(PlainText("Token has expired".into()));
        };

        let Ok(user) = sqlx::query_as!(DbUser,
            "SELECT user_id, display_name, avatar FROM discord_user WHERE user_id = $1::TEXT::BIGINT LIMIT 1",
            refresh_claims.sub
        ).fetch_one(&*data.pool).await else {
            return RefreshResponse::Err(PlainText("User does not exist".into()));
        };

        let usage_user: User = user.into();
        let app_secret = get_env("AUTH_SECRET");
        let Ok(new_tokens) = generate_tokens(&usage_user.id, &usage_user.global_name, &app_secret, &device_id) else {
            return RefreshResponse::Err(PlainText("Something went wrong".into()));
        };

        let new_token_hash = digest(&new_tokens.refresh_token);
        let Some(new_refresh_token_claims) = parse_refresh_token(&new_token_hash) else {
            return RefreshResponse::Err(PlainText("Something went wrong".into()));
        };
        let Some(exp_time) = DateTime::from_timestamp(new_refresh_token_claims.exp as i64, 0) else {
            return RefreshResponse::Err(PlainText("Something went wrong".into()));
        };
        let Ok(_) = sqlx::query!(
            "UPDATE website.user_refresh_tokens
             SET refresh_token_hash = $2, expires_at = $4
             WHERE user_id = $1::TEXT::BIGINT AND device_id=$3",
            refresh_claims.sub, new_token_hash, &device_id, exp_time.to_db_time()
        ).execute(&*data.pool).await else {
            return RefreshResponse::Err(PlainText("Something went wrong".into()));
        };

        session.set("access_token", &new_tokens.access_token);
        session.set("refresh_token", &new_tokens.refresh_token);
        RefreshResponse::Success(PlainText("OK".into()))
    }

    #[oai(path = "/auth/logout", method = "post")]
    async fn logout(&self, Data(data): Data<&AppData>, session: &Session) -> LogoutResponse {
        if let Some(refresh_token) = session.get::<String>("refresh_token") {
            if let Some(refresh_claims) = parse_refresh_token(&refresh_token) {
                let _ = sqlx::query!(
                    "DELETE FROM website.user_refresh_tokens WHERE user_id = $1::TEXT::BIGINT",
                    refresh_claims.sub
                ).execute(&*data.pool).await;
            }
        }

        session.clear();
        LogoutResponse::Success(PlainText("Logged out successfully".into()))
    }
    #[oai(path="/accounts/me", method="get")]
    async fn get_user_info(&self, Data(data): Data<&AppData>, session: &Session) -> Response<User>{
        let Some(user) = get_user_session(session) else {
            return response!(err "No authentication", ErrorCode::Forbidden)
        };

        let Ok(result) = sqlx::query_as!(DbUser,
            "SELECT user_id, display_name, avatar FROM discord_user WHERE user_id = $1::TEXT::BIGINT LIMIT 1",
            user.id
        ).fetch_one(&*data.pool).await else {
            return response!(err "User does not exist", ErrorCode::NotFound);
        };
        response!(ok result.into())
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