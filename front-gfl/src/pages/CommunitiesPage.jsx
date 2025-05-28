import { useContext } from 'react';
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
    Paper
} from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import GroupIcon from '@mui/icons-material/Group';
import CircleIcon from '@mui/icons-material/Circle';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';

import ServerProvider from "../components/ui/ServerProvider.jsx";
import {getServerAvatarText} from "../components/ui/CommunitySelector.jsx";
import {useNavigate} from "react-router";


const ServerCard = ({ server, onServerClick }) => (
    <Paper
        elevation={0}
        onClick={() => onServerClick(server.id)}
        sx={{
            p: { xs: 1.5, sm: 2 },
            mb: 1,
            cursor: 'pointer',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
                            <WifiIcon sx={{ fontSize: 16, color: '#4CAF50', flexShrink: 0 }} />
                        ) : (
                            <WifiOffIcon sx={{ fontSize: 16, color: '#f44336', flexShrink: 0 }} />
                        )}
                        <Typography
                            variant="body2"
                            fontWeight={500}
                            color="white"
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
                            color: server.status ? '#4CAF50' : '#f44336',
                            borderColor: server.status ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)',
                            backgroundColor: server.status ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                            flexShrink: 0,
                        }}
                        variant="outlined"
                    />
                </Stack>

                <Typography
                    variant="body2"
                    color="rgba(255, 255, 255, 0.7)"
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
                color="rgba(255, 255, 255, 0.5)"
                sx={{
                    fontSize: { xs: '0.65rem', sm: '0.7rem' },
                    fontFamily: 'monospace',
                    cursor: 'pointer',
                    padding: '2px 6px',
                    borderRadius: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.2s ease',
                    alignSelf: 'flex-start',
                    '&:hover': {
                        color: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        borderColor: 'rgba(76, 175, 80, 0.3)',
                    },
                    userSelect: 'all',
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(`connect ${server.fullIp}`);
                }}
                title={`Click to copy: connect ${server.fullIp}`}
            >
                {server.fullIp}
            </Typography>
        </Stack>
    </Paper>
);

const CommunityCard = ({ community, onServerClick }) => (
    <Card
        elevation={0}
        sx={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 3,
            height: '100%',
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
                        }}
                    >
                        {getServerAvatarText(community.name)}
                    </Avatar>
                    <Box flex={1} sx={{ minWidth: 0 }}>
                        <Typography
                            variant="h6"
                            fontWeight={600}
                            color="white"
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
                                <GroupIcon sx={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.7)' }} />
                                <Typography
                                    variant="body2"
                                    color="rgba(255, 255, 255, 0.7)"
                                    sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                                >
                                    {community.players.toLocaleString()} players
                                </Typography>
                            </Stack>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                <CircleIcon
                                    sx={{
                                        fontSize: 8,
                                        color: community.status ? '#4CAF50' : '#f44336',
                                    }}
                                />
                                <Typography
                                    variant="caption"
                                    sx={{
                                        color: community.status ? '#4CAF50' : '#f44336',
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
                            color: 'rgba(255, 255, 255, 0.7)',
                            fontWeight: 500,
                            fontSize: { xs: '0.8rem', sm: '0.875rem' },
                        }}
                    >
                        Servers
                    </Typography>
                    {community.servers.map(server => (
                        <ServerCard
                            key={server.id}
                            server={server}
                            onServerClick={onServerClick}
                        />
                    ))}
                </Box>
            </Stack>
        </CardContent>
    </Card>
);

export default function CommunitiesPage() {
    const communities = useContext(ServerProvider);
    const navigate = useNavigate()

    const handleServerClick = (serverId) => {
        navigate(`/${serverId}/`)
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1b69 100%)',
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
                                background: 'linear-gradient(45deg, #2196F3 30%, #9C27B0 90%)',
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
                            color="rgba(255, 255, 255, 0.7)"
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
                                />
                            </Grid>
                        ))}
                    </Grid>

                    {communities.length === 0 && (
                        <Box textAlign="center" py={8}>
                            <SportsEsportsIcon
                                sx={{
                                    fontSize: { xs: 48, sm: 64 },
                                    color: 'rgba(255, 255, 255, 0.5)',
                                    mb: 2,
                                }}
                            />
                            <Typography
                                variant="h5"
                                color="rgba(255, 255, 255, 0.7)"
                                gutterBottom
                                sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}
                            >
                                No communities found
                            </Typography>
                            <Typography
                                variant="body1"
                                color="rgba(255, 255, 255, 0.5)"
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