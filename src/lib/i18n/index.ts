import { cookies } from 'next/headers';
import { dictionaries, type Lang, type DictKey } from './dictionaries';

export { dictionaries };
export type { Lang, DictKey };

/** Pure helper. Falls back to FR if a key is missing in EN (TS makes that impossible at type level). */
export function t(key: DictKey, lang: Lang): string {
  return dictionaries[lang][key] ?? dictionaries.fr[key];
}

/**
 * Server-side cookie reader. ONLY call from server components / route handlers.
 * Reads lt_lang cookie (per UI-SPEC §Locale Bootstrap Contract).
 * Default: 'fr'.
 */
export async function getCurrentLang(): Promise<Lang> {
  const c = await cookies();
  const v = c.get('lt_lang')?.value;
  return v === 'en' ? 'en' : 'fr';
}

/** Server-side theme cookie reader for SSR rendering of <html data-theme>. */
export async function getCurrentTheme(): Promise<'light' | 'dark' | 'system'> {
  const c = await cookies();
  const v = c.get('lt_theme')?.value;
  if (v === 'light' || v === 'dark' || v === 'system') return v;
  return 'system';
}
