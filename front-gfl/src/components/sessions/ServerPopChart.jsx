import { Paper, Typography, Box } from '@mui/material';
import { Line } from 'react-chartjs-2';
import { getServerPopChartData, getChartOptionsWithAnnotations } from '../../utils/sessionUtils.js';
import { useServerGraph } from './useServerGraph.js';
import { useMapsData } from './useMapsData.js';
import {useMemo} from "react";

export const ServerPopChart = ({ sessionInfo, server_id, player_id, session_id, theme }) => {
    const { serverGraph, loading: graphLoading } = useServerGraph(server_id, player_id, session_id);
    const { maps, loading: mapsLoading } = useMapsData(server_id, player_id, session_id);

    const data = useMemo(() => {
        return getServerPopChartData(serverGraph, theme)
    }, [serverGraph,  theme]);
    if (graphLoading || mapsLoading) {
        return (
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h5" component="h3" mb={2}>
                    Server Population During Session
                </Typography>
                <Box height={300} display="flex" alignItems="center" justifyContent="center">
                    <Typography>Loading...</Typography>
                </Box>
            </Paper>
        );
    }
    return (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" component="h3" mb={2}>
                Server Population During Session
            </Typography>
            <Box height={300}>
                <Line
                    data={data}
                    options={getChartOptionsWithAnnotations(maps, sessionInfo, theme, false, 64)}
                />
            </Box>
            <Typography variant="body2" color="text.secondary" mt={1}>
                Population changes with map transitions marked
            </Typography>
        </Paper>
    );
};