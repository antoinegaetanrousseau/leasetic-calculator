---
phase: 30
slug: company-contact-registry
status: verified
threats_open: 0
asvs_level: 2
created: 2026-09-01
---

# Phase 30 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

Register authored at plan time (`register_authored_at_plan_time: true`) — all 9
plans carried a `<threat_model>` block, so this audit **verified declared
mitigations against the implementation** rather than building a retroactive
STRIDE register.

**Phase-defining security claims.** Phase 30 exists to let each partner keep a
private client book on top of a *shared* company registry. Two properties carry
the phase:

- **CRM-02 tenant isolation** — a partner must not be able to see *or infer*
  another partner's relationship. Inference channels count: counts, totals,
  pagination, search suggestions, autocomplete, 403-vs-404 divergence, and
  error-message wording. The silent SIREN dedup must be genuinely
  indistinguishable from a fresh create.
- **ADMIN-09 commission envelope** — no partner-facing surface may project
  commission inputs.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| browser → server action | arbitrary JSON reaching a mutation, including ids the caller does not own | relationship / contact ids, company name, SIREN |
| `/clients/[id]` path segment → server | a relationship id supplied entirely by the caller | relationship id |
| `?clientRelationshipId=` search param → draft creation | an id supplied by the caller, possibly copied from someone else | relationship id |
| URL search params → server query | `q`, `sort`, `dir`, `cursor` and anything else appended | free text, enum, base64url cursor |
| search input `q` → SQL | untrusted free text reaching an ILIKE pattern | free text |
| cursor string → SQL | untrusted base64url payload reaching an ORDER BY comparison | opaque cursor |
| page/action → query module | a caller that could omit or forge the owner scope | `ownerId` |
| `users.role` DB value → every authorization gate | untrusted-at-runtime string crossing into authorization decisions | role string |
| admin form submission → `users.role` | a client-supplied `partnerType` influencing an authorization field | partner type |
| Better Auth session cookie → role | a value cached for up to 5 minutes | role claim |
| `[adminSegment]` URL → admin tree | a guessed segment must not confirm the tree exists | admin path segment |
| admin oversight view → contact data | the one place a non-owner legitimately sees relationship metadata | counts only, never contact PII |
| result metadata (counts, totals, cursors) → partner | aggregates that could reveal another partner's rows | page-local counts only |
| error message → partner | wording that could confirm another partner's data | single bounded key |
| i18n copy → partner's mental model | strings that could confirm existence of another partner's record | generic zero-results copy |
| 404-vs-403 response shape → attacker | the distinction itself is a disclosure | HTTP status |
| draft finalization → `proposals.inputs` | the immutable snapshot backing every generated PDF | JSONB snapshot |
| audit payload → admin log | data written under an actor's identity | ids only |
| migration file → production database | DDL executed with elevated privileges via `db-migrate.yml` | schema DDL |

---

## Threat Register

72 threats. All closed. Evidence is `file:line` at audit time.

### Plan 30-01 — data model

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-30-01-01 | Elevation of Privilege | `users_role_check` widening + backfill | mitigate | CHECK re-added with `sales` before backfill; UPDATE guarded by `AND role='partner'` — `drizzle/0007_phase30_crm_registry.sql:79-81` | closed |
| T-30-01-02 | Tampering | `proposals.inputs` JSONB | mitigate | proposals ALTER is `ADD COLUMN` + FK + index only; no `inputs`/`params_snapshot`/`computed` token in file — `0007:65,77-78` | closed |
| T-30-01-03 | Information Disclosure | `contacts` table shape | mitigate | no `companyId` column; FKs to `clientRelationships` only — `src/db/schema.ts:418-438` | closed |
| T-30-01-04 | Spoofing | `client_relationships.owner_id` | mitigate | `ownerId` NOT NULL + FK to `users.id`; `(companyId, ownerId)` unique — `src/db/schema.ts:396-410` | closed |
| T-30-01-05 | Denial of Service | `leasetic_normalize_company_name` | **accept** | `IMMUTABLE STRICT`, bounded alternation, no nested quantifiers — `0007:8-27`. See Accepted Risks | closed |
| T-30-01-06 | Tampering | migration applied out of band | mitigate | `check-no-drizzle-push.sh` + `check-migration-journal-sync.sh` still gate CI | closed |
| T-30-01-SC | Tampering | npm/pip/cargo installs | mitigate | no new dependency added | closed |

