import './globals.css';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { NO_FLASH_SCRIPT } from '@/lib/theme/no-flash-script';
import { getCurrentLang, getCurrentTheme } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';

/**
 * Inter — the Leasétic Group design-system typeface (Figma DS + ReUI Maia preset).
 * Replaced the previous self-hosted Plus Jakarta Sans; next/font/google downloads the
 * font at build time and serves it from our own origin, so there is no runtime request
 * to Google and the UI-SPEC §Font Loading Contract still holds.
 *
 * NOTE: PDF generation is a separate surface — src/lib/pdf/document.tsx registers its
 * own Inter TTFs from public/fonts/ (Phase 41). Same family as the UI, different binary:
 * the UI downloads Inter via next/font/google at build time, the PDF renders from four
 * committed static TTFs that define the PROP-17 byte-determinism baseline.
 */
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
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
    // suppressHydrationWarning: layer 2 (NO_FLASH_SCRIPT) deliberately rewrites
    // data-theme on this element before hydration, so when the cookie is absent or
    // 'system' the DOM legitimately disagrees with the 'light' SSR fallback above.
    // React cannot patch attribute mismatches, so without this it logs a hydration
    // error on every load for a difference the design intends. Scoped to <html>'s own
    // attributes only — it does not suppress mismatches in any child.
    <html
      lang={lang}
      data-theme={ssrTheme}
      className={cn('font-sans', inter.variable)}
      suppressHydrationWarning
    >
      <head>
        {/* Inline no-flash script — compile-time constant from src/lib/theme/no-flash-script.ts.
            Standard Next.js pattern for SSR theme bootstrap. See comment above for security analysis. */}
        <script suppressHydrationWarning dangerouslySetInnerHTML={inlineScript} />
      </head>
      <body>
        <TooltipProvider>
          {children}
          <Toaster position="top-right" richColors />
        </TooltipProvider>
      </body>
    </html>
  );
}
