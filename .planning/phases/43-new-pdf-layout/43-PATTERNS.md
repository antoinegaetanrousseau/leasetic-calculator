# Phase 43: New PDF Layout - Pattern Map

**Mapped:** 2026-09-08
**Files analyzed:** 7 (from CONTEXT.md §"The code this phase touches" → "Written by this phase")
**Analogs found:** 7 / 7 (all analogs are files this phase itself rewrites — this is a
same-file rewrite phase, not a net-new-file phase; see note below)

**Note on scope:** every file this phase touches already exists — there are no wholly new
files to create. "Analog" below therefore means "the existing version of the same file,"
which is also the most reliable source of the project's conventions (font registration,
determinism discipline, i18n lookup, prop threading) that the rewrite must preserve. Two
areas — `<Svg>` primitives and Inter Tight — are flagged explicitly as **no analog exists**
because nothing in the current tree does them.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/pdf/document.tsx` | component (react-pdf render tree) | transform (props → PDF bytes) | itself (pre-rewrite version) | exact — same file, full rewrite |
| `src/lib/pdf/styles.ts` | config (style tokens) | transform | itself (pre-rewrite version) | exact |
| `src/lib/pdf/components/section-label.tsx` | component (primitive) | transform | itself + `key-value-row.tsx` (sibling primitive) | exact |
| `src/lib/pdf/components/key-value-row.tsx` | component (primitive) | transform | itself + `section-label.tsx` (sibling primitive) | exact |
| `src/lib/api/proposals/finalize-wizard.ts` | service (orchestrator) | request-response (props construction) | `src/lib/api/proposals/submit.ts` (twin call site) | exact — the two files are explicitly mirrored today |
| `src/lib/api/proposals/submit.ts` | service (orchestrator) | request-response (props construction) | `src/lib/api/proposals/finalize-wizard.ts` (twin call site) | exact |
| `src/lib/i18n/dictionaries.ts` | config (i18n maps) | CRUD (paired FR/EN key add) | itself — existing `pdf.*` block | exact |
| **new SVG logo primitives inside `document.tsx`** | component (`<Svg>` render) | transform | **none** | **no analog — greenfield** |
| **Inter Tight registration (if used for 21pt title)** | config (`Font.register`) | transform | `Font.register({ family: 'Inter', ... })` at `document.tsx:38-46` | role-match (same mechanism, new family) |

## Pattern Assignments

### `src/lib/pdf/document.tsx` (component, transform)

**Analog:** itself, pre-rewrite (`src/lib/pdf/document.tsx:1-329`)

**Imports pattern** (lines 1-8):
```tsx
import { Document, Page, Text, View, Font } from '@react-pdf/renderer';
import path from 'node:path';
import { t, type Lang } from '@/lib/i18n/dictionaries';
import { formatCurrency, formatDate, formatNumber } from '@/lib/i18n/format';
import { pdfColors, pdfFontSizes, pdfFontWeights, pdfPageMargins } from './styles';
import { sanitizePdfNumber } from './sanitize-number';
import { SectionLabel } from './components/section-label';
import { KeyValueRow } from './components/key-value-row';
```
D-07's `<Svg>`/`<Ellipse>`/`<Path>` primitives are additional named imports from
`@react-pdf/renderer` on the same line 1 — no new package, no new import path.

**Font registration — untouched machinery, extend if Inter Tight is committed** (lines 38-46):
```tsx
Font.register({
  family: 'Inter',
  fonts: [
    { src: path.join(FONT_DIR, 'Inter-400.ttf'), fontWeight: 400 },
    { src: path.join(FONT_DIR, 'Inter-500.ttf'), fontWeight: 500 },
    { src: path.join(FONT_DIR, 'Inter-600.ttf'), fontWeight: 600 },
    { src: path.join(FONT_DIR, 'Inter-700.ttf'), fontWeight: 700 },
  ],
});
```
If Inter Tight is committed for the 21pt title (Claude's Discretion, CONTEXT.md), it is a
**second** `Font.register({ family: 'Inter Tight', fonts: [...] })` call following this exact
shape — static TTFs under `public/fonts/`, one weight per file, same `path.join(FONT_DIR, ...)`
convention. Do not introduce a variable font (D-03 of Phase 41 rejected that for `fontkit`
subsetting reasons that apply equally here).

**Props interface — the D-12 growth point** (lines 57-89):
```tsx
export interface ProposalDocumentProps {
  data: {
    lcRef: string;
    language: Lang;
    createdAt: Date;
    inputs: {
      partnerCo: string;
      partnerName: string;
      clientCo: string;
      // ...existing optional fields...
      clientSiren?: string;
      // D-12 adds: clientSiret (already in inputs via Phase 42 — thread through)
      // D-12 adds: partnerTel (already in inputs via Phase 42 — thread through)
    };
    computed: { state: 'computed' | 'on-demand'; /* ...unchanged... */ };
    // D-12 adds a new top-level key, sibling to inputs/computed, NOT nested inside inputs:
    // partner: { companyTelephone: string | null };
    // advisor: { name: string | null; fonction: string | null; telephone: string | null; email: string | null };
  };
}
```
Keep the nesting shape flat and typed exactly like `inputs`/`computed` — `ProposalDocumentProps`
is the file's own interface, and TypeScript will surface both call sites (finalize-wizard.ts,
submit.ts) at compile time the moment a new required field is added. This is the project's
existing enforcement mechanism (see "Established Patterns" in CONTEXT.md's code_context) —
lean on it rather than adding a runtime check.

**Determinism discipline — apply to every new node** (lines 48-55, 100-110):
```tsx
/**
 * Determinism contract (PROP-17 / UI-SPEC §3.3.15):
 *   - No Date.now() — creation date comes from the proposal row
 *   - No Math.random() in the render tree
 *   - All hex colors as literals (styles.ts inlines them)
 *   - <Document creationDate, modificationDate, producer, creator> all set
 *     to constants so PDF metadata bytes stay stable
 */
