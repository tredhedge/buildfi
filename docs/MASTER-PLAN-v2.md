# Bilan 360 — Master Plan v2 (hardened against the adversarial panel)

**Objective:** ≥99% of paying customers receive, with no human in the per-report path, a report that is
both integrity-clean AND financial-planner-grade (a Pl. Fin. would sign it). Sub-grade/broken → HELD.

**Why v1 would have failed (panel consensus):** we keep declaring victory on a *proxy we author*
(integrity gate, `mustCover` checklist) inside a *closed loop* (same hand writes the report, the
corpus, and the gate). Evidence: `corpus-30/dashboard.md` = 100% on 2026-06-17; independent review =
D+/do-not-deliver on the *same* reports on 2026-06-18. v2 is built around the one thing that broke the
illusion — **a blind independent sign-off on the real customer artifact** — and makes everything else
serve it.

---

## DECISIVE TEST FIRST (hours, not weeks) — and the kill-criteria that prevent #111

Kill-test #2 (correct and brutal): the two spike reports (`hnw_bc_en`, `gis_qc_fr`) ALREADY EXIST on disk,
rendered by the real renderer, already blind-graded D+. Part 0's thesis ("a blind sign-off breaks the
illusion") ALREADY HAPPENED on 2026-06-18. Treating this as a multi-week build is exactly how it becomes
the 5th dead plan. So run the decisive experiment NOW, before any architecture:

- Take `hnw_bc_en`. Apply ONLY allowed-layer fixes (renderer: parse `**bold**`, stop truncation, dedupe
  levers; prompt/model: include rentals). Re-narrate (subagent now, per no-API). Re-render through the real
  renderer. Hand the raw HTML to a FRESH blind reviewer (no rubric): deliver / trivial-edits / do-not-deliver
  + the single disqualifying defect + its LAYER (renderer / prompt / engine).

**Kill-criteria (fixed before starting; builder cannot move):**
- CONTINUE iff it flips to deliver/trivial AND the residual blocker is renderer/prompt. Then repeat on
  `gis_qc_fr`. Two blind signatures unlock Part 2.
- KILL / RE-THINK iff after allowed-layer fixes it is STILL do-not-deliver AND the named blocker is the
  ENGINE (estate ≫ assets, hidden spend-cut, success%-vs-depletion). Then the decision is "get engine
  sign-off or descope the claim" — NOT build ReportModel/Thesis/three-tier. Building Part 2–4 in that world
  is dead-plan #5.
- Tripwire: >1 day without either a blind signature or a named engine-kill → STOP.

## Why this is not failure #111 (honest)

