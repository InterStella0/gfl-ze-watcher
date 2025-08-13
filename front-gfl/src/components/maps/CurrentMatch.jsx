import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Chip,
    useTheme,
    useMediaQuery,
    CardMedia,
    Skeleton,
    Tooltip,
    Stack
} from '@mui/material';
import { fetchServerUrl, getMapImage } from "../../utils/generalUtils.jsx";
import {useParams} from "react-router";

dayjs.extend(duration);

const CurrentMatch = () => {
    const { server_id } = useParams();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [currentMatch, setCurrentMatch] = useState(null);
    const [mapImage, setMapImage] = useState(null);
    const [currentTime, setCurrentTime] = useState(dayjs());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(dayjs());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!server_id) return;

        const loadCurrentMatch = async () => {
            try {
                const matchData = await fetchServerUrl(server_id, '/match-now');
                setCurrentMatch(matchData);

                // Load image for current match map
                if (matchData?.map) {
                    const image = await getMapImage(server_id, matchData.map);
                    setMapImage(image?.large || null);
                }
            } catch (err) {
                console.error('Failed to load current match:', err);
                setCurrentMatch(null);
            }
        };

        loadCurrentMatch();

        // Refresh current match every 30 seconds
        const interval = setInterval(loadCurrentMatch, 65000);
        return () => clearInterval(interval);
    }, [server_id]);

    const formatMatchDuration = (startedAt) => {
        if (!startedAt) return 'Unknown';

        const started = dayjs(startedAt);
        const diff = currentTime.diff(started);
        const dur = dayjs.duration(diff);

        const hours = Math.floor(dur.asHours());
        const minutes = dur.minutes();
        const seconds = dur.seconds();

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const formatTimeUntilEnd = (serverTimeEnd, onEnding=null) => {
        if (!serverTimeEnd) return null;

        const end = dayjs(serverTimeEnd);
        const diff = end.diff(currentTime);

        if (diff <= 0) return onEnding ?? 'ending';

        const dur = dayjs.duration(diff);
        const hours = Math.floor(dur.asHours());
        const minutes = dur.minutes();
        const seconds = dur.seconds();

        if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        }
        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;
    };

    if (!currentMatch) {
        return (
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                        No active match found
                    </Typography>
                </CardContent>
            </Card>
        );
    }

    const duration = formatMatchDuration(currentMatch.started_at);
    const timeUntilEnd = formatTimeUntilEnd(currentMatch.server_time_end, "Last round");
    const timeUntilEndEstimate = formatTimeUntilEnd(currentMatch.estimated_time_end, "Probably ending now~");
    const hasScores = currentMatch.human_score !== null && currentMatch.zombie_score !== null;

    return (
        <Card
            sx={{
                mb: 3,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}20, ${theme.palette.secondary.main}20)`,
                border: `1px solid ${theme.palette.primary.main}30`
            }}
        >
            <CardContent>
                <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <Card sx={{ borderRadius: 2, overflow: 'hidden', height: 160 }}>
                            {mapImage ? (
                                <CardMedia
                                    component="img"
                                    height="160"
                                    image={mapImage}
                                    alt={currentMatch.map}
                                    sx={{ objectFit: 'cover' }}
                                />
                            ) : (
                                <Skeleton variant="rectangular" height={160} />
                            )}
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={5}>
                        <Typography variant="overline" color="primary" sx={{ fontWeight: 'bold', letterSpacing: 1 }}>
                            🎮 Currently Playing
                        </Typography>

                        <Typography variant={isMobile ? "h5" : "h4"} sx={{ mb: 1, fontWeight: 'bold' }}>
                            {currentMatch.map}
                        </Typography>

                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Playing for {duration}
                            {timeUntilEnd && (
                                <> • Time left {timeUntilEnd}</>
                            )}
                            {timeUntilEndEstimate && (
                                <> • Estimated ends {timeUntilEndEstimate}</>
                            )}
                            {(currentMatch.extend_count && currentMatch.extend_count > 0)?
                                <> • {currentMatch.extend_count} Extend Count</>: null
                            }
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            {hasScores ? (
                                <Tooltip title="Human Score : Zombie Score" placement="top">
                                    <Chip
                                        label={`${currentMatch.human_score}:${currentMatch.zombie_score}`}
                                        color="info"
                                        size="small"
                                        variant="filled"
                                        sx={{ cursor: 'help' }}
                                    />
                                </Tooltip>
                            ) : (
                                <Chip label="No Score Data" color="default" size="small" variant="outlined" />
                            )}
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Stack direction="row" spacing={2} justifyContent={isMobile ? 'flex-start' : 'center'}>
                            <Box textAlign="center">
                                <Typography variant="h2" color="primary" sx={{ fontWeight: 'bold' }}>
                                    {currentMatch.player_count || '?'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                                    PLAYERS
                                </Typography>
                            </Box>
                        </Stack>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
};

export default CurrentMatch;