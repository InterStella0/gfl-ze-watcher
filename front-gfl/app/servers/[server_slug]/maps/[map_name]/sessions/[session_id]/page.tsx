import {
    getMutualSessions,
    getServerGraph,
    getServerSlug,
    getSessionInfo,
    SessionInfo
} from "../../../../util";
import {Box, Grid2} from "@mui/material";
import {fetchServerUrl, formatHours, formatTitle, getMapImage, GetMapImageReturn} from "utils/generalUtils";
import {MapSessionMatch} from "types/maps";
import MutualSessionsDisplay from "components/sessions/MutualSessionsDisplay";
import MapSessionStats from "components/sessions/MapSessionStats";
import {ServerPopChart} from "components/sessions/ServerPopChart";
import MapMatchScoreChart from "components/sessions/MapMatchScoreChart";
import MapSessionHeader from "components/sessions/MapSessionHeader";
import {notFound} from "next/navigation";
import {Metadata} from "next";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(relativeTime);
dayjs.extend(timezone)

export async function generateMetadata({ params }: {
    params: { server_slug: string, map_name: string, session_id: string }
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
    try{
        const server = await getServerSlug(server_slug)
        const server_id = server?.id

        const [
            sessionInfo,
            mutualSessions,
            graphData,
            serverGraph,
            mapImage
        ] = await Promise.all([
            getSessionInfo(server_id, session_id, "map", map_name),
            getMutualSessions(server_id, session_id, "map", map_name),
            fetchServerUrl(server_id, `/sessions/${session_id}/all-match`),
            getServerGraph(server_id, session_id, map_name, 'map'),
            getMapImage(server_id, map_name)
        ]);

        return <Box bgcolor="background.default" minHeight="100vh" p={3}>
            <MapSessionHeader sessionInfo={sessionInfo} server={server} mapImage={mapImage?.small || null} />
            <Grid2 container spacing={3}>
                <Grid2 size={{ sm: 12, lg: 7, xl: 8 }}>
                    <MapSessionStats sessionInfo={sessionInfo} mutualSessions={mutualSessions} serverGraph={serverGraph} graphMatch={graphData} />
                    <ServerPopChart sessionInfo={sessionInfo} serverGraph={serverGraph} maps={null} />
                    <MapMatchScoreChart sessionInfo={sessionInfo} graphMatch={graphData} />
                </Grid2>
                <Grid2 size={{ xs: 12, sm: 12, lg: 5, xl: 4 }}>
                    <MutualSessionsDisplay
                        server={server}
                        mutualSessions={mutualSessions}
                        type="map"
                    />
                </Grid2>
            </Grid2>
        </Box>
    }catch (error) {
        if (error.status === 404) {
            notFound();
        }
        throw error;
    }



}