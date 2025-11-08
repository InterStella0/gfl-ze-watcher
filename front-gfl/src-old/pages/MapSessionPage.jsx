import {useNavigate, useParams} from 'react-router';
import {Box, Grid2, IconButton, Typography} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {ServerMapPopChart} from '../../components/sessions/ServerPopChart.jsx';
import { MutualSessions } from '../../components/sessions/MutualSessions.jsx';
import Paper from "@mui/material/Paper";
import {ArrowBack} from "@mui/icons-material";
import {useMapSession} from "../../components/sessions/useMapSession.js";
import {MapSessionHeader} from "../../components/sessions/MapSessionHeader.jsx";
import {MapSessionStats} from "../../components/sessions/MapSessionStats.jsx";
import {MapMatchScoreChart} from "../../components/sessions/MapMatchScoreChart.jsx";

const ErrorDisplay = ({ error, mapName }) => {
    const navigate = useNavigate();
    const { server_id }  = useParams();
    return (
        <Box bgcolor="background.default" p={3} minHeight="100vh">
            <Paper elevation={3} sx={{ p: 2, mb: 2, bgcolor: 'error.main', color: 'error.contrastText' }}>
                <Typography>Failed to load session details: {error}</Typography>
            </Paper>
            <IconButton
                color="primary"
                onClick={() => navigate(`/${server_id}/maps/${mapName}/`)}
                startIcon={<ArrowBack />}
            >
                Back to Map
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

export default function MapSessionPage() {
    const { server_id, session_id, map_name } = useParams();

    const {
        loading,
        error,
        sessionInfo
    } = useMapSession();

    if (loading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return <ErrorDisplay error={error} mapName={map_name} />;
    }

    return (
        <Box bgcolor="background.default" minHeight="100vh" p={3}>
            <MapSessionHeader sessionInfo={sessionInfo} />
            <Grid2 container spacing={3}>
                <Grid2 size={{ sm: 12, lg: 7, xl: 8 }}>
                    <MapSessionStats sessionInfo={sessionInfo} />
                    <ServerMapPopChart sessionInfo={sessionInfo} />
                    <MapMatchScoreChart sessionInfo={sessionInfo} />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 12, lg: 5, xl: 4 }}>
                    <MutualSessions
                        server_id={server_id}
                        object_id={map_name}
                        type="map"
                        session_id={session_id}
                    />
                </Grid2>
            </Grid2>
        </Box>
    );
}