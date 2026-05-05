---
phase: 02-security-hardening
plan: 02
type: execute
wave: 2
depends_on:
  - "02-01"
files_modified:
  - Matrice_2026_THE_Leasetic-v10.html
  - .planning/phases/02-security-hardening/SEC-TEST.md
autonomous: true
requirements:
  - SEC-03
  - SEC-04
  - TEST-02
must_haves:
  truths:
    - "A partner pastes a script-tag payload into any client field (destinataire, societe, projet, notes, partner ref, SIREN, phone, email, partner-co, partner-name). Clicks Generer. The generated proposal renders the literal text. Zero alerts fire, zero script executes."
    - "A partner pastes an img-tag-with-onerror payload into client-co. Clicks Generer. The proposal shows the literal text, no img node is inserted, no onerror fires."
    - "A partner types `Dupont & Co <DSI>` in client-name. The proposal shows `Dupont & Co <DSI>` rendered correctly (the angle-bracketed token reads as literal characters, the ampersand is not double-escaped)."
    - "The v10 header title (updateHdrTitle) safely interpolates partner-co without allowing markup injection via the partner name."
    - "Every HTML-writing DOM assignment in the script block is either (a) using only static/author-controlled content, (b) using only number-formatted output from fmt()/toFixed(), or (c) escaping every user-sourced interpolation via escapeHtml(). The audit table in SEC-TEST.md justifies every site."
    - "No regression on Phase 1 parity: assertCalc 6/6, calcRent unchanged, all tabs still render, PDF still 2 pages."
  artifacts:
    - path: "Matrice_2026_THE_Leasetic-v10.html"
      provides: "escapeHtml() helper in UTILS, every user-sourced interpolation in PROPOSAL/INIT wrapped in escapeHtml or switched to textContent"
      contains: "function escapeHtml"
    - path: ".planning/phases/02-security-hardening/SEC-TEST.md"
      provides: "Manual XSS + password-flow test checklist (TEST-02)"
      contains: "SEC-01, SEC-02, SEC-03, SEC-04, SEC-05 sections"
  key_links:
    - from: "renderResult() / p1p2() / p3() / updateHdrTitle() — every user-field interpolation"
      to: "escapeHtml(value)"
      via: "template literal interpolation wrapped in the helper"
      pattern: "escapeHtml\\(d\\.|escapeHtml\\(pco\\)"
    - from: "SEC-TEST.md manual checklist"
      to: "5 XSS fixture payloads from 02-CONTEXT.md"
      via: "one checklist row per payload with field, expected render, and pass/fail box"
      pattern: "SEC-03"
---

<objective>
Eliminate markup-injection vectors in v10's proposal rendering by (a) adding a single `escapeHtml()` helper in UTILS, (b) auditing every HTML-writing DOM assignment in the script block and wrapping every user-sourced interpolation, (c) producing a manual test checklist (SEC-TEST.md) that Antoine runs in Chrome to verify SEC-01..05.

Purpose: Close SEC-03, SEC-04, TEST-02. Hostile or accidentally-malformed client data (script-like tokens, event-handler-like attributes, ampersands) must render as literal text, never execute, never break surrounding markup.

Output: `Matrice_2026_THE_Leasetic-v10.html` with escapeHtml() in UTILS and every user-sourced HTML interpolation wrapped; `.planning/phases/02-security-hardening/SEC-TEST.md` manual checklist covering all 7 Phase-2 requirements with 5 payload fixtures.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/02-security-hardening/02-CONTEXT.md
@.planning/phases/02-security-hardening/01-password-hashing-PLAN.md
@Matrice_2026_THE_Leasetic-v10.html

<interfaces>
<!-- The complete set of HTML-writing DOM assignments in v10's script block. Line numbers from the post-Phase-1 file. Every site must be classified in task 2's audit table. -->

