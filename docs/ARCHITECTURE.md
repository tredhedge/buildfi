# ARCHITECTURE.md
> Graphe de dépendances complet de l'infrastructure BuildFi. Consulter AVANT de modifier un composant.
> Mis à jour: 2026-03-09 — v6 (pivot 3 produits: Bilan Annuel gratuit, Bilan Pro $19.99, Laboratoire $49.99)
> Statut : ✅ existe | 🔨 à construire | ⚠️ bloqué | 📋 planifié | ❌ DEPRECATED

> **⚠️ PIVOT 2026-03-09: 4 tiers → 3 produits. Voir docs/PLAN-PIVOT.md pour le plan d'exécution.**

---

## COMMENT UTILISER CE DOCUMENT

**Claude Code :** Avant de modifier un composant, chercher son ID. Lire §2 "Reçoit de" et "Envoie vers." Si 5+ connexions → tester TOUTES les dépendances.

---

## 1. COMPOSANTS PAR COUCHE

### A. Client-Facing — Pages

| ID | Composant | Détails | Produit | Statut |
|----|-----------|---------|---------|--------|
| landing | Landing Page | buildfi.ca · 3 produits · logo SVG | All | ✅ |
| bilan_annuel | Bilan Annuel hub | App/outils/bilan-annuel/page.tsx · Net worth, projection 5 ans, snapshots, what-if | All | 🔨 |
| landing_bilan_pro | Landing Bilan Pro | bilan-pro.html · Hero + features + FAQ | Bilan Pro | 🔨 |
| quiz_ess | Quiz Essentiel (DEPRECATED) | Redirects to BA or Bilan Pro | — | ❌ DEPRECATED |
| quiz_inter | Quiz Bilan Pro (accum) | 80+ champs · 8 étapes · UX immersive | Bilan Pro | ✅ (needs routing update) |
| quiz_decum | Quiz Bilan Pro (décaissement) | 13 écrans · thin client · validateStep · trust badges | Bilan Pro | ✅ (needs routing update) |
| quiz_expert | Quiz Laboratoire | Inter + bloc H · ~20 champs | Laboratoire | ✅ |
| simulateur | Simulateur Laboratoire | Illimité · 3 workflows · déterministe + MC async | Laboratoire | ✅ |
| merci | Page /merci | Tier-aware steps · referral · tools · upsell · attribution | All | ✅ |
| portail | Portail Laboratoire | Dashboard · profils · crédits · historique · exports | Laboratoire | ✅ |
| page_vente_expert | Landing Laboratoire | Hero · workflows · features · pricing · FAQ | Laboratoire | ✅ |
| simul_decum | Simulateur Décaissement | URL pre-fill · standalone interactive tool | Bilan Pro | ✅ |
| bilan_html | bilan.html (DEPRECATED) | Redirects to landing_bilan_pro | — | ❌ DEPRECATED |
| bilan_360_html | bilan-360.html (DEPRECATED) | Redirects to landing_bilan_pro | — | ❌ DEPRECATED |
| horizon_html | horizon.html (DEPRECATED) | Redirects to landing_bilan_pro | — | ❌ DEPRECATED |
| debt_tool | Outil Dettes | Bonus · 6 tabs · 1,863 lignes · 200/200 tests · FINAL | All | ✅ |
| page_feedback | Page /feedback/{token} | Questions segmentées par tier | All | 🔨 |
| page_changelog | Page /mises-a-jour | Changelog public · constantes · features | All | 🔨 |
| page_blog | Blog / Articles | Héberge articles SEO | All | 📋 Phase 3 |
| page_404 | Page 404 | Ton chaleureux · BuildFi branding | All | 🔨 |
| page_500 | Page 500 | Ton chaleureux · retry | All | 🔨 |

### B. Client-Facing — Contenu et Assets

| ID | Composant | Détails | Produit | Statut |
|----|-----------|---------|---------|--------|
| guide_101 | Guide "Les bases de vos finances" | 13p PDF · bonus Bilan Pro | Bilan Pro | ✅ |
| guide_201 | Guide "Optimiser votre retraite" | 19p PDF · bonus Laboratoire | Laboratoire | ✅ |
| articles_seo | Articles SEO | 10 FR + 10 EN · voix BuildFi | All | 📋 Phase 3 |
| logo_system | Logo BuildFi | logo.js · logo-light.svg · logo-dark.svg · stacking blocks | All | ✅ |

