# STATUS.md
> État actuel du projet + feuille de route. Envoyer ce fichier à Claude en début de session.
> Mis à jour: 2026-03-08 — v17 (shared report module, fiscal sync test, renderer cleanup, purple elimination)

## PHASE ACTUELLE
**ALL 4 TIERS PIPELINE-COMPLETE. Stripe keys all configured. /merci page handles all tiers. Reste: og-image, domain warmup, Bilan Annuel cron (Expert post-launch). Inter quiz/checkout pipeline à connecter E2E.**

---

## CE QUI EST FAIT

### Infrastructure (P0)
| Service | Statut | Notes |
|---------|--------|-------|
| Domaine buildfi.ca | ✅ | Cloudflare DNS, pointe vers Vercel |
| Vercel | ✅ | Auto-deploy, Next.js 16.1.6 |
| GitHub tredhedge/buildfi | ✅ | main branch, privé |
| Stripe | ✅ | Test mode. All 5 products configured (Ess $29, Inter $59, Decum $59, Expert $129, Renewal $29/an, Addon $14.99). Webhook configuré |
| Resend | ✅ | Domaine buildfi.ca VERIFIED. Emails delivered. Spam probable (domain warmup needed) |
| PostHog | ✅ | |
| Vercel Blob | ✅ | Store opérationnel — rapports accessibles par lien email |
| Vercel KV (Upstash) | ✅ | Redis — profils Expert, auth, rate limiting, referral |
| Variables Vercel | ✅ | All env vars configured: ANTHROPIC_API_KEY, KV, Stripe (all 5 price IDs), Resend, Blob |

### Pipeline E2E — VALIDÉ EN PROD (2026-02-27)
| Étape | Status | Détails |
|-------|--------|---------|
| Quiz thin client | ✅ | 805 lignes, zero IP exposé côté client |
| Stripe Checkout | ✅ | POST /api/checkout → Stripe redirect, $29 CAD |
| Stripe Webhook | ✅ | POST /api/webhook, signature vérifiée, idempotency, admin alerts |
| Monte Carlo | ✅ | 5000 sims en ~2.3s sur Vercel serverless |
| Report HTML render | ✅ | **v6 polished** — 8 chantiers: upsell URLs, hypotheses grid, resources cadeau, nav pills (Renforcer+Evolution), grade hint, $0 row highlight, methodology accordion, referral banner |
| AI narration | ✅ OPERATIONAL v2 | buildAIPrompt() v2: voice matrix, composite signals, narrative arc, jargon ban. ANTHROPIC_API_KEY in Vercel |
| Blob upload | ✅ | Upload OK, rapports accessibles par lien |
| Email envoi | ✅ | Table-based template, bilingual, AMF compliant. Delivered (spam probable — domain warmup needed) |
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

### Intermediaire Server Backbone — MERGED + OVERHAULED
- `lib/ai-prompt-inter.ts` — 18 AI slots, DerivedProfile, voice matrix, 13 signals
- `lib/quiz-translator-inter.ts` — 85 champs → 120 MC params
- `lib/report-html-inter.js` — 16 sections, ~1,100 lignes, **visual overhaul complete** (see below)
- `lib/strategies-inter.ts` — 5-strategy comparison (500 sims each)
- `tests/report-inter-calculations.test.js` — 685 tests, 50 catégories

### Décaissement Tier (ajouté 2026-03-05, quality rebuild 2026-03-07)
| Composant | Statut | Détails |
|-----------|--------|---------|
| Landing page | ✅ | Product card, comparison table, "Quel produit" selector, FAQ |
| Quiz | ✅ | /quiz-decaissement.html — 13 écrans, thin client, static SEO shell |
| Translator | ✅ | lib/quiz-translator-decum.ts — QPP continuous formula, 6 MC runs |
| AI prompt | ✅ | lib/ai-prompt-decum.ts — 12 slots, DerivedProfile, voice matrix, narrative arcs |
| Report template | ✅ | lib/report-html-decum.js — 13 sections, SVG donut, static fallbacks |
| Email template | ✅ | Décaissement-specific resources block dans lib/email.ts |
| Webhook | ✅ | handleDecaissementPurchase() — 6 MC runs (1 base + 2 meltdown + 3 CPP timing) |
| Checkout | ✅ | Tier "decaissement" dans /api/checkout |
| Stripe product | ✅ | STRIPE_PRICE_DECAISSEMENT configured ($59 base, LAUNCH50 → $29.50) |
| /merci page | ✅ | Dedicated STEPS_DECUM animation, simulator CTA, no upsell for retirees |
| Pricing | — | $59 one-time (LAUNCH50 applies → $29.50) |

