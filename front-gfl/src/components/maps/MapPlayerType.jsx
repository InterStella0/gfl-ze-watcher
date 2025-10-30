import {useContext, useEffect, useState} from "react";
import {MapContext} from "../../pages/MapPage.jsx";
import {useParams} from "react-router";
import {fetchServerUrl, secondsToHours, StillCalculate} from "../../utils/generalUtils.jsx";
import {Typography, Box, Paper, IconButton, Tooltip} from '@mui/material';
import {Doughnut} from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Legend } from 'chart.js';
import InfoIcon from "@mui/icons-material/Info";
import SkeletonBarGraph from "../graphs/SkeletonBarGraph.jsx";
import ErrorCatch from "../ui/ErrorMessage.jsx";

ChartJS.register(ArcElement, Legend);

function MapPlayerTypeDisplay() {
    const { name } = useContext(MapContext);
    const { server_id } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [playerTypes, setPlayerTypes] = useState([]);

    useEffect(() => {
        setLoading(true);
        setError(null);
        setPlayerTypes([]);

        fetchServerUrl(server_id, `/maps/${name}/player_types`)
            .then(data => setPlayerTypes(data))
            .catch(err => {
                if (!(err instanceof StillCalculate)) {
                    console.error('Error fetching player types data:', err);
                }
                setError(err.message || 'Failed to load player types data');
            })
            .finally(() => setLoading(false));
    }, [server_id, name]);

    const totalSeconds = playerTypes.reduce((sum, p) => sum + p.time_spent, 0);

    const data = {
        labels: playerTypes.map(p => p.category),
        datasets: [
            {
                label: 'Players',
                data: playerTypes.map(p => p.time_spent),
                backgroundColor: ['#42a5f5', '#66bb6a', '#ef5350'],
                hoverOffset: 10,
            },
        ],
    };

    const options = {
        plugins: {
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const count = context.raw;
                        const hours = secondsToHours(count)
                        const percent = ((count / totalSeconds) * 100).toFixed(1);
                        return `${context.label}: ${hours} hrs (${percent}%)`;
                    },
                },
            },
            legend: {
                position: 'bottom',
            },
        },
    };

    return (
    <Paper elevation={0} sx={{
        p: 3, borderRadius: 2, transition: 'transform 0.3s'
    }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" color="primary" component="h2" fontWeight={700}>Player Type Distribution</Typography>
            <Tooltip title="Shows the different types of players that has played this map">
                <IconButton size="small">
                    <InfoIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2}}>
            {loading &&  <SkeletonBarGraph sx={{mt: '2rem'}} height={200} amount={5} barHeight={23} width={400} gap={'1.3rem'} />}

            {!loading && <Box sx={{maxHeight: 300, maxWidth: 300}}>
                <Doughnut data={data} options={options}/>
            </Box>}
        </Box>

    </Paper>
    );
}
export default function MapPlayerType(){
    return <ErrorCatch>
        <MapPlayerTypeDisplay />
    </ErrorCatch>
}