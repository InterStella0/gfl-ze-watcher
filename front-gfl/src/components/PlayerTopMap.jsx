import {useContext, useEffect, useState} from "react";
import PlayerContext from "./PlayerContext.jsx";
import {fetchUrl} from "../utils.jsx";
import {Paper} from "@mui/material";
import {Bar} from "react-chartjs-2";
import {BarController, BarElement, Chart as ChartJS, Legend, CategoryScale, Title, Tooltip} from "chart.js";
ChartJS.register(
    BarElement,
    BarController,
    Title,
    Tooltip,
    Legend,
    CategoryScale
)
export default function PlayerTopMap(){
    const { playerId } = useContext(PlayerContext)
    const [maps, setMaps] = useState([])
    useEffect(() => {
        fetchUrl(`/players/${playerId}/most_played_maps`)
            .then(resp => resp.map(e => ({x: e.map, y: e.duration / 3600})))
            .then(setMaps)
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
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)'
        }]
    }
    return <>
        <Paper sx={{maxHeight: '500px', width: '100%'}}>
            <h3>Top played maps</h3>
            <Paper sx={{height: '300px', padding: '1rem', width: '90%'}} elevation={0}>
                <Bar options={options} data={data} />
            </Paper>
        </Paper>
    </>
}