import Radar from "./Radar";
import {Metadata} from "next";
import {getServerSlug} from "../util.ts";
import {fetchServerUrl, formatTitle} from "utils/generalUtils.ts";
import {ServerPlayersStatistic} from "types/players.ts";

export async function generateMetadata({ params}: {
    params: Promise<{ server_slug: string }>
}): Promise<Metadata> {
    const { server_slug } = await params

    const server = await getServerSlug(server_slug)
    if (!server)
        return {}

    let description = `Play zombie escape on ${server.community.name} at ${server.fullIp}.`
    try{
        const stats: ServerPlayersStatistic = await fetchServerUrl(server.id, '/players/stats', {});
        const allTime = stats.all_time
        description += ` There are ${allTime.total_players} unique players across ${allTime.countries} countries all-time.`
    }catch(e){}

    return {
        title: formatTitle(`${server.community.name} Radar`),
        description: description,
        alternates: {
            canonical: `/servers/${server.readable_link || server.id}/radar`
        }
    }
}

export default async function Page() {
    return <Radar />
}