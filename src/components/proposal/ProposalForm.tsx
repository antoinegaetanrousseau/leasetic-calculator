'use client';

import { type ReactNode } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { proposalInputSchema, type ProposalInput } from '@/lib/calc';

/**
 * RHF input type — the schema's INPUT side (validityDays optional because
 * the Zod schema applies a `.default(30)` transformation on parse). This
 * differs from `ProposalInput` (= z.infer = output side, where validityDays
 * is required). useForm gets <TFieldValues=Input, TContext, TTransformed=Output>
 * so handleSubmit's data is typed to ProposalInput while defaultValues stays
 * lenient about validityDays.
 *
 * Pattern locked in Plan 07-04 (STATE.md Decisions Log) — sibling components
 * that consume the context (LiveLoyerPreview) use useFormContext<ProposalInput>
 * (the OUTPUT side, since validityDays.default(30) means the parsed/runtime
 * value is always defined).
 */
type ProposalFormValues = z.input<typeof proposalInputSchema>;

export interface ProposalFormProviderProps {
  /** Pre-fill values from session (D-7-13). */
  prefill?: Partial<ProposalInput>;
  children: ReactNode;
}

/**
 * Hoists the RHF setup one level up so the parametres wizard step's children
 * (WizardStep1Wiring, ParametresFormCard) share a single FormProvider
 * context. app/(authed)/proposals/new/parametres/page.tsx wraps them in this
 * provider; each child consumes the context via useFormContext().
 */
export function ProposalFormProvider({
  prefill,
  children,
}: ProposalFormProviderProps) {
  const form = useForm<ProposalFormValues, unknown, ProposalInput>({
    resolver: zodResolver(proposalInputSchema),
    mode: 'onBlur', // PROP-08: blur validation
    shouldFocusError: true,
    defaultValues: {
      partnerCo: prefill?.partnerCo ?? '',
      partnerName: prefill?.partnerName ?? '',
      // Phase 42 Plan 09 (FIELD-02 / D-11): partnerTel is never rendered as
      // an input (same hidden-field discipline as partnerCo/partnerName
      // above), but it MUST still be part of RHF's tracked values — the
      // wizard's save actions persist form.getValues() verbatim
      // (WizardStep1Wiring.tsx), so a value missing from defaultValues here
      // would be silently dropped on the very next save-as-draft or
      // save-and-advance, discarding whatever the D-25/D-30 overlay wrote.
      // Rule 2 auto-fix (see SUMMARY).
      partnerTel: prefill?.partnerTel ?? '',
      clientCo: prefill?.clientCo ?? '',
      clientName: prefill?.clientName ?? '',
      clientRole: prefill?.clientRole ?? '',
      clientTel: prefill?.clientTel ?? '',
      clientEmail: prefill?.clientEmail ?? '',
      clientSiren: prefill?.clientSiren ?? '',
      // Phase 42 Plan 09 (FIELD-01 / D-04): without this key, RHF's
      // useForm defaultValues never sees clientSiret, so the Controller-bound
      // SiretInput in ParametresFormCard falls back to field.value ?? ''
      // regardless of what page.tsx's prefill carries — the resume path
      // would silently lose a typed SIRET. Rule 2 auto-fix (see SUMMARY).
      clientSiret: prefill?.clientSiret ?? '',
      slb: prefill?.slb ?? undefined,
      evalParc: prefill?.evalParc ?? undefined,
      amountHT: prefill?.amountHT ?? '',
      // 36/48/60 — left undefined so the segmented control starts in
      // "no selection" state; Zod will reject submit until the user picks one.
      // PROP-21: if duplicating, pre-select the source's duration.
      durationMonths: prefill?.durationMonths ?? (undefined as unknown as 36 | 48 | 60),
      projectDesc: prefill?.projectDesc ?? '',
      partnerRef: prefill?.partnerRef ?? '',
      validityDays: prefill?.validityDays ?? 30, // D-7-05 default
    },
  });
  return <FormProvider {...form}>{children}</FormProvider>;
}
