# CLAUDE.md — BuildFi (buildfi.ca)

## What is this project?
BuildFi is a bilingual (FR/EN) Canadian retirement planning SaaS that uses Monte Carlo simulation to generate personalized financial reports. Three products: Bilan Annuel (FREE hub), Bilan Pro ($19.99 one-shot report), Laboratoire ($49.99 + $29.99/yr simulator). Anti-bullshit, anti-generic.

**PIVOT IN PROGRESS (March 2026)**: Migrating from 4 paid tiers to 3 products with a free hub. Master execution plan: docs/PLAN-PIVOT.md (177 tasks, 6 phases).

## Product Structure (post-pivot)
| Product | Internal key(s) | Price | What it is |
|---------|----------------|-------|------------|
| **Bilan Annuel** (BA) | `bilan_annuel` | FREE | Net worth tracker + 5-year deterministic projection + snapshots + evolution. Hub central. Client-side React. |
| **Bilan Pro** | `bilan_pro` → routes to `intermediaire` (accum) or `decaissement` (décaissement) | $19.99 one-shot | AI adaptive report. Routing question selects accum or décaissement path. Pré-rempli du BA. Outils dettes + allocation inclus. MC 5,000 sims. |
| **Laboratoire** | `expert` | $49.99 + $29.99/yr | Full simulator 190 params + BA inclus. Magic link auth. Tornado, backtesting, CPP/OAS optim, CCPC. |

**CRITICAL**: Internal identifiers (env vars, file names, function names, Stripe keys, type values) keep the OLD names (essentiel, intermediaire, decaissement, expert). Only customer-facing display text uses the NEW names.

### What was deprecated
| Old tier | Old price | What happened |
|----------|-----------|---------------|
| Bilan (essentiel) $29 | $29 | Replaced by BA gratuit |
| Bilan 360 (intermediaire) $59 | $59 | Absorbed into Bilan Pro accum path |
| Horizon (decaissement) $59 | $59 | Absorbed into Bilan Pro décaissement path |
| Laboratoire (expert) $129 | $129 | Repriced to $49.99 + $29.99/yr |

### The virtuous cycle
```
BA gratuit → "au-delà de 5 ans?" → Bilan Pro $19.99
                                        ↓
BA mis à jour → rachète Bilan Pro → données fraîches
                                        ↓
"et si je changeais X?" → Laboratoire $49.99
```

### Key Architectural Decisions (DA-01 to DA-06)
- **DA-01**: Bilan Pro = routing between existing Inter (accum) and Decum (décaissement) pipelines, NOT a new unified quiz
- **DA-02**: BA = Next.js page at app/outils/bilan-annuel/page.tsx (not static HTML)
- **DA-03**: BA → Bilan Pro bridge via localStorage → quiz pre-fill
- **DA-04**: BA → Laboratoire bridge via localStorage → KV profile seed at checkout
- **DA-05**: Outils (dettes + allocation) gated behind Bilan Pro — moved from static HTML to app/outils/ as Next.js pages with server-side auth
- **DA-06**: Internal keys unchanged — `bilan_pro` is NEW type in checkout, routes to `intermediaire` or `decaissement`
- Full details: docs/PLAN-PIVOT.md §DÉCISIONS ARCHITECTURALES

## Tech Stack
- **Framework**: Next.js 16 on Vercel (auto-deploy from main)
- **Payments**: Stripe Checkout (hosted), webhook at /api/webhook
- **Email**: Resend (buildfi.ca domain, VERIFIED, domain warmup needed)
- **Storage**: Vercel Blob (reports), Vercel KV (data/profiles)
- **MC Engine**: Custom Monte Carlo, 5000 sims, t-Student df=5, ~2.3s serverless
- **AI Narration**: Anthropic API claude-sonnet-4 (server-side ONLY, key in Vercel env vars)
- **Analytics**: PostHog

