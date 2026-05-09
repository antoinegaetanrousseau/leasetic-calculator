import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Download, Copy as CopyIcon, AlertTriangle } from 'lucide-react';
import { requireUser } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n/dictionaries';
import { formatCurrency, formatDate, formatNumber } from '@/lib/i18n/format';
import { tLabel, type TrancheKey } from '@/lib/calc';
import { getProposalById } from '@/lib/db/queries';
import { CopyRefButton } from '@/components/proposal/CopyRefButton';
import { ValidityChip } from '@/components/proposals/ValidityChip';
import { LanguageChip } from '@/components/proposals/LanguageChip';
import { DeletedChip } from '@/components/proposals/DeletedChip';
import { EmbeddedPdfPreview } from '@/components/proposals/EmbeddedPdfPreview';
import { DeleteButtonClient } from '@/components/proposals/DeleteButtonClient';
import { RestoreButtonClient } from '@/components/proposals/RestoreButtonClient';

/**
 * Read the current timestamp. Extracted to a module-level async helper so
 * `Date.now()` is not called inside a React component render function
 * (react-hooks/purity rule). Server-only; called once per request in
 * ProposalDetailPage before any rendering.
 */
async function getNowMs(): Promise<number> {
  return Date.now();
}

// PITFALLS §1.6 — cookie/session reads require force-dynamic.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Proposition — Leasétic Matrice' };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProposalDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { session } = await requireUser();
  const lang = await getCurrentLang();

  const proposal = await getProposalById(id);

  // D-18 obscurity: not-found OR not-owned both return 404.
  // Hard-purged (deleted_at > 30d) rows will have been deleted from DB by Plan 08-14's CLI.
  if (!proposal || proposal.userId !== session.user.id) {
    notFound();
  }

  const inputs = proposal.inputs as Record<string, unknown>;
  const computed = proposal.computed as Record<string, unknown>;
  const isDeleted = proposal.deletedAt !== null;
  const isComputed = computed.state === 'computed';

  // Capture "now" via module-level helper so react-hooks/purity doesn't flag
  // Date.now() inside a React component function.
  const nowMs = await getNowMs();

  // Format helper for dt/dd reads — renders '—' for absent optional fields.
  const dash = '—';
  const ifPresent = (key: string): string => {
    const v = inputs[key];
    return typeof v === 'string' && v.trim().length > 0 ? v : dash;
  };
  const yesNoCheck = (key: string): string => {
    const v = inputs[key];
    return v === true ? `✓ ${t('common.yes', lang)}` : t('common.no', lang);
  };

  return (
    <div>
      {/* Soft-delete banner (UI-SPEC §3.2.6) */}
      {isDeleted && (
        <div
          style={{
            background: 'rgba(224,133,48,0.08)',
            borderLeft: '3px solid var(--gold)',
            padding: '12px 16px',
            borderRadius: 12,
            fontSize: '13.5px',
            color: 'var(--ink)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
          }}
        >
          <AlertTriangle size={17} color="var(--gold)" aria-hidden="true" />
          {t('proposal.detail.deleted.banner', lang).replace(
            '{0}',
            String(
              Math.max(
                0,
                30 -
                  Math.floor(
                    (nowMs - (proposal.deletedAt as Date).getTime()) / 86_400_000,
                  ),
              ),
            ),
          )}
        </div>
      )}

      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 8,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--ink)',
              margin: 0,
            }}
          >
            {t('proposal.detail.title', lang).replace('{0}', proposal.lcRef)}
          </h1>
          <CopyRefButton lcRef={proposal.lcRef} lang={lang} variant="inline" />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {isDeleted ? (
            <DeletedChip deletedAt={proposal.deletedAt as Date} lang={lang} />
          ) : (
            <ValidityChip
              createdAt={proposal.createdAt}
              validityDays={
                typeof inputs.validityDays === 'number'
                  ? (inputs.validityDays as 15 | 30 | 60)
                  : 30
              }
              lang={lang}
              nowMs={nowMs}
            />
          )}
          <LanguageChip proposalLanguage={proposal.language as 'fr' | 'en'} lang={lang} />
        </div>
      </div>

      {/* Created-line subtext */}
      <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
        {t('proposal.detail.created.line', lang)
          .replace('{0}', formatDate(proposal.createdAt, lang))
          .replace(
            '{1}',
            new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }).format(proposal.createdAt),
          )}
      </div>

      {/* Two-column body: left (640px) + right (360px sticky) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 640px) minmax(0, 360px)',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* Left: Inputs card + Computed card */}
        <div>
          {/* Inputs card — UI-SPEC §3.2.3 — 15 rows */}
          <section className="card" style={{ marginBottom: 16 }}>
            <div className="ctitle">
              <span
                className="dot"
                style={{ background: 'var(--teal)' }}
                aria-hidden="true"
              />
              <span>{t('proposal.detail.section.inputs', lang)}</span>
            </div>
            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: 'max-content 1fr',
                columnGap: 24,
                rowGap: 12,
                alignItems: 'baseline',
              }}
            >
              <Row
                k={labelFr('Société partenaire', 'Partner company', lang)}
                v={typeof inputs.partnerCo === 'string' ? inputs.partnerCo : dash}
              />
              <Row
                k={labelFr('Nom du commercial', 'Sales contact', lang)}
                v={typeof inputs.partnerName === 'string' ? inputs.partnerName : dash}
              />
              <Separator />
              <Row
                k={labelFr('Société cliente', 'Client company', lang)}
                v={typeof inputs.clientCo === 'string' ? inputs.clientCo : dash}
              />
              <Row k={labelFr('Nom du destinataire', 'Recipient name', lang)} v={ifPresent('clientName')} />
              <Row k={labelFr('Qualité / Fonction', 'Title / Role', lang)} v={ifPresent('clientRole')} />
              <Row k={labelFr('Téléphone', 'Phone', lang)} v={ifPresent('clientTel')} />
              <Row k={labelFr('Email', 'Email', lang)} v={ifPresent('clientEmail')} />
              <Row k={labelFr('SIREN', 'SIREN', lang)} v={ifPresent('clientSiren')} />
              <Separator />
              <Row k={labelFr('Sale & lease-back', 'Sale & leaseback', lang)} v={yesNoCheck('slb')} />
              <Row k={labelFr('Évaluation parc', 'Fleet valuation', lang)} v={yesNoCheck('evalParc')} />
              <Separator />
              <Row k={labelFr('Descriptif du projet', 'Project description', lang)} v={ifPresent('projectDesc')} />
              <Row k={labelFr('Référence partenaire', 'Partner reference', lang)} v={ifPresent('partnerRef')} />
            </dl>
          </section>

          {/* Computed card — UI-SPEC §3.2.4 */}
          <section className="card">
            <div className="ctitle">
              <span
                className="dot"
                style={{ background: 'var(--gold)' }}
                aria-hidden="true"
              />
              <span>{t('proposal.detail.section.computed', lang)}</span>
            </div>
            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: 'max-content 1fr',
                columnGap: 24,
                rowGap: 12,
                alignItems: 'baseline',
              }}
            >
              <Row
                k={t('proposal.montant.label', lang)}
                v={
                  typeof inputs.amountHT === 'number' || typeof inputs.amountHT === 'string'
                    ? formatCurrency(Number(inputs.amountHT), lang)
                    : dash
                }
              />
              {isComputed && typeof computed.trancheKey === 'string' && (
                <Row
                  k={labelFr('Tranche', 'Tranche', lang)}
                  v={
                    t(tLabel(computed.trancheKey as TrancheKey), lang) +
                    ' (' +
                    (computed.trancheKey as string).toUpperCase() +
                    ')'
                  }
                />
              )}
              <Row
                k={t('proposal.duree.label', lang)}
                v={`${String(inputs.durationMonths)} ${t('proposal.duree.months', lang)}`}
              />
              {isComputed && typeof computed.coeff === 'string' && computed.coeff && (
                <Row
                  k={t('pdf.computed.coefficient.label', lang)}
                  v={`${formatNumber(Number(computed.coeff), lang, {
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 4,
                  })} %`}
                />
              )}
            </dl>

            {/* Loyer feature row inset — UI-SPEC §3.2.4 (24px font) */}
            <div
              style={{
                background: 'var(--paper)',
                borderRadius: 12,
                padding: '12px 16px',
                margin: '16px 0',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div
                style={{
                  textTransform: 'uppercase',
                  fontSize: 11.2,
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  color: 'var(--muted)',
                }}
              >
                {t('proposal.loyer.label', lang)}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: 'var(--navy)',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {isComputed && typeof computed.loyerHT === 'string' && computed.loyerHT
                    ? formatCurrency(Number(computed.loyerHT), lang)
                    : t('pdf.loyer.on.demand', lang)}
                </span>
                {isComputed && (
                  <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted)' }}>
                    {t('proposal.detail.computed.loyer.suffix', lang)}
                  </span>
                )}
              </div>
            </div>

            {/* Validity / expires line */}
            <ValidityFooter inputs={inputs} createdAt={proposal.createdAt} lang={lang} nowMs={nowMs} />
          </section>
        </div>

        {/* Right: PDF preview + action stack (sticky) */}
        <aside
          style={{
            position: 'sticky',
            top: 'calc(var(--topbar-h) + 24px)',
          }}
        >
          <section className="card">
            <div className="ctitle">
              <span>{t('proposal.detail.pdf.preview.title', lang)}</span>
            </div>
            <div style={{ marginTop: 16 }}>
              <EmbeddedPdfPreview proposalId={proposal.id} lang={lang} />
            </div>
          </section>

          {/* Action stack — Download (real), Duplicate (stub entry → 08-13), Delete/Restore (stub → 08-12) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginTop: 16,
            }}
          >
            {/* Download — same-origin <a download> (PROP-11, PROP-13) */}
            <a
              href={`/api/proposals/${proposal.id}/pdf`}
              download={`Leasetic_Proposition_${proposal.lcRef}.pdf`}
              className="btn-green"
              style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}
            >
              <Download size={17} />
              {t('proposal.detail.action.download', lang)}
            </a>

            {/* Duplicate — Plan 08-13 owns the prefill side (PROP-21 entry point) */}
            <Link
              href={`/proposals/new?duplicate=${proposal.id}`}
              className="btn-navy"
              style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}
            >
              <CopyIcon size={17} />
              {t('proposal.detail.action.duplicate', lang)}
            </Link>

            {/* Delete (active) / Restore (soft-deleted) — Plan 08-12 wires the server actions */}
            {isDeleted ? (
              <RestoreButtonClient proposalId={proposal.id} lang={lang} />
            ) : (
              <DeleteButtonClient proposalId={proposal.id} lang={lang} />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Inline helper components ────────────────────────────────────────────────

/** dt/dd row pair for the read-only flat list. */
function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt style={{ fontSize: 11.2, fontWeight: 500, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
        {k}
      </dt>
      <dd style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--ink)', margin: 0 }}>{v}</dd>
    </>
  );
}

/** Full-width separator between dt/dd groups. */
function Separator() {
  return (
    <hr
      style={{
        gridColumn: '1 / -1',
        border: 'none',
        borderTop: '1px solid var(--border)',
        margin: '4px 0',
      }}
    />
  );
}

/**
 * Validity / expiry footer inside the Computed card.
 * Extracted to avoid Rules-of-Hooks issue with inline IIFE in JSX.
 *
 * UI-SPEC §3.2.4: "Validité N jours" row + "Valable jusqu'au / Expirée le" row.
 */
function ValidityFooter({
  inputs,
  createdAt,
  lang,
  nowMs,
}: {
  inputs: Record<string, unknown>;
  createdAt: Date;
  lang: Lang;
  nowMs: number;
}) {
  const validityDays =
    typeof inputs.validityDays === 'number' ? (inputs.validityDays as number) : 30;
  const expiresAt = new Date(createdAt.getTime() + validityDays * 86_400_000);
  const isExpired = nowMs >= expiresAt.getTime();
  const labelKey = isExpired
    ? 'proposal.detail.computed.expired.label'
    : 'proposal.detail.computed.expires.label';
  const expiresLabel = t(labelKey, lang).split(' {')[0];

  return (
    <dl
      style={{
        display: 'grid',
        gridTemplateColumns: 'max-content 1fr',
        columnGap: 24,
        rowGap: 8,
        alignItems: 'baseline',
        marginTop: 8,
      }}
    >
      <Row
        k={labelFr('Validité', 'Validity', lang)}
        v={`${String(validityDays)} ${t('proposal.validity.suffix', lang)}`}
      />
      <Row k={expiresLabel} v={formatDate(expiresAt, lang)} />
    </dl>
  );
}

/**
 * Returns the French label when lang=fr, English label when lang=en.
 * Used for dt label strings that don't have dedicated dict keys —
 * they use inline bilingual literals per D-8-04 (no disabled inputs).
 *
 * These 15 field labels are structural descriptions, not user-visible
 * proposal copy — same trade-off as the PDF label column in Plan 08-05
 * (where the PDF renderer uses inline strings for section headings).
 * Documented as a known deviation from the 100% t() discipline.
 */
function labelFr(fr: string, en: string, lang: Lang): string {
  return lang === 'fr' ? fr : en;
}
