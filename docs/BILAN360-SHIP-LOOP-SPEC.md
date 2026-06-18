# Bilan 360 Ship Loop — Specification

**Status:** spec (2026-06-17). Implements Phases B+C+D of
[`planner/report/PLAN-100-PERCENT-SHIP.md`](../planner/report/PLAN-100-PERCENT-SHIP.md).

**One-line:** a repeatable harness that renders N Bilan 360 reports through the **real
production code path**, supplies narration from **Claude-the-agent instead of the paid API**,
gates each report with **both** the production ship-gate **and** the 17 lab auditors, buckets
every failure by class, **fixes the cause at source**, and **re-runs until ≥99% ship clean**.

---

## 1. Goal & success criteria

**North star (from the PLAN, accepted 2026-06-16):** ≥99% of paying customers receive a real,
correct, AMF-safe report **with no human in the loop**. The ≤1% remainder get the honest
`needs-attention` fallback + a human alert + a 24h SLA. **A broken report never reaches a customer.**

**This loop's job:** turn "we think it's ~80%" into a measured number against the *real* product,
then drive that number to ≥99% by fixing causes — not by loosening gates.

**Done when:**
1. A pilot corpus (~30 profiles spanning the input space) and then the full corpus (≥300) run
   end-to-end through the loop.
2. **Pass rate ≥99%** where **PASS = prod ship-gate clears AND the lab arbiter reports 0 blockers**
   on the **production-rendered** HTML.
3. Every distinct failure class has either a **source fix + gate check** (structural) or a
   **runtime auto-repair** (AI-narration class). No class is "watched but not enforced."
4. Zero false-positives: every new gate check is validated against the passing corpus so it never
   holds a good report.

---

## 2. The fidelity principle (why this loop is not the existing lab loop)

Audit finding (2026-06-17): the existing `planner/report/realai` lab loop renders with
**`report-pdf.js`** and prompts with **`report-ai-prompt.js`** — the *planner/expert* lab modules.
Bilan 360 customers actually receive **`lib/report-html-360.js`** built from **`lib/ai-prompt-360.ts`**
+ **`lib/report-data-360.ts`**, gated by **`lib/report-ship-gate.ts`**. So the 4/5 "shipped"
personas in `bilan360-personas/review/_summary.json` were validated against artifacts **customers
never see**. The true pass rate of the shipped product is **unmeasured**.

**Therefore the loop MUST exercise the real prod path:**

```
real wizard answers
  → translateBilan360()            (lib/quiz-translator-360.ts)      [REAL]
  → runMC(params, 5000) + stress   (lib/engine/index.js)             [REAL]
  → buildAIPrompt360(params, mc)   (lib/ai-prompt-360.ts)            [REAL]
  → NARRATION                       (Claude-the-agent, §5)            [SUBSTITUTED]
  → extractReportData360()         (lib/report-data-360.ts)          [REAL]
  → renderReportHTML360()          (lib/report-html-360.js)          [REAL]
  → GATE                            (§6: prod ship-gate + 17 auditors)
```

The only substituted node is narration. Everything else is the exact code that ships.

---

## 3. Architecture: two layers + a control loop

**Layer 1 — deterministic Node harness** (no API, no agent): corpus generation, translation, MC,
prompt building, data extraction, HTML render, both gates, failure bucketing, report writing. All
runnable with `tsx` (already a devDependency; `qa:full` already runs `.ts` via `npx tsx`).

**Layer 2 — Claude-the-agent**: (a) the **narrator** — reads each prompt the harness emits and
returns the narration slots as JSON (substituting for the Anthropic API; §5); (b) the **fixer** —
reads the failure buckets and edits source to kill structural classes (§8).

**The loop is orchestrated across turns** because narration and fixes require the agent. The Node
harness exposes clean handoff points (it stops and writes a queue; the agent fills it; the harness
resumes). Each pass is fully resumable from disk artifacts.

---

## 4. The corpus

Profiles are **wizard-answer objects** (the shape `translateBilan360` consumes), identical in form
to `bilan360-personas/personas.mjs`, so params are production-faithful (no hand-tuned engine params).

**Dimensions to span (PLAN B1):**
- **Province:** QC, ON, AB, BC (+ others as scale grows)
- **Household:** single × couple (couple fully modeled — both incomes, both account sets)
- **Phase:** ACCUM, TRANSITION, DECUM (routing per CLAUDE.md: `retAge−age≤0`/retired → DECUM;
  `retAge−age≤7 AND age≥52` → TRANSITION; else ACCUM)
