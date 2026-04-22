// /app/api/planner/credits/route.ts
// Returns current AI-report credit count + minimal profile info for the Planner UI.
// Also used by the front-end to know if the "Generate AI report" button should be enabled.

import { NextRequest, NextResponse } from "next/server";
import { getExpertProfileByToken } from "@/lib/kv";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get("token");
  if (!token || typeof token !== "string" || token.length < 10) {
    return NextResponse.json({ error: "Missing or invalid token" }, { status: 401 });
  }

  const result = await getExpertProfileByToken(token);
  if (!result) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
  const { email, profile } = result;

  return NextResponse.json({
    ok: true,
    creditsRemaining: profile.exportsAI || 0,
    accountType: profile.accountType || "personal",
    tier: profile.tier || "planner",
    referralCode: profile.referralCode,
    reportsGenerated: (profile.reportsGenerated || []).length,
    lastReport: (profile.reportsGenerated || []).slice(-1)[0] || null,
    expiry: profile.expiry,
    email: email.replace(/^(.{2})[^@]*(@.*)/, "$1***$2"),
  });
}