## Repository Structure
```
buildfi/
├── app/
│   ├── api/
│   │   ├── ai-narrate/route.ts    # Standalone AI narration test endpoint
│   │   ├── auth/verify/route.ts   # GET — token verification → profile summary
│   │   ├── auth/magic-link/route.ts # POST — send fresh magic link email
│   │   ├── checkout/route.ts      # Stripe checkout — handles bilan_pro routing + expert + addon
│   │   ├── referral/generate/route.ts # GET — referral link + stats
│   │   └── webhook/route.ts       # Stripe webhook → MC/Expert/addon/referral/renewal
│   ├── expert/                    # Laboratoire pages (simulateur, portail, landing)
│   ├── merci/                     # Post-purchase thank you page
│   ├── outils/
│   │   ├── bilan-annuel/page.tsx  # 🔨 BA hub (React, client-side, localStorage)
│   │   └── dettes/
│   │       ├── page.jsx           # Debt tool (1,863 lines, React JSX) — gated behind Bilan Pro
│   │       └── tests.js           # Inline tests
│   └── page.tsx                   # Redirect → landing
├── lib/
│   ├── ai-constants.ts            # AI slot names (Inter 16 + Decum 12), AMF forbidden terms, sanitization
│   ├── ai-profile.ts              # DerivedProfile + RenderPlan (behavioral signals, psych overrides)
│   ├── ai-prompt-inter.ts         # Bilan Pro Accum AI prompt (18 slots, DerivedProfile enrichment)
│   ├── ai-prompt-decum.ts         # Bilan Pro Décaissement AI prompt (12 slots, 9-combo voice, 4 arcs)
│   ├── ai-prompt-expert.ts        # Laboratoire AI prompt
│   ├── engine/index.js            # MC engine (2,426 lines, 38 exports)
│   ├── quiz-translator.ts         # Essentiel quiz answers → MC params (deprecated — was for old Bilan $29)
│   ├── quiz-translator-inter.ts   # Bilan Pro Accum: 85 fields → 120 MC params
│   ├── quiz-translator-decum.ts   # Bilan Pro Décaissement: continuous QPP factor, GK flexibility
│   ├── quiz-translator-expert.ts  # Laboratoire translator
│   ├── report-shared.ts           # Shared report helpers (grade, color, formatting, probTranslation)
│   ├── display-utils.ts           # Normalized display formatting helpers
│   ├── report-html.js             # Essentiel report v6 (deprecated — was for old Bilan $29)
│   ├── report-html-inter.js       # Bilan Pro Accum: 16-section report (imports report-shared)
│   ├── report-html-decum.js       # Bilan Pro Décaissement: 13-section report (imports report-shared)
│   ├── strategies-inter.ts        # 5-strategy comparison engine (500 sims each)
│   ├── email.ts                   # Resend email templates (table-based, bilingual, tier-aware)
│   ├── email-expert.ts            # Laboratoire emails: magic link + report delivery
│   ├── kv.ts                      # Upstash Redis — Laboratoire profiles, referrals, idempotency
│   ├── auth.ts                    # Token verification (query param + Bearer header)
│   ├── rate-limit.ts              # Sliding-window rate limiting (exports 20/day, recalcs 100/day)
│   └── pdf-generator.ts           # DISABLED (Puppeteer incompatible with serverless)
├── public/
│   ├── quiz-essentiel.html        # DEPRECATED — was for old Bilan $29 tier
│   ├── quiz-intermediaire.html    # Bilan Pro Accum quiz (to be adapted with routing question)
│   ├── quiz-expert.html           # Laboratoire quiz (1,323 lines)
│   ├── quiz-decaissement.html     # Bilan Pro Décaissement quiz (13 screens, validateStep)
│   ├── index.html                 # Landing page (to be rebuilt for 3-product structure)
│   ├── expert.html                # Laboratoire landing page
│   ├── planner-expert.html        # Laboratoire planner (source of truth for engine)
│   ├── outils/decaissement-simulateur.html  # Décaissement simulator (free, with CTA)
│   ├── logo.js                    # Shared SVG logo
│   ├── logo-dark.svg, logo-light.svg
│   └── robots.txt
├── tests/
│   ├── debt-tool-tests.js         # Debt tool test suite (200 tests)
│   ├── s1-infrastructure.test.ts  # S1 Laboratoire infra tests (29 tests)
│   ├── s3-api.test.ts             # S3 API simulate/optimize tests (103 tests)
│   ├── s10-audit.test.ts          # S10 full audit tests (91 tests)
│   ├── quiz-translator-expert.test.ts  # Laboratoire translator tests (87 tests)
│   ├── report-shared.test.ts      # Shared report helpers tests (91 tests)
│   └── fiscal-constants-sync.test.ts  # Engine vs fiscal-2026.ts sync (135 tests)
├── docs/                          # Project documentation
│   ├── PLAN-PIVOT.md              # ⭐ Master execution plan (156 tasks, 6 phases) — READ FIRST
│   ├── STATUS.md                  # Current state — being updated for pivot
│   ├── SERVICES.md                # Accounts, DNS, credentials, env vars, payment flows
│   ├── TECH-REFERENCE.md          # Architecture, code standards, audits, AMF compliance
│   ├── STRATEGY.md                # Brand, positioning, pricing, competitors (v7 pivot)
│   ├── ARCHITECTURE.md            # Dependency graph — being updated for pivot
│   └── STRATEGY-EXPERT-PLAN.md    # Laboratoire tier spec (22 sections)
├── planner.html                   # Source of truth (~15,600 lines, 453 tests)
└── CLAUDE.md                      # This file
```

