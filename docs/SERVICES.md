# SERVICES.md
> Accounts, infra config, DNS, payment and delivery flows.
> Mis a jour: 2026-03-12 - v10 (realigned)
> Never store secret values here (names only).

---

## 1. Active Accounts

### Cloudflare
- Domain: `buildfi.ca`
- DNS points to Vercel
- Keep public URLs on `https://www.buildfi.ca` to avoid redirect issues.

### Vercel
- Project: `buildfi`
- Runtime: Next.js serverless
- Auto-deploy from `main`

### GitHub
- Repo: private `tredhedge/buildfi`

### Stripe
- Mode currently: test
- Checkout + webhook live flow already in place

### Resend
- Domain verified
- Delivery active
- Warmup still recommended for inbox placement

### Vercel Blob
- Report storage active

### Vercel KV
- Active for Lab auth/profile/rate limits/quota

### Anthropic API
- AI narration active server-side

## 2. Canonical Product Catalog (Stripe target)
| Product | Price | Status |
|---|---|---|
| Bilan | 9.99 CAD one-time | To align/create |
| Bilan 360 | 19.99 CAD one-time | To align/create |
| Laboratoire | 49.99 CAD one-time | To align/create |
| Laboratoire renewal | 19.99 or 24.99 CAD/year | Final decision pending |

Lab includes simulator + AI reports (target range 5-10, final quota pending).

## 3. Environment Variables (canonical names)
| Variable | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe server operations |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client checkout key |
| `NEXT_PUBLIC_BASE_URL` | Must be `https://www.buildfi.ca` |
| `RESEND_API_KEY` | Transactional emails |
| `RESEND_FROM` | Sender identity |
| `BLOB_READ_WRITE_TOKEN` | Report uploads |
| `KV_REST_API_URL` | Redis endpoint |
| `KV_REST_API_TOKEN` | Redis auth |
| `ANTHROPIC_API_KEY` | AI narration |
| `NEXT_PUBLIC_POSTHOG_KEY` | Analytics |

Product price env vars to align with current catalog:
- `STRIPE_PRICE_BILAN`
- `STRIPE_PRICE_BILAN360`
- `STRIPE_PRICE_LABORATOIRE`
- `STRIPE_PRICE_LABORATOIRE_RENEWAL`

Note: legacy vars may still exist temporarily for backward compatibility during migration.

## 4. Transaction Flows

### Bilan and Bilan 360
quiz -> checkout API -> Stripe -> webhook -> MC + AI -> report render -> Blob -> Resend

### Laboratoire
quiz -> checkout API -> Stripe -> webhook -> KV profile + magic link
-> simulator workflows -> AI export pipeline

## 5. Email Requirements
- Delivery emails must match product naming and pricing exactly.
- No legacy labels in customer copy.
- FR/EN parity required.
- AI fallback-safe messaging required.

## 6. Product Policy
- No free-hub-first policy in core product docs.
- Product quality before website rollout.
- No mandatory upsell ladder between report products.

## 7. Open Decisions to Track
- Lab renewal final value: 19.99 or 24.99.
- Lab AI report quota final value: between 5 and 10.

Until locked:
- Keep config and copy parameterized.
- Avoid hardcoding irreversible values.
