# SERVICES.md
> Tous les comptes, configurations backend, DNS, credentials, flux de paiement.
> Mis à jour: 2026-03-09 — v9 (PIVOT 3 produits: Bilan Pro + Laboratoire + Export AI. Old 4-tier pricing deprecated.)
> NE JAMAIS mettre les valeurs secrètes dans ce fichier — noms seulement.

---

## COMPTES ACTIFS

### Cloudflare — DNS & Domaine
- Compte: Tredhedge@gmail.com
- Domaine: buildfi.ca | Plan: Free
- DNS configuré:

| Type | Nom | Valeur | Usage |
|------|-----|--------|-------|
| A | buildfi.ca | 216.198.79.1 | → Vercel |
| CNAME | www | 14941d72d937e1e...vercel-dns | → Vercel |
| TXT | resend._domainkey | p=MIGfMA... | DKIM Resend — ✅ VERIFIED 2026-03-07 |
| MX | send | feedback-smtp.us-east-1.amazonses.com (priority 10) | Resend |
| TXT | send | v=spf1 include:amazonses.com ~all | SPF Resend |
| TXT | _dmarc | v=DMARC1; p=none; | DMARC Resend |

**⚠️ NOTE**: buildfi.ca redirige 307 vers www.buildfi.ca. Toutes les URLs publiques (webhook, API) doivent utiliser www.buildfi.ca.

---

### Vercel — Hébergement
- Compte: tredhedge (GitHub) | Plan: Hobby (gratuit)
- Projet: buildfi
- URL prod: www.buildfi.ca (primary) + buildfi-rho.vercel.app
- Déploiement: automatique à chaque push sur `main`
- Next.js 16.1.6 avec Turbopack
- Runtime: Node.js (serverless functions, maxDuration 60s)

---

### GitHub — Contrôle de version
- Compte: tredhedge | Repo: buildfi (privé) | Branche: main
- Structure: voir STATUS.md

---

### Stripe — Paiements
- Compte: BuildFi | Mode actuel: **TEST** (pas encore live)

> **⚠️ PIVOT 2026-03-09**: Old prices below will be replaced. See PLAN-PIVOT.md §Phase 2.

- **Produits DEPRECATED (ancien 4 tiers):**

| Produit | Prix | Price ID | Status |
|---------|------|----------|--------|
| ~~Rapport Essentiel~~ | ~~$29 CAD one-time~~ | STRIPE_PRICE_ESSENTIEL | ❌ DEPRECATED |
| ~~Rapport Intermédiaire~~ | ~~$59 CAD one-time~~ | STRIPE_PRICE_INTERMEDIAIRE | ❌ DEPRECATED |
| ~~Rapport Décaissement~~ | ~~$59 CAD one-time~~ | STRIPE_PRICE_DECAISSEMENT | ❌ DEPRECATED |
| ~~Expert~~ | ~~$129 CAD one-time~~ | STRIPE_PRICE_EXPERT | ❌ DEPRECATED |
| ~~Expert Renouvellement~~ | ~~$29 CAD/an récurrent~~ | STRIPE_PRICE_EXPERT_RENEWAL | ❌ DEPRECATED |

- **Produits NEW (pivot 3 produits):**

| Produit | Prix | Price ID | Status |
|---------|------|----------|--------|
| Bilan Pro | **$19.99 CAD** one-time | STRIPE_PRICE_BILAN_PRO | ⏳ À créer |
| Laboratoire | **$49.99 CAD** one-time | STRIPE_PRICE_LABORATOIRE | ⏳ À créer |
| Laboratoire Renouvellement | **$29.99 CAD/an** récurrent | STRIPE_PRICE_LABORATOIRE_RENEWAL | ⏳ À créer |
| Export AI additionnel | **$14.99 CAD** one-time | STRIPE_PRICE_EXPORT_ADDON | ✅ Configuré (inchangé) |

