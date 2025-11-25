'use client';

import {Box, Button, Paper, Snackbar, Stack, Typography, useTheme} from "@mui/material";
import WifiIcon from "@mui/icons-material/Wifi";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import AnalyticsIcon from '@mui/icons-material/Analytics';
import {useState} from "react";
import Link from 'next/link'
const ServerCard = ({ server }) => {
    const theme = useTheme();
    const [open, setOpen] = useState<boolean>(false);
    return (
        <>
        <Paper
            elevation={0}
            sx={{
                p: { xs: 1.5, sm: 2 },
                mb: 1,
                backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 0, 0, 0.02)',
                backdropFilter: 'blur(10px)',
                border: `1px solid ${theme.palette.divider}`,
                transition: 'all 0.2s ease-in-out',
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
                        <Stack direction="row" alignItems="center" spacing={1} sx={{  gap: 1,  minWidth: 0 }}>
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
                                setOpen(true)
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
        <Snackbar
            open={open}
            autoHideDuration={2000}
            onClose={() => setOpen(false)}
            message="Copied to clipboard"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        />
        </>
    );
};
export default ServerCard;