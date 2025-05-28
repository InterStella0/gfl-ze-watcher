import {useContext, useEffect, useState} from "react";
import PlayerContext from "./PlayerContext.jsx";
import {fetchServerUrl} from "../../utils.jsx";
import {REGION_COLORS} from "../graphs/ServerGraph.jsx";
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
import ErrorCatch from "../ui/ErrorMessage.jsx";
import Typography from "@mui/material/Typography";
import {useParams} from "react-router";

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
    const [ loading, setLoading ] = useState(false)
    const [regions, setTimeRegion] = useState([])
    const {server_id} = useParams()
    useEffect(() => {
        setLoading(true)
        fetchServerUrl(server_id, `/players/${playerId}/regions`)
            .then(resp => resp.map(e => ({x: e.name, y: e.duration / 3600})))
            .then(r => {
                setTimeRegion(r)
                setLoading(false)
            })
            .catch(e => setLoading(false))
    }, [server_id, playerId])
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
        <Typography component="h2" variant="body" style={{margin: '0'}}>Region</Typography>
        <div style={{height: '300px', width: '100%'}}>
            {!loading && <PolarArea options={options} data={data}/>}
            {loading && <p>Just imagine this is a loading graph</p>}
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

