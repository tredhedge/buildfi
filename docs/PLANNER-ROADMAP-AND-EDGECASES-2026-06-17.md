# Planner — Improvement Roadmap & Verified Edge Cases (2026-06-17)

Source: two multi-agent audits of `planner/planner_v3.html` + `lib/engine/index.js`.
- **Edge-case hunt:** 6 category finders → adversarial verify (refute-by-default). 9 confirmed, 3 refuted. **These are high-confidence (each confirmed against the actual code).**
- **9-dimension roadmap audit:** completed the audits; the synthesis/critique/finalize agents died on a monthly spend limit, so the roadmap ideas below are **single-agent leads to verify**, not cross-checked findings. Where the two audits disagree, the verified edge-case wins (see QPP note).

---

## A. Verified edge cases / latent bugs (fix in this order)

### A1 — HIGH · Stochastic mortality truncates the longevity tail → success rate is biased optimistic
When `stochMort=true`, every MC path's drawdown horizon is hard-capped at the fixed `deathAge` (typically 90/92 from the translators), so sampled deaths in the 91–105 tail never draw down. ~25–33% of paths are clipped; the years that should be the most adverse never run, so **success is overstated and ruin understated — for the exact tail stochastic mortality exists to model.** Worse, `avgDeath`/`deathAges` report the *un-clipped* sampled death, so reported longevity contradicts the financial horizon.
- `lib/engine/index.js:952` (`maxYrs=floor(deathAge-age)`), `:965` (`yrs=min(simDeath-age,maxYrs)`), `:1025-1026`, `:2122-2124`, `:2128`. Mirrored in `planner_v3.html` inline engine and `report-engine.js:869/913`.
- **Fix:** drive the per-path horizon from the sampled death (`yrs=floor(simDeath-age)`), size the loop to a stochastic ceiling (105), and read `finalVal` at the un-clipped death year. Decumulation Bilan 360 path (deathAge=105) is already safe. Re-run the 505-suite; expect success to drop and p5Ruin to move earlier — that's the bug being fixed, not a regression.

### A2 — MED · QPP/OAS deferral past 70 is modeled as pure loss
Benefit-amount clamps cap the actuarial credit at 70 (QPP 1.42, OAS 1.36), but the income-*start* gate still defers onset to 71/72, dropping 1–2 years of income for zero extra benefit. `qppAge` UI validation allows up to **72**, and the sensitivity sweep goes to 72 — plotting a false "tradeoff."
- Gate `index.js:330-331,376`; clamps `:243,:256`; sanitization `:950` (no upper clamp; `oasAge` unsanitized); sweep `:2683-2684`. UI `planner_v3.html:10350` allows qppAge>70.
- **Fix:** clamp start ages to their real max (QPP/OAS = **70**) at the engine sanitization layer and in the UI validation; cap the sweep at 70.
- ⚠️ **Contradiction flag:** the roadmap "engine" audit proposed the *opposite* — "QPP deferral cap 1.42→1.588, defer-to-72." That is **wrong for Canada** (CPP/QPP max deferral is age 70 → 0.7%×60mo = 42% → factor 1.42). If `planner_v3` and `lib/engine` disagree on this constant, align **both to 1.42 / age-70**, not to 72. (This is exactly what the cross-verify critique would have caught.)

### A3 — MED · `oasAge` not defaulted/clamped in `runMC` (asymmetric with `qppAge`)
Sanitization sets `qppAge = qppAge || 60` but never touches `oasAge`. If `oasAge` is `undefined`, every `age >= oasAge` is false → **OAS never paid** (large under-statement). If `0`, OAS pays pre-65. Production translators protect it, but the lenient `/api/simulate` v1 contract, `/api/compare`, and the optimizer pass `oasAge` straight through.
- `index.js:947-951`; raw use `:331,376,603,1314`. **Fix:** add `p.oasAge = Math.max(65, Math.min(p.oasAge ?? 65, 70));` after line 950.

