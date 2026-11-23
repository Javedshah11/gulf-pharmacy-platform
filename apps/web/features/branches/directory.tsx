import Link from 'next/link';
import type { Branch } from '@gulf/shared';
import type { Locale } from '@/lib/utils/locale';
import { dictionary } from '@/features/localization/dictionaries';
import { listPublicBranches } from '@/lib/api/public-branches';
import { BranchCard } from './branch-card';
import { PublicError } from './public-state';
export async function BranchDirectory({
  locale,
  query = '',
}: {
  locale: Locale;
  query?: string;
}) {
  const d = dictionary(locale);
  let branches: Branch[] = [];
  let failed = false;
  try {
    branches = await listPublicBranches(query);
  } catch {
    failed = true;
  }
  return (
    <main id="home" className="public-shell public-page">
      <div className="public-page-heading">
        <p className="public-eyebrow">{d.branches}</p>
        <h1>{d.directoryTitle}</h1>
        <p>{d.directoryIntro}</p>
      </div>
      <form
        className="public-search"
        action={'/' + locale + '/branches'}
        method="get"
      >
        <label htmlFor="branch-search">{d.search}</label>
        <div>
          <input
            id="branch-search"
            name="q"
            type="search"
            maxLength={100}
            defaultValue={query}
            placeholder={d.searchPlaceholder}
          />
          <button className="public-button" type="submit">
            {d.searchButton}
          </button>
        </div>
        {query && (
          <Link className="public-text-link" href={'/' + locale + '/branches'}>
            {d.clearSearch}
          </Link>
        )}
      </form>
      {failed ? (
        <PublicError locale={locale} />
      ) : branches.length ? (
        <>
          <p className="public-results" role="status">
            {d.results}: {new Intl.NumberFormat(locale).format(branches.length)}
          </p>
          <div className="public-branch-grid">
            {branches.map((branch) => (
              <BranchCard key={branch.id} branch={branch} locale={locale} />
            ))}
          </div>
        </>
      ) : (
        <div className="public-state">
          <h2>{query ? d.noResults : d.noBranches}</h2>
          {query && <p>{d.noResultsIntro}</p>}
        </div>
      )}
    </main>
  );
}
