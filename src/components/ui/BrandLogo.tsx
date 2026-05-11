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
  const wrapperClass = className ? `brand-logo ${className}` : 'brand-logo';
  return (
    <span
      className={wrapperClass}
      style={{ display: 'inline-block', lineHeight: 0 }}
    >
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
