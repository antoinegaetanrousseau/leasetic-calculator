/**
 * Phase 31 Plan 04 — the two-form dry-run report (D-14).
 *
 * Runs inside a plain `tsx` CLI process (`scripts/reconcile-proposals.ts`), never
 * inside the Next.js server runtime — deliberately imports no server-boundary marker
 * module of any kind.
 *
 * A dry run must leave behind a document an operator can review at real row
 * counts (the Markdown form) AND a machine-readable form the real run can diff
 * itself against before writing anything (the JSON form, consumed by
 * `drift.ts` via `readLatestDryRunReport`). Every `ReconciliationPlan` field
 * must be represented in the Markdown, and every section renders even when
 * empty — an omitted section is indistinguishable from a section the writer
 * forgot, which would make the report unfalsifiable (D-02/D-07).
 *
 * The report never contains `params_snapshot`, commission data, or a raw
 * `DATABASE_URL` — only `ReconciliationPlan` fields and a caller-supplied
 * `databaseFingerprint` (a SHA-256 hex digest of hostname + database name
 * only, computed by the caller, never the full connection string).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReconciliationPlan, ReconciliationSourceId, SkippedRow } from './types';

/** Fixed report directory name — no future caller can write elsewhere by accident. */
export const REPORT_DIR = '.reconcile';

export interface DryRunReportCounts {
  companiesToCreate: number;
  companiesExisting: number;
  relationshipsToCreate: number;
  contactsToCreate: number;
  contactsToUpdate: number;
  proposalLinks: number;
  pairsFlagged: number;
  pairsSuppressed: number;
  skipped: number;
}

export interface DryRunReportEnvelope {
  reportVersion: '1';
  sourceId: ReconciliationSourceId;
  generatedAt: string;
  databaseFingerprint: string;
  counts: DryRunReportCounts;
  plan: ReconciliationPlan;
}

export interface WriteDryRunReportInput {
  plan: ReconciliationPlan;
  databaseFingerprint: string;
  now: Date;
  rootDir: string;
}

export interface WriteDryRunReportResult {
  archivedJsonPath: string;
  archivedMdPath: string;
  latestJsonPath: string;
  latestMdPath: string;
}

function computeCounts(plan: ReconciliationPlan): DryRunReportCounts {
  return {
    companiesToCreate: plan.companies.filter((c) => c.existingCompanyId === null).length,
    companiesExisting: plan.companies.filter((c) => c.existingCompanyId !== null).length,
    relationshipsToCreate: plan.relationships.filter((r) => r.existingRelationshipId === null).length,
    contactsToCreate: plan.contacts.filter((c) => c.existingContactId === null).length,
    contactsToUpdate: plan.contacts.filter((c) => c.existingContactId !== null).length,
    proposalLinks: plan.proposalLinks.length,
    pairsFlagged: plan.flaggedPairs.length,
    pairsSuppressed: plan.suppressedPairs.length,
    skipped: plan.skipped.length,
  };
}

/** Escapes a pipe character so arbitrary company/contact names cannot break a Markdown table row. */
function mdEscape(value: string): string {
  return value.replace(/\|/g, '\\|');
}

function renderSkippedSection(skipped: SkippedRow[]): string[] {
  const lines: string[] = [`## Skipped rows (${skipped.length})`, ''];
  if (skipped.length === 0) {
    lines.push('_None._', '');
    return lines;
  }
  const byReason = new Map<string, SkippedRow[]>();
  for (const row of skipped) {
    const list = byReason.get(row.reason) ?? [];
    list.push(row);
    byReason.set(row.reason, list);
  }
  // Sort reasons for deterministic output — never rely on Map insertion order.
  const reasons = Array.from(byReason.keys()).sort();
  for (const reason of reasons) {
    lines.push(`### ${reason}`, '', '| Source row id | Detail |', '| --- | --- |');
    for (const row of byReason.get(reason)!) {
      lines.push(`| ${mdEscape(row.sourceRowId)} | ${row.detail ? mdEscape(row.detail) : '_none_'} |`);
    }
    lines.push('');
  }
  return lines;
}

