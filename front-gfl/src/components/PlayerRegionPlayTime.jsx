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
import ErrorCatch from "./ErrorMessage.jsx";

ChartJS.register(
    Title,
    Tooltip,
    Legend,
    PolarAreaController,
    ArcElement,
    RadialLinearScale
)

function PlayerRegionPlayTimeDisplay(){
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
            borderWidth: '1',
            backgroundColor: regions.map(e => REGION_COLORS[e.x])
        }]
    }
    return <>
        <h3 style={{margin: '0'}}>Region</h3>
        <div style={{height: '300px', width: '100%'}}>
            <PolarArea options={options} data={data} />
        </div>
    </>
}
export default function PlayerRegionPlayTime(){
    return <Paper sx={{maxHeight: '500px', width: '100%', p: '.2rem'}} elevation={0}>
        <ErrorCatch message="Player region couldn't be loaded">
            <PlayerRegionPlayTimeDisplay />
        </ErrorCatch>
    </Paper>
}

