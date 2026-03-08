// /app/api/cron/purge/route.ts
// Daily cron: hard-delete accounts whose deletionScheduledAt has passed
// LPRPDE/Loi 25 — deletion must be executed within 30 days of request
// Protected by CRON_SECRET Authorization header
// Vercel cron: 0 17 * * * (5 PM UTC = 1 PM ET)

import { NextRequest, NextResponse } from "next/server";
import { listExpertProfiles, deleteExpertProfile } from "@/lib/kv";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allProfiles = await listExpertProfiles();
  const now = Date.now();
  const stats = { purged: 0, skipped: 0, errors: 0 };

  for (const { email, profile } of allProfiles) {
    try {
      const scheduled = profile.deletionScheduledAt;
      if (!scheduled) {
        stats.skipped++;
        continue;
      }

      if (new Date(scheduled).getTime() > now) {
        stats.skipped++;
        continue;
      }

      // Deletion date has passed — purge the account
      const ok = await deleteExpertProfile(email);
      if (ok) {
        console.log(`[cron/purge] Purged account: ${email} (scheduled: ${scheduled})`);
        stats.purged++;
      } else {
        console.warn(`[cron/purge] Profile not found during purge: ${email}`);
        stats.skipped++;
      }
    } catch (err) {
      console.error(`[cron/purge] Error purging ${email}:`, err);
      stats.errors++;
    }
  }

  console.log(`[cron/purge] Processed ${allProfiles.length} profiles:`, stats);

  return NextResponse.json({
    processed: allProfiles.length,
    ...stats,
  });
}
