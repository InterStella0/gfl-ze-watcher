'use client'
import {useState, useEffect, useMemo, ChangeEvent} from 'react';
import { Gamepad2, Info, Circle, Search } from 'lucide-react';
import { fetchServerUrl } from "utils/generalUtils.ts";
import { PlayerAvatar } from "./PlayerAvatar.tsx";
import dayjs from "dayjs";
import {useServerData} from "../../app/servers/[server_slug]/ServerDataProvider";
import Link from "next/link";
import duration from "dayjs/plugin/duration";
import {PlayerDetailSession} from "types/players.ts";
import { Card, CardContent, CardHeader } from "components/ui/card";
import { Input } from "components/ui/input";
import { Skeleton } from "components/ui/skeleton";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "components/ui/pagination";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "components/ui/tooltip";
import { Button } from "components/ui/button";
import PaginationPage from "components/ui/PaginationPage.tsx";
dayjs.extend(duration);

const PlayerListSkeleton = ({ count = 20 }) => (
    <div className="p-2 space-y-1">
        {Array.from({ length: count }).map((_, index) => (
            <div key={index} className="py-1 flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                <div className="flex-1">
                    <Skeleton className="w-3/5 h-5 mb-1" />
                    <Skeleton className="w-4/5 h-4" />
                </div>
            </div>
        ))}
    </div>
);

const PlayersOnline = () => {
    const [onlinePlayers, setOnlinePlayers] = useState<PlayerDetailSession[]>([]);
    const [onlinePlayersLoading, setOnlinePlayersLoading] = useState<boolean>(true);
    const [onlinePlayersError, setOnlinePlayersError] = useState<string | null>(null);
    const [onlinePage, setOnlinePage] = useState<number>(0);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const { server } = useServerData()
    const serverId = server.id

    const PLAYERS_PER_PAGE = 20;

    const filteredPlayers = useMemo(() => {
        if (!searchQuery.trim()) return onlinePlayers;
        return onlinePlayers.filter(player =>
            player.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [onlinePlayers, searchQuery]);

    const getPaginatedPlayers = () => {
        const startIndex = onlinePage * PLAYERS_PER_PAGE;
        const endIndex = startIndex + PLAYERS_PER_PAGE;
        return filteredPlayers.slice(startIndex, endIndex);
    };

    const totalPages = Math.ceil(filteredPlayers.length / PLAYERS_PER_PAGE)

    const getSessionDuration = (startedAt: string): string => {
        const delta = dayjs(dayjs()).diff(startedAt, "second");
        const deltaDur = dayjs.duration(delta, "seconds");
        const hours = deltaDur.hours();
        const minutes = deltaDur.minutes();

        if (hours > 0)
            return `${hours}h ${minutes}m`;

        return `${minutes}m`;
    };

    const handleSearchChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setSearchQuery(e.target.value);
        setOnlinePage(1);
    };

    useEffect(() => {
        setOnlinePlayersLoading(true);
        setOnlinePlayersError(null);
        fetchServerUrl(serverId, '/players/playing')
            .then(data => setOnlinePlayers(data || []))
            .catch(error => {
                console.error('Error fetching online players:', error);
                setOnlinePlayersError(error.message);
            })
            .finally(() => setOnlinePlayersLoading(false))
    }, [serverId]);

    return (
        <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold">
                        Players Online ({onlinePlayers.length})
                    </h2>
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Info className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Players who leave take 3 minutes to be registered as offline, which can cause the server's maximum player count to be exceeded.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                    <Input
                        placeholder="Search players..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="pl-10"
                    />
                </div>

                {onlinePlayersLoading ? (
                    <PlayerListSkeleton count={20} />
                ) : onlinePlayersError ? (
                    <div className="p-4 text-center">
                        <p className="text-destructive">Error loading online players: {onlinePlayersError}</p>
                    </div>
                ) : (
                    <>
                        {filteredPlayers.length === 0 && searchQuery.trim() ? (
                            <div className="p-6 text-center">
                                <p className="text-muted-foreground">
                                    No player name &quot;{searchQuery}&quot;
                                </p>
                            </div>
                        ) : (
                            <div className="p-2 space-y-1">
                                {getPaginatedPlayers().map((player) => (
                                    <div
                                        key={player.session_id}
                                        className="py-1 rounded-md transition-all duration-200 flex items-center gap-3"
                                    >
                                        <div className="relative flex-shrink-0">
                                            <PlayerAvatar uuid={player.id} name={player.name} />
                                            <Circle
                                                className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full"
                                                style={{ color: 'hsl(var(--success))' }}
                                                fill="currentColor"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <Link
                                                href={`/servers/${server.gotoLink}/players/${player.id}`}
                                                className="text-sm font-medium hover:underline block truncate"
                                            >
                                                {player.name}
                                            </Link>
                                            <p className="text-xs text-muted-foreground">
                                                Playing for {getSessionDuration(player.started_at)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {totalPages > 1 && (
                            <div className="flex justify-center pt-4">
                                <PaginationPage page={onlinePage} setPage={setOnlinePage} totalPages={totalPages} />
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default PlayersOnline;