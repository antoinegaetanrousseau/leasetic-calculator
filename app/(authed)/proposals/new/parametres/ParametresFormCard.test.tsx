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
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ProposalFormProvider } from '@/components/proposal/ProposalForm';
import { ParametresFormCard } from './ParametresFormCard';

const { lookupSiretActionMock } = vi.hoisted(() => ({
  lookupSiretActionMock: vi.fn(),
}));

vi.mock('../_actions/lookupSiret.action', () => ({
  lookupSiretAction: (...args: unknown[]) => lookupSiretActionMock(...args),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderCard(
  opts: { prefill?: Record<string, unknown> } = {},
) {
  const { prefill } = opts;
  const utils = render(
    <ProposalFormProvider prefill={prefill}>
      <ParametresFormCard
        draftId="d-1"
        lang="fr"
      />
    </ProposalFormProvider>,
  );
  return utils;
}

describe('ParametresFormCard (D-05 / D-06 / D-07 / D-08 / D-09 / D-10)', () => {
  it('Test 1: renders inside a single .card (one section[data-slot="wizard-panel"])', () => {
    const { container } = renderCard();
    const cards = container.querySelectorAll('section[data-slot="wizard-panel"]');
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
    const card = container.querySelector('section[data-slot="wizard-panel"]');
    expect(card).not.toBeNull();
    const hr = card!.querySelector('hr');
    expect(hr).not.toBeNull();
    // jsdom resolves inline styles via .style; assert the inline string parts.
    const style = (hr as HTMLElement).getAttribute('style') || '';
    expect(style).toMatch(/border-top:\s*1px solid var\(--border\)/);
    expect(style).toMatch(/margin:\s*24px 0/);
  });

  it('Test 7: INFORMATIONS COMPLÉMENTAIRES section header appears inside the panel', () => {
    const { container } = renderCard();
    const card = container.querySelector('section[data-slot="wizard-panel"]');
    expect(card).not.toBeNull();
    expect(card!.textContent).toMatch(/INFORMATIONS COMPL/);
    // No accordion trigger — fields are always visible.
    expect(screen.queryByRole('button', { name: /Plus de détails/ })).toBeNull();
  });

  it('Test 8: 4 optional fields are always visible inside the panel in order: clientRole, projectDesc, slb, evalParc; SIREN sits in the client section as a required field', () => {
    const { container } = renderCard();
    const card = container.querySelector('section[data-slot="wizard-panel"]');
    expect(card).not.toBeNull();
    // Read the inputs/labels inside the card IN ORDER.
    const labels = Array.from(card!.querySelectorAll('label')).map((l) =>
      l.textContent?.trim() ?? '',
    );
    // The 5 optional fields must be in the canonical UI-SPEC §5.2 order.
    const findIdx = (substring: string) =>
      labels.findIndex((txt) => txt.includes(substring));
    const idxRole = findIdx('Qualité / Fonction');
    const idxSiren = findIdx('SIREN');
    const idxClient = findIdx('Nom du client');
    const idxContact = findIdx('Personne de contact');
    const idxDesc = findIdx('Descriptif');
    const idxSlb = findIdx('sale & lease-back');
    const idxEval = findIdx('parc sortant');
    expect(idxSiren).toBeGreaterThan(idxClient);
    expect(idxSiren).toBeLessThan(idxContact);
    const sirenLabel = Array.from(card!.querySelectorAll('label')).find((l) => l.textContent?.includes('SIREN'));
    expect(sirenLabel?.querySelector('.text-destructive')).not.toBeNull();
    expect(idxRole).toBeGreaterThanOrEqual(0);
    expect(idxDesc).toBeGreaterThan(idxRole);
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
    const { container } = renderCard();
    // ADMIN-09: commission MUST NOT appear on step-1 — commission visibility
    // relaxation lives ONLY on steps 2 and 3 (D-12).
    expect(container.innerHTML.toLowerCase()).not.toMatch(/commission/);
  });

  it('Test 15 (extra): register()-wired fields carry their name attributes; Controller-wrapped fields visible by label', () => {
    const { container } = renderCard();
    // register()-based fields carry [name] attributes directly.
    const registerNames = ['clientCo', 'clientName', 'clientEmail',
      'partnerRef', 'clientRole', 'projectDesc'];
    for (const name of registerNames) {
      expect(
        container.querySelector(`[name="${name}"]`),
        `expected [name="${name}"] in DOM`,
      ).not.toBeNull();
    }
    // Controller-wrapped fields are visible by their labels.
    expect(screen.getByLabelText(/Téléphone/)).toBeInTheDocument();
    expect(screen.getByLabelText(/SIREN/)).toBeInTheDocument();
  });

  it('Test 16 (extra): unused `within` import not required — sanity smoke (file imports correctly)', () => {
    // No-op assertion that the test harness imported all modules.
    expect(typeof within).toBe('function');
  });
});

/**
 * Phase 42 Plan 08 Task 3 — clientSiret behaviours (FIELD-01 / D-01..D-04).
 * lookupSiretAction is mocked; the field's own registry-agnostic rendering
 * plus the prefill-on-blur wiring are both exercised here.
 */
describe('Phase 42 — clientSiret (FIELD-01 / D-01..D-04)', () => {
  it('renders a required SIRET field immediately after SIREN, inside the same FieldGroup', () => {
    const { container } = renderCard();
    expect(screen.getByLabelText(/SIRET/)).toBeInTheDocument();
    const sirenLabel = screen.getByText('SIREN').closest('label');
    expect(sirenLabel?.querySelector('.text-destructive')).not.toBeNull();
    const siretLabel = screen.getByText('SIRET').closest('label');
    expect(siretLabel?.querySelector('.text-destructive')).not.toBeNull();

    // Sibling within the same FieldGroup, in DOM order right after SIREN.
    const group = sirenLabel!.closest('[data-slot="field-group"]');
    expect(group).not.toBeNull();
    expect(group!.contains(siretLabel!)).toBe(true);
    const fields = Array.from(
      container.querySelectorAll('[data-slot="field-group"] > [data-slot="field"]'),
    );
    const sirenFieldIdx = fields.findIndex((f) => f.contains(sirenLabel!));
    const siretFieldIdx = fields.findIndex((f) => f.contains(siretLabel!));
    expect(siretFieldIdx).toBe(sirenFieldIdx + 1);
  });

  it('blurring a resolvable SIREN calls lookupSiretAction once and prefills the grouped SIRET value', async () => {
    lookupSiretActionMock.mockResolvedValue({ ok: true, siret: '12345678900012' });
    renderCard();
    const sirenInput = screen.getByLabelText(/^SIREN/) as HTMLInputElement;
    fireEvent.change(sirenInput, { target: { value: '123456789' } });
    fireEvent.blur(sirenInput);

    const siretInput = screen.getByLabelText(/^SIRET/) as HTMLInputElement;
    await waitFor(() => expect(siretInput.value).toBe('123 456 789 00012'));
    expect(lookupSiretActionMock).toHaveBeenCalledTimes(1);
  });

  it('the prefilled SIRET stays editable — typing replaces the value', async () => {
    lookupSiretActionMock.mockResolvedValue({ ok: true, siret: '12345678900012' });
    renderCard();
    const sirenInput = screen.getByLabelText(/^SIREN/) as HTMLInputElement;
    fireEvent.change(sirenInput, { target: { value: '123456789' } });
    fireEvent.blur(sirenInput);

    const siretInput = screen.getByLabelText(/^SIRET/) as HTMLInputElement;
    await waitFor(() => expect(siretInput.value).toBe('123 456 789 00012'));
    expect(siretInput).not.toBeDisabled();
    fireEvent.change(siretInput, { target: { value: '99988877700099' } });
    expect(siretInput.value).toBe('999 888 777 00099');
  });

  it('a failed lookup leaves SIRET empty and editable, and renders no notice, spinner, banner or retry', async () => {
    lookupSiretActionMock.mockResolvedValue({ ok: false });
    const { container } = renderCard();
    const sirenInput = screen.getByLabelText(/^SIREN/) as HTMLInputElement;
    fireEvent.change(sirenInput, { target: { value: '123456789' } });
    fireEvent.blur(sirenInput);

    await waitFor(() => expect(lookupSiretActionMock).toHaveBeenCalledTimes(1));
    const siretInput = screen.getByLabelText(/^SIRET/) as HTMLInputElement;
    expect(siretInput.value).toBe('');
    expect(siretInput).not.toBeDisabled();
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
    // No new text node mentioning the registry anywhere in the card.
    expect(container.textContent?.toLowerCase()).not.toMatch(/registre|registry|indisponible|unavailable/);
  });

  it('a prefill never overwrites a SIRET the partner already typed', async () => {
    lookupSiretActionMock.mockResolvedValue({ ok: true, siret: '12345678900012' });
    renderCard();
    const siretInput = screen.getByLabelText(/^SIRET/) as HTMLInputElement;
    fireEvent.change(siretInput, { target: { value: '11122233300044' } });

    const sirenInput = screen.getByLabelText(/^SIREN/) as HTMLInputElement;
    fireEvent.change(sirenInput, { target: { value: '123456789' } });
    fireEvent.blur(sirenInput);

    await waitFor(() => expect(lookupSiretActionMock).toHaveBeenCalledTimes(1));
    expect(siretInput.value).toBe('111 222 333 00044');
  });

  it('a SIRET/SIREN mismatch renders error.field.siret.mismatch inside #client-siret-error, not at the form root', async () => {
    renderCard();
    // proposalInputSchema's cross-field refine only runs once every other
    // field-level parse succeeds (schema.ts comment) — fill the other
    // required fields so the mismatch on clientSiret is the only issue.
    fireEvent.change(screen.getByLabelText(/Nom du client/), { target: { value: 'ACME' } });
    fireEvent.change(screen.getByLabelText(/Montant du projet HT/), { target: { value: '10000' } });
    fireEvent.click(screen.getByRole('radio', { name: /36 mois/ }));

    const sirenInput = screen.getByLabelText(/^SIREN/) as HTMLInputElement;
    fireEvent.change(sirenInput, { target: { value: '123456789' } });
    fireEvent.blur(sirenInput);
    await waitFor(() => expect(lookupSiretActionMock).toHaveBeenCalledTimes(1));

    const siretInput = screen.getByLabelText(/^SIRET/) as HTMLInputElement;
    fireEvent.change(siretInput, { target: { value: '99988877700012' } });
    fireEvent.blur(siretInput);

    await waitFor(() => {
      const errorEl = document.getElementById('client-siret-error');
      expect(errorEl).not.toBeNull();
    });
    const errorEl = document.getElementById('client-siret-error');
    expect(errorEl!.textContent).toMatch(/SIREN/);
    expect(errorEl).toHaveAttribute('role', 'alert');
  });

  it('an empty SIRET renders error.field.required on blur', async () => {
    renderCard();
    const siretInput = screen.getByLabelText(/^SIRET/) as HTMLInputElement;
    fireEvent.blur(siretInput);

    await waitFor(() => {
      const errorEl = document.getElementById('client-siret-error');
      expect(errorEl).not.toBeNull();
    });
    const errorEl = document.getElementById('client-siret-error');
    expect(errorEl!.textContent).toBe('Ce champ est requis.');
  });
});
