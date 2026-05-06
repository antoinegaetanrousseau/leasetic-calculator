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

# Search scope: source-code files outside the adapter directories.
SEARCH_PATHS=("src" "app")
# Note: EXCLUDE_DIRS variable defined for documentation; --exclude-dir flags used inline.

fail=0

for p in "${PATTERNS[@]}"; do
  # Search for the literal package name in source files
  matches=$(
    grep -rEnF \
      --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' --include='*.cjs' \
      --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=drizzle \
      "$p" "${SEARCH_PATHS[@]}" 2>/dev/null \
      | grep -v -E "^(src/lib/storage/|src/lib/db/)" \
      || true
  )
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
  grep -rEn \
    --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' --include='*.cjs' \
    --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=drizzle \
    "from ['\"]postgres['\"]|require\(['\"]postgres['\"]\)" "${SEARCH_PATHS[@]}" 2>/dev/null \
    | grep -v -E "^(src/lib/storage/|src/lib/db/)" \
    || true
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
