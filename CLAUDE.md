# CLAUDE.md — BuildFi (buildfi.ca)

## What is this project?
BuildFi is a bilingual (FR/EN) Canadian retirement planning SaaS that uses Monte Carlo simulation to generate personalized financial reports. Three tiers: Essentiel $29, Intermediaire $59, Expert $129. One-time payments (Expert renews $29/year). Anti-bullshit, anti-generic.

## Tech Stack
- **Framework**: Next.js 16 on Vercel (auto-deploy from main)
- **Payments**: Stripe Checkout (hosted), webhook at /api/webhook
- **Email**: Resend (buildfi.ca domain, DNS needs DKIM/SPF fix)
- **Storage**: Vercel Blob (reports), Vercel KV (data/profiles)
- **MC Engine**: Custom Monte Carlo, 5000 sims, t-Student df=5, ~2.3s serverless
- **AI Narration**: Anthropic API claude-sonnet-4 (server-side ONLY, key in Vercel env vars)
- **Analytics**: PostHog

## Pricing (confirmed 2026-03-02)
| Tier | Price | Model |
|------|-------|-------|
| Essentiel | $29 one-time | 1 report, 8 sections, AI narration |
| Intermediaire | $59 one-time | 1 report, 16 sections, couple, immo, fiscal |
| Expert | $129 one-time | Simulator unlimited + 5 AI exports |
| Expert renewal | $29/year | Simulator + 3 AI exports + Bilan Annuel |
| Export AI addon | $14.99 | 1 additional AI report |

## Repository Structure
```
buildfi/
├── app/
│   ├── api/
│   │   ├── ai-narrate/route.ts    # Standalone AI narration test endpoint
│   │   ├── auth/verify/route.ts   # GET — token verification → profile summary
│   │   ├── auth/magic-link/route.ts # POST — send fresh magic link email
│   │   ├── checkout/route.ts      # Stripe checkout (report/addon/second types)
│   │   ├── referral/generate/route.ts # GET — referral link + stats
│   │   └── webhook/route.ts       # Stripe webhook → MC/Expert/addon/referral/renewal
│   ├── expert/                    # Expert tier pages (simulateur, portail, landing)
│   ├── merci/                     # Post-purchase thank you page
│   ├── outils/dettes/
│   │   ├── page.jsx               # Debt tool (1,475 lines, React JSX)
│   │   └── tests.js               # Inline tests
│   └── page.tsx                   # Redirect → landing
├── lib/
│   ├── ai-constants.ts            # AI slot names (Ess 13 + Inter 16), AMF forbidden terms, sanitization
│   ├── ai-profile.ts              # DerivedProfile + RenderPlan (behavioral signals, psych overrides)
│   ├── ai-prompt-inter.ts         # Intermediaire AI prompt (18 slots, DerivedProfile enrichment)
│   ├── engine/index.js            # MC engine (2,426 lines, 38 exports)
│   ├── quiz-translator.ts         # Essentiel quiz answers → MC params
│   ├── quiz-translator-inter.ts   # Intermediaire 85 fields → 120 MC params
│   ├── quiz-translator-expert.ts  # Expert translator
│   ├── ai-prompt-expert.ts        # Expert AI prompt
│   ├── report-html.js             # Essentiel report v6 + buildAIPrompt() (1,421 lines)
│   ├── report-html-inter.js       # Intermediaire 16-section report (1,003 lines)
│   ├── strategies-inter.ts        # 5-strategy comparison engine (500 sims each)
│   ├── email.ts                   # Resend email templates (table-based, bilingual, tier-aware)
│   ├── email-expert.ts            # Expert emails: magic link + report delivery
│   ├── kv.ts                      # Upstash Redis — Expert profiles, referrals, idempotency
│   ├── auth.ts                    # Token verification (query param + Bearer header)
│   ├── rate-limit.ts              # Sliding-window rate limiting (exports 20/day, recalcs 100/day)
│   └── pdf-generator.ts           # DISABLED (Puppeteer incompatible with serverless)
├── public/
│   ├── quiz-essentiel.html        # Thin client quiz (zero IP exposed)
│   ├── quiz-intermediaire.html    # Intermediaire quiz
│   ├── quiz-expert.html           # Expert quiz (1,323 lines)
│   ├── index.html                 # Landing page v9
│   ├── expert.html                # Expert landing page
│   ├── planner-expert.html        # Expert planner (source of truth for Expert engine)
│   ├── logo.js                    # Shared SVG logo
│   ├── logo-dark.svg, logo-light.svg
│   └── robots.txt
├── tests/
│   ├── debt-tool-tests.js         # Debt tool test suite (200 tests)
│   ├── s1-infrastructure.test.ts  # S1 Expert infra tests (29 tests)
│   ├── s3-api.test.ts             # S3 API simulate/optimize tests (103 tests)
│   ├── s10-audit.test.ts          # S10 full audit tests (91 tests)
│   └── quiz-translator-expert.test.ts  # Expert translator tests (87 tests)
├── docs/                          # Project documentation (8 files)
│   ├── STATUS.md                  # Current state + roadmap — read first each session
│   ├── SERVICES.md                # Accounts, DNS, credentials, env vars, payment flows
│   ├── TECH-REFERENCE.md          # Architecture, code standards, audits, AMF compliance
│   ├── STRATEGY.md                # Brand, positioning, marketing, competitors, pricing
│   ├── ARCHITECTURE.md            # Dependency graph, 60+ components, 80+ connections
│   ├── STRATEGY-EXPERT-PLAN.md    # Expert tier bible — product, pricing, segments, bilan annuel
│   ├── EXPERT-EXECUTION-PLAN.md   # Expert build sessions S1-S14, audits, manual steps
│   └── EXPERT-IDENTITY-ALIGNMENT.md # Brand conformity grids per Expert component
├── planner.html                   # Source of truth (~15,600 lines, 453 tests)
├── quiz-essentiel.html            # Root copy (legacy)
├── quiz-intermediaire.html        # Intermediaire quiz (WIP)
└── CLAUDE.md                      # This file
```

