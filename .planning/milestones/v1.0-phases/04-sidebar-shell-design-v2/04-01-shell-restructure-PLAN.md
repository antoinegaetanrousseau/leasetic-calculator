---
phase: 04
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - Matrice_2026_THE_Leasetic-v10.html
autonomous: true
requirements:
  - DESIGN-01
  - DESIGN-02
  - DESIGN-03
  - DESIGN-10
  - DESIGN-11
  - DESIGN-12
must_haves:
  truths:
    - "Opening v10 shows a 260px light sidebar on the left with Leasétic logo top, Saisie/Résultat/Proposition nav items, an Admin item below a divider, and a FR/EN segmented toggle + quarter status badge at the bottom"
    - "A sticky 64px topbar displays the current page title on the left and contextual action buttons on the right (Saisie shows Réinitialiser + Générer, Résultat shows Modifier + Voir la proposition, Proposition shows Modifier + Copier + Imprimer + Télécharger, Admin shows Verrouiller + Enregistrer)"
    - "A single-line 48px footer displays '© 2026 Leasétic · thomas.heufke@leasetic.com · Matrice v10' below the content"
    - "Clicking a sidebar nav item switches the active page via showTab(); the topbar action buttons swap accordingly and fire the exact same handlers they did in Phase 3 (generate, showTab('saisie'), window.print(), blob download, saveCoeffs, lock)"
    - "Clicking the FR or EN segment in the sidebar bottom toggle fires setLang() and persists the choice to lt_lang — the whole UI including the new sidebar labels, topbar title, and footer translates"
    - "window.print() renders a 2-page A4 PDF IDENTICAL to Phase 1's audited output — sidebar, topbar, and footer vanish; #page-proposition prints byte-identical to Phase 1"
    - "All four on-load self-checks still log green: migration line, assertCalc 6/6, assertEscape 8/8, assertValidity 6/6"
    - "Breadcrumb DOM is gone from HTML and updateBreadcrumb() calls are removed from showTab and DOMContentLoaded (the function definition itself may stay as a no-op or be deleted — either is acceptable)"
  artifacts:
    - path: Matrice_2026_THE_Leasetic-v10.html
      provides: "Grid shell (sidebar + topbar + content + footer), topbar contextual action groups, sidebar segmented FR/EN toggle, relocated exp-banner, deleted .hdr/.tabs/.crumb DOM, print-mode isolation CSS"
      contains: "id=\"sidebar\", id=\"topbar\", id=\"footer\", #btn-lang-fr, #btn-lang-en, data-topbar-actions=\"saisie\", @media print containing sidebar/topbar/footer display:none"
  key_links:
    - from: "sidebar <a data-tab> clicks"
      to: "showTab('saisie'|'resultat'|'proposition'|'admin')"
      via: "onclick delegate calling showTab(e.currentTarget.dataset.tab)"
      pattern: "dataset\\.tab|showTab\\("
    - from: "showTab()"
      to: "updateTopbarActions(page)"
      via: "dispatch helper toggling [data-topbar-actions] groups + sidebar active class"
      pattern: "updateTopbarActions|data-topbar-actions"
    - from: "#btn-lang-fr / #btn-lang-en clicks"
      to: "setLang('fr' | 'en')"
      via: "bindAll() onclick wiring"
      pattern: "setLang\\('fr'\\)|setLang\\('en'\\)"
    - from: "@media print"
      to: "sidebar + topbar + footer"
      via: "display:none !important override of grid layout"
      pattern: "#sidebar[^{]*display:\\s*none|#topbar[^{]*display:\\s*none|#footer[^{]*display:\\s*none"
---

<objective>
Replace the horizontal .hdr + .tabs + .crumb navigation with a modern SaaS grid shell: persistent left sidebar (260px light), sticky top bar (64px with contextual actions), scrollable content area, and a minimal bottom footer (48px). Relocate every existing interactive control (Générer, Réinitialiser, Admin entry, FR/EN toggle, print, download, save) into the new locations while preserving every Phase 1-3 JS entry point, ID, and handler. Delete the breadcrumb DOM and updateBreadcrumb() call sites. Isolate print mode so the 2-page A4 PDF output remains byte-identical to Phase 1's audited output.

Purpose: This is the structural foundation for Phase 4. Plan 04-02 restyles components inside this shell; plan 04-03 tightens typography. Without the shell restructure, the design overhaul cannot happen.

Output: A v10 HTML file whose body DOM is restructured around a sidebar + topbar + content + footer grid, with every Phase 1-3 behavior preserved, print output pixel-identical, and self-checks green.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/04-sidebar-shell-design-v2/04-CONTEXT.md
@.planning/phases/03-ux-polish-i18n/03-02-i18n-infrastructure-SUMMARY.md
@.planning/phases/03-ux-polish-i18n/03-03-features-and-final-test-SUMMARY.md
@Matrice_2026_THE_Leasetic-v10.html

<interfaces>
<!-- Key IDs / helpers executor must preserve. Extracted from v10 post-Phase-3. -->

