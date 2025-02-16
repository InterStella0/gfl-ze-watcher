import {useContext, useEffect, useMemo, useState} from "react";
import {fetchUrl} from "../utils.jsx";
import dayjs from "dayjs";
import GraphSkeleton from "./GraphSkeleton.jsx";
import {Bar} from "react-chartjs-2";
import PlayerContext from "./PlayerContext.jsx";
import {
    BarController, BarElement,
    Chart as ChartJS, Legend, TimeScale, Title, Tooltip
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
ChartJS.register(
    BarElement,
    BarController,
    Title,
    Tooltip,
    Legend,
    TimeScale,
    zoomPlugin
)
export default function PlayerPlayTimeGraph(){
    const { playerId } = useContext(PlayerContext)
    const [ startDate, setStartDate ] = useState()
    const [ endDate, setEndDate ] = useState()
    const [ sessions, setSessions ] = useState()
    const [ yAxis, setYAxis ] = useState()
    const [ loading, setLoading ] = useState(false)
    useEffect(() => {
        setLoading(true)
        fetchUrl(`/players/${playerId}/graph/sessions`)
            .then(resp => resp.map(e => ({y: e.hours, x: e.bucket_time})))
            .then(result => {
                let max = dayjs(result[0].x)
                let min = dayjs(result[0].x)
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
    }, [ playerId ])
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