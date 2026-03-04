# TECH-REFERENCE.md
> Architecture, décisions de code, audits, conformité AMF.
> Mis à jour: 2026-03-03 — v10 (post-audit 453 tests, 21 correctifs, S1 Expert infra, CSP headers, admin alerts)

---

## 1. ARCHITECTURE

### Important: Le moteur MC existe dans 2 endroits
- `planner.html` — moteur complet dev/test (~15,000 lignes, 453 tests embarqués)
- `lib/engine/index.js` — moteur extrait pour production (2,426 lignes, 38 exports)

**Si un bug moteur est corrigé, le corriger dans les 2 fichiers.** planner.html est la source de vérité.

### Structure planner.html
```
Lignes 1–50          : HTML head, meta, styles
Lignes 50–500        : CSS (tokens FS/CL/SP, responsive)
Lignes 500–4,572     : MOTEUR (calcTax, calcQPP, calcOAS, calcGIS, optimizeDecum, runMC)
Lignes 4,572–14,500  : UI REACT (sidebar, 30+ tabs, charts, résumés)
Lignes 14,500–15,157 : TESTS EMBARQUÉS (436 engine tests, 54 catégories, 0 failures)
```

### Pipeline Quiz → Paiement → Rapport (PRODUCTION)
```
Quiz thin client (805 lignes, zero IP)
  → Paywall avec preview blurred
  → POST /api/checkout → Stripe Checkout hébergé
  → Paiement réussi → webhook checkout.session.completed
  → POST /api/webhook (www.buildfi.ca)
  → Vérifie signature Stripe
  → Extrait quiz answers de session.metadata (chunked JSON)
  → translateToMC(quizAnswers)      — ~40 heuristiques, smart defaults
  → runMC(params, 5000)             — t-Student df=5, fat tails (~2.3s serverless)
  → extractReportData(mc, params)   — objet D
  → buildAIPrompt(D, params, fr, quiz) → {sys, usr}
  → callAnthropic(sys, usr)         — claude-sonnet-4, 12 JSON slots (or {} if no key/error)
  → renderReportHTML(D, mc, quiz, lang, ai, costDelay, minReturn) — report v6
  → put() → Vercel Blob (rapport HTML)
  → sendReportEmail() → Resend (lien vers rapport)
  → Client redirigé vers /merci
```

### AI Narration Flow
```
buildAIPrompt(D, params, lang, quiz)
  → DerivedProfile (anxiety, discipline, literacy, friction, theme)
  → RenderPlan (behavioral signals from ai-profile.ts)
  → System prompt: AMF compliance, anti-hallucination, micro-structure
  → User prompt: enriched with D data + quiz answers
  → Anthropic API call (claude-sonnet-4)
  → Parse JSON → sanitizeAISlots() (ai-constants.ts)
  → 12 slots: snapshot_intro, savings_context, debt_impact, gov_explanation,
    gap_explanation, tax_insight, longevity_good, longevity_watch,
    obs_1, obs_2, obs_3, upgrade_hook
  → Fallback: {} if ANTHROPIC_API_KEY missing or API fails
  → /api/ai-narrate exists as standalone test endpoint (not called by webhook)
```

### Report HTML v6 (lib/report-html.js — 1,421 lignes)
```
Key functions:
  extractReportData(mc, params)    → objet D (all computed data)
  buildAIPrompt(D, params, lang, quiz) → {sys, usr} prompts
  buildWhatIf(D, mc, params)       → what-if scenarios
  buildSnapshot5yr(D)              → 5-year projection table
  buildHeuristics(D)               → heuristics disclosure
  buildPDfallback(D)               → fan chart SVG (progressive spread)
  calcCostOfDelay(D, params)       → cost of delay calculation
  calcMinViableReturn(D, params)   → minimum viable return
  buildPriority(D)                 → priority items
  gradeInfo(D)                     → grade ring (A+ to F) with colors/labels
  renderReport_v6(D, mc, quiz, lang, ai) → full HTML string
  renderReportHTML(...)            → wrapper that selects v5/v6

v6 features (March 2026 polish):
  - Grade ring with --amr amber-ring color, client-friendly labels
  - Fan chart with progressive spread (yearFrac accumulation)
  - TL;DR 3 data-driven bullets (vulnYrs, withdrawalRatePct, debts)
  - KPI cards, donut income chart, what-if scenarios
  - 5-year snapshot table with QPP start row highlight (green bg + badge)
  - Heuristics disclosure, cost of delay, min viable return
  - Mini TOC with 7 section pill anchors (hidden in print)
  - Hover tooltips on jargon (Pessimiste P5, taux effectif, taux marginal)
  - Print theme: gold→brown, break-inside:avoid, orphans/widows
  - tabular-nums on all numeric elements
  - Disclaimer restyled: cream bg + left border, left-aligned
  - "Données utilisées" + version footer block
  - Mobile spacing (@media max-width:600px)
  - Upsell → "Prochaine étape" with expected result text
```