```
```tsx
<Document
  title={`Proposition ${lcRef}`}
  author="Leasetic"
  subject="Financial lease proposal"
  keywords={`leasetic,proposal,${lcRef}`}
  creator="Leasetic Matrice v1.1"
  producer="Leasetic Matrice v1.1"
  creationDate={createdAt}
  modificationDate={createdAt}
>
```
No new node in the card/hero/table/acceptance rewrite may call `Date.now()`, `Math.random()`,
or read a CSS variable — every color is a hex literal from `pdfColors` (D-11 extends this
object; it does not change how it is consumed).

**Absence handling — the pattern D-13/DOC-11 generalizes** (lines 231-236, today's only
existing conditional-render-by-absence):
```tsx
{computed.state === 'on-demand' || !computed.loyerHT ? (
  <Text style={{ ... }}>{t('pdf.loyer.on.demand', lang)}</Text>
) : (
  <Text style={{ ... }}>{sanitizePdfNumber(formatCurrency(Number(computed.loyerHT), lang))}</Text>
)}
```
This is the one place today's tree already branches on "value absent, render a fallback
string instead of the computed one." The new em-dash helper (Claude's Discretion — a single
formatter every optional field passes through) generalizes this exact shape: `value ?? '—'`
wrapped once, called at every advisor-column, `companyTelephone`, `Coefficient appliqué`, and
`Total des loyers HT` slot per D-09/D-13. Do not hand-write the ternary per field — that is
the "geometry guarantee decays when re-implemented per field" risk CONTEXT.md calls out.

**i18n lookup + string interpolation pattern** (lines 145, 251, 289-291, 312-314):
```tsx
{t('pdf.ref.label', lang)} {lcRef}
...
{t('pdf.loyer.subtext', lang).replace('{0}', String(inputs.durationMonths))}
...
{t('pdf.validity.caption', lang)
  .replace('{0}', formatDate(expiresAt, lang))
  .replace('{1}', String(inputs.validityDays))}
