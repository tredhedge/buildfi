"use client";

import { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// ConsentBanner — Law 25 opt-in analytics consent bar for the React app.
//
// Writes localStorage.buildfi_consent ("yes" | "no"), which is the gate
// PostHogProvider checks before loading PostHog. On accept it dispatches
// "bf-consent-granted" so analytics starts in the same session without a
// reload. Mirrors the static-landing banner in public/index.html so both
// surfaces share one consent key and one behavior.
// ---------------------------------------------------------------------------

export default function ConsentBanner() {
  const [show, setShow] = useState(false);
  const [fr, setFr] = useState(true);

  useEffect(() => {
    try {
      if (!localStorage.getItem("buildfi_consent")) setShow(true);
    } catch {
      /* localStorage blocked → never show (nothing to persist against) */
    }
    try {
      setFr(!(navigator.language || "").toLowerCase().startsWith("en"));
    } catch {
      /* default FR */
    }
  }, []);

  if (!show) return null;

  const decide = (v: "yes" | "no") => {
    try {
      localStorage.setItem("buildfi_consent", v);
    } catch {
      /* ignore */
    }
    if (v === "yes") window.dispatchEvent(new Event("bf-consent-granted"));
    setShow(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={fr ? "Consentement aux témoins" : "Cookie consent"}
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9998,
        background: "rgba(26,39,68,.97)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        flexWrap: "wrap",
        fontSize: 13.5,
        lineHeight: 1.5,
        color: "rgba(255,255,255,.85)",
      }}
    >
      <span style={{ maxWidth: 640 }}>
        {fr
          ? "Ce site utilise des témoins analytiques, activés seulement avec votre accord, pour améliorer l’expérience. "
          : "This site uses analytics cookies, enabled only with your consent, to improve your experience. "}
        <a
          href="/confidentialite"
          style={{ color: "#d4af37", textDecoration: "underline" }}
        >
          {fr ? "Politique de confidentialité" : "Privacy policy"}
        </a>
        .
      </span>
      <span style={{ display: "flex", gap: 10, flex: "none" }}>
        <button
          type="button"
          onClick={() => decide("yes")}
          style={{
            padding: "8px 20px",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            background: "linear-gradient(135deg,#c49a1a,#d4af37)",
            color: "#fff",
          }}
        >
          {fr ? "Accepter" : "Accept"}
        </button>
        <button
          type="button"
          onClick={() => decide("no")}
          style={{
            padding: "8px 18px",
            border: "1px solid rgba(255,255,255,.28)",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            background: "transparent",
            color: "rgba(255,255,255,.72)",
          }}
        >
          {fr ? "Refuser" : "Decline"}
        </button>
      </span>
    </div>
  );
}
