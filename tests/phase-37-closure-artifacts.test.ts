/**
 * Phase 37 Nyquist gaps CLOSE-01, CLOSE-03, CLOSE-04 — the three PLANNING-DOCUMENT
 * contracts flagged as MISSING coverage in the Phase 37 validation pass.
 *
 * Precedent: `tests/seed-script-registration.test.ts` (planning-document marker contract,
 * closest structural model), `tests/npm-guard-hooks.test.ts` (named-gate style, G-1/G-2…),
 * `tests/load-env-contracts.test.ts` (numbered "Contract N" prose-docblock style). This
 * file borrows the named-gate shape from the first two and the per-contract prose
 * docblock from the third.
 *
 * ============================================================================
 * WHY THE ARCHIVE-RESILIENT RESOLVER EXISTS (read this before touching a path)
 * ============================================================================
 * Phase 40 (CLOSE-07, not yet started as of this writing) will MOVE
 * `.planning/phases/28-*` through `.planning/phases/35-*` into
 * `.planning/milestones/v{X.Y}-phases/<N>-<slug>/` — exactly the shape already used for
 * phases 26/27 (`.planning/milestones/v1.5-phases/26-active-expired-row-actions/`,
 * confirmed on disk at the time this file was written). All four documents this suite
 * asserts on — `30-UAT.md`, `33-VERIFICATION.md`, `34-VERIFICATION.md`, `34-REVIEW.md` —
 * live in the 28-35 range CLOSE-07 will move. A test that hardcodes
 * `.planning/phases/30-company-contact-registry/30-UAT.md` would go red the moment
 * Phase 40 does its job correctly — not because a requirement regressed, but because the
 * document moved. `resolvePhaseDoc()` below globs by the phase-NUMBER prefix (the slug is
 * allowed to change; the number is not) across BOTH candidate homes, so this suite keeps
 * working before and after CLOSE-07 lands. Do not "simplify" this back to a literal path.
 *
 * The resolver's failure modes are deliberate, not incidental:
 *   - found in NEITHER location -> throw, naming both locations searched. A real failure
 *     (the document is genuinely missing) must not read as "file not found" from some
 *     opaque fs call three layers down.
 *   - found in BOTH locations -> throw. A half-completed archive migration (old copy left
 *     behind after the new one was created) is exactly the kind of drift worth catching,
 *     not silently preferring one copy.
 *   - found in exactly one location -> return it, regardless of which.
 *
 * The glob-by-number logic is proven against a throwaway fixture directory laid out in
 * the archived shape (see `tests/planning-docs-resolver.test.ts`), the same pattern
 * `tests/db-guard-differential.test.ts` / `db-guard-exit-codes.test.ts` use via
 * `tests/_db-guard-fixtures.ts`'s `mkdtempSync` harness. The post-archive case cannot be
 * exercised against the real repo today (Phase 40 has not run), so it is proven against a
 * fixture that reproduces the archived directory shape, not fabricated as a real-repo
 * assertion.
 *
 * EXTRACTION NOTE (Phase 38 Nyquist gap-fill pass): `resolvePhaseDoc()`, its two private
 * helpers and the two root-directory constants now live in `tests/_planning-docs.ts`, so
 * the helper's own mechanism proof can live beside it
 * (`tests/planning-docs-resolver.test.ts`) rather than inside this phase-37-specific
 * suite. This file now only imports them. No assertion, test name or ordering below this
 * point changed as part of that extraction.
 */
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT, readPhaseDoc } from './_planning-docs';

// ---------------------------------------------------------------------------
// Small markdown/YAML-ish extraction helpers shared by the gap contracts below.
// These operate on already-loaded text, never touch the filesystem themselves, and are
// intentionally simple regex/line-scan logic — not a real YAML/markdown parser — matching
// this repo's established house style for reading its own planning documents as text.
// ---------------------------------------------------------------------------

function extractFrontmatter(content: string): string {
  const match = /^---\n([\s\S]*?)\n---/.exec(content);
  if (!match) {
    throw new Error('No YAML frontmatter block found (expected a leading "---" ... "---" pair).');
  }
  return match[1];
}

/** The markdown section starting at the first line matching `headingPattern`, up to (not
 * including) the next heading of equal or shallower level. */
