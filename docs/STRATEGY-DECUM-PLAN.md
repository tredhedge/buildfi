# STRATEGY-DECUM-PLAN.md — Bilan de décaissement
> Stratégie produit et architecture technique. Document de référence complet pour Claude Code.
> Statut: DRAFT v3 — document complet vérifié, en attente d'approbation avant toute implémentation.
> Date: 2026-03-06

---

## 1. THÈSE PRODUIT

Essentiel et Intermédiaire vendent **la réponse à une question d'accumulation** : "Est-ce que j'épargne assez pour prendre ma retraite?" Le client est encore en phase active. Son enjeu est la croissance, la discipline, l'horizon.

Le Bilan de décaissement répond à une question fondamentalement différente : **"Comment je tire sur ce que j'ai construit sans manquer d'argent?"** Le client est déjà à la retraite, ou à moins de deux ans de l'être. Son enjeu n'est plus la croissance — c'est la séquence, la fiscalité du retrait, la longévité, le legs. Ce sont deux états d'esprit distincts, deux ensembles de préoccupations distincts, deux produits distincts.

Le Bilan de décaissement est un produit autonome à $59 CAD. Il n'est pas un dérivé de l'Intermédiaire. Il ne bifurque pas du pipeline Intermédiaire. Il a son propre quiz, son propre traducteur, son propre rapport, son propre simulateur. Les deux produits coexistent dans la grille tarifaire au même prix parce qu'ils servent deux phases de vie différentes — pas parce qu'ils sont équivalents en nombre de sections.

La promesse : **un rapport de 12 sections avec narration IA + un simulateur interactif de décaissement, livré en quelques minutes, pour $59.**

---

## 2. PRICING ET POSITIONNEMENT

### Grille tarifaire complète

| Produit | Prix | Audience | Livrable |
|---------|------|----------|---------|
| Essentiel | $29 one-time | Accumulateurs, début de parcours | Rapport 8 sections + narration IA |
| Intermédiaire | $59 one-time | Accumulateurs — situation complexe (couple, immo, CCPC) | Rapport 16 sections + 2 outils |
| **Bilan de décaissement** | **$59 one-time** | **À la retraite ou à moins de 2 ans** | **Rapport 12 sections + simulateur** |
| Expert | $129 one-time | Tous — simulateur MC illimité, explorer des scénarios | Simulateur MC + 5 exports IA |

### Règles tarifaires non-négociables
- Prix: $59 CAD one-time. Pas de rabais. Pas de bundles. Pas de coupons de lancement.
- Coupon second rapport: DECUM50 — 50% sur un deuxième Bilan de décaissement ($29.50). Même mécanique que les autres tiers — déclenché par le feedback (voir STRATEGY-EXPERT-PLAN §2.5). Coupon distinct à créer dans Stripe.
- Upgrade vers Expert: crédit de $59 déduit si passage vers Expert dans les 90 jours (même logique que Inter→Expert).
- Pas de bundle Inter + Décaissement. Pas de bifurcation. Pas de pipeline partagé.

### Pourquoi deux produits à $59
Intermédiaire: 16 sections, situation complexe d'accumulation (couple, immo, CCPC, fiscal).
Décaissement: 12 sections + simulateur interactif inclus, phase de retrait.
La valeur perçue est différente. Le simulateur justifie le prix pour le client qui veut tester ses scénarios de retrait. Les cartes produit sur index.html doivent rendre la distinction immédiatement lisible via les sous-titres ("Pour ceux qui épargnent encore" vs "Pour ceux qui approchent ou vivent la retraite").

---

## 3. AUDIENCE CIBLE ET DIFFÉRENCIATION VS INTERMÉDIAIRE

### Personas

**Profil A — Déjà à la retraite:**
Nicole, 67 ans, QC. Retraitée depuis 2 ans. FERR $280K, CÉLI $95K, NR $40K. RRQ en cours $1,100/mois. PSV pas encore activée (attend 70). Pension DB partielle $800/mois. Dépense $52K/an. Question: "Mon argent tient jusqu'à quand? Dans quel ordre je pige?"

**Profil B — À moins de 2 ans:**
Robert, 63 ans, ON. Retraite dans 18 mois. REER $420K, CÉLI $85K. CPP prévu à 65. Pension DB $1,400/mois (indexée). Dépenses prévues $68K/an. Question: "Meltdown REER avant 71? CPP à 65 ou 70?"

### Tableau de différenciation

| Dimension | Intermédiaire | Décaissement |
|-----------|--------------|--------------|
| Phase de vie | Accumulation active | Retraite ou transition immédiate (≤ 2 ans) |
| Question centrale | "Est-ce que j'épargne assez?" | "Comment je retire sans manquer?" |
| Revenus | Revenus de travail encore présents | Revenus de retraite seulement |
| Enjeux clés | Croissance REER/CÉLI, couple, immo, CCPC | Séquencement, FERR, CPP timing, GIS, legs |
| Rapport | 16 sections accumulation | 12 sections décaissement |
| Outil inclus | Allocation REER/CÉLI | Simulateur de décaissement |
| Pipeline | Entièrement séparé | Entièrement séparé |

Un client à 3 ans+ de la retraite avec situation complexe → Intermédiaire. Un client à la retraite ou à moins de 2 ans → Décaissement. Pas de zone grise intentionnelle dans le marketing.

---

## 4. QUIZ — public/quiz-decaissement.html

### Architecture
Thin client. Zero IP exposé côté client. Même architecture que quiz-essentiel.html et quiz-intermediaire.html: structure HTML/CSS identique, bilingual toggle FR/EN, cookie consent (Law 25) via localStorage, PostHog tracking gates, paywall screen blurred, answers chunked en JSON dans session.metadata Stripe (même pattern de chunking que les autres quizzes). **Lire quiz-essentiel.html et quiz-intermediaire.html en entier avant d'écrire une seule ligne.**

### 13 écrans (Screen 0 + 12 écrans quiz)

---

**Écran 0 — Routage (avant le quiz)**

Premier écran affiché à tout visiteur de quiz-decaissement.html. Une seule question, 3 options. Pas de barre de progression. Pas de champ de données. Son seul rôle est de protéger contre les achats dans le mauvais entonnoir.

FR: "Où en êtes-vous dans votre parcours?"
EN: "Where are you in your financial journey?"

Options:
- "Je suis encore en phase d'épargne active — je travaille toujours"
  → EN: "I'm still actively saving — I'm still working"
  → Action: redirect vers `/quiz-intermediaire.html` (redirect côté client, pas de server call)

- "Je suis à la retraite ou à moins de 2 ans de la retraite"
  → EN: "I'm retired or within 2 years of retiring"
  → Action: continuer vers Screen 1 du quiz décaissement

- "Je ne suis pas sûr(e)"
  → EN: "I'm not sure"
  → Action: afficher un bloc explicatif de 2 phrases, puis laisser choisir entre les deux premières options

Bloc explicatif (si "Je ne suis pas sûr(e)"):
- FR: "Le Bilan de décaissement s'adresse aux personnes qui ont cessé d'épargner activement et qui commencent à vivre de leur patrimoine. Si vous êtes encore en phase d'accumulation — revenus de travail, cotisations REER — le Rapport Intermédiaire est plus adapté."
- EN: "The Retirement Drawdown Report is for people who have stopped actively saving and are beginning to live off their assets. If you're still accumulating — employment income, RRSP contributions — the Intermédiaire Report is a better fit."

Notes d'implémentation:
- Ce screen ne crée pas de nouveau pipeline. C'est une question de routing UX uniquement.
- Le redirect vers quiz-intermediaire.html est un `window.location.href` côté client — aucun appel serveur.
- PostHog: tracker `decum_routing_screen` avec la valeur choisie (`accumulating` / `decumulating` / `unsure`) pour mesurer le taux de mauvais entonnoir.
- L'écran 0 n'est pas numéroté dans la barre de progression du quiz — la barre commence à Screen 1.

---

**Écran 1 — Profil de base**

Champs:
- Âge (input numérique, 50–90, validation côté client)
- Province (select, 13 provinces + territoires, même liste que les autres quizzes)
- Situation familiale: "Seul(e)" / "En couple"
- Si couple: âge du conjoint/de la conjointe (input numérique)
- Sexe biologique: "Homme" / "Femme" — maps to `params.sex`
  - Si couple: même champ pour le conjoint → `params.cSex`
  - Helper text: "Utilisé pour calibrer les projections de longévité selon les tables de mortalité canadiennes CPM-2023. Ces tables diffèrent selon le sexe biologique."
  - Note implémentation: champ obligatoire. Le moteur défaut à "M" si absent — produit un biais matériel pour les femmes dont l'espérance de vie est ~4 ans supérieure selon CPM-2023.

PostHog: `quiz_step_1_completed`, `{ tier: 'decaissement' }`

---

**Écran 2 — Phase de retraite**

