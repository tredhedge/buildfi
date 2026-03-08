# TECH-REFERENCE.md
> Architecture, décisions de code, audits, conformité AMF.
> Mis à jour: 2026-03-08 — v17 (brand refresh logo system, defer race condition fix, landing page UX)

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

### AI Narration Flow (v2 — 2026-03-05)
```
buildAIPrompt(D, params, lang, quiz)
  → DerivedProfile (anxiety, discipline, literacy, friction, theme)
  → RenderPlan (tone, emphasizeDebt/Fees/Gov, worstCasePlacement, showRiskWindow)
  → Voice matrix: 9 combos (tone × literacy) with qualitative writing instructions
  → Composite signals: conservativeGrowthTrap, debtDragOverSavings, mortgageInRetirement,
    highEffortLowResult, timeLeverage, preRetUrgency, tfsaHeavy, rrspHeavy, riskMismatch
  → Narrative arc: security / growth / optimization / catch-up
  → Worry combos: existential / estate-optimizer / investor-anxiety / max-anxiety / confident
  → Dynamic obs_2: 7 conditional branches based on profile dominance
  → Jargon ban: 8 forbidden terms → plain-language replacements (grade 10)
  → External average ban: only profile-specific DATA, never "la plupart"
  → Per-slot implication hints: computed numbers embedded in slot instructions
  → FIRE bridge data: yearsWithoutGov, bridgeCost, bridgeSurvival
  → Succession note: 5 contextual angles (worry/couple/estate/young/default)
  → System prompt: AMF compliance, anti-hallucination, micro-structure
  → User prompt: enriched DATA block + quiz answers + signals
  → Anthropic API call (claude-sonnet-4)
  → Parse JSON → sanitizeAISlots() (ai-constants.ts)
  → 13 slots: snapshot_intro, savings_context, debt_impact (conditional),
    gov_explanation, gap_explanation, tax_insight, longevity_good,
    longevity_watch, obs_1, obs_2, obs_3, upgrade_hook,
    succession_note (conditional)
  → Fallback: {} if ANTHROPIC_API_KEY missing or API fails
  → /api/ai-narrate exists as standalone test endpoint (not called by webhook)
```

### Report HTML v6 (lib/report-html.js)
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
  bridge(fr, en)                   → bilingual narrative connector (italic, muted, grade-10)
  renderReport_v6(D, mc, quiz, lang, ai) → full HTML string
  renderReportHTML(...)            → wrapper that selects v5/v6

Report sections (current order):
  1. Note (grade ring/donut) + dynamic grade action hint micro-phrase + "Ce que vous avez dit" box
     + objective callout (if successRate < 80% → "Votre objectif: {retAge} ans, {retIncome}$")
  2. Profil (+ single-person callout if couple=yes) [bridge → S3]
  3. Projection + Min Viable Return card [bridge → S4]
  4. Revenus à la retraite [bridge → S5]
  5. Épargne + Cost of Delay card [bridge → S6]
  6. Priorité (CÉLI vs REER ranking) + contextual debt tool CTA (if debtBal > 0) [bridge → S8]
  7. Et si... (what-if cards)
  ── Upsell CTA (peak engagement, absolute buildfi.ca/checkout URLs, target="_blank") ──
     "Jusqu'à 16 sections adaptées à votre situation complète" (Inter upsell)
  8. Fiscalité & Frais [bridge after]
  9. Plan aux 5 ans
  10. Hypothèses (CSS Grid 1fr 220px 1fr, white-space:nowrap, gap 32px)
  11. Méthodologie (details/summary accordion)
  ── Disclaimer, Resources (cadeau gold gradient, hover cards), Feedback, Referral (Option A), Print, Footer ──

Nav pills: Note, Profil, Projection, Renforcer, Évolution, Fiscalité, Hypothèses (7 pills + section IDs)

Narrative arc (2026-03-06):
  - bridge() helper: italic muted connector between sections (bilingual)
  - 6 bridges: S2→S3, S3→S4, S4→S5, S5→S6, S6→S8 (debt/no-debt variants), S8 closing
  - "Ce que vous avez dit" box: recap of 3 quiz answers (age/retAge/risk) in gold callout
  - Objective callout: shown if successRate < 80%, anchors the gap to stated goal
  - Upsell text updated: "Jusqu'à 16 sections adaptées à votre situation complète"

