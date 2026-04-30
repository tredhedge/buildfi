#!/usr/bin/env node
// render-profile-derivation.test.mjs — CLASSIFIER-RENDER-PLAN Phase 1.4.
// ══════════════════════════════════════════════════════════════════════
// Snapshot the 27 classifier combinations (3×3×3) and assert each
// produces the expected renderProfile axes. This is the foundation
// regression for Phases 2-6. If a downstream phase changes the
// derivation rules, this test must be updated explicitly.
//
// Run: node planner/report/realai/tests/render-profile-derivation.test.mjs
// ══════════════════════════════════════════════════════════════════════

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const RP = require(path.join(__dirname, '..', '..', 'report-render-profile.js'));

const LITERACY = ['beginner', 'intermediate', 'advanced'];
const STRESS = ['low', 'moderate', 'high'];
const DETAIL = ['concise', 'balanced', 'detailed'];

let pass = 0, fail = 0;

function check(label, actual, expected) {
  const ok = actual === expected;
  if (ok) pass++; else fail++;
  if (!ok) console.log('\u2717 ' + label + '  actual=' + actual + '  expected=' + expected);
}

console.log('\n\u2550\u2550\u2550 RENDER PROFILE DERIVATION (27 combos) \u2550\u2550\u2550\n');

LITERACY.forEach(fL => {
  STRESS.forEach(sL => {
    DETAIL.forEach(dP => {
      // Pass sku='planner' so the derivation matrix tests the full
      // 27-combo space without the Bilan density cap kicking in. SKU
      // density cap is tested separately below.
      const rp = RP.deriveRenderProfile(fL, sL, dP, 'planner');
      const tag = `[${fL}/${sL}/${dP}]`;

      // chartTier from finLiteracy
      const expChart = fL === 'beginner' ? 'lite' : fL === 'advanced' ? 'full' : 'std';
      check(`${tag} chartTier`, rp.chartTier, expChart);

      // toneMode from stressLevel
      const expTone = sL === 'high' ? 'calm' : sL === 'low' ? 'direct' : 'neutral';
      check(`${tag} toneMode`, rp.toneMode, expTone);

      // densityMode from detailPref
      const expDensity = dP === 'concise' ? 'compact' : dP === 'detailed' ? 'deep' : 'balanced';
      check(`${tag} densityMode`, rp.densityMode, expDensity);

      // jargonMode
      const expJargon = fL === 'beginner' ? 'plain' : fL === 'advanced' ? 'technical' : 'mixed';
      check(`${tag} jargonMode`, rp.jargonMode, expJargon);

      // Derived flags — spot-check the truth-table edges
      check(`${tag} showFan = chartTier!=lite`, rp.showFan, expChart !== 'lite');
      check(`${tag} showTornado = chartTier=full`, rp.showTornado, expChart === 'full');
      check(`${tag} collapseStressTests = compact OR calm`, rp.collapseStressTests, expDensity === 'compact' || expTone === 'calm');
      check(`${tag} bandColor`, rp.bandColor,
        expTone === 'calm' ? 'soft' : expTone === 'direct' ? 'stark' : 'standard');
      check(`${tag} leadWith`, rp.leadWith,
        expTone === 'calm' ? 'floor' : expTone === 'direct' ? 'dispersion' : 'projection');
    });
  });
});

console.log(`\nResult: ${pass}/${pass + fail} assertions passed (${fail} failed).\n`);

// SKU density cap — Bilan should cap detailed→balanced, Planner should not.
console.log('\u2550\u2550\u2550 SKU density cap \u2550\u2550\u2550\n');
const rpBilanDetailed = RP.deriveRenderProfile('advanced', 'low', 'detailed', 'bilan');
const rpPlannerDetailed = RP.deriveRenderProfile('advanced', 'low', 'detailed', 'planner');
check('Bilan caps detailed → balanced', rpBilanDetailed.densityMode, 'balanced');
check('Planner allows detailed → deep', rpPlannerDetailed.densityMode, 'deep');
check('Bilan caps detailed → detailPref echo balanced', rpBilanDetailed.detailPref, 'balanced');
check('Bilan concise stays concise', RP.deriveRenderProfile('beginner', 'high', 'concise', 'bilan').densityMode, 'compact');
check('Bilan balanced stays balanced', RP.deriveRenderProfile('intermediate', 'moderate', 'balanced', 'bilan').densityMode, 'balanced');

