import { PlayerAvatar } from "./PlayerAvatar.jsx";
import dayjs from "dayjs";
import {fetchServerUrl, secondsToHours, secondsToMins, simpleRandom} from "../../utils.jsx";
import { Box, Badge, Skeleton, TableCell, TableRow, useTheme, Typography } from "@mui/material";
import { useNavigate } from "react-router";
import { ErrorBoundary } from "react-error-boundary";
import {useEffect, useState} from "react";

function PlayerInformation({ player, timeUnit = "h" }) {
    const navigate = useNavigate();
    const theme = useTheme();
    const isDarkMode = theme.palette.mode === 'dark';
    const [ playerStatus, setPlayerStatus ] = useState(null)

    useEffect(() => {
        fetchServerUrl(`/players/${player.id}/playing`)
            .then(setPlayerStatus)
    }, [player.id])

    // Define a more distinctive color palette
    const colors = {
        online: '#00c853',
        offline: isDarkMode ? '#78909c' : '#90a4ae',
        background: isDarkMode ? '#1e1e1e' : '#f5f5f5',
        hover: isDarkMode ? '#333' : '#e3f2fd',
        text: {
            primary: isDarkMode ? '#fff' : '#212121',
            secondary: isDarkMode ? '#b0bec5' : '#546e7a'
        }
    };

    let isOnline = playerStatus? playerStatus.ended_at == null: !!player.online_since;

    const timeTaken = {
        h: (value) => `${secondsToHours(value)}h`,
        m: (value) => `${secondsToMins(value)}m`
    };

    const playtime = timeTaken[timeUnit](player.total_playtime);


    let statusText = ''
    if (playerStatus){
        statusText = isOnline? `Playing since ${dayjs(playerStatus.started_at).fromNow()}`
            : `Last online ${dayjs(playerStatus.started_at).fromNow()} (${dayjs(playerStatus.ended_at).diff(dayjs(playerStatus.started_at), 'h', true).toFixed(2)}h)`
    }else{
        statusText = isOnline
            ? `Playing since ${dayjs(player.online_since).fromNow()}`
            : `Last online ${dayjs(player.last_played).fromNow()} (${secondsToHours(player.last_played_duration)}h)`;
    }

    return (
        <TableRow
            hover
            onClick={(e) => {
                e.preventDefault();
                navigate(`/players/${player.id}`);
            }}
            sx={{
                cursor: 'pointer',
                transition: 'all 0.15s ease-in-out',
                '&:hover': {
                    backgroundColor: colors.hover,
                },
                borderLeft: isOnline
                    ? `4px solid ${colors.online}`
                    : `4px solid transparent`,
            }}
        >
            <TableCell sx={{ py: 1.2, pl: 1.5 }}>
                <a
                    href={`/players/${player.id}`}
                    onClick={(e) => e.preventDefault()}
                    style={{ display: "none" }}
                >
                    {player.name}
                </a>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                    <PlayerAvatar uuid={player.id} name={player.name} />

                    <Box sx={{ ml: 2 }}>
                        <Typography
                            variant="body1"
                            sx={{
                                fontWeight: 600,
                                letterSpacing: '0.01em',
                                color: colors.text.primary,
                                mb: 0.5
                            }}
                        >
                            {player.name}
                        </Typography>
                        <Typography
                            variant="caption"
                            sx={{
                                color: isOnline ? colors.online : colors.offline,
                                fontSize: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5
                            }}
                        >
                            {isOnline && (
                                <Box
                                    component="span"
                                    sx={{
                                        display: 'inline-block',
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        backgroundColor: colors.online,
                                        animation: 'pulse 2s infinite',
                                        '@keyframes pulse': {
                                            '0%': { opacity: 0.6 },
                                            '50%': { opacity: 1 },
                                            '100%': { opacity: 0.6 }
                                        }
                                    }}
                                />
                            )}
                            {statusText}
                        </Typography>
                    </Box>
                </Box>
            </TableCell>
            <TableCell
                align="right"
                sx={{
                    py: 1.2,
                    pr: 3,
                    verticalAlign: 'middle'
                }}
            >
                <Box
                    sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: 1.5,
                        py: 0.75,
                        borderRadius: '4px',
                        backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)',
                        fontWeight: 500,
                        fontSize: '0.875rem',
                        color: colors.text.primary,
                        minWidth: '90px'
                    }}
                >
                    {playtime}
                </Box>
            </TableCell>
        </TableRow>
    );
}

function PlayerRowError() {
    const theme = useTheme();

    return (
        <TableRow>
            <TableCell colSpan={2} sx={{
                textAlign: 'center',
                py: 2,
                color: theme.palette.error.main,
            }}>
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    p: 1,
                    borderRadius: '4px',
                    backgroundColor: theme.palette.error.main + '15'
                }}>
                    <span role="img" aria-label="warning">⚠️</span>
                    <span>Unable to load player data</span>
                </Box>
            </TableCell>
        </TableRow>
    );
}

export function PlayerTableRowLoading() {
    const theme = useTheme();
    const isDarkMode = theme.palette.mode === 'dark';
    const skeletonColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
    const randomNameWidth = simpleRandom(80, 130);

    return (
        <TableRow>
            <TableCell sx={{ py: 1.2, pl: 1.5 }}>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Skeleton
                        variant="circular"
                        width={40}
                        height={40}
                        sx={{ bgcolor: skeletonColor }}
                    />
                    <Box sx={{ ml: 2 }}>
                        <Skeleton
                            variant="text"
                            width={randomNameWidth}
                            height={20}
                            sx={{ bgcolor: skeletonColor, mb: 0.7 }}
                        />
                        <Skeleton
                            variant="text"
                            width={160}
                            height={14}
                            sx={{ bgcolor: skeletonColor }}
                        />
                    </Box>
                </Box>
            </TableCell>
            <TableCell align="right" sx={{ py: 1.2, pr: 3 }}>
                <Skeleton
                    variant="rounded"
                    width={90}
                    height={32}
                    sx={{
                        bgcolor: skeletonColor,
                        borderRadius: '4px',
                        ml: 'auto'
                    }}
                />
            </TableCell>
        </TableRow>
    );
}

export default function PlayerTableRow({ player, timeUnit = "h" }) {
    return (
        <ErrorBoundary fallback={<PlayerRowError />}>
            <PlayerInformation player={player} timeUnit={timeUnit} />
        </ErrorBoundary>
    );
}