Current DOM blocks to DELETE (v10 lines 330-355):
```html
<!-- DELETE: .hdr block lines 330-337 -->
<div class="hdr">
  <div id="hdr-title" ...>Proposition de location — Leasétic</div>
  <div class="hdr-r">
    <button class="btn btn-ghost" id="btn-lang" ...>EN</button>
    <button class="btn btn-ghost" id="btn-admin" ...>Admin</button>
    <button class="btn btn-green" id="btn-gen" ...>Générer la proposition &rarr;</button>
  </div>
</div>

<!-- RELOCATE: #exp-banner line 339 -->
<div id="exp-banner" class="exp hide"></div>

<!-- DELETE: .tabs block lines 341-346 -->
<div class="tabs no-print">
  <button class="tab active" id="tab-saisie" ...>Saisie</button>
  <button class="tab" id="tab-resultat" ...>Résultat</button>
  <button class="tab" id="tab-proposition" ...>Proposition</button>
  <button class="tab" id="tab-admin" ...>Admin</button>
</div>

<!-- DELETE: breadcrumb block lines 348-355 -->
<div id="breadcrumb" class="bc no-print">
  <span class="bc-step step-current" data-step="1">...1. Saisie</span>
  <span class="bc-sep">→</span>
  <span class="bc-step" data-step="2">...2. Résultat</span>
  <span class="bc-sep">→</span>
  <span class="bc-step" data-step="3">...3. Proposition</span>
</div>
```

JS entry points that MUST keep firing (bindAll wiring, v10 lines 1775-1921):
```js
// Tab switching — sidebar clicks replace tab-* button clicks
$('tab-saisie').onclick = () => showTab('saisie');       // line 1776 — SHIFT to sidebar
$('tab-resultat').onclick = () => showTab('resultat');   // line 1777 — SHIFT to sidebar
$('tab-proposition').onclick = () => showTab('proposition'); // line 1778
$('tab-admin').onclick = () => showTab('admin');         // line 1779
$('btn-admin').onclick = () => showTab('admin');         // line 1780 — SHIFT (sidebar Admin item)
$('btn-back').onclick = () => showTab('saisie');         // line 1783 — STAYS on page-proposition toolbar OR moves to topbar

// Primary actions — relocate into topbar action groups per page
$('btn-gen').onclick = generate;                         // line 1781 — SHIFT to topbar-saisie group
$('btn-gen2').onclick = generate;                        // line 1782 — this is the in-page duplicate, STAYS in page
$('btn-reset').onclick = ...confirm+reset...;            // line 1838 — SHIFT to topbar-saisie group
$('btn-print').onclick = () => window.print();           // line 1807 — SHIFT to topbar-proposition group
$('btn-dl').onclick = () => blob download;               // line 1814 — SHIFT to topbar-proposition group
$('btn-save').onclick = saveCoeffs;                      // line 1915 — SHIFT to topbar-admin group (still also works from inline save button)
$('btn-lock').onclick = () => lock+hide panel;           // line 1911 — SHIFT to topbar-admin group (visible only when admin unlocked)
$('btn-pw').onclick = async admin login;                 // line 1887 — STAYS inside admin login card

// Lang toggle — replace single #btn-lang with segmented pair
$('btn-lang').onclick = () => setLang(currentLang === 'fr' ? 'en' : 'fr');  // line 1921 — DELETE, replace with two wirings

// Enter shortcut — still fires btn-gen.click() in showTab('saisie') context
// v10 line 1953: $('btn-gen').click(); — #btn-gen ID must survive relocation to topbar
```

showTab() current implementation (v10 lines 1292-1306) — MUST be modified to ALSO update sidebar active class + topbar action group + drop updateBreadcrumb:
```js
function showTab(t){
  ['saisie','resultat','proposition','admin'].forEach((x) => {
    $('page-' + x).className = 'pg';
    $('tab-' + x).className = 'tab';          // <-- tab-* IDs gone after DOM rewrite; must convert to sidebar nav items
  });
  $('page-' + t).className = 'pg show';
  $('tab-' + t).className = 'tab active';     // <-- same
  if(t === 'admin'){ ... $('qbdg').textContent = ... }
  updateBreadcrumb(stepMap[t] || 1);          // <-- DELETE this line
}
```

Every showTab CALLER (must survive the rewrite unchanged):
- v10:1466 showTab('proposition')             — called from generate() after successful render
- v10:1776-1783 five bindAll wirings          — replaced by sidebar nav + topbar btn-back
- v10:1854 showTab('saisie')                  — called from btn-reset handler
- v10:1950-1953 Enter-key handler             — calls $('btn-gen').click() when page-saisie.show; no direct showTab call but the ID must be preserved

Global helpers available (window-exposed — v10 lines 1178-1773):
- window.I18N, window.t(key, ...args), window.applyI18n(), window.setLang(lang), window.currentLang
- window.showToast(msg, kind), window.escapeHtml(v)
- window.assertCalc(), window.assertEscape(), window.assertValidity()
- window.rerenderProposalIfActive(), window.lastGen, window.updateBreadcrumb (may become no-op)

