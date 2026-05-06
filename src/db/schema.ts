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
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const schemaMeta = pgTable('schema_meta', {
  id: serial('id').primaryKey(),
  label: text('label').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type SchemaMetaRow = typeof schemaMeta.$inferSelect;
export type NewSchemaMetaRow = typeof schemaMeta.$inferInsert;