User-source fields defined in `generate()` (line ~749):
- `pco` (partner-co), `pnm` (partner-name), `cco` (client-co), `cnm` (client-name), `crole` (client-role), `ctel` (client-tel), `cemail` (client-email), `csiren` (client-siren), `projdesc` (project-desc), `partnerref` (partner-ref).
These flow into `data = {...}` as `d.pco, d.pnm, d.cco, d.cnm, d.crole, d.ctel, d.cemail, d.csiren, d.projdesc, d.partnerref` — USER SOURCED, all must be escaped.

Also: `d.a` (numeric, safe after fmt()), `d.dur` (numeric literal, safe), `d.monthly` (numeric, safe after fmt()), `d.coeff` (numeric, safe after toFixed()), `d.ds` (server-generated date string, safe — from toLocaleDateString), `d.ref` (`LC-` + random digits, safe), `d.fn` (sanitized filename, safe — already passes through `.replace(/[^a-zA-Z0-9]/g,'_')`), `d.slb`/`d.evl` (internal enum 'oui'/'non', safe), `d.key` (internal tranche key 't1'..'t4', safe), `d.onDemand` (boolean).

All current HTML-writing assignment sites (by line, from Phase-1 audit + fresh grep):

- line 626 — updateInline nores block (STATIC)
- line 630 — updateInline "Coefficients non valides" (STATIC)
- line 634 — updateInline inline loyer display (NUMERIC, fmt output)
- line 643 — updateInline "Coefficients manquants pour cette tranche" (STATIC)
- line 646 — updateInline "Sur demande" (STATIC)
- line 668 — checkExp "Coefficients non configures" (STATIC)
- line 673 — checkExp expired banner with qLabel/curQ (INTERNAL — qLabel/curQ are code-generated strings, not user input)
- line 679 — checkExp days-left warn banner (NUMERIC — daysLeft integer)
- line 794 — renderResult res-main loyer tile (NUMERIC — fmt()/toFixed())
- line 798 — same renderResult block, continues with `${d.dur}`, `${d.coeff.toFixed(4)}`, `${tLabel(d.key)}` (NUMERIC + INTERNAL)
- line 800 — renderResult res-detail (USER SOURCED — every d.* user field must be escaped)
- line 816 — renderProposal delegates to p1p2() + p3() (escaping happens inside those functions)
- line 821 — p1p2 `siren` local var (USER SOURCED — d.csiren)
- line 824 — p1p2 `contact` local var (USER SOURCED — d.ctel, d.cemail)
- lines 832-896 — p1p2 main return block (USER SOURCED for every d.* user field; safe for fmt(d.a), fmt(d.monthly), d.dur, d.ref, d.ds, LOGO_SRC, expiryDate(d.ds), static "Pourquoi choisir Leasetic" tiles, conditions text)
- lines 899-906 — p3 page 2/2 footer (USER SOURCED — d.pco, d.pnm; safe for DECK3_SRC)
- line 1046 — btn-dl `allCss += styleTags[i].innerHTML` (READ-ONLY, safe)
- line 1055 — btn-dl reads `$('printable').innerHTML` and emits into Blob (READ-ONLY, safe)
- line 1072 — reset inline-res empty state (STATIC)
- line 1074 — reset res-main empty state (STATIC)
- line 1075 — reset res-detail empty string (EMPTY)
- line 1076 — reset prop-content empty state (STATIC)
- line 1094 — updateHdrTitle partner-co interpolation (USER SOURCED — pco)
- line 1095 — updateHdrTitle else-branch (already uses textContent — already safe)

Summary count: ~23 assignment sites, of which 6 carry user-sourced data (res-detail, p1p2 siren, p1p2 contact, p1p2 main, p3, updateHdrTitle). The rest are static, numeric-formatted, read-only, or internal.
</interfaces>

<audit_contract>
Task 2 produces THE authoritative audit table as part of the SEC-TEST.md deliverable. Every site above must appear in the table with:
- line number (pre-edit)
- classification: STATIC / NUMERIC / INTERNAL / USER / READ / EMPTY
- action taken: NONE / ESCAPE / TEXTCONTENT
- justification (one short phrase)

