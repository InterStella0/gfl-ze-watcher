import { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Card,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Badge,
    Pagination,
    Divider,
    Skeleton
} from '@mui/material';
import { Circle } from '@mui/icons-material';
import { fetchServerUrl } from "../../utils/generalUtils.jsx";
import { PlayerAvatar } from "./PlayerAvatar.jsx";


const PlayerListSkeleton = ({ count = 20 }) => (
    <List sx={{ p: 1 }}>
        {Array.from({ length: count }).map((_, index) => (
            <ListItem key={index} sx={{ py: 0.5 }}>
                <ListItemAvatar>
                    <Skeleton variant="circular" width={32} height={32} />
                </ListItemAvatar>
                <ListItemText
                    primary={<Skeleton variant="text" width="60%" height={20} />}
                    secondary={<Skeleton variant="text" width="80%" height={16} />}
                />
            </ListItem>
        ))}
    </List>
);

const PlayersOnline = ({ serverId, navigate }) => {
    const [onlinePlayers, setOnlinePlayers] = useState([]);
    const [onlinePlayersLoading, setOnlinePlayersLoading] = useState(true);
    const [onlinePlayersError, setOnlinePlayersError] = useState(null);
    const [onlinePage, setOnlinePage] = useState(1);

    const PLAYERS_PER_PAGE = 20;

    const fetchOnlinePlayers = async () => {
        try {
            setOnlinePlayersLoading(true);
            setOnlinePlayersError(null);
            const data = await fetchServerUrl(serverId, '/players/playing');
            setOnlinePlayers(data || []);
        } catch (error) {
            console.error('Error fetching online players:', error);
            setOnlinePlayersError(error.message);
        } finally {
            setOnlinePlayersLoading(false);
        }
    };

    const getPaginatedPlayers = () => {
        const startIndex = (onlinePage - 1) * PLAYERS_PER_PAGE;
        const endIndex = startIndex + PLAYERS_PER_PAGE;
        return onlinePlayers.slice(startIndex, endIndex);
    };

    const getTotalPages = () => {
        return Math.ceil(onlinePlayers.length / PLAYERS_PER_PAGE);
    };

    const getSessionDuration = (startedAt) => {
        const start = new Date(startedAt);
        const now = new Date();
        const diffMs = now - start;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (diffHours > 0) {
            return `${diffHours}h ${diffMinutes}m`;
        }
        return `${diffMinutes}m`;
    };

    useEffect(() => {
        fetchOnlinePlayers();
    }, [serverId]);

    return (
        <Card sx={{ mb: 3 }}>
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Circle sx={{ color: 'success.main' }} />
                <Typography variant="h6" fontWeight={600}>
                    Players Online ({onlinePlayers.length})
                </Typography>
            </Box>
            <Divider />
            {onlinePlayersLoading ? (
                <PlayerListSkeleton count={20} />
            ) : onlinePlayersError ? (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography color="error">Error loading online players: {onlinePlayersError}</Typography>
                </Box>
            ) : (
                <>
                    <List sx={{ p: 1 }}>
                        {getPaginatedPlayers().map((player) => (
                            <ListItem
                                key={player.session_id}
                                sx={{
                                    py: 0.5,
                                    cursor: 'pointer',
                                    borderRadius: 1,
                                    '&:hover': {
                                        bgcolor: 'action.hover',
                                        transform: 'translateY(-1px)',
                                        boxShadow: 1
                                    },
                                    transition: 'all 0.2s ease'
                                }}
                                onClick={() => navigate(`/${serverId}/players/${player.id}`)}
                            >
                                <ListItemAvatar>
                                    <Badge
                                        overlap="circular"
                                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                        badgeContent={
                                            <Circle
                                                sx={{
                                                    color: 'success.main',
                                                    fontSize: 10
                                                }}
                                            />
                                        }
                                    >
                                        <PlayerAvatar uuid={player.id} name={player.name} />
                                    </Badge>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Typography variant="body2" fontWeight={500}>
                                            {player.name}
                                        </Typography>
                                    }
                                    secondary={
                                        <Typography variant="caption" color="text.secondary">
                                            Playing for {getSessionDuration(player.started_at)}
                                        </Typography>
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>
                    {getTotalPages() > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                            <Pagination
                                count={getTotalPages()}
                                page={onlinePage}
                                onChange={(e, page) => setOnlinePage(page)}
                                color="primary"
                                size="small"
                            />
                        </Box>
                    )}
                </>
            )}
        </Card>
    );
};

export default PlayersOnline;