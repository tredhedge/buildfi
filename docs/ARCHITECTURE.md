# ARCHITECTURE.md
> Graphe de dépendances complet de l'infrastructure BuildFi. Consulter AVANT de modifier un composant.
> Mis à jour: 2026-03-02 — v2 (audit exhaustif, 60+ composants, 80+ connexions)
> Statut : ✅ existe | 🔨 à construire | ⚠️ bloqué | 📋 planifié

---

## COMMENT UTILISER CE DOCUMENT

**Claude Code :** Avant de modifier un composant, chercher son ID. Lire §2 "Reçoit de" et "Envoie vers." Si 5+ connexions → tester TOUTES les dépendances.

---

## 1. COMPOSANTS PAR COUCHE

### A. Client-Facing — Pages

| ID | Composant | Détails | Tier | Statut |
|----|-----------|---------|------|--------|
| landing | Landing Page | buildfi.ca · v9 · logo SVG | All | ✅ |
| quiz_ess | Quiz Essentiel | 7 écrans · thin client · 805 lignes | Ess | ✅ |
| quiz_inter | Quiz Intermédiaire | 80+ champs · 8 étapes · UX immersive | Inter | 🔨 |
| quiz_expert | Quiz Expert | Inter + bloc H · ~20 champs | Expert | 🔨 |
| simulateur | Simulateur Expert | Illimité · 3 workflows · déterministe + MC async | Expert | 🔨 |
| merci | Page /merci | Skeleton loader · grade live · referral · offre 2e rapport | All | ✅ basique, 🔨 améliorée |
| portail | Portail /expert | Dashboard · profils · crédits · historique · exports | Expert | 🔨 |
| page_vente_expert | Page vente Expert | Hero · workflows · features · pricing · FAQ | Expert | 🔨 |
| debt_tool | Outil Dettes | Bonus · 6 tabs · 1,475 lignes · 200 tests | Ess+Inter | ✅ |
| page_feedback | Page /feedback/{token} | Questions segmentées par tier | All | 🔨 |
| page_changelog | Page /mises-a-jour | Changelog public · constantes · features | All | 🔨 |
| page_blog | Blog / Articles | Héberge articles SEO | All | 📋 Phase 3 |
| page_404 | Page 404 | Ton chaleureux · BuildFi branding | All | 🔨 |
| page_500 | Page 500 | Ton chaleureux · retry | All | 🔨 |

### B. Client-Facing — Contenu et Assets

| ID | Composant | Détails | Tier | Statut |
|----|-----------|---------|------|--------|
| guide_101 | Guide "Les bases de vos finances" | 13p PDF · bonus Essentiel | Ess | ✅ |
| guide_201 | Guide "Optimiser votre retraite" | 19p PDF · bonus Inter+Expert | Inter+Expert | ✅ |
| articles_seo | Articles SEO | 10 FR + 10 EN · voix BuildFi | All | 📋 Phase 3 |
| logo_system | Logo BuildFi | logo.js · logo-light.svg · logo-dark.svg · flame | All | ✅ |

### C. Legal Pages

| ID | Composant | Détails | Tier | Statut |
|----|-----------|---------|------|--------|
| cgu | Page /conditions | CGU · usage personnel · remboursement · licence foyer · referral | All | 🔨 |
| privacy | Page /confidentialite | LPRPDE + Loi 25 · données · rétention · export · suppression | All | 🔨 |
| amf_avis | Page /avis-legal | Disclaimer AMF complet | All | 🔨 |

### D. Payments & Commerce

| ID | Composant | Détails | Tier | Statut |
|----|-----------|---------|------|--------|
| stripe | Stripe Checkout | $29/$59/$129 · coupons SECOND50/REFERRAL15 | All | ✅ Ess, 🔨 reste |
| webhook | Webhook Stripe | /api/webhook · checkout + subscription events | All | ✅ Ess, 🔨 Expert |
| upgrade | Upgrade Path | Crédit Ess→Inter ($30) · Inter→Expert ($70) | All | 🔨 |
| referral | Programme Referral | 50% off référent · 15% off référé · paliers 1/3/5 | All | 🔨 |
| second50 | 2e Rapport 50% | Coupon SECOND50 · 90j · débloqué par feedback | All | 🔨 |

