'use client'
import { useEffect, useState} from "react";
import {fetchServerUrl} from "utils/generalUtils.ts";
import {Bar} from "react-chartjs-2";
import { Info } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Skeleton } from "../ui/skeleton";
import ErrorCatch from "../ui/ErrorMessage.tsx";
import SkeletonBarGraph from "../graphs/SkeletonBarGraph.tsx";
import {useMapContext} from "../../app/servers/[server_slug]/maps/[map_name]/MapContext";
import {useServerData} from "../../app/servers/[server_slug]/ServerDataProvider";
import {MapSessionDistribution} from "types/maps.ts";

function AverageSessionDistribution() {
    const { name } = useMapContext();
    const [detail, setDetail] = useState<MapSessionDistribution[] | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { server } = useServerData()
    const server_id = server.id

    useEffect(() => {
        setLoading(true)
        setDetail(null)
        fetchServerUrl(server_id, `/maps/${name}/sessions_distribution`)
            .then((data: MapSessionDistribution[]) => {
                setDetail(data);
            })
            .catch(err => {
                setError(err.message || "Something went wrong");
            })
            .finally(() => setLoading(false))
    }, [server_id, name]);

    const labels = {
        "Under 10": "< 10 minutes",
        "10 - 30": "10 - 30 minutes",
        "30 - 45": "30 - 45 minutes",
        "45 - 60": "45 - 60 minutes",
        "Over 60": "> 60 minutes"
    };

    // Get theme-aware colors
    const getChartColors = () => {
        if (typeof window === 'undefined') return {
            backgroundColor: [
                'hsl(221.2 83.2% 53.3%)',
                'hsl(262.1 83.3% 57.8%)',
                'hsl(291.7 66.7% 64.7%)',
                'hsl(24.6 95% 53.1%)',
                'hsl(346.8 77.2% 49.8%)'
            ],
            borderColor: [
                'hsl(221.2 83.2% 53.3%)',
                'hsl(262.1 83.3% 57.8%)',
                'hsl(291.7 66.7% 64.7%)',
                'hsl(24.6 95% 53.1%)',
                'hsl(346.8 77.2% 49.8%)'
            ],
            gridColor: 'hsl(214.3 31.8% 91.4%)',
            tooltipBg: 'hsl(222.2 47.4% 11.2%)',
            textColor: 'hsl(222.2 47.4% 11.2%)'
        };

        const isDark = document.documentElement.classList.contains('dark');
        return {
            backgroundColor: isDark ? [
                'hsla(221.2, 83.2%, 53.3%, 0.7)',
                'hsla(262.1, 83.3%, 57.8%, 0.7)',
                'hsla(291.7, 66.7%, 64.7%, 0.7)',
                'hsla(24.6, 95%, 53.1%, 0.7)',
                'hsla(346.8, 77.2%, 49.8%, 0.7)'
            ] : [
                'hsla(221.2, 83.2%, 53.3%, 0.7)',
                'hsla(262.1, 83.3%, 57.8%, 0.7)',
                'hsla(291.7, 66.7%, 64.7%, 0.7)',
                'hsla(24.6, 95%, 53.1%, 0.7)',
                'hsla(346.8, 77.2%, 49.8%, 0.7)'
            ],
            borderColor: isDark ? [
                'hsl(221.2, 83.2%, 53.3%)',
                'hsl(262.1, 83.3%, 57.8%)',
                'hsl(291.7, 66.7%, 64.7%)',
                'hsl(24.6, 95%, 53.1%)',
                'hsl(346.8, 77.2%, 49.8%)'
            ] : [
                'hsl(221.2, 83.2%, 53.3%)',
                'hsl(262.1, 83.3%, 57.8%)',
                'hsl(291.7, 66.7%, 64.7%)',
                'hsl(24.6, 95%, 53.1%)',
                'hsl(346.8, 77.2%, 49.8%)'
            ],
            gridColor: isDark ? 'hsla(217.2, 32.6%, 17.5%, 0.3)' : 'hsla(214.3, 31.8%, 91.4%, 0.3)',
            tooltipBg: isDark ? 'hsl(222.2, 84%, 4.9%)' : 'hsl(0, 0%, 100%)',
            textColor: isDark ? 'hsl(210, 40%, 98%)' : 'hsl(222.2, 47.4%, 11.2%)'
        };
    };

    const colors = getChartColors();

    const data = {
        labels: Object.values(labels),
        datasets: [{
            axis: 'y',
            data: Object.keys(labels).map(e => detail?.find(d => d.session_range === e)?.session_count ?? 0),
            fill: false,
            backgroundColor: colors.backgroundColor,
            borderColor: colors.borderColor,
            borderWidth: 1,
            borderRadius: 4,
            barThickness: 25,
            label: 'Number of Sessions'
        }]
    };

    const options: any = {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: colors.tooltipBg,
                titleColor: colors.textColor,
                bodyColor: colors.textColor,
                borderColor: colors.gridColor,
                borderWidth: 1,
                titleFont: {
                    size: 14,
                    weight: 'bold'
                },
                bodyFont: {
                    size: 13
                },
                padding: 10,
                cornerRadius: 4
            }
        },
        scales: {
            x: {
                grid: {
                    color: colors.gridColor
                },
                ticks: {
                    color: colors.textColor,
                    font: {
                        weight: 'bold'
                    }
                }
            },
            y: {
                grid: {
                    display: false
                },
                ticks: {
                    color: colors.textColor,
                    font: {
                        weight: 'bold'
                    }
                }
            }
        }
    };

    if (error) {
        return (
            <Card className="p-6 rounded-lg h-[300px] flex items-center justify-center">
                <p className="text-destructive">{error}</p>
            </Card>
        );
    }

    return (
        <Card className="p-6 rounded-lg transition-transform duration-300">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-primary">Session Duration Distribution</h2>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Info className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Shows how long players spent in each of their session</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>


            {loading &&  <SkeletonBarGraph sx={{mt: '2rem'}} height={200} amount={5} barHeight={23} width={400} gap={'1.3rem'} />}

            {!loading && <div className="h-[300px]">
                <Bar data={data} options={options}/>
            </div>}

            <div className="mt-4 flex justify-end">
                {!loading && <p className="text-sm text-muted-foreground">
                    Total sessions: {detail?.reduce((acc, curr) => acc + curr.session_count, 0) || 0}
                </p>
                }
                {loading && <div className="flex items-center gap-1">
                    <p className="text-sm text-muted-foreground">
                        Total sessions:
                    </p>
                    <Skeleton className="w-8 h-4" />
                </div>}
            </div>

        </Card>
    );
}

export default function MapAverageSessionDistribution(){
    return <ErrorCatch message="Map average session distribution had an error :/">
        <AverageSessionDistribution />
    </ErrorCatch>
}