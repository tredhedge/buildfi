// planner/report/realai/corpus/gen-corpus.mjs
// Deterministic corpus generator for the Bilan 360 ship-loop (Step 4).
// Emits ~30 wizard-answer profiles spanning the input space (provinces × phases ×
// success-band tails × archetypes × languages × literacy/stress/detail × edges).
// NO Math.random — fully reproducible. Profiles are the SAME shape ship-loop's
// profiles.json consumes (raw wizard answers → real translateBilan360 downstream).
//   node planner/report/realai/corpus/gen-corpus.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Base prefs presets (literacy / stress / detail) — cover the calibration space.
const PREFS = {
  begLowCon: { finLiteracy: "beginner", stressLevel: "low", detailPref: "concise" },
  begHighCon: { finLiteracy: "beginner", stressLevel: "high", detailPref: "concise" },
  intModBal: { finLiteracy: "intermediate", stressLevel: "moderate", detailPref: "balanced" },
  intHighDet: { finLiteracy: "intermediate", stressLevel: "high", detailPref: "detailed" },
  advLowDet: { finLiteracy: "advanced", stressLevel: "low", detailPref: "detailed" },
};

// ── Archetype templates. Each returns the wizard `answers` block. ────────────
// Kept realistic & schema-valid so translateBilan360 + the engine produce a real
// run. `_band` is the intended success tail (for our own coverage tracking).
const A = {
  youngAccum: (o) => ({ age: o.age ?? 32, sex: o.sex ?? "F", prov: o.prov, income: o.income ?? 68000, retAge: o.retAge ?? 65,
    rrsp: 18000, tfsa: 12000, nr: 2000, monthlyContrib: o.contrib ?? 500, retSpM: o.retSpM ?? 3800, currentSpM: 3200,
    risk: "growth", investStyle: "low_fee_etf", couple: "no", homeowner: false,
    qppPlannedAge: 65, oasPlannedAge: 65, preRetIncome: o.income ?? 68000, qppYearsWorked: 10,
    spendingFlex: "flexible", confidence: 3, psychLiteracy: "medium", detailPreference: "balanced", worries: ["enough"], estatePref: "balanced" }),
  midAccumCouple: (o) => ({ age: o.age ?? 44, sex: "M", prov: o.prov, income: o.income ?? 105000, retAge: o.retAge ?? 62,
    rrsp: 160000, tfsa: 60000, nr: 30000, monthlyContrib: 1800, retSpM: o.retSpM ?? 6500, currentSpM: 6000,
    risk: "balanced", investStyle: "low_fee_etf", couple: "yes", cAge: (o.age ?? 44) - 2, cSex: "F", cIncome: 72000, cRetAge: 62, cRrsp: 95000, cTfsa: 40000,
    homeowner: true, homeValue: 600000, mortgageBal: 220000, mortgageRate: 4.9, mortgageAmort: 16, sellAtRet: false,
    qppPlannedAge: 65, oasPlannedAge: 65, preRetIncome: o.income ?? 105000, qppYearsWorked: 22,
    spendingFlex: "moderate", confidence: 4, psychLiteracy: "high", detailPreference: "detailed", worries: ["market", "tax"], estatePref: "leave_max" }),
  lateStarterDebt: (o) => ({ age: o.age ?? 55, sex: "F", prov: o.prov, income: o.income ?? 58000, retAge: o.retAge ?? 62,
    rrsp: 38000, tfsa: 9000, nr: 1000, monthlyContrib: 300, retSpM: o.retSpM ?? 3600, currentSpM: 3400,
    risk: "conservative", investStyle: "high_fee_etf", couple: "no", homeowner: false,
    debtCards: 8000, debtCardRate: 19.99, debtAuto: 12000,
    qppPlannedAge: 65, oasPlannedAge: 65, preRetIncome: o.income ?? 58000, qppYearsWorked: 28,
    spendingFlex: "rigid", confidence: 2, psychLiteracy: "low", detailPreference: "short", worries: ["enough", "debt"], estatePref: "balanced" }),
  preRetDB: (o) => ({ age: o.age ?? 59, sex: o.sex ?? "M", prov: o.prov, income: o.income ?? 88000, retAge: o.retAge ?? 63,
    rrsp: 240000, tfsa: 85000, nr: 15000, monthlyContrib: 700, retSpM: o.retSpM ?? 5800, currentSpM: 5400,
    risk: "conservative", investStyle: "mutual_funds", couple: o.couple ?? "yes", cAge: (o.age ?? 59) + 1, cSex: "F", cIncome: 52000, cRetAge: 63, cRrsp: 110000, cTfsa: 35000,
    hasPension: "db", penM: 2100, homeowner: true, homeValue: 680000, mortgageBal: 90000, mortgageRate: 5.0, mortgageAmort: 8, sellAtRet: o.sell ?? false,
    qppPlannedAge: o.qpp ?? 65, oasPlannedAge: 65, preRetIncome: o.income ?? 88000, qppYearsWorked: 35,
    spendingFlex: "moderate", confidence: 3, psychLiteracy: "medium", detailPreference: "detailed", worries: ["market", "healthcare", "longevity"], estatePref: "leave_max" }),
  retiredModest: (o) => ({ age: o.age ?? 69, sex: o.sex ?? "F", prov: o.prov, retirementStatus: "retired", deathAge: o.death ?? 94,
    rrsp: o.rrsp ?? 120000, tfsa: 35000, nr: 4000, retSpM: o.retSpM ?? 3100, currentSpM: 3000,
    risk: "conservative", investStyle: "mutual_funds", couple: "no", homeowner: o.homeowner ?? false,
    qppAlreadyClaiming: true, qppCurrentAmount: o.qpp ?? 900, oasAlreadyClaiming: true, oasCurrentAmount: 713,
    spendingFlex: "rigid", confidence: 2, psychLiteracy: "low", detailPreference: "short", worries: ["running_out", "healthcare"], estatePref: "spend_it" }),
  gisEligible: (o) => ({ age: o.age ?? 67, sex: "F", prov: o.prov, retirementStatus: "retired", deathAge: 92,
    rrsp: 15000, tfsa: 6000, nr: 0, retSpM: o.retSpM ?? 1900, currentSpM: 1850,
    risk: "conservative", investStyle: "mutual_funds", couple: "no", homeowner: false,
    qppAlreadyClaiming: true, qppCurrentAmount: 520, oasAlreadyClaiming: true, oasCurrentAmount: 713,
    spendingFlex: "rigid", confidence: 2, psychLiteracy: "low", detailPreference: "short", worries: ["running_out"], estatePref: "spend_it" }),
  hnwCoupleRentals: (o) => ({ age: o.age ?? 48, sex: "M", prov: o.prov, income: o.income ?? 145000, retAge: o.retAge ?? 58,
    rrsp: 320000, tfsa: 110000, nr: 90000, monthlyContrib: 3200, retSpM: o.retSpM ?? 8500, currentSpM: 7800,
    risk: "growth", investStyle: "diy_stocks", couple: "yes", cAge: 46, cSex: "F", cIncome: 90000, cRetAge: 58, cRrsp: 150000, cTfsa: 70000,
    homeowner: true, homeValue: 900000, mortgageBal: 350000, mortgageRate: 4.7, mortgageAmort: 18, sellAtRet: false,
    rentalValue1: 480000, rentalMortgage1: 210000, rentalIncome1: 26000, rentalMortgageRate1: 5.0,
    rentalValue2: 410000, rentalMortgage2: 180000, rentalIncome2: 22000, rentalMortgageRate2: 5.1,
    qppPlannedAge: 65, oasPlannedAge: 70, preRetIncome: o.income ?? 145000, qppYearsWorked: 26,
    spendingFlex: "flexible", confidence: 5, psychLiteracy: "high", detailPreference: "detailed", worries: ["tax", "estate"], estatePref: "leave_max" }),
  homeownerSells: (o) => ({ age: o.age ?? 60, sex: "F", prov: o.prov, income: o.income ?? 70000, retAge: o.retAge ?? 64,
    rrsp: 150000, tfsa: 50000, nr: 8000, monthlyContrib: 600, retSpM: o.retSpM ?? 5200, currentSpM: 4800,
    risk: "balanced", investStyle: "low_fee_etf", couple: "no",
    homeowner: true, homeValue: 720000, mortgageBal: 60000, mortgageRate: 5.0, mortgageAmort: 6, sellAtRet: true, downsizeAge: 66,
    qppPlannedAge: 65, oasPlannedAge: 65, preRetIncome: o.income ?? 70000, qppYearsWorked: 33,
    spendingFlex: "moderate", confidence: 3, psychLiteracy: "medium", detailPreference: "balanced", worries: ["healthcare"], estatePref: "balanced" }),
};

