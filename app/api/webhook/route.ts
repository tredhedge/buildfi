// /app/api/webhook/route.ts
// Stripe webhook handler: payment confirmed -> MC -> Report HTML -> Email
// PDF generation disabled until Chromium resolved on Vercel

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import Anthropic from "@anthropic-ai/sdk";
import { translateToMC } from "@/lib/quiz-translator";
import { translateToMCInter } from "@/lib/quiz-translator-inter";
import { runMC } from "@/lib/engine";
import { renderReportHTML, calcCostOfDelay as calcCostOfDelayEss, calcMinViableReturn as calcMinViableReturnEss, extractReportData, buildAIPrompt } from "@/lib/report-html";
import { run5Strategies, calcCostOfDelay, calcMinViableReturn } from "@/lib/strategies-inter";
import { extractReportDataInter, renderReportHTMLInter } from "@/lib/report-html-inter";
import { buildAIPromptInter } from "@/lib/ai-prompt-inter";
import { sendReportEmail } from "@/lib/email";
import { put } from "@vercel/blob";
import { sanitizeAISlots, sanitizeAISlotsInter } from "@/lib/ai-constants";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});

// Vercel serverless: allow 60s for MC generation
export const maxDuration = 60;
export const runtime = "nodejs";

// AI narration: call Anthropic, return {} on any failure (report works without AI)
async function callAnthropic<T extends Record<string, string | undefined>>(
  sys: string,
  usr: string,
  sanitizer: (raw: Record<string, any>) => T
): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log("[webhook] ANTHROPIC_API_KEY not set, skipping AI narration");
    return {} as T;
  }
  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: sys,
      messages: [{ role: "user", content: usr }],
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const cleaned = text.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    const raw = JSON.parse(cleaned);
    const slots = sanitizer(raw);
    console.log(`[webhook] AI narration: ${Object.keys(slots).length} slots filled`);
    return slots;
  } catch (err) {
    console.error("[webhook] AI narration failed, using fallbacks:", err);
    return {} as T;
  }
}

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

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata || {};

  try {
    const quizAnswers = reassembleQuizAnswers(metadata);
    const lang = (metadata.lang || "fr") as "fr" | "en";
    const email = metadata.email || session.customer_email || "";
    const tier = metadata.tier || "essentiel";

    if (!email) {
      console.error("No email found in session", session.id);
      return NextResponse.json({ error: "No email" }, { status: 400 });
    }

    console.log(`[webhook] Processing ${tier} report for ${email} (${lang})`);

    const fr = lang === "fr";
    let reportHTML: string;
    let D: Record<string, any>;

    if (tier === "intermediaire") {
      // ── Intermédiaire pipeline ────────────────────────────────
      // Step 2: Translate quiz → MC params (Inter — 85 fields → 120 params)
      const params = translateToMCInter(quizAnswers);

      // Step 3: Run MC (5,000 sims) + 5 strategies (5×500 sims)
      const mcStart = Date.now();
      const mc = runMC(params, 5000);
      const stratData = run5Strategies(params as any);
      const costDelay = calcCostOfDelay(params as any);
      const minReturn = calcMinViableReturn(params as any);
      console.log(`[webhook] MC + strategies completed in ${Date.now() - mcStart}ms`);

      // Step 4: Extract report data (Inter — 16 sections)
      D = extractReportDataInter(mc, params);

      // Step 4.5: AI Narration (Inter — 18 slots)
      const aiStart = Date.now();
      const quiz = params._quiz || {};
      const prompt = buildAIPromptInter(D, params, fr, quiz, stratData);
      const ai = await callAnthropic(prompt.sys, prompt.usr, sanitizeAISlotsInter);
      console.log(`[webhook] AI narration completed in ${Date.now() - aiStart}ms`);

      // Step 5: Render report HTML (Inter)
      reportHTML = renderReportHTMLInter(D, mc, stratData, params, lang, ai, costDelay, minReturn);

    } else {
      // ── Essentiel pipeline (unchanged) ────────────────────────
      // Step 2: Translate quiz → MC params
      const params = translateToMC(quizAnswers);

      // Step 3: Run Monte Carlo (5,000 simulations)
      const mcStart = Date.now();
      const mc = runMC(params, 5000);
      console.log(`[webhook] MC completed in ${Date.now() - mcStart}ms`);

      // Step 4: Extract report data
      D = extractReportData(mc, params);

      // Step 4.5: AI Narration
      const aiStart = Date.now();
      const prompt = buildAIPrompt(D, params, fr, quizAnswers);
      const ai = await callAnthropic(prompt.sys, prompt.usr, sanitizeAISlots);
      console.log(`[webhook] AI narration completed in ${Date.now() - aiStart}ms`);

      // Step 5: Render report HTML
      const costDelay = calcCostOfDelayEss(params);
      const minReturn = calcMinViableReturnEss(params);
      reportHTML = renderReportHTML(D, mc, quizAnswers, lang, ai, costDelay, minReturn);
    }

    // ── Shared Steps 6-7 (both tiers) ──────────────────────────
    // Step 6: Upload HTML report to Vercel Blob (30-day expiry)
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `rapport-${tier}-${timestamp}-${session.id.slice(-8)}.html`;

    const blob = await put(filename, reportHTML, {
      access: "public",
      contentType: "text/html; charset=utf-8",
      addRandomSuffix: true,
    });

    console.log(`[webhook] Report uploaded: ${blob.url}`);

    // Step 7: Send email with download link
    await sendReportEmail({
      to: email,
      lang,
      tier,
      downloadUrl: blob.url,
      grade: D.grade,
      successPct: D.successPct,
    });

    console.log(`[webhook] Email sent to ${email}`);

    return NextResponse.json({
      received: true,
      email,
      reportUrl: blob.url,
    });
  } catch (err: unknown) {
    console.error("[webhook] Processing error:", err);
    return NextResponse.json({
      received: true,
      error: err instanceof Error ? err.message : "Processing failed",
    });
  }
}
