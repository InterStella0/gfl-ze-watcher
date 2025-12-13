import {Box, Grid2} from "@mui/material";
import MapSessionHeader from "components/sessions/MapSessionHeader.tsx";
import MapSessionStats from "components/sessions/MapSessionStats.tsx";
import {ServerPopChart} from "components/sessions/ServerPopChart.tsx";
import MapMatchScoreChart from "components/sessions/MapMatchScoreChart.tsx";
import SessionContinents from "components/sessions/SessionContinents.tsx";
import MutualSessionsDisplay from "components/sessions/MutualSessionsDisplay.tsx";
import {SessionData} from "./page.tsx";
import {use} from "react";

export default function MapSessionWrapper({ sessionPromise }: {sessionPromise: Promise<SessionData> }){
    const { sessionInfo, mutualSessions, graphData, serverGraph, mapImage, continents, server } = use(sessionPromise)
    return <Box bgcolor="background.default" minHeight="100vh" p={3}>
        <MapSessionHeader sessionInfo={sessionInfo} server={server} mapImage={mapImage?.small || null} />
        <Grid2 container spacing={3}>
            <Grid2 size={{ sm: 12, lg: 7, xl: 8 }}>
                <MapSessionStats sessionInfo={sessionInfo} mutualSessions={mutualSessions} serverGraph={serverGraph} graphMatch={graphData} />
                <ServerPopChart sessionInfo={sessionInfo} serverGraph={serverGraph} maps={null} />
                <MapMatchScoreChart sessionInfo={sessionInfo} graphMatch={graphData} />
                {sessionInfo && continents && <SessionContinents sessionInfo={sessionInfo} continents={continents}/>}
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
}