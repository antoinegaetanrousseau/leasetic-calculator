#!/usr/bin/env bash
# Local-only guard (INFRA-05 Phase 29; rewritten OPS-05 Phase 39 Plan 04): resolves the
# EFFECTIVE DATABASE_URL the caller-specified NODE_ENV would actually see — across the
# full @next/env candidate order, not one hardcoded file — and fails if it names the
# production endpoint.
#
# Why this exists (the 2026-09-06 incident, and why the old version was wrong): this
# script used to hardcode the single filename `.env.local` and read only that file.
# `npm run check:local-db-branch` printed "OK: development branch" while `npm run
# start` served the production pooled endpoint (see scripts/_neon-endpoints.list for
# its hostname), because `@next/env` resolves `.env.production.local` at HIGHER
# precedence than `.env.local` and the guard never looked at it. See
# docs/operations/neon-branch-routing.md for the full branch/endpoint
# table, and scripts/_env-precedence.ts for the TypeScript twin of the candidate order
# reproduced below (tests/db-guard-differential.test.ts, plan 39-05, is the differential
# test that fails if the two diverge).
#
# THE SUBTLE HALF OF THE FIX: this script does NOT trust its own ambient $NODE_ENV.
# `next build` / `next start` force NODE_ENV=production internally, but only AFTER an
# npm `prebuild`/`prestart` lifecycle hook has already finished running — at hook time,
# NODE_ENV is whatever the developer's shell happened to have (usually unset). A guard
# that read its own ambient NODE_ENV would resolve the DEVELOPMENT candidate order,
# report OK, and reproduce the incident verbatim. The caller must therefore pass
# `--node-env` naming the NODE_ENV the GUARDED command will run under — see
# package.json's `prebuild`/`prestart`, which both pass `--node-env production`.
#
# Why this is NOT unconditionally wired into every npm script: `next dev` (and any
# command with no candidate .env* file on disk — Vercel's build container, CI's `npm
# run build` step) never reaches this guard's ERROR branch. When none of the candidate
# files exist, the guard SKIPs unconditionally (see the SKIP branch below) so those
# legitimate remote builds are never blocked. `prebuild`/`prestart` invoking this guard
# is what makes that SKIP branch load-bearing rather than incidental.
#
# Security note: this script extracts and prints the HOSTNAME ONLY from the effective
# DATABASE_URL, plus which file supplied it. It never echoes the full connection
# string, username, password, or any other part of the value. It never sources,
# dynamically interprets, or exports an env file as shell (that would execute
# arbitrary code and leak the secret into this process's environment) — every
# candidate file is parsed as plain text instead.
set -euo pipefail

# Capture the script's OWN directory before any `cd`, so the shared endpoint-identity
# data file is always read from beside this script — never from `--root`. `--root`
# redirects only where ENV FILES are looked up (for the fixture test in plan 39-05); it
# must never redirect where this script's own data file lives, or pointing the guard at
# a temp dir would silently leave it with an empty endpoint table (a fail-open).
script_dir="$(cd "$(dirname "$0")" && pwd)"
endpoints_file="$script_dir/_neon-endpoints.list"

usage() {
  echo "USAGE: check-local-db-branch.sh [--node-env <env>] [--root <dir>]"
  echo "  --node-env <env>  NODE_ENV the GUARDED command will run under (default: \$NODE_ENV, else development)"
  echo "  --root <dir>      directory to resolve env files against (default: repo root; fixture-test only)"
}

node_env=""
root=""

while [ $# -gt 0 ]; do
  case "$1" in
    --node-env)
      node_env="${2:-}"
      shift 2
      ;;
    --root)
      root="${2:-}"
      shift 2
      ;;
    *)
      usage
      exit 2
      ;;
  esac
done

node_env="${node_env:-${NODE_ENV:-development}}"
root="${root:-$script_dir/..}"

cd "$root"

# Candidate order — must equal envFileOrder() in scripts/_env-precedence.ts exactly.
# `test` excludes `.env.local` outright (so a developer's local override never leaks
# into a test run); every other node-env includes it in second position.
if [ "$node_env" = "test" ]; then
  candidates=(".env.${node_env}.local" ".env.${node_env}" ".env")
else
  candidates=(".env.${node_env}.local" ".env.local" ".env.${node_env}" ".env")
fi

# Determine which candidates exist BEFORE resolving a value — an empty set is the
# canonical "no local env file on disk" signal that lets Vercel and CI's build steps
# no-op safely (D-04), independent of whatever DATABASE_URL resolution finds.
files_found=()
for f in "${candidates[@]}"; do
  if [ -f "$f" ]; then
    files_found+=("$f")
  fi
done

if [ "${#files_found[@]}" -eq 0 ]; then
  echo "SKIP: no candidate env file found for node-env '$node_env' (checked: ${candidates[*]}) — this guard is local-only (no-op on CI/build machines)."
  exit 0
fi

value=""
source=""

# A non-empty DATABASE_URL already in the environment beats every file (matches
# dotenv's own `override: false` default and @next/env's behaviour).
if [ -n "${DATABASE_URL:-}" ]; then
  value="$DATABASE_URL"
  source="process.env"
