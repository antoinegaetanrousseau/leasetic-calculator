# Phase 37: CRM Stack Closure - Pattern Map

**Mapped:** 2026-09-05
**Files analyzed:** 4 code files + 2 documents to create
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/(authed)/proposals/[id]/page.tsx` | route (server component page) | request-response | `app/(authed)/proposals/page.tsx` (role-gating posture) + `app/(authed)/layout.tsx` (role read) | role-match (posture, not mechanism) |
| `tests/admin-09-grep-contracts.test.ts` | test | request-response (render + grep) | itself — Gates 1/3/11 (server-component `renderToString` gates) | exact (same file, add 20th gate in same style) |
| `app/(authed)/page.tsx` | route (server component page) | request-response | itself (pre-existing `isAdmin`/`momentum` derivation, lines 62-118) | exact (self-contained hygiene fix) |
| `src/lib/momentum/badges.ts` | utility (pure module, exported constant) | transform | `src/lib/registry/labels.ts` (frozen exported `Record` constants) | exact |
| `.planning/phases/34-fiche-client/34-VERIFICATION.md` | doc (verification report) | n/a | `.planning/phases/35-sales-motivation/35-VERIFICATION.md` | exact (named by CONTEXT.md) |
| `.planning/phases/34-fiche-client/34-REVIEW.md` | doc (code review report) | n/a | `.planning/phases/35-sales-motivation/35-REVIEW.md` | exact (named by CONTEXT.md) |

## Pattern Assignments

### `app/(authed)/proposals/[id]/page.tsx` (route, request-response)

**Current state — confirmed by direct read (full 456-line file):**

The flat ownership check, exactly as CONTEXT.md describes (lines 38-49):
```typescript
export default async function ProposalDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { session } = await requireUser();
  const lang = await getCurrentLang();

  const proposal = await getProposalById(id);

  // D-18 obscurity: not-found OR not-owned both return 404.
  // Hard-purged (deleted_at > 30d) rows will have been deleted from DB by Plan 08-14's CLI.
  if (!proposal || proposal.userId !== session.user.id) {
    notFound();
  }
  ...
