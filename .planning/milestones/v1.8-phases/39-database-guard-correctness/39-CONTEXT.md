# Phase 39: Database Guard Correctness - Context

**Gathered:** 2026-09-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Close the operational gates standing between this app and its first real partner.

**The scope changed materially during this discussion.** Scouting found that FIVE of the phase's
six items were already closed or misdescribed — the requirement text and ROADMAP criteria carry a
picture that Phases 20 and 21 overtook months ago. See `<stale_premises>` below; every entry was
verified against the codebase or a committed evidence document, not inferred.

**Phase re-scoped and renamed 2026-09-06, by operator decision taken after this discussion.**
The verify-and-close and record-correction work moved to **Phase 40 (Milestone Record Closure)**,
where the record work already lives. Phase 39 is now exactly one engineering item.

**What this phase delivers — OPS-05 only:**

A database guard that cannot report OK while the command it guards would open the production
branch, with the two divergent env resolvers reconciled and pinned by a differential test. This is
the only item in the original Phase 39 whose description was current (it was filed 2026-09-06,
the day before planning).

**Moved to Phase 40** — OPS-01, OPS-02, OPS-03, OPS-04, GAP-05. The decisions governing them were
taken in THIS discussion and are preserved below as **D-09 through D-16**, marked `[→ PHASE 40]`.
**Phase 40's planner MUST read this file** — those decisions are not repeated in Phase 40's own
context, and the `<stale_premises>` table below is the evidence base for all five.

**Explicitly NOT in scope:** anything in the moved set, adding a middleware Origin gate (D-15),
changing DATA-11's retention behaviour, and any new product capability.

</domain>

<stale_premises>
## Stale Premises Found During Scouting — read before planning

Planning against the unamended requirement text would produce work that is already done. Each row
was checked directly; the "Actually" column cites the file that settles it.

| Item | Text says | Actually | Evidence |
|---|---|---|---|
| **OPS-01** | shared `leasetic2026` not retired | **Closed 2026-05-29.** Both admins rotated to individual passwords via `/parametres`; old password tested+rejected, new one verified — the exact evidence criterion 1 asks for, already tabulated | `docs/operations/phase-21-gate-evidence.md` § GATE-01 |
| **OPS-04** | Thomas's sign-off pending | **Closed 2026-05-29.** Phase 21 D-01 superseded the "ask Thomas" framing — Antoine owns leasetic.fr, so publication IS the artifact. Notice live with both additions | `docs/legal/privacy-coverage-confirmation.md` (Status: Closed) |
| **GAP-05** | `last_login_at` "written nowhere" | **Written.** `updateLastLoginAt()` is wired to Better Auth's `session.create.after` hook, with unit tests | `src/lib/auth/index.ts:47,195`; `index.test.ts` |
| **OPS-02** | `trustedOrigins` left to default | **Explicitly configured** in Phase 20-01, with tests | `src/lib/auth/index.ts:210`, `trusted-origins.test.ts` |
| **ROADMAP criterion 3** | "Phase 20's **middleware** Origin gate" | **No Origin check exists** in `proxy.ts` (91 lines, coarse auth-cookie gate only), and none in `middleware.ts` history. Phase 20's gate is Better Auth's `trustedOrigins` | `proxy.ts` |

**A Claude-side error, corrected and recorded so it is not repeated:** during this discussion Claude
asserted "there is no self-serve password reset", reading the login page's *"Contactez votre
administrateur"* as covering all password changes. That is wrong — `/parametres` has had
`authClient.changePassword` (with `revokeOtherSessions: true`) since Plan 21-01. The error shaped
three of four credential-rotation questions and produced a reset-token script design that is
**unnecessary**. Superseded answers are marked in the DISCUSSION-LOG.

**Process signal for the milestone.** Five stale premises in one phase, on top of Phase 38's
`ProposalForm`-is-dead-code finding, indicates the requirement ledger drifts faster than it is
audited. The user chose not to add a mechanical check for this in Phase 39 (kept in
`<deferred>`), but a planner should treat every "deferred item" description as unverified until
re-measured.

</stale_premises>

<decisions>
## Implementation Decisions

