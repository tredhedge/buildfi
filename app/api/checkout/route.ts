// /app/api/checkout/route.ts
// Creates a Stripe Checkout Session — supports 3 checkout types:
//   type=report (default): Ess/Inter/Expert report purchase with quiz data
//   type=addon: Expert AI export addon ($14.99)
//   type=second: 2nd report at 50% off (SECOND50 coupon)

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.buildfi.ca";

// Stripe metadata values have a 500-char limit per key.
// Quiz answers are ~1.5KB JSON — split across 4 metadata keys if needed.
function splitMetadata(json: string): Record<string, string> {
  const chunks: Record<string, string> = {};
  const MAX = 490;
  for (let i = 0; i * MAX < json.length; i++) {
    chunks[`quiz_${i}`] = json.slice(i * MAX, (i + 1) * MAX);
  }
  chunks.quiz_chunks = String(Math.ceil(json.length / MAX));
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, type } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Missing required field: email" },
        { status: 400 }
      );
    }

    const checkoutType = type || "report";

    // ── Export AI addon ($14.99) ─────────────────────────
    if (checkoutType === "addon") {
      const priceId = process.env.STRIPE_PRICE_EXPORT_ADDON;
      if (!priceId) {
        return NextResponse.json(
          { error: "Export addon not configured" },
          { status: 500 }
        );
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "payment",
        customer_email: email,
        metadata: { type: "addon", email, tier: "expert" },
        success_url: `${BASE_URL}/merci?tier=expert&lang=fr`,
        cancel_url: `${BASE_URL}/expert`,
      });

      return NextResponse.json({ url: session.url });
    }

    // ── 2nd report at 50% off (SECOND50) ────────────────
    if (checkoutType === "second") {
      const { quizAnswers, lang, originalTier } = body;
      if (!quizAnswers) {
        return NextResponse.json(
          { error: "Missing quizAnswers for second report" },
          { status: 400 }
        );
      }

      const validTiers: Record<string, string | undefined> = {
        essentiel: process.env.STRIPE_PRICE_ESSENTIEL,
        intermediaire: process.env.STRIPE_PRICE_INTERMEDIAIRE,
      };

      const tier = originalTier || "essentiel";
      const priceId = validTiers[tier];
      if (!priceId) {
        return NextResponse.json(
          { error: `Invalid tier for second report: ${tier}` },
          { status: 400 }
        );
      }

      const quizJSON = JSON.stringify(quizAnswers);
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "payment",
        customer_email: email,
        discounts: [{ coupon: "SECOND50" }],
        metadata: {
          ...splitMetadata(quizJSON),
          lang: lang || "fr",
          email,
          tier,
          type: "second",
        },
        success_url: `${BASE_URL}/merci?session_id={CHECKOUT_SESSION_ID}&tier=${tier}&lang=${lang || "fr"}`,
        cancel_url: `${BASE_URL}/`,
      });

      return NextResponse.json({ url: session.url });
    }

    // ── Standard report checkout (Ess/Inter/Expert) ─────
    const { quizAnswers, lang, tier, referralCode } = body;

    if (!quizAnswers) {
      return NextResponse.json(
        { error: "Missing required field: quizAnswers" },
        { status: 400 }
      );
    }

    const validTiers: Record<string, string | undefined> = {
      essentiel: process.env.STRIPE_PRICE_ESSENTIEL,
      intermediaire: process.env.STRIPE_PRICE_INTERMEDIAIRE,
      expert: process.env.STRIPE_PRICE_EXPERT,
    };

    const selectedTier = tier || "essentiel";
    const priceId = validTiers[selectedTier];
    if (!priceId) {
      return NextResponse.json(
        { error: `Invalid tier: ${selectedTier}` },
        { status: 400 }
      );
    }

    const quizJSON = JSON.stringify(quizAnswers);
    const metadata: Record<string, string> = {
      ...splitMetadata(quizJSON),
      lang: lang || "fr",
      email,
      tier: selectedTier,
      type: "report",
    };

    // Referral code tracking
    if (referralCode && typeof referralCode === "string") {
      metadata.referralCode = referralCode;
    }

    // Upgrade credit (Expert purchased after Ess/Inter)
    if (body.upgradeFrom) {
      metadata.upgrade_from = body.upgradeFrom;
    }

    // Build checkout params
    const checkoutLang = lang || "fr";
    const checkoutParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      customer_email: email,
      metadata,
      success_url: `${BASE_URL}/merci?session_id={CHECKOUT_SESSION_ID}&tier=${selectedTier}&lang=${checkoutLang}`,
      cancel_url: `${BASE_URL}/`,
    };

    // Apply upgrade credit or referral discount (mutually exclusive — upgrade takes priority)
    if (body.upgradeFrom === "essentiel") {
      checkoutParams.discounts = [{ coupon: "UPGRADE_ESS" }];
    } else if (body.upgradeFrom === "intermediaire") {
      checkoutParams.discounts = [{ coupon: "UPGRADE_INTER" }];
    } else if (referralCode) {
      checkoutParams.discounts = [{ coupon: "REFERRAL15" }];
    }

    const session = await stripe.checkout.sessions.create(checkoutParams);
    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("Checkout error:", err);
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
