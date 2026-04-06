# 01 — Quiz Audit

## Architecture

All quizzes are **thin HTML clients** in `public/`. They collect user data and POST to `/api/checkout`. Zero MC logic runs client-side. No API keys exposed.

## Quiz Inventory

### Bilan (Essentiel) — `public/quiz-essentiel.html` (~1,081 lines)

**Target**: Single individuals wanting a quick financial portrait
**Screens**: ~12 steps
**Fields collected**:
- Age, province, language
- Gross annual income
- Monthly savings (RRSP, TFSA, non-registered)
- Current balances (RRSP, TFSA, non-registered, pension DB)
- Target retirement age
- Monthly retirement spending target
- Debt (credit cards, loans, mortgage — balance + rate + payment)
- Risk tolerance (1-5 scale)
- CPP/QPP start age preference
- Lifestyle expectations (frugal/moderate/comfortable)

**Validation**: `validateStep()` per screen, numeric range checks, required field enforcement
**Output**: JSON object → Stripe metadata via `splitMetadata()`

---

### Bilan 360 (Intermédiaire) — `public/quiz-intermediaire.html` (~1,457 lines)

**Target**: Couples, homeowners, incorporated professionals
**Screens**: ~14 steps
**Fields collected** (~85 fields):
- Everything in Essentiel, PLUS:
- Partner data (age, income, savings, retirement age, CPP timing)
- Real estate (up to 3 properties: value, mortgage, rental income)
- CCPC / incorporation (salary vs dividends, retained earnings, corporate investments)
- Pension DB details (indexed? survivor benefit?)
- Succession preferences (estate target, beneficiaries)
- Tax optimization preferences
- Insurance (life, disability — coverage + premium)

**Validation**: `validateStep()` + conditional sections (couple fields hidden if single)
**Output**: JSON object (~85 keys) → split across quiz_0..quiz_N metadata keys

---

### Horizon (Décaissement) — `public/quiz-decaissement.html` (~1,178 lines)

**Target**: Retirees and pre-retirees planning withdrawals
**Screens**: ~13 steps
**Fields collected** (~40 fields):
- Age, province, retirement status (already retired / planning)
- Current balances (RRSP/RRIF, TFSA, non-registered, LIF)
- Annual spending (current + target in retirement)
- Spending flexibility (rigid / moderate / flexible → maps to GK flexibility)
- Income sources (pension DB, rental, part-time work)
- CPP/QPP: current age, desired start age (60-70)
- OAS awareness
- Meltdown concern level (low / medium / high)
- Estate preference (maximize legacy / spend it all / balanced)
- Allocation (equity % / bond %)
- Detail preference (summary / detailed)

**Validation**: `validateStep()`, confirm screen with warnings, trust badges, prep card
**Special**: 4 responsive breakpoints matching essentiel; QPP timing question drives 3 separate MC runs

---

### Laboratoire (Expert) — `public/quiz-expert.html` (~1,435 lines)

**Target**: Self-directed users who want unlimited scenario testing
**Screens**: Quiz-lite (8 fields) → simulator unlock
**Fields collected** (quiz-lite):
- Age, province, income, savings overview
- Retirement target, risk tolerance
- Segment identification (couple? homeowner? CCPC? FIRE?)

**Post-quiz**: Interactive simulator with 500+ adjustable parameters per recalc
**Auth**: Magic link → token-based access to `/api/simulate`, `/api/optimize`, `/api/compare`

---

## Data Flow

```
Quiz HTML (client) → POST /api/checkout
  → Stripe metadata (splitMetadata: 490-char chunks)
  → Payment → webhook (checkout.session.completed)
  → Reassemble quiz JSON (reassembleQuizAnswers)
  → Route to tier-specific translator
```

## Security Checklist

- [ ] No MC engine code in any quiz HTML
- [ ] No API keys in client-side code
- [ ] No Anthropic calls from browser
- [ ] All quiz data transmitted via Stripe metadata (HTTPS)
- [ ] Input validation on both client (quiz) and server (translator)
- [ ] Terms acceptance checkbox required before checkout (CPA compliance)
- [ ] Cookie consent bar present (Law 25)

## Key Files

| File | Purpose |
|------|---------|
| `public/quiz-essentiel.html` | Bilan quiz |
| `public/quiz-intermediaire.html` | Bilan 360 quiz |
| `public/quiz-decaissement.html` | Horizon quiz |
| `public/quiz-expert.html` | Laboratoire quiz-lite |
| `app/api/checkout/route.ts` | Receives quiz data, creates Stripe session |
| `lib/api-helpers.ts` | `splitMetadata()`, `reassembleQuizAnswers()` |
