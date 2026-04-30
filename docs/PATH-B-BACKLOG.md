# PATH-B-BACKLOG.md

**Purpose:** Items deliberately deferred from the Path-A ship-to-customer
scope. These are NOT in the current quality roadmap. They get pulled in
only when product strategy or customer demand justifies the work.

**Last reviewed:** 2026-04-26

---

## Frontend / UX

### F-1. Adaptive Wizard refactor (mode 1 = classifier, mode 2 = personalized)
**Status:** Deferred from Path-A.
**Why parked:** Backend work shipped (consent + checkout server gate). The
existing wizard works for the current 1-2 SKU launch. Adaptive Wizard is
a significant UX overhaul — separate workstream.

### F-2. Re-run portal for Planner customers
Current: customers receive a magic link to `/expert` to access the
simulator + report regen. Portal UI is functional but minimal.
**Why parked:** Sufficient for launch. Premium client portal experience
(notifications, scenario library, comparison view, export to advisor) is
post-launch feature work.

### F-3. Print-first redesign
Current: report renders identically on web and print. Some interactivity
(slicers, fan chips) is print-hidden via CSS.
**Why parked:** Acceptable today. A dedicated "print profile" mode (paper
size selection, advisor-branded headers, page break controls) is
worthwhile but not blocking.

### F-4. Mobile-first deep responsiveness
Current: report has @media (max-width: …) breakpoints for charts,
sticky bar, and tooltips. Acceptable.
**Why parked:** Buyers print or read on desktop. Mobile fidelity beyond
"readable" is post-launch.

---

## Engine / Math

### E-1. Full T1 ingestion
Allow user to upload last year's T1 / NOA. Auto-fill quiz from notice.
**Why parked:** Stripe + manual quiz works for v1. Tax-form ingestion
introduces parsing complexity and potential PII liability.

### E-2. Per-lever optimization scoring (engine-side)
Sprint 1.5 (premium-tier) emits an "Optimization scorecard" with
hard-coded targets. Real implementation: engine evaluates each lever
under counterfactual scenarios (split off / on, decum order standard /
optimized, etc.) and computes the ACTUAL gap.
**Why parked:** Multi-day engine refactor. Hard-coded targets are
defensible for v1 since they reflect AMF-typical levers.

### E-3. Stochastic mortality with longevity tail
Current: `stochMort=true` uses CPM-2023 with normal-ish dispersion.
**Why parked:** Acceptable. Longevity-tail modeling (centenarians,
long-tail mortality) is a research-grade enhancement.

### E-4. RPP / DC / DB integration in engine
Profiles support `penType` (db/dc) but DC plans are minimally modeled.
**Why parked:** Most retirees have either DB OR no employer pension.
Mixed DC + RRSP is a refinement.

### E-5. International tax integration (US, dual citizens)
Current: engine assumes Canadian residency.
**Why parked:** Adds significant complexity. Dual citizens are <5% of
target market.

---

## Data / Compliance

### D-1. Save-scenario KV persistence (live What-If)
What-If currently persists scenarios in browser memory only.
**Why parked:** Adds Loi 25 retention complexity (saved scenarios = more
PII to retain). Until product strategy adopts "saved scenarios" as a
feature, session-local is fine.

### D-2. Annual fiscal table refresh process
Manual today: edit `lib/constants/engine-shim.js` annually.
**Why parked:** Documented in TECH-REFERENCE.md. Automation (scrape
CRA/RQ, diff, suggest PR) is over-engineering for a ~10-line-a-year
update.

### D-3. Anthropic prompt zero-retention enterprise toggle
Current: prompts retained 30 days by Anthropic per their default policy.
Privacy policy discloses this.
**Why parked:** Requires Anthropic enterprise tier. Disclosure satisfies
Loi 25.

### D-4. Disaster recovery / backup restoration procedure
**Why parked:** Vercel + Upstash + Stripe each have their own DR. We
don't store irreplaceable PII (reports can be regenerated from quiz
inputs in KV).

---

## Product Features

### P-1. Advisor handoff format
Generate a structured handoff document (JSON or PDF) the customer can
forward to their planificateur.
**Why parked:** Premium feature, post-launch.

### P-2. Year-over-year comparison reports
"Your situation last year vs. this year — what changed?"
**Why parked:** Requires versioned profile storage + comparison UI.
Post-launch.

### P-3. Goal-tracker
"You said you'd save $X by Y — here's where you are."
**Why parked:** Post-launch retention feature.

### P-4. A/B telemetry on report variants
Test which framing (positive/negative) drives more advisor referrals.
**Why parked:** Need real volume first.

### P-5. Concurrent-user / simultaneous-edit handling
Two devices editing the same Planner profile.
**Why parked:** Edge case for v1.

### P-6. Bilan Annuel (subscription product)
Originally planned, killed in product structure 2026-04-22.
**Why parked:** PRODUCT DECISION — do not revive without user direction.

---

## Visual / Design

### V-1. Tax-efficiency radial chart
Sprint 6 deferred this until engine emits per-lever scores (E-2 above).
**Why parked:** Otherwise vanity / undefendable.

### V-2. Sankey diagram of money flows
Beautiful, but legibility risk in print at 8.5×11.
**Why parked:** Defer to interactive-only later.

### V-3. Animated counters / motion charts
Look like SaaS marketing junk on a financial document.
**Why parked:** Wrong tone.

### V-4. Heatmap of monthly cashflow
Engine is annual; monthly granularity not modeled.
**Why parked:** Engine refactor required.

---

## Testing / QA

### Q-1. Real-LLM integration test in CI
`tests/ai-judge.mjs` runs in stub mode in CI today (no API key in env).
**Why parked:** Cost + flakiness concern. Manual run before each
release is sufficient.

### Q-2. Visual regression testing (Playwright + screenshot diff)
**Why parked:** Manual visual review during sprint debriefs is sufficient
for v1.

### Q-3. Load testing
**Why parked:** Vercel auto-scales; not blocking until volume justifies.

---

## When to revisit this backlog

- After 100 paying customers: review F-2 (portal), P-1 (advisor handoff)
- After first Loi 25 audit / inquiry: review D-3 (Anthropic), D-4 (DR)
- Before annual constants refresh: review D-2
- When Quebec regulator publishes new guidance: review the runbook +
  this backlog for new items