### C. Legal Pages

| ID | Composant | Détails | Produit | Statut |
|----|-----------|---------|---------|--------|
| cgu | Page /conditions | CGU · usage personnel · remboursement · licence foyer · referral | All | 🔨 |
| privacy | Page /confidentialite | LPRPDE + Loi 25 · données · rétention · export · suppression | All | 🔨 |
| amf_avis | Page /avis-legal | Disclaimer AMF complet | All | 🔨 |

### D. Payments & Commerce

| ID | Composant | Détails | Produit | Statut |
|----|-----------|---------|---------|--------|
| stripe | Stripe Checkout | $19.99 Bilan Pro / $49.99 Laboratoire / $29.99 Lab renewal · coupons LAUNCH-BP/LAUNCH-LAB/SECOND50/REFERRAL15 | All | ✅ (needs price update) |
| stripe_old | Stripe ancien pricing (DEPRECATED) | $29/$59/$59/$129 · coupons LAUNCH50 | — | ❌ DEPRECATED |
| webhook | Webhook Stripe | /api/webhook · checkout + subscription events | All | ✅ |
| upgrade | Upgrade Path | Bilan Pro → Laboratoire (crédit $19.99) | BP→Lab | 🔨 |
| referral | Programme Referral | 50% off référent · 15% off référé · paliers 1/3/5 | All | 🔨 |
| second50 | 2e Rapport 50% | Coupon SECOND50 · 90j · débloqué par feedback | Bilan Pro | 🔨 |
| launch_bp | Coupon LAUNCH-BP | 100% off Bilan Pro · limite 50 utilisations | Bilan Pro | 🔨 |
| launch_lab | Coupon LAUNCH-LAB | 50% off Laboratoire · limite 50 utilisations | Laboratoire | 🔨 |

### E. Computation Engine

| ID | Composant | Détails | Produit | Statut |
|----|-----------|---------|---------|--------|
| mc_engine | Moteur Monte Carlo | 5,000 sims · ~2.3s · 190 params · 38 exports · 453 tests | All | ✅ |
| tax_engine | Moteur Fiscal | 13 provinces · 173 constantes · parité vérifiée | All | ✅ |
| optimizer | Optimiseur | 8 axes · screening 1K + full MC 5K · optimizeDecum() | Laboratoire | ✅ engine, 🔨 API |
| ai_narration | AI Narration | Claude Sonnet · 12 slots JSON · DerivedProfile · fallback {} | All | ✅ |
| ai_profile | DerivedProfile | anxiety, discipline, literacy, friction, theme · ai-profile.ts | All | ✅ |
| ai_serializer | Serializer Adaptatif | _serializeForAI(tier, results, profile) · sections conditionnelles | All | 🔨 |
| amf_lint | Lint AMF | 3 couches · build + runtime + design · ai-constants.ts | All | ✅ partiel, 🔨 CI/CD |
| quiz_translator | translateToMC() | Quiz answers → 190 MC params · server-side (Inter/Decum/Expert) | All | ✅ |
| quiz_translator_decum | translateDecumToMC() | Decum quiz → MC params · continuous QPP factor · GK flexibility | Bilan Pro | ✅ |
| ai_prompt_decum | buildAIPromptDecum() | 12 slots · DerivedProfile · 9-combo voice · 4 arcs · 7 worry patterns | Bilan Pro | ✅ |
| report_shared | Shared Report Helpers | grade, color, formatting, probTranslation · report-shared.ts | All | ✅ |
| display_utils | Display Formatting | Normalized display values · display-utils.ts | All | ✅ |
| project_5years | Projection déterministe 5 ans | Client-side · net worth · snapshots · what-if | BA | 🔨 |
| test_suite | Suite de Tests | 453 MC + 200 debt + 685 Inter + 87 Expert + 103 S3 + 91 S10 + 91 shared + 135 fiscal = 1,845 tests | All | ✅ |

### F. Delivery & Reports

