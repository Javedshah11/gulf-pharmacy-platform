import type { MetadataRoute } from 'next';
import { siteOrigin } from '@/lib/seo/site';
export const dynamic = 'force-dynamic';
export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return origin
    ? {
        rules: {
          userAgent: '*',
          allow: ['/en', '/ar'],
          disallow: ['/admin', '/api', '/media'],
        },
        sitemap: origin + '/sitemap.xml',
      }
    : { rules: { userAgent: '*', disallow: '/' } };
}
