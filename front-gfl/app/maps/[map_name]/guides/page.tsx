import { Metadata } from 'next';
import { formatTitle} from 'utils/generalUtils';
import { auth } from 'auth';
import MapGuidesList from 'components/maps/guides/MapGuidesList';
import {GuideContextProvider} from "../../../../lib/GuideContextProvider.tsx";

export async function generateMetadata({ params }: {
    params: Promise<{ map_name: string }>
}): Promise<Metadata> {
    const { map_name } = await params;

    return {
        title: formatTitle(`${map_name} - Community Guides`),
        description: `Browse and share community guides for ${map_name}. Learn strategies, item locations, and tips from experienced players.`,
        alternates: {
            canonical: `/maps/${map_name}/guides`
        }
    };
}

export default async function GuidesPage({ params }: {
    params: Promise<{ map_name: string }>
}) {
    const { map_name } = await params;
    const session = await auth();
    const detail = { mapName: map_name }

    return (
        <GuideContextProvider value={detail}>
            <div className="container max-w-screen-xl mx-auto px-4 py-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold mb-2">Community Guides for {map_name}</h1>
                    <p className="text-muted-foreground">
                        Browse and share strategies, tips, and knowledge about this map
                    </p>
                </div>
                <MapGuidesList session={session} />
            </div>
        </GuideContextProvider>
    );
}
