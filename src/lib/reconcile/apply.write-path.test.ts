/**
 * Phase 31 Plan 05 Task 3 — CRM-05 / T-30-09-02 — client_relationship_id
 * write paths (widened for Phase 31).
 *
 * Phase 30 plan 09 shipped a manual (unpersisted) grep gate asserting that
 * `proposals.client_relationship_id` had exactly one write path:
 * `createDraft`, reached from the wizard mint path. This phase adds a
 * SECOND writer — `applyReconciliationPlan` (src/lib/reconcile/apply.ts),
 * an offline, CLI-only writer with no `requireUser`/`requireAdmin` gate
 * above it. The gate's *intent* was never "there is literally one
 * assignment statement anywhere" — it was "no request handler can bind a
 * proposal to a relationship it has not proven the caller owns." That
 * intent is unchanged, and the three assertions below are what now enforce
 * it, persisted as a real test file for the first time (T-30-09-02 was
 * previously a manual acceptance-criteria grep run during plan execution).
 *
 * 1. The Phase 30 scope still holds: no file under `app/(authed)/proposals/`
 *    or `src/lib/api/proposals/` writes `clientRelationshipId` via a
 *    `.set(`/`.values(` call — the wizard mint path still reaches the
 *    column exclusively through `createDraft` (src/lib/db/queries/
 *    proposals.ts), never directly.
 * 2. `src/lib/reconcile/apply.ts` is imported by exactly zero files under
 *    `app/` — the new writer is unreachable from any request handler.
 * 3. Across the whole repository, the set of files writing
 *    `clientRelationshipId` in a `.set(`/`.values(` position (or the
 *    equivalent typed-insert-object-from-args shape `createDraft` uses) is
 *    EXACTLY `{ src/lib/db/queries/proposals.ts, src/lib/reconcile/apply.ts,
 *    src/lib/reconcile/merge.ts }`, hard-coded here so a fourth writer
 *    fails this suite loudly instead of silently widening the gate again.
 *
 * Every regex below runs against comment-stripped source: a `//` line
 * comment, or a jsdoc/block-comment continuation line starting with `*`,
 * is filtered out before any pattern is tested, so a documentation mention
 * of `clientRelationshipId` can never self-trip these assertions.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, sep } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
// src/lib/reconcile -> repository root
const REPO_ROOT = join(HERE, '..', '..', '..');

/** Removes `//`-comment and `*`-continuation lines before any regex runs. */
function stripComments(source: string): string {
  return source
    .split('\n')
    .filter((line) => !/^\s*\/\//.test(line) && !/^\s*\*/.test(line))
    .join('\n');
}

/** Lists every non-test .ts/.tsx file under `rootRelative`, POSIX-joined relative to the repo root. */
function listTsFiles(rootRelative: string): string[] {
  const absRoot = join(REPO_ROOT, rootRelative);
  let entries: string[];
  try {
    entries = readdirSync(absRoot, { recursive: true }) as string[];
  } catch {
    return [];
  }
  return entries
    .filter((e) => (e.endsWith('.ts') || e.endsWith('.tsx')) && !e.endsWith('.d.ts'))
    .filter((e) => !/\.(test|spec)\.tsx?$/.test(e))
    .map((e) => join(rootRelative, e).split(sep).join('/'));
}

function readStripped(fileRelative: string): string {
  return stripComments(readFileSync(join(REPO_ROOT, fileRelative), 'utf8'));
}

/** A `.set({...})` or `.values({...})` call with clientRelationshipId (keyed or shorthand) inside it. */
function hasSetOrValuesWrite(strippedSource: string): boolean {
  // Scoped to a single flat object literal: `[^{}]` refuses to cross into a
  // nested object OR into a completely unrelated later `{...}` block (e.g.
  // a sibling `.select({...})` call a few lines below an unrelated
  // `.values({...})`), which a plain "look ahead N characters" window would
  // wrongly treat as one statement.
  return (
    /\.values\(\{[^{}]*?\bclientRelationshipId\b[^{}]*?\}/.test(strippedSource) ||
    /\.set\(\{[^{}]*?\bclientRelationshipId\b[^{}]*?\}/.test(strippedSource)
  );
}

/**
 * Assertion 3's broader detector: the two direct forms above, plus the
 * indirect shape `createDraft` (src/lib/db/queries/proposals.ts) uses — a
 * typed insert-object literal populated from the function's own `args`
 * parameter, later passed to `.values(insert)` by variable rather than
 * inline. `schema.*` right-hand sides (SELECT column aliases) and Drizzle
 * column-builder calls (`uuid(...)` in src/db/schema.ts's own column
 * definition) are deliberately NOT writes and must not match either form.
 */
function hasClientRelationshipIdWrite(strippedSource: string): boolean {
  return hasSetOrValuesWrite(strippedSource) || /\bclientRelationshipId\s*:\s*args\./.test(strippedSource);
}

describe('CRM-05 / T-30-09-02 — client_relationship_id write paths (widened for Phase 31)', () => {
  it('assertion 1 — no file under app/(authed)/proposals/ or src/lib/api/proposals/ writes clientRelationshipId outside the existing mint path', () => {
    const files = [...listTsFiles('app/(authed)/proposals'), ...listTsFiles('src/lib/api/proposals')];
    expect(files.length).toBeGreaterThan(0);
    const offenders = files.filter((f) => hasSetOrValuesWrite(readStripped(f)));
    expect(offenders).toEqual([]);
  });

  it('assertion 2 — src/lib/reconcile/apply.ts is imported by exactly zero files under app/', () => {
    const files = listTsFiles('app');
    expect(files.length).toBeGreaterThan(0);
    const offenders = files.filter((f) => /reconcile\/apply/.test(readStripped(f)));
    expect(offenders).toEqual([]);
  });

  it('assertion 3 — exactly these files write clientRelationshipId in a .set( or .values( position (or the equivalent args-derived insert-object shape)', () => {
    const EXPECTED_WRITERS = [
      'src/lib/db/queries/proposals.ts',
      'src/lib/reconcile/apply.ts',
      'src/lib/reconcile/merge.ts',
    ];

    const files = [...listTsFiles('app'), ...listTsFiles('src')].filter((f) => f !== 'src/db/schema.ts');
    const writers = files.filter((f) => hasClientRelationshipIdWrite(readStripped(f)));

    expect([...writers].sort()).toEqual([...EXPECTED_WRITERS].sort());
  });
});
