# BuildFi -- Front-end vs Back-end Architecture Plan

**Status:** Draft 2026-05-01.
**Goal:** Stop running the simulation engine in the browser. Move all
heavy/regulated/secret-bearing computation behind authenticated API
routes. Keep the front-end thin: forms, charts, interactivity.

---

## 1. Why split now

Today the browser ships:
- The full simulation engine inlined in `planner/planner_v3.html` (22,657 lines).
- 7 server-side renderer JS files (`report/report-pdf.js` 524 KB, etc.) loaded
  as `<script>` tags so the planner can preview reports client-side.
- Until 1 week ago, the Anthropic API key (since rotated server-side, replaced
  by `/api/ai-narrate`).

Problems this creates:
- **Compliance drift**: the same engine constants live in three places
  (`planner_v3.html` inline, `lib/constants/`, `report/report-constants-2026.js`)
  -- drift is caught only by `tests/constants-drift.test.js`.
- **IP exposure**: every visitor downloads ~1 MB of proprietary tax/MC code.
- **Bundle weight**: planner_v3.html is the slowest page in the product.
- **No identity**: simulator results aren't tied to any account, no save state,
  no "5 reports remaining" enforcement possible.
- **No telemetry**: we can't see what people actually simulate.

---

## 2. Target principles (what goes where)

### Front-end (browser) -- UI only
- Form input, validation surface (basic shape only -- server re-validates).
- Adaptive Wizard navigation (Mode 1 classifier -> Mode 2 personalized -> Mode 3 advanced).
- Chart rendering from JSON the server returned. Charts stay client-side because
  rendering 50 SVG charts on the server per request is wasteful; the *data* is server-built.
- Theme toggle, language switch, copy-to-clipboard, print mode.
- Optimistic UI for instant param toggles (debounced before they call the server).
- Browser-only PWA shell (`sw.js`, `manifest.json`).

### Back-end (Next.js API routes + lib/)
- Monte Carlo simulation engine (5000 paths).
- All fiscal / tax / OAS / GIS / RRSP / TFSA / FHSA / CCPC math.
- AI narration (Anthropic Claude Opus calls).
- Stripe checkout + webhook + customer portal.
- Identity: magic-link auth, KV-stored sessions, AI-credit counters.
- Report rendering (HTML + Excel) -- the heavy renderer files.
- Report storage (Vercel Blob), email delivery (Resend).
- Audit trail, rate limiting, AMF compliance sanitizer.
- Feature flags, server-side analytics.

### Edge of these two
- A **stable JSON contract** between the wizard and `/api/simulate`. The
  contract is documented and versioned (start with `v1`). Front-end never
  derives anything that the server didn't already compute.
- **Cache layer**: Upstash KV (already deployed) caches simulation results
  per (userId, paramHash). A repeat run with the same inputs returns cached.

---

## 3. Layer-by-layer breakdown

### 3.1 Engine -- the big one
| Today | Target |
|-------|--------|
| `planner_v3.html` lines 5000-22000 contain inline engine | Stays only as legacy fallback for the *internal* preview simulator until cutover. New entry point: `/api/simulate`. |
| `planner/report/report-engine.js` (135 KB) | Stays -- already server-side. Becomes the canonical engine, imported by `lib/engine/index.js` and `app/api/simulate/route.ts`. |
| `lib/engine/index.js` (current shim) | Promote to full engine; delete in-browser duplicate. |
| `tests/constants-drift.test.js` checks 3 mirrors | After cutover, only 2 mirrors: `lib/constants/fiscal-2026.ts` and `engine-shim.js`. Drop the planner_v3 inline mirror. |

