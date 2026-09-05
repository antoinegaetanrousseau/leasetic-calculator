# Phase 8 — Persistence + PDF Pipeline — Plan Index

**Generated:** 2026-05-09
**Phase goal:** Submitting the proposal form persists an immutable, snapshotted row to Postgres, generates a byte-deterministic single-page PDF stored privately in blob, and the partner can browse, search, duplicate, download, and soft-delete their proposals from the home page.
**Source:** 12 D-A1..D3 + 23 D-8-* decisions in `08-CONTEXT.md` + `08-UI-SPEC.md`. 32 requirements (DATA-01..12 + PROP-02..05, 09..23, 26).

---

## Wave Structure

| Wave | Plans | What's built | Parallel-safe? |
|------|-------|--------------|----------------|
| 1 | 08-01, 08-02 | Schema + 0002 migration (foundation); i18n keys (no overlap) | YES — disjoint files |
| 2 | 08-03, 08-04 | DB queries (depends on 08-01); seed migration 0003 (depends on 08-01) | YES — disjoint files |
| 3 | 08-05 | `src/lib/pdf/` (depends on 08-02 for keys) | (single plan in wave) |
| 4 | 08-06, 08-07, 08-08 | PDF byte-determinism CI gate; POST handler + idempotency; stream + list API | YES — disjoint files |
| 5 | 08-09, 08-10, 08-11 | Form submit wiring; detail page; home list | YES — disjoint files |
| 6 | 08-12, 08-13, 08-14 | Delete/restore actions; duplicate flow; manual purge CLI | YES — disjoint files |

Within each wave, files-modified sets are **fully disjoint** (verified manually, see audit table below) — executor can run wave plans in parallel.

---

## Plan Summary

| Plan | Slug | Wave | Depends on | Purpose | Requirements grounded |
|------|------|------|------------|---------|----------------------|
| 08-01 | schema-and-migration | 1 | — | proposals + global_params + audit_log Drizzle tables + 0002 SQL | DATA-01..10 (schema-grounded) |
| 08-02 | i18n-keys | 1 | — | 56 new keys × 2 langs per UI-SPEC §7 | PROP-02..04, 11, 12, 13, 15, 16, 18, 20, 22, 26 (copy-grounded) |
| 08-03 | db-queries | 2 | 08-01 | createProposal, list/search/cursor, soft-delete/restore/purge, audit_log | DATA-06/07/08, PROP-02/05/09/20/21/22 |
| 08-04 | seed-migration | 2 | 08-01 | DATA-12 idempotent seed of global_params from src/lib/calc/seed-params.ts | DATA-12 |
| 08-05 | lib-pdf | 3 | 08-02 | @react-pdf/renderer + ProposalDocument + Font.register + renderProposalPdf | PROP-15, 16, 18, 19, DATA-09 |
| 08-06 | pdf-byte-determinism-ci-gate | 4 | 08-05 | Vitest fixture test + expected.sha256.txt + update CLI | PROP-17, DATA-09 |
| 08-07 | post-proposals-route | 4 | 08-03, 08-04, 08-05 | POST /api/proposals + idempotency + D-B1 fail-loud | PROP-09, 10, 14, 23, DATA-01/02/03/04/06/09 |
| 08-08 | stream-and-list-api | 4 | 08-03 | GET /api/proposals/{id}/pdf stream + GET /api/proposals list | PROP-13, 14, 5, 20, DATA-08 |
| 08-09 | form-submit-wiring | 5 | 08-02, 08-07 | ProposalForm.onSubmit → fetch + sonner.promise + idempotency key + freshness probe | PROP-09, 10 |
| 08-10 | detail-page | 5 | 08-02, 08-03, 08-08 | /proposals/{id} server component + ValidityChip/LanguageChip/DeletedChip + EmbeddedPdfPreview | PROP-11, 12, 13, 21 (entry point), 26 |
| 08-11 | home-list | 5 | 08-02, 08-08 | Home list + SearchBar + RecentlyDeletedToggle + LoadMoreButton + ProposalsList orchestrator | PROP-02, 03, 04, 05, 20 |
| 08-12 | delete-restore-actions | 6 | 08-10, 08-11 | POST .../delete + POST .../restore routes + real DeleteButtonClient/RestoreButtonClient + ?deleted_just=1 toast | PROP-22, DATA-07, 10 |
| 08-13 | duplicate-flow | 6 | 08-09, 08-10 | /proposals/new?duplicate=<id> server prefill + sonner.info + duplicatedFromId plumb | PROP-21 |
| 08-14 | purge-cli | 6 | 08-03 | scripts/purge-soft-deleted.ts + docs/operations/purge.md | DATA-10 (operator path) |

