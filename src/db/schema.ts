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
  jsonb, numeric, uniqueIndex, index, date,
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
  // Partner company name. Captured on the admin "create partner" form
  // (src/lib/admin/schemas.ts) and gates proposal-wizard step 1 (advance is
  // blocked when null). Column added by migration 0005_partner_company_name
  // (nullable — existing rows may be null). Previously read via raw query
  // because it was missing from this typed schema; added here to close the drift.
  companyName: text('company_name'),
  // PTYPE-01: partner type dimension — Agent / Commercial / Partenaire.
  // DEFAULT 'Partenaire' ensures existing rows stay Partenaire on migration (PTYPE-02).
  partnerType: text('partner_type').notNull().default('Partenaire'),
}, (table) => [
  // ROLE-01: widened from ('partner', 'admin') to add 'sales' (Phase 30 CRM registry —
  // internal Commercial staff need role-gated access, see drizzle/0007_phase30_crm_registry.sql).
  check('users_role_check', sql`${table.role} IN ('partner', 'admin', 'sales')`),
  check('users_partner_type_check', sql`${table.partnerType} IN ('Agent', 'Commercial', 'Partenaire')`),
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
  // PTYPE-06: extended with partnerType + commissionApplied so future snapshots record them.
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
    partnerType: 'Agent' | 'Commercial' | 'Partenaire';
    commissionApplied: boolean;
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

  // CRM-05 (Phase 30): nullable link to the client relationship this proposal was made
  // for. Additive only — never touches inputs/paramsSnapshot/computed/schemaVersion, so
  // the immutable snapshot invariant (DATA-01..04) is untouched. clientRelationships is
  // declared later in this file; the callback form resolves the forward reference.
  clientRelationshipId: uuid('client_relationship_id')
    .references(() => clientRelationships.id, { onDelete: 'set null' }),

  // Phase 33 (PIPE-03, D-05/D-06/D-08): commercial outcome, orthogonal to
  // `status` above (lifecycle) — a proposal can be `active` AND `won`. Fresh
  // top-level columns only; never touches inputs/paramsSnapshot/computed/
  // schemaVersion (CRM-05 immutability, ARCHITECTURE §2.5 Option A).
  // Stored values: 'won' | 'lost' | NULL. 'unanswered' is derived at
  // query/render time — never stored (D-06, following Phase 12 D-07's
  // deriveDisplayStatus precedent for 'expired').
  outcome: text('outcome'),
  outcomeDate: timestamp('outcome_date', { withTimezone: true }),
  // Optional even when outcome is set — D-08's dialog labels it "Motif (facultatif)".
  outcomeReason: text('outcome_reason'),
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
  // CRM-06: "every proposal for this client" cursor query.
  index('proposals_client_relationship_id_created_at_idx')
    .on(table.clientRelationshipId, sql`${table.createdAt} DESC`),

  // Phase 33 (D-06): only 'won'/'lost' are ever stored — 'unanswered' is
  // derived, following the same derive-don't-store discipline the lifecycle
  // status column above already applies to 'expired'.
  check('proposals_outcome_check', sql`${table.outcome} IS NULL OR ${table.outcome} IN ('won','lost')`),
  // Phase 33 (PIPE-03): outcome set requires outcome_date set (same nullable-pair
  // completeness shape as company_pair_decisions_resolution_check below).
  // outcome_reason stays optional on the "set" branch per D-08.
  check(
    'proposals_outcome_completeness_check',
    sql`(${table.outcome} IS NULL AND ${table.outcomeDate} IS NULL AND ${table.outcomeReason} IS NULL) OR (${table.outcome} IS NOT NULL AND ${table.outcomeDate} IS NOT NULL)`,
  ),
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

// ── Phase 30 CRM registry tables ─────────────────────────────────────────────
// Company & Contact Registry (CRM-01..08, ROLE-01..03) per
// .planning/phases/30-company-contact-registry/30-01-PLAN.md.
//
// companies: a global fact, independent of any proposal or partner.
// clientRelationships: private per-owner binding of a company to a user — this
//   split is what makes the registry channel-conflict safe (CRM-02).
// contacts: hang off a relationship, never off a company (CRM-04) — a contact's
//   phone/email is the owning partner's asset, not a fact about the company.

/**
 * Global company registry (CRM-01). `nameNormalized` is a STORED generated
 * column driven by the versioned SQL function `leasetic_normalize_company_name`
 * (drizzle/0007_phase30_crm_registry.sql) — normalization rules live in the
 * migration, never in application code, so they can't drift.
 */
export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  nameNormalized: text('name_normalized')
    .notNull()
    .generatedAlwaysAs(sql`leasetic_normalize_company_name(name)`),
  siren: text('siren').unique(),
  // CRM-08 external-reference columns (unused this milestone; seams for IMPORT-02/07).
  contractToolCustomerId: text('contract_tool_customer_id'),
  syncedAt: timestamp('synced_at', { withTimezone: true }),
  hubspotCompanyId: text('hubspot_company_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  // Phase 31 (D-08) — provenance marker. NULL means "entered by a human". Lets a bad
  // bulk import be surgically undone (delete every row carrying its source value)
  // without touching human-entered data. See the Phase 31 block below for the
  // companyPairDecisions table this column feeds into.
  source: text('source'),
  // Phase 34 (FICHE-01/02, D-01 registry tier) — identity as the SIRENE registry
  // returned it. NOTHING but the recherche-entreprises lookup ever writes these
  // columns: D-02 makes that structural, so no partner-facing form and no action
  // in this phase accepts a registry column name from a caller. All nullable —
  // D-01 defers the bulk backfill, so an existing company simply reads as not yet
  // synced (registry_status = 'pending') until someone opens it and refreshes.
  // There is deliberately no NAF-label column (D-06): the API returns codes and
  // carries no `libelle` anywhere in its payload, so labels ship as small lookup
  // tables in code (headcount band, the 21 NAF sections) — never as a column.
  legalName: text('legal_name'),
  addressLine: text('address_line'),
  postalCode: text('postal_code'),
  city: text('city'),
  legalForm: text('legal_form'),
  nafCode: text('naf_code'),
  nafSection: text('naf_section'),
  headcountBand: text('headcount_band'),
  foundedOn: date('founded_on'),
  // D-11: `etat_administratif` — 'A' active, 'C' ceased. A partner should see
  // that a company has stopped trading before quoting it.
  registryState: text('registry_state'),
  registrySyncedAt: timestamp('registry_synced_at', { withTimezone: true }),
  // Phase 34 (FICHE-03, D-01 shared-display tier) — beside the existing `name`,
  // which stays the display name (D-13: no rename, no backfill). Any partner on
  // the company may edit these, and the edit is audit-logged precisely BECAUSE
  // every other partner on the company sees the result (D-03).
  website: text('website'),
  phone: text('phone'),
  // NOT NULL with a default so the migration backfills every existing company to
  // 'pending' — D-01's deferred-backfill position, stated as a column default
  // rather than a data migration.
  registryStatus: text('registry_status').notNull().default('pending'),
}, (table) => [
  check('companies_siren_check', sql`${table.siren} IS NULL OR ${table.siren} ~ '^[0-9]{9}$'`),
  index('companies_name_normalized_idx').on(table.nameNormalized),
  // Admin cursor list (CRM-03).
  index('companies_created_at_id_idx')
    .on(sql`${table.createdAt} DESC`, sql`${table.id} DESC`),
  uniqueIndex('companies_hubspot_company_id_uq')
    .on(table.hubspotCompanyId)
    .where(sql`${table.hubspotCompanyId} IS NOT NULL`),
  check('companies_source_check', sql`${table.source} IS NULL OR ${table.source} IN ('proposal_extraction','hubspot_import')`),
  // Phase 34 (FICHE-02, D-01): the four sync outcomes. NOT NULL, so no
  // "IS NULL OR" branch — every company has a sync status from the moment the
  // migration lands.
  check(
    'companies_registry_status_check',
    sql`${table.registryStatus} IN ('synced','pending','not_found','error')`,
  ),
  // Phase 34 (D-11): 'A' active, 'C' ceased. NULL until the company is synced.
  check(
    'companies_registry_state_check',
    sql`${table.registryState} IS NULL OR ${table.registryState} IN ('A','C')`,
  ),
]);

