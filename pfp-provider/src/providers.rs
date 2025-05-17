use async_trait::async_trait;
use regex::Regex;
use reqwest::Client;
use serde_json::json;
use anyhow::Result;
use poem_openapi::__private::serde::Deserialize;

#[async_trait]
pub trait Provider: Send + Sync {
    async fn get_pfp(&self, uuid: u64) -> Result<String>;
    fn name(&self) -> String;
}

pub struct SteamIdPro {
    client: Client,
}

impl SteamIdPro {
    pub fn new(client: Client) -> Self {
        Self { client }
    }
}

#[async_trait]
impl Provider for SteamIdPro {
    async fn get_pfp(&self, uuid: u64) -> Result<String> {
        let base_url = "https://steamid.pro/lookup";
        let url = format!("{}/{}", base_url, uuid);

        let response = self.client.get(&url).send().await?.text().await?;

        let pattern = r#""image": "https://avatars\.steamstatic\.com/([a-f0-9]+)_full\.jpg""#;
        let regex = Regex::new(pattern)?;

        if let Some(captures) = regex.captures(&response) {
            if let Some(hash) = captures.get(1) {
                return Ok(format!("https://avatars.steamstatic.com/{}_full.jpg", hash.as_str()));
            }
        }

        Ok(String::new())
    }

    fn name(&self) -> String {
        "SteamIdPro".to_string()
    }
}

pub struct SteamIdXyz {
    client: Client,
}

impl SteamIdXyz {
    pub fn new(client: Client) -> Self {
        Self { client }
    }
}

#[async_trait]
impl Provider for SteamIdXyz {
    async fn get_pfp(&self, uuid: u64) -> Result<String> {
        let base_url = "https://steamid.xyz";
        let url = format!("{}/{}", base_url, uuid);

        let response = self.client
            .get(&url)
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36")
            .send()
            .await?
            .text()
            .await?;

        let pattern = r#"src="https://avatars\.steamstatic\.com/([a-f0-9]+)_full\.jpg""#;
        let regex = Regex::new(pattern)?;

        if let Some(captures) = regex.captures(&response) {
            if let Some(hash) = captures.get(1) {
                return Ok(format!("https://avatars.steamstatic.com/{}_full.jpg", hash.as_str()));
            }
        }

        Ok(String::new())
    }

    fn name(&self) -> String {
        "SteamIdXyz".to_string()
    }
}

pub struct TradeItProvider {
    client: Client,
}

impl TradeItProvider {
    pub fn new(client: Client) -> Self {
        Self { client }
    }
}

#[async_trait]
impl Provider for TradeItProvider {
    async fn get_pfp(&self, uuid: u64) -> Result<String> {
        let base_url = "https://tradeit.gg/api/steam/v1/steams/id-finder";

        let payload = json!({
            "id": format!("{}", uuid)
        });

        let response = self.client
            .post(base_url)
            .json(&payload)
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        if let Some(avatar) = response.get("avatar") {
            if let Some(large) = avatar.get("large") {
                if let Some(url) = large.as_str() {
                    return Ok(url.to_string());
                }
            }
        }

        Ok(String::new())
    }

    fn name(&self) -> String {
        "TradeItProvider".to_string()
    }
}

pub struct SteamOfficialApi {
    client: Client,
    api_key: String,
}

#[derive(Deserialize)]
#[allow(dead_code)]
struct SteamProfile {
    pub steamid: String,
    pub communityvisibilitystate: i64,
    pub profilestate: i64,
    pub personaname: String,
    pub commentpermission: i64,
    pub profileurl: String,
    pub avatar: String,
    pub avatarmedium: String,
    pub avatarfull: String,
    pub avatarhash: String,
    pub personastate: i64,
}

#[derive(Deserialize)]
struct SteamProfileResponse {
    pub players: Vec<SteamProfile>,
}

#[derive(Deserialize)]
struct SteamApiResponse {
    pub response: SteamProfileResponse,
}

impl SteamOfficialApi {
    pub fn new(client: Client, api_key: String) -> Self {
        Self { client, api_key }
    }
}

#[async_trait]
impl Provider for SteamOfficialApi {
    async fn get_pfp(&self, uuid: u64) -> Result<String> {

        let base_url = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/";

        let response = self.client
            .get(base_url)
            .query(&[
                ("key", &self.api_key),
                ("steamids", &uuid.to_string())
            ])
            .send()
            .await?
            .json::<SteamApiResponse>()
            .await?;
        let Some(profile) = response.response.players.first() else {
            return Ok(String::new())
        };

        Ok(profile.avatarfull.clone())
    }

    fn name(&self) -> String {
        "SteamOfficialApi".to_string()
    }
}