// ── EDGE-VALUE archetypes (force the tails / stress the translator+engine). ──
const EDGE = {
  zeroSavings: (o) => ({ age: 58, sex: "M", prov: o.prov, income: 50000, retAge: 60,
    rrsp: 0, tfsa: 0, nr: 0, monthlyContrib: 0, retSpM: 4000, currentSpM: 3800,
    risk: "conservative", investStyle: "mutual_funds", couple: "no", homeowner: false,
    qppPlannedAge: 65, oasPlannedAge: 65, preRetIncome: 50000, qppYearsWorked: 30,
    spendingFlex: "rigid", confidence: 1, psychLiteracy: "low", detailPreference: "short", worries: ["enough", "running_out"], estatePref: "spend_it" }),
  hugeSavingsYoung: (o) => ({ age: 40, sex: "F", prov: o.prov, income: 200000, retAge: 55,
    rrsp: 600000, tfsa: 200000, nr: 400000, monthlyContrib: 5000, retSpM: 9000, currentSpM: 8000,
    risk: "growth", investStyle: "diy_stocks", couple: "no", homeowner: true, homeValue: 1100000, mortgageBal: 200000, mortgageRate: 4.5, mortgageAmort: 12, sellAtRet: false,
    qppPlannedAge: 70, oasPlannedAge: 70, preRetIncome: 200000, qppYearsWorked: 18,
    spendingFlex: "flexible", confidence: 5, psychLiteracy: "high", detailPreference: "detailed", worries: ["tax", "estate"], estatePref: "leave_max" }),
  retAgeEqualsAge: (o) => ({ age: 64, sex: "M", prov: o.prov, income: 90000, retAge: 64,
    rrsp: 300000, tfsa: 90000, nr: 20000, monthlyContrib: 0, retSpM: 5500, currentSpM: 5200,
    risk: "balanced", investStyle: "low_fee_etf", couple: "no", homeowner: true, homeValue: 550000, mortgageBal: 0, mortgageRate: 5, mortgageAmort: 0, sellAtRet: false,
    qppPlannedAge: 65, oasPlannedAge: 65, preRetIncome: 90000, qppYearsWorked: 38,
    spendingFlex: "moderate", confidence: 3, psychLiteracy: "medium", detailPreference: "balanced", worries: ["market"], estatePref: "balanced" }),
  veryOldCouple: (o) => ({ age: 78, sex: "M", prov: o.prov, retirementStatus: "retired", deathAge: 100,
    rrsp: 80000, tfsa: 60000, nr: 10000, retSpM: 4200, currentSpM: 4100,
    risk: "conservative", investStyle: "mutual_funds", couple: "yes", cAge: 76, cSex: "F", cRrsp: 40000, cTfsa: 20000,
    qppAlreadyClaiming: true, qppCurrentAmount: 1100, oasAlreadyClaiming: true, oasCurrentAmount: 713,
    spendingFlex: "rigid", confidence: 2, psychLiteracy: "low", detailPreference: "short", worries: ["healthcare", "longevity"], estatePref: "leave_max" }),
};

