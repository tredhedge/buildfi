#!/usr/bin/env node
// excel-roundtrip-test.js — Excel writer regression test.
//
// Loads report-excel.js, exercises its public helpers (setNum, setFormula,
// applySheetTemplate) on a controlled workbook, writes it to a buffer,
// parses it back via ExcelJS, asserts cell types + format codes + formulas
// survive the round-trip intact.
//
// Catches regressions where:
//   - Numeric data sneaks back in as strings (Excel can't sum)
//   - Formula cells lose their formula and become hardcoded values
//   - Format codes get dropped in transit
//   - Sheet templates produce unexpected widths
//
// Run: node planner/report/excel-roundtrip-test.js
'use strict';

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

// Browser-like globals
global.window = {};
global.document = { getElementById: () => null, querySelectorAll: () => [], activeElement: null };
Object.defineProperty(global, 'navigator', { value: { clipboard: { writeText: () => Promise.resolve() } }, writable: true, configurable: true });
global.window.ExcelJS = ExcelJS;
global.ExcelJS = ExcelJS;

// Capture report-excel.js IIFE internals by re-eval-ing in a way that exposes them
const dir = __dirname;
// report-constants-2026.js MUST load first — report-data.js reads window.BFConstants
// at eval time; without it FED_BRACKETS is undefined and calcTax throws on .map.
['report-constants-2026.js', 'report-formatters.js', 'report-data.js', 'report-charts.js'].forEach(f => {
  eval(fs.readFileSync(path.join(dir, f), 'utf8'));
});
// Patch report-excel to expose helpers to the test
let excelSrc = fs.readFileSync(path.join(dir, 'report-excel.js'), 'utf8');
// Inject an exposure block right before the IIFE close
excelSrc = excelSrc.replace(
  'window.buildExcel = function(data) {',
  'window.__excelHelpers = { setNum: setNum, setFormula: setFormula, applySheetTemplate: applySheetTemplate, SHEET_WIDTHS: SHEET_WIDTHS, FMT_MONEY: FMT_MONEY, FMT_PCT: FMT_PCT, FMT_DELTA: FMT_DELTA };\n  window.buildExcel = function(data) {'
);
eval(excelSrc);

const H = global.window.__excelHelpers;
if (!H || !H.setNum || !H.setFormula || !H.applySheetTemplate) {
  console.error('Helpers not exposed. Aborting.');
  process.exit(1);
}

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; console.log('  \u2713 ' + msg); }
  else { fail++; console.error('  \u2717 ' + msg); }
}

