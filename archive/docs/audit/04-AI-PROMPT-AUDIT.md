# 04 — AI Prompt Audit

## Architecture

AI narration is generated server-side via Anthropic API (claude-sonnet-4). The webhook calls tier-specific prompt builders that produce `{system, user}` message pairs. The AI response is parsed into named slots, sanitized, then injected into the report HTML.

**Fallback**: If Anthropic API fails or key is missing, all reports render with static fallback text. Reports must work without AI.

## Component Map

| File | Lines | Purpose |
|------|-------|---------|
| `lib/ai-profile.ts` | 296 | DerivedProfile computation (behavioral signals) |
| `lib/ai-constants.ts` | 258 | Slot names, forbidden terms, sanitizer functions |
| `lib/ai-prompt-inter.ts` | 474 | Intermédiaire prompt builder |
| `lib/ai-prompt-decum.ts` | 445 | Décaissement prompt builder |
| `lib/ai-prompt-expert.ts` | 206 | Expert prompt builder |
| `lib/report-html.js` | (within) | Essentiel prompt builder (`buildAIPrompt()`) |

## DerivedProfile (ai-profile.ts)

Computed from quiz answers + MC results. Feeds into all tier prompts.

### 8 Composite Signals

| Signal | Derivation | Values |
|--------|-----------|--------|
| `anxiety` | Debt ratio, success rate, age proximity to retirement | low / medium / high |
| `discipline` | Savings rate, contribution consistency, debt management | low / medium / high |
| `literacy` | Detail preference, quiz completion patterns, term familiarity | low / medium / high |
| `complexity` | Number of active accounts, couple, CCPC, real estate, multi-pension | low / medium / high |
| `friction` | Gap between current behavior and optimal path | low / medium / high |
| `riskMismatch` | Stated risk tolerance vs actual portfolio allocation | none / mild / severe |
| `narrativeTheme` | Primary story arc based on situation | security / growth / optimization / caution |
| `profileType` | Combined archetype label | e.g., "anxious-disciplined-literate" |

### 13 Behavioral Signals (CompositeSignals)

- Debt drag, mortgage in retirement, bridge period, couple asymmetry
- RRSP overweight, TFSA underused, OAS clawback risk
- Sequence-of-returns vulnerability, longevity risk, tax inefficiency
- Insurance gap, estate shortfall, FIRE feasibility

## Voice Matrix (9 Combos)

Used by Intermédiaire and Décaissement prompts. Combines 3 axes:

| Axis | Low | Medium | High |
|------|-----|--------|------|
| Anxiety | Calm, factual | Reassuring, structured | Empathetic, stabilizing |
| Discipline | Motivating, concrete | Affirming, strategic | Challenging, growth-oriented |
| Literacy | Plain language, analogies | Standard financial terms | Technical, data-dense |

**3 × 3 = 9 voice combinations**, each producing distinct tone instructions in the system prompt.

## Slot Systems

### Essentiel (13 slots)

Defined in `AI_SLOTS` (ai-constants.ts):
```
snapshot_intro, objectif, savings_context, income_mix,
tax_context, longevity_risk, sequence_risk, benchmark_context,
obs_1, obs_2, obs_3, obs_4, obs_5
```

### Intermédiaire (17 slots)

Defined in `AI_SLOTS_INTER`:
```
snapshot_intro, objectif, savings_context, income_mix,
tax_context, longevity_risk, sequence_risk, benchmark_context,
obs_1, obs_2, obs_3, obs_4, obs_5,
priority_actions, strategy_highlight, couple_analysis, ccpc_context
```

### Décaissement (12 slots)

Defined in `AI_SLOTS_DECUM`:
```
snapshot_intro, longevity_context, spending_flex_obs,
income_mix_obs, tax_timing_obs, meltdown_obs,
cpp_timing_obs, sequence_obs, estate_obs,
obs_1, obs_2, obs_3
```

### Expert (variable)

9 base sections + 10 conditional + 5 exclusive, gated by profile characteristics.

## Narrative Arcs

### Décaissement — 4 arcs

| Arc | Trigger | Tone |
|-----|---------|------|
| Sustainability | Success rate < 70% | "Your plan needs structural changes to be sustainable" |
| Resilience | Meltdown sensitivity high | "The plan works on average but is vulnerable to early shocks" |
| Optimization | Success > 85%, tax inefficiency detected | "Solid foundation — refinements could improve outcomes" |
| Caution | Success > 90%, low complexity | "Strong position — maintain current trajectory" |

### 7 Worry Patterns (Décaissement)

Dynamic routing for obs_1/obs_2/obs_3 based on which concerns dominate:
1. Longevity + spending → sustainability focus
2. Meltdown + sequence → resilience focus
3. CPP timing + tax → optimization focus
4. Estate + legacy → succession focus
5. Spending flex + income gap → flexibility focus
6. All concerns moderate → balanced overview
7. No major concerns → affirmation + minor refinements

## Forbidden Terms (AMF/OSFI Compliance)

Defined in `ai-constants.ts` — 48 terms regex:

**Never use in AI output**:
- devriez, recommandons, conseillons, il faut, devez
- assurez-vous, considérez, optimisez, priorisez
- plan d'action, recommandation(s)
- should, recommend, must, need to, have to, make sure

**Approved replacements**:
- "Cette analyse suggère" / "This analysis suggests"
- "Les données indiquent" / "The data indicates"
- "Il serait parfois pertinent de" / "It could sometimes be relevant to"

## Sanitization Pipeline

```
AI raw output (string)
  → Parse into named slots (regex extraction)
  → sanitizeAISlots*(slots)
    → Strip HTML tags
    → Enforce max length per slot (500-2000 chars)
    → Apply FORBIDDEN_TERMS regex → replace violations
    → Validate slot names against allowed list
  → Clean slots object → report renderer
```

## Audit Checklist

- [ ] All prompts use conditional tense for projections
- [ ] FORBIDDEN_TERMS regex catches all 48 terms
- [ ] Sanitizer strips HTML from AI output
- [ ] Max length enforced per slot (no overflow in report layout)
- [ ] Static fallbacks exist for every slot in every tier
- [ ] DerivedProfile handles edge cases (zero income, no savings, single vs couple)
- [ ] Voice matrix produces appropriate tone for all 9 combinations
- [ ] AI model is claude-sonnet-4 (not exposed to client)
- [ ] ANTHROPIC_API_KEY only in Vercel env vars, never client-side
- [ ] Narrative arc selection is deterministic (same inputs → same arc)
