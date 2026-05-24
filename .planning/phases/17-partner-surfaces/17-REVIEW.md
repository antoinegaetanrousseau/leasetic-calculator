---
phase: 17-partner-surfaces
reviewed: 2026-05-24T00:00:00Z
depth: standard
files_reviewed: 28
files_reviewed_list:
  - app/(authed)/page.test.tsx
  - app/(authed)/page.tsx
  - app/(authed)/proposals/_components/FilterPillRow.test.tsx
  - app/(authed)/proposals/_components/FilterPillRow.tsx
  - app/(authed)/proposals/new/_actions/updateValidity.action.ts
  - app/(authed)/proposals/new/_components/PdfPreviewMock.test.tsx
  - app/(authed)/proposals/new/_components/PdfPreviewMock.tsx
  - app/(authed)/proposals/new/_components/RecapSection.tsx
  - app/(authed)/proposals/new/_components/ValiditySelectorClient.test.tsx
  - app/(authed)/proposals/new/_components/ValiditySelectorClient.tsx
  - app/(authed)/proposals/new/calcul/page.test.tsx
  - app/(authed)/proposals/new/calcul/page.tsx
  - app/(authed)/proposals/new/parametres/page.tsx
  - app/(authed)/proposals/new/verification/page.test.tsx
  - app/(authed)/proposals/new/verification/page.tsx
  - app/(authed)/proposals/page.test.tsx
  - app/(authed)/proposals/page.tsx
  - docs/accessibility/16-contrast-audit.md
  - src/lib/api/proposals/finalize-wizard.test.ts
  - src/lib/api/proposals/finalize-wizard.ts
  - src/lib/api/proposals/list.test.ts
  - src/lib/api/proposals/list.ts
  - src/lib/db/queries/proposal-aggregates.test.ts
  - src/lib/db/queries/proposal-aggregates.ts
  - src/lib/db/queries/proposals.test.ts
  - src/lib/db/queries/proposals.ts
  - src/lib/i18n/dictionaries.ts
  - src/lib/pdf/no-commission.test.ts
findings:
  critical: 0
  warning: 6
  info: 7
  total: 13
status: issues_found
---

# Phase 17: Code Review Report

**Reviewed:** 2026-05-24
**Depth:** standard
**Files Reviewed:** 28
**Status:** issues_found

## Summary

Phase 17 ships the partner-surface rewrite: Partner Home rebuild (PageHero + 3 MetricTiles + 5-row recent list), a dedicated `/proposals` route with an Archivées filter pill, a per-proposal validity selector on wizard step 3, and the inversion of `lc_ref` allocation from finalize to draft creation. Threat-modelled IDOR mitigations (requireUser-first, userId-as-first-AND-predicate) are consistently applied and well-tested across `buildListResponse`, the aggregate helpers, `updateValidityAction`, and the three wizard routes. ADMIN-09 commission invariants are preserved (PdfPreviewMock has no commission prop, finalize-wizard renders no commission, 30-fixture golden corpus + binary PDF scan still in place).

No critical security or correctness defects were surfaced. Findings cluster around:

1. A localization regression in `ValiditySelectorClient` (hardcoded "j" suffix shipped to English users despite EN dictionary keys existing).
2. Several latent quality issues left by intentional shortcuts the comments document (archived-branch pagination correctness, lcRef text-sort assumption, retry-on-any-error swallowing).
3. Dead-code/duplicate-key drift in the i18n dictionary (`dashboard.cta.new` vs `dashboard.cta.new.proposal`, `wizard.step2.row.commission*` vs `wizard.step2.detail.commission*`).
4. Tests with weak assertions that under-cover what their docstrings promise (Test 5 of FilterPillRow.test.tsx duplicates AC-FPR-03, Test 4 of proposal-aggregates.test.ts cannot actually prove what its name claims).

## Structural Findings (fallow)

No `<structural_findings>` block was provided by the orchestrator for this review; cross-module surface-level claims below are derived from direct narrative review only.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: ValiditySelectorClient hardcodes French "j" suffix, breaks English UX

