# Landing v6 + beta program — launch notes (2026-06-15)

Branch: `chore/repo-cleanup-2026-06-11` (not merged to `main`, so not yet deployed).

## What shipped in this work

- **New bilingual landing page** (v6 design) served at `/`:
  - `public/index.html` — the v6 design, links wired to real routes
    (`/wizard`, `/acheter-planner`, `/guides/101|201`, `/outils/*`, `/samples/…`, legal pages).
  - `public/landing-i18n.js` — FR/EN translation tables (single source for landing copy).
  - Language toggle, `?lang=` + `localStorage` persistence, lang-aware canvas + money/age/%.
  - Routing in `next.config.js`: rewrite `/ → /index.html`; `/bilan-360 → /` redirect
    (Next drops bare-hash redirect destinations, so a clean root redirect is used).
- **Previous React landing preserved** at `/old-landing` (moved `app/page.tsx → app/old-landing/page.tsx`).
- **Referral attribution restored** on the landing: `?ref=CODE` now pings `/api/referral/use`
  and persists `bf_ref` (the old static landing did this; the v6 file had dropped it).
- **Beta free-access codes** (friends / beta testers):
  - `app/api/checkout/route.ts` — `betaCode` applies a 100%-off Stripe coupon, scoped to a tier,
    once per email (KV `beta:redeemed:{CODE}:{email}` via `SET NX`). $0 checkout → existing webhook
    fulfils normally (webhook does not gate on amount).
  - `app/wizard/page.tsx` + `app/acheter-planner/page.tsx` forward `?beta=CODE` to checkout.
  - `scripts/stripe-beta-coupons.mjs` — creates the two 100%-off coupons (no-MCP path).

## TODO — required before this is live / before driving traffic

1. **Activate the beta coupons.**
   - Run `node scripts/stripe-beta-coupons.mjs` with `STRIPE_SECRET_KEY` (test first),
     `STRIPE_PRICE_BILAN360`, `STRIPE_PRICE_PLANNER` — or connect the Stripe MCP via `/mcp`.
   - Set in Vercel env: `BETA_COUPON_BILAN`, `BETA_COUPON_PLANNER`, `BETA_CODE_BILAN`
     (e.g. `FRIENDS360`), `BETA_CODE_PLANNER` (e.g. `FRIENDSLAB`). Redeploy.
   - Verify a $0 checkout fulfils a report end-to-end in **test mode** before going live.
   - Share: `…/wizard?beta=FRIENDS360` (free Bilan), `…/acheter-planner?beta=FRIENDSLAB` (free Planner).

2. **Create `public/og-buildfi.png`** (1200×630). The landing `<meta og:image>` points to it; it
   does not exist yet (repo has `og-image.png` only). Either add the asset or repoint the meta.

3. **Analytics + Law 25 consent on the static landing.** The static page bypasses the Next layout,
   so PostHog (`PostHogProvider`) and the consent banner — both React-only — are not present.
   Wire `public/analytics-init.js` + `window.BUILDFI_PH_KEY` + a consent gate before driving paid traffic.

4. **Referral "share & earn".** Surface the existing tiered rewards (1→50% off, 3→free export,
   5→free year) on the landing/portal, and confirm `/api/checkout` reads `bf_ref` (localStorage)
   on conversion so the referrer is actually credited.

5. **EN parity downstream.** Landing is bilingual now; verify wizard / report / Planner EN before
   sending English traffic (an EN buyer hitting a FR report churns).

6. **Clean stale prices (out of funnel, not linked from v6 but still live):**
   - `app/expert/page.tsx` — "Commencer par le Diagnostic à 14,50 $" (dead SKU/price).
   - `app/outils/bilan-annuel/page.tsx` — "Laboratoire — 49,99 $" (dead product/price).

7. **Upgrade-credit path Bilan → Planner** — since reports are no-refund, let a Bilan buyer upgrade
   to Planner with the $29.99 credited (converts refund requests into upsells).

8. **Delete `/old-landing`** once confident in v6.

9. **Post-deploy smoke test:** `/` serves v6 · `/?lang=en` toggles · `/bilan-360` redirects ·
   `?beta=` flow works once coupons exist.

## Deferred (intentionally not now)

- **Annual Update SKU** — premature in year one; revisit later.

## Not part of this work (left uncommitted in the working tree)

- `planner/report/realai/responses/*.json` (7 files) — pre-existing report-lab edits, unrelated.
