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
  | 'user.purge';   // pre-launch hard-delete of test accounts (@test.leasetic.com)

export type AuditTargetType = 'proposal' | 'user' | 'global_params';

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
