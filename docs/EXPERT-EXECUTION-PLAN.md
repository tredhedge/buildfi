# EXPERT EXECUTION PLAN — Instructions opérationnelles pour Claude Code
> Ce document est le plan de match que Claude Code suit session par session.
> Il référence STRATEGY-EXPERT-PLAN.md pour le QUOI et le POURQUOI.
> Ce document couvre le COMMENT, le QUAND, et les décisions tranchées.
> Date: 2026-03-02

---

## 0. PRINCIPES D'EXÉCUTION

### 0.1 Comment Claude Code doit utiliser ces documents

**STRATEGY-EXPERT-PLAN.md** = la bible. Les spécifications, l'architecture, les prix, les sections de rapport. Claude Code le consulte pour comprendre ce qu'il construit.

**Ce document (EXPERT-EXECUTION-PLAN.md)** = les ordres de marche. Claude Code le suit session par session. Chaque session a un périmètre défini, des livrables attendus, et un audit de sortie.

**Règle absolue :** Claude Code ne commence JAMAIS une session sans relire le contexte de la session concernée dans ce document. Il ne saute pas d'étapes. Il ne "simplifie" pas pour aller plus vite. Chaque session se termine par un audit avant de passer à la suivante.

### 0.2 Philosophie de construction

**Pas de raccourcis.** Le produit doit être construit comme si une équipe de 5 développeurs allait le maintenir. Code propre, testable, documenté. La puissance de Claude Code permet de faire ça à un coût solo — c'est l'avantage compétitif.

**Audits réguliers intégrés.** Chaque 2-3 sessions, un mini-audit : tests passent? Lint AMF clean? Routes API répondent? Stripe webhooks fonctionnent? On ne laisse JAMAIS la dette technique s'accumuler.

**Infrastructure cohérente.** Chaque brique s'appuie sur la précédente. Pas de "je fais le rapport Expert avant que l'auth fonctionne." Séquençage strict.

**Minimum 1,000 simulations.** Toute simulation MC — que ce soit un screening d'optimiseur, un rapport Intermédiaire, un "Tester une décision" — fait minimum 1,000 sims. Les rapports formels (exports AI) font 5,000 sims. Pas de raccourci sur la qualité stochastique.

### 0.3 Ce que le propriétaire fait lui-même

Certaines étapes ne peuvent pas être faites par Claude Code (Vercel dashboard, Stripe dashboard, Cloudflare DNS, etc.). Ces étapes sont marquées **[MANUAL]** avec des instructions détaillées étape par étape.

---

## 1. DÉCISIONS TRANCHÉES (ex-angles morts)

### 1.1 Translator Expert

**Décision :** Extension du translator Inter avec switch `tier`.

Le fichier `lib/translator.ts` (ou équivalent) reçoit un paramètre `tier: "essentiel" | "intermediaire" | "expert"`. Les 80 champs communs sont mappés une seule fois. Le switch ajoute :
- `expert` : champs additionnels (allocation détaillée, MER par compte, croissance salariale, événements futurs, assurance, RESP, location) + bloc H → configuration des toggles stochastiques + mode guided → configuration progressive disclosure
- Le translator retourne un objet `{ mcParams: {...}, disclosure: {...}, defaults: {...} }` au lieu de juste les params MC

### 1.2 Résumé 1 page

**Décision :** HTML print-friendly côté client. Zéro serveur.

**Contenu :**
- Note (A+ à F) avec grade ring
- Taux de succès + bande P10-P90
- Patrimoine net projeté à la retraite (médian)
- Fan chart mini (300×150px)
- 3 constats clés (les mêmes que le diagnostic)
- Date de génération + version constantes fiscales
- Watermark BuildFi

**Implémentation :** Bouton "Résumé 1 page" dans le simulateur → overlay print-friendly (CSS `@media print`) → le client fait Ctrl+P ou le bouton déclenche `window.print()`. Alternativement : `html2canvas` pour générer un PNG partageable. Recommandation : les deux options (print + PNG download).

**Pas de blob, pas de serveur, pas de tracking.** C'est un screenshot amélioré.

### 1.3 Workflow "Tester une décision"

**Décision :** Maximum 3 variantes (A vs B vs C).

**Spec technique :**
- Le client choisit dans une liste de décisions pré-définies contextualisées par segment (STRATEGY §6)
- Chaque décision = un paramètre + 2-3 valeurs
- Le client peut aussi créer une décision custom : dropdown de paramètre + 2-3 champs de valeur
- Chaque variante = MC 1,000 sims server-side (screening, pas rapport)
- 3 variantes × 1,000 sims × ~0.5s = ~1.5s parallélisé. Acceptable.
- Output : table comparative + fan chart overlay + phrase descriptive auto-générée (pas AI — template avec valeurs interpolées)
- Le résultat est affiché dans l'UI, pas sauvegardé comme rapport. Le client peut ensuite générer un export AI qui inclura la comparaison (§22 section "Comparaison de scénarios").

**Décisions pré-définies par segment :**

| Segment | Décisions |
|---------|-----------|
| Couple (A) | Décaler retraite 2 ans / Downsizing / Fractionnement oui-non |
| CCPC (B) | Sal 60% vs div 60% / Vente entreprise 55 vs 60 / Extraction 10 vs 15 ans |
| Pré-retraité (C) | RRQ 60/65/70 / Meltdown oui-non / Retraite X vs X+4 |
| FIRE (D) | Taux retrait 3.5/4.0/4.5% / Crash année 1 / Coast FIRE vs full FIRE |

