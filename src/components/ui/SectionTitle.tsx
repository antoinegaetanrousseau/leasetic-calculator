import { cn } from '@/lib/utils';

export interface SectionTitleProps extends React.ComponentProps<'div'> {
  /**
   * Accent of the leading bullet. `gd` is the Leasétic green every existing
   * caller asked for by hand; `teal` matches the /parametres eyebrow.
   */
  accent?: 'gd' | 'teal';
  /**
   * Set false for the one header that never had a bullet (the PDF-preview
   * section on the proposal detail page). Adding one there would be a visual
   * change, not a migration.
   */
  bullet?: boolean;
}

/**
 * The card section header — an uppercase eyebrow preceded by a small accent
 * bullet.
 *
 * Phase 5 of the ReUI/Maia migration. This markup existed 19 times across the
 * app in two flavours: the v10 `.ctitle` + `.dot` classes, and a hand-pasted
 * utility string that repeated the same eight lines. Every single copy also
 * carried `style={{ background: 'var(--gd)' }}` on the bullet, because `.dot`
 * defaulted to `var(--primary)` and no caller wanted it — so the default here
 * is the colour everyone was actually reaching for, and the inline override
 * disappears from all of them.
 *
 * The bullet is decorative and stays `aria-hidden`; the accessible name comes
 * from the text.
 */
export function SectionTitle({
  accent = 'gd',
  bullet = true,
  className,
  children,
  ...props
}: SectionTitleProps) {
  return (
    <div
      data-slot="section-title"
      className={cn(
        'mb-4 flex items-center gap-2 text-[11.8px] font-bold tracking-[0.06em] text-muted-foreground uppercase',
        className,
      )}
      {...props}
    >
      {bullet && (
        <span
          data-slot="section-title-bullet"
          aria-hidden="true"
          className={cn(
            'size-2 shrink-0 rounded-full',
            accent === 'teal' ? 'bg-[var(--teal)]' : 'bg-[var(--gd)]',
          )}
        />
      )}
      <span>{children}</span>
    </div>
  );
}