### A4 — MED · Pension splitting over-gated at 65 for the DB life-annuity component
DB/RPP periodic pension income is "eligible pension income," splittable at **any age** under federal T1032 (and QC equiv); only RRIF/RRSP-annuity income needs the recipient to be 65+. The outer gate applies a flat `age>=65` to the DB `penMonth`, so an early-retired DB pensioner (e.g. 58) gets no splitting modeled for 58–64 — understating after-tax income exactly where it matters.
- `index.js:1350` (gate) / `:1364` (already age-distinguishes RRIF). Mirror `planner_v3.html:4502/4504`. Conservative miss (won't mislead toward optimism), but real.

### A5 — MED · MER fee-impact tab (tab 20) renders `NaN%` on an all-zero profile
All balances + contributions = 0 → benchmark final balance = 0 → `costPct = (0-0)/0 = NaN` ("NaN%"), `width:NaN%` (collapsed bars), and SVG `maxVal=0` → blank chart. Reachable (brand-new saver; even the `bpZero` test profile).
- `planner_v3.html:20822-20829`, rendered `:20875-20876,:20898,:20905`. **Fix:** guard the divisor (`zeroFinal>0 ? … : 0`), `maxVal=Math.max(1,…)`, or short-circuit to an empty state.

### A6 — LOW · Ruin "never depletes" sentinel uses two thresholds (200 vs 999)
Benign today (999≥200) but a latent trap. `planner_v3.html:11147,11939,11940,17441,17442` use `>=200`; everything else uses `>=999`. **Fix:** normalize to `>=999`, ideally a named `RUIN_NEVER` constant.

### A7 — LOW · `mc.oasClbkYrs` uses hardcoded `95000` vs canonical `OAS_CLAWBACK_THR (95323)`
Over-counts clawback years in the indexed $95,000–$95,323 band, contradicts the engine's own benefit math, and the `95000` literal evades the CI grep guard that watches for `95323`. `index.js:2757-2764`. **Fix:** use the constant.

### A8 — LOW · GIS income test ignores the employment-income exemption (+ GIS top-up)
50% taper slope is correct, but the first $5k (+50% of next $10k) employment-income exemption is missing, so a retiree with part-time income has GIS understated. Narrow audience. `index.js:264-272`.

### A9 — LOW · Bridge benefit not inflation-indexed in the deterministic `optimizeDecum` schedule
One-line parity nit: every other income line multiplies by `infM`; bridge doesn't, so the year-by-year table doesn't reconcile with MC. `planner_v3.html:3061`.

**Refuted (correctly — no fix needed):** `bfFmtMoney` Infinity (inflation is clamped 0–10%, unreachable); `optimizeDecum` OAS 50%-heuristic (dev/audit-only, not production; runMC does a proper OAS pass-2); couple→single GIS flip at spousal death (correct CRA behavior).

---

## B. Roadmap (synthesized from the 9-dimension audit; leads to verify)

> Treat as a prioritized backlog. AMF constraint throughout: observational/conditional, user-initiated actions, never prescriptive.

### Theme 1 — Trust the number (correctness first)
Fix A1–A5 above. Add an **engine-parity test** (run `planner_v3` inline engine vs `lib/engine` on a fixture set, assert equivalence) and **wire the 505-suite + qa:full into CI** (GitHub Actions). Without parity tests, the dual-engine duplication keeps drifting (A2/A9 are symptoms).

### Theme 2 — Close the decision loop (the core $69.99 value)
- **"Apply optimal plan" + per-lever apply** on the Optimizer; let **What-If commit** a tested combination to the live plan.
- **Quantify the trade-off** ("what you give up") on every lever/optimizer row.
- Persistent **baseline-vs-current** strip + auto-snapshot of entry state.
- Add a **spending-adequacy** success metric alongside binary asset-depletion.

### Theme 3 — Tame the surface (cognitive load)
- Make **Standard mode actually collapse to ~8 curated tabs** (24 is overload); Diagnostic as a hub-and-spoke launcher.
- **Ctrl-K command palette** over the 24 views; generate keyboard/pager/teaser order from one source of truth.
- Onboarding: **persist the wizard draft to KV/account** (not just `bf_used` localStorage); unify the two intake wizards (v3 modal + longform Quick Start) into one apply path; replace the **dead Cockpit/Full-form choice** with an honest CTA; determinate first-insight progress; retire stale **"BuildFi Laboratoire"** copy.

### Theme 4 — Make the paid artifact undeniable
- **Server-rendered PDF** as the canonical Bilan 360 deliverable; render the **already-generated AI slots**; unify Planner on one renderer so the emailed report == the live view; **AMF disclaimer + assumptions block**; per-customer report library / re-access page.

### Theme 5 — Money/credit/legal correctness (broken promises)
- **report-pack grants +4 credits, not +1** (flagged in *both* reporting and growth audits → likely real; verify `creditsToAdd`/`creditsToGrant`).
- Reconcile **report-link retention** with the "30 days" promise (real TTL + delete cron).
- Reconcile the landing **"jamais stockées"** claim with actual 90-day KV (Loi 25). Add a "My data" panel (export/clear); prove deletion scrubs all PII with a test.
- Fix the **EN currency/percent formatter** in the shipped 360 report (a11y audit — verify).

### Theme 6 — Performance & resilience
- Move the production MC **off the main thread** (an orphaned Web Worker reportedly already exists); replace the fake wall-clock progress bar with the **real per-sim callback**; make 5000 paths the real default with progress.
- **React error boundary** around the tab-content region.

### Theme 7 — Growth instrumentation
- Pre-seed the Planner from the buyer's intake (kill the cold start); Bilan 360→Planner upgrade nudge in report/email; fire `checkout_completed`/`report_viewed`; proactive low-credit upsell; fix the referral loop (forward `bf_ref` into checkout).

### Theme 8 — Accessibility (AA)
- `<html lang>` follows the language toggle; render the skip-link + `<main>` landmark; live region + `aria-invalid` on validation; raise inactive-rail + light-mode gold to AA contrast; accessible names + text alternative for charts.

---

## C. Confidence & caveats
- **Section A is high-confidence** (adversarially verified against code).
- **Section B is single-agent** — the synthesis/critique pass that would have deduped, re-ranked, and caught over-claims (like the A2 QPP-cap error) was lost to the spend limit. Verify each item against the code before building; some "bugs" (e.g. report-pack +4) appear in two independent audits and are higher-confidence than the rest.
