'use client'
import { useTheme } from 'next-themes';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from 'components/ui/card';
import { Line } from 'react-chartjs-2';
import { getMatchScoreChartData, getChartOptionsWithAnnotations } from 'utils/sessionUtils.js';
import { MapSessionMatch, ServerMapPlayed } from "types/maps";

export default function MapMatchScoreChart(
    { sessionInfo, graphMatch }:
    { sessionInfo: ServerMapPlayed, graphMatch: MapSessionMatch[] }
) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle>Match Score Progression</CardTitle>
                <CardDescription>
                    Round-by-round score tracking for {sessionInfo.map}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <Line
                        data={getMatchScoreChartData(graphMatch, "map")}
                        options={getChartOptionsWithAnnotations(null, sessionInfo, true, 5, isDark)}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
