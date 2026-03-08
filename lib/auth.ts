// /lib/auth.ts
// Magic link token verification — reusable across all authenticated routes
// Supports ?token= query param (magic links) and Authorization: Bearer (API calls)

import { NextRequest } from "next/server";
import { getExpertProfileByToken, type ExpertProfile } from "@/lib/kv";

export interface AuthResult {
  authenticated: boolean;
  email?: string;
  profile?: ExpertProfile;
  error?: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Mask email for logs: "alice@example.com" → "al***@ex***.com" */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const [dname, ...drest] = domain.split(".");
  return `${local.slice(0, 2)}***@${dname.slice(0, 2)}***.${drest.join(".")}`;
}

export async function verifyToken(req: NextRequest): Promise<AuthResult> {
  // Extract token from query param or Authorization header
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get("token");
  const authHeader = req.headers.get("authorization");
  const tokenFromHeader = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  const token = tokenFromQuery || tokenFromHeader;

  if (!token) {
    console.log("[auth] No token provided in query or header");
    return { authenticated: false, error: "No token provided" };
  }

  if (!UUID_RE.test(token)) {
    console.log(`[auth] Invalid token format: ${token.slice(0, 8)}...`);
    return { authenticated: false, error: "Invalid token format" };
  }

  try {
    const result = await getExpertProfileByToken(token);
    if (!result) {
      console.log(`[auth] Token not found in KV: ${token.slice(0, 8)}...`);
      return { authenticated: false, error: "Token not found" };
    }

    const { email, profile } = result;

    if (new Date(profile.expiry) < new Date()) {
      console.log(`[auth] Token expired for ${maskEmail(email)}, expiry: ${profile.expiry}`);
      return { authenticated: false, error: "Token expired" };
    }

    console.log(`[auth] Token verified for ${maskEmail(email)}`);
    return { authenticated: true, email, profile };
  } catch (err) {
    console.error("[auth] KV lookup error:", err);
    return { authenticated: false, error: "KV lookup failed" };
  }
}

export function buildMagicLinkUrl(token: string): string {
  let base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.buildfi.ca";
  // Ensure www — buildfi.ca 307-redirects to www and strips query params
  base = base.replace("https://buildfi.ca", "https://www.buildfi.ca");
  return `${base}/simulateur?token=${token}`;
}
