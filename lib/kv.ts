// /lib/kv.ts
// Vercel KV (Upstash Redis) — Expert profile, referral, and rate-limit state
// Key patterns: expert:{email}, token:{uuid}, referral:{code}, processed:{sessionId}

import { Redis } from "@upstash/redis";
import { randomUUID, randomBytes } from "crypto";
import { ENGINE_VERSION } from "@/lib/api-helpers";

export const KV_SCHEMA_VERSION = "1.0";

// ── Redis client ──────────────────────────────────────────

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// ── Types ─────────────────────────────────────────────────

export interface ExpertProfile {
  token: string;
  expiry: string; // ISO 8601
  exportsAI: number; // 5 (year 1), 3 (renewal)
  bilanUsed: boolean;
  profiles: SavedProfile[]; // max 5
  quizData: Record<string, unknown>;
  changelog: ChangelogEntry[];
  created: string; // ISO 8601
  lastAccess: string; // ISO 8601
  tier: "expert";
  accountType: "personal" | "b2b";
  upgradedFrom: "essentiel" | "intermediaire" | null;
  engineVersion: string;
  constantsYear: number;
  reportsGenerated: GeneratedReport[];
  referralCode: string;
  abuseFlag?: boolean; // BUG 20: set when 5+ exports detected in 7 days
  deletionRequestedAt?: string; // ISO 8601 — set when user requests deletion
  deletionScheduledAt?: string; // ISO 8601 — actual purge fires on/after this date
}

export interface SavedProfile {
  id: string;
  name: string;
  data: Record<string, unknown>;
  created: string;
  lastUsed: string;
}

export interface ChangelogEntry {
  date: string;
  action: string;
  details: Record<string, unknown>;
}

export interface GeneratedReport {
  id: string;
  date: string;
  type: "expert" | "bilan";
  sections: string[];
  engineVersion: string;
  fiscalYear: number;
  blobUrl: string;
  aiStatus: "full" | "fallback";
}

export interface ReferralRecord {
  referrerEmail: string;
  uses: number;
  conversions: number;
  created: string;
}

// ── Key patterns ──────────────────────────────────────────

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

const KEYS = {
  expert: (email: string) => `expert:${normalizeEmail(email)}`,
  token: (token: string) => `token:${token}`,
  referral: (code: string) => `referral:${code}`,
  rateLimit: (type: string, token: string) => `ratelimit:${type}:${token}`,
  processed: (sessionId: string) => `processed:${sessionId}`,
  feedback: (token: string) => `feedback:${token}`,
  feedbackEmail: (email: string) => `feedback-email:${normalizeEmail(email)}`,
} as const;

// ── Expert Profile CRUD ───────────────────────────────────

export async function createExpertProfile(
  email: string,
  options?: {
    upgradedFrom?: "essentiel" | "intermediaire" | null;
    quizData?: Record<string, unknown>;
    referralCode?: string;
  }
): Promise<ExpertProfile> {
  const norm = normalizeEmail(email);
  const now = new Date().toISOString();
  const token = randomUUID();
  const referralCode = options?.referralCode || generateReferralCode();

  const profile: ExpertProfile = {
    token,
    expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    exportsAI: 5,
    bilanUsed: false,
    profiles: [],
    quizData: options?.quizData || {},
    changelog: [{ date: now, action: "account_created", details: {} }],
    created: now,
    lastAccess: now,
    tier: "expert",
    accountType: "personal",
    upgradedFrom: options?.upgradedFrom || null,
    engineVersion: ENGINE_VERSION,
    constantsYear: 2026,
    reportsGenerated: [],
    referralCode,
  };

  await redis.set(KEYS.expert(norm), profile);
  await setTokenIndex(token, norm);

  // Create referral record
  await redis.set(KEYS.referral(referralCode), {
    referrerEmail: norm,
    uses: 0,
    conversions: 0,
    created: now,
  } satisfies ReferralRecord);

  return profile;
}

