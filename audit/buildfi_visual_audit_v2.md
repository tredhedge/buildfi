# BuildFi — Visual & Rendering Audit v2 (post-refactor build)
## planner_v3.html (v12.0.0, 2026-06-11 upload) + planner_longform.html

**Method:** instrumented headless sweep, not just screenshots — a JS check-suite executed in-page across every state: `elementFromPoint` coverage testing on all interactive elements, WCAG contrast computation on ~400 text nodes per state, clipped-text and overflow detection, fixed/sticky layer mapping (opacity, pointer-events, z-index), per-tab and per-subtab content sweep, blank-canvas detection, console/pageerror capture — run at 1440px and 390px, dark and light, FR and EN, on the planner, the longform standalone, and the longform embedded in the planner. Evidence (17 screenshots + 3 probe JSONs) in `buildfi_visual_evidence.zip`.

---

## A. Fixed since the last build — confirmed, don't redo

Encoding: **3,858 mojibake clusters → 0 real** (the 3 remaining matches are the detection regexes inside the now-dead `_repairVisibleText` band-aid functions — the band-aids themselves can be deleted, task A-cleanup below). The visible garbled arrow and `PropriÃ©tÃ©` are gone. Emoji chrome replaced by line icons in the rail and category row (desktop). FR number formatting live (`770 K$`, `1,3 M$`, `205 K$`). The rogue gold `#c49a1a` and DM Sans purged from the planner; `var(--bf-gold)` tokens in use. Fonts verified loaded (Inter, JetBrains Mono, Playfair Display). The longform embed now passes `?embed=1&lang=fr&theme=dark` and loads correctly inside the drawer. Light theme is broadly correct (one slab left — V5). Longform console: zero errors.

## B. Rendering blockers (new findings — functional, not cosmetic)

**V1 — The Rapport preview iframe blocks its own scripts.** Line 18854: `React.createElement("iframe", { srcDoc: reportHTML, sandbox: "allow-same-origin allow-popups", … })`. Without `allow-scripts`, every script inside the generated Bilan HTML is blocked (3 console errors at boot) — so the in-app report preview renders **dead charts, an inert Reading/Explore toggle, and no embedded simulator**: the flagship preview is a static husk. Since `reportHTML` is self-generated trusted content (and `allow-same-origin` already neutralizes the sandbox), either add `allow-scripts` or drop the sandbox attribute. **DoD:** zero "Blocked script execution in 'about:srcdoc'" console errors; preview charts paint; the Reading/Explore toggle works inside the preview.

**V2 — Legacy controls buried alive under the new rail, still keyboard-reachable.** Four old interactive elements sit underneath `bf-rail` at the same coordinates — `✕` (y≈22), `EN` (y≈183), `×` (y≈342), `F` (y≈869) — invisible and un-clickable (covered) but **tabIndex 0**: a keyboard user can focus and activate them blind. The old `EN` can desynchronize language state from the rail's new EN control; the old `F` is the legacy gender toggle — Tab-Tab-Enter can silently flip the profile's sex. Mouse users are safe; keyboard users are not. Remove the legacy chrome from the DOM (or `display:none`), don't stack over it. **DoD:** the elementFromPoint coverage probe (in evidence `probe2.json` → `legacy`) returns an empty list on every tab.

**V3 — Invisible full-screen click-shield kept armed.** `bf-overlay-backdrop` (1440×900, z-index 8400) stays mounted with `opacity:0` **and `pointer-events:auto`** at all times. Its siblings do it right (`bf-side-overlay`, `bf-drawer`, `bf-drawer-backdrop` all switch to `pointer-events:none` when hidden). Today its stacking context happens not to intercept the main content, which is exactly the kind of luck that dies in the next refactor; an invisible interactive layer also pollutes hover/cursor behavior. Set `pointer-events:none` whenever opacity is 0. **DoD:** layer map shows `pe:none` for every fixed layer with `op:0`.

## C. High-visibility visual defects

**V4 — Metric strip's first card clips under the toolbar** — reproduced in dark, light, and at 390px (the A+ grade-ring card renders half-hidden behind the action row; on light it's a grey ghost box). This is the P3 stacking bug, still live; the strip also still duplicates the Mesures-clés cards below it, so the P3 redesign (sticky-on-scroll condensed summary) resolves both. **DoD:** at load, no element of the strip is occluded at 1440/390 in both themes (coverage probe clean for the strip), and the strip appears only after the KPI cards scroll out.

