// /lib/constants-registry.ts
// Master registry of all fiscal, tax, and program constants used in BuildFi.
// This file is the REFERENCE — the actual values live in engine/index.js and planner.html.
// Used by /api/cron/constants-check to detect when values need updating.
//
// SOURCE DEPARTMENTS:
// - CRA (Canada Revenue Agency): tax brackets, RRSP/TFSA limits, EI rates, dividend credits
// - Finance Canada: budget legislation (capital gains, FHSA, corporate SBD)
// - ESDC (Employment & Social Development Canada): CPP contributions, CESG
// - Service Canada: OAS/GIS payment amounts (quarterly)
// - RRQ (Régie des rentes du Québec): QPP rates, QPP2
// - Revenu Québec: QC brackets, QPIP/RQAP, IQEE/QESI, FTQ credit
// - Provincial finance ministries: provincial brackets, credits, surtaxes
//
// HOW TO UPDATE ANNUALLY:
// 1. Run /api/cron/constants-check (or wait for January auto-run)
// 2. Review the diff it produces against published values
// 3. Update values in engine/index.js lines 16-56 (the PROV_TAX block)
// 4. Mirror EXACTLY in planner.html lines 1167-1207
// 5. Update quiz-translators (RRSP cap, TFSA limit, default inflation)
// 6. Update this registry with new values + sources
// 7. Run engine tests: they validate calcTax output against expected reference values
// 8. Run `npm run build` to verify no compilation errors

export const TAX_YEAR = 2026;

// ── Federal ──────────────────────────────────────────────────────

export const FEDERAL = {
  brackets: [58523, 117045, 181440, 258482],
  rates: [0.14, 0.205, 0.26, 0.29, 0.33],
  personalAmount: 16452,
  ageCreditAmount: 8790,
  ageCreditThreshold: 44325,
  pensionCreditMax: 2000,
  department: "CRA + Finance Canada",
  source: "CRA T1 General 2026; Budget 2024 (14% first bracket via Bill C-69)",
  engineLines: "engine/index.js:17-19, planner.html:1168-1170",
} as const;

// ── Provincial ───────────────────────────────────────────────────

export interface ProvincialTax {
  brackets: number[];
  rates: number[];
  personalAmount: number;
  ageCreditAmount: number;
  ageCreditThreshold: number;
  pensionCreditAmount: number;
  eligDivCredit: number;
  nonEligDivCredit: number;
}

