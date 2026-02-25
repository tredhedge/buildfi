# SERVICES.md
> Tous les comptes, configurations backend, DNS, credentials, flux de paiement.
> Mis à jour: 2026-02-25
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
| CNAME | www | 14941d72d937e1ea.vercel-dns-017.com | → Vercel |
| TXT | resend._domainkey | p=MIGfMA... | DKIM Resend |
| MX | send | feedback-smtp.us-east-1.amazonses.com (priority 10) | Resend |
| TXT | send | v=spf1 include...~all | SPF Resend |
| TXT | _dmarc | v=DMARC1; p=none; | DMARC Resend |

---

### Vercel — Hébergement
- Compte: tredhedge (GitHub) | Plan: Hobby (gratuit)
- Projet: buildfi
- URL prod: buildfi-rho.vercel.app + buildfi.ca (DNS propagation en cours)
- Déploiement: automatique à chaque push sur `main`
- Variables d'environnement à configurer (voir section Variables ci-dessous)

---

### GitHub — Contrôle de version
- Compte: tredhedge | Repo: buildfi (privé) | Branche: main
- Structure: voir STATUS.md

---

### Stripe — Paiements
- Compte: BuildFi | Mode actuel: TEST (pas encore live)
- Produits:

| Produit | Prix | Price ID |
|---------|------|----------|
| Rapport Essentiel | $39 CAD one-time | À noter depuis dashboard |
| Rapport Intermédiaire | $69 CAD one-time | À noter depuis dashboard |
| Rapport Expert | $139 CAD one-time | À noter depuis dashboard |

- Stripe Tax activé (TPS/TVQ automatique QC)
- Webhook endpoint à créer: `/api/webhooks/stripe`
- Garantie: 30 jours remboursement
- Clés: dans buildfi-secrets.txt (test) + Vercel env vars (prod)

---

### Resend — Emails transactionnels
- Compte: tredhedge (GitHub) | Plan: Free (3,000 emails/mois)
- Domaine buildfi.ca: status pending DNS verification
- Adresse d'envoi cible: rapport@buildfi.ca (à créer)
- Templates à créer: livraison rapport (PDF + lien 30 jours), reçu achat, bienvenue
- Clé API: dans buildfi-secrets.txt

---

### PostHog — Analytics
- Compte: BuildFi org | Plan: Free (1M events/mois)
- Features: Product Analytics, Session Replay, Web Analytics, Heatmaps
- Project token: dans buildfi-secrets.txt
- Events à implémenter dans quiz-essentiel.html:
  ```
  quiz_start, quiz_step_1 → quiz_step_7,
  quiz_complete, score_reveal,
  checkout_start, purchase (+ tier + amount),
  report_opened, ai_narration_requested, upsell_clicked
  ```

---

### Anthropic API — Narration AI
- URL: console.anthropic.com
- Statut: Clé révoquée (était dans planner.html ligne 5946 — incident sécurité)
- À faire: Créer une nouvelle clé, la mettre dans Vercel env vars uniquement
- Usage: Narration AI on-demand dans les rapports (1 appel, 10 slots JSON)
- Modèle: claude-haiku (rapide, ~$0.17/rapport)

---

### Facebook Pixel — À INSTALLER avant premier dollar de pub
- Statut: Non configuré
- Events à tracker: PageView, QuizStart, Lead (email gate), Purchase
- Ajouter aussi: Conversions API server-side (contourne les bloqueurs)

---

## VARIABLES D'ENVIRONNEMENT VERCEL

À configurer dans: Vercel → Project Settings → Environment Variables

| Variable | Usage | Quand configurer |
|----------|-------|-----------------|
| `STRIPE_SECRET_KEY` | Webhooks + Checkout | P1.4 |
| `STRIPE_WEBHOOK_SECRET` | Validation webhooks | P1.4 |
| `RESEND_API_KEY` | Envoi emails | P1.4 |
| `ANTHROPIC_API_KEY` | Narration AI server-side | P4 |
| `NEXT_PUBLIC_POSTHOG_KEY` | Analytics client-side | Maintenant |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Checkout client-side | P1.4 |

---

## FLUX DE PAIEMENT (à implémenter — P1.4)

```
Client complète quiz
  → Score reveal + offre 3 tiers
  → Clic "Acheter"
  → Stripe Checkout hébergé
  → Paiement réussi
  → Stripe webhook → /api/webhooks/stripe
  → Générer rapport PDF (server-side)
  → Envoyer email via Resend (PDF pièce jointe + lien 30 jours)
  → Rediriger vers /merci
```

---

## SÉCURITÉ

- Aucune clé API dans le code source (leçon apprise)
- Toutes les clés dans Vercel env vars (prod) et buildfi-secrets.txt (local, jamais committé)
- .gitignore doit inclure: `.env.local`, `buildfi-secrets.txt`
- Repo GitHub privé — moteur MC protégé jusqu'à migration P4
