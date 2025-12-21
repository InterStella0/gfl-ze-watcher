"use client"

import { PlayerAvatar } from "./PlayerAvatar.tsx";
import dayjs from "dayjs";
import {fetchServerUrl, secondsToHours, secondsToMins, simpleRandom} from "utils/generalUtils.ts";
import { ErrorBoundary } from "react-error-boundary";
import {useEffect, useState} from "react";
import Link from "next/link";
import relativeTime from "dayjs/plugin/relativeTime";
import {useServerData} from "../../app/servers/[server_slug]/ServerDataProvider";
import {ExtendedPlayerBrief} from "types/players.ts";
import { useTheme } from "next-themes";
import { TableRow, TableCell } from "components/ui/table";
import { Skeleton } from "components/ui/skeleton";
import { cn } from "components/lib/utils";

dayjs.extend(relativeTime)

function PlayerInformation(
    { player, timeUnit = "h" }: { player: ExtendedPlayerBrief, timeUnit?: "h" | "m" }
) {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const server_id = player.server_id
    const { server } = useServerData()
    const [ playerStatus, setPlayerStatus ] = useState(null)

    useEffect(() => {
        fetchServerUrl(player.server_id, `/players/${player.id}/playing`)
            .then(setPlayerStatus)
    }, [server_id, player.id])

    let isOnline = playerStatus? playerStatus.ended_at == null: !!player.online_since;

    const timeTaken = {
        h: (value: number) => `${secondsToHours(value)}h`,
        m: (value: number) => `${secondsToMins(value)}m`
    };

    const playtime = timeTaken[timeUnit](player.total_playtime);

    let statusText
    if (playerStatus){
        statusText = isOnline? `Playing since ${dayjs(playerStatus.started_at).fromNow()}`
            : `Last online ${dayjs(playerStatus.started_at).fromNow()} (${dayjs(playerStatus.ended_at).diff(dayjs(playerStatus.started_at), 'h', true).toFixed(2)}h)`
    }else{
        statusText = isOnline
            ? `Playing since ${dayjs(player.online_since).fromNow()}`
            : `Last online ${dayjs(player.last_played).fromNow()} (${secondsToHours(player.last_played_duration)}h)`;
    }

    return (
        <TableRow
            className={cn(
                isOnline && "border-l-4 border-l-green-500"
            )}
        >
            <TableCell className="py-3 pl-4">
                <div className="flex items-center">
                    <PlayerAvatar uuid={player.id} name={player.name} />

                    <div className="ml-4">
                        <Link
                            href={`/servers/${server.gotoLink}/players/${player.id}`}
                            className={cn(
                                "font-semibold tracking-wide mb-1 max-w-[10rem] whitespace-nowrap overflow-hidden text-ellipsis inline-block",
                                "hover:underline transition-colors",
                                isDarkMode ? "text-white" : "text-gray-900"
                            )}
                        >
                            {player.name}
                        </Link>
                        <div
                            className={cn(
                                "text-xs flex items-center gap-1.5",
                                isOnline
                                    ? "text-green-500"
                                    : isDarkMode ? "text-slate-400" : "text-slate-500"
                            )}
                        >
                            {isOnline && (
                                <span
                                    className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"
                                />
                            )}
                            {statusText}
                        </div>
                    </div>
                </div>
            </TableCell>
            <TableCell
                align="right"
                className="py-3 pr-6 align-middle"
            >
                <div
                    className={cn(
                        "inline-flex items-center justify-center px-3 py-1.5 rounded min-w-[90px]",
                        "font-medium text-sm",
                        isDarkMode
                            ? "bg-black/20 text-white"
                            : "bg-black/5 text-gray-900"
                    )}
                >
                    {playtime}
                </div>
            </TableCell>
        </TableRow>
    );
}

function PlayerRowError() {
    return (
        <TableRow>
            <TableCell colSpan={2} className="text-center py-4">
                <div className={cn(
                    "flex items-center justify-center gap-2 p-2 rounded",
                    "bg-red-500/10 text-red-500"
                )}>
                    <span role="img" aria-label="warning">⚠️</span>
                    <span>Unable to load player data</span>
                </div>
            </TableCell>
        </TableRow>
    );
}

export function PlayerTableRowLoading() {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true)
    }, [])

    const randomNameWidth = simpleRandom(80, 130, isClient);

    return (
        <TableRow>
            <TableCell className="py-3 pl-4">
                <div className="flex items-center">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="ml-4">
                        <Skeleton
                            className="h-5 mb-2"
                            style={{ width: `${randomNameWidth}px` }}
                        />
                        <Skeleton className="h-3.5 w-40" />
                    </div>
                </div>
            </TableCell>
            <TableCell align="right" className="py-3 pr-6">
                <Skeleton className="h-8 w-[90px] rounded ml-auto" />
            </TableCell>
        </TableRow>
    );
}

export default function PlayerTableRow(
    { player, timeUnit = "h" }: { player: ExtendedPlayerBrief, timeUnit?: "h" | "m" }
) {
    return (
        <ErrorBoundary fallback={<PlayerRowError />}>
            <PlayerInformation player={player} timeUnit={timeUnit} />
        </ErrorBoundary>
    );
}