### Plan 30-02 — UI shell

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-30-02-01 | Information Disclosure | zero-results copy | mitigate | generic string, no existence-leak wording — `src/lib/i18n/dictionaries.ts:963` | closed |
| T-30-02-02 | Elevation of Privilege | `AppSidebar` nav-set selection | mitigate | zero `sales` occurrences; `isAdmin && effectiveView==='admin'` gate untouched — `AppSidebar.tsx:158` | closed |
| T-30-02-03 | Information Disclosure | admin link visible to non-admins | mitigate | admin entry only via `adminNavItems()`, gated by `isAdmin` | closed |
| T-30-02-04 | Tampering | `SearchBar` widening regressing /proposals | mitigate | new props default to current keys; both existing call sites unedited — `SearchBar.tsx:24-25` | closed |
| T-30-02-SC | Tampering | npm/pip/cargo installs | mitigate | icons hand-authored; `grep hugeicons` → zero matches | closed |

### Plan 30-03 — role widening (ROLE-01..03)

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-30-03-01 | Elevation of Privilege | `requireUser()` role resolution | mitigate | allowlist, fail-closed to `'partner'` — `src/lib/auth/require.ts:40,68-74` | closed |
| T-30-03-02 | Elevation of Privilege | `partnerType` → `role` derivation | mitigate | `roleForPartnerType` returns only `'partner'\|'sales'` — `src/lib/admin/actions.ts:187` | closed |
| T-30-03-03 | Elevation of Privilege | re-inviting/re-typing an existing admin | mitigate | `role !== 'admin'` guard on both write sites — `admin/actions.ts:233,344-345` | closed |
| T-30-03-04 | Information Disclosure | admin oversight of Commercial accounts | mitigate | zero `eq(users.role,'partner')` remain; `inArray(['partner','sales'])` at `partners.ts:167`, `users.ts:66,137`, `partner-aggregates.ts:51,75`, `admin-activity.ts:127` | closed |
| T-30-03-05 | Information Disclosure | commission envelope (ADMIN-09) | mitigate | commission/`params_snapshot`/`global_params` grep in widened files → comment-only | closed |
| T-30-03-06 | Spoofing | stale cookie-cached role | **accept** | DB re-read every request — `require.ts:59-67`. See Accepted Risks | closed |
| T-30-03-07 | Elevation of Privilege | `sales` reaching an admin surface | mitigate | `requireAdmin()` unchanged, exact `!== 'admin'` — `require.ts:86-91` | closed |
| T-30-03-SC | Tampering | npm/pip/cargo installs | mitigate | no new dependency | closed |

### Plan 30-04 — owner-scoped queries

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-30-04-01 | Information Disclosure | cross-tenant read of relationships | mitigate | `ownerId` required param compiled into WHERE — `client-relationships.ts:156-159,272-275,315-318,371-374`; table-driven test `:189-224` | closed |
| T-30-04-02 | Information Disclosure | IDOR on `/clients/[id]` | mitigate | `null` for both not-found and not-owned — `client-relationships.ts:250-278` | closed |
| T-30-04-03 | Information Disclosure | contact leakage | mitigate | single joined statement, no pre-checked boolean — `client-relationships.ts:297-320` | closed |
| T-30-04-04 | Information Disclosure | inference via counts/totals/pagination | mitigate | no global count anywhere; `recordCount` = page length only | closed |
| T-30-04-05 | Information Disclosure | inference via search suggestions | mitigate | only `ilike`; no autocomplete endpoint under `app/(authed)/clients/` | closed |
| T-30-04-06 | Tampering | SQL injection via `q` | mitigate | `ilike()` bind-parameterized exclusively | closed |
| T-30-04-07 | Tampering | forged/malformed cursor | mitigate | `decodeCursor` → `null` on parse failure, treated as no-cursor | closed |
| T-30-04-08 | Information Disclosure | commission envelope (ADMIN-09) | mitigate | scalar-only projection; `params_snapshot`/`global_params` grep → comment-only | closed |
| T-30-04-09 | Elevation of Privilege | admin queries called from a partner page | mitigate | `companies.ts` admin-only, no `ownerId` param on any export | closed |
| T-30-04-SC | Tampering | npm/pip/cargo installs | mitigate | no new dependency | closed |

