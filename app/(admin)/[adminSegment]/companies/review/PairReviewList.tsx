'use client';

/**
 * Phase 31 Plan 06 Task 2 — PairReviewList (IMPORT-04, IMPORT-05,
 * 31-UI-SPEC.md §1).
 *
 * Client component: a vertical stack of `PairReviewCard` (not a table — a
 * deliberate divergence from `CompaniesList`/`PartnersList`'s table-per-row
 * pattern, same class of documented divergence Phase 30 made for
 * Card-vs-Frame; a table row is the wrong shape for two full company
 * summaries side by side plus a warning plus two actions). Owns the two
 * resolve dialogs' open state and the currently-selected pair, and the
 * success empty state when the queue is fully drained — that empty state is
 * the success condition, not a first-run gap (no CTA, no "nothing here yet"
 * tone).
 */
import Link from 'next/link';
import { useState } from 'react';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { CheckCircleIcon } from '@/components/ui/icons';
import type { AdminPendingPairRow } from '@/lib/db/queries';
import { PairReviewCard } from './PairReviewCard';
import { MergeDialog } from './MergeDialog';
import { KeepSeparateDialog } from './KeepSeparateDialog';

export interface PairReviewListProps {
  rows: AdminPendingPairRow[];
  /** base64url-encoded cursor for the next page; null when no more pages. */
  nextCursor: string | null;
  lang: Lang;
  /** Active admin URL segment — used to build row/pagination hrefs. */
  adminSegment: string;
}

type DialogState =
  | { kind: 'merge'; pair: AdminPendingPairRow }
  | { kind: 'keepSeparate'; pair: AdminPendingPairRow }
  | null;

export function PairReviewList({ rows, nextCursor, lang, adminSegment }: PairReviewListProps) {
  const [dialog, setDialog] = useState<DialogState>(null);

  const closeDialog = (open: boolean) => {
    if (!open) setDialog(null);
  };

  if (rows.length === 0) {
    return (
      <Empty className="px-5 py-12">
        <EmptyMedia variant="icon">
          {/* Default/muted styling — NOT --success emerald, NOT --primary accent.
              This surface stays at zero accent usage (31-UI-SPEC.md § Color). */}
          <CheckCircleIcon size={32} />
        </EmptyMedia>
        <EmptyTitle>{t('admin.reconciliation.empty.title', lang)}</EmptyTitle>
        <EmptyDescription>{t('admin.reconciliation.empty.body', lang)}</EmptyDescription>
      </Empty>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {rows.map((pair) => (
          <PairReviewCard
            key={pair.pairId}
            pair={pair}
            lang={lang}
            adminSegment={adminSegment}
            onMerge={() => setDialog({ kind: 'merge', pair })}
            onKeepSeparate={() => setDialog({ kind: 'keepSeparate', pair })}
          />
        ))}

        {nextCursor && (
          <div className="px-5 py-4 text-center">
            <Link
              href={`/${adminSegment}/companies/review?cursor=${encodeURIComponent(nextCursor)}`}
              className="btn-out inline-flex items-center gap-2 text-[13px] no-underline"
            >
              {t('proposal.list.load.more', lang)}
            </Link>
          </div>
        )}
      </div>

      <MergeDialog
        pair={dialog?.kind === 'merge' ? dialog.pair : null}
        open={dialog?.kind === 'merge'}
        onOpenChange={closeDialog}
        lang={lang}
      />
      <KeepSeparateDialog
        pair={dialog?.kind === 'keepSeparate' ? dialog.pair : null}
        open={dialog?.kind === 'keepSeparate'}
        onOpenChange={closeDialog}
        lang={lang}
      />
    </>
  );
}
