// Generate 15 test reports for Intermédiaire pipeline audit
// Usage: npx tsx tests/generate-test-reports-inter.ts
// Set ANTHROPIC_API_KEY env var for real AI narration, otherwise uses mock fallback
// Output: tests/reports/intermediaire/*.html (open in browser)
//
// Pipeline: quiz-intermediaire.html → POST /api/checkout → Stripe → webhook
//   → translateToMCInter(quizAnswers) [lib/quiz-translator-inter.ts]
//   → runMC(params, 5000)            [lib/engine/index.js]
//   → run5Strategies(params)          [lib/strategies-inter.ts] (5 × 1000 sims)
//   → calcCostOfDelay(params)         [lib/strategies-inter.ts]
//   → calcMinViableReturn(params)     [lib/strategies-inter.ts]
//   → extractReportDataInter(mc, p)   [lib/report-html-inter.js]
//   → buildAIPromptInter(D, p, fr, quiz, strat) [lib/ai-prompt-inter.ts]
//   → callAnthropic(sys, usr)         [Anthropic API]
//   → sanitizeAISlotsInter(raw)       [lib/ai-constants.ts]
//   → renderReportHTMLInter(D, mc, strat, p, lang, ai, costDelay, minReturn, token)
//   → Vercel Blob upload → Resend email

// @ts-nocheck
import { runMC } from '../lib/engine/index';
import { extractReportDataInter, renderReportHTMLInter } from '../lib/report-html-inter';
import { translateToMCInter } from '../lib/quiz-translator-inter';
import { run5Strategies, calcCostOfDelay, calcMinViableReturn } from '../lib/strategies-inter';
import { buildAIPromptInter } from '../lib/ai-prompt-inter';
import { sanitizeAISlotsInter } from '../lib/ai-constants';
import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const USE_REAL_AI = !!ANTHROPIC_API_KEY;

async function callAnthropic(sys: string, usr: string): Promise<Record<string, string>> {
  if (!ANTHROPIC_API_KEY) return {};
  try {
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 6000,  // Inter has 16 slots (vs 12 Essentiel)
      system: sys,
      messages: [{ role: "user", content: usr }],
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const cleaned = text.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    const raw = JSON.parse(cleaned);
    return sanitizeAISlotsInter(raw);
  } catch (err) {
    console.error(`  [AI ERROR] ${err instanceof Error ? err.message : err}`);
    return {};
  }
}

const reportDir = join(__dirname, 'reports', 'intermediaire');
mkdirSync(reportDir, { recursive: true });

// ══════════════════════════════════════════════════════════════════════
// 15 DIVERSE PROFILES — Intermédiaire tier
// ══════════════════════════════════════════════════════════════════════
//
// Coverage matrix:
// ┌──────────────────┬──────────────────────────────────────────────┐
// │ Feature          │ Profiles                                     │
// ├──────────────────┼──────────────────────────────────────────────┤
// │ Solo             │ 03, 06, 07, 08, 10, 11                     │
// │ Couple           │ 01, 02, 04, 05, 09, 12, 13, 14, 15         │
// │ CCPC             │ 03, 09, 15                                  │
// │ Rental           │ 04, 09                                      │
// │ FHSA             │ 08                                          │
// │ Life insurance   │ 02, 09, 12, 14                              │
// │ DB pension       │ 02, 07, 09, 12                              │
// │ DC pension       │ 11, 14                                      │
// │ No pension       │ 01, 03, 04, 05, 06, 08, 10, 13, 15         │
// │ Part-time        │ 04, 07                                      │
// │ Downsizing       │ 12                                          │
// │ HELOC            │ 04                                          │
// │ Heavy debts      │ 05, 10                                      │
// │ Moderate debts   │ 08, 15                                      │
// │ QPP at 60        │ 07                                          │
// │ QPP at 70        │ 06, 13                                      │
// │ Meltdown strat   │ 13                                          │
// │ Custom retSpM    │ 13                                          │
// │ Conservative     │ 07, 11, 12                                  │
// │ Growth           │ 06, 08, 13, 14, 15                          │
// │ Provinces        │ QC:01,03,05,07,10,12 ON:02,09,13,14        │
// │                  │ BC:06,08 AB:04 MB:11 NS:15                  │
// └──────────────────┴──────────────────────────────────────────────┘
//
// Expected grade distribution: 2-3 F, 2-3 D, 2-3 C, 2-3 B, 3-4 A/A+

