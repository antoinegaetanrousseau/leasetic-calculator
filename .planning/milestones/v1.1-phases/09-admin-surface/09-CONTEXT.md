# Phase 9: Admin Surface — Context

**Gathered:** 2026-05-09
**Status:** Ready for planning
**Inherits from:** Phase 6 CONTEXT (06-auth-shell), Phase 8 CONTEXT (08-persistence-pdf-pipeline), milestone v1.1

<domain>
## Phase Boundary

Build the admin operating surface on top of Phase 6's hidden `/[adminSegment]` gate and Phase 8's `global_params` / `proposals` / `audit_log` schema. An admin can: view the current global financial parameters and edit them (creating a new append-only `global_params` row each save); browse the change history with a rendered diff per row; manage partner accounts (list with proposal counts, disable/re-enable, re-issue invitation, send password reset); use the "explain calculation" debug tool — the SOLE allowed surface for `commission_pct` visibility per ADMIN-09; and have every admin mutation captured in `audit_log`. Existing PDFs and proposals remain provably unchanged by any param edit because Phase 8's `params_snapshot` jsonb already enforces immutability at the data layer — Phase 9 ships UI on top of an architecturally-locked invariant.

**In scope (9 requirements: ADMIN-01..09):**

- **Coefficients editor page** at `/[adminSegment]/coefficients` (single page hosting editor + history table + explain tool as tabs/sections):
  - **Editor (ADMIN-01, ADMIN-02):** Form (RHF + Zod) shows the current `global_params` row's commission_pct, max_amount, validity_days (single integer default), and the 4×3 coefficients table (t1..t4 × {36,48,60}). Optional `note` text field. Save → confirmation modal (D-09-01) → server action calls `insertGlobalParams()` then `writeAuditLog('global_params.update', { changed_fields, before, after })` then sonner success.
  - **Confirmation modal (ADMIN-03 + D-09-01):** Renders the ADMIN-03 warning text PLUS a computed diff: which fields changed (commission_pct, max_amount, validity_days, each coefficient cell) with old → new values. Diff is computed at modal-open time by comparing form values to the latest row already loaded by the editor (no extra fetch).
  - **History table (ADMIN-04 + D-09-02..04):** Below the editor on the same page. Shows last 20 rows by default with `Charger plus` / `Load more` button (cursor on `(effective_from, id)` desc, mirroring Phase 8 D-C1). Each row: timestamp (formatted via `formatDate` fr-FR / en-GB), admin email/displayName, optional note, AND a small rendered diff vs the immediately-prior row (e.g., `commission_pct 5.00 → 5.50; t1.36 3.0000 → 3.1000`).
  - **Explain-calculation tab (ADMIN-09 + D-09-05..08):** Same page, tab/section. Form: amount HT, duration (segmented 36/48/60), tranche (auto-derived from amount via `tKey()` from `src/lib/calc`), validity (segmented 15/30/60). Pure-client compute via `computeLoyer()` from `src/lib/calc`. Renders step-by-step formula trail with substituted values; `commission_pct` appears as a named term in the trail. Latest `global_params` row is passed from the page server-component to a `'use client'` `<ExplainTool>` as props (no extra fetch; reuses the editor's data flow). NO DB write of any kind.

- **Partners list page** at `/[adminSegment]/accounts` (ADMIN-05, ADMIN-06):
  - **Columns (D-09-10):** email, displayName, status chip (active/disabled), last_login (relative format), created_at (date), proposals_count (count of non-soft-deleted proposals per user via JOIN/subquery). Sort default: created_at desc.
  - **Per-row actions (D-09-11):** Disable / Re-enable toggle (single button switches based on status), `Re-issue invitation` (for users who haven't redeemed the token yet — calls `createInvitation()` wrapped action), `Send password reset` (calls `createPasswordReset()` wrapped action). All three URL-emitting actions surface their one-time URL via Phase 6's `InviteUrlModal` primitive (one-time display + copy button + "won't be shown again" warning per Phase 6 D-09).
  - **'Create new partner' CTA (D-09-12):** Top-of-list primary button. Click → modal with `email + displayName + language` fields (RHF + Zod). Submit → `createInvitation()` → on success, the InviteUrlModal opens with the one-time invitation URL.

- **Audit log retrofit (ADMIN-08 + D-09-09):** New `src/lib/admin/actions.ts` module wraps Phase 6 auth primitives. The wrappers call the existing primitives (`disableUser`, `reEnableUser`, `createInvitation`, `createPasswordReset` in `src/lib/auth/actions.ts`) then call `writeAuditLog()`. Phase 6 auth module stays pure (its tests stay green); audit logic lives in the admin layer where it conceptually belongs. New admin actions for ADMIN-02 (`adminUpdateGlobalParams`) and the partner-list page wire through this module.
  - **`AuditAction` union extension:** `audit-log.ts` `AuditAction` adds: `'global_params.update' | 'user.disable' | 'user.re_enable' | 'user.create' | 'password_reset.create' | 'invitation.create'`.
  - **`AuditTargetType`** stays `'proposal' | 'user' | 'global_params'`.
  - **Phase 9 also retroactively logs CLI grant-admin runs** — `scripts/grant-admin.ts` already writes when run with `--audit` per Phase 6 06-09 SUMMARY; Phase 9 ensures the action key is `'role.grant'` (or compatible) with consistent payload shape.

- **Hidden URL gate (ADMIN-07):** Already shipped in Phase 6 06-07 (`app/(admin)/[adminSegment]/layout.tsx` 2-layer gate: env-segment check `notFound()` first, then `requireAdmin()`). Phase 9 only adds new pages under the same layout — no gate work needed. Every new Phase 9 page/route handler still independently calls `requireAdmin()` per AUTH-15 defense-in-depth.

- **Commission invisibility lockdown (ADMIN-09):**
  - **Visible only on:** the coefficients editor page (admin must see to edit) and inside the explain-calculation tab's rendered formula trail. NO other admin surface displays `commission_pct`.
  - **Audit log payloads:** `'global_params.update'` payload shape MUST include before/after values of `commission_pct` (admin needs the audit trail), but no other audit action's payload may include it. Logger discipline: any future server-side console/log statements in admin server actions MUST NOT log `commission_pct` outside the `'global_params.update'` audit write. Phase 6's `classifyError()` redacts at the error-message boundary — Phase 9 extends the principle: admin-action logger writes use the explicit string set, never raw row dumps.
  - **Network response discipline:** the `/api/admin/global-params` server action (or whichever route emits the editor's data) is the ONLY admin response that returns `commission_pct`. The partners list, the audit log query (excluding `'global_params.update'` rows when displayed inline), and the proposal detail admin views (none in Phase 9 — see Out of scope) all redact.

**Out of scope for this phase (deferred to Phase 10 / v1.2):**

- **Generic audit-log VIEWER beyond the coefficient-history table** — ADMIN-04 only requires the coefficient-change history visible. A full audit log explorer (filter by actor, action, date range; view all admin/partner mutations) is v1.2+. Phase 9 only WRITES (extends the union) and READS for the coefficient history surface.
- **Admin cross-partner proposal read view** — explicitly deferred per PROJECT.md "Future Requirements". Single-admin scope makes manual support workable in v1.1.
- **Multi-admin permission tiers / RBAC framework** — out of scope per PROJECT.md "Out of Scope". `role IN ('partner', 'admin')` stays a column, not a framework.
- **Validity options as editable list** (D-09-13) — schema stays `validity_days int NOT NULL`. Admin edits the default; calc-engine `validityDaysSchema` keeps `{15,30,60}` whitelisted at the calc layer. Expanding to a list is a v1.2+ schema bump (would need `validity_options jsonb` + list-editing UI + default-must-be-in-list validation).
- **Admin password rotation** — separate ops task before first real partner is onboarded (Phase 6 follow-up #1). Phase 9 does NOT add a self-service password change for admins; the existing admin-mediated reset flow + the launch-day shared-password rotation discipline (handled out-of-band) cover it.
- **Better Auth `trustedOrigins` hardening / Origin gate middleware** — Phase 6 follow-up #2; Phase 9 hardening candidate but explicitly out of this phase's scope.
- **Audit log retention / purge cron** — Phase 9 only writes. Retention is a Phase 10 ops task (CUT-08) or v1.2 if not addressed at cutover.
- **Admin sidebar navigation** — the existing `app/(admin)/[adminSegment]/layout.tsx` already has the same shell as `(authed)`. Phase 9's two new pages (`coefficients`, `accounts`) are accessed from the admin home page via card-style links (planner picks final shape). A dedicated admin sidebar with nav items is fine if the planner judges it adds value, but the requirement-level scope is just "the pages exist + are reachable from the home page".

</domain>

<decisions>
## Implementation Decisions

### Coefficients editor save UX & history (gathered 2026-05-09)

- **D-09-01 (Confirmation modal — ADMIN-03):** Modal renders the ADMIN-03 warning text PLUS a computed diff. Diff items: every field whose form value differs from the latest `global_params` row, displayed as `field: old → new` (e.g., `commission_pct: 5.00 → 5.50`, `coefficients.t1.36: 3.0000 → 3.1000`). Diff is computed client-side at modal-open time by comparing the RHF form values to the latest row already fetched by the page server-component. No extra DB read. Modal has `Confirmer` / `Annuler` buttons (i18n via `t()`).
- **D-09-02 (History table content — ADMIN-04):** Each row renders metadata + a small rendered diff vs the immediately-prior row. Columns: timestamp (`formatDate` fr-FR / en-GB), admin (displayName ?? email of the `created_by` user), optional `note`, and a `changes` cell showing the rendered diff. Diff is computed server-side at query time: `SELECT row, LAG(row) OVER (ORDER BY effective_from DESC) AS prev` (or equivalent pair-wise pass in app code) — pick whichever is simpler in Drizzle/Postgres for the planner. Inline diff makes the audit story scannable.
- **D-09-03 (History placement):** Same page, below the editor. `/[adminSegment]/coefficients` hosts editor (top) + history (below) + explain tool (tab/sibling section). One screen; matches ADMIN-04 wording "visible on the admin page as a table".
- **D-09-04 (History pagination):** Last 20 rows by default + `Charger plus` / `Load more` button. Cursor-based on `(effective_from, id)` desc — mirrors Phase 8 D-C1 home-page pagination pattern. URL stable (no `?page=` query). Stable under concurrent inserts (admin saves) — though admin save frequency is so low this is more about pattern consistency than correctness.

### Explain-calculation debug tool (gathered 2026-05-09)

- **D-09-05 (Placement):** Tab / section on `/[adminSegment]/coefficients` (NOT a separate route). Co-located with the editor for a tight feedback loop: admin tweaks a coefficient → switches tab → verifies the math with the latest saved values. Implementation: planner picks between (a) a vertical tab UI with `/coefficients?tab=explain` URL state, or (b) a sibling `<section>` lower on the same scroll page. Either is fine; (b) is simpler.
- **D-09-06 (Inputs):** Admin types fresh values via a form. Fields: amount HT, duration (segmented 36/48/60), tranche (auto-derived from amount via existing `tKey()` from `src/lib/calc` — does NOT need to be a form field), validity (segmented 15/30/60). No proposal-id input; no DB read for inputs. Pure exploration tool.
- **D-09-07 (Output rendering):** Step-by-step formula with substituted values. Render the formula symbolically with each named term (`montantHT`, `commission_pct`, `coefficient`, etc.) shown above and the substituted-numeric form below, e.g.:
  ```
  loyer = montantHT × (1 + commission/100) × coefficient / 100
        = 50 000 × (1 + 5/100) × 2.3000 / 100
        = 50 000 × 1.05 × 2.3000 / 100
        = 1 207.50 €/mois
  ```
  Each step labeled in i18n. `commission_pct` appears as a named term — this is the SOLE admin surface where it is visible (alongside the coefficients editor). Use `formatCurrency` / `formatNumber` from Phase 6 `src/lib/i18n/format.ts` for all numeric rendering (explicit fr-FR / en-GB locale per SHELL-09).
- **D-09-08 (Compute location):** Pure client. The page server-component reads the latest `global_params` row (the editor needs it anyway), passes it as props to a `'use client'` `<ExplainTool>` component. The component imports `computeLoyer` from `src/lib/calc` (already client-safe per Phase 7 — pure-TS module, no React, no I/O). Compute runs in the admin's browser. Zero network, zero DB write, zero audit_log entry. ADMIN-09 enforcement: trivially auditable — the route handler is read-only on `global_params`, the client-component performs no mutations.

### Validity options scope (gathered 2026-05-09)

- **D-09-13 (Validity scope — schema unchanged):** `global_params.validity_days` stays a single `int NOT NULL` column. Admin edits the default value (e.g., 30). Partner UI keeps Phase 7's `<ValiditySegmented>` segmented selector with `{15,30,60}` fixed; the admin's default just controls which value is initially highlighted. The Phase 7 swap-in seam (`getMaxAmount()`-style) becomes `getDefaultValidityDays()` in Phase 9, reading from `global_params`.
- **D-09-14 (Validity bounds):** Server-side `validityDaysSchema` (in `src/lib/calc/index.ts` or wherever Phase 7 placed it) keeps `{15,30,60}` whitelisted via Zod enum/literal-union. The single admin-edited default is a UI affordance; the allowed *values* stay locked at the calc-engine layer. If Leasétic ever wants 90-day validity, that's a calc-engine code change (real PR review, not a runtime config edit). Matches v10 invariant.

### Audit log retrofit + partners list (gathered 2026-05-09)

- **D-09-09 (Audit retrofit — wrapping pattern):** New module `src/lib/admin/actions.ts` (or `src/lib/admin/index.ts` — planner picks final filename). Each Phase 6 auth primitive is wrapped:
  ```
  // Pattern (illustrative — planner finalizes shape)
  export async function adminDisableUser(userId: string, opts?: { note?: string }) {
    const { actorId } = await requireAdmin();
    await disableUser(userId);                     // existing Phase 6 primitive
    await writeAuditLog({
      actorId,
      action: 'user.disable',
      targetType: 'user',
      targetId: userId,
      payload: { note: opts?.note },
    });
  }
  ```
  Phase 6's `src/lib/auth/actions.ts` is NOT edited — its tests stay green, its semantics stay pure auth. The admin-layer wrappers compose Phase 6 primitives + audit writes. The partners-list page calls the wrappers (not the primitives directly).
- **D-09-09a (`AuditAction` union extension):** `src/lib/db/queries/audit-log.ts` `AuditAction` extended to include: `'global_params.update' | 'user.disable' | 'user.re_enable' | 'user.create' | 'password_reset.create' | 'invitation.create'`. The `'role.grant'` action key is reserved (already implied by Phase 6 06-09 grant-admin CLI — confirm CLI matches this key when planner reads grant-admin source).
- **D-09-09b (Audit payload discipline — ADMIN-09):** ONLY the `'global_params.update'` payload may include `commission_pct` (before/after values). Every other audit payload that touches a global_params change MUST NOT echo commission. The wrapper for `adminUpdateGlobalParams` is the sole writer of `'global_params.update'` rows; its payload shape is `{ changed_fields: string[], before: GlobalParamsSnapshot, after: GlobalParamsSnapshot }` where each snapshot may include commission. Other actions (`user.*`, `invitation.*`, `password_reset.*`) take payloads that have nothing to do with global_params — natural isolation, but planner adds an assertion / lint comment so future contributors don't accidentally widen.
- **D-09-10 (Partners list columns):** email, displayName, status chip (active/disabled), last_login (relative format via `formatDate` or a "X days ago" helper — planner picks), created_at (date), proposals_count. The proposals_count column is a JOIN/subquery: `LEFT JOIN proposals ON proposals.user_id = users.id WHERE proposals.deleted_at IS NULL GROUP BY users.id`. Cheap given partner counts are <100s. Sort default: `created_at desc`. No multi-column sort UI in v1.1 — planner can add a single-click column sort if trivially cheap, otherwise defer.
- **D-09-11 (Per-row actions — full set):** Three actions per row: (a) Disable/Re-enable toggle (single button switches label based on status), (b) `Re-issue invitation` (visible only when the user has not yet redeemed — i.e., the `accounts.password` column is null OR an invitation token exists in `password_resets` of kind `'invitation'` that's still unredeemed and unexpired; planner finalizes the predicate), (c) `Send password reset` (visible for all active users). All three call wrapped admin actions; (b) and (c) emit one-time URLs surfaced via Phase 6's `InviteUrlModal` primitive. Toast feedback on success/failure (sonner pattern from Phase 6/7/8).
- **D-09-12 ('Create new partner' CTA):** Top-of-list primary button on `/[adminSegment]/accounts`. Click → modal (NOT a separate sub-route). Modal form: `email` (required, email format), `displayName` (required, ≥1 char), `language` (segmented `fr` / `en`, default `fr`). RHF + Zod, same-schema-client+server discipline (SHELL-11). Submit → `adminCreateInvitation` wrapped action → on success, the modal closes and `InviteUrlModal` opens with the new partner's one-time invitation URL (one-time display + copy button + "won't be shown again" warning per Phase 6 D-09).

### Implicit decisions (planner discretion — not asked)

- **Routing structure under `/[adminSegment]`**: planner adds two new top-level pages (`coefficients/page.tsx`, `accounts/page.tsx`) plus updates `/[adminSegment]/page.tsx` (the admin home placeholder) to render two card-style links navigating to those pages. Existing layout.tsx requires no change. No admin sidebar.
- **Route handlers for the editor's save action**: prefer Server Action inside the page (Phase 6/7/8 pattern) over an explicit `/api/admin/global-params` Route Handler unless planner identifies a reason to prefer a separate handler (e.g., needing manual fetch from a non-form caller). Server Actions match the form-driven UX and inherit Better Auth's CSRF discipline.
- **`adminCreateInvitation` invariant**: the wrapper validates that the email isn't already a user, mirroring Phase 6's `createInvitation` re-issuance discipline. If the email exists, return a structured error so the modal can show "User already exists — use Send password reset instead" with a button to switch flows.
- **Re-issue invitation predicate**: planner reads Phase 6's invitation-redemption logic (`src/lib/auth/redeem.ts`) to determine the exact predicate ("user has been created via invitation but hasn't redeemed yet"). Likely shape: `users.deleted_at IS NULL AND accounts.password IS NULL AND password_resets.kind = 'invitation' AND password_resets.redeemed_at IS NULL AND password_resets.expires_at > now()`. Confirm during planning.
- **History rendered diff format**: the `field: old → new` shape is the human-readable contract. For coefficients (4×3 = 12 cells), planner only renders the cells that changed, not all 12 — a full row dump would be noisy.
- **Coefficient editor input format**: numeric strings (matching `numeric(10, 8)` storage) — admin types `3.0000`, NOT `3` or `3.0`. RHF `register('coefficients.t1.36', { valueAsNumber: false })` keeps the typed-string discipline that Phase 7's `parseNumeric`/`formatNumeric` boundary helpers use. Validation: Zod `z.string().regex(/^\d+(\.\d{1,8})?$/)` per cell.
- **Optimistic UI on disable/re-enable**: NOT used — wait for server confirmation, then refresh the row's status chip via `revalidatePath` or the equivalent. Avoids the awkward "appears toggled but server rejected" state.
- **Empty state for partners list**: copy in i18n: "Aucun partenaire pour l'instant — créez le premier" / "No partners yet — create the first one". Same `.card` chrome as Phase 7's home empty-state.
- **Empty state for history table**: shouldn't really happen in practice (Phase 8 seed migration inserts the first row), but render `"Aucun historique pour l'instant"` / `"No history yet"` for safety.
- **i18n keys**: estimated ~40-50 new keys × 2 langs for Phase 9 (coefficients editor labels + modal text + history columns + explain tool labels + accounts list columns + accounts actions + create partner modal + empty states + toast messages). Keys live in `src/lib/i18n/dictionaries.ts` with section comment per Phase 6 06-02 pattern.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & milestone
- `.planning/PROJECT.md` — milestone goal, locked decisions log (commission invisibility, hidden admin URL, append-only history, no-SMTP discipline)
- `.planning/REQUIREMENTS.md` — ADMIN-01..09 (9 reqs); Open Q6 already resolved (Antoine + Emmanuel as launch admins)
- `.planning/STATE.md` — Phase 6 follow-ups (admin password rotation, Better Auth trustedOrigins, APP_URL env vars, admin domain `@leasetic.com`); Decisions Log

### Phase 9 design contract (will be produced by /gsd-ui-phase 9 next — UI hint = yes per ROADMAP)
- `.planning/phases/09-admin-surface/09-UI-SPEC.md` — coefficients editor visual, history table layout, explain tool formula trail rendering, accounts list table, InviteUrlModal reuse, Create-partner modal

### Phase 8 deliverables (preserve invariants)
- `.planning/phases/08-persistence-pdf-pipeline/08-CONTEXT.md` — D-A1..A3 (PDF rendering), D-B1..B3 (submit flow), D-C1 (cursor pagination — Phase 9 history reuses), `params_snapshot` immutability invariant
- `src/db/schema.ts` — `globalParams` (DATA-05 append-only), `proposals.params_snapshot` (DATA-01 immutability), `auditLog` (DATA-07); all three already exist from Phase 8
- `src/lib/db/queries/global-params.ts` — `getLatestGlobalParams()` (Phase 8 read), `insertGlobalParams()` (Phase 9 will call from wrapped admin action)
- `src/lib/db/queries/audit-log.ts` — `writeAuditLog()`; `AuditAction` union — Phase 9 EXTENDS the union (D-09-09a)
- `src/lib/calc/index.ts` — `computeLoyer`, `tKey`, `validityDaysSchema`, `proposalInputSchema`; Phase 9 explain tool imports `computeLoyer` client-side (D-09-08)
- `src/lib/calc/seed-params.ts` — `getMaxAmount()` swap-in seam comment cites "Phase 8 swaps to global_params read"; Phase 9 wires `getDefaultValidityDays()` similarly

### Phase 6 deliverables (preserve invariants)
- `.planning/phases/06-auth-shell/06-CONTEXT.md` — D-09 (24h token TTL + InviteUrlModal one-time-display pattern), D-11 (re-issuance discipline), D-18 (admin URL 404-not-403), D-23 (users never hard-deleted)
- `src/lib/auth/require.ts` — `requireUser()`, `requireAdmin()` (returns `{ session, actorId }`); every Phase 9 server action calls `requireAdmin()` FIRST per AUTH-15 / PITFALLS §7.3
- `src/lib/auth/actions.ts` — `disableUser`, `reEnableUser`, `createInvitation`, `createPasswordReset` — Phase 9 WRAPS these (D-09-09), does NOT edit
- `src/lib/auth/redeem.ts` — invitation/reset redemption flow; Phase 9 reads to determine the "invitation unredeemed" predicate for D-09-11(b)
- `src/lib/i18n/dictionaries.ts` — 263+ keys; Phase 9 ADDS ~40-50 new keys × 2 langs (D-09 implicit decision)
- `src/lib/i18n/format.ts` — `formatCurrency`, `formatNumber`, `formatDate` (explicit fr-FR / en-GB locale per SHELL-09); Phase 9 reuses everywhere numbers/dates render
- `app/(admin)/[adminSegment]/layout.tsx` — 2-layer admin gate (env-segment notFound → requireAdmin); Phase 9 adds children, no layout edits
- `app/(admin)/[adminSegment]/page.tsx` — placeholder admin home; Phase 9 replaces body with two card-style links to `/coefficients` and `/accounts`
- Phase 6 plan 06-07 SUMMARY — `InviteUrlModal` primitive details (one-time URL display, copy button, "won't be shown again" warning); Phase 9 reuses for new-partner + reset + re-issue invitation flows

### Phase 5 deliverables
- `src/lib/db/index.ts` — Drizzle adapter; Phase 9 extends queries (or via existing query helpers in `src/lib/db/queries/`)
- `eslint.config.mjs` — `no-restricted-imports` rules (no `@vercel/*` outside lib adapters); Phase 9 stays inside the adapter discipline. Also: ESLint hardcoded-JSX rule (Phase 6 06-02) means every Phase 9 UI string goes through `t()`.

### Architecture & pitfalls
- `.planning/research/ARCHITECTURE.md` — §2.4 (data model), §2.5 (PDF immutability snapshot pattern), §4.4 (no-SMTP / admin-mediated invitation+reset), §7 (cookie-based dark mode + i18n), §9 (OVH portability adapter discipline)
- `.planning/research/PITFALLS.md` — §1.3 (Server Action vs Route Handler), §1.6 (`force-dynamic` on session-reading layouts), §7.1 (URL obscurity ≠ security; role check is the real gate), §7.3 (action ordering: requireAdmin first, then mutations, then audit), §9.4 (error redaction at boundary)
- `.planning/research/STACK.md` — locked dep versions (Better Auth 1.6.9, Drizzle 0.45.2, etc.)
- `.planning/research/SUMMARY.md` — admin role provisioning resolution (Antoine + Emmanuel)

### v10 source (reference, not literal port)
- `Matrice_2026_THE_Leasetic-v10.html` — visual reference for coefficient table layout (4×3 grid in v10's per-partner config UI); reference for v10 commission/max/validity defaults

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Admin gate** (`app/(admin)/[adminSegment]/layout.tsx`): 2-layer gate (env-segment + requireAdmin) already shipped in Phase 6 06-07. Phase 9 adds children pages; no gate work.
- **`requireAdmin()`** (`src/lib/auth/require.ts`): every new Phase 9 server action calls this FIRST per AUTH-15 / PITFALLS §7.3.
- **Phase 6 auth primitives** (`src/lib/auth/actions.ts`): `disableUser`, `reEnableUser`, `createInvitation`, `createPasswordReset` — Phase 9 wraps in admin-layer actions (D-09-09); does NOT edit.
- **`InviteUrlModal`** (Phase 6 06-07): one-time URL display + copy button + "won't be shown again" warning. Phase 9 reuses for create-partner + reset + re-issue flows.
- **`writeAuditLog()`** (`src/lib/db/queries/audit-log.ts`): Phase 9 EXTENDS the `AuditAction` union (D-09-09a) and calls from wrapped admin actions.
- **`getLatestGlobalParams()`** + **`insertGlobalParams()`** (`src/lib/db/queries/global-params.ts`): Phase 9 reads via the former (editor + history), writes via the latter (wrapped in admin action with audit log).
- **`computeLoyer`, `tKey`, `validityDaysSchema`** (`src/lib/calc/index.ts`): Phase 9 explain tool imports `computeLoyer` client-side; tranche auto-derived via `tKey()`.
- **`formatCurrency`, `formatNumber`, `formatDate`** (`src/lib/i18n/format.ts`): explicit fr-FR / en-GB locale; reused everywhere Phase 9 renders numbers/dates.
- **CSS chrome** (`app/globals.css` from Phases 4–7): `.card`, `.ctitle`, `.fld`, `.invalid`, `.btn-green`, `.btn-out`, `.btn-navy`, `.tbadge`, `.dg/.db/.db.on`, `.yn-btn`, `.chip` (Phase 8). Phase 9 reuses for editor cards, accounts table rows, status chips. May add: `.tabs` if planner picks tab UI for explain tool, `.history-row .diff` for the rendered-diff cell styling.
- **Sonner toasts**: success/info/error/loading patterns from Phase 6/7/8.
- **RHF + Zod, same schema client+server** (SHELL-11 pattern).
- **i18n dictionary** (`src/lib/i18n/dictionaries.ts`): 263+ keys; Phase 9 adds ~40-50 new keys × 2 langs.

### Established Patterns
- **`'use server'` server actions** for form-driven UX (Phase 6/7/8 default). Phase 9 prefers server actions over Route Handlers unless a specific reason to prefer the latter.
- **`requireAdmin()` first, then mutation, then audit** (PITFALLS §7.3). The wrapped admin actions follow this strictly: `await requireAdmin()` → primitive call → `await writeAuditLog()` → return.
- **Drizzle migration discipline**: Phase 9 likely needs ZERO new migrations — schema is already complete from Phase 8. ONE possible exception: if planner judges the audit_log query needs an index for the coefficient-history cursor pagination, that's a small `0003_*.sql`. Otherwise: zero migrations.
- **Server-component reads + `'use client'` interactivity**: Phase 9 pages follow the same split as Phase 7/8 — top-level page is a server component that calls `requireAdmin()` + reads data, passes to a client component for form/interactive UI.
- **`force-dynamic`** on every page that reads session cookies (PITFALLS §1.6). Already pattern from Phase 6/7/8.
- **Defense-in-depth requireAdmin** (AUTH-15): every Phase 9 page AND every Phase 9 server action calls `requireAdmin()` independently — never delegates to layout alone.

### Integration Points
- **`/[adminSegment]/page.tsx`**: replace placeholder body with two card-style links to `/coefficients` and `/accounts`. Reuse `requireAdmin()` + `getCurrentLang()` + `t()`.
- **`/[adminSegment]/coefficients/page.tsx`** (NEW): server component. `await requireAdmin()` → `await getLatestGlobalParams()` → render `<CoefficientsEditor latestParams={...} />` (client) + `<HistoryTable ... />` (server-paginated server component) + `<ExplainTool latestParams={...} />` (client).
- **`/[adminSegment]/accounts/page.tsx`** (NEW): server component. `await requireAdmin()` → `await listPartnersWithCounts(...)` (NEW query helper in `src/lib/db/queries/users.ts` or `partners.ts`) → render `<AccountsList partners={...} />` (client for actions; server-rendered table body).
- **`src/lib/admin/actions.ts`** (NEW): wrapped admin actions: `adminUpdateGlobalParams`, `adminDisableUser`, `adminReEnableUser`, `adminCreateInvitation`, `adminCreatePasswordReset`. Each: requireAdmin → primitive → writeAuditLog.
- **Phase 7 swap-in seam**: `getDefaultValidityDays()` reads from latest `global_params.validity_days`; `<ValiditySegmented>` props hook into this value at the page level (`app/(authed)/proposals/new/page.tsx`). Per D-09-13: schema unchanged, just wire the read.
- **Audit log union extension**: `src/lib/db/queries/audit-log.ts` `AuditAction` extended (D-09-09a). All admin wrappers + Phase 6 grant-admin CLI key reconciliation.

</code_context>

<specifics>
## Specific Ideas

- **Modal diff format** (D-09-01): `commission_pct: 5.00 → 5.50`, `coefficients.t1.36: 3.0000 → 3.1000`. Field path is the dotted JSON path (familiar from React-Hook-Form / Zod nesting). Use a monospace font for the values to keep alignment clean.
- **Step-by-step formula rendering** (D-09-07): the formula trail mirrors v10's mental model — the formula string `loyer = montantHT × (1 + commission/100) × coefficient / 100` is the canonical phrase a partner uses to explain pricing to their client. Render it on its own line, then on subsequent lines show progressive substitution (`= 50 000 × (1 + 5/100) × 2.3000 / 100`, `= 50 000 × 1.05 × 2.3000 / 100`, `= 1 207.50 €/mois`). The substitution-per-line keeps the calculation auditable for the admin.
- **Tab/section title for explain tool**: i18n key like `admin.coefficients.explain.title` = "Vérifier le calcul" / "Verify calculation". The label "Verify" frames the tool as a sanity check, not a full debugger — matches its scope.
- **History row "changes" cell**: render an inline list of changed fields, comma-separated for short diffs, line-broken for long ones. Cap at e.g. 4 visible items + "+ N more" link if a single save changes many cells (rare but possible if admin overwrites the entire coefficient table at once).

</specifics>

<deferred>
## Deferred Ideas

- **Generic audit-log VIEWER** (filter by actor / action / date range across all admin and partner mutations) — v1.2+ per PROJECT.md "Future Requirements" (Audit log UI). Phase 9 only writes (extends the action union) and reads for the coefficient-history table.
- **Editable validity options list** (`validity_options jsonb` schema bump + list-editing UI + default-must-be-in-list validation) — D-09-13 keeps schema as single int. v1.2+ schema bump if Leasétic ever needs more flexibility than the v10-locked `{15, 30, 60}`.
- **Admin sidebar with nav items** for `/coefficients`, `/accounts`, future admin pages — Phase 9 uses card-style links on the admin home page; planner can opt-in if trivially cheap. Full sidebar nav is deferred unless ADMIN routes grow beyond ~3-4 pages.
- **Admin self-service password change UI** — out of scope. Admin password rotation handled out-of-band (Phase 6 follow-up #1) via the admin↔admin reset flow already wired.
- **Better Auth `trustedOrigins` hardening / explicit Origin gate middleware** — Phase 6 follow-up #2; Phase 9 hardening candidate but explicitly not in this phase's scope (would expand Phase 9 beyond its requirement set).
- **Cross-partner proposal read view for admin** — explicitly deferred per PROJECT.md "Future Requirements" (Admin cross-partner proposal read view). Single-admin scope makes manual support workable in v1.1; v1.2+ if support load grows.
- **Multi-admin permission tiers / RBAC framework** — out of scope per PROJECT.md "Out of Scope".
- **Optimistic UI on disable/re-enable** — Phase 9 uses server-confirmed updates; optimistic toggling is a polish item, not a requirement.
- **Multi-column sort UI on partners list** — single sort column (created_at desc) by default; click-to-sort on other columns is a v1.2 polish item if planner judges it cheap, otherwise defer.
- **Audit log retention/purge cron** — Phase 10 ops (CUT-08) or v1.2.

</deferred>

---

*Phase: 9-admin-surface*
*Context gathered: 2026-05-09*
