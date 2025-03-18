// TODO: - Session Abandonment Rate
//       - New Player Attraction
//       - Engagement Score (AUC Player Count)
//       - Peak Playtime for Each Map
//       - Player Distribution Per Map (Casual vs Tryhard players)


import {Alert, CircularProgress, Grid2 as Grid, IconButton} from "@mui/material";
import {createContext, useContext, useEffect, useState} from "react";
import {fetchUrl, SERVER_WATCH} from "../utils.jsx";
import {useParams} from "react-router";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import MapHeader from "../components/MapHeader.jsx";
import MapSessionList from "../components/MapSessionList.jsx";
import TableContainer from "@mui/material/TableContainer";
import Table from "@mui/material/Table";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableBody from "@mui/material/TableBody";
import PlayerTableRow, {PlayerTableRowLoading} from "../components/PlayerTableRow.jsx";
import Box from "@mui/material/Box";
import {Bar, PolarArea} from "react-chartjs-2";
import Tooltip from "@mui/material/Tooltip";
import InfoIcon from "@mui/icons-material/Info";

function Attribute({ title, value, description }){
    return <Paper sx={{width: '100%', height: '150px', borderRadius: '1rem', p: '1rem', textAlign: 'start'}}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" color="primary" fontWeight={700}>{title}</Typography>
            <Tooltip title={description}>
                <IconButton size="small">
                    <InfoIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        </Box>
        <Typography variant="h4" fontWeight={600}>
            {value}
        </Typography>
    </Paper>
}
function MapAnalyzeAttributes(){
    const { analyze } = useContext(MapContext)
    return <>
        <Grid size={6}>
            <Attribute
                title="Average Players Per Session" value={analyze?.avg_players_per_session ?? '...'}
                description="Average of how many players there are for all session"
            />
        </Grid>
        <Grid size={6}>
            <Attribute title="Player Drop-off Rate" value={analyze? `${(analyze.dropoff_rate * 100).toFixed(4)}%`: '...'}
                       description="Percentage of players quit after 5 minutes" />
        </Grid>
        <Grid size={6}>
            <Attribute title="Average Playtime" value={analyze? `${(analyze.avg_playtime_before_quitting * 60).toFixed(2)}mins`: '...'}
                       description="How long each player spent on average on this map" />
        </Grid>
        <Grid size={6}>
            <Attribute title="Map Score" value={analyze?.map_score.toFixed(2) ?? '...'}
                       description="Made up score that takes account for total play time, average player time per session, drop-off rate
                                    and unique players."/>
        </Grid>
    </>
}
function MapTop10PlayerList(){
    const { name } = useContext(MapContext)
    const [ playersInfoResult, setPlayerInfo ] = useState(null)
    const [ loading, setLoading ] = useState(false)

    useEffect(() => {
        const abortController = new AbortController()
        const signal = abortController.signal
        setLoading(true)
        fetchUrl(`/servers/${SERVER_WATCH}/maps/${name}/top_players`, { signal })
            .then(data => {
                setPlayerInfo(data)
                setLoading(false)
            })
            .catch(e => {
                if (e.name === "AbortError") return
                console.error(e)
                setLoading(false)
            })
        return () => {
            abortController.abort("Value changed")
        }
    }, [name])
    const playersInfo = playersInfoResult ?? []
    const absoluteLoad = !loading
    return (
        <Paper sx={{ width: '100%', my: '.5rem' }} elevation={0}>
            <Box p="1rem">
                <Typography variant="h6" color="primary" fontWeight={700}>Top 10 Players</Typography>
            </Box>
            <TableContainer component={Box} p="1rem">
                <Table>
                    <TableBody>
                        {(loading || playersInfoResult == null) && Array
                            .from({length: 10})
                            .map((_, index) => <PlayerTableRowLoading key={index}/>)
                        }
                        {!(loading || playersInfoResult == null) && playersInfo.length === 0 && <TableRow>
                                <TableCell colSpan={2}>No players in this list.</TableCell>
                            </TableRow>
                        }
                        {absoluteLoad && playersInfo.map(player => <PlayerTableRow player={player} key={player.id} />)}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    )
}

