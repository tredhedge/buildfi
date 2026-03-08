// tests/report-decum-calculations.test.ts
// Décaissement report renderer + translator + AI sanitization tests
// Run: npx tsx tests/report-decum-calculations.test.ts
//
// Covers:
//   1. extractReportDataDecum — field extraction from MC results
//   2. renderReportDecum — HTML output validation
//   3. translateDecumToMC — quiz → MC parameter translation
//   4. sanitizeAISlotsDecum — AI slot sanitization + AMF compliance

import { extractReportDataDecum, renderReportDecum } from "../lib/report-html-decum";
import { translateDecumToMC } from "../lib/quiz-translator-decum";
import { sanitizeAISlotsDecum, AI_SLOTS_DECUM } from "../lib/ai-constants";

let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(label: string, ok: boolean) {
  if (ok) {
    pass++;
  } else {
    console.error(`  FAIL ${label}`);
    failures.push(label);
    fail++;
  }
}

// ── Mock factories ──────────────────────────────────────────────

function mockMC(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    succ: 0.82,
    rMedF: 245000,
    rP5F: 12000,
    rP10F: 28000,
    rP25F: 95000,
    rP75F: 420000,
    rP90F: 680000,
    rP95F: 750000,
    medF: 310000,
    avgDeath: 85,
    medDeath: 86,
    medRuin: 92,
    gkCutFreq: 0.15,
    gkAvgCut: 0.08,
    medRevData: [
      { age: 65, rrq: 16000, psv: 8700, pen: 12000, ret: 25000, tax: 8200 },
      { age: 70, rrq: 16500, psv: 8900, pen: 12400, ret: 20000, tax: 7800 },
      { age: 75, rrq: 17000, psv: 9100, pen: 12800, ret: 15000, tax: 6500 },
      { age: 80, rrq: 17500, psv: 9300, pen: 13200, ret: 10000, tax: 5200 },
      { age: 85, rrq: 18000, psv: 9500, pen: 13600, ret: 5000, tax: 3800 },
      { age: 90, rrq: 18500, psv: 9700, pen: 14000, ret: 2000, tax: 2500 },
      { age: 95, rrq: 19000, psv: 9900, pen: 14400, ret: 0, tax: 1500 },
      { age: 100, rrq: 19500, psv: 10100, pen: 14800, ret: 0, tax: 1000 },
      { age: 105, rrq: 20000, psv: 10300, pen: 15200, ret: 0, tax: 800 },
    ],
    pD: [
      { age: 65, rp10: 480000, rp25: 490000, rp50: 500000, rp75: 510000, rp90: 520000 },
      { age: 70, rp10: 380000, rp25: 400000, rp50: 430000, rp75: 460000, rp90: 490000 },
      { age: 75, rp10: 280000, rp25: 310000, rp50: 360000, rp75: 410000, rp90: 460000 },
      { age: 80, rp10: 180000, rp25: 220000, rp50: 290000, rp75: 360000, rp90: 430000 },
      { age: 85, rp10: 80000, rp25: 130000, rp50: 220000, rp75: 310000, rp90: 400000 },
      { age: 90, rp10: 20000, rp25: 60000, rp50: 150000, rp75: 260000, rp90: 370000 },
      { age: 95, rp10: 0, rp25: 15000, rp50: 80000, rp75: 200000, rp90: 330000 },
      { age: 100, rp10: 0, rp25: 0, rp50: 30000, rp75: 140000, rp90: 280000 },
      { age: 105, rp10: 0, rp25: 0, rp50: 5000, rp75: 80000, rp90: 220000 },
    ],
    fins: new Array(5000).fill(0).map((_, i) => i * 100),
    ...overrides,
  };
}

function baseQuiz(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    age: 65,
    sex: "M",
    prov: "QC",
    couple: "no",
    retirementStatus: "retired",
    rrspBal: 300000,
    tfsaBal: 100000,
    nrBal: 50000,
    retIncome: 60000,
    spendingFlex: "moderate",
    meltdownPref: true,
    estatePref: "balanced",
    allocR: 0.60,
    eqRet: 5.0,
    inf: 2.1,
    confidence: 3,
    ...overrides,
  };
}

function baseParams(overrides: Record<string, any> = {}): Record<string, any> {
  return translateDecumToMC(baseQuiz(overrides));
}

