// tests/report-coherence.test.ts
// ─────────────────────────────────────────────────────────────────────────────
// GOLDEN DATA-TRUTH TESTS for Bilan 360 reports (2026-07-02).
// Run: npx tsx tests/report-coherence.test.ts
//
// Part 1 — unit invariants: synthetic broken facts objects must trip the gate
//          (each check catches the defect class it was built for).
// Part 2 — formatter goldens: FR "287 916 $"/"9,3 %", EN "$287,916"/"9.3%".
// Part 3 — corpus goldens: every frozen corpus-30 persona is rebuilt through
//          the facts factory, rendered, and run through the full gate. Every
//          persona must pass EXCEPT known engine-bug quarantines (listed in
//          KNOWN_ENGINE_BUGS with the blocker id they must fail on — so the
//          bug can neither ship NOR silently disappear from view).
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import { evaluateReportCoherence, lintReportHtmlLocale, lintReportStructure, runCoherenceGate } from "../lib/report-coherence-gate";
import { fmtMoney360, fmtPct360 } from "../lib/report-facts-360";
import { extractReportData360, renderReportHTML360 } from "../lib/report-html-360";

let pass = 0, fail = 0;
const ok = (cond: boolean, label: string, detail?: string) => {
  if (cond) { pass++; }
  else { fail++; console.error(`  ✗ ${label}${detail ? " — " + detail : ""}`); }
};

// ── Part 1: unit invariants on synthetic facts ───────────────────────────────
console.log("Part 1 — gate unit invariants");
const baseD = {
  age: 60, retAge: 65, deathAge: 95,
  retQppPrimaryMonthly: 800, retOasPrimaryMonthly: 700, retGisMonthly: 0, retPenMonthly: 0, retSpouseGovMonthly: 0,
  retGovMonthly: 1500, householdRetTargetMonthly: 4000, retGovCoveragePct: 38, gapMonthly: 2500,
  withdrawalRatePct: 4.0, wdAnnualRealAtRet: 30000, wdFundingNeedAnnualAtRet: 31000, rrifMinAnnualAtRet: 0,
  rP5F: 100, rP25F: 200, rMedF: 300000, rP75F: 500000,
  retBal: 400000, retYearBalance: 750000, merWeighted: 0.015, feeCostLifetime: 200000,
  pdSeries: [{ age: 60, p50: 400000 }, { age: 95, p50: 300000 }],
  decumTable: [{ age: 65, p50Portfolio: 750000, govMonthly: 1500, portWithdrawMonthly: 2500, spendMonthly: 4000, shortfallMonthly: 0 }],
  properties: [], surplusLifetimeReal: 0, medEstate: 250000, reEquity: 0, lifeInsBenefit: 0, cLifeInsBenefit: 0,
  successPct: 80, medDepletionAge: null,
};
const cleanParams = { rrspC: 10000, tfsaC: 5000, nrC: 0 };
{
  const v = evaluateReportCoherence({ ...baseD, feeCostLifetime: 350000 }, cleanParams);
  // fee cap: 0.015 × 750000 × 35 × 1.2 ≈ 472K → 350K passes; use terminal-wealth-style abuse instead
  const v2 = evaluateReportCoherence({ ...baseD, merWeighted: 0.002, feeCostLifetime: 200000 }, cleanParams);
  ok(v2.blockers.some(b => b.id === "C7_fee_overstatement"), "C7 catches fee formula on wrong basis");
}
ok(evaluateReportCoherence({ ...baseD, retGovMonthly: 2000 }, cleanParams).blockers.some(b => b.id === "C1_gov_components_sum"), "C1 catches component-sum drift");
ok(evaluateReportCoherence({ ...baseD, retGovCoveragePct: 90 }, cleanParams).blockers.some(b => b.id === "C2_coverage_definition"), "C2 catches coverage on wrong basis");
ok(evaluateReportCoherence({ ...baseD, gapMonthly: 5028 }, cleanParams).blockers.some(b => b.id === "C3_gap_reconciliation"), "C3 catches the hnw/midcouple gap contradiction class");
ok(evaluateReportCoherence({ ...baseD, withdrawalRatePct: 73.1 }, cleanParams).blockers.some(b => b.id === "C4_withdrawal_range"), "C4 catches the 73%-for-a-32yo class");
ok(evaluateReportCoherence({ ...baseD, wdAnnualRealAtRet: 60000 }, cleanParams).blockers.some(b => b.id === "C4_withdrawal_vs_coverage"), "C4 catches phantom withdrawals beyond funding needs");
ok(evaluateReportCoherence({ ...baseD, rP25F: 600000 }, cleanParams).blockers.some(b => b.id === "C5_percentile_order"), "C5 catches percentile disorder");
{
  // gis-class: tiny portfolio, no visible inflows, huge ending wealth
  const gisLike = { ...baseD, age: 67, retAge: 67, retBal: 16660, retYearBalance: 16660, rMedF: 287916, rP75F: 334986, rP25F: 244013, rP5F: 194174, surplusLifetimeReal: 0, properties: [], decumTable: [], pdSeries: [], withdrawalRatePct: 0, wdAnnualRealAtRet: 0, wdFundingNeedAnnualAtRet: 0, feeCostLifetime: 0, gapMonthly: 0, householdRetTargetMonthly: 1500, retGovMonthly: 1500, retGovCoveragePct: 100, retQppPrimaryMonthly: 800, retOasPrimaryMonthly: 700 };
  const v = evaluateReportCoherence(gisLike, {});
  ok(v.blockers.some(b => b.id === "C6_implausible_growth"), "C6 catches the gis impossible-wealth class");
}
ok(evaluateReportCoherence(baseD, cleanParams).ok, "clean facts object passes the gate");