### E. Computation Engine

| ID | Composant | Détails | Tier | Statut |
|----|-----------|---------|------|--------|
| mc_engine | Moteur Monte Carlo | 5,000 sims · ~2.3s · 190 params · 38 exports · 436 tests | All | ✅ |
| tax_engine | Moteur Fiscal | 13 provinces · 173 constantes · parité vérifiée | All | ✅ |
| optimizer | Optimiseur | 8 axes · screening 1K + full MC 5K · optimizeDecum() | Expert | ✅ engine, 🔨 API |
| ai_narration | AI Narration | Claude Sonnet · 12 slots JSON · DerivedProfile · fallback {} | All | ✅ code, ⚠️ needs key |
| ai_profile | DerivedProfile | anxiety, discipline, literacy, friction, theme · ai-profile.ts | All | ✅ |
| ai_serializer | Serializer Adaptatif | _serializeForAI(tier, results, profile) · sections conditionnelles | All | 🔨 |
| amf_lint | Lint AMF | 3 couches · build + runtime + design · ai-constants.ts | All | ✅ partiel, 🔨 CI/CD |
| quiz_translator | translateToMC() | Quiz answers → 190 MC params · server-side | All | ✅ |
| test_suite | Suite de Tests | 436 MC + 200 debt tool = 636 tests | All | ✅ |

### F. Delivery & Reports

| ID | Composant | Détails | Tier | Statut |
|----|-----------|---------|------|--------|
| report_ess | Rapport Essentiel | v6 · 8 sections · grade ring · fan chart · AI · 1,421 lignes | Ess | ✅ |
| report_inter | Rapport Intermédiaire | 16 sections · couple · immo · fiscal | Inter | 🔨 |
| report_expert | Rapport Expert | 12-25 sections · adaptatif par profil | Expert | 🔨 |
| resume_1p | Résumé 1 Page | Illimité · PNG · print-friendly | Expert | 🔨 |
| bilan_input | Bilan Annuel — Input | 7 champs (revenus, épargne, dettes, immo, objectifs, frais, conjoint) | Expert | 🔨 |
| bilan_processing | Bilan Annuel — Processing | MC annuel · comparaison multi-année · delta scores · attributions | Expert | 🔨 |
| bilan_output | Bilan Annuel — Output | 9 pages : portrait, delta, fiscal, scénarios, levier #1, comparaison, conjoint, FAQ, attestation | Expert | 🔨 |
| print_export | Export Impression | window.print() · version imprimable · fallback SVG N&B | All | 🔨 |

### G. Email Templates (14 total)

| ID | Composant | Trigger | Statut |
|----|-----------|---------|--------|
| email_livraison_ess | Livraison Essentiel (grade + rapport + bonus + 2e rapport) | Webhook post-achat | ✅ v2 |
| email_livraison_inter | Livraison Intermédiaire | Webhook post-achat | 🔨 |
| email_livraison_expert | Livraison Expert (+ magic link) | Webhook post-achat | 🔨 |
| email_magic_link | Magic Link connexion Expert | Demande auth | 🔨 |
| email_feedback_j3 | Feedback J+3 (étoiles + NPS + coupon 50%) | Cron J+3 | 🔨 |
| email_testimonial_j7 | Témoignage J+7 (nommé/anonyme/non) | Cron J+7 si qualifié | 🔨 |
| email_2e_rapport | Offre 2e Rapport 50% | Email livraison + J+14 | 🔨 |
| email_referral_notif | Referral Notification (conversion + récompense) | Webhook conversion | 🔨 |
| email_renouvellement_j30 | Renouvellement J-30 | Cron J-30 expiry | 🔨 |
| email_renouvellement_j7 | Renouvellement J-7 (+ valeur reçue) | Cron J-7 expiry | 🔨 |
| email_pre_suppression | Pré-suppression J-30 (téléchargez profil) | Cron J-30 post-expiry | 🔨 |
| email_bilan_dec | Bilan Décembre (préparez vos chiffres) | Cron 1er déc | 🔨 |
| email_bilan_jan | Bilan Janvier (votre bilan est prêt) | Cron 2 jan | 🔨 |
| email_bilan_fev | Bilan Février (3 scénarios fiscaliste) | Cron 1er fév | 🔨 |

