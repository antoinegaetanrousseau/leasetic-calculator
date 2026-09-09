/**
 * Phase 44 Plan 03 — the two-form dry-run report writer + reader (D-08, MIG-01).
 *
 * D-01 removed the rollback, so this artifact is load-bearing rather than
 * nice-to-have: it is what the operator actually reads before approving the
 * apply job, and it is the exact file plan 04's drift check downloads and
 * diffs itself against, so "the run I approved" and "the run that happened"
 * are the same run by construction (D-08).
 *
 * Pure filesystem module — no database, no storage adapter, no PDF renderer.
 * Mirrors `src/lib/reconcile/report.ts`'s two-form (`.md` + `.json`) shape
 * and its `reportVersion` rejection discipline, adapted to this phase's own
 * envelope type declared in `./types`.
 *
 * The report is uploaded as a GitHub Actions artifact and read by a human,
 * so `toReportRows` below is a closed, explicit allow-list projection: no
 * amount/loyer/coefficient/commission value, no `inputs`, no `computed`, no
 * `paramsSnapshot`, no blob key and no connection string may ever reach it —
 * the same disclosure rule `scripts/_db-branch-guard.ts` documents for guard
 * output.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BackfillCandidate, BackfillCounts, BackfillReportEnvelope, BackfillReportRow, RowOutcome } from './types';

/** Fixed report directory name — no future caller can write elsewhere by accident. */
export const BACKFILL_REPORT_DIR = '.backfill';

/**
 * The ONLY path a row may take into the report envelope. For every outcome,
 * emits exactly `proposalId`, `lcRef`, `language`, `status` (the proposal's
 * OWN lifecycle status, so the operator can see soft-deleted rows are in
 * scope per D-03), `blobKeyPresent` (a boolean derived from the candidate's
 * blob key — NEVER the key itself, since the key embeds a user id) and
 * `outcome`, plus `reason` / `detail` for failures. Deliberately absent, on
 * purpose: `inputs`, `computed`, a params snapshot, any amount / loyer /
 * coefficient / commission value, the blob key, the user id, and any
 * connection string.
 */
export function toReportRows(args: { candidates: BackfillCandidate[]; outcomes: RowOutcome[] }): BackfillReportRow[] {
  const { candidates, outcomes } = args;
  const candidatesById = new Map(candidates.map((c) => [c.id, c]));

  return outcomes.map((outcome): BackfillReportRow => {
    const candidate = candidatesById.get(outcome.proposalId);
    if (!candidate) {
      throw new Error(`toReportRows: outcome references a proposal id absent from candidates: ${outcome.proposalId}`);
    }

    const base = {
      proposalId: outcome.proposalId,
      lcRef: outcome.lcRef,
      language: candidate.language,
      status: candidate.status,
      blobKeyPresent: candidate.pdfBlobKey !== null,
    };

    if (outcome.status === 'failed') {
      return { ...base, outcome: 'failed', reason: outcome.reason, detail: outcome.detail };
    }

    // 'rendered' (dry-run success) and 'migrated' (apply success) both
    // surface as 'rendered' in the report — the report describes what would
    // be / was re-rendered, not which mode produced it.
    return { ...base, outcome: 'rendered' };
  });
}

function computeCounts(candidates: BackfillCandidate[], outcomes: RowOutcome[]): BackfillCounts {
  return {
    candidates: candidates.length,
    rendered: outcomes.filter((o) => o.status === 'rendered' || o.status === 'migrated').length,
    failed: outcomes.filter((o) => o.status === 'failed').length,
  };
}

/** Escapes a pipe character so an arbitrary `detail` string cannot break a Markdown table row. */
function mdEscape(value: string): string {
  return value.replace(/\|/g, '\\|');
}

