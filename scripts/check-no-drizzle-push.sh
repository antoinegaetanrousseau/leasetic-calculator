#!/usr/bin/env bash
# Defense-in-depth: fail CI if anyone tries to add a 'drizzle-kit push' invocation anywhere.
# Per STATE.md locked decision and the orchestrator's carry-forward (Decision 2):
# migrations are versioned SQL committed to git, applied via the explicit GitHub Action only.
# `drizzle-kit push` is forbidden outside optional local dev experimentation.
set -euo pipefail

cd "$(dirname "$0")/.."

# ---------------------------------------------------------------------------
# Scope: GIT-TRACKED FILES ONLY.
#
# This guard previously walked the filesystem with `grep -r . --exclude-dir=...`.
# That is unsound: the exclusion list can only name directories someone thought of
# in advance, so ANY untracked local file that merely *mentions* the forbidden
# phrase trips the guard. In practice `.remember/` (the `remember` Claude Code
# plugin's notes, gitignored via `.remember/.gitignore`) did exactly that — an
# agent note reading "drizzle-kit push forbidden" failed the local run while CI,
# which never sees the file, passed.
#
# That is the worst failure mode a guard can have: untrustworthy precisely when a
# developer runs it before pushing, which trains people to ignore it. Enumerating
# more agent/tooling dirs (.agents, .claude, .cursor, .opencode, ...) only defers
# the problem to the next tool someone installs.
#
# Scoping to `git ls-files` inverts the default: only content that is actually
# committed — or staged, which `git ls-files` also reports — can fail the guard.
# Untracked scratch content can never trip it, and no exclusion list needs
# maintaining as tooling changes. node_modules/ and .next/ fall out for free
# (gitignored); the pathspecs below still exclude tracked paths that legitimately
# DISCUSS the prohibition rather than invoke it.
# ---------------------------------------------------------------------------

# Tracked paths that legitimately mention 'drizzle-kit push' in prose:
#   .planning/, docs/  — planning artifacts and operations runbooks citing the rule
#   drizzle/           — generated SQL
#   drizzle.config.ts  — header comment explaining the prohibition
#   scripts/migrate.ts — migration runner referencing what it is NOT
#   this script        — the pattern literal itself
readarray -t files < <(
  git ls-files -- \
    '*.json' '*.sh' '*.yml' '*.yaml' '*.md' '*.ts' '*.tsx' '*.js' '*.mjs' '*.cjs' \
    ':(exclude).planning/**' \
    ':(exclude)docs/**' \
    ':(exclude)drizzle/**' \
    ':(exclude)drizzle.config.ts' \
    ':(exclude)scripts/migrate.ts' \
    ':(exclude)scripts/check-no-drizzle-push.sh' \
    2>/dev/null || true
)

if [ "${#files[@]}" -eq 0 ]; then
  # Either not a git work tree (tarball export, detached build context) or the
  # pathspecs matched nothing. Fail loudly rather than pass vacuously: a guard
  # that silently inspects zero files is indistinguishable from a passing one.
  echo "ERROR: guard could not enumerate git-tracked files to scan."
  echo "This guard requires a git work tree (it scopes to 'git ls-files' by design)."
  echo "If you are running from a source export rather than a clone, run it from a clone."
  exit 1
fi

matches=$(grep -En "drizzle-kit push" -- "${files[@]}" 2>/dev/null || true)

if [ -n "$matches" ]; then
  echo "ERROR: 'drizzle-kit push' detected. Push is forbidden in this codebase."
  echo "Migrations: edit src/db/schema.ts → npm run db:generate → commit drizzle/*.sql"
  echo "Production: applied via .github/workflows/db-migrate.yml (manual trigger)."
  echo
  echo "Matches:"
  echo "$matches"
  exit 1
fi

echo "OK: no 'drizzle-kit push' invocations found (${#files[@]} tracked files scanned)."
exit 0
