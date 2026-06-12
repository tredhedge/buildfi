// lib/bilan-annuel.ts — Bilan Annuel engine (extracted for testability)
// Used by: app/outils/bilan-annuel/page.tsx, tests/bilan-annuel.test.ts

export const STORAGE_KEY = "buildfi_bilan_v4";

export function calcPMT(bal: number, rate: number, amYr: number): number {
  if (!bal || bal <= 0 || !amYr) return 0;
  if (!rate || rate <= 0) return Math.round(bal / (amYr * 12));
  const r = rate / 12, n = amYr * 12;
  return Math.round(bal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
}

export interface Account {
  id: string;
  type: string;
  label: string;
  balance: number;
  contribution: number;
  returnRate: number;
}

export interface Mortgage {
  balance: number;
  rate: number;
  termYears: number;
  amortYears: number;
  payment: number;
  autoCalc: boolean;
}

export interface Property {
  id: string;
  label: string;
  value: number;
  appreciation: number;
  rentalIncome: number;
  isRental: boolean;
  mortgage: Mortgage;
}

export interface OtherAsset {
  id: string;
  label: string;
  value: number;
  growth: number;
}

export interface Debt {
  id: string;
  type: string;
  label: string;
  balance: number;
  rate: number;
  termMonths?: number;
  payment: number;
}

export interface BAData {
  profile: { lang: string };
  accounts: Account[];
  properties: Property[];
  otherAssets: OtherAsset[];
  debts: Debt[];
  income: { salary: number; salaryGrowth: number; otherIncome: number };
  snapshots: any[];
  reminder: { email: string; frequency: string; enabled: boolean };
}

export interface ProjectionYear {
  year: number;
  liquid: number;
  immo: number;
  other: number;
  debt: number;
  netWorth: number;
}

export interface WhatIfOverrides {
  extraContrib?: number;
  targetAccount?: string;
  debtExtra?: number;
  returnOverride?: number;
}

export function project5Years(data: BAData, ov?: WhatIfOverrides): ProjectionYear[] {
  const years: ProjectionYear[] = [];
  for (let y = 0; y <= 5; y++) {
    let liq = 0, immo = 0, oth = 0, dbt = 0;
    data.accounts.forEach(a => {
      let c = a.contribution; let r = a.returnRate;
      if (ov?.extraContrib && a.id === ov.targetAccount) c += ov.extraContrib * 12;
      if (ov?.returnOverride != null) r = ov.returnOverride;
      liq += a.balance * Math.pow(1 + r, y) + (r > 0 ? c * ((Math.pow(1 + r, y) - 1) / r) : c * y);
    });
    data.properties.forEach(p => { immo += p.value * Math.pow(1 + p.appreciation, y); });
    (data.otherAssets || []).forEach(a => { oth += (a.value || 0) * Math.pow(1 + (a.growth || 0), y); });
    const amort = (bal: number, rate: number, pmt: number, extra?: number) => {
      if (bal <= 0 || pmt <= 0) return Math.max(0, bal);
      let b = bal; const mr = rate / 12;
      for (let m = 0; m < y * 12 && b > 0; m++) b = Math.max(0, b - Math.max(0, (pmt + (extra||0)) - b * mr));
      return b;
    };
    data.debts.forEach(d => { dbt += amort(d.balance, d.rate, d.payment, ov?.debtExtra || 0); });
    data.properties.forEach(p => {
      if (!p.mortgage?.balance) return;
      const pm = p.mortgage.autoCalc !== false ? calcPMT(p.mortgage.balance, p.mortgage.rate, p.mortgage.amortYears) : p.mortgage.payment;
      dbt += amort(p.mortgage.balance, p.mortgage.rate, pm, 0);
    });
    years.push({ year: y, liquid: Math.round(liq), immo: Math.round(immo), other: Math.round(oth), debt: Math.round(dbt), netWorth: Math.round(liq + immo + oth - dbt) });
  }
  return years;
}

export function computeTotals(data: BAData) {
  const liq = data.accounts.reduce((s, a) => s + (a.balance || 0), 0);
  const ig = data.properties.reduce((s, p) => s + (p.value || 0), 0);
  const mort = data.properties.reduce((s, p) => s + (p.mortgage?.balance || 0), 0);
  const oth = (data.otherAssets || []).reduce((s, a) => s + (a.value || 0), 0);
  const dbt = data.debts.reduce((s, d) => s + (d.balance || 0), 0);
  const ta = liq + ig + oth, td = dbt + mort;
  return { liquid: liq, immoGross: ig, mortgages: mort, other: oth, debts: dbt, totalAssets: ta, totalDebts: td, netWorth: ta - td, debtRatio: ta > 0 ? td / ta : 0, liquidRatio: td > 0 ? liq / td : Infinity };
}

export function computeExpressProjection(express: { rrsp: number; tfsa: number; home: number; mortgage: number; debtsTotal: number; savingsMonthly: number }): ProjectionYear[] {
  const r = 0.05, appreciation = 0.03;
  const years: ProjectionYear[] = [];
  for (let y = 0; y <= 5; y++) {
    const liquid = (express.rrsp + express.tfsa) * Math.pow(1 + r, y) + (r > 0 ? express.savingsMonthly * 12 * ((Math.pow(1 + r, y) - 1) / r) : express.savingsMonthly * 12 * y);
    const immo = express.home * Math.pow(1 + appreciation, y);
    let mort = express.mortgage;
    if (mort > 0) { const mr = 0.055 / 12; const pmt = mort * (mr * Math.pow(1+mr, 300)) / (Math.pow(1+mr, 300) - 1); for (let m = 0; m < y*12 && mort > 0; m++) mort = Math.max(0, mort - Math.max(0, pmt - mort * mr)); }
    let dbt = express.debtsTotal;
    if (dbt > 0) { const pmt = dbt * 0.03; for (let m = 0; m < y*12 && dbt > 0; m++) dbt = Math.max(0, dbt - Math.max(0, pmt - dbt * (0.08/12))); }
    years.push({ year: y, liquid: Math.round(liquid), immo: Math.round(immo), other: 0, debt: Math.round(mort + dbt), netWorth: Math.round(liquid + immo - mort - dbt) });
  }
  return years;
}

export const SAMPLE_PROFILE: BAData = {
  profile: { lang: "fr" },
  accounts: [
    { id: "a1", type: "rrsp", label: "REER — Desjardins", balance: 87500, contribution: 8000, returnRate: 0.055 },
    { id: "a2", type: "tfsa", label: "CELI — Wealthsimple", balance: 42000, contribution: 7000, returnRate: 0.06 },
    { id: "a3", type: "nreg", label: "Non-enregistré — Questrade", balance: 23500, contribution: 3000, returnRate: 0.05 },
    { id: "a4", type: "fhsa", label: "CELIAPP", balance: 8000, contribution: 8000, returnRate: 0.05 },
    { id: "a5", type: "rregop", label: "RREGOP", balance: 62000, contribution: 0, returnRate: 0.04 },
    { id: "a6", type: "savings", label: "CPG — Tangerine", balance: 15000, contribution: 0, returnRate: 0.042 },
  ],
  properties: [
    { id: "p1", label: "Résidence — Sherbrooke", value: 425000, appreciation: 0.03, rentalIncome: 0, isRental: false, mortgage: { balance: 248000, rate: 0.0529, termYears: 3, amortYears: 21, payment: 0, autoCalc: true } },
    { id: "p2", label: "Duplex — Magog", value: 380000, appreciation: 0.025, rentalIncome: 1800, isRental: true, mortgage: { balance: 195000, rate: 0.0579, termYears: 4, amortYears: 23, payment: 0, autoCalc: true } },
  ],
  otherAssets: [{ id: "o1", label: "Honda CR-V 2022", value: 28000, growth: -0.12 }, { id: "o2", label: "Crypto", value: 4500, growth: 0 }],
  debts: [
    { id: "d1", type: "loc", label: "Marge Desjardins", balance: 12000, rate: 0.0795, payment: 400 },
    { id: "d2", type: "auto", label: "Prêt Honda", balance: 18500, rate: 0.0649, termMonths: 48, payment: 440 },
    { id: "d3", type: "card", label: "Visa Infinite", balance: 3200, rate: 0.2099, payment: 200 },
  ],
  income: { salary: 82000, salaryGrowth: 0.025, otherIncome: 0 },
  snapshots: [
    { id: "s1", date: "2025-01-15", note: "Premier bilan", netWorth: 398200, liquid: 210000, totalAssets: 1032000, totalDebts: 468000 },
    { id: "s2", date: "2025-04-12", note: "Après bonus", netWorth: 421800, liquid: 228000, totalAssets: 1058000, totalDebts: 456200 },
    { id: "s3", date: "2025-07-20", note: "Achat duplex Magog", netWorth: 412500, liquid: 218000, totalAssets: 1420000, totalDebts: 640500 },
    { id: "s4", date: "2025-10-05", note: "Marchés en hausse", netWorth: 445100, liquid: 232000, totalAssets: 1455000, totalDebts: 628900 },
    { id: "s5", date: "2026-01-10", note: "Bilan 2026", netWorth: 461500, liquid: 238000, totalAssets: 1470000, totalDebts: 622500 },
  ],
  reminder: { email: "", frequency: "quarterly", enabled: false }
};