// resolveRepresentation spot-checks
console.log('\u2550\u2550\u2550 resolveRepresentation spot-checks \u2550\u2550\u2550\n');
const rpLite = RP.deriveRenderProfile('beginner', 'high', 'concise', 'planner');
const rpStd = RP.deriveRenderProfile('intermediate', 'moderate', 'balanced', 'planner');
const rpFull = RP.deriveRenderProfile('advanced', 'low', 'detailed', 'planner');

// income_waterfall: lite → chart_simplified, std/full → chart. Universal block.
check('income_waterfall lite \u2192 chart_simplified', RP.resolveRepresentation('income_waterfall', rpLite, true), 'chart_simplified');
check('income_waterfall std \u2192 chart',              RP.resolveRepresentation('income_waterfall', rpStd, true), 'chart');
check('income_waterfall full \u2192 chart',             RP.resolveRepresentation('income_waterfall', rpFull, true), 'chart');
check('draw_order lite \u2192 omit',                    RP.resolveRepresentation('draw_order', rpLite, true), 'omit');
check('draw_order std \u2192 chart',                    RP.resolveRepresentation('draw_order', rpStd, true), 'chart');
check('tornado lite → omit',               RP.resolveRepresentation('tornado', rpLite, true), 'omit');
check('tornado full → chart',              RP.resolveRepresentation('tornado', rpFull, true), 'chart');
check('fee_impact lite → text',            RP.resolveRepresentation('fee_impact', rpLite, true), 'text');
check('fee_impact std → hybrid',           RP.resolveRepresentation('fee_impact', rpStd, true), 'hybrid');
check('fee_impact full → chart',           RP.resolveRepresentation('fee_impact', rpFull, true), 'chart');
check('percentile_fan lite → text',        RP.resolveRepresentation('percentile_fan', rpLite, true), 'text');
check('percentile_fan std → simplified',   RP.resolveRepresentation('percentile_fan', rpStd, true), 'chart_simplified');
check('sequence_of_returns lite → omit',   RP.resolveRepresentation('sequence_of_returns', rpLite, true), 'omit');
check('hasData=false → omit',              RP.resolveRepresentation('income_waterfall', rpFull, false), 'omit');

// isBlockRelevant spot-checks
console.log('\n\u2550\u2550\u2550 isBlockRelevant spot-checks \u2550\u2550\u2550\n');
check('CCPC hidden when no biz', RP.isBlockRelevant('ccpc_extraction', { p: { bizOn: false } }, rpFull), false);
check('CCPC shown when biz on',  RP.isBlockRelevant('ccpc_extraction', { p: { bizOn: true } }, rpFull), true);
check('OAS clawback hidden for plain+0clawback', RP.isBlockRelevant('oas_clawback', { p: {}, oasClbkYrs: 0 }, rpLite), false);
check('OAS clawback shown when clawback>0',     RP.isBlockRelevant('oas_clawback', { p: {}, oasClbkYrs: 3 }, rpLite), true);
check('Asset location hidden for plain',         RP.isBlockRelevant('asset_location', { p: {} }, rpLite), false);

// Jargon swap spot-checks
console.log('\n\u2550\u2550\u2550 applyJargonSwap spot-checks \u2550\u2550\u2550\n');
const sw1 = RP.applyJargonSwap('Tax alpha of $50K reflects engine output.', rpLite, 'en');
check('jargon swap: tax alpha → tax savings', sw1.indexOf('tax savings') >= 0 && sw1.indexOf('tax alpha') < 0, true);
const sw2 = RP.applyJargonSwap('Tax alpha unchanged.', rpFull, 'en'); // jargonMode='technical' = no swap
check('jargon swap noop for technical mode', sw2.indexOf('Tax alpha') >= 0, true);

console.log(`\nFinal: ${pass}/${pass + fail} passed.\n`);
process.exit(fail === 0 ? 0 : 1);
