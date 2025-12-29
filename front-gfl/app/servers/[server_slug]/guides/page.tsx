import { Metadata } from 'next';
import { formatTitle } from 'utils/generalUtils';
import { getServerSlug } from '../util';
import { auth } from '../../../../auth';
import ServerGuidesList from 'components/guides/ServerGuidesList';

export async function generateMetadata({ params }: {
    params: Promise<{ server_slug: string }>
}): Promise<Metadata> {
    const { server_slug } = await params;
    const server = await getServerSlug(server_slug);

    if (!server) {
        return {};
    }

    return {
        title: formatTitle(`${server.community.name} - Community Guides`),
        description: `Browse top-rated community guides for all maps on ${server.community.name}. Learn strategies, item locations, and tips from experienced players.`,
        alternates: {
            canonical: `/servers/${server.gotoLink}/guides`
        }
    };
}

export default async function GuidesPage({ params }: {
    params: Promise<{ server_slug: string }>
}) {
    const { server_slug } = await params;
    const serverPromise = getServerSlug(server_slug);
    const sessionPromise = auth();

    return (
        <div className="p-6">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold mb-2">
                    Community Guides
                </h1>
                <p className="text-lg text-muted-foreground">
                    Top-rated guides for each map - learn from experienced players
                </p>
            </div>
            <ServerGuidesList serverPromise={serverPromise} sessionPromise={sessionPromise} />
        </div>
    );
}
