# BuildFi Report Benchmark Matrix — Phase 1

**Target:** beat NaviPlan / Conquest / RazorPlan in a 18-22 page format.
**Edge:** validated 453-test engine + Opus 4.7 AI narration + editorial design + bilingual.
**Methodology:** public sample reports + Advisor.ca 2024 comparisons + kitces.com vendor analysis.

---

## 1. Competitive Landscape

| Platform | Country | Price/yr | Sample pages | Engine | AI | Bilingual |
|---|---|---|---|---|---|---|
| **NaviPlan** (InvestCloud/Advicent) | CA + US | $2,500 | **47** (Ativa sample) | Deterministic + MC | None | Yes |
| **Conquest Planning** | CA + US + UK | ~$1,500 (est.) | Unknown, AI-led | SAM rule-based | Rule-based "SAM" | Yes |
| **RazorPlan** (Objectway) | CA | $745-$1,070 | **23** (Full Report) | Deterministic + MC | None | Yes |
| **Snap Projections** | CA | ~$900 | **14-16** (Long sample) | Deterministic + stress | None | Yes |
| **eMoney Advisor** | US | $3,600+ | **14** (Retirement) | Advanced MC | None | No |
| **MoneyGuidePro** | US | $1,500+ | N/A | Deterministic goals-based | None | No |
| **BuildFi Laboratoire** | CA | $49.99 + $29.99/yr | **Target: 18-22** | MC 5000-sim, fat-tail, stochastic mortality | **Opus 4.7 per section** | **Native FR/EN** |

---

## 2. Section Inventory (12 canonical sections across all benchmarks)

Observed across NaviPlan, RazorPlan, Snap, eMoney samples:

| # | Section | NaviPlan | RazorPlan | Snap | eMoney | BuildFi today | BuildFi target |
|---|---|---|---|---|---|---|---|
| 1 | Cover + advisor branding | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 2 | Advisor letter / engagement | ✓ (pp 5-6) | – | – | – | – | ✓ |
| 3 | Table of contents | ✓ (pp 2-3) | ✓ | – | – | ✓ | ✓ |
| 4 | Plan summary / Exec dashboard | ✓ (p 7) | ✓ | ✓ (tile) | ✓ | partial | **✓ strengthened** |
| 5 | Personal info + goals declared | ✓ | ✓ | ✓ | ✓ | partial | ✓ |
| 6 | Goal-by-goal feasibility | – | ✓ | ✓ | ✓ | – | ✓ |
| 7 | Net worth projection (stacked chart) | ✓ | ✓ | ✓ | ✓ | partial | ✓ |
| 8 | Cash flow year-by-year table | ✓ | ✓ | ✓ | ✓ | partial | ✓ |
| 9 | Retirement income stack (QPP/OAS/pen) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 10 | Tax projection year-by-year | ✓ | ✓ | ✓ | ✓ | partial | ✓ |
| 11 | Draw-order / withdrawal strategy | – | partial | ✓ | partial | – | **✓ our differentiator** |
| 12 | Monte Carlo fan chart + histogram | – (NaviPlan text-only) | ✓ | ✓ | ✓ | ✓ | ✓ **5000-sim fat-tail** |
| 13 | Stress tests (named scenarios) | – | – | ✓ | – | – | **✓ our differentiator** |
| 14 | Sensitivity / levers (real sweeps) | partial | partial | partial | ✓ | gated (Phase 2) | ✓ **4×real sweeps** |
| 15 | Estate waterfall (probate + rollover) | ✓ (pp 30+) | ✓ | partial | partial | partial | ✓ **per-province** |
| 16 | Asset allocation current vs target | ✓ | ✓ | – | ✓ | – | ✓ |
| 17 | Insurance needs | ✓ | ✓ | – | – | – | (optional) |
| 18 | Action plan with $ impact | partial | – | – | partial | – | **✓ rule engine** |
| 19 | Assumptions / methodology | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| 20 | Disclosures / disclaimer | ✓ (p 4) | ✓ | ✓ | ✓ | partial | ✓ |
| 21 | AI narrative per section | **✗** | partial (SAM) | ✗ | ✗ | ✓ basic | **✓ per-section, 3-voice** |
| 22 | Bilingual parity FR/EN | partial | ✓ | ✓ | ✗ | ✓ | **✓ native** |

---

## 3. What Each Competitor Does Well (learn from)

### NaviPlan — The Enterprise Standard
- **Estate module depth**: probate, bequests, insurance gap, tax-at-death — best-in-class
- **Custom report builder**: advisors pick which of "hundreds" of pages to include
- **Insurance module**: legacy goal planning integrated
- **Weakness:** 47-page bloat; exported to Word for styling (native is stiff); calendar-year default (not age-based)

### RazorPlan — The Focused-Report Approach
- **4 retirement options presented together**: lifestyle, retirement age, risk, asset allocation — forces the tradeoff conversation
- **Specialized reports**: 10 focused reports (tax, estate, investment, risk mgmt, etc.) sold separately
- **One-page summary layouts** for executive view
- **Weakness:** no automated pension calc (85-factor etc.); limited customization

