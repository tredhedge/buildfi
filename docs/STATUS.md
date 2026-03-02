# STATUS.md
> État actuel du projet. Envoyer ce fichier à Claude en début de session.
> Mis à jour: 2026-03-02 — v5 (Engine audit 20 bugs fixed, 3 psych questions, Intermédiaire backbone, 453 tests)

## PHASE ACTUELLE
**P1.4+ ENGINE AUDIT COMPLETE — 20 bugs fixed in planner.html + engine/index.js (453/453 tests). 3 psychology questions added to quiz. Intermédiaire server backbone merged (4 new modules). Reste 3 infra blockers (Blob public, Resend DNS, ANTHROPIC_API_KEY) + pages légales avant lancement Essentiel.**

---

## CE QUI EST FAIT

### Infrastructure (P0)
| Service | Statut | Notes |
|---------|--------|-------|
| Domaine buildfi.ca | ✅ | Cloudflare DNS, pointe vers Vercel |
| Vercel | ✅ | Auto-deploy, Next.js 16.1.6 |
| GitHub tredhedge/buildfi | ✅ | main branch |
| Stripe | ✅ | Test mode, produit Essentiel $39 CAD, webhook configuré |
| Resend | ⚠️ | Clé API OK, domaine buildfi.ca DNS FAILED — DKIM/SPF à revérifier |
| PostHog | ✅ | |
| Vercel Blob | ⚠️ | Store "buildfi-blob" PRIVATE — rapports uploadés mais Forbidden en accès direct |
| Variables Vercel | ✅ | STRIPE_SECRET_KEY, STRIPE_PRICE_ESSENTIEL, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, RESEND_FROM, BLOB_READ_WRITE_TOKEN, NEXT_PUBLIC_BASE_URL, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY |

### Pipeline E2E — VALIDÉ EN PROD (2026-02-27)
| Étape | Status | Détails |
|-------|--------|---------|
| Quiz thin client | ✅ | ~870 lignes (9 steps incl. 3 psych Q), zero IP exposé côté client |
| Stripe Checkout | ✅ | POST /api/checkout → Stripe redirect, 39$ CAD |
| Stripe Webhook | ✅ | POST /api/webhook, signature vérifiée |
| Monte Carlo | ✅ | 5000 sims en ~2.3s sur Vercel serverless |
| Report HTML render | ✅ | **v6** — grade ring, fan chart, TL;DR, KPI cards, donut, what-if, 5yr snapshot, heuristics, tooltips, mini TOC |
| AI narration | ✅ CODE COMPLETE | buildAIPrompt() + Anthropic call wired in webhook — needs ANTHROPIC_API_KEY in Vercel |
| Blob upload | ✅ | Upload OK, mais store PRIVATE → "Forbidden" en accès direct |
| Email envoi | ✅ | Table-based template, bilingual, AMF compliant — arrives in spam (domain unverified) |
| PDF generation | ❌ DÉSACTIVÉ | @sparticuz/chromium ne fonctionne pas sur Vercel. Remplacé par lien HTML |

### AI Narration (P1.4) — CODE COMPLETE
- `buildAIPrompt()` in `report-html.js` builds system + user prompts enriched with DerivedProfile
- DerivedProfile: anxiety, discipline, literacy, friction, theme (from `lib/ai-profile.ts`)
- System prompt enforces: AMF compliance, anti-hallucination, micro-structure (chiffre → implication → nuance)
- Webhook calls Anthropic directly (claude-sonnet-4), parses JSON, sanitizes via `sanitizeAISlots()`
- 12 AI slots: snapshot_intro, savings_context, debt_impact, gov_explanation, gap_explanation, tax_insight, longevity_good, longevity_watch, obs_1, obs_2, obs_3, upgrade_hook
- Fallback: if ANTHROPIC_API_KEY missing or API fails → returns {} → report uses hardcoded fallback text
- `/api/ai-narrate` exists as standalone test endpoint (not called by webhook)
- AI constants + AMF forbidden terms in `lib/ai-constants.ts`
- **Activation**: add ANTHROPIC_API_KEY to Vercel env vars → AI narration goes live

