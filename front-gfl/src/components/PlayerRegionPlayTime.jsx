import {useContext, useEffect, useState} from "react";
import PlayerContext from "./PlayerContext.jsx";
import {fetchUrl} from "../utils.jsx";
import {REGION_COLORS} from "./ServerGraph.jsx";
import {Paper} from "@mui/material";
import {PolarArea} from "react-chartjs-2";
import {
    ArcElement,
    Chart as ChartJS,
    Legend,
    PolarAreaController, RadialLinearScale,
    Title,
    Tooltip
} from "chart.js";

ChartJS.register(
    Title,
    Tooltip,
    Legend,
    PolarAreaController,
    ArcElement,
    RadialLinearScale
)

export default function PlayerRegionPlayTime(){
    const { playerId } = useContext(PlayerContext)
    const [regions, setTimeRegion] = useState([])
    useEffect(() => {
        fetchUrl(`/players/${playerId}/regions`)
            .then(resp => resp.map(e => ({x: e.name, y: e.duration / 3600})))
            .then(setTimeRegion)
    }, [playerId])
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {beginAtZero: true}
        }
    }
    const data = {
        labels: regions.map(e => e.x),
        datasets: [{
            label: 'Hours',
            data: regions.map(e => e.y),
            backgroundColor: regions.map(e => REGION_COLORS[e.x])
        }]
    }
    return <Paper sx={{maxHeight: '500px', width: '100%'}}>
        <h3>Region</h3>
        <Paper sx={{height: '300px', padding: '1rem', width: '90%'}} elevation={0}>
            <PolarArea options={options} data={data} />
        </Paper>
    </Paper>
}