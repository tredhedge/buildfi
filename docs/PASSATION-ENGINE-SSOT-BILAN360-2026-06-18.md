# PASSATION — Engine SSOT + Bilan 360 Integrity & Quality
**Date:** 2026-06-18 · **Author:** prior Claude session · **Read `CLAUDE.md` first (authoritative).**

You are picking up a multi-phase effort on BuildFi (`C:\Users\tredh\OneDrive\Documents\GitHub\buildfi`, repo `tredhedge/buildfi`, main → Vercel). Execute the three phases **in order**. Do not skip ahead; each phase de-risks the next. The user is closely involved and wants to be consulted at genuine forks — ask, don't guess, on architecture and anything touching the protected engine.

---

## NORTH STAR
One engine, one report pipeline, no duplicated/parallel sources of truth — and Bilan 360 reports that are BOTH integrity-clean AND financial-planner-grade, delivered to ≥99% of customers with no human intervention (hold rate ≤1%). Bilan 360 = the constrained configuration of the Planner (same engine, fewer knobs, simpler mortality).

## NON-NEGOTIABLE GUARDRAILS
- **Golden Rule:** never remove/simplify/downgrade validated behavior without explicit written approval. Engine changes are additive + test-guarded.
- **Engine is protected.** Any change to `lib/engine/index.js` or `planner/planner_v3.html`'s engine: do it **candidate-first** (emit a separate file, differential-validate against the live engine + the 505-suite, swap only when proven equivalent-or-better). NEVER overwrite the live engine blind.
- **Do NOT delete planner_v3.html** (user decision 2026-06-18). It is the most up-to-date engine AND the kept front-end.
- **AMF/OSFI:** report prose is observational + conditional only (could/would/might); no should/recommend/must/imperatives. `softenAISlot` + `FORBIDDEN_TERMS` in `lib/ai-constants.ts` enforce server-side.
- **Reports loop uses SUBAGENTS as the narrator, NOT live Anthropic API calls** (cheaper; the architecture is built for eventual API swap via a pluggable executor). Do not make live API calls without the user asking.
- Run `node .audit-harness/run-suite.js` (must stay **505/505**) and `npx tsx tests/engine-parity.test.ts` (must stay green) after ANY engine change. Run `npm run build` before any main-merge. Don't commit/push unless the user asks.

## WHAT'S ALREADY DONE & VERIFIED (do not redo)
- **Bilan 360 → deterministic death age.** `lib/quiz-translator-360.ts`: `stochMort:false` + conservative fixed `deathAge` (single M 92 / F 94, couple last-survivor 95; honors explicit `a.deathAge`). Planner keeps `stochMort:true`. Makes the report coherent by construction (estate = fan-chart endpoint). Engine supports the flag at `lib/engine/index.js` ~968. **Wizard UI still needs the death-age question + conservative default + "family longevity→95" option — NOT built.**
- **2 engine ports into lib/engine** (verbatim from planner_v3, user-authorized): (1a) GIS employment-income exemption in `calcGIS` (6th arg `employmentInc`) + wired deflated `ptInc` through the 3 personal call sites (~617/1330/1828), spouse site untouched; (1b) optimizeDecum tax-funding block. Verified: suite 505/505, parity 69/0, `calcGIS` retro-compatible.
- **Parity test locked:** `tests/engine-parity.test.ts` now exercises `calcGIS(employmentInc)` cross-engine + value cases + optimizeDecum finalBal/computes-tax (closes the prior blind spot where it never passed a 6th arg).
- **Ship-loop harness seeded:** `planner/report/realai/ship-loop.ts` sets `params._seed` (stableSeed) → reproducible dumps; `statu_quo`===base (80/81 drift killed at source). Renderer/prompt/canon fixes shipped: AMF levers softened, snapshot pre-filled server-side, statu-quo/Laboratoire/rental copy, `retSpendReduction` in canon, full-text caps, markdown bold.

