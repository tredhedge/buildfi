# ARCH-BILAN-360.md
> Architecture decisions for Bilan 360 ($19.99) — single adaptive product
> Created: 2026-03-13 | Updated: 2026-03-13 (v2 — all decisions locked)

---

## 0. Product Intent

Bilan 360 replaces Inter ($59) and Decum ($59) with **one adaptive report at $19.99**.
The customer answers one quiz, gets one report tailored to their life phase.
No choosing between products. No confusion. Quality 12/10.

**Product ladder (locked):**
| Product | Price | Fields | Couple | Properties | Engine |
|---|---|---|---|---|---|
| Bilan | $9.99 | ~33 | No | Primary only | 5K sims, no fatT/stochMort |
| Bilan 360 | $19.99 | 45-51 | Full modeling | Primary + 2 rentals | 5K-13K sims, fatT + stochMort |
| Laboratoire | $49.99 + $29.99/yr | 190+ | Full | Unlimited | Interactive simulator |

**No Bilan Annuel.** The free product concept is dropped.

**Cost structure**: Opus AI ~$0.13/report = 0.65% of revenue. MC 5K-13K sims = 4-15s. Margin > 95%.

---

## DA-01: Life Phase Bifurcation Logic

### The 3 phases

```
if (already retired OR retAge - age <= 0)     -> DECUMULATION
else if (retAge - age <= 7 AND age >= 52)     -> TRANSITION
else                                           -> ACCUMULATION
```

**Why 7 years and 52+?** (not 5 years)
- At 7 years out, CPP/QPP timing decisions become actionable (claim at 60 vs 65 vs 70)
- At 52+, decumulation sequencing matters (RRSP meltdown window, OAS clawback planning)
- A 35-year-old retiring at 40 (FIRE) hits the `<= 7` rule but NOT the `>= 52` rule -> stays ACCUM with a FIRE flag
- A 58-year-old retiring at 62 -> TRANSITION (both accumulation questions AND decum insights)

### FIRE detection (separate from phase)

```
if (retAge - age > 0 AND retAge <= 50)        -> FIRE flag = true
```

FIRE profiles stay in ACCUMULATION phase but get:
- Bridge period analysis (years without government income)
- Sequence risk warning (25+ years of withdrawals)
- No CPP/QPP timing section (too far away to be actionable)

---

## DA-02: Quiz Architecture — One Quiz, Adaptive Segments

### Routing question (Step 0)

Step 0 asks ONE question that determines the phase:

```
"Where are you in your retirement journey?"
- "I'm actively saving for retirement" -> age + retAge determines ACCUM or TRANSITION
- "I'm retired or retiring within a year" -> DECUMULATION
```

This is a UX shortcut. The formula in DA-01 is the truth, but the user's self-declaration avoids ambiguity. If someone says "actively saving" but retAge - age = 3 and age = 60, the formula overrides to TRANSITION.

### Common stream (Steps 1-5, all phases)

| Step | Fields | Notes |
|---|---|---|
| 1. Profile | age, sex, prov, couple | Same as essentiel |
| 2. Spouse (if couple) | See full spouse table below | **Full modeling — no heuristics** |
| 3. Income & work | income, employer, retAge, parttime/amount/years | Decum: income=0, retAge=age, no parttime |
| 4. Savings | rrsp, tfsa, nr, lira (optional), monthlyContrib | Decum: explicit balances, no monthlyContrib |
| 5a. Property | homeowner -> homeValue, mortgage, mortgageRate, mortgageAmort | Primary residence |
| 5b. Rental (conditional) | hasRental -> up to 2 properties: value, mortgage, mortgageRate, mortgageAmort, rentalIncome, expenses | Show only if hasRental=yes |
| 5c. Debt | hasDebts -> debts[{type, amount, rate, minPayment}] | Same as current |

### Step 2: Full Spouse Fields (when couple=yes)

No heuristics. Every param is explicitly asked or derived from explicit input.

| Field | Type | Maps to MC param | Notes |
|---|---|---|---|
| cAge | number | cAge | Spouse age |
| cSex | select | cSex | M/F — affects mortality tables |
| cRetAge | number | cRetAge | Spouse retirement age |
| cIncome | number | cIncome | Spouse current gross income |
| cRrsp | number | cRRSP | Spouse RRSP balance |
| cTfsa | number | cTFSA | Spouse TFSA balance |
| cNr | number | cNR | Spouse non-registered balance |
| cLira | number (optional) | cLiraBal | Spouse LIRA if applicable |
| cMonthlyContrib | number | cMonthlyContrib | Spouse monthly savings contribution |
| cPenType | select (none/db/dc) | cPenType | Spouse pension type |
| cPenM | number (if db/dc) | cPenM | Spouse pension monthly amount (DB) or balance (DC) |
| cPenIdx | select (none/partial/full) | cPenIdx | Spouse pension indexation |
| cQppAge | number | cQppAge | Spouse planned CPP/QPP claim age |
| cOasAge | number | cOasAge | Spouse planned OAS claim age |
| pensionSplitting | toggle | split | Enable income/pension splitting |

