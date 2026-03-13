# CLAUDE.md - BuildFi (buildfi.ca)

## What is this project?
BuildFi is a bilingual (FR/EN) Canadian retirement planning SaaS using Monte Carlo simulation and AI narration to generate actionable retirement reports.

## Canonical Product Vision (2026-03-13)
This is the current source of truth.

| Product | Internal key(s) | Price | Couple | Properties | Purpose |
|---|---|---|---|---|---|
| Bilan | `essentiel` | 9.99 CAD | No | Primary only | Quick report for simple single profiles (~33 fields). |
| Bilan 360 | `bilan360` (routes to accum/transition/decum) | 19.99 CAD | Full modeling | Primary + 2 rentals | Adaptive report with 3 life phases, Opus AI, full couple. |
| Laboratoire | `expert` | 49.99 CAD + 29.99/yr renewal | Full | Unlimited | Interactive simulator 190+ params + AI report credits. |

**No Bilan Annuel.** The free product concept is dropped.

## Product Rules
- Bilan $9.99 is the entry-level product for simple profiles. Stands on its own quality.
- Bilan 360 $19.99 replaces Inter ($59) and Decum ($59) — price DROP, quality UP.
- Bilan 360 uses ONE adaptive quiz with 3 life phases (accum/transition/decum).
- Couple is FULLY modeled in Bilan 360 (explicit fields, no heuristics).
- No mandatory upsell ladder. Each product solves a distinct need.
- AI narration (Opus 4.6) is a core differentiator, not a cosmetic add-on.
- Architecture details: `docs/ARCH-BILAN-360.md` (10 architecture decisions).

## Current Execution Priority
1. ~~Make Bilan (9.99) report quality excellent.~~ DONE (v7 shipped 2026-03-13)
2. **Build Bilan 360 adaptive report** (quiz + translator + renderer + AI prompts).
3. Upgrade Laboratoire (simulator + AI report system).
4. Website/copy adjustments after product quality is locked.

## Internal Naming Constraint
Internal identifiers:
- `essentiel` — Bilan $9.99 (unchanged)
- `bilan360` — Bilan 360 $19.99 (NEW — replaces intermediaire + decaissement)
- `expert` — Laboratoire $49.99 (unchanged)

Legacy `intermediaire` and `decaissement` keys remain in old code but are deprecated for new work.

## Pipelines

### Bilan (9.99)
`quiz-essentiel` -> `/api/checkout` (`type=essentiel`) -> Stripe -> `/api/webhook` -> translator -> MC(5000) -> renderer -> Blob -> Resend

### Bilan 360 (19.99)
Single adaptive quiz determines life phase:
- `retAge - age <= 0` or already retired -> DECUMULATION
- `retAge - age <= 7 AND age >= 52` -> TRANSITION
- else -> ACCUMULATION

Flow:
`quiz-360` -> `/api/checkout` (`type=bilan360`, `phase=accum|transition|decum`) -> Stripe -> `/api/webhook` -> translator-360 -> MC(5000+extras) -> renderer-360 -> Blob -> Resend

### Laboratoire (49.99)
`quiz-expert` -> `/api/checkout` (`type=expert`) -> Stripe -> webhook -> KV profile + magic link -> simulator -> AI report exports (quota)

## Report Quality Contract (all products)
Every report must remain coherent across products for formatting, presentation, and reading experience:
- Shared typography, spacing rhythm, and visual hierarchy.
- Shared number formatting (currency, percent, dates, labels).
- Shared chart semantics (same percentile naming and legend logic).
- Shared section framing (decision card, analysis, scenarios, assumptions, methodology).
- Shared AI tone constraints (AMF-safe, observational, conditional tense).
- Shared fallback behavior when AI fails (no broken sections, no empty slots).

Details and checklist: `docs/TECH-REFERENCE.md`.

## Documentation Guide
Read in this order before making product decisions:
1. `docs/ARCH-BILAN-360.md` (architecture decisions for Bilan 360 — 10 DAs)
2. `docs/STATUS.md` (current phase + active priorities)
3. `docs/TECH-REFERENCE.md` (technical standards + report consistency + v7 reference)
4. `docs/PLAN-PIVOT.md` (execution plan — partially superseded by ARCH-BILAN-360)
5. `docs/ARCHITECTURE.md` (dependencies and routing)
6. `docs/SERVICES.md` (Stripe/env/email/deployment constraints)
7. `docs/STRATEGY.md` (positioning, pricing rationale, competition)

## Critical Rules - Read Before Every Task

### Golden Rule
Never remove, simplify, or downgrade validated behavior without explicit written approval.

### AMF/OSFI Compliance
- Use conditional language for projections (pourrait/serait, could/would/might).
- Use observational framing, never prescriptive advice.
- Forbidden style: should/devriez/recommandons/il faut/plan d'action style directives.

### Engineering Rules
- `planner.html` remains engine source of truth; mirror critical engine fixes in `lib/engine/index.js`.
- Reports must render with static fallback if AI is unavailable.
- Keep API keys server-side only (Vercel env vars).
- Webhook URLs must use `https://www.buildfi.ca`.

## Open Pricing Decisions (to finalize)
- Laboratoire renewal: 19.99 CAD/year OR 24.99 CAD/year.
- Included AI report quota for Laboratoire: 5-10/year final value to lock.

Until final decision is made:
- Keep code paths configurable.
- Do not hardcode irreversible limits in UX copy.
