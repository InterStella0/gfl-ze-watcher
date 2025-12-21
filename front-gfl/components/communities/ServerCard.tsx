'use client';

import {Card, CardContent} from "components/ui/card";
import {Button} from "components/ui/button";
import {Wifi, WifiOff, BarChart3} from "lucide-react";
import Link from 'next/link';
import {toast} from "sonner";

const ServerCard = ({ server }) => {
    const handleCopyIP = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(server.fullIp);
        toast.success("Copied to clipboard");
    };

    return (
        <Card className="mb-2 backdrop-blur-sm bg-card/50 border-border/40 transition-all duration-200 hover:shadow-md">
            <CardContent className="p-3 sm:p-4">
                <div className="space-y-2">
                    <div className="flex flex-row justify-between items-center gap-4">
                        <div className="flex flex-row items-center gap-2 flex-1 min-w-0">
                            <div className="flex flex-row items-center gap-2 min-w-0">
                                {server.status ? (
                                    <Wifi className="h-4 w-4 flex-shrink-0 text-green-500" />
                                ) : (
                                    <WifiOff className="h-4 w-4 flex-shrink-0 text-red-500" />
                                )}
                                <span className="text-sm sm:text-base font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                                    {server.name}
                                </span>
                            </div>
                        </div>
                        <span className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0 text-muted-foreground">
                            {server.players}/{server.max_players}
                        </span>
                    </div>
                    <div className="flex flex-row items-center gap-2 flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs sm:text-xs font-mono px-2 py-1 h-auto transition-all select-all"
                                onClick={handleCopyIP}
                                title={`Click to copy: ${server.fullIp}`}
                            >
                                {server.fullIp}
                            </Button>
                        </div>
                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                        >
                            <Link href={`/servers/${server.gotoLink}`}>
                                <BarChart3 className="mr-2 h-4 w-4" />
                                Insights
                            </Link>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
export default ServerCard;