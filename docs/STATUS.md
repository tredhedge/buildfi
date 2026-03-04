# STATUS.md
> État actuel du projet + feuille de route. Envoyer ce fichier à Claude en début de session.
> Mis à jour: 2026-03-04 — v8 (S1-S10 Expert complete, terms acceptance checkbox, cookie consent on quiz pages, legal P07 gaps fixed)

## PHASE ACTUELLE
**PRE-LAUNCH FINAL — Expert S1-S10 complete (29+87+103+91 tests). Terms acceptance checkbox on all quiz pages + server validation (Quebec CPA). Cookie consent banner on all pages (Law 25). Launch pricing deployed. Constants auto-update system. Reste 3 blockers infra manuels (Blob public, Resend DKIM, ANTHROPIC_API_KEY Vercel).**

---

## CE QUI EST FAIT

### Infrastructure (P0)
| Service | Statut | Notes |
|---------|--------|-------|
| Domaine buildfi.ca | ✅ | Cloudflare DNS, pointe vers Vercel |
| Vercel | ✅ | Auto-deploy, Next.js 16.1.6 |
| GitHub tredhedge/buildfi | ✅ | main branch, privé |
| Stripe | ✅ | Test mode. Essentiel $29, Inter $59, Expert $129, Renewal $29/an, Addon $14.99. Webhook configuré |
| Resend | ⚠️ | Clé API OK, domaine buildfi.ca DNS FAILED — DKIM/SPF à revérifier |
| PostHog | ✅ | |
| Vercel Blob | ⚠️ | Store "buildfi-blob" PRIVATE — rapports Forbidden en accès direct |
| Vercel KV (Upstash) | ✅ | Redis — profils Expert, auth, rate limiting, referral |
| Variables Vercel | ⚠️ | Manque: ANTHROPIC_API_KEY, KV_REST_API_URL, KV_REST_API_TOKEN |

### Pipeline E2E — VALIDÉ EN PROD (2026-02-27)
| Étape | Status | Détails |
|-------|--------|---------|
| Quiz thin client | ✅ | 805 lignes, zero IP exposé côté client |
| Stripe Checkout | ✅ | POST /api/checkout → Stripe redirect, $29 CAD |
| Stripe Webhook | ✅ | POST /api/webhook, signature vérifiée, idempotency, admin alerts |
| Monte Carlo | ✅ | 5000 sims en ~2.3s sur Vercel serverless |
| Report HTML render | ✅ | **v6** — grade ring, fan chart, TL;DR, KPI cards, donut, what-if, 5yr snapshot |
| AI narration | ✅ CODE COMPLETE | buildAIPrompt() + Anthropic call wired — needs ANTHROPIC_API_KEY |
| Blob upload | ✅ | Upload OK, mais store PRIVATE → "Forbidden" en accès direct |
| Email envoi | ✅ | Table-based template, bilingual, AMF compliant — arrives in spam |
| PDF generation | ❌ DÉSACTIVÉ | Puppeteer incompatible Vercel. Remplacé par lien HTML |

### Audit complet (2026-03-03) — 21 CORRECTIFS
| Correctif | Catégorie | Statut |
|-----------|-----------|--------|
| Webhook idempotency timing | B1 Critical | ✅ FIXED |
| Webhook errors → HTTP 500 | B2 Critical | ✅ FIXED |
| Admin alerting (sendAdminAlert) | B9 Critical | ✅ FIXED |
| Rate limit magic-link (5 req/15min) | H1 Security | ✅ FIXED |
| Delete root quiz-intermediaire.html | H8 Security | ✅ FIXED |
| CSP headers (middleware.ts) | H11 Security | ✅ FIXED |
| GIS_MAX_COUPLE 665.41→667.41 | H6 Financial | ✅ FIXED (3 files) |
| QC bracket 108730→108680 | H7 Financial | ✅ FIXED (3 files) |
| Simulateur 2026 brackets | H4 Financial | ✅ FIXED |
| Debt tool 2026 brackets | H5 Financial | ✅ FIXED |
| Health check no Anthropic call | H2 Code | ✅ FIXED |
| Quiz validation (validateStep) | H3 Code | ✅ FIXED |
| Remove Puppeteer deps | H9 Code | ✅ FIXED |
| Layout metadata "BuildFi" | H12 Code | ✅ FIXED |
| Webhook signature verification | B4 Security | ✅ VERIFIED |
| Base URL www.buildfi.ca | B8 Env | ✅ FIXED |
| Vercel env vars documented | B3/B5/B6 Env | 📋 DOCUMENTED (manual) |
| Commit Expert tier files | B7 Git | 📋 PENDING (manual git) |

