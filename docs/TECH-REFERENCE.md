# TECH-REFERENCE.md
> Architecture, décisions de code, audits, conformité AMF.
> Mis à jour: 2026-02-28 — v8.0 (thin client, engine sync 436 tests, pipeline E2E, pivot PDF→HTML, webhook documenté)

---

## 1. ARCHITECTURE

### Important: Le moteur MC existe dans 2 endroits
- `planner.html` — moteur complet dev/test (~15,000 lignes, 436 tests embarqués)
- `lib/engine/index.js` — moteur extrait pour production (2,426 lignes, 38 exports)

**Si un bug moteur est corrigé, le corriger dans les 2 fichiers.** planner.html est la source de vérité.

### Structure planner.html (planner_v2)
```
Lignes 1–50          : HTML head, meta, styles
Lignes 50–500        : CSS (tokens FS/CL/SP, responsive)
Lignes 500–4,572     : MOTEUR (calcTax, calcQPP, calcOAS, calcGIS, optimizeDecum, runMC)
Lignes 4,572–14,500  : UI REACT (sidebar, 30+ tabs, charts, résumés)
Lignes 14,500–15,157 : TESTS EMBARQUÉS (436 engine tests, 53 catégories, 0 failures)
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
  → renderReportHTML(D, mc, quiz, lang, {}, costDelay, minReturn) — {} = AI placeholder
  → put() → Vercel Blob (rapport HTML)
  → sendReportEmail() → Resend (lien vers rapport)
  → Client redirigé vers /merci
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
PDF generation: DÉSACTIVÉ (@sparticuz/chromium incompatible Vercel)
AI narration: SKIPPÉ (passe {} — données MC brutes seulement)
Email tags: DÉSACTIVÉS (erreur validation ASCII)
Blob access: "private" (store privé — à migrer vers public)
```

### Composants standalone (bonus)
```
debt-tool.jsx
  → Composant React autonome ("use client")
  → Stratégies: snowball, avalanche, hybride
  → Comparateur Rembourser vs Investir
  → Calendrier de remboursement mensuel
  → Export/Import JSON
  → 200 tests, 161 paires bilingues
  → Chemin: app/outils/dettes/page.tsx
  → Protégé: Disallow /outils/ dans robots.txt
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
- Jamais toucher au moteur sans vérifier les 436 tests
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
| DT-006 | Tests embarqués dans le HTML — 436 tests, 53 catégories | Actif |
| DT-007 | Langage observationnel AMF — grep automatique dans tests | Actif, non négociable |
| DT-008 | Rapport HTML hébergé (Vercel Blob) — PDF côté client via window.print() | **NOUVEAU** — remplace Puppeteer |
| DT-009 | Single API call narrator — 10 slots JSON, 2s vs 15s | Actif |
| DT-010 | Conditionnel obligatoire FR/EN | Actif, non négociable |
| DT-011 | Zéro acronyme Essentiel, province-aware | Actif |
| DT-012 | Fan chart interpolé en demo — vraies données MC en prod | Temporaire |
| DT-013 | Upsell soft en fin de rapport uniquement | Actif |
| DT-014 | AI narration: placeholder {} — à intégrer server-side | **MIS À JOUR** |
| DT-015 | Quiz thin client — zero MC côté client | **MIS À JOUR** — était all-in-one |
| DT-016 | Clé API Anthropic JAMAIS dans le code — Vercel env vars uniquement | Actif, non négociable |
| DT-017 | Debt tool React standalone — "use client", pas de SSR | Actif |
| DT-018 | Guides PDF générés via Python/reportlab — sources versionnées | Actif |
| DT-019 | /outils/ protégé par robots.txt — bonus clients seulement | Actif |
| DT-020 | Stripe webhook URL: www.buildfi.ca (pas buildfi.ca — 307 redirect) | **NOUVEAU** |
| DT-021 | Stripe automatic_tax: désactivé — prix tax-inclusive | **NOUVEAU** |
| DT-022 | app/page.tsx: redirect() (pas permanentRedirect — évite cache browser) | **NOUVEAU** |
| DT-023 | Engine syncé: lib/engine/index.js = planner_v2 (2,426 lignes, 38 exports) | **NOUVEAU** |

---

## 5. DÉCISIONS BUSINESS

| ID | Décision | Statut |
|----|----------|--------|
| DB-001 | One-time payment — différenciateur vs ffPro.ca | Décidé |
| DB-002 | Québec FR en premier | Décidé |
| DB-003 | Organique d'abord, pubs ensuite | Décidé |
| DB-004 | Expert $139 one-time, renouvellement $29/an | Décidé |
| DB-005 | Entreprise individuelle (CCPC si >30K$/an) | Décidé |
| DB-007 | Stripe Checkout hébergé | Décidé |
| DB-009 | Compte bancaire séparé dès jour 1 | Décidé, non négociable |
| DB-010 | TPS/TVQ reportée jusqu'au seuil $30K | Décidé |
| DB-011 | Aucun remboursement — produit numérique, livraison instantanée | Décidé, non négociable |
| DB-012 | Bonus livrés par email post-achat (guide PDF + lien debt tool) | Décidé |
| DB-013 | Rapport livré par lien web (pas PDF attaché) — standard industrie SaaS | **NOUVEAU** |

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

**Score actuel: 92/100 — 436 tests moteur, 53 catégories, 0 failures**

| Audit | Contenu | Résultat |
|-------|---------|---------|
| R1–R5 | calcTax 13 provinces, QPP/RRQ, OAS, GIS, withdrawal, couple, estate | 342→436 tests, fiables |
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
| 2026-02-27 | **Engine sync** — lib/engine/index.js = planner_v2, 436 tests, optimizeDecum ajouté | ✅ |
| 2026-02-27 | **Pipeline E2E** — Quiz→Stripe→Webhook→MC→Blob→Email validé en prod | ✅ |

### Prochains audits
- **R19** (P1.6): Quiz UX — mobile iPhone SE, drop-offs, test "ma mère comprendrait"
- **R20** (P1.6): Rapport Essentiel — 10 profils, chaque $ tracé au moteur, grep AMF (liste élargie)
- **R21** (P2.4): Intermédiaire — chemins immo + CCPC avec CPA

---

## 8. LEÇONS APPRISES

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