Current CSS sections (v10 <style>, 4 labels): TOKENS, LAYOUT, COMPONENTS, PRINT. New shell rules must land in LAYOUT (grid, sidebar, topbar, footer, main-content) and PRINT (hide rules). Do NOT scatter into COMPONENTS.

Topbar action mapping (locked by CONTEXT):
| Page        | Topbar right-side buttons                                                      |
|-------------|--------------------------------------------------------------------------------|
| saisie      | [↻ Réinitialiser] [Générer →]                                                  |
| resultat    | [← Modifier] [Voir la proposition →]                                           |
| proposition | [← Modifier] [📋 Copier la référence] [🖨 Imprimer/PDF] [⬇ Télécharger HTML]  |
| admin       | [🔒 Verrouiller] (when unlocked) [💾 Enregistrer]                              |

i18n keys ALREADY in dictionary (reuse — do NOT rename):
- header.generate → "Générer la proposition →" / "Generate proposal →"
- button.generate → "Générer →" / "Generate →" (use the shorter form for topbar)
- button.reset → "↻ Réinitialiser" / "↻ Reset"
- button.modify → "← Modifier" / "← Modify"
- button.print → "🖨 Imprimer / PDF" / "🖨 Print / PDF"
- button.download → "⬇ Télécharger HTML" / "⬇ Download HTML"
- button.copy.ref → "📋 Copier la référence" / "📋 Copy reference"
- admin.sbar.save → (check dict) or add "admin.topbar.save" / admin.sbar.lock

i18n keys that MAY need adding (add to BOTH fr+en in same edit):
- sidebar.brand → "Leasétic"
- sidebar.nav.saisie → "Saisie" / "Saisie" (reuse tab.saisie value)
- sidebar.nav.resultat → reuse tab.resultat
- sidebar.nav.proposition → reuse tab.proposition
- sidebar.nav.admin → reuse tab.admin
- sidebar.admin.locked → small "🔒" icon suffix (static or via aria-label)
- topbar.title.saisie|resultat|proposition|admin → page titles (may reuse tab.* values)
- topbar.action.voir_proposition → "Voir la proposition →" / "View proposal →"  (NEW)
- footer.text → "© 2026 Leasétic · thomas.heufke@leasetic.com · Matrice v10" (NEW — single key; email part can stay literal)