Prior attempts did not fail at execution — they SUCCEEDED at the wrong objective: a self-authored proxy
(integrity gate, 505-suite, `mustCover`) the builder also controlled. Change the objective to "a blind human
signs the real shipped artifact at a rate the builder cannot zero out," and the same iteration machinery
converges, because you cannot fool a blind judge 110 times — each rejection teaches a real lesson. The
difference is NOT a cleverer plan (every prior plan claimed that). It is three hard mechanisms:
1. **An objective I cannot issue the verdict for** (blind human on the real artifact = key 2; builder can't turn it).
2. **A kill-criterion that makes failure fast and cheap** (1 report, not 110) — above.
3. **No peer model ever holds the release key** (kill-test #1) — see PART 0 §0.
If all three hold and the product still can't clear the bar, we ship the honest thing (human-in-the-loop,
priced/capped), not attempt #111.

## PART 0 — The one rule that makes this un-gameable (do this first, keep it forever)

**§0 — Release authority is never a peer model (kill-test #1).** A same-family model (subagent OR API) may be
an advisory input to the FIXER, but must NEVER hold a release key — two Claude instances share a prior, so an
adversarial Claude reviewer is systematically blind to the same composition-lies a Claude writer makes (e.g.
"100% success / A+" printed above a fan chart that hits $0 at 90, driven by an undisclosed spend-cut — fluent,
coherent, and wrong; both models read it as good). N-of-M majority makes this WORSE (averages out idiosyncratic
catches). The keys that ship a report are: (1) deterministic Tier-A code, (2) a human signing a builder-blind
LIVE sample, (3) later, a cross-family model — advisory until calibrated. The same-family reviewer panel is
QA *input*, not a gate.

**§0.1 — The standing key-2 that stops the loop re-closing (kill-test #1).** In prod, a builder-uncontrollable
fraction (~2–3%) of LIVE reports is HELD from the customer until a human Pl. Fin. signs — selected by a seed
the build team does not own, OVERSAMPLING the rare param combinations the builder never stratified. This puts
the human on real *shipped* artifacts (so they cannot silently lapse — a held report blocks delivery until
signed), measures **prod escape rate directly** (the only un-gameable metric), and targets correlated blind
spots the curated corpus hides. Prod KILL-CRITERION: if that blind-human live sample faults >5% on any
50-report rolling window, ABANDON full-auto and ship human-in-the-loop — do not grind #111.

**Definition of DONE (single, human-anchored, un-gameable):** a report is done only when a reviewer who
(a) did NOT build it, (b) did NOT see the gate/`mustCover` criteria, and (c) is shown ONLY the exact
HTML a paying customer receives — **production Opus narration through production `report-html-360.js`**
— returns "deliver as-is" or "trivial edits." The unit of done is a *signed real report*, not a passed check.

Wiring (prevents premature victory by construction):
1. **Two-key release.** Automated gate green = necessary, NEVER sufficient. Key 2 = blind sign-off, and
   the build team cannot turn it. Reviewers: a **cross-family model judge** (different model, adversarial
   rubric) for volume + a **human Pl. Fin.** as the periodic ground-truth calibrator.
2. **Vocabulary lock.** The dashboard may print "integrity-clean N/N" and "planner-signed M/N." The words
   pass / 100% / done / ship-clean are reserved for **planner-signed**. (Had this existed, corpus-30 would
   have read "integrity-clean 22/22; planner-signed 0/22" — the truth.)
3. **The gate's job is to PREDICT the human.** Human verdicts are the labels; the automated gate is scored
   on agreement with them (Cohen's κ, false-pass rate). A green gate the human overrules is logged as a
   **gate bug**, not a report success.
4. **Standing circularity check at every checkpoint:** "Could this green result be produced by a report a
   planner would refuse?" If yes, the checkpoint is not passed regardless of the number.

---

## THE REPORT PROTOCOL — multi-agent, defined roles (subagents now / API later)

The generator + QA is a **pipeline of role-played agents**, not one prompt. **Pluggable executor:** the
orchestration is ONE code path; only the per-role executor swaps — `runRole(role, input)` = a Claude Code
subagent now (testing, no API spend), = a discrete Anthropic API call in deploy (a Strategist call, a Writer
call, a Fixer call). The protocol transfers unchanged; the only test↔deploy delta is subagent-Claude vs
API-Opus output, measured by the live canary. **So yes — the API deployment IS the same multi-role subagent
protocol, with each generative role becoming one API call. The exception is the release authority: the
REVIEWER role stays advisory (peer model, PART 0 §0); it never becomes a release-gating API call.** Per report:

0. **Model** (deterministic code) — ReportModel from primitives. No agent.
1. **Plan** (deterministic code) — ReportPlan: slots, dataRefs, assertional beats. No agent.
2. **STRATEGIST agent** — reads model+plan → the thesis: `{leadInsight, drawdownOrder, riskRanking[],
   demote[], omit[]}`. One coherent recommendation. (The missing quality layer.)
3. **WRITER agent** — fills the slots, consistent with the thesis, citing only `dataRefs`.
4. **Tier-A deterministic gate** (code) — integrity + coverage + numeracy/coherence invariants;
   empty required slot = BLOCK; unknown archetype = HOLD. Fast, free, deterministic; catches most issues.
5. **REVIEWER panel** — N adversarial "hostile Pl. Fin." agents, **blind to the gate criteria**, each
   tries to REJECT and must cite a verbatim sentence + the rule it breaks. Majority verdict.
6. **FIXER agent** — consumes the Tier-A + reviewer findings, regenerates ONLY the flagged slots (or
   re-runs the Strategist if the thesis itself is wrong) → back to step 4. Loop ≤N attempts.
7. **HOLD** only if it still fails after N attempts → needs-attention + alert. This is the ≤1% safety valve.
8. **HUMAN calibrator** (periodic, out-of-band) — blind-signs a stratified sample; the reviewer panel is
   scored against the human (κ, false-pass). The human is the true key-2; the reviewer agents are the
   scalable PROXY that must keep agreeing with the human.

**Anti-circularity inside one model family:** Writer ≠ Reviewer (separate agents, separate prompts, never
self-grading); Reviewer is adversarial + blind + verbatim-grounded + N-of-M majority; and the Reviewer is
**continuously calibrated to a human** (step 8). Same-family judging is weaker than cross-family — we treat
that honestly and MEASURE it (independence delta) the day an API/second family is available.

**How ≤1% hold is reached (not promised — engineered + verified):** the hold rate is an OUTPUT of how often
steps 2–6 self-heal. We drive it to ≤1% by (a) fixing systematic defects at the root so they stop recurring
(Part 2), (b) the Strategist+Writer producing coherent output by construction, (c) the Fixer loop resolving
the residual, so only genuinely-unresolvable cases (truly novel/incoherent profiles) HOLD. We MEASURE hold
rate on the corpus and tune N + the role prompts until ≤1% on every archetype/lang stratum. (Reviewer #4's
"3–8%" is the rate if you only gate-and-hold with no self-healing; the repair loop is precisely what closes
that gap. If, after honest tuning, a stratum can't reach ≤1%, that's surfaced as data — but the protocol is
designed to hit it.)

## PART 1 — Prove the chain on the 2 WORST reports, before building anything (the vertical spike)

Rationale (Reviewer 5): the plan is too big and will stall as the 5th green dashboard before a single
signed report. Invert it — prove the *whole vertical* on the hardest cases first; architecture follows a
proven artifact.

- **Take `hnw_bc_en` (D+, rentals-contradiction + bridge-math + depth) and `gis_qc_fr` (D+, GIS/SRG).**
- Drive each through the **REAL production path with REAL Opus narration and the REAL renderer**, end to
  end, fixing whatever it takes — renderer bugs, rentals-from-primitives, the thesis pass, prompt depth,
  and confronting the engine incoherence (fix or HOLD) — until a **blind reviewer signs "deliver as-is."**
- **WIP limit:** no ReportModel refactor, no ReportPlan, no corpus scale, no CI wiring begins until **≥2 of
  the hardest profiles are blind-signed.**

What this achieves: it forces the fidelity fix (real Opus, real renderer, real reviewer) onto report #1;
surfaces the protected-engine confrontation on day one instead of phase 4; and calibrates which proposed
checks actually correlate with a signature *before* we build all of them. The illusion cannot survive
contact with one real signed report.

**Pre-spike baseline (Reviewer 1+4):** before touching code, narrate ~10 profiles through **live Opus**
and run the current gate; record prod-pass, slot-completeness, JSON-parse-failure, latency p50/p95. No
refactor merges without a pre-state number to beat.

---

## PART 2 — Generalize what made them sign-able (architecture follows the proof)

Build order corrected (Reviewer 1): **Model → Plan → Thesis**, each regression-gated by the 2 signed reports.

1. **ReportModel from PRIMITIVES.** One validated object built from `params.props`/`params.debts`/raw
   params/`mc` — NOT from the lossy `params._report` projection (that's the rentals root cause: prompt
   reads `rp.rentals`, always undefined; translator sets `params.props`; renderer reads `params.props`).
   Decommission `_report` as a report-data source (grep target: zero `rp.` reads in prompt data). Real,
   floored, named, unit-tagged, **including all assets**. Validator enforces invariants AND **cross-field
   coherence as HOLD triggers**: estate ≤ k×terminal-wealth, lifetime-fees ≤ k×assets, success% reconciled
   with fan-chart depletion age, any spend-cut must be `disclosed:true`. (This is the cheap path to P4
   engine-safety: incoherent → HELD, never narrated, without waiting on the protected engine.)
2. **ReportPlan governs THREE slot kinds** (Reviewer 1), not just AI text: `narrative` (AI), `chart`
   (dataRefs into model — so the fan chart can't contradict the narrated P25), `static` (deterministic
   fallback, also reads the model). Renderer emits `id="sec-…"` per section (unblocks the gate's coverage
   check, currently a silent no-op). One manifest, three render strategies; prompt + renderer + gate all
   consume it.
3. **The THESIS pass — the missing quality layer** (Reviewer 2). `buildReportThesis(model)` runs ONCE per
   report before any slot: `{ leadInsight, drawdownOrder, riskRanking[], demote[], omit[] }`. Slots consume
   it ("the thesis says X; write consistent with it; don't re-rank"). This produces ONE client-specific
   recommendation instead of 33 independent ones — and resolves archetype conflicts (e.g. GIS "defer RRSP"
   vs RRSP-concentration "draw early") that a `mustCover` set cannot. Without this layer, no checklist
   yields planner-grade.
4. **`mustCover` becomes ASSERTIONAL, not topical** (Reviewer 2): `mustAssert` (the claim the report must
   make, e.g. "registered withdrawals claw back SRG ~50% NOW, not at 71"), `mustNotAssert` (e.g. "fees are
   the primary lever" when assets small / gov-coverage high), `mustRank`. Deterministically falsifiable, not
   gameable by mention. `canonical-quote` becomes **blocking for single-value concepts** (fed by per-slot
   `dataRefs`), advisory only for genuinely multi-valued ones.

Encoded planner rules (minimum, Reviewer 2): drawdown-order; relevance-gating of the biggest number (fees/
withdrawal-rate demoted when gov-coverage high or assets small); numeracy-plausibility invariants;
DB-pension indexation+survivor; 0%-plan lead-risk = post-depletion reality (not RRIF-at-71); one-lead-insight/
anti-redundancy; AMF conditional tense.

---

## PART 3 — A verification system that can be trusted (three tiers + closed human loop)

Reviewer 3: stop pretending one gate proves planner-grade. Split by how trustworthy each verdict is.

- **Tier A — deterministic HARD gate (the real ≥99% lever):** all integrity checks; `mustCover` as
  *coverage+grounding* (each planned slot present, cites its `dataRefs` by value+unit, ≥ min substance);
  the model numeracy/coherence invariants; **empty required slot = BLOCKER** (Reviewer 4: today the webhook
  never passes `requiredSlots`, so empty slots ship silently — one-line fix → hold+alert); **unknown
  archetype = HOLD** (Reviewer 4: `buildReportPlan` returns "no beats for this combo" → safe hold, never a
  generic ship).
- **Tier B — cross-family adversarial JUDGE (calibrated, advisory→gating):** a *different model family*,
  temperature-0, hostile Pl. Fin. rubric, returns structured findings with **verbatim quotes** (no vibe
  scores), N-of-M majority for stability. Runs offline on the corpus (CI) and as a **sampled** async check
  in prod. It only earns the right to *gate* (vs advisory) once its **false-pass rate against the blind
  human is below tolerance** on a held-out set.
- **Tier C — human Pl. Fin. as the gate's CALIBRATOR (not per-report reviewer):** blind-reviews a stratified
  holdout; their verdicts are the labels Tier B is scored against. New failure modes they find become new
  Tier A deterministic checks where possible. Human stays out of the per-customer path (preserves 99%-auto),
  remains the source of truth.

De-circularize (Reviewer 2+3): split corpus into a **beat-development set** and a **blind holdout** the beats
are never tuned against; the human scores only the holdout. Measure the **independence delta** (same-family
vs cross-family judge pass rate) to quantify self-grading inflation.

Metrics that let us claim "planner-grade" honestly (never one blended number): Tier-A coverage pass; Tier-B
quality pass **per archetype × language** (not blended); judge↔human κ (≥~0.6 before B gates); judge
false-pass CI upper bound; determinism flip-rate (~0); abstention rate (<1% or it's not 99%-auto); and the
only un-gameable one — **prod escape rate** (shipped reports a later cross-family/human review faults).

---

## PART 4 — Production reality (so the corpus number means something in the wild)

- **Async job architecture** (Reviewer 4, with measured budget: MC alone is ~10–14s, narration caps at 90s
  → over 120s before quality checks). Webhook does ONLY: verify → idempotency → MC → persist
  ReportModel+ReportPlan → enqueue → 200 to Stripe in <15s. A background worker (KV-queue/cron, you already
  have KV) does narration → Tier-A gate → repair → render → ship → Blob → Resend with a 5–10 min budget —
  the only place Tier-B/judge can run. Email "arrives in a few minutes." Parallelize/trim extra MC runs to
  500 paths.
- **Live-API fidelity canary** (Reviewer 3+4): 12–20 profiles (archetype × lang × band tails) narrated via
  the REAL Opus path at real `max_tokens`, run **3× each** (nondeterminism), gated. Measures the prod-only
  failure modes the agent-corpus can't see: JSON-parse failure, slot completeness, latency p95 vs the 90s
  cap. ~$40/run; runs on every prompt/model change + weekly. This — not the free agent corpus — is the
  customer-facing pass number.
- **Representative corpus** (Reviewer 4): seed from real anonymized wizard submissions (KV `wizard:{id}`,
  already stored) once volume exists; until then add deterministic adversarial fuzz and **expect ~5–10% to
  trip something** (a 100%-green corpus is under-testing the tails). Full corpus on the free/agent path for
  plumbing+Tier-A; the 12–20 live canary for fidelity; ~20 blind-human for ground truth.
- **Real fallback ops** (Reviewer 4): `sendAdminAlert` to one inbox is not a 24h SLA. Add on-call/ack/ticket
  tracking. Honest launch hold-rate is **3–8%**, not <1% — size the human queue for it.
- **Prod telemetry is the canonical pass-rate** (Reviewer 3+4): log every live verdict (gate result, repair
  count, empty-slot count, latency, hold reason) to PostHog; every hold auto-folds into the corpus.

---

## PART 5 — What we will and won't claim (honest done)

- We claim "planner-grade, ≥99% auto" only when: Tier-A ≥99% across **every** archetype/lang stratum;
  Tier-B is cross-family + adversarial + deterministic-by-majority with κ-vs-human ≥0.6 and false-pass CI
  below tolerance; abstention <1%; the live canary holds across 3× repeats; and prod escape-rate trends to 0.
- Until then the honest statement is "integrity-gated + auto-shippable; quality is sampled+advisory" — which
  is weaker, and that's the point: we say what's true.

---

## How this delivers — and can exceed

**Delivers** because every prior failure mode now has a structural block: the closed loop is broken by a
blind sign-off the build team can't turn (Part 0); the "build harness forever" instinct is capped by a WIP
limit that demands 2 real signed reports first (Part 1); the rentals/markdown/drift class is killed at the
root by one model from primitives (Part 2); shallow-but-clean is killed by the thesis pass + assertional
beats + cross-family judge (Parts 2–3); silent empty/unknown ships become holds (Part 3); and the 120s/zero-
live-API/unmeasured-prod traps are closed by the async worker + live canary + telemetry (Part 4).

**Exceeds** because the same machinery makes every report *more* consistent than typical human-drafted
output: every report gets a deterministic synthesis pass (one coherent recommendation), an adversarial
cross-family review, and numeracy-sanity invariants a rushed human planner often skips — at $29.99 scale,
with a measured prod truth number instead of a self-graded one.

## Execution sequence (strict)
0. Part 0 wiring + pre-spike live baseline (~10 profiles).
1. Spike: `hnw_bc_en` then `gis_qc_fr` → blind-signed "deliver as-is" (real Opus, real renderer). **GATE.**
2. Part 2 architecture (Model→Plan→Thesis), regression-gated by the 2 signed reports.
3. Part 3 three-tier gate + human calibration loop.
4. Part 4 async + live canary + corpus from real submissions + telemetry.
5. Scale to ≥300 and lock; claim only what Part 5 permits.
