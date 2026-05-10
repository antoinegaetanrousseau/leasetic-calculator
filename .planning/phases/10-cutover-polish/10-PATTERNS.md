# Phase 10: Cutover & Polish — Pattern Map

**Mapped:** 2026-05-10
**Files analyzed:** 19 (11 new, 8 modified)
**Analogs found:** 19 / 19

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `docs/operations/deploy-ovh.md` | doc/runbook | N/A | `docs/operations/migrations.md` | exact structure |
| `docs/operations/launch-checklist.md` | doc/checklist | N/A | `docs/operations/purge.md` + `migrations.md` | role-match |
| `docs/legal/privacy-coverage-confirmation.md` | doc/stub | N/A | `docs/operations/purge.md` (stub pattern) | partial |
| `scripts/smoke-ovh.ts` | script/utility | request-response + file-I/O | `scripts/purge-soft-deleted.ts` + `app/healthz/route.ts` | role-match |
| `scripts/purge-test-data.ts` | script/utility | CRUD | `scripts/purge-soft-deleted.ts` | exact |
| `scripts/check-no-v10-localstorage.sh` | script/CI-gate | transform | `scripts/check-no-vercel-only-imports.sh` | exact |
| `src/lib/admin/purge.ts` | service/utility | CRUD | `scripts/purge-soft-deleted.ts` loop body | exact (extract) |
| `app/api/internal/purge-soft-deleted/route.ts` | route/handler | request-response | `app/api/proposals/[id]/delete/route.ts` | exact |
| `app/(admin)/[adminSegment]/coefficients/SeedBanner.tsx` | component | request-response | `src/components/LoginForm.tsx` (client island pattern) + `CoefficientsEditor.tsx` (card chrome) | role-match |
| `vercel.json` | config | N/A | (no existing file — new) | no analog |
| `.env.example` | config | N/A | `.env.example` itself (modify) | exact (extend) |
| `app/(admin)/[adminSegment]/coefficients/page.tsx` *(modify)* | page/server-component | request-response | `app/(admin)/[adminSegment]/coefficients/page.tsx` itself | exact (self) |
| `app/(public)/login/LoginForm.tsx` *(modify)* | component | request-response | `src/components/LoginForm.tsx` itself | exact (self) |
| `scripts/purge-soft-deleted.ts` *(modify)* | script/utility | CRUD | itself + `src/lib/admin/purge.ts` (new target) | exact (self) |
| `scripts/seed-partner-launch.ts` *(modify)* | script/utility | CRUD | `scripts/seed-admins-launch.ts` (gate pattern) | exact |
| `src/lib/db/queries/audit-log.ts` *(modify)* | model/query | CRUD | itself | exact (self, union extend) |
| `.github/workflows/ci.yml` *(modify)* | config/CI | N/A | `.github/workflows/ci.yml` itself | exact (self) |
| `app/globals.css` *(modify)* | config/styles | N/A | `app/globals.css` itself | exact (self) |
| `src/lib/i18n/dictionaries.ts` *(modify)* | config/i18n | N/A | `src/lib/i18n/dictionaries.ts` itself | exact (self) |

---

## Pattern Assignments

### `docs/operations/deploy-ovh.md` (doc, runbook)

**Analog:** `docs/operations/migrations.md`

**Document structure pattern** (migrations.md lines 1–13):
```markdown
# Database Migrations — Operator Runbook

Leasétic Matrice v1.1 uses Drizzle ORM...

## Locked rules

1. **Never `drizzle-kit generate --push`...** CI grep enforces...
2. **Migrations apply to production ONLY via `.github/workflows/db-migrate.yml`**
```

**Section ordering to mirror:** Title + one-line scope, `## Locked rules` (invariants), then workflow sections: Overview / Prerequisites / Provisioning / Configuration / Build & Deploy / Migration Application / Smoke Test / Cron Setup (replaces Vercel Cron) / Rollback / Smoke Test Failure Diagnosis. Mirror the lifecycle diagram from `migrations.md` lines 18–36 for the OVH deploy flow.

**Runbook text conventions observed in analog:**
- Exact CLI commands in fenced blocks (`bash`)
- Numbered steps with **bold action verbs** per section
- Failure modes in a table: `| Mode | Symptom | Recovery |` (from `docs/operations/purge.md` lines 88–95)
- Antoine-context voice — no "the operator"; say "you" or "Antoine" — Antoine is both author and sole reader (D-10-21)