**V5 — The Parcours bar survived (P2) and is the last unthemed slab (P5).** Visually present on all builds (my earlier grep missed it — it's lowercase + CSS `text-transform`); in light mode it stays charcoal (`bf-progress-bar`, rgba(44,40,32,.95)) with dark-grey step labels at roughly 2:1 — unreadable *and* off-theme. Either complete P2 (remove it, relocate "prochaine étape" into the verdict card) or, minimally, theme it and lift the label contrast. **DoD:** light-mode dark-slab detector (`probe2.json` → `dark_slabs`) returns only intentional navy components; no text under 4.5:1 in the bar.

**V6 — Contrast failures (P7 unstarted), measured:** KPI value `Jamais` 3.4:1 at 14px (a primary metric); `🔵 Standard` 2.6:1; `🗑 Réinitialiser` 3.6:1; tab badge digits **8px at 4.1:1**; in light mode the metric-strip values render grey-on-white. Longform sits just under the line: a 4.3:1 cluster (EN toggle, `🎯 What-if`, `⤢ Tout ouvrir/fermer`, section descriptions at 12–13px). **DoD:** contrast probe returns zero items <4.5:1 (normal text) across dashboard dark+light and longform.

**V7 — Type floor violations:** the 8 rail labels (Profil…Pension) render at **9px**; tab badges at **8px**; longform chips (`suggéré`, `non revue`, `⏱ 5/11`, `Niche · spécifique`) at 10px. Raise rail labels to ≥10.5px (or icon-only + tooltip), badges to ≥10px. **DoD:** tiny-text probe empty at <10px.

**V8 — Formatter miss:** the strip shows `6 091$/m (dès 67)` — no space before `$` — while the cards correctly show `770 K$` / `73 K$/an`. One call site bypasses `bfFmtMoney`. **DoD:** grep a rendered FR DOM dump for `\d\$` → 0 hits.

**V9 — Mobile (390px):** nine tap targets under 34px — `◀` 14px wide, `×` 15px, `✕` 23px, the icon-only **Rapport tab at 26px**, Standard/Expert pills 28px; the bottom tab bar still uses **emoji icons** (mixed icon systems: line icons up top, emoji at the bottom — P1 incomplete on mobile); chrome before content is still ~330px of an 844px screen (P2's mobile payoff unrealized); the strip clip (V4) reproduces. **DoD:** all visible interactive elements ≥34×34 effective hit area at 390px; one icon system everywhere.

**V10 — Bottom fixed bars occlude the last content rows:** the 19px disclaimer bar (opacity .7) plus the version stamp overlay the final table rows on every tab (visible on the Bilan table). Add `padding-bottom: 56px` to the scroll container. **DoD:** scrolled-to-bottom screenshot shows the last row fully above the bars.

## D. Longform-specific

**V11 — Mobile FAB overlap, now quantified (prior D1, still open):** `Simuler mon plan` covers **1 input at load and 4 elements at full scroll**; the standalone `<main>` has `padding-bottom: 0px` while the embed CSS already carries 120px. Copy the padding to the standalone <680px path. **DoD:** FAB-overlap probe (`probe3.json` → `lf_fab*`) returns 0 covered elements at both scroll positions.

**V12 — The old gold migrated INTO the longform:** `#c49a1a` (+ alpha variants `1f`/`55`) ×7 — the longform is now the token outlier (prior D2). Replace with `var(--bf-gold)` + derived alphas. **DoD:** `grep -c '#c49a1a' planner_longform.html` → 0.

**V13 — i18n gaps in EN mode:** planner EN still shows `Épargne`, `Dépenses`, `Patrimoine`, `Réinitialiser` (rail + drawer strings outside the i18n map); longform EN leaves `retraite`, `médiane` in the suggestion chips. **DoD:** EN-mode FR-word scan (probe lists) returns empty for chrome strings.

## E. Environment notes (not bugs in these files)

The 9 `ERR_FILE_NOT_FOUND` are the `report/*.js` assets absent from this sandbox; with them missing the Rapport tab degrades to a ~1.9K-char shell — once V1 is fixed, add a friendly "report assets unavailable" state for this case rather than a silent husk. The per-subtab sweep found **no blank views and no blank canvases** anywhere else — all charts are SVG and render (20+ SVGs per view). Duplicate IDs: 0. Horizontal overflow: 0 at every width. `bf-drawer` (1280×900) stays mounted while hidden — correct `pe:none`, just a perf nit.

## Priority order

1. **V1** (the product's centerpiece preview is dead) → 2. **V2 + V3** (input-integrity hazards, trivial fixes) → 3. **V4 + V5** (the two defects every user sees in the first five seconds) → 4. **V6 + V7 + V8** (one contrast/type/formatter pass) → 5. **V9** (mobile pass) → 6. **V10–V13** + delete the dead `_repairVisibleText`/`_maybeFixMojibake` band-aids. Re-run acceptance with the same probes — all three JSONs in the evidence zip are regenerable via `vrprobe.py`/`vrprobe2.py` (included in the zip's JSONs' provenance), and every DoD above is expressed as a probe output so Claude Code can self-verify without eyeballs.
