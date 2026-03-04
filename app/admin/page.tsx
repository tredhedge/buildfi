"use client";

// /app/admin/page.tsx
// Admin dashboard — system health, profile stats, email delivery, recent activity
// Auth: ?secret={CRON_SECRET} query param — same secret used as Bearer token for API calls

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// ── Types ─────────────────────────────────────────────────

interface ServiceStatus {
  status: "ok" | "error" | "missing_key";
  latencyMs?: number;
  sims?: number;
  error?: string;
}

interface HealthData {
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

interface Alert {
  type: string;
  rate: number;
  threshold: number;
  message: string;
}

interface ProfileStats {
  total: number;
  active: number;
  expired: number;
  totalExportsUsed: number;
  totalReportsGenerated: number;
  averageSuccessRate: number | null;
  byUpgradeSource: {
    essentiel: number;
    intermediaire: number;
    direct: number;
  };
}

interface EmailData {
  delivered: number;
  bounced: number;
  complained: number;
  lastUpdated: string;
  bounceRate: string;
  complaintRate: string;
  alerts: Alert[];
}

interface RecentEntry {
  date: string;
  email: string;
  action: string;
}

interface StatsData {
  profiles: ProfileStats;
  email: EmailData;
  recentActivity: RecentEntry[];
  timestamp: string;
}

// ── Styles ────────────────────────────────────────────────

const palette = {
  bg: "#FAF7F2",
  card: "#FFFFFF",
  cardBorder: "#E8E0D4",
  gold: "#C8A951",
  goldDark: "#A68B3A",
  goldLight: "#F5EDD6",
  text: "#2D2A26",
  textMuted: "#6B665E",
  green: "#2E7D32",
  greenBg: "#E8F5E9",
  yellow: "#F57F17",
  yellowBg: "#FFF8E1",
  red: "#C62828",
  redBg: "#FFEBEE",
  border: "#E0DCD5",
};

// ── Helper Components ─────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  let color = palette.textMuted;
  if (status === "ok" || status === "healthy") color = palette.green;
  else if (status === "missing_key" || status === "degraded") color = palette.yellow;
  else if (status === "error" || status === "unhealthy") color = palette.red;

