# Phase 9: Admin Surface - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 9-admin-surface
**Areas discussed:** Coefficients editor save UX & history, Explain-calculation debug tool, Validity options scope, Audit log retrofit + partners list scope

---

## Coefficients editor save UX & history

### Q1: Confirmation modal content when admin clicks Save?

| Option | Description | Selected |
|--------|-------------|----------|
| Warning + computed diff (Recommended) | Modal shows the ADMIN-03 warning text PLUS a computed diff: which fields changed (commission_pct, max_amount, validity_days, each coefficient cell) with old→new values. Reduces mistake risk; the diff is cheap to compute (compare new form values to getLatestGlobalParams()). | ✓ |
| Warning only | Modal shows just the ADMIN-03 warning ("This affects all NEW proposals from now on. Existing proposals are unchanged. Confirm?"). Admin already saw the values they edited; the diff is redundant. | |

**User's choice:** Warning + computed diff
**Notes:** Locked as D-09-01. Diff computed client-side at modal-open against latest row already in page state — no extra fetch.

### Q2: History table — what to render per row?

| Option | Description | Selected |
|--------|-------------|----------|
| Metadata + rendered diff (Recommended) | Each row shows: timestamp (fr-FR/en-GB locale), admin email, optional note, AND a small rendered diff (e.g., "commission_pct 5.00 → 5.50; t1.36 3.0000 → 3.1000"). Inline diff makes the audit story scannable. Computed at query time from successive rows. | ✓ |
| Metadata only + drill-in | Row shows timestamp + admin + note only. Click a row to expand/navigate to a detail view that shows the full snapshot (or diff vs prior). Cleaner default table; one extra click for the audit detail. | |
| Metadata only, no drill-in | Row shows timestamp + admin + note only. The full row data lives in the DB; admin reads the audit_log + global_params tables manually if they need details. Minimal UI surface. | |

**User's choice:** Metadata + rendered diff
**Notes:** Locked as D-09-02. Diff computed at query time via LAG(row) OVER (ORDER BY effective_from DESC) or pair-wise pass — planner picks shape.

### Q3: History placement?

| Option | Description | Selected |
|--------|-------------|----------|
| Same page, below editor (Recommended) | /[adminSegment]/coefficients shows the editor at top + history table below. One screen. Matches the ADMIN-04 wording "visible on the admin page as a table". Lower navigation cost; admin reviews context before/after editing. | ✓ |
| Separate sub-route | /[adminSegment]/coefficients (editor only) + /[adminSegment]/coefficients/history (table). Cleaner separation; history can grow large without crowding editor. | |

**User's choice:** Same page, below editor
**Notes:** Locked as D-09-03.

### Q4: History pagination strategy?

| Option | Description | Selected |
|--------|-------------|----------|
| Last 20 + 'Load more' (Recommended) | Show last 20 rows by default; "Charger plus" button appends next 20. Cursor-based on (effective_from, id) — mirrors Phase 8's home-page list pattern (D-C1). Most edits are recent; older rows rarely needed. | ✓ |
| Show all, no pagination | Render every history row in one table. Admin edits are infrequent (tens per year, not thousands); pagination is premature. Phase 12+ adds pagination if the table actually grows large. | |
| Last 50 + 'Show all' link | Larger default page (50 rows) plus a "Voir tout l'historique" link that loads the rest in one batch. Compromise between "always show recent" and "occasionally need full audit". | |

**User's choice:** Last 20 + 'Load more'
**Notes:** Locked as D-09-04. Mirrors Phase 8 D-C1 cursor pattern for consistency.

---

## Explain-calculation debug tool

### Q1: Where does the debug tool live?

