# 06 — API Routes Audit

## Overview

23 API routes under `app/api/`. All server-side (Next.js route handlers). No client-side API keys.

## Core Payment & Pipeline (3 routes)

### POST `/api/checkout` — `app/api/checkout/route.ts`
- Creates Stripe Checkout Session
- Types: `report` (new purchase), `addon` (AI export), `second` (2nd report with SECOND50)
- Rate limit: 10 requests per 15 minutes per IP
- Email validation, tier validation
- `splitMetadata()`: Quiz JSON split across quiz_0..quiz_N (490-char Stripe limit)
- Applies LAUNCH50 / SECOND50 coupons server-side
- Terms acceptance validation (CPA compliance)

### POST `/api/webhook` — `app/api/webhook/route.ts`
- Stripe webhook handler — **full pipeline orchestrator**
- Event: `checkout.session.completed`
- Idempotency: checks KV for `processed:{session_id}`
- Pipeline: reassemble quiz → route tier → translate → MC → AI → sanitize → render → Blob → email → feedback token
- Handles all 4 tiers + addon + renewal
- **CRITICAL**: URL must be `https://www.buildfi.ca/api/webhook` (not buildfi.ca — 307 redirect loses POST body)

### GET `/api/auth/verify` — `app/api/auth/verify/route.ts`
- Token verification (query param `?token=`)
- Returns Expert profile summary + email
- UUID format validation + expiry check

## Expert Tier (5 routes)

### POST `/api/auth/magic-link` — `app/api/auth/magic-link/route.ts`
- Generate + send fresh magic link for Expert login
- Rate limited (3 per hour per email)

### GET/POST `/api/profile` — `app/api/profile/route.ts`
- GET: Fetch Expert profile (saved state, quiz data, export credits)
- POST: Update profile (save simulator state)
- Auth: Bearer token required

### POST `/api/simulate` — `app/api/simulate/route.ts`
- Run MC simulation from Expert simulator
- 1,000 sims (screening) or 5,000 (formal export)
- Rate limited: 100 recalcs/day
- Auth: Bearer token required

### POST `/api/optimize` — `app/api/optimize/route.ts`
- Expert auto-optimize (scenario discovery)
- Runs multiple MC scenarios to find optimal parameter combinations
- Auth: Bearer token required

### POST `/api/compare` — `app/api/compare/route.ts`
- Scenario comparison (driver attribution, sensitivity analysis)
- Compares baseline vs modified scenarios
- Auth: Bearer token required

## Cron Jobs (4 routes)

### GET `/api/cron/feedback` — Daily
- Send J+3/J+7/J+14 feedback survey emails
- Scans KV for eligible feedback records
- Tiers: Essentiel, Intermédiaire, Décaissement

### GET `/api/cron/renewal` — Daily
- Expert renewal email sequence: J-30, J-7, J-0 (expiry), J+3 (grace)
- Scans KV for Expert profiles nearing anniversary

### GET `/api/cron/anniversary` — Monthly
- 6-month Expert check-in suggestion
- Prompts annual review

### GET `/api/cron/constants-check` — Weekly
- Drift detection: compare engine constants to 2026 tax year baseline
- Alerts if brackets, thresholds, or rates have changed

## Export & Data (3 routes)

### POST `/api/export` — `app/api/export/route.ts`
- Expert AI export (1-page resume of current simulation)
- Quota check: 5 exports year 1, 3 on renewal
- Decrements credit after successful generation

### GET `/api/data/export` — `app/api/data/export/route.ts`
- Download saved Expert profile as JSON

### POST `/api/data/delete` — `app/api/data/delete/route.ts`
- GDPR/Law 25 deletion: purge Expert profile + feedback records from KV

## Utility (3 routes)

### GET `/api/health` — `app/api/health/route.ts`
- System health check (Stripe, KV, Blob connectivity)

### GET `/api/admin/stats` — `app/api/admin/stats/route.ts`
- Admin dashboard data (profiles, email stats, activity log)

### GET `/api/referral/generate` — `app/api/referral/generate/route.ts`
- Fetch/generate referral link (15% off for referred users)
- Returns referral stats (conversions, clicks)

## Other (2 routes)

### POST `/api/bilan-annuel` — `app/api/bilan-annuel/route.ts`
- Expert annual check-up: 7-field input → MC → 9-page comparative report
- Not quota-limited (included in subscription)
- **MISSING**: January cron job to trigger this automatically

### GET/POST `/api/feedback` + `/api/feedback/[token]`
- Submit feedback (5-star + comment)
- Fetch feedback record by token (pre-fill survey page)

## Audit Checklist

- [ ] All routes validate authentication where required (Bearer token)
- [ ] Rate limiting enforced on all user-facing endpoints
- [ ] Webhook verifies Stripe signature before processing
- [ ] Idempotency prevents duplicate report generation
- [ ] No API keys in response bodies
- [ ] CORS headers appropriate (no wildcard on authenticated routes)
- [ ] Error responses don't leak internal details
- [ ] All cron routes protected (Vercel cron secret or IP check)
- [ ] GDPR delete route actually purges all user data from KV
