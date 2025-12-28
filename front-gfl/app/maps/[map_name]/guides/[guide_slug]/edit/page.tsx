import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { formatTitle} from 'utils/generalUtils';
import { auth, SteamSession } from 'auth';
import GuideEditor from 'components/maps/guides/GuideEditor';
import { getGuideBySlug } from "../../util";
import {GuideContextProvider} from "../../../../../../lib/GuideContextProvider.tsx";

export async function generateMetadata({ params }: {
    params: Promise<{ map_name: string; guide_slug: string }>
}): Promise<Metadata> {
    try {
        const {  map_name, guide_slug } = await params;

        const guide = await getGuideBySlug(map_name, guide_slug);

        if (!guide) {
            return { title: formatTitle('Edit Guide') };
        }

        return {
            title: formatTitle(`Edit: ${guide.title}`),
            description: `Edit your guide for ${map_name}`,
            alternates: {
                canonical: `/maps/${map_name}/guides/${guide.slug}/edit`
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
    const { map_name, guide_slug } = await params;
    const session = await auth() as SteamSession | null;

    if (!session?.user) {
        redirect(`/maps/${map_name}/guides`);
    }

    const guide = await getGuideBySlug(map_name, guide_slug);

    if (!guide){
        redirect(`/maps/${map_name}/guides`);
    }

    if (guide.author.id !== session.user.steam.steamid) {
        redirect(`/maps/${map_name}/guides/${guide.slug}`);
    }
    const mapDetail = { mapName: map_name, guide }

    return (
        <GuideContextProvider value={mapDetail}>
            <div className="container max-w-4xl mx-auto px-4 py-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold mb-2">Edit Guide</h1>
                    <p className="text-muted-foreground">
                        Update your guide for {map_name}
                    </p>
                </div>
                <GuideEditor mode="edit" session={session} />
            </div>
        </GuideContextProvider>
    );
}
