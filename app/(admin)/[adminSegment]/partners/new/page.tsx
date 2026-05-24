/**
 * Phase 14 — /[adminSegment]/partners/new server-component route.
 * Phase 18 Plan 04 — PageHero adoption + breadcrumb above hero per UI-SPEC §Créer partenaire.
 *
 * D-05 — server component with requireAdmin() defence-in-depth (AUTH-15) +
 * dynamic = 'force-dynamic' (PITFALLS §1.6). Renders breadcrumb + PageHero +
 * <CreatePartnerForm> client component wired to createPartnerInvitationAction.
 *
 * Layout (UI-SPEC §Créer partenaire L379-394):
 *   <main maxWidth=720>                      ← UI-SPEC L901 narrow surface
 *     <Link>← PARTENAIRES</Link>             ← breadcrumb above hero (var(--muted) → var(--teal) hover)
 *     <PageHero title subtitle />            ← NO actions slot per D-15 (submit lives in form action card)
 *     <CreatePartnerForm />                  ← Phase 14 form, behavior unchanged
 *   </main>
 *
 * The route is admin-only; non-admin or unauthenticated users hit notFound()
 * via requireAdmin → keeps the admin URL secret (AUTH-14).
 *
 * ADMIN-09 D-29 strict envelope: this page renders ZERO commission strings
 * (form fields are firstName/lastName/email/companyName/siret/phone/message —
 * none are financial-rate values).
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { requireAdmin } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { createPartnerInvitationAction } from '@/lib/admin';
import { PageHero } from '@/components/ui/PageHero';

import { CreatePartnerForm } from './CreatePartnerForm';

// PITFALLS §1.6 — opts out of static rendering (cookie + session reads).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Créer un partenaire — Leasétic Matrice',
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ adminSegment: string }>;
}

export default async function CreatePartnerPage({ params }: PageProps) {
  const { adminSegment } = await params;
  // AUTH-15 defence-in-depth — primary gate is middleware + (admin)/layout,
  // this is the page-level secondary guard.
  await requireAdmin();
  const lang = await getCurrentLang();

  return (
    <main
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '0 24px',
      }}
    >
      {/*
        Breadcrumb above the hero per UI-SPEC L386-393 (D-15 layout).
        Default color: var(--muted). Hover: var(--teal) — handled by the
        global `a:hover` rule + a local className for the teal hover state.
        Letter-spacing 0.04em matches the table-header capital treatment.
      */}
      <Link
        href={`/${adminSegment}/partners`}
        className="breadcrumb-link"
        style={{
          fontSize: 12.5,
          fontWeight: 500,
          color: 'var(--muted)',
          textDecoration: 'none',
          marginBottom: 12,
          marginTop: 32,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          letterSpacing: '0.04em',
        }}
      >
        {`← ${t('admin.partners.breadcrumb.label', lang)}`}
      </Link>

      <PageHero
        title={t('partners.new.title', lang)}
        subtitle={t('partners.new.subtitle', lang)}
        // NO actions slot per D-15 — the submit CTA lives in the form's
        // separate action card below (see CreatePartnerForm action card).
      />

      <CreatePartnerForm
        lang={lang}
        adminSegment={adminSegment}
        createPartnerAction={createPartnerInvitationAction}
      />
    </main>
  );
}
