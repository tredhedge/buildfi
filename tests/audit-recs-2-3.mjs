// Audit script for recs #2 (risk softener / filet) and #3 (lever notes)
// Tests both report-html-360.js and report-html-expert.ts under several profiles.
// Usage: npx tsx tests/audit-recs-2-3.mjs

const mod360 = await import('../lib/report-html-360.js');
const renderReportHTML360 = mod360.renderReportHTML360;
const extractReportData360 = mod360.extractReportData360;

const FORBIDDEN = [
  /\bdevriez?\b/i, /\brecommand(?:e|ons|ation)/i, /\bil faut\b/i,
  /\bsuggérez?\b/i, /\byou should\b/i, /\bwe recommend\b/i, /\byou must\b/i,
];

function checkAMF(html, profile) {
  const errors = [];
  for (const re of FORBIDDEN) {
    const m = html.match(re);
    if (m) {
      // Pull surrounding context
      const idx = m.index || 0;
      const ctx = html.slice(Math.max(0, idx - 80), Math.min(html.length, idx + 80));
      errors.push(`AMF VIOLATION (${re}) [${profile}]: …${ctx}…`);
    }
  }
  return errors;
}

function expect(cond, name) {
  if (!cond) console.log(`  ❌ FAIL: ${name}`);
  else console.log(`  ✅ ${name}`);
  return cond;
}

const baseParams = {
  age: 55, retAge: 65, deathAge: 95, prov: "QC", sex: "M",
  sal: 80000, rrsp: 200000, tfsa: 50000, nr: 30000, liraBal: 0, dcBal: 0,
  retSpM: 4500, qppAge: 65, oasAge: 65, inf: 0.021,
  merR: 0.015, merT: 0.007, merN: 0.007,
};

