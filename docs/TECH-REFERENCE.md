# TECH-REFERENCE.md
> Technical standards, architecture constraints, QA rules, AMF-safe writing.
> Mis a jour: 2026-03-12 - v20 (realigned)

---

## 1. Core Engine Rules
- `planner.html` is still the engine source of truth.
- If a core engine bug is fixed, mirror it in `lib/engine/index.js`.
- Keep MC execution server-side for paid reports.

## 2. Canonical Product Pipelines

### Bilan (9.99)
`quiz-essentiel` -> checkout -> webhook -> translator -> MC(5000) -> renderer -> Blob -> email

### Bilan 360 (19.99)
Routing question ->
- accumulation stream: intermediaire pipeline
- decumulation stream: decaissement pipeline

Both streams must share Bilan 360 identity and quality standards.

### Laboratoire (49.99)
`quiz-expert` -> checkout -> webhook -> KV profile/magic link -> simulator -> AI export pipeline

## 3. AI Narration Standard (mandatory)
AI text is product value, not filler.

Requirements:
- Data-grounded output only (numbers and context from current report payload).
- No generic claims detached from user profile.
- Clear "what this means" explanations, not just observations.
- AMF-safe language in FR and EN.
- Deterministic fallback content must preserve section quality if AI fails.

## 4. Report Consistency Contract (mandatory)
All reports (Bilan, Bilan 360 accum, Bilan 360 decum, Lab exports) must stay coherent.

### 4.1 Formatting parity
- Same currency conventions per locale.
- Same percentage formatting (rounded policy and symbols).
- Same date/age formatting conventions.
- Same naming conventions for metrics and labels.

### 4.2 Presentation parity
- Shared visual hierarchy (title, section headings, cards, callouts).
- Shared typography system and spacing rhythm.
- Shared chart legend grammar and percentile naming.
- Shared treatment for warnings/assumptions/disclaimers.

### 4.3 Structural parity
Each report follows compatible flow:
1. Decision summary
2. Core diagnostics
3. Scenario or stress analysis
4. Assumptions and methodology
5. Closing interpretation

### 4.4 Narrative parity
- Same tone baseline (clear, calm, factual).
- Same AMF-safe policy (observational + conditional tense).
- Same anti-jargon posture unless term is explained.

### 4.5 Failure-mode parity
If AI is unavailable:
- No empty blocks.
- No broken layout.
- No loss of key decision guidance.

## 5. Shared Implementation Anchors
Use shared helpers whenever possible:
- `lib/report-shared.ts` for formatting and grade utilities
- `lib/display-utils.ts` for normalized display output
- shared CSS tokens where applicable

Any divergence must be justified and documented.

## 6. QA Checklist (ship blocker)
Before shipping any report change:
- Data checks pass on representative profiles.
- AI-on and AI-off outputs are both acceptable.
- FR/EN parity is verified.
- AMF forbidden wording check passes.
- Visual consistency check passes against other report types.

## 7. Current Focus
Active focus is Bilan report quality first.
Then Bilan 360 routing/questionnaire merge.
Then Laboratoire upgrades.

## 8. Open Product Config Decisions
- Lab renewal final price: 19.99 or 24.99.
- Lab AI quota final value: 5 to 10.

Keep implementation configurable until final product decision is locked.
