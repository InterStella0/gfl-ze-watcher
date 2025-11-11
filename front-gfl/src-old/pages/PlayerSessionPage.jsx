import {useNavigate, useParams} from 'react-router';
import {Box, Grid2, IconButton, Typography} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { usePlayerSession } from '../../components/sessions/usePlayerSession.js';
import { SessionHeader } from '../../components/sessions/SessionHeader.tsx';
import { SessionStats } from '../../components/sessions/SessionStats.tsx';
import {ServerPlayerPopChart} from '../../components/sessions/ServerPopChart.tsx';
import { MatchScoreChart } from '../../components/sessions/MatchScoreChart.tsx';
import { MapsList } from '../../components/sessions/MapsList.tsx';
import { MutualSessionsDisplay } from '../../components/sessions/MutualSessionsDisplay.tsx';
import Paper from "@mui/material/Paper";
import {ArrowBack} from "@mui/icons-material";

const ErrorDisplay = ({ error, server_id, player_id }) => {
    const navigate = useNavigate();

    return (
        <Box bgcolor="background.default" p={3} minHeight="100vh">
            <Paper elevation={3} sx={{ p: 2, mb: 2, bgcolor: 'error.main', color: 'error.contrastText' }}>
                <Typography>Failed to load session details: {error}</Typography>
            </Paper>
            <IconButton
                color="primary"
                onClick={() => navigate(`/${server_id}/players/${player_id}/`)}
                startIcon={<ArrowBack />}
            >
                Back to Profile
            </IconButton>
        </Box>
    );
};

const LoadingSpinner = () => {
    const theme = useTheme();

    return (
        <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="400px"
            bgcolor="background.default"
        >
            <Box
                sx={{
                    width: 40,
                    height: 40,
                    border: `4px solid ${theme.palette.divider}`,
                    borderTop: `4px solid ${theme.palette.primary.main}`,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' }
                    }
                }}
            />
        </Box>
    );
};

export default function PlayerSessionPage() {
    const { server_id, session_id, player_id } = useParams();

    const {
        loading,
        error,
        sessionInfo,
        playerDetails
    } = usePlayerSession(server_id, session_id, player_id);

    if (loading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return <ErrorDisplay error={error} server_id={server_id} player_id={player_id} />;
    }

    return (
        <Box bgcolor="background.default" minHeight="100vh" p={3}>
            <SessionHeader
                server_id={server_id}
                player_id={player_id}
                session_id={session_id}
                playerDetails={playerDetails}
                sessionInfo={sessionInfo}
            />

            <Grid2 container spacing={3}>
                <Grid2 size={{ sm: 12, lg: 7, xl: 8 }}>
                    <SessionStats
                        sessionInfo={sessionInfo}
                        server_id={server_id}
                        player_id={player_id}
                        session_id={session_id}
                    />

                    <ServerPlayerPopChart
                        sessionInfo={sessionInfo}
                        server_id={server_id}
                        player_id={player_id}
                        session_id={session_id}
                    />

                    <MatchScoreChart
                        sessionInfo={sessionInfo}
                        server_id={server_id}
                        player_id={player_id}
                        session_id={session_id}
                    />

                    <MapsList
                        server_id={server_id}
                        player_id={player_id}
                        session_id={session_id}
                    />
                </Grid2>

                <Grid2 size={{ xs: 12, sm: 12, lg: 5, xl: 4 }}>
                    <MutualSessions
                        server_id={server_id}
                        object_id={player_id}
                        session_id={session_id}
                        type="player"
                    />
                </Grid2>
            </Grid2>
        </Box>
    );
}