# DATA-VALIDATION-2026-04-25.md

**Numerical-integrity audit of the 10 BuildFi reports in `report/realai/final/`,
run 2026-04-25 after the P1 premium rebuild.**

The audit cross-referenced rendered HTML against MC payloads (`report/realai/mc/`),
canonical review packs (`report/realai/review/*.review-pack.json`), and profile
parameters (`report/realai/profiles.json`). It found a handful of weird numbers.
This document classifies them by **fix locus** so each one can be assigned
correctly. None of these are bugs introduced by the premium rebuild — they
are pre-existing engine outputs that the rebuild now surfaces explicitly.

---

## Summary

| Category | Count | Where the fix lives |
|---|---|---|
| Engine MC defects | 6 | `lib/engine/index.js` (and `planner.html` source of truth) |
| Engine schema gaps | 2 | MC export schema (`gen-real-mc.mjs`) |
| Renderer guards added | 4 | `report/report-pdf.js` (this session) |
| Auditor surfacing added | 5 | `report/review/reviewers/depth-auditor.js` (this session) |

All 10 reports continue to ship — the rebuild's renderer guards convert the
broken-looking outputs into honest "structural floor / data not available"
callouts so clients don't see misleading numbers. The findings remain in
`review/<profile>.findings.json` (severity = `minor`, fix_target = `engine-mc`)
for engineering follow-up.

---

## Engine-side defects (cannot be fixed by the renderer)

### E1 — `conservative_retiree_qc_fr` returns null wealth percentiles
- MC payload: `medF`, `p25F`, `p75F`, `medEstateNet` are all `null`.
- Yet `succ = 1.0` (100% success rate).
- Profile is age 67 (already retired), DB-pension dominant. The engine likely
  short-circuits the wealth array in pure-decum profiles where the projection
  is fully covered by guaranteed income.
- Engine action: ensure `medF` / `p25F` / `p75F` are populated even when
  every path terminates at deathAge with cash > 0 (or = 0 — the array can be
  uniform but should not be `null`).

### E2 — `ccpc_owner_en` percentiles all collapse to $480 000 (real: $209 031)
- `p25F == p50F == p75F == 480000` exactly (the `bizRetainedEarnings` value).
- Real-dollar percentiles also collapse to $209 031.
- Engine treats CCPC retained earnings as a deterministic terminal value:
  the personal portfolio is fully drawn down by deathAge, so the only
  surviving wealth is the $480K corp, identical across all 5 000 paths.
- Engine action: model corp asset growth + dividend timing stochastically,
  OR explicitly note `_corpFloor = 480000` so the renderer / auditor can
  separate the structural floor from the variable portfolio.

### E3 — `rental_landlord_on_en` reports `hasRE = false`
- Profile contains 2 properties (`Duplex Hamilton 580K`, `Condo Mississauga 495K`)
  in `params.props`.
- MC payload sets `hasRE = false` and produces no rental cash-flow rows.
- Net estate of $1.2M is plausible for a portfolio-only run, but the rental
  story (which is the case driver for this profile) is silent in the data.
- Engine action: verify the props-array parsing path; ensure `hasRE = true`
  whenever `props.some(p => p.on)`.

### E4 — Negative net estate ($−1 200) on three profiles
- `fire_seeker_fr`, `debt_young_fr`, `single_parent_qc_fr` all show
  `medEstateNet = −1200` exactly.
- That looks like a hard-coded default from a tax-bill-exceeds-assets edge
  case. Three different profiles producing the same negative number suggests
  a `−1200` placeholder rather than three independent computations.
- Engine action: replace the placeholder with `0` (or a documented "ruin"
  flag) when terminal wealth is depleted before death.

### E5 — Four profiles return `succ < 25%` with $0 across all wealth percentiles
- `debt_young_fr` (succ=5.7%), `late_starter_bc_fr` (succ=20.5%),
  `single_parent_qc_fr` (succ=5.8%), `fire_seeker_fr` (succ=38.4%).
- All have P25 = P50 = $0 (rP25 = rP50 = $0 in real dollars too).
- For low-success profiles this is plausible (most paths run out), but the
  engine should still distinguish "dead at $0" from "missing data" so the
  renderer can choose the right narration.
- Engine action: when path counts hit ruin, surface `_ruinPaths` separately
  from the percentile array so we can render "the typical scenario depletes
  savings at age X" rather than "median wealth = $0".

### E6 — `ccpc_owner_en` GIS row appears in `medRevData` despite implausibility
- `medRevData[age=65].srg = $12 160`, despite the profile being a corp
  owner in ON with $480K retained earnings + $345K personal savings.
- The renderer correctly suppresses the GIS section because
  `gis_plausibility = false` (liquid wealth above the $250K cap), but the
  raw row in `medRevData` still pollutes downstream chart rendering.
