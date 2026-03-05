# Intermédiaire Pipeline Audit Reference
Generated: 2026-03-05T05:18:15.274Z
Reports: 15 profiles × 5,000 MC sims each + 5 strategies × 1,000 sims

## Pipeline Flow
quiz-intermediaire.html → POST /api/checkout → Stripe → webhook
→ translateToMCInter(quizAnswers) [lib/quiz-translator-inter.ts]
→ runMC(params, 5000) [lib/engine/index.js]
→ run5Strategies(params) [lib/strategies-inter.ts] (5 × 1,000 sims each)
→ calcCostOfDelay(params) [lib/strategies-inter.ts]
→ calcMinViableReturn(params) [lib/strategies-inter.ts]
→ extractReportDataInter(mc, params) → D [lib/report-html-inter.js]
→ buildAIPromptInter(D, params, fr, quiz, stratData) → {sys, usr} [lib/ai-prompt-inter.ts]
→ callAnthropic() → AI slots (16 slots, or {} fallback)
→ sanitizeAISlotsInter(raw) [lib/ai-constants.ts]
→ renderReportHTMLInter(D, mc, stratData, params, lang, ai, costDelay, minReturn, feedbackToken) [lib/report-html-inter.js]

## Quiz Fields (quiz-intermediaire.html — STATE.quiz)
Demographics: age, retAge, sex, prov, couple, cAge, cSex
Sources: sources[], employer, income
Couple: cIncome, cSource, cEmployer, cRetAge, cPenType, cPenM, cQppAge, cOasAge
Savings: rrsp, tfsa, nr, lira, dcBal, monthlyContrib, tfsaC, rrspC
Couple savings: cRrsp, cTfsa, cNr, cLira
Debts: debts[{type, amount, rate, minPayment}]
Property: homeowner, homeValue, mortgage, mortgageAmort, heloc, helocRate
Rental: hasRental, rentalValue, rentalMortgage, rentalAmort, rentalIncome, rentalExpenses, rentalDpaAccum, rentalSaleAge
Lifestyle: lifestyle (cozy/active/premium/custom), retSpMCustom, risk, allocCustom, retSpM
Part-time: parttime (yes/no/maybe), parttimeAmount, parttimeYears
QPP/OAS: qppAge, oasAge
Pension: penType (none/db/dc), penM, penIdx, penBridge, penYrs
FHSA: fhsaBal, fhsaContrib, fhsaForHome, fhsaHomeAge
Insurance: lifeInsBenefit, lifeInsPremium, cLifeInsBenefit, cLifeInsPremium
Downsizing: downsizingAge, downsizingProceeds, dpaOn
CCPC: bizRevenue, bizExpenses, bizBNR, bizRemun, bizSalaryPct, bizGrowth, bizInvAlloc, bizExtractYrs, bizDebt, bizSaleAge, bizSalePrice, bizACB, bizLCGE, ippOn, ippBal
Behavioral: worries[], objective, confidence, decaissement (minimal/meltdown), succObjective (neutral/maximize/consume)

## Translator Key Mappings (quiz-translator-inter.ts)
- Savings: explicit rrsp/tfsa/nr fields (not totalSavings like Essentiel)
- Contributions: if tfsaC/rrspC provided → use directly; else TFSA-first heuristic (up to $7k TFSA, then RRSP up to 18% sal, remainder NR)
- retSpM: lifestyle bucket × COL, or explicit retSpMCustom if lifestyle="custom"
- Pension: explicit penType/penM, or employer-fallback (gov→DB, large/tech→DC)
- QPP/OAS: passthrough from quiz (a.qppAge || 65, a.oasAge || 65)
- Couple: cOn = couple==="yes" && cAge > 0, cRetSpM = retSpM × 0.4
- CCPC: bizOn = sources.includes("ccpc"), all biz* fields passed through
- Properties: flat fields → props[] array (primary + optional rental)
- Debts: amortDebt() with default rates (cc=19.99%, student=5.5%, car=6.5%, loc=7.5%)
- FHSA: fhsaBal, fhsaC, fhsaForHome, fhsaHomeAge passed through
- Downsizing: downsizingAge, downsizingProceeds passed through
- penType "dc" → "cd" (proactive fix for engine compatibility)

## Report Sections (report-html-inter.js)
S1: Dashboard (grade donut + KPIs + resilience gauges)
S2: Profile timeline (SVG with milestones)
S3: Savings trajectory (stacked area chart)
S4: Retirement income (donut pie + gap analysis)
S5: Tax anatomy (effective rates + MER cost)
S6: Wealth longevity (fan chart + stress cards + SoR thermometer)
S7: Observations (5 AI slots)
S8: Priority cascade (cost of delay + min return + waterfall)
S9: Five strategies comparison (table with pp delta)
S10: Real estate analysis [CONDITIONAL: homeVal > 0]
S11a: Couple analysis [CONDITIONAL: cOn]
S11b: CCPC analysis [CONDITIONAL: bizOn]
S12: Estate analysis [CONDITIONAL: medEstateNet > 100k or lifeIns > 0]
S13: QPP/OAS optimizer (60/65/70 cards + break-even)
S14: Projection table (5-year intervals P25/P50/P75)
S15: Methodology and assumptions
S16: Next steps + Expert upsell

## 5-Strategy Comparison (strategies-inter.ts)
1. statu_quo — Current parameters unchanged (baseline)
2. meltdown — RRSP meltdown: bridge from RRSP 60→65, delay QPP/OAS
3. qpp_70 — QPP/CPP delayed to 70 (+42% benefit)
4. low_mer — MER reduced by 0.5pp (index fund switch)
5. save_more — Contributions +25% across all accounts

## AI Slots (16 — ai-constants.ts)
snapshot_intro, savings_context, income_mix, tax_context,
longevity_risk, sequence_risk, benchmark_context,
obs_1, obs_2, obs_3, obs_4, obs_5,
priority_actions, strategy_highlight, couple_analysis, ccpc_context

## Grade System
A+ ≥ 95%, A ≥ 90%, A- ≥ 85%, B+ ≥ 80%, B ≥ 75%, B- ≥ 70%,
C+ ≥ 60%, C ≥ 50%, D ≥ 40%, F < 40%

## Known Falsy-Zero Patterns in Translator
- Line 62-66: a.rrsp || 0, a.tfsa || 0 — harmless (0 is correct default)
- Line 122-123: a.qppAge || 65, a.oasAge || 65 — 0 is invalid age, so OK
- Line 136: a.mortgage || 0 — harmless (0 default for paid-off homes)
- Line 154: (a.rentalIncome || 0) / 12 — harmless (no rental = 0 income)
- SAFE: tfsaC/rrspC use != null check (correct pattern)

## COL Adjustments
QC:1.00, ON:1.15, BC:1.35, AB:1.05, MB:0.92, SK:0.90, NS:0.95,
NB:0.88, NL:0.93, PE:0.87, NT:1.25, YT:1.20, NU:1.40
