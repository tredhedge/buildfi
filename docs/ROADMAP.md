# ROADMAP.md
> Phases du projet, sous-étapes, statuts, critères go/no-go.
> Mis à jour: 2026-03-01 — v4 (P1.4 AI narration merged, report v6 polished, debt tool UX restructured, email template refactored)

## VUE D'ENSEMBLE

| Phase | Titre | Statut | Durée |
|-------|-------|--------|-------|
| P0 | Infrastructure Web | ✅ Complétée (P0.7 en attente) | 1 sem |
| P1 | Quiz + Rapport Essentiel + Landing | 🔄 En cours — near launch | 2–3 sem |
| P2 | Rapport Intermédiaire + Upsell | ⏳ Planifiée | 2–3 sem |
| P3 | Marketing + Légal | ⏳ Planifiée | 3–4 sem |
| P4 | Migration Next.js | ⏳ Future | 4–8 sem |
| P5 | Scale + B2B | ⏳ Future | — |

**Principe directeur**: Vendre d'abord, migrer ensuite.

---

## P0 — Infrastructure Web ✅

| Étape | Statut | Notes |
|-------|--------|-------|
| P0.1 Domaine + DNS Cloudflare | ✅ | buildfi.ca sur Cloudflare |
| P0.2 Vercel hébergement | ✅ | Auto-deploy main branch |
| P0.3 GitHub repo | ✅ | tredhedge/buildfi (privé) |
| P0.4 Stripe (3 produits) | ✅ | Mode TEST, Essentiel $39 CAD configuré |
| P0.5 Resend emails | ⚠️ | Clé API OK, domaine DNS FAILED — à corriger |
| P0.6 Pipeline E2E Stripe | ✅ | **VALIDÉ 2026-02-27** — Quiz→Checkout→Webhook→MC→Blob→Email |
| P0.7 Pages légales | ⏸ | Besoin nom légal + email contact |

### P0.6 — Détail du test E2E (2026-02-27)
- Checkout route: POST /api/checkout → 200, Stripe redirect fonctionne
- Test card 4242 4242 4242 4242 → paiement réussi → /merci
- Webhook: signature vérifiée, MC 5000 sims en ~2.3s
- Report HTML render + upload Vercel Blob (private store → "Forbidden" à corriger)
- Email envoyé via Resend (arrive en spam — domaine non vérifié)
- PDF désactivé (Puppeteer/@sparticuz/chromium incompatible Vercel serverless)

---

## P1 — Quiz + Rapport Essentiel + Landing 🔄

**Go/no-go**: 5+ ventes organiques + zéro bug bloquant + langage AMF validé.

| Étape | Statut | Notes |
|-------|--------|-------|
| P1.1 Quiz 7 écrans (thin client) | ✅ | 805 lignes, zero IP exposé, Stripe intégré |
| P1.2 Smart defaults translator | ✅ | translateToMC() server-side |
| P1.3 Rapport Essentiel v6 | ✅ | **v6 + 15 polish fixes** — grade ring, fan chart, TL;DR, KPI cards, donut, what-if, 5yr snapshot, tooltips, mini TOC, print theme |
| P1.4 AI narration | ✅ CODE COMPLETE | buildAIPrompt() + Anthropic call wired in webhook — needs ANTHROPIC_API_KEY in Vercel |
| P1.4a Blob store public | ❌ | Recréer store PUBLIC sur Vercel Storage |
| P1.4b Resend DNS vérifié | ❌ | DKIM/SPF sur Cloudflare à corriger |
| P1.4c Email template | ✅ | Table-based, bilingual, AMF compliant, grade card, upsell |
| P1.5 Landing page | ✅ | v9 livrée, audit AMF/BSIF complété, logo SVG |
| P1.5.1 Outil gestion de dettes (bonus) | ✅ | **UX restructured** — 1,475 lignes, 6 tabs, progressive disclosure, 200 tests |
| P1.5.2 Guide 101 "Les bases de vos finances" | ✅ | 13p PDF — bonus Essentiel |
| P1.5.3 Guide 201+301 "Optimiser votre retraite" | ✅ | 19p PDF — bonus Intermédiaire + Expert |
| P1.6 Audit qualité R19-R20 | ❌ | Obligatoire avant lancement |
| P1.7 Soft launch organique | ❌ | Reddit, LinkedIn, cercle privé |

### Prochaines actions P1 (par priorité)
1. Fix Blob public + Resend DNS → rapport accessible par lien dans l'email
2. Add ANTHROPIC_API_KEY to Vercel → test E2E with Stripe test card (AI narration live)
3. 5 psycho questions (quiz enhancement)
4. Pages légales (P0.7) — conditions, confidentialité, avis AMF
5. Audit R19-R20

---

## P2 — Rapport Intermédiaire + Upsell ⏳

**Go/no-go**: 30+ ventes Essentiel + taux upsell > 15%.

| Étape | Statut | Notes |
|-------|--------|-------|
| P2.1 Questionnaire étendu (thin client) | ❌ | 80+ fields, 8 étapes, UX immersive |
| P2.2 Sections rapport additionnelles | ❌ | |
| P2.3 Upgrade hooks dans Essentiel | ✅ | Upsell "Prochaine étape" in report v6 with dynamic triggers |
| P2.4 Audit qualité R21 | ❌ | Chemins immo + CCPC avec CPA |
| P2.5 Score résilience 4 jauges | ❌ | |
| P2.6 Thermomètre risque séquence | ❌ | |

---

## P3 — Marketing + Légal ⏳

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

**Note**: Migration partiellement avancée — engine déjà en lib/engine/index.js, routes API fonctionnelles. Reste: quiz HTML → React, tests Vitest, CI/CD.

| Étape | Notes |
|-------|-------|
| P4.1 Extraction moteur → TypeScript | Moteur déjà en lib/engine/index.js (2,426 lignes) |
| P4.2 Composants React modulaires | Feature par feature |
| P4.3 Tests UI automatisés | Playwright/Cypress |
| P4.4 CI/CD GitHub Actions | |
| P4.5 API routes server-side | ✅ Déjà fait: checkout, webhook, ai-narrate |

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
| DA-004 | Nouveau logo buildfi.ca | ✅ Résolu — SVG flame logo livré |
| DA-005 | PDF generation strategy | Puppeteer incompatible Vercel — alternatives: Gotenberg, DocRaptor, window.print() |
