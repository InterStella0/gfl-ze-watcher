import { getServerSlug } from "../../servers/[server_slug]/util.ts";
import { redirect } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ server_slug_legacy: string, rest?: string[] }> }) {
    const { server_slug_legacy, rest = [] } = await params;
    console.log("HERE", server_slug_legacy, rest);
    const IGNORED_TOP_LEVEL = ['servers', 'live', 'communities']
    if (IGNORED_TOP_LEVEL.includes(server_slug_legacy)) {
        console.log("TB");
        return new Response("Not found", { status: 404 });
    }

    console.log("E");
    const server = await getServerSlug(server_slug_legacy);
    console.log("D");
    if (!server) {
        return new Response("Not found", { status: 404 });
    }
    console.log("A");
    const remainder = rest.length ? "/" + rest.join("/") : "";
    console.log("B");
    const targetPath = `/servers/${server.gotoLink}${remainder}`;
    console.log("FINAL", targetPath);
    return redirect(targetPath);
}