**15 fields for spouse.** UX: show as 2 sub-screens (2a: profile + income + savings, 2b: pension + government).

### Quiz field counts (updated with full couple + properties)

| Phase | Common (single) | Couple add | Rental add | Adaptive | Total (single) | Total (couple + 2 rentals) |
|---|---|---|---|---|---|---|
| ACCUM | 22 | +15 | +12 | 10 | 32 | 59 |
| TRANSITION | 22 | +15 | +12 | 14 | 36 | 63 |
| DECUM | 22 | +15 | +12 | 16 | 38 | 65 |

**Worst case: 65 fields (couple + 2 rentals + DECUM).** But most fields are numbers in grouped forms — realistic at ~9-10 min.

**Typical case: ~40-45 fields** (single or couple without rentals) at ~7-8 min.

### Quiz timing budget

| Scenario | Fields | Time |
|---|---|---|
| Single, no rental, ACCUM | 32 | ~5 min |
| Single, no rental, DECUM | 38 | ~6 min |
| Couple, no rental, ACCUM | 47 | ~7 min |
| Couple, no rental, TRANS | 51 | ~8 min |
| Couple, 2 rentals, TRANS (max) | 63 | ~10 min |

10 minutes worst case. Acceptable for $19.99.

### Accumulation segment (Steps 6-8)

| Step | Fields | Notes |
|---|---|---|
| 6. Retirement goals | lifestyle (cozy/active/premium), risk tolerance | Maps to retSpM + allocR |
| 7. Psychology | psychAnxiety, psychDiscipline, psychLiteracy | Voice matrix input |
| 8. Priorities | worries (chips), win, fix | AI narrative input |

**~10 fields**. ~3 minutes.

### Transition segment (Steps 6-9)

Same as Accumulation PLUS:

| Step | Fields | Notes |
|---|---|---|
| 9. Near-retirement | qppAge (planned), pensionType, pensionAmount, spendingFlex | Borrows from Decum |

**~14 fields**. ~4 minutes.

### Decumulation segment (Steps 6-8)

| Step | Fields | Notes |
|---|---|---|
| 6. Retirement income | retirementStatus, retIncome, hasPension, penMonthly, penIndexed | Current spending + pension |
| 7. Government benefits | qppAlreadyClaiming, qppMonthly/qppPlannedAge, oasAlreadyClaiming, oasMonthly/oasPlannedAge | Claim status |
| 8. Strategy & psychology | spendingFlex, estatePref, psychAnxiety, psychLiteracy, worries | GK + meltdown + voice |

**~16 fields**. ~3 minutes.

---

## DA-03: Template Strategy — Single Adaptive Renderer

**Decision: ONE renderer** (`lib/report-html-360.js`) with conditional sections.
**Structure: Isolated section functions** called by an orchestrator.

```javascript
// Section renderers (isolated, testable, ~50-100 lines each)
function renderDecisionCard(D, ai, phase, lang) { ... }
function renderMirrorBlock(D, lang) { ... }
function renderRevenueAnalysis(D, ai, phase, lang) { ... }
function renderCPPTiming(D, cppTimingResults, ai, lang) { ... }
function renderMeltdown(D, meltdownResults, ai, lang) { ... }
function renderWhatIf(D, whatIfResults, ai, lang) { ... }
function renderStrategies(D, strategyResults, ai, lang) { ... }
function renderCoupleAnalysis(D, ai, lang) { ... }
function renderPropertySection(D, lang) { ... }
// ... etc

// Main renderer — orchestrator only
function renderReport360(D, mc, quiz, lang, ai, phase, extraResults) {
  const sections = getSectionOrder(phase); // returns ordered array per phase
  let html = renderHeader(D, lang);
  for (const section of sections) {
    html += sectionRenderers[section](D, ai, phase, lang, extraResults);
  }
  html += renderFooter(D, lang);
  return html;
}
```

### Section ordering by phase

