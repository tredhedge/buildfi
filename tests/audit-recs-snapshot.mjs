// Quick visual snapshot of rendered filet + lever notes output
const mod360 = await import('../lib/report-html-360.js');
const modExp = await import('../lib/report-html-expert.ts');

const baseParams = {
  age: 55, retAge: 65, deathAge: 95, prov: "QC", sex: "M",
  sal: 80000, rrsp: 200000, tfsa: 50000, nr: 30000, liraBal: 0, dcBal: 0,
  retSpM: 4500, qppAge: 65, oasAge: 65, inf: 0.021,
  merR: 0.015, merT: 0.007, merN: 0.007, allocR: 0.6,
  cOn: false, _report: {}, _quiz: {},
};

const mc = {
  succ: 0.45,
  rMedF: 0, rP5F: 0, rP25F: 0, rP75F: 80000, rP95F: 250000,
  avgDeath: 88, deathAges: [88], medRuin: 82, ruinPct: 0.55,
  medRevData: [
    { age: 65, rrq: 14000, psv: 8000, gis: 0, pen: 0, ret: 36000, spend: 60000,
      aRR: 80000, aTF: 20000, aNR: 0, aDC: 0, aPE: 0, aPM: 0, aLIRA: 0, aCRR: 0, aCTF: 0, aCNR: 0,
      taxInc: 49000, tax: 8000 },
  ],
  pD: [
    { age: 55, rp50: 100000, rp25: 90000, rp75: 110000, rp5: 80000, rp95: 130000 },
    { age: 65, rp50: 100000, rp25: 70000, rp75: 140000, rp5: 40000, rp95: 200000 },
    { age: 80, rp50: 0, rp25: 0, rp75: 30000, rp5: 0, rp95: 90000 },
    { age: 95, rp50: 0, rp25: 0, rp75: 0, rp5: 0, rp95: 50000 },
  ],
  medEstateNet: 0, medEstateTax: 0, p10EstateNet: 0,
};
const extra = {
  mcC60: { succ: 0.40 }, mcC65: { succ: 0.45 }, mcC70: { succ: 0.52 },
  mcStressCrash08: { succ: 0.30 }, mcStressStagflation: { succ: 0.28 }, mcStressProlonged: { succ: 0.25 },
};

console.log("\n========== BILAN 360 — RENDERED FILET + LEVER NOTES ==========\n");
const D360 = mod360.extractReportData360(mc, baseParams, "TRANSITION", extra);
const html360 = mod360.renderReportHTML360(D360, mc, baseParams, "fr", {}, "TRANSITION", "", extra);

const filetMatch360 = html360.match(/Filet[^<]+/);
console.log("FILET (360):");
console.log("  " + (filetMatch360 ? filetMatch360[0].slice(0, 250) : "(none)"));

const leverMatch360 = html360.match(/Lecture des leviers<\/h4><ul[^>]*>([\s\S]*?)<\/ul>/);
if (leverMatch360) {
  const items = [...leverMatch360[1].matchAll(/<li[^>]*>([^<]+)<\/li>/g)];
  console.log("\nLEVERS (360):");
  for (const m of items) console.log("  • " + m[1]);
}

console.log("\n\n========== PLANNER (Expert) — RENDERED FILET + LEVER NOTES ==========\n");
const sections = ["introduction", "sommaire_executif", "diagnostic_robustesse",
  "revenus_retraite", "stress_tests", "priorites_action", "observations_detaillees"];
const Dx = modExp.extractReportDataExpert(mc, baseParams);
const htmlX = modExp.renderReportHTMLExpert(Dx, mc, baseParams, {}, sections, "fr");

const filetX = htmlX.match(/Filet[^<]+/);
console.log("FILET (Expert):");
console.log("  " + (filetX ? filetX[0].slice(0, 250) : "(none — Dx.coveragePct=" + Dx.coveragePct + ", medRuin=" + Dx.medRuin + ")"));

const leverX = htmlX.match(/Lecture des leviers<\/div>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/);
if (leverX) {
  const items = [...leverX[1].matchAll(/<li[^>]*>([^<]+)<\/li>/g)];
  console.log("\nLEVERS (Expert):");
  for (const m of items) console.log("  • " + m[1]);
}

console.log("\n");
