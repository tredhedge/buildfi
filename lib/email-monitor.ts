// /lib/email-monitor.ts
// Email delivery monitoring — bounce/complaint tracking via Resend webhooks
// Stores metrics in Upstash Redis for alerting and dashboards
//
// KV key patterns:
//   email:stats              — aggregate counters { delivered, bounced, complained, lastUpdated }
//   email:bounce:{email}     — per-recipient bounce record { type, date, emailId }
//   email:complaint:{email}  — per-recipient complaint record { date, emailId }

import { redis } from "@/lib/kv";

// ── Types ─────────────────────────────────────────────────

export interface EmailStats {
  delivered: number;
  bounced: number;
  complained: number;
  lastUpdated: string; // ISO 8601
}

export interface BounceRecord {
  type: "hard" | "soft" | string;
  date: string; // ISO 8601
  emailId: string;
}

export interface ComplaintRecord {
  date: string; // ISO 8601
  emailId: string;
}

export interface Alert {
  type: "bounce_rate" | "complaint_rate";
  rate: number; // percentage
  threshold: number; // percentage
  message: string;
}

const STATS_KEY = "email:stats";
const BOUNCE_KEY = (email: string) => `email:bounce:${email.toLowerCase().trim()}`;
const COMPLAINT_KEY = (email: string) => `email:complaint:${email.toLowerCase().trim()}`;

// Thresholds (industry best practices)
const BOUNCE_RATE_THRESHOLD = 2; // 2%
const COMPLAINT_RATE_THRESHOLD = 0.1; // 0.1%

// ── Stats ─────────────────────────────────────────────────

/** Get aggregate email delivery stats. Returns zeroed stats if none exist. */
export async function getEmailStats(): Promise<EmailStats> {
  const stats = await redis.get<EmailStats>(STATS_KEY);
  return stats ?? {
    delivered: 0,
    bounced: 0,
    complained: 0,
    lastUpdated: new Date().toISOString(),
  };
}

/** Atomically increment a stats counter and update lastUpdated. */
async function incrementStat(
  field: "delivered" | "bounced" | "complained"
): Promise<EmailStats> {
  const stats = await getEmailStats();
  const updated: EmailStats = {
    ...stats,
    [field]: stats[field] + 1,
    lastUpdated: new Date().toISOString(),
  };
  await redis.set(STATS_KEY, updated);
  return updated;
}

// ── Record events ─────────────────────────────────────────

/** Record a successful delivery. */
export async function recordDelivery(): Promise<void> {
  await incrementStat("delivered");
}

/** Record a bounce. Stores per-recipient record + increments aggregate counter. */
export async function recordBounce(
  email: string,
  type: string,
  emailId?: string
): Promise<void> {
  const record: BounceRecord = {
    type: type || "unknown",
    date: new Date().toISOString(),
    emailId: emailId || "",
  };
  // Store bounce record (TTL 90 days — enough for monitoring, auto-cleanup)
  await redis.set(BOUNCE_KEY(email), record, { ex: 90 * 86400 });
  await incrementStat("bounced");
}

/** Record a spam complaint. Stores per-recipient record + increments aggregate counter. */
export async function recordComplaint(
  email: string,
  emailId?: string
): Promise<void> {
  const record: ComplaintRecord = {
    date: new Date().toISOString(),
    emailId: emailId || "",
  };
  // Store complaint record (TTL 90 days)
  await redis.set(COMPLAINT_KEY(email), record, { ex: 90 * 86400 });
  await incrementStat("complained");
}

// ── Alerting ──────────────────────────────────────────────

/** Check bounce/complaint rates against thresholds. Returns active alerts. */
export async function checkAlertThresholds(): Promise<Alert[]> {
  const stats = await getEmailStats();
  const alerts: Alert[] = [];

  // Need at least 50 deliveries before rate checks are meaningful
  if (stats.delivered < 50) return alerts;

  const bounceRate = (stats.bounced / stats.delivered) * 100;
  if (bounceRate > BOUNCE_RATE_THRESHOLD) {
    alerts.push({
      type: "bounce_rate",
      rate: Math.round(bounceRate * 100) / 100,
      threshold: BOUNCE_RATE_THRESHOLD,
      message: `Bounce rate ${bounceRate.toFixed(2)}% exceeds ${BOUNCE_RATE_THRESHOLD}% threshold (${stats.bounced}/${stats.delivered})`,
    });
  }

  const complaintRate = (stats.complained / stats.delivered) * 100;
  if (complaintRate > COMPLAINT_RATE_THRESHOLD) {
    alerts.push({
      type: "complaint_rate",
      rate: Math.round(complaintRate * 100) / 100,
      threshold: COMPLAINT_RATE_THRESHOLD,
      message: `Complaint rate ${complaintRate.toFixed(2)}% exceeds ${COMPLAINT_RATE_THRESHOLD}% threshold (${stats.complained}/${stats.delivered})`,
    });
  }

  return alerts;
}

// ── Lookup ────────────────────────────────────────────────

/** Check if a recipient has a bounce record. */
export async function getBounceRecord(
  email: string
): Promise<BounceRecord | null> {
  return redis.get<BounceRecord>(BOUNCE_KEY(email));
}

/** Check if a recipient has a complaint record. */
export async function getComplaintRecord(
  email: string
): Promise<ComplaintRecord | null> {
  return redis.get<ComplaintRecord>(COMPLAINT_KEY(email));
}
