import { useState } from 'react';
import { useNavigate } from 'react-router';
import {Paper, Typography, Box, IconButton, Skeleton} from '@mui/material';
import { ArrowBackIos, ArrowForwardIos } from '@mui/icons-material';
import { PlayerAvatar } from "../players/PlayerAvatar.jsx";
import { useMutualSessions } from './useMutualSessions.js';


const MutualSessionsSkeleton = () => (
    Array.from({ length: 30 }).map((_, index) => (
            <Box
                key={index}
                display="flex"
                alignItems="center"
                mb={2}
                sx={{ p: 1 }}
            >
                <Skeleton variant="circular" width={40} height={40} />
                <Box display="flex" ml={3} justifyContent="space-between" alignItems="center" flexGrow={1}>
                    <Box>
                        <Skeleton variant="text" width={120} height={24} sx={{ mb: 0.5 }} />
                        <Skeleton variant="text" width={200} height={20} sx={{ display: { xs: 'none', sm: 'block' } }} />
                    </Box>
                    <Skeleton variant="text" width={60} height={20} />
                </Box>
            </Box>
        ))
);


export const MutualSessions = ({ server_id, object_id, session_id, type }) => {
    const navigate = useNavigate();
    const [mutualCurrentPage, setMutualCurrentPage] = useState(0);
    const { mutualSessions, loading } = useMutualSessions(server_id, object_id, session_id, type);
    const isPlayer = type === 'player';
    const isMap = type === 'map'
    const MUTUAL_PAGE_SIZE = 30;

    const getCurrentPageMutual = () => {
        const startIndex = mutualCurrentPage * MUTUAL_PAGE_SIZE;
        const endIndex = startIndex + MUTUAL_PAGE_SIZE;
        return mutualSessions.slice(startIndex, endIndex);
    };

    const getTotalPages = () => {
        return Math.ceil(mutualSessions.length / MUTUAL_PAGE_SIZE);
    };

    return (
        <Paper elevation={3} sx={{ p: 3 }} >
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5" component="h3">
                    {isPlayer? 'Mutual Sessions': isMap ? 'Players' : ''}
                </Typography>

                {mutualSessions.length > MUTUAL_PAGE_SIZE && (
                    <Box display="flex" alignItems="center" gap={1}>
                        <IconButton
                            onClick={() => setMutualCurrentPage(prev => Math.max(0, prev - 1))}
                            disabled={mutualCurrentPage === 0}
                            size="small"
                            color="primary"
                        >
                            <ArrowBackIos fontSize="small" />
                        </IconButton>

                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60, textAlign: 'center' }}>
                            {mutualCurrentPage + 1}/{getTotalPages()}
                        </Typography>

                        <IconButton
                            onClick={() => setMutualCurrentPage(prev => Math.min(getTotalPages() - 1, prev + 1))}
                            disabled={mutualCurrentPage >= getTotalPages() - 1}
                            size="small"
                            color="primary"
                        >
                            <ArrowForwardIos fontSize="small" />
                        </IconButton>
                    </Box>
                )}
            </Box>

            {loading && <MutualSessionsSkeleton />}
            {!loading && getCurrentPageMutual().map((player) => (
                <Box
                    key={player.id}
                    display="flex"
                    alignItems="center"
                    mb={2}
                    sx={{
                        cursor: 'pointer',
                        borderRadius: 1,
                        p: 1,
                        '&:hover': {
                            backgroundColor: 'action.hover'
                        }
                    }}
                    onClick={() => navigate(`/${server_id}/players/${player.id}`)}
                >
                    <PlayerAvatar uuid={player.id} name={player.name} />
                    <Box display="flex" ml={3} justifyContent="space-between" alignItems={{md: "center", sm: 'none'}} flexDirection={{xs: 'column', sm: 'row'}} flexGrow={1}>
                        <Box>
                            <Typography variant="body1" mb={0.5}
                                        sx={{
                                            overflow: 'hidden',
                                            whiteSpace: 'nowrap',
                                            textOverflow: 'ellipsis',
                                            maxWidth: {lg: '10rem', xl: '15rem'},
                                        }}>
                                {player.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" display={{xs: 'none', sm: 'block'}}>
                                {player.id}
                            </Typography>
                        </Box>
                        <Typography variant="body2" color="primary" fontWeight="bold">
                            {(player[isPlayer? 'total_time_together': isMap? 'total_playtime': ''] / 60).toFixed(1)}mins
                        </Typography>
                    </Box>
                </Box>
            ))}
        </Paper>
    );
};