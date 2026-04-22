# Planner Front-End ↔ Back-End Contract

**Last updated** : 2026-04-22
**Scope** : How the Planner simulator (`planner_v3.html` running in an iframe inside `/app/expert/page.tsx`) communicates with the BuildFi backend.

---

## Architecture at a glance

```
Browser
┌──────────────────────────────────────────────────────────┐
│  /app/expert/page.tsx  (React wrapper, Next.js)          │
│  • Reads ?token= from URL                                │
│  • Calls /api/planner/credits to get credit count        │
│  • Shows header UI: credits counter, "Buy +4" button     │
│  • Hosts <iframe src="/planner-v3.html">                 │
│                                                          │
│  ─── postMessage bridge (same-origin) ───                │
│        ↓ (parent → iframe)                ↑ (iframe → parent)
│        • buildfi:set-credits              • buildfi:ready
│        • buildfi:load-scenario            • buildfi:request-generate-report
│        • buildfi:scenario-list            • buildfi:request-save-scenario
│                                           • buildfi:request-scenario-list
│                                           • buildfi:request-buy-pack
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  <iframe> planner_v3.html                          │ │
│  │  190+ variables, Wizard, Monte Carlo, charts       │ │
│  │  postMessage-based, no direct network calls        │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
       ↓ fetch (from parent only, never from iframe)
┌──────────────────────────────────────────────────────────┐
│  Next.js API routes                                      │
│  • GET  /api/planner/credits     → { creditsRemaining }  │
│  • POST /api/regenerate-report   → { reportUrl, credits }│
│  • GET/POST/DELETE /api/planner/scenarios               │
│  • POST /api/checkout (type=report-pack) → Stripe URL    │
└──────────────────────────────────────────────────────────┘
       ↓
┌──────────────────────────────────────────────────────────┐
│  Vercel KV (Upstash Redis)                               │
│  • expert:{email}       → full profile                   │
│  • token:{uuid}         → email (for magic link auth)    │
└──────────────────────────────────────────────────────────┘
```

**Rationale** : the iframe (Planner tool) never makes network calls itself. All backend traffic goes through the React parent, which holds the auth token. This keeps the Planner tool portable (works in demo mode too) and keeps auth out of the iframe where it'd be harder to secure.

---

## 1. Authentication

**Source of truth** : magic-link token in URL query param `?token=xxx`.

- After Planner purchase, user receives email with `/expert?token=abc123`.
- Page reads `?token=`, calls `/api/planner/credits?token=abc123` to validate.
- If invalid → show login prompt (enter email → request new magic link).
- If valid → proceed; token captured in `useRef` on first render (see existing pattern — the race-condition fix from 2026-03-08 still applies).

**Token lifecycle** :
- Created in webhook on Planner purchase. UUID v4. Stored in `token:{uuid} → email` with 366-day TTL.
- Invalidated via `/api/auth/logout` (not yet built).
- Also invalidated on password-equivalent events: deletion request, abuse flag, manual admin revoke.

---

## 2. postMessage bridge — message types

All messages use the shape:
```ts
{ source: "buildfi-planner", type: string, payload: any, id?: string }
```

- `source` = hardcoded `"buildfi-planner"` (filter to avoid noise from extensions, etc.)
- `type` = event name (see below)
- `payload` = event data
- `id` = optional correlation ID (for request/response matching)

### Parent → Iframe

| Event | Payload | When |
|---|---|---|
| `buildfi:set-credits` | `{ creditsRemaining: number }` | On page load, after /credits call completes, and after every regeneration |
| `buildfi:load-scenario` | `{ scenarioId: string, data: Record<string, unknown> }` | User selects a saved scenario from the portal UI |
| `buildfi:scenario-list` | `{ scenarios: SavedScenario[] }` | After fetching scenarios from /api/planner/scenarios |
| `buildfi:report-generated` | `{ reportUrl: string, creditsRemaining: number }` | After /api/regenerate-report succeeds |
| `buildfi:report-error` | `{ error: string, message: string }` | Regenerate failed (402 no credits, 500 server, etc.) |

### Iframe → Parent

| Event | Payload | Parent action |
|---|---|---|
| `buildfi:ready` | `{}` | Parent sends initial credits + scenario list |
| `buildfi:request-generate-report` | `{ wizardParams: Record<string, unknown>, lang: "fr" \| "en" }` | Parent calls /api/regenerate-report, forwards result via `buildfi:report-generated` or `:report-error` |
| `buildfi:request-save-scenario` | `{ name: string, data: Record<string, unknown>, id?: string }` | Parent calls /api/planner/scenarios (POST), forwards updated list |
| `buildfi:request-delete-scenario` | `{ id: string }` | Parent calls /api/planner/scenarios (DELETE), forwards updated list |
| `buildfi:request-scenario-list` | `{}` | Parent calls /api/planner/scenarios (GET), forwards list |
| `buildfi:request-buy-pack` | `{ email: string, lang: "fr" \| "en" }` | Parent calls /api/checkout (type=report-pack), redirects to Stripe URL |

