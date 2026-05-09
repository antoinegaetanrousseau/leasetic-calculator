---
phase: 08-persistence-pdf-pipeline
reviewed: 2026-05-09T14:00:00Z
depth: standard
files_reviewed: 55
files_reviewed_list:
  - src/db/schema.ts
  - src/lib/db/queries/proposals.ts
  - src/lib/db/queries/global-params.ts
  - src/lib/db/queries/audit-log.ts
  - src/lib/db/queries/index.ts
  - src/lib/db/queries/proposals.test.ts
  - src/lib/db/queries/global-params.test.ts
  - src/lib/i18n/dictionaries.ts
  - src/lib/i18n/dictionaries.test.ts
  - src/lib/pdf/styles.ts
  - src/lib/pdf/components/section-label.tsx
  - src/lib/pdf/components/key-value-row.tsx
  - src/lib/pdf/document.tsx
  - src/lib/pdf/render.ts
  - src/lib/pdf/index.ts
  - src/lib/pdf/document.test.tsx
  - src/lib/api/proposals/errors.ts
  - src/lib/api/proposals/submit.ts
  - src/lib/api/proposals/submit.test.ts
  - src/lib/api/proposals/list.ts
  - src/components/proposal/CopyRefButton.tsx
  - src/components/proposal/ProposalForm.tsx
  - src/components/proposals/DeleteButtonClient.tsx
  - src/components/proposals/DeleteJustToast.tsx
  - src/components/proposals/DeletedChip.tsx
  - src/components/proposals/DuplicatePrefillToast.tsx
  - src/components/proposals/EmbeddedPdfPreview.tsx
  - src/components/proposals/LanguageChip.tsx
  - src/components/proposals/LoadMoreButton.tsx
  - src/components/proposals/ProposalRow.tsx
  - src/components/proposals/ProposalsList.tsx
  - src/components/proposals/RecentlyDeletedToggle.tsx
  - src/components/proposals/RestoreButtonClient.tsx
  - src/components/proposals/SearchBar.tsx
  - src/components/proposals/ValidityChip.tsx
  - app/(authed)/page.tsx
  - app/(authed)/proposals/[id]/page.tsx
  - app/(authed)/proposals/new/page.tsx
  - app/api/proposals/route.ts
  - app/api/proposals/[id]/pdf/route.ts
  - app/api/proposals/[id]/delete/route.ts
  - app/api/proposals/[id]/restore/route.ts
  - app/api/proposals/route-list.test.ts
  - scripts/build-seed-sql.ts
  - scripts/update-pdf-fixture.ts
  - scripts/purge-soft-deleted.ts
  - scripts/seed-admins-launch.ts
  - scripts/_preload-mock-server-only.cjs
  - __pdf-fixtures__/fixtures.ts
  - __pdf-fixtures__/render-fixtures.test.ts
  - vitest.config.ts
  - eslint.config.mjs
  - .github/workflows/ci.yml
  - app/globals.css
  - docs/operations/purge.md
findings:
  critical: 2
  warning: 4
  info: 0
  total: 6
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-05-09T14:00:00Z
**Depth:** standard
**Files Reviewed:** 55
**Status:** issues_found

## Summary

Phase 8 ships the full proposals persistence pipeline: schema, DB queries, PDF
rendering, blob storage, and a complete UI (list, detail, delete, restore,
duplicate). The architecture is sound — the D-B1 fail-loud tombstone pattern,
idempotency via `(user_id, idempotency_key)` unique index, cursor-pagination,
and soft-delete window are all correctly implemented. The 7 documented
deviations are verified not flagged.

Two blockers were found: a type mismatch that makes the loyer amount and
coefficient permanently invisible on every detail page, and an unguarded
`writeAuditLog` call in the delete/restore routes that can produce a "failure"
response to the client after the state mutation has already succeeded. Four
warnings cover validation gaps, silent error swallowing, and a fragile label
extraction pattern.

---

## Critical Issues

### CR-01: Computed field type mismatch — loyer amount and coefficient never render on detail page

**File:** `app/(authed)/proposals/[id]/page.tsx:261` and `:305`

