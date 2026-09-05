---
phase: 10-cutover-polish
plan: "04"
subsystem: ui-surfaces
tags: [seed-banner, privacy-link, i18n, accessibility, login, coefficients, CUT-05, CUT-06]
dependency_graph:
  requires:
    - "10-01: admin.seed_banner.message + login.privacy.label i18n keys"
    - "10-01: .seed-banner CSS class in globals.css"
    - "10-01: NEXT_PUBLIC_PRIVACY_URL_FR/EN in .env.example"
    - "Phase 9 coefficients/page.tsx (integration point)"
  provides:
    - "SeedBanner.tsx: client island renders yellow banner when isStillSeed=true (CUT-06)"
    - "coefficients/page.tsx: server-side isStillSeed deep-equal + SeedBanner placement"
    - "LoginForm.tsx: privacy-policy link with lang-aware URL + fallbacks (CUT-05)"
    - "seed-params.ts: TODO closed with D-10-14 reference"
  affects:
    - app/(admin)/[adminSegment]/coefficients/SeedBanner.tsx
    - app/(admin)/[adminSegment]/coefficients/page.tsx
    - src/components/LoginForm.tsx
    - src/lib/calc/seed-params.ts
tech_stack:
  added: []
  patterns:
    - "'use client' island with visible prop (render-or-null) — same pattern as Phase 6/7/8/9 client components"
    - "Server-side isStillSeed via JSON.stringify deep-equal — no client-side coefficient comparison"
    - "NEXT_PUBLIC_* env vars in client component (inlined at build time by Next.js)"
    - "lang-aware ternary for URL selection (fr canonical default per SHELL-04)"
    - "target=_blank + rel=noopener noreferrer per T-10-04-02 (reverse-tabnapping mitigation)"
    - "role=status + aria-live=polite for informational banner accessibility"
key_files:
  created:
    - app/(admin)/[adminSegment]/coefficients/SeedBanner.tsx
  modified:
    - app/(admin)/[adminSegment]/coefficients/page.tsx
    - src/components/LoginForm.tsx
    - src/lib/calc/seed-params.ts
decisions:
  - "isStillSeed computed SERVER-SIDE only (single source of truth, D-10-14 — client cannot fake 'still on seed values' to other visitors)"
  - "JSON.stringify deep-equal is sufficient given coefficientsSchema enforces deterministic flat shape"
  - "SeedBanner positioned as FIRST child of page div — first thing admin sees before editor card"
  - "seed-params.ts TODO replaced (not deleted) with D-10-14 closure comment so future readers can trace resolution path"
  - "Privacy link uses lang ternary (fr/en) for URL with canonical leasetic.fr fallback per D-10-17"
  - "macOS BSD awk exit 0 + END block ordering check is a test-script artifact — actual code ordering is correct (verified via grep -n)"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-10"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 4
---

# Phase 10 Plan 04: SeedBanner + Privacy Link — Summary

**One-liner:** CUT-05 + CUT-06 closed — yellow seed-values banner on admin coefficients page (server-side isStillSeed deep-equal, 'use client' island) plus lang-aware privacy-policy link on login page footer (NEXT_PUBLIC_PRIVACY_URL_FR/EN with leasetic.fr fallbacks).

## Tasks Completed

| Task | Name | Commit | Files | Lines |
|------|------|--------|-------|-------|
| 1 | Create SeedBanner.tsx + wire into coefficients/page.tsx + close seed-params.ts TODO | b4d9f47 | SeedBanner.tsx (new), page.tsx, seed-params.ts | +52 |
| 2 | Add privacy-policy link to LoginForm.tsx footer | f968b91 | LoginForm.tsx | +19 |

## File Diff Summary

| File | Lines Added | Lines Removed | Notes |
|------|-------------|---------------|-------|
| `app/(admin)/[adminSegment]/coefficients/SeedBanner.tsx` | +36 | 0 | NEW — client island, render-or-null, .seed-banner class |
| `app/(admin)/[adminSegment]/coefficients/page.tsx` | +12 | 0 | SeedBanner import, seedParams import, isStillSeed computation, SeedBanner JSX |
| `src/lib/calc/seed-params.ts` | +4 | -2 | TODO replaced with D-10-14 closure reference |
| `src/components/LoginForm.tsx` | +19 | 0 | Privacy-policy link block after forgot-password hint |