### 1.4 Optimiseur 8 axes

**Décision :** Vérifier le code existant (`launchOptimizer()` ligne ~13827) et l'adapter.

**Les 8 axes :**
1. Âge de retraite (±3 ans par pas de 1)
2. Âge RRQ/CPP (60, 65, 70)
3. Âge PSV (65, 67, 70)
4. Stratégie de retrait (standard, meltdown, TFSA-first)
5. Allocation actions (±10% par pas de 5%)
6. Dépenses retraite (±$500/mois par pas de $250)
7. Épargne additionnelle (+$100, +$250, +$500/mois)
8. Timing vente immobilière (jamais, retraite, retraite+5, retraite+10) — si propriétaire

**Méthode :** Pour chaque axe, tester 3-5 valeurs autour de la valeur actuelle. Chaque test = MC **1,000 sims** (minimum garanti). Identifier les 3 axes avec le plus grand delta de taux de succès.

**Coût :** ~32,000 sims total, parallélisable. ~5-8s total.

**Output :** "Top 3 leviers" avec fourchette de gain + bouton "Explorer dans le simulateur" par levier.

### 1.5 Read-only snapshot

**Décision :** Pas de snapshot interactif pour le MVP. Le rapport PDF/HTML avec la section "Pour votre professionnel" (hypothèses + paramètres MC + constantes) suffit.

Phase 4+ : considérer un token read-only.

### 1.6 Achat export additionnel

**Décision :** Un clic = un achat = un export immédiat.

**Flux :**
1. Client clique "Générer un export AI" avec 0 crédits restants
2. Modal : "Vos 5 exports inclus sont utilisés. Générer un export pour 14,99 $ + taxes?"
3. "Acheter et générer" → Stripe Checkout ($14.99)
4. Webhook confirme → export généré → email + portail
5. Pas de packs, pas de pré-achat. Simple.

### 1.7 Couple = un compte

**Décision :** UN compte par foyer fiscal.

Le moteur simule le couple comme une unité. Un token, un set de crédits, un Bilan Annuel. Les profils sauvegardés contiennent les données des deux conjoints.

CGU : "La licence Expert couvre un foyer fiscal (vous et votre conjoint·e le cas échéant)."

### 1.8 Mobile

**Décision :** Desktop-first pour le simulateur. Mobile-friendly pour tout le reste.

| Composant | Mobile responsive | Note |
|-----------|-------------------|------|
| Quiz Expert | Oui | Formulaire standard |
| Rapports HTML | Oui | Déjà responsive |
| Portail (/expert) | Oui | Dashboard, crédits, historique |
| Landing page | Oui | Déjà fait |
| Simulateur — 3 workflows | Oui | Boutons + résultats lisibles |
| Simulateur — diagnostic | Oui | KPIs + fan chart |
| Simulateur — 30 onglets détaillés | Non (desktop/tablette) | Bannière discrète sur phone |

### 1.9 Email livraison rapport Expert

**Décision :** Même pipeline que Ess/Inter. Email Resend + lien Blob + ajout au portail.

Template email Expert = template Inter adapté : grade card + lien rapport + résumé 3 lignes + "Accéder au simulateur" + "Votre portail Expert" + disclaimer AMF.

### 1.10 TPS/TVQ

**Décision :** Prix HT affichés. Taxes au checkout.

Les prix actuels dans Stripe sont "tax-inclusive" (STATUS.md). Il faudra reconfigurer quand l'inscription TPS/TVQ sera faite. Pour le MVP Expert :
- Si pas encore inscrit TPS : prix = prix affiché, pas de taxe perçue
- Dès inscription : activer Stripe Tax + reconfigurer les prix

**[MANUAL] — Étape propriétaire :** Vérifier statut inscription TPS/TVQ. Si revenu >$30K sur 4 trimestres → inscription obligatoire. Consulter comptable.

### 1.11 Politique de remboursement

**Décision :** Aucun remboursement (aligné avec SERVICES.md existant).

"Produit numérique, livraison instantanée. Erreur technique → correction sans frais."

Le client Expert qui n'est pas satisfait peut contacter support. En cas de problème technique avéré (rapport incomplet, données corrompues), on régénère gratuitement. Pas de remboursement monétaire — c'est cohérent avec Ess/Inter.

### 1.12 Bilan Annuel pas prêt

**Décision :** Badge "Janvier 2027" visible, pas de date ferme.

- Bouton "Bilan Annuel" visible avec badge "Bientôt — Janvier 2027"
- Au clic : modal explicatif + suggestion d'utiliser "Optimiser automatiquement" en attendant
- Page Expert : "Bilan Annuel inclus (disponible début 2027)"
- Si retard : email avec résumé auto-généré (résumé 1 page amélioré) en attendant le vrai Bilan

Le premier renouvellement ($29) ne doit PAS être facturé avant que le Bilan Annuel soit opérationnel, OU offrir un prix réduit ($14.50) pour la première année de renouvellement si le Bilan n'est pas encore live.

### 1.13 Langue du rapport Expert

**Décision :** FR et EN, basé sur `lang` du profil quiz.

- Le prompt AI inclut `"language": "fr"` ou `"en"`
- Les templates de fallback statiques existent en FR ET EN (déjà le cas pour Ess)
- Le lint AMF scanne les deux listes de mots interdits
- Les sections fixes (disclaimers, méthodologie) sont maintenues en FR et EN
- Le planner est déjà bilingue — pas de nouveau dev côté simulateur

