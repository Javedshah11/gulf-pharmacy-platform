import { requireLocale } from '@/features/localization/locale';
import { dictionary } from '@/features/localization/dictionaries';
import { ContactPage } from '@/features/contact/contact-page';
import { pageMetadata } from '@/lib/seo/site';
type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props) {
  const locale = requireLocale((await params).locale);
  const d = dictionary(locale);
  return pageMetadata(
    locale,
    '/contact',
    d.contact + ' | ' + (locale === 'ar' ? 'صيدلية الخليج' : 'Gulf Pharmacy'),
    d.contactMeta,
  );
}
export default async function Page({ params }: Props) {
  return <ContactPage locale={requireLocale((await params).locale)} />;
}
