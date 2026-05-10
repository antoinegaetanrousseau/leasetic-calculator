---
phase: 09
slug: 09-admin-surface
status: verified
threats_total: 42
threats_closed: 42
threats_open: 0
asvs_level: 1
created: 2026-05-10
audit_date: 2026-05-10
auditor: Claude (gsd-security-auditor)
---

# Phase 09 — Admin Surface Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser → Server Action (admin) | Untrusted form data + intent reaches admin server actions via Next.js Server Action protocol | Form fields, user IDs, cursor values |
| Server Action → Phase 6 primitive | Trusted-after-requireAdmin call into existing auth-layer code | userId, email, displayName; no commission data |
| Server Action → Drizzle write | Parameterized queries via Drizzle ORM; no raw SQL with user input | Global params row, audit log row |
| Server Action → audit_log row | Actor identity from session only; never from client args | actorId, action key, structured payload |
| Browser → admin home page | URL params (adminSegment) from dynamic route; layout gates first | adminSegment string (env-driven secret) |
| Browser → proposal-new page | Gated by Phase 6 requireUser; Phase 9 adds a global_params validity read | validityDays integer only (not full row) |

---

## Threat Register

### Plan 09-01 — Data-Layer Foundation (12 threats)

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-09-01-01 | Spoofing | adminUpdateGlobalParams | mitigate | `requireAdmin()` called first at `actions.ts:98`; actorId from `session.user.id` (never from args). Evidence: `grep -n "await requireAdmin()" src/lib/admin/actions.ts` → line 98 in wrapper body before any DB call. | CLOSED |
| T-09-01-02 | Tampering | coeffEditorSchema mass-assignment | mitigate | `src/lib/admin/schemas.ts` defines explicit `coeffEditorSchema` with strict regex per field (commissionPct `/^\d+(\.\d{1,4})?$/`, maxAmount `/^\d+(\.\d{1,2})?$/`, validityDays `z.coerce.number().int().min(1)`, 4×3 coefficient grid `z.object({t1,t2,t3,t4})`). No spread of arbitrary form data into INSERT — `adminUpdateGlobalParams` only passes schema-validated fields to `insertGlobalParams`. Evidence: `schemas.ts:25-43`, `actions.ts:100-107`. | CLOSED |
| T-09-01-03 | Tampering | adminDisableUser / adminReEnableUser | mitigate | userId passed directly to Phase 6 Drizzle parameterized primitive. No SQL concatenation. Audit payload encodes userId in `payload`, not `targetId`. Evidence: `actions.ts:137-145, 160-168`. | CLOSED |
| T-09-01-04 | Repudiation | every wrapper (ADMIN-08) | mitigate | `writeAuditLog` called in every wrapper's happy path with `actorId: session.user.id`, typed action union key, and structured payload. Evidence: `actions.ts` — 6 calls to `writeAuditLog` across 5 exported wrappers (createInvitation writes 2). | CLOSED |
| T-09-01-05 | Information Disclosure | commission_pct leak via audit log | mitigate | Only `adminUpdateGlobalParams` payload includes `commissionPct` (via `computeChangedFields`). All other wrappers carry payloads with no commission field. D-09-09b comment at `audit-log.ts:5-7`. Grep-verified: `commission_pct` count in `adminDisableUser`, `adminReEnableUser`, `adminCreateInvitation`, `adminCreatePasswordReset` bodies = 0 each. Accounts surface files all return 0 matches. | CLOSED |
| T-09-01-06 | Information Disclosure | error redaction (PITFALLS §9.4) | mitigate | `adminUpdateGlobalParams` catch block (lines 118-124): `const msg = e instanceof Error ? e.message : String(e); console.error('[adminUpdateGlobalParams] failed:', msg)` — raw error object never logged. Other wrappers log `e` but do not handle global_params data, so no commission leak path. Evidence: `actions.ts:118-124` (CR-03 fix commit `0f736e4`). | CLOSED |
| T-09-01-07 | Information Disclosure | listPartnersWithCounts JSON shape | accept | Query returns email/displayName/role/status/timestamps/proposalsCount — no PII beyond what admin already sees per ADMIN-05. No commission_pct selected (defense in depth — commission lives on global_params, not users table). Grep: `commission_pct|commissionPct` in `users.ts` non-comment lines = 0. Documented in Accepted Risks Log. | CLOSED |
| T-09-01-08 | Denial of Service | listGlobalParamsHistory unbounded | mitigate | `DEFAULT_HISTORY_LIMIT = 20` at `global-params.ts:81`; cursor pagination enforced (`fetchCount = limit + 1`). No caller parameter can exceed this limit (args.limit is optional, defaults to 20; the history-load-more server action hardcodes `limit: 20`). Evidence: `global-params.ts:81, 95-96, 125`. | CLOSED |
| T-09-01-09 | Elevation of Privilege | requireAdmin ordering (PITFALLS §7.3) | mitigate | Every exported function in `actions.ts` calls `requireAdmin()` as the FIRST await before any DB read or primitive call. Verified: `actions.ts` lines 98, 135, 157, 197, 256, 299 — all appear before any subsequent `await`. | CLOSED |
| T-09-01-10 | Elevation of Privilege | role.grant audit key reserved | accept | Phase 9 reserves the `'role.grant'` union entry in `audit-log.ts:22`; `scripts/grant-admin.ts` does NOT yet write audit rows. Accepted risk for v1.1 per CONTEXT bookkeeping decision: single-admin ops, manual tracking acceptable. Documented in Accepted Risks Log. | CLOSED |
| T-09-01-11 | CSRF | server actions CSRF surface | mitigate | All Phase 9 admin mutations use Next.js Server Actions (no new Route Handlers). Server Actions inherit Better Auth's CSRF discipline (SameSite=Lax cookies, Phase 6 D-7). Grep of `app/api/` confirms no new admin Route Handlers were created in Phase 9. Evidence: `src/lib/admin/actions.ts:1` (`'use server'`), `history-load-more.action.ts:1` (`'use server'`). | CLOSED |
| T-09-01-12 | Idempotency | adminUpdateGlobalParams replay | accept | Append-only INSERT — replays produce additional rows with no destructive effect (DATA-05 invariant). The CR-01 fix (`isSaving` guard in `SaveConfirmModal`) prevents double-submit from the UI. Server-side replays create visible duplicate history rows; the diff will show "no changes" on a replay. Acceptable per DATA-05 design. Documented in Accepted Risks Log. | CLOSED |