## Documentation Guide
| Doc | Purpose | When to read |
|-----|---------|-------------|
| **PLAN-PIVOT.md** | Master execution plan: 156 tasks, 6 phases, dependencies, tracking | Start of EVERY session, before STATUS.md |
| **STATUS.md** | What's done, what's blocked, historical changelog | Context on what was already built |
| **SERVICES.md** | DNS, Stripe, Resend, Blob, env vars, payment flows | Infra/deployment tasks |
| **TECH-REFERENCE.md** | Code standards, audit history, AMF rules | Before writing code |
| **STRATEGY.md** | Brand voice, competitors, pricing, landing page (v7 pivot) | Marketing/copy tasks |
| **ARCHITECTURE.md** | Component dependency graph | Before modifying a component |
| **STRATEGY-EXPERT-PLAN.md** | Laboratoire tier spec (22 sections) | Laboratoire development |

## Pipeline — Bilan Pro (Production Target)
```
BA hub (client-side, localStorage)
  → Client clicks "Bilan Pro" CTA
  → Routing question: accumulation or décaissement?
  → Quiz pre-filled from BA data (DA-03)
  → POST /api/checkout (type: bilan_pro, path: accum|decum)
  → Stripe Checkout $19.99
  → webhook checkout.session.completed
  → Route to correct translator + renderer:
      Accum: translateToMCInter() → runMC(5000) → report-html-inter.js
      Decum: translateToMCDecum() → runMC(5000) → report-html-decum.js
  → callAnthropic() → AI slots
  → renderReport → Vercel Blob upload → Resend email
```

## Pipeline — Laboratoire (Production Target)
```
BA hub or direct landing
  → Quiz Expert (seeds from BA data via DA-04)
  → POST /api/checkout (type: expert)
  → Stripe Checkout $49.99
  → webhook → Magic link → KV profile
  → Simulator (190 params, unlimited recalcs, MC 1000/5000)
  → AI exports (5/year, 3/renewal)
```

## Bilan Pro — Key Concepts
### Accum Path (via intermediaire pipeline)
- **16-section report**: couple, immobilier, fiscalité, succession, 5-strategy comparison
- **18 AI slots**: DerivedProfile enrichment, 9-combo voice matrix
- **85 quiz fields** → 120 MC params via quiz-translator-inter.ts

### Décaissement Path (via decaissement pipeline)
- **13-section report**: SVG donut, trajectory, income, tax efficiency, stress test, CPP timing
- **12 AI slots**: snapshot_intro, longevity, spending, income_mix, tax, meltdown, cpp_timing, sequence, estate, obs_1/2/3
- **6 MC runs**: 1 base (5000) + 2 meltdown (1000 each) + 3 CPP timing (1000 each)
- **DerivedProfile + 9-combo voice, 4 narrative arcs, 7 worry patterns**
- **QPP factor**: continuous formula (7.2%/yr early, 8.4%/yr late) — not 3-entry lookup
- **deathAge**: 105 hard cap (stochMort CPM-2023 terminates sims earlier)

