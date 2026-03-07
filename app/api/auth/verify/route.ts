// GET /api/auth/verify?token={uuid}
// Returns lightweight profile summary for auth gate checks
// Does NOT return full profile (quizData, all profiles) — use dedicated endpoints

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { getFeedbackByEmail } from "@/lib/kv";

// ── Dev bypass ─────────────────────────────────────────────────────────────
// In local development, ?token=dev skips KV lookup entirely.
// Usage: http://localhost:3000/simulateur?token=dev
// NEVER active in production (NODE_ENV check is evaluated at runtime).
const DEV_EXPIRY = new Date(Date.now() + 365 * 86400_000).toISOString();

function devBypassResponse() {
  return NextResponse.json({
    authenticated: true,
    email: "dev@buildfi.ca",
    profile: {
      email: "dev@buildfi.ca",
      expiry: DEV_EXPIRY,
      exportsAI: 5,
      bilanUsed: false,
      profiles: [],
      changelog: [],
      reportsGenerated: [],
      referralCode: "DEV00001",
      tier: "expert",
      accountType: "personal",
      constantsYear: 2026,
      quizData: { sophistication: "personnalise" },
    },
    feedback: null,
    tier: "expert",
    exportsAI: 5,
    expiry: DEV_EXPIRY,
    bilanUsed: false,
    referralCode: "DEV00001",
    profileCount: 0,
    reportsCount: 0,
    accountType: "personal",
    constantsYear: 2026,
    sophistication: "personnalise",
  });
}

export async function GET(req: NextRequest) {
  // Dev bypass — localhost only, never production
  if (process.env.NODE_ENV === "development") {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || req.headers.get("authorization")?.slice(7) || "";
    if (token === "dev") return devBypassResponse();
  }

  const result = await verifyToken(req);

  if (!result.authenticated || !result.profile) {
    return NextResponse.json(
      { authenticated: false, error: result.error },
      { status: 401 }
    );
  }

  const p = result.profile;
  const sophistication = (p.quizData?.sophistication as string) || "rapide";

  // Fetch feedback record if exists (non-blocking — null if none)
  const feedback = await getFeedbackByEmail(result.email!).catch(() => null);

  return NextResponse.json({
    authenticated: true,
    email: result.email,
    // Full profile for portal/simulator consumption
    profile: {
      email: result.email,
      expiry: p.expiry,
      exportsAI: p.exportsAI,
      bilanUsed: p.bilanUsed,
      profiles: p.profiles,
      changelog: p.changelog,
      reportsGenerated: p.reportsGenerated,
      referralCode: p.referralCode,
      tier: p.tier,
      accountType: p.accountType,
      constantsYear: p.constantsYear,
      quizData: p.quizData,
    },
    // Feedback summary for portal
    feedback: feedback ? {
      rating: feedback.rating,
      nps: feedback.nps,
      couponUnlocked: feedback.couponUnlocked,
      token: feedback.token,
    } : null,
    // Summary fields (kept for backward compat with simulator auth gate)
    tier: p.tier,
    exportsAI: p.exportsAI,
    expiry: p.expiry,
    bilanUsed: p.bilanUsed,
    referralCode: p.referralCode,
    profileCount: (p.profiles ?? []).length,
    reportsCount: (p.reportsGenerated ?? []).length,
    accountType: p.accountType,
    constantsYear: p.constantsYear,
    sophistication,
  });
}