## KEY FINDINGS / CONSTRAINTS (carry these forward)
- **planner_v3's `runMC` is NOT self-contained.** Proven via candidate-first differential (`scripts/diff-engine-candidate.ts`): fiscal helpers port 38/38 (constant Q1-vs-shim drift is immaterial), but `runMC` returns degenerate 100% without main-thread globals defined OUTSIDE the `/*__ENGINE_START__*/…/*__ENGINE_END__*/` markers. lib/engine's `runMC` IS self-contained. **This is the central obstacle to Phase 1/2.**
- **Bug #12** (y=0 inflation guard `if (y>0) cumInf*=…`) is lib/engine-ONLY (planner_v3:4067 lacks it) → reverse-port to planner_v3 if it becomes source. **Bug #2** IS in planner_v3 (via `finalsRaw`).
- **KNOWN WARN (backlog):** canon `optimizeDecum` melts RRSP unconditionally (no `p.melt` gate, no smoothing); planner_v3 gates on `p.melt` + has 4 smoothing/multi-pass passes (meltdown, NR-depletion, spending-layer, backward). taxInc $104k vs $9k at 65, kills GIS, +$40k lifetime tax. **`optimizeDecum` is NOT consumed by any `app/` route** → low live impact, but it's the clearest evidence planner_v3 leads on decum logic.
- **Constants:** 6-way fan-out; `engine-shim.js` (server, the only file lib/engine imports) vs `report-constants-2026.js` (report) diverge → drift tests (`tests/constants-drift.test.js`, `tests/fiscal-constants-sync.test.ts`) are RED. `fiscal-2026.ts` GIS_MAX_COUPLE should be 665.41.
- **Anti-circularity lesson (reports):** the closed integrity gate scored hnw_bc FULL-PASS while a blind Pl.Fin. reviewer (reading the real HTML + embedded `__BUILDFI__` data) found 8 delivery-blockers across 3 rounds. **The blind review on the real customer artifact IS the release gate** — do not author the "correct story" for the narrator; fix the DATA the narrator is fed and let it describe what's actually there.

## TOOLING ALREADY BUILT (reuse)
- `scripts/gen-engine-from-planner.mjs` — extracts planner_v3 engine block (markers via `lastIndexOf`) → ES-module candidate `lib/engine/index.candidate.js`, 24 exports. v1 keeps planner_v3's inline `C`.
- `scripts/diff-engine-candidate.ts` — differential: candidate vs live engine (fiscal helpers + seeded runMC).
- `.audit-harness/extract.js` — sandbox loader for planner_v3's engine (markers via `lastIndexOf`).
- `node .audit-harness/run-suite.js` (505 tests against planner_v3), `npx tsx tests/engine-parity.test.ts`.

---

# PHASE 1 — Split planner_v3 into back-end engine + front-end
**Goal:** make planner_v3's engine a self-contained, server-runnable module (the SSOT engine), separated from planner_v3's UI/front-end. This resolves the `runMC`-not-self-contained obstacle.

1. **Map runMC's external dependency closure.** Identify every global/function `runMC` (and its callees) reference that is NOT defined inside the `/*__ENGINE_START__*/…/*__ENGINE_END__*/` block. Diff against `scripts/diff-engine-candidate.ts` (the candidate returns degenerate results precisely because these are missing). Sources: main-thread vars in planner_v3's broader `<script>`, worker globals, `self`/`window` usage.
2. **Move those dependencies inside the engine markers** (or into a small shared back-end module planner_v3 imports), so the marker block is a complete engine. Keep planner_v3's front-end (DOM, UI, wizard) on the other side of the boundary. This is the literal "break planner_v3 into back-end + front-end."
3. **Reverse-port Bug #12** (the y=0 inflation guard) into planner_v3 so it's a true superset. Re-run `run-suite.js` (505/505 must hold — investigate any shift, since the suite tests planner_v3).
4. **Regenerate the candidate** (`node scripts/gen-engine-from-planner.mjs`) and **differential-validate** (`npx tsx scripts/diff-engine-candidate.ts`): runMC Δ must collapse to ~0 (within MC tolerance) once the deps are in the block. Inject the shim's current constants over the candidate's `C` (v2 of the generator) so the generated engine uses Q2-2026 values, not planner_v3's Q1.
5. **Gate:** candidate must (a) pass the 505-suite logic, (b) match live runMC within tolerance on a broad seeded profile sweep, (c) preserve lib/engine's self-contained bugfixes. Get user sign-off before promotion.

# PHASE 2 — Remove duplicate / multiple sources of truth
**Goal:** one engine, one constants source, generated downstream copies. planner_v3 stays (front-end + engine source); everything else is generated from it.

