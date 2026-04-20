// report-excel.js — BuildFi Professional 14-Tab XLSX Export (ExcelJS)
// Depends on: report-formatters.js (window.BFmt), report-data.js (window.BData)
// Optional: ExcelJS (window.ExcelJS), SheetJS (window.XLSX)
// Exports: window.buildExcel(data)
(function() {
  "use strict";

  // ══════════════════════════════════════════════════════════════
  // BRAND PALETTE (ARGB for ExcelJS) — Gold / Cream Pro export
  // ══════════════════════════════════════════════════════════════
  var CL = {
    gold:      "FFC4944A",
    white:     "FFFFFFFF",
    dark:      "FF2C2418",
    text:      "FF333333",
    muted:     "FF888888",
    link:      "FF1D4ED8",
    green:     "FF2A6B3C",
    greenBg:   "FFE8F5E9",
    red:       "FFB83838",
    redBg:     "FFFCE4E4",
    gradeA:    "FF2A8C46",
    gradeB:    "FF4680C0",
    gradeC:    "FFE0882A",
    gradeD:    "FFCC4444",
    rowAlt:    "FFF9F7F2",
    border:    "FFD6D0C4",
    borderMed: "FF94A3B8",
    bg:        "FFFAF6EF",
    cardBg:    "FFFAF6EF",
    phaseBg:   "FFF5EDE0",
    phaseText: "FFA07830",
    mcBlue:    "FFE3EEF8",
    cccccc:    "FFCCCCCC"
  };

  // ── Reusable style objects ──
  var THIN = function(c) { return { style: "thin", color: { argb: c || CL.border } }; };
  var BORDER_ALL = { top: THIN(), left: THIN(), bottom: THIN(), right: THIN() };
  var HDR_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: CL.gold } };
  var HDR_FONT = { name: "Calibri", size: 11, bold: true, color: { argb: CL.white } };
  var ALT_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: CL.rowAlt } };
  var BODY_FONT = { name: "Calibri", size: 11, color: { argb: CL.text } };
  var TITLE_FONT = function(sz) { return { name: "Calibri", size: sz || 13, bold: true, color: { argb: CL.gold } }; };
  var SUB_FONT = { name: "Calibri", size: 10, color: { argb: CL.muted }, italic: true };
  var LEGAL_FONT = { name: "Calibri", size: 9, color: { argb: CL.borderMed }, italic: true };
  var DARK_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: CL.dark } };
  var CARD_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: CL.cardBg } };
  var PHASE_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: CL.phaseBg } };
  var MC_BLUE_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: CL.mcBlue } };

  // ── Number formats ──
  var FMT_MONEY = '#,##0" $"';
  var FMT_MONEY_RED = '#,##0" $";[Red](#,##0" $");"-"';
  var FMT_PCT = '0.0"%"';
  var FMT_PCT_INT = '0"%"';
  var FMT_DELTA = '+#,##0;-#,##0;0';

  // ══════════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════════
  function toNum(v) { var n = Number(v); return Number.isFinite(n) ? n : 0; }
  function _fmtInt(v, loc) { return Math.round(toNum(v)).toLocaleString(loc); }
  function _fmtM(v, loc) { return _fmtInt(v, loc) + " $"; }
  function _fmtK(v, loc) { return Math.round(toNum(v) / 1000).toLocaleString(loc) + " K$"; }
  function _fmtP(v, d, fr) { var n = (toNum(v) * 100).toFixed(d == null ? 1 : d); return (fr ? n.replace(".", ",") : n) + " %"; }

  // Letter → ARGB color for Excel. Thresholds come from BFmt.grade (single source of truth
  // shared with PDF renderer). A plan's letter grade is identical in HTML and Excel.
  var _EXCEL_GRADE_COLOR = {
    "A+": CL.gradeA, "A": CL.gradeA, "A-": CL.gradeA,
    "B+": CL.gradeB, "B": CL.gradeB, "B-": CL.gradeB,
    "C+": CL.gradeC, "C": CL.gradeC, "C-": CL.gradeC,
    "D": CL.gradeD, "F": CL.gradeD
  };
  function gradeFor(succ) {
    var s = toNum(succ);
    var g = (window.BFmt && window.BFmt.grade) ? window.BFmt.grade(s, false) : null;
    var letter = g ? g.letter : "F";
    return { g: letter, c: _EXCEL_GRADE_COLOR[letter] || CL.gradeD };
  }

  // ── ExcelJS cell helpers ──
  function _cell(ws, addr) { return (addr && typeof addr === "object" && addr.value !== undefined) ? addr : ws.getCell(addr); }
  function set(ws, addr, val) { if (!ws) return; _cell(ws, addr).value = (val == null ? "" : val); }
  function setNum(ws, addr, val, fmt) {
    if (!ws) return;
    var c = _cell(ws, addr);
    c.value = toNum(val);
    if (fmt) c.numFmt = fmt;
  }
  // Write a formula cell with a cached result. Excel/LibreOffice/Sheets all show
  // the result until recalc; the formula is visible in the formula bar making
  // the export auditable instead of opaque.
  function setFormula(ws, addr, formula, fmt, cachedResult) {
    if (!ws) return;
    var c = _cell(ws, addr);
    c.value = { formula: formula, result: (cachedResult != null && !isNaN(cachedResult)) ? cachedResult : 0 };
    if (fmt) c.numFmt = fmt;
  }
  function setRow(ws, row, startCol, arr) {
    if (!ws) return;
    for (var i = 0; i < arr.length; i++) ws.getCell(row, startCol + i).value = (arr[i] == null ? "" : arr[i]);
  }
  function setColWidths(ws, widths) {
    if (!ws || !widths) return;
    for (var i = 0; i < widths.length; i++) ws.getColumn(i + 1).width = widths[i];
  }

  // ── Sheet width templates ───────────────────────────────────────────────
  // Earlier each of the 14 sheets defined its own width array, producing 14
  // unique layouts. Three templates cover all real cases. setColWidths still
  // accepts a raw array for sheets with truly bespoke needs.
  // Convention: col 1 = gutter (3), col 2 = label column (varies), cols 3..N = data.
  var SHEET_WIDTHS = {
    // Numeric grids (Cash Flow, MC, Projection — wide data, narrow labels)
    grid:     [3, 10, 8, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14],
    // Mixed (Sommaire, Tax, Sensibilité — wider labels, ~14-col data block)
    standard: [3, 24, 18, 18, 18, 18, 18, 14, 14, 14, 14, 14, 14, 14],
    // Text-heavy (Méthodologie, Profil — long descriptions, fewer numeric cols)
    textual:  [3, 26, 32, 42, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14]
  };
  function applySheetTemplate(ws, kind, override) {
    setColWidths(ws, override || SHEET_WIDTHS[kind] || SHEET_WIDTHS.standard);
  }

  // ── Tab banner: row 1 = spacer (h=8), row 2 = title merged B:N, row 3 = subtitle merged B:N ──
  function addTabBanner(ws, title, subtitle, ncols) {
    ncols = ncols || 14;
    ws.getRow(1).height = 8;
    ws.mergeCells(2, 2, 2, ncols);
    var tc = ws.getCell(2, 2);
    tc.value = title;
    tc.font = { name: "Calibri", size: 15, bold: true, color: { argb: CL.text } };
    tc.alignment = { horizontal: "left", vertical: "middle" };
    ws.getRow(2).height = 28;
    if (subtitle) {
      ws.mergeCells(3, 2, 3, ncols);
      var sc = ws.getCell(3, 2);
      sc.value = subtitle;
      sc.font = { name: "Calibri", size: 11, italic: true, color: { argb: CL.muted } };
      sc.alignment = { horizontal: "left", vertical: "middle" };
      ws.getRow(3).height = 16;
    }
  }

  // ── Section title within a sheet (gold text, height=24) ──
  function addTitle(ws, row, col, text, sub, span) {
    if (!ws) return;
    span = span || 13;
    ws.mergeCells(row, col, row, col + span - 1);
    var c = ws.getCell(row, col);
    c.value = text; c.font = TITLE_FONT(13);
    c.alignment = { horizontal: "left", vertical: "middle" };
    ws.getRow(row).height = 24;
    if (sub) {
      ws.mergeCells(row + 1, col, row + 1, col + span - 1);
      var s = ws.getCell(row + 1, col);
      s.value = sub; s.font = SUB_FONT;
      s.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      ws.getRow(row + 1).height = 16;
    }
  }

  // ── Style a table: gold header fill, alternating warm cream rows, borders, h=19 ──
  function styleTable(ws, cfg) {
    if (!ws || !cfg) return;
    var hr = cfg.hr, fr = cfg.fr || (hr + 1), to = cfg.to || fr;
    var fc = cfg.fc || 1, lc = cfg.lc || fc;
    ws.getRow(hr).height = 30;
    for (var c = fc; c <= lc; c++) {
      var hc = ws.getCell(hr, c);
      hc.font = HDR_FONT;
      hc.fill = HDR_FILL;
      hc.alignment = { vertical: "middle", horizontal: c === fc ? "left" : "right", wrapText: true };
      hc.border = { top: THIN(CL.borderMed), left: THIN(CL.borderMed), bottom: THIN(CL.borderMed), right: THIN(CL.borderMed) };
    }
    for (var r = fr; r <= to; r++) {
      ws.getRow(r).height = 19;
      for (var cc = fc; cc <= lc; cc++) {
        var cell = ws.getCell(r, cc);
        if (r % 2 === 0) cell.fill = ALT_FILL;
        cell.border = BORDER_ALL;
        cell.alignment = { vertical: "middle", horizontal: cc === fc ? "left" : "right" };
        if (!cell.font || !cell.font.name) cell.font = BODY_FONT;
      }
    }
    ws.views = [{ state: "frozen", ySplit: hr }];
    ws.autoFilter = { from: { row: hr, column: fc }, to: { row: hr, column: lc } };
  }

  function printSetup(ws) {
    if (!ws) return;
    ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
    ws.headerFooter = { oddFooter: "&L&8BuildFi Technologies inc.&C&8Page &P / &N&R&8&D" };
  }

  function footer(ws, row) {
    if (!ws) return;
    var y = new Date().getFullYear();
    ws.mergeCells(row, 2, row, 14);
    ws.getCell(row, 2).value = "BuildFi Technologies inc. \u2014 buildfi.ca  \u2022  Outil informatif. Ne constitue pas un conseil financier. \u00A9 " + y;
    ws.getCell(row, 2).font = LEGAL_FONT;
  }

  function clearRows(ws, from, to, cols) {
    if (!ws) return;
    for (var r = from; r <= to; r++) for (var c = 1; c <= cols; c++) ws.getCell(r, c).value = "";
  }

  // ── Sommaire dark banner (rows 1-5) ──
  function addSommaireBanner(ws, name, date, ncols, fr) {
    ncols = ncols || 14;
    // Fill rows 1-5 with dark background
    for (var br = 1; br <= 5; br++) {
      for (var bc = 1; bc <= ncols; bc++) ws.getCell(br, bc).fill = DARK_FILL;
    }
    // Row 1: title in gold sz22 bold
    ws.mergeCells(1, 2, 1, ncols);
    ws.getCell(1, 2).value = fr ? "RAPPORT D\u00c9TAILL\u00c9" : "DETAILED REPORT";
    ws.getCell(1, 2).font = { name: "Calibri", size: 22, bold: true, color: { argb: CL.gold } };
    ws.getCell(1, 2).alignment = { horizontal: "left", vertical: "middle" };
    ws.getRow(1).height = 34;
    // Row 2: subtitle in gold sz13
    ws.mergeCells(2, 2, 2, ncols);
    ws.getCell(2, 2).value = fr ? "Donn\u00e9es financi\u00e8res d\u00e9taill\u00e9es" : "Detailed financial data";
    ws.getCell(2, 2).font = { name: "Calibri", size: 13, color: { argb: CL.gold } };
    ws.getCell(2, 2).alignment = { horizontal: "left", vertical: "middle" };
    ws.getRow(2).height = 20;
    // Row 3: "Préparé pour {name} — {date}" in white sz16 bold
    ws.mergeCells(3, 2, 3, ncols);
    ws.getCell(3, 2).value = (fr ? "Pr\u00e9par\u00e9 pour " : "Prepared for ") + name + " \u2014 " + date;
    ws.getCell(3, 2).font = { name: "Calibri", size: 16, bold: true, color: { argb: CL.white } };
    ws.getCell(3, 2).alignment = { horizontal: "left", vertical: "middle" };
    ws.getRow(3).height = 24;
    // Row 4: "BuildFi Technologies inc. • buildfi.ca" in #CCCCCC
    ws.mergeCells(4, 2, 4, ncols);
    ws.getCell(4, 2).value = "BuildFi Technologies inc. \u2022 buildfi.ca";
    ws.getCell(4, 2).font = { name: "Calibri", size: 10, color: { argb: CL.cccccc } };
    ws.getCell(4, 2).alignment = { horizontal: "left", vertical: "middle" };
    ws.getRow(4).height = 18;
    // Row 5: spacer h=12, still dark bg
    ws.getRow(5).height = 12;
  }

  // ── Delta cell: green for positive, red for negative ──
  function setDelta(ws, addr, val, fmt) {
    if (!ws) return;
    var c = _cell(ws, addr);
    var n = toNum(val);
    c.value = n;
    if (fmt) c.numFmt = fmt;
    if (n > 0) {
      c.font = { name: "Calibri", size: 11, bold: true, color: { argb: CL.green } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CL.greenBg } };
    } else if (n < 0) {
      c.font = { name: "Calibri", size: 11, bold: true, color: { argb: CL.red } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CL.redBg } };
    }
  }

  // ── Negative-aware number: red font for negative values ──
  function setNumSigned(ws, addr, val, fmt) {
    if (!ws) return;
    var c = _cell(ws, addr);
    var n = toNum(val);
    c.value = n;
    if (fmt) c.numFmt = fmt;
    if (n < 0) c.font = { name: "Calibri", size: 11, color: { argb: CL.red } };
  }

  // ── Phase header row: gold tint bg, dark gold text ──
  function addPhaseHeader(ws, row, col, text, span) {
    span = span || 9;
    ws.mergeCells(row, col, row, col + span - 1);
    var c = ws.getCell(row, col);
    c.value = text;
    c.font = { name: "Calibri", size: 12, bold: true, color: { argb: CL.phaseText } };
    c.alignment = { horizontal: "left", vertical: "middle" };
    for (var cc = col; cc <= col + span - 1; cc++) {
      ws.getCell(row, cc).fill = PHASE_FILL;
    }
    ws.getRow(row).height = 24;
  }

  // ══════════════════════════════════════════════════════════════
  // PRO ExcelJS PATH
  // ══════════════════════════════════════════════════════════════
  async function buildExcelPro(data) {
    var D = window.BData;
    if (!D) throw new Error("report-data.js not loaded");
    var mc = data.mc || {};
    var p = data.params || {};
    var client = data.client || {};
    var fr = (data.rptLang || p.lang || "fr") === "fr";
    var locale = fr ? "fr-CA" : "en-CA";
    var mode = data.rptMode || p.mode || "standard";
    var cName = client.name || (fr ? "Client" : "Client");

    // ── Extract params ──
    var age = p.age || 0, retAge = p.retAge || 65, deathAge = p.deathAge || 95;
    var sal = p.sal || 0, retSpM = p.retSpM || 0;
    var rrsp = p.rrsp || 0, tfsa = p.tfsa || 0, nr = p.nr || 0;
    var rrspC = p.rrspC || 0, tfsaC = p.tfsaC || 0, nrC = p.nrC || 0;
    var fhsaBal = p.fhsaBal || 0, fhsaC = p.fhsaC || 0;
    var allocR = p.allocR || 0.6, allocT = p.allocT || 0.6, allocN = p.allocN || 0.6;
    var merR = p.merR || 0, merT = p.merT || 0, merN = p.merN || 0;
    var qppAge = p.qppAge || 65, avgE = p.avgE || 0, qppYrs = p.qppYrs || 0;
    var oasAge = p.oasAge || 65;
    var prov = p.prov || "QC", inf = p.inf || 0.021, nSim = p.nSim || 5000;
    var wStrat = p.wStrat || "optimized";
    var goP = p.goP || 0, slP = p.slP || 0, noP = p.noP || 0;
    var fatT = p.fatT, stochInf = p.stochInf, stochMort = p.stochMort;
    var cOn = p.cOn, cRetSpM = p.cRetSpM || 0;
    var cQppAge = p.cQppAge || 65, cAvgE = p.cAvgE || 0, cQppYrs = p.cQppYrs || 0, cOasAge = p.cOasAge || 65;
    var props = p.props || [];
    var bizOn = p.bizOn;
    var samResults = p.samResults || [];
    var stressResults = p.stressResults || window._autoStress || [];
    var lifeInsBenefit = p.lifeInsBenefit || 0;

    var calcQPP = D.calcQPP, calcOAS = D.calcOAS, calcTax = D.calcTax;
    var OAS_CLAWBACK_THR = D.OAS_CLAWBACK_THR;

    // ── Derived metrics ──
    var revD = mc.medRevData || [];
    var y0 = new Date().getFullYear();
    var todayLong = new Date().toLocaleDateString(fr ? "fr-CA" : "en-CA", { year: "numeric", month: "long", day: "numeric" });
    var baseName = (cName || "plan").toString().replace(/[^\w\-]+/g, "-").replace(/\-+/g, "-").replace(/^\-|\-$/g, "");
    var filename = "buildfi-donnees-detaillees-" + (baseName || "plan") + "-" + new Date().toISOString().slice(0, 10) + ".xlsx";

    var gr = gradeFor(mc.succ);
    // Static snapshots — used by P&L tables ("Projected government income") and as fallback.
    // Spouse income passed individually to calcOAS so each clawback uses individual taxable income.
    var qppM2 = calcQPP(qppAge, avgE, qppYrs);
    var oasM2 = calcOAS(oasAge, retSpM * 12);
    var cQppM2 = cOn ? calcQPP(cQppAge, cAvgE, cQppYrs) : 0;
    var cOasM2 = cOn ? calcOAS(cOasAge, cRetSpM * 12) : 0;
    var totalSpM = retSpM + (cOn ? cRetSpM : 0);

    // Path-derived steady state — same logic as report-data.js so KPIs match HTML report.
    var _retPathRowsX = revD.filter(function(r) { return toNum(r.age) >= retAge; });
    var _bothOnRowsX = _retPathRowsX.filter(function(r) { return toNum(r.rrq) > 0 && toNum(r.psv) > 0; });
    var _useRowsX = _bothOnRowsX.length > 0 ? _bothOnRowsX : _retPathRowsX;
    var govM, covRatio;
    if (_useRowsX.length > 0) {
      var _avgGovY = _useRowsX.reduce(function(s, r) { return s + toNum(r.rrq) + toNum(r.psv) + toNum(r.pen); }, 0) / _useRowsX.length;
      var _avgSpY = _useRowsX.reduce(function(s, r) { return s + toNum(r.sp || r.spending || r.spend); }, 0) / _useRowsX.length;
      govM = _avgGovY / 12;
      covRatio = _avgSpY > 0 ? _avgGovY / _avgSpY : 0;
    } else {
      govM = qppM2 + oasM2 + cQppM2 + cOasM2;
      covRatio = totalSpM > 0 ? govM / totalSpM : 0;
    }
    var optTax = revD.reduce(function(s, r) { return s + toNum(r.tax); }, 0);
    var hasNaive = wStrat === "optimized" && mc._naiveMC && mc._naiveMC.medRevData;
    var naiveRev = hasNaive ? (mc._naiveMC.medRevData || []) : [];
    var naiveTax = hasNaive ? naiveRev.reduce(function(s, r) { return s + toNum(r.tax); }, 0) : 0;
    var taxAlpha = hasNaive ? (naiveTax - optTax) : 0;
    var naiveSucc = hasNaive ? toNum(mc._naiveMC.succ) : null;
    var succDelta = hasNaive ? (toNum(mc.succ) - naiveSucc) * 100 : null;
    var medDelta = hasNaive ? (toNum(mc.rMedF || mc.medF) - toNum(mc._naiveMC.rMedF || mc._naiveMC.medF)) : null;
    function _oasThrFor(rowAge) {
      var yr = Math.max(0, toNum(rowAge) - age);
      return OAS_CLAWBACK_THR * Math.pow(1 + inf, yr);
    }
    var oasYears = revD.filter(function(r) { return toNum(r.taxInc) > _oasThrFor(r.age); }).length;
    var oasYearsN = hasNaive ? naiveRev.filter(function(r) { return toNum(r.taxInc) > _oasThrFor(r.age); }).length : null;
    var avgEffOpt = optTax > 0 ? optTax / Math.max(1, revD.reduce(function(s, r) { return s + toNum(r.taxInc); }, 0)) : 0;
    var avgEffN = hasNaive && naiveTax > 0 ? naiveTax / Math.max(1, naiveRev.reduce(function(s, r) { return s + toNum(r.taxInc); }, 0)) : null;
    var pDret = (mc.pD || []).find(function(r) { return r.age === retAge; }) || {};
    var pDend = (mc.pD || []).length > 0 ? mc.pD[mc.pD.length - 1] : {};

    // ── Workbook ──
    var wb = new ExcelJS.Workbook();
    wb.creator = "BuildFi Technologies inc.";
    wb.created = new Date();
    wb.calcProperties = { fullCalcOnLoad: true };

    var coverName = fr ? "00 - Couverture" : "00 - Cover";
    var readmeName = "01 - README";

    // Try load logo
    var logoId = null;
    try {
      if (window.BF_LOGO_PNG_B64) {
        logoId = wb.addImage({ base64: "data:image/png;base64," + window.BF_LOGO_PNG_B64, extension: "png" });
      }
    } catch (_) {}

    // ────────────────────────────────────────────────────────────
    // SHEET 0: COVER (created first so it appears as first tab)
    // ────────────────────────────────────────────────────────────
    var wsCover = wb.addWorksheet(coverName);

    // ────────────────────────────────────────────────────────────
    // SHEET 0B: README (created second)
    // ────────────────────────────────────────────────────────────
    var wsReadme = wb.addWorksheet(readmeName);

    // ────────────────────────────────────────────────────────────
    // SHEET 1: SOMMAIRE — dark banner + KPI cards
    // ────────────────────────────────────────────────────────────
    var wsS = wb.addWorksheet(fr ? "Sommaire" : "Summary");
    setColWidths(wsS, [3, 18, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14]);
    printSetup(wsS);

    // Dark banner rows 1-5
    addSommaireBanner(wsS, cName, todayLong, 14, fr);

    // ── KPI Cards (rows 7-10) ──
    addTitle(wsS, 7, 2, fr ? "INDICATEURS CL\u00c9S" : "KEY INDICATORS", "", 13);

    // KPI values in row 8 (height=48): sz22 bold gold on cream bg
    var kpiCardBorder = { top: THIN(CL.border), left: THIN(CL.border), bottom: THIN(CL.border), right: THIN(CL.border) };
    var kpiMerges = [[2,3],[4,5],[6,7],[8,9],[10,11],[12,13]];
    var kpiLabels = [
      fr ? "Note du plan" : "Plan grade",
      fr ? "Succ\u00e8s MC" : "MC Success",
      fr ? "Patrimoine ret." : "Ret. wealth",
      fr ? "Rev. garantis" : "Guaranteed inc.",
      fr ? "Couverture" : "Coverage",
      fr ? "Alpha fiscal" : "Tax alpha"
    ];
    // Row 8: KPI values (h=48)
    wsS.getRow(8).height = 48;
    kpiMerges.forEach(function(m) { wsS.mergeCells(8, m[0], 8, m[1]); });
    // Row 9: KPI labels (h=18)
    wsS.getRow(9).height = 18;
    kpiMerges.forEach(function(m, i) {
      wsS.mergeCells(9, m[0], 9, m[1]);
      wsS.getCell(9, m[0]).value = kpiLabels[i];
      wsS.getCell(9, m[0]).font = { name: "Calibri", size: 10, color: { argb: CL.muted } };
      wsS.getCell(9, m[0]).alignment = { horizontal: "center", vertical: "middle" };
      wsS.getCell(9, m[0]).fill = CARD_FILL;
      wsS.getCell(9, m[0]).border = kpiCardBorder;
    });

    // KPI value cells styling — cream bg, border, centered
    kpiMerges.forEach(function(m) {
      var c = wsS.getCell(8, m[0]);
      c.fill = CARD_FILL;
      c.border = kpiCardBorder;
      c.alignment = { horizontal: "center", vertical: "middle" };
    });

    // Grade
    wsS.getCell(8, 2).value = gr.g;
    wsS.getCell(8, 2).font = { name: "Calibri", size: 22, bold: true, color: { argb: gr.c } };
    // MC success
    wsS.getCell(8, 4).value = toNum(mc.succ);
    wsS.getCell(8, 4).numFmt = "0%";
    wsS.getCell(8, 4).font = { name: "Calibri", size: 22, bold: true, color: { argb: CL.gold } };
    // Retirement wealth (K$)
    var retWealth = toNum(mc.rMedF || mc.medF || 0);
    wsS.getCell(8, 6).value = Math.round(retWealth / 1000);
    wsS.getCell(8, 6).numFmt = '#,##0" K$"';
    wsS.getCell(8, 6).font = { name: "Calibri", size: 22, bold: true, color: { argb: CL.gold } };
    // Guaranteed income
    wsS.getCell(8, 8).value = Math.round(govM);
    wsS.getCell(8, 8).numFmt = '#,##0" $/m"';
    wsS.getCell(8, 8).font = { name: "Calibri", size: 22, bold: true, color: { argb: CL.gold } };
    // Coverage
    wsS.getCell(8, 10).value = covRatio;
    wsS.getCell(8, 10).numFmt = "0%";
    wsS.getCell(8, 10).font = { name: "Calibri", size: 22, bold: true, color: { argb: CL.gold } };
    // Tax alpha
    wsS.getCell(8, 12).value = Math.max(0, Math.round(taxAlpha / 1000));
    wsS.getCell(8, 12).numFmt = '#,##0" K$"';
    wsS.getCell(8, 12).font = { name: "Calibri", size: 22, bold: true, color: { argb: CL.gold } };

    // Confidence row
    var conf = [];
    if (covRatio >= 1) conf.push(fr ? "Forte couverture" : "Strong coverage");
    else if (covRatio >= 0.7) conf.push(fr ? "Couverture mod\u00e9r\u00e9e" : "Moderate coverage");
    else conf.push(fr ? "Couverture faible" : "Weak coverage");
    if (mc.p5Ruin >= 999) conf.push(fr ? "Aucun risque d'\u00e9puisement P5" : "No P5 depletion risk");
    else conf.push(fr ? "\u00c9puisement P5 \u00e0 " + mc.p5Ruin + " ans" : "P5 depletion at age " + mc.p5Ruin);
    wsS.mergeCells(11, 2, 11, 14);
    set(wsS, wsS.getCell(11, 2), conf.join("  \u2022  "));
    wsS.getCell(11, 2).font = SUB_FONT;

    // ── Comparison table ──
    addTitle(wsS, 13, 2, fr ? "COMPARAISON: OPTIMIS\u00c9 vs PAR D\u00c9FAUT" : "COMPARISON: OPTIMIZED vs DEFAULT",
      fr ? "Impact net des strat\u00e9gies fiscales actives" : "Net impact of active tax strategies", 13);
    setRow(wsS, 16, 2, [fr ? "M\u00e9trique" : "Metric", fr ? "Votre plan" : "Your plan", fr ? "Par d\u00e9faut" : "Default", "Delta", "Notes"]);
    styleTable(wsS, { hr: 16, fr: 17, to: 23, fc: 2, lc: 6 });

    // Comparison rows — col C = your plan, col D = default, col E = delta as
    // formula so the user can see "delta = your - default" in the formula bar.
    setRow(wsS, 17, 2, [fr ? "Succ\u00e8s MC" : "MC Success"]);
    setNum(wsS, wsS.getCell(17, 3), mc.succ || 0, "0%");
    if (naiveSucc != null) setNum(wsS, wsS.getCell(17, 4), naiveSucc, "0%");
    if (succDelta != null) {
      // Delta in pts = (your% - default%) * 100; formula uses raw ratios in C/D
      setFormula(wsS, wsS.getCell(17, 5), '(C17-D17)*100', '+0" pts";-0" pts";0" pts"', succDelta);
      if (succDelta < 0) wsS.getCell(17, 5).font = { name: "Calibri", size: 11, bold: true, color: { argb: CL.red } };
      else if (succDelta > 0) wsS.getCell(17, 5).font = { name: "Calibri", size: 11, bold: true, color: { argb: CL.green } };
    }
    set(wsS, wsS.getCell(17, 6), nSim + " sims");

    setRow(wsS, 18, 2, [fr ? "Imp\u00f4t total nominal" : "Total nominal tax"]);
    setNum(wsS, wsS.getCell(18, 3), optTax, FMT_MONEY);
    if (hasNaive) setNum(wsS, wsS.getCell(18, 4), naiveTax, FMT_MONEY);
    if (hasNaive) {
      setFormula(wsS, wsS.getCell(18, 5), 'C18-D18', FMT_MONEY, -Math.max(0, taxAlpha));
      if (taxAlpha > 0) wsS.getCell(18, 5).font = { name: "Calibri", size: 11, bold: true, color: { argb: CL.green } };
    }

    setRow(wsS, 19, 2, [fr ? "Imp\u00f4t total r\u00e9el" : "Total real tax"]);
    setNum(wsS, wsS.getCell(19, 3), Math.round(optTax / Math.pow(1 + inf, 12)), FMT_MONEY);
    if (hasNaive) setNum(wsS, wsS.getCell(19, 4), Math.round(naiveTax / Math.pow(1 + inf, 12)), FMT_MONEY);
    set(wsS, wsS.getCell(19, 6), fr ? "Actualis\u00e9" : "Discounted");

    setRow(wsS, 20, 2, [fr ? "Patrimoine m\u00e9dian" : "Median wealth"]);
    setNum(wsS, wsS.getCell(20, 3), mc.rMedF || mc.medF || 0, FMT_MONEY);
    if (hasNaive) setNum(wsS, wsS.getCell(20, 4), mc._naiveMC.rMedF || mc._naiveMC.medF || 0, FMT_MONEY);
    if (medDelta != null) setDelta(wsS, wsS.getCell(20, 5), medDelta, FMT_DELTA);

    setRow(wsS, 21, 2, [fr ? "H\u00e9ritage net" : "Net estate"]);
    setNum(wsS, wsS.getCell(21, 3), mc.medEstateNet || 0, FMT_MONEY);
    if (hasNaive) setNum(wsS, wsS.getCell(21, 4), mc._naiveMC.medEstateNet || 0, FMT_MONEY);

    setRow(wsS, 22, 2, [fr ? "Ann\u00e9es r\u00e9cup. PSV" : "OAS clawback yrs"]);
    set(wsS, wsS.getCell(22, 3), oasYears); if (oasYearsN != null) set(wsS, wsS.getCell(22, 4), oasYearsN);

    setRow(wsS, 23, 2, [fr ? "Taux effectif moyen" : "Avg effective rate"]);
    setNum(wsS, wsS.getCell(23, 3), avgEffOpt, FMT_PCT);
    if (avgEffN != null) setNum(wsS, wsS.getCell(23, 4), avgEffN, FMT_PCT);

    // Single Action
    if (samResults.length > 0) {
      addTitle(wsS, 25, 2, fr ? "SI VOUS NE FAITES QU'UNE CHOSE" : "IF YOU DO ONLY ONE THING", "", 13);
      wsS.mergeCells(27, 2, 27, 14);
      set(wsS, wsS.getCell(27, 2), "\u25B6  " + (samResults[0].name || ""));
      wsS.getCell(27, 2).font = { name: "Calibri", size: 12, bold: true, color: { argb: CL.gold } };
      wsS.mergeCells(28, 2, 28, 14);
      set(wsS, wsS.getCell(28, 2), samResults[0].explain || "");
      wsS.getCell(28, 2).font = BODY_FONT;
    }
    wsS.views = [{ state: "frozen", ySplit: 5 }];
    footer(wsS, 31);

    // ────────────────────────────────────────────────────────────
    // SHEET 2: PROFIL
    // ────────────────────────────────────────────────────────────
    var wsP = wb.addWorksheet(fr ? "Profil" : "Profile");
    setColWidths(wsP, [3, 24, 18, 18, 16, 16, 16, 16, 16, 14, 14, 14, 14, 14]);
    printSetup(wsP);
    addTabBanner(wsP,
      fr ? "Profil du client" : "Client Profile",
      cName + "  \u2022  " + todayLong, 14);

    addTitle(wsP, 5, 2, fr ? "INFORMATIONS PERSONNELLES" : "PERSONAL INFORMATION", "", 13);
    var pLabels = [fr ? "\u00c2ge" : "Age", fr ? "Retraite planifi\u00e9e" : "Planned retirement", "Horizon", "Province", fr ? "Salaire brut" : "Gross salary", fr ? "D\u00e9penses retraite" : "Retirement spending"];
    pLabels.forEach(function(l, i) {
      set(wsP, "B" + (7 + i), l);
      wsP.getCell("B" + (7 + i)).font = { name: "Calibri", size: 11, bold: true, color: { argb: CL.text } };
      wsP.getRow(7 + i).height = 19;
    });
    setRow(wsP, 7, 3, [age + (fr ? " ans" : " yrs"), "", (fr ? "N\u00e9(e) en " : "Born ") + (y0 - age)]);
    setRow(wsP, 8, 3, [retAge + (fr ? " ans" : " yrs"), "", (fr ? "Dans " : "In ") + Math.max(0, retAge - age) + (fr ? " ans" : " yrs")]);
    setRow(wsP, 9, 3, [deathAge + (fr ? " ans" : " yrs"), "", (deathAge - retAge) + (fr ? " ans de retraite" : " retirement yrs")]);
    set(wsP, "C10", prov);
    setNum(wsP, "C11", sal, FMT_MONEY);
    setNum(wsP, "C12", totalSpM, '#,##0" $/m"');

    // Savings table
    addTitle(wsP, 14, 2, fr ? "\u00c9PARGNE ET COTISATIONS" : "SAVINGS AND CONTRIBUTIONS",
      fr ? "Soldes actuels, cotisations annuelles et projections" : "Current balances, contributions and projections", 13);
    setRow(wsP, 16, 2, [fr ? "Compte" : "Account", fr ? "Solde actuel" : "Current bal.", fr ? "Cotis./an" : "Contrib./yr", fr ? "Alloc. actions" : "Equity %", "MER", fr ? "Solde retraite" : "Ret. bal.", fr ? "Solde d\u00e9c\u00e8s" : "Death bal."]);
    styleTable(wsP, { hr: 16, fr: 17, to: 21, fc: 2, lc: 8 });
    var accts = [
      ["REER", rrsp, rrspC, allocR, merR, pDret.rrM, pDend.rrM],
      ["CELI", tfsa, tfsaC, allocT, merT, pDret.tfM, pDend.tfM],
      ["NR", nr, nrC, allocN, merN, pDret.nrM, pDend.nrM],
      ["CELIAPP", fhsaBal, fhsaC, allocT, merT, pDret.fhM, pDend.fhM],
      ["Total", rrsp + tfsa + nr + fhsaBal, rrspC + tfsaC + nrC + fhsaC, 0, 0,
        toNum(pDret.rrM) + toNum(pDret.tfM) + toNum(pDret.nrM) + toNum(pDret.fhM),
        toNum(pDend.rrM) + toNum(pDend.tfM) + toNum(pDend.nrM) + toNum(pDend.fhM)]
    ];
    accts.forEach(function(a, i) {
      var r = 17 + i;
      set(wsP, wsP.getCell(r, 2), a[0]);
      wsP.getCell(r, 3).value = toNum(a[1]); wsP.getCell(r, 3).numFmt = FMT_MONEY;
      wsP.getCell(r, 4).value = toNum(a[2]); wsP.getCell(r, 4).numFmt = FMT_MONEY;
      if (i < 4) { wsP.getCell(r, 5).value = toNum(a[3]); wsP.getCell(r, 5).numFmt = "0%"; }
      if (i < 4) { wsP.getCell(r, 6).value = toNum(a[4]); wsP.getCell(r, 6).numFmt = "0.00%"; }
      wsP.getCell(r, 7).value = toNum(a[5]); wsP.getCell(r, 7).numFmt = FMT_MONEY;
      wsP.getCell(r, 8).value = toNum(a[6]); wsP.getCell(r, 8).numFmt = FMT_MONEY;
    });
    wsP.getCell(21, 2).font = { name: "Calibri", size: 11, bold: true, color: { argb: CL.gold } };

    // Government income
    addTitle(wsP, 23, 2, fr ? "REVENUS GOUVERNEMENTAUX PROJET\u00c9S" : "PROJECTED GOVERNMENT INCOME", "", 13);
    setRow(wsP, 25, 2, ["Source", fr ? "D\u00e9but" : "Start", fr ? "Mensuel" : "Monthly", fr ? "Annuel" : "Annual", fr ? "Indexation" : "Index", "Notes"]);
    styleTable(wsP, { hr: 25, fr: 26, to: 30, fc: 2, lc: 7 });
    setRow(wsP, 26, 2, ["RRQ/QPP", qppAge + (fr ? " ans" : "")]);
    wsP.getCell(26, 4).value = toNum(qppM2); wsP.getCell(26, 4).numFmt = FMT_MONEY;
    wsP.getCell(26, 5).value = toNum(qppM2 * 12); wsP.getCell(26, 5).numFmt = FMT_MONEY;
    set(wsP, wsP.getCell(26, 6), "IPC");
    setRow(wsP, 27, 2, ["PSV/OAS", oasAge + (fr ? " ans" : "")]);
    wsP.getCell(27, 4).value = toNum(oasM2); wsP.getCell(27, 4).numFmt = FMT_MONEY;
    wsP.getCell(27, 5).value = toNum(oasM2 * 12); wsP.getCell(27, 5).numFmt = FMT_MONEY;
    set(wsP, wsP.getCell(27, 6), "IPC");
    if (cOn) {
      setRow(wsP, 28, 2, [fr ? "RRQ conjoint" : "Spouse QPP", cQppAge + (fr ? " ans" : "")]);
      wsP.getCell(28, 4).value = toNum(cQppM2); wsP.getCell(28, 4).numFmt = FMT_MONEY;
      wsP.getCell(28, 5).value = toNum(cQppM2 * 12); wsP.getCell(28, 5).numFmt = FMT_MONEY;
      setRow(wsP, 29, 2, [fr ? "PSV conjoint" : "Spouse OAS", cOasAge + (fr ? " ans" : "")]);
      wsP.getCell(29, 4).value = toNum(cOasM2); wsP.getCell(29, 4).numFmt = FMT_MONEY;
      wsP.getCell(29, 5).value = toNum(cOasM2 * 12); wsP.getCell(29, 5).numFmt = FMT_MONEY;
    }
    setRow(wsP, 30, 2, ["Total", "\u2014"]);
    wsP.getCell(30, 4).value = toNum(govM); wsP.getCell(30, 4).numFmt = FMT_MONEY;
    wsP.getCell(30, 5).value = toNum(govM * 12); wsP.getCell(30, 5).numFmt = FMT_MONEY;
    wsP.getCell(30, 2).font = { name: "Calibri", size: 11, bold: true, color: { argb: CL.gold } };
    set(wsP, wsP.getCell(30, 7), (fr ? "Couverture: " : "Coverage: ") + Math.round(covRatio * 100) + "%");
    footer(wsP, 34);

    // ────────────────────────────────────────────────────────────
    // SHEET 2B: CONJOINT(E) / SPOUSE (couple mode only)
    // ────────────────────────────────────────────────────────────
    // Couples previously got only primary figures in this workbook even
    // though the engine fully projects spouse (independent DC accumulation
    // via cdc, bridge benefit, pen2, part-time income, NR taxation, and a
    // possibly independent portfolio when cSyncPortfolio is off).
    // Sources anchored on engine output:
    //   - params: p.cAge / cRetAge / cSex / cDeath / cSal / etc.
    //   - MC per-year: mc.medRevData[].aCRR/aCTF/aCNR/aCLIRA (spouse balances),
    //     .tax2, .taxInc2, .cLiraWith
    //   - Gov income: calcQPP(cQppAge, cAvgE, cQppYrs) + calcOAS(cOasAge, ...)
    if (cOn) {
      var wsSp = wb.addWorksheet(fr ? "Conjoint(e)" : "Spouse");
      setColWidths(wsSp, [3, 12, 8, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14]);
      printSetup(wsSp);
      var _cFull = (p.cSpouseName || "").toString().trim();
      addTabBanner(wsSp,
        fr ? "Conjoint(e)" + (_cFull ? " \u2014 " + _cFull : "") : "Spouse" + (_cFull ? " \u2014 " + _cFull : ""),
        fr ? "Projection ind\u00e9pendante: \u00e9pargne, pensions, revenu, imp\u00f4t" : "Independent projection: savings, pensions, income, tax", 14);

      // Profile block
      addTitle(wsSp, 5, 2, fr ? "PROFIL DU CONJOINT(E)" : "SPOUSE PROFILE", "", 13);
      var cSyncRet = p.cSyncRet !== false;
      var cSyncGov = p.cSyncGov !== false;
      var cSyncPort = p.cSyncPortfolio !== false;
      var spProfile = [
        [fr ? "\u00c2ge" : "Age", p.cAge || 0, ""],
        [fr ? "Sexe" : "Sex", (p.cSex || "F") === "F" ? (fr ? "Femme" : "Female") : (fr ? "Homme" : "Male"), ""],
        [fr ? "Retraite planifi\u00e9e" : "Planned retirement", p.cRetAge || 0, cSyncRet ? (fr ? "Synchronis\u00e9e avec le client" : "Synced with client") : (fr ? "Ind\u00e9pendante" : "Independent")],
        [fr ? "Horizon (\u00e2ge au d\u00e9c\u00e8s)" : "Horizon (death age)", p.cDeath || 0, ""],
        [fr ? "Salaire brut" : "Gross salary", p.cSal || 0, fr ? "Pr\u00e9-retraite" : "Pre-retirement"],
        [fr ? "D\u00e9penses perso. mensuelles" : "Personal monthly spending", p.cRetSpM || 0, fr ? "Part du conjoint(e)" : "Spouse share"]
      ];
      setRow(wsSp, 7, 2, [fr ? "Champ" : "Field", fr ? "Valeur" : "Value", "Notes"]);
      spProfile.forEach(function (sp, i) {
        var r = 8 + i;
        set(wsSp, wsSp.getCell(r, 2), sp[0]);
        if (typeof sp[1] === "number" && (sp[0].indexOf("alaire") >= 0 || sp[0].indexOf("alary") >= 0 || sp[0].indexOf("D\u00e9penses") >= 0 || sp[0].indexOf("spending") >= 0)) {
          wsSp.getCell(r, 3).value = sp[1]; wsSp.getCell(r, 3).numFmt = FMT_MONEY;
        } else {
          set(wsSp, wsSp.getCell(r, 3), sp[1]);
        }
        set(wsSp, wsSp.getCell(r, 4), sp[2]);
      });
      styleTable(wsSp, { hr: 7, fr: 8, to: 13, fc: 2, lc: 4 });

      // Savings / balances snapshot — current (from params), projected from mc.
      addTitle(wsSp, 15, 2, fr ? "\u00c9PARGNE \u2014 ACTUELLE & PROJET\u00c9E" : "SAVINGS \u2014 CURRENT & PROJECTED", "", 13);
      setRow(wsSp, 17, 2, [fr ? "Compte" : "Account", fr ? "Solde actuel" : "Current balance", fr ? "Cotisation /an" : "Contribution /yr", fr ? "\u00c0 la retraite (P50)" : "At retirement (P50)", fr ? "Au d\u00e9c\u00e8s (P50)" : "At death (P50)"]);
      // Find the row in mc.medRevData closest to spouse's retirement age
      // and last available row (death). These come straight from the engine
      // so figures align 1:1 with the HTML report's fan chart.
      var revAtRet = revD.find(function (r) { return (p.cAge + (toNum(r.age) - age)) >= (p.cRetAge || 65); });
      var revAtEnd = revD[revD.length - 1] || {};
      var cBalancesRows = [
        [fr ? "REER" : "RRSP", p.cRRSP || 0, p.cRRSPC || 0, revAtRet ? toNum(revAtRet.aCRR) : null, toNum(revAtEnd.aCRR)],
        [fr ? "CELI" : "TFSA", p.cTFSA || 0, p.cTFSAC || 0, revAtRet ? toNum(revAtRet.aCTF) : null, toNum(revAtEnd.aCTF)],
        [fr ? "Non-enregistr\u00e9" : "Non-registered", p.cNR || 0, p.cNRC || 0, revAtRet ? toNum(revAtRet.aCNR) : null, toNum(revAtEnd.aCNR)],
        ["FHSA", p.cFhsaBal || 0, p.cFhsaC || 0, null, null],
        [fr ? "CRI / LIRA" : "LIRA", p.cLiraBal || 0, 0, null, revAtRet ? toNum(revAtRet.aCLIRA) : 0],
        [fr ? "DC (pension 1)" : "DC (pension 1)", p.cDCBal2 || 0, (p.cPenEE || 0) + (p.cPenER || 0), null, null],
        [fr ? "DC (pension 2)" : "DC (pension 2)", p.cDC2Bal || 0, (p.cPen2EE || 0) + (p.cPen2ER || 0), null, null]
      ];
      cBalancesRows.forEach(function (row, i) {
        var r = 18 + i;
        set(wsSp, wsSp.getCell(r, 2), row[0]);
        wsSp.getCell(r, 3).value = toNum(row[1]); wsSp.getCell(r, 3).numFmt = FMT_MONEY;
        wsSp.getCell(r, 4).value = toNum(row[2]); wsSp.getCell(r, 4).numFmt = FMT_MONEY;
        if (row[3] != null) { wsSp.getCell(r, 5).value = toNum(row[3]); wsSp.getCell(r, 5).numFmt = FMT_MONEY; }
        if (row[4] != null) { wsSp.getCell(r, 6).value = toNum(row[4]); wsSp.getCell(r, 6).numFmt = FMT_MONEY; }
      });
      styleTable(wsSp, { hr: 17, fr: 18, to: 24, fc: 2, lc: 6 });

      // Government pensions — monthly amounts from the engine's calc fns.
      addTitle(wsSp, 26, 2, fr ? "PENSIONS GOUVERNEMENTALES" : "GOVERNMENT PENSIONS", "", 13);
      setRow(wsSp, 28, 2, [fr ? "Prestation" : "Benefit", fr ? "\u00c2ge d\u00e9but" : "Start age", fr ? "Mensuel" : "Monthly", fr ? "Annuel" : "Annual", "Base"]);
      var cQppFull = cOn ? calcQPP(p.cQppAge || 65, p.cAvgE || 0, p.cQppYrs || 0) : 0;
      var cOasFull = cOn ? calcOAS(p.cOasAge || 65, (p.cRetSpM || 0) * 12) : 0;
      var govRows = [
        [fr ? "RRQ/RPC" : "QPP/CPP", p.cQppAge || 65, cQppFull, cQppFull * 12, (p.cAvgE || 0).toLocaleString(locale) + (fr ? " $ gains adm." : " $ pensionable")],
        [fr ? "PSV/OAS" : "OAS", p.cOasAge || 65, cOasFull, cOasFull * 12, cSyncGov ? (fr ? "Clawback selon revenu conjoint" : "Clawback per spouse income") : ""]
      ];
      govRows.forEach(function (row, i) {
        var r = 29 + i;
        set(wsSp, wsSp.getCell(r, 2), row[0]);
        set(wsSp, wsSp.getCell(r, 3), row[1]);
        wsSp.getCell(r, 4).value = toNum(row[2]); wsSp.getCell(r, 4).numFmt = FMT_MONEY;
        wsSp.getCell(r, 5).value = toNum(row[3]); wsSp.getCell(r, 5).numFmt = FMT_MONEY;
        set(wsSp, wsSp.getCell(r, 6), row[4]);
      });
      styleTable(wsSp, { hr: 28, fr: 29, to: 30, fc: 2, lc: 6 });

      // Employer pension summary
      addTitle(wsSp, 32, 2, fr ? "PENSION EMPLOYEUR" : "EMPLOYER PENSION", "", 13);
      var cPenLabel = (p.cPenType || "none");
      var cPenLabelHuman = cPenLabel === "db" ? (fr ? "PD (prestation d\u00e9termin\u00e9e)" : "DB (defined benefit)")
                        : cPenLabel === "cd" ? (fr ? "CD (cotisations d\u00e9finies)" : "DC (defined contribution)")
                        : cPenLabel === "rpdb" ? "RPDB / DPSP"
                        : cPenLabel === "rrs" ? "RRS"
                        : cPenLabel === "rver" ? "RVER"
                        : (fr ? "Aucune" : "None");
      setRow(wsSp, 34, 2, [fr ? "Type" : "Type", fr ? "Prestation mensuelle" : "Monthly benefit", "Indexation", fr ? "Pont / bridge" : "Bridge", fr ? "2e pension" : "2nd pension"]);
      set(wsSp, wsSp.getCell(35, 2), cPenLabelHuman);
      wsSp.getCell(35, 3).value = toNum(p.cPenM); wsSp.getCell(35, 3).numFmt = FMT_MONEY;
      set(wsSp, wsSp.getCell(35, 4), (+p.cPenIdx || 0) ? (fr ? "IPC" : "CPI") : (fr ? "Fixe" : "Flat"));
      set(wsSp, wsSp.getCell(35, 5), p.cBridge ? (toNum(p.cBrAmt) > 0 ? _fmtM(p.cBrAmt * 12, locale) + (fr ? "/an jusqu'\u00e0 " : "/yr until ") + (p.cBrEnd || 65) : (fr ? "Oui" : "Yes")) : (fr ? "Non" : "No"));
      set(wsSp, wsSp.getCell(35, 6), (p.cPen2Type && p.cPen2Type !== "none") ? (p.cPen2Type + " " + _fmtM(p.cPen2M || 0, locale) + (fr ? "/mois" : "/mo")) : (fr ? "Aucune" : "None"));
      styleTable(wsSp, { hr: 34, fr: 35, to: 35, fc: 2, lc: 6 });

      // Taxation projection — from revData.tax2 / taxInc2 (engine's spouse
      // taxable income + tax totals, including the NR cap-gain inclusion
      // we added in 062c762).
      addTitle(wsSp, 37, 2, fr ? "IMP\u00d4T CONJOINT(E) \u2014 PROJECTION M\u00c9DIANE MC" : "SPOUSE TAX \u2014 MC MEDIAN PROJECTION", "", 13);
      setRow(wsSp, 39, 2, [fr ? "An" : "Yr", fr ? "\u00c2ge" : "Age", fr ? "Revenu imposable" : "Taxable income", fr ? "Imp\u00f4t" : "Tax", fr ? "Taux effectif" : "Effective rate"]);
      var cYrsShown = Math.min(revD.length, 30);
      var sTR = 40;
      revD.slice(0, 30).forEach(function (r, i) {
        var cAgeY = (p.cAge || 0) + (toNum(r.age) - age);
        var rr = sTR + i;
        set(wsSp, wsSp.getCell(rr, 2), y0 + i);
        set(wsSp, wsSp.getCell(rr, 3), cAgeY);
        wsSp.getCell(rr, 4).value = toNum(r.taxInc2); wsSp.getCell(rr, 4).numFmt = FMT_MONEY;
        wsSp.getCell(rr, 5).value = toNum(r.tax2); wsSp.getCell(rr, 5).numFmt = FMT_MONEY;
        // Effective rate as formula so user sees the calc transparently.
        setFormula(wsSp, wsSp.getCell(rr, 6),
          'IFERROR(E' + rr + '/D' + rr + ',0)', FMT_PCT,
          toNum(r.taxInc2) > 0 ? toNum(r.tax2) / toNum(r.taxInc2) : 0);
      });
      styleTable(wsSp, { hr: 39, fr: 40, to: 40 + cYrsShown - 1, fc: 2, lc: 6 });
      footer(wsSp, 40 + cYrsShown + 2);
    }

    // ────────────────────────────────────────────────────────────
    // SHEET 3: PROJECTION DÉTERMINISTE
    // ────────────────────────────────────────────────────────────
    var wsProj = wb.addWorksheet(fr ? "Projection d\u00e9terministe" : "Deterministic Projection");
    setColWidths(wsProj, [3, 10, 8, 16, 16, 16, 16, 16, 16, 16, 16, 16, 14]);
    printSetup(wsProj);
    addTabBanner(wsProj,
      fr ? "Projection d\u00e9terministe \u2014 chemin unique" : "Deterministic projection \u2014 single path",
      fr ? "Rendements esp\u00e9r\u00e9s constants, aucune volatilit\u00e9  \u2022  Valeurs nominales" : "Constant expected returns, no volatility  \u2022  Nominal values", 14);
    setRow(wsProj, 5, 2, [fr ? "An" : "Yr", fr ? "\u00c2ge" : "Age", "REER", "CELI", "NR", "FHSA", fr ? "Immobilier" : "Real Estate", fr ? "Hypoth\u00e8que" : "Mortgage", fr ? "Avoir immo." : "RE Equity", fr ? "Total financier" : "Total financial", fr ? "Total net" : "Total net", "Phase"]);
    var projN = Math.min((mc.pD || []).length, 51);
    // Cols (B=year, C=age, D=REER, E=CELI, F=NR, G=FHSA, H=RE val, I=Mortgage,
    // J=RE Equity, K=Total financial, L=Total net, M=Phase). Equity / totals
    // are formulas so the user can audit "where does this number come from".
    (mc.pD || []).slice(0, 51).forEach(function(r, i) {
      var reV = toNum(r.reM), mtg = toNum(r.mtM), eq = reV - mtg;
      var fin = toNum(r.rrM) + toNum(r.tfM) + toNum(r.nrM) + toNum(r.peM) + toNum(r.fhM);
      var curAge = r.age || (age + i);
      var phase = curAge < retAge ? (fr ? "Accumulation" : "Accumulation") : (fr ? "D\u00e9caissement" : "Decumulation");
      var rr = 6 + i;
      // Year + age + raw account balances as values
      setNum(wsProj, wsProj.getCell(rr, 2), y0 + i);
      setNum(wsProj, wsProj.getCell(rr, 3), curAge);
      setNum(wsProj, wsProj.getCell(rr, 4), toNum(r.rrM), FMT_MONEY);
      setNum(wsProj, wsProj.getCell(rr, 5), toNum(r.tfM), FMT_MONEY);
      setNum(wsProj, wsProj.getCell(rr, 6), toNum(r.nrM), FMT_MONEY);
      setNum(wsProj, wsProj.getCell(rr, 7), toNum(r.fhM), FMT_MONEY);
      setNum(wsProj, wsProj.getCell(rr, 8), reV, FMT_MONEY);
      setNum(wsProj, wsProj.getCell(rr, 9), mtg, FMT_MONEY);
      // Derived columns as formulas so user sees the math
      setFormula(wsProj, wsProj.getCell(rr, 10), 'H' + rr + '-I' + rr, FMT_MONEY, eq);
      setFormula(wsProj, wsProj.getCell(rr, 11), 'SUM(D' + rr + ':G' + rr + ')', FMT_MONEY, fin);
      setFormula(wsProj, wsProj.getCell(rr, 12), 'K' + rr + '+J' + rr, FMT_MONEY, fin + eq);
      set(wsProj, wsProj.getCell(rr, 13), phase);
      wsProj.getCell(rr, 13).font = { name: "Calibri", size: 10, italic: true, color: { argb: CL.muted } };
    });
    styleTable(wsProj, { hr: 5, fr: 6, to: Math.max(6, 5 + projN), fc: 2, lc: 13 });
    footer(wsProj, 5 + projN + 3);

    // ────────────────────────────────────────────────────────────
    // SHEET 4: FLUX DE TRÉSORERIE
    // ────────────────────────────────────────────────────────────
    var wsCF = wb.addWorksheet(fr ? "Flux de tr\u00e9sorerie" : "Cash Flow");
    setColWidths(wsCF, [3, 10, 8, 14, 12, 12, 12, 12, 14, 14, 12, 10, 14]);
    printSetup(wsCF);
    addTabBanner(wsCF,
      fr ? "Flux de tr\u00e9sorerie annuel" : "Annual cash flow",
      fr ? "Revenus, d\u00e9penses, retraits et imp\u00f4t" : "Income, spending, withdrawals and tax", 14);
    setRow(wsCF, 5, 2, [fr ? "An" : "Yr", fr ? "\u00c2ge" : "Age", fr ? "Salaire" : "Salary", "RRQ/QPP", "PSV/OAS", "SRG", fr ? "Pension" : "Pension", fr ? "Retraits \u00e9p." : "Withdrawals", fr ? "D\u00e9penses" : "Spending", fr ? "Imp\u00f4t" : "Tax", fr ? "Taux eff." : "Eff. rate", fr ? "Rev. imposable" : "Taxable inc."]);
    var cfN = Math.min(revD.length, 51);
    // Cols (B=Yr, C=Age, D=Salary, E=QPP, F=OAS, G=SRG, H=Pen, I=Wdl, J=Spend,
    // K=Tax, L=Eff rate, M=Taxable inc). Eff. rate = K/M as formula.
    revD.slice(0, 51).forEach(function(r, i) {
      var eff = toNum(r.taxInc) > 0 ? toNum(r.tax) / toNum(r.taxInc) : 0;
      var rr = 6 + i;
      setNum(wsCF, wsCF.getCell(rr, 2), y0 + i);
      setNum(wsCF, wsCF.getCell(rr, 3), r.age || 0);
      setNum(wsCF, wsCF.getCell(rr, 4), toNum(r.sal), FMT_MONEY);
      setNum(wsCF, wsCF.getCell(rr, 5), toNum(r.rrq), FMT_MONEY);
      setNum(wsCF, wsCF.getCell(rr, 6), toNum(r.psv), FMT_MONEY);
      setNum(wsCF, wsCF.getCell(rr, 7), toNum(r.gis || r.srg), FMT_MONEY);
      setNum(wsCF, wsCF.getCell(rr, 8), toNum(r.pen), FMT_MONEY);
      setNum(wsCF, wsCF.getCell(rr, 9), toNum(r.ret), FMT_MONEY);
      setNum(wsCF, wsCF.getCell(rr, 10), toNum(r.spend), FMT_MONEY);
      setNum(wsCF, wsCF.getCell(rr, 11), toNum(r.tax), FMT_MONEY);
      // Eff. rate = Tax / TaxableInc, with safe div-by-zero guard
      setFormula(wsCF, wsCF.getCell(rr, 12), 'IFERROR(K' + rr + '/M' + rr + ',0)', FMT_PCT, eff);
      setNum(wsCF, wsCF.getCell(rr, 13), toNum(r.taxInc), FMT_MONEY);
    });
    styleTable(wsCF, { hr: 5, fr: 6, to: Math.max(6, 5 + cfN), fc: 2, lc: 13 });
    footer(wsCF, 5 + cfN + 3);

    // ────────────────────────────────────────────────────────────
    // SHEET 5: MC — PATRIMOINE
    // ────────────────────────────────────────────────────────────
    var wsMC = wb.addWorksheet(fr ? "MC \u2014 Patrimoine" : "MC \u2014 Wealth");
    applySheetTemplate(wsMC, 'grid');
    printSetup(wsMC);
    addTabBanner(wsMC,
      fr ? "Monte Carlo \u2014 Distribution du patrimoine financier" : "Monte Carlo \u2014 Financial Wealth Distribution",
      nSim + (fr ? " simulations  \u2022  Percentiles P5/P25/P50/P75/P95" : " simulations  \u2022  Percentiles P5/P25/P50/P75/P95"), 14);
    // Headline row — at-a-glance final-wealth distribution from the engine.
    // Source: mc.p5F / p25F / medF / p75F / p95F (real MC percentiles).
    // These are the same numbers surfaced on the HTML report's summary card.
    var hl = {
      p5F:  toNum(mc.p5F  != null ? mc.p5F  : mc.var5),
      p25F: toNum(mc.p25F),
      medF: toNum(mc.medF),
      p75F: toNum(mc.p75F),
      p95F: toNum(mc.p95F)
    };
    set(wsMC, wsMC.getCell(4, 2), fr ? "PATRIMOINE FINAL (\u00e2ge " + (deathAge || 90) + ")" : "FINAL WEALTH (age " + (deathAge || 90) + ")");
    wsMC.getCell(4, 2).font = { name: "Calibri", size: 10, bold: true, color: { argb: CL.muted } };
    wsMC.mergeCells(4, 2, 4, 3);
    var hlLabels = [
      [fr ? "P5" : "P5", hl.p5F],
      ["P25", hl.p25F],
      [fr ? "P50 (m\u00e9diane)" : "P50 (median)", hl.medF],
      ["P75", hl.p75F],
      ["P95", hl.p95F]
    ];
    hlLabels.forEach(function (hlp, hi) {
      var c = 4 + hi;
      set(wsMC, wsMC.getCell(4, c), hlp[0]);
      wsMC.getCell(4, c).font = { name: "Calibri", size: 10, bold: true, color: { argb: CL.muted } };
      wsMC.getCell(4, c).alignment = { horizontal: "right" };
      wsMC.getCell(3, c).value = hlp[1]; wsMC.getCell(3, c).numFmt = FMT_MONEY;
      wsMC.getCell(3, c).font = { name: "Calibri", size: 12, bold: true, color: { argb: CL.gold } };
      wsMC.getCell(3, c).alignment = { horizontal: "right" };
    });
    setRow(wsMC, 5, 2, [fr ? "An" : "Yr", fr ? "\u00c2ge" : "Age", fr ? "D\u00e9terministe" : "Det.", fr ? "P5 (pire 5%)" : "P5 (worst 5%)", "P25", fr ? "P50 (m\u00e9diane)" : "P50 (median)", "P75", fr ? "P95 (meil. 5%)" : "P95 (best 5%)", fr ? "\u00c9cart P50-Det." : "P50-Det.", fr ? "Fourch. P5-P95" : "Range P5-P95"]);
    var mcN = Math.min((mc.pD || []).length, 51);
    (mc.pD || []).slice(0, 51).forEach(function(r, i) {
      var det = toNum(r.det || r.p50);
      var rr = 6 + i;
      setRow(wsMC, rr, 2, [y0 + i, r.age || (age + i)]);
      wsMC.getCell(rr, 4).value = det; wsMC.getCell(rr, 4).numFmt = FMT_MONEY;
      wsMC.getCell(rr, 5).value = toNum(r.p5); wsMC.getCell(rr, 5).numFmt = FMT_MONEY;
      wsMC.getCell(rr, 6).value = toNum(r.p25); wsMC.getCell(rr, 6).numFmt = FMT_MONEY;
      wsMC.getCell(rr, 7).value = toNum(r.p50); wsMC.getCell(rr, 7).numFmt = FMT_MONEY;
      wsMC.getCell(rr, 8).value = toNum(r.p75); wsMC.getCell(rr, 8).numFmt = FMT_MONEY;
      wsMC.getCell(rr, 9).value = toNum(r.p95); wsMC.getCell(rr, 9).numFmt = FMT_MONEY;
      // P50-Det delta as formula = P50(G) - Det(D), red if negative
      var p50det = toNum(r.p50) - det;
      setFormula(wsMC, wsMC.getCell(rr, 10), 'G' + rr + '-D' + rr, FMT_DELTA, p50det);
      if (p50det < 0) wsMC.getCell(rr, 10).font = { name: "Calibri", size: 11, color: { argb: CL.red } };
      // Range P5-P95 as formula = P95(I) - P5(E)
      var range = toNum(r.p95) - toNum(r.p5);
      setFormula(wsMC, wsMC.getCell(rr, 11), 'I' + rr + '-E' + rr, FMT_MONEY, range);
      if (range < 0) wsMC.getCell(rr, 11).font = { name: "Calibri", size: 11, color: { argb: CL.red } };
      // First data row gets blue tint
      if (i === 0) {
        for (var bc = 2; bc <= 11; bc++) wsMC.getCell(rr, bc).fill = MC_BLUE_FILL;
      }
    });
    styleTable(wsMC, { hr: 5, fr: 6, to: Math.max(6, 5 + mcN), fc: 2, lc: 11 });
    footer(wsMC, 5 + mcN + 3);

    // ────────────────────────────────────────────────────────────
    // SHEET 6: RETRAITS DÉTAILLÉS (phase-structured)
    // ────────────────────────────────────────────────────────────
    var wsWD = wb.addWorksheet(fr ? "Retraits d\u00e9taill\u00e9s" : "Detailed Withdrawals");
    setColWidths(wsWD, [3, 16, 8, 14, 14, 14, 14, 14, 16, 22, 14, 14, 14, 14]);
    printSetup(wsWD);
    addTabBanner(wsWD,
      fr ? "D\u00e9tail des retraits par source et par phase" : "Withdrawal detail by source and phase",
      fr ? "Strat\u00e9gie " + wStrat + ": NR \u2192 Meltdown \u2192 REER \u2192 CELI" : "Strategy " + wStrat + ": NR \u2192 Meltdown \u2192 RRSP \u2192 TFSA", 14);

    var retRows = revD.filter(function(r) { return r.age >= retAge; });
    var phases = [];
    if (retAge < qppAge) phases.push({ name: fr ? "PR\u00c9-RRQ  (" + retAge + "\u2013" + (qppAge - 1) + " ans)" : "PRE-QPP  (" + retAge + "\u2013" + (qppAge - 1) + ")", from: retAge, to: qppAge - 1, note: fr ? "Meltdown actif pour vider le REER dans les paliers bas" : "Active meltdown to empty RRSP in low brackets" });
    if (qppAge < oasAge) phases.push({ name: fr ? "PR\u00c9-PSV  (" + qppAge + "\u2013" + (oasAge - 1) + " ans)" : "PRE-OAS  (" + qppAge + "\u2013" + (oasAge - 1) + ")", from: qppAge, to: oasAge - 1, note: fr ? "RRQ commence. Meltdown continue." : "QPP starts. Meltdown continues." });
    phases.push({ name: fr ? "POST-PSV  (" + oasAge + "\u201371 ans)" : "POST-OAS  (" + oasAge + "\u201371)", from: oasAge, to: 71 });
    phases.push({ name: fr ? "FERR  (72+ ans)" : "RRIF  (72+)", from: 72, to: 999, note: fr ? "Retraits FERR minimum obligatoires" : "Mandatory RRIF minimum withdrawals" });

    var wdr = 5;
    phases.forEach(function(ph, pi) {
      var pr = retRows.filter(function(r) { return r.age >= ph.from && r.age <= ph.to; });
      if (pr.length === 0) return;
      // Phase header row with gold tint
      addPhaseHeader(wsWD, wdr, 2, (fr ? "PHASE " : "PHASE ") + (pi + 1) + " \u2014 " + ph.name, 9);
      wdr++;
      if (ph.note) {
        wsWD.mergeCells(wdr, 2, wdr, 10);
        set(wsWD, wsWD.getCell(wdr, 2), ph.note);
        wsWD.getCell(wdr, 2).font = SUB_FONT;
        wsWD.getRow(wdr).height = 16;
        wdr++;
      }
      setRow(wsWD, wdr, 2, [fr ? "An" : "Yr", fr ? "\u00c2ge" : "Age", fr ? "FERR min." : "RRIF min.", "Meltdown", fr ? "REER vol." : "RRSP vol.", "CELI", "NR", fr ? "Total retraits" : "Total wdl.", "Notes"]);
      var hdrR = wdr; wdr++;
      var phTotal = 0, phFerr = 0, phMelt = 0, phRR = 0, phTF = 0, phNR = 0;
      pr.forEach(function(r) {
        var ferr = toNum(r.wRrifMin), melt = toNum(r.wMelt), rrV = toNum(r.wFromRR), tfV = toNum(r.wFromTF), nrV = toNum(r.wFromNR);
        var tot = ferr + melt + rrV + tfV + nrV;
        phTotal += tot; phFerr += ferr; phMelt += melt; phRR += rrV; phTF += tfV; phNR += nrV;
        var note = r.age === retAge ? (fr ? "D\u00e9but retraite" : "Retirement start") : r.age === qppAge ? (fr ? "RRQ commence" : "QPP starts") : r.age === oasAge ? (fr ? "PSV commence" : "OAS starts") : r.age === 72 ? "RRIF" : "";
        setRow(wsWD, wdr, 2, [y0 + (r.age - age), r.age]);
        wsWD.getCell(wdr, 4).value = ferr; wsWD.getCell(wdr, 4).numFmt = FMT_MONEY_RED;
        wsWD.getCell(wdr, 5).value = melt; wsWD.getCell(wdr, 5).numFmt = FMT_MONEY_RED;
        wsWD.getCell(wdr, 6).value = rrV; wsWD.getCell(wdr, 6).numFmt = FMT_MONEY_RED;
        wsWD.getCell(wdr, 7).value = tfV; wsWD.getCell(wdr, 7).numFmt = FMT_MONEY_RED;
        wsWD.getCell(wdr, 8).value = nrV; wsWD.getCell(wdr, 8).numFmt = FMT_MONEY_RED;
        wsWD.getCell(wdr, 9).value = tot; wsWD.getCell(wdr, 9).numFmt = FMT_MONEY_RED;
        set(wsWD, wsWD.getCell(wdr, 10), note);
        wdr++;
      });
      // Phase totals row — per-column sums of all years in the phase.
      // Gives the user "how much came out of each bucket" at a glance.
      var avg = pr.length;
      set(wsWD, wsWD.getCell(wdr, 2), fr ? "TOTAL phase" : "Phase TOTAL");
      wsWD.getCell(wdr, 2).font = { name: "Calibri", size: 10, bold: true, color: { argb: CL.gold } };
      wsWD.getCell(wdr, 4).value = phFerr; wsWD.getCell(wdr, 4).numFmt = FMT_MONEY;
      wsWD.getCell(wdr, 5).value = phMelt; wsWD.getCell(wdr, 5).numFmt = FMT_MONEY;
      wsWD.getCell(wdr, 6).value = phRR;   wsWD.getCell(wdr, 6).numFmt = FMT_MONEY;
      wsWD.getCell(wdr, 7).value = phTF;   wsWD.getCell(wdr, 7).numFmt = FMT_MONEY;
      wsWD.getCell(wdr, 8).value = phNR;   wsWD.getCell(wdr, 8).numFmt = FMT_MONEY;
      wsWD.getCell(wdr, 9).value = phTotal; wsWD.getCell(wdr, 9).numFmt = FMT_MONEY;
      for (var ptc = 4; ptc <= 9; ptc++) {
        wsWD.getCell(wdr, ptc).font = { name: "Calibri", size: 10, bold: true, color: { argb: CL.gold } };
      }
      set(wsWD, wsWD.getCell(wdr, 10), fr ? avg + " ans \u2022 moy. " + _fmtM(Math.round(phTotal / avg), locale) + "/an" : avg + " yrs \u2022 avg " + _fmtM(Math.round(phTotal / avg), locale) + "/yr");
      wsWD.getCell(wdr, 10).font = { name: "Calibri", size: 9, italic: true, color: { argb: CL.muted } };
      styleTable(wsWD, { hr: hdrR, fr: hdrR + 1, to: wdr, fc: 2, lc: 10 });
      wdr += 2;
    });
    footer(wsWD, wdr + 1);

    // ────────────────────────────────────────────────────────────
    // SHEET 7: FISCALITÉ
    // ────────────────────────────────────────────────────────────
    var wsTax = wb.addWorksheet(fr ? "Fiscalit\u00e9" : "Tax");
    applySheetTemplate(wsTax, 'standard');
    printSetup(wsTax);
    addTabBanner(wsTax,
      fr ? "Analyse fiscale \u2014 " + prov : "Tax analysis \u2014 " + prov,
      fr ? "Paliers " + y0 + "  \u2022  Comparaison optimis\u00e9 vs par d\u00e9faut" : "Brackets " + y0 + "  \u2022  Optimized vs default comparison", 14);

    addTitle(wsTax, 5, 2, fr ? "GRILLE D'IMPOSITION " + y0 : "TAX BRACKETS " + y0,
      fr ? "F\u00e9d\u00e9ral + " + prov + " \u2014 taux combin\u00e9s" : "Federal + " + prov + " \u2014 combined rates", 13);
    setRow(wsTax, 7, 2, [fr ? "Revenu imposable" : "Taxable income", fr ? "F\u00e9d\u00e9ral" : "Federal", "Prov.", "Total", fr ? "Taux eff." : "Eff. rate", fr ? "Taux marg." : "Marg. rate"]);
    var brackets = [0, 20000, 40000, 60000, 80000, 100000, 120000, 150000, 200000, 250000, 300000];
    // Cols (B=Income, C=Federal, D=Prov, E=Total, F=Eff rate, G=Marg rate).
    // Total + eff rate are formulas so the user can edit Income (col B) and see
    // Total/Eff recalc live. Federal/Prov stay as values (calcTax bracket math
    // is too prov-specific to safely express as Excel formulas).
    brackets.forEach(function(inc, i) {
      var tx = calcTax(inc, 0, prov);
      var eff = inc > 0 ? tx.total / inc : 0;
      var r = 8 + i;
      setNum(wsTax, wsTax.getCell(r, 2), inc, FMT_MONEY);
      setNum(wsTax, wsTax.getCell(r, 3), Math.round(tx.fed || tx.basic || 0), FMT_MONEY);
      setNum(wsTax, wsTax.getCell(r, 4), Math.round(tx.prov || 0), FMT_MONEY);
      setFormula(wsTax, wsTax.getCell(r, 5), 'C' + r + '+D' + r, FMT_MONEY, Math.round(tx.total));
      setFormula(wsTax, wsTax.getCell(r, 6), 'IFERROR(E' + r + '/B' + r + ',0)', FMT_PCT, eff);
      setNum(wsTax, wsTax.getCell(r, 7), toNum(tx.marg), FMT_PCT);
    });
    styleTable(wsTax, { hr: 7, fr: 8, to: 18, fc: 2, lc: 7 });

    // Tax comparison
    addTitle(wsTax, 20, 2, fr ? "COMPARAISON FISCALE VIE ENTI\u00c8RE" : "LIFETIME TAX COMPARISON", "", 13);
    setRow(wsTax, 22, 2, [fr ? "M\u00e9trique" : "Metric", fr ? "Optimis\u00e9" : "Optimized", fr ? "Par d\u00e9faut" : "Default", "Delta", "Notes"]);
    styleTable(wsTax, { hr: 22, fr: 23, to: 28, fc: 2, lc: 6 });

    setRow(wsTax, 23, 2, [fr ? "Imp\u00f4t total nominal" : "Total nominal tax"]);
    wsTax.getCell(23, 3).value = toNum(optTax); wsTax.getCell(23, 3).numFmt = FMT_MONEY;
    if (hasNaive) { wsTax.getCell(23, 4).value = toNum(naiveTax); wsTax.getCell(23, 4).numFmt = FMT_MONEY; setDelta(wsTax, wsTax.getCell(23, 5), -Math.max(0, taxAlpha), FMT_MONEY); }

    setRow(wsTax, 24, 2, [fr ? "Taux effectif moyen" : "Avg effective rate"]);
    wsTax.getCell(24, 3).value = avgEffOpt; wsTax.getCell(24, 3).numFmt = FMT_PCT;
    if (avgEffN != null) { wsTax.getCell(24, 4).value = avgEffN; wsTax.getCell(24, 4).numFmt = FMT_PCT; }

    setRow(wsTax, 25, 2, [fr ? "Ann\u00e9es r\u00e9cup. PSV" : "OAS clawback yrs"]);
    set(wsTax, wsTax.getCell(25, 3), oasYears); if (oasYearsN != null) set(wsTax, wsTax.getCell(25, 4), oasYearsN);

    setRow(wsTax, 27, 2, [fr ? "Alpha fiscal total" : "Total tax alpha"]);
    setDelta(wsTax, wsTax.getCell(27, 5), Math.max(0, taxAlpha), FMT_MONEY);
    wsTax.getCell(27, 2).font = { name: "Calibri", size: 11, bold: true, color: { argb: CL.gold } };
    footer(wsTax, 31);

    // ────────────────────────────────────────────────────────────
    // SHEET 8: SENSIBILITÉ & STRESS
    // ────────────────────────────────────────────────────────────
    var wsSS = wb.addWorksheet(fr ? "Sensibilit\u00e9 & Stress" : "Sensitivity & Stress");
    setColWidths(wsSS, [3, 24, 14, 14, 14, 30, 14, 12, 12, 12, 30, 14, 14, 14]);
    printSetup(wsSS);
    addTabBanner(wsSS,
      fr ? "Analyse de sensibilit\u00e9 & sc\u00e9narios de stress" : "Sensitivity analysis & stress scenarios", "", 14);

    addTitle(wsSS, 5, 2, fr ? "TORNADO \u2014 CE QUI INFLUENCE LE PLUS VOTRE PLAN" : "TORNADO \u2014 WHAT INFLUENCES YOUR PLAN MOST",
      fr ? "Impact estim\u00e9 sur le patrimoine final" : "Estimated impact on final wealth", 13);
    setRow(wsSS, 7, 2, [fr ? "Facteur" : "Factor", fr ? "Impact n\u00e9gatif" : "Downside", fr ? "Impact positif" : "Upside", fr ? "Amplitude" : "Amplitude", fr ? "Interpr\u00e9tation" : "Interpretation"]);
    // Accept either mc.sens (array of {name,lo,hi}) or named _sens* fields written by the test harness.
    var sensRows = [];
    if (mc.sens && mc.sens.length) {
      sensRows = mc.sens.slice(0, 8).map(function(s) {
        return { label: s.name || s.label || "", lo: toNum(s.lo), hi: toNum(s.hi), unit: "$" };
      });
    } else {
      var _sensSrc = [
        { key: "_sensReturn", label: fr ? "Rendements" : "Returns" },
        { key: "_sensInflation", label: "Inflation" },
        { key: "_sensSpending", label: fr ? "D\u00e9penses" : "Spending" },
        { key: "_sensMortality", label: fr ? "Long\u00e9vit\u00e9" : "Longevity" }
      ];
      _sensSrc.forEach(function(s) {
        if (mc[s.key]) sensRows.push({ label: s.label, lo: toNum(mc[s.key].lo), hi: toNum(mc[s.key].hi), unit: "$" });
      });
    }
    sensRows.forEach(function(s, i) {
      var rr = 8 + i;
      set(wsSS, wsSS.getCell(rr, 2), s.label);
      wsSS.getCell(rr, 3).value = s.lo; wsSS.getCell(rr, 3).numFmt = FMT_MONEY;
      if (s.lo < 0) wsSS.getCell(rr, 3).font = { name: "Calibri", size: 11, color: { argb: CL.red } };
      wsSS.getCell(rr, 4).value = s.hi; wsSS.getCell(rr, 4).numFmt = FMT_MONEY;
      if (s.hi > 0) wsSS.getCell(rr, 4).font = { name: "Calibri", size: 11, color: { argb: CL.green } };
      wsSS.getCell(rr, 5).value = Math.abs(s.hi - s.lo); wsSS.getCell(rr, 5).numFmt = FMT_MONEY;
    });
    if (sensRows.length === 0) {
      wsSS.mergeCells(8, 2, 8, 6);
      set(wsSS, wsSS.getCell(8, 2), fr ? "Aucune donn\u00e9e de sensibilit\u00e9 disponible." : "No sensitivity data available.");
      wsSS.getCell(8, 2).font = SUB_FONT;
    }
    styleTable(wsSS, { hr: 7, fr: 8, to: Math.max(8, 7 + sensRows.length), fc: 2, lc: 6 });

    // Stress
    addTitle(wsSS, 17, 2, fr ? "SC\u00c9NARIOS DE STRESS" : "STRESS SCENARIOS",
      fr ? "Conditions historiques appliqu\u00e9es" : "Historical conditions applied", 13);
    setRow(wsSS, 19, 2, [fr ? "Sc\u00e9nario" : "Scenario", fr ? "P\u00e9riode" : "Period", fr ? "Succ\u00e8s" : "Success", "Delta", fr ? "Patrimoine P50" : "Wealth P50", "VaR 5%", fr ? "Ruine P5" : "Ruin P5", fr ? "R\u00e9silience" : "Resilience", "Description"]);
    // Stress rows — write as numbers with format codes so Excel can sum, sort,
    // conditional-format. Previously these were strings via _fmtK which broke aggregation.
    function _writeStressRow(rowN, label, period, succVal, deltaPts, wealthP50, var5, ruinAge, resilience, desc) {
      set(wsSS, wsSS.getCell(rowN, 2), label);
      set(wsSS, wsSS.getCell(rowN, 3), period);
      // Success = numeric ratio with 0% format
      if (succVal != null && !isNaN(succVal)) { wsSS.getCell(rowN, 4).value = toNum(succVal); wsSS.getCell(rowN, 4).numFmt = "0%"; }
      else set(wsSS, wsSS.getCell(rowN, 4), "\u2014");
      // Delta in percentage points — use FMT_DELTA so + sign appears
      if (deltaPts != null && !isNaN(deltaPts)) { wsSS.getCell(rowN, 5).value = toNum(deltaPts); wsSS.getCell(rowN, 5).numFmt = '+0" pts";-0" pts";0" pts"'; }
      else set(wsSS, wsSS.getCell(rowN, 5), "\u2014");
      // Wealth + VaR as money (full value, not rounded to thousands — let format show K via numFmt)
      if (wealthP50 != null) { wsSS.getCell(rowN, 6).value = toNum(wealthP50); wsSS.getCell(rowN, 6).numFmt = FMT_MONEY; }
      if (var5 != null) { wsSS.getCell(rowN, 7).value = toNum(var5); wsSS.getCell(rowN, 7).numFmt = FMT_MONEY; }
      // Ruin age as number when present, "Never" sentinel otherwise
      if (ruinAge != null && ruinAge < 999) { wsSS.getCell(rowN, 8).value = toNum(ruinAge); wsSS.getCell(rowN, 8).numFmt = '0" ans"'; }
      else set(wsSS, wsSS.getCell(rowN, 8), fr ? "Jamais" : "Never");
      set(wsSS, wsSS.getCell(rowN, 9), resilience);
      set(wsSS, wsSS.getCell(rowN, 10), desc);
    }
    _writeStressRow(20, fr ? "R\u00e9f\u00e9rence" : "Reference", "\u2014", mc.succ, null, mc.rMedF || mc.medF || 0, mc.rVar5 || mc.var5 || 0, mc.p5Ruin, "\u2014", fr ? "Plan tel que configur\u00e9" : "Plan as configured");
    var st = stressResults.slice(0, 5);
    st.forEach(function(s, i) {
      var deltaPts = Math.round((toNum(s.succ) - toNum(mc.succ)) * 100);
      var res = toNum(s.succ) >= 0.8 ? (fr ? "Robuste" : "Robust") : toNum(s.succ) >= 0.65 ? (fr ? "Mod\u00e9r\u00e9" : "Moderate") : (fr ? "Fragile" : "Fragile");
      _writeStressRow(21 + i, s.name || s.key || "", s.period || "\u2014", s.succ, deltaPts, s.medF || 0, s.var5 || 0, s.medRuin, res, s.desc || "");
    });
    styleTable(wsSS, { hr: 19, fr: 20, to: Math.max(20, 20 + st.length), fc: 2, lc: 10 });
    footer(wsSS, 28);

    // ────────────────────────────────────────────────────────────
    // SHEET 9: SUCCESSION
    // ────────────────────────────────────────────────────────────
    var wsE = wb.addWorksheet(fr ? "Succession" : "Estate");
    setColWidths(wsE, [3, 28, 18, 18, 18, 32, 14, 14, 14, 14, 14, 14, 14, 14]);
    printSetup(wsE);
    addTabBanner(wsE,
      fr ? "Analyse successorale" : "Estate Analysis",
      fr ? "Distribution MC de l'h\u00e9ritage net  \u2022  Cascade fiscale au d\u00e9c\u00e8s" : "MC estate distribution  \u2022  Tax cascade at death", 14);

    addTitle(wsE, 5, 2, fr ? "DISTRIBUTION DE L'H\u00c9RITAGE NET (" + nSim + " SIMULATIONS)" : "NET ESTATE DISTRIBUTION (" + nSim + " SIMULATIONS)", "", 13);
    setRow(wsE, 7, 2, ["Percentile", fr ? "H\u00e9ritage net" : "Net estate", fr ? "Imp\u00f4t success." : "Estate tax", fr ? "Patrimoine brut" : "Gross estate", fr ? "Interpr\u00e9tation" : "Interpretation"]);
    var eData = [
      ["P5", mc.p5EstateNet, mc.p5EstateTax, fr ? "March\u00e9s tr\u00e8s d\u00e9favorables" : "Very unfavorable"],
      ["P25", mc.p25EstateNet, mc.p25EstateTax, fr ? "Quart inf\u00e9rieur" : "Lower quartile"],
      ["P50", mc.medEstateNet, mc.medEstateTax, fr ? "R\u00e9sultat le plus probable" : "Most likely"],
      ["P75", mc.p75EstateNet, mc.p75EstateTax, fr ? "March\u00e9s favorables" : "Favorable"],
      ["P95", mc.p95EstateNet, mc.p95EstateTax, fr ? "March\u00e9s tr\u00e8s haussiers" : "Very bullish"]
    ];
    eData.forEach(function(ed, i) {
      var r = 8 + i;
      set(wsE, wsE.getCell(r, 2), ed[0]);
      wsE.getCell(r, 3).value = toNum(ed[1]); wsE.getCell(r, 3).numFmt = FMT_MONEY;
      wsE.getCell(r, 4).value = toNum(ed[2]); wsE.getCell(r, 4).numFmt = FMT_MONEY;
      wsE.getCell(r, 5).value = toNum(ed[1]) + toNum(ed[2]); wsE.getCell(r, 5).numFmt = FMT_MONEY;
      set(wsE, wsE.getCell(r, 6), ed[3]);
    });
    styleTable(wsE, { hr: 7, fr: 8, to: 12, fc: 2, lc: 6 });

    // Tax cascade — anchored on MC engine output (mc.medEstateTax,
    // mc.medEstateNet). The engine computes the full deemed-disposition,
    // probate, and life-insurance flow simulation-by-simulation; the cascade
    // here decomposes the median result into its principal components so
    // the user can read where the tax came from. Any residual (engine −
    // sum of components) is surfaced explicitly instead of hidden.
    addTitle(wsE, 14, 2, fr ? "CASCADE FISCALE AU D\u00c9C\u00c8S (M\u00c9DIANE)" : "TAX CASCADE AT DEATH (MEDIAN)", "", 13);
    var medNetMC = toNum(mc.medEstateNet);
    var medTaxMC = toNum(mc.medEstateTax);
    var medGross = medNetMC + medTaxMC;
    var pdLast = (mc.pD || []).length > 0 ? mc.pD[mc.pD.length - 1] : {};
    var rrAtDeath = toNum(pdLast.rrM || pdLast.aRR || pdLast.balRR || 0);
    var nrAtDeath = toNum(pdLast.nrM || pdLast.aNR || pdLast.balNR || 0);
    // RRIF disposition component — marginal rate on terminal RRSP balance.
    var rrifTax = 0;
    if (rrAtDeath > 0 && D.calcTax) {
      var _yrsToDeath = (deathAge || 90) - age;
      var _termTx = D.calcTax(rrAtDeath, _yrsToDeath, prov, inf, true);
      rrifTax = Math.round(_termTx.total || 0);
    }
    // NR capital gains component — proxy: half-inclusion × NR balance ×
    // approx. marginal rate. Deviation from the engine's actual cost-base
    // tracking appears in the reconciliation row below.
    var nrCapGainTax = Math.round(nrAtDeath * 0.5 * 0.30);
    // Probate: province-specific (QC $0; ON ~1.5%; BC ~1.4%; others ~0.5%).
    var probateRate = prov === "QC" ? 0 : prov === "ON" ? 0.015 : prov === "BC" ? 0.014 : 0.005;
    var probate = Math.round(medGross * probateRate);
    // Admin fees: notary + accounting, typical 0.5% of gross estate + $5k flat.
    var adminFees = 5000 + Math.round(medGross * 0.005);
    // Component sum, then any residual is attributed to "Other tax" (RRSP
    // contribution recapture, foreign assets, etc.) so the bottom line
    // reconciles exactly with the MC median.
    var knownComponents = rrifTax + nrCapGainTax + probate + adminFees;
    var otherTax = Math.max(0, medTaxMC - (rrifTax + nrCapGainTax + probate));
    setRow(wsE, 16, 2, [fr ? "Composante" : "Component", fr ? "Montant" : "Amount", fr ? "Base" : "Basis", "Notes"]);
    var cascade = [
      [fr ? "Actifs financiers bruts (P50)" : "Gross financial assets (P50)", medGross, fr ? "M\u00e9diane MC" : "MC median", fr ? "H\u00e9ritage net + imp\u00f4t total (moteur)" : "Net estate + total tax (engine)"],
      [fr ? "(\u2212) Disposition FERR" : "(\u2212) RRIF disposition", -rrifTax, fr ? "Solde REER \u00d7 taux " + prov : "RRSP balance \u00d7 " + prov, fr ? "Calcul\u00e9 via calcTax, aligné moteur" : "Via calcTax, engine-aligned"],
      [fr ? "(\u2212) Gains capital NR" : "(\u2212) NR capital gains", -nrCapGainTax, fr ? "50% inclusion \u00d7 30% taux" : "50% inclusion \u00d7 30% rate", fr ? "Proxy \u2014 moteur suit l'ACB par sim" : "Proxy \u2014 engine tracks ACB per sim"],
      [fr ? "(\u2212) R\u00e9sidence principale" : "(\u2212) Primary residence", 0, fr ? "Exempt\u00e9e (art. 40(2)(b) LIR)" : "Exempt (ITA 40(2)(b))", fr ? "Aucun gain en capital au d\u00e9c\u00e8s" : "No capital gain at death"],
      [fr ? "(\u2212) Autres imp\u00f4ts" : "(\u2212) Other tax", -otherTax, fr ? "R\u00e9siduel MC" : "MC residual", fr ? "\u00c9cart entre cascade et moteur (r\u00e9cup. REER, \u00e9trangers, etc.)" : "Cascade-vs-engine delta (RRSP recapture, foreign, etc.)"],
      [fr ? "(\u2212) Homologation" : "(\u2212) Probate", -probate, prov === "QC" ? "0% (QC)" : (probateRate * 100).toFixed(2) + "%", fr ? "Taux provincial appliqu\u00e9 au brut" : "Provincial rate applied to gross"],
      [fr ? "(\u2212) Frais admin." : "(\u2212) Admin fees", -adminFees, fr ? "0,5% + 5 000 $" : "0.5% + $5,000", fr ? "Notaire + comptable" : "Notary + accounting"],
      [fr ? "(+) Assurance-vie" : "(+) Life insurance", lifeInsBenefit, fr ? "Prestation au d\u00e9c\u00e8s" : "Death benefit", fr ? "Non imposable \u2014 transf\u00e9r\u00e9e aux b\u00e9n\u00e9ficiaires" : "Tax-free \u2014 paid to beneficiaries"],
      [fr ? "H\u00c9RITAGE NET (M\u00c9DIANE MC)" : "NET ESTATE (MC MEDIAN)", medNetMC, fr ? "Moteur" : "Engine", fr ? "Aligne avec rapport HTML" : "Matches HTML report"]
    ];
    cascade.forEach(function(c, i) {
      var r = 17 + i;
      set(wsE, wsE.getCell(r, 2), c[0]);
      wsE.getCell(r, 3).value = toNum(c[1]); wsE.getCell(r, 3).numFmt = FMT_MONEY;
      set(wsE, wsE.getCell(r, 4), c[2]);
      set(wsE, wsE.getCell(r, 6), c[3] || "");
    });
    // Bold the final NET ESTATE row (now row 25 due to "Other tax" addition)
    var estFinalRow = 17 + cascade.length - 1;
    wsE.getCell(estFinalRow, 2).font = { name: "Calibri", size: 11, bold: true, color: { argb: CL.gold } };
    wsE.getCell(estFinalRow, 3).font = { name: "Calibri", size: 11, bold: true, color: { argb: CL.gold } };
    styleTable(wsE, { hr: 16, fr: 17, to: estFinalRow, fc: 2, lc: 6 });
    footer(wsE, estFinalRow + 3);

    // ────────────────────────────────────────────────────────────
    // SHEET 9A: DETTES / DEBTS
    // ────────────────────────────────────────────────────────────
    // params.debts[] is tracked by the engine: each debt with a positive
    // balance has interest accumulate and payments applied per the
    // amortization formula. Previously the workbook ignored this entirely,
    // leaving pre-retirement users with debt blind to their payoff horizon.
    // Source: params.debts[] {name, type, bal, rate, pay, deductible}.
    // Amortization math: same annuity formula the longform UI uses.
    var debts = p.debts || [];
    var activeDebts = debts.filter(function (d) { return toNum(d.bal) > 0; });
    var wsD = wb.addWorksheet(fr ? "Dettes" : "Debts");
    setColWidths(wsD, [3, 22, 16, 14, 14, 14, 14, 14, 32, 14, 14, 14, 14, 14]);
    printSetup(wsD);
    addTabBanner(wsD,
      fr ? "Dettes et \u00e9ch\u00e9ancier" : "Debts and Payoff Schedule",
      fr ? "Soldes, paiements mensuels, ann\u00e9e de liquidation" : "Balances, monthly payments, payoff year", 14);

    if (activeDebts.length === 0) {
      addTitle(wsD, 5, 2, fr ? "AUCUNE DETTE ACTIVE" : "NO ACTIVE DEBT", "", 13);
      wsD.mergeCells(7, 2, 7, 8);
      set(wsD, wsD.getCell(7, 2), fr ? "Le plan n'inclut aucune dette avec solde positif. Si vous avez une marge de cr\u00e9dit, pr\u00eat auto, pr\u00eat \u00e9tudiant ou solde de carte de cr\u00e9dit, ajoutez-le dans la section Dettes du formulaire pour qu'il soit int\u00e9gr\u00e9 aux projections (int\u00e9r\u00eats d\u00e9duits du cash flow, remboursement planifi\u00e9 avant la retraite). Votre hypoth\u00e8que r\u00e9sidentielle est g\u00e9r\u00e9e dans l'onglet Immobilier, pas ici." : "The plan has no debt with a positive balance. If you hold a line of credit, auto loan, student loan or credit card balance, add it in the Debts section of the form so it's integrated into the projections (interest deducted from cash flow, planned payoff before retirement). Your home mortgage is handled on the Real Estate tab, not here.");
      wsD.getCell(7, 2).font = { name: "Calibri", size: 11, italic: true, color: { argb: CL.muted } };
      wsD.getCell(7, 2).alignment = { wrapText: true, vertical: "top" };
      wsD.getRow(7).height = 72;
      footer(wsD, 11);
    } else {
      // Summary inventory
      addTitle(wsD, 5, 2, fr ? "INVENTAIRE DES DETTES" : "DEBT INVENTORY", "", 13);
      setRow(wsD, 7, 2, [fr ? "Dette" : "Debt", fr ? "Type" : "Type", fr ? "Solde" : "Balance", fr ? "Taux" : "Rate", fr ? "Paiement /mois" : "Payment /mo", fr ? "Terme restant" : "Term left", fr ? "Int\u00e9r\u00eats ded." : "Deductible", fr ? "Int\u00e9r\u00eats /an" : "Interest /yr"]);
      // Compute per-debt derived figures. Amortization formula uses the
      // standard annuity PV relation: if the user-supplied pay covers at
      // least interest, term_months = -ln(1 - bal × r / pay) / ln(1 + r).
      var totalBal = 0, totalPayMo = 0, totalIntAnn = 0;
      activeDebts.forEach(function (d, i) {
        var r = 8 + i;
        var bal = toNum(d.bal), rate = toNum(d.rate), pay = toNum(d.pay);
        var rM = rate / 12;
        var intAnn = bal * rate;
        totalBal += bal; totalPayMo += pay; totalIntAnn += intAnn;
        // Term estimate from pay (months) — fallback to d.term (years) if
        // pay insufficient to cover interest (pay ≤ bal × r month).
        var termMo;
        if (pay > bal * rM && rM > 0) {
          termMo = Math.round(-Math.log(1 - bal * rM / pay) / Math.log(1 + rM));
        } else if (toNum(d.term) > 0) {
          termMo = toNum(d.term) * 12;
        } else {
          termMo = 0; // open-ended; interest-only or negative amortization
        }
        var termDisplay = termMo > 0 ? (Math.floor(termMo / 12) + (fr ? " ans " : "y ") + (termMo % 12) + (fr ? " mois" : "m")) : (fr ? "Ind\u00e9termin\u00e9" : "Undefined");
        set(wsD, wsD.getCell(r, 2), d.name || ((fr ? "Dette " : "Debt ") + (i + 1)));
        set(wsD, wsD.getCell(r, 3), d.type || (fr ? "Autre" : "Other"));
        wsD.getCell(r, 4).value = bal; wsD.getCell(r, 4).numFmt = FMT_MONEY;
        wsD.getCell(r, 5).value = rate; wsD.getCell(r, 5).numFmt = FMT_PCT;
        wsD.getCell(r, 6).value = pay; wsD.getCell(r, 6).numFmt = FMT_MONEY;
        set(wsD, wsD.getCell(r, 7), termDisplay);
        set(wsD, wsD.getCell(r, 8), d.deductible ? (fr ? "Oui (Smith)" : "Yes (Smith)") : (fr ? "Non" : "No"));
        wsD.getCell(r, 9).value = intAnn; wsD.getCell(r, 9).numFmt = FMT_MONEY;
      });
      // Total row
      var debtTotalRow = 8 + activeDebts.length;
      set(wsD, wsD.getCell(debtTotalRow, 2), fr ? "TOTAL" : "TOTAL");
      wsD.getCell(debtTotalRow, 4).value = totalBal; wsD.getCell(debtTotalRow, 4).numFmt = FMT_MONEY;
      wsD.getCell(debtTotalRow, 6).value = totalPayMo; wsD.getCell(debtTotalRow, 6).numFmt = FMT_MONEY;
      wsD.getCell(debtTotalRow, 9).value = totalIntAnn; wsD.getCell(debtTotalRow, 9).numFmt = FMT_MONEY;
      for (var dtc = 2; dtc <= 9; dtc++) {
        wsD.getCell(debtTotalRow, dtc).font = { name: "Calibri", size: 11, bold: true, color: { argb: CL.gold } };
      }
      styleTable(wsD, { hr: 7, fr: 8, to: debtTotalRow, fc: 2, lc: 9 });

      // Aggregate payoff schedule — if the user's payments cover interest,
      // run the amortization forward month-by-month across all debts and
      // show a compressed yearly snapshot (up to 20 years or zero-balance).
      var schedAnchor = debtTotalRow + 2;
      addTitle(wsD, schedAnchor, 2, fr ? "\u00c9CH\u00c9ANCIER AGR\u00c9G\u00c9 (REMBOURSEMENT M\u00c9NAGE)" : "AGGREGATE PAYOFF SCHEDULE (HOUSEHOLD)", "", 13);
      setRow(wsD, schedAnchor + 2, 2, [fr ? "An" : "Yr", fr ? "\u00c2ge" : "Age", fr ? "Solde d\u00e9but" : "Opening bal", fr ? "Int\u00e9r\u00eats vers\u00e9s" : "Interest paid", fr ? "Capital rembours\u00e9" : "Principal paid", fr ? "Solde fin" : "Closing bal", fr ? "% rembours\u00e9" : "% paid"]);
      var schedRow = schedAnchor + 3;
      // Copy current balances so we don't mutate params.
      var state = activeDebts.map(function (d) { return { bal: toNum(d.bal), rate: toNum(d.rate), pay: toNum(d.pay) }; });
      var initialTotal = state.reduce(function (s, x) { return s + x.bal; }, 0);
      var yr = 0, maxYrs = 20;
      while (yr < maxYrs) {
        var opening = state.reduce(function (s, x) { return s + x.bal; }, 0);
        if (opening < 1) break;
        var yrInt = 0, yrPrin = 0;
        for (var mo = 0; mo < 12; mo++) {
          state.forEach(function (x) {
            if (x.bal <= 0) return;
            var intMo = x.bal * (x.rate / 12);
            var prinMo = Math.min(x.bal, Math.max(0, x.pay - intMo));
            x.bal = Math.max(0, x.bal - prinMo);
            yrInt += intMo; yrPrin += prinMo;
          });
        }
        var closing = state.reduce(function (s, x) { return s + x.bal; }, 0);
        set(wsD, wsD.getCell(schedRow, 2), y0 + yr);
        set(wsD, wsD.getCell(schedRow, 3), age + yr);
        wsD.getCell(schedRow, 4).value = opening; wsD.getCell(schedRow, 4).numFmt = FMT_MONEY;
        wsD.getCell(schedRow, 5).value = yrInt; wsD.getCell(schedRow, 5).numFmt = FMT_MONEY;
        wsD.getCell(schedRow, 6).value = yrPrin; wsD.getCell(schedRow, 6).numFmt = FMT_MONEY;
        wsD.getCell(schedRow, 7).value = closing; wsD.getCell(schedRow, 7).numFmt = FMT_MONEY;
        var pctPaid = initialTotal > 0 ? 1 - closing / initialTotal : 1;
        wsD.getCell(schedRow, 8).value = pctPaid; wsD.getCell(schedRow, 8).numFmt = FMT_PCT;
        schedRow++;
        yr++;
      }
      if (schedRow === schedAnchor + 3) {
        // Payments don't cover interest — surface the problem.
        wsD.mergeCells(schedRow, 2, schedRow, 8);
        set(wsD, wsD.getCell(schedRow, 2), fr ? "\u26a0 Les paiements actuels ne couvrent pas les int\u00e9r\u00eats. Le solde ne diminuera jamais avec ces montants. V\u00e9rifiez les paiements mensuels dans le formulaire." : "\u26a0 Current payments do not cover interest. Balance will never decrease at these amounts. Check monthly payments in the form.");
        wsD.getCell(schedRow, 2).font = { name: "Calibri", size: 11, bold: true, color: { argb: CL.red } };
        wsD.getCell(schedRow, 2).alignment = { wrapText: true };
        wsD.getRow(schedRow).height = 32;
        schedRow++;
      } else {
        styleTable(wsD, { hr: schedAnchor + 2, fr: schedAnchor + 3, to: schedRow - 1, fc: 2, lc: 8 });
      }
      footer(wsD, schedRow + 2);
    }

    // ────────────────────────────────────────────────────────────
    // SHEET 9B: ASSURANCE / INSURANCE
    // ────────────────────────────────────────────────────────────
    // Life / disability / critical illness / group coverage are all modeled
    // by the engine (commit 4b4d630): premiums drain NR yearly, death
    // benefit is added to the estate if the policy is in force, disability
    // triggers an insInvCov × disabMo payout, critical illness pays a
    // one-time insMGCov lump sum. This sheet surfaces the full picture
    // that was previously invisible to users.
    var wsIns = wb.addWorksheet(fr ? "Assurance" : "Insurance");
    setColWidths(wsIns, [3, 22, 16, 16, 16, 14, 14, 32, 14, 14, 14, 14, 14, 14]);
    printSetup(wsIns);
    addTabBanner(wsIns,
      fr ? "Protection d'assurance" : "Insurance Protection",
      fr ? "Vie \u2022 Invalidit\u00e9 \u2022 Maladies graves \u2022 Assurance collective" : "Life \u2022 Disability \u2022 Critical illness \u2022 Group", 14);

    // ── Coverage inventory ────────────────────────────────────────
    addTitle(wsIns, 5, 2, fr ? "INVENTAIRE DES COUVERTURES" : "COVERAGE INVENTORY", "", 13);
    setRow(wsIns, 7, 2, [fr ? "Type" : "Type", fr ? "Titulaire" : "Holder", fr ? "Couverture" : "Coverage", fr ? "Prime /mois" : "Premium /mo", fr ? "Prime /an" : "Premium /yr", fr ? "Police" : "Policy", "Notes"]);
    var _polType = function (t, d) {
      if (!t || t === "none") return fr ? "Aucune" : "None";
      if (t === "perm") return fr ? "Permanente" : "Permanent";
      return fr ? "Temporaire " + (d || 20) + " ans" : "Term " + (d || 20) + " yrs";
    };
    // All values sourced from params. lifeInsPremium/insViePrime are monthly;
    // annual premium is monthly × 12 so users can sum the yearly outflow.
    var insRows = [
      // Primary — life "simple" (lifeInsBenefit/Premium)
      (p.lifeInsBenefit || p.lifeInsPremium) ? [fr ? "Vie (simple)" : "Life (simple)", fr ? "Client" : "Client", p.lifeInsBenefit || 0, p.lifeInsPremium || 0, (p.lifeInsPremium || 0) * 12, fr ? "Non sp\u00e9cifi\u00e9e" : "Unspecified", fr ? "Entr\u00e9e sidebar \"Assurance\"" : "Sidebar \"Insurance\" entry"] : null,
      // Primary — life detailed (insViePrime/Cov/Type/Dur)
      (p.insViePrime || p.insVieCov) ? [fr ? "Vie \u2014 d\u00e9taill\u00e9e" : "Life \u2014 detailed", fr ? "Client" : "Client", p.insVieCov || 0, p.insViePrime || 0, (p.insViePrime || 0) * 12, _polType(p.insVieType, p.insVieDur), fr ? "D\u00e9c\u00e8s couvert pendant la dur\u00e9e" : "Death covered during term"] : null,
      // Primary — disability
      (p.insInvPrime || p.insInvCov) ? [fr ? "Invalidit\u00e9" : "Disability", fr ? "Client" : "Client", (p.insInvCov || 0) * 12, p.insInvPrime || 0, (p.insInvPrime || 0) * 12, fr ? "Rente mensuelle" : "Monthly benefit", fr ? "Active seulement pr\u00e9-retraite" : "Pre-retirement only"] : null,
      // Primary — critical illness
      (p.insMGPrime || p.insMGCov) ? [fr ? "Maladies graves" : "Critical illness", fr ? "Client" : "Client", p.insMGCov || 0, p.insMGPrime || 0, (p.insMGPrime || 0) * 12, fr ? "Forfaitaire" : "Lump sum", fr ? "Probabilit\u00e9 \u00e2ge-d\u00e9pend. (0,5-2,5%/an)" : "Age-dep. probability (0.5-2.5%/yr)"] : null,
      // Primary — group
      (p.insColPrime) ? [fr ? "Collective" : "Group", fr ? "Client" : "Client", 0, p.insColPrime || 0, (p.insColPrime || 0) * 12, fr ? "Part employ\u00e9" : "Employee share", fr ? "Sant\u00e9 + dentaire + vie de base" : "Health + dental + basic life"] : null,
      // Spouse mirrors
      (p.cOn && (p.cLifeInsBenefit || p.cLifeInsPremium)) ? [fr ? "Vie (simple)" : "Life (simple)", fr ? "Conjoint(e)" : "Spouse", p.cLifeInsBenefit || 0, p.cLifeInsPremium || 0, (p.cLifeInsPremium || 0) * 12, fr ? "Non sp\u00e9cifi\u00e9e" : "Unspecified", ""] : null,
      (p.cOn && (p.cInsViePrime || p.cInsVieCov)) ? [fr ? "Vie \u2014 d\u00e9taill\u00e9e" : "Life \u2014 detailed", fr ? "Conjoint(e)" : "Spouse", p.cInsVieCov || 0, p.cInsViePrime || 0, (p.cInsViePrime || 0) * 12, _polType(p.cInsVieType, p.cInsVieDur), ""] : null,
      (p.cOn && (p.cInsInvPrime || p.cInsInvCov)) ? [fr ? "Invalidit\u00e9" : "Disability", fr ? "Conjoint(e)" : "Spouse", (p.cInsInvCov || 0) * 12, p.cInsInvPrime || 0, (p.cInsInvPrime || 0) * 12, fr ? "Rente mensuelle" : "Monthly benefit", ""] : null,
      (p.cOn && (p.cInsMGPrime || p.cInsMGCov)) ? [fr ? "Maladies graves" : "Critical illness", fr ? "Conjoint(e)" : "Spouse", p.cInsMGCov || 0, p.cInsMGPrime || 0, (p.cInsMGPrime || 0) * 12, fr ? "Forfaitaire" : "Lump sum", ""] : null,
      (p.cOn && p.cInsColPrime) ? [fr ? "Collective" : "Group", fr ? "Conjoint(e)" : "Spouse", 0, p.cInsColPrime || 0, (p.cInsColPrime || 0) * 12, fr ? "Part employ\u00e9" : "Employee share", ""] : null
    ].filter(function (r) { return r !== null; });

    if (insRows.length === 0) {
      wsIns.mergeCells(8, 2, 8, 8);
      set(wsIns, wsIns.getCell(8, 2), fr ? "Aucune couverture saisie. Si vous avez des polices, remplissez-les dans la section Assurances du formulaire \u2014 elles seront incluses dans le plan (primes d\u00e9duites du cash flow, prestation au d\u00e9c\u00e8s ajout\u00e9e au patrimoine successoral, invalidit\u00e9/maladies graves mod\u00e9lis\u00e9es)." : "No coverage entered. If you hold policies, fill them in the Insurance section of the form \u2014 they'll be included in the plan (premiums drained from cash flow, death benefit added to estate, disability/CI modeled).");
      wsIns.getCell(8, 2).font = { name: "Calibri", size: 11, italic: true, color: { argb: CL.muted } };
      wsIns.getCell(8, 2).alignment = { wrapText: true, vertical: "top" };
      wsIns.getRow(8).height = 48;
    } else {
      insRows.forEach(function (row, i) {
        var r = 8 + i;
        set(wsIns, wsIns.getCell(r, 2), row[0]);
        set(wsIns, wsIns.getCell(r, 3), row[1]);
        wsIns.getCell(r, 4).value = toNum(row[2]); wsIns.getCell(r, 4).numFmt = FMT_MONEY;
        wsIns.getCell(r, 5).value = toNum(row[3]); wsIns.getCell(r, 5).numFmt = FMT_MONEY;
        wsIns.getCell(r, 6).value = toNum(row[4]); wsIns.getCell(r, 6).numFmt = FMT_MONEY;
        set(wsIns, wsIns.getCell(r, 7), row[5]);
        set(wsIns, wsIns.getCell(r, 8), row[6]);
      });
      // Total annual premium row
      var insEnd = 8 + insRows.length - 1;
      var insTotalRow = insEnd + 1;
      set(wsIns, wsIns.getCell(insTotalRow, 2), fr ? "TOTAL PRIME ANNUELLE" : "TOTAL ANNUAL PREMIUM");
      setFormula(wsIns, wsIns.getCell(insTotalRow, 6), 'SUM(F8:F' + insEnd + ')', FMT_MONEY);
      for (var itc = 2; itc <= 8; itc++) {
        wsIns.getCell(insTotalRow, itc).font = { name: "Calibri", size: 11, bold: true, color: { argb: CL.gold } };
      }
      styleTable(wsIns, { hr: 7, fr: 8, to: insTotalRow, fc: 2, lc: 8 });
    }

    // ── Coverage-need analysis (simplified, same logic as calcInsuranceNeed) ──
    var insAnchor = insRows.length > 0 ? (10 + insRows.length) : 12;
    addTitle(wsIns, insAnchor, 2, fr ? "ANALYSE DE BESOIN \u2014 VIE" : "NEEDS ANALYSIS \u2014 LIFE", "", 13);
    // Same method as calcInsuranceNeed in planner_v3.html (line 8165):
    // needs = survivor income 70% × post-ret years + $250k/child + debts + mortgage + final expenses
    // Resources = projected estate (P50) + existing life coverage
    var _retYrs = Math.max(0, (p.deathAge || 90) - (p.retAge || 65));
    var survivorIncNeed = (p.retSpM || 0) * 12 * 0.70 * _retYrs;
    var childNeed = (p.respKids || 0) * 250000;
    var debtNeed = (p.debts || []).reduce(function (s, d) { return s + toNum(d.bal); }, 0);
    var mtgNeed = (p.props || []).reduce(function (s, pr) { return s + (pr.on ? toNum(pr.mb) : 0); }, 0);
    var finalExp = 15000; // CRA median funeral + estate closing
    var totalNeed = survivorIncNeed + childNeed + debtNeed + mtgNeed + finalExp;
    var projEstate = toNum(mc.medEstateNet);
    var currentLifeCov = (p.lifeInsBenefit || 0) + (p.cLifeInsBenefit || 0)
      + ((p.insViePrime > 0) ? (p.insVieCov || 0) : 0)
      + ((p.cOn && p.cInsViePrime > 0) ? (p.cInsVieCov || 0) : 0);
    var gap = Math.max(0, totalNeed - projEstate - currentLifeCov);

    setRow(wsIns, insAnchor + 2, 2, [fr ? "Composante" : "Component", fr ? "Montant" : "Amount", fr ? "Calcul" : "Basis"]);
    var needRows = [
      [fr ? "Revenu survivant (70%)" : "Survivor income (70%)", survivorIncNeed, fr ? _fmtM(p.retSpM * 12 * 0.70, locale) + "/an \u00d7 " + _retYrs + " ans" : _fmtM(p.retSpM * 12 * 0.70, locale) + "/yr \u00d7 " + _retYrs + " yrs"],
      [fr ? "Enfants (REEE + co\u00fbts)" : "Children (RESP + costs)", childNeed, (p.respKids || 0) + (fr ? " enfant(s) \u00d7 250 000 $" : " child(ren) \u00d7 $250,000")],
      [fr ? "Remboursement dettes" : "Debt payoff", debtNeed, ((p.debts || []).filter(function (d) { return d.bal > 0; }).length) + (fr ? " compte(s)" : " account(s)")],
      [fr ? "Soldes hypoth\u00e9caires" : "Mortgage balances", mtgNeed, ((p.props || []).filter(function (pr) { return pr.on && pr.mb > 0; }).length) + (fr ? " propri\u00e9t\u00e9(s)" : " property(ies)")],
      [fr ? "Frais fun\u00e9raires + succession" : "Final expenses + estate", finalExp, fr ? "M\u00e9diane canadienne" : "Canadian median"],
      [fr ? "BESOIN TOTAL" : "TOTAL NEED", totalNeed, ""],
      [fr ? "(\u2212) Patrimoine projet\u00e9 au d\u00e9c\u00e8s (P50)" : "(\u2212) Projected estate at death (P50)", -projEstate, fr ? "M\u00e9diane MC" : "MC median"],
      [fr ? "(\u2212) Couverture vie existante" : "(\u2212) Existing life coverage", -currentLifeCov, fr ? "Somme des polices vie" : "Sum of life policies"],
      [fr ? "\u00c9CART (besoin additionnel)" : "GAP (additional need)", gap, fr ? "0 $ = aucun manque" : "$0 = no shortfall"]
    ];
    needRows.forEach(function (row, i) {
      var r = insAnchor + 3 + i;
      set(wsIns, wsIns.getCell(r, 2), row[0]);
      wsIns.getCell(r, 3).value = toNum(row[1]); wsIns.getCell(r, 3).numFmt = FMT_MONEY;
      set(wsIns, wsIns.getCell(r, 4), row[2]);
    });
    // Bold the TOTAL NEED and GAP rows (rows 6 and 9 of needRows, 0-indexed 5 and 8)
    var totalNeedRow = insAnchor + 3 + 5;
    var gapRow = insAnchor + 3 + 8;
    [totalNeedRow, gapRow].forEach(function (rr) {
      for (var cc = 2; cc <= 4; cc++) {
        wsIns.getCell(rr, cc).font = { name: "Calibri", size: 11, bold: true, color: { argb: gap > 0 && rr === gapRow ? CL.red : CL.gold } };
      }
    });
    styleTable(wsIns, { hr: insAnchor + 2, fr: insAnchor + 3, to: gapRow, fc: 2, lc: 4 });

    // Disclaimer
    var insDiscRow = gapRow + 2;
    wsIns.mergeCells(insDiscRow, 2, insDiscRow, 8);
    set(wsIns, wsIns.getCell(insDiscRow, 2), fr ? "Cette analyse est informative. Consultez un conseiller en s\u00e9curit\u00e9 financi\u00e8re (titulaire de permis AMF au Qu\u00e9bec) pour \u00e9valuer vos besoins sp\u00e9cifiques et les produits adapt\u00e9s." : "This analysis is informational. Consult a licensed financial security advisor (AMF-licensed in Quebec) to evaluate your specific needs and appropriate products.");
    wsIns.getCell(insDiscRow, 2).font = { name: "Calibri", size: 10, italic: true, color: { argb: CL.muted } };
    wsIns.getCell(insDiscRow, 2).alignment = { wrapText: true, vertical: "top" };
    wsIns.getRow(insDiscRow).height = 36;
    footer(wsIns, insDiscRow + 2);

    // ────────────────────────────────────────────────────────────
    // SHEET 10: IMMOBILIER
    // ────────────────────────────────────────────────────────────
    var wsRE = wb.addWorksheet(fr ? "Immobilier" : "Real Estate");
    setColWidths(wsRE, [3, 24, 16, 16, 16, 12, 14, 12, 16, 14, 14, 14, 14, 14]);
    printSetup(wsRE);
    addTabBanner(wsRE,
      fr ? "Analyse immobili\u00e8re" : "Real Estate Analysis",
      fr ? "Propri\u00e9t\u00e9s, hypoth\u00e8ques, trajectoire de l'avoir net" : "Properties, mortgages, equity trajectory", 14);

    setRow(wsRE, 5, 2, [fr ? "Propri\u00e9t\u00e9" : "Property", fr ? "Valeur actuelle" : "Current value", fr ? "Hypoth\u00e8que" : "Mortgage", fr ? "Avoir net" : "Net equity", fr ? "Taux hyp." : "Mtg rate", fr ? "Amort." : "Amort.", fr ? "Appr\u00e9c." : "Apprec.", fr ? "Rev. locatif" : "Rental inc.", "Type"]);
    var activeProps = props.filter(function(pp) { return pp.on; }).slice(0, 3);
    activeProps.forEach(function(pp, i) {
      var r = 6 + i;
      set(wsRE, wsRE.getCell(r, 2), pp.name || ((fr ? "Propri\u00e9t\u00e9 " : "Property ") + (i + 1)));
      wsRE.getCell(r, 3).value = toNum(pp.val); wsRE.getCell(r, 3).numFmt = FMT_MONEY;
      wsRE.getCell(r, 4).value = toNum(pp.mb); wsRE.getCell(r, 4).numFmt = FMT_MONEY;
      // Equity as formula (col E = val − mortgage) so Excel recomputes
      // if a user hand-edits figures to explore scenarios.
      setFormula(wsRE, wsRE.getCell(r, 5), 'C' + r + '-D' + r, FMT_MONEY, toNum(pp.val) - toNum(pp.mb));
      wsRE.getCell(r, 6).value = toNum(pp.mr); wsRE.getCell(r, 6).numFmt = FMT_PCT;
      set(wsRE, wsRE.getCell(r, 7), (pp.ma || 0) + (fr ? " ans" : " yrs"));
      wsRE.getCell(r, 8).value = toNum(pp.ri); wsRE.getCell(r, 8).numFmt = FMT_PCT;
      wsRE.getCell(r, 9).value = toNum(pp.rm); wsRE.getCell(r, 9).numFmt = FMT_MONEY;
      set(wsRE, wsRE.getCell(r, 10), pp.pri ? (fr ? "R\u00e9sidence" : "Primary") : (fr ? "Locatif" : "Rental"));
    });
    // Portfolio totals row — shown only when 2+ active properties. Uses
    // SUM formulas so it stays correct if the user tweaks per-property
    // values. Column 6 (rate) and 7 (amort) are skipped (not additive).
    var reTotalRow = 0;
    if (activeProps.length >= 2) {
      reTotalRow = 6 + activeProps.length;
      var reFirstRow = 6, reLastRow = reTotalRow - 1;
      set(wsRE, wsRE.getCell(reTotalRow, 2), fr ? "TOTAL portefeuille" : "Portfolio TOTAL");
      wsRE.getCell(reTotalRow, 2).font = { name: "Calibri", size: 11, bold: true, color: { argb: CL.gold } };
      setFormula(wsRE, wsRE.getCell(reTotalRow, 3), 'SUM(C' + reFirstRow + ':C' + reLastRow + ')', FMT_MONEY);
      setFormula(wsRE, wsRE.getCell(reTotalRow, 4), 'SUM(D' + reFirstRow + ':D' + reLastRow + ')', FMT_MONEY);
      setFormula(wsRE, wsRE.getCell(reTotalRow, 5), 'SUM(E' + reFirstRow + ':E' + reLastRow + ')', FMT_MONEY);
      setFormula(wsRE, wsRE.getCell(reTotalRow, 9), 'SUM(I' + reFirstRow + ':I' + reLastRow + ')', FMT_MONEY);
      for (var rtc = 2; rtc <= 10; rtc++) {
        wsRE.getCell(reTotalRow, rtc).font = { name: "Calibri", size: 11, bold: true, color: { argb: CL.gold } };
      }
    }
    var reEndRow = Math.max(6, reTotalRow || (5 + activeProps.length));
    styleTable(wsRE, { hr: 5, fr: 6, to: reEndRow, fc: 2, lc: 10 });
    footer(wsRE, reEndRow + 4);

    // ────────────────────────────────────────────────────────────
    // SHEET 11: ENTREPRISE (CCPC)
    // ────────────────────────────────────────────────────────────
    var wsB = wb.addWorksheet(fr ? "Entreprise (CCPC)" : "Business (CCPC)");
    setColWidths(wsB, [3, 10, 8, 16, 14, 14, 14, 14, 12, 12, 14, 12, 14]);
    printSetup(wsB);
    if (bizOn) {
      addTabBanner(wsB,
        fr ? "Actifs corporatifs (CCPC)" : "Corporate Assets (CCPC)",
        fr ? "Projection du solde, plan d'extraction, alertes DPE" : "Balance projection, extraction plan, SBD alerts", 14);
      setRow(wsB, 5, 2, [fr ? "An" : "Yr", fr ? "\u00c2ge" : "Age", fr ? "Solde corp." : "Corp. bal.", fr ? "Imp\u00f4t corp." : "Corp. tax", fr ? "Dividende" : "Dividend", fr ? "Salaire corp." : "Corp. salary", fr ? "Extraction" : "Extraction", "CDA", "RDTOH", fr ? "Rev. passif" : "Passive inc.", fr ? "Alerte DPE" : "SBD alert", "Phase"]);
      var biz = 6;
      revD.forEach(function(r) {
        if (biz > 42) return;
        if (toNum(r.corpBal) <= 0 && toNum(r.corpTax) <= 0 && toNum(r.corpDiv) <= 0) return;
        var phase = r.age < retAge ? (fr ? "Accumulation" : "Accumulation") : (fr ? "Extraction" : "Extraction");
        setRow(wsB, biz, 2, [y0 + (r.age - age), r.age || 0]);
        for (var bc = 4; bc <= 11; bc++) {
          var vals = [r.corpBal, r.corpTax, r.corpDiv, r.corpSal, r.corpExtract, r.corpCDA, r.corpRDTOH, r.corpPassive];
          wsB.getCell(biz, bc).value = toNum(vals[bc - 4]); wsB.getCell(biz, bc).numFmt = FMT_MONEY;
        }
        set(wsB, wsB.getCell(biz, 12), toNum(r.corpPassive) > 50000 ? (fr ? "\u26a0 OUI" : "\u26a0 YES") : "");
        set(wsB, wsB.getCell(biz, 13), phase);
        wsB.getCell(biz, 13).font = { name: "Calibri", size: 10, italic: true, color: { argb: CL.muted } };
        biz++;
      });
      styleTable(wsB, { hr: 5, fr: 6, to: Math.max(6, biz - 1), fc: 2, lc: 13 });
    } else {
      // Non-applicable: show a clear explanation rather than a blank sheet.
      // Keeps the workbook's 14-tab structure uniform across clients and
      // tells CCPC-less users what this tab would contain if they had one.
      addTabBanner(wsB,
        fr ? "Entreprise (CCPC)" : "Business (CCPC)",
        fr ? "Non applicable \u2014 aucune corporation configur\u00e9e dans ce plan" : "Not applicable \u2014 no corporation configured in this plan", 14);
      addTitle(wsB, 5, 2, fr ? "SECTION NON ACTIVE" : "SECTION NOT ACTIVE", "", 13);
      var naLines = fr ? [
        "Cette feuille projette les actifs corporatifs (solde, imp\u00f4t, dividendes, extraction, CDA, RDTOH) pour les propri\u00e9taires",
        "de soci\u00e9t\u00e9 priv\u00e9e sous contr\u00f4le canadien (SPCC).",
        "",
        "Votre plan n'a pas activ\u00e9 le module Entreprise \u2014 aucun revenu ni solde corporatif n'est mod\u00e9lis\u00e9.",
        "",
        "Pour activer : dans le formulaire, ouvrez la section Entreprise et choisissez le type SPCC ou travailleur autonome,",
        "puis entrez les revenus/d\u00e9penses et votre mode de r\u00e9mun\u00e9ration (salaire, dividende ou mixte).",
        "",
        "Cons\u00e9quences de l'absence :",
        "  \u2022 Les projections du patrimoine n'incluent aucun solde corporatif.",
        "  \u2022 La fiscalit\u00e9 d'extraction \u00e0 la retraite n'est pas calcul\u00e9e.",
        "  \u2022 La DGC (d\u00e9duction pour gains en capital) sur vente d'actions admissibles n'est pas appliqu\u00e9e."
      ] : [
        "This sheet projects corporate assets (balance, tax, dividends, extraction, CDA, RDTOH) for owners of",
        "Canadian-Controlled Private Corporations (CCPC).",
        "",
        "Your plan does not activate the Business module \u2014 no corporate income or balance is modeled.",
        "",
        "To activate: in the form, open the Business section and pick CCPC or sole-proprietor type, then enter",
        "revenues/expenses and your compensation mode (salary, dividend, or mix).",
        "",
        "Consequences of omission:",
        "  \u2022 Wealth projections do not include any corporate balance.",
        "  \u2022 Retirement extraction tax is not calculated.",
        "  \u2022 The LCGE (Lifetime Capital Gains Exemption) on qualifying share sales is not applied."
      ];
      naLines.forEach(function(line, idx) {
        set(wsB, wsB.getCell(7 + idx, 2), line);
        wsB.getCell(7 + idx, 2).font = { name: "Calibri", size: 11, color: { argb: CL.text } };
        wsB.mergeCells(7 + idx, 2, 7 + idx, 13);
      });
    }

    // ────────────────────────────────────────────────────────────
    // SHEET 12: MÉTHODOLOGIE
    // ────────────────────────────────────────────────────────────
    var wsM = wb.addWorksheet(fr ? "M\u00e9thodologie" : "Methodology");
    applySheetTemplate(wsM, 'textual');
    printSetup(wsM);
    addTabBanner(wsM,
      fr ? "M\u00e9thodologie & avis l\u00e9gal" : "Methodology & Legal Notice",
      fr ? "Fonctionnement du moteur  \u2022  Param\u00e8tres de lissage  \u2022  Avis r\u00e9glementaire" : "Engine overview  \u2022  Smoothing parameters  \u2022  Regulatory notice", 14);

    addTitle(wsM, 5, 2, fr ? "COMPOSANTES DU MOTEUR" : "ENGINE COMPONENTS", "", 13);
    setRow(wsM, 7, 2, [fr ? "Composante" : "Component", "Description", fr ? "D\u00e9tails" : "Details"]);
    var meth = [
      [fr ? "1. Projection d\u00e9terministe" : "1. Deterministic", fr ? "Chemin unique, rendements esp\u00e9r\u00e9s" : "Single path, expected returns", "optimizeDecum()"],
      [fr ? "2. Monte Carlo" : "2. Monte Carlo", nSim + " sims", "t-Student (df=5)"],
      [fr ? "3. Corr\u00e9lation" : "3. Correlation", fr ? "5 classes d'actifs" : "5 asset classes", "Cholesky 5\u00d75"],
      [fr ? "4. Fiscalit\u00e9" : "4. Tax", fr ? "Paliers progressifs" : "Progressive brackets", fr ? "Cr\u00e9dits \u00e2ge/pension, r\u00e9cup. PSV" : "Age/pension credits, OAS clawback"],
      [fr ? "5. Mortalit\u00e9" : "5. Mortality", stochMort ? "CPM 2023" : (fr ? "D\u00e9terministe" : "Deterministic"), ""],
      [fr ? "6. Retraits" : "6. Withdrawals", fr ? "Ordre dynamique" : "Dynamic order", "NR \u2192 Meltdown \u2192 REER \u2192 CELI"],
      [fr ? "7. Lissage" : "7. Smoothing", fr ? "\u00c9vite les variations brusques" : "Avoids abrupt changes", "MC blend 70/30"],
      [fr ? "8. Comportemental" : "8. Behavioral", fr ? "Ajustement selon l'\u00e2ge" : "Age-based", "Go " + Math.round(goP * 100) + "% / Slow " + Math.round(slP * 100) + "% / No " + Math.round(noP * 100) + "%"]
    ];
    meth.forEach(function(m, i) { setRow(wsM, 8 + i, 2, m); });
    styleTable(wsM, { hr: 7, fr: 8, to: 15, fc: 2, lc: 4 });

    // Smoothing
    addTitle(wsM, 17, 2, fr ? "CONSTANTES DE LISSAGE" : "SMOOTHING CONSTANTS", "", 13);
    setRow(wsM, 19, 2, [fr ? "Constante" : "Constant", fr ? "Valeur" : "Value", fr ? "R\u00f4le" : "Role"]);
    [["MELT", "\u00b140%/an"], ["MELT_FLOOR", "5 000 $"], ["SPEND", "\u00b130%/an"], ["SPEND_FLOOR", "10 000 $"], ["BACK", "\u00b140%"], ["BACK_FLOOR", "15 000 $"], ["NR_OVER", "1.50\u00d7"], ["MC_BLEND", "70/30"]].forEach(function(s, i) { setRow(wsM, 20 + i, 2, s); });
    styleTable(wsM, { hr: 19, fr: 20, to: 27, fc: 2, lc: 4 });

    // Report ID
    addTitle(wsM, 29, 2, fr ? "IDENTIFICATION DU RAPPORT" : "REPORT IDENTIFICATION", "", 13);
    setRow(wsM, 31, 2, ["Version", "v11.12.9"]); setRow(wsM, 32, 2, ["Date", todayLong]);
    setRow(wsM, 33, 2, ["Client", cName]); setRow(wsM, 34, 2, ["Province", prov]);
    setRow(wsM, 35, 2, ["Simulations", String(nSim)]); setRow(wsM, 36, 2, [fr ? "Mortalit\u00e9" : "Mortality", stochMort ? "CPM 2023" : (fr ? "D\u00e9terministe" : "Deterministic")]);

    // Legal
    addTitle(wsM, 38, 2, fr ? "AVIS R\u00c9GLEMENTAIRE" : "REGULATORY NOTICE", "", 13);
    wsM.mergeCells(40, 2, 40, 14);
    set(wsM, wsM.getCell(40, 2), fr ? "Les projections sont fournies \u00e0 titre informatif uniquement et ne constituent pas un conseil financier." : "Projections are for informational purposes only and do not constitute financial advice.");
    wsM.getCell(40, 2).font = SUB_FONT;
    wsM.mergeCells(41, 2, 41, 14);
    set(wsM, wsM.getCell(41, 2), fr ? "BuildFi Technologies inc. n'est pas un conseiller financier." : "BuildFi Technologies inc. is not a financial advisor.");
    wsM.getCell(41, 2).font = SUB_FONT;
    footer(wsM, 44);

    // ────────────────────────────────────────────────────────────
    // POPULATE COVER (already created as first tab)
    // ────────────────────────────────────────────────────────────
    setColWidths(wsCover, [3, 18, 18, 18, 18, 18, 18, 18, 18, 14, 14, 14, 14, 14]);
    wsCover.views = [{ state: "frozen", ySplit: 1 }];

    // Dark banner rows 1-5
    for (var cbr = 1; cbr <= 5; cbr++) {
      for (var cbc = 1; cbc <= 14; cbc++) wsCover.getCell(cbr, cbc).fill = DARK_FILL;
    }
    wsCover.mergeCells(1, 2, 1, 14);
    wsCover.getCell(1, 2).value = fr ? "RAPPORT D\u00c9TAILL\u00c9" : "DETAILED REPORT";
    wsCover.getCell(1, 2).font = { name: "Calibri", size: 28, bold: true, color: { argb: CL.gold } };
    wsCover.getCell(1, 2).alignment = { horizontal: "left", vertical: "middle" };
    wsCover.getRow(1).height = 42;

    wsCover.mergeCells(2, 2, 2, 14);
    wsCover.getCell(2, 2).value = fr ? "Rapport financier d\u00e9taill\u00e9" : "Detailed Financial Report";
    wsCover.getCell(2, 2).font = { name: "Calibri", size: 13, color: { argb: CL.gold } };
    wsCover.getCell(2, 2).alignment = { horizontal: "left", vertical: "middle" };
    wsCover.getRow(2).height = 20;

    wsCover.mergeCells(3, 2, 3, 14);
    wsCover.getCell(3, 2).value = cName;
    wsCover.getCell(3, 2).font = { name: "Calibri", size: 18, bold: true, color: { argb: CL.white } };
    wsCover.getCell(3, 2).alignment = { horizontal: "left", vertical: "middle" };
    wsCover.getRow(3).height = 28;

    // Run metadata: date, sim count, engine version, run ID. Engine version
    // comes from window.BFmt.VERSION (single source of truth, matches the
    // header shown in the HTML report). Run ID is a compact timestamp so
    // two workbooks generated seconds apart can be distinguished.
    var engineVer = (window.BFmt && window.BFmt.VERSION) ? window.BFmt.VERSION : "";
    var runId = "BF-" + (new Date()).toISOString().replace(/[-:]/g, "").slice(0, 15);
    var metaLine = todayLong + "  \u2022  " + nSim + (fr ? " simulations MC" : " MC simulations")
      + (engineVer ? "  \u2022  " + (fr ? "Moteur " : "Engine ") + engineVer : "")
      + "  \u2022  " + (fr ? "ID " : "ID ") + runId;
    wsCover.mergeCells(4, 2, 4, 14);
    wsCover.getCell(4, 2).value = metaLine;
    wsCover.getCell(4, 2).font = { name: "Calibri", size: 10, color: { argb: CL.cccccc } };
    wsCover.getCell(4, 2).alignment = { horizontal: "left", vertical: "middle" };
    wsCover.getRow(4).height = 18;

    wsCover.getRow(5).height = 12;

    if (logoId != null) { try { wsCover.addImage(logoId, { tl: { col: 11.1, row: 0.5 }, ext: { width: 170, height: 80 } }); } catch (_) {} }

    // KPI cards on cover (rows 7-10)
    var cvKpiMerges = [[2,4],[5,7],[8,10],[11,13]];
    var cvKpiLabels = [
      fr ? "Taux de succ\u00e8s" : "Success rate",
      fr ? "Patrimoine m\u00e9dian" : "Median wealth",
      fr ? "Note du plan" : "Plan grade",
      fr ? "Alpha fiscal" : "Tax alpha"
    ];
    // Row 7: labels
    wsCover.getRow(7).height = 18;
    cvKpiMerges.forEach(function(m, i) {
      wsCover.mergeCells(7, m[0], 7, m[1]);
      wsCover.getCell(7, m[0]).value = cvKpiLabels[i];
      wsCover.getCell(7, m[0]).font = { name: "Calibri", size: 10, color: { argb: CL.muted } };
      wsCover.getCell(7, m[0]).alignment = { horizontal: "center", vertical: "middle" };
      wsCover.getCell(7, m[0]).fill = CARD_FILL;
      wsCover.getCell(7, m[0]).border = { top: THIN(CL.border), left: THIN(CL.border), bottom: THIN(CL.border), right: THIN(CL.border) };
    });
    // Row 8-9: values (merged tall)
    wsCover.getRow(8).height = 48;
    wsCover.getRow(9).height = 8;
    cvKpiMerges.forEach(function(m) {
      wsCover.mergeCells(8, m[0], 9, m[1]);
      var c = wsCover.getCell(8, m[0]);
      c.fill = CARD_FILL;
      c.border = { top: THIN(CL.border), left: THIN(CL.border), bottom: THIN(CL.border), right: THIN(CL.border) };
      c.alignment = { horizontal: "center", vertical: "middle" };
    });
    // Success rate
    wsCover.getCell(8, 2).value = toNum(mc.succ);
    wsCover.getCell(8, 2).numFmt = "0%";
    wsCover.getCell(8, 2).font = { name: "Calibri", size: 30, bold: true, color: { argb: CL.gold } };
    // Median wealth
    wsCover.getCell(8, 5).value = toNum(mc.rMedF || mc.medF);
    wsCover.getCell(8, 5).numFmt = FMT_MONEY;
    wsCover.getCell(8, 5).font = { name: "Calibri", size: 24, bold: true, color: { argb: CL.gold } };
    // Grade
    wsCover.getCell(8, 8).value = gr.g;
    wsCover.getCell(8, 8).font = { name: "Calibri", size: 30, bold: true, color: { argb: gr.c } };
    // Tax alpha
    wsCover.getCell(8, 11).value = toNum(Math.max(0, taxAlpha));
    wsCover.getCell(8, 11).numFmt = FMT_MONEY;
    wsCover.getCell(8, 11).font = { name: "Calibri", size: 24, bold: true, color: { argb: CL.gold } };

    wsCover.mergeCells(11, 2, 12, 14);
    set(wsCover, wsCover.getCell(11, 2), fr ? "Document g\u00e9n\u00e9r\u00e9 automatiquement par BuildFi. Les projections sont informatives et ne constituent pas un conseil financier." : "Automatically generated by BuildFi. Projections are informational and do not constitute financial advice.");
    wsCover.getCell(11, 2).font = { name: "Calibri", size: 11, color: { argb: CL.muted }, italic: true };
    wsCover.getCell(11, 2).alignment = { wrapText: true, horizontal: "left", vertical: "top" };

    // ────────────────────────────────────────────────────────────
    // POPULATE README (already created as second tab)
    // ────────────────────────────────────────────────────────────
    setColWidths(wsReadme, [3, 26, 86, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14]);
    wsReadme.views = [{ state: "frozen", ySplit: 4 }];

    // Dark banner for README too
    for (var rbr = 1; rbr <= 3; rbr++) {
      for (var rbc = 1; rbc <= 14; rbc++) wsReadme.getCell(rbr, rbc).fill = DARK_FILL;
    }
    wsReadme.getRow(1).height = 8;
    wsReadme.mergeCells(2, 2, 2, 14);
    wsReadme.getCell(2, 2).value = fr ? "README \u2014 Guide du fichier Excel" : "README \u2014 Excel Guide";
    wsReadme.getCell(2, 2).font = { name: "Calibri", size: 18, bold: true, color: { argb: CL.gold } };
    wsReadme.getCell(2, 2).alignment = { horizontal: "left", vertical: "middle" };
    wsReadme.getRow(2).height = 34;
    wsReadme.mergeCells(3, 2, 3, 14);
    wsReadme.getCell(3, 2).value = "BuildFi Technologies inc. \u2022 buildfi.ca";
    wsReadme.getCell(3, 2).font = { name: "Calibri", size: 10, color: { argb: CL.cccccc } };
    wsReadme.getRow(3).height = 18;

    if (logoId != null) { try { wsReadme.addImage(logoId, { tl: { col: 1.05, row: 0.8 }, ext: { width: 130, height: 62 } }); } catch (_) {} }

    set(wsReadme, wsReadme.getCell(5, 2), fr ? "Comment lire ce fichier" : "How to read this file");
    wsReadme.getCell(5, 2).font = { name: "Calibri", size: 13, bold: true, color: { argb: CL.gold } };
    var rl = [
      fr ? "1) Commencez par l'onglet Sommaire pour la vue ex\u00e9cutive." : "1) Start with Summary for the executive view.",
      fr ? "2) Utilisez Flux de tr\u00e9sorerie et Retraits d\u00e9taill\u00e9s pour le pas-\u00e0-pas annuel." : "2) Use Cash Flow and Withdrawals for year-by-year detail.",
      fr ? "3) Les montants sont en dollars nominaux sauf indication contraire." : "3) Amounts are nominal dollars unless noted.",
      fr ? "4) Les feuilles Sensibilit\u00e9 et Fiscalit\u00e9 montrent les \u00e9carts entre strat\u00e9gies." : "4) Sensitivity and Tax show strategy deltas.",
      fr ? "5) Les r\u00e9sultats ne constituent pas un conseil financier." : "5) Results do not constitute financial advice."
    ];
    rl.forEach(function(t, i) {
      var r = 6 + i;
      wsReadme.mergeCells(r, 2, r, 14);
      set(wsReadme, wsReadme.getCell(r, 2), t);
      wsReadme.getCell(r, 2).font = BODY_FONT;
      wsReadme.getRow(r).height = 19;
    });

    set(wsReadme, wsReadme.getCell(13, 2), fr ? "Navigation rapide" : "Quick navigation");
    wsReadme.getCell(13, 2).font = { name: "Calibri", size: 13, bold: true, color: { argb: CL.gold } };
    var mapRow = 14;
    wb.worksheets.forEach(function(wsx) {
      if (!wsx || wsx.name === readmeName || wsx.name === coverName) return;
      wsReadme.getCell(mapRow, 2).value = { text: wsx.name, hyperlink: "#'" + wsx.name + "'!A1" };
      wsReadme.getCell(mapRow, 2).font = { name: "Calibri", size: 11, color: { argb: CL.link }, underline: true };
      wsReadme.getCell(mapRow, 2).border = { bottom: THIN() };
      wsReadme.getRow(mapRow).height = 19;
      mapRow++;
    });

    // ── Download ──
    var buf = await wb.xlsx.writeBuffer();
    var blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Helper for numeric rows — writes values starting at startCol
  function ws_setNumRow(ws, row, startCol, vals) {
    for (var i = 0; i < vals.length; i++) ws.getCell(row, startCol + i).value = toNum(vals[i]);
  }

  // ══════════════════════════════════════════════════════════════
  // BASIC SheetJS FALLBACK
  // ══════════════════════════════════════════════════════════════
  // Used only when ExcelJS fails to load. Earlier implementation drifted from
  // the real engine schema (read r.totalBal which engine doesn't write) and
  // wrote every cell as a string via fM(), producing an unsummable spreadsheet.
  // Rewritten to:
  //  - Read engine schema fields (sal/cSal/aRR/aTF/aNR, wFromRR/wFromTF/wFromNR)
  //  - Write values as numbers with !z (number format) so cells remain summable
  //  - Emit Sommaire + Cash Flow + Projection (3 sheets, real data, no formulas
  //    since SheetJS .aoa_to_sheet doesn't support per-cell formula construction
  //    cleanly; for formulas the user gets the Pro path)
  function buildExcelBasic(data) {
    var XLSX = window.XLSX;
    if (!XLSX || !XLSX.utils) { alert("SheetJS not loaded"); return; }
    var F = window.BFmt, D = window.BData;
    if (!F || !D) { alert("Dependencies missing"); return; }
    var d = D.buildReportPayload(data);
    if (d.empty) { alert(d.fr ? "Lancez une simulation d'abord." : "Run a simulation first."); return; }
    var mc = d.mc, p = d.p, client = d.client, fr = d.fr;
    var revData = d.revData;
    var wb = XLSX.utils.book_new();
    var moneyFmt = '#,##0" $"';
    var pctFmt = '0.0%';

    // Helper: convert AOA where each cell can be {v:value, t:type, z:format}
    // into a SheetJS sheet that preserves number types + format codes.
    function addSheetTyped(name, rows) {
      var ws = {};
      var range = { s: { c: 0, r: 0 }, e: { c: 0, r: 0 } };
      rows.forEach(function(row, ri) {
        (row || []).forEach(function(cellSpec, ci) {
          if (cellSpec == null) return;
          var ref = XLSX.utils.encode_cell({ c: ci, r: ri });
          var cell;
          if (typeof cellSpec === 'object' && cellSpec.v !== undefined) {
            cell = { v: cellSpec.v, t: cellSpec.t || (typeof cellSpec.v === 'number' ? 'n' : 's') };
            if (cellSpec.z) cell.z = cellSpec.z;
          } else {
            cell = { v: cellSpec, t: typeof cellSpec === 'number' ? 'n' : 's' };
          }
          ws[ref] = cell;
          if (ci > range.e.c) range.e.c = ci;
          if (ri > range.e.r) range.e.r = ri;
        });
      });
      ws['!ref'] = XLSX.utils.encode_range(range);
      // Auto-width based on visible string length (numbers approximated by digit count)
      ws['!cols'] = [];
      for (var ci = 0; ci <= range.e.c; ci++) {
        var maxW = 8;
        rows.forEach(function(row) {
          var c = row && row[ci];
          var s = c == null ? '' : (typeof c === 'object' ? String(c.v == null ? '' : c.v) : String(c));
          if (s.length > maxW) maxW = s.length;
        });
        ws['!cols'].push({ wch: Math.min(40, maxW + 2) });
      }
      XLSX.utils.book_append_sheet(wb, ws, (name || 'Sheet').slice(0, 31));
    }

    function num(v, z) { return { v: toNum(v), t: 'n', z: z || moneyFmt }; }
    function pct(v) { return { v: toNum(v), t: 'n', z: pctFmt }; }

    // Sheet 1: Sommaire — KPIs as numbers so user can paste-link them elsewhere
    var sommaireRows = [
      [fr ? 'Sommaire' : 'Summary'],
      [fr ? 'Client' : 'Client', client.name || ''],
      ['Date', F.fmtDateShort()],
      [fr ? 'Province' : 'Province', p.prov || 'QC'],
      [],
      [fr ? 'Indicateurs cl\u00e9s' : 'Key indicators'],
      [fr ? 'Taux de succ\u00e8s' : 'Success rate', d.succVal != null ? pct(d.succVal) : ''],
      [fr ? 'Patrimoine m\u00e9dian (P50)' : 'Median wealth (P50)', num(mc.rMedF != null ? mc.rMedF : mc.medF)],
      [fr ? 'Sc\u00e9nario prudent (P25)' : 'Cautious (P25)', num(mc.rP25F != null ? mc.rP25F : (mc.p25F || 0))],
      [fr ? 'VaR 5%' : 'VaR 5%', num(mc.rVar5 != null ? mc.rVar5 : (mc.var5 || 0))],
      [fr ? 'Couverture gouvernementale' : 'Government coverage', d.covRatio != null ? pct(d.covRatio) : ''],
      [fr ? '\u00c9cart mensuel' : 'Monthly gap', num(d.gapM)],
      [fr ? 'Imp\u00f4t viager' : 'Lifetime tax', num(d._optTax)],
      [fr ? 'Alpha fiscal' : 'Tax alpha', d._taxAlpha != null ? num(d._taxAlpha) : '']
    ];
    addSheetTyped(fr ? 'Sommaire' : 'Summary', sommaireRows);

    // Sheet 2: Cash flow (real engine schema)
    var cfHeader = [fr ? '\u00c2ge' : 'Age', fr ? 'Salaire' : 'Salary', 'RRQ/QPP', 'PSV/OAS', 'SRG',
      fr ? 'Pension' : 'Pension', fr ? 'Retraits \u00e9p.' : 'Withdrawals',
      fr ? 'D\u00e9penses' : 'Spending', fr ? 'Imp\u00f4t' : 'Tax'];
    var cfRows = [[fr ? 'Flux de tr\u00e9sorerie' : 'Cash flow'], cfHeader];
    (revData || []).forEach(function(r) {
      cfRows.push([
        r.age,
        num((r.sal || 0) + (r.cSal || 0)),
        num(r.rrq || 0),
        num(r.psv || 0),
        num(r.gis || r.srg || 0),
        num(r.pen || 0),
        num(r.ret || 0),
        num(r.spend || r.sp || r.spending || 0),
        num(r.tax || 0)
      ]);
    });
    addSheetTyped(fr ? 'Flux' : 'Cash flow', cfRows);

    // Sheet 3: Projection — wealth trajectory (engine pD)
    var projHeader = [fr ? '\u00c2ge' : 'Age', 'REER', 'CELI', 'NR',
      fr ? 'Total financier' : 'Total financial'];
    var projRows = [[fr ? 'Projection patrimoine' : 'Wealth projection'], projHeader];
    (mc.pD || []).slice(0, 51).forEach(function(r) {
      var rrV = toNum(r.rrM != null ? r.rrM : r.mp_rr || 0);
      var tfV = toNum(r.tfM != null ? r.tfM : r.mp_tf || 0);
      var nrV = toNum(r.nrM != null ? r.nrM : r.mp_nr || 0);
      var totV = toNum(r.mp_total != null ? r.mp_total : (rrV + tfV + nrV));
      projRows.push([r.age || '', num(rrV), num(tfV), num(nrV), num(totV)]);
    });
    addSheetTyped(fr ? 'Projection' : 'Projection', projRows);

    var baseName = (client.name || 'client').replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(wb, 'buildfi-basic-' + baseName + '.xlsx');
  }

  // ══════════════════════════════════════════════════════════════
  // PUBLIC API
  // ══════════════════════════════════════════════════════════════
  window.buildExcel = function(data) {
    if (typeof ExcelJS !== "undefined" && ExcelJS.Workbook) {
      buildExcelPro(data).catch(function(err) {
        console.error("Excel Pro export error:", err);
        if (typeof XLSX !== "undefined" && XLSX.utils) buildExcelBasic(data);
        else alert("Excel export error: " + (err.message || err));
      });
      return;
    }
    if (typeof XLSX !== "undefined" && XLSX.utils) { buildExcelBasic(data); return; }
    alert("No Excel library available.");
  };
})();
