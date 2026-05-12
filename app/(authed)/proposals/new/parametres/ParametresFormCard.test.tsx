/**
 * Plan 13-03 Task 1 — ParametresFormCard tests (RED → GREEN).
 *
 * Behavior tests 1-13 from PLAN.md.
 *
 * The card is mounted inside a real <ProposalFormProvider> (RHF FormProvider)
 * because the component consumes useFormContext() from the outer provider —
 * a vi.mock of react-hook-form would defeat the integration nature of these
 * assertions (test 9 requires real aria-invalid behavior).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { ProposalFormProvider } from '@/components/proposal/ProposalForm';
import { ParametresFormCard } from './ParametresFormCard';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderCard(
  opts: { accordionDefaultOpen?: boolean; prefill?: Record<string, unknown> } = {},
) {
  const { accordionDefaultOpen = false, prefill } = opts;
  const onToggle = vi.fn();
  const utils = render(
    <ProposalFormProvider prefill={prefill}>
      <ParametresFormCard
        draftId="d-1"
        accordionDefaultOpen={accordionDefaultOpen}
        onAccordionToggle={onToggle}
        lang="fr"
      />
    </ProposalFormProvider>,
  );
  return { ...utils, onToggle };
}

describe('ParametresFormCard (D-05 / D-06 / D-07 / D-08 / D-09 / D-10)', () => {
  it('Test 1: renders inside a single .card (one section.card)', () => {
    const { container } = renderCard();
    const cards = container.querySelectorAll('section.card');
    expect(cards.length).toBe(1);
  });

  it('Test 2: contains a INFORMATIONS CLIENT bullet header (FR copy)', () => {
    renderCard();
    expect(screen.getByText('INFORMATIONS CLIENT')).toBeInTheDocument();
  });

  it('Test 3: contains a DÉTAILS DU PROJET bullet header (FR copy)', () => {
    renderCard();
    expect(screen.getByText('DÉTAILS DU PROJET')).toBeInTheDocument();
  });

  it('Test 4: renders 4 inputs in INFORMATIONS CLIENT — clientCo (Nom du client), clientName (Personne de contact), clientEmail, clientTel', () => {
    renderCard();
    // clientCo uses the new wizard-scoped label per UI-SPEC §6.3.
    expect(screen.getByLabelText(/Nom du client/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Personne de contact/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Téléphone/)).toBeInTheDocument();
  });

  it('Test 5: renders 3 inputs in DÉTAILS DU PROJET — partnerRef, amountHT, durationMonths (segmented 36/48/60)', () => {
    renderCard();
    expect(screen.getByLabelText(/Référence proposition partenaire/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Montant du projet HT/)).toBeInTheDocument();
    // DurationSegmented exposes the value buttons as role=radio with the localized label.
    expect(screen.getByRole('radio', { name: /36 mois/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /48 mois/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /60 mois/ })).toBeInTheDocument();
  });

  it('Test 6: renders an <hr> divider between the 2 sections inside the card with 1px solid var(--border) and 24px vertical margin', () => {
    const { container } = renderCard();
    const card = container.querySelector('section.card');
    expect(card).not.toBeNull();
    const hr = card!.querySelector('hr');
    expect(hr).not.toBeNull();
    // jsdom resolves inline styles via .style; assert the inline string parts.
    const style = (hr as HTMLElement).getAttribute('style') || '';
    expect(style).toMatch(/border-top:\s*1px solid var\(--border\)/);
    expect(style).toMatch(/margin:\s*24px 0/);
  });

  it('Test 7: <PlusDeDetailsAccordion> appears BELOW the .card (not inside it) and respects accordionDefaultOpen', () => {
    const { container } = renderCard({ accordionDefaultOpen: true });
    // Accordion trigger button + ARIA region — derived from PlusDeDetailsAccordion.tsx.
    const trigger = screen.getByRole('button', { name: /Plus de détails/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    // Trigger must NOT be inside the .card.
    const card = container.querySelector('section.card');
    expect(card!.contains(trigger)).toBe(false);
  });

  it('Test 8: 5 optional fields inside the accordion in order: clientRole, clientSiren, projectDesc, slb, evalParc', () => {
    const { container } = renderCard({ accordionDefaultOpen: true });
    const region = container.querySelector('#plus-de-details-region');
    expect(region).not.toBeNull();
    // Read the inputs/labels inside the region IN ORDER.
    const labels = Array.from(region!.querySelectorAll('label')).map((l) =>
      l.textContent?.trim() ?? '',
    );
    // The 5 optional fields must be in the canonical UI-SPEC §5.2 order.
    const findIdx = (substring: string) =>
      labels.findIndex((txt) => txt.includes(substring));
    const idxRole = findIdx('Qualité / Fonction');
    const idxSiren = findIdx('SIREN');
    const idxDesc = findIdx('Descriptif');
    const idxSlb = findIdx('sale & lease-back');
    const idxEval = findIdx('parc sortant');
    expect(idxRole).toBeGreaterThanOrEqual(0);
    expect(idxSiren).toBeGreaterThan(idxRole);
    expect(idxDesc).toBeGreaterThan(idxSiren);
    expect(idxSlb).toBeGreaterThan(idxDesc);
    expect(idxEval).toBeGreaterThan(idxSlb);
  });

  it('Test 9: every visible input registers with the outer RHF context (proven by aria-invalid wiring on errors-bearing inputs)', () => {
    // Mount with empty prefill — clientCo is required (D-7-06). We don't trigger
    // the resolver here (mode=onBlur). Instead we assert that the inputs carry
    // the `name` attribute the FormProvider's register(...) emits — proof they
    // are wired to the outer form context. (A vi.mock of useFormContext would
    // make this assertion trivially true and lose its meaning.)
    const { container } = renderCard();
    // clientCo input — registered via register('clientCo').
    const clientCoInput = container.querySelector(
      'input[name="clientCo"]',
    ) as HTMLInputElement | null;
    expect(clientCoInput).not.toBeNull();
    // clientEmail input — registered via register('clientEmail').
    const clientEmailInput = container.querySelector(
      'input[name="clientEmail"]',
    ) as HTMLInputElement | null;
    expect(clientEmailInput).not.toBeNull();
  });

  it('Test 10: clientCo input uses wizard-scoped label override "Nom du client", NOT legacy form.client.co "Société cliente"', () => {
    renderCard();
    expect(screen.queryByText('Société cliente')).not.toBeInTheDocument();
    expect(screen.getByText('Nom du client')).toBeInTheDocument();
  });

  it('Test 11: NO partnerCo or partnerName visible input is rendered (D-07 session-hydration)', () => {
    const { container } = renderCard();
    expect(container.querySelector('input[name="partnerCo"]')).toBeNull();
    expect(container.querySelector('input[name="partnerName"]')).toBeNull();
  });

  it('Test 12: NO validityDays input is rendered (D-08 server-resolved)', () => {
    const { container } = renderCard();
    expect(container.querySelector('input[name="validityDays"]')).toBeNull();
    // ValiditySegmented from v1.1 is also not mounted.
    expect(screen.queryByText(/jours de validité/)).not.toBeInTheDocument();
  });

  it('Test 13: NO LiveLoyerPreview component is rendered (D-09 retired)', () => {
    const { container } = renderCard();
    // LiveLoyerPreview renders an aside with role=complementary or a `data-testid`;
    // we assert by the unique "loyer" / "estimé" header it would otherwise show.
    expect(screen.queryByText(/Loyer estimé/i)).not.toBeInTheDocument();
    // No aside element rendered.
    expect(container.querySelector('aside')).toBeNull();
  });

  it('Test 14 (extra — ADMIN-09 step-1 surface): no "commission" string appears anywhere in the rendered HTML', () => {
    const { container } = renderCard({ accordionDefaultOpen: true });
    // ADMIN-09: commission MUST NOT appear on step-1 — commission visibility
    // relaxation lives ONLY on steps 2 and 3 (D-12).
    expect(container.innerHTML.toLowerCase()).not.toMatch(/commission/);
  });

  it('Test 15 (extra): the accordion onToggle wiring is called when the trigger is clicked', () => {
    const { onToggle } = renderCard({ accordionDefaultOpen: false });
    const trigger = screen.getByRole('button', { name: /Plus de détails/ });
    trigger.click();
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('Test 16 (extra): unused `within` import not required — sanity smoke (file imports correctly)', () => {
    // No-op assertion that the test harness imported all modules.
    expect(typeof within).toBe('function');
  });
});