const profiles = [
  // ── 01: COUPLE SIMPLE QC ──────────────────────────────────────
  // Simple couple, both employed, modest savings, no property, balanced
  // Tests: couple section (S11a), basic contribution split, QPP/OAS defaults
  // Expected: C/B (modest savings, no property, but couple pooling helps)
  {
    name: "01-couple-simple-qc",
    desc: "45M+42F QC, $140k combined, no property, balanced, modest savings",
    quiz: {
      age: 45, retAge: 65, sex: "M", prov: "QC",
      sources: ["employed"], employer: "small", income: 80000,
      rrsp: 35000, tfsa: 22000, nr: 5000, lira: 0, dcBal: 0,
      monthlyContrib: 800,
      tfsaC: null, rrspC: null,
      penType: "none", penM: 0,
      lifestyle: "active", risk: "balanced",
      retSpM: 0,
      qppAge: 65, oasAge: 65,
      parttime: "no", parttimeAmount: 0, parttimeYears: 0,
      homeowner: false, homeValue: 0, mortgage: 0, mortgageAmort: 0,
      hasRental: false,
      debts: [],
      couple: "yes", cAge: 42, cSex: "F", cRetAge: 65, cIncome: 60000,
      cRrsp: 18000, cTfsa: 15000, cNr: 3000, cLira: 0,
      cPenType: "none", cPenM: 0, cQppAge: 65, cOasAge: 65,
      worries: ["runout", "inflation"],
      objective: "comfortable", confidence: 3,
      decaissement: "minimal", succObjective: "neutral",
      lifeInsBenefit: 0, lifeInsPremium: 0,
      fhsaBal: 0, fhsaContrib: 0,
      psychAnxiety: "mild", psychDiscipline: "moderate", psychLiteracy: "medium",
    }
  },

  // ── 02: COUPLE HOMEOWNER ON — DB PENSION ──────────────────────
  // Strong ON couple, DB pension (gov), primary home, life insurance
  // Tests: S10 (real estate), S11a (couple), S12 (estate), DB pension, insurance
  // Expected: A/A+ (high income, DB pension, solid savings, property equity)
  {
    name: "02-couple-homeowner-on",
    desc: "52M+50F ON, $200k combined, DB pension (gov), home, insured",
    quiz: {
      age: 52, retAge: 63, sex: "M", prov: "ON",
      sources: ["employed"], employer: "gov", income: 120000,
      rrsp: 180000, tfsa: 68000, nr: 45000, lira: 12000, dcBal: 0,
      monthlyContrib: 1500,
      tfsaC: null, rrspC: null,
      penType: "db", penM: 2800, penIdx: true, penYrs: 25,
      lifestyle: "premium", risk: "balanced",
      retSpM: 0,
      qppAge: 65, oasAge: 65,
      parttime: "no", parttimeAmount: 0, parttimeYears: 0,
      homeowner: true, homeValue: 720000, mortgage: 180000, mortgageAmort: 8,
      hasRental: false,
      debts: [],
      couple: "yes", cAge: 50, cSex: "F", cRetAge: 63, cIncome: 80000,
      cRrsp: 95000, cTfsa: 55000, cNr: 20000, cLira: 0,
      cPenType: "none", cPenM: 0, cQppAge: 65, cOasAge: 65,
      worries: ["tax", "legacy"],
      objective: "comfortable", confidence: 4,
      decaissement: "minimal", succObjective: "maximize",
      lifeInsBenefit: 500000, lifeInsPremium: 120,
      fhsaBal: 0, fhsaContrib: 0,
      psychAnxiety: "calm", psychDiscipline: "strong", psychLiteracy: "high",
    }
  },

  // ── 03: CCPC OWNER QC — SOLO ──────────────────────────────────
  // Solo QC business owner, CCPC with retained earnings, mix remuneration
  // Tests: S11b (CCPC), bizRevenue/bizExpenses/bizBNR, mix salary/dividend
  // Expected: B/C (decent biz income, but solo, no pension, retained earnings help)
  {
    name: "03-ccpc-owner-qc",
    desc: "48M QC, CCPC $300k rev, $200k BNR, mix remun, no property",
    quiz: {
      age: 48, retAge: 65, sex: "M", prov: "QC",
      sources: ["ccpc"], source: "ccpc", employer: "",
      income: 90000,  // personal salary drawn from CCPC
      rrsp: 55000, tfsa: 40000, nr: 25000, lira: 0, dcBal: 0,
      monthlyContrib: 1200,
      tfsaC: null, rrspC: null,
      penType: "none", penM: 0,
      lifestyle: "active", risk: "balanced",
      retSpM: 0,
      qppAge: 65, oasAge: 65,
      parttime: "no", parttimeAmount: 0, parttimeYears: 0,
      homeowner: false, homeValue: 0, mortgage: 0, mortgageAmort: 0,
      hasRental: false,
      debts: [],
      couple: "no",
      bizRevenue: 300000, bizExpenses: 120000, bizBNR: 200000,
      bizRemun: "mix", bizSalaryPct: 60, bizGrowth: 3,
      bizInvAlloc: 50, bizExtractYrs: 12,
      bizDebt: 0, bizSaleAge: 65, bizSalePrice: 400000, bizACB: 100, bizLCGE: true,
      ippOn: false, ippBal: 0,
      worries: ["tax", "market"],
      objective: "comfortable", confidence: 3,
      decaissement: "minimal", succObjective: "neutral",
      lifeInsBenefit: 0, lifeInsPremium: 0,
      fhsaBal: 0, fhsaContrib: 0,
      psychAnxiety: "mild", psychDiscipline: "strong", psychLiteracy: "high",
    }
  },

  // ── 04: RENTAL INVESTOR AB — COUPLE ───────────────────────────
  // AB couple, primary + rental property, HELOC, part-time, growth
  // Tests: S10 (2 properties), rental income/expenses, HELOC, part-time
  // Expected: A/B+ (rental income + HELOC strategy + growth allocation)
  {
    name: "04-rental-investor-ab",
    desc: "55F+53M AB, primary+rental, HELOC, part-time, growth",
    quiz: {
      age: 55, retAge: 63, sex: "F", prov: "AB",
      sources: ["employed"], employer: "small", income: 95000,
      rrsp: 120000, tfsa: 55000, nr: 80000, lira: 0, dcBal: 0,
      monthlyContrib: 1500,
      tfsaC: 7000, rrspC: 11000,  // explicit split
      penType: "none", penM: 0,
      lifestyle: "active", risk: "balanced",
      retSpM: 0,
      qppAge: 65, oasAge: 65,
      parttime: "yes", parttimeAmount: 2500, parttimeYears: 5,
      homeowner: true, homeValue: 580000, mortgage: 120000, mortgageAmort: 6,
      heloc: 40000, helocRate: 6.5,
      hasRental: true, rentalValue: 380000, rentalMortgage: 180000,
      rentalAmort: 18, rentalIncome: 30000, rentalExpenses: 8000,
      rentalDpaAccum: 45000, rentalSaleAge: 70,
      debts: [],
      couple: "yes", cAge: 53, cSex: "M", cRetAge: 65, cIncome: 75000,
      cRrsp: 65000, cTfsa: 40000, cNr: 15000, cLira: 0,
      cPenType: "none", cPenM: 0, cQppAge: 65, cOasAge: 65,
      worries: ["tax", "market"],
      objective: "comfortable", confidence: 4,
      decaissement: "minimal", succObjective: "neutral",
      lifeInsBenefit: 0, lifeInsPremium: 0,
      fhsaBal: 0, fhsaContrib: 0,
      psychAnxiety: "calm", psychDiscipline: "strong", psychLiteracy: "high",
    }
  },

  // ── 05: HEAVY DEBT COUPLE QC ──────────────────────────────────
  // QC couple, low combined income, $65k+ debt, minimal savings
  // Tests: debt amortization, multiple debt types, cozy lifestyle, low confidence
  // Expected: D/F (overwhelming debt vs income, tiny savings)
  {
    name: "05-heavy-debt-couple-qc",
    desc: "38M+35F QC, $85k combined, $65k debt, cozy, panic",
    quiz: {
      age: 38, retAge: 65, sex: "M", prov: "QC",
      sources: ["employed"], employer: "small", income: 48000,
      rrsp: 5000, tfsa: 3000, nr: 0, lira: 0, dcBal: 0,
      monthlyContrib: 200,
      tfsaC: null, rrspC: null,
      penType: "none", penM: 0,
      lifestyle: "cozy", risk: "balanced",
      retSpM: 0,
      qppAge: 65, oasAge: 65,
      parttime: "no", parttimeAmount: 0, parttimeYears: 0,
      homeowner: false, homeValue: 0, mortgage: 0, mortgageAmort: 0,
      hasRental: false,
      debts: [
        { type: "cc", amount: 18000, rate: 0, minPayment: 0 },
        { type: "car", amount: 25000, rate: 6.9, minPayment: 450 },
        { type: "loc", amount: 12000, rate: 7.5, minPayment: 0 },
        { type: "student", amount: 10000, rate: 4.5, minPayment: 150 },
      ],
      couple: "yes", cAge: 35, cSex: "F", cRetAge: 65, cIncome: 37000,
      cRrsp: 2000, cTfsa: 1500, cNr: 0, cLira: 0,
      cPenType: "none", cPenM: 0, cQppAge: 65, cOasAge: 65,
      worries: ["runout", "health", "inflation"],
      objective: "survive", confidence: 1,
      decaissement: "minimal", succObjective: "neutral",
      lifeInsBenefit: 0, lifeInsPremium: 0,
      fhsaBal: 0, fhsaContrib: 0,
      psychAnxiety: "high", psychDiscipline: "low", psychLiteracy: "low",
    }
  },

  // ── 06: FIRE SINGLE BC ────────────────────────────────────────
  // BC single male, FIRE target 45, aggressive growth, QPP at 70
  // Tests: early retirement, QPP deferral 70, growth allocation, BC COL
  // Expected: D/F (FIRE at 45 = 50 years of retirement, very hard)
  {
    name: "06-fire-single-bc",
    desc: "30M BC, $110k, FIRE at 45, growth, QPP at 70",
    quiz: {
      age: 30, retAge: 45, sex: "M", prov: "BC",
      sources: ["employed"], employer: "tech", income: 110000,
      rrsp: 45000, tfsa: 35000, nr: 60000, lira: 0, dcBal: 0,
      monthlyContrib: 3500,
      tfsaC: null, rrspC: null,
      penType: "none", penM: 0,
      lifestyle: "active", risk: "growth",
      retSpM: 0,
      qppAge: 70, oasAge: 70,
      parttime: "no", parttimeAmount: 0, parttimeYears: 0,
      homeowner: false, homeValue: 0, mortgage: 0, mortgageAmort: 0,
      hasRental: false,
      debts: [],
      couple: "no",
      worries: ["market", "inflation"],
      objective: "freedom", confidence: 5,
      decaissement: "minimal", succObjective: "consume",
      lifeInsBenefit: 0, lifeInsPremium: 0,
      fhsaBal: 0, fhsaContrib: 0,
      psychAnxiety: "calm", psychDiscipline: "strong", psychLiteracy: "high",
    }
  },

  // ── 07: NEAR RETIREMENT DB QC ─────────────────────────────────
  // QC woman, 60, DB pension (gov), 2 years to retire, QPP at 60, conservative
  // Tests: near-retirement, QPP at 60 (early), strong DB pension, short horizon
  // Expected: A+ (DB pension covers most spending, huge RRSP, paid-off home)
  {
    name: "07-near-retirement-db-qc",
    desc: "60F QC, $95k, DB pension gov, retAge 62, QPP at 60, conservative",
    quiz: {
      age: 60, retAge: 62, sex: "F", prov: "QC",
      sources: ["employed"], employer: "gov", income: 95000,
      rrsp: 310000, tfsa: 85000, nr: 40000, lira: 25000, dcBal: 0,
      monthlyContrib: 1500,
      tfsaC: null, rrspC: null,
      penType: "db", penM: 3200, penIdx: true, penYrs: 32,
      lifestyle: "active", risk: "conservative",
      retSpM: 0,
      qppAge: 60, oasAge: 65,
      parttime: "yes", parttimeAmount: 1500, parttimeYears: 3,
      homeowner: true, homeValue: 420000, mortgage: 0, mortgageAmort: 0,
      hasRental: false,
      debts: [],
      couple: "no",
      worries: ["health", "inflation"],
      objective: "comfortable", confidence: 4,
      decaissement: "minimal", succObjective: "neutral",
      lifeInsBenefit: 0, lifeInsPremium: 0,
      fhsaBal: 0, fhsaContrib: 0,
      psychAnxiety: "calm", psychDiscipline: "strong", psychLiteracy: "medium",
    }
  },

  // ── 08: YOUNG FHSA ON ─────────────────────────────────────────
  // ON young woman, 26, FHSA active, small savings, student debt, growth
  // Tests: FHSA fields, young profile, student debt, growth, long horizon
  // Expected: D (very small savings base, but 39 years of compounding)
  {
    name: "08-young-fhsa-on",
    desc: "26F ON, $55k, FHSA active, student debt, growth",
    quiz: {
      age: 26, retAge: 65, sex: "F", prov: "ON",
      sources: ["employed"], employer: "small", income: 55000,
      rrsp: 3000, tfsa: 8000, nr: 0, lira: 0, dcBal: 0,
      monthlyContrib: 500,
      tfsaC: null, rrspC: null,
      penType: "none", penM: 0,
      lifestyle: "cozy", risk: "growth",
      retSpM: 0,
      qppAge: 65, oasAge: 65,
      parttime: "no", parttimeAmount: 0, parttimeYears: 0,
      homeowner: false, homeValue: 0, mortgage: 0, mortgageAmort: 0,
      hasRental: false,
      debts: [
        { type: "student", amount: 28000, rate: 5.5, minPayment: 250 },
      ],
      couple: "no",
      fhsaBal: 8000, fhsaContrib: 8000, fhsaForHome: true, fhsaHomeAge: 32,
      worries: ["runout", "market"],
      objective: "comfortable", confidence: 3,
      decaissement: "minimal", succObjective: "neutral",
      lifeInsBenefit: 0, lifeInsPremium: 0,
      psychAnxiety: "mild", psychDiscipline: "moderate", psychLiteracy: "medium",
    }
  },

  // ── 09: CCPC COUPLE RENTAL ON ─────────────────────────────────
  // ON couple, CCPC + employed spouse, rental property, insurance, IPP
  // Tests: S11a+S11b+S10+S12 ALL conditional sections, complex profile
  // Expected: A/B+ (multiple income sources, rental, CCPC retained earnings)
  {
    name: "09-ccpc-couple-rental-on",
    desc: "50M+48F ON, CCPC+employed spouse, rental, insurance, IPP",
    quiz: {
      age: 50, retAge: 65, sex: "M", prov: "ON",
      sources: ["ccpc"], source: "ccpc", employer: "",
      income: 100000,  // personal draw
      rrsp: 150000, tfsa: 68000, nr: 45000, lira: 0, dcBal: 0,
      monthlyContrib: 2000,
      tfsaC: null, rrspC: null,
      penType: "none", penM: 0,
      lifestyle: "active", risk: "balanced",
      retSpM: 0,
      qppAge: 65, oasAge: 65,
      parttime: "no", parttimeAmount: 0, parttimeYears: 0,
      homeowner: true, homeValue: 850000, mortgage: 220000, mortgageAmort: 10,
      hasRental: true, rentalValue: 450000, rentalMortgage: 200000,
      rentalAmort: 20, rentalIncome: 36000, rentalExpenses: 10000,
      rentalDpaAccum: 60000, rentalSaleAge: 68,
      debts: [],
      couple: "yes", cAge: 48, cSex: "F", cRetAge: 63, cIncome: 85000,
      cRrsp: 80000, cTfsa: 50000, cNr: 20000, cLira: 0,
      cPenType: "db", cPenM: 1800, cQppAge: 65, cOasAge: 65,
      bizRevenue: 400000, bizExpenses: 160000, bizBNR: 350000,
      bizRemun: "mix", bizSalaryPct: 50, bizGrowth: 4,
      bizInvAlloc: 60, bizExtractYrs: 15,
      bizDebt: 50000, bizSaleAge: 65, bizSalePrice: 600000, bizACB: 100, bizLCGE: true,
      ippOn: true, ippBal: 200000,
      worries: ["tax", "legacy", "market"],
      objective: "comfortable", confidence: 4,
      decaissement: "minimal", succObjective: "maximize",
      lifeInsBenefit: 750000, lifeInsPremium: 200,
      cLifeInsBenefit: 300000, cLifeInsPremium: 80,
      fhsaBal: 0, fhsaContrib: 0,
      psychAnxiety: "calm", psychDiscipline: "strong", psychLiteracy: "high",
    }
  },

  // ── 10: MINIMUM WAGE ZERO QC ──────────────────────────────────
  // QC single male, 35, $30k, zero savings, credit card debt
  // Tests: absolute bottom profile, F grade, zero contributions
  // Expected: F (no savings, no contributions, debt, low income)
  {
    name: "10-minimum-wage-zero-qc",
    desc: "35M QC, $30k, zero savings, $9k CC debt, no contributions",
    quiz: {
      age: 35, retAge: 65, sex: "M", prov: "QC",
      sources: ["employed"], employer: "small", income: 30000,
      rrsp: 0, tfsa: 0, nr: 0, lira: 0, dcBal: 0,
      monthlyContrib: 0,
      tfsaC: null, rrspC: null,
      penType: "none", penM: 0,
      lifestyle: "cozy", risk: "balanced",
      retSpM: 0,
      qppAge: 65, oasAge: 65,
      parttime: "no", parttimeAmount: 0, parttimeYears: 0,
      homeowner: false, homeValue: 0, mortgage: 0, mortgageAmort: 0,
      hasRental: false,
      debts: [
        { type: "cc", amount: 9000, rate: 0, minPayment: 0 },
      ],
      couple: "no",
      worries: ["runout", "health"],
      objective: "survive", confidence: 1,
      decaissement: "minimal", succObjective: "neutral",
      lifeInsBenefit: 0, lifeInsPremium: 0,
      fhsaBal: 0, fhsaContrib: 0,
      psychAnxiety: "high", psychDiscipline: "low", psychLiteracy: "low",
    }
  },

  // ── 11: DC PENSION MB — SOLO CONSERVATIVE ─────────────────────
  // MB single, DC pension (large employer), conservative, no property
  // Tests: DC pension (penType→cd), MB province, conservative allocation
  // Expected: C (DC pension helps, but conservative allocation + no property)
  {
    name: "11-dc-pension-mb",
    desc: "43M MB, $72k, DC pension (large), conservative, no property",
    quiz: {
      age: 43, retAge: 65, sex: "M", prov: "MB",
      sources: ["employed"], employer: "large", income: 72000,
      rrsp: 40000, tfsa: 28000, nr: 10000, lira: 0, dcBal: 65000,
      monthlyContrib: 600,
      tfsaC: null, rrspC: null,
      penType: "dc", penM: 0, dcBal: 65000,
      lifestyle: "active", risk: "conservative",
      retSpM: 0,
      qppAge: 65, oasAge: 65,
      parttime: "no", parttimeAmount: 0, parttimeYears: 0,
      homeowner: false, homeValue: 0, mortgage: 0, mortgageAmort: 0,
      hasRental: false,
      debts: [],
      couple: "no",
      worries: ["runout", "inflation"],
      objective: "comfortable", confidence: 3,
      decaissement: "minimal", succObjective: "neutral",
      lifeInsBenefit: 0, lifeInsPremium: 0,
      fhsaBal: 0, fhsaContrib: 0,
      psychAnxiety: "mild", psychDiscipline: "moderate", psychLiteracy: "medium",
    }
  },

  // ── 12: DOWNSIZING COUPLE QC ──────────────────────────────────
  // QC couple, plan to downsize at 65, premium lifestyle, DB pension, insurance
  // Tests: downsizingAge/downsizingProceeds, conservative, S10+S11a+S12
  // Expected: A/B+ (premium lifestyle is expensive but downsizing + DB pension help)
  {
    name: "12-downsizing-couple-qc",
    desc: "57M+55F QC, downsizing at 65, premium, DB pension, insurance",
    quiz: {
      age: 57, retAge: 65, sex: "M", prov: "QC",
      sources: ["employed"], employer: "gov", income: 105000,
      rrsp: 220000, tfsa: 75000, nr: 50000, lira: 15000, dcBal: 0,
      monthlyContrib: 1800,
      tfsaC: null, rrspC: null,
      penType: "db", penM: 2600, penIdx: true, penYrs: 28,
      lifestyle: "premium", risk: "conservative",
      retSpM: 0,
      qppAge: 65, oasAge: 65,
      parttime: "no", parttimeAmount: 0, parttimeYears: 0,
      homeowner: true, homeValue: 650000, mortgage: 80000, mortgageAmort: 4,
      hasRental: false,
      debts: [],
      couple: "yes", cAge: 55, cSex: "F", cRetAge: 63, cIncome: 68000,
      cRrsp: 75000, cTfsa: 45000, cNr: 10000, cLira: 0,
      cPenType: "none", cPenM: 0, cQppAge: 65, cOasAge: 65,
      downsizingAge: 65, downsizingProceeds: 250000,
      worries: ["inflation", "health", "legacy"],
      objective: "comfortable", confidence: 4,
      decaissement: "minimal", succObjective: "maximize",
      lifeInsBenefit: 400000, lifeInsPremium: 150,
      fhsaBal: 0, fhsaContrib: 0,
      psychAnxiety: "mild", psychDiscipline: "strong", psychLiteracy: "medium",
    }
  },

  // ── 13: QPP70 MELTDOWN ON — SOLO ──────────────────────────────
  // ON single, QPP at 70, meltdown decumulation, custom retSpM, growth
  // Tests: QPP deferral 70, meltdown strategy, custom retSpM, no pension
  // Expected: C/B (custom spending $4200, growth helps, meltdown strategy)
  {
    name: "13-qpp70-meltdown-on",
    desc: "47F ON, $88k, QPP at 70, meltdown, custom retSpM $4200, growth",
    quiz: {
      age: 47, retAge: 65, sex: "F", prov: "ON",
      sources: ["employed"], employer: "small", income: 88000,
      rrsp: 85000, tfsa: 45000, nr: 20000, lira: 0, dcBal: 0,
      monthlyContrib: 1000,
      tfsaC: null, rrspC: null,
      penType: "none", penM: 0,
      lifestyle: "custom", retSpMCustom: 4200,
      risk: "growth",
      retSpM: 4200,
      qppAge: 70, oasAge: 70,
      parttime: "maybe", parttimeAmount: 0, parttimeYears: 0,
      homeowner: true, homeValue: 480000, mortgage: 150000, mortgageAmort: 12,
      hasRental: false,
      debts: [],
      couple: "yes", cAge: 45, cSex: "M", cRetAge: 67, cIncome: 0,
      cRrsp: 0, cTfsa: 0, cNr: 0, cLira: 0,
      cPenType: "none", cPenM: 0, cQppAge: 67, cOasAge: 67,
      worries: ["runout", "tax"],
      objective: "comfortable", confidence: 3,
      decaissement: "meltdown", succObjective: "consume",
      lifeInsBenefit: 0, lifeInsPremium: 0,
      fhsaBal: 0, fhsaContrib: 0,
      psychAnxiety: "mild", psychDiscipline: "moderate", psychLiteracy: "high",
    }
  },

  // ── 14: MAXED SAVER ON — COUPLE ───────────────────────────────
  // ON couple, maxed TFSA+RRSP, DC pension (tech), growth, no debt
  // Tests: large savings, DC pension, S12 estate, insurance, tech employer
  // Expected: A+ (massive savings, growth, DC pension, no debt)
  {
    name: "14-maxed-saver-on",
    desc: "40M+38F ON, maxed savings, DC pension (tech), growth, insured",
    quiz: {
      age: 40, retAge: 60, sex: "M", prov: "ON",
      sources: ["employed"], employer: "tech", income: 160000,
      rrsp: 250000, tfsa: 95000, nr: 180000, lira: 0, dcBal: 120000,
      monthlyContrib: 5000,
      tfsaC: 7000, rrspC: 21800,  // explicit max contributions
      penType: "dc", penM: 0, dcBal: 120000,
      lifestyle: "premium", risk: "growth",
      retSpM: 0,
      qppAge: 65, oasAge: 65,
      parttime: "no", parttimeAmount: 0, parttimeYears: 0,
      homeowner: true, homeValue: 1100000, mortgage: 400000, mortgageAmort: 18,
      hasRental: false,
      debts: [],
      couple: "yes", cAge: 38, cSex: "F", cRetAge: 60, cIncome: 95000,
      cRrsp: 120000, cTfsa: 68000, cNr: 45000, cLira: 0,
      cPenType: "none", cPenM: 0, cQppAge: 65, cOasAge: 65,
      worries: ["tax", "market", "legacy"],
      objective: "comfortable", confidence: 5,
      decaissement: "minimal", succObjective: "maximize",
      lifeInsBenefit: 1000000, lifeInsPremium: 180,
      fhsaBal: 0, fhsaContrib: 0,
      psychAnxiety: "calm", psychDiscipline: "strong", psychLiteracy: "high",
    }
  },

  // ── 15: SELF-EMPLOYED NS — COUPLE + CCPC ──────────────────────
  // NS couple, self-employed via CCPC, moderate debt, growth
  // Tests: NS province (rare), CCPC + couple, moderate debt, small biz
  // Expected: C/D (small NS business, moderate debt, no pension)
  {
    name: "15-self-employed-ns",
    desc: "44M+42F NS, CCPC small biz, moderate debt, growth",
    quiz: {
      age: 44, retAge: 65, sex: "M", prov: "NS",
      sources: ["ccpc"], source: "ccpc", employer: "",
      income: 65000,  // personal draw
      rrsp: 25000, tfsa: 18000, nr: 8000, lira: 0, dcBal: 0,
      monthlyContrib: 600,
      tfsaC: null, rrspC: null,
      penType: "none", penM: 0,
      lifestyle: "active", risk: "growth",
      retSpM: 0,
      qppAge: 65, oasAge: 65,
      parttime: "no", parttimeAmount: 0, parttimeYears: 0,
      homeowner: true, homeValue: 320000, mortgage: 140000, mortgageAmort: 15,
      hasRental: false,
      debts: [
        { type: "loc", amount: 18000, rate: 7.0, minPayment: 0 },
        { type: "cc", amount: 5000, rate: 0, minPayment: 0 },
      ],
      couple: "yes", cAge: 42, cSex: "F", cRetAge: 65, cIncome: 42000,
      cRrsp: 12000, cTfsa: 10000, cNr: 3000, cLira: 0,
      cPenType: "none", cPenM: 0, cQppAge: 65, cOasAge: 65,
      bizRevenue: 150000, bizExpenses: 70000, bizBNR: 60000,
      bizRemun: "salary", bizSalaryPct: 100, bizGrowth: 2,
      bizInvAlloc: 30, bizExtractYrs: 8,
      bizDebt: 20000, bizSaleAge: 0, bizSalePrice: 0, bizACB: 100, bizLCGE: false,
      ippOn: false, ippBal: 0,
      worries: ["runout", "tax", "inflation"],
      objective: "comfortable", confidence: 2,
      decaissement: "minimal", succObjective: "neutral",
      lifeInsBenefit: 0, lifeInsPremium: 0,
      fhsaBal: 0, fhsaContrib: 0,
      psychAnxiety: "mild", psychDiscipline: "moderate", psychLiteracy: "medium",
    }
  },
];

