// Language token in the URL (/cs/dashboard, /en/dashboard) shared with the other sunamo.cz sites.
export const URL_LOCALES = ['cs', 'en'] as const;
export type UrlLocale = (typeof URL_LOCALES)[number];

const LOCALE_PREFIX = /^\/(cs|en)(?=\/|$)/;

/** Returns the language token at the start of a path (/cs/dashboard -> cs), or null when there is none. */
export function localeFromPath(path: string): UrlLocale | null {
  const match = path.match(LOCALE_PREFIX);

  return match ? (match[1] as UrlLocale) : null;
}

/** Removes the language token from the start of a path (/cs/dashboard -> /dashboard). */
export function stripLocale(path: string): string {
  const stripped = path.replace(LOCALE_PREFIX, '');

  return stripped === '' ? '/' : stripped;
}

/** Narrows any language code to the two URL languages (everything but Czech becomes English). */
export function toUrlLocale(language: string | null | undefined): UrlLocale {
  return language === 'cs' ? 'cs' : 'en';
}
