# Phase 39: Database Guard Correctness — Discussion Log

**Date:** 2026-09-06
**Mode:** default (interactive, 4 areas selected)

> **Post-discussion re-scope (operator decision, 2026-09-06).** After this discussion the operator
> folded the record corrections into Phase 40 and kept Phase 39 to OPS-05 alone. Areas 1, 3 and 4
> below therefore document decisions that now belong to **Phase 40**; area 2 is Phase 39's entire
> scope. The phase was renamed and its directory moved to `39-database-guard-correctness`.

> Human reference only — downstream agents read `39-CONTEXT.md`, not this file.

## Areas selected

All four offered areas were selected: credential rotation, the OPS-05 guard shape, the
OPS-03/OPS-04 external close-out, and OPS-02 scope.

---

## Area 1 — Credential rotation *(answers later SUPERSEDED — see Area 3)*

| Question | Options | Selected |
|---|---|---|
| Which database does the rotation run against? | Production / Dev rehearsal then prod / Prepare-only | **Production** — the only place the gate is real; operator performs writes, Claude never handles passwords |
| What does "retire leasetic2026" mean? | Disable shared acct / Delete it / Accounts already individual | **Already individual** — `leasetic2026` is a shared password *value*, not a shared account |
| How does each admin set a new password? | Mint reset token / env-var script / Better Auth admin API | **Mint one-time reset token**, admin sets own password at `/reset/<token>` |
| How is the FAILED old-password sign-in evidenced? | Outcome only / Outcome + screenshot / Programmatic | **Outcome + screenshot**, with the image checked before commit |

**⚠ These four answers were superseded during Area 3.** Scouting found OPS-01 was already closed on
2026-05-29 (Phase 21 GATE-01): both admins had already rotated off `leasetic2026` via the
`/parametres` self-service flow, with the old password tested+rejected and the new one verified.

**Claude error that shaped this area.** Claude asserted "there is no self-serve password reset",
reading the login page's *"Mot de passe oublié ? Contactez votre administrateur"* as covering all
password changes. Wrong: `/parametres` has had `authClient.changePassword` since Plan 21-01. The
login-page text is about *forgotten* passwords. Three of the four questions above rest on that
error, and the reset-token script it produced is unnecessary. Retained here as a record of what was
asked and why it was wrong.

The one durable finding from this area: the two launch admins are **Antoine + Emmanuel Rousseau**
(`scripts/seed-admins-launch.ts:48-49`), not Antoine + Thomas.

---

## Area 2 — OPS-05 guard shape *(7 questions — the user asked for more after the first 4)*

| Question | Options | Selected |
|---|---|---|
| What shape should the guard take? | Shared TS resolver / Bash validating resolved URL / Delegate to `@next/env` | **Bash, validating the resolved URL** |
| How are the two resolvers kept from drifting? | Fix both + differential test / Fix both, no test / Guard only | **Fix both + differential test** |
| How are build/start gated without breaking Vercel? | prebuild/prestart + SKIP / positive local detection / separate `build:local` | **prebuild/prestart hooks** |
| Where does the forbidden-endpoint list live? | One declarative source / per-file + test / invert to allow-list | **One declarative source** |
| How is criterion 6's evidence demonstrated? | Fixture test in CI / manual reproduction / both | **Automated fixture test in CI** |
| Does the guard cover the tsx entry points? | Extend to them / build+start only / follow-up | **Extend to write-capable tsx scripts** |
| What does the guard print on success? | Hostname + winning file / verdict only / verbose flag | **Hostname + which file won** |

**Note raised by Claude and accepted:** choosing bash means two resolvers exist by construction,
which is the drift OPS-05's own text objects to — hence the differential test. And correcting
`_load-env.ts` makes the write-capable tsx scripts start honouring `.env.production.local`, so
extending the guard to them is a sequencing requirement, not a nice-to-have.

---

## Area 3 — OPS-03 / OPS-04, and the phase re-scope

| Question | Options | Selected |
|---|---|---|
| OPS-03: attempt an OVH run or close by decision? | Dated decision / Attempt with target / Rehearse on Vercel | **Dated decision** |
| Re-date or cancel? | Cancel / Re-date / Conditional trigger | **Re-date** |
| New date and owner? | March 2027 / September 2027 / December 2026 | **December 2026, Antoine owns provisioning** |
| OPS-04: sign-off or interim decision? | Interim decision / Thomas responded / Narrow retention | *(user: "What is this about? I don't remember this point")* |

The user's non-answer prompted a lookup rather than a re-ask — and the lookup found **OPS-04 was
already closed**, which is why it did not ring a bell. That cascaded into checking the rest.

| Question | Options | Selected |
|---|---|---|
| Five of six items are stale — how to re-scope? | Verify-and-close + build OPS-05 / same + re-verify OPS-01 live / re-plan from scratch | **Verify-and-close the stale four, build only OPS-05** |

---

## Area 4 — OPS-02 and criterion 3

| Question | Options | Selected |
|---|---|---|
| What should the dated CSRF position say? | Revise to defence-in-depth / re-affirm original / record + verify | **Revise — the old framing is retired** |
| How to handle criterion 3's non-existent middleware gate? | Correct it to name Better Auth's gate / correct + build the gate / leave and note it | **Correct the criterion, verify Better Auth's gate** |

---

## Stale premises found (the discussion's main output)

1. **OPS-01** — closed 2026-05-29, Phase 21 GATE-01.
2. **OPS-04** — closed 2026-05-29, Phase 21 GATE-02 / D-01.
3. **GAP-05** — `last_login_at` IS written (`session.create.after` hook).
4. **OPS-02** — `trustedOrigins` IS configured (Phase 20-01).
5. **ROADMAP criterion 3** — cites a middleware Origin gate that does not exist.
6. **Claude's own error** — the "no self-serve reset" assertion, corrected mid-discussion.

## Deferred ideas

- A mechanical staleness check for the requirement ledger (offered, declined for this phase).
- Adding a proxy-level Origin gate (rejected per D-15).
- Narrowing DATA-11's retention (moot — OPS-04 closed).
- Re-verifying OPS-01 with a live sign-in (offered, declined).

## Claude's discretion

- Endpoint-list file format and location.
- Internal shape of the bash precedence logic, provided the fixture test passes.
- Wording of the corrected requirement and criterion text.