### Report v6 — POLISHED (15 fixes, 2026-03-01)
- REPORT_VERSION = 'v6', v5 preserved as fallback
- Grade ring (A+ to F) with `--amr` amber-ring color for B/C grades
- Client-friendly grade labels: B="Correct, à renforcer", C="À risque"
- Fan chart with progressive spread (yearFrac accumulation)
- TL;DR 3 data-driven bullets after Note section
- KPI cards, donut income chart, what-if scenarios, 5-year snapshot table
- QPP start row highlighted (green bg + badge) in snapshot
- Heuristics disclosure, cost of delay, min viable return
- Mini TOC with 7 section pill anchors (hidden in print)
- Hover tooltips on jargon (Pessimiste P5, taux effectif, taux marginal)
- Print theme: gold→brown, break-inside:avoid, orphans/widows
- tabular-nums on all numeric elements
- Disclaimer restyled: cream bg + left border, left-aligned
- "Données utilisées" + version footer block
- Mobile spacing (@media max-width:600px)
- Upsell → "Prochaine étape" with expected result text

### Email Template — REFACTORED
- Table-based layout (email client compatible)
- Bilingual FR/EN
- AMF compliant disclaimers
- Grade card dark theme
- Bouton "Consulter mon rapport"
- Upsell Intermédiaire
- Footer Montréal + disclaimer

### Debt Tool — UX RESTRUCTURED (2026-03-01)
- 6 tabs: Inventaire, Stratégies, Simulateur, Calendrier | Rembourser vs Investir, Coût réel
- Tab separator at index 4 (core path vs advanced)
- Welcome banner when no debts
- Inventory reordered: debts → portrait global → collapsible "Aller plus loin" (mortgages, financial context, couple)
- `showAdvanced` auto-opens on mount if existing data (useEffect)
- Tabs grayed (opacity 0.4) when no payable debts
- Micro-CTAs at end of Simulator and Calendar guide to next tabs
- 7 strategies: avalanche, snowball, hybrid, cashflow, utilization, interest_dollar, custom
- `basePayoff` uses `selectedStrategy` (not hardcoded avalanche)
- Marginal rate label shows "(est.)" in Repay vs Invest
- 200 tests, 0 failures

### Engine Audit — COMPLETED (2026-03-02)
- **20 bugs fixed** in both planner.html and lib/engine/index.js (kept in sync)
- Round 1 (14 bugs): calcTax retired→age>=65 (12 call sites), pension credit fr[0], EI rates 2026, revData.aRE ordering, unsorted arrays for medSimIdx, tfsaRoom shadowing, 3-way pension indexation, meltdown rrifMin, property pr.ri, blanked API key, QPP/OAS validation 60-70, TFSA threshold 7000, inflation off-by-one, calcOAS test args
- Round 2 (6 bugs): remaining calcTax callers, cFhsa shadowing, spouse DB pension indexation in MC path (6 locations per file)
- **17 new BugFix verification tests** added to test suite
- **453 tests, 54 categories, 0 failures** (was 436/53)

### Moteur MC — planner.html (source of truth)
- 453 tests, 54 catégories, 0 failures
- Syncé avec lib/engine/index.js (2,426 lignes, 38 exports)
- Inclut optimizeDecum()
- Tax parity vérifiée sur 13 provinces

### Quiz Essentiel (thin client)
- ~870 lignes (9 steps: 0-7 + paywall at 8)
- Zero fonction MC côté client
- **3 psychology questions** added (step 6): psychAnxiety, psychDiscipline, psychLiteracy
- Mock preview pour paywall (generateMockPreview)
- Stripe checkout intégré
- Inline logo fallback + /logo.js

### Intermédiaire Server Backbone — MERGED (2026-03-01)
- `lib/quiz-translator-inter.ts`: 85 quiz fields → 120 MC params
- `lib/strategies-inter.ts`: 5-strategy comparison engine (500 sims each)
- `lib/ai-prompt-inter.ts`: 18 AI slots with DerivedProfile enrichment
- `lib/report-html-inter.js`: 16-section HTML report with SVG charts (1,003 lines)
- `lib/ai-constants.ts`: AI_SLOTS_INTER (16 slots) + sanitizeAISlotsInter()
- `lib/email.ts`: tier-conditional upsell
- Webhook wiring deferred to Phase B — Essentiel pipeline untouched

