# Phase 44: Backfill Migration - Pattern Map

**Mapped:** 2026-09-09
**Files analyzed:** 6 (1 script, 1 package.json edit, 1 workflow, 1 query-file edit ×2, tests)
**Analogs found:** 6 / 6 (one is a composite: no single analog covers the two-job artifact-gated workflow)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `scripts/backfill-proposal-pdfs.ts` | utility (operator CLI) | batch / event-driven (per-row render+upload+persist) | `scripts/reconcile-proposals.ts` (gate/report/exit-code shape) + `scripts/purge-soft-deleted.ts` (per-row loop over proposals+blobs) | role-match, composite |
| `package.json` npm scripts (dry-run/apply pair) | config | request-response (CLI invocation) | `db:reconcile:dry-run` / `db:reconcile` pair | exact |
| `.github/workflows/backfill-proposal-pdfs.yml` (new) | config (CI/CD) | event-driven (`workflow_dispatch`) | `.github/workflows/db-migrate.yml` | role-match (needs a new element: artifact hand-off between jobs, no analog for that part) |
| `src/lib/db/queries/audit-log.ts` (`AuditAction` union edit) | model (type union) | CRUD (write) | same file, prior additions (Phase 34 `client_relationship.delete`, Phase 42 `admin.advisor.update`) | exact (self-analog) |
| `src/lib/db/queries/proposals.ts` (new `listBackfillCandidates`-style query) | model (query fn) | CRUD (read, bulk) | `listPurgeCandidates` (proposals.ts:497-505) for shape; `global-params.ts:106-124` for the `leftJoin`-against-marker technique | role-match |
| Tests for the script + query fn | test | request-response (unit) | `src/lib/db/queries/proposals.test.ts` (query fn mocking) — no `scripts/*.test.ts` precedent exists in this repo | role-match / no analog for script-level test |

## Pattern Assignments

### `scripts/backfill-proposal-pdfs.ts` (utility, batch)

**Primary analog:** `scripts/reconcile-proposals.ts` (132 lines, full file read)
**Secondary analog:** `scripts/purge-soft-deleted.ts` (125 lines, full file read)

**Header/docstring pattern** (reconcile-proposals.ts:1-33) — model the new script's own header on this: what it does, which two npm scripts invoke it, its flags, the migration-boundary disclaimer, and the exit-code table:
```typescript
import './_load-env';

/**
 * Phase 44 — ... [what it does, dry-run/apply, MIG-01..05 refs]
 *
 * Invoked by two npm scripts:
 *   npm run db:backfill:proposal-pdfs:dry-run   — plans + writes report, zero blobs/rows written
 *   npm run db:backfill:proposal-pdfs           — downloads/re-plans + applies with drift check
 *
 * Flags:
 *   --dry-run       run in dry-run mode (default: apply mode)
 *   --allow-drift   in apply mode, proceed even when the fresh plan differs from the
 *                    approved report instead of aborting (D-09)
 *
 * Exit codes:
 *   0  success
 *   1  crash (uncaught error)
 *   2  environment refusal (DATABASE_URL missing/malformed, storage env missing)
 *   3  guard refusal (apply mode aborted: no report / drift / unaccepted drift)
 */
import { createHash } from 'node:crypto';
import { resolveNeonTarget } from './_neon-target';
```

**Hostname-only credential-safe logging + Neon target gate** (reconcile-proposals.ts:44-81) — copy verbatim shape, substitute the script's own confirm-var name (this phase's confirmation is the GitHub Environment gate per D-08, so this block matters less for the human-typed-token part and more for the "never log the URL, only hostname" rule and the exit(2) on malformed/missing `DATABASE_URL`):
```typescript
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('[backfill-pdfs] FATAL: DATABASE_URL is not set');
  process.exit(2);
}
let url: URL;
try {
  url = new URL(databaseUrl);
} catch {
  console.error('[backfill-pdfs] FATAL: DATABASE_URL is malformed');
  process.exit(2);
}
const hostname = url.hostname; // bug_011 — .hostname, never .host (port-carrying)
const target = resolveNeonTarget(hostname);
```

