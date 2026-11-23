import type { Branch } from '@gulf/shared';
import type { Locale } from '@/lib/utils/locale';
import { dictionary } from '@/features/localization/dictionaries';
import { listPublicBranches } from '@/lib/api/public-branches';
import { BranchCard } from '@/features/branches/branch-card';
import { PublicError } from '@/features/branches/public-state';
import { MobileContact } from './contact-actions';
export async function ContactPage({ locale }: { locale: Locale }) {
  const d = dictionary(locale);
  let branches: Branch[] = [];
  let failed = false;
  try {
    branches = await listPublicBranches();
  } catch {
    failed = true;
  }
  return (
    <>
      <main id="home" className="public-shell public-page">
        <div className="public-page-heading">
          <p className="public-eyebrow">{d.contactEyebrow}</p>
          <h1>{d.contactTitle}</h1>
          <p>{d.contactIntro}</p>
        </div>
        {failed ? (
          <PublicError locale={locale} />
        ) : branches.length ? (
          <div className="public-branch-grid">
            {branches.map((branch) => (
              <BranchCard key={branch.id} branch={branch} locale={locale} />
            ))}
          </div>
        ) : (
          <p className="public-state">{d.noBranches}</p>
        )}
      </main>
      {branches.length === 1 && (
        <MobileContact branch={branches[0]} locale={locale} />
      )}
    </>
  );
}
