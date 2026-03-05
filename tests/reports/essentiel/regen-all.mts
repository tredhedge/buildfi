// Regenerate all 10 test reports
// Usage: npx tsx regen-all.mts prompt   → generates ai-prompts.json
//        npx tsx regen-all.mts render   → renders reports from ai-responses.json
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const libDir = join(__dirname, "..", "..", "..", "lib");
import { pathToFileURL } from "url";

const { translateToMC } = await import(pathToFileURL(join(libDir, "quiz-translator.ts")).href);
const reportModule = await import(pathToFileURL(join(libDir, "report-html.js")).href);
const { renderReportHTML, calcCostOfDelay, calcMinViableReturn, extractReportData, buildAIPrompt } = reportModule;
const engineModule = await import(pathToFileURL(join(libDir, "engine", "index.js")).href);
const { runMC } = engineModule;

const profiles = JSON.parse(readFileSync(join(__dirname, "profiles-audit.json"), "utf8"));
const mode = process.argv[2] || "prompt";

if (mode === "prompt") {
  const prompts: any[] = [];
  for (const p of profiles) {
    const params = translateToMC(p.quiz);
    const mc = runMC(params, 5000);
    if (!mc) { console.error(`ERROR: ${p.name}`); continue; }
    const D = extractReportData(mc, params);
    const costDelay = calcCostOfDelay(params);
    const prompt = buildAIPrompt(D, params, true, p.quiz);

    console.log(`\n${"=".repeat(60)}`);
    console.log(`${p.name} | ${D.grade} (${D.successPct}%) | CD:${costDelay} | cov:${D.coveragePct}% | gap:${D.gapMonthly} | rMedF:${D.rMedF}`);

    prompts.push({
      name: p.name,
      grade: D.grade,
      successPct: D.successPct,
      costDelay,
      coveragePct: D.coveragePct,
      rMedF: D.rMedF,
      retAge: D.retAge,
      age: D.age,
      monthlyContrib: D.monthlyContrib,
      gapMonthly: D.gapMonthly,
      sys: prompt.sys,
      usr: prompt.usr,
    });
  }
  writeFileSync(join(__dirname, "ai-prompts.json"), JSON.stringify(prompts, null, 2), "utf8");
  console.log("\nSaved ai-prompts.json");

} else if (mode === "render") {
  const aiResponses = JSON.parse(readFileSync(join(__dirname, "ai-responses.json"), "utf8"));
  for (const p of profiles) {
    const params = translateToMC(p.quiz);
    const mc = runMC(params, 5000);
    if (!mc) { console.error(`ERROR: ${p.name}`); continue; }
    const D = extractReportData(mc, params);
    const costDelay = calcCostOfDelay(params);
    let minReturn = 0;
    try { minReturn = calcMinViableReturn(params); } catch(e) { /* skip */ }
    const ai = aiResponses[p.name] || {};
    const html = renderReportHTML(D, mc, p.quiz, "fr", ai, costDelay, minReturn, null);
    writeFileSync(join(__dirname, `${p.name}_AI.html`), html, "utf8");
    console.log(`${p.name}: ${D.grade} (${D.successPct}%) — ${Object.keys(ai).length} AI slots`);
  }
  console.log("\nDone!");
}
