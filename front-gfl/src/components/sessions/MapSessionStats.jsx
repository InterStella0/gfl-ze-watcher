import {Paper, Typography, Grid2, Box, Skeleton, CircularProgress} from '@mui/material';
import { formatDuration, getServerPopRange } from '../../utils/sessionUtils.js';
import { useServerGraph } from './useServerGraph.js';
import { useMutualSessions } from './useMutualSessions.js';
import dayjs from "dayjs";
import {useParams} from "react-router";
import {useMapData} from "./useMapData.js";
import {useMemo} from "react";

const MapSessionStatsSkeleton = () => {
    return [...Array(4)].map((_, index) => (
        <Grid2 key={index} size={{ xs: 3 }}>
            <Box textAlign="center">
                <Skeleton variant="text" width={80} height={48} sx={{ mx: 'auto', mb: 1 }} />
                <Skeleton variant="text" width={100} height={20} sx={{ mx: 'auto' }} />
            </Box>
        </Grid2>
    ))
};

export const MapSessionStats = ({ sessionInfo }) => {
    const { server_id, map_name, session_id } = useParams()
    const { serverGraph, loading: loadingGraph } = useServerGraph(server_id, map_name, session_id, "map");
    const { mutualSessions } = useMutualSessions(server_id, map_name, session_id, "map");
    const { loading: loadingMatch, graphMatch} = useMapData(session_id)
    const finalScore = useMemo(() => {
        const final = graphMatch[graphMatch.length - 1]
        if (!final) return "?-?"

        return `${final.human_score}-${final.zombie_score}`
    }, [graphMatch])
    return (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Grid2 container spacing={2}>
                {loadingGraph && <MapSessionStatsSkeleton />}
                {!loadingMatch && <>
                    <Grid2 size={{ xs: 3 }}>
                        <Box textAlign="center">
                            <Typography variant="h3" color="primary" fontWeight="bold">
                                {sessionInfo ? formatDuration(sessionInfo.started_at, sessionInfo.ended_at || dayjs()) : '0h 0m'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Total Duration
                            </Typography>
                        </Box>
                    </Grid2>
                    <Grid2 size={{ xs: 3 }}>
                        <Box textAlign="center">
                            <Typography variant="h3" color="primary" fontWeight="bold">
                                {finalScore}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Match Score
                            </Typography>
                        </Box>
                    </Grid2>
                    <Grid2 size={{ xs: 3 }}>
                        <Box textAlign="center">
                            <Typography variant="h3" color="primary" fontWeight="bold">
                                {mutualSessions.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Total Players
                            </Typography>
                        </Box>
                    </Grid2>
                    <Grid2 size={{ xs: 3 }}>
                        <Box textAlign="center">
                            <Typography variant="h3" color="primary" fontWeight="bold">
                                {loadingGraph? '...': getServerPopRange(serverGraph)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Server Pop Range
                            </Typography>
                        </Box>
                    </Grid2>
                </>}
            </Grid2>
        </Paper>
    );
};