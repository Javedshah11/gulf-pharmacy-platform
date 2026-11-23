import Link from 'next/link';
import type { Locale } from '@/lib/utils/locale';
import { dictionary } from '@/features/localization/dictionaries';
import { Brand } from '../ui/brand';
export function Footer({ locale }: { locale: Locale }) {
  const d = dictionary(locale);
  return (
    <footer className="public-footer">
      <div className="public-shell">
        <div className="public-footer-top">
          <div>
            <Brand href={'/' + locale} />
            <p>{d.footerIntro}</p>
          </div>
          <nav
            aria-label={locale === 'ar' ? 'روابط التذييل' : 'Footer navigation'}
          >
            <Link href={'/' + locale + '/branches'}>{d.branches}</Link>
            <Link href={'/' + locale + '/about'}>{d.about}</Link>
            <Link href={'/' + locale + '/contact'}>{d.contact}</Link>
            <Link href="/admin/login">{d.staff}</Link>
          </nav>
        </div>
        <p className="public-footer-note">{d.footerNote}</p>
        <div className="public-footer-bottom">
          <span>
            © {new Date().getUTCFullYear()} {d.footerCopyright}
          </span>
          <div>
            <Link href={'/' + locale + '/privacy'}>{d.privacy}</Link>
            <Link href={'/' + locale + '/terms'}>{d.terms}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