v6 features (March 2026 polish):
  - Grade ring with --amr amber-ring color, client-friendly labels
  - Fan chart with progressive spread (yearFrac accumulation)
  - TL;DR 3 data-driven bullets (vulnYrs, withdrawalRatePct, debts)
  - KPI cards, donut income chart, what-if scenarios
  - 5-year snapshot table with QPP start row highlight (green bg + badge)
  - Heuristics disclosure, cost of delay, min viable return
  - Hover tooltips on jargon (Pessimiste P5, taux effectif, taux marginal)
  - Print theme: gold→brown, break-inside:avoid, orphans/widows
  - tabular-nums on all numeric elements
  - Disclaimer restyled: cream bg + left border, left-aligned
  - "Données utilisées" + version footer block
  - Mobile spacing (@media max-width:600px)
  - $0 wealth rows: red background + "portefeuille épuisé" label
  - Grid gaps widened (methodology 2-col: 36px)
  - Bottom Expert Simulator upsell removed (too pushy for Essentiel tier)

8 chantiers (2026-03-04 polish):
  C1: Upsell buttons → absolute buildfi.ca/checkout URLs + target="_blank"
  C2: Hypothèses grid → CSS Grid 1fr 220px 1fr + white-space:nowrap (gap 32px)
  C3: Resources block → premium "cadeau" style with gold gradient, hover cards
  C4: Nav pills → added "Renforcer" + "Évolution" pills + section IDs
  C5: Grade action hint → dynamic micro-phrase under badge
  C6: Table $0 rows → red background + "portefeuille épuisé" label
  C7: Methodology → details/summary accordion
  C8: Referral banner → Option A (no misleading "votre lien")
```

### Report HTML Inter (lib/report-html-inter.js — 1,003+ lignes)
```
16 sections: Bilan, Profil, Trajectoire, Revenus, Épargne, Immo, CCPC, Dettes,
             Fiscalité, Stratégies, Simulation stress, Succession, Bilan annuel,
             Hypothèses, Méthodologie, Footer verdict

Key pattern: bridge(fr, en) — same helper as Essentiel, narrative connectors between sections
Data source: params (direct Object.assign fields) NOT params._quiz for bizRemun/bizSalaryPct
CCPC display fix (2026-03-06):
  - params.bizRemun (not params._quiz.bizRemun) — lives in params via bizParams Object.assign
  - params.bizSalaryPct already 0-1 scale (divided by 100 in translator) → display as Math.round(val * 100)%
  - Before fix: CCPC strategy always showed "Dividendes purs" + salary % always 50%

quiz-translator-inter.ts (85 fields → 120 MC params):
  - QPP heuristic (2026-03-06): if quiz provides qppAge → passthrough (clamped 60-70),
    else derive from retAge: Math.max(60, Math.min(70, retAge < 60 ? 65 : retAge))
  - OAS heuristic: if quiz provides oasAge → passthrough (clamped 65-70),
    else derive from retAge: Math.max(65, Math.min(70, retAge < 65 ? 65 : retAge))
  - Matches Essentiel translator 1:1 (was defaulting to hardcoded 65 regardless of retAge)
  - melt: false (hardcoded — engine handles optimal drawdown, no decaissement question)
  - wStrat: "optimal" (engine handles strategy selection)
  - bizSalaryPct stored as fraction 0-1: (a.bizSalaryPct || 50) / 100
```

### Report HTML Décaissement (lib/report-html-decum.js)
```
13 sections: Note (SVG donut), Profil, Trajectoire, Revenus, Fiscalité,
             Décaissement optimal, Flexibilité, Stress test, CPP timing,
             Succession, Observations, Hypothèses, Méthodologie

Key functions:
  extractReportDataDecum(mc, params, meltdownResults, cppTimingResults)
  renderReportDecum(D, mc, quiz, lang, aiSlots, meltdownResults, cppTimingResults)

