'use client'
import {Paper, Typography, Box} from '@mui/material';
import { Line } from 'react-chartjs-2';
import { getServerPopChartData, getChartOptionsWithAnnotations } from 'utils/sessionUtils.js';
import {
    PlayerSessionMapPlayed,
    ServerGraphType, SessionInfo, SessionType
} from "../../app/servers/[server_slug]/util";
import {PlayerSession} from "types/players";
import {
    Chart as ChartJS,
    Legend,
    LinearScale, LineElement, PointElement, TimeScale,
    Title,
    Tooltip
} from "chart.js";
import 'chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm';
ChartJS.register(
    LinearScale,
    Title,
    Tooltip,
    Legend,
    TimeScale,
    PointElement,
    LineElement,
)

export function ServerPopChart<T extends SessionType>(
    { sessionInfo, serverGraph, maps }
    : { sessionInfo: SessionInfo<T>, serverGraph: ServerGraphType<T>, maps: PlayerSessionMapPlayed[] | null}
)  {
    const data = getServerPopChartData(serverGraph)

    return (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" component="h3" mb={2}>
                Server Population During Session
            </Typography>
            <Box height={300}>
                <Line
                    data={data}
                    options={getChartOptionsWithAnnotations(maps, sessionInfo, false, 64)}
                />
            </Box>
            <Typography variant="body2" color="text.secondary" mt={1}>
                Population changes
            </Typography>
        </Paper>
    );
}