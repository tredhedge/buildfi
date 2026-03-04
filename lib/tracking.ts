// /lib/tracking.ts
// PostHog event tracking + feature flags (client-side utility)
// Events: quiz_started, checkout_initiated, checkout_completed,
//         report_viewed, feedback_submitted, referral_clicked,
//         simulator_recalc, export_generated, upgrade_clicked

declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: Record<string, unknown>) => void;
      getFeatureFlag: (flag: string) => string | boolean | undefined;
      identify: (id: string, properties?: Record<string, unknown>) => void;
    };
  }
}

export function trackEvent(
  event: string,
  properties?: Record<string, unknown>
): void {
  try {
    if (typeof window !== "undefined" && localStorage.getItem("buildfi_consent") === "yes" && window.posthog) {
      window.posthog.capture(event, properties);
    }
  } catch {
    // Silent fail — analytics should never break the app
  }
}

export function getFeatureFlag(flag: string): string | boolean | undefined {
  try {
    if (typeof window !== "undefined" && window.posthog) {
      return window.posthog.getFeatureFlag(flag);
    }
  } catch {
    // Silent fail
  }
  return undefined;
}

export function identifyUser(
  email: string,
  properties?: Record<string, unknown>
): void {
  try {
    if (typeof window !== "undefined" && window.posthog) {
      window.posthog.identify(email, properties);
    }
  } catch {
    // Silent fail
  }
}

// Standard event names for consistency
export const EVENTS = {
  QUIZ_STARTED: "quiz_started",
  CHECKOUT_INITIATED: "checkout_initiated",
  CHECKOUT_COMPLETED: "checkout_completed",
  REPORT_VIEWED: "report_viewed",
  FEEDBACK_SUBMITTED: "feedback_submitted",
  REFERRAL_CLICKED: "referral_clicked",
  SIMULATOR_RECALC: "simulator_recalc",
  EXPORT_GENERATED: "export_generated",
  UPGRADE_CLICKED: "upgrade_clicked",
} as const;

// ---------------------------------------------------------------------------
// A/B Test Feature Flags
// ---------------------------------------------------------------------------
// These names MUST match the Feature Flag keys created in PostHog.
// See docs/AB-TESTING-GUIDE.md for setup instructions.
// ---------------------------------------------------------------------------
export const FLAGS = {
  /** CTA wording on the Essentiel product card */
  CTA_ESSENTIEL_WORDING: "cta-essentiel-wording",
  /** Which product card appears first in the grid */
  PRODUCT_CARD_ORDER: "product-card-order",
  /** Trust grid position: inside hero vs below hero */
  TRUST_GRID_POSITION: "trust-grid-position",
  /** Early-adopter badge wording on the landing page */
  EARLY_ADOPTER_BADGE: "early-adopter-badge",
} as const;

/**
 * Convenience wrapper: returns the variant string for a flag, or the
 * provided `fallback` if PostHog has not loaded / the flag is unset.
 *
 * Usage:
 *   const variant = getVariant(FLAGS.CTA_ESSENTIEL_WORDING, "control");
 */
export function getVariant(flag: string, fallback: string = "control"): string {
  const value = getFeatureFlag(flag);
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "test" : "control";
  return fallback;
}

/**
 * Track that a visitor was exposed to a specific A/B test variant.
 * Call this when the component using the flag first renders.
 *
 * PostHog does this automatically when `getFeatureFlag()` is called,
 * but this explicit event makes analysis easier in Funnels & Trends.
 */
export function trackExperimentExposure(
  flag: string,
  variant: string
): void {
  trackEvent("$feature_flag_called", {
    $feature_flag: flag,
    $feature_flag_response: variant,
  });
}