// Source: each province's Ministry of Finance (published in provincial budgets/gazettes)
// QC: Revenu Québec — revenuquebec.ca/en/citizens/your-situation/new-residents/income-tax-rates
// ON: Ontario Ministry of Finance — ontario.ca/document/ontario-finances
// BC: BC Ministry of Finance — gov.bc.ca/gov/content/taxes/income-taxes/personal
// AB: Alberta Treasury Board — alberta.ca/personal-income-tax
// Others: respective provincial finance departments
export const PROVINCIAL: Record<string, ProvincialTax> = {
  QC: { brackets: [54345, 108680, 132245], rates: [0.14, 0.19, 0.24, 0.2575], personalAmount: 18952, ageCreditAmount: 3903, ageCreditThreshold: 0, pensionCreditAmount: 2918, eligDivCredit: 0.1118, nonEligDivCredit: 0.039362 },
  ON: { brackets: [53891, 107785, 150000, 220000], rates: [0.0505, 0.0915, 0.1116, 0.1216, 0.1316], personalAmount: 12091, ageCreditAmount: 5286, ageCreditThreshold: 42335, pensionCreditAmount: 1580, eligDivCredit: 0.10, nonEligDivCredit: 0.029863 },
  BC: { brackets: [49159, 98320, 112883, 137073, 185854, 259197], rates: [0.0506, 0.077, 0.105, 0.1229, 0.147, 0.168, 0.205], personalAmount: 12901, ageCreditAmount: 5766, ageCreditThreshold: 42660, pensionCreditAmount: 1000, eligDivCredit: 0.12, nonEligDivCredit: 0.0196 },
  AB: { brackets: [154259, 185203, 246938, 370220], rates: [0.1, 0.12, 0.13, 0.14, 0.15], personalAmount: 22769, ageCreditAmount: 5553, ageCreditThreshold: 43906, pensionCreditAmount: 1491, eligDivCredit: 0.0812, nonEligDivCredit: 0.0218 },
  SK: { brackets: [54532, 155805], rates: [0.105, 0.125, 0.145], personalAmount: 20381, ageCreditAmount: 5518, ageCreditThreshold: 0, pensionCreditAmount: 1000, eligDivCredit: 0.11, nonEligDivCredit: 0.02105 },
  MB: { brackets: [47000, 100000], rates: [0.108, 0.1275, 0.174], personalAmount: 15780, ageCreditAmount: 3728, ageCreditThreshold: 0, pensionCreditAmount: 1000, eligDivCredit: 0.08, nonEligDivCredit: 0.007835 },
  NB: { brackets: [51306, 102614, 190081], rates: [0.094, 0.14, 0.16, 0.195], personalAmount: 13396, ageCreditAmount: 5849, ageCreditThreshold: 42553, pensionCreditAmount: 1000, eligDivCredit: 0.14, nonEligDivCredit: 0.0275 },
  NS: { brackets: [30182, 60364, 94860, 153000], rates: [0.0879, 0.1495, 0.1667, 0.175, 0.21], personalAmount: 8651, ageCreditAmount: 4897, ageCreditThreshold: 0, pensionCreditAmount: 1000, eligDivCredit: 0.0885, nonEligDivCredit: 0.0299 },
  PE: { brackets: [33538, 67079], rates: [0.098, 0.138, 0.167], personalAmount: 13865, ageCreditAmount: 4862, ageCreditThreshold: 0, pensionCreditAmount: 1000, eligDivCredit: 0.105, nonEligDivCredit: 0.0163 },
  NL: { brackets: [44062, 88123, 157329, 220262, 281387, 562714], rates: [0.087, 0.145, 0.158, 0.178, 0.198, 0.208, 0.213], personalAmount: 11034, ageCreditAmount: 7742, ageCreditThreshold: 39880, pensionCreditAmount: 1000, eligDivCredit: 0.063, nonEligDivCredit: 0.032 },
  NT: { brackets: [51963, 103931, 169067], rates: [0.059, 0.086, 0.122, 0.1405], personalAmount: 17041, ageCreditAmount: 8200, ageCreditThreshold: 0, pensionCreditAmount: 1000, eligDivCredit: 0.115, nonEligDivCredit: 0.06 },
  YT: { brackets: [58523, 117045, 181440, 258482, 500000], rates: [0.064, 0.09, 0.109, 0.128, 0.15, 0.16], personalAmount: 16452, ageCreditAmount: 8790, ageCreditThreshold: 44325, pensionCreditAmount: 2000, eligDivCredit: 0.12, nonEligDivCredit: 0.0067 },
  NU: { brackets: [54333, 108668, 177231], rates: [0.04, 0.07, 0.09, 0.115], personalAmount: 18284, ageCreditAmount: 14865, ageCreditThreshold: 0, pensionCreditAmount: 2000, eligDivCredit: 0.115, nonEligDivCredit: 0.0261 },
};

// ── CPP / QPP ────────────────────────────────────────────────────

export const CPP_QPP = {
  maxMonthly65: 1507.65,
  ympe: 74600,
  yampe: 85000,
  cpp2MaxMonthly: 81.0,
  basicExemption: 3500,
  employeeRateQC: 0.064,
  employeeRateROC: 0.0595,
  cpp2Rate: 0.04,
  earlyReductionPerMonth: 0.006,
  deferralBonusPerMonth: 0.007,
  minAdjFactor: 0.64,
  maxAdjFactor: 1.42,
  maxContribYears: 40,
  survivorBenefitCap: 784,
  department: "ESDC (CPP) + RRQ (QPP)",
  source: "ESDC CPP contribution rates 2026; RRQ cotisation tables 2026",
  sourceUrls: [
    "canada.ca/en/services/benefits/publicpensions/cpp/contributions.html",
    "rrq.gouv.qc.ca/en/programmes/regime_rentes/regime-rentes-quebec/cotisation",
  ],
  engineLines: "engine/index.js:24-27, 215-219, 834-841",
} as const;

