import {Paper, Typography, Grid2, Box} from '@mui/material';
import { formatDuration, getServerPopRange } from '../../utils/sessionUtils.js';
import dayjs from "dayjs";
import { PlayerSession} from "../../types/players";
import {
    MutualSessionReturn, PlayerSessionMapPlayed, ServerGraphType
} from "../../app/servers/[server_slug]/util";

export async function SessionStats({ sessionInfo, maps, mutualSessions, serverGraph }
    :{ sessionInfo: PlayerSession, maps: PlayerSessionMapPlayed[], serverGraph: ServerGraphType<"player">, mutualSessions: MutualSessionReturn<"player">,  }
) {
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
                        <Box textAlign="center">
                            <Typography variant="h3" color="primary" fontWeight="bold" fontSize={fontSize}>
                                {maps.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Maps Played
                            </Typography>
                        </Box>
                    </Grid2>
                    <Grid2 size={{ xs: 3 }}>
                        <Box textAlign="center">
                            <Typography variant="h3" color="primary" fontWeight="bold" fontSize={fontSize}>
                                {mutualSessions.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Mutual Sessions
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
                </>
            </Grid2>
        </Paper>
    );
};