### 3.2 Reports
| Today | Target |
|-------|--------|
| 7 `report-*.js` files loaded by planner_v3 + by realai pipeline (eval) | All stay server-side (already are for production; planner_v3 is the only browser consumer). After cutover the planner-v3 `<script>` tags go away; the iframe preview renders an HTML the server built. |
| `lib/report-html-360.js` is the production renderer used by the webhook | Keep. Already canonical for the paid Bilan 360 path. |
| Excel export (`report-excel.js` 195 KB) | Move to `/api/export?type=xlsx`. Browser only triggers a download; never loads exceljs. |
| Glossary, what-if simulator, interactive charts inlined into rendered HTML | Keep -- they ship inside the *generated* report HTML (one-time inline), not into the planner shell. |

### 3.3 AI narration
| Today | Target |
|-------|--------|
| `/api/ai-narrate` (just landed) -- accepts `{sys, usr}` | Tighten: the route should NOT accept arbitrary `sys` from the browser. Browser sends profile-id + section-id; server builds the prompt from server-side `lib/ai-prompt-360.ts`. |
| `lib/ai-constants.ts` FORBIDDEN_TERMS + softenAISlot | Stays server-side. AMF sanitizer never runs in browser. |
| Per-user credit (5 included, +4 = $19.99 upsell) | New: KV counter `aiCreditsRemaining:{userId}`. `/api/regenerate-report` decrements. Browser displays a badge but never enforces. |

### 3.4 Auth & identity
| Today | Target |
|-------|--------|
| `/api/auth` exists; magic-link sketched | Promote to first-class. Required for Planner SKU, optional for Bilan (one-shot purchase). |
| KV stores feedback tokens, customer email mappings | Add: `user:{id}` -> `{email, sku, aiCredits, createdAt}`, `session:{token}` -> `{userId, expiresAt}`. |
| Quiz-360 + Wizard accept anonymous form fill | Anonymous fill stays for friction reduction. Save+resume requires sign-in. |

### 3.5 Persistence
| Layer | Today | Target |
|-------|-------|--------|
| Stripe | full (checkout, customer, refund) | Unchanged. |
| Vercel Blob | report HTML public URLs | Unchanged. |
| Resend | report delivery email | Unchanged. |
| Upstash KV | feedback tokens, magic links, ba-reminder | **Expand**: user records, sessions, simulation cache, AI credit counters, rate-limit buckets. |
| Browser localStorage | theme, lang, planner_v3 saved file | Trim: theme + lang only after cutover. Saved-state moves to KV. |

### 3.6 Pricing/SKU enforcement
| Boundary | Front-end | Back-end |
|----------|-----------|----------|
| Display "5 reports remaining" | yes (read-only) | source of truth |
| Block "Generate report" when `aiCredits === 0` | UX hint only | enforced in `/api/regenerate-report` |
| Show post-purchase "+4 reports for $19.99" upsell | yes | only sellable to existing Planner customers (server checks `user.sku === 'planner'`) |
| Adaptive Wizard Mode 3 (advanced overlay) | gated on `user.sku === 'planner'` for UX | server validates allowed param ranges per SKU |

---

## 4. API surface -- exhaustive route inventory

### Existing routes (status after split)
```
app/api/
  ai-narrate/          KEEP. Tighten input: profile-id + section, not raw {sys,usr}.
  auth/                KEEP + EXPAND. Magic link issue/verify/logout.
  ba-reminder/         KEEP. Cron-driven Bilan Annuel reminders.
  bilan-annuel/        REVIEW. May be deprecated under 2-SKU.
  checkout/            KEEP. type=bilan360 ($29.99) | type=planner ($69.99) | type=top-up ($19.99 +4 reports).
  compare/             REVIEW. Plan-vs-plan comparison endpoint.
  cron/                KEEP. Scheduled jobs (ba-reminder, KV TTL sweeps).
  data/                KEEP. Loi 25 self-serve data export.
  export/              EXPAND. Add ?type=xlsx for the simulator's Excel.
  feedback/            KEEP. Star ratings + comments.
  health/              KEEP.
  optimize/            REVIEW. Strategy optimizer -- keep but document.
  planner/             EXPAND. State persistence (save / resume / list).
  profile/             KEEP. User profile read/update.
  referral/            KEEP.
  refund/              KEEP.
  regenerate-report/   KEEP. Decrements credits.
  request-data-action/ KEEP. Loi 25 action requests.
  simulate/            * EXPAND. Currently lightweight; becomes the engine entry point.
  webhook/             KEEP. Stripe -> MC -> AI -> render -> Blob -> Resend.
```

