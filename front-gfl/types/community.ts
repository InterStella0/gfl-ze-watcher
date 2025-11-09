export interface Server {
    id: string;
    name: string;
    players: number;
    max_players: number;
    status: boolean; // online/offline
    fullIp: string; // `${ip}:${port}`
    readable_link?: string | null;
    gotoLink: string;
    community: CommunityBase;
}

export interface CommunityBase {
    id: string | number;
    name: string;
    icon_url?: string | null;
}

export interface Community extends CommunityBase {
    players: number;
    status: boolean;
    color: string;
    servers: Server[];
}
