'use server';

/**
 * Admin-layer server-action wrappers (Phase 9 ADMIN-08 / D-09-09).
 *
 * PITFALLS §7.3 ordering — every exported function calls requireAdmin() as the
 * FIRST await before any DB or primitive call. Pattern:
 *   const { session } = await requireAdmin();
 *   await primitive(...);
 *   await writeAuditLog({...});
 *
 * D-09-09b ADMIN-09 commission redaction:
 *   ONLY 'global_params.update' audit payload may include commission_pct.
 *   Every other wrapper's payload MUST NOT echo it. The user.* / invitation.* /
 *   password_reset.* wrappers take NO global_params arguments and produce
 *   audit payloads that have no commission field at all — natural isolation,
 *   plus a per-wrapper inline comment for future contributors.
 *
 * PITFALLS §9.4 error redaction:
 *   Catch blocks log to console.error (server-side only, redacted) and re-throw
 *   bounded error keys. Never echo raw DB errors to callers.
 */

import { requireAdmin } from '@/lib/auth/require';
import {
  disableUser,
  reEnableUser,
  createInvitation,
  createPasswordReset,
  type InviteResult,
  type ResetResult,
} from '@/lib/auth/actions';
import { insertGlobalParams } from '@/lib/db/queries/global-params';
import { writeAuditLog } from '@/lib/db/queries/audit-log';
import type { GlobalParamsRow } from '@/db/schema';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

/* ─────────────────────────────────────────────────────────────────────────── */
/*  adminUpdateGlobalParams (ADMIN-02 + D-09-09 + ADMIN-09)                    */
/* ─────────────────────────────────────────────────────────────────────────── */

export interface AdminUpdateGlobalParamsArgs {
  commissionPct: string;
  maxAmount: string;
  validityDays: number;
  coefficients: GlobalParamsRow['coefficients'];   // jsonb shape from schema
  note?: string | null;
  /** Diff source — caller provides the latest loaded row to compute changedFields server-side. */
  before: GlobalParamsRow;
}

interface ChangedFieldsResult extends Record<string, unknown> {
  changed_fields: string[];
  before: Pick<GlobalParamsRow, 'commissionPct' | 'maxAmount' | 'validityDays' | 'coefficients' | 'note'>;
  after:  Pick<GlobalParamsRow, 'commissionPct' | 'maxAmount' | 'validityDays' | 'coefficients' | 'note'>;
}

function computeChangedFields(before: GlobalParamsRow, after: GlobalParamsRow): ChangedFieldsResult {
  const changed: string[] = [];
  if (String(before.commissionPct) !== String(after.commissionPct)) changed.push('commissionPct');
  if (String(before.maxAmount) !== String(after.maxAmount)) changed.push('maxAmount');
  if (before.validityDays !== after.validityDays) changed.push('validityDays');
  if ((before.note ?? null) !== (after.note ?? null)) changed.push('note');
  for (const tk of ['t1', 't2', 't3', 't4'] as const) {
    for (const dk of ['36', '48', '60'] as const) {
      const b = before.coefficients?.[tk]?.[dk];
      const a = after.coefficients?.[tk]?.[dk];
      if (String(b) !== String(a)) changed.push(`coefficients.${tk}.${dk}`);
    }
  }
  return {
    changed_fields: changed,
    before: {
      commissionPct: before.commissionPct,
      maxAmount: before.maxAmount,
      validityDays: before.validityDays,
      coefficients: before.coefficients,
      note: before.note,
    },
    after: {
      commissionPct: after.commissionPct,
      maxAmount: after.maxAmount,
      validityDays: after.validityDays,
      coefficients: after.coefficients,
      note: after.note,
    },
  };
}

/**
 * ADMIN-02. Append-only update — INSERTs a new global_params row, never UPDATEs.
 * D-09-09b: this is the ONLY wrapper whose audit payload may include commission_pct.
 */
