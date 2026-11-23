import { headers } from 'next/headers';
import Link from 'next/link';
import { dictionary } from '@/features/localization/dictionaries';
export default async function NotFound() {
  const locale = (await headers()).get('x-gulf-locale') === 'ar' ? 'ar' : 'en';
  const d = dictionary(locale);
  return (
    <main id="home" style={{ maxWidth: 800, margin: '80px auto', padding: 30 }}>
      <h1 style={{ fontSize: 40 }}>{d.notFound}</h1>
      <p>{d.notFoundIntro}</p>
      <Link href={'/' + locale}>{d.backHome}</Link>
    </main>
  );
}