**Env var table pattern** (from `.env.example` structure — Phase 5/6 commentary style):
```bash
# === Section heading ===
# Short rationale line linking to the decision that requires this var.
VAR_NAME=<value-or-placeholder>
```

---

### `docs/operations/launch-checklist.md` (doc, numbered checklist)

**Analog:** `docs/operations/purge.md` (§Workflow pattern) + `docs/operations/migrations.md` (numbered step pattern)

**Checklist structure to follow** (purge.md lines 34–68 as template):
```markdown
## Workflow

### 1. Step title

```bash
command here
```

Expected output or pass/fail signal.
```

**But use GitHub-flavored checkbox syntax per D-10-19:**
```markdown
- [ ] 1. Apply migrations 0002 + 0003 to prod
- [ ] 2. Verify `/healthz` returns `{db: ok, blob: ok}`
- [ ] 3. Admin login → coefficients banner visible → customize
...
```

Each item must be self-contained: exact command, expected result, and what "done" looks like. The file is committed as a launch-day artifact with items ticked (Antoine commits the checked file).

---

### `docs/legal/privacy-coverage-confirmation.md` (doc, stub)

**Analog:** No existing legal doc — new directory `docs/legal/`. Structure as a minimal template with:
- Date-stamped header (ISO date)
- "Pending Thomas's reply" placeholder
- Quoted email text from D-10-18 as the question on record
- Empty "Response" section for Thomas's answer
- Signed-off-by line

No code patterns to extract; planner authors from scratch per D-10-18 text.

---

### `scripts/smoke-ovh.ts` (script, request-response + file-I/O)

**Analog:** `scripts/purge-soft-deleted.ts` for CLI harness shape; `app/healthz/route.ts` for HTTP round-trip concept.

**Header/docblock pattern** (`scripts/purge-soft-deleted.ts` lines 1–29):
```typescript
#!/usr/bin/env tsx
/**
 * [One-line purpose].
 *
 * What it does:
 *   1. ...
 *   2. ...
 *
 * Confirmation gate (Phase 5/6 D-09 typed-confirmation precedent):
 *   - default invocation = dry-run ...
 *   - --confirm ... OR env CONFIRM=... = apply
 *
 * Required env: DATABASE_URL + STORAGE_DRIVER + ADMIN_EMAIL + ADMIN_PASSWORD + APP_URL.
 *
 * Usage:
 *   npm run smoke:ovh                                   → dry-run / validate env
 *   APP_URL=<url> ADMIN_EMAIL=<e> ADMIN_PASSWORD=<p> npm run smoke:ovh
 */
import 'dotenv/config';
```

**maskUrl helper** (`scripts/purge-soft-deleted.ts` lines 38–46 — copy verbatim):
```typescript
function maskUrl(raw: string | undefined): string {
  if (!raw) return '<unset>';
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.username || '?'}@${u.hostname}${u.pathname}`;
  } catch {
    return '<invalid URL>';
  }
}
```

**Env-required gate pattern** (`scripts/purge-soft-deleted.ts` lines 68–75 + `scripts/seed-admins-launch.ts` lines 87–94):
```typescript
if (!process.env.APP_URL) {
  console.error('ERROR: APP_URL is not set. Aborting.');
  process.exit(2);
}
if (!process.env.ADMIN_EMAIL) {
  console.error('ERROR: ADMIN_EMAIL is not set. Aborting.');
  process.exit(2);
}
// ... etc.
```

**Banner print pattern** (`scripts/purge-soft-deleted.ts` lines 59–65):
```typescript
console.log('═══════════════════════════════════════════════════════════════');
console.log('  Phase 10 — OVH smoke test (full proposal lifecycle)');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Mode:           ${mode}`);
console.log(`  APP_URL:        ${maskUrl(process.env.APP_URL)}`);
console.log(`  DATABASE_URL:   ${maskUrl(process.env.DATABASE_URL)}`);
console.log('═══════════════════════════════════════════════════════════════');
```

