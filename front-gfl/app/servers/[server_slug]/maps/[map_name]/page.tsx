import {
    addOrdinalSuffix,
    DOMAIN,
    fetchServerUrl,
    formatHours,
    formatTitle,
    getMapImage,
    StillCalculate
} from "utils/generalUtils";
import {getCachedMapInfo, getCachedMapAnalyze} from "lib/cachedFetches";
import { Card } from "components/ui/card";
import MapHeader from "components/maps/MapHeader.tsx";
import MapAnalyzeAttributes from "components/maps/MapAnalyzeAttributes.tsx";
import MapGuidesButton from "components/maps/MapGuidesButton";
import MapHeatRegion from "components/maps/MapHeatRegion.tsx";
import MapRegionDistribution from "components/maps/MapRegionDistribution.tsx";
import MapSessionList from "components/maps/MapSessionList.tsx";
import MapTop10PlayerList from "components/maps/MapTop10PlayerList.tsx";
import MapAverageSessionDistribution from "components/maps/MapAverageSessionDistribution.tsx";
import MapPlayerType from "components/maps/MapPlayerType.tsx";
import MapMusicSection from "components/maps/MapMusicSection.tsx";
import {getServerSlug} from "../../util";
import { MapRegion, ServerMapDetail} from "types/maps";
import {MapContextProvider} from "./MapContext";
import {Metadata} from "next";
import {
    PlayerBrief,
} from "types/players.ts";

async function getMapInfoDetails(serverId: string, mapName: string): Promise<ServerMapDetail>{
    const toReturn = { info: null, analyze: null, notReady: false, name: mapName}
    try{
        const [ info, analyze ] = await Promise.all([
            getCachedMapInfo(serverId, mapName),
            getCachedMapAnalyze(serverId, mapName)
        ])
        toReturn.info = info
        toReturn.analyze = analyze
    }catch(e){
        if (e instanceof StillCalculate){
            toReturn.notReady = true
        }
    }
    return toReturn as ServerMapDetail
}
export async function generateMetadata({ params }: {
    params: Promise<{ server_slug: string, map_name: string }>
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
            It have a cumulative of ${formatHours(mapInfo.analyze.cum_player_hours)} in ${server.community.name}. Played by ${mapInfo.analyze.unique_players} players.
        `;
    }
    if (mapInfo.info?.removed){
        description += `Map was removed from ${server.community.name}.`
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

    const image = await getMapImage(server.id, map_name).then(resp => resp?.large || null)
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
            canonical: `/servers/${server.gotoLink}/maps/${map_name}`,
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

    return (
        <MapContextProvider value={mapDetail}>
            <div className="grid grid-cols-12 gap-5 mx-10 max-sm:mx-2 my-2">
                <div className="col-span-12 xl:col-span-8 lg:col-span-9">
                    <MapHeader />
                </div>
                <div className="col-span-12 xl:col-span-4 lg:col-span-3">
                    <MapAnalyzeAttributes />
                    <div className="mt-4">
                        <MapGuidesButton />
                    </div>
                </div>
                <div className="col-span-12">
                    <MapMusicSection />
                </div>
                <div className="col-span-12">
                    <Card>
                        <MapHeatRegion />
                        <MapRegionDistribution />
                    </Card>
                </div>
                <div className="col-span-12 xl:col-span-4 lg:col-span-7 md:col-span-6">
                    <MapSessionList />
                </div>
                <div className="col-span-12 xl:col-span-4 lg:col-span-5 md:col-span-6">
                    <MapTop10PlayerList />
                </div>
                <div className="col-span-12 xl:col-span-4 lg:col-span-12">
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                        <div className="xl:col-span-6 lg:col-span-6 md:col-span-12 col-span-12">
                            <MapAverageSessionDistribution />
                        </div>
                        <div className="xl:col-span-6 lg:col-span-6 md:col-span-12 col-span-12">
                            <MapPlayerType />
                        </div>
                    </div>
                </div>
            </div>
        </MapContextProvider>
    )
}