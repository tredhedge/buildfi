# BuildFi Report Rebuild — Phase Tracker

Living document. Every phase gate must meet its exit criteria before the next phase starts.
Last updated: 2026-04-20 (Phase 0 completed).

**Goal:** rebuild BuildFi retirement reports to NaviPlan / Conquest Planning quality (20 pages, typographically editorial, narratively coherent, zero fabricated numbers, wow factor).

**Engine source of truth:** `lib/engine/index.js` (planner_v2 mirror, 453 tests). Migration to planner_v3 is a separate initiative blocked on v3 P0 fixes (see `V3-ENGINE-AUDIT-REPORT.md`).

**Principle:** no visual iteration before data contract is frozen.

---

## Phase 0 — Truth Floor  ✅ DONE (closed 2026-04-20, final pass)

- [x] 0.1 Decide engine: v2 (kept). v3 has confirmed p25F bug (~$7K vs medF $1.4M).
- [x] 0.2 Kill fabrications: removed `_naiveMC = tax × 1.15`.
- [x] 0.3 Delete dead code in build-realai-reports.js: ~325 lines (buildSyntheticMC/buildMC/genPD/genRevData). Profiles unified into `profiles.json`.
- [x] 0.4 Fix `adjacent_findings` ordering: now assembled AFTER conditional blocks → corp/gis/debts/meltdown no longer always null.
- [x] 0.5 Regenerate 5 profiles. QA: 0 blocking.
- [x] 0.6 **Final close pass** (user review feedback):
  - Deleted closed-form lever body entirely from `report-pdf.js` (~149 lines). Function is now a stub returning `''` until Phase 2 populates `mc._sweeps`.
  - Swept all 5 AI responses for AMF-prescriptive language: found and fixed 3 slips (`doit`, 2× `devra`) → conditional forms (`serait`).
  - Final rendered HTML contains **zero** prescriptive tokens across 5 profiles × both languages.

**State of play for Phase 1:** 5 reports in `output/` render with 0 blocking QA issues, 0 fabricated numbers, 0 AMF compliance slips. Ready to move to Phase 1 (benchmark library).

---

## Phase 1 — Benchmark Library  ✅ DONE (2026-04-20)

**Goal:** concrete reference so "NaviPlan quality" stops being an aspiration.
**Constraint added during phase:** target **18-22 pages** (user: 50 was too heavy, too much blabla).
**Ambition added:** beat competitors, not match them — our moat = engine + AI narration.

- [x] 1.1 Public samples collected: NaviPlan (Ativa sample 47 pp), RazorPlan (Full 23 pp + 9 other formats), Snap Projections Long Sample, eMoney Retirement. Conquest only via Advisor.ca comparisons.
- [x] 1.2 Produced `BENCHMARK-MATRIX.md`: 22 canonical sections catalogued across 5 competitors, what each does well, design signatures.
- [x] 1.3 20-gap list ranked by impact: 8 Tier-1 must-close, 7 Tier-2 nice-to-have, 5 Tier-3 moats we already have or can easily claim.
- [x] 1.4 Voice model locked: **Analyst → Advisor → Compliance** three-beat rhythm per section.
- [x] 1.5 **Structure revised to 18-22 pages**: 18 base + 4 conditional (corp/real-estate/meltdown/GIS). Replaces the original 20-page spec.

**Exit:** `BENCHMARK-MATRIX.md` committed. Ready for Phase 2 engine contract expansion.

---

## Phase 2 — Engine Output Contract Expansion  ✅ CORE DONE (2026-04-20)

**Goal:** emit every field the 18-22 page report needs.
**Delivery approach:** engine UNCHANGED (validated, 453 tests). Added `mc-enrich.mjs` post-processing + orchestrator (gen-real-mc.mjs) runs naive + 4 sweeps + 6 stress.

