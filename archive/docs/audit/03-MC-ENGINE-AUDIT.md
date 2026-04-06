# 03 — Monte Carlo Engine Audit

## Source of Truth

| File | Lines | Role |
|------|-------|------|
| `planner.html` | 15,628 | **Definitive source** — interactive UI with 453 embedded tests |
| `lib/engine/index.js` | 2,438 | **Production mirror** — must match planner.html exactly |

**Rule**: If a bug is found, fix BOTH files. planner.html is always authoritative.

## Engine Specifications

| Parameter | Value |
|-----------|-------|
| Simulation count (formal) | 5,000 |
| Simulation count (screening) | 1,000 |
| Distribution | t-Student, df=5 (fat tails) |
| Mortality model | CPM-2023 stochastic (Canadian Pensioners Mortality) |
| Death age cap | 105 (hard ceiling) |
| Tax model | Federal + provincial, line-by-line, 13 jurisdictions |
| Tax year | 2026 brackets |
| Inflation model | Stochastic (mean ~2%, vol ~1.2%) |
| Return model | Geometric Brownian Motion with t-Student shocks |

## Key Exports (~38 total)

### Primary

| Export | Purpose |
|--------|---------|
| `runMC(params, sims)` | Main simulation entry point → returns full MC result object |
| `extractReportData(mc, params)` | Extracts structured data for report rendering |
| `calcTax(income, province, year)` | Line-by-line tax calculation |
| `calcQPP(age, startAge, ympe)` | QPP/CPP benefit calculation |
| `calcOAS(age, income)` | OAS benefit with clawback |
| `calcGIS(income, maritalStatus)` | GIS benefit calculation |
| `calcRRIF(age, balance)` | Minimum RRIF withdrawal |

### MC Result Object

```javascript
{
  succ,          // Success rate (0-1) — % of sims where money lasts
  medF,          // Median final nominal wealth
  rMedF,         // Median final REAL wealth (display this, not medF)
  medRevData,    // Median revenue data year-by-year
  p10, p25, p50, p75, p90,  // Percentile trajectories
  failAge,       // Median age of ruin in failed sims
  taxPaid,       // Total lifetime tax paid (median)
  oasClawback,   // OAS clawback amount (median)
  ...
}
```

## Simulation Loop (Simplified)

```
For each sim (1..5000):
  1. Generate stochastic returns (t-Student, df=5)
  2. Generate stochastic inflation
  3. Generate stochastic mortality (CPM-2023)
  4. For each year (currentAge..deathAge):
     a. Calculate employment income (if working)
     b. Calculate government benefits (QPP, OAS, GIS)
     c. Calculate pension DB income
     d. Calculate required withdrawals (RRIF minimums)
     e. Determine optimal withdrawal order (TFSA last)
     f. Calculate taxes (federal + provincial, line-by-line)
     g. Apply spending (retSpM × 12, adjusted for inflation)
     h. Apply GK flexibility (reduce spending if portfolio stressed)
     i. Update account balances
     j. Check if ruin (all accounts depleted)
  5. Record outcome (success/fail, final wealth, revenue trajectory)
Aggregate across all sims → percentiles, success rate, medians
```

## Tax Engine Detail

- **Federal brackets**: 5 brackets (15%, 20.5%, 26%, 29%, 33%)
- **Provincial brackets**: Per-jurisdiction (10 provinces + 3 territories)
- **Credits modeled**: Basic personal, age credit, pension income, spousal, disability
- **Clawbacks**: OAS (threshold-based), GIS (income-tested)
- **Splitting**: Pension income splitting (eligible pension, age 65+)
- **RRSP deduction**: Contribution room tracking, carry-forward
- **Capital gains**: 50% inclusion rate (current law)
- **Dividend tax credit**: Eligible vs non-eligible gross-up

## Withdrawal Order Logic

Default optimal order (can be overridden):
1. Non-registered (taxed at capital gains rate)
2. RRSP/RRIF (fully taxable, RRIF minimums enforced)
3. TFSA (tax-free, preserved as long as possible)
4. LIF (locked-in, min/max withdrawal rules)

## GK Flexibility (Guardrail-Klinger)

When portfolio drops below target:
- **Rigid** (gkOn: false): No spending adjustment
- **Moderate** (gkMaxCut: 0.20): Cut spending up to 20%
- **Flexible** (gkMaxCut: 0.25): Cut spending up to 25%

Spending recovers when portfolio recovers above threshold.

## Décaissement-Specific: 6 MC Runs

| Run | Sims | Purpose |
|-----|------|---------|
| Base | 5,000 | Standard trajectory with user's chosen parameters |
| Meltdown Year 1 | 1,000 | -30% equity return in year 1 of retirement |
| Meltdown Year 5 | 1,000 | -30% equity return in year 5 of retirement |
| CPP at 60 | 1,000 | QPP/CPP claimed at age 60 (early, reduced) |
| CPP at 65 | 1,000 | QPP/CPP claimed at age 65 (standard) |
| CPP at 70 | 1,000 | QPP/CPP claimed at age 70 (deferred, enhanced) |

## Test Coverage

| Suite | Tests | File |
|-------|-------|------|
| Engine core | 453 (54 categories) | `planner.html` (embedded) |
| Report calculations | ~varies | `tests/report-calculations.test.js` |
| Inter calculations | ~varies | `tests/report-inter-calculations.test.js` |
| Constants drift | ~varies | `tests/constants-drift.test.js` |
| Fiscal sync | ~varies | `tests/fiscal-constants-sync.test.ts` |

**Zero failures required** before any commit.

## Audit Checklist

- [ ] planner.html and engine/index.js produce identical outputs for same inputs
- [ ] 453/453 engine tests pass
- [ ] t-Student df=5 correctly implemented (not normal distribution)
- [ ] CPM-2023 mortality tables correctly loaded
- [ ] Tax brackets match 2026 CRA published rates
- [ ] OAS clawback threshold correct for 2026
- [ ] QPP/CPP maximum pensionable earnings correct for 2026
- [ ] RRIF minimum withdrawal percentages correct
- [ ] GK flexibility correctly reduces/restores spending
- [ ] Inflation model produces reasonable distribution (~2% mean)
- [ ] Real vs nominal wealth correctly distinguished (rMedF vs medF)
- [ ] Engine never runs client-side (server-only enforcement)
