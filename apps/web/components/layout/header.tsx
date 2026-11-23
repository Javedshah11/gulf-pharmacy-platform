'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brand } from '../ui/brand';
import type { Locale } from '@/lib/utils/locale';
import { dictionary } from '@/features/localization/dictionaries';
export function Header({ locale }: { locale: Locale }) {
  const d = dictionary(locale);
  const pathname = usePathname();
  const other = locale === 'en' ? 'ar' : 'en';
  const links = [
    { path: '', text: d.home },
    { path: '/branches', text: d.branches },
    {
      path: '/health-academy',
      text: locale === 'ar' ? 'الأكاديمية الصحية' : 'Health Academy',
    },
    { path: '/about', text: d.about },
    { path: '/contact', text: d.contact },
  ];
  return (
    <header className="public-header">
      <div className="public-shell public-header-inner">
        <Brand href={'/' + locale} />
        <nav
          aria-label={locale === 'ar' ? 'التنقل الرئيسي' : 'Main navigation'}
        >
          {links.map((link) => (
            <Link
              key={link.path}
              href={'/' + locale + link.path}
              aria-current={
                pathname === '/' + locale + link.path ? 'page' : undefined
              }
            >
              {link.text}
            </Link>
          ))}
        </nav>
        <Link
          className="public-language"
          href={pathname.replace(/^\/(en|ar)(?=\/|$)/, '/' + other)}
          aria-label={d.switchLanguage}
          lang={other}
          hrefLang={other}
        >
          {d.language}
        </Link>
      </div>
    </header>
  );
}
