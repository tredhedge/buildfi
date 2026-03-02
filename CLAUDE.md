# CLAUDE.md — BuildFi (buildfi.ca)

## What is this project?
BuildFi is a bilingual (FR/EN) Canadian retirement planning SaaS that uses Monte Carlo simulation to generate personalized financial reports. Three tiers: Essentiel $39, Intermédiaire $69, Expert $139. One-time payments, no subscriptions. Anti-bullshit, anti-generic.

## Tech Stack
- **Framework**: Next.js 16 on Vercel (auto-deploy from main)
- **Payments**: Stripe Checkout (hosted), webhook at /api/webhook
- **Email**: Resend (buildfi.ca domain, DNS needs DKIM/SPF fix)
- **Storage**: Vercel Blob (reports), Vercel KV (data)
- **MC Engine**: Custom Monte Carlo, 5000 sims, t-Student df=5, ~2.3s serverless
- **AI Narration**: Anthropic API (server-side ONLY, key in Vercel env vars)
- **Analytics**: PostHog

## Repository Structure
```
buildfi/
├── app/
│   ├── api/
│   │   ├── ai-narrate/route.ts    # Standalone AI narration test endpoint
│   │   ├── checkout/route.ts      # Stripe checkout session
│   │   └── webhook/route.ts       # Stripe webhook → MC → AI → report → email
│   ├── merci/                     # Post-purchase thank you page
│   ├── outils/dettes/
│   │   ├── page.jsx               # Debt tool (1,475 lines, React JSX)
│   │   └── tests.js               # Inline tests
│   └── page.tsx                   # Redirect → landing
├── lib/
│   ├── ai-constants.ts            # AI slot names, AMF forbidden terms, sanitization
│   ├── ai-profile.ts              # DerivedProfile + RenderPlan (behavioral signals)
│   ├── engine/index.js            # MC engine (2,426 lines, 38 exports)
│   ├── quiz-translator.ts         # Quiz answers → MC params
│   ├── report-html.js             # D → HTML report string + buildAIPrompt() (1,421 lines)
│   ├── email.ts                   # Resend email templates (table-based, bilingual)
│   └── pdf-generator.ts           # DISABLED (Puppeteer incompatible with serverless)
├── public/
│   ├── quiz-essentiel.html        # Thin client quiz (zero IP exposed)
│   ├── index.html                 # Landing page
│   ├── logo.js                    # Shared SVG logo
│   ├── logo-dark.svg, logo-light.svg
│   └── robots.txt
├── tests/
│   └── debt-tool-tests.js         # Debt tool test suite (200 tests)
├── planner_v2.html                # Source of truth (~15,000 lines, 436 tests)
├── quiz-essentiel.html            # Root copy (legacy)
├── quiz-intermediaire.html        # Intermédiaire quiz (WIP)
└── CLAUDE.md                      # This file
```

## Pipeline (Production)
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

### AI Narration Flow
- `buildAIPrompt()` in `report-html.js` builds system + user prompts enriched with DerivedProfile (anxiety, discipline, literacy, friction, theme)
- System prompt enforces: AMF compliance, anti-hallucination (numbers from DATA only), micro-structure (chiffre → implication → nuance)
- Webhook calls Anthropic directly (claude-sonnet-4), parses JSON, sanitizes via `sanitizeAISlots()`
- **Fallback**: if `ANTHROPIC_API_KEY` is missing or API fails → returns `{}` → report uses hardcoded fallback text
- 12 AI slots: `snapshot_intro`, `savings_context`, `debt_impact`, `gov_explanation`, `gap_explanation`, `tax_insight`, `longevity_good`, `longevity_watch`, `obs_1`, `obs_2`, `obs_3`, `upgrade_hook`
- `/api/ai-narrate` exists as a standalone test endpoint (not called by webhook)

### Report HTML (lib/report-html.js)
- **Active version**: v6 (`REPORT_VERSION = 'v6'`), v5 preserved as fallback
- **Key functions**: `extractReportData()`, `buildWhatIf()`, `buildSnapshot5yr()`, `buildHeuristics()`, `buildPDfallback()`, `buildAIPrompt()`, `calcCostOfDelay()`, `calcMinViableReturn()`, `buildPriority()`, `gradeInfo()`, `renderReport_v6()`, `renderReportHTML()`
- **v6 features**: Grade ring (A+ to F), fan chart (progressive spread), TL;DR 3 bullets, KPI cards, donut income chart, what-if scenarios, 5-year snapshot table, heuristics disclosure, cost of delay, min viable return, upsell CTAs
- **Polish (March 2026)**: `--amr` amber-ring color, client-friendly grade labels (B="Correct, à renforcer"), mini TOC with section anchors, hover tooltips on jargon, print theme (gold→brown), tabular-nums, QPP row highlight in snapshot, disclaimer restyled (cream + left border), mobile spacing, "Données utilisées" footer block

