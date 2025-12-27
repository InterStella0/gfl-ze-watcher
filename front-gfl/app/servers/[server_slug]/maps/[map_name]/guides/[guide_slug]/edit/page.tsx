import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import {fetchApiServerUrl, fetchApiUrl, formatTitle} from 'utils/generalUtils';
import { getServerSlug } from '../../../../../util';
import { auth } from 'auth';
import GuideEditor from 'components/maps/guides/GuideEditor';
import { getGuideBySlug } from "../../util";
import {MapContextProvider} from "../../../MapContext.tsx";
import {getBasicMapInfoDetails} from "../../page.tsx";

export async function generateMetadata({ params }: {
    params: Promise<{ server_slug: string; map_name: string; guide_slug: string }>
}): Promise<Metadata> {
    try {
        const { server_slug, map_name, guide_slug } = await params;
        const server = await getServerSlug(server_slug);

        if (!server) {
            return {};
        }

        const guide = await getGuideBySlug(server.id, map_name, guide_slug);

        if (!guide) {
            return { title: formatTitle('Edit Guide') };
        }

        return {
            title: formatTitle(`Edit: ${guide.title}`),
            description: `Edit your guide for ${map_name}`,
            alternates: {
                canonical: `/servers/${server.readable_link || server.id}/maps/${map_name}/guides/${guide.slug}/edit`
            }
        };
    } catch (error) {
        return {
            title: formatTitle('Edit Guide')
        };
    }
}

export default async function EditGuidePage({ params }: {
    params: Promise<{ server_slug: string; map_name: string; guide_slug: string }>
}) {
    const { server_slug, map_name, guide_slug } = await params;
    const mapDetail = getServerSlug(server_slug)
        .then(server => getBasicMapInfoDetails(server?.id, map_name))
    const server = await getServerSlug(server_slug);
    const session = await auth();

    if (!session?.user) {
        redirect(`/servers/${server.gotoLink}/maps/${map_name}/guides`);
    }

    const guide = await getGuideBySlug(server.id, map_name, guide_slug);

    if (!guide){
        redirect(`/servers/${server.gotoLink}/maps/${map_name}/guides`);
    }

    if (guide.author.id !== session.user.steam.steamid) {
        redirect(`/servers/${server.gotoLink}/maps/${map_name}/guides/${guide.slug}`);
    }

    return (
        <MapContextProvider value={mapDetail}>
            <div className="container max-w-4xl mx-auto px-4 py-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold mb-2">Edit Guide</h1>
                    <p className="text-muted-foreground">
                        Update your guide for {map_name}
                    </p>
                </div>
                <GuideEditor mode="edit" initialGuide={guide} />
            </div>
        </MapContextProvider>
    );
}
