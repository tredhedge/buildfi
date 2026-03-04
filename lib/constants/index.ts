// lib/constants/index.ts
// ══════════════════════════════════════════════════════════════════════
// BuildFi Fiscal Constants — Barrel Export
// ══════════════════════════════════════════════════════════════════════
// Entry point for the constants pipeline. Import the latest versioned
// file and expose a getter that can be extended to support multiple years.
//
// Usage:
//   import { getCurrentConstants } from "@/lib/constants";
//   const c = getCurrentConstants();        // defaults to latest (2026)
//   const c = getCurrentConstants(2026);    // explicit year
// ══════════════════════════════════════════════════════════════════════

import { FISCAL_2026 } from "./fiscal-2026";
import type {
  FiscalConstants,
  FiscalMetadata,
  FederalConstants,
  ProvincialTax,
  ProvinceCode,
} from "./fiscal-2026";

// ---------------------------------------------------------------------------
// Registry — add new years here as they are created
// ---------------------------------------------------------------------------

const CONSTANTS_BY_YEAR: Record<number, FiscalConstants> = {
  2026: FISCAL_2026,
};

const LATEST_YEAR = 2026;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the fiscal constants for a given tax year.
 * Defaults to the latest available year.
 *
 * @throws {Error} if the requested year is not available
 */
export function getCurrentConstants(year?: number): FiscalConstants {
  const targetYear = year ?? LATEST_YEAR;
  const constants = CONSTANTS_BY_YEAR[targetYear];
  if (!constants) {
    const available = Object.keys(CONSTANTS_BY_YEAR).join(", ");
    throw new Error(
      `Fiscal constants for year ${targetYear} not found. Available: ${available}`
    );
  }
  return constants;
}

/**
 * Returns all available fiscal years in ascending order.
 */
export function getAvailableYears(): number[] {
  return Object.keys(CONSTANTS_BY_YEAR)
    .map(Number)
    .sort((a, b) => a - b);
}

/**
 * Returns the latest available fiscal year number.
 */
export function getLatestYear(): number {
  return LATEST_YEAR;
}

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export { FISCAL_2026 };
export type {
  FiscalConstants,
  FiscalMetadata,
  FederalConstants,
  ProvincialTax,
  ProvinceCode,
};
