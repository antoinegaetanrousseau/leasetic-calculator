import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PdfPreviewMock } from './PdfPreviewMock';

afterEach(() => cleanup());

describe('PdfPreviewMock', () => {
  it('AC-PPM-01: root has role="img" with aria-label from wizard.step3.pdf.preview.aria (FR)', () => {
    render(
      <PdfPreviewMock
        loyerDisplay="2 770 €"
        validityDays={30}
        lcRef="LC-2026-001"
        lang="fr"
      />,
    );
    const root = screen.getByRole('img', {
      name: /aperçu de la proposition à générer/i,
    });
    expect(root).toBeInTheDocument();
  });

  it('AC-PPM-02: renders BrandLogo at width=140', () => {
    const { container } = render(
      <PdfPreviewMock
        loyerDisplay="2 770 €"
        validityDays={30}
        lcRef="LC-2026-001"
        lang="fr"
      />,
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
    render(
      <PdfPreviewMock
        loyerDisplay="2 770 €"
        validityDays={30}
        lcRef="LC-2026-001"
        lang="fr"
      />,
    );
    expect(screen.getByText(/proposition de financement/i)).toBeInTheDocument();
  });

  it('AC-PPM-06: LOYER MENSUEL value shows loyerDisplay and uses var(--gd) color', () => {
    const { container } = render(
      <PdfPreviewMock
        loyerDisplay="2 770 €"
        validityDays={30}
        lcRef="LC-2026-001"
        lang="fr"
      />,
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
      <PdfPreviewMock
        loyerDisplay="2 770 €"
        validityDays={30}
        lcRef="LC-2026-001"
        lang="fr"
      />,
    );
    // The 5 placeholder bars (3 top + 2 trailing) all sit inside an
    // aria-hidden wrapper or are themselves aria-hidden.
    const hiddenWrappers = container.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenWrappers.length).toBeGreaterThanOrEqual(1);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Phase 17 D-17 / D-03 — lcRef prop + inline ref-line construction.
  // ──────────────────────────────────────────────────────────────────────────

  it('AC-PPM-08 (Phase 17 D-17): FR ref line renders "Réf. {lcRef}" and "{validityDays} jours de validité"', () => {
    const { container } = render(
      <PdfPreviewMock
        loyerDisplay="2 770 €"
        validityDays={30}
        lcRef="LC-2026-042"
        lang="fr"
      />,
    );
    const text = container.textContent ?? '';
    expect(text).toContain('Réf. LC-2026-042');
    expect(text).toContain('30 jours de validité');
  });

  it('AC-PPM-09 (Phase 17 D-17): EN ref line renders "Ref. {lcRef}" and "{validityDays} days validity"', () => {
    const { container } = render(
      <PdfPreviewMock
        loyerDisplay="2,770 €"
        validityDays={15}
        lcRef="LC-2026-007"
        lang="en"
      />,
    );
    const text = container.textContent ?? '';
    expect(text).toContain('Ref. LC-2026-007');
    expect(text).toContain('15 days validity');
  });

  it('AC-PPM-10 (Phase 17 D-17): PdfPreviewMockProps requires lcRef: string (TS compile-time check)', () => {
    // Compile-time check: this test asserts the runtime is reachable with the
    // new prop shape. The TypeScript compiler enforces lcRef is required by
    // any caller; the failing test signal is `npx tsc --noEmit` (covered by
    // Task 1 verify gate). At runtime, simply verify the prop reaches the DOM.
    const { container } = render(
      <PdfPreviewMock
        loyerDisplay="2 770 €"
        validityDays={60}
        lcRef="LC-2026-123"
        lang="fr"
      />,
    );
    expect(container.textContent).toContain('LC-2026-123');
  });

  it('AC-PPM-11 (Phase 17 D-17): rendered output contains NO leftover "LC-2026-XXX" literal placeholder', () => {
    const { container } = render(
      <PdfPreviewMock
        loyerDisplay="2 770 €"
        validityDays={30}
        lcRef="LC-2026-001"
        lang="fr"
      />,
    );
    expect(container.textContent ?? '').not.toContain('LC-2026-XXX');
  });

  it('AC-PPM-12 (ADMIN-09 trivial pass): rendered output contains NO commission substring/value', () => {
    const { container } = render(
      <PdfPreviewMock
        loyerDisplay="2 770 €"
        validityDays={30}
        lcRef="LC-2026-001"
        lang="fr"
      />,
    );
    const html = container.innerHTML;
    // commission_pct is the DB-column-name leak gate from the ADMIN-09 9-gate
    // suite; lcRef format LC-2026-NNN trivially contains neither substring.
    expect(html).not.toMatch(/commission_pct/);
    expect(html).not.toMatch(/_pct\b/);
    // The label string "Commission apporteur" is a step-2 / step-3 recap
    // surface (D-12 partner-facing relaxation), NEVER inside PdfPreviewMock.
    expect(html).not.toMatch(/Commission/);
  });
});
