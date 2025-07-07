import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Line } from 'react-chartjs-2';
import {
    Paper,
    Typography,
    Grid2,
    IconButton,
    Box,
    Chip,
    Card,
    CardContent
} from '@mui/material';
import { ArrowBackIos, ArrowForwardIos, ArrowBack } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {fetchServerUrl, fetchUrl, getMapImage} from "../utils.jsx";
import { PlayerAvatar } from "../components/players/PlayerAvatar.jsx";
import dayjs from "dayjs";
import humanizeDuration from "humanize-duration";

export default function PlayerServerSessionPage(){
    const { server_id, session_id, player_id } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sessionInfo, setSessionInfo] = useState(null);
    const [playerDetails, setPlayerDetails] = useState(null);
    const [mutualSessions, setMutualSessions] = useState([]);
    const [mutualCurrentPage, setMutualCurrentPage] = useState(0);
    const [serverGraph, setServerGraph] = useState([]);
    const [maps, setMaps] = useState([]);
    const [mapImages, setMapImages] = useState({});

    const MUTUAL_PAGE_SIZE = 30;

    const getCurrentPageMutual = () => {
        const startIndex = mutualCurrentPage * MUTUAL_PAGE_SIZE;
        const endIndex = startIndex + MUTUAL_PAGE_SIZE;
        return mutualSessions.slice(startIndex, endIndex);
    };

    const getTotalPages = () => {
        return Math.ceil(mutualSessions.length / MUTUAL_PAGE_SIZE);
    };

    useEffect(() => {
        const abortController = new AbortController();

        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const [sessionData, playerData, mutualData, graphData, mapsData] = await Promise.all([
                    fetchServerUrl(server_id, `/players/${player_id}/sessions/${session_id}/info`, {
                        signal: abortController.signal
                    }),
                    fetchServerUrl(server_id, `/players/${player_id}/detail`, {
                        signal: abortController.signal
                    }),
                    fetchServerUrl(server_id, `/players/${player_id}/sessions/${session_id}/might_friends`, {
                        signal: abortController.signal
                    }),
                    fetchUrl(`/graph/${server_id}/unique_players/players/${player_id}/sessions/${session_id}`, {
                        signal: abortController.signal
                    }),
                    fetchServerUrl(server_id, `/players/${player_id}/sessions/${session_id}/maps`, {
                        signal: abortController.signal
                    })
                ]);

                setSessionInfo(sessionData);
                setPlayerDetails(playerData);
                setMutualSessions(mutualData);
                setServerGraph(graphData);
                setMaps(mapsData);

                const imagePromises = mapsData.map(async (map) => {
                    try {
                        const imageData = await getMapImage(server_id, map.map);
                        return { [map.map]: imageData?.extra_large || null };
                    } catch (error) {
                        console.error(`Failed to load image for ${map.map}:`, error);
                        return { [map.map]: null };
                    }
                });

                const imageResults = await Promise.all(imagePromises);
                const imageMap = imageResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
                setMapImages(imageMap);

                setLoading(false);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Failed to fetch session data:', error);
                    setError(error.message);
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            abortController.abort();
        };
    }, [server_id, session_id, player_id]);

    const formatDuration = (start, end) => {
        if (!start || !end) return '0h 0m';
        const duration = new Date(end) - new Date(start);
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    const formatTime = (timeStr) => {
        return new Date(timeStr).toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatTimeTogethers = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    const getServerPopRange = () => {
        if (serverGraph.length === 0) return '0-0';
        const min = Math.min(...serverGraph.map(d => d.player_count));
        const max = Math.max(...serverGraph.map(d => d.player_count));
        return `${min}-${max}`;
    };

    const generateMatchScoreData = () => {
        const data = [];
        let all_match = maps.map(data => data.match_data).flat(2).map(match => {
            match.timeAt = dayjs(match.occurred_at)
            return match
        })
        all_match.sort((a, b) => a.timeAt.isAfter(b.timeAt) ? 1 : -1)
        all_match.forEach(matchData => {
            data.push({
                x: matchData.occurred_at,
                humanScore: matchData.human_score,
                zombieScore: matchData.zombie_score
            });
        });

        return data;
    };

    const getMapStartAnnotations = () => {
        return maps.map(map => {
            let text = map.map;
            if (map.ended_at !== map.started_at) {
                let delta = dayjs(map.ended_at).diff(dayjs(map.started_at));
                text += ` (${humanizeDuration(delta, { units: ['h', 'm'], maxDecimalPoints: 2 })})`;
            }
            return {
                type: 'line',
                xMin: map.started_at,
                xMax: map.started_at,
                borderColor: 'rgb(255, 99, 132)',
                label: {
                    backgroundColor: '#00000000',
                    content: text,
                    display: true,
                    rotation: 270,
                    color: 'rgb(36, 0, 168)',
                    position: 'start',
                    xAdjust: 10,
                }
            }
        });
    };

    const getServerPopChartData = () => {
        const data = serverGraph.map(item => ({
            x: item.bucket_time,
            y: item.player_count
        }));

        return {
            datasets: [
                {
                    label: 'Player Count',
                    data,
                    borderColor: theme.palette.primary.main,
                    backgroundColor: theme.palette.primary.main + '20',
                    borderWidth: 2,
                    pointBackgroundColor: theme.palette.primary.main,
                    pointRadius: 0,
                    tension: 0.1
                }
            ]
        };
    };

    const getMatchScoreChartData = () => {
        const matchData = generateMatchScoreData();

        return {
            datasets: [
                {
                    label: 'Humans',
                    data: matchData.map(item => ({ x: item.x, y: item.humanScore })),
                    borderColor: theme.palette.success.main,
                    backgroundColor: theme.palette.success.main + '20',
                    borderWidth: 2,
                    stepped: true,
                    pointRadius: 0,
                    pointHoverRadius: 6
                },
                {
                    label: 'Zombies',
                    data: matchData.map(item => ({ x: item.x, y: item.zombieScore })),
                    borderColor: theme.palette.error.main,
                    backgroundColor: theme.palette.error.main + '20',
                    borderWidth: 2,
                    stepped: true,
                    pointRadius: 0,
                    pointHoverRadius: 6
                }
            ]
        };
    };

    const getChartOptionsWithAnnotations = (showLegend = false) => {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: showLegend,
                    labels: {
                        color: theme.palette.text.primary
                    }
                },
                annotation: {
                    annotations: getMapStartAnnotations()
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: theme.palette.background.paper,
                    titleColor: theme.palette.text.primary,
                    bodyColor: theme.palette.text.primary,
                    borderColor: theme.palette.divider,
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    type: 'time',
                    min: sessionInfo?.started_at,
                    max: sessionInfo?.ended_at,
                    time: {
                        displayFormats: {
                            minute: 'HH:mm',
                            hour: 'HH:mm'
                        }
                    },
                    grid: {
                        color: theme.palette.divider
                    },
                    ticks: {
                        color: theme.palette.text.secondary,
                        font: {
                            size: 12
                        }
                    }
                },
                y: {
                    grid: {
                        color: theme.palette.divider
                    },
                    ticks: {
                        color: theme.palette.text.secondary,
                        font: {
                            size: 12
                        }
                    },
                    min: 0
                }
            }
        };
    };

    if (loading) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="400px"
                bgcolor="background.default"
            >
                <Box
                    sx={{
                        width: 40,
                        height: 40,
                        border: `4px solid ${theme.palette.divider}`,
                        borderTop: `4px solid ${theme.palette.primary.main}`,
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        '@keyframes spin': {
                            '0%': { transform: 'rotate(0deg)' },
                            '100%': { transform: 'rotate(360deg)' }
                        }
                    }}
                />
            </Box>
        );
    }

    if (error) {
        return (
            <Box bgcolor="background.default" p={3} minHeight="100vh">
                <Paper elevation={3} sx={{ p: 2, mb: 2, bgcolor: 'error.main', color: 'error.contrastText' }}>
                    <Typography>Failed to load session details: {error}</Typography>
                </Paper>
                <IconButton
                    color="primary"
                    onClick={() => navigate(`/${server_id}/players/${player_id}/`)}
                    startIcon={<ArrowBack />}
                >
                    Back to Profile
                </IconButton>
            </Box>
        );
    }

    return (
        <Box bgcolor="background.default" minHeight="100vh" p={3}>
            <Box display="flex" alignItems="center" mb={3}>
                <IconButton
                    color="primary"
                    onClick={() => navigate(`/${server_id}/players/${player_id}/`)}
                    sx={{ mr: 2 }}
                >
                    <ArrowBack />
                </IconButton>

                <Box display="flex" alignItems="center" mr={2}>
                    {playerDetails && <PlayerAvatar uuid={player_id} name={playerDetails.name} />}
                    <Box ml={2}>
                        <Typography variant="h4" component="h1">
                            {playerDetails ? playerDetails.name : 'Loading...'}&#39;s Session
                        </Typography>
                    </Box>
                </Box>

                <Box ml="auto">
                    <Chip
                        label={`${sessionInfo ? new Date(sessionInfo.started_at).toLocaleDateString() : ''} • ${sessionInfo ? formatTime(sessionInfo.started_at) : ''}-${sessionInfo ? formatTime(sessionInfo.ended_at) : ''}`}
                        color="secondary"
                        variant="outlined"
                    />
                </Box>
            </Box>

            <Grid2 container spacing={3}>
                <Grid2 size={{ xs: 12, md: 8 }}>
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Grid2 container spacing={2}>
                            <Grid2 size={{ xs: 3 }}>
                                <Box textAlign="center">
                                    <Typography variant="h3" color="primary" fontWeight="bold">
                                        {sessionInfo ? formatDuration(sessionInfo.started_at, sessionInfo.ended_at) : '0h 0m'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Total Duration
                                    </Typography>
                                </Box>
                            </Grid2>
                            <Grid2 size={{ xs: 3 }}>
                                <Box textAlign="center">
                                    <Typography variant="h3" color="primary" fontWeight="bold">
                                        {maps.length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Maps Played
                                    </Typography>
                                </Box>
                            </Grid2>
                            <Grid2 size={{ xs: 3 }}>
                                <Box textAlign="center">
                                    <Typography variant="h3" color="primary" fontWeight="bold">
                                        {mutualSessions.length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Mutual Players
                                    </Typography>
                                </Box>
                            </Grid2>
                            <Grid2 size={{ xs: 3 }}>
                                <Box textAlign="center">
                                    <Typography variant="h3" color="primary" fontWeight="bold">
                                        {getServerPopRange()}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Server Pop Range
                                    </Typography>
                                </Box>
                            </Grid2>
                        </Grid2>
                    </Paper>

                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h5" component="h3" mb={2}>
                            Server Population During Session
                        </Typography>
                        <Box height={300}>
                            <Line data={getServerPopChartData()} options={getChartOptionsWithAnnotations(false)} />
                        </Box>
                        <Typography variant="body2" color="text.secondary" mt={1}>
                            Population changes with map transitions marked
                        </Typography>
                    </Paper>

                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h5" component="h3" mb={2}>
                            Match Score Progression
                        </Typography>
                        <Box height={300}>
                            <Line data={getMatchScoreChartData()} options={getChartOptionsWithAnnotations(true)} />
                        </Box>
                        <Typography variant="body2" color="text.secondary" mt={1}>
                            Round-by-round score tracking across all maps
                        </Typography>
                    </Paper>

                    <Paper elevation={3} sx={{ p: 3 }}>
                        <Typography variant="h5" component="h3" mb={2}>
                            Maps Played
                        </Typography>
                        {maps.map((map) => (
                            <Card
                                key={map.time_id}
                                variant="outlined"
                                sx={{
                                    mb: 2,
                                    cursor: 'pointer',
                                    '&:hover': {
                                        backgroundColor: 'action.hover'
                                    }
                                }}
                                onClick={() => navigate(`/${server_id}/maps/${map.map}`)}
                            >
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                        <Typography variant="h6" component="h4">
                                            {map.map}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {formatTime(map.started_at)} - {map.ended_at ? formatTime(map.ended_at) : 'Ongoing'}
                                            {map.ended_at && ` (${Math.floor((new Date(map.ended_at) - new Date(map.started_at)) / (1000 * 60))}m)`}
                                        </Typography>
                                    </Box>
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                        <Box>
                                            {map.match_data && map.match_data.length > 0 ? (
                                                <>
                                                    <Typography
                                                        variant="body1"
                                                        color={map.match_data[0].human_score > map.match_data[0].zombie_score ? 'success.main' : 'error.main'}
                                                    >
                                                        FINAL SCORE
                                                    </Typography>
                                                    <Typography variant="h4" fontWeight="bold">
                                                        {map.match_data[0].human_score} - {map.match_data[0].zombie_score}
                                                    </Typography>
                                                </>
                                            ) : (
                                                <Typography variant="body1" color="text.secondary">
                                                    No score data available
                                                </Typography>
                                            )}
                                        </Box>
                                        <Box textAlign="right">
                                            {mapImages[map.map] ? (
                                                <img
                                                    src={mapImages[map.map]}
                                                    alt={map.map}
                                                    style={{
                                                        width: '120px',
                                                        height: '80px',
                                                        objectFit: 'cover',
                                                        borderRadius: theme.shape.borderRadius,
                                                        border: `1px solid ${theme.palette.divider}`
                                                    }}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <Paper
                                                    variant="outlined"
                                                    sx={{
                                                        width: 120,
                                                        height: 80,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        bgcolor: 'background.paper'
                                                    }}
                                                >
                                                    <Typography variant="caption" color="text.secondary">
                                                        No Image
                                                    </Typography>
                                                </Paper>
                                            )}
                                        </Box>
                                    </Box>
                                </CardContent>
                            </Card>
                        ))}
                    </Paper>
                </Grid2>

                <Grid2 size={{ xs: 12, md: 4 }}>
                    <Paper elevation={3} sx={{ p: 3 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h5" component="h3">
                                Mutual Sessions
                            </Typography>

                            {mutualSessions.length > MUTUAL_PAGE_SIZE && (
                                <Box display="flex" alignItems="center" gap={1}>
                                    <IconButton
                                        onClick={() => setMutualCurrentPage(prev => Math.max(0, prev - 1))}
                                        disabled={mutualCurrentPage === 0}
                                        size="small"
                                        color="primary"
                                    >
                                        <ArrowBackIos fontSize="small" />
                                    </IconButton>

                                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60, textAlign: 'center' }}>
                                        {mutualCurrentPage + 1}/{getTotalPages()}
                                    </Typography>

                                    <IconButton
                                        onClick={() => setMutualCurrentPage(prev => Math.min(getTotalPages() - 1, prev + 1))}
                                        disabled={mutualCurrentPage >= getTotalPages() - 1}
                                        size="small"
                                        color="primary"
                                    >
                                        <ArrowForwardIos fontSize="small" />
                                    </IconButton>
                                </Box>
                            )}
                        </Box>

                        {getCurrentPageMutual().map((player) => (
                            <Box
                                key={player.id}
                                display="flex"
                                alignItems="center"
                                mb={2}
                                sx={{
                                    cursor: 'pointer',
                                    borderRadius: 1,
                                    p: 1,
                                    '&:hover': {
                                        backgroundColor: 'action.hover'
                                    }
                                }}
                                onClick={() => navigate(`/${server_id}/players/${player.id}`)}
                            >
                                <PlayerAvatar uuid={player.id} name={player.name} />
                                <Box flexGrow={1} ml={2}>
                                    <Typography variant="body1" mb={0.5}>
                                        {player.name}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {player.id}
                                    </Typography>
                                </Box>
                                <Typography variant="body2" color="primary" fontWeight="bold">
                                    {(player.total_time_together / 60).toFixed(1)}mins
                                </Typography>
                            </Box>
                        ))}
                    </Paper>
                </Grid2>
            </Grid2>
        </Box>
    );
};