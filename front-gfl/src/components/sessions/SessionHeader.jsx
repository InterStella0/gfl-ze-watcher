import { useNavigate } from 'react-router';
import { Typography, Box, IconButton, Chip } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { PlayerAvatar } from "../players/PlayerAvatar.jsx";
import { formatTime } from '../../utils/sessionUtils.js';

export const SessionHeader = ({ server_id, player_id, session_id, playerDetails, sessionInfo }) => {
    const navigate = useNavigate();

    return (
        <Box display="flex" alignItems="center" flexDirection={{xs: 'column', sm: 'row'}} mb={3}>
            <Box display="flex" alignItems="center">
                <IconButton
                    color="primary"
                    onClick={() => navigate(`/${server_id}/players/${player_id}/`)}
                    sx={{ mr: 2 }}
                >
                    <ArrowBack />
                </IconButton>

                <Box display="flex" alignItems="center" mr={2} mb={1}>
                    {playerDetails && <PlayerAvatar uuid={player_id} name={playerDetails.name} />}
                    <Box ml={2}>
                        <Typography variant="h4" component="h1" fontSize={{xs: "medium", sm: 'large'}}>
                            {playerDetails ? playerDetails.name : 'Loading...'}&#39;s Session
                        </Typography>
                        <Typography component="p" fontSize={{xs: "small", sm: 'medium'}}>{session_id}</Typography>
                    </Box>
                </Box>
            </Box>

            <Box ml="auto">
                <Chip
                    label={`${sessionInfo ? new Date(sessionInfo.started_at).toLocaleDateString() : ''} • ${sessionInfo ? formatTime(sessionInfo.started_at) : ''}-${sessionInfo ? formatTime(sessionInfo.ended_at) : ''}`}
                    color="secondary"
                    variant="outlined"
                />
            </Box>
        </Box>
    );
};