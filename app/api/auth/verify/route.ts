// GET /api/auth/verify?token={uuid}
// Returns lightweight profile summary for auth gate checks
// Does NOT return full profile (quizData, all profiles) — use dedicated endpoints

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const result = await verifyToken(req);

  if (!result.authenticated || !result.profile) {
    return NextResponse.json(
      { authenticated: false, error: result.error },
      { status: 401 }
    );
  }

  const p = result.profile;
  const sophistication = (p.quizData?.sophistication as string) || "rapide";
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
    // Summary fields (kept for backward compat with simulator auth gate)
    tier: p.tier,
    exportsAI: p.exportsAI,
    expiry: p.expiry,
    bilanUsed: p.bilanUsed,
    referralCode: p.referralCode,
    profileCount: p.profiles.length,
    reportsCount: p.reportsGenerated.length,
    accountType: p.accountType,
    constantsYear: p.constantsYear,
    sophistication,
  });
}