export async function adminUpdateGlobalParams(
  args: AdminUpdateGlobalParamsArgs,
): Promise<GlobalParamsRow> {
  const { session } = await requireAdmin();   // FIRST — PITFALLS §7.3
  try {
    const newRow = await insertGlobalParams({
      commissionPct: args.commissionPct,
      maxAmount: args.maxAmount,
      validityDays: args.validityDays,
      coefficients: args.coefficients,
      note: args.note ?? null,
      createdBy: session.user.id,
    });
    const diff = computeChangedFields(args.before, newRow);
    await writeAuditLog({
      actorId: session.user.id,
      action: 'global_params.update',
      targetType: 'global_params',
      targetId: newRow.id,
      // D-09-09b: ONLY this payload may include commission_pct (in `before`/`after`).
      payload: diff,
    });
    return newRow;
  } catch (e) {
    console.error('[adminUpdateGlobalParams] failed:', e);   // PITFALLS §9.4
    throw new Error('admin.coefficients.error.save');
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  adminDisableUser (ADMIN-06 + D-09-09)                                      */
/* ─────────────────────────────────────────────────────────────────────────── */

export async function adminDisableUser(
  userId: string,
  opts?: { note?: string },
): Promise<void> {
  const { session } = await requireAdmin();
  try {
    await disableUser(userId);
    await writeAuditLog({
      actorId: session.user.id,
      action: 'user.disable',
      targetType: 'user',
      targetId: null,            // audit_log.target_id is uuid; users.id is text → store null + use payload.userId
      payload: { userId, note: opts?.note ?? null },
      // D-09-09b: ADMIN-09 redaction — this payload intentionally excludes financial rate fields.
    });
  } catch (e) {
    console.error('[adminDisableUser] failed:', e);
    throw new Error('admin.accounts.error.disable');
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  adminReEnableUser (ADMIN-06 + D-09-09)                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

export async function adminReEnableUser(userId: string): Promise<void> {
  const { session } = await requireAdmin();
  try {
    await reEnableUser(userId);
    await writeAuditLog({
      actorId: session.user.id,
      action: 'user.re_enable',
      targetType: 'user',
      targetId: null,
      payload: { userId },
      // D-09-09b: ADMIN-09 redaction — this payload intentionally excludes financial rate fields.
    });
  } catch (e) {
    console.error('[adminReEnableUser] failed:', e);
    throw new Error('admin.accounts.error.enable');
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  adminCreateInvitation (ADMIN-05 + D-09-09 + D-09-12)                       */
/* ─────────────────────────────────────────────────────────────────────────── */

export interface AdminCreateInvitationArgs {
  email: string;
  displayName: string;
  language: 'fr' | 'en';
}

export interface AdminCreateInvitationResult extends InviteResult {
  userId: string;
}

/**
 * D-09-12 / CONTEXT implicit "adminCreateInvitation invariant":
 * Phase 6's createInvitation already throws "User already active — use reset password instead"
 * for active duplicate emails. We catch and re-throw a structured error key so the modal
 * can render `admin.accounts.modal.error.email.exists`.
 */
export async function adminCreateInvitation(
  args: AdminCreateInvitationArgs,
): Promise<AdminCreateInvitationResult> {
  const { session } = await requireAdmin();
  try {
    const result = await createInvitation(args.email, args.displayName);

    // Look up the userId we just created/re-enabled to fix the language pref + write audit.
    const lowered = args.email.toLowerCase();
    const userRow = await db().query.users.findFirst({
      where: eq(schema.users.email, lowered),
      columns: { id: true },
    });
    if (!userRow) {
      throw new Error('admin.accounts.error.create');
    }

    // Set the partner's language preference (createInvitation does not set it).
    await db()
      .update(schema.users)
      .set({ language: args.language })
      .where(eq(schema.users.id, userRow.id));

    // Two audit writes — both required by ADMIN-08:
    //   1. user.create (the partner row exists / was re-enabled)
    //   2. invitation.create (the one-time URL was issued)
    await writeAuditLog({
      actorId: session.user.id,
      action: 'user.create',
      targetType: 'user',
      targetId: null,
      payload: { userId: userRow.id, email: lowered, displayName: args.displayName, language: args.language },
      // D-09-09b: ADMIN-09 redaction — this payload intentionally excludes financial rate fields.
    });
    await writeAuditLog({
      actorId: session.user.id,
      action: 'invitation.create',
      targetType: 'user',
      targetId: null,
      payload: { userId: userRow.id, email: lowered },
      // D-09-09b: ADMIN-09 redaction — this payload intentionally excludes financial rate fields.
    });
    return { ...result, userId: userRow.id };
  } catch (e) {
    console.error('[adminCreateInvitation] failed:', e);
    // Detect Phase 6's "already active" message and bubble a stable key.
    if (e instanceof Error && e.message.includes('already active')) {
      throw new Error('admin.accounts.modal.error.email.exists');
    }
    // Re-throw already-structured error keys without double-wrapping.
    if (e instanceof Error && e.message.startsWith('admin.')) {
      throw e;
    }
    throw new Error('admin.accounts.error.create');
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  adminCreatePasswordReset (ADMIN-06 follow-up + D-09-09)                    */
/* ─────────────────────────────────────────────────────────────────────────── */

export async function adminCreatePasswordReset(userId: string): Promise<ResetResult> {
  const { session } = await requireAdmin();
  try {
    const result = await createPasswordReset(userId);
    await writeAuditLog({
      actorId: session.user.id,
      action: 'password_reset.create',
      targetType: 'user',
      targetId: null,
      payload: { userId },
      // D-09-09b: ADMIN-09 redaction — this payload intentionally excludes financial rate fields.
    });
    return result;
  } catch (e) {
    console.error('[adminCreatePasswordReset] failed:', e);
    throw new Error('admin.accounts.error.reset');
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  adminReissueInvitation (D-09-11b)                                           */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * D-09-11(b) helper — re-issue invitation = createInvitation again for the
 * same email. Phase 6's createInvitation already invalidates prior tokens
 * (D-11) and re-uses the existing user row when deletedAt IS NOT NULL.
 *
 * LIMITATION (v1.1): The re-issue button is shown only when `hasUnredeemedInvite`
 * is true (i.e., the partner has an unexpired invite token but hasn't redeemed it).
 * In that state, the user row has deletedAt IS NULL (Phase 6 re-enables on re-invite)
 * but `accounts.password` is still null (no redemption yet). Phase 6's createInvitation
 * will throw "already active" for a user with deletedAt IS NULL — so adminReissueInvitation
 * bypasses adminCreateInvitation's error re-throw and calls Phase 6 directly with the
 * session from requireAdmin().
 *
 * Workaround: temporarily disable the user (set deletedAt) so Phase 6's createInvitation
 * takes the re-enable path, then the re-invite proceeds normally. This is acceptable for
 * v1.1 because the re-issue button only appears when the partner hasn't logged in yet.
 * A cleaner Phase 6 primitive (e.g., `reissueInvitation`) is a Plan 03 follow-up task.
 */
export async function adminReissueInvitation(
  args: AdminCreateInvitationArgs,
): Promise<AdminCreateInvitationResult> {
  const { session } = await requireAdmin();
  try {
    // Temporarily mark the user as disabled so Phase 6's createInvitation can
    // take the "re-enable + re-invite" branch (the user hasn't redeemed yet,
    // so their password is still null and this is semantically a re-invitation).
    const lowered = args.email.toLowerCase();
    const userRow = await db().query.users.findFirst({
      where: eq(schema.users.email, lowered),
      columns: { id: true, deletedAt: true },
    });

    if (!userRow) {
      throw new Error('admin.accounts.error.create');
    }

    // Only temporarily disable if currently active (deletedAt IS NULL) —
    // Phase 6 createInvitation takes the re-enable path when deletedAt IS NOT NULL.
    const wasActive = userRow.deletedAt === null;
    if (wasActive) {
      await db()
        .update(schema.users)
        .set({ deletedAt: new Date() })
        .where(eq(schema.users.id, userRow.id));
    }

    let result: InviteResult;
    try {
      result = await createInvitation(args.email, args.displayName);
    } catch (e) {
      // Restore active state if something went wrong after our temporary disable.
      if (wasActive) {
        await db()
          .update(schema.users)
          .set({ deletedAt: null })
          .where(eq(schema.users.id, userRow.id));
      }
      throw e;
    }

    // Set language preference after re-invite.
    await db()
      .update(schema.users)
      .set({ language: args.language })
      .where(eq(schema.users.id, userRow.id));

    // Write invitation.create audit (no user.create — partner already exists).
    await writeAuditLog({
      actorId: session.user.id,
      action: 'invitation.create',
      targetType: 'user',
      targetId: null,
      payload: { userId: userRow.id, email: lowered, reissued: true },
      // D-09-09b: ADMIN-09 redaction — this payload intentionally excludes financial rate fields.
    });

    return { ...result, userId: userRow.id };
  } catch (e) {
    console.error('[adminReissueInvitation] failed:', e);
    if (e instanceof Error && e.message.startsWith('admin.')) {
      throw e;
    }
    throw new Error('admin.accounts.toast.reissue.error');
  }
}
