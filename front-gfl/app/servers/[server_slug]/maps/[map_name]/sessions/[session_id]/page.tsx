import {getMutualSessions, getServerGraph, getServerSlug, getSessionInfo} from "../../../../util";
import {Box, Grid2} from "@mui/material";
import {fetchServerUrl, getMapImage} from "utils/generalUtils";
import {MapSessionMatch} from "types/maps";
import MutualSessionsDisplay from "components/sessions/MutualSessionsDisplay";
import MapSessionStats from "components/sessions/MapSessionStats";
import {ServerPopChart} from "components/sessions/ServerPopChart";
import MapMatchScoreChart from "components/sessions/MapMatchScoreChart";
import MapSessionHeader from "components/sessions/MapSessionHeader";
import {notFound} from "next/navigation";

export default async function Page({ params }) {
    const { session_id, server_slug, map_name } = await params;
    try{
        const server = await getServerSlug(server_slug)
        const server_id = server?.id

        const [
            sessionInfo,
            mutualSessions,
            graphData,
            serverGraph,
            mapImage
        ] = await Promise.all([
            getSessionInfo(server_id, session_id, "map", map_name),
            getMutualSessions(server_id, session_id, "map", map_name),
            fetchServerUrl(server_id, `/sessions/${session_id}/all-match`),
            getServerGraph(server_id, session_id, map_name, 'map'),
            getMapImage(server_id, map_name)
        ]);

        return <Box bgcolor="background.default" minHeight="100vh" p={3}>
            <MapSessionHeader sessionInfo={sessionInfo} server={server} mapImage={mapImage?.small || null} />
            <Grid2 container spacing={3}>
                <Grid2 size={{ sm: 12, lg: 7, xl: 8 }}>
                    <MapSessionStats sessionInfo={sessionInfo} mutualSessions={mutualSessions} serverGraph={serverGraph} graphMatch={graphData} />
                    <ServerPopChart sessionInfo={sessionInfo} serverGraph={serverGraph} maps={null} />
                    <MapMatchScoreChart sessionInfo={sessionInfo} graphMatch={graphData} />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 12, lg: 5, xl: 4 }}>
                    <MutualSessionsDisplay
                        server={server}
                        mutualSessions={mutualSessions}
                        type="map"
                    />
                </Grid2>
            </Grid2>
        </Box>
    }catch (error) {
        if (error.status === 404) {
            notFound();
        }
        throw error;
    }



}