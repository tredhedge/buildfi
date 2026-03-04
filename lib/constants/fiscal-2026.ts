// lib/constants/fiscal-2026.ts
// ══════════════════════════════════════════════════════════════════════
// BuildFi Fiscal Constants — 2026
// ══════════════════════════════════════════════════════════════════════
// REFERENCE COPY of the values hardcoded in lib/engine/index.js (lines 16-56).
// The engine still uses its own inline values — this file exists for the
// annual-update pipeline, validation tooling, and future migration.
//
// Sources: CRA T1 General, Retraite Quebec, Service Canada, provincial tax acts
// Last verified: 2026-02-27
// ══════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface FederalConstants {
  TAX_BASE_YEAR: number;
  FED_BRACKETS: number[];
  FED_RATES: number[];
  FED_PERSONAL: number;
  OAS_CLAWBACK_THR: number;
  OAS_MAX_MONTHLY: number;
  GIS_MAX_SINGLE: number;
  GIS_MAX_COUPLE: number;
  QPP_MAX_MONTHLY: number;
  QPP_MGA: number;
  QPP_YAMPE: number;
  QPP2_MAX_MONTHLY: number;
  PENSION_CREDIT_MAX: number;
  TFSA_LIMIT: number;
}

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

export type ProvinceCode =
  | "QC" | "ON" | "BC" | "AB" | "SK" | "MB"
  | "NB" | "NS" | "PE" | "NL" | "NT" | "YT" | "NU";

export interface FiscalConstants {
  federal: FederalConstants;
  provincial: Record<ProvinceCode, ProvincialTax>;
  metadata: FiscalMetadata;
}

export interface FiscalMetadata {
  year: number;
  verifiedDate: string;
  sources: string[];
}

// ---------------------------------------------------------------------------
// 2026 Federal Constants (copied from lib/engine/index.js lines 16-29)
// ---------------------------------------------------------------------------

const federal: FederalConstants = {
  TAX_BASE_YEAR: 2026,
  FED_BRACKETS: [58523, 117045, 181440, 258482],
  FED_RATES: [0.14, 0.205, 0.26, 0.29, 0.33],
  FED_PERSONAL: 16452,
  OAS_CLAWBACK_THR: 95323,
  OAS_MAX_MONTHLY: 742.31,
  GIS_MAX_SINGLE: 1105.43,
  GIS_MAX_COUPLE: 667.41,
  QPP_MAX_MONTHLY: 1507.65,
  QPP_MGA: 74600,
  QPP_YAMPE: 85000,
  QPP2_MAX_MONTHLY: 81.00,
  PENSION_CREDIT_MAX: 2000,
  TFSA_LIMIT: 7000,
};

// ---------------------------------------------------------------------------
// 2026 Provincial Constants (copied from lib/engine/index.js lines 40-56)
// ---------------------------------------------------------------------------

const provincial: Record<ProvinceCode, ProvincialTax> = {
  QC: { b: [54345, 108680, 132245], r: [0.14, 0.19, 0.24, 0.2575], pd: 18952, abate: 0.835, eligDivCr: 0.1118, nonEligDivCr: 0.039362, ageAmt: 3903, ageThresh: 0, penAmt: 2918 },
  ON: { b: [53891, 107785, 150000, 220000], r: [0.0505, 0.0915, 0.1116, 0.1216, 0.1316], pd: 12091, abate: 1, eligDivCr: 0.10, nonEligDivCr: 0.029863, ageAmt: 5286, ageThresh: 42335, penAmt: 1580 },
  BC: { b: [49159, 98320, 112883, 137073, 185854, 259197], r: [0.0506, 0.077, 0.105, 0.1229, 0.147, 0.168, 0.205], pd: 12901, abate: 1, eligDivCr: 0.12, nonEligDivCr: 0.0196, ageAmt: 5766, ageThresh: 42660, penAmt: 1000 },
  AB: { b: [154259, 185203, 246938, 370220], r: [0.1, 0.12, 0.13, 0.14, 0.15], pd: 22769, abate: 1, eligDivCr: 0.0812, nonEligDivCr: 0.0218, ageAmt: 5553, ageThresh: 43906, penAmt: 1491 },
  SK: { b: [54532, 155805], r: [0.105, 0.125, 0.145], pd: 20381, abate: 1, eligDivCr: 0.11, nonEligDivCr: 0.02105, ageAmt: 5518, ageThresh: 0, penAmt: 1000 },
  MB: { b: [47000, 100000], r: [0.108, 0.1275, 0.174], pd: 15780, abate: 1, eligDivCr: 0.08, nonEligDivCr: 0.007835, ageAmt: 3728, ageThresh: 0, penAmt: 1000 },
  NB: { b: [51306, 102614, 190081], r: [0.094, 0.14, 0.16, 0.195], pd: 13396, abate: 1, eligDivCr: 0.14, nonEligDivCr: 0.027518, ageAmt: 5849, ageThresh: 42553, penAmt: 1000 },
  NS: { b: [30182, 60364, 94860, 153000], r: [0.0879, 0.1495, 0.1667, 0.175, 0.21], pd: 8651, abate: 1, eligDivCr: 0.0885, nonEligDivCr: 0.021568, ageAmt: 4897, ageThresh: 0, penAmt: 1000 },
  PE: { b: [33538, 67079], r: [0.098, 0.138, 0.167], pd: 13865, abate: 1, eligDivCr: 0.105, nonEligDivCr: 0.027, ageAmt: 4862, ageThresh: 0, penAmt: 1000 },
  NL: { b: [44062, 88123, 157329, 220262, 281387, 562714], r: [0.087, 0.145, 0.158, 0.178, 0.198, 0.208, 0.213], pd: 11034, abate: 1, eligDivCr: 0.063, nonEligDivCr: 0.021739, ageAmt: 7742, ageThresh: 39880, penAmt: 1000 },
  NT: { b: [51963, 103931, 169067], r: [0.059, 0.086, 0.122, 0.1405], pd: 17041, abate: 1, eligDivCr: 0.115, nonEligDivCr: 0.02302, ageAmt: 8200, ageThresh: 0, penAmt: 1000 },
  YT: { b: [58523, 117045, 181440, 258482, 500000], r: [0.064, 0.09, 0.109, 0.128, 0.15, 0.16], pd: 16452, abate: 1, eligDivCr: 0.12689, nonEligDivCr: 0.0135, ageAmt: 8790, ageThresh: 44325, penAmt: 2000 },
  NU: { b: [54333, 108668, 177231], r: [0.04, 0.07, 0.09, 0.115], pd: 18284, abate: 1, eligDivCr: 0.0551, nonEligDivCr: 0.025904, ageAmt: 14865, ageThresh: 0, penAmt: 2000 },
};

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

const metadata: FiscalMetadata = {
  year: 2026,
  verifiedDate: "2026-02-27",
  sources: [
    "CRA T1 General 2026 — federal brackets, rates, personal amount",
    "Service Canada — OAS recovery threshold, OAS max monthly, GIS max (2026 Q1)",
    "Retraite Quebec / Service Canada — QPP/CPP max monthly, YMPE, YAMPE, CPP2 enhancement",
    "CRA — TFSA annual limit, pension income credit",
    "Provincial tax acts (QC, ON, BC, AB, SK, MB, NB, NS, PE, NL, NT, YT, NU)",
    "RCGT / EY 2025-2026 tables — provincial dividend tax credit rates",
  ],
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const FISCAL_2026: FiscalConstants = {
  federal,
  provincial,
  metadata,
};
