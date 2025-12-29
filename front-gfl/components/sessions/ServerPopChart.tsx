'use client'
import { useTheme } from 'next-themes';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from 'components/ui/card';
import { LazyLineChart as Line } from 'components/graphs/LazyCharts';
import { getServerPopChartData, getChartOptionsWithAnnotations } from 'utils/sessionUtils.js';
import {
    PlayerSessionMapPlayed,
    ServerGraphType, SessionInfo, SessionType
} from "../../app/servers/[server_slug]/util";
import {
    Chart as ChartJS, Filler,
    Legend,
    LinearScale, LineElement, PointElement, TimeScale,
    Title,
    Tooltip
} from "chart.js";
import 'chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm';
import {useMemo} from "react";

ChartJS.register(
    LinearScale,
    Title,
    Tooltip,
    Legend,
    TimeScale,
    PointElement,
    LineElement,
    Filler,
)

export function ServerPopChart<T extends SessionType>(
    { sessionInfo, serverGraph, maps }:
    { sessionInfo: SessionInfo<T>, serverGraph: ServerGraphType<T>, maps: PlayerSessionMapPlayed[] | null }
) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const data = useMemo(() => getServerPopChartData(serverGraph, isDark), [isDark])

    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle>Server Population During Session</CardTitle>
                <CardDescription>Population changes throughout the session</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <Line
                        data={data}
                        // @ts-ignore
                        options={getChartOptionsWithAnnotations(maps, sessionInfo, false, 64, isDark)}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
