// report/report-constants-2026.js
// ══════════════════════════════════════════════════════════════════════
// BuildFi Fiscal Constants — Browser/Node-eval shim (NO modules)
// ══════════════════════════════════════════════════════════════════════
// AUTO-GENERATED MIRROR of lib/constants/engine-shim.js. Drop any inline
// `var OAS_CLAWBACK_THR = 95323` that previously lived in report-engine.js
// — read from this shim instead. Loaded BEFORE report-engine.js by:
//   * planner.html / planner-expert.html (browser)
//   * report/realai/run-pipeline.mjs (Node, evaluated as script)
//   * report/realai/build-realai-reports.js (same)
//
// Update procedure: edit lib/constants/engine-shim.js (canonical) AND
// this file together. A pre-commit grep guard fails on hardcoded fiscal
// literals appearing outside the two shim files.
//
// Drifts caught at adoption (now fixed):
//   * GIS_MAX_COUPLE 667.41 → 665.41 ($2 off canon)
//   * QC.b[1] 108680 → 108730 ($50 off canon)
// ══════════════════════════════════════════════════════════════════════

(function(global) {
  var C = {
    TAX_BASE_YEAR: 2026,

    FED_BRACKETS: [58523, 117045, 181440, 258482],
    FED_RATES: [0.14, 0.205, 0.26, 0.29, 0.33],
    FED_PERSONAL: 16452,
    FED_AGE_AMT: 8790,
    FED_AGE_THRESH: 44325,
    FED_CREDIT_RATE: 0.15,
    FED_AGE_CLAWBACK_RATE: 0.15,
    PENSION_CREDIT_MAX: 2000,

    ELIG_GROSSUP: 1.38,
    NON_ELIG_GROSSUP: 1.15,
    FED_ELIG_DTC: 0.150198,
    FED_NON_ELIG_DTC: 0.090301,

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
      NU: { b: [54333, 108668, 177231], r: [0.04, 0.07, 0.09, 0.115], pd: 18284, abate: 1, eligDivCr: 0.0551, nonEligDivCr: 0.025904, ageAmt: 14865, ageThresh: 0, penAmt: 2000 }
    },

    ON_SURTAX_THR1: 4991,
    ON_SURTAX_RATE1: 0.20,
    ON_SURTAX_THR2: 6387,
    ON_SURTAX_RATE2: 0.36,

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
      NU: { small: 0.12, general: 0.27, passive: 0.5067 }
    },
    SBD_LIMIT: 500000,
    PASSIVE_GRIND_THRESHOLD: 50000,
    PASSIVE_GRIND_FACTOR: 5,
    RDTOH_RATE: 0.3067,
    RDTOH_REFUND_RATE: 0.3833,
    LCGE: 1250000,

    OAS_CLAWBACK_THR: 95323,
    OAS_MAX_MONTHLY: 742.31,
    OAS_DEFERRAL_BONUS_PER_MONTH: 0.006,
    OAS_MAX_DEFERRAL_FACTOR: 1.36,
    OAS_75_PLUS_BONUS: 1.10,
    OAS_CLAWBACK_RATE: 0.15,

    QPP_MAX_MONTHLY: 1507.65,
    QPP_MGA: 74600,
    QPP_YAMPE: 85000,
    QPP2_MAX_MONTHLY: 81.00,
    QPP_MAX_CONTRIB_YEARS: 40,
    QPP_EARLY_REDUCTION_PER_MONTH: 0.006,
    QPP_LATE_BONUS_PER_MONTH: 0.007,
    QPP_ADJ_FLOOR: 0.64,
    QPP_ADJ_CAP: 1.42,
    QPP_SURVIVOR_CAP_MONTHLY: 784,
    QPP_SURVIVOR_FRACTION: 0.60,

    GIS_MAX_SINGLE: 1105.43,
    GIS_MAX_COUPLE: 665.41,
    GIS_EMPLOYMENT_FULL_EXEMPT: 5000,
    GIS_EMPLOYMENT_PARTIAL_CEILING: 15000,
    GIS_PARTIAL_EXEMPT_RATE: 0.50,
    GIS_REDUCTION_RATE: 0.50,

    TFSA_LIMIT_2026: 7000
  };

  // Expose under the namespace so report-engine.js can read explicitly.
  global.BFConstants = C;

  // Also publish each name as a top-level global for backward-compat
  // with report-engine.js / report-data.js / report-pdf.js code that
  // already references e.g. `OAS_CLAWBACK_THR` directly. As we migrate
  // those files to read from `BFConstants.X`, the bare globals can be
  // removed.
  for (var k in C) if (Object.prototype.hasOwnProperty.call(C, k)) global[k] = C[k];
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
