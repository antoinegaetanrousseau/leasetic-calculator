/**
 * Phase 38 Nyquist gaps CLOSE-02 (plan 38-03) and CLOSE-08 (plan 38-04) — both flagged
 * MISSING in the Phase 38 validation pass. Precedent:
 * `tests/phase-37-closure-artifacts.test.ts` (same shape: named-gate `describe` blocks,
 * per-contract prose docblocks, planning-document text contracts rather than rendering
 * assertions — this phase's rendering claims were verified by a human-supervised browser
 * walk, not by this suite, which only pins the durable planning-document RECORD of that
 * walk).
 *
 * ============================================================================
 * WHY THE 38-* PATHS ARE LITERAL, NOT ARCHIVE-RESOLVED
 * ============================================================================
 * `tests/_planning-docs.ts`'s `resolvePhaseDoc()` exists because CLOSE-07 (Phase 40) will
 * move phases 28-35 into `.planning/milestones/*-phases/`. Phase 38 is NOT in that 28-35
 * range, so a literal `.planning/phases/38-shell-dialogs-visual-conventions/...` path is
 * used for every 38-* document below. Using the archive resolver for a path CLOSE-07
 * structurally cannot move would be worse than a literal path, not better: if
 * `38-UAT.md` or `evidence/` ever genuinely disappeared, the archive-resilient resolver
 * would keep searching a second location that was never a valid home for it and could
 * mask the disappearance behind a misleading "not found in either location" message
 * pointing partly at the wrong place. `31.1-VERIFICATION.md`, by contrast, genuinely IS a
 * pre-CLOSE-07 phase (31.1) and DOES need `resolvePhaseDoc()` — see the CLOSE-02 describe
 * block below.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { MILESTONE_ARCHIVES_DIR, readPhaseDoc, resolvePhaseDoc } from './_planning-docs';

const REPO_ROOT = process.cwd();
const PHASE_38_DIR = join(REPO_ROOT, '.planning/phases/38-shell-dialogs-visual-conventions');
const UAT_PATH = join(PHASE_38_DIR, '38-UAT.md');
const VERIFICATION_PATH = join(PHASE_38_DIR, '38-VERIFICATION.md');
const EVIDENCE_DIR = join(PHASE_38_DIR, 'evidence');
const REQUIREMENTS_PATH = join(REPO_ROOT, '.planning/REQUIREMENTS.md');

function read(p: string): string {
  return readFileSync(p, 'utf8');
}

/** The markdown section starting at the first line matching `headingPattern`, up to (not
 * including) the next heading of equal or shallower level. Same house-style helper as
 * `tests/phase-37-closure-artifacts.test.ts` (kept local rather than shared, per that
 * file's extraction note — only the resolver itself was promoted to a shared module). */
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

function extractFrontmatter(content: string): string {
  const match = /^---\n([\s\S]*?)\n---/.exec(content);
  if (!match) {
    throw new Error('No YAML frontmatter block found (expected a leading "---" ... "---" pair).');
  }
  return match[1];
}

// ===========================================================================
// GAP 2 — CLOSE-02 (plan 38-03): Phase 31.1's two abandoned human checks, closed via
// the Phase 38 walk, and 31.1-VERIFICATION.md's flip to status: passed
// ===========================================================================

