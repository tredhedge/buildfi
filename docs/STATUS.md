# STATUS.md
> État actuel du projet. Envoyer ce fichier à Claude en début de session.
> Mis à jour: 2026-02-25

## PHASE ACTUELLE
**P1.4 — Pipeline paiement ~90% complété. Reste : bug UTF-8, variables Vercel, connexion quiz→checkout.**

---

## CE QUI EST FAIT

### Infrastructure (P0) ✅
| Service | Statut | Notes |
|---------|--------|-------|
| Domaine `buildfi.ca` | ✅ | Cloudflare |
| Vercel | ✅ | Auto-deploy sur push GitHub |
| GitHub `tredhedge/buildfi` | ✅ | Repo privé |
| Stripe | ✅ | 3 produits créés, mode TEST |
| Resend | ✅ | DNS pending verification |
| PostHog | ✅ | Free plan |
| Pages légales (P0.7) | ⏸ | Besoin nom légal + email contact |

### Produit ✅
| Fichier | Statut |
|---------|--------|
| `planner.html` | ✅ Moteur MC + UI. 4,148 tests. |
| `quiz-essentiel.html` | ✅ Quiz 7 écrans + rapport. AMF-compliant. |
| `quiz-intermediaire.html` | ✅ Rapport Intermédiaire. 18 scénarios validés. |

### Pipeline Next.js (découvert 2026-02-25) ✅
| Fichier | Statut |
|---------|--------|
| `lib/engine/index.js` | ✅ Moteur MC extrait (112KB, port 1:1) |
| `lib/quiz-translator.ts` | ✅ Translator complet (40+ heuristiques) |
| `lib/report-data.ts` | ✅ Extraction données rapport |
| `lib/report-html.js` | ✅ Renderer HTML rapport (port 1:1) |
| `lib/email.ts` | ✅ Template email bilingue + Resend |
| `lib/pdf-generator.ts` | ✅ Puppeteer + Chromium Vercel |
| `app/api/checkout/route.ts` | ✅ Stripe Checkout + metadata chunking |
| `app/api/webhook/route.ts` | ✅ Pipeline complet MC→PDF→Blob→Email |
| `app/merci/page.tsx` | ⚠️ Page faite — bug encodage UTF-8 |

---

## CE QUI RESTE À FAIRE

### P1.4 — Immédiat (pour lancer)
- [ ] **Bug UTF-8** — corriger accents corrompus dans `merci/page.tsx` et `email.ts`
- [ ] **Variables Vercel** — configurer dans dashboard Vercel :
  - `STRIPE_SECRET_KEY`
  - `STRIPE_PRICE_ESSENTIEL` (Price ID depuis Stripe dashboard)
  - `RESEND_API_KEY`
  - `RESEND_FROM` = `BuildFi <rapport@buildfi.ca>`
  - `NEXT_PUBLIC_BASE_URL` = `https://buildfi.ca`
  - `STRIPE_WEBHOOK_SECRET` (après création webhook dans Stripe)
- [ ] **Connexion quiz→checkout** — bouton "Acheter" dans `quiz-essentiel.html` doit POST vers `/api/checkout`
- [ ] **Stripe webhook** — créer endpoint dans Stripe dashboard pointant vers `https://buildfi.ca/api/webhook`
- [ ] **Tester pipeline complet** en mode TEST (Stripe card test 4242 4242 4242 4242)
- [ ] **Vérifier `app/page.tsx`** — page d'accueil pointe où?

### P1.5 — Après pipeline fonctionnel
- [ ] Landing page buildfi.ca
- [ ] Audit qualité R19-R20
- [ ] Soft launch organique

### Avant toute mise à l'échelle
- [ ] Nouvelle clé API Anthropic (ancienne révoquée)
- [ ] Pages légales P0.7
- [ ] Nouveau logo buildfi.ca
- [ ] Facebook Pixel

---

## STRUCTURE REPO GITHUB (état réel)
```
buildfi/
├── planner.html
├── quiz-essentiel.html
├── quiz-intermediaire.html
├── manifest.json + sw.js + icon192/512.png
├── next.config.js + package.json + tsconfig.json
├── .env.local (local seulement, jamais committé)
├── app/
│   ├── page.tsx              ← À vérifier
│   ├── layout.tsx
│   ├── globals.css
│   ├── favicon.ico
│   ├── api/checkout/route.ts ← ✅ Stripe checkout
│   ├── api/webhook/route.ts  ← ✅ Pipeline MC→PDF→Email
│   └── merci/page.tsx        ← ⚠️ Bug UTF-8
├── lib/
│   ├── engine/index.js       ← ✅ Moteur MC (112KB)
│   ├── quiz-translator.ts    ← ✅ 40+ heuristiques
│   ├── report-data.ts        ← ✅ Extraction données
│   ├── report-html.js        ← ✅ Renderer HTML
│   ├── email.ts              ← ⚠️ Bug UTF-8
│   └── pdf-generator.ts      ← ✅ Puppeteer
├── public/                   ← Vide (SVGs boilerplate supprimés)
└── docs/
    ├── STATUS.md
    ├── ROADMAP.md
    ├── TECH-REFERENCE.md
    ├── SERVICES.md
    ├── STRATEGY.md
    └── P1.3-P1.4-SPEC.md
```

## WORKFLOW MISE À JOUR FICHIERS
1. Claude génère le fichier mis à jour
2. Télécharger → remplacer dans le dossier `buildfi` sur votre ordi
3. GitHub Desktop détecte le changement
4. Commit (résumé court) → Push origin
5. Vercel déploie en ~30 secondes
