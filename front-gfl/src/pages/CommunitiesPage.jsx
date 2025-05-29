import { useContext, useState } from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Chip,
    Grid2 as Grid,
    Container,
    Avatar,
    Stack,
    Paper,
    Button,
    useTheme
} from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import GroupIcon from '@mui/icons-material/Group';
import CircleIcon from '@mui/icons-material/Circle';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

import ServerProvider from "../components/ui/ServerProvider.jsx";
import {getServerAvatarText} from "../components/ui/CommunitySelector.jsx";
import {useNavigate} from "react-router";

const ServerCard = ({ server, onServerClick }) => {
    const theme = useTheme();

    return (
        <Paper
            elevation={0}
            onClick={() => onServerClick(server.id)}
            sx={{
                p: { xs: 1.5, sm: 2 },
                mb: 1,
                cursor: 'pointer',
                backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 0, 0, 0.02)',
                backdropFilter: 'blur(10px)',
                border: `1px solid ${theme.palette.divider}`,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                    backgroundColor: theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(0, 0, 0, 0.04)',
                    transform: 'translateY(-1px)',
                },
            }}
        >
            <Stack spacing={1}>
                <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={2}
                >
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, flex: 1 }}>
                            {server.status ? (
                                <WifiIcon sx={{ fontSize: 16, color: theme.palette.success.main, flexShrink: 0 }} />
                            ) : (
                                <WifiOffIcon sx={{ fontSize: 16, color: theme.palette.error.main, flexShrink: 0 }} />
                            )}
                            <Typography
                                variant="body2"
                                fontWeight={500}
                                color={theme.palette.text.primary}
                                sx={{
                                    fontSize: { xs: '0.8rem', sm: '0.875rem' },
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    minWidth: 0,
                                }}
                            >
                                {server.name}
                            </Typography>
                        </Stack>

                        <Chip
                            label={server.status ? 'Online' : 'Offline'}
                            size="small"
                            sx={{
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                height: { xs: 20, sm: 24 },
                                color: server.status ? theme.palette.success.main : theme.palette.error.main,
                                borderColor: server.status
                                    ? theme.palette.success.main + '80'
                                    : theme.palette.error.main + '80',
                                backgroundColor: server.status
                                    ? theme.palette.success.main + '1A'
                                    : theme.palette.error.main + '1A',
                                flexShrink: 0,
                            }}
                            variant="outlined"
                        />
                    </Stack>

                    <Typography
                        variant="body2"
                        color={theme.palette.text.secondary}
                        sx={{
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                        }}
                    >
                        {server.players}/{server.max_players}
                    </Typography>
                </Stack>

                <Typography
                    variant="caption"
                    color={theme.palette.text.disabled}
                    sx={{
                        fontSize: { xs: '0.65rem', sm: '0.7rem' },
                        fontFamily: 'monospace',
                        cursor: 'pointer',
                        padding: '2px 6px',
                        borderRadius: 1,
                        backgroundColor: theme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.05)'
                            : 'rgba(0, 0, 0, 0.02)',
                        border: `1px solid ${theme.palette.divider}`,
                        transition: 'all 0.2s ease',
                        alignSelf: 'flex-start',
                        '&:hover': {
                            color: theme.palette.success.main,
                            backgroundColor: theme.palette.success.main + '1A',
                            borderColor: theme.palette.success.main + '4D',
                        },
                        userSelect: 'all',
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(server.fullIp);
                    }}
                    title={`Click to copy: ${server.fullIp}`}
                >
                    {server.fullIp}
                </Typography>
            </Stack>
        </Paper>
    );
};

