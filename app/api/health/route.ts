// /app/api/health/route.ts
// Health check endpoint — tests KV, MC engine, Anthropic API, Resend, Blob
// Used for monitoring and deployment verification

import { NextResponse } from "next/server";

interface CheckResult {
  status: "ok" | "error" | "skip";
  ms?: number;
  error?: string;
}

export async function GET() {
  const checks: Record<string, CheckResult> = {};
  const start = Date.now();

  // ── KV (Upstash Redis) ──────────────────────────────────────
  try {
    const t0 = Date.now();
    const { Redis } = await import("@upstash/redis");
    const kv = new Redis({
      url: process.env.KV_REST_API_URL || "",
      token: process.env.KV_REST_API_TOKEN || "",
    });
    await kv.ping();
    checks.kv = { status: "ok", ms: Date.now() - t0 };
  } catch (err) {
    checks.kv = {
      status: process.env.KV_REST_API_URL ? "error" : "skip",
      error: err instanceof Error ? err.message : "KV unavailable",
    };
  }

  // ── MC Engine (10 sims) ─────────────────────────────────────
  try {
    const t0 = Date.now();
    const { runMC } = await import("@/lib/engine");
    const mc = runMC(
      {
        age: 40, retAge: 65, sex: "M", prov: "QC",
        income: 75000, rrsp: 50000, tfsa: 25000, nr: 5000,
        monthlyContrib: 500, retSpM: 4000, risk: "balanced",
      },
      10
    ) as Record<string, any> | null;
    if (mc && typeof mc.succ === "number") {
      checks.mc = { status: "ok", ms: Date.now() - t0 };
    } else {
      checks.mc = { status: "error", error: "MC returned null" };
    }
  } catch (err) {
    checks.mc = {
      status: "error",
      error: err instanceof Error ? err.message : "MC failed",
    };
  }

  // ── Anthropic API (key presence check only — no credits burned) ──
  if (typeof process.env.ANTHROPIC_API_KEY === "string" && process.env.ANTHROPIC_API_KEY.startsWith("sk-")) {
    checks.anthropic = { status: "ok" };
  } else {
    checks.anthropic = { status: "skip", error: "ANTHROPIC_API_KEY not set or invalid" };
  }

  // ── Resend ──────────────────────────────────────────────────
  if (process.env.RESEND_API_KEY) {
    try {
      const t0 = Date.now();
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const domains = await resend.domains.list();
      checks.resend = {
        status: domains?.data ? "ok" : "error",
        ms: Date.now() - t0,
      };
    } catch (err) {
      checks.resend = {
        status: "error",
        error: err instanceof Error ? err.message : "Resend failed",
      };
    }
  } else {
    checks.resend = { status: "skip", error: "RESEND_API_KEY not set" };
  }

  // ── Blob ────────────────────────────────────────────────────
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const t0 = Date.now();
      const { list } = await import("@vercel/blob");
      await list({ limit: 1 });
      checks.blob = { status: "ok", ms: Date.now() - t0 };
    } catch (err) {
      checks.blob = {
        status: "error",
        error: err instanceof Error ? err.message : "Blob failed",
      };
    }
  } else {
    checks.blob = { status: "skip", error: "BLOB_READ_WRITE_TOKEN not set" };
  }

  // ── Summary ─────────────────────────────────────────────────
  const allOk = Object.values(checks).every(
    (c) => c.status === "ok" || c.status === "skip"
  );

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      checks,
      totalMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 }
  );
}
