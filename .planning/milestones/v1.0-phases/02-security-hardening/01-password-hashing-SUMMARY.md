---
phase: 02-security-hardening
plan: 01
subsystem: security
tags: [security, password, hashing, migration, async, sha256, web-crypto]
one-liner: "SHA-256 hex password hashing via Web Crypto API with transparent idempotent plaintext→hash migration at DOMContentLoaded, async admin login + save, and current-password confirmation on change."
requires:
  - "Matrice_2026_THE_Leasetic-v10.html (post Phase 1 plan 02 — UTILS, MIGRATION, INIT sections populated)"
  - "Phase 1 plan 02 readV9LocalStorage() and assertCalc() must remain untouched"
provides:
  - "hashPassword(plaintext) → Promise<hex64> on window (SHA-256 via crypto.subtle.digest)"
  - "migratePasswordIfNeeded() → Promise<void> on window (idempotent plaintext upgrade)"
  - "async admin login (btn-pw onclick) — hash compare, no plaintext path"
  - "async saveCoeffs() — requires current-pw hash match before writing new-pw hash"
  - "#current-pw input field (first in admin password-change block)"
affects:
  - "DOMContentLoaded handler — now async, awaits migration BEFORE checkExp/loadCoeffs/bindAll/assertCalc"
  - "saveCoeffs signature: function → async function (callers unaffected — onclick handlers tolerate Promise returns)"
  - "btn-pw onclick signature: sync arrow → async arrow (Enter-key delegate unchanged, .click() still fires)"
tech-stack:
  added:
    - "Web Crypto API (crypto.subtle.digest, TextEncoder) — browser built-in, zero deps"
  patterns:
    - "Async hash-compare (no timing-safe compare — overkill for client-side single-user tool)"
    - "Idempotent write-in-place migration keyed by /^[a-f0-9]{64}$/ regex"
    - "Generic error message on auth mismatch (no field-discrimination)"
    - "Migration runs once on every load via DOMContentLoaded, no manual trigger"
key-files:
  created: []
  modified:
    - path: Matrice_2026_THE_Leasetic-v10.html
      purpose: "Added hashPassword() in UTILS, migratePasswordIfNeeded() in MIGRATION, #current-pw field in admin HTML, async wiring in saveCoeffs/btn-pw/DOMContentLoaded"
decisions:
  - "SHA-256 hex (not base64, not salted, not PBKDF2) — per Phase 2 CONTEXT.md threat model. Defends against casual localStorage inspection and file-leak of plaintext; does NOT claim defense against a DevTools-equipped attacker. Salt/KDF add zero value in a single-user shared-password client-side tool."
  - "Migration is lazy-on-DOMContentLoaded, not lazy-on-unlock. Deterministic: by the time any admin binding runs, storage is authoritative hashed. Trade-off: every page load pays one crypto.subtle.digest cost. Acceptable — sub-millisecond."
  - "Migration writes in place (no removeItem). A cleared lt_pw would force admin re-setup; that would break MIGRATE-02's no-reconfiguration promise."
  - "Fresh-install default: hash of 'leasetic2025' stored immediately (not lazy). Ensures grep of lt_pw post-load NEVER returns a plaintext value, even on a never-configured install."
  - "Idempotence detection via regex /^[a-f0-9]{64}$/ — not a counter, not a metadata sidecar. Self-describing, robust to multiple reloads, survives partial wipes."
  - "alert() retained on current-pw mismatch. Toast replacement is Phase 3 UX-08 — touching it here would violate Phase 2 scope and create merge noise with Phase 3."
  - "Generic error message 'Mot de passe actuel incorrect' covers BOTH empty and wrong current-pw. Never reveals which field is missing — per CONTEXT.md SEC-05 UX section."
  - "btn-pw Enter-key delegate ($('adm-pw').onkeydown) NOT converted to async. Calling .click() on the button invokes its async onclick, and no caller of the Enter handler needs to await. Converting it adds complexity without benefit."
  - "saveCoeffs callers ($('btn-save').onclick = saveCoeffs) NOT updated. DOM onclick handlers tolerate Promise returns (ignored). Direct callers: zero."
  - "Defensive fallback in btn-pw: stored || await hashPassword(DEF_PW). Only fires if localStorage was wiped mid-session (migration ran, then storage cleared externally). Cheap insurance, zero branch in the normal path."
  - "hashPassword('') is NOT special-cased — returns the SHA-256 of empty string (e3b0c44...). Callers MUST guard. In practice, only saveCoeffs reads current-pw, and an empty current-pw hashes to e3b0c44... which will never match a stored hash of any real password → correctly rejects with the generic error."