**ACCUMULATION** (18 sections):
1. Decision card (grade, risk, lever, interpretation)
2. Mirror block ("Your situation in 30 seconds")
3. Reading guide (MC explanation)
4. Revenue & income analysis
5. Savings & portfolio
6. Government income projection
7. Longevity & projection (fan chart)
8. 5-year snapshot table
9. What-if scenarios (smart branching)
10. 5-strategy comparison
11. Priority actions
12. Tax snapshot
13. Fees & cost of delay
14. Couple analysis (if couple)
15. Succession / estate
16. Observations (AI, 3-5 slots)
17. Methodology & assumptions
18. CTAs + disclaimers + footer

**TRANSITION** (22 sections):
1. Decision card
2. Mirror block
3. Reading guide
4. Revenue & income analysis
5. Government income (QPP/OAS/pension) — elevated priority
6. CPP/QPP timing comparison — key for this phase
7. Savings & portfolio
8. Longevity & projection
9. 5-year snapshot table
10. Spending flexibility (GK analysis)
11. What-if scenarios
12. 5-strategy comparison
13. Sequence risk
14. Priority actions
15. Tax snapshot
16. Fees & cost of delay
17. Couple analysis (if couple)
18. Strengths & identified risks
19. Succession / estate
20. Observations (AI, 3-5 slots)
21. Methodology & assumptions
22. CTAs + disclaimers + footer

**DECUMULATION** (19 sections):
1. Decision card
2. Mirror block
3. Reading guide
4. Revenue & income — DOMINANT section for retirees
5. Government income (current + projected)
6. CPP/QPP timing comparison
7. Spending flexibility (GK analysis)
8. Meltdown scenarios
9. Sequence risk
10. Longevity & projection
11. 5-year snapshot table
12. Strengths & identified risks
13. Priority actions
14. Tax snapshot
15. Couple analysis (if couple)
16. Succession / estate
17. Observations (AI)
18. Methodology & assumptions
19. CTAs + disclaimers + footer

**Key difference:** DECUM puts Revenue and Government Income at positions 4-5 (before projection).
For retirees, "how much do I live on?" comes before "how long does my money last?".

---

## DA-04: Unified Translator — quiz-translator-360.ts

One translator, three internal paths.

```typescript
export function translateBilan360(quiz: QuizAnswers360): MCParams {
  const phase = determinePhase(quiz);  // DA-01 logic

  // Common params (all phases)
  const base = buildBaseParams(quiz);   // age, sex, prov, savings, debt, home, rentals

  // Couple params (if couple=yes — full modeling)
  const couple = quiz.couple ? buildCoupleParams(quiz) : {};

  // Phase-specific params
  switch (phase) {
    case 'accum':
      return { ...base, ...couple, ...buildAccumParams(quiz) };
    case 'transition':
      return { ...base, ...couple, ...buildTransitionParams(quiz) };
    case 'decum':
      return { ...base, ...couple, ...buildDecumParams(quiz) };
  }
}
```

### Couple params (explicit — no heuristics)

```typescript
function buildCoupleParams(quiz: QuizAnswers360) {
  return {
    cOn: true,
    cAge: quiz.cAge,
    cSex: quiz.cSex,
    cDeath: quiz.cSex === 'M' ? 90 : 92,  // only heuristic: death age from sex
    cRetAge: quiz.cRetAge,
    cIncome: quiz.cIncome || 0,
    cRRSP: quiz.cRrsp || 0,
    cTFSA: quiz.cTfsa || 0,
    cNR: quiz.cNr || 0,
    cLiraBal: quiz.cLira || 0,
    cMonthlyContrib: quiz.cMonthlyContrib || 0,
    cPenType: quiz.cPenType || 'none',       // none | db | dc
    cPenM: quiz.cPenM || 0,
    cPenIdx: quiz.cPenIdx === 'full' ? 2 : quiz.cPenIdx === 'partial' ? 1 : 0,
    cQppAge: quiz.cQppAge,                    // explicit, not derived
    cOasAge: quiz.cOasAge,                    // explicit, not derived
    split: quiz.pensionSplitting ?? true,     // income/pension splitting
  };
}
```

### Property params

```typescript
function buildPropertyParams(quiz: QuizAnswers360) {
  const props = [];
  if (quiz.homeowner) {
    props.push({
      on: true, name: "Residence", pri: true,
      val: quiz.homeValue, mb: quiz.mortgage,
      mr: quiz.mortgageRate / 100, ma: quiz.mortgageAmort
    });
  }
  if (quiz.hasRental && quiz.rentals) {
    for (let i = 0; i < Math.min(quiz.rentals.length, 2); i++) {
      const r = quiz.rentals[i];
      props.push({
        on: true, name: `Locatif ${i+1}`, pri: false,
        val: r.value, mb: r.mortgage,
        mr: r.mortgageRate / 100, ma: r.mortgageAmort,
        rm: r.rentalIncome * 12, ox: r.expenses * 12
      });
    }
  }
  return { props };
}
```