### Inter + Essentiel Narrative Arc (2026-03-06) — 3 COMMITS
| Composant | Changement | Statut |
|-----------|-----------|--------|
| `report-html-inter.js` | `bridge()` helper + 8 connecteurs narratifs data-driven (S2→S9) | ✅ |
| `report-html-inter.js` | Objectif callout + badges préoccupations dans header (toujours visible) | ✅ |
| `report-html-inter.js` | TOC : section count dynamique (`tocItems.length`) | ✅ |
| `report-html-inter.js` | S7 intro aware des worries du quiz | ✅ |
| `report-html-inter.js` | S9 verdict synthesis (Levier fort/modéré/Statu quo + estate angle) | ✅ |
| `report-html-inter.js` | S11b CCPC : salary/dividend quick-compare via `calcTax()` (2 scénarios) | ✅ |
| `report-html-inter.js` | S16 "Ce que vous avez dit" closing box | ✅ |
| `report-html-inter.js` | Bug fix CCPC : `params._quiz.bizRemun/.bizSalaryPct` → `params.*` | ✅ |
| `quiz-intermediaire.html` | Question décaissement retirée de l'étape 7 (engine gère via wStrat=optimal) | ✅ |
| `quiz-translator-inter.ts` | `melt: false` (hardcoded), `decaissement` retiré du _quiz passthrough | ✅ |
| `quiz-translator-inter.ts` | QPP heuristic : `\|\| 65` → retAge-based (comme Essentiel) | ✅ |
| `report-html.js` | `bridge()` helper + 6 connecteurs narratifs (S2, S3, S4, S5, S6, S8) | ✅ |
| `report-html.js` | Objectif callout data-driven (AI + fallback sur quiz.objective) | ✅ |
| `report-html.js` | "Ce que vous avez dit" box avant méthodologie | ✅ |
| `report-html.js` | Upsell : "16 sections" → "Jusqu'à 16 sections adaptées à votre profil" | ✅ |
| `report-html.js` | 3 violations AMF éliminées (Concentrez-vous, constituerait, devrait) | ✅ |
| `quiz-translator*.ts` + `constants-registry.ts` | Plafond REER 31 560 → 33 810 $ (limite CRA 2026) | ✅ |