function renderMarkdown(envelope: DryRunReportEnvelope): string {
  const { plan, counts } = envelope;
  const lines: string[] = [];

  lines.push(`# Reconciliation dry-run report — ${envelope.sourceId} — ${envelope.generatedAt}`, '');

  lines.push(
    '## Counts',
    '',
    '| Metric | Count |',
    '| --- | --- |',
    `| Companies to create | ${counts.companiesToCreate} |`,
    `| Companies matched to existing records | ${counts.companiesExisting} |`,
    `| Relationships to create | ${counts.relationshipsToCreate} |`,
    `| Contacts to create | ${counts.contactsToCreate} |`,
    `| Contacts to update | ${counts.contactsToUpdate} |`,
    `| Proposal links | ${counts.proposalLinks} |`,
    `| Pairs flagged for review | ${counts.pairsFlagged} |`,
    `| Pairs suppressed by an existing decision | ${counts.pairsSuppressed} |`,
    `| Skipped rows | ${counts.skipped} |`,
    '',
  );

  const toCreateCompanies = plan.companies.filter((c) => c.existingCompanyId === null);
  lines.push(`## Companies to create (${toCreateCompanies.length})`, '');
  if (toCreateCompanies.length === 0) {
    lines.push('_None._', '');
  } else {
    lines.push('| Key | Canonical name | Normalized name | SIREN |', '| --- | --- | --- | --- |');
    for (const c of toCreateCompanies) {
      lines.push(`| ${mdEscape(c.key)} | ${mdEscape(c.canonicalName)} | ${mdEscape(c.nameNormalized)} | ${c.siren ?? '_none_'} |`);
    }
    lines.push('');
  }

  const existingCompanies = plan.companies.filter((c) => c.existingCompanyId !== null);
  lines.push(`## Companies matched to existing records (${existingCompanies.length})`, '');
  if (existingCompanies.length === 0) {
    lines.push('_None._', '');
  } else {
    lines.push('| Key | Canonical name | Existing company id |', '| --- | --- | --- |');
    for (const c of existingCompanies) {
      lines.push(`| ${mdEscape(c.key)} | ${mdEscape(c.canonicalName)} | ${c.existingCompanyId} |`);
    }
    lines.push('');
  }

  const toCreateRelationships = plan.relationships.filter((r) => r.existingRelationshipId === null);
  lines.push(`## Relationships to create (${toCreateRelationships.length})`, '');
  if (toCreateRelationships.length === 0) {
    lines.push('_None._', '');
  } else {
    lines.push('| Company key | Owner id | Source row ids |', '| --- | --- | --- |');
    for (const r of toCreateRelationships) {
      lines.push(`| ${mdEscape(r.companyKey)} | ${r.ownerId} | ${r.sourceRowIds.join(', ')} |`);
    }
    lines.push('');
  }

  const toCreateContacts = plan.contacts.filter((c) => c.existingContactId === null);
  lines.push(`## Contacts to create (${toCreateContacts.length})`, '');
  if (toCreateContacts.length === 0) {
    lines.push('_None._', '');
  } else {
    lines.push('| Relationship key | Name | Email | Phone |', '| --- | --- | --- | --- |');
    for (const c of toCreateContacts) {
      lines.push(`| ${mdEscape(c.relationshipKey)} | ${mdEscape(c.name)} | ${c.email ?? '_none_'} | ${c.phone ?? '_none_'} |`);
    }
    lines.push('');
  }

  const toUpdateContacts = plan.contacts.filter((c) => c.existingContactId !== null);
  lines.push(`## Contacts to update (${toUpdateContacts.length})`, '');
  if (toUpdateContacts.length === 0) {
    lines.push('_None._', '');
  } else {
    lines.push('| Relationship key | Name | Existing contact id |', '| --- | --- | --- |');
    for (const c of toUpdateContacts) {
      lines.push(`| ${mdEscape(c.relationshipKey)} | ${mdEscape(c.name)} | ${c.existingContactId} |`);
    }
    lines.push('');
  }

  lines.push(`## Pairs flagged for review (${plan.flaggedPairs.length})`, '');
  if (plan.flaggedPairs.length === 0) {
    lines.push('_None._', '');
  } else {
    lines.push('| Side A key | Side B key | Reason |', '| --- | --- | --- |');
    for (const p of plan.flaggedPairs) {
      lines.push(`| ${mdEscape(p.sideAKey)} | ${mdEscape(p.sideBKey)} | ${p.reason} |`);
    }
    lines.push('');
  }

  lines.push(`## Pairs suppressed by an existing decision (${plan.suppressedPairs.length})`, '');
  if (plan.suppressedPairs.length === 0) {
    lines.push('_None._', '');
  } else {
    lines.push('| Side A key | Side B key | Verdict |', '| --- | --- | --- |');
    for (const p of plan.suppressedPairs) {
      lines.push(`| ${mdEscape(p.sideAKey)} | ${mdEscape(p.sideBKey)} | ${p.verdict} |`);
    }
    lines.push('');
  }

  lines.push(...renderSkippedSection(plan.skipped));

  return lines.join('\n');
}

