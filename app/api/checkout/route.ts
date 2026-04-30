// /app/api/checkout/route.ts
// Creates a Stripe Checkout Session — supported checkout types:
//   type=report (default): Bilan 360 ($29.99) or Planner+Reports ($69.99)
//                          Bilan needs quizAnswers. Planner is direct checkout (Wizard inside).
//   type=addon: Expert AI export addon ($14.99) — legacy, kept for backward compat
//   type=second: 2nd Bilan 360 at 50% off (SECOND50 coupon)
//   type=report-pack: +4 AI report generations for $19.99 (existing Planner customers only)
//
// TIER KEYS (2026-04-22 2-SKU final):
//   bilan360 → $29.99  (STRIPE_PRICE_BILAN360)           — 1 AI report, needs quiz
//   planner  → $69.99  (STRIPE_PRICE_PLANNER)            — Simulator + 5 AI reports, no quiz
//   expert   → legacy, accepts STRIPE_PRICE_EXPERT fallback for backward compat

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getExpertProfile, getReferral, generateReferralCode, getFeedbackByEmail, redis } from "@/lib/kv";
import {
  CURRENT_POLICY_VERSION,
  validateConsentPayload,
  recordConsent,
} from "@/lib/consent";

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

function normalizeTier(rawTier?: string): string {
  const tier = (rawTier || "").toLowerCase().trim();
  if (!tier) return "bilan360";
  // Legacy aliases → bilan360
  if (tier === "essentiel" || tier === "intermediaire" || tier === "decaissement") {
    return "bilan360";
  }
  // Legacy alias: old "bilan360Plus" bundle concept → merged into planner
  if (tier === "bilan360plus") return "planner";
  return tier;
}

