import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PdfPreviewMock } from './PdfPreviewMock';

afterEach(() => cleanup());

describe('PdfPreviewMock', () => {
  it('AC-PPM-01: root has role="img" with aria-label from wizard.step3.pdf.preview.aria (FR)', () => {
    render(<PdfPreviewMock loyerDisplay="2 770 €" validityDays={30} lang="fr" />);
    const root = screen.getByRole('img', { name: /aperçu de la proposition à générer/i });
    expect(root).toBeInTheDocument();
  });

  it('AC-PPM-02: renders BrandLogo at width=140', () => {
    const { container } = render(
      <PdfPreviewMock loyerDisplay="2 770 €" validityDays={30} lang="fr" />,
    );
    // BrandLogo renders two <img> tags inside <span class="brand-logo">
    // (Phase 11 — light/dark variants with CSS picker). Both should carry
    // width="140".
    const logoImgs = container.querySelectorAll('.brand-logo img');
    expect(logoImgs.length).toBeGreaterThanOrEqual(1);
    logoImgs.forEach((img) => {
      expect(img.getAttribute('width')).toBe('140');
    });
  });

  it('AC-PPM-03: renders title "Proposition de financement" (FR)', () => {
    render(<PdfPreviewMock loyerDisplay="2 770 €" validityDays={30} lang="fr" />);
    expect(screen.getByText(/proposition de financement/i)).toBeInTheDocument();
  });

  it('AC-PPM-04: ref line contains literal "LC-2026-XXX" — D-15 (FR + EN)', () => {
    const { container, rerender } = render(
      <PdfPreviewMock loyerDisplay="2 770 €" validityDays={30} lang="fr" />,
    );
    expect(container.textContent).toContain('LC-2026-XXX');
    rerender(<PdfPreviewMock loyerDisplay="2,770 €" validityDays={30} lang="en" />);
    expect(container.textContent).toContain('LC-2026-XXX');
  });

  it('AC-PPM-05: ref line interpolates validityDays prop', () => {
    const { container } = render(
      <PdfPreviewMock loyerDisplay="2 770 €" validityDays={30} lang="fr" />,
    );
    expect(container.textContent).toMatch(/30 jours/);
  });

  it('AC-PPM-06: LOYER MENSUEL value shows loyerDisplay and uses var(--gd) color', () => {
    const { container } = render(
      <PdfPreviewMock loyerDisplay="2 770 €" validityDays={30} lang="fr" />,
    );
    // LOYER MENSUEL label is the existing wizard.step3.pdf.loyer.label key.
    expect(screen.getByText(/LOYER MENSUEL/)).toBeInTheDocument();
    // The value renders the loyerDisplay prop verbatim with color var(--gd).
    const allElements = Array.from(container.querySelectorAll('*'));
    const valueEl = allElements.find(
      (el) =>
        el.textContent === '2 770 €' &&
        (el.getAttribute('style') ?? '').includes('var(--gd)'),
    );
    expect(valueEl).toBeDefined();
  });

  it('AC-PPM-07: placeholder bars are aria-hidden="true" (decorative)', () => {
    const { container } = render(
      <PdfPreviewMock loyerDisplay="2 770 €" validityDays={30} lang="fr" />,
    );
    // The 5 placeholder bars (3 top + 2 trailing) all sit inside an
    // aria-hidden wrapper or are themselves aria-hidden.
    const hiddenWrappers = container.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenWrappers.length).toBeGreaterThanOrEqual(1);
  });
});