### 1.14 Anthropic API down

**Décision :** Retry 3x → fallback statique → crédit non consommé → regénération gratuite.

**Flux :**
1. Appel API échoue → retry après 1s, 3s, 10s
2. Si 3 échecs : rapport généré avec texte statique intelligent (fallback, comme si AI key manquait)
3. Le crédit export N'EST PAS consommé
4. Rapport marqué `aiStatus: "fallback"` dans metadata
5. Email au client : "Narration personnalisée temporairement indisponible. Rapport généré avec observations standards. Regénérez gratuitement quand le service sera rétabli."
6. Bouton "Regénérer avec AI" dans le portail — consomme 0 crédit si `aiStatus: "fallback"`
7. Notification admin : "Anthropic API down — X rapports en fallback"

### 1.15 Performance rapport Expert (12-25 sections)

**Décision :** Batch de 3-4 sections logiquement groupées. Pas section par section.

**Batches :**
- Batch 1 : Sommaire exécutif + Diagnostic + Revenus (sections base, interconnectées)
- Batch 2 : Projection + Patrimoine + Analyse fiscale (sections data-heavy)
- Batch 3 : Priorités + Observations + sections conditionnelles actives (variable)
- Batch 4 : Sections exclusives Expert (comparaison, driver attribution, pour le pro, questions fiscaliste)

4 appels API parallèles × ~3s = ~3-4s total. Acceptable.

Le lint AMF post-génération s'applique à chaque batch avant assemblage.

### 1.16 Tier du rapport dans le contexte Expert

**Décision :** Toujours Expert adaptatif. Pas de sélecteur de tier.

Un export dans le simulateur Expert = rapport Expert. La taille varie selon le profil (13-25 sections) mais c'est toujours le maximum applicable.

### 1.17 Profils préchargés

**Décision :** Les profils existants dans le planner sont conservés ET étendus.

Le planner a déjà des PROFILES : `youngPro`, `coupleDB`, `ccpcOptim`, `fireAggressive`, `bizCoupleSale`, etc. avec `applyProfile(key)` qui reset + applique. Ces profils :
- Restent tels quels dans le simulateur Expert (Porte B option 2 "Charger un profil type")
- Sont utilisés pour les tests QA automatisés (chaque profil = un scénario de test)
- Sont utilisés pour les tests de régression MC (profil stable = résultats comparables entre versions)
- Un nouveau profil "Pré-retraité DB" doit être ajouté s'il n'existe pas

**Règle :** Chaque profil préchargé doit être vérifié annuellement quand les constantes fiscales changent. Les résultats attendus (taux de succès, impôt, etc.) sont documentés et comparés.

### 1.18 Minimum 1,000 simulations

**Décision :** Rien en dessous de 1,000 sims. Jamais.

| Usage | Simulations | Justification |
|-------|-------------|---------------|
| Rapport Essentiel | 5,000 | Livrable formel, précision maximale |
| Rapport Intermédiaire | 5,000 | Livrable formel |
| Export Expert AI | 5,000 | Livrable formel |
| Bilan Annuel | 5,000 | Livrable formel |
| Simulateur recalcul (debounce) | 1,000 | Feedback rapide, suffisant pour tendances |
| "Tester une décision" (par variante) | 1,000 | Screening, pas livrable |
| Optimiseur 8 axes (par test) | 1,000 | Screening, pas livrable |
| Résumé 1 page | 0 (utilise le dernier MC en mémoire) | Pas de recalcul |

### 1.19 Procédure si Claude API crash pendant une query client

Voir §1.14 pour les exports AI. Pour les autres cas :
- **Simulateur recalcul :** pas d'AI impliqué. Si Vercel serverless crash → retry côté client (hook `useSimulation` avec retry logic). Message "Recalcul en cours... Si le problème persiste, rechargez la page."
- **Optimiseur :** si un axe échoue → les autres continuent. Résultat partiel affiché : "7/8 axes analysés. L'axe [X] n'a pas pu être évalué."
- **"Tester une décision" :** si une variante échoue → les autres affichées. Message : "Le scénario [C] n'a pas pu être calculé. Réessayez."

Règle générale : **jamais de page blanche.** Toujours un résultat partiel ou un message actionnable.

### 1.20 Contenu SEO — Voix BuildFi, pas contenu générique

**Décision :** Les articles SEO (STRATEGY §16) doivent sonner comme Le Millionnaire Invisible, Jeune Retraité, ou Mr. Money Mustache — adaptés à la marque BuildFi.

**Ton :** Clair, chaleureux, confiant, anti-bullshit, grade 10 de lecture (STRATEGY.md §6).

**Structure de chaque article :**
- Hook : une situation réaliste ("Vous avez 52 ans, une pension DB et un REER de $180K. Votre comptable vous parle de meltdown. C'est quoi au juste?")
- Explication : le mécanisme en langage simple, avec un exemple chiffré
- Nuance : quand c'est pertinent ET quand ça ne l'est pas
- Appel à l'action : "Testez votre propre scénario dans le simulateur Expert"
- Disclaimer AMF : conditionnel, éducatif, pas directif

**Ce qu'on NE fait PAS :**
- Listicles génériques ("Les 10 meilleurs trucs pour la retraite")
- Contenu copié/réécrit d'autres sources
- Ton académique ou jargonneux
- Promesses de résultats