**File:** `app/(authed)/proposals/new/_components/ValiditySelectorClient.tsx:79`
**Issue:** The validity buttons render `{days}j` as a string literal. The `j` is a French abbreviation for *jours*. The dictionary defines `proposal.validity.days15/30/60` with EN values `15d/30d/60d` (`src/lib/i18n/dictionaries.ts:1035-1037`) and FR values `15j/30j/60j` (lines 329-331) precisely to support both languages, but the component never reads them. English partners see "15j / 30j / 60j" — a regression vs the i18n contract documented in the same component's own `lang: Lang` prop and the EN dictionary additions made in this phase.

This is masked by Test AC-VSC-06 (`ValiditySelectorClient.test.tsx:108-115`) which only asserts the FR text content via `name: /15j/i` regex, and by Test 16 in `verification/page.test.tsx:521-524` which also runs only in FR. There is no EN render assertion for the selector.

**Fix:**
```tsx
// In ValiditySelectorClient.tsx, line ~70-82:
const LABEL_KEY: Record<15 | 30 | 60, 'proposal.validity.days15' | 'proposal.validity.days30' | 'proposal.validity.days60'> = {
  15: 'proposal.validity.days15',
  30: 'proposal.validity.days30',
  60: 'proposal.validity.days60',
};

return (
  <div className="dg" role="group" aria-label={t('proposal.validity.ariaLabel', lang)} data-testid="validity-selector">
    {OPTIONS.map((days) => {
      const isActive = selected === days;
      return (
        <button
          key={days}
          type="button"
          className={`db${isActive ? ' on' : ''}`}
          onClick={() => handleChange(days)}
          aria-pressed={isActive}
        >
          {t(LABEL_KEY[days], lang)}
        </button>
      );
    })}
  </div>
);
```

Also add at least one EN-language render test to `ValiditySelectorClient.test.tsx` to prevent regression.

### WR-02: Archived-list cursor pagination can silently truncate results

**File:** `src/lib/db/queries/proposals.ts:200-219` (and `:312-326` for the search twin)
**Issue:** The archived branch fetches `limit(fetchCount * 3)` candidate rows, then filters app-side via `deriveDisplayStatus` to keep only `expired | deleted` rows. `hasMore` is computed from the *post-filter* count vs `limit`, and `nextCursor` is built from the last surviving row's `(createdAt, id)`.

Failure mode: if a partner has a long run of `active` (not-yet-expired) candidates that get filtered out, the SQL `limit(fetchCount * 3)` cap will truncate the candidate set *before* enough archived rows are collected. The function returns `hasMore: false` even though more archived rows exist past the truncation boundary. The cursor returned will skip the missed rows entirely on subsequent fetches.

The comment at line 197-199 acknowledges this trade-off ("pagination boundary correctness in degraded edge cases is acceptable for v1.3 partner volume (<1000 rows/partner)"). For a v1.3 internal tool this is defensible, but the failure is silent — there is no log, no warning, and no test exercising the truncation path. A partner with 500+ active-not-yet-expired rows mixed with archived rows could see incorrect Archivées pagination with zero signal.

**Fix:** At minimum, add an integration test that exercises the candidate-truncation boundary (e.g., 100 active-recent rows + 50 expired rows interleaved; assert all 50 expired appear across paginated fetches). Better: emit a one-time `console.warn` when `candidateRows.length === fetchCount * 3` AND `narrowed.length < limit`, so the future Phase that addresses this trade-off has telemetry. Best: push the expired-derivation predicate into SQL using a computed `pdf_generated_at + (params_snapshot->>'validityDays')::int * interval '1 day'` expression so the candidate truncation can never drop archived rows.

### WR-03: createDraft retry catches ALL insert errors, not just unique_violation

**File:** `src/lib/db/queries/proposals.ts:571-583`
**Issue:** The retry loop documentation (lines 574-580) explicitly states it cannot reliably check SQLSTATE 23505, so it retries on any insert error. This swallows real bugs — a NULL constraint violation, a CHECK constraint failure, a connection error, or even a syntax error in the INSERT (introduced by a future schema change) would burn through `ALLOCATE_RETRY_MAX=3` retries and surface as a generic "lc_ref allocation exhausted retries" message, masking the root cause.