describe('CLOSE-02 — 31.1-VERIFICATION.md reads status: passed, earned by the Phase 38 walk', () => {
  it('a) resolvePhaseDoc(31.1, "31.1-VERIFICATION.md") resolves to 31.1-app-shell-refresh/, not the unrelated integer-31 phase directory', () => {
    // Exercises the shared resolver against a genuinely decimal phase number on the REAL
    // repo (not a fixture) — the fixture-level proof (including the decoy that an
    // unescaped-regex implementation would have matched) lives in
    // tests/planning-docs-resolver.test.ts; this is the real-repo consumer contract.
    const resolved = resolvePhaseDoc(31.1, '31.1-VERIFICATION.md');
    expect(resolved).toBe(
      join(MILESTONE_ARCHIVES_DIR, 'v1.6-phases', '31.1-app-shell-refresh', '31.1-VERIFICATION.md'),
    );
    expect(
      resolved.includes('31-reconciliation-engine-proposal-extraction'),
      'resolvePhaseDoc(31.1, ...) resolved into the unrelated integer-31 phase directory ' +
        '(31-reconciliation-engine-proposal-extraction) instead of 31.1-app-shell-refresh. ' +
        '.planning/milestones/v1.6-phases/ contains BOTH ' +
        '"31-reconciliation-engine-proposal-extraction" and "31.1-app-shell-refresh" — a ' +
        'resolver that does not treat "31.1" as a literal string (e.g. one that lets "." ' +
        'match any character) risks conflating the two.',
    ).toBe(false);
  });

  it('b) frontmatter status reads exactly "passed" and cites 38-UAT.md as the walk that produced it', () => {
    const content = readPhaseDoc(31.1, '31.1-VERIFICATION.md');
    const frontmatter = extractFrontmatter(content);

    expect(
      /^status:\s*passed\s*$/m.test(frontmatter),
      '31.1-VERIFICATION.md frontmatter "status:" is not exactly "passed". CLOSE-02 names ' +
        'this flip as its literal closing condition, gated on the walk actually passing ' +
        '(38-04-PLAN.md task 3: "flip 31.1-VERIFICATION.md status ONLY IF both checks ' +
        'actually pass"). Frontmatter:\n' + frontmatter,
    ).toBe(true);

    expect(
      frontmatter.includes('38-UAT'),
      '31.1-VERIFICATION.md\'s frontmatter does not cite "38-UAT" anywhere. Per 38-03-' +
        'PLAN.md\'s key_link, the status flip must cite the walk that produced it so a ' +
        'later reader can trace the evidence rather than take the status on faith.',
    ).toBe(true);
  });

  it('c) the evidence/ directory exists, is non-empty, and 38-UAT.md references it (using a LITERAL path, per this file\'s own docblock on why 38-* is not archive-resolved)', () => {
    expect(
      existsSync(EVIDENCE_DIR),
      `${EVIDENCE_DIR} does not exist. CLOSE-02/D-38-06 require the filmstrip frames and ` +
        'any failure screenshots to be committed as reviewable evidence, not asserted in prose.',
    ).toBe(true);

    const files = readdirSync(EVIDENCE_DIR);
    expect(
      files.length,
      `${EVIDENCE_DIR} exists but is empty. A committed-but-empty evidence directory is ` +
        'indistinguishable from "the walk never produced evidence" to a later reader.',
    ).toBeGreaterThan(0);

    const uatContent = read(UAT_PATH);
    expect(
      uatContent.includes('evidence/'),
      '38-UAT.md does not reference "evidence/" anywhere, so a reader following the ' +
        'document has no pointer into the committed filmstrip/screenshot directory.',
    ).toBe(true);
  });
});

// ===========================================================================
// GAP 3 — CLOSE-08 (plan 38-04): the requirement-ledger filing that the verifier's Gap 1
// caught as missing, now genuinely filed — and the two Post-Verification Resolution
// "accepted, not closed" honesty contracts that must NOT be quietly upgraded to a pass
// by a future edit.
// ===========================================================================

