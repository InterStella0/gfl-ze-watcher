import {Paper, Typography, Box, useTheme} from '@mui/material';
import { Line } from 'react-chartjs-2';
import { getMatchScoreChartData, getChartOptionsWithAnnotations } from '../../utils/sessionUtils.js';
import {useMapData} from "./useMapData.js";
import {useParams} from "react-router";

export const MapMatchScoreChart = ({ sessionInfo }) => {
    const { session_id, map_name } = useParams()
    const { graphMatch, loading } = useMapData(session_id);
    const theme = useTheme();

    if (loading) {
        return (
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h5" component="h3" mb={2}>
                    Match Score Progression
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
                Match Score Progression
            </Typography>
            <Box height={300}>
                <Line
                    data={getMatchScoreChartData(graphMatch, theme, "map")}
                    options={getChartOptionsWithAnnotations(null, sessionInfo, theme, true, 5)}
                />
            </Box>
            <Typography variant="body2" color="text.secondary" mt={1}>
                Round-by-round score tracking for { map_name }
            </Typography>
        </Paper>
    );
};