# STATUS.md
> État actuel du projet. Envoyer ce fichier à Claude en début de session.
> Mis à jour: 2026-03-01 — v4 (AI narration merged, report v6 polished, email template refactored, debt tool UX restructured)

## PHASE ACTUELLE
**P1.4 AI NARRATION MERGED + REPORT v6 POLISHED — Pipeline E2E complet avec AI narration wired (needs ANTHROPIC_API_KEY in Vercel). Report v6 with 15 rendering polish fixes. Debt tool UX restructured. Email template refactored. Reste infra blockers (Blob public, Resend DNS) + pages légales avant lancement Essentiel.**

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
| Quiz thin client | ✅ | 805 lignes, zero IP exposé côté client |
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

### Moteur MC — Planner v2
- 436 tests, 53 catégories, 0 failures
- Syncé avec lib/engine/index.js (2,426 lignes, 38 exports)
- Inclut optimizeDecum()
- Tax parity vérifiée sur 10 provinces

### Quiz Essentiel (thin client)
- 805 lignes (était 3,227 — 75% de code retiré)
- Zero fonction MC côté client
- Mock preview pour paywall (generateMockPreview)
- Stripe checkout intégré
- Inline logo fallback + /logo.js

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
├── planner_v2.html              ← moteur complet dev/test (436 tests, ~15,000 lignes)
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
│   ├── ai-constants.ts          ✅ AI slot names, AMF forbidden terms, sanitization
│   ├── ai-profile.ts            ✅ DerivedProfile + RenderPlan (behavioral signals)
│   ├── engine/index.js          ✅ Syncé planner_v2 (2,426 lignes, 38 exports)
│   ├── quiz-translator.ts       ✅
│   ├── report-html.js           ✅ Report v6 (1,421 lignes) — extractReportData + buildAIPrompt + renderReport_v6
│   ├── email.ts                 ✅ Table-based, bilingual, AMF compliant
│   └── pdf-generator.ts         ⚠️ DISABLED (Puppeteer incompatible Vercel)
├── public/
│   ├── index.html               ✅ Landing page v9 + logo SVG
│   ├── quiz-essentiel.html      ✅ Thin client (805 lignes)
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
- DerivedProfile behavioral signals enrich prompts
- Fallback {} if no key or API error — report works without AI
- AMF forbidden terms enforced in system prompt + sanitization

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
1. Fix Blob (public store) + Resend DNS → rapport accessible par lien
2. Add ANTHROPIC_API_KEY to Vercel → test with Stripe test card
3. 5 psycho questions (quiz enhancement)
4. Pages légales (P0.7)
5. Quiz Intermédiaire thin client