**main().catch pattern** (`scripts/purge-soft-deleted.ts` lines 163–166):
```typescript
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

**Step-by-step non-zero exit pattern** (purge-soft-deleted.ts lines 107–161 — best-effort per step with `process.exit(1)` on failure):
Smoke script follows the same sequential-step structure but exits immediately on any step failure (no best-effort; a smoke step failing = test failing). Use `try/catch` per step, log `[FAIL] step N: <reason>`, then `process.exit(1)`.

---

### `scripts/purge-test-data.ts` (script, CRUD — typed-confirmation + dry-run)

**Analog:** `scripts/purge-soft-deleted.ts` — copy the entire structure; swap predicate and cascade targets.

**Imports pattern** (`scripts/purge-soft-deleted.ts` lines 30–36):
```typescript
import 'dotenv/config';
import {
  listPurgeCandidates,
  hardPurgeProposal,
  writeAuditLog,
} from '../src/lib/db/queries';
import { storage } from '../src/lib/storage';
```
For `purge-test-data.ts`, replace with:
```typescript
import 'dotenv/config';
import { writeAuditLog } from '../src/lib/db/queries';
import { storage } from '../src/lib/storage';
```
Plus lazy imports for `db` + `schema` inside `main()` (same lazy-import pattern as `seed-admins-launch.ts` lines 101–103).

**Confirmation gate** (`scripts/purge-soft-deleted.ts` lines 48–53):
```typescript
function getConfirmFlag(): boolean {
  const env = process.env.CONFIRM === 'PURGE-TEST-DATA';
  const argIdx = process.argv.indexOf('--confirm');
  const arg = argIdx >= 0 && process.argv[argIdx + 1] === 'PURGE-TEST-DATA';
  return env || arg;
}
```

**Dry-run / apply mode pattern** (lines 55–101 of purge-soft-deleted.ts):
```typescript
async function main() {
  const apply = getConfirmFlag();
  const mode = apply ? 'APPLY (writes WILL happen)' : 'DRY-RUN (no writes)';
  // ... banner with DATABASE_URL masked ...
  // ... env guards (DATABASE_URL, STORAGE_DRIVER) ...
  const candidates = await listTestUserCandidates(); // new query — LIKE '%@test.leasetic.com'
  if (!apply) {
    // print candidates, instruct re-run with --confirm
    return;
  }
  // apply loop — for each test user: delete proposals+blobs, delete user rows, writeAuditLog
}
```

**Apply loop per-row pattern** (`scripts/purge-soft-deleted.ts` lines 107–148):
```typescript
for (const row of candidates) {
  try {
    if (row.pdfBlobKey) {
      await storage().delete(row.pdfBlobKey);
    }
    const deleted = await hardPurgeProposal(row.id);
    if (!deleted) {
      console.log(`  [skip] id=${row.id} (race condition)`);
      continue;
    }
    await writeAuditLog({
      actorId: null,
      action: 'proposal.purge',   // ← for test-data script: 'user.purge'
      targetType: 'proposal',     // ← for test-data script: 'user'
      targetId: row.id,
      payload: { /* ... */ },
    });
    console.log(`  [ok]   id=${row.id}`);
    ok += 1;
  } catch (err) {
    console.error(`  [fail] id=${row.id}: ${err instanceof Error ? err.message : String(err)}`);
    failed += 1;
    // best-effort: continue
  }
}
```

**Audit log write for `user.purge`** (new action per D-10-11):
```typescript
await writeAuditLog({
  actorId: null,
  action: 'user.purge',
  targetType: 'user',
  targetId: userId,
  payload: { email: row.email, reason: 'pre_launch_test_data_cleanup' },
});
```

---

### `scripts/check-no-v10-localstorage.sh` (script, CI-gate)

**Analog:** `scripts/check-no-vercel-only-imports.sh` — copy the entire structure; swap patterns and search scope.

**Shebang + header + set** (`scripts/check-no-vercel-only-imports.sh` lines 1–12):
```bash
#!/usr/bin/env bash
# Defense-in-depth grep for the CUT-03 no-v10-localstorage rule.
# Fails CI if any v10 localStorage key is found in app/ or src/.
# Exit 0 if clean, exit 1 if any key is found.
set -euo pipefail

cd "$(dirname "$0")/.."
```

**PATTERNS array + fixed-string grep** (lines 17–54):
```bash
PATTERNS=(
  "lt_pw"
  "lt_coeffs"
  "lt_commission"
  "lt_max"
  "lt_partner"
)

SEARCH_PATHS=("src" "app")
fail=0

