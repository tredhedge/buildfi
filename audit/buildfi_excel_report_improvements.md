# BuildFi — Export Excel (« Données détaillées ») : Audit & Work Order
## Specimen: Émilie Lavoie, 30 ans, QC — succès 49,7 %, note C — Moteur v12.0.0, 2026-06-12
### Target file: `report/report-excel.js` · Demo of fixes: `buildfi-donnees-detaillees-Emilie-Lavoie-FIXED.xlsx`

**Method:** full openpyxl inspection (15 sheets, every cell format, fonts, fills, merges, freeze panes, defined names, conditional formatting, print setup), LibreOffice recalculation (344 formulas — **0 errors**, genuinely clean), and PDF rendering of key pages to verify what the user actually sees. Every defect below was confirmed on the rendered output, and the worst ones are already corrected in the attached FIXED workbook so you can diff before/after.

## What's already excellent — protect this through the fix

The architecture is the strongest part of the whole export: a real **cover** with engine version + traceable report ID, a **README** explaining how to read the file, a **Sommaire** with named KPIs, **Diagnostic** (forces/vulnérabilités/leviers in clean AMF-conditional French), deterministic projection vs **Monte Carlo percentiles** side by side with a Δ-formula column, **phase-structured withdrawal schedule** with notes, the **depletion-age percentile table** (P5 68 / P50 95 / P75 Jamais), a **Méthodologie** sheet that honestly discloses t-Student df=5 and the MC blend, custom **footers with pagination and the educational disclaimer**, the negative-red-parens-dash format on withdrawals, six **defined names** (SuccessRate, MedianWealth…) ready for power users, zero text-stored numbers, and real full-precision values throughout. This is a designed document, not a dump. The defects are almost all in the *display layer* — which is exactly why they're cheap to fix and expensive to leave: Excel users see them instantly.

---

## E1 — CRITICAL: the literal-percent format corrupts every rate in the workbook
The format `0.0\%` (backslash-escaped `%` = **literal** suffix, no ×100) is applied to cells holding **0–1 fractions**. Rendered result, verified on page: the Québec tax grid's marginal rates display **« 0,1 % / 0,3 % / 0,4 % / 0,5 % »** instead of 14 % / 25,7 % / 36,1 % / 45,7 %; every `Taux eff.` formula (`=IFERROR(E/B,0)` in Fiscalité, 51 × `=IFERROR(K/M,0)` in Flux de trésorerie) shows ≈0,1 %; Sommaire's « Taux effectif moyen » shows « 0,2 % » for 16 %. Meanwhile the true multiplying `0%` format is used correctly elsewhere — two conventions coexist and one is fed the wrong scale. **Fix:** replace `0.0\%` with `0.0" "%` (multiplying, one decimal, FR space) wherever the stored value is a fraction — the FIXED workbook patches 143 such cells. Keep the literal format ONLY for the Méthodologie cells that store pre-multiplied values (5.5 = 5,5 %); better, normalize those to fractions too so one convention survives. **DoD:** open the Fiscalité grid — top combined marginal must read **53,3 %**; grep the generator for `0.0\\%` → 0 occurrences.

## E2 — Success rate displays « 50% » on the cover of a grade-C plan
`0.497` under bare `0%` rounds to **50%** on Couverture and Sommaire while the grade ring says C and the diagnostic prose says 50 % too (the rounding even leaked into the generated text). One decimal everywhere: `0.0" "%` → **49,7 %**. **DoD:** cover, Sommaire, Diagnostic prose and the planner UI all show the same one-decimal figure.

