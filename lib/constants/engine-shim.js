// /lib/constants/engine-shim.js
// ══════════════════════════════════════════════════════════════════════
// BuildFi Fiscal Constants — Engine Shim (ESM)
// ══════════════════════════════════════════════════════════════════════
// SINGLE SOURCE OF TRUTH for all 2026 fiscal/benefit thresholds used by
// the Monte Carlo engine and the report renderer. Mirrors the structured
// canon in lib/constants/engine-constants-2026.ts but exported as plain
// ESM so .js engine code can import without TypeScript tooling.
//
// IMPORTANT
//   * Do NOT add inline `var X = 95323` declarations elsewhere. Every
//     fiscal threshold MUST come from this file (or the parallel browser
//     shim at planner/report/report-constants-2026.js).
//   * To update for a new tax year, EDIT THIS FILE and the TS canon, run
//     the regression test suite, then ship.
//   * Drifts caught at adoption time:
//       - GIS_MAX_COUPLE was 667.41 in engine vs 665.41 canonical → fixed.
//       - QC.b[1] was 108680 in engine vs 108730 canonical → fixed.
//
// Source: Service Canada (OAS/CPP/GIS), CRA (federal tax), Revenu
//   Quebec (QC tax), provincial tax acts (other provinces). Last
//   verified 2026-04-30 against lib/constants/engine-constants-2026.ts.
//   OAS values reflect Service Canada Q2 2026 (April–June) publication.
// ══════════════════════════════════════════════════════════════════════

export const TAX_BASE_YEAR = 2026;

// ─── Federal tax (Bill C-69, 2026) ─────────────────────────────────────
export const FED_BRACKETS = [58523, 117045, 181440, 258482];
export const FED_RATES = [0.14, 0.205, 0.26, 0.29, 0.33];
export const FED_PERSONAL = 16452;
export const FED_AGE_AMT = 9209;     // 2026 (was 8790 = 2024) — audit 2.13
export const FED_AGE_THRESH = 46433; // 2026 (was 44325 = 2024) — audit 2.13
export const FED_CREDIT_RATE = 0.15;
export const FED_AGE_CLAWBACK_RATE = 0.15;
export const PENSION_CREDIT_MAX = 2000;

// ─── Dividend integration ──────────────────────────────────────────────
export const ELIG_GROSSUP = 1.38;
export const NON_ELIG_GROSSUP = 1.15;
export const FED_ELIG_DTC = 0.150198;
export const FED_NON_ELIG_DTC = 0.090301;

