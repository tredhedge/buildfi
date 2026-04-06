# BuildFi Audit Package

**Date**: March 8, 2026
**Version**: Production (main branch)
**Scope**: Full-stack audit of all 4 product tiers

## Contents

| File | Scope | What it covers |
|------|-------|----------------|
| `01-QUIZ-AUDIT.md` | Client-side | All 4 quiz HTML files — fields, validation, data flow |
| `02-TRANSLATOR-AUDIT.md` | Server-side | Quiz → MC parameter translation — formulas, mappings, edge cases |
| `03-MC-ENGINE-AUDIT.md` | Core engine | Monte Carlo simulation — 5000 sims, t-Student, stochastic mortality |
| `04-AI-PROMPT-AUDIT.md` | AI narration | Prompt builders, voice matrix, slot system, DerivedProfile |
| `05-REPORT-RENDERER-AUDIT.md` | Server-side | HTML report generation — sections, data consumption, static fallbacks |
| `06-API-ROUTES-AUDIT.md` | Backend | All 23 API routes — webhook pipeline, auth, cron, exports |
| `07-STRIPE-PAYMENT-AUDIT.md` | Payments | Checkout flow, webhook, metadata splitting, coupons |
| `08-EMAIL-AUDIT.md` | Communications | All email templates — livraison, feedback, renewal, referral |
| `09-AUTH-STORAGE-AUDIT.md` | Infrastructure | KV (Upstash Redis), auth tokens, rate limiting, Blob storage |
| `10-TEST-COVERAGE-AUDIT.md` | Quality | All test suites — counts, categories, commands |
| `11-COMPLIANCE-AUDIT.md` | Legal/Regulatory | AMF/OSFI, Law 25, CPA, forbidden terms, disclaimers |
| `12-ARCHITECTURE-OVERVIEW.md` | System-wide | Component map, data flow, dependency graph |

## How to use this package

1. **Start with `12-ARCHITECTURE-OVERVIEW.md`** for the big picture
2. **Follow a transaction** through `07 → 06 → 02 → 03 → 04 → 05 → 08` (payment → webhook → translator → MC → AI → report → email)
3. **Compliance check**: `11-COMPLIANCE-AUDIT.md` covers every regulatory constraint
4. **Test validation**: `10-TEST-COVERAGE-AUDIT.md` lists all commands to verify

## Quick stats

| Metric | Value |
|--------|-------|
| Total source files | ~75 |
| Total lines of code | ~50,000+ |
| Product tiers | 4 (Bilan, Bilan 360, Horizon, Laboratoire) |
| API routes | 23 |
| Test count | 1,600+ across all suites |
| MC simulations per report | 5,000 (formal), 1,000 (screening) |
| AI slots | 13 (Ess) + 17 (Inter) + 12 (Decum) + variable (Expert) |
| Supported jurisdictions | 13 (10 provinces + 3 territories) |
| Languages | FR / EN (bilingual throughout) |
