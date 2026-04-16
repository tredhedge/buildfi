# Audit Complet — 10 Rapports EN (BuildFi)

Date: 2026-04-15  
Périmètre audité (EN seulement):  
- [ccpc_owner_en.html](/C:/Users/tredh/OneDrive/Documents/GitHub/buildfi/report/test-output/ccpc_owner_en.html)  
- [couple_transition_en.html](/C:/Users/tredh/OneDrive/Documents/GitHub/buildfi/report/test-output/couple_transition_en.html)  
- [debt_young_en.html](/C:/Users/tredh/OneDrive/Documents/GitHub/buildfi/report/test-output/debt_young_en.html)  
- [fire_seeker_en.html](/C:/Users/tredh/OneDrive/Documents/GitHub/buildfi/report/test-output/fire_seeker_en.html)  
- [hnw_couple_en.html](/C:/Users/tredh/OneDrive/Documents/GitHub/buildfi/report/test-output/hnw_couple_en.html)  
- [low_income_gis_en.html](/C:/Users/tredh/OneDrive/Documents/GitHub/buildfi/report/test-output/low_income_gis_en.html)  
- [real_estate_en.html](/C:/Users/tredh/OneDrive/Documents/GitHub/buildfi/report/test-output/real_estate_en.html)  
- [retiree_decum_en.html](/C:/Users/tredh/OneDrive/Documents/GitHub/buildfi/report/test-output/retiree_decum_en.html)  
- [rsu_tech_en.html](/C:/Users/tredh/OneDrive/Documents/GitHub/buildfi/report/test-output/rsu_tech_en.html)  
- [young_accum_en.html](/C:/Users/tredh/OneDrive/Documents/GitHub/buildfi/report/test-output/young_accum_en.html)  

---

## Résumé Exécutif
- Qualité visuelle de base: bonne (layout cohérent, style premium, structure sectionnée claire).
- Qualité contenu/chiffres: **insuffisante pour livraison client telle quelle**.
- Problèmes critiques détectés:
1. KPI `Init. WR (% portfolio)` à `100.0%` sur 9/10 rapports (anomalie forte).
2. Incohérences majeures entre narratif, KPI et texte AI (ex: succession/meltdown).
3. Encodage cassé (mojibake) dans les rapports EN (`Ã`, `Â`, `âœ`, etc.).
4. Placeholder AI visible en production sur 1 rapport (`Click "AI Analysis"`).
5. Cohérence de marque/tier inégale (`Bilan 360` vs `Laboratory`) selon profil.

Verdict global: **Base UX/UI solide, fiabilité data/content non prête production.**

---

## Méthodologie d’audit
- Audit statique HTML + extraction structure (titres/sections/tables/SVG).
- Contrôles automatiques:
  - placeholders, artefacts, encodage, cohérence de sections
  - détection KPI sensibles (`Init. WR`, succession)
  - cohérence branding et présence disclaimer.
- Revue qualitative:
  - données, lisibilité, narration, confiance, continuité UX.

---

## 10 Perspectives d’audit

## 1) Intégrité des données
Constats
- `Init. WR (% portfolio)` = `100.0%` sur 9/10 rapports EN.
- Valeurs succession absurdes dans un cas (`2$` brut, `1$` net).
- Exemple critique: [couple_transition_en.html](/C:/Users/tredh/OneDrive/Documents/GitHub/buildfi/report/test-output/couple_transition_en.html):1

Risque
- Perte de crédibilité immédiate.
- Risque conformité si conseillé interprète ces valeurs comme exactes.

Recommandations
1. Ajouter garde-fou de plausibilité (range checks) avant rendu.
2. Bloquer export si KPI critique hors plage.
3. Exposer source/calcul de chaque KPI clé dans un mode debug.

