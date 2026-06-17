// /lib/quiz-translator-360.ts
// Minimal, stable translator for Bilan 360.

const DEBT_RATES: Record<string, number> = {
  cc: 0.1999,
  student: 0.055,
  car: 0.065,
  loc: 0.075,
};

function n(v: any, d = 0): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function qppFactor(age: number): number {
  if (age <= 60) return 0.64;
  if (age >= 70) return 1.42;
  if (age < 65) return 1.0 - (65 - age) * 0.072;
  return 1.0 + (age - 65) * 0.084;
}

function toDebtArray(debts: any[]): any[] {
  return (debts || [])
    .filter((d) => n(d?.amount) > 0)
    .map((d) => {
      const type = String(d?.type || "other");
      const bal = Math.round(n(d?.amount));
      const rate = n(d?.rate) > 0 ? n(d.rate) / 100 : (DEBT_RATES[type] || 0.08);
      const annualCost = Math.round(bal * rate);
      const minPay = Math.max(25, Math.round(bal * Math.max(0.01, rate / 12)));
      return { type, bal, rate, minPay, annualCost };
    });
}

/**
 * Reconcile the rebuilt wizard's answer shape (lib/wizard/blocks.ts) with the
 * field names + structure this translator expects. The wizard nests its Mode 1
 * classifier under `__profile` and uses field ids (sal, liraBal, mortgageBal,
 * flat debt* fields) that differ from the translator's reads (income, lira,
 * mortgage, debts[]). Without this mapping, salary, couple mode, the home,
 * debts and the LIRA were silently dropped before the engine. Non-destructive:
 * only fills a translator key when it isn't already present.
 */
function normalizeBilan360Input(raw: Record<string, any>): Record<string, any> {
  const a: Record<string, any> = { ...raw };
  const prof: Record<string, any> = (raw && raw.__profile) || {};
  // Mode 1 profile gates → top-level flags the translator reads.
  if (a.couple == null && prof.hasSpouse != null) a.couple = prof.hasSpouse ? "yes" : "no";
  if (a.homeowner == null && prof.homeOwner != null) a.homeowner = !!prof.homeOwner;
  // Renamed fields (wizard id → translator key).
  if (a.income == null && a.sal != null) a.income = a.sal;
  if (a.lira == null && a.liraBal != null) a.lira = a.liraBal;
  if (a.mortgage == null && a.mortgageBal != null) a.mortgage = a.mortgageBal;
  // Flat debt fields → the {amount,type,rate%} array toDebtArray() expects.
  if (a.debts == null) {
    const d: any[] = [];
    const push = (amount: any, type: string, rate?: any) => {
      if (Number(amount) > 0) d.push({ amount: Number(amount), type, ...(rate != null && rate !== "" ? { rate: Number(rate) } : {}) });
    };
    push(a.debtCards, "cc", a.debtCardRate);
    push(a.debtLoc, "loc", a.debtLocRate);
    push(a.debtAuto, "car");
    push(a.debtStudent, "student");
    push(a.debtOther, "other");
    if (d.length) a.debts = d;
  }
  return a;
}

