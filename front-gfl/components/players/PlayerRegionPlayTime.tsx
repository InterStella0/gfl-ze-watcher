'use client'
import {use, useEffect, useState} from "react";
import {fetchApiServerUrl, fetchServerUrl, REGION_COLORS, StillCalculate} from "utils/generalUtils";
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
import ErrorCatch from "../ui/ErrorMessage.tsx";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import WarningIcon from "@mui/icons-material/Warning";
import {ServerPlayerDetailed} from "../../app/servers/[server_slug]/players/[player_id]/page.tsx";
import {PlayerRegionTime} from "types/players.ts";

ChartJS.register(
    Title,
    Tooltip,
    Legend,
    PolarAreaController,
    ArcElement,
    RadialLinearScale
)
type RegionChartData = { x: string; y: number };
function PlayerRegionPlayTimeDisplay({ serverPlayerPromise }: { serverPlayerPromise: Promise<ServerPlayerDetailed>}){
    const { server, player } = use(serverPlayerPromise);
    const playerId = !(player instanceof StillCalculate)? player.id: null
    const [ loading, setLoading ] = useState<boolean>(false)
    const [ error, setError ] = useState<Error | null>(null)
    const [regions, setTimeRegion] = useState<RegionChartData[]>([])
    const server_id = server.id
    useEffect(() => {
        if (playerId === null) return

        setLoading(true)
        setError(null)
        setTimeRegion([])
        fetchApiServerUrl(server_id, `/players/${playerId}/regions`)
            .then((resp: PlayerRegionTime[]) => resp.map(e => ({x: e.name, y: e.duration / 3600})))
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
        <Typography component="h2" m="1rem">Region</Typography>
        <Box sx={{height: {xl: '350px', lg: '385px'}}} display="flex" alignItems="center" justifyContent="center" m="1rem">
            {error &&
                <Box display="flex" gap="1rem">
                    <WarningIcon />
                    <Typography>{error.message || "Something went wrong :/"}</Typography>
                </Box>}
            {!error && !loading && <PolarArea options={options}
                                              // @ts-ignore
                                              data={data}/>}
            {!error && loading && <Box p="50px"><Skeleton variant="circular" width={250} height={250} /> </Box>}
        </Box>
    </>
}
export default function PlayerRegionPlayTime({ serverPlayerPromise }: { serverPlayerPromise: Promise<ServerPlayerDetailed>}){
    return <Paper sx={{height: '500px', p: '.2rem'}} elevation={0}>
        <ErrorCatch message="Player region couldn't be loaded">
            <PlayerRegionPlayTimeDisplay serverPlayerPromise={serverPlayerPromise}  />
        </ErrorCatch>
    </Paper>
}

