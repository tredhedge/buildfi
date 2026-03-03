// /app/api/data/export/route.ts
// LPRPDE/Loi 25 portability — download all personal data as JSON

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { getExpertProfile } from "@/lib/kv";

export async function GET(req: NextRequest) {
  const auth = await verifyToken(req);
  if (!auth.authenticated || !auth.email) {
    return NextResponse.json(
      { error: auth.error || "Unauthorized" },
      { status: 401 }
    );
  }

  const profile = await getExpertProfile(auth.email);
  if (!profile) {
    return NextResponse.json(
      { error: "No profile found" },
      { status: 404 }
    );
  }

  // Strip internal fields, return user-facing data
  const exportData = {
    exportDate: new Date().toISOString(),
    email: auth.email,
    tier: profile.tier,
    created: profile.created,
    expiry: profile.expiry,
    quizData: profile.quizData,
    profiles: profile.profiles,
    reportsGenerated: profile.reportsGenerated,
    changelog: profile.changelog,
    exportsAI: profile.exportsAI,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="buildfi-data-${Date.now()}.json"`,
    },
  });
}
