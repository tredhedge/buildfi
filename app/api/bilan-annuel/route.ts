// /app/api/bilan-annuel/route.ts
// Bilan Annuel — Annual comparative assessment (hors quota, doesn't consume export credits)
// 7-field update → MC 5000 sims → comparison with previous profile → AI narration → 9-page report
// Used by: Simulator UI "Bilan Annuel" workflow

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { put } from "@vercel/blob";
import { runMC } from "@/lib/engine";
import {
  authenticateAndRateLimit,
  validateBaseParams,
  gradeFromSuccess,
  ENGINE_VERSION,
  CONSTANTS_YEAR,
} from "@/lib/api-helpers";
import {
  getExpertProfile,
  updateExpertProfile,
} from "@/lib/kv";
import { buildMagicLinkUrl } from "@/lib/auth";
import { sendExpertDeliveryEmail } from "@/lib/email-expert";

export const maxDuration = 120;
export const runtime = "nodejs";

// ── AI caller ────────────────────────────────────────────────

async function callAnthropicBilan(
  sys: string,
  usr: string
): Promise<Record<string, string>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return {};
  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 6000,
      system: sys,
      messages: [{ role: "user", content: usr }],
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const cleaned = text.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("[bilan-annuel] AI call failed:", err);
    return {};
  }
}

// ── Extract comparison data ──────────────────────────────────

interface BilanYearData {
  successRate: number;
  grade: string;
  medianWealth: number;
  totalAssets: number;
  year: number;
}

interface BilanComparison {
  current: { successRate: number; grade: string; medianWealth: number; totalAssets: number };
  previous: { successRate: number; grade: string; medianWealth: number; totalAssets: number } | null;
  deltas: { successPct: number; grade: string; wealth: number; assets: number } | null;
  // BUG 18: Multi-year history (up to 3 years)
  history: BilanYearData[];
}

function extractBilanData(
  mc: Record<string, any>,
  params: Record<string, any>,
  prevMc: Record<string, any> | null,
  prevParams: Record<string, any> | null
): BilanComparison {
  const successRate = mc.succ ?? mc.successRate ?? mc.p ?? 0;
  const grade = gradeFromSuccess(successRate);
  const medianWealth = mc.rMedF ?? mc.medF ?? 0;
  const totalAssets = (Number(params.rrsp) || 0) + (Number(params.tfsa) || 0) + (Number(params.nr) || 0);

  const currentYear = new Date().getFullYear();
  const current = { successRate, grade, medianWealth, totalAssets };

  if (!prevMc || !prevParams) return { current, previous: null, deltas: null, history: [{ ...current, year: currentYear }] };

  const prevSucc = prevMc.succ ?? prevMc.successRate ?? prevMc.p ?? 0;
  const prevGrade = gradeFromSuccess(prevSucc);
  const prevMedian = prevMc.rMedF ?? prevMc.medF ?? 0;
  const prevAssets = (Number(prevParams.rrsp) || 0) + (Number(prevParams.tfsa) || 0) + (Number(prevParams.nr) || 0);

  const previous = { successRate: prevSucc, grade: prevGrade, medianWealth: prevMedian, totalAssets: prevAssets };
  const deltas = {
    successPct: Math.round((successRate - prevSucc) * 100),
    grade: `${prevGrade} → ${grade}`,
    wealth: medianWealth - prevMedian,
    assets: totalAssets - prevAssets,
  };

  // BUG 18: history array includes current + previous (historical entries injected later from KV)
  const history: BilanYearData[] = [
    { ...current, year: currentYear },
    { ...previous, year: currentYear - 1 },
  ];

  return { current, previous, deltas, history };
}

// ── Build Bilan AI prompt ────────────────────────────────────

