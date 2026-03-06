// /lib/quiz-translator-expert.ts
// Converts ~110 quiz answers into ~190 MC engine parameters (Expert tier)
// Extends quiz-translator-inter.ts pattern — returns structured object instead of flat params.
//
// Three-layer architecture:
// Quiz answers → translateToMCExpert() → { mcParams, disclosure, defaults } → runMC()
//
// Constants & helpers duplicated (not imported) to keep modules independent.
// PROACTIVE FIX: penType="dc" changed to "cd" everywhere (engine expects "cd").

const DEBT_RATES: Record<string, number> = {
  cc: 0.1999,
  student: 0.055,
  car: 0.065,
  loc: 0.075,
};

const COL_ADJ: Record<string, number> = {
  QC: 1, ON: 1.15, BC: 1.35, AB: 1.05, MB: 0.92, SK: 0.90,
  NS: 0.95, NB: 0.88, NL: 0.93, PE: 0.87, NT: 1.25, YT: 1.20, NU: 1.40,
};

const PMED: Record<string, number> = {
  QC: 380000, ON: 620000, BC: 850000, AB: 440000, MB: 320000, SK: 310000,
  NS: 360000, NB: 260000, NL: 270000, PE: 280000, NT: 400000, YT: 420000, NU: 380000,
};

function amortDebt(bal: number, rate: number, pay: number) {
  if (bal <= 0) return { months: 0, totalInt: 0, feasible: true };
  const mr = rate / 12;
  let b = bal, ti = 0, mo = 0;
  if (pay <= b * mr && mr > 0)
    return { months: 999, totalInt: Math.round(bal * rate * 50), feasible: false };
  while (b > 0.01 && mo < 600) {
    const ii = b * mr;
    b -= Math.min(b, pay - ii);
    ti += ii;
    mo++;
  }
  return { months: mo, totalInt: Math.round(ti), feasible: true };
}

function defMinPay(type: string, bal: number): number {
  if (type === "cc") return Math.max(Math.round(bal * 0.02), 25);
  if (type === "student") return Math.max(Math.round(bal / 120), 50);
  if (type === "car") return Math.max(Math.round(bal / 60), 100);
  return Math.max(
    Math.round(bal * 0.01),
    Math.round(bal * (DEBT_RATES[type] || 0.08) / 12)
  );
}

// --- Segment detection ---
function detectSegment(a: Record<string, any>): string {
  const srcs = a.sources || [a.source || "employed"];
  const bizOn = srcs.indexOf("ccpc") >= 0 && (a.bizRevenue || 0) > 0;
  const cOn = a.couple === "yes" && (a.cAge || 0) > 0;
  const homeowner = !!a.homeowner;
  const age = a.age || 35;
  const retAge = a.retAge || 65;

  // Explicit segment choice from Bloc H overrides auto-detection
  if (a.segmentGuide) return a.segmentGuide;

  // CCPC takes priority — complex tax situation
  if (bizOn) return "ccpc";
  // Pre-retiree: age > 55 with pension
  if (age >= 55 && (a.penType === "db" || a.employer === "gov")) return "preretiree";
  // FIRE: early retirement target or explicit FIRE keywords
  if (retAge <= 50 || a.fireTarget) return "fire";
  // Couple homeowner (most common)
  if (cOn && homeowner) return "couple";
  // Default
  return "couple";
}

// --- Tab activation ---
function detectTabs(a: Record<string, any>, segment: string): string[] {
  const tabs: string[] = ["diagnostic", "revenus", "projection", "patrimoine", "analyse"];

  const cOn = a.couple === "yes" && (a.cAge || 0) > 0;
  const srcs = a.sources || [a.source || "employed"];
  const bizOn = srcs.indexOf("ccpc") >= 0 && (a.bizRevenue || 0) > 0;

  if (cOn) tabs.push("couple");
  if (a.homeowner || a.hasRental) tabs.push("immobilier");
  if (a.penType === "db" || a.employer === "gov") tabs.push("strategie");
  if (bizOn) tabs.push("entreprise");
  if ((a.worries || []).some((w: string) => w === "tax" || w === "impot")) tabs.push("fiscalite");
  if ((a.risk === "growth" || a.risk === "custom") || segment === "fire") tabs.push("optimiseur");

  return tabs;
}

