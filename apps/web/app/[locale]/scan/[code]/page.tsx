import { notFound } from 'next/navigation';
import { requireLocale } from '@/features/localization/locale';
import { scanPage } from '@/lib/api/engagement';
import { ScanLanding } from '@/features/engagement/landing';
export const metadata = {
  robots: { index: false, follow: false },
  title: 'Gulf Pharmacy — Welcome',
};
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const p = await params,
    l = requireLocale(p.locale);
  try {
    return <ScanLanding data={await scanPage(p.code)} locale={l} />;
  } catch (e) {
    if (e instanceof Error && e.message === 'ENGAGEMENT_NOT_FOUND') notFound();
    throw e;
  }
}
