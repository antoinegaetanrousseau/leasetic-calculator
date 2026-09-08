import { z } from 'zod';
import { hasTenDigits } from '@/lib/calc';

/**
 * PROF-03 / D-08 / D-09 — the single Leasetic advisor identity's form contract.
 *
 * New file, NOT added to `./schemas.ts` (Plan 42-05 edits that file in the same wave —
 * colliding would create a merge hazard across parallel plans).
 *
 * All four fields are REQUIRED, deliberately stricter than the partner-side telephone
 * fields (`createPartnerFormSchema.phone`/`telephone`, D-13/D-19), which ship nullable.
 * D-09 reads this row live on every generated PDF, so a partial advisor identity has no
 * acceptable state — an admin cannot save a half-filled contact block.
 *
 * `telephone` reuses `hasTenDigits` (the same stripped-10-digit rule `optionalPhoneSchema`
 * wraps in `@/lib/calc/schema.ts`) rather than inventing a second, drifting phone regex.
 */
export const advisorFormSchema = z.object({
  name: z.string().min(1, 'error.field.required').max(120),
  fonction: z.string().min(1, 'error.field.required').max(120),
  telephone: z
    .string()
    .min(1, 'error.field.required')
    .refine(hasTenDigits, { message: 'error.field.phone.invalid' }),
  email: z
    .string()
    .min(1, 'error.field.required')
    .email('error.field.email.invalid'),
});

export type AdvisorFormValues = z.infer<typeof advisorFormSchema>;
