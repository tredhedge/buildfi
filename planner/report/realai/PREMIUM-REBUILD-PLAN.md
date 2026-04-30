# PREMIUM-REBUILD-PLAN.md

**Consolidated rebuild plan to take BuildFi reports from current 7.0–8.3/10 batch
to 9/10 (shippable premium), 10/10 (excellent), and 12/10 (market-leading vs
NaviPlan / Conquest / RightCapital).**

> **2026-04-25 status:** P1 (items 1.1–1.7) implementation complete. All 10 profiles
> ship through the new auditor lineup with **0 blockers / 0 majors** post-correction
> (`report/realai/review/_summary.json`). Code in:
> - `report/review/reviewers/{narration,action,risk-collapse,depth,compliance}-auditor.js`
> - `report/review/review-contract.js` (case_driver tokens, dispersion + collapse thresholds, ship-gate categories)
> - `report/report-pdf.js` (couple income labels, GIS methodology block, debt 0/0/0 guard, risk collapse callout, action-plan re-ranker, advisor signature, case-driver framing fallback)
> - `report/report-actions.js` (driver tags + whenLabel + case-driver baseline guarantees)
> - `report/report-ai-prompt.js` (case-driver mandate + dispersion-driver mandate)
> - `report/realai/profiles.json` (case_driver per profile)
> - `report/realai/run-pipeline.mjs` (case_driver + advisor passthrough)

Source authority for this plan:
- Codex external audit (per-profile scoring, top remaining problems)
- Internal exhaustive audit (63 weaknesses across 12 categories)
- [REPORT-SHIP-RULES.md](REPORT-SHIP-RULES.md) (canonical KPIs + ship gate)
- [BENCHMARK-MATRIX.md](BENCHMARK-MATRIX.md), [REBUILD-PHASES.md](REBUILD-PHASES.md)

---

## 0. Current state (2026-04-25 baseline)

10 profiles shipped through draft → review-pack → corrected → final pipeline.
All passed ship gate (0 post-correction blockers). Per-profile scores:

| Profile | SKU | Score | Tier |
|---|---|---|---|
| govt_db_couple_ab_en | planner | 8.3 | Strong |
| hnw_couple_fr | planner | 8.1 | Strong |
| ccpc_owner_en | planner | 7.6 | Strong but flawed |
| rental_landlord_on_en | planner | 7.5 | Strong but flawed |
| low_income_gis_en | bilan | 7.4 | Strong but flawed |
| conservative_retiree_qc_fr | bilan | 7.2 | Below premium |
| fire_seeker_fr | bilan | 7.1 | Below premium |
| single_parent_qc_fr | bilan | 7.0 | Below premium |
| late_starter_bc_fr | bilan | 6.9 | Below premium |
| debt_young_fr | bilan | 6.6 | Below premium |

Batch read: deterministic pipeline catches real bugs; remaining gap is
**semantic clarity, section usefulness, case-driver integration,
action-plan specificity** — plus structural gaps and missing auditor categories.

---

## 1. Top 7 highest-leverage fixes (do these first)

Priority 1 = required for 9/10. Complete in order.

### P1.1 — Rebuild Retirement Income section for couple/case-driver clarity
**Why:** Codex flagged "131K$ total income vs 63K$ guaranteed" reads incoherent
even when mathematically defensible. Same pattern in hnw_couple_fr (172/62)
and conservative_retiree_qc_fr (81/52).

**Spec:**
- Rename labels to canonical per [REPORT-SHIP-RULES.md §1](REPORT-SHIP-RULES.md):
  - "Couverture publique seulement" / "Public benefits only" → uses `gov_coverage_only`
  - "Couverture garantie (publics + pension)" → uses `guaranteed_income_coverage`
  - Total annual income sources → "Revenu total annuel (incluant retraits portefeuille)"
- For couples: every aggregate row labeled "Combiné", per-spouse rows labeled
  by name. No mixed metrics in same column.
- Add a 2-line transition sentence between "Public only" and "With portfolio
  withdrawals" so reader understands the gap is filled by drawdowns, not magic.
