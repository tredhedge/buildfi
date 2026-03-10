# BuildFi — Audit Prompt
## Run at the end of every build session, or any time features ship to main.
> Updated 2026-03-09 — adapted for 3-product pivot (BA / Bilan Pro / Laboratoire)

You are auditing the BuildFi Expert tier (Laboratoire) for correctness, consistency, and compliance. Do not fix anything yet — produce a prioritized issue list first.

---

## 1. Legal / Compliance (P0 — ship blocker)

### 1a. API ↔ UI parity
For every API route under `app/api/data/` and `app/api/profile/`:
- Is it reachable from a UI button or link in `app/expert/page.tsx` or `app/simulateur/page.tsx`?
- If the API exists but there is no UI surface, flag it as: **API exists, no UI**.

### 1b. Privacy policy vs portal behavior
Read `public/confidentialite.html` sections on user rights (look for: portabilité, téléchargement, suppression, droits).
For each promise:
- Find the corresponding UI element in `app/expert/page.tsx`.
- Find the corresponding API route.
- Find the corresponding cron job that executes it (e.g., a "delete in 30 days" promise requires a purge cron).
- Flag any break in the chain: **promise → UI → API → cron**.

### 1c. Cron completeness
Read `vercel.json` crons. For each cron:
- Does the route file exist?
- Does the route implement what the cron description says?
- Is there any "scheduled" action (e.g., `deletionScheduledAt`, `renewalAt`) that has no corresponding cron executing it?

### 1d. AMF language
Run: `grep -rn "devriez\|recommandons\|vous devez\|il faut que\|conseil\|recommandation" lib/ public/ app/`
Must return zero results in FR context. Flag any match.

---

## 2. Calculations / Engine (P0 — trust blocker)

### 2a. MC parameter flow
For the Expert simulator (`app/simulateur/page.tsx`):
- Trace `params` from initialization → `DEFAULT_PARAMS` → `useSimulation` → `/api/simulate`.
- Confirm every field in `DEFAULT_PARAMS` is a valid MC engine input (check `lib/engine/index.js` or `lib/quiz-translator-expert.ts`).
- Flag any param that is in `DEFAULT_PARAMS` but not consumed by the engine.
- Flag any engine param that has no default and no quiz source.

### 2b. Bridge integrity
In `app/simulateur/page.tsx`, locate the postMessage bridge (search: `buildfi-planner-ready`, `buildfi-load-params`):
- Confirm the bridge sends `params` (current React state), NOT a stale snapshot like `quizParamsForPlanner`.
- Confirm the bridge fires for ALL users — not only those with quiz data (no `quizParamsForPlanner` guard).
- Confirm `buildfi-params-update` from planner merges into React state.

### 2c. Report output vs input
For the last Expert AI export flow (`app/api/export/route.ts`):
- Confirm `exportsAI` is decremented atomically (Lua script, not read-modify-write).
- Confirm the decrement happens AFTER successful report generation, not before.
- Confirm the report blob URL is stored in the profile's `reportsGenerated` array.

### 2d. Quiz translator completeness
Read `lib/quiz-translator-expert.ts`. For every quiz field collected in `public/quiz-expert.html`:
- Confirm the field is translated to an MC param.
- Flag any quiz field that is collected but never translated.
- Flag any quiz field whose translation uses a hardcoded constant instead of the user's answer.

---

## 3. User Experience / State (P1 — product quality)

### 3a. Standard ↔ Advanced mode parity
In `app/simulateur/page.tsx`:
- When switching from Standard (React) to Advanced (planner iframe): do the current React `params` get sent to the planner?
- When switching back: do planner edits get merged into React `params`?
- For Porte B (preset) users: does the bridge fire even without quiz data?

### 3b. Auth flow correctness
Check `useEffect` auth blocks in both `app/expert/page.tsx` and `app/simulateur/page.tsx`:
- Is the token captured in a `useRef` before `useSearchParams()` can drop it?
- Is the auth `useEffect` dependency array `[]` (runs once only)?
- After auth succeeds, is the token removed from the URL via `history.replaceState`?
- Is there any `useSearchParams` re-render that could overwrite a successful auth with "denied"?

### 3c. Error states
For every `fetch()` call in `app/expert/page.tsx` and `app/simulateur/page.tsx`:
- Is there a visual error state shown to the user (not just a console.error or alert)?
- For critical flows (export, delete account, save profile), confirm the user cannot get silently stuck.

