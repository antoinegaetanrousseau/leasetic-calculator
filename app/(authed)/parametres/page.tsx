/**
 * /parametres — Self-service settings page (Phase 21 / Plan 21-01 — D-06, D-06b,
 * D-06c, D-06d, D-07, D-08, D-10 rev 2).
 *
 * Server component:
 *  - inherits the (authed) layout's `requireUser()` auth gate (logged-out →
 *    /login automatically),
 *  - reads the current session via the same gate to derive initial form values
 *    (firstName / lastName split from Better Auth's single `user.name` column
 *    per RESEARCH §1e),
 *  - renders the Figma 132:867 (rev 2) hero + delegates the form to the
 *    `ParametresForm` client island.
 *
 * Email is rendered as static text in the form (D-06d resolved to
 * "email READ-ONLY" — see top-of-section comment in src/lib/auth/schemas.ts).
 */
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { PageHero } from '@/components/ui/PageHero';
import { ParametresForm } from './ParametresForm';

// Cookie/session-reading page → opt out of static rendering (PITFALLS §1.6).
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Paramètres — Leasétic Matrice' };

/**
 * Split a Better Auth `user.name` ("Antoine Rousseau") into Prénom + Nom.
 * Mirrors the convention documented in 21-RESEARCH §1e — first token is
 * firstName, everything after is lastName.
 */
function splitName(name: string): { firstName: string; lastName: string } {
  const trimmed = name.trim();
  if (!trimmed) return { firstName: '', lastName: '' };
  const parts = trimmed.split(/\s+/);
  const firstName = parts[0] ?? '';
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

export default async function ParametresPage() {
  // (authed)/layout.tsx already called requireUser() — calling again here gives
  // us the typed session without a second redirect path (the layout would have
  // bounced us already if the cookie were missing). AUTH-16 re-check rerun is
  // intentional (per-request DB freshness; cheap query indexed by id).
  const { session } = await requireUser();
  const lang = await getCurrentLang();

  // Better Auth session.user shape — name is the canonical column we read from
  // for the displayed Prénom + Nom (Phase 21 chose `name`, NOT `displayName`,
  // because authClient.updateUser({ name }) is the only writeable surface for
  // the firstName/lastName concatenation per RESEARCH §1d).
  const user = session.user as {
    id: string;
    email: string;
    name?: string | null;
    displayName?: string | null;
  };
  const fullName = (user.name ?? user.displayName ?? '').toString();
  const { firstName, lastName } = splitName(fullName);

  return (
    <main style={{ maxWidth: 1040, margin: '0 auto', padding: '0 24px' }}>
      <PageHero
        title={t('parametres.hero.title', lang)}
        subtitle={t('parametres.hero.subtitle', lang)}
      />
      <ParametresForm
        lang={lang}
        initialFirstName={firstName}
        initialLastName={lastName}
        initialEmail={user.email}
        emailEditable={false /* D-06d → READ-ONLY (live DB probe 2026-05-29) */}
      />
    </main>
  );
}
