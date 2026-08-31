#!/usr/bin/env bash
# Anti-rot guard: the db-smoke job's paths-filter patterns must match real migration paths.
#
# This is a regression test for a category of defect nothing else in this repo can catch:
# CI-config rot. The db-smoke job (.github/workflows/ci.yml) uses dorny/paths-filter to decide
# whether a PR touched schema-relevant files. That filter's patterns are plain strings inside a
# YAML block literal — nothing type-checks them against the actual repo layout. Previously the
# `schema:` filter listed `drizzle/migrations/*.sql`, a directory that has never existed (all
# migrations live directly at `drizzle/NNNN_*.sql`); the pattern silently matched nothing and the
# db-smoke job's internal steps skipped on every migration-only PR, reporting green.
#
# This script parses the live `schema:` patterns out of ci.yml and asserts four things about
# them, so the filter cannot rot the same way again without CI failing on the offending PR.
set -euo pipefail

cd "$(dirname "$0")/.."

WORKFLOW=".github/workflows/ci.yml"

if [ ! -f "$WORKFLOW" ]; then
  echo "ERROR: $WORKFLOW not found."
  exit 1
fi

# Step 1 — parse. Locate the `schema:` key inside the `filters: |` block literal of the
# dorny/paths-filter step, and collect the list items beneath it (lines whose trimmed form
# starts with "- "). Stop at the first line that is not such a list item.
patterns=$(awk '
  /^[[:space:]]*schema:[[:space:]]*$/ { collecting=1; next }
  collecting {
    line=$0
    sub(/^[[:space:]]+/, "", line)
    if (line ~ /^- /) {
      sub(/^- /, "", line)
      print line
    } else {
      exit
    }
  }
' "$WORKFLOW" | sed -e "s/^['\"]//" -e "s/['\"]$//")

pattern_count=0
if [ -n "$patterns" ]; then
  pattern_count=$(echo "$patterns" | sed '/^$/d' | wc -l | tr -d ' ')
fi

fail=0
failure_report=""

report_patterns() {
  echo "Collected patterns:"
  if [ -n "$patterns" ]; then
    echo "$patterns" | sed '/^$/d' | sed 's/^/  - /'
  else
    echo "  (none)"
  fi
}

# Assertion A — extraction sanity: at least one pattern was collected.
if [ "$pattern_count" -eq 0 ]; then
  echo "ASSERTION A (extraction sanity) FAILED: no patterns collected under the 'schema:' key"
  echo "in ${WORKFLOW}'s dorny/paths-filter step. The key was renamed, the filters: | block was"
  echo "restructured, or the step was removed. This guard must fail rather than pass vacuously."
  fail=1
fi

if [ "$pattern_count" -gt 0 ]; then
  # Assertion B — no dead patterns: every collected pattern matches at least one real path on disk.
  dead_patterns=""
  while IFS= read -r pattern; do
    [ -n "$pattern" ] || continue
    if ! compgen -G "$pattern" > /dev/null 2>&1; then
      dead_patterns="${dead_patterns}${pattern}"$'\n'
    fi
  done <<< "$patterns"

  if [ -n "$dead_patterns" ]; then
    echo "ASSERTION B (no dead patterns) FAILED: the following pattern(s) match nothing on disk:"
    echo "$dead_patterns" | sed '/^$/d' | sed 's/^/  - /'
    fail=1
  fi

  # Assertion C — full coverage of real migrations: every drizzle/[0-9]*.sql is matched by at
  # least one collected pattern.
  uncovered=""
  for sql_file in drizzle/[0-9]*.sql; do
    [ -e "$sql_file" ] || continue
    matched=0
    while IFS= read -r pattern; do
      [ -n "$pattern" ] || continue
      case "$sql_file" in
        $pattern) matched=1 ;;
      esac
      [ "$matched" -eq 1 ] && break
    done <<< "$patterns"
    if [ "$matched" -eq 0 ]; then
      uncovered="${uncovered}${sql_file}"$'\n'
    fi
  done

  if [ -n "$uncovered" ]; then
    echo "ASSERTION C (full coverage of real migrations) FAILED: the following existing"
    echo "migration file(s) are not matched by any collected pattern:"
    echo "$uncovered" | sed '/^$/d' | sed 's/^/  - /'
    fail=1
  fi

  # Assertion D — future-migration coverage: a synthetic, non-existent future migration path
  # must be matched by at least one collected pattern. This is the Phase 12 scenario in the
  # abstract: a migration-only changeset must trigger the gate even when _journal.json is
  # untouched. Never create this file — match it as a string only.
  future_path="drizzle/9999_synthetic_future_migration.sql"
  future_matched=0
  while IFS= read -r pattern; do
    [ -n "$pattern" ] || continue
    case "$future_path" in
      $pattern) future_matched=1 ;;
    esac
    [ "$future_matched" -eq 1 ] && break
  done <<< "$patterns"

  if [ "$future_matched" -eq 0 ]; then
    echo "ASSERTION D (future-migration coverage) FAILED: the synthetic path '${future_path}'"
    echo "is not matched by any collected pattern. A future migration-only PR would not trigger"
    echo "db-smoke's internal steps at all."
    fail=1
  fi
fi

if [ "$fail" -ne 0 ]; then
  echo
  report_patterns
  echo
  echo "Remedy: update the 'schema:' filter in ${WORKFLOW} to match where migrations actually"
  echo "live (drizzle/NNNN_*.sql at the top level of drizzle/, plus drizzle/meta/_journal.json)."
  exit 1
fi

echo "OK: ${pattern_count} pattern(s) validated (extraction, no dead patterns, full coverage, future-migration coverage)."
report_patterns
exit 0
