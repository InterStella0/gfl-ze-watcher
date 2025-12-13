'use client'
import ErrorCatch from "../ui/ErrorMessage.tsx";
import { Box, Typography, Tooltip, useTheme, Skeleton, useMediaQuery } from "@mui/material";
import {Grid2 as Grid} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import StarIcon from "@mui/icons-material/Star";
import Paper from "@mui/material/Paper";
import WarningIcon from "@mui/icons-material/Warning";
import SaveIcon from '@mui/icons-material/Save';
import HourglassFullIcon from '@mui/icons-material/HourglassFull';
import {useMapContext} from "../../app/servers/[server_slug]/maps/[map_name]/MapContext";
import {ReactElement} from "react";

function StatCard(
    { title, value, description, icon, colorKey, loading = false, notReady = false, href = null }
    : {title: string, value: any, description: string, icon?: ReactElement, colorKey?: string, loading?: boolean,
        href?: string | null, notReady?: boolean}
) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const colorMap = {
        purple: {
            text: isDark ? '#b878e6' : '#7e3ba3',
        },
        red: {
            text: isDark ? '#f05656' : '#d32f2f',
        },
        blue: {
            text: isDark ? '#4fafde' : '#0277bd',
        },
        green: {
            text: isDark ? '#85de76' : '#388e3c',
        }
    };

    const colors = colorMap[colorKey] || colorMap.purple;

    // Mobile compact layout
    if (isMobile) {
        return (
            <Paper elevation={0}>
                <Box
                    sx={{
                        width: '100%',
                        p: 1.5,
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ color: colors.text }}>
                            {icon}
                        </Box>
                        <Box>
                            <Typography
                                variant="caption"
                                sx={{
                                    fontSize: '0.7rem',
                                    fontWeight: 500,
                                    color: isDark ? 'white' : theme.palette.text.primary,
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                {title}
                                {notReady?  <Tooltip title="Still calculating, data is not ready. Come back later~">
                                    <Box display="flex" flexDirection="row" alignItems="center"  sx={{
                                        color: theme => theme.palette.error.main
                                    }} gap=".3rem">
                                        <WarningIcon sx={{fontSize: '0.9rem'}}/>
                                    </Box>
                                </Tooltip>: <Tooltip title={description}>
                                    <InfoIcon sx={{
                                        fontSize: '0.7rem',
                                        color: isDark ? 'white' : theme.palette.text.secondary,
                                        opacity: 0.7,
                                        ml: 0.5
                                    }} />
                                </Tooltip>}
                            </Typography>

                            {loading ? (
                                <Skeleton
                                    variant="text"
                                    sx={{
                                        fontSize: '1.2rem',
                                        width: '60px',
                                        height: '25px'
                                    }}
                                />
                            ) : (
                                <Typography
                                    sx={{
                                        fontSize: '1.3rem',
                                        lineHeight: 1.2,
                                        fontWeight: 700,
                                        color: colors.text,
                                    }}
                                >
                                    {value}
                                </Typography>
                            )}
                        </Box>
                    </Box>
                </Box>
            </Paper>
        );
    }

    return (
        <Paper elevation={0}>
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Box sx={{ color: colors.text }}>
                            {icon}
                        </Box>
                        <Typography
                            variant="body2"
                            sx={{
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                color: isDark ? 'white' : theme.palette.text.primary
                            }}
                        >
                            {title}
                        </Typography>
                    </Box>
                    {notReady? <Tooltip title="Still calculating, data is not ready. Come back later~">
                        <Box display="flex" flexDirection="row" alignItems="center"  sx={{
                            color: theme => theme.palette.error.main
                        }} gap=".3rem">
                            <WarningIcon sx={{fontSize: '0.9rem'}}/>
                        </Box>
                    </Tooltip>: <Tooltip title={description}>
                        <InfoIcon sx={{
                            fontSize: '0.9rem',
                            color: isDark ? 'white' : theme.palette.text.secondary,
                            opacity: 0.7
                        }} />
                    </Tooltip>
                    }

                </Box>

                {loading ? (
                    <Skeleton
                        variant="text"
                        sx={{
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            width: '80%'
                        }}
                    />
                ) : (href? <a href={href} target="_blank" rel="noopener noreferrer" style={{
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            color: colors.text,
                            marginTop: 0.5
                        }}>
                            {value}
                        </a>:
                    <Typography
                        sx={{
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            color: colors.text,
                            mt: 0.5
                        }}
                    >
                        {value}
                    </Typography>
                )}
            </Box>
        </Paper>
    );
}
function formatBytes(bytes: number, decimals: number = 2): string{
    if (bytes === 0) return '0 B';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;

    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));

    return `${size} ${sizes[i]}`;
}

