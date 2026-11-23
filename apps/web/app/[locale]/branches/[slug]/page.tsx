import { notFound } from 'next/navigation';
import { BranchProfile } from '@/features/branches/branch-profile';
import { PublicError } from '@/features/branches/public-state';
import { getPublicBranch, PublicApiError } from '@/lib/api/public-branches';
import { branchMetadata, pageMetadata } from '@/lib/seo/site';
import { requireLocale } from '@/features/localization/locale';
import { dictionary } from '@/features/localization/dictionaries';
type Props = { params: Promise<{ locale: string; slug: string }> };
async function load(slug: string) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 120) notFound();
  try {
    return await getPublicBranch(slug);
  } catch (error) {
    if (error instanceof PublicApiError && error.status === 404) notFound();
    return undefined;
  }
}
export async function generateMetadata({ params }: Props) {
  const { locale: value, slug } = await params;
  const locale = requireLocale(value);
  const branch = await load(slug);
  return branch
    ? branchMetadata(locale, branch)
    : pageMetadata(
        locale,
        '/branches/' + slug,
        dictionary(locale).branches,
        dictionary(locale).apiError,
        false,
      );
}
export default async function Page({ params }: Props) {
  const { locale: value, slug } = await params;
  const locale = requireLocale(value);
  const branch = await load(slug);
  return branch ? (
    <BranchProfile branch={branch} locale={locale} />
  ) : (
    <main id="home" className="public-shell public-page">
      <PublicError locale={locale} />
    </main>
  );
}
