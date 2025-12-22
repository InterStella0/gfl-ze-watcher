'use client'
import {use, useEffect, useState} from "react";
import {fetchApiServerUrl, REGION_COLORS, StillCalculate} from "utils/generalUtils";
import { Card } from "components/ui/card";
import { Skeleton } from "components/ui/skeleton";
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
import { AlertCircle } from "lucide-react";
import {ServerPlayerDetailed} from "../../app/servers/[server_slug]/players/[player_id]/page.tsx";
import {PlayerRegionTime} from "types/players.ts";
import { useTheme } from "next-themes";

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
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
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
            r: {
                ticks: {
                    color: isDark ? 'hsl(215 20.2% 65.1%)' : 'hsl(215.4 16.3% 46.9%)',
                    backdropColor: isDark ? 'hsl(222.2 84% 4.9%)' : 'hsl(0 0% 100%)',
                },
                grid: {
                    color: isDark ? 'hsl(217.2 32.6% 17.5%)' : 'hsl(214.3 31.8% 91.4%)',
                },
                pointLabels: {
                    color: isDark ? 'hsl(210 40% 98%)' : 'hsl(222.2 47.4% 11.2%)',
                }
            }
        },
        plugins: {
            legend: {
                labels: {
                    color: isDark ? 'hsl(210 40% 98%)' : 'hsl(222.2 47.4% 11.2%)',
                }
            },
            tooltip: {
                backgroundColor: isDark ? 'rgba(50, 50, 50, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                titleColor: isDark ? 'hsl(210 40% 98%)' : 'hsl(222.2 47.4% 11.2%)',
                bodyColor: isDark ? 'hsl(210 40% 98%)' : 'hsl(222.2 47.4% 11.2%)',
                borderColor: isDark ? 'hsl(217.2 32.6% 17.5%)' : 'hsl(214.3 31.8% 91.4%)',
                borderWidth: 1,
            }
        }
    }
    const data = {
        labels: regions.map(e => e.x),
        datasets: [{
            label: 'Hours',
            data: regions.map(e => e.y),
            borderWidth: 2,
            borderColor: isDark ? 'hsl(217.2 32.6% 17.5%)' : 'hsl(0 0% 100%)',
            backgroundColor: regions.map(e => REGION_COLORS[e.x])
        }]
    }
    return (
        <div>
            <h2 className="text-xl font-semibold m-4">Region</h2>
            <div className="h-[350px] xl:h-[350px] lg:h-[385px] flex items-center justify-center m-4">
                {error &&
                    <div className="flex gap-4">
                        <AlertCircle className="w-5 h-5" />
                        <p>{error.message || "Something went wrong :/"}</p>
                    </div>}
                {!error && !loading && <PolarArea options={options}
                                          // @ts-ignore
                                          data={data}/>}
                {!error && loading && <div className="p-12"><Skeleton className="w-[250px] h-[250px] rounded-full" /> </div>}
            </div>
        </div>
    )
}
export default function PlayerRegionPlayTime({ serverPlayerPromise }: { serverPlayerPromise: Promise<ServerPlayerDetailed>}){
    return <Card className="h-[500px] p-1">
        <ErrorCatch message="Player region couldn't be loaded">
            <PlayerRegionPlayTimeDisplay serverPlayerPromise={serverPlayerPromise}  />
        </ErrorCatch>
    </Card>
}
