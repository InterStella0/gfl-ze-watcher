import {
    getMapsDataSession,
    getMutualSessions,
    getServerGraph,
    getServerSlug, getSessionInfo, MutualSessionReturn,
    PlayerSessionMapPlayed, ServerGraphType, SessionInfo
} from "../../../../util";
import {fetchServerUrl, fetchUrl, formatHours, formatTitle, getMapImage} from "utils/generalUtils";
import {getPlayerDetailed, PlayerInfo} from "../../util";
import {Metadata} from "next";
import { PlayerProfilePicture} from "types/players.ts";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {Server} from "types/community.ts";
import SessionPlayerWrapper from "./SessionPlayerWrapper.tsx";
import {getSessionData} from "./utils.ts";

dayjs.extend(relativeTime)

export async function generateMetadata({ params}: {
    params: Promise<{ server_slug: string, player_id: string, session_id: string }>
}): Promise<Metadata> {
    const { server_slug, player_id, session_id } = await params;
    const server = await getServerSlug(server_slug);
    let player: PlayerInfo | null = null
    let info: SessionInfo<"player"> | null = null;
    try{
        player = await getPlayerDetailed(server.id, player_id)
        info = await getSessionInfo(server.id, session_id, "player", player_id)
    }catch(error){
        if (error.code === 202){
            return {
                title: formatTitle(player_id),
                description: "The player is still being calculated. Please come back later~",
            }
        }else if (error.code === 404){
            return {
                title: "ZE Graph",
                description: `View player activities on ${server.community_name}`
            };
        }else{
            return {}
        }
    }
    let description = ``
    if (info.ended_at){
        description += `They were playing for ${formatHours(dayjs(info.ended_at).diff(dayjs(info.started_at), 'seconds', true))}.`
    }else{
        description += `They are playing for ${formatHours(dayjs().diff(dayjs(info.started_at), 'seconds', true))}.`
    }
    try{
        const serverCounts = await getServerGraph(server.id, session_id, player.id, "player")
        const playerCounts = serverCounts.map(e => e.player_count)
        const [min, max] = [Math.min(...playerCounts), Math.max(...playerCounts)]
        description += ` Player count ranges from ${min} to ${max}.`
    }catch (error){}

    try{
        const maps = await getMapsDataSession(server.id, player.id, session_id)
        if (maps && maps.length > 0) {
            const mapNames = maps.map(e => e.map)
            const firstTwo = mapNames.slice(0, 2).join(", ")

            const remaining = mapNames.length - 2
            const moreText = remaining > 0 ? ` and ${remaining} more` : ""

            description += ` Played through ${firstTwo}${moreText}.`
        }
    }catch(error){}

    if (player.online_since){
        description += ` Currently online in the server since ${dayjs(player.online_since).fromNow()}.`;
    }else{
        description += ` Last online in the server since ${dayjs(player.last_played).fromNow()}.`;
    }
    try{
        const players = await getMutualSessions(server.id, session_id, "player", player_id)

        description += ` They have seen ${players.length} players in this session.`
    }catch(error){}
    let image = ""
    try{
        const pfp: PlayerProfilePicture | null = await fetchUrl(`/players/${player.id}/pfp`)
        image = pfp.full
    }catch(error){

    }

    const title = formatTitle(`${player.name}'s Session on ${server.community_name}`)
    return {
        title: title,
        description: description,
        alternates: {
            canonical: `/servers/${server.gotoLink}/players/${player.id}/sessions/${session_id}`,
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
export default async function Page({ params }){
    const { player_id, server_slug, session_id } = await params
    const sessionPromise = getServerSlug(server_slug)
        .then((server) => getSessionData(server, player_id, session_id))
    return <SessionPlayerWrapper sessionPromise={sessionPromise} />
}