### H. Retention & Growth

| ID | Composant | Détails | Statut |
|----|-----------|---------|--------|
| feedback | Pipeline Feedback | J+0 étoiles · J+3 email · NPS · page complète | 🔨 |
| testimonials | Témoignages Auto | J+7 si qualifié → consent → landing | 🔨 |
| ab_testing | A/B Testing PostHog | Feature flags · 4 expériences · guide autonomie | 🔨 |
| cron_feedback | Crons Feedback | J+3, J+7, J+14 | 🔨 |
| cron_remind | Crons Rappels Expert | 6 mois anniversaire · renouvellement J-30/J-7 | 🔨 |
| cron_bilan | Crons Bilan Annuel | Décembre · janvier · février | 🔨 |
| veille_regl | Veille Réglementaire | RSS → SEO + bannière in-app + changelog | 📋 Phase 3 |

### I. Infrastructure

| ID | Composant | Détails | Statut |
|----|-----------|---------|--------|
| vercel | Vercel | Hosting · serverless · crons · Next.js 16 | ✅ |
| kv | Vercel KV | Profils · feedback · referral · changelog · alerts | ✅ |
| blob | Vercel Blob | Rapports HTML · store "buildfi-blob" | ⚠️ PRIVATE |
| resend | Resend | Emails · 3,000/mois free | ⚠️ DKIM cassé |
| posthog | PostHog | Analytics · A/B · feature flags · 1M events | ✅ |
| cloudflare | Cloudflare DNS | A · CNAME · SPF · DKIM · DMARC · MX | ✅ |
| github | GitHub | tredhedge/buildfi · privé · main | ✅ |
| anthropic_api | Anthropic API | Claude Sonnet · narration | ⚠️ key pas dans Vercel |
| fb_pixel | Facebook Pixel | Conversion tracking pubs | 📋 pas configuré |

### J. Admin & Monitoring

| ID | Composant | Détails | Statut |
|----|-----------|---------|--------|
| health_check | /api/health | Teste KV, MC, Anthropic, Resend, Blob | 🔨 |
| admin_dashboard | Dashboard Admin | Logs · erreurs · rapports · feedback alerts | 🔨 |
| robots_txt | robots.txt | Disallow /outils/ | ✅ |

---

## 2. GRAPHE DE DÉPENDANCES

### Client Flow (achat)
```
landing ← testimonials, articles_seo
landing → quiz_ess ($29), quiz_inter ($59), page_vente_expert ($129)
page_vente_expert → quiz_expert
quiz_ess, quiz_inter, quiz_expert → stripe → webhook
webhook → quiz_translator → mc_engine → tax_engine (fiscalité)
webhook → mc_engine → ai_narration ← ai_profile, ai_serializer
ai_narration → amf_lint → report_ess|inter|expert
report_* → blob → resend → client inbox
webhook → merci (redirect)
```

### Expert Ecosystem
```
simulateur → mc_engine (recalcul async)
simulateur → optimizer → mc_engine (2e pass 5K)
simulateur → resume_1p (snapshot)
simulateur → portail (historique)
simulateur → print_export (window.print)
portail ↔ kv (profils, crédits, changelog)
portail ← blob (liens rapports)
portail → page_changelog
```

### Bilan Annuel (janvier)
```
cron_bilan → email_bilan_dec (décembre: préparez vos chiffres)
cron_bilan → email_bilan_jan (janvier: bilan prêt)
client → portail → bilan_input ← kv (profil existant)
bilan_input → bilan_processing → mc_engine → tax_engine ← constantes
bilan_processing ← kv (historique bilans précédents → deltas)
bilan_processing → bilan_output → blob → resend → client
cron_bilan → email_bilan_fev (février: 3 scénarios)
```

