# STATUS.md
> État actuel du projet. Envoyer ce fichier à Claude en début de session.
> Mis à jour: 2026-02-28 — Post E2E Stripe test session

## PHASE ACTUELLE
**P0.6 COMPLÉTÉ — Pipeline E2E fonctionnel: Quiz → Stripe → Webhook → MC 5000 sims → Report HTML → Blob → Email. Reste à stabiliser l'infra (Blob public, Resend DNS, email template) avant lancement Essentiel.**

---

## CE QUI EST FAIT

### Infrastructure (P0)
| Service | Statut | Notes |
|---------|--------|-------|
| Domaine buildfi.ca | ✅ | Cloudflare DNS, pointe vers Vercel |
| Vercel | ✅ | Auto-deploy, Next.js 16.1.6 |
| GitHub tredhedge/buildfi | ✅ | main branch |
| Stripe | ✅ | Test mode, produit Essentiel $39 CAD, webhook configuré |
| Resend | ⚠️ | Clé API OK, domaine buildfi.ca DNS FAILED — DKIM/SPF à revérifier |
| PostHog | ✅ | |
| Vercel Blob | ⚠️ | Store "buildfi-blob" PRIVATE — rapports uploadés mais Forbidden en accès direct |
| Variables Vercel | ✅ | STRIPE_SECRET_KEY, STRIPE_PRICE_ESSENTIEL, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, RESEND_FROM, BLOB_READ_WRITE_TOKEN, NEXT_PUBLIC_BASE_URL, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY |

### Pipeline E2E — VALIDÉ EN PROD (2026-02-27)
| Étape | Status | Détails |
|-------|--------|---------|
| Quiz thin client | ✅ | 805 lignes, zero IP exposé côté client |
| Stripe Checkout | ✅ | POST /api/checkout → Stripe redirect, 39$ CAD |
| Stripe Webhook | ✅ | POST /api/webhook, signature vérifiée |
| Monte Carlo | ✅ | 5000 sims en ~2.3s sur Vercel serverless |
| Report HTML render | ✅ | renderReportHTML() avec 8 sections, 4 SVG charts |
| Blob upload | ✅ | Upload OK, mais store PRIVATE → "Forbidden" en accès direct |
| Email envoi | ✅ | Resend envoie, arrive en spam (domaine non vérifié) |
| PDF generation | ❌ DÉSACTIVÉ | @sparticuz/chromium ne fonctionne pas sur Vercel. Remplacé par lien HTML |
| AI narration | ❌ SKIPPÉ | Passe {} pour observations — rapport contient données MC brutes seulement |

### Moteur MC — Planner v2
- 436 tests, 53 catégories, 0 failures
- Syncé avec lib/engine/index.js (2,426 lignes, 38 exports)
- Inclut optimizeDecum() (ajouté dans cette session)
- Tax parity vérifiée sur 10 provinces

### Quiz Essentiel (thin client)
- 805 lignes (était 3,227 — 75% de code retiré)
- Zero fonction MC côté client
- Mock preview pour paywall (generateMockPreview)
- Stripe checkout intégré
- Inline logo fallback + /logo.js

### Landing Page
- ✅ Sur GitHub, servie via app/page.tsx → redirect("/index.html")
- ✅ Logo SVG avec flame (via logo.js injection)
- ✅ Accents UTF-8 corrects
- ✅ buildfi.ca → 307 → www.buildfi.ca → landing page
- Note: app/page.tsx utilise redirect() (pas permanentRedirect) pour éviter cache browser

### Logo Unifié
- /public/logo.js — logoSVG(size, context) shared function
- /public/logo-light.svg, logo-dark.svg — versions statiques
- Intégré dans: quiz-essentiel.html (inline fallback), landing page (JS injection)

---

## BLOQUANTS AVANT LANCEMENT ESSENTIEL — PRIORITÉ HAUTE

### 1. Vercel Blob → PUBLIC
- Store actuel "buildfi-blob" est PRIVATE
- Rapports uploadés OK mais lien retourne "Forbidden"
- Fix: recréer un store PUBLIC sur Vercel Storage, mettre à jour BLOB_READ_WRITE_TOKEN
- OU: utiliser signed URLs (plus complexe)