```
`t(key, lang)` + `.replace('{0}', ...)` positional templating is the established
interpolation convention for every new `pdf.*` label with a dynamic slot (partner name,
advisor fonction, table values). No new templating mechanism is needed.

**Number/currency/date formatting pattern** (lines 200, 209, 243, 250-251):
```tsx
sanitizePdfNumber(formatCurrency(Number(inputs.amountHT), lang))
sanitizePdfNumber(formatNumber(Number(computed.coeff), lang, { minimumFractionDigits: 4, maximumFractionDigits: 4 }))
formatDate(createdAt, lang)
```
Every numeric/date slot in the new financial table and hero routes through
`formatCurrency` / `formatNumber` / `formatDate` (`src/lib/i18n/format.ts`) wrapped in
`sanitizePdfNumber` (`src/lib/pdf/sanitize-number.ts`) — CONTEXT.md's "Reusable Assets"
section confirms this is unchanged by the redesign; there are more numeric slots, not
different ones.

**Bottom-pinned footer — the two candidate mechanisms** (lines 294-325, today's
`position: 'absolute'` implementation):
```tsx
<View style={{
  position: 'absolute',
  bottom: pdfPageMargins.bottom,
  left: pdfPageMargins.horizontal,
  right: pdfPageMargins.horizontal,
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingTop: 8,
  borderTopWidth: 1,
  borderTopColor: pdfColors.border,
}}>
  <Text style={{ fontSize: pdfFontSizes.footer, ... }}>{t('pdf.footer.left', lang)...}</Text>
  <Text
    style={{ fontSize: pdfFontSizes.footer, ... }}
    render={({ pageNumber }: { pageNumber: number }) => `Page ${pageNumber}`}
    fixed
  />
</View>
```
This is today's mechanism for the legal footer, which stays. It is a candidate for the new
acceptance block too (CONTEXT.md's Claude's Discretion notes the design instead uses
`margin-top:auto` inside a flex column, which Yoga also supports) — either satisfies DOC-07;
the `render={({ pageNumber }) => ...}` + `fixed` pattern for the page-number text specifically
must be preserved verbatim wherever page numbering appears, since it is react-pdf's own
per-page callback mechanism, not a project convention that can be reimplemented differently.

**Deleted-in-place blocks (do not port forward):**
- Interests block, lines 255-279 (D-05) — the `(inputs.slb || inputs.evalParc) &&` conditional
  render and its `SectionLabel` + two `✓`-prefixed `Text` nodes.
- Tagline `Text`, line 133-138, and `PROJET` `SectionLabel` at line 170 (D-06).
- `LEASETIC` text node, line 128-132 (D-07 — replaced by the `<Svg>` lockup).

---

### `src/lib/pdf/styles.ts` (config, transform)

**Analog:** itself, pre-rewrite (`src/lib/pdf/styles.ts:1-45`)

**Full current shape** (lines 11-44):
```ts
export const pdfColors = {
  ink: '#1a2832',
  muted: '#6e7191',
  navy: '#112c3b',
  border: '#d9dbe9',
  green: '#129657',       // D-08: loses its only consumer — drop
  greenTint: '#f0f9f4',   // D-08: loses its only consumer — drop
  surface: '#ffffff',
} as const;

export const pdfFontSizes = {
  footer: 8,
  caption: 9,
  body: 10,
  title: 22,
  loyer: 32,
} as const;

