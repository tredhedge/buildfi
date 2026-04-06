# 07 — Stripe Payment Audit

## Payment Flow

```
User completes quiz
  → POST /api/checkout (quiz JSON in body)
  → Server creates Stripe Checkout Session
    - Price ID from env var (tier-specific)
    - Quiz data → splitMetadata() → quiz_0, quiz_1, ... (490-char chunks)
    - Coupon applied server-side if eligible (LAUNCH50, SECOND50, referral)
  → Redirect to Stripe hosted checkout page
  → User pays
  → Stripe fires checkout.session.completed webhook
  → POST /api/webhook processes the event
  → Report generated + delivered
  → User redirected to /merci (tier-aware thank you page)
```

## Products & Pricing

| Internal Key | Display Name | Price ID Env Var | Base Price | With LAUNCH50 |
|---|---|---|---|---|
| essentiel | Bilan / Snapshot | `STRIPE_PRICE_ESSENTIEL` | $29 | $14.50 |
| intermediaire | Bilan 360 / Snapshot 360 | `STRIPE_PRICE_INTERMEDIAIRE` | $59 | $29.50 |
| decaissement | Horizon | `STRIPE_PRICE_DECAISSEMENT` | $59 | $29.50 |
| expert | Laboratoire / Lab | `STRIPE_PRICE_EXPERT` | $129 | $64.50 |
| expert renewal | Renouvellement | `STRIPE_PRICE_EXPERT_RENEWAL` | $29/year | — |
| export addon | Export IA | `STRIPE_PRICE_EXPORT_ADDON` | $14.99 | — |

## Coupons

| Coupon | Discount | Applies to | Mechanism |
|--------|----------|-----------|-----------|
| LAUNCH50 | 50% off | All 4 tiers (first purchase) | Applied server-side in checkout |
| SECOND50 | 50% off | 2nd report (any tier) | Applied when `type=second` in checkout |
| Referral (15%) | 15% off | All tiers | Applied when `ref` param detected |

## Metadata Splitting

Stripe metadata values have a 500-character limit. Quiz JSON (especially Intermédiaire with 85 fields) exceeds this.

**Solution** (`lib/api-helpers.ts`):
```
splitMetadata(quizJSON):
  - Serialize quiz to JSON string
  - Split into 490-char chunks
  - Store as quiz_0, quiz_1, quiz_2, ...
  - Also store: tier, email, lang, type, ref (if referral)

reassembleQuizAnswers(metadata):
  - Read quiz_0, quiz_1, quiz_2, ...
  - Concatenate in order
  - Parse JSON
  - Return quiz answers object
```

## Webhook Processing

**Event**: `checkout.session.completed`

1. Verify Stripe webhook signature (`STRIPE_WEBHOOK_SECRET`)
2. Check idempotency (KV: `processed:{session_id}`)
3. Extract metadata (tier, email, lang, type)
4. Reassemble quiz answers
5. Route by tier:
   - `essentiel` → `translateToMC()` → `runMC(params, 5000)` → `buildAIPrompt()` → render
   - `intermediaire` → `translateToMCInter()` → `runMC()` + `run5Strategies()` → `buildAIPromptInter()` → render
   - `decaissement` → `translateToMCDecum()` → 6× `runMC()` → `buildAIPromptDecum()` → render
   - `expert` → create Expert profile in KV → send magic link email
   - `addon` → check quota → generate AI export
   - `renewal` → extend Expert profile expiry
6. Upload report HTML to Vercel Blob
7. Send delivery email (Resend)
8. Create feedback record + token (KV)
9. Mark session as processed (idempotency)

## Environment Variables

```
STRIPE_SECRET_KEY              # Stripe API key (server-side)
STRIPE_WEBHOOK_SECRET          # Webhook signature verification
STRIPE_PRICE_ESSENTIEL         # Price ID for Bilan
STRIPE_PRICE_INTERMEDIAIRE     # Price ID for Bilan 360
STRIPE_PRICE_DECAISSEMENT      # Price ID for Horizon
STRIPE_PRICE_EXPERT            # Price ID for Laboratoire
STRIPE_PRICE_EXPERT_RENEWAL    # Price ID for renewal ($29/yr)
STRIPE_PRICE_EXPORT_ADDON      # Price ID for AI export addon ($14.99)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  # Client-side (publishable only)
```

## Critical Rules

- Webhook URL: `https://www.buildfi.ca/api/webhook` (NOT `buildfi.ca` — 307 redirect loses POST body)
- Card numbers never seen or stored by BuildFi (Stripe handles PCI DSS Level 1)
- Terms acceptance validated server-side before creating checkout session
- Referral tracking: `ref` param stored in session metadata → tracked in KV on conversion

## Audit Checklist

- [ ] Webhook signature verified before any processing
- [ ] Idempotency prevents duplicate charges and reports
- [ ] All 6 price IDs configured in Vercel env vars
- [ ] LAUNCH50 correctly applies 50% discount
- [ ] SECOND50 correctly applies to 2nd report purchases only
- [ ] Metadata splitting handles quiz JSON of any size
- [ ] Metadata reassembly produces identical JSON to input
- [ ] Failed webhook processing doesn't charge customer without delivering report
- [ ] Webhook URL uses www.buildfi.ca (not bare domain)
- [ ] No PII logged in webhook error messages
