// /api/cron/ba-reminder — BA-FEAT-10
// Monthly cron: sends BA update reminders to subscribed users
// Schedule: 1st of each month at 13:00 UTC

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Resend } from "resend";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: NextRequest) {
  // BA-SEC: Verify cron authorization
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Scan for ba-reminder:* keys
    let cursor = "0";
    let sent = 0;
    let skipped = 0;

    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: "ba-reminder:*", count: 100 }) as [string, string[]];
      cursor = nextCursor;

      for (const key of keys) {
        const record = await redis.get(key) as any;
        if (!record?.active || !record?.email) { skipped++; continue; }

        // Check frequency: quarterly = months 1,4,7,10; annual = month 1 only
        const month = new Date().getMonth() + 1;
        if (record.frequency === "annual" && month !== 1) { skipped++; continue; }
        if (record.frequency === "quarterly" && ![1, 4, 7, 10].includes(month)) { skipped++; continue; }

        const fr = record.lang !== "en";
        try {
          await resend.emails.send({
            from: process.env.RESEND_FROM || "BuildFi <noreply@buildfi.ca>",
            to: record.email,
            subject: fr ? "Mise à jour de votre Bilan Annuel" : "Update your Balance Sheet",
            html: `<div style="font-family:system-ui;max-width:500px;margin:0 auto;padding:20px">
              <h2 style="color:#1a2744">${fr ? "Temps de mettre à jour votre bilan!" : "Time to update your balance sheet!"}</h2>
              <p style="color:#444;line-height:1.7">${fr
                ? "Vos comptes ont bougé depuis votre dernier bilan. Mettez à jour vos chiffres pour suivre votre progression."
                : "Your accounts have changed since your last snapshot. Update your numbers to track your progress."}</p>
              <a href="https://buildfi.ca/outils/bilan-annuel" style="display:inline-block;padding:12px 24px;background:#c49a1a;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;margin:16px 0">
                ${fr ? "Mettre à jour mon bilan" : "Update my balance sheet"}
              </a>
              <p style="font-size:12px;color:#999;margin-top:24px">${fr
                ? "Pour vous désabonner, ouvrez votre Bilan Annuel → Réglages → Rappels → Désactiver."
                : "To unsubscribe, open your Balance Sheet → Settings → Reminders → Disable."}</p>
              <p style="font-size:11px;color:#bbb">BuildFi Technologies inc. · buildfi.ca</p>
            </div>`,
          });
          sent++;
        } catch (emailErr) {
          console.error(`Failed to send BA reminder to ${record.email}:`, emailErr);
        }
      }
    } while (cursor !== "0");

    return NextResponse.json({ sent, skipped });
  } catch (e: any) {
    console.error("BA reminder cron error:", e);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
