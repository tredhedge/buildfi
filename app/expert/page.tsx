"use client";
// /app/expert/page.tsx — Laboratoire Portal dashboard
// Shows: credits, reports history, saved profiles, referral, quick actions
// Auth: token from query param, same pattern as /simulateur

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { trackEvent, EVENTS } from "@/lib/tracking";

// ── Expert Kit colors ──────────────────────────────────────────────
const EK = {
  bg: "#faf8f4", card: "#ffffff", sable: "#e8e4db",
  border: "#d4cec4", marine: "#1a2744", gold: "#c49a1a",
  tx: "#1a1208", txDim: "#666", txMuted: "#999",
  green: "#1a7a4c", red: "#b91c1c", cream: "#faf8f4",
};

// ── Types ──────────────────────────────────────────────────────────
interface ExpertProfile {
  email: string;
  token: string;
  expiry: string;
  exportsAI: number;
  bilanUsed: boolean;
  profiles: SavedProfile[];
  changelog: ChangelogEntry[];
  reportsGenerated: GeneratedReport[];
  referralCode: string;
  tier: string;
}
interface SavedProfile {
  id: string;
  name: string;
  data: Record<string, unknown>;
  created: string;
  lastUsed: string;
}
interface ChangelogEntry {
  date: string;
  action: string;
  details: Record<string, any>;
}
interface GeneratedReport {
  id: string;
  date: string;
  type: "expert" | "bilan";
  sections: string[];
  engineVersion: string;
  fiscalYear: number;
  blobUrl: string;
  aiStatus: "full" | "fallback";
}
interface FeedbackSummary {
  rating: number | null;
  nps: boolean | null;
  couponUnlocked: boolean;
  token: string;
}

// ── Helpers ────────────────────────────────────────────────────────
function fDate(iso: string, fr: boolean): string {
  try {
    return new Date(iso).toLocaleDateString(fr ? "fr-CA" : "en-CA", {
      year: "numeric", month: "long", day: "numeric",
    });
  } catch { return iso; }
}
function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