export async function getExpertProfile(
  email: string
): Promise<ExpertProfile | null> {
  return redis.get<ExpertProfile>(KEYS.expert(normalizeEmail(email)));
}

export async function getExpertProfileByToken(
  token: string
): Promise<{ email: string; profile: ExpertProfile } | null> {
  const email = await redis.get<string>(KEYS.token(token));
  if (!email) {
    console.log(`[kv] token:${token.slice(0, 8)}... → no email found`);
    return null;
  }

  const profile = await redis.get<ExpertProfile>(KEYS.expert(email));
  if (!profile) {
    console.log(`[kv] expert:${email} → no profile found`);
    return null;
  }
  if (profile.token !== token) {
    console.log(`[kv] Token mismatch for ${email}: profile has ${profile.token.slice(0, 8)}..., got ${token.slice(0, 8)}...`);
    return null;
  }

  return { email, profile };
}

export async function updateExpertProfile(
  email: string,
  updates: Partial<ExpertProfile>
): Promise<ExpertProfile | null> {
  const norm = normalizeEmail(email);
  const existing = await redis.get<ExpertProfile>(KEYS.expert(norm));
  if (!existing) return null;

  const updated: ExpertProfile = {
    ...existing,
    ...updates,
    lastAccess: new Date().toISOString(),
  };
  await redis.set(KEYS.expert(norm), updated);
  return updated;
}

export async function setTokenIndex(
  token: string,
  email: string
): Promise<void> {
  // TTL 366 days — matches profile expiry with safety margin
  await redis.set(KEYS.token(token), normalizeEmail(email), { ex: 366 * 86400 });
}

export async function invalidateToken(token: string): Promise<void> {
  await redis.del(KEYS.token(token));
}

export async function decrementExportCredit(
  email: string
): Promise<{ success: boolean; remaining: number }> {
  // Atomic decrement via Lua script to prevent race conditions
  const key = KEYS.expert(normalizeEmail(email));
  const script = `
    local data = redis.call('GET', KEYS[1])
    if not data then return {0, -1} end
    local profile = cjson.decode(data)
    if not profile.exportsAI or profile.exportsAI <= 0 then
      return {0, profile.exportsAI or 0}
    end
    profile.exportsAI = profile.exportsAI - 1
    redis.call('SET', KEYS[1], cjson.encode(profile))
    return {1, profile.exportsAI}
  `;
  try {
    const result = await redis.eval(script, [key], []) as [number, number];
    return { success: result[0] === 1, remaining: result[1] };
  } catch {
    // Fallback to non-atomic if Lua not supported (e.g., test env)
    const profile = await getExpertProfile(email);
    if (!profile || profile.exportsAI <= 0) {
      return { success: false, remaining: profile?.exportsAI ?? 0 };
    }
    const remaining = profile.exportsAI - 1;
    await updateExpertProfile(email, { exportsAI: remaining });
    return { success: true, remaining };
  }
}

export async function incrementExportCredit(
  email: string
): Promise<{ success: boolean; remaining: number }> {
  const norm = normalizeEmail(email);
  const key = KEYS.expert(norm);
  try {
    const result = await redis.eval(
      `local d = redis.call('GET', KEYS[1])
       if not d then return {0, -1} end
       local p = cjson.decode(d)
       p.exportsAI = (p.exportsAI or 0) + 1
       redis.call('SET', KEYS[1], cjson.encode(p))
       return {1, p.exportsAI}`,
      [key], []
    ) as [number, number];
    return { success: result[0] === 1, remaining: result[1] };
  } catch {
    const profile = await getExpertProfile(email);
    if (!profile) return { success: false, remaining: 0 };
    const remaining = profile.exportsAI + 1;
    await updateExpertProfile(email, { exportsAI: remaining });
    return { success: true, remaining };
  }
}

