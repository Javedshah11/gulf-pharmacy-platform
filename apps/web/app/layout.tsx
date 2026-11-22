import type { Metadata } from 'next';
import { headers } from 'next/headers';
import '@fontsource-variable/inter';
import '@fontsource-variable/noto-sans-arabic';
import './globals.css';
export const metadata: Metadata = {
  title: 'Gulf Pharmacy | صيدلية الخليج — Dammam',
  description:
    'Visit Gulf Pharmacy in Ar Rabi, Dammam. Contact Dr. Fahad Badshah on WhatsApp or get directions to Street 8.',
  icons: { icon: '/icon.svg' },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await headers()).get('x-gulf-locale') === 'ar' ? 'ar' : 'en';
  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#home">
          {locale === 'ar' ? 'الانتقال إلى المحتوى' : 'Skip to content'}
        </a>
        {children}
      </body>
    </html>
  );
}