### Quiz thin client — quiz-essentiel.html
```
805 lignes total (était 3,227 — 75% retiré)
Zero fonction MC côté client
generateMockPreview() pour paywall (données fake)
Stripe checkout intégré via fetch /api/checkout
Quiz answers envoyées dans session.metadata (chunked si >500 chars)
Logo inline fallback + /logo.js shared
```

### Webhook — app/api/webhook/route.ts
```
maxDuration: 60s
runtime: nodejs
Signature Stripe vérifiée
Quiz answers reassemblées depuis metadata chunks
AI narration: calls Anthropic API (claude-sonnet-4) → 12 JSON slots
  → Falls back to {} if ANTHROPIC_API_KEY missing or API error
PDF generation: DÉSACTIVÉ (@sparticuz/chromium incompatible Vercel)
Email tags: DÉSACTIVÉS (erreur validation ASCII)
Blob access: "private" (store privé — à migrer vers public)
```

### Debt Tool (app/outils/dettes/page.jsx — 1,475 lignes)
```
Standalone React SPA, dark theme (DK palette), bilingual FR/EN
"use client" — no SSR

UX Structure (March 2026 restructure):
  - Welcome banner (no debts state)
  - Inventory: debts → portrait global → collapsible "Aller plus loin"
    (mortgages, financial context, couple mode)
  - showAdvanced auto-opens on mount if existing data (useEffect)
  - 6 tabs: [Inventaire, Stratégies, Simulateur, Calendrier | Rembourser vs Investir, Coût réel]
  - Separator at index 4 (core path vs advanced)
  - Tabs grayed (opacity 0.4) when no payable debts
  - Micro-CTAs at end of Simulator → Calendar, Calendar → True Cost

7 strategies: avalanche, snowball, hybrid, cashflow, utilization, interest_dollar, custom
basePayoff uses selectedStrategy (not hardcoded avalanche)
Marginal rate label shows "(est.)" in Repay vs Invest
localStorage: buildfi_debts_v1, export/import JSON
Components: Card, StatBox, InputRow, NumInput, SectionTitle, DebtChart — no new ones
Protégé: Disallow /outils/ dans robots.txt
200 tests (tests/debt-tool-tests.js), 0 failures required
```

### Guides éducatifs (bonus)
```
guide-101-les-bases-de-vos-finances.pdf   — 13 pages, bonus Essentiel
guide-201-optimiser-votre-retraite.pdf    — 19 pages, bonus Intermédiaire + Expert
  → Sources Python: guide_101.py (v8), guide_201_301.py (v2)
  → Audit AMF: 0 infraction, disclaimers début + fin
  → Livraison: pièce jointe email post-achat (À INTÉGRER)
```

### Le Quad d'Initialisation — CRITIQUE
4 endroits doivent avoir les MÊMES valeurs par défaut. Toute divergence = bug:
1. `useState(X)` — default nouveau utilisateur
2. `applyProfile(p)` — default si profil ne définit pas le champ
3. `_mcLatestParams` — params envoyés au moteur (bypass stale closure React)
4. Bouton Reset — remet tout à zéro

### Champs MC — Réel vs Nominal
| Champ | Règle |
|-------|-------|
| `rMedF` — patrimoine médian réel | **Toujours afficher celui-ci** |
| `medF` — patrimoine médian nominal | Tables détaillées seulement |
| `rP25F` / `rP75F` — percentiles réels | Fan chart |
| `medRuin` / `p5Ruin` — âge de ruine | Si succ < 95% |
| `rMedEstateNet` — héritage net réel | Section succession |

---

## 2. QUIZ INPUT MAPPING

