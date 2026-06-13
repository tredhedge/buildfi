# BuildFi — Full Audit (Engine Math · Fiscal 2026 · Tooling · UI/UX)

**Files audited:** `planner_v3.html` (Laboratoire v12.0.0, 22,658 lines, self-contained React app + Monte Carlo engine) and `planner_longform.html` (intake form, 4,839 lines).
**Date:** 2026-06-10.
**Method:** engine extracted from the `__ENGINE_START__/__ENGINE_END__` markers and executed in Node (full read of `optimizeDecum`, `runMC`, all tax/benefit helpers); the embedded 505-test suite was run; **9 independent verification experiments** were written against the live engine (seeded RNG, zero-noise overrides, conservation-of-money audits, a patched-engine A/B); 2026 fiscal constants verified against CRA, Retraite Québec, Revenu Québec, EY/TaxTips and current sources; both files rendered headless (Chromium 1440px & 390px) with console/network capture.
**Not audited:** the 9 `report/*.js` modules (`report-pdf.js`, `report-excel.js`, `report-data.js`, `report-charts.js`, `report-formatters.js`, `report-ai-prompt.js`, `report-export-service.js`, `templates/report-template-b64.js`, `templates/buildfi-logo-b64.js`) — not uploaded; they 404 at runtime (confirmed in headless console).

Line references: `engine line N` = `v3.html` line `1991 + N`.

---

## Executive verdict

The engine is far better built than typical hobby planners — the 2026 federal/QC brackets, QPP max ($1,507.65/mo — exact), YMPE/YAMPE, OAS clawback threshold ($95,323 — exact), GIS, TFSA room tracking, RRIF table, ON surtax mechanics, dividend gross-up/DTC, CCPC GRIP/CDA/RDTOH, and the normal-mode return generator (verified: mean 7.00%, σ 16.03%, ρ 0.200 vs targets) are all correct or near-correct. The embedded suite passes 503/505.

But the audit found **six Tier-1 defects that materially change reported results**, each demonstrated empirically, the largest being that **income tax is computed and displayed but never actually paid from the portfolio** — success rates and estates are systematically optimistic. The two engines (deterministic vs Monte Carlo) also disagree in *opposite directions* on what happens to surplus cash, and the fat-tail toggle silently raises volatility 29%. On the fiscal side, the model still applies the **cancelled** 66.67% capital-gains inclusion policy, and Alberta is missing its 8% bracket.

Nothing here is structural; all Tier-1 items are localized fixes. Until they land, the on-screen claim *« Basé sur la fiscalité canadienne 2026 »* is only partially true.

---

## TIER 1 — Defects that materially distort results

### 1.1 Income tax is reported but never funded (both engines) — **the top finding**

`runMC` computes the withdrawal need as
`need = spending − govInc − rrifMin − cRrifMin − meltAmt` (engine 4732),
then computes income tax (`yrTx` for the displayed sim at 5176; `_simTax` for all others at 5236-5253) and pushes it into the path/charts — **but no account is ever debited for it and no withdrawal is grossed up.** The same pattern holds in `optimizeDecum` (tax at 3469-3489, never re-enters cash flow; its own `row.cashWithdraw = spending + tax − govInc` at 3499 quietly admits withdrawals < cash required). The spending tooltip says *« Dépenses mensuelles souhaitées à la retraite »* — consumption, with no instruction to include taxes — so the user's natural input makes every trajectory pre-tax while a tax column is displayed beside it.

**Evidence (zero-noise drain test, `tRn→0`):** $1M RRSP, QC, 65→95, $6,000/mo: final balance reproduces `initial − Σspending + Σgov` to the dollar while **$194,022 of reported tax never left any account**.

**Quantified impact (patched A/B, 1,500 seeded sims, representative profile: 60 y.o., QC, $700K REER / $150K CELI / $100K NR, DB $1,500/mo, $5,500/mo spending):** funding only the tax on *fixed* income (a lower bound — tax on discretionary RRSP draws still unfunded) moves success **98.2% → 93.2% (−5.0 pts)**, median estate **$987K → $876K**, 5th-percentile estate **$172K → $0**.