const CommunityCard = ({ community, onServerClick, isExpanded, onToggleExpanded }) => {
    const theme = useTheme();
    const maxServersToShow = 3;
    const serversToDisplay = isExpanded
        ? community.servers
        : community.servers.slice(0, maxServersToShow);

    return (
        <Card
            elevation={0}
            sx={{
                background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)'
                    : 'linear-gradient(135deg, rgba(0, 0, 0, 0.02) 0%, rgba(0, 0, 0, 0.01) 100%)',
                backdropFilter: 'blur(20px)',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 3,
            }}
        >
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack spacing={{ xs: 2, sm: 3 }}>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        spacing={2}
                    >
                        <Avatar
                            sx={{
                                width: { xs: 40, sm: 48 },
                                height: { xs: 40, sm: 48 },
                                fontSize: { xs: '1rem', sm: '1.1rem' },
                                fontWeight: 'bold',
                                bgcolor: theme.palette.primary.main,
                                color: theme.palette.primary.contrastText,
                            }}
                        >
                            {getServerAvatarText(community.name)}
                        </Avatar>
                        <Box flex={1} sx={{ minWidth: 0 }}>
                            <Typography
                                variant="h6"
                                fontWeight={600}
                                color={theme.palette.text.primary}
                                sx={{
                                    textAlign: 'left',
                                    fontSize: { xs: '1rem', sm: '1.25rem' },
                                    wordBreak: 'break-word',
                                    lineHeight: 1.3,
                                }}
                            >
                                {community.name}
                            </Typography>
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                alignItems={{ xs: 'flex-start', sm: 'center' }}
                                justifyContent="space-between"
                                spacing={{ xs: 0.5, sm: 2 }}
                                sx={{ mt: 0.5 }}
                            >
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                    <GroupIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
                                    <Typography
                                        variant="body2"
                                        color={theme.palette.text.secondary}
                                        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                                    >
                                        {community.players.toLocaleString()} players
                                    </Typography>
                                </Stack>
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                    <CircleIcon
                                        sx={{
                                            fontSize: 8,
                                            color: community.status ? theme.palette.success.main : theme.palette.error.main,
                                        }}
                                    />
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: community.status ? theme.palette.success.main : theme.palette.error.main,
                                            fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                        }}
                                    >
                                        {community.status ? 'Online' : 'Offline'}
                                    </Typography>
                                </Stack>
                            </Stack>
                        </Box>
                    </Stack>

                    <Box>
                        <Typography
                            variant="subtitle2"
                            sx={{
                                mb: 1,
                                color: theme.palette.text.secondary,
                                fontWeight: 500,
                                fontSize: { xs: '0.8rem', sm: '0.875rem' },
                            }}
                        >
                            Servers
                        </Typography>
                        {serversToDisplay.map(server => (
                            <ServerCard
                                key={server.id}
                                server={server}
                                onServerClick={onServerClick}
                            />
                        ))}

                        {community.servers.length > maxServersToShow && (
                            <Button
                                size="small"
                                onClick={onToggleExpanded}
                                startIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                sx={{
                                    mt: 1,
                                    color: theme.palette.primary.main,
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    '&:hover': {
                                        backgroundColor: theme.palette.primary.main + '1A',
                                    },
                                }}
                            >
                                {isExpanded
                                    ? 'Show Less'
                                    : `Show ${community.servers.length - maxServersToShow} More`
                                }
                            </Button>
                        )}
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default function CommunitiesPage() {
    const communities = useContext(ServerProvider);
    const navigate = useNavigate();
    const theme = useTheme();
    const [expandedCommunities, setExpandedCommunities] = useState(new Set());

    const handleServerClick = (serverId) => {
        navigate(`/${serverId}/`)
    };

    const handleToggleExpanded = (communityId) => {
        const newExpanded = new Set(expandedCommunities);
        if (expandedCommunities.has(communityId)) {
            newExpanded.delete(communityId);
        } else {
            newExpanded.add(communityId);
        }
        setExpandedCommunities(newExpanded);
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, #1a1a1a 0%, #2d1b69 100%)'
                    : 'linear-gradient(135deg, #f5f5f5 0%, #e3f2fd 100%)',
                py: { xs: 2, sm: 4 },
            }}
        >
            <Container maxWidth="lg" sx={{ px: { xs: 1, sm: 3 } }}>
                <Stack spacing={{ xs: 3, sm: 4 }}>
                    <Box textAlign="center" sx={{ px: { xs: 1, sm: 0 } }}>
                        <Typography
                            variant="h2"
                            component="h1"
                            fontWeight={700}
                            sx={{
                                background: theme.palette.mode === 'dark'
                                    ? 'linear-gradient(45deg, #2196F3 30%, #9C27B0 90%)'
                                    : 'linear-gradient(45deg, #1976d2 30%, #7b1fa2 90%)',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                mb: 2,
                                fontSize: { xs: '2rem', sm: '2.5rem', md: '3.5rem' },
                                wordBreak: 'break-word',
                            }}
                        >
                            Communities
                        </Typography>
                        <Typography
                            variant="h6"
                            color={theme.palette.text.secondary}
                            sx={{
                                fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' },
                                wordBreak: 'break-word',
                            }}
                        >
                            CS2 Zombie Escape communities that I track &gt;:3
                        </Typography>
                    </Box>

                    <Grid container spacing={{ xs: 2, sm: 3 }}>
                        {communities.map(community => (
                            <Grid size={{xs: 12, md: 6}} key={community.id}>
                                <CommunityCard
                                    community={community}
                                    onServerClick={handleServerClick}
                                    isExpanded={expandedCommunities.has(community.id)}
                                    onToggleExpanded={() => handleToggleExpanded(community.id)}
                                />
                            </Grid>
                        ))}
                    </Grid>

                    {communities.length === 0 && (
                        <Box textAlign="center" py={8}>
                            <SportsEsportsIcon
                                sx={{
                                    fontSize: { xs: 48, sm: 64 },
                                    color: theme.palette.text.disabled,
                                    mb: 2,
                                }}
                            />
                            <Typography
                                variant="h5"
                                color={theme.palette.text.secondary}
                                gutterBottom
                                sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}
                            >
                                No communities found
                            </Typography>
                            <Typography
                                variant="body1"
                                color={theme.palette.text.disabled}
                                sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}
                            >
                                Looks like all the gamers are taking a break! 🎮
                            </Typography>
                        </Box>
                    )}
                </Stack>
            </Container>
        </Box>
    );
}