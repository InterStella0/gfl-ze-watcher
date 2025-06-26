import {useContext, useEffect, useState} from "react";
import PlayerContext from "./PlayerContext.jsx";
import {fetchServerUrl} from "../../utils.jsx";
import {REGION_COLORS} from "../graphs/ServerGraph.jsx";
import {Paper, Skeleton} from "@mui/material";
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
import Box from "@mui/material/Box";
import WarningIcon from "@mui/icons-material/Warning";

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
    const [ error, setError ] = useState(null)
    const [regions, setTimeRegion] = useState([])
    const {server_id} = useParams()
    useEffect(() => {
        setLoading(true)
        setError(null)
        setTimeRegion([])
        fetchServerUrl(server_id, `/players/${playerId}/regions`)
            .then(resp => resp.map(e => ({x: e.name, y: e.duration / 3600})))
            .then(r => {
                setTimeRegion(r)
            })
            .catch(setError)
            .finally(() => setLoading(false))
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
        <Typography component="h2" variant="body" m="1rem">Region</Typography>
        <Box sx={{height: {xl: '350px', lg: '385px'}}} display="flex" alignItems="center" justifyContent="center" m="1rem">
            {error &&
                <Box display="flex" gap="1rem">
                    <WarningIcon />
                    <Typography>{error.message || "Something went wrong :/"}</Typography>
                </Box>}
            {!error && !loading && <PolarArea options={options} data={data}/>}
            {!error && loading && <Box p="50px"><Skeleton variant="circular" width={250} height={250} /> </Box>}
        </Box>
    </>
}
export default function PlayerRegionPlayTime(){
    return <Paper sx={{maxHeight: '500px', p: '.2rem'}} elevation={0}>
        <ErrorCatch message="Player region couldn't be loaded">
            <PlayerRegionPlayTimeDisplay />
        </ErrorCatch>
    </Paper>
}