### Engine feature flags by phase

| Feature | ACCUM | TRANS | DECUM |
|---|---|---|---|
| fatT (fat tails) | true | true | true |
| stochMort | true | true | true |
| glide (glide path) | true | true | false |
| gkOn (Guyton-Klinger) | false | conditional | conditional |
| melt (RRSP meltdown) | false | conditional | conditional |
| deathAge | 93 | 100 | 105 |
| goP/slP/noP (smile) | 1.05/0.88/0.75 | 1.05/0.88/0.75 | 1.02/0.85/0.70 |
| cOn (couple) | if couple | if couple | if couple |

**Key difference from Bilan $9.99**: Bilan 360 ALWAYS uses fat tails + stochastic mortality + full couple.

---

## DA-05: MC Execution Strategy

### Webhook compute budget (updated for couple)

Vercel timeout: 120s. Target: < 45s for worst case.

| Phase | Single MC | Couple MC | Extra runs | AI (Opus) | Total single | Total couple |
|---|---|---|---|---|---|---|
| ACCUM | ~3s | ~5s | ~4s (strat+whatif) | ~20s | ~28s | ~30s |
| TRANS | ~3s | ~5s | ~6s (strat+whatif+CPP) | ~20s | ~30s | ~32s |
| DECUM | ~3s | ~5s | ~3s (melt+CPP) | ~20s | ~27s | ~29s |

All within 120s budget. Couple adds ~2s per MC run.

### Parallelization

```
[baseline 5K] -> [extract D] -> parallel([extra MC runs], [Opus AI call]) -> [render]
```

Cuts ~5-7s off the critical path.

---

## DA-06: AI Prompt Architecture

### One mega-prompt per phase

```
buildAIPrompt360Accum(D, params, quiz, whatIf, strategies)
buildAIPrompt360Trans(D, params, quiz, whatIf, strategies, cppTiming)
buildAIPrompt360Decum(D, params, quiz, meltdown, cppTiming)
```

### Shared infrastructure (from Bilan v7)

All three prompt builders use:
- Voice matrix (9 combos: tone x literacy)
- Narrative arc (4 themes: security/growth/optimization/catch-up)
- Thread classification (6 keywords per phase — different keywords)
- Composite signals (surfaced explicitly in sys prompt)
- SAFE_DISCLAIMER_PATTERNS compliance
- Per-slot hints with data references

### Thread keywords per phase

| Phase | Thread keywords |
|---|---|
| ACCUM | debt-drag, time-leverage, savings-momentum, gap-structural, fee-erosion, optimization-fiscal |
| TRANS | bridge-risk, timing-critical, meltdown-window, pension-integration, couple-coordination, catch-up-viable |
| DECUM | withdrawal-pressure, longevity-fear, tax-optimization, sequence-vulnerability, estate-priority, income-sufficiency |

### AI slots per phase

**ACCUM** (14 slots):
thread, grade_diagnostic, biggest_risk, best_lever, snapshot_intro,
projection_good, projection_watch, income_analysis, savings_analysis,
debt_analysis, priority_rationale, whatif_interpretation, tax_fees_insight, closing_observation

**TRANS** (16 slots):
thread, grade_diagnostic, biggest_risk, best_lever, snapshot_intro,
projection_good, projection_watch, income_analysis, savings_analysis,
bridge_analysis, cpp_timing_insight, spending_flex_context,
priority_rationale, whatif_interpretation, tax_fees_insight, closing_observation

**DECUM** (14 slots):
thread, grade_diagnostic, biggest_risk, best_lever, snapshot_intro,
longevity_context, spending_flex_obs, income_mix_obs, tax_timing_obs,
meltdown_obs, cpp_timing_obs, sequence_obs, estate_obs, closing_observation

---

## DA-07: CTA Strategy (P1)

### In-report CTAs (bottom of report, before disclaimers)

1. **Laboratoire CTA** (always):
   "Explorez vos decisions avec le simulateur interactif — 190+ parametres, scenarios illimites."
   Link to /laboratoire landing.

2. **Referral CTA** (always):
   "Connaissez-vous quelqu'un qui planifie sa retraite?"
   Share link to buildfi.ca.

3. **Annual check-in CTA** (always):
   "Revenez dans 12 mois pour voir l'evolution de votre plan."

