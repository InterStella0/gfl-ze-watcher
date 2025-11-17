import {Box, Grid2} from "@mui/material";
import {SessionHeader} from "components/sessions/SessionHeader";
import {SessionStats} from "components/sessions/SessionStats";
import { ServerPopChart} from "components/sessions/ServerPopChart";
import MapsList from "components/sessions/MapsList";
import {
    getMapsDataSession,
    getMutualSessions,
    getServerGraph,
    getServerSlug, getSessionInfo,
    PlayerSessionMapPlayed, SessionInfo
} from "../../../../util";
import { fetchServerUrl, formatHours, formatTitle, getMapImage} from "utils/generalUtils";
import {getPlayerDetailed, PlayerInfo} from "../../util";
import MutualSessionsDisplay from "components/sessions/MutualSessionsDisplay";
import {notFound} from "next/navigation";
import {Metadata} from "next";
import { PlayerProfilePicture} from "types/players.ts";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import MatchScoreChart from "components/sessions/MatchScoreChart.tsx";

dayjs.extend(relativeTime)

async function getMapImages(server_id: string, player_id: string, session_id: string): Promise<Record<string, string>> {
    const mapsData: PlayerSessionMapPlayed[] = await fetchServerUrl(server_id, `/players/${player_id}/sessions/${session_id}/maps`);
    const imagePromises = mapsData.map(async (map) => {
        try {
            const imageData = await getMapImage(server_id, map.map);
            return { [map.map]: imageData?.extra_large || null };
        } catch (error) {
            console.error(`Failed to load image for ${map.map}:`, error);
            return { [map.map]: null };
        }
    });
    const imageResults = await Promise.all(imagePromises);
    const imageMap = imageResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
    return imageMap as Record<string, string>;
}
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
                description: `View player activities on ${server.community.name}`
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
        const pfp: PlayerProfilePicture | null = await fetchServerUrl(server.id, `/players/${player.id}/pfp`)
        image = pfp.full
    }catch(error){

    }

    const title = formatTitle(`${player.name}'s Session on ${server.community.name}`)
    return {
        title: title,
        description: description,
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
    try{
        const server = await getServerSlug(server_slug);
        const server_id = server?.id
        const player: PlayerInfo = await getPlayerDetailed(server_id, player_id);

        const [
            sessionInfo,
            maps,
            serverGraph,
            mutualSessions,
            mapImages
        ] = await Promise.all([
            getSessionInfo(server_id, session_id, "player", player_id),
            getMapsDataSession(server_id, player_id, session_id),
            getServerGraph(server_id, session_id, player_id, "player"),
            getMutualSessions(server_id, session_id, "player", player_id),
            getMapImages(server_id, player_id, session_id),
        ]);
        return <Box bgcolor="background.default" minHeight="100vh" p={3}>
            <SessionHeader
                server={server}
                player={player}
                sessionInfo={sessionInfo}
            />

            <Grid2 container spacing={3}>
                <Grid2 size={{ sm: 12, lg: 7, xl: 8 }}>
                    <SessionStats
                        sessionInfo={sessionInfo}
                        maps={maps}
                        mutualSessions={mutualSessions}
                        serverGraph={serverGraph}
                    />

                    <ServerPopChart
                        sessionInfo={sessionInfo}
                        maps={maps}
                        serverGraph={serverGraph}
                    />

                    <MatchScoreChart
                        sessionInfo={sessionInfo}
                        maps={maps}
                    />

                    <MapsList
                        server={server}
                        maps={maps}
                        mapImages={mapImages}
                    />
                </Grid2>

                <Grid2 size={{ xs: 12, sm: 12, lg: 5, xl: 4 }}>
                    <MutualSessionsDisplay
                        server={server}
                        mutualSessions={mutualSessions}
                        type="player"
                    />
                </Grid2>
            </Grid2>
        </Box>
    }catch(error){
        if (error.code === 404)
            notFound()
        else
            throw error
    }
}