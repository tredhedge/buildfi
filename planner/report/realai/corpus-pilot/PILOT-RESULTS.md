# Corpus pilot — results (2026-06-17)

Phase B pilot from PLAN-100-PERCENT-SHIP.md. Goal: replace the "~80%?" estimate
with a measured baseline + a concrete failure-class backlog.

## Setup
- **20 profiles** (`gen-corpus.mjs`) spanning the production input space:
  - Phase: 9 ACCUM / 4 TRANSITION / 7 DECUM
  - Lang: 10 FR / 10 EN · Province: QC/ON/AB/BC
  - Archetypes: renter, homeowner+mortgage, 1–2 rentals, DB pension, sell-home,
    late-start+debt, HNW, GIS-eligible, retired single/couple
  - Edge values: age 18, age 95, retAge==age, zero savings, $2M savings,
    underwater mortgage, low income
  - Success bands hit the tails: 0%, 4%, 10%, 48% … 99%, 100%
- Params via the **real `translateBilan360`** (production-faithful).
- Render: **deterministic fallback** (no AI) — isolates the structural / numeric /
  locale / compliance-stem floor (the code-fixable classes), reproducibly + free.
- Gate: **`evaluateReportShip`** (the exact production ship decision).

## Result
| Run | Pass | Notes |
|---|---|---|
| Baseline | **17/20 (85%)** | 1 failure class |
| After fix | **20/20 (100%)** | class eliminated |

### Failure class found: `fr_jargon_meltdown` (structural, 3 FR reports)
The FR "RRSP meltdown window" section leaked the anglicism **"meltdown"** in
visible copy. Fixed at source (4 sites in the lab renderer):
- `report-formatters.js` label table → "Fenêtre de décaissement anticipé REER"
- `report-pdf.js` narrative "L'objectif du meltdown…" → "…du décaissement anticipé…"
- `report-pdf.js` AI subhead "Meltdown — Analyse IA" → "Décaissement anticipé — Analyse IA"
- `report-whatif.js` slider label "Cible meltdown REER" → "Cible de décaissement anticipé REER"

## Cross-renderer parity finding (the pilot's biggest catch)
The pilot uses the **lab** renderer (`report-pdf.js`). A manual parity scan of the
**production** renderers found the brand-new Phase-2 gate would mishandle
**Expert** reports (`report-html-expert.ts`) — invisible to a lab-only corpus:
- **Real leaks** (fixed): advisor-questions default had FR "meltdown" + prescriptive
  "optimiser"/"optimize" → would trip `fr_jargon_meltdown` + `amf_banned_stem`.
- **Gate over-reach** (fixed via label rename, ban kept strict — user decision
  2026-06-17): descriptive labels "Scénario optimiste"/"Optimistic scenario" and
  "Optimisation du ménage"/"Household optimization" tripped the optimis*/optimiz*
  ban on ~every Expert report → renamed to "Scénario favorable"/"Favourable scenario"
  and "Analyse du ménage"/"Household analysis".
- `report-html-360.ts` (Bilan, the $29.99 flow): **clean**, no changes needed.

## What the pilot did NOT measure (honest scope)
- **AI-narration-class** failures (needs real API + the Phase C auto-repair loop).
- **Prod-renderer** pass rate end-to-end (corpus renders via the lab renderer;
  prod-renderer parity in the harness is Phase A).
- Only 20 profiles (a pilot). The ≥300 corpus + the richer lab checks
  (number-provenance, qa-check) are the next expansion.

## Renderer parity run (2026-06-17) — `run-prod-parity.ts`
Ran the same 20 profiles through the **production** Bilan 360 renderer
(`lib/report-html-360.ts`), reproducing the webhook pipeline (deterministic,
`ai={}`), gated by `evaluateReportShip`. Run via `tsx` (prod TS uses
extensionless/dir imports). Shared corpus data factored into `corpus-data.mjs`.

| Run | Pass | Finding |
|---|---|---|
| First prod parity | 11/20 (55%) | 9× `empty_or_tiny_render` |
| After gate fix | **20/20 (100%)** | calibration bug fixed |

### Gate bug found: `empty_or_tiny_render` miscalibrated for the interactive renderer
`report-html-360` emits an **interactive dashboard** (~28KB) whose content lives
in an embedded `window.__BUILDFI__` data payload (15–20KB of script), not in
static HTML — so its script-stripped visible text is ~2000 chars **by design**.
The Phase-2 gate measured visible text < 2000 → it would have wrongly pushed
genuine Bilan 360 reports to the needs-attention fallback. Fixed: the empty check
now treats a report as non-empty if it has a substantial interactive payload OR
enough visible text (`report-ship-gate.ts`). The static renderer (report-pdf.js /
clientExport) is still protected by the visible-text floor.

### Latent gap (next priority): the gate is content-blind on interactive reports
Because the gate strips `<script>`, it mostly inspects the ~2000-char shell, not
the JSON payload where most user-facing content (and AI narration) lives. For this
**deterministic** corpus, scanning showed no sentinel hidden in the payload beyond
the shell — so no current leak. But once **AI narration** fills the payload
(Phase C), the AMF/jargon/placeholder/NaN checks must also scan the payload's
string values, or the gate will be blind to exactly the text most likely to
violate. This is the key Phase-A gate-redesign item.

## Takeaway
The measure → isolate → fix → re-gate loop works end-to-end, cheap and reproducible.
Both the lab renderer and the production renderer now pass 20/20 on this corpus.
Parity was worth doing first: it found (a) prod Expert leaks invisible to a lab
corpus, and (b) a gate calibration bug that would have mis-failed real Bilan 360
reports. Remaining known gaps: gate content-blindness on interactive payloads
(matters at Phase C), Expert-param corpus coverage, expand to ≥300, AI-class
failures (need API + auto-repair).