**Fix:** add an estimated same-year tax to the need (iterate once on the RRSP gross-up: `wRR_gross = wRR_net / (1 − marg)` is a serviceable first pass), in both engines. Alternative (worse): relabel spending as tax-inclusive and remove the separate tax line from net-income math — but that breaks the Bilan's "impôts payés" narrative.

### 1.2 Fat-tail mode silently inflates volatility +29.1%

`tRn(5)` returns raw Student-t(5) draws (engine 3614-3624) used directly as `mean + vol·t` (4066, 4082, 4098). A t(5) has σ = √(5/3) = **1.291**, so `fatT=true` turns a configured 16% equity vol into an effective **20.66%** (verified empirically on 200K draws; bonds 6.0%→7.76%). The toggle conflates "fatter tails" with "much more variance."

**Impact:** same profile as 1.1: success 98.2% → **89.7%** with fatT on — most of that gap is variance inflation, not tail shape.
**Fix:** standardize: `tRn(df) → t / sqrt(df/(df−2))` (one line). Correlations survive (they're scale-free; verified ρ = 0.199 under fatT).

### 1.3 `optimizeDecum`: surplus deposited **twice** + TFSA-room tracker clobbered → phantom money

`_meltExcess` (engine 3325) and `availFromMelt` (3322, consumed at 3453) are the **same formula** — `max(0, melt + rrifMin + cRrifMin − need)` — and each deposits the surplus into TFSA/NR. Worse, step 5 declares `var tfsaRoom = 7000*infM` (3456): since `var` is function-scoped, this **overwrites the carefully tracked cumulative room** built at 3098-3110, and the step-5 deposit never decrements room at all.

**Evidence (zero returns, zero spending, $800K RRSP, 71→81):** ending wealth **$965,390** — **+$165,390 created from nothing** in 10 years (TF $220,740 + NR $342,656 deposited from only $398,005 of RRSP outflows).
**Fix:** delete the step-5 block (3453-3460) entirely; keep R2 (which respects room) and route the room-capped remainder to NR; never redeclare `tfsaRoom`.

### 1.4 `runMC`: the **opposite** bug — unspent mandatory withdrawals evaporate

In the MC engine, forced RRIF minimums, melt amounts, and government income in excess of spending are debited/received but **never reinvested anywhere** — household wealth simply shrinks by the unspent cash.

**Evidence (zero returns, ~zero spending, $1M RRSP, 75→85):** $547,627 of forced RRIF outflows over 10 years; final household wealth **$452,373** — **$547,627 vanished** despite nothing being spent.
**Consequence:** the deterministic plan (1.3) is biased *up* on surplus and the MC is biased *down* — the two views of the same plan diverge for structurally different reasons, on top of their different spending-smile defaults (see 2.10). For low-spend / RRIF-heavy retirees (early retirees with large REERs — your core demo), MC estates are badly understated.
**Fix:** after the withdrawal block, deposit `max(0, rrifMin + cRrifMin + meltAmt + govInc − spending − taxes)` into TFSA (respecting `_mcTfsaRoom`) then NR with ACB credit — i.e., exactly what 1.3 tries to do, once.

### 1.5 Falsy-zero parameter defaults — user-entered 0 is silently replaced

`p.eqRet || 0.07`, `p.bndRet || 0.035`, `p.bndVol || 0.06` in `runMC` sanitization (3876-3879), and essentially *all* of `optimizeDecum`'s reads (`inf`, `eqRet`, `bndRet`, `allocR/T/N`, `goP/slP/noP`… 3116-3118, 3187-3189) use `||`, so an explicit **0 becomes the default**. `runMC` already does it right for `allocR/inf` (`!= null` pattern) — the rest doesn't.

**Evidence:** `eqRet:0`, 100% equity, 10 years → final **$791K** (grew at the 7% default) vs `eqRet:1e-12` → **$376K**. A user stress-testing "zero growth" or "100% bonds" (allocR:0 in the deterministic engine) gets silently different assumptions.
**Fix:** replace every numeric `p.x || d` with `(p.x != null ? p.x : d)` in both engines (≈25 sites).

### 1.6 Cancelled capital-gains policy still applied as the default

`CG_INCLUSION_HIGH = 0.6667` above `CG_THRESHOLD = 250000` is used pervasively as the **default** — NR realized gains on withdrawal (5126-5142, 5240-5244), NR deemed disposition at death (5279-5281), rental death CG (5291-5305), PE/PM exits (5083-5089), business sale (4952-4959, 5056-5068), `calcNRItemizedTax` (3813-3818, whose comment even calls it "per CRA rules"), and corporate CDA math. **The increase was cancelled March 21, 2025; the inclusion rate is 50% in 2026** (the LCGE at $1.25M was maintained — engine's `LCGE` ✓ correct). Estates and large dispositions are over-taxed by up to 1/6 of the gain above $250K.
**Fix:** default `cgIncHi = 0.50` (effectively removing the tier) and keep the 2/3 rate available only as an explicit what-if toggle labelled as a hypothetical.

---

## TIER 2 — Fiscal & modelling corrections

**2.1 Alberta: missing 8% bracket.** AB introduced an 8% rate on the first $60,000 in 2025, maintained and indexed (~$61,200) for 2026; the engine's AB table starts at 10%. Hand-check at $70K: engine prov tax $4,723 vs correct ≈ $3,523 — **~$1,200/yr overstated for every AB profile**.

**2.2 Stale payroll constants (`calcPayroll`, engine 3833).** EI 2026: MIE **$68,900** (engine 65,700 = 2025), rates **1.30% QC / 1.63% ROC** (engine 1.27/1.58). RQAP 2026: max insurable **$103,000** (engine 94,000 = 2024) and the employee rate was **cut 13% to 0.430%** (engine 0.494%). Also: Québec's Nov-2025 update announced a **2026 QPP base-contribution rate cut** — the hardcoded 6.40% QC employee rate needs re-verification. (YMPE 74,600 / YAMPE 85,000 / QPP2 4% are ✓ correct.)

**2.3 QPP deferral to 72 under-credited.** `QPP_ADJ_CAP = 1.42` caps the bonus at age-70 levels, but QC allows starting as late as 72 with the 0.7%/mo bonus continuing (factor ≈ **1.588** at 72). Profiles deferring to 71-72 lose ~10-12% of QPP. (Max-at-65/60/70 amounts are otherwise exact: 1,507.65 / 964.90 / 2,140.87.)

**2.4 QC LIF (FRV) rules outdated.** Since **Jan 1, 2025**, Québec-regulated LIFs have **no maximum withdrawal for holders 55+** (and FRV→REER transfers are banned). The engine still caps the LIF at `max(RRIFmin, 1/(90−age))` labelled "QC rules" (engine 4683) *and* hardcodes a drain-at-max strategy. For QC the cap is gone; the drawdown pace should be a strategy choice, not forced.

**2.5 OAS clawback inconsistency in `optimizeDecum`.** Line 3217 passes **deflated** income (`estInc/infM`) to `calcOAS`, which compares against an **inflated** threshold — so the cash-flow OAS almost never gets clawed back — while line 3469 passes nominal income for the tax line. **Demonstrated:** at 84 with $264K nominal income, the schedule still pays **$10,416** OAS in cash where the correct clawback is **$0**. Fix: pass nominal at both sites (calcOAS indexes internally).

**2.6 NR investment income is invisible to the tax system.** NR interest/dividends are debited via drag/itemized tax (good), but those income components never enter `taxableInc`, the OAS clawback test, GIS income, or bracket position. An NR-heavy retiree with $80K of taxable investment income shows no clawback and a too-low marginal rate. Realized gains on NR withdrawals *are* included (si===0 and si>0, R14 #29 ✓) — but that tax is then unfunded per 1.1.

**2.7 PE/PM exits escape tax entirely.** Exit proceeds go to NR with **ACB = proceeds** (4349-4388): the accumulated 12%/yr PE gains are never taxed — not at exit, not at death (a `_pepmTaxable` is added to the *displayed* si===0 taxable income only, and even that tax is unfunded). Directly relevant to your own TASO/TCU positions: after-tax PE wealth is materially overstated.

**2.8 Estate: no spousal rollover at first death.** `estTax1` taxes the full terminal RRSP/RRIF (5306-5324) even when the spouse survives the primary at horizon end — real-world s.60(l) rollover defers it. Conservative, but it overstates estate tax for every couple. (Rental deemed-disposition CG at death is now computed correctly off `reVals.origV` ✓ — modulo 1.6's inclusion rate.)

**2.9 GIS/credits modelling.** Couple GIS decomposes household-correctly (each call: couple-max − 50% of own income ⇒ 2·max − 0.5·family ✓) but individual amounts are wrong (real slope is 25%/person on family income) — matters at first death. `pCr` hardcodes QC math (0.15×0.835 + 0.14, $2,000 cap) for all 13 provinces. Pension-splitting benefit (`splitB`), QPP-sharing benefit, and the pension credit are all modelled as **cash income additions** inside `govInc` (4501) rather than tax reductions — distorting the income charts and any income-tested logic downstream. Survivor QPP (60%, capped $784/mo) is added with no combined-maximum test.

**2.10 The two engines assume different retirements by design.** Deterministic smile defaults `slP/noP = 0.85/0.75` vs MC `mcSlP/mcNoP = 0.82/0.92`: the optimizer plans deep late-life spending cuts the MC doesn't simulate. Align the defaults or surface the difference.

**2.11 `p5Ruin`/`p10Ruin` index the unsorted array.** `ruinAgesSorted` is built expressly for this (5384, with a comment saying so) and then `p5Ruin = ruinAges[⌊N·0.05⌋]` reads the **raw push-order array** (~5750) — those two displayed percentiles are effectively random draws. `medRuin` uses the sorted copy ✓.

**2.12 Smaller modelling items.** (a) Forward/backward smoothing passes (3513-3547) mutate `fromX` flows *after* balances were debited — table flows and balances no longer reconcile. (b) Forced primary-residence sale adds rent for **one year only** (`_rentAdded` is set and never read; same in MC at 4873). (c) Deterministic forced rental sale realizes no CG/recapture (MC does ✓). (d) RESP returns the **planned** value even if NR couldn't fund the contributions (NR floored at 0 ⇒ phantom money); CESG $7,200/child lifetime cap absent. (e) TFSA contributions ignore the salary-shock/disability multiplier `_adjGr` that RRSP/NR apply. (f) **No RRSP contribution-room model at all** ($33,810 / 18% limits unenforced) while TFSA room is meticulously tracked. (g) GST credit: 2024-25 vintage, hardcoded threshold, paid only when retired. (h) Crisis-correlation matrices only activate on *scripted* stress years (`sEq < −0.15`) — endogenous random crashes never trigger them; and stress shocks are **additive** to random draws (Crash-2008 year-1 ⇒ −30% ± 16%, not a replay of −37%) — fine as a design, but the scenario descriptions read like replays. (i) Mortality: simulated LE@65 = **85.5 M / 87.5 F** vs the file's own stated CPM-2023 target of ~86 / 88.5 (and CIA-published CPM values are higher still) — longevity risk slightly understated; the 0.99^t improvement decays too fast vs MI-2017 at older ages.

**2.13 Minor constant drift (low impact).** ON surtax thresholds 5,710/7,307 are 2025 values labelled 2026 (2026: **5,818/7,446**; engine indexes forward from base year, so ~$30 error). Federal age amount 8,790/44,325 are 2024 values (2026 ≈ 9,209/46,433). The federal BPA's two-component high-income clawback ($14,829 + $1,623, clawed $181,440→$258,482, max ≈ $227) isn't modelled. NS BPA is now $11,744 (engine pd 8,651) with 1.6% 2026 indexation; PE moved to a 5-bracket structure in 2024-25 (engine still has the old 3-bracket 9.8/13.8/16.7). OAS max 742.31 vs engine 743.05 and GIS 1,105.43 vs ~1,108.74: trivial. Everything else spot-checked — fed/QC/BC/SK/AB-BPA/MB brackets, TFSA $7,000, LCGE $1.25M, abatement 0.835, RRIF table, OAS deferral 0.6%/mo — ✓.

---

## TIER 3 — Tooling, architecture, code health

**3.1 Embedded test suite: 503/505, and the 2 failures are the tests' fault.** `EXP_TAX.ON` at $100K/$200K was baselined with the 2024 ON surtax thresholds (4,991/6,387): the deltas match exactly — 0.20×(5,710−4,991)=143.8 and +0.36×(7,307−6,387)=331.2 ⇒ 475. Re-baseline the expectations (and bump to the 2026 thresholds per 2.13).

**3.2 The Worker ships ~2,000 lines of dead test code — and the suite would crash inside it.** `runTestSuite` lives between the engine markers (so every Worker instantiation carries it) yet depends on main-thread globals `html`, `localStorage`, `SAM_STRATEGIES` (defined *after* `__ENGINE_END__`). It only works because the main thread happens to also evaluate the engine. Move the suite outside the markers.

**3.3 `chol()` silently floors the pivot at 1e-3** (engine 3600) — a non-PSD matrix would be quietly distorted instead of failing. Currently dormant: all four matrices verified PSD (min eigenvalues 0.338 / 0.141 / 0.141 / **0.0048** — `CRM8_CRISIS` is one tweak away from breaking). Make it warn/throw.

**3.4 Encoding corruption.** UTF-8 BOM + CRLF + **3,858 double-mojibake clusters** (`ÃƒÆ'…`), mostly in comments, but at least two are **user-visible**: the default Smith-Manoeuvre property name renders as `PropriÃƒÂ©tÃƒÂ© 1`, and the "Comment ça fonctionne" card renders a garbled arrow span (`"ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢"` passed straight to `React.createElement`) — confirmed in both desktop and mobile screenshots, i.e. the `_maybeFixMojibake`/`_repairVisibleText` band-aids miss React-rendered literals. Fix once with `ftfy` (it reverses this exact double-encoding deterministically), save UTF-8 no-BOM, delete the band-aids, add an editor/CI encoding check.

**3.5 Runtime dependencies.** React 18 via CDN (the app dies offline — consider inlining for a "local-first" tool); 9 missing `report/*.js` (console ERR_FILE_NOT_FOUND; the Rapport/Export path is presumably non-functional without them); `sw.js` service worker; the Long-form drawer hardcodes the relative URL `planner_longform.html?embed=1` — deploy-name sensitive (it 404s if the file is renamed, as in this audit sandbox).

**3.6 Percent/fraction magnitude-sniffing is fragile.** `_normalizeProfileFractions` divides any listed key by 100 when |v|>1. Legacy percent-form values **below 1** (e.g. a 0.9 meaning 0.9% bond return or NR drag) pass through as 90% fractions and are then silently clamped. Tag units explicitly in the schema (`_units:"fraction"`) instead of sniffing magnitudes. Also reconcile the alias sets: the normalizer lists `peY/peV/pmY/pmV` while the engine reads `yPE/vPE/yPM/vPM`.

**3.7 Schema/handoff layer is solid.** `validateSchema` v3.1 (single-source inflation, ownership sums = 1.000 ± 0.001 across properties/debts/nrInvestments, goals→events deprecation, sync-flag location) is well designed; the iframe `postMessage` + `sessionStorage bf_mode_handoff` dual path with one applicator is clean. Longform autosaves the full financial profile to `localStorage` unencrypted — fine for a local tool, flag it before any hosted deployment.

---

## UI / UX review

**Longform — the stronger of the two.** Clean hierarchy, searchable field index, per-section completion (`5/11 · non revue`), required markers, *suggéré / médiane QC* chips that teach defaults without forcing them, FR/EN via 571 `data-i18n` keys, 274 native `<label>`s and sensible `min/max/step` on inputs, zero JS errors headless, good mobile single-column collapse. Two nits: the sticky **« Simuler mon plan »** FAB overlaps the bottom form field on mobile (add bottom padding equal to FAB height — note the embed CSS already does `padding-bottom:120px`, the standalone mobile path doesn't); and the intro promises *« revenez valider les sections chaque trimestre »* with no revisit/reminder mechanism behind it.

**v3 Laboratoire.** Strengths: the onboarding (two goal paths + 9 personas including the two CCPC cases) is genuinely good; the Plan-Health card (A+ / 94% résilience / "3 leviers identifiés") gives an instant verdict; Mesures clés cards are well chosen (P50 réel, épuisement pire-5%, VaR 5%, héritage net, revenu garanti vs dépenses); AMF-conscious conditional language and the persistent *« Outil éducatif — ne constitue pas un conseil financier »* footer; Light mode, EN toggle, Standard/Expert gating.

Issues, in priority order: **(a) navigation stack overload** — on one screen you get the metric strip, the PARCOURS breadcrumb (7 steps), the LIRE/AGIR/RÉFÉRENCE category row (Patrimoine 4 · Risque 4 · Fiscalité · Optimisation 5 · Guide), Dashboard/Rapport/Cashflow buttons, *and* a Résultats/Monte Carlo/Analyse sub-tab row — four simultaneous levels (~200px of chrome desktop, ~320px of an 844px mobile screen). Collapse PARCOURS and the category row into one control. **(b)** The top metric strip duplicates the Mesures-clés cards directly below it. **(c)** Visible mojibake (3.4) undermines the polish. **(d)** On mobile the metric strip's first card clips under the action row (z-index/scroll-padding). **(e)** The sidebar opens as a dimming overlay even at 1440px — dock it ≥1100px. **(f)** Tiny grey helper text (e.g. *« Médiane canadienne : ~60 000$/an »*) sits near the contrast floor on the dark theme. **(g)** v3 has effectively no accessibility layer: 12 `aria-label`s and **zero** native `<label>` elements across the app (the longform proves the team can do better); keyboard nav exists (arrow keys between tabs, Ctrl+Enter to simulate ✓) but is undiscoverable. **(h)** Truth-in-labelling: the « Comment ça fonctionne » card claims 2026 tax rules and CPM-2023 mortality — both only approximately true until Tier 1/2 land; and the internal value `"optimal"` maps to the UI label « Classique » while a different option is called « Optimisé » — rename the constant to avoid future confusion.

---

## What to fix first (suggested order)

1. Fund the taxes (1.1) — biggest credibility risk for a paid Bilan.
2. Delete the optimizeDecum double-deposit + room clobber (1.3) and add the runMC surplus reinvestment (1.4) — restores money conservation in both engines (the zero-noise conservation tests in this audit make perfect regression tests).
3. Standardize `tRn` (1.2) — one line.
4. `!= null` sweep (1.5) — mechanical.
5. CG inclusion default to 0.50 (1.6) + AB 8% bracket + payroll 2026 constants (2.1-2.2) — constants only.
6. QC LIF rule + QPP-to-72 cap (2.3-2.4), OAS deflation (2.5), p5Ruin sort (2.11).
7. ftfy encoding pass (3.4), re-baseline ON tests (3.1), move the suite out of the Worker (3.2).
8. NR income visibility + PE/PM exit taxation (2.6-2.7) — the deepest of the remaining model work.

## Reproduction

All experiments live in the audit sandbox: `engine.js` (extracted), `verify.js`, `verify2.js`, `trace.js`, `patch_test.js` (the taxed-engine A/B), `shot*.py` (renders). Each Tier-1 number above regenerates deterministically from those scripts (seeded RNG / `tRn→0`).