metrics:
  duration: "~0.4h"
  tasks_completed: 2
  files_created: 0
  files_modified: 1
  completed_date: 2026-04-15
---

# Phase 2 Plan 01: Password Hashing Summary

## What Was Built

Replaced v10's plaintext `lt_pw` storage with SHA-256 hex hashing via Web Crypto, behind a transparent idempotent migration that runs on every page load. Three user-visible behaviors:

1. **Login:** unchanged — partner types `leasetic2025` (or their chosen password), panel opens. Under the hood: hash-compare instead of string-compare.
2. **Fresh install:** no configuration required — first load writes `hash('leasetic2025')` so default login works.
3. **Password change:** now requires a `#current-pw` field above `new-pw`. Wrong/empty current-pw → alert + abort. Correct → stored hash replaced with `hash(new-pw)`.

For partners upgrading from v9 with a pre-existing plaintext `lt_pw` (any value — `leasetic2025` or a custom one): on first v10 open the plaintext is silently hashed in place and a `[v10 migration] upgraded plaintext lt_pw to SHA-256` info line is logged. No re-setup required.

## SHA-256 Reference Hash

For future audits and DevTools inspection:

```
SHA256('leasetic2025') = d0adb0ba9321d623efc9d70cca9f7d70003f420e5c3b3c859f4e59a479f630a1
```

Verified via `node -e "crypto.subtle.digest('SHA-256', new TextEncoder().encode('leasetic2025')).then(b=>...)"` before commit. This is the exact value that `lt_pw` will hold on a fresh v10 install or after migrating from a plaintext `leasetic2025`.

## Files Modified

| File | Lines before | Lines after | Delta | Sections touched |
|------|-------------:|------------:|------:|------------------|
| `Matrice_2026_THE_Leasetic-v10.html` | 1156 | 1215 | +59 | HTML admin block, UTILS, MIGRATION, ADMIN (saveCoeffs), INIT (btn-pw onclick, DOMContentLoaded) |

Six surgical edits, zero unrelated rewrites. No CSS touched. No calculation touched. No proposal rendering touched.

## Async Conversion Sites Verified

Post-edit grep of `hashPassword|migratePasswordIfNeeded` inside `Matrice_2026_THE_Leasetic-v10.html`:

| Line | Context | Type | Async? | Awaited? |
|-----:|---------|------|:------:|:--------:|
| 595  | `async function hashPassword(plaintext){` | definition | yes | n/a |
| 725  | `async function saveCoeffs(){` | definition | yes | n/a |
| 750  | `const cpHash = await hashPassword(cp);` | call (inside async saveCoeffs) | yes | yes |
| 755  | `const newHash = await hashPassword(np);` | call (inside async saveCoeffs) | yes | yes |
| 1019 | `async function migratePasswordIfNeeded(){` | definition | yes | n/a |
| 1038 | `const h = await hashPassword(DEF_PW);` | call (inside async migrate) | yes | yes |
| 1044 | `const h = await hashPassword(stored);` | call (inside async migrate) | yes | yes |
| 1052 | `window.hashPassword = hashPassword;` | exposure | n/a | n/a |
| 1053 | `window.migratePasswordIfNeeded = migratePasswordIfNeeded;` | exposure | n/a | n/a |
| 1174 | `$('btn-pw').onclick = async () => {` | async handler declaration | yes | n/a |
| 1180 | `const expected = stored \|\| await hashPassword(DEF_PW);` | call (inside async btn-pw) | yes | yes |
| 1181 | `const attempt = await hashPassword(pw);` | call (inside async btn-pw) | yes | yes |
| 1206 | `document.addEventListener('DOMContentLoaded', async () => {` | async handler declaration | yes | n/a |
| 1207 | `await migratePasswordIfNeeded();` | call (inside async DOMContentLoaded) | yes | yes |

**Audit result:** every `hashPassword()` / `migratePasswordIfNeeded()` invocation (not definition, not window-exposure) is inside an async function AND preceded by `await`. Zero unawaited promises in the password path.

### Intentionally NOT converted

- **`$('adm-pw').onkeydown` (Enter-key delegate)** — sync arrow. Calls `$('btn-pw').click()` which fires the async onclick; the delegate doesn't need to await the chain because all UI side-effects happen inside the onclick itself.
- **`$('btn-save').onclick = saveCoeffs`** — DOM onclick handler assignment. Browsers accept a Promise-returning handler and ignore the return value. No caller awaits saveCoeffs.
- **`checkExp()`, `loadCoeffs()`, `bindAll()`, `assertCalc()`** — synchronous, no password path.

