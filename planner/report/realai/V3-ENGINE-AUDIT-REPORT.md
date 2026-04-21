# BuildFi planner_v3 — Audit Ligne par Ligne (Diagnostic + Recommandations)

**Date:** 2026-04-20  
**Fichier audité:** `planner/planner_v3.html`  
**Périmètre moteur:** lignes `1990` à `7590` (`/*__ENGINE_START__*/` → `/*__ENGINE_END__*/`)  
**Références comparées:**
- `planner/report/realai/V3-ENGINE-TECHNICAL-REFERENCE.md`
- `planner/report/realai/v3-engine-audit.cjs`
- `planner/report/realai/v3-engine-audit-deep.cjs`
- `planner/report/realai/v3-engine-audit-final.cjs`
- `planner/__tests__/v3-profiles.json`
- `planner/__tests__/snapshot-harness.html`

---

## 1) Verdict global

Le moteur **n’est pas prêt** pour une validation finale de qualité report tant que les P0 ci-dessous ne sont pas corrigés.

Points bloquants observés:
1. sélection de trajectoire médiane (`medPath`) mathématiquement incohérente;
2. sous-imposition structurante en couple (retraits NR conjoint non imposés);
3. statistiques/percentiles calculés avec `N` après filtrage des simulations invalides.

Ces trois défauts peuvent expliquer directement les graphiques “bizarres”, une narration IA faible (données médianes incohérentes), et des écarts fiscaux en mode couple.

---

## 2) Méthodologie

Audit effectué en 3 couches:
1. lecture ligne par ligne des fonctions moteur (`calcTax`, `optimizeDecum`, `runMC`, auxiliaires);
2. exécution ciblée de reproductions Node sur `planner/report/realai/v3-engine.cjs`;
3. audit des outillages QA (harness + scripts d’audit) pour valider la fiabilité des tests eux-mêmes.

Important: plusieurs scripts d’audit existants contiennent des hypothèses/signes de test invalides (voir section 6), donc un “PASS” global historique ne suffit pas.

---

## 3) Constat Critique P0

### P0-1 — Sélection de la “simulation médiane” incohérente

**Lignes impactées:**
- `planner_v3.html:7073-7074` (distance médiane calculée sur `all[mi][all[mi].length - 1]`)
- `planner_v3.html:7081` (`medSimFinal = fins[medSimIdx]` alors que `fins` est trié)

**Problème:**
- La distance à la médiane compare la richesse au **dernier point de l’horizon** (souvent après décès, parfois 0), pas la richesse finale économique utilisée dans `fins`.
- Ensuite, `medSimIdx` (index dans `all` non trié) est réappliqué à `fins` trié.

**Impact:**
- `medPath`, `medSimFinal`, et une partie de la narration/reporting peuvent décrire une trajectoire non représentative.
- Symptôme visible: graphiques incohérents vs indicateurs de synthèse.

**Reproduction observée:**
```json
{
  "medF": 800891.671087465,
  "medSimFinal": 2662861.2084270176,
  "lastMedPathTotal": 777378.3895001379,
  "diff": 1885482.8189268797
}
```

**Recommandation corrective:**
1. conserver un tableau `finalsRaw[]` non trié, aligné 1:1 avec `all[]`;
2. calculer `medSimIdx` sur `finalsRaw[]`;
3. calculer `medSimFinal = finalsRaw[medSimIdx]`;
4. trier uniquement des copies (`finsSorted`, `liqSorted`) pour les percentiles.

---

### P0-2 — Retraits NR du conjoint non imposés

**Lignes impactées:**
- retraits NR conjoint exécutés: `planner_v3.html:6512-6513`, `6533-6534`
- composantes fiscales conjoint: `planner_v3.html:6834-6840`
- aucune inclusion de `_wFromCNR` dans `cTaxableInc`

**Problème:**
- Le moteur utilise `cNR` pour financer les dépenses, mais ne fiscalise pas la portion gain en capital côté conjoint.

**Impact:**
- Sous-estimation d’impôt en couple.
- Surestimation du patrimoine final et du succès dans certains profils.

**Reproduction observée (horizon court, dépenses financées par cNR):**
```json
{
  "tax": [0, 0, 0],
  "taxInc1": [12114.4992, 12356.789184, 12603.92496768],
  "taxInc2": [12114.4992, 12356.789184, 12603.92496768],
  "medPath": [
    {"age":70,"cnr":959643.047953043},
    {"age":71,"cnr":903821.6646758162},
    {"age":72,"cnr":896229.7886568294}
  ]
}
```

Le capital `cNR` baisse fortement, mais l’impôt reste 0.