### Plan 30-05 — mutations

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-30-05-01 | Elevation of Privilege | forged owner in an action payload | mitigate | `ownerId` sourced only from `session.user.id` in all four actions | closed |
| T-30-05-02 | Information Disclosure | SIREN dedup revealing another partner's company | mitigate | identical shape/message on create and reuse; "already exists" grep → zero matches | closed |
| T-30-05-03 | Information Disclosure | error-message oracle | mitigate | single `BOUNDED_ERROR = 'clients.toast.error'` from every catch | closed |
| T-30-05-04 | Elevation of Privilege | IDOR on contact mutations | mitigate | ownership compiled into each mutation's own statement; zero rows throws | closed |
| T-30-05-05 | Tampering | TOCTOU between ownership check and write | mitigate | **Was OPEN — fixed during this audit.** `createContactAction` now uses `INSERT ... SELECT` sourced from the caller's own relationship — `src/lib/crm/actions.ts:181-207`. Regression test `crm/actions.test.ts` "proves ownership INSIDE the insert (T-30-05-05)" fails against the previous implementation | closed |
| T-30-05-06 | Repudiation | untracked registry mutations | mitigate | all four actions call `writeAuditLog` with `actorId: session.user.id` | closed |
| T-30-05-07 | Information Disclosure | commission envelope (ADMIN-09) | mitigate | audit payloads carry only ids — no commission field | closed |
| T-30-05-08 | Elevation of Privilege | admin using the partner mutation path | mitigate | `requireRelationshipHolder()` refuses admins via `notFound()` | closed |
| T-30-05-09 | Denial of Service | duplicate-submit runaway rows | mitigate | `onConflictDoNothing` on `(companyId, ownerId)` — `crm/actions.ts:113-115` | closed |
| T-30-05-SC | Tampering | npm/pip/cargo installs | mitigate | no new dependency | closed |

### Plan 30-06 — client book UI

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-30-06-01 | Elevation of Privilege | forged owner scope via search param | mitigate | no `?ownerId=`/`?user_id=` read in `page.tsx`; `ownerId` from session only | closed |
| T-30-06-02 | Information Disclosure | inference via row/page totals | mitigate | `DataGridPagination` not adopted; `recordCount` = page length | closed |
| T-30-06-03 | Information Disclosure | search as existence oracle | mitigate | fixed generic zero-results string | closed |
| T-30-06-04 | Information Disclosure | autocomplete/typeahead (A-5) | mitigate | no datalist/combobox/debounce/fetch in `CreateClientDialog.tsx` | closed |
| T-30-06-05 | Elevation of Privilege | adopting `solution-crm-3`'s ownership model | mitigate | `RowSelect`/bulk owner-assignment absent from `ClientsGrid.tsx` | closed |
| T-30-06-06 | Tampering | forged cursor or sort value | mitigate | `sort`/`dir` enum-validated server-side with silent fallback | closed |
| T-30-06-07 | Information Disclosure | client-side re-sort of a partial page | mitigate | `manualSorting: true`; no `.sort(` on rows; sorting pushes to URL and clears cursor | closed |
| T-30-06-08 | Elevation of Privilege | admin reaching the partner surface | mitigate | `requireRelationshipHolder()` gate confirmed | closed |
| T-30-06-SC | Tampering | npm/pip/cargo installs | mitigate | no registry fetch; all primitives pre-vendored | closed |

### Plan 30-07 — client detail

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-30-07-01 | Information Disclosure | IDOR on `/clients/[id]` | mitigate | `getClientRelationshipForOwner` → `notFound()`; no `403`/`redirect(` on that branch — `page.tsx:54,57` | closed |
| T-30-07-02 | Information Disclosure | contact leakage via fetch-then-hide | mitigate | ownership check strictly precedes contact/proposal fetch — `page.tsx:62,66-67` | closed |
| T-30-07-03 | Elevation of Privilege | contact mutation against another partner's relationship | mitigate | all three mutations re-prove ownership (see 30-05) | closed |
| T-30-07-04 | Information Disclosure | company-level contact exposure | mitigate | page addresses a relationship, never a company | closed |
| T-30-07-05 | Tampering | destructive action without confirmation | mitigate | `AlertDialog` in `DeleteContactDialog.tsx`; no `window.confirm` in the tree | closed |
| T-30-07-06 | Information Disclosure | commission envelope (ADMIN-09) | mitigate | `ProposalRow` reused; no `params_snapshot` | closed |
| T-30-07-07 | Information Disclosure | em dash for a null SIREN | **accept** | chip omitted entirely when `siren` is null — `page.tsx:104-106`. See Accepted Risks | closed |
| T-30-07-SC | Tampering | npm/pip/cargo installs | mitigate | `Dialog`/`AlertDialog` pre-vendored | closed |

### Plan 30-08 — admin registry

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-30-08-01 | Information Disclosure | non-admin reaching the companies tree | mitigate | `requireAdmin()` on all three admin pages | closed |
| T-30-08-02 | Information Disclosure | contact rows on company oversight view | mitigate | `CompanyRelationsTable.tsx` renders counts only; zero contact-field references | closed |
| T-30-08-03 | Elevation of Privilege | admin surface reused by a partner | mitigate | admin relationship detail imports nothing from `app/(authed)/clients/` | closed |
| T-30-08-04 | Tampering | mismatched company/relationship id pair | mitigate | `companyId !== id` → `notFound()` — `relations/[relationshipId]/page.tsx:64-65` | closed |
| T-30-08-05 | Information Disclosure | commission envelope (ADMIN-09) | mitigate | commission/`params_snapshot` grep → comment-only | closed |
| T-30-08-06 | Elevation of Privilege | admin mutating a partner's contacts | mitigate | no mutation control rendered on the admin tree | closed |
| T-30-08-07 | Information Disclosure | search-engine indexing of admin URLs | mitigate | `robots: { index: false, follow: false }` on every admin page | closed |
| T-30-08-SC | Tampering | npm/pip/cargo installs | mitigate | all primitives pre-vendored | closed |

