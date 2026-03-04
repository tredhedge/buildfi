// /lib/quiz-translator.ts
// Converts ~28 quiz answers into ~55 MC engine parameters
// 1:1 port from quiz-essentiel.html lines 2106-2246 — DO NOT MODIFY LOGIC
//
// This is the "Layer 1" of the three-layer architecture:
// Quiz answers → translateToMC() → MC params → runMC()

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

export function translateToMC(a: Record<string, any>) {
  const age = a.age || 35;
  const retAge = a.retAge || 65;
  const sex = a.sex || "M";
  const prov = a.prov || "QC";
  const sal = a.income || 70000;
  const col = COL_ADJ[prov] || 1;

  // Savings split
  const tot = a.totalSavings || 0;
  let rrsp: number, tfsa: number, nr: number;
  if (a.savingsDetail && a.rrsp != null) {
    rrsp = a.rrsp || 0;
    tfsa = a.tfsa || 0;
    nr = a.nr || 0;
  } else {
    if (age < 35) {
      rrsp = tot * 0.2; tfsa = tot * 0.5; nr = tot * 0.3;
    } else if (age < 50) {
      rrsp = tot * 0.45; tfsa = tot * 0.35; nr = tot * 0.2;
    } else {
      rrsp = tot * 0.55; tfsa = tot * 0.25; nr = tot * 0.2;
    }
  }

  // Contributions: TFSA first, RRSP, then NR
  const mc = a.monthlyContrib || 0;
  const ac = mc * 12;
  const tfsaC = Math.min(ac, 7000);
  const rrspC = Math.min(ac - tfsaC, Math.min(sal * 0.18, 33810));
  const nrC = Math.max(0, ac - tfsaC - rrspC);

  // Pension from employer
  let penType = "none", penM = 0, dcBal = 0, penIdx = false;
  const emp = a.employer || "x";
  if (emp === "gov") {
    penType = "db";
    penIdx = true;
    const projYrs = Math.min(35, Math.max(0, retAge - 25));
    const projSal = sal * Math.pow(1.021, Math.max(0, retAge - age));
    penM = Math.round((projSal * 0.02 * projYrs) / 12);
  } else if (emp === "large" || emp === "tech") {
    penType = "cd";
    dcBal = Math.round(sal * 0.06 * Math.min(20, Math.max(0, age - 25)));
  }

  // Spending
  let retSpM: number;
  if (a.lifestyle === "cozy") retSpM = Math.round(3000 * col);
  else if (a.lifestyle === "premium") retSpM = Math.round(7500 * col);
  else retSpM = Math.round(5000 * col);

  // Allocation from risk
  let eq: number;
  if (a.risk === "conservative") eq = 0.5;
  else if (a.risk === "growth") eq = 0.85;
  else eq = 0.7;
  const mer = eq > 0.7 ? 0.018 : eq > 0.5 ? 0.015 : 0.012;

  // QPP/OAS timing
  const qppAge = Math.max(60, Math.min(70, retAge < 60 ? 65 : retAge));
  const oasAge = Math.max(65, Math.min(70, retAge < 65 ? 65 : retAge));

  // Part-time
  let ptM = 0, ptYrs = 0;
  if (a.parttime === "yes" || a.parttime === "maybe") {
    ptM = a.parttimeAmount > 0 ? a.parttimeAmount : a.parttime === "yes" ? 1500 : 800;
    ptYrs = a.parttimeYears > 0 ? a.parttimeYears : a.parttime === "yes" ? 5 : 3;
  }

  // Property
  const props: any[] = [];
  if (a.homeowner) {
    const hv = a.homeValue || PMED[prov] || 400000;
    const mb = a.mortgage || Math.round(hv * 0.55);
    const ma = a.mortgageAmort || 20;
    props.push({
      on: true, name: "Primary", pri: true, val: hv, mb, mr: 0.055, ma,
      ri: 0.035, rm: 0, ox: 0, pt: 0, ins: 0, sa: 0, cg: 0, landPct: 0.3,
      heloc: 0, helocRate: 0.065, helocMax: 0.65, smithOn: false,
      refiAge: 0, refiAmt: 0, dsAge: 0, dpaOn: false, dpaRate: 0.04,
    });
  }

  // Debts
  const debts = ((a.debts || []) as any[])
    .filter((d: any) => (d.amount || 0) > 0)
    .map((d: any) => {
      const bal = d.amount;
      const rate = d.rate > 0 ? d.rate / 100 : DEBT_RATES[d.type] || 0.08;
      const minPay = d.minPayment > 0 ? d.minPayment : defMinPay(d.type, bal);
      const am = amortDebt(bal, rate, minPay);
      return {
        type: d.type, bal, rate, minPay,
        months: am.months, totalInt: am.totalInt, feasible: am.feasible,
        annualCost: Math.round(bal * rate),
      };
    });

  const deathAge = sex === "F" ? 92 : 90;
  const nrVal = Math.round(nr);

  return {
    age, retAge, sex, prov, sal, deathAge,
    rrsp: Math.round(rrsp), tfsa: Math.round(tfsa), nr: nrVal,
    rrspC: Math.round(rrspC), tfsaC: Math.round(tfsaC), nrC: Math.round(nrC),
    retSpM, penType, penM, dcBal, penIdx,
    allocR: eq, allocT: eq, allocN: Math.max(0.3, eq - 0.2),
    merR: mer, merT: mer * 0.5, merN: mer * 0.5, nrTaxDrag: 0.003,
    inf: 0.021, qppAge, oasAge, avgE: sal,
    qppYrs: Math.min(40, Math.max(0, age - 18)),
    ptM, ptYrs, props, debts,
    costBase: nrVal,
    // Features OFF for Essentiel
    fatT: false, stochMort: false, stochInf: false,
    wStrat: "optimal", melt: false, split: false, bridge: false,
    gkOn: false, respOn: false, ftqOn: false, cOn: false, bizOn: false,
    goP: 1.0, slP: 1.0, noP: 1.0, healthMul: 0,
    healthAge: 85, smileSlAge: 75, smileNoAge: 85,
    pen2Type: "none", pen2M: 0, pen2Idx: false,
    peExitStrat: "lump", pmExitStrat: "lump",
    strs: "none", strs2: "none", stWhen: "start", stWhen2: "start",
    qppShare: 0, contGr: 0, glide: false, glideSpd: 0,
    eqRet: 0.07, eqVol: 0.16, bndRet: 0.035, bndVol: 0.06,
    // Quiz passthrough (for AI + report, not MC)
    _quiz: {
      couple: a.couple || "no", win: a.win || "", fix: a.fix || "",
      confidence: a.confidence || 3, worries: a.worries || [],
      family: a.family || "", risk: a.risk || "balanced",
      employer: a.employer || "", savingsDetail: a.savingsDetail || false,
      lifestyle: a.lifestyle || "active", parttime: a.parttime || "no",
      psych_anxiety: a.psychAnxiety || null,
      psych_discipline: a.psychDiscipline || null,
      psych_literacy: a.psychLiteracy || null,
    },
    _report: {
      debts,
      debtBal: debts.reduce((s: number, d: any) => s + d.bal, 0),
      debtAnnualCost: debts.reduce((s: number, d: any) => s + d.annualCost, 0),
      homeVal: props.length > 0 ? props[0].val : 0,
      mortBal: props.length > 0 ? props[0].mb : 0,
      mortAmort: props.length > 0 ? a.mortgageAmort || 20 : 0,
      equity: props.length > 0 ? Math.max(0, props[0].val - props[0].mb) : 0,
      mortFreeAge:
        props.length > 0 && props[0].mb > 0 ? age + (a.mortgageAmort || 20) : 0,
      mortPayment:
        props.length > 0 && props[0].mb > 0
          ? (() => {
              const mmr = 0.055 / 12;
              const n = (a.mortgageAmort || 20) * 12;
              return Math.round((props[0].mb * mmr) / (1 - Math.pow(1 + mmr, -n)));
            })()
          : 0,
    },
  };
}