export const pdfFontWeights = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const pdfPageMargins = {
  top: 48,
  bottom: 32,
  horizontal: 56,
} as const;
```
The three `as const` object-literal exports (`pdfColors`, `pdfFontSizes`, `pdfPageMargins`)
are the pattern to extend, not replace structurally: D-11's larger palette and D-10's
ten-step scale both slot into this same three-object shape. `pdfFontWeights` is untouched by
this phase (no new weights named in D-10/D-11).

For `pdfFontSizes`, CONTEXT.md's Claude's Discretion favors role names
(`eyebrow`, `kvRow`, `cardHeadline`, `hero`, ...) over numeric keys — follow today's
convention of a role name mapped to a raw pt number (`footer: 8`, `caption: 9`, ...), just
with ten entries instead of five, e.g.:
```ts
export const pdfFontSizes = {
  legalFooter: 6.8,
  eyebrow: 7.5,
  pill: 8,
  cardKv: 8.5,
  heroCaption: 9,
  pageBase: 9.5,
  projectDesc: 10,
  cardHeadline: 11,
  propositionNo: 13,
  h1: 21,
} as const;
```
`pdfPageMargins` moves from `{ top: 48, bottom: 32, horizontal: 56 }` (pt) to the design's
`14mm 15mm 10mm` — convert mm→pt (1mm ≈ 2.8346pt) and keep the same three-key shape; do not
add a fourth key for a differing left/right, since D-11 states horizontal is uniform (15mm
both sides).

---

### `src/lib/pdf/components/section-label.tsx` and `key-value-row.tsx` (component primitives, transform)

**Analog:** each other + `document.tsx`'s consumption sites (lines 170, 198-211)

**Full current shape of both files:**
```tsx
// section-label.tsx
export interface SectionLabelProps { children: string; }
export function SectionLabel({ children }: SectionLabelProps) {
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={{
        fontSize: pdfFontSizes.caption,
        fontWeight: pdfFontWeights.bold,
        color: pdfColors.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.06,
      }}>{children}</Text>
    </View>
  );
}

// key-value-row.tsx
export interface KeyValueRowProps { keyText: string; valueText: string; }
export function KeyValueRow({ keyText, valueText }: KeyValueRowProps) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: 4 }}>
      <Text style={{ width: 80, fontSize: pdfFontSizes.body, fontWeight: pdfFontWeights.medium, color: pdfColors.muted }}>{keyText}</Text>
      <Text style={{ flex: 1, fontSize: pdfFontSizes.body, fontWeight: pdfFontWeights.medium, color: pdfColors.ink }}>{valueText}</Text>
    </View>
  );
}
```
Both are tiny — a typed props interface, a named export function, a `View`/`Text`
composition reading from `pdfColors`/`pdfFontSizes`/`pdfFontWeights` in `../styles`. Any
surviving or new primitive (a `Pill`, a `Card`, a `FinancialTableRow`) should follow this
exact shape: named interface + named function + inline style object pulling from the three
style-token exports, one component per file, imported into `document.tsx` by name. Per
CONTEXT.md's Claude's Discretion, `KeyValueRow`'s 80pt-fixed/flex-1 geometry is tuned for the
old computation card and "may or may not survive" — if the card grid and financial table
need different key/value geometries, prefer two small primitives over one primitive with
conditional props, matching today's one-component-per-file granularity.

---

### `src/lib/api/proposals/finalize-wizard.ts` and `submit.ts` (service, request-response) — the two D-12 call sites

**Analog:** each other — the file header at `finalize-wizard.ts:5-10` states it is "modelled
on `src/lib/api/proposals/submit.ts:60-120`" and the two `buildPdfComputed` helpers
(`finalize-wizard.ts:107-134`, `submit.ts:248-270`) are already byte-for-byte structural twins.

**The construction site to extend, `finalize-wizard.ts:219-227`:**
```ts
// D-16 step 4 — render the PDF.
const pdfData: ProposalDocumentProps['data'] = {
  lcRef,
  language: args.language,
  createdAt: draft.createdAt,
  inputs: parsed,
  computed: buildPdfComputed(compute.computed),
};
const { buffer, sha256, sizeBytes } = await renderProposalPdf({ data: pdfData });
```

**The twin construction site, `submit.ts:146-154`:**
```ts
const { buffer, sha256, sizeBytes } = await renderProposalPdf({
  data: {
    lcRef: row.lcRef!,
    language: row.language as 'fr' | 'en',
    createdAt: row.createdAt,
    inputs: input,
    computed: pdfComputed,
  },
});
```
D-12 requires both literal object constructions to grow by the same two keys — a `partner`
key (from `companyTelephone`, the value already resolvable the same way `partnerType` and
`telephone` reach `finalize-wizard.ts` today: opaque args threading, not a new DB read in
that file) and an `advisor` key from `getAdvisor()`. Concretely, in `finalize-wizard.ts` add
one `await getAdvisor()` call before step 4 (D-16's step numbering shifts by one, or the read
lands as "step 3.5" — call it out in the plan) and thread the result straight into `pdfData`;
in `submit.ts`, add the same `await getAdvisor()` call in the equivalent position before its
`renderProposalPdf` call. **Missing `submit.ts` is explicitly flagged in CONTEXT.md as "the
likeliest silent gap in this phase"** — verify both sites in the same diff.

**The opaque-threading precedent to mirror for `companyTelephone` (grep-isolation, ADMIN-09
is not implicated here but the *shape* of "thread a value the caller already has, do not add
a redundant read" is)** — `finalize-wizard.ts:60-70`:
```ts
/** PTYPE-06: the proposal author's partner type (read from session by the
 *  route handler). Passed opaquely to finalize-helpers.ts which owns the
 *  branching logic and parameter naming (grep-isolation barrier D-28). */
