// /api/ba-reminder/subscribe — BA-FEAT-09
// Stores email + frequency for Bilan Annuel update reminders
// POST { email, frequency: "quarterly"|"annual", lang: "fr"|"en" }

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, frequency, lang } = body;

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    if (!["quarterly", "annual"].includes(frequency)) {
      return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
    }

    const key = `ba-reminder:${email.toLowerCase().trim()}`;
    await redis.set(key, {
      email: email.toLowerCase().trim(),
      frequency,
      lang: lang === "en" ? "en" : "fr",
      subscribedAt: new Date().toISOString(),
      active: true,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("ba-reminder subscribe error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