## setItem(PW_KEY) Audit

Every write to `lt_pw` in the post-edit file:

| Line | Function | Value variable | Source |
|-----:|----------|----------------|--------|
| 756  | `saveCoeffs` | `newHash` | `await hashPassword(np)` |
| 1039 | `migratePasswordIfNeeded` | `h` | `await hashPassword(DEF_PW)` (fresh install) |
| 1045 | `migratePasswordIfNeeded` | `h` | `await hashPassword(stored)` (plaintext upgrade) |

**Zero plaintext writes to `lt_pw` remain.** The old `localStorage.setItem(PW_KEY, np)` at former line 735 is gone.

## Migration Idempotence

`migratePasswordIfNeeded()` short-circuits on `stored && /^[a-f0-9]{64}$/.test(stored)`. A second invocation on the same browser session matches the regex (written by the first invocation) and returns without mutation or log. Verified by code inspection: the only branches that call `setItem` are the null branch and the non-hex branch — both eliminate themselves after one execution.

## Verification Results

### Automated (ran before commit)

```
grep -c "crypto.subtle.digest" Matrice_2026_THE_Leasetic-v10.html
# → 1 (inside hashPassword definition, as required)

grep -n "setItem(PW_KEY" Matrice_2026_THE_Leasetic-v10.html
# → 756, 1039, 1045 — all three write hash variables, zero plaintext

grep -n "assertCalc();" Matrice_2026_THE_Leasetic-v10.html
# → 1211 — Phase 1 self-check still wired

node --check <(awk '/<script>/{flag=1;next}/<\/script>/{flag=0}flag' Matrice_2026_THE_Leasetic-v10.html)
# → parse OK (no syntax errors)
```

### Browser smoke tests (for Antoine — ~5 min in Chrome)

All three scenarios below are deterministic and must be run manually — Phase 2 has no automated browser harness (out of scope per STATE.md decisions).

**Scenario A — Fresh install**
1. DevTools → Application → Local Storage → delete `lt_pw` (and any other `lt_*` keys for a true fresh state)
2. Reload `Matrice_2026_THE_Leasetic-v10.html`
3. Console: expect `[v10 migration] default password hashed` and `[v10 self-check] calcRent formula: 6/6 fixtures pass ✓`
4. `localStorage.getItem('lt_pw')` → expect `d0adb0ba9321d623efc9d70cca9f7d70003f420e5c3b3c859f4e59a479f630a1`
5. Admin tab → enter `leasetic2025` → click Accéder → panel opens ✓

**Scenario B — Plaintext upgrade (v9 partner simulation)**
1. In DevTools console: `localStorage.setItem('lt_pw', 'mylegacypwd')`
2. Reload v10
3. Console: expect `[v10 migration] upgraded plaintext lt_pw to SHA-256`
4. `localStorage.getItem('lt_pw')` → expect a 64-char lowercase hex string (not `mylegacypwd`)
5. Admin login with `mylegacypwd` → panel opens ✓
6. Reload a second time → expect NO new migration log line (idempotence) and `lt_pw` unchanged

**Scenario C — Password change flow**
1. Start from Scenario A's fresh install (panel is open with `leasetic2025`)
2. Leave `current-pw` empty, fill `new-pw` = `test42`, `new-pw2` = `test42`, click Enregistrer
3. Expect alert `Mot de passe actuel incorrect.` — `lt_pw` unchanged
4. Fill `current-pw` = `wrongpw`, retry → same alert, `lt_pw` unchanged
5. Fill `current-pw` = `leasetic2025`, `new-pw` = `test42`, `new-pw2` = `test42`, click Enregistrer
6. Expect success toast-equivalent (al-save green), all three pw fields cleared
7. `localStorage.getItem('lt_pw')` → expect SHA-256 of `test42` (not `d0adb0ba...`)
8. Click Verrouiller → login with `leasetic2025` → expect "Mot de passe incorrect." error
9. Login with `test42` → panel opens ✓

## Requirements Shipped