// ══════════════════════════════════════════════════════════════════════
// GENERATE REPORTS
// ══════════════════════════════════════════════════════════════════════
async function main() {
  console.log(`Generating ${profiles.length} Intermédiaire test reports`);
  console.log(`AI: ${USE_REAL_AI ? 'Anthropic claude-sonnet-4' : 'MOCK — set ANTHROPIC_API_KEY for real narration'}\n`);

  const summary: any[] = [];
  const auditCards: any[] = [];

  for (const profile of profiles) {
    const t0 = Date.now();
    const quiz = profile.quiz;

    // ── Step 1: Translate quiz → MC params ──
    const p = translateToMCInter(quiz);

    // Log full translation
    console.log(`\n${"─".repeat(90)}`);
    console.log(`PROFILE: ${profile.name} — ${profile.desc}`);
    console.log(`${"─".repeat(90)}`);
    console.log("QUIZ ANSWERS (user input):");
    console.log(JSON.stringify(quiz, null, 2));
    console.log("\nTRANSLATED MC PARAMS (fed to engine):");
    const mcParams = { ...p };
    delete mcParams._quiz;
    delete mcParams._report;
    console.log(JSON.stringify(mcParams, null, 2));
    console.log("\nQUIZ METADATA (_quiz):", JSON.stringify(p._quiz, null, 2));
    console.log("REPORT METADATA (_report):", JSON.stringify(p._report, null, 2));

    // ── Step 2: Run MC (5000 sims) ──
    const mc = runMC(p, 5000);
    const mcElapsed = Date.now() - t0;

    console.log("\nMC OUTPUTS:");
    console.log(`  succ=${mc.succ.toFixed(3)}, rMedF=${Math.round(mc.rMedF)}, rP5F=${Math.round(mc.rP5F)}, rP95F=${Math.round(mc.rP95F)}`);
    console.log(`  medRuin=${mc.medRuin}, p5Ruin=${mc.p5Ruin}, avgDeath=${mc.avgDeath}`);
    console.log(`  medEstateNet=${Math.round(mc.medEstateNet || 0)}, medEstateTax=${Math.round(mc.medEstateTax || 0)}`);

    // ── Step 3: Run 5 strategies (1000 sims each) ──
    const t1 = Date.now();
    const stratData = run5Strategies(p);
    const stratElapsed = Date.now() - t1;

    console.log(`\n5-STRATEGY COMPARISON (${stratElapsed}ms):`);
    stratData.forEach((s, i) => {
      console.log(`  ${s.key}: succ=${(s.succ * 100).toFixed(1)}%, medF=${Math.round(s.medF)}, estate=${Math.round(s.medEstateNet)}`);
    });

    // ── Step 4: Cost of delay + Min viable return ──
    const costDelay = calcCostOfDelay(p);
    const minReturn = calcMinViableReturn(p);
    console.log(`\ncostOfDelay=${costDelay}, minViableReturn=${minReturn}%`);

    // ── Step 5: Extract report data ──
    const D = extractReportDataInter(mc, p);

    console.log("\nDERIVED REPORT DATA (D):");
    console.log(`  grade=${D.grade}, successPct=${D.successPct}, withdrawalRatePct=${D.withdrawalRatePct}`);
    console.log(`  retBal=${D.retBal}, govMonthly=${D.govMonthly} (qpp=${D.qppMonthly}, oas=${D.oasMonthly}, pen=${D.dbPensionMonthly})`);
    console.log(`  gapMonthly=${D.gapMonthly}, coveragePct=${D.coveragePct}`);
    console.log(`  taxCurrEff=${D.taxCurrentEffective}%, taxRetEff=${D.taxRetirementEffective}%, margRate=${D.taxCurrentMarginal}%`);
    console.log(`  totalSavings=${D.totalSavings}, retSpM=${D.retSpM}`);

    // Log conditional section triggers
    const conditionals: string[] = [];
    if (p.cOn) conditionals.push("S11a-COUPLE");
    if (p._report?.bizOn || p.bizOn) conditionals.push("S11b-CCPC");
    if (p._report?.homeVal > 0) conditionals.push("S10-REALESTATE");
    if ((D.medEstateNet || 0) > 100000 || (p.lifeInsBenefit || 0) > 0) conditionals.push("S12-ESTATE");
    console.log(`  Conditional sections: ${conditionals.length > 0 ? conditionals.join(", ") : "NONE"}`);

    // ── Step 6: AI narration ──
    const prompt = buildAIPromptInter(D, p, true, quiz, stratData);
    // Dump prompts for offline AI generation
    const promptPath = join(reportDir, `${profile.name}.prompt.json`);
    writeFileSync(promptPath, JSON.stringify({ sys: prompt.sys, usr: prompt.usr }, null, 2), 'utf8');

    let ai: Record<string, string> = {};
    // Check for pre-generated AI slots (offline generation by Claude)
    const aiSlotsPath = join(reportDir, `${profile.name}.ai.json`);
    if (existsSync(aiSlotsPath)) {
      ai = JSON.parse(readFileSync(aiSlotsPath, 'utf8'));
      console.log(`  [PRELOADED] AI: ${Object.keys(ai).length} slots from ${profile.name}.ai.json`);
    } else if (USE_REAL_AI) {
      console.log("  Calling Anthropic API (16 slots)...");
      const aiT0 = Date.now();
      ai = await callAnthropic(prompt.sys, prompt.usr);
      console.log(`  AI: ${Object.keys(ai).length} slots filled (${Date.now() - aiT0}ms)`);
    } else {
      console.log("  [MOCK] No ANTHROPIC_API_KEY — set key or create .ai.json files");
    }

    // ── Step 7: Render HTML report ──
    const html = renderReportHTMLInter(D, mc, stratData, p, "fr", ai, costDelay, minReturn, null);

    // Save
    const outPath = join(reportDir, `${profile.name}.html`);
    writeFileSync(outPath, html, 'utf8');

    const elapsed = Date.now() - t0;
    const row = {
      profile: profile.name,
      desc: profile.desc,
      grade: D.grade,
      successPct: D.successPct,
      withdrawalPct: D.withdrawalRatePct,
      retBal: D.retBal,
      rMedF: D.rMedF,
      rP5F: D.rP5F,
      govMonthly: D.govMonthly,
      gapMonthly: D.gapMonthly,
      coveragePct: D.coveragePct,
      costDelay,
      minReturn,
      conditionals: conditionals.join(","),
      aiSlots: Object.keys(ai).length,
      mcTime: mcElapsed + "ms",
      stratTime: stratElapsed + "ms",
      totalTime: elapsed + "ms",
    };
    summary.push(row);

    // Audit card
    auditCards.push({
      name: profile.name,
      desc: profile.desc,
      quiz: profile.quiz,
      translated: {
        sal: p.sal, retSpM: p.retSpM, rrsp: p.rrsp, tfsa: p.tfsa, nr: p.nr,
        liraBal: p.liraBal, dcBal: p.dcBal, fhsaBal: p.fhsaBal,
        rrspC: p.rrspC, tfsaC: p.tfsaC, nrC: p.nrC,
        penType: p.penType, penM: p.penM, penIdx: p.penIdx,
        qppAge: p.qppAge, oasAge: p.oasAge, allocR: p.allocR, merR: p.merR,
        cOn: p.cOn, cSal: p.cSal, cRetAge: p.cRetAge, cRetSpM: p.cRetSpM,
        bizOn: p.bizOn, bizRevenue: p.bizRevenue, bizRetainedEarnings: p.bizRetainedEarnings,
        ptM: p.ptM, ptYrs: p.ptYrs,
        props: p.props?.length || 0, debts: p.debts?.length || 0,
      },
      _quiz: p._quiz,
      _report: p._report,
    });

    console.log(`✓ ${profile.name} — ${D.grade} (${D.successPct}%) — MC:${mcElapsed}ms, strat:${stratElapsed}ms, total:${elapsed}ms, AI:${Object.keys(ai).length} slots`);
  }

  // ── Summary table ──────────────────────────────────────────────
  console.log("\n" + "═".repeat(160));
  console.log("SUMMARY — INTERMÉDIAIRE PIPELINE AUDIT");
  console.log("═".repeat(160));
  console.log(
    "Profile".padEnd(30) +
    "Grade".padEnd(6) +
    "Succ%".padEnd(7) +
    "WdRate".padEnd(8) +
    "RetBal".padEnd(12) +
    "rMedF".padEnd(12) +
    "GovMo".padEnd(8) +
    "GapMo".padEnd(8) +
    "Cov%".padEnd(6) +
    "CostDly".padEnd(10) +
    "MinRet".padEnd(8) +
    "Cond.Sections".padEnd(28) +
    "AI".padEnd(5) +
    "Time"
  );
  console.log("-".repeat(160));
  for (const r of summary) {
    console.log(
      r.profile.padEnd(30) +
      r.grade.padEnd(6) +
      String(r.successPct).padEnd(7) +
      String(r.withdrawalPct).padEnd(8) +
      r.retBal.toLocaleString("en").padEnd(12) +
      r.rMedF.toLocaleString("en").padEnd(12) +
      String(r.govMonthly).padEnd(8) +
      String(r.gapMonthly).padEnd(8) +
      String(r.coveragePct).padEnd(6) +
      r.costDelay.toLocaleString("en").padEnd(10) +
      (r.minReturn + "%").padEnd(8) +
      (r.conditionals || "—").padEnd(28) +
      String(r.aiSlots).padEnd(5) +
      r.totalTime
    );
  }

  // ── Sanity checks ─────────────────────────────────────────────
  console.log("\n" + "═".repeat(160));
  console.log("SANITY CHECKS");
  console.log("═".repeat(160));
  let issues = 0;
  const gradesSeen = new Set<string>();
  const provsSeen = new Set<string>();
  const condSeen = { couple: 0, ccpc: 0, realestate: 0, estate: 0 };

  for (const r of summary) {
    gradesSeen.add(r.grade);
    if (r.successPct < 0 || r.successPct > 100) { console.log(`⚠ ${r.profile}: successPct ${r.successPct} out of range`); issues++; }
    if (r.retBal < 0) { console.log(`⚠ ${r.profile}: negative retBal ${r.retBal}`); issues++; }
    if (r.govMonthly < 0) { console.log(`⚠ ${r.profile}: negative govMonthly`); issues++; }
    if (r.gapMonthly < 0) { console.log(`⚠ ${r.profile}: negative gapMonthly`); issues++; }
    if (r.coveragePct < 0 || r.coveragePct > 200) { console.log(`⚠ ${r.profile}: coveragePct ${r.coveragePct} suspicious`); issues++; }
    if (r.withdrawalPct > 100 && r.successPct > 50) { console.log(`⚠ ${r.profile}: high withdrawal ${r.withdrawalPct}% but ${r.successPct}% success`); issues++; }

    const conds = (r.conditionals || "").split(",");
    if (conds.includes("S11a-COUPLE")) condSeen.couple++;
    if (conds.includes("S11b-CCPC")) condSeen.ccpc++;
    if (conds.includes("S10-REALESTATE")) condSeen.realestate++;
    if (conds.includes("S12-ESTATE")) condSeen.estate++;
  }

  // Coverage checks
  for (const ac of auditCards) {
    provsSeen.add(ac.quiz.prov);
  }

  if (issues === 0) console.log("✓ All value sanity checks passed");

  console.log(`\nGrade distribution: ${[...gradesSeen].sort().join(", ")}`);
  if (gradesSeen.size < 4) { console.log("⚠ Less than 4 distinct grades — need more diversity"); issues++; }
  else console.log("✓ Grade diversity OK");

  console.log(`Provinces: ${[...provsSeen].sort().join(", ")}`);
  if (provsSeen.size < 4) { console.log("⚠ Less than 4 provinces — need more diversity"); issues++; }
  else console.log("✓ Province diversity OK");

  console.log(`Conditional sections: couple=${condSeen.couple}, ccpc=${condSeen.ccpc}, realestate=${condSeen.realestate}, estate=${condSeen.estate}`);
  if (condSeen.couple < 2) { console.log("⚠ Need more couple profiles"); issues++; }
  if (condSeen.ccpc < 2) { console.log("⚠ Need more CCPC profiles"); issues++; }
  if (condSeen.realestate < 2) { console.log("⚠ Need more real estate profiles"); issues++; }
  else console.log("✓ All conditional sections exercised (2+ each)");

  console.log(`\nTotal issues: ${issues}`);

  // ── Write audit artifacts ──────────────────────────────────────
  writeFileSync(join(reportDir, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
  writeFileSync(join(reportDir, "profiles-audit.json"), JSON.stringify(auditCards, null, 2), "utf8");

  // Pipeline reference doc
  const pipelineRef = `# Intermédiaire Pipeline Audit Reference
Generated: ${new Date().toISOString()}
Reports: ${profiles.length} profiles × 5,000 MC sims each + 5 strategies × 1,000 sims

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
`;

  writeFileSync(join(reportDir, "PIPELINE-REFERENCE-INTER.md"), pipelineRef, "utf8");

  console.log(`\nReports + audit docs written to: ${reportDir}/`);
  console.log(`Files: ${profiles.length} HTML reports, summary.json, profiles-audit.json, PIPELINE-REFERENCE-INTER.md`);
  console.log("Open any .html file in your browser to visually inspect.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
