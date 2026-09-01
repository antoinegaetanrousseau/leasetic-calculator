'use client';

/**
 * Phase 30 Plan 07 Task 2 — ContactList (CRM-04, 30-UI-SPEC.md §3).
 *
 * Renders the Contacts card's body: the zero-contacts empty state OR the
 * row list, plus the single "+ Ajouter un contact" entry point (this is the
 * page's one accent-eligible CTA — Copywriting Contract lists it as a
 * "Primary CTA", the Color contract reserves `--primary` for it explicitly).
 *
 * Icon-button row actions follow `PartnerRowActions.tsx`'s precedent: an
 * icon-only trigger MUST carry a real `aria-label` (there confirmed via
 * `aria-label={t('admin.partners.action.viewProposals', lang)}`) — both the
 * edit and delete buttons here interpolate the contact's name into their
 * label so two contacts named differently have two different accessible
 * names.
 *
 * Exactly ONE ContactFormDialog / DeleteContactDialog instance is ever
 * mounted at a time (not one per row) — `dialog` state selects which
 * contact (if any) is the active target, and a `key` keyed on the target id
 * forces a fresh mount (fresh RHF defaultValues) whenever the target
 * changes without an intermediate close.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyMedia } from '@/components/ui/empty';
import { MailIcon, PencilIcon, PhoneIcon, PlusIcon, TrashIcon, UsersIcon } from '@/components/ui/icons';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import type { ContactListRow } from '@/lib/db/queries';
import { ContactFormDialog } from './ContactFormDialog';
import { DeleteContactDialog } from './DeleteContactDialog';

export interface ContactListProps {
  contacts: ContactListRow[];
  relationshipId: string;
  lang: Lang;
}

type DialogState =
  | { mode: 'create' }
  | { mode: 'edit'; contact: ContactListRow }
  | { mode: 'delete'; contact: ContactListRow }
  | null;

export function ContactList({ contacts, relationshipId, lang }: ContactListProps) {
  const [dialog, setDialog] = useState<DialogState>(null);

  const addTrigger = (
    <Button type="button" onClick={() => setDialog({ mode: 'create' })}>
      <PlusIcon size={16} className="mr-1.5" aria-hidden="true" />
      {t('clients.contact.cta.add', lang)}
    </Button>
  );

  return (
    <>
      {contacts.length === 0 ? (
        <Empty className="px-5 py-10">
          <EmptyMedia variant="icon">
            <UsersIcon size={20} aria-hidden="true" />
          </EmptyMedia>
          <EmptyDescription className="text-[14.5px]">
            {t('clients.detail.empty.contacts.title', lang)}
          </EmptyDescription>
          <EmptyContent>{addTrigger}</EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <div className="text-[14.5px] font-semibold">{contact.name}</div>
                {contact.role && (
                  <div className="text-[13px] text-muted-foreground">{contact.role}</div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <PhoneIcon size={14} aria-hidden="true" />
                    {contact.phone}
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <MailIcon size={14} aria-hidden="true" />
                    {contact.email}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('clients.contact.action.edit', lang).replace('{0}', contact.name)}
                  onClick={() => setDialog({ mode: 'edit', contact })}
                >
                  <PencilIcon size={16} aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="hover:text-destructive"
                  aria-label={t('clients.contact.action.delete', lang).replace('{0}', contact.name)}
                  onClick={() => setDialog({ mode: 'delete', contact })}
                >
                  <TrashIcon size={16} aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
          <div className="mt-3">{addTrigger}</div>
        </div>
      )}

      {(dialog?.mode === 'create' || dialog?.mode === 'edit') && (
        <ContactFormDialog
          key={dialog.mode === 'edit' ? dialog.contact.id : 'create'}
          mode={dialog.mode}
          relationshipId={relationshipId}
          contact={dialog.mode === 'edit' ? dialog.contact : undefined}
          open
          onOpenChange={(next) => {
            if (!next) setDialog(null);
          }}
          lang={lang}
        />
      )}
      {dialog?.mode === 'delete' && (
        <DeleteContactDialog
          key={dialog.contact.id}
          contact={dialog.contact}
          open
          onOpenChange={(next) => {
            if (!next) setDialog(null);
          }}
          lang={lang}
        />
      )}
    </>
  );
}