// ── Denied screen (standalone — no auth state needed) ──────────────
function ExpertDeniedScreen({ lang, setLang }: { lang: "fr" | "en"; setLang: (l: "fr" | "en") => void }) {
  const fr = lang === "fr";
  const t = (f: string, e: string) => fr ? f : e;
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  async function handleResend(ev: React.FormEvent) {
    ev.preventDefault();
    if (!email.trim() || status === "sending") return;
    setStatus("sending");
    try {
      await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
    } catch { /* swallow — server always returns 200 */ }
    setStatus("sent");
  }

  return (
    <div style={{ minHeight: "100vh", background: EK.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Newsreader:wght@400;600;700&display=swap');`}</style>
      <div style={{ background: EK.card, border: `1px solid ${EK.border}`, borderRadius: 16, padding: 40, maxWidth: 480, width: "100%", textAlign: "center" }}>
        {/* Logo + lang toggle */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: 18, fontWeight: 700, color: EK.marine }}>
            buildfi.ca <span style={{ fontSize: 11, color: EK.txMuted, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, marginLeft: 6 }}>Laboratoire</span>
          </div>
          <button onClick={() => setLang(fr ? "en" : "fr")} style={{ background: "rgba(26,39,68,.08)", border: "none", borderRadius: 6, color: EK.marine, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {fr ? "EN" : "FR"}
          </button>
        </div>

        {/* Padlock icon */}
        <div style={{ margin: "0 auto 16px", width: 48, height: 48, borderRadius: 12, background: "rgba(196,154,26,.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={EK.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <div style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: 22, fontWeight: 700, color: EK.marine, marginBottom: 10, lineHeight: 1.3 }}>
          {t("Le Laboratoire est réservé aux membres.", "The Lab is for members only.")}
        </div>
        <div style={{ fontSize: 14, color: EK.txDim, lineHeight: 1.7, marginBottom: 28 }}>
          {t(
            "Testez vos décisions de retraite en temps réel. Profils pré-configurés, optimiseur automatique, exports AI.",
            "Test your retirement decisions in real time. Pre-configured profiles, automatic optimizer, AI exports."
          )}
        </div>

        {/* Primary CTA → landing */}
        <a href="/expert/landing" style={{ display: "block", background: EK.marine, color: "#fff", padding: "14px 28px", borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: "none", marginBottom: 20 }}>
          {t("Découvrir le Laboratoire", "Discover the Lab")}
        </a>

        {/* Resend magic link form */}
        <div style={{ borderTop: `1px solid ${EK.border}`, paddingTop: 20, marginTop: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: EK.txDim, marginBottom: 12 }}>
            {t("Déjà membre ? Recevez votre lien d'accès.", "Already a member? Get your access link.")}
          </div>
          {status === "sent" ? (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "14px 20px", fontSize: 14, color: EK.green, fontWeight: 600 }}>
              {t("Vérifiez votre boîte courriel — si un compte existe, le lien a été envoyé.", "Check your inbox — if an account exists, the link was sent.")}
            </div>
          ) : (
            <form onSubmit={handleResend} style={{ display: "flex", gap: 8 }}>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder={t("Votre adresse courriel", "Your email address")}
                required
                style={{ flex: 1, border: `1px solid ${EK.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", color: EK.tx }}
              />
              <button type="submit" disabled={status === "sending"} style={{ background: EK.gold, border: "none", borderRadius: 8, color: "#fff", padding: "10px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" as const }}>
                {status === "sending" ? "..." : t("Envoyer", "Send")}
              </button>
            </form>
          )}
        </div>

        {/* Tertiary → Essentiel */}
        <a href="/quiz-essentiel.html" style={{ display: "block", marginTop: 20, fontSize: 13, color: EK.txDim, textDecoration: "none", fontWeight: 600 }}>
          {t("Commencer par le Diagnostic à 14,50 $ →", "Start with the Diagnostic at $14.50 →")}
        </a>
      </div>
    </div>
  );
}

// ── Portal Content ─────────────────────────────────────────────────
function PortalContent() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token") || "";

  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [authStatus, setAuthStatus] = useState<"loading" | "ok" | "denied">("loading");
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackSummary | null>(null);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const [dataExportStatus, setDataExportStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [deleteScheduledAt, setDeleteScheduledAt] = useState<string | null>(null);
  const tokenRef = useRef(tokenParam);

  const fr = lang === "fr";
  const t = (f: string, e: string) => fr ? f : e;

  // Keep tokenRef current (token is removed from URL after auth but we need it for API calls)
  useEffect(() => { if (tokenParam) tokenRef.current = tokenParam; }, [tokenParam]);

  // ── API helpers ─────────────────────────────────────────
  const apiHeaders = useCallback(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokenRef.current}`,
  }), []);

  const renameProfile = useCallback(async (profileId: string, newName: string) => {
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: apiHeaders(),
        body: JSON.stringify({ profileId, newName }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Rename failed");
      }
      // Update local state on success
      setProfile(prev => {
        if (!prev) return prev;
        const updated = prev.profiles.map(p => p.id === profileId ? { ...p, name: newName } : p);
        return { ...prev, profiles: updated };
      });
      return true;
    } catch (err: any) {
      alert(err.message || t("Erreur lors du renommage", "Rename failed"));
      return false;
    }
  }, [apiHeaders, t]);

  const deleteProfile = useCallback(async (profileId: string) => {
    try {
      const res = await fetch(`/api/profile?profileId=${encodeURIComponent(profileId)}`, {
        method: "DELETE",
        headers: apiHeaders(),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Delete failed");
      }
      // Update local state on success
      setProfile(prev => {
        if (!prev) return prev;
        return { ...prev, profiles: prev.profiles.filter(p => p.id !== profileId) };
      });
      return true;
    } catch (err: any) {
      alert(err.message || t("Erreur lors de la suppression", "Delete failed"));
      return false;
    }
  }, [apiHeaders, t]);

  const regenerateReport = useCallback(async (reportId: string) => {
    setRegeneratingId(reportId);
    trackEvent(EVENTS.LAB_EXPORT_STARTED, { creditsRemaining: profile?.exportsAI ?? 0 });
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ regenerateReportId: reportId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Regeneration failed");
      }
      const d = await res.json();
      // Update the report in local state if the API returns the updated report
      if (d.report) {
        setProfile(prev => {
          if (!prev) return prev;
          const updated = prev.reportsGenerated.map(r => r.id === reportId ? { ...r, ...d.report } : r);
          return { ...prev, reportsGenerated: updated };
        });
      }
      alert(t("Bilan régénéré avec succès. Le lien sera mis à jour sous peu.", "Assessment regenerated successfully. The link will be updated shortly."));
    } catch (err: any) {
      alert(err.message || t("Erreur lors de la régénération", "Regeneration failed"));
    } finally {
      setRegeneratingId(null);
    }
  }, [apiHeaders, t]);

  // ── Download full account data (Loi 25 portability) ──────────────
  const downloadAccountData = useCallback(async () => {
    setDataExportStatus("loading");
    try {
      const res = await fetch("/api/data/export", {
        method: "GET",
        headers: { Authorization: `Bearer ${tokenRef.current}` },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Export failed");
      }
      // Trigger browser download
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `buildfi-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setDataExportStatus("done");
    } catch (err: any) {
      console.error("[portal] Data export failed:", err);
      setDataExportStatus("error");
    }
  }, []);

  // ── Request account deletion (Loi 25 — 30-day scheduled purge) ───
  const requestAccountDeletion = useCallback(async () => {
    setDeleteStatus("loading");
    try {
      const res = await fetch("/api/data/delete", {
        method: "POST",
        headers: apiHeaders(),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Deletion request failed");
      }
      const d = await res.json();
      setDeleteScheduledAt(d.deletionScheduledAt || null);
      setDeleteStatus("done");
      setDeleteConfirmOpen(false);
    } catch (err: any) {
      console.error("[portal] Deletion request failed:", err);
      setDeleteStatus("error");
      setDeleteConfirmOpen(false);
    }
  }, [apiHeaders]);

  // Auth — use ref to prevent re-auth after token is removed from URL
  const initialTokenRef = useRef(tokenParam);
  if (tokenParam && !initialTokenRef.current) initialTokenRef.current = tokenParam;

  useEffect(() => {
    const tkn = initialTokenRef.current;
    if (!tkn) { setAuthStatus("denied"); return; }
    fetch(`/api/auth/verify?token=${tkn}`)
      .then(r => {
        if (!r.ok) throw new Error("Auth failed");
        return r.json();
      })
      .then(d => {
        if (d.authenticated && d.profile) {
          setProfile(d.profile as ExpertProfile);
          if (d.feedback) setFeedback(d.feedback as FeedbackSummary);
          setAuthStatus("ok");
          // Remove token from URL for security
          const url = new URL(window.location.href);
          url.searchParams.delete("token");
          window.history.replaceState({}, "", url.toString());
        } else {
          setAuthStatus("denied");
        }
      })
      .catch(() => setAuthStatus("denied"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Denied ────────────────────────────────────────────────
  if (authStatus === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: EK.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 32, height: 32, border: `3px solid ${EK.border}`, borderTopColor: EK.gold, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <div style={{ fontFamily: "'DM Sans', sans-serif", color: EK.txDim }}>{t("Chargement...", "Loading...")}</div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (authStatus === "denied" || !profile) {
    return <ExpertDeniedScreen lang={lang} setLang={setLang} />;
  }

  // ── Portal ────────────────────────────────────────────────
  const daysLeft = daysUntil(profile.expiry);
  const reports = profile.reportsGenerated || [];
  const profiles = profile.profiles || [];
  const referralUrl = `https://www.buildfi.ca?ref=${profile.referralCode}`;

  return (
    <div style={{ minHeight: "100vh", background: EK.bg }}>
      {/* Font imports */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Newsreader:wght@400;600;700&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* Header */}
      <header style={{ background: EK.marine, padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: 18, fontWeight: 700, color: "#fff" }}>
          buildfi.ca
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginLeft: 10 }}>Laboratoire</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a href={`/simulateur?token=${tokenRef.current}`} style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}>
            {t("Simulateur", "Simulator")}
          </a>
          <button onClick={() => setLang(fr ? "en" : "fr")} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "4px 10px", borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
            {fr ? "EN" : "FR"}
          </button>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "'DM Sans', sans-serif" }}>{profile.email}</span>
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px 60px", fontFamily: "'DM Sans', sans-serif" }}>

        {/* Welcome */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: 28, fontWeight: 700, color: EK.marine, marginBottom: 6 }}>
            {t("Votre Laboratoire", "Your Lab Portal")}
          </h1>
          <p style={{ fontSize: 14, color: EK.txDim }}>
            {t("Gérez vos bilans, vos profils et vos crédits.", "Manage your assessments, profiles, and credits.")}
          </p>
        </div>

        {/* KPI cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14, marginBottom: 32 }}>
          {/* Credits */}
          <div style={{ background: EK.card, border: `1px solid ${EK.border}`, borderRadius: 12, padding: "20px 16px", textAlign: "center", borderTop: `3px solid ${EK.gold}` }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800, color: EK.gold }}>{profile.exportsAI}</div>
            <div style={{ fontSize: 12, color: EK.txDim, marginTop: 4 }}>{t("Exports AI restants", "AI exports remaining")}</div>
          </div>
          {/* Reports */}
          <div style={{ background: EK.card, border: `1px solid ${EK.border}`, borderRadius: 12, padding: "20px 16px", textAlign: "center", borderTop: `3px solid ${EK.marine}` }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800, color: EK.marine }}>{reports.length}</div>
            <div style={{ fontSize: 12, color: EK.txDim, marginTop: 4 }}>{t("Bilans générés", "Assessments generated")}</div>
          </div>
          {/* Profiles */}
          <div style={{ background: EK.card, border: `1px solid ${EK.border}`, borderRadius: 12, padding: "20px 16px", textAlign: "center", borderTop: `3px solid ${EK.green}` }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800, color: EK.green }}>{profiles.length}<span style={{ fontSize: 14, color: EK.txMuted }}>/5</span></div>
            <div style={{ fontSize: 12, color: EK.txDim, marginTop: 4 }}>{t("Profils sauvegardés", "Saved profiles")}</div>
          </div>
          {/* Expiry */}
          <div style={{ background: EK.card, border: `1px solid ${EK.border}`, borderRadius: 12, padding: "20px 16px", textAlign: "center", borderTop: `3px solid ${daysLeft < 30 ? EK.red : EK.green}` }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 800, color: daysLeft < 30 ? EK.red : EK.green }}>{daysLeft}</div>
            <div style={{ fontSize: 12, color: EK.txDim, marginTop: 4 }}>{t("Jours restants", "Days remaining")}</div>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 32 }}>
          <a href={`/simulateur?token=${tokenRef.current}`} style={{
            display: "flex", alignItems: "center", gap: 14, padding: "18px 20px",
            background: EK.marine, borderRadius: 12, textDecoration: "none", color: "#fff",
          }}>
            <span style={{ fontSize: 24 }}>&#9881;</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{t("Ouvrir le Simulateur", "Open Simulator")}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{t("Recalculs illimités", "Unlimited recalculations")}</div>
            </div>
          </a>
          {profile.exportsAI > 0 ? (
            <a href={`/simulateur?token=${tokenRef.current}&action=export`}
              onClick={() => trackEvent(EVENTS.LAB_EXPORT_STARTED, { creditsRemaining: profile.exportsAI })}
              style={{
              display: "flex", alignItems: "center", gap: 14, padding: "18px 20px",
              background: `linear-gradient(135deg, ${EK.gold}, #d4a85a)`, borderRadius: 12, textDecoration: "none", color: EK.tx,
            }}>
              <span style={{ fontSize: 24 }}>&#128196;</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{t("Générer un bilan Laboratoire", "Generate Lab Assessment")}</div>
                <div style={{ fontSize: 12, color: "rgba(0,0,0,0.5)" }}>{profile.exportsAI} {t("credit(s) restant(s)", "credit(s) remaining")}</div>
              </div>
            </a>
          ) : (
            <div style={{
              display: "flex", alignItems: "center", gap: 14, padding: "18px 20px",
              background: EK.sable, borderRadius: 12, color: EK.txDim,
            }}>
              <span style={{ fontSize: 24 }}>&#128196;</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{t("Aucun crédit restant", "No credits remaining")}</div>
                <div style={{ fontSize: 12, color: EK.txMuted }}>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/checkout", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: profile.email, type: "addon" }),
                        });
                        const d = await res.json();
                        if (d.url) window.location.href = d.url;
                      } catch {}
                    }}
                    style={{ background: "none", border: "none", color: EK.gold, textDecoration: "underline", cursor: "pointer", fontSize: 12, padding: 0, fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {t("Acheter un export (14,99 $)", "Purchase export ($14.99)")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reports history */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: 20, fontWeight: 700, color: EK.marine, marginBottom: 16 }}>
            {t("Historique des bilans", "Assessment history")}
          </h2>
          {reports.length === 0 ? (
            <div style={{ background: EK.card, border: `1px solid ${EK.border}`, borderRadius: 12, padding: 24, textAlign: "center", color: EK.txDim, fontSize: 14 }}>
              {t("Aucun bilan généré pour le moment. Utilisez le simulateur pour générer votre premier bilan Laboratoire.",
                "No assessments generated yet. Use the simulator to generate your first Lab assessment.")}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {reports.map((r, i) => (
                <div key={r.id || i} style={{
                  background: EK.card, border: `1px solid ${EK.border}`, borderRadius: 12, padding: "16px 20px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: r.type === "bilan" ? "rgba(26,39,68,0.08)" : "rgba(196,154,26,0.08)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, color: r.type === "bilan" ? EK.marine : EK.gold,
                    }}>
                      {r.type === "bilan" ? "\u2630" : "\u2605"}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: EK.tx }}>
                        {r.type === "bilan" ? t("Bilan Annuel", "Annual Assessment") : t("Bilan Laboratoire", "Lab Assessment")}
                      </div>
                      <div style={{ fontSize: 12, color: EK.txMuted }}>
                        {fDate(r.date, fr)} &middot; {r.sections.length} sections &middot;
                        <span style={{ color: r.aiStatus === "full" ? EK.green : EK.gold }}>
                          {" "}{r.aiStatus === "full" ? "AI" : t("Partiel", "Partial")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {r.aiStatus === "fallback" && (
                      <button
                        onClick={() => regenerateReport(r.id)}
                        disabled={regeneratingId === r.id}
                        title={t("Régénérer la narration AI", "Regenerate AI narration")}
                        style={{
                          background: "none", border: `1px solid ${EK.gold}`, color: EK.gold,
                          padding: "8px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                          cursor: regeneratingId === r.id ? "wait" : "pointer",
                          opacity: regeneratingId === r.id ? 0.6 : 1,
                          fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap",
                        }}
                      >
                        {regeneratingId === r.id
                          ? (t("En cours...", "Working..."))
                          : (t("Régénérer avec AI", "Regenerate with AI"))}
                      </button>
                    )}
                    <a href={r.blobUrl} target="_blank" rel="noopener noreferrer" style={{
                      background: EK.marine, color: "#fff", padding: "8px 16px", borderRadius: 8,
                      fontSize: 12, fontWeight: 700, textDecoration: "none",
                    }}>
                      {t("Voir", "View")}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Saved profiles */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: 20, fontWeight: 700, color: EK.marine, marginBottom: 16 }}>
            {t("Profils sauvegardés", "Saved profiles")}
          </h2>
          {profiles.length === 0 ? (
            <div style={{ background: EK.card, border: `1px solid ${EK.border}`, borderRadius: 12, padding: 24, textAlign: "center", color: EK.txDim, fontSize: 14 }}>
              {t("Aucun profil sauvegardé. Les profils sont créés automatiquement dans le simulateur.",
                "No saved profiles. Profiles are created automatically in the simulator.")}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {profiles.map((p, i) => (
                <div key={p.id || i} style={{
                  background: EK.card, border: `1px solid ${EK.border}`, borderRadius: 12, padding: "16px 18px",
                }}>
                  {/* Profile name — inline edit when renaming */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    {renamingId === p.id ? (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const trimmed = renameValue.trim();
                          if (trimmed && trimmed !== p.name) {
                            await renameProfile(p.id, trimmed);
                          }
                          setRenamingId(null);
                        }}
                        style={{ display: "flex", gap: 4, flex: 1, marginRight: 8 }}
                      >
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => setRenamingId(null)}
                          onKeyDown={(e) => { if (e.key === "Escape") setRenamingId(null); }}
                          maxLength={60}
                          style={{
                            flex: 1, fontSize: 13, fontWeight: 600, color: EK.marine,
                            border: `1px solid ${EK.gold}`, borderRadius: 4, padding: "2px 6px",
                            fontFamily: "'DM Sans', sans-serif", outline: "none",
                          }}
                        />
                        <button
                          type="submit"
                          onMouseDown={(e) => e.preventDefault()}
                          style={{ background: EK.gold, border: "none", borderRadius: 4, padding: "2px 8px", fontSize: 11, color: "#fff", cursor: "pointer", fontWeight: 700 }}
                        >
                          OK
                        </button>
                      </form>
                    ) : (
                      <div style={{ fontSize: 14, fontWeight: 700, color: EK.marine }}>{p.name || `Profil ${i + 1}`}</div>
                    )}
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      {/* Rename */}
                      <button
                        onClick={() => { setRenamingId(p.id); setRenameValue(p.name || `Profil ${i + 1}`); }}
                        title={t("Renommer", "Rename")}
                        style={{ background: "none", border: `1px solid ${EK.border}`, borderRadius: 4, padding: "2px 6px", fontSize: 11, color: EK.txDim, cursor: "pointer" }}
                      >
                        &#9998;
                      </button>
                      {/* Export JSON */}
                      <button
                        onClick={() => {
                          const blob = new Blob([JSON.stringify(p.data, null, 2)], { type: "application/json" });
                          const a = document.createElement("a");
                          a.href = URL.createObjectURL(blob);
                          a.download = `${(p.name || "profil").replace(/\s+/g, "-")}.json`;
                          a.click();
                          URL.revokeObjectURL(a.href);
                        }}
                        title={t("Exporter JSON", "Export JSON")}
                        style={{ background: "none", border: `1px solid ${EK.border}`, borderRadius: 4, padding: "2px 6px", fontSize: 11, color: EK.txDim, cursor: "pointer" }}
                      >
                        &#128190;
                      </button>
                      {/* Delete with confirmation */}
                      {deletingId === p.id ? (
                        <span style={{ display: "flex", gap: 2, alignItems: "center" }}>
                          <span style={{ fontSize: 10, color: EK.red, whiteSpace: "nowrap" }}>{t("Confirmer?", "Confirm?")}</span>
                          <button
                            onClick={async () => { await deleteProfile(p.id); setDeletingId(null); }}
                            style={{ background: EK.red, border: "none", borderRadius: 4, padding: "2px 6px", fontSize: 10, color: "#fff", cursor: "pointer", fontWeight: 700 }}
                          >
                            {t("Oui", "Yes")}
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            style={{ background: "none", border: `1px solid ${EK.border}`, borderRadius: 4, padding: "2px 6px", fontSize: 10, color: EK.txDim, cursor: "pointer" }}
                          >
                            {t("Non", "No")}
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setDeletingId(p.id)}
                          title={t("Supprimer", "Delete")}
                          style={{ background: "none", border: `1px solid ${EK.red}33`, borderRadius: 4, padding: "2px 6px", fontSize: 11, color: EK.red, cursor: "pointer" }}
                        >
                          &#10005;
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: EK.txMuted, marginBottom: 10 }}>{fDate(p.created, fr)}</div>
                  <a href={`/simulateur?token=${tokenRef.current}&profile=${p.id}`} style={{
                    display: "inline-block", fontSize: 12, fontWeight: 600, color: EK.gold, textDecoration: "none",
                  }}>
                    {t("Charger dans le simulateur", "Load in simulator")} &rarr;
                  </a>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Referral */}
        <section style={{ marginBottom: 32 }}>
          <div style={{
            background: `linear-gradient(135deg, ${EK.marine}, #2a3a5c)`, borderRadius: 14, padding: "24px 28px", color: "#fff",
          }}>
            <div style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              {t("Partagez BuildFi", "Share BuildFi")}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, marginBottom: 16 }}>
              {t(
                "Chaque referral qui souscrit au Laboratoire vous offre un 2e bilan à 50%. 3 referrals = 1 an gratuit.",
                "Each Lab referral gives you a second assessment at 50%. 3 referrals = 1 free year."
              )}
            </div>
            <div style={{
              background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 14px",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "rgba(255,255,255,0.9)",
              wordBreak: "break-all",
            }}>
              {referralUrl}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(referralUrl);
                setReferralCopied(true);
                setTimeout(() => setReferralCopied(false), 2000);
              }}
              style={{
                marginTop: 12, background: referralCopied ? EK.green : EK.gold, color: "#fff", border: "none",
                padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif", transition: "background .2s",
              }}
            >
              {referralCopied ? t("Copié !", "Copied!") : t("Copier le lien", "Copy link")}
            </button>
          </div>
        </section>

        {/* Satisfaction */}
        {reports.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: 20, fontWeight: 700, color: EK.marine, marginBottom: 16 }}>
              {t("Satisfaction", "Satisfaction")}
            </h2>
            <div style={{ background: EK.card, border: `1px solid ${EK.border}`, borderRadius: 12, padding: "20px 24px" }}>
              {feedback?.rating ? (
                <div>
                  <div style={{ fontSize: 14, color: EK.tx, marginBottom: 8 }}>
                    {t("Merci pour votre évaluation!", "Thank you for your rating!")}
                  </div>
                  <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <span key={s} style={{ fontSize: 24, color: s <= feedback.rating! ? EK.gold : EK.border }}>&#9733;</span>
                    ))}
                    <span style={{ fontSize: 14, color: EK.txDim, marginLeft: 8, alignSelf: "center" }}>{feedback.rating}/5</span>
                  </div>
                  {feedback.couponUnlocked && (
                    <div style={{ fontSize: 12, color: EK.green, fontWeight: 600 }}>
                      {t("Coupon de renouvellement débloqué", "Renewal coupon unlocked")}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 14, color: EK.txDim, marginBottom: 12 }}>
                    {t("Comment évaluez-vous votre expérience BuildFi?", "How would you rate your BuildFi experience?")}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <button
                        key={s}
                        disabled={ratingSubmitting}
                        onClick={async () => {
                          if (!feedback?.token) return;
                          setRatingSubmitting(true);
                          try {
                            const res = await fetch(`/api/feedback/${feedback.token}`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ rating: s, source: "page" }),
                            });
                            if (res.ok) setFeedback({ ...feedback, rating: s, couponUnlocked: true });
                          } catch {} finally { setRatingSubmitting(false); }
                        }}
                        style={{
                          background: "none", border: `2px solid ${EK.border}`, borderRadius: 8,
                          padding: "8px 12px", fontSize: 22, cursor: ratingSubmitting ? "wait" : "pointer",
                          color: EK.gold, transition: "border-color 0.15s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = EK.gold)}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = EK.border)}
                      >
                        &#9733;
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: EK.txMuted, marginTop: 8 }}>
                    {t("Évaluez pour débloquer un coupon de renouvellement.", "Rate to unlock a renewal coupon.")}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Account details */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: 20, fontWeight: 700, color: EK.marine, marginBottom: 16 }}>
            {t("Détails du compte", "Account details")}
          </h2>
          <div style={{ background: EK.card, border: `1px solid ${EK.border}`, borderRadius: 12, padding: 20 }}>
            {[
              [t("Courriel", "Email"), profile.email],
              [t("Expiration", "Expiry"), fDate(profile.expiry, fr) + ` (${daysLeft} ${t("jours", "days")})`],
              [t("Crédits AI", "AI credits"), String(profile.exportsAI)],
              [t("Bilan Annuel", "Annual Assessment"), profile.bilanUsed ? t("Utilisé", "Used") : t("Disponible", "Available")],
              [t("Code référal", "Referral code"), profile.referralCode],
            ].map(([k, v], i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", padding: "10px 0",
                borderBottom: `1px solid ${EK.sable}`, fontSize: 13,
              }}>
                <span style={{ color: EK.txDim }}>{k}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{v}</span>
              </div>
            ))}

            {/* ── Data rights (Loi 25 / LPRPDE) ── */}
            <div style={{ paddingTop: 20, marginTop: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: EK.txDim, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {t("Vos droits sur vos données", "Your data rights")}
              </div>

              {/* Download data */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: EK.tx }}>{t("Télécharger mes données", "Download my data")}</div>
                  <div style={{ fontSize: 12, color: EK.txMuted }}>{t("Exportez toutes vos données en format JSON.", "Export all your data as JSON.")}</div>
                </div>
                {dataExportStatus === "done" ? (
                  <span style={{ fontSize: 12, color: EK.green, fontWeight: 600 }}>&#10003; {t("Téléchargement lancé", "Download started")}</span>
                ) : dataExportStatus === "error" ? (
                  <span style={{ fontSize: 12, color: EK.red, fontWeight: 600 }}>{t("Erreur — réessayez", "Error — retry")}</span>
                ) : (
                  <button
                    onClick={downloadAccountData}
                    disabled={dataExportStatus === "loading"}
                    style={{
                      background: EK.marine, border: "none", borderRadius: 6, color: "#fff",
                      padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: dataExportStatus === "loading" ? "wait" : "pointer",
                      fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" as const,
                    }}
                  >
                    {dataExportStatus === "loading" ? "..." : t("Télécharger", "Download")}
                  </button>
                )}
              </div>

              {/* Delete account */}
              {deleteStatus === "done" && deleteScheduledAt ? (
                <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#9a3412" }}>
                  {t(
                    `Suppression confirmée. Votre compte sera supprimé le ${fDate(deleteScheduledAt, true)}.`,
                    `Deletion confirmed. Your account will be deleted on ${fDate(deleteScheduledAt, false)}.`
                  )}
                </div>
              ) : deleteStatus === "error" ? (
                <div style={{ fontSize: 13, color: EK.red }}>{t("Erreur lors de la demande — réessayez ou écrivez à support@buildfi.ca.", "Request failed — retry or email support@buildfi.ca.")}</div>
              ) : deleteConfirmOpen ? (
                <div style={{ background: "#fef2f2", border: `1px solid ${EK.red}44`, borderRadius: 8, padding: "16px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: EK.red, marginBottom: 8 }}>
                    {t("Confirmer la suppression du compte", "Confirm account deletion")}
                  </div>
                  <div style={{ fontSize: 13, color: EK.tx, marginBottom: 14, lineHeight: 1.6 }}>
                    {t(
                      "Votre compte, vos profils et vos bilans seront supprimés dans 30 jours. Cette action est irréversible.",
                      "Your account, profiles, and assessments will be deleted in 30 days. This action cannot be undone."
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={requestAccountDeletion}
                      disabled={deleteStatus === "loading"}
                      style={{
                        background: EK.red, border: "none", borderRadius: 6, color: "#fff",
                        padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: deleteStatus === "loading" ? "wait" : "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {deleteStatus === "loading" ? "..." : t("Confirmer la suppression", "Confirm deletion")}
                    </button>
                    <button
                      onClick={() => setDeleteConfirmOpen(false)}
                      style={{
                        background: "none", border: `1px solid ${EK.border}`, borderRadius: 6, color: EK.txDim,
                        padding: "8px 18px", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {t("Annuler", "Cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: EK.tx }}>{t("Supprimer mon compte", "Delete my account")}</div>
                    <div style={{ fontSize: 12, color: EK.txMuted }}>{t("Suppression définitive dans 30 jours.", "Permanent deletion in 30 days.")}</div>
                  </div>
                  <button
                    onClick={() => setDeleteConfirmOpen(true)}
                    style={{
                      background: "none", border: `1px solid ${EK.red}66`, borderRadius: 6, color: EK.red,
                      padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap" as const,
                    }}
                  >
                    {t("Supprimer", "Delete account")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: "center", padding: "20px 24px", fontSize: 11, color: EK.txMuted,
        borderTop: `1px solid ${EK.sable}`,
      }}>
        buildfi.ca &middot; {t("À titre informatif seulement", "For informational purposes only")}
      </footer>
    </div>
  );
}

// ── Page wrapper with Suspense ─────────────────────────────────────
export default function ExpertPortalPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: EK.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${EK.border}`, borderTopColor: EK.gold, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <PortalContent />
    </Suspense>
  );
}
