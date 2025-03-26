import {useContext, useEffect, useState} from "react";
import {fetchServerUrl, fetchUrl, SERVER_WATCH} from "../../utils.jsx";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import {Alert, CircularProgress, IconButton, Skeleton, TableCell, TableRow} from "@mui/material";
import {Chart, PolarArea} from "react-chartjs-2";
import {MapContext} from "../../pages/MapPage.jsx";
import ErrorCatch from "../ui/ErrorMessage.jsx";
import Tooltip from "@mui/material/Tooltip";
import InfoIcon from "@mui/icons-material/Info";
import {REGION_COLORS} from "../graphs/ServerGraph.jsx";
import TableContainer from "@mui/material/TableContainer";
import TableBody from "@mui/material/TableBody";
import dayjs from "dayjs";
import Table from "@mui/material/Table";

function RegionDistribution() {
    const { name } = useContext(MapContext);
    const [detail, setDetail] = useState(null);
    const [ regions, setRegions ] = useState([])
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
        fetchUrl(`/graph/${SERVER_WATCH}/get_regions`)
            .then(setRegions)
    }, [name]);

    // Chart configuration
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
            x: {
                stacked: true,
                title: {
                    display: true,
                    text: 'Hours'
                },
                ticks: {
                    beginAtZero: true,
                },
                max: detail?.reduce((a, e) => a + e.total_play_duration / 60 / 60)
            },
            y: {
                stacked: true,
            }
        },
        plugins: {
            legend: {
                position: 'bottom'
            }
        }
    }

    const prepareChartData = () => {
        if (!detail || detail.length === 0) return { labels: [], datasets: [{ data: [] }] };
        return {
            labels: [''],
            datasets: detail.map(e => ({
                label: e.region_name,
                data: [e.total_play_duration / 60 / 60],
                backgroundColor: REGION_COLORS[e.region_name],
                borderColor: REGION_COLORS[e.region_name],
                borderWidth: 1,
                hoverBackgroundColor: REGION_COLORS[e.region_name],
                hoverBorderWidth: 2
            }))

        };
    };

    const chartData = prepareChartData();

    return (
        <Box
            elevation={0}
            sx={{
                p: 3,
                px: '2rem',
                borderRadius: 2,
            }}
        >
            <Typography
                variant="caption" color="text.secondary"
                fontWeight={700}
                component="h3"
            >
                Overall Distribution
            </Typography>
            <Box display="flex" flexDirection="row">
                <Box sx={{ height: 150, width: '100%', position: 'relative' }}>
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
                            <Skeleton variant="rounded" width={300} height={300} />
                        </Box>
                    )}

                    {error && (
                        <Box sx={{ mt: 2 }}>
                            <Alert severity="error">{error}</Alert>
                        </Box>
                    )}

                    {!loading && !error && detail && (
                        <Chart data={chartData} options={options} type="bar" />
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
                <Box
                    m="1rem"
                    sx={{
                        borderLeft: '1px solid #e0e0e0',
                        paddingLeft: '1rem',
                        minWidth: '240px'
                    }}
                >
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={700}
                        sx={{ mb: 1.5 }}
                        component="h3">REGIONS</Typography>
                    <TableContainer sx={{ maxHeight: '140px', overflowY: 'auto' }}>
                        <Table size="small">
                            <TableBody>
                                {regions.map(region => {
                                    return <TableRow key={region.region_id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell sx={{ width: '20px', padding: '6px 0 6px 6px' }}>
                                            <Box sx={{
                                                width: '12px',
                                                height: '12px',
                                                backgroundColor: REGION_COLORS[region.region_name],
                                                borderRadius: '2px'
                                            }} />
                                        </TableCell>
                                        <TableCell sx={{ padding: '6px' }}>
                                            <Typography variant="body2" fontWeight={500}>{region.region_name}</Typography>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                {dayjs(region.start_time.replace("-10000", "1980").replace("-9999", "1980")).format("LT")} -
                                                {dayjs(region.end_time.replace("-10000", "1980").replace("-9999", "1980")).format("LT")}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            </Box>
        </Box>
    );
}

export default function MapRegionDistribution(){
    return <ErrorCatch>
        <RegionDistribution />
    </ErrorCatch>
}