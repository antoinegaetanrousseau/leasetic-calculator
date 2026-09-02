/**
 * Phase 31 Plan 06 Task 2 — PairReviewCard (IMPORT-04, IMPORT-05, D-12,
 * 31-UI-SPEC.md §1).
 *
 * The pair-review queue's focal point: the two-sided comparison card an
 * admin reads to decide "merge" or "keep separate". Bespoke composition of
 * existing primitives (no `@reui` block matches this "compare two records"
 * shape — 31-UI-SPEC.md § Design System).
 *
 * Container Radius contract (LOCKED, 31-UI-SPEC.md § Container Radius):
 * `rounded-[24px]` is a LITERAL, decoupled from `--radius` — the Maia
 * container-radius value for this phase, deliberately different from Phase
 * 30's 18px token-derived `.card`. Do NOT "fix" this to `rounded-2xl` (the
 * 18px `.card` value) — that convergence is Phase 31.1's job, not this
 * plan's. `.card`'s background/border/shadow/padding are otherwise
 * reproduced verbatim (bg-card / border-border / --shadow-card / 28px).
 *
 * ACCESS & NON-LEAKAGE (D-11, D-12 point 4, 31-UI-SPEC.md § Access &
 * Non-Leakage Contract): this card renders exactly the `AdminPendingPairRow`
 * fields the admin-only query layer computed — name, SIREN, owner identity/
 * type, three counts, and the single-owner compound-merge warning. When
 * `compoundMergeWarning` is null (zero OR more-than-one shared owner), this
 * card renders NOTHING for that case — inventing a two-owner display is
 * explicitly out of scope (point 4) and must not be added here.
 */
import Link from 'next/link';
import { AlertTriangleIcon } from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { t, type Lang, type DictKey } from '@/lib/i18n/dictionaries';
import type { AdminPairSide, AdminPendingPairRow } from '@/lib/db/queries';

export interface PairReviewCardProps {
  pair: AdminPendingPairRow;
  lang: Lang;
  adminSegment: string;
  onMerge: () => void;
  onKeepSeparate: () => void;
}

const REASON_KEYS: Record<AdminPendingPairRow['reason'], DictKey> = {
  differing: 'admin.reconciliation.reason.differing',
  one_missing: 'admin.reconciliation.reason.oneMissing',
  both_missing: 'admin.reconciliation.reason.bothMissing',
};

/**
 * Shared with `MergeDialog`'s per-side radio option — the exact same
 * "{n} relations · {n} contacts · {n} propositions" line, real zeros
 * rendered literally (never an em dash — a real count carries information,
 * Phase 30 convention).
 */
export function pairSideCountsLine(side: AdminPairSide, lang: Lang): string {
  return t('admin.reconciliation.card.counts', lang)
    .replace('{r}', String(side.relationsCount))
    .replace('{c}', String(side.contactsCount))
    .replace('{p}', String(side.proposalsCount));
}

function PairSideColumn({
  side,
  lang,
  adminSegment,
}: {
  side: AdminPairSide;
  lang: Lang;
  adminSegment: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Link
        href={`/${adminSegment}/companies/${side.companyId}`}
        className="text-[14.5px] font-semibold text-foreground no-underline hover:text-primary"
      >
        {side.name}
      </Link>
      <span className="text-[13px] text-muted-foreground">{side.siren ?? '—'}</span>
      {side.owners.length > 0 && (
        <div className="flex flex-col gap-1">
          {side.owners.map((owner) => (
            <div key={owner.ownerId} className="flex items-center gap-1.5 text-[13px]">
              <span className="text-foreground">{owner.ownerDisplayName}</span>
              <Badge
                variant="secondary"
                className="rounded-full border-transparent bg-border text-[11.5px] font-semibold tracking-[0.02em] text-ink shadow-none"
              >
                {owner.isInternal
                  ? t('admin.companies.relation.type.sales', lang)
                  : t('admin.companies.relation.type.partner', lang)}
              </Badge>
            </div>
          ))}
        </div>
      )}
      <span className="text-[13px] text-muted-foreground">{pairSideCountsLine(side, lang)}</span>
    </div>
  );
}

export function PairReviewCard({
  pair,
  lang,
  adminSegment,
  onMerge,
  onKeepSeparate,
}: PairReviewCardProps) {
  return (
    <div className="rounded-[24px] border border-border bg-card p-7 shadow-[var(--shadow-card)]">
      <p className="m-0 text-[13px] text-muted-foreground">{t(REASON_KEYS[pair.reason], lang)}</p>

      <div className="mt-3 grid grid-cols-2 gap-5">
        <PairSideColumn side={pair.sideA} lang={lang} adminSegment={adminSegment} />
        <PairSideColumn side={pair.sideB} lang={lang} adminSegment={adminSegment} />
      </div>

      {pair.compoundMergeWarning && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive">
          <AlertTriangleIcon size={16} className="mt-0.5 shrink-0" />
          <span>
            {t('admin.reconciliation.compound.warning', lang).replace(
              '{owner}',
              pair.compoundMergeWarning.ownerName,
            )}
          </span>
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onMerge}>
          {t('admin.reconciliation.action.merge', lang)}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onKeepSeparate}>
          {t('admin.reconciliation.action.keepSeparate', lang)}
        </Button>
      </div>
    </div>
  );
}
