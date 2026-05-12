/**
 * Drizzle schema source of truth.
 *
 * Phase 5 establishes the migration pipeline; the actual application schema
 * (users, proposals, global_params, password_resets, audit_log) is added in
 * Phases 6, 8, 9 per ARCHITECTURE.md §2.4.
 *
 * The `schema_meta` table here is a marker that records when the schema was
 * bootstrapped. It serves two purposes:
 *   1. Generates a non-empty baseline migration so the GitHub Action pipeline
 *      (plan 05-06) and healthz round-trip (plan 05-07) have something to query.
 *   2. Provides a stable place to record the application's deployed schema_version
 *      separately from migration state (Drizzle uses its own __drizzle_migrations table
 *      internally; this table is for app-level versioning if needed later).
 *
 * IMPORTANT: NEVER drop or rename this table without a migration. Phase 5 healthz
 * SELECTs from it.
 */
import {
  pgTable, serial, text, integer, timestamp, uuid, check,
  jsonb, numeric, uniqueIndex, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const schemaMeta = pgTable('schema_meta', {
  id: serial('id').primaryKey(),
  label: text('label').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type SchemaMetaRow = typeof schemaMeta.$inferSelect;
export type NewSchemaMetaRow = typeof schemaMeta.$inferInsert;

// ── Better Auth core tables (per 06-RESEARCH.md §2) ─────────────────────────
// Better Auth requires `user`, `session`, `account`, `verification` tables.
// Drizzle adapter `usePlural: true` (configured in src/lib/auth/index.ts in Plan 06-03)
// maps user→users, session→sessions, account→accounts, verification→verifications.
// CRITICAL: `users.id` is text (Better Auth nanoid), NOT uuid. Do NOT add a
// `password_hash` column to `users` — Better Auth stores credentials in
// `accounts.password` (which the email+password provider populates with the
// argon2id hash).

export const users = pgTable('users', {
  // Better Auth core fields
  id: text('id').primaryKey(),
  name: text('name').notNull().default(''),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified').notNull().default(0),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  // Our additionalFields (registered via betterAuth user.additionalFields in Plan 06-03)
  role: text('role').notNull().default('partner'),
  displayName: text('display_name'),
  language: text('language').notNull().default('fr'),
  theme: text('theme').notNull().default('system'),
  sessionVersion: integer('session_version').notNull().default(1),
  createdBy: text('created_by'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
}, (table) => [
  check('users_role_check', sql`${table.role} IN ('partner', 'admin')`),
]);

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  idToken: text('id_token'),
  // argon2id hash of the user's password (Better Auth-managed; populated by
  // the email+password provider's hash function in Plan 06-03).
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── Phase 6 application table (NOT a Better Auth table) ─────────────────────
// Owns the invitation + password-reset token lifecycle (D-07/D-09/D-12).
// Tokens are 32 random bytes → URL-safe base64 in the URL; the DB stores
// sha256(plaintext) in token_hash. Single-use: used_at is set on redemption.

export const passwordResets = pgTable('password_resets', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
}, (table) => [
  check('password_resets_kind_check', sql`${table.kind} IN ('reset', 'invite')`),
]);

// Type exports (mirroring SchemaMetaRow pattern)
export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;
export type AccountRow = typeof accounts.$inferSelect;
export type NewAccountRow = typeof accounts.$inferInsert;
export type VerificationRow = typeof verifications.$inferSelect;
export type NewVerificationRow = typeof verifications.$inferInsert;
export type PasswordResetRow = typeof passwordResets.$inferSelect;
export type NewPasswordResetRow = typeof passwordResets.$inferInsert;

// ── Phase 8 application tables ───────────────────────────────────────────────
// Schema source-of-truth for the proposals + global_params + audit_log triple
// per ARCHITECTURE §2.4 + 08-CONTEXT D-A1..D3, D-B1..B3, D-C1..C3, D-D1..D3.

/**
 * Append-only history of admin-edited global financial parameters.
 *
 * DATA-05 — every admin save creates a new row; never UPDATE.
 * DATA-06 — at proposal-creation time, server reads the most recent row
 *           (ORDER BY effective_from DESC LIMIT 1) and inlines it as
 *           proposals.params_snapshot.
 *
 * Phase 8 only WRITES the seed row (Plan 08-04, DATA-12). Admin UI ships
 * in Phase 9 (ADMIN-01..04).
 */
export const globalParams = pgTable('global_params', {
  id: uuid('id').defaultRandom().primaryKey(),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull().defaultNow(),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  commissionPct: numeric('commission_pct', { precision: 7, scale: 4 }).notNull(),
  maxAmount: numeric('max_amount', { precision: 12, scale: 2 }).notNull(),
  validityDays: integer('validity_days').notNull(),
  coefficients: jsonb('coefficients').$type<{
    t1: { 36: string; 48: string; 60: string };
    t2: { 36: string; 48: string; 60: string };
    t3: { 36: string; 48: string; 60: string };
    t4: { 36: string; 48: string; 60: string };
  }>().notNull(),
  note: text('note'),
}, (table) => [
  // "current" lookup — server reads most-recent by effective_from desc.
  index('global_params_effective_from_idx').on(sql`${table.effectiveFrom} DESC`),
]);

/**
 * Persistent partner proposals (DATA-01..09).
 *
 * Snapshot pattern (ARCHITECTURE §2.5 Option A, locked):
 *   inputs / params_snapshot / computed / schema_version are all written
 *   at INSERT time and NEVER updated. PDF blob key + sha256 + size +
 *   generated_at are filled in by the same request after upload.
 *
 * Failure mode (D-B1 sync fail-loud): if PDF render or upload fails after
 * the row is INSERTed, the server sets deleted_at on this row + writes an
 * audit_log entry, then returns HTTP 500. Partner retries with the same
 * idempotency_key — D-B2 lookup returns the existing (now-tombstoned) row
 * is forbidden by the partial unique index on idempotency_key WHERE
 * deleted_at IS NULL (so the retry creates a fresh row).
 *
 * Soft-delete (D-C3): deleted_at = now() hides from default list; restored
 * via UPDATE ... SET deleted_at = NULL. Hard purge (manual CLI in Phase 8 +
 * scheduled cron in Phase 10) deletes the row + blob after 30 days.
 */
export const proposals = pgTable('proposals', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),

  // D-01 (12-CONTEXT): lifecycle status. Stored values: 'draft' | 'active' | 'deleted'.
  // 'expired' is derived at query/render time — never stored (D-07).
  // DEFAULT 'active' aligns existing Phase 8 rows on migration (D-09).
  status: text('status').notNull().default('active'),

  // D-A2: language committed at gen time, immutable.
  language: text('language').notNull(),

  // Display reference (PROP-24 via Phase 7 generateLcRef). UNIQUE per user.
  // D-03 (12-CONTEXT): nullable — drafts do not have an lc_ref until finalization.
  lcRef: text('lc_ref'),

  // D-B2: client-generated UUIDv4. UNIQUE per user — unique index below.
  // D-03 (12-CONTEXT): nullable — drafts do not have an idempotency_key until finalization.
  idempotencyKey: text('idempotency_key'),

  // DATA-04 (D-D3): semver, default '1.0.0', CHECK ^\d+\.\d+\.\d+$.
  schemaVersion: text('schema_version').notNull().default('1.0.0'),

  // DATA-02/01/03: jsonb snapshot triple — written once on finalization, read forever.
  // inputs stays NOT NULL — drafts INSERT with inputs = '{}' then accumulate (D-03).
  inputs: jsonb('inputs').$type<Record<string, unknown>>().notNull(),
  // D-03 (12-CONTEXT): paramsSnapshot nullable — NULL for drafts; written once by finalizeDraft().
  paramsSnapshot: jsonb('params_snapshot').$type<{
    commissionPct: string;
    maxAmount: string;
    validityDays: number;
    coefficients: {
      t1: { 36: string; 48: string; 60: string };
      t2: { 36: string; 48: string; 60: string };
      t3: { 36: string; 48: string; 60: string };
      t4: { 36: string; 48: string; 60: string };
    };
  }>(),
  // D-03 (12-CONTEXT): computed nullable — NULL for drafts; written once by finalizeDraft().
  computed: jsonb('computed').$type<Record<string, unknown>>(),

  // PDF artifact slots (filled after row INSERT — D-B1 step 7).
  pdfBlobKey: text('pdf_blob_key'),
  pdfSha256: text('pdf_sha256'),
  pdfSizeBytes: integer('pdf_size_bytes'),
  pdfGeneratedAt: timestamp('pdf_generated_at', { withTimezone: true }),

  // Soft-delete window (DATA-10) + duplicate audit (PROP-21 implicit).
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  duplicatedFromId: uuid('duplicated_from_id'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // D-A2: language whitelist enforced at the DB.
  check('proposals_language_check', sql`${table.language} IN ('fr', 'en')`),
  // D-D3: semver shape enforced at the DB.
  check('proposals_schema_version_check', sql`${table.schemaVersion} ~ '^[0-9]+\\.[0-9]+\\.[0-9]+$'`),
  // D-01 (12-CONTEXT): stored status whitelist — 3 values only; 'expired' is derived.
  check('proposals_status_check', sql`${table.status} IN ('draft','active','deleted')`),
  // D-04 (12-CONTEXT): finalized-row completeness — draft rows exempt; active/deleted must have all 4 fields.
  check('proposals_finalized_completeness_check', sql`${table.status} = 'draft' OR (${table.lcRef} IS NOT NULL AND ${table.idempotencyKey} IS NOT NULL AND ${table.paramsSnapshot} IS NOT NULL AND ${table.computed} IS NOT NULL)`),

  // D-B2: idempotency uniqueness (user_id, idempotency_key).
  // D-05 (12-CONTEXT): partial — drafts may have NULL idempotency_key and don't collide.
  uniqueIndex('proposals_user_id_idempotency_key_uq')
    .on(table.userId, table.idempotencyKey)
    .where(sql`${table.idempotencyKey} IS NOT NULL`),
  // Within-user LC ref stability.
  // D-05 (12-CONTEXT): partial — drafts may have NULL lc_ref and don't collide.
  uniqueIndex('proposals_user_id_lc_ref_uq')
    .on(table.userId, table.lcRef)
    .where(sql`${table.lcRef} IS NOT NULL`),

  // D-C1 cursor query: (user_id, created_at desc, id desc).
  index('proposals_user_id_created_at_id_idx')
    .on(table.userId, sql`${table.createdAt} DESC`, sql`${table.id} DESC`),
  // Partial index for the Recently Deleted view + purge job.
  index('proposals_deleted_at_idx')
    .on(table.deletedAt)
    .where(sql`${table.deletedAt} IS NOT NULL`),
]);

/**
 * Audit log (DATA-07).
 *
 * Phase 8 writes:
 *   - 'proposal.create'        (every successful save)
 *   - 'proposal.create_failed' (D-B1 fail-loud sets deleted_at AND writes here)
 *   - 'proposal.delete'        (soft-delete by partner)
 *   - 'proposal.restore'       (un-soft-delete)
 *   - 'proposal.purge'         (manual CLI hard-purge, Plan 08-13)
 *
 * Phase 9 adds:
 *   - 'global_params.update'  (admin coefficients save)
 *   - 'user.create' / 'user.disable' / 'user.re_enable'
 *   - 'role.grant' (CLI grant-admin already writes when run with --audit)
 *
 * Phase 9 ADMIN-07 reads from this table for the admin viewer; Phase 8
 * only writes.
 */
export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: uuid('target_id'),
  payload: jsonb('payload').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('audit_log_actor_id_created_at_idx')
    .on(table.actorId, sql`${table.createdAt} DESC`),
  index('audit_log_target_type_target_id_created_at_idx')
    .on(table.targetType, table.targetId, sql`${table.createdAt} DESC`),
]);

