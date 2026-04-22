// /app/api/regenerate-report/route.ts
// Planner customers regenerate an AI report from their current Wizard parameters.
// Flow: validate magic-link token → check credits > 0 → run MC 5000 → Opus narration
//       → upload HTML to Blob → atomically decrement credits → email the user → return URL.

import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";

import {
  getExpertProfileByToken,
  decrementExportCredit,
  createFeedbackRecord,
} from "@/lib/kv";
import { maskEmail } from "@/lib/auth";
import { translateToMCExpert } from "@/lib/quiz-translator-expert";
import { runMC } from "@/lib/engine";
import { extractReportDataExpert, renderReportHTMLExpert } from "@/lib/report-html-expert";
import { buildExpertPromptBatches, detectExpertSections } from "@/lib/ai-prompt-expert";
import { sanitizeAISlotsExpert } from "@/lib/ai-constants";
import type { ExpertAINarration } from "@/lib/ai-constants";
import { sendExpertDeliveryEmail } from "@/lib/email-expert";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 120;
export const runtime = "nodejs";

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-6";

// ── Anthropic helper ────────────────────────────────────────
async function callAnthropic<T extends Record<string, string | undefined>>(
  sys: string,
  usr: string,
  parser: (raw: string) => T
): Promise<T> {
  if (!process.env.ANTHROPIC_API_KEY) return parser("{}");
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 2000,
      system: sys,
      messages: [{ role: "user", content: usr }],
    });
    const raw = msg.content[0]?.type === "text" ? msg.content[0].text : "{}";
    return parser(raw);
  } catch (err) {
    console.error("[regenerate] Anthropic call failed:", err);
    return parser("{}");
  }
}

// ── Rate limit: 3 regenerations per 10 minutes per token ────
// Prevents accidental double-click bursts; real credit system is the hard gate.
const RECENT_REGENS: Map<string, number[]> = new Map();
function isRateLimited(token: string): boolean {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const recent = (RECENT_REGENS.get(token) || []).filter((t) => now - t < windowMs);
  if (recent.length >= 3) return true;
  recent.push(now);
  RECENT_REGENS.set(token, recent);
  return false;
}

// ── POST handler ────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  let tokenForRollback: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    const { token, params, lang: rawLang } = body as {
      token?: string;
      params?: Record<string, unknown>;
      lang?: string;
    };

    const lang: "fr" | "en" = rawLang === "en" ? "en" : "fr";

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Missing token" }, { status: 401 });
    }
    if (!params || typeof params !== "object") {
      return NextResponse.json({ error: "Missing Wizard params" }, { status: 400 });
    }

    // Validate token → profile
    const result = await getExpertProfileByToken(token);
    if (!result) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }
    const { email, profile } = result;
    tokenForRollback = token;

    // Rate limit (defensive; credit check is the real gate)
    if (isRateLimited(token)) {
      return NextResponse.json(
        { error: "rate_limited", message: "Too many regenerations in a short window. Please wait a few minutes." },
        { status: 429 }
      );
    }

    // Hard gate — credits available?
    if (!profile.exportsAI || profile.exportsAI <= 0) {
      return NextResponse.json(
        {
          error: "no_credits_remaining",
          message: lang === "fr"
            ? "Vous n'avez plus de générations de rapport IA. Achetez un pack de 4 rapports supplémentaires pour 19,99 $."
            : "You have no AI report generations remaining. Purchase a 4-report pack for $19.99.",
          creditsRemaining: 0,
        },
        { status: 402 }
      );
    }

    console.log(`[regenerate] Starting for ${maskEmail(email)} (${profile.exportsAI} credits)`);

    // ── Run MC + narration ──
    const { mcParams } = translateToMCExpert(params as Record<string, any>);
    const mcStart = Date.now();
    const mc = runMC(mcParams, 5000) as Record<string, any> | null;
    if (!mc) throw new Error("MC engine returned null");
    console.log(`[regenerate] MC 5000 in ${Date.now() - mcStart}ms`);

    const D = extractReportDataExpert(mc, mcParams);
    const grade = String(D.grade);
    const activeSections = detectExpertSections(mcParams, mc, grade);
    const quiz = (mcParams as any)._quiz || {};
    const batches = buildExpertPromptBatches(D, mc, mcParams, quiz, activeSections);

    // AI batches with 90s cap (Vercel max 120s)
    const aiStart = Date.now();
    let batchResults: Record<string, string>[];
    try {
      batchResults = await Promise.race([
        Promise.all(
          batches.map((b) => callAnthropic(b.sys, b.usr, (raw) => raw as unknown as Record<string, string>))
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("AI batch timeout (90s)")), 90_000)
        ),
      ]);
    } catch (timeoutErr) {
      console.warn("[regenerate] AI batch timed out, falling back to numeric-only");
      batchResults = [];
    }
    const mergedRaw: Record<string, any> = {};
    for (const result of batchResults) Object.assign(mergedRaw, result);
    const ai: ExpertAINarration = sanitizeAISlotsExpert(mergedRaw, activeSections);
    console.log(`[regenerate] AI: ${Object.keys(ai).length}/${activeSections.length} sections in ${Date.now() - aiStart}ms`);

    // Feedback token (per-report, one-shot)
    const feedbackToken = randomUUID();
    await createFeedbackRecord(feedbackToken, email, "expert", lang);

    const reportHTML = renderReportHTMLExpert(D, mc, mcParams, ai, activeSections, lang, feedbackToken);

    // Upload to Blob
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `bilan-planner-${timestamp}-${token.slice(-8)}.html`;
    const blob = await put(filename, reportHTML, {
      access: "public",
      contentType: "text/html; charset=utf-8",
      addRandomSuffix: true,
    });
    console.log(`[regenerate] Uploaded: ${blob.url}`);

    // Atomically decrement credits — SINGLE source of truth
    const dec = await decrementExportCredit(email);
    if (!dec.success) {
      // Lost the race (concurrent request exhausted credits). Don't charge user for a report they can't claim.
      // Still return the URL since the report exists, but warn.
      console.warn(`[regenerate] Credit race lost for ${maskEmail(email)} — report generated but no credit available`);
    }

    // Email delivery (non-blocking: if email fails, user still has the URL)
    try {
      await sendExpertDeliveryEmail({
        to: email,
        lang,
        downloadUrl: blob.url,
        grade,
        successPct: D.successPct,
        magicLinkUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.buildfi.ca"}/expert?token=${token}`,
        referralCode: profile.referralCode,
      });
    } catch (emailErr) {
      console.error("[regenerate] Email delivery failed (non-fatal):", emailErr);
    }

    return NextResponse.json({
      success: true,
      reportUrl: blob.url,
      creditsRemaining: dec.remaining,
      grade,
      successPct: D.successPct,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Regeneration failed";
    console.error("[regenerate] Error:", err);
    return NextResponse.json(
      {
        error: "regeneration_failed",
        message: msg,
      },
      { status: 500 }
    );
  }
}
