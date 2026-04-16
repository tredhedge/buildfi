// /app/api/webhook/route.ts
// Stripe webhook handler — routes to tier-specific pipelines
// Events: checkout.session.completed, customer.subscription.updated
// Expert additions: KV profile creation, magic link, referral tracking, addon credits

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import Anthropic from "@anthropic-ai/sdk";
import { translateToMCExpert } from "@/lib/quiz-translator-expert";
import { translateBilan360 } from "@/lib/quiz-translator-360";
import { runMC } from "@/lib/engine";
import { run5Strategies, calcCostOfDelay, calcMinViableReturn } from "@/lib/strategies-inter";
import { determinePhase, extractReportData360, renderReportHTML360 } from "@/lib/report-html-360";
import { buildAIPrompt360 } from "@/lib/ai-prompt-360";
import { buildBuildFiData } from "@/lib/report-data-360";
import { sendReportEmail } from "@/lib/email";
import { put } from "@vercel/blob";
import { sanitizeAISlotsExpert, sanitizeAISlots360 } from "@/lib/ai-constants";
import { extractReportDataExpert, renderReportHTMLExpert } from "@/lib/report-html-expert";
import { buildExpertPromptBatches, detectExpertSections } from "@/lib/ai-prompt-expert";
import type { ExpertAINarration } from "@/lib/ai-constants";
import {
  createExpertProfile,
  getExpertProfile,
  updateExpertProfile,
  setTokenIndex,
  getReferral,
  incrementReferralConversion,
  incrementExportCredit,
  renewExpertProfile,
  markProcessed,
  unmarkProcessed,
  createFeedbackRecord,
  createReferralRecord,
  getFeedbackByEmail,
} from "@/lib/kv";
import { randomUUID } from "crypto";
import { sendMagicLinkEmail, sendExpertDeliveryEmail, sendAdminAlert, sendReferralUpgradeEmail } from "@/lib/email-expert";
import { sendReferralConversionEmail } from "@/lib/email-feedback";
import { buildMagicLinkUrl, maskEmail } from "@/lib/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});

// Vercel serverless: allow 120s for Expert pipeline (MC + 4 AI batches)
export const maxDuration = 120;
export const runtime = "nodejs";

// ── AI narration ──────────────────────────────────────────

