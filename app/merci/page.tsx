// /app/merci/page.tsx
// Post-purchase confirmation page
// Displays success message and provides download link

import { Suspense } from "react";

// Stripe session lookup happens server-side
async function getSessionData(sessionId: string) {
  if (!sessionId) return null;

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-12-18.acacia",
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
  // For now, render a static confirmation
  // In production, look up the session to personalize
  const fr = true; // Default to French; use session.lang in production

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
            fontSize: 24,
            fontWeight: 800,
            color: "#1A1208",
            letterSpacing: -0.5,
            marginBottom: 8,
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
            marginBottom: 40,
          }}
        >
          {fr ? "Planification financière accessible" : "Accessible financial planning"}
        </div>

        {/* Success icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #2A8C46, #3AA856)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#1A1A1A",
            marginBottom: 12,
          }}
        >
          {fr ? "Merci pour votre achat!" : "Thank you for your purchase!"}
        </h1>

        {/* Message */}
        <p
          style={{
            fontSize: 15,
            color: "#555",
            lineHeight: 1.8,
            marginBottom: 32,
          }}
        >
          {fr
            ? "Votre rapport personnalisé est en cours de préparation. Vous recevrez un courriel avec votre rapport PDF dans les prochaines minutes."
            : "Your personalized report is being prepared. You'll receive an email with your PDF report in the next few minutes."}
        </p>

        {/* Email note */}
        <div
          style={{
            background: "#FFF8ED",
            border: "1px solid #E8E0D4",
            borderRadius: 12,
            padding: "20px 24px",
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1208", marginBottom: 6 }}>
            {fr ? "Vérifiez votre boîte de réception" : "Check your inbox"}
          </div>
          <div style={{ fontSize: 13, color: "#666", lineHeight: 1.7 }}>
            {fr
              ? "Si vous ne voyez pas le courriel dans 5 minutes, vérifiez votre dossier indésirables (spam). Le rapport est envoyé par rapport@buildfi.ca."
              : "If you don't see the email within 5 minutes, check your spam folder. The report is sent from rapport@buildfi.ca."}
          </div>
        </div>

        {/* Support */}
        <p style={{ fontSize: 12, color: "#999" }}>
          {fr
            ? "Besoin d'aide? Écrivez à support@buildfi.ca"
            : "Need help? Email support@buildfi.ca"}
        </p>
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
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          Chargement...
        </div>
      }
    >
      <ConfirmationContent searchParams={searchParams} />
    </Suspense>
  );
}
