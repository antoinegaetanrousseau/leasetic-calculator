---
phase: 34-fiche-client
plan: 02
subsystem: integration
tags: [registry, fetch, zod, siren, insee, naf, security]

# Dependency graph
requires:
  - phase: 30-company-contact-registry
    provides: companies.siren column, createClientSchema's normalize+refine pair
  - phase: 31-reconciliation
    provides: src/lib/crm/siren.ts normalizeSiren — the shared normaliser this plan converges on
  - phase: 33-pipeline
    provides: 33-REVIEW WR-15 (the finding D-23 closes), health.ts failure discipline precedent
provides:
  - src/lib/registry/recherche-entreprises.ts — lookupCompanyBySiren + RegistryLookupResult
  - src/lib/registry/schema.ts — registrySearchResponseSchema, toRegistryIdentity, RegistryIdentity
  - src/lib/registry/labels.ts — HEADCOUNT_BAND_LABELS (16), NAF_SECTION_LABELS (21) + fallback lookups
  - src/lib/registry/__fixtures__/search-response.json — the captured-shape payload every later test reuses
  - requiredSirenSchema converged onto normalizeSiren (D-23 / WR-15 closed)
affects: [34-03+ (createClientRelationshipAction's registry hook, the refresh action, the identity panel)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "First server-side outbound HTTP call in the codebase: global fetch + AbortSignal.timeout + URL/searchParams, no SDK, no new dependency"
    - "SEARCH-endpoint identity assertion — results[0].siren compared against the requested SIREN, mismatch treated identically to an empty result set"
    - "health.ts failure discipline applied to a third-party integration: returned discriminated union, classifyFailure() bounded reasons, raw error console.error-logged server-side only"
    - "Untrusted-payload zod shape: trim + hard truncate + a per-field .max() assertion, so a hostile length becomes a bounded row instead of a rejected parse"

key-files:
  created:
    - src/lib/registry/schema.ts
    - src/lib/registry/schema.test.ts
    - src/lib/registry/labels.ts
    - src/lib/registry/labels.test.ts
    - src/lib/registry/recherche-entreprises.ts
    - src/lib/registry/recherche-entreprises.test.ts
    - src/lib/registry/__fixtures__/search-response.json
  modified:
    - src/lib/calc/schema.ts
    - src/lib/calc/schema.test.ts

key-decisions:
  - "The headcount table is INSEE's published 16-code list, not the design's illustrative example: 32 is '250 à 499 salariés' and 42 is '1 000 à 1 999 salariés'. An unrecognised code renders as the raw code — the fallback matters more than the table, because INSEE revises the list and a partner seeing '99' is a far smaller failure than a page that blanks or crashes."
  - "3 000 ms abort timeout — roughly five times the 0.58s the endpoint was measured at on 2026-09-03. Long enough for a slow-but-alive registry to still enrich the company, short enough that D-08's 'client creation never waits on an outage' holds when the registry is dark."
  - "toRegistryIdentity returns RegistryIdentity | null and re-applies the D-05 identity assertion, rather than always returning an identity. The requested SIREN is a real parameter, not decoration: the phase's worst failure (attaching a company to the wrong legal identity) is now guarded at the caller AND at the mapper, so a future caller that forgets cannot mint an identity for the wrong company."
  - "RegistryIdentity is declared in schema.ts and re-exported from recherche-entreprises.ts. Declaring it in the fetch module would have made schema.ts import from its own consumer; the re-export satisfies the plan's export list with no cycle."
  - "WR-15's counter-example '1a2b3c4d5e6f7g8h9' is NORMALISED to '123456789', not rejected — see Deviations. The review's own prescribed fix produces that behaviour, and it is what createClientSchema and the reconciliation engine already do."
  - "The two label tables are French INSEE vocabulary and deliberately skip t(): no dictionary key was added, and none was needed. dictionaries.ts was never opened (34-01 owns it)."

patterns-established:
  - "A third-party payload parser lives beside its transport in src/lib/<integration>/, with the parser holding no URL and no transport, so the label/mapping layer stays pure and client-importable."
  - "Grep-provable security properties: the plan's acceptance criteria are greps over the source (no credential header word, no 'throw ' at the boundary, exactly one AbortSignal.timeout, one normaliser). Comments were written to keep those greps honest rather than to defeat them."

requirements-completed: [FICHE-01, FICHE-02]

# Metrics
duration: ~20min
completed: 2026-09-03
---

# Phase 34 Plan 02: Registry Integration + One SIREN Rule Summary

**One bounded, timeout-guarded, identity-asserted call to `recherche-entreprises.api.gouv.fr` that carries nothing but the SIREN outbound and nothing but a four-value reason inbound, two French code→label tables with raw-code fallbacks, and `normalizeSiren` promoted to the codebase's only SIREN normalisation rule.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3/3 completed
- **Files created:** 7 (4 modules incl. tests, 1 fixture — 895 lines total under `src/lib/registry/`)
- **Files modified:** 2 (`src/lib/calc/schema.ts`, `src/lib/calc/schema.test.ts`)
- **Tests added:** 32 in `src/lib/registry/` + 6 in `src/lib/calc/schema.test.ts`

## Accomplishments

### The exported contract (verbatim)

```ts
export type RegistryIdentity = {
  legalName: string | null;
  addressLine: string | null;
  postalCode: string | null;
  city: string | null;
  legalForm: string | null;
  nafCode: string | null;
  nafSection: string | null;
  headcountBand: string | null;
  foundedOn: string | null;
  registryState: string | null;
};

export type RegistryLookupResult =
  | { ok: true; data: RegistryIdentity }
  | { ok: false; reason: 'not_found' | 'timeout' | 'upstream_error' | 'malformed' };

export async function lookupCompanyBySiren(rawSiren: string): Promise<RegistryLookupResult>;
```

Ten fields, no `nafLabel` — the registry has no label to store (D-06), and `grep -ci "naf_label\|nafLabel" src/lib/registry/schema.ts` returns 0.

### The identity assertion (D-05) — the highest-consequence line in the phase

```ts
const first = parsed.data.results[0];
if (!first || first.siren !== siren) return { ok: false, reason: 'not_found' };
```

One branch covering both the empty result set and the mismatch, with the rationale in a comment directly above it. It is guarded a second time inside `toRegistryIdentity(result, requestedSiren)`, which returns `null` on a mismatch, so a future caller that skips the first gate still cannot mint an identity for the wrong company. Test 2 feeds a response whose `results[0]` is a different nine-digit SIREN and asserts that the impostor's siren, its name and its address are all absent from the serialised return value.

### The timeout — 3 000 ms, and why

`REGISTRY_TIMEOUT_MS = 3_000`. The endpoint was measured at HTTP 200 in **0.58s on 2026-09-03** (D-04), so the budget is ~5× the observed latency: a slow-but-alive registry still enriches the company, and a dark one costs client creation three seconds rather than a hung request. `AbortSignal.timeout` produces a `DOMException` named `TimeoutError`, which `classifyFailure` maps to `'timeout'` alongside `AbortError`; everything else maps to `'upstream_error'`. Both are logged with `console.error` and neither carries the error out.

### The headcount table decision

The design (§ 2) illustrates the mechanism with «"42" renders as "250 à 499 salariés"». In INSEE's published `tranche_effectif_salarie` list, `32` is "250 à 499 salariés" and `42` is "1 000 à 1 999 salariés". **The published 16-code list shipped**, not the illustration: `NN, 00, 01, 02, 03, 11, 12, 21, 22, 31, 32, 41, 42, 51, 52, 53`. A test asserts both codes explicitly so the swapped example cannot creep back.

The **raw-code fallback matters more than the table**. `headcountBandLabel('99')` returns `'99'`, `nafSectionLabel('Z')` returns `'Z'`, and a null/undefined/blank code returns `null`. INSEE has revised this list before; a partner reading "99" is a far smaller failure than a client page that blanks the field or crashes on a code the table has not met.

`NAF_SECTION_LABELS` is the 21-entry NAF rév. 2 section list, A–U. The **~700-row NAF nomenclature and the ~100-row legal-form list are NOT shipped** and are recorded in the module header as Deferred Ideas (D-06), specifically so a future reader does not "complete" them.

Neither table goes through `t()`. They are official French administrative vocabulary with no sanctioned English rendering, they sit beside registry data (legal name, address, commune) that is French whatever the UI language is, and 37 machine-translated approximations would be worse copy than the original. **No dictionary key was required and `src/lib/i18n/dictionaries.ts` was never opened** — 34-01 owns it and ran concurrently.

### The fixture

`src/lib/registry/__fixtures__/search-response.json`, **SIREN 552100554 — EDF (Électricité de France)**, a well-known public French company chosen so the fixture can never be mistaken for customer data. It was **hand-written from the measured field list in the design's § 2 table**, not captured from a live call, and no test in this plan performs a network call: every test in `recherche-entreprises.test.ts` stubs global `fetch` with `vi.stubGlobal`, and the parser/label tests need no transport at all. The fixture deliberately carries fields the app does not read (`categorie_entreprise`, `nombre_etablissements_ouverts`, `complements`, `siege.siret`, `siege.departement`, the pagination counters) so the D-08 strip test has something real to strip.

### What leaves the app (D-07)

The URL is built with `new URL(...)` + `searchParams.set('q', siren)` + `searchParams.set('per_page', '1')` from `normalizeSiren`'s output — never string-concatenated. Test 7 reads the URL the mock was called with and asserts it contains the nine digits and `per_page=1` and contains no `partner`, `user`, `session`, `token`, `cookie`, `relationship` or company-name substring; it then asserts the request's header list is exactly `['accept']`. The source is grep-clean too: `grep -ciE "Authorization|Cookie|X-Api-Key|user_id|userId|partnerId"` returns 0.

### D-23 / WR-15 — the exact diff

```diff
 const requiredSirenSchema = z
   .string({ message: 'error.field.required' })
-  .refine((s) => s.trim().length > 0, { message: 'error.field.required' })
-  .refine((s) => s.trim().length === 0 || s.replace(/\D/g, '').length === 9, {
+  .trim()
+  .min(1, { message: 'error.field.required' })
+  .transform((v) => normalizeSiren(v) ?? v)
+  .refine((v) => /^[0-9]{9}$/.test(v), {
     message: 'error.field.siren.invalid',
   });
```

plus `import { normalizeSiren } from '@/lib/crm/siren';` and a rewritten doc comment recording the operator decision (unchanged), the convergence with `createClientSchema` and the reconciliation engine, FICHE-01 as what makes one rule load-bearing, and the DATA-01..04 scope.

**The DATA-01..04 caveat, restated:** `clientSiren` flows into `proposals.inputs`, which is an immutable snapshot. This change alters what a **newly created** proposal stores (digits only instead of whatever the caller typed). It **rewrites no stored `inputs` blob**: no migration, no backfill script, no read-time re-normalisation. None of this plan's three commits touches a file under `drizzle/` or `scripts/` (`git show --stat` on `603ed81`, `cdd263c`, `6cd627b` lists only `src/lib/registry/**` and `src/lib/calc/**`). No downstream reader was found to depend on the un-normalised string; `src/lib/reconcile/sources/proposals.ts` already passes `inputs.clientSiren` through `normalizeSiren` on read, so historic rows keep matching exactly as before.

## Deviations from Plan

### Behaviour-spec corrections

**1. [Rule 1 - Contradiction in the plan] `"1a2b3c4d5e6f7g8h9"` is normalised to `"123456789"`, not rejected**

- **Found during:** Task 2 (test 9 failed against the module) and confirmed in Task 3.
- **Issue:** The plan's Task 3 `<behavior>` test 3 and the `must_haves` truth "`1a2b3c4d5e6f7g8h9` is rejected everywhere" contradict the plan's own `<action>`, which prescribes `createClientSchema`'s pair verbatim. `normalizeSiren('1a2b3c4d5e6f7g8h9')` strips to `'123456789'` — nine digits — so the value **passes** and is stored normalised. `createClientSchema` and the reconciliation engine behave identically today; the value is not rejected anywhere in the codebase and never was.
- **Resolution:** Implemented the `<action>` (which is also 33-REVIEW WR-15's own prescribed fix, quoted verbatim in the review at lines 612-623). WR-15's actual complaint is that the value was "persisted exactly as typed", and that is what is fixed. Test 3 now asserts the accurate post-convergence behaviour: parses, and `clientSiren === '123456789'`, explicitly `not.toBe('1a2b3c4d5e6f7g8h9')`. The rejection cases are covered instead by a digit-count test (8 digits, 10 digits, `'552 100 55'`, `'SIREN inconnu'` → `error.field.siren.invalid`).
- **Why not make it reject:** a stricter rule in `calc/schema.ts` alone would recreate the exact drift D-23 exists to close, and tightening `normalizeSiren` itself would change the reconciliation engine and `createClientSchema` — outside this plan's `files_modified` and an architectural call (Rule 4), not a code convenience.
- **Also affected:** `recherche-entreprises.test.ts` test 9 uses genuinely-malformed SIRENs (`'1a2b3'`, `''`, 8 digits, 10 digits) for the "no outbound call" assertion, and a separate test documents that interleaved junk around nine digits IS looked up, as `q=123456789`.
- **Files:** `src/lib/calc/schema.test.ts`, `src/lib/registry/recherche-entreprises.test.ts`
- **Commits:** `cdd263c`, `6cd627b`

**2. [Rule 2 - Missing critical guard] `toRegistryIdentity` returns `RegistryIdentity | null`**

- **Issue:** The plan's signature takes `requestedSiren` but its step 7 (`return { ok: true, data: toRegistryIdentity(first, siren) }`) gives the parameter nothing to do, which would have made it an unused argument.
- **Fix:** The mapper re-applies the D-05 comparison and returns `null` on a mismatch; the caller treats `null` as `not_found`. The phase's worst failure mode is now guarded twice, and the parameter earns its place.
- **Files:** `src/lib/registry/schema.ts`, `src/lib/registry/recherche-entreprises.ts`
- **Commits:** `603ed81`, `cdd263c`

### Acceptance criteria that are literally unmet, with reasons

**3. `grep -c "replace(/\\D/g" src/lib/calc/schema.ts` returns **1**, not 0.**
The single remaining occurrence is line 59, `optionalPhoneSchema`'s ten-digit **phone** check (`s.replace(/\D/g, '').length === 10`). It is not a SIREN normaliser, phone numbers are deliberately stored verbatim (`"06 12 34 56 78"`), and touching it is outside this plan's scope. The SIREN rival implementation is gone: the file's only SIREN rule is `normalizeSiren` (4 references).

**4. `git status --porcelain drizzle/ scripts/` is NOT empty.**
The working tree carries `drizzle/0010_phase34_fiche_client.sql`, `drizzle/meta/0010_snapshot.json` and a modified `drizzle/meta/_journal.json` — all authored by the **concurrently running 34-01 executor**, which owns migration 0010. This plan added nothing there; the criterion's intent (D-23 ships no migration and no backfill) holds and is provable per-commit via `git show --stat`.

### Concurrency observations (no action taken, by scope boundary)

- Mid-run, `npm run typecheck` reported 5 errors in `src/lib/relationship/kinds.ts` — 34-01's in-flight file referencing dictionary keys it had not yet committed. Not fixed (34-01 owns both `dictionaries.ts` and that file); resolved on its own once 34-01 committed `81ca674`.
- Mid-run, `npm run test` failed one assertion: `no-commission.test.ts`'s `KNOWN_MIGRATIONS` drift guard tripping on 34-01's new `0010_phase34_fiche_client.sql`. Not fixed for the same reason; resolved once 34-01 committed `bd63c1f`. Final full-suite run is green.

### Process notes

- **One commit per task** rather than a RED/GREEN split per `tdd="true"` task, per the execution instruction "commit each task atomically". Tests were written before implementation in all three tasks; RED was observed before writing the module in tasks 2 and 3 (task 2: module-not-found; task 3: 3 failing assertions). For task 1 the tests and modules were written in one pass and the failing state was not captured as a separate run.
- `npm run build` was run with a live `next dev` server (PID 2360). Per the known trap, `app/globals.css` was touched afterwards to force the dev server's CSS recompile. The build itself exits 0.

**Total deviations:** 2 behaviour corrections, 2 criterion mismatches explained, 0 architectural changes, 0 dependencies added.
**Impact on plan:** none to the security controls. Every `must_haves` truth holds as written except the "`1a2b3c4d5e6f7g8h9` is rejected everywhere" clause, which was factually unachievable through the plan's own prescribed implementation and is superseded by "normalised everywhere, by one shared rule".

## Verification

| Gate | Result |
|---|---|
| `npx vitest run src/lib/registry` | 32 passed (3 files) |
| `npm run typecheck` | exit 0 |
| `npm run lint:check` | exit 0 (`eslint . --max-warnings=0`) |
| `npm run test` | 1963 passed, 38 skipped, **0 failed** (154 files) — includes the PDF byte-determinism suite |
| `npm run build` | exit 0 |
| `git diff package.json package-lock.json` | empty (T-34-02-SC: no dependency added) |
| No test performs a network call | every test in `recherche-entreprises.test.ts` uses `vi.stubGlobal('fetch', …)`; no other registry test file references `fetch(` |

Grep-provable properties on `src/lib/registry/recherche-entreprises.ts`:
`first.siren !== siren` = 1, `AbortSignal.timeout` = 1, `normalizeSiren` = 3, `replace(/\D/g` = 0,
`Authorization|Cookie|X-Api-Key|user_id|userId|partnerId` (case-insensitive) = 0, `'use server'` = 0,
`throw ` = 0, `console.error` = 3.

On `src/lib/registry/schema.ts`: `naf_label|nafLabel` = 0, `passthrough|strict()` = 0, `max(` = 14 lines,
endpoint hostname = 0. On `labels.ts`: `NN` present, endpoint hostname = 0, 16 + 21 entries asserted by test.

## Known Stubs

None. Every exported function in this plan is fully wired; nothing returns a placeholder. The registry data has no UI consumer yet — that is plan 34-03+'s work, not a stub in this plan.

## Threat Flags

None. Every trust boundary this plan crosses was already in the plan's threat register (T-34-02-01..08, T-34-02-SC), and no new network endpoint, auth path, file access or schema change was introduced beyond them.

## Issues Encountered

None beyond the deviations and concurrency observations above.

## User Setup Required

None. The endpoint is public, needs no key and no credential header, and no environment variable was added.

## Next Phase Readiness

- `lookupCompanyBySiren` is ready for `createClientRelationshipAction`'s D-09 hook: it returns on every path, so the caller can write `registry_status = 'pending'` on any `{ ok: false }` and create the client regardless.
- `headcountBandLabel` / `nafSectionLabel` are pure and client-importable, ready for the "Identité (registre)" panel.
- `src/lib/registry/__fixtures__/search-response.json` is the fixture the action-level tests ("a registry outage still creates the client") should reuse rather than re-invent.
- The registry columns those results write into land with 34-01's migration `0010`, which must be applied through the `DB Migrate` GitHub Action before any of this reaches a live page.

---
*Phase: 34-fiche-client*
*Completed: 2026-09-03*

## Self-Check: PASSED

**Files verified present on disk** (`[ -f ]`, all 10 FOUND):
`src/lib/registry/schema.ts`, `schema.test.ts`, `labels.ts`, `labels.test.ts`,
`recherche-entreprises.ts`, `recherche-entreprises.test.ts`,
`__fixtures__/search-response.json`, `src/lib/calc/schema.ts`, `src/lib/calc/schema.test.ts`,
and this summary.

**Commits verified present in git log** (all 3 FOUND):
`603ed81` (task 1 — parser + label tables + fixture),
`cdd263c` (task 2 — lookupCompanyBySiren),
`6cd627b` (task 3 — D-23 / WR-15 convergence).
No commit in this plan deletes a tracked file; `git show --diff-filter=D` is empty for all three.

**Gates verified in this session, after the final commit:**
`npm run typecheck` exit 0 · `npm run lint:check` exit 0 ·
`npm run test` 1963 passed / 38 skipped / 0 failed · `npm run build` exit 0 ·
`npx vitest run src/lib/registry` 32 passed · `git diff package.json package-lock.json` empty.
