// /app/api/data/delete/route.ts
// LPRPDE/Loi 25 deletion — mark account for deletion within 30 days

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { getExpertProfile, updateExpertProfile } from "@/lib/kv";

export async function POST(req: NextRequest) {
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

  // Mark for deletion — actual purge handled by cron within 30 days
  const deleteAt = new Date();
  deleteAt.setDate(deleteAt.getDate() + 30);

  await updateExpertProfile(auth.email, {
    deletionRequestedAt: new Date().toISOString(),
    deletionScheduledAt: deleteAt.toISOString(),
    changelog: [
      ...profile.changelog,
      {
        date: new Date().toISOString(),
        action: "deletion_requested",
        details: { scheduledFor: deleteAt.toISOString().slice(0, 10) },
      },
    ],
  } as Partial<import("@/lib/kv").ExpertProfile> & Record<string, unknown>);

  console.log(`[data/delete] Deletion scheduled for ${auth.email} at ${deleteAt.toISOString()}`);

  return NextResponse.json({
    success: true,
    message: "Account marked for deletion",
    deletionScheduledAt: deleteAt.toISOString(),
  });
}