### 2. Resend DNS → VÉRIFIÉ
- Domaine buildfi.ca status: FAILED
- Records DNS ajoutés sur Cloudflare: DKIM (TXT resend._domainkey), SPF (TXT send), MX (send)
- La clé DKIM a été recréée — s'assurer que Cloudflare a la bonne valeur
- Email arrive en spam tant que le domaine n'est pas vérifié

### 3. Email template — mise à jour
- Logo SVG au lieu du texte "buildfi.ca"
- Couleurs alignées brand
- Inclusions bonus: Guide 101 PDF, lien debt tool
- Texte adapté (plus de mention PDF, c'est un lien HTML)

### 4. AI narration (optionnel MVP)
- Webhook passe {} pour observations AI
- Rapport contient données MC brutes — pas de narration personnalisée
- Intégrer Anthropic API pour enrichir le rapport

### 5. Pages légales (P0.7)
- Conditions d'utilisation
- Politique de confidentialité
- Avis AMF
- Besoin: nom légal de l'entreprise, email contact

### 6. Quiz Intermédiaire
- Thin client à construire (comme Essentiel)
- 80+ fields, 8 étapes
- UX immersive demandée (cards, transitions, score cinématique)

---

## STRUCTURE REPO GITHUB (actuelle)
```
buildfi/
├── planner.html                 ← moteur complet dev/test (436 tests)
├── app/
│   ├── page.tsx                 ✅ redirect("/index.html")
│   ├── api/checkout/route.ts    ✅ Stripe session (automatic_tax disabled)
│   ├── api/webhook/route.ts     ✅ MC → Blob HTML → Email (PDF disabled)
│   ├── merci/page.tsx           ✅ Page de remerciement
│   └── outils/
│       └── dettes/page.jsx      ✅ Debt tool
├── lib/
│   ├── engine/index.js          ✅ Syncé planner_v2 (2,426 lignes)
│   ├── quiz-translator.ts       ✅
│   ├── report-data.ts           ✅
│   ├── report-html.js           ✅
│   ├── email.ts                 ✅ (tags disabled, PDF optional)
│   └── pdf-generator.ts         ⚠️ chromium-min (non fonctionnel sur Vercel)
├── public/
│   ├── index.html               ✅ Landing page v9 + logo SVG
│   ├── quiz-essentiel.html      ✅ Thin client (805 lignes)
│   ├── logo.js                  ✅ Shared logoSVG()
│   ├── logo-light.svg           ✅
│   └── logo-dark.svg            ✅
├── assets/
│   ├── guide-101-les-bases-de-vos-finances.pdf
│   └── guide-201-optimiser-votre-retraite.pdf
└── docs/
    ├── STATUS.md
    ├── ROADMAP.md
    ├── TECH-REFERENCE.md
    ├── SERVICES.md
    ├── STRATEGY.md
    └── [handoff docs]
```

## DÉCISIONS ARCHITECTURALES CETTE SESSION

### PDF → HTML (pivot)
- Puppeteer + @sparticuz/chromium ne fonctionne pas sur Vercel serverless
- Solution: rapport HTML hébergé sur Vercel Blob, lien envoyé par email
- Le client clique le lien → voit le rapport dans le navigateur
- window.print() dans le rapport pour export PDF côté client (à ajouter)
- Approche standard dans l'industrie SaaS (Wealthsimple, Questrade, etc.)

### Stripe automatic_tax → désactivé
- Requiert immatriculation fiscale sur Stripe Tax
- Pour l'instant: prix $39 tax-in
- À réactiver quand numéros TPS/TVQ configurés

### app/page.tsx → redirect (pas permanentRedirect)
- permanentRedirect causait un cache browser impossible à invalider
- redirect() est temporaire et ne cache pas

## SERVICES EXTERNES — ÉTAT
| Service | Config | État |
|---------|--------|------|
| Stripe | Test mode, webhook → www.buildfi.ca/api/webhook | ✅ Fonctionne |
| Resend | Clé API active, domaine FAILED | ⚠️ DNS à corriger |
| Vercel Blob | Store "buildfi-blob" private | ⚠️ Recréer en public |
| Cloudflare DNS | A record → Vercel, CNAME www → Vercel, + Resend records | ✅ |

## PROCHAINE SESSION
1. Fix Blob (public store) + Resend DNS → rapport accessible par lien
2. Email template v2 (logo, couleurs, bonus inclusions)
3. Pages légales (P0.7)
4. Quiz Intermédiaire thin client
5. AI narration integration (Anthropic API)
