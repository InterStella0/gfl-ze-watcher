'use client'
import ErrorCatch from "../ui/ErrorMessage.jsx";
import {useContext, useEffect, useMemo, useState} from "react";
import PlayerContext from "./PlayerContext.jsx";
import {fetchServerUrl} from "utils/generalUtils.ts";
import {useParams} from "react-router";
import {BarController, BarElement, Chart as ChartJS, Legend, TimeScale, Title, Tooltip} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import GraphSkeleton from "../graphs/GraphSkeleton.jsx";
import {Bar} from "react-chartjs-2";
import Paper from "@mui/material/Paper";
import {ButtonGroup, Typography} from "@mui/material";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import WarningIcon from "@mui/icons-material/Warning";

dayjs.extend(utc)
dayjs.extend(timezone)
ChartJS.register(
    BarElement,
    BarController,
    Title,
    Tooltip,
    Legend,
    TimeScale,
    zoomPlugin
)

function PlayerHourOfDayDisplay({ server, player}){
    const playerId = player.id
    const server_id = server.id
    const [ hours, setHours ] = useState([])
    const [ loading, setLoading ] = useState(false)
    const [ error, setError ] = useState(null)
    const [ mode, setMode ] = useState("user")
    const yAxis = useMemo(() => {
        let yMax = hours.reduce((a, b) => Math.max(a,  b.count), 0)
        return {min: 0, max: yMax}
    }, [hours])


    useEffect(() => {
        setLoading(true)
        setHours([])
        fetchServerUrl(server_id, `/players/${playerId}/hours_of_day`)
            .then(setHours)
            .catch(setError)
            .finally(() => setLoading(false))
    }, [server_id, playerId])

    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        tooltip: {
            position: 'nearest'
        },
        interaction: {
            mode: 'x',
            intersect: false,
        },
        scales: {
            x: {
                title: {text: "Hour of day", display: true},
            },
            y: yAxis
        },
    }), [yAxis])

    const data = useMemo(() => {
        const timeZone = dayjs.tz.guess();

        const convertHour = (utcHour) => {
            const utcTime = dayjs.utc().startOf('day').add(utcHour, 'hour');
            const localTime = utcTime.tz(timeZone);
            return localTime.hour()
        };

        const join = hours
            .filter(e => e.event_type === "Join")
            .map(e => ({
                y: e.count,
                x: (mode === "UTC" ? e.hour : convertHour(e.hour))
            }));

        const leave = hours
            .filter(e => e.event_type === "Leave")
            .map(e => ({
                y: e.count,
                x: (mode === "UTC" ? e.hour : convertHour(e.hour))
            }));

        const dataset = [
            {
                label: 'Join Count',
                data: join,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.4)',
                borderWidth: 1,
                pointRadius: 0
            },
            {
                label: 'Leave Count',
                data: leave,
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.4)',
                borderWidth: 1,
                pointRadius: 0
            }
        ];

        return {
            labels: Array.from({ length: 24 }).map((_, i) => i),
            datasets: dataset
        };
    }, [hours, mode]);

    if (error){
        return <>
            <Box display="flex" alignItems="center" justifyContent="space-between" flexDirection={{xs: 'column', sm: 'row'}}>
                <Typography
                    variant="h6"
                    component="h2"
                    fontWeight="600"
                    sx={{ color: 'text.primary' }}
                    p="1rem"
                >
                    Session Hour Of Day Distribution
                </Typography>
                <Box m="1rem">
                    <WarningIcon />
                </Box>
            </Box>
           <Box height="375px" display="flex" alignItems="center" justifyContent="center">
               <Typography>{error.message || "Something went wrong :/"}</Typography>
           </Box>
        </>
    }
    return <>
        <Box display="flex" alignItems="center" justifyContent="space-between" flexDirection={{xs: 'column', sm: 'row'}}>
            <Typography
                variant="h6"
                component="h2"
                fontWeight="600"
                sx={{ color: 'text.primary' }}
                p="1rem"
            >
                Session Hour Of Day Distribution
            </Typography>
            <Box m="1rem">
                <ButtonGroup variant="contained" aria-label="timezone selection">
                    <Button onClick={() => setMode("user")} variant={mode !== 'user'? "outlined": "contained"}>My Timezone</Button>
                    <Button onClick={() => setMode("UTC")} variant={mode !== 'user'? "contained": "outlined"}>UTC</Button>
                </ButtonGroup>
            </Box>
        </Box>
        {loading? <GraphSkeleton height={375} sx={{margin: '1rem'}} />:
            <div style={{height: '375px', margin: '1rem', padding:'.5rem'}}>
                <Bar data={data} options={options} />
            </div>
        }
        </>
}
export default function PlayerHourOfDay({ server, player }){
    return <ErrorCatch message="Error fetching player hour of day!">
        <Paper
            elevation={0}
        >
            <PlayerHourOfDayDisplay server={server} player={player}  />
        </Paper>
    </ErrorCatch>
}