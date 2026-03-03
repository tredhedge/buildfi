# STRATÉGIE EXPERT — Plan complet v4
> Document de référence complet pour Claude Code.
> Couvre : produit, pricing, architecture, Bilan Annuel, migration,
> alertes automatisées, conformité AMF, anti-abus, professionnalisation.
> Date: 2026-03-02

---

## 1. THÈSE CENTRALE

Essentiel et Intermédiaire vendent **la réponse**. Expert vend **la capacité d'explorer**.

Le client Essentiel veut savoir "est-ce que ça va aller?". Il reçoit un rapport, il a sa note, c'est fini. Le client Expert veut savoir "et si je change X?". Le simulateur est son laboratoire. Les rapports sont les photos de ce qu'il y trouve.

**Expert ne vend pas un meilleur rapport. Expert vend la capacité permanente d'explorer sa propre situation financière.**

---

## 2. PRICING

### Structure confirmée

| Tier | Prix | Modèle | Contenu |
|------|------|--------|---------|
| Essentiel | **$29 one-time** | 1 rapport | 8 sections, AI narration |
| Intermédiaire | **$59 one-time** | 1 rapport | 16 sections, AI narration, couple, immo, fiscal |
| **Expert** | **$129 one-time** | **Plateforme + exports** | **Simulateur illimité + 5 exports AI** |
| Expert renouvellement | **$29/an** | Maintien accès | Simulateur + 3 exports AI + Bilan Annuel |
| Export AI additionnel | **$14.99** | À la carte | 1 rapport complet avec narration IA |
| Bilan Annuel | Inclus (Expert) | **Hors quota** | Garanti chaque janvier, ne consomme pas d'export |

### Crédits = "Exports"
Le simulateur est **illimité**. Les crédits servent à exporter des **livrables formels** :
- **Export AI** : rapport HTML/PDF complet avec narration IA personnalisée. Coût Anthropic : ~$0.03.
- **Résumé 1 page** : capture du diagnostic (note, KPIs, fan chart, 3 constats). **Illimité, gratuit.** Pas un rapport — une photo de l'état actuel.
- Pas d'export "sans AI" — le résumé 1 page couvre la trace rapide, l'export AI couvre le livrable formel.

Modèle mental : "Je joue autant que je veux. Je paie pour des livrables imprimables."

### Framing du $129 → $29
"Année 1 : accès complet + 5 exports AI. Renouvellement : 29 $/an — accès continu + 3 exports + Bilan Annuel chaque janvier. Exports additionnels : 14,99 $."

### Ratios et psychologie
| Saut | Ratio | Net après crédit | Feeling |
|------|-------|-----------------|---------|
| Ess → Inter | 2.0x | +$30 | "Le double pour le portrait complet" |
| Inter → Expert | 2.2x | +$70 | "Le simulateur illimité pour $70 de plus" |
| Ess → Expert | 4.4x | +$100 | Chiffre rond, psychologiquement clean |

### Upgrade credits
| De → Vers | Crédit | Net payé |
|-----------|--------|----------|
| Essentiel → Inter | $29 | $30 |
| Inter → Expert | $59 | $70 |
| Essentiel → Expert | $29 | $100 |

Données quiz persistées entre tiers.

### 2e rapport à 50%
Après livraison du premier rapport (Ess ou Inter), le client reçoit une offre :
- "Un deuxième bilan pour un proche ou un nouveau scénario : **50% de rabais.**"
- Essentiel 2e : $14.50 | Intermédiaire 2e : $29.50
- Coupon Stripe single-use lié à l'email du premier achat
- Valide 90 jours après le premier achat
- S'applique au même tier ou inférieur (pas d'upgrade déguisé)
- **Le coupon est débloqué par le feedback** (voir §2.5 ci-dessous)

### 2.5 PIPELINE DE FEEDBACK AUTOMATISÉ

#### Philosophie
Le feedback est collecté de TOUS les clients, pas seulement ceux qui achètent un 2e rapport. Deux moments naturels, zéro friction, tout automatisé.

#### Moment 1 — Bloc étoiles dans le rapport (J+0)
En bas du rapport HTML, après le disclaimer, un bloc intégré :
- "Comment était votre bilan?" + 5 étoiles cliquables
- Chaque étoile = lien `<a href="www.buildfi.ca/api/feedback?token={token}&rating={N}">`
- Clic → route API enregistre dans KV → redirect vers page remerciement
- Page remerciement : "Merci! Un mot à ajouter?" + champ texte optionnel
- Pas de formulaire, pas de page séparée. 2 secondes de friction max.

#### Moment 2 — Email de suivi J+3 (automatisé)
Cron Vercel : 3 jours après livraison, email Resend automatique.

Contenu :
- "Bonjour [prénom], votre bilan a été livré il y a 3 jours. On aimerait savoir : est-ce que c'était utile?"
- Étoiles cliquables (5 liens vers `/api/feedback?token={token}&rating={N}`)
- "Recommanderiez-vous BuildFi? [Oui] [Peut-être] [Non]" (3 liens)
- "Dites-nous en plus → [lien page feedback complète]"
- "En bonus : votre avis débloque un 2e bilan à 50%."

Page feedback complète = questions segmentées par tier :

*Essentiel :*
1. Clarté du rapport (1-5 étoiles, si pas déjà donné)
2. "Qu'avez-vous appris de nouveau?" (texte libre)
3. "Recommanderiez-vous BuildFi?" (Oui / Peut-être / Non, si pas déjà donné)
4. "Qu'est-ce qu'on pourrait améliorer?" (texte libre)

*Intermédiaire :*
1. Clarté du rapport (1-5 étoiles)
2. "Les sections [immobilier / fiscalité / couple] étaient-elles pertinentes?" (Très / Assez / Pas vraiment)
3. "Avez-vous partagé le rapport avec votre conjoint(e)?" (Oui / Non / N/A)
4. "Recommanderiez-vous BuildFi?" (Oui / Peut-être / Non)
5. "Qu'est-ce qu'on pourrait améliorer?" (texte libre)

*Expert :*
1. "Le simulateur était-il intuitif?" (1-5 étoiles)
2. "Quels workflows avez-vous utilisés?" (Tester / Optimiser / Les deux / Aucun)
3. "Le rapport Expert était-il plus utile que ce que vous trouvez ailleurs?" (Beaucoup / Un peu / Pas vraiment)
4. "Utiliseriez-vous le Bilan Annuel en janvier?" (Oui / Peut-être / Non)
5. "Qu'est-ce qu'on pourrait améliorer?" (texte libre)

#### Déblocage du coupon 2e rapport
- Client a déjà donné du feedback (étoiles dans rapport OU email J+3) → coupon SECOND50 automatiquement débloqué, lien dans l'email J+3 et sur la page feedback
- Client n'a PAS donné de feedback et clique directement "2e rapport 50%" → page interstitielle avec les questions comme pré-requis. Filet de sécurité.

#### Pipeline de témoignages (J+7)
```
J+0   Rapport livré → bloc étoiles intégré dans le rapport HTML
J+3   Email auto (cron) → étoiles + NPS + lien page complète + mention coupon 50%
J+7   SI rating ≥ 4 ET NPS "Oui" → Email auto : demande de témoignage
J+7   SI rating ≤ 2 → Flag review manuel pour propriétaire (KV alert)
J+14  SI pas de feedback → dernier rappel doux dans l'email offre 2e rapport
```

**Email J+7 témoignage :**
"Merci pour votre retour! Votre commentaire nous aide à améliorer BuildFi. Seriez-vous d'accord pour qu'on l'affiche sur notre site?"
- [Oui, avec mon prénom et ma ville]
- [Oui, totalement anonyme]
- [Non merci]

Si "Oui" → KV flaggé `testimonial_ready: true` + `testimonial_type: "named"|"anonymous"`. Sélection manuelle par propriétaire pour la landing page.

#### Stockage KV
`feedback:{email}` → `{ rating, nps, text, tier, date, source: "report"|"email"|"page", testimonial_consent, testimonial_type }`

#### Exploitation des données
- **NPS agrégé** → métrique business clé (viser >50)
- **Étoiles 1-3** → alerte propriétaire, investigation
- **Texte libre "améliorer"** → grep récurrent, feature requests roadmap
- **Texte libre "appris"** → contenu pour landing page + articles SEO
- **Témoignages approuvés** → landing page section "Ce que nos clients disent" (3-5 suffisent)
- **Taux de réponse** → objectif 30%+ (J+0 étoiles) + 15%+ (J+3 email)

### Programme de référencement
Chaque client reçoit un lien de référencement unique après son achat.

| Action | Référent reçoit | Référé reçoit |
|--------|-----------------|---------------|
| 1 référence convertie | 50% off prochain achat BuildFi | 15% off premier achat |
| 3 références converties | Export AI gratuit (valeur $14.99) | 15% off premier achat |
| 5 références converties | Upgrade Expert gratuit (1 an) | 15% off premier achat |

Coût marginal quasi-nul (~$0.003/rapport). Chaque référence convertie = ~$25+ de revenu net.

