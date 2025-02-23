import { useContext, useEffect, useState } from "react";
import PlayerContext from "./PlayerContext.jsx";
import { fetchUrl } from "../utils.jsx";
import {Paper, Skeleton} from "@mui/material";
import { Bar } from "react-chartjs-2";
import { BarController, BarElement, Chart as ChartJS, Legend, CategoryScale, Title, Tooltip } from "chart.js";
import ErrorCatch from "./ErrorMessage.jsx";
import Box from "@mui/material/Box";
ChartJS.register(
    BarElement,
    BarController,
    Title,
    Tooltip,
    Legend,
    CategoryScale
)
function PlayerTopMapDisplay(){
    const { playerId } = useContext(PlayerContext)
    const [maps, setMaps] = useState([])
    const [ loading, setLoading ] = useState(false)
    useEffect(() => {
        setLoading(true)
        fetchUrl(`/players/${playerId}/most_played_maps`)
            .then(resp => resp.map(e => ({x: e.map, y: e.duration / 3600})))
            .then(values => {
                setMaps(values)
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [playerId])

    const options = {
        responsive: true,
        indexAxis: 'y',
        maintainAspectRatio: false,
        scales: {
            y: {beginAtZero: true}
        }
    }
    const data = {
        labels: maps.map(e => e.x),
        datasets: [{
            label: 'Hours',
            data: maps.map(e => e.y),
            borderWidth: '1',
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)'
        }]
    }
    return <>
        <h3 style={{margin: '0'}}>Top played maps</h3>
        <div style={{height: '300px', width: '100%'}} >
            {!loading && <Bar options={options} data={data} />}
            {loading && <SkeletonBarGraph />}
        </div>
    </>
}
function SkeletonBarGraph({ width = 400, height = 300}) {
    const minFactor = 0.2;
    const maxFactor = 0.8;
    const maxWidth = width * maxFactor;
    const minWidth = width * minFactor;

    const randomValues = Array
        .from({ length: 10 }, () => Math.random())
        .sort((a, b) => b - a);
    const barWidths = randomValues.map(val => val * (maxWidth - minWidth) + minWidth);

    return <>
        <Box width="100%" height={height} display="flex" flexDirection="column" gap=".1rem" sx={{m: '1rem'}}>
            {barWidths.map((width, index) => <>
                <div style={{display: 'flex', alignItems: 'center'}} key={index}>
                    <Skeleton
                        variant="text"
                        width={90}
                    />
                    <Skeleton
                        variant="rectangular"
                        sx={{mx: '1rem'}}
                        width={width}
                        height={10}
                    />
                </div>
            </>
            )}
        </Box>
    </>
}

export default function PlayerTopMap(){
    return <ErrorCatch message="Top map couldn't be loaded.">
        <Paper sx={{maxHeight: '500px', width: '100%'}} elevation={0}>
            <PlayerTopMapDisplay />
        </Paper>
    </ErrorCatch>
}