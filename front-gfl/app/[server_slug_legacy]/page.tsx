import { getServerSlug } from "../servers/[server_slug]/util.ts";
import { redirect } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ server_slug_legacy: string }> }) {
    const { server_slug_legacy } = await params;
    const IGNORED_TOP_LEVEL = ['servers', 'live', 'communities']
    if (IGNORED_TOP_LEVEL.includes(server_slug_legacy)) {
    }else{
        const server = await getServerSlug(server_slug_legacy);
        if (server) {
            const targetPath = `/servers/${server.gotoLink}`;
            redirect(targetPath);
        }
    }
    return <></>
}