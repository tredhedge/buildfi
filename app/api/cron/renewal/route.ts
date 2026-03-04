// /app/api/cron/renewal/route.ts
// Daily cron job: send renewal reminder emails J-30, J-7, J-0, J+3
// Protected by CRON_SECRET Authorization header
// Vercel cron: 0 15 * * * (3 PM UTC = 11 AM ET)

import { NextRequest, NextResponse } from "next/server";
import { listExpertProfiles, updateExpertProfile } from "@/lib/kv";
import {
  sendRenewalReminderJ30Email,
  sendRenewalReminderJ7Email,
  sendRenewalExpiryEmail,
  sendRenewalGraceEmail,
} from "@/lib/email-expert";

export const maxDuration = 60;

// ── Changelog action keys for deduplication ──────────────────
const ACTION_J30 = "renewal_j30_sent";
const ACTION_J7 = "renewal_j7_sent";
const ACTION_J0 = "renewal_j0_sent";
const ACTION_J3 = "renewal_j3_sent"; // J+3 (3 days after expiry)

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allProfiles = await listExpertProfiles();
  const stats = { j30: 0, j7: 0, j0: 0, j3: 0, skipped: 0, errors: 0 };

  for (const { email, profile } of allProfiles) {
    try {
      // Calculate days until expiry (positive = before expiry, negative = past expiry)
      const daysLeft =
        (new Date(profile.expiry).getTime() - Date.now()) / 86400000;

      // Build set of already-sent actions from changelog
      const sentActions = new Set(profile.changelog.map((c) => c.action));

      // Determine which email to send (only one per profile per run)
      let action: string | null = null;

      if (daysLeft >= -7 && daysLeft < 0) {
        // J+3: 3+ days past expiry (daysLeft is negative, so -7 <= daysLeft < 0
        // means 0-7 days past expiry). We send at 3+ days past = daysLeft <= -3.
        const daysPast = Math.abs(daysLeft);
        if (daysPast >= 3 && !sentActions.has(ACTION_J3)) {
          action = ACTION_J3;
        }
      }

      if (!action && daysLeft >= 0 && daysLeft <= 3) {
        // J-0: expiry day or within 3 days of expiry
        if (!sentActions.has(ACTION_J0)) {
          action = ACTION_J0;
        }
      }

      if (!action && daysLeft > 3 && daysLeft <= 7) {
        // J-7: 4 to 7 days before expiry
        if (!sentActions.has(ACTION_J7)) {
          action = ACTION_J7;
        }
      }

      if (!action && daysLeft > 25 && daysLeft <= 30) {
        // J-30: 26 to 30 days before expiry
        if (!sentActions.has(ACTION_J30)) {
          action = ACTION_J30;
        }
      }

      if (!action) {
        stats.skipped++;
        continue;
      }

      // Common params for all renewal emails
      const lang = ((profile.quizData?.lang as string) || "fr") as
        | "fr"
        | "en";

      const emailParams = {
        to: email,
        lang,
        token: profile.token,
        expiryDate: profile.expiry,
        reportsCount: profile.reportsGenerated.length,
        profilesCount: profile.profiles.length,
      };

      // Dispatch to the appropriate email sender
      switch (action) {
        case ACTION_J30:
          await sendRenewalReminderJ30Email(emailParams);
          stats.j30++;
          break;
        case ACTION_J7:
          await sendRenewalReminderJ7Email(emailParams);
          stats.j7++;
          break;
        case ACTION_J0:
          await sendRenewalExpiryEmail(emailParams);
          stats.j0++;
          break;
        case ACTION_J3:
          await sendRenewalGraceEmail(emailParams);
          stats.j3++;
          break;
      }

      // Log to changelog for deduplication
      await updateExpertProfile(email, {
        changelog: [
          ...profile.changelog,
          {
            date: new Date().toISOString(),
            action,
            details: {
              daysLeft: Math.round(daysLeft * 10) / 10,
              expiryDate: profile.expiry,
            },
          },
        ],
      });
    } catch (err) {
      console.error(`[cron/renewal] Error processing ${email}:`, err);
      stats.errors++;
    }
  }

  console.log(
    `[cron/renewal] Processed ${allProfiles.length} profiles:`,
    stats
  );

  return NextResponse.json({
    processed: allProfiles.length,
    ...stats,
  });
}