### Smart Defaults
| Condition | Default | Rationale |
|-----------|---------|-----------|
| Employeur = Gouvernement | penType:'db', ~2%/yr | Moyenne DB gouvernemental |
| Employeur = Autonome | penType:'none' | Pas de matching |
| Épargne, âge <35 | 20/50/30 REER/CÉLI/NR | Jeune → favorise CÉLI |
| Épargne, âge 35–50 | 45/35/20 | Équilibre |
| Épargne, âge 50+ | 55/25/20 | Proche retraite → REER |
| Dette CC | rate: 19.99%, min: max(bal×0.02, 25) | Standard CA |
| Risque conservateur | allocR:0.50, eqRet:6.5% | |
| Risque croissance | allocR:0.85, eqRet:7.5% | |

### Upgrade Hooks dans le rapport (upsell dynamique)
| Déclencheur | Teaser affiché | Tier cible |
|-------------|----------------|-----------|
| Propriétaire | "Votre valeur immobilière n'est pas incluse dans cette analyse" | Intermédiaire |
| Couple | "Le fractionnement de revenus pourrait réduire vos impôts" | Intermédiaire |
| Dette > $30K | "Votre plan de remboursement a plusieurs chemins d'optimisation" | Intermédiaire |
| Succès < 70% | "Votre plan pourrait bénéficier d'ajustements — testez différents leviers" | Expert |

---

## 3. STANDARDS DE CODE

### DO
- Tokens de style: `FS.sm`, `CL.tx2`, `SP.md`
- Afficher `rMedF` (réel) — jamais `medF` sauf tables détaillées
- Conditionnel pour toutes projections: FR: pourrait/serait, EN: would/could
- Langage observationnel: "Cette analyse indique..." jamais "Vous devriez..."
- Grade 10 reading level
- Bilingue FR/EN dans chaque text box
- Zéro acronyme dans Essentiel — tout en clair, province-aware (RRQ vs RPC)
- Fallbacks statiques 100% si API Anthropic échoue
- Propager chaque default aux 4 endroits du quad d'initialisation

### DON'T
- Jamais inline `calcTax()` ou `calcQPP()` dans le JSX
- Jamais de langage directif (should, devriez, recommandons, il faut)
- Jamais toucher au moteur sans vérifier les 453 tests
- Jamais d'emoji dans les labels, textes UI, ou plans
- Jamais de big bang — feature par feature
- Jamais plier sous la pression — défendre les positions techniques
- Jamais couper/simplifier/supprimer sans approbation explicite
- Jamais inventer des détails dans l'AI — seulement données quiz (win, worries, fix, confidence)

### Profils canary (résultats attendus)
| Profil | Succès | |
|--------|--------|--|
| risque58, fragile60 | ~0% | Canary — doit être 0 |
| earlyFIRE | ~13% | |
| youngDebt | ~19% | |
| lateStart | ~56% | |
| youngPro | ~85% | |
| standard | ~95% | Couple QC solide |

---

## 4. DÉCISIONS TECHNIQUES

