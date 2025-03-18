import {Chart as ChartJS, Filler, LinearScale, LineController, LineElement, TimeScale} from "chart.js";
import {useEffect, useMemo, useRef, useState} from "react";
import dayjs from "dayjs";
import {fetchUrl, SERVER_WATCH} from "../utils.jsx";
import {Line} from "react-chartjs-2";

ChartJS.register(
    LinearScale,
    LineElement,
    LineController,
    TimeScale, Filler
);

export default function SessionPlayedGraph({ start, end }){
    const [ playerCount, setPlayerCount ] = useState(null)
    const graphRef = useRef(null);
    const observerRef = useRef(null);
    const [isVisible, setIsVisible] = useState(false);
    useEffect(() => {
        observerRef.current = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting);
            },
            { threshold: .5 }
        );

        if (graphRef.current) {
            observerRef.current.observe(graphRef.current);
        }

        setPlayerCount(null)
        return () => {
            if (observerRef.current && graphRef.current) {
                observerRef.current.unobserve(graphRef.current);
            }
        }
    }, [start, end])

    useEffect(() => {
        if (!isVisible || playerCount !== null) return

        const startDate = dayjs(start)
        const endDate = end !== null? dayjs(end): dayjs()
        const params = {start: startDate.toJSON(), end: endDate.toJSON()}
        fetchUrl(`/graph/${SERVER_WATCH}/unique_players`, { params })
            .then(data => data.map(e => ({x: e.bucket_time, y: e.player_count})))
            .then(data => {
                setPlayerCount(data)
            })
    }, [ start, end, isVisible, playerCount ])

    const options = useMemo(() => ({
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        elements: {
            line: {
                tension: 0.4,
                borderWidth: 0
            }
        },
        scales: {
            x: {
                border: {
                    display: false
                },
                type: 'time',
                time: {
                    displayFormats: {
                        minute: 'MMM DD, h:mm a',
                        hour: 'MMM DD, ha',
                    },
                },
                ticks: { display: false },
                grid: {  display: false  }
            },
            y: {
                max: 64,
                min: 0,
                border: { display: false },
                ticks: { display: false },
                grid: { display: false  }
            }
        },
        plugins: {
            legend: { display: false },
            title: { display: false },
            tooltip: { enabled: false }
        },
        interaction: {
            mode: 'none',
            intersect: false
        },
        hover: { mode: null },
    }), [])
    const data = {
        datasets: [{
            data: playerCount ?? [],
            borderColor: "#c2185b",
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.2,
            fill: true,
            backgroundColor: function (context) {
                const chart = context.chart;
                const { ctx, chartArea } = chart;

                if (!chartArea) return; // initial
                let gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                gradient.addColorStop(1, "rgba(244,143,177, 0.6)");
                gradient.addColorStop(0.7, "rgba(244,143,177, 0.3)");
                gradient.addColorStop(0, "rgba(244,143,177, 0)");
                return gradient;
            },
        }]
    }
    return <div ref={graphRef} style={{
        width: '100%',
        height: '100%',
        maxHeight: '50px'
    }}><Line data={data} options={options} /></div>
}