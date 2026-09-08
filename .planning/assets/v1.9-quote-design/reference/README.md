# Rendered reference — v1.9 quote design

`Quote-FR-A.reference.png` / `Quote-EN-A.reference.png` are the design files in
`../Quote-{FR,EN}-A.dc.html` as they actually render, at 2× device scale.

These are the **visual acceptance target** for Phase 43. Compare a generated
proposal PDF against them side by side; the `.dc.html` source alone does not
show what the layout resolves to (the `_ds` runtime supplies fonts, the
`doc-page` A4 frame, and token values).

## Provenance

Rendered 2026-09-08 from `Quote design system-handoff.zip` (the full Claude
Design handoff bundle). The bundle's copies of both `.dc.html` files, all three
SVGs and 7 of 8 token files are byte-identical to what is vendored one level up;
`colors.css` differs only in carrying the stale accented `Leasétic` spelling, so
the vendored copy is authoritative.

The bundle's `_ds/` runtime (`_ds_bundle.js`, `doc-page.js`, `support.js`,
~1.7 MB) and its fonts (Inter variable + Inter Tight ×9) are deliberately **not**
vendored — the runtime only needs to exist at render time, and Phase 41 D-03/D-04
rejected both of those font choices for the PDF.

## Regenerating

Re-extract the handoff bundle, then from `quote-design-system/project/`:

```bash
python3 -m http.server 8731
```

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for L in FR EN; do
  "$CHROME" --headless --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=2 --virtual-time-budget=6000 \
    --window-size=900,1330 --screenshot="Quote-${L}-A.reference.png" \
    "http://localhost:8731/Quote-${L}-A.dc.html"
done
```

Field slots render as literal `{{ token }}` text — that is the design tool's
`renderVals()` stub, not a rendering fault.