| ID | Décision | Statut |
|----|----------|--------|
| DT-001 | Architecture: quiz HTML thin client + Next.js API backend | Actif |
| DT-002 | Monte Carlo 5,000 sims t-Student df=5 | Actif, non négociable |
| DT-003 | Web Worker pour calcul MC off-thread (planner.html seulement) | Actif |
| DT-004 | setTimeout(300) + _mcProfileDirty — race condition React (R6) | Actif, disparaît en P4 |
| DT-005 | Engine clamps — le moteur est son propre garde-fou | Actif, non négociable |
| DT-006 | Tests embarqués dans le HTML — 453 tests, 54 catégories | Actif |
| DT-007 | Langage observationnel AMF — grep automatique dans tests | Actif, non négociable |
| DT-008 | Rapport HTML hébergé (Vercel Blob) — PDF côté client via window.print() | Actif — remplace Puppeteer |
| DT-009 | Single API call narrator — 12 slots JSON, claude-sonnet-4 | Actif |
| DT-010 | Conditionnel obligatoire FR/EN | Actif, non négociable |
| DT-011 | Zéro acronyme Essentiel, province-aware | Actif |
| DT-012 | Fan chart interpolé en demo — vraies données MC en prod | Temporaire |
| DT-013 | Upsell soft en fin de rapport uniquement — "Prochaine étape" | Actif |
| DT-014 | AI narration: buildAIPrompt + DerivedProfile + sanitizeAISlots, fallback {} | **COMPLÉTÉ** |
| DT-015 | Quiz thin client — zero MC côté client | Actif |
| DT-016 | Clé API Anthropic JAMAIS dans le code — Vercel env vars uniquement | Actif, non négociable |
| DT-017 | Debt tool React standalone — "use client", pas de SSR | Actif |
| DT-018 | Guides PDF générés via Python/reportlab — sources versionnées | Actif |
| DT-019 | /outils/ protégé par robots.txt — bonus clients seulement | Actif |
| DT-020 | Stripe webhook URL: www.buildfi.ca (pas buildfi.ca — 307 redirect) | Actif |
| DT-021 | Stripe automatic_tax: désactivé — prix HT, taxes au checkout quand inscription TPS/TVQ active | Actif |
| DT-022 | app/page.tsx: redirect() (pas permanentRedirect — évite cache browser) | Actif |
| DT-023 | Engine syncé: lib/engine/index.js = planner_v2 (2,426 lignes, 38 exports) | Actif |
| DT-024 | Report v6 with progressive fan chart spread (yearFrac accumulation) | **NOUVEAU** |
| DT-025 | Debt tool progressive disclosure: welcome → debts → portrait → collapsible advanced | **NOUVEAU** |
| DT-026 | Debt tool tab graying when no payable debts (opacity 0.4) | **NOUVEAU** |
| DT-027 | Email template table-based layout for email client compatibility | **NOUVEAU** |

---

## 5. DÉCISIONS BUSINESS

| ID | Décision | Statut |
|----|----------|--------|
| DB-001 | One-time payment — différenciateur vs ffPro.ca | Décidé |
| DB-002 | Québec FR en premier | Décidé |
| DB-003 | Organique d'abord, pubs ensuite | Décidé |
| DB-004 | Ess $29, Inter $59, Expert $129 one-time, renouvellement $29/an | Décidé |
| DB-005 | Entreprise individuelle (CCPC si >30K$/an) | Décidé |
| DB-007 | Stripe Checkout hébergé | Décidé |
| DB-009 | Compte bancaire séparé dès jour 1 | Décidé, non négociable |
| DB-010 | TPS/TVQ : prix HT, taxes au checkout quand inscription active | Décidé |
| DB-011 | Aucun remboursement — produit numérique, livraison instantanée | Décidé, non négociable |
| DB-012 | Bonus livrés par email post-achat (guide PDF + lien debt tool) | Décidé |
| DB-013 | Rapport livré par lien web (pas PDF attaché) — standard industrie SaaS | Actif |
| DB-014 | 2e rapport à 50% — coupon Stripe 90 jours, même tier ou inférieur | Décidé |
| DB-015 | Programme referral — 50% off référent / 15% off référé / paliers 3-5 | Décidé |
| DB-016 | Alertes marché retirées — pas l'ADN BuildFi, risque AMF | Décidé |
| DB-017 | Veille réglementaire interne → articles SEO + bannière in-app (pas push email) | Décidé |

---

## 6. CONFORMITÉ AMF

### Disclaimer obligatoire dans chaque rapport
**FR**: "Cet outil est fourni à titre informatif et éducatif seulement. Il ne constitue en aucun cas un conseil financier, fiscal, juridique ou de placement personnalisé. Les projections sont basées sur des hypothèses qui peuvent ne pas se réaliser. Consultez un planificateur financier certifié (Pl. Fin.) ou un conseiller autorisé avant de prendre toute décision financière importante."

**EN**: "This tool is provided for informational and educational purposes only. It does not constitute personalized financial, tax, legal or investment advice. Projections are based on assumptions that may not materialize. Consult a certified financial planner or licensed advisor before making any important financial decisions."

### Mots interdits — grep automatique dans les tests
```
devriez / you should / recommandons / we recommend
considérez / consider / priorisez / prioritize
assurez-vous / make sure / il faut que vous
vous aurez / you will have / vous recevrez / you will receive
optimisez / optimize / optimiser / optimisation (dans contexte directif)
plan d'action / action plan (implique conseil personnalisé)
recommandation(s) / recommendation(s)
```

### Termes approuvés (remplacements)
```
"Recommandations" → "Observations", "Ce que cela signifie"
"Plan d'action" → "Points d'attention", "Leviers identifiés"
"Optimiser" → "Ajustements possibles", "Pistes à explorer"
"Vous devriez" → "Cette analyse suggère", "Les données indiquent"
```

