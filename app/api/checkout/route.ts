// /app/api/checkout/route.ts
// Creates a Stripe Checkout Session — supports 3 checkout types:
//   type=report (default): Ess/Inter/Expert report purchase with quiz data
//   type=addon: Expert AI export addon ($14.99)
//   type=second: 2nd report at 50% off (SECOND50 coupon)

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getExpertProfile, getReferral, redis } from "@/lib/kv";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || "https://www.buildfi.ca";

// Rate limit: max 10 checkout sessions per IP per 15 minutes
const RL_WINDOW_SEC = 15 * 60;
const RL_MAX = 10;

async function isCheckoutRateLimited(ip: string): Promise<boolean> {
  const key = `ratelimit:checkout:${ip}`;
  const now = Date.now();
  const timestamps: number[] = (await redis.get<number[]>(key)) || [];
  const recent = timestamps.filter((t) => now - t < RL_WINDOW_SEC * 1000);
  if (recent.length >= RL_MAX) return true;
  recent.push(now);
  await redis.set(key, recent, { ex: RL_WINDOW_SEC });
  return false;
}

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

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Missing required field: email" },
        { status: 400 }
      );
    }

    // Validate email format (RFC 5322 simplified)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 254) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Rate limit by IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isCheckoutRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests, please try again later" },
        { status: 429 }
      );
    }

    const checkoutType = type || "report";

    // Terms acceptance required for report and second (not addon — user already accepted at initial purchase)
    if (checkoutType !== "addon" && !body.termsAccepted) {
      return NextResponse.json(
        { error: "Terms acceptance required" },
        { status: 400 }
      );
    }

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
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "payment",
        customer_email: email,
        metadata: { type: "addon", email, tier: "expert" },
        success_url: `${BASE_URL}/merci?session_id={CHECKOUT_SESSION_ID}&tier=expert&lang=${body.lang || "fr"}`,
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
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      customer_email: email,
      metadata,
      success_url: `${BASE_URL}/merci?session_id={CHECKOUT_SESSION_ID}&tier=${selectedTier}&lang=${checkoutLang}`,
      cancel_url: `${BASE_URL}/`,
    };

    // Discount priority: upgrade > referral > launch promo
    // Stripe only allows one of discounts OR allow_promotion_codes per session
    if (body.upgradeFrom === "essentiel" || body.upgradeFrom === "intermediaire") {
      const existingProfile = await getExpertProfile(email);
      if (existingProfile) {
        checkoutParams.discounts = [
          { coupon: body.upgradeFrom === "essentiel" ? "UPGRADE_ESS" : "UPGRADE_INTER" },
        ];
      }
    } else if (referralCode) {
      const referralRecord = await getReferral(referralCode);
      if (
        referralRecord &&
        referralRecord.referrerEmail !== email.toLowerCase().trim()
      ) {
        checkoutParams.discounts = [{ coupon: "REFERRAL15" }];
      }
    } else if (selectedTier === "essentiel" || selectedTier === "intermediaire") {
      // Launch promo — auto-applied for Essentiel/Intermédiaire only
      // To end promo: delete or deactivate LAUNCH50 coupon in Stripe Dashboard
      checkoutParams.discounts = [{ coupon: "LAUNCH50" }];
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