**Exemples de titres :**
- FR : "Le meltdown REER, c'est quoi et est-ce que ça vous concerne?"
- FR : "RRQ à 60, 65 ou 70 : le calcul que personne ne vous explique"
- FR : "Le piège de la PSV : comment votre revenu peut vous coûter 15%"
- EN : "RRSP Meltdown: The $50K Tax Strategy Nobody Talks About"
- EN : "CPP at 60 vs 70: Your Personalized Break-Even Age"
- EN : "The OAS Clawback Trap: How Your Income Could Cost You 15%"

---

## 2. STRUCTURE DES SESSIONS CLAUDE CODE

### Principe : une session = un périmètre défini

Claude Code ne reçoit PAS tout ce document d'un coup. Il reçoit :
1. STRATEGY-EXPERT-PLAN.md (complet, en référence)
2. La section de CE document correspondant à la session en cours
3. Les fichiers de référence du projet (STATUS.md, SERVICES.md, TECH-REFERENCE.md)

Chaque session se termine par :
- [ ] Livrables créés/modifiés listés
- [ ] Tests passent (existants + nouveaux)
- [ ] Lint AMF clean (si applicable)
- [ ] Pas de régression sur les fonctionnalités existantes
- [ ] Commit avec message descriptif

### Séquençage des sessions

Le propriétaire lance les sessions dans cet ordre. Il ne saute pas.

| Session | Titre | Dépend de | Audit |
|---------|-------|-----------|-------|
| S1 | Infrastructure Expert (Stripe, KV, auth) | Ess/Inter fonctionnels | Mini-audit 1 |
| S2 | Quiz Expert (Inter + bloc H + champs) | S1 | — |
| S3 | API simulate + optimize | S1 | Mini-audit 2 |
| S4 | Simulateur habillé (auth + API + disclosure) | S1, S2, S3 | — |
| S5 | 3 workflows (Tester/Optimiser/placeholder Bilan) | S3, S4 | Mini-audit 3 |
| S6 | Pipeline rapport Expert adaptatif | S3, S4 | — |
| S7 | Résumé 1 page + exports + portail | S6 | — |
| S8 | Landing page Expert + upgrade path | S1, S7 | Mini-audit 4 |
| S9 | CGU, conformité, rate limiting, monitoring | S1-S8 | — |
| S10 | Audit complet pré-lancement | S1-S9 | AUDIT MAJEUR |

**Post-lancement :**

| Session | Titre | Dépend de |
|---------|-------|-----------|
| S11 | Bilan Annuel (input, processing, output) | S10 lancé |
| S12 | Crons rétention (anniversaire 6 mois, renouvellement, veille réglementaire interne) | S10 lancé |
| S13 | Pipeline constantes fiscales | S10 lancé |
| S14 | Articles SEO (10 FR + 10 EN, voix BuildFi) | S10 lancé |

---

## 3. SESSIONS DÉTAILLÉES

### SESSION S1 — Infrastructure Expert

**Objectif :** Toute la plomberie Expert fonctionne. Stripe, auth, KV, rate limiting.

**Prérequis :** Pipeline Ess/Inter E2E fonctionnel (STATUS.md P0.6 validé).

**[MANUAL] Étapes propriétaire AVANT la session :**

**Stripe — Créer les produits :**
1. Aller sur dashboard.stripe.com → Produits
2. Modifier produit Essentiel : prix $29.00 CAD (était $39)
3. Créer produit "Intermédiaire" : $59.00 CAD, one-time → copier Price ID
4. Créer produit "Expert" :
   - Nom : "BuildFi Expert"
   - Prix : $129.00 CAD, one-time
   - Copier le Price ID → le donner à Claude Code
5. Créer produit "Expert Renouvellement" :
   - Nom : "BuildFi Expert — Renouvellement annuel"
   - Prix : $29.00 CAD, récurrent annuel
   - Copier le Price ID
6. Créer produit "Export AI additionnel" :
   - Nom : "BuildFi — Export AI additionnel"
   - Prix : $14.99 CAD, one-time
   - Copier le Price ID
7. Créer coupon "SECOND50" : 50% off, single-use, applicable aux produits Ess/Inter
8. Créer coupon template "REFERRAL15" : 15% off, single-use (sera généré dynamiquement)
9. Ajouter les Price IDs comme variables d'environnement Vercel :
   - `STRIPE_PRICE_ESSENTIEL` = price_xxx (mise à jour)
   - `STRIPE_PRICE_INTERMEDIAIRE` = price_yyy
   - `STRIPE_PRICE_EXPERT` = price_zzz
   - `STRIPE_PRICE_EXPERT_RENEWAL` = price_aaa
   - `STRIPE_PRICE_EXPORT_ADDON` = price_bbb
10. Vérifier que le webhook existant (`www.buildfi.ca/api/webhook`) écoute toujours `checkout.session.completed`
11. Ajouter l'event `customer.subscription.updated` au webhook (pour le renouvellement)

**Vercel — Variables d'environnement :**
1. Aller sur vercel.com → Projet buildfi → Settings → Environment Variables
2. Ajouter : STRIPE_PRICE_EXPERT, STRIPE_PRICE_EXPERT_RENEWAL, STRIPE_PRICE_EXPORT_ADDON
3. Vérifier que ANTHROPIC_API_KEY est ajouté (bloquant depuis P1.4)
4. Redeploy après ajout des variables

