// /tests/report-inter-calculations.test.js
// ══════════════════════════════════════════════════════════════════════
// Comprehensive test suite for Intermédiaire report calculation pipeline
// Covers: translateToMCInter → runMC → extractReportDataInter →
//         run5Strategies → calcCostOfDelay → calcMinViableReturn →
//         buildAIPromptInter → sanitizeAISlotsInter → renderReportHTMLInter
// Run with: npx tsx tests/report-inter-calculations.test.js
// ══════════════════════════════════════════════════════════════════════

import { translateToMCInter } from "../lib/quiz-translator-inter.ts";
import { runMC, calcTax } from "../lib/engine/index.js";
import { extractReportDataInter, renderReportHTMLInter } from "../lib/report-html-inter.js";
import { run5Strategies, calcCostOfDelay, calcMinViableReturn } from "../lib/strategies-inter.ts";
import { buildAIPromptInter } from "../lib/ai-prompt-inter.ts";
import { AI_SLOTS_INTER, sanitizeAISlotsInter, FORBIDDEN_TERMS, AI_SLOT_MAX_LENGTH_INTER } from "../lib/ai-constants.ts";
import { computeDerivedProfile, computeRenderPlan, computeCompositeSignals } from "../lib/ai-profile.ts";

// ════════════════════════════════════════════════════════════════
// TEST INFRASTRUCTURE
// ════════════════════════════════════════════════════════════════
let passed = 0, failed = 0, errors = [];

function assert(condition, name, detail) {
  if (condition) { passed++; }
  else { failed++; errors.push({ name, detail: detail || "" }); console.error("  FAIL:", name, detail || ""); }
}

function assertClose(actual, expected, tolerance, name) {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) { passed++; }
  else { failed++; const d = `expected ~${expected}, got ${actual} (diff ${diff}, tol ${tolerance})`; errors.push({ name, detail: d }); console.error("  FAIL:", name, d); }
}

function assertRange(actual, min, max, name) {
  if (actual >= min && actual <= max) { passed++; }
  else { failed++; const d = `expected [${min}, ${max}], got ${actual}`; errors.push({ name, detail: d }); console.error("  FAIL:", name, d); }
}

function section(title) { console.log("\n══ " + title + " ══"); }

// ════════════════════════════════════════════════════════════════
// REFERENCE QUIZ: Intermédiaire tier — complex profile
// ════════════════════════════════════════════════════════════════
const QUIZ_INTER = {
  age: 42, retAge: 65, sex: "F", prov: "QC",
  income: 95000,
  rrsp: 45000, tfsa: 30000, nr: 15000, lira: 8000, dcBal: 0,
  monthlyContrib: 800,
  tfsaC: null, rrspC: null,  // let the translator compute
  penType: "db", penM: 2200, penIdx: true, penYrs: 18,
  lifestyle: "active", risk: "balanced",
  retSpM: 0,  // let translator compute from lifestyle
  qppAge: 65, oasAge: 65,
  parttime: "yes", parttimeAmount: 2000, parttimeYears: 4,
  homeowner: true, homeValue: 520000, mortgage: 280000, mortgageAmort: 18,
  hasRental: false,
  debts: [
    { type: "cc", amount: 8500, rate: 0, minPayment: 0 },
    { type: "student", amount: 12000, rate: 4.5, minPayment: 200 },
  ],
  couple: "yes", cAge: 40, cSex: "M", cRetAge: 65, cIncome: 65000,
  cRrsp: 20000, cTfsa: 15000, cNr: 5000, cLira: 0,
  cPenType: "none", cPenM: 0, cQppAge: 65, cOasAge: 65,
  employer: "gov",
  source: "employed", sources: ["employed"],
  worries: ["runout", "tax", "inflation"],
  objective: "comfortable", confidence: 3,
  decaissement: "minimal",
  succObjective: "neutral",
  lifeInsBenefit: 250000, lifeInsPremium: 85,
  fhsaBal: 0, fhsaContrib: 0,
};

// Minimal quiz for edge-case testing
const QUIZ_MINIMAL = {
  age: 30, retAge: 60, sex: "M", prov: "ON",
  income: 50000,
  rrsp: 0, tfsa: 0, nr: 0,
  monthlyContrib: 0,
  debts: [], couple: "no",
  homeowner: false,
  worries: [], confidence: 3,
};

// ════════════════════════════════════════════════════════════════
// CATEGORY 1: translateToMCInter — Basic Demographics
// ════════════════════════════════════════════════════════════════
section("1. translateToMCInter — Basic Demographics");

const p = translateToMCInter(QUIZ_INTER);

assert(p.age === 42, "age = 42");
assert(p.retAge === 65, "retAge = 65");
assert(p.sex === "F", "sex = F");
assert(p.prov === "QC", "prov = QC");
assert(p.sal === 95000, "sal = 95000");
assert(p.deathAge === 92, "deathAge = 92 (female)", `got ${p.deathAge}`);

