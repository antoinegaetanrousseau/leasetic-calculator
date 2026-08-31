#!/usr/bin/env bash
# Local-only guard (INFRA-05, Phase 29): prints which Neon branch the local
# DATABASE_URL resolves to, and fails if it is the production endpoint.
#
# Why this exists: a prior defect had `.env.local` pointed at the production
# `main` branch pooled endpoint (ep-icy-boat-alx5o1tz-pooler), meaning any
# local dev session read and wrote live customer data. See
# docs/operations/neon-branch-routing.md for the full branch/endpoint table.
#
# Why this is NOT wired into CI: CI has no `.env.local` file, and builds run
# against a placeholder DATABASE_URL — the check would be vacuous there. This
# guard is deliberately local-machine-only.
#
# Security note: this script extracts and prints the HOSTNAME ONLY from
# DATABASE_URL. It never echoes the full connection string, username, or
# password, because this output may be pasted into an issue or a transcript.
# It never `source`s .env.local (that would execute arbitrary shell and
# export the secret into this process's environment) — it parses the file
# as plain text instead.
set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE=".env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "SKIP: $ENV_FILE not found — this guard is local-only (no-op on CI/build machines)."
  exit 0
fi

# Extract the first line matching DATABASE_URL=..., tolerating an optional
# leading `export ` and optional surrounding single/double quotes.
raw_line=$(grep -E '^[[:space:]]*(export[[:space:]]+)?DATABASE_URL=' "$ENV_FILE" | head -n 1 || true)

if [ -z "$raw_line" ]; then
  echo "ERROR: no DATABASE_URL found in $ENV_FILE."
  exit 1
fi

# Strip the key= prefix (including optional 'export '), then strip optional
# surrounding quotes.
value=$(printf '%s' "$raw_line" | sed -E 's/^[[:space:]]*(export[[:space:]]+)?DATABASE_URL=//')
value=$(printf '%s' "$value" | sed -E "s/^['\"]//; s/['\"][[:space:]]*\$//")

if [ -z "$value" ]; then
  echo "ERROR: DATABASE_URL is set in $ENV_FILE but has no value."
  exit 1
fi

# A pooled Neon connection string always has a user:pass@ segment. Guard the
# split explicitly rather than silently falling through to a misleading
# "unrecognised host" error (e.g. reporting the URL scheme as the hostname)
# when that segment is missing entirely.
case "$value" in
  *@*) ;;
  *)
    echo "ERROR: DATABASE_URL has no user@host segment (missing credentials)."
    echo "  Expected a pooled connection string like"
    echo "  postgres://user:pass@ep-<endpoint>-pooler.<region>.aws.neon.tech/db."
    exit 1
    ;;
esac

# Derive the hostname: the substring between '@' and the following '/' or ':'.
host=$(printf '%s' "$value" | sed -E 's#^[^@]*@##; s#[/:].*$##')

if [ -z "$host" ]; then
  echo "ERROR: could not parse a hostname out of DATABASE_URL."
  exit 1
fi

case "$host" in
  ep-polished-band-alphc576-pooler*)
    echo "OK: local DATABASE_URL → Neon development branch ($host)"
    exit 0
    ;;
  ep-delicate-night-als4ogpc-pooler*)
    echo "WARN: local DATABASE_URL → Neon preview branch ($host)."
    echo "  Isolated from production, but not the intended local target."
    echo "  Expected: ep-polished-band-alphc576-pooler (development branch)."
    exit 0
    ;;
  ep-icy-boat-alx5o1tz-pooler*)
    echo "ERROR: local DATABASE_URL → Neon main branch ($host) — PRODUCTION."
    echo "  Local dev must NEVER read or write production."
    echo "  Fix: Neon Console → project leasetic-matrice → branch development →"
    echo "  Connection details → Pooled connection → copy URL into .env.local."
    exit 1
    ;;
  localhost|127.0.0.1)
    echo "OK: local DATABASE_URL → local Postgres ($host) — allowed escape hatch."
    exit 0
    ;;
  *)
    echo "ERROR: unrecognised DATABASE_URL host ($host)."
    echo "  Not one of the three branches in docs/operations/neon-branch-routing.md"
    echo "  and not a recognised local-Postgres host. Verify before proceeding."
    exit 1
    ;;
esac
