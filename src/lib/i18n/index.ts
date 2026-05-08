import { cookies } from 'next/headers';
import { dictionaries, type Lang, type DictKey, t } from './dictionaries';

/**
 * Re-export the pure `t()` helper and types so server components can import
 * everything from '@/lib/i18n' (one-stop import).
 *
 * Client components MUST import `t` and `Lang` directly from
 * '@/lib/i18n/dictionaries' to avoid pulling in `next/headers`.
 */
export { dictionaries, t };
export type { Lang, DictKey };

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