// ── OAS ──────────────────────────────────────────────────────────

export const OAS = {
  maxMonthly: 742.31,
  clawbackThreshold: 95323,
  clawbackRate: 0.15,
  deferralBonusPerMonth: 0.006,
  maxDeferralFactor: 1.36,
  bonus75Plus: 1.10,
  department: "Service Canada / ESDC",
  source: "Service Canada OAS payment amounts Q1 2026 (updated quarterly Jan/Apr/Jul/Oct)",
  sourceUrl: "canada.ca/en/services/benefits/publicpensions/cpp/old-age-security/payments.html",
  engineLines: "engine/index.js:20-21, 228-234",
} as const;

// ── GIS ──────────────────────────────────────────────────────────

export const GIS = {
  maxSingle: 1105.43,
  maxCouple: 667.41,
  reductionRate: 0.50,
  department: "Service Canada / ESDC",
  source: "Service Canada GIS rates Q1 2026 (updated quarterly with OAS)",
  sourceUrl: "canada.ca/en/services/benefits/publicpensions/cpp/old-age-security/guaranteed-income-supplement/benefit-amount.html",
  engineLines: "engine/index.js:22-23, 242",
} as const;

// ── TFSA ─────────────────────────────────────────────────────────

export const TFSA = {
  annualLimit: 7000,
  cumulativeSchedule: [
    { years: "2009-2012", annual: 5000 },
    { years: "2013-2014", annual: 5500 },
    { years: "2015", annual: 10000 },
    { years: "2016-2018", annual: 5500 },
    { years: "2019-2022", annual: 6000 },
    { years: "2023", annual: 6500 },
    { years: "2024-2026", annual: 7000 },
  ],
  // Room accumulates from age 18 only. Engine handles via _tfsaYrs18 calculation.
  // planner.html:3391-3396 computes cumulative limit based on years since age 18.
  department: "CRA (announced by Finance Canada in budgets)",
  source: "CRA TFSA contribution room 2026; indexed to CPI, rounded to nearest $500",
  sourceUrl: "canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account/contributions.html",
  engineLines: "engine/index.js:29, 262-266; planner.html:3391-3396 (room calc by age)",
} as const;

// ── RRSP ─────────────────────────────────────────────────────────

export const RRSP = {
  contributionRate: 0.18,
  dollarCap: 31560,
  department: "CRA (announced by Finance Canada)",
  source: "CRA RRSP dollar limit 2026; = 18% of previous year's earned income, capped",
  sourceUrl: "canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/contributing-a-rrsp-prpp/rrsp-mp-limit.html",
  engineLines: "quiz-translator.ts:79, quiz-translator-inter.ts:72, quiz-translator-expert.ts:127",
} as const;

// ── FHSA ─────────────────────────────────────────────────────────

export const FHSA = {
  annualLimit: 8000,
  lifetimeLimit: 40000,
  maxAge: 71,
  maxDuration: 15,
  department: "Finance Canada (Budget 2022, effective 2023)",
  source: "CRA FHSA rules — not indexed (fixed $8K/$40K since inception)",
  sourceUrl: "canada.ca/en/revenue-agency/services/tax/individuals/topics/first-home-savings-account.html",
  engineLines: "engine/index.js:272, 371, 380",
} as const;

// ── Employment Insurance ─────────────────────────────────────────

export const EI = {
  maxInsurableEarnings: 65700,
  rateQC: 0.0130,
  rateROC: 0.0163,
  department: "CRA (rates set by CEIC — Canada Employment Insurance Commission)",
  source: "CRA EI premium rates 2026; QC rate lower due to QPIP",
  sourceUrl: "canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/employment-insurance-ei/ei-premium-rates-maximums.html",
  engineLines: "engine/index.js:843-844",
} as const;

// ── QPIP / RQAP ─────────────────────────────────────────────────

