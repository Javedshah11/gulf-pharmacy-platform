'use client';
import { useLayoutEffect } from 'react';
import type { Locale } from '@/lib/utils/locale';
// The server supplies these attributes on first load. Next retains the root
// layout during client navigation, so synchronize its attributes after a route change.
export function DocumentLocale({ locale }: { locale: Locale }) {
  useLayoutEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);
  return null;
}
