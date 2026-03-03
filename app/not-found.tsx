// /app/not-found.tsx — Custom 404 page
// BuildFi brand style: #faf8f4 background, #1a2744 marine, #C4944A gold

export default function NotFound() {
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
        404
      </div>
      <h1 style={{
        fontSize: 22, fontWeight: 700, color: "#1a2744", marginBottom: 12,
        fontFamily: "Newsreader, Georgia, serif",
      }}>
        Page introuvable
      </h1>
      <p style={{ fontSize: 15, color: "#666", lineHeight: 1.7, maxWidth: 400, marginBottom: 32 }}>
        Cette page n&apos;existe pas ou a été déplacée. Retournez à l&apos;accueil pour continuer.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <a href="/" style={{
          display: "inline-block", padding: "12px 28px",
          background: "#C4944A", color: "#fff", fontSize: 14, fontWeight: 600,
          borderRadius: 8, textDecoration: "none",
        }}>
          Retour à l&apos;accueil
        </a>
        <a href="/quiz-essentiel.html" style={{
          display: "inline-block", padding: "12px 28px",
          background: "transparent", color: "#C4944A", fontSize: 14, fontWeight: 600,
          borderRadius: 8, textDecoration: "none",
          border: "2px solid #C4944A",
        }}>
          Commencer mon bilan
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