**Recommandation corrective:**
1. introduire `cNrACB` (parité avec `nrACB`);
2. intégrer `_wFromCNR` à la base imposable du conjoint via la logique d’inclusion (`cgIncLo/cgIncHi`);
3. couvrir avec tests unitaires couple (NR primaire vs NR conjoint).

---

### P0-3 — Percentiles et moyennes biaisés après filtrage `NaN`

**Lignes impactées:**
- filtrage: `planner_v3.html:7053-7056`
- extraction stats avec `N` (au lieu de longueur filtrée): `7066-7071`, `7086-7099`, `7525-7538`

**Problème:**
- Après filtrage de `fins`, le code continue d’indexer/diviser avec `N`.

**Impact:**
- biais sur `mean`, `sd`, `var5`, percentiles;
- risque `undefined` si longueur filtrée << `N`;
- incohérence dans l’affichage report.

**Recommandation corrective:**
1. définir `M = fins.length`, `L = liqFins.length` après filtrage;
2. utiliser `M`/`L` pour tous les index et dénominateurs;
3. conserver `N` uniquement pour métriques explicitement basées sur toutes simulations (ex: `succ`, `ruinPct`).

---

## 4) Constat Important P1

### P1-1 — Corrélation `deathVsRuin` cassée par tri prématuré de `ruinAges`

**Lignes impactées:**
- tri de `ruinAges`: `planner_v3.html:7063-7065`
- couplage indexé avec `deathAges` dans `deathVsRuin`: `7491-7498`

**Problème:**
- `ruinAges` est trié seul, puis réassocié index-à-index à `deathAges` non trié.

**Impact:**
- la visualisation “décès vs ruine” perd son sens statistique (paires brisées).

**Fix:** ne jamais trier `ruinAges` in-place avant les analyses corrélées; travailler sur copie triée.

---

### P1-2 — `medSimRuin` potentiellement désaligné

**Lignes impactées:** `planner_v3.html:7082`

**Problème:**
- `medSimIdx` (issu de `all`) pointe ensuite vers `ruinAges` déjà trié.

**Impact:**
- le “ruin age” attribué à la simulation médiane peut être faux.

---

### P1-3 — Plus-value immobilière au décès: source de données incohérente

**Lignes impactées:**
- calcul utilise `p.props`: `planner_v3.html:6993-7000`
- mais `origV`/`v` sont construits dans `reVals`: `planner_v3.html:5820-5826`

**Problème:**
- `p.props` n’expose pas `origV`/`v` au format attendu.

**Impact:**
- risque de sous-calcul (ou calcul approximatif) de gain réputé au décès pour locatif.

**Fix:** itérer sur `reVals` (ou maintenir une projection immobilière cohérente dans une structure unique).

---

### P1-4 — Flag `BF_V3_HOUSEHOLD` déclaré mais non branché moteur

**Lignes:**
- déclaration: `planner_v3.html:1891-1896`
- occurrences totales: 4 (aucune dans le bloc moteur `1990-7590`)

**Problème:**
- le flag est présenté comme garde-fou des changements ownership/couple, mais ne conditionne pas l’exécution moteur.

**Impact:**
- fausse impression de rollback possible.

---

### P1-5 — Ownership UI/schema collecté mais non consommé en calcul

**Lignes:**
- validation ownership: `planner_v3.html:1963-1977`
- UI ownership: `planner_v3.html:13409-13453`
- moteur: aucune occurrence `ownerSelf/ownerSpouse` entre `1990-7590`

**Problème:**
- capture UX avancée sans effet réel sur fiscalité/estate moteur.

**Impact:**
- risque d’interprétation erronée utilisateur (“j’ai paramétré 70/30 donc c’est pris en compte”).

---

### P1-6 — Incohérence de logique rollover conjoint (`optimizeDecum` vs `runMC`)

**Lignes:**
- `optimizeDecum`: `planner_v3.html:5001-5005`
- `runMC`: `planner_v3.html:6462-6471`

**Problème:**
- logique de transfert déclenchée différemment selon moteur, et dans `runMC` située dans le flux retraite.

**Impact:**
- divergences déterministe vs Monte Carlo dans certains cas de décès pré-retraite.

---

### P1-7 — Ordre crédit dividende / abattement QC à confirmer fiscalement

**Lignes:** `planner_v3.html:2743-2750`

**Constat:**
- abattement QC appliqué avant crédit dividende fédéral.

**Impact:**
- possible écart fiscal sur profils QC avec dividendes.

**Action:** validation conformité CRA/Revenu Québec par spécialiste fiscal avant figer la logique.

---

## 5) Constat Qualité/Dette Technique P2

### P2-1 — Double déclaration `cFhsa`

**Lignes:** `planner_v3.html:4965` et `4989`

**Impact:** lisibilité, risque de bug de maintenance.

---

### P2-2 — `runMC` mute l’objet entrée `p`

