#!/usr/bin/env bash
# Journal/SQL parity gate — the Phase 12 regression detector.
#
# Phase 12 incident: a hand-authored migration (`drizzle/0004_phase12_drafts_and_history.sql`)
# was committed without running `npm run db:generate`, so no matching entry landed in
# `drizzle/meta/_journal.json`. drizzle-orm's `migrate()` (see scripts/migrate.ts) applies
# migrations by walking `_journal.json` entries — it does NOT scan the `drizzle/` directory
# for `.sql` files (the file listing in migrate.ts is console output only). An orphaned `.sql`
# with no journal entry is therefore invisible to the migrator: `npm run db:migrate` succeeds
# silently and production schema drifts un-applied. Production ran ~24h un-migrated until
# Phase 13's wizard hit the missing column.
#
# This script asserts 1:1 parity between `drizzle/[0-9]*.sql` files and `"tag"` entries in
# `drizzle/meta/_journal.json`, in both directions:
#   A. Orphan SQL      — a `.sql` file with no matching journal tag.
#   B. Dangling journal — a journal tag with no matching `.sql` file.
#
# Deliberately out of scope: `drizzle/meta/*_snapshot.json` parity. `0005_snapshot.json` is
# legitimately absent (Phase 22 journal repair residue, see STATE.md) — drizzle-orm's migrate()
# never reads snapshots (only `drizzle-kit generate` does), so this is inert and must not fail
# this gate.
set -euo pipefail

cd "$(dirname "$0")/.."

JOURNAL="drizzle/meta/_journal.json"

if [ ! -f "$JOURNAL" ]; then
  echo "ERROR: $JOURNAL not found."
  exit 1
fi

# Extract tag values from the journal without jq (not a declared dependency).
# Journal entries look like:  "tag": "0004_phase12_drafts_and_history",
tags=$(grep -o '"tag"[[:space:]]*:[[:space:]]*"[^"]*"' "$JOURNAL" | sed -E 's/.*"tag"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/')

orphans=""
orphan_count=0
sql_count=0

# A. Orphan SQL — every drizzle/[0-9]*.sql file must have a matching journal tag.
for sql_file in drizzle/[0-9]*.sql; do
  [ -e "$sql_file" ] || continue
  sql_count=$((sql_count + 1))
  base=$(basename "$sql_file" .sql)
  found=0
  while IFS= read -r tag; do
    if [ "$tag" = "$base" ]; then
      found=1
      break
    fi
  done <<< "$tags"
  if [ "$found" -eq 0 ]; then
    orphans="${orphans}${sql_file}"$'\n'
    orphan_count=$((orphan_count + 1))
  fi
done

dangling=""
dangling_count=0
tag_count=0

# B. Dangling journal entry — every tag must have a matching drizzle/<tag>.sql file.
while IFS= read -r tag; do
  [ -n "$tag" ] || continue
  tag_count=$((tag_count + 1))
  if [ ! -f "drizzle/${tag}.sql" ]; then
    dangling="${dangling}${tag}"$'\n'
    dangling_count=$((dangling_count + 1))
  fi
done <<< "$tags"

if [ "$orphan_count" -gt 0 ] || [ "$dangling_count" -gt 0 ]; then
  echo "ERROR: migration journal/SQL parity violation detected (Phase 12 regression class)."
  echo
  if [ "$orphan_count" -gt 0 ]; then
    echo "Orphan SQL file(s) — present on disk but missing from $JOURNAL:"
    echo "$orphans" | sed '/^$/d' | sed 's/^/  - /'
    echo
  fi
  if [ "$dangling_count" -gt 0 ]; then
    echo "Dangling journal entrie(s) — present in $JOURNAL but missing .sql file:"
    echo "$dangling" | sed '/^$/d' | sed 's/^/  - /'
    echo
  fi
  echo "Remedy: never hand-author a migration file or journal entry. Regenerate with"
  echo "  npm run db:generate"
  echo "so the .sql file and its journal entry are always written together."
  exit 1
fi

echo "OK: ${sql_count} migration file(s) checked, ${tag_count} journal entrie(s) checked — in sync."
exit 0