// ── The corpus: archetype × province × language, hand-curated for coverage. ──
// id encodes archetype_prov; lang set per row. phase is re-derived downstream.
const ROWS = [
  // ACCUM
  ["young_qc", "fr", A.youngAccum, { prov: "QC" }, PREFS.intModBal, "Léa Côté"],
  ["young_on", "en", A.youngAccum, { prov: "ON", sex: "M", income: 60000, contrib: 350 }, PREFS.begLowCon, "Tyler Brooks"],
  ["midcouple_ab", "en", A.midAccumCouple, { prov: "AB" }, PREFS.advLowDet, "Daniel Reyes"],
  ["midcouple_qc", "fr", A.midAccumCouple, { prov: "QC", income: 92000 }, PREFS.intHighDet, "Marc Bélanger"],
  ["hnw_bc", "en", A.hnwCoupleRentals, { prov: "BC" }, PREFS.advLowDet, "Priya Nair"],
  ["hnw_on", "en", A.hnwCoupleRentals, { prov: "ON", income: 130000 }, PREFS.intHighDet, "Greg Sutton"],
  ["hugesave_qc", "fr", EDGE.hugeSavingsYoung, { prov: "QC" }, PREFS.advLowDet, "Sophie Lévesque"],
  // TRANSITION
  ["latedebt_qc", "fr", A.lateStarterDebt, { prov: "QC" }, PREFS.begHighCon, "Nathalie Roy"],
  ["latedebt_on", "en", A.lateStarterDebt, { prov: "ON", income: 54000 }, PREFS.begHighCon, "Karen Webb"],
  ["preretdb_on", "en", A.preRetDB, { prov: "ON" }, PREFS.intHighDet, "Robert Klein"],
  ["preretdb_qc", "fr", A.preRetDB, { prov: "QC", couple: "no", sex: "F" }, PREFS.intModBal, "Diane Fortin"],
  ["sells_bc", "en", A.homeownerSells, { prov: "BC" }, PREFS.intModBal, "Janet Cho"],
  ["sells_qc", "fr", A.homeownerSells, { prov: "QC", income: 64000 }, PREFS.begLowCon, "Manon Girard"],
  ["zerosave_ab", "en", EDGE.zeroSavings, { prov: "AB" }, PREFS.begHighCon, "Wayne Foster"],
  ["reteqage_qc", "fr", EDGE.retAgeEqualsAge, { prov: "QC" }, PREFS.intModBal, "Pierre Dubé"],
  // DECUM
  ["retmodest_qc", "fr", A.retiredModest, { prov: "QC" }, PREFS.begHighCon, "Claire Bergeron"],
  ["retmodest_on", "en", A.retiredModest, { prov: "ON", sex: "M", rrsp: 180000 }, PREFS.begLowCon, "Harold Price"],
  ["retmodest_bc", "en", A.retiredModest, { prov: "BC", homeowner: true }, PREFS.intModBal, "Susan Lim"],
  ["gis_qc", "fr", A.gisEligible, { prov: "QC" }, PREFS.begHighCon, "Yvette Tremblay"],
  ["gis_on", "en", A.gisEligible, { prov: "ON" }, PREFS.begLowCon, "Edna Walsh"],
  ["veryold_qc", "fr", EDGE.veryOldCouple, { prov: "QC" }, PREFS.begHighCon, "Gérald Caron"],
  ["veryold_ab", "en", EDGE.veryOldCouple, { prov: "AB" }, PREFS.begLowCon, "Frank Olsen"],
];

