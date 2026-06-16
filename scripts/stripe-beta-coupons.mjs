#!/usr/bin/env node
/*
  scripts/stripe-beta-coupons.mjs
  ─────────────────────────────────────────────────────────────────────────────
  Creates two 100%-off Stripe coupons for the friends / beta-tester program:
    • one scoped to the Bilan 360 product  (free report)
    • one scoped to the Planner product     (free Planner)

  A 100%-off coupon makes Stripe Checkout total $0; the session still completes
  and fires checkout.session.completed, so the existing webhook fulfils the order
  exactly like a paid one (the webhook does not gate on amount).

  "Once per user" is enforced app-side in /api/checkout (atomic NX reserve on
  `beta:redeemed:{CODE}:{email}` in KV), so a single shareable code per product
  can be redeemed only once per email. The coupons themselves are left without a
  global max_redemptions; pass MAX_REDEMPTIONS to cap the whole beta if you want.

  Run (bash):
    STRIPE_SECRET_KEY=sk_live_xxx \
    STRIPE_PRICE_BILAN360=price_xxx \
    STRIPE_PRICE_PLANNER=price_xxx \
    node scripts/stripe-beta-coupons.mjs

  Run (PowerShell):
    $env:STRIPE_SECRET_KEY="sk_live_xxx"; $env:STRIPE_PRICE_BILAN360="price_xxx"; `
    $env:STRIPE_PRICE_PLANNER="price_xxx"; node scripts/stripe-beta-coupons.mjs

  Idempotent: re-running reuses any coupon tagged metadata.bf_beta=<tier>.
  ─────────────────────────────────────────────────────────────────────────────
*/
import Stripe from "stripe";

const KEY = process.env.STRIPE_SECRET_KEY;
if (!KEY) {
  console.error("✗ STRIPE_SECRET_KEY is required.");
  process.exit(1);
}
const stripe = new Stripe(KEY, {});
const MAX_REDEMPTIONS = process.env.MAX_REDEMPTIONS ? parseInt(process.env.MAX_REDEMPTIONS, 10) : undefined;

const TARGETS = [
  { tier: "bilan360", label: "Beta — free Bilan 360", priceEnv: "STRIPE_PRICE_BILAN360" },
  { tier: "planner", label: "Beta — free Planner", priceEnv: "STRIPE_PRICE_PLANNER" },
];

async function productIdForPrice(priceId) {
  const price = await stripe.prices.retrieve(priceId);
  return typeof price.product === "string" ? price.product : price.product.id;
}

async function findExistingCoupon(tier) {
  // Coupons can't be queried by metadata server-side; scan the most recent page.
  const list = await stripe.coupons.list({ limit: 100 });
  return list.data.find((c) => c.metadata && c.metadata.bf_beta === tier && c.valid) || null;
}

async function ensureCoupon({ tier, label, priceEnv }) {
  const priceId = process.env[priceEnv];
  if (!priceId) {
    console.warn(`⚠ ${priceEnv} not set — skipping ${tier}.`);
    return null;
  }
  const existing = await findExistingCoupon(tier);
  if (existing) {
    console.log(`• Reusing coupon for ${tier}: ${existing.id}`);
    return existing.id;
  }
  const productId = await productIdForPrice(priceId);
  const coupon = await stripe.coupons.create({
    name: label,
    percent_off: 100,
    duration: "once",
    applies_to: { products: [productId] },
    ...(MAX_REDEMPTIONS ? { max_redemptions: MAX_REDEMPTIONS } : {}),
    metadata: { bf_beta: tier },
  });
  console.log(`✓ Created coupon for ${tier}: ${coupon.id}  (100% off, product ${productId})`);
  return coupon.id;
}

(async () => {
  const out = {};
  for (const target of TARGETS) {
    const id = await ensureCoupon(target);
    if (id) out[target.tier] = id;
  }
  console.log("\n─── Set these env vars (Vercel + .env.local) ───");
  if (out.bilan360) console.log(`BETA_COUPON_BILAN=${out.bilan360}`);
  if (out.planner) console.log(`BETA_COUPON_PLANNER=${out.planner}`);
  console.log("BETA_CODE_BILAN=FRIENDS360        # the code you hand out for a free Bilan");
  console.log("BETA_CODE_PLANNER=FRIENDSLAB      # the code you hand out for a free Planner");
  console.log("\nShare links:");
  console.log("  Free Bilan   → https://www.buildfi.ca/wizard?beta=FRIENDS360");
  console.log("  Free Planner → https://www.buildfi.ca/acheter-planner?beta=FRIENDSLAB");
})().catch((e) => {
  console.error("✗ Failed:", e.message);
  process.exit(1);
});