// Tiers that skip the quiz entry path — user goes straight to Stripe, data entry is inside the product
const DIRECT_CHECKOUT_TIERS = new Set(["planner"]);

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

    // Loi 25 / LPRPDE: server-side consent enforcement. The addon path
    // skips this — those buyers consented at their original checkout and
    // the consent record (90d TTL) is renewed on the addon's webhook.
    // For all other paid types, the client MUST send a consent payload
    // with the current policy version and a fresh acceptedAt timestamp.
    let consentValidated:
      | { policyVersion: string; acceptedAt: string }
      | null = null;
    if (checkoutType !== "addon") {
      try {
        consentValidated = validateConsentPayload(body.consent);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "consent invalid";
        return NextResponse.json(
          {
            error: "consent_required",
            message: msg,
            requiredPolicyVersion: CURRENT_POLICY_VERSION,
          },
          { status: 400 }
        );
      }
      // Record server-side. We hash the email + IP before storage so the
      // audit log doesn't carry raw PII. UA is truncated to 200 chars.
      try {
        await recordConsent({
          email,
          policyVersion: consentValidated.policyVersion,
          acceptedAt: consentValidated.acceptedAt,
          ip,
          userAgent: req.headers.get("user-agent") || "",
          context: { checkoutType, tier: String(body.tier || "") },
        });
      } catch (e) {
        console.error("[checkout] consent record failed:", e);
        // Block the checkout — without a consent record, we cannot ship.
        return NextResponse.json(
          { error: "consent_record_failed" },
          { status: 500 }
        );
      }
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

      // Addon users are Expert — fetch their existing referral code
      const existingProfile = await getExpertProfile(email);
      const addonRefCode = existingProfile?.referralCode || generateReferralCode();
      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "payment",
        customer_email: email,
        metadata: {
          type: "addon",
          email,
          tier: "expert",
          liability_scope: "informational_only",
          policyVersion: CURRENT_POLICY_VERSION,
        },
        success_url: `${BASE_URL}/merci?session_id={CHECKOUT_SESSION_ID}&tier=expert&lang=${body.lang || "fr"}&ref=${addonRefCode}`,
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

      // Gate: SECOND50 requires a submitted rating (feedback gate per strategy)
      const feedbackRecord = await getFeedbackByEmail(email);
      if (!feedbackRecord?.couponUnlocked) {
        return NextResponse.json(
          {
            error: "second_report_not_unlocked",
            message: "Le rabais 2e rapport est débloqué en soumettant une évaluation de votre premier rapport. / The second report discount unlocks after rating your first report.",
            feedbackToken: feedbackRecord?.token ?? null,
          },
          { status: 403 }
        );
      }

      const validTiers: Record<string, string | undefined> = {
        bilan360: process.env.STRIPE_PRICE_BILAN360 || process.env.STRIPE_PRICE_INTERMEDIAIRE,
      };

      const tier = normalizeTier(originalTier);
      const priceId = validTiers[tier];
      if (!priceId) {
        return NextResponse.json(
          { error: `Invalid tier for second report: ${tier}` },
          { status: 400 }
        );
      }

      // All tiers use SECOND50 coupon for second report
      const secondCoupon = "SECOND50";
      const quizJSON = JSON.stringify(quizAnswers);
      const secondRefCode = generateReferralCode();
      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "payment",
        customer_email: email,
        discounts: [{ coupon: secondCoupon }],
        metadata: {
          ...splitMetadata(quizJSON),
          lang: lang || "fr",
          email,
          tier,
          type: "second",
          userRefCode: secondRefCode,
          liability_scope: "informational_only",
          policyVersion: CURRENT_POLICY_VERSION,
        },
        success_url: `${BASE_URL}/merci?session_id={CHECKOUT_SESSION_ID}&tier=${tier}&lang=${lang || "fr"}&ref=${secondRefCode}`,
        cancel_url: `${BASE_URL}/`,
      });

      return NextResponse.json({ url: session.url });
    }

    // ── Report-pack upsell (+4 AI generations for $19.99, Planner customers only) ──
    if (checkoutType === "report-pack") {
      const priceId = process.env.STRIPE_PRICE_REPORT_PACK;
      if (!priceId) {
        return NextResponse.json({ error: "Report pack not configured" }, { status: 500 });
      }
      // Must be an existing Planner customer to buy more credits
      const profile = await getExpertProfile(email);
      if (!profile) {
        return NextResponse.json(
          { error: "report_pack_requires_planner", message: "Le pack de rapports est réservé aux clients Planner. / Report pack is for Planner customers only." },
          { status: 403 }
        );
      }
      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "payment",
        customer_email: email,
        metadata: {
          type: "report-pack",
          email,
          tier: "planner",
          creditsToAdd: "4",
          liability_scope: "informational_only",
          policyVersion: CURRENT_POLICY_VERSION,
        },
        success_url: `${BASE_URL}/expert?pack=ok&lang=${body.lang || "fr"}`,
        cancel_url: `${BASE_URL}/expert`,
      });
      return NextResponse.json({ url: session.url });
    }

    // ── Standard report checkout (Bilan or Planner) ─────
    const { quizAnswers, lang, tier, referralCode } = body;

    const validTiers: Record<string, string | undefined> = {
      bilan360: process.env.STRIPE_PRICE_BILAN360 || process.env.STRIPE_PRICE_INTERMEDIAIRE,
      planner: process.env.STRIPE_PRICE_PLANNER || process.env.STRIPE_PRICE_EXPERT,
      expert: process.env.STRIPE_PRICE_EXPERT, // legacy alias
    };

    const selectedTier = normalizeTier(tier);
    const priceId = validTiers[selectedTier];
    if (!priceId) {
      return NextResponse.json(
        { error: `Invalid tier: ${selectedTier}` },
        { status: 400 }
      );
    }

    const isDirectCheckout = DIRECT_CHECKOUT_TIERS.has(selectedTier);

    // Bilan and other quiz-based tiers require quiz data. Planner is direct-checkout (Wizard inside the tool).
    if (!isDirectCheckout && !quizAnswers) {
      return NextResponse.json(
        { error: "Missing required field: quizAnswers" },
        { status: 400 }
      );
    }

    const userRefCode = generateReferralCode();
    const metadata: Record<string, string> = {
      lang: lang || "fr",
      email,
      tier: selectedTier,
      type: "report",
      userRefCode,
      liability_scope: "informational_only",
      policyVersion: CURRENT_POLICY_VERSION,
    };

    // Attach quiz data only when present (Bilan path)
    if (quizAnswers) {
      const quizJSON = JSON.stringify(quizAnswers);
      Object.assign(metadata, splitMetadata(quizJSON));
    }

    // Planner purchases init 5 AI report credits (webhook reads this)
    if (selectedTier === "planner") {
      metadata.aiCreditsInit = "5";
    }

    // Referral code tracking (the referrer's code, not this user's own code)
    if (referralCode && typeof referralCode === "string") {
      metadata.referralCode = referralCode;
    }

    // Upgrade credit (Expert purchased after Ess/Inter)
    if (body.upgradeFrom) {
      metadata.upgrade_from = body.upgradeFrom;
    }

    // Build checkout params
    const checkoutLang = lang || "fr";
    // Planner buyers land on /expert (their portal with Wizard). Bilan buyers land on /merci (report delivery).
    const successPath = selectedTier === "planner" ? "/expert" : "/merci";
    const checkoutParams: Stripe.Checkout.SessionCreateParams = {
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      customer_email: email,
      metadata,
      success_url: `${BASE_URL}${successPath}?session_id={CHECKOUT_SESSION_ID}&tier=${selectedTier}&lang=${checkoutLang}&ref=${userRefCode}`,
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
    } else {
      // Launch promo — auto-applied for all tiers including Décaissement
      // To end promo: delete or deactivate LAUNCH50 coupon in Stripe Dashboard
      checkoutParams.discounts = [{ coupon: "LAUNCH50" }];
    }

    const session = await stripe.checkout.sessions.create(checkoutParams);
    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: "Checkout session creation failed. Please try again." }, { status: 500 });
  }
}
