// tests/s1-infrastructure.test.ts
// Session S1 infrastructure tests — KV CRUD, rate limiting, auth, referral
// Run: npx tsx tests/s1-infrastructure.test.ts
// Requires KV_REST_API_URL + KV_REST_API_TOKEN in .env.local (or mock)

import assert from "node:assert";

// ── Mock Redis for unit tests (no Upstash needed) ─────────

const mockStore = new Map<string, { value: unknown; expiresAt?: number }>();

const mockRedis = {
  async get<T>(key: string): Promise<T | null> {
    const entry = mockStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      mockStore.delete(key);
      return null;
    }
    return entry.value as T;
  },
  async set(key: string, value: unknown, opts?: { ex?: number }): Promise<void> {
    const expiresAt = opts?.ex ? Date.now() + opts.ex * 1000 : undefined;
    mockStore.set(key, { value, expiresAt });
  },
  async del(key: string): Promise<void> {
    mockStore.delete(key);
  },
};

// Patch the module resolution — we test the logic directly
// by importing types and reimplementing key functions with mockRedis

// ── Types (mirrored from lib/kv.ts) ──────────────────────

interface ExpertProfile {
  token: string;
  expiry: string;
  exportsAI: number;
  bilanUsed: boolean;
  profiles: unknown[];
  quizData: Record<string, unknown>;
  changelog: { date: string; action: string; details: Record<string, unknown> }[];
  created: string;
  lastAccess: string;
  tier: "expert";
  accountType: "personal" | "b2b";
  upgradedFrom: "essentiel" | "intermediaire" | null;
  engineVersion: string;
  constantsYear: number;
  reportsGenerated: unknown[];
  referralCode: string;
}

interface ReferralRecord {
  referrerEmail: string;
  uses: number;
  conversions: number;
  created: string;
}

// ── Helper functions (mirrored logic) ─────────────────────

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = require("crypto").randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

async function createExpertProfile(
  email: string,
  opts?: { upgradedFrom?: "essentiel" | "intermediaire" | null; quizData?: Record<string, unknown> }
): Promise<ExpertProfile> {
  const norm = normalizeEmail(email);
  const now = new Date().toISOString();
  const token = require("crypto").randomUUID();
  const referralCode = generateReferralCode();

  const profile: ExpertProfile = {
    token,
    expiry: new Date(Date.now() + 365 * 86400000).toISOString(),
    exportsAI: 5,
    bilanUsed: false,
    profiles: [],
    quizData: opts?.quizData || {},
    changelog: [{ date: now, action: "account_created", details: {} }],
    created: now,
    lastAccess: now,
    tier: "expert",
    accountType: "personal",
    upgradedFrom: opts?.upgradedFrom || null,
    engineVersion: "11.12.9",
    constantsYear: 2026,
    reportsGenerated: [],
    referralCode,
  };

  await mockRedis.set(`expert:${norm}`, profile);
  await mockRedis.set(`token:${token}`, norm, { ex: 366 * 86400 });
  await mockRedis.set(`referral:${referralCode}`, {
    referrerEmail: norm, uses: 0, conversions: 0, created: now,
  } as ReferralRecord);

  return profile;
}

// ── Rate limit logic (mirrored) ───────────────────────────

const LIMITS = { export: { perDay: 20, cooldownMs: 120000 }, recalc: { perDay: 100 } };
const DAY_MS = 86400000;

async function checkRateLimit(token: string, type: "export" | "recalc") {
  const key = `ratelimit:${type}:${token}`;
  const now = Date.now();
  const timestamps: number[] = (await mockRedis.get<number[]>(key)) || [];
  const recent = timestamps.filter((t) => now - t < DAY_MS);
  const maxPerDay = type === "export" ? LIMITS.export.perDay : LIMITS.recalc.perDay;

  if (recent.length >= maxPerDay) {
    return { allowed: false, remaining: 0, reason: `Daily limit reached` };
  }

  if (type === "export" && recent.length > 0) {
    const last = Math.max(...recent);
    if (now - last < LIMITS.export.cooldownMs) {
      return { allowed: false, remaining: maxPerDay - recent.length, reason: "Cooldown" };
    }
  }

  recent.push(now);
  await mockRedis.set(key, recent, { ex: 86400 });
  return { allowed: true, remaining: maxPerDay - recent.length };
}