Implémentation : `referral:{code}` dans Vercel KV → `{ referrer_email, uses, conversions }`. Coupon Stripe dynamique pour le référé. Crédit/upgrade manuel ou automatisé pour le référent.

### Early adopter
| Tranche | Rabais | Ess | Inter | Expert |
|---------|--------|-----|-------|--------|
| Premiers 100 | 50% | $14.50 | $29.50 | $64.50 |
| 101–200 | 25% | $21.75 | $44.25 | $96.75 |
| 201+ | 0% | $29 | $59 | $129 |

---

## 3. SEGMENTS DE CLIENTÈLE

### Segment A : Couple 45-55 ans propriétaire (~40%)
**Profil :** Jean et Sophie, 48 ans, QC. Deux revenus ($80K + $65K), maison $450K (hypo $180K), REER combinés $120K, pension DB (elle).
**Besoin :** Tester départ décalé, fractionnement, downsizing.
**Déclencheur :** Rapport Inter dit "+9 points avec un report de 2 ans."
**Niveau simulateur :** Rapide.

### Segment B : Incorporé·e CCPC (~20%)
**Profil :** Marc, 42 ans, consultant IT, QC. Revenu corp $200K, BNR $350K, mix sal/div.
**Besoin :** Optimiser rémunération, planifier extraction, grind revenu passif.
**Déclencheur :** "Le simulateur modélise votre sortie corporative avec 9 scénarios de stress."
**Niveau simulateur :** Personnalisé.

### Segment C : Pré-retraité anxieux 55-65 ans (~25%)
**Profil :** Pierre, 58 ans, ON. Fonctionnaire fédéral, pension DB. Maison $600K payée. REER $280K.
**Besoin :** Quand partir. RRQ 60/65/70? Meltdown? OAS clawback?
**Déclencheur :** L'optimiseur 8 axes.
**Niveau simulateur :** Rapide.

### Segment D : FIRE / DIY enthusiast (~15%)
**Profil :** Alexis, 34 ans, QC. Ingénieur $110K. CELI maxé, REER $80K, NR $40K. FIRE à 45.
**Besoin :** Stress-test agressif. Taux de retrait, séquence de rendements.
**Déclencheur :** "5 000 scénarios MC avec queues épaisses."
**Niveau simulateur :** Avancé.

---

## 4. ONBOARDING — Deux portes d'entrée

### Porte A : Quiz guidé → simulateur pré-rempli

Quiz Expert = quiz Inter (80+ champs) + ~20-30 champs additionnels + bloc H.

**Champs supplémentaires vs Inter :**
- Allocation détaillée (% actions / obligations / cash)
- MER par compte (REER, CELI, NR)
- Taux de croissance salariale
- Événements futurs (héritage, dépense majeure)
- Assurance-vie (prime, durée, type)
- RESP / enfants
- Revenus de location détaillés

**Bloc H — Préférences du simulateur :**

**Rapide** — "On utilise les meilleures pratiques pour tout."
→ Active : stochMort, fatT, stochInf, Guyton-Klinger, allocation dynamique. 8-10 onglets. Segments A/C.

**Personnalisé** — "Vous choisissez vos hypothèses."
→ Toggles : Rendements, Mortalité, Inflation, Décaissement, Allocation. Segments B/D.

**Avancé** — "Accès complet. 30 onglets, 190 paramètres."

### Mode guided par segment

À l'entrée, choix de profil :
- "Pré-retraité avec pension DB" / "Couple avec maison" / "Incorporé·e CCPC" / "FIRE"
→ Adapte : onglets, décisions prêtes-à-tester, tooltips, defaults.

### Porte B : Entrée directe

1. **Charger mon profil** (KV, multi-device)
2. **Profil type** (FIRE 35 / Couple 50 / CCPC / Pré-retraité DB) — première victoire <90s
3. **Vierge** — tout remplir

### Upgrade depuis Inter
Données Inter récupérées → bloc H + ~20 champs additionnels → simulateur pré-rempli. Zéro re-saisie.

---

## 5. PROGRESSIVE DISCLOSURE

### Temps 1 — Core (5-6 onglets toujours visibles)
- Diagnostic — Note A+ à F, KPIs, distribution MC
- Revenus — RRQ/PSV/pension/retraits, Sankey, cash-flow
- Projection — Fan chart P5–P95, patrimoine
- Patrimoine — Comptes, bilan net, impôt au décès
- Analyse — Stress tests, What-If, Tornado

### Temps 2 — Avancé (déclenché par données OU choix)

| Donnée quiz | Onglet activé |
|---|---|
| couple = oui | Couple |
| propriétaire = oui | Immobilier |
| pension DB = oui | Stratégie (Rente vs Rachat) |
| CCPC = oui | Entreprise |
| worries contient "tax" | Fiscalité |
| riskTolerance ≥ 4 | Optimiseur |

### Smart defaults visuels
Champ pré-rempli → indicateur discret. Au clic → explication. Client modifie → indicateur disparaît.

### Driver attribution sur chaque KPI
Chaque KPI affiche POURQUOI :
- "72% — limité par un taux de retrait de 5.8% (au-dessus de 4%)"
- "B+ — récupération PSV sur 4 années réduit d'un demi-grade"
- "$1,827/mois — RRQ 65 ($1,100) + PSV ($727). Pas de pension employeur."

Le moteur a les données. C'est du rendering.

---

## 6. TROIS WORKFLOWS "PILOTE AUTOMATIQUE"

3 boutons au-dessus des onglets :

### "Tester une décision"
Contextualisé par segment :
- Couple : "Décaler la retraite de 2 ans?" / "Downsizing à 63?"
- CCPC : "Salaire 60% vs dividendes 60%?" / "Vente à 55 vs 60?"
- Pré-retraité : "RRQ à 60, 65 ou 70?" / "Meltdown REER?"
- FIRE : "Taux de retrait 3.5% vs 4.5%?" / "Crash année 1?"
→ Deux scénarios server-side. Delta succès + delta impôt + graphique.

### "Optimiser automatiquement"
"Les 3 ajustements à plus fort impact."
→ Optimiseur 8 axes server-side. Top 3 + fourchette + liens onglets.

### "Faire mon Bilan Annuel"
Check-list "7 nombres." → Bilan complet. Voir §7.

---

## 7. BILAN ANNUEL — Définition complète

### Concept
Chaque janvier : mise à jour des chiffres → portrait fiscal de CETTE année avec estimations en dollars. Pas une projection 30 ans.

### Nom
"Bilan annuel" / "Check-up fiscal annuel" — JAMAIS "Plan d'action" ou "Recommandations."

### INPUT — Check-list "7 nombres"

| # | Champ | Pourquoi |
|---|-------|----------|
| 1 | Soldes comptes (REER, CELI, NR, conjoint) | Patrimoine actuel |
| 2 | Revenu T4 / net (ou corporatif si CCPC) | Paliers d'imposition |
| 3 | Hypothèque : solde + taux + renouvellement | Cash-flow + vente |
| 4 | Contribution annuelle épargne | Rythme accumulation |
| 5 | Dépenses annuelles estimées | Taux de retrait |
| 6 | Événements de l'année | Ajustements ponctuels |
| 7 | Changements majeurs | Recalibrer hypothèses |

Auto-rempli depuis profil sauvegardé. Temps : <3 minutes.

### PROCESSING
1. Recalcul MC 5,000 sims avec nouveaux chiffres
2. Comparaison temporelle vs dernier profil
3. Exécution 6 catégories de scénarios (A-F)
4. Impact estimé par scénario ($ ou points de succès)
5. Génération AI (claude-sonnet-4) narration personnalisée
6. Assemblage rapport Bilan Annuel

### OUTPUT — Structure du rapport (9 pages)

**Page 1 — Tableau de bord annuel**
- Note avec delta : "B+ → A- (+1 demi-grade)"
- Taux de succès avec delta : "81% → 87% (+6 points)"
- Patrimoine net actuel vs projeté
- Graphique d'évolution multi-année
- Phrase AI résumé

**Page 2 — Comparaison temporelle ("Le chemin parcouru")**
- Table KPI : maintenant vs l'an dernier vs il y a 2 ans
- Driver attribution : "L'amélioration de +6 points : hausse marchés (+4) + épargne (+2)"
- Fan chart superposé

**Pages 3-6 — 6 catégories de scénarios**

**A. Séquencement des retraits** — Meltdown REER montant optimal, ordre de retrait, FERR timing
**B. Prestations gouvernementales** — RRQ 60/65/70 break-even, PSV vs seuil récupération, SRG
**C. Optimisation fiscale** — Fractionnement, partage RRQ, REER conjoint, crédit pension $2K, taux marginal actuel vs retraite
**D. Immobilier** (si applicable) — Valeur/équité, scénario vente, HELOC vs liquidation
**E. Corporatif** (si CCPC) — Mix sal/div optimal, seuil $50K passif, rythme extraction
**F. Succession** — Impôt décès, roulement conjoint, LCGE/CDA

Chaque scénario : observation + impact $ + mécanisme + phrase AI.

**Page 7 — "Questions à poser à votre fiscaliste"**
5-7 questions personnalisées avec contexte chiffré + espace "Réponse du professionnel."