  return (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        backgroundColor: color,
        marginRight: 8,
        flexShrink: 0,
      }}
    />
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        backgroundColor: palette.card,
        border: `1px solid ${palette.cardBorder}`,
        borderRadius: 12,
        padding: 24,
        marginBottom: 20,
      }}
    >
      <h2
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: palette.goldDark,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginTop: 0,
          marginBottom: 16,
          paddingBottom: 12,
          borderBottom: `2px solid ${palette.goldLight}`,
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function StatBox({
  label,
  value,
  sub,
  alert,
}: {
  label: string;
  value: string | number;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div
      style={{
        backgroundColor: alert ? palette.redBg : palette.goldLight,
        borderRadius: 8,
        padding: "14px 18px",
        minWidth: 140,
        flex: "1 1 140px",
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: palette.textMuted,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: alert ? palette.red : palette.text,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 12,
            color: palette.textMuted,
            marginTop: 4,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function Badge({
  text,
  type,
}: {
  text: string;
  type: "ok" | "warn" | "error";
}) {
  const colors = {
    ok: { bg: palette.greenBg, fg: palette.green },
    warn: { bg: palette.yellowBg, fg: palette.yellow },
    error: { bg: palette.redBg, fg: palette.red },
  };
  const c = colors[type];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        backgroundColor: c.bg,
        color: c.fg,
      }}
    >
      {text}
    </span>
  );
}

function ServiceRow({
  name,
  service,
}: {
  name: string;
  service: ServiceStatus;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: `1px solid ${palette.border}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <StatusDot status={service.status} />
        <span style={{ fontWeight: 500, color: palette.text }}>{name}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {service.latencyMs != null && (
          <span style={{ fontSize: 13, color: palette.textMuted }}>
            {service.latencyMs}ms
          </span>
        )}
        {service.sims != null && (
          <span style={{ fontSize: 13, color: palette.textMuted }}>
            {service.sims} sims
          </span>
        )}
        <Badge
          text={
            service.status === "ok"
              ? "OK"
              : service.status === "missing_key"
              ? "Missing Key"
              : "Error"
          }
          type={
            service.status === "ok"
              ? "ok"
              : service.status === "missing_key"
              ? "warn"
              : "error"
          }
        />
      </div>
    </div>
  );
}

/** Map action names to colored badges */
function ActionBadge({ action }: { action: string }) {
  const actionMap: Record<
    string,
    { label: string; type: "ok" | "warn" | "error" }
  > = {
    account_created: { label: "Account Created", type: "ok" },
    renewal: { label: "Renewal", type: "ok" },
    export_ai: { label: "AI Export", type: "ok" },
    bilan_generated: { label: "Bilan Generated", type: "ok" },
    report_generated: { label: "Report Generated", type: "ok" },
    profile_saved: { label: "Profile Saved", type: "ok" },
    profile_deleted: { label: "Profile Deleted", type: "warn" },
    token_rotated: { label: "Token Rotated", type: "warn" },
    abuse_flagged: { label: "Abuse Flagged", type: "error" },
    renewal_email_j30: { label: "Renewal Email J-30", type: "warn" },
    renewal_email_j7: { label: "Renewal Email J-7", type: "warn" },
    renewal_email_j0: { label: "Renewal Email J-0", type: "error" },
    anniversary_6m_sent: { label: "6-Month Reminder", type: "ok" },
    referral_reward_3: { label: "Referral Reward", type: "ok" },
    magic_link_sent: { label: "Magic Link Sent", type: "ok" },
    export_addon_purchased: { label: "Addon Purchased", type: "ok" },
  };

  const mapped = actionMap[action];
  if (mapped) {
    return <Badge text={mapped.label} type={mapped.type} />;
  }

  return (
    <span
      style={{
        fontSize: 13,
        color: palette.textMuted,
        fontFamily: "monospace",
      }}
    >
      {action}
    </span>
  );
}

// ── Screens ───────────────────────────────────────────────

function UnauthorizedScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: palette.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: palette.card,
          border: `1px solid ${palette.cardBorder}`,
          borderRadius: 12,
          padding: "48px 40px",
          textAlign: "center",
          maxWidth: 400,
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: palette.red,
            marginBottom: 12,
          }}
        >
          401
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: palette.text,
            marginBottom: 8,
          }}
        >
          Unauthorized
        </div>
        <div style={{ fontSize: 14, color: palette.textMuted }}>
          Valid admin secret required via ?secret= parameter.
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: palette.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: `3px solid ${palette.border}`,
            borderTopColor: palette.gold,
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }}
        />
        <div style={{ color: palette.textMuted, fontSize: 14 }}>
          Loading dashboard...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

// ── Dashboard Inner (uses useSearchParams) ────────────────

function DashboardInner() {
  const searchParams = useSearchParams();
  const secret = searchParams.get("secret");

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // ── Data fetching ───────────────────────────────────────
  const fetchHealth = useCallback(async () => {
    if (!secret) return;
    try {
      setHealthError(null);
      const res = await fetch("/api/health", {
        headers: { Authorization: `Bearer ${secret}` },
      });
      if (res.status === 401) {
        setAuthorized(false);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHealth(data);
      setAuthorized(true);
    } catch (err) {
      setHealthError(
        err instanceof Error ? err.message : "Failed to fetch health"
      );
    }
  }, [secret]);

  const fetchStats = useCallback(async () => {
    if (!secret) return;
    try {
      setStatsError(null);
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${secret}` },
      });
      if (res.status === 401) return; // health fetch handles auth
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setStatsError(
        err instanceof Error ? err.message : "Failed to fetch stats"
      );
    }
  }, [secret]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchHealth(), fetchStats()]);
    setLastRefresh(new Date());
  }, [fetchHealth, fetchStats]);

  // Initial auth check: no secret means unauthorized
  useEffect(() => {
    if (!secret) {
      setAuthorized(false);
      return;
    }
    // Auth is validated by the API response (401 = bad secret)
    refreshAll();
  }, [secret, refreshAll]);

  // Auto-refresh every 60s once authorized
  useEffect(() => {
    if (authorized !== true) return;
    const interval = setInterval(refreshAll, 60000);
    return () => clearInterval(interval);
  }, [authorized, refreshAll]);

  // ── Render guards ───────────────────────────────────────
  if (authorized === null) return <LoadingScreen />;
  if (authorized === false) return <UnauthorizedScreen />;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: palette.bg,
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: palette.text,
      }}
    >
      {/* Header */}
      <header
        style={{
          backgroundColor: palette.card,
          borderBottom: `2px solid ${palette.gold}`,
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: palette.text,
              margin: 0,
            }}
          >
            BuildFi Admin
          </h1>
          <div
            style={{ fontSize: 13, color: palette.textMuted, marginTop: 2 }}
          >
            Internal monitoring dashboard
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {health && (
            <Badge
              text={health.status.toUpperCase()}
              type={
                health.status === "healthy"
                  ? "ok"
                  : health.status === "degraded"
                  ? "warn"
                  : "error"
              }
            />
          )}
          <button
            onClick={refreshAll}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: `1px solid ${palette.gold}`,
              backgroundColor: palette.goldLight,
              color: palette.goldDark,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Refresh
          </button>
          {lastRefresh && (
            <span style={{ fontSize: 12, color: palette.textMuted }}>
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
      </header>

      {/* Content */}
      <main
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "24px 20px",
        }}
      >
        {/* Section A: System Health */}
        <Card title="System Health">
          {healthError ? (
            <div style={{ color: palette.red, fontSize: 14 }}>
              Error fetching health: {healthError}
            </div>
          ) : !health ? (
            <div style={{ color: palette.textMuted, fontSize: 14 }}>
              Loading health data...
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 13, color: palette.textMuted }}>
                  Uptime: {health.uptime}
                </div>
                <div style={{ fontSize: 12, color: palette.textMuted }}>
                  {new Date(health.timestamp).toLocaleString()}
                </div>
              </div>
              <ServiceRow
                name="KV (Upstash Redis)"
                service={health.services.kv}
              />
              <ServiceRow name="MC Engine" service={health.services.mc} />
              <ServiceRow
                name="Anthropic API"
                service={health.services.anthropic}
              />
              <ServiceRow name="Resend" service={health.services.resend} />
              <ServiceRow
                name="Vercel Blob"
                service={health.services.blob}
              />
            </>
          )}
        </Card>

        {/* Section B: Expert Profiles Overview */}
        <Card title="Expert Profiles Overview">
          {statsError ? (
            <div style={{ color: palette.red, fontSize: 14 }}>
              Error fetching stats: {statsError}
            </div>
          ) : !stats ? (
            <div style={{ color: palette.textMuted, fontSize: 14 }}>
              Loading profile data...
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <StatBox
                  label="Total Profiles"
                  value={stats.profiles.total}
                />
                <StatBox
                  label="Active"
                  value={stats.profiles.active}
                  sub={
                    stats.profiles.total > 0
                      ? `${Math.round(
                          (stats.profiles.active / stats.profiles.total) * 100
                        )}%`
                      : undefined
                  }
                />
                <StatBox
                  label="Expired"
                  value={stats.profiles.expired}
                  alert={stats.profiles.expired > stats.profiles.active}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <StatBox
                  label="Exports Used"
                  value={stats.profiles.totalExportsUsed}
                />
                <StatBox
                  label="Reports Generated"
                  value={stats.profiles.totalReportsGenerated}
                />
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: palette.textMuted,
                  marginTop: 8,
                }}
              >
                <span style={{ fontWeight: 600, color: palette.text }}>
                  Source breakdown:
                </span>{" "}
                Essentiel {stats.profiles.byUpgradeSource.essentiel} |
                Intermediaire {stats.profiles.byUpgradeSource.intermediaire} |
                Direct {stats.profiles.byUpgradeSource.direct}
              </div>
            </>
          )}
        </Card>

        {/* Section C: Email Delivery */}
        <Card title="Email Delivery">
          {!stats ? (
            <div style={{ color: palette.textMuted, fontSize: 14 }}>
              Loading email data...
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <StatBox label="Delivered" value={stats.email.delivered} />
                <StatBox
                  label="Bounced"
                  value={stats.email.bounced}
                  alert={stats.email.bounced > 0}
                />
                <StatBox
                  label="Complained"
                  value={stats.email.complained}
                  alert={stats.email.complained > 0}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <StatBox
                  label="Bounce Rate"
                  value={stats.email.bounceRate}
                  alert={parseFloat(stats.email.bounceRate) > 2}
                />
                <StatBox
                  label="Complaint Rate"
                  value={stats.email.complaintRate}
                  alert={parseFloat(stats.email.complaintRate) > 0.1}
                />
              </div>
              {stats.email.alerts.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {stats.email.alerts.map((alert, i) => (
                    <div
                      key={i}
                      style={{
                        backgroundColor: palette.redBg,
                        border: `1px solid ${palette.red}`,
                        borderRadius: 8,
                        padding: "10px 14px",
                        fontSize: 13,
                        color: palette.red,
                        marginBottom: 8,
                      }}
                    >
                      {alert.message}
                    </div>
                  ))}
                </div>
              )}
              {stats.email.lastUpdated && (
                <div
                  style={{
                    fontSize: 12,
                    color: palette.textMuted,
                    marginTop: 8,
                  }}
                >
                  Last updated:{" "}
                  {new Date(stats.email.lastUpdated).toLocaleString()}
                </div>
              )}
            </>
          )}
        </Card>

        {/* Section D: Recent Activity */}
        <Card title="Recent Activity">
          {!stats ? (
            <div style={{ color: palette.textMuted, fontSize: 14 }}>
              Loading activity data...
            </div>
          ) : stats.recentActivity.length === 0 ? (
            <div style={{ color: palette.textMuted, fontSize: 14 }}>
              No recent activity found.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 14,
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: `2px solid ${palette.border}`,
                      textAlign: "left",
                    }}
                  >
                    <th
                      style={{
                        padding: "8px 12px",
                        color: palette.textMuted,
                        fontWeight: 600,
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Date
                    </th>
                    <th
                      style={{
                        padding: "8px 12px",
                        color: palette.textMuted,
                        fontWeight: 600,
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Email
                    </th>
                    <th
                      style={{
                        padding: "8px 12px",
                        color: palette.textMuted,
                        fontWeight: 600,
                        fontSize: 12,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentActivity.map((entry, i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom: `1px solid ${palette.border}`,
                      }}
                    >
                      <td
                        style={{
                          padding: "10px 12px",
                          color: palette.textMuted,
                          whiteSpace: "nowrap",
                          fontSize: 13,
                        }}
                      >
                        {new Date(entry.date).toLocaleDateString("fr-CA", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          fontFamily: "monospace",
                          fontSize: 13,
                        }}
                      >
                        {entry.email}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <ActionBadge action={entry.action} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            fontSize: 12,
            color: palette.textMuted,
            padding: "20px 0 40px",
          }}
        >
          BuildFi Admin Dashboard | Auto-refresh every 60s
        </div>
      </main>
    </div>
  );
}

// ── Page Export (Suspense boundary for useSearchParams) ────

export default function AdminDashboard() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <DashboardInner />
    </Suspense>
  );
}