/**
 * Writes the archived + latest copies of both report forms into
 * `rootDir/.reconcile/`. Returns the four absolute paths it wrote.
 *
 * `now` and `rootDir` are accepted as arguments rather than read from the
 * ambient clock / ambient working directory, so tests can write to a temp
 * directory with a fixed clock.
 */
export function writeDryRunReport(input: WriteDryRunReportInput): WriteDryRunReportResult {
  const { plan, databaseFingerprint, now, rootDir } = input;
  const dir = join(rootDir, REPORT_DIR);
  mkdirSync(dir, { recursive: true });

  const envelope: DryRunReportEnvelope = {
    reportVersion: '1',
    sourceId: plan.sourceId,
    // Mirrors plan.generatedAt (not the file-write moment) so drift.ts's
    // ageMs = fresh.generatedAt - stored.generatedAt compares like with like.
    generatedAt: plan.generatedAt,
    databaseFingerprint,
    counts: computeCounts(plan),
    plan,
  };

  const jsonText = JSON.stringify(envelope, null, 2);
  const mdText = renderMarkdown(envelope);

  // Colon-free ISO-8601-basic timestamp — safe on every filesystem.
  const timestamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const archivedJsonPath = join(dir, `dry-run-${timestamp}.json`);
  const archivedMdPath = join(dir, `dry-run-${timestamp}.md`);
  const latestJsonPath = join(dir, 'dry-run-latest.json');
  const latestMdPath = join(dir, 'dry-run-latest.md');

  writeFileSync(archivedJsonPath, jsonText, 'utf8');
  writeFileSync(archivedMdPath, mdText, 'utf8');
  writeFileSync(latestJsonPath, jsonText, 'utf8');
  writeFileSync(latestMdPath, mdText, 'utf8');

  return { archivedJsonPath, archivedMdPath, latestJsonPath, latestMdPath };
}

/**
 * Reads `.reconcile/dry-run-latest.json` — the file a real run diffs itself
 * against (D-15). Returns `null` when absent or when its `reportVersion` is
 * not the version this module writes, rather than throwing, so a caller can
 * treat "no usable prior report" as one uniform case.
 */
export function readLatestDryRunReport(rootDir: string): DryRunReportEnvelope | null {
  const latestJsonPath = join(rootDir, REPORT_DIR, 'dry-run-latest.json');
  if (!existsSync(latestJsonPath)) {
    return null;
  }
  const raw = readFileSync(latestJsonPath, 'utf8');
  const parsed = JSON.parse(raw) as { reportVersion?: unknown };
  if (parsed.reportVersion !== '1') {
    return null;
  }
  return parsed as DryRunReportEnvelope;
}
