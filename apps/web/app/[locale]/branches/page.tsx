import { BranchDirectory } from '@/features/branches/directory';
import { requireLocale } from '@/features/localization/locale';
import { dictionary } from '@/features/localization/dictionaries';
import { pageMetadata } from '@/lib/seo/site';
type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
};
function query(value?: string | string[]) {
  return (typeof value === 'string' ? value : '').trim().slice(0, 100);
}
export async function generateMetadata({ params, searchParams }: Props) {
  const locale = requireLocale((await params).locale);
  const d = dictionary(locale);
  return pageMetadata(
    locale,
    '/branches',
    d.branches + ' | ' + (locale === 'ar' ? 'صيدلية الخليج' : 'Gulf Pharmacy'),
    d.branchesMeta,
    !query((await searchParams).q),
  );
}
export default async function Page({ params, searchParams }: Props) {
  return (
    <BranchDirectory
      locale={requireLocale((await params).locale)}
      query={query((await searchParams).q)}
    />
  );
}
