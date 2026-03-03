"use client";
// /app/error.tsx — Global error boundary (500-type errors)
// BuildFi brand style: #faf8f4 background, #1a2744 marine, #C4944A gold

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#FEFCF9",
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "48px 24px",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#1A1208", marginBottom: 4 }}>
        buildfi.ca
      </div>
      <div style={{
        fontSize: 11, color: "#C4944A", fontWeight: 600,
        textTransform: "uppercase", letterSpacing: 2, marginBottom: 48,
      }}>
        Planification financière accessible
      </div>

      <div style={{ fontSize: 64, fontWeight: 800, color: "#E8E0D4", marginBottom: 16 }}>
        Oups
      </div>
      <h1 style={{
        fontSize: 22, fontWeight: 700, color: "#1a2744", marginBottom: 12,
        fontFamily: "Newsreader, Georgia, serif",
      }}>
        Erreur temporaire
      </h1>
      <p style={{ fontSize: 15, color: "#666", lineHeight: 1.7, maxWidth: 420, marginBottom: 32 }}>
        Quelque chose s&apos;est mal passé. Rechargez la page ou contactez-nous si le problème persiste.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={() => reset()}
          style={{
            display: "inline-block", padding: "12px 28px",
            background: "#C4944A", color: "#fff", fontSize: 14, fontWeight: 600,
            borderRadius: 8, border: "none", cursor: "pointer",
          }}
        >
          Recharger la page
        </button>
        <a href="/" style={{
          display: "inline-block", padding: "12px 28px",
          background: "transparent", color: "#C4944A", fontSize: 14, fontWeight: 600,
          borderRadius: 8, textDecoration: "none",
          border: "2px solid #C4944A",
        }}>
          Retour à l&apos;accueil
        </a>
      </div>

      <div style={{ fontSize: 12, color: "#999", marginTop: 48 }}>
        <a href="mailto:support@buildfi.ca" style={{ color: "#C4944A", textDecoration: "none" }}>
          support@buildfi.ca
        </a>
      </div>
    </div>
  );
}