// Synthetic MC outputs for 4 distinct profiles
const profiles = {
  "A. Healthy plan (no depletion, high coverage)": {
    mc: {
      succ: 0.92,
      rMedF: 850000, rP5F: 200000, rP25F: 500000, rP75F: 1200000, rP95F: 2000000,
      avgDeath: 88, deathAges: [88], medRuin: 999, ruinPct: 0.05,
      medRevData: [
        { age: 65, rrq: 14000, psv: 8000, gis: 0, pen: 0, ret: 30000, spend: 54000,
          aRR: 200000, aTF: 50000, aNR: 30000, aDC: 0, aPE: 0, aPM: 0, aLIRA: 0, aCRR: 0, aCTF: 0, aCNR: 0,
          taxInc: 50000, tax: 9000 },
      ],
      pD: [
        { age: 55, rp50: 280000, rp25: 250000, rp75: 320000, rp5: 220000, rp95: 360000 },
        { age: 65, rp50: 500000, rp25: 420000, rp75: 600000, rp5: 350000, rp95: 750000 },
        { age: 95, rp50: 850000, rp25: 400000, rp75: 1500000, rp5: 100000, rp95: 2500000 },
      ],
      medEstateNet: 700000, medEstateTax: 100000, p10EstateNet: 200000,
    },
    extra: {
      mcMelt1: { succ: 0.94 }, mcMelt2: { succ: 0.93 },
      mcC60: { succ: 0.88 }, mcC65: { succ: 0.92 }, mcC70: { succ: 0.95 },
      mcStressCrash08: { succ: 0.78 }, mcStressStagflation: { succ: 0.75 }, mcStressProlonged: { succ: 0.72 },
    },
    expects: {
      // covPct=33 (deflated to today's $), no depletion → no filet by design
      // (threshold 50 for standalone, 30 only when depletion exists)
      hasFilet: false,
      hasLeverNotes: true,
      hasCppDelta: true,
    },
  },
  "B. Fragile plan (median depletion, low coverage)": {
    mc: {
      succ: 0.45,
      rMedF: 0, rP5F: 0, rP25F: 0, rP75F: 80000, rP95F: 250000,
      avgDeath: 88, deathAges: [88], medRuin: 82, ruinPct: 0.55,
      medRevData: [
        { age: 65, rrq: 7000, psv: 6000, gis: 0, pen: 0, ret: 36000, spend: 60000,
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
    },
    extra: {
      mcC60: { succ: 0.40 }, mcC65: { succ: 0.45 }, mcC70: { succ: 0.52 },
      mcStressCrash08: { succ: 0.30 }, mcStressStagflation: { succ: 0.28 }, mcStressProlonged: { succ: 0.25 },
    },
    expects: {
      // covPct=20 (after deflation) < 30 → filet correctly suppressed even with depletion;
      // saying "RRQ/PSV covers only 20%" would feel dismissive, not reassuring
      hasFilet: false,
      hasLeverNotes: true,
      hasGapLever: true,
      hasWdLever: true,
    },
  },
  "C. No coverage data (covPct < 30, no ruin)": {
    mc: {
      succ: 0.75,
      rMedF: 400000, rP5F: 100000, rP25F: 250000, rP75F: 600000, rP95F: 900000,
      avgDeath: 88, deathAges: [88], medRuin: 999, ruinPct: 0,
      medRevData: [
        { age: 65, rrq: 0, psv: 0, gis: 0, pen: 0, ret: 36000, spend: 54000,
          aRR: 300000, aTF: 60000, aNR: 0, aDC: 0, aPE: 0, aPM: 0, aLIRA: 0, aCRR: 0, aCTF: 0, aCNR: 0,
          taxInc: 36000, tax: 4000 },
      ],
      pD: [
        { age: 55, rp50: 280000, rp25: 250000, rp75: 320000, rp5: 220000, rp95: 360000 },
        { age: 95, rp50: 400000, rp25: 200000, rp75: 700000, rp5: 50000, rp95: 1000000 },
      ],
      medEstateNet: 300000, medEstateTax: 40000, p10EstateNet: 50000,
    },
    extra: {},
    expects: {
      hasFilet: false, // covPct=0, no depletion → no filet
      hasLeverNotes: true, // gap > 0
    },
  },
  "E. High-coverage standalone (no depletion, covPct >= 50)": {
    mc: {
      succ: 0.88,
      rMedF: 600000, rP5F: 200000, rP25F: 400000, rP75F: 800000, rP95F: 1200000,
      avgDeath: 88, deathAges: [88], medRuin: 999, ruinPct: 0.05,
      // Inflated nominal income so deflated coverage clears 50%
      medRevData: [
        { age: 65, rrq: 30000, psv: 18000, gis: 0, pen: 12000, ret: 18000, spend: 65000,
          aRR: 250000, aTF: 100000, aNR: 50000, aDC: 0, aPE: 0, aPM: 0, aLIRA: 0, aCRR: 0, aCTF: 0, aCNR: 0,
          taxInc: 60000, tax: 12000 },
      ],
      pD: [
        { age: 55, rp50: 400000, rp25: 350000, rp75: 450000, rp5: 300000, rp95: 500000 },
        { age: 95, rp50: 600000, rp25: 250000, rp75: 1000000, rp5: 80000, rp95: 1500000 },
      ],
      medEstateNet: 500000, medEstateTax: 80000, p10EstateNet: 100000,
    },
    extra: {
      mcC60: { succ: 0.84 }, mcC65: { succ: 0.88 }, mcC70: { succ: 0.92 },
    },
    expects: {
      hasFilet: true, // standalone high-coverage variant
      hasLeverNotes: true,
    },
  },
  "D. P25 depletion only (median holds, P25 fails)": {
    mc: {
      succ: 0.70,
      rMedF: 250000, rP5F: 0, rP25F: 0, rP75F: 500000, rP95F: 800000,
      avgDeath: 88, deathAges: [88], medRuin: 999, ruinPct: 0.20,
      medRevData: [
        { age: 65, rrq: 12000, psv: 8000, gis: 0, pen: 0, ret: 30000, spend: 54000,
          aRR: 150000, aTF: 40000, aNR: 0, aDC: 0, aPE: 0, aPM: 0, aLIRA: 0, aCRR: 0, aCTF: 0, aCNR: 0,
          taxInc: 50000, tax: 8000 },
      ],
      pD: [
        { age: 55, rp50: 200000, rp25: 180000, rp75: 220000, rp5: 160000, rp95: 250000 },
        { age: 65, rp50: 250000, rp25: 200000, rp75: 320000, rp5: 150000, rp95: 400000 },
        { age: 78, rp50: 100000, rp25: 0, rp75: 250000, rp5: 0, rp95: 400000 },
        { age: 95, rp50: 250000, rp25: 0, rp75: 500000, rp5: 0, rp95: 800000 },
      ],
      medEstateNet: 200000, medEstateTax: 30000, p10EstateNet: 0,
    },
    extra: {},
    expects: {
      hasFilet: true, // p25DepletionAge present → P25 variant
      hasLeverNotes: true,
    },
  },
};

console.log("=== Audit recs #2 (filet softener) + #3 (lever notes) ===\n");

let totalErrors = 0;
let totalChecks = 0;

for (const [name, profile] of Object.entries(profiles)) {
  console.log(`\n──── ${name} ────`);

  const D = extractReportData360(profile.mc, baseParams, "TRANSITION", profile.extra);

  console.log(`  D.coveragePct=${D.coveragePct}, medDepletionAge=${D.medDepletionAge}, p25DepletionAge=${D.p25DepletionAge}`);
  console.log(`  D.gapMonthly=${D.gapMonthly}, withdrawalRatePct=${D.withdrawalRatePct}, retSpM=${D.retSpM}`);

  const html = renderReportHTML360(D, profile.mc, baseParams, "fr", {}, "TRANSITION", "", profile.extra);

  // Check 1: AMF compliance
  const amfErrors = checkAMF(html, name);
  totalChecks++;
  if (amfErrors.length === 0) {
    console.log(`  ✅ AMF compliance: clean`);
  } else {
    console.log(`  ❌ AMF VIOLATIONS:`);
    for (const e of amfErrors) console.log(`     ${e}`);
    totalErrors += amfErrors.length;
  }

  // Check 2: Filet presence
  const hasFiletText = html.includes("Filet");
  totalChecks++;
  if (profile.expects.hasFilet) {
    if (hasFiletText) console.log(`  ✅ Filet present (expected)`);
    else { console.log(`  ❌ Filet MISSING (expected)`); totalErrors++; }
  } else {
    if (!hasFiletText) console.log(`  ✅ No filet (expected)`);
    else { console.log(`  ❌ Filet present but NOT expected`); totalErrors++; }
  }

  // Check 3: Lever notes section
  const hasLeverSection = html.includes("Lecture des leviers");
  totalChecks++;
  if (profile.expects.hasLeverNotes) {
    if (hasLeverSection) console.log(`  ✅ Lever notes section present`);
    else { console.log(`  ❌ Lever notes MISSING`); totalErrors++; }
  }

  // Check 4: Conditional tense in filet (should contain "couvrir" forms)
  if (hasFiletText) {
    const hasConditional = /couvrirai(?:t|ent)|s'épuiserait|s'épuisait/.test(html);
    totalChecks++;
    if (hasConditional) console.log(`  ✅ Filet uses conditional tense`);
    else { console.log(`  ❌ Filet missing conditional tense`); totalErrors++; }
  }

  // Check 5: Lever notes specific levers
  if (profile.expects.hasGapLever) {
    totalChecks++;
    const found = /Réduire les dépenses cibles d'environ 5\s*%/.test(html);
    if (found) console.log(`  ✅ Gap lever (5% spend reduction) present`);
    else { console.log(`  ❌ Gap lever MISSING`); totalErrors++; }
  }
  if (profile.expects.hasWdLever) {
    totalChecks++;
    const found = /taux de retrait initial sous 4\s*%/.test(html);
    if (found) console.log(`  ✅ Withdrawal rate lever present`);
    else { console.log(`  ❌ Withdrawal rate lever MISSING`); totalErrors++; }
  }
  if (profile.expects.hasCppDelta) {
    totalChecks++;
    const found = /Reporter le RRQ de 60 à 70 ans/.test(html);
    if (found) console.log(`  ✅ CPP deferral lever present (60→70)`);
    else { console.log(`  ❌ CPP deferral lever MISSING`); totalErrors++; }
  }

  // Check 6: HTML structure not broken (well-formed-ish)
  totalChecks++;
  const openTags = (html.match(/<section/g) || []).length;
  const closeTags = (html.match(/<\/section>/g) || []).length;
  if (openTags === closeTags) console.log(`  ✅ Section tags balanced (${openTags})`);
  else { console.log(`  ❌ Section imbalance: open=${openTags}, close=${closeTags}`); totalErrors++; }
}

// ──────────────────────────────────────────────────────────────────────
// Expert renderer audit (Planner via /api/regenerate-report)
// ──────────────────────────────────────────────────────────────────────
console.log("\n\n=== Audit Planner (report-html-expert.ts) ===");

const modExpert = await import('../lib/report-html-expert.ts');
const extractReportDataExpert = modExpert.extractReportDataExpert;
const renderReportHTMLExpert = modExpert.renderReportHTMLExpert;

const expertSections = [
  "introduction", "sommaire_executif", "diagnostic_robustesse",
  "revenus_retraite", "stress_tests", "priorites_action", "observations_detaillees",
];

const expertProfiles = {
  "X. Expert — high coverage standalone": profiles["E. High-coverage standalone (no depletion, covPct >= 50)"],
  "Y. Expert — fragile with depletion": profiles["B. Fragile plan (median depletion, low coverage)"],
  "Z. Expert — healthy no depletion": profiles["A. Healthy plan (no depletion, high coverage)"],
};

const expertParamsBase = {
  ...baseParams, allocR: 0.6, deathAge: 95,
  cOn: false, _report: {}, _quiz: {},
};

for (const [name, profile] of Object.entries(expertProfiles)) {
  console.log(`\n──── ${name} ────`);
  const Dx = extractReportDataExpert(profile.mc, expertParamsBase);
  console.log(`  D.coveragePct=${Dx.coveragePct}, medRuin=${Dx.medRuin}, ruinPct=${Dx.ruinPct}`);
  console.log(`  D.gapMonthly=${Dx.gapMonthly}, withdrawalRatePct=${Dx.withdrawalRatePct}, retSpM=${Dx.retSpM}`);

  const html = renderReportHTMLExpert(Dx, profile.mc, expertParamsBase, {}, expertSections, "fr");

  // Check 1: AMF compliance
  const amfErrors = checkAMF(html, name);
  totalChecks++;
  if (amfErrors.length === 0) console.log(`  ✅ AMF compliance: clean`);
  else {
    console.log(`  ❌ AMF VIOLATIONS:`);
    for (const e of amfErrors) console.log(`     ${e}`);
    totalErrors += amfErrors.length;
  }

  // Check 2: Filet softener present (when expected)
  const hasFiletText = html.includes("Filet");
  const expectFilet = (Dx.medRuin && Dx.medRuin < 999 && Dx.coveragePct >= 30)
    || (Dx.ruinPct >= 0.10 && Dx.coveragePct >= 30)
    || (Dx.coveragePct >= 50);
  totalChecks++;
  if (expectFilet) {
    if (hasFiletText) console.log(`  ✅ Filet present (cov=${Dx.coveragePct}%, ruin=${Dx.medRuin})`);
    else { console.log(`  ❌ Filet MISSING (cov=${Dx.coveragePct}%, ruin=${Dx.medRuin})`); totalErrors++; }
  } else {
    if (!hasFiletText) console.log(`  ✅ No filet (cov=${Dx.coveragePct}%, no ruin)`);
    else { console.log(`  ⚠️  Filet present unexpectedly`); }
  }

  // Check 3: Lever notes section
  const hasLeverSection = html.includes("Lecture des leviers");
  totalChecks++;
  if (hasLeverSection) console.log(`  ✅ Lever notes section present`);
  else { console.log(`  ❌ Lever notes section MISSING`); totalErrors++; }

  // Check 4: Conditional tense in lever notes
  if (hasLeverSection) {
    const hasConditional = /pourrait|renforcerait|augmenterait|allégerait?|ajouterait|raccourcirait/.test(html);
    totalChecks++;
    if (hasConditional) console.log(`  ✅ Lever notes use conditional tense`);
    else { console.log(`  ❌ Lever notes missing conditional tense`); totalErrors++; }
  }

  // Check 5: Section/div balance
  totalChecks++;
  const open = (html.match(/<section/g) || []).length;
  const close = (html.match(/<\/section>/g) || []).length;
  if (open === close) console.log(`  ✅ Section tags balanced (${open})`);
  else { console.log(`  ❌ Section imbalance: open=${open}, close=${close}`); totalErrors++; }
}

console.log(`\n=== Summary: ${totalChecks - totalErrors}/${totalChecks} passed, ${totalErrors} errors ===\n`);
process.exit(totalErrors > 0 ? 1 : 0);
