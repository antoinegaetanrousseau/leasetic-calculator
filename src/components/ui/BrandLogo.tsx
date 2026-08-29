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

export interface BrandLogoProps {
  /** Pixel width. Defaults to 190 (sidebar brand-row width per UI-SPEC §6.3). */
  width?: number;
  /** Pixel height. Defaults to 32 (1192×200 viewBox aspect at w=190 ≈ h=31.9). */
  height?: number;
  /** Required for non-decorative usage. If omitted, both <img> render alt="". */
  alt?: string;
  /** Optional class appended to outer <span>'s className. */
  className?: string;
}

export function BrandLogo({
  width = 190,
  height = 32,
  alt = '',
  className = '',
}: BrandLogoProps) {
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
        height={height}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- intentional: CSS picker + zero-JS theme switch per CONTEXT D-09 */}
      <img
        className="brand-logo-dark"
        src="/logo-dark.svg"
        alt={alt}
        width={width}
        height={height}
      />
    </span>
  );
}
