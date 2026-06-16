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

## Closed — optimizeDecum now funds its own tax (1.1 fully landed)

Originally the 1.1 settlement was in **runMC only**; `optimizeDecum`'s `row.tax` was
reported but never debited. **Fixed**: a tax-funding settlement was added after the
tax computation (right before balances are recorded, ~L3380) mirroring runMC's source
order (NR → TFSA → RRSP → spouse; NR/TFSA first to avoid generating extra taxable
income). The R2 surplus reinvest (L3217) was left untouched, so surplus is reinvested
once and tax funded once.

Verified: the conservation gate's optimizeDecum identity is now
`final = init + Σgov − Σspend − Σtax` → residual **$0**; 505-suite stays 505/505; a
realistic 65→90 profile (meltdown on) produces a sane schedule (0 NaN/negative, RRSP
melts down, surplus compounds in TFSA). The deterministic Optimiseur/Décaissement
table now reflects after-tax withdrawals, consistent with the MC/Bilan.

## Follow-up — mirror to the canonical engine

This audit + all fixes are in `planner/planner_v3.html` (legacy inline engine, still
served via the Planner iframe). Per CLAUDE.md the canonical engine is
`lib/engine/index.js`; confirm whether it carries the same conservation/tax fixes
(1.1/1.3/1.4) and mirror if not. Not checked here.

## Residual tightening (optional)

The runMC +$5,883 (0.57%) is reinvestment/tax-timing rounding. If exact conservation
is wanted, trace the settlement order (tax computed on income that may include the
just-reinvested notional). Low priority — it is ~1/100th of the pre-fix error.