/**
 * Private per-owner binding of a company to a user (CRM-02). A partner or
 * sales user (ROLE-02) can hold at most one relationship per company —
 * enforced by the `(company_id, owner_id)` unique index, which is also what
 * makes the create-client action idempotent.
 */
export const clientRelationships = pgTable('client_relationships', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'restrict' }),
  // text, not uuid — users.id is Better Auth text.
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  // Phase 31 (D-08) — provenance marker, same contract as companies.source below.
  source: text('source'),
  // Phase 33 (PIPE-01/02, D-01/D-02/D-04): the pipeline stage. Fixed
  // seven-value vocabulary, TypeScript union + DB CHECK (src/lib/pipeline/stages.ts
  // is the single source of truth for the TS side). 'signe'/'debloque' are
  // system-owned — nothing in v1.6 writes them (D-04).
  stage: text('stage').notNull().default('prospect'),
  // Phase 34 (FICHE-04, D-01 private tier) — visible to the OWNING PARTNER ONLY.
  // These live here rather than on `companies` precisely because `companies` is a
  // shared row (CRM-01): two partners quoting the same SIREN see the same company
  // but must never see each other's lead source, notes or follow-up plans.
  //
  // `leadSource` is NOT the Phase 31 `source` column above. That one is the D-08
  // provenance marker ("NULL means entered by a human") whose whole purpose is to
  // let a bad bulk import be undone by deleting every row carrying its value;
  // widening its CHECK to admit partner-entered lead sources would fuse two
  // unrelated vocabularies into one column. See 34-01-PLAN.md <decision_record>.
  leadSource: text('lead_source'),
  description: text('description'),
  // withTimezone like `proposals.outcomeDate` (Phase 33): the dialog that writes
  // it is the same `<input type="date">` + `z.coerce.date()` pair as MarkWonDialog.
  nextActionAt: timestamp('next_action_at', { withTimezone: true }),
  nextActionNote: text('next_action_note'),
}, (table) => [
  uniqueIndex('client_relationships_company_id_owner_id_uq').on(table.companyId, table.ownerId),
  // CRM-07 cursor index — a partner's own client book.
  index('client_relationships_owner_id_created_at_id_idx')
    .on(table.ownerId, sql`${table.createdAt} DESC`, sql`${table.id} DESC`),
  // CRM-03 admin lookup — every relationship on a company.
  index('client_relationships_company_id_idx').on(table.companyId),
  check('client_relationships_source_check', sql`${table.source} IS NULL OR ${table.source} IN ('proposal_extraction','hubspot_import')`),
  // Phase 33 (D-01): the seven-value stage vocabulary, in vocabulary order.
  check(
    'client_relationships_stage_check',
    sql`${table.stage} IN ('prospect','qualifie','proposition_envoyee','negociation','perdu','signe','debloque')`,
  ),
  // Phase 33 (PIPE-04): the board query filters on owner_id and groups by stage.
  index('client_relationships_owner_id_stage_idx').on(table.ownerId, table.stage),
  // Phase 34 (FICHE-04, D-01): the five-value lead-source vocabulary. Distinct
  // from the Phase 31 provenance CHECK above, which is left exactly as it was.
  check(
    'client_relationships_lead_source_check',
    sql`${table.leadSource} IS NULL OR ${table.leadSource} IN ('recommandation','prospection','salon','site_web','autre')`,
  ),
  // Phase 34 (ACTV-04/05): the home page's "à relancer" query filters on
  // owner_id and orders by next_action_at.
  index('client_relationships_owner_id_next_action_at_idx').on(table.ownerId, table.nextActionAt),
]);