describe('CLOSE-08 — F-38-03/F-38-06 are genuinely filed in REQUIREMENTS.md (the verifier\'s Gap 1 defect, now fixed)', () => {
  const requirements = read(REQUIREMENTS_PATH);

  it('a) HOUSE-05 and HOUSE-06 exist as real requirement rows AND in the traceability table, both mapped to Phase 40', () => {
    expect(
      /^- \[[ x]\] \*\*HOUSE-05\*\*/m.test(requirements),
      'REQUIREMENTS.md has no "- [ ] **HOUSE-05**" / "- [x] **HOUSE-05**" requirement-list ' +
        'row. The verifier\'s Gap 1 failed specifically because F-38-03 was recorded ONLY ' +
        'as a 38-UAT.md footnote ("filed for a later phase") with nothing added to the ' +
        'project\'s established ledger — "a UAT footnote that says filed is not the same ' +
        'as being filed" (38-VERIFICATION.md).',
    ).toBe(true);
    expect(
      /^- \[[ x]\] \*\*HOUSE-06\*\*/m.test(requirements),
      'REQUIREMENTS.md has no "- [ ] **HOUSE-06**" / "- [x] **HOUSE-06**" requirement-list ' +
        'row (F-38-06\'s filing).',
    ).toBe(true);

    const traceability = extractMarkdownSection(requirements, /^## Traceability\s*$/);
    expect(
      /\|\s*HOUSE-05\s*\|\s*Phase 40[^|]*\|/.test(traceability),
      'The Traceability table does not map HOUSE-05 to Phase 40. Traceability section:\n' +
        traceability,
    ).toBe(true);
    expect(
      /\|\s*HOUSE-06\s*\|\s*Phase 40[^|]*\|/.test(traceability),
      'The Traceability table does not map HOUSE-06 to Phase 40. Traceability section:\n' +
        traceability,
    ).toBe(true);
  });

  it('b) the coverage line states the real, current count (re-derived from the traceability table, not hardcoded from the verification report\'s prose)', () => {
    const traceability = extractMarkdownSection(requirements, /^## Traceability\s*$/);

    // Derive the coverage number independently rather than trusting either
    // 38-VERIFICATION.md's prose ("22/22 -> 24/24") or a hardcoded literal here: count the
    // requirement rows in the traceability table itself.
    const idRows = traceability.match(/^\|\s*[A-Z]+-\d+\s*\|/gm) ?? [];
    expect(
      idRows.length,
      'Could not find any "| XXX-NN |" requirement rows in the Traceability table to ' +
        'derive a coverage count from — this test\'s table-row pattern has likely drifted ' +
        'from the real file shape.',
    ).toBeGreaterThan(0);

    const coverageLineMatch = /\*\*Coverage:\s*(\d+)\/(\d+)[^*]*\*\*/.exec(requirements);
    expect(
      coverageLineMatch,
      'REQUIREMENTS.md has no "**Coverage: N/M ...**" line in its Traceability section.',
    ).not.toBeNull();

    const [, numerator, denominator] = coverageLineMatch!;
    expect(
      Number(numerator),
      `The Coverage line's numerator (${numerator}) does not match the number of ` +
        `requirement rows actually present in the Traceability table (${String(idRows.length)}).`,
    ).toBe(idRows.length);
    expect(
      Number(denominator),
      `The Coverage line's denominator (${denominator}) does not match the number of ` +
        `requirement rows actually present in the Traceability table (${String(idRows.length)}).`,
    ).toBe(idRows.length);

    // Cross-check against the verification report's own claimed post-fix number (24/24),
    // pinning the REAL current text rather than assuming it never changes again.
    expect(
      numerator,
      'REQUIREMENTS.md\'s Coverage numerator has drifted from 24 (the count after HOUSE-05/' +
        'HOUSE-06 were filed, per 38-VERIFICATION.md\'s Post-Verification Resolution: ' +
        '"Coverage 22/22 -> 24/24"). If this is intentional (more requirements were filed ' +
        'since), update this pin; if not, investigate what regressed.',
    ).toBe('24');
  });

  it('c) 38-UAT.md\'s F-38-03 and F-38-06 finding rows carry the REAL requirement IDs, not the rejected "open — filed for a later phase" wording', () => {
    const uat = read(UAT_PATH);

    const f38_03Section = extractMarkdownSection(uat, /^### F-38-03 /);
    const f38_06Section = extractMarkdownSection(uat, /^### F-38-06 /);

    expect(
      f38_03Section.includes('status: filed as HOUSE-05'),
      'F-38-03\'s section in 38-UAT.md no longer reads "status: filed as HOUSE-05" — the ' +
        'exact defect the verifier caught was this section instead reading the ' +
        'aspirational "status: open — filed for a later phase" with no corresponding ' +
        'REQUIREMENTS.md entry. Section:\n' + f38_03Section.slice(0, 300),
    ).toBe(true);
    expect(
      f38_06Section.includes('status: filed as HOUSE-06'),
      'F-38-06\'s section in 38-UAT.md no longer reads "status: filed as HOUSE-06". Section:\n' +
        f38_06Section.slice(0, 300),
    ).toBe(true);

    // Direction check: the rejected phrase must be genuinely gone from BOTH finding
    // sections, not merely absent from the specific line matched above (e.g. it could
    // still be present later in the same section as an unresolved leftover).
    expect(f38_03Section).not.toContain('open — filed for a later phase');
    expect(f38_06Section).not.toContain('open — filed for a later phase');
  });
});

describe('CLOSE-08 honesty contracts — the two accepted-not-closed gaps stay visibly UNCLOSED (must not be silently upgraded to a pass)', () => {
  it('d) 38-UAT.md\'s CLOSE-08 table still records wizard step 1 and the LC-references "Charger plus" control as NOT observed/not observable — never as a pass', () => {
    const uat = read(UAT_PATH);
    const closeSection = extractMarkdownSection(uat, /^## CLOSE-08 /);
    const rows = closeSection.split('\n').filter((l) => l.trimStart().startsWith('|'));

    const wizardRow = rows.find((r) => r.includes('Wizard step 1') && r.includes('| 1 |'));
    const lcRow = rows.find((r) => r.includes('| 5c |'));

    expect(
      wizardRow,
      'Could not find the CLOSE-08 table row for surface #1 (Wizard step 1). CLOSE-08 ' +
        'table rows found:\n' + rows.join('\n'),
    ).toBeDefined();
    expect(
      wizardRow!.includes('not observable'),
      'The Wizard step 1 row no longer records "not observable". A future edit quietly ' +
        'upgrading this to "pass" without a real dark-theme observation (which is ' +
        'structurally blocked — see F-38-04) would be exactly the failure mode this ' +
        'contract exists to catch. Row: ' + String(wizardRow),
    ).toBe(true);
    expect(
      wizardRow!.toLowerCase().includes('| pass |') || / \| pass \|/i.test(wizardRow!),
      'The Wizard step 1 row appears to record a bare "pass" result cell alongside "not ' +
        'observable" — it must not read as a pass. Row: ' + String(wizardRow),
    ).toBe(false);

    expect(
      lcRow,
      'Could not find the CLOSE-08 table row for surface #5c (LC references). Rows:\n' +
        rows.join('\n'),
    ).toBeDefined();
    expect(
      lcRow!.includes('not observable'),
      'The LC-references (#5c) row no longer records "not observable" — the "Charger ' +
        'plus" pagination control genuinely was never rendered/measured (single-page ' +
        'dataset, F-38-06). Row: ' + String(lcRow),
    ).toBe(true);
  });

  it('e) 38-VERIFICATION.md\'s Post-Verification Resolution still states the two partial gaps are "accepted, not closed", and the three-row blocker table survives', () => {
    const verification = read(VERIFICATION_PATH);
    const resolution = extractMarkdownSection(
      verification,
      /^## Post-Verification Resolution/,
    );

    expect(
      resolution.includes('accepted, not closed'),
      'The Post-Verification Resolution section no longer contains the phrase "accepted, ' +
        'not closed". This is the operator\'s explicit, dated framing for gaps 2 and 3 — ' +
        'losing this phrase (e.g. via a rewrite to "resolved" or "closed") would silently ' +
        'upgrade a disclosed, structurally-blocked gap into a false pass.',
    ).toBe(true);

    // The three-row blocker table: wizard-step-1-dark, LC-references Charger-plus, and
    // dialog.tsx FR/EN. Pinned by their distinguishing blocker text (CRM-02 / nextCursor /
    // F-38-04) rather than by exact row formatting, so minor markdown reflow doesn't
    // false-fail this contract while genuine content loss still does.
    const blockerMentions = [
      'consumes an LC reference',
      'nextCursor',
      'requireRelationshipHolder',
    ];
    for (const mention of blockerMentions) {
      expect(
        resolution.includes(mention),
        `The Post-Verification Resolution's blocker table no longer mentions "${mention}". ` +
          'All three original blocker rows (wizard-step-1-dark / LC-references pagination ' +
          '/ dialog.tsx access control) must survive verbatim enough to still name their ' +
          'real, structural cause — not be smoothed into a generic "pending" note.',
      ).toBe(true);
    }
  });

  it('f) 38-UAT.md still discloses F-38-04 (the wizard-entry write: persisted draft LC-2026-003, sequential reference consumed)', () => {
    // Deliberately does NOT adjudicate the Environment-block/F-38-04 contradiction that
    // 38-VERIFICATION.md's Anti-Patterns table flags (the "read-only ... nothing created/
    // edited/deleted" line predates this finding and was never corrected). This contract
    // only proves the DISCLOSURE itself survives — asserting the contradiction away, or
    // asserting the Environment block is "correct", would both overreach past what this
    // gap asked for.
    const uat = read(UAT_PATH);
    const f38_04Section = extractMarkdownSection(uat, /^### F-38-04 /);

    expect(
      f38_04Section.includes('LC-2026-003'),
      'F-38-04\'s section in 38-UAT.md no longer names the persisted draft\'s LC reference ' +
        '(LC-2026-003). This is the specific, disclosed write the walk\'s read-only premise ' +
        'did not anticipate — losing the concrete reference number would weaken the ' +
        'disclosure from a verifiable fact to a vague mention.',
    ).toBe(true);
    expect(
      /sequential.*reference.*consum|consum.*sequential.*reference/is.test(f38_04Section),
      'F-38-04\'s section no longer states that a sequential LC reference was consumed. ' +
        'Section:\n' + f38_04Section.slice(0, 500),
    ).toBe(true);
  });
});