| ID | Composant | Détails | Produit | Statut |
|----|-----------|---------|---------|--------|
| report_ess | Rapport Essentiel (DEPRECATED) | v6 · 8 sections · pipeline kept for existing reports | — | ❌ DEPRECATED |
| report_inter | Rapport Bilan Pro (accum) | 16 sections · couple · immo · fiscal | Bilan Pro | ✅ |
| report_decum | Rapport Bilan Pro (décaissement) | 13 sections · SVG donut · 6 MC runs · 12 AI slots | Bilan Pro | ✅ |
| report_expert | Rapport Laboratoire | 12-25 sections · adaptatif par profil | Laboratoire | 🔨 |
| resume_1p | Résumé 1 Page | Illimité · PNG · print-friendly | Laboratoire | 🔨 |
| bilan_input | Bilan Annuel — Input | 7 champs (revenus, épargne, dettes, immo, objectifs, frais, conjoint) | Laboratoire | 🔨 |
| bilan_processing | Bilan Annuel — Processing | MC annuel · comparaison multi-année · delta scores · attributions | Laboratoire | 🔨 |
| bilan_output | Bilan Annuel — Output | 9 pages : portrait, delta, fiscal, scénarios, levier #1, comparaison, conjoint, FAQ, attestation | Laboratoire | 🔨 |
| print_export | Export Impression | window.print() · version imprimable · fallback SVG N&B | All | 🔨 |

### G. Email Templates (15 total)

| ID | Composant | Trigger | Statut |
|----|-----------|---------|--------|
| email_livraison_ess | Livraison Essentiel (DEPRECATED) | — | ❌ DEPRECATED |
| email_livraison_bp_accum | Livraison Bilan Pro accum (grade + rapport + bonus + 2e rapport) | Webhook post-achat | ✅ (rename from inter) |
| email_livraison_bp_decum | Livraison Bilan Pro décaissement (grade + rapport + simulateur + guide) | Webhook post-achat | ✅ (rename from decum) |
| email_livraison_lab | Livraison Laboratoire (+ magic link) | Webhook post-achat | ✅ (rename from expert) |
| email_magic_link | Magic Link connexion Laboratoire | Demande auth | ✅ |
| email_feedback_j3 | Feedback J+3 (étoiles + NPS + coupon 50%) | Cron J+3 | ✅ |
| email_testimonial_j7 | Témoignage J+7 (nommé/anonyme/non) | Cron J+7 si qualifié | ✅ |
| email_reminder_j14 | Rappel J+14 (dernier rappel feedback) | Cron J+14 | ✅ |
| email_2e_rapport | Offre 2e Rapport 50% | Email livraison + /merci CTA | ⏳ CTA exists, dedicated email needed |
| email_referral_notif | Referral Notification (conversion + récompense) | Webhook conversion | 🔨 |
| email_renouvellement | Renouvellement J-30/J-7/J-0/J+3 cycle | Cron renewal | ✅ |
| email_anniversaire | Anniversaire 6 mois (recalculation) | Cron anniversary | ✅ |
| email_ba_reminder | Rappel BA trimestriel/annuel | Cron | 🔨 |
| email_pre_suppression | Pré-suppression J-30 (téléchargez profil) | Cron J-30 post-expiry | 🔨 |
| email_bilan_dec | Bilan Décembre (préparez vos chiffres) | Cron 1er déc | 🔨 |
| email_bilan_jan | Bilan Janvier (votre bilan est prêt) | Cron 2 jan | 🔨 |
| email_bilan_fev | Bilan Février (3 scénarios fiscaliste) | Cron 1er fév | 🔨 |

### H. Retention & Growth

| ID | Composant | Détails | Statut |
|----|-----------|---------|--------|
| feedback | Pipeline Feedback | J+0 étoiles · J+3 email · NPS · page complète | ✅ (cron + email-feedback.ts) |
| testimonials | Témoignages Auto | J+7 si qualifié → consent → landing | ✅ (email trigger), 🔨 (landing display) |
| ab_testing | A/B Testing PostHog | Feature flags · 4 expériences · guide autonomie | 🔨 |
| cron_feedback | Crons Feedback | J+3, J+7, J+14 | ✅ api/cron/feedback |
| cron_remind | Crons Rappels Laboratoire | 6 mois anniversaire · renouvellement J-30/J-7/J-0/J+3 | ✅ api/cron/renewal + anniversary |
| cron_bilan | Crons Bilan Annuel | Décembre · janvier · février | 🔨 (trigger missing) |
| veille_regl | Veille Réglementaire | RSS → SEO + bannière in-app + changelog | 📋 Phase 3 |

### I. Infrastructure

