'use client'
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from 'components/ui/card';
import { Button } from 'components/ui/button';
import { Skeleton } from 'components/ui/skeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PlayerAvatar } from "../players/PlayerAvatar";
import { MutualSessionReturn, SessionType } from "../../app/servers/[server_slug]/util";
import { Server } from "types/community";
import Link from "next/link";
import { PlayerBrief, PlayerSeen } from "types/players";


const MutualSessionsSkeleton = () => (
    Array.from({ length: 30 }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 p-4 border-b last:border-0">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-[120px]" />
                <Skeleton className="h-4 w-[200px] hidden sm:block" />
            </div>
            <Skeleton className="h-4 w-[60px]" />
        </div>
    ))
);


export default function MutualSessionsDisplay<T extends SessionType>(
    { server, mutualSessions, type }:
    { server: Server, mutualSessions: MutualSessionReturn<T>, type: T }
) {
    const [mutualCurrentPage, setMutualCurrentPage] = useState(0);
    const isPlayer = type === 'player';
    const isMap = type === 'map'
    const MUTUAL_PAGE_SIZE = 30;

    const getCurrentPageMutual = () => {
        const startIndex = mutualCurrentPage * MUTUAL_PAGE_SIZE;
        const endIndex = startIndex + MUTUAL_PAGE_SIZE;
        return mutualSessions.slice(startIndex, endIndex);
    };

    const getTotalPages = () => {
        return Math.ceil(mutualSessions.length / MUTUAL_PAGE_SIZE);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>
                        {isPlayer ? 'Mutual Sessions' : isMap ? 'Players' : ''}
                    </CardTitle>

                    {mutualSessions.length > MUTUAL_PAGE_SIZE && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setMutualCurrentPage(prev => Math.max(0, prev - 1))}
                                disabled={mutualCurrentPage === 0}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                                {mutualCurrentPage + 1}/{getTotalPages()}
                            </span>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setMutualCurrentPage(prev => Math.min(getTotalPages() - 1, prev + 1))}
                                disabled={mutualCurrentPage >= getTotalPages() - 1}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {getCurrentPageMutual().map((player: PlayerSeen | PlayerBrief) => (
                    <Link
                        key={player.id}
                        href={`/servers/${server.gotoLink}/players/${player.id}`}
                        className="flex items-center gap-4 p-4 hover:bg-accent transition-colors border-b last:border-0"
                    >
                        <PlayerAvatar uuid={player.id} name={player.name} />
                        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                            <div className="min-w-0">
                                <p className="font-medium truncate max-w-[10rem] lg:max-w-[15rem]">
                                    {player.name}
                                </p>
                                <p className="text-sm text-muted-foreground hidden sm:block">
                                    {player.id}
                                </p>
                            </div>
                            <div className="text-sm font-semibold text-primary flex-shrink-0">
                                {(player[isPlayer ? 'total_time_together' : isMap ? 'total_playtime' : ''] / 60).toFixed(1)}mins
                            </div>
                        </div>
                    </Link>
                ))}
            </CardContent>
        </Card>
    );
}
