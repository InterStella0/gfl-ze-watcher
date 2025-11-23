import {Container} from "@mui/material";
import CurrentMatch from "components/maps/CurrentMatch";
import {fetchServerUrl, formatTitle, getMapImage} from "utils/generalUtils";
import {getServerSlug} from "../util";
import MapsSearchIndex from "./MapsSearchIndex";
import getServerUser from "../../../getServerUser";
import {cookies} from "next/headers";
import {getMatchNow} from "./util";
import {Metadata} from "next";
import {MapPlayedPaginated} from "types/maps.ts";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {Suspense, use} from "react";
dayjs.extend(relativeTime)

export async function generateMetadata({ params}: {
    params: Promise<{ server_slug: string }>
}): Promise<Metadata> {
    const { server_slug } = await params

    const server = await getServerSlug(server_slug)
    if (!server)
        return {}

    let description = `Play zombie escape on ${server.community.name} at ${server.fullIp}.`
    try{
        const parameters = { page: 1, sorted_by: 'last_played' }
        const data: MapPlayedPaginated = await fetchServerUrl(server.id, '/maps/last/sessions', { params: parameters });
        const latestMap = data.maps[0]
        description += ` There are over ${data.total_maps} maps that has been played! Last played ${latestMap.map} at ${dayjs(latestMap.last_played).fromNow()}.`
    }catch(e){}

    return {
        title: formatTitle(`${server.community.name} Maps`),
        description: description,
        alternates: {
            canonical: `/servers/${server.readable_link || server.id}/maps`
        }
    }
}

export default async function Page({ params }){
    const { server_slug } = await params;
    const server = getServerSlug(server_slug)
    const user = getServerUser(cookies());

    return <Container maxWidth="xl" sx={{ py: 3 }}>
        <Suspense fallback={null}>
            <CurrentMatch serverPromise={server} />
        </Suspense>
        <Suspense fallback={null}>
            <MapsSearchIndex serverPromise={server} userPromise={user} />
        </Suspense>

    </Container>
}