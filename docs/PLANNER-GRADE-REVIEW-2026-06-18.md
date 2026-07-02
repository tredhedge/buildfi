# Independent Pl. Fin. Review — Bilan 360 reports (2026-06-18)

8 rendered reports reviewed by independent subagents with a critical senior financial-planner
(Pl. Fin. / CFP) persona. **All 8 had passed the automated ship-loop dual gate (integrity-clean).**
The reviews assess *planner-grade quality* — a different, higher bar the gate does not measure.

## Verdict: NOT financial-planner-grade yet

| Report | Profile | Planner grade | Deliver verdict |
|---|---|---|---|
| gagnon_transition_qc_fr | 0%/F, FR, debt | B− | with edits |
| latedebt_on_en | 0%/F, EN, debt | C+ | **do not deliver** |
| okafor_accum_ab_en | A, HNW couple + rental | C+ | **do not deliver** |
| hnw_bc_en | B+, HNW + 2 rentals | D+ | **do not deliver** |
| walsh_transition_on_en | A, DB-pension couple | B− | with edits |
| gis_qc_fr | A+, GIS widow | D+ | **do not deliver** |
| bouchard_decum_qc_fr | A+, widow decumulation | C+ | with edits / not as-is |
| midcouple_qc_fr | B+, FR couple | C+ | **do not deliver** |

The narration tone is consistently strong (the hardest 0%/F cases are handled with genuine skill) and
AMF compliance is clean. But the *delivered artifact* fails on three categories of defect.

## A. Data / engine bugs (the gate's biggest blind spot — narration "grounds" to wrong/incoherent data)

1. **Rentals dropped from the AI's DATA but rendered in the report** (okafor, hnw_bc). The HTML shows
   2–3 properties incl. rentals with $24k–$48k/yr income; the AI DATA block carries only the principal
   residence. Result: the narration says "your home is your only property / the portfolio is your sole
   income engine" **while the report's own table shows rental income** — an internally contradictory
   document. Root: `buildAIPrompt360` DATA block omits `rentalPortfolio` that `buildBuildFiData` renders.
2. **Incoherent engine figures on low-asset profiles** (gis_qc, bouchard). $336,729 median estate and
   $85,536 lifetime fees cited to the dollar on a **$21,000** portfolio; a 24.8% "withdrawal tension"
   on a plan whose own cash-flow shows government income covers spending. The engine appears to GROW a
   $21k portfolio to ~$199k while asserting a 24.8% draw. (Engine = protected; needs approval to touch.)
3. **Hidden, load-bearing spending-cut assumption** (bouchard; echoed walsh/midcouple/okafor): the
   engine quietly cuts real spending ~16% at age 75 for a client whose budget is described as "rigid /
   no cushion" — and that cut is *why* the plan is "100%". The "100% / A+" headline sits directly above
   a fan chart whose median portfolio hits **$0 at age 90**. Never disclosed or reconciled.
4. **Headline success % = a strategy's rate, not status-quo** (midcouple): the 80% shown is the
   `qpp_70` scenario; status-quo is 79%. The headline silently assumes deferring QPP to 70.
5. **Bridge-math errors**: hnw_bc welds a 7-year $714k figure onto a "58→70" 12-year window; walsh cites
   $144,000 instead of the engine's sanctioned `bridgeCost` $105,072 (a NUMERIC-SAFETY rule violation).

## B. Renderer bugs (client-visible, delivery-blocking — present across most reports)

1. **Literal Markdown ships to the client**: `**Bridge years** :` renders with raw asterisks in the
   observation bullets (gagnon, latedebt, hnw_bc, walsh, midcouple → likely ALL). The narration uses
   `**bold**`; the HTML `<li>` injection never parses it. A paying client sees programming syntax.
2. **Narration truncated mid-word** ("This assessment is your startin…", "fragilit…"); some long-form
   slots may not render in the HTML at all (client pays for narration they never see).
3. **Levers panel broken**: duplicate cards ("Revue annuelle du plan" ×2) and the #1 lever ("work
   longer") missing from the panel (midcouple, hnw_bc, gis_qc).
4. **Internal strategy key leaks into prose**: "work_longer" appears 3× in okafor's client text.

## C. Analytical / depth gaps (planner-grade substance)

1. **GIS/SRG** (gis_qc): names the sensitivity but misses the #1 actionable fact — **CELI/TFSA
   withdrawals are SRG-neutral while RRSP/RRIF withdrawals claw back SRG ~50%+** — mistimes it as an
   age-71 issue (it's now), and leads the priority list with **fees on a $21k portfolio**.
2. **HNW depth** (okafor, hnw_bc): missing RRIF meltdown trade-off, OAS recovery tax, estate liquidity,
   and capital-gains/deemed-disposition on rentals at death.
3. **DB pension** (walsh): never characterizes **indexation** or **survivor election** — the two
   questions that most define a DB-pension household; income-splitting demoted to a model caveat.
4. **Wrong lead risk on 0% plans** (gagnon, latedebt): leads with the age-71 RRIF tax problem for
   clients who run out of money at 62 (the RRIF event never occurs); the post-depletion reality
   (life on government benefits ≈ $X/mo, well below target) is never stated.
5. **Fee over-emphasis** for profiles where fees are not the lever (recurring).

## What this means for the gate

The ship-loop gate enforces *integrity* (every narrated number traces to DATA by value+unit; AMF-safe;
no empty/NaN/placeholder). It does **not** catch: (a) DATA that is itself wrong/incomplete (dropped
rentals), (b) incoherent engine outputs (estate ≫ assets), (c) unrendered Markdown / truncation in the
HTML, (d) success-%-vs-fan-chart inconsistency, (e) domain-completeness (GIS sequencing, DB indexation).
These reviews are the spec for the next layer of gate checks.

## Recommended remediation order
- **P0 renderer (fixes every report, allowed layer):** parse `**bold**` in the obs/synthesis lists;
  remove the truncation cap (or render full long-form slots); fix the levers panel (dedupe; surface the
  top lever; stop leaking strategy keys). Add gate checks: literal-`**`, mid-word-truncation, duplicate
  lever, raw strategy-key in visible text.
- **P0 data (ai-prompt-360, approved):** include `rentalPortfolio` in the AI DATA block so narration
  matches the rendered balance sheet. Add a gate check: render-vs-DATA property/asset reconciliation.
- **P1 engine (PROTECTED — needs approval):** the low-asset estate/projection incoherence and the
  undisclosed age-75 spending cut. At minimum, disclose the spending-flex assumption and reconcile
  success% with the fan-chart horizon.
- **P1 depth (ai-prompt-360 prompt enrichment, approved):** per-archetype must-cover beats — GIS
  sequencing (CELI-first), HNW (meltdown/OAS/estate liquidity/rental cap-gains), DB (indexation/survivor),
  0%-plan lead-risk + post-depletion reality. Add a domain-completeness auditor.

Bottom line: the integrity machine works and the tone is strong, but a real Pl. Fin. would not sign
most of these as-is. The fixes are concrete and largely in the allowed layers (renderer + prompt);
the engine items need sign-off.
