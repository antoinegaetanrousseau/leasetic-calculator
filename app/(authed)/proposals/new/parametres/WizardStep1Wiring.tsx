'use client';

/**
 * WizardStep1Wiring — client adapter that bridges the outer
 * <ProposalFormProvider> RHF context with:
 *   1. <ParametresFormCard>     — the 2-section form card + accordion mount
 *   2. <WizardActionBar>        — the bottom action bar (Save / Continuer)
 *
 * Why this layer exists (Approach B from PLAN.md Task 2 action):
 * the WizardActionBar's `onSaveDraft` server action needs the form's
 * current values, which only `useFormContext().getValues()` can read.
 * That call must happen in a client component. The server page
 * (parametres/page.tsx) mounts ProposalFormProvider and this wiring as
 * a sibling — keeping the page itself a pure server component with no
 * client boundaries of its own.
 *
 * The accordion onToggle is wired to persistAccordionOpenAction with the
 * draftId bound. The primary CTA is a plain Link (kind:'link') per PLAN.md
 * Test 11 — server-side gating on Continuer is reserved for step 2's
 * saveAndAdvanceAction (plan 13-04).
 */

import { useTransition } from 'react';
import { useFormContext } from 'react-hook-form';
import type { z } from 'zod';
import { toast } from 'sonner';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { proposalInputSchema } from '@/lib/calc';
import { type Lang, t } from '@/lib/i18n/dictionaries';
import { saveAsDraftAction } from '../_actions/saveAsDraft.action';
import { saveAndAdvanceAction } from '../_actions/saveAndAdvance.action';
import { WizardActionBar } from '../_components/WizardActionBar';
import { ParametresFormCard } from './ParametresFormCard';

type ProposalFormValues = z.input<typeof proposalInputSchema>;

export interface WizardStep1WiringProps {
  draftId: string;
  lang: Lang;
}

export function WizardStep1Wiring({
  draftId,
  lang,
}: WizardStep1WiringProps) {
  const form = useFormContext<ProposalFormValues>();
  const [isContinuePending, startContinueTransition] = useTransition();

  // D-17: save-as-draft binds the current RHF values + invokes the server action.
  const onSaveDraft = async () => {
    const values = form.getValues();
    await saveAsDraftAction(draftId, values as Record<string, unknown>);
  };

  // Validate + save + redirect to calcul. Runs RHF validation first so field-
  // level errors appear inline rather than as a generic toast. saveAndAdvanceAction
  // redirects server-side on success; isRedirectError re-throws so Next.js handles
  // navigation cleanly.
  const onContinue = () => {
    startContinueTransition(async () => {
      const valid = await form.trigger();
      if (!valid) return; // field errors already visible inline; no toast needed

      try {
        const values = form.getValues();
        await saveAndAdvanceAction(draftId, values as Record<string, unknown>, 1);
      } catch (e) {
        if (isRedirectError(e)) throw e;
        toast.error(t('wizard.toast.draft.error', lang));
      }
    });
  };

  return (
    <>
      <ParametresFormCard
        draftId={draftId}
        lang={lang}
      />
      <div style={{ marginTop: 16 }}>
        <WizardActionBar
          currentStep={1}
          draftId={draftId}
          lang={lang}
          onSaveDraft={onSaveDraft}
          primary={{
            kind: 'action',
            onClick: onContinue,
            label: t('wizard.action.step1.continue', lang),
            spinnerLabel: t('wizard.action.step1.continue.spinner', lang),
            isSubmitting: isContinuePending,
          }}
        />
      </div>
    </>
  );
}
