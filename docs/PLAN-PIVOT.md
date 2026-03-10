# PLAN-PIVOT.md — Plan de match: 4 tiers → 3 produits
> Version 1.1 — corrigé — 9 mars 2026
> Statut: EN COURS — Ce document est la référence d'exécution.

---

## CONTEXTE DU PIVOT

BuildFi passe de 4 tiers payants (Bilan $29, Bilan 360 $59, Horizon $59, Laboratoire $129) à **3 produits** avec un hub gratuit:

| Produit | Prix | Contenu | Rôle |
|---------|------|---------|------|
| **Bilan Annuel** | GRATUIT | Net worth tracker + projection 5 ans déterministe + snapshots + évolution | Hub central. Acquisition. Données réelles pour tout le reste. |
| **Bilan Pro** | $19.99 one-shot | Rapport AI adaptatif (accum OU décaissement). Pré-rempli du BA. Outils dettes + allocation inclus. Quiz adaptatif. MC 5,000 sims. | Monétisation one-shot. Rachète annuellement. |
| **Laboratoire** | $49.99 + $29.99/an | Simulateur 190 params + BA inclus. Magic link. Tornado, backtesting, CPP/OAS optim, CCPC. | Premium récurrent. Différenciateur technique. |

**Ce qui disparaît:**
- Bilan à $29 → remplacé par BA gratuit
- Bilan 360 à $59 → absorbé dans Bilan Pro (accum)
- Horizon à $59 → absorbé dans Bilan Pro (décaissement)
- Outils dettes/allocation standalone gratuits → inclus avec Bilan Pro seulement

**Ce qui reste gratuit:**
- Bilan Annuel (hub)
- Guides 101/201/301
- Simulateur décaissement standalone (acquisition avec CTA)

**Le cycle vertueux:**
```
BA gratuit → "au-delà de 5 ans?" → Bilan Pro $19.99
                                        ↓
BA mis à jour → rachète Bilan Pro → données fraîches
                                        ↓
"et si je changeais X?" → Laboratoire $49.99
```

---

## DÉCISIONS ARCHITECTURALES CLÉS

### DA-01: Bilan Pro = deux pipelines routées, pas un quiz unifié
Le "Bilan Pro adaptatif" n'est PAS un nouveau quiz from scratch. C'est le routage intelligent entre les pipelines existantes:
- **Accum path** → quiz-intermediaire (existant, 85 champs) → report-html-inter.js (16 sections)
- **Décaissement path** → quiz-decaissement (existant, ~60 champs) → report-html-decum.js (13 sections)
- **Détection**: Une question aiguillage en entrée ("Vous êtes... pré-retraite / retraité / accumulation")

Ça réutilise 100% de l'infrastructure existante. Zéro réécriture de renderer.

### DA-02: BA = page Next.js client-side, pas HTML statique
Le BA v4 JSX (980 lignes, React) doit vivre dans app/outils/bilan-annuel/page.tsx. Pas dans public/. Raisons:
- Besoin de React (useState, useEffect, useMemo)
- Cohérent avec le reste de l'app Next.js
- Routing, head meta, analytics provider

### DA-03: BA → Bilan Pro bridge = JSON export → quiz pre-fill
Le BA stocke en localStorage. Quand le client clique "Bilan Pro", on:
1. Exporte les données BA en query param encodé (ou sessionStorage)
2. Le quiz Bilan Pro lit ces données et pré-remplit les champs
3. Le client confirme/ajuste → checkout normal

### DA-04: BA → Laboratoire bridge = JSON export → KV profile seed
Quand un client Lab achète, on:
1. Lit les données BA du localStorage
2. Les envoie au checkout comme metadata
3. Le webhook crée le profil KV pré-rempli avec les données BA
4. Le simulateur ouvre avec les vraies données

### DA-05: Outils dettes + allocation = gated derrière Bilan Pro
Les outils ne sont plus en accès libre. Implémentation:
- Les fichiers statiques (public/outils/) doivent être déplacés vers app/outils/ comme pages Next.js
- Auth check server-side: vérifier un token/email contre KV ou un one-time access key
- Livrés dans le rapport Bilan Pro (lien dans le rapport + email)
- Pré-remplis depuis les données du BA
- Le debt tool (app/outils/dettes/page.jsx) est déjà une page Next.js — ajouter auth check
- L'allocation tool (public/outils/allocation-epargne.html) doit migrer vers app/outils/allocation/page.tsx

### DA-06: Internal keys restent les mêmes
Les clés internes ne changent PAS:
- `essentiel` → n'est plus vendu (deprecated)
- `intermediaire` → utilisé comme pipeline pour Bilan Pro Accum
- `decaissement` → utilisé comme pipeline pour Bilan Pro Décaissement
- `expert` → utilisé comme pipeline pour Laboratoire

Nouveau: `bilan_pro` comme type dans checkout, qui route vers `intermediaire` ou `decaissement` selon le path.

---

## INVENTAIRE DU CODEBASE — CE QUI EXISTE