### OPS-05 — the database guard  `[PHASE 39 — the whole phase]`

- **D-01:** The guard **stays in bash**. It stops parsing `.env.local` and instead reproduces
  `@next/env`'s file order in shell, then validates the **effective resolved** `DATABASE_URL` by
  hostname. Rejected: a tsx guard sharing one TS resolver (adds a tsx startup to every build), and
  delegating to `@next/env` via node.
- **D-02:** Because a bash guard cannot import the TS resolver, **two resolvers necessarily exist**
  — so both get fixed and pinned together. `scripts/_load-env.ts` is corrected to load
  `.env.$NODE_ENV.local` / `.env.$NODE_ENV` in the right order (its docstring already falsely
  claims it matches Next.js), and a **differential test** asserts the bash guard and the TS loader
  resolve the SAME `DATABASE_URL` for each case — including the `NODE_ENV=test` rule where
  `.env.local` is excluded outright. Drift becomes a red test, not a silent divergence.
- **D-03:** **Sequencing hazard — do not reorder.** Correcting `_load-env.ts` makes every `tsx`
  entry point start honouring `.env.production.local`. Those scripts (`db:migrate`, the seeders,
  `purge:*`, `grant:admin`, `probe:write-isolation`) mostly WRITE. Fixing the resolver without
  extending the guard to them would newly expose exactly the scripts that mutate data. **The guard
  must cover the write-capable tsx entry points, and that coverage must land with (or before) the
  resolver fix.**
- **D-04:** `build` and `start` are gated via **`prebuild` / `prestart` npm hooks**, relying on the
  guard's existing SKIP branch (no `.env.local` on disk ⇒ no-op) so Vercel's legitimate production
  builds are untouched. Rejected: positive CI-detection logic, and a separate `build:local` script
  (which leaves the dangerous command — a developer typing `npm run build` — ungated, i.e. the
  2026-09-06 incident unchanged).
- **D-05:** The forbidden-endpoint prefixes live in **ONE declarative, non-executable source**
  (JSON or a plain list) read by both `scripts/seed-fiche-fixtures.ts` and the bash guard. The
  `bug_011` discipline — `URL.hostname`, never `URL.host`, because `host` carries the port and an
  explicit `:5432` slips a prefix match — is documented once, beside the data.
- **D-06:** Criterion 6's evidence is an **automated fixture test run in CI**: throwaway env files
  in a temp dir, asserting guard exit codes per case (including `NODE_ENV=test`). Fixtures must
  never contain a real credential and must never touch the repo's own `.env*` files.
- **D-07:** On success the guard prints the resolved **hostname** (not a credential) **plus which
  env file supplied it** — the fact whose absence made the 2026-09-06 incident confusing, when it
  said "development" while a different file was in charge. Never prints user, password or query
  string.
- **D-08:** Both existing security properties are preserved without exception: **no credential is
  ever printed, and no env file is ever `source`d.**

### OPS-01 / GAP-05 — verify and close, do not rebuild  `[→ PHASE 40]`

- **D-09 [deferred]:** OPS-01 is closed by the Phase 21 record; this phase **verifies and ticks it**, pointing
  at `docs/operations/phase-21-gate-evidence.md` § GATE-01 rather than re-running a rotation. The
  user chose to trust that record rather than re-verify with a live sign-in.
- **D-10 [deferred]:** GAP-05 is likewise **verification-only** — confirm `updateLastLoginAt` fires and rows
  show a real date, and correct the requirement's "written nowhere" wording.
- **D-11 [deferred]:** Should a rotation ever be needed again, the mechanism is the **`/parametres`
  self-service flow** (what Phase 21 actually used — "no admin↔admin fallback was used"), NOT a
  new reset-token script. `createPasswordReset()` exists at `src/lib/auth/actions.ts:174` as the
  admin↔admin fallback.

### OPS-03 — OVH cutover  `[→ PHASE 40]`

