import {ServerMapMatch} from "types/maps";
import {fetchServerUrl} from "utils/generalUtils";
import {oneMinute, threeMinutes} from "../util.ts";

export async function getMatchNow(serverId: string): Promise<ServerMapMatch> {
    const currentMatch = await fetchServerUrl(serverId, '/match-now', { next: {revalidate: oneMinute} })
    return currentMatch as ServerMapMatch
}
