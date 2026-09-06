import type { Lang } from "./dictionaries"

/**
 * SSR-safe narrowing of `document.documentElement.lang` (an unnarrowed
 * `string`) to `Lang` (`'fr' | 'en'`), so `t()` can accept it.
 *
 * The `typeof document === 'undefined'` guard exists because `sheet.tsx`
 * carries no `"use client"` directive and Next.js server-renders client
 * components for the initial HTML — an unguarded `document` read would throw
 * at build/SSR time. The `'fr'` default matches `t()`'s own FR fallback.
 */
export function resolveDomLang(): Lang {
  if (typeof document === "undefined") {
    return "fr"
  }
  const lang = document.documentElement.lang.toLowerCase()
  return lang.startsWith("en") ? "en" : "fr"
}
