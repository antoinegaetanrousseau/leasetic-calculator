/**
 * Phase 36 Plan 36-03 — HOUSE-04 gap coverage: the deletion of the dead vendored
 * `src/components/blocks/` tree held, and stays reversible and attributed.
 *
 * Standalone file rather than folding into `tests/vendored-ui-integrity.test.ts`: that
 * suite's own docstring scopes it to "a shadcn install must not disturb either of this
 * repo's TWO font surfaces" (Inter for the UI, Plus Jakarta Sans for the PDF) plus the
 * `@reui` registry entry that keeps future `shadcn add` calls pointed at the right
 * source. The recurrence risk here is different in kind: it is that
 * `npx shadcn@latest add @reui/<block>` — the audit doc's own documented reinstall
 * path — silently RECREATES `src/components/blocks/`, not that a font or a registry
 * regresses. A new, narrowly-scoped file keeps that distinction legible and keeps
 * `vendored-ui-integrity.test.ts`'s existing five cases untouched, per this audit's
 * instruction not to renumber or restructure existing tests.
 *
 * What each gate protects, and what a red test means:
 *
 *   1. `src/components/blocks/` does not exist — the recurrence guard. D-36-02 deleted
 *      152 files across 25 directories on 2026-09-05; a future `shadcn add @reui/<block>`
 *      (the exact reinstall command the audit doc records) recreates the directory
 *      silently, with no build or lint failure, because the tree was never imported by
 *      anything shipped.
 *
 *   2. `src/components/reui/` is untouched and still holds its real entries — the
 *      live/dead boundary D-36-02 drew. This test reads the actual directory listing at
 *      run time and pins those literal names, rather than hardcoding an unverified count,
 *      so a name that changes shape (e.g. `filters.tsx` reorganised into `filters/`)
 *      is caught rather than silently passing an unrelated numeric check.
 *
 *   3. No file under `src/` or `app/` imports from `'components/blocks'` — the same
 *      grep-style source-text contract `tests/admin-09-grep-contracts.test.ts` and
 *      `tests/load-env-contracts.test.ts` use elsewhere in this repo. A reinstalled or
 *      partially-restored blocks tree that gets wired back into a shipped surface is
 *      caught here even if gate 1 above is (incorrectly) satisfied by some other means.
 *
 *   4. `docs/design/reui-blocks-audit.md` still carries the dated decision record and the
 *      reinstall command — the whole reason deletion was safe to perform. Losing this
 *      record turns a reversible cleanup into an unattributed, undocumented deletion.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();
const BLOCKS_DIR = join(REPO_ROOT, 'src/components/blocks');
const REUI_DIR = join(REPO_ROOT, 'src/components/reui');
const AUDIT_DOC = join(REPO_ROOT, 'docs/design/reui-blocks-audit.md');

/** Recursively collect .ts/.tsx source files under a root, skipping node_modules-style noise. */
function collectSourceFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectSourceFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe('HOUSE-04 — src/components/blocks/ deletion recurrence guard (36-03)', () => {
  it('1. src/components/blocks/ does not exist on disk', () => {
    expect(
      existsSync(BLOCKS_DIR),
      'src/components/blocks/ exists. D-36-02 (Phase 36, HOUSE-04) deleted this dead-vendored ' +
        'tree on 2026-09-05 (25 directories, 152 files, 1.1M, zero imports). The most likely ' +
        'recurrence path is `npx shadcn@latest add @reui/<block-name>` — the exact reinstall ' +
        'command documented in docs/design/reui-blocks-audit.md — which recreates the directory ' +
        'silently, with no lint/build failure, because nothing shipped ever imported it. If this ' +
        'directory is back deliberately, update the audit doc\'s decision record and this test.',
    ).toBe(false);
  });

  it('2. src/components/reui/ is untouched and still holds its real, observed entries', () => {
    expect(
      existsSync(REUI_DIR),
      'src/components/reui/ is missing. These are the LIVE ReUI primitives (alert, badge, ' +
        'cascader, data-grid, filters, frame, gantt, icon-stack, kanban, phone-input, stepper, ' +
        'timeline) wired into shipped surfaces — D-36-02 explicitly scoped deletion to ' +
        'src/components/blocks/ only and required this directory be left untouched.',
    ).toBe(true);

    // Read the real directory listing rather than hardcoding an unverified count (per this
    // audit's own instruction) — pin the actual observed names, sorted for a stable diff.
    const actualEntries = readdirSync(REUI_DIR).sort();
    const expectedEntries = [
      'alert.tsx',
      'badge.tsx',
      'cascader',
      'data-grid',
      'filters',
      'filters.tsx',
      'frame.tsx',
      'gantt',
      'icon-stack.tsx',
      'kanban.tsx',
      'phone-input.tsx',
      'stepper.tsx',
      'timeline.tsx',
    ].sort();

    expect(
      actualEntries,
      'src/components/reui/ no longer holds the exact 13 entries recorded at HOUSE-04 close ' +
        '(36-03-SUMMARY.md / 36-VERIFICATION.md Truth 4). A name removed here indicates a live ' +
        'primitive was deleted alongside the dead blocks tree; a name added here is fine but ' +
        'means this pinned list needs a deliberate update, not a silent pass. Actual entries: ' +
        JSON.stringify(actualEntries),
    ).toEqual(expectedEntries);
  });

  it("3. no file under src/ or app/ imports from 'components/blocks'", () => {
    const files = [
      ...collectSourceFiles(join(REPO_ROOT, 'src')),
      ...collectSourceFiles(join(REPO_ROOT, 'app')),
    ];

    const offenders = files
      .map((f) => ({ file: f, src: readFileSync(f, 'utf-8') }))
      .filter(({ src }) => /from\s+['"][^'"]*components\/blocks/.test(src) || /require\(['"][^'"]*components\/blocks/.test(src))
      .map(({ file }) => file.replace(REPO_ROOT + '/', ''));

    expect(
      offenders,
      'At least one file under src/ or app/ imports from a components/blocks path. The dead ' +
        'vendored tree was deleted specifically because it had zero importers (verified by ' +
        'plan 36-03 before deletion); a live import here means either the tree was partially ' +
        'restored, or a new import was added against a path that no longer resolves. Offending ' +
        'files: ' + JSON.stringify(offenders),
    ).toEqual([]);
  });

  it('4. docs/design/reui-blocks-audit.md still carries the dated decision record and reinstall command', () => {
    const audit = readFileSync(AUDIT_DOC, 'utf-8');

    expect(
      audit,
      'docs/design/reui-blocks-audit.md no longer states "Decision: DELETED 2026-09-05" — this ' +
        'is the dated, attributed record that makes the deletion reversible and explains who ' +
        'authorised it and why (D-36-02, Phase 36 HOUSE-04). Losing this line turns a reversible ' +
        'cleanup into an undocumented one.',
    ).toContain('Decision: DELETED 2026-09-05');
    expect(
      audit,
      'docs/design/reui-blocks-audit.md no longer contains the one-line reinstall command ' +
        '(`npx shadcn@latest add @reui/<block-name>`). This is the whole reason deletion was ' +
        'judged safe — without it, restoring a block requires re-deriving the mapping by hand.',
    ).toContain('npx shadcn@latest add @reui/');
  });
});
