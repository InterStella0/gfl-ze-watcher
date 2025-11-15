'use client'
import { useEffect, useMemo, useState } from "react";
import {fetchServerUrl} from "utils/generalUtils.ts";
import dayjs from "dayjs";
import GraphSkeleton from "../graphs/GraphSkeleton.jsx";
import { Bar } from "react-chartjs-2";
import {
    BarController, BarElement, CategoryScale, LinearScale,
    Chart as ChartJS, Legend, TimeScale, Title, Tooltip
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import ErrorCatch from "../ui/ErrorMessage.jsx";

ChartJS.register(
    BarElement,
    BarController,
    CategoryScale,
    LinearScale,
    Title,
    Tooltip,
    Legend,
    TimeScale,
    zoomPlugin
)

function PlayerPlayTimeGraphInfo({ groupBy, player, server }){
    const playerId = player.id;
    const server_id = server.id;
    const [ startDate, setStartDate ] = useState()
    const [ endDate, setEndDate ] = useState()
    const [ sessions, setSessions ] = useState([])
    const [ result, setResult ] = useState([])
    const [ preResult, setPreResult ] = useState()
    const [ yAxis, setYAxis ] = useState()
    const [ loading, setLoading ] = useState(false)

    useEffect(() => {
        setLoading(true)
        fetchServerUrl(server_id, `/players/${playerId}/graph/sessions`)
            .then(setPreResult)
            .finally(() => setLoading(false))
    }, [ server_id, playerId ])

    useEffect(() => {
        if (!preResult) return
        const grouped = new Map();

        preResult.forEach(e => {
            const date = dayjs(e.bucket_time);

            let key = "";
            switch (groupBy) {
                case "monthly":
                    key = date.format("YYYY-MM");
                    break;
                case "yearly":
                    key = date.format("YYYY");
                    break;
                default:
                    key = date.format("YYYY-MM-DD");
            }

            grouped.set(key, (grouped.get(key) || 0) + e.hours);
        });

        const result = Array.from(grouped.entries()).map(([key, y]) => {
            let date;
            switch (groupBy) {
                case "monthly":
                    date = dayjs(key + "-01");
                    break;
                case "yearly":
                    date = dayjs(key + "-01-01");
                    break;
                default:
                    date = dayjs(key);
            }

            return {
                x: groupBy === "yearly" ? key : date,
                y
            };
        })

        let max
        let min
        if (result.length === 0){
            max = dayjs()
            min = dayjs()
        }else{
            max = result[0].x
            min = result[0].x
        }
        let yMin = 0
        let yMax = 0

        for(const current of result){
            yMax = Math.max(yMax, current.y)
            if (groupBy !== "yearly") {
                const c = current.x
                if (c.isBefore(min)){
                    min = c
                }else if (c.isAfter(max)){
                    max = c
                }
            }
        }

        if (groupBy !== "yearly") {
            setStartDate(min)
            setEndDate(max)
        }
        setYAxis({min: yMin, max: yMax})
        setSessions(result.map(e => ({
            x: groupBy === "yearly" ? e.x : e.x.toDate(),
            y: e.y
        })))
    }, [preResult, groupBy])

    const dataset = useMemo(() => [{
        label: 'Player Hours',
        data: sessions,
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        borderWidth: '1',
        pointRadius: 0
    }], [sessions])

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
            x: groupBy === "yearly" ? {
                type: 'category',
                title: {text: "Year", display: true},
            } : {
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
    }), [yAxis, startDate, endDate, groupBy])

    const data = { datasets: dataset }
    return <>{loading? <GraphSkeleton height={200} width="95%" sx={{margin: '1rem'}} />:
        <div style={{height: '200px', margin: '1rem'}}>
            {(groupBy === "yearly" || (startDate && endDate)) &&
                <Bar data={data} options={options} />}
        </div>}
    </>
}

export default function PlayerPlayTimeGraph({ groupBy, player, server }){
    return <ErrorCatch message="Graph failed to be rendered.">
        <PlayerPlayTimeGraphInfo groupBy={groupBy} player={player} server={server} />
    </ErrorCatch>
}