Worse: the re-SELECT inside `allocateNextLcRefForUser` will return the same suffix on every retry if the prior `INSERT` failed for a non-conflict reason, so the second and third attempts will hit the exact same constraint failure and the error swallowed will be reported as a retry exhaustion rather than the underlying CHECK violation.

**Fix:** Use Drizzle's `DrizzleError` / postgres-js error shape to test the SQLSTATE explicitly, and only retry on `23505`:
```ts
} catch (err) {
  // PostgresError carries `.code` ('23505' = unique_violation). Other errors
  // are not allocation races — surface immediately so the caller sees the real fault.
  const code = (err as { code?: string })?.code;
  if (code !== '23505') {
    throw err;
  }
  lastErr = err;
}
```

If the driver-specific shape can't be relied on, narrow the catch to `err instanceof Error && /duplicate key|unique/i.test(err.message)`. Either form is strictly safer than the current catch-all.

### WR-04: i18n duplicate/dead keys — `dashboard.cta.new` shadows `dashboard.cta.new.proposal`; `wizard.step2.row.commission*` shadows `wizard.step2.detail.commission*`

**File:** `src/lib/i18n/dictionaries.ts:298, 308`, and `:625-628, 640-641`
**Issue:** Phase 17 introduces `'dashboard.cta.new': 'Nouvelle proposition'` (line 308) alongside the existing `'dashboard.cta.new.proposal': 'Nouvelle proposition'` (line 298). Both resolve to the same FR/EN strings. The new files in this phase consume `dashboard.cta.new`; the old key is now dead but still loaded. Same pattern in EN (lines 1007, 1014).

Identical drift in the step-2 wizard recap: `'wizard.step2.row.commission'` + `'wizard.step2.row.commission.sublabel'` (Phase 13, lines 625, 628) live alongside `'wizard.step2.detail.commission'` + `'wizard.step2.detail.commissionNote'` (Phase 17, lines 640-641) with the same values. `calcul/page.tsx:220, 472` uses the new keys; `verification/page.tsx:244, 329` still uses the old keys. The dictionary now has two ways to spell the same thing — a future translation drift will break invariants because translators have no signal that the two keys are synonyms.

**Fix:** Pick one canonical key per concept. Either:
- (a) Remove `dashboard.cta.new.proposal` + `wizard.step2.row.commission*` entirely and migrate any straggling consumers, OR
- (b) Add a build-time grep that ensures dead keys are not added — run `grep -rE "t\(['\"]\w" app src` and diff against dictionary keys.

Phase 17's `dashboard.cta.new` and `wizard.step2.detail.*` should be the canonical forms; retire the older ones.

### WR-05: `archived` branch and `deleted` flag are silently exclusive but the API surface doesn't enforce it

**File:** `src/lib/api/proposals/list.ts:33-54`, `src/lib/db/queries/proposals.ts:177-220`
**Issue:** `BuildListParams` accepts both `deleted?: boolean` (v1.1 legacy, retiring) and `archived?: boolean` (Phase 17 new). Both flags are passed through to `listProposalsByUser` / `searchProposals`. Inside the helper, the `if (args.archived)` branch returns early, so `args.deleted` is silently ignored when `archived` is true.

This is a quiet contract violation: a caller passing `{ archived: true, deleted: true }` gets the archived candidate set (active-OR-deleted within 30d) instead of the deleted-only 30d window they asked for. No runtime assertion warns of the conflict. The current call sites happen not to pass both, but the type signature invites it, and a future caller (or a typo in test fixtures) would get a silently-wrong result.

**Fix:** Make the flags mutually exclusive in the type or check at runtime:
```ts
if (args.archived && args.deleted) {
  throw new Error('buildListResponse: `archived` and `deleted` are mutually exclusive');
}
```
Or model as a tagged union: `view: 'active' | 'deleted' | 'archived'`. Since the comment on line 42-43 says "Retiring with Phase 17", the cleanest fix is to delete `deleted` entirely and have callers migrate to `archived`.

### WR-06: lcRef DESC sort relies on text lex-order, breaks at 1000