**Issue:** `buildComputedJson` in `submit.ts` stores `loyerHT` and `coeff` as
`string` values (e.g., `"1771.88"` and `"2.2500"`) because that is what
`computeLoyer` returns. The detail page then guards rendering with
`typeof computed.loyerHT === 'number'` (line 305) and
`typeof computed.coeff === 'number'` (line 261). Since the stored values are
strings, both guards are permanently `false`. The loyer amount card will always
display the "Sur demande" fallback, and the coefficient row will never appear,
for every `state: 'computed'` proposal.

The PDF document (`document.tsx` lines 244, 269) correctly uses string checks
(`computed.coeff &&` truthiness) and `Number(computed.coeff)` conversion, so
the PDF is unaffected. Only the server-rendered detail page is broken.

**Fix:**
```tsx
// app/(authed)/proposals/[id]/page.tsx — line 261
// Change:
{isComputed && typeof computed.coeff === 'number' && (
// To:
{isComputed && (typeof computed.coeff === 'string' || typeof computed.coeff === 'number') && computed.coeff && (

// Line 305 — Change:
{isComputed && typeof computed.loyerHT === 'number'
  ? formatCurrency(Number(computed.loyerHT), lang)
// To:
{isComputed && (typeof computed.loyerHT === 'string' || typeof computed.loyerHT === 'number') && computed.loyerHT
  ? formatCurrency(Number(computed.loyerHT), lang)
```

Or more concisely, since the stored value is always a string, remove the `number` branch entirely:
```tsx
{isComputed && typeof computed.coeff === 'string' && computed.coeff && (
  ...
)}

{isComputed && typeof computed.loyerHT === 'string' && computed.loyerHT
  ? formatCurrency(Number(computed.loyerHT), lang)
  : t('pdf.loyer.on.demand', lang)}
```

---

### CR-02: `writeAuditLog` unguarded in delete/restore routes — mutation succeeds but client receives 500

**File:** `app/api/proposals/[id]/delete/route.ts:28` and `app/api/proposals/[id]/restore/route.ts:28`

**Issue:** In both routes, `writeAuditLog` is called with no `try/catch` after
the state mutation (`softDeleteProposal` / `restoreProposal`) has already been
applied. If the audit log write fails (DB connectivity blip, connection pool
exhaustion, audit table full), the thrown error propagates as an unhandled 500
to the client — even though the delete/restore succeeded.

The client component (`DeleteButtonClient`, `RestoreButtonClient`) shows a
toast error and does NOT navigate away. The user believes the action failed and
may retry. On retry, `softDeleteProposal` returns `0` (already deleted) and
the route returns 404 (D-18 obscurity). From the user's perspective: "I got an
error when deleting, and now I can't find the proposal in the active list."
The proposal IS deleted, but the feedback loop is broken.

This also creates a timing window: the mutation succeeds but the confirmation
is a 500. Any client retry logic (future) would wrongly treat this as a failure.

**Fix:**
```ts
// app/api/proposals/[id]/delete/route.ts and restore/route.ts
// Wrap writeAuditLog in a try/catch that logs but does not propagate:
try {
  await writeAuditLog({
    actorId: userId,
    action: 'proposal.delete',
    targetType: 'proposal',
    targetId: id,
    payload: { source: 'partner-detail-page' },
  });
} catch (err) {
  // Audit write failure must not surface to the client — the mutation already
  // succeeded. Log server-side for ops visibility.
  console.error('[POST /api/proposals/[id]/delete] audit log write failed', err);
}

return NextResponse.json({ ok: true }, { status: 200 });
```

The same pattern should be applied in `restore/route.ts`.

---

## Warnings

### WR-01: `duplicatedFromId` from client body not UUID-validated before INSERT into `uuid` column

**File:** `src/lib/api/proposals/submit.ts:272-283`

**Issue:** `extractDuplicatedFromId` only verifies that `body.duplicatedFromId`
is a non-null `string`. It does not validate that the string is a valid UUID.
The value is then passed directly to `createProposal`, which inserts it into
the `proposals.duplicated_from_id` column typed as `uuid` in Postgres.

A client sending `duplicatedFromId: "not-a-uuid"` causes `createProposal` to
throw a Postgres cast error (`invalid input syntax for type uuid`). This
exception is thrown before the D-B1 `try` block (which starts at line 142
after the INSERT at line 129), so it is not caught by the tombstone handler.
It propagates to the route handler's catch which returns `unknown_error` 500
instead of the correct `invalid_body` 400.

