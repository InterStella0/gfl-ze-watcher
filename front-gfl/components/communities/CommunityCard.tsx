'use client';

import {Avatar, Box, Button, Card, CardContent, Stack, Typography, useTheme} from "@mui/material";
import CircleIcon from "@mui/icons-material/Circle";
import GroupIcon from "@mui/icons-material/Group";
import ServerCard from "./ServerCard";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {getServerAvatarText} from "../ui/CommunitySelector";
import {useState} from "react";
import {useRouter} from "next/navigation";

const CommunityCard = ({ community }) => {
    const theme = useTheme();
    const [ isExpanded, setExpanded ] = useState(false);
    const maxServersToShow = 3;
    const serversToDisplay = isExpanded
        ? community.servers
        : community.servers.slice(0, maxServersToShow);
    const onToggleExpanded = () => setExpanded(e => !e)
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
                            src={community.icon_url}
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
export default CommunityCard;