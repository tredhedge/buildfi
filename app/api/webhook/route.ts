// /app/api/webhook/route.ts
// Stripe webhook handler: payment confirmed → MC → PDF → Email
// This is the core pipeline that turns quiz answers into a delivered report.

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { translateToMC } from "@/lib/quiz-translator";
import { runMC } from "@/lib/engine";
import { extractReportData } from "@/lib/report-data";
import { renderReportHTML } from "@/lib/report-html";
import { calcCostOfDelay, calcMinViableReturn } from "@/lib/report-html";
import { generatePDF } from "@/lib/pdf-generator";
import { sendReportEmail } from "@/lib/email";
import { put } from "@vercel/blob";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

// Vercel serverless: allow 60s for MC + PDF generation
export const maxDuration = 60;

// Stripe requires raw body for signature verification
export const runtime = "nodejs";

function reassembleQuizAnswers(metadata: Record<string, string>): Record<string, unknown> {
  const chunks = parseInt(metadata.quiz_chunks || "1", 10);
  let json = "";
  for (let i = 0; i < chunks; i++) {
    json += metadata[`quiz_${i}`] || "";
  }
  return JSON.parse(json);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook signature verification failed";
    console.error("Webhook sig error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Only process completed checkout sessions
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata || {};

  try {
    // ─── Step 1: Extract quiz answers from metadata ───
    const quizAnswers = reassembleQuizAnswers(metadata);
    const lang = (metadata.lang || "fr") as "fr" | "en";
    const email = metadata.email || session.customer_email || "";
    const tier = metadata.tier || "essentiel";

    if (!email) {
      console.error("No email found in session", session.id);
      return NextResponse.json({ error: "No email" }, { status: 400 });
    }

    console.log(`[webhook] Processing ${tier} report for ${email} (${lang})`);

    // ─── Step 2: Translate quiz → MC params ───
    const params = translateToMC(quizAnswers);

    // ─── Step 3: Run Monte Carlo (5,000 simulations) ───
    const mcStart = Date.now();
    const mc = runMC(params, 5000);
    console.log(`[webhook] MC completed in ${Date.now() - mcStart}ms`);

    // ─── Step 4: Extract report data ───
    const D = extractReportData(mc, params);

    // ─── Step 5: Render report HTML ───
    // Full branded HTML with embedded CSS, SVG charts, DM Sans font
    const quiz = quizAnswers;
    const costDelay = calcCostOfDelay(params);
    const minReturn = calcMinViableReturn(params);
    const reportHTML = renderReportHTML(D, mc, quiz, lang, {}, costDelay, minReturn);

    // ─── Step 6: Generate PDF via Puppeteer ───
    const pdfStart = Date.now();
    const pdfBuffer = await generatePDF(reportHTML);
    console.log(`[webhook] PDF generated in ${Date.now() - pdfStart}ms (${Math.round(pdfBuffer.length / 1024)}KB)`);

    // ─── Step 7: Upload to Vercel Blob (30-day expiry) ───
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `rapport-${tier}-${timestamp}-${session.id.slice(-8)}.pdf`;

    const blob = await put(filename, pdfBuffer, {
      access: "public",
      contentType: "application/pdf",
      addRandomSuffix: true,
      // Note: Vercel Blob doesn't have native expiry; 
      // use a cron job to clean old blobs, or use signed URLs
    });

    console.log(`[webhook] PDF uploaded: ${blob.url}`);

    // ─── Step 8: Send email with PDF ───
    await sendReportEmail({
      to: email,
      lang,
      tier,
      pdfBuffer,
      pdfFilename: filename,
      downloadUrl: blob.url,
      grade: D.grade,
      successPct: D.successPct,
    });

    console.log(`[webhook] Email sent to ${email}`);

    return NextResponse.json({
      received: true,
      email,
      pdfUrl: blob.url,
    });
  } catch (err: unknown) {
    console.error("[webhook] Processing error:", err);
    // Don't return 500 to Stripe — it would retry.
    // Log the error and return 200 to acknowledge receipt.
    // TODO: Add dead letter queue / alert for failed deliveries
    return NextResponse.json({
      received: true,
      error: err instanceof Error ? err.message : "Processing failed",
    });
  }
}