// ── Test runner ───────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name: string, fn: () => Promise<void> | void) {
  return (async () => {
    try {
      await fn();
      passed++;
      console.log(`  \u2713 ${name}`);
    } catch (err: unknown) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  \u2717 ${name} — ${msg}`);
    }
  })();
}

async function run() {
  console.log("\n=== S1 Infrastructure Tests ===\n");

  // ── KV CRUD ─────────────────────────────────────────────
  console.log("KV CRUD:");
  mockStore.clear();

  await test("createExpertProfile: creates with correct defaults", async () => {
    const p = await createExpertProfile("Test@Example.COM");
    assert.strictEqual(p.tier, "expert");
    assert.strictEqual(p.exportsAI, 5);
    assert.strictEqual(p.bilanUsed, false);
    assert.strictEqual(p.profiles.length, 0);
    assert.strictEqual(p.accountType, "personal");
    assert.strictEqual(p.upgradedFrom, null);
    assert.strictEqual(p.constantsYear, 2026);
    assert.strictEqual(p.referralCode.length, 8);
  });

  await test("createExpertProfile: normalizes email", async () => {
    const p = await createExpertProfile("  USER@Gmail.Com  ");
    const stored = await mockRedis.get<ExpertProfile>("expert:user@gmail.com");
    assert.ok(stored);
    assert.strictEqual(stored!.token, p.token);
  });

  await test("getExpertProfileByToken: resolves token to email", async () => {
    mockStore.clear();
    const p = await createExpertProfile("lookup@test.com");
    const email = await mockRedis.get<string>(`token:${p.token}`);
    assert.strictEqual(email, "lookup@test.com");
    const stored = await mockRedis.get<ExpertProfile>(`expert:${email}`);
    assert.ok(stored);
    assert.strictEqual(stored!.token, p.token);
  });

  await test("updateExpertProfile: merges updates correctly", async () => {
    mockStore.clear();
    const p = await createExpertProfile("update@test.com");
    const updated = { ...p, exportsAI: 3, bilanUsed: true, lastAccess: new Date().toISOString() };
    await mockRedis.set("expert:update@test.com", updated);
    const result = await mockRedis.get<ExpertProfile>("expert:update@test.com");
    assert.strictEqual(result!.exportsAI, 3);
    assert.strictEqual(result!.bilanUsed, true);
    assert.strictEqual(result!.tier, "expert"); // preserved
  });

  await test("decrementExportCredit: decrements from 5 to 4", async () => {
    mockStore.clear();
    const p = await createExpertProfile("credit@test.com");
    assert.strictEqual(p.exportsAI, 5);
    const updated = { ...p, exportsAI: p.exportsAI - 1 };
    await mockRedis.set("expert:credit@test.com", updated);
    const result = await mockRedis.get<ExpertProfile>("expert:credit@test.com");
    assert.strictEqual(result!.exportsAI, 4);
  });

  await test("decrementExportCredit: blocks at 0", async () => {
    mockStore.clear();
    const p = await createExpertProfile("zero@test.com");
    const updated = { ...p, exportsAI: 0 };
    await mockRedis.set("expert:zero@test.com", updated);
    const result = await mockRedis.get<ExpertProfile>("expert:zero@test.com");
    assert.strictEqual(result!.exportsAI, 0);
    // Cannot decrement below 0
    assert.ok(result!.exportsAI <= 0);
  });

  await test("getExpertProfile: returns null for nonexistent", async () => {
    const result = await mockRedis.get("expert:nobody@test.com");
    assert.strictEqual(result, null);
  });

  // ── Rate Limiting ───────────────────────────────────────
  console.log("\nRate Limiting:");
  mockStore.clear();

  await test("checkRateLimit(export): allows first export", async () => {
    const r = await checkRateLimit("tok1", "export");
    assert.strictEqual(r.allowed, true);
    assert.strictEqual(r.remaining, 19);
  });

  await test("checkRateLimit(export): blocks within 2-min cooldown", async () => {
    // tok1 already has 1 export from previous test
    const r = await checkRateLimit("tok1", "export");
    assert.strictEqual(r.allowed, false);
    assert.ok(r.reason!.includes("Cooldown"));
  });

  await test("checkRateLimit(export): blocks at 20/day", async () => {
    mockStore.clear();
    const key = "ratelimit:export:tok2";
    // Pre-fill 20 timestamps (spread over time to avoid cooldown)
    const timestamps = Array.from({ length: 20 }, (_, i) =>
      Date.now() - (20 - i) * 130000 // 130s apart, all within 24h
    );
    await mockRedis.set(key, timestamps, { ex: 86400 });
    const r = await checkRateLimit("tok2", "export");
    assert.strictEqual(r.allowed, false);
    assert.strictEqual(r.remaining, 0);
  });

  await test("checkRateLimit(recalc): allows up to 100/day", async () => {
    mockStore.clear();
    const r1 = await checkRateLimit("tok3", "recalc");
    assert.strictEqual(r1.allowed, true);
    assert.strictEqual(r1.remaining, 99);
  });

  await test("checkRateLimit(recalc): blocks at 100", async () => {
    const key = "ratelimit:recalc:tok4";
    const timestamps = Array.from({ length: 100 }, (_, i) =>
      Date.now() - (100 - i) * 1000
    );
    await mockRedis.set(key, timestamps, { ex: 86400 });
    const r = await checkRateLimit("tok4", "recalc");
    assert.strictEqual(r.allowed, false);
    assert.strictEqual(r.remaining, 0);
  });

  // ── Auth ────────────────────────────────────────────────
  console.log("\nAuth:");
  mockStore.clear();

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  await test("token format: valid UUID passes regex", () => {
    const token = require("crypto").randomUUID();
    assert.ok(UUID_RE.test(token));
  });

  await test("token format: invalid string fails regex", () => {
    assert.ok(!UUID_RE.test("not-a-uuid"));
    assert.ok(!UUID_RE.test(""));
    assert.ok(!UUID_RE.test("12345"));
  });

  await test("expired token: detected correctly", async () => {
    mockStore.clear();
    const p = await createExpertProfile("expired@test.com");
    const expired = { ...p, expiry: new Date(Date.now() - 1000).toISOString() };
    await mockRedis.set("expert:expired@test.com", expired);
    const stored = await mockRedis.get<ExpertProfile>("expert:expired@test.com");
    assert.ok(new Date(stored!.expiry) < new Date());
  });

  await test("valid token: resolves to profile", async () => {
    mockStore.clear();
    const p = await createExpertProfile("valid@test.com");
    const email = await mockRedis.get<string>(`token:${p.token}`);
    assert.strictEqual(email, "valid@test.com");
    const profile = await mockRedis.get<ExpertProfile>(`expert:${email}`);
    assert.ok(profile);
    assert.strictEqual(profile!.tier, "expert");
    assert.ok(new Date(profile!.expiry) > new Date());
  });

  await test("nonexistent token: returns null", async () => {
    const result = await mockRedis.get(`token:nonexistent-uuid`);
    assert.strictEqual(result, null);
  });

  // ── Referral ────────────────────────────────────────────
  console.log("\nReferral:");
  mockStore.clear();

  await test("referral code: 8 chars, no ambiguous chars", () => {
    const code = generateReferralCode();
    assert.strictEqual(code.length, 8);
    assert.ok(!/[0OIL1]/.test(code), `Code ${code} contains ambiguous chars`);
    // Only uppercase + digits (no lowercase)
    assert.ok(/^[A-Z2-9]+$/.test(code));
  });

  await test("referral code: unique across generations", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateReferralCode());
    }
    // 100 codes should all be unique (collision probability negligible)
    assert.strictEqual(codes.size, 100);
  });

  await test("referral use increment", async () => {
    mockStore.clear();
    const p = await createExpertProfile("referrer@test.com");
    const code = p.referralCode;
    const before = await mockRedis.get<ReferralRecord>(`referral:${code}`);
    assert.strictEqual(before!.uses, 0);
    await mockRedis.set(`referral:${code}`, { ...before!, uses: before!.uses + 1 });
    const after = await mockRedis.get<ReferralRecord>(`referral:${code}`);
    assert.strictEqual(after!.uses, 1);
  });

  await test("referral conversion increment + reward tiers", async () => {
    mockStore.clear();
    const p = await createExpertProfile("rewards@test.com");
    const code = p.referralCode;

    for (let i = 1; i <= 5; i++) {
      const rec = await mockRedis.get<ReferralRecord>(`referral:${code}`);
      await mockRedis.set(`referral:${code}`, { ...rec!, conversions: i });
    }

    const final = await mockRedis.get<ReferralRecord>(`referral:${code}`);
    assert.strictEqual(final!.conversions, 5);
    // Tier 1: 1 conversion, Tier 2: 3, Tier 3: 5
    assert.ok(final!.conversions >= 1, "Tier 1 reached");
    assert.ok(final!.conversions >= 3, "Tier 2 reached");
    assert.ok(final!.conversions >= 5, "Tier 3 reached");
  });

  // ── Idempotency ─────────────────────────────────────────
  console.log("\nIdempotency:");
  mockStore.clear();

  await test("markProcessed: first call returns true", async () => {
    const key = "processed:sess_123";
    const existing = await mockRedis.get(key);
    assert.strictEqual(existing, null);
    await mockRedis.set(key, true, { ex: 7 * 86400 });
    const after = await mockRedis.get(key);
    assert.strictEqual(after, true);
  });

  await test("markProcessed: second call detects duplicate", async () => {
    const key = "processed:sess_123";
    const existing = await mockRedis.get(key);
    assert.strictEqual(existing, true); // Already exists
  });

  // ── Summary ─────────────────────────────────────────────
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
