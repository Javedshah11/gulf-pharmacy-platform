import Link from 'next/link';
import type { Branch } from '@gulf/shared';
import type { Locale } from '@/lib/utils/locale';
import { dictionary, localized } from '@/features/localization/dictionaries';
import { PublicIcon } from '@/components/ui/public-icons';
import { ContactActions } from '@/features/contact/contact-actions';
export function BranchCard({ branch, locale }: { branch: Branch; locale: Locale }) { const d = dictionary(locale); const name = localized(branch.nameEn, branch.nameAr, locale); const person = localized(branch.contactNameEn, branch.contactNameAr, locale); return <article className="public-branch-card"><div className="public-branch-card-top"><span className="public-icon-box"><PublicIcon name="pin"/></span><span>{locale === 'ar' ? 'صيدلية الخليج' : 'Gulf Pharmacy'}</span></div><h3><Link href={'/' + locale + '/branches/' + branch.slug}>{name}</Link></h3><p className="public-address">{localized(branch.addressEn, branch.addressAr, locale)}</p>{person && <p className="public-branch-person">{person}</p>}<a className="public-phone" dir="ltr" href={'tel:' + branch.phone.replace(/[^+0-9]/g, '')}>{branch.phone}</a><ContactActions branch={branch} locale={locale} compact/><Link className="public-text-link" href={'/' + locale + '/branches/' + branch.slug}>{d.details}</Link></article>; }
