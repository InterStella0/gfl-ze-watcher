use poem::web::{Data, Path};
use poem_openapi::{Object, OpenApi};
use serde::{Deserialize, Serialize};

use crate::{model::{ErrorCode, Response}, response, AppData};

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
pub struct PlayerApi;


#[OpenApi]
impl PlayerApi{
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