import {Paper, Typography, Grid2, Box, Skeleton} from '@mui/material';
import { formatDuration, getServerPopRange } from '../../utils/sessionUtils.js';
import { useMapsData } from './useMapsData.js';
import { useServerGraph } from './useServerGraph.js';
import { useMutualSessions } from './useMutualSessions.js';
import dayjs from "dayjs";

const SessionStatSkeleton = () => {
    const fontSize = {xs: "1.4rem", sm: "2.7rem"}

    return <Box textAlign="center">
        <Skeleton variant="text" width="2rem" height={48} sx={{ mx: 'auto', mb: 1, fontSize }} />
        <Skeleton variant="text" width="4rem" height={20} sx={{ mx: 'auto' }} />
    </Box>
};

export const SessionStats = ({ sessionInfo, server_id, player_id, session_id }) => {
    const { maps, loading: loadingMaps } = useMapsData(server_id, player_id, session_id);
    const { serverGraph, loading: loadingGraph } = useServerGraph(server_id, player_id, session_id, "player");
    const { mutualSessions, loading: loadingSession } = useMutualSessions(server_id, player_id, session_id, "player");
    const fontSize = {xs: "1.4rem", sm: "2.7rem"}
    return (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Grid2 container spacing={2}>
                <>
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
                        {loadingMaps && <SessionStatSkeleton />}
                        {!loadingMaps && <Box textAlign="center">
                            <Typography variant="h3" color="primary" fontWeight="bold" fontSize={fontSize}>
                                {maps.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Maps Played
                            </Typography>
                        </Box>}
                    </Grid2>
                    <Grid2 size={{ xs: 3 }}>
                        {loadingSession && <SessionStatSkeleton />}
                        {!loadingSession && <Box textAlign="center">
                            <Typography variant="h3" color="primary" fontWeight="bold" fontSize={fontSize}>
                                {mutualSessions.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Mutual Sessions
                            </Typography>
                        </Box>}
                    </Grid2>
                    <Grid2 size={{ xs: 3 }}>
                        {loadingGraph && <SessionStatSkeleton />}
                        {!loadingGraph && <Box textAlign="center">
                            <Typography variant="h3" color="primary" fontWeight="bold" fontSize={fontSize}>
                                {getServerPopRange(serverGraph)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Server Pop Range
                            </Typography>
                        </Box>}
                    </Grid2>
                </>
            </Grid2>
        </Paper>
    );
};