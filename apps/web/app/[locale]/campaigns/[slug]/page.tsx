import { notFound } from 'next/navigation';
import { requireLocale } from '@/features/localization/locale';
import { campaignPage } from '@/lib/api/engagement';
import { CampaignLanding } from '@/features/engagement/landing';
import { pageMetadata } from '@/lib/seo/site';
type Props = { params: Promise<{ locale: string; slug: string }> };
export async function generateMetadata({ params }: Props) {
  const p = await params,
    l = requireLocale(p.locale);
  try {
    const c = await campaignPage(p.slug);
    return pageMetadata(
      l,
      '/campaigns/' + c.slug,
      l === 'ar' ? c.titleAr : c.titleEn,
      (l === 'ar' ? c.bodyAr : c.bodyEn).slice(0, 180),
      false,
    );
  } catch {
    return { robots: { index: false, follow: false } };
  }
}
export default async function Page({ params }: Props) {
  const p = await params,
    l = requireLocale(p.locale);
  try {
    return <CampaignLanding data={await campaignPage(p.slug)} locale={l} />;
  } catch (e) {
    if (e instanceof Error && e.message === 'ENGAGEMENT_NOT_FOUND') notFound();
    throw e;
  }
}
