import type { MetadataRoute } from 'next';
import { listPublicBranches } from '@/lib/api/public-branches';
import { siteOrigin, sitemapEntries } from '@/lib/seo/site';
import { academyVideos } from '@/lib/api/academy';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  if (!origin) return [];
  const entries = sitemapEntries(origin, await listPublicBranches());
  for (const locale of ['en', 'ar'])
    entries.push({
      url: origin + '/' + locale + '/health-academy',
      alternates: {
        languages: {
          en: origin + '/en/health-academy',
          ar: origin + '/ar/health-academy',
        },
      },
    });
  let page = 1;
  for (;;) {
    const result = await academyVideos('pageSize=100&page=' + page);
    for (const v of result.items)
      for (const locale of ['en', 'ar'])
        entries.push({
          url: origin + '/' + locale + '/health-academy/' + v.slug,
          lastModified: new Date(v.updatedAt),
          alternates: {
            languages: {
              en: origin + '/en/health-academy/' + v.slug,
              ar: origin + '/ar/health-academy/' + v.slug,
            },
          },
        });
    if (page * result.pageSize >= result.total) break;
    page++;
  }
  return entries;
}