- **Coupons Stripe:**
  - `LAUNCH-BP` : 100% off, limit 50, Bilan Pro (à créer)
  - `LAUNCH-LAB` : 50% off, limit 50, Laboratoire (à créer)
  - `SECOND50` : 50% off, single-use, lié à l'email du premier achat (2e rapport)
  - `REFERRAL15` : 15% off, single-use, généré dynamiquement par lien referral

- **automatic_tax**: DÉSACTIVÉ. Prix HT affiché, taxes ajoutées au checkout quand inscription TPS/TVQ active.
- **Webhook**: builfi-webhook (actif)
  - URL: `https://www.buildfi.ca/api/webhook` (IMPORTANT: www, pas buildfi.ca — sinon 307)
  - Events: `checkout.session.completed`, `customer.subscription.updated` (AJOUTER pour renouvellement)
  - Signing secret: dans Vercel env var STRIPE_WEBHOOK_SECRET
  - Status: ✅ Fonctionne — signature vérifiée, MC exécuté
- ⚠️ **AUCUN REMBOURSEMENT** — produit numérique, livraison instantanée. Erreur technique → correction sans frais.
- Clés: dans Vercel env vars (prod) + .env.local (dev)

---

### Resend — Emails transactionnels
- Compte: tredhedge | Plan: Free (3,000 emails/mois)
- Domaine buildfi.ca: **✅ STATUS: VERIFIED** (2026-03-07). Emails delivered. Domain warmup recommandé pour sortir du spam.
- Adresse d'envoi: BuildFi <rapport@buildfi.ca> (RESEND_FROM dans Vercel)
- Clé API: re_... (active, "Sending access") — dans Vercel env var RESEND_API_KEY
- **Email tags**: désactivés temporairement (erreur validation "only ASCII letters/numbers/underscores/dashes")

**Templates:**

| Template | Contenu | Status |
|----------|---------|--------|
| Livraison Essentiel (DEPRECATED) | Grade + lien rapport HTML + bonus tools + offre 2e rapport 50% | ✅ V2 — table-based, bilingual, AMF compliant, tier-aware tool blocs |
| Livraison Bilan Pro (accum) | Grade + lien rapport HTML + 2 tools (alloc+dettes) + offre 2e rapport | ✅ Tier-aware conditional in lib/email.ts |
| Livraison Bilan Pro (décaissement) | Grade + lien rapport + simulateur link + guide décaissement | ✅ Tier-aware conditional in lib/email.ts |
| Livraison Laboratoire | Grade + lien rapport + magic link simulateur | ✅ lib/email-expert.ts |
| Feedback J+3 | "Comment était votre bilan?" + étoiles + NPS + coupon 50% | ✅ lib/email-feedback.ts + cron/feedback |
| Témoignage J+7 | "Seriez-vous d'accord pour un témoignage?" (si rating ≥4 ET NPS Oui) | ✅ lib/email-feedback.ts |
| Rappel J+14 | Dernier rappel feedback + étoiles | ✅ lib/email-feedback.ts |
| Rappel BA | Rappel bilan annuel (trimestriel/annuel) | ⏳ À créer |
| Renouvellement J-30/J-7/J-0/J+3 | Cycle rappel renouvellement Laboratoire | ✅ cron/renewal |
| Anniversaire 6 mois | Rappel recalculation Laboratoire | ✅ cron/anniversary |
| 2e rapport offre | "Un 2e bilan à 50%" + lien checkout coupon | ⏳ Coupon SECOND50 wired, CTA on /merci, email mention needed |
| Referral notification | "Quelqu'un a utilisé votre lien" + statut récompenses | ⏳ À créer |
| Bilan Annuel (Déc/Jan/Fév) | 3-email cycle pour bilan annuel Laboratoire | ⏳ Cron trigger non implémenté |
| Pré-suppression J-30 | "Téléchargez votre profil avant suppression" | ⏳ À créer |

**Email template v2 actuel**: Table-based layout (email client compatible), grade card dark, bouton "Consulter mon rapport", tier-aware upsell + tool blocs, bilingual FR/EN, AMF compliant disclaimers, footer Montréal. Domain verified (warmup needed for inbox placement).

---