- Add real-vs-nominal disclosure once at top of section, not per row.

**Owner:** report-data.js, report-html-360.js, AI prompt builders.

### P1.2 — Integrate case drivers into the income story
**Why:** ccpc_owner letter says corp is "structural centerpiece" but revenue
section reads as CPP/OAS/withdrawals (corp invisible). rental_landlord letter
calls rentals "core engine" but no rental cash-flow row exists.

**Spec:**
- Revenue chart MUST surface the central income source from the profile:
  - CCPC profile → corp distributions row (salary + dividends + capital
    extractions)
  - Rental profile → net rental cash flow row (gross rent − expenses − mortgage)
  - HNW non-reg heavy → distributions/realized gains row
  - DB pension profile → DB pension row clearly separated from CPP/OAS
- Revenue section narration MUST reference the central source by name in
  first 2 sentences.
- Auditor B10 (chart-auditor): block ship if profile flag indicates central
  source but chart row absent. **This rule already exists** — extend it to
  the narration text, not just chart.

**Owner:** report-charts.js, ai-prompt builders, chart-auditor.js.

### P1.3 — Collapse Risk + Stress when dispersion is low
**Why:** ccpc_owner has P25=P75 collapsed at same value, all stress tests at
100%. conservative_retiree has all stress at 100% with median wealth 0$.
Showing two full sections of "everything is stable" is padding.

**Spec:**
- Compute `dispersion_pts = (p75_succ − p25_succ)` and
  `stress_pts = max(stress_succ) − min(stress_succ)`.
- If `dispersion_pts ≤ 5` AND `stress_pts ≤ 2`:
  replace both sections with single "Stabilité du plan" callout (3–4 sentences):
  "Le plan reste robuste sur l'ensemble des scénarios testés (succès entre X% et
  Y%). Les chocs de marché simulés (1973, 2008, 2020-style) ne déplacent pas
  matériellement la trajectoire. La sensibilité dominante reste {top_lever}."
- If only one threshold breached: keep the violated section, collapse the other.
- New auditor `risk-collapse-auditor` enforces the rule.

**Owner:** new pre-render filter, ai-prompt-risk.ts, new auditor.

### P1.4 — Rebuild debt table (debt_young_fr is credibility-killer)
**Why:** debt_young_fr shows 3 active debts, 348K$ total, but 0$ monthly payment
and 0 months remaining on every line. Reads as broken to any reader.

**Spec:**
- If `monthly_payment === 0` OR `months_remaining === 0`: do NOT render row.
  Replace with explicit note: "Modalités de remboursement à confirmer auprès
  du prêteur — donnée non saisie au profil."
- If all rows fail: replace table with a "Données de dette incomplètes" callout
  pointing to wizard fields that need backfill.
