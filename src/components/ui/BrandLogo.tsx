/**
 * BrandLogo — Leasétic light/dark logo lockup (UI-SPEC §6.1, ASSET-01 + ASSET-02).
 *
 * Renders TWO <img> tags side-by-side; the brand-logo CSS picker rules in
 * app/globals.css (added by Plan 11-01) hide whichever variant does not
 * match the current <html data-theme> attribute. Zero JavaScript — rides
 * the no-flash inline script that sets data-theme before first paint.
 *
 * Server component per CONTEXT D-09 + UI-SPEC §6.1 (no 'use client', no
 * client-only state). Consumed by Plan 11-04 RetractableSidebar brand row
 * and Plan 15 public surfaces (login / invite / reset).
 */
import { cn } from '@/lib/utils';

/**
 * Intrinsic aspect of the lockup assets in /public (862×200).
 *
 * Height derives from this rather than being passed alongside width at every
 * call site. When the official lockups were swapped in (2026-08-30) the ratio
 * went 1192×200 → 862×200, and the callers passing a matching 190×32 pair
 * silently became wrong: the browser letterboxes an <img> whose box disagrees
 * with the viewBox, so the logo shrank inside a 190px slot of dead space.
 * Swapping the asset again means changing this one number.
 */
const LOCKUP_ASPECT = 862 / 200;

export interface BrandLogoProps {
  /** Pixel width. Defaults to 190 (sidebar brand-row width per UI-SPEC §6.3). */
  width?: number;
  /** Pixel height. Derived from `width` via the asset aspect unless set. */
  height?: number;
  /** Required for non-decorative usage. If omitted, both <img> render alt="". */
  alt?: string;
  /** Optional class appended to outer <span>'s className. */
  className?: string;
}

export function BrandLogo({
  width = 190,
  height,
  alt = '',
  className = '',
}: BrandLogoProps) {
  const resolvedHeight = height ?? Math.round(width / LOCKUP_ASPECT);
  // `brand-logo` is retained deliberately: it is the hook for the zero-JS
  // light/dark picker rules in globals.css, not decoration. Phase 2 only
  // replaced the inline style with the equivalent utilities.
  const wrapperClass = cn('brand-logo inline-block leading-none', className);
  return (
    <span className={wrapperClass}>
      {/* eslint-disable-next-line @next/next/no-img-element -- intentional: CSS picker + zero-JS theme switch per CONTEXT D-09 */}
      <img
        className="brand-logo-light"
        src="/logo-light.svg"
        alt={alt}
        width={width}
        height={resolvedHeight}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- intentional: CSS picker + zero-JS theme switch per CONTEXT D-09 */}
      <img
        className="brand-logo-dark"
        src="/logo-dark.svg"
        alt={alt}
        width={width}
        height={resolvedHeight}
      />
    </span>
  );
}
