import type { MetadataRoute } from 'next'
import { DOMAIN } from 'utils/generalUtils'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
        },
        sitemap: `${DOMAIN}/sitemap.xml`,
    }
}