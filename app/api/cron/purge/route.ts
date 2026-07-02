// /app/api/cron/purge/route.ts
// Daily cron: hard-delete accounts whose deletionScheduledAt has passed
// LPRPDE/Loi 25 — deletion must be executed within 30 days of request
// Protected by CRON_SECRET Authorization header
// Vercel cron: 0 17 * * * (5 PM UTC = 1 PM ET)

import { NextRequest, NextResponse } from "next/server";
import { listExpertProfiles, deleteExpertProfile } from "@/lib/kv";
import { list, del } from "@vercel/blob";

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

  // ── Report blobs: hard-delete reports older than 30 days ──────────────
  // The delivery emails promise a 30-day link and the privacy policy states a
  // 30-day retention. Vercel Blob has no native TTL, so enumerate and delete
  // expired report .html blobs here. (Guides/static assets live in /public,
  // never in Blob, so filtering on .html is safe.)
  const REPORT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
  const blobStats = { deleted: 0, kept: 0, errors: 0 };
  try {
    let cursor: string | undefined = undefined;
    do {
      const res: Awaited<ReturnType<typeof list>> = await list({ cursor, limit: 1000 });
      for (const b of res.blobs) {
        try {
          const age = now - new Date(b.uploadedAt).getTime();
          if (b.pathname.endsWith(".html") && age > REPORT_TTL_MS) {
            await del(b.url);
            blobStats.deleted++;
          } else {
            blobStats.kept++;
          }
        } catch (e) {
          console.error(`[cron/purge] Blob delete error ${b.pathname}:`, e);
          blobStats.errors++;
        }
      }
      cursor = res.hasMore ? res.cursor : undefined;
    } while (cursor);
    console.log(`[cron/purge] Report blobs:`, blobStats);
  } catch (e) {
    console.error(`[cron/purge] Blob list failed:`, e);
  }

  return NextResponse.json({
    processed: allProfiles.length,
    ...stats,
    reportsDeleted: blobStats.deleted,
    reportsKept: blobStats.kept,
    reportBlobErrors: blobStats.errors,
  });
}