Before declaring the plan done, the executor must re-run the grep for `.innerHTML\s*=` and confirm the count matches the table — no stowaway sites.
</audit_contract>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Add escapeHtml() helper and wrap every user-sourced interpolation</name>
  <files>Matrice_2026_THE_Leasetic-v10.html</files>
  <behavior>
    - escapeHtml(script-tag-payload) returns the entity-escaped equivalent (literal, character-for-character).
    - escapeHtml('Dupont & Co <DSI>') returns 'Dupont &amp; Co &lt;DSI&gt;' — ampersand escaped FIRST (so subsequent less-than does not get double-escaped).
    - escapeHtml with a double-quoted/apostrophed input returns the entity-escaped equivalent.
    - escapeHtml(undefined) returns '' (empty string, not the literal word "undefined").
    - escapeHtml(null) returns '' (empty string).
    - escapeHtml(12345) returns '12345' (numbers coerce via String()).
    - After the task, pasting a script-tag payload into the destinataire field, clicking Generer, and viewing the Resultat + Proposition tabs: the text appears VISUALLY as the literal payload and no alert fires.
    - After the task, typing `Acme & Sons <Group>` as partner-co: the header title visibly reads `Proposition de location — Acme & Sons <Group> — by Leasetic` with the angle-bracketed token rendered as literal characters.
    - Phase 1 parity: assertCalc still 6/6, inline loyer display still works for a clean 75000€/48mo input, the 2-page PDF still prints identically.
  </behavior>
  <action>
    Edit `Matrice_2026_THE_Leasetic-v10.html`.

    (a) In the `/* ===== UTILS ===== */` section, append after hashPassword() (added by plan 02-01):

    ```js
    // HTML entity escape for user-sourced strings about to be interpolated
    // into a template literal assigned to an element's HTML property. The
    // ampersand MUST be replaced first so subsequent entities are not
    // double-escaped. Handles null/undefined gracefully. (SEC-03, SEC-04)
    function escapeHtml(v){
      if(v === null || v === undefined) return '';
      return String(v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
    ```

    (b) Wrap USER-sourced interpolations only. Do NOT touch STATIC/NUMERIC/INTERNAL/READ/EMPTY sites — over-escaping static templates silently breaks rendering. Six sites need edits:

    **Site 1 — renderResult() res-detail block (~line 800).** Wrap every `d.*` interpolation that is a user field (pco, pnm, cco, cnm, crole, ctel, cemail, csiren, projdesc, partnerref). Leave `${loyer}`, `${d.dur}`, `${d.coeff.toFixed(4)}`, `${tLabel(d.key)}` UNCHANGED. Strategy: each user-field interpolation `${d.X}` becomes `${escapeHtml(d.X)}`; for the `(d.X || '')` idiom use `${escapeHtml(d.X || '')}`; for the partnerref fallback `${d.partnerref || 'NC'}` use `${escapeHtml(d.partnerref) || 'NC'}` so the fallback stays static.

    **Site 2 — p1p2() `siren` local var (~line 821).** Wrap `${d.csiren}` as `${escapeHtml(d.csiren)}`.

    **Site 3 — p1p2() `contact` local var (~line 824).** Wrap `${d.ctel || ''}` and `${d.cemail || ''}` each in `escapeHtml(...)`.

    **Site 4 — p1p2() main return block (lines ~832-896).** Wrap every user-sourced `d.*` interpolation:
    - `${d.pco}` in `.prop-offer-partner`
    - `${d.pco}` and `${d.pnm}` in `.prop-partner`
    - `${d.cnm}` in `.ig-name` destinataire
    - `${d.crole}`, `${d.ctel}`, `${d.cemail}` in `.ig-line` under destinataire
    - `${d.cco}` in `.ig-name` societe
    - `${d.csiren}` in `SIREN \u00a0${d.csiren}`
    - `${d.projdesc}` in `.ig-name` projet
    - `${d.partnerref || 'NC'}` → `${escapeHtml(d.partnerref) || 'NC'}` in `.ig-line`
    - `${d.pco}` in the conditions line "Document non contractuel etabli par ${d.pco}..."
    - `${d.pco}` and `${d.pnm}` in the `.prop-foot` Page 1/2 line

    Leave UNCHANGED: `${fmt(d.a)}`, `${fmt(d.monthly)}`, `${d.dur}`, `${d.ref}`, `${d.ds}`, `${LOGO_SRC}`, `${expiryDate(d.ds)}`, `${intro}` (local const), `ynDisplay(...)` calls, the "Pourquoi choisir Leasetic" static tiles, all static strings.

    **Site 5 — p3() (~line 904).** In the page 2/2 footer, wrap `${d.pco}` and `${d.pnm}` in `escapeHtml(...)`. Leave `${DECK3_SRC}` untouched.

    **Site 6 — updateHdrTitle() (~line 1094).** Wrap `${pco}` in `escapeHtml(pco)`. The else-branch (line 1095) already uses textContent — leave it.

    (c) Re-run a site audit after editing:
    ```bash
    grep -n '\.innerHTML' Matrice_2026_THE_Leasetic-v10.html
    ```
    Compare hit-for-hit against the interfaces table above. Any STATIC/NUMERIC/INTERNAL/READ site whose line now contains `escapeHtml(` is a BUG — revert that site. Any USER site that does NOT contain `escapeHtml(` (except where switched to textContent) is a BUG — fix it.

    (d) Sanity self-check — add a single line to `assertCalc()` just before its `return`, OR create a sibling `assertEscape()` that runs from DOMContentLoaded after `assertCalc()`:
    ```js
    // Escape sanity probe (SEC-03)
    const probe = escapeHtml('<x>&"\'');
    if(probe !== '&lt;x&gt;&amp;&quot;&#39;'){
      console.error('[v10 self-check] escapeHtml FAILED:', probe);
    }
    ```
    Note: the expected output above is intentionally in a known order — ampersand-first means the literal `&` becomes `&amp;`, then `<` becomes `&lt;`, etc. If you implement assertEscape() as a sibling, wire it into DOMContentLoaded AFTER assertCalc() and BEFORE the closing IIFE — do not remove assertCalc.
  </action>
  <verify>
    <automated>
    # 1. escapeHtml defined
    grep -n 'function escapeHtml' Matrice_2026_THE_Leasetic-v10.html

    # 2. Expected escape call sites present
    grep -n 'escapeHtml(d\.pco)' Matrice_2026_THE_Leasetic-v10.html
    grep -n 'escapeHtml(d\.cnm)' Matrice_2026_THE_Leasetic-v10.html
    grep -n 'escapeHtml(d\.projdesc)' Matrice_2026_THE_Leasetic-v10.html
    grep -n 'escapeHtml(pco)' Matrice_2026_THE_Leasetic-v10.html

    # 3. Assignment site count unchanged from pre-plan count
    grep -c '\.innerHTML\s*=' Matrice_2026_THE_Leasetic-v10.html

    # 4. No accidental double-wrap
    grep -n 'escapeHtml(escapeHtml' Matrice_2026_THE_Leasetic-v10.html
    # Expected: ZERO hits

    # 5. Script still parses
    node --check <(awk '/<script>/{flag=1;next}/<\/script>/{flag=0}flag' Matrice_2026_THE_Leasetic-v10.html)

    # 6. assertCalc still runs on load
    grep -n 'assertCalc();' Matrice_2026_THE_Leasetic-v10.html
    </automated>

    Manual Chrome smoke (~2 min):
    1. Reload v10, open DevTools console, see `6/6 fixtures pass` and no escape-probe error.
    2. Saisie tab fill-in with malicious payloads in partner-co/partner-name/client-co/client-name/project-desc, amount = 75000, duree = 48. Click Generer.
    3. Zero alerts fire. Proposition tab shows the literal text of every payload. DevTools Elements panel confirms no script/img child node was injected under `#prop-content`.
    4. Header (`#hdr-title`) shows the literal partner-co text, not injected markup.
  </verify>
  <done>
    escapeHtml exists, every user-sourced interpolation is wrapped, assignment-site count unchanged from pre-plan, node --check passes, manual payload probes all render as literal text, and assertCalc still reports 6/6.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Write SEC-TEST.md manual checklist with 5 payload fixtures + audit table + password flows</name>
  <files>.planning/phases/02-security-hardening/SEC-TEST.md</files>
  <action>
    Create a new file `.planning/phases/02-security-hardening/SEC-TEST.md`. It is the TEST-02 deliverable — a manual checklist Antoine runs in Chrome to certify Phase 2.

    Required structure:

    1. **Header** naming the target file, browsers to run in (Chrome primary, Edge secondary), prerequisites (Phase 2 plans 01 and 02 shipped), and covered REQ IDs (MIGRATE-02, SEC-01..05, TEST-02).

    2. **Section A — Password hashing (SEC-01, MIGRATE-02, SEC-02)** with three sub-scenarios:
       - A1 Fresh install: clear `lt_pw`, reload, expect migration log + 64-char hex value, admin login with `leasetic2025` succeeds.
       - A2 Idempotence: reload again, expect NO repeat migration log, `lt_pw` unchanged.
       - A3 Legacy plaintext upgrade: manually set `lt_pw` to literal `mylegacypwd`, reload, expect upgrade log, hash replaces plaintext, login with `mylegacypwd` succeeds, login with `leasetic2025` fails.

    3. **Section B — Password change with current-pw (SEC-05)** with four sub-scenarios:
       - B1 Happy path: correct current-pw + matching new-pw pair → success, old password no longer works.
       - B2 Wrong current-pw blocks: wrong current-pw + new-pw pair → "Mot de passe actuel incorrect.", `lt_pw` unchanged.
       - B3 Empty current-pw blocks: empty current-pw + new-pw pair → same generic error, `lt_pw` unchanged.
       - B4 No-op save: coefficient change only, all three pw fields empty → saves coefficients, `lt_pw` untouched.

    4. **Section C — XSS sanitization (SEC-03, SEC-04)** as a table with 5 fixture rows plus a header-title guard row and a regression-guard row. For each fixture: field name, the payload, the expected render ("literal text", "no alert", "no new DOM node"), pass/fail checkbox.

       The 5 fixtures from 02-CONTEXT.md:
       - C1: script-tag literal pasted in client-name (destinataire)
       - C2: img-tag-with-onerror pasted in client-co (societe)
       - C3: malformed attribute injection in project-desc (projet) — something like `"><svg/onload=...>`
       - C4: `javascript:` pseudo-URL as client-email
       - C5: `Dupont & Co <DSI>` as client-name (legitimate ampersand + angle-bracket case)

       Plus:
       - C6 Header title guard: malicious partner-co triggers nothing in `#hdr-title`.
       - C7 Regression guard: a CLEAN proposal still renders logo + "Pourquoi Leasetic?" tiles + conditions + page footers + RSE page 2, and Cmd+P still produces exactly 2 A4 pages commission-free.

    5. **Section D — Parity regression guard**: console shows `6/6 fixtures pass` on every reload, assertCalc numbers match phase 01 plan 02 SUMMARY table, inline loyer for 75000€/48mo matches v9.

    6. **Section E — Audit table (informational)**: every HTML-writing assignment site in v10 script block, one row each, columns: line number (pre-edit), site description, classification (STATIC / NUMERIC / INTERNAL / USER / READ / EMPTY), action taken (NONE / ESCAPE / TEXTCONTENT), short justification.

       Use the 23-row table from the interfaces block of this plan (line numbers 626, 630, 634, 643, 646, 668, 673, 679, 794, 798, 800, 816, 821, 824, 832-896, 899-906, 1046, 1055, 1072, 1074, 1075, 1076, 1094, 1095). For each USER row, ESCAPE action and list the specific d.* fields escaped. For STATIC/NUMERIC/INTERNAL/READ rows, NONE and short justification. Totals at the end: N sites total, 6 user-sourced escaped, 2 read-only safe, rest static/numeric/internal/empty.

    7. **Sign-off block**: checkboxes for all A/B/C/D sections green, Section E reviewed, Chrome AND Edge both green; signature + date.

    Format the file as clean markdown. Use tables for the fixture grid and the audit table. Use `- [ ]` checkboxes throughout. Keep it runnable end-to-end in ~15 minutes.

    **Important:** use the word `alert` in payloads and prose only where describing the payload itself (e.g. "a script-tag payload containing an alert call"). Do not show executable JavaScript syntax in the expected-output column — the expected output is always the literal string as rendered text.
  </action>
  <verify>
    <automated>
    # File exists
    test -f .planning/phases/02-security-hardening/SEC-TEST.md && echo OK

    # Contains all 7 REQ IDs
    grep -c 'MIGRATE-02' .planning/phases/02-security-hardening/SEC-TEST.md
    grep -c 'SEC-01' .planning/phases/02-security-hardening/SEC-TEST.md
    grep -c 'SEC-02' .planning/phases/02-security-hardening/SEC-TEST.md
    grep -c 'SEC-03' .planning/phases/02-security-hardening/SEC-TEST.md
    grep -c 'SEC-04' .planning/phases/02-security-hardening/SEC-TEST.md
    grep -c 'SEC-05' .planning/phases/02-security-hardening/SEC-TEST.md
    grep -c 'TEST-02' .planning/phases/02-security-hardening/SEC-TEST.md

    # Contains 5 fixture rows (C1..C5)
    grep -cE '^\| C[1-5] ' .planning/phases/02-security-hardening/SEC-TEST.md

    # Contains audit table section
    grep -n 'Section E' .planning/phases/02-security-hardening/SEC-TEST.md
    </automated>
  </verify>
  <done>
    SEC-TEST.md committed. Antoine can run it end-to-end in Chrome in ~15 minutes. Every Phase 2 requirement has at least one pass/fail checkbox mapped to it. The audit table lists every assignment site in the script block with a classification.
  </done>
