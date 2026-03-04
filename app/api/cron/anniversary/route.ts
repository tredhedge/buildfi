// /app/api/cron/anniversary/route.ts
// Daily cron job: send 6-month recalculation reminder to Expert users
// Protected by CRON_SECRET Authorization header
// Vercel cron: 0 16 * * * (4 PM UTC = 12 PM ET)

import { NextRequest, NextResponse } from "next/server";
import { listExpertProfiles, updateExpertProfile } from "@/lib/kv";
import { sendAnniversaryReminderEmail } from "@/lib/email-expert";

export const maxDuration = 60;

function monthsSinceLastAccess(lastAccessISO: string): number {
  return (Date.now() - new Date(lastAccessISO).getTime()) / (30.44 * 86400000);
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allProfiles = await listExpertProfiles();
  const stats = { sent: 0, skipped: 0, errors: 0 };

  for (const { email, profile } of allProfiles) {
    try {
      // Skip expired profiles
      if (new Date(profile.expiry) < new Date()) {
        stats.skipped++;
        continue;
      }

      // Check if lastAccess is 6+ months ago
      const monthsAgo = monthsSinceLastAccess(profile.lastAccess);
      if (monthsAgo < 6) {
        stats.skipped++;
        continue;
      }

      // Check if we already sent this reminder (anniversary_6m_sent in changelog)
      const alreadySent = profile.changelog.some(
        (c) => c.action === "anniversary_6m_sent"
      );
      if (alreadySent) {
        stats.skipped++;
        continue;
      }

      const lang = ((profile.quizData?.lang as string) || "fr") as "fr" | "en";

      // Build contextual questions based on profile data
      const contextualQuestions = buildContextualQuestions(profile, lang);

      await sendAnniversaryReminderEmail({
        to: email,
        lang,
        lastAccessDate: profile.lastAccess,
        contextualQuestions,
        token: profile.token,
      });

      // Track that the reminder was sent via changelog
      await updateExpertProfile(email, {
        changelog: [
          ...profile.changelog,
          {
            date: new Date().toISOString(),
            action: "anniversary_6m_sent",
            details: { monthsSinceLastAccess: Math.round(monthsAgo) },
          },
        ],
      });

      stats.sent++;
    } catch (err) {
      console.error(`[cron/anniversary] Error processing ${email}:`, err);
      stats.errors++;
    }
  }

  console.log(
    `[cron/anniversary] Processed ${allProfiles.length} profiles:`,
    stats
  );

  return NextResponse.json({
    processed: allProfiles.length,
    ...stats,
  });
}

// ── Build contextual questions based on profile data ──────────────

function buildContextualQuestions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: Record<string, any>,
  lang: "fr" | "en"
): string[] {
  const fr = lang === "fr";
  const questions: string[] = [];
  const quiz = profile.quizData || {};

  // Always ask about salary changes
  questions.push(
    fr
      ? "Votre revenu a-t-il chang\u00e9 depuis votre dernier calcul?"
      : "Has your income changed since your last calculation?"
  );

  // Retirement age
  if (quiz.retAge) {
    questions.push(
      fr
        ? `Votre objectif de retraite \u00e0 ${quiz.retAge} ans est-il toujours d'actualit\u00e9?`
        : `Is your retirement target of age ${quiz.retAge} still current?`
    );
  }

  // Couple questions
  if (quiz.couple || profile.cOn) {
    questions.push(
      fr
        ? "La situation de votre conjoint(e) a-t-elle \u00e9volu\u00e9 (emploi, retraite, etc.)?"
        : "Has your partner's situation changed (employment, retirement, etc.)?"
    );
  }

  // Real estate
  if (quiz.homeVal || quiz.mortgage) {
    questions.push(
      fr
        ? "Votre situation immobili\u00e8re a-t-elle chang\u00e9 (vente, achat, refinancement)?"
        : "Has your real estate situation changed (sale, purchase, refinancing)?"
    );
  }

  // Savings
  questions.push(
    fr
      ? "Avez-vous fait des cotisations ou retraits importants de votre REER ou CELI?"
      : "Have you made significant RRSP or TFSA contributions or withdrawals?"
  );

  // Market conditions
  questions.push(
    fr
      ? "Souhaitez-vous voir l'impact des conditions de march\u00e9 r\u00e9centes sur votre plan?"
      : "Would you like to see the impact of recent market conditions on your plan?"
  );

  return questions;
}