**Claude Code construit :**
- Schema KV Expert (STRATEGY §12) : `expert:{email}` avec tous les champs + `referralCode`
- Schema KV Referral : `referral:{code}` → `{ referrer_email, uses, conversions }`
- Middleware auth magic link : vérification token, expiry, tier
- Route `/api/checkout-expert` : crée session Stripe Expert $129
- Route `/api/checkout-export-addon` : crée session Stripe $14.99
- Route `/api/checkout-second` : crée session Stripe avec coupon SECOND50 (vérifie éligibilité)
- Extension du webhook `/api/webhook` : handler pour Expert (créer record KV, envoyer magic link), handler pour 2e rapport (appliquer coupon), handler pour referral (incrémenter conversions, générer récompense)
- Rate limiting middleware : 1 export/2min, 20/jour, 100 recalculs/jour par token
- Route `/api/auth/verify` : vérifie token → retourne profil (tier, crédits, expiry)
- Route `/api/auth/magic-link` : envoie nouveau magic link par email
- Route `/api/referral/generate` : génère code unique + lien pour le référent
- Tests : checkout e2e (test mode) pour les 5 produits, KV CRUD, rate limiting, auth verify, referral tracking

**Audit de sortie S1 :**
- [ ] Stripe test purchase Expert $129 → webhook reçu → KV record créé → magic link email envoyé
- [ ] Stripe test purchase Ess $29, Inter $59 → webhook correct
- [ ] Stripe coupon SECOND50 fonctionne → 50% off appliqué au checkout
- [ ] Referral : code généré, lien fonctionne, coupon 15% off appliqué, conversion trackée
- [ ] Token magic link fonctionne : `/simulateur?token=abc` → auth vérifié → profil chargé
- [ ] Rate limiting testé : 101e recalcul bloqué, 21e export bloqué
- [ ] Variables Vercel toutes présentes

---

### SESSION S2 — Quiz Expert

**Objectif :** Le quiz Expert collecte toutes les données nécessaires au simulateur.

**Claude Code construit :**
- Quiz Expert = extension du quiz Inter existant
- Nouveaux champs : allocation détaillée, MER par compte, croissance salariale, événements futurs, assurance-vie, RESP, revenus locatifs
- Bloc H : choix de sophistication (Rapide/Personnalisé/Avancé) + mode guided par segment
- Translator Expert : extension du translator Inter avec switch `tier` (§1.1)
- Le translator retourne `{ mcParams, disclosure, defaults }`
- Stockage des réponses quiz dans KV (`quizData`) pour réutilisation inter-tiers
- Tests : 5 profils types complètent le quiz → paramètres MC corrects → disclosure correcte

---

### SESSION S3 — API simulate + optimize

**Objectif :** Les routes API sont le coeur du produit. Elles doivent être robustes.

**Claude Code construit :**
- Route `/api/simulate` : reçoit params MC + N (1000 ou 5000) → retourne résultats MC complets
  - Input validation (tous les params requis, plages raisonnables)
  - Auth middleware (token requis)
  - Rate limiting
  - Error handling (timeout 60s Vercel, retry logic)
  - Response format standardisé : `{ success, results: { successRate, percentiles, yearByYear, ... }, meta: { sims, duration_ms, engineVersion, constantsYear } }`
- Route `/api/optimize` : reçoit params MC → retourne top 3 leviers
  - 8 axes × 3-5 valeurs × 1,000 sims chacun
  - Parallélisation interne (Promise.all sur les axes)
  - Timeout handling (si un axe dépasse → résultat partiel)
  - Response : `{ success, levers: [{ axis, currentValue, bestValue, deltaSuccess, deltaWealth }], meta }`
- Route `/api/compare` : reçoit params MC + 2-3 variantes → retourne comparaison
  - 1,000 sims par variante, parallèle
  - Response : `{ success, variants: [{ label, successRate, medianWealth, taxLifetime }], meta }`
- Tests : 5 profils préchargés × chaque route → résultats cohérents avec le planner

**Audit de sortie S3 :**
- [ ] `/api/simulate` retourne en <3s pour 5,000 sims
- [ ] `/api/optimize` retourne en <10s pour 8 axes
- [ ] `/api/compare` retourne en <3s pour 3 variantes × 1,000 sims
- [ ] 436 tests moteur passent toujours
- [ ] Résultats pour 5 profils préchargés identiques (±1%) au planner
- [ ] Auth + rate limiting fonctionnels sur chaque route

---

### SESSION S4 — Simulateur habillé

**Objectif :** Le planner devient un produit Expert avec auth, branding, progressive disclosure.

**Claude Code construit :**
- Wrapper autour du planner existant : header BuildFi, footer, navigation
- Auth gate : si pas de token valide → redirect vers page Expert (vente)
- Progressive disclosure : sidebar filtrée selon `disclosure` du translator
- Smart defaults : indicateurs visuels sur champs pré-remplis
- Driver attribution : phrase sous chaque KPI (§1.1 de STRATEGY §5)
- Mode guided par segment : adapter les décisions prêtes-à-tester
- Profils préchargés accessibles (Porte B)
- Hook `useSimulation` : debounce 1.5s → fetch `/api/simulate` (1,000 sims) → update UI
- Skeleton loader pendant le recalcul MC
- Calculs déterministes côté client (QPP/OAS estimés, cash-flow basique) pour feedback instantané
- Responsive : bannière sur phone <768px, fonctionnel sur tablette+

---

### SESSION S5 — 3 workflows