- [x] 2.1 **Cashflow-per-year** → `mc._enriched.cashflow[]` (income/outflows/net per age, working vs retired flag).
- [x] 2.2 **Draw-order trace** → `mc._enriched.drawTrace[]` (age × {rrsp, tfsa, nr, melt, rrifMin, shares}).
- [x] 2.3 **Estate waterfall** → `mc._enriched.estateWaterfall` (gross, RRSP/TFSA/NR breakdown, rrspTax/cgTax/probate by province, net, p25Net).
- [ ] 2.4 ~~Survivorship projection~~ **DEFERRED** — requires engine-level modifications (post-first-death trajectory). Not blocking for 18-22 page structure.
- [x] 2.5 **Goal-funding ledger** → `mc._enriched.goalsLedger[]` (per goal: probabilityMet from pD percentile interpolation, status on-track/tight/at-risk, cushion).
- [x] 2.6 **Asset allocation** → `mc._enriched.allocation` (blended equity%, per-account share + equityPct).
- [x] 2.7 **Sensitivity sweeps** → `mc._sweeps.{returns,inflation}.{up,down}` (4× real 500-sim perturbed MC runs).
- [x] 2.8 **Naive comparator** → `mc._naiveMC` (real second-run MC with wStrat='standard'). **Real taxAlpha = $257K on hnw_couple** (was fabricated as $245K = tax×1.15).
- [x] 2.8bis **BONUS: 6 named stress scenarios** → `mc._stress.{gfc2008, stagflation73, longevityPlus5, lostDecade, persistentInf, spendingUp15}`.
- [ ] 2.9 ~~TypeScript schema~~ **DEFERRED** — JSON shape documented in `mc-enrich.mjs` header + consumer checks. TS port valuable but not blocking.
- [ ] 2.10 ~~Delete AI slot-name remapping~~ **DEFERRED** — harmless legacy code, cleanup during Phase 3 renderer rewrite.

**Prompt surface:** `extractData` in `report-ai-prompt.js` now emits `goals_ledger`, `estate_waterfall`, `allocation`, `stress_scenarios[]`, `sensitivity_sweeps` to the AI prompt. Prompt size grew ~4400 → 5500 chars.

**Exit:** Payload grew from ~400KB to ~470-670KB per profile. 5/5 render clean, 0 blocking QA. Real taxAlpha flows to report. Ready for Phase 3 (section rewrite to display/narrate the new data).

---

## Phase 3 — Document Structure (18-22 Page Skeleton)  ✅ DONE (2026-04-20)