### Debt Tool (app/outils/dettes/page.jsx)
- Standalone React SPA, dark theme (DK palette), bilingual FR/EN
- 6 tabs: Inventaire, Stratégies, Simulateur, Calendrier, Rembourser vs Investir, Coût réel
- Tab order: core path [Inventaire → Stratégies → Simulateur → Calendrier] + separator + advanced [Repay vs Invest, True Cost]
- Inventory layout: welcome banner → debts → portrait global → collapsible "Aller plus loin" (mortgages, financial context, couple mode)
- Tabs grayed (opacity 0.4) when no payable debts
- Micro-CTAs at end of Simulator and Calendar guide to next tabs
- 7 strategies: avalanche, snowball, hybrid, cashflow, utilization, interest_dollar, custom
- `basePayoff` uses `selectedStrategy` (not hardcoded avalanche)
- Marginal rate label shows "(est.)" in Repay vs Invest
- localStorage: `buildfi_debts_v1`, export/import JSON
- **Test suite**: `tests/debt-tool-tests.js` — 200 tests, 0 failures required

## Critical Rules — READ BEFORE EVERY TASK

### The Golden Rule
**NEVER remove, simplify, cut, or downgrade existing validated features without explicit written approval.** This is the #1 recurring failure. When porting/migrating: match 1:1 first, confirm, ONLY THEN propose changes.

### AMF/OSFI Compliance (NON-NEGOTIABLE)
- **Conditional tense** for ALL projections: pourrait/serait/atteindrait (FR), could/would/might (EN)
- **Present tense OK** for facts from data: "Votre taux de réussite est 72 %"
- **NEVER use**: devriez, recommandons, conseillons, il faut, devez, assurez-vous, considérez, optimisez, priorisez, plan d'action, recommandation(s)
- **Approved replacements**: "Cette analyse suggère", "Les données indiquent", "Il serait parfois pertinent de"
- **Observational language ONLY** — describe what numbers show, never prescribe actions
- **No debt shaming** — state mathematical cost only
- **Grep test**: run `grep -rn "devriez\|recommandons\|vous devez\|il faut que" lib/ public/` before committing — must return 0 results

### Code Quality
- Target: 12/10 — never "good enough"
- No emoji in UI text, labels, or plans (report icons like ✅⚠️🎯 in data-driven TL;DR are OK)
- Grade 10 reading level for all client-facing text
- Zero acronyms in Essentiel tier — write "Régime de rentes du Québec" not RRQ
- Province-aware: RRQ (QC) vs RPC (other provinces), CÉLI vs TFSA
- Bilingual FR/EN in all text
- Static fallbacks if Anthropic API fails — report must work without AI

### Engine Rules
- **planner_v2.html is source of truth** — if bug found, fix BOTH planner_v2.html AND lib/engine/index.js
- **436 tests, 53 categories, 0 failures required**
- Engine clamps > UI validation — the engine is its own guardrail
- Never inline calcTax() or calcQPP() in JSX
- Always display rMedF (real) not medF (nominal)

### Architecture Rules
- **API key NEVER in client-side code** — Vercel env vars only (DT-016)
- AI narration calls go through /api/ backend route, never browser fetch
- Quiz thin client: zero MC functions client-side
- Stripe webhook URL: www.buildfi.ca (not buildfi.ca — 307 redirect loses POST body)

### Debt Tool Rules
- **200 tests, 0 failures required** (`node tests/debt-tool-tests.js`)
- Balance brackets after every edit — { } ( ) [ ] must all match
- No new components — reuse Card, StatBox, InputRow, NumInput, SectionTitle, DebtChart
- `showAdvanced` auto-opens on mount if mortgages/income/couple data exists (useEffect)

## Brand Voice
Clear. Warm. Confident. Anti-bullshit. Grade 10 reading level. No price anchoring ("a planner would charge $1,500") inside the tool — that's for marketing only.

## Current Status (March 2026)
- **P0.6 COMPLETED** — E2E pipeline validated
- **P1.4 AI NARRATION MERGED** — buildAIPrompt + Anthropic call wired into webhook
- **Report v6 MERGED + POLISHED** — 15 rendering improvements applied (grade colors, fan chart, TL;DR, print theme, tooltips, TOC, disclaimer restyle, mobile spacing, etc.)
- **Debt tool UX restructured** — inventory reordered, progressive tabs, micro-CTAs, P0 fixes (basePayoff strategy, marginal rate label)
- **Email template refactored** — table-based layout, AMF compliant, full bilingual
- Essentiel tier: near launch, 2 infra blockers (Blob permissions, Resend DNS)
- AI narration: code complete, needs ANTHROPIC_API_KEY in Vercel env vars to activate
- Next: add ANTHROPIC_API_KEY to Vercel, test with Stripe test card, then 5 psycho questions

## Commands
```bash
npm run dev                    # Local dev server
npm run build                  # Production build
node tests/debt-tool-tests.js  # Debt tool tests (200 tests)
vercel --prod                  # Manual deploy
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
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, NEXT_PUBLIC_BASE_URL
RESEND_API_KEY, RESEND_FROM
BLOB_READ_WRITE_TOKEN
ANTHROPIC_API_KEY              # Server-side only — add to Vercel to activate AI narration
NEXT_PUBLIC_POSTHOG_KEY
```
