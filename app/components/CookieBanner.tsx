"use client";

import { useEffect, useState } from "react";

// Loi 25 cookie consent banner for React routes.
// Static HTML pages (public/index.html, etc.) ship their own banner; this
// component covers the Next.js app routes (/wizard, /simulateur, /expert,
// /merci, /guides/*, /outils/*, etc.) where no consent banner existed.
//
// Sets localStorage.buildfi_consent = "yes" | "no". PostHogProvider and
// lib/tracking.ts both gate on this flag so analytics never fire without
// explicit opt-in. Decline keeps the flag set to "no" so we don't re-prompt
// on every visit.

const STORAGE_KEY = "buildfi_consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [lang, setLang] = useState<"fr" | "en">("fr");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const consent = localStorage.getItem(STORAGE_KEY);
    if (consent !== "yes" && consent !== "no") setVisible(true);
    const isFr = !window.location.search.includes("lang=en") &&
      (document.documentElement.lang || "fr").startsWith("fr");
    setLang(isFr ? "fr" : "en");
  }, []);

  if (!visible) return null;

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "yes");
    setVisible(false);
    window.dispatchEvent(new Event("buildfi:consent-changed"));
  };
  const decline = () => {
    localStorage.setItem(STORAGE_KEY, "no");
    setVisible(false);
    window.dispatchEvent(new Event("buildfi:consent-changed"));
  };

  const fr = lang === "fr";

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={fr ? "Avis sur les témoins" : "Cookie notice"}
      style={{
        position: "fixed",
        bottom: 16,
        left: 16,
        right: 16,
        maxWidth: 720,
        margin: "0 auto",
        background: "#1a2744",
        color: "#fff",
        borderRadius: 12,
        padding: "16px 20px",
        boxShadow: "0 8px 32px rgba(0,0,0,.25)",
        zIndex: 9999,
        display: "flex",
        gap: 16,
        alignItems: "center",
        flexWrap: "wrap",
        fontFamily: "var(--font-dm-sans), -apple-system, sans-serif",
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <div style={{ flex: "1 1 320px" }}>
        {fr
          ? "Nous utilisons des témoins d'analyse (PostHog) pour comprendre l'usage du site. Aucun témoin n'est déposé tant que vous n'avez pas accepté. "
          : "We use analytics cookies (PostHog) to understand site usage. No cookies are set until you accept. "}
        <a
          href="/confidentialite.html"
          style={{ color: "#c49a1a", textDecoration: "underline" }}
        >
          {fr ? "Politique de confidentialité" : "Privacy policy"}
        </a>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={decline}
          style={{
            background: "transparent",
            color: "#fff",
            border: "1px solid rgba(255,255,255,.4)",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {fr ? "Refuser" : "Decline"}
        </button>
        <button
          onClick={accept}
          style={{
            background: "#c49a1a",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {fr ? "Accepter" : "Accept"}
        </button>
      </div>
    </div>
  );
}