## E3 — Tornado formatted as dollars, with float noise and inconsistent signs
Sensitivity impacts are success-rate **points** (32.3, −21.7) but carry `#,##0" $"` → the sheet literally prints **« 32 $ / -22 $ »**. Values also ship as `28.299999999999997`, the `Interprétation` column is empty, and sign conventions flip between rows (Inflation: négatif +32,3 / positif −21,7; Âge retraite: négatif −11,7 / positif +14,3). **Fix (in FIXED):** headers gain « (pts de %) », values rounded to 1 decimal, format `+0.0;-0.0;"—"`. **Engine-side:** emit consistent semantics — `négatif` = Δsucc when the factor moves adversely (always ≤ 0). **DoD:** no `$` in the Tornado block; signs consistent across all six factors; Interprétation populated or column removed.

## E4 — Freeze panes anchored at the LAST-WRITTEN row, not the header
Measured anchors: MC — Patrimoine frozen at **A107 of 116 rows**, Fiscalité A53, Retraits A29, Profil A26, Succession A17, Couverture A2 — scrolling is broken on every long sheet (the top 50–106 rows lock). The writer clearly reuses its row cursor for `freeze_panes`. **Fix:** freeze just below each header band (A6 for the series sheets, A8 where a phase header precedes) — done in FIXED. **DoD:** scrolling any series sheet keeps exactly the title + column-header rows pinned.

