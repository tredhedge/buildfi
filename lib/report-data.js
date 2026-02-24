// /lib/report-data.ts
// Extracts structured report data from MC results
// 1:1 port from quiz-essentiel.html lines 2267-2332 — DO NOT MODIFY LOGIC

import { calcTax } from "./engine";

export interface ReportData {
  age: number;
  retAge: number;
  sex: string;
  prov: string;
  sal: number;
  deathAge: number;
  avgDeath: number;
  totalSavings: number;
  rrsp: number;
  tfsa: number;
  nr: number;
  retYearBalance: number;
  retBal: number;
  qppMonthly: number;
  oasMonthly: number;
  dbPensionMonthly: number;
  govMonthly: number;
  coveragePct: number;
  gapMonthly: number;
  retSpM: number;
  withdrawalRatePct: number;
  successPct: number;
  succ: number;
  grade: string;
  rMedF: number;
  rP5F: number;
  rP25F: number;
  rP75F: number;
  rP95F: number;
  medRuin: number;
  p5Ruin: number;
  taxCurrentEffective: number;
  taxRetirementEffective: number;
  taxCurrentMarginal: number;
  margRate: number;
  merWeighted: number;
  feeCostLifetime: number;
  penType: string;
  dcBal: number;
  hasPension: boolean;
  ptM: number;
  ptYrs: number;
  qppAge: number;
  oasAge: number;
  inf: number;
  nSim: number;
  medRevData: any[];
  expReturn: number;
  afterTaxReturn: number;
}

export function extractReportData(mc: any, p: any): ReportData {
  const rd = mc.medRevData || [];
  const retRow = rd.find((r: any) => r.age >= p.retAge) || {};
  const qppM = Math.round((retRow.rrq || 0) / 12);
  const oasM = Math.round((retRow.psv || 0) / 12);
  const penMo = Math.round((retRow.pen || 0) / 12);
  const govM = qppM + oasM + penMo;
  const coverPct = p.retSpM > 0 ? Math.round((govM / p.retSpM) * 100) : 0;
  const gapM = Math.max(0, p.retSpM - govM);

  // Retirement year balance
  const retBal = retRow
    ? Math.round(
        (retRow.aRR || 0) +
          (retRow.aTF || 0) +
          (retRow.aNR || 0) +
          (retRow.aDC || 0)
      )
    : 0;

  // Withdrawal rate
  const annualW = gapM * 12;
  const wdPct = retBal > 0 ? Math.round((annualW / retBal) * 1000) / 10 : 99;

  // Tax rates
  const workRow = rd.find((r: any) => r.age === p.age) || {};
  const taxCurrEff =
    workRow.taxInc > 0
      ? Math.round(((workRow.tax || 0) / workRow.taxInc) * 100)
      : 0;
  const taxRetRow =
    rd.find((r: any) => r.age === p.retAge + 2) || retRow;
  const taxRetEff =
    taxRetRow && taxRetRow.taxInc > 0
      ? Math.round(((taxRetRow.tax || 0) / taxRetRow.taxInc) * 100)
      : 0;

  // Marginal rate (for debt priority)
  const taxInfo = calcTax(p.sal, 0, p.prov, 0);
  const margRate = taxInfo ? taxInfo.marg : 0.3;

  // Fee cost
  const merW =
    (p.merR * p.rrsp + p.merT * p.tfsa + p.merN * p.nr) /
    Math.max(1, p.rrsp + p.tfsa + p.nr);
  const feeCost = Math.round(merW * retBal * (p.deathAge - p.retAge));

  // Success grade
  const succPct = Math.round(mc.succ * 100);
  let grade: string;
  if (succPct >= 95) grade = "A+";
  else if (succPct >= 90) grade = "A";
  else if (succPct >= 85) grade = "A−";
  else if (succPct >= 80) grade = "B+";
  else if (succPct >= 75) grade = "B";
  else if (succPct >= 70) grade = "B−";
  else if (succPct >= 60) grade = "C+";
  else if (succPct >= 50) grade = "C";
  else if (succPct >= 40) grade = "D";
  else grade = "F";

  return {
    age: p.age,
    retAge: p.retAge,
    sex: p.sex,
    prov: p.prov,
    sal: p.sal,
    deathAge: p.deathAge,
    avgDeath: p.sex === "F" ? 87 : 84,
    totalSavings: p.rrsp + p.tfsa + p.nr,
    rrsp: p.rrsp,
    tfsa: p.tfsa,
    nr: p.nr,
    retYearBalance: retBal,
    retBal,
    qppMonthly: qppM,
    oasMonthly: oasM,
    dbPensionMonthly: penMo,
    govMonthly: govM,
    coveragePct: coverPct,
    gapMonthly: gapM,
    retSpM: p.retSpM,
    withdrawalRatePct: wdPct,
    successPct: succPct,
    succ: mc.succ,
    grade,
    rMedF: Math.round(mc.medF || 0),
    rP5F: Math.round(mc.var5 || 0),
    rP25F: Math.round(mc.p25F || 0),
    rP75F: Math.round(mc.p75F || 0),
    rP95F: Math.round(mc.p95F || 0),
    medRuin: mc.medRuin || 999,
    p5Ruin: mc.p5Ruin || 999,
    taxCurrentEffective: taxCurrEff,
    taxRetirementEffective: taxRetEff,
    taxCurrentMarginal: Math.round(margRate * 100),
    margRate,
    merWeighted: merW,
    feeCostLifetime: feeCost,
    penType: p.penType,
    dcBal: p.dcBal,
    hasPension: p.penType !== "none",
    ptM: p.ptM,
    ptYrs: p.ptYrs,
    qppAge: p.qppAge,
    oasAge: p.oasAge,
    inf: p.inf,
    nSim: 5000,
    medRevData: mc.medRevData,
    expReturn: p.allocR * 0.07 + (1 - p.allocR) * 0.035,
    afterTaxReturn:
      (p.allocR * 0.07 + (1 - p.allocR) * 0.035) * (1 - margRate * 0.5),
  };
}