function AverageSessionDistribution() {
    const { name } = useContext(MapContext);
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        fetchUrl(`/servers/${SERVER_WATCH}/maps/${name}/sessions_distribution`)
            .then(data => {
                setDetail(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err);
                setLoading(false);
            });
    }, [name]);

    const labels = {
        "Under 10": "< 10 minutes",
        "10 - 30": "10 - 30 minutes",
        "30 - 45": "30 - 45 minutes",
        "45 - 60": "45 - 60 minutes",
        "Over 60": "> 60 minutes"
    };

    const data = {
        labels: Object.values(labels),
        datasets: [{
            axis: 'y',
            data: Object.keys(labels).map(e => detail?.find(d => d.session_range === e)?.session_count ?? 0),
            fill: false,
            backgroundColor: [
                'rgba(75, 192, 192, 0.7)',
                'rgba(54, 162, 235, 0.7)',
                'rgba(153, 102, 255, 0.7)',
                'rgba(255, 159, 64, 0.7)',
                'rgba(255, 99, 132, 0.7)'
            ],
            borderColor: [
                'rgba(75, 192, 192, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 159, 64, 1)',
                'rgba(255, 99, 132, 1)'
            ],
            borderWidth: 1,
            borderRadius: 4,
            barThickness: 25,
            label: 'Number of Sessions'
        }]
    };

    const options = {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleFont: {
                    size: 14,
                    weight: 'bold'
                },
                bodyFont: {
                    size: 13
                },
                padding: 10,
                cornerRadius: 4
            }
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)'
                },
                ticks: {
                    font: {
                        weight: 'bold'
                    }
                }
            },
            y: {
                grid: {
                    display: false
                },
                ticks: {
                    font: {
                        weight: 'bold'
                    }
                }
            }
        }
    };

    if (loading) {
        return (
            <Paper elevation={3} sx={{
                p: 3, borderRadius: 2, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <CircularProgress size={40} color="primary" />
            </Paper>
        );
    }

    if (error) {
        return (
            <Paper elevation={3} sx={{ p: 3, borderRadius: 2, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="error">Failed to load session data</Typography>
            </Paper>
        );
    }

    return (
        <Paper elevation={0} sx={{
            p: 3, borderRadius: 2, transition: 'transform 0.3s'
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" color="primary" fontWeight={700}>Session Duration Distribution</Typography>
                <Tooltip title="Shows how long players spend in each session">
                    <IconButton size="small">
                        <InfoIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>

            <Box sx={{ height: 300 }}>
                <Bar data={data} options={options} />
            </Box>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Typography variant="caption" color="text.secondary">
                    Total sessions: {detail?.reduce((acc, curr) => acc + curr.session_count, 0) || 0}
                </Typography>
            </Box>
        </Paper>
    );
}
function RegionDistribution() {
    const { name } = useContext(MapContext);
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        setError(null);

        fetchUrl(`/servers/${SERVER_WATCH}/maps/${name}/regions`)
            .then(data => {
                setDetail(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching region data:', err);
                setError(err.message || 'Failed to load region data');
                setLoading(false);
            });
    }, [name]);

    // Chart configuration
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                titleFont: {
                    size: 14,
                    weight: 'bold'
                },
                bodyFont: {
                    size: 13
                },
                callbacks: {
                    label: (context) => {
                        // Format duration in hours and minutes
                        const minutes = Math.floor(context.raw * 60);
                        const remainingMinutes = minutes % 60;
                        return `${Math.floor(context.raw)}h ${remainingMinutes}m`;
                    }
                }
            }
        },
        scales: {
            r: {
                pointLabels: {
                    display: true,
                    centerPointLabels: true,
                    font: {
                        size: 14,
                        weight: 'bold',
                        family: "'Roboto', 'Helvetica', 'Arial', sans-serif"
                    }
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)'
                },
                ticks: {
                    backdropColor: 'transparent',
                    z: 1
                }
            }
        }
    };

    const generateColors = (count) => {
        const colors = [];
        const backgroundColors = [];

        for (let i = 0; i < count; i++) {
            const hue = (i * 360) / count;
            colors.push(`hsl(${hue}, 70%, 60%)`);
            backgroundColors.push(`hsla(${hue}, 70%, 60%, 0.7)`);
        }

        return { colors, backgroundColors };
    };

    const prepareChartData = () => {
        if (!detail || detail.length === 0) return { labels: [], datasets: [{ data: [] }] };

        const labels = detail.map(e => e.region_name);
        const { colors, backgroundColors } = generateColors(labels.length);

        return {
            labels,
            datasets: [
                {
                    data: detail.map(e => e.total_play_duration / 60 / 60),
                    backgroundColor: backgroundColors,
                    borderColor: colors,
                    borderWidth: 1,
                    hoverBackgroundColor: colors,
                    hoverBorderWidth: 2
                }
            ]
        };
    };

    const chartData = prepareChartData();

    return (
        <Paper
            elevation={0}
            sx={{
                p: 3,
                borderRadius: 2,
            }}
        >
            <Typography
                variant="h5"
                color="primary"
                fontWeight={700}
                sx={{ mb: 3,  pb: 1 }}
            >
                Region Distribution
            </Typography>

            <Box sx={{ height: 400, position: 'relative' }}>
                {loading && (
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                        width: '100%',
                        position: 'absolute',
                        top: 0,
                        left: 0
                    }}>
                        <CircularProgress color="primary" />
                    </Box>
                )}

                {error && (
                    <Box sx={{ mt: 2 }}>
                        <Alert severity="error">{error}</Alert>
                    </Box>
                )}

                {!loading && !error && detail && (
                    <PolarArea data={chartData} options={options} />
                )}

                {!loading && !error && (!detail || detail.length === 0) && (
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%'
                    }}>
                        <Typography color="text.secondary">No region data available</Typography>
                    </Box>
                )}
            </Box>
        </Paper>
    );
}
export const MapContext = createContext(null)
export default function MapPage(){
    const { map_name } = useParams()
    const [mapDetail, setMapDetail] = useState({ name: map_name, analyze: null})
    useEffect(() => {
        fetchUrl(`/servers/${SERVER_WATCH}/maps/${map_name}/analyze`)
            .then(resp => {
                setMapDetail(prev => ({...prev, analyze: resp}))
            })
    }, [map_name])
    return <MapContext.Provider value={mapDetail}>
        <Grid container spacing={3}>
            <Grid size={{xl: 8, lg: 7, md: 12, sm: 12, xs: 12}} sx={{p: '2rem'}}>
                <MapHeader />
            </Grid>
            <Grid size={{xl: 4, lg: 5, md: 12, sm: 12, xs: 12}} container item sx={{p: '2rem'}}>
                <MapAnalyzeAttributes />
            </Grid>
            <Grid size={{xl: 4, lg: 7, md: 6, sm: 12, xs: 12}} sx={{p: '.5rem'}}>
                <MapSessionList />
            </Grid>
            <Grid size={{xl: 4, lg: 5, md: 6, sm: 12, xs: 12}} sx={{p: '.5rem'}}>
                <MapTop10PlayerList />
            </Grid>
            <Grid size={{xl: 4, lg: 6, md: 6, sm: 6, xs: 12}}>
                <AverageSessionDistribution />
            </Grid>
            <Grid size={{xl: 4, lg: 6, md: 6, sm: 6, xs: 12}}>
                <RegionDistribution />
            </Grid>
        </Grid>
    </MapContext.Provider>
}