**Objectif :** Les 3 boutons "pilote automatique" fonctionnent.

**Claude Code construit :**
- UI : 3 gros boutons au-dessus des onglets (design cohérent avec le branding BuildFi)
- "Tester une décision" : sélecteur de décision → fetch `/api/compare` → affichage résultats (table + fan chart overlay)
- "Optimiser automatiquement" : fetch `/api/optimize` → affichage top 3 leviers → boutons "Explorer"
- "Faire mon Bilan Annuel" : placeholder, badge "Janvier 2027", modal explicative
- Les décisions pré-définies sont contextualisées par le segment détecté (quiz ou mode guided)

**Audit de sortie S5 (mini-audit 3) :**
- [ ] Sessions S1-S5 : tout fonctionne ensemble
- [ ] Parcours complet : achat Expert → quiz → simulateur → recalcul → "Tester une décision" → résultats
- [ ] Parcours complet : → "Optimiser" → top 3 leviers → clic "Explorer" → onglet correct
- [ ] Progressive disclosure : un profil couple voit les onglets couple, un célibataire non
- [ ] Rate limiting respecté sur toutes les routes
- [ ] Aucune régression Ess/Inter

---

### SESSION S6 — Pipeline rapport Expert

**Objectif :** Le rapport Expert adaptatif fonctionne avec toutes ses sections conditionnelles.

**Claude Code construit :**
- Serializer adaptatif `_serializeForAI(tier, results, profile)` avec objet `sections` (STRATEGY §22)
- Templates HTML pour chaque section (base + conditionnelles + exclusives Expert)
- Prompt system modulaire : 4 batches parallèles (§1.15)
- Lint AMF post-génération par batch (STRATEGY §10 couche 2)
- Fallback statique par section si AI échoue ou lint rejette
- Renderer : assemblage HTML, table des matières dynamique, pied de page avec metadata
- Gestion `aiStatus: "fallback"` si Anthropic down (§1.14)
- Blob upload + URL permanente
- Décrément du compteur `exportsAI` dans KV
- Tests : générer un rapport pour chaque profil préchargé → toutes les sections attendues présentes → lint AMF 0 violation
- **Test d'impression systématique :** Chaque section du rapport Expert a `page-break-inside: avoid` testé. SVGs ont des fallbacks noir/blanc pour l'impression. Bouton "Version imprimable" simplifie le rapport (retire animations, tooltips, éléments interactifs) avant `window.print()`. Test sur Chrome + Safari + Firefox.

---

### SESSION S7 — Résumé 1 page + exports + portail + /merci + feedback

**Objectif :** Le client peut exporter, gérer ses rapports. L'expérience post-achat est un "moment wow." Le pipeline de feedback est automatisé de bout en bout.

**Claude Code construit :**

*Page /merci améliorée :*
- Pas juste "merci" — la page montre le rapport en construction en temps réel
- Skeleton loader avec étapes visibles : "5 000 scénarios en cours... Analyse fiscale... Narration personnalisée..."
- Quand prêt : grade affiché sur la page + CTA "Voir mon bilan complet"
- L'email = backup et reçu, pas le seul point d'accès
- Lien referral + offre 2e rapport 50% affichés

*Exports et portail :*
- Résumé 1 page : overlay print-friendly + PNG download (§1.2)
- Portail `/expert` : dashboard, crédits, historique, profils
- 5 profils sauvegardés : renommer, supprimer, exporter JSON
- Achat export additionnel (§1.6) : modal → Stripe $14.99 → webhook → génération
- Email livraison Expert (§1.9) : template Resend
- "Regénérer avec AI" pour rapports fallback (§1.14)

*Boutons partage/referral dans le rapport :*
- Bloc "Ce bilan a été utile?" après observations
- "Obtenir un 2e bilan à 50%" (coupon SECOND50)
- "Partager BuildFi avec un proche" (lien referral pré-rempli)

*Pipeline feedback automatisé (STRATEGY §2.5) :*
- Bloc 5 étoiles cliquables intégré dans le rapport HTML (liens `<a>` vers `/api/feedback`)
- Route `/api/feedback` : enregistre dans KV → redirect page remerciement + champ texte optionnel
- Cron J+3 : email auto étoiles + NPS + lien page feedback complète + mention coupon 50% débloqué
- Page `/feedback/{token}` : questions segmentées par tier
- Cron J+7 : rating ≥ 4 ET NPS "Oui" → email auto demande témoignage (nommé / anonyme / non)
- Cron J+7 : rating ≤ 2 → flag alerte propriétaire dans KV
- Cron J+14 : pas de feedback → dernier rappel doux
- KV : `feedback:{email}` → `{ rating, nps, text, tier, date, source, testimonial_consent, testimonial_type }`
- Logique coupon : feedback existe → SECOND50 disponible. Sinon → page interstitielle questions avant checkout.

*Export JSON pré-suppression :*
- Email J-30 avant suppression → "Téléchargez votre profil"
- Bouton download JSON dans portail
- Upload JSON au retour → reprend où il était

---

### SESSION S8 — Landing page Expert + upgrade path

**Objectif :** La page de vente et le chemin d'upgrade fonctionnent.