/** Renders a Markdown table, always emitting its header — a header-plus-`_none_` row when `rows` is empty. */
function renderTable(headers: string[], rows: string[][]): string[] {
  const lines: string[] = [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`];
  if (rows.length === 0) {
    lines.push(`| ${['_none_', ...headers.slice(1).map(() => '')].join(' | ')} |`);
  } else {
    for (const row of rows) {
      lines.push(`| ${row.join(' | ')} |`);
    }
  }
  lines.push('');
  return lines;
}

function renderMarkdown(envelope: BackfillReportEnvelope): string {
  const { counts, rows } = envelope;
  const lines: string[] = [];

  lines.push('# Proposal PDF backfill — dry-run report', '');
  lines.push(
    `**Generated:** ${envelope.generatedAt}`,
    `**Database fingerprint:** ${envelope.databaseFingerprint}`,
    '',
    'This report contains no financial figure, no `params_snapshot`, no blob key and no connection string.',
    '',
  );

  lines.push('## Counts', '');
  lines.push(
    ...renderTable(
      ['Metric', 'Count'],
      [
        ['Candidates', String(counts.candidates)],
        ['Would re-render', String(counts.rendered)],
        ['Would fail to render', String(counts.failed)],
      ],
    ),
  );

  const wouldRender = rows.filter((r) => r.outcome === 'rendered');
  lines.push('## Would re-render', '');
  lines.push(
    ...renderTable(
      ['Proposal ID', 'LC ref', 'Language', 'Status', 'Blob present'],
      wouldRender.map((r) => [
        mdEscape(r.proposalId),
        r.lcRef ? mdEscape(r.lcRef) : '_none_',
        mdEscape(r.language),
        mdEscape(r.status),
        String(r.blobKeyPresent),
      ]),
    ),
  );

  const wouldFail = rows.filter((r) => r.outcome === 'failed');
  lines.push('## Would fail to render', '');
  lines.push(
    ...renderTable(
      ['Proposal ID', 'LC ref', 'Reason', 'Detail'],
      wouldFail.map((r) => [
        mdEscape(r.proposalId),
        r.lcRef ? mdEscape(r.lcRef) : '_none_',
        r.reason ? mdEscape(r.reason) : '_none_',
        r.detail ? mdEscape(r.detail) : '_none_',
      ]),
    ),
  );

  lines.push(
    '## What approving this run does',
    '',
    'Approving the apply job overwrites `proposals/{userId}/{proposalId}.pdf` for every proposal',
    'listed above in place. The store keeps no version history and no sidecar copy of the',
    'document being replaced was taken. Once the apply job runs, the retired layout will not',
    'exist anywhere, for any proposal in this run.',
    '',
  );

  return lines.join('\n');
}

export interface WriteBackfillReportResult {
  archivedJsonPath: string;
  archivedMdPath: string;
  latestJsonPath: string;
  latestMdPath: string;
}

/**
 * Writes the archived + latest copies of both report forms into
 * `rootDir/<the fixed backfill report directory>/`. Returns the four
 * absolute paths it wrote.
 *
 * `now` and `rootDir` are accepted as arguments rather than read from the
 * ambient clock / ambient working directory, so tests and the CLI caller can
 * both control them deterministically.
 */
export function writeBackfillReport(args: {
  candidates: BackfillCandidate[];
  outcomes: RowOutcome[];
  databaseFingerprint: string;
  now: Date;
  rootDir: string;
}): WriteBackfillReportResult {
  const { candidates, outcomes, databaseFingerprint, now, rootDir } = args;
  const dir = join(rootDir, BACKFILL_REPORT_DIR);
  mkdirSync(dir, { recursive: true });

  const envelope: BackfillReportEnvelope = {
    reportVersion: '1',
    generatedAt: now.toISOString(),
    databaseFingerprint,
    counts: computeCounts(candidates, outcomes),
    rows: toReportRows({ candidates, outcomes }),
  };

  const jsonText = JSON.stringify(envelope, null, 2);
  const mdText = renderMarkdown(envelope);

  // Colon/dot-free timestamp — safe as a filename fragment on every filesystem.
  const timestamp = envelope.generatedAt.replace(/[:.]/g, '-');

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
 * Reads `<rootDir>/<the fixed backfill report directory>/dry-run-latest.json` —
 * the exact file plan 04's drift check diffs itself against. Returns `null`
 * when the file is absent, or when its `reportVersion` is not the version
 * this module writes, rather than throwing: a report the apply job cannot
 * understand must read as "no report", which plan 04 turns into a refusal,
 * not a silent proceed.
 */
export function readLatestBackfillReport(rootDir: string): BackfillReportEnvelope | null {
  const latestJsonPath = join(rootDir, BACKFILL_REPORT_DIR, 'dry-run-latest.json');
  if (!existsSync(latestJsonPath)) {
    return null;
  }
  const raw = readFileSync(latestJsonPath, 'utf8');
  const parsed = JSON.parse(raw) as { reportVersion?: unknown };
  if (parsed.reportVersion !== '1') {
    return null;
  }
  return parsed as BackfillReportEnvelope;
}
