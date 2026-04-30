// /lib/auth.ts
// Magic-link auth helpers for Planner portal + protected API routes.
//
// Two distinct token families:
//   1. Session tokens (token:{uuid}) — 366d TTL, reusable, used for portal
//      access. Verified via verifyToken().
//   2. Single-use tokens (single-use-token:{uuid}) — 24h TTL, ONE use only,
//      used for refund + delete actions. Verified via consumeSingleUseToken()
//      which atomically marks the token as used. Second attempt returns
//      `usedBefore: true` and the caller responds 410 Gone.
//
// Rate limit + credit checks are applied in api-helpers.authenticateAndRateLimit.

import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { getExpertProfileByToken, redis } from "@/lib/kv";

export interface AuthResult {
  authenticated: boolean;
  email?: string;
  token?: string;
  error?: string;
}

/**
 * Extracts the magic-link token from the request (header or query param),
 * looks it up in KV, and returns the associated email.
 */
export async function verifyToken(req: NextRequest): Promise<AuthResult> {
  // Authorization: Bearer <token>  OR  ?token=<token>
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const queryToken = new URL(req.url).searchParams.get("token")?.trim() || "";
  const token = bearer || queryToken;

  if (!token || token.length < 10) {
    return { authenticated: false, error: "Missing token" };
  }

  try {
    const result = await getExpertProfileByToken(token);
    if (!result) {
      return { authenticated: false, error: "Invalid or expired token" };
    }
    return { authenticated: true, email: result.email, token };
  } catch (err) {
    console.error("[auth] verifyToken error:", err);
    return { authenticated: false, error: "Auth service unavailable" };
  }
}

/**
 * Build the portal URL the user can click to open their Planner session.
 * Used in transactional emails (purchase confirmation, renewal, etc.).
 */
export function buildMagicLinkUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || "https://www.buildfi.ca";
  return `${base}/expert?token=${encodeURIComponent(token)}`;
}

/**
 * Redact an email address for logs: `ma***@example.ca`.
 * Keeps enough context to distinguish users while protecting PII.
 */
export function maskEmail(email: string | undefined | null): string {
  if (!email) return "(no email)";
  const parts = email.split("@");
  if (parts.length !== 2) return "(invalid)";
  const [local, domain] = parts;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${local.length > 2 ? "***" : ""}@${domain}`;
}

// ── Single-use tokens (refund + delete actions) ───────────────────────
// Pattern:
//   - createSingleUseToken(email, action) → uuid + email goes into KV with
//     24h TTL, key `single-use-token:{uuid}`.
//   - consumeSingleUseToken(uuid) → atomically reads + marks `used:true`.
//     Returns { email, action, usedBefore } so the caller can return 410
//     when usedBefore is true.
//
// Why a separate token family: refund and delete are destructive, so the
// 366-day session token must NOT authorize them. A short-TTL one-shot
// pattern is the standard way to gate destructive flows.

export type SingleUseAction = "refund" | "delete";

export interface SingleUseTokenRecord {
  email: string;
  action: SingleUseAction;
  createdAt: string;
  used: boolean;
  usedAt: string | null;
}

const SINGLE_USE_TTL_SEC = 24 * 60 * 60; // 24h

function singleUseKey(uuid: string): string {
  return `single-use-token:${uuid}`;
}

/** Mint a fresh single-use token for the given email + destructive action. */
export async function createSingleUseToken(
  email: string,
  action: SingleUseAction
): Promise<{ token: string; expiresAt: string }> {
  const token = randomUUID();
  const record: SingleUseTokenRecord = {
    email: email.toLowerCase().trim(),
    action,
    createdAt: new Date().toISOString(),
    used: false,
    usedAt: null,
  };
  await redis.set(singleUseKey(token), record, { ex: SINGLE_USE_TTL_SEC });
  const expiresAt = new Date(Date.now() + SINGLE_USE_TTL_SEC * 1000).toISOString();
  return { token, expiresAt };
}

/**
 * Consume a single-use token. The first call returns the record with
 * `usedBefore=false` and atomically marks it used. Subsequent calls return
 * `usedBefore=true` (caller must respond 410 Gone). A missing/expired token
 * returns null.
 *
 * Implementation note: we use a Lua script for atomicity (read+mark in one
 * round-trip). Falls back to a non-atomic pattern if Lua eval fails (test
 * env). The fallback widens the race window slightly but the worst case is
 * a duplicate refund attempt, which Stripe itself rejects via charge
 * idempotency.
 */
export async function consumeSingleUseToken(uuid: string): Promise<
  | (Pick<SingleUseTokenRecord, "email" | "action"> & { usedBefore: boolean })
  | null
> {
  if (!uuid || uuid.length < 10) return null;
  const key = singleUseKey(uuid);

  // Atomic Lua: GET → if used, return {used=1}; else SET used=true and return {used=0}.
  const script = `
    local raw = redis.call('GET', KEYS[1])
    if not raw then return 0 end
    local data = cjson.decode(raw)
    if data.used == true then
      return {1, raw}
    end
    data.used = true
    data.usedAt = ARGV[1]
    redis.call('SET', KEYS[1], cjson.encode(data), 'KEEPTTL')
    return {0, cjson.encode(data)}
  `;
  try {
    const result = (await redis.eval(script, [key], [
      new Date().toISOString(),
    ])) as 0 | [number, string];
    if (result === 0) return null;
    const [usedBeforeFlag, jsonStr] = result;
    const record = JSON.parse(jsonStr) as SingleUseTokenRecord;
    return {
      email: record.email,
      action: record.action,
      usedBefore: usedBeforeFlag === 1,
    };
  } catch {
    // Non-atomic fallback (test env or Redis without eval support)
    const record = await redis.get<SingleUseTokenRecord>(key);
    if (!record) return null;
    if (record.used) {
      return { email: record.email, action: record.action, usedBefore: true };
    }
    const updated: SingleUseTokenRecord = {
      ...record,
      used: true,
      usedAt: new Date().toISOString(),
    };
    // Preserve TTL by re-using the original ex window (best effort).
    await redis.set(key, updated, { ex: SINGLE_USE_TTL_SEC });
    return { email: record.email, action: record.action, usedBefore: false };
  }
}

/**
 * Verify a single-use token from the request (Authorization: Bearer or
 * ?token=). Atomically marks it used. Returns:
 *   - { ok: true, email, action } on first valid use
 *   - { ok: false, status: 410, error: "token_already_used" } on reuse
 *   - { ok: false, status: 401, error: "invalid_or_expired" } on miss
 */
export async function verifySingleUseToken(
  req: NextRequest,
  expectedAction: SingleUseAction
): Promise<
  | { ok: true; email: string; action: SingleUseAction }
  | { ok: false; status: number; error: string }
> {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const queryToken = new URL(req.url).searchParams.get("token")?.trim() || "";
  const token = bearer || queryToken;
  if (!token || token.length < 10) {
    return { ok: false, status: 401, error: "missing_token" };
  }
  const consumed = await consumeSingleUseToken(token);
  if (!consumed) {
    return { ok: false, status: 401, error: "invalid_or_expired" };
  }
  if (consumed.usedBefore) {
    return { ok: false, status: 410, error: "token_already_used" };
  }
  if (consumed.action !== expectedAction) {
    return { ok: false, status: 403, error: "wrong_action" };
  }
  return { ok: true, email: consumed.email, action: consumed.action };
}