partnerType: 'Agent' | 'Commercial' | 'Partenaire';
/** Phase 42 D-17: the proposal author's partner telephone (read from the
 *  session by the route handler, mirroring `partnerType` above), threaded
 *  opaquely. This function has zero direct `users` reads today — it touches
 *  only `proposals` and `global_params` — so arg-threading (not a new DB
 *  read here) is this file's established precedent. */
telephone: string | null;
```
`companyTelephone` is a *different* column on the same `users` row `telephone` already comes
from (`src/db/schema.ts:76`, `partnerTel`/`telephone` at :81) — decide in the plan whether the
route handler threads it as a third opaque arg (mirroring `telephone`) or whether
`finalize-wizard.ts`/`submit.ts` read it directly since neither currently touches `users` at
all. Either is consistent with a pattern already in this file; arg-threading is the lower-risk
match to what is here today.

**Bounded-error-throw pattern, to extend if the advisor read needs a guard (it does not —
see below):** `finalize-wizard.ts:150-154, 189-191, 198-200`:
```ts
const draft = await getDraftById(args.draftId, args.userId);
if (!draft) { throw new Error('DraftNotFound'); }
...
if (!args.telephone) { throw new Error('MissingPartnerTelephone'); }
...
if (!draft.lcRef) { throw new Error('FinalizeFailed'); }
```
D-13 is explicit that `getAdvisor()` returning `null` must **never** throw and must **never**
block finalization — so, unlike every other guard in this file, the advisor read gets **no**
`if (!advisor) throw` counterpart. This is a deliberate asymmetry from the file's own
established pattern, worth a one-line comment at the call site (`// D-13: null advisor is
valid — do not add a bounded-error guard here`) so a future reader does not "fix" it into
matching the surrounding six guards.

---

### `src/lib/db/queries/advisor.ts` — read-only call target (not modified, but its contract shapes the two call sites above)

**Analog / contract to rely on** (lines 43-49):
```ts
export async function getAdvisor(): Promise<LeaseticAdvisorRow | null> {
  const dbi = db();
  const row = await dbi.query.leaseticAdvisor.findFirst({
    where: eq(schema.leaseticAdvisor.id, ADVISOR_ROW_ID),
  });
  return row ?? null;
}
```
Already returns `null` rather than throwing on a missing seed row (D-13's exact requirement).
Call it plainly — `const advisor = await getAdvisor();` — with no try/catch wrapper; adding
one would be redundant defensive code the function's own contract already makes unnecessary.

---

### `src/lib/i18n/dictionaries.ts` (config, CRUD — paired key add)

**Analog:** the existing `pdf.*` block itself, FR at lines 472-491, EN at lines 1787-1806.

**The paired-key convention** (FR side, lines 472-484 excerpted):
```ts
'pdf.tagline': 'Location financière IT',
'pdf.title': 'Proposition de location financière',
'pdf.ref.label': 'N°',
'pdf.section.project': 'PROJET',
'pdf.project.placeholder': 'Projet non précisé',
'pdf.project.ref.prefix': 'Réf. partenaire :',
'pdf.loyer.label': 'LOYER MENSUEL HT',
'pdf.loyer.subtext': 'sur {0} mois',
'pdf.loyer.on.demand': 'Sur demande',
'pdf.validity.caption': "Proposition valable jusqu’au {0} ({1} jours), ...",
'pdf.footer.left': 'N° {0} · Créée le {1}',
```
matched line-for-line at the EN block (lines 1787-1799) with the same keys and `{0}`/`{1}`
placeholders. Every new `pdf.*` key this phase adds (card labels, table rows,
acceptance-block labels, the full FR/EN conditions paragraph) follows this same flat
`'pdf.<dotted.path>': '<string>'` shape, added once per language block at the position
matching the design's document order (D-01's "mirror their intent" applies to key ordering
too — group new keys by the card/section they belong to, as the existing block already does
implicitly by name prefix).

**Curly-brace typographic quotes and narrow-no-break-space are literal, not a template
helper** — note `’` (’) and ` ` (narrow NBSP) appear as raw escape sequences inside
the FR strings above. Preserve this convention for any new FR string with a possessive
apostrophe or a French number/colon spacing convention; do not substitute a plain ASCII `'`
or space.