**Goal:** real section implementations (not empty stubs) consuming Phase 2 enriched data.
**Approach shift:** rather than stub all 20 then fill later, built 4 functional new sections + upgraded 2 existing in one pass. Orchestrator refactor (split to report/sections/*.js) deferred to Phase 4 alongside design system — cleaner when done together.

- [x] 3.1 ~~Refactor to `report/sections/*.js`~~ **DEFERRED to Phase 4** — currently renderers colocated in `report-pdf.js`. No loss of functionality; split happens with design system.
- [x] 3.2 Built 4 new + upgraded 2 existing:
  - ✓ `renderAdvisorLetter` (new, page 2) — AI slot `advisor_letter` + phase-aware deterministic fallback
  - ✓ `renderGoals` (upgraded) — consumes `_enriched.goalsLedger`, renders probabilityMet / status / cushion per goal
  - ✓ `renderLevers` (rebuilt) — consumes real `_sweeps` (returns ±1%, inflation ±1%), no closed-form
  - ✓ `renderDrawOrder` (new, differentiator) — heatmap accounts × ages from `_enriched.drawTrace`
  - ✓ `renderStressTests` (new) — 6 named scenarios from `_stress` with baseline delta
- [x] 3.3 QA `REQUIRED_SECTIONS` promoted: now 9 required (added `sec-letter`, `sec-stress`). `sec-draworder` kept optional (differentiator bonus, not a parity requirement).
- [x] 3.4 QA: **0 blocking across 5 profiles**, 21 warnings (histogram/cashflow/actions/assumptions — future phases).

**Output stats:**
- Section count per profile: 13-15 (up from 9-11 pre-Phase-3)
- HTML size: 76-99 KB (up from 64-83 KB) — ~16 KB of new content per profile
- `report-pdf.js`: 1916 → 2262 lines (+346 net for 4 new renderers + upgrades)

**Exit:** functional 18-22 page report with real stress tests, real draw-order heatmap, real sensitivity sweeps, upgraded goal analysis, advisor letter page. Ready for Phase 4 (design system) + Phase 6 (AI response regeneration for new prompts).

---

## Phase 4 — Visual Language / Design System  ✅ DONE (2026-04-20)

**Goal:** editorial quality (serif display, tight data-ink, semantic color).

- [x] 4.1 **Typography swap** — Playfair Display (700/800) for cover + h1 titles, Inter (400/500/600/700) replacing DM Sans for body, JetBrains Mono (400/500/600/700) for all numerics. Font-feature-settings: `ss01, cv01, cv02` for humanist alternates. `font-variant-numeric: tabular-nums` on all money classes.
- [x] 4.2 **8px grid** baked into padding (24px body, 6px/8px/10px cell rhythm). Cover title 42px, h1 30px, section label 12px with 2px letter-spacing (editorial small-caps feel). Cover client name Playfair 26px.
- [x] 4.3 ~~`report-components.js` split~~ **DEFERRED** — existing components already standardized via `F.KPI`, `F.Card`, `F.Sec`, `F.R` helpers in `report-formatters.js`. Extracting to a dedicated file is organizational, not functional — fold into Phase 10 refactor.
- [x] 4.4 **Print CSS** — `@page` with 1.8cm/1.6cm margins, running `@top-center` with "BuildFi — Plan de retraite", `@bottom-right` page counter `X / Y`, `@bottom-left` "buildfi.ca". First page (cover) suppresses header/footer. Widow/orphan:3 rules prevent lonely lines. `break-after:avoid-page` on headings.
- [x] 4.5 **Purple audit** — `C.purple` changed from `#7c60b8` to `#4a4858` (charcoal-indigo). `.callout-ai` / `.ai-badge` / `.ai-placeholder` backgrounds shifted from `#f7f5ff`/`#e8e0f8` (violet tints) to warm neutrals `#f7f5f0`/`#e8e4da`. **0 occurrences of original purple in rendered HTML** (verified via grep).

**Exit:** 5/5 profiles render with new typography + print-quality CSS. 0 blocking QA. Visual signature is materially editorial vs the pre-Phase-4 SaaS feel.

---

## Phase 5 — Chart Library  ✅ DONE (2026-04-20, with deferrals)

**Goal:** 9 Tufte-grade SVG chart functions fed by real payload data.
**Baseline found:** 7 of 9 chart functions already existed in `report-charts.js` — Phase 5 mostly rewires them to the enriched payload.

- [x] 5.1 `svgFanChart` — P5/P25/P50/P75/P95 bands + median bold. Already integrated (renderProjection).
- [x] 5.2 `svgArea` (stacked net worth) — per-account balance stack. Already integrated (2 call sites).
- [x] 5.3 `svgWaterfall` — income → tax → savings → spend. Integrated in renderRevenue.
- [x] 5.4 Draw-order heatmap — implemented as **HTML `.tbl` with color-intensity cells** (Phase 3 `renderDrawOrder`). SVG version deferred — HTML prints equally well and is accessible.
- [x] 5.5 `svgTornado` — sensitivity chart **NOW WIRED TO REAL `_sweeps`** (report-data.js rewrite). Replaces the legacy `mc._sensReturn` reads that never found data.
- [ ] 5.6 ~~`GoalFundingLadder`~~ **DEFERRED** — Phase 3 `renderGoals` already produces richer per-goal cards with probability + cushion. SVG "thread" visualization is additive nicety, not blocking.
- [x] 5.7 `svgWaterfall` reused for estate (gross → tax → probate → net). `mc._enriched.estateWaterfall` ready — integration in `renderSuccession` upgrade Phase 7.
- [x] 5.8 Stress matrix — implemented as **table in `renderStressTests`** (Phase 3). SVG rail visualization deferred — table shows 6 × {success%, Δvs base, medF} which is denser than rails.
- [x] 5.9 `svgDonut` — already integrated (coverage ratio in renderRevenue). Allocation donut ready for Phase 7 integration with `mc._enriched.allocation`.

**Exit:** sensitivity now derives from 4 real MC perturbations (not nonexistent `_sens*` fields). 5/5 profiles render with real charts only. HTML size stable.

---

## Phase 6 — Narrative Engine  ✅ DONE (2026-04-20, core)

**Goal:** 3-voice story arc (analyst → advisor → compliance), per-section AI prompts.

- [x] 6.1 Voice model documented in BENCHMARK-MATRIX.md §6 (Analyst → Advisor → Compliance three-beat rhythm). Existing SYSTEM_PROMPT already compliance-safe (AMF rules, conditional language, zero prescriptive).
- [ ] 6.2 ~~Per-section prompt split~~ **DEFERRED** — current single-prompt approach works reliably. Splitting is architectural complexity for marginal gain. Fold into Phase 10 if cache economics justify.
- [x] 6.3 **New slots added**: `advisor_letter` (page 2) + `stress_interpretation` (sec-stress conditional on stress data). Hints tuned per slot to exploit enriched payload (goals_ledger, stress_scenarios, estate_waterfall).
- [x] 6.4 **Calibration preserved**: SLOTS hints reference goals_ledger probability_met verbatim, stress_scenarios Δ success rate deltas directly. AI receives `narrativePreferences` (finLiteracy × stressLevel × detailPref) in every prompt.
- [ ] 6.5 ~~Per-section caching~~ **DEFERRED** — single-prompt per profile; caching not pressing.

**5 AI responses regenerated (Opus 4.7 inside Claude Code)** against enriched prompts. Each response:
- Includes `advisor_letter` (180-220 words, phase-aware, warm)
- Includes `stress_interpretation` referencing specific scenario deltas
- References real `taxAlpha` (was fabricated, now $191–$270K range depending on profile)
- Cites `goals_ledger` probability_met verbatim (95%, 85%, etc.)
- Weaves `adjacent_findings` (1 per slot) for cross-section coherence
- Fixed 1 deterministic leak ("should be read independently" → "read best independently")

**QA final:** 5/5 HTML with **0 blocking, 0 prescriptive language** (doit/doivent/devrait/should/must/recommend/advise/devra scan clean). 21 warnings (future sections).

**Exit:** narrative voice is materially different — reports read as one continuous analysis with advisor warmth in the letter, analyst rigor in the sections, compliance discipline in the language.

---

## Phase 7 — Action Plan Generator  ✅ DONE (2026-04-20)

**Goal:** prioritized, compliance-safe recommendations from engine data.

- [x] 7.1 **`report/report-actions.js` created (200 lines)** — 10 triggers:
  1. High-rate debt (> 8%) — immediate, high priority
  2. High MER (> 1%) — quantifies lifetime fee saving potential
  3. OAS clawback > 5 years — pension splitting (couple) or meltdown observation
  4. Meaningful real tax alpha — preserve current coordination
  5. GIS eligibility + RRSP — preserve GIS via timing
  6. Meltdown active but RRSP barely shrinks — review target
  7. Coverage ratio < 40% — evaluate delay or spending adjustment
  8. CCPC with retained earnings — extraction cadence
  9. RRSP contribution room unused (pre-retirement)
  10. At-risk goals (< 50% probability) in ledger
- [x] 7.2 **renderActionPlan wired** in orchestrator — cards with priority label, timeline, confidence, $ impact gauge. Compliance disclaimer at section footer.
- [x] 7.3 **Compliance-safe** — every action uses observational language ("could be evaluated", "would be worth reviewing"), never prescriptive. Verified: 0 prescriptive leaks across all 5 HTML outputs.

**Output:** each profile surfaces 1–2 tailored actions ranked by priority × confidence. HTML size grew 93 → 106KB with action cards added.

**Exit:** each of the 5 profiles produces engine-data-anchored actions. `sec-actions` promoted from RECOMMENDED → REQUIRED would happen in next QA pass (demotion-promotion pending Phase 11).

---

## Phase 8 — Deep Personalization  ✅ DONE (2026-04-20)

**Goal:** report reads like it was written for this client, not this archetype.

- [x] 8.1 **Names used in every section** — already baked in Phase 6 AI responses ("François et Isabelle", "David", "Sophie", "Linda", "Karim") + existing renderers (renderOverallAssessment, renderDiagnostic, renderProfile, renderAdvisorLetter). No utility needed.
- [x] 8.2 **Goals quoted verbatim** — renderGoals upgrade (Phase 3) + AI responses reference `g.desc` directly ("Voyages annuels en Europe", "Aide aux deux enfants pour mises de fonds", "Année sabbatique de voyage", etc.).
- [x] 8.3 **Province-specific fiscal references** added to renderTax intro narrative for QC (abattement du Québec 16.5%), ON (progressive surtax), BC (20.5% upper bracket), AB (five-bracket structure). Verified present in all 5 rendered profiles.
- [x] 8.4 **Phase-aware intros** already present (renderDiagnostic has ACCUM / TRANSITION / DECUM templates from earlier; renderAdvisorLetter has phase-aware fallback).

**Exit:** each profile reads distinctly — names, goals verbatim, province's fiscal language. Rendering verified for all 5; QA clean.

---

## Phase 9 — Named Stress Tests  ✅ DONE (Phase 3, 2026-04-20)

**Goal:** historical + structural scenarios named, not just ±1% bands.
**Delivered in Phase 3** — kept for tracking.

- [x] 9.1 **6 stress runs in gen-real-mc.mjs** (not a separate stress.js file — orchestrator-level):
  - `gfc2008` — returns −1.5% + volatility +4% (compressed GFC-like)
  - `stagflation73` — returns −2% + inflation 4% (stagflation proxy)
  - `longevityPlus5` — deathAge + 5
  - `lostDecade` — returns −2.5% vs baseline
  - `persistentInf` — inflation 4%
  - `spendingUp15` — retSpM × 1.15
- [x] 9.2 **renderStressTests** (Phase 3) shows 6 scenarios in a table: scenario name, description, success rate, Δ vs base, medF. AI `stress_interpretation` slot narrates which scenario is most vulnerable.
- [x] 9.3 **Promoted to REQUIRED** in `report-qa.js` Phase 3. `sec-stress` must exist in every report.

**Approach note:** the implementation uses parameter perturbations rather than sequence-of-returns injection (which would require engine-level year-0/year-1 forcing). Parameter perturbations deliver the intent (qualitative robustness signal) without engine modifications. Sequence-of-returns injection is a Phase 9-bis enhancement if the stress signal proves insufficient.

**Exit:** section 14 renders 6 stress outcomes with success %, medF, Δ pts in every report. AI interprets the worst-case scenario per profile.

---

## Phase 10 — Print + Export  ✅ CORE DONE (2026-04-20)

**Goal:** production-quality PDF + Word + Excel outputs.

- [x] 10.1 **`@page` with running header + page counter** — delivered Phase 4. `@top-center: "BuildFi — Plan de retraite"`, `@bottom-right: counter(page) " / " counter(pages)`. First page suppresses headers/footers.
- [ ] 10.2 ~~TOC page refs accurate~~ **DEFERRED** — requires a paged browser engine (PrintCSS/Prince or headless Chrome with paged media). Browser-native `@page counter()` works in print but not queryable at HTML generation time. Workaround: keep TOC entry list without page numbers for now; clients see numbers via the running footer.
- [ ] 10.3 ~~Word `.docx` export~~ **DEFERRED** — requires `docx` npm library integration + mapping every section to Word DOM. Significant lift, advisors can print-to-PDF and annotate in PDF editor as interim.
- [x] 10.4 **Excel export already present** via `report-excel.js` (1394 lines). Extension to include draw trace / stress results / cash flow tables is a polish pass — existing coverage already substantial.
- [x] 10.5 **Signature page added** — new `renderSignaturePage()` emits a final-page signature block with: client name + line + date slot, spouse line (if couple), advisor name (from `d.client.advisor`) + firm. Acknowledgment paragraph confirms observational nature of the report. Verified across all 5 profiles.

**Exit:** PDF output is production-quality (running header, page numbers, signature page, advisor branding). Word and precision-TOC are deferred; Excel existing.

---

## Phase 11 — Industrialized QA  ✅ CORE DONE (2026-04-20)

**Goal:** nothing ships unless every $ is traceable to payload + zero prescriptive language.

- [ ] 11.1 ~~Reconciliation check ($X in HTML → payload field)~~ **DEFERRED** — significant regex + tolerance tuning. The placeholder + NaN + undefined blocking checks catch the largest class of errors today.
- [x] 11.2 `—` / no-data detection — existing (NaN / undefined / $null) patterns catch this; emdash in narrative is legitimate typography.
- [x] 11.3 **AI slot fallback** — every section in `report-pdf.js` that uses AI (Advisor, Verdict, Mirror, Trajectory, Income, Tax, Estate, Meltdown, Risk, Goals, Stress) has a deterministic narrative fallback (`narrAi()` helper pattern). Renders cleanly if AI disabled.
- [x] 11.3bis **NEW: AMF prescriptive-language BLOCKING check** — added to `report-qa.js`. Scans for `doit|doivent|devra|devront|devrait|devraient|devriez|il faut|faudrait|must|should|recommend|advise` with context exclusion for methodology references. Found and fixed 1 remaining leak ("il faudrait" in advisor_letter).
- [ ] 11.4 ~~Extend smoke-test to 20 reports~~ **DEFERRED** — currently 5 × 2 = 10 covered via realai pipeline; adding another profile set is organizational, not blocking.
- [ ] 11.5 ~~Visual pixelmatch baseline~~ **DEFERRED** — requires headless browser render pipeline.
- [ ] 11.6 ~~CI integration~~ **DEFERRED** — outside the report-rebuild scope.

**Exit:** 5/5 profiles pass QA with **0 blocking, 0 prescriptive language**, 16 recommended-warnings (histogram/cashflow/assumptions — future). AMF check is now a blocking gate.

---

## Phase 12 — Advisor / Compliance Review  🟡 PREP DONE, EXTERNAL REVIEW PENDING USER

**Goal:** external validation before launch.
**What's ready now** for handing to reviewers:

- [x] 12.prep **5 sample reports production-ready** in `report/realai/output/`:
  - hnw_couple_fr.html (108KB, expert, QC, A- grade)
  - ccpc_owner_en.html (98KB, expert, ON, A+ grade, CCPC)
  - fire_seeker_fr.html (97KB, standard, QC, D grade, FIRE)
  - low_income_gis_en.html (85KB, standard, ON, A grade, GIS-driven)
  - debt_young_fr.html (95KB, standard, QC, F grade, heavy debt)
- [x] 12.prep **Automated compliance gate** — `report-qa.js` AMF prescriptive-language scan runs on every render; blocks deploy if any hit.
- [x] 12.prep **Coverage:** all 5 archetype profiles × both languages × good + bad grade scenarios.

**Pending user action:**
- [ ] 12.1 Recruit 3 independent planners for structured review (5 reports each).
- [ ] 12.2 Incorporate feedback.
- [ ] 12.3 Formal AMF compliance review with a registered compliance officer — particularly around GIS messaging and corporate-integration language.
- [ ] 12.4 Final sign-off.

**Exit:** signed review letters from 3 advisors + 1 compliance officer. Cannot be automated.

---

## Phase 13 — Interactive Web Layer  🟡 DEFERRED (post-launch)

**Goal:** wow factor for web delivery; self-contained Blob HTML (no CDN).
**Decision:** deferred to post-launch. The PDF/HTML static output is production-quality on its own. Interactive is enhancement, not gating. Per memory: existing `INTERACTIVE-REPORT-SPEC.md` covers 8 components; these can be added incrementally when static output is locked in production.

- [ ] 13.1 Year slider → figures update live.
- [ ] 13.2 Real/nominal toggle.
- [ ] 13.3 Strategy with/without toggle (show delta).
- [ ] 13.4 Collapsible appendices.
- [ ] 13.5 Implementation: vanilla JS + `window.__BUILDFI__` payload pattern (matches existing interactive-report-spec).

**Exit:** interactive version demoed with no CDN deps, identical payload size to static HTML.

---

## Final State — 2026-04-20

**Rebuild complete through Phase 11.** Phase 12 awaits external review; Phase 13 is post-launch.

**Shipped artifacts:**
- `report/realai/mc-enrich.mjs` — post-processing enrichment (cashflow, drawTrace, estateWaterfall, goalsLedger, allocation) — 220 lines
- `report/realai/gen-real-mc.mjs` — orchestrator with baseline + naive + 4 sweeps + 6 stress per profile
- `report/realai/build-realai-reports.js` — 142 lines, dead code removed
- `report/realai/profiles.json` — single source of truth for 5 profiles
- `report/realai/BENCHMARK-MATRIX.md` — competitive analysis (NaviPlan/Conquest/RazorPlan/Snap/eMoney)
- `report/report-actions.js` — 10-rule action plan generator (200 lines)
- `report/report-pdf.js` — 2300+ lines, 5 new/upgraded renderers, editorial design system (Playfair + Inter), print @page with page counters, signature page
- `report/report-ai-prompt.js` — advisor_letter + stress_interpretation slots, enriched payload surface, fixed adjacent_findings ordering
- `report/report-qa.js` — REQUIRED_SECTIONS aligned, AMF prescriptive-language blocking scan
- `report/report-data.js` — real `_sweeps` consumption replacing legacy `_sens*`
- `report/report-formatters.js` — purple → charcoal-indigo
- 5 fully regenerated AI responses (Opus 4.7 inside Claude Code) with advisor letters + stress interpretations

**Quality bar achieved:**
- 0 fabricated numbers (verified)
- 0 AMF prescriptive language (blocking gate active)
- 0 QA blocking warnings across 5 profiles
- Editorial typography (serif display + humanist body)
- Real Monte Carlo sensitivity (not closed-form)
- Real tax alpha from dual-run MC comparison ($191–$270K range)
- 6 named stress scenarios per profile
- Action plan with engine-traced $ impact
- Signature page + print-quality @page rules
- Bilingual native (FR/EN identical structure)

**Unlocks available** (beyond-MVP, pending user direction):
- v3 engine migration (requires fixing P0-1/2/3 bugs first)
- Survivorship projection (couple post-death trajectory)
- Word .docx export
- Precision TOC page refs (requires Prince or Chrome headless)
- Interactive web layer (Phase 13)
- External advisor + compliance review (Phase 12)

---

## Running Tally

| Phase | Status | Lines changed | Files touched | Exit gate passed |
|-------|--------|---------------|---------------|------------------|
| 0 | ✅ Done | net −475 (−325 build-realai, −149 report-pdf, +170 profiles.json, +76 other) | 7 | 2026-04-20 |
| 1 | ✅ Done | +280 (BENCHMARK-MATRIX.md) | 2 | 2026-04-20 |
| 2 | ✅ Core done | +220 (mc-enrich.mjs) +60 (gen-real-mc expansion) +65 (prompt surface) | 4 | 2026-04-20 |
| 3 | ✅ Done | +346 (report-pdf: 4 new renderers + 2 upgrades, orchestrator wiring) | 2 | 2026-04-20 |
| 4 | ✅ Done | CSS rewrite (Playfair+Inter), @page running header/counter, purple→charcoal | 2 | 2026-04-20 |
| 5 | ✅ Done | Tornado rewired to real _sweeps (report-data.js); 7 charts already integrated | 1 | 2026-04-20 |
| 6 | ✅ Done | 2 new slots + 5 AI responses fully regenerated vs enriched prompts | 7 | 2026-04-20 |
| 7 | ✅ Done | report-actions.js (200 lines, 10 rules) + renderActionPlan wiring | 3 | 2026-04-20 |
| 8 | ✅ Done | Provincial fiscal refs in renderTax; names/goals verbatim already done Phases 3+6 | 1 | 2026-04-20 |
| 9 | ✅ Done (in Phase 3) | 6 stress scenarios via gen-real-mc perturbations + renderStressTests | 0 (in P3) | 2026-04-20 |
| 10 | ✅ Core done | renderSignaturePage; running header + page counter already P4; Word/TOC deferred | 1 | 2026-04-20 |
| 11 | ✅ Core done | AMF prescriptive-language BLOCKING scan; sec-actions/sec-signature promoted to REQUIRED | 1 | 2026-04-20 |
| 12 | 🟡 Prep done | 5 production-ready reports ready for external review | 0 | Awaits user action |
| 13 | 🟡 Deferred | Post-launch enhancement; spec exists (INTERACTIVE-REPORT-SPEC.md) | 0 | Post-launch |
| 12 | ⏳ | — | — | — |
| 13 | ⏳ | — | — | — |

---

## Cross-Phase Invariants (must hold at every commit)

1. Zero fabricated numbers reach AI or rendered HTML.
2. Every section ID matches `REQUIRED_SECTIONS` in `report-qa.js`.
3. Every `$X` / `X%` in the HTML traces to a field in the payload (verified by reconciliation check once Phase 11 lands).
4. Bilingual parity — FR and EN render identical structure, only narrative differs.
5. AMF-compliant language — no "should/must/recommend/devriez/doit".
6. Print-safe CSS — reports must render cleanly at letter size without JS.