function baseExtraRuns(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    mcMelt1: { succ: 0.90 },
    mcMelt2: { succ: 0.95 },
    mcC60: { succ: 0.78 },
    mcC65: { succ: 0.82 },
    mcC70: { succ: 0.88 },
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════
// 1. extractReportDataDecum
// ══════════════════════════════════════════════════════════════════
console.log("\n=== 1. extractReportDataDecum ===");

// 1a: Core fields
console.log("  1a: Core fields");
{
  const params = baseParams();
  const mc = mockMC();
  const D = extractReportDataDecum(mc, params, {});

  check("successPct = 82 (0.82 * 100 rounded)", D.successPct === 82);
  check("grade = B+ (75 <= 82 < 85)", D.grade === "B+");
  check("medWealth uses rMedF", D.medWealth === 245000);
  check("p10Wealth uses rP5F first", D.p10Wealth === 12000);
  check("p90Wealth uses rP90F", D.p90Wealth === 680000);
  check("p75Wealth uses rP75F", D.p75Wealth === 420000);
  check("p25Wealth uses rP25F", D.p25Wealth === 95000);
  check("age = 65", D.age === 65);
  check("sex = M", D.sex === "M");
  check("prov = QC", D.prov === "QC");
  check("isQC = true", D.isQC === true);
  check("deathAge = 105", D.deathAge === 105);
}

// 1b: Grade thresholds
console.log("  1b: Grade thresholds");
{
  const params = baseParams();
  const cases: [number, string][] = [
    [0.96, "A+"],
    [0.95, "A+"],
    [0.85, "A"],
    [0.75, "B+"],
    [0.65, "B"],
    [0.55, "C+"],
    [0.45, "C"],
    [0.35, "D"],
    [0.20, "F"],
    [0.00, "F"],
  ];
  for (const [succ, expected] of cases) {
    const mc = mockMC({ succ });
    const D = extractReportDataDecum(mc, params, {});
    check(`succ=${succ} → grade=${expected}`, D.grade === expected);
  }
}

// 1c: initialRate calculation
console.log("  1c: initialRate calculation");
{
  const params = baseParams();
  const mc = mockMC();
  const D = extractReportDataDecum(mc, params, {});

  // initialWithdrawal = max(0, retIncome - govMonthly * 12)
  // initialRate = initialWithdrawal / retBal * 100 rounded to 1 decimal
  check("initialRate is a number >= 0", typeof D.initialRate === "number" && D.initialRate >= 0);
  check("initialWithdrawal >= 0", D.initialWithdrawal >= 0);

  // Verify initialRate = initialWithdrawal / retBal * 100 (1 decimal)
  if (D.retBal > 0) {
    const expectedRate = Math.round(D.initialWithdrawal / D.retBal * 1000) / 10;
    check("initialRate formula correct", D.initialRate === expectedRate);
  }
}

// 1d: Couple fields
console.log("  1d: Couple fields");
{
  const params = baseParams({
    couple: "yes",
    cAge: 62,
    cSex: "F",
    cRrspBal: 200000,
    cTfsaBal: 50000,
    cNrBal: 25000,
    cHasPension: true,
    cPenMonthly: 1500,
    cPenIndexed: "yes",
  });
  const mc = mockMC();
  const D = extractReportDataDecum(mc, params, {});

  check("couple = true when cOn", D.couple === true);
  check("cAge = 62", D.cAge === 62);
  check("cSex = F", D.cSex === "F");
  check("cPenMonthly populated", D.cPenMonthly === 1500);
  check("totalWealth includes couple savings", D.totalWealth >= 300000 + 100000 + 50000 + 200000 + 50000 + 25000);
}

// 1e: Meltdown data from extra runs
console.log("  1e: Meltdown data from extra runs");
{
  const params = baseParams();
  const mc = mockMC();
  const extra = baseExtraRuns();
  const D = extractReportDataDecum(mc, params, extra);

  check("melt1Succ = 90", D.melt1Succ === 90);
  check("melt2Succ = 95", D.melt2Succ === 95);
  check("meltTarget = 58523", D.meltTarget === 58523);
  check("meltIsBase is boolean", typeof D.meltIsBase === "boolean");
}

// 1f: Meltdown null when no extra runs
console.log("  1f: Meltdown null when no extra runs");
{
  const params = baseParams();
  const mc = mockMC();
  const D = extractReportDataDecum(mc, params, {});

  check("melt1Succ = null when no mcMelt1", D.melt1Succ === null);
  check("melt2Succ = null when no mcMelt2", D.melt2Succ === null);
}

// 1g: CPP timing data from extra runs
console.log("  1g: CPP timing data");
{
  const params = baseParams();
  const mc = mockMC();
  const extra = baseExtraRuns();
  const D = extractReportDataDecum(mc, params, extra);

  check("mc60Succ = 78", D.mc60Succ === 78);
  check("mc65Succ = 82", D.mc65Succ === 82);
  check("mc70Succ = 88", D.mc70Succ === 88);
}

// 1h: GK fields
console.log("  1h: GK fields");
{
  const params = baseParams();
  const mc = mockMC();
  const D = extractReportDataDecum(mc, params, {});

  check("gkActive = true (moderate flex)", D.gkActive === true);
  check("gkCutFreq from MC", D.gkCutFreq === 0.15);
  check("gkAvgCut from MC", D.gkAvgCut === 0.08);
  check("gkMaxCut = 0.20 (moderate)", D.gkMaxCut === 0.20);
}

// 1i: GK inactive with rigid spending
console.log("  1i: GK inactive with rigid spending");
{
  const params = baseParams({ spendingFlex: "rigid" });
  const mc = mockMC();
  const D = extractReportDataDecum(mc, params, {});

  check("gkActive = false (rigid)", D.gkActive === false);
}

// 1j: Glide path
console.log("  1j: Glide path");
{
  const params = baseParams();
  const mc = mockMC();
  const D = extractReportDataDecum(mc, params, {});

  check("allocR = 0.60", D.allocR === 0.60);
  check("glideSpd = 0.01", D.glideSpd === 0.01);
  // endAllocR = max(0.20, 0.60 - 0.01 * (105 - 65)) = max(0.20, 0.20) = 0.20
  check("endAllocR computed correctly", D.endAllocR === 0.20);
}

// 1k: Ruin stats
console.log("  1k: Ruin stats");
{
  const params = baseParams();
  const mc = mockMC();
  const D = extractReportDataDecum(mc, params, {});

  check("ruinPct = 18 (100 - 82)", D.ruinPct === 18);
  check("medRuin = 92", D.medRuin === 92);
}

// 1l: Spending smile
console.log("  1l: Spending smile");
{
  const params = baseParams();
  const mc = mockMC();
  const D = extractReportDataDecum(mc, params, {});

  check("goP = 1.05", D.goP === 1.05);
  check("slP = 0.88", D.slP === 0.88);
  check("noP = 0.75", D.noP === 0.75);
  check("smileSlAge = 75", D.smileSlAge === 75);
  check("smileNoAge = 85", D.smileNoAge === 85);
}

// 1m: Projection table populated
console.log("  1m: Projection table");
{
  const params = baseParams();
  const mc = mockMC();
  const D = extractReportDataDecum(mc, params, {});

  check("projTable is array", Array.isArray(D.projTable));
  check("projTable has entries", D.projTable.length > 0);
  check("projTable first entry has age", D.projTable[0].age !== undefined);
  check("projTable first entry has income", D.projTable[0].income !== undefined);
  check("projTable first entry has tax", D.projTable[0].tax !== undefined);
  check("projTable first entry has p50", D.projTable[0].p50 !== undefined);
}

// ══════════════════════════════════════════════════════════════════
// 2. renderReportDecum — HTML output
// ══════════════════════════════════════════════════════════════════
console.log("\n=== 2. renderReportDecum ===");

// 2a: Section headers present (FR)
console.log("  2a: Section headers (FR)");
{
  const params = baseParams();
  const mc = mockMC();
  const D = extractReportDataDecum(mc, params, baseExtraRuns());
  const html = renderReportDecum(D, mc, params, "fr", {}, "tok123", baseExtraRuns());

  check("Section 1: Tableau de bord global", html.includes("Tableau de bord global"));
  check("Section 2: Mes revenus garantis", html.includes("Mes revenus garantis"));
  check("Section 3: Durabilit\u00e9 du portefeuille", html.includes("Durabilit\u00e9 du portefeuille"));
  check("Section 4: Strat\u00e9gie de d\u00e9caissement", html.includes("Strat\u00e9gie de d\u00e9caissement"));
  check("Section 5: Efficacit\u00e9 fiscale", html.includes("Efficacit\u00e9 fiscale"));
  check("Section 7: Analyse de robustesse", html.includes("Analyse de robustesse"));
  check("Section 8: R\u00e9partition d\u2019actifs", html.includes("partition d"));
  check("Section 9: Profil de d\u00e9penses", html.includes("Profil de d\u00e9penses"));
  check("Section 10: Distribution de long\u00e9vit\u00e9", html.includes("Distribution de long\u00e9vit\u00e9"));
  check("Section 11: Portrait successoral", html.includes("Portrait successoral"));
  check("Section 13: Hypoth\u00e8ses", html.includes("Hypoth\u00e8ses et m\u00e9thodologie"));
}

// 2b: Section headers present (EN)
console.log("  2b: Section headers (EN)");
{
  const params = baseParams();
  const mc = mockMC();
  const D = extractReportDataDecum(mc, params, baseExtraRuns());
  const html = renderReportDecum(D, mc, params, "en", {}, "tok123", baseExtraRuns());

  check("EN: Global Dashboard", html.includes("Global Dashboard"));
  check("EN: My Guaranteed Income", html.includes("My Guaranteed Income"));
  check("EN: Portfolio Sustainability", html.includes("Portfolio Sustainability"));
  check("EN: Drawdown Strategy", html.includes("Drawdown Strategy"));
  check("EN: Tax Efficiency of Drawdown", html.includes("Tax Efficiency of Drawdown"));
  check("EN: Robustness Analysis", html.includes("Robustness Analysis"));
  check("EN: Asset Allocation", html.includes("Asset Allocation"));
  check("EN: Spending Profile", html.includes("Spending Profile"));
  check("EN: Longevity Distribution", html.includes("Longevity Distribution"));
  check("EN: Estate Overview", html.includes("Estate Overview"));
  check("EN: Assumptions & Methodology", html.includes("Assumptions &amp; Methodology") || html.includes("Assumptions & Methodology"));
}

// 2c: Title — EN uses "Retirement Drawdown Assessment" not "Decumulation Assessment"
console.log("  2c: Report title");
{
  const params = baseParams();
  const mc = mockMC();
  const D = extractReportDataDecum(mc, params, {});
  const htmlEn = renderReportDecum(D, mc, params, "en", {}, "tok123", {});
  const htmlFr = renderReportDecum(D, mc, params, "fr", {}, "tok123", {});

  check("EN title = Retirement Drawdown Assessment", htmlEn.includes("Retirement Drawdown Assessment"));
  check("EN title does NOT say Decumulation Assessment", !htmlEn.includes("Decumulation Assessment"));
  check("FR title = Bilan D\u00e9caissement", htmlFr.includes("Bilan D\u00e9caissement"));
}

// 2d: OAS threshold = 95323
console.log("  2d: OAS threshold");
{
  const params = baseParams();
  const mc = mockMC();
  const D = extractReportDataDecum(mc, params, {});
  const html = renderReportDecum(D, mc, params, "fr", {}, "tok123", {});

  check("OAS threshold 95 323 present in FR", html.includes("95\u00a0323") || html.includes("95 323") || html.includes("95,323") || html.includes("95323"));
  check("Old OAS threshold 90 997 NOT present", !html.includes("90997") && !html.includes("90 997") && !html.includes("90\u00a0997"));
}

// 2e: RRIF percentages present when RRSP > 50% of total
console.log("  2e: RRIF percentages");
{
  // RRSP = 300k out of 450k total = 66.7% > 50%
  const params = baseParams();
  const mc = mockMC();
  const D = extractReportDataDecum(mc, params, {});
  const html = renderReportDecum(D, mc, params, "fr", {}, "tok123", {});

  check("RRIF 5.28% at 72 present", html.includes("5,28") || html.includes("5.28"));
  check("RRIF 6.82% at 80 present", html.includes("6,82") || html.includes("6.82"));
  check("RRIF 8.51% at 85 present", html.includes("8,51") || html.includes("8.51"));
  check("RRIF 16.34% at 93 present", html.includes("16,34") || html.includes("16.34"));
}

// 2f: AI slots rendered when provided
console.log("  2f: AI slots rendered");
{
  const params = baseParams();
  const mc = mockMC();
  const D = extractReportDataDecum(mc, params, {});
  const aiSlots = {
    snapshot_intro: "This is a custom AI snapshot intro for testing.",
    longevity_context: "Longevity analysis based on CPM-2023.",
  };
  const html = renderReportDecum(D, mc, params, "en", aiSlots, "tok123", {});

  check("AI snapshot_intro rendered", html.includes("This is a custom AI snapshot intro for testing."));
  check("AI longevity_context rendered", html.includes("Longevity analysis based on CPM-2023."));
  check("AI narration CSS class present", html.includes("ai-narration"));
}

// 2g: Static fallbacks when AI is empty
console.log("  2g: Static fallbacks when AI empty");
{
  const params = baseParams();
  const mc = mockMC();
  const D = extractReportDataDecum(mc, params, {});
  const html = renderReportDecum(D, mc, params, "en", {}, "tok123", {});

  // Static fallback for snapshot_intro should mention number of scenarios
  check("Static fallback mentions scenarios count", html.includes("scenarios") || html.includes("sc\u00e9narios"));
  // Report should still render without AI
  check("Report renders without AI (has DOCTYPE)", html.includes("<!DOCTYPE html>"));
  check("Report renders without AI (has grade)", html.includes(D.grade));
}

// 2h: Withdrawal order NR → RRSP → TFSA
console.log("  2h: Withdrawal order");
{
  const paramsQC = baseParams();
  const mc = mockMC();
  const D = extractReportDataDecum(mc, paramsQC, {});
  const html = renderReportDecum(D, mc, paramsQC, "fr", {}, "tok123", {});

  // Check that Non enregistr\u00e9 appears before REER, and REER before CELI
  const nrPos = html.indexOf("Non enregistr");
  const reerPos = html.indexOf("REER");
  const celiPos = html.indexOf("CELI") > -1 ? html.indexOf("CELI") : html.indexOf("C\u00c9LI");
  check("NR appears before REER in withdrawal order", nrPos > 0 && reerPos > nrPos);
  check("REER appears before CELI in withdrawal order", reerPos > 0 && celiPos > reerPos);
}

// 2i: QC vs non-QC terminology
console.log("  2i: QC vs non-QC terminology");
{
  const mc = mockMC();

  // QC
  const paramsQC = baseParams({ prov: "QC" });
  const DQC = extractReportDataDecum(mc, paramsQC, {});
  const htmlQC = renderReportDecum(DQC, mc, paramsQC, "fr", {}, "tok123", {});
  check("QC FR uses C\u00c9LI", htmlQC.includes("C\u00c9LI"));
  check("QC FR uses REER", htmlQC.includes("REER"));
  check("QC FR uses RRQ", htmlQC.includes("RRQ"));

  // Ontario
  const paramsON = baseParams({ prov: "ON" });
  const DON = extractReportDataDecum(mc, paramsON, {});
  const htmlON = renderReportDecum(DON, mc, paramsON, "en", {}, "tok123", {});
  check("ON EN uses TFSA", htmlON.includes("TFSA"));
  check("ON EN uses RRSP", htmlON.includes("RRSP"));
  check("ON EN uses CPP", htmlON.includes("CPP"));
}

// 2j: Grade badge color
console.log("  2j: Grade badge color");
{
  const params = baseParams();

  // A+ grade (succ=0.96)
  const mcA = mockMC({ succ: 0.96 });
  const DA = extractReportDataDecum(mcA, params, {});
  const htmlA = renderReportDecum(DA, mcA, params, "en", {}, "tok123", {});
  check("A+ grade uses green (#2A8C46)", htmlA.includes("#2A8C46"));

  // C grade (succ=0.48)
  const mcC = mockMC({ succ: 0.48 });
  const DC = extractReportDataDecum(mcC, params, {});
  const htmlC = renderReportDecum(DC, mcC, params, "en", {}, "tok123", {});
  check("C grade uses orange (#E0882A)", htmlC.includes("#E0882A"));

  // F grade (succ=0.20)
  const mcF = mockMC({ succ: 0.20 });
  const DF = extractReportDataDecum(mcF, params, {});
  const htmlF = renderReportDecum(DF, mcF, params, "en", {}, "tok123", {});
  check("F grade uses red (#CC4444)", htmlF.includes("#CC4444"));
}

// 2k: obs_2 in observations section (section 12), NOT allocation section (section 8)
console.log("  2k: obs_2 placement");
{
  const params = baseParams();
  const mc = mockMC();
  const D = extractReportDataDecum(mc, params, {});
  const ai = {
    obs_1: "Observation one about withdrawal rate.",
    obs_2: "Observation two about portfolio allocation.",
    obs_3: "Observation three about longevity.",
  };
  const html = renderReportDecum(D, mc, params, "en", ai, "tok123", {});

  // obs_2 should appear in "Additional Observations" section, not "Asset Allocation" section
  const obsSection = html.indexOf("Additional Observations");
  const allocSection = html.indexOf("Asset Allocation");
  const obs2Pos = html.indexOf("Observation two about portfolio allocation.");

  check("obs_2 appears in HTML", obs2Pos > 0);
  check("Observations section exists", obsSection > 0);
  check("obs_2 appears after Observations header", obs2Pos > obsSection);
  check("obs_2 does NOT appear in allocation section (appears after it)", obs2Pos > allocSection);
}

// 2l: Couple section rendered when cOn=true
console.log("  2l: Couple section");
{
  const params = baseParams({
    couple: "yes",
    cAge: 62,
    cSex: "F",
    cRrspBal: 150000,
    cTfsaBal: 50000,
    cNrBal: 20000,
    cHasPension: true,
    cPenMonthly: 1200,
  });
  const mc = mockMC();
  const D = extractReportDataDecum(mc, params, {});
  const html = renderReportDecum(D, mc, params, "fr", {}, "tok123", {});

  check("Partner pension shown when couple", html.includes("Pension conjoint"));
  check("Pension splitting shown for couple", html.includes("Fractionnement") || html.includes("splitting"));
}

// 2m: Error page when MC data missing
console.log("  2m: Error handling");
{
  const params = baseParams();
  const mc = mockMC();
  const htmlErr = renderReportDecum(null, mc, params, "fr", {}, "tok123", {});
  check("Null D → error page", htmlErr.includes("Error") || htmlErr.includes("incomplètes"));

  const htmlErr2 = renderReportDecum({ successPct: undefined, pD: [] }, mc, params, "en", {}, "tok123", {});
  check("Empty pD → error page", htmlErr2.includes("Error") || htmlErr2.includes("incomplete"));
}

// ══════════════════════════════════════════════════════════════════
// 3. translateDecumToMC
// ══════════════════════════════════════════════════════════════════
console.log("\n=== 3. translateDecumToMC ===");

// 3a: Basic parameters
console.log("  3a: Basic params");
{
  const p = translateDecumToMC(baseQuiz());

  check("age = 65", p.age === 65);
  check("retAge = 65 (retired)", p.retAge === 65);
  check("sex = M", p.sex === "M");
  check("prov = QC", p.prov === "QC");
  check("sal = 0 (decumulation)", p.sal === 0);
  check("deathAge = 105", p.deathAge === 105);
  check("fatT = true", p.fatT === true);
  check("stochMort = true", p.stochMort === true);
  check("glide = true", p.glide === true);
  check("glideSpd = 0.01", p.glideSpd === 0.01);
  check("wStrat = optimal", p.wStrat === "optimal");
  check("monthlyContrib = 0", p.rrspC === 0 && p.tfsaC === 0 && p.nrC === 0);
}

// 3b: costBase = 50% of NR
console.log("  3b: costBase");
{
  const p = translateDecumToMC(baseQuiz({ nrBal: 100000 }));
  check("costBase = 50000 (50% of 100k NR)", p.costBase === 50000);
}

// 3c: allocR clamped [0.30, 0.75]
console.log("  3c: allocR clamping");
{
  const p1 = translateDecumToMC(baseQuiz({ allocR: 0.90 }));
  check("allocR 0.90 clamped to 0.75", p1.allocR <= 0.75);

  const p2 = translateDecumToMC(baseQuiz({ allocR: 0.20 }));
  check("allocR 0.20 clamped to 0.30", p2.allocR >= 0.30);

  const p3 = translateDecumToMC(baseQuiz({ allocR: 0.60 }));
  check("allocR 0.60 stays at 0.60 (balanced)", p3.allocR === 0.60);
}

// 3d: GK params — rigid
console.log("  3d: GK rigid");
{
  const p = translateDecumToMC(baseQuiz({ spendingFlex: "rigid" }));
  check("rigid → gkOn = false", p.gkOn === false);
}

// 3e: GK params — moderate
console.log("  3e: GK moderate");
{
  const p = translateDecumToMC(baseQuiz({ spendingFlex: "moderate" }));
  check("moderate → gkOn = true", p.gkOn === true);
  check("moderate → gkMaxCut = 0.20", p.gkMaxCut === 0.20);
}

// 3f: GK params — flexible
console.log("  3f: GK flexible");
{
  const p = translateDecumToMC(baseQuiz({ spendingFlex: "flexible" }));
  check("flexible → gkOn = true", p.gkOn === true);
  check("flexible → gkMaxCut = 0.25", p.gkMaxCut === 0.25);
}

// 3g: Couple with DB pension → cPenM set
console.log("  3g: Couple DB pension");
{
  const p = translateDecumToMC(baseQuiz({
    couple: "yes",
    cAge: 63,
    cSex: "F",
    cRrspBal: 100000,
    cTfsaBal: 40000,
    cNrBal: 10000,
    cHasPension: true,
    cPenMonthly: 1800,
    cPenIndexed: "partial",
  }));

  check("cOn = true", p.cOn === true);
  check("cPenType = db", p.cPenType === "db");
  check("cPenM = 1800", p.cPenM === 1800);
  check("cPenIdx = 1 (partial)", p.cPenIdx === 1);
  check("cRRSP = 100000", p.cRRSP === 100000);
  check("cTFSA = 40000", p.cTFSA === 40000);
  check("_report.cPenMonthly = 1800", p._report?.cPenMonthly === 1800);
}

// 3h: Retirement status within_1yr
console.log("  3h: Retirement status");
{
  const p1 = translateDecumToMC(baseQuiz({ retirementStatus: "within_1yr" }));
  check("within_1yr → retAge = age + 1", p1.retAge === 66);

  const p2 = translateDecumToMC(baseQuiz({ retirementStatus: "within_2yr" }));
  check("within_2yr → retAge = age + 2", p2.retAge === 67);

  const p3 = translateDecumToMC(baseQuiz({ retirementStatus: "retired" }));
  check("retired → retAge = age", p3.retAge === 65);
}

// 3i: Estate preference adjusts allocR
console.log("  3i: Estate preference");
{
  const pMax = translateDecumToMC(baseQuiz({ allocR: 0.60, estatePref: "maximize" }));
  check("maximize → allocR reduced by 0.10", pMax.allocR === 0.50);

  const pSpend = translateDecumToMC(baseQuiz({ allocR: 0.60, estatePref: "spenddown" }));
  check("spenddown → allocR increased by 0.05", pSpend.allocR === 0.65);

  const pBal = translateDecumToMC(baseQuiz({ allocR: 0.60, estatePref: "balanced" }));
  check("balanced → allocR unchanged", pBal.allocR === 0.60);
}

// 3j: Spending smile mandatory params
console.log("  3j: Spending smile");
{
  const p = translateDecumToMC(baseQuiz());
  check("goP = 1.05", p.goP === 1.05);
  check("slP = 0.88", p.slP === 0.88);
  check("noP = 0.75", p.noP === 0.75);
  check("smileSlAge = 75", p.smileSlAge === 75);
  check("smileNoAge = 85", p.smileNoAge === 85);
}

// 3k: _quiz passthrough
console.log("  3k: _quiz passthrough");
{
  const p = translateDecumToMC(baseQuiz());
  check("_quiz.spendingFlex = moderate", p._quiz?.spendingFlex === "moderate");
  check("_quiz.estatePref = balanced", p._quiz?.estatePref === "balanced");
  check("_quiz.retirementStatus = retired", p._quiz?.retirementStatus === "retired");
  check("_quiz.confidence = 3", p._quiz?.confidence === 3);
}

// 3l: _report passthrough
console.log("  3l: _report passthrough");
{
  const p = translateDecumToMC(baseQuiz());
  check("_report.rrsp = 300000", p._report?.rrsp === 300000);
  check("_report.tfsa = 100000", p._report?.tfsa === 100000);
  check("_report.nr = 50000", p._report?.nr === 50000);
  check("_report.totalLiquidSavings = 450000", p._report?.totalLiquidSavings === 450000);
  check("_report.retIncome = 60000", p._report?.retIncome === 60000);
  check("_report.gkActive = true", p._report?.gkActive === true);
}

// 3m: QPP/OAS already claiming
console.log("  3m: QPP/OAS already claiming");
{
  const p = translateDecumToMC(baseQuiz({ qppAlreadyClaiming: true, qppMonthly: 900, oasAlreadyClaiming: true, oasMonthly: 650 }));
  check("qppAge = age when already claiming", p.qppAge === 65);
  check("oasAge = age when already claiming", p.oasAge === 65);
  check("_quiz.qppAlreadyClaiming = true", p._quiz?.qppAlreadyClaiming === true);
  check("_quiz.oasAlreadyClaiming = true", p._quiz?.oasAlreadyClaiming === true);
}

// 3n: Meltdown params
console.log("  3n: Meltdown params");
{
  const p1 = translateDecumToMC(baseQuiz({ meltdownPref: true }));
  check("meltdownPref true → melt = true", p1.melt === true);

  const p2 = translateDecumToMC(baseQuiz({ meltdownPref: false }));
  check("meltdownPref false → melt = false", p2.melt === false);

  const p3 = translateDecumToMC(baseQuiz({ meltdownPref: null }));
  check("meltdownPref null → melt = true (default)", p3.melt === true);

  check("meltTgt = 58523", p1.meltTgt === 58523);
}

// 3o: Home property modeled
console.log("  3o: Home property");
{
  const p = translateDecumToMC(baseQuiz({ homeValue: 500000, homeMortgage: 100000 }));
  check("props array has 1 entry", p.props?.length === 1);
  check("props[0].val = 500000", p.props?.[0]?.val === 500000);
  check("props[0].mb = 100000", p.props?.[0]?.mb === 100000);
  check("props[0].pri = true", p.props?.[0]?.pri === true);
  check("_report.homeEquity = 400000", p._report?.homeEquity === 400000);
}

// ══════════════════════════════════════════════════════════════════
// 4. sanitizeAISlotsDecum
// ══════════════════════════════════════════════════════════════════
console.log("\n=== 4. sanitizeAISlotsDecum ===");

// 4a: Only recognized keys pass through
console.log("  4a: Recognized keys only");
{
  const raw = {
    snapshot_intro: "Valid intro text.",
    longevity_context: "Valid longevity text.",
    bogus_key: "This should not appear.",
    another_bad: "Neither should this.",
  };
  const result = sanitizeAISlotsDecum(raw);
  check("snapshot_intro passes through", result.snapshot_intro === "Valid intro text.");
  check("longevity_context passes through", result.longevity_context === "Valid longevity text.");
  check("bogus_key rejected", !("bogus_key" in result));
  check("another_bad rejected", !("another_bad" in result));
}

// 4b: HTML tags stripped
console.log("  4b: HTML tags stripped");
{
  const raw = {
    snapshot_intro: "This has <b>bold</b> and <script>alert(1)</script> tags.",
  };
  const result = sanitizeAISlotsDecum(raw);
  check("HTML tags removed", result.snapshot_intro === "This has bold and alert(1) tags.");
}

// 4c: Forbidden terms cause slot rejection
console.log("  4c: Forbidden terms");
{
  const forbidden = [
    "Vous devriez consulter un planificateur.",
    "Nous recommandons cette approche.",
    "Nous conseillons de diversifier.",
    "Vous devez agir rapidement.",
    "Il faut que vous vendiez vos actions.",
    "Assurez-vous de vérifier les détails.",
    "We recommend this strategy.",
    "You should consider bonds.",
    "You must act now.",
    "Considérez une réduction.",
    "Optimisez votre portefeuille.",
    "Priorisez le remboursement.",
    "Voici votre plan d'action.",
    "Nos recommandations sont claires.",
  ];

  for (const text of forbidden) {
    const raw = { snapshot_intro: text };
    const result = sanitizeAISlotsDecum(raw);
    check(`Forbidden term rejected: "${text.slice(0, 40)}..."`, !result.snapshot_intro);
  }
}

// 4d: Max length respected
console.log("  4d: Max length");
{
  // snapshot_intro: max 600
  const longText = "A".repeat(700);
  const raw600 = { snapshot_intro: longText };
  const result600 = sanitizeAISlotsDecum(raw600);
  check("snapshot_intro truncated to 600", result600.snapshot_intro?.length === 600);

  // tax_timing_obs: max 600
  const rawTax = { tax_timing_obs: longText };
  const resultTax = sanitizeAISlotsDecum(rawTax);
  check("tax_timing_obs truncated to 600", resultTax.tax_timing_obs?.length === 600);

  // meltdown_obs: max 600
  const rawMelt = { meltdown_obs: longText };
  const resultMelt = sanitizeAISlotsDecum(rawMelt);
  check("meltdown_obs truncated to 600", resultMelt.meltdown_obs?.length === 600);

  // estate_obs: max 400
  const rawEstate = { estate_obs: longText };
  const resultEstate = sanitizeAISlotsDecum(rawEstate);
  check("estate_obs truncated to 400", resultEstate.estate_obs?.length === 400);

  // obs_1: default max 500
  const rawObs = { obs_1: longText };
  const resultObs = sanitizeAISlotsDecum(rawObs);
  check("obs_1 truncated to 500 (default)", resultObs.obs_1?.length === 500);
}

// 4e: Non-string values ignored
console.log("  4e: Non-string values");
{
  const raw = {
    snapshot_intro: 12345,
    longevity_context: null,
    spending_flex_obs: undefined,
    income_mix_obs: { nested: true },
    tax_timing_obs: "",
  };
  const result = sanitizeAISlotsDecum(raw as any);
  check("Number value ignored", !result.snapshot_intro);
  check("Null value ignored", !result.longevity_context);
  check("Undefined value ignored", !result.spending_flex_obs);
  check("Object value ignored", !result.income_mix_obs);
  check("Empty string ignored", !result.tax_timing_obs);
}

// 4f: All AI_SLOTS_DECUM keys recognized
console.log("  4f: All slot keys accepted");
{
  const raw: Record<string, string> = {};
  for (const key of AI_SLOTS_DECUM) {
    raw[key] = "Valid text for " + key;
  }
  const result = sanitizeAISlotsDecum(raw);
  for (const key of AI_SLOTS_DECUM) {
    check(`Slot ${key} accepted`, key in result);
  }
}

// 4g: Additional filler terms rejected
console.log("  4g: Filler terms rejected");
{
  const fillers = [
    "Il est important de noter que les rendements varient.",
    "Il convient de souligner cette tendance.",
    "In this context, returns may vary.",
    "It is important to note that markets fluctuate.",
    "Worth noting that bonds provide stability.",
    "Par ailleurs, les obligations sont plus stables.",
  ];
  for (const text of fillers) {
    const raw = { obs_1: text };
    const result = sanitizeAISlotsDecum(raw);
    check(`Filler rejected: "${text.slice(0, 40)}..."`, !result.obs_1);
  }
}

// ══════════════════════════════════════════════════════════════════
// Summary
// ══════════════════════════════════════════════════════════════════
console.log("\n" + "=".repeat(60));
console.log(`RESULTS: ${pass} passed, ${fail} failed (${pass + fail} total)`);
if (failures.length > 0) {
  console.log("\nFailed tests:");
  failures.forEach((f) => console.log(`  - ${f}`));
}
console.log("=".repeat(60));
process.exit(fail > 0 ? 1 : 0);
