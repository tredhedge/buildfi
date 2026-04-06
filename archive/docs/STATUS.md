# STATUS.md
> Etat actuel du projet BuildFi. Lire au debut de chaque session.
> Mis a jour: 2026-03-13 - v23

## PHASE ACTUELLE
Execution produit active (post-realignment):
1. ~~Bilan (9.99)~~ **DONE** — v7 shipped 2026-03-13
2. **Bilan 360 (19.99, merge accumulation + decumulation)** ← ACTIVE
3. Laboratoire (49.99 + renewal annuel)

## PRIORITE IMMEDIATE
Bilan 360 quality uplift — porter les ameliorations du Bilan v7 aux rapports Inter et Decum.

Bilan v7 livre (2026-03-13):
- Opus 16-slot AI narration (voice matrix, narrative arcs, thread classification)
- Smart what-if engine (stress-test vs improvement branching)
- 11 visual/content/compliance fixes
- AMF SAFE_DISCLAIMER_PATTERNS whitelist
- Grade-aware fallbacks, snapshot table improvements

Objectif de la phase en cours:
- Porter les patterns Bilan v7 au Bilan 360 (Inter + Decum streams).
- Implementer le routing questionnaire accumulation/decumulation.
- Verrouiller la coherence visuelle et structurelle entre les 3 rapports.

## PRODUIT CANONIQUE (SOURCE OF TRUTH)
| Produit | Prix | Description |
|---|---|---|
| Bilan | 9.99 CAD one-time | Rapport clair pour profils simples. |
| Bilan 360 | 19.99 CAD one-time | Produit unique avec 2 streams: accumulation et decumulation. |
| Laboratoire | 49.99 CAD one-time | Simulateur avance + credits rapports AI. |
| Renouvellement Laboratoire | 19.99 ou 24.99 CAD/an (a trancher) | Renouvellement annuel des capacites Lab. |

## DECISIONS OUVERTES
- Prix renewal Laboratoire final: 19.99 vs 24.99.
- Quota final de rapports AI Lab: 5 a 10/an.

## CE QUI EST DEPRECATED
Les references suivantes sont obsoletes et ne doivent plus guider les decisions produit:
- BA gratuit comme produit d'entree principal.
- "Bilan Pro" comme nom de produit principal.
- Funnel base sur upsell obligatoire BA -> Pro -> Lab.

## PLAN D'EXECUTION ACTIF
Reference: `docs/PLAN-PIVOT.md` (version realignee 2026-03-12)

Phases:
1. Bilan quality uplift (report + AI)
2. Bilan 360 routing + merge streams
3. Laboratoire upgrade
4. Site/copy launch pass

## REGLE QUALITE TRANSVERSALE (NOUVEAU)
Tous les rapports doivent etre coherents entre eux:
- meme logique de presentation
- meme conventions de formatage
- meme niveau de clarte
- meme discipline narrative AI

Voir le contrat detaille dans `docs/TECH-REFERENCE.md`.