### Infrastructure 100% réutilisable (0 changement)
| Composant | Fichier | Status |
|-----------|---------|--------|
| MC engine | lib/engine/index.js (2,426 lignes, 453 tests) | ✅ Inchangé |
| Report shared helpers | lib/report-shared.ts (91 tests) | ✅ Inchangé |
| DerivedProfile + voice matrix | lib/ai-profile.ts | ✅ Inchangé |
| Stripe webhook signature | app/api/webhook/route.ts | ✅ Pattern réutilisé |
| Blob upload | via @vercel/blob | ✅ Inchangé |
| Resend emails | via lib/email.ts | ✅ Pattern réutilisé |
| KV Redis (auth, profiles) | lib/kv.ts | ✅ Inchangé |
| Anthropic API calls | callAnthropic() dans webhook | ✅ Inchangé |
| Magic link auth | lib/auth.ts + api/auth/* | ✅ Pour Laboratoire |
| Rate limiting | lib/rate-limit.ts | ✅ Inchangé |
| PostHog analytics | analytics-config.js + init.js | ✅ Inchangé |
| CSP middleware | middleware.ts | ✅ Inchangé |
| Planner-expert.html | public/planner-expert.html (15,827 lignes, 453 tests) | ✅ Pour Laboratoire |

### Pipelines réutilisables avec modifications mineures
| Pipeline | Fichiers | Réutilisation |
|----------|----------|---------------|
| Inter (→ Bilan Pro Accum) | quiz-intermediaire.html, quiz-translator-inter.ts, ai-prompt-inter.ts, report-html-inter.js | Quiz: pré-fill BA. Webhook: nouveau routing. Reste = identique. |
| Decum (→ Bilan Pro Décaissement) | quiz-decaissement.html, quiz-translator-decum.ts, ai-prompt-decum.ts, report-html-decum.js | Quiz: pré-fill BA. Webhook: nouveau routing. Reste = identique. |
| Expert (→ Laboratoire) | quiz-expert.html, quiz-translator-expert.ts, ai-prompt-expert.ts, report-html-expert.ts | Rebrand seulement. Pipeline = identique. |

### Ce qui sera deprecated
| Composant | Fichier | Action |
|-----------|---------|--------|
| Essentiel quiz | public/quiz-essentiel.html | Redirect → BA ou Bilan Pro |
| Essentiel translator | lib/quiz-translator.ts | Garder pour les rapports existants |
| Essentiel renderer | lib/report-html.js | Garder pour les rapports existants |
| Essentiel AI prompt | buildAIPrompt() dans report-html.js | Garder pour les rapports existants |
| Bilan product page | public/bilan.html | Redirect → BA |
| Bilan 360 product page | public/bilan-360.html | Redirect → Bilan Pro |
| Horizon product page | public/horizon.html | Redirect → Bilan Pro |

---

## SÉQUENCE D'EXÉCUTION

### Logique de la séquence
```
PHASE 1: Bilan Annuel (hub gratuit, aucune dépendance backend)
    ↓
PHASE 2: Stripe + Checkout + Webhook (infrastructure pivot)
    ↓
PHASE 3: Laboratoire (rebrand Expert, le moins de travail)
    ↓
PHASE 4: Bilan Pro (quiz adaptatif + pré-fill BA, le plus de travail)
    ↓
PHASE 5: Site web + Landing pages + Emails
    ↓
PHASE 6: Cross-sell + Cron + Distribution + Polish
```

**Pourquoi cet ordre:**
1. BA d'abord: zéro dépendance backend, c'est la première impression
2. Stripe ensuite: les produits payants ne marchent pas sans les bons prix
3. Lab avant Bilan Pro: le Lab c'est 90% du rebrand, très peu de code nouveau
4. Bilan Pro en dernier: c'est le plus complexe (quiz adaptatif + 2 pipelines + tools gating)
5. Site web après: impossible d'écrire le copy sans savoir exactement ce que chaque produit fait
6. Polish en dernier: cross-sell, cron, emails de rappel, distribution

---

## PHASE 1: BILAN ANNUEL — Hub gratuit

Le BA est la première impression. Il doit être 15/10.

### 1A — Fix + Intégration Next.js
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| BA-FIX-01 | Valider que le BA JSX compile sans erreur (`npm run build`) | P0 | Le JSX v4 a été testé — valider l'intégration Next.js |
| BA-FIX-02 | Créer `app/outils/bilan-annuel/page.tsx` à partir du JSX | P0 | "use client", importer le composant |
| BA-FIX-03 | Ajouter route dans next.config.js si nécessaire | P0 | /outils/bilan-annuel |
| BA-FIX-04 | Valider que la build passe (`npm run build`) | P0 | Aucun warning React |
| BA-FIX-05 | Tester localStorage persistence | P0 | Sauvegarder, recharger, vérifier |

### 1A-bis — Express Mode (existant dans le JSX v4)
Le BA a 3 entrées:
- **Express** (60s): 6 champs (âge, province, revenu, REER, CELI, maison, hypothèque, dettes, épargne/mois) → portrait immédiat → bridge vers mode complet
- **Complet**: saisie détaillée de tous les actifs/passifs/revenus
- **Profil exemple**: Marie-Ève & Julien pré-chargé pour démonstration

Le bridge express → complet convertit les données express en comptes structurés (REER, CELI, propriété, dettes consolidées).

### 1B — Qualité + Tests
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| BA-TST-01 | Tests projection 5 ans (rendement, appréciation, amortissement) | P0 | Minimum 20 tests |
| BA-TST-02 | Tests localStorage (save, load, corrupted data, migration) | P0 | |
| BA-TST-03 | Tests ratios (endettement, liquidité) | P0 | Edge cases: 0 actifs, 0 dettes |
| BA-TST-04 | Tests calcPMT (hypothèque auto) | P0 | Comparer avec calculateur connu |
| BA-TST-05 | Tests what-if (contrib+, debt+, return override) | P1 | |
| BA-TST-06 | Tests express mode (conversion express → full mode) | P1 | |
| BA-TST-07 | Tests JSON export/import (round-trip) | P1 | |

### 1C — Conformité + Sécurité
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| BA-SEC-01 | Cookie consent Law 25 (avant PostHog) | P0 | Réutiliser le pattern des quiz pages |
| BA-SEC-02 | PostHog analytics (page load, tab change, save, share) | P0 | Funnel tracking (BA → CTA click → checkout → purchase) est critique pour mesurer la conversion |
| BA-SEC-03 | Meta tags OG (titre, description, image) | P1 | Pour partage social |
| BA-SEC-04 | Disclaimer AMF dans l'outil (modal info existant) | P0 | Déjà dans le JSX — valider le texte |
| BA-SEC-05 | Escaping HTML dans les inputs (XSS prevention) | P0 | Inputs numériques = OK, text labels = valider |
| BA-SEC-06 | localStorage quota check (5MB limit) | P1 | Graceful error si plein |
| BA-SEC-07 | Démarrer domain warmup Resend (en parallèle) | P0 | Prend 2-4 semaines. Commencer immédiatement. |

### 1D — UX + Mobile
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| BA-MOB-01 | Test responsive 320px / 375px / 768px / 1024px | P0 | Breakpoints critiques |
| BA-MOB-02 | Tab bar scrollable (overflow-x auto, no-wrap) | P0 | Déjà dans le JSX — valider |
| BA-MOB-03 | Cards collapsed par défaut sur mobile (<768px) | P1 | |
| BA-MOB-04 | KPI grid: 2 colonnes mobile, 5 desktop | P0 | |
| BA-MOB-05 | Projection chart: SVG viewBox responsive | P0 | |
| BA-MOB-06 | Print stylesheet | P2 | Pour ceux qui veulent imprimer leur bilan |
| BA-MOB-07 | PWA manifest.json + service worker minimal | P2 | "Installer" le BA sur home screen mobile |

### 1E — Express mode
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| BA-EXP-01 | Express mode: 6 champs (revenu, dépenses, REER, CELI, dettes, âge) | P0 | ~60 secondes. Déjà dans le JSX v4 — valider le flow |
| BA-EXP-02 | Transition express → full mode (conserver les données saisies) | P0 | Le bouton "Mode complet" doit pré-remplir |
| BA-EXP-03 | KPIs express: ratio endettement, épargne nette, projection simplifiée | P0 | Pas toutes les KPIs — seulement ce qu'on peut calculer avec 6 champs |
| BA-EXP-04 | CTA "Ajoutez vos détails" après les KPIs express | P0 | Pousse vers full mode |

### 1F — Features BA restantes
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| BA-FEAT-01 | CTA Bilan Pro dans projection (existant dans JSX) | P0 | Valider le prix $19.99 |
| BA-FEAT-02 | CTA Laboratoire dans projection (existant dans JSX) | P0 | Valider le prix $49.99 |
| BA-FEAT-03 | Bouton "Partager" (copie lien) | P1 | Déjà dans le JSX |
| BA-FEAT-04 | Badge "453 tests" | P1 | Déjà dans le JSX |
| BA-FEAT-05 | JSON export/import fonctionnel | P0 | Déjà dans le JSX — tester |
| BA-FEAT-06 | Logo BuildFi (SVG logo.js pattern) dans le header | P0 | Remplacer l'icône chart |
| BA-FEAT-07 | Lien vers Avis légal dans le footer | P0 | Déjà dans le JSX |
| BA-FEAT-08 | Bilingual FR/EN toggle | P0 | Déjà dans le JSX — tester toutes les strings |
| BA-FEAT-09 | Endpoint /api/ba-reminder/subscribe (email + fréquence → KV) | P1 | Backend pour les rappels BA |
| BA-FEAT-10 | Cron BA reminder (lit KV → envoie rappels Resend) | P1 | Ajouter à vercel.json |
| BA-FEAT-11 | Désabonnement LCAP dans les rappels | P1 | Obligatoire pour marketing email |
| BA-FEAT-12 | Endpoint /api/ba-preview — MC simplifié 1,000 sims | P1 | Retourne P10/P90 valeur nette 5 ans. Conversion killer. |
| BA-FEAT-13 | Afficher résultat MC preview dans la projection BA | P1 | "Nos 5,000 scénarios disent entre X et Y" |

### 1G — Documentation pivot (P0)
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| DOC-01 | Mettre à jour STATUS.md — état pivot, deprecated tiers | P0 | ✅ Fait (v21, 2026-03-09) |
| DOC-02 | Mettre à jour ARCHITECTURE.md — 3 produits, nouveau graphe | P0 | ✅ Fait (v6, 2026-03-09) |
| DOC-03 | Mettre à jour STRATEGY.md — nouveaux prix, funnel, compétiteurs | P0 | ✅ Fait (v7, 2026-03-09) |
| DOC-04 | Mettre à jour CLAUDE.md — product mapping, pricing, pipeline | P0 | ✅ Fait (2026-03-09) |
| DOC-05 | Créer PLAN-PIVOT.md (ce fichier) | P0 | ✅ Fait (v1.0, 2026-03-09) |

**Total Phase 1: ~47 tâches**

---

## PHASE 2: STRIPE + CHECKOUT + WEBHOOK

### 2A — Stripe Products
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| STR-01 | Créer Stripe product "Bilan Pro" ($19.99 CAD) | P0 | Mode test d'abord, puis live |
| STR-02 | Créer Stripe product "Laboratoire" ($49.99 CAD one-time) | P0 | Remplace Expert $129 |
| STR-03 | Créer Stripe product "Laboratoire Renewal" ($29.99 CAD/year) | P0 | Remplace Expert Renewal $29/yr |
| STR-04 | Créer coupon LAUNCH-BP (100% off, limit 50, Bilan Pro seulement) | P0 | 50 gratuits contre review |
| STR-05 | Créer coupon LAUNCH-LAB (50% off, limit 50, Laboratoire seulement) | P0 | $24.99 pour early adopters |
| STR-06 | Ajouter env vars Vercel: STRIPE_PRICE_BILAN_PRO, STRIPE_PRICE_LABORATOIRE, STRIPE_PRICE_LABORATOIRE_RENEWAL | P0 | |
| STR-07 | Décider: garder ou retirer les anciens prix (Ess $29, Inter $59, Decum $59, Expert $129) | P0 | Garder pour les achats existants, retirer des quiz |

### 2B — Checkout Route
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| CHK-01 | Ajouter type `bilan_pro` dans checkout/route.ts | P0 | Metadata: `tier: "bilan_pro"`, `path: "accum"` ou `"decum"` |
| CHK-02 | Ajouter type `laboratoire` dans checkout/route.ts | P0 | Réutiliser le flow Expert existant |
| CHK-03 | Ajouter metadata `ba_data` (JSON BA exporté) pour pré-fill | P1 | Si le client vient du BA |
| CHK-04 | Router vers le bon prix selon le type | P0 | bilan_pro → STRIPE_PRICE_BILAN_PRO |
| CHK-05 | Coupon routing: LAUNCH-BP pour bilan_pro, LAUNCH-LAB pour laboratoire | P0 | |
| CHK-06 | Garder backward compat pour les anciens types (essentiel, intermediaire, etc.) | P1 | Anciens liens doivent encore marcher |

### 2C — Webhook Route
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| WHK-01 | Ajouter routing pour `tier: "bilan_pro"` | P0 | Route vers Inter ou Decum pipeline selon `path` |
| WHK-02 | Ajouter routing pour `tier: "laboratoire"` | P0 | Réutiliser handleExpertPurchase() |
| WHK-03 | Pré-remplir les quiz answers avec les données BA si présentes | P1 | Merge ba_data avec quiz answers |
| WHK-04 | Mettre à jour le feedback record pour les nouveaux tiers | P0 | |
| WHK-05 | Mettre à jour les emails admin alerts | P0 | |
| WHK-06 | Garder backward compat pour anciens tiers | P1 | Anciens webhooks doivent pas casser |

**Total Phase 2: ~18 tâches**

---

## PHASE 3: LABORATOIRE (rebrand Expert)

Le Lab est 90% fait. C'est un rebrand.

### 3A — Rebrand visuel
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| LAB-01 | FIRE Pro+ → Laboratoire BuildFi dans planner-expert.html | P0 | Déjà partiellement fait (mars 2026) |
| LAB-02 | Titre + meta dans app/simulateur/page.tsx | P0 | |
| LAB-03 | Titre + meta dans app/expert/page.tsx (portail) | P0 | |
| LAB-04 | Logo BuildFi dans le simulateur | P1 | |
| LAB-05 | Favicon + meta tags BuildFi | P1 | |

### 3B — Pricing + Checkout
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| LAB-06 | Quiz Expert → prix $49.99 (pas $129) | P0 | Changer le display price dans quiz-expert.html |
| LAB-07 | Checkout Expert → STRIPE_PRICE_LABORATOIRE | P0 | |
| LAB-08 | Renewal → STRIPE_PRICE_LABORATOIRE_RENEWAL ($29.99/yr) | P0 | |
| LAB-09 | Coupon LAUNCH-LAB dans le checkout | P0 | |

### 3C — Landing page Laboratoire
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| LAB-10 | Refaire expert-landing.html: hero par questions | P0 | "Et si 2008 arrivait l'année de votre retraite?" |
| LAB-11 | Prix $49.99 + $29.99/an (pas $129) | P0 | |
| LAB-12 | Comparaison compétition (Optiml $199/an vs Lab $49.99) | P1 | |
| LAB-13 | Screenshots du simulateur | P2 | |

### 3D — BA intégré au Lab
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| LAB-14 | Lien vers BA dans le portail Lab (app/expert/page.tsx) | P0 | |
| LAB-15 | Pré-remplissage simulateur depuis données BA | P1 | Lire localStorage BA → injecter dans _applyParams |
| LAB-16 | Message "BA inclus" sur la landing et le portail | P0 | |

### 3E — Sidebar contextuelle (simulateur)
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| LAB-17 | Restructurer sidebar par intention (6 blocs) | P1 | Qui êtes-vous / Combien gagnez / Combien avez / Dépensez / Savoir / Hypothèses |
| LAB-18 | Affichage conditionnel (CCPC si bizOn, conjoint si cOn) | P1 | Partiellement existant |
| LAB-19 | Labels 13-14px, padding 12-16px, icônes headers | P2 | |

### 3F — Refonte visuelle simulateur
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| LAB-20 | Fan chart MC: gradient smooth P5-P95 | P1 | Remplacer les lignes discrètes |
| LAB-21 | Backtesting boutons nommés: "2008 / COVID / 2000" | P0 | Déjà dans le plan, visibilité++ |
| LAB-22 | Tornado: barres couleurs intuitives (vert améliore, rouge dégrade) | P2 | |
| LAB-23 | KPI cards: micro-icônes tendance, couleurs contextuelles | P2 | |
| LAB-24 | Contraste WCAG AA vérifié | P1 | |

**Total Phase 3: ~24 tâches**

---

## PHASE 4: BILAN PRO (quiz adaptatif + rapport)

### 4A — Quiz adaptatif
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| BP-01 | Écran d'aiguillage: "Quelle est votre situation?" | P0 | Accum (< 55 et non retraité) / Décaissement (> 55 ou retraité) / Je ne sais pas (→ questions) |
| BP-02 | Path Accum → quiz-intermediaire.html (existant) | P0 | Modifier pour accepter "tier=bilan_pro&path=accum" |
| BP-03 | Path Décaissement → quiz-decaissement.html (existant) | P0 | Modifier pour accepter "tier=bilan_pro&path=decum" |
| BP-04 | Pré-remplissage depuis BA: lire localStorage, mapper vers les champs quiz | P0 | Actifs → balances, dettes → balances+taux, revenu → salary |
| BP-05 | Le quiz demande seulement ce que le BA ne couvre pas | P1 | Âge RRQ souhaité, dépenses retraite, objectifs, préoccupations, couple détails |
| BP-06 | Terme "Bilan Pro" dans le quiz (pas Bilan 360 ni Horizon) | P0 | |
| BP-07 | Prix $19.99 dans le quiz (pas $59) | P0 | |
| BP-08 | Bouton "Pré-remplir depuis mon Bilan Annuel" si données BA détectées | P0 | Highlight vert si données trouvées |

### 4B — Rapport adaptatif
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| BP-10 | Path Accum: utiliser report-html-inter.js (16 sections) | P0 | Inchangé sauf branding |
| BP-11 | Path Décaissement: utiliser report-html-decum.js (13 sections) | P0 | Inchangé sauf branding |
| BP-12 | Branding rapport: "Bilan Pro" dans le header (pas Bilan 360 / Horizon) | P0 | |
| BP-13 | Lien vers outils dettes + allocation dans le rapport | P0 | Section "Outils pour agir" |
| BP-14 | CTA Laboratoire dans le rapport (discret, subordonné) | P1 | |
| BP-15 | QA check: prompt DATA ≠ mc params → fail | P1 | Déjà demandé, pas implémenté |

### 4C — Outils intégrés
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| BP-20 | Outil dettes: accessible via token dans l'URL du rapport | P0 | Token one-time ou lié au purchase |
| BP-21 | Outil allocation: idem | P0 | |
| BP-22 | Pré-remplissage outils depuis données BA (passifs → outil dettes) | P1 | |
| BP-23 | Gating: outils non accessibles sans achat Bilan Pro | P0 | Vérifier token/email contre KV ou Stripe |
| BP-24 | CTA "Outils inclus" dans l'email de livraison | P0 | |

### 4D — Fix pipeline existante
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| BP-30 | Fixer décaissement translator field-name mapping | P0 | Identifié comme bloqueur dans le plan |
| BP-31 | Régénérer artéfacts décaissement après fix | P0 | |
| BP-32 | Test de régression: zéro assets/pensions ne passe pas silencieusement | P0 | |
| BP-33 | Cohérence artéfacts rapports (BP-10, BP-11 du plan) | P0 | |
| BP-34 | Conformité AMF grep check | P0 | Zéro violations |
| BP-35 | Corrections Inter v3 (29 items: accents, AI, CSS, nav, logo) | P1 | |

### 4E — Email Bilan Pro
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| BP-40 | Template email livraison "Bilan Pro" (pas Bilan 360 ni Horizon) | P0 | |
| BP-41 | Inclure lien outils dettes + allocation dans l'email | P0 | |
| BP-42 | CTA Laboratoire dans l'email (discret) | P1 | |
| BP-43 | Feedback token + séquence J+3/J+7/J+14 | P0 | Réutiliser email-feedback.ts |

**Total Phase 4: ~28 tâches**

---

## PHASE 5: SITE WEB + LANDING PAGES + EMAILS

### 5A — Landing principale (index.html)
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| LP-01 | Hero: situation-first | P0 | "Où en êtes-vous? → BA gratuit. Assez? → Bilan Pro. Explorer? → Lab." |
| LP-02 | 3 product cards (pas 4) | P0 | BA gratuit / Bilan Pro $19.99 / Laboratoire $49.99 |
| LP-03 | MC proof point AVANT les cards | P0 | "La plupart des projections supposent un seul avenir. BuildFi en teste 5,000." |
| LP-04 | Product cards: description de personne, pas liste de features | P1 | |
| LP-05 | Decision helper: absorber dans le hero | P1 | |
| LP-06 | Trust paragraph + anchor méthodo | P1 | |
| LP-07 | Comparaison table (3 colonnes: gratuit / pro / lab) | P0 | |
| LP-08 | FAQ mise à jour pour 3 produits | P0 | |

### 5B — Landing Laboratoire
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| LP-10 | Hero par questions | P0 | "Et si 2008 arrivait..." |
| LP-11 | Screenshots simulateur | P2 | |
| LP-12 | Comparaison: Optiml $199/an vs Lab $49.99 | P1 | |
| LP-13 | Features uniques (Tornado, backtesting, rente vs rachat, CCPC) | P1 | |

### 5C — Landing Bilan Pro
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| LP-20 | Créer bilan-pro.html | P0 | Remplace bilan.html + bilan-360.html + horizon.html |
| LP-21 | Hero: "Votre situation dans 5,000 scénarios" | P0 | |
| LP-22 | Sections: Ce qu'on demande / Ce qu'on livre / Outils inclus / FAQ | P0 | |
| LP-23 | CTA avec prix $19.99 | P0 | |
| LP-24 | Message pré-remplissage BA: "Vos données du Bilan Annuel déjà prêtes" | P1 | |

### 5D — Redirections + Cleanup
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| LP-30 | Redirect bilan.html → /outils/bilan-annuel (BA gratuit) | P0 | 301 permanent |
| LP-31 | Redirect bilan-360.html → bilan-pro.html | P0 | 301 permanent |
| LP-32 | Redirect horizon.html → bilan-pro.html | P0 | 301 permanent |
| LP-33 | Redirect quiz-essentiel.html → quiz aiguillage Bilan Pro | P1 | |
| LP-34 | Mettre à jour robots.txt | P1 | |
| LP-35 | Sitemap.xml (nouveau) | P2 | |
| LP-36 | CTA simulateur décaissement → Bilan Pro (pas ancien quiz) | P0 | Le gratuit ne doit pas cannibaler le payant |

### 5E — Pages légales
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| LEG-01 | conditions.html: 3 produits (pas 4), nouveaux prix | P0 | |
| LEG-02 | confidentialite.html: BA collecte email pour rappels → mention | P0 | |
| LEG-03 | avis-legal.html: 3 produits, projection 5 ans déterministe (BA) + MC (pro/lab) | P0 | |
| LEG-04 | REQ registration ($38) | P0 | Bloqueur administratif |

### 5F — Email templates
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| EM-01 | Template livraison Bilan Pro (accum) | P0 | "Bilan Pro" pas "Bilan 360" |
| EM-02 | Template livraison Bilan Pro (décaissement) | P0 | "Bilan Pro" pas "Horizon" |
| EM-03 | Template livraison Laboratoire | P0 | "Laboratoire" pas "Expert" |
| EM-04 | Template BA rappel trimestriel/annuel (Resend) | P1 | Nouveau: rappel de mise à jour BA |
| EM-05 | CTA Bilan Pro dans les rappels BA | P1 | "Vos données sont prêtes → Bilan Pro" |
| EM-06 | Désabonnement LCAP dans les rappels BA | P0 | Obligatoire pour marketing par email |
| EM-07 | Template magic link Laboratoire | P0 | Rebrand de Expert magic link |

### 5G — /merci page
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| MER-01 | Flow Bilan Pro (accum): steps + outils + CTA Lab | P0 | |
| MER-02 | Flow Bilan Pro (décaissement): steps + outils + CTA Lab | P0 | |
| MER-03 | Flow Laboratoire: instructions magic link + BA inclus | P0 | |
| MER-04 | Referral section (garder) | P0 | |
| MER-05 | Retirer flows Essentiel/Intermediaire/Decaissement (deprecated) | P1 | Ou garder backward compat |

**Total Phase 5: ~38 tâches**

---

## PHASE 6: CROSS-SELL + CRON + DISTRIBUTION + POLISH

### 6A — Cross-sell flows
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| XS-01 | BA → Bilan Pro: CTA dans projection (cap 5 ans) | P0 | Déjà dans le JSX BA |
| XS-02 | BA → Lab: CTA dans projection | P0 | Déjà dans le JSX BA |
| XS-03 | Bilan Pro rapport → Lab: CTA en fin de rapport | P1 | |
| XS-04 | Bilan Pro email → Lab: mention subtile | P1 | |
| XS-05 | Lab portail → Bilan Pro: "Exportez un rapport AI" | P0 | Déjà existant (export) |
| XS-06 | PostHog funnel tracking: BA → quiz → checkout → purchase | P1 | |

### 6B — Cron jobs
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| CRN-01 | Cron BA rappel email (trimestriel) | P1 | Nouveau: lire les emails BA → Resend |
| CRN-02 | Cron Bilan Annuel Lab (janvier) | P1 | Déjà identifié comme manquant |
| CRN-03 | Cron feedback: ajouter tier "bilan_pro" | P0 | |
| CRN-04 | Cron renewal: "laboratoire" au lieu de "expert" | P0 | |
| CRN-05 | Cron anniversary: 6 mois pour Lab (pas Expert) | P0 | |

### 6C — Admin dashboard
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| ADM-01 | Stats par tier: BA (gratuit), Bilan Pro, Laboratoire | P1 | |
| ADM-02 | Funnel conversion: BA users → Pro → Lab | P2 | |
| ADM-03 | BA email collection count | P1 | |

### 6D — Distribution (zéro budget pub)
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| DIST-01 | Plan jour par jour pour les 2 premières semaines | P0 | À produire |
| DIST-02 | Post r/QuebecFinance: présentation honnête | P1 | |
| DIST-03 | Post r/PersonalFinanceCanada | P1 | |
| DIST-04 | Contact Retraite 101 | P1 | |
| DIST-05 | Contact Jeune Retraité | P1 | |
| DIST-06 | LinkedIn: histoire du projet | P2 | |
| DIST-07 | 50 Bilan Pro gratuits contre review (LAUNCH-BP) | P0 | |
| DIST-08 | 50 Lab à 50% off early adopters (LAUNCH-LAB) | P0 | |
| DIST-09 | Guides SEO 101/201/301 comme contenu indexable | P1 | |

### 6E — Polish + Infra
| ID | Tâche | Priorité | Notes |
|----|-------|----------|-------|
| POL-01 | OG images pour BA, Bilan Pro, Lab | P1 | Social sharing |
| POL-03 | Cloudflare Email Routing support@buildfi.ca | P1 | |
| POL-04 | Consent text avant Stripe checkout | P1 | |
| POL-05 | Post-purchase "How did you hear about us?" | P2 | |
| POL-06 | A/B test landing (PostHog feature flags) | P2 | |

**Total Phase 6: ~26 tâches**

---

## COMPTEUR DE TÂCHES

| Phase | P0 | P1 | P2 | Total |
|-------|----|----|-----|-------|
| 1. Bilan Annuel | 27 | 14 | 3 | 44 |
| 1G. Documentation (fait) | 5 | 0 | 0 | 5 |
| 2. Stripe + Checkout + Webhook | 13 | 5 | 0 | 18 |
| 3. Laboratoire | 11 | 9 | 4 | 24 |
| 4. Bilan Pro | 17 | 9 | 0 | 26 |
| 5. Site + Landing + Emails | 23 | 12 | 3 | 38 |
| 6. Cross-sell + Cron + Distrib + Polish | 7 | 11 | 4 | 22 |
| **TOTAL** | **103** | **60** | **14** | **177** |

---

## TÂCHES MANQUANTES DU PLAN CHATGPT (ajoutées ici)

Le plan ChatGPT (98 tâches) n'incluait pas:
1. ~~BA JSX build validation~~ → BA-FIX-01
2. ~~BA intégration Next.js~~ → BA-FIX-02
3. ~~BA → Bilan Pro data bridge~~ → BP-04, BP-08
4. ~~BA → Laboratoire data bridge~~ → LAB-15, DA-04
5. ~~Checkout refactoring pour 3 produits~~ → CHK-01 à CHK-06
6. ~~Webhook refactoring~~ → WHK-01 à WHK-06
7. ~~/merci page pour 3 produits~~ → MER-01 à MER-05
8. ~~Redirections SEO (anciennes pages)~~ → LP-30 à LP-35
9. ~~Admin dashboard update~~ → ADM-01 à ADM-03
10. ~~Cron jobs update~~ → CRN-03 à CRN-05
11. ~~Feedback pipeline update~~ → CRN-03
12. ~~Outils gating~~ → BP-20 à BP-24
13. ~~Legal pages update~~ → LEG-01 à LEG-04
14. ~~Domain warmup~~ → BA-SEC-07
15. ~~Consent checkout~~ → POL-04
16. ~~BA tests suite~~ → BA-TST-01 à BA-TST-07
17. ~~BA conformité + sécurité~~ → BA-SEC-01 à BA-SEC-06
18. ~~Email BA rappels + LCAP~~ → EM-04 à EM-06
19. ~~Cross-sell PostHog funnel~~ → XS-06
20. ~~Cloudflare email routing~~ → POL-03

---

## DÉPENDANCES CRITIQUES

```
BA-FIX-01..04 ─── build validation (Phase 1 start)
     │
     ├──→ BA-EXP-01..04 (express mode)
     ├──→ BA-TST-01..07 (tests)
     ├──→ BA-FEAT-01..08 (features)
     │
     ▼
STR-01..06 ─── bloquent Phase 3 + 4 (pas de checkout sans prix)
     │
     ├──→ LAB-06..09 (Lab checkout)
     │
     └──→ BP-02..03 (Bilan Pro checkout)
              │
              ▼
         BP-04 (pré-fill BA → quiz)
              │
              ▼
         WHK-01..02 (webhook routing)
              │
              ▼
         LP-01..08 (landing — besoin de connaître les produits)
              │
              ▼
         DIST-01 (plan distribution — besoin de tout pour lancer)

EN PARALLÈLE dès Phase 1:
  BA-SEC-07 (domain warmup Resend — prend 2-4 semaines)
  DOC-01..05 (documentation pivot — ✅ fait)
```

---

## RISQUES IDENTIFIÉS

| Risque | Impact | Mitigation |
|--------|--------|------------|
| BA trop bon → Bilan Pro ne vend plus | Revenu $0 | Cap 5 ans strict. Pas de MC, pas de fiscalité, pas de CPP/OAS dans le BA. |
| Quiz adaptatif Bilan Pro = trop complexe | Retard | DA-01: pas de nouveau quiz. Routage entre quiz existants. |
| Outils gating frustre les utilisateurs gratuits | Mauvais bouche-à-oreille | Message clair: "Inclus avec Bilan Pro". Pas de paywall sur l'outil — paywall sur les données. |
| Domain warmup pas fait → emails spam | Bilan Pro pas livré | BA-SEC-07 est P0 Phase 1. Commencer le warmup immédiatement. |
| Décaissement translator bugs | Rapports incorrects | BP-30..32 sont P0 Phase 4. |

---

## TRACKING

### Convention de statut
- ⬜ À faire
- 🔨 En cours
- ✅ Fait
- ❌ Bloqué
- ⏭️ Reporté (justifié)

### Progression
| Phase | Status | P0 fait | P1 fait | Total fait |
|-------|--------|---------|---------|------------|
| 1. Bilan Annuel | ⬜ | 0/27 | 0/14 | 0/44 |
| 1G. Documentation | ✅ | 5/5 | 0/0 | 5/5 |
| 2. Stripe | ⬜ | 0/13 | 0/5 | 0/18 |
| 3. Laboratoire | ⬜ | 0/11 | 0/9 | 0/24 |
| 4. Bilan Pro | ⬜ | 0/17 | 0/9 | 0/26 |
| 5. Site web | ⬜ | 0/23 | 0/12 | 0/38 |
| 6. Polish | ⬜ | 0/7 | 0/11 | 0/22 |
| **TOTAL** | | **5/103** | **0/60** | **5/177** |

---

## FICHIERS DE RÉFÉRENCE

| Doc | Usage |
|-----|-------|
| **PLAN-PIVOT.md** (ce fichier) | Tracking d'exécution — consulter avant chaque session |
| **STATUS.md** | État historique du projet (pré-pivot) |
| **TECH-REFERENCE.md** | Code standards, AMF, engine rules |
| **SERVICES.md** | Infra, env vars, DNS |
| **STRATEGY.md** | Brand, competitors, voice |
| **ARCHITECTURE.md** | Dependency graph |

---

## ARTEFACTS DU PIVOT

| Fichier | Source | Status |
|---------|--------|--------|
| buildfi-plan-final.docx | ChatGPT brainstorm (9 mars 2026) | Référence stratégique |
| buildfi-plan-final-visual.jsx | Architecture visuelle (6 vues) | Référence visuelle |
| bilan-annuel-v4.jsx | BA v4 (980 lignes React) | Base pour Phase 1 |