// ── Part 2: formatter goldens ────────────────────────────────────────────────
console.log("Part 2 — locale formatters");
ok(fmtMoney360(287916, true) === "287 916 $", "FR money", fmtMoney360(287916, true));
ok(fmtMoney360(287916, false) === "$287,916", "EN money", fmtMoney360(287916, false));
ok(fmtPct360(9.3, true) === "9,3 %", "FR pct", fmtPct360(9.3, true));
ok(fmtPct360(9.3, false) === "9.3%", "EN pct", fmtPct360(9.3, false));
ok(lintReportHtmlLocale("<p>fees of 287,916 $ apply</p>", "en").length === 1, "EN lint flags postfix $");
ok(lintReportHtmlLocale("<p>rate of 9,3 % applies</p>", "en").length === 1, "EN lint flags FR decimal");
ok(lintReportHtmlLocale("<p>des frais de $287,916 s'appliquent</p>", "fr").length === 1, "FR lint flags prefix $");
ok(lintReportHtmlLocale("<p>un taux de 9.3 % s'applique</p>", "fr").length === 1, "FR lint flags dot decimal");
ok(lintReportStructure("<html></html>").length === 2, "structure lint requires disclaimer + assumptions");

// ── Part 3: corpus goldens (all 22 frozen personas) ──────────────────────────
console.log("Part 3 — corpus-30 golden pass");
// Personas whose ENGINE output is known-broken: they MUST fail with exactly
// this blocker until the engine fix lands (then remove them from this list —
// the test will fail loudly either way if reality changes).
const KNOWN_ENGINE_BUGS: Record<string, string> = {
  // (empty — the 2026-07-02 GIS nominal/real income-test defect was fixed in
  // the engine, and the surplus-reinvestment inflow is now emitted as
  // medRevData.reinvest, so C6 passes on true data. History: gis_on_en /
  // gis_qc_fr were quarantined here on C6_implausible_growth.)
};
const BASE = path.resolve(__dirname, "../planner/report/realai/corpus-30");
const payloadDir = path.join(BASE, "payload");
const respDir = path.join(BASE, "responses");
if (!fs.existsSync(payloadDir)) {
  console.warn("  (corpus-30 payloads not present — skipping Part 3)");
} else {
  for (const f of fs.readdirSync(payloadDir).filter((x) => x.endsWith(".json"))) {
    const key = f.replace(".json", "");
    const pl = JSON.parse(fs.readFileSync(path.join(payloadDir, f), "utf8"));
    const D: any = extractReportData360(pl.mcBase, pl.params, pl.phase, pl.extraRuns);
    const respF = path.join(respDir, f);
    const ai = fs.existsSync(respF) ? JSON.parse(fs.readFileSync(respF, "utf8")) : {};
    const html = renderReportHTML360(D, pl.mcBase, pl.params, pl.lang, ai, pl.phase, "tok", pl.extraRuns, pl.buildfiData, { clientExport: false });
    const v = runCoherenceGate(D, pl.params, html, pl.lang);
    const expectBug = KNOWN_ENGINE_BUGS[key];
    if (expectBug) {
      ok(!v.ok && v.blockers.some((b) => b.id === expectBug), `${key} still quarantined on ${expectBug}`,
        v.ok ? "unexpectedly passed — engine fixed? remove from KNOWN_ENGINE_BUGS" : v.blockers.map((b) => b.id).join(","));
    } else {
      ok(v.ok, `${key} passes data-truth gate`, v.blockers.map((b) => `${b.id}(exp ${b.expected} act ${b.actual})`).join(","));
    }
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
