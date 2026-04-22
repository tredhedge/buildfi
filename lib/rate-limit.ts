// /lib/rate-limit.ts
// Token-based sliding-window rate limiter for Planner API routes.
// Redis-backed (Upstash KV). Separate quotas per operation type.
//
// Quotas (per 10-minute window, per token):
//   "export"  — 3  (AI report regeneration — expensive; matches /api/regenerate-report internal limit)
//   "recalc"  — 60 (quick MC reruns from Planner — cheap but rate-limit to prevent abuse)

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const QUOTAS: Record<string, { max: number; windowSec: number }> = {
  export: { max: 3, windowSec: 10 * 60 },
  recalc: { max: 60, windowSec: 10 * 60 },
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
  reason?: string;
}

/**
 * Sliding-window rate check against a token and operation type.
 * Stores recent request timestamps in Redis with TTL matching the window.
 */
export async function checkRateLimit(
  token: string,
  type: "export" | "recalc"
): Promise<RateLimitResult> {
  if (!token) {
    return { allowed: false, remaining: 0, reason: "Missing token for rate limit" };
  }
  const quota = QUOTAS[type];
  if (!quota) {
    return { allowed: true, remaining: 999 };
  }
  const key = `ratelimit:${type}:${token}`;
  const now = Date.now();
  const windowMs = quota.windowSec * 1000;

  try {
    const raw = (await redis.get<number[]>(key)) || [];
    const recent = raw.filter((t) => now - t < windowMs);

    if (recent.length >= quota.max) {
      // Oldest timestamp in the window dictates when next slot opens
      const oldest = recent[0];
      const retryAfterMs = Math.max(0, windowMs - (now - oldest));
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs,
        reason: `Rate limit exceeded: max ${quota.max} per ${Math.round(quota.windowSec / 60)} min`,
      };
    }

    recent.push(now);
    // Reset TTL on every successful request so the window slides
    await redis.set(key, recent, { ex: quota.windowSec });

    return {
      allowed: true,
      remaining: quota.max - recent.length,
    };
  } catch (err) {
    // Fail-open on KV outage so user-facing paths don't break — log loudly.
    console.error("[rate-limit] Redis error, failing open:", err);
    return { allowed: true, remaining: quota.max };
  }
}

/**
 * Reset a rate-limit bucket. Admin/testing only.
 */
export async function resetRateLimit(token: string, type: "export" | "recalc"): Promise<void> {
  const key = `ratelimit:${type}:${token}`;
  await redis.del(key);
}