### Vercel Blob — Stockage rapports
- Store: "buildfi-blob" | Région: IAD1
- **✅ STATUS: OPÉRATIONNEL** — Rapports accessibles par lien email — vérifié 2026-03-07
- Token: BLOB_READ_WRITE_TOKEN dans Vercel env vars (aussi BLOBFI_READ_WRITE_TOKEN — le store a été créé avec ce nom)
- Upload fonctionne: rapport HTML ~100KB uploadé en <1s

---

### PostHog — Analytics
- Compte: BuildFi org | Plan: Free (1M events/mois)
- Project token: dans Vercel env vars

---

### Anthropic API — Narration AI
- URL: console.anthropic.com
- Statut: **✅ OPÉRATIONNEL** — buildAIPrompt() + Anthropic call wired in webhook
- Modèle: claude-sonnet-4 (12 JSON slots, single API call)
- Fallback: {} if ANTHROPIC_API_KEY missing or API fails → report uses hardcoded text
- AI files: `lib/ai-constants.ts` (slot names, AMF forbidden terms), `lib/ai-profile.ts` (DerivedProfile)
- Test endpoint: `/api/ai-narrate` (standalone, not called by webhook)
- **Activation**: ✅ ANTHROPIC_API_KEY ajouté dans Vercel env vars — AI narration opérationnel

---

### Facebook Pixel — À INSTALLER avant premier dollar de pub
- Statut: Non configuré

---

## VARIABLES D'ENVIRONNEMENT VERCEL

Configurées dans: Vercel → Project Settings → Environment Variables (All Environments)

| Variable | Usage | Status |
|----------|-------|--------|
| `STRIPE_SECRET_KEY` | Checkout + Webhook | ✅ Configurée |
| `STRIPE_PRICE_ESSENTIEL` | ~~Price ID Essentiel $29~~ | ❌ DEPRECATED — old pricing |
| `STRIPE_PRICE_INTERMEDIAIRE` | ~~Price ID Intermédiaire $59~~ | ❌ DEPRECATED — old pricing |
| `STRIPE_PRICE_DECAISSEMENT` | ~~Price ID Décaissement $59~~ | ❌ DEPRECATED — old pricing |
| `STRIPE_PRICE_EXPERT` | ~~Price ID Expert $129~~ | ❌ DEPRECATED — replaced by STRIPE_PRICE_LABORATOIRE |
| `STRIPE_PRICE_EXPERT_RENEWAL` | ~~Price ID Renouvellement $29/an~~ | ❌ DEPRECATED — replaced by STRIPE_PRICE_LABORATOIRE_RENEWAL |
| `STRIPE_PRICE_BILAN_PRO` | Price ID Bilan Pro $19.99 | ⏳ À créer |
| `STRIPE_PRICE_LABORATOIRE` | Price ID Laboratoire $49.99 | ⏳ À créer |
| `STRIPE_PRICE_LABORATOIRE_RENEWAL` | Price ID Renouvellement $29.99/an | ⏳ À créer |
| `STRIPE_PRICE_EXPORT_ADDON` | Price ID Export AI $14.99 | ✅ Configurée (inchangé) |
| `STRIPE_WEBHOOK_SECRET` | Validation webhook signature | ✅ Configurée (whsec_...) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Checkout client-side | ✅ Configurée |
| `NEXT_PUBLIC_BASE_URL` | URLs dans le code | ✅ Configurée |
| `RESEND_API_KEY` | Envoi emails | ✅ Configurée (re_...) |
| `RESEND_FROM` | Expéditeur email | ✅ "BuildFi <rapport@buildfi.ca>" |
| `BLOB_READ_WRITE_TOKEN` | Upload Vercel Blob | ✅ Configurée |
| `BLOBFI_READ_WRITE_TOKEN` | Alias (nom auto du store) | ✅ Configurée |
| `ANTHROPIC_API_KEY` | Narration AI server-side | ✅ Configurée — AI narration opérationnel |
| `KV_REST_API_URL` | Upstash Redis URL | ✅ Configurée |
| `KV_REST_API_TOKEN` | Upstash Redis token | ✅ Configurée |
| `ADMIN_EMAIL` | Admin alert recipient | Optionnel — fallback support@buildfi.ca |
| `NEXT_PUBLIC_POSTHOG_KEY` | Analytics client-side | ✅ Configurée |