## Laboratoire — Key Concepts
- **Thesis**: BA and Bilan Pro sell the answer. Laboratoire sells the capacity to explore.
- **Simulator**: Unlimited recalculations, MC 1000 sims (screening) or 5000 (formal exports)
- **3 Workflows**: "Tester une decision" / "Optimiser automatiquement" / "Bilan Annuel"
- **Progressive disclosure**: Tabs activated by quiz data + mode guided by segment (Couple/CCPC/Pre-retraite/FIRE)
- **Auth**: Magic link + Vercel KV, token-based, rate-limited
- **Exports**: 5 AI exports (year 1), 3 (renewal). Resume 1-page unlimited. Bilan Annuel hors quota.
- **Pricing**: $49.99 initial + $29.99/yr renewal
- **Full spec**: docs/STRATEGY-EXPERT-PLAN.md (22 sections)

## Bilan Annuel (BA) — Key Concepts
- **Thesis**: Free hub. Builds trust. Captures real data. Conversion lever to Bilan Pro and Lab.
- **Client-side React**: app/outils/bilan-annuel/page.tsx (useState, useEffect, useMemo)
- **Storage**: localStorage key `buildfi_bilan_v4`, JSON export/import
- **Express mode**: 6 fields, ~60s — revenue/expenses/RRSP/TFSA/debts/age
- **Full mode**: accounts, properties, debts, mortgages, pension, couple
- **Projection**: 5-year deterministic (not MC) — `project5Years(data, overrides)`
- **What-if**: 3 scenarios (increased RRSP, delayed retirement, reduced expenses)
- **Snapshots**: Save current state, compare year-over-year evolution
- **MC preview** (conversion CTA): /api/ba-preview — 1,000 sims, returns P10/P90 at 5 years
- **No login required**: Entirely client-side, no server dependency

## Critical Rules — READ BEFORE EVERY TASK

### The Golden Rule
**NEVER remove, simplify, cut, or downgrade existing validated features without explicit written approval.** This is the #1 recurring failure. When porting/migrating: match 1:1 first, confirm, ONLY THEN propose changes.

### AMF/OSFI Compliance (NON-NEGOTIABLE)
- **Conditional tense** for ALL projections: pourrait/serait/atteindrait (FR), could/would/might (EN)
- **Present tense OK** for facts from data: "Votre taux de reussite est 72 %"
- **NEVER use**: devriez, recommandons, conseillons, il faut, devez, assurez-vous, considerez, optimisez, priorisez, plan d'action, recommandation(s)
- **Approved replacements**: "Cette analyse suggere", "Les donnees indiquent", "Il serait parfois pertinent de"
- **Observational language ONLY** — describe what numbers show, never prescribe actions
- **No debt shaming** — state mathematical cost only
- **Grep test**: run `grep -rn "devriez\|recommandons\|vous devez\|il faut que" lib/ public/` before committing — must return 0 results
- **Full forbidden terms list**: docs/TECH-REFERENCE.md §6

### Code Quality
- Target: 12/10 — never "good enough"
- No emoji in UI text, labels, or plans (report icons like data-driven TL;DR are OK)
- Grade 10 reading level for all client-facing text
- Province-aware: RRQ (QC) vs RPC (other provinces), CELI vs TFSA
- Bilingual FR/EN in all text
- Static fallbacks if Anthropic API fails — report must work without AI

### Engine Rules
- **planner.html is source of truth** — if bug found, fix BOTH planner.html AND lib/engine/index.js
- **453 tests, 54 categories, 0 failures required**
- Engine clamps > UI validation — the engine is its own guardrail
- Never inline calcTax() or calcQPP() in JSX
- Always display rMedF (real) not medF (nominal)
- **Minimum 1,000 sims** for any MC computation. Formal reports = 5,000.

### Architecture Rules
- **API key NEVER in client-side code** — Vercel env vars only (DT-016)
- AI narration calls go through /api/ backend route, never browser fetch
- Quiz thin client: zero MC functions client-side
- Stripe webhook URL: www.buildfi.ca (not buildfi.ca — 307 redirect loses POST body)
- **MC always server-side** — the engine never runs in the browser (Laboratoire simulator uses /api/simulate)
- **BA is client-side exception** — deterministic projection only, no MC, no API keys

