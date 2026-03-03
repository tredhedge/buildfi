// /lib/rate-limit.ts
// Sliding-window rate limiting backed by Upstash Redis
// Limits: exports 20/day + 2min cooldown, recalcs 100/day

import { redis, KEYS } from "@/lib/kv";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
  reason?: string;
}

const LIMITS = {
  export: { perDay: 20, cooldownMs: 2 * 60 * 1000 },
  recalc: { perDay: 100 },
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export async function checkRateLimit(
  token: string,
  type: "export" | "recalc"
): Promise<RateLimitResult> {
  const key = KEYS.rateLimit(type, token);
  const now = Date.now();

  // Get existing timestamps, prune older than 24h
  const timestamps: number[] = (await redis.get<number[]>(key)) || [];
  const recent = timestamps.filter((t) => now - t < DAY_MS);

  const maxPerDay = type === "export" ? LIMITS.export.perDay : LIMITS.recalc.perDay;

  // Check daily limit
  if (recent.length >= maxPerDay) {
    const oldest = Math.min(...recent);
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: oldest + DAY_MS - now,
      reason: `Daily limit of ${maxPerDay} ${type}s reached`,
    };
  }

  // Check cooldown (export only: 1 per 2 min)
  if (type === "export" && recent.length > 0) {
    const last = Math.max(...recent);
    const elapsed = now - last;
    if (elapsed < LIMITS.export.cooldownMs) {
      return {
        allowed: false,
        remaining: maxPerDay - recent.length,
        retryAfterMs: LIMITS.export.cooldownMs - elapsed,
        reason: `Export cooldown: wait ${Math.ceil((LIMITS.export.cooldownMs - elapsed) / 1000)}s`,
      };
    }
  }

  // Allow: record timestamp
  recent.push(now);
  await redis.set(key, recent, { ex: 86400 }); // TTL 24h auto-cleanup

  return { allowed: true, remaining: maxPerDay - recent.length };
}
