import {useContext, useEffect, useState} from "react";
import {fetchServerUrl} from "../../utils.jsx";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import {Alert, CircularProgress, IconButton, Skeleton} from "@mui/material";
import {PolarArea} from "react-chartjs-2";
import {MapContext} from "../../pages/MapPage.jsx";
import ErrorCatch from "../ui/ErrorMessage.jsx";
import Tooltip from "@mui/material/Tooltip";
import InfoIcon from "@mui/icons-material/Info";

function RegionDistribution() {
    const { name } = useContext(MapContext);
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        setError(null);

        fetchServerUrl(`/maps/${name}/regions`)
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
            <Box display="flex" justifyContent="space-between">
                <Typography
                    variant="h5"
                    color="primary"
                    fontWeight={700}
                    component="h2"
                    sx={{ mb: 3,  pb: 1 }}
                >
                    Region Distribution
                </Typography>
                <Box>
                    <Tooltip title="Region time of when a map is being played">
                        <IconButton size="small">
                            <InfoIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

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
                        <Skeleton variant="circular" width={300} height={300} />
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

export default function MapRegionDistribution(){
    return <ErrorCatch>
        <RegionDistribution />
    </ErrorCatch>
}