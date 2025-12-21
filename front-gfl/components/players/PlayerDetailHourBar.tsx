'use client'
import { Card } from "components/ui/card";
import { Button } from "components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "components/ui/select";
import PlayerPlayTimeGraph from "./PlayTimeGraph";
import {useState} from "react";
import 'chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm';
import {Server} from "types/community.ts";
import {PlayerInfo} from "../../app/servers/[server_slug]/players/[player_id]/util.ts";

export default function PlayerDetailHourBar({ player, server }: { server: Server, player: PlayerInfo }){
    const [groupByTime, setGroupByTime] = useState<"daily" | "monthly" | "yearly">("daily")

    const handleGroupChange = (value: string) => {
        setGroupByTime(value as "daily" | "monthly" | "yearly")
    }

    return <Card className="overflow-hidden">
        <div className="flex justify-between items-center flex-col sm:flex-row gap-2 p-4 border-b">
            <h2 className="text-base font-medium">
                Play Time History
            </h2>
            <div className="flex gap-0 rounded-md border overflow-hidden">
                <Button
                    variant="default"
                    size="sm"
                    className="rounded-none border-r"
                    disabled
                >
                    Group By
                </Button>

                <Select value={groupByTime} onValueChange={handleGroupChange}>
                    <SelectTrigger className="w-[100px] border-0 rounded-none h-9 text-sm font-medium">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div className="p-2 h-[240px]">
            <PlayerPlayTimeGraph groupBy={groupByTime} player={player} server={server} />
        </div>
    </Card>
}