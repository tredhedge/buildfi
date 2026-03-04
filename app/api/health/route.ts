// /app/api/health/route.ts
// Health check endpoint — tests KV, MC engine, Anthropic, Resend, Blob
// Protected by CRON_SECRET Bearer token
// Used by admin dashboard and external monitoring

import { NextRequest, NextResponse } from "next/server";

const processStartTime = Date.now();

interface ServiceStatus {
  status: "ok" | "error" | "missing_key";
  latencyMs?: number;
  sims?: number;
  error?: string;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  services: {
    kv: ServiceStatus;
    mc: ServiceStatus;
    anthropic: ServiceStatus;
    resend: ServiceStatus;
    blob: ServiceStatus;
  };
  uptime: string;
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export async function GET(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const services: HealthResponse["services"] = {
    kv: { status: "error" },
    mc: { status: "error" },
    anthropic: { status: "missing_key" },
    resend: { status: "missing_key" },
    blob: { status: "missing_key" },
  };

  // ── KV (Upstash Redis) ────────────────────────────────────
  try {
    const { redis } = await import("@/lib/kv");
    const t0 = Date.now();
    await redis.ping();
    services.kv = { status: "ok", latencyMs: Date.now() - t0 };
  } catch (err) {
    services.kv = {
      status: "error",
      error: err instanceof Error ? err.message : "KV unavailable",
    };
  }

  // ── MC Engine (10 sims, minimal params) ───────────────────
  try {
    const { runMC } = await import("@/lib/engine");
    const t0 = Date.now();
    const mc = runMC(
      {
        age: 40,
        sal: 70000,
        retAge: 65,
        prov: "QC",
        sex: "M",
        deathAge: 95,
        rrsp: 50000,
        tfsa: 20000,
        nr: 5000,
        retSpM: 3500,
        inf: 0.021,
        eqRet: 0.07,
        eqVol: 0.16,
        bndRet: 0.035,
        bndVol: 0.06,
        allocR: 0.6,
        allocT: 0.8,
        allocN: 0.5,
      },
      10
    ) as Record<string, unknown> | null;
    const duration = Date.now() - t0;

    if (mc && typeof mc.succ === "number") {
      services.mc = { status: "ok", latencyMs: duration, sims: 10 };
    } else {
      services.mc = { status: "error", error: "MC returned null or invalid result" };
    }
  } catch (err) {
    services.mc = {
      status: "error",
      error: err instanceof Error ? err.message : "MC engine failed",
    };
  }

  // ── Anthropic API (key presence check only) ───────────────
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (typeof anthropicKey === "string" && anthropicKey.length > 0) {
    services.anthropic = { status: "ok" };
  } else {
    services.anthropic = { status: "missing_key" };
  }

  // ── Resend (key presence check only) ──────────────────────
  const resendKey = process.env.RESEND_API_KEY;
  if (typeof resendKey === "string" && resendKey.length > 0) {
    services.resend = { status: "ok" };
  } else {
    services.resend = { status: "missing_key" };
  }

  // ── Blob (key presence check only) ────────────────────────
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (typeof blobToken === "string" && blobToken.length > 0) {
    services.blob = { status: "ok" };
  } else {
    services.blob = { status: "missing_key" };
  }

  // ── Determine overall status ──────────────────────────────
  // Core services: KV and MC must be OK
  const coreOk = services.kv.status === "ok" && services.mc.status === "ok";
  // Optional services: anthropic, resend, blob
  const optionalStatuses = [
    services.anthropic.status,
    services.resend.status,
    services.blob.status,
  ];
  const anyOptionalMissing = optionalStatuses.some((s) => s === "missing_key");
  const anyOptionalError = optionalStatuses.some((s) => s === "error");

  let overallStatus: HealthResponse["status"];
  if (!coreOk) {
    overallStatus = "unhealthy";
  } else if (anyOptionalMissing || anyOptionalError) {
    overallStatus = "degraded";
  } else {
    overallStatus = "healthy";
  }

  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services,
    uptime: formatUptime(Date.now() - processStartTime),
  };

  return NextResponse.json(response, {
    status: overallStatus === "unhealthy" ? 503 : 200,
  });
}