**Page 8 — "Pour votre professionnel"**
Hypothèses, paramètres MC, lien simulateur (read-only snapshot), note éducative.

**Page 9 — Disclaimers complets**

### Calendrier de rétention
- Décembre : "Préparez vos chiffres"
- Janvier : "Votre bilan est prêt"
- Février : "3 scénarios à explorer avec votre fiscaliste"

### AMF — Non-négociable
1. "Le modèle a exploré un scénario où..." — jamais "Vous devriez..."
2. "L'économie estimée serait d'environ $X" — jamais "Vous économiserez $X"
3. Conditionnel obligatoire partout
4. Explication du mécanisme
5. Renvoi au professionnel à chaque scénario
6. Disclaimer début ET fin

---

## 8. TRIGGERS DE RETOUR — Le problème du "jour 2"

### Philosophie
BuildFi n'est pas un tracker de marché. Le client revient quand SA VIE change, pas quand LE MARCHÉ bouge. Envoyer "les marchés ont bougé de -12%" c'est du market timing déguisé — ça dilue la marque et c'est risqué AMF.

Les triggers de retour sont planifiés et centrés sur le client, pas réactifs aux marchés.

### 8.1 Bilan Annuel (janvier) — Le trigger principal
- Décembre : email "Préparez vos chiffres pour janvier"
- Janvier : "Votre Bilan Annuel est prêt. Mettez à jour vos 7 chiffres."
- Février : "3 scénarios à explorer avec votre fiscaliste" (contenu du Bilan)

C'est le cœur de la rétention Expert. Le Bilan Annuel EST le trigger de retour.

### 8.2 Anniversaire de plan (6 mois)
6 mois après le dernier calcul (premier rapport ou dernier Bilan) → email rappel doux.
"Vos chiffres ont peut-être changé depuis [date]. Mettez à jour en 3 minutes."

Contenu généré automatiquement depuis le dernier profil :
- "Votre CELI a-t-il atteint le plafond 2026?"
- "Votre hypothèque a-t-elle été renouvelée?"
- "Votre revenu a-t-il changé?"

Pas de recalcul, pas d'alerte — juste un rappel contextuel.

### 8.3 Veille réglementaire (interne, pas push client)
Cron RSS/scrape des sources officielles (même pipeline que §14 constantes fiscales).
Quand un changement réglementaire est détecté :
1. **Article SEO** publié sur le blog ("Le nouveau plafond CELI 2027 : ce que ça change")
2. **Bannière in-app** pour les abonnés Expert : "Nouveauté fiscale 2027 — constantes mises à jour."
3. **Entrée changelog** sur /mises-a-jour
4. **PAS d'email push** — le client voit la bannière quand il revient, pas un push anxiogène

Sources surveillées (pour la veille interne + constantes) :
- canada.ca/en/department-finance/news.html (RSS)
- servicecanada.gc.ca (OAS/GIS/CPP trimestriel)
- revenuquebec.ca/en/press-room/
- osfi-bsif.gc.ca/en/news
- 13 Min. Finances provinciaux

### 8.4 Renouvellement
- J-30 : "Votre accès Expert expire le [date]. Renouvellement : 29 $/an."
- J-7 : rappel avec résumé valeur reçue ("X exports générés, succès Z%→W%")
- J-0 : tentative charge Stripe ou lien paiement
- J+3 : accès lecture seule si échec
- J+30 : dernière chance. Profils conservés 12 mois.

### Calendrier annuel de communication

| Mois | Communication | Type |
|------|--------------|------|
| Décembre | "Préparez vos chiffres" | Email |
| Janvier | "Votre Bilan est prêt" | Email + in-app |
| Février | "3 scénarios à explorer" | Email |
| Mois 6 post-calcul | "Vos chiffres ont changé?" | Email |
| J-30 expiration | "Renouvellement" | Email |
| Quand applicable | "Nouveauté fiscale" | Bannière in-app + changelog |

### Ce qu'on NE fait PAS
- Alertes de marché (TSX, S&P 500, etc.)
- Emails réactifs aux événements économiques
- Notifications push anxiogènes
- "Les marchés ont bougé, recalculez!" — c'est du market timing déguisé

---

## 9. HISTORIQUE DES HYPOTHÈSES (Audit Trail)

### Problème
Client qui modifie 30 champs se perd. "Pourquoi mon score a baissé?"

### Solution
```
profiles[slot].changelog: [
  { date, field: "retAge", from: 62, to: 58, deltaSucc: -8 },
  { date, field: "retSpM", from: 5000, to: 5500, deltaSucc: -3 },
]
```

### UX
- Panneau "Derniers changements" (collapsible)
- Chaque entrée : champ, ancienne→nouvelle valeur, impact sur succès
- "Revenir en arrière" (undo)
- "Comparer à mon plan de base" (snapshot initial vs actuel)
- Mini graphique : courbe succès avec événements de modification

---

## 10. CONFORMITÉ AMF — Pipeline 3 couches

### Couche 1 — Lint UI (build-time, CI/CD)
Scan toutes strings FR/EN à chaque commit.

**Interdits :** "vous devriez", "nous recommandons", "il faut", "vous devez", "garanti", "assuré", "plan d'action", "recommandation", "optimisez", "maximisez", "stratégie optimale", "le meilleur choix", "you should", "we recommend", "you must", "guaranteed", "best strategy"

**Obligatoires :** "pourrait", "serait", "estimé", "le modèle a exploré", "environ", "à des fins éducatives" (+ EN equivalents)

Build échoue si violation.

### Couche 2 — Lint AI output (runtime)
1. Scan texte AI généré contre liste interdite
2. Violation → remplacement automatique ("vous devriez" → "il pourrait être pertinent de")
3. >3 violations dans un slot → rejet + fallback statique
4. Log violations pour monitoring

### Couche 3 — Watermark langage (design system)
Templates obligatoires dans prompt AI :
- "Le modèle a exploré un scénario où..."
- "L'impact estimé serait d'environ..."
- "Un professionnel peut évaluer si..."

Badges visuels : "Scénario exploré" (bleu), "Estimation" (orange), "À valider avec un professionnel" (gris).

---

## 11. ANTI-ABUS ET CGU

### CGU — Usage personnel
"La licence Expert est personnelle et non-transférable. L'utilisation pour le compte de tiers nécessite une licence Professionnel. BuildFi se réserve le droit de révoquer l'accès en cas d'utilisation commerciale non autorisée."

### Garde-fous techniques
- Rate limit : 1 export / 2 min, 20 exports / jour, 100 recalculs MC / jour
- Détection : >5 exports avec profils significativement différents dans 1 semaine → flag admin (pas de blocage auto)
- Token : lien permanent, rate limit par token (pas IP), page `/acces/revoquer`
- Data model prêt pour B2B : `accountType: "personal" | "professional"`

---

## 12. ARCHITECTURE TECHNIQUE

### MC côté serveur, TOUJOURS
Le moteur (lib/engine/index.js, 2,426 lignes, 436 tests) ne tourne JAMAIS dans le navigateur.

### Deux couches de latence

**Client (<50ms) :** Déterministe, formules publiques (QPP/OAS estimé, cash-flow basique). Feedback instantané. Zéro IP.

**Serveur (~2.3s, async) :** MC 5,000 sims + Guyton-Klinger + mortalité stochastique. Debounce 1.5s. Skeleton loader.

### Coût serveur
| 100 clients actifs | $0.87/mois Vercel | $30/an Anthropic |
| 1,000 clients | $8.70/mois | $300/an |

### Compte Expert — Magic link + Vercel KV
```
expert:{email} → {
  token, expiry,
  exportsAI: 5,                 // année 1 = 5, renouvellement = 3
  bilanUsed: false,             // reset chaque janvier
  profiles: [],                 // 5 slots nommés
  quizData: {...},
  changelog: [],                // audit trail (§9)
  created, lastAccess,
  tier: "expert",
  accountType: "personal",      // prêt B2B
  upgradedFrom: null,
  engineVersion: "11.12.9",     // version au dernier calcul
  constantsYear: 2026,          // constantes actives
  reportsGenerated: []          // { id, date, type: "expert"|"bilan", sections[], engineVer, fiscalYear, blobUrl }
}
```

Lien permanent : `buildfi.ca/simulateur?token=abc123`
Si perdu : `/acces` → email → nouveau lien.
Renouvellement : webhook étend expiry + reset crédits.

---

## 13. LANDING PAGE — Section Expert

### Hero
**Headline :** "Votre laboratoire financier personnel."
**Subhead :** "190 paramètres. 5 000 scénarios. Vos décisions, testées."

### 3 blocs workflow
**Simulez** — "Testez chaque variable : âge de retraite, RRQ 60/65/70, meltdown REER, downsizing."
Ex: "Reporter le RRQ de 65 à 70 : +$247/mois, break-even à 82 ans."

**Optimisez** — "L'optimiseur analyse 8 axes, identifie les 3 ajustements à plus fort impact."
Ex: "Meltdown REER pré-retraite : économie fiscale estimée de $18,400."

