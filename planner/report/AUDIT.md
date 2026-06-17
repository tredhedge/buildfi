# Render-path / ship-gate audit (2026-06-16)

**Goal:** guarantee that (a) dev/persona builds **and** (b) the live client path pass through the
full audited pipeline (post-processors + 6 passes + ship gate), never the raw `buildReport` shortcut.

**Status:** PHASE 0 — audit only, no code changed. STOP for review before any wiring change.

> Line numbers reflect the working tree at audit time. `:NN` = file line.

---

## A. The two LAB render paths (realai)

### A.1 DRAFT / raw path — `realai/build-realai-reports.js` (branch `render`)
- `:233` `amfSanitize.sanitizeAiObject(responseJson)` (AMF soften/drop — added this session)
- `:239` `buildReport(data)` (renders via `report-pdf.js`)
- `:256` `_dedupIds(...)` (duplicate-id post-process)
- `:275` `fs.writeFileSync(<DATA_DIR>/output/<id>.html)` — **writes final HTML here**
- **Runs:** sanitize + render + dedup only.
- **Does NOT run:** any reviewer auditor, fix-plan/correction pass, re-audit, or **ship gate**.
- MC + `mc-enrich` happen upstream in `gen-real-mc.mjs:151` (`enrichMC`), so enrichment IS present;
  everything in the audit/gate layer is absent.

### A.2 PROD-PATTERN path — `realai/run-pipeline.mjs` (6 passes)
- `:188` Pass 1 DRAFT `buildReport(data1)`
- `:197` Pass 2 `reviewOrch.runAuditors(pack)` (the 17 `review/reviewers/*` auditors)
- `:206` Pass 3 `corrector.applyFixPlan(...)`
- `:209` Pass 4 CORRECTED `buildReport(data2)`
- `:215` Pass 5 re-audit `reviewOrch.runAuditors(pack2)`
- `:254-258` Pass 6 **ship gate** — `if (arbResult2.can_ship && !data2._dataBlocked)`
- `:259` write `final/<id>.html` **only when can_ship**
- `:263` else write `review/<id>.fail.json` (+ `responses-todo/` regen queue)
- This is the intended gated path. A 0%-success / data-blocked plan lands in `fail.json`, never `final/`.

### A.3 `realai/matrix-render.mjs:81` — per-variant fan-out, also calls `buildReport` directly (draft-class, no gate). Lower priority (matrix testing tool).

**What actually shipped this session:** the 20 re-renders and the 5 personas used **A.1 (draft)**,
not A.2. `number-provenance.mjs` + `qa-check.mjs` were then run **manually** as external gates — real,
but NOT the run-pipeline auditors/ship gate. The low-success personas (maxime 23%, **gagnon 0%**)
would very likely have been routed to `fail.json` by A.2's ship gate.

---

## B. The PRODUCTION client paths (live, customer-triggered)

> **Key structural finding:** production renders with **different renderers** than the lab.
> The audited pipeline (run-pipeline + `review/reviewers/*`) is built around `report-pdf.js`
> (`buildReport`). Production never calls `buildReport`. So prod cannot simply be "repointed" at
> run-pipeline — the auditors parse `report-pdf.js` HTML structure (`sec-*` ids), not the prod HTML.

| # | Trigger | File | Renderer | Sanitize? | Auditors / provenance / qa / **ship gate**? |
|---|---|---|---|---|---|
| B.1 | Stripe success → **Bilan 360** | `app/api/webhook/route.ts` | `renderReportHTML360` (`lib/report-html-360.js`) | ✅ `sanitizeAISlots360` `:339` | ❌ none — ships unconditionally |
| B.2 | Stripe success → **Expert/Planner** initial | `app/api/webhook/route.ts` | `renderReportHTMLExpert` (`lib/report-html-expert.js`) `:~520` | ✅ `sanitizeAISlotsExpert` | ❌ none |
| B.3 | **Regenerate** (Planner credit, magic-link) | `app/api/regenerate-report/route.ts` | `renderReportHTMLExpert` `:156` | ✅ `sanitizeAISlotsExpert` `:149` | ❌ none |
| B.4 | Legacy in-browser planner export | `planner/report/report-export-service.js:58` (loaded by `planner_v3.html:827`) | `window.buildReport` (`report-pdf.js`) | ❌ (client-side) | ❌ none |
| — | Live simulator data feed | `app/api/simulate/route.ts:99→133` | none — returns **MC JSON only**, no report HTML | n/a | n/a (not a report path) |

### B.1 Bilan 360 webhook — exact flow
`:257` `determinePhase` → `:268` `runMC(params, 5000)` → `:292-321` melt/claim/stress extra runs →
`:327` `extractReportData360` → `:339` `callAnthropic(..., sanitizeAISlots360, ...)` →
`:345` static fallback on AI fail → `:361` `renderReportHTML360(...)` → `:366` `put()` (Blob) →
`:378-391` email + return `reportUrl`.
**No auditors, no provenance, no qa-check, no ship gate.** Whatever `renderReportHTML360` produces
is uploaded and emailed.

