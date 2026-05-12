'use client';

/**
 * PlusDeDetailsAccordion — collapsible region wrapper for step-1's 5 optional
 * fields (clientRole, clientSiren, projectDesc, slb, evalParc).
 *
 * Decisions referenced:
 *   - D-06: 5 optional fields hidden behind a `+ Plus de détails (facultatif)`
 *     trigger; expansion state persists via `_uiAccordionOpen` in the draft
 *     `inputs` jsonb (caller passes `defaultOpen` derived from that).
 *   - D-21 RHF state preservation: children stay mounted whether the
 *     accordion is open or closed. Closed visual = height:0 + opacity:0 +
 *     overflow:hidden — NOT conditional unmount — so RHF dirty-fields,
 *     touched-fields, and form values survive every toggle.
 *
 * Animation: 200ms ease-out on both height and opacity, per 13-UI-SPEC §5.2.
 *
 * Locked in 13-UI-SPEC.md §5.2.
 */

import { useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { t, type Lang } from '@/lib/i18n/dictionaries';

export interface PlusDeDetailsAccordionProps {
  /** Initial open state, hydrated from draft.inputs._uiAccordionOpen. */
  defaultOpen: boolean;
  /**
   * Server action called when the user toggles. Fire-and-forget — caller
   * persists `_uiAccordionOpen` to draft inputs jsonb without awaiting
   * here (the next updateDraft naturally recovers any silent failure).
   */
  onToggle: (open: boolean) => void;
  /** Language for the trigger label + ARIA labels. */
  lang: Lang;
  /** The 5 child fields. Stay mounted across collapse for RHF (D-21). */
  children: ReactNode;
}

const REGION_ID = 'plus-de-details-region';

export function PlusDeDetailsAccordion({
  defaultOpen,
  onToggle,
  lang,
  children,
}: PlusDeDetailsAccordionProps) {
  const [open, setOpen] = useState<boolean>(defaultOpen);

  const handleClick = () => {
    const next = !open;
    setOpen(next);
    // D-06: fire-and-forget — server writes _uiAccordionOpen to draft inputs.
    // No await, no toast, no error handling — purely cosmetic state.
    onToggle(next);
  };

  // NOTE: the trigger's accessible name is the visible "+ Plus de détails
  // (facultatif)" text. We do NOT apply aria-label here — doing so would
  // override the visible name and reduce screen-reader fidelity. Open/close
  // state is announced via aria-expanded; the two `wizard.accordion.aria.
  // label.{open,close}` keys are reserved for optional consumers that wire
  // up an sr-only context hint (e.g. a parent fieldset legend) without
  // shadowing the button's own visible name.

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={REGION_ID}
        onClick={handleClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'transparent',
          border: 'none',
          color: 'var(--teal)',
          fontSize: 14.5,
          fontWeight: 500,
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <Plus
          size={16}
          strokeWidth={2.25}
          aria-hidden="true"
          style={{
            transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
            transition: 'transform 200ms ease-out',
          }}
        />
        <span>{t('wizard.accordion.trigger', lang)}</span>
      </button>

      {/*
        D-21: children stay mounted at all times. Visual collapse uses
        height:0 + opacity:0 + overflow:hidden so React-Hook-Form state
        (dirtyFields, touchedFields, current values) survives every toggle.
        The 200ms ease-out timing matches 13-UI-SPEC §5.2 / §11.
      */}
      <div
        id={REGION_ID}
        role="region"
        style={{
          height: open ? 'auto' : 0,
          opacity: open ? 1 : 0,
          overflow: 'hidden',
          transition: 'height 200ms ease-out, opacity 200ms ease-out',
          marginTop: open ? 16 : 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
