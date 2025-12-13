import {SessionData} from "./page.tsx";
import {Box, Grid2} from "@mui/material";
import {SessionHeader} from "components/sessions/SessionHeader.tsx";
import {SessionStats} from "components/sessions/SessionStats.tsx";
import {ServerPopChart} from "components/sessions/ServerPopChart.tsx";
import MatchScoreChart from "components/sessions/MatchScoreChart.tsx";
import MapsList from "components/sessions/MapsList.tsx";
import MutualSessionsDisplay from "components/sessions/MutualSessionsDisplay.tsx";
import {use} from "react";


export default function SessionPlayerWrapper({ sessionPromise }: { sessionPromise: Promise<SessionData> }) {
    const { server, player, sessionInfo, mutualSessions, serverGraph, maps, mapImages } = use(sessionPromise)
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