## E5 — Orphan bold value on the MC sheet
`B3` holds **24 270 664,02 $** alone under the title with no label (it's the P95 final), and the P5…P95 mini-table at row 4 has headers but its values row collided away. **Fix (in FIXED):** label « Meilleur scénario (P95) — patrimoine final : » + value moved beside it; rebuild the mini-table row in the generator. **DoD:** no unlabeled numbers anywhere in the workbook.

## E6 — Succession shows « Résultat le plus probable : −1 200 $ »
P5/P25/P50 héritage net all equal **−1 200 $** — an engine clamp artifact from depleted paths, displayed as the most-probable inheritance, in plain format (not even the red-parens). **Fix (in FIXED):** floor ruined-path percentiles at 0 with the dash-for-zero format and an explanatory footnote. **Engine-side:** trace the constant −1 200 (last uncovered flow?) and clamp at source. **DoD:** no negative estate values; footnote present when P50 = 0.

## E7 — Raw floats and a collapsing composite on the Sommaire
`J8` CoverageRatio sits as `0.3388445801008686` (format saves the display, but store rounded values for copy-paste hygiene); **ResilienceScore F10 = 0 %** because « succès × marge VaR5 » multiplies to zero the moment VaR margin is nil — a composite that flatlines for every fragile plan while « Couverture 34 % » sits beside it. Replace with a min() or weighted blend, or drop it. **DoD:** no KPI reads 0 % while its inputs are nonzero; stored KPI values ≤ 4 decimals.

## E8 — Identity & metadata nits
Filename slug drops the accent: « **milie-Lavoie** » for Émilie (Unicode-normalize: É→E, ç→c before slugging); cover subtitle « Rapport financier␠ » trailing space; workbook `title` property empty (set « BuildFi — Données détaillées — {client} »). **DoD:** `buildfi-donnees-detaillees-Emilie-Lavoie-….xlsx`; no trailing spaces in cover strings.

## E9 — Méthodologie: internal names + a cross-surface contradiction
The client-facing sheet prints `optimizeDecum()`, `Cholesky 5×5`, `MC blend 70/30`, `Go 100 % / Slow 85 % / No 75 %` — humanize the labels (the *substance* is great transparency; the function names are noise). More important: it states « **5. Mortalité — Déterministe** » while the planner and Avis légal claim CPM-2023 stochastic longevity. Either the export's description is stale or this run truly used fixed death age — reconcile, because a careful reader (or regulator) will notice. **DoD:** no code identifiers on client sheets; mortality description matches the engine's actual behaviour and the website's claim.

## E10 — Totals are hardcoded; TOTAL rows show « 0 » under Âge
Phase TOTAL rows print `0` in the Âge column and carry pasted sums; Sommaire KPIs are values with **zero cross-sheet links**, so the six defined names point at dead numbers. **Fix (in FIXED):** TOTAL ages blanked, totals converted to `=SUM()` over their phase block. **Generator:** emit `=SUM()` for every total and make Sommaire KPIs reference their source sheets — the skill rule is formulas, not hardcodes, precisely so the file stays auditable. Truncated note « moy. 110… » → widen or wrap. **DoD:** recalc still 0 errors; deleting a phase row visibly breaks its total (proof of liveness).

## E11 — Print & navigation polish
Confirmed on render: the **cover clipped its 3rd and 4th KPI cards and the disclaimer** because `fitToPage` wasn't flagged (fitToWidth=1 alone is inert) — fixed in FIXED, which also revealed a previously invisible « Alpha fiscal 0 $ » cover card (see E14). Added in FIXED and to adopt in the generator: **landscape + repeated header row (`5:5`) + autofilter** on the five year-series sheets, **tab colours** (gold Couverture/Sommaire, navy analysis, grey annexes). Still open: hide gridlines on presentation sheets (Couverture/Sommaire/Diagnostic) so the cream cards float clean. **DoD:** print-to-PDF shows no clipped content on any page; every series sheet repeats its header on page 2+.

## E12 — The export makes engine bug 1.1 auditable
Flux, age 60: Dépenses 106 021,82 $, Retraits **106 021,82 $** (identical), Impôt 14 896,64 $ recorded **with no funding source** — any user who adds a check column `Retraits − Dépenses − Impôt` gets −14 897 $ every retirement year. The spreadsheet faithfully self-incriminates the unfunded-tax defect. No export-side fix exists: this lands automatically when engine Tier-1.1 ships, and the Excel becomes the cheapest regression test for it. Same dependency for Sommaire's « Épuisement P5 à 68 ans » (p5Ruin, unsorted-array bug 2.11). **DoD:** post-engine-fix, the check column sums to 0 ± rounding.

## E13 — Empty diagnostic bullet
A grade-C plan renders « ✔ FORCES → • — » (verified on page). FIXED replaces it with a real sentence; the generator should emit a graceful empty-state line instead of a dash bullet. **DoD:** no « — » placeholders on Diagnostic.

## E14 — The « Optimisé vs Par défaut » comparison is a stub, and TaxAlpha is broken
Sommaire's comparison table has **only the « Votre plan » column populated** — « Par défaut » and « Delta » are empty on every row; the Fiscalité sheet repeats the same half-table; the defined name **TaxAlpha → Sommaire!$L$8, an empty cell** (row 8 populates B–J only); and the cover now displays « **Alpha fiscal 0 $** » for a run where no naive comparison executed. This is the Excel twin of the AI-pipeline finding A3 (fabricated/empty tax alpha): when the naive run is absent, **omit the section, the cover card, and the defined name** — don't ship a skeleton implying a measurement. When present, fill all three columns and point TaxAlpha at the real delta. **DoD:** either a fully populated comparison or no comparison artifacts at all; defined names resolve to non-empty cells.

---

## Priority order
1. **E1** (every rate in the file is wrong on screen) → 2. **E4** (scrolling broken) → 3. **E2 + E3 + E5 + E6** (cover credibility + visible nonsense) → 4. **E14** (skeleton section / broken name) → 5. **E10 + E11** (live formulas, print) → 6. **E7–E9, E13** polish. E12 rides the engine fix.

All of 1–3 plus most of 4–5 are already demonstrated in `buildfi-donnees-detaillees-Emilie-Lavoie-FIXED.xlsx` (recalc-verified, 0 errors) — hand both files to Claude Code with the instruction: *make `report-excel.js` produce the FIXED behaviour natively, using the diff between the two workbooks as the spec.* Acceptance: regenerate Émilie's export, run `recalc.py` (0 errors), render to PDF, and check the four anchors — marginal 53,3 %, cover 49,7 %, Tornado in pts, MC sheet scrolls from row 6.