**File:** `src/lib/db/queries/proposals.ts:507-531`
**Issue:** `allocateNextLcRefForUser` does `ORDER BY lc_ref DESC LIMIT 1` to find the highest prior suffix. The comment at lines 509-513 acknowledges this works *only* for same-width zero-padded suffixes. `formatLcRef` zero-pads to 3 digits minimum but allows natural-width for ≥ 1000 (line 475: `padStart(LC_REF_MIN_PAD, '0')`).

At `LC-2026-999` → `LC-2026-1000` the text DESC sort will pick `LC-2026-999` over `LC-2026-1000` because `'9' > '1'` lexicographically. Result: a partner with 1000+ proposals starts re-allocating from 1000 and immediately collides with the partial unique index, then exhausts retries.

The comment says "Real per-user volume is small (<1000 rows)" — that's a runtime invariant nothing enforces. The Phase 17 design relies on it; if a partner exceeds it (or a future migration backfills more rows), the allocator silently breaks.

**Fix:** Use a numeric sort by extracting the suffix as integer at query time. Either:
```sql
ORDER BY (regexp_replace(lc_ref, '^LC-2026-', '')::int) DESC
```
via `sql\`...\``, OR pad to a width that lasts the foreseeable future (e.g., 6 digits → 1M rows), OR — simplest — read all matching `lc_ref` for the user and compute max in JS (acceptable since volume is bounded < 1000 today and an OOM-safe 100k upper bound for the foreseeable future).

## Info

### IN-01: FilterPillRow Test 5 duplicates Test 3's assertion (false test coverage)

**File:** `app/(authed)/proposals/_components/FilterPillRow.test.tsx:85-91`
**Issue:** AC-FPR-04 renders `<FilterPillRow archived={false} />` and asserts the *Archivées* pill href. This works because the component always emits both hrefs regardless of `archived`. AC-FPR-03 already tests the same code path for the Actives pill. There is no test for the archived=true case verifying that the active pill's href is unchanged from its archived=false form. The test passes vacuously but doesn't demonstrate the behavior the docstring claims ("Archivées pill href = `/proposals?archived=1`" — verified only in one orientation).

**Fix:** Either add a second sub-case with `archived={true}` and assert the same hrefs, or rely on AC-FPR-03 as the canonical href check.

### IN-02: proposal-aggregates.test.ts Test 4 cannot actually prove its claim

**File:** `src/lib/db/queries/proposal-aggregates.test.ts:150-167`
**Issue:** The test claims to verify that soft-deleted proposals are excluded from all three counts. The mocked DB stub doesn't evaluate the WHERE predicate — it captures the Drizzle SQL expression object and returns `mockState.selectResult` unconditionally. The assertions only check that `.where()` was called with a non-null payload. The same test would pass even if the helpers dropped `isNull(deletedAt)` from the WHERE clause entirely.

**Fix:** This test gives false confidence. Either drop it (and rely on integration tests for the WHERE-shape contract) or refactor it to introspect the captured `sql` fragment string (e.g., assert `String(whereCall.payload).includes('deleted_at')`). The integration coverage in `proposals.test.ts` partially compensates but does not cover the aggregate helpers.

### IN-03: Hardcoded `'1500'` substring in commission leak-detection tests

**File:** `app/(authed)/proposals/new/calcul/page.test.tsx:447-450, 456`, `app/(authed)/proposals/new/verification/page.test.tsx:498`
**Issue:** Test 15 / Test 15 (parallel) hard-codes the commission amount string `1\s*500` to scan for leaks in hidden inputs and data attributes. The number is derived from a fixture (75000 × 2 / 100 = 1500). If anyone tweaks `DEFAULT_PARAMS.commissionPct` from `'2.0000'` to a different value, the leak test will start passing even when commission leaks (because the regex no longer matches the new amount). The pdf golden-corpus test in `no-commission.test.ts` derives `commissionAmountFor()` from the fixture, which is the correct pattern.

