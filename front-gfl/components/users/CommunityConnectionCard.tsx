'use client';

import { Community, Server } from "types/community";
import { getServerAvatarText } from "../ui/CommunitySelector";
import { useEffect, useState } from "react";
import {fetchServerUrl, secondsToHours, APIError, fetchApiServerUrl} from "utils/generalUtils";
import Link from "next/link";
import {UserAnonymization} from "components/users/UserCommunityConnections.tsx";
import { Card, CardContent } from "components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "components/ui/avatar";
import { Switch } from "components/ui/switch";
import { Label } from "components/ui/label";
import { Skeleton } from "components/ui/skeleton";
import { Separator } from "components/ui/separator";
import { Clock, Star } from "lucide-react";

interface CommunityConnectionCardProps {
    community: Community;
    userId: string;
    settings: UserAnonymization | null;
    onToggleAnonymize: (communityId: string | number, type: "location" | "anonymous", value: boolean, settings: UserAnonymization) => void;
    showAnonymizeToggle?: boolean;
}

interface ServerPlayerData {
    serverId: string;
    serverName: string;
    totalPlaytime: number;
    favoriteMap: string | null;
    loading: boolean;
    error: boolean;
}

export default function CommunityConnectionCard({
    community,
    userId,
    settings,
    onToggleAnonymize,
    showAnonymizeToggle = false,
}: CommunityConnectionCardProps) {
    const [serverData, setServerData] = useState<ServerPlayerData[]>([]);
    const [totalPlaytime, setTotalPlaytime] = useState<number>(0);

    useEffect(() => {
        async function fetchServerData(server: Server) {
            try {
                const fetchOptions: any = { next: { revalidate: 300 } };

                const playerData = await fetchApiServerUrl(
                    server.id,
                    `/players/${userId}/detail`,
                    fetchOptions,
                    false
                );

                let favoriteMap: string | null = null;
                try {
                    const maps = await fetchApiServerUrl(
                        server.id,
                        `/players/${userId}/most_played_maps`,
                        { ...fetchOptions, params: { limit: 1 } },
                        false
                    );
                    if (maps && maps.length > 0) {
                        favoriteMap = maps[0].map;
                    }
                } catch (e) {
                }

                return {
                    serverId: server.id,
                    serverName: server.name,
                    totalPlaytime: playerData.total_playtime || 0,
                    favoriteMap,
                    loading: false,
                    error: false
                };
            } catch (error) {
                if (error instanceof APIError && error.code === 404) {
                    // Player not found on this server
                    return {
                        serverId: server.id,
                        serverName: server.name,
                        totalPlaytime: 0,
                        favoriteMap: null,
                        loading: false,
                        error: false
                    };
                }
                return {
                    serverId: server.id,
                    serverName: server.name,
                    totalPlaytime: 0,
                    favoriteMap: null,
                    loading: false,
                    error: true
                };
            }
        }

        // Initialize loading states
        setServerData(
            community.servers.map(server => ({
                serverId: server.id,
                serverName: server.name,
                totalPlaytime: 0,
                favoriteMap: null,
                loading: true,
                error: false
            }))
        );

        // Fetch data for all servers
        Promise.all(community.servers.map(server => fetchServerData(server)))
            .then(results => {
                setServerData(results);
                const total = results.reduce((sum, data) => sum + data.totalPlaytime, 0);
                setTotalPlaytime(total);
            });
    }, [community.servers, userId]);

    const hasAnyPlaytime = totalPlaytime > 0;

    return (
        <Card className="border-border/40 bg-card/50 backdrop-blur-xl">
            <CardContent className="p-4 sm:p-6">
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar className="h-12 w-12 sm:h-14 sm:w-14">
                                {community.icon_url && (
                                    <AvatarImage src={community.icon_url} alt={community.name} />
                                )}
                                <AvatarFallback className="text-base sm:text-lg font-bold">
                                    {getServerAvatarText(community.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base sm:text-xl font-semibold break-words">
                                    {community.name}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    {serverData.some(d => d.loading) ? (
                                        <Skeleton className="h-4 w-16" />
                                    ) : (
                                        <span className="text-sm text-muted-foreground">
                                            {secondsToHours(totalPlaytime)} hrs
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {showAnonymizeToggle && hasAnyPlaytime && (
                            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                                <div className="flex items-center gap-2">
                                    <Switch
                                        id={`hide-location-${community.id}`}
                                        checked={settings?.hide_location ?? false}
                                        onCheckedChange={(checked) => onToggleAnonymize(
                                            community.id, "location", checked, settings
                                        )}
                                    />
                                    <Label
                                        htmlFor={`hide-location-${community.id}`}
                                        className="text-sm text-muted-foreground cursor-pointer"
                                    >
                                        Hide Radar Location
                                    </Label>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Switch
                                        id={`anonymize-${community.id}`}
                                        checked={settings?.anonymized ?? false}
                                        onCheckedChange={(checked) => onToggleAnonymize(
                                            community.id, "anonymous", checked, settings
                                        )}
                                    />
                                    <Label
                                        htmlFor={`anonymize-${community.id}`}
                                        className="text-sm text-muted-foreground cursor-pointer"
                                    >
                                        Anonymize
                                    </Label>
                                </div>
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* Server Details */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground">
                            Servers
                        </h4>
                        {serverData.map((data) => (
                            <div
                                key={data.serverId}
                                className={`pl-4 border-l-2 border-border rounded-sm p-2 -ml-2 transition-all duration-200 ${
                                    data.totalPlaytime > 0 ? 'hover:border-primary hover:translate-x-1' : ''
                                }`}
                            >
                                <div className="space-y-1">
                                    {data.totalPlaytime > 0 ? (
                                        <Link
                                            href={`/servers/${data.serverId}/players/${userId}`}
                                            className="text-sm font-medium hover:underline"
                                        >
                                            {data.serverName}
                                        </Link>
                                    ) : (
                                        <p className="text-sm font-medium">
                                            {data.serverName}
                                        </p>
                                    )}

                                    <div className="flex flex-wrap gap-3">
                                        {data.loading ? (
                                            <>
                                                <Skeleton className="h-4 w-20" />
                                                <Skeleton className="h-4 w-24" />
                                            </>
                                        ) : data.totalPlaytime > 0 ? (
                                            <>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="text-xs text-muted-foreground">
                                                        {secondsToHours(data.totalPlaytime)} hrs
                                                    </span>
                                                </div>
                                                {data.favoriteMap && (
                                                    <div className="flex items-center gap-1">
                                                        <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                                                        <span className="text-xs text-muted-foreground">
                                                            {data.favoriteMap}
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-xs text-muted-foreground/60">
                                                No playtime
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