else
  for f in "${files_found[@]}"; do
    # Extract the LAST line matching DATABASE_URL=..., tolerating an optional leading
    # `export ` and optional surrounding single/double quotes. The `^\s*#` alternative
    # is intentionally NOT part of the DATABASE_URL match — the pattern already
    # requires the line to start (after optional whitespace) with `export ` or the key
    # itself, so a commented-out `# DATABASE_URL=...` line never matches, agreeing with
    # dotenv.parse() (via scripts/_env-precedence.ts), which also ignores it.
    #
    # `tail -n 1`, NOT `head -n 1` (39-REVIEW CR-01): WITHIN one file the LAST
    # assignment wins, because dotenv.parse() builds an object and a later key
    # overwrites an earlier one. ACROSS files the FIRST file still wins — that is the
    # `break` below, and the two rules are independent. Taking the first line here
    # reproduced OPS-05 inside a single file: appending a rotated DATABASE_URL without
    # deleting the stale line above it made this guard print the old development host
    # and exit 0 while every TS consumer opened the new production one.
    raw_line=$(grep -E '^[[:space:]]*(export[[:space:]]+)?DATABASE_URL=' "$f" | tail -n 1 || true)
    if [ -z "$raw_line" ]; then
      continue
    fi
    # Strip the key= prefix (including optional 'export '), then strip optional
    # surrounding quotes.
    candidate_value=$(printf '%s' "$raw_line" | sed -E 's/^[[:space:]]*(export[[:space:]]+)?DATABASE_URL=//')
    candidate_value=$(printf '%s' "$candidate_value" | sed -E "s/^['\"]//; s/['\"][[:space:]]*\$//")
    if [ -n "$candidate_value" ]; then
      value="$candidate_value"
      source="$f"
      break
    fi
  done
fi

if [ -z "$value" ]; then
  echo "ERROR: no DATABASE_URL found in any candidate file (checked: ${files_found[*]})."
  exit 1
fi

# A pooled Neon connection string always has a user:pass@ segment. Guard the split
# explicitly rather than silently falling through to a misleading "unrecognised host"
# error (e.g. reporting the URL scheme as the hostname) when that segment is missing
# entirely.
case "$value" in
  *@*) ;;
  *)
    echo "ERROR: DATABASE_URL (from $source) has no user@host segment (missing credentials)."
    echo "  Expected a pooled connection string like"
    echo "  postgres://user:pass@ep-<endpoint>-pooler.<region>.aws.neon.tech/db."
    exit 1
    ;;
esac

# Derive the hostname: the substring between '@' and the following '/' or ':'. The `:`
# in this character class is bash's equivalent of URL.hostname over URL.host — `host`
# carries the port, so an explicit `:5432` would slip past a check that stripped only
# at `/` (bug_011). Do not drop it.
host=$(printf '%s' "$value" | sed -E 's#^[^@]*@##; s#[/:].*$##')

if [ -z "$host" ]; then
  echo "ERROR: could not parse a hostname out of DATABASE_URL (from $source)."
  exit 1
fi

# Classification is read from the shared declarative endpoint list (D-05), never from
# hardcoded case arms naming an endpoint id directly. Matched against the record's full
# `hostname` field by EXACT EQUALITY (not a prefix wildcard) so a lookalike host that
# merely shares an endpoint-ID prefix but resolves to an unrelated domain is rejected
# as unrecognised rather than misclassified as a known branch — carried forward
# unchanged from this script's pre-rewrite rationale.
verdict=""
branch=""

if [ "$host" = "localhost" ] || [ "$host" = "127.0.0.1" ]; then
  verdict="localhost"
else
  while IFS='|' read -r prefix hostname record_branch scope; do
    case "$prefix" in
      ''|'#'*) continue ;;
    esac
    if [ "$host" = "$hostname" ]; then
      branch="$record_branch"
      break
    fi
  done < "$endpoints_file"

  case "$branch" in
    main) verdict="main" ;;
    preview) verdict="preview" ;;
    development) verdict="development" ;;
    *) verdict="unrecognised" ;;
  esac
fi

case "$verdict" in
  development)
    echo "OK: DATABASE_URL → Neon development branch ($host) from $source"
    exit 0
    ;;
  localhost)
    echo "OK: DATABASE_URL → local Postgres ($host) from $source — allowed escape hatch."
    exit 0
    ;;
  preview)
    echo "WARN: DATABASE_URL → Neon preview branch ($host) from $source."
    echo "  Isolated from production, but not the intended local target."
    echo "  Expected: the development branch endpoint (see docs/operations/neon-branch-routing.md)."
    exit 0
    ;;
  main)
    echo "ERROR: DATABASE_URL → Neon main branch ($host) from $source — PRODUCTION."
    echo "  This command must NEVER read or write production."
    echo "  Fix: Neon Console → project leasetic-matrice → branch development →"
    echo "  Connection details → Pooled connection → copy URL into .env.local."
    exit 1
    ;;
  *)
    echo "ERROR: unrecognised DATABASE_URL host ($host) from $source."
    echo "  Not a record in scripts/_neon-endpoints.list and not a recognised local-Postgres"
    echo "  host. See docs/operations/neon-branch-routing.md. Verify before proceeding."
    exit 1
    ;;
esac