export async function renewExpertProfile(
  email: string
): Promise<ExpertProfile | null> {
  const norm = normalizeEmail(email);
  const existing = await redis.get<ExpertProfile>(KEYS.expert(norm));
  if (!existing) return null;

  const now = new Date().toISOString();
  const newExpiry = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000
  ).toISOString();
  const newToken = randomUUID();

  const updated: Partial<ExpertProfile> = {
    token: newToken,
    expiry: newExpiry,
    exportsAI: 3, // renewal = 3 credits
    bilanUsed: false,
    changelog: [
      ...existing.changelog,
      { date: now, action: "renewal", details: { newExpiry } },
    ],
  };

  // Invalidate old token before setting new one
  if (existing.token) {
    await redis.del(KEYS.token(existing.token));
  }

  const result = await updateExpertProfile(norm, updated);
  if (result) {
    await setTokenIndex(newToken, norm);
  }
  return result;
}

// ── Referral CRUD ─────────────────────────────────────────

export function generateReferralCode(): string {
  // 8-char alphanumeric, no ambiguous chars (0/O, 1/I/L)
  const chars = "ACDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export async function createReferralRecord(
  code: string,
  email: string
): Promise<void> {
  await redis.set(KEYS.referral(code), {
    referrerEmail: normalizeEmail(email),
    uses: 0,
    conversions: 0,
    created: new Date().toISOString(),
  } satisfies ReferralRecord);
}

export async function getReferral(
  code: string
): Promise<ReferralRecord | null> {
  return redis.get<ReferralRecord>(KEYS.referral(code));
}

export async function incrementReferralUse(code: string): Promise<void> {
  const record = await getReferral(code);
  if (!record) return;
  await redis.set(KEYS.referral(code), {
    ...record,
    uses: record.uses + 1,
  });
}

export async function incrementReferralConversion(
  code: string
): Promise<ReferralRecord | null> {
  const record = await getReferral(code);
  if (!record) return null;
  const updated: ReferralRecord = {
    ...record,
    conversions: record.conversions + 1,
  };
  await redis.set(KEYS.referral(code), updated);
  return updated;
}

// ── Idempotency ───────────────────────────────────────────

export async function markProcessed(sessionId: string): Promise<boolean> {
  // Atomic SET NX — returns true only for the first caller
  const key = KEYS.processed(sessionId);
  const result = await redis.set(key, true, { nx: true, ex: 7 * 86400 });
  return result === "OK";
}

export async function unmarkProcessed(sessionId: string): Promise<void> {
  // Remove idempotency flag so Stripe retries can re-process on failure
  await redis.del(KEYS.processed(sessionId));
}

// ── Feedback Loop ─────────────────────────────────────────

export interface FeedbackRecord {
  token: string;
  email: string;
  tier: "essentiel" | "intermediaire" | "expert" | "decaissement";
  purchaseDate: string; // ISO 8601
  rating: number | null; // 1-5
  ratingDate: string | null;
  nps: boolean | null;
  text: string | null;
  testimonialConsent: "named" | "anonymous" | "none" | null;
  testimonialText: string | null;
  source: "report" | "email_j3" | "email_j7" | "page" | null;
  lang: "fr" | "en";
  couponUnlocked: boolean;
  j3Sent: boolean;
  j7Sent: boolean;
  j14Sent: boolean;
}

export async function createFeedbackRecord(
  token: string,
  email: string,
  tier: "essentiel" | "intermediaire" | "expert" | "decaissement",
  lang: "fr" | "en" = "fr"
): Promise<FeedbackRecord> {
  const norm = normalizeEmail(email);
  const record: FeedbackRecord = {
    token,
    email: norm,
    tier,
    purchaseDate: new Date().toISOString(),
    rating: null,
    ratingDate: null,
    nps: null,
    text: null,
    testimonialConsent: null,
    testimonialText: null,
    source: null,
    lang,
    couponUnlocked: false,
    j3Sent: false,
    j7Sent: false,
    j14Sent: false,
  };

  // Store record + email index, TTL 365 days
  await redis.set(KEYS.feedback(token), record, { ex: 365 * 86400 });
  await redis.set(KEYS.feedbackEmail(norm), token, { ex: 365 * 86400 });
  return record;
}

