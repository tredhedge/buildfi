// /app/mises-a-jour/page.tsx
// Regulatory monitoring stub — fiscal constant update timeline
// Bilingual FR/EN, Expert Kit palette

"use client";

import { useState } from "react";

const MARINE = "#1a2744";
const GOLD = "#b8860b";
const BG = "#faf8f4";
const CARD_BG = "#ffffff";
const BORDER = "#d4cec4";
const GRAY = "#666666";

interface TimelineEntry {
  date: { fr: string; en: string };
  title: { fr: string; en: string };
  detail: { fr: string; en: string };
}

const TIMELINE: TimelineEntry[] = [
  {
    date: { fr: "Mars 2026", en: "March 2026" },
    title: {
      fr: "Constantes fiscales 2026 intégrées",
      en: "2026 fiscal constants integrated",
    },
    detail: {
      fr: "Plafonds REER, CELI, RRQ/RPC, PSV, tranches d'imposition fédérales et provinciales mis à jour pour l'année fiscale 2026.",
      en: "RRSP, TFSA, QPP/CPP, OAS limits and federal/provincial tax brackets updated for fiscal year 2026.",
    },
  },
  {
    date: { fr: "Janvier 2026", en: "January 2026" },
    title: {
      fr: "Lancement du moteur Monte Carlo v1",
      en: "Monte Carlo engine v1 launch",
    },
    detail: {
      fr: "5 000 simulations, distribution t-Student (df=5), calibration historique 1970-2024.",
      en: "5,000 simulations, t-Student distribution (df=5), historical calibration 1970-2024.",
    },
  },
];

export default function MisesAJourPage() {
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const fr = lang === "fr";

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{
        background: MARINE,
        padding: "18px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <a href="/" style={{ textDecoration: "none" }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 800,
            fontSize: 18,
            color: "#ffffff",
            letterSpacing: "-0.5px",
          }}>
            buildfi<span style={{ color: GOLD }}>.ca</span>
          </span>
        </a>
        <button
          onClick={() => setLang(fr ? "en" : "fr")}
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 6,
            color: "#ffffff",
            fontSize: 12,
            fontWeight: 600,
            padding: "5px 12px",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {fr ? "EN" : "FR"}
        </button>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px 80px" }}>
        <h1 style={{
          fontFamily: "Newsreader, Georgia, serif",
          fontSize: 28,
          fontWeight: 700,
          color: MARINE,
          marginBottom: 8,
        }}>
          {fr ? "Mises à jour réglementaires" : "Regulatory Updates"}
        </h1>
        <p style={{ fontSize: 14, color: GRAY, marginBottom: 36, lineHeight: 1.7 }}>
          {fr
            ? "Suivi des constantes fiscales et paramètres réglementaires utilisés par le moteur de simulation."
            : "Tracking fiscal constants and regulatory parameters used by the simulation engine."}
        </p>

        {/* Current status card */}
        <div style={{
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          padding: "22px 24px",
          marginBottom: 40,
          borderLeft: `4px solid ${GOLD}`,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: GOLD, textTransform: "uppercase" as const, letterSpacing: "0.5px", marginBottom: 8 }}>
            {fr ? "Statut actuel" : "Current status"}
          </div>
          <p style={{ fontSize: 14, color: MARINE, lineHeight: 1.75, margin: 0 }}>
            {fr
              ? "Les constantes fiscales 2026 sont à jour. Dernière vérification\u00a0: mars 2026."
              : "2026 fiscal constants are current. Last verified: March 2026."}
          </p>
        </div>

        {/* Timeline */}
        <h2 style={{
          fontSize: 16,
          fontWeight: 700,
          color: MARINE,
          marginBottom: 24,
          paddingBottom: 10,
          borderBottom: `2px solid ${GOLD}`,
        }}>
          {fr ? "Historique" : "Timeline"}
        </h2>

        <div style={{ position: "relative" as const, paddingLeft: 28 }}>
          {/* Vertical line */}
          <div style={{
            position: "absolute" as const,
            left: 7,
            top: 6,
            bottom: 6,
            width: 2,
            background: BORDER,
          }} />

          {TIMELINE.map((entry, i) => (
            <div key={i} style={{ position: "relative" as const, marginBottom: i < TIMELINE.length - 1 ? 32 : 0 }}>
              {/* Dot */}
              <div style={{
                position: "absolute" as const,
                left: -24,
                top: 4,
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: i === 0 ? GOLD : BORDER,
                border: `2px solid ${i === 0 ? GOLD : GRAY}`,
              }} />

              <div style={{
                background: CARD_BG,
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: "16px 20px",
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: GOLD, marginBottom: 6 }}>
                  {fr ? entry.date.fr : entry.date.en}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: MARINE, marginBottom: 6 }}>
                  {fr ? entry.title.fr : entry.title.en}
                </div>
                <div style={{ fontSize: 13, color: GRAY, lineHeight: 1.7 }}>
                  {fr ? entry.detail.fr : entry.detail.en}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p style={{
          fontSize: 11,
          color: "#999",
          marginTop: 48,
          textAlign: "center" as const,
          lineHeight: 1.6,
        }}>
          {fr
            ? "Cette page est mise à jour à chaque modification des constantes fiscales dans le moteur de simulation."
            : "This page is updated whenever fiscal constants change in the simulation engine."}
        </p>
      </main>
    </div>
  );
}
