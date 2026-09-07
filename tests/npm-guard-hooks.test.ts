/**
 * Phase 39 Plan 04/05 — standing regression coverage for the npm-lifecycle-hook half of
 * OPS-05 (T-39-04-06, T-39-04-07 / AR-39-02, T-39-05-06).
 *
 * These four contracts were each proven exactly ONCE, inside a `<automated>` verify block
 * that ran during plan execution and left no standing test:
 *   - 39-04-PLAN.md Task 2's verify block ran a throwaway `node -e "..."` against
 *     package.json and never ran again.
 *   - 39-05-PLAN.md Task 3's verify block ran a throwaway `grep -c` pair against the
 *     routing doc and never ran again.
 * `grep -rln "package.json" tests/` returns nothing today — no test in this repo asserts
 * anything about package.json. This file is that standing coverage.
 *
 * What each contract protects, and what a red test means:
 *
 *   Contract G-1 (--node-env production on both hooks) — this is the exact NODE_ENV
 *   mismatch between the npm lifecycle hook and the guarded command that caused the
 *   2026-09-06 production incident. `next build`/`next start` force NODE_ENV=production
 *   internally, but only AFTER `prebuild`/`prestart` has already run; at hook time NODE_ENV
 *   is whatever the developer's shell had (usually unset). If a future edit drops
 *   `--node-env production` from either hook, the guard resolves the DEVELOPMENT candidate
 *   order, reports OK, and `npm run start` can silently serve production again.
 *
 *   Contract G-2 (the hooks actually invoke the guard) — a future edit could delete the
 *   body of `prebuild`/`prestart` (e.g. reduce it to a no-op echo) while leaving the
 *   `--node-env production` string sitting in an unrelated comment or script, and G-1's
 *   naive substring check would still pass. This contract independently pins that the
 *   guard's own npm script name, `check:local-db-branch`, is what each hook actually runs.
 *
 *   Contract G-3 (no script anywhere passes --root) — `--root` is the documented residual-
 *   risk BOUND for the accepted `--root` bypass (AR-39-02 / T-39-04-07): an operator could
 *   point the guard at an empty directory to force a false SKIP. The register accepts that
 *   risk on condition that no *automated* npm script ever passes `--root`, checked with
 *   `grep -c -- '--root' package.json` staying 0. Unlike G-1/G-2, this must hold over EVERY
 *   script in package.json, not just prebuild/prestart — a `--root` slipped into some other
 *   script (e.g. a future `build:ci` helper) would silently widen the accepted-risk bound.
 *
 *   Contract G-4 (routing doc cross-links the machine-readable list and the guard's real
 *   flags) — T-39-05-06's mitigation is that the doc cannot claim a behaviour the code does
 *   not have (the defect class OPS-05 itself is — see `scripts/_load-env.ts`'s false
 *   docstring precedent). If a future doc edit stops naming `_neon-endpoints.list`, `OPS-05`,
 *   `prebuild`, or `--node-env`, the doc has drifted from the guard's real invocation
 *   contract and a reader can no longer trust it.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = process.cwd();

function readPackageJson(): { scripts: Record<string, string> } {
  const raw = readFileSync(join(REPO_ROOT, 'package.json'), 'utf8');
  return JSON.parse(raw) as { scripts: Record<string, string> };
}

function readDoc(): string {
  return readFileSync(join(REPO_ROOT, 'docs/operations/neon-branch-routing.md'), 'utf8');
}

describe('npm guard hooks (OPS-05: prebuild/prestart gate npm run build / npm run start)', () => {
  describe('G-1: --node-env production on both hooks (T-39-04-06)', () => {
    it('prebuild passes --node-env production to the guard', () => {
      const { scripts } = readPackageJson();

      expect(
        /--node-env\s+production\b/.test(scripts.prebuild ?? ''),
        'INCIDENT REGRESSION: package.json "prebuild" no longer passes --node-env production. ' +
          '`next build` forces NODE_ENV=production only AFTER prebuild has already run, so a ' +
          'guard invoked without this flag resolves the DEVELOPMENT candidate order and reports ' +
          'OK even when .env.production.local would be read by the build — the exact 2026-09-06 ' +
          'incident. Current prebuild script: ' + JSON.stringify(scripts.prebuild),
      ).toBe(true);
    });

    it('prestart passes --node-env production to the guard', () => {
      const { scripts } = readPackageJson();

      expect(
        /--node-env\s+production\b/.test(scripts.prestart ?? ''),
        'INCIDENT REGRESSION: package.json "prestart" no longer passes --node-env production. ' +
          '`next start` forces NODE_ENV=production only AFTER prestart has already run; omitting ' +
          'this flag reproduces the 2026-09-06 incident on `npm run start` specifically (the ' +
          'command that actually served the production DB that day). Current prestart script: ' +
          JSON.stringify(scripts.prestart),
      ).toBe(true);
    });
  });

  describe('G-2: hooks actually invoke the guard (T-39-04-06)', () => {
    it('prebuild invokes check:local-db-branch, not merely a script that mentions --node-env', () => {
      const { scripts } = readPackageJson();

      expect(
        /check:local-db-branch/.test(scripts.prebuild ?? ''),
        'package.json "prebuild" no longer runs the check:local-db-branch guard. Nothing would ' +
          'fail today if this hook were reduced to a no-op — G-1 alone cannot catch that, because ' +
          'a stray "--node-env production" string elsewhere in the script would still satisfy it. ' +
          'Current prebuild script: ' + JSON.stringify(scripts.prebuild),
      ).toBe(true);
    });

    it('prestart invokes check:local-db-branch, not merely a script that mentions --node-env', () => {
      const { scripts } = readPackageJson();

      expect(
        /check:local-db-branch/.test(scripts.prestart ?? ''),
        'package.json "prestart" no longer runs the check:local-db-branch guard. Deleting this ' +
          'hook\'s body (or the invocation inside it) leaves `npm run start` completely unguarded ' +
          'while still reporting green if only G-1 were asserted. Current prestart script: ' +
          JSON.stringify(scripts.prestart),
      ).toBe(true);
    });
  });

  it('G-3: no npm script anywhere passes --root (AR-39-02 residual-risk bound, T-39-04-07)', () => {
    const { scripts } = readPackageJson();

    const offenders = Object.entries(scripts).filter(([, body]) => /--root\b/.test(body));

    expect(
      offenders,
      'AR-39-02 VIOLATION: at least one npm script passes --root. The accepted risk for the ' +
        '--root bypass (an operator can point the guard at an empty directory to force a false ' +
        'SKIP) is accepted ONLY on the condition that no automated script ever passes it — that is ' +
        'the residual-risk bound recorded in 39-SECURITY.md. This check covers EVERY script in ' +
        'package.json, not just prebuild/prestart, because a --root slipped into any other script ' +
        '(e.g. a future helper) would silently widen the accepted bound. Offending scripts: ' +
        JSON.stringify(offenders),
    ).toEqual([]);
  });

  it('G-4: docs/operations/neon-branch-routing.md cross-links the machine-readable list and the guard contract (T-39-05-06)', () => {
    const doc = readDoc();

    const required = ['_neon-endpoints.list', 'OPS-05', 'prebuild', '--node-env'];
    const missing = required.filter((token) => !doc.includes(token));

    expect(
      missing,
      'docs/operations/neon-branch-routing.md no longer names one or more of ' +
        JSON.stringify(required) +
        '. This doc is human-facing operational guidance for the guard; if it stops naming the ' +
        'machine-readable endpoint list (_neon-endpoints.list), the requirement it closes (OPS-05), ' +
        'or the actual invocation contract (prebuild / --node-env), it can drift into claiming a ' +
        'behaviour the code does not have — the defect class OPS-05 itself is (see ' +
        '_load-env.ts\'s pre-fix false docstring). Missing tokens: ' + JSON.stringify(missing),
    ).toEqual([]);
  });
});