- **Success band:** force coverage of the tails (0–20%, …, 80–100%) — fragile plans are where
  tone/trust gates fire
- **Archetypes:** late-start, consumer debt, DB pension, rental ×1–2, RESP/kids, renter,
  homeowner-sells, HNW estate, GIS-eligible, widow/divorce
- **Calibration:** finLiteracy × stressLevel × detailPref combos
- **Language:** FR and EN
- **Edge values:** age 18/95, retAge≈age, 0 savings, very high savings, 0 income, mortgage>assets

**Pilot (Run 1): ~30 profiles** — one per archetype across both languages and the band tails,
deterministic (index-seeded variation; **no `Math.random`** so runs reproduce). The 5 existing
personas are included so we keep their history.

**Scale (Run 2+): ≥300** — programmatic generator walking the cross-product, capped and stratified.

**Artifact:** `planner/report/realai/corpus/profiles.json` (same schema `build-profiles.mjs` emits).

---

## 5. Narration substitution — "I am the API"

The real webhook calls Opus with the prompt from `buildAIPrompt360`. In the loop, the harness writes
that exact prompt to `corpus/prompts/{id}.json`, then **stops**. Claude-the-agent then, per profile:

1. Reads the **real system+user prompt** (the same one prod sends — AMF rules, data-integrity
   pinning, calibration, case-driver mandate all included).
