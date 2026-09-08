/**
 * Phase 9 — Admin Surface barrel.
 * Re-exports all admin server-action wrappers and shared Zod schemas.
 */

export {
  adminUpdateGlobalParams,
  adminDisableUser,
  adminReEnableUser,
  adminCreateInvitation,
  adminCreatePasswordReset,
  adminReissueInvitation,
  createPartnerInvitationAction,
  // Phase 22 Plan 03 — PTYPE-03: admin-only partner type change (audited).
  adminUpdatePartnerType,
  // Phase 42 follow-up — FIELD-02: admin edit of company_telephone (audited).
  adminUpdatePartnerCompanyTelephone,
} from './actions';
export type {
  AdminUpdateGlobalParamsArgs,
  AdminCreateInvitationArgs,
  AdminCreateInvitationResult,
  CreatePartnerInvitationResult,
} from './actions';

export {
  coeffEditorSchema,
  createPartnerSchema,
  createPartnerFormSchema,
} from './schemas';
export type {
  CoeffEditorValues,
  CreatePartnerValues,
  CreatePartnerFormValues,
} from './schemas';

// Phase 42 Plan 06 — the single Leasetic advisor identity (PROF-03, D-07/D-08/D-09).
export { advisorFormSchema } from './advisor-schemas';
export type { AdvisorFormValues } from './advisor-schemas';
export { adminUpdateAdvisor } from './advisor-actions';
export type { AdminUpdateAdvisorResult } from './advisor-actions';
