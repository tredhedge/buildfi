// /app/acces/page.tsx
// Public token recovery page — email input to request a new magic link
// No auth required. Always returns success to prevent email enumeration.

"use client";

import { useState, FormEvent } from "react";

const MARINE = "#1a2744";
const GOLD = "#c49a1a";
const BG = "#faf8f4";
const CARD_BG = "#ffffff";
const BORDER = "#d4cec4";
const GRAY = "#666666";
const DARK = "#1A1208";
const GOLD_LIGHT = "#c49a1a";

export default function AccesPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [lang, setLang] = useState<"fr" | "en">("fr");

  const fr = lang === "fr";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (!res.ok) {
        throw new Error("Request failed");
      }

      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  const t = {
    title: fr ? "R\u00e9cup\u00e9rer votre acc\u00e8s" : "Recover your access",
    subtitle: fr
      ? "Entrez votre adresse courriel pour recevoir un nouveau lien d\u2019acc\u00e8s \u00e0 votre Simulateur Expert."
      : "Enter your email address to receive a new access link to your Expert Simulator.",
    emailPlaceholder: fr ? "votre@courriel.com" : "your@email.com",
    submit: fr ? "Envoyer le lien d\u2019acc\u00e8s" : "Send access link",
    loading: fr ? "Envoi en cours\u2026" : "Sending\u2026",
    successTitle: fr ? "V\u00e9rifiez votre bo\u00eete de r\u00e9ception" : "Check your inbox",
    successMsg: fr
      ? "Si un compte Expert existe pour cette adresse, un lien d\u2019acc\u00e8s a \u00e9t\u00e9 envoy\u00e9."
      : "If an Expert account exists for this address, an access link has been sent.",
    successNote: fr
      ? "V\u00e9rifiez aussi votre dossier de courrier ind\u00e9sirable (spam)."
      : "Please also check your spam/junk folder.",
    errorMsg: fr
      ? "Une erreur est survenue. Veuillez r\u00e9essayer."
      : "An error occurred. Please try again.",
    retry: fr ? "R\u00e9essayer" : "Try again",
    back: fr ? "\u2190 Retour \u00e0 buildfi.ca" : "\u2190 Back to buildfi.ca",
    help: fr
      ? "Besoin d\u2019aide\u00a0?"
      : "Need help?",
    disclaimer: fr
      ? "Cet outil est fourni \u00e0 titre informatif et \u00e9ducatif seulement."
      : "This tool is provided for informational and educational purposes only.",
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: BG,
      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
    }}>
      {/* Language toggle */}
      <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8 }}>
        <button
          onClick={() => setLang("fr")}
          style={{
            background: lang === "fr" ? MARINE : "transparent",
            color: lang === "fr" ? "#fff" : GRAY,
            border: `1px solid ${lang === "fr" ? MARINE : BORDER}`,
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          FR
        </button>
        <button
          onClick={() => setLang("en")}
          style={{
            background: lang === "en" ? MARINE : "transparent",
            color: lang === "en" ? "#fff" : GRAY,
            border: `1px solid ${lang === "en" ? MARINE : BORDER}`,
            borderRadius: 6,
            padding: "4px 10px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          EN
        </button>
      </div>

      {/* Logo */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <span style={{ fontSize: 30, fontWeight: 700, color: DARK, letterSpacing: -0.5 }}>
          build
        </span>
        <span style={{ fontSize: 30, fontWeight: 700, color: GOLD_LIGHT, letterSpacing: -0.5 }}>
          fi
        </span>
        <div style={{
          fontSize: 10,
          fontWeight: 600,
          color: GOLD_LIGHT,
          textTransform: "uppercase" as const,
          letterSpacing: 2,
          marginTop: 4,
        }}>
          {fr ? "Planification financi\u00e8re accessible" : "Accessible financial planning"}
        </div>
      </div>

      {/* Card */}
      <div style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: "36px 32px",
        maxWidth: 440,
        width: "100%",
        boxShadow: "0 2px 8px rgba(0,0,0,.04)",
      }}>
        {status === "success" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(26,122,76,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              fontSize: 24,
            }}>
              &#9993;
            </div>
            <h2 style={{
              fontSize: 20,
              fontWeight: 700,
              color: MARINE,
              marginBottom: 12,
              fontFamily: "Newsreader, Georgia, serif",
            }}>
              {t.successTitle}
            </h2>
            <p style={{ fontSize: 14, color: "#333", lineHeight: 1.7, marginBottom: 12 }}>
              {t.successMsg}
            </p>
            <p style={{ fontSize: 12, color: GRAY, lineHeight: 1.6 }}>
              {t.successNote}
            </p>
          </div>
        ) : status === "error" ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 14, color: "#b91c1c", marginBottom: 16 }}>
              {t.errorMsg}
            </p>
            <button
              onClick={() => setStatus("idle")}
              style={{
                background: GOLD,
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "12px 32px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {t.retry}
            </button>
          </div>
        ) : (
          <>
            <h1 style={{
              fontSize: 22,
              fontWeight: 700,
              color: MARINE,
              marginBottom: 10,
              textAlign: "center",
              fontFamily: "Newsreader, Georgia, serif",
            }}>
              {t.title}
            </h1>
            <p style={{
              fontSize: 14,
              color: "#555",
              lineHeight: 1.7,
              textAlign: "center",
              marginBottom: 24,
            }}>
              {t.subtitle}
            </p>

            <form onSubmit={handleSubmit}>
              <label
                htmlFor="email-input"
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: MARINE,
                  marginBottom: 6,
                }}
              >
                {fr ? "Adresse courriel" : "Email address"}
              </label>
              <input
                id="email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: 15,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  outline: "none",
                  marginBottom: 16,
                  fontFamily: "inherit",
                  boxSizing: "border-box" as const,
                }}
              />
              <button
                type="submit"
                disabled={status === "loading" || !email.trim()}
                style={{
                  width: "100%",
                  background: status === "loading" ? "#999" : GOLD,
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "14px 24px",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: status === "loading" ? "wait" : "pointer",
                  opacity: !email.trim() ? 0.5 : 1,
                }}
              >
                {status === "loading" ? t.loading : t.submit}
              </button>
            </form>
          </>
        )}
      </div>

      {/* Footer links */}
      <div style={{ marginTop: 24, textAlign: "center" }}>
        <a
          href="https://www.buildfi.ca"
          style={{
            fontSize: 13,
            color: GOLD_LIGHT,
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          {t.back}
        </a>
      </div>
      <div style={{ marginTop: 12, textAlign: "center" }}>
        <span style={{ fontSize: 11, color: "#999" }}>
          {t.help}{" "}
          <a href="mailto:support@buildfi.ca" style={{ color: GOLD_LIGHT, textDecoration: "none" }}>
            support@buildfi.ca
          </a>
        </span>
      </div>
      <div style={{ marginTop: 16, textAlign: "center", fontSize: 10, color: "#bbb", maxWidth: 400 }}>
        {t.disclaimer}
      </div>
      <div style={{ marginTop: 8, textAlign: "center", fontSize: 10, color: "#ccc" }}>
        <a href="https://www.buildfi.ca/conditions.html" style={{ color: GOLD_LIGHT, textDecoration: "none" }}>
          {fr ? "Conditions" : "Terms"}
        </a>
        {" \u00b7 "}
        <a href="https://www.buildfi.ca/confidentialite.html" style={{ color: GOLD_LIGHT, textDecoration: "none" }}>
          {fr ? "Confidentialit\u00e9" : "Privacy"}
        </a>
        {" \u00b7 "}
        <a href="https://www.buildfi.ca/avis-legal.html" style={{ color: GOLD_LIGHT, textDecoration: "none" }}>
          {fr ? "Avis l\u00e9gal" : "Legal"}
        </a>
      </div>
    </div>
  );
}
