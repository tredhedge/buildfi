// /app/api/export/route.ts
// Expert on-demand report export — 5000 sims, 4-batch AI narration, Blob upload
// Decrements exportsAI credit on success
// Used by: Simulator UI "Generate Expert Report" button

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { put } from "@vercel/blob";
import { runMC } from "@/lib/engine";
import {
  authenticateAndRateLimit,
  validateBaseParams,
  ENGINE_VERSION,
  CONSTANTS_YEAR,
} from "@/lib/api-helpers";
import {
  getExpertProfile,
  decrementExportCredit,
  updateExpertProfile,
} from "@/lib/kv";
import { buildMagicLinkUrl } from "@/lib/auth";
import { extractReportDataExpert, renderReportHTMLExpert } from "@/lib/report-html-expert";
import { buildExpertPromptBatches, detectExpertSections } from "@/lib/ai-prompt-expert";
import { sanitizeAISlotsExpert, type ExpertAINarration, type ExpertSectionKey } from "@/lib/ai-constants";
import { sendExpertDeliveryEmail } from "@/lib/email-expert";

export const maxDuration = 120; // Expert reports can take longer (4 AI batches)
export const runtime = "nodejs";

// ── AI caller (parallel batches) ─────────────────────────────────

async function callAnthropicBatch(
  sys: string,
  usr: string
): Promise<Record<string, string>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return {};
  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: sys,
      messages: [{ role: "user", content: usr }],
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const cleaned = text.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("[export] AI batch failed:", err);
    return {};
  }
}

// ── Main handler ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { params, lang: rawLang } = body;
    const lang: "fr" | "en" = rawLang === "en" ? "en" : "fr";

    if (!params || typeof params !== "object") {
      return NextResponse.json(
        { success: false, error: "Missing params object" },
        { status: 400 }
      );
    }

    // Auth + rate limiting (export tier: 20/day with 2min cooldown)
    const authResult = await authenticateAndRateLimit(req, "export");
    if (authResult instanceof NextResponse) return authResult;

    // Validate params
    const validationError = validateBaseParams(params);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    // Check export credits
    const profile = await getExpertProfile(authResult.email);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: "No expert profile found" },
        { status: 403 }
      );
    }
    if (profile.exportsAI <= 0) {
      return NextResponse.json(
        { success: false, error: "No export credits remaining", remaining: 0 },
        { status: 403 }
      );
    }

    const start = Date.now();

    // ── Step 1: Run MC (5000 sims) ──────────────────────────────
    const mc = runMC(params, 5000) as Record<string, any> | null;
    if (!mc) {
      return NextResponse.json(
        { success: false, error: "MC engine returned null" },
        { status: 500 }
      );
    }
    const mcMs = Date.now() - start;
    console.log(`[export] MC 5000 sims in ${mcMs}ms for ${authResult.email}`);

    // ── Step 2: Extract report data ─────────────────────────────
    const D = extractReportDataExpert(mc, params);
    const grade = String(D.grade);

    // ── Step 3: Detect active sections ──────────────────────────
    const activeSections = detectExpertSections(params, mc, grade);

    // ── Step 4: Build AI prompts (4 batches) ────────────────────
    const quiz = params._quiz || {};
    const batches = buildExpertPromptBatches(D, mc, params, quiz, activeSections);

    // ── Step 5: Run AI batches in parallel ──────────────────────
    const aiStart = Date.now();
    const batchResults = await Promise.all(
      batches.map(b => callAnthropicBatch(b.sys, b.usr))
    );
    const aiMs = Date.now() - aiStart;
    console.log(`[export] ${batches.length} AI batches in ${aiMs}ms`);

    // Merge all batch results
    const mergedRaw: Record<string, any> = {};
    for (const result of batchResults) {
      Object.assign(mergedRaw, result);
    }

    // Sanitize
    const ai: ExpertAINarration = sanitizeAISlotsExpert(mergedRaw, activeSections);
    console.log(`[export] ${Object.keys(ai).length}/${activeSections.length} AI sections filled`);

    // ── Step 6: Render HTML report ──────────────────────────────
    const html = renderReportHTMLExpert(D, mc, params, ai, activeSections, lang);

    // ── Step 7: Upload to Blob ──────────────────────────────────
    const timestamp = new Date().toISOString().slice(0, 10);
    const suffix = Math.random().toString(36).slice(2, 8);
    const filename = `bilan-expert-${timestamp}-${suffix}.html`;
    const blob = await put(filename, html, {
      access: "public",
      contentType: "text/html; charset=utf-8",
      addRandomSuffix: true,
    });
    console.log(`[export] Report uploaded: ${blob.url}`);

    // ── Step 8: Decrement export credit ─────────────────────────
    const creditResult = await decrementExportCredit(authResult.email);

    // ── Step 9: Track in profile changelog + reports ─────────────
    try {
      const currentProfile = await getExpertProfile(authResult.email);
      if (currentProfile) {
        const reportId = Math.random().toString(36).slice(2, 10);
        await updateExpertProfile(authResult.email, {
          reportsGenerated: [
            ...(currentProfile.reportsGenerated || []),
            {
              id: reportId,
              date: new Date().toISOString(),
              type: "expert" as const,
              sections: activeSections as string[],
              engineVersion: ENGINE_VERSION,
              fiscalYear: CONSTANTS_YEAR,
              blobUrl: blob.url,
              aiStatus: Object.keys(ai).length > 0 ? "full" as const : "fallback" as const,
            },
          ],
          changelog: [
            ...currentProfile.changelog,
            {
              date: new Date().toISOString(),
              action: "export",
              details: {
                reportId,
                grade,
                successPct: D.successPct,
                sections: activeSections.length,
                blobUrl: blob.url,
              },
            },
          ],
        });
      }
    } catch (logErr) {
      console.error("[export] Changelog update failed (non-fatal):", logErr);
    }

    // ── Step 10: Send email ─────────────────────────────────────
    try {
      const magicLinkUrl = buildMagicLinkUrl(authResult.token);
      await sendExpertDeliveryEmail({
        to: authResult.email,
        lang,
        downloadUrl: blob.url,
        grade,
        successPct: D.successPct,
        magicLinkUrl,
        referralCode: profile.referralCode,
      });
    } catch (emailErr) {
      console.error("[export] Email send failed (non-fatal):", emailErr);
    }

    const totalMs = Date.now() - start;
    console.log(
      `[export] Complete in ${totalMs}ms — MC:${mcMs}ms AI:${aiMs}ms — ${activeSections.length} sections, grade ${grade} for ${authResult.email}`
    );

    return NextResponse.json({
      success: true,
      downloadUrl: blob.url,
      grade,
      successPct: D.successPct,
      sections: activeSections.length,
      remaining: creditResult.remaining,
      meta: {
        sims: 5000,
        durationMs: totalMs,
        mcMs,
        aiMs,
        aiFilled: Object.keys(ai).length,
        engineVersion: ENGINE_VERSION,
        constantsYear: CONSTANTS_YEAR,
      },
    });
  } catch (err) {
    console.error("[export] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Export failed",
      },
      { status: 500 }
    );
  }
}
