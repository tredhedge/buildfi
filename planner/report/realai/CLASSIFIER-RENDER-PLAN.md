# Classifier-Driven Report Rendering — Full Implementation Plan

**Status**: Proposed — ready for implementation by Claude Code agent.
**Owner**: BuildFi planner / report rendering layer.
**Date**: 2026-04-26.
**Scope**: Make `finLiteracy`, `stressLevel`, `detailPref` first-class drivers of report **rendering**, not just AI prose tone.

---

## 0. TL;DR for the implementing agent

Today the three classifiers (`finLiteracy`, `stressLevel`, `detailPref`) feed only the AI prompt's tone block. Every reader gets the same charts, the same section density, the same vocabulary, the same red/green palette. This plan extends those classifiers across **four orthogonal render axes** so the report visually and substantively adapts to the reader.

You will:
1. Derive a `renderProfile` object once from the trio.
2. Stamp it onto the data payload alongside the classifiers.
3. Use it as the single dispatch key in renderer + AI prompt + content filter + chart layer.

The plan is split into 6 phases, each independently shippable. Phase 1 is purely additive (no UI change). Phase 2 onward changes user-visible output.

---

## 1. Background — what already exists

Read these files before starting:

- [planner_v3.html:9447-9448](planner/planner_v3.html#L9447-L9448) — classifier state (`finLiteracy`, `stressLevel`).
- [planner_v3.html:11842-11847](planner/planner_v3.html#L11842-L11847) — current AI tone block driven by classifiers.
- [report/report-data.js:610-612](planner/report/report-data.js#L610-L612) — classifiers already plumbed onto the data object.
- [report/report-ai-prompt.js:76-113](planner/report/report-ai-prompt.js#L76-L113) — `CALIBRATION BY finLiteracy` + `STRESS-CALIBRATED TONE` blocks.
- [report/report-charts.js](planner/report/report-charts.js) — SVG chart generators (`window.BCharts`).
- [report/report-formatters.js](planner/report/report-formatters.js) — colors + number formatting.
- [report/report-shared.ts](planner/report/report-shared.ts) — shared helpers (grade, color, escHtml, fmtPctInt).
- [report/test-reports.js:269-390](planner/report/test-reports.js#L269-L390) — 12 reference profiles already include the classifier trio.
- [report/realai/build-realai-reports.js](planner/report/realai/build-realai-reports.js) — server-side build pipeline.

What works today:
- Classifiers are collected in the planner UI and stored in profile JSON.
- They flow into the AI prompt and shape **prose** (vocabulary, sentence count, reassurance).
- They have ZERO effect on charts, section density, content filtering, or representation.

What this plan adds:
- A `renderProfile` derivation step that converts the trio into 4 render axes.
- Per-block representation (chart ↔ hybrid ↔ text).
- Content-layer filtering (drop irrelevant blocks).
- Tone-driven framing in static labels + colors.
- Density gating (collapse / expand sections).
- An always-on "Show advanced view" escape hatch.

---

## 2. The four render axes

The trio composes into four orthogonal output axes. Do NOT collapse them into a single enum — they're genuinely independent and a HNW couple with high anxiety needs different treatment than a low-literacy beginner with low anxiety.

| Axis | Driven by | Values | What it controls |
|---|---|---|---|
| **chartTier** | `finLiteracy` | `lite` / `std` / `full` | Which charts are shown vs replaced by prose |
| **toneMode** | `stressLevel` | `calm` / `neutral` / `direct` | Color palette, section ordering, loss-language |
| **densityMode** | `detailPref` | `compact` / `balanced` / `deep` | Section collapse/expand, footnote inclusion |
| **representation** | per-block, derived from all three | `text` / `hybrid` / `chart` | Whether each block renders as prose, prose+small chart, or full chart |

`representation` is the new insight: every chart has a textual equivalent that conveys the same insight in plain language. A beginner doesn't lose the MER analysis — they read "Fees of ~1.5% would reduce final wealth by **~$180K** over 30 years — roughly the cost of one extra year of retirement" instead of seeing a bar chart.

---

## 3. Decision tree — `renderProfile` derivation

This is the function you'll implement in Phase 1. Place in `report/report-shared.ts`.

```js
function deriveRenderProfile(finLiteracy, stressLevel, detailPref) {
  // Defaults if missing
  finLiteracy = finLiteracy || 'intermediate';
  stressLevel = stressLevel || 'moderate';
  detailPref  = detailPref  || 'balanced';

  // Axis A — chartTier
  var chartTier =
    finLiteracy === 'beginner' ? 'lite' :
    finLiteracy === 'advanced' ? 'full' : 'std';

  // Axis B — toneMode
  var toneMode =
    stressLevel === 'high' ? 'calm' :
    stressLevel === 'low'  ? 'direct' : 'neutral';

  // Axis C — densityMode
  var densityMode =
    detailPref === 'concise'  ? 'compact' :
    detailPref === 'detailed' ? 'deep'    : 'balanced';

  // Derived flags (chart visibility)
  var showFan          = chartTier !== 'lite';
  var showTornado      = chartTier === 'full';
  var showSensitivity  = chartTier === 'full';
  var showSequenceRisk = chartTier === 'full' || (chartTier === 'std' && densityMode === 'deep');
  var showFeeBar       = chartTier !== 'lite';

  // Section collapse rules
  var collapseAssumptions = densityMode === 'compact';
  var collapseStressTests = densityMode === 'compact' || toneMode === 'calm';
  var collapseMethodology = densityMode !== 'deep';
  var collapseGlossary    = densityMode !== 'deep';

  // Tone-driven visual rules
  var bandColor =
    toneMode === 'calm'   ? 'soft' :
    toneMode === 'direct' ? 'stark' : 'standard';
  var leadWith =
    toneMode === 'calm'   ? 'floor' :
    toneMode === 'direct' ? 'dispersion' : 'projection';

  // Vocabulary
  var jargonMode =
    finLiteracy === 'beginner' ? 'plain' :
    finLiteracy === 'advanced' ? 'technical' : 'mixed';

  // Glossary on first use
  var inlineGlossary = finLiteracy === 'beginner' || densityMode === 'deep';

  // Footnotes
  var showFootnotes = densityMode === 'deep';

  return {
    chartTier, toneMode, densityMode, jargonMode,
    showFan, showTornado, showSensitivity, showSequenceRisk, showFeeBar,
    collapseAssumptions, collapseStressTests, collapseMethodology, collapseGlossary,
    bandColor, leadWith, inlineGlossary, showFootnotes,
    // Raw inputs preserved for debugging + AI prompt
    _input: { finLiteracy, stressLevel, detailPref }
  };
}
```

### Per-block representation resolver

Given a block id and the profile, return the representation to use:

```js
function resolveRepresentation(blockId, profile, hasData) {
  if (!hasData) return 'omit';

  // Income waterfall: always chart — most useful, most readable
  if (blockId === 'income_waterfall') return 'chart';

  // Block-specific: stress-tests downgraded under calm tone
  if (blockId === 'stress_tests' && profile.toneMode === 'calm' && profile.chartTier !== 'full') {
    return 'text';
  }

  // Sequence-of-returns hidden in lite, hybrid in std, chart in full
  if (blockId === 'sequence_of_returns') {
    if (profile.chartTier === 'lite') return 'omit';
    if (profile.chartTier === 'std')  return profile.densityMode === 'deep' ? 'hybrid' : 'omit';
    return 'chart';
  }

  // MER / fee impact
  if (blockId === 'fee_impact') {
    if (profile.chartTier === 'lite') return 'text';
    if (profile.chartTier === 'std')  return 'hybrid';
    return 'chart';
  }

  // Tornado / sensitivity grid: full only
  if (blockId === 'tornado' || blockId === 'sensitivity') {
    return profile.chartTier === 'full' ? 'chart' : 'omit';
  }

  // Percentile fan
  if (blockId === 'percentile_fan') {
    if (profile.chartTier === 'lite') return 'text';
    if (profile.chartTier === 'std')  return 'chart_simplified'; // P25/P50/P75 only
    return 'chart'; // full P10–P90
  }

  // Default: chart if showable, else hybrid
  return profile.chartTier === 'lite' ? 'hybrid' : 'chart';
}
```

### Content-layer relevance filter

```js
function isBlockRelevant(blockId, data, profile) {
  // Drop OAS clawback if reader can't act on it (low income + beginner)
  if (blockId === 'oas_clawback') {
    if (profile.jargonMode === 'plain' && data.oasClbkYrs === 0) return false;
  }
  // Drop CCPC analysis if no corp
  if (blockId === 'ccpc_extraction' && !data.p.hasCCPC) return false;
  // Drop asset-location for beginner
  if (blockId === 'asset_location' && profile.jargonMode === 'plain') return false;
  // Drop sequence-of-returns if reader has DB pension covering >80% of expenses
  if (blockId === 'sequence_of_returns' && data.guaranteed_income_coverage > 0.8 && profile.toneMode === 'calm') return false;
  return true;
}
```

---

## 4. Block-by-block representation matrix

This is the canonical contract for Phase 2. Implement each row.

| Block | `lite` representation | `std` representation | `full` representation | Always-shown? |
|---|---|---|---|---|
| Cover / hero | Same | Same | Same | ✅ |
| Decision card (success rate band) | Same — but `bandColor` per tone | Same | Same | ✅ |
| AI advisor letter | Plain language (jargonMode) | Mixed | Technical | ✅ |
| Income waterfall | Chart, plain labels | Chart | Chart + tax overlay | ✅ |
| Projection chart | P50 line + range band | P25/P50/P75 lines | P10–P90 fan | ✅ (form varies) |
| Percentile fan | "Typical: $X. Cautious: $Y. Favourable: $Z" sentence | P25/P50/P75 fan | Full P10–P90 fan + dispersion driver text | ✅ (form varies) |
| Coverage / floor income | Bar chart, plain labels | Bar chart | Bar chart + breakdown | ✅ |
| MER / fee impact | "Fees of ~X% would reduce final wealth by **~$Y** over Z years." | Bar chart + 1-line takeaway | Full bar + sensitivity grid | varies — see relevance filter |
| Stress tests | "Your plan held in **N of M** stress scenarios." 1-line summary, full table behind `<details>` | Top-3 row table | Full table + tornado | ✅ (form varies, often collapsed under `calm`) |
| Sequence-of-returns | Omitted, OR plain sentence if `deep` | Brief callout if `deep` | Full chart | conditional |
| Tornado | Omitted | Omitted | Full chart | only `full` |
| Sensitivity grid | Omitted | Omitted | Full grid | only `full` |
| Tax efficiency | "Smart withdrawal order would save ~$X in lifetime tax." | Bar chart + paragraph | Full optimizer table | conditional |
| OAS clawback | Omitted if irrelevant + beginner | Brief paragraph | Full schedule | conditional |
| CCPC extraction | Omitted unless `hasCCPC` | Same | Same + integration table | conditional |
| Methodology | Hidden in `<details>` | Open in `<details open>` | Inline appendix | density-gated |
| Assumptions | Compact table behind `<details>` | Full table | Full table + rationale | density-gated |
| Glossary | Inline on first use of jargon (`inlineGlossary=true`) | Tooltip only | Full glossary appendix | density-gated |
| Footnotes | None | None | Inline footnotes per KPI | only `deep` |

---

## 5. Justification

### Why this matters
- A NaviPlan-style report shown to a `beginner/high/concise` reader breaks their trust at chart #3. They disengage. The MC simulation is irrelevant if they can't read it.
- Conversely, a simplified report shown to an `advanced/low/detailed` FIRE-seeker reads as patronizing and they'll churn to a competitor.
- BuildFi already collects the data needed to differentiate. Not using it is leaving value on the table.

### Why four axes (not one)
- One enum (`Simple/Standard/Detailed`) couples literacy with anxiety with appetite. They're separable. A confident retiree with high anxiety wants the **full** percentile fan but in **calm** colors with **balanced** density. One enum can't express that.
- Splitting into 3 axes from 3 inputs preserves the user's intent. The 4th axis (per-block `representation`) is derived, not a new input.

### Why representation, not just hide/show
- Hiding charts loses information. Replacing them with prose preserves the **insight** and removes the **cognitive cost**.
- The MER chart isn't valuable because it's a chart. It's valuable because it tells you fees cost you ~$180K. The prose form delivers the insight at lower cognitive cost for a beginner.
- Trust stays intact: the reader doesn't sense they got "less" of a report — they got the same answer in their language.

### Why always-on escape hatch (Phase 5)
- Self-rated literacy is unreliable. Some users under-rate themselves out of modesty; some over-rate to look sophisticated.
- A "Show advanced view" toggle lets the user override per session without re-quizzing.
- Print/PDF export always uses `full` so the canonical archived version is complete regardless of in-app preference.

---

## 6. Expected outcomes

### User-facing
- `beginner/high/concise` profile: **6-page** report, plain language, floor-income-first, no red, MER as prose, no tornado, no fan. Reader finishes the report.
- `intermediate/moderate/balanced`: ~12-page report (current default). No regression.
- `advanced/low/detailed`: ~22-page report, all charts, sequence-of-returns lead, footnotes, methodology appendix.
- Anxious-but-sophisticated profile: full chart deck in calm palette, projection ordered after floor income.

### Business
- Lower abandonment / refund rate on Bilan 360 ($29.99) for low-literacy buyers.
- Higher perceived value for Planner ($69.99) buyers — they unlock progressively more depth.
- AMF/OSFI compliance preserved (conditional language only; no axis can introduce prescriptive prose).

### Engineering
- One MC payload, one Opus narration, four orthogonal render dials.
- Representation matrix in one file (the resolver) — easy to audit.
- Reference profiles in `test-reports.js` already cover the corner cases for snapshot testing.

---

## 7. Phase plan — 6 PRs

Each phase is independently shippable behind feature flag `RENDER_PROFILE_V1` (env var, default `false` until Phase 6).

### Phase 1 — Profile derivation + plumbing (zero UI change, ~150 LOC)

**Files**:
- [report/report-shared.ts](planner/report/report-shared.ts) — add `deriveRenderProfile`, `resolveRepresentation`, `isBlockRelevant`, jargon swap table.
- [report/report-data.js:602-652](planner/report/report-data.js#L602-L652) — call `deriveRenderProfile` in the return block; stamp `data.renderProfile`.
- [report/realai/build-realai-reports.js:94](planner/report/realai/build-realai-reports.js#L94) — pass classifiers through to data; ensure `renderProfile` reaches all renderers.
- New: `__tests__/render-profile.test.js` — 27-combination snapshot of derived profiles.

**Acceptance**:
- `data.renderProfile` available in every renderer.
- 27 combos × snapshot output matches expectation.
- No visual diff vs current rendering yet.

**Risk**: very low. Purely additive.

---

### Phase 2 — Chart gating + representation swap (visual change, ~500 LOC)

**Files**:
- [report/report-charts.js](planner/report/report-charts.js) — for each chart function, add a sibling `*AsText(data, profile)` and `*AsHybrid(data, profile)` returning HTML strings.
- [report/report-html.js](planner/report/report-html.js) — replace direct chart calls with `renderBlock(blockId, data, profile)` dispatcher.
- [report/report-html-360.js](planner/report/report-html-360.js) — same dispatch pattern.
- [report/realai/build-realai-reports.js](planner/report/realai/build-realai-reports.js) — pass `profile` into renderer.

**Critical implementation rules**:
- DO NOT remove existing chart functions. Add `*AsText`/`*AsHybrid` as siblings.
- The dispatcher MUST handle missing data — call `isBlockRelevant` before `resolveRepresentation`.
- Every text representation must include the **same numbers** that the chart would show. Use `BFmt` formatters — never reformat.
- Preserve all existing chart behavior for `chartTier === 'full'`. The default profile (`intermediate/moderate/balanced`) MUST render IDENTICALLY to today's output. This is the most important regression check.

**Block-by-block work**:
- Percentile fan → `percentileFanAsText`, `percentileFanSimplified` (P25/P50/P75 only).
- Fee MER chart → `feeMERAsText` (1 sentence with $ savings), `feeMERAsHybrid` (small bar + 1 line).
- Stress tests → `stressTestsAsText` (N-of-M summary), `stressTestsAsHybrid` (top-3 rows).
- Sequence-of-returns → `sequenceRiskAsText`.
- Income waterfall — NO text alternative. Always chart. (Document this exception clearly.)

**Acceptance**:
- Default profile snapshot bytewise-identical to current `final/*.html` output.
- `lite/calm/compact` profile renders without tornado, fan, sensitivity, sequence-of-returns.
- All numbers in text representations match the chart equivalents.

**Risk**: medium. Visual regression risk on the default profile is the biggest hazard. Mitigation: byte-diff snapshot test on all 12 reference profiles before merge.

---

### Phase 3 — Tone-driven framing (~250 LOC)

**Files**:
- [report/report-formatters.js](planner/report/report-formatters.js) — add `colorForBand(band, bandColor)` returning palette per `bandColor` mode (`soft` / `standard` / `stark`).
- [report/report-html.js](planner/report/report-html.js) — section ordering: when `profile.leadWith === 'floor'`, render guaranteed-income section before projection.
- [report/report-html-360.js](planner/report/report-html-360.js) — same ordering swap.
- [report/report-shared.ts](planner/report/report-shared.ts) — add `lossLanguageFor(profile, key)` — swap table:
  - `calm` mode: "depletion" → "later-life adjustment window", "fails" → "would benefit from review".
  - `direct` mode: keep current.
  - `neutral`: keep current.

**Critical implementation rules**:
- AMF compliance: NEVER swap into prescriptive language. The swaps are for emotional tone only. Test:
  - Forbidden after swap: "should", "must", "recommend", "il faut", "devriez".
  - Required: conditional verbs only.
- Color swaps must preserve contrast ratios for accessibility (WCAG AA).
- The hero color stays brand gold/blue regardless of toneMode. Tone affects only band/risk colors.
- Section reordering must NOT break section anchors (`<a id="...">`) used by interactive layer or print bookmarks.

**Acceptance**:
- `low_income_gis_en` rendered with `stressLevel='high'` shows guaranteed-income before projection; same profile with `low` shows projection first.
- Color audit: no forbidden red appears in `calm` mode.
- AMF test passes for all 27 × 12 combos.

**Risk**: low–medium. Section reordering can break implicit references. Audit anchor IDs before merging.

---

### Phase 4 — Density gating (~200 LOC)

**Files**:
- [report/report-html.js](planner/report/report-html.js) — wrap each non-core section in `<details>` with `open` attribute keyed off `densityMode`.
- [report/report-html-360.js](planner/report/report-html-360.js) — same.
- New: `report/report-css-density.js` — print stylesheet that forces all `<details>` open for `@media print`.
- [report/report-export-service.js](planner/report/report-export-service.js) — ensure PDF generation forces `densityMode='deep'`.

**Critical implementation rules**:
- Always-expanded core (regardless of density): Cover, Decision card, AI advisor letter, AI overall_assessment, Income waterfall, Projection.
- The `<details>` element must include a `<summary>` line that is the same one-line takeaway the deep version leads with — never collapse a section behind only "▸ Section 4."
- PDF/print MUST render fully expanded (`densityMode='deep'`). Configurable in [report-export-service.js].
- Methodology, Assumptions, Stress tests, Fee impact, Sensitivity, Glossary — all collapsible.
- Inline footnotes (only `deep`): `<sup>` with `<aside>` content — no JS dependency.

**Acceptance**:
- `compact` profile: 6 sections collapsed by default, 5 always expanded.
- PDF export of `compact` profile = PDF export of `deep` profile (printer doesn't care about user preference).
- Section anchors remain functional inside `<details>`.

**Risk**: low. `<details>` is well-supported (97%+ browsers). Print CSS is the main thing to verify.

---

### Phase 5 — Content-layer filtering (~150 LOC)

**Files**:
- [report/report-shared.ts](planner/report/report-shared.ts) — `isBlockRelevant(blockId, data, profile)` (logic in section 3 above).
- [report/report-html.js](planner/report/report-html.js) + [report/report-html-360.js](planner/report/report-html-360.js) — call `isBlockRelevant` before `resolveRepresentation`.
- [report/report-ai-prompt.js](planner/report/report-ai-prompt.js) — pass `profile.relevantBlocks` into the prompt; AI must NOT reference omitted blocks.

**Critical implementation rules**:
- Filter rules are conservative. When in doubt, **show**. False negatives (hidden block that mattered) are worse than false positives.
- Document each filter rule with a 1-liner explaining the criterion. Reviewers must understand why a block is hidden.
- AI prompt: if `OAS clawback` block is omitted, the AI must NOT mention OAS clawback in any slot. Add to prompt: "Do not reference these omitted analyses: [list]."
- Always allow the user to opt back in via Phase 6 escape hatch.

**Acceptance**:
- `low_income_gis_en` (beginner) does NOT show OAS clawback section (irrelevant for sub-threshold income).
- `ccpc_owner_en` (advanced) shows full CCPC extraction section.
- AI never references an omitted section.

**Risk**: medium. False negatives are user-visible "missing analysis." Mitigation: filter rules are conservative + escape hatch in Phase 6.

---

### Phase 6 — Escape hatch + UX polish (~200 LOC)

**Files**:
- [report/report-interactive.js](planner/report/report-interactive.js) — top-right toggle "Show advanced view" → flips `chartTier='full'`, `densityMode='deep'`, re-renders client-side.
- [report/report-html.js](planner/report/report-html.js) + [report/report-html-360.js](planner/report/report-html-360.js) — emit ALL representations (omitted ones get `style="display:none"`) + lite-mode badge near cover.
- New: `localStorage.buildfi_render_pref` for persistence.
- Print CSS: force `chartTier='full'` and `densityMode='deep'` for `@media print`.

**Critical implementation rules**:
- The escape hatch is client-side only — no re-fetch, no re-quiz.
- All hidden representations must be present in the HTML payload (with `display:none`), so the toggle is instant.
- This increases payload size for `lite` reports — measure and document. Cap at +30 KB; if larger, lazy-load via fetch.
- Lite-mode badge: small, non-intrusive, dismissible. Wording: "Showing simplified view — click to expand to advanced."
- Toggle persists per user via localStorage; resets on new profile.

**Acceptance**:
- One-click toggle reveals all hidden charts and sections.
- Print/PDF always uses full+deep regardless of toggle state.
- Payload size measured: lite report < 250 KB, full report < 400 KB.

**Risk**: low. UI-only.

---

## 8. AI prompt alignment (cross-cutting concern)

Update [report/report-ai-prompt.js](planner/report/report-ai-prompt.js) **after Phase 2 lands**:

1. Pass `renderProfile` into the prompt's DATA block.
2. Add a contract section to the SYSTEM_PROMPT:
   - "RENDER PROFILE — chart_tier, tone_mode, density_mode, lead_with, jargon_mode."
   - "Do NOT reference 'the percentile fan above' if `chart_tier='lite'`."
   - "Do NOT mention 'as shown in the tornado chart' if `chart_tier !== 'full'`."
   - "If `lead_with='floor'`, the floor-income block renders first — frame the analysis from that anchor."
3. Existing `CALIBRATION BY finLiteracy` and `STRESS-CALIBRATED TONE` sections stay; they're complementary.

---

## 9. Testing strategy

### Snapshot matrix
- 12 reference profiles in [test-reports.js](planner/report/test-reports.js).
- 3 explicit render combos to test per profile: `default` (current), `lite/calm/compact`, `full/direct/deep`.
- Total: 36 HTML outputs to byte-diff per phase.

### Regression guard (most important)
- Default profile (`intermediate/moderate/balanced`) MUST byte-match current output through Phase 5. Phase 6 introduces hidden-by-default representations which change byte size — adjust the regression baseline at that phase.

### AMF compliance test
- Run prescriptive-language regex over every generated HTML for every (profile × render combo).
- Forbidden tokens: `should`, `must`, `recommend`, `il faut`, `faudrait`, `devriez`, `doit`, `devra`, `devrait`.
- Must pass for all 36 outputs.

### Accessibility test
- Color contrast (WCAG AA) must hold for `calm` palette as well as `stark`.
- All representations must be keyboard-navigable.

### AI consistency test
- For each render combo, verify the AI never references an omitted block.
- Add an auditor in [report/realai/qa-check.mjs](planner/report/realai/qa-check.mjs) that cross-checks AI output against `profile.omittedBlocks`.

---

## 10. Things to be careful about during implementation

### Critical correctness
1. **Default profile MUST not regress visually**. Byte-diff the default profile output before/after every phase. If a single span changes, justify it.
2. **Numbers in text representations MUST match chart numbers**. Use the same formatter (`BFmt.fmtCompact`, `fmtPctInt`, etc.). Never reformat.
3. **AMF compliance is non-negotiable**. Tone swaps must remain conditional. Add the prescriptive-language test to CI.
4. **AI prompt and renderer must agree on what's visible**. If the renderer hides a block, the AI must not reference it. Pass `omittedBlocks` into the prompt.
5. **Print/PDF always renders full+deep**. The user's interactive preference does not affect the archived document.

### Architecture
6. **Don't collapse the four axes into one enum**. Maintain the orthogonality through the data layer. Future axes (e.g. `culturalContext`, `goalOrientation`) plug in the same way.
7. **Block dispatch through one resolver**. Both `report-html.js` and `report-html-360.js` should call the same `renderBlock(blockId, data, profile)`. No drift between the two renderers.
8. **Representation functions live in `report-charts.js`**. Co-locate `chartFn`, `chartFnAsText`, `chartFnAsHybrid`. Don't fragment across files.
9. **Section anchors stay stable**. Don't rename `<a id="...">` when reordering. Print bookmarks + interactive layer + URL fragments depend on them.

### UX
10. **Lite-mode badge is critical**. Without it, users feel they got a "less complete" report. With it, they understand they're seeing a personalized view.
11. **Escape hatch is one click**. Don't gate it behind a setting page. Top-right corner, always visible.
12. **Density collapse must include a meaningful summary line**. `<summary>Methodology</summary>` is hostile. `<summary>Methodology — based on 5,000 simulated futures, 30-year horizon</summary>` is informative.
13. **Don't over-filter**. If unsure whether a block is relevant, show it. False negatives (hidden important block) erode trust faster than noise.

### Testing
14. **Test the 12 reference profiles in 3 modes each** before merging any phase past Phase 1. That's 36 snapshot tests.
15. **AMF compliance test runs on EVERY generated HTML**. Not a sample — every one.
16. **Phase 1 has zero visual change. Verify by snapshot diff.** If anything visual changes in Phase 1, you've crossed phase boundaries.

### Performance
17. **Payload size for `lite` reports**. If Phase 6 (escape hatch) embeds all representations in the HTML, lite reports may grow 30-50%. Measure. If > +30 KB, switch to lazy-load on toggle.
18. **No new client-side dependencies**. The existing self-contained vanilla JS + SVG approach must be preserved. No CDN scripts, no React.

### Data integrity
19. **`isBlockRelevant` runs after data computation**. Don't filter blocks in `report-data.js` — that affects the AI prompt and the data export. Filter only at render time.
20. **Preserve raw classifiers in the data object**. Don't replace them with derived `renderProfile`. Both must be available — classifiers for AI prompt + audit, profile for rendering.

### Backwards compatibility
21. **Old reports stored in Blob retain their original rendering**. Don't try to migrate or rebuild them. New reports use the new system; old reports are immutable archives.
22. **Default behavior for missing classifiers** = `intermediate/moderate/balanced` = current behavior. Reports built before classifiers existed work unchanged.

### Codex / external rebuild
23. **The premium rebuild plan in [planner/report/realai/PREMIUM-REBUILD-PLAN.md](planner/report/realai/PREMIUM-REBUILD-PLAN.md) is the parallel work stream**. Coordinate so this plan lands its phases without conflicting with that rebuild's section restructuring. Specifically: section anchor IDs and the block registry must be agreed before Phase 2 ships.

---

## 11. Rollout & feature flagging

- Env var: `RENDER_PROFILE_V1=true` enables all phases.
- Per-phase flags during dev: `RENDER_PROFILE_V1_PHASE2=true` etc., for staged validation.
- Production rollout: ship to Bilan 360 first (lower volume, easier to monitor), then Planner.
- Kill switch: setting `RENDER_PROFILE_V1=false` immediately reverts to default rendering for all reports without redeploy.

---

## 12. Phase ordering — recommended

1. **Phase 1** (foundation — ship in PR 1, ~1 day).
2. **Phase 2 partial**: percentile fan + MER only (high-impact subset, ship in PR 2, ~2 days).
3. **Phase 2 full** (remaining blocks, PR 3, ~3 days).
4. **Phase 3** (tone framing, PR 4, ~2 days).
5. **Phase 4** (density gating, PR 5, ~1 day).
6. **Phase 5** (content filtering, PR 6, ~1 day).
7. **Phase 6** (escape hatch, PR 7, ~1.5 days).

Total: ~11 days of focused implementation work.

---

## 13. Definition of done

- All 27 classifier combinations × 12 reference profiles = 324 valid renders (no errors, no broken sections).
- AMF prescriptive-language regex returns 0 matches across all 324.
- Default profile output is byte-identical to the pre-implementation baseline.
- Lite-mode badge present and functional.
- Escape hatch toggle reveals full report in one click.
- Print/PDF export = full/deep regardless of in-app preference.
- AI never references an omitted block.
- All representation text contains the same numbers as the chart equivalent.
- Documentation updated: this file moves from "Proposed" to "Implemented", with commit hashes per phase.

---

## 14. Open questions for the implementer

1. Is `report-shared.ts` the right home for `deriveRenderProfile`, or should it live in a new `report-profile.js`? *(Recommend: keep in `report-shared.ts` for now; extract if it grows beyond ~300 LOC.)*
2. Phase 6 escape hatch — embed all representations or lazy-load? *(Recommend: embed if total payload < 250 KB lite / 400 KB full; lazy-load otherwise.)*
3. Does the existing `report-interactive.js` need a refactor to support the toggle, or can the toggle be appended? *(Recommend: append; refactor only if the toggle becomes the third interactive surface.)*

Resolve these before merging Phase 2 — they affect block dispatcher design.

---

**End of plan. Hand to implementing agent. Reference this file in commit messages: `feat(report): classifier-driven rendering — phase N (see CLASSIFIER-RENDER-PLAN.md)`.**
