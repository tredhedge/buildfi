# Essentiel Pipeline Audit Reference
Generated: 2026-03-05T03:42:44.203Z
Reports: 10 profiles × 5,000 MC sims each

## Pipeline Flow
quiz-essentiel.html → POST /api/checkout → Stripe → webhook
→ translateToMC(quizAnswers) [lib/quiz-translator.ts]
→ runMC(params, 5000) [lib/engine/index.js]
→ extractReportData(mc, params) → D [lib/report-html.js]
→ buildAIPrompt(D, params, fr, quiz) → {sys, usr}
→ callAnthropic() → AI slots (12 slots, or {} fallback)
→ renderReportHTML(D, mc, quiz, lang, ai, costDelay, minReturn)

## Quiz Fields (quiz-essentiel.html — 8 steps)
Step 1: age, retAge, sex, prov, qppAge (new)
Step 2: employer, couple
Step 3: income, totalSavings, monthlyContrib, [savingsDetail → rrsp/tfsa/nr]
Step 4: debts[{type,amount,minPayment,rate}], hasDebts, homeowner, homeValue, mortgage, mortgageRate, mortgageAmort
Step 5: lifestyle (cozy/active/premium), risk (conservative/balanced/growth), parttime
Step 6: psychAnxiety, psychDiscipline, psychLiteracy
Step 7: worries[], win
Step 8: fix, confidence

## Translator Key Mappings
- monthlyContrib → split depends on salary: if sal >= $55k → RRSP first (18% of sal, max $33,810), then TFSA (up to $7k), remainder NR; if sal < $55k → TFSA first (up to $7k), then RRSP, remainder NR
- lifestyle → retSpM: cozy=$3k×COL, active=$5k×COL, premium=$7.5k×COL
- employer → pension: "gov"=DB (2%×yrs×projSal/12), "large"/"tech"=DC (6%×sal×yrs)
- risk → allocR: conservative=0.5, balanced=0.7, growth=0.85
- homeowner → props[0] with flat fields (homeValue, mortgage, mortgageAmort)
- debts → amortized with default rates (cc=19.99%, student=5.5%, car=6.5%, loc=7.5%)
- qppAge → passthrough if provided, else heuristic from retAge (clamped 60-70)
- oasAge → passthrough if provided, else heuristic from retAge (clamped 65-70)

## Report Sections (new order)
1. Note (grade/donut)
2. Profil (+ single-person callout if couple=yes)
3. Projection + Min Viable Return card
4. Revenus à la retraite
5. Épargne + Cost of Delay card
6. Priorité (CÉLI vs REER ranking)
7. Et si... (what-if cards)
── Upsell CTA (peak engagement) ──
8. Fiscalité & Frais
9. Plan aux 5 ans
10. Hypothèses
11. Méthodologie
── Disclaimer, Resources, Feedback, Referral, Print, Footer ──

## MC Engine Key Outputs
- succ (0-1): success rate
- rMedF, rP5F, rP25F, rP75F, rP95F: real wealth percentiles at end of plan
- medRuin, p5Ruin: age of ruin
- avgDeath: stochastic life expectancy
- medEstateNet, medEstateTax: estate values
- pD[]: per-year data rows

## Grade System
A+ ≥ 95%, A ≥ 90%, A- ≥ 85%, B+ ≥ 80%, B ≥ 70%, C ≥ 50%, D ≥ 30%, F < 30%

## Known Limitations (Essentiel tier)
- Single person only (couple=yes is metadata, not modeled)
- No custom spending input (lifestyle buckets only)
- No qppAge/oasAge override in quiz before this update (now available)
- No stochastic mortality or inflation (fatT/stochMort/stochInf all false)
- No RRSP meltdown, income splitting, or bridging strategies