- Same rule applied to amortization tables (single_parent_qc_fr revenue table
  drops 185K → 1K → 0 abruptly: add "Décaissement complet de la liquidité au
  cours des années {X}–{Y}" annotation row).
- Auditor `table-auditor`: extend to flag rows with 0/0/0 numeric fields.

**Owner:** report-data.js debt block, report-html-360.js, table-auditor.js.

### P1.5 — Add GIS/SRG methodology explainer (conditional surface)
**Why:** low_income_gis_en and single_parent_qc_fr now read coherently
post-fix-pass but still risk skepticism: large lifetime GIS totals + high
"taxable income" rows without explanation of inclusion rules.

**Spec:**
- When section surfaces `gis_lifetime` or `gis_plausibility=true`: insert
  3–4 sentence methodology block before the table:
  - What "revenu imposable" includes here (CPP+RRSP+rental net, EXCLUDES
    OAS+GIS+TFSA per CRA rules).
  - Why GIS lifetime can be a large absolute number (cumulative across 25+
    years of retirement).
  - The 50¢/$ clawback threshold and how it interacts with their portfolio
    growth.
- Methodology block lives in report-glossary.js as a reusable conditional
  fragment, not duplicated per-profile.

**Owner:** report-glossary.js, report-html-360.js, ai-prompt builders.

### P1.6 — Action plan re-ranker (lever #1 must be case-defining)
**Why:** ccpc_owner action plan leads with generic RRSP-room flavor instead of
CCPC extraction order. govt_db_couple leads with estate review (fine but not
the dominant lever). late_starter_bc and conservative_retiree lead with
"formaliser les objectifs" (too weak).

**Spec:**
- Each profile carries a `case_driver` enum at the top of profile JSON:
  `ccpc_extraction | rental_cashflow | gis_trap | fire_bridge |
  db_pension_split | meltdown_window | debt_paydown | gap_savings | hnw_estate`.
- Action plan AI prompt receives `case_driver` and MUST output the first lever
  addressing that driver explicitly.
- Each lever MUST include 4 fields: `dollar_amount`, `age_or_year`, `rationale`,
  `expected_impact_pp` (delta success rate or wealth in pp/$ — required, no em-dash).
- Levers receive priority tags: P0 (case-defining), P1 (impactful >5pp),
  P2 (optimization <5pp). Section orders P0 → P1 → P2.
- New auditor `action-auditor`: blocks ship if (a) lever #1 doesn't reference
  case_driver token, (b) any lever lacks required fields, (c) fewer than
  2 P0+P1 levers present.

**Owner:** profiles.json schema, ai-prompt-actions.ts, new auditor.

### P1.7 — Add narration-auditor + depth-auditor + LLM-as-judge
**Why:** Current 4 deterministic auditors (data, table, chart, language) catch
syntactic bugs but not narration depth, repetition, profile-signal misses, or
missing structural sections. This is the single biggest pipeline gap.

**Spec:**
- `narration-auditor.js` (deterministic):
  - Detects repetition: same KPI number cited >2× across advisor_letter +
    overall_assessment + verdict slots → flag major.
  - Detects generic fill-ins: regex-bank of phrases ("In your situation",
    "It would be prudent", "Plusieurs éléments jouent en votre faveur",
    "Peu de profils") → flag major if >2 per slot.
  - Detects profile-signal absence: requires `case_driver` token to appear in
    advisor_letter AND overall_assessment → flag blocker if missing.
- `depth-auditor.js` (deterministic):
  - Required sections per SKU+profile combo (matrix in code, not config).
  - Missing required section → blocker.
  - For 9/10 tier: advisor letter signed/dated, decumulation choreography
    table present, marginal-rate glide path chart present.
- `llm-judge-auditor.js` (Claude Opus 4.7 as evaluator, post-render):
  - Sends report + REPORT-SHIP-RULES.md rubric to Claude.
  - Claude returns structured JSON: 5-axis scores (data/charts/narration/
    cohesion/compliance) + per-axis rationale.
  - Ship gate: require sum ≥ 80/100 AND no axis < 14/20.
  - Cache: skip re-judge if report unchanged from last run.

**Owner:** review/ subdirectory — three new auditors + integration into
run-pipeline.mjs.

---

## 2. Tier 2 fixes (required for 10/10)

### T2.1 — Decumulation choreography table
Year-by-year withdrawal schedule per profile:
| Age | Source | Withdrawal | Cumulative tax | End balance |
Single biggest analytical gap vs NaviPlan/Conquest. Generated from MC engine
output (median path), not AI-fabricated.

### T2.2 — Marginal tax-rate glide path chart
Line chart: marginal rate by age across retirement horizon. Drives every
withdrawal decision; currently invisible. Annotate OAS clawback window in red,
GIS clawback window in amber if applicable.

### T2.3 — Allocation glide path visualization
Stacked area chart: equity / fixed income / cash by age. Shows transition from
accumulation allocation to retirement allocation. Currently only current
allocation is shown.

### T2.4 — Side-by-side scenario comparison matrix
2×3 grid: current plan vs (retire +2y / retire −2y / spending −10%) showing
success rate, P50 wealth, OAS clawback years, lifetime tax. RightCapital's
killer feature.

### T2.5 — Behavioral coaching page
New section "Quand les marchés baissent de 30% — votre plan d'action".
3 components:
- Sequence-of-returns dread framing for first 10 years of retirement
- Loss aversion reframe for P25 scenario
- Longevity bias test ("most clients underestimate lifespan by 5 years")
Conditional content per profile (FIRE = sequence-heavy, HNW = OAS-loss heavy,
debt = behavioral discipline focus).

### T2.6 — Advisor letter signed and dated
Parameterize advisor block per profile: name, credentials (CFP, Pl.Fin., etc.),
firm, date generated. Removes "AI letter" smell; builds trust.

### T2.7 — Peer-comparison scorecard
"At your age/income/province, peer median is X% success. You're {ahead|behind|
on par}." Requires anonymized cohort baseline (build from MC sweep across
profile parameter ranges, not real client data).

