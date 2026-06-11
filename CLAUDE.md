# CLAUDE.md - BuildFi (buildfi.ca)

## What is this project?
BuildFi is a bilingual (FR/EN) Canadian retirement planning SaaS using Monte Carlo simulation and AI narration (Anthropic Opus) to generate observational, AMF-safe retirement reports.

## Canonical Product Vision (2026-04-22 — supersedes the 2026-03-13 3-SKU model)
This is the current source of truth. The earlier 3-SKU taxonomy (Bilan $9.99 /
Bilan 360 $19.99 / Laboratoire $49.99) is **retired**. The product is now **2 SKUs**.

| Product | Tier key | Price (CAD) | Account | What |
|---|---|---|---|---|
| **Bilan 360** | `bilan360` | **$29.99** one-time | Anonymous OK (email = identity) | One AI-narrated retirement report. Wizard (~20–40 adaptive Qs) → MC 5000 → Opus narration → HTML in Blob → email. |
| **Planner** | `planner` | **$69.99** one-time | Account required (magic link) | Live simulator (~190 params, 5000 MC) + **5 AI report credits**. |

Add-ons:

| Add-on | Key | Price | What |
|---|---|---|---|
| Report top-up | `report-pack` | $19.99 | +4 AI credits for existing Planner customers |
| Second Bilan | `second` | $14.99 | 50% off a second Bilan 360 via `SECOND50` coupon |
| Legacy addon | `addon` | $14.99 | Backward-compat only, not promoted |

## Product Rules
- **No quiz pages.** Bilan 360 is driven by a **Wizard** (`app/wizard/page.tsx`):
  Mode 1 classifier → Mode 2 personalized. Draft persisted in KV `wizard:{sessionId}`
  (90-day TTL).
- Bilan 360 is anonymous-friendly (email is the identity). Planner requires an account.
- Couple is FULLY modeled (explicit fields, no heuristics).
- AI narration (Opus) is a core differentiator, not a cosmetic add-on. Every AI
  response runs server-side through `softenAISlot` + `FORBIDDEN_TERMS` (AMF sanitizer).
- AI credits: 5 granted at Planner purchase, no auto-refresh, server-canonical counter.
- **Single source of live prices**: `public/index.html` translation tables. Never
  hardcode prices elsewhere.

## Internal Naming / Legacy Aliases
Normalized in `normalizeTier()`. Do **not** sweep-delete legacy keys — retire them as touched:
- `essentiel`, `intermediaire`, `decaissement` → **`bilan360`**
- `bilan360plus`, `expert` → **`planner`**

## Active Workstream: FE/BE Split (locked 2026-05-01)
Doc: `docs/ARCH-FE-BE-SPLIT.md`. Move engine + AI + render off the browser.
- **Engine canonical**: `lib/engine/index.js` (~2716 lines). `/api/simulate` uses it.
- `planner/planner_v3.html` inline engine = **LEGACY**, scheduled for Phase 4 deletion
  (blocked on user verification of `/simulateur` + `/wizard` E2E).
- Critical fiscal constants mirrored in `lib/constants/fiscal-2026.ts`.

## Pipelines

### Bilan 360 ($29.99)
```
app/wizard/page.tsx → POST /api/checkout {type:"bilan360"} → Stripe → POST /api/webhook
  → translator-360 → MC 5000 → AI narrate (Opus) → report-html-360 → Blob → Resend
```
Phase routing in the Wizard / translator:
- `retAge - age <= 0` or already retired → DECUMULATION
- `retAge - age <= 7 AND age >= 52` → TRANSITION
- else → ACCUMULATION

### Planner ($69.99)
```
app/acheter-planner → /api/checkout {type:"planner"} → Stripe → webhook
  → KV expert profile + magic-link token → /expert?token=...
  → app/expert/page.tsx hosts iframe planner_v3 (legacy) OR app/simulateur/page.tsx (new)
  → /api/simulate (5000 paths) | /api/regenerate-report (decrements aiCredits)
```
PostMessage bridge: `docs/PLANNER-FE-BE-CONTRACT.md`.

### Offline report lab (`planner/report/realai/`)
20-persona pipeline used to design and validate report + AI narration quality
before it ships to production: profile → MC → Claude narration → render HTML →
`qa-check.mjs` gate → `review/` findings → `responses-todo/` → `ai-regen.mjs`.
Deterministic fallbacks ship for any drifted slot.

## Report Quality Contract (both products)
Every report must remain coherent across products:
- Shared typography, spacing rhythm, and visual hierarchy.
- Shared number formatting (currency, percent, dates, labels).
- Shared chart semantics (same percentile naming and legend logic).
- Shared section framing (decision card, analysis, scenarios, assumptions, methodology).
- Shared AI tone constraints (AMF-safe, observational, conditional tense).
- Shared fallback behavior when AI fails (no broken sections, no empty slots).

## Documentation Guide
Read in this order before making product decisions:
1. `docs/ARCH-FE-BE-SPLIT.md` (current active workstream)
2. `docs/PLANNER-FE-BE-CONTRACT.md` (iframe ↔ React ↔ API postMessage)
3. `docs/DESIGN-SYSTEM.md` (palette, typography, components, report consistency)
4. `docs/PLANNER-ENGINE-AUDIT-2026-04-24.md` (engine findings)
5. `docs/ENGINE-FULL-AUDIT-2026-04-14.md` (broader engine audit)
6. `docs/REPORT-AUDIT-10-EN-2026-04-15.md` (EN report polish)
7. `docs/LOI25-BREACH-RUNBOOK.md` (Quebec Loi 25 incident response)
8. `docs/PATH-B-BACKLOG.md` (deferred work)

> Note: `ARCH-BILAN-360.md`, `TECH-REFERENCE.md`, `ARCHITECTURE.md`,
> `SERVICES.md`, and `STRATEGY.md` were removed in the 2026-04-06 docs/wip
> cleanup (commit `1622722`) and no longer exist; recover from git history if
> needed. Treat this file (CLAUDE.md) as authoritative.

## Critical Rules - Read Before Every Task

### Golden Rule
Never remove, simplify, or downgrade validated behavior without explicit written approval.

### AMF/OSFI Compliance
- Use conditional language for projections (pourrait/serait, could/would/might).
- Use observational framing, never prescriptive advice.
- Forbidden style: should/devriez/recommandons/il faut/plan d'action style directives.

### Engineering Rules
- `lib/engine/index.js` is the engine source of truth; `planner_v3.html`'s inline
  engine is legacy. Mirror critical fiscal fixes in `lib/constants/fiscal-2026.ts`.
- Reports must render with static fallback if AI is unavailable.
- Keep API keys (Anthropic, Stripe, Resend) server-side only (Vercel env vars).
- Webhook + magic-link URLs must use `https://www.buildfi.ca`.
- New routes follow the `/api/v1/...` JSON contract pattern (ARCH-FE-BE-SPLIT §7);
  schemas in `lib/schemas/`.

## Known Drift / Cleanup Backlog (as of 2026-06-10)
- **Code still carries old $9.99/$19.99/$49.99 prices** in several `app/` files —
  pricing migration to $29.99/$69.99 is unfinished. Reconcile against
  `public/index.html` (single price source).
- `public/index.html` landing page still shows old 4-product promo pricing — update
  before any marketing push.
- `app/outils/bilan-annuel/` route + `bilan-annuel` lib still present though the
  product was dropped — retire or repurpose.
- `planner/planner_v3.html` deletion blocked on `/simulateur` + `/wizard` E2E verification.
