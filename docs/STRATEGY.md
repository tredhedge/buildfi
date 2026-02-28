# STRATEGY.md
> Brand, positionnement, marketing, compétiteurs, pricing, copy.
> Mis à jour: 2026-02-28 — v4 (pipeline E2E validé, pivot PDF→HTML, compétiteurs mis à jour)

---

## 1. POSITIONNEMENT

**FR**: Pour les Canadiens qui se demandent s'ils sont prêts pour la retraite, buildfi.ca est le premier bilan retraite personnalisé qui explique vos résultats en langage clair — pas en jargon financier.

**EN**: For Canadians wondering if they're ready for retirement, buildfi.ca is the first personalized retirement assessment that explains your results in plain language — not financial jargon.

**The One Thing**: We explain your retirement in language you actually understand.

**Catégorie**: Personalized retirement assessment (NOT calculator, NOT simulator, NOT tool)

### Hero Slogan (confirmé 2026-02-27 — landing v9)
- **FR**: "Savoir si votre argent va durer."
- **EN**: "Know if your money will last."
- **Previous**: "Un plan de retraite qui vous ressemble." — REMPLACÉ (v4→v9)
- **Previous**: "Arrêtez de vous demander si vous serez correct" — ABANDONNÉ (paternaliste)

### Trust Grid (in hero, NO separate proof bar)
1. Vos données ne sont jamais stockées
2. Résultats en 5 minutes
3. Un seul paiement, pas d'abonnement
4. 100 % adapté à la réalité canadienne — chaque province, chaque règle

### Les Cinq Ennemis
| Ennemi | Problème |
|--------|----------|
| Calculateurs gouvernementaux | 30 min, aucun insight, confus |
| Outils US (ProjectionLab, Boldin) | Ne comprennent pas les taxes canadiennes |
| Planificateurs financiers | $1,500–5,000, gatekeeping |
| ffPro.ca | Construit pour actuaires, pas le grand public |
| Feuilles de calcul | DIY hell, aucune confiance |

---

## 2. PERSONA PRINCIPALE — Marie-Ève

38 ans, Sherbrooke QC. Mariée, 2 enfants. Revenu ménage $115K. REER $52K, CÉLI $18K. Hypothèque $285K. Pas de planificateur — trop cher. A essayé SimulR, a abandonné.

---

## 3. QUÉBEC EN PREMIER

- 8,5M personnes. Système fiscal distinct. ZÉRO contenu FR de qualité sur la retraite FIRE.
- CPMs publicitaires FR QC dramatiquement plus bas qu'EN Canada.
- Partenariat cible: Jean-Sébastien Pilotte (jeuneretraite.ca).

---

## 4. PRICING

### Prix régulier
| Produit | Prix |
|---------|------|
| Essentiel | $39 CAD |
| Intermédiaire | $69 CAD |
| Expert | $139 CAD |

**Note Stripe**: automatic_tax désactivé. Prix tax-inclusive ($39 TTC) jusqu'à configuration TPS/TVQ.

### Early Adopter (confirmé 2026-02-26)
| Tranche | Rabais | Ess | Inter | Expert |
|---------|--------|-----|-------|--------|
| Premiers 100 | 50% | $19.50 | $34.50 | $69.50 |
| 101–200 | 25% | $29.25 | $51.75 | $104.25 |
| 201+ | 0% | $39 | $69 | $139 |

**Affichage**: "Offre de lancement — 50 % de rabais" + prix barrés. PAS de compteur de places (fake scarcity supprimée).

### Psychologie
- Decoy: $69 entre $39 et $139. Marqué "POPULAIRE".
- Upgrade credit: nous créditons l'achat précédent vers le niveau supérieur.

### ⚠️ POLITIQUE DE REMBOURSEMENT — AUCUN REMBOURSEMENT
Produit numérique, livraison instantanée. Si erreur technique → correction/reproduction sans frais. C'est tout. Ne JAMAIS écrire "garantie satisfaction", "30 jours", "sans risque", ou "money-back" nulle part.

### Bonuses inclus (confirmé 2026-02-27, noms exacts)
| Bonus | Nom exact | Inclus dans |
|-------|-----------|------------|
| Outil interactif de gestion de dettes | debt-tool.jsx (buildfi.ca/outils/dettes) | Essentiel + Intermédiaire |
| Guide éducatif 101 | "Les bases de vos finances" (13p PDF) | Essentiel |
| Guide éducatif 201+301 | "Optimiser votre retraite" (19p PDF) | Intermédiaire + Expert |

---

## 5. PRODUCT POSITIONING (confirmé 2026-02-27)

### Per-product personas & CTAs
| Produit | Persona FR | CTA FR | CTA EN |
|---------|------------|--------|--------|
| Essentiel | "Vous commencez à planifier" | "Obtenir ma note →" | "Get my grade →" |
| Intermédiaire | "Vous voulez aller plus loin" | "Analyser ma situation →" | "Analyze my situation →" |
| Expert | "Tout ce que vous avez toujours cherché" | "Voir le simulateur →" | "See the simulator →" |

