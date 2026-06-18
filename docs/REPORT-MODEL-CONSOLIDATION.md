# Report Model Consolidation — the durable fix

**Status:** design (2026-06-18). Approved direction: stop patching two drifted stacks; consolidate to
ONE canonical report model with renderer-agnostic QA, proven by the ship-loop
([docs/BILAN360-SHIP-LOOP-SPEC.md](BILAN360-SHIP-LOOP-SPEC.md)).

## Why delivering reports has been hard (root cause)

Not the report — the **architecture**. Two compounding problems:

1. **Two parallel report stacks.** Production Bilan 360 (`report-html-360.js` + `ai-prompt-360.ts` +
   `report-data-360.ts` + `report-ship-gate.ts`) and the lab (`report-pdf.js` + `report-ai-prompt.js`
   + the 17 `review/reviewers/*`). The strong QA (17 auditors) was built for the lab renderer; the
   real report ships from the prod renderer. They never met — which is the *only* reason "wiring the
   auditors to the real report" is hard.
2. **No single source of truth for the numbers.** Every figure (income, P25 wealth, replacement %,
   tax delta) is re-derived across `mc → D → DATA block → slot hints → narration → renderer`,
   floored/rounded/fallback'd differently at each layer. They drift; the guardrail correctly flags the
   drift; we patch one mismatch; the next surfaces. Whack-a-mole.

The 3 bugs the ship-loop already fixed are **the same disease three times**: BUG#1 (parser inflation),
BUG#2 (numbers in hints but not DATA), BUG#3 (real floored here / nominal there) are all *"two copies
of one number disagree."* The patches bought the diagnosis. This doc is the cure.

## Target architecture

**One ReportModel = the single source of every number a client can see. Every layer reads it; no layer
re-derives. QA validates the model + AI slots, not the DOM — so it is renderer-agnostic.**

```
params + mc + extraRuns
   └─ buildReportModel()  ──►  ReportModel  (validated, real, floored, named, unit-tagged)
                                  │
        ┌─────────────────┬──────┴───────┬──────────────────┐
        ▼                 ▼              ▼                  ▼
   renderer          prompt          guardrail        agnostic QA
 (report-html-360)  (DATA + hints   (slots' numbers   (auditors read
  renders ONLY       both from        must trace to     model + slots,
  model fields)      model)           model)            NOT parse HTML)
```

### The ReportModel contract
A single builder `buildReportModel(params, mc, extraRuns, lang, phase)` (home: `lib/report-data-360.ts`)
returns a frozen, validated object. It is the consolidation of today's `extractReportData360` (D), the
`data.canon` block (currently in `ai-prompt-360.ts`), and `review-contract.js::buildCanonicalMetrics`.

Invariants (enforced by a validator):
- **Every number the report displays is a named field of the model.** If it isn't in the model, no
  layer may show it.
- **Wealth is REAL and floored at 0** at the model boundary (never nominal, never negative). This is
  where BUG#3's fix lives permanently — once, not per-layer.
- **No `NaN` / `undefined` / unsubstituted** values; required fields present for the phase.
- Each numeric field carries a **unit** (money / pct / ageYears / ratio / count) so the guardrail
  grounds by unit without guessing.

Field groups: identity (age, phase, lang, grade, successPct, band), wealth (rMedF, rP5F, rP25F,
rP75F, rP95F, estate — all floored), income (gov monthly/coverage, gap, retTargetAnnual,
replacementPct), tax (curr/ret/marg/deltaAnnual), fees (mer, lifetimeCost), savings (balances,
contrib, rate, rrspSharePct), strategies (succ + floored medF + deltasVsStatuQuo), spending
(gkMaxCutPct, flex), constants (reviewMonths=12, mcScenarios=5000), partner (savingsTotal), and a
section manifest (which sections are present for this profile — drives "empty/required" checks).

### Renderer-agnostic QA
The high-value auditors that catch what the prod gate misses (canonical-quote, thesis-coherence,
narration tone/band, risk-collapse, scope-reconciliation, language, compliance, content-depth, polish)
already decide from `canonical` + `ai_slots` + visible text. We run them on a pack where
`pack.canonical = model.canonical`, `pack.ai_slots = slots`, `pack.profile = profile`, and visible
text comes from the one renderer. **No DOM scraping, no per-renderer structure.** The few genuinely
visual checks (chart present, layout) become a small set of *render smoke checks* against the model's
section manifest — not 17 DOM scrapers.

This is why the "adapter" dissolves: there is nothing renderer-specific left to adapt.

## Migration (incremental — each step ships working, verified by the ship-loop)

1. **`buildReportModel` single source.** Move the `canon` computation out of `ai-prompt-360.ts` into
   `report-data-360.ts`; have `extractReportData360` and the prompt both read `model.canon`. Verify
   ship-loop stays 100% prod-gate (no number changed, just relocated). *Removes extract↔prompt
   duplication.*
2. **Model validator.** Add `validateReportModel(model)` (no NaN/undefined, wealth ≥0, required fields)
   and wire it into the ship-loop as a hard check. *Makes the single-source invariant enforced.*
3. **Renderer-agnostic QA.** Feed the ~9 agnostic auditors a pack from `{model, slots, profile}`; run
   only those; wire the arbiter `can_ship` + blocker categories into the ship-loop verdict
   (`lab.canShip`). *Replaces the adapter; delivers the lab half of the bar.*
4. **Scale + drive to ≥99%.** Generate the ~30-profile corpus, narrate, run the full bar (prod
   ship-gate + model-QA), fix each surfaced class at the cause (in the model/renderer/prompt), re-run.
5. **Retire the duplicate.** Drop `report-pdf.js` for the 360 product; turn the ship-loop into a CI
   gate. Resolve the pre-existing `amf_banned_term` vs `amf_banned_stem` naming mismatch.

## Boundaries
- **Do not touch** (PLAN do-not-touch): MC engine math (the model floors at the data boundary, not in
  the engine), validated 20-profile data, `app/wizard/*`, `lib/quiz-translator-*`. `ai-prompt-360.ts`
  editing is approved for this consolidation.
- One change at a time; diff each; ship-loop must stay green after every step.

## Success criteria
- Every client-visible number is defined exactly once (in the model). Drift-class bugs become
  structurally impossible.
- ship-loop ≥99% on the corpus under the full bar (prod ship-gate + model-QA), held across re-runs.
- CI runs the ship-loop; a new failure class fails CI. No more per-symptom patching.
