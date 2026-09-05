#!/usr/bin/env bash
# Defense-in-depth grep for the BOOT-06 no-Vercel-only-imports rule.
# ESLint catches static imports; this script catches dynamic imports, JSDoc references,
# and any other text-level occurrence of the forbidden package names.
#
# Forbidden imports outside src/lib/storage/ and src/lib/db/:
#   @vercel/blob, @vercel/postgres, @vercel/kv, @vercel/edge-config
#   @neondatabase/serverless, postgres (npm package)
#   @aws-sdk/client-s3, @aws-sdk/s3-request-presigner
#
# Exit 0 if clean, exit 1 if any forbidden import is found.
set -euo pipefail

cd "$(dirname "$0")/.."

# Each pattern is the exact import-source string we're forbidding.
# Use grep -F (fixed strings) to avoid regex confusion.
PATTERNS=(
  "@vercel/blob"
  "@vercel/postgres"
  "@vercel/kv"
  "@vercel/edge-config"
  "@neondatabase/serverless"
  "@aws-sdk/client-s3"
  "@aws-sdk/s3-request-presigner"
)

# The "postgres" bare package name is tricky (collides with words like "postgresql").
# We match it ONLY in import-context: from 'postgres' or require('postgres').
# Handled separately below.

# ---------------------------------------------------------------------------
# Scope: GIT-TRACKED FILES ONLY, under src/ and app/.
#
# Consistent with scripts/check-no-drizzle-push.sh — see the long rationale there.
# In short: a filesystem walk can be tripped by any untracked local file (agent
# scratch, local experiments) that merely mentions a forbidden string, which makes
# the guard fail locally while CI passes. Scoping to `git ls-files` means only
# committed-or-staged content can fail the guard, and no exclusion list has to be
# maintained as tooling changes. Exposure here was narrower than the drizzle-push
# guard's (this one already scanned only src/ and app/, not the repo root), but a
# stray untracked src/scratch.ts would still have tripped it.
#
# The storage/db adapter directories are excluded via pathspec rather than the
# previous post-grep on path prefixes — same effect, expressed once.
#
# `*.integration.test.ts` is excluded for the reason layer 1 already records in
# eslint.config.mjs: an integration test opens a RAW client to seed fixtures and
# to verify results independently of the code under test, because checking a row
# with the same abstraction that wrote it proves nothing. BOOT-06 protects the
# portability of SHIPPED code, and a test file never ships. Deliberately narrow:
# `*.integration.test.ts` only, never `*.test.ts`.
#
# This mirrors an exclusion layer 1 has had all along. Without it the two halves
# of one rule disagreed, and the guard failed on `src/lib/crm/`'s integration
# test while ESLint passed it — the five integration tests under
# `src/lib/db/queries/` escaped only because the adapter exclusion above happened
# to cover them. Note the pathspecs use git's default (non-glob) magic, matching
# the `src/*.ts` patterns above, so `*` spans `/` and the exclusion reaches any
# depth.
# ---------------------------------------------------------------------------
readarray -t FILES < <(
  git ls-files -- \
    'src/*.ts' 'src/*.tsx' 'src/*.js' 'src/*.mjs' 'src/*.cjs' \
    'app/*.ts' 'app/*.tsx' 'app/*.js' 'app/*.mjs' 'app/*.cjs' \
    ':(exclude)src/lib/storage/**' \
    ':(exclude)src/lib/db/**' \
    ':(exclude)src/*.integration.test.ts' \
    ':(exclude)app/*.integration.test.ts' \
    2>/dev/null || true
)

if [ "${#FILES[@]}" -eq 0 ]; then
  # Fail loudly rather than pass vacuously — a guard that inspects zero files is
  # indistinguishable from a passing one.
  echo "ERROR: guard could not enumerate git-tracked files under src/ and app/."
  echo "This guard requires a git work tree (it scopes to 'git ls-files' by design)."
  exit 1
fi

fail=0

for p in "${PATTERNS[@]}"; do
  # -F (fixed strings): every pattern above is a literal package name, not a regex.
  matches=$(grep -Fn "$p" -- "${FILES[@]}" 2>/dev/null || true)
  if [ -n "$matches" ]; then
    echo "ERROR: forbidden import '$p' found outside lib/storage|lib/db:"
    echo "$matches"
    echo
    fail=1
  fi
done

# Special handling for the bare 'postgres' npm package.
# Match import-context only: `from 'postgres'` or `from "postgres"` or `require('postgres')` or `require("postgres")`.
pg_matches=$(
  grep -En "from ['\"]postgres['\"]|require\(['\"]postgres['\"]\)" -- "${FILES[@]}" 2>/dev/null || true
)
if [ -n "$pg_matches" ]; then
  echo "ERROR: forbidden import of 'postgres' (npm package) found outside lib/db:"
  echo "$pg_matches"
  echo
  fail=1
fi

if [ $fail -ne 0 ]; then
  echo "FAILED: BOOT-06 no-Vercel-only-imports rule violated."
  echo "Use 'import { storage } from \"@/lib/storage\"' or 'import { db } from \"@/lib/db\"' instead."
  exit 1
fi

echo "OK: no forbidden Vercel-only / driver-direct imports found outside lib/ adapters."
exit 0