export const QPIP = {
  maxInsurable: 94000,
  employeeRate: 0.00494,
  department: "RQAP / Conseil de gestion de l'assurance parentale",
  source: "RQAP 2026 premium rates — QC-only parental insurance",
  sourceUrl: "rqap.gouv.qc.ca/en/about-the-plan/general-information/premiums-and-maximum-insurable-earnings",
  engineLines: "engine/index.js:849-850",
} as const;

// ── Capital Gains ────────────────────────────────────────────────

export const CAPITAL_GAINS = {
  inclusionRateLow: 0.50,
  inclusionRateHigh: 0.6667,
  threshold: 250000,
  department: "Finance Canada",
  source: "Budget 2024 (Bill C-69) — 2/3 inclusion above $250K, effective June 25 2024",
  engineLines: "engine/index.js:1864",
} as const;

// ── Corporate ────────────────────────────────────────────────────

export const CORPORATE = {
  sbdLimit: 500000,
  passiveIncomeGrindThreshold: 50000,
  passiveIncomeGrindRate: 5,
  lcge: 1250000,
  rdtohRate: 0.3067,
  rdtohRefundRate: 0.3833,
  department: "Finance Canada + CRA (T2)",
  source: "CRA T2 corporate rates 2026; SBD limit per ITA 125(2); LCGE per Budget 2024 ($1.25M)",
  engineLines: "engine/index.js:172-200",
} as const;

// ── Dividends ────────────────────────────────────────────────────

export const DIVIDENDS = {
  eligibleGrossUp: 1.38,
  nonEligibleGrossUp: 1.15,
  federalEligibleCredit: 0.150198,
  federalNonEligibleCredit: 0.090301,
  department: "CRA (rates per ITA 82(1), 121)",
  source: "CRA dividend gross-up and tax credit rates 2026",
  note: "Eligible gross-up dropping to 1.38 from 1.38 (no change). Non-eligible stable at 1.15. Provincial credits in PROVINCIAL entries above.",
  engineLines: "engine/index.js:67-68, 102-103",
} as const;

// ── GST/HST Credit ───────────────────────────────────────────────

export const GST_CREDIT = {
  baseSingle: 519,
  spouseSupplement: 171,
  incomeThreshold: 44324,
  phaseoutRate: 0.05,
  department: "CRA (amounts set by Finance Canada, indexed to CPI)",
  source: "CRA GST/HST credit Jul 2025 - Jun 2026; indexed annually",
  sourceUrl: "canada.ca/en/revenue-agency/services/child-family-benefits/goods-services-tax-harmonized-sales-tax-gst-hst-credit.html",
  engineLines: "engine/index.js:1224-1227",
} as const;

// ── Ontario Surtax ───────────────────────────────────────────────

export const ON_SURTAX = {
  threshold1: 4991,
  rate1: 0.20,
  threshold2: 6387,
  rate2: 0.36,
  department: "Ontario Ministry of Finance",
  source: "Ontario personal income tax surtax 2026",
  engineLines: "engine/index.js:137-142",
} as const;

// ── FTQ / Fondaction ─────────────────────────────────────────────

export const FTQ = {
  annualMax: 5000,
  creditRate: 0.30,
  department: "Revenu Québec",
  source: "Revenu Québec — crédit d'impôt pour fonds de travailleurs (FTQ + Fondaction); QC-only",
  sourceUrl: "revenuquebec.ca/en/citizens/income-tax-return/completing-your-income-tax-return/completing-your-return/line-by-line-help/396-to-415-non-refundable-tax-credits/line-424",
  engineLines: "engine/index.js:1769",
} as const;

// ── RESP / CESG / IQEE ──────────────────────────────────────────

