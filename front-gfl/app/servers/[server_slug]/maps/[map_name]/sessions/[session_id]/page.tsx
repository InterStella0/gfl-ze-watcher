import {
    getMutualSessions,
    getServerGraph,
    getServerSlug,
    getSessionInfo,
    SessionInfo
} from "../../../../util";
import {fetchServerUrl, formatHours, formatTitle, getMapImage, GetMapImageReturn} from "utils/generalUtils";
import { MapSessionMatch} from "types/maps";
import {Metadata} from "next";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import timezone from "dayjs/plugin/timezone";
import MapSessionWrapper from "./MapSessionWrapper.tsx";
import getSessionData from "./utils.ts";

dayjs.extend(relativeTime);
dayjs.extend(timezone)

export async function generateMetadata({ params }: {
    params: Promise<{ server_slug: string, map_name: string, session_id: string }>
}): Promise<Metadata> {
    const { server_slug, map_name, session_id } = await params;
    const server = await getServerSlug(server_slug);
    let info: SessionInfo<"map"> | null = null;
    try{
        info = await getSessionInfo(server.id, session_id, "map", map_name)
    }catch(error){
        if (error.code === 202){
            return {
                title: formatTitle(map_name),
                description: "The map is still being calculated. Please come back later~",
            }
        }else if (error.code === 404){
            return {
                title: "ZE Graph",
                description: `View map activities on ${server.community.name}`
            };
        }else{
            return {}
        }
    }
    let description = ``
    if (info.ended_at){
        description += `They were playing it for ${formatHours(dayjs(info.ended_at).diff(dayjs(info.started_at), 'seconds', true))}.`
    }else{
        description += `They are currently playing it for ${formatHours(dayjs().diff(dayjs(info.started_at), 'seconds', true))}.`
    }
    try{
        const serverCounts = await getServerGraph(server.id, session_id, map_name, "map")
        const playerCounts = serverCounts.map(e => e.player_count)
        const [min, max] = [Math.min(...playerCounts), Math.max(...playerCounts)]
        description += ` Player count ranges from ${min} to ${max}.`
    }catch (error){}

    try{
        const sessionMatches: MapSessionMatch[] = await fetchServerUrl(server.id, `/sessions/${session_id}/all-match`)
        if (sessionMatches) {
            const matches = sessionMatches.sort((a, b) => dayjs(b.occurred_at).diff(a.occurred_at, 'seconds', true))
            const match = matches[0]
            const matchCounts = match.zombie_score + match.human_score

            if (info.ended_at)
                description += ` Played through ${matchCounts} rounds with a final score of ${match.human_score}-${match.zombie_score}.`
            else
                description += ` Played through ${matchCounts} rounds with a score of ${match.human_score}-${match.zombie_score}..`
        }
    }catch(error){}

    if (!info.ended_at){
        description += ` Currently playing it since ${dayjs(info.started_at).fromNow()}.`;
    }else{
        description += ` They played it at ${dayjs(info.started_at).format('MMM D, YYYY h:mm A')}.`;
    }
    try{
        const players = await getMutualSessions(server.id, session_id, "map", map_name)

        description += ` There were ${players.length} unique players in this session.`
    }catch(error){}

    let image = ""
    try{
        const pfp: GetMapImageReturn = await getMapImage(server.id, map_name)
        image = pfp?.large || ""
    }catch(error){

    }

    const title = formatTitle(`${map_name}'s Session on ${server.community.name}`)
    return {
        title: title,
        description: description,
        alternates: {
            canonical: `/servers/${server.gotoLink}/maps/${map_name}/sessions/${session_id}`,
        },
        openGraph: {
            type: "website",
            title,
            description,
            images: [image],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [image],
        },
    }
}


export default async function Page({ params }) {
    const { session_id, server_slug, map_name } = await params;
    const sessionPromise = getServerSlug(server_slug)
        .then(server => getSessionData(server, map_name, session_id))

    return <MapSessionWrapper sessionPromise={sessionPromise} />
}