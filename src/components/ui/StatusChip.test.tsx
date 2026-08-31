/**
 * StatusChip tests — rewritten in Phase 0 of the ReUI/Maia migration.
 *
 * The previous suite asserted the `.chip` / `.chip-*` class names from the v10
 * stylesheet. This component had already been migrated to the ReUI Badge with
 * Tailwind tints, so those assertions were testing a stylesheet that no longer
 * styles it — the single largest cause of the red suite inherited by Phase 0.
 *
 * These assert the semantic status via the stable data-status hook, the label
 * passthrough, and the non-interactivity contract.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { StatusChip, type StatusChipProps } from './StatusChip';

afterEach(() => cleanup());

const VARIANTS: Array<StatusChipProps['variant']> = [
  'active',
  'draft',
  'expired',
  'deleted',
  'disabled',
  'invited',
];

describe('StatusChip', () => {
  it.each([
    ['active', 'Active'],
    ['draft', 'Brouillon'],
    ['expired', 'Expirée'],
    ['disabled', 'Désactivé'],
    ['invited', 'invité.e'],
    ['deleted', 'Supprimée'],
  ] as Array<[StatusChipProps['variant'], string]>)(
    'variant=%s exposes data-status and renders the supplied label',
    (variant, label) => {
      const { container } = render(<StatusChip variant={variant} label={label} />);
      const chip = container.querySelector(`[data-status="${variant}"]`);
      expect(chip).not.toBeNull();
      expect(chip).toHaveTextContent(label);
    },
  );

  it('renders exactly one chip per instance, for every variant', () => {
    for (const variant of VARIANTS) {
      const { container, unmount } = render(<StatusChip variant={variant} label="X" />);
      expect(container.querySelectorAll('[data-status]')).toHaveLength(1);
      unmount();
    }
  });

  it('AC-SC-06: the chip is non-interactive — no button or link role', () => {
    render(<StatusChip variant="active" label="Active" />);
    expect(screen.queryAllByRole('button')).toEqual([]);
    expect(screen.queryAllByRole('link')).toEqual([]);
  });

  it('owns no i18n strings — the label is passed through verbatim', () => {
    const { container } = render(<StatusChip variant="active" label="Totally Custom Label" />);
    expect(within(container).getByText('Totally Custom Label')).toBeDefined();
  });

  it('accepts a caller className without dropping the status hook', () => {
    const { container } = render(
      <StatusChip variant="draft" label="Brouillon" className="ml-2" />,
    );
    const chip = container.querySelector('[data-status="draft"]');
    expect(chip).not.toBeNull();
    expect(chip).toHaveClass('ml-2');
  });
});