async function callAnthropic<T extends Record<string, string | undefined>>(
  sys: string,
  usr: string,
  sanitizer: (raw: Record<string, unknown>) => T,
  modelOverride?: string,
  maxTokens?: number
): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log("[webhook] ANTHROPIC_API_KEY not set, skipping AI narration");
    return {} as T;
  }
  try {
    const client = new Anthropic({ apiKey });
    const model = modelOverride || "claude-sonnet-4-20250514";
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens || 4000,
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

// ── Quiz reassembly ───────────────────────────────────────

function reassembleQuizAnswers(
  metadata: Record<string, string>
): Record<string, unknown> {
  const chunks = parseInt(metadata.quiz_chunks || "1", 10);
  if (isNaN(chunks) || chunks < 1 || chunks > 10) {
    throw new Error(`Invalid quiz_chunks value: ${metadata.quiz_chunks}`);
  }
  let json = "";
  for (let i = 0; i < chunks; i++) {
    json += metadata[`quiz_${i}`] || "";
  }
  try {
    return JSON.parse(json);
  } catch {
    throw new Error(`Malformed quiz JSON after reassembly (${json.length} chars, ${chunks} chunks)`);
  }
}

function normalizeReportTier(rawTier?: string): string {
  const tier = (rawTier || "").toLowerCase().trim();
  if (!tier) return "bilan360";
  // Legacy tiers all route to bilan360
  if (tier === "essentiel" || tier === "intermediaire" || tier === "decaissement") {
    return "bilan360";
  }
  return tier;
}

// ── Main webhook handler ──────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET not set — rejecting");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Webhook signature verification failed";
    console.error("Webhook sig error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // ── Route by event type ─────────────────────────────────
  if (event.type === "checkout.session.completed") {
    return handleCheckoutCompleted(event);
  }

  if (event.type === "customer.subscription.updated") {
    return handleSubscriptionUpdated(event);
  }

  return NextResponse.json({ received: true });
}

// ── Checkout completed ────────────────────────────────────

async function handleCheckoutCompleted(
  event: Stripe.Event
): Promise<NextResponse> {
  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata || {};
  const type = metadata.type || "report";
  const tier = normalizeReportTier(metadata.tier);
  const email = metadata.email || session.customer_email || "";

  if (!email) {
    console.error("No email found in session", session.id);
    return NextResponse.json({ error: "No email" }, { status: 400 });
  }

  // Idempotency: skip if already processed (read-only check + atomic set on success)
  const isNew = await markProcessed(session.id);
  if (!isNew) {
    console.log(`[webhook] Session ${session.id} already processed, skipping`);
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Referral tracking (applies to any purchase, non-blocking)
  if (metadata.referralCode) {
    await handleReferralConversion(metadata.referralCode, email).catch((err) =>
      console.error("[webhook] Referral tracking error (non-blocking):", err)
    );
  }

  // Route by checkout type
  if (type === "addon") {
    return handleExportAddon(email, session.id);
  }

  if (tier === "expert" && type === "report") {
    return handleExpertPurchase(email, metadata, session.id);
  }

  if (tier === "bilan360") {
    return handleBilan360Purchase(email, metadata, session.id);
  }

  // Unknown tier — log and return error
  console.error(`[webhook] Unknown tier: ${tier}`);
  return NextResponse.json({ error: `Unknown tier: ${tier}` }, { status: 400 });
}

// ── Bilan 360 purchase handler ───────────────────────────

async function handleBilan360Purchase(
  email: string,
  metadata: Record<string, string>,
  sessionId: string
): Promise<NextResponse> {
  try {
    const quizAnswers = reassembleQuizAnswers(metadata);
    const lang = (metadata.lang || "fr") as "fr" | "en";
    const fr = lang === "fr";
    const quiz = quizAnswers as Record<string, any>;

    // Determine life phase from quiz answers (DA-01)
    const age = Number(quiz.age) || 30;
    const retAge = Number(quiz.retAge) || 65;
    const phase = determinePhase(age, retAge);

    console.log(`[webhook] Processing Bilan 360 (${phase}) for ${maskEmail(email)} (${lang})`);

    const params = translateBilan360(quiz, phase);
    const mcStart = Date.now();

    // ── Run 1: Baseline (5,000 sims) ─────────────────────
    const mcBase = runMC(params, 5000);
    if (!mcBase) throw new Error("Bilan 360 MC baseline returned null");

    // ── Phase-conditional extra runs ─────────────────────
    let stratData: any[] | null = null;
    let mcMelt1: Record<string, any> | null = null;
    let mcMelt2: Record<string, any> | null = null;
    let mcC60: Record<string, any> | null = null;
    let mcC65: Record<string, any> | null = null;
    let mcC70: Record<string, any> | null = null;

    // ACCUM + TRANSITION: run 5 strategies
    if (phase === "ACCUM" || phase === "TRANSITION") {
      stratData = run5Strategies(params as any);
    }

    // TRANSITION + DECUM: meltdown scenarios (2×1000)
    if (phase === "TRANSITION" || phase === "DECUM") {
      const meltTarget: number = (params._report as any)?.meltTarget ?? 58523;
      const meltIsBase = !!((params._report as any)?.meltIsBase);
      if (!meltIsBase) {
        const melt2Target = Math.round(meltTarget * 0.75);
        const paramsMelt1 = { ...params, retIncome: meltTarget, retSpM: Math.round(meltTarget / 12) };
        const paramsMelt2 = { ...params, retIncome: melt2Target, retSpM: Math.round(melt2Target / 12) };
        mcMelt1 = runMC(paramsMelt1, 1000) as Record<string, any> | null;
        mcMelt2 = runMC(paramsMelt2, 1000) as Record<string, any> | null;
      }
    }

    // TRANSITION + DECUM: CPP/QPP timing (3×1000) — only if not already claiming
    if (phase === "TRANSITION" || phase === "DECUM") {
      const alreadyClaiming = quiz.qppAlreadyClaiming === true || quiz.qppAlreadyClaiming === "true";
      if (!alreadyClaiming) {
        const pC60 = translateBilan360({ ...quiz, qppPlannedAge: 60, qppAlreadyClaiming: false }, phase);
        const pC65 = translateBilan360({ ...quiz, qppPlannedAge: 65, qppAlreadyClaiming: false }, phase);
        const pC70 = translateBilan360({ ...quiz, qppPlannedAge: 70, qppAlreadyClaiming: false }, phase);
        mcC60 = runMC(pC60, 1000) as Record<string, any> | null;
        mcC65 = runMC(pC65, 1000) as Record<string, any> | null;
        mcC70 = runMC(pC70, 1000) as Record<string, any> | null;
      }
    }

    // ── ALL PHASES: Stress test scenarios (3×1000) ──────────
    let mcStressCrash08: Record<string, any> | null = null;
    let mcStressStagflation: Record<string, any> | null = null;
    let mcStressProlonged: Record<string, any> | null = null;
    {
      const stressBase = { ...params };
      const pCrash = { ...stressBase, strs: "crash08", stWhen: phase === "ACCUM" ? "ret" : "now" };
      const pStag = { ...stressBase, strs: "stagflation", stWhen: phase === "ACCUM" ? "ret" : "now" };
      const pProl = { ...stressBase, strs: "prolonged", stWhen: phase === "ACCUM" ? "ret" : "now" };
      mcStressCrash08 = runMC(pCrash, 1000) as Record<string, any> | null;
      mcStressStagflation = runMC(pStag, 1000) as Record<string, any> | null;
      mcStressProlonged = runMC(pProl, 1000) as Record<string, any> | null;
    }

    const extraRuns = { stratData, mcMelt1, mcMelt2, mcC60, mcC65, mcC70, mcStressCrash08, mcStressStagflation, mcStressProlonged };
    console.log(`[webhook] Bilan 360 MC runs completed in ${Date.now() - mcStart}ms`);

    const D = extractReportData360(mcBase as Record<string, any>, params, phase, extraRuns);

    // ── Build interactive report data layer ────────────────
    const buildfiData = buildBuildFiData(mcBase as Record<string, any>, params, phase, lang, extraRuns);

    // ── AI narration (Opus) ─────────────────────────────────
    const aiStart = Date.now();
    const prompt = buildAIPrompt360(D, params, fr, quiz, phase, stratData || undefined);
    let ai: Record<string, string | undefined>;
    try {
      const useOpus = process.env.ANTHROPIC_MODEL === "opus";
      ai = await Promise.race([
        callAnthropic(prompt.sys, prompt.usr, sanitizeAISlots360, useOpus ? "claude-opus-4-6" : undefined, 8000),
        new Promise<Record<string, string | undefined>>((_, reject) =>
          setTimeout(() => reject(new Error("AI timeout 90s")), 90000)
        ),
      ]);
    } catch (aiErr) {
      console.warn("[webhook] Bilan 360 AI failed/timed out, using static fallbacks:", aiErr);
      ai = {};
    }
    console.log(`[webhook] Bilan 360 AI in ${Date.now() - aiStart}ms (${Object.keys(ai).length} slots)`);

    // ── Feedback token ────────────────────────────────────
    const feedbackToken = randomUUID();
    await createFeedbackRecord(feedbackToken, email, "bilan360", lang);

    // ── Render report ─────────────────────────────────────
    const reportHTML = renderReportHTML360(D, mcBase as Record<string, any>, params, lang, ai, phase, feedbackToken, extraRuns, buildfiData);

    // ── Upload ────────────────────────────────────────────
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `rapport-bilan360-${timestamp}-${sessionId.slice(-8)}.html`;
    const blob = await put(filename, reportHTML, {
      access: "public",
      contentType: "text/html; charset=utf-8",
      addRandomSuffix: true,
    });
    console.log(`[webhook] Bilan 360 report uploaded: ${blob.url}`);

    // ── Email ─────────────────────────────────────────────
    await sendReportEmail({
      to: email,
      lang,
      tier: "bilan360",
      downloadUrl: blob.url,
      grade: String(D.grade),
      successPct: D.successPct as number,
      feedbackToken,
    });
    console.log(`[webhook] Bilan 360 email sent to ${maskEmail(email)}`);

    if (metadata.userRefCode) {
      await createReferralRecord(metadata.userRefCode, email).catch((err) =>
        console.error("[webhook] Referral record creation error (non-blocking):", err)
      );
    }

    return NextResponse.json({ received: true, email, reportUrl: blob.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Bilan 360 processing failed";
    console.error("[webhook] Bilan 360 error:", err);
    await unmarkProcessed(sessionId).catch((e) =>
      console.error("[webhook] Failed to unmark processed:", e)
    );
    await sendAdminAlert(
      "Bilan 360 pipeline failed",
      `Email: ${email}\nSession: ${sessionId}\nPhase: ${metadata.phase || "unknown"}\nError: ${msg}`
    );
    return NextResponse.json({ received: true, error: msg }, { status: 500 });
  }
}

// ── Expert purchase handler ───────────────────────────────

async function handleExpertPurchase(
  email: string,
  metadata: Record<string, string>,
  sessionId: string
): Promise<NextResponse> {
  try {
    const lang = (metadata.lang || "fr") as "fr" | "en";
    const quizAnswers = reassembleQuizAnswers(metadata);

    console.log(`[webhook] Processing Expert purchase for ${maskEmail(email)}`);

    // Check if profile already exists (upgrade scenario)
    const existing = await getExpertProfile(email);
    let profile;

    if (existing) {
      // Upgrade: update existing profile
      profile = await updateExpertProfile(email, {
        exportsAI: 5,
        expiry: new Date(Date.now() + 365 * 86400000).toISOString(),
        quizData: quizAnswers,
        upgradedFrom: (metadata.upgrade_from as "essentiel" | "intermediaire") || existing.upgradedFrom,
        changelog: [
          ...existing.changelog,
          {
            date: new Date().toISOString(),
            action: existing.upgradedFrom ? "re_upgrade" : "upgrade",
            details: { from: metadata.upgrade_from || "direct", sessionId },
          },
        ],
      });
    } else {
      // New account
      profile = await createExpertProfile(email, {
        upgradedFrom: (metadata.upgrade_from as "essentiel" | "intermediaire") || null,
        quizData: quizAnswers,
        referralCode: metadata.userRefCode || undefined,
      });
    }

    if (!profile) {
      throw new Error("Failed to create/update Expert profile");
    }

    // Send magic link email
    await sendMagicLinkEmail({
      to: email,
      lang,
      token: profile.token,
      isNewAccount: !existing,
    });

    console.log(`[webhook] Expert profile created for ${maskEmail(email)}, magic link sent`);

    // Generate initial Expert report (S6 pipeline)
    try {
      const fr = lang === "fr";
      const { mcParams } = translateToMCExpert(quizAnswers as Record<string, any>);
      const mcStart = Date.now();
      const mc = runMC(mcParams, 5000) as Record<string, any>;
      if (!mc) throw new Error("MC engine returned null");
      console.log(`[webhook] Expert initial MC completed in ${Date.now() - mcStart}ms`);

      const D = extractReportDataExpert(mc, mcParams);
      const grade = String(D.grade);
      const activeSections = detectExpertSections(mcParams, mc, grade);
      const quiz = mcParams._quiz || {};
      const batches = buildExpertPromptBatches(D, mc, mcParams, quiz, activeSections);

      // Run AI batches in parallel with 90s timeout (Vercel max 120s)
      const aiStart = Date.now();
      // NOTE: Intermediate batch results are intentionally unsanitized (identity cast).
      // Post-hoc sanitizeAISlotsExpert() call below handles AMF compliance for all merged slots.
      let batchResults: Record<string, string>[];
      try {
        batchResults = await Promise.race([
          Promise.all(
            batches.map(b => callAnthropic(b.sys, b.usr, (raw) => raw as Record<string, string>))
          ),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("AI batch timeout (90s)")), 90_000)
          ),
        ]);
      } catch (timeoutErr) {
        console.warn("[webhook] Expert AI batch timed out, using fallback (numeric-only report)");
        batchResults = [];
      }
      const mergedRaw: Record<string, any> = {};
      for (const result of batchResults) {
        Object.assign(mergedRaw, result);
      }
      const ai: ExpertAINarration = sanitizeAISlotsExpert(mergedRaw, activeSections);
      console.log(`[webhook] Expert AI: ${Object.keys(ai).length}/${activeSections.length} sections in ${Date.now() - aiStart}ms`);

      // Generate feedback token for expert report
      const expertFeedbackToken = randomUUID();
      await createFeedbackRecord(expertFeedbackToken, email, "expert", lang);

      const reportHTML = renderReportHTMLExpert(D, mc, mcParams, ai, activeSections, lang, expertFeedbackToken);

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `bilan-expert-${timestamp}-${sessionId.slice(-8)}.html`;
      const blob = await put(filename, reportHTML, {
        access: "public",
        contentType: "text/html; charset=utf-8",
        addRandomSuffix: true,
      });

      console.log(`[webhook] Expert initial report uploaded: ${blob.url}`);

      await sendExpertDeliveryEmail({
        to: email,
        lang,
        downloadUrl: blob.url,
        grade,
        successPct: D.successPct,
        magicLinkUrl: buildMagicLinkUrl(profile.token),
        referralCode: profile.referralCode,
      });

      console.log(`[webhook] Expert initial report email sent to ${maskEmail(email)}`);
    } catch (reportErr) {
      // Non-fatal: profile + magic link already sent, report is a bonus
      console.error("[webhook] Expert initial report generation failed (non-fatal):", reportErr);
    }

    return NextResponse.json({
      received: true,
      email,
      tier: "expert",
      magicLinkSent: true,
      referralCode: profile.referralCode,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Expert processing failed";
    console.error("[webhook] Expert purchase error:", err);
    // Clear idempotency flag so Stripe retries can re-process on transient failure
    await unmarkProcessed(sessionId).catch((e) =>
      console.error("[webhook] Failed to unmark processed:", e)
    );
    await sendAdminAlert(
      "Expert purchase pipeline failed",
      `Email: ${email}\nSession: ${sessionId}\nError: ${msg}`
    );
    return NextResponse.json(
      { received: true, error: msg },
      { status: 500 }
    );
  }
}

// ── Export addon handler ──────────────────────────────────

async function handleExportAddon(email: string, sessionId: string): Promise<NextResponse> {
  try {
    // Verify profile exists before incrementing
    const profile = await getExpertProfile(email);
    if (!profile) {
      console.error(`[webhook] Export addon: no profile for ${email}`);
      return NextResponse.json(
        { received: true, error: "No expert profile" },
        { status: 400 }
      );
    }

    // Atomic increment via Lua script to prevent race conditions
    const { success, remaining } = await incrementExportCredit(email);
    if (!success) {
      throw new Error(`incrementExportCredit failed for ${email}`);
    }

    // Append changelog entry (non-atomic, best-effort — credit already secured above)
    await updateExpertProfile(email, {
      changelog: [
        ...profile.changelog,
        {
          date: new Date().toISOString(),
          action: "addon_purchased",
          details: { credits_added: 1, new_total: remaining },
        },
      ],
    });

    console.log(`[webhook] Export addon for ${maskEmail(email)}, new total: ${remaining}`);

    return NextResponse.json({
      received: true,
      email,
      exportsAI: remaining,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Addon processing failed";
    console.error("[webhook] Export addon error:", err);
    // Clear idempotency flag so Stripe retries can re-process on transient failure
    await unmarkProcessed(sessionId).catch((e) =>
      console.error("[webhook] Failed to unmark processed:", e)
    );
    await sendAdminAlert(
      "Export addon failed",
      `Email: ${email}\nSession: ${sessionId}\nError: ${msg}`
    );
    return NextResponse.json(
      { received: true, error: msg },
      { status: 500 }
    );
  }
}

// ── Referral conversion handler ───────────────────────────

async function handleReferralConversion(
  code: string,
  buyerEmail: string
): Promise<void> {
  // Read referral record first to check for self-referral before incrementing
  const referral = await getReferral(code);
  if (!referral) {
    console.warn(`[webhook] Referral code ${code} not found`);
    return;
  }

  // Prevent self-referral before any state mutation
  if (referral.referrerEmail === buyerEmail.toLowerCase().trim()) {
    console.warn(`[webhook] Self-referral blocked: ${buyerEmail}`);
    return;
  }

  const updated = await incrementReferralConversion(code);
  if (!updated) {
    console.warn(`[webhook] Referral code ${code} not found during increment`);
    return;
  }

  console.log(
    `[webhook] Referral ${code}: conversion #${updated.conversions} by ${buyerEmail}`
  );

  // Notify referrer (look up their language from feedback record)
  const referrerFeedback = await getFeedbackByEmail(updated.referrerEmail);
  const referrerLang = referrerFeedback?.lang || "fr";
  await sendReferralConversionEmail({
    to: updated.referrerEmail,
    lang: referrerLang,
    conversions: updated.conversions,
  }).catch((err) =>
    console.error("[webhook] Referral notification email failed:", err)
  );

  // Check reward tiers
  const referrerProfile = await getExpertProfile(updated.referrerEmail);

  if (updated.conversions === 1) {
    console.log(`[webhook] Referral ${code}: tier 1 reward unlocked (50% off next purchase)`);
    // Coupon generated dynamically via Stripe when referrer checks out
  }

  if (updated.conversions >= 3 && referrerProfile) {
    // Check if this tier was already granted (avoid duplicate on re-delivery)
    const alreadyGranted = referrerProfile.changelog.some(
      (c) => c.action === "referral_reward_3"
    );
    if (!alreadyGranted) {
      // 3 conversions = 1 free year of Expert + 3 export credits
      // Re-fetch profile to get latest state after possible earlier updates
      const freshProfile = await getExpertProfile(updated.referrerEmail);
      if (freshProfile) {
        const newExpiry = new Date(
          Math.max(new Date(freshProfile.expiry).getTime(), Date.now()) +
            365 * 86400000
        ).toISOString();

        await updateExpertProfile(updated.referrerEmail, {
          expiry: newExpiry,
          exportsAI: freshProfile.exportsAI + 3,
          changelog: [
            ...freshProfile.changelog,
            {
              date: new Date().toISOString(),
              action: "referral_reward_3",
              details: { code, conversions: updated.conversions, newExpiry, exportsAdded: 3 },
            },
          ],
        });
        console.log(`[webhook] Referral ${code}: referral_reward_3 applied (1 year extension + 3 exports)`);

        // Send congratulations email
        const referrerLang = ((freshProfile.quizData?.lang as string) || "fr") as "fr" | "en";
        await sendReferralUpgradeEmail({
          to: updated.referrerEmail,
          lang: referrerLang,
          newExpiry,
        }).catch((err) =>
          console.error("[webhook] Referral upgrade congratulations email failed:", err)
        );
      }
    }
  }
}

// ── Subscription renewal handler ──────────────────────────

async function handleSubscriptionUpdated(
  event: Stripe.Event
): Promise<NextResponse> {
  const subscription = event.data.object as Stripe.Subscription;

  try {
    const customer = await stripe.customers.retrieve(
      subscription.customer as string
    );
    if (customer.deleted) {
      console.error("[webhook] Subscription update: customer deleted");
      return NextResponse.json({ received: true });
    }
    const email = customer.email;

    if (!email) {
      console.error("[webhook] Subscription update: no customer email");
      return NextResponse.json({ received: true });
    }

    if (subscription.status === "active") {
      console.log(`[webhook] Renewal successful for ${email}`);
      const renewed = await renewExpertProfile(email);

      if (renewed) {
        // Send new magic link
        const lang = (renewed.quizData?.lang as "fr" | "en") || "fr";
        await sendMagicLinkEmail({
          to: email,
          lang,
          token: renewed.token,
          isNewAccount: false,
        });
        console.log(`[webhook] Renewal magic link sent to ${email}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Subscription processing failed";
    console.error("[webhook] Subscription update error:", err);
    await sendAdminAlert(
      "Subscription renewal failed",
      `Subscription: ${subscription.id}\nError: ${msg}`
    );
    return NextResponse.json(
      { received: true, error: msg },
      { status: 500 }
    );
  }
}
