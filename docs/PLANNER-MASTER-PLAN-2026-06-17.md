# Planner — Master Implementation Plan (2026-06-17)

Sequenced plan covering the verified correctness fixes, the report unification, the
decision loop, surface taming, and resilience. Companion docs:
[verified edge cases + roadmap](PLANNER-ROADMAP-AND-EDGECASES-2026-06-17.md),
[aesthetic audit](PLANNER-AESTHETIC-AUDIT-2026-06-16.md).

**Sequencing principle:** trust before features. Correctness + the drift-guard come
first (cheap, high-trust, low-risk), then the two big value bets (report unification,
decision loop), then UX, then resilience. AMF constraint throughout: observational +
conditional, user-initiated actions, never prescriptive.

---

## Phase 0 — Correctness & trust (do first; mostly surgical)

| # | Item | Where | Effort | Risk |
|---|---|---|---|---|
| 0.1a | **Stochastic-mortality horizon truncation** — drive per-path horizon from sampled death (`yrs=floor(simDeath-age)`), size loop to a 105 ceiling, read finalVal at un-clipped death year. **This corrects a headline success-rate bias.** | `lib/engine/index.js:952/965/1025/2122`; mirror inline engine in `planner_v3.html` + `report-engine.js:869/913` | M | **High** (success/ruin numbers shift adversely — expected; needs careful re-baselining of the 505-suite + realai fixtures) |
| 0.1b | `oasAge` default+clamp in `runMC` (`p.oasAge = max(65, min(p.oasAge ?? 65, 70))`) — symmetric with `qppAge` | `lib/engine/index.js:~950` | S | Low |
| 0.1c | Clamp QPP/OAS start to **70** (engine sanitization + UI validation `planner_v3.html:10350` 60–72→60–70 + sensitivity sweep `:2683-2684` cap 70). ⚠️ Do **not** raise the cap to 72/1.588 (CPP/QPP max deferral is 70 → factor 1.42). If the two engines' caps disagree, align both to 1.42/age-70. | `index.js:243/950/2683`, `planner_v3.html` mirror + `:10350` | S | Low |
| 0.1d | DB pension-splitting gate: split the outer `age>=65` so the DB life-annuity portion is splittable at any age; keep RRIF/DC-draw portion gated 65+ | `index.js:1350/1364`; `planner_v3.html:4502/4504` | M | Low (conservative miss today) |
| 0.1e | MER tab (20) NaN guard: `zeroFinal>0 ? … : 0`, `maxVal=max(1,…)`, or empty state when no savings entered | `planner_v3.html:20822-20829` | S | Low |
| 0.1f | Low-sev cleanup batch: ruin sentinel `200→999` (`:11147/11939/11940/17441/17442`); `mc.oasClbkYrs` `95000→OAS_CLAWBACK_THR` (`index.js:2758`); bridge `*infM` in optimizeDecum (`planner_v3.html:3061`); GIS employment-income exemption (`index.js:264-272`, low priority) | various | S | Low |
| 0.2 | **Engine-parity test** — fixture set run through both `runMC` implementations (inline `planner_v3` vs `lib/engine`), assert `succ/rMedF/p5Ruin/govMonthly` match within tolerance. This is the **root-cause guard**: A2/A9 are drift symptoms. | new `tests/engine-parity.test.ts` | M | Low |
| 0.3 | Wire the embedded 505-test suite + `qa:full` into **CI** (GitHub Actions) so engine changes can't regress silently | `.github/workflows/` | S | Low |
| 0.4 | **Broken-promise fixes** (quick, financial/legal): report-pack grants **+4 not +1** (verify `creditsToAdd`/`creditsToGrant` in checkout/webhook); reconcile `report-link` "30 days" with real KV TTL + delete cron; reconcile landing "jamais stockées" with the 90-day KV (Loi 25 copy) | webhook/checkout routes; `public/index.html` | S | Low (but verify first) |

> Order: 0.1b/c/d/e/f + 0.4 (surgical, ship together) → 0.2 parity test → **then** 0.1a behind the parity test + a re-baseline.

---

## Phase 1 — Report unification (Planner report → Bilan 360 pipeline, expanded)

**Goal:** one canonical report = Bilan 360 visual quality + narration pipeline
(`renderReportHTML360` + `ai-prompt-360`), **expanded to cover the full long-form
variable set** — every added residence/rental, debts, CCPC, RSU, PE, insurance, full
couple detail. Sections self-gate (render only when data exists), so a bare Bilan stays
compact and a loaded Planner profile produces the rich report. Retire `report-html-expert.ts`.