```

Note `requireUser()` is currently destructured as `{ session }` only — `role` is available but not
requested (see `RequireUserResult` below). The bypass requires adding `role` to this destructure.

**CONFIRMED (contradicts nothing in D-37-02):** grepped the full file for `commission` (case-
insensitive) — zero matches. Grepped for `params_snapshot` — zero matches. The render path (lines
187-306) reads only `inputs` (partnerCo, partnerName, clientCo, clientName, clientRole, clientTel,
clientEmail, clientSiren, slb, evalParc, projectDesc, partnerRef, amountHT, durationMonths,
validityDays) and `computed` (state, trancheKey, coeff, loyerHT) — never `paramsSnapshot`/
`params_snapshot`. D-37-02's verified claim holds exactly as stated.

**Analog 1 — role-gating posture (NOT the mechanism):** `app/(authed)/proposals/page.tsx` lines
69-97 (Phase 18 D-11):
```typescript
export default async function ProposalsListPage({ searchParams }: PageParams) {
  // Phase 18 D-11 — read role from session for admin user_id query-param gating.
  // T-18-01-01: role MUST come from the session (server-derived), NEVER from
  // request params; otherwise an attacker could spoof `_callerRole=admin`.
  const { session, role } = await requireUser();
  const lang = await getCurrentLang();

  const sp = await searchParams;
  ...
  // Phase 18 D-11 — honor `?user_id=` only when the caller is admin.
  // For partner callers, the param is silently ignored by buildListResponse
  // (defense in depth: the library layer ALSO ignores the override when
  // _callerRole !== 'admin').
  const adminUserIdOverride =
    role === 'admin' && typeof sp.user_id === 'string' && sp.user_id.length > 0
      ? sp.user_id
      : undefined;
```
**What to copy:** the shape `const { session, role } = await requireUser();` and the discipline
comment "role MUST come from the session, NEVER from request params." **What NOT to copy:** the
`?user_id=` query-param override mechanism itself — CONTEXT.md D-37-01 explicitly rejects mirroring
it for the detail page (it would put a partner's user id into a URL built by a shared component and
teach `ProposalRow` about admin context).

**Analog 2 — server-derived role read used elsewhere in the `(authed)` tree:**
`app/(authed)/layout.tsx` lines 17, 21-28, 42:
```typescript
const { session, role } = await requireUser();
...
// VIEW-01 / D-01: admins get a redirect target for the Admin-view switch in the sidebar.
const adminHomeHref =
  role === 'admin' && process.env.ADMIN_URL_SEGMENT
    ? `/${process.env.ADMIN_URL_SEGMENT}`
    : undefined;
...
<Shell
  isAdmin={role === 'admin'}
```
And `app/(authed)/page.tsx` line 44, 62 (Phase 24/35 `effectiveView`/`isAdmin` short-circuit posture
requested by phase guidance):
```typescript
const { session, role } = await requireUser();
...
const isAdmin = role === 'admin';
```
**Pattern to replicate:** `role` is always destructured directly from `requireUser()` (never
inferred, never passed by the client) and compared with `=== 'admin'`, then used as a same-request
boolean gate. No file in this codebase threads role through a client-supplied flag.

**`requireUser()` / `requireAdmin()` contract** — `src/lib/auth/require.ts` lines 42-92:
```typescript
export interface RequireUserResult {
  session: NonNullable<Awaited<ReturnType<ReturnType<typeof auth>['api']['getSession']>>>;
  role: Role; // 'partner' | 'admin' | 'sales'
}

export async function requireUser(): Promise<RequireUserResult> {
  const session = await auth().api.getSession({ headers: await headers() });
  if (!session) { redirect('/login'); }
  // AUTH-16 secondary check: re-read role + deletedAt from DB per-request.
  const user = await db().query.users.findFirst({
    where: eq(schema.users.id, session.user.id),
    columns: { sessionVersion: true, deletedAt: true, role: true },
  });
  if (!user || user.deletedAt !== null) {
    redirect('/api/auth/sign-out?redirect=/login');
  }
  const role = (KNOWN_ROLES as readonly string[]).includes(user.role)
    ? (user.role as Role)
    : 'partner'; // fail-closed
  return { session, role };
}
```
`role` is a fresh per-request DB read (not the cookie-cached session), fail-closed to `'partner'` on
any unrecognized value — this is the "server-derived, never client-supplied" guarantee CONTEXT.md
requires the bypass to preserve.

**Explicitly rejected pattern (do not copy):** `src/components/proposals/ProposalRow.tsx` line 157:
```typescript
const href = draftMode ? `/proposals/new/parametres?draft_id=${row.id}` : `/proposals/${row.id}`;
```
This bare href is shared by the partner list and the admin relationship page (`hideClient` prop is
its only per-caller variation). CONTEXT.md D-37-01 rejects threading an admin override through this
component.

**Original deferral note** (`.planning/phases/30-company-contact-registry/deferred-items.md` lines
7-41) confirms the exact gap and even names the suggested resolution shape (`role === 'admin'`
bypass matching `proposals/page.tsx`'s override) — already read in full, no need to re-read.

---

### `tests/admin-09-grep-contracts.test.ts` (test, request-response render + grep)

Full 544-line file read. 12 `describe` blocks / gates total (not literally 19 distinct `it()`
counts — CONTEXT.md's "19 gates" refers to the count of `it()` assertions across the 5 surfaces +
XLSX export; the file's own header comment enumerates 4 non-exempt HTML surfaces + 1 XLSX gate +
2 additional LcReferencesList gates added later — Gates 10, 11, 12 are explicitly numbered in
trailing comments). The 20th gate should follow immediately after Gate 12 (line ~526) as a new
`describe` block, or be inserted as a 6th surface in the main `describe('ADMIN-09 D-29 ...')` block
— either placement is consistent with existing style (Gates 10-12 are separate top-level
`describe`s appended after the main suite).

**Harness note (exact text, lines 63-77):**
```typescript
// Phase 18 Plan 02 — Admin Home now Promise.alls 5 DB queries on render.
// renderToString() in the ADMIN-09 gate runs the server component WITHOUT a
// live DB connection, so each helper must be stubbed. The mocks all return
// values that exercise the FULL render path (5 stat values + 5 activity
// rows) — maximizing the surface scanned by the grep contract.
vi.mock('@/lib/auth/require', () => ({
  requireAdmin: vi.fn(async () => ({ session: { user: { id: 'admin-1' } } })),
}));
vi.mock('@/lib/db/queries/partner-aggregates', () => ({ ... }));
```
A second, differently-shaped `@/lib/auth/require` mock exists at the bottom of the file (lines
531-533) for a later-added test:
```typescript
vi.mock('@/lib/auth/require', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ session: { user: { id: 'admin-1', role: 'admin' } } }),
}));
```
**Caution for the planner:** `vi.mock` calls are hoisted; a duplicate `vi.mock('@/lib/auth/require', ...)`
already exists twice in this file with two different shapes. If the new gate needs to import and
render `app/(authed)/proposals/[id]/page.tsx` (a server component that calls `requireUser()`, not
`requireAdmin()`), a `vi.mock('@/lib/auth/require', ...)` must supply `requireUser` returning
`{ session, role: 'admin' }` — check both existing mocks don't already shadow this in a way that
breaks the new gate's import, since Vitest merges/overrides same-path mocks by hoist order.

**D-30 exception block (verbatim, lines 394-412)** — read for context only, the new gate is a
non-exempt gate and does not touch this block:
```typescript
describe('D-30 admin-only exception documentation (NOT executed as a grep gate)', () => {
  // These surfaces MAY render commission for admin audit:
  //   - CoefficientDiffPanel mode="full" (rendered inside /history when expanded)
  //   - CoefficientHistorySidebar (inline-expansion diff panel)
  //   - CoefficientsEditor card (/coefficients admin editor)
  //
  // No grep test is run on these surfaces — they are intentionally outside the
  // D-29 strict envelope per Phase 14 D-30 (14-CONTEXT.md). The exception is
  // narrowly scoped to admin-gated surfaces (requireAdmin() upstream) where
  // commission visibility is a feature, not a leak.
  it('documents the D-30 exception list', () => {
    const exempt = [
      'CoefficientDiffPanel (full mode, /history expanded row)',
      'CoefficientHistorySidebar (inline-expansion diff panel)',
      'CoefficientsEditor card (/coefficients admin editor)',
    ];
    expect(exempt.length).toBe(3);
  });
});
```
`/proposals/[id]` is NOT going into this exempt list — it is a non-exempt gate per D-37-02.

**Closest-shaped existing gate to copy verbatim (Gate 11, lines 466-493 — a full-page/list server
component render, closest to a detail-page render among the 12 gates):**
```typescript
describe('Gate 11: LcReferencesList — all 4 status variants, ZERO commission leakage', () => {
  it('renders active + draft + expired + deleted rows with ZERO /commission_pct/ or /_pct/ tokens', async () => {
    const { LcReferencesList } = await import('../app/(admin)/[adminSegment]/lc-references/_components/LcReferencesList');
    const statuses = ['active', 'draft', 'expired', 'deleted'] as const;
    for (const displayStatus of statuses) {
      const html = renderToString(
        createElement(LcReferencesList, {
          rows: [ { /* fixture */ } ],
          nextCursor: null,
          lang: 'fr',
          adminSegment: 'admin-secret',
          currentQ: '',
        }),
      );
      assertNoCommissionLeakage(html, `LcReferencesList (displayStatus=${displayStatus})`);
    }
  });
});
```
And the shared assertion helper (lines 159-169), to be reused unmodified — do not redefine it:
```typescript
const COMMISSION_PCT_RX = /\bcommission_pct\b/i;
const PCT_SUFFIX_RX = /_pct\b/;

