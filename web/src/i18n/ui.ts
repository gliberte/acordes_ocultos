import es from './es.json';
import en from './en.json';

export type Locale = 'es' | 'en';

export const defaultLocale: Locale = 'es';
export const supportedLocales: Locale[] = ['es', 'en'];

export const translations = {
  es,
  en,
} as const;

export function getLocale(urlOrLocale?: string | URL | null): Locale {
  if (!urlOrLocale) return defaultLocale;
  const path = typeof urlOrLocale === 'string'
    ? urlOrLocale
    : urlOrLocale.pathname;
  if (path.startsWith('/en') || path === 'en') {
    return 'en';
  }
  return 'es';
}

export function useTranslations(locale: Locale = defaultLocale) {
  const dict = translations[locale] || translations.es;

  return function t<
    Section extends keyof typeof dict,
    Key extends keyof typeof dict[Section]
  >(section: Section, key: Key): string {
    return (dict[section] as any)?.[key] || (translations.es[section] as any)?.[key] || '';
  };
}