2. Produces the narration **JSON object with exactly the prod slot keys** (the set
   `buildAIPrompt360`/`extractReportData360` expect; verified at build time against the prod slot
   list, not the lab's 11-slot set).
3. Writes `corpus/responses/{id}.json` in the shape the renderer consumes.

Fan-out is via parallel subagents (one prompt each) to keep it cost-free of API spend and fast.
Responses are committed to disk so a re-render is deterministic and a re-gate needs no re-narration.

**Fidelity guard:** because *I* am standing in for Opus, my narration must obey the same prompt
contract the gate enforces. If my narration fails the gate, that is a *real* signal (the prompt or
renderer admits a bad output) — it is **not** waved through because "Claude wrote it."

---

## 6. The dual gate (the pass bar)

A profile **PASSES** only if **both** hold on the **production-rendered** HTML:

**6a. Prod ship-gate** — `evaluateReportShip(html, lang, {coreInvalid})` from
`lib/report-ship-gate.ts` (the 6 high-confidence, fail-open checks that actually run live).

**6b. Lab arbiter — 0 blockers** — the 17 auditors in `planner/report/review/reviewers/*` via
`review-orchestrator.js` + `review-arbiter.js`, which catch what the prod gate cannot: numeric
contradiction, semantic/thesis drift, chart↔prose mismatch, tone-vs-grade, scope drift, trust-gate.

**Gate-parity work this requires (PLAN A3 — the real engineering cost):** the auditors + their
review-pack builder were written against `report-pdf.js` structure (`sec-*` ids). They must read the
**`report-html-360.js`** structure instead. Deliverable: a **360 review-pack adapter** that extracts
the canonical numbers / rendered KPIs / section visibility / chart values from the 360 renderer's
output (and its embedded `window.__BUILDFI__` payload) so the existing auditors run unchanged.
**Exit:** the same profile gets the same class of verdict on prod-360 as the lab logic intends.

---

## 7. Failure taxonomy

Every failure is bucketed into one class with a detector and a severity (seed from PLAN A1):

- **structural** — empty/missing mandatory section, empty greeting, unsubstituted placeholder,
  `undefined`/`NaN`, negative millions, broken chart (no data), duplicate ids.
- **numeric** — AI number not traceable to engine (provenance), methodology↔engine drift,
  KPI↔section reconciliation, GIS plausibility, success-rate consistency, percentage contradiction.
- **compliance** — AMF banned stems (`optimis*`/`plan d'action`/prescriptive), FR jargon (`meltdown`).
- **locale** — FR/EN leak, currency convention (EN prefix / FR suffix), double-`$`, number format.
- **tone/trust** — reassuring language on a fragile band, missing recovery arc on a low-grade plan
  (the `trust_gate` class currently blocking `gagnon`).

Each failure is tagged **`ai_regenerable`** (fixable by re-narrating the offending slot) or
**`structural`** (needs a code fix). This tag drives §8.

**Output:** `corpus/corpus-report.json` (pass%, per-class counts, example profiles, the firing
detector) + a readable `corpus/dashboard.md`.

---

## 8. Fix policy (fixing is part of the loop)

When the loop finds a failure it **improves the code**, then re-runs:

- **`ai_regenerable`** → the agent re-narrates only the flagged slots with the specific rule that was
  violated, re-renders, re-gates (≤2 attempts, mirroring prod `autoRepairNarration`). This also tells
  us whether the *prod* repair loop would have saved it live.
- **`structural`** → fix the **cause** at source, one class at a time, **diff after each**, re-run the
  affected profiles, confirm the class is gone and no regression on the passing corpus. Add/verify the
  gate check so the class can never silently return.

**Allowed-to-edit layers (auto-fix, show diffs):** the 360 renderer (`lib/report-html-360.js`),
formatters / data assembly (`lib/report-data-360.ts`, shared formatters), the gate detectors
(`lib/report-ship-gate.ts`, the auditors + 360 review-pack adapter), and the loop harness itself.

**Protected — pause and ask before editing (PLAN do-not-touch):** MC engine math / wealth floor
(`lib/engine/index.js`), accent encoding, the validated 20-profile data, the wizard
(`app/wizard/*`), `lib/quiz-translator-*`, and **`lib/ai-prompt-360.ts`**. If a structural class can
only be fixed in one of these (e.g. the prompt admits a bad slot), the loop **stops, reports the
class + the minimal proposed change, and waits for written approval** — it does not edit autonomously.

---

## 9. The control loop

```
0. corpus-gen            → corpus/profiles.json                              [Node]
1. for each profile: translate → MC → buildAIPrompt360                       [Node] → prompts/{id}.json
2. NARRATE the queue: read each prompt, emit slots                           [AGENT] → responses/{id}.json
3. for each profile: extractReportData360 → renderReportHTML360
      → prod ship-gate + 17 auditors (via 360 adapter)                       [Node] → verdicts/{id}.json
4. aggregate → corpus-report.json + dashboard.md                             [Node]
5. triage failures:
     ai_regenerable → re-narrate flagged slots (≤2)                          [AGENT] → back to 3
     structural     → fix cause one class at a time, diff, add gate check    [AGENT] → back to 1/3
6. repeat 3–5 until pass% ≥ 99% on the pilot
7. scale corpus to ≥300, repeat
8. final: pass%, residual failures, all diffs, readiness verdict
```

Resumable: every step persists to disk; a crash or new turn resumes from the last artifact.

---

## 10. Production hardening surfaced by the loop (tracked, fixed under §8 rules)

The audit found prod-path gaps the loop should also close (each becomes a class with a fix + check):
- **AI-timeout ships silently** — empty narration → report ships with blank slots, `console.warn`
  only, **no admin alert**. Fix: treat empty required slots as a gate failure → fallback + alert.
- **Delivery failure has no dead-letter** — Blob/Resend failure relies on Stripe retry. Fix: ensure
  the fallback + alert path is reached and idempotent.
- **Prod gate < lab gate** — closed by §6b (parity adapter) + wiring the stronger checks into the
  webhook once validated zero-false-positive on the passing corpus.

---

## 11. Deliverables (file map)

```
docs/BILAN360-SHIP-LOOP-SPEC.md                         (this doc)
planner/report/realai/corpus/
  gen-corpus.mjs            corpus generator (pilot 30 → scale 300)
  profiles.json            generated wizard-answer profiles
  prompts/{id}.json        real buildAIPrompt360 output (narration queue)
  responses/{id}.json      agent narration (substituted API)
  verdicts/{id}.json       per-profile dual-gate verdict
  corpus-report.json       pass% + per-class failure backlog
  dashboard.md             human-readable run summary
planner/report/realai/
  ship-loop.mjs            prod-faithful render+gate runner (the harness)
  review/pack-360-adapter.js  360 review-pack adapter (gate parity)
```

---

## 12. Boundaries / non-goals

- Not changing MC accuracy or engine math (out of scope per PLAN; this is *shipping integrity*).
- Not loosening any gate to hit 99% — only fixing causes.
- Not touching protected files without written approval (§8).
- Narration nondeterminism: treat pass% as a distribution; require the bar to hold across re-runs
  before declaring "ready to deploy."