### Segmentation rules
- **Essentiel = personnes seules SEULEMENT.** Couple → minimum Intermédiaire.
- **Intermédiaire = couples, propriétaires, stratégie fiscale.**
- **Expert = simulateur complet.** 190+ paramètres, 12 modules, CCPC, stress tests.

---

## 6. VOIX DE LA MARQUE

**Ton**: Clair. Chaleureux. Confiant. Anti-bullshit. Créateur de valeur. Grade 10 de lecture.

| JAMAIS | PLUTÔT |
|--------|--------|
| "Calculator" | "Assessment", "portrait", "bilan" |
| "Monte Carlo" | "Milliers de scénarios" |
| "Success rate" | "Note" — lettre A+ à F |
| "Vous devriez" | "Cette analyse suggère" |
| "Recommandations" | "Observations", "Ce que cela signifie" |
| "Plan d'action" | "Points d'attention", "Leviers identifiés" |
| "Optimisation" / "Optimiser" | "Ajustements possibles", "Pistes à explorer" |
| Garantie/remboursement | N/A — produit numérique, pas de remboursement |
| Price anchoring dans l'outil | "Un planificateur coûte $1,500" = SITE MARKETING SEULEMENT, jamais dans le quiz/rapport |

### Registre AMF — rappel
- Conditionnel obligatoire: pourrait/serait (FR), would/could (EN)
- Observationnel: "Cette analyse indique...", "Les données suggèrent..."
- Jamais directif: should, devriez, recommandons, il faut, priorisez, assurez-vous
- Jamais affirmatif futur: vous aurez, you will have, vous recevrez
- Voir TECH-REFERENCE.md §6 pour la liste complète des mots interdits

---

## 7. IDENTITÉ VISUELLE

### Palette
| Couleur | Hex | Usage |
|---------|-----|-------|
| Marine | #1a2744 | Titres, nav |
| Or | #b8860b | CTAs, premium |
| Crème | #faf8f4 | Fond |
| Sable | #e8e4db | Cartes |
| Forêt | #1a7a4c | Succès |
| Brique | #b91c1c | Alerte |

### Typo: Newsreader (display) · DM Sans (body) · JetBrains Mono (data)

### Logo
- SVG flame logo: /public/logo-light.svg, /public/logo-dark.svg
- Shared JS: /public/logo.js — logoSVG(size, context)
- Intégré dans: landing page (JS injection), quiz (inline fallback), email (texte pour l'instant — SVG à intégrer)

---

## 8. LANDING PAGE STRUCTURE (v9, 2026-02-27)

1. **Hero** — "Savoir si votre argent va durer." + trust grid intégré
2. **Trouvez votre bilan** — 3 product cards avec personas, descriptions, features, CTAs différenciés
3. **Bonus inclus** — Section dédiée: outil de dettes + guides éducatifs
4. **Aperçu des produits** — Layout 2 colonnes: Essentiel, Intermédiaire, Simulateur Expert
5. **Prix** — Comparison pricing + table collapsible
6. **FAQ** — 7 questions (no-refund policy correcte)
7. **Final CTA**
8. **Footer** — disclaimer AMF, liens légaux

**Supprimé depuis v4**: Proof bar, "Why BuildFi", free tool teaser, testimonials placeholder, redondance "Find your fit" vs "Pricing" (fusionné).

**Audit AMF/BSIF landing v9**: Complété 2026-02-27. 0 terme interdit. Détails dans HANDOFF-LANDING-V9.md.

---

## 9. COMPÉTITEURS

| Compétiteur | Prix | Notre avantage |
|-------------|------|----------------|
| ProjectionLab | $120/an | Taxes CA + rapport clair + one-time |
| Boldin | $144/an | Simple + canadien + one-time |
| **ffPro.ca** | **$135/an** | **Plus simple + one-time + bilingue** |
| Wealthsimple | Gratuit (lead gen) | Profondeur MC + rapport détaillé |
| Optiml.ca | $99–492/an | MC 5,000 vs 50 scénarios + one-time + bilingue |

### Livraison du rapport — note compétitive
La plupart des SaaS financiers (Wealthsimple, Questrade, etc.) envoient un **lien web** vers le rapport, pas un PDF attaché. Notre approche (rapport HTML hébergé + lien email) est standard dans l'industrie. Le PDF est un nice-to-have, pas un must-have pour le lancement.

---

## 10. DÉCISIONS STRATÉGIQUES RÉCENTES (2026-02-27)

### Pivot PDF → rapport HTML hébergé
- Puppeteer + @sparticuz/chromium ne fonctionne pas sur Vercel serverless
- Rapport HTML hébergé sur Vercel Blob, lien envoyé par email
- window.print() dans le rapport pour export PDF côté client (à ajouter)
- Aligné avec les pratiques de l'industrie SaaS financière

### Thin client architecture
- Quiz ne contient ZERO logique MC côté client (805 lignes vs 3,227)
- Tout le calcul est server-side post-paiement
- Protège la propriété intellectuelle du moteur