### Report Quality Overhaul (2026-03-08) — 5 PHASES
| Phase | Composant | Statut |
|-------|-----------|--------|
| 1 | `lib/report-shared.ts` — shared helpers extracted from 3 renderers (grade mapping, colors, formatting, escHtml, probTranslation with tier-aware wording). 91/91 tests. | ✅ |
| 1 | All 3 renderers import from report-shared.ts, local duplicates removed (gradeFromSuccess, gradeColor, gCol, gradeLabel, probTranslation, escHtml, fPct→fmtPctInt) | ✅ |
| 1 | Purple (#7C60B8) fully eliminated from all report renderers → gold (#C4944A) or blue (#4680C0) | ✅ |
| 2 | `tests/fiscal-constants-sync.test.ts` — 135 tests verifying engine inline constants match fiscal-2026.ts (14 federal + 13×9 provincial + metadata) | ✅ |
| 3 | Webhook/KV fixes: "decaissement" tier in FeedbackRecord type union, correct feedback tier in webhook, stale DECUM50 comment fixed | ✅ |
| 4 | `lib/ai-prompt-decum.ts` — full rebuild: DerivedProfile, 9-combo voice matrix, 4 narrative arcs, 6 worry patterns, dynamic obs routing, enriched DATA block, 12 AI slots, AMF compliant | ✅ |
| 5 | `lib/ai-constants.ts` — AI_SLOTS_DECUM updated to 12 entries (added tax_timing_obs, obs_3), max length overrides, sanitize function | ✅ |

### Inter Report Visual Overhaul (2026-03-05) — 6 SESSIONS, 685/685 TESTS
| Session | Composant | Statut |
|---------|-----------|--------|
| S0 | CSS migration — 30+ classes Essentiel portées (`.sg .sh .sn .c .co .kg .kp .ai .ex .tip .np`), `.kg4` ajouté, `body line-height:1.75`, `max-width:820px` | ✅ |
| S1 | Header redesign — logo SVG, grade donut lettre seulement, labels descriptifs (Très solide/Solide/Fragile/À corriger), note italique probTranslation, callout `.co.cog` "dollars d'aujourd'hui", TOC `.np` | ✅ |
| S2 | MC fan chart fusion — S6 remplacé par graphe pleine vie (D.age→D.deathAge) en SVG 740×370, utilise `D.pD` rows, marqueur retraite, 5 bandes percentiles (P5→P95), légende, fallback smoothstep | ✅ |
| S3 | KPI grouping — 11 KPIs en 3 sous-groupes (Patrimoine `.kg4`, Revenus & Succession `.kg4`, Risques `.kg`); `kp()` migré vers classes CSS; callouts `.co.cogn` ajoutés après chaque secH() pour S1/S3/S5/S6/S7/S8 | ✅ |
| S4 | Observations + best lever — `obs()` 4e param bullets; métriques topic-keyed (gov-coverage/fee-impact/withdrawal-stress/bridge-period/mortgage-retirement/obs_1); callout "Levier le plus efficace" en S8 quand stratégie domine de >2pp | ✅ |
| S5 | Fixes mineurs — "Groupe d'âge" accent corrigé; Action no 1 restructurée en `.co.cogn` (label→name→why); emoji 🎯 retiré (brand rules) | ✅ |
| Audit | Fix `.kp` CSS — `background:var(--bgc)` manquant sur les cartes KPI non-modifiées (bleu/vert marque) — régression visuelle corrigée | ✅ |

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

### Essentiel Pipeline Audit (2026-03-04) — 3 ROUNDS
| Composant | Statut | Détails |
|-----------|--------|---------|
| Test profiles (10) | ✅ | All corrected: proper quiz fields (monthlyContrib, lifestyle, flat home fields, debts.amount, psych) |
| Translator fixes | ✅ | mortgage=0 bug, RRSP-first contrib split (sal >= $55k), QPP/OAS passthrough, partnerWork |
| Report polish (8 chantiers) | ✅ | Upsell URLs, hypotheses grid, resources cadeau, nav pills, grade hint, $0 rows, methodology accordion, referral |
| Quiz QPP deferral | ✅ | qppAge question added in Step 1, partnerWork in STATE |
| Debt CTA contextual | ✅ | Shows in Section 6 when debtBal > 0 |
| Bottom Expert upsell | ✅ | Removed (too pushy, Essentiel->Simulator gap too big) |
| Grade distribution | ✅ | D, F, A+, A+, F, F, A+, A+, A+, F — correct for profiles |
| AI narration v2 | ✅ | Voice matrix (9 combos), 8 composite signals, dynamic obs_2, narrative arc, worry combos, FIRE bridge, jargon ban, grade-10 readability. 10 profiles regenerated + verified |

### AI Narration v2 (2026-03-05)
| Composant | Statut | Détails |
|-----------|--------|---------|
| Voice matrix | ✅ | 9 combos (tone × literacy): warm/balanced/data-forward × basic/intermediate/advanced |
| Composite signals | ✅ | conservativeGrowthTrap, debtDragOverSavings, mortgageInRetirement, highEffortLowResult, timeLeverage, preRetUrgency, tfsaHeavy, rrspHeavy, riskMismatch |
| Dynamic obs_2 | ✅ | 7 conditional branches based on profile dominance (debt drag, FIRE bridge, estate, mortgage in ret, withdrawal, compounding, couple) |
| Narrative arc | ✅ | 4 themes: security, growth, optimization, catch-up — sets emotional journey |
| Worry combos | ✅ | 5 patterns: existential, estate-optimizer, investor-anxiety, maximum-anxiety, confident |
| Per-slot implications | ✅ | Each slot enriched with computed numbers (autonomy years, savings rate, timeline) |
| FIRE bridge data | ✅ | yearsWithoutGov, bridgeCost, bridgeSurvival for early retirees |
| Succession note | ✅ | 5 contextual angles (worry-driven, couple, high-estate, young, default) |
| Jargon ban | ✅ | 8 forbidden terms with plain-language replacements (résiduel, portefeuille, percentile, etc.) |
| External average ban | ✅ | No "la plupart des investisseurs" — only profile-specific DATA |
| obs_1 variation | ✅ | Anti-repetition: never start with "Le levier" |
| 10 test profiles | ✅ | All regenerated with v2 prompts, verified differentiation |

### Bonus Tools Integration (2026-03-05)
| Composant | Statut | Détails |
|-----------|--------|---------|
| `/public/outils/allocation-epargne.html` | ✅ | Allocation REER/CÉLI tool intégré — brand BuildFi, logo.js, REPORT BASELINE URL params, footer AMF bilingue, AMF fix (Constat) |
| `robots.txt` | ✅ | `Disallow: /outils/allocation-epargne.html` ajouté |
| `public/index.html` — product cards | ✅ | Essentiel 3 items, Intermédiaire 5 items — feature lists mis à jour, bilingual |
| `lib/email.ts` — Inter | ✅ | Bloc "Vos deux outils inclus" (allocation w/ baseline URL + dettes). Debt tool retiré de "Ressources incluses" pour Ess+Inter (expert only). |
| `lib/email.ts` — Essentiel | ✅ | Bloc "Votre outil interactif — choisissez" (dettes + allocation sans params). |
| `app/merci/page.tsx` | ✅ | Section bonus conditionnelle par tier — Ess: 2 cards (dettes/alloc), Inter: 2 cards (alloc/dettes), Expert: rien |
| `app/api/webhook/route.ts` | ✅ | Inter pipeline: construction URL baseline (income/alloc/return/retAge/age/province/married/mortgage) passée à sendReportEmail |

### Autres composants complétés
- **Report v6 polished** — Grade ring, fan chart, TL;DR, KPI cards, donut, what-if, 5yr snapshot, tooltips, mini TOC, print theme + 8 chantiers: upsell absolute URLs, hypotheses CSS grid, resources cadeau gold gradient, nav pills Renforcer+Evolution, grade action hint, $0 row red highlight, methodology accordion, referral banner Option A
- **Email template** — Table-based, bilingual, AMF compliant, grade card dark, tier-aware tool blocs
- **Debt tool** — 6 tabs, progressive disclosure, 7 strategies, 200 tests
- **Allocation REER/CÉLI tool** — Standalone HTML, BuildFi brand, REPORT BASELINE URL params, AMF compliant
- **Guides PDF** — 101 (13p) + 201/301 (19p), audit AMF 0 infraction
- **Landing page v9** — Logo SVG, audit AMF/BSIF complété, launch pricing, feature lists à jour
- **Quiz Essentiel** — Thin client, Stripe intégré, QPP deferral question, single-person only (couple=yes callout)
- **Logo** — SVG flame, shared logo.js, light/dark variants

---

## BLOQUANTS AVANT LANCEMENT ESSENTIEL (0 restants — ready to launch)

### 1. ~~Vercel Blob → PUBLIC~~ ✅ DONE
- Rapports accessibles par lien email — vérifié 2026-03-07

### 2. ~~Resend DNS → VÉRIFIÉ~~ ✅ DONE
- Domaine buildfi.ca: VERIFIED sur Resend — vérifié 2026-03-07
- Emails delivered (spam probable — domain warmup recommandé)

### 3. ~~ANTHROPIC_API_KEY → Vercel~~ ✅ DONE
- Clé ajoutée dans Vercel env vars — AI narration opérationnel

### 4. Pages légales (P0.7) — ✅ DONE
- Conditions, confidentialité, avis légal — mis à jour 2026-03-07
- Launch pricing ajouté dans conditions
- Consent banner référencé dans confidentialité
- Privacy officer: "Le dirigeant de BuildFi Technologies inc." ✅ DONE
- Terms acceptance checkbox on all quiz pages ✅ DONE
- "taxes incluses" → "avant taxes applicables" (conditions) ✅ DONE
- "consentement implicite" → "consentement explicite" (confidentialité) ✅ DONE
- AMF softening: "Ordre optimal" → "Ordre de retrait modélisé" ✅ DONE

### 5. ~~Magic link URL~~ ✅ FIXED (commit 27f81e9)
- buildMagicLinkUrl() force www.buildfi.ca pour éviter que le 307 redirect supprime le token
- Toutes les URLs hardcodées dans reports/tools corrigées

### 6. og-image.png — ⏳ EN COURS
- Image 1200x630 pour partages sociaux (Reddit, LinkedIn, etc.)
- À placer dans public/og-image.png

---

## ROADMAP

### Vue d'ensemble
| Phase | Titre | Statut |
|-------|-------|--------|
| P0 | Infrastructure Web | ✅ Complétée |
| P1 | Quiz + Rapport Essentiel + Landing | ✅ Launch-ready — Blob ✅, Resend ✅, AI ✅ |
| P2 | Rapport Intermédiaire + Upsell | ⏳ Server backbone merged, quiz à construire |
| P3 | Marketing + Légal | ⏳ |
| P4 | Migration Next.js | ⏳ Partiellement avancée (engine + API déjà en place) |
| P5 | Scale Consumer | ⏳ An 2-3 |
| P6 | B2B Planificateurs | ⏳ An 3-5, décision de vie |
| P7 | Maturité | ⏳ An 5-8 |

**Principe directeur**: Vendre d'abord, migrer ensuite.

### P1 — Prochaines actions (par priorité)
1. ~~Fix Blob public~~ ✅ Done — rapports accessibles
2. ~~Resend DNS~~ ✅ Done — domaine vérifié
3. ~~Add ANTHROPIC_API_KEY to Vercel~~ ✅ Done
4. ~~Pages légales~~ ✅ Done
5. ~~Fix magic link www prefix~~ ✅ Done (commit 27f81e9)
6. Create og-image.png (1200x630) and place in public/
7. Commit + push all changes
8. Set up support@buildfi.ca (Cloudflare Email Routing)
9. Domain warmup (mark emails as not-spam from multiple accounts)
10. Soft launch organique (Reddit, LinkedIn, cercle privé)

### P2 — Intermédiaire (go/no-go: 30+ ventes Essentiel + upsell > 15%)
- **Report visual overhaul: COMPLETE** — CSS system, header, MC chart, KPI grouping, obs restructuring (685/685 tests)
- **Narrative arc: COMPLETE** — bridge() helper, 8 connectors, objective callout, worries badges, S9 verdict, CCPC compare, S16 closing box
- **Quiz step 7 simplified** — decaissement question removed, engine handles via wStrat=optimal
- Quiz Intermédiaire thin client — à connecter E2E (quiz existe, checkout pipeline à câbler)
- Checkout pipeline /api/checkout → webhook → report-html-inter.js — à connecter E2E
- Server backbone already merged (translator, report, AI prompt, strategies)

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
│   ├── merci/page.tsx            ✅ Thank you page (tier-aware: Ess/Inter/Expert/Decum)
│   ├── expert/page.tsx           ✅ Expert redirect
│   └── outils/dettes/page.jsx   ✅ Debt tool (1,475 lignes)
├── lib/
│   ├── ai-constants.ts           ✅ AI slots (Ess 12 + Inter 16 + Decum 12), AMF forbidden terms
│   ├── ai-profile.ts            ✅ DerivedProfile + RenderPlan
│   ├── ai-prompt-inter.ts       ✅ Inter AI prompt (18 slots)
│   ├── ai-prompt-decum.ts       ✅ Décaissement AI prompt (12 slots, voice matrix)
│   ├── ai-prompt-expert.ts      ✅ Expert AI prompt
│   ├── api-helpers.ts            ✅ Shared API utilities
│   ├── auth.ts                   ✅ Token verification
│   ├── email.ts                  ✅ Ess/Inter email templates
│   ├── email-expert.ts           ✅ Expert emails (magic link + report)
│   ├── engine/index.js           ✅ MC engine (2,426 lignes, 38 exports)
│   ├── kv.ts                     ✅ Upstash Redis (profiles, auth, rate limit)
│   ├── quiz-translator.ts        ✅ Essentiel translator
│   ├── quiz-translator-inter.ts  ✅ Inter translator (85→120 params)
│   ├── quiz-translator-decum.ts  ✅ Décaissement translator (6 MC runs)
│   ├── quiz-translator-expert.ts ✅ Expert translator
│   ├── rate-limit.ts             ✅ Sliding window rate limiting
│   ├── report-shared.ts           ✅ Shared report helpers (grade, color, formatting, probTranslation)
│   ├── display-utils.ts           ✅ Normalized display formatting helpers
│   ├── report-html.js            ✅ Essentiel report v6 (imports report-shared)
│   ├── report-html-decum.js      ✅ Décaissement report (13 sections, imports report-shared)
│   ├── report-html-inter.js      ✅ Inter report (~1,100 lignes, imports report-shared)
│   ├── report-html-expert.ts     ✅ Expert report
│   ├── strategies-inter.ts       ✅ 5-strategy comparison
│   └── tracking.ts               ✅ PostHog tracking
├── public/
│   ├── index.html                ✅ Landing page v9 (feature lists Ess 3 items / Inter 5 items)
│   ├── expert.html               ✅ Expert landing page
│   ├── quiz-essentiel.html       ✅ Thin client (805 lignes)
│   ├── quiz-intermediaire.html   ✅ Inter quiz
│   ├── quiz-decaissement.html    ✅ Décaissement quiz (13 écrans)
│   ├── quiz-expert.html          ✅ Expert quiz
│   ├── avis-legal.html           ✅ Avis AMF
│   ├── conditions.html           ✅ Conditions d'utilisation
│   ├── confidentialite.html      ✅ Politique de confidentialité
│   ├── logo.js, logo-*.svg       ✅ Logo système
│   ├── robots.txt                ✅ Disallow /outils/ + /outils/allocation-epargne.html
│   └── outils/
│       └── allocation-epargne.html ✅ Outil allocation REER/CÉLI (REPORT BASELINE, AMF footer)
├── middleware.ts                  ✅ CSP headers
├── tests/                        ✅ 453 MC + 200 debt + 685 Inter + 87 Expert translator + 103 S3 + 91 S10 + 91 report-shared + 135 fiscal-sync = 1,845 tests
├── docs/                         8 fichiers de référence
└── CLAUDE.md                     Instructions Claude Code
```

## SERVICES EXTERNES
| Service | État |
|---------|------|
| Stripe | ✅ Test mode, webhook fonctionne |
| Resend | ✅ VERIFIED, emails delivered (domain warmup needed) |
| Vercel Blob | ✅ Opérationnel, rapports accessibles |
| Anthropic API | ✅ Operational, key in Vercel |
| Cloudflare DNS | ✅ |
| PostHog | ✅ |
| Upstash Redis | ✅ KV Expert profiles |

Détails complets: docs/SERVICES.md

## PROCHAINE SESSION
1. Create og-image.png (1200x630) for OG tags
2. Set up support@buildfi.ca (Cloudflare Email Routing)
3. ~~Create STRIPE_PRICE_DECAISSEMENT~~ ✅ Done — all Stripe keys configured
4. Domain warmup (mark emails as not-spam from multiple accounts)
5. Soft launch organique (Reddit, LinkedIn, cercle privé)
6. Inter E2E pipeline — câbler quiz-intermediaire.html → /api/checkout → webhook → report-html-inter.js
   - Ajouter question `objective` à l'étape 7 du quiz (alimente le callout toujours-on dans le rapport)
7. Bilan Annuel cron (Expert post-launch — January trigger for active Expert profiles)
8. S11 Expert post-launch: feedback pipeline, A/B testing