function assertNoCommissionLeakage(html: string, surfaceName: string): void {
  expect(html, `D-29 strict: ${surfaceName} HTML must not surface 'commission_pct' token`).not.toMatch(
    COMMISSION_PCT_RX,
  );
  expect(html, `D-29 strict: ${surfaceName} HTML must not surface any '_pct' field-key suffix`).not.toMatch(
    PCT_SUFFIX_RX,
  );
}
```

**Regression-guard framing to preserve in the new gate's comment:** the phase's own reasoning
(37-CONTEXT.md's "recurring defect shape" note) — "confirm it actually fails on a surface that
renders commission, rather than assuming a passing test proves anything" — means the new gate
should ideally be validated by a throwaway local mutation (temporarily render a fixture containing
`commission_pct`) during implementation, though that check itself is not part of the committed
test.

**`ProposalDetailPage` is an `export default async function`, not a named export** — the import
line for the new gate will need `import ProposalDetailPage from '../app/(authed)/proposals/[id]/page';`
(matching the existing default-import style used for `AdminHomePage`, line 123:
`import AdminHomePage from '../app/(admin)/[adminSegment]/page';`). Because `ProposalDetailPage`
reads `params` (a `Promise<{ id: string }>`) and calls `requireUser()` + `getProposalById(id)`, the
new gate needs additional mocks beyond the existing ones: `@/lib/db/queries` (`getProposalById`,
`deriveDisplayStatus`) and `@/lib/auth/require` (`requireUser`) — neither is currently mocked in
this file, since no existing gate touches the `(authed)` tree (all 12 existing gates are in the
`(admin)` tree). This is a materially new mocking surface for the planner to account for.

---

### `app/(authed)/page.tsx` (route, request-response) — D-37-05 / IN-01

**Full current expression (lines 105-118, 158-164)** — confirmed by direct read:
```typescript
const momentum = (() => {
  if (!momentumData) return null;
  const [movements, weekKeys, counts] = momentumData;
  const streaks = summarizeStreaks(weekKeys, nowMs);
  return {
    streakWeeks: streaks.currentWeeks,
    movements,
    badgeProgress: deriveBadgeProgress(counts, streaks),
    trackedSinceLabel: formatTrackedSinceFragment(lang),
  };
})();
```
where `momentumData` (lines 93-97) is itself already gated:
```typescript
isAdmin ? null : Promise.all([
  listWeeklyMovementsForOwner(userId, week, 5),
  listProgressWeekKeysForOwner(userId),
  getBadgeCountsForOwner(userId),
]),
```
So `momentum` is provably `null` whenever `isAdmin` is `true` — CONTEXT.md's premise is confirmed
by source, not assumed.

**The redundant expression to fix (line 158):**
```typescript
{!isAdmin && momentum && <MomentumCard
  lang={lang}
  streakWeeks={momentum.streakWeeks}
  movements={momentum.movements}
  badgeProgress={momentum.badgeProgress}
  trackedSinceLabel={momentum.trackedSinceLabel}
/>}
```
**35-REVIEW.md's own prescribed fix (IN-01, verbatim):** "Drop the redundant check and rely on the
single source of truth: `{momentum && <MomentumCard .../>}`." This is the exact target shape — no
other file's pattern needs to be copied; this is a same-file, self-contained removal. Rendering
proof obligation: since `momentum` is `null` in every case `isAdmin` was `true`, removing `!isAdmin`
cannot change which branch renders.

---

### `src/lib/momentum/badges.ts` (utility, transform) — D-37-05 / IN-02

**Current export (lines 16-27), verbatim:**
```typescript
/**
 * Badge tier thresholds (UI-SPEC § "Badge tier thresholds"). An
 * operator-adjustable STARTING POINT (UI-SPEC A-2, `35-CONTEXT.md`
 * Claude's Discretion): changing one is a constant edit here, never a
 * migration (D-03). Numbers are deliberately reachable early, given every
 * partner starts from zero history (D-14).
 */
