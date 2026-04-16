# Phase 0 — Baseline Technique

**Date**: 2026-04-14
**Auteur**: Claude Opus 4.6
**Source de vérité moteur**: `planner_v2.html` (v11.12.9, 19 239 lignes)

---

## 1. Fichiers critiques

| Fichier | Lignes | Rôle | Statut |
|---------|--------|------|--------|
| `planner_v2.html` | 19 239 | **Moteur source de vérité** — MC complet, 144 tests intégrés, 13 provinces, multi-actifs | ACTIF, à refactorer |
| `public/planner_v2.html` | 17 989 | Copie publique (version antérieure) | DIVERGENT — 1250 lignes de retard |
| `public/planner-expert.html` | 15 859 | Variante expert (iframe dans simulateur) | PROBABLEMENT DIVERGENT |
| `lib/engine/index.js` | ~2 440 | Extrait serveur pour API Vercel | OBSOLÈTE — sera remplacé par planner |
| `lib/api-helpers.ts` | 171 | Validation, grades, formatage API | Secondaire — consommateur du moteur |
| `lib/constants-registry.ts` | 380 | Registre de référence (non exécuté) | Référence seulement |
| `lib/constants/fiscal-2026.ts` | 129 | Copie typée des constantes | Référence seulement |
| `app/api/simulate/route.ts` | 87 | API simulation | Consommateur |
| `app/api/compare/route.ts` | 145 | API comparaison variantes | Consommateur |
| `app/api/optimize/route.ts` | 429 | API optimisation 8 axes | Consommateur |
| `app/api/export/route.ts` | ~130 | API export rapport | Consommateur |

## 2. Résultats baseline

### Build Next.js
```
npm run build: PASS (EPERM sur .next/ = conflit OneDrive, non bloquant)
```

### Tests
| Suite | Commande | Résultat |
|-------|----------|----------|
| Fiscal constants sync | `npx tsx tests/fiscal-constants-sync.test.ts` | **135 pass, 0 fail** |
| S3 API | `npx tsx tests/s3-api.test.ts` | **103 pass, 0 fail** |
| S10 Audit | `npx tsx tests/s10-audit.test.ts` | **91 pass, 0 fail** |
| Planner intégré | Navigateur (144 tests, 54 catégories) | **Non exécutable CLI** |

**Note**: Les tests CLI valident `lib/engine/index.js`, pas `planner_v2.html`. Les 144 tests du planner s'exécutent dans le navigateur uniquement.

### Performance
- MC 5000 sims (engine Vercel): ~8 000 ms (Windows/MINGW)
- MC planner (navigateur + Web Worker): non mesuré en baseline CLI

## 3. Divergences connues (planner vs engine)

### 3.1 Valeurs divergentes

| Constante | Planner (vérité) | Engine (lib/) | Delta | Impact |
|-----------|-------------------|---------------|-------|--------|
| QC bracket 2 | 108 730 | 108 680 | -50$ | Faible — affecte QC 2e palier |
| GIS_MAX_COUPLE | 665.41 | 667.41 | +2.00$/mois | Modéré — affecte couples à faible revenu |

### 3.2 Bugs partagés (présents dans les DEUX)

| Bug | Lignes planner | Lignes engine | Sévérité |
|-----|----------------|---------------|----------|
| nonEligDivCr NS/PE/NL/NT/YT erronés | 1535-1539 | 50-54 (corrigé engine) | **P0** |
| eligDivCr YT: 0.12689 au lieu de 0.1202 | 1539 | 54 (corrigé engine) | **P0** |
| Spouse pension: p.penIdx au lieu de p.cPenIdx | 4164 | 1235 (corrigé engine) | **P0** |
| Ontario surtax avant dividend credits | 1622-1626 | 137-142 (corrigé engine) | **P2** |

### 3.3 Fonctionnalités planner absentes de l'engine

| Feature | Planner | Engine |
|---------|---------|--------|
| Matrice corrélation 8 actifs (CRM8) | Oui | Non |
| Exemption emploi GIS ($5K + $10K×50%) | Oui | Non |
| Withdrawal smoothing (CFG_SMOOTH) | Oui | Non |
| Stress test: 9 scénarios détaillés | Oui | Partiel |
| Mortalité CPM-2023 avec amélioration | Oui | Oui (identique) |
| Pension indexation 3-niveaux | Non (binaire: 0/1) | Oui (0/1/2) |

### 3.4 Le planner utilise un modèle de pension indexation binaire

- **Planner**: `p.penIdx ? infM : 1` — truthy check (0=non indexé, tout autre=indexé)
- **Engine**: 3 niveaux (0=non, 1=50% inflation, 2=100% inflation)
- À décider: le schéma centralisé doit supporter les deux, ou unifier vers 3-niveaux.

## 4. Risques initiaux

### P0 — Critiques
1. **Les bugs de dividend tax credits existent toujours dans le planner.** Les corrections appliquées à `lib/engine/index.js` doivent être portées à `planner_v2.html` AVANT la centralisation.
2. **Trois copies du moteur divergent** (planner_v2.html racine, public/planner_v2.html, public/planner-expert.html). La centralisation doit résoudre ce problème de divergence.

### P1 — Significatifs
3. **Le moteur est un blob HTML monolithique.** L'extraction du JS vers un module importable nécessite une stratégie (Web Worker, script injecté, ou module séparé).
4. **Les 144 tests sont in-browser uniquement.** Pas de CI/CD coverage sur le moteur source de vérité. Un test runner CLI pour le planner est un prérequis implicite.
5. **Le fichier `planner-expert.html` est un fork séparé** avec possiblement d'autres divergences non documentées.

### P2 — Modérés
6. **OneDrive file locking** cause des EPERM sur `.next/` et potentiellement sur les gros fichiers HTML en édition concurrente.
7. **La pension indexation binaire vs ternaire** nécessite une décision d'unification avant le schéma central.
8. **FED_RATES[0] = 0.14** — documenter comme "Budget 2024 via C-69" mais nécessite vérification contre barèmes CRA 2026 publiés.