- **D-12 [deferred]:** Closed by **dated decision, not by an attempted run.** The blocker is that no OVH
  environment is provisioned — not that nobody ran a command. `scripts/smoke-ovh.ts` (358 lines,
  7-step black-box lifecycle) stays ready and unrun. Rejected: rehearsing against the Vercel
  deployment, which would prove the harness works but not portability, and would create/delete a
  real proposal in production.
- **D-13 [deferred]:** The cutover is **re-dated to December 2026**, with **Antoine owning the next step**:
  provisioning an OVH-compatible target (Node + Postgres + S3-compatible) so the script has
  something to run against.

### OPS-02 — CSRF position  `[→ PHASE 40]`

- **D-14 [deferred]:** The inherited framing is **revised, not re-affirmed**. The original claim — "SameSite=Lax
  + `__Secure-` cookies are the ACTUAL CSRF defence" — was the justification for *deferring*
  `trustedOrigins`. Phase 20-01 shipped the allow-list anyway, so the accurate dated position
  (2026-09-06) is **defence in depth: both layers are present, and neither is claimed to make the
  other unnecessary.** The old hierarchy is retired.
- **D-15 [deferred]:** **ROADMAP criterion 3 is corrected in place** to name what actually enforces the
  allow-list — Better Auth rejecting a request whose Origin is not in `trustedOrigins` — and that
  is what gets verified. Explicitly rejected: building the missing middleware gate (a new
  capability, duplicating Better Auth, against `proxy.ts`'s deliberate minimalism per PITFALLS
  §1.5) and leaving the roadmap misdescribing the system.
- **D-16 [deferred]:** Verification asserts **list membership**, matching `trusted-origins.test.ts`'s existing
  approach. Phase 20's research established that Better Auth's rejection *status code* varies
  between rejection paths and point releases, so asserting the response shape is deliberately
  avoided as forward-incompatible.

- **D-05a:** *(operator decision, 2026-09-06, taken during planning)* D-05 named two consumers
  because only two were known when it was written. Planning found the forbidden-endpoint table
  declared in **six** places: `scripts/check-local-db-branch.sh` (bash `case` arms),
  `scripts/seed-fiche-fixtures.ts:96`, `scripts/seed-pipeline-fixtures.ts:67`,
  `scripts/seed-reconciliation-fixtures.ts:72`, `scripts/_neon-target.ts:~46`, and
  `scripts/probe-write-isolation.ts` (inline exact-hostname gates). The operator chose to **fold
  all five code copies onto the single declarative source**, extending D-05's named boundary to
  match its stated intent. `probe-write-isolation.ts` keeps its Phase 36 D-36-03 exemption — its
  inline exact-hostname gates are stricter than a prefix match, and it deliberately does not
  import `_load-env`. This supersedes the two-consumer reading of D-05 and of ROADMAP criterion 5.

### Claude's Discretion

- Exact file format for D-05's endpoint list (JSON vs newline-delimited), and where it lives.
- How the bash guard reproduces `@next/env` ordering internally, provided D-06's fixture test passes.
- Wording of the corrected requirement/criterion text, provided it names the real mechanism and
  cites where each item was actually closed. `[→ PHASE 40]`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The OPS-05 build
- `scripts/check-local-db-branch.sh` — the guard being rewritten. Note `ENV_FILE=".env.local"` at
  line 24 (the defect) and the deliberate parse-don't-source design that must survive.
- `scripts/_load-env.ts` — the second defective resolver. Its docstring claims Next.js-matching
  precedence and does not implement it.
- `scripts/seed-fiche-fixtures.ts` ~line 533 — the hostname/forbidden-endpoint model criterion 6
  cites, including the `bug_011` `hostname`-not-`host` note.
- `.planning/REQUIREMENTS.md` OPS-05 — the full defect description, filed 2026-09-06.

### Items to verify rather than build
- `docs/operations/phase-21-gate-evidence.md` — GATE-01 rotation table and GATE-02; the evidence
  OPS-01 and OPS-04 already have.
- `docs/legal/privacy-coverage-confirmation.md` — OPS-04's closure record (Status: Closed).
- `.planning/phases/21-partner-onboarding-gates/21-CONTEXT.md` D-01 — the decision that superseded
  the Thomas-confirmation framing.
