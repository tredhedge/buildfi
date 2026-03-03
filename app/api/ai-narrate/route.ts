// /app/api/ai-narrate/route.ts
// AI narration endpoint — requires Expert auth + rate limiting
// The webhook calls Anthropic directly — this route is for Expert simulator exports.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { sanitizeAISlots } from "@/lib/ai-constants";
import { authenticateAndRateLimit } from "@/lib/api-helpers";

export const maxDuration = 30;
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Auth + rate limit (export tier: 20/day)
  const authResult = await authenticateAndRateLimit(req, "export");
  if (authResult instanceof NextResponse) return authResult;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[ai-narrate] ANTHROPIC_API_KEY not set, returning empty");
    return NextResponse.json({});
  }

  try {
    const { sys, usr } = await req.json();
    if (!sys || !usr) {
      return NextResponse.json({ error: "Missing sys/usr" }, { status: 400 });
    }

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: sys,
      messages: [{ role: "user", content: usr }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    let raw: Record<string, any> = {};
    try {
      const cleaned = text.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
      raw = JSON.parse(cleaned);
    } catch {
      console.error("[ai-narrate] JSON parse failed:", text.slice(0, 200));
      return NextResponse.json({});
    }

    return NextResponse.json(sanitizeAISlots(raw));
  } catch (err) {
    console.error("[ai-narrate] API error:", err);
    return NextResponse.json({});
  }
}
