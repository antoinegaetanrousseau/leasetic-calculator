/**
 * 33-REVIEW CR-01 — structural contract: no client component may branch on a
 * SERVER ACTION's error message.
 *
 * THE DEFECT THIS EXISTS TO PREVENT, in full, because it is invisible to every
 * other gate in this repo:
 *
 * `MarkWonDialog` used to discover D-08's SIREN gate by catching the rejection
 * from `markProposalWonAction` and comparing `e.message` to a shared
 * `SIREN_REQUIRED` sentinel. Next.js does not send a Server Function's thrown
 * error message to the client in a PRODUCTION build — it substitutes a generic
 * message and a `digest`. The comparison was therefore TRUE under `npm run dev`
 * and FALSE in production, where the partner got a bounded error toast and no
 * way to supply the SIREN: the exact dead end D-08 was written to prevent.
 *
 * Nothing caught it. `typecheck`, `lint:check` and `build` all pass on the
 * broken code — it is a runtime behaviour of the framework, not a type or a
 * lint rule. Every unit test covering the path `vi.mock`s the action module and
 * rejects with a real `Error`, so the assertion ran in-process and never
 * crossed the serialisation boundary the defect lives on. And the manual
 * acceptance walkthrough was performed against a dev server, so it PASSED on
 * behaviour that only exists in dev.
 *
 * The fix was to carry the recoverable outcome as a RETURNED discriminated
 * result, which survives serialisation. This suite is the recurrence guard the
 * review asked for: it reads the client components that call server actions and
 * fails if any of them compares a caught error's `.message` to anything. A
 * bounded `catch { toast.error(...) }` is fine — inspecting the message is not.
 *
 * Deliberately structural rather than behavioural: a behavioural test would
 * need a real production build plus a browser, and would not run in CI.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['app', 'src/components'];

/** Recursively collect .ts/.tsx files, skipping vendored ReUI/shadcn code. */
function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    // Vendored code is re-imported wholesale on upgrade and is excluded from
    // ESLint for the same reason; house rules bind at call sites instead.
    // (The vendored blocks half of this skip was removed 2026-09-05 when the
    // dead blocks tree was deleted — Phase 36, HOUSE-04; see
    // docs/design/reui-blocks-audit.md.)
    if (full.includes('components/reui')) continue;
    if (full.includes('components/ui/')) continue;
    if (statSync(full).isDirectory()) {
      collectSourceFiles(full, out);
      continue;
    }
    if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

const CLIENT_FILES = ROOTS.flatMap((r) => collectSourceFiles(r)).filter((f) => {
  const src = readFileSync(f, 'utf-8');
  return src.startsWith("'use client'") || src.startsWith('"use client"');
});

/**
 * Matches a comparison against a caught error's message, in either order:
 *   e.message === X | err.message !== X | X === error.message
 * Comments are stripped first so the explanatory prose in these files (which
 * necessarily quotes the old broken pattern) does not trip the gate.
 */
const MESSAGE_COMPARISON = /(?:\w+\.message\s*[!=]==?\s*)|(?:[!=]==?\s*\w+\.message\b)/;

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('server-action error contracts (33-REVIEW CR-01)', () => {
  it('finds client components to check (the glob itself must not silently go empty)', () => {
    expect(CLIENT_FILES.length).toBeGreaterThan(10);
  });

  it('no client component branches on a caught error message', () => {
    const offenders = CLIENT_FILES.filter((f) =>
      MESSAGE_COMPARISON.test(stripComments(readFileSync(f, 'utf-8'))),
    );

    expect(
      offenders,
      'A server action\'s thrown error message is REDACTED in production builds — ' +
        'branch on a returned discriminated result instead. See 33-REVIEW CR-01.',
    ).toEqual([]);
  });

  it('the SIREN gate specifically travels as a returned result, not a thrown sentinel', () => {
    const dialog = readFileSync('app/(authed)/clients/[id]/MarkWonDialog.tsx', 'utf-8');
    expect(dialog).toContain('result.ok');
    expect(stripComments(dialog)).not.toContain('SIREN_REQUIRED');

    const actions = readFileSync('src/lib/pipeline/actions.ts', 'utf-8');
    expect(actions).toContain("return { ok: false, reason: 'siren_required' }");
  });
});