### New routes to add
```
app/api/
  simulate/v2/        New canonical engine endpoint with stable JSON contract.
  wizard/classify/    Returns which Mode-2 blocks to show given Mode-1 answers.
  wizard/save/        Persists wizard draft to KV (resume later).
  wizard/load/        Loads wizard draft.
  reports/list/       Lists user's reports (Blob URLs + metadata).
  reports/{id}/       Gets a specific report (with auth).
  credits/            GET aiCredits, POST top-up (links to checkout).
  account/            Unified account API (email, SKU, credits, subscription).
  analytics/          Server-side event tracking (replaces any client telemetry).
```

### Edge vs Node runtime split
- Edge runtime (cheap, fast): `health`, `auth/issue`, `analytics`, `feedback`.
- Node runtime (full): everything that touches the engine, Anthropic SDK,
  ExcelJS, Resend, or Stripe Node SDK.
- `simulate` MC runs are 5-15 s -- Node, with `maxDuration: 60` in
  `vercel.json`. May need to move to a queue eventually.

---

## 5. Wizard architecture (the new front-end)

### Three modes -- all front-end, but all client->server data flow
```
Mode 1 -- Classifier     ~5-8 questions    -> POST /api/wizard/classify
                                              <- {blocksToShow: [...], modeFlags}
Mode 2 -- Personalized   20-40 questions   -> field-level POST /api/wizard/save (debounced)
                                              -> final POST /api/simulate
                                              <- {mc, derived, charts, narrative}
Mode 3 -- Advanced       (Planner SKU)     -> field-level POST /api/wizard/save
                                              -> re-trigger /api/simulate
```

### What the front-end stores
- Local UI state only (current step, validation hints, theme).
- Wizard draft is **server-canonical** in KV under `wizard:{userId or sessionId}`.
  localStorage holds a 5-minute working copy for offline resilience but server is truth.

### Component layout (proposed)
```
app/
  (anon)/
    page.tsx                    Marketing landing
    guides/                     Guide 101, 201
    outils/                     Free tools (debt, decum simulator)
    quiz/                       Bilan 360 wizard (anonymous OK)
  (auth)/
    account/                    Account + credits
    reports/                    Report library
    wizard/                     Planner SKU wizard (sign-in required)
    simulator/                  Planner SKU live simulator (server-driven)
  api/                          (above)
```

---

## 6. Per-file disposition (current repo)

### `planner/planner_v3.html` (22,657 lines)
- **Phase 1**: extract engine + tax tables to a server module
  (`lib/engine/index.js` becomes full).
- **Phase 2**: replace the in-browser `<script>` tags for engine with
  fetch calls to `/api/simulate`.
- **Phase 3**: planner_v3.html becomes a **thin React shell** under
  `app/(auth)/simulator/page.tsx` -- UI only.
- **Phase 4**: retire `planner_v3.html`, `planner_longform.html`,
  `planner/sw.js`, `planner/manifest.json`. PWA shell moves to Next.js.

### `planner/report/*.js` (renderers)
- All stay server-side. After cutover the only browser consumer was
  planner_v3.html; once it's retired these files are *only* used by:
  - `lib/report-html-360.js` (production webhook renderer)
  - `realai/run-pipeline.mjs` (test pipeline)
- They could move to `lib/render/` for clarity, but that's cosmetic.
  Defer until end of split.

### `planner/report/realai/` (test pipeline)
- Stays. It's a server-side test harness for the renderer.

