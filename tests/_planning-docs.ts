/**
 * Shared phase-document resolver, extracted from `tests/phase-37-closure-artifacts.test.ts`
 * during the Phase 38 Nyquist gap-fill pass (CLOSE-02/CLOSE-08 gap coverage).
 *
 * This is a helper module, NOT a test file — `vitest.config.ts`'s include glob is
 * `tests/**\/*.test.ts` (plus `.tsx`), so this bare `.ts` file is typechecked and linted
 * but never collected as a suite. Same convention as `tests/_db-guard-fixtures.ts`.
 *
 * ============================================================================
 * WHY THE ARCHIVE-RESILIENT RESOLVER EXISTS (read this before touching a path)
 * ============================================================================
 * Phase 40 (CLOSE-07, not yet started as of this writing) will MOVE
 * `.planning/phases/28-*` through `.planning/phases/35-*` into
 * `.planning/milestones/v{X.Y}-phases/<N>-<slug>/` — exactly the shape already used for
 * phases 26/27 (`.planning/milestones/v1.5-phases/26-active-expired-row-actions/`,
 * confirmed on disk at the time this file was written). Any suite asserting on a document
 * that lives in the 28-35 range CLOSE-07 will move would go red the moment Phase 40 does
 * its job correctly — not because a requirement regressed, but because the document
 * moved. `resolvePhaseDoc()` below globs by the phase-NUMBER prefix (the slug is allowed
 * to change; the number is not) across BOTH candidate homes, so callers keep working
 * before and after CLOSE-07 lands. Do not "simplify" this back to a literal path.
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
 * DECIMAL PHASE NUMBERS (fixed during this extraction — see Phase 38 CLOSE-02 gap-fill
 * report). The original inline implementation built its prefix regex as
 * `new RegExp('^' + phaseNumber + '-')` with the phase number interpolated RAW. For an
 * integer phase number this is harmless (no regex metacharacters in "37"), but
 * `.planning/phases/` also contains a decimal phase directory
 * (`31.1-app-shell-refresh`, alongside the unrelated `31-reconciliation-engine-proposal-
 * extraction`), and "31.1" contains a literal "." — an unescaped regex metacharacter that
 * matches ANY character, not just a literal dot. That means the raw-interpolated version
 * would also match a hypothetical "3141-..." or "31x1-..." directory, producing a spurious
 * "found in more than one location" ambiguity error for a phase number that has nothing to
 * do with that unrelated directory. `escapeRegExpLiteral()` below fixes this by escaping
 * the phase number before it reaches `RegExp()`, so "31.1" only ever matches a literal
 * "31.1" prefix. Proven by a decoy-directory fixture test in
 * `tests/planning-docs-resolver.test.ts` ("...decimal phase number..."). The real-repo
 * case (31.1 resolving to `31.1-app-shell-refresh`, not `31-reconciliation-...`) already
 * worked before this fix, because "31-reconciliation-..." fails the pattern for an
 * unrelated reason (its 4th character is "r", not the literal "1" the pattern demands
 * after the wildcard) — the fix closes the LATENT bug (spurious ambiguity against an
 * unrelated decoy), not the specific case this repo happens to already get right.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const REPO_ROOT = process.cwd();
export const LEGACY_PHASES_DIR = join(REPO_ROOT, '.planning/phases');
export const MILESTONE_ARCHIVES_DIR = join(REPO_ROOT, '.planning/milestones');

/** Escapes every regex metacharacter in `s` so it can be interpolated into a `RegExp`
 * literally. Without this, a phase number containing "." (e.g. "31.1") would build a
 * prefix pattern where "." matches ANY character, not just a literal dot — see the module
 * docblock's "DECIMAL PHASE NUMBERS" section. */
function escapeRegExpLiteral(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Directories directly under `root` whose name starts with `<phaseNumber>-`. */
export function findPhaseDirsByNumber(root: string, phaseNumber: number): string[] {
  if (!existsSync(root)) return [];
  const prefix = new RegExp(`^${escapeRegExpLiteral(String(phaseNumber))}-`);
  return readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && prefix.test(e.name))
    .map((e) => join(root, e.name));
}

/** Every `<phaseNumber>-*` directory nested one level inside any `*-phases` milestone archive. */
export function findArchivedPhaseDirsByNumber(milestoneArchivesDir: string, phaseNumber: number): string[] {
  if (!existsSync(milestoneArchivesDir)) return [];
  const archiveDirs = readdirSync(milestoneArchivesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /-phases$/.test(e.name))
    .map((e) => join(milestoneArchivesDir, e.name));
  return archiveDirs.flatMap((dir) => findPhaseDirsByNumber(dir, phaseNumber));
}

/**
 * Resolves a Phase N planning document by phase number + filename, searching both the
 * pre-CLOSE-07 location (.planning/phases/<N>-(anything)/<filename>) and the
 * post-CLOSE-07 archive location
 * (.planning/milestones/(anything)-phases/<N>-(anything)/<filename>). Throws loudly
 * (never returns undefined/null) if the file is in neither or in both locations — see the
 * module docblock for why both are genuine failures worth surfacing, not just the first.
 *
 * `phaseNumber` may be a decimal (e.g. `31.1`) — see the module docblock.
 */