### Plan 30-09 — proposal ↔ client link

> 30-09 has **no SUMMARY** — it is parked at a blocking human-verify checkpoint.
> Its code is landed (`8d2f06b`, `e86aec4`) and was audited directly against
> source and live test runs, not against a summary's claims.

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-30-09-01 | Information Disclosure | `?clientRelationshipId=` as existence oracle | mitigate | malformed / not-owned / not-found all collapse to `undefined`; no `notFound()` or throw on that branch — `parametres/page.tsx:136-167` | closed |
| T-30-09-02 | Elevation of Privilege | linking a proposal to another partner's relationship | mitigate | single write path to `client_relationship_id`, repo-wide grep confirms | closed |
| T-30-09-03 | Tampering | snapshot integrity | mitigate | `finalizeDraft`'s `.set()` carries no `inputs` or `clientRelationshipId` key | closed |
| T-30-09-04 | Information Disclosure | prefilled client data leaking across partners | mitigate | prefill sourced exclusively from owner-scoped queries | closed |
| T-30-09-05 | Denial of Service | stale link blocking a partner from quoting | mitigate | graceful degradation — a bad param never produces an error page | closed |
| T-30-09-06 | Information Disclosure | commission envelope (ADMIN-09) | mitigate | no change to `params_snapshot` computation or projection | closed |
| T-30-09-SC | Tampering | npm/pip/cargo installs | mitigate | no package install | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-30-01 | T-30-01-05 | `leasetic_normalize_company_name` is pure SQL, `IMMUTABLE STRICT`, over a bounded-length column, with bounded alternation and no nested quantifiers — no catastrophic-backtracking surface. Verified still true at `drizzle/0007_phase30_crm_registry.sql:8-27` | Antoine Rousseau | 2026-09-01 |
| R-30-02 | T-30-03-06 | Better Auth `cookieCache.maxAge` is 5 minutes, but `requireUser()` re-reads the role from the database on every request, so a stale cookie cannot carry a stale authorization decision. Verified at `src/lib/auth/require.ts:59-67` | Antoine Rousseau | 2026-09-01 |
| R-30-03 | T-30-07-07 | Cosmetic only. The UI-SPEC omits the SIREN chip entirely when `siren` is null rather than rendering a placeholder, so no null-state artifact reaches the page. Verified at `app/(authed)/clients/[id]/page.tsx:104-106` | Antoine Rousseau | 2026-09-01 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-01 | 72 | 72 | 0 | gsd-security-auditor (sonnet) + orchestrator verification |

### Security Audit 2026-09-01

| Metric | Count |
|--------|-------|
| Threats found | 72 |
| Closed | 72 |
| Open | 0 |

**One real gap found and fixed, not waived.**

`createContactAction` declared its mitigation as "the check and the write are the
same statement, so no window exists between them" (T-30-05-05), and 30-05-PLAN.md
mandated it verbatim: *"Do not read the contact first and then write; the read and
the write must be one statement."* The implementation instead issued a standalone
ownership `SELECT` followed by a separate `INSERT` — a genuine TOCTOU window, and
the one place in the phase where a declared mitigation was factually absent rather
than differently implemented. Its two sibling mutations (`updateContactAction`,
`deleteContactAction`) had always done it correctly via `inArray` subqueries.

Exploitability at the time of the audit was low — nothing in the codebase
reassigns `client_relationships.owner_id` — but the window would have become live
the moment an ownership-transfer feature shipped. It was fixed rather than
accepted: `createContactAction` now uses `INSERT ... SELECT` sourced from the
caller's own relationship.

The existing test did not catch it because the mock simply queued two results,
documenting the two-statement shape rather than rejecting it. The new regression
test was verified to **fail against the previous implementation** and pass against
the fix, so it is a real guard rather than a restatement.

Gate results after the fix: `typecheck` 0 · `lint:check` 0 · **1430 tests passed /
18 skipped** · all 6 repo guard scripts 0.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-01

> Scope note: this artifact certifies the **threat register**. Plan 30-09 still
> owes its human-verify checkpoint (steps 10–11), which is a functional
> acceptance gate, not a security one.
