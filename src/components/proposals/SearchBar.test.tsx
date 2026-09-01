/**
 * Plan 30-02 Task 2 — SearchBar tests.
 *
 * Covers the widening that adds optional `placeholderKey`/`ariaKey` props
 * (30-UI-SPEC.md §1, Component Inventory): both default to the current
 * `proposal.search.*` keys so /proposals and the admin partners page keep
 * their exact current output, while a caller (the Phase 30 client book) can
 * override them to render surface-specific copy.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => new URLSearchParams(),
}));

import { SearchBar } from './SearchBar';

afterEach(() => {
  cleanup();
  replaceMock.mockClear();
});

describe('SearchBar (Plan 30-02 widening)', () => {
  it('with no new props, renders the existing proposals-list placeholder + aria-label (fr) — /proposals unaffected', () => {
    render(<SearchBar lang="fr" />);
    const input = screen.getByRole('searchbox', { name: 'Rechercher dans vos propositions' });
    expect(input).toHaveAttribute('placeholder', 'Rechercher par client ou référence...');
  });

  it('with placeholderKey/ariaKey overrides, renders the client-book copy (fr)', () => {
    render(
      <SearchBar
        lang="fr"
        placeholderKey="clients.search.placeholder"
        ariaKey="clients.search.aria"
      />,
    );
    const input = screen.getByRole('searchbox', { name: 'Rechercher dans vos clients' });
    expect(input).toHaveAttribute('placeholder', 'Rechercher un client…');
  });

  it('clear-button label stays on the shared proposal.search.clear key regardless of override', () => {
    render(
      <SearchBar
        lang="fr"
        placeholderKey="clients.search.placeholder"
        ariaKey="clients.search.aria"
      />,
    );
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'acme' } });
    expect(screen.getByRole('button', { name: 'Effacer la recherche' })).toBeDefined();
  });
});

describe('BuildingIcon / PhoneIcon (Plan 30-02 Task 2)', () => {
  it('BuildingIcon renders an svg sized by the size prop', async () => {
    const { BuildingIcon } = await import('@/components/icons/BuildingIcon');
    const { container } = render(<BuildingIcon size={16} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
  });

  it('PhoneIcon with an aria-label renders without aria-hidden', async () => {
    const { PhoneIcon } = await import('@/components/icons/PhoneIcon');
    const { container } = render(<PhoneIcon aria-label="x" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg).not.toHaveAttribute('aria-hidden');
  });

  it('PhoneIcon with no aria-label renders aria-hidden (decorative default)', async () => {
    const { PhoneIcon } = await import('@/components/icons/PhoneIcon');
    const { container } = render(<PhoneIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