**Reusable assets:** `report-html-expert.ts` already has the conditional-section logic +
AI slots + fallbacks for Immobilier ([:692](../lib/report-html-expert.ts#L692)), Dettes
([:739](../lib/report-html-expert.ts#L739)), Assurance ([:789](../lib/report-html-expert.ts#L789)),
plus CCPC/RSU/PE exclusive sections and couple fields ([:160-171](../lib/report-html-expert.ts#L160)).
Port that *content* into the 360 *shell*.

**Net-new (neither renderer has it):** the long-form's **repeatable collections** — both
renderers assume a single `homeVal/mortBal`; the long-form has a dynamic `properties[]`
(multiple residences + rentals), `debts[]`, `rsuGrants[]`. The unified report must be
collection-aware.

### 1.1 Data contract — extend `extractReportData360` ([:122-198](../lib/report-html-360.js#L122))
Add (derive from `params` + `mc`, which already models RE/CCPC effects):
- `properties[]` — per residence/rental: value, mortgage, ACB, net rental income, planned sale/downsize age, equity. (drives "added residences")
- `debts[]`, `rrspRoom`, `fhsa/resp/ftq`, `liraBal` (already present)
- `business` — CCPC: retained earnings, extraction mode/years, sale plan, LCGE, IPP
- `rsuGrants[]`, `altInvest` (PE/metals)
- `insurance` (life/disability/CI/group)
- `spouse{}` — full per-spouse mirror (already partially in expert `:171`)
- second pension + commuted-value comparison

### 1.2 Render blocks — extend `renderReportHTML360` ([:256-325](../lib/report-html-360.js#L256))
New self-gating `<section class="card">` blocks in the 360 style (kpi-hero + standfirst +
charts), porting expert's logic and adding collection loops:
1. **Real estate** — one card/row per property (value, equity, rental yield, sale/downsize timeline). *(first — user-named, common)*
2. **Debts** — per-debt rows + payoff timeline. **3. Insurance** — coverage gaps.
4. **Corporation (CCPC)** — retained earnings, extraction path, sale/LCGE. **5. Equity comp (RSU)** — vesting/exercise timeline. **6. Alternatives** — PE/metals.

### 1.3 AI narration — extend `ai-prompt-360.ts` ([832 lines](../lib/ai-prompt-360.ts))
Add a narration slot per new section, fed the richer context (so it can say "your two
rental properties," "your corporation's retained earnings"); each routed through
`softenAISlot` + `FORBIDDEN_TERMS` (AMF), each with a deterministic fallback.

### 1.4 Swap the four surfaces onto `renderReportHTML360`
`app/api/regenerate-report/route.ts:18`, `app/api/export/route.ts:22`, the planner's
live **Rapport tab** (inline in `planner_v3.html`), and the AI prompt. Result: preview ==
emailed artifact. Retire `report-html-expert` once parity is reached.

### 1.5 Validate
Run the realai 20-persona pipeline (covers HNW/CCPC/RE/RSU personas) through the unified
renderer; pass the `qa-check.mjs` gate; spot-check the two-rental and CCPC personas.

**Sequence within Phase 1:** data contract → real-estate block (incl. multi-property) →
debts/insurance → CCPC/RSU/PE → narration slots → surface swap → validate.

---

## Phase 2 — Close the decision loop (the live-simulator value)

| # | Item | Notes |
|---|---|---|
| 2.1 | **"Apply optimal" + per-lever apply** — the Optimizer already computes optimal lever values; wire an Apply that writes them to live params (user-initiated) | AMF: "Applying this would change success from X% to Y%." |
| 2.2 | **Quantify the trade-off** on every lever/optimizer row ("what you give up") | e.g. defer CPP → lower income 65–70 |
| 2.3 | Persistent **baseline-vs-current** strip + auto-snapshot of entry state | makes every edit legible |
| 2.4 | Let **What-If commit** a tested combo to the live plan; expand What-If to the engine's full decision set | |

---

## Phase 3 — Tame the surface (cognitive load)

- **Standard mode collapses to ~8 curated tabs** (rest behind Expert/"more"); Diagnostic as a hub-and-spoke launcher.
- **Ctrl-K command palette** over the 24 views; generate keyboard/pager/teaser order from one source of truth.
- Onboarding cleanups: persist wizard draft to KV (not just `bf_used` localStorage); retire the dead Cockpit/Full-form choice; retire "BuildFi Laboratoire" copy.

---

## Phase 4 — Performance & resilience

- Move the 5000-path MC **off the main thread** (wire the orphaned Web Worker) + a **real** per-sim progress bar (replaces the fake wall-clock one).
- **React error boundary** around the tab-content region.

---

## Phase 5 — Later (tech-debt / reach)

Extract the engine from the 23k-line HTML into a shared module both UIs import; hoist
inline styles to a memoized style map; a11y to AA (`<html lang>` follows toggle, skip-link
+ `<main>`, chart text alternatives, gold contrast); growth instrumentation
(`checkout_completed`/`report_viewed`, pre-seed Planner from intake, Bilan→Planner nudge).

---

## Confidence
Phase 0 items are code-verified (file:line). Phase 1 is well-scoped (both renderers read).
Phases 2–5 are roadmap-level (single-agent leads) — verify specifics against code at build
time. Suggested first PR: **Phase 0.1b–0.1f + 0.4** (surgical, low-risk, high-trust),
then the parity test, then 0.1a behind it.
