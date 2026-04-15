// lib/constants/engine-defaults.ts
// ══════════════════════════════════════════════════════════════════════
// BuildFi Engine Defaults — User-Adjustable Parameters
// ══════════════════════════════════════════════════════════════════════
// Default values for parameters the USER can change in the planner UI.
// These are product decisions (sensible starting points), NOT government-
// sourced constants. For government/regulatory values, see fiscal-2026.ts.
//
// Every value here is a suggestion shown in the UI — the user may override
// any of them. The engine reads user-set values at runtime; these defaults
// are only applied when the user has not specified a preference.
// ══════════════════════════════════════════════════════════════════════

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MultiAssetAllocation {
  can: number;
  us: number;
  intl: number;
  em: number;
  bnd: number;
}

export interface SmoothingConfig {
  melt: number;       // Max year-to-year meltdown change (fraction)
  meltFloor: number;  // Min absolute meltdown change ($)
  spend: number;      // Max year-to-year spending change
  spendFloor: number; // Min absolute spending change ($)
  back: number;       // Backward pass cap
  backFloor: number;  // Backward pass min ($)
  nrOver: number;     // Max NR withdrawal as multiple of spending need
  mcBlend: number;    // MC memory weight
}

export interface HistogramBins {
  min: number;
  max: number;
}

export interface EngineDefaults {
  // Section 1: Return & Volatility — 2-Asset Simple Mode
  eqRet: number;
  eqVol: number;
  bndRet: number;
  bndVol: number;

  // Section 2: Return & Volatility — 8-Asset Multi-Asset Mode
  canRet: number;
  canVol: number;
  usRet: number;
  usVol: number;
  intlRet: number;
  intlVol: number;
  emRet: number;
  emVol: number;
  peRet: number;
  peVol: number;
  pmRet: number;
  pmVol: number;
  dcRet: number;
  dcVol: number;
  fxVol: number;
  reVol: number;

  // Section 3: Asset Allocation
  allocR: number;
  allocT: number;
  allocN: number;
  multiAsset: MultiAssetAllocation;

  // Section 4: Fees
  merR: number;
  merT: number;
  merN: number;
  nrTaxDrag: number;
  penMER: number;
  peFee: number;

  // Section 5: Inflation
  inflation: number;

  // Section 6: Spending Smile (Blanchett)
  goP: number;
  slP: number;
  noP: number;
  mcSlP: number;
  mcNoP: number;
  smileSlAge: number;
  smileNoAge: number;

  // Section 7: Health Costs
  healthAge: number;
  healthMul: number;
  healthCostMax: number;

  // Section 8: Spending Composition
  spendingBase: number;
  spendingHousing: number;
  spendingHealth: number;

  // Section 9: Withdrawal Smoothing
  smooth: SmoothingConfig;

  // Section 10: Guyton-Klinger Guardrails
  gkCeil: number;
  gkFloor: number;
  gkCut: number;
  gkRaise: number;
  gkMaxCut: number;

  // Section 11: Glide Path
  glideSpeed: number;
  glideFloor: number;
  glideEqFloor: number;

  // Section 12: Real Estate
  mortgageRate: number;
  propAppreciation: number;
  helocRate: number;
  rentalInflation: number;
  reCostInflation: number;
  refiAmortYears: number;
  replacementRent: number;

  // Section 13: Pension
  dcWithdrawalRate: number;
  dcRrifConversionAge: number;
  partialIndexation: number;
  annuityRate: number;

  // Section 14: Mortality
  deathAge: number;
  spouseDeathAge: number;
  respGrowthRate: number;

  // Section 15: Corporate / Business
  bizSalaryPct: number;
  corpPassiveAlloc: number;
  corpExtractYears: number;
  bizSaleACB: number;

  // Section 16: Meltdown
  meltdownTarget: number;

  // Section 17: Stress Parameters
  salaryVolFloor: number;
  disabilityMonths: number;
  peLockYears: number;
  peLockHaircut: number;

  // Section 18: GIS-Aware Threshold
  gisIncomeThreshold: number;

  // Section 19: MC Operational
  fallbackMargRate: number;
  detMargRate: number;
  ruinThreshold: number;
  dustThreshold: number;
  wdSampleSims: number;
  shortfallInterval: number;
  sensSims: number;
  histogramBins: HistogramBins;
  deathRuinMaxAge: number;
  deathRuinBucket: number;
}

