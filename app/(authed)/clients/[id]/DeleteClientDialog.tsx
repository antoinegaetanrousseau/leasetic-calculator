'use client';

/**
 * Delete a client file (operator decision, 2026-09-04).
 *
 * Mirrors `DeleteContactDialog` — same `AlertDialog`, same destructive
 * confirm — with two differences that matter.
 *
 * 1. IT BRANCHES ON A RETURNED VALUE, NOT ON A CAUGHT ERROR. The action can
 *    refuse for a reason the partner must be told ("finalized proposals are
 *    attached"), and Next.js redacts a Server Function's thrown message in a
 *    production build. A `catch (e) => e.message === SENTINEL` handshake would
 *    work in `npm run dev` and silently degrade to a generic toast once
 *    deployed — the Phase 33 CR-01 defect exactly. The `catch` here stays
 *    bounded and blind: it never inspects what it caught, and
 *    `tests/server-action-error-contracts.test.ts` fails the build if it ever
 *    starts to.
 *
 * 2. IT NAVIGATES INSTEAD OF REFRESHING. The page this dialog sits on is the
 *    deleted row; `router.refresh()` would re-render a relationship that no
 *    longer exists and land the partner on the 404. `push('/clients')` sends
 *    them back to the book, which is where a just-deleted client belongs.
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteClientRelationshipAction } from '@/lib/crm/actions';
import { t, type Lang } from '@/lib/i18n/dictionaries';

export interface DeleteClientDialogProps {
  relationshipId: string;
  /** Shown in the confirmation copy so the partner sees WHAT they are deleting. */
  companyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
}

export function DeleteClientDialog({
  relationshipId,
  companyName,
  open,
  onOpenChange,
  lang,
}: DeleteClientDialogProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const onConfirm = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteClientRelationshipAction(relationshipId);

      if (!result.ok) {
        // `not_found` covers "no such id" AND "someone else's id" — one
        // message for both, so this dialog cannot be used to probe.
        toast.error(
          result.reason === 'has_proposals'
            ? t('clients.detail.delete.blocked', lang).replace('{0}', String(result.count))
            : t('clients.toast.error', lang),
        );
        onOpenChange(false);
        return;
      }

      toast.success(t('clients.detail.toast.deleted', lang));
      onOpenChange(false);
      router.push('/clients');
    } catch {
      // Bounded and blind — the rejection itself is never inspected.
      toast.error(t('clients.toast.error', lang));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('clients.detail.confirm.delete.title', lang)}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('clients.detail.confirm.delete.description', lang).replace('{0}', companyName)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {t('clients.detail.confirm.delete.cancel', lang)}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            data-testid="confirm-delete-client"
            disabled={isDeleting}
            onClick={onConfirm}
          >
            {t('clients.detail.confirm.delete.confirm', lang)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