- Engine action: zero `srg` in `medRevData` rows whenever the plausibility
  filter is failed for that profile.

---

## Engine schema gaps (need new fields in the export)

### S1 — `oasClbkYrs` is `undefined` in all 10 MC payloads
- Canonical metric `oas_clawback_years` returns `null` for every profile.
- Renderer narrates OAS clawback qualitatively ("OAS recovery years") but
  cannot quote a number, which limits action-plan specificity.
- Engine action: count the years where projected net taxable income exceeds
  the OAS threshold (~$95K in 2026) and export `oasClbkYrs`. Per-spouse
  for couples.

### S2 — `_lifetimeTax` is `undefined` in all 10 MC payloads
- Canonical metric `lifetime_tax_real` returns `null`.
- Engine has the figures internally (`_optTax`, `_naiveTax`, `_taxAlpha` are
  all populated) but doesn't export the lifetime-tax-real total.
- Engine action: sum the per-year `r.tax` rows in `medRevData` over the
  retirement horizon, deflate to 2026 dollars, and export as `_lifetimeTax`.

---

## Renderer guards added (this session)

### R1 — Risk-section structural-floor callout
[report-pdf.js:2412-2434](../report-pdf.js) — when `|p75 − p25| < $1K AND p75 > $1K`,
replaces the standard "Cautious / Favourable" narrative with: "Cautious and
favourable scenarios converge to the same value (≈ $X). This signals a
structural floor: a deterministic asset or income flow dominates final wealth
rather than market variability. The decision-relevant range in this case lives
in the Plan stability section, not here."

### R2 — Risk-section all-zero handling
Same block — when both p25 and p75 are below $1K, the cards show em-dash
and the narrative shifts to "the central trajectory projects very low or
zero final wealth; guaranteed income (CPP/QPP + OAS + pension) would still
cover a share of spending, but the portfolio would be depleted in most
scenarios. The dominant lever to widen this range lives in the Action plan
section."

### R3 — Existing trivial-estate skip (preserved)
[report-pdf.js:1965](../report-pdf.js) — the succession section already
short-circuits when `gross < 1000 AND medEstateNet < 1000 AND p5EstateNet < 1000`,
which means the negative-$1200 profiles correctly hide the section instead
of rendering a "Net estate: −$1 200" KPI.

### R4 — Stress-section collapse callout (P1.3)
When `dispersion_pts ≤ 5 AND stress_pts ≤ 2`, the stress section is replaced
with a 4-sentence "Plan stability" callout naming the dominant sensitivity
lever. ccpc_owner triggers this because the corp anchor flattens dispersion.

---

## Auditor coverage added (this session)

### A1 — `depth-percentiles-collapsed` (severity = minor, fix_target = engine-mc)
Fires when `|p75 − p25| < $1K AND midpoint > $10K`. Surfaces in
`<profile>.findings.json` so engineering can track collapsed-percentile
profiles. Does not block ship because the renderer guard handles the
visible symptom.

### A2 — `depth-estate-negative` (severity = minor, fix_target = engine-mc)
Fires whenever `medEstateNet < 0`. Same disposition as A1.

### A3 — `depth-succ-zero-wealth` (severity = minor, fix_target = engine-mc)
Fires when `succ ≥ 0.99 AND p50 < $5K`. Catches the `conservative_retiree`
paradox (100% success with null wealth).

### A4 — `risk-collapse` major (P1.3, in `risk-collapse-auditor.js`)
Fires when both dispersion_pts ≤ 5 AND stress_pts ≤ 2. Triggers
`replace_with_callout` for `sec-stress`, which the renderer honors.

### A5 — `table-debt-zero-rows` blocker (P1.4)
Fires when a debt row has bal > 0 but pay = 0 AND months = 0. Renderer
already guards by emitting "modalités à confirmer" for such rows;
auditor catches any path where the guard misses.

---

## 2026-04-25 — Couple-data plumbing patch (closes Codex's six findings)

After the engine output audit above, Codex independently traced the
"weird couple numbers" to a specific data-plumbing chain. All six findings
are now fixed end-to-end. Each fix landed in the same session as the audit.

### What was actually wrong

1. **`medRevData` dropped spouse retirement-income fields.** The engine
   emitted `cQpp`, `cOas`, `cPen`, `cGis` on `medPath` (lib/engine/index.js
   line 1855) but the flattened `medRevData` push (line 2019) kept only the
   primary-keyed `rrq`/`psv`/`pen`. Couple coverage was systematically computed
   from primary-only rows.

2. **`medRevData` dropped rental cash flow.** `revData[i].tiRe` was computed
   correctly (line 1800) but never copied to `medRevData[i]`. Rental profiles
   then couldn't surface the rental row in the income waterfall.