**Recalculez** — "Chaque janvier, Bilan Annuel : scénarios fiscaux de votre année."
Ex: "En 2027, retrait REER de $22,000 sous le seuil PSV."

### "Expert n'est pas pour tout le monde"
**Pour vous si :** scénarios multiples, situation complexe, comprendre les chiffres, bilan annuel
**Pas pour vous si :** juste une note → Essentiel ($29) / portrait sans simulateur → Inter ($59)

### "Ce que vous obtenez"
| Inclus | Détail |
|--------|--------|
| Simulateur illimité | 190 paramètres, 30+ modules, bilingue FR/EN |
| 5 exports AI | Rapports complets avec narration personnalisée |
| Résumés 1 page illimités | Capture diagnostic instantanée |
| Bilan Annuel | Check-up fiscal chaque janvier (hors quota) |
| 5 profils sauvegardés | Multi-scénario, multi-device |
| Alertes réglementaires et rappels | Bannière in-app quand les règles changent + rappel 6 mois |
| Historique des changements | Comparez vos décisions dans le temps |
| Section "Pour votre fiscaliste" | Questions préparées avec contexte chiffré |

### Pricing block
Expert 129 $ → 5 exports AI + simulateur illimité + Bilan Annuel
Renouvellement 29 $/an → 3 exports + Bilan Annuel
Export additionnel 14,99 $

### 3 mini-cards décisions
1. "RRQ à 60 vs 70 : +42% de pension mensuelle, break-even à 82 ans"
2. "Retraite à 58 vs 62 : delta de 11 points sur le taux de succès"
3. "Vendre la maison à 65 : +$280K liquidités, succès +14 points"

### FAQ Expert
- **Remplace un planificateur?** Non. Outil éducatif. Validation avec pro encouragée.
- **Combien de temps?** Quiz : ~10 min. Profil type : <90s.
- **Données en sécurité?** Chiffrées, jamais partagées/vendues. Export/suppression possible.
- **Si je ne renouvelle pas?** Perte accès simulateur/exports. Profils conservés 12 mois.
- **Pour mes clients?** Licence personnelle. Licence Pro disponible prochainement.

### Trust signals
- "Moteur validé par 436 tests automatisés"
- "Fiscalité 13 provinces, constantes 2026 vérifiées"
- "Tables de mortalité CPM-2014 (Institut canadien des actuaires)"
- "Aucune publicité. Aucune vente de données."

---

## 14. MAINTENANCE ANNUELLE DES CONSTANTES FISCALES

### Inventaire (~173 valeurs)
| Catégorie | Valeurs | Fréquence | Source |
|---|---|---|---|
| Fédéral (paliers, taux, BPA) | ~8 | Annuelle (nov) | CRA NR4-1 |
| Prestations (OAS, GIS, CPP, QPP) | ~8 | Trimestrielle | Service Canada |
| REER/CELI/CELIAPP plafonds | ~3 | Annuelle (nov) | CRA |
| Provincial (13 × ~9 champs) | ~117 | Annuelle (budgets) | Min. Finances |
| Corporatif (13 × 3 taux) | ~39 | Annuelle | Min. Finances |
| LCGE | 1 | Rare | Loi de l'impôt |
| Mortalité CPM | ~120 lignes | ~5-10 ans | ICA |

### Architecture
```
lib/engine/constants/
├── schema.ts              ← validation TypeScript
├── fiscal-2026.json       ← figé à jamais
├── fiscal-2027.json       ← nouveau chaque année
├── corporate-2026.json
├── benefits-2026.json
├── benefits-2027-Q1.json  ← ajusté trimestriellement
├── mortality-cpm2014.json
├── metadata.json          ← { currentYear, lastUpdate, sources[] }
└── index.ts               ← charge selon année de simulation
```

### Pipeline 5 couches

**1. Veille (cron hebdomadaire)** — Même cron que §8.2. Fetch + hash pages officielles. Si changement → diff + notification admin. Sources primaires uniquement.

**2. Extraction (semi-auto)** — Système propose diff : "FED_BRACKETS 2026→2027: [58523→59800,...]". Chaque valeur sourcée (URL + date + publication). Propriétaire vérifie. Approbation → JSON généré automatiquement.

**3. Tests de cohérence (auto)**
- Structurels : champs complets, paliers croissants, taux 0-1, plages raisonnables
- Continuité : chaque valeur indexée ±5% de l'année précédente
- Fonctionnels : 5 profils types, impôt ±5% de l'année précédente, ±$500 des calculateurs CRA/RQ
- Régression MC : 1,000 sims sur 3 profils, taux de succès ±3 points

**4. Déploiement** — Commit versionné avec sources. Metadata dans chaque fichier. Rapport affiche "Constantes 2027 — vérifiées le [date]". Alerte clients.

**5. Audit trail** — Fichiers figés par année. Rapport de 2026 = constantes 2026 toujours. Preuve de diligence AMF.

### Calendrier
| Mois | Action |
|------|--------|
| Nov | CRA paliers fédéraux + REER/CELI |
| Déc | Provinces commencent à publier |
| Janv | Service Canada OAS/GIS/CPP Q1 + Bilan Annuel |
| Mars-Avril | Budget fédéral + provincial |
| Avr/Juil/Oct | OAS/GIS trimestriel |

---

## 15. PROFESSIONNALISATION DU CYCLE DE VIE

### 15.1 Versioning des rapports
Chaque rapport : ID unique, date, version moteur (git hash), constantes utilisées.
Pied de page : "Généré le [date] | Moteur v11.12.9 | Constantes 2026 (vérifiées 2025-11-20) | 5,000 sims MC"
Si constantes changent après génération → notification : "Nouvelles constantes disponibles. Regénérer?"
Archivage : rapports accessibles pendant abonnement + 12 mois.

### 15.2 QA automatisé
Script `npm run qa:full` :
- [ ] 436 tests moteur
- [ ] Lint AMF 0 violations
- [ ] 5 profils types : impôt ±$500 des calculateurs CRA/RQ
- [ ] MC regression : 3 profils, succès ±2 points vs dernière release
- [ ] Rapport généré pour chaque tier — aucun crash, aucune section vide
- [ ] Export HTML rendu correct (Chrome, Safari, Firefox, mobile)
- [ ] Email livraison reçu (Gmail, Outlook, Yahoo)
- [ ] Stripe test purchase e2e
- [ ] MC 5,000 sims <3s sur Vercel serverless

### 15.3 Monitoring production
- `/api/health` : API up, KV accessible, MC fonctionne (10 sims), Anthropic up, Resend up, Blob up
- Cron 15 min ping health → si failure → notification (email ou Slack webhook)
- Log structuré chaque rapport : `{ id, email_hash, tier, duration_ms, mc_sims, ai_tokens, success, error }`
- Dashboard admin simple : uptime 30j, rapports générés, temps MC, erreurs

### 15.4 Support
- Page `/support` : FAQ (20 questions), formulaire catégorisé, "réponse dans 48h ouvrables"
- Articles SEO (§16) = base de connaissances
- Disclaimer dans chaque réponse fiscale

### 15.5 Facturation et renouvellement
- J-30 : email "Expire le [date]. Renouvellement 29 $/an."
- J-7 : rappel avec résumé valeur reçue ("X rapports, succès Z% → W%")
- J-0 : charge Stripe (si auto) ou lien paiement
- J+3 : si échec → accès lecture seule (profils visibles, pas de recalculs/exports)
- J+30 : dernière chance. Profils conservés 12 mois.
- Facture officielle Resend avec # séquentiel, TPS/TVQ

### 15.6 Données personnelles
- `/confidentialite` : politique complète (données collectées, stockage, rétention, pas de vente)
- "Télécharger mes données" → JSON complet
- "Supprimer mon compte" → confirmation → purge KV 30 jours
- LPRPDE + Loi 25 Québec compliance

### 15.7 Traçabilité moteur
- Inputs complets (190 params) sauvegardés dans blob avec chaque rapport
- Mode debug optionnel dans "Pour votre professionnel" : détail année par année
- Version moteur (git hash) dans chaque rapport
- Reproduction exacte : mêmes inputs + même version + mêmes constantes = même résultat

### 15.8 Gestion des erreurs connues
Si bug affecte rapports existants :
1. Identifier rapports affectés via logs
2. Email ciblé : "Correction de [description]. Votre rapport a été regénéré."
3. Nouveau rapport note : "Remplace version du [date]. Correction : [description]."
4. Ancien rapport accessible avec avertissement

### 15.9 Release notes
- Page `/mises-a-jour` en langage client (pas technique)
- Versioning sémantique du moteur
- Bannière in-app après mise à jour majeure

---

## 16. STRATÉGIE DE CONTENU SEO

### Un article par scénario
25-30 articles des 6 catégories du Bilan Annuel :
- "Meltdown REER : comment ça fonctionne"
- "RRQ à 60, 65 ou 70 : le break-even personnalisé"
- "Fractionnement de revenu de pension : qui y gagne?"
- "Le grind du revenu passif CCPC : le seuil de 50 000$"

Chaque article : éducatif (AMF-safe), se termine par "Testez votre scénario dans le simulateur Expert."

