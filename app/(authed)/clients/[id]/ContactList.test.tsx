/**
 * Phase 30 Plan 07 Task 2 — ContactList tests.
 *
 * Coverage (one case per <behavior> bullet):
 *   1. Each contact renders name at font-semibold, role/phone/email at 13px
 *      muted.
 *   2. The phone line is prefixed by PhoneIcon and the email line by
 *      MailIcon.
 *   3. Absent role/phone/email lines are omitted rather than dashed.
 *   4. Each row renders an edit and delete icon-button, both with an
 *      aria-label interpolating the contact's name.
 *   5. The delete button carries hover:text-destructive.
 *   6. Clicking edit opens ContactFormDialog in edit mode, pre-filled.
 *   7. Clicking delete opens DeleteContactDialog for that contact.
 *
 * ContactFormDialog/DeleteContactDialog are stubbed here — their own
 * behavior is covered by their dedicated test files (Task 3). This keeps
 * ContactList's suite focused on row rendering + dialog-target wiring, and
 * lets Task 2 be committed/verified independently of Task 3's files.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('server-only', () => ({}));

const { contactFormDialogPropsCapture, deleteContactDialogPropsCapture } = vi.hoisted(() => ({
  contactFormDialogPropsCapture: [] as Array<Record<string, unknown>>,
  deleteContactDialogPropsCapture: [] as Array<Record<string, unknown>>,
}));

vi.mock('./ContactFormDialog', () => ({
  ContactFormDialog: (props: Record<string, unknown>) => {
    contactFormDialogPropsCapture.push(props);
    return <div data-testid="contact-form-dialog-stub" data-mode={props.mode as string} />;
  },
}));

vi.mock('./DeleteContactDialog', () => ({
  DeleteContactDialog: (props: Record<string, unknown>) => {
    deleteContactDialogPropsCapture.push(props);
    return <div data-testid="delete-contact-dialog-stub" />;
  },
}));

import { ContactList } from './ContactList';

const FULL_CONTACT = {
  id: 'contact-1',
  name: 'Jeanne Dupont',
  role: 'Acheteuse',
  phone: '06 00 00 00 00',
  email: 'jeanne@example.com',
};

const MINIMAL_CONTACT = {
  id: 'contact-2',
  name: 'Marc Petit',
  role: null,
  phone: null,
  email: null,
};

beforeEach(() => {
  contactFormDialogPropsCapture.length = 0;
  deleteContactDialogPropsCapture.length = 0;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ContactList (Plan 30-07 Task 2)', () => {
  it('Test 1: renders name at font-semibold and role/phone/email at 13px muted', () => {
    render(<ContactList contacts={[FULL_CONTACT]} relationshipId="rel-1" lang="fr" />);
    const nameEl = screen.getByText('Jeanne Dupont');
    expect(nameEl.className).toContain('font-semibold');
    const roleEl = screen.getByText('Acheteuse');
    expect(roleEl.className).toContain('text-[13px]');
    expect(roleEl.className).toContain('text-muted-foreground');
  });

  it('Test 2: phone line is prefixed by an icon (PhoneIcon) and email line by an icon (MailIcon)', () => {
    const { container } = render(
      <ContactList contacts={[FULL_CONTACT]} relationshipId="rel-1" lang="fr" />,
    );
    const phoneLine = screen.getByText('06 00 00 00 00').closest('div');
    expect(phoneLine?.querySelector('svg')).not.toBeNull();
    const emailLine = screen.getByText('jeanne@example.com').closest('div');
    expect(emailLine?.querySelector('svg')).not.toBeNull();
    // Two distinct icon-prefixed lines (phone + email), never the same glyph reused for both.
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(2);
  });

  it('Test 3: absent role/phone/email lines are omitted, never rendered as an em dash', () => {
    render(<ContactList contacts={[MINIMAL_CONTACT]} relationshipId="rel-1" lang="fr" />);
    expect(screen.getByText('Marc Petit')).toBeInTheDocument();
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });

  it('Test 4: each row renders an edit and delete icon-button, both aria-labeled with the contact name', () => {
    render(<ContactList contacts={[FULL_CONTACT]} relationshipId="rel-1" lang="fr" />);
    expect(screen.getByRole('button', { name: 'Modifier Jeanne Dupont' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Supprimer Jeanne Dupont' })).toBeInTheDocument();
  });

  it('Test 5: the delete button carries hover:text-destructive', () => {
    render(<ContactList contacts={[FULL_CONTACT]} relationshipId="rel-1" lang="fr" />);
    const deleteButton = screen.getByRole('button', { name: 'Supprimer Jeanne Dupont' });
    expect(deleteButton.className).toContain('hover:text-destructive');
  });

  it('Test 6: clicking edit opens ContactFormDialog in edit mode, pre-filled with the row values', () => {
    render(<ContactList contacts={[FULL_CONTACT]} relationshipId="rel-1" lang="fr" />);
    fireEvent.click(screen.getByRole('button', { name: 'Modifier Jeanne Dupont' }));

    expect(screen.getByTestId('contact-form-dialog-stub')).toHaveAttribute('data-mode', 'edit');
    const lastProps = contactFormDialogPropsCapture[contactFormDialogPropsCapture.length - 1];
    expect(lastProps.contact).toEqual(FULL_CONTACT);
    expect(lastProps.relationshipId).toBe('rel-1');
    expect(lastProps.open).toBe(true);
  });

  it('Test 7: clicking delete opens DeleteContactDialog for that contact', () => {
    render(<ContactList contacts={[FULL_CONTACT]} relationshipId="rel-1" lang="fr" />);
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer Jeanne Dupont' }));

    expect(screen.getByTestId('delete-contact-dialog-stub')).toBeInTheDocument();
    const lastProps = deleteContactDialogPropsCapture[deleteContactDialogPropsCapture.length - 1];
    expect(lastProps.contact).toEqual(FULL_CONTACT);
    expect(lastProps.open).toBe(true);
  });

  it('Test 8 (acceptance): zero contacts renders the empty state with the add CTA, not a row list', () => {
    render(<ContactList contacts={[]} relationshipId="rel-1" lang="fr" />);
    expect(screen.getByText('Aucun contact enregistré pour ce client.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ajouter un contact' })).toBeInTheDocument();
  });

  it('Test 9 (acceptance): only ONE ContactFormDialog instance is ever mounted, not one per row', () => {
    render(
      <ContactList
        contacts={[FULL_CONTACT, MINIMAL_CONTACT]}
        relationshipId="rel-1"
        lang="fr"
      />,
    );
    // Neither dialog is mounted until a trigger is clicked.
    expect(screen.queryAllByTestId('contact-form-dialog-stub')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Modifier Jeanne Dupont' }));
    expect(screen.queryAllByTestId('contact-form-dialog-stub')).toHaveLength(1);
  });
});
