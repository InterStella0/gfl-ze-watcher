'use client';

import {Box, Button, Chip, IconButton, Paper, Stack, Typography, useTheme} from "@mui/material";
import WifiIcon from "@mui/icons-material/Wifi";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import Link from "@mui/material/Link";
import AnalyticsIcon from '@mui/icons-material/Analytics';
const ServerCard = ({ server }) => {
    const theme = useTheme();

    return (
        <Paper
            elevation={0}
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
                <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, flex: 1 }}>
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
                    <Box>
                        <Button component={Link} variant="outlined"
                                color="secondary"
                                startIcon={<AnalyticsIcon />}
                                    href={`/servers/${server.gotoLink}`}>
                            Insights
                        </Button>
                    </Box>
                </Stack>
            </Stack>
        </Paper>
    );
};
export default ServerCard;