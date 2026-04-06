# ARCHITECTURE.md
> Dependency map and product routing for BuildFi.
> Mis a jour: 2026-03-12 - v7 (realignment)

---

## 1. Canonical Product Architecture

| Product | Customer name | Internal pipeline | Price |
|---|---|---|---|
| Bilan | Bilan | `essentiel` | 9.99 CAD |
| Bilan 360 (accumulation) | Bilan 360 | `intermediaire` | 19.99 CAD |
| Bilan 360 (decumulation) | Bilan 360 | `decaissement` | 19.99 CAD |
| Laboratoire | Laboratoire | `expert` | 49.99 CAD |

Constraint:
- Internal keys stay unchanged for compatibility.
- Customer-facing naming uses Bilan / Bilan 360 / Laboratoire.

## 2. Routing Logic

### Bilan
`quiz-essentiel` -> `/api/checkout` (type `essentiel`) -> Stripe -> `/api/webhook` -> MC -> report renderer -> Blob -> Resend

### Bilan 360
First step is routing question:
- If user is far from retirement: accumulation path (`intermediaire`)
- If user is near/in retirement: decumulation path (`decaissement`)

Flow:
`quiz-routing` -> `quiz-intermediaire` OR `quiz-decaissement`
-> `/api/checkout` (type `bilan360`, path `accum|decum`)
-> Stripe -> webhook route to corresponding translator + renderer

### Laboratoire
`quiz-expert` -> `/api/checkout` (type `expert`) -> Stripe -> webhook -> KV profile + magic link
-> simulator workflows -> AI report exports (quota)

## 3. Product Components by Layer

### Client-facing pages
- Landing page
- `public/quiz-essentiel.html`
- `public/quiz-intermediaire.html`
- `public/quiz-decaissement.html`
- `public/quiz-expert.html`
- `app/expert/*` and/or `app/simulateur/*` for Lab portal/simulator
- `/merci`

### Core computation
- `lib/engine/index.js`
- `lib/quiz-translator.ts` (Bilan)
- `lib/quiz-translator-inter.ts` (Bilan 360 accum)
- `lib/quiz-translator-decum.ts` (Bilan 360 decum)
- `lib/quiz-translator-expert.ts` (Laboratoire)

### Report renderers
- `lib/report-html.js` (Bilan)
- `lib/report-html-inter.js` (Bilan 360 accum)
- `lib/report-html-decum.js` (Bilan 360 decum)
- `lib/report-html-expert.ts` (Laboratoire)
- Shared helpers: `lib/report-shared.ts`

### AI narration
- `lib/ai-prompt-*`
- `lib/ai-profile.ts`
- `lib/ai-constants.ts`
- webhook orchestration in `app/api/webhook/route.ts`

### Infra
- Stripe checkout + webhook
- Vercel Blob (report storage)
- Resend (delivery)
- Vercel KV (Lab auth/profile/quota)

## 4. Mandatory Questionnaire Changes

### For Bilan 360
- Add/confirm first routing screen: accumulation vs decumulation.
- Route to existing specialized quiz flows (do not merge questionnaires into one giant form).
- Keep shared wording/UX style between both streams.
- Ensure metadata sent to checkout includes selected stream.

## 5. Report Consistency Contract (system-level)
All report pipelines must output coherent artifacts across products:
- Consistent formatting rules (currency, percentages, headings, labels)
- Consistent visual system (fonts, spacing, hierarchy, cards, chart legends)
- Consistent narrative frame (decision summary -> diagnostics -> scenarios -> assumptions -> methodology)
- Consistent AI behavior (data-grounded, AMF-safe language, fallback coverage)

Reference checklist: `docs/TECH-REFERENCE.md`.

## 6. Active Build Order
1. Bilan report quality first.
2. Bilan 360 routing + merge streams under one product.
3. Laboratoire upgrades.
4. Website updates last.
