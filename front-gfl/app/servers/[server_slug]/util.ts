import {getCommunityData} from "../../getCommunity";
import {Server} from "../../../types/community";

export async function getServerSlug(slug: string): Promise<Server | null> {
    const data = await getCommunityData();
    return data.serversMapped[slug]
}