import { Paper, Typography, Grid2, Box } from '@mui/material';
import { formatDuration, getServerPopRange } from '../../utils/sessionUtils.js';
import { useMapsData } from './useMapsData.js';
import { useServerGraph } from './useServerGraph.js';
import { useMutualSessions } from './useMutualSessions.js';
import dayjs from "dayjs";

export const SessionStats = ({ sessionInfo, server_id, player_id, session_id }) => {
    const { maps } = useMapsData(server_id, player_id, session_id);
    const { serverGraph } = useServerGraph(server_id, player_id, session_id);
    const { mutualSessions } = useMutualSessions(server_id, player_id, session_id);
    return (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Grid2 container spacing={2}>
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
                            {maps.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Maps Played
                        </Typography>
                    </Box>
                </Grid2>
                <Grid2 size={{ xs: 3 }}>
                    <Box textAlign="center">
                        <Typography variant="h3" color="primary" fontWeight="bold">
                            {mutualSessions.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Mutual Sessions
                        </Typography>
                    </Box>
                </Grid2>
                <Grid2 size={{ xs: 3 }}>
                    <Box textAlign="center">
                        <Typography variant="h3" color="primary" fontWeight="bold">
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