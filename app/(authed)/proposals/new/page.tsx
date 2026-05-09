import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import {
  ProposalForm,
  ProposalFormProvider,
} from '@/components/proposal/ProposalForm';
import { LiveLoyerPreview } from '@/components/proposal/LiveLoyerPreview';
import { getLatestGlobalParams } from '@/lib/db/queries';

// PITFALLS §1.6 — every cookie/session-reading page opts out of static rendering.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Nouvelle proposition — Leasétic Matrice',
};

/**
 * Phase 7 — proposal entry route. Mounts inside the (authed) shell.
 *
 * Plan 07-05 Path A: page stays a Server Component (requireUser + prefill);
 * <ProposalFormProvider> ('use client') hosts useForm + FormProvider so
 * <ProposalForm> and <LiveLoyerPreview> are siblings sharing a single RHF
 * context. Each child consumes via useFormContext() / useWatch().
 *
 * D-7-13 partner-name pre-fill: heuristic chain
 *   session.user.displayName ?? session.user.name ?? '' (NOT email — we don't
 *   want partner-name auto-populated with an email-local-part). partner-co
 *   stays empty: a person's displayName is not the partner company.
 *
 * Defence-in-depth requireUser(): runs again here even though
 * app/(authed)/layout.tsx already gated the route. Same pattern as Plan
 * 06-07's admin tree (see require.ts comment on PITFALLS §7.3 ordering).
 */
export default async function NewProposalPage() {
  const { session } = await requireUser();
  const lang = await getCurrentLang();

  const u = session.user as {
    email: string;
    displayName?: string | null;
    name?: string | null;
  };
  const partnerName = u.displayName ?? u.name ?? '';

  // D-7-12 → Phase 8 wiring: coefficients are "expired" when the seed has not
  // yet been applied. Phase 9 admin-edit will introduce a richer freshness
  // semantic (e.g., effective_from > 90 days ago = stale); Phase 8 keeps it
  // binary because the seed-or-not is the only meaningful state until then.
  const params = await getLatestGlobalParams();
  const coefficientsExpired = params === null;

  return (
    <div>
      {/* Page title — Topbar's pageTitle slot is not currently passed by the
          (authed) layout, so we render the page title in-content like the
          home page (Plan 07-03) does. A later cleanup may consolidate this
          into the Topbar slot if desired. */}
      <h1
        style={{
          fontSize: '20px',
          fontWeight: 700,
          color: 'var(--ink)',
          marginBottom: 16,
        }}
      >
        {t('header.proposals.new', lang)}
      </h1>

      {/* 2-column desktop grid (D-7-01 / D-7-14):
          640px form column + 360px sticky preview column + 24px gap = 1024px,
          fits within the (authed) layout's 1100px main-content max-width.
          Both children share a single RHF FormProvider hoisted by
          <ProposalFormProvider> (Plan 07-05 Path A). */}
      <ProposalFormProvider prefill={{ partnerName }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 640px) minmax(0, 360px)',
            gap: 24,
            alignItems: 'start',
          }}
        >
          {/* form-column — left */}
          <ProposalForm lang={lang} />
          {/* preview-column — right. coefficientsExpired is server-driven from
              getLatestGlobalParams: true when no seed row exists (D-7-12 probe
              wired in Phase 8; Phase 9 will add richer freshness semantics). */}
          <LiveLoyerPreview lang={lang} coefficientsExpired={coefficientsExpired} />
        </div>
      </ProposalFormProvider>
    </div>
  );
}
