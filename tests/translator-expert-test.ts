// Quick verification of translateToMCExpert with 5 test profiles
// Run: npx tsx tests/translator-expert-test.ts

import { translateToMCExpert } from "../lib/quiz-translator-expert";

const profiles: Record<string, Record<string, any>> = {
  // Segment D: FIRE
  youngPro: {
    age: 34, retAge: 45, sex: "M", prov: "QC", income: 110000,
    couple: "no", sources: ["employed"], employer: "tech",
    rrsp: 80000, tfsa: 95000, nr: 40000, monthlyContrib: 3000,
    lifestyle: "cozy", risk: "growth", allocCustom: 90,
    parttime: "no", worries: ["runout", "market"],
    objective: "early", confidence: 5, decaissement: "meltdown",
    homeowner: false, hasRental: false, debts: [],
    sophistication: "avance", fireTarget: true,
  },
  // Segment A: Couple
  coupleDB: {
    age: 48, retAge: 63, sex: "M", prov: "QC", income: 80000,
    couple: "yes", cAge: 46, cSex: "F", cIncome: 65000,
    cRetAge: 63, cPenType: "none", cQppAge: 65, cOasAge: 65,
    sources: ["employed"], employer: "large",
    rrsp: 60000, tfsa: 40000, nr: 10000, monthlyContrib: 800,
    cRrsp: 50000, cTfsa: 30000, cNr: 0,
    lifestyle: "active", risk: "balanced",
    parttime: "maybe", worries: ["tax", "health", "runout"],
    objective: "enjoy", confidence: 3, decaissement: "minimal",
    homeowner: true, homeValue: 450000, mortgage: 180000, mortgageAmort: 15,
    hasRental: false, debts: [],
    penType: "none",
    sophistication: "rapide",
    lifeInsBenefit: 200000, lifeInsPremium: 80,
  },
  // Segment B: CCPC
  ccpcOptim: {
    age: 42, retAge: 60, sex: "M", prov: "QC", income: 80000,
    couple: "no", sources: ["employed", "ccpc"],
    rrsp: 30000, tfsa: 50000, nr: 20000, monthlyContrib: 500,
    bizRevenue: 200000, bizExpenses: 50000, bizBNR: 350000,
    bizRemun: "mix", bizSalaryPct: 50, bizGrowth: 3,
    lifestyle: "active", risk: "balanced",
    parttime: "no", worries: ["tax"],
    objective: "optimize", confidence: 4, decaissement: "meltdown",
    homeowner: true, homeValue: 550000, mortgage: 200000, mortgageAmort: 18,
    hasRental: true, rentalValue: 300000, rentalMortgage: 150000,
    rentalIncome: 24000, rentalExpenses: 8000, rentalVacancy: 5,
    debts: [{ type: "loc", amount: 15000, rate: 7.5, minPayment: 200 }],
    sophistication: "personnalise",
    toggleMort: true, toggleFatT: true, toggleInf: true, toggleGK: false, toggleGlide: true,
    inheritAmt: 100000, inheritAge: 65,
  },
  // Segment C: Pre-retiree
  preretireeDB: {
    age: 58, retAge: 63, sex: "M", prov: "ON", income: 95000,
    couple: "yes", cAge: 56, cSex: "F", cIncome: 50000,
    cRetAge: 63, cPenType: "db", cPenM: 1500, cQppAge: 65, cOasAge: 65,
    sources: ["employed"], employer: "gov",
    rrsp: 280000, tfsa: 95000, nr: 30000, monthlyContrib: 1200,
    cRrsp: 120000, cTfsa: 60000, cNr: 10000,
    lifestyle: "active", risk: "conservative",
    parttime: "no", worries: ["inflation", "health", "legacy"],
    objective: "protect", confidence: 3, decaissement: "needs",
    penType: "db", penM: 3500, penYrs: 30, penIdx: true, penBridge: true,
    homeowner: true, homeValue: 600000, mortgage: 0, mortgageAmort: 0,
    hasRental: false, debts: [],
    qppAge: 65, oasAge: 67,
    sophistication: "rapide",
    lifeInsBenefit: 500000, lifeInsPremium: 200, lifeInsType: "term", lifeInsDuration: 10,
    succObjective: "maximize",
    respKids: 2, respKidAges: "14, 17", respBal: 45000, respC: 5000,
  },
  // Standard balanced
  standard: {
    age: 40, retAge: 65, sex: "F", prov: "BC", income: 75000,
    couple: "no", sources: ["employed"], employer: "small",
    rrsp: 35000, tfsa: 25000, nr: 5000, monthlyContrib: 500,
    lifestyle: "active", risk: "balanced",
    parttime: "no", worries: ["runout"],
    objective: "enjoy", confidence: 3, decaissement: "minimal",
    homeowner: true, homeValue: 750000, mortgage: 400000, mortgageAmort: 22,
    hasRental: false, debts: [{ type: "cc", amount: 3000, rate: 19.99, minPayment: 60 }],
    sophistication: "rapide",
  },
};

let pass = 0;
let fail = 0;

for (const [name, quiz] of Object.entries(profiles)) {
  try {
    const result = translateToMCExpert(quiz);
    const { mcParams, disclosure, defaults } = result;

    // Structural checks
    const checks: [string, boolean][] = [
      ["has mcParams", !!mcParams && typeof mcParams === "object"],
      ["has disclosure.tabs", Array.isArray(disclosure.tabs) && disclosure.tabs.length >= 5],
      ["has disclosure.segment", typeof disclosure.segment === "string" && disclosure.segment.length > 0],
      ["has disclosure.sophistication", typeof disclosure.sophistication === "string"],
      ["has defaults", typeof defaults === "object"],
      ["age set", mcParams.age === quiz.age],
      ["retAge set", mcParams.retAge === quiz.retAge],
      ["sex set", mcParams.sex === quiz.sex],
      ["prov set", mcParams.prov === quiz.prov],
      ["sal set", mcParams.sal === quiz.income],
      ["has _quiz", !!mcParams._quiz],
      ["has _report", !!mcParams._report],
      ["props array", Array.isArray(mcParams.props)],
      ["debts array", Array.isArray(mcParams.debts)],
    ];

    let profileFail = false;
    for (const [label, ok] of checks) {
      if (!ok) {
        console.error(`  FAIL [${name}] ${label}`);
        fail++;
        profileFail = true;
      } else {
        pass++;
      }
    }

    if (!profileFail) {
      console.log(`  OK   [${name}] segment=${disclosure.segment} tabs=${disclosure.tabs.length} defaults=${Object.values(defaults).flat().length}`);
    }
  } catch (err) {
    console.error(`  CRASH [${name}]`, err);
    fail++;
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
