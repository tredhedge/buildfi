// corpus-pilot/corpus-data.mjs
// PURE data module (no lib imports) — the synthetic wizard-answer corpus.
// Shared by gen-corpus.mjs (native node, writes profiles.json via the real
// translator) and run-prod-parity.mjs (tsx, drives the prod renderer). Kept
// import-free so it loads identically under both `node` and `tsx`.
//
// ~20 profiles spanning the production input space: province × couple × phase ×
// archetype × language × edge values. See PILOT-RESULTS.md.

// Phase routing — mirrors CLAUDE.md (translator/wizard):
//   retAge - age <= 0 or retired   → DECUM
//   retAge - age <= 7 AND age >= 52 → TRANSITION
//   else                            → ACCUM
export function derivePhase(a) {
  const retired = a.retirementStatus === 'retired' || a.qppAlreadyClaiming === true;
  if (retired) return 'DECUM';
  const gap = (a.retAge ?? 65) - a.age;
  if (gap <= 0) return 'DECUM';
  if (gap <= 7 && a.age >= 52) return 'TRANSITION';
  return 'ACCUM';
}

const PREFS = {
  calm:    { finLiteracy: 'advanced',     stressLevel: 'low',      detailPref: 'detailed' },
  steady:  { finLiteracy: 'intermediate', stressLevel: 'moderate', detailPref: 'balanced' },
  anxious: { finLiteracy: 'beginner',     stressLevel: 'high',     detailPref: 'concise'  },
};