### Bilinguisme dès jour 1
Marché anglophone canadien 4x plus grand. FIRE community anglophone. Zéro compétiteur "Canadian retirement simulator interactive."
EN : "Canadian RRSP meltdown calculator", "CPP 60 vs 65 vs 70 break-even"

---

## 16.5. A/B TESTING (PostHog)

PostHog est déjà installé (NEXT_PUBLIC_POSTHOG_KEY configurée). Feature flags + A/B testing gratuits sur le plan Free (1M events/mois).

### Ce que Claude Code fait (Session S9)
- Intègre le SDK PostHog complet dans le code (tracking events, feature flags)
- Crée les wraps `posthog.getFeatureFlag()` autour des éléments testés
- Configure le tracking des events clés : `quiz_started`, `checkout_initiated`, `checkout_completed`, `report_viewed`, `feedback_submitted`, `referral_clicked`
- Crée `docs/AB-TESTING-GUIDE.md` — guide étape par étape pour que le propriétaire soit autonome sur la création d'expériences dans PostHog

### Ce que le propriétaire fait (5 minutes par expérience)
1. app.posthog.com → Feature Flags → Create → nommer le flag → définir les variants → 50/50 split → Save
2. Experiments → Create → lier au feature flag → choisir le goal (ex: `checkout_completed`) → Launch
3. Attendre 2-3 semaines (~200+ visiteurs par variant)
4. Regarder le résultat → garder le gagnant → lancer la prochaine expérience

PostHog calcule la significativité statistique automatiquement et dit quand un variant gagne.

### Expériences recommandées au lancement

| # | Expérience | Variantes | Goal | Notes |
|---|-----------|-----------|------|-------|
| 1 | CTA Essentiel | "Obtenir ma note" vs "Voir mon bilan" | checkout_completed | Wording = 5-15% delta potentiel |
| 2 | Order product cards | Ess first vs Inter first | Revenue total checkout | Inter-first = decoy plus visible |
| 3 | Trust grid position | Dans hero vs sous hero | Scroll depth + checkout | Confiance = conversion |
| 4 | Early adopter badge | "50% rabais" vs "Offre fondateur" | checkout_completed | Framing psychologique |

**Règles :** Une seule expérience à la fois pendant 2-3 semaines. Ne pas tester les prix (confiance client) — seulement wording, layout, positionnement.

---

## 16.6. EMAIL DELIVERABILITY

### Le problème actuel
buildfi.ca est un domaine neuf = réputation zéro. Les 50 premiers emails seront scrutés par Gmail/Outlook/Yahoo. Le domaine Resend est en statut FAILED. Emails arrivent en spam.

### Couche 1 — DNS (bloquant actuel)
- SPF : `v=spf1 include:amazonses.com ~all` ✅
- DKIM : record TXT `resend._domainkey` ⚠️ Clé possiblement obsolète dans Cloudflare
  - Fix : Resend dashboard → copier NOUVELLE clé DKIM → Cloudflare → éditer record → coller → sauver → Resend → Reverify → attendre 5 min propagation
- DMARC : `v=DMARC1; p=none;` ✅ → passer à `p=quarantine` puis `p=reject` progressivement

### Couche 2 — Contenu email
- Ratio texte/image : 60%+ texte (template actuel = bon, table-based text-heavy)
- Pas de mots spam : "gratuit", "urgent", "offre limitée", "félicitations" → aucun dans nos templates
- Lien de désinscription en footer (ajouter si pas présent)
- From : `rapport@buildfi.ca` → toujours la même, pas de variation
- Reply-to : configurer `support@buildfi.ca`

### Couche 3 — Warming du domaine
- Avant lancement public : 10-20 emails de test via Stripe test purchases
- Envoyer à des vrais comptes : Gmail, Outlook, Yahoo, iCloud
- Ouvrir les emails, cliquer les liens, répondre → construit la réputation
- Ne PAS envoyer en bulk. Chaque email = transactionnel (1 achat = 1 email) → naturellement bon

### Couche 4 — Monitoring post-lancement
- Resend dashboard : taux de bounce et plaintes spam
- Seuils d'alerte : bounce > 2% ou complaints > 0.1% → investigation immédiate
- Optionnel : webhook Resend pour logger bounces dans KV

### Checklist pré-lancement
1. [ ] Copier NOUVELLE clé DKIM depuis Resend
2. [ ] Éditer record TXT resend._domainkey dans Cloudflare
3. [ ] Resend Reverify → statut "Verified"
4. [ ] Configurer reply-to support@buildfi.ca
5. [ ] Ajouter lien désinscription en footer si absent
6. [ ] Envoyer 10-20 emails test (Gmail, Outlook, Yahoo)
7. [ ] Vérifier inbox (pas spam) sur chaque provider
8. [ ] Post-lancement : monitorer bounces/complaints dans Resend dashboard

---

## 17. COMPÉTITION

| Compétiteur | Prix | Notre avantage |
|---|---|---|
| Optiml.ca | $99-492/an | MC 5,000 vs 50, bilingue, $129 one-time, Bilan Annuel |
| ffPro.ca | $135/an | Pan-canadien, MC, UX accessible, $129 one-time |
| ProjectionLab | $120/an | Canada-spécifique, bilingue |
| Wealthsimple | Gratuit | Profondeur (190 vs ~20 params) |
| Planificateur | $1,500-3,000 | 10-20x moins cher, illimité |

---

## 18. MIGRATION planner_v2.html

### Anatomie (15,560 lignes)
```
Lignes       Contenu                              ~Lignes  Destination
─────────────────────────────────────────────────────────────────────────
1-211        HTML + CSS                            211      layout.tsx + globals.css
212-228      Script imports                        17       package.json
229-862      Tokens, charts, theme, utils          634      lib/ + components/charts/
863-1166     Styles + utilities                    304      lib/styles.ts
1167-1403    Engine: tax + benefits + constants     237      lib/engine/*.ts
── TESTS (1,920 lignes — HORS PROD CLIENT) ────────────────────────────
1404-3327    Test suite                            1920     __tests__/ (Vitest, CI)
── FIN TESTS ──────────────────────────────────────────────────────────
3328-3744    optimizeDecum                          417      lib/engine/optimize.ts
3745-3899    Stochastic + CPM + stochDeath          155      lib/engine/stochastic.ts
3900-3925    calcPayroll                            26       lib/engine/payroll.ts
3926-5497    runMC                                  1572     lib/engine/mc.ts
5498-5565    Format + UI primitives                 68       lib/format.ts + ui/
5566-7174    App() state, sidebar                   1609     components/Simulator.tsx
7175-7295    AI serialize + generate                121      api/ai/
7296-7976    Tabs + Wizard                          681      components/tabs/ + Wizard
7977-14900   30+ tabs                               6924     components/tabs/
14901-15555  Remaining + ReactDOM                   655      components/ + entry
```

### Hors prod client : tests (1,920), moteur MC (~4,330), AI gen (121)
### Côté client : tokens, charts, UI, app shell, tabs, wizard, déterministe léger

### Phases
**M1** Engine → fichiers séparés + routes API. **M2** Tests → Vitest + CI. **M3** UI → React. **M4** Plumbing.
Modes essentiel/standard/expert = vestige → UN mode complet + progressive disclosure.

---

## 19. TIMELINE — Tout avant lancement (Claude Code, 1-2 semaines)

### Jour 1-2 : Infrastructure
- [ ] Stripe : Ess $29 + Inter $59 + Expert $129 + renouvellement $29 + addon $14.99 + coupon 2e rapport + coupons referral
- [ ] Auth magic link + Vercel KV (schema complet §12)
- [ ] Rate limiting middleware
- [ ] `/api/health` health check

### Jour 3-4 : Moteur + API
- [ ] Engine constants → fichiers JSON séparés (§14 architecture)
- [ ] Routes `/api/simulate` + `/api/optimize`
- [ ] Tests de cohérence constantes (§14 couche 3)
- [ ] `npm run qa:full` script

### Jour 5-6 : Quiz + Simulateur
- [ ] Quiz Expert (Inter + bloc H + ~20 champs + mode guided)
- [ ] Simulateur habillé (planner + auth + API + header/footer buildfi)
- [ ] Progressive disclosure logic
- [ ] Driver attribution KPIs

### Jour 7-8 : Workflows + Exports
- [ ] 3 workflows "Tester / Optimiser / Bilan"
- [ ] Pipeline exports AI (5 inclus + $14.99 additionnel)
- [ ] Résumé 1 page illimité
- [ ] Historique hypothèses (changelog)

### Jour 9-10 : Pages + Conformité
- [ ] Page Expert (landing §13 + portail abonné)
- [ ] Upgrade path (crédit, données pré-remplies)
- [ ] Lint AMF 3 couches (§10)
- [ ] CGU + `/confidentialite` + `/support`

### Jour 11-12 : Emails + Monitoring
- [ ] Cron anniversaire plan 6 mois (§8.2)
- [ ] Emails renouvellement (J-30, J-7, J-0, J+3, J+30)
- [ ] Email 2e rapport 50% off (post-livraison)
- [ ] Lien referral + tracking KV
- [ ] Monitoring + dashboard admin
- [ ] Route admin simple (logs, erreurs, rapports générés)

