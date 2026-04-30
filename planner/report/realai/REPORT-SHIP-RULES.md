# REPORT-SHIP-RULES.md

**Charte de livraison v1 pour les rapports BuildFi.** Ce document est l'autorité.
Aucun rapport ne peut être livré au client sans satisfaire chaque règle ci-dessous.

---

## 1. Définition canonique des KPI

Chaque métrique a UNE définition. Toute section qui surface une de ces métriques
doit la lire depuis [review-contract.js](../review/review-contract.js) — jamais
la recalculer localement.

| Clé canonique | Définition | Source |
|---|---|---|
| `success_rate` | % des simulations Monte Carlo où l'épargne ne s'épuise pas avant l'âge de décès projeté. | `mc.succ` |
| `p25_wealth_real` / `p50_wealth_real` / `p75_wealth_real` | Patrimoine en dollars réels (pouvoir d'achat constant) aux 25e, 50e et 75e percentile. | `mc.rP25F / rMedF / rP75F` |
| `gov_coverage_only` | Part des dépenses cibles couverte UNIQUEMENT par RRQ + PSV + SRG, **hors** pension d'employeur, **hors** retraits du portefeuille. | Moyenne sur années post-retraite. |
| `guaranteed_income_coverage` | Part des dépenses couverte par RRQ + PSV + SRG **+ pension d'employeur**. **Exclut** les retraits du portefeuille. | Moyenne sur années post-retraite. |
| `monthly_gap` | Différence mensuelle entre dépenses cibles et revenu garanti. Ce que le portefeuille doit combler. | Calculé à partir de `guaranteed_income_coverage`. |
| `oas_clawback_years` | Nombre d'années où le revenu net imposable dépasse le seuil PSV 2026 (~95 K$). | `mc.oasClbkYrs` |
| `lifetime_tax_real` | Somme des impôts payés sur l'horizon de retraite, dollars réels. | `mc._lifetimeTax` |
| `gis_lifetime` | SRG cumulé sur l'horizon, dollars réels. **Surfacé seulement si `gis_plausibility` est vrai.** | `mc._gisLifetime` |
| `gis_plausibility` | Vrai si **et seulement si** : (a) au moins une année avec revenu non-PSV < 22 K$ (seul) ou < 30 K$ (couple par personne), ET (b) patrimoine liquide à 65 ans ≤ 250 K$ (seul) ou ≤ 400 K$ (couple). | Calculé à partir des règles 2026. |

### Règles de surface

- Si une section affiche `gov_coverage_only`, le label doit dire **« Couverture publique seulement »** ou équivalent EN.
- Si une section affiche `guaranteed_income_coverage`, le label doit dire **« Couverture garantie (publics + pension) »**.
- Le mot « couverture » seul est **banni** sans qualificatif. Les contradictions entre sections viennent de cette ambiguïté.

---

## 2. Liste des bloquants (no-ship)

Le rapport ne peut PAS être livré si **un seul** des éléments suivants est présent :

| # | Bloquant | Détecté par |
|---|---|---|
| B1 | Section mandatoire vide ou < 250 octets de corps | `table-auditor.js` |
| B2 | Section mandatoire absente | `table-auditor.js` |
| B3 | Deux sections avec le même `id` | `table-auditor.js` |
| B4 | Plan d'action avec 0 levier | `table-auditor.js` |
| B5 | KPI principal rendu en em-dash (—) plus de 1 fois sur la cover/assessment | `table-auditor.js` |
| B6 | Pourcentage du même concept varie de > 5 points entre 2 sections | `data-auditor.js` |
| B7 | Section GIS présente mais `gis_plausibility` est faux | `data-auditor.js` |
| B8 | Graphique avec « approximation » / « approximate » dans son titre | `chart-auditor.js` |
| B9 | Heatmap de sensibilité présente (banni en V1 — éducatif, pas vrai MC) | `chart-auditor.js` |
| B10 | Source de revenu centrale absente du graphe (corp pour CCPC, locatif pour landlord) | `chart-auditor.js` |
| B11 | > 5 occurrences de tokens FR dans rapport EN (ou inverse) | `language-auditor.js` |
| B12 | `data_blocked` flag set par le pipeline (donnée moteur incohérente) | `release-gate.js` |

---

## 3. Sections autorisées en version client

| Section | Permis V1 | Notes |
|---|---|---|
| Cover, advisor letter, exec summary, diagnostic, profile, family, goals | ✓ | Toujours autorisées si données présentes. |
| Real estate, corp, RSU, debt | ✓ conditionnel | Surfacées seulement si données du profil le justifient. |
| Projection, revenue, cashflow | ✓ | Métriques canoniques uniquement. |
| **Histogram (final-wealth distribution)** | ✗ banni si titre contient « approximation » | Sortie possible si validé comme vrai output moteur sans label « approximation ». |
| **Sensitivity heatmap** | ✗ banni en V1 | Approximation éducative — pas un vrai re-run MC. |
| Risk & sensitivity (tornado) | ✓ | Tornado seulement, pas de heatmap. |
| Stress tests | ✓ avec callout si uniforme | Si les 6 scénarios collapsent dans une plage de ≤ 2 pts, remplacé par un encadré court. |
| Tax, draworder, meltdown | ✓ | Conditionnels selon profil. |
| **GIS/SRG** | ✓ conditionnel sur `gis_plausibility = true` | Sinon section retirée automatiquement. |
| Succession, insurance | ✓ conditionnel | |
| Action plan | ✓ obligatoire (≥ 2 leviers) | Top-up baseline si moteur ne produit pas assez. |
| What-If simulator | ✓ Bilan SKU seulement | Planner SKU reçoit upsell teaser. |
| Methodology, assumptions, glossary, signature | ✓ obligatoires | |

---

## 4. Grille de notation finale (codex)

Notation sur 100, mappée sur 10.

| Axe | Pondération | Règle |
|---|---|---|
| **Data integrity** | 30 pts | KPI cohérents, définitions stables, zéro contradiction. |
| **Graphes / tableaux** | 20 pts | Chaque graphe ajoute info, pas de doublon, pas de visuel trompeur. |
| **Narration** | 20 pts | Vraie lecture du cas, pas paraphrase, ton calibré au profil. |
| **Cohésion globale** | 15 pts | Ordre logique, sections au service d'une décision. |
| **Langue / compliance** | 15 pts | Zéro fuite FR/EN, AMF-conforme. |

**Mapping :**
- 90+ et 0 bloquant = **9/10**
- 80-89 ou ≤ 5 majeurs = 8/10
- 70-79 = 7/10
- < 70 ou ≥ 1 bloquant = pas livrable

**Règle d'override absolu :** un rapport à 92/100 avec un GIS impossible = échec. Tout bloquant = échec, peu importe le score numérique.

---

## 5. Pipeline de livraison (2 passes obligatoires)

```
moteur → DRAFT (rendu interne)
       → review pack (canonical metrics + sections + charts + AI slots)
       → reviewers déterministes (data, table, language, chart)
       → arbiter (findings + fix-plan)
       → correction-pass (suppress section / rerun slot / canonical)
       → CORRECTED (2e rendu)
       → post-fix audit
       → SHIP GATE (0 blocker required)
       → final/{profile}.html       ← livraison
       OU
       → review/{profile}.fail.json  ← non livré
```

Aucun rapport client ne sort du premier rendu. Période.

---

## 6. Artefacts générés par le pipeline

Pour chaque profil :

```
draft/{profile}_{lang}.html
review/{profile}_{lang}.review-pack.json
review/{profile}_{lang}.findings.json
review/{profile}_{lang}.fix-plan.json
corrected/{profile}_{lang}.html
review/{profile}_{lang}.postfix-findings.json
final/{profile}_{lang}.html       (si ship gate OK)
review/{profile}_{lang}.fail.json (sinon)
```

---

## 7. Engagement de livraison

Cette charte est le contrat. Si un rapport est livré avec un bloquant, le pipeline a un bug, pas le rapport.

**Le rapport livré au client n'est jamais le premier rendu.**
