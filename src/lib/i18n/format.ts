/**
 * Number / currency / date formatting with EXPLICIT Intl locales.
 *
 * Per D-28 / SHELL-09: every Intl call passes 'fr-FR' or 'en-GB' explicitly.
 * Never call new Intl.NumberFormat() / new Intl.DateTimeFormat() with no
 * locale argument — that uses the runtime's system default and produces
 * non-deterministic output (e.g. '€' vs '$', ',' vs '.', UK vs US date order).
 *
 * Pure module — no I/O, no framework imports — importable from both Server
 * Components and Client Components.
 */
import type { Lang } from './dictionaries';

/** Internal: explicit BCP-47 locale tags. Per D-28: en-GB, never en-US. */
const LOCALES: Record<Lang, string> = {
  fr: 'fr-FR',
  en: 'en-GB',
};

/** Format a numeric monetary value as EUR currency in the user's locale. */
export function formatCurrency(value: number, lang: Lang): string {
  return new Intl.NumberFormat(LOCALES[lang], {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
}

/** Format a plain number with locale-correct grouping + decimal separator. */
export function formatNumber(
  value: number,
  lang: Lang,
  opts?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(LOCALES[lang], opts).format(value);
}

/** Format a Date with locale-correct month/day/year ordering. */
export function formatDate(
  date: Date,
  lang: Lang,
  opts?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(LOCALES[lang], opts).format(date);
}

/**
 * Test-only export of the locale map so tests can assert the explicit-locale
 * contract without re-defining it.
 */
export const _LOCALES_FOR_TEST: Readonly<Record<Lang, string>> = LOCALES;
