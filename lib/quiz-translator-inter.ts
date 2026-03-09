// /lib/quiz-translator-inter.ts
// Converts ~85 quiz answers into ~120 MC engine parameters (Intermédiaire tier)
// 1:1 port from quiz-intermediaire.html lines 2119-2370 — DO NOT MODIFY LOGIC
//
// This is the "Layer 1" of the three-layer architecture:
// Quiz answers → translateToMCInter() → MC params → runMC()
//
// Identical constants & helpers are duplicated (not imported) to keep modules independent.
// PROACTIVE FIX: penType="dc" changed to "cd" everywhere (commit 3931d0b — engine expects "cd").

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

export function translateToMCInter(a: Record<string, any>) {
  const age = a.age || 35;
  const retAge = a.retAge || 65;
  const sex = a.sex || "M";
  const prov = a.prov || "QC";
  const sal = a.income || 70000;
  const col = COL_ADJ[prov] || 1;

  // Savings — Intermédiaire gets explicit fields
  const rrsp = a.rrsp || 0;
  const tfsa = a.tfsa || 0;
  const nr = a.nr || 0;
  const liraBal = a.lira || 0;
  const dcBal = a.dcBal || 0;

  // Contributions: explicit or TFSA-first heuristic
  const mc2 = a.monthlyContrib || 0;
  const ac = mc2 * 12;
  // RRSP-first when income >= $55K (marginal rate makes deduction more valuable)
  let rrspC: number, tfsaC: number;
  if (a.rrspC != null || a.tfsaC != null) {
    rrspC = a.rrspC || 0;
    tfsaC = a.tfsaC || 0;
  } else if (sal >= 55000) {
    rrspC = Math.min(ac, Math.min(sal * 0.18, 33810));
    tfsaC = Math.min(ac - rrspC, 7000);
  } else {
    tfsaC = Math.min(ac, 7000);
    rrspC = Math.min(ac - tfsaC, Math.min(sal * 0.18, 33810));
  }
  const nrC = Math.max(0, ac - tfsaC - rrspC);

  // Pension logic — explicit penType, employer fallback, or none
  let penType = "none";
  let penM = 0;
  let penIdx: number = 0;
  let dcBal2 = dcBal;

  if (a.penType === "db") {
    penType = "db";
    penM = a.penM || Math.round(
      sal * Math.pow(1.021, Math.max(0, retAge - age)) *
      0.02 * (a.penYrs || Math.min(35, Math.max(0, retAge - 25))) / 12
    );
    penIdx = a.penIdx ? 2 : 0; // engine: 2=full CPI, 1=half CPI, 0=none
  } else if (a.penType === "dc") {
    // PROACTIVE FIX: engine expects "cd" not "dc"
    penType = "cd";
    dcBal2 = a.dcBal || dcBal;
  } else if (a.employer === "gov") {
    penType = "db";
    penIdx = 2; // government pensions are fully indexed
    const projYrs = a.penYrs > 0 ? a.penYrs : Math.min(35, Math.max(0, retAge - 25));
    const projSal = sal * Math.pow(1.021, Math.max(0, retAge - age));
    penM = a.penM || Math.round(projSal * 0.02 * projYrs / 12);
  } else if (a.employer === "large" || a.employer === "tech") {
    // PROACTIVE FIX: engine expects "cd" not "dc"
    penType = "cd";
    dcBal2 = a.dcBal || Math.round(sal * 0.06 * Math.min(20, Math.max(0, age - 25)));
  }

  // Retirement spending
  let retSpM: number;
  if (a.retSpM && a.retSpM > 0) retSpM = a.retSpM;
  else if (a.lifestyle === "cozy") retSpM = Math.round(3000 * col);
  else if (a.lifestyle === "premium") retSpM = Math.round(7500 * col);
  else if (a.lifestyle === "custom" && a.retSpMCustom > 0) retSpM = Math.round(a.retSpMCustom);
  else retSpM = Math.round(5000 * col);

  // Allocation from risk profile
  let eq: number;
  if (a.risk === "conservative") eq = 0.50;
  else if (a.risk === "growth") eq = 0.85;
  else if (a.risk === "custom" && a.allocCustom > 0) eq = Math.min(1, Math.max(0, a.allocCustom / 100));
  else eq = 0.70;

  const mer = eq > 0.85 ? 0.020 : eq > 0.7 ? 0.018 : eq > 0.5 ? 0.015 : 0.012;

  // QPP/OAS timing — explicit quiz ages when provided, else heuristic from retAge
  const qppAge = a.qppAge
    ? Math.max(60, Math.min(70, a.qppAge))
    : Math.max(60, Math.min(70, retAge < 60 ? 65 : retAge));
  const oasAge = a.oasAge
    ? Math.max(65, Math.min(70, a.oasAge))
    : Math.max(65, Math.min(70, retAge < 65 ? 65 : retAge));

  // Part-time work
  let ptM = 0, ptYrs = 0;
  if (a.parttime === "yes" || a.parttime === "maybe") {
    ptM = a.parttimeAmount > 0 ? a.parttimeAmount : (a.parttime === "yes" ? 1500 : 800);
    ptYrs = a.parttimeYears > 0 ? a.parttimeYears : 3;
  }

  // Properties
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

  // Multi-rental (up to 3) — also handles legacy single-rental format
  const rentalCount = Math.min(3, a.rentalCount || (a.hasRental ? 1 : 0));
  for (let ri = 1; ri <= rentalCount; ri++) {
    const pfx = `rental${ri}`;
    // Legacy compat: rental1* fields may not exist if old hasRental=true format
    const rv = a[pfx + "Value"] || (ri === 1 ? a.rentalValue || 0 : 0);
    const rmb = a[pfx + "Mortgage"] || (ri === 1 ? a.rentalMortgage || 0 : 0);
    const rma = a[pfx + "Amort"] || (ri === 1 ? a.rentalAmort || 20 : 20);
    const rInc = a[pfx + "Income"] || (ri === 1 ? a.rentalIncome || 0 : 0);
    const rExp = a[pfx + "Expenses"] || (ri === 1 ? a.rentalExpenses || 0 : 0);
    const rDpa = a[pfx + "DpaAccum"] || (ri === 1 ? a.rentalDpaAccum || 0 : 0);
    const rSale = a[pfx + "SaleAge"] || (ri === 1 ? a.rentalSaleAge || 0 : 0);
    if (rv > 0) {
      props.push({
        on: true, name: a[pfx + "Name"] || `Bien locatif ${ri}`,
        pri: false, val: rv,
        mb: rmb, mr: 0.055, ma: rma,
        ri: 0.035, rm: rInc / 12, ox: rExp / 12,
        pt: 0, ins: 0,
        sa: rSale, cg: 0.5, landPct: 0.25,
        heloc: 0, helocRate: 0.065, helocMax: 0.65, smithOn: false,
        refiAge: 0, refiAmt: 0, dsAge: 0, dpaOn: false, dpaRate: 0.04,
        ucc: rv * 0.5, origBldg: rv * 0.75, totalDpa: rDpa,
      });
    }
  }

  // Debts
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

  // Couple
  const cOn = a.couple === "yes" && (a.cAge || 0) > 0;

  // Income sources & business
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

  // Mortgage payment calculation
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

  // Build params — Object.assign with bizParams mirrors the source exactly
  const params: Record<string, any> = Object.assign({
    age, retAge, sex, prov, sal, deathAge,
    rrsp: Math.round(rrsp), tfsa: Math.round(tfsa), nr: Math.round(nr),
    liraBal: Math.round(liraBal),
    rrspC: Math.round(rrspC), tfsaC: Math.round(tfsaC), nrC: Math.round(nrC),
    retSpM, penType, penM, dcBal: dcBal2, penIdx,
    allocR: eq, allocT: eq, allocN: Math.max(0.3, eq - 0.2),
    merR: mer, merT: mer * 0.5, merN: mer * 0.5, nrTaxDrag: 0.003,
    inf: 0.021, qppAge, oasAge,
    avgE: sal, qppYrs: Math.min(40, Math.max(0, age - 18)),
    ptM, ptYrs, props, debts,
    costBase: Math.round(nr),
    fatT: true, stochMort: true, stochInf: false,
    wStrat: "optimal", melt: false,  // decaissement question removed; engine handles optimal drawdown via wStrat
    meltTgt: Math.round(58523 * Math.pow(1.021, Math.max(0, retAge - age))),
    split: cOn, bridge: a.penBridge || false, gkOn: false,
    fhsaBal: a.fhsaBal || 0, fhsaC: a.fhsaContrib || 0,
    fhsaForHome: a.fhsaForHome || false, fhsaHomeAge: a.fhsaHomeAge || 0,
    ftqOn: false,
    cOn,
    cAge: a.cAge || 0, cSex: a.cSex || "F",
    cRetAge: a.cRetAge || retAge, cSal: a.cIncome || 0,
    cRRSP: a.cRrsp || 0, cTFSA: a.cTfsa || 0, cNR: a.cNr || 0, cLiraBal: a.cLira || 0,
    cPenType: a.cPenType === "dc" ? "cd" : (a.cPenType || "none"), cPenM: a.cPenM || 0,
    cPenIdx: a.cPenIdx ? 2 : 0,
    cDCBal: a.cDcBal || 0,
    // Derive spousal annual contributions from monthly input if not explicitly provided
    cRRSPC: a.cRrspC != null ? a.cRrspC * 12 : Math.min((a.cMonthlyContrib || 0) * 12, Math.min((a.cIncome || 0) * 0.18, 33810)),
    cTFSAC: a.cTfsaC != null ? a.cTfsaC * 12 : Math.min(Math.max(0, (a.cMonthlyContrib || 0) * 12 - Math.min((a.cIncome || 0) * 0.18, 33810)), 7000),
    cNRC: a.cNrC != null ? a.cNrC * 12 : 0,
    cAvgE: a.cIncome || 0, cQppYrs: Math.min(40, Math.max(0, (a.cAge || 0) - 18)),
    cQppAge: a.cQppAge || 65, cOasAge: a.cOasAge || 65,
    cRetSpM: Math.round(retSpM * 0.4), cDeath: a.cSex === "F" ? 92 : 90,
    lifeInsBenefit: a.lifeInsBenefit || 0, lifeInsPremium: a.lifeInsPremium || 0,
    cLifeInsBenefit: a.cLifeInsBenefit || 0, cLifeInsPremium: a.cLifeInsPremium || 0,
    goP: 1.05, slP: 0.88, noP: 0.75, healthMul: 0.015, healthAge: 85,
    smileSlAge: 75, smileNoAge: 85,
    pen2Type: "none", pen2M: 0, pen2Idx: false,
    peExitStrat: "lump", pmExitStrat: "lump",
    strs: "none", strs2: "none", stWhen: "start", stWhen2: "start",
    qppShare: 0, contGr: 0, glide: true, glideSpd: 0.01,
    cgIncLo: 0.5, cgIncHi: 0.6667, cgThresh: 250000,
  }, bizParams);

  // Quiz passthrough (for AI + report, not MC)
  params._quiz = {
    couple: a.couple || "no", sources: srcs2, source: srcs2[0] || "employed",
    employer: a.employer || "",
    risk: a.risk || "balanced", savingsDetail: a.savingsDetail || false,
    lifestyle: a.lifestyle || "active",
    parttime: a.parttime || "no", worries: a.worries || [],
    objective: a.objective || "", confidence: a.confidence || 3,
    homeowner: a.homeowner || false, rentalCount,
    succObjective: a.succObjective || "neutral",
    psych_anxiety: a.psychAnxiety || null,
    psych_discipline: a.psychDiscipline || null,
    psych_literacy: a.psychLiteracy || null,
  };

  // Report metadata (for report-html.js, not MC)
  params._report = {
    debts,
    debtBal: debts.reduce((s: number, d: any) => s + d.bal, 0),
    debtAnnualCost: debts.reduce((s: number, d: any) => s + d.annualCost, 0),
    homeVal: props.length > 0 && props[0].pri ? props[0].val : 0,
    mortBal: props.length > 0 && props[0].pri ? props[0].mb : 0,
    mortAmort: a.mortgageAmort || 0,
    equity: props.length > 0 && props[0].pri ? Math.max(0, props[0].val - props[0].mb) : 0,
    mortFreeAge,
    mortPayment,
    hasRental: rentalCount > 0,
    rentals: (() => {
      const out: any[] = [];
      for (let ri2 = 1; ri2 <= rentalCount; ri2++) {
        const p2 = `rental${ri2}`;
        const rv2 = a[p2 + "Value"] || (ri2 === 1 ? a.rentalValue || 0 : 0);
        if (rv2 > 0) {
          const inc2 = a[p2 + "Income"] || (ri2 === 1 ? a.rentalIncome || 0 : 0);
          const exp2 = a[p2 + "Expenses"] || (ri2 === 1 ? a.rentalExpenses || 0 : 0);
          const mb2 = a[p2 + "Mortgage"] || (ri2 === 1 ? a.rentalMortgage || 0 : 0);
          out.push({
            name: a[p2 + "Name"] || `Bien locatif ${ri2}`,
            value: rv2, mortgage: mb2, equity: Math.max(0, rv2 - mb2),
            income: inc2, expenses: exp2, cashFlow: inc2 - exp2,
          });
        }
      }
      return out;
    })(),
    rentalTotalValue: (() => { let s = 0; for (let i = 1; i <= rentalCount; i++) s += (a[`rental${i}Value`] || (i === 1 ? a.rentalValue || 0 : 0)); return s; })(),
    rentalTotalIncome: (() => { let s = 0; for (let i = 1; i <= rentalCount; i++) s += (a[`rental${i}Income`] || (i === 1 ? a.rentalIncome || 0 : 0)); return s; })(),
    rentalTotalExpenses: (() => { let s = 0; for (let i = 1; i <= rentalCount; i++) s += (a[`rental${i}Expenses`] || (i === 1 ? a.rentalExpenses || 0 : 0)); return s; })(),
    bizOn,
    lifeIns: a.lifeInsBenefit || 0, cLifeIns: a.cLifeInsBenefit || 0,
    totalLiquidSavings: rrsp + tfsa + nr + liraBal + dcBal2 +
      (cOn ? (a.cRrsp || 0) + (a.cTfsa || 0) + (a.cNr || 0) : 0),
  };

  return params;
}
