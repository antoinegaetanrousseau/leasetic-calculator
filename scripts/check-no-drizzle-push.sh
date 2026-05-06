#!/usr/bin/env bash
# Defense-in-depth: fail CI if anyone tries to add a 'drizzle-kit push' invocation anywhere.
# Per STATE.md locked decision and the orchestrator's carry-forward (Decision 2):
# migrations are versioned SQL committed to git, applied via the explicit GitHub Action only.
# `drizzle-kit push` is forbidden outside optional local dev experimentation.
set -euo pipefail

cd "$(dirname "$0")/.."

# Search package.json, shell scripts, GitHub Actions workflows, README, and source files.
# Skip node_modules, .next (build outputs), .planning/ (docs discuss the rule itself),
# drizzle.config.ts (has a comment explaining the prohibition), and this script itself.
matches=$(
  grep -rEn \
    --include='*.json' --include='*.sh' --include='*.yml' --include='*.yaml' \
    --include='*.md' --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' --include='*.cjs' \
    --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=drizzle --exclude-dir=.planning \
    --exclude='check-no-drizzle-push.sh' --exclude='drizzle.config.ts' --exclude='migrate.ts' \
    "drizzle-kit push" . 2>/dev/null \
  || true
)

if [ -n "$matches" ]; then
  echo "ERROR: 'drizzle-kit push' detected. Push is forbidden in this codebase."
  echo "Migrations: edit src/db/schema.ts → npm run db:generate → commit drizzle/*.sql"
  echo "Production: applied via .github/workflows/db-migrate.yml (manual trigger)."
  echo
  echo "Matches:"
  echo "$matches"
  exit 1
fi

echo "OK: no 'drizzle-kit push' invocations found."
exit 0
