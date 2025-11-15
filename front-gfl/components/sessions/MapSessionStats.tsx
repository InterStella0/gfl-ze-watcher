import {Paper, Typography, Grid2, Box, Skeleton} from '@mui/material';
import { formatDuration, getServerPopRange } from 'utils/sessionUtils.js';
import dayjs from "dayjs";
import {MapSessionMatch, ServerMapPlayed} from "types/maps";
import {MutualSessionReturn, ServerGraphType} from "../../app/servers/[server_slug]/util";

const MapSessionStatsSkeleton = () => {
    const fontSize = {xs: "1.4rem", sm: "2.7rem"}
    return [...Array(4)].map((_, index) => (
        <Grid2 key={index} size={{ xs: 3 }}>
            <Box textAlign="center">
                <Skeleton variant="text" width="2rem" sx={{ mx: 'auto', mb: 1, fontSize: fontSize }} />
                <Skeleton variant="text" width="4rem" height={18} sx={{ mx: 'auto' }} />
            </Box>
        </Grid2>
    ))
};

export default async function MapSessionStats(
    { sessionInfo, serverGraph, graphMatch, mutualSessions }: 
    { sessionInfo: ServerMapPlayed, serverGraph: ServerGraphType<"map">, graphMatch: MapSessionMatch[], mutualSessions: MutualSessionReturn<"map"> }){
    const final = graphMatch[graphMatch.length - 1] || null
    const finalScore = final? `${final.human_score}-${final.zombie_score}`: '?-?'
    const fontSize = {xs: "1.4rem", sm: "2.7rem"}
    return (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Grid2 container spacing={2}>
                <Grid2 size={{ xs: 3 }}>
                    <Box textAlign="center">
                        <Typography variant="h3" color="primary" fontWeight="bold" fontSize={fontSize}>
                            {sessionInfo ? formatDuration(sessionInfo.started_at, sessionInfo.ended_at || dayjs()) : '0h 0m'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Total Duration
                        </Typography>
                    </Box>
                </Grid2>
                <Grid2 size={{ xs: 3 }}>
                    <Box textAlign="center">
                        <Typography variant="h3" color="primary" fontWeight="bold" fontSize={fontSize}>
                            {finalScore}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Match Score
                        </Typography>
                    </Box>
                </Grid2>
                <Grid2 size={{ xs: 3 }}>
                    <Box textAlign="center">
                        <Typography variant="h3" color="primary" fontWeight="bold" fontSize={fontSize}>
                            {mutualSessions.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Total Players
                        </Typography>
                    </Box>
                </Grid2>
                <Grid2 size={{ xs: 3 }}>
                    <Box textAlign="center">
                        <Typography variant="h3" color="primary" fontWeight="bold" fontSize={fontSize}>
                            {getServerPopRange(serverGraph)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Server Pop Range
                        </Typography>
                    </Box>
                </Grid2>
            </Grid2>
        </Paper>
    );
};