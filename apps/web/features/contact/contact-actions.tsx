import type { Branch } from '@gulf/shared';
import type { Locale } from '@/lib/utils/locale';
import { dictionary } from '@/features/localization/dictionaries';
import { PublicIcon } from '@/components/ui/public-icons';
export function ContactActions({
  branch,
  locale,
  compact = false,
}: {
  branch: Branch;
  locale: Locale;
  compact?: boolean;
}) {
  const d = dictionary(locale);
  return (
    <div className="public-contact-actions">
      <a
        className="public-button"
        data-contact-kind="whatsapp"
        data-branch-slug={branch.slug}
        href={branch.whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <PublicIcon name="chat" />
        {d.whatsapp}
      </a>
      <a
        className="public-button public-button-outline"
        data-contact-kind="maps"
        data-branch-slug={branch.slug}
        href={branch.mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <PublicIcon name="pin" />
        {d.directions}
      </a>
      {!compact && (
        <a
          className="public-button public-button-plain"
          data-contact-kind="phone"
          data-branch-slug={branch.slug}
          href={'tel:' + branch.phone.replace(/[^+0-9]/g, '')}
        >
          <PublicIcon name="phone" />
          {d.call}
        </a>
      )}
    </div>
  );
}
export function MobileContact({
  branch,
  locale,
}: {
  branch: Branch;
  locale: Locale;
}) {
  return (
    <div
      className="public-mobile-contact"
      aria-label={dictionary(locale).contact}
    >
      <ContactActions branch={branch} locale={locale} />
    </div>
  );
}