| Option | Description | Selected |
|--------|-------------|----------|
| Separate /explain sub-route (Recommended) | /[adminSegment]/explain — dedicated page. Easy to scope, easy to lock the no-DB-write invariant in one place, easy to link to from anywhere. Clear mental model: "this page is the one place commission appears". | |
| Tab on coefficients editor page | /[adminSegment]/coefficients with an "Explain" tab/section. Co-located with the editor: admin can edit a coefficient, then immediately use the explain tool to verify the math. Tighter feedback loop. | ✓ |
| Button on partner-list → modal | Per-partner "Explain calculation" button on the accounts page. Modal overlays with the tool. Lets admin investigate a specific partner's likely loyer when they ask "why is my quote X?". More contextual but more surface area. | |

**User's choice:** Tab on coefficients editor page
**Notes:** Diverges from recommended. Co-location with editor preserves a tight tweak→verify feedback loop. Locked as D-09-05.

### Q2: What inputs drive the calculation?

| Option | Description | Selected |
|--------|-------------|----------|
| Admin types fresh values (Recommended) | Form: amount HT, duration (36/48/60), tranche (auto-derived from amount), validity. Pure exploration tool — doesn't depend on any existing proposal. Easiest to reason about; matches v10's debug ergonomics. No DB read needed for inputs. | ✓ |
| Pick existing proposal id, prefill | Admin enters a proposal id (or picks from a partner's list) — the tool reads inputs from the row's snapshot and shows the math. Better for "why did partner X get this number?" but reads DB; need to confirm read-only access stays clean of audit-log writes. | |
| Both — type OR pick | Form has two modes: type fresh values, or paste/pick an existing proposal id to prefill. Most flexible. Slightly bigger UI surface; keeps both workflows fast. | |

**User's choice:** Admin types fresh values
**Notes:** Locked as D-09-06. Tranche auto-derived via tKey() from src/lib/calc.

### Q3: How is the math rendered?

| Option | Description | Selected |
|--------|-------------|----------|
| Step-by-step formula + values (Recommended) | Renders the formula symbolically with each intermediate value substituted, e.g.: "loyer = montantHT × (1 + commission/100) × coefficient / 100" → "50000 × (1 + 5/100) × 2.3000 / 100 = 1207.50 €/mois". Each step labeled. Commission_pct appears as a named term. Mirrors how a partner would explain it to their client. | ✓ |
| Intermediate values table only | Two-column table: "montant HT", "commission %", "coefficient", "tranche", "duration", "computed loyer". No formula text. Cleaner for quick lookups; loses the pedagogical formula trail. | |
| Both — formula trail + table | Top: formula trail with substituted values. Bottom: collapsible table of named intermediate values. Most thorough; takes more layout space. | |

**User's choice:** Step-by-step formula + values
**Notes:** Locked as D-09-07. Commission_pct visible as a named term — sole admin surface (alongside coefficients editor) per ADMIN-09.

### Q4: Where does the compute run?

| Option | Description | Selected |
|--------|-------------|----------|
| Pure client (Recommended) | Page server-renders the empty form (no DB read for inputs); admin types values; client-side JS imports computeLoyer from src/lib/calc and runs entirely in the admin's browser. Zero network, zero DB write. Cleanest enforcement of ADMIN-09's "no DB write" clause; trivially auditable. | ✓ |
| Server compute, no DB write | Form submits to a server route that runs computeLoyer and returns the breakdown. Server has access to current global_params (so "fresh values" mode can also use the latest commission_pct without leaking it client-side until render). Slight DB read for params; explicitly no audit_log write. | |

**User's choice:** Pure client
**Notes:** Locked as D-09-08. Latest global_params row passed from page server-component to 'use client' <ExplainTool> as props (no extra fetch).

---

## Validity options scope

### Q1: Validity — what does admin actually edit?

| Option | Description | Selected |
|--------|-------------|----------|
| Single default integer (Recommended) | Schema stays as-is (validity_days int NOT NULL). Admin edits ONE default value (e.g., 30). Partner UI keeps the fixed 15/30/60 segmented selector from Phase 7's <ValiditySegmented>; the admin's default just controls which one is initially highlighted on the form. Minimal scope; no schema bump; matches PROP-25's "configurable validity (15/30/60) preserved from v10" — v10 had fixed options too. Phase 7's swap-in seam already expects an integer. | ✓ |
| Editable list of allowed options | Schema bump: replace validity_days int with validity_options jsonb (e.g., [15, 30, 60]) plus validity_default int. Admin edits both the list and the default. <ValiditySegmented> reads the list from props. More flexible (Leasétic could add 90 or remove 15 someday) but adds: schema migration, list-editing UI, validation that default ∈ options. Probably premature for v1.1. | |

**User's choice:** Single default integer
**Notes:** Locked as D-09-13. Schema unchanged.

### Q2: Validity bounds — server-side check on partner submit?

| Option | Description | Selected |
|--------|-------------|----------|
| Whitelist {15,30,60} hardcoded (Recommended) | Server validates the partner's submitted validityDays is in {15,30,60} via Zod enum (already in src/lib/calc/index.ts: validityDaysSchema = z.enum/literal-union). The single admin-edited default is just a UI affordance; the allowed *values* stay locked at the calc-engine layer. Matches v10 invariant; if Leasétic ever wants to expand, that's a calc-engine change (real code review, not a runtime config). | ✓ |
| Whitelist driven by global_params row | Server validates against the global_params row's allowed list. Pairs with "editable list" option above. Lets admin add/remove options without code changes. | |

**User's choice:** Whitelist {15,30,60} hardcoded
**Notes:** Locked as D-09-14. Calc-engine enforces; admin's default is UI-only.

---

## Audit log retrofit + partners list scope

### Q1: How should Phase 6 auth actions write to audit_log?

| Option | Description | Selected |
|--------|-------------|----------|
| Wrap in Phase 9 admin actions (Recommended) | Keep src/lib/auth/actions.ts pure auth logic. New src/lib/admin/actions.ts (or similar) wraps each Phase 6 primitive: e.g., adminDisableUser() calls disableUser() then writeAuditLog(). Lower blast radius (Phase 6 tests stay green), audit logic lives in admin layer where it conceptually belongs. Slightly more files. | ✓ |
| Edit Phase 6 actions in-place | Add writeAuditLog() calls directly inside disableUser/reEnableUser/createInvitation/createPasswordReset. Couples auth↔audit modules; touches Phase 6's tested code surface. Simpler call graph. | |
| Drizzle insert trigger / hook | Schema-level: a Postgres trigger on users (UPDATE … SET deleted_at) auto-writes to audit_log. No code-layer wiring; can't be bypassed. But: lose the actor_id (need session_user PG var or app-level hint), harder to test, harder to reason about than explicit calls. Probably overkill. | |

**User's choice:** Wrap in Phase 9 admin actions
**Notes:** Locked as D-09-09. New src/lib/admin/actions.ts module.

### Q2: Partners list — columns?

| Option | Description | Selected |
|--------|-------------|----------|
| Minimum required (Recommended) | ADMIN-05 spec: email, displayName, status (active/disabled chip), last_login, created_at. No more. Keeps the table scannable; meets the requirement exactly. Sort default: created_at desc. | |
| Plus proposal count | All of the above + a "proposals" count column (count of non-soft-deleted proposals per user). Useful at a glance ("this partner is active, this one hasn't created any"). Adds a JOIN/subquery to the query — cheap given partner counts are small. | ✓ |
| Plus proposal count + language + role | All above + preferred language (fr/en) + role (partner/admin). More info-dense; potentially noisy. Role mostly redundant since admins are managed via CLI. | |

**User's choice:** Plus proposal count
**Notes:** Diverges from minimum recommended. Antoine values "is this partner actually using the tool" at-a-glance. Locked as D-09-10. JOIN/subquery on proposals where deleted_at IS NULL.

### Q3: Partners list — per-row actions?

| Option | Description | Selected |
|--------|-------------|----------|
| Full set (Recommended) | Per row: Disable / Re-enable (toggle based on status) + "Re-issue invitation" (for users who haven't redeemed) + "Send password reset" (existing users). All call existing Phase 6 server actions; Re-issue invitation + Send reset surface URLs via the existing InviteUrlModal primitive. Toast feedback for disable/re-enable. | ✓ |
| Minimal — disable/re-enable only | Per row: just the disable/re-enable toggle. Invitation re-issue + password reset live behind a "Manage" → dropdown or detail page. Cleaner default row; one extra click for less-common actions. | |

**User's choice:** Full set
**Notes:** Locked as D-09-11. Re-issue invitation predicate refined during planning by reading src/lib/auth/redeem.ts.

### Q4: 'Create new partner' CTA?

| Option | Description | Selected |
|--------|-------------|----------|
| Top-of-list button → modal (Recommended) | Big primary button at the top of /[adminSegment]/accounts. Click → modal with email + displayName + language fields. Submit → createInvitation() server action → InviteUrlModal shows the one-time URL with copy button + "won't be shown again" warning (Phase 6 D-09 pattern). Fastest flow; matches Phase 6 06-07 design. | ✓ |
| Separate sub-route /accounts/new | Top button navigates to /[adminSegment]/accounts/new (a full page with the same form). Submit → redirects back to list with InviteUrlModal opened on the new partner's row. Heavier navigation; cleaner deep-linking if admin shares the create-partner URL. | |

**User's choice:** Top-of-list button → modal
**Notes:** Locked as D-09-12. Reuses Phase 6's InviteUrlModal for the URL surface.

---

## Claude's Discretion

The following Phase 9 decisions are left to the planner per the "Implicit decisions" section of CONTEXT.md:

- Routing structure: two new pages under `/[adminSegment]` (`coefficients`, `accounts`) plus a card-style links update on the admin home; no admin sidebar.
- Server Action vs Route Handler: prefer Server Action (form-driven UX, Better Auth CSRF discipline) unless planner identifies a reason for an explicit Route Handler.
- `adminCreateInvitation` invariant: validates email isn't already a user and routes to "Send password reset" if so.
- Re-issue invitation predicate: planner reads `src/lib/auth/redeem.ts` to determine the exact "invitation unredeemed" condition.
- Coefficient editor input format: numeric strings (matches `numeric(10, 8)` storage); Zod regex validation per cell.
- Optimistic UI on disable/re-enable: NOT used — wait for server confirmation.
- Empty-state copy for partners list and history table.
- i18n: ~40-50 new keys × 2 langs added to `src/lib/i18n/dictionaries.ts` with section comment.
- History rendered diff: cap at e.g. 4 visible items + "+ N more" link if a single save changes many cells.
- Tab/section UI shape for explain tool: vertical tab vs sibling section on same scroll page — planner picks (sibling is simpler).

## Deferred Ideas

- Generic audit-log VIEWER (filter by actor / action / date range) — v1.2+ per PROJECT.md "Future Requirements".
- Editable validity options list (`validity_options jsonb` schema bump) — v1.2+; v1.1 keeps `{15,30,60}` calc-engine-locked.
- Admin sidebar with nav items — Phase 9 uses card-style links on admin home; full sidebar deferred unless ADMIN routes grow.
- Admin self-service password change UI — out of scope; admin↔admin reset flow + launch-day rotation cover it.
- Better Auth `trustedOrigins` hardening / explicit Origin gate middleware — Phase 6 follow-up #2; v1.2+ candidate.
- Cross-partner proposal read view for admin — explicitly deferred per PROJECT.md.
- Multi-admin permission tiers / RBAC framework — out of scope per PROJECT.md.
- Optimistic UI on disable/re-enable — polish item, not requirement.
- Multi-column sort UI on partners list — polish item.
- Audit log retention/purge cron — Phase 10 ops (CUT-08) or v1.2.
