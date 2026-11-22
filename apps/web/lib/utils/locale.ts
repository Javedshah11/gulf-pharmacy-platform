export type Locale = 'en' | 'ar';
export function direction(locale: Locale) {
  return locale === 'ar' ? 'rtl' : 'ltr';
}
