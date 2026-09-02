/**
 * Shared chrome for the segmented controls (duration, validity, language).
 *
 * Phase 5 of the ReUI/Maia migration, replacing the v10 `.dg` / `.db` / `.on`
 * rules. Follows the same shape as table-chrome.ts: exported class strings
 * applied at the call site, rather than a component, because the four callers
 * drive their value very differently — a server action, local useState, and
 * react-hook-form setValue.
 *
 * Deliberately NOT shadcn ToggleGroup. These controls expose
 * `<button aria-pressed>` inside `role="group"`, which six tests pin as a
 * product a11y contract (AC-VSC-01…04 among them). Adopting the primitive
 * would change what assistive tech announces and restructure state handling
 * in all four callers — a product decision, not a styling cleanup.
 *
 * One fix carried in here: `.dg` hard-coded `grid-template-columns:
 * repeat(3, 1fr)`, but CreatePartnerModal renders only TWO buttons (FR/EN),
 * so that control shipped with an empty bordered third column.
 * `grid-flow-col auto-cols-fr` takes its track count from the children.
 */

/** The group wrapper. Carries the border, radius and invalid ring. */
export const segmentedGroupClass = [
  'grid grid-flow-col auto-cols-fr overflow-hidden rounded-xl border border-border',
  'transition-[border-color,box-shadow] duration-150',
  'aria-invalid:border-destructive aria-invalid:shadow-[0_0_0_3px_color-mix(in_oklab,var(--destructive)_12%,transparent)]',
].join(' ');

/**
 * One segment. `active` paints the selected state — keep it in step with the
 * button's own `aria-pressed`, which is what actually conveys selection.
 */
export const segmentedItemClass = (active: boolean) =>
  [
    'cursor-pointer border-0 border-r border-border px-2 py-2.5 text-[14px] last:border-r-0',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
    active
      ? 'bg-[var(--gd)] font-semibold text-white'
      : 'bg-[var(--surface)] font-medium text-ink hover:bg-[var(--hover-overlay)]',
  ].join(' ');
