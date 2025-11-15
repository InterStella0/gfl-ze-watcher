'use client'
import {Paper, Typography, Box} from '@mui/material';
import { Line } from 'react-chartjs-2';
import { getMatchScoreChartData, getChartOptionsWithAnnotations } from 'utils/sessionUtils.js';
import {PlayerSession} from "types/players.js";
import {PlayerSessionMapPlayed} from "../../app/servers/[server_slug]/util.js";

export function MatchScoreChart(
    {sessionInfo, maps}
    : {sessionInfo: PlayerSession, maps: PlayerSessionMapPlayed[]}
) {
    return (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" component="h3" mb={2}>
                Match Score Progression
            </Typography>
            <Box height={300}>
                <Line
                    data={getMatchScoreChartData(maps, "player")}
                    options={getChartOptionsWithAnnotations(maps, sessionInfo, true, 5)}
                />
            </Box>
            <Typography variant="body2" color="text.secondary" mt={1}>
                Round-by-round score tracking across all maps
            </Typography>
        </Paper>
    );
};