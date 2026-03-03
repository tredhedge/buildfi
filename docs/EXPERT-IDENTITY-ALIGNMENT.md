# EXPERT-IDENTITY-ALIGNMENT.md
> Vérification de cohérence entre l'identité BuildFi et le tier Expert.
> Ce document est une grille de conformité — chaque composant Expert est évalué
> contre la marque établie (STRATEGY.md §6-7) et les standards AMF.
> Claude Code consulte ce document AVANT de construire chaque composant visible.
> Date: 2026-03-02

---

## 1. L'ADN BUILDFI — Rappel non-négociable

### 1.1 Ce que BuildFi EST

BuildFi est un **bilan de retraite personnalisé** qui explique vos résultats en langage clair. Pas un calculateur. Pas un outil. Pas un robot-conseiller. Pas un planificateur financier automatisé.

BuildFi est l'ami compétent qui s'assoit avec vous, regarde vos chiffres, et dit : "Voici ce que les données montrent. Voici ce que ça signifie pour toi. Voici les questions à poser à ton comptable."

Le tier Expert étend cette promesse : "Et si tu veux explorer toi-même, voici le laboratoire. Les mêmes données, les mêmes scénarios, mais c'est toi qui conduis."

### 1.2 Positionnement (STRATEGY.md §1)

**FR :** "Pour les Canadiens qui se demandent s'ils sont prêts pour la retraite, buildfi.ca est le premier bilan retraite personnalisé qui explique vos résultats en langage clair — pas en jargon financier."

**EN :** "For Canadians wondering if they're ready for retirement, buildfi.ca is the first personalized retirement assessment that explains your results in plain language — not financial jargon."

Le tier Expert ne change PAS ce positionnement. Il l'approfondit. Le client Expert veut explorer plus loin, mais il veut toujours comprendre ce qu'il voit. Si un onglet du simulateur contient du jargon inexpliqué, c'est un échec de marque.

### 1.3 Les cinq principes de la voix BuildFi

| # | Principe | Application Expert |
|---|----------|-------------------|
| 1 | **Clair** | Chaque donnée affichée dans le simulateur est accompagnée d'une explication en une phrase. Pas de KPI orphelin. |
| 2 | **Chaleureux** | Les messages d'erreur, les tooltips, les modals — tout est écrit comme si on parlait à quelqu'un qu'on respecte. Pas de jargon technique. Pas de froideur. |
| 3 | **Confiant** | BuildFi affirme la qualité de son moteur sans arrogance. "5 000 scénarios testés" — pas "le meilleur outil du marché." |
| 4 | **Anti-bullshit** | Zéro fausse urgence, zéro compteur de places, zéro "un planificateur coûterait $1,500" dans le produit. La valeur se démontre, elle ne se proclame. |
| 5 | **Grade 10 de lecture** | Un élève de secondaire 4 comprend chaque phrase. Si ça nécessite un diplôme en finance, c'est mal écrit. |

### 1.4 Ce que BuildFi n'est PAS