**Dry-run → two-form report → apply-with-drift-check shape** (reconcile-proposals.ts:89-126) — the exact control flow to copy: lazy-import the DB and the domain logic *after* env validation, branch on `result.mode`, and on apply check `result.aborted` before treating the run as successful:
```typescript
const { db } = await import('../src/lib/db/index');
const { runBackfill } = await import('../src/lib/backfill/proposal-pdfs'); // new domain module, mirrors src/lib/reconcile

const result = await runBackfill({
  dbi: db(),
  mode,
  rootDir: process.cwd(),
  allowDrift,
  now: new Date(),
  log: (line) => console.log(line),
});

if (result.mode === 'dry-run') {
  console.log('[backfill-pdfs] Dry-run report paths:', result.reportPaths.latestMdPath, result.reportPaths.latestJsonPath);
  console.log('[backfill-pdfs] Counts:', JSON.stringify(result.counts));
  process.exit(0);
}

if (result.aborted) {
  console.error(`[backfill-pdfs] Refused to apply: ${result.reason}`);
  process.exit(3);
}
console.log('[backfill-pdfs] Applied:', JSON.stringify(result.applied));
process.exit(0);
```

**Typed-confirmation / environment-check preamble** (purge-soft-deleted.ts:53-73) — the banner + required-env-vars-present check to adapt (this phase needs `DATABASE_URL` **and** `STORAGE_DRIVER` + credentials, since it calls `storage()` per row):
```typescript
console.log('═══════════════════════════════════════════════════════════════');
console.log('  Phase 44 — Proposal PDF backfill migration (MIG-01..05)');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Mode: ${mode}`);
if (!process.env.DATABASE_URL) { console.error('ERROR: DATABASE_URL is not set.'); process.exit(2); }
if (!process.env.STORAGE_DRIVER) { console.error('ERROR: STORAGE_DRIVER is not set.'); process.exit(2); }
```

**Best-effort log-and-continue per-row loop, calling `storage()` per row** (purge-soft-deleted.ts:101-119) — this is the closest existing example of "iterate proposal rows, do a per-row storage op, collect `{ purged, errors }`-shaped results, print failures, exit non-zero if any failed" (D-10):
```typescript
const { purged, errors } = await purgeSoftDeleted({ actorId: null });
for (const e of errors) {
  console.error(`  [fail] id=${e.id}: ${e.error}`);
}
console.log(`  Done. ${purged} purged, ${errors.length} failed.`);
if (errors.length > 0) {
  console.log(`  Re-run to retry failed rows (they remain as candidates).`);
}
if (errors.length > 0) process.exit(1);
```
Adapt this shape for the backfill's per-row body: render → upload → persist → `writeAuditLog` (see finalize-wizard.ts excerpt below), catching per-row and continuing (D-10), with idempotence supplied by an audit-log left-join skip (D-06) rather than a `deleted_at` filter.

**The render → upload → persist sequence to reproduce (steps 3.5-5 only, D-05)** — `src/lib/api/proposals/finalize-wizard.ts:223-268` (targeted read):
```typescript
// D-16 step 3.5 (Phase 43 D-12/D-13) — read the single Leasetic advisor
// identity live, immediately before the render step.
// D-13: a null advisor is valid — do NOT add a bounded-error guard here.
const advisor = await getAdvisor();

// D-16 step 4 — render the PDF.
const pdfData: ProposalDocumentProps['data'] = {
  lcRef,
  language: args.language,
  createdAt: draft.createdAt,
  inputs: parsed,
  computed: buildPdfComputed(compute.computed),
  partner: { companyTelephone: args.companyTelephone },
  advisor: advisor
    ? { name: advisor.name, fonction: advisor.fonction, telephone: advisor.telephone, email: advisor.email }
    : null,
};
const { buffer, sha256, sizeBytes } = await renderProposalPdf({ data: pdfData });

