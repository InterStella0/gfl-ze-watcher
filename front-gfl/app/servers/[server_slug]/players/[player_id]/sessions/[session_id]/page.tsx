import {Box, Grid2} from "@mui/material";
import {SessionHeader} from "../../../../../../../components/sessions/SessionHeader";
import {SessionStats} from "../../../../../../../components/sessions/SessionStats";
import { ServerPopChart} from "../../../../../../../components/sessions/ServerPopChart";
import {MatchScoreChart} from "../../../../../../../components/sessions/MatchScoreChart";
import {MapsList} from "../../../../../../../components/sessions/MapsList";
import {
    getMapsDataSession,
    getMutualSessions,
    getServerGraph,
    getServerSlug,
    PlayerSessionMapPlayed
} from "../../../../util";
import {fetchServerUrl, getMapImage} from "../../../../../../../utils/generalUtils";
import {getPlayerDetailed, PlayerInfo} from "../../util";
import {PlayerSession} from "../../../../../../../types/players";
import MutualSessionsDisplay from "../../../../../../../components/sessions/MutualSessionsDisplay";

async function getMapImages(server_id: string, player_id: string, session_id: string): Promise<Record<string, string>> {
    const mapsData: PlayerSessionMapPlayed[] = await fetchServerUrl(server_id, `/players/${player_id}/sessions/${session_id}/maps`);
    const imagePromises = mapsData.map(async (map) => {
        try {
            const imageData = await getMapImage(server_id, map.map);
            return { [map.map]: imageData?.extra_large || null };
        } catch (error) {
            console.error(`Failed to load image for ${map.map}:`, error);
            return { [map.map]: null };
        }
    });
    const imageResults = await Promise.all(imagePromises);
    const imageMap = imageResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
    return imageMap as Record<string, string>;
}

export default async function Page({ params }){
    const { player_id, server_slug, session_id } = await params
    const server = await getServerSlug(server_slug);
    const server_id = server.id

    const player: PlayerInfo = await getPlayerDetailed(server_id, player_id);
    const sessionInfo: PlayerSession = await fetchServerUrl(server_id, `/players/${player_id}/sessions/${session_id}/info`)

    const maps = await getMapsDataSession(server_id, player_id, session_id);
    const serverGraph = await getServerGraph(server_id, session_id, player_id, "player");
    const mutualSessions = await getMutualSessions(server_id, session_id, "player", player_id);
    const mapImages = await getMapImages(server_id, player_id, session_id);

    return <Box bgcolor="background.default" minHeight="100vh" p={3}>
        <SessionHeader
            server={server}
            player={player}
            sessionInfo={sessionInfo}
        />

        <Grid2 container spacing={3}>
            <Grid2 size={{ sm: 12, lg: 7, xl: 8 }}>
                <SessionStats
                    sessionInfo={sessionInfo}
                    maps={maps}
                    mutualSessions={mutualSessions}
                    serverGraph={serverGraph}
                />

                <ServerPopChart
                    sessionInfo={sessionInfo}
                    maps={maps}
                    serverGraph={serverGraph}
                />

                <MatchScoreChart
                    sessionInfo={sessionInfo}
                    maps={maps}
                />

                <MapsList
                    server={server}
                    maps={maps}
                    mapImages={mapImages}
                />
            </Grid2>

            <Grid2 size={{ xs: 12, sm: 12, lg: 5, xl: 4 }}>
                <MutualSessionsDisplay
                    server={server}
                    mutualSessions={mutualSessions}
                    type="player"
                />
            </Grid2>
        </Grid2>
    </Box>
}