for p in "${PATTERNS[@]}"; do
  matches=$(
    grep -rEnF \
      --include='*.ts' --include='*.tsx' --include='*.js' --include='*.mjs' --include='*.cjs' \
      --exclude-dir=node_modules --exclude-dir=.next \
      "$p" "${SEARCH_PATHS[@]}" 2>/dev/null \
    || true
  )
  if [ -n "$matches" ]; then
    echo "ERROR: v10 localStorage key '$p' found in app/ or src/:"
    echo "$matches"
    echo
    fail=1
  fi
done

if [ $fail -ne 0 ]; then
  echo "FAILED: CUT-03 no-v10-localstorage rule violated."
  exit 1
fi

echo "OK: no v10 localStorage keys found in app/ or src/."
exit 0
```

---

### `src/lib/admin/purge.ts` (service/utility, CRUD — pure function extract)

**Analog:** `scripts/purge-soft-deleted.ts` lines 107–161 — the apply loop becomes the function body.

**Module header convention** (`src/lib/db/queries/audit-log.ts` lines 1–2):
```typescript
import 'server-only';
import { db, schema } from '@/lib/db';
```

**Pure function signature** (from D-10-07 decision):
```typescript
import 'server-only';
import { listPurgeCandidates, hardPurgeProposal, writeAuditLog } from '@/lib/db/queries';
import { storage } from '@/lib/storage';

export async function purgeSoftDeleted(opts?: {
  olderThanDays?: number;   // default 30
  actorId?: string | null;  // default null (system-initiated)
}): Promise<{ purged: number; errors: Array<{ id: string; error: string }> }> {
  // ... loop body extracted from scripts/purge-soft-deleted.ts lines 110–148 ...
}
```

**Loop body to extract** (lines 110–148 of `scripts/purge-soft-deleted.ts`):
```typescript
for (const row of candidates) {
  try {
    if (row.pdfBlobKey) {
      await storage().delete(row.pdfBlobKey);
    }
    const deleted = await hardPurgeProposal(row.id);
    if (!deleted) {
      // race condition skip — not an error
      continue;
    }
    await writeAuditLog({
      actorId: opts?.actorId ?? null,
      action: 'proposal.purge',
      targetType: 'proposal',
      targetId: row.id,
      payload: {
        lcRef: row.lcRef,
        deletedAt: row.deletedAt?.toISOString() ?? null,
        blobKey: row.pdfBlobKey ?? null,
      },
    });
    purged += 1;
  } catch (err) {
    errors.push({ id: row.id, error: err instanceof Error ? err.message : String(err) });
    // best-effort: continue
  }
}
```

**`server-only` enforcement note:** This module imports `server-only` because it calls `db()` and `storage()`. The `scripts/purge-soft-deleted.ts` wrapper (CLI) bypasses `server-only` via `_preload-mock-server-only.cjs` — the same preload used by other scripts (see `scripts/purge-soft-deleted.ts` line 28 JSDoc note).

---

### `app/api/internal/purge-soft-deleted/route.ts` (route, request-response)

**Analog:** `app/api/proposals/[id]/delete/route.ts` — exact match for `runtime`, `dynamic`, auth-gate, audit-write pattern.

**Module-level exports** (`app/api/proposals/[id]/delete/route.ts` lines 5–6):
```typescript
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

**Auth-gate pattern** (lines 10–17 — but for this internal route: dual-gate: admin session OR cron secret):
```typescript
export async function POST(req: NextRequest) {
  // Gate A: cron-secret bearer token (unattended invocation via Vercel Cron)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.PURGE_CRON_SECRET;
  const hasCronSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;

  // Gate B: admin session (manual invocation)
  let hasAdminSession = false;
  if (!hasCronSecret) {
    try {
      await requireAdmin();
      hasAdminSession = true;
    } catch {
      // not an admin session
    }
  }

  if (!hasCronSecret && !hasAdminSession) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  // ... invoke purgeSoftDeleted() from src/lib/admin/purge.ts ...
}
```

**Audit-write fire-and-forget pattern** (`app/api/proposals/[id]/delete/route.ts` lines 28–40):
```typescript
  try {
    await writeAuditLog({ ... });
  } catch (err) {
    // Audit write failure must not surface to the client — the mutation already succeeded.
    console.error('[POST /api/internal/purge-soft-deleted] audit log write failed', err);
  }
```