Champs:
- Statut de retraite (radio, 3 options):
  - "Je suis déjà à la retraite"
  - "Je prends ma retraite dans moins d'un an"
  - "Je prends ma retraite dans 1 à 2 ans"
- Âge prévu de retraite (input numérique) — affiché seulement si statut ≠ "déjà retraité", pré-rempli selon statut sélectionné

Logic client: si "déjà retraité" → masquer le champ âge, passer `retAge = age` au traducteur.

---

**Écran 3 — Patrimoine**

Champs:
- Toggle REER/FERR: "Mon REER n'est pas encore converti en FERR" / "J'ai déjà un FERR"
  - Note UX: les deux paths mappent vers `params.rrsp` dans le traducteur — le moteur gère les minimums FERR automatiquement à 71. Le toggle sert à la clarté sémantique uniquement, pas à créer un nouveau param moteur.
  - Label adapté selon toggle: "Solde REER" vs "Solde FERR"
- Solde REER ou FERR (input $, required)
- Solde CÉLI (input $, required)
- Épargne non enregistrée (input $, optionnel — label: "Placements imposables hors REER/CÉLI")
- Si couple: mêmes 3 champs pour le conjoint (REER/FERR, CÉLI, NR)

Helper text sous chaque champ: "Valeur approximative — pas besoin d'être exact au dollar près."

---

**Écran 4 — Revenus gouvernementaux**

Sous-section RRQ/RPC (label province-aware: "RRQ" si QC, "RPC" sinon — même pattern que les autres quizzes):
- "Recevez-vous déjà la RRQ/RPC?" — Oui / Non
- Si Oui: montant mensuel reçu actuellement (input $)
- Si Non: "À quel âge prévoyez-vous la demander?" — radio: 60 / 65 / 70
  - Prestation mensuelle estimée (input $, optionnel — helper: "Consultez votre relevé de participation ou Mon dossier Service Canada")

Sous-section PSV/OAS (label province-aware: "PSV" si QC ET langue FR, "OAS" sinon):
- "Recevez-vous déjà la PSV/OAS?" — Oui / Non
- Si Oui: montant mensuel reçu actuellement (input $)
- Si Non: "À quel âge prévoyez-vous la demander?" — radio: 65 / 70

---

**Écran 5 — Pension d'employeur**

Champs:
- "Avez-vous un régime de retraite à prestations déterminées?" — Oui / Non
- Si Oui:
  - Montant mensuel (input $) — si déjà en cours: montant actuel reçu. Si pas encore: montant prévu.
  - "Cette pension est-elle indexée à l'inflation?" — Oui / Non / Partiellement
- Si couple + conjoint a une pension DB:
  - Mêmes 2 champs pour le conjoint

---

**Écran 6 — Objectif de dépenses**

Champs:
- Revenu annuel cible à la retraite (input $)
  - Helper: "Incluez toutes vos dépenses courantes — logement, alimentation, loisirs, voyages, santé."
- Flexibilité des dépenses si les marchés baissent (radio, 3 options):
  - "Rigide — j'ai besoin de ce montant chaque année sans exception" → `spendingFlex: "rigid"` → `gkOn: false`
  - "Modérée — je peux réduire jusqu'à 15% temporairement si nécessaire" → `spendingFlex: "moderate"` → `gkOn: true, gkMaxCut: 0.20`
  - "Flexible — je peux ajuster significativement selon les conditions du marché" → `spendingFlex: "flexible"` → `gkOn: true, gkMaxCut: 0.25`
  - Helper text: "Ce paramètre active les gardiens de dépenses dans les simulations — le rapport montre combien de fois votre budget pourrait être ajusté selon les marchés."
  - Note implémentation: maps directement aux paramètres Guyton-Klinger natifs du moteur (voir §5 — Traducteur). GK est pleinement implémenté dans lib/engine/index.js.

---

**Écran 7 — Stratégie REER/FERR**

Affiché seulement si: solde REER > 0 ET statut ≠ "déjà retraité".
Si déjà en FERR (toggle Screen 3 = FERR) ou déjà retraité → écran ignoré, `meltdownPref: false` par défaut.

Champs:
- "Souhaitez-vous retirer du REER maintenant pour réduire les retraits obligatoires à 71 ans?" (radio, 3 options):
  - "Oui — commencer les retraits dès ma retraite" → `meltdownPref: true`
  - "Non — laisser croître jusqu'à la conversion obligatoire" → `meltdownPref: false`
  - "Je ne sais pas — analyser les deux scénarios" → `meltdownPref: null`
- Helper text: "Le rapport présente toujours les deux scénarios côte à côte — cette préférence détermine lequel est affiché comme scénario de base."

---

**Écran 8 — Objectif successoral**

Champs:
- "Quelle est votre priorité pour votre patrimoine à long terme?" (radio, 3 options):
  - "Maximiser l'héritage pour mes proches" → `estatePref: "maximize"`
  - "Équilibré — laisser quelque chose sans me priver" → `estatePref: "balanced"`
  - "Profiter pleinement — je prévois dépenser mon patrimoine de mon vivant" → `estatePref: "spenddown"`

---

**Écran 9 — Tolérance au risque**

Scale appropriée pour la phase de décaissement — plafond 75% actions (vs 85% en accumulation):
- "Prudent — minimiser les fluctuations (40% actions / 60% obligations)" → `allocR: 0.40`
- "Équilibré — volatilité modérée acceptée (60% actions / 40% obligations)" → `allocR: 0.60`
- "Croissance — je tolère la volatilité pour un potentiel plus élevé (75% actions / 25% obligations)" → `allocR: 0.75`

Helper text: "En phase de décaissement, une allocation plus conservatrice est habituelle pour protéger le capital des fluctuations à court terme."

---

**Écran 10 — Hypothèses de rendement**

Champs:
- Rendement attendu du portefeuille (presets + input libre):
  - Conservateur: 3.5% | Modéré: 5.0% | Croissance: 6.5% | Personnalisé (input numérique)
  - Défaut suggéré selon allocR: prudent → 3.5%, équilibré → 5.0%, croissance → 6.5%
- Inflation (défaut 2.1%, ajustable 1%–4%)

Note: ces valeurs alimentent à la fois le moteur MC (rapport) et le simulateur interactif via URL params.

---

**Écran 11 — Contexte additionnel**

Champs (tous optionnels):
- Propriété immobilière:
  - Valeur estimée (input $)
  - Hypothèque restante (input $, défaut 0)
  - Note: alimente le calcul du patrimoine net affiché — pas modélisé comme source de retrait liquide
- Dettes restantes:
  - Montant total (input $)
  - Note: affiché dans le sommaire de patrimoine de la section 2

---

**Écran 12 — Courriel + consentement + paywall**

Champs:
- Adresse courriel (input, validation format email)
- Case à cocher acceptation des conditions — même texte légal que les autres quizzes, liens vers conditions.html + avis-legal.html. Validation serveur dans /api/checkout (même pattern que les autres tiers).
- Cookie consent: même pattern localStorage `buildfi_consent` que les autres quizzes (Law 25)
- Paywall: aperçu flou du rapport + CTA
  - FR: "Obtenir mon Bilan de décaissement →"
  - EN: "Get my Retirement Drawdown Report →"

Events PostHog: `quiz_completed`, `{ tier: 'decaissement' }`
Fetch: POST /api/checkout avec `{ type: "decaissement", answers: chunkedJSON, termsAccepted: true }`

---

## 5. TRADUCTEUR — lib/quiz-translator-decum.ts

### Signature et export
```typescript
export function translateDecumToMC(quizAnswers: Record<string, unknown>): MCParams
```
Même pattern d'export que `translateInterToMC` dans quiz-translator-inter.ts. **Lire quiz-translator-inter.ts en entier avant d'écrire.** Documenter toutes les heuristiques avec des commentaires inline dans le même style.

### Mappings complets

**Profil de base**
```
age      → params.age
province → params.province
cOn      → params.cOn = (situation === "couple")
cAge     → params.cAge (si couple)
```

**Sexe biologique — mortalité stochastique**
```
sex      → params.sex  = "M" | "F"
cSex     → params.cSex = "M" | "F"  (si couple)
// Champ obligatoire — moteur défaut "M" si absent, produit biais ~4 ans pour les femmes
// Utilisé par stochDeath() avec tables CPM-2023 (CPM_M / CPM_F dans engine/index.js:700-825)
```

**Phase de retraite**
```
retirementStatus === "retired"    → params.retAge = params.age
retirementStatus === "within_1yr" → params.retAge = params.age + 1
retirementStatus === "within_2yr" → params.retAge = params.age + 2
retirementAge (si fourni)         → params.retAge = retirementAge  // override
// Si déjà retraité: sal = 0, pas de contributions actives
params.sal = retirementStatus === "retired" ? 0 : 0  // décaissement — revenus de travail = 0
```

