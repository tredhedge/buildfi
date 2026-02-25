# TECH-REFERENCE.md
> Architecture, décisions de code, audits, conformité AMF.
> Mis à jour: 2026-02-25 — v6.0

---

## 1. ARCHITECTURE

### Important : Le moteur MC est dupliqué dans 3 fichiers
- `planner.html` — moteur complet (~15,000 lignes)
- `quiz-essentiel.html` — mini-MC intégré (même moteur, copié dedans)
- `quiz-intermediaire.html` — idem

**Si un bug moteur est corrigé, le corriger dans les 3 fichiers.** Migration vers module partagé en P4.

### Structure planner.html
```
Lignes 1–50          : HTML head, meta, styles
Lignes 50–500        : CSS (tokens FS/CL/SP, responsive)
Lignes 500–4,572     : MOTEUR (calcTax, calcQPP, calcOAS, calcGIS, optimizeDecum, runMC)
Lignes 4,572–14,500  : UI REACT (sidebar, 30+ tabs, charts, résumés)
Lignes 14,500–15,157 : TESTS EMBARQUÉS (433 engine + 91 property + 3,624 text)
```

### Pipeline Quiz → Moteur → Rapport
```
Quiz (7 écrans, ~28 questions)
  → translateToMC(quizAnswers)      — ~40 heuristiques, smart defaults
  → MC engine params (~55 champs)
  → runMonteCarlo(params, 5000)     — t-Student df=5, fat tails
  → extractReportData(mc, params)   — objet D
  → [Optionnel] buildAIPrompt(D)    → Anthropic API → 10 slots JSON
  → renderReport(D, mc, quiz, ai)   — 8 sections, 4 SVG, fallbacks statiques
```

### Le Quad d'Initialisation — CRITIQUE
4 endroits doivent avoir les MÊMES valeurs par défaut. Toute divergence = bug:
1. `useState(X)` — default nouveau utilisateur
2. `applyProfile(p)` — default si profil ne définit pas le champ
3. `_mcLatestParams` — params envoyés au moteur (bypass stale closure React)
4. Bouton Reset — remet tout à zéro

**Bug R12 venait de là**: applyProfile ne réinitialisait pas certains champs.

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
- Jamais toucher au moteur sans vérifier les 4,148 tests
- Jamais d'emoji dans les labels, textes UI, ou plans
- Jamais de big bang — feature par feature
- Jamais plier sous la pression — défendre les positions techniques
- Jamais couper/simplifier/supprimer sans approbation explicite
- Jamais inventer des détails dans l'AI — seulement données quiz (win, worries, fix, confidence)

### Profils canary (résultats attendus)
| Profil | Succès | |
|--------|--------|-|
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
| DT-001 | Architecture monolithique HTML — migration Next.js en P4 | Actif |
| DT-002 | Monte Carlo 5,000 sims t-Student df=5 | Actif, non négociable |
| DT-003 | Web Worker pour calcul MC off-thread | Actif |
| DT-004 | setTimeout(300) + _mcProfileDirty — race condition React (R6) | Actif, disparaît en P4 |
| DT-005 | Engine clamps — le moteur est son propre garde-fou | Actif, non négociable |
| DT-006 | Tests embarqués dans le HTML — remplacés Vitest en P4 | Actif |
| DT-007 | Langage observationnel AMF — grep automatique dans tests | Actif, non négociable |
| DT-008 | Rapport HTML + 4 SVG — fallbacks 100% si API échoue | Actif |
| DT-009 | Single API call narrator — 10 slots JSON, 2s vs 15s | Actif |
| DT-010 | Conditionnel obligatoire FR/EN | Actif, non négociable |
| DT-011 | Zéro acronyme Essentiel, province-aware | Actif |
| DT-012 | Fan chart interpolé en demo — vraies données MC en prod | Temporaire |
| DT-013 | Upsell soft en fin de rapport uniquement | Actif |
| DT-014 | AI on-demand (bouton) — automatique server-side en P4 | Actif |
| DT-015 | quiz-essentiel.html all-in-one | Actif |
| DT-016 | Clé API Anthropic JAMAIS dans le code — Vercel env vars uniquement | Actif, non négociable |

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
```

### Chemins audités vs non-audités
**Audités (R1–R18)**: REER/FERR, CÉLI, NR, CELIAPP, LIRA, RRQ/QPP, PSV/OAS, SRG/GIS, fiscalité 13 provinces, retraite solo et couple de base, régimes DB/DC.

**NON audités — disclaimer spécifique requis si activé**: CCPC extraction, IPP, CELIAPP→achat, Smith Manoeuvre, multi-propriété, exits PE/PM, RREGOP.

### Checklist avant lancement
- [ ] Grep mots interdits → 0 résultat
- [ ] Conditionnel dans toutes les projections
- [ ] Disclaimer complet dans chaque rapport
- [ ] Zéro acronyme non défini dans Essentiel
- [ ] Footer site web avec disclaimer
- [ ] Pages légales publiées (P0.7)
- [ ] Opinion AMF formelle avant mise à l'échelle (P3.5)

---

## 7. HISTORIQUE DES AUDITS

**Score actuel: 92/100 — 4,148 assertions, 0 failures**

| Audit | Contenu | Résultat |
|-------|---------|---------|
| R1–R5 | calcTax 13 provinces, QPP/RRQ, OAS, GIS, withdrawal, couple, estate | 342 tests, fiables |
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

### Prochains audits
- **R19** (P1.6): Quiz UX — mobile iPhone SE, drop-offs, test "ma mère comprendrait"
- **R20** (P1.6): Rapport Essentiel — 10 profils, chaque $ tracé au moteur, grep AMF
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
