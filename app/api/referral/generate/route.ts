// GET /api/referral/generate?token={uuid}
// Returns referral link + stats for an authenticated Expert user

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { getReferral } from "@/lib/kv";

export async function GET(req: NextRequest) {
  const auth = await verifyToken(req);
  if (!auth.authenticated || !auth.profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const code = auth.profile.referralCode;
  const referral = await getReferral(code);
  const conversions = referral?.conversions ?? 0;

  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.buildfi.ca";

  return NextResponse.json({
    code,
    link: `${base}?ref=${code}`,
    uses: referral?.uses ?? 0,
    conversions,
    rewards: {
      tier1: { threshold: 1, reward: "50% off next purchase", reached: conversions >= 1 },
      tier2: { threshold: 3, reward: "Free AI export ($14.99)", reached: conversions >= 3 },
      tier3: { threshold: 5, reward: "Free Expert upgrade (1 year)", reached: conversions >= 5 },
    },
  });
}
