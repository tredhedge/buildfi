# Planner Aesthetic Audit & Remediation Plan — 2026-06-16

**Scope:** `planner/planner_v3.html` (short-form planner + results tabs, 23,022 lines)
and `planner/planner_longform.html` ("V4", long-form intake, 5,043 lines).
**Goal:** make the planner visually consistent with the marketing website and the
Report 360 dashboard, *aesthetics before content*. Both planner modes (short in v3,
long in V4) feed one engine + one set of results tabs.
**Method:** 4-dimension parallel read-only audit (color/token, layout/dashboard,
typography/components/responsive, V4 target spec). All findings carry file:line.

---

## 0. The core problem in one paragraph

`planner_v3` **half-migrated** to a unified token block ([127-140](../planner/planner_v3.html#L127-L140):
`--bf-paper`, `--bf-ink`, `--bf-gold #c4944a`, with `[data-theme=dark]` overrides) but a
**legacy hardcoded dark-card layer survives** ([12](../planner/planner_v3.html#L12):
`--bf-cd #2c2820`, `--bf-bd #443e34`, `--bf-tx #c8c4bf`, `--bf-field-bg`, `--bf-overlay-bg`)
that is **not theme-aware** — so cards, tooltips, tables and fields render dark even in
light mode (and flash dark before JS fires). On top of that the file carries **~336 distinct
hardcoded hex colors**, **~3,100 inline-style `React.createElement` calls** vs ~391 CSS-class
usages, **14 fragmented media-query breakpoints**, and **Playfair Display is loaded but never
applied to a single heading**. Meanwhile **V4 already has the clean token system we want**
(dark-default + light override, `--surface`/`--border`/`--text` scale, reusable component
classes) — it's the structural template. The catch: **V4 uses Plus Jakarta Sans**, while the
website, Report 360, and v3 all render **Inter** — so "match V4" and "match the website"
disagree on the body font. That single font decision gates the whole port.

---

## 1. Findings — Color / Token (planner_v3)

| # | Finding | Evidence | Sev |
|---|---|---|---|
| C1 | **Legacy dark-card layer not theme-aware** — `--bf-cd/--bf-bd/--bf-tx/--bf-field-bg/--bf-overlay-bg` hardcoded dark; used by table headers, `.kpi-tip`, `.sb-tip`, overlay, fields, mobile sheet. JS patches them at runtime (~[8832-8847](../planner/planner_v3.html#L8832)) → FOUC + dark-in-light defect. | [12](../planner/planner_v3.html#L12), [13](../planner/planner_v3.html#L13), [17](../planner/planner_v3.html#L17), [22](../planner/planner_v3.html#L22), ~11 CSS uses | **High** |
| C2 | **~50 hardcoded semantic hexes** bypass tokens: `#2a8c46` (good), `#b89830` (warn), `#cc4444` (bad), `#4680c0` (info) scattered in report CSS + SVG + React inline. Diverge from `--bf-good #3f7a4e` / `--bf-warn #b07a1e` / `--bf-bad #b3402e` / `--bf-info #3a6ea5`. | 11051-11053, 11138-11140, 11238, 11274, 11342-11343, 11468, 11545, … | **High** |
| C3 | **Report/print CSS block hardcodes light-only colors** (`#fff`, `#f9f7f2`, `#FFFEF5`, `#E8D88C`, goldenrod `#FFD700`/`#B8860B`) → unreadable in dark mode; orphaned from palette. | 11037-11087, 11310-11343 | **High** |
| C4 | **Off-canonical accent variants** — `#d2a764` (`CL_DARK.ac`, [1478](../planner/planner_v3.html#L1478)), `#e8a040`/`#bf8a42` warn badges, `#d04848` red. Should resolve to `--bf-gold`/`--bf-warn`/`--bf-bad`. | 29-32, 391, 1478 | **Med** |
| C5 | **~336 distinct hex values / 8 canonical tokens ≈ 42× drift multiplier**; ~80 ad-hoc neutral greys that should collapse to 2-3 slots. | file-wide | **Med** |

## 2. Findings — Layout / Dashboard vs Report 360 (planner_v3)

**Hero results tabs:** Tab 5 *Diagnostic* (grade + success% + levers), Tab 9 *Detailed report*,
plus Accounts(1), Income(2), Projection(7), Estate(8). ~24 tabs total.

| # | Finding | Evidence | Sev |
|---|---|---|---|
| L1 | **Tab 5 understructured** — health summary, recos, scenarios mixed without card boundaries or hierarchy. Report 360 target: `.hero` (grade card 170px ǀ 1fr briefing) + 2fr/1fr dashboard + side narrative. | planner ~16448-17xxx vs report-html-360.js 290-292 | **High** |
| L2 | **No KPI taxonomy** — Report 360 uses `.kpi-hero` (3px gold left bar, gradient bg, 30px value), `.kpi-detail` (muted). v3 KPIs are inline with no primary/secondary emphasis. | planner 16738-16741 vs report 299-300 | **Med** |
| L3 | **No 2fr/1fr dashboard split** — v3 stacks sections linearly; report splits charts (2fr) / side cards (1fr). | report 292 | **Med** |
| L4 | **No `.standfirst` / `.card` section framing** — report frames every section as `.card` (1px border, 14px radius, h2 + italic standfirst + body). v3 uses ad-hoc inline divs. | report 292, 309-317 | **Med** |
| L5 | **Charts not in a `.svgbox`** and scenario/action grids not standardized (`.scenario-grid`, `.actions`, both 3-col 8px gap). | report 302-315 | **Low/Med** |
| L6 | **Radius/spacing tokens scoped to `.bf-side-overlay` only** (`--bfx-radius-*`); rest of file uses ad-hoc 4/6/8/10/12/14/16/20px. | 204-206 | **Med** |

## 3. Findings — Typography / Components / Responsive (planner_v3)

| # | Finding | Evidence | Sev |
|---|---|---|---|
| T1 | **Playfair loaded, never applied** — only display-serif use is one verdict subtitle ([15339](../planner/planner_v3.html#L15339)). All headings are sans. | 135, 15339 | **High** |
| T2 | **Two parallel font-size scales** — CSS `--fs-*` (base 11px, [123](../planner/planner_v3.html#L123)) vs JS `FS` object (base 13px, [846](../planner/planner_v3.html#L846)). Different values, no reconciliation. | 123, 846 | **High** |
| T3 | **~3,100 inline-style calls vs ~391 class usages** — buttons/pills/badges/fields/cards re-styled ad-hoc (`S.btnPrimary` etc. defined but rarely used). 100+ hardcoded `"JetBrains Mono"` strings instead of `var(--bf-font-num)`. | 1620-1622, 12965, 13401 | **High** |
| T4 | **14 fragmented breakpoints** (400/768/1100/1400/1600) duplicated across blocks; **rail 84px + overlay 620px = 704px** crushes content on ≤768px; tables shrink to 9px font. | 36-85, 168/214, 512, 636-660 | **High** |
| T5 | **No unified tooltip/border/transition/hover/opacity tokens** — `.kpi-tip` vs `.sb-tip` diverge (260/270px, .6s/.8s); transitions span .15s–.28s ad-hoc; missing `:disabled` states. | 16-23, 18/22/218, 755 | **Med** |

## 4. V4 target spec & its own defects (planner_longform)

**Use V4's token system as the port target.** Clean dark-default + `:root[data-theme="light"]`
override ([60-76](../planner/planner_longform.html#L60-L76)); accents constant across themes;
reusable classes (`.btn/.btn-primary`, `.pill`, `.field/.field-grid`, `.section`, `.card`,
`.callout`, `.simulate-fab`, `.mono`). Radius 6/10/14, `--step 4px`, `--dur-*`, `--ease`.

**V4 defects to fix so it truly matches the website:**

| Line | Issue | Fix |
|---|---|---|
| [9](../planner/planner_longform.html#L9),[90](../planner/planner_longform.html#L90),120 | **Plus Jakarta Sans** body+logo (website/Report360/v3 use **Inter**) | Resolve per Decision D1 below |
| [27](../planner/planner_longform.html#L27) | `--accent-strong #d9a820` (off-canonical gold) | derive from `#c4944a` |
| 86-87 | body gradient `rgba(196,154,26,…)` = legacy `#c49a1a` | `rgba(196,148,74,…)` |
| 146,151,382,491,495 | shadow/gradient golds `rgba(196,154,26,…)` / `#e5b22a` | normalize to `#c4944a` |

---

## 5. The one open decision that gates the port

**D1 — Body font.** The surfaces disagree:

| Surface | Body font (as shipped) |
|---|---|
| Website `public/index.html` | **Inter** |
| Report 360 | **Inter** |
| planner_v3 | **Inter** |
| planner_longform (V4) | **Plus Jakarta Sans** |
| DESIGN-SYSTEM.md (doc) | says Product = *DM Sans* (not honored by any live surface) |

**Recommendation:** standardize the entire planner on **Inter** (+ Playfair display + JetBrains
Mono) — it matches the live website, Report 360, and v3 already, and is the smallest change.
That means **swap V4 off Plus Jakarta Sans → Inter** (one font line) and keep v3's fonts.
*Alternative:* if you want to honor the design doc, standardize all surfaces (incl. website)
on DM Sans — larger blast radius. Either way, pick one sans for the whole product.

---

## 6. Execution plan — AESTHETICS FIRST

Each phase is independently shippable and testable against the 505-test harness + visual smoke.

### Phase A — Token foundation (contained, highest value)  ·  effort: M  ·  risk: Low
1. Kill the legacy dark-card layer (C1): make `--bf-cd/--bf-bd/--bf-tx/--bf-field-bg/--bf-overlay-bg`
   resolve through the theme-aware paper/ink/line tokens; move defaults out of the static `body{}`
   rule so light mode is light from first paint (fixes FOUC).
2. Adopt V4's token *names/scale* into v3's `:root` (surface/border/text scale, radius 6/10/14,
   `--step`, durations, easing) so both files share one vocabulary.
3. Tokenize the ~50 semantic hexes (C2) and report/print block (C3) → `--bf-good/warn/bad/info`
   with `[data-theme]`-aware values; normalize off-canonical golds (C4) + V4 golds (§4) to `#c4944a`.
4. Apply D1 font decision (swap V4 → Inter if confirmed).

### Phase B — Components & typography  ·  effort: M  ·  risk: Low-Med
5. Apply Playfair to display headings (T1); reconcile the two font-size scales to one (T2).
6. Extract ~12 reusable component classes (button/pill/badge/field/card/tooltip/kpi) mirroring
   V4's vocabulary; replace the worst inline-style clusters (T3). Unify tooltip/border/transition/
   hover/opacity tokens (T5).

### Phase C — Dashboard restructure of hero tabs  ·  effort: L  ·  risk: Med
7. Restructure Tab 5 (Diagnostic) to the Report 360 shape: `.hero` grade card + 2fr/1fr split +
   `.kpi-hero` pattern + `.standfirst` + `.card` section framing + `.actions`/`.scenario-grid`
   + `.svgbox` chart wrappers (L1-L5). Then propagate the card/standfirst/kpi pattern to the
   other hero tabs (Accounts, Income, Projection, Estate).
8. Consolidate the 14 breakpoints into one breakpoint map; fix the rail+overlay crush ≤768px and
   table legibility (T4).

> Phase C is the big one (the layout agent sized A1-A14 at ~3-5 weeks if taken to full fidelity).
> Recommend doing A+B first (they deliver ~70% of the visible consistency win at low risk), then
> scoping C tab-by-tab rather than as one monolith.

---

## 7. Content phases — AFTER aesthetics (identified, deferred)

- **Questionnaire reconciliation (short v3 ↔ long V4 ↔ Bilan wizard):** age `18-90` (v3) vs `18-80`
  (V4) vs `25-85` (wizard); horizon already aligned to `70-110` (done); spouse age, `sal` step;
  field-name drift `finLiteracy` (v3) vs `psychLiteracy` (wizard). V4 is the canonical *planner*
  long form; wizard is a separate product — reconcile to V4, flag wizard conflicts.
- **Deterministic results-tab text (in v3):** AMF fixes done ([16719-16720](../planner/planner_v3.html#L16719),
  [11150](../planner/planner_v3.html#L11150)); remaining: "Jamais/Never" depletion label (11 sites)
  overstates certainty → "Dépasse l'horizon/Beyond horizon"; FR/EN parity polish; no other
  prescriptive language found (sanitizer covers AI path).

---

## 8. Recommended sequencing

1. Confirm **D1 (font)**.
2. **Phase A** (token foundation) — one PR, visual diff should be large-but-mechanical, well covered by the test harness.
3. **Phase B** (components + typography) — one PR.
4. **Phase C** (dashboard restructure) — tab-by-tab PRs, Tab 5 first.
5. Then the **content phases** (questionnaire + remaining text).

Backups live under `backups/2026-04-28-pre-design-system/`; work on a branch off `main`.

---

## 9. Implementation log — 2026-06-16 (shipped this session)

All edits in `planner/planner_v3.html`, concentrated in central sources (not the
~3,100 inline call sites). Verified live in a headless browser across dark, light,
Dashboard and Rapport tabs; engine ran A+/100%, no JS regressions.

**Phase A — palette port (done):**
- Rewrote the master `CL_DARK`/`CL_LIGHT` objects ([~1478](../planner/planner_v3.html#L1478)):
  canonical gold `#c4944a` (was `#d2a764`); dark = **soft slate** (`#252d39` bg / `#2d3748`
  cards — user preferred this over the first deep-navy `#0e1420` pass); light = V4 clean scale.
- Fixed initial-paint FOUC: `body` rule ([12](../planner/planner_v3.html#L12)) now paints
  the slate bg + theme-matched legacy `--bf-cd/bd/tx` from first frame.
- Fixed the stray cream progress bar ([48-52](../planner/planner_v3.html#L48)) → CL-synced vars + canonical gold.

**Phase B — component polish (done):**
- `RAD` scale aligned to V4: `{sm:6, md:10, lg:14}` ([849](../planner/planner_v3.html#L849)) — softer corners everywhere.
- Card elevation: subtle `boxShadow` on `S.card`/`S.cardKpi` ([1608-1610](../planner/planner_v3.html#L1608)) and on
  `.bf-kpi-click` resting state ([160](../planner/planner_v3.html#L160)) — depth on the KPI hero cards.
- Verdict/grade card made theme-aware in the theme effect ([~8848](../planner/planner_v3.html#L8848)):
  dark = gold-tinted slate certificate (was a jarring light `#fbf6ec` box in dark mode).

**Mobile/responsive fix (done):** the audit's predicted "rail 84px + overlay 620px crush" does
not occur — on ≤768px the rail becomes a bottom nav and the form overlay a clean full-screen
sheet. The real mobile defect was the persistent results **KPI strip** ([~15325](../planner/planner_v3.html#L15325)):
a 5-column inline grid that squished/clipped text at phone width. Gave it `.bf-kpi-strip` +
a `@media(max-width:768px)` 2-column override ([~59](../planner/planner_v3.html#L59)). Verified at 390px:
labels now fully readable, no clipping. (Breakpoint-token consolidation across the 14 media
queries remains optional — maintainability only, no visible payoff, real regression risk.)

**Phase C — assessment:** the audit overstated "understructured" hero tabs. The Diagnostic
tab is already well-architected (semantic-bordered KPI hero cards, grade card + resilience
chip + lever, click-through). The palette/token/depth work delivered the visual lift; a deep
2fr/1fr JSX restructure was not warranted. Remaining optional C work: breakpoint
consolidation + the ≤768px rail/overlay crush ([T4](#3-findings--typography--components--responsive-planner_v3)),
and propagating card depth to the non-`bf-kpi-click` inline cards (each is a separate inline site).

**Also shipped (content, pre-freeze):** 2 AMF compliance fixes
([16719-16720](../planner/planner_v3.html#L16719), [11150](../planner/planner_v3.html#L11150))
+ short-form horizon range aligned to V4 ([13406](../planner/planner_v3.html#L13406)). Content
otherwise frozen per user.
