// /lib/auth.ts
// Magic-link auth helpers for Planner portal + protected API routes.
//
// Pattern: user arrives with ?token=uuid (or Authorization: Bearer uuid).
// We verify against KV (token:{uuid} → email, 366-day TTL).
// Rate limit + credit checks are applied in api-helpers.authenticateAndRateLimit.

import { NextRequest } from "next/server";
import { getExpertProfileByToken } from "@/lib/kv";

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