### T2.8 — SKU compliance enforcement
Bilan SKU: What-If simulator present, no upsell teaser.
Planner SKU: NO simulator, prominent upsell teaser pointing to Planner.
Currently not verified by auditors. Add to `depth-auditor.js`.

### T2.9 — Print/accessibility pass
- Page-break hints in report-pdf.js (no mid-table breaks).
- Colorblind-safe encoding: red/green pairs gain pattern fills.
- Font scale guidance ("imprimer à 125% pour lecture confortable").
- ARIA labels on charts; semantic HTML structure for screen readers.

---

## 3. Tier 3 fixes (required for 12/10 — market-leading)

### T3.1 — Final-RRSP estate-tax-on-death waterfall
For RRSP balance >$100K at projected death age: show full waterfall —
Gross RRSP → deemed disposition → marginal tax bill → estate value reduction.
This is the tax bomb clients don't see coming.

### T3.2 — US estate tax exposure (HNW only)
For hnw_couple and any profile flagged with `us_assets=true`: surface FIRPTA
withholding, $12.9M federal exemption, treaty interactions. Skip for non-HNW.

### T3.3 — Tax-loss harvesting walkthrough (NR-heavy profiles)
For profiles with NR > $50K: dedicated section on superficial loss rules,
30-day window, harvest mechanics. Conditional render.

### T3.4 — CCPC salary vs dividend comparison chart
For ccpc_owner: side-by-side chart comparing $50K salary vs $50K dividend on
3 axes: corp tax saved, CPP credits earned, RRSP room created. The single
most-asked CCPC question, currently absent.

### T3.5 — Insurance gap analysis
Standard section across all profiles: life (estate tax coverage), disability
(income replacement), LTC ($80K/yr exposure). Currently zero coverage in any
of 10 reports.

### T3.6 — First-year monthly cash-flow stress
Month-by-month chart for retirement year 1: when CPP starts (delay), when tax
bill hits (March/April), when TFSA is drawn. The "first-year shock" that
breaks plans.

### T3.7 — Charitable-giving optimization (HNW)
DAF, donating appreciated securities, charitable remainder trusts. Conditional
on assets >$1.5M.

### T3.8 — "What changed since last year" delta
Requires history DB. Compare current report to prior version: market delta,
spending changes, plan adjustments. Continuity story across reports.

### T3.9 — Real-time MC re-run for What-If
Current What-If is precomputed scenarios. NaviPlan does real-time 5000-path
re-run on parameter change. Server-side endpoint + cached MC kernel.

### T3.10 — Quebec-specific compliance pass
For 4 QC profiles: RRQ (not CPP) terminology, Quebec tax brackets, QPIP, RREGOP
where relevant, Quebec succession-law specifics, CSF advisor reference.

### T3.11 — Interactive client portal
Beyond report scope. Real-time net-worth tracking, goal progress, scenario
re-runs. Database + auth required.

---

## 4. Pipeline architecture changes

### 4.1 — New auditor lineup
```
data-auditor.js          (existing — KPI consistency)
table-auditor.js         (existing — structure + new 0/0/0 row check)
chart-auditor.js         (existing — central source presence)
language-auditor.js      (existing — FR/EN leak detection)
narration-auditor.js     (NEW — repetition, fill-ins, profile signals)
depth-auditor.js         (NEW — required sections per SKU+profile)
action-auditor.js        (NEW — case_driver lever #1, P0/P1/P2 fields)
risk-collapse-auditor.js (NEW — auto-collapse Risk+Stress when stable)
compliance-auditor.js    (NEW — prescriptive verbs, disclaimer count, QC)
llm-judge-auditor.js     (NEW — Claude grades 5-axis rubric)
```

