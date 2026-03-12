# CLAUDE.md - BuildFi (buildfi.ca)

## What is this project?
BuildFi is a bilingual (FR/EN) Canadian retirement planning SaaS using Monte Carlo simulation and AI narration to generate actionable retirement reports.

## Canonical Product Vision (2026-03-12)
This is the current source of truth.

| Product | Internal key(s) | Price | Purpose |
|---|---|---|---|
| Bilan | `essentiel` pipeline | 9.99 CAD one-time | Solid baseline report for simple profiles. |
| Bilan 360 | `intermediaire` (accumulation) OR `decaissement` (decumulation) | 19.99 CAD one-time | Full report with stream routing based on retirement phase. |
| Laboratoire | `expert` | 49.99 CAD one-time + annual renewal (19.99 or 24.99 TBD) | Advanced simulator + AI report credits (5 to 10, final quota TBD). |

## Product Rules
- No "free BA hub" strategy. Bilan normal is paid and must stand on its own quality.
- No mandatory upsell ladder between reports. Each product solves a distinct need.
- Bilan 360 merges former Bilan 360 + Horizon into one product with two streams.
- AI narration is a core differentiator, not a cosmetic add-on.

## Current Execution Priority
1. Make Bilan (9.99) report quality excellent.
2. Adjust questionnaire and routing for Bilan 360 (accumulation vs decumulation).
3. Upgrade Laboratoire (simulator + AI report system).
4. Website/copy adjustments after product quality is locked.

## Internal Naming Constraint
Internal identifiers remain unchanged for backward compatibility:
- `essentiel`
- `intermediaire`
- `decaissement`
- `expert`

Only customer-facing names/prices change.

## Pipelines

### Bilan (9.99)
`quiz-essentiel` -> `/api/checkout` (`type=essentiel`) -> Stripe -> `/api/webhook` -> translator -> MC(5000) -> renderer -> Blob -> Resend

### Bilan 360 (19.99)
Routing question first:
- Accumulation path -> intermediaire pipeline
- Decumulation path -> decaissement pipeline

Flow:
`quiz-routing` -> selected quiz -> `/api/checkout` (`type=bilan360`, `path=accum|decum`) -> Stripe -> webhook route to correct translator/renderer -> Blob -> Resend

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
1. `docs/PLAN-PIVOT.md` (execution plan aligned with current vision)
2. `docs/STATUS.md` (current phase + active priorities)
3. `docs/ARCHITECTURE.md` (dependencies and routing)
4. `docs/TECH-REFERENCE.md` (technical standards + report consistency)
5. `docs/SERVICES.md` (Stripe/env/email/deployment constraints)
6. `docs/STRATEGY.md` (positioning, pricing rationale, competition)

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