The UX impact is that a malicious client can cause spurious 500s; the correct
response would be 400. No data loss occurs — the row is never created.

**Fix:**
```ts
function extractDuplicatedFromId(body: unknown): string | null {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (
    body !== null &&
    typeof body === 'object' &&
    'duplicatedFromId' in body &&
    typeof (body as { duplicatedFromId?: unknown }).duplicatedFromId === 'string'
  ) {
    const id = (body as { duplicatedFromId: string }).duplicatedFromId;
    return UUID_RE.test(id) ? id : null;  // silently drop malformed IDs
  }
  return null;
}
```

---

### WR-02: Malformed cursor values cause unhandled 500 from list endpoints

**File:** `src/lib/db/queries/proposals.ts:156-158` and `:211-213`

**Issue:** `decodeCursor` validates only that `createdAt` and `id` are strings
but does not validate that they are a valid ISO 8601 timestamp and a valid
UUID, respectively. Both values are interpolated into a Drizzle `sql` tag as
`::timestamptz` and `::uuid` cast targets. Even though Drizzle parameterizes
the values (preventing SQL injection), Postgres still evaluates the casts and
throws an error if the values are malformed.

A user who crafts a cursor like `{"createdAt":"bad","id":"bad"}` and passes it
to `GET /api/proposals?cursor=<encoded>` or triggers it via the Load More
button receives an unhandled 500 instead of the expected empty/reset behavior.
The `buildListResponse` call in both the SSR page and the API route has no
error handling around this path.

**Fix:**
```ts
export function decodeCursor(encoded: string): Cursor | null {
  const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (
      typeof parsed?.createdAt === 'string' &&
      typeof parsed?.id === 'string' &&
      ISO_RE.test(parsed.createdAt) &&
      UUID_RE.test(parsed.id)
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
```

---

### WR-03: `LoadMoreButton` silently swallows non-ok fetch responses — no user feedback

**File:** `src/components/proposals/LoadMoreButton.tsx:34-37`

**Issue:** When `fetch(/api/proposals)` returns a non-ok response (e.g., 401
after session expiry, 500, network timeout), the button resets `loading` to
`false` but gives the user no feedback — no toast, no error state, nothing.
The user sees the button revert from "Chargement..." to "Charger plus" with no
indication that anything went wrong. A user on a flaky connection or with an
expired session will click the button repeatedly without understanding why
additional rows never appear.

```ts
// Current:
if (res.ok) {
  const json = (await res.json()) as ListResponse;
  onAppend(json);
}
// Non-ok response is silently discarded.
```

**Fix:**
```ts
if (res.ok) {
  const json = (await res.json()) as ListResponse;
  onAppend(json);
} else {
  // Surface a toast so the user understands the load failed.
  // Import toast from 'sonner' (already used by sibling components).
  toast.error(t('proposal.toast.restore.error', lang)); // or add a dedicated list.error key
}
```

A catch block at the `try/finally` level already exists but only catches
network errors (thrown by `fetch`). The non-ok branch needs its own feedback
path.

---

### WR-04: `ValidityFooter` label extraction via `.split(' {')[0]` is coupled to i18n string wording

**File:** `app/(authed)/proposals/[id]/page.tsx:433`

**Issue:**
```ts
const expiresLabel = t(labelKey, lang).split(' {')[0];
```

This extracts the label part of the i18n string (e.g., `"Valid until"` from
`"Valid until {0}"`) by splitting on the literal substring `' {'`. This works
correctly for the current FR and EN strings but silently breaks if either
string is ever reworded in a way that places `{0}` at the start, removes the
space before `{`, or uses a different placeholder convention. There is no test
that exercises this extraction path.

The coupling is hard to detect: adding a new i18n key or tweaking wording
would break the displayed label without any compile-time or test-time warning.

**Fix:** Add a dedicated `Row` for the validity label that uses a fixed key
for the key-column text and a separate key for the date value, rather than
splitting the combined key. Alternatively, add two separate i18n keys:

```ts
// Instead of splitting 'proposal.detail.computed.expires.label' = "Valid until {0}",
// use separate keys:
// 'proposal.detail.computed.expires.key': 'Valid until'    (key column label)
// 'proposal.detail.computed.expires.value': '{0}'          (value column, caller substitutes)
```

At minimum, add a test that the split produces the expected label text for both
languages.

---

_Reviewed: 2026-05-09T14:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
