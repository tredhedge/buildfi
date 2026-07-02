# Bilan 360 — Master Plan (DRAFT for adversarial review)

**Objective:** ≥99% of paying customers receive, with NO human intervention, a report that is BOTH
(a) integrity-clean (no fabricated/incoherent numbers, AMF-safe, nothing broken) AND (b) financial-
planner-grade (a Pl. Fin. would sign it). A broken/sub-grade report is HELD (needs-attention + alert),
never shipped.

## Diagnosis (why we keep failing)
1. **It's a data-transport / sequencing problem, not an AI-capability problem.** The narrator writes
   well when fed the full picture; the pipeline starves its input and discards its output:
   - Prompt DATA is a curated SUBSET (drops rentals; omitted canonical numbers) → narrator sees a
     partial balance sheet.
   - Prompt hints are GENERIC → archetype-critical beats (GIS sequencing, DB indexation) never asked.
   - Renderer displays 6 of 33 generated slots, truncated, with `**bold**` unparsed → ~80% of the
     analysis is thrown away and the rest mangled.
   - Engine emits incoherent figures for edge cases ($337k estate on $21k; a hidden age-75 spend cut).
2. **"Which slots" is defined in 3 disconnected places** (prompt asks ~33; renderer shows 6; gate
   re-derives a third list) → they drift; nobody owns "what THIS client's report should contain."
3. **Prior plans declared victory on INTEGRITY and never measured QUALITY.** The gate proved numbers
   trace + AMF-safe; it never asked "is this planner-grade?" So "27/27 pass" was true and misleading.

## Architecture: two single sources of truth
- **ReportModel** — one validated object with EVERY number (real, floored at 0, named, unit-tagged),
  built once from (params, mc, extraRuns), including all assets (rentals!). (Extends the existing
  `buildReportModelCanon`.) Prompt, renderer, gate all read it → no number can drift between them.
- **ReportPlan** — deterministic `buildReportPlan(model)` → ordered slots. Each slot: `id`, `label`
  (FR/EN), `appliesIf(model)` (archetype-aware inclusion), `dataRefs` (exact model values it may
  cite), `mustCover` (planner beats it must address). Prompt, renderer, gate all read it → one
  definition of "what this report contains," consumed three ways.

```
ReportModel + ReportPlan
   ├─ prompt   : ask AI for exactly the plan's slots, pin dataRefs, include mustCover
   ├─ renderer : render exactly the plan's slots, full text, markdown parsed, in order
   └─ gate     : assert each planned slot present + grounded to dataRefs + covers mustCover
```

## Phased execution (each step ships working; ship-loop verifies; one change, diff each)
- **P0 Transport fidelity (allowed layers).** (a) Renderer: parse `**bold**`, stop mid-word
  truncation, render ALL planned slots, dedupe levers, no strategy-key leaks. (b) Include rentals/all
  assets in the prompt DATA. → fixes every report, surfaces the discarded 80%.
- **P1 ReportPlan extraction.** Promote the scattered slot logic into one `buildReportPlan(model)`;
  prompt + renderer + gate consume it. → kills the 33-vs-6 disconnect; one owner of structure.
- **P2 ReportModel completion.** Unify D + canon + buildfiData inputs into one model incl. all assets;
  validator enforces invariants. → kills rentals contradiction + number drift at the root.
- **P3 Quality by construction.** `mustCover` beats encode planner domain knowledge per archetype
  (GIS CELI-first/SRG clawback; DB indexation+survivor; HNW meltdown/OAS/estate-liquidity/rental
  cap-gains; 0%-plan lead-risk + post-depletion reality; fee-deprioritization). → depth guaranteed,
  not hoped.
- **P4 Engine coherence (PROTECTED, sign-off).** Fix estate≫assets, disclose spend-cut, reconcile
  success% vs fan-chart horizon.
- **P5 Dual gate + scale.** ship-loop gates INTEGRITY (numbers/AMF/structure) AND QUALITY (mustCover
  addressed, planner-grade). Scale corpus 30→300. Independent Pl. Fin. review folded in as periodic
  adversarial sampling. CI lock + prod telemetry + live-API parity sample.

## Success definition (measurable, dual)
- Corpus (≥300, both langs, full archetype/edge coverage): ≥99% pass BOTH integrity AND quality gates.
- Independent reviewer sample: ≥90% "deliver as-is / minor edits", 0% "do not deliver".
- Prod: needs-attention rate <1%, every occurrence alerted + folded back into corpus.

## Known open risks (attack these)
- Can a QUALITY gate be made trustworthy + deterministic, or does it need an LLM judge (non-deterministic)?
- Will `mustCover` produce real planner-grade reasoning or a checklist the AI games?
- me-as-narrator vs live-Opus fidelity — does passing with my narration prove prod passes?
- Engine coherence is protected + may be deep; what if it can't be fixed cheaply?
- 120s webhook budget for runtime auto-repair + quality checks.
- What stops us declaring victory prematurely AGAIN?
