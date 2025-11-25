'use client';

import {Avatar, Box, Button, Card, CardContent, Stack, Typography} from "@mui/material";
import CircleIcon from "@mui/icons-material/Circle";
import GroupIcon from "@mui/icons-material/Group";
import ServerCard from "./ServerCard";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {getServerAvatarText} from "../ui/CommunitySelector";
import {useState} from "react";

const CommunityCard = ({ community }) => {
    const [ isExpanded, setExpanded ] = useState(false);
    const maxServersToShow = 3;
    const serversToDisplay = isExpanded
        ? community.servers
        : community.servers.slice(0, maxServersToShow);
    const onToggleExpanded = () => setExpanded(e => !e)
    return (
        <Card
            elevation={1}
            sx={{
                backdropFilter: 'blur(20px)',
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
                            }}
                            src={community.icon_url}
                        >
                            {getServerAvatarText(community.name)}
                        </Avatar>
                        <Box flex={1} sx={{ minWidth: 0 }}>
                            <Typography
                                variant="h6"
                                fontWeight={600}
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
                                    <GroupIcon sx={{ fontSize: 16 }} />
                                    <Typography
                                        variant="body2"
                                        sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
                                    >
                                        {community.players.toLocaleString()} players
                                    </Typography>
                                </Stack>
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                    <CircleIcon
                                        sx={{
                                            fontSize: 8,
                                        }}
                                    />
                                    <Typography
                                        variant="caption"
                                        sx={{
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
                                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                    textTransform: 'none',
                                    fontWeight: 500,
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