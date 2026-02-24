// /app/merci/page.tsx
// Post-purchase confirmation page

import { Suspense } from "react";

async function getSessionData(sessionId: string) {
  if (!sessionId) return null;

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-01-28.clover",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return {
      email: session.customer_email || session.metadata?.email || "",
      tier: session.metadata?.tier || "essentiel",
      lang: (session.metadata?.lang || "fr") as "fr" | "en",
      paid: session.payment_status === "paid",
    };
  } catch {
    return null;
  }
}

function ConfirmationContent({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const fr = true;

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
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#1A1208",
            marginBottom: 4,
          }}
        >
          buildfi.ca
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#C4944A",
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: 2,
            marginBottom: 36,
          }}
        >
          {fr
            ? "Planification financière accessible"
            : "Accessible financial planning"}
        </div>

        {/* Success icon */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "#2A8C46",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path
              d="M20 6L9 17l-5-5"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#1A1208",
            marginBottom: 12,
          }}
        >
          {fr ? "Merci pour votre achat!" : "Thank you for your purchase!"}
        </h1>

        {/* Message */}
        <p
          style={{
            fontSize: 16,
            color: "#555",
            lineHeight: 1.7,
            marginBottom: 32,
          }}
        >
          {fr
            ? "Votre rapport personnalisé est en cours de préparation. Vous recevrez un courriel avec votre rapport PDF dans les prochaines minutes."
            : "Your personalized report is being prepared. You will receive an email with your PDF report within the next few minutes."}
        </p>

        {/* Email reminder */}
        <div
          style={{
            background: "#FDF8F0",
            border: "1px solid #E8E0D4",
            borderRadius: 12,
            padding: "20px 24px",
            marginBottom: 32,
          }}
        >
          <div
            style={{ fontSize: 14, fontWeight: 700, color: "#1A1208", marginBottom: 6 }}
          >
            {fr
              ? "Vérifiez votre boîte de réception"
              : "Check your inbox"}
          </div>
          <div style={{ fontSize: 13, color: "#666", lineHeight: 1.7 }}>
            {fr
              ? "Si vous ne voyez pas le courriel dans 5 minutes, vérifiez votre dossier indésirables (spam). Le rapport est envoyé par rapport@buildfi.ca."
              : "If you don't see the email within 5 minutes, check your spam folder. The report is sent from rapport@buildfi.ca."}
          </div>
        </div>

        {/* Support link */}
        <div style={{ fontSize: 13, color: "#999" }}>
          {fr ? "Besoin d'aide? Écrivez à " : "Need help? Email "}
          <a
            href="mailto:support@buildfi.ca"
            style={{ color: "#C4944A", textDecoration: "none", fontWeight: 600 }}
          >
            support@buildfi.ca
          </a>
        </div>
      </div>
    </div>
  );
}

export default function MerciPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#FEFCF9",
          }}
        >
          <div style={{ fontSize: 16, color: "#888" }}>Chargement...</div>
        </div>
      }
    >
      <ConfirmationContent searchParams={searchParams} />
    </Suspense>
  );
}