**The D-02/D-03/D-06 orphan disposition — two options, both already precedented in this same
file (lines 489-491, 1804-1806):**
```ts
'pdf.partnerType.Agent': 'Agent',
'pdf.partnerType.Commercial': 'Commercial',       // FR
'pdf.partnerType.Partenaire': 'Partenaire',
```
```ts
'pdf.partnerType.Agent': 'Agent',
'pdf.partnerType.Commercial': 'Sales Representative',   // EN
'pdf.partnerType.Partenaire': 'Partner',
```
D-02 orphans these three pairs (no PDF consumer under the new card layout) and D-06 orphans
`pdf.tagline` / `pdf.section.project`. CONTEXT.md's Claude's Discretion leaves delete-vs-annotate
open; if annotating, the comment shape to match is a one-line `//` immediately above the key
block naming the deciding-decision (e.g. `// D-02: orphaned — no PDF consumer under the new
card layout; kept for the D-03 test below`), consistent with how every other decision-driven
comment in this file cites its `D-NN`.

**The pinning test to update in lockstep** — `src/lib/i18n/dictionaries.test.ts:189, 192,
620-625`:
```ts
'pdf.tagline',
...
'pdf.section.project',
...
it('pdf.partnerType.* carries the PDF-only FR/EN label pairs (D-16)', () => {
  expect(en['pdf.partnerType.Commercial']).toBe('Sales Representative');
  expect(fr['pdf.partnerType.Agent']).toBe('Agent');
  expect(en['pdf.partnerType.Agent']).toBe('Agent');
  expect(fr['pdf.partnerType.Partenaire']).toBe('Partenaire');
  expect(en['pdf.partnerType.Partenaire']).toBe('Partner');
```
If the orphaned keys are deleted, this test (and the two bare-key-list entries at lines 189
and 192) must be deleted in the same change or the suite fails on a missing key; if annotated
and kept, this test stays green untouched but should gain the same `D-02`/`D-06` comment.