**Patrimoine**
```
rrspBal  → params.rrsp
// Note: REER et FERR mappent tous deux vers params.rrsp
// Le moteur gère automatiquement les minimums de retrait FERR dès 71 ans
// Le toggle REER/FERR dans le quiz est UX seulement — pas de param moteur distinct
tfsaBal  → params.tfsa
nrBal    → params.nr
// Si couple:
cRrspBal → params.cRRSP
cTfsaBal → params.cTFSA
cNrBal   → params.cNR
```

**Revenus gouvernementaux — RRQ/CPP**
```
// Déjà en cours:
if (qppAlreadyClaiming) {
  params.qppAge     = params.age         // déjà en paiement depuis un âge passé
  params.qppBenefit = qppMonthly * 12    // montant annualisé tel que reçu actuellement
}
// Pas encore demandée:
else {
  params.qppAge = qppPlannedAge  // 60, 65 ou 70

  // Heuristique qppBenefit si non fourni par l'utilisateur:
  // QC (RRQ max 2026): ~$1,364/mois à 65
  // Autres (CPP max 2026): ~$1,306/mois à 65
  // Facteurs d'ajustement selon âge de demande:
  //   60 → ×0.640  (réduction 36% vs 65)
  //   65 → ×1.000  (référence)
  //   70 → ×1.420  (bonification 42% vs 65)
  if (!qppMonthly) {
    const base = province === "QC" ? 1364 : 1306
    const factor = qppPlannedAge === 60 ? 0.64 : qppPlannedAge === 70 ? 1.42 : 1.00
    params.qppBenefit = base * factor * 12
  } else {
    params.qppBenefit = qppMonthly * 12
  }
}
```

**Revenus gouvernementaux — PSV/OAS**
```
// Déjà en cours:
if (oasAlreadyClaiming) {
  params.oasAge     = params.age
  params.oasBenefit = oasMonthly * 12
}
// Pas encore demandée:
else {
  params.oasAge = oasPlannedAge  // 65 ou 70

  // Heuristique oasBenefit si non fourni:
  // PSV/OAS max 2026: $727/mois à 65, $1,036/mois à 70
  if (!oasMonthly) {
    params.oasBenefit = (oasPlannedAge === 70 ? 1036 : 727) * 12
  } else {
    params.oasBenefit = oasMonthly * 12
  }
}
```

**Pension DB**
```
hasPension   → params.penType  = hasPension ? "db" : "none"
penMonthly   → params.pen      = penMonthly * 12  // annualisé
penIndexed   → params.penIdx   = (penIndexed === "yes" || penIndexed === true)
// Si couple:
cPenMonthly  → params.cPen    = cPenMonthly * 12
cPenIndexed  → params.cPenIdx = (cPenIndexed === "yes" || cPenIndexed === true)
```

**Dépenses et Guyton-Klinger**
```
retIncome → params.retIncome

// GK est pleinement implémenté dans lib/engine/index.js:1268
// Params: gkOn, gkCeil, gkFloor, gkCut, gkRaise, gkMaxCut
// Outputs MC: gkP5MinSpend, gkMedianCuts, gkAvgCutYrs, gkAvgMinFactor, gkAvgFactor

spendingFlex === "rigid" → {
  gkOn: false
  // Dépenses fixes — moteur applique retIncome sans ajustement selon les marchés
}

spendingFlex === "moderate" → {
  gkOn: true, gkCeil: 0.055, gkFloor: 0.03,
  gkCut: 0.10, gkRaise: 0.10, gkMaxCut: 0.20
  // Réduction max 20% — floor dépenses = retIncome × 0.80
  // Restauration +10% si taux de retrait < 3%
}

spendingFlex === "flexible" → {
  gkOn: true, gkCeil: 0.055, gkFloor: 0.03,
  gkCut: 0.10, gkRaise: 0.10, gkMaxCut: 0.25
  // Paramètres GK standard (Guyton & Klinger 2006)
  // Réduction max 25% — floor dépenses = retIncome × 0.75
}
```

**Stratégie meltdown REER**
```
meltdownPref === true  → params.melt = true,  params.meltTarget = 58523
meltdownPref === false → params.melt = false
meltdownPref === null  → params.melt = true   // défaut si "Je ne sais pas"
// Note: le webhook run toujours 2 scénarios de comparaison (melt=true et melt=false)
// indépendamment de cette préférence. La préférence détermine le scénario "base" affiché.
// meltTarget: premier palier fédéral 2026 ($58,523) — plafond du retrait annuel pour rester dans la tranche
```

**Objectif successoral → ajustement allocation**
```
estatePref === "maximize" → params.allocR = Math.max(params.allocR - 0.10, 0.30)
  // Plus conservateur — protège le capital
estatePref === "balanced" → params.allocR = params.allocR  // inchangé
estatePref === "spenddown"→ params.allocR = Math.min(params.allocR + 0.05, 0.75)
  // Légèrement plus agressif — priorité à la consommation
```

**Tolérance au risque**
```
allocR: prudent=0.40, équilibré=0.60, croissance=0.75
// Plafond 0.75 — jamais 0.85+ (accumulation seulement)
// Ajustement estatePref appliqué APRÈS (voir ci-dessus)
```

**Rendement et inflation**
```
eqRet → params.eqRet
inf   → params.inf  (défaut: 0.021)
// bndRet: même heuristique que quiz-translator-inter.ts
// bndRet = Math.max(0.01, eqRet - 0.035)
```

**Immobilier (optionnel)**
```
homeValue    → params.homeValue   (valeur brute)
homeMortgage → params.mortgage    (défaut 0 si non fourni)
// Modélisé comme actif net dans le sommaire patrimoine — pas source de retrait automatique
```

**Paramètres moteur fixes — décaissement**
```
params.wStrat     = "optimal"   // moteur gère le séquencement optimal via optimizeDecum()
params.stochMort  = true        // mortalité stochastique CPM-2023 — distribution d'âges de décès
                                 // inter-translator: true. Expert: true. Obligatoire ici.
params.fatT       = true        // t-Student df=5, queues épaisses
                                 // inter-translator: true. Expert: true. Obligatoire ici.
params.deathAge   = 105         // borne supérieure pour stochDeath() — jamais atteinte en pratique
params.goP        = 1.05        // Phase go-go: dépenses +5% début retraite (voyages, loisirs actifs)
params.slP        = 0.88        // Phase slow-go: dépenses –12% à partir de 75 ans
params.noP        = 0.75        // Phase no-go: dépenses –25% à partir de 85 ans
params.smileSlAge = 75          // Début phase slow-go
params.smileNoAge = 85          // Début phase no-go
params.healthMul  = 0.015       // Surcoût santé +1.5%/an après healthAge
params.healthAge  = 85          // Âge déclencheur surcoût santé
// Note: Essentiel utilise goP=slP=noP=1.0 (courbe plate — incorrect pour 30 ans de retraite)
// Inter et Expert utilisent ces valeurs. Décaissement doit impérativement utiliser la courbe.

params.glide      = true        // Glide path actif — allocation actions réduite de 1%/an avec l'âge
params.glideSpd   = 0.01        // Vitesse de glissement (même valeur que Expert)
// Pertinent pour décaissement: portefeuille naturellement plus conservateur avec le temps

params.sal        = 0           // Salaire = 0 — client en phase de retrait
params.monthlyContrib = 0       // Pas de contributions actives

// Minimums de simulation:
// Run base: N = 5,000 sims
// Runs de comparaison (meltdown, CPP timing): N = 1,000 sims
```

---

## 6. RAPPORT — lib/report-html-decum.js

### Architecture
**Lire lib/report-html-inter.js en entier avant d'écrire.** Même signature de fonction `renderReportDecum()`, même pattern `extractReportData()`, même structure de sections avec `secH()` + classes CSS `.sg` / `.sh` / `.sn` / `.co` / `.cogn`, même pattern de strings bilingues `t(fr, en)`, même bloc disclaimer AMF complet, même print styles, même font stack (Newsreader + DM Sans + JetBrains Mono), même palette CSS variables.

### Budget MC — runs séquentiels dans le webhook

Tous les runs sont séquentiels (pas de Promise.all — un seul thread serverless). Le webhook accumule tous les résultats avant le rendu.

| # | Run | Params clés | Sims | Usage |
|---|-----|-------------|------|-------|
| 1 | Base | params complets, stochMort=true, fatT=true, gkOn selon préférence, melt selon préférence | 5,000 | Sections 1–5, 8–12, Section 10 (deathAges), Section 9 (GK stats) |
| 2 | Melt off | `{...params, melt: false}` | 1,000 | Section 6 comparaison |
| 3 | Melt on | `{...params, melt: true}` | 1,000 | Section 6 comparaison |
| 4 | CPP 60 | `{...params, qppAge: 60}` | 1,000 | Section 7 break-even |
| 5 | CPP 65 | `{...params, qppAge: 65}` | 1,000 | Section 7 break-even |
| 6 | CPP 70 | `{...params, qppAge: 70}` | 1,000 | Section 7 break-even |