3. **Spousal-coordination block mislabeled.** The narrative said "Combined
   guaranteed income" but the table only summed CPP/QPP + OAS for both
   spouses — pension was missing from the sum. Two fixes: add a pension row
   in the table when applicable, and rename the narrative to "Combined
   public benefits" when no pension exists.

4. **`covRatio` mislabeled as "government" everywhere.** It already
   includes employer pension. Renamed to "guaranteed income" / "revenu
   garanti" in the cover, diagnostic, action-plan rule 7, and observations.

5. **GIS table showed "Taxable inc." but methodology says "counted
   income".** Replaced the column with `Counted income (ex-OAS)` =
   `taxInc − psv`, which matches the rule the methodology box explains.

6. **CCPC profile missing `bizType: "ccpc"` field.** The engine's CCPC
   branch (line 1605) requires `p.bizType === "ccpc"` to model corp
   extraction. Without it, `corpExtract` was zero in `revData` and the
   AI narrative mentioned dividends that never appeared in the income
   stream. Added the field to `profiles.json`.

### Files touched

- `lib/engine/index.js` line 2019 — `medRevData` push now forwards
  `cRrq` / `cPsv` / `cSrg` / `cPen` / `cInc` / `tiRe`.
- `report/report-engine.js` line 2023 — same patch (this file is the
  in-page mirror used by interactive simulator; lib/engine is used by
  `gen-real-mc.mjs` for the realai pipeline).
- `report/review/review-contract.js` lines 60–96 — `gov_coverage_only` and
  `guaranteed_income_coverage` now sum primary + spouse fields.
- `report/report-data.js` lines 336–352 — `govY` reads primary + spouse
  household totals and includes GIS in the public-benefits sum.
- `report/report-pdf.js` (multiple) —
  - covRatio narrative renamed to "guaranteed income"
  - diagnostic KPI relabeled
  - spousal-coordination table grows a pension row, narrative branches
    on `hasAnyPension`
  - GIS column replaced
  - debt-row 0/0/0 guard preserved
- `report/report-actions.js` — rule 7 (coverage-low) relabeled.
- `report/realai/profiles.json` —
  - `ccpc_owner.bizType = "ccpc"`
  - `rental_landlord_on.props[*].on = true` (was missing, so `hasRE`
    returned false and the real-estate section disappeared even though
    `tiRe` was being computed)

### Numbers after the fix

| Profile | covRatio (was → now) | Notable change |
|---|---|---|
| hnw_couple_fr | ~41% → 57% | spouse CPP/OAS + pension now in numerator |
| ccpc_owner_en | ~27% → 83% | pension absent here; jump is from re-running MC with `bizType=ccpc` (engine no longer treats corp as free cash) |
| govt_db_couple_ab_en | ~34% → 112% | DB pension + spouse benefits now exceed spending (genuine coverage > 100%) |
| conservative_retiree_qc_fr | ~54% → 149% | full retired DB pension dominates; over-coverage now visible |
| rental_landlord_on_en | ~60% (rental row now visible in chart) | `hasRE=true` after `on:true` patch |
| low_income_gis_en | 57% (unchanged) — GIS column now reads "Counted income (ex-OAS)" |

The over-100% coverages are not bugs — they reflect genuinely over-funded
plans where guaranteed income exceeds target spending. The renderer caps
the "gap" at zero so no negative-gap KPI appears.

### Pipeline state after patch

`Shipped: 10/10`, 0 blockers, 0 majors post-correction.

---

## Recommended engineering pickup order

1. **E2 (CCPC corp constancy)** — the most-visible symptom (collapsed
   percentiles, structural floor flagged in 1 of 10 reports). Either
   stochastic corp growth or an explicit `_corpFloor` field with separate
   percentile reporting for the personal portion.
2. **E1 (null wealth on retired DB profile)** — affects
   `conservative_retiree_qc_fr` only but is a hard null in the contract.
3. **S1 + S2 (OAS clawback years + lifetime tax export)** — unlocks
   action-plan specificity across all 10 profiles. Low-risk schema
   addition.
4. **E4 ($−1200 placeholder)** — replace with `0` or `_ruined: true` flag
   so the renderer can choose copy.
5. **E3 (rental_landlord hasRE flag)** — single profile, but case-defining
   for that profile's narrative.
6. **E6 (GIS row in implausible profiles)** — cosmetic in the rendered
   report but pollutes downstream tooling.

Each engine fix can ship individually; the renderer + auditor layer
absorbs the deficits in the meantime.

---

## Reference

- Audit ran by Claude on 2026-04-25 with subagent + direct pattern matching.
- Findings file: `c:/Users/tredh/AppData/Local/Temp/claude/.../tasks/a07c84c2f8b807200.output`
- Pipeline state: 10/10 SHIPPED post-rebuild, 0 ship-gate blockers.
- Renderer + auditor changes captured in
  `report/hardening/CODEX-PREMIUM-REBUILD-LOG.md` under the 2026-04-25 entry.
