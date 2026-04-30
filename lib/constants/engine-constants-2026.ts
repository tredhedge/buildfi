// lib/constants/engine-constants-2026.ts
// ══════════════════════════════════════════════════════════════════════════════
// BuildFi Engine Constants — 2026
// ══════════════════════════════════════════════════════════════════════════════
// ALL government-sourced values extracted from planner_v2.html (engine source
// of truth). Designed for annual update: copy this file to 2027, update the
// values that changed, register in index.ts.
//
// Sources: CRA T1 General, Retraite Quebec, Service Canada, provincial tax
// acts, CIA/ICA mortality tables, DMS/MSCI correlation data.
//
// Last verified: 2026-04-14 against planner_v2.html
// ══════════════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// Province code union
// ---------------------------------------------------------------------------

export type ProvinceCode =
  | 'QC' | 'ON' | 'BC' | 'AB' | 'SK' | 'MB'
  | 'NB' | 'NS' | 'PE' | 'NL' | 'NT' | 'YT' | 'NU';

// ---------------------------------------------------------------------------
// Sub-types
// ---------------------------------------------------------------------------

export interface ProvincialTax {
  b: number[];
  r: number[];
  pd: number;
  abate: number;
  eligDivCr: number;
  nonEligDivCr: number;
  ageAmt: number;
  ageThresh: number;
  penAmt: number;
}

export interface CorpRate {
  small: number;
  general: number;
  passive: number;
}

export interface ProbateFee {
  exempt?: number;
  rate?: number;
  cap?: number;
  flat?: number;
}

export interface StressScenario {
  eq: number[];
  bd: number[];
  inf: number[];
  extra?: { deathAge: number };
}

export interface InsurancePremiumBrackets {
  under35: number;
  age35_44: number;
  age45_54: number;
  age55_64: number;
  age65plus: number;
}

export interface SensitivityRange {
  delta: number;
  floor?: number;
  cap?: number;
}

export interface ClampRange {
  min: number;
  max: number;
}

export interface TfsaHistoricalEntry {
  years: number[];
  limit: number;
}

// ---------------------------------------------------------------------------
// Top-level type
// ---------------------------------------------------------------------------

export interface EngineConstants {
  // S1
  TAX_BASE_YEAR: number;

  // S2 — Federal tax
  FED_BRACKETS: readonly [number, number, number, number];
  FED_RATES: readonly [number, number, number, number, number];
  FED_PERSONAL: number;
  PENSION_CREDIT_MAX: number;
  FED_AGE_AMT: number;
  FED_AGE_THRESH: number;
  FED_CREDIT_RATE: number;
  FED_AGE_CLAWBACK_RATE: number;

  // S3 — Dividend integration
  ELIG_GROSSUP: number;
  NON_ELIG_GROSSUP: number;
  FED_ELIG_DTC: number;
  FED_NON_ELIG_DTC: number;

  // S4 — Provincial tax
  PROV_TAX: Record<ProvinceCode, ProvincialTax>;

  // S5 — Ontario surtax
  ON_SURTAX_THR1: number;
  ON_SURTAX_RATE1: number;
  ON_SURTAX_THR2: number;
  ON_SURTAX_RATE2: number;

  // S6 — Corporate tax (CCPC)
  CORP_RATES: Record<ProvinceCode, CorpRate>;
  SBD_LIMIT: number;
  PASSIVE_GRIND_THRESHOLD: number;
  PASSIVE_GRIND_FACTOR: number;
  RDTOH_RATE: number;
  RDTOH_REFUND_RATE: number;
  LCGE: number;

  // S7 — OAS
  OAS_CLAWBACK_THRESHOLD: number;
  OAS_MAX_MONTHLY: number;
  OAS_DEFERRAL_BONUS_PER_MONTH: number;
  OAS_MAX_DEFERRAL_FACTOR: number;
  OAS_75_PLUS_BONUS: number;
  OAS_CLAWBACK_RATE: number;

  // S8 — QPP/CPP
  QPP_MAX_MONTHLY: number;
  QPP_MGA: number;
  QPP_YAMPE: number;
  QPP2_MAX_MONTHLY: number;
  QPP_MAX_CONTRIB_YEARS: number;
  QPP_EARLY_REDUCTION_PER_MONTH: number;
  QPP_LATE_BONUS_PER_MONTH: number;
  QPP_ADJ_FLOOR: number;
  QPP_ADJ_CAP: number;
  QPP_SURVIVOR_CAP_MONTHLY: number;
  QPP_SURVIVOR_FRACTION: number;

  // S9 — GIS
  GIS_MAX_SINGLE: number;
  GIS_MAX_COUPLE: number;
  GIS_EMPLOYMENT_FULL_EXEMPT: number;
  GIS_EMPLOYMENT_PARTIAL_CEILING: number;
  GIS_PARTIAL_EXEMPT_RATE: number;
  GIS_REDUCTION_RATE: number;

  // S10 — GST/HST credit
  GST_CREDIT_SINGLE: number;
  GST_CREDIT_SPOUSE_SUPPLEMENT: number;
  GST_PHASEOUT_THRESHOLD: number;
  GST_PHASEOUT_RATE: number;

  // S11 — TFSA
  TFSA_ANNUAL_LIMIT: number;
  TFSA_HISTORICAL_LIMITS: readonly TfsaHistoricalEntry[];
  TFSA_INDEX_ROUNDING: number;

  // S12 — FHSA
  FHSA_LIFETIME_MAX: number;
  FHSA_ANNUAL_LIMIT: number;
  FHSA_MAX_YEARS: number;
  FHSA_MANDATORY_CLOSE_AGE: number;

  // S13 — RESP/CESG
  CESG_MAX_ELIGIBLE_ANNUAL: number;
  CESG_MATCH_RATE: number;

  // S14 — Capital gains
  CG_THRESHOLD: number;
  CG_INCLUSION_LOW: number;
  CG_INCLUSION_HIGH: number;

  // S15 — Pension splitting
  PENSION_SPLIT_MAX: number;
  QPP_SHARING_TAX_FACTOR: number;