### Chemins audités vs non-audités
**Audités (R1–R18)**: REER/FERR, CÉLI, NR, CELIAPP, LIRA, RRQ/QPP, PSV/OAS, SRG/GIS, fiscalité 13 provinces, retraite solo et couple de base, régimes DB/DC.

**NON audités — disclaimer spécifique requis si activé**: CCPC extraction, IPP, CELIAPP→achat, Smith Manoeuvre, multi-propriété, exits PE/PM, RREGOP.

### Checklist avant lancement
- [ ] Grep mots interdits (liste élargie ci-dessus) → 0 résultat
- [ ] Conditionnel dans toutes les projections
- [ ] Disclaimer complet dans chaque rapport
- [ ] Disclaimer complet dans chaque guide PDF
- [ ] Zéro acronyme non défini dans Essentiel
- [ ] Footer site web avec disclaimer
- [ ] Pages légales publiées (P0.7)
- [ ] Landing page v9 audit AMF/BSIF — ✅ complété 2026-02-27
- [ ] Opinion AMF formelle avant mise à l'échelle (P3.5)

---

## 7. HISTORIQUE DES AUDITS

**Score actuel: 453 tests moteur, 54 catégories, 0 failures + 200 tests debt tool**

| Audit | Contenu | Résultat |
|-------|---------|---------|
| R1–R5 | calcTax 13 provinces, QPP/RRQ, OAS, GIS, withdrawal, couple, estate | 342→453 tests, fiables |
| R6 | Race condition React → setTimeout(300) + _mcProfileDirty flag | Fix critique |
| R7 | Phantom withdrawals — 8 paths affichaient retraits quand patrimoine = 0$ | Fix |
| R8 | Display audit exhaustif — 17/17 data paths engine→screen | Fix |
| R9–R10 | Tab audit visuel, 56 composants, formatting tokens | Fix |
| R11 | MC KPI accuracy — double-count revenus couple | Fix critique |
| R12 | **Profile defaults** — 5 defaults toxiques, youngPro 18%→85% | Fix le plus impactant |
| R13 | AMF compliance — 11 instances converties, grep auto | Fix |
| R14–R15 | runMC core loop 1,568 lignes + remaining tabs 100% coverage | Fix |
| R16–R18 | Property tests, PWA, text audit 3,624 checks | Fix |
| Sessions 4–5 | Rapport Essentiel v4 — 181 accents, conditionnel, zéro acronyme | ✅ |
| Sessions 6+ | Quiz-essentiel — 7 écrans, translator, mini-MC, rapport 1:1 | ✅ |
| Intermédiaire | 18 scénarios, 87 assertions | ✅ |
| 2026-02-27 | **Landing v9 audit AMF/BSIF** — 0 terme interdit | ✅ |
| 2026-02-27 | **Debt tool** — 200 tests, 161 paires bilingues, 0 accent manquant | ✅ |
| 2026-02-27 | **Guides 101 + 201/301** — audit AMF 0 infraction | ✅ |
| 2026-02-27 | **Engine sync** — lib/engine/index.js = planner_v2, 453 tests, optimizeDecum ajouté | ✅ |
| 2026-02-27 | **Pipeline E2E** — Quiz→Stripe→Webhook→MC→Blob→Email validé en prod | ✅ |
| 2026-02-28 | **AI narration P1.4** — buildAIPrompt + DerivedProfile + sanitizeAISlots + Anthropic call wired in webhook | ✅ |
| 2026-03-01 | **Report v6 polish** — 15 rendering fixes (grade ring, fan chart, TL;DR, print theme, tooltips, TOC, mobile) | ✅ |
| 2026-03-01 | **Debt tool UX restructure** — progressive disclosure, tab graying, micro-CTAs, basePayoff fix, marginal rate label | ✅ |
| 2026-03-01 | **Email template refactor** — table-based, bilingual, AMF compliant | ✅ |
| 2026-03-02 | **S1 Expert infra** — KV Upstash, auth magic link, rate limiting, checkout multi-tier, webhook Expert | ✅ |
| 2026-03-03 | **Audit complet 11 phases** — 9 blockers, 12 high-priority, 21 correctifs appliqués | ✅ |
| 2026-03-03 | **Panel 12 experts** — score moyen 71.1/100 YELLOW, GO conditionnel soft launch | ✅ |
| 2026-03-03 | **Engine audit** — 17 nouveaux tests (436→453), GIS/QC bracket fixes, sync 3 files | ✅ |
| 2026-03-03 | **Security hardening** — CSP headers, rate limiting magic-link, admin alerts, HTTP 500 on errors | ✅ |