## Documentation Guide
| Doc | Purpose | When to read |
|-----|---------|-------------|
| **STATUS.md** | What's done, what's blocked, roadmap, next actions | Start of every session |
| **SERVICES.md** | DNS, Stripe, Resend, Blob, env vars, payment flows | Infra/deployment tasks |
| **TECH-REFERENCE.md** | Code standards, audit history, AMF rules | Before writing code |
| **STRATEGY.md** | Brand voice, competitors, pricing, landing page | Marketing/copy tasks |
| **ARCHITECTURE.md** | Component dependency graph (60+ nodes) | Before modifying a component |
| **STRATEGY-EXPERT-PLAN.md** | Expert tier spec (22 sections) — the bible | Expert tier development |
| **EXPERT-EXECUTION-PLAN.md** | Session-by-session build plan (S1-S14) | Expert tier execution |
| **EXPERT-IDENTITY-ALIGNMENT.md** | Brand conformity grids per surface | Building visible UI |

## Pipeline (Production — Essentiel/Intermediaire)
```
Quiz thin client (zero IP exposed)
  → POST /api/checkout → Stripe
  → Payment → webhook checkout.session.completed
  → translateToMC(quizAnswers)
  → runMC(params, 5000) (~2.3s)
  → extractReportData(mc, params) → object D
  → buildAIPrompt(D, params, fr, quiz) → {sys, usr}
  → callAnthropic(sys, usr) → AI slots (or {} if no key / error)
  → renderReportHTML(D, mc, quiz, lang, ai, costDelay, minReturn)
  → Vercel Blob upload
  → Resend email with link
```

## Expert Tier — Key Concepts
- **Thesis**: Essentiel/Inter sell the answer. Expert sells the capacity to explore.
- **Simulator**: Unlimited recalculations, MC 1000 sims (screening) or 5000 (formal exports)
- **3 Workflows**: "Tester une decision" / "Optimiser automatiquement" / "Bilan Annuel"
- **Progressive disclosure**: Tabs activated by quiz data + mode guided by segment (Couple/CCPC/Pre-retraite/FIRE)
- **Auth**: Magic link + Vercel KV, token-based, rate-limited
- **Exports**: 5 AI exports (year 1), 3 (renewal). Resume 1-page unlimited. Bilan Annuel hors quota.
- **Bilan Annuel**: January check-up — 7 fields input → MC → 9-page comparative report
- **Full spec**: docs/STRATEGY-EXPERT-PLAN.md (22 sections)
- **Build plan**: docs/EXPERT-EXECUTION-PLAN.md (10 pre-launch + 4 post-launch sessions)

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
- Zero acronyms in Essentiel tier — write "Regime de rentes du Quebec" not RRQ
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
- **MC always server-side** — the engine never runs in the browser (Expert simulator uses /api/simulate)

