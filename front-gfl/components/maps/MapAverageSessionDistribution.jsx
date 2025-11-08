import {useContext, useEffect, useState} from "react";
import {fetchServerUrl} from "../../utils/generalUtils.ts";
import Paper from "@mui/material/Paper";
import { IconButton, Skeleton} from "@mui/material";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import InfoIcon from "@mui/icons-material/Info";
import {Bar} from "react-chartjs-2";
import {MapContext} from "../../src-old/pages/MapPage.jsx";
import ErrorCatch from "../ui/ErrorMessage.jsx";
import SkeletonBarGraph from "../graphs/SkeletonBarGraph.jsx";
import {useParams} from "react-router";

function AverageSessionDistribution() {
    const { name } = useContext(MapContext);
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const {server_id} = useParams()

    useEffect(() => {
        setLoading(true)
        setDetail(null)
        fetchServerUrl(server_id, `/maps/${name}/sessions_distribution`)
            .then(data => {
                setDetail(data);
            })
            .catch(err => {
                setError(err.message || "Something went wrong");
            })
            .finally(() => setLoading(false))
    }, [server_id, name]);

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

    if (error) {
        return (
            <Paper elevation={3} sx={{ p: 3, borderRadius: 2, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="error">{error}</Typography>
            </Paper>
        );
    }

    return (
        <Paper elevation={0} sx={{
            p: 3, borderRadius: 2, transition: 'transform 0.3s'
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" color="primary" component="h2" fontWeight={700}>Session Duration Distribution</Typography>
                <Tooltip title="Shows how long players spent in each of their session">
                    <IconButton size="small">
                        <InfoIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>


            {loading &&  <SkeletonBarGraph sx={{mt: '2rem'}} height={200} amount={5} barHeight={23} width={400} gap={'1.3rem'} />}

            {!loading && <Box sx={{height: 300}}>
                <Bar data={data} options={options}/>
            </Box>}

            <Box sx={{mt: 2, display: 'flex', justifyContent: 'flex-end'}}>
                {!loading && <Typography variant="caption" color="text.secondary">
                    Total sessions: {detail?.reduce((acc, curr) => acc + curr.session_count, 0) || 0}
                </Typography>
                }
                {loading && <Box display="flex" alignItems="center" gap=".2rem">
                    <Typography variant="caption" color="text.secondary">
                        Total sessions:
                    </Typography>
                    <Skeleton variant="text" width={30} sx={{mb: ".3rem"}} />
                </Box>}
            </Box>

        </Paper>
    );
}

export default function MapAverageSessionDistribution(){
    return <ErrorCatch>
        <AverageSessionDistribution />
    </ErrorCatch>
}