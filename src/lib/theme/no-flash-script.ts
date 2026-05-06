/**
 * No-flash theme bootstrap script (UI-SPEC §Theme Bootstrap Contract).
 * Runs INLINE in <head> before first paint. Reads lt_theme cookie and
 * applies data-theme to <html>. Falls back to system preference if cookie absent.
 *
 * Cookie name: lt_theme
 * Values: 'light' | 'dark' | 'system' (default 'system')
 *
 * Critical: this is one of three layers ensuring zero theme flash.
 * 1. Server-side cookie read in app/layout.tsx sets <html data-theme={t}>
 * 2. This inline script re-asserts the value before paint (handles race with hydration)
 * 3. ThemeToggle component (Server Action) writes the cookie + reloads
 *
 * SECURITY NOTE: This is a compile-time string constant, never user input.
 * It's injected into the head via Next.js's standard inline-script pattern (the
 * same pattern used by next-themes and the rest of the SSR-themed-app ecosystem).
 * Using next/script would defer the script and re-introduce the flash.
 */
export const NO_FLASH_SCRIPT = `
(function(){
  try{
    var m=document.cookie.match(/(?:^|;\\s*)lt_theme=([^;]+)/);
    var t=m?m[1]:'system';
    if(t==='system'){t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';}
    document.documentElement.setAttribute('data-theme',t);
  }catch(_){}
})();
`;
