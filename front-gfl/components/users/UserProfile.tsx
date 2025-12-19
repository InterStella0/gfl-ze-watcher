'use client';

import { Box, Card, CardContent, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import { DiscordUser } from "types/users";
import SteamIcon from "../ui/SteamIcon";
import { UserAvatar } from "./UserAvatar";
import { use } from "react";

interface UserProfileProps {
    userPromise: Promise<{
        user: DiscordUser;
        userId?: string;
    }>;
}

export default function UserProfile({ userPromise }: UserProfileProps) {
    const { user, userId } = use(userPromise);

    // Determine if this is a Steam ID (numeric only)
    const isSteamId = userId && /^\d+$/.test(userId);

    return (
        <Paper elevation={0} sx={{ width: "100%" }}>
            <Card
                elevation={1}
                sx={{
                    backdropFilter: 'blur(20px)',
                    borderRadius: 3,
                }}
            >
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        alignItems={{ xs: 'center', sm: 'flex-start' }}
                        spacing={3}
                    >
                        <Box
                            sx={{
                                position: 'relative',
                            }}
                        >
                            <UserAvatar
                                userId={userId}
                                name={user?.global_name || 'Unknown User'}
                                avatarUrl={user?.avatar}
                                width={120}
                                height={120}
                            />
                        </Box>

                        <Box
                            sx={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: { xs: 'center', sm: 'flex-start' },
                                textAlign: { xs: 'center', sm: 'left' },
                                justifyContent: 'space-between',
                                minHeight: { sm: 120 },
                            }}
                        >
                            <Box>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        mb: 1,
                                        justifyContent: { xs: 'center', sm: 'flex-start' },
                                        gap: 1,
                                    }}
                                >
                                    <Typography
                                        variant="h4"
                                        component="h1"
                                        sx={{
                                            fontWeight: 600,
                                            color: 'text.primary',
                                        }}
                                    >
                                        {user?.global_name || 'Unknown User'}
                                    </Typography>
                                    {isSteamId && (
                                        <Tooltip title="View Steam Profile">
                                            <IconButton
                                                size="small"
                                                component="a"
                                                href={`https://steamcommunity.com/profiles/${userId}`}
                                                target="_blank"
                                                sx={{
                                                    color: 'text.secondary',
                                                    p: 0.5
                                                }}
                                            >
                                                <SteamIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </Box>

                                {userId && (
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            mb: 0.5,
                                            color: 'text.secondary',
                                            fontSize: '0.875rem',
                                        }}
                                    >
                                        User ID: {userId}
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    </Stack>
                </CardContent>
            </Card>
        </Paper>
    );
}
