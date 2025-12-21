'use client';

import { DiscordUser } from "types/users";
import { UserAvatar } from "./UserAvatar";
import { use } from "react";
import { SiSteam } from "@icons-pack/react-simple-icons";
import { Card, CardContent } from "components/ui/card";
import { Button } from "components/ui/button";
import { Badge } from "components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "components/ui/tooltip";

interface UserProfileProps {
    userPromise: Promise<{
        user: DiscordUser;
        userId?: string;
    }>;
}

export default function UserProfile({ userPromise }: UserProfileProps) {
    const { user, userId } = use(userPromise);

    // Determine if this is a Steam ID (numeric only)
    const isSteamId = userId && /^\d+$/.test(userId);

    return (
        <Card className="w-full border-border/40 bg-card/50 backdrop-blur-xl">
            <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    <div className="relative shrink-0">
                        <UserAvatar
                            userId={userId}
                            name={user?.global_name || 'Unknown User'}
                            avatarUrl={user?.avatar}
                            width={120}
                            height={120}
                        />
                    </div>

                    <div className="flex flex-col flex-1 items-center sm:items-start text-center sm:text-left gap-3">
                        <div className="space-y-2">
                            <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                                    {user?.global_name || 'Unknown User'}
                                </h1>
                                {isSteamId && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-[50px] w-[50px] rounded-full"
                                                    asChild
                                                >
                                                    <a
                                                        href={`https://steamcommunity.com/profiles/${userId}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        <SiSteam />
                                                    </a>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>View Steam Profile</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>

                            {userId && (
                                <Badge variant="secondary" className="text-xs font-mono">
                                    ID: {userId}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
