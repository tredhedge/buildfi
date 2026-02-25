# STATUS.md
> État actuel du projet. Envoyer ce fichier à Claude en début de session.
> Mis à jour: 2026-02-25

## PHASE ACTUELLE
**P0 Infrastructure ✅ complétée → P1 en cours**

## CE QUI EST FAIT

### Infrastructure (P0)
| Service | Statut | Notes |
|---------|--------|-------|
| Domaine `buildfi.ca` | ✅ | Cloudflare Registrar |
| Vercel | ✅ | Auto-deploy sur push GitHub |
| GitHub `tredhedge/buildfi` | ✅ | Repo privé |
| Stripe | ✅ | 3 produits créés, mode TEST actif |
| Resend | ✅ | DNS pending verification |
| PostHog | ✅ | Free plan, session replay activé |
| Pages légales (P0.7) | ⏸ | Reporté — besoin nom légal + email contact |

### Produit
| Fichier | Statut | Notes |
|---------|--------|-------|
| `planner.html` | ✅ | Moteur MC + UI. 4,148 tests. Clé API retirée. |
| `quiz-essentiel.html` | ✅ | Quiz 7 écrans + rapport Essentiel. AMF-compliant. |
| `quiz-intermediaire.html` | ✅ | Rapport Intermédiaire. 18 scénarios validés. |
| `manifest.json` + `sw.js` | ✅ | PWA |
| `icon192/512.png` | ⚠️ | À refaire — créés avant le nom buildfi.ca |

## CE QUI RESTE À FAIRE

### Avant lancement P1
- [ ] Nouvelle clé API Anthropic (ancienne révoquée)
- [ ] Stripe webhooks → livraison automatique post-paiement
- [ ] Email templates Resend (reçu + livraison rapport)
- [ ] PDF export du rapport
- [ ] Blurred preview avant achat
- [ ] PostHog events dans le quiz
- [ ] P0.7 Pages légales (besoin : nom légal + email contact)
- [ ] Nouveau logo buildfi.ca
- [ ] Facebook Pixel (avant premier dollar de pub)

### P1 restant
- [ ] P1.4 Paiement Stripe + livraison email
- [ ] P1.5 Landing page + site web
- [ ] P1.6 Audit qualité R19-R20
- [ ] P1.7 Soft launch organique (Reddit, LinkedIn)

## WORKFLOW MISE À JOUR FICHIERS
1. Claude génère le fichier mis à jour
2. Télécharger → remplacer dans le dossier `buildfi` sur votre ordi
3. GitHub Desktop détecte le changement automatiquement
4. Commit (résumé court) → Push origin
5. Vercel déploie en ~30 secondes

## STRUCTURE REPO GITHUB
```
buildfi/
├── planner.html
├── quiz-essentiel.html
├── quiz-intermediaire.html
├── manifest.json
├── sw.js
├── icon192.png
├── icon512.png
└── docs/
    ├── STATUS.md          ← ce fichier — état actuel + prochaine session
    ├── ROADMAP.md         ← phases, sous-étapes, statuts, go/no-go
    ├── TECH-REFERENCE.md  ← architecture, code, audits, conformité AMF
    ├── SERVICES.md        ← tous les comptes et configs backend
    └── STRATEGY.md        ← brand, marketing, compétiteurs, pricing
```