## 2) Cohérence numérique interne
Constats
- Incohérences entre phrase narrative et KPI dans la même section.
- Exemple meltdown (HNW): “réduit à 1.4M$” + “-74% reduction” depuis 820k (math incompatible).
- Exemple: [hnw_couple_en.html](/C:/Users/tredh/OneDrive/Documents/GitHub/buildfi/report/test-output/hnw_couple_en.html):1
- Incohérences succession KPI vs AI text sur plusieurs rapports.

Risque
- Contradictions détectables par client/conseiller en 30 secondes.

Recommandations
1. Générer narration uniquement à partir des KPI finalisés (single source).
2. Ajouter tests unitaires “narrative vs KPI consistency”.
3. Standardiser les arrondis (K/M/$ entiers) par section.

## 3) Pertinence profil/personnalisation
Constats
- Sections spécialisées présentes par profil (bon point): `corp`, `debt`, `realestate`, `rsu`, `meltdown`, `risk`.
- Mais certaines métriques semblent génériques/répétitives (ex: WR 100% partout).

Risque
- Impression “template générique” malgré profil riche.

Recommandations
1. Ajouter “profile fingerprint checks” (KPI attendus par type de client).
2. Forcer 3 insights spécifiques profil (pas de texte générique).

## 4) Qualité de contenu (narratif)
Constats
- Ton global professionnel et pédagogique.
- Sur-utilisation de callouts AI (jusqu’à 8 callouts sur un même rapport).
- Certaines phrases AI sont en conflit avec les chiffres affichés.

Risque
- Fatigue cognitive et perte de confiance.

Recommandations
1. Limiter AI callouts à 1 par section clé.
2. Prioriser “insight actionnable + preuve chiffrée” plutôt que paraphrase.
3. Ajouter niveau de confiance par insight AI.

## 5) UX (parcours et compréhension)
Constats
- TOC claire, progression logique des sections, bonne segmentation.
- Blocage UX sur placeholder visible:
  - [hnw_couple_en.html](/C:/Users/tredh/OneDrive/Documents/GitHub/buildfi/report/test-output/hnw_couple_en.html):1 (`Click "AI Analysis"`).

Risque
- Impression de fonctionnalité inachevée en environnement client.

Recommandations
1. Zéro placeholder en environnement export.
2. Feature flags stricts entre `draft` et `client-ready`.

## 6) UI (hiérarchie visuelle / design)
Constats
- Direction visuelle premium cohérente (palette or/brun/vert, cartes KPI, callouts).
- Densité parfois trop élevée (beaucoup de tableaux + callouts sur mêmes pages).

Risque
- Lecture difficile sur PDF imprimé long.

Recommandations
1. Réduire densité section “tax/risk”.
2. Introduire “summary strip” fixe par section (3 chiffres max).

## 7) Présentation / formatage
Constats
- Formatage monétaire majoritairement correct (`K$`, `M$`).
- Cas extrêmes mal gérés (`1$`, `2$`) pour des contextes succession HNW/couple.

Risque
- Le formatage masque potentiellement des erreurs d’unité/arrondi.

Recommandations
1. Interdire affichage `$1`/`$2` sur blocs patrimoniaux (min display thresholds).
2. Règles d’affichage par ordre de grandeur (>=1M -> `M$`, etc.).

## 8) Accessibilité & localisation
Constats
- Présence d’attributs `role="img"` sur certains SVG (positif).
- Encodage texte cassé dans les EN (mojibake):
  - Exemples visibles dans titres/noms/labels (`FranÃ§ois`, `Â·`, etc.).
  - Voir fichiers EN, ex: [young_accum_en.html](/C:/Users/tredh/OneDrive/Documents/GitHub/buildfi/report/test-output/young_accum_en.html):1
- Mélange EN + termes FR (`REER/RRSP`, `CELI/TFSA`) non harmonisé.

Risque
- Perception qualité faible, surtout sur rapport premium.

Recommandations
1. Corriger pipeline UTF-8 de bout en bout (no transcoding legacy).
2. Définir glossaire langue cible (EN pur ou bilingue assumé).