export const RESP = {
  // Federal: CESG (Canada Education Savings Grant) — administered by ESDC
  cesgMatchRate: 0.20,
  cesgEligibleMax: 2500,
  cesgLifetimeMax: 7200,
  // QC: IQEE / QESI (Incitatif québécois à l'épargne-études) — Revenu Québec
  iqeeBaseRate: 0.10,
  iqeeEligibleMax: 2500,
  iqeeLifetimeMax: 3600,
  iqeeEnhancedRate: 0.20,       // for family income < ~50K (income-tested)
  // Engine model
  assumedGrowthRate: 0.05,
  department: "ESDC (CESG) + Revenu Québec (IQEE/QESI)",
  source: "ESDC CESG 2026; Revenu Québec IQEE 2026",
  sourceUrls: [
    "canada.ca/en/employment-social-development/services/student-financial-aid/education-savings/cesg.html",
    "revenuquebec.ca/en/citizens/income-tax-return/completing-your-income-tax-return/completing-your-return/line-by-line-help/point-28/education-incentive",
  ],
  engineLines: "engine/index.js:1361-1363",
  engineNote: "Engine applies CESG 20% only. IQEE not modeled (grants go to child, not parent's retirement). MC tracks cash flow: contributions deducted from NR, capital+grants+growth returned at respReturnAge.",
  // Other provincial RESP grants (NOT in engine — informational only):
  provincialGrants: {
    BC: "BCTESG: $1,200 one-time at age 6 — CANCELLED 2024",
    SK: "SAGES: $500/yr — CANCELLED 2018",
    AB: "ACES: $500 at birth + $100/yr — CANCELLED 2015; replaced by CLB eligibility",
    note: "No active provincial RESP grants outside QC IQEE as of 2026. CLB (Canada Learning Bond) is federal, income-tested, no contribution required.",
  },
} as const;

// ── CLB (Canada Learning Bond) ──────────────────────────────────

export const CLB = {
  initialAmount: 500,
  annualAmount: 100,
  lifetimeMax: 2000,
  maxAge: 15,
  department: "ESDC",
  source: "ESDC CLB — for children of low-income families, no contribution required",
  sourceUrl: "canada.ca/en/employment-social-development/services/student-financial-aid/education-savings/clb.html",
  engineNote: "Not modeled in MC — income-tested, goes directly to child's RESP",
} as const;

// ── Default Assumptions ──────────────────────────────────────────

export const DEFAULTS = {
  inflation: 0.021,
  equityReturn: 0.07,
  bondReturn: 0.035,
  equityVolatility: 0.16,
  bondVolatility: 0.06,
  note: "Not government-published — internal assumptions based on historical data. Inflation = Bank of Canada 2% target + margin.",
} as const;

// ── All constants for comparison ─────────────────────────────────

export function getAllConstants(): Record<string, unknown> {
  return {
    taxYear: TAX_YEAR,
    federal: FEDERAL,
    cppQpp: CPP_QPP,
    oas: OAS,
    gis: GIS,
    tfsa: TFSA,
    rrsp: RRSP,
    fhsa: FHSA,
    ei: EI,
    qpip: QPIP,
    capitalGains: CAPITAL_GAINS,
    corporate: CORPORATE,
    dividends: DIVIDENDS,
    gstCredit: GST_CREDIT,
    onSurtax: ON_SURTAX,
    ftq: FTQ,
    resp: RESP,
    clb: CLB,
    defaults: DEFAULTS,
    provincial: PROVINCIAL,
  };
}

// ── Update checklist (for annual review) ─────────────────────────
// Each entry: what to update, which files, who publishes it, and where to check

