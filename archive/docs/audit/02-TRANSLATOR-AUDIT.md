# 02 — Translator Audit

## Purpose

Translators convert quiz answers (user-friendly JSON) into MC engine parameters (technical simulation inputs). Each tier has a dedicated translator. They run server-side only, inside the webhook handler.

## Translator Inventory

### Essentiel — `lib/quiz-translator.ts` (~219 lines)

**Input**: ~28 quiz fields
**Output**: ~55 MC parameters
**Key transformations**:
- **Savings split heuristic**: Age-based allocation between RRSP/TFSA/NR when user gives a single number
- **RRSP-first logic**: When marginal tax rate ≥ 33%, prioritize RRSP contributions
- **QPP/OAS timing**: Heuristic based on health expectancy + financial need
- **Debt amortization**: Converts debt (balance, rate, payment) into annual cash flow drag
- **Risk → allocation**: Maps 1-5 risk scale to equity/bond split (e.g., 3 → 60/40)
- **retSpM**: Monthly retirement spending (engine uses monthly, quiz asks annual)

---

### Intermédiaire — `lib/quiz-translator-inter.ts` (~314 lines)

**Input**: ~85 quiz fields
**Output**: ~120 MC parameters
**Key transformations**:
- **Couple split**: Separates main + partner into dual-track MC (parallel retirement timelines)
- **CCPC modeling**: Salary vs dividend bifurcation, corporate investment treatment, retained earnings drawdown
- **Real estate**: Up to 3 properties → rental income, mortgage amortization, capital gains on sale
- **Tax-driven strategy**: Optimal RRSP/TFSA split based on couple's marginal rate differential
- **Pension DB**: Converts pension details into guaranteed income stream (indexed or nominal)
- **Insurance**: Life/disability coverage → estate and income replacement modeling
- **Succession**: Estate target → influences withdrawal aggressiveness

---

### Décaissement — `lib/quiz-translator-decum.ts` (~447 lines)

**Input**: ~40 quiz fields
**Output**: ~90 MC parameters
**Key transformations**:
- **Continuous QPP factor**: `factor = age < 65 ? 1 - (65 - age) * 0.072 : 1 + (age - 65) * 0.084` — NOT a 3-entry lookup
- **cQppAge**: Computed from quiz's desired CPP start age
- **cDeath: 105**: Hard cap (stochastic mortality CPM-2023 terminates sims earlier, but 105 is the absolute ceiling)
- **GK flexibility**: Maps spending flexibility answer to `gkMaxCut` (rigid: gkOn=false, moderate: 0.20, flexible: 0.25)
- **eqVol / bndVol**: Equity and bond volatility derived from allocation choice
- **retIncome at root**: Annual retirement income placed at root level (not nested)
- **6 MC run parameters**: Base (5000 sims) + 2 meltdown scenarios (year 1, year 5 @ 1000 each) + 3 CPP timing variants (age 60/65/70 @ 1000 each)

**Critical pitfalls**:
- `retSpM` (monthly) vs `retIncome` (annual) — engine uses retSpM
- `deathAge:105` not 93/95 (those are stochMort medians, not caps)
- Duplicate object properties in TypeScript cause compile errors

---

### Expert — `lib/quiz-translator-expert.ts` (~468 lines)

**Input**: Simulator form data (500+ adjustable parameters)
**Output**: ~150+ MC parameters
**Key transformations**:
- **Tab-driven structure**: Parameters organized by simulator tabs (Income, Savings, Debt, Real Estate, Couple, Tax, Retirement)
- **Scenario mode**: Handles baseline vs modified scenario comparison
- **Segment defaults**: Pre-fills based on detected segment (Couple/CCPC/Pre-retraite/FIRE)
- **Recalc caching**: Tracks which parameters changed since last simulation
- **Screening vs formal**: 1,000 sims for interactive screening, 5,000 for formal AI export

**Test coverage**: 87 tests in `tests/quiz-translator-expert.test.ts`

---

## Common Patterns

All translators:
1. Attach `_quiz` (raw quiz answers) and `_report` (report metadata) to output for downstream use by AI prompts and report renderers
2. Never called client-side
3. Return a flat object consumed by `runMC(params, sims)`
4. Handle missing/optional fields with sensible defaults
5. Validate numeric ranges (negative income → 0, age bounds, etc.)

## Audit Checklist

- [ ] QPP factor uses continuous formula (not 3-entry lookup) in decum translator
- [ ] All translators handle missing optional fields without crashing
- [ ] retSpM computed correctly (annual ÷ 12)
- [ ] Risk tolerance mapped to valid equity/bond allocations
- [ ] Couple translator doesn't double-count shared assets
- [ ] CCPC translator correctly bifurcates salary vs dividend streams
- [ ] Expert translator preserves scenario comparison state across recalcs
- [ ] No translator exposes internal engine parameter names to client

## Key Files

| File | Lines | Tests |
|------|-------|-------|
| `lib/quiz-translator.ts` | 219 | (covered by report-calculations tests) |
| `lib/quiz-translator-inter.ts` | 314 | (covered by report-inter-calculations tests) |
| `lib/quiz-translator-decum.ts` | 447 | (deferred — not blocking launch) |
| `lib/quiz-translator-expert.ts` | 468 | 87 tests |