### Post-achat et livraison
```
merci ← webhook (redirect)
merci → referral (lien unique), second50 (offre 2e rapport)
email_livraison_ess ← webhook + blob
email_livraison_ess → guide_101, debt_tool (bonus), second50, upgrade (upsell Inter)
email_livraison_inter → guide_201, debt_tool, second50, upgrade (upsell Expert)
email_livraison_expert → guide_201, portail (magic link)
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
report_ess → upgrade (upsell Inter dans rapport)
report_inter → upgrade (upsell Expert)
upgrade → stripe (checkout avec crédit)
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
| **feedback** | 7 | Pas de NPS, témoignages, coupon 50%. |
| **ai_narration** | 7 | Rapports sans narration (fallback {}). |
| **blob** | 6 | Rapports inaccessibles. Liens email = 404. |
| **simulateur** | 6 | Expert inutilisable. |
| **report_ess** | 6 | Rapport Ess cassé. Upsell + feedback Ess cassés. |
| **merci** | 5 | Post-paiement dégradé. Pas de referral initial. |
| **portail** | 5 | Expert sans dashboard. |

---

## 4. KV SCHEMA

| Clé | Contenu | Créé par | Lu par |
|-----|---------|----------|--------|
| `expert:{email}` | Profil, tier, crédits, expiry, changelog, referralCode | webhook | portail, simulateur, crons, bilan_input |
| `feedback:{email}` | rating, nps, text, tier, date, source, testimonial_consent | feedback API | second50, testimonials, cron_feedback |
| `referral:{code}` | referrer_email, uses, conversions | webhook | referral tracking, stripe coupons |
| `report:{id}` | Metadata (version, constantes, date, tier, sections) | webhook / portail | portail historique |
| `bilan:{email}:{year}` | Résultats bilan annuel (scores, deltas) | bilan_processing | bilan_output, comparaison |
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
| Bilan décembre | Annuel (1 déc) | Expert → email "Préparez vos chiffres" |
| Bilan janvier | Annuel (2 jan) | Expert → email "Bilan prêt" |
| Bilan février | Annuel (1 fév) | Expert ayant fait bilan → email "3 scénarios" |
| Veille réglementaire | Hebdomadaire | RSS → keyword match → flag admin |
| Health check | 5 min | /api/health → teste tous services |

---

## 6. ROUTES API (15 total)

| Route | Méthode | Auth | Action |
|-------|---------|------|--------|
| /api/checkout | POST | Non | Session Stripe Ess/Inter/Expert |
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
| /api/health | GET | Non | Health check services |
| /api/ai-narrate | POST | Dev only | Test AI standalone |

---

## 7. STATUT GLOBAL

| Statut | Count | Composants |
|--------|-------|-----------|
| ✅ Existe | 23 | mc_engine, tax_engine, quiz_ess, report_ess, landing, merci (basique), debt_tool, guide_101, guide_201, logo_system, quiz_translator, ai_profile, test_suite, email_livraison_ess, vercel, kv, posthog, cloudflare, github, robots_txt, stripe (Ess), webhook (Ess), amf_lint (partiel) |
| ⚠️ Bloqué | 3 | blob (PRIVATE), resend (DKIM), anthropic_api (key) |
| 🔨 À construire | ~35 | Tous les quiz Inter/Expert, simulateur, portail, pages légales, upgrades, referral, feedback, témoignages, A/B, tous crons, admin, 13 email templates, reports Inter/Expert, bilan annuel 3 phases, print export, page_vente_expert, page_feedback, page_changelog, page_404, page_500, ai_serializer, health_check |
| 📋 Planifié (Phase 3+) | 4 | articles_seo, page_blog, veille_regl, fb_pixel |

### Bloquants immédiats (avant lancement Essentiel)
1. **blob** → recréer store PUBLIC
2. **resend** → corriger DKIM Cloudflare
3. **anthropic_api** → ajouter ANTHROPIC_API_KEY Vercel

---

*60+ composants · 80+ connexions · 12 crons · 15 routes API · 14 email templates · 6 clés KV.*
