// /app/api/admin/stats/route.ts
// Admin stats endpoint — aggregate Expert profile and email delivery metrics
// Protected by CRON_SECRET Bearer token

import { NextRequest, NextResponse } from "next/server";
import { listExpertProfiles } from "@/lib/kv";
import { getEmailStats, checkAlertThresholds } from "@/lib/email-monitor";
import type { ExpertProfile, ChangelogEntry } from "@/lib/kv";
import type { EmailStats, Alert } from "@/lib/email-monitor";

interface ProfileStats {
  total: number;
  active: number;
  expired: number;
  totalExportsUsed: number;
  totalReportsGenerated: number;
  averageSuccessRate: number | null;
  byUpgradeSource: {
    essentiel: number;
    intermediaire: number;
    direct: number;
  };
}

interface RecentActivity {
  date: string;
  email: string; // masked
  action: string;
}

interface StatsResponse {
  profiles: ProfileStats;
  email: EmailStats & {
    bounceRate: string;
    complaintRate: string;
    alerts: Alert[];
  };
  recentActivity: RecentActivity[];
  timestamp: string;
}

/** Mask email: j***@example.com */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***";
  const first = local.charAt(0);
  return `${first}***@${domain}`;
}

export async function GET(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // ── Profile Stats ─────────────────────────────────────────
  let allProfiles: { email: string; profile: ExpertProfile }[] = [];
  try {
    allProfiles = await listExpertProfiles();
  } catch (err) {
    return NextResponse.json(
      {
        error: "Failed to fetch profiles",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }

  const total = allProfiles.length;
  let active = 0;
  let expired = 0;
  let totalExportsUsed = 0;
  let totalReportsGenerated = 0;
  const byUpgradeSource = { essentiel: 0, intermediaire: 0, direct: 0 };

  // Collect all changelog entries for recent activity
  const allChangelogs: { email: string; entry: ChangelogEntry }[] = [];

  for (const { email, profile } of allProfiles) {
    // Active vs expired
    const expiryDate = new Date(profile.expiry);
    if (expiryDate > now) {
      active++;
    } else {
      expired++;
    }

    // Exports used: initial allocation minus remaining (5 for new, 3 for renewal)
    const isRenewal = profile.changelog?.some((c: { action: string }) => c.action === "renewal_success");
    const maxExports = isRenewal ? 3 : 5;
    totalExportsUsed += Math.max(0, maxExports - profile.exportsAI);

    // Reports generated
    totalReportsGenerated += profile.reportsGenerated?.length ?? 0;

    // Upgrade source
    if (profile.upgradedFrom === "essentiel") {
      byUpgradeSource.essentiel++;
    } else if (profile.upgradedFrom === "intermediaire") {
      byUpgradeSource.intermediaire++;
    } else {
      byUpgradeSource.direct++;
    }

    // Collect changelog entries
    if (profile.changelog) {
      for (const entry of profile.changelog) {
        allChangelogs.push({ email, entry });
      }
    }
  }

  const profileStats: ProfileStats = {
    total,
    active,
    expired,
    totalExportsUsed,
    totalReportsGenerated,
    averageSuccessRate: null, // MC success rate not stored per profile
    byUpgradeSource,
  };

  // ── Recent Activity (last 10 changelog entries) ───────────
  const recentActivity: RecentActivity[] = allChangelogs
    .sort((a, b) => new Date(b.entry.date).getTime() - new Date(a.entry.date).getTime())
    .slice(0, 10)
    .map(({ email, entry }) => ({
      date: entry.date,
      email: maskEmail(email),
      action: entry.action,
    }));

  // ── Email Stats ───────────────────────────────────────────
  let emailStats: EmailStats;
  let alerts: Alert[];
  try {
    emailStats = await getEmailStats();
    alerts = await checkAlertThresholds();
  } catch {
    emailStats = {
      delivered: 0,
      bounced: 0,
      complained: 0,
      lastUpdated: now.toISOString(),
    };
    alerts = [];
  }

  const bounceRate =
    emailStats.delivered > 0
      ? ((emailStats.bounced / emailStats.delivered) * 100).toFixed(2)
      : "0.00";
  const complaintRate =
    emailStats.delivered > 0
      ? ((emailStats.complained / emailStats.delivered) * 100).toFixed(2)
      : "0.00";

  const response: StatsResponse = {
    profiles: profileStats,
    email: {
      ...emailStats,
      bounceRate: `${bounceRate}%`,
      complaintRate: `${complaintRate}%`,
      alerts,
    },
    recentActivity,
    timestamp: now.toISOString(),
  };

  return NextResponse.json(response);
}