### Conquest Planning — The AI-Led Upstart
- **SAM (Strategic Advice Manager)**: AI suggests next best decisions based on client data
- **WCAG 2.1 accessibility** (only one to meet it)
- **Detail toggle**: advisors choose summary vs classification depth per section
- **Weakness:** SAM is rule-based, not generative; not truly personalized prose

### Snap Projections — The Canadian Specialist
- **Tile-based customizable summary** (moveable components)
- **Side-by-side scenario comparison** — excellent estate strategy tool
- **Age-based toggling** (default to client age not calendar year — big UX win)
- **Stress-testing** (market downturns, healthcare shocks)
- **Weakness:** visual presentation plain; no AI narration

### eMoney — The US Data-Dense Standard
- **Dense data visualizations** (scatter, timeline, allocation)
- **Callout typography** (Lato-Bold + sidebar annotations)
- **Professional font hierarchy**
- **Weakness:** US tax only; 14 pages means shallow coverage per section

---

## 4. The 20-Gap List (ranked by impact on quality perception)

### TIER 1 — MUST CLOSE to match benchmark (8 gaps)

1. **Per-goal funding analysis** — Each declared goal gets its own mini-plan (amount, year, funding source, probability met). RazorPlan/Snap/eMoney have this. Ours: list only.
2. **Year-by-year cash flow statement** — compact table with income/tax/savings/spend rows. All benchmarks have it. Ours: partial.
3. **Draw-order visualization** — heatmap showing which account $ comes from each year. Only Snap has this well. **Our differentiator** if done with engine-traced data.
4. **Real stress tests** — named scenarios (2008 GFC, 1973 stagflation, longevity +5, early widowhood). Snap has partial. Big gap in our current output.
5. **Estate waterfall with province-specific probate** — gross → tax → probate → net. NaviPlan has this. Ours: summary only.
6. **Asset allocation current vs glide** — NaviPlan/RazorPlan have. Ours: none.
7. **Action plan with $ impact + timeline** — prioritized cards (immediate/1yr/5yr). Conquest SAM has. Ours: none.
8. **Retirement readiness number (big, communicable)** — one-liner clients remember. RazorPlan does this. Ours: scattered KPIs.

### TIER 2 — NICE-TO-HAVE for parity (7 gaps)

9. **Advisor engagement letter** (page 2, 1 page) — personal tone, NaviPlan has it as pp 5-6.
10. **Insurance gap section** — NaviPlan + RazorPlan. Needs engine emission.
11. **Real-sensitivity sweeps** — Phase 2 of plan (closed-form already removed).
12. **Annual snapshot grid** — 5-year interval net worth + income + tax strip.
13. **Age-based axis toggle** (client age vs calendar year) — Snap/Conquest win.
14. **WCAG 2.1 accessibility audit** — Conquest's edge.
15. **Alternative scenario compare (current vs recommended)** — Snap has side-by-side; ours: single scenario.

### TIER 3 — OUR MOAT (5 things NONE of them do well)

16. **Per-section AI narration with compliance gating** — Opus 4.7 generating personalized, cross-section-synthesized prose per section. Conquest SAM is rule-based; none of the others have generative AI. **This is our weapon.**
17. **Zero-fabrication guarantee** — every $ in the report traceable to payload. No competitor can claim this — they ship Word exports where advisors hand-edit.
18. **Bilingual native parity** — FR/EN identical structure, only narrative differs. Snap + NaviPlan do partial; nobody does native-quality FR Canadian as first-class.
19. **Editorial design** — all competitors look like enterprise Word docs. Typography-first (Playfair or similar serif display + Inter body + JetBrains mono numerics) is immediately differentiating.
20. **Fat-tail Monte Carlo with stochastic mortality + inflation** — Snap's stress test is parametric; ours has 5000 sims with t-Student distribution. Technically superior, can be surfaced explicitly in methodology.

---

## 5. Revised Report Structure — 18-22 Pages

User constraint: 50 pages was too heavy. Target = 18-22 pages. Every page earns its place.