// ---------------------------------------------------------------------------
// Section 1: Return & Volatility Assumptions (2-Asset Simple Mode)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Section 2: Return & Volatility Assumptions (8-Asset Multi-Asset Mode)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Section 3: Asset Allocation
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Section 4: Fees
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Section 5: Inflation
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Section 6: Spending Smile (Blanchett)
// ---------------------------------------------------------------------------
// The optimizer and MC simulation use slightly different spending-smile
// multipliers. The optimizer uses goP/slP/noP for deterministic path
// planning. The MC simulation uses goP/mcSlP/mcNoP — mcSlP is lower
// (tighter belt in stochastic draws) while mcNoP is higher (accounts
// for health cost overlay that the MC engine applies separately).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Section 7: Health Costs
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Section 8: Spending Composition
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Section 9: Withdrawal Smoothing (CFG_SMOOTH)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Section 10: Guyton-Klinger Guardrails
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Section 11: Glide Path
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Section 12: Real Estate
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Section 13: Pension
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Section 14: Mortality
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Section 15: Corporate / Business
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Section 16: Meltdown
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Section 17: Stress Parameters
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Section 18: GIS-Aware Threshold
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Section 19: MC Operational
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Default Export
// ---------------------------------------------------------------------------

const ENGINE_DEFAULTS: EngineDefaults = {
  // ── Section 1: Return & Volatility — 2-Asset Simple Mode ──────────────
  eqRet: 0.07,         // Equity expected return
  eqVol: 0.16,         // Equity volatility
  bndRet: 0.035,       // Bond expected return
  bndVol: 0.06,        // Bond volatility

  // ── Section 2: Return & Volatility — 8-Asset Multi-Asset Mode ─────────
  canRet: 0.070,       // Canadian equity return
  canVol: 0.16,        // Canadian equity volatility
  usRet: 0.080,        // US equity return
  usVol: 0.17,         // US equity volatility
  intlRet: 0.070,      // International equity return
  intlVol: 0.18,       // International equity volatility
  emRet: 0.085,        // Emerging markets return
  emVol: 0.23,         // Emerging markets volatility
  peRet: 0.12,         // Private equity return
  peVol: 0.25,         // Private equity volatility
  pmRet: 0.03,         // Precious metals return
  pmVol: 0.15,         // Precious metals volatility
  dcRet: 0.05,         // DC pension plan return
  dcVol: 0.08,         // DC pension plan volatility
  fxVol: 0.08,         // Currency volatility
  reVol: 0.10,         // Real estate volatility

  // ── Section 3: Asset Allocation ───────────────────────────────────────
  allocR: 0.60,        // RRSP equity allocation
  allocT: 0.80,        // TFSA equity allocation
  allocN: 0.50,        // NR equity allocation
  multiAsset: { can: 0.25, us: 0.35, intl: 0.20, em: 0.05, bnd: 0.15 },

  // ── Section 4: Fees ───────────────────────────────────────────────────
  merR: 0.01,          // RRSP MER
  merT: 0.005,         // TFSA MER
  merN: 0.005,         // NR MER
  nrTaxDrag: 0.009,    // NR annual tax drag
  penMER: 0.01,        // DC plan MER
  peFee: 0.02,         // PE management fee

  // ── Section 5: Inflation ──────────────────────────────────────────────
  inflation: 0.021,    // 2.1% default

  // ── Section 6: Spending Smile (Blanchett) ─────────────────────────────
  /**
   * Optimizer defaults — used for deterministic path planning.
   * goP = 100% (full spending in active years),
   * slP = 85%, noP = 75%.
   */
  goP: 1.0,            // Go-Go phase multiplier (100%)
  slP: 0.85,           // Slow-Go phase multiplier (85%)
  noP: 0.75,           // No-Go phase multiplier (75%)
  /**
   * MC simulation defaults — differ from optimizer for distribution shaping.
   * mcSlP is lower (tighter belt under stochastic variance).
   * mcNoP is higher (the MC engine applies a separate health cost overlay,
   * so the base spending multiplier stays closer to 1.0).
   */
  mcSlP: 0.82,         // MC Slow-Go (slightly lower for distribution shape)
  mcNoP: 0.92,         // MC No-Go (higher — accounts for health cost overlay)
  smileSlAge: 75,      // Slow-Go start age (overridden by max(retAge+10, 75))
  smileNoAge: 85,      // No-Go start age (overridden by max(slAge+10, 85))

  // ── Section 7: Health Costs ───────────────────────────────────────────
  healthAge: 85,        // Age when health costs start escalating
  healthMul: 0.02,      // 2%/yr escalation rate
  healthCostMax: 2.0,   // Cap at 200%

  // ── Section 8: Spending Composition ───────────────────────────────────
  spendingBase: 0.70,       // 70% uses general inflation
  spendingHousing: 0.15,    // 15% uses housing inflation
  spendingHealth: 0.15,     // 15% uses health inflation

  // ── Section 9: Withdrawal Smoothing (CFG_SMOOTH) ──────────────────────
  smooth: {
    melt: 0.40,         // Max year-to-year meltdown change (fraction)
    meltFloor: 5000,    // Min absolute meltdown change ($)
    spend: 0.30,        // Max year-to-year spending change
    spendFloor: 10000,  // Min absolute spending change ($)
    back: 0.40,         // Backward pass cap
    backFloor: 15000,   // Backward pass min ($)
    nrOver: 1.5,        // Max NR withdrawal as multiple of spending need
    mcBlend: 0.70,      // MC memory weight
  },

  // ── Section 10: Guyton-Klinger Guardrails ─────────────────────────────
  gkCeil: 0.055,       // Ceiling withdrawal rate (5.5%)
  gkFloor: 0.03,       // Floor withdrawal rate (3.0%)
  gkCut: 0.10,         // Per-trigger spending cut (10%)
  gkRaise: 0.10,       // Per-trigger spending raise (10%)
  gkMaxCut: 0.25,      // Max cumulative cut (25%)

  // ── Section 11: Glide Path ────────────────────────────────────────────
  glideSpeed: 0.02,    // 2%/yr equity reduction
  glideFloor: 0.25,    // Min equity factor (25%)
  glideEqFloor: 0.20,  // Min equity per account (20%)

  // ── Section 12: Real Estate ───────────────────────────────────────────
  mortgageRate: 0.05,       // Default 5%
  propAppreciation: 0.035,  // Default 3.5%
  helocRate: 0.065,         // Default 6.5%
  rentalInflation: 0.02,    // 2%/yr
  reCostInflation: 0.03,    // 3%/yr
  refiAmortYears: 25,       // 25 years
  replacementRent: 1500,    // Monthly rent after forced sale ($)

  // ── Section 13: Pension ───────────────────────────────────────────────
  dcWithdrawalRate: 0.04,      // DC plan 4% annual withdrawal
  dcRrifConversionAge: 72,     // Convert to RRIF-like at 72
  partialIndexation: 0.5,      // penIdx=1: half-inflation
  annuityRate: 0.04,           // DC annuity payout rate

  // ── Section 14: Mortality ─────────────────────────────────────────────
  deathAge: 90,                // Default deterministic death age (non-stochastic)
  spouseDeathAge: 90,          // Default spouse death age
  respGrowthRate: 0.05,        // RESP 5% annual growth

  // ── Section 15: Corporate / Business ──────────────────────────────────
  bizSalaryPct: 0.50,          // Default salary/dividend split
  corpPassiveAlloc: 0.40,      // Corporate retained earnings equity allocation
  corpExtractYears: 10,        // Years to wind down post-retirement
  bizSaleACB: 100,             // Default adjusted cost base ($)

  // ── Section 16: Meltdown ──────────────────────────────────────────────
  meltdownTarget: 58523,       // Default RRSP meltdown target = top of 1st federal bracket

  // ── Section 17: Stress Parameters ─────────────────────────────────────
  salaryVolFloor: 0.2,         // Min salary multiplier under volatility
  disabilityMonths: 6,         // Default months per disability event
  peLockYears: 3,              // PE lock-up period (years)
  peLockHaircut: 0.3,          // 30% return during lock-up

  // ── Section 18: GIS-Aware Threshold ───────────────────────────────────
  gisIncomeThreshold: 22000,   // Income below which GIS-aware withdrawal kicks in ($)

  // ── Section 19: MC Operational ────────────────────────────────────────
  fallbackMargRate: 0.42,      // Fallback marginal rate for property disposition
  detMargRate: 0.40,           // Default marginal rate if calcTax fails
  ruinThreshold: 100,          // Below $100 = ruined
  dustThreshold: 100,          // LIRA/IPP below $100 = liquidate
  wdSampleSims: 30,            // Sims tracked for median withdrawal
  shortfallInterval: 3,        // Shortfall probability every 3 years
  sensSims: 50,                // Max sims per sensitivity scenario
  histogramBins: { min: 8, max: 20 },
  deathRuinMaxAge: 105,        // Chart cap
  deathRuinBucket: 5,          // 5-year age buckets
};

export default ENGINE_DEFAULTS;