**Accuracy of the existing comment:** `build-realai-reports.js`'s amfSanitize comment says it
"mirrors the production webhook path." That is true **only for the sanitize step** (`sanitizeAISlots360`
at `:339`). It is NOT true for auditors / ship gate — neither path has them in prod.

---

## C. Post-processor inventory & intended order

| Script | Purpose (from header) | Wired where |
|---|---|---|
| `mc-enrich.mjs` | cashflow / drawTrace / estateWaterfall / goalsLedger / allocation | **wired** — `gen-real-mc.mjs:151` |
| `review/reviewers/*` (17) + `correction-pass` + `arbiter` | the audit + fix + ship gate | **wired** — `run-pipeline.mjs` only |
| `number-provenance.mjs` | every AI numeral must trace to DATA + AMF stem + locale | **standalone CI gate** (manual) |
| `qa-check.mjs` | empty slots / leaks / recovery-path / freshness / section presence | **standalone CI gate** (manual) |
| `sync-stale-metrics.mjs` | patch specific stale success/coverage numbers in cached responses | **manual one-off** (2026-05-15 audit) — not wired |
| `fix-en-currency.mjs` | EN prose `480K$` → `$480K` in cached responses | **manual one-off** — not wired |
| `inject-recovery-arc.mjs` | inject Phase 1-4 sequence into low-grade `stress_interpretation` | **manual one-off** — not wired |

Note: the 3 one-off patchers operated on *cached* responses from the 2026-05-15 era. This session
**re-narrated** all responses fresh, so their specific corrections are largely moot now (EN currency,
stale metrics, recovery arc are all handled by the fresh narration + `qa-check`/`provenance` passing).
`number-provenance` + `qa-check` are NOT called by `run-pipeline`; run-pipeline relies on the
`review/reviewers/*` framework (which overlaps them — e.g. `data-auditor`, `canonical-quote-auditor`,
`scope-reconciliation-auditor` cover number provenance; `language-auditor`, `depth-auditor` cover
leaks/empty sections).

---

## D. GAPS where a client (or dev build) can receive ungated output

| Gap | Where | Risk | Minimal fix proposal |
|---|---|---|---|
| **G1** Personas/dev render via draft path | `bilan360-personas/build-profiles.mjs` instructions + `build-realai-reports.js render` | Dev/persona reports skip auditors + ship gate (this is what shipped) | **Phase 1:** repoint personas to `run-pipeline.mjs` (keep `BF_REALAI_BASE`); low-success personas land in `fail.json` as intended. |
| **G2** Bilan 360 live path ungated | `app/api/webhook/route.ts:361` | A paying client's report (incl. 0%-success / implausible draft) is rendered + emailed with no ship gate | **Phase 2 (PRIORITY):** insert an audit+gate step between `:339` narration and `:361` render/`:366` upload. Needs a 360-renderer-aware gate (see §E). |
| **G3** Expert/Planner initial + regenerate ungated | `webhook :~520`, `regenerate-report:156` | Same as G2 for the expert renderer | **Phase 2:** same gate, expert-renderer-aware. |
| **G4** Legacy planner_v3 in-browser export ungated | `report-export-service.js:58` (`planner_v3.html`) | Client-side export bypasses any server gate | Likely retire with planner_v3 (FE/BE split Phase 4); otherwise gate server-side. Confirm scope before acting. |

---

## E. The blocker for "wire prod through the same gate" (decision needed in Phase 2)

The run-pipeline ship gate is **renderer-coupled to `report-pdf.js`** (the auditors read its `sec-*`
structure; note the pre-existing `empty_section` false-negatives observed earlier are themselves a
symptom of auditor/renderer coupling). Production renders with `report-html-360.js` /
`report-html-expert.js`. So three options exist (Phase 2 will present, not choose):

- **E-opt-1 — Port a thin gate to prod renderers:** run a renderer-agnostic subset of checks
  (provenance + plausibility/ship verdict) on the 360/expert HTML+data before upload; on fail, take a
  defined fallback (see §F). Smallest blast radius; does not reuse the 17 auditors as-is.
- **E-opt-2 — Pre-render data-level gate:** gate on the `extractReportData360` payload (numbers,
  success-rate plausibility, data-blocked) BEFORE rendering, shared by lab + prod. Cleanest single
  source; requires factoring the gate out of run-pipeline.
- **E-opt-3 — Unify renderers:** prod adopts `report-pdf.js` so the existing run-pipeline gate applies
  directly. Largest change; out of scope for a wiring session.

---

## F. CRITICAL Phase-2 question (needs your decision)

**What does a PAYING client see when their plan FAILS the ship gate?** A 0%-success plan must never
email a raw draft showing `-3.4M` / "Data insufficient". Options (do not choose yet):
1. Render a defined **"plan needs attention"** report variant (honest, AMF-safe, no broken figures).
2. Hold the report + notify (email "we're finalizing your report" / support touch).
3. Always render but **suppress** the broken sections via the fix-plan (what run-pipeline Pass 3 does).
This is the core of G2/G3 and must be decided before wiring the live path.

