import { requireLocale } from '@/features/localization/locale';
import { dictionary } from '@/features/localization/dictionaries';
import { InformationPage } from '@/features/home/information-page';
import { pageMetadata } from '@/lib/seo/site';
type Props = { params: Promise<{ locale: string }> };
export async function generateMetadata({ params }: Props) {
  const locale = requireLocale((await params).locale);
  const d = dictionary(locale);
  return pageMetadata(locale, '/terms', d.termsTitle, d.termsIntro);
}
export default async function Page({ params }: Props) {
  return (
    <InformationPage
      locale={requireLocale((await params).locale)}
      kind="terms"
    />
  );
}
