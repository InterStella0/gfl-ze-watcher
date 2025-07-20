import {Paper, Typography, Box, useTheme, Skeleton} from '@mui/material';
import { Line } from 'react-chartjs-2';
import { getMatchScoreChartData, getChartOptionsWithAnnotations } from '../../utils/sessionUtils.js';
import { useMapsData } from './useMapsData.js';

export const MatchScoreChart = ({ sessionInfo, server_id, player_id, session_id }) => {
    const { maps, loading } = useMapsData(server_id, player_id, session_id);
    const theme = useTheme();

    if (loading) {
        return (
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h5" component="h3" mb={2}>
                    Match Score Progression
                </Typography>
                <Box height={300} display="flex" alignItems="center" justifyContent="center">
                    <Skeleton variant="rectangular" sx={{height: "100%", width: "100%"}} />
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
                    data={getMatchScoreChartData(maps, theme, "player")}
                    options={getChartOptionsWithAnnotations(maps, sessionInfo, theme, true, 5)}
                />
            </Box>
            <Typography variant="body2" color="text.secondary" mt={1}>
                Round-by-round score tracking across all maps
            </Typography>
        </Paper>
    );
};