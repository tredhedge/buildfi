#!/usr/bin/env node
// extract-v3-engine.mjs — Pull all engine functions out of planner_v3.html
// into a Node-runnable module so we can audit numerically.
//
// Strategy:
//   1. Read planner_v3.html
//   2. Find all <script> blocks
//   3. Concatenate them, wrap in a CommonJS module that exposes the engine
//      surface (calcTax, calcQPP, calcOAS, calcGIS, getRRIFMin, optimizeDecum,
//      runMC, chol, tRn, stochDeath, calcPayroll, etc.)
//   4. Stub browser globals (document, window, React) so the file loads
//
// Output: planner/report/realai/v3-engine.cjs
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const v3Path = path.join(__dirname, '..', '..', 'planner_v3.html');
const outPath = path.join(__dirname, 'v3-engine.cjs');

const html = fs.readFileSync(v3Path, 'utf8');

// Find the main engine script block — it contains "function calcTax" and "function runMC".
// planner_v3 has React inline + multiple <script> blocks; we want the one with the engine.
const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/g;
let match;
let engineBlock = null;
while ((match = scriptRe.exec(html)) !== null) {
  const body = match[1];
  if (body.includes('function calcTax(') && body.includes('function runMC(')) {
    engineBlock = body;
    break;
  }
}
if (!engineBlock) {
  console.error('Could not find engine script block in planner_v3.html');
  process.exit(1);
}

console.log('Found engine block: ' + Math.round(engineBlock.length / 1024) + ' KB');

// Strip JSX (React) — we don't need component code, just engine math.
// Safer to find the engine functions and wrap them rather than try to parse JSX.
// Approach: extract from "// ===== ENGINE =====" marker to end of runMC + return.
// Fallback: extract from "function calcTax" forward until first React component (function with PascalCase name + JSX return).

// Find start: "function calcTax"
const startIdx = engineBlock.indexOf('function calcTax(');
if (startIdx < 0) { console.error('No function calcTax found'); process.exit(1); }

// Find end: cut before the first React UI component. Search for "function Slider("
// which is the canonical first UI function after the engine block.
let endMarker = engineBlock.indexOf('function Slider(', startIdx);
if (endMarker < 0) endMarker = engineBlock.indexOf('function NumField(', startIdx);
if (endMarker < 0) endMarker = engineBlock.indexOf('function ChartTooltip(', startIdx);
if (endMarker < 0) {
  console.error('Could not find end marker (Slider/NumField/ChartTooltip) after engine');
  process.exit(1);
}
const engineSrc = engineBlock.slice(startIdx, endMarker);

console.log('Extracted engine source: ' + Math.round(engineSrc.length / 1024) + ' KB');

// Wrap as CommonJS module. The engine functions reference things like `C` (constants),
// `PROV_TAX`, `RRIF`, `STR`, `CRM`, `CHL`, `CRM_CRISIS`, `CHL_CRISIS`. We need to find
// these too and include them.
// Search for top-level `var` and `const` declarations in the script block before the engine.
const preEngineSrc = engineBlock.slice(0, startIdx);

// Also need PROV_TAX, RRIF, STR, CRM, etc. They live somewhere in the block — grab any
// top-level "var X = " or "const X = " for known names.
const constNames = ['C', 'PROV_TAX', 'RRIF', 'STR', 'CRM', 'CHL', 'CRM_CRISIS', 'CHL_CRISIS',
  'CRM8', 'CHL8', 'CRM8_CRISIS', 'CHL8_CRISIS', 'CPM_M', 'CPM_F',
  'TAX_BASE_YEAR', 'FED_BRACKETS', 'FED_RATES', 'FED_PERSONAL', 'OAS_CLAWBACK_THR',
  'OAS_MAX_MONTHLY', 'GIS_MAX_SINGLE', 'GIS_MAX_COUPLE', 'QPP_MAX_MONTHLY',
  'QPP_MGA', 'QPP_YAMPE', 'QPP2_MAX_MONTHLY', 'PENSION_CREDIT_MAX', 'TFSA_LIMIT_2026',
  'CFG_SMOOTH'];

