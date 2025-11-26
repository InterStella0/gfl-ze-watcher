import {
    addOrdinalSuffix,
    DOMAIN,
    fetchServerUrl,
    formatHours,
    formatTitle,
    getMapImage,
    StillCalculate
} from "utils/generalUtils";
import {Box, Grid2 as Grid, Typography} from "@mui/material";
import MapHeader from "components/maps/MapHeader";
import MapAnalyzeAttributes from "components/maps/MapAnalyzeAttributes";
import Paper from "@mui/material/Paper";
import MapHeatRegion from "components/maps/MapHeatRegion";
import MapRegionDistribution from "components/maps/MapRegionDistribution";
import MapSessionList from "components/maps/MapSessionList";
import MapTop10PlayerList from "components/maps/MapTop10PlayerList";
import MapAverageSessionDistribution from "components/maps/MapAverageSessionDistribution";
import MapPlayerType from "components/maps/MapPlayerType";
import {getServerSlug, oneDay} from "../../util";
import { MapRegion, ServerMapDetail} from "types/maps";
import {MapContextProvider} from "./MapContext";
import {notFound} from "next/navigation";
import {Metadata} from "next";
import {
    PlayerBrief,
} from "types/players.ts";
import {revalidateTag} from "next/cache";

async function getMapInfoDetails(serverId: string, mapName: string): Promise<ServerMapDetail>{
    const toReturn = { info: null, analyze: null, notReady: false, name: mapName}
    try{
        toReturn.info = await fetchServerUrl(serverId, `/maps/${mapName}/info`)
        toReturn.analyze = await fetchServerUrl(serverId, `/maps/${mapName}/analyze`)
    }catch(e){
        if (e instanceof StillCalculate){
            toReturn.notReady = true
        }
    }
    return toReturn as ServerMapDetail
}
export async function generateMetadata({ params }: {
    params: { server_slug: string, map_name: string }
}): Promise<Metadata> {
    const { server_slug, map_name } = await params;
    const server = await getServerSlug(server_slug);
    let mapInfo: ServerMapDetail | null = null
    const title = formatTitle(`${map_name} on ${server.community.name}`)
    try{
        mapInfo = await getMapInfoDetails(server.id, map_name)
    }catch(error){
        if (error.code === 202){
            return {
                title,
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
    const creators = mapInfo?.info?.creators? `Created by ${mapInfo.info.creators}. `: ''
    let description = creators
    if (mapInfo.analyze){
        description += `
            It have a cumulative of ${formatHours(mapInfo.analyze.cum_player_hours)} in ${server.community.name}.
            Played by ${mapInfo.analyze.unique_players} players.
        `;
    }
    try{
        const regions: MapRegion[] = await fetchServerUrl(server.id, `/maps/${map_name}/regions`)
        const regionMap = regions.sort((a, b) => b.total_play_duration - a.total_play_duration)
        const region = regionMap[0]
        description += ` Mainly played during ${region.region_name} with ${formatHours(region.total_play_duration)}.`
    }catch (error){

    }
    try{
        const totalPlayers: PlayerBrief[] = await fetchServerUrl(server.id, `/maps/${map_name}/top_players`)
        const players = totalPlayers.sort((a, b) => b.total_playtime - a.total_playtime)
        const firstPlayer = players[0]
        description += ` Most active player on this map is ${firstPlayer.name} with a playtime of ${formatHours(firstPlayer.total_playtime)}.`
    }catch (e){}

    const image = await getMapImage(server.id, map_name).then(resp => resp.large || null)

    return {
        title,
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
        alternates: {
            canonical: `/servers/${server.readable_link || server.id}/maps/${map_name}`,
            types: {
                "application/json+oembed": `/api/oembed?url=${DOMAIN}/api/${server.id}/maps/${map_name}`,
            },
        },
    }
}

export default async function Page({ params }){
    const { map_name, server_slug } = await params
    const mapDetail = getServerSlug(server_slug)
        .then(server => getMapInfoDetails(server?.id, map_name))

    return <>
        <MapContextProvider value={mapDetail}>
            <Grid container spacing={3}>
                <Grid size={{xl: 8, lg: 7, md: 12, sm: 12, xs: 12}} sx={{p: '2rem'}}>
                    <MapHeader />
                </Grid>
                <Grid size={{xl: 4, lg: 5, md: 12, sm: 12, xs: 12}} container sx={{p: '2rem'}}>
                    <MapAnalyzeAttributes />
                </Grid>
                <Grid size={{xl: 12, lg: 12, md: 12, sm: 12, xs: 12}} sx={{p: '2rem'}}>
                    <Paper elevation={0}>
                        <MapHeatRegion />
                        <MapRegionDistribution />
                    </Paper>
                </Grid>
                <Grid size={{xl: 4, lg: 7, md: 6, sm: 12, xs: 12}} sx={{p: '.5rem'}}>
                    <MapSessionList />
                </Grid>
                <Grid size={{xl: 4, lg: 5, md: 6, sm: 12, xs: 12}} sx={{p: '.5rem'}}>
                    <MapTop10PlayerList />
                </Grid>
                <Grid size={{xl: 4, lg: 12, md: 12, sm: 12, xs: 12}} container sx={{p: '1rem'}}>
                    <Grid size={{xl: 12, lg: 6, md: 6, sm: 12, xs: 12}}>
                        <MapAverageSessionDistribution />
                    </Grid>
                    <Grid size={{xl: 12, lg: 6, md: 6, sm: 12, xs: 12}}>
                        <MapPlayerType />
                    </Grid>
                </Grid>
            </Grid>
        </MapContextProvider>
    </>
}