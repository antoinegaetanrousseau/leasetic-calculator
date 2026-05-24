'use client';

/**
 * Phase 18 Plan 03 — PartnerRowActions (D-10, D-11).
 *
 * Initial Task 1 stub renders a minimal ⋯ trigger so PartnersList compiles
 * without a placeholder. Task 2 of this plan replaces this stub with the
 * full popover menu (custom state + click-outside + Escape handler) wired
 * to the existing Phase 14 server actions (adminDisableUser /
 * adminReEnableUser / adminReissueInvitation) per UI-SPEC §Partners list
 * lines 345-364.
 *
 * The placeholder trigger keeps the 6-cell row shape valid so the D-14
 * rename + Figma 42:46 layout can land atomically in Task 1.
 */
import { MoreVertical } from 'lucide-react';
import type { Lang } from '@/lib/i18n/dictionaries';
import type { PartnerStatus } from '@/lib/db/queries/partners';

export interface PartnerRowActionsProps {
  partnerId: string;
  status: PartnerStatus;
  adminSegment: string;
  lang: Lang;
}

export function PartnerRowActions(_props: PartnerRowActionsProps) {
  // Task 1 stub — non-functional ⋯ trigger to preserve the 6-cell row shape.
  // Task 2 replaces this with a full popover menu (4 conditional actions per D-10).
  return (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={false}
      style={{
        width: 32,
        height: 32,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        border: 'none',
        background: 'transparent',
        color: 'var(--muted)',
        cursor: 'pointer',
      }}
    >
      <MoreVertical size={16} strokeWidth={1.6} aria-hidden="true" />
    </button>
  );
}
