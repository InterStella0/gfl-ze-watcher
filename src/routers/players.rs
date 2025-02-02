use poem_openapi::OpenApi;

pub struct PlayerApi;


#[OpenApi]
impl PlayerApi{
    #[oai(path = "/players/:player_id/graph/sessions", method = "get")]
    async fn get_player_sessions(&self) {
        todo!()
    }
    #[oai(path = "/players/:player_id/graph/infractions", method = "get")]
    async fn get_player_infractions(&self) {
        todo!()
    }
    #[oai(path = "/players/:player_id/details", method = "get")]
    async fn get_player_detail(&self) {
        todo!()
    }
}