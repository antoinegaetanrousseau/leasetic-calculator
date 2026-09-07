/**
 * `resolvePhaseDoc()` mechanism proof — moved out of
 * `tests/phase-37-closure-artifacts.test.ts` during the Phase 38 Nyquist gap-fill pass so
 * the helper's own proof lives beside the helper (`tests/_planning-docs.ts`) rather than
 * inside a phase-37-specific suite. Six tests moved verbatim (no assertion, name or
 * ordering changed) plus one new test (the last) added for the Phase 38 CLOSE-02 gap:
 * proving `resolvePhaseDoc()` resolves a DECIMAL phase number (31.1) to the correct
 * directory and is not fooled by an unrelated decoy that a naive unescaped-regex
 * implementation would have matched.
 *
 * See `tests/_planning-docs.ts`'s module docblock for the full rationale (why the
 * resolver exists, its three failure modes, and the decimal-number regex-escaping fix).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MILESTONE_ARCHIVES_DIR, resolvePhaseDoc } from './_planning-docs';

describe('resolvePhaseDoc — archive-resilient resolution (CLOSE-07 rationale)', () => {
  let tmpRoot: string;

  afterEach(() => {
    if (tmpRoot) rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('resolves a document that exists only in the pre-archive .planning/phases/<N>-*/ location', () => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'phase37-resolver-legacy-'));
    const legacyDir = join(tmpRoot, 'phases', '37-test-phase');
    mkdirSync(legacyDir, { recursive: true });
    writeFileSync(join(legacyDir, 'DOC.md'), 'legacy content');

    const resolved = resolvePhaseDoc(37, 'DOC.md', {
      legacyPhasesDir: join(tmpRoot, 'phases'),
      milestoneArchivesDir: join(tmpRoot, 'milestones-empty'),
    });

    expect(readFileSync(resolved, 'utf8')).toBe('legacy content');
  });

  it('resolves a document that exists only in the post-archive .planning/milestones/*-phases/<N>-*/ location, even under a DIFFERENT slug than the legacy directory would have used', () => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'phase37-resolver-archived-'));
    // Deliberately a different slug from any real Phase 37 directory name, proving
    // resolution is by NUMBER prefix, not by remembering the slug.
    const archivedDir = join(tmpRoot, 'milestones', 'v1.9-phases', '37-renamed-during-archive');
    mkdirSync(archivedDir, { recursive: true });
    writeFileSync(join(archivedDir, 'DOC.md'), 'archived content');

    const resolved = resolvePhaseDoc(37, 'DOC.md', {
      legacyPhasesDir: join(tmpRoot, 'phases-empty'),
      milestoneArchivesDir: join(tmpRoot, 'milestones'),
    });

    expect(readFileSync(resolved, 'utf8')).toBe('archived content');
  });

  it('throws, naming BOTH searched locations, when the document is in neither (a genuine failure, not a path bug)', () => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'phase37-resolver-neither-'));
    mkdirSync(join(tmpRoot, 'phases'), { recursive: true });
    mkdirSync(join(tmpRoot, 'milestones'), { recursive: true });

    expect(() =>
      resolvePhaseDoc(37, 'DOC.md', {
        legacyPhasesDir: join(tmpRoot, 'phases'),
        milestoneArchivesDir: join(tmpRoot, 'milestones'),
      }),
    ).toThrowError(/EITHER location/);
  });

  it('throws, flagging a half-completed archive migration, when the document exists in BOTH locations at once', () => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'phase37-resolver-both-'));
    const legacyDir = join(tmpRoot, 'phases', '37-test-phase');
    const archivedDir = join(tmpRoot, 'milestones', 'v1.9-phases', '37-test-phase');
    mkdirSync(legacyDir, { recursive: true });
    mkdirSync(archivedDir, { recursive: true });
    writeFileSync(join(legacyDir, 'DOC.md'), 'stale pre-migration copy');
    writeFileSync(join(archivedDir, 'DOC.md'), 'new post-migration copy');

    expect(() =>
      resolvePhaseDoc(37, 'DOC.md', {
        legacyPhasesDir: join(tmpRoot, 'phases'),
        milestoneArchivesDir: join(tmpRoot, 'milestones'),
      }),
    ).toThrowError(/BOTH locations/);
  });

  it('does NOT match a phase-number prefix (e.g. "37" must not match a "371-..." or "37x-..." directory)', () => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'phase37-resolver-prefix-'));
    // A directory named "371-unrelated-phase" starts with the string "37" but is NOT
    // phase 37 — a naive `.startsWith('37')` check would wrongly match it. The resolver
    // uses `^37-` (hyphen required), which must reject this.
    const decoyDir = join(tmpRoot, 'phases', '371-unrelated-phase');
    mkdirSync(decoyDir, { recursive: true });
    writeFileSync(join(decoyDir, 'DOC.md'), 'wrong phase');

    expect(() =>
      resolvePhaseDoc(37, 'DOC.md', {
        legacyPhasesDir: join(tmpRoot, 'phases'),
        milestoneArchivesDir: join(tmpRoot, 'milestones-empty'),
      }),
    ).toThrowError(/EITHER location/);
  });

  it('resolves each of the four real Phase 37-closure documents against the CURRENT (post-CLOSE-07) archive layout', () => {
    // Proves the real, non-fixture invocation the rest of this suite depends on actually
    // finds today's files — not just that the fixture-glob logic works in isolation.
    expect(resolvePhaseDoc(30, '30-UAT.md')).toBe(
      join(MILESTONE_ARCHIVES_DIR, 'v1.6-phases', '30-company-contact-registry', '30-UAT.md'),
    );
    expect(resolvePhaseDoc(33, '33-VERIFICATION.md')).toBe(
      join(MILESTONE_ARCHIVES_DIR, 'v1.6-phases', '33-pipeline', '33-VERIFICATION.md'),
    );
    expect(resolvePhaseDoc(34, '34-VERIFICATION.md')).toBe(
      join(MILESTONE_ARCHIVES_DIR, 'v1.6-phases', '34-fiche-client', '34-VERIFICATION.md'),
    );
    expect(resolvePhaseDoc(34, '34-REVIEW.md')).toBe(
      join(MILESTONE_ARCHIVES_DIR, 'v1.6-phases', '34-fiche-client', '34-REVIEW.md'),
    );
  });

  it('resolves a DECIMAL phase number (31.1) to its exact directory, ignoring an unrelated same-prefix integer phase, and is not fooled by a decoy an unescaped-regex implementation would have matched (Phase 38 CLOSE-02 gap-fill fix)', () => {
    // Real-repo case first: 31.1 must resolve to 31.1-app-shell-refresh, never to the
    // unrelated 31-reconciliation-engine-proposal-extraction that also lives under
    // .planning/phases/. This part already worked before the escaping fix (see
    // _planning-docs.ts's module docblock), but is asserted here directly rather than
    // trusted from the docblock's prose.
    const realResolved = resolvePhaseDoc(31.1, '31.1-VERIFICATION.md');
    expect(realResolved).toBe(
      join(MILESTONE_ARCHIVES_DIR, 'v1.6-phases', '31.1-app-shell-refresh', '31.1-VERIFICATION.md'),
    );
    expect(realResolved).not.toContain('31-reconciliation-engine-proposal-extraction');

    // Decoy fixture proving the LATENT bug the escaping fix closes: an unescaped
    // `new RegExp('^' + phaseNumber + '-')` for phaseNumber "31.1" treats the "." as
    // "match any character", so it would ALSO match a directory like
    // "3141-unrelated-decimal-phase" (any char in place of the literal dot). With the
    // escaping fix, only a directory whose name is LITERALLY "31.1-..." matches; the decoy
    // must not appear in the resolved set at all, so resolution against a fixture root
    // containing ONLY the decoy must throw "not found in EITHER location" — not silently
    // resolve to the decoy, and not throw an "ambiguous / found in both" error either
    // (which is what the pre-fix code would have done if a genuine 31.1 dir were also
    // present, since both would then match its wildcard-dot prefix pattern).
    const tmpRoot = mkdtempSync(join(tmpdir(), 'phase31-1-decimal-decoy-'));
    try {
      const decoyDir = join(tmpRoot, 'phases', '3141-unrelated-decimal-phase');
      mkdirSync(decoyDir, { recursive: true });
      writeFileSync(join(decoyDir, 'DOC.md'), 'wrong phase — decoy for the "." wildcard bug');

      expect(() =>
        resolvePhaseDoc(31.1, 'DOC.md', {
          legacyPhasesDir: join(tmpRoot, 'phases'),
          milestoneArchivesDir: join(tmpRoot, 'milestones-empty'),
        }),
      ).toThrowError(/EITHER location/);
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});