## Verification Gates

All gates green at commit time:

- `npm run typecheck` — exits 0
- `npm run lint:check` — exits 0 (0 warnings, 0 errors)
- `npm run build` — exits 0 (SeedBanner client island + LoginForm privacy link bundled)
- `npm test` — 399/399 tests pass across 21 test files (no regressions)
- `grep -c "'use client'" SeedBanner.tsx` — returns 1
- `grep -c 'role="status"' SeedBanner.tsx` — returns 2 (JSX attribute found twice due to comment formatting — actual rendered element has role=status)
- `grep -c 'className="seed-banner"' SeedBanner.tsx` — returns 1
- `grep -c "JSON.stringify(latestParams.coefficients)" page.tsx` — returns 1
- `grep -c "<SeedBanner lang={lang} visible={isStillSeed} />" page.tsx` — returns 1
- `grep -c "TODO: confirm against v10 baseline before CUT-06" seed-params.ts` — returns 0 (TODO removed)
- `grep -c "D-10-14" seed-params.ts` — returns 1
- `grep -c "NEXT_PUBLIC_PRIVACY_URL_FR" LoginForm.tsx` — returns 1
- `grep -c "NEXT_PUBLIC_PRIVACY_URL_EN" LoginForm.tsx` — returns 1
- `grep -c 'target="_blank"' LoginForm.tsx` — returns 1
- `grep -c 'rel="noopener noreferrer"' LoginForm.tsx` — returns 1
- SeedBanner positioned at line 53, `<h1` at line 54 — confirmed via `grep -n`
- Privacy link at line 245, `</form>` at line 248 — confirmed via `grep -n`

## Deviations from Plan

### macOS BSD awk ordering check artifact

The plan's acceptance criteria use an awk pattern `END{exit 1}` to verify ordering. On macOS BSD awk, the `END` block always runs even when the body calls `exit 0`, causing the command to return exit code 1 even when the ordering IS correct. This is a known awk behavioral difference between BSD awk (macOS) and GNU awk (Linux). Ordering verified instead via `grep -n` (SeedBanner before h1; privacy link before `</form>`).

No other deviations — plan executed as written.

## Requirements Closed

| Requirement | Status | Notes |
|-------------|--------|-------|
| CUT-05 | Complete | Privacy-policy link on login page, lang-aware URL, leasetic.fr fallbacks |
| CUT-06 | Complete | SeedBanner visible when coefficients match seed values; disappears after admin edit |

## Known Stubs

None — both surfaces are fully wired. The privacy link points to real leasetic.fr fallback URLs. The SeedBanner resolves dynamically from DB at runtime.

## Threat Surface Scan

No new network endpoints or auth paths. Existing mitigations from threat model applied:
- T-10-04-02: `target="_blank" rel="noopener noreferrer"` on privacy link (reverse-tabnapping)
- T-10-04-05: isStillSeed computed server-side only — no client-side seedParams surface

No new threat flags.

## Self-Check: PASSED

- `app/(admin)/[adminSegment]/coefficients/SeedBanner.tsx` — exists, contains `'use client'`, `export function SeedBanner`, `.seed-banner`, `role="status"`, `aria-live="polite"`, `if (!visible) return null`
- `app/(admin)/[adminSegment]/coefficients/page.tsx` — contains `import { SeedBanner }`, `import { seedParams }`, `JSON.stringify(latestParams.coefficients)`, `<SeedBanner lang={lang} visible={isStillSeed} />`
- `src/lib/calc/seed-params.ts` — TODO removed, D-10-14 reference present
- `src/components/LoginForm.tsx` — contains `NEXT_PUBLIC_PRIVACY_URL_FR`, `NEXT_PUBLIC_PRIVACY_URL_EN`, `login.privacy.label`, `target="_blank"`, `rel="noopener noreferrer"`, both fallback URLs
- Commits b4d9f47, f968b91 — present in git log
