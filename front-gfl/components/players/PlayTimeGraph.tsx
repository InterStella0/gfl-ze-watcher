'use client'
import { useEffect, useMemo, useState } from "react";
import {fetchApiServerUrl, formatHours, formatNumber} from "utils/generalUtils.ts";
import dayjs from "dayjs";
import GraphSkeleton from "../graphs/GraphSkeleton.tsx";
import { LazyBarChart as Bar } from "components/graphs/LazyCharts";
import {
    BarController, BarElement, CategoryScale, LinearScale,
    Chart as ChartJS, Legend, TimeScale, Title, Tooltip
} from "chart.js";
import ErrorCatch from "../ui/ErrorMessage.tsx";
import { useTheme } from "next-themes";
import { ScreenReaderOnly } from "components/ui/ScreenReaderOnly";
import { calculateTimeSeriesStats, generateSeoTable } from "utils/chartSeoUtils.tsx";
import {PlayerSessionTime} from "components/players/PlayTimeHeatmap.tsx";

ChartJS.register(
    BarElement,
    BarController,
    CategoryScale,
    LinearScale,
    Title,
    Tooltip,
    Legend,
    TimeScale
)

function PlayerPlayTimeGraphInfo({ groupBy, player, server }){
    const playerId = player.id;
    const server_id = server.id;
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const [ startDate, setStartDate ] = useState()
    const [ endDate, setEndDate ] = useState()
    const [ sessions, setSessions ] = useState([])
    const [ preResult, setPreResult ] = useState<PlayerSessionTime[]>()
    const [ yAxis, setYAxis ] = useState()
    const [ loading, setLoading ] = useState(false)
    useEffect(() => {
        import('chartjs-plugin-zoom').then((module) => {
            ChartJS.register(module.default);
        });
    }, []);

    useEffect(() => {
        setLoading(true)
        fetchApiServerUrl(server_id, `/players/${playerId}/graph/sessions`)
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

    const dataset = useMemo(() => {
        const primaryColor = isDark? 'oklch(0.627 0.2 340)': 'oklch(0.828 0.1 340)' // --chart-4
        const primaryColorAlpha = isDark? 'oklch(0.627 0.2 340 / .30)': 'oklch(0.627 0.2 340 / .3)'
        return [{
            label: 'Player Hours',
            data: sessions,
            borderColor: primaryColor,
            backgroundColor: primaryColorAlpha,
            borderWidth: 2,
            pointRadius: 0
        }]
    }, [sessions, isDark])

    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        tooltip: {
            position: 'nearest',
            backgroundColor: isDark ? 'rgba(50, 50, 50, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            titleColor: isDark ? 'hsl(210 40% 98%)' : 'hsl(222.2 47.4% 11.2%)',
            bodyColor: isDark ? 'hsl(210 40% 98%)' : 'hsl(222.2 47.4% 11.2%)',
            borderColor: isDark ? 'hsl(217.2 32.6% 17.5%)' : 'hsl(214.3 31.8% 91.4%)',
            borderWidth: 1,
        },
        interaction: {
            mode: 'x',
            intersect: false,
        },
        scales: {
            x: groupBy === "yearly" ? {
                type: 'category',
                title: {
                    text: "Year",
                    display: true,
                    color: isDark ? 'hsl(215 20.2% 65.1%)' : 'hsl(215.4 16.3% 46.9%)',
                },
                ticks: {
                    color: isDark ? 'hsl(215 20.2% 65.1%)' : 'hsl(215.4 16.3% 46.9%)',
                },
                grid: {
                    color: isDark ? 'hsl(217.2 32.6% 17.5%)' : 'hsl(214.3 31.8% 91.4%)',
                }
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
                    maxRotation: 0,
                    color: isDark ? 'hsl(215 20.2% 65.1%)' : 'hsl(215.4 16.3% 46.9%)',
                },
                title: {
                    text: "Time",
                    display: true,
                    color: isDark ? 'hsl(215 20.2% 65.1%)' : 'hsl(215.4 16.3% 46.9%)',
                },
                grid: {
                    color: isDark ? 'hsl(217.2 32.6% 17.5%)' : 'hsl(214.3 31.8% 91.4%)',
                }
            },
            y: {
                ...yAxis,
                ticks: {
                    color: isDark ? 'hsl(215 20.2% 65.1%)' : 'hsl(215.4 16.3% 46.9%)',
                },
                title: {
                    text: "Hours",
                    display: true,
                    color: isDark ? 'hsl(215 20.2% 65.1%)' : 'hsl(215.4 16.3% 46.9%)',
                },
                grid: {
                    color: isDark ? 'hsl(217.2 32.6% 17.5%)' : 'hsl(214.3 31.8% 91.4%)',
                }
            }
        },
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: isDark ? 'hsl(210 40% 98%)' : 'hsl(222.2 47.4% 11.2%)',
                }
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
    }), [yAxis, startDate, endDate, groupBy, isDark])

    const summary = useMemo(() => {
        if (!sessions || sessions.length === 0) {
            return "No playtime data available.";
        }

        const data = sessions.map(s => ({
            label: s.date,
            value: s.duration * 3600  // secs to hrs
        }));
        const stats = calculateTimeSeriesStats(data);

        return `Player has logged ${formatHours(stats.total)} across ${formatNumber(stats.count)} ${groupBy} periods. ` +
            `Average: ${formatHours(stats.avg)} per period. Peak: ${formatHours(stats.max)}.`;
    }, [sessions, groupBy]);

    const seoTable = useMemo(() => {
        if (!sessions || sessions.length === 0) {
            return null;
        }

        const limitedData = sessions.slice(0, 15);
        const rows = limitedData.map(s => {
            let formattedDate = s.date;
            if (groupBy === 'daily') {
                formattedDate = dayjs(s.date).format('MMM D, YYYY');
            } else if (groupBy === 'weekly') {
                formattedDate = `Week of ${dayjs(s.date).format('MMM D, YYYY')}`;
            } else if (groupBy === 'monthly') {
                formattedDate = dayjs(s.date).format('MMMM YYYY');
            } else if (groupBy === 'yearly') {
                formattedDate = dayjs(s.date).format('YYYY');
            }

            return {
                Period: formattedDate,
                'Hours Played': formatHours(s.duration)
            };
        });

        return generateSeoTable(
            ['Period', 'Hours Played'],
            rows,
            `Player playtime by ${groupBy} (first 15 periods)`
        );
    }, [sessions, groupBy]);

    const data = { datasets: dataset }
    return <>{loading? <GraphSkeleton height={200} width="95%" sx={{margin: '1rem'}} />:
        <>
            <ScreenReaderOnly id="playtime-summary">
                {summary}
            </ScreenReaderOnly>
            <div
                role="img"
                aria-label={`Player playtime by ${groupBy} period`}
                aria-describedby="playtime-summary"
                style={{height: '200px', margin: '1rem'}}
            >
                {(groupBy === "yearly" || (startDate && endDate)) &&
                    <Bar data={data} options={options} />}
            </div>
            {seoTable && (
                <ScreenReaderOnly as="section">
                    {seoTable}
                </ScreenReaderOnly>
            )}
        </>
    }
    </>
}

export default function PlayerPlayTimeGraph({ groupBy, player, server }){
    return <ErrorCatch message="Graph failed to be rendered.">
        <PlayerPlayTimeGraphInfo groupBy={groupBy} player={player} server={server} />
    </ErrorCatch>
}