**Response shape** (lines 40–43, adapted):
```typescript
  const { purged, errors } = await purgeSoftDeleted({ actorId: null });
  const status = errors.length > 0 && purged === 0 ? 500 : 200;
  return NextResponse.json({ purged, errors: errors.length }, { status });
```

**Import path convention** (`app/api/proposals/[id]/delete/route.ts` lines 1–3):
```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/require';
import { writeAuditLog } from '@/lib/db/queries';
// plus:
import { purgeSoftDeleted } from '@/lib/admin/purge';
```

---

### `app/(admin)/[adminSegment]/coefficients/SeedBanner.tsx` (component, client island)

**Analog:** `src/components/LoginForm.tsx` for `'use client'` + `t()` + `Lang` prop pattern; `app/(admin)/[adminSegment]/coefficients/CoefficientsEditor.tsx` for card chrome + inline styles.

**`'use client'` island imports pattern** (`src/components/LoginForm.tsx` lines 1–13):
```typescript
'use client';

import { t, type Lang } from '@/lib/i18n/dictionaries';

interface SeedBannerProps {
  lang: Lang;
  visible: boolean;
}
```

**Conditional render with no-op** (standard React pattern used across all Phase 7/8/9 client components):
```typescript
export function SeedBanner({ lang, visible }: SeedBannerProps) {
  if (!visible) return null;
  return (
    <div
      className="seed-banner"
      role="status"
      aria-live="polite"
    >
      {t('admin.seed_banner.message', lang)}
    </div>
  );
}
```

**Inline style pattern for informational banner** (derived from `CoefficientsEditor.tsx` card chrome lines 87–91 and globals.css `.card` at lines 115–121):
The `.seed-banner` CSS class (to be added to `app/globals.css`) follows the same token pattern as `.card`:
```css
.seed-banner {
  background: var(--gold);
  color: var(--navy);
  border-radius: 12px;
  padding: 12px 20px;
  font-size: 13.5px;
  font-weight: 500;
  margin-bottom: 16px;
}
html[data-theme="dark"] .seed-banner {
  background: rgba(224,133,48,0.22);
  color: var(--ink);
}
```

**i18n keys to add** (following the `admin.coefficients.*` pattern in `src/lib/i18n/dictionaries.ts` lines 420–432):
```typescript
// Phase 10 — Coefficient seed banner (D-10-13)
'admin.seed_banner.message': 'Les coefficients sont actuellement les valeurs par défaut. Vérifiez et confirmez avant d\'inviter des partenaires.',
```
EN counterpart:
```typescript
'admin.seed_banner.message': 'Coefficients are currently default values. Verify and confirm before inviting partners.',
```

---

### `vercel.json` (config — new file)

**No existing analog** in the codebase. Create from scratch with:
```json
{
  "crons": [
    {
      "path": "/api/internal/purge-soft-deleted",
      "schedule": "0 3 1,15 * *"
    }
  ]
}
```
Per D-10-05/06: cron schedule `"0 3 1,15 * *"` = 1st and 15th of each month at 03:00 UTC. The Vercel cron runtime injects a `Authorization: Bearer <PURGE_CRON_SECRET>` header if configured via `crons[].headers` (check Vercel Cron docs for current header injection syntax — may require env var reference in vercel.json or rely on the route reading `process.env.PURGE_CRON_SECRET` directly and Vercel cron hitting it without auth; planner should verify Vercel Cron docs for current header support).

---

### `.env.example` (config — extend)

**Analog:** `.env.example` itself — extend the Phase 6 section with a Phase 10 section.

**Phase 6 extension pattern** (`.env.example` lines 36–68 — add a new section at EOF):
```bash
# ─────────────────────────────────────────────────────────────────────────
# Phase 10 — Cutover & Polish
# ─────────────────────────────────────────────────────────────────────────

# NEXT_PUBLIC_PRIVACY_URL_FR: URL to Leasétic's French privacy policy.
# Supplied by Thomas. Appears as a link on the /login page footer.
# Update without code change — just change this env var and redeploy.
NEXT_PUBLIC_PRIVACY_URL_FR=https://leasetic.fr/mentions-legales

# NEXT_PUBLIC_PRIVACY_URL_EN: URL to Leasétic's English privacy policy.
NEXT_PUBLIC_PRIVACY_URL_EN=https://leasetic.fr/privacy-policy

# PURGE_CRON_SECRET: shared secret for the unattended /api/internal/purge-soft-deleted route.
# Injected by Vercel Cron as Authorization: Bearer <secret>.
# Generate: openssl rand -hex 32
# Scope: Production only. Never expose in Preview/Development.
PURGE_CRON_SECRET=
```

