// lib/display-utils.ts — Normalized display formatting
// Single source of truth for all displayed values.
// Rule: report templates and AI DATA blocks consume these, NEVER raw mc.* values.

/** Success rate: always integer, never decimal */
export function displaySuccessPct(succ: number): number {
  return Math.round(succ * 100);
}

/** Dollar amounts: round contextually
 *  >= 1M → nearest 1,000
 *  >= 10K → nearest 100
 *  < 10K → nearest dollar
 */
export function displayDollars(n: number): number {
  if (Math.abs(n) >= 1_000_000) return Math.round(n / 1000) * 1000;
  if (Math.abs(n) >= 10_000) return Math.round(n / 100) * 100;
  return Math.round(n);
}

/** Withdrawal rate: 1 decimal */
export function displayWithdrawalPct(rate: number): number {
  return Math.round(rate * 10) / 10;
}

/** General percentage: integer */
export function displayPctInt(pct: number): number {
  return Math.round(pct);
}
