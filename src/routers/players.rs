use poem_openapi::{Object, OpenApi};

use crate::{model::Response, response};

#[derive(Object)]
pub struct PlayerSessionDetail;

#[derive(Object)]
pub struct PlayerInfractions;

#[derive(Object)]
pub struct PlayerDetail;

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
}