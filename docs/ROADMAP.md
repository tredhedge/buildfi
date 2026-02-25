# ROADMAP.md
> Phases du projet, sous-étapes, statuts, critères go/no-go.
> Mis à jour: 2026-02-25

## VUE D'ENSEMBLE

| Phase | Titre | Statut | Durée |
|-------|-------|--------|-------|
| P0 | Infrastructure Web | ✅ Complétée (P0.7 en attente) | 1 sem |
| P1 | Quiz + Rapport Essentiel | 🔄 En cours | 2–3 sem |
| P2 | Rapport Intermédiaire + Upsell | ⏳ Planifiée | 2–3 sem |
| P3 | Marketing + Légal | ⏳ Planifiée | 3–4 sem |
| P4 | Migration Next.js | ⏳ Future | 4–8 sem |
| P5 | Scale + B2B | ⏳ Future | — |

**Principe directeur**: Vendre d'abord, migrer ensuite.

---

## P0 — Infrastructure Web ✅

| Étape | Statut | Notes |
|-------|--------|-------|
| P0.1 Domaine + DNS Cloudflare | ✅ | |
| P0.2 Vercel hébergement | ✅ | |
| P0.3 GitHub repo | ✅ | |
| P0.4 Stripe (3 produits) | ✅ | Mode TEST |
| P0.5 Resend emails | ✅ | DNS pending |
| P0.6 PostHog analytics | ✅ | |
| P0.7 Pages légales | ⏸ | Besoin nom légal + email contact |

---

## P1 — Quiz + Rapport Essentiel 🔄

**Go/no-go**: 5+ ventes organiques + zéro bug bloquant + langage AMF validé.

| Étape | Statut | Notes |
|-------|--------|-------|
| P1.1 Quiz 7 écrans | ✅ | Dans quiz-essentiel.html |
| P1.2 Smart defaults translator | ✅ | Dans quiz-essentiel.html |
| P1.3 Rapport Essentiel | ✅ | 8 sections, 4 SVG, AI on-demand |
| P1.4 Paiement Stripe + livraison email | ❌ | Stripe webhook + Resend |
| P1.5 Landing page + site web | ❌ | Hero, pricing, FAQ, légales |
| P1.6 Audit qualité R19-R20 | ❌ | Obligatoire avant lancement |
| P1.7 Soft launch organique | ❌ | Reddit, LinkedIn, cercle privé |

---

## P2 — Rapport Intermédiaire + Upsell ⏳

**Go/no-go**: 30+ ventes Essentiel + taux upsell > 15%.

| Étape | Statut | Notes |
|-------|--------|-------|
| P2.1 Questionnaire étendu | ❌ | |
| P2.2 Sections PDF additionnelles | ❌ | quiz-intermediaire.html existe — intégration à faire |
| P2.3 Upgrade hooks dans Essentiel | ❌ | Upsell avec chiffres de l'utilisateur |
| P2.4 Audit qualité R21 | ❌ | Chemins immo + CCPC avec CPA |
| P2.5 Score résilience 4 jauges | ❌ | |
| P2.6 Thermomètre risque séquence | ❌ | |

---

## P3 — Marketing + Légal ⏳

**Go/no-go**: 30+ ventes tous canaux + CAC < $50 sur au moins 1 canal.

| Étape | Statut |
|-------|--------|
| P3.1 SEO + contenu FR | ❌ |
| P3.2 Reddit/LinkedIn organique | ❌ |
| P3.3 Email nurture séquence | ❌ |
| P3.4 Facebook/Instagram ads ($500 test) | ❌ |
| P3.5 Opinion AMF formelle ($500–800) | ❌ |
| P3.6 Programme de référence | ❌ |

---

## P4 — Migration Next.js ⏳

**Prérequis**: P3 validé + revenus pour investir le temps.

| Étape | Notes |
|-------|-------|
| P4.1 Extraction moteur → TypeScript | Moteur partagé entre les 3 fichiers actuels |
| P4.2 Composants React modulaires | Feature par feature, pas de big bang |
| P4.3 Tests UI automatisés | Playwright/Cypress |
| P4.4 CI/CD GitHub Actions | |
| P4.5 API routes server-side | Moteur protégé, AI automatique |

---

## P5 — Scale ⏳

- Bilan Annuel (différenciateur vs Optiml.ca)
- B2B tier planificateurs financiers
- Expansion Ontario (EN-first)
- Partenariat Jeune Retraité / influenceurs FIRE QC

---

## DÉCISIONS EN ATTENTE

| ID | Décision | Échéance |
|----|----------|----------|
| DA-001 | Opinion AMF formelle ($500–800) | P3.5 |
| DA-002 | Plateforme pub principale (FB/IG recommandé) | P3.4 |
| DA-003 | Structure programme référence | Post-lancement |
| DA-004 | Nouveau logo buildfi.ca | Avant P1.5 |
