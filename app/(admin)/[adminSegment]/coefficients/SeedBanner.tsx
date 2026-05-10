'use client';

/**
 * D-10-13/14: Yellow informational banner on the coefficients page.
 *
 * Visible when the latest global_params row's coefficients are byte-equal to
 * seedParams.coefficients (i.e., admin hasn't customized yet — still on D-D1
 * placeholder values). The visibility check is performed SERVER-SIDE in
 * `coefficients/page.tsx` (single source of truth — no client comparison) and
 * passed as the `visible` prop. Banner disappears once admin saves any edit
 * (which creates a new global_params row that no longer JSON.stringify-matches
 * seedParams.coefficients).
 *
 * Accessibility: role="status" + aria-live="polite" — screen readers announce
 * the banner on page load without stealing focus (banner is informational,
 * not interactive).
 */
import { t, type Lang } from '@/lib/i18n/dictionaries';

interface SeedBannerProps {
  lang: Lang;
  visible: boolean;
}

export function SeedBanner({ lang, visible }: SeedBannerProps) {
  if (!visible) return null;
  return (
    <div
      className="seed-banner"
      role="status"
      aria-live="polite"
    >
      {t('admin.seed_banner.message', lang)}
    </div>
  );
}