let constsBlock = '';
for (const name of constNames) {
  // Find "var name = ..." or "const name = ..." up to ";\n"
  const re = new RegExp('(?:var|const)\\s+' + name + '\\s*=\\s*[\\s\\S]+?;\\s*(?=\\n|//|$)', 'm');
  const m = preEngineSrc.match(re);
  if (m) constsBlock += m[0] + '\n';
}
console.log('Captured constants: ' + constsBlock.split('\n').filter(Boolean).length + ' declarations');

// Check for any function the engine depends on that's defined earlier (sMul, pCr, etc.)
// Actually those are inside the engine block. But oasClbThrFor was earlier — grab it.
const helperNames = ['oasClbThrFor', 'validateSchema'];
let helpersBlock = '';
for (const name of helperNames) {
  const re = new RegExp('function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{[\\s\\S]+?\\n\\}', 'm');
  const m = preEngineSrc.match(re);
  if (m) helpersBlock += m[0] + '\n';
}
console.log('Captured helpers: ' + helpersBlock.split('\n').filter(l => l.startsWith('function')).length);

// Build the output: stubs + constants + helpers + engine, then export everything
const out = `// AUTO-GENERATED from planner_v3.html — DO NOT EDIT
// Source: planner_v3.html (BuildFi Laboratoire v12.0.0)
// Generated: ${new Date().toISOString()}
'use strict';

// ── Browser stubs ──────────────────────────────────────────────
const window = global.window || (global.window = {});
const document = global.document || (global.document = { getElementById: () => null, querySelectorAll: () => [], activeElement: null });
const navigator = global.navigator || { clipboard: { writeText: () => Promise.resolve() } };

// ── Engine constants ───────────────────────────────────────────
${constsBlock}

// ── Engine helpers ─────────────────────────────────────────────
${helpersBlock}

// ── Engine functions (extracted from planner_v3.html) ──────────
${engineSrc}

// ── Export surface ─────────────────────────────────────────────
module.exports = {
  calcTax, calcCorpTax, calcQPP, calcOAS, calcGIS, getRRIFMin,
  optimizeDecum, chol, tRn, sMul, pCr, stochDeath, blendRet,
  blendMulti, resolveAlloc, divEligibleFactor, calcNRItemizedTax,
  calcWHT, calcPayroll, runMC,
  // Helpers
  oasClbThrFor: typeof oasClbThrFor === 'function' ? oasClbThrFor : null,
  validateSchema: typeof validateSchema === 'function' ? validateSchema : null,
  // Constants
  TAX_BASE_YEAR, FED_BRACKETS, FED_RATES, FED_PERSONAL,
  OAS_CLAWBACK_THR, OAS_MAX_MONTHLY,
  GIS_MAX_SINGLE, GIS_MAX_COUPLE,
  QPP_MAX_MONTHLY, QPP_MGA, QPP_YAMPE, QPP2_MAX_MONTHLY,
  PENSION_CREDIT_MAX, TFSA_LIMIT_2026,
  PROV_TAX, RRIF, STR, CRM, CHL, CRM_CRISIS, CHL_CRISIS, C
};
`;

fs.writeFileSync(outPath, out);
console.log('\nWrote ' + outPath + ' (' + Math.round(out.length / 1024) + ' KB)');
console.log('\nSelf-test: try requiring the module...');
try {
  const m = require(outPath);
  console.log('  Loaded OK. Exports: ' + Object.keys(m).filter(k => m[k] !== null && m[k] !== undefined).slice(0, 20).join(', ') + '...');
  console.log('  calcTax(80000, 0, "QC") =', JSON.stringify(m.calcTax(80000, 0, 'QC')).slice(0, 200));
  console.log('  calcQPP(65, 70000, 35) =', m.calcQPP(65, 70000, 35).toFixed(2));
  console.log('  calcOAS(65, 50000, 0) =', m.calcOAS(65, 50000, 0).toFixed(2));
  console.log('  getRRIFMin(72, 100000) =', m.getRRIFMin(72, 100000));
} catch (e) {
  console.error('  LOAD FAILED:', e.message);
  console.error(e.stack.split('\n').slice(0, 5).join('\n'));
  process.exit(1);
}