### Expert Tier — Session S1 Complétée (2026-03-02)
| Composant | Statut | Détails |
|-----------|--------|---------|
| Vercel KV (Upstash Redis) | ✅ | Profils, auth, rate limiting, referral, idempotency |
| Auth magic link | ✅ | Token-based, rate-limited |
| Rate limiting | ✅ | Sliding window — exports 20/day, recalcs 100/day |
| Checkout multi-tier | ✅ | report/addon/second types, coupons |
| Webhook Expert | ✅ | Expert/addon/referral/renewal paths |
| Email Expert | ✅ | Magic link + report delivery templates |
| Tests S1 | ✅ | 23 tests passent |

### Moteur MC — 453 tests, 54 catégories, 0 failures + 87 Expert translator tests
- Syncé avec lib/engine/index.js (2,426 lignes, 38 exports)
- 17 nouveaux tests ajoutés lors de l'audit (436→453)
- Inclut optimizeDecum()
- Tax parity vérifiée sur 10 provinces

### Intermediaire Server Backbone — MERGED
- `lib/ai-prompt-inter.ts` — 18 AI slots, DerivedProfile
- `lib/quiz-translator-inter.ts` — 85 champs → 120 MC params
- `lib/report-html-inter.js` — 16 sections, 1,003 lignes
- `lib/strategies-inter.ts` — 5-strategy comparison (500 sims each)

### Expert Tier — Sessions S1-S10 Complétées (2026-03-02 → 2026-03-04)
| Session | Composant | Tests | Statut |
|---------|-----------|-------|--------|
| S1 | Infrastructure (KV, auth, rate limiting, checkout, webhook) | 29 | ✅ |
| S2 | Quiz Expert (translator, paywall pricing) | 87 | ✅ |
| S3 | API simulate/optimize endpoints | 103 | ✅ |
| S4 | Simulateur UI | — | ✅ |
| S5 | 3 Workflows (Tester/Optimiser/Bilan Annuel) | — | ✅ |
| S6 | Report pipeline (Expert report HTML) | — | ✅ |
| S7 | Exports/portail | — | ✅ |
| S8 | Landing/upgrade paths | — | ✅ |
| S9 | Compliance (AMF, Law 25) | — | ✅ |
| S10 | Full audit | 91 | ✅ |

### Legal & Compliance (2026-03-04)
| Composant | Statut | Détails |
|-----------|--------|---------|
| Terms acceptance checkbox | ✅ | 3 quiz pages + checkout API server validation (Quebec CPA) |
| Cookie consent on quiz pages | ✅ | Law 25 — localStorage gate, bilingual, all quiz pages |
| Privacy officer designation | ✅ | "Le dirigeant de BuildFi Technologies inc." in confidentialite.html |
| Legal pages P07 gaps | ✅ | Age minimum, CPM-2023, Stripe PCI, processors list |

### Pre-launch polish (2026-03-04)
| Composant | Statut | Détails |
|-----------|--------|---------|
| Launch pricing (50% off) | ✅ | All 3 tiers on index.html, expert-landing, quiz-expert |
| Cookie consent banner | ✅ | Law 25, bilingual, localStorage, gates PostHog |
| SEO/OG meta tags | ✅ | og:locale, og:site_name, og:image on both landings |
| Legal pages updated | ✅ | Launch pricing in conditions, consent ref in privacy, dates |
| Expert landing page | ✅ | /expert/landing, launch pricing, bilingual |
| Constants auto-update | ✅ | Cron Jan+Feb, drift tests, fiscal-2026 |
| .gitignore updated | ✅ | |

### Autres composants complétés
- **Report v6** — Grade ring, fan chart, TL;DR, KPI cards, donut, what-if, 5yr snapshot, tooltips, mini TOC, print theme
- **Email template** — Table-based, bilingual, AMF compliant, grade card dark
- **Debt tool** — 6 tabs, progressive disclosure, 7 strategies, 200 tests
- **Guides PDF** — 101 (13p) + 201/301 (19p), audit AMF 0 infraction
- **Landing page v9** — Logo SVG, audit AMF/BSIF complété, launch pricing
- **Quiz Essentiel** — Thin client 805 lignes, Stripe intégré
- **Logo** — SVG flame, shared logo.js, light/dark variants

