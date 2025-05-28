import { useContext, useEffect, useMemo, useState } from "react";
import {fetchServerUrl} from "../../utils.jsx";
import dayjs from "dayjs";
import GraphSkeleton from "../graphs/GraphSkeleton.jsx";
import { Bar } from "react-chartjs-2";
import PlayerContext from "./PlayerContext.jsx";
import {
    BarController, BarElement,
    Chart as ChartJS, Legend, TimeScale, Title, Tooltip
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import ErrorCatch from "../ui/ErrorMessage.jsx";
import {useParams} from "react-router";
ChartJS.register(
    BarElement,
    BarController,
    Title,
    Tooltip,
    Legend,
    TimeScale,
    zoomPlugin
)
function PlayerPlayTimeGraphInfo(){
    const { playerId } = useContext(PlayerContext)
    const [ startDate, setStartDate ] = useState()
    const [ endDate, setEndDate ] = useState()
    const [ sessions, setSessions ] = useState()
    const [ yAxis, setYAxis ] = useState()
    const [ loading, setLoading ] = useState(false)
    const {server_id} = useParams()
    useEffect(() => {
        setLoading(true)
        fetchServerUrl(server_id, `/players/${playerId}/graph/sessions`)
            .then(resp => resp.map(e => ({y: e.hours, x: e.bucket_time})))
            .then(result => {
                let max
                let min
                if (result.length === 0){
                    max = dayjs()
                    min = dayjs()
                }else{
                    max = dayjs(result[0].x)
                    min = dayjs(result[0].x)
                }
                let yMin = 0
                let yMax = 0

                for(const current of result){
                    yMax = Math.max(yMax, current.y)
                    const c = dayjs(current.x)
                    if (c.isBefore(min)){
                        min = c
                    }else if (c.isAfter(max)){
                        max = c
                    }
                }
                setStartDate(min)
                setEndDate(max)
                setYAxis({min: yMin, max: yMax})
                setLoading(false)
                return result
            })
            .then(setSessions)
    }, [ server_id, playerId ])
    const dataset = [{
        label: 'Player Hours',
        data: sessions,
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        borderWidth: '1',
        pointRadius: 0
    }]

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
                type: 'time',
                min: startDate?.toDate(),
                max: endDate?.toDate(),
                time: {
                    displayFormats: {
                        day: 'MMM DD',
                        week: 'MMM DD',
                        month: 'MMM YYYY',
                    }
                },
                ticks: {
                    autoSkip: true,
                    autoSkipPadding: 50,
                    maxRotation: 0
                },
                title: {text: "Time", display: true},
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
    }), [yAxis, startDate, endDate])

    const data = { datasets: dataset }
    return <>{loading? <GraphSkeleton height={200} width="95%" sx={{margin: '1rem'}} />:
        <div style={{height: '200px', margin: '1rem'}}>
            {startDate && endDate &&
                <Bar data={data} options={options} />}
        </div>}
    </>
}
export default function PlayerPlayTimeGraph(){
    return <ErrorCatch message="Graph failed to be rendered.">
        <PlayerPlayTimeGraphInfo />
    </ErrorCatch>
}