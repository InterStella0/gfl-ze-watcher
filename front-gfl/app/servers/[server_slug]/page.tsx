import ErrorCatch from "components/ui/ErrorMessage";
import {DateProvider} from "components/graphs/DateStateManager";
import ServerContent from "./ServerContent";
import {getServerSlug} from "./util";
import {notFound} from "next/navigation";
import {Metadata} from "next";
import {fetchServerUrl, formatTitle} from "utils/generalUtils.ts";
import {ServerPlayersStatistic} from "types/players.ts";
import {MapPlayedPaginated} from "types/maps.ts";
import {ServerContentWrapper} from "./ServerContentWrapper.tsx";


export async function generateMetadata({ params}: {
    params: { server_slug: string }
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

    try{
        const parameters = {
            page: 1, sorted_by: 'last_played'
        }
        const data: MapPlayedPaginated = await fetchServerUrl(server.id, '/maps/last/sessions', { params: parameters });

        description += ` There are over ${data.total_maps} maps that has been played!`
    }catch(e){}
    if (server.players)
        description += ` There are ${server.players} players online right now!`
    return {
        title: formatTitle(server.community.name),
        description: description
    }
}

export interface ServerPageProps {
    params: Promise<{ server_slug: string }>;
}
export default async function Page({ params }: ServerPageProps){
    const { server_slug } = await params
    return <ServerContentWrapper serverSlug={server_slug} />
}