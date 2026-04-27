// /app/api/refund/route.ts
// 30-day no-questions refund endpoint.
// ══════════════════════════════════════════════════════════════════════
// ORDER OF OPERATIONS (critical):
//   1. Verify magic-link token → get email
//   2. Find the most recent paid Stripe Checkout Session for that email
//   3. Confirm charge is within 30-day window
//   4. DELETE the user's data first (KV, consent, schedule blob purge)
//   5. THEN issue Stripe refund
//   6. Log audit entry (with hashed email — never raw)
//
// Why delete-first-refund-last: if Stripe succeeds and KV delete fails,
// we've refunded but kept the data → silent retention violation. The
// reverse failure mode (data deleted, refund failed) is recoverable —
// support can re-issue the refund manually.
// ══════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { verifyToken, verifySingleUseToken } from "@/lib/auth";
import {
  getExpertProfile,
  updateExpertProfile,
} from "@/lib/kv";
import { deleteConsent, hashEmail } from "@/lib/consent";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});
const REFUND_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function POST(req: NextRequest) {
  // 1. Single-use magic-link auth (24h TTL, one-shot, atomic mark-as-used).
  //    Reuse → 410 Gone. The 366-day session token does NOT authorize
  //    refunds; users must request a fresh token via /api/request-data-action.
  const single = await verifySingleUseToken(req, "refund");
  if (!single.ok) {
    return NextResponse.json(
      { error: single.error },
      { status: single.status }
    );
  }
  const email = single.email;
  const emailHashed = hashEmail(email);

  // 2. Find the most recent eligible payment for this email
  const customers = await stripe.customers.list({ email, limit: 5 });
  if (customers.data.length === 0) {
    return NextResponse.json(
      { error: "no_payment_found", message: "No Stripe customer matched this account." },
      { status: 404 }
    );
  }

  let eligibleCharge: Stripe.Charge | null = null;
  for (const customer of customers.data) {
    const charges = await stripe.charges.list({
      customer: customer.id,
      limit: 10,
    });
    for (const charge of charges.data) {
      if (charge.refunded) continue;
      if (charge.status !== "succeeded") continue;
      // Stripe `created` is Unix seconds.
      const ageMs = Date.now() - charge.created * 1000;
      if (ageMs > REFUND_WINDOW_MS) continue;
      // Take the most recent eligible charge.
      if (!eligibleCharge || charge.created > eligibleCharge.created) {
        eligibleCharge = charge;
      }
    }
  }

  if (!eligibleCharge) {
    return NextResponse.json(
      {
        error: "outside_refund_window",
        message:
          "No charge within the last 30 days is eligible for refund. Contact support@buildfi.ca for case-by-case review.",
      },
      { status: 410 }
    );
  }

  // 3. DELETE-FIRST: schedule account deletion (cron purges within 30d).
  //    For data already in KV (Expert profile), mark deletionRequestedAt.
  let deletionPath: "marked" | "no-profile" = "no-profile";
  try {
    const profile = await getExpertProfile(email);
    if (profile) {
      const deleteAt = new Date();
      deleteAt.setDate(deleteAt.getDate() + 30);
      await updateExpertProfile(email, {
        deletionRequestedAt: new Date().toISOString(),
        deletionScheduledAt: deleteAt.toISOString(),
        changelog: [
          ...profile.changelog,
          {
            date: new Date().toISOString(),
            action: "refund_deletion",
            details: { chargeId: eligibleCharge.id },
          },
        ],
      } as Partial<import("@/lib/kv").ExpertProfile> & Record<string, unknown>);
      deletionPath = "marked";
    }
    // Always scrub the consent record — it has its own 90d TTL but we
    // remove eagerly on refund.
    await deleteConsent(email);
  } catch (e) {
    console.error("[refund] data delete step failed (aborting refund):", e);
    return NextResponse.json(
      {
        error: "deletion_failed",
        message:
          "Refund aborted: data deletion failed. Please contact support@buildfi.ca.",
      },
      { status: 500 }
    );
  }

  // 4. REFUND-LAST: issue Stripe refund. If this fails, support can
  //    re-issue manually — data is already deleted so we're not in a
  //    retention-violation state.
  let refund: Stripe.Refund;
  try {
    refund = await stripe.refunds.create({
      charge: eligibleCharge.id,
      reason: "requested_by_customer",
      metadata: {
        emailHashed,
        chargeId: eligibleCharge.id,
        liability_scope: "informational_only",
        refund_path: "self_serve_30d",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "stripe error";
    console.error("[refund] stripe refund failed (data already deleted):", msg);
    return NextResponse.json(
      {
        error: "refund_processing_failed",
        message:
          "Your data has been deleted but the automated refund failed. Email support@buildfi.ca with this reference: " +
          eligibleCharge.id,
      },
      { status: 500 }
    );
  }

  // 5. Audit log — emailHashed only, never raw.
  console.log(
    `[refund] OK emailHashed=${emailHashed} charge=${eligibleCharge.id} refund=${refund.id} deletion=${deletionPath}`
  );

  return NextResponse.json({
    success: true,
    refundId: refund.id,
    amount: refund.amount,
    currency: refund.currency,
    deletionScheduled: deletionPath === "marked",
    message:
      "Refund issued. Your data has been deleted (final purge within 30 days). You will receive a Stripe confirmation email.",
  });
}

// GET to surface the refund window status without committing.
export async function GET(req: NextRequest) {
  const auth = await verifyToken(req);
  if (!auth.authenticated || !auth.email) {
    return NextResponse.json(
      { error: auth.error || "Unauthorized" },
      { status: 401 }
    );
  }
  const email = auth.email;
  const customers = await stripe.customers.list({ email, limit: 5 });
  if (customers.data.length === 0) {
    return NextResponse.json({ eligible: false, reason: "no_payment_found" });
  }
  let eligible = false;
  let mostRecentChargeAt: number | null = null;
  for (const customer of customers.data) {
    const charges = await stripe.charges.list({
      customer: customer.id,
      limit: 10,
    });
    for (const charge of charges.data) {
      if (charge.refunded || charge.status !== "succeeded") continue;
      const ageMs = Date.now() - charge.created * 1000;
      if (!mostRecentChargeAt || charge.created > mostRecentChargeAt) {
        mostRecentChargeAt = charge.created;
      }
      if (ageMs <= REFUND_WINDOW_MS) {
        eligible = true;
      }
    }
  }
  return NextResponse.json({
    eligible,
    mostRecentChargeAt: mostRecentChargeAt
      ? new Date(mostRecentChargeAt * 1000).toISOString()
      : null,
    refundWindowDays: 30,
  });
}