### Debt Tool Rules
- **200 tests, 0 failures required** (`node tests/debt-tool-tests.js`)
- Balance brackets after every edit — { } ( ) [ ] must all match
- No new components — reuse Card, StatBox, InputRow, NumInput, SectionTitle, DebtChart
- `showAdvanced` auto-opens on mount if mortgages/income/couple data exists (useEffect)

## Brand Voice
Clear. Warm. Confident. Anti-bullshit. Grade 10 reading level. No price anchoring ("a planner would charge $1,500") inside the tool — that's for marketing only.

### Vocabulary (Expert-specific)
- "bilan" / "assessment" — NOT "rapport" / "report" (except formal context)
- "simulateur" / "laboratoire" — NOT "dashboard" / "outil" / "platform"
- "observations" / "constats" — NOT "recommandations" / "conseils"
- "leviers identifies" — NOT "plan d'action" / "optimisez"
- Full vocabulary grid: docs/EXPERT-IDENTITY-ALIGNMENT.md §3.1

## Current Status (March 2026)
- **P0.6 COMPLETED** — E2E pipeline validated
- **AI NARRATION v2 (2026-03-05)** — Voice matrix (9 combos), 8 composite signals, dynamic obs_2, narrative arc, worry combos, FIRE bridge, jargon ban, grade-10 readability
- **Report v6 MERGED + POLISHED** — 15 rendering improvements applied
- **Engine audit COMPLETED (2026-03-02)** — 20 bugs fixed, 17 new tests (453/453 pass)
- **Intermediaire server backbone MERGED** — ai-prompt-inter.ts, quiz-translator-inter.ts, report-html-inter.js
- **Debt tool UX restructured** — progressive tabs, micro-CTAs, 200 tests pass
- **Email template refactored** — table-based, AMF compliant, bilingual
- **Expert planning COMPLETE** — STRATEGY-EXPERT-PLAN v4, EXECUTION-PLAN, IDENTITY-ALIGNMENT all documented
- **EXPERT S1-S10 COMPLETE (2026-03-04)** — All 10 pre-launch Expert sessions done (29+87+103+91 tests)
- **Terms acceptance checkbox** — Quebec CPA compliance, 3 quiz pages + checkout API server validation
- **Cookie consent on quiz pages** — Law 25 compliance, localStorage gate, bilingual
- **Privacy officer** — "Le dirigeant de BuildFi Technologies inc." designated (Law 25 §3.5)
- Essentiel: near launch, 2 infra blockers (Blob public, Resend DNS)
- Next: S11-S14 post-launch (feedback, A/B, bilan annuel crons, admin)

## Commands
```bash
npm run dev                    # Local dev server
npm run build                  # Production build
node tests/debt-tool-tests.js  # Debt tool tests (200 tests)
vercel --prod                  # Manual deploy
```

### Expert test commands
```bash
npx jest tests/s1-infrastructure.test.ts   # S1 infra (29 tests)
npx jest tests/s3-api.test.ts              # S3 API simulate/optimize (103 tests)
npx jest tests/s10-audit.test.ts           # S10 full audit (91 tests)
npx jest tests/quiz-translator-expert.test.ts  # Expert translator (87 tests)
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
STRIPE_SECRET_KEY, STRIPE_PRICE_ESSENTIEL, STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_INTERMEDIAIRE, STRIPE_PRICE_EXPERT
STRIPE_PRICE_EXPERT_RENEWAL, STRIPE_PRICE_EXPORT_ADDON
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, NEXT_PUBLIC_BASE_URL
RESEND_API_KEY, RESEND_FROM
BLOB_READ_WRITE_TOKEN
KV_REST_API_URL, KV_REST_API_TOKEN  # Upstash Redis (Expert profiles, auth, rate limiting)
ANTHROPIC_API_KEY              # Server-side only — add to Vercel to activate AI narration
NEXT_PUBLIC_POSTHOG_KEY
```
