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
    return { authenticated: false, error: "No token provided" };
  }

  if (!UUID_RE.test(token)) {
    return { authenticated: false, error: "Invalid token format" };
  }

  const result = await getExpertProfileByToken(token);
  if (!result) {
    return { authenticated: false, error: "Token not found" };
  }

  const { email, profile } = result;

  if (new Date(profile.expiry) < new Date()) {
    return { authenticated: false, error: "Token expired" };
  }

  return { authenticated: true, email, profile };
}

export function buildMagicLinkUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.buildfi.ca";
  return `${base}/simulateur?token=${token}`;
}