---

## Modified File Pattern Assignments

### `app/(admin)/[adminSegment]/coefficients/page.tsx` (modify — add SeedBanner)

**File:** `/Users/antoinerousseau/Developer/leasetic-calculator/app/(admin)/[adminSegment]/coefficients/page.tsx`

**Current import block** (lines 1–7 — add `SeedBanner` import + `seedParams` import):
```typescript
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/require';
import { getCurrentLang, t } from '@/lib/i18n';
import { getLatestGlobalParams, listGlobalParamsHistory } from '@/lib/db/queries';
import { CoefficientsEditor } from './CoefficientsEditor';
import { ExplainTool } from './ExplainTool';
import { HistoryTable } from './HistoryTable';
// ADD:
import { SeedBanner } from './SeedBanner';
import { seedParams } from '@/lib/calc/seed-params';
```

**`isStillSeed` computation** (D-10-14 — insert after `latestParams` fetch, before `return`):
```typescript
const isStillSeed =
  JSON.stringify(latestParams.coefficients) === JSON.stringify(seedParams.coefficients);
```

**JSX insertion point** (line 42 — `<div>` content, before `<h1>`):
```tsx
return (
  <div>
    <SeedBanner lang={lang} visible={isStillSeed} />
    <h1 ...>
```

**Remove TODO comment** in `src/lib/calc/seed-params.ts` line 40 (`// TODO: confirm against v10 baseline before CUT-06`).

---

### `app/(public)/login/LoginForm.tsx` → `src/components/LoginForm.tsx` (modify — add privacy link)

**File:** `/Users/antoinerousseau/Developer/leasetic-calculator/src/components/LoginForm.tsx`

**Privacy link insertion point** (line 226 — after the "forgot password" hint `<div>`, inside the `<form>`):
```tsx
{/* Privacy policy link — D-10-17; CUT-05 */}
<div style={{ fontSize: '10.5px', color: 'var(--muted)', lineHeight: 1.5, marginTop: 4 }}>
  <a
    href={process.env.NEXT_PUBLIC_PRIVACY_URL_FR ?? 'https://leasetic.fr/mentions-legales'}
    target="_blank"
    rel="noopener noreferrer"
    style={{ color: 'var(--muted)', textDecoration: 'underline' }}
  >
    {t('login.privacy.label', lang)}
  </a>
</div>
```

**i18n keys to add to `dictionaries.ts`** (following `auth.*` key pattern lines 240–270 approx):
```typescript
// Phase 10 — Privacy link on login page (D-10-17)
'login.privacy.label': 'Politique de confidentialité',
```
EN:
```typescript
'login.privacy.label': 'Privacy policy',
```

**Note:** `process.env.NEXT_PUBLIC_*` is safe in a `'use client'` component — Next.js inlines `NEXT_PUBLIC_` vars at build time into the client bundle. No need for a server component wrapper.

---

### `scripts/purge-soft-deleted.ts` (modify — thin wrapper after extract)

**File:** `/Users/antoinerousseau/Developer/leasetic-calculator/scripts/purge-soft-deleted.ts`

**After refactor:** The loop body (lines 107–148) is removed and replaced with a call to `purgeSoftDeleted()` from `src/lib/admin/purge.ts`. The CLI retains:
- JSDoc header (lines 1–29)
- `maskUrl` helper (lines 38–46)
- `getConfirmFlag()` (lines 48–53)
- Banner print (lines 59–65)
- Env guards (lines 68–75)
- `listPurgeCandidates()` call + count log (lines 77–83)
- Dry-run branch (lines 85–101)
- Apply mode: replace the `for` loop with `purgeSoftDeleted({ actorId: null })` call and summary print

**Replacement apply block:**
```typescript
  // Apply mode: delegate to shared pure function (D-10-07)
  const { purged, errors } = await purgeSoftDeleted({ actorId: null });
  // ... reuse banner print from lines 151–160 ...
  if (errors.length > 0) {
    process.exit(1);
  }
```

---

### `scripts/seed-partner-launch.ts` (modify — add email pattern guard)

**File:** `/Users/antoinerousseau/Developer/leasetic-calculator/scripts/seed-partner-launch.ts`

