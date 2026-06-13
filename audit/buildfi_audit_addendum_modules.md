# BuildFi Audit — Addendum: Auxiliary Modules & Longform Internals

Companion to `buildfi_audit_2026-06-10.md`. Scope: everything inside the two uploaded HTML files that the main audit only skimmed — the SAM strategy engine, `calcCorpTax`, the debt modules, `calcInsuranceNeed`, `runSmithSim`, and the longform's collection/validation/export logic. The 9 `report/*.js` files remain unauditable (local-only; the deployed buildfi.ca serves only the Next.js `/simulateur` bundles — probed directly, all `report/` paths 404).

---

## A. SAM strategy engine (`SAM_STRATEGIES` + `_evalSAM`, v3 ~12046) — the "leviers identifiés" ranking is structurally compromised

`_evalSAM` scores every strategy card by running **`optimizeDecum` only** (never `runMC`), so the ranking inherits the deterministic engine's Tier-1 defects wholesale: the phantom-money double-deposit (main 1.3) credits spurious wealth to any card that increases RRIF/melt surplus, the falsy-zero defaults (1.5) are at their worst there, and — because taxes never reduce wealth (1.1) — **deferral strategies are systematically penalized**: their cash-flow cost shows up in `finalBal` while their tax/clawback benefit is invisible.

**Empirical proof (live run, representative 55-y.o. QC profile):**

| Card | ΔWealth | ΔTax saved | Verdict |
|---|---|---|---|
| `optWd` (stratégie de retrait optimisée) | **0** | **0** | inert — `wStrat` is a `runMC`-only parameter; `optimizeDecum` never reads it |
| `payDebt` | **0** | **0** | inert — neither engine models debts at all (see B) |
| `guardrails` (Guyton-Klinger) | **0** | **0** | inert — no GK logic in `optimizeDecum` |
| `lifeIns` | cond=false (couples only) | — | inert for singles; no insurance modelling in `optimizeDecum` anyway |
| `qpp70` | **−309,469** | **−48,833** | scored as a bad idea — the deferral's tax/longevity value can't register |
| `meltdown` | −36,405 | +97,982 | wealth figure includes the 1.3 phantom deposits |

