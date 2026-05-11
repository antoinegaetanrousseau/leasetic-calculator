import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { StatusChip } from './StatusChip';

afterEach(() => cleanup());

describe('StatusChip', () => {
  it('AC-SC-01: variant=active renders <span class="chip chip-active">{label}</span>', () => {
    const { container } = render(<StatusChip variant="active" label="Active" />);
    const chip = container.querySelector('span');
    expect(chip).not.toBeNull();
    expect(chip).toHaveClass('chip');
    expect(chip).toHaveClass('chip-active');
    expect(chip).toHaveTextContent('Active');
  });

  it('AC-SC-02: variant=draft renders <span class="chip chip-draft">{label}</span> (gold tint via .chip-draft from Plan 11-01)', () => {
    const { container } = render(<StatusChip variant="draft" label="Brouillon" />);
    const chip = container.querySelector('span');
    expect(chip).not.toBeNull();
    expect(chip).toHaveClass('chip');
    expect(chip).toHaveClass('chip-draft');
    expect(chip).toHaveTextContent('Brouillon');
  });

  it('AC-SC-03: variant=expired renders <span class="chip chip-expired">{label}</span> (muted-gray, post Plan 11-01 rewrite)', () => {
    const { container } = render(<StatusChip variant="expired" label="Expirée" />);
    const chip = container.querySelector('span');
    expect(chip).not.toBeNull();
    expect(chip).toHaveClass('chip');
    expect(chip).toHaveClass('chip-expired');
    expect(chip).toHaveTextContent('Expirée');
  });

  it('AC-SC-04: variant=disabled renders <span class="chip chip-disabled">{label}</span>', () => {
    const { container } = render(<StatusChip variant="disabled" label="Désactivé" />);
    const chip = container.querySelector('span');
    expect(chip).not.toBeNull();
    expect(chip).toHaveClass('chip');
    expect(chip).toHaveClass('chip-disabled');
    expect(chip).toHaveTextContent('Désactivé');
  });

  it('AC-SC-06: rendered chip is non-interactive (no role=button, no role=link)', () => {
    render(<StatusChip variant="active" label="Active" />);
    expect(screen.queryAllByRole('button')).toEqual([]);
    expect(screen.queryAllByRole('link')).toEqual([]);
  });
});