  // S16 — Tax credits
  FTQ_CSN_MAX_CONTRIB: number;
  FTQ_CSN_CREDIT_RATE: number;
  DONATION_CREDIT_RATE_LOW: number;
  DONATION_CREDIT_RATE_HIGH: number;
  DONATION_FIRST_TIER: number;

  // S17 — LIRA/FRV
  FRV_MAX_DIVISOR_QC: number;
  FRV_UNLOCK_MIN_AGE: number;

  // S18 — RSU/Employment
  RSU_TAX_RATE: number;

  // S19 — Payroll deductions
  QPP_BASIC_EXEMPTION: number;
  QPP_RATE_QC: number;
  CPP_RATE_ROC: number;
  QPP2_CPP2_RATE: number;
  EI_MAX_INSURABLE: number;
  EI_RATE_QC: number;
  EI_RATE_ROC: number;
  RQAP_MAX_INSURABLE: number;
  RQAP_RATE: number;

  // S20 — RRIF minimum rates
  RRIF_MIN: Record<number, number>;
  RRIF_MIN_95_PLUS: number;

  // S21 — Probate by province
  PROBATE: Record<ProvinceCode | 'DEFAULT', ProbateFee>;

  // S22 — Real estate rules
  HELOC_MAX_LTV: number;
  REFI_MAX_LTV: number;
  CCA_RATE: number;
  LAND_PORTION: number;
  PROPERTY_SALE_COST: number;

  // S23 — NR tax drag components
  ETF_TURNOVER: number;
  CAN_DIVIDEND_YIELD: number;
  US_DIVIDEND_YIELD: number;
  INTL_EM_DIVIDEND_YIELD: number;
  ELIG_DIVIDEND_TAX_DISCOUNT: number;
  WHT_RATE_FOREIGN: number;

  // S24 — Mortality (CPM-2023)
  CPM_MALE: Record<number, number>;
  CPM_FEMALE: Record<number, number>;
  CPM_BASE_YEAR: number;
  CPM_IMPROVEMENT_RATE: number;
  CPM_MAX_AGE: number;
  CPM_FALLBACK_QX: number;

  // S25 — Correlation matrices
  /** 5x5: [equity, bond, inflation, privateEquity, preciousMetals] */
  CRM: readonly (readonly number[])[];
  /** 5x5 crisis variant */
  CRM_CRISIS: readonly (readonly number[])[];
  /** 8x8: [canEq, usEq, intlEq, emEq, bondCan, inflation, privateEquity, preciousMetals] */
  CRM8: readonly (readonly number[])[];
  /** 8x8 crisis variant */
  CRM8_CRISIS: readonly (readonly number[])[];

  // S26 — Stress scenarios
  STRESS_SCENARIOS: Record<string, StressScenario>;

  // S27 — Market structure
  CRISIS_THRESHOLD: number;
  FAT_TAIL_DF: number;
  NORMAL_DF: number;
  INTL_STRESS_BETA: number;
  EM_STRESS_BETA: number;
  PE_STRESS_BETA: number;
  PM_STRESS_BETA: number;
  DC_STRESS_BETA: number;
  STOCH_INF_VOL: number;
  INF_FLOOR: number;
  INF_CAP: number;
  RE_EQUITY_RHO: number;
  RE_CRISIS_RHO: number;
  RE_DECLINE_FLOOR: number;

  // S28 — Insurance premium rates
  INSURANCE_PREMIUM_FEMALE: InsurancePremiumBrackets;
  INSURANCE_PREMIUM_MALE: InsurancePremiumBrackets;
  SURVIVOR_INCOME_FACTOR: number;
  CHILD_COVERAGE: number;
  FINAL_EXPENSES: number;

  // S29 — Sensitivity ranges
  SENSITIVITY: {
    SPENDING: SensitivityRange;
    ALLOC_RRSP: SensitivityRange;
    ALLOC_TFSA: SensitivityRange;
    INFLATION: SensitivityRange;
    RET_AGE: SensitivityRange;
    EQ_RETURN: SensitivityRange;
    EQ_VOL: SensitivityRange;
    QPP_AGE: SensitivityRange;
    OAS_AGE: SensitivityRange;
    DB_PENSION: SensitivityRange;
  };

