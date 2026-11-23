import { test, expect } from '@playwright/test';
import type { Branch } from '../../packages/shared/src';
import {
  siteOrigin,
  pageMetadata,
  pharmacyJsonLd,
  sitemapEntries,
} from '../../apps/web/lib/seo/site';
const branch: Branch = {
  id: 'test-only',
  slug: 'gulf-pharmacy-dammam',
  nameEn: 'Gulf Pharmacy',
  nameAr: 'صيدلية الخليج',
  addressEn: 'Street 8, Ar Rabi, Dammam 32241, Saudi Arabia',
  addressAr: 'شارع 8، حي الربيع، الدمام 32241، المملكة العربية السعودية',
  city: 'Dammam',
  district: 'Ar Rabi',
  country: 'SA',
  postalCode: '32241',
  phone: '+966 59 771 3349',
  whatsappUrl: 'https://wa.me/966597713349',
  mapsUrl: 'https://goo.gl/maps/mhWvzaZhw956to9o8?g_st=aw',
  isActive: true,
  isPublished: true,
  contactNameEn: 'Dr. Fahad Badshah',
  contactNameAr: 'د. فهد بادشاه',
  descriptionEn: '',
  descriptionAr: '',
  openingHours: [],
  services: [],
  publicUpdatedAt: '2026-11-23T00:00:00Z',
};
test('SEO origin, canonical and hreflang configuration cannot silently advertise localhost', () => {
  const original = process.env.SITE_ORIGIN;
  try {
    delete process.env.SITE_ORIGIN;
    expect(siteOrigin()).toBeUndefined();
    const local = pageMetadata('en', '', 'Gulf Pharmacy', 'Description');
    expect(local.alternates).toBeUndefined();
    expect(local.robots).toEqual({ index: false, follow: false });
    for (const value of [
      'http://pharmacy.test',
      'https://localhost',
      'https://127.0.0.1',
      'https://pharmacy.test/path',
      'https://user:secret@pharmacy.test',
    ])
      expect(() => siteOrigin(value)).toThrow();
    process.env.SITE_ORIGIN = 'https://pharmacy.test';
    const metadata = pageMetadata(
      'ar',
      '/branches/gulf-pharmacy-dammam',
      'عنوان',
      'وصف',
    );
    expect(metadata.alternates?.canonical).toBe(
      'https://pharmacy.test/ar/branches/gulf-pharmacy-dammam',
    );
    expect(metadata.alternates?.languages).toEqual({
      en: 'https://pharmacy.test/en/branches/gulf-pharmacy-dammam',
      ar: 'https://pharmacy.test/ar/branches/gulf-pharmacy-dammam',
      'x-default': 'https://pharmacy.test/en/branches/gulf-pharmacy-dammam',
    });
  } finally {
    if (original === undefined) delete process.env.SITE_ORIGIN;
    else process.env.SITE_ORIGIN = original;
  }
});
test('Pharmacy schema and sitemap include only verified published business information', () => {
  const schema = pharmacyJsonLd('ar', branch);
  expect(schema['@type']).toBe('Pharmacy');
  expect(schema.telephone).toBe('+966597713349');
  expect(schema.address.postalCode).toBe('32241');
  expect(schema).not.toHaveProperty('openingHoursSpecification');
  expect(schema).not.toHaveProperty('geo');
  expect(schema).not.toHaveProperty('aggregateRating');
  expect(schema).not.toHaveProperty('email');
  const entries = sitemapEntries('https://pharmacy.test', [
    branch,
    { ...branch, slug: 'draft-test-only', isPublished: false },
    { ...branch, slug: 'inactive-test-only', isActive: false },
  ]);
  const urls = entries.map((entry) => entry.url);
  expect(
    urls.filter((url) => url.includes('/branches/gulf-pharmacy-dammam')),
  ).toHaveLength(2);
  expect(urls.some((url) => /draft|inactive|admin|\/api/.test(url))).toBe(
    false,
  );
});