function MapStats() {
    const { analyze, info, notReady } = useMapContext();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isStatLoading = !analyze
    const isMetaLoading = !info
    const stats = [
        {
            id: "avg_players",
            title: "Avg Players",
            value: analyze?.avg_players_per_session,
            loading: isStatLoading,
            notReady: notReady,
            description: "Average number of players per session",
            icon: <PeopleAltIcon sx={{ fontSize: isMobile ? '0.9rem' : '1.1rem' }} />,
            colorKey: "purple",
        },
        {
            id: "dropoff_rate",
            title: "Drop-off Rate",
            loading: isStatLoading,
            notReady: notReady,
            value: analyze ? `${(analyze.dropoff_rate * 100).toFixed(2)}%` : null,
            description: "Percentage of players quit after 5 minutes",
            icon: <ExitToAppIcon sx={{ fontSize: isMobile ? '0.9rem' : '1.1rem' }} />,
            colorKey: "red",
        },
        {
            id: "avg_playtime",
            title: "Avg Playtime",
            loading: isStatLoading,
            notReady: notReady,
            value: analyze ? `${(analyze.avg_playtime_before_quitting / 60).toFixed(0)}m` : null,
            description: "How long each player spent on average on this map",
            icon: <AccessTimeIcon sx={{ fontSize: isMobile ? '0.9rem' : '1.1rem' }} />,
            colorKey: "blue",
        },
        {
            id: "cumulative hours",
            title: "Player Cum. Hours",
            loading: isStatLoading,
            notReady: notReady,
            value: analyze? `${(analyze.cum_player_hours / 60 / 60).toFixed(1)}m`: 'N/A',
            description: "Aggregation of cumulative hours per session for all players",
            icon: <HourglassFullIcon sx={{ fontSize: isMobile ? '0.9rem' : '1.1rem' }} />,
            colorKey: "green",
        },
        {
            id: "creator",
            title: "Creators",
            loading: isMetaLoading,
            value: info?.creators || "Unknown",
            description: "Made by these people. Source: s2ze.com",
            icon: <StarIcon sx={{ fontSize: isMobile ? '0.9rem' : '1.1rem' }} />,
            colorKey: "purple",
            href: info?.workshop_id? `https://steamcommunity.com/sharedfiles/filedetails/?id=${info?.workshop_id}`: null
        },
        {
            id: "file_size",
            title: "File Size",
            loading: isMetaLoading,
            value: formatBytes(info?.file_bytes || 0),
            description: "File size for the map. Source: s2ze.com",
            icon: <SaveIcon sx={{ fontSize: isMobile ? '0.9rem' : '1.1rem' }} />,
            colorKey: "blue",
        },
    ];

    return (
        <Box sx={{
            width: '100%',
            px: isMobile ? 0.75 : { xs: 1, sm: 2 },
            py: isMobile ? 1 : 2
        }}>
            <Grid container spacing={isMobile ? 1 : 2}>
                {stats.map((stat) => (
                    <Grid size={isMobile ?
                        {xs: 6}:
                        {sm: 6, md: 3, lg: 6, xl: 6}
                    } key={stat.id}>
                        <StatCard
                            title={stat.title}
                            value={stat.value}
                            description={stat.description}
                            icon={stat.icon}
                            colorKey={stat.colorKey}
                            loading={stat.loading}
                            notReady={stat.notReady}
                            href={stat.href}
                        />
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}

export default function MapAnalyzeAttributes() {
    return (
        <ErrorCatch message="Couldn't show map stats">
            <MapStats />
        </ErrorCatch>
    );
}