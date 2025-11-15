'use client'
import {Paper, Typography, Box} from '@mui/material';
import { Line } from 'react-chartjs-2';
import { getMatchScoreChartData, getChartOptionsWithAnnotations } from 'utils/sessionUtils.js';
import {MapSessionMatch, ServerMapPlayed} from "types/maps";

export default function MapMatchScoreChart(
    { sessionInfo, graphMatch }
    : { sessionInfo: ServerMapPlayed, graphMatch: MapSessionMatch[]}
){

    return (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" component="h3" mb={2}>
                Match Score Progression
            </Typography>
            <Box height={300}>
                <Line
                    data={getMatchScoreChartData(graphMatch, "map")}
                    options={getChartOptionsWithAnnotations(null, sessionInfo, true, 5)}
                />
            </Box>
            <Typography variant="body2" color="text.secondary" mt={1}>
                Round-by-round score tracking for { sessionInfo.map }
            </Typography>
        </Paper>
    );
};