---

## Files-Modified Audit (within-wave overlap check)

For each wave, verify zero files appear in two plans (parallelism guard):

### Wave 1 (08-01, 08-02)
- 08-01 → src/db/schema.ts, drizzle/0002_phase8_persistence.sql, drizzle/meta/_journal.json, drizzle/meta/0002_snapshot.json
- 08-02 → src/lib/i18n/dictionaries.ts, src/lib/i18n/dictionaries.test.ts
- **Overlap: 0 files** ✅

### Wave 2 (08-03, 08-04)
- 08-03 → src/lib/db/queries/proposals.ts, .../global-params.ts, .../audit-log.ts, .../index.ts, .../proposals.test.ts, .../global-params.test.ts
- 08-04 → drizzle/0003_seed_global_params.sql, drizzle/meta/_journal.json, drizzle/meta/0003_snapshot.json, scripts/build-seed-sql.ts, package.json
- **Overlap: 0 files** ✅ (08-04 touches drizzle/meta/_journal.json which 08-01 already wrote into in Wave 1; 08-04 only APPENDS — safe.)

### Wave 3 (08-05 alone) — N/A

### Wave 4 (08-06, 08-07, 08-08)
- 08-06 → __pdf-fixtures__/* + scripts/update-pdf-fixture.ts + package.json
- 08-07 → app/api/proposals/route.ts (POST only), src/lib/api/proposals/{submit,errors,submit.test}.ts
- 08-08 → app/api/proposals/[id]/pdf/route.ts, src/lib/api/proposals/list.ts, app/api/proposals/route-list.test.ts, app/api/proposals/route.ts (ADDS GET)
- **Overlap: 1 file** ⚠️ — `app/api/proposals/route.ts` is touched by BOTH 08-07 and 08-08. **Resolution:** 08-07 writes the POST handler; 08-08 APPENDS the GET export. The Plan 08-08 task explicitly says "do NOT replace POST" and adds GET alongside. Sequential commits are fine (executor runs 08-07 → 08-08; or 08-08 reads 08-07's commit before adding GET). **Mark 08-08 as soft-depends on 08-07** for the route file specifically. The two plans are otherwise independent. Documented in 08-08 frontmatter `depends_on: ["08-03"]` — adding 08-07 to the dependency chain to be explicit. **ACTION REQUIRED:** orchestrator may want to update 08-08's depends_on to `["08-03", "08-07"]` if strict serialization is preferred.

### Wave 5 (08-09, 08-10, 08-11)
- 08-09 → src/components/proposal/ProposalForm.tsx, app/(authed)/proposals/new/page.tsx
- 08-10 → app/(authed)/proposals/[id]/page.tsx + 5 src/components/proposals/* + src/components/proposal/CopyRefButton.tsx + app/globals.css
- 08-11 → app/(authed)/page.tsx + 6 src/components/proposals/* + app/globals.css
- **Overlap: 1 file** ⚠️ — `app/globals.css` is touched by 08-10 (chip + pdf-embed-wrap classes) AND 08-11 (list-row + search-bar + toggle-pill classes). Both plans APPEND independent class blocks; merge conflict risk only if executor runs them in parallel. **Resolution:** 08-10's commit lands 5 classes; 08-11 lands 3 classes; sequential is trivial. Recommend orchestrator runs Wave 5 plans **sequentially** OR uses the manual-merge path on globals.css (each plan only adds a clearly-marked block at the end of the file). Documented in 08-11 — frontmatter dependency added to 08-10 if strict serialization preferred.

### Wave 6 (08-12, 08-13, 08-14)
- 08-12 → app/api/proposals/[id]/delete/route.ts, .../restore/route.ts, src/components/proposals/{DeleteButtonClient, RestoreButtonClient, DeleteJustToast}.tsx, app/(authed)/page.tsx
- 08-13 → app/(authed)/proposals/new/page.tsx, src/components/proposal/ProposalForm.tsx, src/components/proposals/DuplicatePrefillToast.tsx
- 08-14 → scripts/purge-soft-deleted.ts, package.json, docs/operations/purge.md
- **Overlap: 1 file** ⚠️ — 08-12 edits `app/(authed)/page.tsx` (mounts DeleteJustToast); 08-11 already shipped that page in Wave 5. 08-12 adds ONE line (the toast import + mount). NO overlap with 08-13 or 08-14. **Resolution:** Wave 6 inter-plan overlaps = 0. ✅
- **Wave 5 ↔ Wave 6 cross-wave overlap (08-11 page → 08-12 page):** acceptable because 08-12 is in a later wave (sequential by design).

**Net: 1 within-wave overlap (Wave 4 route.ts) + 1 within-wave overlap (Wave 5 globals.css). Both manageable via sequential execution OR manual-merge of clearly-bounded append blocks.**

---

## Requirements Coverage Audit (32 requirements expected)

### DATA (12 requirements)

| Req | Plan(s) grounding it | Status |
|-----|----------------------|--------|
| DATA-01 | 08-01 (schema column), 08-07 (write path) | ✅ |
| DATA-02 | 08-01 (schema), 08-07 (write) | ✅ |
| DATA-03 | 08-01 (schema), 08-07 (write) | ✅ |
| DATA-04 | 08-01 (schema + CHECK), 08-07 (writes '1.0.0') | ✅ |
| DATA-05 | 08-01 (global_params append-only schema) | ✅ |
| DATA-06 | 08-03 (getLatestGlobalParams), 08-07 (consumed at create time) | ✅ |
| DATA-07 | 08-01 (audit_log schema), 08-03 (writeAuditLog), 08-07/08-12/08-14 (writes) | ✅ |
| DATA-08 | 08-01 (composite index) | ✅ |
| DATA-09 | 08-01 (column), 08-05 (sha256 emit), 08-07 (stored at gen) | ✅ |
| DATA-10 | 08-01 (deleted_at column + partial index), 08-03 (helpers), 08-12 (UX), 08-14 (CLI purge path) | ✅ |
| DATA-11 | NOT in Phase 8 — explicitly Phase 10 (legal counsel sign-off pending). 10-year retention enforcement is out of scope per CONTEXT. ⚠️ FLAG: this requirement is marked Phase 8 in REQUIREMENTS.md but CONTEXT defers enforcement to Phase 10. Schema-grounded by 08-01 (PDF blob is preserved across partner soft-delete; never deleted on partner deactivation). Cron enforcement is Phase 10 CUT-08. **Recommend: mark as schema-grounded in Phase 8; full enforcement Phase 10.** | ⚠️ Partial (schema only) |
| DATA-12 | 08-04 (seed migration) | ✅ |

### PROP (20 requirements)

| Req | Plan(s) grounding it | Status |
|-----|----------------------|--------|
| PROP-02 | 08-02 (copy), 08-08 (list API), 08-11 (list UI) | ✅ |
| PROP-03 | 08-02 (copy), 08-11 (ProposalRow 5-column) | ✅ |
| PROP-04 | 08-02 (copy), 08-11 (preserved Phase 7 empty-state) | ✅ |
| PROP-05 | 08-03 (cursor query), 08-08 (cursor wire shape), 08-11 (Load More button) | ✅ |
| PROP-09 | 08-07 (full server flow), 08-09 (client wiring) | ✅ |
| PROP-10 | 08-07 (return shape), 08-09 (router.push) | ✅ |
| PROP-11 | 08-10 (detail page) | ✅ |
| PROP-12 | 08-10 (EmbeddedPdfPreview) | ✅ |
| PROP-13 | 08-08 (stream route) | ✅ |
| PROP-14 | 08-07 (blob key path), 08-08 (storage().get) | ✅ |
| PROP-15 | 08-05 (single A4 Page) | ✅ |
| PROP-16 | 08-05 (deterministic config + Font.register) | ✅ |
| PROP-17 | 08-06 (CI byte-determinism gate) | ✅ |
| PROP-18 | 08-05 (formatCurrency/Date with explicit locales) | ✅ |
| PROP-19 | 08-05 (Plus Jakarta Sans woff2 + Font.register) | ✅ |
| PROP-20 | 08-03 (searchProposals ILIKE), 08-08 (?q= API), 08-11 (SearchBar) | ✅ |
| PROP-21 | 08-13 (duplicate flow + duplicatedFromId) | ✅ |
| PROP-22 | 08-12 (soft-delete actions + UX) | ✅ |
| PROP-23 | 08-07 (immutable write semantics — params_snapshot + inputs + computed locked at INSERT) | ✅ |
| PROP-26 | 08-02 (copy), 08-10 (ValidityChip + caption) | ✅ |

**Total: 31/32 fully grounded; DATA-11 schema-grounded only (10-year cron is Phase 10).**

⚠️ **DATA-11 flag:** REQUIREMENTS.md lists DATA-11 as Phase 8. CONTEXT.md `<deferred>` section explicitly defers the 10-year retention cron to Phase 10 pending legal counsel sign-off (Open Q3). **Recommendation:** the planner judges DATA-11 as out-of-Phase-8 scope per CONTEXT — the schema invariant is preserved (PDFs are never deleted by partner deactivation; the 30-day soft-delete cron is Phase 10), but the active 10-year-retention enforcement is Phase 10. The user/orchestrator should:
- Either accept Phase 8 grounds DATA-11 schema-only and Phase 10 enforces.
- Or split a Phase 8.5 to ship the legal-counsel-blocked work later. NOT recommended (legal blocks the work, not Phase 8).

---

## Open Issues / Notes for the Orchestrator

1. **DATA-11 partial:** see flag above; recommended treatment is "schema-grounded in Phase 8, full enforcement Phase 10."

2. **Wave 4 within-wave file overlap (`app/api/proposals/route.ts`):** 08-08's frontmatter currently lists `depends_on: ["08-03"]`. Recommend updating to `depends_on: ["08-03", "08-07"]` to make the route.ts edit ordering explicit. Or run 08-07 → 08-08 sequentially within Wave 4. The other Wave 4 plan (08-06) is fully disjoint and can run in true parallel with the others.

3. **Wave 5 within-wave file overlap (`app/globals.css`):** 08-10 and 08-11 both append disjoint class blocks at end-of-file. Recommend running them sequentially (orchestrator-level), OR noting the manual-merge requirement in the run protocol. Same rationale: each plan's diff is a clearly-bounded append block.

4. **Phase 5 follow-up #1 (Neon branch split) not in scope per CONTEXT D-D2** — operator-track work. Phase 8 plans use the same single Neon `main` branch in all 3 Vercel scopes. Antoine should split BEFORE first real partner is onboarded.

5. **Phase 9 ADMIN-09 commission-invisibility cross-cutting constraint:** Plan 08-08's DTO excludes paramsSnapshot from the wire shape. Plan 08-10's detail page does NOT render commission_pct. PR review for any future Phase 8/9 admin viewer must keep the seam clean. Not a blocker.

6. **Plan 08-14 CLI is NOT a route handler** — it requires direct DB credentials (DATABASE_URL + STORAGE credentials) on the operator's workstation. Phase 10 wires this into a scheduled GH Actions job per `docs/operations/purge.md`.

7. **`@react-pdf/renderer` exact-pin TBD:** Plan 08-05 instructs the executor to fetch the latest stable version via Context7 / `npm view` and pin without caret. Document the chosen version in 08-05's SUMMARY for downstream traceability.

8. **Idempotency key behavior on D-B1 fail-loud retry (T-08-07-06):** when render/upload fails after row INSERT, the row is tombstoned via `deleted_at`. The unique constraint on `(user_id, idempotency_key)` includes the tombstoned row, so a retry with the SAME key would collide. The form's `useState(() => crypto.randomUUID())` regenerates ONLY on remount; users hitting Generate-fail-Generate within a single form session will hit the duplicate-key collision. Recommended UX: the sonner.error toast prompts "veuillez réessayer" + the partner refreshes the page (form remounts → fresh key). Phase 9 may want a friendlier UX (e.g., explicit "retry" button that regenerates the key); accept as Phase 8 trade-off.

---

## Total Plan Count: 14

- Wave 1: 2 plans
- Wave 2: 2 plans
- Wave 3: 1 plan
- Wave 4: 3 plans
- Wave 5: 3 plans
- Wave 6: 3 plans

**Estimated executor time per wave (optimistic, parallel):**
- Wave 1: ~30-45 min (schema + i18n)
- Wave 2: ~45-60 min (queries + seed)
- Wave 3: ~60-90 min (PDF lib install + render component)
- Wave 4: ~60-90 min (CI gate + 2 routes)
- Wave 5: ~90-120 min (3 UI surfaces)
- Wave 6: ~45-60 min (delete/restore + duplicate + CLI)

**Sequential total: ~5.5-8 hours of executor time.**

---

## Next Steps for Orchestrator

1. Optionally update 08-08 + 08-11 frontmatter `depends_on` to make Wave 4 + Wave 5 sequential dependencies explicit (per Notes #2-3).
2. Commit all 14 plans + this index in one batch (commit_docs: true).
3. Hand off to gsd-executor for Wave 1 (08-01 + 08-02 in parallel).
