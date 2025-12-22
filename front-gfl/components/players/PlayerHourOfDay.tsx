'use client'
import ErrorCatch from "../ui/ErrorMessage.tsx";
import {use, useEffect, useMemo, useState} from "react";
import {fetchApiServerUrl, StillCalculate} from "utils/generalUtils.ts";
import {BarController, BarElement, Chart as ChartJS, Legend, TimeScale, Title, Tooltip} from "chart.js";
import GraphSkeleton from "../graphs/GraphSkeleton.tsx";
import {Bar} from "react-chartjs-2";
import { Card } from "components/ui/card";
import { Button } from "components/ui/button";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { AlertCircle } from "lucide-react";
import {ServerPlayerDetailed} from "../../app/servers/[server_slug]/players/[player_id]/page.tsx";
import {PlayerHourDay} from "types/players.ts";
import { useTheme } from "next-themes";

dayjs.extend(utc)
dayjs.extend(timezone)

ChartJS.register(
    BarElement,
    BarController,
    Title,
    Tooltip,
    Legend,
    TimeScale
)

function PlayerHourOfDayDisplay({ serverPlayerPromise }: { serverPlayerPromise: Promise<ServerPlayerDetailed>}){
    const { server, player } = use(serverPlayerPromise);
    const playerId = !(player instanceof StillCalculate)? player.id: null
    const server_id = server.id
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const [ hours, setHours ] = useState<PlayerHourDay[]>([])
    const [ loading, setLoading ] = useState<boolean>(false)
    const [ error, setError ] = useState<Error | null>(null)
    const [ mode, setMode ] = useState<string>("user")
    const yAxis = useMemo(() => {
        let yMax = hours.reduce((a, b) => Math.max(a,  b.count), 0)
        return {min: 0, max: yMax}
    }, [hours])

    useEffect(() => {
        setLoading(true)
        setHours([])
        fetchApiServerUrl(server_id, `/players/${playerId}/hours_of_day`)
            .then(setHours)
            .catch(setError)
            .finally(() => setLoading(false))
    }, [server_id, playerId])

    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        tooltip: {
            position: 'nearest' as const,
            backgroundColor: isDark ? 'rgba(50, 50, 50, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            titleColor: isDark ? 'hsl(210 40% 98%)' : 'hsl(222.2 47.4% 11.2%)',
            bodyColor: isDark ? 'hsl(210 40% 98%)' : 'hsl(222.2 47.4% 11.2%)',
            borderColor: isDark ? 'hsl(217.2 32.6% 17.5%)' : 'hsl(214.3 31.8% 91.4%)',
            borderWidth: 1,
        },
        interaction: {
            mode: 'x' as const,
            intersect: false,
        },
        scales: {
            x: {
                title: {
                    text: "Hour of day",
                    display: true,
                    color: isDark ? 'hsl(215 20.2% 65.1%)' : 'hsl(215.4 16.3% 46.9%)',
                },
                ticks: {
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
                grid: {
                    color: isDark ? 'hsl(217.2 32.6% 17.5%)' : 'hsl(214.3 31.8% 91.4%)',
                }
            }
        },
        plugins: {
            legend: {
                labels: {
                    color: isDark ? 'hsl(210 40% 98%)' : 'hsl(222.2 47.4% 11.2%)',
                }
            }
        }
    }), [yAxis, isDark])

    const data = useMemo(() => {
        const timeZone = dayjs.tz.guess();

        const convertHour = (utcHour: number) => {
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
                borderColor: isDark ? 'hsl(142.1 76.2% 36.3%)' : 'hsl(142.1 70.6% 45.3%)',
                backgroundColor: isDark ? 'hsla(142.1 76.2% 36.3% / 0.3)' : 'hsla(142.1 70.6% 45.3% / 0.2)',
                borderWidth: 2,
                pointRadius: 0
            },
            {
                label: 'Leave Count',
                data: leave,
                borderColor: isDark ? 'hsl(0 84.2% 60.2%)' : 'hsl(0 72.2% 50.6%)',
                backgroundColor: isDark ? 'hsla(0 84.2% 60.2% / 0.3)' : 'hsla(0 72.2% 50.6% / 0.2)',
                borderWidth: 2,
                pointRadius: 0
            }
        ];

        return {
            labels: Array.from({ length: 24 }).map((_, i) => i),
            datasets: dataset
        };
    }, [hours, mode, isDark]);

    if (error){
        return (
            <div>
                <div className="flex items-center justify-between flex-col sm:flex-row">
                    <h2 className="text-xl font-semibold p-4">
                        Session Hour Of Day Distribution
                    </h2>
                    <div className="m-4">
                        <AlertCircle className="w-5 h-5" />
                    </div>
                </div>
                <div className="h-[375px] flex items-center justify-center">
                    <p>{error.message || "Something went wrong :/"}</p>
                </div>
            </div>
        )
    }
    return (
        <div>
            <div className="flex items-center justify-between flex-col sm:flex-row">
                <h2 className="text-xl font-semibold p-4">
                    Session Hour Of Day Distribution
                </h2>
                <div className="m-4">
                    <div className="flex gap-1 rounded-md border">
                        <Button
                            variant={mode === 'user' ? "default" : "ghost"}
                            onClick={() => setMode("user")}
                            size="sm"
                        >
                            My Timezone
                        </Button>
                        <Button
                            variant={mode !== 'user' ? "default" : "ghost"}
                            onClick={() => setMode("UTC")}
                            size="sm"
                        >
                            UTC
                        </Button>
                    </div>
                </div>
            </div>
            {loading ? <GraphSkeleton height={375} sx={{margin: '1rem'}} /> :
                <div className="h-[375px] m-4 p-2">
                    <Bar data={data}
                         // @ts-ignore
                         options={options} />
                </div>
            }
        </div>
    )
}
export default function PlayerHourOfDay({ serverPlayerPromise }: { serverPlayerPromise: Promise<ServerPlayerDetailed>}){
    return <ErrorCatch message="Error fetching player hour of day!">
        <Card>
            <PlayerHourOfDayDisplay serverPlayerPromise={serverPlayerPromise} />
        </Card>
    </ErrorCatch>
}
