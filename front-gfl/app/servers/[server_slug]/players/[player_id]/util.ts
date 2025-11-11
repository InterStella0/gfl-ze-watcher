import {DetailedPlayer, DetailedPlayerInfo, PlayerSession} from "../../../../../types/players";
import {fetchServerUrl} from "../../../../../utils/generalUtils";
import dayjs from "dayjs";

export type PlayerInfo = DetailedPlayerInfo
export async function getPlayerDetailed(server_id: string, player_id: string): Promise<PlayerInfo> {
    return await Promise.all([
        fetchServerUrl(server_id, `/players/${player_id}/detail`),
        fetchServerUrl(server_id, `/players/${player_id}/playing`)
    ]).then(([playerData, playingData]: [DetailedPlayer, PlayerSession]): PlayerInfo => {

        let prop: PlayerInfo = {
            ...playerData,
            last_played: playingData.started_at,
            last_played_ended: playingData.ended_at,
            online_since: null,
            last_played_duration: null
        }
        if (prop.last_played_ended == null)
            prop.online_since = playingData.started_at
        else {
            prop.last_played_duration = dayjs(playingData.ended_at).diff(dayjs(playingData.started_at), "seconds")
        }
        return prop
    })
}