---

## Shared Patterns

### Determinism discipline
**Source:** `src/lib/pdf/document.tsx:48-55, 100-110`; contract documented in
`src/lib/pdf/render.ts:16-34`
**Apply to:** `document.tsx`, `styles.ts`, both new i18n key batches
No `Date.now()`, no `Math.random()`, hex color literals only, constant `<Document>` metadata.
The regression gate is `contentHash` (sorted, inflated-stream hash), never raw `sha256` —
`render.ts:16-22` documents why raw `sha256` varies per render (React Fiber scheduler object
ordering). Do not write or suggest a test asserting raw `sha256` equality across two renders.

### i18n lookup + templating
**Source:** `src/lib/pdf/document.tsx` throughout (e.g. lines 145, 251, 289-291)
**Apply to:** every new label/value node in the card, hero, table and acceptance block
`t(key, lang)` for static labels; `.replace('{0}', ...)` / `.replace('{1}', ...)` positional
interpolation for dynamic values. No new templating library.

### Number/date formatting
**Source:** `src/lib/i18n/format.ts` (`formatCurrency`, `formatNumber`, `formatDate`),
consumed at `document.tsx:200, 209, 243, 250-251` via `sanitizePdfNumber`
**Apply to:** every currency/percentage/date cell in the new financial table and hero
Wrap every numeric render in `sanitizePdfNumber(formatCurrency(...) | formatNumber(...))`;
dates through `formatDate(date, lang)` directly (no sanitize wrapper needed there).

### Em-dash-for-absence (DOC-11)
**Source:** the existing on-demand branch, `document.tsx:231-236` — the only current
absence-branching precedent
**Apply to:** advisor card (any null column, D-13), `companyTelephone` (nullable, D-13
inherited from Phase 42), `Coefficient appliqué` / `Total des loyers HT` when
`computed.state === 'on-demand'` (D-09)
Recommendation (Claude's Discretion, strongly preferred per CONTEXT.md): one small helper,
e.g. `emDash(value: string | null | undefined): string { return value?.trim() ? value : '—'; }`,
called at every optional-field render site rather than a ternary re-implemented per field.

### Typed props interface enforces both call sites
**Source:** `ProposalDocumentProps` (`document.tsx:57-89`) consumed at
`finalize-wizard.ts:220-226` and `submit.ts:146-154`
**Apply to:** D-12's growth of the `data` shape
Grow the interface first; let `tsc` surface both call sites as compile errors until each is
updated. This is the file's own established enforcement mechanism (see CONTEXT.md
"Established Patterns") — do not add a runtime shape check as a substitute.

### Fixture regeneration after a layout/font change
**Source:** `scripts/update-pdf-fixture.ts`, `__pdf-fixtures__/fixtures.ts`,
`__pdf-fixtures__/render-fixtures.test.ts`, `__pdf-fixtures__/commission-free-fixture.test.ts`
**Apply to:** the blocking D-16 step after the layout lands
`npm run pdf:update-fixture` dry-runs by default (prints the diff, exits 1); only
`-- --confirm UPDATE-FIXTURE` writes `expected.sha256.txt`. `fixtures.ts`'s three fixtures
(`happy-path-fr`, `happy-path-en`, `agent-commission-free`) are frozen `Omit<...,'language'>`
objects with no `Date.now`/`Math.random` — if D-12 makes `advisor`/`partner.companyTelephone`
required-shaped fields on `ProposalDocumentProps['data']`, these three fixture objects must
gain frozen literal values for them (e.g. a fixed advisor name/fonction/telephone/email, and
a fixed `companyTelephone` string) in the same change that lands the interface growth, or the
fixture file fails to typecheck before any render even runs. This is Phase 41's identical
precedent (font swap forced the same regeneration step) — same script, same two test files,
same blocking discipline.

