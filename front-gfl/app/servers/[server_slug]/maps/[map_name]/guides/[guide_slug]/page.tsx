import { Metadata } from 'next';
import { formatTitle} from 'utils/generalUtils';
import { getServerSlug } from '../../../../util';
import { auth } from 'auth';
import GuideDetail from 'components/maps/guides/GuideDetail';
import GuideComments from 'components/maps/guides/GuideComments';
import {getBasicMapInfoDetails} from "../page.tsx";
import {MapContextProvider} from "../../MapContext.tsx";
import { getGuideBySlug } from "../util";

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
            return { title: formatTitle('Guide Not Found') };
        }

        // Create excerpt for description
        const excerpt = guide.content
            .replace(/[#*`\[\]()]/g, '')
            .replace(/\n+/g, ' ')
            .trim()
            .slice(0, 160);

        return {
            title: formatTitle(`${guide.title} - ${map_name}`),
            description: excerpt,
            alternates: {
                canonical: `/servers/${server.readable_link || server.id}/maps/${map_name}/guides/${guide.slug}`
            }
        };
    } catch (error) {
        return {
            title: formatTitle('Guide Not Found')
        };
    }
}

export default async function GuidePage({ params }: {
    params: Promise<{ server_slug: string; map_name: string; guide_slug: string }>
}) {
    const { map_name, server_slug, guide_slug } = await params;
    const mapDetail = getServerSlug(server_slug)
        .then(server => getBasicMapInfoDetails(server?.id, map_name))
    const session = await auth()
    const guide = await getServerSlug(server_slug).then(s => getGuideBySlug(s.id, map_name, guide_slug))


    return (
        <MapContextProvider value={mapDetail}>
            <div className="container max-w-4xl mx-auto px-4 py-6 ">
                <GuideDetail initialGuide={Promise.resolve(guide)} session={session} />
                <div className="mt-8">
                    <GuideComments guideId={guide?.id} session={session} />
                </div>
            </div>
        </MapContextProvider>
    );
}
