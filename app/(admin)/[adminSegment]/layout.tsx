import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/require';
import { getCurrentLang, getCurrentTheme } from '@/lib/i18n';
import { Shell } from '@/components/ui/Shell';

// PITFALLS §1.6 — every cookie/session-reading layout opts out of static rendering.
export const dynamic = 'force-dynamic';

interface AdminLayoutProps {
  params: Promise<{ adminSegment: string }>; // PITFALL §1.1: async params in Next.js 16
  children: React.ReactNode;
}

/**
 * Hidden admin URL gate — two-layer defense per AUTH-14 / AUTH-15 / D-18.
 *
 * Layer 1 (URL obscurity): if params.adminSegment !== process.env.ADMIN_URL_SEGMENT,
 * call notFound() (renders 404, NOT 403, NOT redirect). This preserves URL secrecy —
 * a guesser cannot distinguish "admin URL exists, not authorized" from "this URL does
 * not exist at all" (AUTH-14, D-18).
 *
 * When the env var is unset (misconfiguration or missing .env.local), the gate fails
 * closed: notFound() fires and the admin tree is unreachable until the env var is set.
 * Operationally safe: no admin reach is the safe failure mode (T-06-07-04 accept).
 *
 * Layer 2 (role check): requireAdmin() is the actual security gate. Even if a partner
 * learns the correct segment value, requireAdmin() calls notFound() for non-admin roles
 * (PITFALLS §7.1: URL obscurity is NOT security; the role check is the real gate).
 *
 * Per AUTH-15: this layout is NOT the only gate. Every admin route handler and page
 * (Phase 9 will add many) MUST independently call requireAdmin() before any data access
 * (defense in depth — mitigates layout-bypass attacks).
 */
export default async function AdminLayout({ params, children }: AdminLayoutProps) {
  // PITFALL §1.1: params is a Promise in Next.js 16 — MUST await.
  const { adminSegment } = await params;

  // Layer 1: URL obscurity check (D-18 / AUTH-14).
  // Check BEFORE requireAdmin() so we do NOT leak that the route even exists
  // (PITFALLS §7.3 ordering: segment match → role check → business logic).
  const expected = process.env.ADMIN_URL_SEGMENT;
  if (!expected || adminSegment !== expected) {
    notFound();
  }

  // Layer 2: role check — actual security gate (PITFALLS §7.1, AUTH-15).
  // requireAdmin() calls requireUser() first (redirect to /login if no session),
  // then checks role === 'admin' (notFound() if not — D-18: 404 not 403).
  const { session } = await requireAdmin();

  const lang = await getCurrentLang();
  const theme = await getCurrentTheme();

  // Fallback chain matches (authed)/layout.tsx: displayName → name → email.
  const u = session.user as {
    email: string;
    displayName?: string | null;
    name?: string | null;
  };
  const displayName = u.displayName ?? u.name ?? u.email;

  return (
    <Shell
      isAdmin={true}
      lang={lang}
      theme={theme}
      displayName={displayName}
      email={u.email}
      activeNav="admin-home"
      adminSegment={adminSegment}
    >
      {children}
    </Shell>
  );
}