export const BADGE_THRESHOLDS: Record<BadgeAxisId, Record<BadgeTierId, number>> = {
  clients: { bronze: 3, silver: 10, gold: 25 },
  wins: { bronze: 1, silver: 5, gold: 15 },
  consistency: { bronze: 2, silver: 6, gold: 12 },
};
```
consumed at line 134: `const threshold = BADGE_THRESHOLDS[axis][tier];`

**Every import site in the repo (exhaustive grep, only 2 files import it):**
- `src/lib/momentum/badges.ts:134` — internal use, unaffected by freezing.
- `src/lib/momentum/badges.test.ts:4` — `import { BADGE_THRESHOLDS, deriveBadgeProgress, summarizeStreaks } from './badges';`
  and asserted at lines 139-148:
  ```typescript
  describe('BADGE_THRESHOLDS', () => {
    it('matches the exact UI-SPEC numbers', () => {
      expect(BADGE_THRESHOLDS.clients.bronze).toBe(3);
      expect(BADGE_THRESHOLDS.wins.bronze).toBe(1);
      expect(BADGE_THRESHOLDS.consistency.gold).toBe(12);
      expect(BADGE_THRESHOLDS).toEqual({
        clients: { bronze: 3, silver: 10, gold: 25 },
        wins: { bronze: 1, silver: 5, gold: 15 },
        consistency: { bronze: 2, silver: 6, gold: 12 },
      });
    });
  ```
  `toEqual` is a structural/value equality check, unaffected by `Object.freeze` (freeze does not
  change enumerable own-property values, only mutability) — this test does not need to change.
- No other file in the repo imports `BADGE_THRESHOLDS` (confirmed via repo-wide grep — the only 4
  hits total are the definition, the internal use, and the two test-file references above).

**Frozen-constant analog — `src/lib/registry/labels.ts` lines 33, 53 (exact target shape for a
`Readonly<Record<...>>` + `Object.freeze` exported constant):**
```typescript
export const HEADCOUNT_BAND_LABELS: Readonly<Record<string, string>> = Object.freeze({
  NN: 'Unité non employeuse',
  '00': '0 salarié',
  ...
});

/** The 21 sections of NAF rév. 2, A through U. */
export const NAF_SECTION_LABELS: Readonly<Record<string, string>> = Object.freeze({
  A: 'Agriculture, sylviculture et pêche',
  ...
});
```
These are single-level `Record<string, string>` (shallow freeze suffices — no nested object
values). `BADGE_THRESHOLDS` is two levels deep (`Record<BadgeAxisId, Record<BadgeTierId, number>>`),
so a shallow `Object.freeze` on the outer object would still leave `BADGE_THRESHOLDS.wins` (the
inner object) mutable. **35-REVIEW.md's own prescribed fix (IN-02, verbatim)** already accounts for
this: "`export const BADGE_THRESHOLDS = Object.freeze({ clients: Object.freeze({...}), ... })` or a
shallow `Object.freeze` at each level, so an accidental mutation throws in strict mode instead of
silently drifting." The type annotation should likely become
`Readonly<Record<BadgeAxisId, Readonly<Record<BadgeTierId, number>>>>` to match `labels.ts`'s
`Readonly<Record<...>>` convention and to make the immutability visible in the type, not just at
runtime.

---

### `.planning/phases/34-fiche-client/34-VERIFICATION.md` (doc)

**Analog:** `.planning/phases/35-sales-motivation/35-VERIFICATION.md` (113 lines, read in full).

**Structure to replicate (section order, exact headers):**
1. YAML frontmatter: `phase`, `verified` (ISO timestamp), `status`, `score` (`N/N must-haves
   verified`), `overrides_applied`
2. `# Phase N: <Name> Verification Report` + Phase Goal restated verbatim from ROADMAP/CONTEXT
3. `## Goal Achievement` → `### Observable Truths` — a table with columns `# | Truth | Status |
   Evidence`, one row per numbered requirement (35's example: GAME-01..05 map to 9 numbered
   "observable truths", i.e. truths are finer-grained than requirement IDs where a requirement
   implies multiple checkable behaviors). Every Evidence cell cites a **specific file:line-range**
   and, where a claim is testable, the **specific test name/case number** that proves it — never a
   bare "see SUMMARY."
4. `### Required Artifacts` — table `Artifact | Expected | Status | Details`, one row per file the
   phase's plans claimed to create/modify.
5. `### Key Link Verification` — table `From | To | Via | Status | Details`, tracing integration
   wiring between artifacts (e.g. `page.tsx → MomentumCard.tsx via {!isAdmin && momentum && ...}`).
6. `### Behavioral Spot-Checks` — table `Behavior | Command | Result | Status`, listing the actual
   commands re-run DURING verification (`npx vitest run`, `npm run typecheck`, `npm run lint:check`,
   `npm run build`, plus any integration test) with the literal output numbers — explicitly stated
   as "re-run independently during this verification (not taken on SUMMARY claims)."
7. `### Requirements Coverage` — table `Requirement | Source Plan(s) | Description | Status |
   Evidence`, one row per REQUIREMENTS.md ID this phase claims (for Phase 34: FICHE-01..05,
   ACTV-01..05), plus a closing sentence confirming no orphaned requirements against
   REQUIREMENTS.md's own checkbox state.
8. `### Anti-Patterns Found` — explicit statement of what was grepped for (`TBD|FIXME|XXX|TODO|
   HACK|PLACEHOLDER` and stub-return patterns) across which files, and the result (35's was "None").
9. `### Human Verification Required` — either "None outstanding" with justification, or a list of
   items still needing an operator walk (for Phase 34 this section should likely note the CLOSE-01
   items D-37-04 defers to the later consolidated walk, so this verification does not double as
   that walk).
10. `### Gaps Summary` — final honest paragraph.
11. Footer: `_Verified: <timestamp>_` / `_Verifier: Claude (gsd-verifier)_`

**Goal-backward depth to emulate (key excerpt, line 36):** each Evidence cell traces from the
requirement down to line-numbered source AND a named test case, e.g. `listWeeklyMovementsForOwner
(src/lib/db/queries/momentum.ts:101-150) reads relationship_events joined to
client_relationships/companies, owner-scoped, window-filtered ... Proven against real Postgres in
momentum.isolation.integration.test.ts assertions 1–4.` — this is "re-derive the claim against the
codebase," not "quote the SUMMARY."

**Honesty pattern (line 108):** the Gaps Summary explicitly distinguishes an accepted design
decision ("skip-by-default integration suite ... not wired into CI ... not a gap") from an actual
gap — Phase 34's verification should apply the same distinction to Phase 30's `30-UAT.md` pending
items (they are explicitly NOT this phase's gap — D-37-04 defers them to the later consolidated
walk) versus any genuine FICHE-01..05/ACTV-01..05 shortfall found by re-derivation.

---

### `.planning/phases/34-fiche-client/34-REVIEW.md` (doc)

**Analog:** `.planning/phases/35-sales-motivation/35-REVIEW.md` (169 lines, read in full).

**Structure to replicate (exact headers and severity taxonomy):**
1. YAML frontmatter: `phase`, `reviewed` (ISO timestamp), `depth` (`deep`), `files_reviewed` (count),
   `files_reviewed_list` (explicit YAML array of every file path examined), `findings: {critical,
   warning, info, total}`, `status` (`issues_found` or presumably `clean`)
2. `# Phase N: Code Review Report` + `**Reviewed/Depth/Files Reviewed/Status**` header lines
3. `## Summary` — a short paragraph stating the review's OWN risk-priority order up front (35's:
   "owner scoping ... admin gate ... week-window boundary ... SQL composition safety"), then one
   paragraph per risk area stating what was checked and the explicit "No defect found here." or
   pointing to a finding below.
4. Severity taxonomy, in this exact order and heading style: `## Warnings` (each item titled
   `### WR-NN: <one-line summary>` with **File**, **Issue** (with a code excerpt reproducing the
   defect), **Fix** (with a code excerpt showing the corrected shape)); `## Info` (same shape,
   `### IN-NN:`). **Critical** would be `## Critical` if any exist, ordered above Warnings.
5. Footer: `_Reviewed: <timestamp>_` / `_Reviewer: Claude (gsd-code-reviewer)_` / `_Depth: deep_`

**Scope-declaration requirement (D-37-03 explicit instruction):** unlike 35-REVIEW.md (which was a
phase-wide review because Phase 35 was only 5 plans), `34-REVIEW.md` covers only "the highest-risk
files — authorization and ownership checks, the `relationship_events` write path, and the server
actions" out of Phase 34's 13 plans. The `## Summary` section MUST state this scope explicitly
(which files were and were not examined) — 35-REVIEW.md's frontmatter `files_reviewed_list` field
is the mechanism to make this auditable: list exactly the scoped files, and the Summary's opening
sentence should name the scope decision itself (not just imply it via the list), so "a future reader
knows what was and was not examined and does not mistake it for a full review" (CONTEXT.md's own
wording).

**Finding-writing pattern (verbatim excerpt, IN-01, lines 141-151) — the "guard that does not guard"
shape this project's findings tend to take:**
```
### IN-01: Redundant `!isAdmin` check alongside the already-null-gated `momentum` value

**File:** `app/(authed)/page.tsx:158`
**Issue:** `{!isAdmin && momentum && <MomentumCard .../>}` checks `isAdmin` a second time even
though `momentum` is already guaranteed `null` whenever `isAdmin` is true ... This isn't wrong, but
it creates two places that encode the same gate ...
**Fix:** Drop the redundant check and rely on the single source of truth: `{momentum &&
<MomentumCard .../>}`.
```
Note this exact finding is what D-37-05/IN-01 in the current phase is fixing — Phase 34's review
should watch for the same shape ("a check computed independently of the thing it checks," per
37-CONTEXT.md's own naming of this as "the recurring defect shape across v1.8").

---

## Shared Patterns

### Server-derived role gating (applies to `proposals/[id]/page.tsx`)
**Source:** `src/lib/auth/require.ts:54-77` (`requireUser`), `app/(authed)/layout.tsx:17`,
`app/(authed)/page.tsx:44,62`, `app/(authed)/proposals/page.tsx:72`.
**Rule:** always `const { session, role } = await requireUser();` then `role === 'admin'` — never a
query param, header, or client prop. `requireUser()` re-reads role from the DB per request
(AUTH-16), fail-closed to `'partner'` on any unrecognized value.

### ADMIN-09 commission-invisibility grep gate (applies to the 20th gate)
**Source:** `tests/admin-09-grep-contracts.test.ts:159-169` (`assertNoCommissionLeakage` +
regexes), `:63-77` (mocking harness note), `:466-493` (Gate 11, closest-shaped existing gate).
**Rule:** render the real component/page via `renderToString(createElement(...))` with all data
dependencies mocked (no live DB in this suite), then assert zero `commission_pct` and zero `_pct`
suffix matches in the output HTML. Reuse `assertNoCommissionLeakage` unmodified; do not invent a
second assertion helper.

### Frozen exported constants (applies to `BADGE_THRESHOLDS`)
**Source:** `src/lib/registry/labels.ts:33,53`.
**Rule:** `export const X: Readonly<Record<K, V>> = Object.freeze({...})`. For a two-level nested
record (`BADGE_THRESHOLDS`'s shape), freeze must be applied at both levels for the inner objects to
also become immutable — a single outer `Object.freeze` does not deep-freeze.

### Goal-backward, adversarial verification (applies to `34-VERIFICATION.md`)
**Source:** `.planning/phases/35-sales-motivation/35-VERIFICATION.md` (whole document).
**Rule:** every claim is re-derived against current source (file:line, or a named test case),
never accepted from a plan's own `SUMMARY.md` prose. Gate commands are re-run during verification,
not read from a prior report.

### Severity-tiered code review, explicitly scoped (applies to `34-REVIEW.md`)
**Source:** `.planning/phases/35-sales-motivation/35-REVIEW.md` (whole document).
**Rule:** `Critical` / `Warning` / `Info` sections, each finding with File/Issue/Fix and code
excerpts. When scope is partial (as D-37-03 requires for Phase 34), the scope decision and its
file list must be stated explicitly in both the frontmatter (`files_reviewed_list`) and the prose
Summary — not left implicit.

## No Analog Found

None. All 6 files/documents in this phase's scope have a strong, named analog (several were
explicitly pre-identified in 37-CONTEXT.md's `<canonical_refs>`).

## Facts for the Planner (not patterns, but requested verifications)

- **Test/lint/build commands** (`package.json`, lines checked): `"build": "next build"`,
  `"lint:check": "eslint . --max-warnings=0"`, `"typecheck": "tsc --noEmit"`, `"test": "vitest run"`.
  CI runs all four (per 37-CONTEXT.md); the baseline to hold is **2320 tests passing, 61 skipped**
  (35-VERIFICATION.md recorded 2317/61 on 2026-09-05 at Phase 35 close — the count has grown by 3
  since, consistent with Phase 36 additions).
- **D-37-02's verified claim — CONFIRMED, not contradicted:** `app/(authed)/proposals/[id]/page.tsx`
  (456 lines, read in full) contains zero case-insensitive matches for `commission` and zero matches
  for `params_snapshot`. The render path reads only `proposal.inputs` and `proposal.computed` keys
  enumerated above; `paramsSnapshot`/`params_snapshot` is never referenced anywhere in the file.
- `requireUser()`'s return type `RequireUserResult` (`src/lib/auth/require.ts:42-45`) already
  includes `role: Role` — no signature change is needed to obtain the role in
  `proposals/[id]/page.tsx`; only the destructure at its current call site (line 40:
  `const { session } = await requireUser();`) needs `role` added.
- `tests/admin-09-grep-contracts.test.ts` has two separate `vi.mock('@/lib/auth/require', ...)`
  calls already in the file (lines 68-70 and 531-533), both mocking `requireAdmin` only — neither
  mocks `requireUser`, which the new gate will need since `proposals/[id]/page.tsx` calls
  `requireUser()`, not `requireAdmin()`.

## Metadata

**Analog search scope:** `app/(authed)/`, `app/(admin)/`, `src/lib/auth/`, `src/lib/momentum/`,
`src/lib/registry/`, `src/components/proposals/`, `tests/`, `.planning/phases/35-sales-motivation/`,
`.planning/phases/30-company-contact-registry/`.
**Files scanned:** 6 code files read in full (proposals/[id]/page.tsx, proposals/page.tsx,
ProposalRow.tsx, admin-09-grep-contracts.test.ts, page.tsx, badges.ts) + require.ts + layout.tsx +
labels.ts (targeted) + badges.test.ts (targeted) + 2 phase-35 documents in full + deferred-items.md
in full.
**Pattern extraction date:** 2026-09-05