Budget temps estimé: 1 × 2.3s + 5 × 0.5s = ~4.8s. Confortablement dans la limite 60s Vercel.

Section 10 (Longévité): utilise la distribution `deathAges[]` du run base (stochMort=true). Aucun run additionnel nécessaire — la distribution émerge naturellement des 5,000 simulations.

Section 9 stress tests: si des runs "crash année 1" et "décennie plate" sont ajoutés, ce sont 2 runs supplémentaires à 1,000 sims chacun (+~1s). Décision à l'implémentation — peuvent alternativement être illustrés via les percentiles P5/P25 du fan chart du run base.

### Contrainte narrative — HARD CONSTRAINT (non négociable)

**Section 1 doit répondre à exactement 3 questions en langage clair avant toute analyse:**

1. **Est-ce que mon argent va durer?** → taux de durabilité + âge de couverture médian
2. **D'où viendra mon revenu?** → part garantie (RRQ+PSV+pension) vs part retrait de portefeuille
3. **Quel est mon plus grand risque?** → identifier et nommer le risque dominant (séquence de rendements / longévité / récupération PSV / taux de retrait trop élevé)

Ces 3 réponses constituent la charpente de la section 1. Tout le reste du rapport (sections 2-12) supporte et développe ces 3 réponses. Claude Code doit traiter cela comme une contrainte UX ferme lors de la construction de report-html-decum.js — pas une suggestion.

### Standard de langage — HARD CONSTRAINT

Ce rapport s'adresse à une audience de 60-70 ans, pas à des professionnels de la finance. Chaque section doit passer ce test: **est-ce qu'une personne sans formation financière comprend l'observation principale sans lire l'analyse de soutien?** Si non, réécrire le titre.

**Termes techniques interdits dans les titres de sections et la narration IA:**
Ces termes appartiennent exclusivement à la section Méthodologie (Section 12).

| Terme technique | Équivalent plain language obligatoire |
|----------------|--------------------------------------|
| Guyton-Klinger | "flexibilité des dépenses" |
| Mortalité stochastique | "espérance de vie variable" |
| Séquence de rendements (sequence of returns) | "risque lié à l'ordre des rendements" ou "l'impact des baisses en début de retraite" |
| Percentile P5/P25/P75/P95 | "dans les scénarios les plus favorables / défavorables" |
| Allocation d'actifs | "répartition actions/obligations" |
| Taux de retrait (withdrawal rate) | "pourcentage annuel retiré de votre portefeuille" |
| Monte Carlo | "milliers de scénarios simulés" (déjà dans les règles AMF) |
| Glide path | "réduction automatique du risque avec l'âge" |
| FERR (en titre) | "Fonds enregistré de revenu de retraite (FERR)" — première occurrence seulement, ensuite FERR accepté |

**Titres de sections — exemples approuvés vs interdits:**

| Interdit | Approuvé |
|---------|---------|
| "Risque de séquence de rendements" | "L'impact des baisses de marché en début de retraite" |
| "Mortalité stochastique et durabilité" | "Combien de temps votre argent pourrait-il durer?" |
| "Analyse Guyton-Klinger" | "Comment vos dépenses pourraient s'adapter si les marchés baissent" |
| "Synchronisation RRQ/RPC" | "À quel âge demander votre RRQ/RPC?" |
| "Séquencement optimal des retraits" | "Dans quel ordre retirer votre argent" |

**Application dans report-html-decum.js:** les `secH()` (titres de section) et les textes d'introduction de chaque section doivent respecter ce standard. Les termes techniques peuvent apparaître dans les notes de bas de tableau, les accordéons de détail, et la section Méthodologie uniquement.

**Application dans ai-prompt-decum.ts:** le system prompt doit explicitement interdire ces termes dans tous les 10 slots de narration IA, avec les équivalents plain language fournis comme remplacements obligatoires.

### 12 sections

---

**Section 1 — Sommaire exécutif**
Source moteur: `D.successRate`, `D.medRuin`, `D.rMedF`, revenus garantis calculés depuis params

Structure obligatoire — les 3 questions (voir contrainte narrative ci-dessus) doivent apparaître dans cet ordre, en plain language, avant les KPI cards:

**Q1 — Est-ce que mon argent va durer?**
- Grade ring (A+ à F). Labels adaptés décaissement:
  - A+ (≥90%): "Patrimoine très durable"
  - A (80-89%): "Solide"
  - B (70-79%): "Fragile"
  - C/D/F (<70%): "À corriger"
- Phrase: "Selon ces projections, votre patrimoine couvre vos besoins jusqu'à [medRuin] ans dans la moitié des scénarios simulés."

**Q2 — D'où viendra mon revenu?**
- Ligne visuelle: "[coverage]% de votre revenu cible est couvert par des revenus garantis (RRQ/RPC + PSV/OAS + pension). Le reste proviendra de vos retraits de portefeuille."
- Si coverage ≥ 80%: "Votre revenu est principalement garanti — vos retraits de portefeuille jouent un rôle de complément."
- Si coverage < 50%: "Votre revenu dépend en majorité de vos retraits de portefeuille — la durabilité est plus sensible aux conditions de marché."

**Q3 — Quel est mon plus grand risque?**
- Identifier et nommer le risque dominant parmi: l'impact des baisses de marché en début de retraite / la longévité / le risque de récupération PSV / un taux de retrait trop élevé
- Une phrase, plain language. Ex: "Votre plus grand risque selon ces projections: un taux de retrait de [X]% — au-dessus du seuil de durabilité habituel de 4%."
- AI slot: `snapshot_intro` (les 3 bullets TL;DR doivent répondre aux 3 questions dans cet ordre)

**KPI cards (après les 3 questions):**
- Taux de durabilité: `D.successRate`%
- Patrimoine médian réel à 85 ans: `D.rMedF` à year=(85−age)
- Revenu annuel durable: max retrait stable selon MC

---

**Section 2 — Profil de décaissement**
Source moteur: `params.*`, revenus garantis calculés

Composants:
- Tableau actifs par compte: REER/FERR | CÉLI | NR | Immobilier net | **Total patrimoine liquide**
- Tableau sources de revenus garantis: RRQ/RPC + PSV/OAS + Pension DB = total garanti $/an vs cible
- Écart à combler par les retraits de portefeuille (cible − garantis)
- AI slot: `profile_context`

---

**Section 3 — Trajectoire patrimoniale**
Source moteur: `D.pD` rows (toutes les années), percentiles P5/P25/P50/P75/P95

Composants:
- Fan chart SVG — même composant que Inter S2: 740×370px, 5 bandes percentiles P5→P95
- Horizon: âge actuel → 95 ans (stochMort couvre jusqu'à 105 en théorie, on affiche jusqu'à 95)
- Marqueurs verticaux annotés:
  - Âge de retraite (si pas encore retraité)
  - Âge début RRQ/CPP
  - Âge début PSV/OAS
  - Âge 71 (conversion FERR)
- AI slot: `trajectory_insight`

---

**Section 4 — Sources de revenus par année**
Source moteur: `optimizeDecum()` schedule — retraits FERR/CÉLI/NR + RRQ + PSV + pension par année

Composants:
- Graphique à barres empilées SVG, axe X: âge actuel → 85 ans
  - Couches (de bas en haut): Pension DB | RRQ/RPC | PSV/OAS | NR | CÉLI | FERR
  - Couleurs distinctes, légende, province-aware pour les labels
- Table sommaire: revenu total moyen par décennie
  - [retAge]–75 ans | 75–85 ans | 85+ ans
- AI slot: `income_sources_insight`

---

**Section 5 — Séquencement optimal des retraits**
Source moteur: `optimizeDecum()` year-by-year schedule (premier scénario de simulation, si=0)

Composants:
- Table: Âge | Compte | Retrait | Impôt estimé | Patrimoine fin d'année
  - Colonnes numériques en JetBrains Mono (`tabular-nums`)
- Highlights visuels:
  - Ligne âge 71: "Conversion FERR obligatoire" (badge badge-gold)
  - Années risque récupération PSV: revenu total > $90,997 (seuil 2026) — highlight rouge
  - Minimums FERR par âge: table de référence (71→95) affichée en accordéon
- Note AMF sous la table: "Ce séquencement illustre une projection selon ces hypothèses. Les conditions réelles pourraient différer. Il ne constitue pas un conseil en placement."
- AI slot: `sequencing_insight`

---

**Section 6 — Analyse REER/FERR et meltdown**
Source moteur: Run base + Run melt=false + Run melt=true

Seulement si solde REER > 0 au moment du rapport (si déjà en FERR depuis longtemps et solde = 0, section masquée).

Composants:
- Comparaison côte-à-côte: "Avec meltdown" vs "Sans meltdown"

| Métrique | Avec meltdown | Sans meltdown |
|----------|--------------|---------------|
| Taux de durabilité | X% | Y% |
| Patrimoine médian à 85 ans (réel) | $X | $Y |
| Impôt estimé sur 20 ans | $X | $Y |

