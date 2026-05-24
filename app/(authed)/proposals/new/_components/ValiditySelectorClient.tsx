'use client';
/**
 * ValiditySelectorClient — Phase 17 Plan 07 WIZ-04 (D-01).
 *
 * Segmented validity selector (15j / 30j / 60j) mounted inside the CALCUL
 * recap on wizard step 3. Lets the partner override the per-proposal
 * validity without leaving the page and without affecting `global_params`.
 *
 * Visual contract (17-UI-SPEC §Wizard step 3 — Left column CALCUL recap
 * validity selector): reuses the existing `.dg / .db / .db.on` chrome from
 * `app/globals.css` lines 252-285 — NO new CSS introduced.
 *
 * Behavior contract:
 *   - `defaultValidity` seeds local state from the server-rendered draft
 *     (`draft.inputs.validityDays`).
 *   - Click handler optimistically updates local state IMMEDIATELY for UI
 *     feedback, then dispatches the server action inside `useTransition`
 *     to keep the UI non-blocking (T-17-07-06 — optimistic divergence
 *     accepted for an internal tool per 17-07 threat register).
 *   - The server action (`updateValidityAction`) writes
 *     `draft.inputs.validityDays` via the Phase 12 D-22 full-replace
 *     semantics and does NOT redirect (the inversion vs. saveAsDraft).
 */
import { useState, useTransition } from 'react';

import { t, type Lang } from '@/lib/i18n/dictionaries';

import { updateValidityAction } from '../_actions/updateValidity.action';

export interface ValiditySelectorClientProps {
  /** UUID of the current draft; threaded to the server action. */
  draftId: string;
  /**
   * Initial selection from the server-rendered draft. Constrained to the
   * partner-facing options 15 / 30 / 60.
   */
  defaultValidity: 15 | 30 | 60;
  /** Language for the aria-label. */
  lang: Lang;
}

const OPTIONS: ReadonlyArray<15 | 30 | 60> = [15, 30, 60];

export function ValiditySelectorClient({
  draftId,
  defaultValidity,
  lang,
}: ValiditySelectorClientProps) {
  const [selected, setSelected] = useState<15 | 30 | 60>(defaultValidity);
  const [, startTransition] = useTransition();

  const handleChange = (days: 15 | 30 | 60) => {
    if (days === selected) return;
    // Optimistic local update FIRST — instant UI feedback.
    setSelected(days);
    // Server action runs inside the transition so the UI stays responsive.
    startTransition(async () => {
      await updateValidityAction(draftId, days);
    });
  };

  return (
    <div
      className="dg"
      role="group"
      aria-label={t('proposal.validity.ariaLabel', lang)}
      data-testid="validity-selector"
    >
      {OPTIONS.map((days) => {
        const isActive = selected === days;
        return (
          <button
            key={days}
            type="button"
            className={`db${isActive ? ' on' : ''}`}
            onClick={() => handleChange(days)}
            aria-pressed={isActive}
          >
            {days}j
          </button>
        );
      })}
    </div>
  );
}
