// /app/api/data/delete/route.ts
// LPRPDE/Loi 25 deletion — mark account for deletion within 30 days
//
// Auth: single-use 24h-TTL token (one-shot). Get one by calling
// /api/request-data-action?action=delete&email=... — we email a magic link
// to the address on file. Reuse → 410 Gone. Session tokens (366d) do NOT
// authorize this destructive action.

import { NextRequest, NextResponse } from "next/server";
import { verifySingleUseToken } from "@/lib/auth";
import { getExpertProfile, updateExpertProfile } from "@/lib/kv";
import { hashEmail } from "@/lib/consent";

export async function POST(req: NextRequest) {
  const single = await verifySingleUseToken(req, "delete");
  if (!single.ok) {
    return NextResponse.json(
      { error: single.error },
      { status: single.status }
    );
  }
  const email = single.email;
  const emailHashed = hashEmail(email);

  const profile = await getExpertProfile(email);
  if (!profile) {
    return NextResponse.json(
      { error: "No profile found" },
      { status: 404 }
    );
  }

  // Mark for deletion — actual purge handled by cron within 30 days
  const deleteAt = new Date();
  deleteAt.setDate(deleteAt.getDate() + 30);

  await updateExpertProfile(email, {
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

  console.log(`[data/delete] Deletion scheduled emailHashed=${emailHashed} at ${deleteAt.toISOString()}`);

  return NextResponse.json({
    success: true,
    message: "Account marked for deletion",
    deletionScheduledAt: deleteAt.toISOString(),
  });
}