### 3d. Loading states
For every async action button:
- Is it disabled during loading?
- Does it show a loading indicator (spinner, "..." text, or equivalent)?

---

## 4. Routing / SEO (P1)

### 4a. Canonical ↔ rewrite parity
Read all `<link rel="canonical">` tags in `public/*.html` (conditions.html, confidentialite.html, avis-legal.html, bilan.html, bilan-360.html, horizon.html, expert-landing.html).
For each canonical URL path (e.g., `/conditions`):
- Does `next.config.js` have a matching rewrite?
- If not: **broken canonical — 404 on canonical URL**.

### 4b. Internal link consistency
Search all `href=` values in `app/` and `public/` for `.html` extension links:
- If a Next.js rewrite exists for that page, the link should use the clean path (e.g., `/expert/landing` not `/expert-landing.html`).
- Flag: `grep -rn "expert-landing\.html\|bilan\.html\|bilan-360\.html\|horizon\.html" app/`
- Post-pivot: bilan.html, bilan-360.html, horizon.html are DEPRECATED → should redirect (301) to BA or Bilan Pro landing

### 4c. Lang param propagation
For CTAs that link between pages (quiz → landing → merci → simulateur → portal):
- Does each link preserve `?lang=fr` or `?lang=en` where the destination page reads it?
- Flag links that drop the lang param when the destination page supports it.

---

## 5. Copy / Claims (P2)

### 5a. Test count claims
Find all claims about test counts or validation in public-facing copy:
- `grep -rn "tests automatisés\|automated tests\|tests couvrant\|0 failures" public/ app/`
- Cross-check each claim against the actual test suite counts in `CLAUDE.md` (current: 453 engine, 200 debt, 91 report-shared, 135 fiscal-sync, 87 expert-translator, 103 S3, 29 S1, 91 S10 = ~1,189 total).
- Flag mismatches.

### 5b. Product capability claims
Find tab/module/parameter count claims:
- `grep -rn "onglets\|modules\|paramètres\|tabs\|parameters" public/quiz-expert.html public/expert-landing.html app/simulateur/page.tsx`
- All claims must be consistent across surfaces. Current canonical: "30+ modules, 190 paramètres".

### 5c. Accents and French typography
- `grep -rn "avis legal\b" public/ app/` — must return 0 (correct: "avis légal")
- `grep -rn "Credits AI\b" app/` — check for missing accent (correct: "Crédits AI")
- `grep -rn "referral\b" app/expert/` — check for French context (correct: "référal" in FR labels)
- Check for unescaped apostrophes in JS strings where `\'` is needed.

### 5d. Bilingual completeness
For every bilingual `t(fr, en)` call in `app/expert/page.tsx` and `app/simulateur/page.tsx`:
- Confirm neither the FR nor EN string is empty or a placeholder (e.g., `t("...", "")` or `t("TODO", "TODO")`).

---

## 6. Security (P0)

### 6a. Token exposure
- `grep -rn "ANTHROPIC_API_KEY\|STRIPE_SECRET\|KV_REST_API_TOKEN" public/ app/` — must return 0.
- Confirm no secret env var is passed to a client component via `NEXT_PUBLIC_` prefix.
- Confirm `/api/data/export` and `/api/data/delete` check `Authorization: Bearer <token>` — not a query param.

### 6b. Cron authorization
For every route under `app/api/cron/`:
- Confirm it checks `Authorization: Bearer ${CRON_SECRET}`.
- Confirm it returns 401 if the header is missing or wrong.
- Flag any cron route accessible without auth.

### 6c. Rate limiting
- Confirm `/api/simulate` has rate limiting (check `lib/rate-limit.ts` usage).
- Confirm `/api/export` enforces `exportsAI > 0` before running MC.
- Confirm `/api/auth/magic-link` has rate limiting to prevent abuse.

---

## Output format

For each issue found, report:
```
[SEVERITY] File:line — Description
SEVERITY: P0 (ship blocker) | P1 (product quality) | P2 (polish)
```

Group by section. List P0 issues first. If a section has zero issues, say "✓ Clean".

At the end, produce a one-line summary:
```
Total: X P0, Y P1, Z P2 issues across N files.
```