So ~4 of the 21 cards can *never* surface as levers regardless of merit, and the score `0.6·ΔWealth + 0.4·ΔTax` is computed on numbers the Tier-1 bugs corrupt. (Amusingly, the 0.6/0.4 blend only avoids double-counting tax *because* taxes don't touch wealth in this engine — fix 1.1 and the score starts double-counting.)

Card-level issues: **`payDebt.apply` deletes the liabilities for free** (`debts: []` with no cash outflow — magic deleveraging, moot today only because debts aren't modelled); **`maxRRSP` caps at $31,560 = the 2024 dollar limit** (2026: $33,810); `qpp70`'s copy hardcodes "+42%" and the family lacks a QC-specific qpp72 card (ties to main 2.3); `lifeIns.apply` injects a flat $500K/$150-mo policy for everyone — acceptable as illustration, and the compliance framing comment is good.

**Fix:** score strategies with the engine that can see them — `runMC` with paired seeds (see F) — or at minimum route `wStrat/gkOn/insurance/debt` cards through `runMC` and tag the rest; make `payDebt.apply` debit `Σbal` from NR/TFSA; bump the RRSP cap to `C`-sourced constants.

## B. Debts are not modelled in the projections — at all

`grep p.debts` over the extracted engine: **zero hits**. Neither `runMC` nor `optimizeDecum` services, accrues, or even reads the debts array. The entire Dettes tab — and the "Alex, 32 ans · Endetté, prêt étudiant + auto" persona — feeds data that never touches a trajectory; debt payments don't reduce savings capacity, balances don't reduce net worth, payoff dates change nothing. The standalone payoff calculator works, but a user who enters $60K of consumer debt gets the same success probability as one who enters none. This deserves either real modelling (annual `Σpay` reduces NR/contributions until each balance amortizes — `amortize()` already exists) or an explicit UI disclosure that debts are analysis-only.

`multiDebtPayoff` itself (avalanche/snowball, v3 19576): monthly interest accrual, freed-payment rollover, and target selection are all **correct**; the `order.indexOf(type)` dedup check compares a string against objects (always −1) but is harmless dead code; avalanche sorts by nominal rate — for your deductible-vs-non-deductible world (Smith HELOCs, rental mortgages) it should sort by after-tax rate, and the `deductible` flag is right there unused. `amortize()` ✓ correct, with a proper infeasibility guard.

## C. `debtVsInvest` (v3 19619) — half-implemented; verdict ignores its own inputs

The function computes `dMR/iMR/totalMonths` and a full amortization for a scenario-A/B comparison described in its comment — **none of which feeds the verdict**. The actual decision is `effDebtRate > afterTaxRet`, where `afterTaxRet` is **not a parameter or local**: it closes over the surrounding component's variable (line 19547: `expRet × (1 − marg × 0.66)`, a 50% CG / 30% elig-div / 20% interest composition — itself a reasonable heuristic). Consequences: the `investRetAnn` and `margTax` arguments callers pass are ignored for the comparison (margTax is used only on the debt side, so the two sides of the inequality can use *different* marginal rates), the horizon parameter is cosmetic, and the function silently breaks if ever extracted from that closure. Finish the A/B (invest-the-difference vs pay-then-invest over the horizon) or strip it to the heuristic with honest parameters.

## D. `calcCorpTax` (v3 2825) — mechanics right, parameters drifting

What's correct: SBD/general split, GRIP from general-rate income, RDTOH added at 30.67% and refunded at 38.33%, CDA accrual on the untaxed gain half, the $5-per-$1 passive grind ratio, and most combined rates (QC 12.2/26.5/50.17 ✓, AB 11/23 ✓, BC ✓, PE 10% ✓, SK 11% ✓ for 2026).

Defects, in order of importance: **(1)** `SBD_LIMIT` and the $50K passive-grind threshold are **indexed by inflation** — both are fixed in law ($500K since 2009; $50K fixed). By year 20 the model hands out ~$758K of small-rate room. **(2)** **Ontario (and NB) never adopted the passive-income grind** — their provincial small rate keeps applying to the full $500K even when the federal SBD is ground to zero. The single combined `adjustedSBD` therefore over-taxes passive-heavy ON CCPCs — the "David et Sarah (CCPC ON)" persona is exactly this case. **(3)** **MB small rate: engine 11%, actual 9%** (Manitoba's provincial small-business rate is 0%). **(4)** **NS small rate: engine 11.5%, actual 10.5%** since April 2025 (NS cut 2.5%→1.5% and raised its provincial SBD limit to $700K — a second, province-specific limit the single-limit design can't express). **(5)** QC's 12.2% assumes the 5,500-paid-hours DPE test is met — failing service corps pay 20.5%; no toggle exists, and incorporated consultants (your TCU/TASO-adjacent world, and the Marc/Julie persona) are the population most likely to fail it.

## E. `calcInsuranceNeed` (v3 8180) — wrong window, regime-switching resources

The income-replacement need is `0.7 × retSpM × (deathAge − retAge)` — i.e., **retirement-phase years**, undiscounted. For a 40-year-old, the term-insurance question is replacing income *now → children's independence/retAge*; the retirement phase is what `projectedEstate` is supposed to fund, so the formula both mis-windows the need and double-counts against the resource line. Undiscounted nominal summation further inflates it (25 yr × $40K = $1M "need" with no PV). Second defect: `projectedEstate` is **current balances** normally but switches to `window._mc.medEstateNet` (end-of-horizon estate) once a simulation has run — the coverage gap silently jumps between two incompatible definitions depending on whether the user clicked Simuler. Keep the death-today framing: current liquid assets + existing coverage vs PV(need to independence) + debts + final expenses. The premium **range** output with its "ordre de grandeur — non un devis" sourcing is a genuinely good compliance pattern — keep it; per-$1,000 bands are plausible CLHIA-order numbers.

## F. `runSmithSim` (v3 15873) — right design, unpaired randomness

The A/B structure (with/without Smith at N=500, per-property leave-one-out at N=200–400, deltas on succ/median/p5/estate/lifetime-tax) is the correct way to evaluate the manoeuvre. Two problems: **(1) no common random numbers** — each arm draws fresh randomness, so at these N the property-contribution deltas (tenths of a pp, tens of K$) are mostly Monte-Carlo noise, then *ranked* by a score built on that noise. The engine has no seed hook; add one (per-sim seed array) and run both arms on identical draws — the delta variance collapses and N=200 becomes plenty. **(2)** `deltaLifeTax` sums `medRevData` taxes, inheriting both the reported-not-funded defect (main 1.1) and the balance-delta withdrawal attribution. Also re-flagging from the main report with its mechanism now read end-to-end: the in-engine Smith **tax deduction is added as cash income into `reNet`** (4268) — which then flows into OAS/GIS/taxable-income tests — instead of reducing the tax line; the benefit's sign is right but its location inflates clawback-tested income, partially self-defeating the strategy in-model. And the mojibaked default property label (`PropriÃƒÂ©tÃƒÂ©`) originates here.

## G. Longform internals — strong validation, one real export bug

**Validation layer (lines ~4193+) is the best fiscal code in either file**: 2026 limits exact (TFSA $7,000; RRSP **$33,810 absolute + 18%-of-salary** soft warn with the carried-forward-room nuance correctly worded; FHSA $8,000/$40,000), CRA 1%/mo over-contribution penalties cited, retSpM outlier bands, live re-validation on every input. This corrects the main report's 2.12(f) by half: RRSP room *is* policed at intake — it's only the engine that ignores it (a user can still hand the engine an impossible `rrspC` via JSON, and multi-year room is never tracked).

**Export bug — sub-1% percent entries are corrupted ×100.** The UI collects percent (`eqRet` placeholder "6.9"); `_BF_TO_ENGINE` converts on export by magnitude-sniffing: divide by 100 only when `|v| > 1`. A user typing **0.9** into any percent field meaning 0.9% — entirely plausible for `bndRet`, `merR/T/N`, `nrTaxDrag`, `inf`, `peFee`, `gkRaise` — exports **0.9 the fraction = 90%**, which v3's normalizer (same `>1` rule) leaves untouched and the sanitizer then silently clamps (MER 0.9% → runs at the 5% cap; bond return 0.9% → 12% cap; inflation 0.9% → 10% cap). The code comment documents the inverse failure they already fixed (allocR=60 → clamped to 1) — one direction of the ambiguity was patched, the other shipped. **Fix:** the longform UI is unambiguously percent-entry, so *always* divide `_BF_PCT_KEYS` by 100 on export; reserve magnitude-sniffing for imports of foreign files only.

Smaller notes: the `_BF_V3_ALIASES` map (cDCBal↔cDCBal2, eqRetS→eqRet) and the legacy property-key migration (rate→mr, rent→rm, exp→ox, tax→pt…) are thoughtful and correct; `globalAlloc`/`allocOverride` are packed as explicit fractions (no sniffing) ✓; the longform emits `_schema:"v4.0"` while v3's strict validator keys on `"v3.1"` — everything lands in the lenient path, and the version names point in opposite directions (rename one); quick-start's "médiane QC 68 000$" salary chip is a defensible full-time-worker figure; the `peY/peV` naming difference vs the engine's `yPE/vPE` is bridged in v3's state layer (verified: loader reads `p3.peY` into the `peY` state the params builder consumes).

---

## Revised fix-order insertions (merge into the main report's list)

- After step 2 (money conservation): **re-route `_evalSAM` through paired-seed `runMC`** and fix the four inert cards — until then, hide `optWd/payDebt/guardrails/lifeIns` from the ranking rather than show false zeros.
- With step 5 (constants): MB/NS corporate small rates, un-index SBD limit + grind threshold, ON/NB grind exemption, `maxRRSP` card → $33,810.
- New: **longform `_BF_TO_ENGINE` unconditional ÷100** (one-line, prevents silent 100× corruption).
- New: decide debts — model them (cheap: `amortize` exists) or label the Dettes tab as analysis-only.
- Backlog: `debtVsInvest` finish-or-strip; insurance-need window rewrite; common-random-numbers hook (benefits Smith sim, SAM, Tornado, and every A/B in the app at once).