### Notes critiques env vars
1. `NEXT_PUBLIC_BASE_URL` doit être `https://www.buildfi.ca` (pas `buildfi.ca` — le 307 redirect perd le POST body)
2. Stripe webhook URL dans Stripe Dashboard doit aussi pointer vers `https://www.buildfi.ca/api/webhook`
3. `ANTHROPIC_API_KEY` doit être ajoutée pour activer la narration AI — sans elle, rapports fonctionnent avec texte statique
4. `BLOB_READ_WRITE_TOKEN` doit avoir accès public read pour que les URLs rapport fonctionnent
5. Resend DNS: DKIM/SPF records doivent être configurés sur buildfi.ca pour la délivrabilité email
6. Toujours redéployer après modification des vars (pas de hot-reload)

---

## FLUX DE PAIEMENT — IMPLÉMENTÉ ✅

> **⚠️ Flow below describes the pre-pivot Essentiel pipeline. Post-pivot flow: see PLAN-PIVOT.md §Phase 2 + CLAUDE.md Pipeline sections.**

```
Client complète quiz (805 lignes, thin client, zero IP)
  → Paywall avec preview blurred + mock data
  → Clic "Obtenir mon rapport"
  → POST /api/checkout → Stripe Checkout hébergé
  → Paiement réussi (test: 4242 4242 4242 4242)
  → Stripe envoie checkout.session.completed → www.buildfi.ca/api/webhook
  → Webhook vérifie signature, extrait quiz answers de session.metadata
  → translateToMC(quizAnswers) → runMC(params, 5000) (~2.3s)
  → extractReportData(mc, params) → buildAIPrompt → callAnthropic (12 slots, or {} fallback)
  → renderReportHTML() — report v6
  → Upload rapport HTML sur Vercel Blob
  → Envoyer email via Resend avec lien vers rapport + offre 2e rapport 50%
  → Client redirigé vers /merci (+ lien referral)
```

**Statut des fonctionnalités:**
- ~~PDF en pièce jointe~~ Remplacé par lien HTML (Puppeteer incompatible Vercel)
- ~~AI narration~~ ✅ Opérationnel
- ~~Rapport accessible~~ ✅ Blob opérationnel
- ~~Email en inbox~~ ✅ Delivered (domain warmup needed pour sortir du spam)
- ~~Offre 2e rapport 50%~~ ✅ SECOND50 coupon wired in checkout + CTA on /merci
- ~~Lien referral sur page /merci~~ ✅ ShareSection avec lien 15% off
- ~~Feedback J+3/J+7/J+14~~ ✅ lib/email-feedback.ts + cron
- ~~Admin dashboard~~ ✅ app/admin/page.tsx (health, profiles, email stats)
- ~~Export AI quota~~ ✅ Enforced in api/export (check before MC, decrement after)
- Bilan Annuel cron trigger — ⏳ (API exists, cron trigger missing)

---

## SÉCURITÉ

- Aucune clé API dans le code source (leçon apprise)
- Toutes les clés dans Vercel env vars (prod) et .env.local (local, jamais committé)
- .gitignore inclut: `.env.local`
- Repo GitHub privé — moteur MC protégé
- Quiz thin client: zero IP exposé côté navigateur
- robots.txt: Disallow /outils/ (bonus clients seulement, pas indexé)
- Stripe webhook signature vérifiée à chaque requête

---

## BUGS CONNUS

### ~~Magic link URL sans www~~ ✅ FIXED (2026-03-07, commit 27f81e9)
- buildMagicLinkUrl() force maintenant www.buildfi.ca
- Le redirect 307 buildfi.ca → www.buildfi.ca supprimait le query param token
- Fix: auth.ts replace "https://buildfi.ca" → "https://www.buildfi.ca" dans base URL
