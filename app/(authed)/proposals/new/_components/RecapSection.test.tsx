import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { RecapSection } from './RecapSection';

afterEach(() => cleanup());

describe('RecapSection', () => {
  it('AC-RS-01: renders <section class="card"> with .ctitle header containing sectionTitle', () => {
    const { container } = render(
      <RecapSection
        sectionTitle="PARAMÈTRES SAISIS"
        rows={[{ label: 'Montant HT', value: '50 000 €' }]}
      />,
    );
    const section = container.querySelector('section.card');
    expect(section).not.toBeNull();
    const ctitle = container.querySelector('.ctitle');
    expect(ctitle).not.toBeNull();
    expect(ctitle!.textContent).toContain('PARAMÈTRES SAISIS');
  });

  it('AC-RS-02: renders .dot glyph with background: var(--gd) (existing .ctitle .dot rule)', () => {
    const { container } = render(
      <RecapSection
        sectionTitle="CLIENT"
        rows={[{ label: 'Nom', value: 'Acme Corp' }]}
      />,
    );
    const dot = container.querySelector('.dot');
    expect(dot).not.toBeNull();
    const style = dot!.getAttribute('style') ?? '';
    expect(style).toMatch(/background:\s*var\(--gd\)/);
  });

  it('AC-RS-03: omits ← Modifier link when modifierLink prop is undefined', () => {
    render(
      <RecapSection
        sectionTitle="DÉTAIL DU CALCUL"
        rows={[{ label: 'Loyer', value: '2 770 €' }]}
      />,
    );
    expect(screen.queryByText(/← Modifier/)).not.toBeInTheDocument();
  });

  it('AC-RS-04: renders ← Modifier Link with href === modifierLink.href when provided', () => {
    render(
      <RecapSection
        sectionTitle="PARAMÈTRES SAISIS"
        rows={[{ label: 'Montant', value: '50 000 €' }]}
        modifierLink={{
          href: '/proposals/new/parametres?draft_id=abc-123',
          label: 'Modifier',
        }}
      />,
    );
    const link = screen.getByRole('link', { name: /modifier/i });
    expect(link).toHaveAttribute(
      'href',
      '/proposals/new/parametres?draft_id=abc-123',
    );
  });

  it('AC-RS-05: renders one row per entry in rows[] with label + value', () => {
    render(
      <RecapSection
        sectionTitle="CLIENT"
        rows={[
          { label: 'Nom du client', value: 'Acme Corp' },
          { label: 'Email', value: 'contact@acme.fr' },
          { label: 'Téléphone', value: '06 00 00 00 00' },
        ]}
      />,
    );
    expect(screen.getByText('Nom du client')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('contact@acme.fr')).toBeInTheDocument();
    expect(screen.getByText('Téléphone')).toBeInTheDocument();
    expect(screen.getByText('06 00 00 00 00')).toBeInTheDocument();
  });

  it('AC-RS-06: row.value renders a ReactNode (e.g. <strong>) when value is JSX', () => {
    const { container } = render(
      <RecapSection
        sectionTitle="DÉTAIL DU CALCUL"
        rows={[
          {
            label: 'Loyer mensuel calculé',
            value: <strong style={{ color: 'var(--gd)' }}>2 770 €</strong>,
          },
        ]}
      />,
    );
    const strong = container.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong!.textContent).toBe('2 770 €');
    expect(strong!.getAttribute('style') ?? '').toMatch(/color:\s*var\(--gd\)/);
  });

  it('AC-RS-07: renders a sub-line under a row when rowSublabels[rowIndex] is provided — D-12 commission parenthetical', () => {
    // Step-2 Détail du calcul: the commission row has the sub-line
    // "(non visible client)" rendered under its label.
    render(
      <RecapSection
        sectionTitle="DÉTAIL DU CALCUL"
        rows={[
          { label: 'Montant HT', value: '50 000 €' },
          { label: 'Commission apporteur', value: '2 500 €' },
        ]}
        rowSublabels={{ 1: '(non visible client)' }}
      />,
    );
    expect(screen.getByText('(non visible client)')).toBeInTheDocument();
  });
});
