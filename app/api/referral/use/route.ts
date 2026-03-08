// /app/api/referral/use/route.ts
// Increment referral use counter when someone visits a landing page with ?ref=CODE
// Called from static landing page JS (index.html, expert-landing.html) — fire-and-forget
// Rate-limited by IP to prevent counter inflation

import { NextRequest, NextResponse } from "next/server";
import { getReferral, incrementReferralUse, redis } from "@/lib/kv";

const RL_WINDOW_SEC = 60 * 60; // 1 hour
const RL_MAX = 5; // 5 referral use increments per IP per hour

async function isRateLimited(ip: string): Promise<boolean> {
  const key = `ratelimit:ref-use:${ip}`;
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
    const body = await req.json();
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";

    if (!code || code.length < 4 || code.length > 12) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(ip)) {
      // Silently drop — this is analytics, not blocking
      return NextResponse.json({ ok: false, reason: "rate_limited" });
    }

    const record = await getReferral(code);
    if (!record) {
      // Code not found — not an error from the caller's perspective
      return NextResponse.json({ ok: false, reason: "not_found" });
    }

    await incrementReferralUse(code);
    return NextResponse.json({ ok: true });
  } catch {
    // Non-blocking analytics endpoint — never surface errors to caller
    return NextResponse.json({ ok: false });
  }
}
