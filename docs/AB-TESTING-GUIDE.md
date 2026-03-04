# A/B Testing Guide — BuildFi

## Overview

BuildFi uses PostHog Feature Flags for A/B testing. The integration lives in three files:

| File | Role |
|------|------|
| `app/components/PostHogProvider.tsx` | Loads PostHog SDK, wraps the app |
| `lib/tracking.ts` | `FLAGS` constants, `getVariant()`, `trackExperimentExposure()` |
| `app/layout.tsx` | Mounts `<PostHogProvider>` around the app |

---

## How to Create an Experiment

### Step 1 — Create a Feature Flag in PostHog

1. Go to **PostHog > Feature Flags** (left sidebar).
2. Click **New feature flag**.
3. Set the **Key** to one of the values from `FLAGS` in `lib/tracking.ts`:
   - `cta-essentiel-wording`
   - `product-card-order`
   - `trust-grid-position`
   - `early-adopter-badge`
4. Under **Served value**, choose **Experiment** (multivariate).
5. Add two variants:
   - `control` — the current / default experience
   - `test` — the new variation
6. Set the **Rollout** to **50 / 50** split.
7. Save. Do NOT enable yet.

### Step 2 — Create the Experiment

1. Go to **PostHog > Experiments** (left sidebar).
2. Click **New experiment**.
3. Link to the Feature Flag you just created.
4. Set the **Goal metric** to one of the `EVENTS` from `lib/tracking.ts`:
   - `checkout_initiated` (primary conversion)
   - `checkout_completed` (hard conversion)
   - `quiz_started` (engagement)
   - `upgrade_clicked` (upsell)
5. Set **Minimum sample size** to 200 unique visitors per variant.
6. Save the experiment.

### Step 3 — Launch

1. Go back to the Feature Flag and **enable** it.
2. The experiment is now live. Visitors are bucketed 50/50.

### Step 4 — Wait and Monitor

- Run for **2-3 weeks minimum** (or until 200+ visitors per variant).
- Check the Experiment page daily for early anomalies.
- Do NOT stop early unless one variant is clearly harmful.

### Step 5 — Read Results

1. Go to **PostHog > Experiments** and open yours.
2. Look for **statistical significance** (p < 0.05).
3. If the test variant wins, ship it as the new default.
4. If no winner, keep the current version and archive the experiment.

---

## Using Flags in Code

```tsx
import { FLAGS, getVariant, trackExperimentExposure } from "@/lib/tracking";

function EssentielCTA() {
  const variant = getVariant(FLAGS.CTA_ESSENTIEL_WORDING, "control");

  // Track exposure on render
  useEffect(() => {
    trackExperimentExposure(FLAGS.CTA_ESSENTIEL_WORDING, variant);
  }, [variant]);

  return (
    <button>
      {variant === "test" ? "Voir mon bilan" : "Obtenir ma note"}
    </button>
  );
}
```

---

## Rules

1. **One experiment at a time.** Overlapping tests create confounding variables.
2. **Never test prices.** Pricing experiments erode trust and violate Stripe ToS for inconsistent pricing display.
3. **Only test wording, layout, and positioning.** No functional changes behind flags.
4. **Run 2-3 weeks minimum.** Weekday-vs-weekend traffic differs. Short tests are unreliable.
5. **Need 200+ unique visitors per variant** before drawing conclusions.
6. **Archive after shipping.** Disable the feature flag and remove the code branch after the winning variant is hardcoded.

---

## Recommended Experiments (Priority Order)

Run these one at a time, in order.

### Experiment 1 — CTA Essentiel Wording

| | Details |
|---|---|
| **Flag** | `cta-essentiel-wording` |
| **Control** | "Obtenir ma note" |
| **Test** | "Voir mon bilan" |
| **Goal** | `checkout_initiated` |
| **Hypothesis** | "Voir mon bilan" feels less transactional and may increase click-through from the landing page to Stripe checkout. |
| **Where** | Landing page Essentiel product card CTA button |

### Experiment 2 — Product Card Order

| | Details |
|---|---|
| **Flag** | `product-card-order` |
| **Control** | Essentiel card first (left position) |
| **Test** | Intermediaire card first (left position) |
| **Goal** | `checkout_initiated` |
| **Hypothesis** | Leading with the mid-tier card may anchor perception higher, increasing average order value without reducing total conversions. |
| **Where** | Landing page pricing grid |

### Experiment 3 — Trust Grid Position

| | Details |
|---|---|
| **Flag** | `trust-grid-position` |
| **Control** | Trust grid inside the hero section |
| **Test** | Trust grid directly below the hero section |
| **Goal** | `quiz_started` |
| **Hypothesis** | Moving trust signals below the fold may reduce visual clutter in the hero, improving the primary CTA conversion. |
| **Where** | Landing page hero / below-hero area |

### Experiment 4 — Early Adopter Badge

| | Details |
|---|---|
| **Flag** | `early-adopter-badge` |
| **Control** | "50% rabais" badge |
| **Test** | "Offre fondateur" badge |
| **Goal** | `checkout_initiated` |
| **Hypothesis** | "Offre fondateur" creates exclusivity and urgency without price anchoring, which may convert better than a generic discount label. |
| **Where** | Landing page product card badge |

---

## Relevant Constants Reference

### Feature Flags (`lib/tracking.ts`)

```ts
export const FLAGS = {
  CTA_ESSENTIEL_WORDING: "cta-essentiel-wording",
  PRODUCT_CARD_ORDER: "product-card-order",
  TRUST_GRID_POSITION: "trust-grid-position",
  EARLY_ADOPTER_BADGE: "early-adopter-badge",
} as const;
```

### Goal Events (`lib/tracking.ts`)

```ts
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
```
