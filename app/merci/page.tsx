// /app/merci/page.tsx
// Page de confirmation post-achat

import { Suspense } from "react";

function ConfirmationContent() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FEFCF9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        padding: "40px 24px",
      }}
    >
      <div style={{ maxWidth: 520, textAlign: "center" }}>

        {/* Logo */}
        <div style={{ fontSize: 28, fontWeight: 800, color: "#1A1208", marginBottom: 4 }}>
          buildfi.ca
        </div>
        <div style={{
          fontSize: 11, color: "#C4944A", fontWeight: 600,
          textTransform: "uppercase" as const, letterSpacing: 2, marginBottom: 36,
        }}>
          Planification financière accessible
        </div>

        {/* Icône succès */}
        <div style={{
          width: 72, height: 72, borderRadius: "50%", background: "#2A8C46",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 24px",
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Titre */}
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1A1208", marginBottom: 12 }}>
          Merci pour votre achat!
        </h1>

        {/* Message */}
        <p style={{ fontSize: 16, color: "#555", lineHeight: 1.7, marginBottom: 32 }}>
          Votre rapport personnalisé est en cours de préparation.
          Vous recevrez un courriel avec votre rapport PDF dans les prochaines minutes.
        </p>

        {/* Encadré email */}
        <div style={{
          background: "#FDF8F0", border: "1px solid #E8E0D4",
          borderRadius: 12, padding: "20px 24px", marginBottom: 32,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1208", marginBottom: 6 }}>
            Vérifiez votre boîte de réception
          </div>
          <div style={{ fontSize: 13, color: "#666", lineHeight: 1.7 }}>
            Si vous ne voyez pas le courriel dans 5 minutes, vérifiez votre dossier
            indésirables (spam). Le rapport est envoyé par rapport@buildfi.ca.
          </div>
        </div>

        {/* Support */}
        <div style={{ fontSize: 13, color: "#999" }}>
          Besoin d&apos;aide? Écrivez à{" "}
          <a href="mailto:support@buildfi.ca"
            style={{ color: "#C4944A", textDecoration: "none", fontWeight: 600 }}>
            support@buildfi.ca
          </a>
        </div>

      </div>
    </div>
  );
}

export default function MerciPage() {
  return (
    <Suspense
      fallback={
        <div style={{
          minHeight: "100vh", display: "flex", alignItems: "center",
          justifyContent: "center", background: "#FEFCF9",
        }}>
          <div style={{ fontSize: 16, color: "#888" }}>Chargement...</div>
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