- `src/lib/auth/index.ts` — `updateLastLoginAt()` (line 47) and its `session.create.after` wiring
  (line 195) for GAP-05; `__resolveTrustedOriginsForTests()` (line ~93) and `trustedOrigins`
  (line 210) for OPS-02.
- `src/lib/auth/trusted-origins.test.ts` — and its note on why membership, not response shape, is
  asserted.
- `app/(authed)/parametres/ParametresForm.tsx` — the self-service password change (Plan 21-01).
- `proxy.ts` — Next 16 middleware. Read it to confirm criterion 3's premise is wrong before
  correcting the roadmap.

### Scope and criteria
- `.planning/ROADMAP.md` § Phase 39 — the six success criteria. Criteria 1, 2, 3 and 5 all rest on
  stale premises; criterion 3 is corrected per D-15.
- `.planning/MILESTONES.md:209-213` — where the v1.1 deferrals (and the original CSRF framing)
  originate.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`scripts/seed-fiche-fixtures.ts`'s forbidden-endpoint check** — the exact validation shape the
  guard should adopt; already battle-tested and carries the `bug_011` port-suffix lesson.
- **The guard's existing SKIP branch** — already distinguishes local from CI/build machines; D-04's
  Vercel safety rests on it, so it must be re-verified rather than assumed.
- **`/parametres` self-service password flow** — the rotation mechanism, should one be needed.
- **`createPasswordReset()`** (`src/lib/auth/actions.ts:174`) — admin↔admin fallback.

### Established Patterns
- **Parse, never source** — the guard reads env files as text so a malformed line cannot execute or
  export a secret. Non-negotiable (D-08).
- **Assert membership, not response shape** — `trusted-origins.test.ts`'s forward-compatibility
  stance, adopted by D-16.
- **Evidence documents under `docs/operations/`** — Phase 21's gate-evidence file is the precedent
  for how a closed operational gate is recorded; new dated decisions should follow it.

### Integration Points
- `package.json` scripts — `prebuild`/`prestart` hooks (D-04) and the write-capable tsx entry
  points that gain guard coverage (D-03).
- Every `tsx` entry point importing `scripts/_load-env.ts` inherits the resolver correction, which
  is precisely why D-03's sequencing matters.

</code_context>

<specifics>
## Specific Ideas

- The 2026-09-06 incident is the concrete target: `npm run check:local-db-branch` printed
  "OK: development branch" while `npm run start` served `ep-icy-boat-alx5o1tz-pooler` — the exact
  endpoint the guard's own error branch labels PRODUCTION.
- A second live specimen occurred *during this discussion*: `loadEnvConfig(cwd, false)` — whose
  second argument is `dev`, so `false` means production — silently resolved to the production
  endpoint in a read-only script. Nothing in the command said "production". Only an inline
  `hostname.startsWith()` check stopped it, which is the very model D-01 adopts.
- The guard's success line should let a reader answer "which file won?" without re-deriving it.

</specifics>

<deferred>
## Deferred Ideas

- **A mechanical staleness check for the requirement ledger** — five stale premises in this phase,
  plus Phase 38's dead-`ProposalForm` finding, suggest deferred-item descriptions rot faster than
  they are audited. The user declined to scope this into Phase 39. Candidate for Phase 40
  (Milestone Record Closure), where HOUSE-05/06 already live.
- **Adding a middleware/proxy Origin gate** — rejected for this phase per D-15 (duplicates Better
  Auth, conflicts with `proxy.ts`'s deliberate minimalism). Would be its own decision if edge-level
  defence in depth is ever wanted.
- **Narrowing or making DATA-11's 10-year retention configurable** — raised as an alternative to
  accepting the retention risk; moot now that OPS-04 is closed, and a behaviour change belongs to
  whichever phase owns DATA-11.
- **Re-verifying OPS-01 with a live sign-in** — offered and declined; the Phase 21 record is
  trusted. Worth revisiting only if a new admin is seeded or a password is suspected changed back.

</deferred>

---

*Phase: 39-Database Guard Correctness (re-scoped 2026-09-06; D-09–D-16 moved to Phase 40)*
*Context gathered: 2026-09-06*