---

## BLOQUANTS AVANT LANCEMENT ESSENTIEL

### 1. Vercel Blob → PUBLIC [MANUAL]
- Store "buildfi-blob" est PRIVATE → rapports "Forbidden"
- Fix: recréer store PUBLIC sur Vercel Storage, mettre à jour BLOB_READ_WRITE_TOKEN

### 2. Resend DNS → VÉRIFIÉ [MANUAL]
- Domaine buildfi.ca status: FAILED
- Fix: copier nouvelle clé DKIM depuis Resend → mettre à jour TXT resend._domainkey sur Cloudflare

### 3. ANTHROPIC_API_KEY → Vercel [MANUAL]
- Code complete — ajouter la clé dans Vercel env vars → AI narration goes live

### 4. Pages légales (P0.7) — ✅ DONE
- Conditions, confidentialité, avis légal — mis à jour 2026-03-04
- Launch pricing ajouté dans conditions
- Consent banner référencé dans confidentialité
- Privacy officer: "Le dirigeant de BuildFi Technologies inc." ✅ DONE
- Terms acceptance checkbox on all quiz pages ✅ DONE

### 5. Commit + push [MANUAL]
- All files ready to commit

---

## ROADMAP

### Vue d'ensemble
| Phase | Titre | Statut |
|-------|-------|--------|
| P0 | Infrastructure Web | ✅ Complétée (P0.7 légal en attente) |
| P1 | Quiz + Rapport Essentiel + Landing | 🔄 Near launch — 3 blockers infra |
| P2 | Rapport Intermédiaire + Upsell | ⏳ Server backbone merged, quiz à construire |
| P3 | Marketing + Légal | ⏳ |
| P4 | Migration Next.js | ⏳ Partiellement avancée (engine + API déjà en place) |
| P5 | Scale Consumer | ⏳ An 2-3 |
| P6 | B2B Planificateurs | ⏳ An 3-5, décision de vie |
| P7 | Maturité | ⏳ An 5-8 |

**Principe directeur**: Vendre d'abord, migrer ensuite.

### P1 — Prochaines actions (par priorité)
1. Fix Blob public + Resend DNS → rapport accessible par lien
2. Add ANTHROPIC_API_KEY to Vercel → test E2E avec Stripe test card
3. ~~Pages légales~~ ✅ Done — remplir [Nom du responsable] dans confidentialite.html
4. Commit + push all changes
5. Create og-image.png (1200x630) and place in public/
6. Soft launch organique (Reddit, LinkedIn, cercle privé)

### P2 — Intermédiaire (go/no-go: 30+ ventes Essentiel + upsell > 15%)
- Quiz Intermédiaire thin client (80+ fields, 8 étapes) — à construire
- Server backbone already merged (translator, report, AI prompt, strategies)
- Score résilience 4 jauges, thermomètre risque séquence — à construire

### Expert — Sessions S1-S10 ✅ COMPLETE | S11-S14 Post-launch
- S1 Infra ✅ | S2 Quiz ✅ | S3 API ✅ | S4 Simulateur ✅ | S5 Workflows ✅
- S6 Reports ✅ | S7 Exports ✅ | S8 Landing ✅ | S9 Compliance ✅ | S10 Audit ✅
- S11-S14: Post-launch (feedback pipeline, A/B, bilan annuel crons, admin dashboard)
- Détails: docs/EXPERT-EXECUTION-PLAN.md

### Jalons financiers
| Jalon | Cible |
|-------|-------|
| Première vente | Semaine du lancement |
| 100 clients | An 1, mois 6-8 |
| $1,000/mois récurrent | An 1, mois 8-12 |
| Remplacer 50% salaire gov | An 2 (~$50K/an) |
| Remplacer 100% salaire gov | An 3 (~$100K/an) |

---