// D-16 step 5 — upload the blob.
const pdfBlobKey = `proposals/${args.userId}/${args.draftId}.pdf`;
await storage().put(pdfBlobKey, buffer, { contentType: 'application/pdf' });
```
**Critical substitution per D-05/CONTEXT.md:** the backfill's `computed` prop is the row's own **stored `computed` jsonb, verbatim** — do NOT call `computeLoyer`/`getLatestGlobalParams` at all. Read `advisor` live via `getAdvisor()` (D-02: live-read fields change silently, by design — no delta detection). The blob key is `proposals/{userId}/{proposalId}.pdf`, reused as an in-place overwrite (D-01) because `VercelBlobStorage.put()` passes `addRandomSuffix: false` (see `src/lib/storage/vercel-blob.ts`, cited in CONTEXT.md D-01 — not re-read here, already quoted verbatim in CONTEXT.md).

**Imports for rendering outside Next.js server context** — `scripts/render-pdf-preview.ts:1-33` (full file read) is the cleanest existing example of a `tsx` script calling `renderProposalPdf` directly:
```typescript
import { renderProposalPdf } from '../src/lib/pdf';
```
Note its docstring warning (lines 12-16): a script that reads live rows (this backfill does) must be explicit that `.env.local` points at the production Neon branch — this is exactly why D-07 forces apply into the Action rather than a laptop.

**`sha256` is not stable — do not use it as the idempotence marker** — `src/lib/pdf/render.ts:14-23,39-51` (already read in full): the docstring documents that `@react-pdf/renderer`'s React Fiber scheduler reorders PDF objects per call, so `sha256` varies across renders of identical inputs; only `contentHash` is stable, and it is never persisted. The backfill still writes a fresh `pdfSha256`/`pdfSizeBytes`/`pdfGeneratedAt` per D-06's closing note, but must derive its skip/idempotence decision from the audit-log marker (D-06), never from comparing hashes.

**`tsx` entry-point shape + preload requirement** (shared across every `scripts/*.ts` that imports `src/lib/db/queries`) — `purge-soft-deleted.ts:1,26-29,30`:
```typescript
#!/usr/bin/env tsx
import './_load-env';
import { listPurgeCandidates } from '../src/lib/db/queries'; // server-only module
```
npm script wraps with the preload shim (see package.json excerpt below).

---

### `package.json` npm scripts (config)

**Analog:** the `db:reconcile:dry-run` / `db:reconcile` pair (package.json:28-36, `grep` read):
```json
"db:backfill:coefficient-history": "tsx -r ./scripts/_preload-mock-server-only.cjs scripts/backfill-coefficient-history.ts",
"db:backfill:partner-type": "tsx -r ./scripts/_preload-mock-server-only.cjs scripts/backfill-partner-type.ts",
"db:reconcile:dry-run": "tsx -r ./scripts/_preload-mock-server-only.cjs scripts/reconcile-proposals.ts --dry-run",
"db:reconcile": "tsx -r ./scripts/_preload-mock-server-only.cjs scripts/reconcile-proposals.ts",
```
Follow this exact naming convention, e.g. `db:backfill:proposal-pdfs:dry-run` / `db:backfill:proposal-pdfs`, both wrapped with `-r ./scripts/_preload-mock-server-only.cjs` (required because the script imports from `src/lib/db/queries`, which carries `server-only`).

---

### `.github/workflows/backfill-proposal-pdfs.yml` (new)

**Analog:** `.github/workflows/db-migrate.yml` (146 lines, full file read)

**`workflow_dispatch` + typed-confirmation + per-target Environment shape** (db-migrate.yml:25-41, 100-146):
```yaml
on:
  workflow_dispatch:
    inputs:
      confirm:
        description: 'Type "..." exactly to confirm.'
        required: false
        type: string

jobs:
  dry-run:
    name: Dry run — render every in-scope proposal, write zero blobs/rows
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
        with: { persist-credentials: false }
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - env:
          DATABASE_URL: ${{ secrets.DATABASE_URL_MAIN }}
        run: npm run db:backfill:proposal-pdfs:dry-run
      # NEW element, no analog in this repo: upload the report as an artifact
      # (standard actions/upload-artifact@v4) so job 2 downloads the EXACT
      # approved plan (D-08) rather than re-planning from scratch.

  apply:
    name: Apply — re-render and overwrite blobs
    needs: dry-run
    runs-on: ubuntu-24.04
    environment: production   # the required-reviewer gate IS D-08's confirmation
    steps:
      - uses: actions/checkout@v4
        with: { persist-credentials: false }
      # NEW element: actions/download-artifact@v4 to fetch job 1's report
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - env:
          DATABASE_URL: ${{ secrets.DATABASE_URL_MAIN }}
          STORAGE_DRIVER: ${{ secrets.STORAGE_DRIVER }}
          BLOB_READ_WRITE_TOKEN: ${{ secrets.BLOB_READ_WRITE_TOKEN }}
        run: npm run db:backfill:proposal-pdfs
```
Reuse db-migrate.yml's `permissions: { contents: read }`, the `env:`-only interpolation discipline (never direct shell interpolation of an input), and the concurrency-group pattern (db-migrate.yml:45-47) scoped to this workflow's own name so two dispatches can't race.

**No analog exists in this repo for artifact hand-off between jobs** — grep of both `.github/workflows/*.yml` files found zero `upload-artifact`/`download-artifact` usage anywhere in the repo. This is standard GitHub Actions (`actions/upload-artifact@v4` / `actions/download-artifact@v4`) but the planner should treat this specific mechanic as new, not copied.

---

### `src/lib/db/queries/audit-log.ts` (`AuditAction` union edit)

**Analog:** the file's own prior additions — full file read (120 lines). Follow the exact pattern of a dated section comment plus one new union member, e.g. Phase 42's addition (lines 75-79):
```typescript
  // ── Phase 42 Plan 06 — the single Leasetic advisor identity (PROF-03, D-07/D-08/D-09) ──
  // Payload carries only the changed field names and the actor — a contact-details
  // write, so no commission, rate or derived value can appear (ADMIN-09 holds by
  // construction: adminUpdateAdvisor never reads global_params).
  | 'admin.advisor.update';
```
Add, following the same style:
```typescript
  // ── Phase 44 — Backfill migration (MIG-01..05, D-06) ────────────────────────
  // Written once per successfully re-rendered proposal, by the apply-mode
  // backfill script only. Doubles as the idempotence marker: a re-run left-joins
  // against this action + targetId and skips rows already marked. Payload
  // carries no figures — ADMIN-09 holds because `computed` is copied verbatim,
  // never derived from a partner-visible parameter at backfill time.
  | 'proposal.pdf_backfill';
```
`AuditTargetType` already includes `'proposal'` (line 81) — no change needed there. `writeAuditLog(...)` itself (lines 110-120) needs no change; call it per-row exactly as documented in the file's own usage comment block (lines 91-108), with `actorId: null` (system-initiated CLI script, same convention as `'proposal.purge'`).

---

### `src/lib/db/queries/proposals.ts` (new query function, e.g. `listBackfillCandidates`)

**Analog for row-scope shape:** `listPurgeCandidates` (proposals.ts:496-505, targeted read):
```typescript
/** Plan 08-14 helper: list candidates to purge (deleted_at < 30d ago). */
export async function listPurgeCandidates(): Promise<ProposalRow[]> {
  const dbi = db();
  return dbi.select().from(schema.proposals)
    .where(and(
      isNotNull(schema.proposals.deletedAt),
      lt(schema.proposals.deletedAt, SOFT_DELETE_WINDOW),
    ))
    .orderBy(schema.proposals.deletedAt);
}
```
Adapt the `where` to D-03's row scope — `status IN ('active','deleted')`, **no** `deleted_at` window filter (unlike purge, which requires the 30-day window) — and adapt the imports (`inArray` instead of/alongside `isNotNull`/`lt`).

**Analog for the left-join-against-a-marker technique** (D-06's "left-join against audit_log, skip what's already marked") — `src/lib/db/queries/global-params.ts:106-124` (targeted read), the closest existing `leftJoin` usage against a companion table to decorate/filter rows:
```typescript
const rawRows = await dbi
  .select({
    id: schema.globalParams.id,
    // ...own columns...
    createdByDisplay: sql<string | null>`COALESCE(${schema.users.displayName}, ${schema.users.email})`,
  })
  .from(schema.globalParams)
  .leftJoin(schema.users, eq(schema.users.id, schema.globalParams.createdBy))
  .where(cursorPredicate ? and(cursorPredicate) : undefined)
  .orderBy(desc(schema.globalParams.effectiveFrom), desc(schema.globalParams.id))
  .limit(fetchCount);