### Debt Tool Rules
- **200 tests, 0 failures required** (`node tests/debt-tool-tests.js`)
- Balance brackets after every edit — { } ( ) [ ] must all match
- No new components — reuse Card, StatBox, InputRow, NumInput, SectionTitle, DebtChart
- `showAdvanced` auto-opens on mount if mortgages/income/couple data exists (useEffect)

## Brand Voice
Clear. Warm. Confident. Anti-bullshit. Grade 10 reading level. No price anchoring ("a planner would charge $1,500") inside the tool — that's for marketing only.

### Vocabulary
- "bilan" / "assessment" — NOT "rapport" / "report" (except formal context)
- "simulateur" / "laboratoire" — NOT "dashboard" / "outil" / "platform"
- "observations" / "constats" — NOT "recommandations" / "conseils"
- "leviers identifies" — NOT "plan d'action" / "optimisez"

## Current Status (March 2026)
- **PIVOT ANNOUNCED (2026-03-09)** — 4 tiers → 3 products. Master plan: docs/PLAN-PIVOT.md
- **Phase 1 target**: Build Bilan Annuel (BA hub, client-side React, express + full mode)
- **Phase 2 target**: Stripe/Checkout/Webhook for bilan_pro routing
- **Phase 3 target**: Laboratoire rebrand ($129 → $49.99)
- **Phase 4 target**: Bilan Pro quiz routing + pre-fill + tool gating
- **Phase 5 target**: Site rebuild (landing, emails, /merci)
- **Phase 6 target**: Polish + distribution (SEO, domain warmup, PWA)
- **All existing pipelines**: Ess/Inter/Decum/Expert — fully built, tested, deployed (pre-pivot)
- **Tests**: 200 debt + 453 engine + 91 report-shared + 135 fiscal-sync + 310 expert = ~1,189 total
- **Infra**: All Stripe keys, Blob, Resend, Anthropic, KV — configured and operational

## Commands
```bash
npm run dev                    # Local dev server
npm run build                  # Production build
node tests/debt-tool-tests.js  # Debt tool tests (200 tests)
vercel --prod                  # Manual deploy
```

### Test commands
```bash
npx jest tests/s1-infrastructure.test.ts       # Laboratoire infra (29 tests)
npx jest tests/s3-api.test.ts                  # API simulate/optimize (103 tests)
npx jest tests/s10-audit.test.ts               # Full audit (91 tests)
npx jest tests/quiz-translator-expert.test.ts  # Laboratoire translator (87 tests)
npx tsx tests/report-shared.test.ts            # Shared helpers (91 tests)
npx tsx tests/fiscal-constants-sync.test.ts    # Engine vs fiscal-2026.ts (135 tests)
```

### Validation checks before commit
```bash
# AMF compliance (zero tolerance)
grep -rn "devriez\|recommandons\|vous devez\|il faut que" lib/ public/

# Debt tool tests
node tests/debt-tool-tests.js   # expect 200/200

# Build
npm run build
```

## Key Environment Variables
```
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_BILAN_PRO              # NEW — to be created for $19.99
STRIPE_PRICE_EXPERT                  # Laboratoire $49.99 (to be updated from $129)
STRIPE_PRICE_EXPERT_RENEWAL          # Laboratoire renewal $29.99/yr
STRIPE_PRICE_EXPORT_ADDON            # $14.99 addon
STRIPE_PRICE_ESSENTIEL               # DEPRECATED — old Bilan $29
STRIPE_PRICE_INTERMEDIAIRE           # DEPRECATED — old Bilan 360 $59
STRIPE_PRICE_DECAISSEMENT            # DEPRECATED — old Horizon $59
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, NEXT_PUBLIC_BASE_URL
RESEND_API_KEY, RESEND_FROM
BLOB_READ_WRITE_TOKEN
KV_REST_API_URL, KV_REST_API_TOKEN  # Upstash Redis (Laboratoire profiles, auth, rate limiting)
ANTHROPIC_API_KEY                    # Server-side only
NEXT_PUBLIC_POSTHOG_KEY
```
