import { useContext, useEffect, useState } from "react";
import PlayerContext from "./PlayerContext.jsx";
import { fetchUrl } from "../../utils.jsx";
import {Paper, Skeleton} from "@mui/material";
import { Bar } from "react-chartjs-2";
import { BarController, BarElement, Chart as ChartJS, Legend, CategoryScale, Title, Tooltip } from "chart.js";
import ErrorCatch from "../ui/ErrorMessage.jsx";
import Box from "@mui/material/Box";
import SkeletonBarGraph from "../graphs/SkeletonBarGraph.jsx";
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
            {loading && <SkeletonBarGraph sorted />}
        </div>
    </>
}

export default function PlayerTopMap(){
    return <ErrorCatch message="Top map couldn't be loaded.">
        <Paper sx={{maxHeight: '500px', width: '100%'}} elevation={0}>
            <PlayerTopMapDisplay />
        </Paper>
    </ErrorCatch>
}