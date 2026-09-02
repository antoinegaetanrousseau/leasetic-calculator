import { z } from 'zod';

/**
 * Phase 31 Plan 03 — validation schemas for the merge / keep-separate
 * server actions (D-12, D-09).
 *
 * Reuse discipline: `error.field.required` already exists in the
 * dictionary (src/lib/i18n/dictionaries.ts) — these schemas emit that
 * exact key rather than minting a new string, matching
 * `src/lib/crm/schemas.ts`'s flat-object, message-key-only-errors
 * convention.
 */

export const mergeCompanyPairSchema = z.object({
  pairId: z.string().uuid({ message: 'error.field.required' }),
  survivorCompanyId: z.string().uuid({ message: 'error.field.required' }),
});

export type MergeCompanyPairInput = z.infer<typeof mergeCompanyPairSchema>;

export const keepPairSeparateSchema = z.object({
  pairId: z.string().uuid({ message: 'error.field.required' }),
});

export type KeepPairSeparateInput = z.infer<typeof keepPairSeparateSchema>;
