#!/usr/bin/env bash
# Defense-in-depth grep for the CUT-03 no-v10-localstorage rule (D-10-16).
# Fails CI if any v10 localStorage key is found in app/ or src/.
#
# Scope — INCLUDED: src/, app/ (where regression risk lives)
# Scope — EXCLUDED: .planning/, drizzle/, node_modules/, .next/, dist/, docs/
#   Exclusion rationale: docs/ and .planning/ legitimately cite v10 key names
#   (context, summaries, runbooks) — false positives by construction.
#   drizzle/ is generated SQL; node_modules/ is vendor code; .next/ is build output.
#
# The 5 v10 localStorage keys (per D-10-16; confirmed in v10 HTML at lines 733-737):
#   lt_pw          — v10 password storage
#   lt_coeffs      — v10 coefficient cache
#   lt_commission  — v10 commission rate
#   lt_max         — v10 max threshold
#   lt_partner     — v10 partner-id storage
#
# Phase 6's clean-slate partner onboarding already satisfies CUT-03 (no v10 read
# paths exist in v1.1 code). This script is a regression preventer — wire into CI
# to catch accidental future introductions.
#
# Exit 0 if clean, exit 1 if any key is found.
set -euo pipefail

cd "$(dirname "$0")/.."

PATTERNS=(
  "lt_pw"
  "lt_coeffs"
  "lt_commission"
  "lt_max"
  "lt_partner"
)

# ---------------------------------------------------------------------------
# Scope: GIT-TRACKED FILES ONLY, under src/ and app/ — where production code lives.
#
# Consistent with scripts/check-no-drizzle-push.sh — see the long rationale there.
# In short: a filesystem walk can be tripped by any untracked local file (agent
# scratch, local experiments) that merely mentions a forbidden string, failing
# locally while CI passes. Scoping to `git ls-files` means only committed-or-staged
# content can fail the guard, and the .planning//docs//drizzle//node_modules//.next//
# dist/ exclusions come for free (either gitignored, or outside the src|app pathspec).
# ---------------------------------------------------------------------------
readarray -t FILES < <(
  git ls-files -- \
    'src/*.ts' 'src/*.tsx' 'src/*.js' 'src/*.mjs' 'src/*.cjs' \
    'app/*.ts' 'app/*.tsx' 'app/*.js' 'app/*.mjs' 'app/*.cjs' \
    2>/dev/null || true
)

if [ "${#FILES[@]}" -eq 0 ]; then
  # Fail loudly rather than pass vacuously.
  echo "ERROR: guard could not enumerate git-tracked files under src/ and app/."
  echo "This guard requires a git work tree (it scopes to 'git ls-files' by design)."
  exit 1
fi

fail=0

for p in "${PATTERNS[@]}"; do
  # -F (fixed strings): all five v10 key patterns are literals, not regexes.
  # -E (extended regex) was previously combined here but is mutually exclusive
  # with -F and caused platform-dependent behavior (GNU grep vs BSD grep).
  matches=$(grep -Fn "$p" -- "${FILES[@]}" 2>/dev/null || true)
  if [ -n "$matches" ]; then
    echo "ERROR: v10 localStorage key '$p' found in app/ or src/:"
    echo "$matches"
    echo
    fail=1
  fi
done

if [ $fail -ne 0 ]; then
  echo "FAILED: CUT-03 no-v10-localstorage rule violated."
  echo "v10 localStorage keys (lt_pw, lt_coeffs, lt_commission, lt_max, lt_partner) must not"
  echo "appear in src/ or app/. v1.1 uses clean-slate Postgres-backed state (Phase 6 decision)."
  echo "If a test fixture needs to reference these keys, add --exclude-dir=<test-dir> above."
  exit 1
fi

echo "OK: no v10 localStorage keys found in src/ or app/."
exit 0