### Jour 13-14 : Audit + Polish
- [ ] QA complet (`npm run qa:full`)
- [ ] Versioning rapports (metadata, pied de page)
- [ ] Export/suppression données client
- [ ] Release notes page `/mises-a-jour`
- [ ] Test e2e complet : achat → quiz → simulateur → export → email
- [ ] Test upgrade path : Ess→Expert, Inter→Expert
- [ ] Revue AMF finale

### Post-lancement (semaine 3+)
- [ ] Bilan Annuel complet (§7) — 1-2 semaines
- [ ] Articles SEO (§16) — continu
- [ ] Migration React complète (§18) — 6-8 semaines

---

## 20. RISQUES

| Risque | Mitigation |
|--------|-----------|
| IP exposée (MVP) | Code minifié. Vrai fix = engine server-side. |
| UX 190 params | Progressive disclosure + workflows + quiz + guided |
| AMF | Pipeline 3 couches §10. Opinion formelle avant scale. |
| Churn | Bilan Annuel hors quota + rappel 6 mois + comparaison temporelle + referral |
| Latence | Deux couches : déterministe + MC async |
| Migration 15K | Phased, 436 tests filet de sécurité |
| Abus planificateurs | CGU + rate limit + détection §11 |
| Constantes périmées | Pipeline 5 couches §14 + audit trail |
| Support volume | Glossaire contextuel + FAQ + articles SEO |
| Bug post-génération | Regénération + notification §15.8 |

---

## 21. POUR CLAUDE CODE — Résumé

### Il doit savoir
1. Pricing : Ess $29, Inter $59, Expert $129, renouvellement $29/an, export additionnel $14.99
2. 5 exports AI (année 1), 3 (renouvellement). Résumé 1 page illimité. Bilan Annuel HORS quota.
3. 2e rapport à 50% (coupon Stripe 90 jours). Programme referral (50% off référent / 15% off référé).
4. MC TOUJOURS server-side
5. Simulateur interactif : déterministe instant + MC async
6. Compte via magic link persistant + Vercel KV
7. Progressive disclosure par quiz data + mode guided par segment
8. 3 workflows AU-DESSUS des onglets
9. Quiz Expert = Inter + bloc H + ~20 champs
10. Modes essentiel/standard/expert = vestige → simplifier
11. Test suite 1,920 lignes HORS du fichier client
12. Driver attribution sur chaque KPI
13. Historique hypothèses (changelog par profil)
14. Lint AMF 3 couches (build + runtime + design)
15. Anti-abus : rate limit + CGU usage personnel + détection patterns
16. PAS d'alertes marché (pas l'ADN). Veille réglementaire = articles SEO + bannière in-app + changelog. Rappel anniversaire 6 mois.
17. Constantes fiscales : ~173 valeurs, pipeline 5 couches pro, fichiers JSON versionnés par année
18. Rapport Expert = adaptatif par profil (§22) : 9 sections base + jusqu'à 10 conditionnelles + 5 exclusives Expert. Entre 12 et 25 sections.
19. Rapport Expert ≠ Bilan Annuel : rapport = portrait instant T, bilan = check-up annuel comparatif
20. Versioning rapports : ID + version moteur + constantes + metadata dans blob
21. Professionnalisation : health check, QA checklist, monitoring, emails renouvellement, LPRPDE/Loi 25, changelog public
22. Serializer adaptatif : `_serializeForAI(tier, results, profile)` avec objet `sections` conditionnel

### Il doit construire (Phase 2 — Lancement Expert)
1. Stripe : Ess $29 + Inter $59 + Expert $129 + renouvellement $29 + export additionnel $14.99
2. Stripe : coupon 2e rapport 50% + coupons referral (15% off)
3. Auth magic link + Vercel KV (changelog, accountType, exports restants, referralCode)
4. Page Expert complète (vente §13 + portail §14)
5. Quiz Expert (bloc H, mode guided par segment)
6. Route /api/simulate + /api/optimize
7. Simulateur habillé (auth, progressive disclosure, mode guided)
8. 3 workflows (Tester / Optimiser / placeholder Bilan)
9. Pipeline rapport Expert adaptatif (§22 : serializer conditionnel + prompt modulaire + renderer extensible + lint AMF post-gen)
10. Résumé 1 page illimité
11. Upgrade path (crédit Ess/Inter → Expert, données pré-remplies)
12. CGU + rate limiting + détection abus
13. Lint AMF pipeline 3 couches en CI/CD
14. Health check /api/health + monitoring basique
15. QA checklist automatisée (npm run qa:full)
16. Page confidentialité + CGU (LPRPDE + Loi 25)
17. Versioning rapports (metadata dans blob)
18. Audit complet avant lancement

### Il doit construire (Phase 3 — Rétention + Bilan Annuel)
1. Bilan Annuel complet (§7 : input 7 champs, processing, output 9 pages)
2. Crons : anniversaire 6 mois + renouvellement J-30/J-7/J-0/J+3/J+30 + veille réglementaire (interne, pas push)
3. Renouvellement Stripe $29/an + reset crédits
4. Pipeline constantes fiscales (§14 : 5 couches pro, veille → extraction → validation → deploy → audit)
5. Comparaison temporelle multi-année
6. Historique hypothèses + driver attribution dans l'UI
7. Export données client JSON + bouton suppression
8. Page changelog public /mises-a-jour
9. Bannière in-app pour changements réglementaires
10. Articles SEO (§16 : 10 FR + 10 EN, voix BuildFi)

### Il doit construire (Phase 4 — Migration React)
1. Migration complète planner_v2.html (§18 : M1→M4, 6-8 semaines)
2. Dashboard admin (alertes, constantes, monitoring, abus)
3. Notification régénération si constantes changées
4. Correction rapports rétroactive avec notification client

### Il ne doit PAS faire
- B2B / licence pro (Phase 5)
- Réécrire le moteur MC
- Scorecard partageable (Phase 3-4)
- Device fingerprint (Phase 5 si nécessaire)
- Mini-chatbot support (Phase 4+)

---

*Fin v3. 22 sections. Prêt pour Claude Code.*

---

## 22. RAPPORT EXPERT — Définition complète

### Principe
Le rapport Expert n'est pas "le rapport Inter réchauffé." C'est un rapport **adaptatif** : base Inter (16 sections) + sections conditionnelles selon le profil + sections exclusives Expert. Entre 12 et 25 sections selon la situation du client.

La logique de sélection des sections est la même que la progressive disclosure du simulateur (§5) — les données quiz qui activent les onglets activent aussi les sections du rapport.

### Sections de base (toujours présentes)

| # | Section | Contenu |
|---|---------|---------|
| 1 | Sommaire exécutif | Note A+ à F, 3-5 constats clés, phrase AI résumé |
| 2 | Hypothèses et méthodologie | Paramètres MC, allocation, rendement, inflation, mortalité, décaissement. Compréhensible grade 10. |
| 3 | Diagnostic de robustesse | Distribution MC (histogramme), taux de succès, bande P10-P90, âge de ruine médian |
| 4 | Revenus de retraite | RRQ/PSV/pension/retraits par source, Sankey, cash-flow mensuel estimé |
| 5 | Projection du patrimoine | Fan chart P5-P50-P95, tableau année par année, patrimoine net au décès |
| 6 | Analyse fiscale | Taux marginal actuel vs retraite, paliers, impôt viager estimé, alpha fiscal |
| 7 | Priorités d'action | Waterfall des leviers par impact (AMF-safe : "Le modèle a exploré...") |
| 8 | Observations détaillées | Chaque observation avec "Ce que cela signifie" en langage clair |
| 9 | Disclaimers | Complet, début ET fin. AMF-safe. |

### Sections conditionnelles (activées par le profil)

