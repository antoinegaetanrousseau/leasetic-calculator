import 'server-only';
import { db, schema } from '@/lib/db';
import type { AuditLogRow } from '@/db/schema';

// ADMIN-09 / D-09-09b: ONLY 'global_params.update' payload may include commission_pct.
// All other Phase-9 audit actions (user.*, invitation.*, password_reset.*) MUST NOT
// echo commission_pct in their payloads. This comment is the canonical enforcement point.
export type AuditAction =
  | 'proposal.create'
  | 'proposal.create_failed'
  | 'proposal.delete'
  | 'proposal.restore'
  | 'proposal.purge'
  | 'proposal.duplicate'
  // ── Phase 9 — Admin Surface (D-09-09a) ──────────────────────────────────────
  | 'global_params.update'
  | 'user.create'
  | 'user.disable'
  | 'user.re_enable'
  | 'invitation.create'
  | 'password_reset.create'
  | 'role.grant'   // reserved — scripts/grant-admin.ts does NOT yet write to audit_log; future hook only.
  // ── Phase 10 — Cutover & Polish (D-10-11) ──────────────────────────────────
  | 'user.purge'   // pre-launch hard-delete of test accounts (@test.leasetic.com)
  // ── Phase 22 — Partner Types (PTYPE-03 / D-02) ──────────────────────────────
  // before/after record the SPECIFIC type string, never a boolean (D-02).
  // ADMIN-09: partner_type is a business-classification field, NOT a commission/rate value.
  | 'user.partner_type_change'
  // ── Phase 30 — Company & Contact Registry write layer (CRM-01/02/04) ───────
  // Payloads carry only ids and caller-submitted values — never commission
  // data, never the pre-existing/new-company distinction (T-30-05-02/07).
  | 'client_relationship.create'
  | 'contact.create'
  | 'contact.update'
  | 'contact.delete'
  // ── Phase 31 — Reconciliation engine (IMPORT-01..06) ────────────────────────
  // Payloads carry ids and the caller-submitted verdict only, never business
  // data (ADMIN-09). The three '.extract' actions are written with
  // actorId: null (system-initiated CLI script — per the existing convention
  // documented at the WriteAuditLogArgs.actorId line below).
  | 'company.extract'
  | 'client_relationship.extract'
  | 'contact.extract'
  | 'company_pair.flag'
  | 'company.merge'
  | 'client_relationship.merge'
  | 'company_pair.keep_separate'
  // ── Phase 33 — Pipeline (PIPE-01..05) ───────────────────────────────────
  // Payloads carry ids, the from/to stage strings and the caller-submitted
  // date/SIREN only — never commission or rate data (ADMIN-09). Phase 34's
  // ACTV-02 reads the stage-change action below for the activity timeline.
  // NOTE: 'relationship.stage_change' currently writes `toStage` only, so the
  // from/to promise above is the CONTRACT, not yet the code. Phase 34 plan 34-08
  // closes WR-16 by writing `fromStage` too, in src/lib/pipeline/actions.ts.
  | 'relationship.stage_change'
  | 'proposal.outcome_won'
  | 'proposal.outcome_lost'
  | 'company.siren_add'
  // ── Phase 34 — Fiche client (FICHE-01..03, D-03) ──────────────────────────
  // Shared-tier only. A `companies` edit is audit-logged precisely BECAUSE
  // `companies` is a shared row (CRM-01) and every other partner on that company
  // sees the result. A PRIVATE-tier edit — lead source, description, next action,
  // notes, timeline events on `client_relationships` — is deliberately NOT
  // audited (D-03): it is visible to its owner alone, so there is no other party
  // to be accountable to, and an audit row would surface one partner's private
  // note in the admin audit viewer (ADMIN-07). Do not add an action for one.
  // Payloads carry ids and caller-submitted values only, never commission data
  // (ADMIN-09, D-26).
  | 'company.display_update'
  | 'company.siren_correct'
  | 'company.registry_sync';

export type AuditTargetType = 'proposal' | 'user' | 'global_params' | 'client_relationship' | 'contact' | 'company' | 'company_pair';

export interface WriteAuditLogArgs {
  actorId: string | null;        // null when system-initiated (e.g., 'proposal.purge' via cron)
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string | null;
  payload?: Record<string, unknown>;
}

/**
 * DATA-07. Every Phase 8 write that mutates state writes a row here:
 *   - createProposal succeeds       → 'proposal.create'
 *   - createProposal fails after row → 'proposal.create_failed' (D-B1)
 *   - softDeleteProposal succeeds   → 'proposal.delete'
 *   - restoreProposal succeeds      → 'proposal.restore'
 *   - hardPurgeProposal succeeds    → 'proposal.purge'
 *   - createProposal with duplicate → 'proposal.duplicate' (Plan 08-13)
 *
 * Phase 9 (admin/actions.ts wrappers) also calls this for:
 *   - adminUpdateGlobalParams       → 'global_params.update'
 *   - adminDisableUser              → 'user.disable'
 *   - adminReEnableUser             → 'user.re_enable'
 *   - adminCreateInvitation         → 'user.create' + 'invitation.create'
 *   - adminCreatePasswordReset      → 'password_reset.create'
 *
 * Phase 10 (scripts/purge-test-data.ts) also calls this for:
 *   - scripts/purge-test-data.ts                       → 'user.purge' (Phase 10 D-10-11)
 */
export async function writeAuditLog(args: WriteAuditLogArgs): Promise<AuditLogRow> {
  const dbi = db();
  const [row] = await dbi.insert(schema.auditLog).values({
    actorId: args.actorId,
    action: args.action,
    targetType: args.targetType,
    targetId: args.targetId,
    payload: args.payload ?? {},
  }).returning();
  return row;
}