function extractMarkdownSection(content: string, headingPattern: RegExp): string {
  const lines = content.split('\n');
  const startIdx = lines.findIndex((l) => headingPattern.test(l));
  if (startIdx === -1) {
    throw new Error(`No heading matching ${String(headingPattern)} found.`);
  }
  const levelMatch = /^(#+)\s/.exec(lines[startIdx]);
  const headingLevel = levelMatch ? levelMatch[1].length : 1;
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const m = /^(#+)\s/.exec(lines[i]);
    if (m && m[1].length <= headingLevel) {
      endIdx = i;
      break;
    }
  }
  return lines.slice(startIdx, endIdx).join('\n');
}

/** A `### N. …` UAT scenario block: from that heading line to the next `##`/`###` heading. */
function extractUatScenario(content: string, scenarioHeadingPattern: RegExp): string {
  return extractMarkdownSection(content, scenarioHeadingPattern);
}

/** A top-level `fieldName:` entry within an already-extracted block, from its own line to
 * the line before the next entry named in `terminators` (or to the end of the block if
 * `terminators` is empty / none match — i.e. the field is the block's last entry). */
function extractYamlField(block: string, fieldName: string, terminators: string[] = []): string {
  const lines = block.split('\n');
  const startIdx = lines.findIndex((l) => new RegExp(`^${fieldName}:`).test(l));
  if (startIdx === -1) {
    throw new Error(`Field "${fieldName}:" not found in block:\n${block.slice(0, 300)}`);
  }
  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (terminators.some((t) => new RegExp(`^${t}:`).test(lines[i]))) {
      endIdx = i;
      break;
    }
  }
  return lines.slice(startIdx, endIdx).join('\n').trim();
}

/** Parses a YAML block-sequence frontmatter key (`key:\n  - a\n  - b`) into a string array. */
function extractYamlList(frontmatter: string, key: string): string[] {
  const lines = frontmatter.split('\n');
  const startIdx = lines.findIndex((l) => new RegExp(`^${key}:\\s*$`).test(l));
  if (startIdx === -1) {
    throw new Error(`Frontmatter key "${key}:" (as a YAML block sequence) not found.`);
  }
  const items: string[] = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const m = /^\s*-\s*(.+?)\s*$/.exec(lines[i]);
    if (!m) break;
    items.push(m[1]);
  }
  return items;
}

// ===========================================================================
// GAP 1 — CLOSE-01 (plan 37-05): Phase 30's UAT record reached pending: 0
// ===========================================================================

