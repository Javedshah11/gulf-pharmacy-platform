import type { MetadataRoute } from 'next';
import { listPublicBranches } from '@/lib/api/public-branches';
import { siteOrigin, sitemapEntries } from '@/lib/seo/site';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> { const origin = siteOrigin(); if (!origin) return []; return sitemapEntries(origin, await listPublicBranches()); }
