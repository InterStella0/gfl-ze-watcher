import {Badge} from "components/ui/badge";
import {CommunityBase, Server} from "types/community";
import {Dispatch} from "react";

export default function ServerIndicator(
    { server, community, setDisplayCommunity }
    : { server: Server; community: CommunityBase; setDisplayCommunity: Dispatch<boolean> | null }
) {
    if (!server || !community) return null;

    const isClickable = setDisplayCommunity !== null;

    return (
        <div
            className={`p-2 rounded-lg transition-all duration-200 ${
                isClickable
                    ? 'cursor-pointer hover:-translate-y-0.5 active:translate-y-0 hover:scale-[1.01]'
                    : ''
            }`}
            onClick={() => setDisplayCommunity?.(true)}
        >
            <div className="flex flex-row gap-2 items-center">
                <Badge
                    variant="default"
                    className="max-w-[120px] h-6 px-2 bg-primary text-primary-foreground transition-transform duration-200 hover:scale-105"
                >
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-xs">
                        {community.name}
                    </span>
                </Badge>
                <span className="text-muted-foreground text-xs">
                    /
                </span>
                <Badge
                    variant="outline"
                    className="max-w-[160px] h-6 px-2 transition-transform duration-200 hover:scale-105"
                >
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-xs">
                        {server.name}
                    </span>
                </Badge>
            </div>
        </div>
    );
}