describe('CLOSE-01 — 30-UAT.md reaches pending: 0 with scenarios 2, 9, 10, 12 individually recorded', () => {
  const content = readPhaseDoc(30, '30-UAT.md');

  it('a) the ## Summary block reads pending: 0', () => {
    const summary = extractMarkdownSection(content, /^## Summary\s*$/);
    expect(
      /^pending:\s*0\s*$/m.test(summary),
      'The ## Summary block in 30-UAT.md no longer reads "pending: 0". CLOSE-01 requires ' +
        'every one of scenarios 2, 9, 10 and 12 to be individually resolved, not merely ' +
        'claimed resolved elsewhere in the file. Summary block found:\n' + summary,
    ).toBe(true);
  });

  it('b) the actual pending marker ("result: [pending]") recounts to zero, matching the Summary claim', () => {
    // The marker text was confirmed by reading the file directly (not guessed): every
    // still-pending scenario elsewhere in this project's UAT files is written literally
    // as `result: [pending]`. 37-VERIFICATION.md claims it verified this with
    // `grep -c 'result: \[pending\]'` = 0; this contract re-derives that count itself
    // rather than trusting the claim.
    const matches = content.match(/^result: \[pending\]\s*$/gm) ?? [];
    expect(
      matches.length,
      'Found ' + String(matches.length) + ' literal "result: [pending]" marker(s) in ' +
        '30-UAT.md, but the Summary block claims pending: 0. A scenario is still marked ' +
        'pending in its own result field even though the file-level count says otherwise.',
    ).toBe(0);
  });

  it('c) scenarios 2, 9, 10 and 12 each carry an individual pass result AND a non-empty, mutually distinct note', () => {
    const scenarioHeadings: Record<number, RegExp> = {
      2: /^### 2\. /,
      9: /^### 9\. /,
      10: /^### 10\. /,
      12: /^### 12\. /,
    };

    const notes: Record<number, string> = {};

    for (const [num, heading] of Object.entries(scenarioHeadings)) {
      const block = extractUatScenario(content, heading);

      expect(
        /^result: pass\s*$/m.test(block),
        `Scenario ${num} does not carry "result: pass". D-37-04 requires each of scenarios ` +
          '2, 9, 10 and 12 to be individually walked and recorded, not bulk-stamped.',
      ).toBe(true);

      const noteField = extractYamlField(block, 'note');
      const noteBody = noteField.replace(/^note:\s*\|?\s*/, '').trim();

      expect(
        noteBody.length,
        `Scenario ${num}'s note: field is empty or missing real content. The point of ` +
          "D-37-04 was that each scenario carries its OWN operator observation — the " +
          "Bookkeeping Correction documents a prior failure where results were bulk-marked " +
          "'pass' with no per-scenario evidence. An empty note is that same failure shape.",
      ).toBeGreaterThan(20);

      notes[Number(num)] = noteBody;
    }

    // Cross-scenario distinctness: an identical note across 2, 9, 10, 12 would signal
    // exactly the over-broad find-and-replace the Bookkeeping Correction section warns
    // about, even if each individual note is technically non-empty.
    const noteValues = Object.values(notes);
    const distinctNotes = new Set(noteValues);
    expect(
      distinctNotes.size,
      'Scenarios 2, 9, 10 and 12 do not all carry mutually distinct notes — at least two ' +
        'are identical, which is the exact bulk-stamping failure shape the Bookkeeping ' +
        'Correction section in 30-UAT.md documents and warns against repeating.',
    ).toBe(noteValues.length);
  });

  it('d) scenario 9 records the admin click-through REACHING the proposal, not the documented dead end', () => {
    const block = extractUatScenario(content, /^### 9\. /);
    const expectedField = extractYamlField(block, 'expected', ['requirement']);

    // Anchor choice, explained: the plan's own acceptance criteria suggest asserting the
    // ABSENCE of the phrase "dead end" — but that phrase legitimately still appears in
    // this rewritten text ("this scenario no longer describes a dead end"), so a naive
    // absence check would be a false positive for a regression AND would itself be
    // vacuous (it can never fail once the phrase is used to describe the fix). Instead
    // this pins two POSITIVE, durable strings that only appear in the rewritten
    // click-through description and could not appear in the pre-37-01 "it 404s" text:
    // the literal guarantee "it must NOT 404" and the attribution "GAP-01/D-37-01".
    expect(
      expectedField.includes('it must NOT 404'),
      'Scenario 9\'s expected block no longer contains the literal guarantee "it must NOT ' +
        '404" — this is the specific, positive assertion that the click-through now reaches ' +
        'the proposal detail page rather than 404ing. Expected block:\n' + expectedField,
    ).toBe(true);
    expect(
      expectedField.includes('GAP-01/D-37-01'),
      'Scenario 9\'s expected block no longer attributes the click-through fix to ' +
        'GAP-01/D-37-01. Without this, a future reader cannot trace why the scenario\'s ' +
        'expected outcome changed. Expected block:\n' + expectedField,
    ).toBe(true);
  });
});

// ===========================================================================
// GAP 2 — CLOSE-03 (plan 37-05): Phase 33's verification record reached status: passed
// ===========================================================================

describe('CLOSE-03 — 33-VERIFICATION.md reaches status: passed with the production-build distinction honoured', () => {
  const content = readPhaseDoc(33, '33-VERIFICATION.md');

  it('a) frontmatter status reads exactly "passed"', () => {
    const frontmatter = extractFrontmatter(content);
    expect(
      /^status:\s*passed\s*$/m.test(frontmatter),
      'Frontmatter "status:" in 33-VERIFICATION.md is not exactly "passed". CLOSE-03 names ' +
        'this as its literal closing condition. Frontmatter:\n' + frontmatter,
    ).toBe(true);
  });

  it('b) the Phase 37 consolidated-walk addendum exists and names a PRODUCTION build, not next dev', () => {
    const addendum = extractMarkdownSection(
      content,
      /^## Addendum — 2026-09-06, Phase 37 consolidated walk\s*$/,
    );

    expect(
      addendum.includes('npm run start'),
      'The Phase 37 addendum in 33-VERIFICATION.md does not name "npm run start". D-37-04 ' +
        "exists specifically to test the distinction between a production build and " +
        "`next dev` — the prior 2026-09-03 addendum entry was explicitly voided for having " +
        'been walked against `next dev`.',
    ).toBe(true);
    expect(
      addendum.includes('next dev'),
      'The Phase 37 addendum does not mention "next dev" at all — without naming the thing ' +
        'it is distinguishing itself FROM, the production-build claim is unfalsifiable from ' +
        'the text alone.',
    ).toBe(true);
  });

  it('c) the still-open migration-0009 item is named explicitly in the addendum, not silently dropped when status moved to passed', () => {
    const addendum = extractMarkdownSection(
      content,
      /^## Addendum — 2026-09-06, Phase 37 consolidated walk\s*$/,
    );

    expect(
      addendum.includes('migration 0009'),
      'The Phase 37 addendum no longer names "migration 0009". This is the still-open item ' +
        '33-VERIFICATION.md says was honestly carried forward rather than silently dropped ' +
        'when status moved to `passed` — its disappearance from the addendum would be ' +
        'exactly that silent-drop failure mode.',
    ).toBe(true);
    expect(
      addendum.includes('NOT closed by this addendum'),
      'The Phase 37 addendum no longer states that the migration-0009 item is NOT closed by ' +
        'this addendum. Without this explicit disclaimer, a reader could mistake the ' +
        'document-level "status: passed" as covering every human_verification item, ' +
        'including the one that is a deliberate, still-open deferral to Phase 40/CLOSE-06.',
    ).toBe(true);
  });
});

// ===========================================================================
// GAP 3 — CLOSE-04 (plans 37-03, 37-04): the two Phase 34 artifacts Phase 34 shipped without
// ===========================================================================

describe('CLOSE-04 — 34-VERIFICATION.md and 34-REVIEW.md exist, are non-trivial, and evidence file:line citations rather than SUMMARY claims', () => {
  const verificationContent = readPhaseDoc(34, '34-VERIFICATION.md');
  const reviewContent = readPhaseDoc(34, '34-REVIEW.md');

  it('a) 34-VERIFICATION.md is >= 100 lines and its Requirements Coverage table names all ten FICHE/ACTV ids', () => {
    const lineCount = verificationContent.split('\n').length;
    expect(
      lineCount,
      `34-VERIFICATION.md is only ${String(lineCount)} lines. 37-03-PLAN.md's artifact ` +
        'min_lines is 100 — a document below that floor cannot plausibly be the FULL ' +
        'goal-backward verification D-37-03 requires.',
    ).toBeGreaterThanOrEqual(100);

    const coverage = extractMarkdownSection(verificationContent, /^### Requirements Coverage\s*$/);
    const requiredIds = [
      'FICHE-01', 'FICHE-02', 'FICHE-03', 'FICHE-04', 'FICHE-05',
      'ACTV-01', 'ACTV-02', 'ACTV-03', 'ACTV-04', 'ACTV-05',
    ];
    const missingIds = requiredIds.filter((id) => !coverage.includes(id));

    expect(
      missingIds,
      'The ### Requirements Coverage section in 34-VERIFICATION.md is missing one or more ' +
        'of the ten v1.6 requirement ids FICHE-01..05 / ACTV-01..05. Missing: ' +
        JSON.stringify(missingIds),
    ).toEqual([]);
  });

  it('b) Evidence cells cite real file:line ranges (not SUMMARY references) in meaningful numbers', () => {
    // Pattern from 37-03-PLAN.md's key_link: \.tsx?:\d+
    const citations = verificationContent.match(/[A-Za-z0-9_/().[\]-]+\.tsx?:[0-9]+/g) ?? [];
    const distinctCitations = new Set(citations);

    // Counted directly against the current document during this gap's authoring: 39
    // distinct `file.ts(x):line` citations. Floor set well below that (20) so the
    // contract tolerates legitimate trimming/rewording but still catches a document that
    // regresses toward SUMMARY-only "evidence" (37-03-PLAN's acceptance floor was 15;
    // this is deliberately higher because 39 were actually observed).
    expect(
      distinctCitations.size,
      `Only ${String(distinctCitations.size)} distinct file:line citations found in ` +
        '34-VERIFICATION.md (floor: 20; 39 were counted when this contract was written). ' +
        'D-37-03 requires every Evidence cell to cite a file:line range from the current ' +
        'tree, never a SUMMARY reference — a low count signals the document drifted back ' +
        'toward restating plan SUMMARY prose instead of re-deriving evidence.',
    ).toBeGreaterThanOrEqual(20);

    // "SUMMARY" is allowed in prose explaining that SUMMARY was NOT used as evidence, but
    // must never appear inside a markdown TABLE ROW (an Evidence cell is always a table
    // row starting with "|") — that would be exactly the failure T-37-03-01 targets.
    const tableRowsCitingSummary = verificationContent
      .split('\n')
      .filter((line) => line.trimStart().startsWith('|') && line.includes('SUMMARY'));

    expect(
      tableRowsCitingSummary,
      'One or more table rows (Evidence cells) in 34-VERIFICATION.md cite "SUMMARY" ' +
        'directly, instead of a file:line range from the current tree. Offending rows: ' +
        JSON.stringify(tableRowsCitingSummary),
    ).toEqual([]);
  });

  it('c) 34-REVIEW.md is >= 90 lines, carries files_reviewed_list in its frontmatter, and its Summary states an explicit scope naming what was NOT examined', () => {
    const lineCount = reviewContent.split('\n').length;
    expect(
      lineCount,
      `34-REVIEW.md is only ${String(lineCount)} lines. 37-04-PLAN.md's artifact min_lines ` +
        'is 90.',
    ).toBeGreaterThanOrEqual(90);

    const frontmatter = extractFrontmatter(reviewContent);
    expect(
      /^files_reviewed_list:\s*$/m.test(frontmatter),
      '34-REVIEW.md frontmatter is missing "files_reviewed_list:" as a YAML block sequence.',
    ).toBe(true);

    const summary = extractMarkdownSection(reviewContent, /^## Summary\s*$/);

    // Pin the scope statement itself (37-04-PLAN's must_have: a future reader cannot
    // mistake this for a full 13-plan review).
    expect(
      /SCOPED review, not a phase-wide one/i.test(summary),
      '34-REVIEW.md\'s ## Summary no longer states the scope decision itself ("a SCOPED ' +
        'review, not a phase-wide one"). Without this, a future reader could mistake a ' +
        'partial review for a full one — exactly what 37-04-PLAN.md\'s must_have exists to ' +
        'prevent.',
    ).toBe(true);

    // Pin that the scope decision names what was NOT examined, not only what was
    // (37-04-PLAN.md: "the scope decision names what was NOT examined, not only what was").
    expect(
      /does\s+\*{0,2}NOT\*{0,2}\s+examine/i.test(summary),
      '34-REVIEW.md\'s ## Summary does not state what it does NOT examine. 37-04-PLAN.md ' +
        'requires the scope decision to name what was excluded, not merely imply it via the ' +
        'files_reviewed_list.',
    ).toBe(true);
  });

  it('d) every path in 34-REVIEW.md\'s files_reviewed_list still resolves on disk (continuous, not spot-checked once)', () => {
    const frontmatter = extractFrontmatter(reviewContent);
    const filesReviewedList = extractYamlList(frontmatter, 'files_reviewed_list');

    expect(
      filesReviewedList.length,
      '34-REVIEW.md\'s files_reviewed_list parsed to zero entries — either the frontmatter ' +
        'is malformed or this test\'s parser has drifted from its actual shape.',
    ).toBeGreaterThan(0);

    const unresolved = filesReviewedList.filter((relativePath) => !existsSync(join(REPO_ROOT, relativePath)));

    // 37-VERIFICATION.md claims it spot-checked path resolution for 34-REVIEW.md's
    // files_reviewed_list. This assertion makes that claim continuous rather than a
    // one-time check: every path is re-resolved on every run of this suite. Per the gap
    // instructions, checked first whether any already fail TODAY before writing this
    // assertion — none do, as of this writing (all 21 entries resolve) — so the
    // assertion is written straight, not weakened to tolerate a known failure.
    expect(
      unresolved,
      'One or more paths in 34-REVIEW.md\'s files_reviewed_list no longer resolve on disk: ' +
        JSON.stringify(unresolved) + '. If a later phase legitimately moved or deleted one ' +
        'of these files, that is real drift worth surfacing (the review document now cites ' +
        'evidence that no longer exists) — investigate and correct the review document\'s ' +
        'own record, do not silently narrow this list.',
    ).toEqual([]);
  });
});