| ID | Composant | Détails | Statut |
|----|-----------|---------|--------|
| vercel | Vercel | Hosting · serverless · crons · Next.js 16 | ✅ |
| kv | Vercel KV | Profils · feedback · referral · changelog · alerts | ✅ |
| blob | Vercel Blob | Rapports HTML · store "buildfi-blob" | ✅ PUBLIC |
| resend | Resend | Emails · 3,000/mois free · domain VERIFIED | ✅ |
| posthog | PostHog | Analytics · A/B · feature flags · 1M events | ✅ |
| cloudflare | Cloudflare DNS | A · CNAME · SPF · DKIM · DMARC · MX | ✅ |
| github | GitHub | tredhedge/buildfi · privé · main | ✅ |
| anthropic_api | Anthropic API | Claude Sonnet · narration | ✅ key in Vercel |
| fb_pixel | Facebook Pixel | Conversion tracking pubs | 📋 pas configuré |

### J. Admin & Monitoring

| ID | Composant | Détails | Statut |
|----|-----------|---------|--------|
| health_check | /api/health | Teste KV, MC, Anthropic, Resend, Blob | ✅ |
| admin_dashboard | Dashboard Admin | Health · profiles · email stats · activity log | ✅ app/admin/page.tsx (420L) |
| robots_txt | robots.txt | Disallow /outils/ | ✅ |

---

## 2. GRAPHE DE DÉPENDANCES

### Client Flow (3 produits)
```
landing → bilan_annuel (GRATUIT, CTA principal)
landing → landing_bilan_pro → quiz_inter ($19.99 accum) OU quiz_decum ($19.99 décaissement)
landing → landing_lab → quiz_expert ($49.99)

bilan_annuel → "cap 5 ans" → landing_bilan_pro (upsell naturel)
bilan_annuel → quiz_inter/quiz_decum (pré-rempli depuis localStorage)
bilan_annuel → quiz_expert (pré-rempli depuis localStorage)

quiz_inter, quiz_decum → stripe (Bilan Pro $19.99) → webhook
quiz_expert → stripe (Laboratoire $49.99) → webhook

webhook [Bilan Pro accum] → quiz_translator_inter → mc_engine → ai_prompt_inter → report_inter
webhook [Bilan Pro decum] → quiz_translator_decum → mc_engine (6 runs) → ai_prompt_decum → report_decum
webhook [Laboratoire] → handleExpertPurchase → kv (profile) → magic_link → portail

report_* → blob → resend → client inbox
report_* ← report_shared (grade, color, formatting)
```

### Bilan Annuel (hub gratuit)
```
bilan_annuel → localStorage (save/load)
bilan_annuel → project5Years() (client-side déterministe)
bilan_annuel → /api/ba-preview (MC simplifié, P10/P90) [P1]
bilan_annuel → /api/ba-reminder/subscribe (email + fréquence → KV) [P1]
bilan_annuel → JSON export/import (backup cross-device)
bilan_annuel → landing_bilan_pro (CTA cap 5 ans)
bilan_annuel → landing_lab (CTA scénarios illimités)
```

### Laboratoire Ecosystem
```
simulateur_lab → mc_engine (recalcul async /api/simulate)
simulateur_lab → optimizer → mc_engine (/api/optimize)
simulateur_lab → portail_lab (historique, crédits)
simulateur_lab ← bilan_annuel (pré-rempli localStorage)
portail_lab ↔ kv (profils, crédits, changelog)
portail_lab → bilan_annuel (lien "Mon Bilan Annuel")
portail_lab → /api/export (rapport AI, décrémente quota)
portail_lab → /api/bilan-annuel (check-up janvier, hors quota)
```

### Post-achat et livraison
```
merci ← webhook (redirect)
merci → referral (lien unique), second50 (offre 2e rapport)
email_livraison_bp_accum ← webhook + blob
email_livraison_bp_accum → guide_101, debt_tool (bonus), second50, upgrade (upsell Laboratoire)
email_livraison_bp_decum → guide_101, simul_decum (bonus), second50, upgrade (upsell Laboratoire)
email_livraison_lab → guide_201, portail (magic link)
```

### Boucle feedback → témoignages → acquisition
```
report_* → feedback (bloc étoiles J+0) → kv
cron_feedback → resend (J+3 email étoiles + NPS)
feedback → testimonials (si rating ≥4 + NPS Oui)
cron_feedback → resend (J+7 email témoignage si qualifié)
testimonials → landing (social proof)
```