```
For the backfill query, join `schema.auditLog` on `(auditLog.targetType = 'proposal' AND auditLog.targetId = proposals.id AND auditLog.action = 'proposal.pdf_backfill')` and filter `where(isNull(auditLog.id))` to select only unmigrated rows — this is the mechanism, not copied code, since no existing query filters *out* matched join rows (global-params.ts's join is decorative, not filtering). `src/lib/db/queries/pipeline.ts` and `companies.ts` (grep-located, not read — both use multiple `leftJoin`s per query) are secondary confirmations that multi-join queries are an established shape in this file family if the planner needs a second join (e.g. also joining `proposals` for blob-key construction is unnecessary since it's the same table).

Import list to extend at the top of `proposals.ts` (proposals.ts:1-5, already read in full):
```typescript
import 'server-only';
import { and, desc, eq, gt, ilike, isNotNull, isNull, lt, or, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { ProposalRow, NewProposalRow } from '@/db/schema';
import { writeAuditLog } from './audit-log';
```
`isNull` and `eq` are already imported; likely need `inArray` added for the `status IN (...)` predicate.

---

### Tests

**Analog for query-function tests:** `src/lib/db/queries/proposals.test.ts:1-60` (targeted read) — the established mock shape for any new query function in this file:
```typescript
vi.mock('server-only', () => ({}));
vi.mock('./audit-log', () => ({ writeAuditLog: mockWriteAuditLog }));
vi.mock('@/lib/db', async () => {
  const real = await vi.importActual<typeof import('@/db/schema')>('@/db/schema');
  const stubBuilder = {
    select: () => stubBuilder,
    from: () => stubBuilder,
    leftJoin: (...) => { calls.push(...); return stubBuilder; },
    where: (clause) => { calls.push({ kind: 'where', payload: clause }); return stubBuilder; },
    orderBy: (...) => stubBuilder,
    limit: (n) => Promise.resolve([]),
    // ...
  };
  return { db: () => stubBuilder, schema: real, ... };
});
```
Companion pattern for asserting a `leftJoin` call happened: `src/lib/db/queries/coefficient-history.test.ts:209-211` (`it('calls leftJoin to surface createdByDisplay from users table', ...)`) and `pipeline.test.ts:266` (`it('the proposals leftJoin CONDITION contains proposals.user_id', ...)`) — both grep-located, showing the convention of asserting on the *condition* passed to `leftJoin`, not just that it was called.

**No analog for script-level tests.** `find scripts -name "*.test.ts"` returned zero results — no existing `scripts/*.ts` operator CLI has its own test file in this repo. `scripts/reconcile-proposals.ts` and `scripts/purge-soft-deleted.ts` are both thin CLI wrappers whose logic lives in a testable domain module (`src/lib/reconcile`, `src/lib/admin/purge`) that DOES have tests. **Recommendation for the planner:** follow that split — put the backfill's row-scan/render/upload/persist/report logic in a new `src/lib/backfill/proposal-pdfs.ts` (mirroring `src/lib/reconcile`'s shape) and test that module directly; leave `scripts/backfill-proposal-pdfs.ts` itself as an untested thin CLI wrapper, consistent with the rest of the repo.

## Shared Patterns

### Credential-safe logging
**Source:** `scripts/_db-branch-guard.ts:28-33` (docstring) + `scripts/reconcile-proposals.ts:83-87`
**Apply to:** the new script and any log lines in the new workflow.
```typescript
// Interpolate ONLY a derived `hostname` (never `.host`, which carries the port —
// bug_011) and a bare filename/source label. NEVER the raw DATABASE_URL,
// user, password, or query string — guard/script output gets pasted into
// transcripts and issues.
```

### Environment/guard trio every write-capable script imports
**Source:** `scripts/_load-env.ts` (full file, 86 lines) + `scripts/_db-branch-guard.ts` (full file, 252 lines)
**Apply to:** `scripts/backfill-proposal-pdfs.ts` — must be the first import, exactly as every other `scripts/*.ts` write-capable entry point does:
```typescript
import './_load-env'; // arms assertSafeDatabaseTarget() at module scope, before any other statement
```
The guard's SKIP rule (no `.env*` candidate file on disk) is what lets the GitHub Action's apply job write to Neon `main` at all (D-07) — `scripts/_db-branch-guard.ts:44-59` documents this as one of exactly three sanctioned paths (Vercel prod build, `MIGRATE PROD` Action, CI's ephemeral-branch step). Do not modify the guard for this phase (CONTEXT.md D-07 interpretation note is explicit: no bypass env var).

### Exit-code vocabulary
**Source:** `scripts/reconcile-proposals.ts:26-33` (docstring)
**Apply to:** `scripts/backfill-proposal-pdfs.ts` per D-11 — `0` success, `1` crash, `2` environment refusal, `3` guard refusal (drift/no-report).

### Two-form report artifact (`.md` + `.json`)
**Source:** `scripts/reconcile-proposals.ts:104-110` (usage) — the actual generator lives in `src/lib/reconcile` (not read; out of this phase's file list, cited for the pattern only).
**Apply to:** the backfill's dry-run report, per CONTEXT.md's "Claude's Discretion" note that mirroring reconcile's two-form output is the obvious precedent but not mandated. If adopted, the `.json` form is what job 2 of the workflow downloads and diffs against (D-09's drift check).

### Best-effort log-and-continue with a non-zero exit on any failure
**Source:** `scripts/purge-soft-deleted.ts:101-119`
**Apply to:** the backfill's per-row apply loop (D-10) — one legacy row with unparseable `inputs` must not block the rest; exit `1`-equivalent (per D-11's vocabulary, this maps to a crash-style non-zero rather than reconcile's `3`, since it's a partial-failure signal, not a guard refusal — planner's call on exact code, but must be non-zero).

## No Analog Found

| File/Concern | Role | Data Flow | Reason |
|---|---|---|---|
| Cross-job artifact upload/download in a workflow | config | event-driven | Zero usage of `actions/upload-artifact` or `actions/download-artifact` anywhere in `.github/workflows/*.yml` in this repo; this is standard GitHub Actions but net-new to this codebase's CI vocabulary. |
| A query that *filters out* left-joined matches (anti-join for idempotence) | model (query fn) | CRUD | Every existing `leftJoin` in `src/lib/db/queries/*.ts` (global-params.ts, admin-activity.ts, coefficient-history.ts, companies.ts, client-relationships.ts, partners.ts, pipeline.ts) decorates rows with joined display data; none filters `WHERE joined.id IS NULL` to select unmatched rows only. The join mechanics are analogous; the filter predicate is new. |
| A `scripts/*.test.ts` file | test | request-response | No operator CLI script in this repo has its own test file — logic-bearing domain modules (`src/lib/reconcile`, `src/lib/admin/purge`) are tested instead, per the repo's established thin-wrapper convention. |

## Metadata

**Analog search scope:** `scripts/`, `.github/workflows/`, `src/lib/db/queries/`, `src/lib/api/proposals/`, `src/lib/pdf/`, `src/lib/storage/` (per CONTEXT.md's canonical refs — no broader Glob/Grep sweep was needed since CONTEXT.md's discuss-phase already named and verified every analog).
**Files scanned:** 13 read in full or via targeted offset/limit + 3 grepped for corroborating usage (client-relationships.ts, companies.ts, pipeline.ts — leftJoin confirmation only, not excerpted).
**Pattern extraction date:** 2026-09-09
