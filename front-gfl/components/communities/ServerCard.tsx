'use client';

import {Box, Button, Paper, Snackbar, Stack, Typography, useTheme} from "@mui/material";
import WifiIcon from "@mui/icons-material/Wifi";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import AnalyticsIcon from '@mui/icons-material/Analytics';
import {useState} from "react";
import Link from 'next/link'
const ServerCard = ({ server }) => {
    const [open, setOpen] = useState<boolean>(false);
    return (
        <>
        <Paper
            elevation={0}
            sx={{
                p: { xs: 1.5, sm: 2 },
                mb: 1,
                backdropFilter: 'blur(10px)',
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
                                <WifiIcon sx={{ fontSize: 16, flexShrink: 0 }} />
                            ) : (
                                <WifiOffIcon sx={{ fontSize: 16, flexShrink: 0 }} />
                            )}
                            <Typography
                                variant="body2"
                                fontWeight={500}
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
                        <Button
                            variant="outlined"
                            sx={{
                                fontSize: { xs: '0.65rem', sm: '0.7rem' },
                                fontFamily: 'monospace',
                                cursor: 'pointer',
                                padding: '2px 6px',
                                borderRadius: 1,
                                transition: 'all 0.2s ease',
                                alignSelf: 'flex-start',
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
                        </Button>
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