import { useContext, useEffect, useState } from "react";
import PlayerContext from "./PlayerContext.jsx";
import { fetchServerUrl } from "../../utils.jsx";
import { Paper, useTheme, useMediaQuery, Tab, Tabs } from "@mui/material";
import {
    Chart as ChartJS,
    ArcElement,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    RadialLinearScale
} from "chart.js";
import { Bar, Doughnut, PolarArea } from "react-chartjs-2";
import ErrorCatch from "../ui/ErrorMessage.jsx";
import Box from "@mui/material/Box";
import SkeletonBarGraph from "../graphs/SkeletonBarGraph.jsx";
import Typography from "@mui/material/Typography";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    RadialLinearScale,
    Title,
    Tooltip,
    Legend
);

function PlayerTopMapDisplay() {
    const { playerId } = useContext(PlayerContext);
    const [maps, setMaps] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [chartType, setChartType] = useState("bar"); // "bar", "doughnut", or "polar"
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const maxMapCount = isMobile ? 5 : 10;

    const createChartOptions = () => {
        setCircularChartOptions({
            ...circularOptions,
            plugins: {
                ...circularOptions.plugins,
                legend: {
                    ...circularOptions.plugins.legend,
                    labels: {
                        ...circularOptions.plugins.legend.labels,
                        color: theme.palette.text.primary,
                    }
                }
            }
        });
    };

    useEffect(() => {
        setLoading(true);
        setError(null);

        fetchServerUrl(`/players/${playerId}/most_played_maps`)
            .then(resp => resp.map(e => ({
                map: e.map,
                hours: e.duration / 3600
            })))
            .then(values => {
                // Sort by hours
                const sortedMaps = values.sort((a, b) => b.hours - a.hours);
                setMaps(sortedMaps);
                setLoading(false);
            })
            .catch(err => {
                setError(err);
                setLoading(false);
            });
    }, [playerId]);

    // Update options when theme changes
    useEffect(() => {
        createChartOptions();
    }, [theme.palette.mode]);

    // Bar chart options
    const barOptions = {
        responsive: true,
        indexAxis: 'y',
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    font: { size: isMobile ? 10 : 11 },
                    callback: function(value) {
                        const mapName = this.getLabelForValue(value);
                        if (isMobile && mapName?.length > 12) {
                            return mapName.substring(0, 12) + '...';
                        }
                        return mapName;
                    }
                }
            },
            x: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Hours',
                    font: { size: isMobile ? 11 : 14 }
                }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    title: (tooltipItems) => maps[tooltipItems[0].dataIndex].map,
                    label: (context) => `${context.parsed.x.toFixed(1)} hours`
                }
            }
        }
    };

    const [circularChartOptions, setCircularChartOptions] = useState({});

    const circularOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                align: 'start',
                labels: {
                    boxWidth: 15,
                    color: theme.palette.text.primary, // Use theme text color for legend text
                    font: { size: isMobile ? 9 : 11 },
                    generateLabels: (chart) => {
                        const { data } = chart;
                        if (data.labels.length && data.datasets.length) {
                            return data.labels.map((label, i) => {
                                const displayLabel = isMobile && label.length > 15
                                    ? label.substring(0, 15) + '...'
                                    : label;

                                return {
                                    text: displayLabel,
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    hidden: !chart.getDataVisibility(i),
                                    index: i,
                                    fontColor: theme.palette.text.primary,
                                };
                            });
                        }
                        return [];
                    }
                }
            },
            tooltip: {
                callbacks: {
                    title: (tooltipItems) => maps[tooltipItems[0].dataIndex].map,
                    label: (context) => `${context.parsed.toFixed(1)} hours`
                }
            }
        }
    };

    const handleChartChange = (event, newValue) => {
        setChartType(newValue);
    };

    const barData = {
        labels: maps.map(e => e.map),
        datasets: [{
            label: 'Hours',
            data: maps.map(e => e.hours),
            borderWidth: 1,
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderRadius: 2,
        }]
    };

    const limitedMaps = maps.slice(0, maxMapCount);

    const generateColors = (count) => {
        const colors = [
            'rgba(255, 99, 132, 0.85)',
            'rgba(54, 162, 235, 0.85)',
            'rgba(255, 206, 86, 0.85)',
            'rgba(75, 192, 192, 0.85)',
            'rgba(153, 102, 255, 0.85)',
            'rgba(255, 159, 64, 0.85)',
            'rgba(255, 99, 71, 0.85)',
            'rgba(106, 90, 205, 0.85)',
            'rgba(60, 179, 113, 0.85)',
            'rgba(30, 144, 255, 0.85)',
        ];

        return colors.slice(0, count);
    };

    const circularData = {
        labels: limitedMaps.map(e => e.map),
        datasets: [{
            label: 'Hours',
            data: limitedMaps.map(e => e.hours),
            backgroundColor: generateColors(limitedMaps.length),
            borderWidth: 1,
        }]
    };

    const getActiveChart = () => {
        switch(chartType) {
            case 'doughnut':
                return <Doughnut options={circularChartOptions} data={circularData} />;
            case 'polar':
                return <PolarArea options={circularChartOptions} data={circularData} />;
            case 'bar':
            default:
                return <Bar options={barOptions} data={barData} />;
        }
    };

    const cardHeight = isMobile ? '250px' : '350px';

    return (
        <Box sx={{
            p: 2,
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography
                    component="h2"
                    variant="h6"
                    sx={{
                        fontWeight: 700,
                        fontSize: isMobile ? '1rem' : '1.25rem'
                    }}
                >
                    Top played maps
                </Typography>

                <Tabs
                    value={chartType}
                    onChange={handleChartChange}
                    sx={{
                        minHeight: 'auto',
                        '& .MuiTabs-indicator': { height: 2 },
                        '& .MuiTab-root': {
                            minHeight: 'auto',
                            padding: '4px 8px',
                            fontSize: isMobile ? '0.7rem' : '0.8rem'
                        }
                    }}
                >
                    <Tab value="bar" label="Bar" />
                    <Tab value="doughnut" label="Doughnut" />
                    <Tab value="polar" label="Polar" />
                </Tabs>
            </Box>

            <Box sx={{
                height: cardHeight,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pb: isMobile ? 1 : 2
            }}>
                {loading && <SkeletonBarGraph sorted />}
                {error && (
                    <Typography color="error">
                        Failed to load map data
                    </Typography>
                )}
                {!loading && !error && maps.length === 0 && (
                    <Typography color="textSecondary">
                        No map data available
                    </Typography>
                )}
                {!loading && !error && maps.length > 0 && getActiveChart()}
            </Box>
        </Box>
    );
}

export default function PlayerTopMap() {
    return (
        <ErrorCatch message="Top maps couldn't be loaded.">
            <Paper
                sx={{
                    height: '100%',
                    width: '100%',
                    overflow: 'hidden',
                }}
                elevation={0}
            >
                <PlayerTopMapDisplay />
            </Paper>
        </ErrorCatch>
    );
}