**Why P1**: Referral is the cheapest acquisition channel. Every report delivered is a distribution opportunity.

---

## DA-08: Migration Path

| Current | Action |
|---|---|
| quiz-essentiel.html | **KEEP** — serves Bilan $9.99 |
| quiz-intermediaire.html | **DEPRECATED** — replaced by Bilan 360 |
| quiz-decaissement.html | **DEPRECATED** — replaced by Bilan 360 |
| report-html.js (v7) | **KEEP** — serves Bilan $9.99 |
| report-html-inter.js | **REFERENCE** — logic ported to report-html-360.js |
| report-html-decum.js | **REFERENCE** — logic ported to report-html-360.js |
| quiz-translator.ts | **KEEP** — serves Bilan |
| quiz-translator-inter.ts | **REFERENCE** — logic ported to quiz-translator-360.ts |
| quiz-translator-decum.ts | **REFERENCE** — logic ported to quiz-translator-360.ts |
| ai-prompt-inter.ts | **REFERENCE** — logic ported to ai-prompt-360.ts |
| ai-prompt-decum.ts | **REFERENCE** — logic ported to ai-prompt-360.ts |

Stripe: Add `STRIPE_PRICE_BILAN360` at $19.99. Keep existing Bilan $9.99 price.
Landing: Show Bilan ($9.99) + Bilan 360 ($19.99) + Laboratoire ($49.99). Remove Inter + Decum cards.

---

## DA-09: What Stays in Laboratoire Only

| Feature | Fields | Why Lab-only |
|---|---|---|
| CCPC/Business | 12 fields | Requires accounting knowledge |
| IPP | 2 fields | Rare, niche |
| FHSA details | 4 fields | New account, low adoption |
| HELOC/Smith maneuver | 4 fields | Advanced strategy |
| Life insurance | 4 fields | Needs policy documents |
| Custom allocation % | 1 field | Risk presets sufficient for $19.99 |
| Custom spending amount | 1 field | Lifestyle presets work |
| DPA accumulation | 2 fields | Rare, needs tax docs |
| 3+ rental properties | n fields | Bilan 360 caps at 2 |
| Private equity / mortgage | specialized | Edge case |

---

## DA-10: Execution Phases

### Phase 1: Foundation (quiz + translator + webhook routing)
- [ ] Create `public/quiz-360.html` (adaptive quiz with routing + full couple)
- [ ] Create `lib/quiz-translator-360.ts` (unified translator, 3 paths, full couple params)
- [ ] Add `bilan360` branch to webhook with phase detection
- [ ] Create Stripe price `STRIPE_PRICE_BILAN360`
- [ ] Wire checkout for type=bilan360

### Phase 2: Renderer (single adaptive template)
- [ ] Create `lib/report-html-360.js` (adaptive renderer with isolated section functions)
- [ ] Port v7 decision card + mirror block + reading guide
- [ ] Port Inter strategies section (accum + transition)
- [ ] Port Decum meltdown + CPP timing + sequence risk sections (transition + decum)
- [ ] Port v7 what-if (accum + transition)
- [ ] Shared sections: savings, income, gov, tax, longevity, snapshot, methodology
- [ ] Conditional sections: couple, estate, fees, strengths/risks, property/rental
- [ ] Section ordering per phase (DA-03)

### Phase 3: AI narration (Opus prompts)
- [ ] Create `lib/ai-prompt-360.ts` with 3 prompt builders
- [ ] Thread classification per phase (6 keywords each)
- [ ] Voice matrix + narrative arcs (from v7)
- [ ] Composite signals surfaced in sys prompt
- [ ] Add slots to ai-constants.ts (AI_SLOTS_360_ACCUM, _TRANS, _DECUM)
- [ ] Sanitizer functions
- [ ] Test: 5 profiles per phase with real Opus

### Phase 4: CTAs + integration (P1)
- [ ] Lab CTA in report
- [ ] Referral block in report
- [ ] Annual check-in CTA
- [ ] Email template for Bilan 360 delivery
- [ ] /merci page for bilan360 tier
- [ ] Landing page update (replace Inter + Decum with Bilan 360)

### Phase 5: QA + launch
- [ ] FR/EN parity check
- [ ] AMF compliance grep (zero violations)
- [ ] AI-on and AI-off rendering for all 3 phases
- [ ] 15 diverse profiles (5 per phase) with real Opus
- [ ] Couple profiles tested across all 3 phases
- [ ] Visual consistency check vs Bilan report
- [ ] Performance budget verification (< 45s worst case)
- [ ] Rental property rendering verified