## 9) Robustesse technique (export/print)
Constats
- Bon effort print CSS (`@media print`, page breaks).
- HTML minifié en une ligne: débogage difficile et audit manuel coûteux.

Risque
- Diagnostic lent en incident prod.

Recommandations
1. Conserver artefact “pretty debug HTML” en staging.
2. Ajouter “build validation report” avant export client.

## 10) Crédibilité / conformité / confiance
Constats
- Disclaimers présents sur 10/10 (positif).
- Mais contradictions numériques annulent une partie de la valeur conformité.
- Branding non unifié (`Bilan 360` vs `Laboratory`) sur mêmes familles de rapports.

Risque
- Impact commercial et juridique (conseiller ne peut pas défendre le document).

Recommandations
1. Mettre un “quality gate” bloquant (data consistency + placeholders + encoding).
2. Unifier naming produit/tier sur toutes variantes EN.

---

## Matrice des anomalies par rapport (EN)

Légende:
- `EstateTiny`: valeurs succession absurdes (ordre $1/$2)
- `InitWR_100`: KPI initial withdrawal rate figé à 100%
- `AI_Placeholder`: texte temporaire visible
- `Mojibake`: encodage cassé détecté

| Fichier | EstateTiny | InitWR_100 | AI_Placeholder | Mojibake | Notes |
|---|---:|---:|---:|---:|---|
| ccpc_owner_en | Non | Oui | Non | Oui | Cohérence AI/KPI à vérifier succession |
| couple_transition_en | **Oui** | Oui | Non | Oui | **Critique**: succession à `$1/$2` |
| debt_young_en | Non | Oui | Non | Oui | Qualité générale correcte hors KPI WR |
| fire_seeker_en | Non | Oui | Non | Oui | Cohérence globale moyenne |
| hnw_couple_en | Non | Oui | **Oui** | Oui | **Critique**: meltdown incohérent + placeholder |
| low_income_gis_en | Non | Oui | Non | Oui | Structure courte et claire |
| real_estate_en | Non | Oui | Non | Oui | Très dense (14 tables), surcharge possible |
| retiree_decum_en | Non | Non | Non | Oui | Init WR non affiché / valeur absente |
| rsu_tech_en | Non | Oui | Non | Oui | Bonne spécialisation RSU, checks data requis |
| young_accum_en | Non | Oui | Non | Oui | **Critique**: succession KPI vs texte AI divergent |

---

## Top Problèmes Prioritaires (ordre d’exécution)

P0 (bloquants release)
1. Corriger `Init. WR` (calcul + mapping affichage).
2. Corriger bug succession sur `couple_transition_en` (`$1/$2`).
3. Supprimer placeholders AI en export client.
4. Corriger encodage UTF-8 (mojibake).

P1 (fiabilité)
1. Aligner narration AI avec KPI (single source de chiffres).
2. Ajouter tests de cohérence intra-section.
3. Unifier branding/tier naming.

P2 (qualité perçue)
1. Réduire densité des sections les plus lourdes.
2. Harmoniser vocabulaire EN.
3. Ajouter indice de confiance par insight AI.

---

## Recommandations de mise en oeuvre (pratiques)

1. Quality Gate pré-export (automatique)
- `no_placeholder`
- `no_mojibake`
- `kpi_range_checks`
- `narrative_numeric_alignment`
- `section_presence_by_profile`

2. Tests à ajouter
- test `init_wr_not_constant_100`
- test `estate_values_min_threshold`
- test `meltdown_sign_consistency` (si final > initial, reduction ne peut être négative)
- test `ai_vs_kpi_value_match` (tolérance configurable)

3. Monitoring
- Reporter JSON par build avec score qualité.
- Bloquer sortie PDF si score < seuil.

---

## Conclusion
Les 10 rapports EN montrent une base UI/UX solide, mais des défauts critiques de fiabilité data/content empêchent une diffusion client sans correctifs.  
Le bon plan est: **stabiliser les chiffres et l’encodage d’abord**, puis optimiser la narration AI et la densité visuelle.