function phaseFor(ans) {
  const age = Number(ans.age) || (ans.retirementStatus === "retired" ? 68 : 40);
  const retAge = Number(ans.retAge) || (ans.retirementStatus === "retired" ? age : 65);
  if (retAge - age <= 0 || ans.retirementStatus === "retired") return "DECUM";
  if (retAge - age <= 7 && age >= 52) return "TRANSITION";
  return "ACCUM";
}

const profiles = ROWS.map(([id, lang, build, opts, prefs, name]) => {
  const answers = build(opts);
  // fold calibration prefs into the answer block (the wizard psychometric outputs)
  answers.confidence = prefs.stressLevel === "high" ? 2 : prefs.stressLevel === "low" ? 5 : 3;
  answers.psychLiteracy = prefs.finLiteracy === "beginner" ? "low" : prefs.finLiteracy === "advanced" ? "high" : "medium";
  answers.detailPreference = prefs.detailPref === "concise" ? "short" : prefs.detailPref === "detailed" ? "detailed" : "balanced";
  const firstName = name.split(" ")[0];
  return { id, lang, phase: phaseFor(answers), prefs, client: { name, firstName, email: firstName.toLowerCase() + "@example.com" }, answers };
});

const outDir = path.resolve(__dirname, "..", "corpus-30"); // sibling dir; keeps the validated 5-seed corpus/ intact
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "profiles.json"), JSON.stringify({ _generated: "gen-corpus.mjs", count: profiles.length, profiles }, null, 2));
const byPhase = profiles.reduce((a, p) => ((a[p.phase] = (a[p.phase] || 0) + 1), a), {});
const byLang = profiles.reduce((a, p) => ((a[p.lang] = (a[p.lang] || 0) + 1), a), {});
console.log(`[gen-corpus] wrote ${profiles.length} profiles → profiles.json`);
console.log(`  phases: ${JSON.stringify(byPhase)}  langs: ${JSON.stringify(byLang)}`);
console.log("  ids: " + profiles.map((p) => p.id).join(", "));