const SPECS = [
  // ── ACCUM — single renters ──────────────────────────────────────────────
  { id: 'c01_young_renter', lang: 'fr', prefs: PREFS.steady, answers: {
    age: 32, sex: 'F', prov: 'QC', income: 68000, retAge: 65, rrsp: 22000, tfsa: 14000, nr: 3000,
    monthlyContrib: 600, retSpM: 3600, currentSpM: 3200, risk: 'balanced', investStyle: 'low_fee_etf',
    couple: 'no', homeowner: false, qppPlannedAge: 65, oasPlannedAge: 65, preRetIncome: 68000,
    qppYearsWorked: 12, spendingFlex: 'moderate', confidence: 3, psychLiteracy: 'medium',
    detailPreference: 'balanced', worries: ['enough', 'market'], estatePref: 'balanced' } },
  { id: 'c02_mid_renter', lang: 'en', prefs: PREFS.calm, answers: {
    age: 41, sex: 'M', prov: 'BC', income: 102000, retAge: 60, rrsp: 130000, tfsa: 65000, nr: 20000,
    monthlyContrib: 1800, retSpM: 5200, currentSpM: 4800, risk: 'growth', investStyle: 'diy_stocks',
    couple: 'no', homeowner: false, qppPlannedAge: 70, oasPlannedAge: 70, preRetIncome: 102000,
    qppYearsWorked: 19, spendingFlex: 'flexible', confidence: 5, psychLiteracy: 'high',
    detailPreference: 'detailed', worries: ['tax', 'estate'], estatePref: 'leave_max' } },
  { id: 'c03_zero_savings', lang: 'en', prefs: PREFS.anxious, answers: {
    age: 36, sex: 'F', prov: 'ON', income: 54000, retAge: 65, rrsp: 0, tfsa: 0, nr: 0,
    monthlyContrib: 150, retSpM: 3000, currentSpM: 2900, risk: 'conservative', investStyle: 'mutual_funds',
    couple: 'no', homeowner: false, qppPlannedAge: 65, oasPlannedAge: 65, preRetIncome: 54000,
    qppYearsWorked: 14, spendingFlex: 'rigid', confidence: 1, psychLiteracy: 'low',
    detailPreference: 'short', worries: ['running_out', 'enough'], estatePref: 'spend_it' } },

  // ── ACCUM — couples, homeowner with mortgage / rentals ───────────────────
  { id: 'c04_couple_home', lang: 'fr', prefs: PREFS.steady, answers: {
    age: 44, sex: 'M', prov: 'QC', income: 88000, retAge: 62, rrsp: 160000, tfsa: 70000, nr: 15000,
    monthlyContrib: 1500, retSpM: 6000, currentSpM: 5400, risk: 'balanced', investStyle: 'low_fee_etf',
    couple: 'yes', cAge: 42, cSex: 'F', cIncome: 71000, cRetAge: 62, cRrsp: 95000, cTfsa: 40000,
    homeowner: true, homeValue: 520000, mortgageBal: 180000, mortgageRate: 4.5, mortgageAmort: 16, sellAtRet: false,
    qppPlannedAge: 65, oasPlannedAge: 65, preRetIncome: 88000, qppYearsWorked: 22,
    spendingFlex: 'moderate', confidence: 4, psychLiteracy: 'medium', detailPreference: 'balanced',
    worries: ['market', 'healthcare'], estatePref: 'balanced' } },
  { id: 'c05_hnw_rental', lang: 'en', prefs: PREFS.calm, answers: {
    age: 47, sex: 'F', prov: 'AB', income: 145000, retAge: 58, rrsp: 320000, tfsa: 110000, nr: 90000,
    monthlyContrib: 3200, retSpM: 8500, currentSpM: 7800, risk: 'growth', investStyle: 'diy_stocks',
    couple: 'yes', cAge: 49, cSex: 'M', cIncome: 95000, cRetAge: 60, cRrsp: 240000, cTfsa: 100000,
    homeowner: true, homeValue: 900000, mortgageBal: 250000, mortgageRate: 4.9, mortgageAmort: 14, sellAtRet: false,
    rentalValue1: 520000, rentalMortgage1: 210000, rentalIncome1: 28000, rentalMortgageRate1: 5.1,
    qppPlannedAge: 70, oasPlannedAge: 70, preRetIncome: 145000, qppYearsWorked: 26,
    spendingFlex: 'flexible', confidence: 5, psychLiteracy: 'high', detailPreference: 'detailed',
    worries: ['tax', 'estate'], estatePref: 'leave_max' } },
  { id: 'c06_two_rentals', lang: 'fr', prefs: PREFS.calm, answers: {
    age: 50, sex: 'M', prov: 'QC', income: 130000, retAge: 60, rrsp: 280000, tfsa: 95000, nr: 60000,
    monthlyContrib: 2400, retSpM: 7500, currentSpM: 6800, risk: 'growth', investStyle: 'diy_stocks',
    couple: 'yes', cAge: 48, cSex: 'F', cIncome: 60000, cRetAge: 62, cRrsp: 110000, cTfsa: 55000,
    homeowner: true, homeValue: 700000, mortgageBal: 120000, mortgageRate: 3.9, mortgageAmort: 8, sellAtRet: false,
    rentalValue1: 400000, rentalMortgage1: 150000, rentalIncome1: 22000, rentalMortgageRate1: 4.8,
    rentalValue2: 360000, rentalMortgage2: 140000, rentalIncome2: 20000, rentalMortgageRate2: 4.7,
    qppPlannedAge: 65, oasPlannedAge: 65, preRetIncome: 130000, qppYearsWorked: 28,
    spendingFlex: 'flexible', confidence: 4, psychLiteracy: 'high', detailPreference: 'detailed',
    worries: ['tax', 'estate'], estatePref: 'leave_max' } },

  // ── TRANSITION — DB pension, sell-home, debt ─────────────────────────────
  { id: 'c07_db_pension', lang: 'en', prefs: PREFS.steady, answers: {
    age: 57, sex: 'F', prov: 'ON', income: 78000, retAge: 62, rrsp: 240000, tfsa: 85000, nr: 18000,
    monthlyContrib: 900, retSpM: 5800, currentSpM: 5300, risk: 'conservative', investStyle: 'mutual_funds',
    couple: 'yes', cAge: 59, cSex: 'M', cIncome: 52000, cRetAge: 62, cRrsp: 130000, cTfsa: 35000,
    hasPension: 'db', penM: 2200, homeowner: true, homeValue: 680000, mortgageBal: 90000,
    mortgageRate: 5.2, mortgageAmort: 7, sellAtRet: false, qppPlannedAge: 65, oasPlannedAge: 65,
    preRetIncome: 78000, qppYearsWorked: 33, spendingFlex: 'moderate', confidence: 3,
    psychLiteracy: 'medium', detailPreference: 'balanced', worries: ['market', 'longevity'], estatePref: 'balanced' } },
  { id: 'c08_sell_home', lang: 'fr', prefs: PREFS.steady, answers: {
    age: 59, sex: 'M', prov: 'BC', income: 84000, retAge: 63, rrsp: 210000, tfsa: 60000, nr: 12000,
    monthlyContrib: 700, retSpM: 5000, currentSpM: 4700, risk: 'balanced', investStyle: 'low_fee_etf',
    couple: 'yes', cAge: 57, cSex: 'F', cIncome: 44000, cRetAge: 63, cRrsp: 80000, cTfsa: 30000,
    homeowner: true, homeValue: 1100000, mortgageBal: 200000, mortgageRate: 5.0, mortgageAmort: 10, sellAtRet: true,
    qppPlannedAge: 65, oasPlannedAge: 65, preRetIncome: 84000, qppYearsWorked: 31,
    spendingFlex: 'moderate', confidence: 3, psychLiteracy: 'medium', detailPreference: 'balanced',
    worries: ['healthcare', 'longevity'], estatePref: 'balanced' } },
  { id: 'c09_latestart_debt', lang: 'fr', prefs: PREFS.anxious, answers: {
    age: 55, sex: 'F', prov: 'QC', income: 58000, retAge: 62, rrsp: 38000, tfsa: 9000, nr: 1000,
    monthlyContrib: 300, retSpM: 3600, currentSpM: 3400, risk: 'conservative', investStyle: 'high_fee_etf',
    couple: 'no', homeowner: false, debtCards: 8000, debtCardRate: 19.99, debtAuto: 16000,
    qppPlannedAge: 65, oasPlannedAge: 65, preRetIncome: 58000, qppYearsWorked: 29,
    spendingFlex: 'rigid', confidence: 2, psychLiteracy: 'low', detailPreference: 'short',
    worries: ['enough', 'debt'], estatePref: 'balanced' } },
  { id: 'c10_immediate_ret', lang: 'en', prefs: PREFS.steady, answers: {
    age: 60, sex: 'M', prov: 'AB', income: 96000, retAge: 60, rrsp: 380000, tfsa: 95000, nr: 40000,
    monthlyContrib: 0, retSpM: 6200, currentSpM: 6000, risk: 'balanced', investStyle: 'low_fee_etf',
    couple: 'no', homeowner: true, homeValue: 600000, mortgageBal: 0, mortgageRate: 0, mortgageAmort: 0, sellAtRet: false,
    qppPlannedAge: 65, oasPlannedAge: 65, preRetIncome: 96000, qppYearsWorked: 35,
    spendingFlex: 'moderate', confidence: 4, psychLiteracy: 'medium', detailPreference: 'balanced',
    worries: ['market', 'tax'], estatePref: 'balanced' } },

  // ── DECUM — retired, modest → GIS-eligible → comfortable ─────────────────
  { id: 'c11_retired_modest', lang: 'fr', prefs: PREFS.anxious, answers: {
    age: 68, sex: 'F', prov: 'QC', retirementStatus: 'retired', deathAge: 92, rrsp: 120000, tfsa: 35000, nr: 4000,
    retSpM: 3000, currentSpM: 2950, risk: 'conservative', investStyle: 'mutual_funds', couple: 'no', homeowner: false,
    qppAlreadyClaiming: true, qppCurrentAmount: 880, oasAlreadyClaiming: true, oasCurrentAmount: 713,
    spendingFlex: 'rigid', confidence: 2, psychLiteracy: 'low', detailPreference: 'short',
    worries: ['running_out', 'healthcare'], estatePref: 'spend_it' } },
  { id: 'c12_gis_eligible', lang: 'en', prefs: PREFS.anxious, answers: {
    age: 71, sex: 'F', prov: 'ON', retirementStatus: 'retired', deathAge: 90, rrsp: 18000, tfsa: 6000, nr: 0,
    retSpM: 2100, currentSpM: 2050, risk: 'conservative', investStyle: 'mutual_funds', couple: 'no', homeowner: false,
    qppAlreadyClaiming: true, qppCurrentAmount: 520, oasAlreadyClaiming: true, oasCurrentAmount: 713,
    spendingFlex: 'rigid', confidence: 1, psychLiteracy: 'low', detailPreference: 'short',
    worries: ['running_out'], estatePref: 'spend_it' } },
  { id: 'c13_retired_couple', lang: 'en', prefs: PREFS.steady, answers: {
    age: 70, sex: 'M', prov: 'BC', retirementStatus: 'retired', deathAge: 93, rrsp: 300000, tfsa: 90000, nr: 25000,
    retSpM: 5500, currentSpM: 5400, risk: 'balanced', investStyle: 'low_fee_etf',
    couple: 'yes', cAge: 68, cSex: 'F', cIncome: 0, cRetAge: 65, cRrsp: 150000, cTfsa: 60000,
    qppAlreadyClaiming: true, qppCurrentAmount: 1050, oasAlreadyClaiming: true, oasCurrentAmount: 713,
    homeowner: true, homeValue: 820000, mortgageBal: 0, mortgageRate: 0, mortgageAmort: 0, sellAtRet: false,
    spendingFlex: 'moderate', confidence: 3, psychLiteracy: 'medium', detailPreference: 'balanced',
    worries: ['longevity', 'healthcare'], estatePref: 'balanced' } },
  { id: 'c14_retired_hnw', lang: 'fr', prefs: PREFS.calm, answers: {
    age: 66, sex: 'M', prov: 'QC', retirementStatus: 'retired', deathAge: 95, rrsp: 750000, tfsa: 140000, nr: 200000,
    retSpM: 9000, currentSpM: 8500, risk: 'balanced', investStyle: 'diy_stocks',
    couple: 'yes', cAge: 64, cSex: 'F', cIncome: 0, cRetAge: 62, cRrsp: 300000, cTfsa: 120000,
    qppAlreadyClaiming: true, qppCurrentAmount: 1300, oasAlreadyClaiming: true, oasCurrentAmount: 713,
    homeowner: true, homeValue: 1200000, mortgageBal: 0, mortgageRate: 0, mortgageAmort: 0, sellAtRet: false,
    spendingFlex: 'flexible', confidence: 5, psychLiteracy: 'high', detailPreference: 'detailed',
    worries: ['tax', 'estate'], estatePref: 'leave_max' } },

  // ── Edge values ──────────────────────────────────────────────────────────
  { id: 'e01_age18', lang: 'en', prefs: PREFS.steady, answers: {
    age: 18, sex: 'M', prov: 'ON', income: 28000, retAge: 65, rrsp: 0, tfsa: 1000, nr: 0,
    monthlyContrib: 100, retSpM: 2500, currentSpM: 1800, risk: 'growth', investStyle: 'low_fee_etf',
    couple: 'no', homeowner: false, qppPlannedAge: 65, oasPlannedAge: 65, preRetIncome: 28000,
    qppYearsWorked: 1, spendingFlex: 'flexible', confidence: 3, psychLiteracy: 'low',
    detailPreference: 'balanced', worries: ['enough'], estatePref: 'spend_it' } },
  { id: 'e02_age95', lang: 'fr', prefs: PREFS.anxious, answers: {
    age: 95, sex: 'F', prov: 'QC', retirementStatus: 'retired', deathAge: 99, rrsp: 40000, tfsa: 10000, nr: 0,
    retSpM: 2400, currentSpM: 2400, risk: 'conservative', investStyle: 'mutual_funds', couple: 'no', homeowner: false,
    qppAlreadyClaiming: true, qppCurrentAmount: 700, oasAlreadyClaiming: true, oasCurrentAmount: 713,
    spendingFlex: 'rigid', confidence: 2, psychLiteracy: 'low', detailPreference: 'short',
    worries: ['running_out'], estatePref: 'spend_it' } },
  { id: 'e03_huge_savings', lang: 'en', prefs: PREFS.calm, answers: {
    age: 52, sex: 'M', prov: 'AB', income: 400000, retAge: 55, rrsp: 2000000, tfsa: 250000, nr: 1500000,
    monthlyContrib: 8000, retSpM: 18000, currentSpM: 15000, risk: 'growth', investStyle: 'diy_stocks',
    couple: 'yes', cAge: 50, cSex: 'F', cIncome: 180000, cRetAge: 55, cRrsp: 900000, cTfsa: 200000,
    homeowner: true, homeValue: 2500000, mortgageBal: 400000, mortgageRate: 4.5, mortgageAmort: 12, sellAtRet: false,
    qppPlannedAge: 70, oasPlannedAge: 70, preRetIncome: 400000, qppYearsWorked: 30,
    spendingFlex: 'flexible', confidence: 5, psychLiteracy: 'high', detailPreference: 'detailed',
    worries: ['tax', 'estate'], estatePref: 'leave_max' } },
  { id: 'e04_underwater', lang: 'en', prefs: PREFS.anxious, answers: {
    age: 49, sex: 'F', prov: 'ON', income: 62000, retAge: 65, rrsp: 25000, tfsa: 5000, nr: 0,
    monthlyContrib: 200, retSpM: 3800, currentSpM: 3700, risk: 'conservative', investStyle: 'high_fee_etf',
    couple: 'no', homeowner: true, homeValue: 380000, mortgageBal: 420000, mortgageRate: 5.8, mortgageAmort: 25, sellAtRet: false,
    debtCards: 12000, debtCardRate: 21.99, qppPlannedAge: 65, oasPlannedAge: 65, preRetIncome: 62000,
    qppYearsWorked: 24, spendingFlex: 'rigid', confidence: 1, psychLiteracy: 'low',
    detailPreference: 'short', worries: ['debt', 'running_out'], estatePref: 'spend_it' } },
  { id: 'e05_retAge_eq_age', lang: 'fr', prefs: PREFS.steady, answers: {
    age: 63, sex: 'M', prov: 'QC', income: 90000, retAge: 63, rrsp: 420000, tfsa: 100000, nr: 30000,
    monthlyContrib: 0, retSpM: 5800, currentSpM: 5600, risk: 'balanced', investStyle: 'low_fee_etf',
    couple: 'no', homeowner: true, homeValue: 550000, mortgageBal: 50000, mortgageRate: 4.2, mortgageAmort: 5, sellAtRet: false,
    qppPlannedAge: 65, oasPlannedAge: 65, preRetIncome: 90000, qppYearsWorked: 38,
    spendingFlex: 'moderate', confidence: 4, psychLiteracy: 'medium', detailPreference: 'balanced',
    worries: ['market', 'tax'], estatePref: 'balanced' } },
  { id: 'e06_low_income_qc', lang: 'fr', prefs: PREFS.anxious, answers: {
    age: 40, sex: 'F', prov: 'QC', income: 32000, retAge: 65, rrsp: 5000, tfsa: 2000, nr: 0,
    monthlyContrib: 80, retSpM: 2400, currentSpM: 2300, risk: 'conservative', investStyle: 'mutual_funds',
    couple: 'no', homeowner: false, qppPlannedAge: 65, oasPlannedAge: 65, preRetIncome: 32000,
    qppYearsWorked: 18, spendingFlex: 'rigid', confidence: 2, psychLiteracy: 'low',
    detailPreference: 'short', worries: ['enough', 'running_out'], estatePref: 'spend_it' } },
];

const NAMES = {
  fr: [['Léa', 'Martin'], ['Hugo', 'Roy'], ['Camille', 'Côté'], ['Olivier', 'Bergeron'], ['Émilie', 'Caron'], ['Antoine', 'Fortin']],
  en: [['Sarah', 'Bennett'], ['James', 'Carter'], ['Priya', 'Nair'], ['Marcus', 'Hill'], ['Grace', 'Thompson'], ['Daniel', 'Reed']],
};

// Enriched corpus — single source. Carries raw wizard `answers` (so the prod
// webhook pipeline can be reproduced) + a deterministic client identity.
let frN = 0, enN = 0;
export const CORPUS = SPECS.map((spec) => {
  const phase = derivePhase(spec.answers);
  const pool = NAMES[spec.lang];
  const [first, last] = spec.lang === 'fr' ? pool[frN++ % pool.length] : pool[enN++ % pool.length];
  const client = { name: `${first} ${last}`, firstName: first, email: `${first.toLowerCase()}@example.com` };
  if (spec.answers.couple === 'yes') client.spouseFirstName = spec.lang === 'fr' ? 'Alex' : 'Jordan';
  return { id: spec.id, lang: spec.lang, phase, prefs: spec.prefs, client, answers: spec.answers };
});
