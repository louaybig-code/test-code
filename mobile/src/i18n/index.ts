/**
 * i18n — French-first, exact same semantics as the web app's i18next setup
 * (lng: 'fr', fallbackLng: 'fr'). Strings are the verbatim JSON from the web app.
 */
import fr from './fr.json';
import en from './en.json';

type Nested = { [k: string]: string | Nested };

const dictionaries: Record<'fr' | 'en', Nested> = {
  fr: fr as unknown as Nested,
  en: en as unknown as Nested,
};

export type Locale = 'fr' | 'en';

let currentLocale: Locale = 'fr'; // web default

export const setLocale = (l: Locale) => {
  currentLocale = l;
};

export const getLocale = () => currentLocale;

function lookup(dict: Nested, path: string): string | undefined {
  let node: any = dict;
  for (const part of path.split('.')) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/** i18next-compatible signature: t('auth.login'), t('common.retry', { defaultValue }) */
export function t(path: string, options?: { defaultValue?: string }): string {
  return (
    lookup(dictionaries[currentLocale], path) ??
    lookup(dictionaries.fr, path) ?? // fallbackLng: 'fr' (same as web)
    options?.defaultValue ??
    path
  );
}

export const useTranslation = () => ({ t, i18n: { language: currentLocale } });
