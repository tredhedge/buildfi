// POST /api/auth/magic-link  body: { email }
// Sends a fresh magic link. Always returns { sent: true } to prevent email enumeration.

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getExpertProfile, updateExpertProfile, setTokenIndex, invalidateToken } from "@/lib/kv";
import { sendMagicLinkEmail } from "@/lib/email-expert";

// KV-backed rate limit: max 5 requests per IP per 15 minutes
import { redis } from "@/lib/kv";
const RL_WINDOW_SEC = 15 * 60;
const RL_MAX = 5;

async function isRateLimited(ip: string): Promise<boolean> {
  const key = `ratelimit:magic-link:${ip}`;
  const now = Date.now();
  const timestamps: number[] = (await redis.get<number[]>(key)) || [];
  const recent = timestamps.filter((t) => now - t < RL_WINDOW_SEC * 1000);
  if (recent.length >= RL_MAX) return true;
  recent.push(now);
  await redis.set(key, recent, { ex: RL_WINDOW_SEC });
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(ip)) {
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