- Montant de meltdown annuel suggéré: retrait REER pour atteindre le premier palier fédéral ($58,523 en 2026) sans le dépasser, en tenant compte des revenus garantis déjà présents
- Table des minimums FERR obligatoires par âge (71→95): taux légal selon la Loi de l'impôt sur le revenu + montant estimé sur le solde actuel projeté
- Framing AMF: "Une conversion anticipée pourrait réduire la charge fiscale future selon ces hypothèses."
- AI slot: `rrif_insight`

---

**Section 7 — Synchronisation RRQ/RPC**
Source moteur: Run CPP 60 + Run CPP 65 + Run CPP 70

Affichée seulement si: l'utilisateur n'a pas encore demandé sa RRQ/RPC. Si déjà en cours → section masquée.

Composants:
- Tableau comparatif 3 scénarios:

| Scénario | Durabilité | Revenu total RRQ à 85 ans | Break-even vs 65 |
|----------|-----------|--------------------------|-----------------|
| Demande à 60 | X% | $X | — |
| Demande à 65 | X% | $X | référence |
| Demande à 70 | X% | $X | [âge break-even] ans |

- Break-even: âge auquel le cumul RRQ à 70 dépasse le cumul RRQ à 65 (et 65 vs 60)
- Framing AMF obligatoire — exemples exacts de formulation approuvée:
  - "Reporter à 70 ans pourrait représenter [delta]$ de revenus supplémentaires sur 20 ans selon ces projections."
  - "L'âge optimal dépend de l'état de santé, des besoins de liquidités et d'autres facteurs non modélisés ici."
  - JAMAIS: "vous devriez reporter", "il vaut mieux attendre à 70", "la meilleure stratégie est..."
- AI slot: `cpp_insight`

---

**Section 8 — Fiscalité en décaissement**
Source moteur: `calcTax()` appliqué au schedule `optimizeDecum()` année par année

Composants:
- Taux marginal projeté par tranche d'âge (en vigueur selon les barèmes 2026):
  - [retAge]–70 | 70–75 | 75–80 | 80+
- Indicateur récupération PSV/OAS:
  - Années où le revenu total projeté > $90,997 (seuil 2026) — surlignées en rouge
  - Montant estimé de récupération le cas échéant
- Crédit pour revenu de pension ($2,000 fédéral): applicable dès que des revenus FERR sont perçus — affiché si pertinent
- Si couple: opportunité de fractionnement du revenu de pension — observation AMF compliant
- Imposition du FERR au décès: si décès sans conjoint → FERR entier imposé comme revenu l'année du décès (scénario pire cas illustré)
- AI slot: `tax_insight`

---

**Section 9 — Risque de séquence de rendements**
Source moteur: Run base + runs stress optionnels + stats GK du run base

Composants — stress de séquence:
- Tableau 3 scénarios (run base + 2 stress runs optionnels, ou illustration via P5/P25 du fan chart):

| Scénario | Durabilité | Patrimoine médian à 85 ans |
|----------|-----------|---------------------------|
| Rendements normaux | X% | $X |
| Correction –30% en année 1 de retraite | X% | $X |
| Décennie à rendements plats (eqRet ≈ inf pendant 10 ans) | X% | $X |

- Phrase de contexte: "Une baisse des marchés dans les premières années de décaissement a un impact disproportionné sur la durabilité du patrimoine, car les retraits s'effectuent sur un portefeuille déjà réduit."

Composants — Guyton-Klinger (affiché si gkOn=true):
- "Dans les scénarios simulés, des ajustements de dépenses ont été nécessaires en médiane [gkMedianCuts] fois."
- "Budget minimal atteint dans les scénarios P5: [gkP5MinSpend]$/an en dollars réels."
- "Durée médiane des périodes d'ajustement: [gkAvgCutYrs] ans."
- "Facteur de dépense moyen sur la période: [gkAvgFactor × 100]% du budget cible."
- Note: "Ces ajustements n'ont jamais réduit les dépenses de plus de [gkMaxCut × 100]% sous le budget cible."

Si gkOn=false (rigid): bloc statique — "Ces projections utilisent des dépenses fixes. Une certaine flexibilité budgétaire améliore la durabilité dans les scénarios défavorables."

Framing AMF: "Ces estimations reposent sur les hypothèses déclarées. Les conditions réelles peuvent différer."
- AI slot: `sequence_risk_insight`

---

**Section 10 — Longévité et durabilité**
Source moteur: run base avec `stochMort: true` — distribution naturelle des âges de décès CPM-2023

Composants:
- Le run base simule un âge de décès individuel pour chacune des 5,000 simulations via `stochDeath(age, sex)` utilisant les tables CPM-2023 (CPM_M ou CPM_F selon sexe déclaré). La distribution émerge naturellement — aucun run additionnel requis.

- Métriques affichées:
  - Espérance de vie médiane simulée: `D.avgDeath` — "Dans les simulations, l'espérance de vie médiane est [X] ans."
  - Taux de durabilité global: % des simulations où le patrimoine tient jusqu'à l'âge de décès simulé
  - Taux de durabilité à horizons fixes extraits de `D.pD`:
    - À 85 ans: X% des simulations encore positives
    - À 90 ans: X% des simulations encore positives
    - À 95 ans: X% des simulations encore positives

- Tableau de référence CPM-2023 (statique, calculé depuis les tables intégrées du moteur):

