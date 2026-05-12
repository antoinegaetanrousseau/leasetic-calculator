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

import { useFormContext } from 'react-hook-form';
import type { z } from 'zod';
import { proposalInputSchema } from '@/lib/calc';
import { type Lang, t } from '@/lib/i18n/dictionaries';
import { saveAsDraftAction } from '../_actions/saveAsDraft.action';
import { persistAccordionOpenAction } from '../_actions/persistAccordionOpen.action';
import { WizardActionBar } from '../_components/WizardActionBar';
import { ParametresFormCard } from './ParametresFormCard';

type ProposalFormValues = z.input<typeof proposalInputSchema>;

export interface WizardStep1WiringProps {
  draftId: string;
  accordionDefaultOpen: boolean;
  lang: Lang;
}

export function WizardStep1Wiring({
  draftId,
  accordionDefaultOpen,
  lang,
}: WizardStep1WiringProps) {
  const form = useFormContext<ProposalFormValues>();

  // D-17: save-as-draft binds the current RHF values + invokes the server
  // action. The action redirects to '/' on success; WizardActionBar surfaces
  // the success toast before the redirect resolves.
  const onSaveDraft = async () => {
    const values = form.getValues();
    await saveAsDraftAction(draftId, values as Record<string, unknown>);
  };

  // D-06: fire-and-forget accordion persistence — no await, no toast.
  const onAccordionToggle = (open: boolean) => {
    void persistAccordionOpenAction(draftId, open);
  };

  return (
    <>
      <ParametresFormCard
        draftId={draftId}
        accordionDefaultOpen={accordionDefaultOpen}
        onAccordionToggle={onAccordionToggle}
        lang={lang}
      />
      <div style={{ marginTop: 16 }}>
        <WizardActionBar
          currentStep={1}
          draftId={draftId}
          lang={lang}
          onSaveDraft={onSaveDraft}
          primary={{
            kind: 'link',
            href: `/proposals/new/calcul?draft_id=${draftId}`,
            label: t('wizard.action.step1.continue', lang),
          }}
        />
      </div>
    </>
  );
}