export async function getFeedbackByToken(
  token: string
): Promise<FeedbackRecord | null> {
  return redis.get<FeedbackRecord>(KEYS.feedback(token));
}

export async function updateFeedbackRating(
  token: string,
  rating: number,
  source: FeedbackRecord["source"]
): Promise<FeedbackRecord | null> {
  const record = await getFeedbackByToken(token);
  if (!record) return null;

  const updated: FeedbackRecord = {
    ...record,
    rating,
    ratingDate: new Date().toISOString(),
    source: record.source || source,
    couponUnlocked: true,
  };
  await redis.set(KEYS.feedback(token), updated, { ex: 365 * 86400 });
  return updated;
}

export async function updateFeedbackFull(
  token: string,
  data: Partial<Pick<FeedbackRecord, "rating" | "nps" | "text" | "testimonialConsent" | "testimonialText" | "source">>
): Promise<FeedbackRecord | null> {
  const record = await getFeedbackByToken(token);
  if (!record) return null;

  const updated: FeedbackRecord = {
    ...record,
    ...data,
    ratingDate: data.rating != null ? new Date().toISOString() : record.ratingDate,
    couponUnlocked: data.rating != null ? true : record.couponUnlocked,
  };
  await redis.set(KEYS.feedback(token), updated, { ex: 365 * 86400 });
  return updated;
}

export async function getFeedbackByEmail(
  email: string
): Promise<FeedbackRecord | null> {
  const token = await redis.get<string>(KEYS.feedbackEmail(normalizeEmail(email)));
  if (!token) return null;
  return getFeedbackByToken(token);
}

export async function listPendingFeedback(): Promise<FeedbackRecord[]> {
  // Scan for all feedback:* keys, filter pending ones
  const results: FeedbackRecord[] = [];
  let cursor = 0;
  do {
    const [nextCursor, keys] = await redis.scan(cursor, {
      match: "feedback:*",
      count: 100,
    });
    cursor = typeof nextCursor === "number" ? nextCursor : parseInt(nextCursor as string);
    for (const key of keys) {
      // Skip email index keys
      if (key.startsWith("feedback-email:")) continue;
      const record = await redis.get<FeedbackRecord>(key);
      if (record) results.push(record);
    }
  } while (cursor !== 0);
  return results;
}

// ── Renewal Scan ─────────────────────────────────────────

export async function listExpertProfiles(): Promise<
  { email: string; profile: ExpertProfile }[]
> {
  const results: { email: string; profile: ExpertProfile }[] = [];
  let cursor = 0;
  do {
    const [nextCursor, keys] = await redis.scan(cursor, {
      match: "expert:*",
      count: 100,
    });
    cursor =
      typeof nextCursor === "number"
        ? nextCursor
        : parseInt(nextCursor as string);
    for (const key of keys) {
      const email = key.replace("expert:", "");
      const profile = await redis.get<ExpertProfile>(key);
      if (profile) results.push({ email, profile });
    }
  } while (cursor !== 0);
  return results;
}

// ── Hard delete an expert profile (LPRPDE/Loi 25 purge) ──────────
// Removes both the profile key and its token index entry.
export async function deleteExpertProfile(email: string): Promise<boolean> {
  const norm = normalizeEmail(email);
  const profile = await redis.get<ExpertProfile>(KEYS.expert(norm));
  if (!profile) return false;
  // Remove token index so the token can no longer authenticate
  await redis.del(KEYS.token(profile.token));
  // Remove the profile itself
  await redis.del(KEYS.expert(norm));
  return true;
}

// ── Export redis for direct use in rate-limit.ts ──────────

export { redis, KEYS };