### Security

- Parent validates `event.origin === window.location.origin` before acting on any iframe message.
- Iframe validates `event.source === window.parent` and `event.origin === window.location.origin`.
- Token never crosses the iframe boundary. Parent holds it, iframe only gets the wizardParams and echoes back requests.

---

## 3. API endpoints (parent → backend)

### `GET /api/planner/credits?token=xxx`

**Response 200** :
```json
{
  "ok": true,
  "creditsRemaining": 3,
  "accountType": "personal",
  "tier": "planner",
  "referralCode": "JFK2P9",
  "reportsGenerated": 2,
  "lastReport": {
    "id": "r_abc",
    "date": "2026-04-20T14:22:00Z",
    "blobUrl": "https://blob.vercel-storage.com/...",
    "aiStatus": "full"
  },
  "expiry": "2027-04-22T00:00:00Z",
  "email": "ma***@example.ca"
}
```

**Errors** :
- `401 { error: "Missing or invalid token" }`
- `401 { error: "Invalid or expired token" }`

### `POST /api/regenerate-report`

**Request** :
```json
{
  "token": "uuid",
  "params": { "age": 55, "retAge": 65, "rrsp": 400000, "...": "..." },
  "lang": "fr"
}
```

**Response 200** :
```json
{
  "success": true,
  "reportUrl": "https://blob.vercel-storage.com/bilan-planner-2026-04-22-abc.html",
  "creditsRemaining": 2,
  "grade": "B+",
  "successPct": 82
}
```

**Errors** :
- `401 { error: "Invalid or expired token" }`
- `402 { error: "no_credits_remaining", message: "...", creditsRemaining: 0 }` — user must buy more
- `429 { error: "rate_limited" }` — 3 regens in 10 min
- `500 { error: "regeneration_failed", message: "..." }`

### `GET /api/planner/scenarios?token=xxx` → list
### `POST /api/planner/scenarios` → save/update
```json
{ "token": "uuid", "name": "Scenario A", "data": {...}, "id": "optional-for-update" }
```
### `DELETE /api/planner/scenarios?token=xxx&id=yyy` → delete

All return `{ ok: true, scenarios: [...] }` on success.

### `POST /api/checkout` (type=report-pack)
```json
{ "email": "user@x.ca", "type": "report-pack", "lang": "fr" }
```
Returns Stripe Checkout Session URL. User is redirected, pays $19.99, webhook adds +4 credits.

---

## 4. Implementation checklist

### Parent side (`/app/expert/page.tsx`)
- [x] Read `?token=` from URL
- [x] Validate via `/api/planner/credits`
- [x] Show credits counter + "Buy +4 pack" CTA
- [ ] Mount iframe with src `/planner-v3.html` (served from `/planner` — TODO: move `planner_v3.html` to public)
- [ ] postMessage listener handling all `buildfi:*` events
- [ ] Dispatch `buildfi:set-credits` on mount + after every regeneration
- [ ] Dispatch `buildfi:scenario-list` on mount
- [ ] Handle `buildfi:request-*` events by calling the right API and echoing result

### Iframe side (`planner_v3.html`)
- [ ] On mount, `postMessage({ source: "buildfi-planner", type: "buildfi:ready" })` to parent
- [ ] Replace any direct API calls with `postMessage` requests
- [ ] Listen for `buildfi:set-credits` — update UI counter
- [ ] Listen for `buildfi:report-generated` — show success toast + link to report
- [ ] Listen for `buildfi:scenario-list` — populate saved-scenario dropdown
- [ ] When user clicks "Generate AI report" → `postMessage({ type: "buildfi:request-generate-report", payload: { wizardParams, lang } })`
- [ ] When user clicks "Save scenario" → `postMessage({ type: "buildfi:request-save-scenario", payload: { name, data } })`
- [ ] When user clicks "Buy +4 reports" → `postMessage({ type: "buildfi:request-buy-pack", payload: { email, lang } })`

---

## 5. Demo mode (optional, for public planner-v3.html access)

If Planner is accessed without a token (e.g., inline demo embed on marketing site):
- Parent may be absent (no iframe wrapper)
- Iframe detects `window.parent === window` → enters demo mode
- All features still work locally (MC runs client-side, scenarios in localStorage)
- AI report button is disabled with tooltip "Available with Planner purchase"
- Save scenario works in localStorage only

This keeps `planner_v3.html` portable for free marketing embeds without compromising auth.