---

## G. DO-NOT-TOUCH this session (per instruction)
MC engine / wealth floor · AI narration text · `[[CLIENT_NAME]]`/`[[SPOUSE_NAME]]` substitution ·
accent encoding in `buildReport` · report CSS/template · the 20 validation profiles' data.

---

## Proposed sequence (await confirmation)
1. **[GATE]** Review this audit.
2. **Phase 1:** G1 — repoint personas to `run-pipeline.mjs` (one diff), re-run 5, confirm
   maxime+gagnon → `fail.json`, other 3 → `final/`.
3. **Phase 2:** G2/G3 — pick an option from §E + a failure-UX from §F, then wire the live path
   (one diff each, gated).

---

## H. PHASE 1 RESULTS (done — dev/persona path now gated)

Changes (all auditor-side except the one approved template string):
- `run-pipeline.mjs` — `BF_REALAI_BASE` data-dir override (personas run through the gated path).
- `review/review-pack-builder.js` — widened the section extractor (pattern C: `<div id="sec-…">`).
  Fixed the dominant FALSE `empty_section` blocker that was rejecting every report.
- `review/review-contract.js` — `sec-assessment` + `sec-signature` → `mandatory:false` (content
  consolidated into sec-letter / the cover; renderer no longer emits those anchors).
- `report-pdf.js` (approved) — 2 FR strings `(meltdown)` → `décaissement anticipé`, matching the rest
  of the FR template + the language-auditor/Codex rule. `qa-check.mjs` aligned (meltdown now banned
  in FR). EN keeps "meltdown" (not gate-blocked).
- `bilan360-personas/build-profiles.mjs` — personas `mode:'expert'` (Risk section renders).
- `build-realai-reports.js render` — loud **DRAFT, not ship-gated** guardrail banner (G1 recurrence).

**Proof the gate works now:** 3/3 EN profiles from the 20-set SHIP to `final/`
(low_income_gis, early_retiree, high_rrsp). Personas: **walsh (87%) + okafor (96%) SHIP**; the
3 FR personas stay in `fail.json`.

**Remaining persona blockers are TEMPLATE-quality issues the gate correctly catches** (not narration,
not in this session's scope — logged for a scoped template-polish pass):
- `polish` — the template repeats "des simulations Monte Carlo terminent sous…" ×3 (blocks bouchard,
  maxime). Renderer-side.
- `trust_gate` — the recovery-arc block emits "Phase N" labels, which the trust-gate treats as internal
  jargon (blocks gagnon). Renderer-side.
- gagnon also has genuine narration drift (`thesis_band_drift`, `canonical_quote_drift`) — appropriate
  for a 0% plan.

**Note on "0% must fail":** the ship gate enforces QUALITY/COMPLIANCE, not success level. A clean,
honest 0%/low-success report WOULD ship (its job is to tell the client the plan is fragile). Whether a
low-success plan should instead be HELD / shown a "needs attention" variant is the §F decision below.

The 20-set re-rendered green (provenance ✓, qa-check ✓) after all changes.

---

## I. PHASE 2 RESULTS (done — live client path now gated)

Decision: §E = **thin renderer-agnostic pre-upload gate** (owner: assistant); §F = **honest
"needs attention" report** on failure.

- New `lib/report-ship-gate.ts` — pure, tested module:
  - `evaluateReportShip(html, lang, {coreInvalid})` → high-confidence checks on the FINAL HTML:
    empty/tiny render, `Data insufficient`/`undefined`/`NaN`, unsubstituted `[[…]]` placeholders,
    negative-millions displayed, AMF banned stems (optimis*/optimiz*/plan d'action), FR "meltdown".
  - `renderNeedsAttentionHTML({firstName, lang})` → branded, AMF-safe, figure-free FR/EN page.
  - Verified: real shipped report → ok; each broken case → flagged; needs-attention page is clean.
- Wired into the two client paths, **fail-open** (a gate bug must never block delivery):
  - `app/api/webhook/route.ts` (Bilan 360, Stripe success) — gate between render and Blob upload.
  - `app/api/regenerate-report/route.ts` (Expert/Planner regenerate) — same.
- TS: zero direct errors in the new module + both routes (the `.next/types/validator.ts` warnings are
  pre-existing Next type-gen artifacts; no new route exports added).

**Known follow-ups (not done this session):**
- The confirmation EMAIL still references grade/successPct even when the needs-attention variant is
  served — the linked page is honest, but the email subject can over-promise. Refine the email branch.
- The webhook is a live Stripe-payment path; the gate is unit-tested + fail-open, but should be
  exercised in STAGING (real webhook event) before relying on it.
- The legacy in-browser export (`report-export-service.js` via `planner_v3.html`, G4) is still
  ungated — expected to retire with planner_v3 (FE/BE split Phase 4).
- Template-quality pass (the §H "polish"/"Phase N" renderer findings) to let the FR personas ship.
