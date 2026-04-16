#!/usr/bin/env node
/**
 * build-excel-template.js
 *
 * Generates the BuildFi master Excel template with professional formatting.
 * NO formulas — the export code writes values directly into formatted cells.
 * The template provides: fonts, colors, borders, column widths, merged cells,
 * headers, section titles, frozen panes, alternating row colors.
 *
 * Usage:  node scripts/build-excel-template.js
 * Output: templates/report-template-b64.js
 */

const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

const BRAND = {
  navy: "FF1F3A5A", white: "FFFFFFFF", slate: "FF334155",
  muted: "FF64748B", link: "FF1D4ED8", green: "FF15803D", blue: "FF1D4ED8",
  amber: "FFB45309", rowAlt: "FFF7FAFD", borderLight: "FFE5EAF0",
  borderMed: "FF7A8699", bg: "FFF8FAFC"
};

const THIN_BORDER = { style: "thin", color: { argb: BRAND.borderLight } };
const BORDER_ALL = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER };
const HDR_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.navy } };
const HDR_FONT = { name: "Calibri", size: 11, bold: true, color: { argb: BRAND.white } };
const ALT_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.rowAlt } };
const TITLE_FONT = (sz) => ({ name: "Calibri", size: sz || 13, bold: true, color: { argb: BRAND.navy } });
const SUBTITLE_FONT = { name: "Calibri", size: 10, color: { argb: BRAND.muted }, italic: true };
const BODY_FONT = { name: "Calibri", size: 11, color: { argb: BRAND.slate } };
const LEGAL_FONT = { name: "Calibri", size: 9, color: { argb: "FF94A3B8" }, italic: true };

// ── Helpers ──

function styleHeader(ws, row, firstCol, lastCol) {
  for (let c = firstCol; c <= lastCol; c++) {
    const cell = ws.getCell(row, c);
    cell.font = { ...HDR_FONT };
    cell.fill = { ...HDR_FILL };
    cell.alignment = { vertical: "middle", horizontal: c === firstCol ? "left" : "right" };
    cell.border = { ...BORDER_ALL };
  }
}

function styleDataRows(ws, headerRow, dataCount, firstCol, lastCol) {
  for (let r = 0; r < dataCount; r++) {
    const row = headerRow + 1 + r;
    for (let c = firstCol; c <= lastCol; c++) {
      const cell = ws.getCell(row, c);
      if (r % 2 === 1) cell.fill = { ...ALT_FILL };
      cell.border = { ...BORDER_ALL };
      cell.alignment = { vertical: "middle", horizontal: c === firstCol ? "left" : "right" };
      cell.font = { ...BODY_FONT };
    }
  }
  ws.views = [{ state: "frozen", ySplit: headerRow }];
}

function addTitle(ws, row, col, text, subtitle, span) {
  span = span || 6;
  ws.mergeCells(row, col, row, col + span);
  const c = ws.getCell(row, col);
  c.value = text;
  c.font = TITLE_FONT(13);
  c.alignment = { horizontal: "left", vertical: "middle" };
  if (subtitle) {
    ws.mergeCells(row + 1, col, row + 1, col + span);
    const s = ws.getCell(row + 1, col);
    s.value = subtitle;
    s.font = { ...SUBTITLE_FONT };
    s.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
  }
}

function setColWidths(ws, widths) {
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
}

function addFooter(ws, row) {
  ws.getCell(row, 2).value = "";  // Placeholder — filled at export
  ws.getCell(row, 2).font = { ...LEGAL_FONT };
}

const MAX_YEARS = 51;

// ── Build ──

