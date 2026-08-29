import { cva } from 'class-variance-authority';

/**
 * Shared chrome for the segmented radio controls (DurationSegmented,
 * YesNoToggle). Phase 2 of the ReUI/Maia migration ported this off the v10
 * `.dg` / `.db` / `.yn-group` / `.yn-btn` rules; both controls rendered
 * identical chrome, so it is defined once here rather than duplicated and
 * left to drift.
 *
 * Two deliberate choices:
 *
 *  - `flex` + `flex-1` instead of the old `grid-template-columns: repeat(3, 1fr)`.
 *    That grid hardcoded THREE columns while DurationSegmented is generic over
 *    N options, so any group with a different count laid out wrong. Flex sizes
 *    to whatever is rendered.
 *
 *  - `rounded-[12px]`, not `rounded-xl`. 12px is the design system's
 *    radius-tile, which is what these controls used. The large-radius decision
 *    raised --radius to 1rem, so `rounded-xl` would now resolve to ~22px and
 *    silently restyle every form control. Harmonising the radius scale is a
 *    deliberate design pass, not a side effect of this migration.
 */
export const segmentedGroup = cva(
  'flex overflow-hidden rounded-[12px] border border-border transition-[border-color,box-shadow] duration-150',
  {
    variants: {
      invalid: {
        true: 'border-danger shadow-[0_0_0_3px_rgba(220,38,38,0.12)]',
        false: '',
      },
    },
    defaultVariants: { invalid: false },
  },
);

export const segmentedButton = cva(
  'flex-1 cursor-pointer border-0 border-r border-border px-2 py-[0.65rem] text-sm transition-colors last:border-r-0 disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      // The active branch owns its own background so it cannot be overridden
      // by the inactive branch's hover rule — the v10 CSS relied on source
      // order for the same effect, which is fragile.
      active: {
        true: 'bg-gd font-semibold text-white',
        false: 'bg-surface font-medium text-ink hover:bg-[var(--hover-overlay)]',
      },
    },
    defaultVariants: { active: false },
  },
);