| ID | Title | How satisfied |
|----|-------|---------------|
| **SEC-01** | Password stored as SHA-256 hash via Web Crypto API | `hashPassword()` wraps `crypto.subtle.digest('SHA-256', ...)` and is the only path that writes `lt_pw` |
| **SEC-02** | Legacy plaintext passwords migrated on first open (one-way) | `migratePasswordIfNeeded()` detects non-hex `lt_pw`, hashes it in place, writes back |
| **SEC-05** | Password change requires current password confirmation | `saveCoeffs` hash-compares `$('current-pw').value` to stored hash before writing new hash; generic error on mismatch |
| **MIGRATE-02** | On first v10 open, detect plaintext `lt_pw` → hash → store hashed → clear plaintext | Covered by SEC-02 implementation. Note deviation: plaintext is hashed **in place** (overwritten) rather than cleared, per Phase 2 CONTEXT.md decision — clearing would force admin re-setup and violate MIGRATE-03's no-reconfiguration promise. The "clear plaintext" wording in REQUIREMENTS.md is interpreted as "no plaintext remains in storage," which is true. |

## Deviations from Plan

None material. Two minor notes:

1. **`current-pw` placement:** plan specified "before `new-pw`". The admin password-change block is a vertical stack of `.fld` divs in a single `.card`, so `current-pw` was inserted as the first of three stacked fields (current → new → confirm). This matches the plan's intent and the v9 visual convention.

2. **MIGRATE-02 wording:** as noted above, plaintext is overwritten, not cleared. Consistent with CONTEXT.md locked decision ("overwrite in place — a cleared key would force admin re-setup"). Not a deviation from the plan, just a reconciliation with the original REQUIREMENTS.md phrasing.

## Out of Scope (honored)

- No toast replacement — `alert()` kept for Phase 2 (UX-01/UX-08 are Phase 3)
- No XSS sanitization — Phase 2 plan 02 (`02-xss-sanitization-PLAN.md`)
- No i18n — Phase 3
- Zero new `var` declarations
- Zero new user-sourced `innerHTML` interpolations (stays Phase 2 compliant for the upcoming XSS sweep)
- Calculation formula untouched
- Commission invisibility untouched
- `readV9LocalStorage()` and `assertCalc()` from Phase 1 plan 02 untouched — `migratePasswordIfNeeded()` was inserted between them and the `window.readV9LocalStorage` exposure line

## Handoff to Plan 02 (XSS Sanitization)

- Password path is now hashed + async and no longer a concern for plan 02. Plan 02 can assume `lt_pw` is always a 64-char hex hash in steady state.
- `hashPassword` and `migratePasswordIfNeeded` are both already exposed on `window` alongside `readV9LocalStorage` and `assertCalc` — plan 02 should follow the same exposure pattern for `escapeHtml()`.
- `DOMContentLoaded` is now async. If plan 02 needs to add any one-time init call (e.g. an audit assertion for unescaped HTML sites), add it after `assertCalc()` in the same async handler — or inside `assertCalc()` itself if the semantics are "self-check on every load."
- Every `innerHTML = ...` and ```innerHTML = `...${userVar}...` ``` site in `generate()` / `p1p2()` / `p3()` / `renderResult()` / `updateHdrTitle()` remains untouched by this plan and is fair game for plan 02's escape sweep.
- **Async boundary reminder:** `await hashPassword()` inside DOMContentLoaded means total init cost now includes one SHA-256 digest on every load. Benchmarks (informal): sub-1ms on modern hardware. If plan 02 adds more async work at init, consider whether the cumulative cost affects the feel of the initial render.

## Commits

| Hash | Scope | Message |
|------|-------|---------|
| `b1b3b7d` | Task 1 | `feat(02-01): add hashPassword() helper and migratePasswordIfNeeded()` |
| `8c1b756` | Task 2 | `feat(02-01): wire password hashing into admin login, save, and DOMContentLoaded` |

---

## Self-Check: PASSED

- [x] `Matrice_2026_THE_Leasetic-v10.html` exists and was modified
- [x] Commit `b1b3b7d` exists in git log
- [x] Commit `8c1b756` exists in git log
- [x] `async function hashPassword` found at line 595
- [x] `async function migratePasswordIfNeeded` found at line 1019
- [x] `async function saveCoeffs` found at line 725
- [x] `id="current-pw"` found at line 480
- [x] `'btn-pw').onclick = async` found at line 1174
- [x] `DOMContentLoaded', async` found at line 1206
- [x] `await migratePasswordIfNeeded` found at line 1207
- [x] `assertCalc();` still wired at line 1211 (no Phase 1 regression)
- [x] `crypto.subtle.digest` count = 1 (only inside hashPassword)
- [x] All 3 `setItem(PW_KEY, ...)` writes use hash variables (756 newHash, 1039 h, 1045 h)
- [x] `node --check` on extracted script: parse OK
- [x] SHA256('leasetic2025') matches `d0adb0ba9321d623efc9d70cca9f7d70003f420e5c3b3c859f4e59a479f630a1` (verified via node)