**Fix:** Compute the commission amount from the fixture rather than hardcoding it:
```ts
const expectedCommission = (75000 * 2) / 100; // 1500
const re = new RegExp(`${Math.floor(expectedCommission / 1000)}\\s*${expectedCommission % 1000}`);
```
…or import `formatCurrency` and `.toContain(formatCurrency(1500, 'fr'))`.

### IN-04: `recentRows.slice(0, 5)` after `buildListResponse({ limit: 5 })` is redundant

**File:** `app/(authed)/page.tsx:81`
**Issue:** `buildListResponse` is called with `limit: 5`, which already caps the result at 5 rows. The subsequent `recentList.rows.slice(0, 5)` is dead code (mathematically a no-op for any conformant implementation). Either drop the slice or drop the `limit` arg — keeping both implies one of them is a backstop the reader has to think about.

**Fix:** Remove the `.slice(0, 5)` and rely on the `limit: 5` contract. If defense-in-depth is desired, add a comment explaining why both are present.

### IN-05: Hardcoded route arrays in Stepper `hrefForStep` callbacks (parametres/calcul/verification page.tsx)

**File:** `app/(authed)/proposals/new/parametres/page.tsx:196-198`, `calcul/page.tsx:315-317`, `verification/page.tsx:276-278`
**Issue:** All three wizard step routes inline the same `['parametres', 'calcul', 'verification']` array literal inside the `hrefForStep` closure. Changing the route names (or adding a step) requires editing three files in lockstep. The Stepper component is the right place to own this mapping, but if it must stay at the call site, extract it to a shared constant in a `_components/` module to keep the three call sites identical.

**Fix:** Extract to a module-level constant in (e.g.) `app/(authed)/proposals/new/_components/wizardSteps.ts`:
```ts
export const WIZARD_STEPS = ['parametres', 'calcul', 'verification'] as const;
export type WizardStep = typeof WIZARD_STEPS[number];
```
Then `hrefForStep={(n) => \`/proposals/new/${WIZARD_STEPS[n - 1]}?draft_id=${draft.id}\`}`.

### IN-06: `wizard.step3.pdf.ref.line` i18n key is now dead but still present

**File:** `src/lib/i18n/dictionaries.ts:653, 1333`
**Issue:** The key `wizard.step3.pdf.ref.line: 'Réf. LC-2026-XXX · {0} jours de validité'` was used by `PdfPreviewMock` before Phase 17 D-17. The new component inline-constructs the ref line and the comment at line 651 says "the retired step-3 PDF ref-line dictionary key held a literal placeholder per Phase 13 D-15; that key is no longer read here". The string `LC-2026-XXX` literal lives in both FR and EN dictionaries with no consumer. Tests like AC-PPM-11 specifically guarantee the literal is NOT in the rendered output. If the i18n dictionary is ever sampled to detect placeholder strings, this key will be a confusing hit.

**Fix:** Remove `wizard.step3.pdf.ref.line` from both FR and EN dictionaries. The Phase 17 plan explicitly defers this as "downstream cleanup decision" (PdfPreviewMock.tsx:11-13), but since the key has no readers and contains a literal placeholder, it should be deleted unless someone can name a future consumer.

### IN-07: Inline `style` prop walls of code in server components reduce reviewability

**File:** Multiple — most notably `app/(authed)/page.tsx:155-216`, `proposals/page.tsx:108-145`, `proposals/new/calcul/page.tsx:349-407`
**Issue:** Server-component render bodies carry 30-60+ lines of `style={{...}}` inline objects. Reviewing these for token-correctness (`var(--ink)` vs `var(--muted)`, `14.5px` vs `13px`) requires reading every property individually; the inline placement also frustrates the `app/globals.css` discipline the CONTEXT documents ("NO new global CSS introduced by this component"). The 17-PATTERNS document presumably justifies this, but the volume now exceeds what's reasonable to maintain.

**Fix:** Lift repeating shapes into module-level constants (the pattern `FilterPillRow.tsx:36-58` already uses for SHARED/ACTIVE/INACTIVE pill styles). The recent-row Link grid in `page.tsx:160-212` and the wizard step-2 hero block in `calcul/page.tsx:347-407` are the most obvious candidates.

---

_Reviewed: 2026-05-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