### ADMIN-09 grep isolation
**Source:** `finalize-wizard.ts:26-36` (module header), `tests/admin-09-grep-contracts.test.ts`,
`src/lib/pdf/no-commission.test.ts`
**Apply to:** any new identifier introduced by the advisor/partner threading
`finalize-wizard.ts` never names the commission parameter in its own source — the branching
logic lives in the sibling `finalize-helpers.ts`. The new `advisor`/`companyTelephone`
threading must not introduce any commission-adjacent identifier (`commission`, `commissionPct`,
`_pct`) into `document.tsx`, `finalize-wizard.ts`, or `submit.ts`. Neither `getAdvisor()` nor
`leaseticAdvisor`'s four columns (`name`, `fonction`, `telephone`, `email`) are
commission-adjacent, so this is a "stay clear of" constraint rather than a pattern to apply,
but it governs any helper naming choice made while wiring D-12.

## No Analog Found

| File / concern | Role | Data Flow | Reason |
|---|---|---|---|
| `<Svg>`/`<Ellipse>`/`<Path>` primitives (D-07 logo port) | component | transform | **Confirmed by search: zero `<Svg>` or `<Image>` usage anywhere in `src/lib/pdf/`.** `document.tsx`, `render.ts`, `section-label.tsx`, and `key-value-row.tsx` are the entire `@react-pdf/renderer`-importing surface, and none imports `Svg`, `Ellipse`, `Path`, or `Image`. This is greenfield — the planner should treat D-07's own guidance (inspect the rendered output before other layout work depends on the header's height; pre-apply the `rotate(-90 ...)` transform by swapping `rx`/`ry` at authoring time if react-pdf's partial SVG support drops it) as the only available "pattern," sourced from the CONTEXT.md decision itself rather than from any existing file. The two source SVGs were read directly for this map: `leasetic-icon-color.svg` is exactly four `<ellipse>` elements (two plain, two with `transform="rotate(-90 cx cy)"`), and `leasetic-lockup-color.svg` is the same four ellipses plus one `<path>` wordmark — confirming CONTEXT.md's description precisely. |
| Inter Tight registration | config | transform | No second `Font.register` call exists anywhere in the tree today — Inter is the only registered family. If committed, the only analog is the existing single-family `Font.register` block (`document.tsx:38-46`), used as a structural template with a new family name and new static TTF paths, not copied from a second precedent. |
| Financial table (flex-row port of an HTML `<table>`) | component | transform | react-pdf has no table primitive; nothing in `document.tsx` today builds a multi-column tabular layout — `KeyValueRow` is a two-column label/value row, not a table. The closest structural precedent is `KeyValueRow` itself (fixed-width label column + flex-1 value column), scaled to the design's 42/58 `colgroup` via `flexBasis`, per CONTEXT.md's own Claude's Discretion note. |

## Metadata

**Analog search scope:** `src/lib/pdf/`, `src/lib/api/proposals/`, `src/lib/db/queries/`,
`src/lib/i18n/`, `src/db/schema.ts`, `src/lib/calc/schema.ts`, `__pdf-fixtures__/`, `scripts/`,
`tests/admin-09-grep-contracts.test.ts`, `.planning/assets/v1.9-quote-design/svg/`.
**Files scanned:** 20 (7 written-by-this-phase files read in full + 13 supporting/reference
files: `finalize-wizard.ts`, `submit.ts`, `advisor.ts`, `render.ts`, `schema.ts` §65-84 and
§185-229, `calc/schema.ts` §175-229, `dictionaries.ts` grep + `dictionaries.test.ts` grep,
`update-pdf-fixture.ts`, `fixtures.ts`, `render-fixtures.test.ts`,
`commission-free-fixture.test.ts` (head), `no-commission.test.ts` (head),
`admin-09-grep-contracts.test.ts` (grep), both source SVGs).
**Pattern extraction date:** 2026-09-08
