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
import { getCurrentLang } from '@/lib/i18n';
import {
  createPartnerFormSchema,
  partnerCompanyTelephoneSchema,
  type CreatePartnerFormValues,
} from './schemas';

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
    // CR-03 / ADMIN-09 §9.4: do NOT log `e` directly — DB errors (postgres.js / Drizzle)
    // may embed commission_pct in the query-parameter dump. Log message only.
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[adminUpdateGlobalParams] failed:', msg);
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

/**
 * Phase 30 Plan 03 (ROLE-01/02) — derive the CRM access role from a
 * partnerType classification. Returns 'sales' ONLY for 'Commercial'; every
 * other partnerType stays 'partner'. This function must NEVER return
 * 'admin' — T-30-03-02 elevation-of-privilege mitigation. It runs
 * server-side, inside requireAdmin()-gated code, and never accepts a
 * client-supplied role field.
 */
function roleForPartnerType(partnerType: 'Agent' | 'Commercial' | 'Partenaire'): 'partner' | 'sales' {
  return partnerType === 'Commercial' ? 'sales' : 'partner';
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  adminUpdatePartnerType (PTYPE-03 + D-02 + D-08 + ADMIN-09)                 */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * PTYPE-03 — admin-only partner-type change, audited before/after as specific
 * type strings (D-02). No-op changes are skipped — only real changes write
 * an audit_log entry.
 *
 * Security (T-22-03-E): requireAdmin() is the FIRST statement — a partner
 * cannot self-escalate their type to Agent/Commercial via this action, because
 * it is gated before any DB read or write.
 *
 * ADMIN-09: partner_type is a business-classification enum, NOT a commission/
 * rate value. The audit payload records type strings only; no financial fields.
 */
export async function adminUpdatePartnerType(
  userId: string,
  newType: 'Agent' | 'Commercial' | 'Partenaire',
): Promise<void> {
  // T-22-03-E: admin gate FIRST — PITFALLS §7.3 privilege-escalation mitigation.
  const { session } = await requireAdmin();
  try {
    // Read current type + role to capture before-value for audit, the no-op
    // check, and the ROLE-03 admin-protection guard below.
    const userRow = await db().query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: { partnerType: true, role: true },
    });
    if (!userRow) {
      throw new Error('admin.partners.error.type_change');
    }
    const previousType = userRow.partnerType as 'Agent' | 'Commercial' | 'Partenaire';

    // D-02 no-op guard: skip write + audit when the type is unchanged.
    if (previousType === newType) return;

    // Phase 30 Plan 03 (ROLE-01/02) — partnerType -> role is a single
    // invariant that must move together. T-30-03-03: never write a derived
    // role for a row whose current role is 'admin' — re-typing an admin
    // must never demote them.
    const roleUpdate =
      userRow.role !== 'admin' ? { role: roleForPartnerType(newType) } : {};

    await db()
      .update(schema.users)
      .set({ partnerType: newType, ...roleUpdate })
      .where(eq(schema.users.id, userId));

    // D-09-09b: ADMIN-09 redaction — partner_type is a business-classification
    // field, NOT a commission/rate value. The before/after record the specific
    // type string (D-02), never a boolean.
    await writeAuditLog({
      actorId: session.user.id,
      action: 'user.partner_type_change',
      targetType: 'user',
      targetId: null,
      payload: { userId, before: previousType, after: newType },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[adminUpdatePartnerType] failed:', msg);
    // Re-throw already-structured error keys without double-wrapping.
    if (e instanceof Error && e.message.startsWith('admin.')) {
      throw e;
    }
    throw new Error('admin.partners.error.type_change');
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  adminUpdatePartnerCompanyTelephone (FIELD-02 follow-up)                    */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Set or clear an EXISTING partner's company telephone
 * (`users.company_telephone`).
 *
 * WHY THIS EXISTS: Phase 42 added the column with a write path only inside
 * `adminCreateInvitation` (see `args.phone` below). Any partner invited before
 * the column existed — or invited with the phone box left blank — therefore
 * rendered an em dash for the "Téléphone" row of every PDF proposal forever,
 * with no remedy available to the admin OR the partner (their own
 * `/parametres` shows this column read-only; their editable field is
 * `telephone`, a different column the PDF deliberately never renders).
 * `src/db/schema.ts` already documented a "create/edit partner form"; this is
 * the missing edit half.
 *
 * SCOPE: this touches `companyTelephone` ONLY. It must never write
 * `telephone` — that is the partner's own line and the single field PROF-02's
 * finalization gate reads (D-17). The two are easy to confuse because
 * `adminCreateInvitation` maps its legacy `args.phone` to `companyTelephone`
 * and `args.telephone` to `telephone`.
 *
 * `rawPhone` empty (or whitespace-only) is a deliberate CLEAR → NULL.
 *
 * ADMIN-09: a telephone is contact data, not a commission/rate value, so the
 * before/after audit payload carries the specific values exactly as
 * `adminUpdatePartnerType` records type strings.
 */
export async function adminUpdatePartnerCompanyTelephone(
  userId: string,
  rawPhone: string | null,
): Promise<void> {
  // T-22-03-E: admin gate FIRST — PITFALLS §7.3 privilege-escalation mitigation.
  const { session } = await requireAdmin();
  try {
    // Trim before validating so " " is treated as a clear, not as invalid input.
    const trimmed = (rawPhone ?? '').trim();
    const parsed = partnerCompanyTelephoneSchema.safeParse(trimmed);
    if (!parsed.success) {
      throw new Error('error.field.phone.invalid');
    }
    // Empty string is the clear signal; the column is nullable by design.
    const nextPhone: string | null = parsed.data === '' ? null : parsed.data;

    // Read the before-value for the audit trail and to prove the row exists.
    const userRow = await db().query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: { companyTelephone: true, role: true },
    });
    if (!userRow) {
      throw new Error('admin.partners.error.phone_change');
    }
    // ROLE-03-adjacent guard: this action is for partner-side accounts. An
    // admin row has no company line to render on a proposal, and allowing it
    // here would widen the action's blast radius for no product reason.
    if (userRow.role === 'admin') {
      throw new Error('admin.partners.error.phone_change');
    }
    const previousPhone = userRow.companyTelephone ?? null;

    // No-op guard, mirroring adminUpdatePartnerType's D-02 behaviour: skip
    // both the write and the audit row when nothing actually changes.
    if (previousPhone === nextPhone) return;

    await db()
      .update(schema.users)
      .set({ companyTelephone: nextPhone })
      .where(eq(schema.users.id, userId));

    await writeAuditLog({
      actorId: session.user.id,
      action: 'user.company_telephone_change',
      targetType: 'user',
      targetId: null,
      payload: { userId, before: previousPhone, after: nextPhone },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[adminUpdatePartnerCompanyTelephone] failed:', msg);
    // Re-throw already-structured error keys without double-wrapping.
    if (
      e instanceof Error &&
      (e.message.startsWith('admin.') || e.message.startsWith('error.'))
    ) {
      throw e;
    }
    throw new Error('admin.partners.error.phone_change');
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  adminCreateInvitation (ADMIN-05 + D-09-09 + D-09-12)                       */
/* ─────────────────────────────────────────────────────────────────────────── */

export interface AdminCreateInvitationArgs {
  // Existing (still required for backward-compat with CreatePartnerModal — D-10).
  email: string;
  displayName: string;
  language: 'fr' | 'en';
  // Phase 14 extension (UI-SPEC §5.1) — OPTIONAL so the modal call site keeps working.
  // Persisted into the audit_log payload under a `profile` sub-key (empty values dropped).
  // ADMIN-09 (D-09-09b) preserved: none of these are commission/rate fields.
  firstName?: string;
  lastName?: string;
  companyName?: string;
  siret?: string;
  // Phase 42 Plan 05 (D-13): the partner COMPANY's telephone. Maps to
  // users.company_telephone. Kept named `phone` (not renamed) so the legacy
  // CreatePartnerModal call site (D-10 shelf code) keeps compiling — this
  // comment is what prevents the two telephone args from being confused.
  phone?: string;
  invitationMessage?: string;
  // Phase 42 Plan 05 (D-19): the partner's OWN telephone. Maps to
  // users.telephone, the single field PROF-02's finalization gate reads.
  telephone?: string;
  // Phase 22 Plan 03 — PTYPE-01: partner_type persisted at invitation time.
  // ADMIN-09: this is a business-classification field, NOT a commission/rate value.
  partnerType?: 'Agent' | 'Commercial' | 'Partenaire';
}

export interface AdminCreateInvitationResult extends InviteResult {
  userId: string;
}

/**
 * Build the Phase 14 `profile` sub-key for audit_log payloads — empty
 * strings + undefined are dropped (decision: empty = "not provided").
 */
function buildProfilePayload(
  args: AdminCreateInvitationArgs,
): Record<string, string> {
  const profile: Record<string, string> = {};
  const fields: Array<keyof AdminCreateInvitationArgs> = [
    'firstName',
    'lastName',
    'companyName',
    'siret',
    'phone',
    'telephone',
    'invitationMessage',
  ];
  for (const f of fields) {
    const v = args[f];
    if (typeof v === 'string' && v.length > 0) {
      profile[f] = v;
    }
  }
  return profile;
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
    // Phase 30 Plan 03 — role is also read here so the partnerType -> role
    // derivation below can apply the ROLE-03 admin-protection guard.
    const lowered = args.email.toLowerCase();
    const userRow = await db().query.users.findFirst({
      where: eq(schema.users.email, lowered),
      columns: { id: true, role: true },
    });
    if (!userRow) {
      throw new Error('admin.accounts.error.create');
    }

    // Phase 30 Plan 03 (ROLE-01/02): derive role from partnerType. Only
    // written when partnerType was actually submitted AND the existing role
    // is not 'admin' — T-30-03-03: re-inviting an admin must never demote
    // them. This is the single source of the 'sales' value; createInvitation
    // (src/lib/auth/actions.ts) always inserts new rows as 'partner'.
    const roleUpdate =
      args.partnerType && userRow.role !== 'admin'
        ? { role: roleForPartnerType(args.partnerType) }
        : {};

    // Set the partner's language preference and partner_type (createInvitation does not set them).
    // PTYPE-01: partnerType is persisted here exactly as language is — via UPDATE users SET.
    // ADMIN-09: partner_type is a business-classification field, NOT a commission/rate value.
    //
    // Phase 42 Plan 05 (D-13/D-19, RESEARCH Pitfall 4): the two telephone args
    // now ALSO reach real, queryable users columns via this same UPDATE — not
    // a second .update() call, which would turn one write into two and break
    // the single-UPDATE assertion the tests make. Before this change, `phone`
    // was captured by the form and written only into audit_log.payload.profile
    // (buildProfilePayload below) — a write-only compliance trail that is
    // never read back, so the field looked persisted while
    // session.user.companyTelephone stayed null forever. Both spreads use the
    // same conditional-spread idiom as `partnerType` above so an absent value
    // never clobbers an existing column. `args.phone` (kept under its legacy
    // arg name per the AdminCreateInvitationArgs comment) maps to
    // companyTelephone; `args.telephone` maps to telephone.
    await db()
      .update(schema.users)
      .set({
        language: args.language,
        ...(args.partnerType ? { partnerType: args.partnerType } : {}),
        ...(args.phone ? { companyTelephone: args.phone } : {}),
        ...(args.telephone ? { telephone: args.telephone } : {}),
        ...roleUpdate,
      })
      .where(eq(schema.users.id, userRow.id));

    // Phase 14: persist the /partners/new extended fields under a `profile`
    // sub-key (UI-SPEC §5.1). Empty values are dropped (decision: empty =
    // "not provided"). When the legacy 3-field call site (CreatePartnerModal,
    // D-10 shelf code) invokes this, `profile` is an empty {} and is
    // omitted from the payload below — preserving the legacy shape.
    const profile = buildProfilePayload(args);
    const profilePart = Object.keys(profile).length > 0 ? { profile } : {};

    // Two audit writes — both required by ADMIN-08:
    //   1. user.create (the partner row exists / was re-enabled)
    //   2. invitation.create (the one-time URL was issued)
    await writeAuditLog({
      actorId: session.user.id,
      action: 'user.create',
      targetType: 'user',
      targetId: null,
      payload: {
        userId: userRow.id,
        email: lowered,
        displayName: args.displayName,
        language: args.language,
        // Phase 30 Plan 03 — trace the derived role when one was written
        // (access classification, not a rate/commission value).
        ...('role' in roleUpdate ? { role: roleUpdate.role } : {}),
        ...profilePart,
      },
      // D-09-09b: ADMIN-09 redaction — this payload intentionally excludes financial rate fields.
      // Phase 14: the `profile` sub-key contains PII (name/company/phone/SIRET/message), NOT
      // commission/rate values; the redaction note still holds.
    });
    await writeAuditLog({
      actorId: session.user.id,
      action: 'invitation.create',
      targetType: 'user',
      targetId: null,
      payload: {
        userId: userRow.id,
        email: lowered,
        ...profilePart,
      },
      // D-09-09b: ADMIN-09 redaction — this payload intentionally excludes financial rate fields.
      // Phase 14: same PII-only `profile` sub-key as above; ADMIN-09 invariant preserved.
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
      // WR-01: audit the temporary disable so the audit trail is not misleading.
      await writeAuditLog({
        actorId: session.user.id,
        action: 'user.disable',
        targetType: 'user',
        targetId: null,
        payload: { userId: userRow.id, note: 'temporary-disable for re-issue workaround' },
        // D-09-09b: ADMIN-09 redaction — this payload intentionally excludes financial rate fields.
      });
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
        // WR-01: audit the restore so the trail is complete even on failure path.
        await writeAuditLog({
          actorId: session.user.id,
          action: 'user.re_enable',
          targetType: 'user',
          targetId: null,
          payload: { userId: userRow.id, note: 're-enabled by re-issue workaround (createInvitation failed)' },
          // D-09-09b: ADMIN-09 redaction — this payload intentionally excludes financial rate fields.
        });
      }
      throw e;
    }

    // Set language preference after re-invite.
    await db()
      .update(schema.users)
      .set({ language: args.language })
      .where(eq(schema.users.id, userRow.id));

    // WR-01: audit the re-enable that createInvitation performed implicitly.
    if (wasActive) {
      await writeAuditLog({
        actorId: session.user.id,
        action: 'user.re_enable',
        targetType: 'user',
        targetId: null,
        payload: { userId: userRow.id, note: 're-enabled by re-issue workaround' },
        // D-09-09b: ADMIN-09 redaction — this payload intentionally excludes financial rate fields.
      });
    }

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

/* ─────────────────────────────────────────────────────────────────────────── */
/*  createPartnerInvitationAction (Phase 14 — /partners/new route action)      */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Result shape for the /partners/new client form. The client renders an
 * <InviteUrlModal> on { ok: true } and a sonner toast on { ok: false }.
 * `kind: 'invite'` aligns with the RedeemKind ('invite' | 'reset') consumed
 * by InviteUrlModal (NOTE: the plan text said 'invitation'; the actual
 * InviteUrlModal contract uses 'invite' — Phase 9 primitive, unchanged).
 */
export type CreatePartnerInvitationResult =
  | { ok: true; url: string; kind: 'invite' }
  | { ok: false; error: string };

/**
 * Phase 14 server action wired to the /partners/new client form.
 *
 * 1. Server-side re-validation with `createPartnerFormSchema.parse(data)`
 *    (T-14-02-03: never trust the client RHF state).
 * 2. Composes `displayName = firstName + ' ' + lastName` (trimmed).
 * 3. Reads `lang` from the cookie (`getCurrentLang`) for the partner's
 *    language preference (mirrors the modal's `language` field, which the
 *    new form does not collect — UI-SPEC §5.1 omits the segmented control).
 * 4. Delegates to `adminCreateInvitation` (which performs requireAdmin,
 *    Phase 6 createInvitation, language preference write, and the two
 *    audit_log writes with the new `profile` sub-key).
 * 5. Returns a structured result; errors are caught and surfaced as
 *    { ok: false, error: <stable i18n key or generic> }.
 */
export async function createPartnerInvitationAction(
  data: CreatePartnerFormValues,
): Promise<CreatePartnerInvitationResult> {
  try {
    // Server-side re-validation (defence-in-depth against tampered client state).
    const parsed = createPartnerFormSchema.parse(data);

    const displayName = `${parsed.firstName} ${parsed.lastName}`.trim();
    const language = await getCurrentLang();

    const result = await adminCreateInvitation({
      email: parsed.email,
      displayName,
      language,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      companyName: parsed.companyName,
      siret: parsed.siret,
      phone: parsed.phone,
      // Phase 42 Plan 05 (D-19): the partner's own telephone, threaded
      // through to adminCreateInvitation alongside the existing companyName
      // telephone (`phone`) so both reach the single users UPDATE.
      telephone: parsed.telephone,
      invitationMessage: parsed.invitationMessage,
      // PTYPE-01: thread partnerType through to adminCreateInvitation so it is
      // persisted via UPDATE users SET partner_type = ... at invitation time.
      // ADMIN-09: business-classification field, NOT a commission/rate value.
      partnerType: parsed.partnerType,
    });

    return { ok: true, url: result.url, kind: 'invite' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'admin.accounts.error.create';
    console.error('[createPartnerInvitationAction] failed:', msg);
    return { ok: false, error: msg };
  }
}