### 4.2 — Two-pass correction with re-audit
Current: draft → audit → fix-plan → corrected → post-fix audit → ship.
New: if corrected pass introduces new findings, run second correction loop
(max 2 iterations to bound cost). Single-pass risks fix-pass regressions.

### 4.3 — Per-profile prompt tuning
debt_young_fr (6.6) and late_starter_bc_fr (6.9) drag the batch. Each gets
profile-specific system prompt addendum addressing its known failure modes
(debt: payment-data realism, late_starter: weak action-plan opening).

### 4.4 — Regression test for AI prompt drift
Snapshot current narration outputs as baseline. On every prompt change, re-run
all 10 profiles, diff narration semantically (LLM-judge similarity score).
Flag drift >15% as PR-blocking.

### 4.5 — A/B harness vs prior renders
Keep last 3 versions of each profile under report/realai/history/. Diff tool
shows side-by-side + LLM-judge per-axis score delta. Confirms prompt changes
move quality forward, not just sideways.

---

## 5. Effort estimate & sequencing

| Tier | Items | Effort | Score target | Cumulative |
|---|---|---|---|---|
| P1 (top 7) | 1.1–1.7 | 3–4 weeks | 9.0/10 | 9.0/10 |
| T2 | 9 items | 6–7 weeks | 10.0/10 | 13–14 weeks |
| T3 | 11 items | 14–18 weeks | 12.0/10 | 27–32 weeks |

Sequencing principle: P1 ships independently and lifts every profile.
T2 items can ship one at a time as they're built. T3 items are individually
optional — ship in order of profile demand (HNW = T3.2/T3.4/T3.7 first;
debt/young = T3.5 first).

---

## 6. Per-profile work specific to scoring gaps