### Landing Page
- ✅ Sur GitHub, servie via app/page.tsx → redirect("/index.html")
- ✅ Logo SVG avec flame (via logo.js injection)
- ✅ Accents UTF-8 corrects
- ✅ buildfi.ca → 307 → www.buildfi.ca → landing page
- ✅ Audit AMF/BSIF v9 complété

### Logo Unifié
- /public/logo.js — logoSVG(size, context) shared function
- /public/logo-light.svg, logo-dark.svg — versions statiques
- Intégré dans: quiz-essentiel.html (inline fallback), landing page (JS injection)

---

## BLOQUANTS AVANT LANCEMENT ESSENTIEL — PRIORITÉ HAUTE

### 1. Vercel Blob → PUBLIC
- Store actuel "buildfi-blob" est PRIVATE
- Rapports uploadés OK mais lien retourne "Forbidden"
- Fix: recréer un store PUBLIC sur Vercel Storage, mettre à jour BLOB_READ_WRITE_TOKEN
- OU: utiliser signed URLs (plus complexe)

### 2. Resend DNS → VÉRIFIÉ
- Domaine buildfi.ca status: FAILED
- Records DNS ajoutés sur Cloudflare: DKIM (TXT resend._domainkey), SPF (TXT send), MX (send)
- La clé DKIM a été recréée — s'assurer que Cloudflare a la bonne valeur
- Email arrive en spam tant que le domaine n'est pas vérifié

### 3. ANTHROPIC_API_KEY → Vercel env vars
- Code complete — just needs the key added to Vercel
- Test with Stripe test card after adding

### 4. Pages légales (P0.7)
- Conditions d'utilisation
- Politique de confidentialité
- Avis AMF
- Besoin: nom légal de l'entreprise, email contact

### 5. Quiz Intermédiaire
- Thin client à construire (comme Essentiel)
- 80+ fields, 8 étapes
- UX immersive demandée (cards, transitions, score cinématique)

---

## STRUCTURE REPO GITHUB (actuelle)
```
buildfi/
├── planner.html                 ← moteur complet dev/test (453 tests, ~15,600 lignes)
├── app/
│   ├── page.tsx                 ✅ redirect("/index.html")
│   ├── api/
│   │   ├── ai-narrate/route.ts  ✅ Standalone AI narration test endpoint
│   │   ├── checkout/route.ts    ✅ Stripe session (automatic_tax disabled)
│   │   └── webhook/route.ts     ✅ MC → AI → Blob HTML → Email
│   ├── merci/page.tsx           ✅ Page de remerciement
│   └── outils/
│       └── dettes/page.jsx      ✅ Debt tool (1,475 lignes, React JSX)
├── lib/
│   ├── ai-constants.ts          ✅ AI slot names (Ess 12 + Inter 16), AMF forbidden terms
│   ├── ai-profile.ts            ✅ DerivedProfile + RenderPlan (psych overrides)
│   ├── ai-prompt-inter.ts       ✅ Intermédiaire AI prompt (18 slots)
│   ├── engine/index.js          ✅ Syncé planner.html (2,426 lignes, 38 exports)
│   ├── quiz-translator.ts       ✅ Essentiel (psych fields passthrough)
│   ├── quiz-translator-inter.ts ✅ Intermédiaire (85 fields → 120 MC params)
│   ├── report-html.js           ✅ Report v6 (1,421 lignes)
│   ├── report-html-inter.js     ✅ Intermédiaire report (1,003 lignes, 16 sections)
│   ├── strategies-inter.ts      ✅ 5-strategy comparison engine
│   ├── email.ts                 ✅ Table-based, bilingual, tier-aware
│   └── pdf-generator.ts         ⚠️ DISABLED (Puppeteer incompatible Vercel)
├── public/
│   ├── index.html               ✅ Landing page v9 + logo SVG
│   ├── quiz-essentiel.html      ✅ Thin client (~870 lignes, 9 steps + 3 psych Q)
│   ├── logo.js                  ✅ Shared logoSVG()
│   ├── logo-light.svg           ✅
│   ├── logo-dark.svg            ✅
│   └── robots.txt               ✅
├── tests/
│   └── debt-tool-tests.js       ✅ 200 tests
├── assets/
│   ├── guide-101-les-bases-de-vos-finances.pdf
│   └── guide-201-optimiser-votre-retraite.pdf
└── docs/
    ├── STATUS.md, ROADMAP.md, TECH-REFERENCE.md
    ├── SERVICES.md, STRATEGY.md
    └── [handoff docs]
```