Features:
  - SVG donut chart with stroke-dasharray animation (success rate visualization)
  - SVG logo (not text-based)
  - 12 AI slots with static fallbacks (never empty strings)
  - validateMC guard at top
  - bridge() narrative connectors between sections
  - AMF-compliant: "Ordre de décaissement modélisé" (not "optimal")
  - P10/P90 → "Scénario pessimiste (10%)" / "Scénario optimiste (90%)"
  - OAS recovery tax threshold ($90,997 in 2026)
  - RRIF minimum withdrawal table
  - Meltdown scenarios (market crash year 1 + year 5)
  - CPP timing comparison (60 vs 65 vs 70)
  - Guyton-Klinger spending flexibility rules display
  - Print theme: gold→brown, break-inside:avoid
```

### Shared Report Helpers (lib/report-shared.ts — 181 lines)
```
Single source of truth for report helpers shared across Ess/Inter/Decum renderers.
Extracted 2026-03-08 to eliminate duplicated logic across 3 files.

Exports:
  gradeFromSuccess(pct)     → Grade (A+ through F, 8-level scale)
  gradeColor(grade)         → hex color (#2A8C46 green, #4680C0 blue, #E0882A amber, #CC4444 red)
  successColor(succ)        → traffic-light color (legacy, ratio 0-1)
  gradeLabel(pct, fr)       → human-readable ("Très solide" / "Very solid", etc.)
  fmtDollars(n, fr)         → locale-formatted with " $" suffix (uses toLocaleString)
  fmtNumber(n, fr)          → locale-formatted (no suffix)
  fmtPct(n)                 → "4.5 %" format
  fmtPctRaw(n)              → rounded to 1 decimal (numeric)
  fmtPctInt(n)              → "72%" format
  escHtml(s)                → HTML entity escaping (&, <, >, ")
  probTranslation(pct, fr, tier) → 9-bracket human-readable probability (tier-aware wording)

Note: f$() in Inter and fDol() in Ess are NOT extracted — they use regex-based
formatting with different separator chars vs fmtDollars (toLocaleString).
Replacing them would change report output. Left as local functions.

Tests: tests/report-shared.test.ts (91 tests)
```

### Fiscal Constants Sync (tests/fiscal-constants-sync.test.ts — 135 tests)
```
Verifies that engine inline constants (lib/engine/index.js lines 16-56)
match the reference copy in lib/constants/fiscal-2026.ts.

Coverage:
  - 14 federal constants (brackets, rates, personal, OAS, GIS, QPP, TFSA)
  - 13 provinces × 9 fields (brackets, rates, deduction, abatement, credits)
  - Metadata validation (year, verifiedDate, sources)

Run: npx tsx tests/fiscal-constants-sync.test.ts
Purpose: Catch divergence when annual fiscal updates are applied to one file but not the other.
```

### Quiz Décaissement — quiz-decaissement.html
```
13 screens (Screen 0 welcome + 12 quiz screens) · thin client · zero MC côté client
Screen 0: welcome + trust badges (5000 scenarios, Canadian data, no account) + documents prep card
validateStep(): age 50-95, retAge > age, retIncome > 0
Confirm screen: warnings for withdrawal rate, savings gaps, allocation/age mismatch
4 responsive breakpoints: 768px tablet, 1024px desktop, 640px mobile, 400px small mobile
Range slider: 28px thumb, 8px track
Terms acceptance checkbox (CPA compliance)
Cookie consent bar (Law 25)
Logo "lg" size
Pricing: 29,50 $ (LAUNCH50 applied)
```

### Décaissement AI Prompt (lib/ai-prompt-decum.ts)
```
buildAIPromptDecum(D, params, lang, quiz, meltdownResults, cppTimingResults)
  → computeDerivedProfile() + computeRenderPlan() + computeCompositeSignals()
  → Voice matrix: 9 combos (tone × literacy: warm/balanced/data-forward × basic/intermediate/advanced)
  → 4 narrative arcs: sustainability, resilience, optimization, caution
  → 7 worry patterns: longevity, market-crash, inflation, spending, oas-clawback, estate, healthcare
  → Dynamic obs routing: 8 topic candidates priority-ordered by profile signals
    (couple-coordination, withdrawal-sustainability, rrif-conversion, oas-threshold,
     spending-volatility, home-equity, debt-in-retirement, unique-insight)
  → Enriched DATA block: profile, wealth, income, results, allocation, spending, meltdown, cppTiming, estate, signals
  → Per-slot hints with anchor/implication/nuance structure
  → 12 slots: snapshot_intro, longevity_context, spending_flex_obs, income_mix_obs,
    tax_timing_obs, meltdown_obs, cpp_timing_obs, sequence_obs, estate_obs, obs_1, obs_2, obs_3
  → Full AMF compliance: filler ban, numeric safety, accent enforcement, conditional tense
  → Fallback: {} if ANTHROPIC_API_KEY missing or API error

quiz-translator-decum.ts:
  - QPP factor: continuous function (7.2%/yr early penalty, 8.4%/yr late bonus)
  - cQppAge: partner age if 60+, else 65
  - deathAge: 105 (stochMort hard cap, not 93/95 medians)
  - allocR: capped [0.30, 0.75], glide:true, glideSpd:0.01
  - GK flexibility: rigid→gkOn:false, moderate→gkOn:true+gkMaxCut:0.20, flexible→gkOn:true+gkMaxCut:0.25
  - stochMort:true, fatT:true, wStrat:"optimal"
  - Meltdown target: 58523 (first federal bracket 2026)
  - eqVol: 0.16, bndVol: 0.06
```

### Décaissement Pipeline (Webhook)
```
handleDecaissementPurchase() in app/api/webhook/route.ts:
  → translateDecumToMC(quizAnswers) → params
  → 6 MC runs:
    1. Base run: 5000 sims (full fidelity)
    2. Meltdown year 1: 1000 sims (market crash at retirement start)
    3. Meltdown year 5: 1000 sims (market crash 5 years into retirement)
    4. CPP at 60: 1000 sims (early pension)
    5. CPP at 65: 1000 sims (standard pension)
    6. CPP at 70: 1000 sims (deferred pension)
  → extractReportDataDecum(mc, params, meltdownResults, cppTimingResults)
  → buildAIPromptDecum(D, params, lang, quiz, meltdownResults, cppTimingResults)
  → callAnthropic(sys, usr) → sanitizeAISlotsDecum()
  → renderReportDecum(D, mc, quiz, lang, aiSlots, meltdownResults, cppTimingResults)
  → Blob upload → Resend email → createFeedbackRecord (tier: "decaissement")
```

### Quiz thin client — quiz-essentiel.html
```
Zero fonction MC côté client
generateMockPreview() pour paywall (données fake)
Stripe checkout intégré via fetch /api/checkout
Quiz answers envoyées dans session.metadata (chunked si >500 chars)
Logo: /logo.js shared (deferred) — injection inside DOMContentLoaded, NOT outside
QPP deferral question added in Step 1 (qppAge)
partnerWork added to STATE
Single-person only: couple=yes → callout, no couple analysis
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
Blob access: "public" (store opérationnel — rapports accessibles par lien)
```

### Debt Tool (app/outils/dettes/page.jsx — 1,863 lignes)
```
Standalone React SPA, dark theme (DK palette), bilingual FR/EN
"use client" — no SSR

UX Structure (March 2026 restructure + cherry-picks):
  - Welcome banner (no debts state) + QuickStart example presets (Essentiel / Intermédiaire)
  - Health signals bar: detects util>=80%, pay<interest, pay<minPay (useMemo)
  - NextBestAction card: guided fix with auto-correct + scroll-to-debt focus
  - Inventory: debts → portrait global → collapsible "Aller plus loin"
    (mortgages, financial context, couple mode)
  - showAdvanced auto-opens on mount if existing data (useEffect)
  - 6 tabs: [Inventaire, Stratégies, Simulateur, Calendrier | Rembourser vs Investir, Coût réel]
  - Separator at index 4 (core path vs advanced)
  - Tabs grayed (opacity 0.4) when no payable debts
  - Micro-CTAs at end of Simulator → Calendar, Calendar → True Cost

7 strategies: avalanche, snowball, hybrid, cashflow, utilization, interest_dollar, custom
basePayoff uses selectedStrategy (not hardcoded avalanche)
Marginal rate label shows "(est.)" in Repay vs Invest + accountant mention
localStorage: buildfi_debts_v1, export/import JSON
URL share link: base64url encode/decode state → ?s= query param
Print/PDF: window.print() with print-only summary, .no-print/.print-only classes
Info modal: 4-tab compliance overlay (notice, scope, assumptions, privacy)
Mobile bottom bar: fixed nav for <560px with 4 core tabs
Card uses React.forwardRef, NumInput accepts inputRef — enables scroll-to-debt focus
Components: Card, StatBox, InputRow, NumInput, SectionTitle, DebtChart — no new ones
Protégé: Disallow /outils/ dans robots.txt
200 tests (tests/debt-tool-tests.js), 0 failures required

Utilization sort fix (3 locations):
  multiDebtPayoff, strategySchedule, sortedForSnowflake
  — debts without credit limit now sort as lowest priority (was incorrectly 100%)

BC bracket fix: reordered to:253414 before to:258482 (was inverted, dead code)
QC test fix: $250K correctly falls in to:258482 bracket (rate 0.5253, not top 0.5353)
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
| Contribution split, sal >= $55k | RRSP-first (18% of sal, max $33,810), then TFSA (up to $7k), remainder NR | Higher income → RRSP deduction more valuable |
| Contribution split, sal < $55k | TFSA-first (up to $7k), then RRSP, remainder NR | Lower income → TFSA flexibility preferred |
| Mortgage | a.mortgage if provided (including 0), else Math.round(homeValue * 0.55) | mortgage=0 explicitly means fully paid |
| QPP age | Passthrough if quiz provides qppAge, else heuristic from retAge (clamped 60-70) | |
| OAS age | Passthrough if quiz provides oasAge, else heuristic from retAge (clamped 65-70) | |
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
| DT-028 | Debt tool URL share link via base64url ?s= query param | **NOUVEAU** |
| DT-029 | Debt tool health signals + nextBestAction guided focus | **NOUVEAU** |
| DT-030 | Debt tool info/compliance modal (4 tabs: notice, scope, assumptions, privacy) | **NOUVEAU** |
| DT-031 | Debt tool print/PDF via window.print() with summary page | **NOUVEAU** |
| DT-032 | Debt tool mobile bottom bar (<560px fixed nav) | **NOUVEAU** |
| DT-033 | bridge(fr, en) narrative connector pattern — italic muted bilingual text between report sections (Ess + Inter + Decum) | **NOUVEAU** |
| DT-034 | Décaissement: 6 MC runs per report (1×5K base + 2×1K meltdown + 3×1K CPP timing) | **NOUVEAU** |
| DT-035 | Décaissement: DerivedProfile + RenderPlan + CompositeSignals behavioral profiling (same as Ess/Inter) | **NOUVEAU** |
| DT-036 | Décaissement: continuous QPP factor formula (7.2%/yr early, 8.4%/yr late) replaces 3-entry lookup | **NOUVEAU** |
| DT-037 | Décaissement: deathAge:105 hard cap with stochMort:true (CPM-2023 terminates sims earlier) | **NOUVEAU** |
| DT-038 | Décaissement: SVG donut chart for success rate (stroke-dasharray animation) | **NOUVEAU** |
| DT-039 | Décaissement: LAUNCH50 applies ($29.50 price), SECOND50 for second reports | **NOUVEAU** |
| DT-040 | Logo system: /public/logo.js is single source of truth. Stacking blocks (3 bars), viewBox 220×48, scale sm=0.7x md=1.0x lg=1.4x. Navbar=md, footer=lg, quiz headers=md/lg. Inline SVGs in report renderers match same coordinates. Emails use text-only (SVG not supported by email clients). | **NOUVEAU** |
| DT-041 | Logo injection: deferred logo.js requires typeof check INSIDE DOMContentLoaded callback (not outside). All 8 deferred pages use this pattern. 5 synchronous pages (quizzes, tools) don't need it. | **NOUVEAU** |

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
| 2026-03-04 | **Essentiel pipeline 3-round audit** — 10 test profiles corrected, translator fixes (mortgage=0, contrib split, QPP/OAS passthrough), report 8 chantiers polish | ✅ |
| 2026-03-04 | **Essentiel launch-ready** — Grade distribution D/F/A+/A+/F/F/A+/A+/A+/F, AI narration operational, Stripe/Blob/Resend operational | ✅ |
| 2026-03-05 | **AI narration v2** — Voice matrix (9 combos), composite signals, narrative arc, jargon ban, dynamic obs_2 | ✅ |
| 2026-03-05 | **Intermédiaire pipeline audit** — 11 P0/P1/P2 number fixes, AI prompt v2, 591/591 calculation tests, 5 AI test reports | ✅ |
| 2026-03-05 | **Debt tool 9 UX cherry-picks** — health signals, guided focus, URL share, QuickStart, info modal, print/PDF, mobile bar, AMF disclaimers | ✅ |
| 2026-03-05 | **BC/QC bracket fixes** — BC monotonic order, QC $250K test expectation → 200/200 debt tests pass | ✅ |
| 2026-03-06 | **RRSP cap 33810** — corrected in quiz-translator.ts, quiz-translator-inter.ts, quiz-translator-expert.ts, constants-registry.ts (was 31560) | ✅ |
| 2026-03-06 | **Inter + Ess narrative arc** — bridge() helper, 6 narrative connectors, "Ce que vous avez dit" box, objective callout, Inter upsell copy (Ess); bridge() + narrative connectors (Inter) | ✅ |
| 2026-03-06 | **AMF 3 violations fixed** — report-html.js: "Concentrez-vous" → observational, "constituerait" → "pourrait", "devrait faire" → "gagnerait à" | ✅ |
| 2026-03-06 | **CCPC data path fix** — report-html-inter.js: bizRemun/bizSalaryPct read from params directly (not params._quiz), scale corrected (0-1 fraction → × 100 for display) | ✅ |
| 2026-03-06 | **QPP/OAS heuristic fix** — quiz-translator-inter.ts: retAge-based heuristic (clamped) replaces hardcoded default 65, matches Essentiel translator 1:1 | ✅ |
| 2026-03-07 | **Décaissement pipeline rebuild** — Full rebuild from Sonnet skeleton: 12 AI slots (was 10), 13-section report (was 12), DerivedProfile/RenderPlan/CompositeSignals, 9-combo voice matrix, SVG donut chart, continuous QPP factor, validateStep(), 4 responsive breakpoints, static fallbacks, AMF fixes, email tier-specific resources, landing page CSS class | ✅ |
| 2026-03-08 | **Brand refresh** — Stacking blocks logo (replaces flame), gold #b8860b→#c49a1a everywhere (24+ files), Plus Jakarta Sans font, new hero tagline, og-image.png 1200×630, logo viewBox 220×48 (was 270×52), report inline logos 200×48 | ✅ |
| 2026-03-08 | **Logo defer race condition fix** — typeof logoSVG check moved inside DOMContentLoaded on 6 pages (index, bilan, expert-landing, conditions, confidentialite, avis-legal). Root cause: deferred script not yet executed when inline script parsed. | ✅ |
| 2026-03-08 | **Landing page UX** — Pulsing gold launch badge (was small static pill), decision helper moved below product cards (was above, opening off-screen), bigger Oui/Non buttons (18px, navy border, gold hover, 140px min-width) | ✅ |

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
- **Deferred script race condition**: `<script src="/logo.js" defer>` runs AFTER HTML parsing but BEFORE DOMContentLoaded. If you check `typeof logoSVG` in an inline `<script>` OUTSIDE DOMContentLoaded, it will be undefined. Always check INSIDE the callback: `document.addEventListener('DOMContentLoaded', function() { if (typeof logoSVG === 'function') { ... } });`
- **sed on Windows (MINGW)** converts LF→CRLF silently — creates ghost diffs in git status. Discard with `git checkout -- <files>` after verifying no real content changes.
