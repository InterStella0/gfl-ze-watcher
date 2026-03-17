'use client';

import { CommunityPlayerDetail } from "types/community";
import { getServerAvatarText } from "../ui/CommunitySelector";
import { secondsToHours } from "utils/generalUtils";
import Link from "next/link";
import { UserAnonymization } from "components/users/UserCommunityConnections.tsx";
import { Card, CardContent } from "components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "components/ui/avatar";
import { Switch } from "components/ui/switch";
import { Label } from "components/ui/label";
import { Separator } from "components/ui/separator";
import { Clock } from "lucide-react";

interface CommunityConnectionCardProps {
    community: CommunityPlayerDetail;
    settings: UserAnonymization | null;
    onToggleAnonymize: (communityId: string | number, type: "location" | "anonymous", value: boolean, settings: UserAnonymization | null) => void;
    showAnonymizeToggle?: boolean;
}

export default function CommunityConnectionCard({
    community,
    settings,
    onToggleAnonymize,
    showAnonymizeToggle = false,
}: CommunityConnectionCardProps) {
    // Compute total playtime from pre-fetched server data
    const totalPlaytime = community.servers.reduce(
        (sum, s) => sum + s.player.total_playtime, 0
    );
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
                                    <span className="text-sm text-muted-foreground">
                                        {secondsToHours(totalPlaytime)} hrs
                                    </span>
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
                        {community.servers.map((serverPlayer) => (
                            <div
                                key={serverPlayer.server_id}
                                className={`pl-4 border-l-2 border-border rounded-sm p-2 -ml-2 transition-all duration-200 ${
                                    serverPlayer.player.total_playtime > 0 ? 'hover:border-primary hover:translate-x-1' : ''
                                }`}
                            >
                                <div className="space-y-1">
                                    {serverPlayer.player.total_playtime > 0 ? (
                                        <Link
                                            href={`/servers/${serverPlayer.server_id}/players/${serverPlayer.player.id}`}
                                            className="text-sm font-medium hover:underline"
                                        >
                                            {serverPlayer.server_name}
                                        </Link>
                                    ) : (
                                        <p className="text-sm font-medium">
                                            {serverPlayer.server_name}
                                        </p>
                                    )}

                                    <div className="flex flex-wrap gap-3">
                                        {serverPlayer.player.total_playtime > 0 ? (
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="text-xs text-muted-foreground">
                                                    {secondsToHours(serverPlayer.player.total_playtime)} hrs
                                                </span>
                                            </div>
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