  // S30 — MC parameter clamps
  CLAMPS: {
    MER: ClampRange;
    NR_TAX_DRAG: ClampRange;
    INFLATION: ClampRange;
    EQ_RET: ClampRange;
    EQ_VOL: ClampRange;
    BND_RET: ClampRange;
    BND_VOL: ClampRange;
    SPENDING_PHASE: ClampRange;
    HEALTH_MUL: ClampRange;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: TAX BASE YEAR
// Source: CRA T1 General 2026
// planner_v2.html line ~1490
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: FEDERAL TAX
// Source: CRA T1 General 2026 — federal brackets, rates, personal amount
// Bill C-69 reduced base rate to 14% (was 15%)
// planner_v2.html lines 1491-1502
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: DIVIDEND INTEGRATION
// Source: CRA — eligible/non-eligible dividend gross-up and DTC rates
// planner_v2.html lines 1552-1553, 1587-1588
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: PROVINCIAL TAX (13 provinces/territories)
// Source: Provincial tax acts (QC, ON, BC, AB, SK, MB, NB, NS, PE, NL, NT, YT, NU)
// Dividend credit rates: RCGT / EY 2025-2026 tables
// planner_v2.html lines 1525-1541
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: ONTARIO SURTAX
// Source: Ontario Income Tax Act — ON428 form
// planner_v2.html lines 1629-1634 (thresholds are indexed)
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: CORPORATE TAX (CCPC)
// Source: CRA — combined federal + provincial rates, SBD rules, RDTOH, LCGE
// planner_v2.html lines 1656-1697
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: OAS
// Source: Service Canada — OAS recovery threshold, max monthly, deferral rules
// planner_v2.html lines 1494-1495, 1711-1721
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: QPP/CPP
// Source: Retraite Quebec / Service Canada — QPP/CPP max, YMPE, YAMPE, CPP2
// planner_v2.html lines 1498-1501, 1699-1709
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: GIS
// Source: Service Canada — GIS max monthly (2026 Q1)
// planner_v2.html lines 1496-1497, 1723-1735
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: GST/HST CREDIT
// Source: CRA — GST/HST credit amounts and phaseout (2025-2026)
// planner_v2.html lines 5023-5029
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 11: TFSA
// Source: CRA — TFSA annual limit and historical limits
// planner_v2.html line 1503
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 12: FHSA
// Source: CRA — First Home Savings Account rules
// planner_v2.html lines 3809, 3938-3950
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 13: RESP/CESG
// Source: ESDC — Canada Education Savings Grant rates
// planner_v2.html line 7031
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 14: CAPITAL GAINS
// Source: CRA — 2024 Budget capital gains inclusion rate changes
// planner_v2.html lines 4500, 5532
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 15: PENSION SPLITTING
// Source: CRA — pension income splitting rules, QPP sharing
// planner_v2.html lines 5058-5063
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 16: TAX CREDITS
// Source: Retraite Quebec (FTQ/Fondaction), CRA (donations)
// planner_v2.html lines 5604-5617
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 17: LIRA/FRV
// Source: Retraite Quebec — FRV withdrawal rules (QC)
// planner_v2.html lines 5209-5210
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 18: RSU/EMPLOYMENT
// Source: Approximate combined marginal rate for RSU taxation
// planner_v2.html line 4831
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 19: PAYROLL DEDUCTIONS
// Source: CRA/RRQ — employee portion, 2026 rates
// planner_v2.html lines 4515-4540
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 20: RRIF MINIMUM RATES
// Source: CRA — RRIF minimum withdrawal rates
// planner_v2.html lines 1746-1748
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 21: PROBATE BY PROVINCE
// Source: Provincial probate/estate administration acts
// planner_v2.html lines 5737-5747
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 22: REAL ESTATE RULES
// Source: CMHC (LTV), CRA (CCA class 1)
// planner_v2.html lines 4884, 5209, 11202-11204
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 23: NR TAX DRAG COMPONENTS
// Source: ETF structure, CRA withholding tax treaties
// planner_v2.html lines 4481-4514 (calcNRItemizedTax, calcWHT)
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 24: MORTALITY (CPM-2023)
// Source: CIA/ICA — CPM-2014 base + Scale MI-2017, projected to 2023 base year
// Target LE at 65: ~86 (M), ~88.5 (F). Validated against CIA/ICA published tables.
// stochDeath() applies further 1% annual improvement from 2023 onward.
// planner_v2.html lines 4342-4469
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 25: CORRELATION MATRICES
// Source: DMS/MSCI 2024
// planner_v2.html lines 4278, 4293, 4297-4318
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 26: STRESS SCENARIOS
// Source: Historical calibration (GFC, dot-com, 1970s, COVID, Japan, etc.)
// planner_v2.html lines 4249-4276
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 27: MARKET STRUCTURE
// Source: Engine inline constants — crisis detection, fat tails, correlations
// planner_v2.html lines 4708-4747
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 28: INSURANCE PREMIUM RATES
// Source: Simplified Canadian term life rates (industry average)
// planner_v2.html lines 6518-6574 (calcInsuranceNeed)
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 29: SENSITIVITY RANGES
// Source: Engine tornado/sensitivity analysis defaults
// planner_v2.html lines 6141-6150
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 30: MC PARAMETER CLAMPS
// Source: Engine param sanitization — physically possible ranges
// planner_v2.html lines 4543-4598
// ═══════════════════════════════════════════════════════════════════════════════

const ENGINE_CONSTANTS_2026: EngineConstants = {

  // ─────────────────────────────────────────────────────────────────────────
  // S1: TAX BASE YEAR
  // ─────────────────────────────────────────────────────────────────────────
  TAX_BASE_YEAR: 2026,

  // ─────────────────────────────────────────────────────────────────────────
  // S2: FEDERAL TAX
  // CRA T1 General 2026. Base rate 14% per Bill C-69 (was 15%).
  // ─────────────────────────────────────────────────────────────────────────
  FED_BRACKETS: [58523, 117045, 181440, 258482] as const,
  FED_RATES: [0.14, 0.205, 0.26, 0.29, 0.33] as const,
  FED_PERSONAL: 16452,
  PENSION_CREDIT_MAX: 2000,
  FED_AGE_AMT: 8790,
  FED_AGE_THRESH: 44325,
  FED_CREDIT_RATE: 0.15,           // 15% non-refundable credit rate
  FED_AGE_CLAWBACK_RATE: 0.15,     // age amount clawed back at 15%

  // ─────────────────────────────────────────────────────────────────────────
  // S3: DIVIDEND INTEGRATION
  // CRA — eligible/non-eligible dividend gross-up and federal DTC rates
  // ─────────────────────────────────────────────────────────────────────────
  ELIG_GROSSUP: 1.38,              // 38% gross-up for eligible dividends
  NON_ELIG_GROSSUP: 1.15,          // 15% gross-up for non-eligible dividends
  FED_ELIG_DTC: 0.150198,          // federal DTC on grossed-up eligible
  FED_NON_ELIG_DTC: 0.090301,      // federal DTC on grossed-up non-eligible

  // ─────────────────────────────────────────────────────────────────────────
  // S4: PROVINCIAL TAX (13 provinces/territories)
  // b = brackets, r = rates, pd = personal deduction, abate = QC abatement
  // eligDivCr/nonEligDivCr = prov dividend tax credit rates (% of grossed-up)
  // ageAmt/ageThresh = provincial age credit, penAmt = pension income amount
  // ─────────────────────────────────────────────────────────────────────────
  PROV_TAX: {
    QC: { b: [54345, 108730, 132245], r: [0.14, 0.19, 0.24, 0.2575], pd: 18952, abate: 0.835, eligDivCr: 0.1118, nonEligDivCr: 0.039362, ageAmt: 3903, ageThresh: 0, penAmt: 2918 },
    ON: { b: [53891, 107785, 150000, 220000], r: [0.0505, 0.0915, 0.1116, 0.1216, 0.1316], pd: 12091, abate: 1, eligDivCr: 0.10, nonEligDivCr: 0.029863, ageAmt: 5286, ageThresh: 42335, penAmt: 1580 },
    BC: { b: [49159, 98320, 112883, 137073, 185854, 259197], r: [0.0506, 0.077, 0.105, 0.1229, 0.147, 0.168, 0.205], pd: 12901, abate: 1, eligDivCr: 0.12, nonEligDivCr: 0.0196, ageAmt: 5766, ageThresh: 42660, penAmt: 1000 },
    AB: { b: [154259, 185203, 246938, 370220], r: [0.1, 0.12, 0.13, 0.14, 0.15], pd: 22769, abate: 1, eligDivCr: 0.0812, nonEligDivCr: 0.0218, ageAmt: 5553, ageThresh: 43906, penAmt: 1491 },
    SK: { b: [54532, 155805], r: [0.105, 0.125, 0.145], pd: 20381, abate: 1, eligDivCr: 0.11, nonEligDivCr: 0.02105, ageAmt: 5518, ageThresh: 0, penAmt: 1000 },
    MB: { b: [47000, 100000], r: [0.108, 0.1275, 0.174], pd: 15780, abate: 1, eligDivCr: 0.08, nonEligDivCr: 0.007835, ageAmt: 3728, ageThresh: 0, penAmt: 1000 },
    NB: { b: [51306, 102614, 190081], r: [0.094, 0.14, 0.16, 0.195], pd: 13396, abate: 1, eligDivCr: 0.14, nonEligDivCr: 0.027518, ageAmt: 5849, ageThresh: 42553, penAmt: 1000 },
    NS: { b: [30182, 60364, 94860, 153000], r: [0.0879, 0.1495, 0.1667, 0.175, 0.21], pd: 8651, abate: 1, eligDivCr: 0.0885, nonEligDivCr: 0.015, ageAmt: 4897, ageThresh: 0, penAmt: 1000 },
    PE: { b: [33538, 67079], r: [0.098, 0.138, 0.167], pd: 13865, abate: 1, eligDivCr: 0.105, nonEligDivCr: 0.013, ageAmt: 4862, ageThresh: 0, penAmt: 1000 },
    NL: { b: [44062, 88123, 157329, 220262, 281387, 562714], r: [0.087, 0.145, 0.158, 0.178, 0.198, 0.208, 0.213], pd: 11034, abate: 1, eligDivCr: 0.063, nonEligDivCr: 0.032, ageAmt: 7742, ageThresh: 39880, penAmt: 1000 },
    NT: { b: [51963, 103931, 169067], r: [0.059, 0.086, 0.122, 0.1405], pd: 17041, abate: 1, eligDivCr: 0.115, nonEligDivCr: 0.06, ageAmt: 8200, ageThresh: 0, penAmt: 1000 },
    YT: { b: [58523, 117045, 181440, 258482, 500000], r: [0.064, 0.09, 0.109, 0.128, 0.15, 0.16], pd: 16452, abate: 1, eligDivCr: 0.1202, nonEligDivCr: 0.0067, ageAmt: 8790, ageThresh: 44325, penAmt: 2000 },
    NU: { b: [54333, 108668, 177231], r: [0.04, 0.07, 0.09, 0.115], pd: 18284, abate: 1, eligDivCr: 0.0551, nonEligDivCr: 0.025904, ageAmt: 14865, ageThresh: 0, penAmt: 2000 },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // S5: ONTARIO SURTAX
  // Ontario Income Tax Act — ON428 form. Thresholds are indexed.
  // ─────────────────────────────────────────────────────────────────────────
  ON_SURTAX_THR1: 4991,
  ON_SURTAX_RATE1: 0.20,
  ON_SURTAX_THR2: 6387,
  ON_SURTAX_RATE2: 0.36,

  // ─────────────────────────────────────────────────────────────────────────
  // S6: CORPORATE TAX (CCPC) — combined federal + provincial rates
  // small = SBD rate, general = above SBD, passive = investment income
  // ─────────────────────────────────────────────────────────────────────────
  CORP_RATES: {
    QC: { small: 0.122, general: 0.265, passive: 0.5017 },
    ON: { small: 0.122, general: 0.265, passive: 0.5017 },
    BC: { small: 0.11, general: 0.27, passive: 0.5067 },
    AB: { small: 0.11, general: 0.23, passive: 0.4667 },
    SK: { small: 0.11, general: 0.27, passive: 0.5067 },
    MB: { small: 0.11, general: 0.27, passive: 0.5067 },
    NB: { small: 0.115, general: 0.29, passive: 0.5267 },
    NS: { small: 0.115, general: 0.29, passive: 0.5267 },
    PE: { small: 0.10, general: 0.31, passive: 0.5467 },
    NL: { small: 0.12, general: 0.30, passive: 0.5367 },
    NT: { small: 0.11, general: 0.265, passive: 0.5017 },
    YT: { small: 0.11, general: 0.27, passive: 0.5067 },
    NU: { small: 0.12, general: 0.27, passive: 0.5067 },
  },
  SBD_LIMIT: 500000,                   // indexed
  PASSIVE_GRIND_THRESHOLD: 50000,       // indexed; SBD reduced $5 per $1 above this
  PASSIVE_GRIND_FACTOR: 5,
  RDTOH_RATE: 0.3067,                  // ~30.67% of passive income added to RDTOH pool
  RDTOH_REFUND_RATE: 0.3833,           // refund rate on dividend extraction
  LCGE: 1250000,                        // lifetime capital gains exemption for CCPC sale

  // ─────────────────────────────────────────────────────────────────────────
  // S7: OAS
  // Service Canada — 2026 values
  // ─────────────────────────────────────────────────────────────────────────
  OAS_CLAWBACK_THRESHOLD: 95323,
  OAS_MAX_MONTHLY: 743.05,  // Q2 2026 (April–June). Q1 was 742.31.
  OAS_DEFERRAL_BONUS_PER_MONTH: 0.006,  // 0.6% per month deferred past 65
  OAS_MAX_DEFERRAL_FACTOR: 1.36,         // max adj = min(1.36, 1 + 0.006 * (age-65) * 12)
  OAS_75_PLUS_BONUS: 1.10,              // 10% enhancement at 75+ (since July 2022)
  OAS_CLAWBACK_RATE: 0.15,              // 15% recovery rate above threshold

  // ─────────────────────────────────────────────────────────────────────────
  // S8: QPP/CPP
  // Retraite Quebec / Service Canada — 2026 values
  // ─────────────────────────────────────────────────────────────────────────
  QPP_MAX_MONTHLY: 1507.65,
  QPP_MGA: 74600,                        // 2026 YMPE
  QPP_YAMPE: 85000,                      // 2026 YAMPE (CPP2 ceiling)
  QPP2_MAX_MONTHLY: 81.00,              // estimated CPP2 max monthly enhancement
  QPP_MAX_CONTRIB_YEARS: 40,
  QPP_EARLY_REDUCTION_PER_MONTH: 0.006,  // 0.6%/month = 7.2%/year early (before 65)
  QPP_LATE_BONUS_PER_MONTH: 0.007,       // 0.7%/month = 8.4%/year late (after 65)
  QPP_ADJ_FLOOR: 0.64,                   // min adjustment factor
  QPP_ADJ_CAP: 1.42,                     // max adjustment factor
  QPP_SURVIVOR_CAP_MONTHLY: 784,         // max combined survivor + own QPP
  QPP_SURVIVOR_FRACTION: 0.60,           // 60% of deceased's QPP

  // ─────────────────────────────────────────────────────────────────────────
  // S9: GIS
  // Service Canada — 2026 Q1 quarterly rates
  // ─────────────────────────────────────────────────────────────────────────
  GIS_MAX_SINGLE: 1105.43,
  GIS_MAX_COUPLE: 665.41,               // when spouse receives full OAS
  GIS_EMPLOYMENT_FULL_EXEMPT: 5000,      // first $5,000 employment income fully exempt
  GIS_EMPLOYMENT_PARTIAL_CEILING: 15000, // next $10,000 at 50% exempt
  GIS_PARTIAL_EXEMPT_RATE: 0.50,
  GIS_REDUCTION_RATE: 0.50,             // GIS reduced 50 cents per dollar of other income

  // ─────────────────────────────────────────────────────────────────────────
  // S10: GST/HST CREDIT
  // CRA — 2025-2026 GST/HST credit
  // ─────────────────────────────────────────────────────────────────────────
  GST_CREDIT_SINGLE: 519,
  GST_CREDIT_SPOUSE_SUPPLEMENT: 171,
  GST_PHASEOUT_THRESHOLD: 44324,
  GST_PHASEOUT_RATE: 0.05,              // 5% phaseout above threshold

  // ─────────────────────────────────────────────────────────────────────────
  // S11: TFSA
  // CRA — annual limit and historical limits for cumulative room calculation
  // ─────────────────────────────────────────────────────────────────────────
  TFSA_ANNUAL_LIMIT: 7000,
  TFSA_HISTORICAL_LIMITS: [
    { years: [2009, 2010, 2011, 2012], limit: 5000 },
    { years: [2013, 2014], limit: 5500 },
    { years: [2015], limit: 10000 },
    { years: [2016, 2017, 2018], limit: 5500 },
    { years: [2019, 2020, 2021, 2022], limit: 6000 },
    { years: [2023], limit: 6500 },
    { years: [2024, 2025, 2026], limit: 7000 },
  ] as const,
  TFSA_INDEX_ROUNDING: 500,             // TFSA limit rounds to nearest $500

  // ─────────────────────────────────────────────────────────────────────────
  // S12: FHSA
  // CRA — First Home Savings Account
  // ─────────────────────────────────────────────────────────────────────────
  FHSA_LIFETIME_MAX: 40000,
  FHSA_ANNUAL_LIMIT: 8000,
  FHSA_MAX_YEARS: 15,                   // account must close after 15 years
  FHSA_MANDATORY_CLOSE_AGE: 71,         // or at age 71, whichever comes first

  // ─────────────────────────────────────────────────────────────────────────
  // S13: RESP/CESG
  // ESDC — Canada Education Savings Grant
  // ─────────────────────────────────────────────────────────────────────────
  CESG_MAX_ELIGIBLE_ANNUAL: 2500,        // CESG on first $2,500 of RESP contributions
  CESG_MATCH_RATE: 0.20,                // 20% match = max $500/year

  // ─────────────────────────────────────────────────────────────────────────
  // S14: CAPITAL GAINS
  // CRA — 2024 Budget inclusion rate changes
  // ─────────────────────────────────────────────────────────────────────────
  CG_THRESHOLD: 250000,                 // first $250K at lower inclusion
  CG_INCLUSION_LOW: 0.50,               // 50% inclusion below threshold
  CG_INCLUSION_HIGH: 0.6667,            // 66.67% inclusion above threshold

  // ─────────────────────────────────────────────────────────────────────────
  // S15: PENSION SPLITTING
  // CRA — pension income splitting (age 65+), QPP/CPP sharing
  // ─────────────────────────────────────────────────────────────────────────
  PENSION_SPLIT_MAX: 0.50,              // up to 50% of eligible pension income
  QPP_SHARING_TAX_FACTOR: 0.15,         // tax benefit factor from QPP equalization

  // ─────────────────────────────────────────────────────────────────────────
  // S16: TAX CREDITS
  // FTQ/Fondaction: Retraite Quebec. Donations: CRA.
  // ─────────────────────────────────────────────────────────────────────────
  FTQ_CSN_MAX_CONTRIB: 5000,            // max annual contribution for credit
  FTQ_CSN_CREDIT_RATE: 0.30,            // 30% combined credit (15% fed + 15% QC)
  DONATION_CREDIT_RATE_LOW: 0.15,        // federal rate on first $200
  DONATION_CREDIT_RATE_HIGH: 0.29,       // federal rate above $200
  DONATION_FIRST_TIER: 200,              // threshold between low/high rates

  // ─────────────────────────────────────────────────────────────────────────
  // S17: LIRA/FRV
  // Retraite Quebec — FRV (QC life income fund) rules
  // ─────────────────────────────────────────────────────────────────────────
  FRV_MAX_DIVISOR_QC: 90,               // max withdrawal = balance / (90 - age)
  FRV_UNLOCK_MIN_AGE: 55,               // minimum age for LIRA -> FRV conversion

  // ─────────────────────────────────────────────────────────────────────────
  // S18: RSU/EMPLOYMENT
  // Approximate combined marginal tax rate for RSU vesting
  // ─────────────────────────────────────────────────────────────────────────
  RSU_TAX_RATE: 0.45,

  // ─────────────────────────────────────────────────────────────────────────
  // S19: PAYROLL DEDUCTIONS (employee portion, 2026 rates)
  // CRA/RRQ — QPP/CPP, CPP2, EI, RQAP
  // ─────────────────────────────────────────────────────────────────────────
  QPP_BASIC_EXEMPTION: 3500,
  QPP_RATE_QC: 0.064,                   // 6.4% in QC
  CPP_RATE_ROC: 0.0595,                 // 5.95% rest of Canada
  QPP2_CPP2_RATE: 0.04,                 // 4% on earnings between YMPE and YAMPE
  EI_MAX_INSURABLE: 65700,              // EI maximum insurable earnings (indexed)
  EI_RATE_QC: 0.0127,                   // 1.27% in QC (lower due to RQAP)
  EI_RATE_ROC: 0.0158,                  // 1.58% rest of Canada
  RQAP_MAX_INSURABLE: 94000,            // RQAP max insurable earnings (indexed)
  RQAP_RATE: 0.00494,                   // 0.494% (QC only)

  // ─────────────────────────────────────────────────────────────────────────
  // S20: RRIF MINIMUM RATES
  // CRA — minimum annual RRIF withdrawal percentage by age
  // ─────────────────────────────────────────────────────────────────────────
  RRIF_MIN: {
    71: 0.0528,
    72: 0.054,
    73: 0.0553,
    74: 0.0567,
    75: 0.0582,
    76: 0.0598,
    77: 0.0617,
    78: 0.0636,
    79: 0.0658,
    80: 0.0682,
    81: 0.0708,
    82: 0.0738,
    83: 0.0771,
    84: 0.0808,
    85: 0.0851,
    86: 0.0899,
    87: 0.0955,
    88: 0.1021,
    89: 0.1099,
    90: 0.1192,
    91: 0.1306,
    92: 0.1449,
    93: 0.1634,
    94: 0.1879,
    95: 0.20,
  },
  RRIF_MIN_95_PLUS: 0.20,               // 20% for ages 95+

  // ─────────────────────────────────────────────────────────────────────────
  // S21: PROBATE BY PROVINCE
  // Provincial probate/estate administration fee schedules
  // ─────────────────────────────────────────────────────────────────────────
  PROBATE: {
    ON: { exempt: 50000, rate: 0.015 },
    BC: { exempt: 50000, rate: 0.014 },
    NS: { rate: 0.015 },
    NB: { rate: 0.015 },
    PE: { rate: 0.015 },
    NL: { rate: 0.006 },
    SK: { rate: 0.007, cap: 7000 },
    MB: { rate: 0.007, cap: 7000 },
    AB: { flat: 525 },
    QC: { flat: 1200 },
    NT: { rate: 0.004 },
    YT: { rate: 0.004 },
    NU: { rate: 0.004 },
    DEFAULT: { rate: 0.004 },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // S22: REAL ESTATE RULES
  // CMHC LTV limits, CRA CCA class 1, industry sale cost estimate
  // ─────────────────────────────────────────────────────────────────────────
  HELOC_MAX_LTV: 0.65,                  // max 65% LTV for HELOC
  REFI_MAX_LTV: 0.80,                   // max 80% LTV for refinance
  CCA_RATE: 0.04,                       // class 1 CCA rate (4%)
  LAND_PORTION: 0.30,                   // default 30% of property value = land (non-depreciable)
  PROPERTY_SALE_COST: 0.05,             // 5% commission/fees on sale (net = 0.95 of equity)

  // ─────────────────────────────────────────────────────────────────────────
  // S23: NR TAX DRAG COMPONENTS
  // ETF structure assumptions and CRA withholding tax treaties
  // ─────────────────────────────────────────────────────────────────────────
  ETF_TURNOVER: 0.10,                   // 10% passive ETF turnover
  CAN_DIVIDEND_YIELD: 0.030,            // 3.0% Canadian equity dividend yield
  US_DIVIDEND_YIELD: 0.015,             // 1.5% US equity dividend yield
  INTL_EM_DIVIDEND_YIELD: 0.020,        // 2.0% international/EM equity dividend yield
  ELIG_DIVIDEND_TAX_DISCOUNT: 0.70,     // eligible dividend taxed at 70% of marginal rate
  WHT_RATE_FOREIGN: 0.15,              // 15% withholding tax on foreign dividends

  // ─────────────────────────────────────────────────────────────────────────
  // S24: MORTALITY (CPM-2023)
  // CIA/ICA — CPM-2014 base + Scale MI-2017 projected to 2023 base year.
  // Exact values from planner_v2.html lines 4345-4458.
  // ─────────────────────────────────────────────────────────────────────────
  CPM_MALE: {
    30: 0.00034,
    35: 0.00038,
    40: 0.00052,
    45: 0.00076,
    50: 0.0013,
    51: 0.00144,
    52: 0.0016,
    53: 0.00178,
    54: 0.00199,
    55: 0.00222,
    56: 0.00257,
    57: 0.00297,
    58: 0.00342,
    59: 0.00392,
    60: 0.00394,
    61: 0.00448,
    62: 0.00507,
    63: 0.00575,
    64: 0.00649,
    65: 0.00631,
    66: 0.00713,
    67: 0.00807,
    68: 0.00916,
    69: 0.01044,
    70: 0.01187,
    71: 0.0135,
    72: 0.0154,
    73: 0.01763,
    74: 0.02022,
    75: 0.0232,
    76: 0.02666,
    77: 0.03065,
    78: 0.03527,
    79: 0.04064,
    80: 0.04687,
    81: 0.05413,
    82: 0.06254,
    83: 0.07258,
    84: 0.08346,
    85: 0.09701,
    86: 0.112,
    87: 0.1302,
    88: 0.1506,
    89: 0.1736,
    90: 0.2001,
    91: 0.2312,
    92: 0.2652,
    93: 0.3031,
    94: 0.3446,
    95: 0.39,
    96: 0.4375,
    97: 0.4849,
    98: 0.5325,
    99: 0.58,
    100: 0.6783,
  },
  CPM_FEMALE: {
    30: 0.00018,
    35: 0.00021,
    40: 0.0003,
    45: 0.00044,
    50: 0.0007,
    51: 0.00077,
    52: 0.00085,
    53: 0.00094,
    54: 0.00104,
    55: 0.00116,
    56: 0.00132,
    57: 0.00151,
    58: 0.00174,
    59: 0.00201,
    60: 0.00198,
    61: 0.0023,
    62: 0.00268,
    63: 0.0031,
    64: 0.00359,
    65: 0.00331,
    66: 0.00382,
    67: 0.00441,
    68: 0.0051,
    69: 0.0059,
    70: 0.00686,
    71: 0.00799,
    72: 0.00937,
    73: 0.01092,
    74: 0.01283,
    75: 0.01504,
    76: 0.01767,
    77: 0.02076,
    78: 0.02446,
    79: 0.02882,
    80: 0.03401,
    81: 0.04016,
    82: 0.04744,
    83: 0.05609,
    84: 0.06623,
    85: 0.0788,
    86: 0.09306,
    87: 0.1098,
    88: 0.1295,
    89: 0.1527,
    90: 0.1796,
    91: 0.2106,
    92: 0.2459,
    93: 0.2852,
    94: 0.3281,
    95: 0.373,
    96: 0.4147,
    97: 0.4565,
    98: 0.4982,
    99: 0.54,
    100: 0.5967,
  },
  CPM_BASE_YEAR: 2023,
  CPM_IMPROVEMENT_RATE: 0.99,           // 1% annual improvement (qx *= 0.99^years)
  CPM_MAX_AGE: 105,
  CPM_FALLBACK_QX: 0.001,               // fallback qx when age not in table

  // ─────────────────────────────────────────────────────────────────────────
  // S25: CORRELATION MATRICES
  // DMS/MSCI 2024. Exact values from planner_v2.html lines 4278, 4293, 4297-4318.
  // ─────────────────────────────────────────────────────────────────────────

  // CRM 5x5: [equity, bond, inflation, privateEquity, preciousMetals]
  CRM: [
    [1, 0.2, -0.2, 0.65, 0.05],
    [0.2, 1, -0.4, 0.1, 0.15],
    [-0.2, -0.4, 1, -0.1, 0.25],
    [0.65, 0.1, -0.1, 1, 0.1],
    [0.05, 0.15, 0.25, 0.1, 1],
  ] as const,

  // CRM_CRISIS 5x5: crisis variant — eq-bond negative (flight to quality)
  CRM_CRISIS: [
    [1, -0.3, 0.1, 0.85, 0.15],
    [-0.3, 1, -0.1, -0.2, 0.1],
    [0.1, -0.1, 1, 0.05, 0.3],
    [0.85, -0.2, 0.05, 1, 0.2],
    [0.15, 0.1, 0.3, 0.2, 1],
  ] as const,

  // CRM8 8x8: [canEq, usEq, intlEq, emEq, bondCan, inflation, privateEquity, preciousMetals]
  CRM8: [
    [ 1.00, 0.75, 0.70, 0.60,-0.10,-0.20, 0.65, 0.05],
    [ 0.75, 1.00, 0.80, 0.65,-0.15,-0.15, 0.70, 0.05],
    [ 0.70, 0.80, 1.00, 0.75,-0.10,-0.10, 0.55, 0.10],
    [ 0.60, 0.65, 0.75, 1.00,-0.05,-0.05, 0.50, 0.15],
    [-0.10,-0.15,-0.10,-0.05, 1.00,-0.40, 0.10, 0.15],
    [-0.20,-0.15,-0.10,-0.05,-0.40, 1.00,-0.10, 0.25],
    [ 0.65, 0.70, 0.55, 0.50, 0.10,-0.10, 1.00, 0.10],
    [ 0.05, 0.05, 0.10, 0.15, 0.15, 0.25, 0.10, 1.00],
  ] as const,

  // CRM8_CRISIS 8x8: crisis variant — higher equity correlations, deeper negative eq-bond
  CRM8_CRISIS: [
    [ 1.00, 0.90, 0.85, 0.80,-0.25,-0.10, 0.85, 0.15],
    [ 0.90, 1.00, 0.92, 0.85,-0.30,-0.10, 0.88, 0.10],
    [ 0.85, 0.92, 1.00, 0.90,-0.25,-0.05, 0.75, 0.15],
    [ 0.80, 0.85, 0.90, 1.00,-0.20,-0.05, 0.70, 0.20],
    [-0.25,-0.30,-0.25,-0.20, 1.00,-0.40, 0.05, 0.20],
    [-0.10,-0.10,-0.05,-0.05,-0.40, 1.00,-0.10, 0.30],
    [ 0.85, 0.88, 0.75, 0.70, 0.05,-0.10, 1.00, 0.15],
    [ 0.15, 0.10, 0.15, 0.20, 0.20, 0.30, 0.15, 1.00],
  ] as const,

  // ─────────────────────────────────────────────────────────────────────────
  // S26: STRESS SCENARIOS
  // Historical calibration. Each scenario has eq, bd, inf arrays (year-by-year
  // shocks) and an optional extra object for non-market shocks.
  // ─────────────────────────────────────────────────────────────────────────
  STRESS_SCENARIOS: {
    crash08: {
      eq: [-0.37, -0.22, 0.15, 0.02],
      bd: [0.05, 0.08, 0.02, -0.01],
      inf: [0.038, 0.002, 0.018, 0.012],
    },
    dotcom: {
      eq: [-0.10, -0.13, -0.23, 0.26, 0.09],
      bd: [0.06, 0.04, 0.05, 0.02, 0.03],
      inf: [0.034, 0.028, 0.016, 0.023, 0.027],
    },
    inflation70: {
      eq: [-0.08, -0.15, -0.26, 0.12, -0.07, 0.02, 0.06, -0.05, 0.12, 0.04],
      bd: [-0.05, -0.08, -0.12, -0.03, -0.06, 0.01, 0.02, -0.04, 0.03, 0.05],
      inf: [0.061, 0.074, 0.091, 0.112, 0.135, 0.113, 0.103, 0.089, 0.059, 0.038],
    },
    stagflation: {
      eq: [-0.14, -0.08, -0.12, 0.02, -0.05],
      bd: [-0.02, -0.05, -0.03, 0.01, -0.01],
      inf: [0.055, 0.065, 0.072, 0.058, 0.045],
    },
    japan: {
      eq: [0.01, -0.02, 0.01, -0.03, 0.02, -0.01, 0, -0.02, 0.01, -0.01],
      bd: [0.02, 0.02, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01],
      inf: [0.003, 0.001, 0, -0.002, 0.001, 0, -0.001, 0.002, 0.001, 0],
    },
    covid: {
      eq: [-0.34, 0.18, 0.27, 0.01],
      bd: [0.07, 0.01, -0.02, 0.02],
      inf: [0.012, 0.047, 0.065, 0.034],
    },
    longevity: {
      eq: [],
      bd: [],
      inf: [],
      extra: { deathAge: 5 },          // +5 years to death age
    },
    ratehike: {
      eq: [-0.12, -0.08, -0.05, 0.03, 0.06],
      bd: [-0.10, -0.08, -0.04, 0.01, 0.03],
      inf: [0.04, 0.045, 0.038, 0.032, 0.025],
    },
    prolonged: {
      eq: [-0.15, -0.10, -0.08, -0.05, -0.03, 0.02, 0.05, 0.08],
      bd: [0.03, 0.04, 0.03, 0.02, 0.02, 0.01, 0.01, 0.01],
      inf: [0.015, 0.01, 0.005, 0.005, 0.008, 0.012, 0.015, 0.02],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // S27: MARKET STRUCTURE
  // Engine inline constants for crisis detection, fat tails, stochastic
  // inflation, real estate correlation, and stress betas.
  // ─────────────────────────────────────────────────────────────────────────
  CRISIS_THRESHOLD: -0.15,              // equity return below this triggers crisis regime
  FAT_TAIL_DF: 5,                       // t-Student degrees of freedom for fat tails
  NORMAL_DF: 999,                       // effectively Gaussian (df > 30)
  INTL_STRESS_BETA: 0.9,               // international equity stress beta to sEq
  EM_STRESS_BETA: 0.8,                  // emerging market stress beta to sEq
  PE_STRESS_BETA: 0.8,                  // private equity stress beta
  PM_STRESS_BETA: 0.8,                  // precious metals stress beta
  DC_STRESS_BETA: 0.5,                  // digital currency stress beta
  STOCH_INF_VOL: 0.015,                // stochastic inflation vol = 1.5%
  INF_FLOOR: 0.005,                     // min inflation clamp (0.5%)
  INF_CAP: 0.08,                        // max inflation clamp (8%)
  RE_EQUITY_RHO: 0.35,                 // equity-RE correlation (normal)
  RE_CRISIS_RHO: 0.6,                  // equity-RE correlation (crisis)
  RE_DECLINE_FLOOR: -0.20,             // max RE decline in a single period

  // ─────────────────────────────────────────────────────────────────────────
  // S28: INSURANCE PREMIUM RATES
  // Simplified Canadian term life rates per $1,000 coverage by age/sex.
  // ─────────────────────────────────────────────────────────────────────────
  INSURANCE_PREMIUM_FEMALE: {
    under35: 0.50,
    age35_44: 0.70,
    age45_54: 1.20,
    age55_64: 2.50,
    age65plus: 5.00,
  },
  INSURANCE_PREMIUM_MALE: {
    under35: 0.65,
    age35_44: 0.90,
    age45_54: 1.60,
    age55_64: 3.50,
    age65plus: 7.00,
  },
  SURVIVOR_INCOME_FACTOR: 0.70,         // survivor needs 70% of retirement spending
  CHILD_COVERAGE: 250000,               // per dependent child
  FINAL_EXPENSES: 15000,                // funeral + administrative

  // ─────────────────────────────────────────────────────────────────────────
  // S29: SENSITIVITY RANGES
  // Tornado/sensitivity analysis parameter ranges for MC quick-run.
  // delta = +/- variation. floor/cap = absolute bounds.
  // ─────────────────────────────────────────────────────────────────────────
  SENSITIVITY: {
    SPENDING:   { delta: 0.20 },                           // retSpM * 0.8 .. retSpM * 1.2
    ALLOC_RRSP: { delta: 0.20 },                           // allocR +/- 0.20
    ALLOC_TFSA: { delta: 0.20 },                           // allocT +/- 0.20
    INFLATION:  { delta: 0.01 },                           // inf +/- 0.01
    RET_AGE:    { delta: 3, floor: 55 },                   // retAge +/- 3, min 55
    EQ_RETURN:  { delta: 0.03 },                           // eqRet +/- 0.03
    EQ_VOL:     { delta: 0.05 },                           // eqVol +/- 0.05
    QPP_AGE:    { delta: 3, floor: 60, cap: 72 },          // qppAge +/- 3, clamped 60-72
    OAS_AGE:    { delta: 2, floor: 65, cap: 72 },          // oasAge +/- 2, clamped 65-72
    DB_PENSION: { delta: 0.20 },                           // penM * 0.8 .. penM * 1.2
  },

  // ─────────────────────────────────────────────────────────────────────────
  // S30: MC PARAMETER CLAMPS
  // Engine-level safety net: clamp to physically possible ranges.
  // ─────────────────────────────────────────────────────────────────────────
  CLAMPS: {
    MER:            { min: 0,     max: 0.05 },   // 0-5%
    NR_TAX_DRAG:    { min: 0,     max: 0.03 },   // 0-3%
    INFLATION:      { min: 0,     max: 0.10 },   // 0-10%
    EQ_RET:         { min: -0.05, max: 0.20 },   // -5% to 20%
    EQ_VOL:         { min: 0.01,  max: 0.50 },   // 1-50%
    BND_RET:        { min: -0.02, max: 0.12 },   // -2% to 12%
    BND_VOL:        { min: 0.01,  max: 0.25 },   // 1-25%
    SPENDING_PHASE: { min: 0,     max: 1.5 },    // 0-150%
    HEALTH_MUL:     { min: 0,     max: 0.10 },   // 0-10%
  },
};

export default ENGINE_CONSTANTS_2026;