**Insertion point:** After `email = rawEmail.trim().toLowerCase()` (line 88), before the typed-confirmation gate (line 92). Add the `@test.leasetic.com` pattern guard per D-10-10:

```typescript
// D-10-10: seed-partner-launch.ts is only for @test.leasetic.com test accounts.
// Production partners come through the invitation flow (createInvitation).
const TEST_EMAIL_RE = /^.+@test\.leasetic\.com$/;
if (!TEST_EMAIL_RE.test(email)) {
  console.error('[seed-partner] REFUSE: email does not match @test.leasetic.com pattern.');
  console.error('[seed-partner] Production partners must come through the /invite/<token> flow.');
  console.error(`[seed-partner] Got: ${email}`);
  process.exit(2);
}
```

---

### `src/lib/db/queries/audit-log.ts` (modify — extend AuditAction union)

**File:** `/Users/antoinerousseau/Developer/leasetic-calculator/src/lib/db/queries/audit-log.ts`

**Current AuditAction union** (lines 8–22 — add `'user.purge'` after `'role.grant'`):
```typescript
export type AuditAction =
  | 'proposal.create'
  | 'proposal.create_failed'
  | 'proposal.delete'
  | 'proposal.restore'
  | 'proposal.purge'
  | 'proposal.duplicate'
  | 'global_params.update'
  | 'user.create'
  | 'user.disable'
  | 'user.re_enable'
  | 'invitation.create'
  | 'password_reset.create'
  | 'role.grant'
  // Phase 10 (D-10-11):
  | 'user.purge';   // pre-launch hard-delete of test accounts (@test.leasetic.com)
```

---

### `.github/workflows/ci.yml` (modify — add grep gate step)

**File:** `/Users/antoinerousseau/Developer/leasetic-calculator/.github/workflows/ci.yml`

**Insertion point** (line 50 — after existing grep gates, before the Vitest step):

Following the exact pattern of lines 44–48:
```yaml
      - name: Defense-in-depth grep -- no-v10-localstorage keys
        run: npm run check:no-v10-localstorage
```

Also add the npm script to `package.json` (not a separate file in scope, but the planner must note it):
```json
"check:no-v10-localstorage": "bash scripts/check-no-v10-localstorage.sh"
```

---

### `app/globals.css` (modify — add `.seed-banner` class)

**File:** `/Users/antoinerousseau/Developer/leasetic-calculator/app/globals.css`

**Insertion point:** After the existing utility classes block (after line ~240 in the v10 base classes section). Follow the same comment/token convention as lines 113–121:
```css
/* Seed-banner — Phase 10 CUT-06 (D-10-13) */
/* Yellow warning banner on coefficients page when still on placeholder values. */
.seed-banner {
  background: var(--gold);
  color: var(--navy);
  border-radius: 12px;
  padding: 12px 20px;
  font-size: 13.5px;
  font-weight: 500;
  margin-bottom: 16px;
  line-height: 1.5;
}
html[data-theme="dark"] .seed-banner {
  background: rgba(224, 133, 48, 0.18);
  color: var(--ink);
}
```

---

### `src/lib/i18n/dictionaries.ts` (modify — add Phase 10 keys)

**File:** `/Users/antoinerousseau/Developer/leasetic-calculator/src/lib/i18n/dictionaries.ts`

**Insertion point for FR keys** (after line 522 — end of Phase 9 admin accounts section, before the closing `},`):
```typescript
    // ── Phase 10 — Cutover & Polish (D-10-13, D-10-17) ──────────────────────────
    // Seed banner (1 key) + privacy link (1 key) = 2 keys × 2 langs
    'admin.seed_banner.message': "Les coefficients sont actuellement les valeurs par défaut. Vérifiez et confirmez avant d'inviter des partenaires.",
    'login.privacy.label': 'Politique de confidentialité',
```

**EN counterpart** (insert at the same relative position in the `en:` block, after the Phase 9 admin accounts EN keys):
```typescript
    'admin.seed_banner.message': 'Coefficients are currently default values. Verify and confirm before inviting partners.',
    'login.privacy.label': 'Privacy policy',
```

**Type-check note:** The `_EnHasAllFrKeys` compile-time check (referenced in dictionaries.ts line 14) will enforce that every FR key has an EN counterpart. Add both keys in both locales in the same commit to keep the build green.

---

## Shared Patterns