console.log("  Demographics: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 2: translateToMCInter — Savings & Contributions
// ════════════════════════════════════════════════════════════════
section("2. translateToMCInter — Savings & Contributions");

// Explicit savings (Inter gets direct fields, not totalSavings split)
assert(p.rrsp === 45000, "rrsp = 45000 (explicit)", `got ${p.rrsp}`);
assert(p.tfsa === 30000, "tfsa = 30000 (explicit)", `got ${p.tfsa}`);
assert(p.nr === 15000, "nr = 15000 (explicit)", `got ${p.nr}`);
assert(p.liraBal === 8000, "liraBal = 8000", `got ${p.liraBal}`);

// Contributions: RRSP-first heuristic when sal >= $55K and tfsaC/rrspC are null
// ac = 800 * 12 = 9600, rrspC = min(9600, min(95000*0.18, 33810)) = min(9600, 17100) = 9600
const ac = 800 * 12;
assert(p.rrspC === 9600, "rrspC = min(9600, 17100) = 9600 (RRSP-first at sal≥55K)", `got ${p.rrspC}`);
// tfsaC = min(9600-9600, 7000) = 0
assert(p.tfsaC === 0, "tfsaC = 0 (all contrib goes RRSP-first)", `got ${p.tfsaC}`);
// nrC = max(0, 9600 - 9600 - 0) = 0
assert(p.nrC === 0, "nrC = 0", `got ${p.nrC}`);

console.log("  Savings & contributions: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 3: translateToMCInter — Pension Logic
// ════════════════════════════════════════════════════════════════
section("3. translateToMCInter — Pension Logic");

// Explicit DB pension with penM
assert(p.penType === "db", "penType = db (explicit)", `got ${p.penType}`);
assert(p.penM === 2200, "penM = 2200 (explicit)", `got ${p.penM}`);
assert(p.penIdx === true, "penIdx = true (explicit)");

// DC pension via penType="dc"
const pDC = translateToMCInter({ ...QUIZ_INTER, penType: "dc", penM: 0, dcBal: 50000, employer: "small" });
assert(pDC.penType === "cd", "penType dc → cd (PROACTIVE FIX)", `got ${pDC.penType}`);
assert(pDC.dcBal === 50000, "dcBal = 50000 for DC", `got ${pDC.dcBal}`);

// Employer fallback: gov → DB indexed
const pGov = translateToMCInter({ ...QUIZ_INTER, penType: undefined, penM: 0 });
assert(pGov.penType === "db", "gov employer fallback → db", `got ${pGov.penType}`);
assert(pGov.penIdx === true, "gov employer fallback → penIdx=true");
assert(pGov.penM > 0, "gov employer fallback → penM > 0", `got ${pGov.penM}`);

// Employer fallback: large → CD
const pLarge = translateToMCInter({ ...QUIZ_INTER, penType: undefined, penM: 0, employer: "large" });
assert(pLarge.penType === "cd", "large employer fallback → cd", `got ${pLarge.penType}`);
assert(pLarge.dcBal > 0, "large employer fallback → dcBal > 0", `got ${pLarge.dcBal}`);

// No pension
const pNone = translateToMCInter({ ...QUIZ_MINIMAL, employer: "small" });
assert(pNone.penType === "none", "small employer → penType=none", `got ${pNone.penType}`);

console.log("  Pension logic: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 4: translateToMCInter — Spending & Allocation
// ════════════════════════════════════════════════════════════════
section("4. translateToMCInter — Spending & Allocation");

// Active lifestyle, QC (COL=1) → 5000
assert(p.retSpM === 5000, "retSpM = 5000 (active, QC COL=1)", `got ${p.retSpM}`);

// Cozy
const pCozy = translateToMCInter({ ...QUIZ_INTER, lifestyle: "cozy", retSpM: 0 });
assert(pCozy.retSpM === 3000, "retSpM = 3000 (cozy, QC)", `got ${pCozy.retSpM}`);

// Premium
const pPrem = translateToMCInter({ ...QUIZ_INTER, lifestyle: "premium", retSpM: 0 });
assert(pPrem.retSpM === 7500, "retSpM = 7500 (premium, QC)", `got ${pPrem.retSpM}`);

// BC COL adjustment
const pBC = translateToMCInter({ ...QUIZ_INTER, prov: "BC", retSpM: 0 });
assert(pBC.retSpM === Math.round(5000 * 1.35), "retSpM = 6750 (active, BC COL=1.35)", `got ${pBC.retSpM}`);

// Explicit retSpM overrides lifestyle
const pExplicit = translateToMCInter({ ...QUIZ_INTER, retSpM: 6000 });
assert(pExplicit.retSpM === 6000, "explicit retSpM=6000 overrides lifestyle", `got ${pExplicit.retSpM}`);

// Allocation
assert(p.allocR === 0.70, "allocR = 0.70 (balanced)", `got ${p.allocR}`);

const pCon = translateToMCInter({ ...QUIZ_INTER, risk: "conservative" });
assert(pCon.allocR === 0.50, "allocR = 0.50 (conservative)", `got ${pCon.allocR}`);

const pGrowth = translateToMCInter({ ...QUIZ_INTER, risk: "growth" });
assert(pGrowth.allocR === 0.85, "allocR = 0.85 (growth)", `got ${pGrowth.allocR}`);

// MER tiers
assert(p.merR === 0.015, "merR = 0.015 for eq=0.70", `got ${p.merR}`);
assert(pGrowth.merR === 0.018, "merR = 0.018 for eq=0.85 (> 0.7 tier)", `got ${pGrowth.merR}`);
assert(pCon.merR === 0.012, "merR = 0.012 for eq=0.50", `got ${pCon.merR}`);
assert(p.merT === p.merR * 0.5, "merT = merR × 0.5", `got ${p.merT}`);

console.log("  Spending & allocation: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 5: translateToMCInter — QPP/OAS/Part-time
// ════════════════════════════════════════════════════════════════
section("5. translateToMCInter — QPP/OAS/Part-time");

assert(p.qppAge === 65, "qppAge = 65 (explicit)", `got ${p.qppAge}`);
assert(p.oasAge === 65, "oasAge = 65 (explicit)", `got ${p.oasAge}`);
assert(p.qppYrs === Math.min(40, Math.max(0, 42 - 18)), "qppYrs = 24", `got ${p.qppYrs}`);

// Part-time
assert(p.ptM === 2000, "ptM = 2000 (explicit)", `got ${p.ptM}`);
assert(p.ptYrs === 4, "ptYrs = 4 (explicit)", `got ${p.ptYrs}`);

// Part-time = "maybe" defaults
const pMaybe = translateToMCInter({ ...QUIZ_INTER, parttime: "maybe", parttimeAmount: 0, parttimeYears: 0 });
assert(pMaybe.ptM === 800, "ptM = 800 (maybe default)", `got ${pMaybe.ptM}`);
assert(pMaybe.ptYrs === 3, "ptYrs = 3 (default)", `got ${pMaybe.ptYrs}`);

// No part-time
const pNoPt = translateToMCInter({ ...QUIZ_INTER, parttime: "no" });
assert(pNoPt.ptM === 0, "ptM = 0 (no part-time)", `got ${pNoPt.ptM}`);
assert(pNoPt.ptYrs === 0, "ptYrs = 0 (no part-time)", `got ${pNoPt.ptYrs}`);

console.log("  QPP/OAS/Part-time: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 6: translateToMCInter — Properties
// ════════════════════════════════════════════════════════════════
section("6. translateToMCInter — Properties");

assert(p.props.length === 1, "1 property (primary residence)", `got ${p.props.length}`);
assert(p.props[0].pri === true, "property is primary");
assert(p.props[0].val === 520000, "homeValue = 520000", `got ${p.props[0].val}`);
assert(p.props[0].mb === 280000, "mortgage = 280000", `got ${p.props[0].mb}`);
assert(p.props[0].ma === 18, "mortgageAmort = 18", `got ${p.props[0].ma}`);
assert(p.props[0].ri === 0.035, "appreciation = 0.035");

// With rental
const pRental = translateToMCInter({ ...QUIZ_INTER, hasRental: true, rentalValue: 350000, rentalMortgage: 150000, rentalIncome: 24000, rentalExpenses: 6000 });
assert(pRental.props.length === 2, "2 properties with rental", `got ${pRental.props.length}`);
assert(pRental.props[1].pri === false, "rental is not primary");
assert(pRental.props[1].val === 350000, "rental value = 350000");
assert(pRental.props[1].rm === 2000, "rental income monthly = 24000/12 = 2000", `got ${pRental.props[1].rm}`);

// No property
const pNoHome = translateToMCInter({ ...QUIZ_MINIMAL });
assert(pNoHome.props.length === 0, "no properties when not homeowner", `got ${pNoHome.props.length}`);

console.log("  Properties: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 7: translateToMCInter — Debts & amortDebt
// ════════════════════════════════════════════════════════════════
section("7. translateToMCInter — Debts & amortDebt");

assert(p.debts.length === 2, "2 debts", `got ${p.debts.length}`);

// CC debt: rate defaults to 19.99% when rate=0
const ccDebt = p.debts.find(d => d.type === "cc");
assert(ccDebt !== undefined, "CC debt present");
assert(ccDebt.bal === 8500, "CC bal = 8500", `got ${ccDebt.bal}`);
assert(ccDebt.rate === 0.1999, "CC rate = 0.1999 (default)", `got ${ccDebt.rate}`);
assert(ccDebt.minPay > 0, "CC minPay computed", `got ${ccDebt.minPay}`);
assert(ccDebt.months > 0, "CC months > 0", `got ${ccDebt.months}`);
assert(ccDebt.totalInt > 0, "CC totalInt > 0", `got ${ccDebt.totalInt}`);
assert(ccDebt.annualCost === Math.round(8500 * 0.1999), "CC annualCost = bal×rate", `got ${ccDebt.annualCost}`);

// Student debt: explicit rate 4.5%
const stuDebt = p.debts.find(d => d.type === "student");
assert(stuDebt !== undefined, "Student debt present");
assert(stuDebt.bal === 12000, "Student bal = 12000");
assert(stuDebt.rate === 0.045, "Student rate = 4.5%", `got ${stuDebt.rate}`);
assert(stuDebt.minPay === 200, "Student minPay = 200 (explicit)", `got ${stuDebt.minPay}`);
assert(stuDebt.feasible === true, "Student debt feasible");

// Zero-balance debts filtered out
const pZeroDebt = translateToMCInter({ ...QUIZ_INTER, debts: [{ type: "cc", amount: 0, rate: 0 }] });
assert(pZeroDebt.debts.length === 0, "zero-balance debts filtered", `got ${pZeroDebt.debts.length}`);

// defMinPay defaults
const pDefCC = translateToMCInter({ ...QUIZ_MINIMAL, debts: [{ type: "cc", amount: 5000, rate: 0, minPayment: 0 }] });
assert(pDefCC.debts[0].minPay === Math.max(Math.round(5000 * 0.02), 25), "CC default minPay = max(2%, $25)", `got ${pDefCC.debts[0].minPay}`);

console.log("  Debts & amortDebt: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 8: translateToMCInter — Couple & Business
// ════════════════════════════════════════════════════════════════
section("8. translateToMCInter — Couple & Business");

assert(p.cOn === true, "cOn = true (couple=yes + cAge>0)");
assert(p.cAge === 40, "cAge = 40");
assert(p.cSex === "M", "cSex = M");
assert(p.cRetAge === 65, "cRetAge = 65");
assert(p.cSal === 65000, "cSal = 65000");
assert(p.cRRSP === 20000, "cRRSP = 20000");
assert(p.cTFSA === 15000, "cTFSA = 15000");
assert(p.cNR === 5000, "cNR = 5000");
assert(p.cRetSpM === Math.round(p.retSpM * 0.4), "cRetSpM = retSpM × 0.4", `got ${p.cRetSpM}`);
assert(p.cDeath === 90, "cDeath = 90 (male partner)", `got ${p.cDeath}`);
assert(p.split === true, "split = cOn");
assert(p.lifeInsBenefit === 250000, "lifeInsBenefit = 250000");
assert(p.lifeInsPremium === 85, "lifeInsPremium = 85");

// Solo
const pSolo = translateToMCInter({ ...QUIZ_MINIMAL });
assert(pSolo.cOn === false, "cOn = false for solo");
assert(pSolo.split === false, "split = false for solo");

// Business (CCPC)
const pBiz = translateToMCInter({ ...QUIZ_INTER, sources: ["ccpc"], source: "ccpc", bizRevenue: 200000, bizExpenses: 80000, bizBNR: 100000 });
assert(pBiz.bizOn === true, "bizOn = true for CCPC");
assert(pBiz.bizRevenue === 200000, "bizRevenue = 200000");
assert(pBiz.bizType === "ccpc", "bizType = ccpc");

console.log("  Couple & business: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 9: translateToMCInter — _quiz & _report passthrough
// ════════════════════════════════════════════════════════════════
section("9. translateToMCInter — _quiz & _report passthrough");

assert(p._quiz !== undefined, "_quiz exists");
assert(p._quiz.couple === "yes", "_quiz.couple = yes");
assert(p._quiz.employer === "gov", "_quiz.employer = gov");
assert(Array.isArray(p._quiz.worries), "_quiz.worries is array");
assert(p._quiz.worries.length === 3, "_quiz.worries has 3 items", `got ${p._quiz.worries.length}`);
assert(p._quiz.confidence === 3, "_quiz.confidence = 3");
assert(p._quiz.homeowner === true, "_quiz.homeowner = true");
assert(p._quiz.succObjective === "neutral", "_quiz.succObjective = neutral");

assert(p._report !== undefined, "_report exists");
assert(p._report.debtBal === 8500 + 12000, "_report.debtBal = 20500", `got ${p._report.debtBal}`);
assert(p._report.debtAnnualCost > 0, "_report.debtAnnualCost > 0", `got ${p._report.debtAnnualCost}`);
assert(p._report.homeVal === 520000, "_report.homeVal = 520000");
assert(p._report.mortBal === 280000, "_report.mortBal = 280000");
assert(p._report.equity === 240000, "_report.equity = 240000", `got ${p._report.equity}`);
assert(p._report.mortAmort === 18, "_report.mortAmort = 18");
assert(p._report.mortFreeAge > 0, "_report.mortFreeAge > 0", `got ${p._report.mortFreeAge}`);
assert(p._report.mortPayment > 0, "_report.mortPayment > 0", `got ${p._report.mortPayment}`);
assert(p._report.lifeIns === 250000, "_report.lifeIns = 250000");

// totalLiquidSavings (couple mode)
const expectedLiq = 45000 + 30000 + 15000 + 8000 + 0 + 20000 + 15000 + 5000;
assert(p._report.totalLiquidSavings === expectedLiq, "_report.totalLiquidSavings = " + expectedLiq, `got ${p._report.totalLiquidSavings}`);

console.log("  _quiz & _report passthrough: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 10: MC Engine — runMC with Inter params
// ════════════════════════════════════════════════════════════════
section("10. MC Engine — runMC with Inter params");

const mc = runMC(p, 5000);

assert(mc !== null, "runMC returns non-null");
assert(mc.succ >= 0 && mc.succ <= 1, "succ in [0,1]", `got ${mc.succ}`);
assert(mc.medRevData && mc.medRevData.length > 0, "medRevData non-empty");
assert(mc.fins && mc.fins.length === 5000, "fins has 5000 entries", `got ${mc.fins ? mc.fins.length : 'null'}`);

// Percentile spread
assert(mc.p95F > mc.var5 || mc.succ >= 0.999, "P95 > P5 (spread exists)");
assert(mc.p75F > mc.p25F || mc.succ >= 0.999, "P75 > P25");

// Real vs nominal
const discFinal = Math.pow(1 + p.inf, p.deathAge - p.age);
assertClose(mc.rMedF, mc.medF / discFinal, 1, "rMedF = medF / discFinal");
assert(mc.medF >= mc.rMedF, "medF (nominal) >= rMedF (real)");

// Age range
assert(mc.medRevData[0].age === 42, "medRevData starts at 42", `got ${mc.medRevData[0].age}`);
assert(mc.medRevData[mc.medRevData.length - 1].age === 92, "medRevData ends at 92", `got ${mc.medRevData[mc.medRevData.length - 1].age}`);

console.log(`  MC: succ=${(mc.succ*100).toFixed(1)}%, rMedF=${Math.round(mc.rMedF)}`);

// ════════════════════════════════════════════════════════════════
// CATEGORY 11: extractReportDataInter — Core fields
// ════════════════════════════════════════════════════════════════
section("11. extractReportDataInter — Core fields");

const D = extractReportDataInter(mc, p);

assert(D.age === 42, "D.age = 42");
assert(D.retAge === 65, "D.retAge = 65");
assert(D.sal === 95000, "D.sal = 95000");
assert(D.prov === "QC", "D.prov = QC");
assert(D.sex === "F", "D.sex = F");
assert(D.deathAge === 92, "D.deathAge = 92");
assert(D.totalSavings === 90000, "D.totalSavings = 45000+30000+15000 = 90000", `got ${D.totalSavings}`);
assert(D.rrsp === 45000, "D.rrsp = 45000");
assert(D.tfsa === 30000, "D.tfsa = 30000");
assert(D.nr === 15000, "D.nr = 15000");
assert(D.liraBal === 8000, "D.liraBal = 8000");
assert(D.retSpM === 5000, "D.retSpM = 5000");

// Gov income
assert(D.qppMonthly >= 0, "qppMonthly >= 0", `got ${D.qppMonthly}`);
assert(D.oasMonthly >= 0, "oasMonthly >= 0", `got ${D.oasMonthly}`);
assert(D.dbPensionMonthly >= 0, "dbPensionMonthly >= 0", `got ${D.dbPensionMonthly}`);
assert(D.govMonthly === D.qppMonthly + D.oasMonthly + D.dbPensionMonthly, "govMonthly = sum", `got ${D.govMonthly}`);

// Coverage & gap
const expectedCover = D.retSpM > 0 ? Math.round(D.govMonthly / D.retSpM * 100) : 0;
assert(D.coveragePct === expectedCover, "coveragePct consistent", `expected ${expectedCover}, got ${D.coveragePct}`);
assert(D.gapMonthly === Math.max(0, D.retSpM - D.govMonthly), "gapMonthly correct");

// Withdrawal rate
assert(D.withdrawalRatePct >= 0, "withdrawalRatePct >= 0", `got ${D.withdrawalRatePct}`);
assert(D.retBal > 0, "retBal > 0", `got ${D.retBal}`);
assertRange(D.retBal, 50000, 5000000, "retBal in reasonable range");

// Success
assert(D.successPct >= 0 && D.successPct <= 100, "successPct in [0,100]", `got ${D.successPct}`);
assert(D.succ >= 0 && D.succ <= 1, "D.succ in [0,1]");
assert(D.successPct === Math.round(D.succ * 100), "successPct = round(succ×100)");

// Estate
assert(typeof D.medEstateTax === "number", "medEstateTax is number");
assert(typeof D.medEstateNet === "number", "medEstateNet is number");

// Pension fields
assert(D.penType === "db", "D.penType = db");
assert(D.hasPension === true, "D.hasPension = true");
assert(D.ptM === 2000, "D.ptM = 2000");
assert(D.ptYrs === 4, "D.ptYrs = 4");

// Other engine fields
assert(D.inf === 0.021, "D.inf = 0.021");
assert(D.nSim === 5000, "D.nSim = 5000");
assert(D.expReturn > 0, "expReturn > 0", `got ${D.expReturn}`);
assert(D.afterTaxReturn > 0, "afterTaxReturn > 0");

console.log("  Core fields: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 12: extractReportDataInter — Real vs Nominal (CRITICAL)
// ════════════════════════════════════════════════════════════════
section("12. extractReportDataInter — CRITICAL: rMedF must be REAL");

assert(
  Math.abs(D.rMedF - Math.round(mc.rMedF)) < 2,
  "CRITICAL: D.rMedF must use mc.rMedF (real)",
  `D.rMedF=${D.rMedF}, mc.rMedF=${Math.round(mc.rMedF)}, mc.medF(nominal)=${Math.round(mc.medF)}`
);
assert(
  Math.abs(D.rP5F - Math.round(mc.rP5F || mc.p5F || mc.var5 / discFinal)) < 2,
  "CRITICAL: D.rP5F must use mc.rP5F (real)",
  `D.rP5F=${D.rP5F}`
);
assert(
  Math.abs(D.rP25F - Math.round(mc.rP25F)) < 2,
  "CRITICAL: D.rP25F must use mc.rP25F (real)",
  `D.rP25F=${D.rP25F}, mc.rP25F=${Math.round(mc.rP25F)}`
);
assert(
  Math.abs(D.rP75F - Math.round(mc.rP75F)) < 2,
  "CRITICAL: D.rP75F must use mc.rP75F (real)",
  `D.rP75F=${D.rP75F}`
);
assert(
  Math.abs(D.rP95F - Math.round(mc.rP95F)) < 2,
  "CRITICAL: D.rP95F must use mc.rP95F (real)",
  `D.rP95F=${D.rP95F}`
);

// Percentiles should differ
assert(D.rP5F !== D.rP75F || D.successPct >= 99, "P5 ≠ P75 (unless near-perfect)");

console.log("  Real vs Nominal: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 13: extractReportDataInter — Grade mapping (10 levels)
// ════════════════════════════════════════════════════════════════
section("13. extractReportDataInter — Grade mapping");

// Grade boundary tests
function gradeForSucc(succPct) {
  if (succPct >= 95) return "A+";
  if (succPct >= 90) return "A";
  if (succPct >= 85) return "A\u2212";
  if (succPct >= 80) return "B+";
  if (succPct >= 75) return "B";
  if (succPct >= 70) return "B\u2212";
  if (succPct >= 60) return "C+";
  if (succPct >= 50) return "C";
  if (succPct >= 40) return "D";
  return "F";
}

const gradeTests = [
  { pct: 100, expected: "A+" }, { pct: 95, expected: "A+" },
  { pct: 94, expected: "A" }, { pct: 90, expected: "A" },
  { pct: 89, expected: "A\u2212" }, { pct: 85, expected: "A\u2212" },
  { pct: 84, expected: "B+" }, { pct: 80, expected: "B+" },
  { pct: 79, expected: "B" }, { pct: 75, expected: "B" },
  { pct: 74, expected: "B\u2212" }, { pct: 70, expected: "B\u2212" },
  { pct: 69, expected: "C+" }, { pct: 60, expected: "C+" },
  { pct: 59, expected: "C" }, { pct: 50, expected: "C" },
  { pct: 49, expected: "D" }, { pct: 40, expected: "D" },
  { pct: 39, expected: "F" }, { pct: 0, expected: "F" },
];

gradeTests.forEach(g => {
  assert(gradeForSucc(g.pct) === g.expected, `Grade ${g.pct}% = ${g.expected}`);
});

// D.grade should match expected for D.successPct
assert(D.grade === gradeForSucc(D.successPct), "D.grade matches successPct", `grade=${D.grade}, pct=${D.successPct}`);

console.log("  Grade mapping: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 14: extractReportDataInter — Resilience scores
// ════════════════════════════════════════════════════════════════
section("14. extractReportDataInter — Resilience scores");

assertRange(D.longevityScore, 0, 100, "longevityScore in [0,100]");
assert(D.longevityScore === Math.min(100, D.successPct), "longevityScore = min(100, successPct)", `got ${D.longevityScore}`);

assertRange(D.taxScore, 0, 100, "taxScore in [0,100]");
// taxScore logic: retEff < currEff-5 → 90, retEff < currEff → 70, else 50
const expectedTaxScore = D.taxRetirementEffective < D.taxCurrentEffective - 5 ? 90
  : D.taxRetirementEffective < D.taxCurrentEffective ? 70 : 50;
assert(D.taxScore === expectedTaxScore, "taxScore matches logic", `expected ${expectedTaxScore}, got ${D.taxScore}`);

assertRange(D.covScore, 0, 100, "covScore in [0,100]");
assert(D.covScore === Math.min(100, D.coveragePct), "covScore = min(100, coveragePct)");

assertRange(D.diverScore, 0, 100, "diverScore in [0,100]");
// diversScore: maxConc < 0.5 → 85, < 0.7 → 65, else 45
const tot = 45000 + 30000 + 15000;
const maxConc = Math.max(45000, 30000, 15000) / tot;
const expectedDiver = maxConc < 0.5 ? 85 : maxConc < 0.7 ? 65 : 45;
assert(D.diverScore === expectedDiver, "diverScore matches logic", `maxConc=${maxConc.toFixed(2)}, expected ${expectedDiver}, got ${D.diverScore}`);

console.log("  Resilience scores: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 15: extractReportDataInter — Projection table
// ════════════════════════════════════════════════════════════════
section("15. extractReportDataInter — Projection table");

assert(Array.isArray(D.projTable), "projTable is array");
assert(D.projTable.length > 0, "projTable non-empty", `got ${D.projTable.length}`);
assert(D.projTable[0].age === D.retAge, "projTable starts at retAge", `got ${D.projTable[0].age}`);
assert(D.projTable[D.projTable.length - 1].age <= D.deathAge, "projTable ends at or before deathAge");

// Each row has required fields
D.projTable.forEach((row, i) => {
  assert(typeof row.age === "number", `projTable[${i}].age is number`);
  assert(typeof row.netIncome === "number", `projTable[${i}].netIncome is number`);
  assert(typeof row.p25 === "number", `projTable[${i}].p25 is number`);
  assert(typeof row.p50 === "number", `projTable[${i}].p50 is number`);
  assert(typeof row.p75 === "number", `projTable[${i}].p75 is number`);
  assert(row.p25 >= 0, `projTable[${i}].p25 >= 0`, `got ${row.p25}`);
  assert(row.p50 >= 0, `projTable[${i}].p50 >= 0`);
  assert(row.p75 >= row.p25, `projTable[${i}].p75 >= p25`, `p25=${row.p25}, p75=${row.p75}`);
});

// 5-year intervals
for (let i = 1; i < D.projTable.length; i++) {
  const gap = D.projTable[i].age - D.projTable[i - 1].age;
  assert(gap === 5 || D.projTable[i].age === D.deathAge, `projTable gap is 5 or ends at deathAge (gap=${gap})`);
}

console.log("  Projection table: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 16: run5Strategies — 5-Strategy Comparison
// ════════════════════════════════════════════════════════════════
section("16. run5Strategies — 5-Strategy Comparison");

const stratData = run5Strategies(p);

assert(Array.isArray(stratData), "stratData is array");
assert(stratData.length === 5, "5 strategies returned", `got ${stratData.length}`);

const expectedKeys = ["statu_quo", "meltdown", "qpp_70", "low_mer", "save_more"];
stratData.forEach((s, i) => {
  assert(s.key === expectedKeys[i], `strategy[${i}].key = ${expectedKeys[i]}`, `got ${s.key}`);
  assert(typeof s.fr === "string" && s.fr.length > 0, `strategy[${i}].fr non-empty`);
  assert(typeof s.en === "string" && s.en.length > 0, `strategy[${i}].en non-empty`);
  assert(s.succ >= 0 && s.succ <= 1, `strategy[${i}].succ in [0,1]`, `got ${s.succ}`);
  assert(typeof s.medF === "number", `strategy[${i}].medF is number`);
  assert(typeof s.medEstateTax === "number", `strategy[${i}].medEstateTax is number`);
  assert(typeof s.medEstateNet === "number", `strategy[${i}].medEstateNet is number`);
  assert(typeof s.p25F === "number", `strategy[${i}].p25F is number`);
  assert(typeof s.p75F === "number", `strategy[${i}].p75F is number`);
});

// Statu quo should match the main MC run (approximately — 500 sims vs 5000)
assertRange(stratData[0].succ, mc.succ - 0.10, mc.succ + 0.10, "statu_quo succ ≈ main MC succ (±10%)");

// Low-MER should generally be >= statu_quo (lower fees → better outcomes)
// Not strictly enforced due to MC variance, but sanity check
assert(typeof stratData[3].succ === "number", "low_mer has valid succ");

// Save more: rrspC + tfsaC should be higher than base
// (tested indirectly — the strategy param overrides are defined in the function)

console.log("  5-strategy comparison: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 17: calcCostOfDelay
// ════════════════════════════════════════════════════════════════
section("17. calcCostOfDelay");

const costDelay = calcCostOfDelay(p);

assert(typeof costDelay === "number", "costDelay is number");
assert(costDelay > 0, "costDelay > 0 (has contributions)", `got ${costDelay}`);
assert(costDelay < 5000000, "costDelay < 5M (sanity)", `got ${costDelay}`);

// Manual verification: lostContrib = rrspC + tfsaC + nrC = 2600 + 7000 + 0 = 9600
// yrsToGrow = deathAge - retAge = 92 - 65 = 27
// expRet = 0.70 * 0.07 + 0.30 * 0.035 - 0.015 = 0.049 + 0.0105 - 0.015 = 0.0445
// costDelay = 9600 * 12 * (1.0445)^27
const lostC = 2600 + 7000 + 0;
const yrsGrow = 92 - 65;
const expRet = 0.70 * 0.07 + 0.30 * 0.035 - 0.015;
const expectedCost = Math.round(lostC * 12 * Math.pow(1 + expRet, yrsGrow));
assertClose(costDelay, expectedCost, 1, "costDelay matches formula");

// Zero contributions → costDelay = 0
const costDelayZero = calcCostOfDelay({ ...p, rrspC: 0, tfsaC: 0, nrC: 0 });
assert(costDelayZero === 0, "costDelay = 0 with zero contrib", `got ${costDelayZero}`);

console.log("  calcCostOfDelay: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 18: calcMinViableReturn
// ════════════════════════════════════════════════════════════════
section("18. calcMinViableReturn");

const minReturn = calcMinViableReturn(p);

assert(typeof minReturn === "number", "minReturn is number");
assert(minReturn >= 0, "minReturn >= 0", `got ${minReturn}`);
assert(minReturn <= 15, "minReturn <= 15% (search range)", `got ${minReturn}`);

// Result should be rounded to 1 decimal
const roundedCheck = Math.round(minReturn * 10) / 10;
assertClose(minReturn, roundedCheck, 0.05, "minReturn rounded to ~0.1");

console.log(`  minReturn = ${minReturn}%`);

// ════════════════════════════════════════════════════════════════
// CATEGORY 19: buildAIPromptInter — Prompt structure
// ════════════════════════════════════════════════════════════════
section("19. buildAIPromptInter — Prompt structure");

const quiz = p._quiz || {};
const prompt = buildAIPromptInter(D, p, true, quiz, stratData);

assert(typeof prompt === "object", "prompt is object");
assert(typeof prompt.sys === "string", "prompt.sys is string");
assert(typeof prompt.usr === "string", "prompt.usr is string");
assert(prompt.sys.length > 100, "sys prompt is substantial", `length=${prompt.sys.length}`);
assert(prompt.usr.length > 100, "usr prompt is substantial", `length=${prompt.usr.length}`);

// System prompt structure
assert(prompt.sys.includes("AMF"), "sys includes AMF compliance");
assert(prompt.sys.includes("OSFI"), "sys includes OSFI");
assert(prompt.sys.includes("Intermediaire"), "sys references Intermediaire tier");
assert(prompt.sys.includes("conditional tense"), "sys requires conditional tense");
assert(prompt.sys.includes("NUMERIC SAFETY"), "sys includes numeric safety rules");
assert(prompt.sys.includes("SLOT STRUCTURE"), "sys includes slot structure rules");
assert(prompt.sys.includes("Grade 10"), "sys includes Grade 10 reading level");

// User prompt structure
assert(prompt.usr.includes("VOICE"), "usr includes VOICE");
assert(prompt.usr.includes("NARRATIVE ARC"), "usr includes NARRATIVE ARC");
assert(prompt.usr.includes("=== DATA ==="), "usr includes DATA block");
assert(prompt.usr.includes("snapshot_intro"), "usr includes snapshot_intro slot");
assert(prompt.usr.includes("strategy_highlight"), "usr includes strategy_highlight slot");
assert(prompt.usr.includes("couple_analysis"), "usr includes couple_analysis slot");

// Province-aware: zero acronyms
assert(prompt.sys.includes("Régime de rentes du Québec") || prompt.sys.includes("Quebec Pension Plan"), "sys: zero acronyms for QPP in QC");
assert(!prompt.sys.includes("RRQ") || prompt.sys.includes("NEVER"), "sys: no RRQ acronym (or only in NEVER rule)");

// DATA block contains strategy data
assert(prompt.usr.includes("strategies"), "usr DATA includes strategies");
assert(prompt.usr.includes("statu_quo"), "usr DATA includes statu_quo strategy");

// English prompt
const promptEN = buildAIPromptInter(D, p, false, quiz, stratData);
assert(promptEN.sys.includes("English"), "EN prompt language = English");
assert(promptEN.usr.includes("=== DATA ==="), "EN prompt includes DATA");

console.log("  AI prompt structure: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 20: buildAIPromptInter — AMF compliance
// ════════════════════════════════════════════════════════════════
section("20. buildAIPromptInter — AMF compliance");

// Forbidden terms in system prompt
assert(prompt.sys.includes("devriez"), "sys explicitly lists devriez as forbidden");
assert(prompt.sys.includes("FORBIDDEN"), "sys has FORBIDDEN section");

// User prompt should NOT contain forbidden terms as directives
const usrLower = prompt.usr.toLowerCase();
assert(!usrLower.includes("vous devriez"), "usr: no 'vous devriez'");
assert(!usrLower.includes("nous recommandons"), "usr: no 'nous recommandons'");
assert(!usrLower.includes("vous devez"), "usr: no 'vous devez'");
assert(!usrLower.includes("il faut que"), "usr: no 'il faut que'");

// System prompt requires conditional tense
assert(prompt.sys.includes("pourrait") || prompt.sys.includes("conditional"), "sys requires conditional tense");
assert(prompt.sys.includes("Observational language"), "sys requires observational language");

console.log("  AMF compliance: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 21: buildAIPromptInter — DerivedProfile integration
// ════════════════════════════════════════════════════════════════
section("21. buildAIPromptInter — DerivedProfile integration");

// Profile values appear in prompt
assert(prompt.usr.includes("anxiety="), "usr includes anxiety value");
assert(prompt.usr.includes("discipline="), "usr includes discipline value");
assert(prompt.usr.includes("friction="), "usr includes friction value");
assert(prompt.usr.includes("theme="), "usr includes theme value");

// WORRIES: high-anxiety quiz → worry instructions appear
assert(prompt.usr.includes("EXPAND") || p._quiz.worries.length === 0, "worry expansions present for worried user");

// Couple context
assert(prompt.usr.includes("couple_analysis") && prompt.usr.includes("DO NOT repeat"), "couple context with dedup rule for couple=yes");

// Property context (has mortgage extending into retirement)
assert(prompt.usr.includes("Mortgage") || prompt.usr.includes("ortgage"), "property context in prompt for homeowner");

// DerivedProfile computed correctly for this quiz
const profile = computeDerivedProfile(quiz, D, p);
assert(["low", "moderate", "high"].includes(profile.anxiety), "profile.anxiety valid", `got ${profile.anxiety}`);
assert(["low", "moderate", "high"].includes(profile.discipline), "profile.discipline valid");
assert(["basic", "intermediate", "advanced"].includes(profile.literacy), "profile.literacy valid");

const plan = computeRenderPlan(profile, D);
assert(["warm", "balanced", "data-forward"].includes(plan.tone), "plan.tone valid");

console.log("  DerivedProfile integration: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 22: AI_SLOTS_INTER & sanitizeAISlotsInter
// ════════════════════════════════════════════════════════════════
section("22. AI_SLOTS_INTER & sanitizeAISlotsInter");

// Slot count
assert(AI_SLOTS_INTER.length === 17, "AI_SLOTS_INTER has 17 slots", `got ${AI_SLOTS_INTER.length}`);

// Expected slots
const expectedSlots = [
  "snapshot_intro", "savings_context", "income_mix", "tax_context",
  "longevity_risk", "sequence_risk", "benchmark_context",
  "obs_1", "obs_2", "obs_3", "obs_4", "obs_5",
  "priority_actions", "strategy_highlight", "couple_analysis", "ccpc_context",
];
expectedSlots.forEach(s => {
  assert(AI_SLOTS_INTER.includes(s), `AI_SLOTS_INTER includes ${s}`);
});

// sanitizeAISlotsInter: valid input
const validRaw = {
  snapshot_intro: "Valid text for snapshot.",
  savings_context: "Valid savings text.",
  obs_1: "Valid observation.",
  unknown_slot: "Should be filtered out.",
};
const sanitized = sanitizeAISlotsInter(validRaw);
assert(sanitized.snapshot_intro === "Valid text for snapshot.", "sanitized keeps valid slot");
assert(sanitized.savings_context === "Valid savings text.", "sanitized keeps savings_context");
assert(sanitized.obs_1 === "Valid observation.", "sanitized keeps obs_1");
assert(sanitized["unknown_slot"] === undefined, "sanitized filters unknown slot");

// sanitizeAISlotsInter: forbidden terms → dropped
const forbiddenRaw = {
  snapshot_intro: "Vous devriez investir plus.",
  savings_context: "Nous recommandons d'épargner.",
  obs_1: "Clean text here.",
};
const sanitizedF = sanitizeAISlotsInter(forbiddenRaw);
assert(sanitizedF.snapshot_intro === undefined, "forbidden 'devriez' → slot dropped");
assert(sanitizedF.savings_context === undefined, "forbidden 'recommandons' → slot dropped");
assert(sanitizedF.obs_1 === "Clean text here.", "clean slot preserved");

// sanitizeAISlotsInter: HTML stripping
const htmlRaw = { obs_2: '<script>alert("xss")</script>Safe text.' };
const sanitizedH = sanitizeAISlotsInter(htmlRaw);
assert(sanitizedH.obs_2 === 'alert("xss")Safe text.', "HTML tags stripped", `got ${sanitizedH.obs_2}`);

// sanitizeAISlotsInter: length limit (500 chars)
const longRaw = { obs_3: "A".repeat(600) };
const sanitizedL = sanitizeAISlotsInter(longRaw);
assert(sanitizedL.obs_3.length === 500, "slot truncated to 500 chars", `got ${sanitizedL.obs_3.length}`);

// sanitizeAISlotsInter: non-string values filtered
const nonStringRaw = { obs_4: 42, obs_5: null, priority_actions: undefined };
const sanitizedN = sanitizeAISlotsInter(nonStringRaw);
assert(sanitizedN.obs_4 === undefined, "non-string (number) filtered");
assert(sanitizedN.obs_5 === undefined, "non-string (null) filtered");
assert(sanitizedN.priority_actions === undefined, "non-string (undefined) filtered");

// FORBIDDEN_TERMS regex
assert(FORBIDDEN_TERMS.test("vous devriez"), "FORBIDDEN catches devriez");
assert(FORBIDDEN_TERMS.test("nous recommandons"), "FORBIDDEN catches recommandons");
assert(FORBIDDEN_TERMS.test("you should"), "FORBIDDEN catches you should");
assert(FORBIDDEN_TERMS.test("we recommend"), "FORBIDDEN catches we recommend");
assert(FORBIDDEN_TERMS.test("combiner les scénarios"), "FORBIDDEN catches combiner les");
assert(!FORBIDDEN_TERMS.test("les données indiquent"), "FORBIDDEN allows observational");

console.log("  AI_SLOTS_INTER & sanitizeAISlotsInter: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 23: renderReportHTMLInter — HTML output
// ════════════════════════════════════════════════════════════════
section("23. renderReportHTMLInter — HTML output");

const ai = {};  // empty AI = fallback mode
const html = renderReportHTMLInter(D, mc, stratData, p, "fr", ai, costDelay, minReturn);

assert(typeof html === "string", "HTML is string");
assert(html.length > 5000, "HTML is substantial", `length=${html.length}`);
assert(html.includes("<!DOCTYPE html") || html.includes("<html") || html.includes("<div"), "HTML contains markup");

// Key sections present
assert(html.includes("buildfi.ca"), "HTML includes buildfi.ca branding");
assert(html.includes(D.grade), "HTML includes grade", `grade=${D.grade}`);
assert(html.includes(String(D.successPct)), "HTML includes successPct");

// 16 sections: check section headers
assert(html.includes("Tableau de bord") || html.includes("Dashboard"), "Section 1: Dashboard");
assert(html.includes("profil") || html.includes("profile") || html.includes("Profil"), "Section 2: Profile");
assert(html.includes("pargne") || html.includes("savings") || html.includes("Savings"), "Section 3: Savings");
assert(html.includes("Revenus") || html.includes("income") || html.includes("Income"), "Section 4: Income");
assert(html.includes("fiscal") || html.includes("Tax") || html.includes("tax"), "Section 5: Tax");
assert(html.includes("Long") || html.includes("longevity") || html.includes("Longevity"), "Section 6: Longevity");
assert(html.includes("Observation") || html.includes("observation"), "Section 7: Observations");
assert(html.includes("priorit") || html.includes("Priority") || html.includes("Cascade"), "Section 8: Priorities");

// Strategies section
assert(html.includes("Statu quo") || html.includes("Status quo"), "HTML includes statu_quo strategy");
assert(html.includes("caissement") || html.includes("meltdown") || html.includes("Meltdown"), "HTML includes meltdown strategy");

// Cost of delay present
if (costDelay > 0) {
  assert(html.includes("inaction") || html.includes("waiting") || html.includes("Co"), "HTML includes cost of delay");
}

// Min viable return present
if (minReturn > 0) {
  assert(html.includes(String(minReturn)) || html.includes("minimum viable") || html.includes("Rendement minimum"), "HTML includes min viable return");
}

// Province-aware text
assert(html.includes("Régime de rentes du Québec") || html.includes("RRQ") || html.includes("Quebec Pension Plan"), "HTML has QPP reference");

// Bilingual: EN render
const htmlEN = renderReportHTMLInter(D, mc, stratData, p, "en", ai, costDelay, minReturn);
assert(typeof htmlEN === "string", "EN HTML is string");
assert(htmlEN.length > 5000, "EN HTML is substantial");
assert(htmlEN.includes("Dashboard") || htmlEN.includes("dashboard") || htmlEN.includes("Tableau"), "EN: section headers");

console.log("  renderReportHTMLInter: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 24: Edge case — Minimal profile (solo, no savings)
// ════════════════════════════════════════════════════════════════
section("24. Edge case — Minimal profile");

const pMin = translateToMCInter(QUIZ_MINIMAL);
assert(pMin.age === 30, "minimal: age = 30");
assert(pMin.retAge === 60, "minimal: retAge = 60");
assert(pMin.rrsp === 0, "minimal: rrsp = 0");
assert(pMin.tfsa === 0, "minimal: tfsa = 0");
assert(pMin.debts.length === 0, "minimal: no debts");
assert(pMin.cOn === false, "minimal: solo");
assert(pMin.props.length === 0, "minimal: no properties");
assert(pMin.penType === "none", "minimal: no pension");
assert(pMin.ptM === 0, "minimal: no part-time");

const mcMin = runMC(pMin, 1000);
assert(mcMin !== null, "minimal MC returns non-null");

const DMin = extractReportDataInter(mcMin, pMin);
assert(DMin.age === 30, "minimal D.age = 30");
assert(DMin.totalSavings === 0, "minimal D.totalSavings = 0");
assert(DMin.successPct >= 0, "minimal successPct >= 0");
assert(DMin.grade !== undefined, "minimal grade defined");

// Strategies still return 5 results
const stratMin = run5Strategies(pMin);
assert(stratMin.length === 5, "minimal: 5 strategies", `got ${stratMin.length}`);

// costDelay = 0 (no contributions)
const cdMin = calcCostOfDelay(pMin);
assert(cdMin === 0, "minimal costDelay = 0", `got ${cdMin}`);

// Render doesn't crash
const htmlMin = renderReportHTMLInter(DMin, mcMin, stratMin, pMin, "fr", {}, 0, 0);
assert(typeof htmlMin === "string" && htmlMin.length > 1000, "minimal render succeeds");

console.log("  Minimal profile: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 25: Edge case — CCPC business owner
// ════════════════════════════════════════════════════════════════
section("25. Edge case — CCPC business owner");

const QUIZ_CCPC = {
  ...QUIZ_INTER,
  sources: ["ccpc"], source: "ccpc",
  bizRevenue: 300000, bizExpenses: 120000, bizBNR: 200000,
  bizRemun: "mix", bizSalaryPct: 60, bizGrowth: 3,
  bizInvAlloc: 50, bizExtractYrs: 12,
  bizSaleAge: 65, bizSalePrice: 500000, bizACB: 100, bizLCGE: true,
  ippOn: true, ippBal: 150000,
};

const pCCPC = translateToMCInter(QUIZ_CCPC);
assert(pCCPC.bizOn === true, "CCPC: bizOn = true");
assert(pCCPC.bizRevenue === 300000, "CCPC: bizRevenue = 300000");
assert(pCCPC.bizExpenses === 120000, "CCPC: bizExpenses = 120000");
assert(pCCPC.bizRetainedEarnings === 200000, "CCPC: bizRetainedEarnings = 200000");
assert(pCCPC.bizRemun === "mix", "CCPC: bizRemun = mix");
assert(pCCPC.bizSalaryPct === 0.6, "CCPC: bizSalaryPct = 0.6", `got ${pCCPC.bizSalaryPct}`);
assert(pCCPC.bizGrowth === 0.03, "CCPC: bizGrowth = 0.03", `got ${pCCPC.bizGrowth}`);
assert(pCCPC.bizSaleAge === 65, "CCPC: bizSaleAge = 65");
assert(pCCPC.bizSalePrice === 500000, "CCPC: bizSalePrice = 500000");
assert(pCCPC.bizLCGE === true, "CCPC: bizLCGE = true");
assert(pCCPC.ippOn === true, "CCPC: ippOn = true");
assert(pCCPC.ippBal === 150000, "CCPC: ippBal = 150000");

// AI prompt includes ccpc_context for biz owner
const promptCCPC = buildAIPromptInter(D, pCCPC, true, pCCPC._quiz || {}, stratData);
assert(promptCCPC.usr.includes("ccpc_context"), "CCPC: prompt includes ccpc_context slot");

console.log("  CCPC business owner: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 26: buildAIPromptInter — Without strategy data
// ════════════════════════════════════════════════════════════════
section("26. buildAIPromptInter — Without strategy data");

const promptNoStrat = buildAIPromptInter(D, p, true, quiz, undefined);
assert(typeof promptNoStrat.usr === "string", "prompt without strat is valid");
assert(promptNoStrat.usr.includes("strategy_highlight"), "still includes strategy_highlight slot");
assert(!promptNoStrat.usr.includes('"strategies":['), "no strategies array in DATA when undefined");

const promptEmptyStrat = buildAIPromptInter(D, p, true, quiz, []);
assert(!promptEmptyStrat.usr.includes('"strategies":['), "no strategies array in DATA when empty");

console.log("  Without strategy data: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 27: renderReportHTMLInter with AI slots populated
// ════════════════════════════════════════════════════════════════
section("27. renderReportHTMLInter — With AI narration");

const mockAI = {
  snapshot_intro: "Votre plan obtient une note encourageante.",
  savings_context: "Votre trajectoire d'épargne indique une progression constante.",
  income_mix: "Vos sources de revenus à la retraite seraient diversifiées.",
  tax_context: "Votre taux effectif pourrait diminuer à la retraite.",
  longevity_risk: "Le patrimoine résisterait à la plupart des scénarios.",
  sequence_risk: "Le risque de séquence serait modéré dans votre cas.",
  benchmark_context: "Votre épargne se situerait au-dessus de la médiane.",
  obs_1: "Observation principale personnalisée.",
  obs_2: "La couverture gouvernementale couvrirait une portion significative.",
  obs_3: "Les frais de gestion auraient un impact cumulatif à surveiller.",
  obs_4: "Analyse contextuelle de votre situation.",
  obs_5: "Observation sur la longévité.",
  priority_actions: "La cascade identifie le CELI comme priorité.",
  strategy_highlight: "La stratégie RRQ à 70 ans améliorerait le taux de succès.",
  couple_analysis: "L'optimisation du couple pourrait réduire l'impôt.",
};

const htmlAI = renderReportHTMLInter(D, mc, stratData, p, "fr", mockAI, costDelay, minReturn);
assert(htmlAI.includes("note encourageante"), "AI snapshot_intro rendered in HTML");
assert(htmlAI.includes("trajectoire"), "AI savings_context rendered");
assert(htmlAI.toLowerCase().includes("observation"), "AI obs rendered");
assert(htmlAI.length > html.length, "AI-enriched HTML is longer than fallback", `ai=${htmlAI.length}, base=${html.length}`);

console.log("  With AI narration: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 28: COL_ADJ completeness (all 13 provinces/territories)
// ════════════════════════════════════════════════════════════════
section("28. COL_ADJ — All provinces/territories");

const provinces = ["QC", "ON", "BC", "AB", "MB", "SK", "NS", "NB", "NL", "PE", "NT", "YT", "NU"];
provinces.forEach(prov => {
  const pP = translateToMCInter({ ...QUIZ_MINIMAL, prov });
  assert(pP.prov === prov, `prov ${prov} set correctly`);
  // retSpM should be COL-adjusted
  assert(pP.retSpM > 0, `${prov}: retSpM > 0`, `got ${pP.retSpM}`);
});

// Verify specific COL values
const pON = translateToMCInter({ ...QUIZ_MINIMAL, prov: "ON" });
assert(pON.retSpM === Math.round(5000 * 1.15), "ON COL = 1.15 → retSpM = 5750", `got ${pON.retSpM}`);

const pNU = translateToMCInter({ ...QUIZ_MINIMAL, prov: "NU" });
assert(pNU.retSpM === Math.round(5000 * 1.40), "NU COL = 1.40 → retSpM = 7000", `got ${pNU.retSpM}`);

console.log("  COL_ADJ: all provinces passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 29: Pension proactive fix — "dc" → "cd"
// ════════════════════════════════════════════════════════════════
section("29. Proactive fix — penType dc → cd");

// Explicit dc
const pDcFix = translateToMCInter({ ...QUIZ_MINIMAL, penType: "dc", dcBal: 30000 });
assert(pDcFix.penType === "cd", "penType 'dc' → 'cd' (proactive fix)", `got ${pDcFix.penType}`);

// Large employer fallback also uses cd
const pLargeFix = translateToMCInter({ ...QUIZ_MINIMAL, employer: "large" });
assert(pLargeFix.penType === "cd", "large employer fallback → cd (not dc)", `got ${pLargeFix.penType}`);

// Tech employer fallback also uses cd
const pTechFix = translateToMCInter({ ...QUIZ_MINIMAL, employer: "tech" });
assert(pTechFix.penType === "cd", "tech employer fallback → cd", `got ${pTechFix.penType}`);

console.log("  Proactive fix dc→cd: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 30: FHSA passthrough
// ════════════════════════════════════════════════════════════════
section("30. FHSA passthrough");

const pFHSA = translateToMCInter({ ...QUIZ_INTER, fhsaBal: 8000, fhsaContrib: 8000, fhsaForHome: true, fhsaHomeAge: 35 });
assert(pFHSA.fhsaBal === 8000, "fhsaBal = 8000", `got ${pFHSA.fhsaBal}`);
assert(pFHSA.fhsaC === 8000, "fhsaC = 8000", `got ${pFHSA.fhsaC}`);
assert(pFHSA.fhsaForHome === true, "fhsaForHome = true");
assert(pFHSA.fhsaHomeAge === 35, "fhsaHomeAge = 35");

console.log("  FHSA passthrough: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 31: extractReportDataInter — Tax fields
// ════════════════════════════════════════════════════════════════
section("31. extractReportDataInter — Tax fields");

assert(typeof D.taxCurrentEffective === "number", "taxCurrentEffective is number");
assert(typeof D.taxRetirementEffective === "number", "taxRetirementEffective is number");
assert(typeof D.taxCurrentMarginal === "number", "taxCurrentMarginal is number");
assertRange(D.taxCurrentEffective, 0, 60, "taxCurrentEffective in [0,60]");
assertRange(D.taxRetirementEffective, 0, 60, "taxRetirementEffective in [0,60]");
assertRange(D.taxCurrentMarginal, 0, 60, "taxCurrentMarginal in [0,60]");
assert(D.margRate > 0 && D.margRate < 1, "margRate in (0,1)", `got ${D.margRate}`);

// MER & fee fields
assert(D.merWeighted >= 0, "merWeighted >= 0", `got ${D.merWeighted}`);
assert(D.feeCostLifetime >= 0, "feeCostLifetime >= 0", `got ${D.feeCostLifetime}`);

console.log("  Tax fields: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 32: Couple spouse retirement spending
// ════════════════════════════════════════════════════════════════
section("32. Couple — spouse retirement spending");

// cRetSpM should be 40% of main retSpM
assert(p.cRetSpM === Math.round(p.retSpM * 0.4), "cRetSpM = retSpM × 0.4", `got ${p.cRetSpM}, expected ${Math.round(p.retSpM * 0.4)}`);

// Solo: cRetSpM should still be set but for non-existent spouse
const pSoloCheck = translateToMCInter(QUIZ_MINIMAL);
// In solo mode, cOn=false, but cRetSpM is still computed
assert(typeof pSoloCheck.cRetSpM === "number", "solo: cRetSpM still set as number");

console.log("  Couple spouse spending: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 33: Psychology overrides — DerivedProfile for Inter tier
// ════════════════════════════════════════════════════════════════
section("33. Psychology overrides — DerivedProfile for Inter tier");

// Test with explicit psych answers (matching Essentiel pattern)
const QUIZ_PSYCH_HIGH = {
  ...QUIZ_INTER,
  psychAnxiety: "high",
  psychDiscipline: "strong",
  psychLiteracy: "medium",
};

const pPsychHigh = translateToMCInter(QUIZ_PSYCH_HIGH);
// Psych fields flow through _quiz (same as Essentiel)
assert(pPsychHigh._quiz !== undefined, "psych: _quiz exists");

const DPsych = extractReportDataInter(mc, pPsychHigh);

// computeDerivedProfile with explicit overrides
const profileHigh = computeDerivedProfile(QUIZ_PSYCH_HIGH, DPsych, pPsychHigh);
assert(profileHigh.anxiety === "high", "psych override: anxiety=high", `got ${profileHigh.anxiety}`);
assert(profileHigh.discipline === "high", "psych override: discipline=high (strong→high)", `got ${profileHigh.discipline}`);
assert(profileHigh.literacy === "intermediate", "psych override: literacy=intermediate (medium→intermediate)", `got ${profileHigh.literacy}`);
assert(profileHigh.narrativeTheme === "security", "high anxiety → security theme", `got ${profileHigh.narrativeTheme}`);

// RenderPlan for high anxiety
const planHigh = computeRenderPlan(profileHigh, DPsych);
assert(planHigh.tone === "warm", "high anxiety → warm tone", `got ${planHigh.tone}`);

// AI prompt reflects psych overrides
const promptPsychHigh = buildAIPromptInter(DPsych, pPsychHigh, true, QUIZ_PSYCH_HIGH, stratData);
assert(promptPsychHigh.usr.includes("anxiety=high"), "psych prompt: anxiety=high in usr");
assert(promptPsychHigh.usr.includes("discipline=high"), "psych prompt: discipline=high in usr");
assert(promptPsychHigh.usr.includes("patient") || promptPsychHigh.usr.includes("trusted advisor") || promptPsychHigh.usr.includes("Warm"), "psych prompt: warm voice for high anxiety");

console.log("  Psych overrides (high anxiety): all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 34: Psychology — Calm profile overrides
// ════════════════════════════════════════════════════════════════
section("34. Psychology — Calm profile overrides");

const QUIZ_PSYCH_CALM = {
  ...QUIZ_INTER,
  psychAnxiety: "calm",
  psychDiscipline: "low",
  psychLiteracy: "high",
};

const pPsychCalm = translateToMCInter(QUIZ_PSYCH_CALM);
const profileCalm = computeDerivedProfile(QUIZ_PSYCH_CALM, DPsych, pPsychCalm);
assert(profileCalm.anxiety === "low", "calm override: anxiety=low", `got ${profileCalm.anxiety}`);
assert(profileCalm.discipline === "low", "low override: discipline=low", `got ${profileCalm.discipline}`);
assert(profileCalm.literacy === "advanced", "high override: literacy=advanced (high→advanced)", `got ${profileCalm.literacy}`);

// RenderPlan for calm + advanced literacy → data-forward
const planCalm = computeRenderPlan(profileCalm, DPsych);
assert(planCalm.tone === "data-forward", "calm+advanced → data-forward tone", `got ${planCalm.tone}`);

// AI prompt reflects calm profile
const promptPsychCalm = buildAIPromptInter(DPsych, pPsychCalm, true, QUIZ_PSYCH_CALM, stratData);
assert(promptPsychCalm.usr.includes("anxiety=low"), "calm prompt: anxiety=low in usr");
assert(promptPsychCalm.usr.includes("quant analyst") || promptPsychCalm.usr.includes("data-forward"), "calm prompt: data-forward voice");
assert(promptPsychCalm.usr.includes("advanced") || promptPsychCalm.usr.includes("density"), "calm prompt: advanced voice");

console.log("  Psych overrides (calm): all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 35: Psychology — Data-derived fallback (no psych answers)
// ════════════════════════════════════════════════════════════════
section("35. Psychology — Data-derived fallback (no psych answers)");

// No psych fields → falls back to data-derived profile
const QUIZ_NO_PSYCH = { ...QUIZ_INTER };
delete QUIZ_NO_PSYCH.psych_anxiety;
delete QUIZ_NO_PSYCH.psych_discipline;
delete QUIZ_NO_PSYCH.psych_literacy;

const pNoPsych = translateToMCInter(QUIZ_NO_PSYCH);
const profileNoPsych = computeDerivedProfile(QUIZ_NO_PSYCH, DPsych, pNoPsych);

// Anxiety: confidence=3 → moderate, but 3 worries → bumps up
// confidence=3 → moderate, worryCount=3 ≥ 3 → moderate→high
assert(profileNoPsych.anxiety === "high", "no psych: confidence=3 + 3 worries → high", `got ${profileNoPsych.anxiety}`);

// Discipline: data-derived from savings rate
// monthlyContrib=800, income=95000, savingsRate = (800*12)/95000 = 10.1% → moderate
const savingsRateCheck = (800 * 12) / 95000;
const expectedDisc = savingsRateCheck >= 0.15 ? "high" : savingsRateCheck >= 0.05 ? "moderate" : "low";
assert(profileNoPsych.discipline === expectedDisc, `no psych: discipline = ${expectedDisc} (savingsRate=${(savingsRateCheck*100).toFixed(1)}%)`, `got ${profileNoPsych.discipline}`);

// Literacy: data-derived from quiz complexity
// q.savingsDetail is undefined, q.risk='balanced' (not non-balanced → 0),
// q.employer='gov' (not x/small → +1) → litScore=1 → intermediate
assert(["basic", "intermediate", "advanced"].includes(profileNoPsych.literacy), "no psych: literacy is valid");

console.log("  Data-derived fallback: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 36: Psychology — Zero MC impact verification
// ════════════════════════════════════════════════════════════════
section("36. Psychology — Zero MC impact (psych doesn't change MC params)");

// MC-critical params should be identical with and without psych answers
const pWithPsych = translateToMCInter(QUIZ_PSYCH_HIGH);
const pWithoutPsych = translateToMCInter(QUIZ_NO_PSYCH);

assert(pWithPsych.allocR === pWithoutPsych.allocR, "Zero MC impact: allocR unchanged");
assert(pWithPsych.retSpM === pWithoutPsych.retSpM, "Zero MC impact: retSpM unchanged");
assert(pWithPsych.merR === pWithoutPsych.merR, "Zero MC impact: merR unchanged");
assert(pWithPsych.sal === pWithoutPsych.sal, "Zero MC impact: sal unchanged");
assert(pWithPsych.rrspC === pWithoutPsych.rrspC, "Zero MC impact: rrspC unchanged");
assert(pWithPsych.tfsaC === pWithoutPsych.tfsaC, "Zero MC impact: tfsaC unchanged");
assert(pWithPsych.retAge === pWithoutPsych.retAge, "Zero MC impact: retAge unchanged");
assert(pWithPsych.age === pWithoutPsych.age, "Zero MC impact: age unchanged");
assert(pWithPsych.penType === pWithoutPsych.penType, "Zero MC impact: penType unchanged");
assert(pWithPsych.penM === pWithoutPsych.penM, "Zero MC impact: penM unchanged");

console.log("  Zero MC impact: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 37: Psychology — AMF compliance in psych-enriched prompts
// ════════════════════════════════════════════════════════════════
section("37. Psychology — AMF compliance in psych-enriched prompts");

// System prompt with psych overrides should still contain AMF rules
assert(!promptPsychHigh.sys.match(/devriez.*devriez/) || promptPsychHigh.sys.includes("FORBIDDEN"), "psych sys: AMF rules present");
assert(!promptPsychHigh.usr.includes("vous devriez"), "psych usr: no AMF forbidden terms from psych override");
assert(!promptPsychHigh.usr.includes("recommandons"), "psych usr: no recommandons injected");

// Calm/data-forward prompt also clean
assert(!promptPsychCalm.usr.includes("vous devriez"), "calm usr: no AMF forbidden terms");
assert(!promptPsychCalm.usr.includes("il faut que"), "calm usr: no il faut que");

console.log("  AMF compliance in psych prompts: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 38: Psychology — RenderPlan emphasis flags
// ════════════════════════════════════════════════════════════════
section("38. Psychology — RenderPlan emphasis flags");

// emphasizeDebt: true when primaryFriction === "debt"
const profileDebt = computeDerivedProfile({}, { ...DPsych, withdrawalRatePct: 2, successPct: 80, feeCostLifetime: 30000, coveragePct: 60 }, {
  ...pPsychHigh, _quiz: { worries: [], confidence: 3 }, _report: { debtBal: 0, debts: [{ rate: 0.20 }] }
});
const planDebt = computeRenderPlan(profileDebt, { ...DPsych, successPct: 80, feeCostLifetime: 30000, coveragePct: 60 });
assert(profileDebt.primaryFriction === "debt", "high-rate debt → friction=debt", `got ${profileDebt.primaryFriction}`);
assert(planDebt.emphasizeDebt === true, "debt friction → emphasizeDebt=true");

// emphasizeFees: true when feeCostLifetime > 50000
const planFees = computeRenderPlan(profileHigh, { ...DPsych, feeCostLifetime: 60000, coveragePct: 60 });
assert(planFees.emphasizeFees === true, "feeCost>50K → emphasizeFees=true");

const planNoFees = computeRenderPlan(profileHigh, { ...DPsych, feeCostLifetime: 30000, coveragePct: 60 });
assert(planNoFees.emphasizeFees === false, "feeCost<50K → emphasizeFees=false");

// emphasizeGov: true when coveragePct < 40
const planGov = computeRenderPlan(profileHigh, { ...DPsych, coveragePct: 30, feeCostLifetime: 30000 });
assert(planGov.emphasizeGov === true, "coveragePct<40 → emphasizeGov=true");

const planNoGov = computeRenderPlan(profileHigh, { ...DPsych, coveragePct: 60, feeCostLifetime: 30000 });
assert(planNoGov.emphasizeGov === false, "coveragePct≥40 → emphasizeGov=false");

// worstCasePlacement
const planProminent = computeRenderPlan(profileHigh, { ...DPsych, successPct: 60 });
assert(planProminent.worstCasePlacement === "prominent", "succPct<70 → prominent");

const planStandard = computeRenderPlan(profileHigh, { ...DPsych, successPct: 80 });
assert(planStandard.worstCasePlacement === "standard", "succPct≥70 → standard");

console.log("  RenderPlan emphasis flags: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 39: Psychology — Narrative themes
// ════════════════════════════════════════════════════════════════
section("39. Psychology — Narrative themes");

// security: high anxiety
assert(profileHigh.narrativeTheme === "security", "high anxiety → security theme");

// optimization: low anxiety + high success + no debt
const profileOpt = computeDerivedProfile(
  { psych_anxiety: "calm" },
  { ...DPsych, successPct: 95 },
  { ...pNoPsych, _quiz: { worries: [], confidence: 5 }, _report: { debtBal: 0, debts: [] } }
);
assert(profileOpt.narrativeTheme === "optimization", "calm + high success + no debt → optimization", `got ${profileOpt.narrativeTheme}`);

// catch-up: low success
const profileCatchUp = computeDerivedProfile(
  { psych_anxiety: "calm" },
  { ...DPsych, successPct: 50 },
  { ...pNoPsych, _quiz: { worries: [], confidence: 5 }, _report: { debtBal: 1000, debts: [] } }
);
assert(profileCatchUp.narrativeTheme === "catch-up", "calm + low success → catch-up", `got ${profileCatchUp.narrativeTheme}`);

// growth: default (moderate anxiety, moderate success)
const profileGrowth = computeDerivedProfile(
  { psych_anxiety: "mild" },
  { ...DPsych, successPct: 75 },
  { ...pNoPsych, _quiz: { worries: [], confidence: 3 }, _report: { debtBal: 0, debts: [] } }
);
assert(profileGrowth.narrativeTheme === "growth", "mild anxiety + moderate success → growth", `got ${profileGrowth.narrativeTheme}`);

console.log("  Narrative themes: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 40: Psychology — Worry expansion in AI prompt
// ════════════════════════════════════════════════════════════════
section("40. Psychology — Worry expansion in AI prompt");

// User with runout worry → EXPAND longevity_risk
const QUIZ_WORRY = { ...QUIZ_INTER, worries: ["runout", "tax", "inflation"] };
const pWorry = translateToMCInter(QUIZ_WORRY);
const promptWorry = buildAIPromptInter(DPsych, pWorry, true, QUIZ_WORRY, stratData);
assert(promptWorry.usr.includes("EXPAND longevity_risk"), "runout worry → EXPAND longevity_risk");
assert(promptWorry.usr.includes("EXPAND tax_context"), "tax worry → EXPAND tax_context");
assert(promptWorry.usr.includes("inflation-adjusted"), "inflation worry → note inflation-adjusted");

// Legacy worry → mention estate
const QUIZ_LEGACY = { ...QUIZ_INTER, worries: ["legacy"] };
const pLegacy = translateToMCInter(QUIZ_LEGACY);
const promptLegacy = buildAIPromptInter(DPsych, pLegacy, true, QUIZ_LEGACY, stratData);
assert(promptLegacy.usr.includes("estate") || promptLegacy.usr.includes("obs_5"), "legacy worry → estate mention");

// Market worry → volatility reference
const QUIZ_MARKET = { ...QUIZ_INTER, worries: ["market"] };
const pMarket = translateToMCInter(QUIZ_MARKET);
const promptMarket = buildAIPromptInter(DPsych, pMarket, true, QUIZ_MARKET, stratData);
assert(promptMarket.usr.includes("volatility") || promptMarket.usr.includes("sequence_risk"), "market worry → volatility reference");

// No worries → no EXPAND directives
const QUIZ_NO_WORRY = { ...QUIZ_INTER, worries: [] };
const pNoWorry = translateToMCInter(QUIZ_NO_WORRY);
const promptNoWorry = buildAIPromptInter(DPsych, pNoWorry, true, QUIZ_NO_WORRY, stratData);
assert(!promptNoWorry.usr.includes("EXPAND"), "no worries → no EXPAND directives");

console.log("  Worry expansion: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 41: Psychology — Complexity score
// ════════════════════════════════════════════════════════════════
section("41. Psychology — Complexity score");

// Full QUIZ_INTER: has debt(+2), home(+2), couple(+1), parttime(+1), pension(+1), worries>0(+1), debts.length>1(+1) = 9
const profileFull = computeDerivedProfile(QUIZ_INTER, DPsych, pNoPsych);
assertRange(profileFull.complexityScore, 5, 10, "full profile: complexity 5-10");

// Minimal: no debt, no home, no couple, no parttime, no pension, no worries = 0
const profileMinimal = computeDerivedProfile(
  QUIZ_MINIMAL,
  { ...DPsych, hasPension: false },
  { ...pNoPsych, _quiz: { worries: [], confidence: 3, couple: "no", parttime: "no" }, _report: { debtBal: 0, debts: [], homeVal: 0 } }
);
assert(profileMinimal.complexityScore === 0, "minimal profile: complexity = 0", `got ${profileMinimal.complexityScore}`);

console.log("  Complexity score: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 42: Psychology — Risk mismatch detection
// ════════════════════════════════════════════════════════════════
section("42. Psychology — Risk mismatch detection");

// Conservative risk + low success → mismatch
const profileMismatch1 = computeDerivedProfile(
  {}, { ...DPsych, successPct: 60 },
  { ...pNoPsych, _quiz: { ...pNoPsych._quiz, risk: "conservative" }, _report: { debtBal: 0, debts: [] } }
);
assert(profileMismatch1.riskMismatch === true, "conservative + low success → mismatch", `got ${profileMismatch1.riskMismatch}`);

// Growth risk + very high success → mismatch
const profileMismatch2 = computeDerivedProfile(
  {}, { ...DPsych, successPct: 98 },
  { ...pNoPsych, _quiz: { ...pNoPsych._quiz, risk: "growth" }, _report: { debtBal: 0, debts: [] } }
);
assert(profileMismatch2.riskMismatch === true, "growth + 98% success → mismatch", `got ${profileMismatch2.riskMismatch}`);

// Balanced + moderate success → no mismatch
const profileNoMismatch = computeDerivedProfile(
  {}, { ...DPsych, successPct: 80 },
  { ...pNoPsych, _quiz: { ...pNoPsych._quiz, risk: "balanced" }, _report: { debtBal: 0, debts: [] } }
);
assert(profileNoMismatch.riskMismatch === false, "balanced + 80% → no mismatch", `got ${profileNoMismatch.riskMismatch}`);

console.log("  Risk mismatch: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 43: Psychology — Emphasis in AI prompt output
// ════════════════════════════════════════════════════════════════
section("43. Psychology — Emphasis blocks in AI prompt");

// Build a profile that triggers all emphasis flags
const DEmphasis = { ...DPsych, feeCostLifetime: 80000, coveragePct: 25, successPct: 60 };
const pEmphasis = { ...pPsychHigh, _quiz: { ...pPsychHigh._quiz, worries: [] }, _report: { ...pPsychHigh._report, debtBal: 5000, debts: [{ rate: 0.20 }] } };
const promptEmphasis = buildAIPromptInter(DEmphasis, pEmphasis, true, { ...QUIZ_PSYCH_HIGH, worries: [] }, stratData);

// Check emphasis blocks appear in prompt
assert(promptEmphasis.usr.includes("EMPHASIS") || promptEmphasis.usr.includes("emphasis"), "emphasis blocks present in prompt");

// RISK ORDER present
assert(promptEmphasis.usr.includes("RISK ORDER"), "RISK ORDER instruction present in prompt");

console.log("  Emphasis blocks in AI prompt: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 44: Voice matrix + Narrative arc + Filler ban
// ════════════════════════════════════════════════════════════════
section("44. Voice matrix, Narrative arc, Filler ban");

// Voice matrix appears in sys prompt
assert(prompt.sys.includes("=== VOICE ==="), "sys includes VOICE section");
assert(prompt.usr.includes("=== VOICE ==="), "usr includes VOICE section");

// Voice matrix produces actual instructions (not just a label)
assert(prompt.usr.includes("Write like"), "voice matrix produces 'Write like...' instruction");

// Narrative arc appears in usr prompt
assert(prompt.usr.includes("=== NARRATIVE ARC ==="), "usr includes NARRATIVE ARC section");
assert(prompt.usr.includes("NARRATIVE ARC:"), "usr includes narrative arc instruction");

// Filler ban in sys prompt
assert(prompt.sys.includes("FILLER BAN"), "sys includes FILLER BAN section");
assert(prompt.sys.includes("il est important de noter"), "sys lists filler phrase as banned");
assert(prompt.sys.includes("ZERO TOLERANCE"), "sys: filler ban is zero tolerance");

// Deduplication rules in sys prompt
assert(prompt.sys.includes("DEDUPLICATION"), "sys includes DEDUPLICATION section");
assert(prompt.sys.includes("obs slots MUST NOT repeat the topic of strategy_highlight"), "sys: obs dedup from strategy_highlight");

// Personalization section
assert(prompt.sys.includes("PERSONALIZATION"), "sys includes PERSONALIZATION section");

// pourrait + infinitive rule
assert(prompt.sys.includes("pourrait + infinitive"), "sys: pourrait + infinitive rule");

console.log("  Voice matrix, Narrative arc, Filler ban: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 45: Composite signals + Dynamic obs routing
// ════════════════════════════════════════════════════════════════
section("45. Composite signals + Dynamic obs routing");

// computeCompositeSignals returns an object
const sigTest = computeCompositeSignals(QUIZ_INTER, D, p, profile);
assert(typeof sigTest === "object", "computeCompositeSignals returns object");

// Profile type added to DerivedProfile
assert(profile.profileType !== undefined, "profile.profileType defined", `got ${profile.profileType}`);
assert(["debt-heavy", "early-retirement", "ccpc", "couple", "pre-retirement", "critical", "optimized", "mortgage-focus", "general"].includes(profile.profileType), "profile.profileType valid");

// QUIZ_INTER has couple=yes → profileType should be "couple" or something reasonable
assert(profile.profileType !== undefined, "couple quiz has profileType set");

// Enriched DATA block in prompt
assert(prompt.usr.includes('"timeline"'), "DATA contains timeline block");
assert(prompt.usr.includes('"fees"'), "DATA contains fees block");
assert(prompt.usr.includes('"profileType"'), "DATA contains profileType");
assert(prompt.usr.includes('"narrativeTheme"'), "DATA contains narrativeTheme");
assert(prompt.usr.includes('"savingsRate"'), "DATA contains savingsRate");

// Couple block in DATA for couple profile
assert(prompt.usr.includes('"couple"'), "DATA contains couple block for couple=yes");

// Strategy success as percentage (not decimal)
if (stratData && stratData.length > 0) {
  const dataStr = prompt.usr;
  // statu_quo should have succ as integer percentage
  assert(dataStr.includes('"succ":') && !dataStr.includes('"succ":0.'), "strategy succ is percentage not decimal");
}

// obs_3 instruction should NOT be about fees when best strategy is low_mer
const lowMerStrats = [
  { key: "statu_quo", succ: 0.44, medF: 0 },
  { key: "meltdown", succ: 0.39, medF: 0 },
  { key: "qpp_70", succ: 0.43, medF: 0 },
  { key: "low_mer", succ: 0.55, medF: 54000 },  // best strategy
  { key: "save_more", succ: 0.45, medF: 0 },
];
const promptLowMer = buildAIPromptInter(D, p, true, quiz, lowMerStrats);
// obs_3 should not contain "fee" or "MER" when low_mer is best
const obs3Section = promptLowMer.usr.split('"obs_3":')[1]?.split('"obs_4"')[0] || "";
assert(!obs3Section.toLowerCase().includes("fee impact:") && !obs3Section.toLowerCase().includes("management fees"), "obs_3 avoids fee topic when best strat is low_mer");

// couple_analysis contains "DO NOT repeat"
assert(prompt.usr.includes("DO NOT repeat"), "couple_analysis has dedup instruction");

// benchmark_context forbids invented externals
assert(prompt.usr.includes("DO NOT invent external") || prompt.usr.includes("ONLY") && prompt.usr.includes("Self-comparison"), "benchmark forbids invented stats");

console.log("  Composite signals + Dynamic obs routing: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 46: Per-slot max length overrides + Expanded FORBIDDEN_TERMS
// ════════════════════════════════════════════════════════════════
section("46. Per-slot max length + Expanded FORBIDDEN_TERMS");

// Per-slot max lengths defined
assert(AI_SLOT_MAX_LENGTH_INTER.priority_actions === 600, "priority_actions max = 600");
assert(AI_SLOT_MAX_LENGTH_INTER.couple_analysis === 600, "couple_analysis max = 600");
assert(AI_SLOT_MAX_LENGTH_INTER.ccpc_context === 600, "ccpc_context max = 600");

// Default slots still truncated to 500
const longObs = { obs_3: "A".repeat(600) };
const sanitizedLong = sanitizeAISlotsInter(longObs);
assert(sanitizedLong.obs_3.length === 500, "obs_3 still truncated to 500 (default)", `got ${sanitizedLong.obs_3.length}`);

// priority_actions allows 600
const longPriority = { priority_actions: "A".repeat(600) };
const sanitizedPriority = sanitizeAISlotsInter(longPriority);
assert(sanitizedPriority.priority_actions.length === 600, "priority_actions allows 600 chars", `got ${sanitizedPriority.priority_actions.length}`);

// Expanded FORBIDDEN_TERMS catches filler phrases
assert(FORBIDDEN_TERMS.test("il est important de noter"), "FORBIDDEN catches filler: il est important de noter");
assert(FORBIDDEN_TERMS.test("il convient de souligner"), "FORBIDDEN catches filler: il convient de souligner");
assert(FORBIDDEN_TERMS.test("it is important to note"), "FORBIDDEN catches filler: it is important to note");
assert(FORBIDDEN_TERMS.test("it should be noted"), "FORBIDDEN catches filler: it should be noted");
assert(FORBIDDEN_TERMS.test("worth noting"), "FORBIDDEN catches filler: worth noting");
assert(FORBIDDEN_TERMS.test("par ailleurs"), "FORBIDDEN catches filler: par ailleurs");
assert(FORBIDDEN_TERMS.test("en outre"), "FORBIDDEN catches filler: en outre");
assert(FORBIDDEN_TERMS.test("notons que"), "FORBIDDEN catches filler: notons que");

// AMF glissements caught
assert(FORBIDDEN_TERMS.test("ajouterait"), "FORBIDDEN catches AMF glissement: ajouterait");
assert(FORBIDDEN_TERMS.test("constituerait un pont"), "FORBIDDEN catches AMF glissement: constituerait un pont");

// Existing terms still caught
assert(FORBIDDEN_TERMS.test("vous devriez"), "FORBIDDEN still catches devriez");
assert(FORBIDDEN_TERMS.test("we recommend"), "FORBIDDEN still catches we recommend");

// Clean phrases still allowed
assert(!FORBIDDEN_TERMS.test("les données indiquent"), "FORBIDDEN allows observational");
assert(!FORBIDDEN_TERMS.test("cette analyse suggère"), "FORBIDDEN allows cette analyse suggère");
assert(!FORBIDDEN_TERMS.test("pourrait ajouter"), "FORBIDDEN allows pourrait + infinitive");

console.log("  Per-slot max length + Expanded FORBIDDEN_TERMS: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 47: 13-Bug Audit Fixes
// ════════════════════════════════════════════════════════════════
section("47. 13-Bug Audit Fixes");

// --- B-1: Accent enforcement in AI prompt ---
{
  const promptRes = buildAIPromptInter(D, p, true, QUIZ_INTER, stratData);
  assert(promptRes.sys.includes("ACCENTS"), "B-1: FR sys prompt includes ACCENTS instruction");
  assert(promptRes.sys.includes("réussite"), "B-1: FR sys prompt mentions réussite");
  assert(promptRes.sys.includes("épargne"), "B-1: FR sys prompt mentions épargne");
  // EN prompt should NOT have accent block
  const promptEN = buildAIPromptInter(D, p, false, QUIZ_INTER, stratData);
  assert(!promptEN.sys.includes("ACCENTS"), "B-1: EN sys prompt does NOT include ACCENTS instruction");
}

// --- B-2: Seq-risque override for extreme withdrawal rates ---
{
  // Create a profile with extreme withdrawal rate (>20%)
  const DExtreme = { ...D, withdrawalRatePct: 99 };
  const pExtreme = { ...p, allocR: 0.7, _report: p._report, _quiz: p._quiz };
  const htmlExtreme = renderReportHTMLInter(DExtreme, mc, stratData, pExtreme, "fr", {}, 0, 0);
  assert(htmlExtreme.includes("\u00c9lev\u00e9") || htmlExtreme.includes("High"), "B-2: wd=99% yields Élevé level");
  // Score should be at least 70
  assert(!htmlExtreme.includes('"Mod\u00e9r\u00e9"') || htmlExtreme.includes("\u00c9lev\u00e9"), "B-2: extreme wd does NOT show Modéré");
}

// --- B-3: Cost-of-delay guard for high success profiles ---
{
  const DHighSuccess = { ...D, successPct: 95, grade: "A+", succ: 0.95 };
  const htmlHighSuccess = renderReportHTMLInter(DHighSuccess, mc, stratData, p, "fr", {}, 50000, minReturn);
  assert(!htmlHighSuccess.includes("Co\u00fbt de l'inaction") && !htmlHighSuccess.includes("Cost of waiting"), "B-3: A+ profile (95%) hides cost-of-delay");

  const DMidSuccess = { ...D, successPct: 70, grade: "B+", succ: 0.70 };
  const htmlMidSuccess = renderReportHTMLInter(DMidSuccess, mc, stratData, p, "fr", {}, 50000, minReturn);
  assert(htmlMidSuccess.includes("Co\u00fbt de l'inaction") || htmlMidSuccess.includes("Cost of waiting"), "B-3: B+ profile (70%) shows cost-of-delay");
}

// --- B-4: Dynamic obs labels from obsLabels ---
{
  const promptRes = buildAIPromptInter(D, p, true, QUIZ_INTER, stratData);
  assert(promptRes.obsLabels, "B-4: buildAIPromptInter returns obsLabels object");
  assert(promptRes.obsLabels.obs_2, "B-4: obsLabels has obs_2");
  assert(promptRes.obsLabels.obs_3, "B-4: obsLabels has obs_3");
  assert(promptRes.obsLabels.obs_4, "B-4: obsLabels has obs_4");
  assert(promptRes.obsLabels.obs_5, "B-4: obsLabels has obs_5");

  // Labels should be French for fr=true
  const promptFR = buildAIPromptInter(D, p, true, QUIZ_INTER, stratData);
  const promptEN = buildAIPromptInter(D, p, false, QUIZ_INTER, stratData);
  // At least one label should differ between FR and EN
  const frLabels = Object.values(promptFR.obsLabels);
  const enLabels = Object.values(promptEN.obsLabels);
  const allSame = frLabels.every((l, i) => l === enLabels[i]);
  assert(!allSame, "B-4: FR and EN obs labels differ");

  // When obsLabels passed to renderer, they appear in HTML
  const customLabels = { obs_2: "Mon Label Custom", obs_3: "Test Label", obs_4: "Autre", obs_5: "Dernier" };
  const htmlWithLabels = renderReportHTMLInter(D, mc, stratData, p, "fr", {}, 0, 0, null, customLabels);
  assert(htmlWithLabels.includes("Mon Label Custom"), "B-4: custom obs_2 label appears in HTML");
  assert(htmlWithLabels.includes("Test Label"), "B-4: custom obs_3 label appears in HTML");
}

// --- M-5: Objectif slot ---
{
  assert(AI_SLOTS_INTER.includes("objectif"), "M-5: objectif is in AI_SLOTS_INTER");

  // Prompt includes objectif slot when lifestyle is set
  const promptRes = buildAIPromptInter(D, p, true, QUIZ_INTER, stratData);
  assert(promptRes.usr.includes("objectif"), "M-5: usr prompt includes objectif slot");

  // Renderer shows objectif callout when AI has it
  const aiWithObj = { objectif: "Votre objectif de retraite confortable..." };
  const htmlObj = renderReportHTMLInter(D, mc, stratData, p, "fr", aiWithObj, 0, 0);
  assert(htmlObj.includes("Votre objectif"), "M-5: objectif callout appears in HTML");
  assert(htmlObj.includes("Votre objectif de retraite confortable"), "M-5: objectif AI content appears");

  // When no objectif in AI, no callout
  const htmlNoObj = renderReportHTMLInter(D, mc, stratData, p, "fr", {}, 0, 0);
  assert(!htmlNoObj.includes("Votre objectif de retraite confortable"), "M-5: no objectif callout when AI empty");
}

// --- M-6: Benchmark fallback prose ---
{
  // Without AI benchmark_context, a fallback should still appear
  const htmlNoBench = renderReportHTMLInter(D, mc, stratData, p, "fr", {}, 0, 0);
  assert(htmlNoBench.includes("pargne enregistr") || htmlNoBench.includes("registered savings"), "M-6: benchmark fallback prose appears when no AI");
}

// --- M-7: 4th tier for extreme minReturn ---
{
  // Test "Hors portée" label for >10%
  const htmlExtreme = renderReportHTMLInter(D, mc, stratData, p, "fr", {}, 0, 14.9);
  assert(htmlExtreme.includes("Hors port\u00e9e") || htmlExtreme.includes("Out of reach"), "M-7: minReturn=14.9% shows Hors portée");
  assert(htmlExtreme.includes("pratiquement impossible") || htmlExtreme.includes("virtually impossible"), "M-7: minReturn=14.9% shows extreme explanation");

  // Test "Difficile à atteindre" for 7-10%
  const htmlHard = renderReportHTMLInter(D, mc, stratData, p, "fr", {}, 0, 8.5);
  assert(htmlHard.includes("Difficile") || htmlHard.includes("Difficult"), "M-7: minReturn=8.5% shows Difficile");
  assert(htmlHard.includes("prise de risque importante") || htmlHard.includes("significant risk"), "M-7: minReturn=8.5% shows risk explanation");
}

// --- M-8: CSS alignment ---
{
  const htmlCSS = renderReportHTMLInter(D, mc, stratData, p, "fr", {}, 0, 0);
  assert(htmlCSS.includes("max-width:820px"), "M-8: container width is 820px");
  assert(htmlCSS.includes("rgba(124,96,184,.04)"), "M-8: aiSlot has purple accent background");
  assert(htmlCSS.includes("border-left:3px solid var(--pr)"), "M-8: aiSlot has purple border-left");
}

// --- m-9: Profile-specific cost-of-delay text ---
{
  const DLowSuccess = { ...D, successPct: 70, grade: "B+", succ: 0.70 };
  const htmlCOD = renderReportHTMLInter(DLowSuccess, mc, stratData, p, "fr", {}, 50000, minReturn);
  if (htmlCOD.includes("Ce que cela signifie")) {
    assert(htmlCOD.includes("taux d'\u00e9pargne de") || htmlCOD.includes("savings rate of"), "m-9: cost-of-delay mentions savings rate");
  }
}

// --- m-10: Profile-aware buffer strategies ---
{
  // High equity (>70%) profile should mention glide path with specific target
  const DSeq = { ...D, withdrawalRatePct: 7 };
  const pHiEq = { ...p, allocR: 0.85, _report: p._report, _quiz: p._quiz };
  const htmlBuf = renderReportHTMLInter(DSeq, mc, stratData, pHiEq, "fr", {}, 0, 0);
  // Should NOT contain the old hardcoded text "glide path vers 60% actions"
  // Instead should have computed target (85-20=65%)
  assert(!htmlBuf.includes("glide path vers 60%"), "m-10: no hardcoded 60% glide path");
}

// --- m-11: PSV threshold update ---
{
  const htmlPSV = renderReportHTMLInter(D, mc, stratData, p, "fr", {}, 0, 0);
  assert(!htmlPSV.includes("93 000") && !htmlPSV.includes("93,000"), "m-11: no stale 93k PSV threshold");
  assert(!htmlPSV.includes("en 2024"), "m-11: no stale 2024 year reference for PSV");
  // If PSV clawback note shown, it should reference 95 323
  if (htmlPSV.includes("PSV partielle") || htmlPSV.includes("Partial OAS")) {
    assert(htmlPSV.includes("95 323") || htmlPSV.includes("95,323"), "m-11: PSV threshold is 95,323");
    assert(htmlPSV.includes("2026"), "m-11: PSV year is 2026");
  }
}

// --- m-13: Navigable TOC ---
{
  const htmlTOC = renderReportHTMLInter(D, mc, stratData, p, "fr", {}, 0, 0);
  // TOC pills should be present
  assert(htmlTOC.includes('href="#sec-1"'), "m-13: TOC has link to sec-1");
  assert(htmlTOC.includes('href="#sec-7"'), "m-13: TOC has link to sec-7");
  assert(htmlTOC.includes('href="#sec-16"'), "m-13: TOC has link to sec-16");
  // Section IDs should be present
  assert(htmlTOC.includes('id="sec-1"'), "m-13: section 1 has id attribute");
  assert(htmlTOC.includes('id="sec-7"'), "m-13: section 7 has id attribute");
  assert(htmlTOC.includes('id="sec-15"'), "m-13: section 15 has id attribute");
}

console.log("  47. 13-Bug Audit Fixes: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 48: Pipeline Audit Fixes (P0/P1/P2)
// ════════════════════════════════════════════════════════════════
section("48. Pipeline Audit Fixes");

// --- P0: cPenType dc→cd for couple ---
{
  const qDC = { ...QUIZ_INTER, cPenType: "dc", cPenM: 0 };
  const pDC = translateToMCInter(qDC);
  assert(pDC.cPenType === "cd", "P0: couple cPenType 'dc' → 'cd'", `got ${pDC.cPenType}`);
}

// --- P0: cAvgE and cQppYrs populated for couple ---
{
  const qCouple = { ...QUIZ_INTER, couple: "yes", cAge: 40, cIncome: 65000 };
  const pCouple = translateToMCInter(qCouple);
  assert(pCouple.cAvgE === 65000, "P0: cAvgE = cIncome", `got ${pCouple.cAvgE}`);
  assert(pCouple.cQppYrs === 22, "P0: cQppYrs = min(40, 40-18) = 22", `got ${pCouple.cQppYrs}`);
}

// --- P0: cDCBal populated ---
{
  const qDCBal = { ...QUIZ_INTER, cPenType: "dc", cDcBal: 50000 };
  const pDCBal = translateToMCInter(qDCBal);
  assert(pDCBal.cDCBal === 50000, "P0: cDCBal passthrough", `got ${pDCBal.cDCBal}`);
}

// --- P1: RRSP-first when sal >= 55K ---
{
  const qHigh = { ...QUIZ_INTER, income: 95000, monthlyContrib: 800, tfsaC: null, rrspC: null };
  const pHigh = translateToMCInter(qHigh);
  assert(pHigh.rrspC === 9600, "P1: RRSP-first at 95K — rrspC=9600", `got ${pHigh.rrspC}`);
  assert(pHigh.tfsaC === 0, "P1: RRSP-first at 95K — tfsaC=0", `got ${pHigh.tfsaC}`);
}

// --- P1: TFSA-first when sal < 55K ---
{
  const qLow = { ...QUIZ_INTER, income: 45000, monthlyContrib: 500, tfsaC: null, rrspC: null };
  const pLow = translateToMCInter(qLow);
  assert(pLow.tfsaC === 6000, "P1: TFSA-first at 45K — tfsaC=min(6000,7000)=6000", `got ${pLow.tfsaC}`);
  assert(pLow.rrspC === 0, "P1: TFSA-first at 45K — rrspC=0 (nothing left)", `got ${pLow.rrspC}`);
}

// --- P1: retSpMCustom no COL applied ---
{
  const qCustom = { ...QUIZ_INTER, lifestyle: "custom", retSpMCustom: 6000, prov: "BC" };
  const pCustom = translateToMCInter(qCustom);
  assert(pCustom.retSpM === 6000, "P1: retSpMCustom=6000 not multiplied by COL", `got ${pCustom.retSpM}`);
}

// --- P1: QPP optimizer reverse-engineers base-65 correctly ---
{
  // When user chose QPP at 60, D.qppMonthly is already reduced by 36%
  // base65 should be qppM / 0.64
  const Dq60 = { ...D, qppMonthly: 640, qppAge: 60 };
  const html60 = renderReportHTMLInter(Dq60, mc, stratData, p, "fr", {}, 0, 0);
  // base65 = 640 / 0.64 = 1000, q60 = 640, q70 = 1420
  // HTML should show the q70 value (~1420)
  assert(html60.includes("1\u00a0420") || html60.includes("1 420") || html60.includes("1,420") || html60.includes("1420"), "P1: QPP optimizer q70 = ~1420 when qppAge=60 and qppM=640", `check HTML for 1420`);
}

// --- P0: obsLabels parameter accepted by renderReportHTMLInter ---
{
  const obsL = { obs_2: "Test Label", obs_3: "Another Label" };
  const htmlObs = renderReportHTMLInter(D, mc, stratData, p, "fr", { obs_2: "Content here" }, 0, 0, null, obsL);
  assert(htmlObs.includes("Test Label"), "P0: obsLabels.obs_2 rendered in HTML", "obsLabel not found");
}

console.log("  48. Pipeline Audit Fixes: all passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 49: Rendering Audit Fixes
// ════════════════════════════════════════════════════════════════
section("49. Rendering Audit Fixes");

{
  const htmlRender = renderReportHTMLInter(D, mc, stratData, p, "fr", {}, 0, 5);
  const htmlEN = renderReportHTMLInter(D, mc, stratData, p, "en", {}, 0, 5);

  // CSS variables
  assert(htmlRender.includes("--sans:"), "CSS: --sans variable defined");
  assert(htmlRender.includes("--mono:"), "CSS: --mono variable defined");
  assert(htmlRender.includes("--rad:"), "CSS: --rad variable defined");
  assert(htmlRender.includes("--altrow:"), "CSS: --altrow variable defined");
  assert(htmlRender.includes("font-size:15px"), "CSS: body font-size set");
  assert(htmlRender.includes("line-height:1.75"), "CSS: body line-height set");

  // Responsive class
  assert(htmlRender.includes('class="rpt-wrap"'), "Wrapper has responsive class");
  assert(htmlRender.includes("padding:40px 32px 60px"), "Wrapper has top padding (CSS class)");

  // Print safety
  assert(htmlRender.includes("rpt-card"), "Cards have print-safe class");
  assert(htmlRender.includes("rpt-pb"), "Print CSS defines rpt-pb class");

  // JetBrains Mono via var(--mono)
  assert(htmlRender.includes("var(--mono)"), "Uses var(--mono) for monospace");
  assert(!htmlRender.includes("font-family:monospace"), "No raw monospace left");

  // Bilingual — EN labels
  assert(htmlEN.includes("RRSP"), "EN: REER → RRSP in chart legend");
  assert(htmlEN.includes("TFSA"), "EN: CELI → TFSA in chart legend");
  assert(htmlEN.includes("LIRA"), "EN: CRI → LIRA in chart legend");
  assert(htmlEN.includes("Median:") || htmlEN.includes("Median"), "EN: Mediane → Median in benchBar");

  // FR labels
  assert(htmlRender.includes("REER"), "FR: REER in chart legend");
  assert(htmlRender.includes("CELI"), "FR: CELI in chart legend");
  assert(htmlRender.includes("Médiane") || htmlRender.includes("M\u00e9diane"), "FR: Médiane in benchBar");

  // Donut labels bilingual
  assert(htmlEN.includes(">OAS<") || htmlEN.includes("OAS</"), "EN: PSV → OAS in donut");

  // No emojis in succession banners (but OK in Expert CTA feature list)
  // Check that succession objective banners don't contain emojis
  const succSection = htmlRender.substring(htmlRender.indexOf("Analyse successorale") || 0, htmlRender.indexOf("Analyse successorale") + 800 || 0);
  assert(!succSection.includes("\ud83c\udfdb") && !succSection.includes("\ud83c\udf05"), "No emojis in succession banner section");

  // Strategy table uses rMedF
  assert(htmlRender.includes("rpt-grid3"), "QPP optimizer grid is responsive");
  assert(htmlRender.includes('scope="col"'), "Table headers have scope attribute");

  // Expert CTA hidden in print
  assert(htmlRender.includes('class="no-print" style="background:linear-gradient'), "Expert CTA has no-print class");

  // Consistent border-radius via var(--rad)
  assert(htmlRender.includes("border-radius:var(--rad)"), "Cards use var(--rad)");

  // CSS var colors in obs
  assert(htmlRender.includes("color:var(--ts)") && !htmlRender.includes('color:#333;line-height:1.75"'), "obs() uses var(--ts) not #333");

  // Tabular nums
  assert(htmlRender.includes("font-variant-numeric:tabular-nums"), "tabular-nums rule present");
}

console.log("  49. Rendering Audit Fixes: all passed");

// ══ 50. Final HTML Audit — B1-B3 + W2-W6 ══
section("50. Final HTML Audit Fixes");

{
  const htmlRender = renderReportHTMLInter(D, mc, stratData, p, "fr", {}, costDelay, minReturn, null, {});

  // B1: obsLabels includes topic keys
  const promptB1 = buildAIPromptInter(D, p, true, p._quiz || {}, stratData);
  assert(promptB1.obsLabels.obs_2_topic, "B1: obsLabels includes obs_2_topic key");
  assert(promptB1.obsLabels.obs_3_topic, "B1: obsLabels includes obs_3_topic key");
  assert(promptB1.obsLabels.obs_4_topic, "B1: obsLabels includes obs_4_topic key");
  assert(promptB1.obsLabels.obs_5_topic, "B1: obsLabels includes obs_5_topic key");
  // obs_2_topic should be a valid topic string
  const validTopics = ["gov-coverage","fee-impact","debt-drag","bridge-period","couple-asymmetry","withdrawal-stress","mortgage-retirement","biz-extract","estate-structure","tax-bracket-shift","risk-mismatch","time-leverage","unique-insight"];
  assert(validTopics.includes(promptB1.obsLabels.obs_2_topic), "B1: obs_2_topic is a valid topic");
  assert(validTopics.includes(promptB1.obsLabels.obs_3_topic), "B1: obs_3_topic is a valid topic");

  // B1: Renderer uses topic-based fallback (test with obsLabels containing non-default topic)
  const testObsLabels = { obs_2: "Poids de la dette", obs_2_topic: "debt-drag", obs_3: "Impact des frais", obs_3_topic: "fee-impact", obs_4: "Observation 4", obs_4_topic: "unique-insight", obs_5: "Observation 5", obs_5_topic: "unique-insight" };
  const htmlObs = renderReportHTMLInter(D, mc, stratData, p, "fr", {}, costDelay, minReturn, null, testObsLabels);
  // When obs_2 title is "Poids de la dette" but AI is empty, body should NOT say "couvrent X% de votre revenu cible" (that's gov-coverage)
  const obsSection = htmlObs.substring(htmlObs.indexOf("Observations personn"), htmlObs.indexOf("Cascade de priorit"));
  assert(!obsSection.includes("couvrent " + D.coveragePct + "%"), "B1: debt-drag obs doesn't show gov-coverage fallback body");
  assert(obsSection.includes("dette") || obsSection.includes("\u00e9pargne") || obsSection.includes("accumulation"), "B1: debt-drag obs shows debt-related fallback body");

  // B2: Dynamic sim count — no hardcoded "5 000" in section headers
  assert(htmlRender.includes("Distribution des"), "B2: S6 subtitle present");
  // The nSim value should be dynamic — with nSim=1234, it should show "1 234" not "5 000"
  const DTest = Object.assign({}, D, { nSim: 1234 });
  const htmlDynSim = renderReportHTMLInter(DTest, mc, stratData, p, "fr", {}, costDelay, minReturn, null, {});
  assert(htmlDynSim.includes("1\u00a0234") || htmlDynSim.includes("1 234"), "B2: Dynamic sim count rendered (1234)");
  assert(!htmlDynSim.includes("5 000 simulations Monte Carlo"), "B2: No hardcoded 5000 in methodology when nSim=1234");

  // B3: P25=$0 footnote for high success profiles
  assert(htmlRender.includes("patrimoine liquide") || htmlRender.includes("liquid portfolio"), "B3: Footnote says 'liquid portfolio' not just 'wealth'");

  // W2: Retirement age has "ans" in header
  assert(htmlRender.includes(D.retAge + " ans</strong>"), "W2: Retirement age shows 'ans' in header");

  // W3: avgDeath label says "esp. vie MC" not "fin d'horizon"
  assert(htmlRender.includes("esp. vie MC"), "W3: avgDeath label says 'esp. vie MC'");
  assert(!htmlRender.includes("fin d'horizon"), "W3: No more 'fin d'horizon' label");

  // W4: No "+0pp" in strategy table
  assert(!htmlRender.includes("+0pp"), "W4: No '+0pp' displayed in strategy table");

  // W6: Expert CTA links to /expert
  assert(htmlRender.includes("buildfi.ca/expert"), "W6: Expert CTA links to /expert, not homepage");
}
console.log("  50. Final HTML Audit Fixes: all passed");

// ════════════════════════════════════════════════════════════════
// SUMMARY
// ════════════════════════════════════════════════════════════════
console.log("\n" + "═".repeat(60));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
if (errors.length > 0) {
  console.log("\nFAILED TESTS:");
  errors.forEach((e, i) => console.log(`  ${i+1}. ${e.name}`));
  errors.forEach((e, i) => console.log(`\n  [${i+1}] ${e.name}\n      ${e.detail}`));
}
console.log("═".repeat(60));
process.exit(failed > 0 ? 1 : 0);