export const ANNUAL_UPDATE_CHECKLIST = [
  { category: "Federal brackets + personal amount", department: "CRA / Finance Canada", files: ["engine/index.js:17-19", "planner.html:1168-1170"], source: "canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/canadian-income-tax-rates-individuals-current-previous-years.html" },
  { category: "Provincial brackets (13 provinces)", department: "Each province's Finance Ministry", files: ["engine/index.js:40-56", "planner.html:1191-1207"], source: "CRA provincial tax tables or respective provincial finance websites" },
  { category: "QC brackets + personal amount", department: "Revenu Québec", files: ["engine/index.js:40", "planner.html:1191"], source: "revenuquebec.ca/en/citizens/your-situation/new-residents/income-tax-rates" },
  { category: "CPP rates and YMPE/YAMPE", department: "ESDC", files: ["engine/index.js:24-27,834-841", "planner.html:1175-1178,3962-3968"], source: "canada.ca/en/services/benefits/publicpensions/cpp/contributions.html" },
  { category: "QPP rates", department: "RRQ", files: ["engine/index.js:24-27", "planner.html:1175-1178"], source: "rrq.gouv.qc.ca/en/programmes/regime_rentes/regime-rentes-quebec/cotisation" },
  { category: "OAS max monthly + clawback threshold", department: "Service Canada / ESDC", files: ["engine/index.js:20-21", "planner.html:1171-1172"], source: "canada.ca/en/services/benefits/publicpensions/cpp/old-age-security/payments.html", note: "Quarterly — check Jan/Apr/Jul/Oct" },
  { category: "GIS max amounts", department: "Service Canada / ESDC", files: ["engine/index.js:22-23", "planner.html:1173-1174"], source: "canada.ca/en/services/benefits/publicpensions/cpp/old-age-security/guaranteed-income-supplement/benefit-amount.html", note: "Quarterly with OAS" },
  { category: "TFSA annual limit", department: "CRA / Finance Canada", files: ["engine/index.js:29", "planner.html:1180", "quiz-translator*.ts"], source: "canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account/contributions.html" },
  { category: "RRSP dollar cap", department: "CRA / Finance Canada", files: ["quiz-translator.ts:79", "quiz-translator-inter.ts:72", "quiz-translator-expert.ts:127"], source: "canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/contributing-a-rrsp-prpp/rrsp-mp-limit.html" },
  { category: "EI premiums + max insurable", department: "CRA / CEIC", files: ["engine/index.js:843-844", "planner.html:3971-3972"], source: "canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/employment-insurance-ei/ei-premium-rates-maximums.html" },
  { category: "QPIP/RQAP premiums + max insurable", department: "RQAP / Conseil de gestion", files: ["engine/index.js:849-850", "planner.html:3977-3978"], source: "rqap.gouv.qc.ca/en/about-the-plan/general-information/premiums-and-maximum-insurable-earnings" },
  { category: "CESG rates + lifetime max", department: "ESDC", files: ["engine/index.js:1361", "planner.html:~4489"], source: "canada.ca/en/employment-social-development/services/student-financial-aid/education-savings/cesg.html" },
  { category: "IQEE/QESI rates + lifetime max", department: "Revenu Québec", files: ["engine tooltip only — not in MC calc"], source: "revenuquebec.ca/en/citizens/income-tax-return/completing-your-income-tax-return/completing-your-return/line-by-line-help/point-28/education-incentive" },
  { category: "Corporate SBD limit + LCGE", department: "Finance Canada / CRA", files: ["engine/index.js:177-191", "planner.html:1328-1342"], source: "CRA T2 rates page + ITA 125(2)" },
  { category: "Capital gains inclusion rate + threshold", department: "Finance Canada", files: ["engine/index.js:1864"], source: "Budget legislation (currently Budget 2024, Bill C-69)" },
  { category: "GST/HST credit amounts", department: "CRA (indexed by Finance)", files: ["engine/index.js:1224-1227", "planner.html:4352-4355"], source: "canada.ca/en/revenue-agency/services/child-family-benefits/goods-services-tax-harmonized-sales-tax-gst-hst-credit.html" },
  { category: "Ontario surtax thresholds", department: "Ontario Ministry of Finance", files: ["engine/index.js:137-142", "planner.html:1289-1292"], source: "ontario.ca/document/ontario-finances" },
  { category: "FTQ/Fondaction credit rate", department: "Revenu Québec", files: ["engine/index.js:1769"], source: "revenuquebec.ca — fonds de travailleurs" },
  { category: "Dividend gross-up + credit rates", department: "CRA (per ITA 82/121)", files: ["engine/index.js:67-68,102-103", "planner.html:1218-1219,1253-1254"], source: "CRA dividend tax credit rates" },
  { category: "ENGINE_VERSION", department: "Internal", files: ["lib/api-helpers.ts:9"], source: "Increment after any constant update" },
  { category: "CONSTANTS_YEAR", department: "Internal", files: ["lib/api-helpers.ts:10"], source: "Set to the tax year of the constants" },
  { category: "Expected tax reference table", department: "Internal", files: ["planner.html:1411-1418"], source: "Recalculate after bracket updates using known test cases" },
] as const;
