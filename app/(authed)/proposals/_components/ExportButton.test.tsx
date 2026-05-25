/**
 * Phase 19 Plan 01 — ExportButton.test.tsx
 *
 * 7 behaviour tests covering the 3-state machine and ADMIN-09 boundary:
 *   Test 1: resultCount === 0 → button disabled + aria-label = disabled.tooltip key.
 *   Test 2: resultCount > 0 → button enabled, idle label = proposals.export.cta key.
 *   Test 3: click → loading state: label swaps to proposals.export.loading, button disabled.
 *   Test 4: successful export → success toast fired + button returns to idle.
 *   Test 5: failed export (action throws) → error toast fired + button returns to idle.
 *   Test 6: q and archived props are forwarded to exportProposalsAction.
 *   Test 7: loading state renders Loader2 spinner (aria-busy="true").
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, act, waitFor } from '@testing-library/react';
import { ExportButton } from './ExportButton';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('server-only', () => ({}));

const exportProposalsActionMock = vi.fn();
vi.mock('../_actions/exportProposals.action', () => ({
  exportProposalsAction: (...args: unknown[]) => exportProposalsActionMock(...args),
}));

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Build a minimal fake Response that resolves as a valid XLSX download.
 */
function makeOkResponse(filename = 'propositions-2026-05-25.xlsx'): Response {
  const buf = new Uint8Array([1, 2, 3]);
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  return new Response(blob, {
    status: 200,
    headers: {
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

// JSDOM does not implement URL.createObjectURL — stub it so download code runs.
globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
globalThis.URL.revokeObjectURL = vi.fn();

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ExportButton (Phase 19 Plan 01)', () => {
  it('Test 1: resultCount === 0 → button is disabled and aria-label shows disabled tooltip', () => {
    render(<ExportButton lang="fr" resultCount={0} />);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn.getAttribute('aria-label')).toMatch(/aucune proposition/i);
  });

  it('Test 2: resultCount > 0 → button is enabled and idle label matches proposals.export.cta', () => {
    render(<ExportButton lang="fr" resultCount={5} />);
    const btn = screen.getByRole('button');
    expect(btn).not.toBeDisabled();
    // FR value for proposals.export.cta = 'Exporter en XLSX'
    expect(btn.textContent).toContain('Exporter en XLSX');
  });

  it('Test 3: click → loading state: aria-busy true, label = proposals.export.loading, button disabled', async () => {
    // Never resolve so we can inspect loading state mid-flight.
    exportProposalsActionMock.mockReturnValue(new Promise(() => {}));

    render(<ExportButton lang="fr" resultCount={3} />);
    const btn = screen.getByRole('button');

    act(() => { btn.click(); });

    // Loading state should appear synchronously after click.
    await waitFor(() => {
      expect(btn).toBeDisabled();
      expect(btn.getAttribute('aria-busy')).toBe('true');
      // FR value for proposals.export.loading = 'Génération…'
      expect(btn.textContent).toContain('Génération');
    });
  });

  it('Test 4: successful export → success toast fired and button returns to idle', async () => {
    exportProposalsActionMock.mockResolvedValue(makeOkResponse());

    render(<ExportButton lang="fr" resultCount={2} />);
    const btn = screen.getByRole('button');

    await act(async () => { btn.click(); });

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('Export prêt');
      expect(btn).not.toBeDisabled();
      expect(btn.getAttribute('aria-busy')).toBe('false');
    });
  });

  it('Test 5: failed export (action throws) → error toast fired and button returns to idle', async () => {
    exportProposalsActionMock.mockRejectedValue(new Error('network error'));

    render(<ExportButton lang="fr" resultCount={2} />);
    const btn = screen.getByRole('button');

    await act(async () => { btn.click(); });

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("Échec de l'export, réessayez");
      expect(btn).not.toBeDisabled();
    });
  });

  it('Test 6: q and archived props are forwarded to exportProposalsAction', async () => {
    exportProposalsActionMock.mockResolvedValue(makeOkResponse());

    render(<ExportButton lang="fr" resultCount={10} q="acme" archived={true} />);
    const btn = screen.getByRole('button');

    await act(async () => { btn.click(); });

    await waitFor(() => {
      expect(exportProposalsActionMock).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'acme', archived: true }),
      );
    });
  });

  it('Test 7: loading state renders aria-busy="true" on the button', async () => {
    // Hold the promise so the component stays in loading state.
    exportProposalsActionMock.mockReturnValue(new Promise(() => {}));

    render(<ExportButton lang="fr" resultCount={1} />);
    const btn = screen.getByRole('button');

    act(() => { btn.click(); });

    await waitFor(() => {
      expect(btn.getAttribute('aria-busy')).toBe('true');
    });
  });
});