function buildBilanPrompt(
  comparison: BilanComparison,
  params: Record<string, any>,
  bilanFields: Record<string, any>,
  lang: string,
  bilanHistory?: BilanYearData[]
): { sys: string; usr: string } {
  const fr = lang === "fr";

  const sys = fr
    ? `Tu es un analyste financier quantitatif pour BuildFi, un outil de planification de retraite canadien. Tu rediges le Bilan Annuel — un check-up fiscal comparatif. REGLES: (1) Conditionnel obligatoire pour toute projection. (2) Langage observationnel uniquement — decris les chiffres, ne prescris pas d'actions. (3) JAMAIS utiliser: devriez, recommandons, il faut, plan d'action. (4) Utilise plutot: "les donnees indiquent", "le modele suggere", "il serait pertinent de considerer". (5) Renvoie a un professionnel qualifie pour toute decision. Reponds en JSON avec les cles exactes demandees. Pas de markdown, pas de backticks.`
    : `You are a quantitative financial analyst for BuildFi, a Canadian retirement planning tool. You write the Annual Assessment — a comparative fiscal check-up. RULES: (1) Conditional tense mandatory for all projections. (2) Observational language only — describe what numbers show, never prescribe actions. (3) NEVER use: should, recommend, must, action plan. (4) Use instead: "the data indicates", "the model suggests", "it could be worth considering". (5) Refer to a qualified professional for all decisions. Respond in JSON with the exact keys requested. No markdown, no backticks.`;

  const successPct = Math.round(comparison.current.successRate * 100);
  const prevPct = comparison.previous ? Math.round(comparison.previous.successRate * 100) : null;
  const deltaPct = comparison.deltas?.successPct ?? 0;

  // BUG 18: Build multi-year history string for AI context
  const historyData = bilanHistory && bilanHistory.length > 1
    ? bilanHistory : comparison.history;
  const historyStr = historyData.length >= 2
    ? (fr
        ? `\nHistorique multi-annees (${historyData.length} ans):\n${historyData.map(h => `  ${h.year}: taux ${Math.round(h.successRate * 100)}%, note ${h.grade}${h.totalAssets > 0 ? `, actifs ${h.totalAssets}$` : ""}`).join("\n")}`
        : `\nMulti-year history (${historyData.length} years):\n${historyData.map(h => `  ${h.year}: rate ${Math.round(h.successRate * 100)}%, grade ${h.grade}${h.totalAssets > 0 ? `, assets $${h.totalAssets}` : ""}`).join("\n")}`)
    : "";

  const usr = fr
    ? `Bilan Annuel pour un client. Profil: age ${params.age}, retraite ${params.retAge}, province ${params.prov}, salaire ${params.sal}$.
Taux de reussite: ${successPct}%${prevPct !== null ? ` (precedent: ${prevPct}%, delta: ${deltaPct > 0 ? "+" : ""}${deltaPct} pts)` : ""}.
Note: ${comparison.current.grade}${comparison.previous ? ` (precedente: ${comparison.previous.grade})` : ""}.
Patrimoine median a la retraite: ${Math.round(comparison.current.medianWealth)}$${comparison.previous ? ` (precedent: ${Math.round(comparison.previous.medianWealth)}$)` : ""}.
Actifs totaux: ${comparison.current.totalAssets}$${comparison.previous ? ` (precedents: ${comparison.previous.totalAssets}$, delta: ${comparison.deltas ? (comparison.deltas.assets >= 0 ? "+" : "") + comparison.deltas.assets + "$" : ""})` : ""}.${historyStr}
REER: ${bilanFields.rrsp}$, CELI: ${bilanFields.tfsa}$, NR: ${bilanFields.nr}$.
Cotisations: REER ${bilanFields.rrspC}$/an, CELI ${bilanFields.tfsaC}$/an, NR ${bilanFields.nrC}$/an.
Depenses retraite: ${bilanFields.retSpM}$/mois.
Hypotheque: ${bilanFields.mortgageBalance}$ a ${bilanFields.mortgageRate}%.
Evenements: ${bilanFields.events || "Aucun"}.
Changements: ${bilanFields.changes || "Aucun"}.

Genere un JSON avec ces cles (chaque valeur est un paragraphe de 2-4 phrases en francais):
{
  "summaryAI": "Resume du bilan annuel — situation, progres, points d'attention${historyData.length >= 3 ? ", tendance sur " + historyData.length + " ans" : ""}",
  "comparisonAI": "Analyse de l'evolution${historyData.length >= 3 ? " sur " + historyData.length + " ans" : " vs l'annee precedente"}",
  "withdrawalAI": "Observation sur le sequencement des retraits (meltdown REER, ordre optimal)",
  "governmentAI": "Observation sur les prestations gouvernementales (RRQ, PSV, seuils)",
  "taxAI": "Observation sur l'optimisation fiscale (fractionnement, taux marginal)",
  "realEstateAI": "Observation sur l'immobilier (si applicable)",
  "successionAI": "Observation sur la succession (impot deces, roulement conjoint)",
  "questionsAI": "3-5 questions personnalisees a poser a un fiscaliste, avec contexte chiffre"
}`
    : `Annual Assessment for a client. Profile: age ${params.age}, retirement ${params.retAge}, province ${params.prov}, salary $${params.sal}.
Success rate: ${successPct}%${prevPct !== null ? ` (previous: ${prevPct}%, delta: ${deltaPct > 0 ? "+" : ""}${deltaPct} pts)` : ""}.
Grade: ${comparison.current.grade}${comparison.previous ? ` (previous: ${comparison.previous.grade})` : ""}.
Median retirement wealth: $${Math.round(comparison.current.medianWealth)}${comparison.previous ? ` (previous: $${Math.round(comparison.previous.medianWealth)})` : ""}.
Total assets: $${comparison.current.totalAssets}${comparison.previous ? ` (previous: $${comparison.previous.totalAssets}, delta: ${comparison.deltas ? (comparison.deltas.assets >= 0 ? "+" : "") + "$" + comparison.deltas.assets : ""})` : ""}.${historyStr}
RRSP: $${bilanFields.rrsp}, TFSA: $${bilanFields.tfsa}, NR: $${bilanFields.nr}.
Contributions: RRSP $${bilanFields.rrspC}/yr, TFSA $${bilanFields.tfsaC}/yr, NR $${bilanFields.nrC}/yr.
Retirement spending: $${bilanFields.retSpM}/mo.
Mortgage: $${bilanFields.mortgageBalance} at ${bilanFields.mortgageRate}%.
Events: ${bilanFields.events || "None"}.
Changes: ${bilanFields.changes || "None"}.

Generate a JSON with these keys (each value is a 2-4 sentence paragraph in English):
{
  "summaryAI": "Annual assessment summary — situation, progress, attention points${historyData.length >= 3 ? ", " + historyData.length + "-year trend" : ""}",
  "comparisonAI": "Analysis of ${historyData.length >= 3 ? historyData.length + "-year evolution" : "year-over-year evolution"}",
  "withdrawalAI": "Observation on withdrawal sequencing (RRSP meltdown, optimal order)",
  "governmentAI": "Observation on government benefits (CPP, OAS, thresholds)",
  "taxAI": "Observation on tax optimization (splitting, marginal rate)",
  "realEstateAI": "Observation on real estate (if applicable)",
  "successionAI": "Observation on estate planning (deemed disposition, spousal rollover)",
  "questionsAI": "3-5 personalized questions to ask a tax professional, with numerical context"
}`;

  return { sys, usr };
}

