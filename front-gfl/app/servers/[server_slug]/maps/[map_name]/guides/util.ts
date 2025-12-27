import { fetchApiServerUrl } from "utils/generalUtils";
import { Guide } from "types/guides";

export type GuideSlugPromise = Promise<Guide | null>;

export async function getGuideBySlug(
  server_id: string,
  map_name: string,
  guide_slug: string
): GuideSlugPromise {
  try {
    return await fetchApiServerUrl(
      server_id,
      `/maps/${map_name}/guides/slugs/${guide_slug}`,
      { cache: 'no-store' }
    );
  } catch (error) {
    console.error('Error fetching guide by slug:', error);
    return null;
  }
}
