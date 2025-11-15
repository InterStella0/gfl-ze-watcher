import { useState } from "react";
import ServerGraph from "components/graphs/ServerGraph.tsx";
import PlayerList from "components/players/PlayerList.jsx";
import { Grid2 as Grid, LinearProgress } from "@mui/material";
import Paper from '@mui/material/Paper';
import ErrorCatch from "components/ui/ErrorMessage.jsx";
import MapGraphList from "components/maps/MapGraphList.jsx";
import RadarPreview from "components/radars/RadarPreview.jsx";
import { DateProvider, useDateState } from "components/graphs/DateStateManager";

function ServerContent() {
    const [graphLoading, setGraphLoading] = useState(false);
    const { start, end, setDates, sources } = useDateState();

    const handleDateForceChange = (newStart, newEnd) => {
        setDates(newStart, newEnd.add(1, 'minutes'), sources.EXTERNAL);
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

function Server() {
    return (
        <DateProvider>
            <ServerContent />
        </DateProvider>
    );
}

export default function ServerPage() {
    return (
        <ErrorCatch message="Server Page is broken.">
            <Server />
        </ErrorCatch>
    );
}