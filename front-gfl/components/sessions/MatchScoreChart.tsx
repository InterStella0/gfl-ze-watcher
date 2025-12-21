'use client'
import { useTheme } from 'next-themes';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from 'components/ui/card';
import { Line } from 'react-chartjs-2';
import { getMatchScoreChartData, getChartOptionsWithAnnotations } from 'utils/sessionUtils.js';
import {PlayerSession} from "types/players.js";
import {PlayerSessionMapPlayed} from "../../app/servers/[server_slug]/util.js";
import {
    BarElement,
    CategoryScale,
    Chart as ChartJS, Legend,
    LinearScale,
    LineController,
    LineElement,
    PointElement, TimeScale,
    Title,
    Tooltip
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement, LineController,
    Title, Tooltip, Legend, TimeScale, annotationPlugin, BarElement,
);

export default function MatchScoreChart(
    {sessionInfo, maps}
    : {sessionInfo: PlayerSession, maps: PlayerSessionMapPlayed[]}
) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle>Match Score Progression</CardTitle>
                <CardDescription>
                    Round-by-round score tracking across all maps
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <Line
                        data={getMatchScoreChartData(maps, "player")}
                        options={getChartOptionsWithAnnotations(maps, sessionInfo, true, 5, isDark)}
                    />
                </div>
            </CardContent>
        </Card>
    );
};