### `lib/`
- `lib/engine/index.js` -- promote to full engine.
- `lib/ai-prompt-360.ts`, `ai-prompt-expert.ts` -- keep, server-only.
- `lib/quiz-translator-360.ts`, `quiz-translator-expert.ts` -- used by
  webhook to translate quiz JSON -> engine params. Stays.
- `lib/report-html-360.js` -- production renderer. Stays.
- `lib/wizard/blocks.ts` -- extend with full block definitions for the new
  adaptive wizard.

### `app/`
- Most pages stay. New route group `(auth)/` for SKU-gated surfaces.
- New `app/(auth)/simulator/page.tsx` to replace `planner_v3.html`.
- New `app/(auth)/wizard/page.tsx` for the unified Wizard (replaces
  `quiz-360.html`).

---

## 7. Data contracts (the boundary)

### `/api/simulate` request
```json
{
  "v": 1,
  "wizardId": "wiz_abc",
  "params": { "...": "engine params, schema-validated" },
  "options": { "paths": 5000, "deterministic": false, "withAI": false }
}
```

### `/api/simulate` response
```json
{
  "v": 1,
  "mc": { "successRate": 0.87, "p5": [], "p50": [], "p95": [] },
  "derived": { "lifetimeGIS": 350000, "oasClawback": 0, "fhsaUsed": true },
  "charts": { "...": "JSON chart specs the front-end renders" },
  "phase": "decum",
  "ttlSeconds": 600,
  "cacheHit": false
}
```

### `/api/wizard/classify` response
```json
{
  "blocksToShow": ["primary", "spouse", "ccpc", "lira", "estate"],
  "phase": "transition",
  "isCouple": true,
  "estimatedQuestions": 32
}
```

Schemas live in `lib/schemas/` (zod). Front-end imports the *types* but
not the validators; server validates on every request.

---

## 8. Security & compliance boundaries

| Concern | Front-end | Back-end |
|---------|-----------|----------|
| Anthropic API key | never | env-var only |
| Stripe secret key | never | env-var only |
| Resend API key | never | env-var only |
| Engine constants | never source-of-truth | source-of-truth in `lib/constants/fiscal-2026.ts` |
| AMF prescriptive-language sanitizer | never | every AI response runs through `softenAISlot` before client sees it |
| Loi 25 export | UI only | `/api/data` returns the user's full record |
| CSP | already strict in `middleware.ts` | unchanged; tighten as engine moves off-browser (drop CDN exceptions) |
| Rate limiting | n/a | `lib/rate-limit.ts` per IP per route |

---

## 9. Migration phases

### Phase 0 -- preparation [DONE 2026-05-01]
- [DONE] Lock JSON contract for `/api/simulate` v1 in
  `lib/schemas/engine.ts` (SimulateRequest / SimulateResponse /
  EngineParams / MCSummary).
- [SKIPPED] "Move `report-engine.js` to `lib/engine/full.js`" was moot.
  `lib/engine/index.js` is already a full 2716-line canonical engine
  and `/api/simulate` already imports `runMC` from it.
  `planner/report/report-engine.js` is the realai-pipeline copy; stays.
- [DONE] Hand-rolled TS validator under `lib/schemas/engine.ts` (zod
  intentionally skipped to avoid the runtime dep -- same shape,
  fail-fast).
- [DONE] KV cache in `/api/simulate` -- 10-min TTL, namespace
  `sim:v1:{paramHash}`, skipped when `options.withAI === true`.
- [DONE] 17-case contract smoke test wired into `npm run qa:full`.

### Phase 1 -- Bilan 360 cutover (already done)
- Webhook -> translator -> MC -> AI -> renderer -> Blob -> email. [DONE]

### Phase 2 -- Wizard FE [PARTIAL DONE 2026-05-01]
- [DONE] Wizard page exists at `app/wizard/page.tsx` (predates this plan;
  uses the same `lib/wizard/blocks.ts` registry). Phase 2.0 backend wired.
