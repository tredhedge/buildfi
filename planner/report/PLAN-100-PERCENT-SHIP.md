# Plan — 100% of purchased reports ship error-free

**North star (accepted target, 2026-06-16):** **≥99%** of paying customers receive a **real,
correct, AMF-safe report** automatically. The remaining **≤1%** get an honest fallback: a message
that we encountered an issue requiring **human review**, and that their finalized report will be
**delivered within 24 hours** (no extra charge). A broken report **never** reaches a customer.

**Definition of done (measurable):**
1. A representative synthetic **corpus** (≥300 profiles spanning the input space) passes the ship
   gate at **≥99%** with the auto-repair loop enabled.
2. In production, the **`needs-attention` fallback rate ≤ 1%**, every occurrence **alerts a human**
   (so the 24h SLA can be met), and **0** reports with a gate-class defect reach a customer.
3. Every gate-class defect has both a **source fix** and a **gate check** (no class is "watched but
   not enforced").
4. The fallback path is operationally real: alert fires → human is notified → report delivered within
   24h. The fallback is a safety valve, not a dead end.

> Discipline (unchanged): audit-first, one change at a time, diff after each, stop at each [GATE].
> Do-not-touch unless explicitly lifted: MC engine math / wealth floor, accent encoding, the
> validated 20-profile data, and any pre-existing WIP (`planner_v3.html`, `app/wizard/*`,
> `lib/quiz-translator-*`, `lib/ai-prompt-360.ts`, the `docs/PLANNER-*` files).

---

## 0. Where we are (baseline)

- **Ship gate exists** in the lab (`run-pipeline.mjs` + 17 `review/reviewers/*` + arbiter) coupled to
  the `report-pdf.js` renderer. Repaired this session (section detection, contract).
- **Thin prod gate exists** (`lib/report-ship-gate.ts`, Phase 2) — renderer-agnostic, wired
  fail-open into the webhook (Bilan 360) + regenerate (Expert), with a `needs-attention` fallback.
- **Two prod renderers** that the rich auditors do NOT cover: `report-html-360.js`,
  `report-html-expert.js`. The lab gate ≠ the prod gate today.
- **Known defect classes already fixed + checked:** empty section, stale-vs-MC, fabricated numbers
  (provenance), AMF stems, meltdown FR jargon, empty greeting, methodology drift, EN currency,
  double-`$`, polish/glossary false-positive.
- **Gap:** only 5 personas exercised; AI failures fall to the placeholder (no auto-repair in prod);
  the prod gate is thinner than the lab gate.

---

## Phase A — Error spec + gate parity (make "error" precise and enforced everywhere)

**Goal:** one authoritative, renderer-agnostic definition of "shippable", enforced identically on
the lab path AND both prod paths.

A1. **Write the error spec** (`report-ship-contract`): the canonical list of fail classes, each with
   a detector and severity. Seed from what we know:
   - structural: empty/missing mandatory section, empty greeting, unsubstituted/empty placeholder,
     `undefined`/`NaN`, negative wealth in millions, broken chart (no data), duplicate IDs.
   - numeric: AI number not traceable to engine (provenance), methodology↔engine drift, KPI↔section
     reconciliation, GIS plausibility, success-rate consistency across sections.
   - compliance: AMF stems (optimis*/plan d'action/prescriptive), FR jargon (meltdown), filler.
   - locale: FR/EN word leak, currency convention (EN prefix / FR suffix), double-`$`, number format.
   - tone: positive language on a fragile band, methodology tense.
A2. **Promote the thin prod gate to the full spec.** Decide the mechanism (the §E options from
   AUDIT.md — recommend **data-level + HTML-level hybrid**: numeric/compliance checks on the
   `extractReportData360`/`Expert` payload, structural/locale checks on the rendered HTML). Make the
   detectors a single shared module both lab and prod import. **[GATE — architecture sign-off]**
A3. **Reconcile lab vs prod renderers** for the structural checks (section ids differ between
   `report-pdf.js` and `report-html-360.js`); either map ids per renderer or assert on content.
   **Exit:** the same profile gets the same verdict regardless of path.

**Deliverable:** shared `report-ship-contract` module + parity test (same profile → same verdict on
lab and prod). **Exit criteria:** every class in A1 has a detector; thin gate replaced by the full
spec on both prod paths.

---

## Phase B — Corpus harness (quantify the gap)

**Goal:** measure how far from 100% we are and enumerate every failure class, on a corpus that looks
like real customers.

B1. **Corpus generator** — programmatically build wizard-answer profiles across the input space:
   - province (QC/ON/AB/BC/…), couple × single, phase (accum/transition/decum),
   - success band (0% … 100% — force coverage of the tails),
   - archetypes (CCPC, rental ×1–2, DB pension, debt, RESP/kids, renter, homeowner-sell, late-start,
     HNW, GIS-eligible, widow/divorce),
   - literacy × stress × detail combos, both languages,
   - edge values (age 18/95, retAge=age, 0 savings, huge savings, 0 income, mortgage > assets).
   Run each through the **real `translateBilan360`** so params are production-faithful. Target ≥300.
B2. **Batch run** through MC → narrate → gate (reuse `BF_REALAI_BASE` + a `--corpus` mode).
   - Narration at scale: the API in prod; for the lab, a fixed-seed deterministic narrator or a
     capped subagent fan-out (cost-bounded).
B3. **Report**: pass rate, and **every distinct failure class** bucketed (structural vs AI vs
   compliance vs locale), with example profiles. This is the backlog.

**Deliverable:** `corpus/` generator + a `corpus-report.json` (pass% + failure classes).
**Exit criteria:** a measured baseline pass rate and a complete, deduped failure-class list.

---

## Phase C — Auto-repair loop in production (make AI failures self-heal)

**Goal:** a gate failure that is AI-narration-class is fixed at runtime so the customer gets a real
report, not a placeholder.

C1. **Classify each fail** as `ai_regenerable` vs `structural` (the spec from A1 tags this).
C2. **Webhook + regenerate loop:** render → gate → if AI-class fails, regenerate ONLY the flagged
   slots (targeted re-prompt with the canonical values + the specific rule violated) → re-render →
   re-gate, up to **N=2** attempts → ship if clean. **[GATE — confirm N, latency budget, cost]**
C3. **Fallback only for structural** (un-repairable at runtime) → `needs-attention` + an alert/ticket
   so the structural bug gets a code fix (Phase D). Never ship a broken report.
C4. **Idempotency/latency:** the webhook has a 120s budget; measure regen cost; consider deferring a
   2nd attempt to an async job if it risks the budget.

**Deliverable:** auto-repair wired into both prod paths (fail-open preserved). **Exit criteria:** on
the corpus, AI-class failures resolve within N attempts → real report; structural-class → fallback +
logged.

---

## Phase D — Kill the structural classes (drive the corpus to 100%)

**Goal:** every structural/template failure class the corpus surfaces gets a one-time code fix +
gate check (the exact pattern we used for greeting/methodology/currency).

D1. Triage the Phase-B backlog by class and frequency.
D2. **Batch-fix** each structural class at the source (renderer/formatter/prompt-builder), add/verify
   its gate check, re-run the corpus. One class per change, diff each. **[GATE per batch]**
D3. Repeat until the corpus pass rate (with auto-repair on) = **100%**.

**Deliverable:** structural failure classes → 0 on the corpus. **Exit criteria:** corpus 100%; each
class has source-fix + check.

---

## Phase E — Lock it: CI, monitoring, regression

E1. **CI gate:** the corpus run becomes a CI check — a PR that introduces a new failure class fails
   CI. (Bounded subset for speed + nightly full run.)
E2. **Prod telemetry:** log every gate verdict, fail class, regen attempts, and `needs-attention`
   served. Dashboard + alert when `needs-attention` rate > threshold (= a new class in the wild).
E3. **Feedback loop:** any prod `needs-attention` → add that profile shape to the corpus → fix →
   re-lock. The corpus grows with reality.

**Deliverable:** CI corpus gate + prod monitoring + alerting. **Exit criteria:** the 3 "definition of
done" metrics are met and continuously enforced.

---

## Sequencing & milestones

| Milestone | Phases | Result |
|---|---|---|
| M1 — Measured baseline | B | We know the real pass% and the full failure-class list |
| M2 — Gate parity | A | Same comprehensive gate on lab + both prod paths |
| M3 — Self-healing prod | C | AI failures → real report at runtime; only structural → fallback |
| M4 — Corpus 100% | D | Every structural class fixed + checked; corpus passes 100% |
| M5 — Locked | E | CI + monitoring prevent regression; metrics enforced |

Recommended order to start: **B (measure) → A (parity) → C (auto-repair) → D (fix to 100%) → E
(lock)**. B first because it converts "we think it's ~80%" into a number and a concrete backlog.

---

## Risks / watch-items

- **Cost & latency of auto-repair** in the live webhook (regen = extra API calls within 120s). Bound
  attempts; consider async for attempt #2.
- **Renderer divergence** (lab `report-pdf.js` vs prod `report-html-360/expert`): a class fixed in one
  renderer can still ship in the other. Parity (A3) + per-renderer corpus coverage mitigate.
- **Gate over-strictness** can wrongly hold good reports (we hit this twice: glossary polish, broad
  double-`$`). Every new check must be validated against the passing corpus to confirm zero
  false-positives before it becomes a blocker.
- **Narration nondeterminism**: the same profile can fail differently across runs. Treat the corpus
  pass% as a distribution; require a margin (e.g., 100% across K seeded runs).
- **Out of scope here:** the deeper engine correctness and the prod-prompt parity items already
  tracked elsewhere; this plan is about *shipping integrity*, not MC accuracy.

---

## What "100%" will actually mean when we're done

- Corpus (≥300, both langs, full archetype/edge coverage): **100% ship a real report** (auto-repair
  resolves AI issues; structural classes are all fixed).
- Production: a customer **never** receives a broken report; `needs-attention` is rare (<0.5%) and
  every occurrence is alerted + folded back into the corpus.
- Enforced by CI + monitoring so it stays at 100%.
