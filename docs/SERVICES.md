# SERVICES.md
> Tous les comptes, configurations backend, DNS, credentials, flux de paiement.
> Mis à jour: 2026-03-02 — v5 (Engine audit 453 tests, 3 psych questions, Intermédiaire backbone)
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
| TXT | resend._domainkey | p=MIGfMA... | DKIM Resend — ⚠️ VÉRIFIER que la clé correspond après recréation |
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
- Produits:

| Produit | Prix | Price ID |
|---------|------|----------|
| Rapport Essentiel | $39 CAD one-time (tax-in) | STRIPE_PRICE_ESSENTIEL (Vercel env var) |
| Rapport Intermédiaire | $69 CAD one-time | À configurer |
| Rapport Expert | $139 CAD one-time | À configurer |

- **automatic_tax**: DÉSACTIVÉ — requiert immatriculation fiscale Stripe Tax. Prix tax-inclusive pour l'instant.
- **Webhook**: builfi-webhook (actif)
  - URL: `https://www.buildfi.ca/api/webhook` (IMPORTANT: www, pas buildfi.ca — sinon 307)
  - Event: `checkout.session.completed`
  - Signing secret: dans Vercel env var STRIPE_WEBHOOK_SECRET
  - Status: ✅ Fonctionne — signature vérifiée, MC exécuté
- ⚠️ **AUCUN REMBOURSEMENT** — produit numérique, livraison instantanée. Erreur technique → correction sans frais.
- Clés: dans Vercel env vars (prod) + .env.local (dev)

---

### Resend — Emails transactionnels
- Compte: tredhedge | Plan: Free (3,000 emails/mois)
- Domaine buildfi.ca: **⚠️ STATUS: FAILED** — DNS records ajoutés sur Cloudflare mais vérification échoue
  - **Cause probable**: clé DKIM recréée, valeur dans Cloudflare potentiellement obsolète
  - **Fix**: copier la nouvelle clé DKIM depuis Resend → mettre à jour le record TXT resend._domainkey sur Cloudflare → Reverify
- Adresse d'envoi: BuildFi <rapport@buildfi.ca> (RESEND_FROM dans Vercel)
- Clé API: re_... (active, "Sending access") — dans Vercel env var RESEND_API_KEY
- **Email tags**: désactivés temporairement (erreur validation "only ASCII letters/numbers/underscores/dashes")

**Templates:**

| Template | Contenu | Status |
|----------|---------|--------|
| Livraison Essentiel | Grade + lien rapport HTML + bonus | ✅ V2 — table-based, bilingual, AMF compliant |
| Livraison Intermédiaire | Grade + lien rapport HTML + bonus | ❌ À créer |
| Livraison Expert | Grade + lien rapport + accès simulateur | ❌ À créer |

**Email template v2 actuel**: Table-based layout (email client compatible), grade card dark, bouton "Consulter mon rapport", upsell Intermédiaire, bilingual FR/EN, AMF compliant disclaimers, footer Montréal. Reçu en spam (domaine non vérifié).

---

### Vercel Blob — Stockage rapports
- Store: "buildfi-blob" | Région: IAD1
- **⚠️ STATUS: PRIVATE** — rapports uploadés OK mais URL retourne "Forbidden"
- **Fix**: recréer un store PUBLIC sur Vercel Storage, mettre à jour BLOB_READ_WRITE_TOKEN
- Token: BLOB_READ_WRITE_TOKEN dans Vercel env vars (aussi BLOBFI_READ_WRITE_TOKEN — le store a été créé avec ce nom)
- Upload fonctionne: rapport HTML ~100KB uploadé en <1s

---

### PostHog — Analytics
- Compte: BuildFi org | Plan: Free (1M events/mois)
- Project token: dans Vercel env vars

---

### Anthropic API — Narration AI
- URL: console.anthropic.com
- Statut: **CODE COMPLETE** — buildAIPrompt() + Anthropic call wired in webhook
- Modèle: claude-sonnet-4 (12 JSON slots, single API call)
- Fallback: {} if ANTHROPIC_API_KEY missing or API fails → report uses hardcoded text
- AI files: `lib/ai-constants.ts` (slot names, AMF forbidden terms), `lib/ai-profile.ts` (DerivedProfile)
- Test endpoint: `/api/ai-narrate` (standalone, not called by webhook)
- **Activation**: add ANTHROPIC_API_KEY to Vercel env vars → AI narration goes live

---

### Facebook Pixel — À INSTALLER avant premier dollar de pub
- Statut: Non configuré

---

## VARIABLES D'ENVIRONNEMENT VERCEL

Configurées dans: Vercel → Project Settings → Environment Variables (All Environments)

| Variable | Usage | Status |
|----------|-------|--------|
| `STRIPE_SECRET_KEY` | Checkout + Webhook | ✅ Configurée |
| `STRIPE_PRICE_ESSENTIEL` | Price ID Stripe | ✅ Configurée |
| `STRIPE_WEBHOOK_SECRET` | Validation webhook signature | ✅ Configurée (whsec_...) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Checkout client-side | ✅ Configurée |
| `NEXT_PUBLIC_BASE_URL` | URLs dans le code | ✅ Configurée |
| `RESEND_API_KEY` | Envoi emails | ✅ Configurée (re_...) |
| `RESEND_FROM` | Expéditeur email | ✅ "BuildFi <rapport@buildfi.ca>" |
| `BLOB_READ_WRITE_TOKEN` | Upload Vercel Blob | ✅ Configurée |
| `BLOBFI_READ_WRITE_TOKEN` | Alias (nom auto du store) | ✅ Configurée |
| `ANTHROPIC_API_KEY` | Narration AI server-side | ❌ Non configurée — code complete, needs key to activate |
| `NEXT_PUBLIC_POSTHOG_KEY` | Analytics client-side | ✅ Configurée |

---

## FLUX DE PAIEMENT — IMPLÉMENTÉ ✅

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
  → Envoyer email via Resend avec lien vers rapport
  → Client redirigé vers /merci
```

**⚠️ ÉLÉMENTS NON IMPLÉMENTÉS / BLOQUÉS DANS LE FLUX:**
- PDF en pièce jointe (Puppeteer désactivé)
- Bonus en pièce jointe (Guide PDF, lien debt tool)
- AI narration: code complete, needs ANTHROPIC_API_KEY in Vercel env vars to activate
- Rapport accessible (Blob private → "Forbidden" — recréer store public)
- Email en inbox (domaine Resend non vérifié → spam)

---

## SÉCURITÉ

- Aucune clé API dans le code source (hardcoded key found and blanked in engine audit 2026-03-02)
- Toutes les clés dans Vercel env vars (prod) et .env.local (local, jamais committé)
- .gitignore inclut: `.env.local`
- Repo GitHub privé — moteur MC protégé
- Quiz thin client: zero IP exposé côté navigateur
- robots.txt: Disallow /outils/ (bonus clients seulement, pas indexé)
- Stripe webhook signature vérifiée à chaque requête