| Condition | Section ajoutée | Contenu |
|---|---|---|
| couple = oui | Analyse couple | Fractionnement revenus, décalage retraite optimal exploré, scénario survie (décès premier conjoint), revenus combinés vs séparés |
| propriétaire = oui | Immobilier | Équité actuelle, scénario vente exploré (timing + impact fiscal + delta succès), cashflow locatif si applicable, Smith manoeuvre si applicable |
| pensionDB = oui | Pension DB | Rente vs valeur de rachat exploré, impact sur RRQ/PSV, scénario indexation vs non-indexation, transfert CRI/FERR |
| CCPC = oui | Corporatif | Dashboard corporatif, mix sal/div optimal exploré, calendrier d'extraction BNR, grind DPE vs seuil $50K, LCGE si vente, CDA |
| CCPC = oui | Rémunération | Comparaison 3-5 scénarios de mix sal/div avec impôt intégré, impact sur RRQ, impact sur REER room |
| dettes > seuil | Dettes | Stratégie de remboursement explorée, amortissement, impact sur cash-flow retraite, priorité (taux élevé vs solde) |
| décaissement avancé activé | Décaissement optimal | Séquencement exploré (meltdown REER, timing FERR, ordre CELI→NR→REER vs dynamique), Guyton-Klinger si activé |
| note ≤ C | Stress tests | Crash année 1 de retraite, inflation persistante 4%+ sur 10 ans, longévité P90 (vivre jusqu'à 97), combinaison pire cas |
| assurance-vie renseignée | Assurance | Impact du capital-décès sur le survivant, comparaison avec/sans assurance |
| RESP / enfants | RESP | Projection RESP, subventions SCEE, impact sur épargne-retraite parent |

### Sections exclusives Expert (jamais dans Inter)

| Section | Contenu |
|---|---|
| Comparaison de scénarios | Si le client a testé des décisions dans le simulateur : 2-3 scénarios côte à côte avec deltas (taux succès, impôt viager, patrimoine) et graphiques comparatifs |
| Driver attribution | Pour chaque KPI majeur : phrase expliquant POURQUOI (ex: "72% — limité par un taux de retrait de 5.8%") |
| Pour votre professionnel | Hypothèses techniques résumées, paramètres MC, constantes fiscales utilisées, version du moteur, lien read-only vers le simulateur |
| Questions pour votre fiscaliste | 5-7 questions personnalisées avec contexte chiffré, espace "réponse" si imprimé |
| Historique des modifications | Si changelog disponible (§9) : résumé des ajustements clés depuis le premier profil, évolution du taux de succès |

### Taille estimée par profil type

| Profil | Sections base | Sections conditionnelles | Sections Expert | Total |
|---|---|---|---|---|
| Célibataire FIRE, pas de propriété | 9 | 1 (stress tests si score bas) | 3-4 | 13-14 |
| Couple propriétaire, pas de pension | 9 | 3 (couple, immo, décaissement) | 3-4 | 15-16 |
| Pré-retraité DB, propriétaire | 9 | 4 (immo, DB, décaissement, stress) | 3-4 | 16-17 |
| Couple CCPC, propriétaire, DB | 9 | 6 (couple, immo, DB, CCPC, rémunération, décaissement) | 4-5 | 19-24 |

### Architecture technique du rapport

**Serializer adaptatif :**
`_serializeForAI(tier, results, profile)` inclut un objet `sections` :
```
sections: {
  base: true,                    // toujours
  couple: profile.hasCouple,
  property: profile.hasProperty,
  pensionDB: profile.hasPensionDB,
  ccpc: profile.hasCCPC,
  ccpcComp: profile.hasCCPC,
  debt: profile.totalDebt > 25000,
  decumulation: profile.sophistication !== "rapide",
  stressTests: results.grade <= "C",
  insurance: profile.hasInsurance,
  resp: profile.hasRESP,
  scenarioComparison: profile.savedScenarios?.length >= 2,
  changelog: profile.changelog?.length > 0
}
```

**Prompt system modulaire :**
Le prompt AI reçoit la liste des sections activées et génère SEULEMENT celles-ci. Chaque section a son propre sous-prompt avec les données pertinentes. Pas de génération monolithique — génération section par section pour contrôle de qualité.

**Renderer :**
Même pipeline que Inter (HTML → Blob → email). Le template est extensible : sections optionnelles insérées entre les sections fixes selon le flag. Table des matières dynamique.

**Lint AMF post-génération :**
Chaque section générée passe par la couche 2 du lint (§10) avant assemblage. Si une section a >3 violations, fallback statique pour cette section uniquement (pas tout le rapport).

### Différence rapport Expert vs Bilan Annuel

| | Rapport Expert (export AI) | Bilan Annuel (§7) |
|---|---|---|
| Quand | N'importe quand, sur demande | Janvier uniquement |
| Coût | 1 crédit export (ou $14.99) | Hors quota, gratuit |
| Focus | Portrait complet à un instant T | Comparaison vs l'an dernier + scénarios fiscaux de l'année |
| Sections uniques | Comparaison de scénarios, driver attribution | "Chemin parcouru", 6 catégories fiscales, questions fiscaliste |
| Usage type | "Voici mon plan" / "Pour mon comptable" | "Check-up annuel" / "Qu'est-ce qui a changé?" |

---

## 23. ANGLES MORTS ET DÉCISIONS RESTANTES

Ces points doivent être résolus avant ou pendant le développement. Claude Code doit les traiter comme des flags — ne pas deviner, demander au propriétaire.

### 23.1 Translator Expert — Non défini

Le translator Intermédiaire convertit 80 champs quiz → 190 params moteur. Le translator Expert doit gérer :
- Les mêmes 80 champs de base
- ~20-30 champs additionnels (allocation détaillée, MER par compte, croissance salariale, événements futurs, assurance, RESP, revenus locatifs)
- Le bloc H (préférences simulateur) qui configure les toggles stochastiques (stochMort, fatT, Guyton-Klinger, etc.)
- Le mode guided par segment (quels onglets activer, quels defaults appliquer)

C'est un composant distinct du translator Inter — pas une extension triviale. Il doit mapper les champs quiz aux params moteur ET configurer la progressive disclosure ET pré-remplir les smart defaults selon le niveau de sophistication choisi.

**Décision requise :** Le translator Expert est-il un fichier séparé ou une extension du translator Inter avec un switch `tier`? Recommandation : extension avec switch, pour éviter la duplication des 80 champs communs.

### 23.2 Résumé 1 page — Non spécifié

On dit "illimité, gratuit" mais pas ce que c'est.

**Proposition :**
- Contenu : note (A+ à F), taux de succès, patrimoine net projeté, fan chart mini, 3 constats clés (les mêmes que dans le diagnostic), date de génération
- Format : HTML léger, ~1 page imprimable, pas de narration AI
- Génération : **côté client** — c'est juste du rendering des données MC déjà en mémoire. Zéro appel serveur supplémentaire, zéro coût. Le client clique "Résumé", ça ouvre un print-friendly overlay ou génère un PNG/PDF côté client.
- Pas de blob storage — c'est éphémère, pas archivé côté serveur. Le client peut le sauvegarder localement (print/PDF du navigateur).
- Watermark BuildFi discret en bas

**Décision requise :** PNG client-side vs HTML print-friendly? PNG est plus partageable (social), HTML est plus lisible.

### 23.3 Workflow "Tester une décision" — Spec technique manquante

**Proposition :**
- Le client choisit une décision dans une liste contextualisée par segment (§6)
- Chaque "décision" = un paramètre à varier + 2-3 valeurs à comparer
  - Ex: "RRQ à 60/65/70" → 3 runs MC avec qppStart = 60, 65, 70
  - Ex: "Retraite 58 vs 62" → 2 runs MC avec retAge = 58, 62
  - Ex: "Meltdown oui/non" → 2 runs MC avec meltdown = true, false
- Chaque run = MC 5,000 sims server-side (3 runs × 2.3s = ~7s total, parallélisables à ~3s)
- Output : table comparative (taux succès, impôt viager, patrimoine médian au décès) + graphique overlay des fan charts + phrase "Le report du RRQ de 65 à 70 augmenterait le taux de succès estimé de X points, avec un break-even à ~Y ans."
- Le client peut aussi définir une décision custom (choisir un paramètre + 2 valeurs) — power user feature

**Décision requise :** Max combien de variantes par décision? 2 (A vs B) ou 3 (A vs B vs C)? Recommandation : 3 max, ça couvre 90% des cas (ex: RRQ 60/65/70).

### 23.4 Optimiseur 8 axes — Référence manquante

Le planner a un optimiseur (lignes ~13827, `launchOptimizer()`). Il faut documenter :
- **Les 8 axes :** âge de retraite, âge RRQ/CPP, âge PSV, ordre de retrait (meltdown oui/non), allocation (glide path), dépenses en retraite, épargne additionnelle, timing vente immobilière
- **Méthode :** Pour chaque axe, le moteur teste 3-5 valeurs autour de la valeur actuelle, run MC 1,000 sims chacun (pas 5,000 — c'est un screening, pas un rapport), identifie les 3 axes avec le plus grand delta de taux de succès
- **Coût :** 8 axes × 4 valeurs × 1,000 sims = 32,000 sims. À ~0.5s pour 1,000 sims = ~16s total séquentiel, parallélisable
- **Output :** "Top 3 leviers" avec fourchette de gain + lien vers l'onglet concerné pour exploration manuelle

**Décision requise :** Le code de l'optimiseur existe-t-il déjà dans le planner ou faut-il le créer? Vérifier `launchOptimizer()` ligne 13827. Si incomplet, c'est un dev significatif.

### 23.5 Read-only snapshot — Non défini

La section "Pour votre professionnel" dans le rapport Expert et le Bilan Annuel inclut un "lien read-only vers le simulateur."

**Options :**
- **A) Blob HTML statique** : Au moment de la génération du rapport, on sauvegarde un snapshot HTML du simulateur avec les données figées. Le pro voit les graphiques, les onglets, tout — mais ne peut rien modifier. Simple à implémenter (render to HTML + save blob), mais lourd (un blob de ~2MB par snapshot).
- **B) Token read-only** : URL spéciale `buildfi.ca/simulateur?token=abc123&readonly=true` qui charge le profil mais désactive tous les sliders/inputs. Le pro voit les données live. Plus léger, mais complexe côté auth (token read-only vs read-write).
- **C) Pas de snapshot interactif** : Juste le rapport PDF/HTML suffit. Le pro n'a pas besoin du simulateur, il a besoin des chiffres. Simplest.