</task>

</tasks>

<verification>
Phase 2 close-out checks (run after both tasks commit):

1. `grep -c 'function escapeHtml' Matrice_2026_THE_Leasetic-v10.html` → 1
2. `grep -c 'escapeHtml(' Matrice_2026_THE_Leasetic-v10.html` → at least 15 (definition + sanity probe + every user-sourced site listed in Section E)
3. `grep -c '\.innerHTML\s*=' Matrice_2026_THE_Leasetic-v10.html` → unchanged from pre-plan count
4. `grep -n 'escapeHtml(escapeHtml' Matrice_2026_THE_Leasetic-v10.html` → 0 (no double-wrap)
5. `node --check` on extracted script still passes.
6. SEC-TEST.md exists and covers all 7 requirements (MIGRATE-02, SEC-01..05, TEST-02).
7. Antoine runs SEC-TEST.md Sections A–E in Chrome → every box ticked.
</verification>

<success_criteria>
- SEC-03: User-entered text sanitized before insertion into proposal HTML. Verified when every SEC-TEST Section C fixture renders as literal text and no alert fires.
- SEC-04: No unescaped user input in HTML-writing assignments. Verified when the audit table (Section E) classifies every site and user-sourced sites all wrap via escapeHtml() (or use textContent).
- TEST-02: Manual checklist for SEC REQs exists. Verified when SEC-TEST.md is committed and executable end-to-end in Chrome.
- No Phase 1 regression: assertCalc 6/6, PDF still 2 pages, inline loyer still updates live.
</success_criteria>

<output>
After completion, create `.planning/phases/02-security-hardening/02-02-xss-sanitization-SUMMARY.md` with:
- The final audit table (post-edit line numbers) as a persistent record.
- Count of escapeHtml call sites added (should match the USER rows in Section E).
- Confirmation that SEC-TEST.md is committed.
- Notes on anything Antoine needs to verify manually before declaring Phase 2 closed.
</output>
</content>
</invoke>