### Referral
```
merci → referral → kv (referral:{code})
report_* → referral (bouton "Partager")
ami → landing → quiz_* → stripe (coupon REFERRAL15)
webhook → kv (incrémente conversions) → resend (notifie référent)
```

### 2e rapport
```
feedback → second50 (débloque coupon)
email_livraison_* → second50 (offre mentionnée)
second50 → stripe (coupon SECOND50)
```

### Upgrade
```
report_inter → upgrade (upsell Laboratoire dans rapport)
report_decum → upgrade (upsell Laboratoire dans rapport)
upgrade → stripe (checkout avec crédit $19.99)
```

### Bilan Annuel (janvier — Laboratoire)
```
cron_bilan → email_bilan_dec (décembre: préparez vos chiffres)
cron_bilan → email_bilan_jan (janvier: bilan prêt)
client → portail → bilan_input ← kv (profil existant)
bilan_input → bilan_processing → mc_engine → tax_engine ← constantes
bilan_processing ← kv (historique bilans précédents → deltas)
bilan_processing → bilan_output → blob → resend → client
cron_bilan → email_bilan_fev (février: 3 scénarios)
```

### Veille réglementaire
```
veille_regl → constantes (MAJ valeurs) → tax_engine
veille_regl → articles_seo → page_blog
veille_regl → portail (bannière in-app)
veille_regl → page_changelog
```

---

## 3. COMPOSANTS CRITIQUES (5+ connexions)

| Composant | Connexions | Si cassé |
|-----------|-----------|----------|
| **mc_engine** | 12 | TOUT cassé. Aucun rapport, aucun calcul, aucun bilan. |
| **resend** | 9 | Pas d'emails. Rapports, feedback, renouvellement, bilan — rien. |
| **webhook** | 8 | Pipeline E2E cassé. Pas de rapport après paiement. |
| **stripe** | 8 | Pas de revenus. Pas de coupons/upgrades. |
| **kv** | 8 | Profils, feedback, referral, portail — tout perdu. |
| **bilan_annuel** | ~5 | Hub gratuit inaccessible. Upsell naturel cassé. Pré-remplissage quiz perdu. |
| **feedback** | 7 | Pas de NPS, témoignages, coupon 50%. |
| **ai_narration** | 7 | Rapports sans narration (fallback {}). |
| **blob** | 6 | Rapports inaccessibles. Liens email = 404. |
| **simulateur** | 6 | Laboratoire inutilisable. |
| **report_inter** | 6 | Rapport Bilan Pro accum cassé. Upsell + feedback cassés. |
| **merci** | 5 | Post-paiement dégradé. Pas de referral initial. |
| **portail** | 5 | Laboratoire sans dashboard. |

---

## 4. KV SCHEMA

| Clé | Contenu | Créé par | Lu par |
|-----|---------|----------|--------|
| `expert:{email}` | Profil, tier, crédits, expiry, changelog, referralCode | webhook | portail, simulateur, crons, bilan_input |
| `feedback:{email}` | rating, nps, text, tier, date, source, testimonial_consent | feedback API | second50, testimonials, cron_feedback |
| `referral:{code}` | referrer_email, uses, conversions | webhook | referral tracking, stripe coupons |
| `report:{id}` | Metadata (version, constantes, date, tier, sections) | webhook / portail | portail historique |
| `bilan:{email}:{year}` | Résultats bilan annuel (scores, deltas) | bilan_processing | bilan_output, comparaison |
| `ba_reminder:{email}` | Fréquence rappel BA (trimestriel/annuel) + prochaine date | ba-reminder/subscribe | cron ba-reminder |
| `alerts:{id}` | Alertes admin (feedback ≤2, erreurs) | feedback, health | admin_dashboard |

---

## 5. CRONS VERCEL (12 total)