PREFER reusing existing tab.* keys for sidebar nav labels and topbar title to minimize dict churn. Any NEW key MUST be added to both fr and en branches in one edit.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Build the grid shell DOM + CSS (sidebar, topbar, footer, print isolation)</name>
  <files>Matrice_2026_THE_Leasetic-v10.html</files>
  <behavior>
    After this task:
    - Opening v10 in Chrome shows a 260px light sidebar, a 64px sticky topbar, a scrollable content column, and a 48px footer
    - The sidebar contains: brand header row ("Leasétic"), 3 main nav items (Saisie/Résultat/Proposition) with a placeholder active-state green pill, a divider, an Admin nav item with a 🔒 affix when not authenticated, a flex-grow spacer, a FR/EN segmented toggle, and a ✓ Q2 2026 quarter badge
    - The topbar shows a left-aligned page title (Plus Jakarta Sans 1.15rem/600) and a right-aligned action group that changes per page via a `data-topbar-actions="saisie|resultat|proposition|admin"` CSS switch (only one group visible at a time; the others are `display:none`)
    - The footer contains a single centered paragraph "© 2026 Leasétic · thomas.heufke@leasetic.com · Matrice v10"
    - `window.print()` hides the sidebar, topbar, and footer completely and #page-proposition prints full-width in the same 2-page A4 format as Phase 1
    - The old `.hdr`, `#exp-banner` (temporarily), `.tabs`, and `#breadcrumb` DOM blocks are GONE from the document source
    - The self-checks still log 6/6, 8/8, 6/6 green on load (no JS errors)
  </behavior>
  <action>
    1. **Add CSS variables** in the TOKENS section of <style>:
       ```css
       --sidebar-bg: #ffffff;
       --sidebar-fg: var(--ink);
       --sidebar-border: var(--border);
       --shadow-card: 0 1px 2px rgba(17,44,59,0.04), 0 4px 12px rgba(17,44,59,0.05);
       --topbar-h: 64px;
       --sidebar-w: 260px;
       --footer-h: 48px;
       ```

    2. **Add new LAYOUT CSS rules** (place after the existing `.hdr` / `.tabs` rules — you will delete those after). DO NOT put these inside COMPONENTS or PRINT:
       ```css
       body { display: grid; grid-template-columns: var(--sidebar-w) 1fr; grid-template-rows: var(--topbar-h) 1fr auto; min-height: 100vh; background: var(--paper); }
       #sidebar { grid-column: 1; grid-row: 1 / -1; background: var(--sidebar-bg); border-right: 1px solid var(--sidebar-border); display: flex; flex-direction: column; padding: 1.5rem 1rem; position: sticky; top: 0; height: 100vh; }
       .sidebar-brand { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 1.1rem; color: var(--navy); padding: 0.25rem 0.5rem 1.5rem; border-bottom: 1px solid var(--sidebar-border); margin-bottom: 1rem; }
       .sidebar-nav { display: flex; flex-direction: column; gap: 0.25rem; }
       .sidebar-nav .nav-item { display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.75rem; border-radius: 8px; cursor: pointer; font-size: 0.88rem; font-weight: 500; color: var(--ink); text-decoration: none; background: transparent; border: none; transition: background .15s, color .15s; }
       .sidebar-nav .nav-item:hover { background: rgba(17,44,59,0.04); }
       .sidebar-nav .nav-item.active { background: rgba(18,150,87,0.12); color: var(--gd); }
       .sidebar-nav .nav-item.locked { opacity: 0.65; }
       .sidebar-divider { height: 1px; background: var(--sidebar-border); margin: 1rem 0.5rem; }
       .sidebar-spacer { flex: 1; }
       .sidebar-bottom { display: flex; flex-direction: column; gap: 0.75rem; padding-top: 1rem; border-top: 1px solid var(--sidebar-border); }
       .lang-seg { display: inline-flex; background: var(--paper); border: 1px solid var(--border); border-radius: 9999px; padding: 2px; overflow: hidden; align-self: flex-start; }
       .lang-seg button { background: transparent; border: none; color: var(--muted); font-weight: 600; font-size: 0.75rem; padding: 0.3rem 0.75rem; border-radius: 9999px; cursor: pointer; }
       .lang-seg button.active { background: var(--gd); color: #fff; }
       .sidebar-qbadge { font-size: 0.7rem; color: var(--muted); padding: 0 0.5rem; }

       #topbar { grid-column: 2; grid-row: 1; position: sticky; top: 0; z-index: 100; height: var(--topbar-h); background: #fff; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0 1.5rem; }
       .topbar-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 1.15rem; font-weight: 600; color: var(--ink); }
       .topbar-actions { display: flex; gap: 0.5rem; align-items: center; }
       .topbar-actions > [data-topbar-actions] { display: none; gap: 0.5rem; align-items: center; }
       .topbar-actions > [data-topbar-actions].show { display: inline-flex; }

       .main-content { grid-column: 2; grid-row: 2; padding: 1.5rem 1.5rem 2rem; max-width: 1100px; margin: 0 auto; width: 100%; }
       #footer { grid-column: 2; grid-row: 3; height: var(--footer-h); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; color: var(--muted); background: var(--paper); border-top: 1px solid var(--border); }
       ```

    3. **Add print isolation** in the PRINT section (append at the very end of existing @media print block, inside the same @media):
       ```css
       @media print {
         body { display: block !important; }
         #sidebar, #topbar, #footer { display: none !important; }
         .main-content { padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
       }
       ```
       Note: the existing PRINT rules `body>*:not(#page-proposition){display:none!important;}` still apply and are what actually hides everything during print of the proposal. The new rules are a belt-and-suspenders override in case of print from a non-proposition tab.

    4. **Replace the DOM blocks** — delete lines 330-355 (the .hdr, #exp-banner, .tabs, #breadcrumb old markup) and replace with the new shell:
       ```html
       <!-- SIDEBAR -->
       <aside id="sidebar">
         <div class="sidebar-brand" data-i18n="sidebar.brand">Leasétic</div>
         <nav class="sidebar-nav">
           <button type="button" class="nav-item active" id="nav-saisie" data-tab="saisie" data-i18n="tab.saisie">📋 Saisie</button>
           <button type="button" class="nav-item" id="nav-resultat" data-tab="resultat" data-i18n="tab.resultat">📊 Résultat</button>
           <button type="button" class="nav-item" id="nav-proposition" data-tab="proposition" data-i18n="tab.proposition">📄 Proposition</button>
           <div class="sidebar-divider"></div>
           <button type="button" class="nav-item" id="nav-admin" data-tab="admin" data-i18n="tab.admin">⚙ Admin</button>
         </nav>
         <div class="sidebar-spacer"></div>
         <div class="sidebar-bottom">
           <div class="lang-seg" role="group" aria-label="Language">
             <button type="button" id="btn-lang-fr" class="active">FR</button>
             <button type="button" id="btn-lang-en">EN</button>
           </div>
           <div class="sidebar-qbadge" id="qbdg-sidebar">Q2 2026</div>
         </div>
       </aside>

       <!-- TOPBAR -->
       <header id="topbar">
         <div class="topbar-title" id="topbar-title" data-i18n="tab.saisie">Saisie</div>
         <div class="topbar-actions">
           <div data-topbar-actions="saisie" class="show">
             <button class="btn btn-out" id="btn-reset" data-i18n="button.reset">↻ Réinitialiser</button>
             <button class="btn btn-green" id="btn-gen" data-i18n="button.generate">Générer →</button>
           </div>
           <div data-topbar-actions="resultat">
             <button class="btn btn-out" id="btn-back-to-saisie" data-i18n="button.modify">← Modifier</button>
             <button class="btn btn-green" id="btn-to-proposition" data-i18n="topbar.action.voir_proposition">Voir la proposition →</button>
           </div>
           <div data-topbar-actions="proposition">
             <button class="btn btn-out" id="btn-back" data-i18n="button.modify">← Modifier</button>
             <button class="btn btn-out btn-copy-ref" id="btn-copy-ref-topbar" data-i18n="button.copy.ref">📋 Copier la référence</button>
             <button class="btn btn-green" id="btn-print" data-i18n="button.print">🖨 Imprimer / PDF</button>
             <button class="btn btn-navy" id="btn-dl" data-i18n="button.download">⬇ Télécharger HTML</button>
           </div>
           <div data-topbar-actions="admin">
             <button class="btn btn-out" id="btn-lock" data-i18n="admin.sbar.lock">🔒 Verrouiller</button>
             <button class="btn btn-green" id="btn-save" data-i18n="admin.sbar.save">💾 Enregistrer</button>
           </div>
         </div>
       </header>

       <!-- MAIN CONTENT -->
       <main class="main-content">
         <div id="exp-banner" class="exp hide"></div>
         <!-- existing #page-saisie / #page-resultat / #page-proposition / #page-admin divs stay here -->
       </main>

       <!-- FOOTER -->
       <footer id="footer">
         <span data-i18n="footer.text">© 2026 Leasétic · thomas.heufke@leasetic.com · Matrice v10</span>
       </footer>
       ```
       Wrap all four `#page-*` divs that previously followed the breadcrumb in the new `<main class="main-content">` container. The `<main>` opens BEFORE `#page-saisie` and closes AFTER `#page-admin`.

    5. **Delete obsolete CSS rules** (scan-and-remove so we don't leave dead styles):
       - `.hdr` (line 21), `.hdr-r` (line 22)
       - `.tabs` (line 25), `.tab` and `.tab.active` (search the COMPONENTS section)
       - `.bc`, `.bc-step`, `.bc-dot`, `.bc-step.step-*`, `.bc-sep` (lines ~135-143) — and their `@media print` hide at line 143
       - Mobile-breakpoint overrides for `.hdr`, `.tabs`, `.hdr-r` (lines ~257-287) — delete only the rules referencing deleted selectors
       Leave `.exp` CSS alone for now (plan 04-02 restyles it). Leave `.btn`, `.btn-green`, `.btn-navy`, `.btn-out` alone.

    6. **Add new i18n keys** to the I18N dictionary (inside both `fr:` and `en:` blocks, same edit):
       - `'sidebar.brand': 'Leasétic'` (both langs — brand name)
       - `'topbar.action.voir_proposition': 'Voir la proposition →'` / `'View proposal →'`
       - `'footer.text': '© 2026 Leasétic · thomas.heufke@leasetic.com · Matrice v10'` (both langs — email stays literal, "Matrice" is a product name)
       - If `admin.sbar.save` / `admin.sbar.lock` do NOT already exist, add them: FR `'💾 Enregistrer'` / `'🔒 Verrouiller'`, EN `'💾 Save'` / `'🔒 Lock'`. Grep the dict first before adding to avoid duplicates.

    7. **Smoke-verify** after the DOM + CSS edits but BEFORE proceeding to Task 2:
       - `grep -c 'class="hdr"' Matrice_2026_THE_Leasetic-v10.html` → 0 (was 1)
       - `grep -c 'class="tabs' Matrice_2026_THE_Leasetic-v10.html` → 0
       - `grep -c 'id="breadcrumb"' Matrice_2026_THE_Leasetic-v10.html` → 0
       - `grep -c 'id="sidebar"' Matrice_2026_THE_Leasetic-v10.html` → 1
       - `grep -c 'id="topbar"' Matrice_2026_THE_Leasetic-v10.html` → 1
       - `grep -c 'id="footer"' Matrice_2026_THE_Leasetic-v10.html` → 1
       - `grep -c 'data-topbar-actions' Matrice_2026_THE_Leasetic-v10.html` → 4 (one per page)
    DO NOT OPEN IN BROWSER YET — the page will be broken until Task 2 rewires JS. This task is DOM + CSS only.
  </action>
  <verify>
    <automated>grep -c 'id="sidebar"' Matrice_2026_THE_Leasetic-v10.html | grep -q '^1$' && grep -c 'id="topbar"' Matrice_2026_THE_Leasetic-v10.html | grep -q '^1$' && grep -c 'id="footer"' Matrice_2026_THE_Leasetic-v10.html | grep -q '^1$' && grep -c 'class="hdr"' Matrice_2026_THE_Leasetic-v10.html | grep -q '^0$' && grep -c 'class="tabs' Matrice_2026_THE_Leasetic-v10.html | grep -q '^0$' && grep -c 'id="breadcrumb"' Matrice_2026_THE_Leasetic-v10.html | grep -q '^0$' && grep -c 'data-topbar-actions' Matrice_2026_THE_Leasetic-v10.html | grep -q '^4$'</automated>
  </verify>
  <done>Body DOM has exactly: #sidebar + #topbar + <main class="main-content"> wrapping all 4 pages + #footer. The .hdr, .tabs, and #breadcrumb blocks are gone. New LAYOUT CSS rules are in place. Print-mode belt-and-suspenders added to PRINT section. New i18n keys added to both fr and en branches.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Rewire JS handlers, rewrite showTab, delete breadcrumb calls, wire segmented lang toggle, add updateTopbarActions dispatcher</name>
  <files>Matrice_2026_THE_Leasetic-v10.html</files>
  <behavior>
    After this task:
    - Clicking any sidebar nav button calls showTab() with the correct tab name and the sidebar active class follows
    - The topbar action group visible at any moment matches the active page (via data-topbar-actions + .show class toggling)
    - The topbar title text updates to match the active page on every showTab call
    - Clicking #btn-lang-fr or #btn-lang-en fires setLang('fr'|'en'), persists to lt_lang, and re-applies i18n across the whole UI including sidebar, topbar, footer
    - The .lang-seg active class follows currentLang
    - Every previously-working action button (Générer, Réinitialiser, Modifier, Copier, Imprimer, Télécharger, Enregistrer, Verrouiller, Admin login, Aperçu duration buttons, yes/no toggles, reset, reload coeffs, reset-to-saisie from btn-reset handler) still works
    - Enter key in page-saisie still fires generate (via $('btn-gen').click() — ID is preserved)
    - Esc key still fires reset (via $('btn-reset').click() — ID is preserved)
    - updateBreadcrumb() is no longer called from showTab or DOMContentLoaded (the function can remain as a no-op; do NOT delete the function definition or window.updateBreadcrumb exposure — other plans/files may reference it)
    - All 4 on-load self-checks log green: migration line, assertCalc 6/6, assertEscape 8/8, assertValidity 6/6
    - Print output (window.print() from #page-proposition) is visually identical to Phase 1's 2-page A4 PDF
  </behavior>
  <action>
    1. **Rewrite showTab()** (v10 lines 1292-1306). The new body:
       ```js
       function showTab(t){
         const pages = ['saisie','resultat','proposition','admin'];
         pages.forEach((x) => {
           const pg = $('page-' + x);
           if(pg) pg.className = 'pg';
           const nav = $('nav-' + x);
           if(nav) nav.classList.remove('active');
         });
         const activePage = $('page-' + t);
         if(activePage) activePage.className = 'pg show';
         const activeNav = $('nav-' + t);
         if(activeNav) activeNav.classList.add('active');
         updateTopbarActions(t);
         updateTopbarTitle(t);
         if(t === 'admin'){
           const b = $('qbdg');
           if(b) b.textContent = '\u2713 ' + qLabel(curQ());
         }
         // DESIGN-09: breadcrumb removed — sidebar active state carries the signal alone.
         // updateBreadcrumb left as a no-op call in case other code paths expect it to exist.
       }
       ```
       Note: DELETE the `updateBreadcrumb(stepMap[t] || 1);` line. Do NOT delete the updateBreadcrumb function — just stop calling it from showTab.

    2. **Add two new dispatcher helpers** right above showTab() in the ADMIN section:
       ```js
       // DESIGN-02: per-page topbar action groups. Only one group has .show at a time.
       const updateTopbarActions = (page) => {
         document.querySelectorAll('[data-topbar-actions]').forEach((g) => {
           g.classList.toggle('show', g.dataset.topbarActions === page);
         });
       };
       window.updateTopbarActions = updateTopbarActions;

       // DESIGN-02: topbar title reflects the current page. Reuses tab.* i18n keys.
       const updateTopbarTitle = (page) => {
         const el = $('topbar-title');
         if(!el) return;
         const key = 'tab.' + page;
         el.setAttribute('data-i18n', key);
         el.textContent = t(key);
       };
       window.updateTopbarTitle = updateTopbarTitle;
       ```

    3. **Rewire bindAll()** (v10 lines 1776-1921). Replace tab wiring + relocate btn-admin + rewire lang:
       ```js
       // OLD (DELETE):
       // $('tab-saisie').onclick = () => showTab('saisie');
       // $('tab-resultat').onclick = () => showTab('resultat');
       // $('tab-proposition').onclick = () => showTab('proposition');
       // $('tab-admin').onclick = () => showTab('admin');
       // $('btn-admin').onclick = () => showTab('admin');
       // $('btn-lang').onclick = () => setLang(currentLang === 'fr' ? 'en' : 'fr');

       // NEW:
       document.querySelectorAll('.sidebar-nav .nav-item').forEach((el) => {
         el.onclick = () => showTab(el.dataset.tab);
       });

       $('btn-lang-fr').onclick = () => setLang('fr');
       $('btn-lang-en').onclick = () => setLang('en');
       ```
       ALL the other bindings stay as-is: $('btn-gen').onclick = generate, $('btn-gen2').onclick = generate, $('btn-back').onclick = () => showTab('saisie'), $('btn-reset').onclick = ..., $('btn-print').onclick, $('btn-dl').onclick, $('btn-save').onclick, $('btn-lock').onclick, $('btn-pw').onclick, $('d36|d48|d60').onclick, $('slb-*|eval-*').onclick, $('partner-co').oninput = updateHdrTitle, $('amount').addEventListener, $('adm-pw').onkeydown, REQUIRED_FIELDS validation wiring, Enter/Esc keyboard listener, $('btn-reload').onclick — all survive because the IDs in the new topbar match the old ones.

    4. **Add new btn-back-to-saisie and btn-to-proposition wirings** (topbar-resultat group):
       ```js
       const bbs = $('btn-back-to-saisie'); if(bbs) bbs.onclick = () => showTab('saisie');
       const btp = $('btn-to-proposition'); if(btp) btp.onclick = () => showTab('proposition');
       ```

    5. **Update the .lang-seg active class** on every applyI18n / setLang call. Add this at the end of applyI18n() (v10 UTILS section):
       ```js
       // DESIGN-11: segmented FR/EN toggle active state follows currentLang
       const segFr = $('btn-lang-fr'); if(segFr) segFr.classList.toggle('active', currentLang === 'fr');
       const segEn = $('btn-lang-en'); if(segEn) segEn.classList.toggle('active', currentLang === 'en');
       // Topbar title refresh on lang toggle — re-read the current data-i18n key
       const tbt = $('topbar-title'); if(tbt){ const k = tbt.getAttribute('data-i18n'); if(k) tbt.textContent = t(k); }
       ```

    6. **Update sidebar Admin lock affix**. Add a helper + call from applyI18n + from the btn-pw/btn-lock handlers:
       ```js
       // DESIGN-01: when admin panel is locked, sidebar Admin item shows 🔒 suffix
       const updateAdminLockState = () => {
         const adminNav = $('nav-admin');
         if(!adminNav) return;
         const panel = $('adm-panel');
         const isUnlocked = panel && panel.style.display === 'block';
         adminNav.classList.toggle('locked', !isUnlocked);
         // label sourced via data-i18n — suffix handled purely via CSS ::after when .locked
       };
       window.updateAdminLockState = updateAdminLockState;
       ```
       Call `updateAdminLockState()` at the end of applyI18n() and inside the btn-pw success branch (after `$('adm-panel').style.display = 'block'`) and inside the btn-lock onclick (after panel hidden). Also CSS: append `.sidebar-nav .nav-item.locked::after { content: ' 🔒'; opacity: 0.7; }` to LAYOUT section (Task 1 added .locked base rule already; this ::after is additive).

    7. **Remove updateBreadcrumb() from DOMContentLoaded** (v10 line 1968): delete the `updateBreadcrumb(1);` line. Leave the function definition and window.updateBreadcrumb exposure in place — cheaper than refactoring and satisfies any downstream assumption.

    8. **Keep the #exp-banner relocated into main-content** (Task 1 put it at the top of `<main>`). This means it now shows as a top-of-content strip on ALL pages including Admin. This is acceptable per CONTEXT risk #5 — Admin users seeing the quarterly lockout is useful, not confusing. Do NOT add a per-page hide rule.

    9. **Delete the orphan #btn-lang wiring** if it somehow still exists after the DOM deletion: `grep -n 'btn-lang' Matrice_2026_THE_Leasetic-v10.html` should only return hits for `btn-lang-fr`, `btn-lang-en`, and the lang-seg CSS/JS. If any bare `$('btn-lang').onclick` remains, delete it.

    10. **Smoke-verify in Chrome** (open file, DevTools Console):
        - Page renders with sidebar + topbar + footer
        - Console shows 4 green self-check lines (migration + 6/6 + 8/8 + 6/6)
        - Click each sidebar nav item → correct page shows, sidebar active moves, topbar title updates, topbar action group swaps
        - Click Générer with a full form → proposal renders, topbar now shows Proposition actions
        - Click ← Modifier in topbar → back to Saisie with original data intact
        - Click 🔒 Verrouiller in Admin topbar → panel locks, sidebar Admin item shows 🔒 suffix via .locked class
        - Click EN in sidebar → UI flips to English; click FR → flips back; reload → persists
        - Fill form + click 🖨 Imprimer → browser print dialog shows 2-page A4 preview with NO sidebar, NO topbar, NO footer — just #page-proposition at full width, visually identical to Phase 1
  </action>
  <verify>
    <automated>grep -c 'updateBreadcrumb(stepMap' Matrice_2026_THE_Leasetic-v10.html | grep -q '^0$' && grep -c 'updateBreadcrumb(1)' Matrice_2026_THE_Leasetic-v10.html | grep -q '^0$' && grep -c 'updateTopbarActions' Matrice_2026_THE_Leasetic-v10.html | grep -qE '^[3-9]$|^1[0-9]$' && grep -c 'setLang(.fr.)' Matrice_2026_THE_Leasetic-v10.html | grep -qE '^[1-9][0-9]*$' && grep -c 'setLang(.en.)' Matrice_2026_THE_Leasetic-v10.html | grep -qE '^[1-9][0-9]*$' && grep -c 'dataset\.tab' Matrice_2026_THE_Leasetic-v10.html | grep -qE '^[1-9][0-9]*$' && node --check <(awk '/<script>/,/<\/script>/' Matrice_2026_THE_Leasetic-v10.html | sed '1d;$d')</automated>
  </verify>
  <done>showTab dispatches to updateTopbarActions + updateTopbarTitle. Sidebar nav clicks route through dataset.tab delegate. FR/EN segmented toggle wires to setLang('fr') and setLang('en'). updateBreadcrumb no longer called from showTab or DOMContentLoaded. All 4 self-checks log green in Chrome console. Print from #page-proposition produces identical 2-page A4 PDF as Phase 1.</done>
</task>

</tasks>

<verification>
Zero-regression gates (MUST all pass before declaring this plan complete):

1. Self-checks: open v10 in Chrome, open DevTools → Console must show:
   - `[v10 migration] ...` (or `default password hashed` on fresh install)
   - `[v10 self-check] calcRent formula: 6/6 fixtures pass ✓`
   - `[v10 self-check] escapeHtml: 8/8 fixtures pass ✓`
   - `[v10 self-check] getValidity: 6/6 fixtures pass ✓`
   - Zero JavaScript errors, zero warnings

2. Navigation: every sidebar click reaches the correct page. Enter in Saisie still generates. Esc still resets. Admin login still works.

3. Topbar actions: the visible action group matches the active page. Only ONE data-topbar-actions element has .show at a time.

4. Lang toggle: FR↔EN via sidebar segments translates the whole UI including sidebar labels, topbar title, topbar buttons, and footer. Setting persists to lt_lang.

5. Print parity: from a fresh install with the default fixture (Acme / TestCo / 75000 / 48 mois), click Générer → Imprimer. The resulting 2-page A4 PDF must be visually identical to Phase 1's audited output (no sidebar, topbar, or footer visible; proposal fills both pages identically).

6. Breadcrumb cleanup: `grep -c 'id="breadcrumb"' Matrice_2026_THE_Leasetic-v10.html` returns 0. `grep -c 'updateBreadcrumb(stepMap\|updateBreadcrumb(1)' Matrice_2026_THE_Leasetic-v10.html` returns 0.

7. DOM cleanup: `grep -c 'class="hdr"' Matrice_2026_THE_Leasetic-v10.html` returns 0. `grep -c 'class="tabs' Matrice_2026_THE_Leasetic-v10.html` returns 0.

8. JS parse: `node --check` on the extracted <script> block: PARSE OK.
</verification>

<success_criteria>
- [ ] Sidebar (260px light), topbar (64px sticky), main content, footer (48px) all render in Chrome
- [ ] All 4 nav items + Admin clickable via sidebar; sidebar active class follows showTab
- [ ] Topbar action groups swap per page via data-topbar-actions + .show
- [ ] Topbar title updates on every page change and on every lang toggle
- [ ] FR/EN segmented toggle in sidebar wires to setLang('fr'|'en') with .active reflecting currentLang
- [ ] #exp-banner relocated to top of main-content; still shows quarterly state
- [ ] Footer renders "© 2026 Leasétic · thomas.heufke@leasetic.com · Matrice v10"
- [ ] .hdr, .tabs, #breadcrumb DOM all deleted (not just hidden)
- [ ] updateBreadcrumb not called from showTab or DOMContentLoaded
- [ ] @media print hides sidebar + topbar + footer; #page-proposition prints identical to Phase 1
- [ ] assertCalc 6/6, assertEscape 8/8, assertValidity 6/6 all log green
- [ ] New i18n keys (sidebar.brand, topbar.action.voir_proposition, footer.text, admin.sbar.save if missing, admin.sbar.lock if missing) present in both fr and en dict branches
- [ ] node --check on extracted <script>: PARSE OK
- [ ] Zero JS console errors
</success_criteria>

<output>
After completion, create `.planning/phases/04-sidebar-shell-design-v2/04-01-shell-restructure-SUMMARY.md` documenting:
- Exact line ranges deleted and added in Matrice_2026_THE_Leasetic-v10.html
- New CSS rules added (sidebar, topbar, footer, lang-seg, main-content, print overrides)
- New i18n keys added
- Every showTab caller re-verified (list: generate line 1466, btn-reset line 1854, Enter-key handler, sidebar nav clicks, btn-back, btn-back-to-saisie)
- Print-mode smoke result (window.print() produces 2-page A4 identical to Phase 1)
- Any deviation from this plan + rationale
- Handoff notes to Plan 04-02 (component restyle targets: buttons, cards, inputs, banners, toasts, yn-btn, db; ● dot sidebar feature)
</output>
