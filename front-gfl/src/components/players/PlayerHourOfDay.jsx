import ErrorCatch from "../ui/ErrorMessage.jsx";
import {useCallback, useContext, useEffect, useMemo, useState} from "react";
import PlayerContext from "./PlayerContext.jsx";
import {fetchServerUrl} from "../../utils.jsx";
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

function PlayerHourOfDayDisplay(){
    const { playerId } = useContext(PlayerContext);
    const {server_id} = useParams()
    const [ hours, setHours ] = useState([])
    const [ loading, setLoading ] = useState(false)
    const [ mode, setMode ] = useState("user")
    const yAxis = useMemo(() => {
        let yMax = hours.reduce((a, b) => Math.max(a,  b.count), 0)
        return {min: 0, max: yMax}
    }, [hours])


    useEffect(() => {
        setLoading(true)
        fetchServerUrl(server_id, `/players/${playerId}/hours_of_day`)
            .then(setHours)
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
                title: {text: "Hour of day (UTC)", display: true},
            },
            y: yAxis
        },
        plugins: {
            legend: {
                position: 'top',
            },
            zoom: {
                pan: {
                    enabled: true,
                    mode: 'x'
                },
                zoom: {
                    wheel: {
                        enabled: true,
                    },
                    pinch: {
                        enabled: true
                    },
                    mode: 'x'
                }
            }
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
                x: (mode === "UTC" ? e.hour : convertHour(e.hour)) + 1
            }));

        const leave = hours
            .filter(e => e.event_type === "Leave")
            .map(e => ({
                y: e.count,
                x: (mode === "UTC" ? e.hour : convertHour(e.hour)) + 1
            }));

        const dataset = [
            {
                label: 'Join Hour',
                data: join,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.4)',
                borderWidth: 1,
                pointRadius: 0
            },
            {
                label: 'Leave Hour',
                data: leave,
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.4)',
                borderWidth: 1,
                pointRadius: 0
            }
        ];

        return {
            labels: Array.from({ length: 24 }).map((_, i) => i + 1),
            datasets: dataset
        };
    }, [hours, mode]);

    return <>
        <Box display="flex" justifyContent="space-between">
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
        {loading? <GraphSkeleton height={200} sx={{margin: '1rem'}} />:
            <div style={{height: '375px', margin: '1rem', padding:'.5rem'}}>
                <Bar data={data} options={options} />
            </div>
        }
        </>
}
export default function PlayerHourOfDay(){
    return <ErrorCatch>
        <Paper
            elevation={0}
        >
            <PlayerHourOfDayDisplay />
        </Paper>
    </ErrorCatch>
}