// /app/api/cron/feedback/route.ts
// Daily cron job: process feedback emails J+3, J+7, J+14
// Protected by CRON_SECRET Authorization header
// Vercel cron: 0 14 * * * (2 PM UTC = 10 AM ET)

import { NextRequest, NextResponse } from "next/server";
import { listPendingFeedback, getFeedbackByToken } from "@/lib/kv";
import { redis, KEYS } from "@/lib/kv";
import type { FeedbackRecord } from "@/lib/kv";
import {
  sendFeedbackEmail,
  sendTestimonialRequestEmail,
  sendFeedbackReminderEmail,
} from "@/lib/email-feedback";

export const maxDuration = 60;

function daysSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000);
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allRecords = await listPendingFeedback();
  const stats = { j3: 0, j7: 0, j14: 0, skipped: 0, errors: 0 };

  for (const record of allRecords) {
    try {
      const days = daysSince(record.purchaseDate);
      const lang = record.lang || "fr";

      // J+3: Send feedback request if not yet sent and >= 3 days
      if (!record.j3Sent && days >= 3) {
        await sendFeedbackEmail({
          to: record.email,
          lang,
          feedbackToken: record.token,
          tier: record.tier,
        });
        await markSent(record.token, "j3Sent");
        stats.j3++;
        continue; // Only one email per day per user
      }

      // J+7: Testimonial request if rating >= 4 + nps yes + not yet sent
      if (!record.j7Sent && days >= 7 && record.j3Sent) {
        if (record.rating && record.rating >= 4 && record.nps === true) {
          await sendTestimonialRequestEmail({
            to: record.email,
            lang,
            feedbackToken: record.token,
          });
        }
        // Mark sent regardless (either sent or not eligible)
        await markSent(record.token, "j7Sent");
        stats.j7++;
        continue;
      }

      // J+14: Reminder if no feedback at all + not yet sent
      if (!record.j14Sent && days >= 14 && record.j3Sent && record.j7Sent) {
        if (!record.rating) {
          await sendFeedbackReminderEmail({
            to: record.email,
            lang,
            feedbackToken: record.token,
          });
        }
        // Mark sent regardless (either sent or done)
        await markSent(record.token, "j14Sent");
        stats.j14++;
        continue;
      }

      stats.skipped++;
    } catch (err) {
      console.error(`[cron/feedback] Error processing ${record.email}:`, err);
      stats.errors++;
    }
  }

  console.log(`[cron/feedback] Processed ${allRecords.length} records:`, stats);

  return NextResponse.json({
    processed: allRecords.length,
    ...stats,
  });
}

async function markSent(
  token: string,
  field: "j3Sent" | "j7Sent" | "j14Sent"
): Promise<void> {
  const record = await getFeedbackByToken(token);
  if (!record) return;
  const updated = { ...record, [field]: true };
  await redis.set(`feedback:${token}`, updated, { ex: 365 * 86400 });
}
