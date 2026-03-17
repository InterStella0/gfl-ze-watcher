import { Metadata } from "next"
import { getServerSlug } from "../util.ts"
import { formatTitle } from "utils/generalUtils.ts"
import ModelsPageContent from "./ModelsPageContent"

export async function generateMetadata({ params }: {
    params: Promise<{ server_slug: string }>
}): Promise<Metadata> {
    const { server_slug } = await params
    const server = await getServerSlug(server_slug)
    if (!server) return {}
    return {
        title: formatTitle(`${server.community_name} 3D Models`),
        description: `View 3D models for maps and characters on ${server.community_name}.`,
        alternates: { canonical: `/servers/${server.gotoLink}/models` }
    }
}

export default function Page() {
    return <ModelsPageContent />
}
