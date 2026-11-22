import { Home } from '@/features/home/home';
import { requireLocale } from '@/features/localization/locale';
import { dictionary } from '@/features/localization/dictionaries';
import { pageMetadata } from '@/lib/seo/site';
type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props) { const locale = requireLocale((await params).locale); const d = dictionary(locale); return pageMetadata(locale, '', locale === 'ar' ? 'صيدلية الخليج | صحتكم. أولويتنا.' : 'Gulf Pharmacy | Your Health. Our Priority.', d.homeMeta); }
export default async function Page({ params }: Props) { return <Home locale={requireLocale((await params).locale)}/>; }
