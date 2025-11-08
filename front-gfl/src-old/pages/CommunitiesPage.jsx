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

import ServerProvider from "../../components/ui/ServerProvider.tsx";
import {useNavigate} from "react-router";

export default function CommunitiesPage() {
    const {communities} = useContext(ServerProvider);
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