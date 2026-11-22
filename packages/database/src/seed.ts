import { createDatabase, branches } from './index';
import { databaseUrl } from './environment';
const branch = {
  nameEn: 'Gulf Pharmacy',
  nameAr: 'صيدلية الخليج',
  slug: 'gulf-pharmacy-dammam',
  addressEn: 'Street 8, Ar Rabi, Dammam 32241, Saudi Arabia',
  addressAr: 'شارع 8، حي الربيع، الدمام 32241، المملكة العربية السعودية',
  city: 'Dammam',
  district: 'Ar Rabi',
  country: 'SA',
  phone: '+966 59 771 3349',
  whatsappUrl: 'https://wa.me/966597713349',
  mapsUrl: 'https://goo.gl/maps/mhWvzaZhw956to9o8?g_st=aw',
  isActive: true,
  isPublished: true,
  contactNameEn: 'Dr. Fahad Badshah',
  contactNameAr: 'د. فهد بادشاه',
  postalCode: '32241',
};
async function main() {
  const { db, pool } = createDatabase(databaseUrl());
  try {
    await db
      .insert(branches)
      .values(branch)
      .onConflictDoNothing({ target: branches.slug });
    console.log('Confirmed Dammam branch seeded.');
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    'Seed failed. Check database availability and run migrations first.',
  );
  process.exitCode = 1;
});