| Cron | Fréquence | Action |
|------|-----------|--------|
| Feedback J+3 | Quotidien | Rapports 3j sans feedback → email |
| Témoignage J+7 | Quotidien | Rating ≥4 + NPS Oui sans consent → email |
| Rappel J+14 | Quotidien | Rapports 14j sans feedback → dernier rappel |
| Anniversaire 6 mois | Quotidien | Dernière date calcul > 6 mois → email |
| Renouvellement J-30 | Quotidien | Expiry < 30j → email |
| Renouvellement J-7 | Quotidien | Expiry < 7j → email |
| Pré-suppression | Quotidien | Expiré > 11 mois → email téléchargement |
| Rappel BA | Trimestriel/Annuel | Abonnés BA → email "Mettez à jour votre Bilan Annuel" |
| Bilan décembre | Annuel (1 déc) | Laboratoire → email "Préparez vos chiffres" |
| Bilan janvier | Annuel (2 jan) | Laboratoire → email "Bilan prêt" |
| Bilan février | Annuel (1 fév) | Laboratoire ayant fait bilan → email "3 scénarios" |
| Veille réglementaire | Hebdomadaire | RSS → keyword match → flag admin |
| Health check | 5 min | /api/health → teste tous services |

---

## 6. ROUTES API (15+ total)

| Route | Méthode | Auth | Action |
|-------|---------|------|--------|
| /api/checkout | POST | Non | Session Stripe Bilan Pro / Laboratoire |
| /api/checkout-export-addon | POST | Token | Session Stripe $14.99 |
| /api/checkout-second | POST | Token | Session Stripe + coupon SECOND50 |
| /api/webhook | POST | Stripe sig | MC → AI → Blob → Email → KV |
| /api/auth/verify | GET | Token | Vérifie token → profil |
| /api/auth/magic-link | POST | Email | Envoie magic link |
| /api/simulate | POST | Token | MC 5K → JSON |
| /api/optimize | POST | Token | Optimizer 8 axes → JSON |
| /api/compare | POST | Token | Compare 2 scénarios → deltas |
| /api/feedback | GET | Token unique | Enregistre rating/NPS |
| /api/referral/generate | POST | Token | Génère code referral |
| /api/export-json | GET | Token | Download profil JSON |
| /api/delete-account | POST | Token | Marque suppression → purge 30j |
| /api/ba-preview | POST | Non | MC simplifié pour BA (P10/P90) |
| /api/ba-reminder/subscribe | POST | Non | Abonnement rappels BA → KV |
| /api/health | GET | Non | Health check services |
| /api/ai-narrate | POST | Dev only | Test AI standalone |

---

## 7. STATUT GLOBAL

| Statut | Count | Composants |
|--------|-------|-----------|
| ✅ Existe | 42+ | mc_engine, tax_engine, quiz_inter, quiz_decum, quiz_expert, report_inter, report_decum, report_shared, display_utils, landing, merci, simulateur, portail, page_vente_expert, debt_tool, simul_decum, guide_101, guide_201, logo_system, quiz_translator (Inter/Decum/Expert), ai_profile, ai_prompt_decum, test_suite, email_livraison_bp_accum/bp_decum/lab, email_magic_link, email_feedback (J+3/J+7/J+14), email_renouvellement, email_anniversaire, vercel, kv, blob, resend, posthog, cloudflare, github, anthropic_api, robots_txt, stripe, webhook, health_check, admin_dashboard, cron_feedback, cron_remind, amf_lint (partiel) |
| ❌ DEPRECATED | 5 | quiz_ess, report_ess, email_livraison_ess, bilan.html, bilan-360.html, horizon.html, stripe ancien pricing |
| ⚠️ Bloqué | 0 | ~~blob, resend, anthropic_api~~ — all resolved |
| 🔨 À construire | ~18 | bilan_annuel, landing_bilan_pro, project_5years, pages légales (exist but 🔨), upgrades, A/B, email referral notif, email ba_reminder, email pré-suppression, bilan annuel cron trigger + 3 emails, print export, page_feedback, page_changelog, page_404, page_500, ai_serializer, launch coupons |
| 📋 Planifié (Phase 3+) | 4 | articles_seo, page_blog, veille_regl, fb_pixel |

### Bloquants immédiats (avant lancement pivot)
1. **bilan_annuel** → construire le hub gratuit (CTA principal du nouveau funnel)
2. **landing_bilan_pro** → page de vente Bilan Pro $19.99
3. **Stripe prices** → créer nouveaux prix $19.99 / $49.99 / $29.99 renewal
4. **Coupons** → LAUNCH-BP (100% off, 50 limit) + LAUNCH-LAB (50% off, 50 limit)
5. **Routing** → quiz_inter + quiz_decum doivent router vers Bilan Pro checkout

---

*67+ composants (dont ~5 deprecated) · 90+ connexions · 13 crons · 17 routes API · 15 email templates · 7 clés KV.*