| # | Page | Section | Source | Notes |
|---|---|---|---|---|
| 1 | 1 | **Cover** | Engine + client | Name, advisor, date, version, gold/dark palette |
| 2 | 2 | **Advisor letter** | AI (`advisor_letter` slot) | 1-page, warm, personal, 180-220 words |
| 3 | 3 | **TOC + Your Plan Today** | Engine | Side-by-side: 10 sections + snapshot grid |
| 4 | 4 | **Executive verdict** (30-sec read) | AI + engine | Grade, succ rate, 3 key findings, 3 top levers |
| 5 | 5-6 | **Your goals & feasibility** | Engine goalsLedger + AI | 1 mini chart per goal + probability + funding path |
| 6 | 7-8 | **Net worth trajectory** | Engine pD + AI | Fan chart P5-P95 + stacked area by account + narrative |
| 7 | 9 | **Retirement income** | Engine medRevData + AI | Income stack (QPP/OAS/pen/draw) + coverage ratio |
| 8 | 10 | **Cash flow year-by-year** | Engine revData | Compact table, 5-year intervals, highlight retirement + peak-tax years |
| 9 | 11 | **Tax schedule** | Engine + AI | Marginal/effective timeline + OAS clawback years highlighted |
| 10 | 12 | **Draw-order strategy** | Engine drawTrace + AI | Heatmap: account × age × $ drawn (our differentiator) |
| 11 | 13 | **Monte Carlo detail** | Engine | Fan chart + histogram + percentile table |
| 12 | 14 | **Stress tests** | Engine 6-scenario runs | 2008 GFC / 1973 stagflation / longevity +5 / widowhood / 4% inf / lost decade |
| 13 | 15 | **Sensitivity levers** | Engine _sweeps + AI | Tornado: returns ±1%, inflation ±1%, spending ±10%, longevity ±5 |
| 14 | 16 | **Estate & succession** | Engine estateDetail + AI | Waterfall: gross → RRSP tax → CG tax → probate (province) → net |
| 15 | 17-18 | **Action plan** | Rule engine + AI | 5-8 prioritized cards with $ impact + timeline + AI rationale |
| 16 | 19 | **Assumptions** | Engine params | Returns, inflation, longevity, tax year, MER, province |
| 17 | 20 | **Methodology** | Static | 5000-sim Monte Carlo, t-Student fat tail, CPM-2023, 2026 tax |
| 18 | 21 | **Disclosures** | Static | AMF/OSFI, conditional language declaration, advisor signature block |
| 19 | 22 | **Footer page** (signature line) | Static | Advisor + client + date |

### Conditional add-ons (max +4 pages for complex profiles)
- **+1 page: Corp/CCPC extraction plan** (only if `bizOn`)
- **+1 page: Real estate portfolio** (only if `props.length > 0`)
- **+1 page: Meltdown detail** (only if `hasMeltdown`)
- **+1 page: GIS analysis** (only if `gis` eligibility projected)

**Rule:** 18 base pages + up to 4 conditional = **max 22 pages**. No profile exceeds.

---

## 6. Narrative Tone Benchmark

Advisor.ca observation: *"Advisors prioritize recommendation engines that guide conversations, age-based reporting for client comprehension, and flexible estate planning scenarios."*

**Voice rules for BuildFi (three-voice model):**
1. **Analyst** (deterministic) — facts, numbers, engine output. Short sentences. Neutral tone.
2. **Advisor** (AI Opus 4.7) — personal, warm, names, cross-section synthesis. 2-4 sentences per slot.
3. **Compliance** (static) — conditional tense, AMF-safe, footnotes. Terse.

Each section: **Analyst lead → Advisor interpretation → Compliance footnote**. Three-beat rhythm throughout.

---

## 7. Design Differentiation Cues

From benchmark analysis:

| Competitor | Design signature | What we'll do differently |
|---|---|---|
| NaviPlan | Arial 10pt, navy headers, 3-col tables | Serif display font + Inter body; 8px grid |
| RazorPlan | Preset layouts, limited custom | Editorial magazine-style layout |
| Conquest | WCAG 2.1 palette compliance | Match + add high-contrast mode |
| Snap | Tile-based flexibility | Fixed layout discipline, but premium typography |
| eMoney | Lato-Bold emphasis, sidebar annotations | Similar weight hierarchy with our own type stack |

---

## Deliverables Locked

1. **This file** (`BENCHMARK-MATRIX.md`) — Phase 1.1, 1.2, 1.3 exit criteria met.
2. **Section count: 18-22 pages**, not 50 — user constraint respected.
3. **20 gaps identified**, ranked by impact.
4. **Moat identified**: AI narration + zero-fabrication + editorial design + FR/EN native + fat-tail MC.

Next: Phase 2 (engine output contract expansion) — emit the fields needed for draw-order heatmap, stress tests, goal ledger, real sweeps, estate waterfall.

---

## Sources

- [NaviPlan Sample Plan (Ativa)](https://www.ativa.com/sample-plans/SamplePlan1.pdf) — 47-page comprehensive
- [RazorPlan Sample Reports](https://razorplan.com/sample-reports/) — 10 report types, Full = 23 pages
- [Snap Projections Long Sample Report](https://snapprojections.com/wp-content/uploads/2024/05/Snap-Projections-Long-Sample-Report-EN.pdf)
- [eMoney Retirement Income Overview](https://content.emaplan.com/knowledgebase/plans-%20retirement%20income%20overview.pdf) — 14 pages
- [Advisor.ca — What advisors look for in retirement planning software](https://www.advisor.ca/practice/technology/what-advisors-look-for-in-retirement-planning-software/)
- [Advisor.ca — How advisors pick financial planning software](https://www.advisor.ca/practice/planning-and-advice/how-advisors-pick-financial-planning-software/)
- [Conquest Planning Home](https://www.conquestplanning.com/)
- [NaviPlan Client Reporting docs](https://ca.naviplancentral.com/npsgccdn/web/webapp/help/en/lvl2/Content/pages/cl_nextgen.htm)
- [Globe & Mail — The secret weapon financial planners can use](https://www.theglobeandmail.com/investing/personal-finance/article-the-secret-weapon-financial-planners-can-use-to-settle-all-your/)
