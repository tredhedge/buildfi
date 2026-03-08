# 10 — Test Coverage Audit

## Test Suites Overview

| Suite | File | Tests | Framework | Command |
|-------|------|-------|-----------|---------|
| Engine core | `planner.html` (embedded) | 453 (54 categories) | Custom | Open in browser |
| Debt tool | `tests/debt-tool-tests.js` | 200 | Custom (Node) | `node tests/debt-tool-tests.js` |
| Expert infra (S1) | `tests/s1-infrastructure.test.ts` | 29 | Jest | `npx jest tests/s1-infrastructure.test.ts` |
| Expert translator | `tests/quiz-translator-expert.test.ts` | 87 | Jest | `npx jest tests/quiz-translator-expert.test.ts` |
| Expert API (S3) | `tests/s3-api.test.ts` | 103 | Jest | `npx jest tests/s3-api.test.ts` |
| Expert audit (S10) | `tests/s10-audit.test.ts` | 91 | Jest | `npx jest tests/s10-audit.test.ts` |
| Report calculations | `tests/report-calculations.test.js` | varies | Custom | `node tests/report-calculations.test.js` |
| Inter calculations | `tests/report-inter-calculations.test.js` | varies | Custom | `node tests/report-inter-calculations.test.js` |
| Report shared | `tests/report-shared.test.ts` | varies | Jest | `npx jest tests/report-shared.test.ts` |
| Report validation | `tests/report-validation.js` | varies | Custom | `node tests/report-validation.js` |
| Constants drift | `tests/constants-drift.test.js` | varies | Custom | `node tests/constants-drift.test.js` |
| Fiscal sync | `tests/fiscal-constants-sync.test.ts` | varies | Jest | `npx jest tests/fiscal-constants-sync.test.ts` |

**Total**: 1,600+ tests across all suites

## Required Before Every Commit

```bash
# Minimum gate (mandatory)
node tests/debt-tool-tests.js              # 200/200
npm run build                              # Compile check

# AMF compliance (zero tolerance)
grep -rn "devriez\|recommandons\|vous devez\|il faut que" lib/ public/
# Must return 0 results
```

## Required Before Deployment

```bash
# All of the above, plus:
npx jest tests/s1-infrastructure.test.ts   # 29/29
npx jest tests/s3-api.test.ts              # 103/103
npx jest tests/s10-audit.test.ts           # 91/91
npx jest tests/quiz-translator-expert.test.ts  # 87/87
```

## Test Categories

### Engine (453 tests, 54 categories)
- Tax calculation (federal + 13 jurisdictions)
- QPP/CPP benefit calculation (early, standard, deferred)
- OAS + GIS calculation (clawback thresholds)
- RRIF minimum withdrawals (age-based percentages)
- Withdrawal order logic (optimal sequence)
- Stochastic mortality (CPM-2023 survival curves)
- Inflation modeling (mean reversion, volatility)
- GK flexibility (spending adjustment triggers)
- Couple modeling (income splitting, survivor benefits)
- CCPC (salary/dividend optimization, corporate drawdown)

### Debt Tool (200 tests)
- Minimum payment scenarios
- Overpayment allocation (avalanche, snowball)
- Multiple debt interactions
- Mortgage amortization
- Edge cases (zero balance, zero rate, very long amortization)

### Expert S1 Infrastructure (29 tests)
- KV operations (create, read, update, delete profiles)
- Token generation and verification
- Magic link flow
- Rate limiting
- Referral tracking

### Expert Translator (87 tests)
- Form data → MC parameter mapping
- Segment detection (Couple, CCPC, Pre-retraite, FIRE)
- Default value handling
- Edge cases (missing fields, extreme values)

### Expert API S3 (103 tests)
- `/api/simulate` — MC run with various inputs
- `/api/optimize` — auto-optimization
- `/api/compare` — scenario comparison
- Auth enforcement (reject without token)
- Rate limit enforcement

### Expert S10 Audit (91 tests)
- Full E2E pipeline (quiz → MC → report → email)
- Webhook processing
- Idempotency
- Error handling and fallbacks

## Test Report Generation

| File | Purpose |
|------|---------|
| `tests/generate-test-reports.ts` | Generate Essentiel sample reports |
| `tests/generate-test-reports-inter.ts` | Generate Intermédiaire sample reports |
| `tests/generate-5-ai-reports.ts` | Multi-tier AI narration test |
| `tests/generate-audit-report.ts` | Standalone audit report |

## Coverage Gaps (Known)

| Area | Status | Priority |
|------|--------|----------|
| Décaissement translator | No dedicated test file | Medium (deferred) |
| Décaissement report renderer | No dedicated test file | Medium (deferred) |
| Email template rendering | Manual testing only | Low |
| Cookie consent (Law 25) | Manual testing only | Low |
| Cross-browser report rendering | Manual testing only | Low |

## Audit Checklist

- [ ] 453/453 engine tests pass
- [ ] 200/200 debt tool tests pass
- [ ] 310/310 Expert tests pass (29+87+103+91)
- [ ] AMF grep returns 0 violations
- [ ] `npm run build` succeeds without errors
- [ ] No test file imports production API keys
- [ ] Test data doesn't contain real user PII
- [ ] All test commands documented and runnable