**Lignes:** `planner_v3.html:5706-5761`

**Impact:** effets de bord possibles entre appels si l’appelant réutilise la même référence objet.

---

### P2-3 — Drift documentaire interne

**Lignes:**
- commentaire “Tax brackets 2025” alors que base 2026: `planner_v3.html:2693` vs `2089`
- commentaire payroll “2025 rates”: `planner_v3.html:5673`

**Impact:** confusion audit/compliance.

---

## 6) Audit des outils QA (fiabilité des tests)

### 6.1 `snapshot-harness` utilise un contrat paramètre non aligné

**Lignes:**
- passage direct des params au moteur: `snapshot-harness.html:137-145`
- profils avec schéma `props` legacy (`mort/rate/amort/rent/exp/tax`): `v3-profiles.json:107`, `148-149`, `190-191`
- moteur attend `mb/mr/ma/rm/ox/pt`: `planner_v3.html:5821-5825`

**Conséquence:**
- snapshots potentiellement invalides pour immobilier;
- calibration rendement potentiellement partielle si champs non mappés.

### 6.2 Scripts d’audit avec assertions obsolètes

**Exemples:**
- `v3-engine-audit-deep.cjs:210-211` attend `ct.total` au lieu de `totalTax`;
- `v3-engine-audit-deep.cjs:216-219` appelle `calcWHT` avec montant, alors signature attend allocation;
- `v3-engine-audit-final.cjs:133-141` journalise encore des seuils ON 2024 dans le texte.

**Conséquence:** faux positifs/faux négatifs de QA.

---

## 7) Audit par blocs (ligne par ligne, statut)

1. **Constantes & tables fiscales (`2068-2264`)**: globalement solides; seuils ON 2026 présents.
2. **Tax personnel (`2702-2810`)**: robuste sur base, point de conformité QC à arbitrer.
3. **Impôt corporatif (`2816-2844`)**: cohérent (retour `totalTax`).
4. **Prestations (`2845-2899`)**: logique claire; vérifier seulement documentation de taux/années.
5. **Optimiseur déterministe (`4942-5431`)**: fonctionnel mais dette (`cFhsa` dupliqué, rollover à harmoniser).
6. **Moteur MC (`5700-7590`)**: zone critique; plusieurs incohérences structurelles (P0/P1).
7. **Schema/ownership (`1927-1980`, `13409+`, `14268+`)**: capture UI en avance sur moteur.
8. **Harness/tests (`__tests__`, `report/realai/*.cjs`)**: couverture utile mais partiellement non fiable sans refonte du contrat.

---

## 8) Plan de remédiation recommandé (séquentiel)

### Phase A — Correctifs P0 (obligatoire avant nouvelle campagne rapport)

1. Corriger `medPath`/`medSim*` (indexation sur données non triées).
2. Corriger fiscalité NR conjoint (`_wFromCNR`, `cNrACB`, inclusion taux CG).
3. Corriger stats après filtrage `NaN` (`M/L` au lieu de `N`).

**Critères d’acceptation:**
- `medSimFinal` proche de `medF` (écart borné, test de cohérence);
- cas de repro conjoint NR produit impôt > 0 quand retrait NR conjoint > 0;
- aucune métrique percentile/moyenne `undefined` après filtres.

### Phase B — Correctifs P1

1. Réparer corrélation `deathVsRuin` (ne pas trier `ruinAges` in-place).
2. Réparer CG immobilier décès (utiliser `reVals`).
3. Harmoniser rollover conjoint `optimizeDecum`/`runMC`.
4. Décider et appliquer stratégie flag ownership (`BF_V3_HOUSEHOLD`) + consommation moteur des ownerships.

### Phase C — Qualité QA & doc

1. Aligner `v3-profiles.json` avec contrat moteur (ou injecter normaliseur explicite).
2. Corriger scripts d’audit (`deep/final`) pour signatures réelles.
3. Mettre à jour référence technique avec lignes et comportement exacts post-fix.

---

## 9) Priorités actionnables immédiates

1. **Bloquer l’interprétation business des graphes médianes actuelles** tant que P0-1/P0-3 ne sont pas corrigés.
2. **Bloquer l’usage couple pour décisions fiscales fines** tant que P0-2 n’est pas corrigé.
3. **Refaire un snapshot baseline complet** après alignement contrat profils/harness.

---

## 10) Conclusion

La base moteur est riche et ambitieuse, mais l’état actuel contient des écarts structurels qui peuvent dégrader la fiabilité report (math + narration IA + UX graphique).  
Le chemin de correction est clair et court: corriger d’abord les 3 P0, puis verrouiller la cohérence couple/ownership, puis fiabiliser la QA.

Une fois ces étapes faites, on peut lancer un audit de conformité final avec un niveau de confiance nettement supérieur.
