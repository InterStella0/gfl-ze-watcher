'use client';

import {
    Avatar,
    Box,
    Card,
    CardContent,
    Stack,
    Typography,
    Switch,
    FormControlLabel,
    Skeleton,
    Divider
} from "@mui/material";
import { Community, Server } from "types/community";
import { getServerAvatarText } from "../ui/CommunitySelector";
import { useEffect, useState } from "react";
import {fetchServerUrl, secondsToHours, APIError, fetchApiServerUrl} from "utils/generalUtils";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import StarIcon from "@mui/icons-material/Star";
import Link from "next/link";
import {UserAnonymization} from "components/users/UserCommunityConnections.tsx";

interface CommunityConnectionCardProps {
    community: Community;
    userId: string;
    settings: UserAnonymization | null;
    onToggleAnonymize: (communityId: string | number, type: "location" | "anonymous", value: boolean, settings: UserAnonymization) => void;
    showAnonymizeToggle?: boolean;
}

interface ServerPlayerData {
    serverId: string;
    serverName: string;
    totalPlaytime: number;
    favoriteMap: string | null;
    loading: boolean;
    error: boolean;
}

export default function CommunityConnectionCard({
    community,
    userId,
    settings,
    onToggleAnonymize,
    showAnonymizeToggle = false,
}: CommunityConnectionCardProps) {
    const [serverData, setServerData] = useState<ServerPlayerData[]>([]);
    const [totalPlaytime, setTotalPlaytime] = useState<number>(0);

    useEffect(() => {
        async function fetchServerData(server: Server) {
            try {
                const fetchOptions: any = { next: { revalidate: 300 } };

                const playerData = await fetchApiServerUrl(
                    server.id,
                    `/players/${userId}/detail`,
                    fetchOptions,
                    false
                );

                let favoriteMap: string | null = null;
                try {
                    const maps = await fetchApiServerUrl(
                        server.id,
                        `/players/${userId}/most_played_maps`,
                        { ...fetchOptions, params: { limit: 1 } },
                        false
                    );
                    if (maps && maps.length > 0) {
                        favoriteMap = maps[0].map;
                    }
                } catch (e) {
                }

                return {
                    serverId: server.id,
                    serverName: server.name,
                    totalPlaytime: playerData.total_playtime || 0,
                    favoriteMap,
                    loading: false,
                    error: false
                };
            } catch (error) {
                if (error instanceof APIError && error.code === 404) {
                    // Player not found on this server
                    return {
                        serverId: server.id,
                        serverName: server.name,
                        totalPlaytime: 0,
                        favoriteMap: null,
                        loading: false,
                        error: false
                    };
                }
                return {
                    serverId: server.id,
                    serverName: server.name,
                    totalPlaytime: 0,
                    favoriteMap: null,
                    loading: false,
                    error: true
                };
            }
        }

        // Initialize loading states
        setServerData(
            community.servers.map(server => ({
                serverId: server.id,
                serverName: server.name,
                totalPlaytime: 0,
                favoriteMap: null,
                loading: true,
                error: false
            }))
        );

        // Fetch data for all servers
        Promise.all(community.servers.map(server => fetchServerData(server)))
            .then(results => {
                setServerData(results);
                const total = results.reduce((sum, data) => sum + data.totalPlaytime, 0);
                setTotalPlaytime(total);
            });
    }, [community.servers, userId]);

    const hasAnyPlaytime = totalPlaytime > 0;

    return (
        <Card
            elevation={1}
            sx={{
                backdropFilter: 'blur(20px)',
                borderRadius: 3,
            }}
        >
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack spacing={2}>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        justifyContent="space-between"
                        spacing={2}
                    >
                        <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar
                                sx={{
                                    width: { xs: 40, sm: 48 },
                                    height: { xs: 40, sm: 48 },
                                    fontSize: { xs: '1rem', sm: '1.1rem' },
                                    fontWeight: 'bold',
                                }}
                                src={community.icon_url}
                                title={community.name}
                            >
                                {getServerAvatarText(community.name)}
                            </Avatar>
                            <Box flex={1} sx={{ minWidth: 0 }}>
                                <Typography
                                    variant="h6"
                                    fontWeight={600}
                                    sx={{
                                        fontSize: { xs: '1rem', sm: '1.25rem' },
                                        wordBreak: 'break-word',
                                    }}
                                >
                                    {community.name}
                                </Typography>
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={1}
                                    sx={{ mt: 0.5 }}
                                >
                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                        <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                        <Typography variant="body2" color="text.secondary">
                                            {serverData.some(d => d.loading) ? (
                                                <Skeleton width={60} />
                                            ) : (
                                                `${secondsToHours(totalPlaytime)} hrs`
                                            )}
                                        </Typography>
                                    </Stack>
                                </Stack>
                            </Box>
                        </Stack>

                        {showAnonymizeToggle && hasAnyPlaytime && (
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings?.hide_location ?? false}
                                        onChange={(e) => onToggleAnonymize(
                                            community.id, "location", e.target.checked, settings
                                        )}
                                        size="small"
                                        slotProps={{ input: { 'aria-label': 'controlled' } }}
                                    />
                                }
                                label={
                                    <Typography variant="body2" color="text.secondary">
                                        Hide Radar Location
                                    </Typography>
                                }
                            />
                        )}

                        {showAnonymizeToggle && hasAnyPlaytime && (
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={settings?.anonymized ?? false}
                                        onChange={(e) => onToggleAnonymize(
                                            community.id, "anonymous", e.target.checked, settings
                                        )}
                                        size="small"
                                        slotProps={{ input: { 'aria-label': 'controlled' } }}
                                    />
                                }
                                label={
                                    <Typography variant="body2" color="text.secondary">
                                        Anonymize
                                    </Typography>
                                }
                            />
                        )}
                    </Stack>

                    <Divider />

                    {/* Server Details */}
                    <Stack spacing={1.5}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                            Servers
                        </Typography>
                        {serverData.map((data) => (
                            <Box
                                key={data.serverId}
                                sx={{
                                    pl: 2,
                                    borderLeft: '2px solid',
                                    borderColor: 'divider',
                                    transition: 'all 0.2s ease',
                                    '&:hover': data.totalPlaytime > 0 ? {
                                        borderLeftColor: 'primary.main',
                                        transform: 'translateX(4px)',
                                    } : {},
                                    borderRadius: 1,
                                    p: 1,
                                    ml: -1,
                                }}
                            >
                                <Stack spacing={0.5}>
                                    {data.totalPlaytime > 0 ? <Typography variant="body2" fontWeight={500} component={Link} href={`/servers/${data.serverId}/players/${userId}`} >
                                        {data.serverName}
                                    </Typography>: <Typography variant="body2" fontWeight={500}>
                                        {data.serverName}
                                    </Typography>}

                                    <Stack direction="row" spacing={2} flexWrap="wrap">
                                        {data.loading ? (
                                            <>
                                                <Skeleton width={80} />
                                                <Skeleton width={100} />
                                            </>
                                        ) : data.totalPlaytime > 0 ? (
                                            <>
                                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                                    <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                    <Typography variant="caption" color="text.secondary">
                                                        {secondsToHours(data.totalPlaytime)} hrs
                                                    </Typography>
                                                </Stack>
                                                {data.favoriteMap && (
                                                    <Stack direction="row" alignItems="center" spacing={0.5}>
                                                        <StarIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                                                        <Typography variant="caption" color="text.secondary">
                                                            {data.favoriteMap}
                                                        </Typography>
                                                    </Stack>
                                                )}
                                            </>
                                        ) : (
                                            <Typography variant="caption" color="text.disabled">
                                                No playtime
                                            </Typography>
                                        )}
                                    </Stack>
                                </Stack>
                            </Box>
                        ))}
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    );
}
