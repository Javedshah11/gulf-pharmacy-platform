import Link from 'next/link';
import type { Branch } from '@gulf/shared';
import type { Locale } from '@/lib/utils/locale';
import {
  dictionary,
  localized,
  weekDays,
} from '@/features/localization/dictionaries';
import {
  ContactActions,
  MobileContact,
} from '@/features/contact/contact-actions';
import { pharmacyJsonLd } from '@/lib/seo/site';
import { PublicIcon } from '@/components/ui/public-icons';
export function BranchProfile({
  branch,
  locale,
}: {
  branch: Branch;
  locale: Locale;
}) {
  const d = dictionary(locale);
  const person = localized(branch.contactNameEn, branch.contactNameAr, locale);
  const description = localized(
    branch.descriptionEn,
    branch.descriptionAr,
    locale,
  );
  const fallback =
    locale === 'ar'
      ? !branch.descriptionAr && Boolean(branch.descriptionEn)
      : !branch.descriptionEn && Boolean(branch.descriptionAr);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(pharmacyJsonLd(locale, branch)).replace(
            /</g,
            '\\u003c',
          ),
        }}
      />
      <main id="home" className="public-shell public-page public-branch-page">
        <Link className="public-text-link" href={'/' + locale + '/branches'}>
          {d.branches}
        </Link>
        <div className="public-page-heading">
          <p className="public-eyebrow">{d.branchEyebrow}</p>
          <h1>{localized(branch.nameEn, branch.nameAr, locale)}</h1>
          <p>{localized(branch.addressEn, branch.addressAr, locale)}</p>
        </div>
        <div className="public-profile-grid">
          <section className="public-profile-contact">
            <span className="public-icon-box">
              <PublicIcon name="pin" />
            </span>
            <h2>{d.visit}</h2>
            <dl>
              <dt>{d.address}</dt>
              <dd>{localized(branch.addressEn, branch.addressAr, locale)}</dd>
              {person && (
                <>
                  <dt>{d.branchContact}</dt>
                  <dd>{person}</dd>
                </>
              )}
              <dt>{d.phone}</dt>
              <dd>
                <a
                  href={'tel:' + branch.phone.replace(/[^+0-9]/g, '')}
                  dir="ltr"
                >
                  {branch.phone}
                </a>
              </dd>
            </dl>
            <ContactActions branch={branch} locale={locale} />
          </section>
          <div className="public-profile-information">
            {description && (
              <section>
                <p className="public-eyebrow">{d.profileTitle}</p>
                <p lang={fallback ? (locale === 'ar' ? 'en' : 'ar') : locale}>
                  {description}
                </p>
                {fallback && <small>{d.fallback}</small>}
              </section>
            )}
            <section>
              <h2>
                <PublicIcon name="clock" />
                {d.hours}
              </h2>
              {branch.openingHours.length ? (
                <>
                  <dl className="public-hours">
                    {[...branch.openingHours]
                      .sort((a, b) => a.day - b.day)
                      .map((period) => (
                        <div key={period.day}>
                          <dt>{weekDays[locale][period.day]}</dt>
                          <dd>
                            <span dir="ltr">
                              {period.opens} – {period.closes}
                            </span>
                            {period.closes < period.opens && (
                              <small>{d.overnight}</small>
                            )}
                          </dd>
                        </div>
                      ))}
                  </dl>
                  <p className="public-small">{d.hoursNote}</p>
                </>
              ) : (
                <p>{d.hoursEmpty}</p>
              )}
            </section>
            <section>
              <h2>{d.approvedServices}</h2>
              {branch.services.length ? (
                <ul className="public-service-list">
                  {branch.services.map((service) => (
                    <li key={service.nameEn}>
                      {localized(service.nameEn, service.nameAr, locale)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{d.serviceEmpty}</p>
              )}
            </section>
          </div>
        </div>
      </main>
      <MobileContact branch={branch} locale={locale} />
    </>
  );
}
