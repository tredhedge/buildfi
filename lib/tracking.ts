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
    if (typeof window !== "undefined" && window.posthog) {
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
