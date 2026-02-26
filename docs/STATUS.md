# STATUS.md
> État actuel du projet. Envoyer ce fichier à Claude en début de session.
> Mis à jour: 2026-02-25 — Fin de session

## PHASE ACTUELLE
**P1.4 — Pipeline en cours. Bugs quiz-essentiel.html à régler avant lancement.**

---

## CE QUI EST FAIT

### Infrastructure (P0) ✅
| Service | Statut |
|---------|--------|
| Domaine buildfi.ca | ✅ |
| Vercel | ✅ Auto-deploy |
| GitHub tredhedge/buildfi | ✅ |
| Stripe | ✅ 3 produits, mode TEST |
| Resend | ✅ DNS pending |
| PostHog | ✅ |
| Variables Vercel | ✅ Toutes configurées |

### Pipeline Next.js ✅
| Fichier | Statut |
|---------|--------|
| lib/engine/index.js | ✅ Moteur MC extrait |
| lib/quiz-translator.ts | ✅ |
| lib/report-data.ts | ✅ |
| lib/report-html.js | ✅ |
| lib/email.ts | ✅ UTF-8 corrigé |
| lib/pdf-generator.ts | ✅ |
| app/api/checkout/route.ts | ✅ |
| app/api/webhook/route.ts | ✅ |
| app/merci/page.tsx | ✅ UTF-8 corrigé |
| app/page.tsx | ✅ Redirige vers quiz |

### Quiz Essentiel — Partiellement corrigé
| Fix | Statut |
|-----|--------|
| quiz-essentiel.html dans /public | ✅ |
| Paywall showPaywall = true | ✅ |
| renderBlurredReport() ajoutée | ✅ |
| startCheckout() ajoutée | ✅ |
| Champ API key masqué | ✅ |
| Debounce inputs numériques (600ms) | ✅ |
| curRate × 100 pour affichage % | ✅ |
| Syntaxe setDebtField rate corrigée | ✅ |

---

## BUGS RESTANTS — PRIORITÉ HAUTE

### quiz-essentiel.html (public/)
1. **Rapport flouté ne s'affiche pas** — renderBlurredReport() ne se déclenche pas correctement
2. **Erreur au clic "Obtenir mon rapport"** — startCheckout() a encore un bug
3. **Inputs numériques difficiles** — debounce partiel, encore des problèmes UX
4. **Boîtes de pourcentage trop petites** — step 4/7, taux dettes peu lisibles

### À faire après bugs réglés
- [ ] Tester flow complet Stripe (carte test 4242 4242 4242 4242)
- [ ] Vérifier livraison email Resend
- [ ] Propager tous les fixes vers quiz-intermediaire.html
- [ ] Stripe webhook en mode LIVE
- [ ] Audit R19-R20

---

## STRUCTURE REPO GITHUB
```
buildfi/
├── planner.html
├── quiz-essentiel.html          ← version racine (modifiée mais pas celle servie)
├── quiz-intermediaire.html
├── app/
│   ├── page.tsx                 ✅ redirige vers /quiz-essentiel.html
│   ├── api/checkout/route.ts    ✅
│   ├── api/webhook/route.ts     ✅
│   └── merci/page.tsx           ✅
├── lib/
│   ├── engine/index.js          ✅
│   ├── quiz-translator.ts       ✅
│   ├── report-data.ts           ✅
│   ├── report-html.js           ✅
│   ├── email.ts                 ✅
│   └── pdf-generator.ts         ✅
├── public/
│   └── quiz-essentiel.html      ← FICHIER SERVI — bugs en cours de correction
└── docs/
    ├── STATUS.md
    ├── ROADMAP.md
    ├── TECH-REFERENCE.md
    ├── SERVICES.md
    └── STRATEGY.md
```

## NOTE IMPORTANTE
Le fichier servi est **public/quiz-essentiel.html** — pas le fichier racine.
Tous les fixes doivent être appliqués à `public/quiz-essentiel.html`.
Après correction complète, propager vers `quiz-intermediaire.html`.

## PROCHAINE SESSION
1. Déboguer renderBlurredReport() + startCheckout()
2. Corriger UX inputs numériques
3. Corriger boîtes pourcentage trop petites
4. Tester flow Stripe complet
5. Propager fixes vers quiz-intermediaire.html
