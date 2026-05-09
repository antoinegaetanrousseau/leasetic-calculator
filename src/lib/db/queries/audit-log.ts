import 'server-only';
import { db, schema } from '@/lib/db';
import type { AuditLogRow } from '@/db/schema';

export type AuditAction =
  | 'proposal.create'
  | 'proposal.create_failed'
  | 'proposal.delete'
  | 'proposal.restore'
  | 'proposal.purge'
  | 'proposal.duplicate';      // future Phase 9: 'global_params.update', 'user.disable', etc.

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
