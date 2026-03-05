// Regenerate all 10 test reports — Step 1: generate prompts + data
// Step 2: feed AI text back via regen-render.ts
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { translateToMC } from "../../../lib/quiz-translator.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const reportModule = await import("../../../lib/report-html.js");
const { renderReportHTML, calcCostOfDelay, calcMinViableReturn, extractReportData, buildAIPrompt } = reportModule;
const engineModule = await import("../../../lib/engine/index.js");
const { runMC } = engineModule;

const profiles = JSON.parse(readFileSync(join(__dirname, "profiles-audit.json"), "utf8"));
const mode = process.argv[2] || "prompt"; // "prompt" or "render"

if (mode === "prompt") {
  // Generate prompts for all profiles
  const prompts: any[] = [];
  for (const p of profiles) {
    const params = translateToMC(p.quiz);
    const mc = runMC(params, 5000);
    if (!mc) { console.error(`ERROR: ${p.name} — runMC null`); continue; }
    const D = extractReportData(mc, params);
    const costDelay = calcCostOfDelay(params);
    const prompt = buildAIPrompt(D, params, true, p.quiz);

    console.log(`\n${"=".repeat(60)}`);
    console.log(`PROFILE: ${p.name} | Grade: ${D.grade} (${D.successPct}%) | CostDelay: ${costDelay}`);
    console.log(`coveragePct: ${D.coveragePct}% | gapMonthly: ${D.gapMonthly} | rMedF: ${D.rMedF}`);
    console.log(`retAge: ${D.retAge} | age: ${D.age} | monthlyContrib: ${D.monthlyContrib}`);
    console.log(`${"=".repeat(60)}`);

    prompts.push({
      name: p.name,
      grade: D.grade,
      successPct: D.successPct,
      costDelay,
      sys: prompt.sys,
      usr: prompt.usr,
    });
  }
  writeFileSync(join(__dirname, "ai-prompts.json"), JSON.stringify(prompts, null, 2), "utf8");
  console.log("\n\nSaved prompts to ai-prompts.json");

} else if (mode === "render") {
  // Render reports using AI text from ai-responses.json
  const aiResponses = JSON.parse(readFileSync(join(__dirname, "ai-responses.json"), "utf8"));

  for (const p of profiles) {
    const params = translateToMC(p.quiz);
    const mc = runMC(params, 5000);
    if (!mc) { console.error(`ERROR: ${p.name} — runMC null`); continue; }
    const D = extractReportData(mc, params);
    const costDelay = calcCostOfDelay(params);
    let minReturn = 0;
    try { minReturn = calcMinViableReturn(params); } catch(e) { /* skip */ }

    const ai = aiResponses[p.name] || {};
    const html = renderReportHTML(D, mc, p.quiz, "fr", ai, costDelay, minReturn, null);
    const outPath = join(__dirname, `${p.name}_AI.html`);
    writeFileSync(outPath, html, "utf8");
    console.log(`${p.name}: ${D.grade} (${D.successPct}%) — rendered with ${Object.keys(ai).length} AI slots`);
  }
  console.log("\nDone! All reports rendered.");
}
