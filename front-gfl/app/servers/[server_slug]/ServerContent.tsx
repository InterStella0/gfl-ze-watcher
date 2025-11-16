'use client'
import { useState } from "react";
import { Grid2 as Grid, LinearProgress } from "@mui/material";
import Paper from '@mui/material/Paper';
import PlayerList from "components/players/PlayerList";
import MapGraphList from "components/maps/MapGraphList";
import dynamic from "next/dynamic";

import {DateSources, useDateState} from "components/graphs/DateStateManager";
import {Server} from "types/community";
const RadarPreview = dynamic(() => import("components/radars/RadarPreview"), {
    ssr: false,
});
const ServerGraph = dynamic(() => import("components/graphs/ServerGraph"), {
    ssr: false,
});
export default function ServerContent({ server }: {server: Server}) {
    const [graphLoading, setGraphLoading] = useState<boolean>(false);
    const { start, end, setDates } = useDateState();

    const handleDateForceChange = (newStart, newEnd) => {
        setDates(newStart, newEnd.add(1, 'minutes'), DateSources.EXTERNAL);
    };

    return (
        <>
            <Grid container spacing={2} m='.5rem'>
                <Grid size={{ xl: 9, md: 8, sm: 12 }}>
                    <Grid>
                        <Paper elevation={0}>
                            <ServerGraph setLoading={setGraphLoading} />
                            {graphLoading && <LinearProgress />}
                        </Paper>
                    </Grid>
                </Grid>
                <Grid size={{ xl: 3, md: 4, sm: 12 }}>
                    <Paper elevation={0}>
                        <PlayerList dateDisplay={{ start, end }} />
                    </Paper>
                </Grid>

                <Grid size={{ xl: 9, md: 8, sm: 12 }}>
                    <Paper elevation={0}>
                        <MapGraphList onDateChange={handleDateForceChange} />
                    </Paper>
                </Grid>
                <Grid size={{ xl: 3, md: 4, sm: 12, xs: 12 }}>
                    <RadarPreview dateDisplay={{ start, end }} />
                </Grid>
            </Grid>
        </>
    );
}