async function build() {
  const wb = new ExcelJS.Workbook();
  wb.calcProperties = { fullCalcOnLoad: true };

  // ━━ Cover ━━
  const wsCover = wb.addWorksheet("00 - Couverture");
  setColWidths(wsCover, [4, 18, 18, 18, 18, 18, 18, 18, 18]);
  wsCover.views = [{ state: "frozen", ySplit: 1 }];
  wsCover.getRow(1).height = 8;
  wsCover.mergeCells("B2:H2"); wsCover.mergeCells("B3:H3"); wsCover.mergeCells("B4:H4"); wsCover.mergeCells("B6:H6");
  wsCover.getCell("B2").value = "BuildFi — Rapport détaillé";
  wsCover.getCell("B2").font = { name: "Calibri", size: 28, bold: true, color: { argb: BRAND.navy } };
  wsCover.getCell("B3").font = { name: "Calibri", size: 18, bold: true, color: { argb: BRAND.slate } };
  wsCover.getCell("B4").font = { name: "Calibri", size: 11, color: { argb: BRAND.muted } };
  wsCover.getCell("B6").font = { name: "Calibri", size: 12, bold: true, color: { argb: BRAND.navy } };
  ["B2","B3","B4","B6"].forEach(a => { wsCover.getCell(a).alignment = { horizontal: "left", vertical: "middle" }; });
  for (let r = 2; r <= 6; r++) for (let c = 2; c <= 8; c++) {
    wsCover.getCell(r, c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.bg } };
  }
  wsCover.getRow(2).height = 34; wsCover.getRow(3).height = 24;
  wsCover.getRow(4).height = 18; wsCover.getRow(6).height = 20;

  // KPI cards
  wsCover.mergeCells("B9:D9"); wsCover.mergeCells("E9:F9"); wsCover.mergeCells("G9:H9");
  wsCover.getCell("B9").value = "Taux de succès";
  wsCover.getCell("E9").value = "Patrimoine médian final";
  wsCover.getCell("G9").value = "Alpha fiscal estimé";
  ["B9","E9","G9"].forEach(a => {
    wsCover.getCell(a).font = { name: "Calibri", size: 10, bold: true, color: { argb: BRAND.muted } };
    wsCover.getCell(a).alignment = { horizontal: "center", vertical: "middle" };
  });
  wsCover.mergeCells("B10:D12"); wsCover.mergeCells("E10:F12"); wsCover.mergeCells("G10:H12");
  wsCover.getCell("B10").numFmt = "0%";
  wsCover.getCell("B10").font = { name: "Calibri", size: 30, bold: true, color: { argb: BRAND.green } };
  wsCover.getCell("B10").alignment = { horizontal: "center", vertical: "middle" };
  wsCover.getCell("E10").numFmt = "#,##0";
  wsCover.getCell("E10").font = { name: "Calibri", size: 24, bold: true, color: { argb: BRAND.blue } };
  wsCover.getCell("E10").alignment = { horizontal: "center", vertical: "middle" };
  wsCover.getCell("G10").numFmt = "#,##0";
  wsCover.getCell("G10").font = { name: "Calibri", size: 24, bold: true, color: { argb: BRAND.amber } };
  wsCover.getCell("G10").alignment = { horizontal: "center", vertical: "middle" };

  const cvBorder = { top: {style:"thin",color:{argb:"FFD6DEE8"}}, left: {style:"thin",color:{argb:"FFD6DEE8"}}, bottom: {style:"thin",color:{argb:"FFD6DEE8"}}, right: {style:"thin",color:{argb:"FFD6DEE8"}} };
  const cvFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } };
  ["B9","E9","G9","B10","E10","G10"].forEach(a => { wsCover.getCell(a).border = cvBorder; wsCover.getCell(a).fill = cvFill; });

  wsCover.mergeCells("B14:H15");
  wsCover.getCell("B14").font = { name: "Calibri", size: 11, color: { argb: BRAND.slate }, italic: true };
  wsCover.getCell("B14").alignment = { wrapText: true, horizontal: "left", vertical: "top" };

  // ━━ README ━━
  const wsReadme = wb.addWorksheet("01 - README");
  setColWidths(wsReadme, [4, 26, 86]);
  wsReadme.views = [{ state: "frozen", ySplit: 4 }];
  wsReadme.mergeCells("B2:C2");
  wsReadme.getCell("B2").value = "README — Guide du fichier Excel";
  wsReadme.getCell("B2").font = { name: "Calibri", size: 18, bold: true, color: { argb: BRAND.navy } };
  wsReadme.getCell("B2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.bg } };
  wsReadme.getCell("B4").value = "Comment lire ce fichier";
  wsReadme.getCell("B4").font = { name: "Calibri", size: 12, bold: true, color: { argb: BRAND.navy } };
  const readmeLines = [
    "1) Commencez par l'onglet Sommaire pour la vue exécutive.",
    "2) Utilisez Flux de trésorerie et Retraits détaillés pour le pas-à-pas annuel.",
    "3) Les montants sont en dollars nominaux sauf indication contraire.",
    "4) Les feuilles Sensibilité/Stress et Fiscalité montrent les écarts entre stratégies.",
    "5) Les résultats ne constituent pas un conseil financier."
  ];
  readmeLines.forEach((txt, i) => {
    wsReadme.getCell(`B${5+i}`).value = txt;
    wsReadme.mergeCells(`B${5+i}:C${5+i}`);
    wsReadme.getCell(`B${5+i}`).font = { ...BODY_FONT };
    wsReadme.getCell(`B${5+i}`).alignment = { horizontal: "left", vertical: "middle", wrapText: true };
  });
  wsReadme.getCell("B12").value = "Navigation rapide (cliquer pour ouvrir)";
  wsReadme.getCell("B12").font = { name: "Calibri", size: 12, bold: true, color: { argb: BRAND.navy } };

  // ━━ Sommaire ━━
  const wsS = wb.addWorksheet("Sommaire");
  setColWidths(wsS, [3, 32, 18, 18, 18, 18, 18, 22]);
  wsS.getCell("B2").value = "BuildFi — Rapport détaillé (Premium)";
  wsS.getCell("B2").font = { name: "Calibri", size: 18, bold: true, color: { argb: BRAND.navy } };
  wsS.getCell("B3").font = { ...BODY_FONT };
  wsS.getCell("B4").font = { ...SUBTITLE_FONT };
  addTitle(wsS, 6, 2, "INDICATEURS CLÉS", "Résumé des métriques principales de votre plan de retraite");
  const kpiLabels = ["Note du plan", "Succès MC", "Patrimoine ret.", "Rev. garantis", "Couverture", "Alpha fiscal"];
  kpiLabels.forEach((lbl, i) => { wsS.getCell(9, 2+i).value = lbl; });
  styleHeader(wsS, 9, 2, 7);
  // KPI value cells (row 8) — pre-format
  wsS.getCell(8, 2).font = { name: "Calibri", size: 14, bold: true, color: { argb: BRAND.navy } };
  wsS.getCell(8, 3).numFmt = "0%";
  wsS.getCell(8, 4).numFmt = "#,##0";
  wsS.getCell(8, 5).numFmt = "#,##0";
  wsS.getCell(8, 6).numFmt = "0%";
  wsS.getCell(8, 7).numFmt = "#,##0";
  for (let c = 2; c <= 7; c++) {
    wsS.getCell(8, c).font = wsS.getCell(8, c).font || {};
    wsS.getCell(8, c).alignment = { horizontal: "center", vertical: "middle" };
    wsS.getCell(8, c).border = { ...BORDER_ALL };
    wsS.getCell(8, c).fill = cvFill;
  }
  wsS.getCell("B13").font = { ...BODY_FONT, bold: true };
  wsS.getCell("B14").font = { ...SUBTITLE_FONT };

  addTitle(wsS, 17, 2, "COMPARAISON: PLAN OPTIMISÉ vs PAR DÉFAUT", "Impact net des stratégies fiscales et de décaissement actives");
  const compLabels = ["Métrique", "Votre plan", "Par défaut", "Delta", "Notes"];
  compLabels.forEach((lbl, i) => { wsS.getCell(19, 2+i).value = lbl; });
  styleHeader(wsS, 19, 2, 6);
  styleDataRows(wsS, 19, 7, 2, 6);

  addTitle(wsS, 28, 2, "SI VOUS NE FAITES QU'UNE CHOSE", "");
  wsS.getCell(30, 2).font = { ...BODY_FONT, bold: true };
  wsS.getCell(32, 2).font = { ...SUBTITLE_FONT };
  wsS.views = [{ state: "frozen", ySplit: 8 }];
  addFooter(wsS, 35);

  // ━━ Profil ━━
  const wsP = wb.addWorksheet("Profil");
  setColWidths(wsP, [3, 24, 18, 18, 16, 16, 16, 16, 16]);
  addTitle(wsP, 1, 2, "Profil du client", "");
  wsP.getCell("B3").font = { ...BODY_FONT };
  addTitle(wsP, 4, 2, "INFORMATIONS PERSONNELLES", "");
  ["Âge","Retraite planifiée","Horizon","Province","Salaire brut","Dépenses retraite"].forEach((lbl, i) => {
    wsP.getCell(7+i, 1).value = lbl; wsP.getCell(7+i, 1).font = { ...BODY_FONT, bold: true };
  });
  addTitle(wsP, 14, 2, "ÉPARGNE ET COTISATIONS", "Soldes actuels, cotisations annuelles et projections");
  ["Compte","Solde actuel","Cotis./an","Alloc. actions","MER","Solde retraite","Solde décès"].forEach((lbl, i) => {
    wsP.getCell(16, 2+i).value = lbl;
  });
  styleHeader(wsP, 16, 2, 8);
  ["REER","CELI","NR","CELIAPP","Total"].forEach((name, i) => {
    wsP.getCell(17+i, 2).value = name;
    wsP.getCell(17+i, 2).font = { ...BODY_FONT, bold: true };
  });
  styleDataRows(wsP, 16, 5, 2, 8);
  // Set numFmts for account rows
  for (let r = 17; r <= 21; r++) {
    [3,4,7,8].forEach(c => { wsP.getCell(r,c).numFmt = "#,##0"; });
    wsP.getCell(r, 5).numFmt = "0%";
    wsP.getCell(r, 6).numFmt = "0.00%";
  }

  addTitle(wsP, 23, 2, "REVENUS GOUVERNEMENTAUX PROJETÉS", "Estimations basées sur les revenus de carrière et l'âge de début choisi");
  ["Source","Début","Mensuel","Annuel","Indexation","Notes"].forEach((lbl, i) => {
    wsP.getCell(25, 2+i).value = lbl;
  });
  styleHeader(wsP, 25, 2, 7);
  styleDataRows(wsP, 25, 5, 2, 7);
  addFooter(wsP, 35);

  // ━━ Projection déterministe ━━
  const wsProj = wb.addWorksheet("Projection déterministe");
  setColWidths(wsProj, [10, 8, 16, 16, 16, 16, 16, 16, 16, 16, 16, 14]);
  addTitle(wsProj, 1, 2, "Projection déterministe — chemin unique",
    "Rendements espérés constants, aucune volatilité  •  Valeurs nominales en dollars courants", 10);
  ["An","Âge","REER","CELI","NR","FHSA","Immobilier","Hypothèque","Avoir immo.","Total financier","Total net","Phase"].forEach((lbl, i) => {
    wsProj.getCell(5, 1+i).value = lbl;
  });
  styleHeader(wsProj, 5, 1, 12);
  styleDataRows(wsProj, 5, MAX_YEARS, 1, 12);
  // Set numFmts
  for (let r = 6; r < 6 + MAX_YEARS; r++) {
    for (let c = 3; c <= 11; c++) wsProj.getCell(r, c).numFmt = "#,##0";
  }
  addFooter(wsProj, 5 + MAX_YEARS + 2);

  // ━━ Flux de trésorerie ━━
  const wsCF = wb.addWorksheet("Flux de trésorerie");
  setColWidths(wsCF, [10, 8, 14, 12, 12, 12, 12, 14, 14, 12, 10, 14]);
  addTitle(wsCF, 1, 2, "Flux de trésorerie annuel",
    "Revenus, dépenses, retraits et impôt — trajectoire déterministe", 10);
  ["An","Âge","Salaire","RRQ/QPP","PSV/OAS","SRG","Pension","Retraits ép.","Dépenses","Impôt","Taux eff.","Rev. imposable"].forEach((lbl, i) => {
    wsCF.getCell(5, 1+i).value = lbl;
  });
  styleHeader(wsCF, 5, 1, 12);
  styleDataRows(wsCF, 5, MAX_YEARS, 1, 12);
  for (let r = 6; r < 6 + MAX_YEARS; r++) {
    for (let c = 3; c <= 10; c++) wsCF.getCell(r, c).numFmt = "#,##0";
    wsCF.getCell(r, 11).numFmt = "0.0%";
    wsCF.getCell(r, 12).numFmt = "#,##0";
  }
  addFooter(wsCF, 5 + MAX_YEARS + 2);

  // ━━ MC — Patrimoine ━━
  const wsMC = wb.addWorksheet("MC — Patrimoine");
  setColWidths(wsMC, [3, 8, 8, 14, 14, 14, 14, 14, 14, 14, 14]);
  addTitle(wsMC, 1, 2, "Monte Carlo — Distribution du patrimoine financier", "", 9);
  wsMC.getCell("B3").font = { ...SUBTITLE_FONT };
  ["An","Âge","Déterministe","P5 (pire 5%)","P25","P50 (médiane)","P75","P95 (meil. 5%)","Écart P50-Det.","Fourchette P5-P95"].forEach((lbl, i) => {
    wsMC.getCell(4, 2+i).value = lbl;
  });
  styleHeader(wsMC, 4, 2, 11);
  styleDataRows(wsMC, 4, MAX_YEARS, 2, 11);
  for (let r = 5; r < 5 + MAX_YEARS; r++) {
    for (let c = 4; c <= 11; c++) wsMC.getCell(r, c).numFmt = "#,##0";
  }
  addFooter(wsMC, 4 + MAX_YEARS + 2);

  // ━━ Retraits détaillés ━━
  const wsWD = wb.addWorksheet("Retraits détaillés");
  setColWidths(wsWD, [3, 16, 8, 12, 12, 12, 12, 12, 14, 14, 22]);
  addTitle(wsWD, 1, 2, "Détail des retraits par source et par phase", "", 9);
  wsWD.getCell("B3").font = { ...SUBTITLE_FONT };
  ["An","Âge","FERR min.","Meltdown","REER vol.","CELI","NR","Total retraits","Phase","Notes"].forEach((lbl, i) => {
    wsWD.getCell(4, 2+i).value = lbl;
  });
  styleHeader(wsWD, 4, 2, 11);
  styleDataRows(wsWD, 4, MAX_YEARS, 2, 11);
  for (let r = 5; r < 5 + MAX_YEARS; r++) {
    for (let c = 4; c <= 9; c++) wsWD.getCell(r, c).numFmt = "#,##0";
  }
  addFooter(wsWD, 4 + MAX_YEARS + 2);

  // ━━ Fiscalité ━━
  const wsTax = wb.addWorksheet("Fiscalité");
  setColWidths(wsTax, [3, 24, 18, 18, 18, 18, 18]);
  addTitle(wsTax, 1, 2, "Analyse fiscale", "Paliers d'imposition  •  Comparaison optimisé vs par défaut  •  Alpha fiscal");
  addTitle(wsTax, 3, 2, "GRILLE D'IMPOSITION", "Fédéral + provincial — taux combinés à chaque palier de revenu");
  ["Revenu imposable","Fédéral","Prov.","Total","Taux eff.","Taux marg."].forEach((lbl, i) => {
    wsTax.getCell(5, 2+i).value = lbl;
  });
  styleHeader(wsTax, 5, 2, 7);
  styleDataRows(wsTax, 5, 11, 2, 7);
  for (let r = 6; r <= 16; r++) {
    [2,3,4,5].forEach(c => { wsTax.getCell(r, c).numFmt = "#,##0"; });
    wsTax.getCell(r, 6).numFmt = "0.0%";
    wsTax.getCell(r, 7).numFmt = "0.0%";
  }

  addTitle(wsTax, 18, 2, "COMPARAISON FISCALE VIE ENTIÈRE", "Impact cumulatif des stratégies d'optimisation");
  ["Métrique","Optimisé","Par défaut","Delta","Notes"].forEach((lbl, i) => {
    wsTax.getCell(20, 2+i).value = lbl;
  });
  styleHeader(wsTax, 20, 2, 6);
  styleDataRows(wsTax, 20, 7, 2, 6);
  addFooter(wsTax, 29);

  // ━━ Sensibilité & Stress ━━
  const wsSS = wb.addWorksheet("Sensibilité & Stress");
  setColWidths(wsSS, [24, 14, 14, 14, 30, 14, 12, 12, 12, 30]);
  addTitle(wsSS, 1, 1, "Analyse de sensibilité & scénarios de stress",
    "Tornado: impact de chaque facteur  •  Stress: scénarios historiques", 4);
  addTitle(wsSS, 3, 1, "TORNADO — CE QUI INFLUENCE LE PLUS VOTRE PLAN",
    "Variation de ±1 écart-type de chaque facteur", 4);
  ["Facteur","Impact -1σ","Impact +1σ","Amplitude","Interprétation"].forEach((lbl, i) => {
    wsSS.getCell(5, 1+i).value = lbl;
  });
  styleHeader(wsSS, 5, 1, 5);
  styleDataRows(wsSS, 5, 8, 1, 5);

  addTitle(wsSS, 15, 1, "SCÉNARIOS DE STRESS", "Conditions historiques appliquées à votre plan actuel", 8);
  ["Scénario","Période","Succès","Delta","Patrimoine P50","VaR 5%","Ruine P5","Résilience","Description"].forEach((lbl, i) => {
    wsSS.getCell(17, 1+i).value = lbl;
  });
  styleHeader(wsSS, 17, 1, 9);
  styleDataRows(wsSS, 17, 6, 1, 9);
  addFooter(wsSS, 26);

  // ━━ Succession ━━
  const wsE = wb.addWorksheet("Succession");
  setColWidths(wsE, [3, 28, 18, 18, 18, 32]);
  addTitle(wsE, 1, 2, "Analyse successorale",
    "Distribution MC de l'héritage net  •  Cascade fiscale au décès  •  Analyse assurance");
  addTitle(wsE, 3, 2, "DISTRIBUTION DE L'HÉRITAGE NET", "Chaque percentile représente un scénario de marché différent");
  ["Percentile","Héritage net","Impôt success.","Patrimoine brut","Interprétation"].forEach((lbl, i) => {
    wsE.getCell(5, 2+i).value = lbl;
  });
  styleHeader(wsE, 5, 2, 6);
  styleDataRows(wsE, 5, 7, 2, 6);
  for (let r = 6; r <= 12; r++) { [3,4,5].forEach(c => { wsE.getCell(r,c).numFmt = "#,##0"; }); }

  addTitle(wsE, 14, 2, "CASCADE FISCALE AU DÉCÈS (ESTIMATION MÉDIANE)",
    "Décomposition de l'impôt et des frais entre le patrimoine brut et l'héritage net");
  ["Composante","Montant","Taux / base","Notes"].forEach((lbl, i) => {
    wsE.getCell(16, 2+i).value = lbl;
  });
  styleHeader(wsE, 16, 2, 5);
  styleDataRows(wsE, 16, 8, 2, 5);
  for (let r = 17; r <= 24; r++) { wsE.getCell(r, 3).numFmt = "#,##0"; }

  addTitle(wsE, 26, 2, "ANALYSE D'ÉCART — ASSURANCE-VIE", "");
  wsE.getCell(28, 2).font = { ...BODY_FONT };
  addFooter(wsE, 31);

  // ━━ Immobilier ━━
  const wsRE = wb.addWorksheet("Immobilier");
  setColWidths(wsRE, [24, 16, 16, 16, 12, 14, 12, 16, 14]);
  addTitle(wsRE, 1, 1, "Analyse immobilière",
    "Propriétés, hypothèques, trajectoire de l'avoir net", 8);
  addTitle(wsRE, 3, 1, "PORTEFEUILLE IMMOBILIER", "Propriétés détenues et leur contribution au patrimoine total", 8);
  ["Propriété","Valeur actuelle","Hypothèque","Avoir net","Taux hyp.","Amort. restant","Appréciation","Rev. locatif","Type"].forEach((lbl, i) => {
    wsRE.getCell(5, 1+i).value = lbl;
  });
  styleHeader(wsRE, 5, 1, 9);
  styleDataRows(wsRE, 5, 4, 1, 9);
  for (let r = 6; r <= 9; r++) { [2,3,4,8].forEach(c => { wsRE.getCell(r,c).numFmt = "#,##0"; }); }

  addTitle(wsRE, 11, 1, "TRAJECTOIRE DE L'AVOIR NET IMMOBILIER",
    "Évolution de la valeur et de l'hypothèque sur l'horizon de planification", 6);
  ["An","Âge","Total valeur","Hypothèque","Avoir immo.","% du patrimoine","Événement"].forEach((lbl, i) => {
    wsRE.getCell(13, 1+i).value = lbl;
  });
  styleHeader(wsRE, 13, 1, 7);
  styleDataRows(wsRE, 13, 15, 1, 7);
  for (let r = 14; r <= 28; r++) {
    [3,4,5].forEach(c => { wsRE.getCell(r,c).numFmt = "#,##0"; });
    wsRE.getCell(r, 6).numFmt = "0%";
  }
  addFooter(wsRE, 31);

  // ━━ Entreprise (CCPC) ━━
  const wsB = wb.addWorksheet("Entreprise (CCPC)");
  setColWidths(wsB, [10, 8, 16, 14, 14, 14, 14, 12, 12, 14, 12, 14]);
  addTitle(wsB, 1, 1, "Actifs corporatifs (CCPC)",
    "Projection du solde, plan d'extraction, alertes DPE", 11);
  addTitle(wsB, 3, 1, "PROJECTION CORPORATIVE ANNUELLE",
    "Accumulation puis extraction progressive selon le mode choisi", 11);
  ["An","Âge","Solde corp.","Impôt corp.","Dividende","Salaire corp.","Extraction","CDA","RDTOH","Rev. passif","Alerte DPE","Phase"].forEach((lbl, i) => {
    wsB.getCell(5, 1+i).value = lbl;
  });
  styleHeader(wsB, 5, 1, 12);
  styleDataRows(wsB, 5, 37, 1, 12);
  for (let r = 6; r <= 42; r++) {
    for (let c = 3; c <= 10; c++) wsB.getCell(r, c).numFmt = "#,##0";
  }
  addFooter(wsB, 45);

  // ━━ Méthodologie ━━
  const wsM = wb.addWorksheet("Méthodologie");
  setColWidths(wsM, [3, 26, 32, 42]);
  addTitle(wsM, 1, 2, "Méthodologie & avis légal",
    "Fonctionnement du moteur de simulation  •  Paramètres de lissage  •  Avis réglementaire");
  addTitle(wsM, 3, 2, "COMPOSANTES DU MOTEUR DE SIMULATION",
    "Chaque composante contribue à la précision et au réalisme des projections");
  ["Composante","Description","Détails techniques"].forEach((lbl, i) => {
    wsM.getCell(5, 2+i).value = lbl;
  });
  styleHeader(wsM, 5, 2, 4);
  styleDataRows(wsM, 5, 8, 2, 4);

  addTitle(wsM, 15, 2, "CONSTANTES DE LISSAGE (CFG_SMOOTH)",
    "Paramètres internes qui contrôlent la stabilité des séquences de retrait");
  ["Constante","Valeur","Rôle"].forEach((lbl, i) => {
    wsM.getCell(17, 2+i).value = lbl;
  });
  styleHeader(wsM, 17, 2, 4);
  styleDataRows(wsM, 17, 8, 2, 4);

  addTitle(wsM, 27, 2, "IDENTIFICATION DU RAPPORT", "");
  ["Version","Date","Client","Province","Simulations MC","Mortalité","Inflation"].forEach((lbl, i) => {
    wsM.getCell(29+i, 2).value = lbl; wsM.getCell(29+i, 2).font = { ...BODY_FONT, bold: true };
  });

  addTitle(wsM, 37, 2, "AVIS RÉGLEMENTAIRE", "");
  wsM.getCell("B39").value = "Les projections sont fournies à titre informatif uniquement et ne constituent pas un conseil financier, fiscal ou juridique.";
  wsM.getCell("B40").value = "BuildFi Technologies inc. n'est pas un conseiller financier. Consultez un professionnel qualifié.";
  wsM.getCell("B41").value = "Les rendements passés ne garantissent pas les rendements futurs.";
  [39,40,41].forEach(r => { wsM.getCell(`B${r}`).font = { ...SUBTITLE_FONT }; });
  addFooter(wsM, 44);

  // ━━ Save ━━
  const outDir = path.join(__dirname, "..", "templates");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const xlsxPath = path.join(outDir, "buildfi-donnees-detaillees-template.xlsx");
  await wb.xlsx.writeFile(xlsxPath);
  console.log("Template written:", xlsxPath);

  const buf = fs.readFileSync(xlsxPath);
  const b64 = buf.toString("base64");
  const jsPath = path.join(outDir, "report-template-b64.js");
  fs.writeFileSync(jsPath, `// Auto-generated — do not edit\nwindow.BF_REPORT_TEMPLATE_B64 = "${b64}";\n`);
  console.log("Base64 JS written:", jsPath, `(${Math.round(b64.length/1024)} KB)`);
}

build().catch(e => { console.error(e); process.exit(1); });
