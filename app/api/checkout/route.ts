// /app/api/checkout/route.ts
// Creates a Stripe Checkout Session with quiz answers stored in metadata
// The quiz answers travel through Stripe metadata → webhook → MC engine

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // apiVersion auto-detected from stripe package
});

// Stripe metadata values have a 500-char limit per key.
// Quiz answers are ~1.5KB JSON — split across 4 metadata keys if needed.
function splitMetadata(json: string): Record<string, string> {
  const chunks: Record<string, string> = {};
  const MAX = 490; // leave room for safety
  for (let i = 0; i * MAX < json.length; i++) {
    chunks[`quiz_${i}`] = json.slice(i * MAX, (i + 1) * MAX);
  }
  chunks.quiz_chunks = String(Math.ceil(json.length / MAX));
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { quizAnswers, lang, email, tier } = body;

    // Validate required fields
    if (!quizAnswers || !email) {
      return NextResponse.json(
        { error: "Missing required fields: quizAnswers, email" },
        { status: 400 }
      );
    }

    // Validate tier
    const validTiers: Record<string, string> = {
      essentiel: process.env.STRIPE_PRICE_ESSENTIEL!,
      intermediaire: process.env.STRIPE_PRICE_INTERMEDIAIRE || "",
      expert: process.env.STRIPE_PRICE_EXPERT || "",
    };

    const selectedTier = tier || "essentiel";
    const priceId = validTiers[selectedTier];
    if (!priceId) {
      return NextResponse.json(
        { error: `Invalid tier: ${selectedTier}` },
        { status: 400 }
      );
    }

    // Serialize quiz answers into metadata
    const quizJSON = JSON.stringify(quizAnswers);
    const metadata = {
      ...splitMetadata(quizJSON),
      lang: lang || "fr",
      email: email,
      tier: selectedTier,
    };

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      customer_email: email,
      metadata,
      // Stripe Tax: automatically calculates TPS/TVQ for QC
      // automatic_tax: disabled until tax registration configured
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://buildfi.ca"}/merci?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://buildfi.ca"}/quiz`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("Checkout error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