**Recommandation :** Option C pour le MVP. Les hypothèses techniques sont déjà dans la section "Pour votre professionnel" du rapport. Le snapshot interactif = Phase 4+.

### 23.6 Parcours achat export additionnel

Le client a utilisé ses 5 exports. Il veut un 6e.

**Proposition :**
1. Le client clique "Générer un export AI" dans le simulateur ou le portail
2. Le système détecte : 0 exports restants
3. Modal : "Vous avez utilisé vos 5 exports inclus. Générer un export additionnel pour 14,99 $?"
4. Bouton "Acheter et générer" → Stripe Checkout session ($14.99, one-time)
5. Webhook Stripe confirme paiement → export généré automatiquement → email + portail
6. Pas de "pack de crédits" — un achat = un export. Simple.

Alternative : le client peut pré-acheter des exports depuis le portail sans générer immédiatement. Mais ça ajoute de la complexité (compteur de crédits achetés vs inclus). Recommandation : un achat = un export immédiat.

### 23.7 Couple = un compte ou deux?

**Décision :** UN compte pour le couple. Raisons :
- Le moteur simule le couple comme une seule unité (Personne 1 + Personne 2)
- 40% du marché = couples (segment A). $278 pour deux comptes séparés les ferait fuir.
- Les profils sauvegardés contiennent déjà les données des deux conjoints
- Un seul set de 5 exports, un seul Bilan Annuel — le rapport couvre les deux
- Le token/email peut être celui de l'un ou l'autre — c'est un foyer, pas un individu

**Implication CGU :** "La licence Expert couvre un foyer fiscal (vous et votre conjoint·e le cas échéant)."

**Edge case :** Séparation/divorce. Les profils contiennent les données des deux. Le client peut supprimer les données du conjoint et créer un nouveau profil individuel. Pas de mécanique spéciale — c'est juste une modification de profil.

### 23.8 Mobile

Le planner a du responsive (media queries 768px, 1100px). Mais le simulateur Expert avec sidebar + onglets + graphiques + sliders sur un iPhone 13 (390px) = expérience dégradée.

**Décision :** Le quiz et les rapports fonctionnent bien sur mobile. Le simulateur est "desktop-first."

**Implémentation :**
- Quiz : full mobile responsive (c'est un formulaire, ça marche)
- Rapports : full mobile responsive (HTML responsive, déjà le cas)
- Portail : full mobile responsive (dashboard, crédits, historique)
- Simulateur : bannière discrète sur mobile "Pour la meilleure expérience, utilisez un ordinateur ou une tablette." Le simulateur est utilisable sur tablette (768px+) mais pas optimisé pour phone (<768px).
- Les 3 workflows et le diagnostic fonctionnent sur mobile. Les 30 onglets détaillés = desktop.

Phase 4 (migration React) = opportunité d'améliorer le responsive.

### 23.9 Email de livraison rapport Expert

**Décision :** Oui, le client reçoit un email comme pour Ess/Inter.

**Flux :**
1. Client génère un export depuis le simulateur
2. Rapport assemblé → stocké dans Blob → URL permanente
3. Rapport ajouté au portail (historique `reportsGenerated[]`)
4. Email envoyé via Resend : "Votre rapport Expert est prêt" + lien Blob + résumé 3 lignes (note, taux succès, #sections)
5. Le lien Blob est le même que dans le portail — une seule source de vérité

### 23.10 TPS/TVQ

**Décision :** Prix affichés HT (standard nord-américain). Taxes ajoutées au checkout Stripe.

**Implémentation :**
- Stripe Tax ou calcul manuel : TPS 5% + TVQ 9.975% pour QC, HST pour ON/maritimes, GST pour AB/BC/SK/MB
- La page Expert affiche "129 $ + taxes applicables" ou juste "129 $" avec mention en petit "Taxes en sus"
- La facture Resend détaille les taxes (TPS #, TVQ # — il faut un numéro de TPS si revenu >$30K sur 4 trimestres consécutifs)

**Décision requise :** Es-tu inscrit à la TPS/TVQ? Si oui, les numéros doivent figurer sur les factures. Si non (revenu <$30K), pas de taxe à percevoir pour l'instant, mais il faut s'inscrire dès que le seuil est atteint.

### 23.11 Politique de remboursement

**Proposition :**
- Remboursement complet dans les 14 jours si aucun export AI généré
- Remboursement partiel ($69 — valeur du simulateur, moins le coût des exports utilisés) dans les 14 jours si exports générés
- Pas de remboursement après 14 jours
- Les exports additionnels ($14.99) ne sont pas remboursables (livraison instantanée)
- Le renouvellement ($29) est remboursable dans les 7 jours si le Bilan Annuel n'a pas été généré

**CGU :** "Droit de rétractation de 14 jours. Si aucun export n'a été généré, remboursement intégral. Si des exports ont été générés, un montant de 14,99 $ par export utilisé sera retenu."

**Décision requise :** Confirmer la politique avant d'écrire les CGU.

### 23.12 Bilan Annuel pas encore prêt — Communication

Le Bilan Annuel est Phase 3. Le client Expert qui achète en 2026 voit le bouton "Faire mon Bilan Annuel" dans le simulateur.

**Proposition :**
- Le bouton est visible mais affiche un badge "Bientôt" ou "Janvier 2027"
- Au clic : modal "Le Bilan Annuel sera disponible à partir de janvier 2027. Vous recevrez un email quand il sera prêt. En attendant, vous pouvez utiliser le workflow 'Optimiser automatiquement' pour identifier vos leviers principaux."
- La page Expert et le portail mentionnent "Bilan Annuel inclus (disponible janvier 2027)"
- Si Phase 3 n'est pas prête en janvier 2027 : email aux clients "Le Bilan Annuel arrive en [mois]. En attendant, voici un résumé de votre situation actuelle [auto-généré]."
- Le renouvellement ne devrait PAS être facturé avant que le Bilan Annuel soit opérationnel. Alternative : le premier renouvellement est gratuit / à prix réduit tant que le Bilan n'est pas live.

**Décision requise :** Est-ce qu'on communique une date ferme pour le Bilan ou juste "bientôt"? Recommandation : "janvier 2027" comme objectif, avec clause de grâce si retard.

### 23.13 Langue du rapport Expert

Le planner est bilingue (FR/EN toggle). Le rapport doit être généré dans la langue choisie par le client.

**Implication :** Le prompt AI doit inclure la langue cible. Les templates de fallback statiques doivent exister en FR ET EN. Le lint AMF (§10) doit scanner les deux listes de mots interdits (FR et EN). Les sections fixes (disclaimers, méthodologie) doivent être maintenues en deux langues.

Le quiz stocke `lang: "fr" | "en"` dans le profil. Le rapport utilise cette valeur.

### 23.14 Que se passe-t-il si Anthropic API est down?

Le client clique "Générer un export AI" et l'API Anthropic est indisponible.

**Proposition :**
- Retry automatique 3 fois avec backoff (1s, 3s, 10s)
- Si toujours down : fallback vers rapport sans narration AI (texte statique intelligent) — le client reçoit un rapport complet mais sans la personnalisation AI
- Le crédit export N'EST PAS consommé dans ce cas
- Notification : "La narration personnalisée est temporairement indisponible. Votre rapport a été généré avec des observations standards. Vous pouvez le regénérer gratuitement quand le service sera rétabli."
- Le rapport est marqué `aiStatus: "fallback"` dans les metadata. Le client peut cliquer "Regénérer avec narration AI" plus tard sans consommer un crédit supplémentaire.

### 23.15 Performance du rapport Expert (12-25 sections AI)

Le rapport Inter génère ~16 sections AI en un appel. Le rapport Expert pourrait avoir 25 sections. Avec génération section par section (§22, prompt modulaire) :
- 25 sections × ~2s par appel API = ~50s séquentiel. Trop lent.
- En parallèle (5 appels simultanés) : ~10s. Acceptable mais nécessite gestion des rate limits Anthropic.
- Alternative : grouper les sections par batch (base = 1 appel, conditionnelles = 1 appel, exclusives = 1 appel) = 3 appels parallèles = ~6s.

**Décision requise :** Génération section par section (contrôle qualité max, lent) vs par batch (plus rapide, moins de contrôle)? Recommandation : par batch de 3-4 sections logiquement groupées. Le lint AMF post-génération rattrape les problèmes de qualité.

### 23.16 Le rapport Intermédiaire dans le contexte Expert

Le client qui a acheté Expert peut-il générer un rapport de tier Intermédiaire (16 sections, pas les exclusives Expert)? Ou chaque export est toujours un rapport Expert complet?

**Recommandation :** Toujours Expert. Le client paie pour le tier le plus élevé. Simplifier : un export = un rapport Expert adaptatif. Pas de sélecteur de tier dans le simulateur Expert. Si le client veut moins de sections, il les obtient naturellement (un célibataire sans CCPC ni propriété = ~13 sections, qui est comparable à un Inter).

---

*Fin v3 révisée. 23 sections. Document prêt pour review finale puis Claude Code.*
