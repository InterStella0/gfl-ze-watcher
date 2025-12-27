import { Metadata } from 'next';
import { formatTitle } from 'utils/generalUtils';
import { getServerSlug } from '../../../../util';
import GuideEditor from 'components/maps/guides/GuideEditor';
import { MapContextProvider } from "../../MapContext";
import {getBasicMapInfoDetails} from "../page.tsx";

export async function generateMetadata({ params }: {
    params: Promise<{ server_slug: string; map_name: string }>
}): Promise<Metadata> {
    const { server_slug, map_name } = await params;
    const server = await getServerSlug(server_slug);

    if (!server) {
        return {};
    }

    return {
        title: formatTitle(`Create Guide - ${map_name}`),
        description: `Create a new community guide for ${map_name}. Share your knowledge and help other players.`,
        alternates: {
            canonical: `/servers/${server.readable_link || server.id}/maps/${map_name}/guides/new`
        }
    };
}

export default async function NewGuidePage({ params }: {
    params: Promise<{ server_slug: string; map_name: string }>
}) {
    const { map_name, server_slug } = await params;
    const mapDetail = getServerSlug(server_slug)
        .then(server => getBasicMapInfoDetails(server?.id, map_name))

    return (
        <MapContextProvider value={mapDetail}>
            <div className="container max-w-4xl mx-auto px-4 py-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold mb-2">Create New Guide for {map_name}</h1>
                    <p className="text-muted-foreground">
                        Share your knowledge and help the community learn this map
                    </p>
                </div>
                <GuideEditor mode="create" />
            </div>
        </MapContextProvider>
    );
}
