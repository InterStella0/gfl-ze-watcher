'use client';

import {Avatar, AvatarFallback, AvatarImage} from "components/ui/avatar";
import {Button} from "components/ui/button";
import {Card, CardContent} from "components/ui/card";
import {Circle, Users, ChevronDown, ChevronUp} from "lucide-react";
import ServerCard from "./ServerCard";
import {getServerAvatarText} from "../ui/CommunitySelector";
import {useState} from "react";

const CommunityCard = ({ community }) => {
    const [ isExpanded, setExpanded ] = useState(false);
    const maxServersToShow = 3;
    const serversToDisplay = isExpanded
        ? community.servers
        : community.servers.slice(0, maxServersToShow);
    const onToggleExpanded = () => setExpanded(e => !e)
    return (
        <Card className="backdrop-blur-xl bg-card/80 border-border/40 shadow-sm">
            <CardContent className="p-4 sm:p-6">
                <div className="space-y-4 sm:space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <Avatar className="w-10 h-10 sm:w-12 sm:h-12 font-bold">
                            <AvatarImage src={community.icon_url} alt={community.name} />
                            <AvatarFallback>
                                {getServerAvatarText(community.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-base sm:text-xl font-semibold text-left break-words leading-tight">
                                {community.name}
                            </h2>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-4 mt-1">
                                <div className="flex flex-row items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    <span className="text-xs sm:text-sm">
                                        {community.players.toLocaleString()} players
                                    </span>
                                </div>
                                <div className="flex flex-row items-center gap-1">
                                    <Circle
                                        className={`h-2 w-2 ${community.status ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500'}`}
                                    />
                                    <span className="text-xs sm:text-xs text-muted-foreground">
                                        {community.status ? 'Online' : 'Offline'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm sm:text-base font-medium mb-2">
                            Servers
                        </h3>
                        {serversToDisplay.map(server => (
                            <ServerCard
                                key={server.id}
                                server={server}
                            />
                        ))}

                        {community.servers.length > maxServersToShow && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onToggleExpanded}
                                className="mt-2 text-xs sm:text-sm font-medium"
                            >
                                {isExpanded ? (
                                    <>
                                        <ChevronUp className="mr-2 h-4 w-4" />
                                        Show Less
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="mr-2 h-4 w-4" />
                                        Show {community.servers.length - maxServersToShow} More
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
export default CommunityCard;