### Plan 09-02 — Coefficients Page (11 threats)

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-09-02-01 | Spoofing | coefficients page auth | mitigate | `app/(admin)/[adminSegment]/coefficients/page.tsx:27` calls `await requireAdmin()` independently (AUTH-15 defense in depth on top of layout gate). Evidence: grep confirms `requireAdmin` at line 27. | CLOSED |
| T-09-02-02 | Tampering | coefficients editor save — double-submit | mitigate | CR-01 fix (commit `fb55362`): `SaveConfirmModal` has `isSaving` state; `onConfirm` returns early if `isSaving === true`; button is `disabled={pairs.length === 0 || isSaving}`. Evidence: `SaveConfirmModal.tsx:35, 78-79, 231-233`. | CLOSED |
| T-09-02-03 | Tampering | append-only global_params invariant | mitigate | `adminUpdateGlobalParams` calls `insertGlobalParams` (INSERT only) at `actions.ts:100`. No UPDATE path exists. Evidence: `actions.ts:100`; no `UPDATE` keyword appears in `src/lib/db/queries/global-params.ts` outside of the `listGlobalParamsHistory` join query on users. | CLOSED |
| T-09-02-04 | Repudiation | global_params.update audit row | mitigate | `writeAuditLog({ action: 'global_params.update', ... payload: diff })` at `actions.ts:109-116`. Diff includes `changed_fields`, `before`, `after` snapshots with full commissionPct/maxAmount/validityDays/coefficients/note. Evidence: `actions.ts:109-116`. | CLOSED |
| T-09-02-05 | Information Disclosure | commission_pct in history table | mitigate | `HistoryTable.tsx` has 0 direct references to `commissionPct` outside `HistoryDiff` delegation. Commission appears in the diff cell ONLY when it was a changed field, via `computeDiffPairs` → `HistoryDiff` — the correct allowed surface per ADMIN-09 §13. Grep: `commission_pct|commissionPct` in `HistoryTable.tsx` (excluding HistoryDiff delegation) = 0. | CLOSED |
| T-09-02-06 | Information Disclosure | ExplainTool commission_pct rendering | mitigate | ExplainTool is the declared SOLE non-editor surface per D-09-08. Evidence: `ExplainTool.tsx:175` — comment explicitly marks this as the ADMIN-09 carve-out. Commission renders at lines 160, 197, 208, 244. No DB write, no network call, no audit log entry. Pure client-side compute. | CLOSED |
| T-09-02-07 | Information Disclosure | SaveConfirmModal commission in diff | mitigate | `SaveConfirmModal.tsx:39-45` passes pending form values through `computeDiffPairs` for the modal diff. Commission appears in the diff cell when changed — this is the allowed pre-save review surface (admin must see what they're changing). No transmission to external surface. Evidence: `SaveConfirmModal.tsx:39-45`. | CLOSED |
| T-09-02-08 | Tampering | cursor injection in load-more action | mitigate | WR-03 fix (commit `63eacea`): `history-load-more.action.ts:24-40` validates cursor with `ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/` and `UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` before passing to query. Throws structured error key on validation failure. Evidence: `history-load-more.action.ts:24-40`. | CLOSED |
| T-09-02-09 | EoP | history load-more action requireAdmin | mitigate | `history-load-more.action.ts:30` calls `await requireAdmin()` as the first statement (AUTH-15). Evidence: `history-load-more.action.ts:30`. | CLOSED |
| T-09-02-10 | Spoofing | CoefficientsEditor RHF form actor | mitigate | `adminUpdateGlobalParams` receives form values but derives actorId exclusively from `requireAdmin()` session at `actions.ts:98`. No actor field in `AdminUpdateGlobalParamsArgs`. Evidence: `actions.ts:43-51, 98`. | CLOSED |
| T-09-02-11 | Idempotency | double-save server-side replay | accept | Double-submit guarded at UI level (CR-01 isSaving). Server-side replay creates a second history row with full diff showing unchanged fields — visible to admin in history table. DATA-05 append-only invariant makes this non-destructive. Acceptable per T-09-01-12 rationale. Documented in Accepted Risks Log. | CLOSED |

### Plan 09-03 — Accounts Page (13 threats)

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-09-03-01 | Spoofing | accounts page auth | mitigate | `app/(admin)/[adminSegment]/accounts/page.tsx:30` calls `await requireAdmin()` (AUTH-15 defense in depth). Evidence: grep confirms `requireAdmin` at line 30. | CLOSED |
| T-09-03-02 | Information Disclosure | commission_pct in accounts surface | mitigate | Zero commission references across all 4 accounts files. Grep: `commission_pct|commissionPct` in `AccountsList.tsx`, `page.tsx`, `CreatePartnerModal.tsx`, `timeAgo.ts` → all return 0. D-09-09b / ADMIN-09 §13 satisfied for this surface. | CLOSED |
| T-09-03-03 | Tampering | adminDisableUser / adminReEnableUser trigger | mitigate | Per-row action calls wrapped admin functions which call `requireAdmin()` first, then Phase 6 primitives. Sonner confirm-toast pattern requires explicit admin confirmation before the action fires. Evidence: `AccountsList.tsx:326-352` (disable flow), `AccountsList.tsx:355-382` (re-enable flow). | CLOSED |
| T-09-03-04 | Repudiation | disable/re-enable audit rows | mitigate | `adminDisableUser` writes `user.disable` at `actions.ts:138-145`; `adminReEnableUser` writes `user.re_enable` at `actions.ts:160-168`. Both verified present in implementation. | CLOSED |
| T-09-03-05 | Repudiation | adminReissueInvitation audit trail | mitigate | WR-01 fix (commit `b739b51`): `adminReissueInvitation` writes `user.disable` (line 323-330), `user.re_enable` on happy path (lines 364-372), `user.re_enable` on error path (lines 344-352), and `invitation.create` (lines 375-382). Full audit trail for the temporary-disable workaround. Evidence: `actions.ts:323-382`. | CLOSED |
| T-09-03-06 | Tampering | createPartnerSchema mass-assignment | mitigate | `createPartnerSchema` at `schemas.ts:50-54` whitelists exactly 3 fields: email (z.string().email()), displayName (z.string().min(1)), language (z.enum(['fr','en']).default('fr')). No arbitrary form fields reach `adminCreateInvitation`. Evidence: `schemas.ts:50-54`. | CLOSED |
| T-09-03-07 | Information Disclosure | email-already-exists error detail | mitigate | `adminCreateInvitation` catches Phase 6's "already active" string and re-throws structured key `'admin.accounts.modal.error.email.exists'` at `actions.ts:240-242`. No raw error bubbles to client. The modal shows a safe user-facing message. Evidence: `actions.ts:240-242`. | CLOSED |
| T-09-03-08 | Elevation of Privilege | re-issue button visibility predicate | mitigate | Re-issue button rendered ONLY when `p.hasUnredeemedInvite === true` (`AccountsList.tsx:443`). Predicate is DB-backed: `listPartnersWithCounts` queries `passwordResets` for `kind='invite' AND usedAt IS NULL AND expiresAt > now()` per `users.ts`. Evidence: `AccountsList.tsx:443`, `users.ts` hasUnredeemedInvite batch query. | CLOSED |
| T-09-03-09 | Information Disclosure | InviteUrlModal one-time URL discipline | mitigate | `InviteUrlModal.tsx` displays URL once, shows `auth.modal.warning` i18n key = "Ce lien ne sera plus affiché. Copiez-le et partagez-le par un canal sécurisé." (lines 210-236). CR-02 fix (commit `0f39a5a`) replaced `btn-ghost` with `btn-out` so the Close button is styled and accessible. Evidence: `InviteUrlModal.tsx:210-236, 287`. | CLOSED |
| T-09-03-10 | Tampering | adminCreatePasswordReset userId param | mitigate | `adminCreatePasswordReset(userId)` passes userId to Phase 6 Drizzle-parameterized `createPasswordReset`. No SQL injection surface. requireAdmin gates first. Evidence: `actions.ts:255-271`. | CLOSED |
| T-09-03-11 | Repudiation | password_reset.create audit row | mitigate | `writeAuditLog({ action: 'password_reset.create', ... })` at `actions.ts:259-265`. Payload includes `{ userId }`. Evidence: `actions.ts:259-265`. | CLOSED |
| T-09-03-12 | Repudiation | invitation.create audit rows | mitigate | `adminCreateInvitation` writes `user.create` (lines 220-227) AND `invitation.create` (lines 228-235). Both required per ADMIN-08. Evidence: `actions.ts:220-235`. | CLOSED |
| T-09-03-13 | EoP | stale partners list after action | mitigate | WR-06 fix (commit `a657e31`): `AccountsList.tsx` removed `useState(initialPartners)` and reads `initialPartners` prop directly. `router.refresh()` delivers fresh server-component data that React reconciles without stale chips. Evidence: `AccountsList.tsx:43-62` — no `useState` wrapping `initialPartners`. | CLOSED |

### Plan 09-04 — Admin Home + Validity Seam (6 threats)

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-09-04-01 | Spoofing | admin home page auth | mitigate | `app/(admin)/[adminSegment]/page.tsx:32` calls `await requireAdmin()` independently (AUTH-15 defense in depth on top of layout gate). Evidence: grep confirms `requireAdmin` at line 32. | CLOSED |
| T-09-04-02 | Information Disclosure | admin home cards link via env-segment | mitigate | Card `href` built from `params.adminSegment` (already gate-validated by layout). Template string `/${adminSegment}/coefficients` — no env var leakage beyond the segment value the admin already knows. Evidence: `app/(admin)/[adminSegment]/page.tsx` uses `${adminSegment}` template in both Link hrefs. | CLOSED |
| T-09-04-03 | Information Disclosure | proposal-new page reads global_params | mitigate | `proposals/new/page.tsx` reads `params?.validityDays` (single integer) from the already-fetched global_params row. commission_pct, maxAmount, coefficients are NOT passed to the partner-facing form. Grep: `commission_pct|commissionPct` in `proposals/new/page.tsx` = 0. Evidence: `proposals/new/page.tsx:66-75`. | CLOSED |
| T-09-04-04 | Tampering | seedParams extension | accept | `seedParams` object literal is readonly in TypeScript. Adding `defaultValidityDays: 30` is additive; no existing calc tests broke (399/399 pass). Calc-engine `validityDaysSchema` is byte-identical to Phase 7. Documented in Accepted Risks Log. | CLOSED |
| T-09-04-05 | Idempotency | admin home re-render | accept | Pure SSR read; idempotent by design. No mutations on the admin home page. Documented in Accepted Risks Log. | CLOSED |
| T-09-04-06 | EoP | partners reach admin home via URL guessing | accept | Fully covered by Phase 6's 2-layer gate: `layout.tsx` calls `notFound()` on wrong env-segment (URL secrecy, D-18) then `requireAdmin()` (real role check). Phase 9 adds no gate logic but inherits it. Documented in Accepted Risks Log. | CLOSED |

---

## Cross-Cutting Invariant Verification

The following Phase 9 cross-cutting invariants were explicitly verified beyond the per-threat checks above:

### Commission Invisibility (ADMIN-09)

| Check | Evidence | Result |
|-------|----------|--------|
| `commission_pct` NOT in non-`global_params.update` audit payloads | All wrappers except `adminUpdateGlobalParams` carry payloads with no commission field (grep per function = 0) | PASS |
| `listPartnersWithCounts` SELECT has no commission column | `users.ts:24` ADMIN-09 comment; users table has no commission column; grep in `users.ts` (non-comment lines) = 0 | PASS |
| HistoryTable does NOT render commission as standalone column | Grep `commissionPct|commission_pct` in `HistoryTable.tsx` (excluding HistoryDiff delegation) = 0 | PASS |
| Commission renders ONLY in: CoefficientsEditor input, ExplainTool formula trail, SaveConfirmModal diff (when changed), HistoryTable diff cell (when changed) | All four surfaces confirmed; all other surfaces return 0 matches | PASS |
| `console.error` in `adminUpdateGlobalParams` redacted (CR-03) | `actions.ts:118-124`: `const msg = e instanceof Error ? e.message : String(e)` — raw `e` not logged | PASS |
| ExplainTool is pure-client, zero DB write, zero network | `ExplainTool.tsx` has no server action call, no fetch, no `writeAuditLog` import | PASS |

### requireAdmin Ordering (PITFALLS §7.3 + AUTH-15)

| Check | Evidence | Result |
|-------|----------|--------|
| Every server action in `actions.ts` calls `requireAdmin()` FIRST | Lines 98, 135, 157, 197, 256, 299 — all before any DB/primitive call | PASS |
| `history-load-more.action.ts` calls `requireAdmin()` FIRST | `history-load-more.action.ts:30` before `listGlobalParamsHistory` call at line 41 | PASS |
| Every admin page calls `requireAdmin()` independently | `coefficients/page.tsx:27`, `accounts/page.tsx:30`, `page.tsx:32` all confirmed | PASS |
| Admin layout has 2-layer gate (env-segment notFound → requireAdmin) | `layout.tsx:39-47` confirmed | PASS |

### Data Integrity (DATA-05 + PROP-23)

| Check | Evidence | Result |
|-------|----------|--------|
| global_params is append-only (no UPDATE in Phase 9 admin code) | `actions.ts:100` calls `insertGlobalParams`; no `UPDATE` in `global-params.ts` write path | PASS |
| Phase 8 PDF immutability (PROP-23) not weakened | Phase 9 adds no code touching `params_snapshot` or PDF rendering | PASS |
| validityDaysSchema {15,30,60} whitelist unchanged (D-09-14) | `src/lib/calc/schema.ts:47` = `z.union([z.literal(15), z.literal(30), z.literal(60)])` — byte-identical to Phase 7 | PASS |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-09-01 | T-09-01-07 | `listPartnersWithCounts` exposes email/displayName/role/timestamps — acceptable PII scope for admin per ADMIN-05. No commission. | Phase 9 planner (CONTEXT D-09-10) | 2026-05-09 |
| AR-09-02 | T-09-01-10 | `role.grant` audit action reserved in union but `scripts/grant-admin.ts` does NOT yet write audit rows. v1.1 single-admin ops with manual tracking. Future: add audit write to grant-admin CLI. | Phase 9 planner (CONTEXT T-09-01-10) | 2026-05-09 |
| AR-09-03 | T-09-01-12, T-09-02-11 | Server-side replay of `adminUpdateGlobalParams` creates additional `global_params` rows (DATA-05 append-only; non-destructive). UI double-submit guarded by CR-01 `isSaving` guard. | Phase 9 planner (threat_model) | 2026-05-09 |
| AR-09-04 | T-09-04-04 | `seedParams.defaultValidityDays = 30` added to readonly const — additive, no existing test regression. Calc tests 399/399 pass. | Phase 9 planner (09-04-PLAN.md) | 2026-05-09 |
| AR-09-05 | T-09-04-05 | Admin home page re-render is pure SSR read — idempotent by design, no mutation surface. | Phase 9 planner | 2026-05-09 |
| AR-09-06 | T-09-04-06 | Partners reaching admin home via URL guessing is addressed by Phase 6's 2-layer gate (env-segment notFound + requireAdmin). Phase 9 inherits without re-implementing gate logic. | Phase 9 planner (ADMIN-07 context note) | 2026-05-09 |
| AR-09-07 | cross-cutting | `adminReissueInvitation` uses a temporary-disable workaround (sets `deletedAt` then restores it). Risk is low: button only shows when `hasUnredeemedInvite` is true (partner has never logged in). Workaround is fully audited (WR-01 fix). Plan 03 follow-up: add a `reissueInvitation(userId)` Phase 6 primitive. | Phase 9 planner (09-01-SUMMARY.md) | 2026-05-09 |
| AR-09-08 | cross-cutting | Better Auth `trustedOrigins` hardening not addressed in Phase 9 (explicitly deferred per 09-CONTEXT.md "Phase 6 follow-up #2"). All Phase 9 mutations use Server Actions (not Route Handlers), so the risk surface is limited to Better Auth's own session endpoints. Future hardening item in STATE.md. | Phase 9 planner (09-CONTEXT.md deferred list) | 2026-05-09 |

---

## Unregistered Threat Flags

The following items appeared in SUMMARY.md `## Threat Flags` sections and are assessed here:

- **09-02-SUMMARY.md**: "No new threat surface introduced beyond what the plan's threat model covers." → No unregistered flags.
- **09-03-SUMMARY.md**: "No new threat surface beyond what the plan's threat model covers. The InviteUrlModal fix removes a latent client-bundle contamination (no security surface change, only correctness fix)." → No unregistered flags.

No unregistered threat flags identified.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-10 | 42 | 42 | 0 | Claude (gsd-security-auditor) |

---

## Sign-Off

- [x] All 42 threats have a disposition (mitigate / accept)
- [x] Accepted risks documented in Accepted Risks Log (8 entries covering 8 accepted risks)
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-10