// ─── Provincial tax (13 jurisdictions) ─────────────────────────────────
// Schema: { b: brackets[], r: rates[], pd: personal deduction,
//   abate: QC abatement (1 elsewhere), eligDivCr / nonEligDivCr,
//   ageAmt, ageThresh, penAmt }
export const PROV_TAX = {
  QC: { b: [54345, 108730, 132245], r: [0.14, 0.19, 0.24, 0.2575], pd: 18952, abate: 0.835, eligDivCr: 0.1118, nonEligDivCr: 0.039362, ageAmt: 3903, ageThresh: 0, penAmt: 2918 },
  ON: { b: [53891, 107785, 150000, 220000], r: [0.0505, 0.0915, 0.1116, 0.1216, 0.1316], pd: 12091, abate: 1, eligDivCr: 0.10, nonEligDivCr: 0.029863, ageAmt: 5286, ageThresh: 42335, penAmt: 1580 },
  BC: { b: [49159, 98320, 112883, 137073, 185854, 259197], r: [0.0506, 0.077, 0.105, 0.1229, 0.147, 0.168, 0.205], pd: 12901, abate: 1, eligDivCr: 0.12, nonEligDivCr: 0.0196, ageAmt: 5766, ageThresh: 42660, penAmt: 1000 },
  // AB: 8% bracket on first ~$60k added 2025 (audit 2.1). credR:0.10 — Alberta
  // computes non-refundable credits (incl. BPA) at 10%, not the 8% lowest rate.
  AB: { b: [60000, 154259, 185203, 246938, 370220], r: [0.08, 0.1, 0.12, 0.13, 0.14, 0.15], credR: 0.10, pd: 22769, abate: 1, eligDivCr: 0.0812, nonEligDivCr: 0.0218, ageAmt: 5553, ageThresh: 43906, penAmt: 1491 },
  SK: { b: [54532, 155805], r: [0.105, 0.125, 0.145], pd: 20381, abate: 1, eligDivCr: 0.11, nonEligDivCr: 0.02105, ageAmt: 5518, ageThresh: 0, penAmt: 1000 },
  MB: { b: [47000, 100000], r: [0.108, 0.1275, 0.174], pd: 15780, abate: 1, eligDivCr: 0.08, nonEligDivCr: 0.007835, ageAmt: 3728, ageThresh: 0, penAmt: 1000 },
  NB: { b: [51306, 102614, 190081], r: [0.094, 0.14, 0.16, 0.195], pd: 13396, abate: 1, eligDivCr: 0.14, nonEligDivCr: 0.027518, ageAmt: 5849, ageThresh: 42553, penAmt: 1000 },
  NS: { b: [30182, 60364, 94860, 153000], r: [0.0879, 0.1495, 0.1667, 0.175, 0.21], pd: 11744, abate: 1, eligDivCr: 0.0885, nonEligDivCr: 0.015, ageAmt: 4897, ageThresh: 0, penAmt: 1000 },
  PE: { b: [33538, 67079], r: [0.098, 0.138, 0.167], pd: 13865, abate: 1, eligDivCr: 0.105, nonEligDivCr: 0.013, ageAmt: 4862, ageThresh: 0, penAmt: 1000 },
  NL: { b: [44062, 88123, 157329, 220262, 281387, 562714], r: [0.087, 0.145, 0.158, 0.178, 0.198, 0.208, 0.213], pd: 11034, abate: 1, eligDivCr: 0.063, nonEligDivCr: 0.032, ageAmt: 7742, ageThresh: 39880, penAmt: 1000 },
  NT: { b: [51963, 103931, 169067], r: [0.059, 0.086, 0.122, 0.1405], pd: 17041, abate: 1, eligDivCr: 0.115, nonEligDivCr: 0.06, ageAmt: 8200, ageThresh: 0, penAmt: 1000 },
  YT: { b: [58523, 117045, 181440, 258482, 500000], r: [0.064, 0.09, 0.109, 0.128, 0.15, 0.16], pd: 16452, abate: 1, eligDivCr: 0.1202, nonEligDivCr: 0.0067, ageAmt: 9209, ageThresh: 46433, penAmt: 2000 }, // 2026: YT age amount mirrors federal (9209/46433); was stale 2024 (8790/44325) — synced to planner_v3 C 2026-06-18
  NU: { b: [54333, 108668, 177231], r: [0.04, 0.07, 0.09, 0.115], pd: 18284, abate: 1, eligDivCr: 0.0551, nonEligDivCr: 0.025904, ageAmt: 14865, ageThresh: 0, penAmt: 2000 }
};

// ─── Ontario surtax ─────────────────────────────────────────────────────
export const ON_SURTAX_THR1 = 5818;  // 2026 ON428 (was 4991 = 2024) — audit 2.13/3.1
export const ON_SURTAX_RATE1 = 0.20;
export const ON_SURTAX_THR2 = 7446;  // 2026 ON428 (was 6387 = 2024) — audit 2.13/3.1
export const ON_SURTAX_RATE2 = 0.36;

// ─── CCPC corporate tax ────────────────────────────────────────────────
export const CORP_RATES = {
  QC: { small: 0.122, general: 0.265, passive: 0.5017 },
  ON: { small: 0.122, general: 0.265, passive: 0.5017, grindRate: 0.182 }, // audit D
  BC: { small: 0.11, general: 0.27, passive: 0.5067 },
  AB: { small: 0.11, general: 0.23, passive: 0.4667 },
  SK: { small: 0.11, general: 0.27, passive: 0.5067 },
  MB: { small: 0.09, general: 0.27, passive: 0.5067 }, // audit D: MB prov small 0% -> 9%
  NB: { small: 0.115, general: 0.29, passive: 0.5267, grindRate: 0.175 }, // audit D
  NS: { small: 0.105, general: 0.29, passive: 0.5267 }, // audit D: 10.5% since Apr-2025
  PE: { small: 0.10, general: 0.31, passive: 0.5467 },
  NL: { small: 0.12, general: 0.30, passive: 0.5367 },
  NT: { small: 0.11, general: 0.265, passive: 0.5017 },
  YT: { small: 0.11, general: 0.27, passive: 0.5067 },
  NU: { small: 0.12, general: 0.27, passive: 0.5067 }
};
export const SBD_LIMIT = 500000;
export const PASSIVE_GRIND_THRESHOLD = 50000;
export const PASSIVE_GRIND_FACTOR = 5;
export const RDTOH_RATE = 0.3067;
export const RDTOH_REFUND_RATE = 0.3833;
export const LCGE = 1250000;