/**
 * Append-only coefficient change history (DB-03 per 12-CONTEXT.md D-12, D-13).
 *
 * Append-only at the DB layer via triggers `coefficient_history_no_update` and
 * `coefficient_history_no_delete` (defined in drizzle/0004_phase12_drafts_and_history.sql).
 * Any UPDATE or DELETE raises 'coefficient_history is append-only — UPDATE and DELETE forbidden'.
 *
 * Backfill from existing global_params rows is performed by
 * scripts/backfill-coefficient-history.ts (idempotent, see plan 12-06).
 */
export const coefficientHistory = pgTable('coefficient_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
  // Nullable FK: NULL if the acting user was deleted (ON DELETE SET NULL).
  changedByUserId: text('changed_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  // NULL for the seed-row first entry (no prior state to diff against).
  beforeJson: jsonb('before_json').$type<Record<string, unknown>>(),
  afterJson: jsonb('after_json').$type<Record<string, unknown>>().notNull(),
  // Human-readable French diff summary (auto-generated by generateDiffSummary or admin-provided).
  summary: text('summary').notNull(),
}, (table) => [
  // Newest-first reads for the History sidebar.
  index('coefficient_history_changed_at_idx').on(sql`${table.changedAt} DESC`),
]);

// Type exports for Phase 8 tables.
export type GlobalParamsRow = typeof globalParams.$inferSelect;
export type NewGlobalParamsRow = typeof globalParams.$inferInsert;
export type ProposalRow = typeof proposals.$inferSelect;
export type NewProposalRow = typeof proposals.$inferInsert;
export type AuditLogRow = typeof auditLog.$inferSelect;
export type NewAuditLogRow = typeof auditLog.$inferInsert;

// Type exports for Phase 12 tables.
export type CoefficientHistoryRow = typeof coefficientHistory.$inferSelect;
export type NewCoefficientHistoryRow = typeof coefficientHistory.$inferInsert;
