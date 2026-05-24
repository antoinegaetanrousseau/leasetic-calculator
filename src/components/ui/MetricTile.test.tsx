import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, within } from '@testing-library/react';
import { MetricTile, type MetricTileProps } from './MetricTile';

afterEach(() => cleanup());

describe('MetricTile', () => {
  it('AC-MT-01: variant=month renders label + value (with color var(--gd)) + sublabel; 3 child <div>s', () => {
    const { container } = render(
      <MetricTile variant="month" label="Ce mois-ci" value="12" sublabel="propositions" />,
    );
    const group = within(container).getByRole('group');
    const children = group.querySelectorAll(':scope > div');
    expect(children).toHaveLength(3);
    // value div is the 2nd child
    const valueDiv = children[1] as HTMLDivElement;
    expect(valueDiv.getAttribute('style')).toMatch(/color:\s*var\(--gd\)/);
    // text content for each
    expect(group).toHaveTextContent('Ce mois-ci');
    expect(group).toHaveTextContent('12');
    expect(group).toHaveTextContent('propositions');
  });

  it('AC-MT-02: omitting sublabel renders only 2 <div> children (label + value); "propositions" not in DOM', () => {
    const { container } = render(<MetricTile variant="total" label="Total" value="248" />);
    const group = within(container).getByRole('group');
    const children = group.querySelectorAll(':scope > div');
    expect(children).toHaveLength(2);
    expect(within(container).queryByText('propositions')).toBeNull();
  });

  it('AC-MT-03: variant=drafts produces value <div> with style color var(--gold)', () => {
    const { container } = render(
      <MetricTile variant="drafts" label="Brouillons" value="3" sublabel="à compléter" />,
    );
    const group = within(container).getByRole('group');
    const children = group.querySelectorAll(':scope > div');
    const valueDiv = children[1] as HTMLDivElement;
    expect(valueDiv.getAttribute('style')).toMatch(/color:\s*var\(--gold\)/);
  });

  it('AC-MT-07: outer wrapper has role="group" and aria-label="{label}: {value}"', () => {
    const { container } = render(<MetricTile variant="month" label="Ce mois-ci" value="12" />);
    const group = within(container).getByRole('group');
    expect(group).toHaveAttribute('aria-label', 'Ce mois-ci: 12');
  });

  it('AC-MT-08: variant=total produces value <div> with style color var(--navy)', () => {
    const { container } = render(<MetricTile variant="total" label="Total" value="248" />);
    const group = within(container).getByRole('group');
    const children = group.querySelectorAll(':scope > div');
    const valueDiv = children[1] as HTMLDivElement;
    expect(valueDiv.getAttribute('style')).toMatch(/color:\s*var\(--navy\)/);
  });

  // ── Phase 18 Plan 02 Task 1 — valueColor override (D-04) ────────────────
  // Admin Home requires ALL three stat tiles to render their value in --teal,
  // regardless of label semantic. Variant remains required (preserves Phase 11
  // chrome semantics + back-compat with PHOME-02 callers); valueColor is an
  // additive override that wins when provided.
  describe('Phase 18 valueColor prop (D-04)', () => {
    it('AC-MT-VC-01: without valueColor, variant=month value uses default var(--gd)', () => {
      const { container } = render(
        <MetricTile variant="month" label="Partenaires actifs" value="42" />,
      );
      const group = within(container).getByRole('group');
      const children = group.querySelectorAll(':scope > div');
      const valueDiv = children[1] as HTMLDivElement;
      expect(valueDiv.getAttribute('style')).toMatch(/color:\s*var\(--gd\)/);
    });

    it('AC-MT-VC-02: valueColor="var(--teal)" overrides variant default on value element', () => {
      const { container } = render(
        <MetricTile
          variant="month"
          label="Partenaires actifs"
          value="42"
          valueColor="var(--teal)"
        />,
      );
      const group = within(container).getByRole('group');
      const children = group.querySelectorAll(':scope > div');
      const valueDiv = children[1] as HTMLDivElement;
      expect(valueDiv.getAttribute('style')).toMatch(/color:\s*var\(--teal\)/);
      // sanity — variant default not present
      expect(valueDiv.getAttribute('style')).not.toMatch(/color:\s*var\(--gd\)(?!-text)/);
    });

    it('AC-MT-VC-03: valueColor override works on every variant (no regression)', () => {
      const variants: Array<MetricTileProps['variant']> = ['month', 'total', 'drafts'];
      for (const v of variants) {
        const { container, unmount } = render(
          <MetricTile variant={v} label="X" value="Y" valueColor="var(--teal)" />,
        );
        const group = within(container).getByRole('group');
        const valueDiv = group.querySelectorAll(':scope > div')[1] as HTMLDivElement;
        expect(valueDiv.getAttribute('style')).toMatch(/color:\s*var\(--teal\)/);
        unmount();
      }
    });
  });
});