1. **Promote the validated candidate to `lib/engine/index.js`** (the server engine becomes generated from planner_v3). Wire the generator into the build/CI so it can't drift. Keep `tests/engine-parity.test.ts` green (it now compares the two — they should be identical post-generation).
2. **Regenerate `planner/report/report-engine.js`** from the same source (it's already auto-generated; just re-point the generator). Don't delete it while `report-whatif.js` (~28/388/438) loads `window.BEngine`.
3. **Collapse the constants fan-out to ONE source** (`engine-shim.js`): make `report-constants-2026.js` and planner_v3's inline `C` generated/derived from it; fix `fiscal-2026.ts` GIS_MAX_COUPLE → 665.41. Turn `tests/constants-drift.test.js` + `tests/fiscal-constants-sync.test.ts` GREEN.
4. **Fix the dead `/simulateur` advanced-mode iframe** (`app/simulateur/page.tsx:1194` points at a non-existent `/planner-expert.html`) — wire to `/api/simulate` or remove the advanced mode.
5. **Report renderer:** System A (`lib/report-html-360.js` + `ai-prompt-360.ts` + `report-data-360.ts` + ship-gate + guardrail) is the only live report path; System B (`planner/report/report-pdf.js` + `review/` + `realai/`) is lab/test-only. Consolidate toward ONE renderer parameterized by `stochMort` (fixed-age view for Bilan 360, stochastic-with-framing for Planner) — this is the Report Quality Contract in CLAUDE.md. The Planner report needs the same coherence/AMF fixes Bilan 360 got.
6. **Do NOT delete planner_v3.** Its engine is the source; its front-end is kept.

# PHASE 3 — Finish Bilan 360 integrity + quality via the loop
**Goal:** ≥99% auto-delivery, hold rate ≤1%, every report integrity-clean AND planner-grade. Harness: `planner/report/realai/ship-loop.ts` (`npx tsx … dump|render|report --base=… --only=…`). Loop = dump → (subagent narrate from the prompt's `=== DATA ===`) → render → integrity gate → **blind Pl.Fin. review on the real HTML** → fix at the right layer → repeat.

1. **Resume the open blocker on hnw_bc** (and the corpus): the remaining failures are ALLOWED-LAYER couple/ACCUM **data-semantics**, fix in `report-data-360.ts` (canon/`buildReportModelCanon`) + the extract in `report-html-360.js`:
   - (a) Narrator is fed CURRENT gov income ($0 for a 48-yr-old) instead of PROJECTED retirement gov (~$28k/yr) — `retRev` samples at retirement START, before CPP/OAS begin. Add a steady-state `retGovMonthly` (peak post-benefit gov from `medRevData`) + `retGovCoveragePct`. Fixes the "gov covers 0%" falsehood.
   - (b) Replacement % uses individual income; for couples use HOUSEHOLD income (`sal + cSal`).
   - (c) Bridge/spending use individual $102k target; the engine models HOUSEHOLD spend (~$142k = retSpM + cRetSpM). Add `householdRetTargetMonthly`. Recompute bridge cost from actual projected bridge-year spend.
2. **Re-narrate from the corrected DATA** (subagent), **render**, run a **fresh blind Pl.Fin. review** (independent agent, no priming, must cross-check the embedded `__BUILDFI__` data). Apply kill-criteria: deliver/minor → continue to next persona; do-not-deliver + allowed-layer → fix + repeat; do-not-deliver + engine-layer → stop for sign-off.
3. **Harness fidelity:** make the harness run prod's `autoRepairNarration` (≤2) like the webhook — it currently doesn't, so it's stricter than prod on `format_leak` (use the deterministic EN-number reformat already proven). This makes corpus pass-rate predict prod hold-rate.
4. **Scale:** once ≥1 persona is blind-signed, repeat across the corpus (`corpus-30/`, then scale to ≥300, both langs, all archetypes incl. GIS/decum which now exercise the ported GIS-exemption). Target: blind-review sample ≥90% "deliver/minor", 0% "do-not-deliver"; integrity gate ≥99%.
5. **Then** wire the eventual prod path: the same subagent protocol with a **pluggable executor** (subagent now / Anthropic API in prod), Tier-A deterministic gate + Tier-B advisory peer review (never a release key) + Tier-C human live-block sampling at a builder-uncontrollable rate. See `docs/MASTER-PLAN-v2.md`, `docs/BILAN360-SHIP-LOOP-SPEC.md`, `docs/REPORT-MODEL-CONSOLIDATION.md`.

---

## START HERE
Phase 1, step 1: map `runMC`'s external dependency closure (why the candidate is degenerate). Use `scripts/diff-engine-candidate.ts` + `.audit-harness/extract.js` as your instruments. Confirm the plan with the user before promoting any engine to live. When in doubt, ask — the user wants to steer the architecture.
```
node scripts/gen-engine-from-planner.mjs          # regenerate candidate
npx tsx scripts/diff-engine-candidate.ts          # see the runMC gap
node .audit-harness/run-suite.js                  # 505/505 baseline
npx tsx tests/engine-parity.test.ts               # 69/0 baseline
```
