import './globals.css';
import localFont from 'next/font/local';
import { Toaster } from 'sonner';
import { NO_FLASH_SCRIPT } from '@/lib/theme/no-flash-script';
import { getCurrentLang, getCurrentTheme } from '@/lib/i18n';

/**
 * Plus Jakarta Sans, self-hosted under public/fonts/ per UI-SPEC §Font Loading Contract.
 * variable: '--font-plus-jakarta-sans' is the CSS variable consumed by app/globals.css @theme.
 * display: 'swap' keeps text readable while the font loads.
 * CRITICAL for Phase 8: this declaration is what makes document.fonts.ready resolve;
 * downstream PDF rendering depends on it.
 */
const plusJakartaSans = localFont({
  src: [
    { path: '../public/fonts/PlusJakartaSans-300.woff2', weight: '300', style: 'normal' },
    { path: '../public/fonts/PlusJakartaSans-400.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/PlusJakartaSans-500.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/PlusJakartaSans-600.woff2', weight: '600', style: 'normal' },
    { path: '../public/fonts/PlusJakartaSans-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

export const metadata = {
  title: 'Leasétic Matrice',
  description: 'Matrice commerciale Leasétic — application interne',
};

// SECURITY: NO_FLASH_SCRIPT is a compile-time string constant defined in
// src/lib/theme/no-flash-script.ts — never user input. This is the standard
// SSR theme bootstrap pattern (same as next-themes). XSS risk is zero because
// the script content is authored in our own source and never accepts user data.
// Cannot use next/script here — it loads after hydration, causing theme flash.
const inlineScript = { __html: NO_FLASH_SCRIPT };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getCurrentLang();
  const themeCookie = await getCurrentTheme();
  // SSR-only resolution: 'system' stays 'system' for the html attr; the no-flash script
  // resolves it client-side. For SSR fallback we render 'light' as a neutral default
  // when cookie is 'system' so server markup is stable; the inline script overrides
  // before paint based on prefers-color-scheme.
  const ssrTheme = themeCookie === 'system' ? 'light' : themeCookie;

  return (
    <html lang={lang} data-theme={ssrTheme} className={plusJakartaSans.variable}>
      <head>
        {/* Inline no-flash script — compile-time constant from src/lib/theme/no-flash-script.ts.
            Standard Next.js pattern for SSR theme bootstrap. See comment above for security analysis. */}
        <script suppressHydrationWarning dangerouslySetInnerHTML={inlineScript} />
      </head>
      <body>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