| Profile | Score | Required to reach 9.0 |
|---|---|---|
| debt_young_fr (6.6) | -2.4 | P1.4 (debt table rebuild) + P1.6 (action plan, lead with debt-paydown lever) + per-profile prompt |
| late_starter_bc_fr (6.9) | -2.1 | P1.6 (action plan, lead with savings-rate lever not "formaliser") + per-profile prompt |
| single_parent_qc_fr (7.0) | -2.0 | P1.4 (table annotation for 185K→1K→0 drop) + P1.5 (GIS explainer) + T3.10 (QC compliance) |
| fire_seeker_fr (7.1) | -1.9 | P1.6 (lever #1 = bridge-period strategy not generic) + T2.5 (sequence-of-returns coaching) |
| conservative_retiree_qc_fr (7.2) | -1.8 | P1.3 (collapse Risk+Stress) + P1.6 (stronger lever #1) + T3.10 (QC compliance) |
| low_income_gis_en (7.4) | -1.6 | P1.5 (GIS methodology block) + P1.6 (action plan specificity) |
| rental_landlord_on_en (7.5) | -1.5 | P1.2 (rental cash-flow row in revenue chart) + P1.6 (lever #1 = rental optimization) |
| ccpc_owner_en (7.6) | -1.4 | P1.2 (corp distributions in revenue) + P1.3 (collapse risk) + P1.6 (lever #1 = extraction order) |
| hnw_couple_fr (8.1) | -0.9 | P1.1 (couple income labeling) + T2.4 (scenario matrix) |
| govt_db_couple_ab_en (8.3) | -0.7 | P1.1 (couple income labeling) + P1.6 (lever #1 stronger than estate review) |

---

## 7. Definition of done

A profile reaches **9.0/10** when:
- All P1 fixes applied and verified by new auditor lineup.
- LLM-judge sum ≥ 80/100, no axis < 14/20.
- Codex-style external review confirms revenue clarity, case-driver integration,
  action-plan specificity, table credibility.

A profile reaches **10.0/10** when:
- All T2 items present and rendering.
- Decumulation choreography, marginal-rate glide path, behavioral coaching all
  surfaced.
- Print/accessibility audit passed.

A profile reaches **12.0/10** when:
- T3 conditional items render where applicable.
- Real-time What-If MC re-run available for Bilan SKU.
- Cohort peer-benchmark data in place.
- Two-pass correction + drift-regression test enforced at ship gate.

---

## 8. Open questions to resolve before P1 starts

1. **Cohort baseline data** for peer-comparison (T2.7): build via parametric
   sweep of MC across profile space, or import from public StatsCan retirement
   datasets?
2. **Advisor name/credentials** (T2.6): hardcoded BuildFi advisor, or
   parameterized per Stripe-customer (future white-label)?
3. **LLM-judge cost** (P1.7): Opus call per profile per render = ~$0.50; at
   shipping volume of 100 reports/day = $50/day. Acceptable, but cache by
   report-content-hash to avoid re-judging unchanged drafts.
4. **Two-pass correction loop bound** (4.2): 2 iterations max — what's the
   fail-open behavior if the second correction also introduces findings?
   Default proposal: ship anyway with a soft-fail JSON flag, alert internally.

---

## 9. Reference

- [REPORT-SHIP-RULES.md](REPORT-SHIP-RULES.md) — canonical KPIs, ship gate
- [BENCHMARK-MATRIX.md](BENCHMARK-MATRIX.md) — competitor feature matrix
- [REBUILD-PHASES.md](REBUILD-PHASES.md) — earlier phase plan (this doc supersedes)
- [V3-ENGINE-AUDIT-REPORT.md](V3-ENGINE-AUDIT-REPORT.md) — engine baseline
- [CLAUDE.md](../../../CLAUDE.md) — project rules, AMF compliance, internal naming
- [docs/ARCH-BILAN-360.md](../../../docs/ARCH-BILAN-360.md) — architecture decisions

---

## 10. Appendix — Full 63-weakness registry (nothing dropped)

Every weakness from the exhaustive audit is mapped here to a tier item. Items
that were folded into a bucket get an explicit sub-spec line so they don't get
lost during implementation.

### A. Narration quality

- **A1** Profile signals under-surfaced (CCPC integration timing, GIS trap, FIRE bridge, debt discipline) → P1.2 + P1.6 + P1.7 narration-auditor `case_driver` token check.
- **A2** Repetition across slots (same KPI cited 3× in advisor_letter / verdict / overall_assessment) → P1.7 narration-auditor repetition rule.
- **A3** Generic AI fill-ins ("In your situation", "Peu de profils") → P1.7 narration-auditor regex bank.
- **A4** Tone drift FR vs EN (Claude-translated, not natively written) → **P1.7 sub-spec:** narration-auditor compares FR/EN narration pairs for parallel structure; flags FR sentences that read as literal EN translations (e.g. word-order anglicisms). See also I52 for native-review pass.
- **A5** No behavioral coaching content → T2.5.

### B. Data integrity & KPIs

- **B6** Coverage metric ambiguity (`gov_coverage_only` vs `guaranteed_income_coverage`) → P1.1.
- **B7** Dispersion misinterpreted (P25/P75 spread cited without naming the driver: market vol vs sequence-of-returns vs spending variance) → **P1.1 sub-spec:** add 1-sentence "driver of dispersion" callout in every Risk section ("La dispersion vient principalement de {top_lever}, pas de la volatilité marché").
- **B8** Pre-tax vs post-tax framing in tax narration (29.9% effective rate — does it include OAS recovery?) → **P1.1 sub-spec:** every effective-rate citation must specify scope (clawbacks in/out) inline.
- **B9** Household vs per-spouse mixing in coverage % → P1.1.
- **B10** Real vs nominal dollars never disclosed → P1.1.

### C. Charts & tables

- **C11** Tornado bars lack dollar-magnitude axis labels → **T2.2 sub-spec:** when building marginal-rate glide path also add labelled axes to existing tornado (cross-cutting fix in report-charts.js).
- **C12** No side-by-side scenario matrix → T2.4.
- **C13** No decumulation choreography timeline → T2.1.
- **C14** No allocation glide path → T2.3.
- **C15** No marginal tax-rate glide path chart → T2.2.
- **C16** No RRSP meltdown walkthrough chart (decade-by-decade RRSP balance + tax bill) → **T3.1 sub-spec:** estate-tax-on-death waterfall extended back through retirement years to show the meltdown decade-by-decade.
- **C17** No sparklines in tables → **T2.9 sub-spec:** inline SVG sparklines in trend cells (RRSP balance evolution, etc.); deferred to print/a11y pass.
- **C18** 8.5×11 cashflow table overflow → T2.9.
- **C19** ~70% of charts lack "what to see here" callouts → **T2.1 sub-spec:** every chart in every section gets a 1-sentence insight caption; new auditor field `chart.insight_caption` checked by chart-auditor.js as part of P1.2 extension.

### D. Structural depth gaps

- **D20** No signed/dated advisor letter → T2.6.
- **D21** No year-by-year decumulation schedule → T2.1.
- **D22** No "what changed since last year" delta → T3.8.
- **D23** No behavioral coaching page → T2.5.
- **D24** No final-RRSP estate-tax-on-death waterfall → T3.1.
- **D25** No US estate tax for HNW → T3.2.
- **D26** No tax-loss harvesting walkthrough → T3.3.
- **D27** No CCPC salary-vs-dividend comparison → T3.4.
- **D28** No cross-province location optimization for couples in different provinces → **T3 NEW item T3.12:** Couple cross-province tax-arbitrage analysis. Conditional render when `spouseA.province !== spouseB.province`. Surfaces income-attribution opportunities.
- **D29** No insurance gap analysis → T3.5.
- **D30** No first-year monthly cash-flow stress → T3.6.
- **D31** No retirement readiness scorecard with peer comparison → T2.7.
- **D32** No charitable-giving optimization for HNW → T3.7.
- **D33** No RDSP/RESP analysis → **T3 NEW item T3.13:** RDSP/RESP-if-applicable conditional section. Surfaces when profile flags `dependents_with_disability=true` (RDSP) or `dependents_school_age=true` (RESP grant matching, 20-40% instant return).

### E. Action plan quality

- **E34** Levers not sequenced → P1.6 (4-field requirement).
- **E35** No dollar quantification per lever → P1.6 (`dollar_amount` required field).
- **E36** No P0/P1/P2 priority flags → P1.6 (priority tag required).
- **E37** Levers not tied to top-3 weaknesses → P1.6 (`case_driver` lever #1 enforcement).
- **E38** No dependency chain ("once X works, then consider Y") → **P1.6 sub-spec:** add optional `depends_on: lever_id` field; action-auditor surfaces dependency edges as a 1-line note under each dependent lever.

### F. Compliance & tone

- **F39** 15+ disclaimers per report reads as legal waiver → **P1.7 / 4.1 sub-spec:** compliance-auditor enforces max 4 disclaimer instances per report; surplus instances rewritten to single appendix reference. New section "Portée et limites" centralizes disclaimers.
- **F40** Prescriptive verbs leak ("méritent d'être validés") → 4.1 compliance-auditor regex bank.
- **F41** Quebec-specific compliance gaps → T3.10.
- **F42** Conditional tense inconsistent → 4.1 compliance-auditor tense-pattern check.

### G. Interactivity (SKU)

- **G43** What-If simulator usage undocumented → **T2.8 sub-spec:** every Bilan report carries a "How to use the What-If" callout (5-10 adjustable parameters listed, expected re-run latency stated). Required field in depth-auditor checklist for Bilan SKU.
- **G44** Mobile/print fallback statement missing → **T2.8 sub-spec:** when What-If renders, also render a graceful-degradation note: "Sur mobile ou en version imprimée, accédez à la version interactive complète à {planner-url}". Required for both Bilan and Planner SKU.
- **G45** SKU compliance not audited (Planner should have NO simulator + upsell teaser) → T2.8.

### H. Pipeline & auditors

- **H46** Missing auditors (narration, depth, action, compliance) → 4.1.
- **H47** No regression test for AI prompt drift → 4.4.
- **H48** No A/B harness vs prior renders → 4.5.
- **H49** No LLM-as-judge automated grader → P1.7.
- **H50** Single-pass correction → 4.2.

### I. Bilingual parity

- **I51** No FR vs EN length parity check → **4.1 sub-spec:** language-auditor extension. Computes word-count ratio FR/EN per slot; flags major when ratio outside [1.05, 1.25] (FR naturally 10-15% longer; outside that band signals one version is thin).
- **I52** Translation quality not natively reviewed (no Quebec editorial pass) → **T3 NEW item T3.14:** Native FR editorial review pass — either human reviewer in loop or fine-tuned QC-French style model. Quebec phrasing audit, regional terminology fidelity (REER/RRSP usage convention by province, RRQ vs CPP, etc.).
- **I53** Quebec-specific context absent → T3.10.

### J. Print & accessibility

- **J54** Page-break placement → T2.9.
- **J55** Color-only red/green encoding → T2.9.
- **J56** Font-size guidance for elderly readers → T2.9.
- **J57** ARIA labels + screen-reader reading order → T2.9.

### K. Strategic positioning vs competition

- **K58** No Roth-equivalent ladder analysis (TFSA/NR sequencing walkthrough) → **T3 NEW item T3.15:** Tax-deferred sequencing walkthrough — TFSA-first vs RRSP-first vs blended decision matrix with explicit Roth-conversion-style ladder for non-reg → TFSA shifts. Shares engine with T2.1 decumulation table.
- **K59** No US tax on RRIF for dual citizens → **T3.2 sub-spec extension:** US-citizen flag handling adds RRIF withholding (25% baseline, treaty interactions, Form 8891 historical reference).
- **K60** What-If is precomputed scenarios, not real-time MC re-run → T3.9.
- **K61** No estate-plan-as-spreadsheet (executor timeline) → **T3 NEW item T3.16:** Executor-timeline section — probate filing, RRSP distribution mechanics, estate tax payment timing, beneficiary notification calendar. Conditional render for assets > $500K.
- **K62** No healthcare cost escalation model → **T3 NEW item T3.17:** Healthcare cost projection — LTC ($80K/yr → $25K/yr realized escalation), dental, drug coverage, home-care alternatives. Conditional render for ages 65+ at retirement.
- **K63** No interactive client portal → T3.11.

### Tier 3 update — additional items added by this registry

T3 originally had 11 items. Registry adds 6 more:

- T3.12 — Cross-province location optimization (D28)
- T3.13 — RDSP/RESP analysis (D33)
- T3.14 — Native FR editorial pass (I52)
- T3.15 — Tax-deferred sequencing walkthrough (K58)
- T3.16 — Executor-timeline section (K61)
- T3.17 — Healthcare cost projection (K62)

Updated T3 effort estimate: **17 items, ~16-20 weeks** (vs original 14-18).

### Coverage summary

| Audit category | Items | Tier mapping | All covered? |
|---|---|---|---|
| A. Narration quality | 5 | P1.2, P1.6, P1.7, T2.5 | ✓ |
| B. Data integrity | 5 | P1.1 (+ sub-specs B7, B8) | ✓ |
| C. Charts & tables | 9 | T2.1–T2.4, T2.9, T3.1 (+ sub-specs C11, C17, C19) | ✓ |
| D. Structural depth | 14 | T2.1, T2.5–T2.7, T3.1–T3.7, T3.12, T3.13 | ✓ |
| E. Action plan | 5 | P1.6 (+ sub-spec E38) | ✓ |
| F. Compliance | 4 | 4.1 compliance-auditor, T3.10 (+ sub-spec F39) | ✓ |
| G. Interactivity | 3 | T2.8 (+ sub-specs G43, G44) | ✓ |
| H. Pipeline | 5 | 4.1, 4.2, 4.4, 4.5, P1.7 | ✓ |
| I. Bilingual | 3 | 4.1, T3.10, T3.14 | ✓ |
| J. Print/a11y | 4 | T2.9 | ✓ |
| K. Strategic | 6 | T3.2, T3.9, T3.11, T3.15–T3.17 | ✓ |
| **Total** | **63** | | **63/63** |