- Un robot-conseiller (on ne gère pas d'argent)
- Un planificateur financier (on ne donne pas de conseils)
- Un calculateur (on fait des bilans, des portraits, des explorations)
- Un outil gratuit monétisé par la pub (on vend un produit, pas des données)
- Un produit américain adapté au Canada (on est Canada-first, chaque province, chaque règle)

---

## 2. IDENTITÉ VISUELLE — Grille d'application Expert

### 2.1 Palette

| Couleur | Hex | Usage BuildFi | Usage Expert spécifique |
|---------|-----|---------------|------------------------|
| Marine | #1a2744 | Titres, navigation, header | Header simulateur, titres onglets, en-têtes rapport |
| Or | #b8860b | CTAs, accents premium | Boutons "Générer", "Explorer", grade ring A+/A, workflows |
| Crème | #faf8f4 | Fond principal | Fond simulateur, fond rapport, fond quiz |
| Sable | #e8e4db | Cartes, séparateurs | Cards KPI, cards profils, sections collapsibles |
| Forêt | #1a7a4c | Succès, positif | Badge "Scénario exploré", delta positif, taux de succès >80% |
| Brique | #b91c1c | Alerte, négatif | Note F/D, delta négatif, alertes, taux de succès <50% |

**Couleurs INTERDITES dans le produit Expert :**
- Bleu tech (#007bff, #0066cc) — trop "SaaS générique"
- Violet — pas dans la palette
- Dégradés flashy — pas dans le design system
- Noir pur (#000000) — utiliser Marine #1a2744

**Le planner actuel** utilise ses propres couleurs internes (variables CSS .fire-*). Quand le planner est wrappé dans le simulateur Expert, le wrapper (header, footer, sidebar, portail) utilise la palette BuildFi. Le contenu interne du planner garde son esthétique mais les éléments de branding (logo, navigation, boutons principaux) sont en palette BuildFi.

Phase 4 (migration React) = opportunité d'aligner complètement les couleurs internes.

### 2.2 Typographie

| Police | Usage | Contexte Expert |
|--------|-------|----------------|
| Newsreader | Display, titres, hero | H1-H2 landing Expert, titres de sections rapport, hero portail |
| DM Sans | Corps de texte, UI | Texte simulateur, quiz, portail, emails, articles SEO |
| JetBrains Mono | Données numériques | Montants ($), pourcentages, tableaux projection, KPIs |

**Hiérarchie dans les rapports Expert :**
- H1 (titre rapport) : Newsreader, 28px, Marine
- H2 (section) : Newsreader, 22px, Marine
- H3 (sous-section) : DM Sans, 16px, Marine bold
- Corps : DM Sans, 14px, #333
- Données : JetBrains Mono, 13px, Marine
- Légendes : DM Sans, 11px, #666
- Disclaimer : DM Sans, 10px, #888, italic

### 2.3 Logo

Le logo flame SVG (logo-light.svg, logo-dark.svg, logo.js) apparaît :
- Header du simulateur Expert (taille: 32px, dark sur crème)
- Pied de page des rapports (taille: 24px, avec "buildfi.ca")
- Emails de livraison (texte "BuildFi" pour l'instant, SVG quand supporté)
- Watermark du résumé 1 page (taille: 16px, opacité 0.3)
- Page Expert landing (taille: 40px, hero)

Le logo N'APPARAÎT PAS dans le contenu des onglets du simulateur (trop intrusif).

### 2.4 Iconographie

Pas d'emoji dans le produit. Pas d'icônes décoratives inutiles.

Icônes autorisées (style : outline, stroke 1.5px, Marine ou Or) :
- Navigation : chevron, menu, close, search
- Actions : download, print, share, refresh, undo
- Status : check (forêt), warning (or), error (brique)
- Sections : chart-line, shield, calculator, calendar, file-text

Source : Lucide Icons (déjà dans le stack React). Pas de Font Awesome, pas de Material Icons.

---

## 3. VOIX — Grille de conformité par composant

### 3.1 Vocabulaire canonique

| Concept | FR (utiliser) | FR (INTERDIT) | EN (utiliser) | EN (INTERDIT) |
|---------|---------------|---------------|---------------|---------------|
| Le produit | bilan, portrait, exploration | calculateur, outil, tool | assessment, exploration | calculator, tool |
| Le résultat | note (A+ à F) | score, rating | grade (A+ to F) | score, rating |
| La méthode | milliers de scénarios | Monte Carlo (sauf section méthodologie) | thousands of scenarios | Monte Carlo (except methodology) |
| L'impact | l'analyse indique, les données montrent | vous devriez, nous recommandons | the analysis indicates, the data shows | you should, we recommend |
| Les trouvailles | observations, constats | recommandations, conseils | observations, findings | recommendations, advice |
| Les actions | leviers identifiés, pistes à explorer | plan d'action, optimisez | identified levers, avenues to explore | action plan, optimize |
| L'espace de travail | simulateur, laboratoire | dashboard, outil, plateforme | simulator, lab | dashboard, tool, platform |
| L'export | export, bilan, portrait | rapport (sauf contexte formel) | export, assessment | report (except formal context) |
| Le portail | portail, espace personnel | dashboard, panneau de contrôle | portal, personal space | dashboard, control panel |
| Les scénarios | scénarios explorés | recommandations testées | explored scenarios | tested recommendations |

### 3.2 Registre AMF — Application par composant

**Quiz Expert :**
- Les questions sont neutres et factuelles ("Quel est votre revenu annuel?")
- Les options ne contiennent pas de jugement ("$50K-$75K" — pas "revenu modeste")
- Les tooltips expliquent pourquoi on pose la question ("Cette donnée permet de calibrer vos paliers d'imposition")

**Simulateur — Onglets :**
- Chaque onglet affiche des données, pas des conseils
- Les KPIs sont accompagnés de "Ce que cela signifie" en langage observationnel
- Les tooltips utilisent le conditionnel : "Ce montant représenterait..." / "This amount would represent..."

**Simulateur — 3 workflows :**
- "Tester une décision" : "Le modèle a exploré deux scénarios..." — jamais "Voici la meilleure option"
- "Optimiser automatiquement" : "L'analyse a identifié 3 leviers à fort impact estimé..." — jamais "Voici ce que vous devriez faire"
- "Bilan Annuel" : "Le bilan compare votre situation à l'an dernier..." — jamais "Voici comment vous avez progressé"

**Rapport Expert — Sections de base :**
- Sommaire exécutif : "Votre portrait indique une note [X]. Cela signifie que dans [Y]% des scénarios, vos épargnes seraient suffisantes."
- Observations : "Le modèle a exploré un scénario où [X]. L'impact estimé serait d'environ [Y]$."
- Priorités : "Les 3 leviers à plus fort impact estimé sont..." — avec badge "Estimation"

**Rapport Expert — Section "Pour votre professionnel" :**
- "Les hypothèses suivantes ont été utilisées dans cette analyse."
- "Un professionnel pourrait évaluer si [X] s'applique à votre situation."
- "L'impact estimé de [X] serait d'environ [Y]$. Votre fiscaliste peut confirmer le montant exact."

**Emails :**
- Sujet : "Votre bilan Expert est prêt" — pas "Votre rapport d'optimisation"
- Corps : "Voici votre portrait financier basé sur les données que vous avez fournies."
- CTA : "Consulter mon bilan" — pas "Voir mes recommandations"

**Landing page Expert :**
- Hero : affirmation de capacité ("Votre laboratoire financier personnel") — pas de promesse de résultat ("Optimisez votre retraite")
- Features : description de ce que le client PEUT faire — pas de ce que BuildFi VA faire pour lui
- Trust : "Moteur validé par 436 tests" — factuel, vérifiable, pas promotionnel

**Articles SEO :**
- Ton éducatif, pas directif
- Chaque article se termine par : "Testez votre propre scénario dans le simulateur Expert" — pas "Optimisez votre situation avec BuildFi"
- Jamais de promesse de résultat : "Le meltdown REER pourrait réduire votre impôt viager" — pas "Le meltdown REER va vous faire économiser $18,000"

### 3.3 Phrases-types approuvées (modèles pour l'AI et les templates)

**Observations (rapport + simulateur) :**
- FR : "Le modèle a exploré un scénario où [variable] est ajusté(e) à [valeur]. L'impact estimé serait d'environ [montant] sur [période]."
- EN : "The model explored a scenario where [variable] is adjusted to [value]. The estimated impact would be approximately [amount] over [period]."

**Driver attribution (KPIs) :**
- FR : "[Valeur]% — principalement attribuable à [facteur] ([explication en 1 phrase])."
- EN : "[Value]% — primarily attributable to [factor] ([1-sentence explanation])."

**Constats (sommaire exécutif) :**
- FR : "L'analyse identifie [N] leviers à explorer. Le plus significatif : [levier], avec un impact estimé de [valeur]."
- EN : "The analysis identifies [N] levers to explore. The most significant: [lever], with an estimated impact of [value]."

**Renvoi au professionnel :**
- FR : "Un professionnel peut évaluer si [stratégie] s'applique à votre situation. Le modèle estime un impact d'environ [montant]."
- EN : "A professional can assess whether [strategy] applies to your situation. The model estimates an impact of approximately [amount]."

**Messages d'erreur :**
- FR : "Le recalcul prend plus de temps que prévu. On réessaie dans quelques secondes."
- EN : "The recalculation is taking longer than expected. We'll try again in a few seconds."

**Modals :**
- FR : "Vous avez utilisé vos 5 exports inclus. Souhaitez-vous générer un export additionnel pour 14,99 $?"
- EN : "You've used your 5 included exports. Would you like to generate an additional export for $14.99?"

### 3.4 Registre émotionnel

BuildFi ne manipule pas les émotions. Le produit est conçu pour informer et outiller, pas pour angoisser ou rassurer faussement.

**Ce qu'on fait :**
- Présenter les données avec contexte ("72% signifie que dans 72 scénarios sur 100, vos épargnes seraient suffisantes")
- Normaliser l'incertitude ("Aucun modèle ne peut prédire l'avenir. C'est pourquoi on teste 5 000 scénarios.")
- Encourager la consultation professionnelle ("Ces observations sont un point de départ pour une conversation avec votre fiscaliste")

**Ce qu'on NE fait PAS :**
- Dramatiser un mauvais score ("ALERTE : Votre retraite est en danger!")
- Promettre un bon résultat ("Avec BuildFi, votre retraite est assurée!")
- Utiliser la peur comme levier ("Sans action immédiate, vous risquez de...")
- Créer de l'urgence artificielle ("Offre limitée!", "Il ne reste que X places!")
- Faire du price anchoring dans le produit ("Un planificateur coûterait $1,500")

**Ce qu'on fait avec un mauvais score :**
- Note D ou F : "Votre portrait actuel indique que des ajustements pourraient renforcer significativement votre situation. Le modèle a identifié [N] leviers à explorer."
- Pas de panique, pas de jugement. Des données, du contexte, des pistes.

---

## 4. GRILLE DE CONFORMITÉ PAR SURFACE

Pour chaque composant du tier Expert, cette grille vérifie l'alignement avec l'identité.

### 4.1 Quiz Expert

| Critère | Exigence | Vérifié |
|---------|----------|---------|
| Palette | Fond crème, boutons or, texte marine | ☐ |
| Typo | DM Sans corps, JetBrains Mono pour montants | ☐ |
| Logo | Flame en header, discret | ☐ |
| Ton | Questions neutres, factuelles, grade 10 | ☐ |
| Tooltips | "Pourquoi on demande ça" — conditionnel, pas directif | ☐ |
| Progress bar | Visuelle, encourageante, pas stressante | ☐ |
| Mobile | Responsive, touch targets 44px min | ☐ |
| AMF | 0 mot interdit, 0 promesse de résultat | ☐ |
| Emoji | Aucun | ☐ |
| Continuité | Même look que quiz Ess/Inter, étendu | ☐ |

### 4.2 Simulateur Expert

| Critère | Exigence | Vérifié |
|---------|----------|---------|
| Header | Marine + logo flame + nav (portail, aide, profil) | ☐ |
| Footer | "buildfi.ca · À titre informatif seulement" + liens légaux | ☐ |
| 3 workflows | Boutons proéminents, or sur marine, texte direct | ☐ |
| KPIs | Chaque KPI a "Ce que cela signifie" | ☐ |
| Driver attribution | Phrase explicative sous chaque KPI majeur | ☐ |
| Tooltips | Jargon → tooltip, conditionnel, grade 10 | ☐ |
| Badges | "Scénario exploré" (forêt), "Estimation" (or), "À valider" (gris) | ☐ |
| Smart defaults | Indicateur visuel (sable) sur champs pré-remplis | ☐ |
| Skeleton loader | Pendant recalcul MC, pas de spinner vide | ☐ |
| Error messages | Chaleureux, pas technique, actionnable | ☐ |
| Mobile bannière | "Meilleure expérience sur ordinateur" — pas bloquant | ☐ |
| AMF | 0 mot interdit dans l'UI statique | ☐ |
| Emoji | Aucun | ☐ |

### 4.3 Rapport Expert (export AI)

| Critère | Exigence | Vérifié |
|---------|----------|---------|
| En-tête | Logo flame + "BuildFi — Bilan Expert" + date + nom | ☐ |
| Pied de page | Metadata (moteur, constantes, sims) + disclaimer mini | ☐ |
| Typo rapport | Newsreader titres, DM Sans corps, JetBrains Mono données | ☐ |
| Grade ring | Palette BuildFi (or=A+/A, forêt=B+/B, or-foncé=C, brique=D/F) | ☐ |
| Fan chart | Couleurs cohérentes (marine P50, or P25/P75, sable P5/P95) | ☐ |
| Observations | Conditionnel, "Le modèle a exploré...", "Ce que cela signifie" | ☐ |
| Priorités | Waterfall avec badges "Estimation" | ☐ |
| Driver attribution | Phrase sous chaque KPI majeur | ☐ |
| Section pro | Hypothèses, paramètres MC, constantes, questions fiscaliste | ☐ |
| Disclaimer | Complet, début ET fin, FR/EN selon profil | ☐ |
| Sections conditionnelles | Activées par profil, pas de section vide | ☐ |
| AMF lint | Couche 2 post-génération, 0 violation | ☐ |
| Print | CSS @media print, lisible sur A4/Letter | ☐ |
| Mobile | HTML responsive, lisible sur phone | ☐ |

### 4.4 Bilan Annuel

| Critère | Exigence | Vérifié |
|---------|----------|---------|
| En-tête | Logo + "Bilan Annuel [Année]" + date | ☐ |
| Page 1 dashboard | Note avec delta, taux succès avec delta, graph évolution | ☐ |
| Page 2 temporel | Comparaison multi-année, driver attribution du delta | ☐ |
| Pages 3-6 scénarios | Chaque scénario : observation + impact $ + mécanisme + phrase AI | ☐ |
| Page 7 questions | "Questions à poser à votre fiscaliste" — pas "recommandations" | ☐ |
| Ton global | "Cette année, le modèle a exploré..." — jamais "Vous avez progressé" | ☐ |
| AMF | 0 mot interdit, conditionnel partout | ☐ |
| Continuité visuelle | Même design system que le rapport Expert standard | ☐ |

### 4.5 Portail Expert (/expert)

| Critère | Exigence | Vérifié |
|---------|----------|---------|
| Palette | Fond crème, cards sable, boutons or, texte marine | ☐ |
| Dashboard | "Bienvenue [prénom]", crédits restants, dernier bilan | ☐ |
| Historique | Liste rapports avec date, note, sections, lien | ☐ |
| Profils | 5 slots, renommer, supprimer, exporter | ☐ |
| Alertes | Market/réglementaire, ton factuel, pas anxiogène | ☐ |
| CTAs | "Ouvrir le simulateur", "Générer un export" — or sur marine | ☐ |
| Mobile | Responsive, tous les boutons accessibles | ☐ |
| Ton | "Votre espace personnel" — pas "Dashboard" ou "Panneau de contrôle" | ☐ |

### 4.6 Landing page Expert

| Critère | Exigence | Vérifié |
|---------|----------|---------|
| Hero | Newsreader headline, DM Sans subhead, screenshot simulateur | ☐ |
| Ton hero | Affirmation de capacité, pas promesse de résultat | ☐ |
| 3 blocs | Simulez/Optimisez/Recalculez — exemples chiffrés | ☐ |
| "Pas pour tout le monde" | Honnête sur qui devrait acheter Ess/Inter plutôt | ☐ |
| Pricing | Prix clair, pas de prix barré sauf early adopter légitime | ☐ |
| Trust signals | Factuels (436 tests, 13 provinces, CPM-2014) — pas promotionnels | ☐ |
| FAQ | Honnête ("Non, ça ne remplace pas un planificateur") | ☐ |
| Zero price anchoring | Aucune mention de "un planificateur coûterait $X" | ☐ |
| Zero fausse urgence | Pas de compteur, pas de "places limitées" | ☐ |
| AMF | 0 mot interdit | ☐ |
| Continuité | Même page que landing principale, pas un "autre site" | ☐ |

### 4.7 Emails

| Critère | Exigence | Vérifié |
|---------|----------|---------|
| Template | Table-based (compatibilité email clients) | ☐ |
| Sujet | "Votre bilan Expert est prêt" / "Your Expert assessment is ready" | ☐ |
| Grade card | Dark theme, note, taux succès, 3 lignes résumé | ☐ |
| CTA | "Consulter mon bilan" — or sur marine | ☐ |
| Ton | Chaleureux, factuel, pas promotionnel | ☐ |
| Bilingue | FR/EN selon préférence profil | ☐ |
| Disclaimer | AMF complet en footer | ☐ |
| From | "BuildFi <rapport@buildfi.ca>" | ☐ |

### 4.8 Articles SEO

| Critère | Exigence | Vérifié |
|---------|----------|---------|
| Ton | Millionnaire Invisible / Jeune Retraité / Mr. Money Mustache — adapté BuildFi | ☐ |
| Hook | Situation réaliste, pas clickbait | ☐ |
| Corps | Mécanisme en langage simple, exemple chiffré, nuances | ☐ |
| CTA fin | "Testez votre propre scénario" — pas "Optimisez avec BuildFi" | ☐ |
| Disclaimer | AMF en footer, conditionnel dans le texte | ☐ |
| Typo | Newsreader titres, DM Sans corps | ☐ |
| Grade 10 | Compréhensible sans diplôme en finance | ☐ |
| Pas de listicle | Prose, pas "Les 10 meilleurs trucs" | ☐ |
| Bilinguisme | Chaque article existe en FR ET EN | ☐ |

### 4.9 Messages d'erreur et états vides

| Situation | Message approuvé (FR) | Message approuvé (EN) |
|-----------|----------------------|----------------------|
| MC recalcul lent | "Le recalcul prend un moment. Vos résultats arrivent." | "The recalculation is taking a moment. Your results are coming." |
| MC échoué | "Le calcul n'a pas pu être complété. On réessaie automatiquement." | "The calculation couldn't be completed. We're retrying automatically." |
| AI indisponible | "La narration personnalisée est temporairement indisponible. Votre bilan a été généré avec des observations standards." | "Personalized narration is temporarily unavailable. Your assessment was generated with standard observations." |
| 0 exports restants | "Vos 5 exports inclus sont utilisés. Souhaitez-vous générer un export additionnel pour 14,99 $ + taxes?" | "Your 5 included exports have been used. Would you like to generate an additional export for $14.99 + tax?" |
| Profil vide | "Commencez par charger un profil type ou remplir le quiz pour voir vos premiers résultats." | "Start by loading a template profile or completing the quiz to see your first results." |
| Bilan pas prêt | "Le Bilan Annuel sera disponible à partir de janvier 2027. En attendant, explorez vos leviers avec l'optimiseur." | "The Annual Review will be available starting January 2027. In the meantime, explore your levers with the optimizer." |
| Token expiré | "Votre accès a expiré. Renouvelez pour 29 $/an et retrouvez vos profils et votre historique." | "Your access has expired. Renew for $29/year to recover your profiles and history." |
| Optimiseur partiel | "7 des 8 axes ont été analysés. L'axe [X] n'a pas pu être évalué. Les résultats sont tout de même significatifs." | "7 of 8 axes were analyzed. The [X] axis couldn't be evaluated. The results are still meaningful." |
| Rate limit atteint | "Vous avez atteint la limite de recalculs pour aujourd'hui. Revenez demain pour continuer vos explorations." | "You've reached today's recalculation limit. Come back tomorrow to continue exploring." |
| Réseau / serveur | "Un problème de connexion est survenu. Vérifiez votre connexion internet et réessayez." | "A connection issue occurred. Check your internet connection and try again." |

---

## 5. ANTI-PATTERNS — Ce que l'Expert ne doit JAMAIS ressembler

### 5.1 Anti-pattern "SaaS générique"
- Header bleu (#007bff) avec hamburger menu
- "Welcome to your dashboard"
- Icônes colorées partout
- Cards avec ombres portées excessives
- "Upgrade to Pro for more features!"
- Gradient backgrounds

**Pourquoi c'est un problème :** BuildFi n'est pas Notion, pas Asana, pas un SaaS de productivité. C'est un outil financier qui traite de l'anxiété de retraite des gens. L'esthétique doit inspirer confiance et calme, pas "tech startup."

### 5.2 Anti-pattern "Robo-advisor"
- "Your portfolio is optimized!"
- "Based on your risk profile, we recommend..."
- Graphiques en camembert colorés sans contexte
- "Start investing today"
- Comparaisons avec des benchmarks

**Pourquoi c'est un problème :** BuildFi n'est pas Wealthsimple. On ne gère pas d'argent. On ne recommande rien. On explore des scénarios et on présente des observations.

### 5.3 Anti-pattern "Calculateur gratuit"
- Interface minimaliste avec 3 champs
- "Your retirement number is: $1,200,000"
- Un seul résultat sans contexte
- "Sign up for the full report" (freemium manipulation)
- Publicités dans l'interface

**Pourquoi c'est un problème :** BuildFi n'est pas un calculateur. La profondeur (190 params, 5,000 sims, 13 provinces) est le produit. Si l'UI ressemble à un calculateur gratuit, le client ne comprend pas pourquoi il paie $139.

### 5.4 Anti-pattern "Rapport d'actuaire"
- Tableaux denses sans explication
- Jargon non défini ("CER", "liability-driven", "stochastic dominance")
- PDF de 30 pages de chiffres
- Graphiques sans légende lisible
- Pas de "Ce que cela signifie"

**Pourquoi c'est un problème :** Le client Expert veut comprendre ses chiffres, pas être submergé. Si le rapport ressemble à un output de logiciel d'actuaire, le client ne le lit pas — et il ne renouvelle pas.

### 5.5 Anti-pattern "Anxiété financière"
- "WARNING: Your retirement is at risk!"
- Couleur rouge dominante pour les mauvais scores
- "Without action, you could run out of money by age 72"
- Compteurs de temps ("Time is running out")
- Musique dramatique (oui, certains outils font ça)

**Pourquoi c'est un problème :** BuildFi ne monétise pas l'anxiété. Un score bas est présenté comme une donnée avec des pistes, pas comme une alarme. Le client doit se sentir outillé, pas terrorisé.

---

## 6. COMMENT UTILISER CE DOCUMENT

### Pour Claude Code
Avant de construire un composant visible (quiz, simulateur, rapport, portail, landing, email), Claude Code :
1. Consulte la section §4 correspondante (grille de conformité)
2. Vérifie que chaque critère est satisfait
3. Utilise les phrases-types de §3.3 comme modèles
4. Vérifie contre les anti-patterns de §5
5. Coche les critères dans la grille

### Pour le propriétaire
Après chaque session de développement :
1. Ouvrir ce document
2. Passer en revue la grille de conformité du composant livré
3. Cocher chaque critère
4. Si un critère n'est pas coché → flag pour la session suivante

### Pour l'audit pré-lancement (Session S10)
Chaque grille de §4 doit être 100% cochée. Si une case manque, le lancement est bloqué.

---

## 7. ÉVOLUTION DE L'IDENTITÉ

L'identité BuildFi est établie et ne change pas entre les tiers. Le tier Expert étend la marque vers plus de profondeur, pas vers un autre registre.

Si un futur développement (B2B Phase 5, par exemple) nécessite un registre différent (plus formel, plus technique), ce sera documenté comme une extension de cette identité — pas un remplacement.

Les seuls changements autorisés à cette grille :
- Ajout de nouveaux composants (nouvelles sections §4)
- Ajout de nouvelles phrases-types (§3.3)
- Ajout de nouveaux anti-patterns (§5)
- Mise à jour de la palette si le design system évolue

Les principes de §1 et §3.1-3.2 sont **figés**.

---

*Ce document est la conscience de la marque. Chaque pixel visible par le client doit passer cette grille.*