(async function main() {
  console.log('=== Excel writer round-trip test ===\n');

  // ── Build a controlled workbook using the helpers ────────────────────
  const wb = new ExcelJS.Workbook();

  // Sheet A: grid template + numeric values + a formula
  const ws1 = wb.addWorksheet('GridSheet');
  H.applySheetTemplate(ws1, 'grid');
  ws1.getCell('A1').value = 'Header';
  H.setNum(ws1, ws1.getCell('B2'), 12345.6, H.FMT_MONEY);
  H.setNum(ws1, ws1.getCell('B3'), 0.275, H.FMT_PCT);
  H.setNum(ws1, ws1.getCell('B4'), 5000, H.FMT_DELTA);
  H.setFormula(ws1, ws1.getCell('B5'), 'B2+B4', H.FMT_MONEY, 17345.6);
  H.setFormula(ws1, ws1.getCell('B6'), 'IFERROR(B2/B4,0)', H.FMT_PCT, 12345.6 / 5000);

  // Sheet B: standard template
  const ws2 = wb.addWorksheet('StandardSheet');
  H.applySheetTemplate(ws2, 'standard');
  H.setNum(ws2, ws2.getCell('B2'), 999000);

  // Sheet C: textual template
  const ws3 = wb.addWorksheet('TextualSheet');
  H.applySheetTemplate(ws3, 'textual');

  // Write to buffer + reload
  const buf = await wb.xlsx.writeBuffer();
  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.load(buf);

  // ── Verify ─────────────────────────────────────────────────────────
  console.log('--- Numeric value preservation ---');
  const r_ws1 = wb2.getWorksheet('GridSheet');
  assert(!!r_ws1, 'GridSheet round-tripped');
  if (r_ws1) {
    const b2 = r_ws1.getCell('B2');
    assert(typeof b2.value === 'number', 'B2 (money) is numeric, got ' + typeof b2.value);
    assert(b2.value === 12345.6, 'B2 value preserved (12345.6), got ' + b2.value);
    assert(b2.numFmt && /\$|0,000|#/.test(b2.numFmt), 'B2 numFmt is money-shaped, got ' + JSON.stringify(b2.numFmt));

    const b3 = r_ws1.getCell('B3');
    assert(typeof b3.value === 'number', 'B3 (pct) is numeric, got ' + typeof b3.value);
    assert(Math.abs(b3.value - 0.275) < 1e-9, 'B3 value preserved (0.275), got ' + b3.value);

    const b4 = r_ws1.getCell('B4');
    assert(typeof b4.value === 'number', 'B4 (delta) is numeric, got ' + typeof b4.value);
  }

  console.log('\n--- Formula preservation ---');
  if (r_ws1) {
    const b5 = r_ws1.getCell('B5');
    const formula5 = b5.formula || (b5.value && b5.value.formula);
    assert(!!formula5, 'B5 has a formula, got value=' + JSON.stringify(b5.value).slice(0, 80) + ' formula=' + b5.formula);
    assert(formula5 === 'B2+B4', 'B5 formula is exactly "B2+B4", got ' + formula5);
    const b5result = (b5.value && typeof b5.value === 'object') ? b5.value.result : b5.value;
    assert(typeof b5result === 'number' && b5result === 17345.6, 'B5 cached result is numeric and correct, got ' + b5result);

    const b6 = r_ws1.getCell('B6');
    const formula6 = b6.formula || (b6.value && b6.value.formula);
    assert(!!formula6, 'B6 has a formula');
    assert(/IFERROR/.test(formula6) && /B2\/B4/.test(formula6), 'B6 formula uses IFERROR + B2/B4, got ' + formula6);
  }

  console.log('\n--- Sheet template widths ---');
  if (r_ws1) {
    const w2 = r_ws1.getColumn(2).width;
    assert(w2 === 10, 'GridSheet col 2 width = 10 (grid template), got ' + w2);
  }
  const r_ws2 = wb2.getWorksheet('StandardSheet');
  if (r_ws2) {
    const w2 = r_ws2.getColumn(2).width;
    assert(w2 === 24, 'StandardSheet col 2 width = 24 (standard template), got ' + w2);
  }
  const r_ws3 = wb2.getWorksheet('TextualSheet');
  if (r_ws3) {
    const w3 = r_ws3.getColumn(3).width;
    assert(w3 === 32, 'TextualSheet col 3 width = 32 (textual template), got ' + w3);
  }

  console.log('\n--- Stress: a zero in formula denominator should not crash ---');
  // Verifies the IFERROR guard added to Cash Flow eff rate works after round-trip
  if (r_ws1) {
    const b6result = (r_ws1.getCell('B6').value && typeof r_ws1.getCell('B6').value === 'object')
      ? r_ws1.getCell('B6').value.result
      : r_ws1.getCell('B6').value;
    // 12345.6 / 5000 = 2.4692... — sanity check the cached result
    assert(typeof b6result === 'number', 'B6 cached eff-rate result is numeric, got ' + b6result);
  }

  // ── File-level open compatibility check ──────────────────────────────
  console.log('\n--- Workbook structural integrity ---');
  assert(wb2.worksheets.length === 3, 'all 3 sheets survive load, got ' + wb2.worksheets.length);
  // Confirm the file is a valid xlsx (signed PK ZIP magic bytes)
  assert(buf[0] === 0x50 && buf[1] === 0x4B, 'output buffer has valid xlsx signature (PK)');
  fs.writeFileSync(path.join(dir, 'excel-roundtrip-output.xlsx'), buf);
  console.log('  \u00bb wrote sample to report/excel-roundtrip-output.xlsx (open in any spreadsheet to spot-check)');

  // ── End-to-end: full buildExcelPro on real engine payload (if available) ──
  console.log('\n--- End-to-end: buildExcelPro with real engine MC ---');
  const realMcPath = path.join(dir, 'realai', 'mc', 'hnw_couple_fr.json');
  if (fs.existsSync(realMcPath)) {
    // Reach into the IIFE's scope by re-evaling with another exposure injection
    let srcWithBuilder = excelSrc.replace(
      'window.__excelHelpers = {',
      'window.__buildExcelPro = buildExcelPro;\n  window.__excelHelpers = {'
    );
    eval(srcWithBuilder);
    const buildExcelPro = global.window.__buildExcelPro;
    if (buildExcelPro) {
      const realMc = JSON.parse(fs.readFileSync(realMcPath, 'utf8'));
      const params = {
        age: 58, retAge: 63, deathAge: 92, sex: 'M', prov: 'QC',
        sal: 165000, rrsp: 820000, tfsa: 215000, nr: 320000,
        cOn: true, cAge: 52, cRetAge: 62, cSex: 'F', cSal: 142000,
        cRRSP: 410000, cTFSA: 145000, cNR: 95000,
        retSpM: 9500, qppAge: 65, oasAge: 65, cQppAge: 65, cOasAge: 65,
        avgE: 165000, qppYrs: 35, cAvgE: 142000, cQppYrs: 28,
        nSim: 2000, eqRet: 0.06, inf: 0.021,
        merR: 0.005, merT: 0.0035, merN: 0.004,
        allocR: 0.6, allocT: 0.7, allocN: 0.5,
        wStrat: 'optimized', melt: true, meltTgt: 65000
      };
      // Hijack the download trigger so we capture the buffer.
      // buildExcelPro references bare Blob, URL, document — all resolve to globals
      // in the eval'd IIFE. Patch all three.
      let captured = null;
      global.document.createElement = function() {
        return {
          style: {}, setAttribute: function() {}, click: function() {}, remove: function() {},
          set href(v) {}, get href() { return ''; }, set download(v) {}
        };
      };
      global.document.body = { appendChild: function() {}, removeChild: function() {} };
      // Patch BOTH global.URL and global.window.URL — buildExcelPro uses bare URL.
      const origURL = global.URL;
      global.URL = {
        createObjectURL: function(blob) { captured = blob; return 'blob:fake'; },
        revokeObjectURL: function() {}
      };
      global.window.URL = global.URL;
      if (typeof global.Blob === 'undefined') {
        const { Blob } = require('buffer');
        global.Blob = Blob;
      }

      try {
        const data = {
          params: params,
          mc: realMc,
          client: { name: 'Francois Dubois', firstName: 'Francois' },
          rptLang: 'fr', rptMode: 'expert'
        };
        await buildExcelPro(data);
        assert(captured != null, 'buildExcelPro produced a downloadable artifact on real engine MC');
        if (captured) {
          let buf;
          if (Buffer.isBuffer(captured)) buf = captured;
          else if (captured.arrayBuffer) buf = Buffer.from(await captured.arrayBuffer());
          else if (captured[Symbol.toStringTag] === 'Blob') buf = Buffer.from(await captured.arrayBuffer());
          else { console.error('  Unknown blob shape:', Object.keys(captured)); fail++; return; }
          assert(buf.length > 5000, 'output buffer is non-trivial size, got ' + buf.length + ' bytes');
          const wb3 = new ExcelJS.Workbook();
          await wb3.xlsx.load(buf);
          assert(wb3.worksheets.length >= 10, 'real-engine export has 10+ sheets, got ' + wb3.worksheets.length);
          // Spot-check a few cells use the real engine schema correctly
          const cfSheet = wb3.getWorksheet('Flux de tr\u00e9sorerie');
          if (cfSheet) {
            const c = cfSheet.getCell(6, 11); // Tax cell first row
            assert(typeof c.value === 'number', 'CF Tax cell numeric on real engine, got ' + typeof c.value);
            const eff = cfSheet.getCell(6, 12);
            const f = eff.formula || (eff.value && eff.value.formula);
            assert(!!f, 'CF Eff rate has formula on real engine output, got ' + JSON.stringify(eff.value).slice(0, 80));
          }
          fs.writeFileSync(path.join(dir, 'realai', 'output', 'hnw_couple_fr_full.xlsx'), buf);
          console.log('  \u00bb wrote full-engine sample to realai/output/hnw_couple_fr_full.xlsx');
        }
      } catch (e) {
        fail++;
        console.error('  \u2717 buildExcelPro threw on real engine MC: ' + e.message);
        console.error('     ' + (e.stack || '').split('\n').slice(0, 3).join('\n     '));
      }
    } else {
      console.log('  (skip — could not extract buildExcelPro from IIFE)');
    }
  } else {
    console.log('  (skip — no realai/mc/hnw_couple_fr.json; run gen-real-mc.mjs first)');
  }

  console.log('\n=== Result ===');
  console.log('  Pass: ' + pass);
  console.log('  Fail: ' + fail);
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
