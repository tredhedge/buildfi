"use client";

// /app/feedback/[token]/page.tsx
// Extended feedback form — stars + NPS + text + testimonial consent
// User lands here after clicking a star in their report or email

import { useParams, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

const GOLD = "#C4944A";
const DARK = "#1a2744";
const BG = "#FEFCF9";
const CARD = "#ffffff";
const BORDER = "#e8e4db";

interface FeedbackData {
  token: string;
  email: string;
  tier: string;
  rating: number | null;
  ratingDate: string | null;
  nps: boolean | null;
  text: string | null;
  testimonialConsent: string | null;
  testimonialText: string | null;
  couponUnlocked: boolean;
}

function FeedbackContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const preRated = searchParams.get("rated");

  const [data, setData] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [rating, setRating] = useState<number>(preRated ? parseInt(preRated) : 0);
  const [nps, setNps] = useState<boolean | null>(null);
  const [text, setText] = useState("");
  const [testimonialConsent, setTestimonialConsent] = useState<"named" | "anonymous" | "none" | null>(null);
  const [testimonialText, setTestimonialText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Detect language from browser (fallback FR for Quebec market)
  const [fr, setFr] = useState(true);
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.language) {
      setFr(navigator.language.startsWith("fr"));
    }
  }, []);

  // Fetch existing feedback record
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/feedback/${token}`);
        if (!res.ok) {
          setError(res.status === 404 ? "not_found" : "error");
          return;
        }
        const record: FeedbackData = await res.json();
        setData(record);
        if (record.rating) setRating(record.rating);
        if (record.nps != null) setNps(record.nps);
        if (record.text) setText(record.text);
        if (record.testimonialConsent) setTestimonialConsent(record.testimonialConsent as "named" | "anonymous" | "none");
        if (record.testimonialText) setTestimonialText(record.testimonialText);
        if (record.ratingDate && !preRated) setSubmitted(true);
      } catch {
        setError("error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token, preRated]);

  async function handleSubmit() {
    if (!rating) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/feedback/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          nps,
          text: text.trim() || null,
          testimonialConsent: rating >= 4 && nps ? testimonialConsent : null,
          testimonialText: rating >= 4 && nps && testimonialConsent !== "none" ? testimonialText.trim() || null : null,
        }),
      });
      if (res.ok) setSubmitted(true);
    } catch {
      // Silently fail — feedback is non-critical
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#999", fontSize: 14 }}>{fr ? "Chargement..." : "Loading..."}</div>
      </div>
    );
  }

  if (error === "not_found") {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: DARK, marginBottom: 8 }}>{fr ? "Lien invalide" : "Invalid link"}</div>
        <div style={{ fontSize: 14, color: "#666" }}>{fr ? "Ce lien de feedback n\u2019existe pas ou a expir\u00e9." : "This feedback link doesn\u2019t exist or has expired."}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: DARK, marginBottom: 8 }}>{fr ? "Erreur" : "Error"}</div>
        <div style={{ fontSize: 14, color: "#666" }}>{fr ? "Impossible de charger le formulaire. Veuillez r\u00e9essayer." : "Unable to load the form. Please try again."}</div>
      </div>
    );
  }

  // Thank you state
  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif", padding: "24px" }}>
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#9733;</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: DARK, marginBottom: 12, fontFamily: "Newsreader, Georgia, serif" }}>
            {fr ? "Merci pour votre avis\u00a0!" : "Thank you for your feedback!"}
          </div>
          <div style={{ fontSize: 14, color: "#666", lineHeight: 1.7, marginBottom: 24 }}>
            {fr ? "Votre avis nous aide directement \u00e0 am\u00e9liorer buildfi.ca." : "Your feedback directly helps us improve buildfi.ca."}
          </div>
          {data?.couponUnlocked && (
            <div style={{ background: "#f0ebe3", borderRadius: 10, padding: "16px 20px", border: `1px solid ${BORDER}`, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 6 }}>
                {fr ? "50\u00a0% de rabais d\u00e9bloqu\u00e9" : "50% discount unlocked"}
              </div>
              <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6, marginBottom: 12 }}>
                {fr
                  ? "Le rabais de 50\u00a0% est appliqu\u00e9 automatiquement au paiement lorsque vous commandez un 2e bilan."
                  : "The 50% discount is applied automatically at checkout when you order a 2nd assessment."}
              </div>
              <a
                href={`https://www.buildfi.ca/quiz-essentiel.html?lang=${fr ? "fr" : "en"}&second=1`}
                style={{ display: "inline-block", padding: "10px 20px", background: GOLD, color: "#fff", fontSize: 13, fontWeight: 600, borderRadius: 8, textDecoration: "none" }}
              >
                {fr ? "Commander un 2e bilan \u00e0 50\u00a0% de rabais" : "Order a 2nd assessment at 50% off"}
              </a>
            </div>
          )}
          <a
            href="https://www.buildfi.ca"
            style={{ display: "inline-block", marginTop: 8, padding: "10px 24px", background: data?.couponUnlocked ? "transparent" : GOLD, color: data?.couponUnlocked ? "#666" : "#fff", fontSize: 14, fontWeight: 600, borderRadius: 8, textDecoration: "none", border: data?.couponUnlocked ? `1px solid ${BORDER}` : "none" }}
          >
            {fr ? "Retour \u00e0 buildfi.ca" : "Back to buildfi.ca"}
          </a>
        </div>
      </div>
    );
  }

  // Full feedback form
  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "'DM Sans', sans-serif", padding: "40px 16px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{ fontSize: 26, fontWeight: 700, color: DARK, letterSpacing: -0.5 }}>build</span>
          <span style={{ fontSize: 26, fontWeight: 700, color: GOLD, letterSpacing: -0.5 }}>fi</span>
        </div>

        {/* Star rating */}
        <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, padding: "28px 24px", marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: DARK, marginBottom: 16 }}>
            {fr ? "Comment \u00e9valuez-vous votre bilan\u00a0?" : "How would you rate your assessment?"}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 36,
                  color: n <= rating ? "#b8860b" : "#d4cec4",
                  transition: "color 0.15s",
                  padding: "0 4px",
                  lineHeight: 1,
                }}
                aria-label={fr ? `${n} sur 5` : `${n} out of 5`}
              >
                &#9733;
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "#999", marginTop: 8 }}>
            {rating > 0 ? `${rating}/5` : (fr ? "Cliquez une \u00e9toile" : "Click a star")}
          </div>
        </div>

        {/* NPS */}
        {rating > 0 && (
          <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, padding: "20px 24px", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: DARK, marginBottom: 12 }}>
              {fr ? "Recommanderiez-vous buildfi.ca \u00e0 un proche\u00a0?" : "Would you recommend buildfi.ca to someone you know?"}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setNps(true)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 8,
                  border: `1.5px solid ${nps === true ? GOLD : BORDER}`,
                  background: nps === true ? "rgba(196,148,74,0.08)" : CARD,
                  color: nps === true ? GOLD : "#666",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {fr ? "Oui" : "Yes"}
              </button>
              <button
                onClick={() => setNps(false)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: 8,
                  border: `1.5px solid ${nps === false ? "#999" : BORDER}`,
                  background: nps === false ? "rgba(0,0,0,0.03)" : CARD,
                  color: nps === false ? "#555" : "#666",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {fr ? "Pas pour l\u2019instant" : "Not right now"}
              </button>
            </div>
          </div>
        )}

        {/* Text feedback */}
        {rating > 0 && (
          <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, padding: "20px 24px", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: DARK, marginBottom: 8 }}>
              {fr ? "Un commentaire\u00a0?" : "Any comments?"} <span style={{ fontWeight: 400, color: "#999" }}>({fr ? "optionnel" : "optional"})</span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
              placeholder={fr ? "Ce qui vous a plu, ce qui pourrait \u00eatre am\u00e9lior\u00e9..." : "What you liked, what could be improved..."}
              style={{
                width: "100%",
                minHeight: 80,
                padding: 12,
                borderRadius: 8,
                border: `1px solid ${BORDER}`,
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
                color: DARK,
                resize: "vertical",
                outline: "none",
              }}
            />
            <div style={{ fontSize: 11, color: "#bbb", textAlign: "right", marginTop: 4 }}>
              {text.length}/500
            </div>
          </div>
        )}

        {/* Testimonial consent (only if rating >= 4 AND NPS yes) */}
        {rating >= 4 && nps === true && (
          <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, padding: "20px 24px", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: DARK, marginBottom: 4 }}>
              {fr ? "Pouvons-nous utiliser votre avis comme t\u00e9moignage\u00a0?" : "Can we use your feedback as a testimonial?"}
            </div>
            <div style={{ fontSize: 12, color: "#999", marginBottom: 12, lineHeight: 1.5 }}>
              {fr ? "Votre t\u00e9moignage aide d\u2019autres personnes \u00e0 d\u00e9couvrir buildfi.ca." : "Your testimonial helps others discover buildfi.ca."}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {([
                { value: "named" as const, label: fr ? "Oui, avec mon pr\u00e9nom" : "Yes, with my first name" },
                { value: "anonymous" as const, label: fr ? "Oui, de fa\u00e7on anonyme" : "Yes, anonymously" },
                { value: "none" as const, label: fr ? "Non merci" : "No thanks" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTestimonialConsent(opt.value)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: `1.5px solid ${testimonialConsent === opt.value ? GOLD : BORDER}`,
                    background: testimonialConsent === opt.value ? "rgba(196,148,74,0.08)" : CARD,
                    color: testimonialConsent === opt.value ? GOLD : "#555",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                    textAlign: "left",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {testimonialConsent && testimonialConsent !== "none" && (
              <div style={{ marginTop: 12 }}>
                <textarea
                  value={testimonialText}
                  onChange={(e) => setTestimonialText(e.target.value.slice(0, 300))}
                  placeholder={fr ? "Votre t\u00e9moignage en quelques mots..." : "Your testimonial in a few words..."}
                  style={{
                    width: "100%",
                    minHeight: 60,
                    padding: 12,
                    borderRadius: 8,
                    border: `1px solid ${BORDER}`,
                    fontSize: 13,
                    fontFamily: "'DM Sans', sans-serif",
                    color: DARK,
                    resize: "vertical",
                    outline: "none",
                  }}
                />
                <div style={{ fontSize: 11, color: "#bbb", textAlign: "right", marginTop: 4 }}>
                  {testimonialText.length}/300
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        {rating > 0 && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              width: "100%",
              padding: "14px",
              background: GOLD,
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              borderRadius: 10,
              border: "none",
              cursor: submitting ? "wait" : "pointer",
              opacity: submitting ? 0.7 : 1,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {submitting ? (fr ? "Envoi..." : "Sending...") : (fr ? "Envoyer mon avis" : "Submit my feedback")}
          </button>
        )}

        <div style={{ textAlign: "center", fontSize: 11, color: "#bbb", marginTop: 16 }}>
          buildfi.ca &mdash; {fr ? "Planification financi\u00e8re accessible" : "Accessible financial planning"}
        </div>
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#999", fontSize: 14 }}>Chargement...</div>
      </div>
    }>
      <FeedbackContent />
    </Suspense>
  );
}
