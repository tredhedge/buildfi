// POST /api/auth/magic-link  body: { email }
// Sends a fresh magic link. Always returns { sent: true } to prevent email enumeration.

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getExpertProfile, updateExpertProfile, setTokenIndex, invalidateToken } from "@/lib/kv";
import { sendMagicLinkEmail } from "@/lib/email-expert";

// In-memory rate limit: max 5 requests per IP per 15 minutes
const rateLimitMap = new Map<string, number[]>();
const RL_WINDOW = 15 * 60 * 1000;
const RL_MAX = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (rateLimitMap.get(ip) || []).filter((t) => now - t < RL_WINDOW);
  if (hits.length >= RL_MAX) return true;
  hits.push(now);
  rateLimitMap.set(ip, hits);
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(ip)) {
      // Return 200 + { sent: true } to prevent enumeration even on rate limit
      return NextResponse.json({ sent: true });
    }

    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const normalized = email.toLowerCase().trim();
    const profile = await getExpertProfile(normalized);

    // Always return 200 — prevents email enumeration
    if (!profile) {
      console.log(`[magic-link] No profile found for ${normalized}`);
      return NextResponse.json({ sent: true });
    }

    if (new Date(profile.expiry) < new Date()) {
      console.log(`[magic-link] Expired profile for ${normalized}`);
      return NextResponse.json({ sent: true });
    }

    // Invalidate old token, generate fresh one
    if (profile.token) {
      await invalidateToken(profile.token);
    }
    const newToken = randomUUID();
    await updateExpertProfile(normalized, { token: newToken });
    await setTokenIndex(newToken, normalized);

    const lang = (profile.quizData?.lang as "fr" | "en") || "fr";

    await sendMagicLinkEmail({
      to: normalized,
      lang,
      token: newToken,
      isNewAccount: false,
    });

    console.log(`[magic-link] Sent new magic link to ${normalized}`);
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("[magic-link] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