- [DONE 2.1] Two-tier persistence: localStorage (5-min working copy) +
  KV via `/api/wizard/save` (90-day server-canonical draft per locked
  decision #4). draftId stored in localStorage as the access token.
- [DEFERRED] Mode 1 classifier currently runs client-side from
  `MODE1_QUESTIONS`. Wiring `/api/wizard/classify` instead is purely a
  network roundtrip the client can avoid -- the classifier is pure CPU.
  Calling the server only buys us per-block telemetry; not load-bearing
  for the split. Park.

### Phase 3 -- Planner cutover [STARTED 2026-05-01]
- [DONE 3.0] `/api/simulate` v1 contract live (Phase 0).
- [DONE 3.1] `app/simulateur/page.tsx` updated to v1 contract -- calls
  `/api/simulate` with `{v: 1, params, options: {paths}}`, parses
  `{v: 1, ok, mc, meta}` response. Legacy fallback retained for
  transitional callers.
- [PARKED] Replicate the full 190-param planner_v3 surface as a thin
  React shell. The current `app/simulateur/page.tsx` (3540 lines) already
  covers the simulator UX; it just needs feature parity with planner_v3
  before retirement. Park as separate work -- the contract is locked, the
  pieces can ship one panel at a time.
- [PARKED] Credit counter UI -- requires the `/api/credits/` route
  (Phase 2 plan, not yet built).

### Phase 4 -- Retire planner_v3 [BLOCKED ON USER VERIFICATION]
- [DONE prep] `planner/planner_v3.html` carries `meta robots noindex`
  and a deprecated title so search and bookmarks point users to
  `/simulateur` instead.
- [PENDING] Deletion list (NOT executed -- destructive, awaits OK):
  - `planner/planner_v3.html`
  - `planner/planner_longform.html`
  - `planner/sw.js`
  - `planner/manifest.json`
  - `planner/vendor/` (xlsx, exceljs CDN fallbacks)
  - inline engine constants mirror in planner_v3 (drift test will
    drop the planner_v3 check at the same time)
  - the cosmetic `planner/report/*.js` -> `lib/render/` move
- [VERIFY BEFORE DELETING] User checklist:
  1. `/simulateur` loads, runs a 1000-path MC, returns results.
  2. `/wizard` runs end-to-end (Mode 1 -> Mode 2 -> Stripe checkout
     for Bilan 360, or simulator handoff for Planner SKU).
  3. Existing customers reaching `/planner_v3.html` directly get the
     redirect / deprecation banner (the `noindex` plus deprecated
     title acts as a soft signal; no hard 301 yet).

### Phase 5 -- Polish [PARTIAL DONE 2026-05-01]
- [DONE] `app/manifest.ts` (Next 16 native manifest) -- replaces the
  legacy `planner/manifest.json`. Per locked decision #6 the simulator
  is NOT a PWA-installable offline app: `display: "browser"` and no
  service worker. The manifest exists for touch icons + add-to-homescreen
  bookmarks only.
- [PENDING] Full E2E pass once Phase 4 deletions are approved.

---

## 10. What stays the same (so we don't over-rebuild)

- **Stripe** integration: already correct.
- **Webhook** flow for Bilan 360: already correct (translator -> MC -> AI ->
  render -> Blob -> Resend).
- **Realai pipeline**: stays as the test harness for renderer + AI.
- **Editorial design system** (`lib/design/`): stays.
- **Guides 101 / 201**, **debt tool**, **decumulation simulator**: stay
  as they are (already React, already SKU-aware).
- **AMF sanitizer**, **constants-drift test**, **fiscal constants registry**:
  stay; just lose the `planner_v3.html` mirror at Phase 4.

---

## 11. Decisions locked (2026-05-01)

1. **Live simulator latency: full 5000-path MC every time + progress UI.**
   Match NaviPlan/Conquest pattern. No preview-then-full. Implementation
   must show a clear progress bar / hourglass during the 5-15 s wait so the
   user knows the system is working. No silent spinner. Drop the preview-MC
   path from the plan -- only one MC mode exists.

2. **Anonymous Bilan 360: keep anonymous, no account required to receive.**
   Friction kills conversions at the $29.99 click. Email-as-identity solves
   re-send and refund flows:
   - KV stores `email -> {reportBlobUrl, token, sku, purchasedAt}` with 1y TTL.
   - `/recover` page accepts email, sends a magic link to the stored token.
   - Anonymous -> account upgrade happens *on the report page itself* via a
     soft CTA: "Want to keep this report + unlock the Planner simulator?
     Create an account to claim it." Conversion happens at the moment of
     value, not before payment.
   - Account is REQUIRED for the Planner SKU ($69.99) since it has a
     persistent simulator + 5 AI credits to track.

3. **Charts split:**
   - Live simulator: client-side SVG rendered from JSON returned by
     `/api/simulate`. Instant updates on parameter changes.
   - Reports (HTML for email/print): server-side SVG inlined into the
     rendered HTML by `report-charts.js`. No JS needed for archived PDFs;
     deterministic output for the same inputs.
   - Same chart semantics + palette across both (percentile bands,
     gold/blue per editorial.css), different rendering site.

4. **Wizard draft TTL: 90 days.** KV `wizard:{userId or sessionId}` with
   `EXPIRE 7776000`. Cron `/api/cron/wizard-purge` is a no-op since KV
   handles expiry; cron only emits a daily metric.

5. **AI credit model: 5 credits one-time at purchase.** No automatic
   refresh. Future paid path: a "Planner Annual Update" SKU at $19.99
   that refills +5 credits AND extends simulator access for another year.
   Engineering: KV `user:{id}.aiCredits` is a counter; no scheduled refill
   logic. Top-up SKU just increments the counter.

6. **PWA / offline: drop entirely after Phase 4 cutover.** PWA adds
   nothing once the engine moves server-side -- IP protection comes from
   the API boundary, not from the shell wrapper. Delete `planner/sw.js`,
   `planner/manifest.json`, `planner/vendor/`. Simulator is online-only;
   that matches every other professional retirement-planning tool.

### Why PWA does NOT protect IP

A common assumption is that "PWA-installable" hides code. It does not.
Today the engine leaks because it's inlined as JavaScript in
`planner_v3.html` -- anyone can View Source. After cutover:
- Browser ships UI components + generic chart-rendering JS (low value).
- Fetch calls go to `/api/simulate`; JSON responses come back.
- Engine code never reaches the browser.

PWA only adds a home-screen install icon and (theoretically) offline
mode. Offline mode is impossible without putting the engine back in the
browser, which defeats the protection. So: drop PWA, the API boundary
*is* the IP boundary.

---

## 12. Risk register

| Risk | Severity | Mitigation |
|------|----------|------------|
| Engine constant drift between `planner_v3` and server during cutover | high | Keep drift test passing through Phase 3. Drop the planner mirror only at Phase 4. |
| MC latency degrades simulator UX | high | Decision #1 (locked): single 5000-path MC with explicit progress bar / hourglass. No silent spinner. |
| KV cost spike from per-keystroke saves | medium | Debounce wizard saves to 2 s idle. Use Upstash REST API not pipelined Redis. |
| Vercel function timeout on cold MC | medium | Warm a single instance with cron `/api/health`. |
| Auth state loss on Stripe redirect | medium | Use signed state cookie + KV session. |
| User abandons wizard mid-fill | low | Save-and-resume already in plan. |
| Bundle size regression on simulator page | medium | Code-split chart libs. Server returns chart-data JSON, not chart components. |

---

## 13. Out of scope (deliberately)

- Mobile app (iOS/Android native).
- Multi-tenant / B2B advisor portal.
- Multi-currency.
- Multi-jurisdiction beyond the 13 Canadian provinces/territories.
- Real-time collaboration (one wizard per user at a time).

If/when these come, the FE/BE split here is the foundation they assume.
