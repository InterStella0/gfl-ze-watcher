import {ServerMapMatch} from "types/maps";
import {fetchServerUrl} from "utils/generalUtils";

export async function getMatchNow(serverId: string): Promise<ServerMapMatch> {
    const currentMatch = await fetchServerUrl(serverId, '/match-now')
    return currentMatch as ServerMapMatch
}