**Claude Code construit :**
- Page Expert (STRATEGY §13) : hero, 3 blocs workflow, "pas pour tout le monde", tableau features, pricing, FAQ, trust signals
- Page `/expert` pour non-abonnés = page de vente → CTA checkout $129
- Upgrade path : bouton dans les rapports Ess/Inter → checkout Expert avec crédit
- Stripe Checkout avec metadata pour le crédit : `{ upgrade_from: "intermediaire", credit: 59 }`
- Webhook : détecte upgrade, récupère données quiz précédentes, crée record Expert

**Audit de sortie S8 (mini-audit 4) :**
- [ ] Sessions S1-S8 : parcours complet E2E
- [ ] Achat neuf : landing → Expert page → checkout → quiz → simulateur → recalcul → workflow → export → email → portail
- [ ] Upgrade : rapport Inter → bouton upgrade → checkout crédité → quiz Expert (bloc H + champs) → simulateur pré-rempli
- [ ] Export additionnel : 0 crédits → modal → Stripe $14.99 → export → email
- [ ] Résumé 1 page : fonctionne, print OK, PNG OK
- [ ] Responsive : quiz mobile OK, rapport mobile OK, portail mobile OK, simulateur desktop OK

---

### SESSION S9 — CGU, conformité, monitoring

**Objectif :** Le produit est prêt légalement et opérationnellement.

**[MANUAL] Étapes propriétaire :**
1. Décider du nom légal de l'entreprise (nécessaire pour CGU)
2. Décider de l'email de contact (support@buildfi.ca?)
3. Vérifier statut inscription TPS/TVQ avec comptable
4. Configurer Resend : vérifier domaine buildfi.ca (corriger DKIM sur Cloudflare)
   - Cloudflare → DNS → record TXT `resend._domainkey`
   - Copier la NOUVELLE valeur depuis le dashboard Resend → coller dans Cloudflare
   - Attendre propagation DNS (~5 min)
   - Dashboard Resend → Reverify
5. Vercel Blob : recréer un store PUBLIC
   - Vercel Dashboard → Storage → Create → Blob → nom "buildfi-public" → Public access
   - Copier le nouveau BLOB_READ_WRITE_TOKEN → Environment Variables
   - Redeploy

**Claude Code construit :**
- Page `/conditions` : CGU complètes (usage personnel, pas de remboursement, licence foyer fiscal, propriété intellectuelle, 2e rapport conditions, referral conditions)
- Page `/confidentialite` : politique complète (LPRPDE + Loi 25 QC, données collectées, stockage, rétention, pas de vente, export/suppression)
- Page `/avis-legal` : disclaimer AMF complet
- Lint AMF en CI/CD : script de scan dans `package.json` : `"lint:amf"` → scan strings FR/EN → fail si violation
- Route `/api/health` : teste KV, MC (10 sims), Anthropic API, Resend, Blob
- Monitoring basique : log structuré chaque rapport, log des erreurs
- Emails renouvellement : J-30, J-7, J-0 (templates Resend, triggered par cron Vercel)
- Bouton "Télécharger mes données" dans le portail → JSON dump du record KV
- Bouton "Supprimer mon compte" → confirmation → purge KV sous 30 jours
- **Email pré-suppression données :** J-30 avant suppression → "Téléchargez votre profil maintenant." Bouton download JSON. Profils conservés 12 mois après expiration.
- **A/B testing framework (PostHog) :** Intégration des feature flags PostHog dans le code. Tracking events : `quiz_started`, `checkout_initiated`, `checkout_completed`, `report_viewed`, `feedback_submitted`, `referral_clicked`. Wraps `posthog.getFeatureFlag()` sur les 4 éléments testables (STRATEGY §16.5). Création `docs/AB-TESTING-GUIDE.md` — guide étape par étape pour que le propriétaire crée ses propres expériences dans PostHog en autonomie.
- **Email deliverability checklist :**
  - Vérifier SPF, DKIM, DMARC dans le DNS Cloudflare
  - Configurer reply-to : support@buildfi.ca
  - Ajouter lien de désinscription en footer de chaque email
  - Warming : 10-20 emails de test via Stripe test purchases à Gmail, Outlook, Yahoo
  - Vérifier inbox (pas spam) sur chaque provider
  - Monitoring : Resend dashboard bounces/complaints
  - Si bounce > 2% ou complaints > 0.1% → investigation immédiate
  - DMARC à renforcer post-vérification : `p=none` → `p=quarantine` → `p=reject`

---

### SESSION S10 — AUDIT COMPLET PRÉ-LANCEMENT

**Objectif :** Rien ne sort si ce n'est pas parfait.

**Claude Code exécute :**
```
npm run qa:full
```

Ce script couvre :
- [ ] 436+ tests moteur (Vitest)
- [ ] Lint AMF : 0 violation FR et EN
- [ ] 5 profils préchargés : impôt calculé ±$500 des calculateurs CRA/RQ
- [ ] MC regression : 3 profils, taux de succès ±2 points vs baseline
- [ ] Rapport généré pour Essentiel, Intermédiaire, Expert — aucun crash, aucune section vide
- [ ] Export HTML : rendu correct sur Chrome, Safari, Firefox
- [ ] Email de livraison : reçu dans Gmail, Outlook (pas en spam si Resend DNS OK)
- [ ] Stripe test purchase E2E : Essentiel $29, Intermédiaire $59, Expert $129, Export additionnel $14.99, 2e rapport 50%, Upgrade Ess→Expert, Referral 15% off
- [ ] MC 5,000 sims <3s sur Vercel serverless
- [ ] Rate limiting : vérifié
- [ ] Auth : token invalide → rejeté, token expiré → rejeté, token valide → OK
- [ ] Portail : crédits, historique, profils, export données, suppression
- [ ] Pages légales : CGU, confidentialité, avis AMF — toutes accessibles
- [ ] `/api/health` retourne OK
- [ ] Responsive : quiz (iPhone SE), rapport (iPhone SE), portail (iPhone SE)

