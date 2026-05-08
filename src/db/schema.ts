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
import { pgTable, serial, text, integer, timestamp, uuid, check } from 'drizzle-orm/pg-core';
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
