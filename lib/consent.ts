// /lib/consent.ts
// Loi 25 / LPRPDE consent records.
// ══════════════════════════════════════════════════════════════════════
// Stores a versioned consent receipt in KV. The policy version is bumped
// whenever the privacy policy materially changes; consents from prior
// versions become invalid and the user is re-prompted at next checkout.
//
// Storage: consent:{emailHash}:{policyVersion} → ConsentRecord (90d TTL)
// Email is hashed before storage so the audit log can reference the
// consent without re-storing PII alongside it.
//
// Server-side enforcement only — never trust a client-side checkbox.
// ══════════════════════════════════════════════════════════════════════

import { createHash } from "crypto";
import { Redis } from "@upstash/redis";

// ── Policy versioning ─────────────────────────────────────────────────
// Bump CURRENT_POLICY_VERSION whenever /confidentialite content changes
// in a way that affects what users consented to (data categories, sub-
// processors, retention, rights). Format: YYYY-MM-DD-vN.
export const CURRENT_POLICY_VERSION = "2026-04-26-v1";

// ── Storage ───────────────────────────────────────────────────────────
const CONSENT_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export interface ConsentRecord {
  emailHash: string;
  policyVersion: string;
  acceptedAt: string;       // ISO 8601
  ipHash: string;            // SHA-256 of IP, never raw IP
  userAgentTruncated: string; // first 200 chars
  // Free-form context — checkout type, tier, etc. NEVER PII.
  context?: Record<string, string>;
}

// ── Hashing helpers ───────────────────────────────────────────────────
// The privacy policy promises we don't store IP in plain text and that
// emails-on-audit-trail are anonymized. Use SHA-256 for both.
function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export function hashEmail(email: string): string {
  return sha256(email.toLowerCase().trim());
}

export function hashIp(ip: string): string {
  return sha256(ip || "unknown");
}

function consentKey(emailHash: string, policyVersion: string): string {
  return `consent:${emailHash}:${policyVersion}`;
}

// ── API ───────────────────────────────────────────────────────────────

// Validate a consent payload arriving from the client. Throws on shape
// mismatch — caller should return 400 to the user.
export function validateConsentPayload(raw: unknown): {
  policyVersion: string;
  acceptedAt: string;
} {
  if (!raw || typeof raw !== "object") {
    throw new Error("consent: missing object");
  }
  const c = raw as Record<string, unknown>;
  if (typeof c.policyVersion !== "string" || !c.policyVersion) {
    throw new Error("consent: missing policyVersion");
  }
  if (c.policyVersion !== CURRENT_POLICY_VERSION) {
    throw new Error(
      `consent: policyVersion mismatch (got ${c.policyVersion}, expected ${CURRENT_POLICY_VERSION})`
    );
  }
  if (typeof c.acceptedAt !== "string" || !c.acceptedAt) {
    throw new Error("consent: missing acceptedAt");
  }
  // Sanity: acceptedAt parseable + within last 24h.
  const t = Date.parse(c.acceptedAt);
  if (!isFinite(t) || Math.abs(Date.now() - t) > 24 * 60 * 60 * 1000) {
    throw new Error("consent: acceptedAt out of plausible range");
  }
  return { policyVersion: c.policyVersion, acceptedAt: c.acceptedAt };
}

// Record consent server-side. Idempotent — re-recording overwrites with
// the latest IP/UA.
export async function recordConsent(opts: {
  email: string;
  policyVersion: string;
  acceptedAt: string;
  ip: string;
  userAgent: string;
  context?: Record<string, string>;
}): Promise<ConsentRecord> {
  const emailHash = hashEmail(opts.email);
  const record: ConsentRecord = {
    emailHash,
    policyVersion: opts.policyVersion,
    acceptedAt: opts.acceptedAt,
    ipHash: hashIp(opts.ip),
    userAgentTruncated: (opts.userAgent || "").slice(0, 200),
    context: opts.context,
  };
  await redis.set(consentKey(emailHash, opts.policyVersion), record, {
    ex: CONSENT_TTL_SECONDS,
  });
  return record;
}

// Returns the consent record if valid + current; null otherwise.
export async function getValidConsent(
  email: string
): Promise<ConsentRecord | null> {
  const emailHash = hashEmail(email);
  const record = await redis.get<ConsentRecord>(
    consentKey(emailHash, CURRENT_POLICY_VERSION)
  );
  return record || null;
}

export async function hasValidConsent(email: string): Promise<boolean> {
  return (await getValidConsent(email)) != null;
}

// Used by /api/data/delete to scrub the consent record alongside other
// PII. Call this from the deletion path.
export async function deleteConsent(email: string): Promise<void> {
  const emailHash = hashEmail(email);
  // We don't know which policy versions were active for this user, so
  // we delete the current one and any older ones in a small window. KV
  // doesn't support pattern delete, so callers wishing to be exhaustive
  // should iterate known versions. For now: delete current + log.
  await redis.del(consentKey(emailHash, CURRENT_POLICY_VERSION));
}
