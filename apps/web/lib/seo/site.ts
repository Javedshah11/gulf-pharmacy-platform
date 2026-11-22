import type { Metadata, MetadataRoute } from 'next';
import type { Branch } from '@gulf/shared';
import type { Locale } from '@/lib/utils/locale';
import { localized } from '@/features/localization/dictionaries';
export function siteOrigin(value = process.env.SITE_ORIGIN): string | undefined {
  if (!value) return undefined;
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' || url.hostname === 'localhost' || url.hostname.endsWith('.localhost') || url.hostname.endsWith('.local') || /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname) || url.hostname.includes(':') || !url.hostname.includes('.')) throw new Error('SITE_ORIGIN must be a public HTTPS origin without a path or credentials');
  return url.origin;
}
export function pageMetadata(locale: Locale, path: string, title: string, description: string, index = true): Metadata {
  const origin = siteOrigin(); const url = origin ? origin + '/' + locale + path : undefined;
  return { title, description, robots: { index: Boolean(origin) && index, follow: Boolean(origin) }, alternates: origin ? { canonical: url, languages: { en: origin + '/en' + path, ar: origin + '/ar' + path, 'x-default': origin + '/en' + path } } : undefined, openGraph: { title, description, type: 'website', siteName: 'Gulf Pharmacy', locale: locale === 'ar' ? 'ar_SA' : 'en_SA', alternateLocale: locale === 'ar' ? 'en_SA' : 'ar_SA', ...(url ? { url, images: [{ url: origin + '/share-image', width: 1200, height: 630, alt: 'Gulf Pharmacy — Your Health. Our Priority.' }] } : {}) }, twitter: { card: 'summary_large_image', title, description, ...(origin ? { images: [origin + '/share-image'] } : {}) } };
}
export function branchMetadata(locale: Locale, branch: Branch) { const name = localized(branch.nameEn, branch.nameAr, locale); const address = localized(branch.addressEn, branch.addressAr, locale); return pageMetadata(locale, '/branches/' + branch.slug, locale === 'ar' ? `${name} | ${address} — صيدلية الخليج` : `${name} in ${branch.district}, ${branch.city} | Branch details`, locale === 'ar' ? `زوروا ${name} في ${address}. الهاتف: ${branch.phone}. تواصلوا عبر واتساب واحصلوا على الاتجاهات.` : `Visit ${name} at ${address}. Call ${branch.phone}, contact the branch on WhatsApp, or get directions.`); }
export function pharmacyJsonLd(locale: Locale, branch: Branch) {
  const origin = siteOrigin();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return { '@context': 'https://schema.org', '@type': 'Pharmacy', ...(origin ? { '@id': origin + '/en/branches/' + branch.slug + '#pharmacy', url: origin + '/' + locale + '/branches/' + branch.slug } : {}), name: localized(branch.nameEn, branch.nameAr, locale), alternateName: localized(branch.nameEn, branch.nameAr, locale === 'en' ? 'ar' : 'en'), telephone: branch.phone.replace(/[^+0-9]/g, ''), hasMap: branch.mapsUrl, address: { '@type': 'PostalAddress', streetAddress: localized(branch.addressEn, branch.addressAr, locale), addressLocality: branch.city, addressCountry: branch.country, ...(branch.postalCode ? { postalCode: branch.postalCode } : {}) }, ...(branch.openingHours.length ? { openingHoursSpecification: branch.openingHours.map(period => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: 'https://schema.org/' + days[period.day], opens: period.opens, closes: period.closes })) } : {}) };
}
export function sitemapEntries(origin: string, branches: Branch[]): MetadataRoute.Sitemap {
  const pages = ['', '/branches', '/about', '/contact', '/privacy', '/terms'];
  const entries: MetadataRoute.Sitemap = [];
  for (const path of pages) for (const locale of ['en', 'ar']) entries.push({ url: origin + '/' + locale + path, alternates: { languages: { en: origin + '/en' + path, ar: origin + '/ar' + path } } });
  for (const branch of branches.filter(branch => branch.isActive && branch.isPublished)) for (const locale of ['en', 'ar']) { const path = '/branches/' + branch.slug; entries.push({ url: origin + '/' + locale + path, ...(branch.publicUpdatedAt ? { lastModified: new Date(branch.publicUpdatedAt) } : {}), alternates: { languages: { en: origin + '/en' + path, ar: origin + '/ar' + path } } }); }
  return entries;
}
