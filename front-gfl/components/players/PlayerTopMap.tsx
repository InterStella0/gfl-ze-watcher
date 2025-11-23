'use client'
import {useEffect, useState, useMemo, use} from "react";
import {addOrdinalSuffix, fetchServerUrl} from "utils/generalUtils";
import {
    Paper,
    useTheme,
    useMediaQuery,
    Tab,
    Tabs,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    InputAdornment,
    Pagination,
    Stack
} from "@mui/material";
import {
    Chart as ChartJS,
    ArcElement,
    Title,
    Tooltip,
    Legend
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import ErrorCatch from "../ui/ErrorMessage.jsx";
import Box from "@mui/material/Box";
import SkeletonBarGraph from "../graphs/SkeletonBarGraph.jsx";
import Typography from "@mui/material/Typography";
import {useNavigate, useParams} from "react-router";
import { Search } from "@mui/icons-material";
import Link from "@mui/material/Link";
import {ServerPlayerDetailed} from "../../app/servers/[server_slug]/players/[player_id]/page.tsx";

ChartJS.register(
    ArcElement,
    Title,
    Tooltip,
    Legend
);

function PlayerTopMapDisplay({ serverPlayerPromise }: { serverPlayerPromise: Promise<ServerPlayerDetailed>}) {
    const { server, player } = use(serverPlayerPromise)
    const playerId = player.id
    const [maps, setMaps] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [viewType, setViewType] = useState("chart");
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const server_id = server.id
    const maxMapCount = isMobile ? 5 : 10;
    const rowsPerPage = 10;

    const filteredMaps = useMemo(() => {
        if (!searchTerm) return maps;
        return maps.filter(map =>
            map.map.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [maps, searchTerm]);

    const paginatedMaps = useMemo(() => {
        const startIndex = (page - 1) * rowsPerPage;
        return filteredMaps.slice(startIndex, startIndex + rowsPerPage);
    }, [filteredMaps, page, rowsPerPage]);

    const displayedMaps = useMemo(() => {
        if (viewType === "chart") {
            return maps.slice(0, maxMapCount);
        }
        return paginatedMaps;
    }, [maps, paginatedMaps, viewType, maxMapCount]);

    const totalPages = Math.ceil(filteredMaps.length / rowsPerPage);

    useEffect(() => {
        setLoading(true);
        setError(null);

        fetchServerUrl(server_id, `/players/${playerId}/most_played_maps`)
            .then(resp => resp.map(e => ({
                map: e.map,
                duration: e.duration,
                hours: e.duration / 3600,
                rank: e.rank
            })))
            .then(values => {
                const sortedMaps = values.sort((a, b) => b.duration - a.duration);
                setMaps(sortedMaps);
                setLoading(false);
            })
            .catch(err => {
                setError(err);
                setLoading(false);
            });
    }, [server_id, playerId]);

    useEffect(() => {
        setPage(1);
    }, [searchTerm, playerId]);

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
            legend: {
                position: 'right',
                align: 'center',
                labels: {
                    boxWidth: 12,
                    padding: 16,
                    usePointStyle: true,
                    pointStyle: 'circle',
                    color: theme.palette.text.primary,
                    font: {
                        size: isMobile ? 10 : 12,
                        weight: 500
                    },
                    generateLabels: (chart) => {
                        const { data } = chart;
                        if (data.labels.length && data.datasets.length) {
                            return data.labels.map((label, i) => {
                                const hours = data.datasets[0].data[i];
                                const displayLabel = isMobile && label.length > 12
                                    ? label.substring(0, 12) + '...'
                                    : label;

                                return {
                                    text: `${displayLabel} (${hours.toFixed(1)}h)`,
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    hidden: !chart.getDataVisibility(i),
                                    index: i,
                                    fontColor: theme.palette.text.primary,
                                    pointStyle: 'circle'
                                };
                            });
                        }
                        return [];
                    }
                }
            },
            tooltip: {
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(50, 50, 50, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                titleColor: theme.palette.text.primary,
                bodyColor: theme.palette.text.primary,
                borderColor: theme.palette.divider,
                borderWidth: 1,
                cornerRadius: 8,
                padding: 12,
                callbacks: {
                    title: (tooltipItems) => displayedMaps[tooltipItems[0].dataIndex].map,
                    label: (context) => `${context.parsed.toFixed(1)} hours`
                }
            }
        },
        elements: {
            arc: {
                borderWidth: 2,
                borderColor: theme.palette.background.paper,
                hoverBorderWidth: 3
            }
        }
    };

    const handleViewChange = (event, newValue) => {
        setViewType(newValue);
        if (newValue === "chart") {
            setSearchTerm("");
            setPage(1);
        }
    };

    const handlePageChange = (event, newPage) => {
        setPage(newPage);
    };

    const generateColors = (count) => {
        const colors = [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(255, 99, 71, 0.8)',
            'rgba(106, 90, 205, 0.8)',
            'rgba(60, 179, 113, 0.8)',
            'rgba(30, 144, 255, 0.8)',
        ];

        return colors.slice(0, count);
    };

    const chartData = {
        labels: displayedMaps.map(e => e.map),
        datasets: [{
            label: 'Hours',
            data: displayedMaps.map(e => e.hours),
            backgroundColor: generateColors(displayedMaps.length),
            borderWidth: 0,
            hoverOffset: 8
        }]
    };

    const cardHeight = isMobile ? '280px' : '380px';

    const formatDuration = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            return `${hrs}h ${mins}m`;
        } else if (mins > 0) {
            return `${mins}m ${secs.toFixed(0)}s`;
        } else {
            return `${secs.toFixed(1)}s`;
        }
    };

    const getRankForMap = (mapData) => {
        return maps.findIndex(m => m.map === mapData.map) + 1;
    };

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
                    Map Playtime
                </Typography>

                <Tabs
                    value={viewType}
                    onChange={handleViewChange}
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
                    <Tab value="chart" label="Chart" />
                    <Tab value="table" label="Table" />
                </Tabs>
            </Box>

            {viewType === "table" && (
                <Box sx={{ mb: 2 }}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Search maps..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>
            )}

            <Box sx={{
                height: cardHeight,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: viewType === "chart" ? 'center' : 'stretch',
                justifyContent: viewType === "chart" ? 'center' : 'flex-start',
                pb: isMobile ? 1 : 2
            }}>
                {loading && <SkeletonBarGraph sorted />}
                {error && (
                    error.code === 202 ?
                        <Typography color="textSecondary">
                            Still calculating...
                        </Typography> :
                        <Typography color="error">
                            Failed to load map data
                        </Typography>
                )}
                {!loading && !error && maps.length === 0 && (
                    <Typography color="textSecondary">
                        No map data available
                    </Typography>
                )}
                {!loading && !error && maps.length > 0 && (
                    <>
                        {viewType === "chart" && (
                            <Box sx={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Doughnut options={doughnutOptions} data={chartData} />
                            </Box>
                        )}
                        {viewType === "table" && (
                            <Box sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                height: cardHeight
                            }}>
                                <TableContainer sx={{
                                    height: cardHeight,
                                    overflow: 'auto'
                                }}>
                                    <Table stickyHeader size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Rank</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Map</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }}>Play Rank</TableCell>
                                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Time</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {displayedMaps.map((mapData) => <>
                                                <TableRow
                                                    component={Link}
                                                    key={mapData.map} sx={{cursor: "pointer"}}
                                                    hover
                                                    href={`/servers/${server.gotoLink}/maps/${mapData.map}`}>
                                                    <TableCell>{getRankForMap(mapData)}</TableCell>
                                                    <TableCell sx={{ wordBreak: 'break-word' }}>
                                                        {mapData.map}
                                                    </TableCell>
                                                    <TableCell>
                                                        {mapData.rank > 0? addOrdinalSuffix(mapData.rank): 'No data'}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {formatDuration(mapData.duration)}
                                                    </TableCell>

                                                </TableRow>
                                            </>)}
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                                {totalPages > 1 && (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                        <Stack spacing={2}>
                                            <Pagination
                                                count={totalPages}
                                                page={page}
                                                onChange={handlePageChange}
                                                color="primary"
                                                size={isMobile ? "small" : "medium"}
                                                showFirstButton
                                                showLastButton
                                            />
                                            <Typography variant="caption" color="textSecondary" textAlign="center">
                                                Showing {((page - 1) * rowsPerPage) + 1}-{Math.min(page * rowsPerPage, filteredMaps.length)} of {filteredMaps.length} maps
                                            </Typography>
                                        </Stack>
                                    </Box>
                                )}

                                {searchTerm && filteredMaps.length === 0 && (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                                        <Typography color="textSecondary">
                                            No maps found matching "{searchTerm}"
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </>
                )}
            </Box>
        </Box>
    );
}

export default function PlayerTopMap({ serverPlayerPromise }: { serverPlayerPromise: Promise<ServerPlayerDetailed>}) {
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
                <PlayerTopMapDisplay serverPlayerPromise={serverPlayerPromise} />
            </Paper>
        </ErrorCatch>
    );
}