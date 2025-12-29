import { Metadata } from 'next';
import { formatTitle } from 'utils/generalUtils';
import GuideEditor from 'components/maps/guides/GuideEditor';
import {GuideContextProvider} from "../../../../../lib/GuideContextProvider.tsx";
import {auth, SteamSession} from "../../../../../auth.ts";

export async function generateMetadata({ params }: {
    params: Promise<{ map_name: string }>
}): Promise<Metadata> {
    const { map_name } = await params;

    return {
        title: formatTitle(`Create Guide - ${map_name}`),
        description: `Create a new community guide for ${map_name}. Share your knowledge and help other players.`,
        alternates: {
            canonical: `/maps/${map_name}/guides/new`
        }
    };
}

export default async function NewGuidePage({ params }: {
    params: Promise<{ map_name: string }>
}) {
    const { map_name } = await params;
    const mapDetail = { mapName: map_name }
    const session = await auth() as SteamSession | null;

    return (
        <GuideContextProvider value={mapDetail}>
            <div className="container max-w-4xl mx-auto px-4 py-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold mb-2">Create New Guide for {map_name}</h1>
                    <p className="text-muted-foreground">
                        Share your knowledge and help the community learn this map
                    </p>
                </div>
                <GuideEditor mode="create" session={session} defaultScope="global" />
            </div>
        </GuideContextProvider>
    );
}