| 2026-03-04 | **S2-S10 Expert sessions** — Quiz Expert, API simulate/optimize, Simulateur, Workflows, Reports, Exports, Landing, Compliance, Full audit | ✅ |
| 2026-03-04 | **Terms acceptance checkbox** — Quebec CPA compliance, 3 quiz pages + checkout API server validation | ✅ |
| 2026-03-04 | **Cookie consent on quiz pages** — Law 25, localStorage gate, bilingual consent bar | ✅ |

### Prochains audits
- **R19** (P1.6): Quiz UX — mobile iPhone SE, drop-offs, test "ma mère comprendrait"
- **R20** (P1.6): Rapport Essentiel — 10 profils, chaque $ tracé au moteur, grep AMF (liste élargie)
- **R21** (P2.4): Intermédiaire — chemins immo + CCPC avec CPA

---

## 8. COMPLIANCE DECISIONS

### Terms Acceptance Checkbox (Quebec Consumer Protection Act)
- **Why**: Quebec CPA requires clear acceptance of terms before purchase of digital goods. Without it, the "no refund" policy (conditions.html §5) and liability cap (avis-legal.html §6) are legally unenforceable.
- **Where**: All 3 quiz pages (quiz-essentiel.html, quiz-intermediaire.html, quiz-expert.html) + server validation in `app/api/checkout/route.ts`
- **What**: Checkbox between email input and checkout button, links to conditions.html + avis-legal.html. `termsAccepted: true` sent in fetch body. Server rejects non-addon requests without it.
- **Addon exemption**: `type=addon` skipped because user already accepted terms at initial Expert purchase.

### Cookie Consent (Law 25 — Quebec)
- **Why**: Law 25 (Act respecting the protection of personal information in the private sector) requires explicit consent before collecting personal information via analytics cookies. PostHog fires on page load without consent = violation.
- **Where**: index.html + expert.html + all 3 quiz pages
- **How**: `localStorage['buildfi_consent']` gate. Consent bar shown on first visit. PostHog init and capture gated on `consent === 'yes'`.
- **Pattern**: IIFE checks localStorage, creates fixed-bottom bar with Accept/Decline buttons, sets localStorage value.

### Privacy Officer (Law 25 §3.5)
- **Requirement**: Law 25 requires designation of a person responsible for protection of personal information.
- **Designated**: "Le dirigeant de BuildFi Technologies inc." in confidentialite.html.

---

## 9. LEÇONS APPRISES

- Audit moteur sans audit display = incomplet. Les deux sont requis.
- Les profils qui échouent révèlent plus de bugs que ceux qui réussissent.
- Le quad d'initialisation est non négociable — 4 endroits, mêmes valeurs.
- Le jargon statistique nuit — traduire en langage humain.
- Engine clamps > UI validation. Le moteur est son propre garde-fou.
- Tracer chaque $ au moteur — surface-level checking manque les erreurs critiques.
- Ne jamais être yes-man. Défendre les positions techniques.
- Ne jamais couper/simplifier/supprimer sans approbation explicite. Porter 1:1 d'abord.
- 3 sessions parallèles = risque de désynchronisation des docs. Consolider immédiatement après.
- Les mots interdits AMF doivent être élargis proactivement.
- **Puppeteer/@sparticuz/chromium ne fonctionne pas sur Vercel serverless** — ne pas réessayer sans solution validée.
- **Vercel env vars**: toujours redéployer après modification (les vars ne sont pas hot-reloaded).
- **Stripe webhook URL**: utiliser www.buildfi.ca (buildfi.ca fait 307 redirect → perd le POST body).
- **DNS propagation**: les records Resend (DKIM, SPF) peuvent prendre 24h — ne pas paniquer si la vérification échoue immédiatement.
- **P0 fixes can be lost if working from stale file versions** — always verify critical fixes (basePayoff strategy, marginal rate label) are present after editing.
- **OneDrive can lock .next/ files** — run `rm -rf .next` before build if EPERM errors occur.