export interface ExpertTranslatorResult {
  mcParams: Record<string, any>;
  disclosure: {
    tabs: string[];
    segment: string;
    sophistication: string;
  };
  defaults: Record<string, string[]>; // category → list of auto-filled field names
}

export function translateToMCExpert(a: Record<string, any>): ExpertTranslatorResult {
  const defaults: Record<string, string[]> = {};
  const filled: string[] = []; // track auto-filled fields

  const age = a.age || 35;
  const retAge = a.retAge || 65;
  const sex = a.sex || "M";
  const prov = a.prov || "QC";
  const sal = a.income || 70000;
  const col = COL_ADJ[prov] || 1;

  // --- Savings (same as Inter) ---
  const rrsp = a.rrsp || 0;
  const tfsa = a.tfsa || 0;
  const nr = a.nr || 0;
  const liraBal = a.lira || 0;
  const dcBal = a.dcBal || 0;

  // Contributions
  const mc2 = a.monthlyContrib || 0;
  const ac = mc2 * 12;
  const tfsaC = a.tfsaC != null ? a.tfsaC : Math.min(ac, 7000);
  const rrspC = a.rrspC != null ? a.rrspC : Math.min(ac - tfsaC, Math.min(sal * 0.18, 33810));
  const nrC = Math.max(0, ac - tfsaC - rrspC);
  if (a.tfsaC == null) filled.push("tfsaC");
  if (a.rrspC == null) filled.push("rrspC");

  // --- Allocation détaillée (Expert-specific) ---
  // Expert allows per-account allocation; Inter uses single risk profile
  let allocR: number, allocT: number, allocN: number;
  if (a.allocRDetail != null) {
    allocR = Math.min(1, Math.max(0, a.allocRDetail / 100));
  } else if (a.risk === "conservative") { allocR = 0.50; filled.push("allocR"); }
  else if (a.risk === "growth") { allocR = 0.85; filled.push("allocR"); }
  else if (a.risk === "custom" && a.allocCustom > 0) { allocR = Math.min(1, Math.max(0, a.allocCustom / 100)); }
  else { allocR = 0.70; filled.push("allocR"); }

  if (a.allocTDetail != null) {
    allocT = Math.min(1, Math.max(0, a.allocTDetail / 100));
  } else { allocT = allocR; filled.push("allocT"); }

  if (a.allocNDetail != null) {
    allocN = Math.min(1, Math.max(0, a.allocNDetail / 100));
  } else { allocN = Math.max(0.3, allocR - 0.2); filled.push("allocN"); }

  // --- MER per account (Expert-specific) ---
  const defaultMer = allocR > 0.85 ? 0.020 : allocR > 0.7 ? 0.018 : allocR > 0.5 ? 0.015 : 0.012;
  const merR = a.merR != null ? a.merR / 100 : defaultMer;
  const merT = a.merT != null ? a.merT / 100 : defaultMer * 0.5;
  const merN = a.merN != null ? a.merN / 100 : defaultMer * 0.5;
  if (a.merR == null) filled.push("merR");
  if (a.merT == null) filled.push("merT");
  if (a.merN == null) filled.push("merN");

  // --- Salary growth (Expert-specific) ---
  const salGrowth = a.salGrowth != null ? a.salGrowth / 100 : 0.021;
  if (a.salGrowth == null) filled.push("salGrowth");

  // --- Pension logic (same as Inter) ---
  let penType = "none";
  let penM = 0;
  let penIdx: number = 0;
  let dcBal2 = dcBal;

  if (a.penType === "db") {
    penType = "db";
    penM = a.penM || Math.round(
      sal * Math.pow(salGrowth + 1, Math.max(0, retAge - age)) *
      0.02 * (a.penYrs || Math.min(35, Math.max(0, retAge - 25))) / 12
    );
    penIdx = a.penIdx ? 2 : 0; // engine: 2=full CPI, 1=half CPI, 0=none
    if (!a.penM) filled.push("penM");
  } else if (a.penType === "dc") {
    penType = "cd"; // engine expects "cd"
    dcBal2 = a.dcBal || dcBal;
  } else if (a.employer === "gov") {
    penType = "db";
    penIdx = 2; // government pensions are fully indexed
    const projYrs = a.penYrs > 0 ? a.penYrs : Math.min(35, Math.max(0, retAge - 25));
    const projSal = sal * Math.pow(salGrowth + 1, Math.max(0, retAge - age));
    penM = a.penM || Math.round(projSal * 0.02 * projYrs / 12);
    if (!a.penM) filled.push("penM");
  } else if (a.employer === "large" || a.employer === "tech") {
    penType = "cd";
    dcBal2 = a.dcBal || Math.round(sal * 0.06 * Math.min(20, Math.max(0, age - 25)));
    if (!a.dcBal) filled.push("dcBal");
  }

  // --- Retirement spending (same as Inter) ---
  let retSpM: number;
  if (a.retSpM && a.retSpM > 0) retSpM = a.retSpM;
  else if (a.lifestyle === "cozy") { retSpM = Math.round(3000 * col); filled.push("retSpM"); }
  else if (a.lifestyle === "premium") { retSpM = Math.round(7500 * col); filled.push("retSpM"); }
  else if (a.lifestyle === "custom" && a.retSpMCustom > 0) { retSpM = Math.round(a.retSpMCustom * col); }
  else { retSpM = Math.round(5000 * col); filled.push("retSpM"); }

  // --- QPP/OAS timing ---
  const qppAge = Math.max(60, Math.min(70, a.qppAge || 65));
  const oasAge = Math.max(65, Math.min(70, a.oasAge || 65));

  // --- Part-time work ---
  let ptM = 0, ptYrs = 0;
  if (a.parttime === "yes" || a.parttime === "maybe") {
    ptM = a.parttimeAmount > 0 ? a.parttimeAmount : (a.parttime === "yes" ? 1500 : 800);
    ptYrs = a.parttimeYears > 0 ? a.parttimeYears : 3;
    if (!a.parttimeAmount) filled.push("ptM");
    if (!a.parttimeYears) filled.push("ptYrs");
  }

  // --- Properties (same as Inter + enhanced rental) ---
  const props: any[] = [];
  if (a.homeowner) {
    const hv = a.homeValue || PMED[prov] || 400000;
    const mb = a.mortgage || 0;
    const ma = a.mortgageAmort || 20;
    props.push({
      on: true, name: "Résidence principale", pri: true, val: hv, mb, mr: 0.055, ma,
      ri: 0.035, rm: 0, ox: 0, pt: 0, ins: 0, sa: 0, cg: 0, landPct: 0.30,
      heloc: a.heloc || 0, helocRate: (a.helocRate || 6.5) / 100, helocMax: 0.65,
      smithOn: !!(a.dpaOn),
      refiAge: 0, refiAmt: 0,
      dsAge: a.downsizingAge || 0, dsAmt: a.downsizingProceeds || 0,
      dpaOn: false, dpaRate: 0.04,
    });
  }

  if (a.hasRental && (a.rentalValue || 0) > 0) {
    // Expert: enhanced rental fields (vacancy rate, DPA)
    const rentalVacancy = a.rentalVacancy != null ? a.rentalVacancy / 100 : 0.05;
    const rentalDPA = a.rentalDpaAccum || 0;
    if (a.rentalVacancy == null) filled.push("rentalVacancy");

    const grossRentalIncome = (a.rentalIncome || 0) / 12;
    const effectiveRentalIncome = grossRentalIncome * (1 - rentalVacancy);

    props.push({
      on: true, name: "Bien locatif", pri: false, val: a.rentalValue || 0,
      mb: a.rentalMortgage || 0,
      mr: 0.055, ma: a.rentalAmort || 20,
      ri: 0.035, rm: effectiveRentalIncome,
      ox: (a.rentalExpenses || 0) / 12,
      pt: 0, ins: 0,
      sa: a.rentalSaleAge || 0, cg: 0.5, landPct: 0.25,
      heloc: 0, helocRate: 0.065, helocMax: 0.65, smithOn: false,
      refiAge: 0, refiAmt: 0, dsAge: 0, dpaOn: false, dpaRate: 0.04,
      ucc: (a.rentalValue || 0) * 0.5,
      origBldg: (a.rentalValue || 0) * 0.75,
      totalDpa: rentalDPA,
    });
  }

  // --- Debts (same as Inter) ---
  const debts = ((a.debts || []) as any[])
    .filter((d: any) => (d.amount || 0) > 0)
    .map((d: any) => {
      const bal = d.amount;
      const rate = d.rate > 0 ? d.rate / 100 : (DEBT_RATES[d.type] || 0.08);
      const minPay = d.minPayment > 0 ? d.minPayment : defMinPay(d.type, bal);
      const am = amortDebt(bal, rate, minPay);
      return {
        type: d.type, bal, rate, minPay,
        months: am.months, totalInt: am.totalInt, feasible: am.feasible,
        annualCost: Math.round(bal * rate),
      };
    });

  // --- Couple (same as Inter) ---
  const cOn = a.couple === "yes" && (a.cAge || 0) > 0;

  // --- Income sources & business (same as Inter) ---
  const srcs2 = a.sources || [a.source || "employed"];
  const bizOn = srcs2.indexOf("ccpc") >= 0 && (a.bizRevenue || 0) > 0;

  let bizParams: Record<string, any> = {};
  if (bizOn) {
    bizParams = {
      bizOn: true, bizType: "ccpc",
      bizRevenue: a.bizRevenue || 0, bizExpenses: a.bizExpenses || 0,
      bizRetainedEarnings: a.bizBNR || 0,
      bizRemun: a.bizRemun || "mix", bizSalaryPct: (a.bizSalaryPct || 50) / 100,
      bizGrowth: (a.bizGrowth || 2) / 100, bizVolatility: 0.15,
      bizInvAlloc: (a.bizInvAlloc || 40) / 100,
      bizExtractYrs: a.bizExtractYrs || 10, bizOasOptim: true,
      bizDebtBal: a.bizDebt || 0, bizDebtRate: 0.065, bizDebtAmort: 10,
      bizSaleAge: a.bizSaleAge || 0, bizSalePrice: a.bizSalePrice || 0,
      bizSaleACB: a.bizACB || 100, bizLCGE: a.bizLCGE || false,
      ippOn: a.ippOn || false, ippBal: a.ippBal || 0,
    };
  }

  const deathAge = sex === "F" ? 92 : 90;

  // --- Mortgage payment (same as Inter) ---
  const mortPayment = props.length > 0 && props[0].mb > 0
    ? (() => {
        const mmr = 0.055 / 12;
        const n = (a.mortgageAmort || 20) * 12;
        return Math.round(props[0].mb * mmr / (1 - Math.pow(1 + mmr, -n)));
      })()
    : 0;

  const mortFreeAge = props.length > 0 && props[0].mb > 0
    ? Math.round(age + (a.mortgageAmort || 20))
    : 0;

  // --- Future events (Expert-specific) ---
  const inheritAge = a.inheritAge || 0;
  const inheritAmt = a.inheritAmt || 0;
  const bigExpAge = a.bigExpAge || 0;
  const bigExpAmt = a.bigExpAmt || 0;

  // --- Life insurance (Expert-specific — enhanced from Inter) ---
  const lifeInsType = a.lifeInsType || "none"; // none / term / permanent
  const lifeInsDuration = a.lifeInsDuration || 20;
  const lifeInsBenefit = a.lifeInsBenefit || 0;
  const lifeInsPremium = a.lifeInsPremium || 0;

  // --- RESP / children (Expert-specific) ---
  const respKids = a.respKids || 0;
  const respKidAges = a.respKidAges || [];
  const respBal = a.respBal || 0;
  const respC = a.respC || 0; // annual RESP contribution

  // --- Bloc H: Sophistication & segment (Expert-specific) ---
  const sophistication = a.sophistication || "rapide";
  const segment = detectSegment(a);
  const tabs = detectTabs(a, segment);

  // Sophistication overrides for MC toggles
  let stochMort = true, fatT = true, stochInf = false, gkOn = false, glide = true;
  if (sophistication === "rapide") {
    // Best practices: all advanced features on
    stochMort = true; fatT = true; stochInf = true; gkOn = true; glide = true;
    filled.push("stochMort", "fatT", "stochInf", "gkOn", "glide");
  } else if (sophistication === "personnalise") {
    // User toggles — read from quiz, default to safe values
    stochMort = a.toggleMort != null ? !!a.toggleMort : true;
    fatT = a.toggleFatT != null ? !!a.toggleFatT : true;
    stochInf = a.toggleInf != null ? !!a.toggleInf : false;
    gkOn = a.toggleGK != null ? !!a.toggleGK : false;
    glide = a.toggleGlide != null ? !!a.toggleGlide : true;
    if (a.toggleMort == null) filled.push("stochMort");
    if (a.toggleFatT == null) filled.push("fatT");
    if (a.toggleInf == null) filled.push("stochInf");
    if (a.toggleGK == null) filled.push("gkOn");
    if (a.toggleGlide == null) filled.push("glide");
  } else {
    // Avancé: user sets everything in simulator (30 tabs) — defaults for initial run
    stochMort = true; fatT = true; stochInf = true; gkOn = true; glide = true;
    filled.push("stochMort", "fatT", "stochInf", "gkOn", "glide");
  }

  // --- Build mcParams ---
  const mcParams: Record<string, any> = Object.assign({
    age, retAge, sex, prov, sal, deathAge,
    salGrowth,
    rrsp: Math.round(rrsp), tfsa: Math.round(tfsa), nr: Math.round(nr),
    liraBal: Math.round(liraBal),
    rrspC: Math.round(rrspC), tfsaC: Math.round(tfsaC), nrC: Math.round(nrC),
    retSpM, penType, penM, dcBal: dcBal2, penIdx,
    allocR, allocT, allocN,
    merR, merT, merN, nrTaxDrag: 0.003,
    inf: 0.021, qppAge, oasAge,
    avgE: sal, qppYrs: Math.min(40, Math.max(0, age - 18)),
    ptM, ptYrs, props, debts,
    costBase: Math.round(nr),
    fatT, stochMort, stochInf,
    wStrat: "optimal", melt: a.decaissement === "meltdown",
    meltTgt: Math.round(58523 * Math.pow(1.021, Math.max(0, retAge - age))),
    split: cOn, bridge: a.penBridge || false, gkOn, glide, glideSpd: 0.01,
    fhsaBal: a.fhsaBal || 0, fhsaC: a.fhsaContrib || 0,
    fhsaForHome: a.fhsaForHome || false, fhsaHomeAge: a.fhsaHomeAge || 0,
    ftqOn: false,
    cOn,
    cAge: a.cAge || 0, cSex: a.cSex || "F",
    cRetAge: a.cRetAge || retAge, cSal: a.cIncome || 0,
    cRRSP: a.cRrsp || 0, cTFSA: a.cTfsa || 0, cNR: a.cNr || 0, cLiraBal: a.cLira || 0,
    cPenType: a.cPenType === "dc" ? "cd" : (a.cPenType || "none"), cPenM: a.cPenM || 0,
    cPenIdx: a.cPenIdx ? 2 : (a.cPenType === "db" ? 1 : 0),
    cRRSPC: a.cRrspC != null ? a.cRrspC * 12 : Math.min((a.cMonthlyContrib || 0) * 12, Math.min((a.cIncome || 0) * 0.18, 33810)),
    cNRC: a.cNrC != null ? a.cNrC * 12 : 0,
    cQppAge: a.cQppAge || 65, cOasAge: a.cOasAge || 65,
    cRetSpM: Math.round(retSpM * 0.4), cDeath: a.cSex === "F" ? 92 : 90,
    lifeInsType, lifeInsDuration,
    lifeInsBenefit, lifeInsPremium,
    cLifeInsBenefit: a.cLifeInsBenefit || 0, cLifeInsPremium: a.cLifeInsPremium || 0,
    goP: 1.05, slP: 0.88, noP: 0.75, healthMul: 0.015, healthAge: 85,
    smileSlAge: 75, smileNoAge: 85,
    pen2Type: "none", pen2M: 0, pen2Idx: false,
    peExitStrat: "lump", pmExitStrat: "lump",
    strs: "none", strs2: "none", stWhen: "start", stWhen2: "start",
    qppShare: 0, contGr: 0,
    cgIncLo: 0.5, cgIncHi: 0.6667, cgThresh: 250000,
    // Map to engine field names (engine uses inc1Age/inc1Amt for windfalls, ev1Age/ev1Amt for large expenses)
    inc1Age: inheritAge || 0, inc1Amt: inheritAmt || 0,
    ev1Age: bigExpAge || 0, ev1Amt: bigExpAmt || 0,
    respBal, respC, respKids, respKidAges,
  }, bizParams);

  // --- Quiz passthrough (for AI + report, not MC) ---
  mcParams._quiz = {
    couple: a.couple || "no", sources: srcs2, source: srcs2[0] || "employed",
    employer: a.employer || "",
    risk: a.risk || "balanced", savingsDetail: a.savingsDetail || false,
    lifestyle: a.lifestyle || "active",
    parttime: a.parttime || "no", worries: a.worries || [],
    objective: a.objective || "", confidence: a.confidence || 3,
    decaissement: a.decaissement || "minimal",
    homeowner: a.homeowner || false, hasRental: a.hasRental || false,
    succObjective: a.succObjective || "neutral",
    psych_anxiety: a.psychAnxiety || null,
    psych_discipline: a.psychDiscipline || null,
    psych_literacy: a.psychLiteracy || null,
    // Expert-specific quiz passthrough
    sophistication,
    segment,
    lifeInsType,
    respKids,
    fireTarget: a.fireTarget || false,
  };

  // --- Report metadata (for report-html, not MC) ---
  mcParams._report = {
    debts,
    debtBal: debts.reduce((s: number, d: any) => s + d.bal, 0),
    debtAnnualCost: debts.reduce((s: number, d: any) => s + d.annualCost, 0),
    homeVal: props.length > 0 && props[0].pri ? props[0].val : 0,
    mortBal: props.length > 0 && props[0].pri ? props[0].mb : 0,
    mortAmort: a.mortgageAmort || 0,
    equity: props.length > 0 && props[0].pri ? Math.max(0, props[0].val - props[0].mb) : 0,
    mortFreeAge,
    mortPayment,
    hasRental: a.hasRental || false,
    rentalIncome: a.rentalIncome || 0, rentalExpenses: a.rentalExpenses || 0,
    bizOn,
    lifeIns: lifeInsBenefit, cLifeIns: a.cLifeInsBenefit || 0,
    totalLiquidSavings: rrsp + tfsa + nr + liraBal + dcBal2 +
      (cOn ? (a.cRrsp || 0) + (a.cTfsa || 0) + (a.cNr || 0) : 0),
    inheritAge, inheritAmt,
    bigExpAge, bigExpAmt,
    respBal, respKids,
  };

  // --- Organize defaults by category ---
  const savingsDefaults = filled.filter(f => ["tfsaC", "rrspC"].includes(f));
  const allocDefaults = filled.filter(f => ["allocR", "allocT", "allocN", "merR", "merT", "merN"].includes(f));
  const pensionDefaults = filled.filter(f => ["penM", "dcBal"].includes(f));
  const spendingDefaults = filled.filter(f => ["retSpM", "ptM", "ptYrs"].includes(f));
  const engineDefaults = filled.filter(f => ["stochMort", "fatT", "stochInf", "gkOn", "glide"].includes(f));
  const otherDefaults = filled.filter(f => ["salGrowth", "rentalVacancy"].includes(f));

  defaults.savings = savingsDefaults;
  defaults.allocation = allocDefaults;
  defaults.pension = pensionDefaults;
  defaults.spending = spendingDefaults;
  defaults.engine = engineDefaults;
  defaults.other = otherDefaults;

  return {
    mcParams,
    disclosure: { tabs, segment, sophistication },
    defaults,
  };
}