### Typed-confirmation gate
**Source:** `scripts/purge-soft-deleted.ts` lines 48–53 + `scripts/seed-admins-launch.ts` lines 79–84
**Apply to:** `scripts/purge-test-data.ts`, `scripts/smoke-ovh.ts` (env-required variant)
```typescript
function getConfirmFlag(): boolean {
  const env = process.env.CONFIRM === 'PURGE-TEST-DATA'; // swap string per script
  const argIdx = process.argv.indexOf('--confirm');
  const arg = argIdx >= 0 && process.argv[argIdx + 1] === 'PURGE-TEST-DATA';
  return env || arg;
}
```

### Admin-route auth gate (`requireAdmin`)
**Source:** `src/lib/auth/require.ts` lines 74–80 + `app/api/proposals/[id]/delete/route.ts` lines 10–18
**Apply to:** `app/api/internal/purge-soft-deleted/route.ts`
```typescript
// Pattern: try requireAdmin(); catch → 401. Internal route adds dual-gate with cron secret.
try {
  await requireAdmin();
} catch {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}
```

### `force-dynamic` + `runtime = 'nodejs'` on session-reading routes
**Source:** `app/api/proposals/[id]/delete/route.ts` lines 5–6 + `app/healthz/route.ts` lines 20–21
**Apply to:** `app/api/internal/purge-soft-deleted/route.ts`
```typescript
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

### `server-only` module guard
**Source:** `src/lib/auth/require.ts` line 26 + `src/lib/db/queries/audit-log.ts` line 1
**Apply to:** `src/lib/admin/purge.ts`
```typescript
import 'server-only';
```

### Lazy import in scripts (bypass `server-only` in Node CLI context)
**Source:** `scripts/seed-admins-launch.ts` lines 101–103 + `scripts/purge-soft-deleted.ts` JSDoc line 28
**Apply to:** `scripts/purge-test-data.ts`, `scripts/smoke-ovh.ts`
```typescript
// Lazy imports so env-var validation runs before db init.
// The _preload-mock-server-only.cjs handles the 'server-only' module constraint.
const { db } = await import('../src/lib/db/index');
const { schema } = await import('../src/db/schema');
```

### `writeAuditLog` fire-and-forget in route handlers
**Source:** `app/api/proposals/[id]/delete/route.ts` lines 28–40
**Apply to:** `app/api/internal/purge-soft-deleted/route.ts`
```typescript
try {
  await writeAuditLog({ ... });
} catch (err) {
  console.error('[POST /api/internal/purge-soft-deleted] audit log write failed', err);
}
```

### `maskUrl` helper (shared across all scripts)
**Source:** `scripts/purge-soft-deleted.ts` lines 38–46
**Apply to:** `scripts/purge-test-data.ts`, `scripts/smoke-ovh.ts` — copy verbatim.

### Bash CI grep-gate structure
**Source:** `scripts/check-no-vercel-only-imports.sh` lines 1–80
**Apply to:** `scripts/check-no-v10-localstorage.sh` — simplify (no special-case bare package; just fixed-string PATTERNS array).

### Inline style + `var(--*)` token convention
**Source:** `app/globals.css` lines 114–121 (`.card`), `src/components/LoginForm.tsx` lines 84–88
**Apply to:** `SeedBanner.tsx` (use inline styles or `.seed-banner` class from globals.css — prefer `.seed-banner` class to keep JSX clean), `app/globals.css` (add `.seed-banner`).

### i18n key grouping comment block
**Source:** `src/lib/i18n/dictionaries.ts` lines 403–410 (Phase 9 block comment):
```typescript
    // ── Phase N — Section Title (Plan NN-NN) ──────────────────────────────────────
    // N new keys × 2 langs per UI-SPEC.
```
**Apply to:** Phase 10 key block in `dictionaries.ts`.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `vercel.json` | config | N/A | No existing `vercel.json` in repo; Vercel Cron config is project-first |
| `docs/legal/privacy-coverage-confirmation.md` | doc/stub | N/A | No legal docs exist yet; new `docs/legal/` directory |

---

## Metadata

**Analog search scope:** `scripts/`, `app/`, `src/`, `docs/operations/`, `.github/workflows/`, `app/globals.css`, `src/lib/i18n/dictionaries.ts`, `.env.example`
**Files read:** 21
**Pattern extraction date:** 2026-05-10
