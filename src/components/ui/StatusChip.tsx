/**
 * StatusChip — generic status indicator (COMP-05, UI-SPEC §6.6).
 *
 * Variants:
 *   - active   → green tint   (.chip-active, existing Phase 8)
 *   - draft    → gold tint    (.chip-draft, added to globals.css by Plan 11-01)
 *   - expired  → muted-gray   (.chip-expired, REWRITTEN by Plan 11-01 from prior gold)
 *   - deleted  → red-danger   (.chip-deleted, existing Phase 8 — reused by Plan 14-06
 *                              proposal-row chip rollout per D-27)
 *   - disabled → red-danger   (.chip-disabled, existing Phase 9)
 *   - invited  → gold tint    (.chip-invited, added Phase 14 — visually identical
 *                              chrome to .chip-draft but semantically distinct per UI-SPEC §4.4)
 *
 * Server component — no state, no interaction. Consumers pass i18n-resolved
 * labels via the `label` prop; this component owns no i18n strings.
 */
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface StatusChipProps {
  variant: 'active' | 'draft' | 'expired' | 'deleted' | 'disabled' | 'invited';
  label: string;
  className?: string;
}

export function StatusChip({ variant, label, className }: StatusChipProps) {
  const variantStyles = {
    active: 'bg-success/15 text-success-foreground hover:bg-success/20',
    draft: 'bg-warning/15 text-warning-foreground hover:bg-warning/20',
    expired: 'bg-muted/50 text-muted-foreground hover:bg-muted/60',
    deleted: 'bg-destructive/15 text-destructive hover:bg-destructive/20',
    disabled: 'bg-destructive/15 text-destructive hover:bg-destructive/20',
    invited: 'bg-warning/15 text-warning-foreground hover:bg-warning/20',
  };

  return (
    // data-status is the stable hook consumers and tests key off. The tint
    // classes below are presentation and may change with the theme; the status
    // is semantic and may not. Asserting the class names instead is what left
    // this component's suite red after it moved to the ReUI Badge.
    <Badge
      variant="secondary"
      data-status={variant}
      className={cn('rounded-full font-semibold border-transparent shadow-none', variantStyles[variant], className)}
    >
      {label}
    </Badge>
  );
}
