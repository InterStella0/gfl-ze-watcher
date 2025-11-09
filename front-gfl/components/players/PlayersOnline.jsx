import { useState, useEffect, useMemo } from 'react';
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
    Skeleton,
    TextField,
    InputAdornment, IconButton, Tooltip
} from '@mui/material';
import VideogameAssetIcon from '@mui/icons-material/VideogameAsset';
import InfoIcon from '@mui/icons-material/Info';
import { Circle, Search } from '@mui/icons-material';
import { fetchServerUrl } from "../../utils/generalUtils.ts";
import { PlayerAvatar } from "./PlayerAvatar.tsx";
import dayjs from "dayjs";


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
    const [searchQuery, setSearchQuery] = useState('');

    const PLAYERS_PER_PAGE = 20;

    const filteredPlayers = useMemo(() => {
        if (!searchQuery.trim()) return onlinePlayers;
        return onlinePlayers.filter(player =>
            player.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [onlinePlayers, searchQuery]);

    const getPaginatedPlayers = () => {
        const startIndex = (onlinePage - 1) * PLAYERS_PER_PAGE;
        const endIndex = startIndex + PLAYERS_PER_PAGE;
        return filteredPlayers.slice(startIndex, endIndex);
    };

    const getTotalPages = () => {
        return Math.ceil(filteredPlayers.length / PLAYERS_PER_PAGE);
    };

    const getSessionDuration = (startedAt) => {
        let delta = dayjs(dayjs()).diff(startedAt, "second");
        delta = dayjs.duration(delta, "seconds");
        const hours = delta.hours();
        const minutes = delta.minutes();

        if (hours > 0)
            return `${hours}h ${minutes}m`;

        return `${minutes}m`;
    };

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
        setOnlinePage(1);
    };

    useEffect(() => {
        setOnlinePlayersLoading(true);
        setOnlinePlayersError(null);
        fetchServerUrl(serverId, '/players/playing')
            .then(data => setOnlinePlayers(data || []))
            .catch(error => {
                console.error('Error fetching online players:', error);
                setOnlinePlayersError(error.message);
            })
            .finally(() => setOnlinePlayersLoading(false))
    }, [serverId]);

    return (
        <Card sx={{ mb: 3 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <VideogameAssetIcon color="primary" />
                    <Typography variant="h6" fontWeight={600}>
                        Players Online ({onlinePlayers.length})
                    </Typography>
                </Box>
                <Box sx={{ mx: "1rem"}}>
                    <Tooltip title="Players who leave take 3 minutes to be registered as offline, which can cause the server's maximum player count to be exceeded.">
                        <IconButton><InfoIcon /></IconButton>
                    </Tooltip>
                </Box>
            </Box>
            <Box sx={{ px: 2, pb: 2 }}>
                <TextField
                    fullWidth
                    size="small"
                    placeholder="Search players..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    props={{
                        input:{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search sx={{ color: 'text.secondary' }} />
                                </InputAdornment>
                            ),
                    }}}
                />
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
                    {filteredPlayers.length === 0 && searchQuery.trim() ? (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <Typography color="text.secondary">
                                No player name &#34;{searchQuery}&#34;
                            </Typography>
                        </Box>
                    ) : (
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
                    )}
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