| Sexe | P25 (75% de chance de vivre jusqu'à) | P50 (médiane) | P75 (25% de chance) |
|------|--------------------------------------|---------------|---------------------|
| Homme 65 ans | 83 ans | 87 ans | 92 ans |
| Femme 65 ans | 86 ans | 90 ans | 94 ans |
| Couple (l'un ou l'autre survit) | 90 ans | 93 ans | 97 ans |
| Source | CPM-2023, facteurs d'amélioration 1%/an | | |

- Framing: "Ces projections simulent un âge de décès individuel pour chaque scénario selon les tables CPM-2023 (Institut canadien des actuaires). Elles ne constituent pas une prédiction de longévité personnelle."
- AI slot: `longevity_insight`

---

**Section 11 — Succession et legs**
Source moteur: `D.rMedEstateNet`, `D.rP25EstateNet`, `D.rP75EstateNet` aux années correspondant à 85, 90, 95 ans

Composants:
- Tableau patrimoine successoral en dollars réels (inflation-ajustés):

| Horizon | P25 | Médian | P75 |
|---------|-----|--------|-----|
| À 85 ans | $X | $X | $X |
| À 90 ans | $X | $X | $X |
| À 95 ans | $X | $X | $X |

- Message contextuel selon estatePref:
  - "maximize": "Selon ces projections, votre patrimoine se maintiendrait bien au-delà de votre espérance de vie médiane."
  - "balanced": "Selon ces projections, un patrimoine résiduel serait disponible pour vos proches dans la majorité des scénarios."
  - "spenddown": "Selon ces projections, votre patrimoine serait largement consommé de votre vivant — ce qui correspond à votre objectif déclaré."
- Note sur l'imposition du FERR au décès: si décès sans conjoint → FERR entier imposé comme revenu l'année du décès. Transfert conjoint: FERR→FERR, CÉLI→CÉLI (roulement fiscal à imposition nulle).
- AI slot: `estate_insight`

---

**Section 12 — Hypothèses et méthodologie**

Composants (tout en FR/EN bilingual):
- Tableau des paramètres utilisés: âge, province, balances par compte, revenus garantis, allocR, eqRet, inflation
- Méthodologie: "Ce rapport est généré à partir de [N] scénarios simulés selon des distributions statistiques à queues épaisses." — JAMAIS "Monte Carlo" dans le texte client-facing.
- Divulgation courbe de dépenses:
  - "Ces projections utilisent un profil de dépenses réaliste à trois phases: phase active ([retAge]–75 ans) à 105% du budget cible, phase intermédiaire (75–85 ans) à 88%, phase avancée (85+) à 75% + surcoût santé de 1.5%/an. Ces ratios correspondent aux données empiriques sur les dépenses des retraités canadiens."
- Divulgation mortalité stochastique:
  - "L'espérance de vie est simulée individuellement pour chaque scénario selon les tables de mortalité CPM-2023 (Institut canadien des actuaires), avec facteurs d'amélioration annuels de 1%."
- Divulgation glide path:
  - "L'allocation en actions diminue de 1% par an à mesure que l'âge avance, pour refléter un profil de risque naturellement plus conservateur en vieillissant."
- Divulgation Guyton-Klinger (si gkOn=true):
  - "Les dépenses peuvent être ajustées à la baisse (jusqu'à [gkMaxCut×100]% de réduction) si le taux de retrait dépasse 5.5% du portefeuille, et restaurées si le taux passe sous 3%. Cette mécanique est connue sous le nom de gardiens de dépenses (Guyton & Klinger, 2006)."
- Disclaimer AMF complet — même bloc que report-html-inter.js, adapté:
  - Ajouter: "Les projections de revenus gouvernementaux (RRQ/RPC, PSV/OAS) sont basées sur les barèmes 2026 et peuvent être modifiées par la législation future."
  - Ajouter: "Les minimums de retrait FERR présentés sont ceux établis par la Loi de l'impôt sur le revenu (Canada), édition 2026."
  - Ajouter: "Les calculs fiscaux sont des estimations. Consultez un fiscaliste ou un planificateur financier agréé (Pl. Fin.) pour les décisions importantes."
- Version du rapport + date de génération
- Pied de page: "BuildFi Technologies inc. — buildfi.ca"

---

## 7. NARRATION IA — lib/ai-prompt-decum.ts

### Architecture
**Lire lib/ai-prompt-inter.ts en entier avant d'écrire.** Même structure: DerivedProfile, RenderPlan, voice matrix (9 combos ton × littératie), system prompt AMF, user prompt DATA block + quiz answers + signals. Même format de sortie JSON (10 slots nommés). Même appel `callAnthropic()`, même `sanitizeAISlots()` depuis ai-constants.ts.

### 10 slots

| Slot | Contenu attendu | Ton | Longueur max |
|------|----------------|-----|-------------|
| `snapshot_intro` | Situation globale: durabilité, patrimoine médian, revenu couvert vs cible | Chaud, direct, grade 10 | 3 phrases |
| `profile_context` | Observation sur la structure des actifs et l'équilibre revenus garantis vs retraits requis | Observationnel | 2–3 phrases |
| `trajectory_insight` | Observation sur le fan chart: convergence/divergence des scénarios, stabilité perçue | Factuel | 2 phrases |
| `income_sources_insight` | Observation sur l'équilibre sources: dépendance aux retraits vs revenus garantis | Observationnel | 2–3 phrases |
| `sequencing_insight` | Observation sur l'ordre de retrait: ce que les données montrent sur la logique de séquencement | Factuel, prudent | 2–3 phrases |
| `rrif_insight` | Observation sur l'analyse meltdown: delta durabilité et contexte fiscal (conditionnel si section affichée) | Conditionnel | 2–3 phrases |
| `cpp_insight` | Observation sur l'analyse CPP/QPP: break-even et impact durabilité (conditionnel si section affichée) | Conditionnel, AMF strict | 2–3 phrases |
| `tax_insight` | Observation sur l'exposition fiscale: taux marginaux, risque récupération PSV | Factuel | 2–3 phrases |
| `sequence_risk_insight` | Observation sur la vulnérabilité aux mauvais rendements en début de retraite et GK si activé | Nuancé, pas alarmiste | 2–3 phrases |
| `longevity_insight` | Observation sur la couverture longévité selon les horizons stochastiques | Chaud, honnête | 2–3 phrases |

### Règles AMF strictes — formulations approuvées par slot

| Slot | Interdit | Approuvé |
|------|---------|---------|
| `cpp_insight` | "vous devriez reporter à 70 ans" | "reporter à 70 ans pourrait représenter [delta]$ de revenus supplémentaires selon ces projections" |
| `rrif_insight` | "il faut convertir", "vous devez faire le meltdown" | "une conversion anticipée pourrait réduire la charge fiscale future selon ces hypothèses" |
| `sequencing_insight` | "retirez d'abord de votre CÉLI" | "les données suggèrent que commencer par le CÉLI pourrait..." |
| `sequence_risk_insight` | "réduisez vos dépenses" | "une flexibilité budgétaire pourrait améliorer la durabilité dans les scénarios défavorables" |
| Tous | "recommandations", "optimisez", "Monte Carlo", "garantie" | "observations", "selon ces projections", "milliers de scénarios", "selon ces hypothèses" |

### Fallback statique obligatoire
Si `ANTHROPIC_API_KEY` absent ou erreur API → rapport complet avec texte statique informatif par section. Jamais un rapport avec des slots vides visibles. Même pattern que report-html-inter.js.

---

## 8. SIMULATEUR INTERACTIF — public/outils/decaissement-simulateur.html

### Architecture
Client-side uniquement. Déterministe — pas MC, pas d'appel serveur, pas d'authentification. Livré en bonus avec le rapport, lié depuis l'email et la page /merci.

**Lire public/outils/allocation-epargne.html en entier avant d'écrire.** Même architecture état → calcul → rendu. Même header BuildFi avec `logoSVG()` depuis /logo.js. Même palette CSS exacte (--navy, --gold, --cream, etc.). Même typographie (Newsreader + DM Sans + JetBrains Mono). Même toggle bilingue FR/EN. Même footer disclaimer AMF. Même pattern URL params pour pré-remplissage.

**Terminologie obligatoire**: "Projection centrale" (jamais "médian" ou "P50"). Le terme "médian" implique une distribution statistique qui n'existe pas dans un calcul déterministe. Cette distinction doit être respectée dans tout le texte du simulateur.

### Pré-remplissage via URL params

Le webhook construit l'URL de baseline depuis les params du rapport et la passe à `sendDecaissementEmail()` et à la page /merci.

```
?rrsp=X        — solde REER/FERR au moment du rapport
&tfsa=X        — solde CÉLI
&nr=X          — épargne non enregistrée
&age=X         — âge actuel
&retAge=X      — âge de retraite
&province=XX   — code province (QC, ON, BC, ...)
&spending=X    — revenu annuel cible ($)
&cpp=XX        — âge début RRQ/CPP (60, 65 ou 70)
&oas=XX        — âge début PSV/OAS (65 ou 70)
&melt=true     — meltdown REER actif dans le scénario de base
&pen=X         — pension DB annuelle totale (0 si aucune)
&alloc=X.X     — allocation actions (0.40, 0.60 ou 0.75)
&ret=X.X       — rendement attendu (ex: 0.05)
&inf=X.X       — inflation (ex: 0.021)
```

Bouton "Restaurer les hypothèses du rapport" — recharge tous les params URL originaux. Masqué si aucun param URL présent (accès direct au simulateur sans rapport).

### 8 levers ajustables (recalcul instantané à chaque changement)

| Levier | Type | Plage | Pas |
|--------|------|-------|-----|
| Âge début RRQ/CPP | Slider | 60–70 | 1 an |
| Âge début PSV/OAS | Slider | 65–70 | 1 an |
| Revenu annuel cible | Slider | ±30% autour du baseline | — |
| Meltdown REER | Toggle On/Off | — | — |
| Ordre de retrait | Select | Optimal / FERR en premier / CÉLI en premier / NR en premier | — |
| Glide path (réduction du risque avec l'âge) | Toggle On/Off | — | — |
| Rendement du portefeuille | Slider | 3%–8% | 0.5% |
| Inflation | Slider | 1%–4% | 0.5% |

### 5 panneaux de résultat (recalcul instantané)

| Panneau | Contenu |
|---------|---------|
| Patrimoine — projection centrale à 85 ans | Valeur nominale + valeur réelle (inflation-ajustée) |
| Revenu annuel durable | Taux de retrait courant × portefeuille → revenu stable projeté |
| Durée estimée du patrimoine | Années avant épuisement au taux de retrait courant |
| Risque récupération PSV/OAS | Indicateur Oui/Non si revenu annuel projeté > $90,997 (seuil 2026) |
| Comparaison rapport vs paramètres actuels | Table côte-à-côte: 3 métriques principales |

### Calcul déterministe

Formule: patrimoine(n) = patrimoine(0) × (1+ret_ajusté)^n − retrait_annuel × Σ(1+ret_ajusté)^k

- Province-aware: RRQ vs CPP, PSV vs OAS selon province
- Glide path: si activé, `ret_ajusté` diminue de 1% × allocR par an
- Impôt: taux effectif estimé (simplification — pas le calcul complet calcTax() du moteur)
- Revenues garantis: QPP + OAS + pension ajoutés au revenu, réduits du retrait requis

Disclaimer visible sous les panneaux:
- FR: "Ces projections sont des estimations à rendement constant. Elles ne modélisent pas les ajustements de dépenses Guyton-Klinger ni la mortalité stochastique — ces mécanismes s'appliquent dans le rapport principal. Les deux outils sont complémentaires."
- EN: "These projections are constant-return estimates. They do not model Guyton-Klinger spending adjustments or stochastic mortality — those mechanisms apply in the main report. The two tools are complementary."

---

## 9. PIPELINE TECHNIQUE — FICHIERS À CRÉER ET MODIFIER

### Fichiers à créer (nouveaux)

| Fichier | Description |
|---------|-------------|
| `public/quiz-decaissement.html` | Quiz thin client, 12 écrans |
| `lib/quiz-translator-decum.ts` | Traducteur quiz → params moteur (85+ champs) |
| `lib/report-html-decum.js` | Rapport 12 sections, rendu HTML complet |
| `lib/ai-prompt-decum.ts` | Prompt narration IA, 10 slots, DerivedProfile |
| `public/outils/decaissement-simulateur.html` | Simulateur interactif client-side |
| `tests/report-decum-calculations.test.js` | Suite de tests calculs (cible: 300+ tests, 0 failures) |

### Fichiers à modifier (existants)

| Fichier | Modification |
|---------|-------------|
| `app/api/checkout/route.ts` | Ajouter `type: "decaissement"`, validation `termsAccepted`, PostHog `checkout_initiated` |
| `app/api/webhook/route.ts` | Ajouter branche `"decaissement"` complète (6 runs MC séquentiels, AI, Blob, email) |
| `lib/email.ts` | Ajouter template email décaissement (table-based, bilingual, grade card, liens rapport + simulateur) |
| `public/index.html` | Ajouter carte produit Décaissement dans la section pricing (4e carte) |
| `app/merci/page.tsx` | Ajouter bloc conditionnel `tier === 'decaissement'` avec lien simulateur URL params |
| `public/robots.txt` | Ajouter `Disallow: /outils/decaissement-simulateur.html` |
| `docs/ARCHITECTURE.md` | Ajouter nœuds pipeline décaissement |
| `docs/TECH-REFERENCE.md` | Ajouter entrées DT, section traducteur, audit trail |
| `docs/STATUS.md` | Tracker l'avancement par étape |

### Webhook — branche décaissement (pseudo-code annoté)

```typescript
case "decaissement": {
  // 1. Idempotency — même pattern KV que Essentiel/Inter
  const idempKey = `decum:${sessionId}`
  if (await kv.get(idempKey)) return Response.json({ ok: true, cached: true })
  await kv.set(idempKey, true, { ex: 86400 })

  // 2. Traduire quiz → params moteur
  const params = translateDecumToMC(quizAnswers)
  // params contient: stochMort=true, fatT=true, gkOn selon spendingFlex,
  //   goP/slP/noP, glide=true, sex/cSex, etc.

  // 3. Run base — 5,000 sims
  const mc = runMC(params, 5000)
  const D = extractReportData(mc, params)
  // D.successRate, D.rMedF, D.medRuin, D.pD[], D.gkP5MinSpend, D.deathAges[], etc.

  // 4. Runs comparaison meltdown — 1,000 sims chacun
  const mcMeltOff = runMC({ ...params, melt: false }, 1000)
  const mcMeltOn  = runMC({ ...params, melt: true  }, 1000)

  // 5. Runs comparaison CPP timing — 1,000 sims chacun
  const mcCpp60 = runMC({ ...params, qppAge: 60 }, 1000)
  const mcCpp65 = runMC({ ...params, qppAge: 65 }, 1000)
  const mcCpp70 = runMC({ ...params, qppAge: 70 }, 1000)

  // 6. Narration IA (10 slots)
  const { sys, usr } = buildDecumAIPrompt(D, params, lang, quiz)
  const ai = await callAnthropic(sys, usr).catch(() => ({}))  // fallback {} si erreur

  // 7. Rendu rapport HTML
  const comparisons = { mcMeltOff, mcMeltOn, mcCpp60, mcCpp65, mcCpp70 }
  const html = renderReportDecum(D, mc, comparisons, quiz, lang, ai)

  // 8. Upload Vercel Blob
  const { url: blobUrl } = await put(`decum-${sessionId}.html`, html, { access: 'public' })

  // 9. Construire URL simulateur (baseline params)
  const simulatorUrl = buildDecumSimulatorUrl(D, params)

  // 10. Email
  await sendDecaissementEmail({ email, blobUrl, simulatorUrl, grade: D.grade, lang })

  // 11. Admin alert en cas d'erreur (même pattern que les autres tiers)
  return Response.json({ ok: true })
}
```

### Landing page index.html — carte Décaissement

Ajouter comme 4e carte dans la section pricing. Ne pas modifier les cartes existantes.

```
FR:
Bilan de décaissement
"Pour ceux qui approchent ou vivent la retraite"
$59 — paiement unique

✓ Rapport personnalisé — 12 sections, narration IA
✓ RRQ/RPC: analyse des scénarios 60/65/70
✓ Séquencement optimal des retraits
✓ Analyse REER/FERR et meltdown
✓ Simulateur interactif inclus

[Analyser mon décaissement →]  → /quiz-decaissement.html

EN:
Retirement Drawdown Report
"For those approaching or living retirement"
$59 — one-time payment

✓ Personalized report — 12 sections, AI narration
✓ CPP/OAS: 60/65/70 scenario analysis
✓ Optimal withdrawal sequencing
✓ RRSP/RRIF meltdown analysis
✓ Interactive simulator included

[Analyze my drawdown →]  → /quiz-decaissement.html
```

### Page /merci — bloc décaissement

```tsx
{tier === 'decaissement' && (
  <section>
    <h2>{lang === 'fr' ? 'Vos outils inclus' : 'Your included tools'}</h2>
    <div className="tool-card">
      <h3>{lang === 'fr' ? 'Simulateur de décaissement' : 'Drawdown Simulator'}</h3>
      <p>{lang === 'fr'
        ? 'Vos données de rapport sont pré-remplies — explorez différents scénarios.'
        : 'Your report data is pre-filled — explore different scenarios.'}</p>
      <a href={`/outils/decaissement-simulateur.html${simulatorParams}`}>
        {lang === 'fr' ? 'Ouvrir le simulateur →' : 'Open simulator →'}
      </a>
    </div>
  </section>
)}
```

---

## 10. STRIPE — NOUVEAUX PRODUITS

### Produits à créer manuellement dans Stripe Dashboard

| Item | Valeur | Type | Variable d'env |
|------|--------|------|---------------|
| Bilan de décaissement | $59 CAD | Paiement unique | `STRIPE_PRICE_DECAISSEMENT` |
| Coupon DECUM50 | 50% de réduction | Coupon single-use par email | — |

### Vercel env vars
- Ajouter `STRIPE_PRICE_DECAISSEMENT` après création dans Stripe
- Pas de nouveau webhook endpoint — même URL `www.buildfi.ca/api/webhook`
- Redéployer Vercel après ajout de la variable

---

## 11. AMF COMPLIANCE CHECKLIST

### Grep automatique avant tout commit

```bash
grep -rn \
  "devriez\|recommandons\|vous devez\|il faut que\|optimisez\|plan d'action\|garantie\|sans risque\|Monte Carlo\|vous devriez\|you should\|we recommend\|optimize\|action plan\|guarantee\|risk-free\|constituerait\|devrait\|Concentrez" \
  public/quiz-decaissement.html \
  lib/quiz-translator-decum.ts \
  lib/report-html-decum.js \
  lib/ai-prompt-decum.ts \
  public/outils/decaissement-simulateur.html
# Résultat attendu: 0 correspondance
```

### Termes interdits et formulations approuvées

| Contexte | Interdit | Approuvé |
|----------|----------|----------|
| CPP/QPP timing | "vous devriez reporter à 70 ans" | "reporter à 70 ans pourrait représenter [X]$ de revenus supplémentaires selon ces projections" |
| RRIF/meltdown | "il faut convertir", "vous devez faire le meltdown" | "une conversion anticipée pourrait réduire la charge fiscale future selon ces hypothèses" |
| Séquencement | "retirez d'abord de votre CÉLI" | "les données suggèrent que commencer par le CÉLI pourrait..." |
| Dépenses | "réduisez vos dépenses" | "une réduction temporaire des dépenses pourrait améliorer la durabilité selon ces projections" |
| Moteur | "Monte Carlo" (client-facing) | "milliers de scénarios simulés" |
| Simulateur | "médian", "P50" (résultats déterministes) | "projection centrale" |
| GK | "vos dépenses seront réduites" | "les dépenses pourraient être ajustées selon les conditions de marché" |

### Disclaimer obligatoire section 12 — contenu minimal
- Avis non-conseil (même texte AMF que les autres rapports)
- Barèmes RRQ/CPP et PSV/OAS basés sur 2026, sujets à changement législatif
- Minimums FERR selon la Loi de l'impôt sur le revenu (Canada) 2026
- Calculs fiscaux: estimations — consulter un fiscaliste ou Pl. Fin.
- Mortalité stochastique: tables CPM-2023, ne constituent pas une prédiction individuelle

---

## 12. BUILD ORDER SÉQUENTIEL

Suivre cet ordre strict lors de l'implémentation. Ne pas sauter d'étapes. Valider chaque étape avant de passer à la suivante.

```
Étape  1 — public/quiz-decaissement.html
  → Lire quiz-essentiel.html + quiz-intermediaire.html en entier d'abord
  → 12 écrans selon le §4 exactement
  → Paywall, Stripe fetch, metadata chunking, cookie consent, PostHog
  → Test local: remplir le quiz complet, vérifier les données dans la console
  → Vérifier le chunking: answers > 500 chars → chunked correctement

Étape  2 — lib/quiz-translator-decum.ts
  → Lire quiz-translator-inter.ts en entier d'abord
  → Tous les mappings du §5 — aucun oubli
  → Vérifier: stochMort=true, fatT=true, gkOn selon spendingFlex, goP/slP/noP, glide=true, sex/cSex
  → Test manuel avec profils canary Nicole et Robert — outputs dans console

Étape  3 — lib/report-html-decum.js — sections 1 à 8
  → Lire report-html-inter.js en entier d'abord
  → Sections 1, 2, 3, 4, 5, 6, 7, 8 seulement
  → Valider visuellement avec données canary
  → Grep AMF après chaque section — 0 terme interdit

Étape  4 — tests/report-decum-calculations.test.js (sections 1-8)
  → Écrire les tests de calcul pour les sections 1 à 8
  → Cible: 150+ tests, 0 failures avant de continuer
  → Tester sur tous les profils canary

Étape  5 — lib/report-html-decum.js — sections 9 à 12
  → Section 9: stress séquence + GK stats (gkOn=true et gkOn=false)
  → Section 10: stochMort deathAges distribution + table CPM-2023 statique
  → Section 11: succession fourchette P25-P75
  → Section 12: hypothèses complètes + disclaimer AMF complet
  → Grep AMF — 0 terme interdit

Étape  6 — tests/report-decum-calculations.test.js (sections 9-12)
  → Compléter la suite de tests pour sections 9-12
  → Cible: 300+ tests total, 0 failures

Étape  7 — lib/ai-prompt-decum.ts
  → Lire ai-prompt-inter.ts en entier d'abord
  → DerivedProfile, RenderPlan, voice matrix, system prompt AMF, 10 slots
  → Tester localement via /api/ai-narrate avec un profil canary

Étape  8 — app/api/checkout/route.ts
  → Ajouter case "decaissement"
  → Validation termsAccepted (même pattern que les autres tiers)
  → Tester avec Stripe test mode — checkout complet

Étape  9 — app/api/webhook/route.ts
  → Ajouter branche "decaissement" (pseudo-code §9)
  → 6 runs MC séquentiels, AI narration, Blob upload, email
  → Idempotency KV, admin alert sur erreur
  → Test E2E complet avec Stripe test card → vérifier rapport livré

Étape 10 — lib/email.ts
  → Lire les templates existants en entier d'abord
  → Template décaissement: table-based, bilingual, grade card, lien rapport, lien simulateur
  → Upsell Expert en bas: "Pour explorer des milliers de scénarios, le simulateur Expert est disponible"
  → AMF footer, signature BuildFi Technologies inc.

Étape 11 — public/outils/decaissement-simulateur.html
  → Lire outils/allocation-epargne.html en entier d'abord
  → 8 levers, 5 panneaux de résultat, URL params pré-remplissage
  → Glide path toggle, calcul déterministe province-aware
  → Bouton "Restaurer les hypothèses du rapport"
  → Test complet: données rapport → URL → simulateur pré-rempli → recalcul sur chaque levier

Étape 12 — public/index.html
  → Ajouter carte Décaissement (4e carte) selon le texte exact du §9
  → Ne pas toucher aux 3 cartes existantes
  → Validation visuelle mobile + desktop

Étape 13 — app/merci/page.tsx
  → Bloc conditionnel tier === 'decaissement' avec lien simulateur + URL params baseline
  → Tester: achat décaissement → page /merci → bloc outil visible → lien simulateur pré-rempli

Étape 14 — public/robots.txt
  → Ajouter: Disallow: /outils/decaissement-simulateur.html
  → Ne pas toucher aux autres règles existantes

Étape 15 — Stripe + Vercel (manuel)
  → Créer produit "Bilan de décaissement" $59 CAD dans Stripe Dashboard
  → Créer coupon DECUM50 (50%, single-use, valide 90 jours)
  → Ajouter STRIPE_PRICE_DECAISSEMENT dans Vercel env vars
  → Redéployer Vercel

Étape 16 — Test E2E complet
  → Quiz complet → Stripe test card → Webhook → Rapport HTML → Email → Simulateur
  → Profil Nicole (67 ans, QC, déjà retraitée)
  → Profil Robert (63 ans, ON, retraite dans 18 mois)
  → Profil couple QC 65+60 ans
  → Vérifier sur chaque profil: rapport lisible, sections correctes, GK stats présentes, Section 10 stochMort, simulateur pré-rempli depuis email

Étape 17 — Documentation
  → Mettre à jour STATUS.md: phase Décaissement complétée
  → Mettre à jour ARCHITECTURE.md: nœuds du pipeline décaissement
  → Mettre à jour TECH-REFERENCE.md: entrées DT, audit trail
```

---

## 13. TESTS REQUIS AVANT LANCEMENT

### Suite de tests automatisés

| Fichier | Contenu | Seuil requis |
|---------|---------|-------------|
| `tests/report-decum-calculations.test.js` | Calculs 12 sections, profils canary (5), comparaisons meltdown/CPP, GK stats, stochMort outputs, AMF compliance strings | **300+ tests, 0 failures** |

### Profils canary décaissement

| ID | Profil | Description | Résultat attendu |
|----|--------|-------------|-----------------|
| `nicole_67_qc` | Déjà retraitée, QC | 67 ans F, FERR $280K, CÉLI $95K, NR $40K, RRQ $1,100/mois, PSV à 70, pension DB $800/mois, dépenses $52K, flexible | Durabilité ~72%, Section 6 masquée (FERR), Section 7 masquée (RRQ déjà en cours) |
| `robert_63_on` | Préretraite, ON | 63 ans M, REER $420K, CÉLI $85K, CPP prévu 65, pension DB $1,400/mois indexée, dépenses $68K, moderate | Durabilité ~85%, Section 6 active (meltdown), Section 7 active (CPP) |
| `couple_qc_65_60` | Couple, QC | H65 F60, REER combiné $600K, CÉLI $120K, deux pensions DB partielles, dépenses $75K, balanced | Durabilité ~88%, fractionnement pension section 8 |
| `fire_55_bc` | FIRE, BC | 55 ans M, REER $800K, CÉLI $120K, pas de pension, CPP à 65, dépenses $45K, flexible | Durabilité ~62%, bridge 10 ans avant CPP/OAS |
| `fragile_70_mb` | Fragile, MB | 70 ans F, FERR $120K, CPP minimal $650/mois, dépenses $38K, rigid | Durabilité ~22%, grade F — canary must-be-F |

### Checklist manuelle avant lancement

**Architecture et données:**
- [ ] Champ sexe biologique: Screen 1 présent, `sex`/`cSex` dans translator, CPM_M/CPM_F sélectionnées correctement
- [ ] `stochMort: true` dans translator, `deathAges[]` distribution utilisée dans Section 10
- [ ] `fatT: true` dans translator
- [ ] `gkOn: true` quand moderate/flexible, GK stats affichées dans Section 9
- [ ] `gkOn: false` quand rigid, bloc statique dans Section 9
- [ ] `goP: 1.05, slP: 0.88, noP: 0.75` dans translator (pas de courbe plate)
- [ ] `glide: true, glideSpd: 0.01` dans translator, lever On/Off dans simulateur
- [ ] 6 runs MC séquentiels dans webhook, aucun Promise.all
- [ ] Section 6 masquée si déjà en FERR et solde ≈ 0
- [ ] Section 7 masquée si RRQ/CPP déjà en cours

**AMF et légal:**
- [ ] Grep AMF: 0 terme interdit dans les 5 fichiers du pipeline
- [ ] Section 12: spending smile, stochMort, GK, glide path tous divulgués
- [ ] Disclaimer AMF complet dans Section 12 (non-conseil, FERR 2026, CPM-2023, fiscaliste)
- [ ] Simulateur disclaimer: mentionne absence GK et stochMort (déterministe)
- [ ] "Projection centrale" (jamais "médian") dans tout le simulateur

**UX et pipeline:**
- [ ] Quiz complet sur mobile iPhone SE — tous les 12 écrans lisibles
- [ ] Screen 7 (meltdown) masqué si statut="déjà retraité" ou toggle Screen 3 = FERR
- [ ] Rapport imprimé (window.print()) — mise en page correcte, break-inside:avoid
- [ ] Simulateur: 8 levers fonctionnels, recalcul instantané sans bouton
- [ ] URL params simulateur: pré-remplissage correct depuis email + /merci
- [ ] Bouton "Restaurer les hypothèses du rapport" fonctionnel
- [ ] Email: liens rapport + simulateur fonctionnent
- [ ] Page /merci: bloc décaissement affiché, lien simulateur pré-rempli
- [ ] Landing page: carte Décaissement visible, CTA fonctionnel
- [ ] Stripe test card: paiement → rapport livré en < 30s
- [ ] Idempotency: même `session_id` deux fois → un seul rapport généré
- [ ] Admin alert: erreur webhook → alerte reçue
- [ ] robots.txt: simulateur désindexé, quiz indexable
- [ ] `npm run build`: 0 erreurs, 0 warnings
