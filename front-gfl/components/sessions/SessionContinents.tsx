import { Card, CardHeader, CardTitle, CardContent } from "components/ui/card";
import PlayerContinentCounter from "components/players/PlayerContinentCounter.tsx";
import RadarSessionPreview from "components/sessions/RadarSessionPreview.tsx";

export default function SessionContinents({ sessionInfo, continents }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Continent Distribution</CardTitle>
            </CardHeader>
            <CardContent>
                <PlayerContinentCounter continentData={continents} truncate={6} />
            </CardContent>
            <RadarSessionPreview start={sessionInfo.started_at} end={sessionInfo.ended_at} />
        </Card>
    );
}
