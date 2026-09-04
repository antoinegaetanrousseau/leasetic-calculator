/**
 * DeleteClientDialog tests (operator decision, 2026-09-04).
 *
 * The behaviour worth pinning is the RESULT BRANCH. The action reports a
 * refusal as a returned discriminated union, never as a thrown sentinel,
 * because Next.js redacts a Server Function's thrown message in a production
 * build — a `catch (e) => e.message === '...'` handshake works under
 * `npm run dev` and degrades to a generic toast once deployed. That is
 * precisely how Phase 33's SIREN gate shipped broken (33-REVIEW CR-01), so
 * each branch is asserted here rather than assumed.
 *
 * Also pinned: a successful delete NAVIGATES. `router.refresh()` would
 * re-render the row that was just removed and land the partner on the 404.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const { routerPushMock, routerRefreshMock, toastSuccessMock, toastErrorMock, deleteActionMock } =
  vi.hoisted(() => ({
    routerPushMock: vi.fn(),
    routerRefreshMock: vi.fn(),
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
    deleteActionMock: vi.fn(),
  }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPushMock, refresh: routerRefreshMock }),
}));

vi.mock('sonner', () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

vi.mock('@/lib/crm/actions', () => ({
  deleteClientRelationshipAction: deleteActionMock,
}));

import { DeleteClientDialog } from './DeleteClientDialog';
import { t } from '@/lib/i18n/dictionaries';

const REL_ID = '11111111-1111-4111-8111-111111111111';

function renderDialog(onOpenChange = vi.fn()) {
  render(
    <DeleteClientDialog
      relationshipId={REL_ID}
      companyName="Dupont Menuiserie"
      open
      onOpenChange={onOpenChange}
      lang="fr"
    />,
  );
  return onOpenChange;
}

const confirm = () => fireEvent.click(screen.getByTestId('confirm-delete-client'));

beforeEach(() => {
  routerPushMock.mockClear();
  routerRefreshMock.mockClear();
  toastSuccessMock.mockClear();
  toastErrorMock.mockClear();
  deleteActionMock.mockReset();
});

afterEach(cleanup);

describe('DeleteClientDialog', () => {
  it('names the company in the confirmation, so the partner sees WHAT they are deleting', () => {
    renderDialog();
    expect(screen.getByText(/Dupont Menuiserie/)).toBeInTheDocument();
  });

  it('on success: toasts, closes, and NAVIGATES to the client book', async () => {
    deleteActionMock.mockResolvedValue({ ok: true });
    const onOpenChange = renderDialog();
    confirm();

    await waitFor(() => expect(deleteActionMock).toHaveBeenCalledWith(REL_ID));
    await waitFor(() => expect(routerPushMock).toHaveBeenCalledWith('/clients'));
    expect(toastSuccessMock).toHaveBeenCalledWith(t('clients.detail.toast.deleted', 'fr'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // Refreshing would re-render the deleted row and 404 the partner.
    expect(routerRefreshMock).not.toHaveBeenCalled();
  });

  it('on has_proposals: explains WHY, with the count, and does not navigate', async () => {
    deleteActionMock.mockResolvedValue({ ok: false, reason: 'has_proposals', count: 3 });
    renderDialog();
    confirm();

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith(
        t('clients.detail.delete.blocked', 'fr').replace('{0}', '3'),
      ),
    );
    expect(toastErrorMock.mock.calls[0]![0]).toContain('3');
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it('on not_found: shows the GENERIC error — the same one any failure gives', async () => {
    deleteActionMock.mockResolvedValue({ ok: false, reason: 'not_found' });
    renderDialog();
    confirm();

    // One message for "no such id" and "someone else's id" alike, so this
    // dialog cannot be used to probe which ids exist (D-18).
    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith(t('clients.toast.error', 'fr')),
    );
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it('on a thrown rejection: toasts generically and never inspects the error', async () => {
    deleteActionMock.mockRejectedValue(new Error('anything at all'));
    renderDialog();
    confirm();

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith(t('clients.toast.error', 'fr')),
    );
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it('cancelling calls the action not at all', () => {
    renderDialog();
    fireEvent.click(screen.getByText(t('clients.detail.confirm.delete.cancel', 'fr')));
    expect(deleteActionMock).not.toHaveBeenCalled();
  });
});