**[MANUAL] Étapes propriétaire :**
1. Stripe : passer en mode LIVE
   - Dashboard Stripe → Settings → Activate payments
   - Recréer les produits en mode live (les Price IDs changent!)
   - Mettre à jour les variables Vercel avec les nouveaux Price IDs + nouvelles clés Stripe
   - Reconfigurer le webhook avec la nouvelle URL signing secret
2. Tester un vrai achat ($29 Essentiel) avec une vraie carte → rapport reçu → vérifier qualité
3. Lire chaque page légale en entier
4. Demander à 2-3 personnes de confiance de tester le parcours complet
5. Go/no-go

---

## 4. AUDITS RÉGULIERS INTÉGRÉS

### Mini-audit après S1 (Infrastructure)
- [ ] Stripe webhook fonctionne pour les 3 produits Expert
- [ ] KV CRUD fonctionne
- [ ] Auth magic link fonctionne
- [ ] Rate limiting fonctionne
- [ ] Aucune régression Ess/Inter (tester un achat Essentiel)

### Mini-audit après S3 (API)
- [ ] Les 3 routes API retournent des résultats corrects pour 5 profils
- [ ] Performance : simulate <3s, optimize <10s, compare <3s
- [ ] 436 tests passent
- [ ] Auth + rate limiting sur chaque route

### Mini-audit après S5 (Simulateur + workflows)
- [ ] Parcours complet E2E fonctionne
- [ ] Progressive disclosure correcte pour 4 segments
- [ ] 3 workflows retournent des résultats

### Mini-audit après S8 (Pages + upgrade)
- [ ] Achat neuf fonctionne
- [ ] Upgrade fonctionne avec crédit
- [ ] Export additionnel fonctionne
- [ ] Landing page Expert responsive

### AUDIT MAJEUR S10 (Pré-lancement)
- Voir §3 Session S10

### Audits post-lancement (récurrents)
- **Hebdomadaire :** `/api/health` vert, 0 erreurs critiques dans les logs, emails envoyés sans bounce
- **Mensuel :** Tests de régression MC, lint AMF, vérifier que les prix Stripe sont corrects
- **Trimestriel :** Mettre à jour OAS/GIS si Service Canada a publié de nouveaux taux
- **Annuel (novembre) :** Pipeline constantes fiscales (STRATEGY §14)

---

## 5. COHÉRENCE AVEC L'IDENTITÉ BUILDFI

### Rappel identité (STRATEGY.md §6-7)
- **Ton :** Clair. Chaleureux. Confiant. Anti-bullshit. Grade 10 de lecture.
- **Palette :** Marine #1a2744, Or #b8860b, Crème #faf8f4, Sable #e8e4db, Forêt #1a7a4c, Brique #b91c1c
- **Typo :** Newsreader (display), DM Sans (body), JetBrains Mono (data)
- **Logo :** SVG flame (logo.js, logo-light.svg, logo-dark.svg)
- **Catégorie :** "Assessment" / "Bilan" — jamais "calculator" ou "tool"

### Application au tier Expert

| Élément | Identité appliquée |
|---------|-------------------|
| Landing page Expert | Même palette, même typo, même ton que landing principale. Pas un "autre site." |
| Simulateur | Header/footer BuildFi avec marine + or. Logo flame. Le planner garde son esthétique interne mais est wrappé dans le branding. |
| Rapports Expert | Même design system que Ess/Inter (grade ring, fan chart, KPI cards). Sections additionnelles suivent le même style. |
| Emails | Même template table-based que Ess (grade card, bouton or, disclaimer). Texte adapté pour Expert. |
| Portail | Palette BuildFi. Cards sable/crème. Boutons or. Texte DM Sans. |
| Bilan Annuel | Même rapport HTML que les exports. Badge "Bilan 2027" en header. |
| Articles SEO | Newsreader pour titres. DM Sans pour corps. Ton "Le Millionnaire Invisible" — pas académique. |
| Workflows | Boutons proéminents, or sur marine. Texte clair et direct. |
| Error messages | Chaleureux, pas technique. "Oups, le recalcul a pris trop de temps. On réessaie?" — pas "Error 504 Gateway Timeout." |

### Mots à utiliser dans le produit Expert
- "Votre bilan" (pas "votre rapport")
- "Explorer" (pas "calculer")
- "Scénario" (pas "simulation")
- "Le modèle a exploré" (pas "nous recommandons")
- "Ajustement" (pas "optimisation")
- "Constat" (pas "résultat")

### Mots INTERDITS dans le produit Expert
Voir STRATEGY.md §6 + TECH-REFERENCE.md §6. En plus :
- "Calculator" / "Calculateur" (c'est un "bilan" ou un "simulateur")
- "Tool" / "Outil" (c'est un "simulateur" ou un "laboratoire")
- "Dashboard" (c'est un "portail" ou un "tableau de bord")
- Price anchoring : "Un planificateur coûte $1,500" — JAMAIS dans le produit, seulement sur le site marketing si absolument nécessaire

---

*Fin du plan d'exécution. Ce document est la carte. STRATEGY-EXPERT-PLAN.md est le territoire.*
