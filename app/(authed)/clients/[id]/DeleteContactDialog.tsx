'use client';

/**
 * Phase 30 Plan 07 Task 3 — DeleteContactDialog (CRM-04, 30-UI-SPEC.md §3).
 *
 * shadcn `AlertDialog` — this component's first real-app adoption (per
 * 30-UI-SPEC.md Component Inventory). Replaces the legacy native-browser
 * confirm-prompt pattern for this one NEW interaction; existing native-
 * confirm call sites elsewhere in the app (`PartnerRowActions`,
 * `DeleteButtonClient`) are unchanged and out of scope (Assumption A-6).
 *
 * Confirming calls `deleteContactAction(contactId)` — which re-proves
 * ownership inside its own SQL statement (plan 30-05) — then refreshes the
 * server-rendered contacts list and fires the "Contact supprimé." toast.
 * Cancelling calls nothing.
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
import { deleteContactAction } from '@/lib/crm/actions';
import { t, type Lang } from '@/lib/i18n/dictionaries';

export interface DeleteContactDialogTarget {
  id: string;
  name: string;
}

export interface DeleteContactDialogProps {
  /** The contact pending deletion, or null when no delete is in flight. */
  contact: DeleteContactDialogTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
}

export function DeleteContactDialog({ contact, open, onOpenChange, lang }: DeleteContactDialogProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const onConfirm = async () => {
    if (!contact) return;
    setIsDeleting(true);
    try {
      await deleteContactAction(contact.id);
      toast.success(t('clients.contact.toast.deleted', lang));
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error(t('clients.toast.error', lang));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('clients.contact.confirm.delete.title', lang)}</AlertDialogTitle>
          <AlertDialogDescription>
            {contact
              ? t('clients.contact.confirm.delete.description', lang).replace('{0}', contact.name)
              : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {t('clients.contact.confirm.delete.cancel', lang)}
          </AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={isDeleting} onClick={onConfirm}>
            {t('clients.contact.confirm.delete.confirm', lang)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