export function translateBilan360(rawA: Record<string, any>, phase: string): Record<string, any> {
  const a = normalizeBilan360Input(rawA);
  const isDecum = phase === "DECUM";

  const age = clamp(Math.round(n(a.age, isDecum ? 65 : 35)), 18, 95);
  const sex = a.sex === "F" ? "F" : "M";
  const prov = String(a.prov || "QC");

  let retAge = Math.round(n(a.retAge, 65));
  if (isDecum) {
    const rs = String(a.retirementStatus || "retired");
    if (rs === "retired") retAge = age;
    else if (rs === "within_1yr") retAge = age + 1;
    else if (rs === "within_2yr") retAge = age + 2;
  }
  retAge = clamp(retAge, age, 95);

  const sal = isDecum ? 0 : Math.round(n(a.income, 70000));
  // Use the client's stated horizon when given; else gendered/phase default.
  const deathAge = clamp(Math.round(n(a.deathAge, isDecum ? 105 : (sex === "F" ? 92 : 90))), age + 1, 110);

  const rrsp = Math.round(n(a.rrsp));
  const tfsa = Math.round(n(a.tfsa));
  const nr = Math.round(n(a.nr));
  const liraBal = Math.round(n(a.lira));
  const dcBal = isDecum ? 0 : Math.round(n(a.dcBal));

  const monthlyContrib = isDecum ? 0 : Math.round(n(a.monthlyContrib));
  const annualContrib = monthlyContrib * 12;
  let rrspC = 0;
  let tfsaC = 0;
  let nrC = 0;
  if (!isDecum) {
    if (a.rrspC != null || a.tfsaC != null || a.nrC != null) {
      rrspC = Math.round(n(a.rrspC));
      tfsaC = Math.round(n(a.tfsaC));
      nrC = Math.round(n(a.nrC));
    } else {
      rrspC = Math.round(Math.min(annualContrib, sal * 0.18));
      tfsaC = Math.round(Math.min(Math.max(0, annualContrib - rrspC), 7000));
      nrC = Math.max(0, annualContrib - rrspC - tfsaC);
    }
  }

  const penType = String(a.penType || (a.hasPension === "db" ? "db" : "none"));
  const penM = Math.round(n(a.penM || a.pension));

  const retIncome = Math.round(n(a.retIncome || a.desiredIncome || 0));
  const retSpM = isDecum
    ? Math.round(n(a.retSpM, retIncome > 0 ? retIncome / 12 : 5000))
    : Math.round(n(a.retSpM, 5000));

  const risk = String(a.risk || "balanced");
  const allocR = risk === "growth" ? (isDecum ? 0.7 : 0.85) : risk === "conservative" ? 0.5 : 0.65;
  const allocT = allocR;
  const allocN = Math.max(0.3, allocR - 0.2);

  const style = String(a.investStyle || "unsure");
  const mer = style === "diy_stocks" ? 0.0005 : style === "low_fee_etf" ? 0.0022 : style === "high_fee_etf" ? 0.008 : style === "mutual_funds" ? 0.02 : 0.015;

  const qppAlready = a.qppAlreadyClaiming === true || a.qppAlreadyClaiming === "true";
  const oasAlready = a.oasAlreadyClaiming === true || a.oasAlreadyClaiming === "true";
  const qppAge = clamp(Math.round(n(a.qppPlannedAge || a.qppAge, qppAlready ? age : 65)), 60, 70);
  const oasAge = clamp(Math.round(n(a.oasPlannedAge || a.oasAge, oasAlready ? Math.max(65, age) : 65)), 65, 70);

  const qppMax = prov === "QC" ? 1364 : 1306;
  const qppMonthly = qppAlready
    ? Math.round(n(a.qppCurrentAmount || a.qppMonthly, qppMax * 0.7))
    : Math.round(qppMax * qppFactor(qppAge) * 0.85);
  const oasMonthly = oasAlready
    ? Math.round(n(a.oasCurrentAmount || a.oasMonthly, 727))
    : Math.round(727 * (oasAge >= 70 ? 1.36 : 1 + (oasAge - 65) * 0.072));
  const govPenMonthly = penType === "db" ? penM : 0;

  const cOn = String(a.couple || "no") === "yes" && n(a.cAge) > 0;
  const cAge = Math.round(n(a.cAge));
  const cRetAge = Math.round(n(a.cRetAge, retAge));
  const cSal = isDecum ? 0 : Math.round(n(a.cIncome));

  const props: any[] = [];
  if (a.homeowner) {
    // Selling the home at retirement releases its equity into the portfolio
    // (CG-exempt for a principal residence). dsAge = planned sale age, else
    // retAge. The engine doesn't model a replacement purchase (Planner-tier).
    const sellHome = a.sellAtRet === true || a.sellAtRet === "true";
    props.push({
      on: true,
      pri: true,
      name: "Residence principale",
      val: Math.round(n(a.homeValue, 0)),
      mb: Math.round(n(a.mortgage, 0)),
      mr: n(a.mortgageRate, 5.5) / 100,
      ma: Math.round(n(a.mortgageAmort, 20)),
      rm: 0,
      ox: 0,
      dsAge: sellHome ? clamp(Math.round(n(a.downsizeAge, retAge)), retAge, deathAge) : 0,
    });
  }
  // Rental properties (up to 2). rentalIncome is net of operating costs but
  // before mortgage, so map it to monthly rent with ox=0 and let the engine
  // net out debt service. sa = planned sale age (0 = never).
  for (let i = 1; i <= 2; i++) {
    const rv = Math.round(n(a["rentalValue" + i]));
    if (rv <= 0) continue;
    const rsa = Math.round(n(a["rentalSell" + i]));
    props.push({
      on: true,
      pri: false,
      name: "Propriete a revenus " + i,
      val: rv,
      mb: Math.round(n(a["rentalMortgage" + i])),
      mr: n(a["rentalMortgageRate" + i], 5.5) / 100,
      ma: 25,
      rm: Math.round(n(a["rentalIncome" + i]) / 12),
      ox: 0,
      cg: 0.5,
      sa: rsa > 0 ? rsa : 0,
    });
  }

  const debts = toDebtArray(a.debts || []);

  const spendingFlex = String(a.spendingFlex || "moderate");
  const gkOn = isDecum || phase === "TRANSITION" ? spendingFlex !== "rigid" : false;
  const gkMaxCut = spendingFlex === "flexible" ? 0.25 : spendingFlex === "rigid" ? 0 : 0.15;

  const impliedAvgE = isDecum && qppMonthly > 0 ? Math.round((qppMonthly / qppMax) * 74600) : sal;

  const params: Record<string, any> = {
    age,
    retAge,
    sex,
    prov,
    sal,
    deathAge,
    rrsp,
    tfsa,
    nr,
    liraBal,
    dcBal,
    rrspC,
    tfsaC,
    nrC,
    retSpM,
    retIncome,
    penType: penType === "dc" ? "cd" : penType,
    penM,
    allocR,
    allocT,
    allocN,
    merR: mer,
    merT: mer * 0.5,
    merN: mer * 0.5,
    inf: 0.021,
    qppAge,
    oasAge,
    avgE: Math.max(0, Math.round(n(a.preRetIncome, impliedAvgE))),
    qppYrs: clamp(Math.round(n(a.qppYearsWorked, age - 18)), 0, 40),
    cOn,
    cAge,
    cSex: a.cSex === "M" ? "M" : "F",
    cRetAge,
    cSal,
    cIncome: cSal,
    cRRSP: Math.round(n(a.cRrsp)),
    cTFSA: Math.round(n(a.cTfsa)),
    cNR: Math.round(n(a.cNr)),
    cLiraBal: Math.round(n(a.cLira)),
    cPenM: Math.round(n(a.cPenM)),
    cPenType: String(a.cPenType || "none"),
    cQppAge: clamp(Math.round(n(a.cQppAge, 65)), 60, 70),
    cOasAge: clamp(Math.round(n(a.cOasAge, 65)), 65, 70),
    cAvgE: Math.round(n(a.cIncome, 0)),
    cQppYrs: clamp(Math.round(n(a.cQppYrs, Math.max(0, cAge - 18))), 0, 40),
    cRetSpM: cOn ? Math.round(retSpM * 0.4) : 0,
    props,
    debts,
    wStrat: "optimal",
    melt: phase !== "ACCUM",
    meltTgt: 58523,
    gkOn,
    gkCeil: 0.055,
    gkFloor: 0.03,
    gkCut: 0.1,
    gkRaise: 0.1,
    gkMaxCut,
    fatT: true,
    stochMort: true,
    stochInf: false,
    eqRet: 0.065,
    bndRet: 0.03,
    goP: 1.05,
    slP: 0.88,
    noP: 0.75,
    smileSlAge: 75,
    smileNoAge: 85,
  };

  const debtBal = debts.reduce((s, d) => s + n(d.bal), 0);
  const debtAnnualCost = debts.reduce((s, d) => s + n(d.annualCost), 0);
  const homeVal = props.length > 0 ? Math.round(n(props[0].val)) : 0;
  const mortBal = props.length > 0 ? Math.round(n(props[0].mb)) : 0;

  params._quiz = {
    confidence: n(a.confidence, 3),
    psych_literacy: String(a.psychLiteracy || "medium"),
    worries: a.worries || [],
    estatePref: String(a.estatePref || "balanced"),
    spendingFlex,
    qppAlreadyClaiming: qppAlready,
    oasAlreadyClaiming: oasAlready,
    detailPreference: String(a.detailPreference || a.prefDetails || "short"),
    employer: String(a.employer || ""),
    currentSpM: Math.round(n(a.currentSpM)),
    risk,
    couple: cOn ? "yes" : "no",
  };

  params._report = {
    debts,
    debtBal,
    debtAnnualCost,
    homeVal,
    mortBal,
    props,
    govQppMonthly: qppMonthly,
    govOasMonthly: oasMonthly,
    govPenMonthly,
    cPenMonthly: Math.round(n(a.cPenM)),
    govTotalMonthly: qppMonthly + oasMonthly + govPenMonthly,
    govCoveragePct: retSpM > 0 ? (qppMonthly + oasMonthly + govPenMonthly) / retSpM : 0,
    retIncome: retSpM * 12,
    meltIsBase: isDecum && retSpM * 12 <= 58523,
    meltTarget: 58523,
    gkActive: gkOn,
    mortPayment: 0,
    mortFreeAge: 0,
    qppMonthly,
    oasMonthly,
    penMonthly: govPenMonthly,
  };

  return params;
}
