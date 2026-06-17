// bilan360-personas/personas.mjs
// Five NEW customer personas, defined as the answers a real client would type
// into the Bilan 360 wizard (app/wizard/page.tsx → lib/quiz-translator-360.ts).
// `answers` mirror the customer-facing field ids the translator reads; the
// driver runs the REAL translateBilan360() so the engine params are exactly
// what production would derive from these answers — nothing hand-tuned.
//
// Phase routing follows CLAUDE.md (translator/wizard):
//   retAge - age <= 0 or retired  → DECUM
//   retAge - age <= 7 AND age >= 52 → TRANSITION
//   else                          → ACCUM
//
// `prefs` (finLiteracy / stressLevel / detailPref) are the report/narration
// calibration the wizard's psychometric block produces (confidence,
// psychLiteracy, worries, detailPreference). Kept explicit here for the lab.
//
// These are SEPARATE from the 20 validation profiles (profiles.json) — own dir,
// own mc/prompts/responses/output.

export const PERSONAS = [
  // 1 — Young single accumulator, QC, plain ETF investor, renter. (FR)
  {
    id: 'maxime_accum_qc', lang: 'fr', phase: 'ACCUM',
    client: { name: 'Maxime Tremblay', firstName: 'Maxime', email: 'maxime@example.com' },
    prefs: { finLiteracy: 'intermediate', stressLevel: 'moderate', detailPref: 'balanced' },
    answers: {
      age: 38, sex: 'M', prov: 'QC', income: 95000, retAge: 62,
      rrsp: 70000, tfsa: 30000, nr: 8000, monthlyContrib: 1000,
      retSpM: 5000, currentSpM: 4200, risk: 'balanced', investStyle: 'low_fee_etf',
      couple: 'no', homeowner: false,
      qppPlannedAge: 65, oasPlannedAge: 65, preRetIncome: 95000, qppYearsWorked: 20,
      spendingFlex: 'moderate', confidence: 4, psychLiteracy: 'medium',
      detailPreference: 'balanced', worries: ['market', 'enough'], estatePref: 'balanced',
    },
  },

  // 2 — Pre-retirement couple, ON, DB pension + home with mortgage, cautious. (EN)
  {
    id: 'walsh_transition_on', lang: 'en', phase: 'TRANSITION',
    client: { name: 'Jennifer Walsh', firstName: 'Jennifer', email: 'jennifer@example.com', spouseFirstName: 'Mark' },
    prefs: { finLiteracy: 'intermediate', stressLevel: 'high', detailPref: 'detailed' },
    answers: {
      age: 58, sex: 'F', prov: 'ON', income: 72000, retAge: 63,
      rrsp: 280000, tfsa: 90000, nr: 20000, monthlyContrib: 800,
      retSpM: 6000, currentSpM: 5500, risk: 'conservative', investStyle: 'mutual_funds',
      couple: 'yes', cAge: 60, cSex: 'M', cIncome: 48000, cRetAge: 63,
      cRrsp: 120000, cTfsa: 30000,
      hasPension: 'db', penM: 1800,
      homeowner: true, homeValue: 650000, mortgageBal: 150000, mortgageRate: 5.0, mortgageAmort: 12, sellAtRet: false,
      qppPlannedAge: 65, oasPlannedAge: 65, preRetIncome: 72000, qppYearsWorked: 35,
      spendingFlex: 'moderate', confidence: 3, psychLiteracy: 'medium',
      detailPreference: 'detailed', worries: ['market', 'healthcare', 'longevity'], estatePref: 'leave_max',
    },
  },

  // 3 — Retired widow, QC, modest, already claiming QPP/OAS, rigid budget. (FR, DECUM)
  {
    id: 'bouchard_decum_qc', lang: 'fr', phase: 'DECUM',
    client: { name: 'Claire Bouchard', firstName: 'Claire', email: 'claire@example.com' },
    prefs: { finLiteracy: 'beginner', stressLevel: 'high', detailPref: 'concise' },
    answers: {
      age: 67, sex: 'F', prov: 'QC', retirementStatus: 'retired', deathAge: 94,
      rrsp: 140000, tfsa: 40000, nr: 5000,
      retSpM: 3200, currentSpM: 3100, risk: 'conservative', investStyle: 'mutual_funds',
      couple: 'no', homeowner: false,
      qppAlreadyClaiming: true, qppCurrentAmount: 950, oasAlreadyClaiming: true, oasCurrentAmount: 713,
      spendingFlex: 'rigid', confidence: 2, psychLiteracy: 'low',
      detailPreference: 'short', worries: ['running_out', 'healthcare'], estatePref: 'spend_it',
    },
  },

  // 4 — High-earning couple, AB, DIY growth investor, home + one rental, estate-minded. (EN)
  {
    id: 'okafor_accum_ab', lang: 'en', phase: 'ACCUM',
    client: { name: 'David Okafor', firstName: 'David', email: 'david@example.com', spouseFirstName: 'Amara' },
    prefs: { finLiteracy: 'advanced', stressLevel: 'low', detailPref: 'detailed' },
    answers: {
      age: 45, sex: 'M', prov: 'AB', income: 115000, retAge: 60,
      rrsp: 200000, tfsa: 80000, nr: 50000, monthlyContrib: 2500,
      retSpM: 7000, currentSpM: 6500, risk: 'growth', investStyle: 'diy_stocks',
      couple: 'yes', cAge: 43, cSex: 'F', cIncome: 65000, cRetAge: 60,
      cRrsp: 90000, cTfsa: 40000,
      homeowner: true, homeValue: 750000, mortgageBal: 300000, mortgageRate: 4.8, mortgageAmort: 18, sellAtRet: false,
      rentalValue1: 450000, rentalMortgage1: 200000, rentalIncome1: 24000, rentalMortgageRate1: 5.0,
      qppPlannedAge: 65, oasPlannedAge: 70, preRetIncome: 115000, qppYearsWorked: 25,
      spendingFlex: 'flexible', confidence: 5, psychLiteracy: 'high',
      detailPreference: 'detailed', worries: ['tax', 'estate'], estatePref: 'leave_max',
    },
  },

  // 5 — Late-starting single near retirement, QC, modest savings + consumer debt. (FR, TRANSITION)
  {
    id: 'gagnon_transition_qc', lang: 'fr', phase: 'TRANSITION',
    client: { name: 'Sylvie Gagnon', firstName: 'Sylvie', email: 'sylvie@example.com' },
    prefs: { finLiteracy: 'beginner', stressLevel: 'high', detailPref: 'concise' },
    answers: {
      age: 54, sex: 'F', prov: 'QC', income: 62000, retAge: 61,
      rrsp: 45000, tfsa: 15000, nr: 3000, monthlyContrib: 400,
      retSpM: 3800, currentSpM: 3500, risk: 'conservative', investStyle: 'high_fee_etf',
      couple: 'no', homeowner: false,
      debtCards: 6000, debtCardRate: 19.99, debtAuto: 14000,
      qppPlannedAge: 65, oasPlannedAge: 65, preRetIncome: 62000, qppYearsWorked: 30,
      spendingFlex: 'rigid', confidence: 2, psychLiteracy: 'low',
      detailPreference: 'short', worries: ['enough', 'debt'], estatePref: 'balanced',
    },
  },
];