// ─── OAS (Service Canada 2026, Q2 April–June) ──────────────────────────
export const OAS_CLAWBACK_THR = 95323;
export const OAS_MAX_MONTHLY = 742.31; // 2026 (audit 2.13)
export const OAS_DEFERRAL_BONUS_PER_MONTH = 0.006;
export const OAS_MAX_DEFERRAL_FACTOR = 1.36;
export const OAS_75_PLUS_BONUS = 1.10;
export const OAS_CLAWBACK_RATE = 0.15;

// ─── QPP/CPP ───────────────────────────────────────────────────────────
export const QPP_MAX_MONTHLY = 1507.65;
export const QPP_MGA = 74600;
export const QPP_YAMPE = 85000;
export const QPP2_MAX_MONTHLY = 81.00;
export const QPP_MAX_CONTRIB_YEARS = 40;
export const QPP_EARLY_REDUCTION_PER_MONTH = 0.006;
export const QPP_LATE_BONUS_PER_MONTH = 0.007;
export const QPP_ADJ_FLOOR = 0.64;
// Province-aware deferral caps (2026-06-18): QC/QPP allows start to 72 (since Jan
// 2024) -> 1.588 (0.7%/mo × 84mo); rest-of-Canada/CPP caps at 70 -> 1.42 (× 60mo).
// calcQPP selects by province (default QC). — supersedes audit 2.3 single-cap.
export const QPP_ADJ_CAP = 1.588; // QC
export const CPP_ADJ_CAP = 1.42;  // rest of Canada
export const QPP_SURVIVOR_CAP_MONTHLY = 784;
export const QPP_SURVIVOR_FRACTION = 0.60;

// ─── GIS ───────────────────────────────────────────────────────────────
export const GIS_MAX_SINGLE = 1108.74; // 2026 (audit 2.13)
export const GIS_MAX_COUPLE = 665.41;
export const GIS_EMPLOYMENT_FULL_EXEMPT = 5000;
export const GIS_EMPLOYMENT_PARTIAL_CEILING = 15000;
export const GIS_PARTIAL_EXEMPT_RATE = 0.50;
export const GIS_REDUCTION_RATE = 0.50;

// ─── Registered limits ─────────────────────────────────────────────────
export const TFSA_LIMIT_2026 = 7000;

// ─── Bundled object (alternative consumption pattern) ─────────────────
export const ENGINE_SHIM_2026 = Object.freeze({
  TAX_BASE_YEAR, FED_BRACKETS, FED_RATES, FED_PERSONAL, FED_AGE_AMT,
  FED_AGE_THRESH, FED_CREDIT_RATE, FED_AGE_CLAWBACK_RATE, PENSION_CREDIT_MAX,
  ELIG_GROSSUP, NON_ELIG_GROSSUP, FED_ELIG_DTC, FED_NON_ELIG_DTC,
  PROV_TAX, ON_SURTAX_THR1, ON_SURTAX_RATE1, ON_SURTAX_THR2, ON_SURTAX_RATE2,
  CORP_RATES, SBD_LIMIT, PASSIVE_GRIND_THRESHOLD, PASSIVE_GRIND_FACTOR,
  RDTOH_RATE, RDTOH_REFUND_RATE, LCGE,
  OAS_CLAWBACK_THR, OAS_MAX_MONTHLY, OAS_DEFERRAL_BONUS_PER_MONTH,
  OAS_MAX_DEFERRAL_FACTOR, OAS_75_PLUS_BONUS, OAS_CLAWBACK_RATE,
  QPP_MAX_MONTHLY, QPP_MGA, QPP_YAMPE, QPP2_MAX_MONTHLY,
  QPP_MAX_CONTRIB_YEARS, QPP_EARLY_REDUCTION_PER_MONTH, QPP_LATE_BONUS_PER_MONTH,
  QPP_ADJ_FLOOR, QPP_ADJ_CAP, CPP_ADJ_CAP, QPP_SURVIVOR_CAP_MONTHLY, QPP_SURVIVOR_FRACTION,
  GIS_MAX_SINGLE, GIS_MAX_COUPLE, GIS_EMPLOYMENT_FULL_EXEMPT,
  GIS_EMPLOYMENT_PARTIAL_CEILING, GIS_PARTIAL_EXEMPT_RATE, GIS_REDUCTION_RATE,
  TFSA_LIMIT_2026
});