// ── Render Bilan HTML ────────────────────────────────────────

function renderBilanHTML(
  comparison: BilanComparison,
  mc: Record<string, any>,
  params: Record<string, any>,
  bilanFields: Record<string, any>,
  ai: Record<string, string>,
  lang: string
): string {
  const fr = lang === "fr";
  const f$ = (v: number) => {
    const abs = Math.abs(Math.round(v));
    const formatted = fr
      ? abs.toLocaleString("fr-CA") + "\u00a0$"
      : "$" + abs.toLocaleString("en-CA");
    return v < 0 ? `\u2212${formatted}` : formatted;
  };
  const grade = comparison.current.grade;
  const successPct = Math.round(comparison.current.successRate * 100);
  const prevPct = comparison.previous ? Math.round(comparison.previous.successRate * 100) : null;
  const deltaPct = comparison.deltas?.successPct ?? 0;

  const sectionStyle = `margin:24px 0;padding:20px 24px;background:#fff;border:1px solid #e8e4db;border-radius:10px;`;
  const h2Style = `font-size:18px;font-weight:700;color:#1a2744;margin:0 0 12px;font-family:'Newsreader',Georgia,serif;`;
  const bodyStyle = `font-size:14px;color:#333;line-height:1.7;`;
  const kpiBox = (label: string, value: string, delta?: string, color?: string) =>
    `<div style="text-align:center;padding:12px 16px;background:#faf8f4;border:1px solid #e8e4db;border-radius:8px;min-width:120px">
      <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px">${label}</div>
      <div style="font-size:28px;font-weight:800;color:${color || "#1a2744"};margin:4px 0">${value}</div>
      ${delta ? `<div style="font-size:12px;color:${delta.startsWith("+") || delta.startsWith("↑") ? "#1a7a4c" : delta.startsWith("-") || delta.startsWith("↓") ? "#b91c1c" : "#999"};font-weight:600">${delta}</div>` : ""}
    </div>`;

  const aiSection = (title: string, key: string, fallback: string) => {
    const text = escapeHTML(ai[key] || fallback);
    return `<div style="${sectionStyle}">
      <h2 style="${h2Style}">${title}</h2>
      <div style="${bodyStyle}">${text}</div>
    </div>`;
  };

  const year = new Date().getFullYear();

  return `<!DOCTYPE html><html lang="${lang}"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${fr ? `Bilan Annuel ${year} — BuildFi` : `Annual Assessment ${year} — BuildFi`}</title>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:wght@300;400;700;800&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',system-ui,sans-serif;background:#faf8f4;color:#1a1208;line-height:1.6}
.container{max-width:800px;margin:0 auto;padding:32px 24px}
@media print{body{background:#fff}.container{padding:0}@page{margin:1.5cm}}
</style></head><body>
<div class="container">

<!-- Header -->
<div style="text-align:center;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #b8860b">
  <div style="font-size:24px;font-weight:800;color:#1a2744;font-family:'Newsreader',serif">buildfi.ca</div>
  <div style="font-size:11px;color:#b8860b;font-weight:600;text-transform:uppercase;letter-spacing:2px;margin:4px 0 16px">
    ${fr ? "Bilan Annuel" : "Annual Assessment"} ${year}
  </div>
  <div style="font-size:13px;color:#666">
    ${fr ? `Age ${params.age} | Retraite a ${params.retAge} | ${params.prov}` : `Age ${params.age} | Retire at ${params.retAge} | ${params.prov}`}
  </div>
</div>

<!-- Page 1: Dashboard -->
<div style="${sectionStyle}">
  <h2 style="${h2Style}">${fr ? "Tableau de bord annuel" : "Annual Dashboard"}</h2>
  <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin:16px 0">
    ${kpiBox(fr ? "Note" : "Grade", grade, comparison.deltas ? comparison.deltas.grade : undefined)}
    ${kpiBox(
      fr ? "Taux de reussite" : "Success rate",
      `${successPct}%`,
      prevPct !== null ? `${deltaPct >= 0 ? "+" : ""}${deltaPct} pts` : undefined,
      successPct >= 80 ? "#1a7a4c" : successPct >= 60 ? "#b8860b" : "#b91c1c"
    )}
    ${kpiBox(
      fr ? "Patrimoine median" : "Median wealth",
      f$(comparison.current.medianWealth),
      comparison.deltas ? `${comparison.deltas.wealth >= 0 ? "+" : ""}${f$(comparison.deltas.wealth)}` : undefined
    )}
    ${kpiBox(
      fr ? "Actifs totaux" : "Total assets",
      f$(comparison.current.totalAssets),
      comparison.deltas ? `${comparison.deltas.assets >= 0 ? "+" : ""}${f$(comparison.deltas.assets)}` : undefined
    )}
  </div>
  ${ai.summaryAI ? `<div style="${bodyStyle};margin-top:12px;padding:12px 16px;background:#faf8f4;border-left:3px solid #b8860b;border-radius:0 6px 6px 0">${escapeHTML(ai.summaryAI)}</div>` : ""}
</div>

<!-- Page 2: Comparison -->
${aiSection(
  fr ? "Le chemin parcouru" : "The path traveled",
  "comparisonAI",
  fr ? "Premiere annee de bilan — les donnees de reference seront etablies pour les comparaisons futures." : "First year of assessment — baseline data will be established for future comparisons."
)}

<!-- BUG 18: Multi-year comparison table (3-year history) -->
${comparison.history.length >= 2 ? `
<div style="${sectionStyle}">
  <h2 style="${h2Style}">${fr ? "Historique comparatif" : "Year-over-year comparison"}</h2>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:8px">
    <thead>
      <tr style="border-bottom:2px solid #b8860b">
        <th style="text-align:left;padding:8px;color:#666">${fr ? "Annee" : "Year"}</th>
        <th style="text-align:center;padding:8px;color:#666">${fr ? "Taux de reussite" : "Success rate"}</th>
        <th style="text-align:center;padding:8px;color:#666">${fr ? "Note" : "Grade"}</th>
        ${comparison.history.some(h => h.medianWealth > 0) ? `<th style="text-align:center;padding:8px;color:#666">${fr ? "Patrimoine median" : "Median wealth"}</th>` : ""}
        ${comparison.history.some(h => h.totalAssets > 0) ? `<th style="text-align:center;padding:8px;color:#666">${fr ? "Actifs totaux" : "Total assets"}</th>` : ""}
      </tr>
    </thead>
    <tbody>
      ${comparison.history.map((h, i) => `
        <tr style="border-bottom:1px solid #e8e4db;${i === 0 ? "font-weight:700;background:#faf8f4" : ""}">
          <td style="padding:8px">${h.year}${i === 0 ? (fr ? " (actuel)" : " (current)") : ""}</td>
          <td style="text-align:center;padding:8px;color:${Math.round(h.successRate * 100) >= 80 ? "#1a7a4c" : Math.round(h.successRate * 100) >= 60 ? "#b8860b" : "#b91c1c"}">${Math.round(h.successRate * 100)}%</td>
          <td style="text-align:center;padding:8px;font-weight:600">${h.grade}</td>
          ${comparison.history.some(h2 => h2.medianWealth > 0) ? `<td style="text-align:center;padding:8px">${h.medianWealth > 0 ? f$(h.medianWealth) : "—"}</td>` : ""}
          ${comparison.history.some(h2 => h2.totalAssets > 0) ? `<td style="text-align:center;padding:8px">${h.totalAssets > 0 ? f$(h.totalAssets) : "—"}</td>` : ""}
        </tr>
      `).join("")}
    </tbody>
  </table>
</div>` : ""}

<!-- Pages 3-6: Scenario cards (BUG 17: distinct card styling) -->
<div style="margin:24px 0;padding:16px 0">
  <h2 style="font-size:16px;font-weight:700;color:#1a2744;margin:0 0 16px;font-family:'Newsreader',Georgia,serif;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #b8860b;padding-bottom:8px">
    ${fr ? "Observations par theme" : "Observations by theme"}
  </h2>
  <div style="display:grid;gap:16px">

    <!-- Card A: Withdrawal sequencing -->
    <div style="background:#fff;border:1px solid #e8e4db;border-radius:10px;border-left:4px solid #1a2744;overflow:hidden">
      <div style="padding:16px 20px;background:#faf8f4;border-bottom:1px solid #e8e4db;display:flex;align-items:center;gap:10px">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#1a2744;color:#fff;font-size:12px;font-weight:800">A</span>
        <span style="font-size:15px;font-weight:700;color:#1a2744;font-family:'Newsreader',Georgia,serif">${fr ? "Sequencement des retraits" : "Withdrawal sequencing"}</span>
      </div>
      <div style="padding:16px 20px;${bodyStyle}">${escapeHTML(ai.withdrawalAI || (fr ? "Le modele explore differentes sequences de retraits entre vos comptes enregistres et non-enregistres." : "The model explores different withdrawal sequences between your registered and non-registered accounts."))}</div>
    </div>

    <!-- Card B: Government benefits -->
    <div style="background:#fff;border:1px solid #e8e4db;border-radius:10px;border-left:4px solid #1a7a4c;overflow:hidden">
      <div style="padding:16px 20px;background:#faf8f4;border-bottom:1px solid #e8e4db;display:flex;align-items:center;gap:10px">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#1a7a4c;color:#fff;font-size:12px;font-weight:800">B</span>
        <span style="font-size:15px;font-weight:700;color:#1a2744;font-family:'Newsreader',Georgia,serif">${fr ? "Prestations gouvernementales" : "Government benefits"}</span>
      </div>
      <div style="padding:16px 20px;${bodyStyle}">${escapeHTML(ai.governmentAI || (fr ? `Le modele a explore les seuils de prestations gouvernementales selon votre profil dans la province de ${params.prov}.` : `The model explored government benefit thresholds based on your profile in ${params.prov}.`))}</div>
    </div>

    <!-- Card C: Tax optimization -->
    <div style="background:#fff;border:1px solid #e8e4db;border-radius:10px;border-left:4px solid #b8860b;overflow:hidden">
      <div style="padding:16px 20px;background:#faf8f4;border-bottom:1px solid #e8e4db;display:flex;align-items:center;gap:10px">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#b8860b;color:#fff;font-size:12px;font-weight:800">C</span>
        <span style="font-size:15px;font-weight:700;color:#1a2744;font-family:'Newsreader',Georgia,serif">${fr ? "Optimisation fiscale" : "Tax optimization"}</span>
      </div>
      <div style="padding:16px 20px;${bodyStyle}">${escapeHTML(ai.taxAI || (fr ? "Le modele a analyse les strategies fiscales disponibles selon votre situation." : "The model analyzed available tax strategies based on your situation."))}</div>
    </div>

    <!-- Card D: Real estate -->
    <div style="background:#fff;border:1px solid #e8e4db;border-radius:10px;border-left:4px solid #666;overflow:hidden">
      <div style="padding:16px 20px;background:#faf8f4;border-bottom:1px solid #e8e4db;display:flex;align-items:center;gap:10px">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#666;color:#fff;font-size:12px;font-weight:800">D</span>
        <span style="font-size:15px;font-weight:700;color:#1a2744;font-family:'Newsreader',Georgia,serif">${fr ? "Immobilier" : "Real estate"}</span>
      </div>
      <div style="padding:16px 20px;${bodyStyle}">${escapeHTML(ai.realEstateAI || (bilanFields.mortgageBalance > 0
        ? (fr ? `Hypotheque de ${f$(bilanFields.mortgageBalance)} a ${bilanFields.mortgageRate}%. Le modele a explore les implications sur votre plan.` : `Mortgage of ${f$(bilanFields.mortgageBalance)} at ${bilanFields.mortgageRate}%. The model explored implications for your plan.`)
        : (fr ? "Aucune hypotheque declaree. Le modele a neanmoins evalue les implications immobilieres potentielles sur votre plan de retraite." : "No mortgage declared. The model nonetheless evaluated potential real estate implications on your retirement plan.")))}</div>
    </div>

    <!-- Card E: Estate planning -->
    <div style="background:#fff;border:1px solid #e8e4db;border-radius:10px;border-left:4px solid #b91c1c;overflow:hidden">
      <div style="padding:16px 20px;background:#faf8f4;border-bottom:1px solid #e8e4db;display:flex;align-items:center;gap:10px">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#b91c1c;color:#fff;font-size:12px;font-weight:800">E</span>
        <span style="font-size:15px;font-weight:700;color:#1a2744;font-family:'Newsreader',Georgia,serif">${fr ? "Succession" : "Estate planning"}</span>
      </div>
      <div style="padding:16px 20px;${bodyStyle}">${escapeHTML(ai.successionAI || (fr ? "Le modele a evalue les implications fiscales au deces selon vos actifs actuels." : "The model evaluated tax implications at death based on your current assets."))}</div>
    </div>

  </div>
</div>

<!-- Page 7: Questions for professional -->
<div style="${sectionStyle}">
  <h2 style="${h2Style}">${fr ? "Questions a poser a votre fiscaliste" : "Questions for your tax professional"}</h2>
  <div style="${bodyStyle}">
    ${ai.questionsAI || (fr
      ? "1. Quel est l'ordre de retrait optimal entre mes comptes REER, CELI et non-enregistre?\n2. Est-ce que je devrais considerer un meltdown REER avant la retraite?\n3. Quelles strategies de fractionnement de revenu seraient pertinentes pour ma situation?"
      : "1. What is the optimal withdrawal order between my RRSP, TFSA, and non-registered accounts?\n2. Should I consider an RRSP meltdown before retirement?\n3. What income splitting strategies could be relevant for my situation?"
    ).split("\n").map((q: string) => `<p style="margin:8px 0;padding:8px 12px;background:#faf8f4;border-radius:6px">${escapeHTML(q)}</p>`).join("")}
  </div>
</div>

<!-- Page 8: For your professional -->
<div style="${sectionStyle}">
  <h2 style="${h2Style}">${fr ? "Pour votre professionnel" : "For your professional"}</h2>
  <div style="font-size:12px;color:#666;line-height:1.6">
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <tr><td style="padding:4px 8px;border-bottom:1px solid #e8e4db;font-weight:600">${fr ? "Moteur" : "Engine"}</td><td style="padding:4px 8px;border-bottom:1px solid #e8e4db">Monte Carlo ${mc.nSim || 5000} sims, t-Student df=5</td></tr>
      <tr><td style="padding:4px 8px;border-bottom:1px solid #e8e4db;font-weight:600">${fr ? "Version" : "Version"}</td><td style="padding:4px 8px;border-bottom:1px solid #e8e4db">${ENGINE_VERSION}</td></tr>
      <tr><td style="padding:4px 8px;border-bottom:1px solid #e8e4db;font-weight:600">${fr ? "Constantes fiscales" : "Tax constants"}</td><td style="padding:4px 8px;border-bottom:1px solid #e8e4db">${CONSTANTS_YEAR}</td></tr>
      <tr><td style="padding:4px 8px;border-bottom:1px solid #e8e4db;font-weight:600">${fr ? "Date" : "Date"}</td><td style="padding:4px 8px;border-bottom:1px solid #e8e4db">${new Date().toISOString().slice(0, 10)}</td></tr>
      <tr><td style="padding:4px 8px;border-bottom:1px solid #e8e4db;font-weight:600">${fr ? "Inflation" : "Inflation"}</td><td style="padding:4px 8px;border-bottom:1px solid #e8e4db">${((Number(params.inf) || 0.021) * 100).toFixed(1)}%</td></tr>
      <tr><td style="padding:4px 8px;border-bottom:1px solid #e8e4db;font-weight:600">${fr ? "Strategie retrait" : "Withdrawal strategy"}</td><td style="padding:4px 8px;border-bottom:1px solid #e8e4db">${params.wStrat || "optimal"}</td></tr>
    </table>
  </div>
</div>

<!-- Page 9: Disclaimers -->
<div style="${sectionStyle};background:#faf8f4">
  <h2 style="${h2Style}">${fr ? "Avertissements" : "Disclaimers"}</h2>
  <div style="font-size:12px;color:#666;line-height:1.7">
    <p>${fr
      ? "Ce bilan est genere a titre informatif seulement et ne constitue pas un conseil financier, fiscal ou juridique. Les projections sont basees sur des hypotheses et des simulations Monte Carlo qui comportent une marge d'incertitude inherente. Les resultats passes ne garantissent pas les resultats futurs."
      : "This assessment is generated for informational purposes only and does not constitute financial, tax, or legal advice. Projections are based on assumptions and Monte Carlo simulations that carry inherent uncertainty. Past results do not guarantee future results."
    }</p>
    <p style="margin-top:8px">${fr
      ? "Consultez un planificateur financier certifie ou un fiscaliste pour toute decision financiere. BuildFi n'est pas un conseiller financier enregistre aupres de l'Autorite des marches financiers (AMF) ou de tout autre organisme de reglementation."
      : "Consult a certified financial planner or tax professional for any financial decision. BuildFi is not a financial advisor registered with any securities regulatory authority."
    }</p>
  </div>
</div>

<!-- Footer -->
<div style="text-align:center;padding:24px 0;font-size:11px;color:#999">
  buildfi.ca &middot; ${fr ? "Bilan Annuel" : "Annual Assessment"} ${year} &middot; ${fr ? "A titre informatif seulement" : "For informational purposes only"}
</div>

</div></body></html>`;
}

// ── Sanitize bilanFields ─────────────────────────────────────────

function sanitizeBilanFields(raw: Record<string, any>): Record<string, any> {
  const stripHTML = (s: unknown) =>
    typeof s === "string" ? s.replace(/<[^>]*>/g, "").slice(0, 500) : "";
  const toNum = (v: unknown, min: number, max: number, def: number) => {
    const n = Number(v);
    return isNaN(n) ? def : Math.max(min, Math.min(max, n));
  };
  return {
    rrsp: toNum(raw.rrsp, 0, 50_000_000, 0),
    tfsa: toNum(raw.tfsa, 0, 50_000_000, 0),
    nr: toNum(raw.nr, 0, 50_000_000, 0),
    sal: toNum(raw.sal, 0, 5_000_000, 0),
    rrspC: toNum(raw.rrspC, 0, 500_000, 0),
    tfsaC: toNum(raw.tfsaC, 0, 100_000, 0),
    nrC: toNum(raw.nrC, 0, 500_000, 0),
    retSpM: toNum(raw.retSpM, 0, 500_000, 0),
    mortgageBalance: toNum(raw.mortgageBalance, 0, 50_000_000, 0),
    mortgageRate: toNum(raw.mortgageRate, 0, 25, 5),
    events: stripHTML(raw.events),
    changes: stripHTML(raw.changes),
  };
}

function escapeHTML(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Main handler ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { params, bilanFields: rawBilanFields, lang: rawLang } = body;
    const lang: "fr" | "en" = rawLang === "en" ? "en" : "fr";

    if (!params || typeof params !== "object") {
      return NextResponse.json(
        { success: false, error: "Missing params object" },
        { status: 400 }
      );
    }
    if (!rawBilanFields || typeof rawBilanFields !== "object") {
      return NextResponse.json(
        { success: false, error: "Missing bilanFields object" },
        { status: 400 }
      );
    }

    const bilanFields = sanitizeBilanFields(rawBilanFields);

    // Auth + rate limiting (export tier: 20/day with 2min cooldown)
    const authResult = await authenticateAndRateLimit(req, "export");
    if (authResult instanceof NextResponse) return authResult;

    // Validate params
    const validationError = validateBaseParams(params);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    // Check profile exists (bilan is hors quota — doesn't check exportsAI)
    const profile = await getExpertProfile(authResult.email);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: "No expert profile found" },
        { status: 403 }
      );
    }

    const start = Date.now();

    // ── Step 1: Apply bilan field updates to params ───────────
    const updatedParams = { ...params };
    if (bilanFields.rrsp != null) updatedParams.rrsp = bilanFields.rrsp;
    if (bilanFields.tfsa != null) updatedParams.tfsa = bilanFields.tfsa;
    if (bilanFields.nr != null) updatedParams.nr = bilanFields.nr;
    if (bilanFields.sal != null) updatedParams.sal = bilanFields.sal;
    if (bilanFields.rrspC != null) updatedParams.rrspC = bilanFields.rrspC;
    if (bilanFields.tfsaC != null) updatedParams.tfsaC = bilanFields.tfsaC;
    if (bilanFields.nrC != null) updatedParams.nrC = bilanFields.nrC;
    if (bilanFields.retSpM != null) updatedParams.retSpM = bilanFields.retSpM;
    // Apply mortgage updates to first property if exists
    if (bilanFields.mortgageBalance != null && Array.isArray(updatedParams.props) && updatedParams.props.length > 0) {
      updatedParams.props = [...updatedParams.props];
      updatedParams.props[0] = { ...updatedParams.props[0], mb: bilanFields.mortgageBalance, mr: (bilanFields.mortgageRate || 5) / 100 };
    }

    // ── Step 2: Run MC (5000 sims) with updated params ────────
    const mc = runMC(updatedParams, 5000) as Record<string, any> | null;
    if (!mc) {
      return NextResponse.json(
        { success: false, error: "MC engine returned null" },
        { status: 500 }
      );
    }
    const mcMs = Date.now() - start;
    console.log(`[bilan-annuel] MC 5000 sims in ${mcMs}ms for ${authResult.email}`);

    // ── Step 3: Run previous MC for comparison (if profile has history) ──
    let prevMc: Record<string, any> | null = null;
    let prevParams: Record<string, any> | null = null;
    if (profile.reportsGenerated?.length > 0) {
      // Use original params (before bilan updates) as "previous" baseline
      prevParams = params;
      prevMc = runMC(params, 5000) as Record<string, any> | null;
      if (prevMc) {
        console.log(`[bilan-annuel] Previous MC completed for comparison`);
      }
    }

    // ── Step 4: Extract comparison data ───────────────────────
    const comparison = extractBilanData(mc, updatedParams, prevMc, prevParams);

    // ── Step 4b: BUG 18 — Inject 3-year history from past bilan reports ──
    if (profile.reportsGenerated?.length > 0) {
      const bilanReports = profile.reportsGenerated
        .filter(r => r.type === "bilan")
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Look for historical success rates from changelog entries
      const bilanChangelogs = profile.changelog
        .filter(c => c.action === "bilan-annuel" && c.details?.successPct != null)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Add up to 2 historical years from past bilan changelog data
      for (let i = 0; i < Math.min(2, bilanChangelogs.length); i++) {
        const cl = bilanChangelogs[i];
        const clYear = new Date(cl.date).getFullYear();
        // Avoid duplicates: only add if year not already in history
        if (!comparison.history.some(h => h.year === clYear)) {
          const histSucc = (Number(cl.details.successPct) || 0) / 100;
          comparison.history.push({
            successRate: histSucc,
            grade: gradeFromSuccess(histSucc),
            medianWealth: 0, // Not available from past changelog
            totalAssets: 0,
            year: clYear,
          });
        }
      }

      // Sort history newest first
      comparison.history.sort((a, b) => b.year - a.year);
    }

    // ── Step 5: AI narration ─────────────────────────────────
    const aiStart = Date.now();
    const { sys, usr } = buildBilanPrompt(comparison, updatedParams, bilanFields, lang, comparison.history);
    const ai = await callAnthropicBilan(sys, usr);
    const aiMs = Date.now() - aiStart;
    console.log(`[bilan-annuel] AI in ${aiMs}ms — ${Object.keys(ai).length} sections`);

    // ── Step 6: Render HTML ──────────────────────────────────
    const html = renderBilanHTML(comparison, mc, updatedParams, bilanFields, ai, lang);

    // ── Step 7: Upload to Blob ───────────────────────────────
    const timestamp = new Date().toISOString().slice(0, 10);
    const suffix = Math.random().toString(36).slice(2, 8);
    const filename = `bilan-annuel-${timestamp}-${suffix}.html`;
    const blob = await put(filename, html, {
      access: "public",
      contentType: "text/html; charset=utf-8",
      addRandomSuffix: true,
    });
    console.log(`[bilan-annuel] Report uploaded: ${blob.url}`);

    // ── Step 8: Track in profile (hors quota — no credit decrement) ──
    try {
      const currentProfile = await getExpertProfile(authResult.email);
      if (currentProfile) {
        const reportId = Math.random().toString(36).slice(2, 10);
        await updateExpertProfile(authResult.email, {
          bilanUsed: true,
          reportsGenerated: [
            ...(currentProfile.reportsGenerated || []),
            {
              id: reportId,
              date: new Date().toISOString(),
              type: "bilan" as const,
              sections: ["dashboard", "comparison", "withdrawal", "government", "tax", "realestate", "succession", "questions", "professional"],
              engineVersion: ENGINE_VERSION,
              fiscalYear: CONSTANTS_YEAR,
              blobUrl: blob.url,
              aiStatus: Object.keys(ai).length > 0 ? "full" as const : "fallback" as const,
            },
          ],
          changelog: [
            ...currentProfile.changelog,
            {
              date: new Date().toISOString(),
              action: "bilan-annuel",
              details: {
                reportId,
                grade: comparison.current.grade,
                successPct: Math.round(comparison.current.successRate * 100),
                blobUrl: blob.url,
                hasPrevious: !!prevMc,
              },
            },
          ],
        });
      }
    } catch (logErr) {
      console.error("[bilan-annuel] Changelog update failed (non-fatal):", logErr);
    }

    // ── Step 9: Send email ───────────────────────────────────
    try {
      const magicLinkUrl = buildMagicLinkUrl(authResult.token);
      await sendExpertDeliveryEmail({
        to: authResult.email,
        lang,
        downloadUrl: blob.url,
        grade: comparison.current.grade,
        successPct: Math.round(comparison.current.successRate * 100),
        magicLinkUrl,
        referralCode: profile.referralCode,
      });
    } catch (emailErr) {
      console.error("[bilan-annuel] Email send failed (non-fatal):", emailErr);
    }

    const totalMs = Date.now() - start;
    console.log(
      `[bilan-annuel] Complete in ${totalMs}ms — MC:${mcMs}ms AI:${aiMs}ms — grade ${comparison.current.grade} for ${authResult.email}`
    );

    return NextResponse.json({
      success: true,
      downloadUrl: blob.url,
      grade: comparison.current.grade,
      successPct: Math.round(comparison.current.successRate * 100),
      delta: comparison.deltas,
      meta: {
        sims: 5000,
        durationMs: totalMs,
        mcMs,
        aiMs,
        aiFilled: Object.keys(ai).length,
        engineVersion: ENGINE_VERSION,
        constantsYear: CONSTANTS_YEAR,
        hasPrevious: !!prevMc,
      },
    });
  } catch (err) {
    console.error("[bilan-annuel] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Bilan generation failed",
      },
      { status: 500 }
    );
  }
}