## STRUCTURE REPO GITHUB
```
buildfi/
├── planner.html                  ← moteur complet dev/test (453 tests, ~15,600 lignes)
├── app/
│   ├── page.tsx                  ✅ redirect("/index.html")
│   ├── layout.tsx                ✅ BuildFi metadata
│   ├── api/
│   │   ├── ai-narrate/route.ts   ✅ Standalone AI narration test
│   │   ├── auth/magic-link/route.ts ✅ Magic link + rate limiting
│   │   ├── auth/verify/route.ts   ✅ Token verification
│   │   ├── checkout/route.ts      ✅ Stripe (report/addon/second)
│   │   ├── health/route.ts       ✅ Health check (no Anthropic call)
│   │   ├── referral/generate/route.ts ✅ Referral link + stats
│   │   ├── simulate/route.ts     ✅ MC simulation
│   │   └── webhook/route.ts      ✅ MC → AI → Blob → Email (idempotent, admin alerts)
│   ├── merci/page.tsx            ✅ Thank you page
│   ├── expert/page.tsx           ✅ Expert redirect
│   └── outils/dettes/page.jsx   ✅ Debt tool (1,475 lignes)
├── lib/
│   ├── ai-constants.ts           ✅ AI slots (Ess 12 + Inter 16), AMF forbidden terms
│   ├── ai-profile.ts            ✅ DerivedProfile + RenderPlan
│   ├── ai-prompt-inter.ts       ✅ Inter AI prompt (18 slots)
│   ├── ai-prompt-expert.ts      ✅ Expert AI prompt
│   ├── api-helpers.ts            ✅ Shared API utilities
│   ├── auth.ts                   ✅ Token verification
│   ├── email.ts                  ✅ Ess/Inter email templates
│   ├── email-expert.ts           ✅ Expert emails (magic link + report)
│   ├── engine/index.js           ✅ MC engine (2,426 lignes, 38 exports)
│   ├── kv.ts                     ✅ Upstash Redis (profiles, auth, rate limit)
│   ├── quiz-translator.ts        ✅ Essentiel translator
│   ├── quiz-translator-inter.ts  ✅ Inter translator (85→120 params)
│   ├── quiz-translator-expert.ts ✅ Expert translator
│   ├── rate-limit.ts             ✅ Sliding window rate limiting
│   ├── report-html.js            ✅ Essentiel report v6 (1,421 lignes)
│   ├── report-html-inter.js      ✅ Inter report (1,003 lignes)
│   ├── report-html-expert.ts     ✅ Expert report
│   ├── strategies-inter.ts       ✅ 5-strategy comparison
│   └── tracking.ts               ✅ PostHog tracking
├── public/
│   ├── index.html                ✅ Landing page v9
│   ├── expert.html               ✅ Expert landing page
│   ├── quiz-essentiel.html       ✅ Thin client (805 lignes)
│   ├── quiz-intermediaire.html   ✅ Inter quiz
│   ├── quiz-expert.html          ✅ Expert quiz
│   ├── avis-legal.html           ✅ Avis AMF
│   ├── conditions.html           ✅ Conditions d'utilisation
│   ├── confidentialite.html      ✅ Politique de confidentialité
│   ├── logo.js, logo-*.svg       ✅ Logo système
│   └── robots.txt                ✅ Disallow /outils/
├── middleware.ts                  ✅ CSP headers
├── tests/                        ✅ 453 MC + 200 debt + 87 Expert translator + 103 S3 + 91 S10 = 934 tests
├── docs/                         8 fichiers de référence
└── CLAUDE.md                     Instructions Claude Code
```

## SERVICES EXTERNES
| Service | État |
|---------|------|
| Stripe | ✅ Test mode, webhook fonctionne |
| Resend | ⚠️ DNS FAILED, email en spam |
| Vercel Blob | ⚠️ PRIVATE, rapports Forbidden |
| Anthropic API | ⚠️ Code complete, key pas dans Vercel |
| Cloudflare DNS | ✅ |
| PostHog | ✅ |
| Upstash Redis | ✅ KV Expert profiles |

Détails complets: docs/SERVICES.md

## PROCHAINE SESSION
1. Fix Blob (public store) + Resend DNS → rapport accessible
2. Add ANTHROPIC_API_KEY to Vercel → test E2E
3. Create og-image.png (1200x630) for OG tags
4. Commit + push all changes
5. Soft launch organique (Reddit, LinkedIn, cercle privé)
6. S11 Expert post-launch: feedback pipeline, A/B testing
