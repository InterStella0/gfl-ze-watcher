import {fetchUrl} from "utils/generalUtils";
import {Community, Server} from "types/community";

export class CommunitiesData{
    public communities: Community[];
    public serversMapped: Map<string, Server>;
    constructor(communities: Community[]){
        this.communities = communities;
        const mapping = new Map()
        for (let community of communities){
            for (let server of community.servers){
                mapping[server.id] = server;
                mapping[server.readable_link] = server;
            }
        }
        this.serversMapped = mapping;
    }
}

export async function getCommunity(): Promise<Community[]>{
    return await fetchUrl("/communities", { next: { revalidate: 60 } })
        .then(resp => {
            const comm = resp.map(e => ({
                id: e.id,
                name: e.name,
                players: e.servers.reduce((prev, curr) => prev + curr.player_count, 0),
                status: e.servers.reduce((prev, curr) => prev || curr.online, false),
                color: '#4A90E2',
                icon_url: e.icon_url,
                servers: e.servers.map(s => ({
                    id: s.id,
                    name: s.name,
                    players: s.player_count,
                    max_players: s.max_players,
                    status: s.online,
                    fullIp: `${s.ip}:${s.port}`,
                    readable_link: s.readable_link,
                    gotoLink: s.readable_link || s.id,
                    community: e,
                    website: s.website,
                    discordLink: s.discord_link,
                    source: s.source,
                    byId: s.by_id,
                    map: s.map,
                }))
            })) as Community[];

            comm.sort((a, b) => b.players - a.players)
            return comm
        });
}

export async function getCommunityData(): Promise<CommunitiesData>{
    let data = await getCommunity();
    return new CommunitiesData(data);
}