## DÉCISIONS ARCHITECTURALES RÉCENTES

### PDF → HTML (pivot, 2026-02-27)
- Puppeteer + @sparticuz/chromium ne fonctionne pas sur Vercel serverless
- Solution: rapport HTML hébergé sur Vercel Blob, lien envoyé par email
- window.print() dans le rapport pour export PDF côté client (à ajouter)
- Approche standard dans l'industrie SaaS (Wealthsimple, Questrade, etc.)

### AI narration architecture (2026-02-28)
- Single API call, 12 JSON slots, claude-sonnet-4
- DerivedProfile behavioral signals enrich prompts (now with psych overrides)
- Fallback {} if no key or API error — report works without AI
- AMF forbidden terms enforced in system prompt + sanitization

### 3 Psychology questions (2026-03-02)
- psychAnxiety (calm/mild/high), psychDiscipline (strong/moderate/low), psychLiteracy (high/medium/low)
- Added as quiz step 6, optional (Next always available)
- Override data-derived DerivedProfile signals in ai-profile.ts
- Passed through quiz-translator.ts → params._quiz → computeDerivedProfile

### Engine audit (2026-03-02)
- 20 bugs found and fixed across 2 audit rounds (3 parallel agents per round)
- All fixes applied to both planner.html AND lib/engine/index.js
- 17 new BugFix verification tests → 453/453 total, 0 failures
- Key fixes: calcTax age>=65 gating, pension credit fr[0], spouse DB pension indexation, meltdown rrifMin

### Intermédiaire backbone (2026-03-01)
- 4 new server-side modules: quiz-translator-inter, strategies-inter, ai-prompt-inter, report-html-inter
- 2 modified: ai-constants.ts (16 Inter slots), email.ts (tier-aware upsell)
- Webhook wiring deferred to Phase B — Essentiel untouched

### Report v6 polish (2026-03-01)
- 15 CSS/HTML rendering improvements — no data layer changes
- Progressive fan chart spread, grade ring colors, client-friendly labels
- Print theme with brown overrides, tooltips, mini TOC, mobile spacing

### Debt tool UX restructure (2026-03-01)
- Progressive disclosure: welcome → debts → portrait → collapsible advanced
- Tab graying when no payable debts, separator between core/advanced tabs
- Micro-CTAs guide navigation flow between tabs

## SERVICES EXTERNES — ÉTAT
| Service | Config | État |
|---------|--------|------|
| Stripe | Test mode, webhook → www.buildfi.ca/api/webhook | ✅ Fonctionne |
| Resend | Clé API active, domaine FAILED | ⚠️ DNS à corriger |
| Vercel Blob | Store "buildfi-blob" private | ⚠️ Recréer en public |
| Cloudflare DNS | A record → Vercel, CNAME www → Vercel, + Resend records | ✅ |
| Anthropic API | Code complete, key NOT in Vercel env vars | ⚠️ Ajouter ANTHROPIC_API_KEY |

## PROCHAINE SESSION
1. Fix Blob (public store) → rapport accessible par lien
2. Fix Resend DNS (DKIM/SPF) → email en inbox
3. Add ANTHROPIC_API_KEY to Vercel → AI narration live
4. E2E test with Stripe test card (full pipeline validation)
5. Pages légales (P0.7) — conditions, confidentialité, avis AMF
6. Audit R19-R20 → soft launch
7. Quiz Intermédiaire thin client + webhook wiring (Phase B)
