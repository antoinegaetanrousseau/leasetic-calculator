import Link from 'next/link';
import type { ComponentType } from 'react';

/**
 * AdminNavCard — v1.2 navigation card primitive for admin home (COMP-04, UI-SPEC §6.5).
 *
 * 3 variants:
 *   - coefficients → accent var(--gd)   (green) — Sliders icon
 *   - partners     → accent var(--teal)         — Users icon
 *   - history      → accent var(--navy)         — History icon
 *
 * Server component. Renders Next.js <Link>; consumers pass i18n-resolved strings
 * + lucide icon component. Existing Phase 9 .admin-nav-card hover+focus CSS in
 * app/globals.css is reused (chained via .admin-nav-card-v2 for v1.2 layout).
 */
type Variant = 'coefficients' | 'partners' | 'history';

export interface AdminNavCardProps {
  title: string;
  description: string;
  variant: Variant;
  href: string;
  icon: ComponentType<{ size: number; strokeWidth: number; color?: string; 'aria-hidden'?: boolean }>;
  openLabel: string;
}

// Variant → (icon-square RGB tuple at 10% opacity, icon stroke CSS var).
const ACCENT_BY_VARIANT: Record<Variant, { rgb: string; token: string }> = {
  coefficients: { rgb: '18, 150, 87', token: 'var(--gd)' },
  partners: { rgb: '45, 122, 140', token: 'var(--teal)' },
  history: { rgb: '17, 44, 59', token: 'var(--navy)' },
};

export function AdminNavCard({
  title,
  description,
  variant,
  href,
  icon: Icon,
  openLabel,
}: AdminNavCardProps) {
  const accent = ACCENT_BY_VARIANT[variant];
  return (
    <Link
      href={href}
      className="admin-nav-card admin-nav-card-v2"
      aria-label={`${title}: ${description}. ${openLabel}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: 24,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        boxShadow: 'var(--shadow-card)',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `rgba(${accent.rgb}, 0.10)`,
        }}
      >
        <Icon size={24} strokeWidth={1.6} color={accent.token} aria-hidden={true} />
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.4, color: 'var(--ink)' }}>
        {title}
      </div>
      <div
        style={{
          fontSize: '14.5px',
          fontWeight: 400,
          lineHeight: 1.55,
          color: 'var(--muted)',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {description}
      </div>
      <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--teal)' }}>{openLabel}</div>
    </Link>
  );
}
