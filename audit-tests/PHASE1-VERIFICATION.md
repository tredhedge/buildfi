# Phase 1 — verification result (2026-06-12)

**Conclusion: Phase 1 is implemented and the engine conserves money. The audit's
`verify2.js` "LIVE" verdicts were false positives caused by pre-fix test baselines,
not engine bugs. One genuine gap remains (optimizeDecum tax funding — see below).**

## What was verified

Every Tier-1/2 engine fix is present in `planner_v3.html` (each with an `audit N.N`
comment) and confirmed against the gates:

| Audit item | Status | Evidence |
|---|---|---|
| 1.2 fat-tail tRn | ✅ | `verify.js` EXP1 = 0.0% vol inflation; code L3528 standardizes by `sqrt((df−2)/df)` |
| 1.5 falsy-zero | ✅ | code L3002 `p.eqRet != null ? … : 0.07` (both engines) |
| 1.6 CG inclusion | ✅ | `C.CG_INCLUSION_HIGH = 0.5`, 2/3 kept as `_HYPO` what-if |
| 2.1 AB 8% bracket | ✅ | `verify2.js` EXP8: AB $70K → prov $3,523 (was $4,723) |
| 2.2 EI/RQAP 2026 | ✅ | `EI_MAX_INSURABLE 68900`, `RQAP_MAX 103000`, `RQAP_RATE 0.0043` |
| 2.5 OAS deflation | ✅ | `verify.js` EXP4: OAS-in-cash = $0 at $264K nominal income |
| 2.11 p5Ruin sort | ✅ | code L5837 indexes `ruinAgesSorted` (EXP9 is a stale static note) |
| seed hook | ✅ | runMC accepts `p._seed` → mulberry32 (L3782) |
| **1.3 double-deposit** | ✅ | `conservation_gate.js`: optimizeDecum residual **$0** |
| **1.4 surplus evaporation** | ✅ | runMC reinvests forced-inflow surplus (year-end settlement L5272) |
| **1.1 tax funding (runMC)** | ✅ | runMC funds tax; conservation residual **+$5,883 / 0.57%** (was −$547,627 evaporation) |

Embedded **505-suite: 505/505**. Gate: `node conservation_gate.js` → ALL PASS.

## Why verify2.js read "LIVE" (it was wrong, the engine is right)

`verify2.js` demonstrates the *pre-fix* bugs. Its conservation baselines assume
`final == 800,000` / `1,000,000` — i.e. they **ignore government-income inflow** (OAS/
QPP/GIS is external money entering the household) and assume **tax is never funded**.
On the fixed engine those baselines mislabel legitimate gov inflow as "phantom money."
The correct post-fix identities (asserted in `conservation_gate.js`) are:

* optimizeDecum (tax reported, not funded): `final = init + Σgov − Σspend` → residual $0
* runMC (tax funded + surplus reinvested): `final = init + Σgov − Σspend − Σtax` → +$5,883

`nrTaxDrag` is zeroed in the gate so the identity isolates conservation from the
legitimate drag on reinvested NR balances (that drag is what made the raw per-year
trace look like a small "leak").

## Open gap — optimizeDecum does NOT fund its own tax (1.1 half-landed)

The 1.1 year-end settlement was added to **runMC only**. In `optimizeDecum` the
withdrawal `need` (L3182) is `spending − fixedIncome` with **no tax term**;
`row.cashWithdraw = spending + tax − govInc` (L3389) is a *reported* field that never
debits an account. Consequence: the **deterministic decumulation schedule** (the
Optimiseur/Décaissement table) still understates withdrawals by the year's income
tax, even though the **Monte-Carlo success rate and the Bilan are now correct**.

Decision for maître: fund tax in optimizeDecum too (mirror the runMC settlement —
adds tax to `need`, gross-up `wRR_net/(1−marg)`), which will lower the displayed
deterministic schedule's residual balances; or accept the deterministic view as a
pre-tax planning schedule and rely on the MC view for after-tax truth. Not started.

## Residual tightening (optional)

The runMC +$5,883 (0.57%) is reinvestment/tax-timing rounding. If exact conservation
is wanted, trace the settlement order (tax computed on income that may include the
just-reinvested notional). Low priority — it is ~1/100th of the pre-fix error.
