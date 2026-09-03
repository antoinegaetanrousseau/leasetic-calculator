/**
 * Phase 34 Plan 12 Task 2 — RelationPanel tests (FICHE-04, D-01 tier three,
 * D-02, D-18).
 *
 * The private tier: the lead source and the description belong to the OWNING
 * partner alone, so two partners quoting the same SIREN never see each
 * other's. The panel sits beside the registry panel on the Informations tab
 * and is the exact opposite of it — everything here is editable, and nothing
 * here is registry data.
 *
 * Coverage (per <behavior>):
 *   1. The lead source renders through its dictionary key, the description as
 *      text.
 *   2. With both values null, the UIC-05 empty state renders WITH the Modifier
 *      control — a blank panel would leave a partner no way in.
 *   3. Modifier opens EditRelationDialog pre-filled with the current values.
 *   4. No registry column name reaches the output (D-02).
 */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Stubbed — EditRelationDialog has its own suite (plan 34-10). The stub echoes
// the open flag and the pre-filled values, which is all this panel controls.
vi.mock('./EditRelationDialog', () => ({
  EditRelationDialog: ({
    open,
    defaultValues,
  }: {
    open: boolean;
    defaultValues: Record<string, unknown>;
  }) => (
    <div
      data-testid="edit-relation-dialog"
      data-open={open ? 'true' : 'false'}
      data-defaults={JSON.stringify(defaultValues)}
    />
  ),
}));

import { RelationPanel } from './RelationPanel';
import { t } from '@/lib/i18n/dictionaries';

const REL_ID = '11111111-1111-4111-8111-111111111111';

function renderPanel(
  overrides: Partial<React.ComponentProps<typeof RelationPanel>> = {},
) {
  return render(
    <RelationPanel
      relationshipId={REL_ID}
      leadSource="salon"
      description="Rencontré au salon Batimat, cherche à renouveler 3 machines."
      lang="fr"
      {...overrides}
    />,
  );
}

afterEach(() => {
  cleanup();
});

describe('RelationPanel — the private tier (D-01 tier three)', () => {
  it('Test 1: renders the lead source through its dictionary key and the description as text', () => {
    renderPanel();

    expect(screen.getByText(t('clients.relation.title', 'fr'))).toBeTruthy();
    expect(screen.getByText(t('clients.relation.field.leadSource', 'fr'))).toBeTruthy();
    expect(screen.getByText(t('clients.relation.source.salon', 'fr'))).toBeTruthy();
    expect(
      screen.getByText('Rencontré au salon Batimat, cherche à renouveler 3 machines.'),
    ).toBeTruthy();
  });

  it('Test 1b: the source label follows the requested language', () => {
    renderPanel({ leadSource: 'site_web', lang: 'en' });

    expect(screen.getByText(t('clients.relation.source.siteWeb', 'en'))).toBeTruthy();
  });

  it('Test 1c: a null lead source omits its row rather than rendering a blank one', () => {
    renderPanel({ leadSource: null });

    expect(screen.queryByText(t('clients.relation.field.leadSource', 'fr'))).toBeNull();
    expect(screen.getByText(t('clients.relation.field.description', 'fr'))).toBeTruthy();
  });

  it('Test 2: with both values null, the empty state renders WITH the Modifier control', () => {
    renderPanel({ leadSource: null, description: null });

    expect(screen.getByText(t('clients.relation.empty', 'fr'))).toBeTruthy();
    expect(screen.getByRole('button', { name: t('clients.relation.modify', 'fr') })).toBeTruthy();
    expect(screen.queryByText(t('clients.relation.field.description', 'fr'))).toBeNull();
  });

  it('Test 3: Modifier opens EditRelationDialog pre-filled with the current values', () => {
    renderPanel();

    expect(screen.getByTestId('edit-relation-dialog').getAttribute('data-open')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: t('clients.relation.modify', 'fr') }));

    const dialog = screen.getByTestId('edit-relation-dialog');
    expect(dialog.getAttribute('data-open')).toBe('true');
    expect(JSON.parse(dialog.getAttribute('data-defaults')!)).toEqual({
      leadSource: 'salon',
      description: 'Rencontré au salon Batimat, cherche à renouveler 3 machines.',
    });
  });

  it('Test 4: no registry field reaches the rendered output (D-02)', () => {
    const { container } = renderPanel();

    for (const column of [
      'legalName',
      'addressLine',
      'nafCode',
      'nafSection',
      'headcountBand',
      'foundedOn',
      'registryState',
    ]) {
      expect(container.innerHTML).not.toContain(column);
    }
  });

  it('Test 4b (source): no registry column and no caught-message comparison', () => {
    const source = readFileSync('app/(authed)/clients/[id]/RelationPanel.tsx', 'utf-8');

    expect(source).not.toMatch(
      /legalName|addressLine|nafCode|nafSection|headcountBand|foundedOn|registryState/,
    );
    expect(source).not.toMatch(/(?:\w+\.message\s*[!=]==?\s*)|(?:[!=]==?\s*\w+\.message\b)/);
  });
});