/**
 * A person at a client relationship (CRM-04) — never a company-level fact.
 * FKs to `client_relationships` only; there is deliberately no `company_id`
 * column, so a contact is structurally unreachable from the shared company
 * record (T-30-01-03).
 */
export const contacts = pgTable('contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientRelationshipId: uuid('client_relationship_id')
    .notNull()
    .references(() => clientRelationships.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  role: text('role'),
  phone: text('phone'),
  email: text('email'),
  // CRM-08 external-reference columns (unused this milestone).
  hubspotContactId: text('hubspot_contact_id'),
  syncedAt: timestamp('synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  // Phase 31 (D-08) — provenance marker, same contract as companies.source above.
  source: text('source'),
}, (table) => [
  index('contacts_client_relationship_id_created_at_idx')
    .on(table.clientRelationshipId, sql`${table.createdAt} DESC`),
  uniqueIndex('contacts_hubspot_contact_id_uq')
    .on(table.hubspotContactId)
    .where(sql`${table.hubspotContactId} IS NOT NULL`),
  check('contacts_source_check', sql`${table.source} IS NULL OR ${table.source} IN ('proposal_extraction','hubspot_import')`),
]);

/**
 * The relationship activity timeline (ACTV-01..03, D-14).
 *
 * Private tier, like the columns it hangs off: an event belongs to ONE
 * `client_relationships` row and cascades with it, so it is structurally
 * unreachable from the shared `companies` record (the same containment argument
 * as `contacts`, T-30-01-03). Nothing here is visible to another partner on the
 * same company.
 *
 * `actor_id` is NULLABLE BY DESIGN and NULL means "the system did it" (D-14).
 * It is `text`, never `uuid`, because `users.id` is Better Auth text — same as
 * `auditLog.actorId` and `coefficientHistory.changedByUserId` above.
 *
 * D-15 — SYSTEM EVENTS ARE WRITTEN BY THE ACTIONS THAT CAUSE THEM, NEVER BY A
 * DATABASE TRIGGER. A trigger cannot see the session, so an event it wrote would
 * carry no actor, and ACTV-02 requires attribution. The absence of a trigger for
 * this table is therefore deliberate, not an omission. (Same reasoning that put
 * the Phase 33 SIREN gate in an action rather than only in a trigger.)
 *
 * `kind` follows the Phase 33 D-02 contract — a TypeScript union plus a DB
 * CHECK, never a lookup table. The TS half is `RELATIONSHIP_EVENT_KINDS` in
 * `src/lib/relationship/kinds.ts`; both enumerate identical values in identical
 * order.
 */
export const relationshipEvents = pgTable('relationship_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientRelationshipId: uuid('client_relationship_id')
    .notNull()
    .references(() => clientRelationships.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(),
  // text, not uuid — users.id is Better Auth text. NULL = the system did it (D-14).
  actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
  // Separate from created_at: a note may be backdated by its composer, while
  // created_at records when the row was actually written.
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  // The note text. NULL for system events, which render from `kind` + `payload`.
  body: text('body'),
  payload: jsonb('payload').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // D-14's six-value vocabulary, in vocabulary order.
  check(
    'relationship_events_kind_check',
    sql`${table.kind} IN ('note','stage_changed','proposal_finalized','outcome_set','registry_synced','next_action_set')`,
  ),
  // D-14's reverse-chronological read — the same composite DESC shape as
  // contacts_client_relationship_id_created_at_idx. 58 chars, under PostgreSQL's
  // 63-character identifier limit.
  index('relationship_events_relationship_id_occurred_at_idx')
    .on(table.clientRelationshipId, sql`${table.occurredAt} DESC`),
]);

// ── Phase 31 reconciliation engine (IMPORT-01..06) ──────────────────────────
// Provenance (D-08) is added directly on companies/clientRelationships/contacts
// above (the `source` column + its per-table CHECK). This block adds the other
// Phase 31 schema fact: the pair-decision table (D-09/D-10).
//
// D-10 refinement (recorded in 31-01-SUMMARY.md): the pair is NOT keyed on the
// literal normalized-name pair — two candidates that "match only on
// name_normalized" share the SAME name_normalized, which would degenerate to
// (x, x). The key is instead an unordered pair of per-side identity keys
// (`side_a_key` / `side_b_key`), each computable before any company row exists:
//   - `siren:<9 digits>` when the side carries a valid SIREN
//   - `owner:<ownerId>|name:<name_normalized>` otherwise
// `name_normalized` is still stored as its own column for D-10 lineage/readability.
export const companyPairDecisions = pgTable('company_pair_decisions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sideAKey: text('side_a_key').notNull(),
  sideBKey: text('side_b_key').notNull(),
  nameNormalized: text('name_normalized').notNull(),
  // 'differing' | 'one_missing' | 'both_missing' — maps 1:1 onto the UI-SPEC
  // reason strings admin.reconciliation.reason.differing/.oneMissing/.bothMissing.
  reason: text('reason').notNull(),
  // Nullable + ON DELETE SET NULL: D-12's merge deletes the loser company, and
  // the decision row must survive that deletion intact (not cascade-deleted).
  companyAId: uuid('company_a_id').references(() => companies.id, { onDelete: 'set null' }),
  companyBId: uuid('company_b_id').references(() => companies.id, { onDelete: 'set null' }),
  // NULL = pending (the flagged-but-undecided state).
  verdict: text('verdict'),
  survivorCompanyId: uuid('survivor_company_id').references(() => companies.id, { onDelete: 'set null' }),
  decidedBy: text('decided_by').references(() => users.id, { onDelete: 'restrict' }),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  // FIFO ordering key the review queue reads (UI-SPEC §1: oldest-flagged-first).
  firstFlaggedAt: timestamp('first_flagged_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check('company_pair_decisions_reason_check', sql`${table.reason} IN ('differing','one_missing','both_missing')`),
  check('company_pair_decisions_verdict_check', sql`${table.verdict} IS NULL OR ${table.verdict} IN ('merged','kept_separate')`),
  // A half-written resolution (verdict set without decided_by/decided_at, or
  // vice versa) is structurally impossible.
  check(
    'company_pair_decisions_resolution_check',
    sql`(${table.verdict} IS NULL AND ${table.decidedBy} IS NULL AND ${table.decidedAt} IS NULL) OR (${table.verdict} IS NOT NULL AND ${table.decidedBy} IS NOT NULL AND ${table.decidedAt} IS NOT NULL)`,
  ),
  index('company_pair_decisions_pending_idx').on(table.firstFlaggedAt, table.id),
  // D-10 unordered-pair uniqueness (so (A,B) and (B,A) collide) cannot be
  // expressed as a Drizzle uniqueIndex — drizzle-kit cannot generate a
  // LEAST/GREATEST expression index from a schema definition. The unique
  // index `company_pair_decisions_pair_uq` is hand-written in
  // drizzle/0008_phase31_reconciliation.sql (Task 2).
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

// Type exports for Phase 30 CRM registry tables.
export type CompanyRow = typeof companies.$inferSelect;
export type NewCompanyRow = typeof companies.$inferInsert;
export type ClientRelationshipRow = typeof clientRelationships.$inferSelect;
export type NewClientRelationshipRow = typeof clientRelationships.$inferInsert;
export type ContactRow = typeof contacts.$inferSelect;
export type NewContactRow = typeof contacts.$inferInsert;

// Type exports for Phase 31 reconciliation engine tables.
export type CompanyPairDecisionRow = typeof companyPairDecisions.$inferSelect;
export type NewCompanyPairDecisionRow = typeof companyPairDecisions.$inferInsert;

// Type exports for Phase 34 fiche client.
export type RelationshipEventRow = typeof relationshipEvents.$inferSelect;
export type NewRelationshipEventRow = typeof relationshipEvents.$inferInsert;
