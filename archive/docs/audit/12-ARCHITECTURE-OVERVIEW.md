# 12 — Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Landing Page  │  │ Product Pages│  │ Bonus Tools  │          │
│  │ index.html    │  │ bilan.html   │  │ dettes/      │          │
│  │               │  │ bilan-360    │  │ allocation   │          │
│  │               │  │ horizon      │  │ decum-sim    │          │
│  │               │  │ expert-land  │  │              │          │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘          │
│         │                  │                                     │
│  ┌──────┴──────────────────┴───────┐  ┌──────────────┐          │
│  │         Quiz Pages              │  │ Expert       │          │
│  │ quiz-essentiel.html             │  │ Simulator    │          │
│  │ quiz-intermediaire.html         │  │ planner-     │          │
│  │ quiz-decaissement.html          │  │ expert.html  │          │
│  │ quiz-expert.html                │  │              │          │
│  └──────────────┬──────────────────┘  └──────┬───────┘          │
│                 │ POST quiz JSON              │ POST sim params  │
└─────────────────┼────────────────────────────┼──────────────────┘
                  │                            │
                  ▼                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     VERCEL (Next.js 16)                          │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    API Routes (23)                          │ │
│  │                                                            │ │
│  │  /api/checkout ──► Stripe Checkout Session                 │ │
│  │                         │                                  │ │
│  │                    (user pays)                              │ │
│  │                         │                                  │ │
│  │  /api/webhook ◄──── Stripe webhook                         │ │
│  │       │                                                    │ │
│  │       ├─► Translator (quiz → MC params)                    │ │
│  │       ├─► MC Engine (5000 sims, t-Student df=5)            │ │
│  │       ├─► AI Profile (DerivedProfile, 13 signals)          │ │
│  │       ├─► AI Prompt (tier-specific, voice matrix)          │ │
│  │       ├─► Anthropic API (claude-sonnet-4)                  │ │
│  │       ├─► Sanitizer (forbidden terms, HTML strip)          │ │
│  │       ├─► Report Renderer (HTML generation)                │ │
│  │       ├─► Blob Upload (Vercel Blob)                        │ │
│  │       ├─► Email (Resend)                                   │ │
│  │       └─► Feedback Token (KV)                              │ │
│  │                                                            │ │
│  │  /api/simulate ──► Expert MC (1k/5k sims)                  │ │
│  │  /api/optimize ──► Auto-optimization                       │ │
│  │  /api/compare  ──► Scenario comparison                     │ │
│  │  /api/export   ──► AI export (quota-limited)               │ │
│  │  /api/auth/*   ──► Magic link, token verify                │ │
│  │  /api/cron/*   ──► Feedback, renewal, anniversary          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   lib/engine/    │  │  lib/ai-*    │  │  lib/report-*   │  │
│  │   index.js       │  │  prompt/     │  │  html renderers │  │
│  │   (2,438 lines)  │  │  profile/    │  │  (4 tiers)      │  │
│  │   38 exports     │  │  constants   │  │                  │  │
│  └──────────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                  │              │              │
                  ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                          │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │  Stripe  │  │ Anthropic│  │  Resend  │  │ Vercel Blob  │   │
│  │ Payments │  │    AI    │  │  Email   │  │   Storage    │   │
│  │ PCI L1   │  │ sonnet-4 │  │ buildfi  │  │  Reports     │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
│                                                                 │
│  ┌──────────┐  ┌──────────┐                                    │
│  │ Upstash  │  │ PostHog  │                                    │
│  │  Redis   │  │Analytics │                                    │
│  │  (KV)    │  │(consent) │                                    │
│  └──────────┘  └──────────┘                                    │
└─────────────────────────────────────────────────────────────────┘
```

## Transaction Flow (Bilan Example)

```
1. User visits buildfi.ca → index.html
2. Clicks "Trouver mon point de départ" → scrolls to products
3. Clicks "Bilan" → /bilan product page
4. Clicks "Commencer" → /quiz-essentiel.html
5. Completes quiz (12 screens, ~28 fields)
6. Accepts terms (checkbox, CPA compliance)
7. Quiz → POST /api/checkout
   - splitMetadata(quizJSON) → quiz_0, quiz_1...
   - Create Stripe Checkout Session (STRIPE_PRICE_ESSENTIEL)
   - Apply LAUNCH50 if eligible
8. Redirect to Stripe hosted checkout
9. User pays $14.50
10. Stripe fires checkout.session.completed → POST /api/webhook
11. Webhook pipeline:
    a. Verify Stripe signature
    b. Check idempotency (KV)
    c. Reassemble quiz JSON
    d. translateToMC(quizAnswers) → 55 MC params
    e. runMC(params, 5000) → MC results (~2.3s)
    f. extractReportData(mc, params) → structured data D
    g. computeDerivedProfile(quiz, mc) → behavioral signals
    h. buildAIPrompt(D, params, lang, quiz) → {system, user}
    i. callAnthropic(system, user) → raw AI text
    j. Parse → 13 named slots
    k. sanitizeAISlots(slots) → clean slots
    l. renderReportHTML(D, mc, quiz, lang, ai, ...) → HTML
    m. Upload to Vercel Blob → report URL
    n. sendReportEmail(email, 'essentiel', reportUrl, lang, feedbackToken)
    o. createFeedbackRecord(email, 'essentiel', reportUrl)
    p. markSessionProcessed(sessionId)
12. User receives email with report link
13. User redirected to /merci (tier-aware thank you page)
14. J+3: Feedback survey email sent
```

## File Map by Category

### Client-Side (public/)
```
public/
├── index.html                    # Landing page (4 products)
├── bilan.html                    # Bilan product page
├── bilan-360.html                # Bilan 360 product page
├── horizon.html                  # Horizon product page
├── expert-landing.html           # Laboratoire landing
├── quiz-essentiel.html           # Bilan quiz
├── quiz-intermediaire.html       # Bilan 360 quiz
├── quiz-decaissement.html        # Horizon quiz
├── quiz-expert.html              # Laboratoire quiz-lite
├── planner-expert.html           # Expert simulator
├── outils/
│   ├── allocation-epargne.html   # Savings allocator tool
│   └── decaissement-simulateur.html  # Decum simulator
├── confidentialite.html          # Privacy policy
├── conditions.html               # Terms of service
├── avis-legal.html               # Legal disclaimer
├── logo.js                       # Shared SVG logo
└── robots.txt
```

### Server-Side (lib/)
```
lib/
├── engine/index.js               # MC engine (2,438 lines)
├── quiz-translator.ts            # Essentiel translator
├── quiz-translator-inter.ts      # Intermédiaire translator
├── quiz-translator-decum.ts      # Décaissement translator
├── quiz-translator-expert.ts     # Expert translator
├── ai-profile.ts                 # DerivedProfile + signals
├── ai-constants.ts               # Slots, forbidden terms, sanitizers
├── ai-prompt-inter.ts            # Inter AI prompt
├── ai-prompt-decum.ts            # Decum AI prompt
├── ai-prompt-expert.ts           # Expert AI prompt
├── report-html.js                # Essentiel report + buildAIPrompt
├── report-html-inter.js          # Inter report
├── report-html-decum.js          # Decum report
├── report-html-expert.ts         # Expert report
├── report-shared.ts              # Shared report utilities
├── strategies-inter.ts           # 5-strategy comparison
├── email.ts                      # Report delivery emails
├── email-expert.ts               # Expert emails
├── email-feedback.ts             # Feedback pipeline emails
├── auth.ts                       # Token verification
├── kv.ts                         # Upstash Redis operations
├── rate-limit.ts                 # Rate limiting
├── api-helpers.ts                # Metadata split/reassemble
└── constants-registry.ts         # 2026 tax constants
```

### API Routes (app/api/)
```
app/api/
├── checkout/route.ts             # Stripe checkout
├── webhook/route.ts              # Pipeline orchestrator
├── auth/
│   ├── verify/route.ts           # Token verification
│   └── magic-link/route.ts       # Magic link generation
├── simulate/route.ts             # Expert MC
├── optimize/route.ts             # Expert auto-optimize
├── compare/route.ts              # Expert scenario compare
├── export/route.ts               # AI export (quota-limited)
├── profile/route.ts              # Expert profile CRUD
├── bilan-annuel/route.ts         # Annual review
├── referral/generate/route.ts    # Referral links
├── feedback/route.ts             # Feedback submission
├── data/
│   ├── export/route.ts           # Data download
│   └── delete/route.ts           # GDPR deletion
├── health/route.ts               # Health check
├── admin/stats/route.ts          # Admin dashboard
└── cron/
    ├── feedback/route.ts         # J+3/J+7/J+14
    ├── renewal/route.ts          # Expert renewal
    ├── anniversary/route.ts      # 6-month check-in
    └── constants-check/route.ts  # Drift detection
```

### Tests (tests/)
```
tests/
├── debt-tool-tests.js            # 200 tests
├── s1-infrastructure.test.ts     # 29 tests
├── s3-api.test.ts                # 103 tests
├── s10-audit.test.ts             # 91 tests
├── quiz-translator-expert.test.ts # 87 tests
├── report-calculations.test.js
├── report-inter-calculations.test.js
├── report-shared.test.ts
├── report-validation.js
├── constants-drift.test.js
├── fiscal-constants-sync.test.ts
├── generate-test-reports.ts
├── generate-test-reports-inter.ts
├── generate-5-ai-reports.ts
└── generate-audit-report.ts
```

## Key Architectural Rules

1. **MC always server-side** — never in browser
2. **API keys never client-side** — Vercel env vars only
3. **planner.html is source of truth** — engine/index.js must mirror it
4. **Static fallbacks** — all reports work without AI
5. **Webhook URL must use www** — bare domain 307-redirects lose POST body
6. **Quiz is thin client** — zero IP/logic exposed
7. **Idempotency enforced** — webhook checks KV before processing
8. **AMF compliance** — conditional tense, forbidden terms, observational language