export function resolvePhaseDoc(
  phaseNumber: number,
  filename: string,
  opts: { legacyPhasesDir?: string; milestoneArchivesDir?: string } = {},
): string {
  const legacyRoot = opts.legacyPhasesDir ?? LEGACY_PHASES_DIR;
  const archivesRoot = opts.milestoneArchivesDir ?? MILESTONE_ARCHIVES_DIR;

  const legacyMatches = findPhaseDirsByNumber(legacyRoot, phaseNumber)
    .map((d) => join(d, filename))
    .filter(existsSync);
  const archivedMatches = findArchivedPhaseDirsByNumber(archivesRoot, phaseNumber)
    .map((d) => join(d, filename))
    .filter(existsSync);

  if (legacyMatches.length === 0 && archivedMatches.length === 0) {
    throw new Error(
      `Phase ${String(phaseNumber)} document "${filename}" was not found in EITHER location ` +
        `searched: (1) ${legacyRoot}/${String(phaseNumber)}-*/${filename}  (2) ${archivesRoot}/` +
        `*-phases/${String(phaseNumber)}-*/${filename}. This is a genuine failure, not a path bug ` +
        '— CLOSE-07 (Phase 40) is the only process expected to move this document, and it has ' +
        'not landed in either of its two valid homes.',
    );
  }
  if (legacyMatches.length > 0 && archivedMatches.length > 0) {
    throw new Error(
      `Phase ${String(phaseNumber)} document "${filename}" was found in BOTH locations — a ` +
        `half-completed CLOSE-07 archive migration. legacy=${JSON.stringify(legacyMatches)} ` +
        `archived=${JSON.stringify(archivedMatches)}. This is a real defect worth surfacing, not ` +
        'a case to silently resolve by preferring one copy.',
    );
  }
  const matches = legacyMatches.length > 0 ? legacyMatches : archivedMatches;
  if (matches.length > 1) {
    throw new Error(
      `Phase ${String(phaseNumber)} document "${filename}" resolved to more than one file within ` +
        `the SAME location (ambiguous phase-number prefix): ${JSON.stringify(matches)}.`,
    );
  }
  return matches[0];
}

/** Convenience wrapper: resolve + read as utf8. Not part of the original "move verbatim"
 * instruction's named export list, but trivial (three lines, no independent logic) and
 * every consumer of `resolvePhaseDoc()` immediately calls `readFileSync` on the result, so
 * it is exported here rather than re-implemented in every test file that needs it. */
export function readPhaseDoc(phaseNumber: number, filename: string): string {
  return readFileSync(resolvePhaseDoc(phaseNumber, filename), 'utf8');
}

/**
 * Resolves the ONE requirement ledger containing `marker`, searching the live ledger first
 * and then the milestone archives (newest first).
 *
 * ============================================================================
 * WHY THIS EXISTS (added at the v1.8 milestone close)
 * ============================================================================
 * `/gsd-complete-milestone` archives `.planning/REQUIREMENTS.md` to
 * `.planning/milestones/v{X.Y}-REQUIREMENTS.md` and then `git rm`s the live file, so the
 * next milestone starts from a fresh ledger. Any suite that hardcodes
 * `.planning/REQUIREMENTS.md` therefore goes red at every milestone close — not because a
 * requirement regressed, but because the ledger was archived exactly as designed. That is
 * what happened to `tests/phase-38-closure-artifacts.test.ts` when v1.8 closed.
 *
 * WHY THIS RETURNS ONE FILE AND NOT ALL OF THEM CONCATENATED. The first attempt at this
 * helper joined every candidate ledger into one string. That resolves the ID lookup but
 * destroys document structure: callers that extract a named section (`## Traceability`,
 * `## Coverage`) then read the FIRST such section across eight concatenated milestones —
 * v1.1's 108-requirement table instead of v1.8's 24 — and fail with a confusing count
 * mismatch that looks like a requirements regression. A ledger is a structured document,
 * so the caller must get exactly one.
 *
 * `marker` should identify the requirement whose ledger you want (e.g. the HOUSE-05 row).
 * Throws loudly, naming every file searched, if no ledger matches — a genuinely missing
 * requirement must not read as "file not found" from an opaque fs call.
 */
export function resolveRequirementLedger(
  marker: RegExp,
  opts: { repoRoot?: string } = {},
): string {
  const root = opts.repoRoot ?? REPO_ROOT;
  const live = join(root, '.planning/REQUIREMENTS.md');
  const archivesRoot = join(root, '.planning/milestones');

  const candidates: string[] = [];
  if (existsSync(live)) candidates.push(live);
  if (existsSync(archivesRoot)) {
    candidates.push(
      ...readdirSync(archivesRoot, { withFileTypes: true })
        .filter((e) => e.isFile() && /-REQUIREMENTS\.md$/.test(e.name))
        .map((e) => join(archivesRoot, e.name))
        .sort()
        .reverse(),
    );
  }

  for (const candidate of candidates) {
    if (marker.test(readFileSync(candidate, 'utf8'))) return candidate;
  }
  throw new Error(
    `No requirement ledger matching ${String(marker)} was found. Searched ${candidates.length} ` +
      `ledger(s): ${JSON.stringify(candidates)}. The live ledger exists before a milestone close; ` +
      'its archive exists after. If neither matches, the requirement is genuinely absent.',
  );
}

/** Convenience wrapper: resolve + read as utf8. */
export function readRequirementLedger(marker: RegExp): string {
  return readFileSync(resolveRequirementLedger(marker), 'utf8');
}
