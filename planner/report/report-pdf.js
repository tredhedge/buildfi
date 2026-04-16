// report-pdf.js — BuildFi Professional HTML Report Generator
// Depends on: report-formatters.js, report-data.js, report-charts.js
// Exports: window.buildReport(data) → HTML string
(function() {
  "use strict";

  if (!window.BFmt || !window.BData || !window.BCharts) { console.error("[buildReport] Dependencies missing — load formatters, data, charts first"); return; }
  var F = window.BFmt;
  var D = window.BData;
  var Ch = window.BCharts;
  var C = F.COLORS;

  // ══════════════════════════════════════════════════════════════
  // CSS
  // ══════════════════════════════════════════════════════════════

  var css = [
    '@import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap");',
    '*{box-sizing:border-box;margin:0;padding:0}',
    'body{font-family:"DM Sans",-apple-system,system-ui,sans-serif;max-width:820px;margin:0 auto;padding:24px 28px;color:#1a1a1a;font-size:13px;line-height:1.6;background:#fff}',
    '.mono{font-family:"JetBrains Mono",monospace;font-weight:500}',
    // Cover
    '.cover{min-height:960px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(180deg,#1a1610 0%,#2c2418 40%,#3a3020 100%);color:#f0ece4;text-align:center;position:relative;border-radius:8px;margin-bottom:24px;page-break-after:always}',
    '.cover-divider{width:120px;height:1px;background:'+C.gold+';margin:24px auto}',
    '.cover-title{font-size:36px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:'+C.gold+'}',
    '.cover-subtitle{font-size:16px;font-weight:400;color:#a09890;margin-top:6px;letter-spacing:1px}',
    '.cover-client{font-size:22px;font-weight:600;margin-top:40px;color:#f0ece4}',
    '.cover-grade-circle{width:150px;height:150px;border-radius:50%;border:4px solid;display:flex;align-items:center;justify-content:center;margin:30px auto 0}',
    '.cover-grade-letter{font-size:36px;font-weight:800;font-family:"JetBrains Mono",monospace}',
    '.cover-grade-pill{margin-top:14px;display:inline-block;padding:5px 20px;border-radius:16px;font-weight:800;font-size:12px;color:#fff;letter-spacing:0.5px}',
    '.cover-date{font-size:13px;color:#888;margin-top:30px}',
    '.cover-company{position:absolute;bottom:40px;font-size:11px;color:#666;letter-spacing:0.5px}',
    // Headers
    'h1{font-size:26px;color:'+C.gold+';font-weight:800;letter-spacing:-.5px;line-height:1.2}',
    'h2{font-size:14px;color:#666;font-weight:400;margin-top:2px}',
    '.sec{font-size:13px;color:'+C.gold+';border-bottom:2px solid '+C.gold+';padding-bottom:4px;margin:20px 0 10px;text-transform:uppercase;letter-spacing:.8px;font-weight:700;display:flex;align-items:center;gap:8px;page-break-after:avoid}',
    '.sec-n{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:'+C.gold+';color:#fff;font-size:11px;font-weight:800;flex-shrink:0}',
    '.sec-q{font-size:11px;color:#888;font-style:italic;font-weight:400;text-transform:none;letter-spacing:0;margin-left:auto}',
    // Cards & containers
    '.cd{border:1px solid '+C.border+';border-radius:8px;padding:12px;background:'+C.bg+';break-inside:avoid;margin-bottom:8px}',
    'table{width:100%;border-collapse:collapse}',
    '.rl{padding:5px 10px;color:#444;border-bottom:1px solid #f0ece4;font-size:11px}',
    '.rv{padding:5px 10px;font-weight:600;border-bottom:1px solid #f0ece4;font-size:11px;text-align:right;font-family:"JetBrains Mono",monospace}',
    // Grids
    '.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
    '.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}',
    '.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}',
    '.g5{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}',
    '.g6{display:grid;grid-template-columns:repeat(6,1fr);gap:5px}',
    // KPI
    '.kpi{text-align:center;padding:10px 6px;border:1px solid #e0d3bf;border-radius:8px;background:#fffdf9;break-inside:avoid}',
    '.kpi-v{font-size:20px;font-weight:700;font-family:"JetBrains Mono",monospace;color:#3b2f1f}',
    '.kpi-l{font-size:10px;color:#6a6155;margin-top:3px;text-transform:uppercase;letter-spacing:.5px;font-weight:600}',
    '.grade-ring{display:inline-flex;align-items:center;justify-content:center;width:90px;height:90px;border-radius:50%;font-size:30px;font-weight:900;font-family:"JetBrains Mono",monospace}',
    '.grade-pill{display:inline-block;padding:4px 18px;border-radius:16px;font-weight:800;font-size:13px;color:#fff;margin-top:6px}',
    // Callouts
    '.callout{border-radius:6px;padding:12px 14px;margin:8px 0;font-size:11px;line-height:1.6;color:#333;break-inside:avoid}',
    '.callout-insight{background:#f0f8f0;border:1px solid '+C.green+';border-left:4px solid '+C.green+'}',
    '.callout-warning{background:#fdf6e3;border:1px solid '+C.amber+';border-left:4px solid '+C.amber+'}',
    '.callout-alert{background:#fde8e8;border:1px solid '+C.red+';border-left:4px solid '+C.red+'}',
    '.callout-ai{background:#f7f5ff;border:1px solid #c8c0e8;border-left:4px solid '+C.purple+'}',
    '.callout-inaction{background:#fff8f0;border:1px solid #d4873c;border-left:4px solid #d4873c}',
    '.callout-breakeven{background:#f0f4f8;border:1px solid '+C.blue+';border-left:4px solid '+C.blue+'}',
    '.callout-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;display:flex;align-items:center;gap:4px}',
    '.callout-val{font-family:"JetBrains Mono",monospace;font-weight:700;font-size:18px;margin-bottom:2px}',
    '.ai-badge{display:inline-block;background:#e8e0f8;color:'+C.purple+';font-size:9px;font-weight:700;padding:1px 6px;border-radius:8px;margin-bottom:4px;text-transform:uppercase;letter-spacing:.3px}',
    '.callout-ai p{margin-top:4px;line-height:1.7}',
    // Tables
    '.tbl{width:100%;border-collapse:collapse;font-size:11px;margin:6px 0}',
    '.tbl th{padding:5px 6px;text-align:right;font-size:10px;font-weight:700;color:'+C.gold+';background:#f9f7f2;border-bottom:2px solid '+C.border+'}',
    '.tbl th:first-child{text-align:left}',
    '.tbl td{padding:4px 6px;text-align:right;border-bottom:1px solid #f0ece4;font-family:"JetBrains Mono",monospace;font-size:10px}',
    '.tbl td:first-child{text-align:left;font-family:"DM Sans",sans-serif}',
    '.tbl tr.ret{font-weight:700;background:#faf8f3}',
    // Reco cards
    '.reco-card{padding:14px 16px;margin:8px 0;border-radius:8px;background:'+C.bgAlt+';border:1px solid '+C.border+';break-inside:avoid;position:relative}',
    '.reco-priority{display:inline-block;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding:2px 8px;border-radius:10px;margin-bottom:8px}',
    '.reco-priority-high{background:#fde8e8;color:#b83838}',
    '.reco-priority-medium{background:#fdf6e3;color:'+C.amber+'}',
    '.reco-priority-low{background:#f0f8f0;color:#2a6b3c}',
    '.reco-impact{position:absolute;top:14px;right:16px;font-size:13px;font-weight:700;color:#2a6b3c;font-family:"JetBrains Mono",monospace}',
    '.reco-title{font-size:14px;font-weight:700;color:#1a1a1a;margin-bottom:6px}',
    '.reco-body{font-size:11px;line-height:1.6;color:#444}',
    '.reco-meaning{margin-top:10px;padding:8px 10px;background:rgba(196,148,74,0.06);border-radius:4px;font-size:11px;color:#555;font-style:italic}',
    // Timeline
    '.timeline{background:#f9f7f2;border:1px solid '+C.border+';border-radius:8px;padding:12px;margin:10px 0}',
    '.tl-item{display:flex;align-items:center;gap:10px;padding:4px 0;border-bottom:1px solid #f0ece4}',
    '.tl-item:last-child{border-bottom:none}',
    '.tl-age{background:'+C.gold+';color:#fff;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;min-width:36px;text-align:center;font-family:"JetBrains Mono",monospace}',
    '.tl-txt{font-size:11px;color:#555}',
    // Methodology
    '.meth-p{font-size:11px;color:#555;line-height:1.8;margin-bottom:8px}',
    '.meth-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0}',
    '.meth-item{display:flex;align-items:center;gap:4px;font-size:10px;color:#666;padding:3px 6px;background:#f9f7f2;border-radius:4px;border:1px solid #f0ece4}',
    '.meth-check{color:'+C.green+';font-weight:700}',
    // Footer & disclaimer
    '.ft{text-align:center;margin-top:20px;padding-top:10px;border-top:1px solid #e0d8c8;font-size:9px;color:#aaa;line-height:1.8}',
    '.disclaimer{margin-top:14px;padding:14px;background:#fdf3f3;border:1px solid #e8c8c8;border-radius:8px;font-size:9px;color:#777;line-height:1.7;text-align:center;break-inside:avoid}',
    '.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:3px solid '+C.gold+';margin-bottom:10px}',
    '.hdr-right{text-align:right;font-size:11px;color:#666;line-height:1.8}',
    '.ver{background:#f5efe5;color:'+C.gold+';padding:2px 10px;border-radius:10px;font-size:9px;font-weight:800}',
    // Utilities
    '.copy-btn{background:none;border:1px solid '+C.border+';border-radius:4px;padding:2px 6px;cursor:pointer;font-size:11px;color:#888}',
    '.copy-btn:hover{background:#f9f7f2;color:'+C.gold+'}',
    '.skeleton{background:linear-gradient(90deg,#f0ece4 25%,#f9f7f2 50%,#f0ece4 75%);background-size:200% 100%;animation:sk 1.5s ease-in-out infinite;border-radius:4px;height:20px;margin:4px 0}',
    '@keyframes sk{0%{background-position:200% 0}100%{background-position:-200% 0}}',
    '.print-only{display:none}',
    '.pb{page-break-before:always}',
    // Narrative paragraphs
    '.narr{font-size:12px;line-height:1.9;color:#333;margin:10px 0 14px;text-align:justify}',
    '.narr strong{color:#1a1a1a}',
    '.narr em{color:#666;font-style:italic}',
    // TOC
    '.toc{page-break-after:always;padding:30px 0}',
    '.toc-title{font-size:22px;font-weight:700;color:'+C.gold+';margin-bottom:20px;letter-spacing:1px}',
    '.toc-item{display:flex;align-items:baseline;padding:6px 0;border-bottom:1px dotted #e0d8c8}',
    '.toc-item:last-child{border-bottom:none}',
    '.toc-n{width:28px;height:28px;border-radius:50%;background:'+C.gold+';color:#fff;font-size:11px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;margin-right:10px}',
    '.toc-label{flex:1;font-size:13px;color:#333;font-weight:500}',
    '.toc-label a{color:#333;text-decoration:none}',
    '.toc-label a:hover{color:'+C.gold+'}',
    '.toc-dots{flex:1;border-bottom:1px dotted #ccc;margin:0 8px;min-width:20px}',
    '.toc-pg{font-size:11px;color:#888;font-family:"JetBrains Mono",monospace}',
    // AI skeleton placeholder
    '.ai-placeholder{background:#f7f5ff;border:1px dashed #c8c0e8;border-radius:6px;padding:14px 16px;margin:8px 0;text-align:center}',
    '.ai-placeholder-lbl{font-size:10px;color:'+C.purple+';font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}',
    '.ai-placeholder-body{font-size:11px;color:#a099b8;line-height:1.6}',
    // Section page wrapper
    '.sec-page{page-break-before:always;padding-top:8px}',
    '.sec-page:first-of-type{page-break-before:avoid}',
    // Print
    '@media print{@page{margin:1.5cm;size:letter}',
    'h3.sec{page-break-after:avoid}',
    '.cd,.kpi,table,.callout,.reco-card{break-inside:avoid}',
    'body{padding:0;font-size:11px}',
    '.narr{font-size:11px;line-height:1.7}',
    '.sec-page{page-break-before:always}',
    '.sec-page:first-of-type{page-break-before:avoid}',
    'table{page-break-inside:auto}tr{page-break-inside:avoid}thead{display:table-header-group}',
    'svg{max-width:700px !important;max-height:400px !important}',
    '.copy-btn,.no-print,[onclick]{display:none !important}',
    '.print-only{display:block !important}',
    '.page-footer{display:block !important;position:fixed;bottom:0;left:0;right:0;text-align:center;font-size:8px;color:#aaa;padding:4px}',
    '.cover{page-break-after:always;min-height:100vh}',
    '.toc{page-break-after:always}',
    '.ai-placeholder{break-inside:avoid}',
    '}'
  ].join('\n');

  // ══════════════════════════════════════════════════════════════
  // COPY TABLE SCRIPT
  // ══════════════════════════════════════════════════════════════

  var copyScript = '<script>function copyTbl(id){var t=document.getElementById(id);if(!t)return;var txt="";t.querySelectorAll("tr").forEach(function(r){var c=[];r.querySelectorAll("th,td").forEach(function(d){c.push(d.textContent.trim());});txt+=c.join("\\t")+"\\n";});var btn=document.activeElement;navigator.clipboard.writeText(txt).then(function(){if(btn){btn.textContent="\\u2713";setTimeout(function(){btn.textContent="\\ud83d\\udccb";},1500);}});}<\/script>';

  // ══════════════════════════════════════════════════════════════
  // INLINE LOGO SVG (BuildFi stacking blocks)
  // ══════════════════════════════════════════════════════════════

  var logoSvg = '<svg viewBox="0 0 220 48" width="140" height="30" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="2" y="28" width="16" height="16" rx="2" fill="'+C.gold+'"/>' +
    '<rect x="2" y="10" width="16" height="16" rx="2" fill="'+C.gold+'" opacity="0.6"/>' +
    '<rect x="20" y="20" width="16" height="24" rx="2" fill="'+C.gold+'" opacity="0.8"/>' +
    '<text x="44" y="38" font-family="Plus Jakarta Sans,DM Sans,sans-serif" font-weight="700" font-size="28" fill="'+C.gold+'">BuildFi</text>' +
    '</svg>';

  // ══════════════════════════════════════════════════════════════
  // NARRATIVE & STRUCTURAL HELPERS
  // ══════════════════════════════════════════════════════════════

  // Narrative paragraph — deterministic text computed from data (fallback when no AI)
  function narr(text) { return '<p class="narr">' + text + '</p>'; }

  // Export mode flag — when true, suppress AI placeholders (no "Click AI Analysis" in client reports)
  var _exportMode = false;

  // AI-aware narrative: if AI text exists, show AI block instead of deterministic text.
  // If no AI and not exporting, show deterministic text + placeholder.
  // If no AI and exporting, show deterministic text only (no placeholder).
  function narrAi(detText, aiText, fr, label) {
    if (aiText) return F.AiBlock(aiText, fr);
    var h = '<p class="narr">' + detText + '</p>';
    if (!_exportMode) {
      h += '<div class="ai-placeholder"><div class="ai-placeholder-lbl">' + (label || (fr ? 'Analyse IA' : 'AI Analysis')) + '</div><div class="ai-placeholder-body">' + (fr ? 'Cliquez sur \u00ab\u00a0Analyse IA\u00a0\u00bb pour une observation personnalis\u00e9e.' : 'Click "AI Analysis" for a personalized observation.') + '</div></div>';
    }
    return h;
  }

  // AI slot renderer: shows AI content if present, placeholder if absent (unless export mode)
  function aiSlot(aiText, fr, label) {
    if (aiText) return F.AiBlock(aiText, fr);
    if (_exportMode) return '';
    return '<div class="ai-placeholder"><div class="ai-placeholder-lbl">' + (label || (fr ? 'Analyse IA' : 'AI Analysis')) + '</div><div class="ai-placeholder-body">' + (fr ? 'Cliquez sur \u00ab\u00a0Analyse IA\u00a0\u00bb pour une observation personnalis\u00e9e.' : 'Click "AI Analysis" for a personalized observation.') + '</div></div>';
  }

  // Section page wrapper — ensures page break before each section
  function secPage() { return '<div class="sec-page">'; }
  function secPageEnd() { return '</div>'; }

  // Dynamic Table of Contents
  function renderTOC(sections, fr) {
    var h = '<div class="toc">';
    h += '<div class="toc-title">' + (fr ? 'Table des mati\u00e8res' : 'Table of Contents') + '</div>';
    sections.forEach(function(s) {
      h += '<div class="toc-item"><span class="toc-n">' + s.n + '</span><span class="toc-label"><a href="#' + s.id + '">' + s.label + '</a></span></div>';
    });
    h += '</div>';
    return h;
  }

  // ══════════════════════════════════════════════════════════════
  // SECTION RENDERERS
  // ══════════════════════════════════════════════════════════════

  function renderCover(d) {
    var fr = d.fr, g = F.grade(d.succVal, fr), sC = F.succColor(d.succVal);
    var cName = (d.client.name || 'Client');
    var cSpouse = d.p.cOn ? (d.client.spouseName || d.p.cSpouseName || '') : '';
    var h = '<div class="cover">';
    h += '<div style="margin-bottom:30px;opacity:0.9">' + logoSvg.replace(/fill="[^"]*"/g, 'fill="#f0ece4"').replace('fill="#f0ece4" opacity="0.6"', 'fill="#f0ece4" opacity="0.4"').replace('fill="#f0ece4" opacity="0.8"', 'fill="#f0ece4" opacity="0.6"') + '</div>';
    h += '<div class="cover-divider"></div>';
    h += '<div class="cover-title">' + F.L('cover_title', fr) + '</div>';
    h += '<div class="cover-subtitle">' + F.L('cover_sub', fr) + '</div>';
    h += '<div class="cover-divider"></div>';
    h += '<div style="font-size:13px;color:#a09890;margin-top:10px">' + F.L('prepared_for', fr) + '</div>';
    h += '<div class="cover-client">' + F.esc(cName) + (cSpouse ? ' & ' + F.esc(cSpouse) : '') + '</div>';
    h += '<div class="cover-grade-circle" style="border-color:' + sC + ';color:' + sC + '">';
    h += '<div class="cover-grade-letter">' + (d.succVal == null ? '\u2014' : Math.round(d.succVal * 100) + '%') + '</div>';
    h += '</div>';
    h += '<div style="text-align:center;margin-top:14px"><span class="cover-grade-pill" style="background:' + sC + '">' + g.letter + ' \u2014 ' + g.label + '</span></div>';
    h += '<div class="cover-date">' + F.L('prepared_on', fr) + ' ' + F.fmtDate(null, fr) + '</div>';
    if (d.client.advisor) h += '<div style="font-size:11px;color:#888;margin-top:6px">' + F.esc(d.client.advisor) + (d.client.firm ? ' \u00b7 ' + F.esc(d.client.firm) : '') + '</div>';
    h += '<div style="font-size:9px;color:#a09080;margin-top:20px;line-height:1.5;max-width:400px">' +
      (fr ? 'Bas\u00e9 sur ' + (d.p.nSim || 5000) + ' sc\u00e9narios Monte Carlo \u00b7 Fiscalit\u00e9 2026 (13 provinces) \u00b7 Tables de mortalit\u00e9 CPM-2023 \u00b7 Rendements \u00e0 queues \u00e9paisses (t-Student)'
         : 'Based on ' + (d.p.nSim || 5000) + ' Monte Carlo scenarios \u00b7 2026 tax tables (13 provinces) \u00b7 CPM-2023 mortality tables \u00b7 Fat-tailed returns (t-Student)') + '</div>';
    h += '<div class="cover-company">BuildFi Technologies inc. \u00b7 buildfi.ca \u00b7 <span class="ver">' + F.VERSION + '</span></div>';
    h += '</div>';
    return h;
  }

  function renderHeader(d) {
    var fr = d.fr, today = F.fmtDate(null, fr);
    var h = '<div class="hdr"><div>';
    h += '<h1>' + (fr ? 'Plan de retraite' : 'Retirement Plan') + '</h1>';
    h += '<h2>' + F.esc(d.client.name || 'Client') + '</h2>';
    h += '</div><div class="hdr-right">';
    h += today + '<br/>';
    if (d.client.addr) h += '<span style="font-size:11px">' + F.esc(d.client.addr) + '</span><br/>';
    if (d.client.phone) h += '<span style="font-size:11px">' + F.esc(d.client.phone) + '</span><br/>';
    if (d.client.email) h += '<span style="font-size:9px;color:' + C.blue + '">' + F.esc(d.client.email) + '</span><br/>';
    h += '<span class="ver">' + F.VERSION + '</span><br/><span style="font-size:9px;color:#999">BuildFi Technologies inc. \u00b7 buildfi.ca</span>';
    h += '</div></div>';
    return h;
  }

  function renderGrade(d) {
    var fr = d.fr, g = F.grade(d.succVal, fr), sC = F.succColor(d.succVal);
    var h = '<div style="text-align:center;margin:14px 0">';
    h += '<div class="grade-ring" style="border:6px solid ' + sC + ';color:' + sC + '"><span class="mono">' + (d.succVal == null ? (fr ? 'En cours' : 'Pending') : Math.round(d.succVal * 100) + '%') + '</span></div>';
    h += '<div><span class="grade-pill" style="background:' + sC + '">' + g.letter + ' \u2014 ' + g.label + '</span></div>';
    h += '<div style="font-size:10px;color:#999;margin-top:4px">' + (d.p.nSim || 5000) + ' simulations \u00b7 ' + (d.p.fatT ? 't-Student (df=5)' : 'Normal') + ' \u00b7 CPM-2023 \u00b7 ' + (d.p.prov || 'QC') + '</div>';
    h += '</div>';
    return h;
  }

  // === SECTION 0: OVERALL AI ASSESSMENT ===
  function renderOverallAssessment(d) {
    var fr = d.fr, g = F.grade(d.succVal, fr), sC = F.succColor(d.succVal);
    var f$ = F.fmtCompact;
    var h = secPage();
    h += '<h3 class="sec" id="sec-assessment" style="border-bottom-color:' + sC + '">' +
      '<span class="sec-n" style="background:' + sC + '">\u2606</span>' +
      (fr ? 'Votre plan en 30 secondes' : 'Your plan in 30 seconds') + '</h3>';

    // Grade + key metrics row
    h += '<div style="display:flex;align-items:center;gap:20px;margin:14px 0">';
    h += '<div style="text-align:center;flex-shrink:0">';
    h += '<div class="grade-ring" style="border:6px solid ' + sC + ';color:' + sC + '"><span class="mono">' + (d.succVal == null ? '\u2014' : Math.round(d.succVal * 100) + '%') + '</span></div>';
    h += '<div><span class="grade-pill" style="background:' + sC + '">' + g.letter + '</span></div>';
    h += '</div>';
    h += '<div class="g4" style="flex:1">';
    h += F.KPI('<span class="mono">' + f$(d.mc.rMedF || d.mc.medF) + '</span>', fr ? 'Patrimoine P50' : 'P50 Wealth', C.blue);
    h += F.KPI('<span class="mono">' + Math.round(d.covRatio * 100) + '%</span>', fr ? 'Couverture gouv.' : 'Gov. coverage', d.covRatio >= 0.6 ? C.green : d.covRatio >= 0.4 ? C.amber : C.red);
    h += F.KPI('<span class="mono">' + (d._wdPct ? d._wdPct + '%' : '\u2014') + '</span>', fr ? 'Taux retrait' : 'Withdrawal rate', d._wdPct && parseFloat(d._wdPct) > 4 ? C.red : C.green);
    h += F.KPI('<span class="mono">' + f$(Math.round(d.mc.medEstateNet || 0)) + '</span>', fr ? 'H\u00e9ritage net' : 'Net estate', C.gold);
    h += '</div></div>';

    // Overall AI assessment — synthesizes everything
    if (d.ai.overall_assessment) {
      h += F.AiBlock(d.ai.overall_assessment, fr);
    } else {
      // Deterministic summary when AI is absent
      var _detSummary = '';
      if (fr) {
        _detSummary = 'Votre plan obtient la note <strong>' + g.letter + '</strong> (' + g.label + ') avec un taux de succ\u00e8s de <strong>' + Math.round((d.succVal || 0) * 100) + '%</strong> sur ' + (d.p.nSim || 5000) + ' simulations. ';
        _detSummary += 'Les prestations gouvernementales couvrent <strong>' + Math.round(d.covRatio * 100) + '%</strong> de vos d\u00e9penses, laissant un \u00e9cart de <strong>' + F.fmtMoney(Math.round(d.gapM), fr) + '</strong> par mois \u00e0 combler par l\u2019\u00e9pargne. ';
        _detSummary += 'Le patrimoine m\u00e9dian en fin de projection est de <strong>' + f$(d.mc.rMedF || d.mc.medF) + '</strong> en dollars r\u00e9els.';
      } else {
        _detSummary = 'Your plan receives a grade of <strong>' + g.letter + '</strong> (' + g.label + ') with a success rate of <strong>' + Math.round((d.succVal || 0) * 100) + '%</strong> across ' + (d.p.nSim || 5000) + ' simulations. ';
        _detSummary += 'Government benefits cover <strong>' + Math.round(d.covRatio * 100) + '%</strong> of spending, leaving a gap of <strong>' + F.fmtMoney(Math.round(d.gapM), fr) + '</strong> per month to be funded from savings. ';
        _detSummary += 'Median wealth at end of projection is <strong>' + f$(d.mc.rMedF || d.mc.medF) + '</strong> in real dollars.';
      }
      h += narr(_detSummary);
    }

    // Key observations bullets (deterministic, AI can override via overall_assessment)
    var obs = [];
    if (d.succVal != null && d.succVal >= 0.90) obs.push(fr ? '\u2713 Plan solide \u2014 le taux de succ\u00e8s de ' + Math.round(d.succVal * 100) + '% indique une forte probabilit\u00e9 de maintenir votre niveau de vie.' : '\u2713 Solid plan \u2014 the ' + Math.round(d.succVal * 100) + '% success rate indicates a high probability of maintaining your lifestyle.');
    else if (d.succVal != null && d.succVal >= 0.75) obs.push(fr ? '\u26a0 Plan fragile \u2014 le taux de ' + Math.round(d.succVal * 100) + '% laisse peu de marge face aux impr\u00e9vus.' : '\u26a0 Fragile plan \u2014 the ' + Math.round(d.succVal * 100) + '% rate leaves limited margin for the unexpected.');
    else if (d.succVal != null) obs.push(fr ? '\u26a0 Plan \u00e0 risque \u2014 un taux de ' + Math.round(d.succVal * 100) + '% sugg\u00e8re des ajustements n\u00e9cessaires.' : '\u26a0 At-risk plan \u2014 a ' + Math.round(d.succVal * 100) + '% rate suggests adjustments are needed.');

    if (d.covRatio >= 0.7) obs.push(fr ? '\u2713 Les revenus gouvernementaux couvrent ' + Math.round(d.covRatio * 100) + '% des d\u00e9penses, r\u00e9duisant la pression sur l\u2019\u00e9pargne.' : '\u2713 Government income covers ' + Math.round(d.covRatio * 100) + '% of spending, reducing pressure on savings.');
    else if (d.gapM > 0) obs.push(fr ? '\u2192 \u00c9cart mensuel de ' + F.fmtMoney(Math.round(d.gapM), fr) + ' \u00e0 combler par les retraits d\u2019\u00e9pargne.' : '\u2192 Monthly gap of ' + F.fmtMoney(Math.round(d.gapM), fr) + ' to be funded from savings withdrawals.');

    if (d._taxAlpha != null && d._taxAlpha > 0) obs.push(fr ? '\u2713 Optimisation fiscale d\u00e9tect\u00e9e \u2014 alpha fiscal de ' + F.fmtCompact(Math.round(d._taxAlpha)) + ' sur la vie du plan.' : '\u2713 Tax optimization detected \u2014 tax alpha of ' + F.fmtCompact(Math.round(d._taxAlpha)) + ' over the plan lifetime.');
    if (d.R.hasMeltdown) obs.push(fr ? '\u2192 Strat\u00e9gie meltdown REER active \u2014 d\u00e9tails en section d\u00e9di\u00e9e.' : '\u2192 RRSP meltdown strategy active \u2014 see dedicated section.');
    if (d.R.couple) obs.push(fr ? '\u2192 Plan de couple \u2014 les actifs des deux conjoints sont mod\u00e9lis\u00e9s explicitement.' : '\u2192 Couple plan \u2014 both partners\u2019 assets are explicitly modeled.');

    if (obs.length > 0) {
      h += '<div class="cd" style="font-size:11px;line-height:1.9;color:#444">';
      obs.forEach(function(o) { h += '<div style="margin-bottom:2px">' + o + '</div>'; });
      h += '</div>';
    }

    h += secPageEnd();
    return h;
  }

  // === SECTION 1: EXECUTIVE SUMMARY / KPIs ===
  function renderDiagnostic(d, secN) {
    var fr = d.fr, exp = d.exp, mc = d.mc, p = d.p;
    var f$ = F.fmtCompact, fR = function(v) { return F.fmtMoney(v, fr); };
    var h = secPage();
    h += F.Sec(secN, F.L('diagnostic', fr), 'sec-diagnostic');

    // Phase-specific opening narrative
    var g = F.grade(d.succVal, fr);
    var phase = d.R.phase;
    var yrsToRet = p.retAge - p.age;
    var horizon = (p.deathAge || 90) - p.age;

    var _nm = d.fn ? '<strong>' + F.esc(d.fn) + '</strong>' : '';
    var _nmPfx = _nm ? (_nm + ', ') : '';
    if (phase === 'decum') {
      h += narr(fr
        ? _nmPfx + 'vous \u00eates actuellement \u00e0 la retraite. Ce rapport analyse la viabilit\u00e9 de votre plan de d\u00e9caissement sur un horizon de <strong>' + horizon + ' ans</strong>, soit jusqu\u2019\u00e0 l\u2019\u00e2ge de ' + (p.deathAge || 90) + ' ans. L\u2019analyse repose sur <strong>' + (p.nSim || 5000) + ' simulations</strong> Monte Carlo int\u00e9grant les rendements de march\u00e9, l\u2019inflation, la mortalit\u00e9 et la fiscalit\u00e9 canadienne 2026.'
        : (_nm ? _nm + ', you' : 'You') + ' are currently retired. This report analyzes the viability of your withdrawal plan over a <strong>' + horizon + '-year</strong> horizon, through age ' + (p.deathAge || 90) + '. The analysis is based on <strong>' + (p.nSim || 5000) + ' Monte Carlo simulations</strong> incorporating market returns, inflation, mortality, and 2026 Canadian taxation.');
    } else if (phase === 'transition') {
      h += narr(fr
        ? _nmPfx + 'la retraite approche \u2014 dans <strong>' + yrsToRet + ' ans</strong>. Ce rapport \u00e9value si votre \u00e9pargne actuelle de <strong>' + f$(d.totalBal) + '</strong>, combin\u00e9e \u00e0 vos cotisations et revenus gouvernementaux, suffira \u00e0 maintenir votre niveau de vie pendant ' + (horizon - yrsToRet) + ' ann\u00e9es de retraite. Chaque simulation mod\u00e9lise une s\u00e9quence unique de rendements, d\u2019inflation et de long\u00e9vit\u00e9.'
        : (_nm ? _nm + ', retirement' : 'Retirement') + ' is approaching \u2014 in <strong>' + yrsToRet + ' years</strong>. This report evaluates whether your current savings of <strong>' + f$(d.totalBal) + '</strong>, combined with contributions and government income, will sustain your lifestyle through ' + (horizon - yrsToRet) + ' years of retirement. Each simulation models a unique sequence of returns, inflation, and longevity.');
    } else {
      h += narr(fr
        ? _nmPfx + 'vous \u00eates en phase d\u2019accumulation, avec <strong>' + yrsToRet + ' ans</strong> avant la retraite pr\u00e9vue \u00e0 ' + p.retAge + ' ans. Votre \u00e9pargne actuelle de <strong>' + f$(d.totalBal) + '</strong> constitue le point de d\u00e9part des ' + (p.nSim || 5000) + ' sc\u00e9narios projet\u00e9s. Ce rapport \u00e9value la trajectoire de votre patrimoine, l\u2019ad\u00e9quation de vos revenus de retraite et les leviers fiscaux \u00e0 votre disposition.'
        : (_nm ? _nm + ', you' : 'You') + ' are in the accumulation phase, with <strong>' + yrsToRet + ' years</strong> until planned retirement at age ' + p.retAge + '. Your current savings of <strong>' + f$(d.totalBal) + '</strong> form the starting point for ' + (p.nSim || 5000) + ' projected scenarios. This report evaluates your wealth trajectory, retirement income adequacy, and available tax levers.');
    }

    // KPIs
    h += '<div class="' + (exp ? 'g6' : 'g5') + '" style="margin-bottom:12px">';
    h += F.KPI('<span class="mono">' + (d.succVal == null ? (fr ? 'En cours' : 'Pending') : Math.round(d.succVal * 100) + '%') + '</span>', fr ? 'Taux de succ\u00e8s' : 'Success rate', F.succColor(d.succVal));
    h += F.KPI('<span class="mono">' + f$(mc.rMedF || mc.medF) + '</span>', fr ? 'P50 patrimoine (r\u00e9el)' : 'P50 wealth (real)', C.blue);
    h += F.KPI('<span class="mono">' + f$(mc.rP25F || mc.p25F || mc.rVar5 || mc.var5) + '</span>', fr ? 'P25 prudent (r\u00e9el)' : 'P25 cautious (real)', C.amber);
    h += F.KPI('<span class="mono">' + ((mc.p5Ruin || 999) >= 200 ? (fr ? 'Jamais' : 'Never') : mc.p5Ruin + (fr ? ' ans' : ' yrs')) + '</span>', fr ? 'Durabilit\u00e9 de l\u2019\u00e9pargne' : 'Savings durability', (mc.p5Ruin || 999) >= 200 ? C.green : C.red);
    h += F.KPI('<span class="mono">' + (d._wdPct ? d._wdPct + '%' : '\u2014') + '</span>', fr ? 'Retrait initial (% \u00e9pargne)' : 'Init. WR (% portfolio)', d._wdPct && parseFloat(d._wdPct) > 4 ? C.red : d._wdPct && parseFloat(d._wdPct) > 3.5 ? C.amber : C.green);
    if (exp) h += F.KPI('<span class="mono">' + (d._taxAlpha !== null && d._taxAlpha > 0 ? f$(Math.round(d._taxAlpha)) : f$(Math.round(d._optTax))) + '</span>', d._taxAlpha !== null && d._taxAlpha > 0 ? (fr ? 'Alpha fiscal' : 'Tax alpha') : (fr ? 'Imp\u00f4t viager' : 'Lifetime tax'), d._taxAlpha !== null && d._taxAlpha > 0 ? C.green : C.red);
    h += '</div>';

    // Grade interpretation — AI supersedes deterministic when available
    if (d.hasMC && d.succVal != null) {
      var succPct = Math.round(d.succVal * 100);
      var covPctD = Math.round(d.covRatio * 100);
      var _p25Val = mc.rP25F || mc.p25F || mc.rVar5 || mc.var5;
      var _diagDet = fr
        ? 'Le moteur de simulation attribue \u00e0 votre plan la note <strong>' + g.letter + ' (' + g.label + ')</strong>, avec un taux de succ\u00e8s de <strong>' + succPct + '%</strong>. Le patrimoine m\u00e9dian (P50) en fin de projection est de <strong>' + f$(mc.rMedF || mc.medF) + '</strong> en dollars r\u00e9els. Dans un sc\u00e9nario prudent (P25), il serait de <strong>' + f$(_p25Val) + '</strong>.'
        : 'The simulation engine assigns your plan a grade of <strong>' + g.letter + ' (' + g.label + ')</strong>, with a success rate of <strong>' + succPct + '%</strong>. The median (P50) wealth at the end of the projection is <strong>' + f$(mc.rMedF || mc.medF) + '</strong> in real dollars. In a cautious scenario (P25), it would be <strong>' + f$(_p25Val) + '</strong>.';
      h += narrAi(_diagDet, d.ai.verdict, fr, fr ? 'Verdict IA' : 'AI Verdict');
    } else {
      h += aiSlot(d.ai.verdict, fr, fr ? 'Verdict IA' : 'AI Verdict');
    }
    if (d.ai.page_zero_verdict) h += F.AiBlock(d.ai.page_zero_verdict, fr);
    h += secPageEnd();
    return h;
  }

  // === SECTION 2: PROFILE ===
  function renderProfile(d, secN) {
    var fr = d.fr, p = d.p, fR = function(v) { return F.fmtMoney(v, fr); };
    var f$ = F.fmtCompact;
    var qLbl = F.qppLabel(p.prov, fr);
    var h = secPage();
    h += F.Sec(secN, F.L('profile', fr), 'sec-profile');

    // Intro narrative — savings composition
    var rrspPct = d.totalBal > 0 ? Math.round((p.rrsp || 0) / d.totalBal * 100) : 0;
    var tfsaPct = d.totalBal > 0 ? Math.round((p.tfsa || 0) / d.totalBal * 100) : 0;
    var nrPct = d.totalBal > 0 ? Math.round((p.nr || 0) / d.totalBal * 100) : 0;
    var otherPct = Math.max(0, 100 - rrspPct - tfsaPct - nrPct);
    var _nm2 = d.fn ? F.esc(d.fn) : '';
    var _snm2 = d.sfn ? F.esc(d.sfn) : '';
    h += narr(fr
      ? (_nm2 ? _nm2 + ', votre' : 'Votre') + ' portefeuille total de <strong>' + f$(d.totalBal) + '</strong> se compose de ' + rrspPct + '% en REER' + (tfsaPct > 0 ? ', ' + tfsaPct + '% en CELI' : '') + (nrPct > 0 ? ', ' + nrPct + '% en non-enregistr\u00e9' : '') + (otherPct > 0 ? ' et ' + otherPct + '% dans d\u2019autres v\u00e9hicules (CRI, CELIAPP, etc.)' : '') + '. ' + (d.R.couple ? 'Le m\u00e9nage dispose de deux revenus\u00a0: un salaire de ' + fR(p.sal) + ' pour ' + (_nm2 || 'le titulaire') + ' et de ' + fR(p.cSal || 0) + ' pour ' + (_snm2 || 'le conjoint') + '.' : 'Votre salaire actuel est de <strong>' + fR(p.sal) + '</strong>.')  + ' Les d\u00e9penses de retraite pr\u00e9vues sont de <strong>' + fR((p.retSpM || 0) * 12) + '</strong> par ann\u00e9e.'
      : (_nm2 ? _nm2 + ', your' : 'Your') + ' total portfolio of <strong>' + f$(d.totalBal) + '</strong> is composed of ' + rrspPct + '% RRSP' + (tfsaPct > 0 ? ', ' + tfsaPct + '% TFSA' : '') + (nrPct > 0 ? ', ' + nrPct + '% non-registered' : '') + (otherPct > 0 ? ', and ' + otherPct + '% in other vehicles (LIRA, FHSA, etc.)' : '') + '. ' + (d.R.couple ? 'The household has two incomes: ' + fR(p.sal) + ' for ' + (_nm2 || 'the primary') + ' and ' + fR(p.cSal || 0) + ' for ' + (_snm2 || 'the spouse') + '.' : 'Your current salary is <strong>' + fR(p.sal) + '</strong>.') + ' Planned retirement spending is <strong>' + fR((p.retSpM || 0) * 12) + '</strong> per year.');

    // Personal info
    if (d.R.couple) {
      h += '<div class="g2">';
      h += F.Card('<div style="font-weight:700;color:' + C.gold + ';margin-bottom:4px">' + (_nm2 || (fr ? 'Titulaire' : 'Primary')) + '</div><table>' +
        F.R(fr ? '\u00c2ge' : 'Age', p.age) + F.R(fr ? 'Retraite' : 'Retirement', p.retAge) + F.R(fr ? 'Salaire' : 'Salary', fR(p.sal)) +
        F.R(fr ? 'D\u00e9penses retraite' : 'Ret. spending', fR((p.retSpM || 0) * 12) + (fr ? '/an' : '/yr')) +
        F.R('Province', p.prov || 'QC') + '</table>');
      h += F.Card('<div style="font-weight:700;color:' + C.gold + ';margin-bottom:4px">' + (_snm2 || (fr ? 'Conjoint(e)' : 'Spouse')) + '</div><table>' +
        F.R(fr ? '\u00c2ge' : 'Age', p.cAge || '\u2014') + F.R(fr ? 'Retraite' : 'Retirement', p.cRetAge || '\u2014') + F.R(fr ? 'Salaire' : 'Salary', fR(p.cSal || 0)) +
        F.R(fr ? 'D\u00e9penses retraite' : 'Ret. spending', fR((p.cRetSpM || 0) * 12) + (fr ? '/an' : '/yr')) + '</table>');
      h += '</div>';
    } else {
      h += F.Card('<table>' + F.R(fr ? '\u00c2ge' : 'Age', p.age) + F.R(fr ? 'Retraite' : 'Retirement', p.retAge) + F.R(fr ? 'Horizon' : 'Horizon', p.deathAge) +
        F.R(fr ? 'Salaire' : 'Salary', fR(p.sal)) + F.R(fr ? 'D\u00e9penses retraite' : 'Ret. spending', fR((p.retSpM || 0) * 12) + (fr ? '/an' : '/yr')) +
        F.R('Province', p.prov || 'QC') + '</table>');
    }

    // Savings snapshot
    h += '<div style="font-size:11px;font-weight:600;color:' + C.gold + ';text-transform:uppercase;letter-spacing:.5px;margin:12px 0 6px">' + (fr ? '\u00c9pargne' : 'Savings') + '</div>';
    h += F.Card('<table>' +
      F.R('REER/RRSP', fR(p.rrsp || 0)) + F.R('CELI/TFSA', fR(p.tfsa || 0)) + F.R('NR', fR(p.nr || 0)) +
      (p.liraBal ? F.R('CRI/LIRA', fR(p.liraBal)) : '') +
      (p.fhsaBal ? F.R('CELIAPP/FHSA', fR(p.fhsaBal)) : '') +
      (p.dcBal ? F.R('DC/CD', fR(p.dcBal)) : '') +
      (p.peBal ? F.R(fr ? 'PE (m\u00e9tal)' : 'PE (precious)', fR(p.peBal)) : '') +
      (p.pmBal ? F.R(fr ? 'PM (priv\u00e9)' : 'PM (private)', fR(p.pmBal)) : '') +
      F.R('<strong>' + F.L('total', fr) + '</strong>', '<strong>' + fR(d.totalBal) + '</strong>') +
      '</table>');

    // Timeline
    var markers = [{ age: p.age, label: (fr ? 'Aujourd\'hui' : 'Today') }];
    if (p.retAge > p.age) markers.push({ age: p.retAge, label: (fr ? 'Retraite' : 'Retirement') });
    if (p.qppAge && p.qppAge !== p.retAge) markers.push({ age: p.qppAge, label: qLbl });
    if (p.oasAge && p.oasAge !== p.retAge && p.oasAge !== p.qppAge) markers.push({ age: p.oasAge, label: 'PSV/OAS' });
    if ((p.rrsp || 0) > 0 || (p.liraBal || 0) > 0) markers.push({ age: 72, label: 'FERR/RRIF' });
    markers.push({ age: p.deathAge || 90, label: (fr ? 'Horizon' : 'Horizon') });
    markers.sort(function(a, b) { return a.age - b.age; });
    h += Ch.svgTimeline(markers);

    // Government revenue
    h += '<div style="font-size:11px;font-weight:600;color:' + C.gold + ';text-transform:uppercase;letter-spacing:.5px;margin:12px 0 6px">' + (fr ? 'Revenus gouvernementaux' : 'Government Income') + '</div>';
    h += F.Card('<table>' +
      F.R(qLbl + ' (' + (p.qppAge || 65) + (fr ? ' ans)' : ' yrs)'), fR(Math.round(d.qppM)) + '/m \u2014 ' + fR(Math.round(d.qppM * 12)) + (fr ? '/an' : '/yr')) +
      F.R('PSV/OAS (' + (p.oasAge || 65) + (fr ? ' ans)' : ' yrs)'), fR(Math.round(d.oasM)) + '/m \u2014 ' + fR(Math.round(d.oasM * 12)) + (fr ? '/an' : '/yr')) +
      (p.penType && p.penType !== 'none' ? F.R((fr ? 'Pension' : 'Pension'), fR(p.penM || 0) + '/m') : '') +
      (d.R.couple ? F.R(qLbl + ' ' + (fr ? 'conjoint' : 'spouse'), fR(Math.round(d.cQppM)) + '/m') + F.R('PSV ' + (fr ? 'conjoint' : 'spouse'), fR(Math.round(d.cOasM)) + '/m') : '') +
      F.R('<strong>' + (fr ? 'Total gouvernemental' : 'Total government') + '</strong>', '<strong>' + fR(Math.round(d.govM)) + '/m \u2014 ' + fR(Math.round(d.govY)) + (fr ? '/an' : '/yr') + '</strong>') +
      '</table>');

    // Coverage — donut + KPIs
    var covPct = Math.round(d.covRatio * 100);
    var covClr = covPct >= 100 ? C.green : covPct >= 60 ? C.amber : C.red;
    h += '<div style="display:flex;align-items:center;gap:16px;margin-top:10px">';
    h += '<div style="flex-shrink:0">' + Ch.svgDonut(d.covRatio, fr ? 'Couverture gov.' : 'Gov. coverage', covClr, 90) + '</div>';
    h += '<div style="flex:1"><div class="g3">';
    h += F.KPI('<span class="mono">' + fR(Math.round(d.gapM)) + '</span>/m', fr ? '\u00c9cart mensuel' : 'Monthly gap', d.gapM > 0 ? C.red : C.green);
    h += F.KPI('<span class="mono">' + fR(Math.round(d.gapM * 12)) + '</span>' + (fr ? '/an' : '/yr'), fr ? '\u00c9cart annuel' : 'Annual gap', d.gapM > 0 ? C.red : C.green);
    h += F.KPI('<span class="mono">' + fR(Math.round(d.govY)) + '</span>' + (fr ? '/an' : '/yr'), fr ? 'Rev. gov.' : 'Gov. income', C.green);
    h += '</div></div></div>';

    // Coverage interpretation — AI supersedes deterministic
    var _covDet = fr
      ? 'Les revenus gouvernementaux (' + qLbl + ' + PSV' + (p.penType && p.penType !== 'none' ? ' + pension' : '') + ') totalisent <strong>' + fR(Math.round(d.govY)) + '</strong> par ann\u00e9e, ce qui couvre <strong>' + covPct + '%</strong> des d\u00e9penses de retraite pr\u00e9vues de ' + fR((p.retSpM || 0) * 12) + '.' + (d.gapM > 0 ? ' L\u2019\u00e9cart de <strong>' + fR(Math.round(d.gapM)) + '</strong> par mois devra \u00eatre combl\u00e9 par des retraits d\u2019\u00e9pargne.' : ' Les revenus garantis couvrent l\u2019int\u00e9gralit\u00e9 des d\u00e9penses courantes.') + (d.R.couple ? ' Le fractionnement des revenus de pension pourrait r\u00e9duire la charge fiscale du m\u00e9nage.' : '')
      : 'Government income (' + qLbl + ' + OAS' + (p.penType && p.penType !== 'none' ? ' + pension' : '') + ') totals <strong>' + fR(Math.round(d.govY)) + '</strong> per year, covering <strong>' + covPct + '%</strong> of planned retirement spending of ' + fR((p.retSpM || 0) * 12) + '.' + (d.gapM > 0 ? ' The gap of <strong>' + fR(Math.round(d.gapM)) + '</strong> per month would need to be funded from savings withdrawals.' : ' Guaranteed income covers all regular expenses.') + (d.R.couple ? ' Pension income splitting could reduce the household tax burden.' : '');
    h += narrAi(_covDet, d.ai.profile_summary, fr, fr ? 'Profil \u2014 Analyse IA' : 'Profile \u2014 AI Analysis');

    // Static contextual observation (only when no AI)
    if (!d.ai.profile_summary) {
      if (covPct >= 100) {
        h += F.Insight(fr ? 'Vos revenus gouvernementaux couvrent l\u2019int\u00e9gralit\u00e9 de vos d\u00e9penses pr\u00e9vues. L\u2019\u00e9pargne accumul\u00e9e constitue une marge de s\u00e9curit\u00e9 compl\u00e9mentaire.' : 'Your government income covers all planned spending. Accumulated savings provide an additional safety margin.');
      } else if (covPct < 40) {
        h += F.Warning(fr ? 'La couverture gouvernementale est faible (' + covPct + '%). La plus grande partie de vos d\u00e9penses devra \u00eatre financ\u00e9e par vos \u00e9pargnes et placements.' : 'Government coverage is low (' + covPct + '%). Most of your spending will need to be funded from savings and investments.');
      }
    }

    h += secPageEnd();
    return h;
  }

  // === SECTION: FAMILY ===
  function renderFamily(d, secN) {
    if (!d.R.hasFamily) return '';
    var fr = d.fr, family = d.p.family || [];
    var h = secPage();
    h += F.Sec(secN, F.L('family', fr), 'sec-family');

    // Intro narrative
    var childCount = family.filter(function(m) { return m.role === 'child'; }).length;
    var depCount = family.filter(function(m) { return m.role === 'child' && (m.age || 0) < 18; }).length;
    h += narr(fr
      ? 'Votre m\u00e9nage compte <strong>' + family.length + ' membre' + (family.length > 1 ? 's' : '') + '</strong>' + (childCount > 0 ? ', dont ' + childCount + ' enfant' + (childCount > 1 ? 's' : '') + (depCount > 0 ? ' (' + depCount + ' \u00e0 charge)' : '') : '') + '. La composition familiale influence les prestations gouvernementales, la planification successorale et les besoins en assurance.'
      : 'Your household includes <strong>' + family.length + ' member' + (family.length > 1 ? 's' : '') + '</strong>' + (childCount > 0 ? ', including ' + childCount + ' child' + (childCount > 1 ? 'ren' : '') + (depCount > 0 ? ' (' + depCount + ' dependent' + (depCount > 1 ? 's' : '') + ')' : '') : '') + '. Family composition influences government benefits, estate planning, and insurance needs.');

    h += '<div class="cd">';
    family.forEach(function(m) {
      h += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid #f0ece4">';
      h += '<div style="font-size:13px">' + (m.role === 'child' ? '\ud83d\udc67' : m.role === 'spouse' ? '\ud83d\udc6b' : '\ud83d\udc64') + '</div>';
      h += '<div style="flex:1"><strong>' + F.esc(m.name || '') + '</strong>, ' + (m.age || '') + (fr ? ' ans' : ' yrs') + '</div>';
      h += '<div style="font-size:10px;color:#888">' + F.esc(m.note || '') + '</div>';
      h += '</div>';
    });
    h += '</div>';

    // Post-data narrative — AI supersedes deterministic
    if (depCount > 0) {
      var _famDet = fr
        ? 'Avec ' + depCount + ' enfant' + (depCount > 1 ? 's' : '') + ' \u00e0 charge, les d\u00e9penses familiales pourraient diminuer \u00e0 mesure que les enfants atteignent l\u2019autonomie financi\u00e8re, ce qui se refl\u00e8te dans la courbe de d\u00e9penses Go-Go/Slow-Go/No-Go du mod\u00e8le.'
        : 'With ' + depCount + ' dependent child' + (depCount > 1 ? 'ren' : '') + ', family expenses could decrease as children reach financial independence, which is reflected in the Go-Go/Slow-Go/No-Go spending curve in the model.';
      h += narrAi(_famDet, d.ai.family_insight, fr, fr ? 'Famille \u2014 Analyse IA' : 'Family \u2014 AI Analysis');
    } else {
      h += aiSlot(d.ai.family_insight, fr, fr ? 'Famille \u2014 Analyse IA' : 'Family \u2014 AI Analysis');
    }
    h += secPageEnd();
    return h;
  }

  // === SECTION: GOALS ===
  function renderGoals(d, secN) {
    if (!d.R.hasGoals) return '';
    var fr = d.fr, goals = d.p.goals || [];
    var h = secPage();
    h += F.Sec(secN, F.L('goals', fr), 'sec-goals');

    // Intro narrative
    var totalGoalCost = goals.reduce(function(s, g) { return s + (g.amount || 0); }, 0);
    var highProbGoals = goals.filter(function(g) { return (g.prob || g.probability || 0) >= 0.85; }).length;
    h += narr(fr
      ? 'Vous avez d\u00e9fini <strong>' + goals.length + ' objectif' + (goals.length > 1 ? 's' : '') + '</strong> repr\u00e9sentant un montant total de <strong>' + F.fmtCompact(totalGoalCost) + '</strong>. Les objectifs sont \u00e9valu\u00e9s selon leur probabilit\u00e9 de r\u00e9alisation dans les ' + (d.p.nSim || 5000) + ' simulations Monte Carlo.' + (highProbGoals > 0 ? ' ' + highProbGoals + ' objectif' + (highProbGoals > 1 ? 's' : '') + ' affiche' + (highProbGoals > 1 ? 'nt' : '') + ' une probabilit\u00e9 sup\u00e9rieure \u00e0 85%.' : '')
      : 'You have defined <strong>' + goals.length + ' goal' + (goals.length > 1 ? 's' : '') + '</strong> representing a total of <strong>' + F.fmtCompact(totalGoalCost) + '</strong>. Goals are evaluated by their probability of achievement across ' + (d.p.nSim || 5000) + ' Monte Carlo simulations.' + (highProbGoals > 0 ? ' ' + highProbGoals + ' goal' + (highProbGoals > 1 ? 's' : '') + ' show' + (highProbGoals > 1 ? '' : 's') + ' a probability above 85%.' : ''));

    h += '<div class="cd">';
    goals.forEach(function(g) {
      var prob = g.prob || g.probability || 0;
      var clr = prob >= 0.85 ? C.green : prob >= 0.6 ? C.amber : C.red;
      h += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f0ece4">';
      h += '<div style="font-size:13px">' + (g.icon || '\ud83c\udfaf') + '</div>';
      h += '<div style="flex:1"><strong>' + F.esc(g.name || '') + '</strong><br/><span style="font-size:10px;color:#888">' + F.esc(g.type || '') + ' \u2014 ' + F.fmtMoney(g.amount || 0, fr) + '</span></div>';
      h += '<div style="text-align:right"><span class="mono" style="font-size:14px;color:' + clr + '">' + Math.round(prob * 100) + '%</span></div>';
      h += '</div>';
    });
    h += '</div>';

    // Post-data narrative — AI supersedes deterministic
    var lowProbGoals = goals.filter(function(g) { return (g.prob || g.probability || 0) < 0.6; });
    var _goalsDet = '';
    if (lowProbGoals.length > 0) {
      _goalsDet = fr
        ? '' + lowProbGoals.length + ' objectif' + (lowProbGoals.length > 1 ? 's' : '') + ' affiche' + (lowProbGoals.length > 1 ? 'nt' : '') + ' une probabilit\u00e9 inf\u00e9rieure \u00e0 60%, ce qui indique que les conditions actuelles pourraient ne pas suffire \u00e0 les r\u00e9aliser dans la majorit\u00e9 des sc\u00e9narios simul\u00e9s.'
        : '' + lowProbGoals.length + ' goal' + (lowProbGoals.length > 1 ? 's' : '') + ' show' + (lowProbGoals.length > 1 ? '' : 's') + ' a probability below 60%, indicating that current conditions may not be sufficient to achieve ' + (lowProbGoals.length > 1 ? 'them' : 'it') + ' in the majority of simulated scenarios.';
    }
    if (_goalsDet) {
      h += narrAi(_goalsDet, d.ai.goals_insight, fr, fr ? 'Objectifs \u2014 Analyse IA' : 'Goals \u2014 AI Analysis');
    } else {
      h += aiSlot(d.ai.goals_insight, fr, fr ? 'Objectifs \u2014 Analyse IA' : 'Goals \u2014 AI Analysis');
    }
    h += secPageEnd();
    return h;
  }

  // === SECTION: PROJECTION ===
  function renderProjection(d, secN) {
    var fr = d.fr, mc = d.mc, p = d.p, revData = d.revData;
    var f$ = F.fmtCompact, fR = function(v) { return F.fmtMoney(v, fr); };
    var h = secPage();
    h += F.Sec(secN, F.L('projection', fr), 'sec-projection');

    // Intro narrative — what projection does
    var _retPd = mc.pD ? mc.pD.find(function(r) { return r.age === p.retAge; }) : null;
    var _retWealth = _retPd ? (_retPd.mp_total || _retPd.p50 || 0) : d.totalBal;
    var _endPd = mc.pD && mc.pD.length > 0 ? mc.pD[mc.pD.length - 1] : null;
    var _p50End = _endPd ? (_endPd.p50 || _endPd.rmp_total || 0) : 0;
    var _p25End = _endPd ? (_endPd.p25 || _endPd.p5 || 0) : 0;
    var _p75End = _endPd ? (_endPd.p75 || 0) : 0;

    h += narr(fr
      ? 'Le moteur Monte Carlo projette l\u2019\u00e9volution de votre patrimoine \u00e0 travers <strong>' + (p.nSim || 5000) + ' sc\u00e9narios</strong> ind\u00e9pendants. La zone ombrée repr\u00e9sente la plage probable (P25\u2013P75) — dans la moiti\u00e9 des sc\u00e9narios, votre patrimoine se situe dans cette fourchette.'
      : 'The Monte Carlo engine projects your wealth evolution across <strong>' + (p.nSim || 5000) + ' independent scenarios</strong>. The shaded area represents the likely range (P25\u2013P75) — in half of all scenarios, your wealth falls within this band.');

    // Stacked wealth composition chart
    if (mc.pD && mc.pD.length > 0) {
      h += Ch.svgArea(mc.pD,
        ['mp_rr', 'mp_tf', 'mp_nr'],
        [C.purple, C.green, C.blue],
        ['REER/RRSP', 'CELI/TFSA', 'NR'],
        {
          stacked: true, title: fr ? 'Composition du patrimoine' : 'Wealth Composition',
          yFmt: f$, yLabel: '$',
          annotations: [
            { age: p.retAge, label: fr ? 'Retraite' : 'Ret.' },
            { age: 72, label: 'FERR' }
          ]
        }
      );

      // Fan chart
      h += Ch.svgFanChart(mc.pD, {
        title: fr ? 'Projection Monte Carlo' : 'Monte Carlo Projection',
        yLabel: fr ? 'Patrimoine ($)' : 'Wealth ($)',
        annotations: [
          { age: p.retAge, label: fr ? 'Retraite' : 'Ret.' }
        ]
      });
    }

    // Histogram — approximate distribution from percentiles
    if (mc.pD && mc.pD.length > 0) {
      var _hEnd = mc.pD[mc.pD.length - 1];
      var _hP25 = _hEnd ? (_hEnd.p25 || _hEnd.p5 || 0) : 0;
      var _hP75 = _hEnd ? (_hEnd.p75 || _hEnd.p95 || 0) : 0;
      if (_hEnd && _hP25 != null && _hP75 > 0) {
        var _hP5 = _hEnd.p5 || _hP25, _hP95 = _hEnd.p95 || _hP75, _hP50 = _hEnd.p50 || (_hP25 + _hP75) / 2;
        var _hRange = _hP95 - _hP5;
        if (_hRange > 0) {
          var _nBins = 20, _binW = _hRange * 1.3 / _nBins, _hBase = _hP5 - _hRange * 0.15;
          var _hBins = [];
          var _p50Rel = (_hP50 - _hBase) / (_hRange * 1.3);
          for (var _bi = 0; _bi < _nBins; _bi++) {
            var _bMidRel = (_bi + 0.5) / _nBins;
            var _dist = Math.abs(_bMidRel - _p50Rel);
            _hBins.push({ lo: _hBase + _bi * _binW, hi: _hBase + (_bi + 1) * _binW, count: Math.max(1, Math.round(100 * Math.exp(-5 * _dist * _dist))) });
          }
          h += Ch.svgHistogram(_hBins, {
            title: fr ? 'Distribution du patrimoine final (approximation)' : 'Final Wealth Distribution (approximate)',
            p25: _hP25, p50: _hP50, p75: _hP75,
            detValue: _hEnd.mp_total || _hEnd.rmp_total || 0
          });
        }
      }
    }

    // Post-chart narrative — AI supersedes deterministic trajectory interpretation
    var _depAge = (mc.p5Ruin || 999) >= 200 ? null : mc.p5Ruin;
    if (d.hasMC && mc.pD && mc.pD.length > 0) {
      var _isRetired = d.R.phase === 'decum';
      var _trajDet = fr
        ? 'La simulation m\u00e9diane montre un patrimoine ' + (_isRetired ? 'actuel de' : 'atteignant') + ' <strong>' + f$(Math.round(_retWealth)) + '</strong>' + (_isRetired ? ', \u00e9voluant vers' : ' \u00e0 la retraite (' + p.retAge + ' ans), puis \u00e9voluant vers') + ' <strong>' + f$(Math.round(_p50End)) + '</strong> en fin d\u2019horizon. La fourchette probable (P25\u2013P75) se situe entre <strong>' + f$(Math.round(_p25End)) + '</strong> et <strong>' + f$(Math.round(_p75End)) + '</strong>.' + (_depAge ? ' Dans un sc\u00e9nario tr\u00e8s prudent, l\u2019\u00e9pargne pourrait \u00eatre enti\u00e8rement utilis\u00e9e vers <strong>' + _depAge + ' ans</strong> \u2014 les revenus gouvernementaux continueraient toutefois d\u2019\u00eatre vers\u00e9s.' : ' Le patrimoine reste positif sur tout l\u2019horizon, m\u00eame dans les sc\u00e9narios prudents.')
        : 'The median simulation shows ' + (_isRetired ? 'current wealth of' : 'wealth reaching') + ' <strong>' + f$(Math.round(_retWealth)) + '</strong>' + (_isRetired ? ', evolving to' : ' at retirement (age ' + p.retAge + '), then evolving to') + ' <strong>' + f$(Math.round(_p50End)) + '</strong> at the end of the horizon. The likely range (P25\u2013P75) is between <strong>' + f$(Math.round(_p25End)) + '</strong> and <strong>' + f$(Math.round(_p75End)) + '</strong>.' + (_depAge ? ' In a very cautious scenario, savings could be fully drawn down around <strong>age ' + _depAge + '</strong> \u2014 government income would continue regardless.' : ' Wealth remains positive throughout the horizon, even in cautious scenarios.');
      h += narrAi(_trajDet, d.ai.trajectory_insight, fr, fr ? 'Trajectoire \u2014 Analyse IA' : 'Trajectory \u2014 AI Analysis');
    }

    // Milestone table
    var milestones = [p.age, p.retAge, 65, 72, 80, p.deathAge || 90];
    for (var _mi = Math.ceil(p.age / 5) * 5; _mi <= (p.deathAge || 90); _mi += 5) milestones.push(_mi);
    milestones = milestones.filter(function(v, i, a) { return a.indexOf(v) === i && v >= p.age; }).sort(function(a, b) { return a - b; });
    h += F.CopyBtn('rpt-t-proj');
    h += '<table id="rpt-t-proj" class="tbl"><thead><tr>';
    h += '<th style="text-align:left">' + (fr ? '\u00c2ge' : 'Age') + '</th>';
    h += '<th>' + (fr ? 'Patrimoine' : 'Wealth') + '</th>';
    h += '<th>REER</th><th>CELI</th><th>NR</th>';
    if (d.hasMC) h += '<th>P25</th><th>P50</th><th>P75</th>';
    h += '</tr></thead><tbody>';
    milestones.forEach(function(a) {
      var pd = mc.pD ? mc.pD.find(function(r) { return r.age === a; }) : null;
      var rv = revData.find(function(r) { return r.age === a; });
      if (!pd && !rv) return;
      var isKey = a === p.retAge || a === p.age;
      h += '<tr' + (isKey ? ' class="ret"' : '') + '>';
      h += '<td>' + a + '</td>';
      h += '<td>' + f$(pd ? pd.mp_total : 0) + '</td>';
      h += '<td>' + f$(pd ? pd.mp_rr : (rv ? rv.balRR : 0)) + '</td>';
      h += '<td>' + f$(pd ? pd.mp_tf : (rv ? rv.balTF : 0)) + '</td>';
      h += '<td>' + f$(pd ? pd.mp_nr : (rv ? rv.balNR : 0)) + '</td>';
      if (d.hasMC) {
        h += '<td>' + (pd && pd.p25 != null ? f$(pd.p25) : (pd && pd.p5 != null ? f$(pd.p5) : '\u2014')) + '</td>';
        h += '<td>' + (pd && pd.p50 != null ? f$(pd.p50) : '\u2014') + '</td>';
        h += '<td>' + (pd && pd.p75 != null ? f$(pd.p75) : '\u2014') + '</td>';
      }
      h += '</tr>';
    });
    h += '</tbody></table>';

    h += secPageEnd();
    return h;
  }

  // === SECTION: REVENUE & CASH FLOW ===
  function renderRevenue(d, secN) {
    var fr = d.fr, p = d.p, revData = d.revData;
    var f$ = F.fmtCompact, fR = function(v) { return F.fmtMoney(v, fr); };
    var qLbl = F.qppLabel(p.prov, fr);
    var h = secPage();
    h += F.Sec(secN, F.L('revenue', fr), 'sec-revenue');

    // Intro narrative — how income sources compose (focus on structure, not repeating coverage)
    var govPct = d.totalSpM > 0 ? Math.round(d.govM / d.totalSpM * 100) : 0;
    var wdPct = d.totalSpM > 0 ? Math.max(0, 100 - govPct) : 0;
    h += narr(fr
      ? 'Cette section d\u00e9taille la composition des revenus de retraite et leur \u00e9volution dans le temps. Les revenus gouvernementaux repr\u00e9sentent <strong>' + govPct + '%</strong> des besoins.' + (wdPct > 0 ? ' Les <strong>' + wdPct + '%</strong> restants proviendraient de retraits d\u2019\u00e9pargne.' : ' Les revenus garantis couvrent l\u2019int\u00e9gralit\u00e9 des d\u00e9penses.')
      : 'This section details the composition of retirement income and how it evolves over time. Government income represents <strong>' + govPct + '%</strong> of needs.' + (wdPct > 0 ? ' The remaining <strong>' + wdPct + '%</strong> would come from savings withdrawals.' : ' Guaranteed income covers all expenses.'));

    // Annual income waterfall
    var _wfItems = [
      { label: qLbl, value: Math.round(d.qppM * 12), color: C.blue },
      { label: 'PSV/OAS', value: Math.round(d.oasM * 12), color: C.green }
    ];
    if (p.penType && p.penType !== 'none' && (p.penM || 0) > 0) _wfItems.push({ label: 'Pension', value: Math.round((p.penM || 0) * 12), color: C.purple });
    if (d.gapM > 0) _wfItems.push({ label: fr ? 'Retraits' : 'Withdrawals', value: Math.round(d.gapM * 12), color: C.gold });
    if (d.R.couple) {
      if (d.cQppM > 0) _wfItems.push({ label: qLbl + ' ' + (fr ? 'conj.' : 'sp.'), value: Math.round(d.cQppM * 12), color: C.teal });
      if (d.cOasM > 0) _wfItems.push({ label: 'PSV ' + (fr ? 'conj.' : 'sp.'), value: Math.round(d.cOasM * 12), color: C.teal });
    }
    var _wfTotal = _wfItems.reduce(function(s, it) { return s + it.value; }, 0);
    h += Ch.svgWaterfall(_wfItems, { title: fr ? 'Sources de revenus annuelles' : 'Annual Income Sources', total: _wfTotal });

    // Income stacked area (only if revData has the needed fields)
    if (revData.length > 0) {
      var incData = revData.filter(function(r) { return r.age >= p.retAge && ((r.rrq || 0) + (r.psv || 0) + (r.pen || 0) + (r.ret || 0)) > 0; });
      if (incData.length > 0) {
        h += Ch.svgArea(incData,
          ['rrq', 'psv', 'pen', 'ret'],
          [C.blue, C.green, C.purple, C.gold],
          [F.qppLabel(p.prov, fr), 'PSV/OAS', 'Pension', fr ? 'Retraits' : 'Withdrawals'],
          { stacked: true, title: fr ? 'Sources de revenus dans le temps' : 'Income Sources Over Time', yFmt: f$, yLabel: '$' }
        );
      }
    }

    // Cash flow table
    if (revData.length > 0) {
      var cfStep = d.exp ? 1 : Math.max(1, Math.floor(revData.length / 25));
      var cfRows = revData.filter(function(r, i) { return i % cfStep === 0 || r.age === p.retAge || r.age === 65 || r.age === 72 || r.age === 80 || r.age === (p.deathAge || 90) || i === revData.length - 1; });
      h += F.CopyBtn('rpt-t-cf');
      h += '<table id="rpt-t-cf" class="tbl"><thead><tr>';
      h += '<th style="text-align:left">' + (fr ? '\u00c2ge' : 'Age') + '</th>';
      h += '<th>' + (fr ? 'Revenus' : 'Income') + '</th>';
      h += '<th>' + (fr ? 'D\u00e9penses' : 'Spending') + '</th>';
      h += '<th>' + (fr ? 'Imp\u00f4t' : 'Tax') + '</th>';
      h += '<th>' + (fr ? 'Solde' : 'Balance') + '</th>';
      h += '</tr></thead><tbody>';
      cfRows.forEach(function(r) {
        var isKey = r.age === p.retAge || r.age === 72;
        var inc = (r.rrq || 0) + (r.psv || 0) + (r.pen || 0) + (r.ret || 0) + (r.srg || 0);
        h += '<tr' + (isKey ? ' class="ret"' : '') + '>';
        h += '<td>' + r.age + '</td>';
        h += '<td>' + f$(Math.round(inc)) + '</td>';
        h += '<td>' + f$(Math.round(r.sp || r.spending || 0)) + '</td>';
        h += '<td style="color:' + C.red + '">' + f$(Math.round(r.tax || 0)) + '</td>';
        h += '<td>' + f$(Math.round(r.balTot || ((r.balRR || 0) + (r.balTF || 0) + (r.balNR || 0) + (r.balCRR || 0) + (r.balCTF || 0) + (r.balCNR || 0) + (r.balLIRA || 0)))) + '</td>';
        h += '</tr>';
      });
      h += '</tbody></table>';
    }

    // Post-table narrative — spending vs income
    var _retYears = revData.filter(function(r) { return r.age >= p.retAge; });
    var _totalRetInc = _retYears.reduce(function(s, r) { return s + (r.rrq || 0) + (r.psv || 0) + (r.pen || 0) + (r.ret || 0) + (r.srg || 0); }, 0);
    var _totalRetSpend = _retYears.reduce(function(s, r) { return s + (r.sp || r.spending || 0); }, 0);
    var _totalRetTax = _retYears.reduce(function(s, r) { return s + (r.tax || 0); }, 0);
    if (_retYears.length > 0) {
      var _revDet = fr
        ? 'Sur les <strong>' + _retYears.length + ' ann\u00e9es</strong> de retraite model\u00e9es, le revenu brut total est de <strong>' + f$(Math.round(_totalRetInc)) + '</strong>, les d\u00e9penses totales de <strong>' + f$(Math.round(_totalRetSpend)) + '</strong>, et l\u2019imp\u00f4t total de <strong>' + f$(Math.round(_totalRetTax)) + '</strong>. Le tableau ci-dessus d\u00e9taille l\u2019\u00e9volution ann\u00e9e par ann\u00e9e du flux de tr\u00e9sorerie.'
        : 'Over the <strong>' + _retYears.length + ' modeled retirement years</strong>, total gross income is <strong>' + f$(Math.round(_totalRetInc)) + '</strong>, total spending is <strong>' + f$(Math.round(_totalRetSpend)) + '</strong>, and total tax is <strong>' + f$(Math.round(_totalRetTax)) + '</strong>. The table above details the year-by-year cash flow evolution.';
      h += narrAi(_revDet, d.ai.income_insight, fr, fr ? 'Revenus \u2014 Analyse IA' : 'Income \u2014 AI Analysis');
    } else {
      h += aiSlot(d.ai.income_insight, fr, fr ? 'Revenus \u2014 Analyse IA' : 'Income \u2014 AI Analysis');
    }
    h += secPageEnd();
    return h;
  }

  // === SECTION: TAX STRATEGY ===
  function renderTax(d, secN) {
    var fr = d.fr, exp = d.exp, p = d.p, revData = d.revData;
    var f$ = F.fmtCompact, fR = function(v) { return F.fmtMoney(v, fr); };
    var qLbl = F.qppLabel(p.prov, fr);
    var h = secPage();
    h += F.Sec(secN, F.L('tax', fr), 'sec-tax');

    // Intro narrative
    var _retLen = revData.filter(function(r) { return r.age >= p.retAge; }).length;
    h += narr(fr
      ? 'La fiscalit\u00e9 d\u00e9termine la part de vos revenus de retraite que vous conservez r\u00e9ellement. L\u2019imp\u00f4t viager total est estim\u00e9 \u00e0 <strong>' + f$(Math.round(d._optTax)) + '</strong>, avec un taux effectif moyen de <strong>' + Math.round(d.avgEffRate * 100) + '%</strong> sur ' + _retLen + ' ann\u00e9es de retraite.' + (d.oasClbkYrs > 0 ? ' La r\u00e9cup\u00e9ration de la PSV touche <strong>' + d.oasClbkYrs + ' ann\u00e9e' + (d.oasClbkYrs > 1 ? 's' : '') + '</strong> sur ' + _retLen + '.' : '') + (d._taxAlpha !== null && d._taxAlpha > 0 ? ' La strat\u00e9gie de d\u00e9caissement optimis\u00e9e g\u00e9n\u00e8re un alpha fiscal de <strong>' + f$(Math.round(d._taxAlpha)) + '</strong>.' : '')
      : 'Taxation determines how much of your retirement income you actually keep. Total lifetime tax is estimated at <strong>' + f$(Math.round(d._optTax)) + '</strong>, with an average effective rate of <strong>' + Math.round(d.avgEffRate * 100) + '%</strong> over ' + _retLen + ' retirement years.' + (d.oasClbkYrs > 0 ? ' OAS clawback affects <strong>' + d.oasClbkYrs + ' year' + (d.oasClbkYrs > 1 ? 's' : '') + '</strong> out of ' + _retLen + '.' : '') + (d._taxAlpha !== null && d._taxAlpha > 0 ? ' The optimized withdrawal strategy generates a tax alpha of <strong>' + f$(Math.round(d._taxAlpha)) + '</strong>.' : ''));

    h += '<div class="' + (exp ? 'g4' : 'g3') + '" style="margin-bottom:8px">';
    h += F.KPI('<span class="mono">' + (d._taxAlpha !== null && d._taxAlpha > 0 ? f$(Math.round(d._taxAlpha)) : f$(Math.round(d._optTax))) + '</span>', d._taxAlpha !== null && d._taxAlpha > 0 ? (fr ? 'Alpha fiscal' : 'Tax alpha') : (fr ? 'Imp\u00f4t viager' : 'Lifetime tax'), d._taxAlpha !== null && d._taxAlpha > 0 ? C.green : C.red);
    h += F.KPI('<span class="mono">' + Math.round(d.avgEffRate * 100) + '%</span>', fr ? 'Taux effectif moyen' : 'Avg effective rate', C.blue);
    h += F.KPI('<span class="mono">' + d.oasClbkYrs + '/' + _retLen + '</span>', fr ? 'Ann\u00e9es r\u00e9cup. PSV' : 'OAS clawback yrs', d.oasClbkYrs > _retLen * 0.5 ? C.red : d.oasClbkYrs > 0 ? C.amber : C.green);
    if (exp && d._hasNaive) h += F.KPI('<span class="mono">' + Math.round((d._naiveTax - d._optTax) / Math.max(1, d._naiveTax) * 100) + '%</span>', fr ? 'R\u00e9duction fiscale' : 'Tax reduction', C.purple);
    h += '</div>';

    if (d.oasClbkYrs > 0) { var _oasThr = D.OAS_CLAWBACK_THR; h += '<div style="font-size:10px;color:#888;font-style:italic;margin:2px 0 6px">' + (fr ? 'R\u00e9cup\u00e9ration PSV: un revenu imposable sup\u00e9rieur \u00e0 ' + F.fmtCurrency(_oasThr) + ' entra\u00eene une r\u00e9cup\u00e9ration de 15% de la PSV. ' + d.oasClbkYrs + ' ann\u00e9es sur ' + _retLen + ' sont affect\u00e9es.' : 'OAS clawback: taxable income above ' + F.fmtCurrency(_oasThr) + ' triggers 15% OAS recovery tax. ' + d.oasClbkYrs + ' of ' + _retLen + ' retirement years are affected.') + '</div>'; }

    // Strategy summary card
    h += F.Card('<table>' +
      F.R(fr ? 'D\u00e9caissement' : 'Decumulation', p.wStrat === 'optimized' ? (fr ? 'Optimis\u00e9' : 'Optimized') : 'Standard') +
      F.R('Meltdown', p.melt ? (fr ? 'Oui \u2014 cible ' : 'Yes \u2014 target ') + F.fmtCurrency(p.meltTgt) : (fr ? 'Non' : 'No')) +
      F.R(fr ? 'Fractionnement' : 'Splitting', p.split ? (fr ? 'Oui \u2014 ' : 'Yes \u2014 ') + Math.round((p.splitP || 0) * 100) + '%' : (fr ? 'Non' : 'No')) +
      F.R(fr ? 'D\u00e9penses' : 'Spending curve', 'Go-Go ' + Math.round((p.goP || 1) * 100) + '% / Slow-Go ' + Math.round((p.slP || 0.85) * 100) + '% / No-Go ' + Math.round((p.noP || 0.7) * 100) + '%') +
      '</table>');

    // Post-data narrative — AI supersedes deterministic
    var _taxDet = fr
      ? 'La strat\u00e9gie de d\u00e9caissement ' + (p.wStrat === 'optimized' ? 'optimis\u00e9e coordonne' : 'standard r\u00e9partit') + ' les retraits entre REER, CELI et non-enregistr\u00e9 pour minimiser l\u2019imp\u00f4t viager.' + (p.melt ? ' Le meltdown REER acc\u00e9l\u00e8re les retraits avant 72 ans avec une cible de ' + F.fmtCurrency(p.meltTgt) + ' par ann\u00e9e.' : '') + (p.split ? ' Le fractionnement de revenus de pension \u00e0 ' + Math.round((p.splitP || 0) * 100) + '% r\u00e9duit l\u2019imp\u00f4t du m\u00e9nage.' : '') + ' La courbe de d\u00e9penses Go-Go/Slow-Go/No-Go refl\u00e8te un ralentissement progressif des d\u00e9penses avec l\u2019\u00e2ge.'
      : 'The ' + (p.wStrat === 'optimized' ? 'optimized withdrawal strategy coordinates' : 'standard withdrawal strategy distributes') + ' withdrawals across RRSP, TFSA, and non-registered accounts to minimize lifetime tax.' + (p.melt ? ' RRSP meltdown accelerates withdrawals before age 72 with a target of ' + F.fmtCurrency(p.meltTgt) + ' per year.' : '') + (p.split ? ' Pension income splitting at ' + Math.round((p.splitP || 0) * 100) + '% reduces household tax.' : '') + ' The Go-Go/Slow-Go/No-Go spending curve reflects a gradual decline in spending with age.';

    // Withdrawal detail table (expert)
    if (exp && revData.length > 0) {
      var _wdHorizon = Math.min(30, (p.deathAge || 90) - p.retAge);
      var _wdAll = revData.filter(function(r) { return r.age >= p.retAge && r.age <= p.retAge + _wdHorizon; });
      var _wdStep = _wdAll.length > 20 ? Math.max(1, Math.floor(_wdAll.length / 20)) : 1;
      var _wdYrs = _wdAll.filter(function(r, i) { return i % _wdStep === 0 || r.age === p.retAge || r.age === 72 || r.age === 80 || i === _wdAll.length - 1; });
      if (_wdYrs.length > 0) {
        h += '<div style="font-size:11px;font-weight:600;color:' + C.gold + ';text-transform:uppercase;letter-spacing:.5px;margin:12px 0 6px">' + (fr ? 'D\u00e9tail du d\u00e9caissement' : 'Withdrawal Detail') + '</div>';
        h += F.CopyBtn('rpt-t-wd');
        h += '<table id="rpt-t-wd" class="tbl"><thead><tr>';
        h += '<th style="text-align:left">' + (fr ? '\u00c2ge' : 'Age') + '</th><th>REER</th><th>CELI</th><th>NR</th>';
        h += '<th>' + qLbl + '</th><th>PSV</th><th>SRG</th>';
        h += '<th style="color:' + C.red + '">' + (fr ? 'Imp\u00f4t' : 'Tax') + '</th>';
        h += '<th>' + (fr ? 'Taux eff.' : 'Eff. rate') + '</th>';
        h += '<th style="font-weight:700">' + (fr ? 'Rev. net' : 'Net income') + '</th>';
        h += '</tr></thead><tbody>';
        _wdYrs.forEach(function(r) {
          var isKey = r.age === p.retAge || r.age === 72;
          var netInc = (r.rrq || 0) + (r.psv || 0) + (r.srg || 0) + (r.pen || 0) + (r.ret || 0) - (r.tax || 0);
          var effR = r.taxInc > 0 ? Math.round((r.tax || 0) / r.taxInc * 100) : 0;
          h += '<tr' + (isKey ? ' class="ret"' : '') + '>';
          h += '<td>' + r.age + '</td>';
          h += '<td>' + (r.aRR > 0 ? fR(r.aRR) : '\u2014') + '</td>';
          h += '<td>' + (r.aTF > 0 ? fR(r.aTF) : '\u2014') + '</td>';
          h += '<td>' + (r.aNR > 0 ? fR(r.aNR) : '\u2014') + '</td>';
          h += '<td>' + ((r.rrq || 0) > 0 ? fR(r.rrq) : '\u2014') + '</td>';
          h += '<td>' + ((r.psv || 0) > 0 ? fR(r.psv) : '\u2014') + '</td>';
          h += '<td>' + ((r.srg || 0) > 0 ? fR(r.srg) : '\u2014') + '</td>';
          h += '<td style="color:' + C.red + '">' + ((r.tax || 0) > 0 ? fR(r.tax) : '\u2014') + '</td>';
          h += '<td>' + effR + '%</td>';
          h += '<td style="font-weight:700">' + fR(Math.round(netInc)) + '</td>';
          h += '</tr>';
        });
        h += '</tbody></table>';
      }
    }

    // Fee impact
    if (d.merWt > 0.003) {
      h += '<div class="g3" style="margin-top:8px">';
      h += F.KPI('<span class="mono">' + (d.merWt * 100).toFixed(2) + '%</span>', 'MER ' + (fr ? 'moyen' : 'avg'), d.merWt > 0.01 ? C.red : C.green);
      h += F.KPI('<span class="mono">' + f$(Math.round(d.feeCost)) + '</span>', fr ? 'Co\u00fbt total frais' : 'Total fee cost', C.amber);
      h += F.KPI('<span class="mono">' + Math.round(d.horizon) + (fr ? ' ans' : ' yrs') + '</span>', fr ? 'Horizon' : 'Horizon', C.blue);
      h += '</div>';
    }

    h += narrAi(_taxDet, d.ai.taxInsight, fr, fr ? 'Fiscalit\u00e9 \u2014 Analyse IA' : 'Tax \u2014 AI Analysis');
    h += secPageEnd();
    return h;
  }

  // === SECTION: GIS ===
  function renderGIS(d, secN) {
    var fr = d.fr, revData = d.revData, exp = d.exp;
    var fR = function(v) { return F.fmtMoney(v, fr); };
    var f$ = F.fmtCompact;
    var _gisYrs = revData.filter(function(r) { return r.age >= 65 && (r.srg || r.gis || 0) > 0; });
    if (_gisYrs.length === 0) return '';

    var h = secPage();
    h += F.Sec(secN, F.L('gis', fr), 'sec-gis');

    var _gisTotal = _gisYrs.reduce(function(s, r) { return s + (r.srg || r.gis || 0); }, 0);
    var _gisAvg = _gisTotal / _gisYrs.length;
    var _gisMax = _gisYrs.reduce(function(m, r) { return Math.max(m, r.srg || r.gis || 0); }, 0);
    var _gis65Yrs = revData.filter(function(r) { return r.age >= 65; }).length;

    // Intro narrative
    h += narr(fr
      ? 'Le Suppl\u00e9ment de revenu garanti (SRG) est vers\u00e9 aux retrait\u00e9s \u00e0 faible revenu en compl\u00e9ment de la PSV. Votre profil est admissible au SRG pendant <strong>' + _gisYrs.length + ' ann\u00e9e' + (_gisYrs.length > 1 ? 's' : '') + '</strong> sur ' + _gis65Yrs + ' ann\u00e9es apr\u00e8s 65 ans, pour un total viager estim\u00e9 de <strong>' + f$(Math.round(_gisTotal)) + '</strong>. Le SRG moyen par ann\u00e9e d\u2019admissibilit\u00e9 serait de ' + fR(Math.round(_gisAvg)) + '.'
      : 'The Guaranteed Income Supplement (GIS) is paid to low-income retirees alongside OAS. Your profile qualifies for GIS during <strong>' + _gisYrs.length + ' year' + (_gisYrs.length > 1 ? 's' : '') + '</strong> out of ' + _gis65Yrs + ' years after age 65, for an estimated lifetime total of <strong>' + f$(Math.round(_gisTotal)) + '</strong>. The average GIS per eligible year would be ' + fR(Math.round(_gisAvg)) + '.');

    h += '<div class="g4" style="margin-bottom:8px">';
    h += F.KPI('<span class="mono">' + fR(Math.round(_gisTotal)) + '</span>', fr ? 'SRG viager' : 'Lifetime GIS', C.teal);
    h += F.KPI('<span class="mono">' + fR(Math.round(_gisAvg)) + '</span>' + (fr ? '/an' : '/yr'), fr ? 'SRG moyen/an' : 'Avg GIS/yr', C.teal);
    h += F.KPI('<span class="mono">' + fR(Math.round(_gisMax)) + '</span>', fr ? 'SRG max.' : 'Max GIS', C.blue);
    h += F.KPI('<span class="mono">' + _gisYrs.length + '/' + _gis65Yrs + '</span>', fr ? 'Ann\u00e9es SRG' : 'GIS years', C.purple);
    h += '</div>';

    h += F.CopyBtn('rpt-t-gis');
    h += '<table id="rpt-t-gis" class="tbl"><thead><tr>';
    h += '<th style="text-align:left">' + (fr ? '\u00c2ge' : 'Age') + '</th><th>SRG/GIS</th><th>PSV/OAS</th>';
    h += '<th>' + (fr ? 'Rev. imposable' : 'Taxable inc.') + '</th><th>' + (fr ? 'SRG en % du total' : 'GIS as % of total') + '</th>';
    h += '</tr></thead><tbody>';
    _gisYrs.filter(function(r, i) { return i % (exp ? 1 : 2) === 0 || r.age === 65 || r.age === 72; }).forEach(function(r) {
      var gAmt = r.srg || r.gis || 0;
      var tInc = (r.rrq || 0) + (r.psv || 0) + gAmt + (r.ret || 0) + (r.pen || 0);
      h += '<tr><td>' + r.age + '</td>';
      h += '<td style="color:' + C.teal + ';font-weight:600">' + fR(Math.round(gAmt)) + '</td>';
      h += '<td>' + fR(Math.round(r.psv || 0)) + '</td>';
      h += '<td>' + fR(Math.round(r.taxInc || 0)) + '</td>';
      h += '<td>' + (tInc > 0 ? Math.round(gAmt / tInc * 100) : 0) + '%</td></tr>';
    });
    h += '</tbody></table>';

    // Post-table narrative — AI supersedes deterministic
    var _gisDet = fr
      ? 'Le SRG est r\u00e9cup\u00e9r\u00e9 \u00e0 50\u00a2 par dollar de revenu au-del\u00e0 du seuil, cr\u00e9ant un taux marginal effectif tr\u00e8s \u00e9lev\u00e9. Minimiser les retraits REER/FERR pendant les ann\u00e9es d\u2019admissibilit\u00e9 pourrait pr\u00e9server cette prestation. Le SRG repr\u00e9sente en moyenne <strong>' + Math.round(_gisAvg / Math.max(1, d.totalSpM * 12) * 100) + '%</strong> des d\u00e9penses annuelles durant les ann\u00e9es d\u2019admissibilit\u00e9.'
      : 'GIS is clawed back at 50\u00a2 per dollar above the threshold, creating a very high effective marginal rate. Minimizing RRSP/RRIF withdrawals during eligibility years could preserve this benefit. GIS represents an average of <strong>' + Math.round(_gisAvg / Math.max(1, d.totalSpM * 12) * 100) + '%</strong> of annual spending during eligible years.';
    h += narrAi(_gisDet, d.ai.gis_insight, fr, fr ? 'SRG \u2014 Analyse IA' : 'GIS \u2014 AI Analysis');
    h += secPageEnd();
    return h;
  }

  // === SECTION: MELTDOWN ===
  function renderMeltdown(d, secN) {
    if (!d.R.hasMeltdown) return '';
    var fr = d.fr, p = d.p, mc = d.mc, exp = d.exp, revData = d.revData;
    var fR = function(v) { return F.fmtMoney(v, fr); }, f$ = F.fmtCompact;
    var h = secPage();
    h += F.Sec(secN, F.L('meltdown', fr), 'sec-meltdown');

    var _pd72 = mc.pD ? mc.pD.find(function(d2) { return d2.age === 72; }) : null;
    var _rrspAt72 = _pd72 ? (_pd72.mp_rr || 0) : 0;
    var _meltPctRed = (p.rrsp || 0) > 0 ? Math.round((1 - Math.max(0, _rrspAt72) / (p.rrsp || 1)) * 100) : 0;
    var _meltYrs = Math.max(0, 72 - p.retAge);

    // Intro narrative
    h += narr(fr
      ? 'Le meltdown REER consiste \u00e0 retirer du REER de fa\u00e7on acc\u00e9l\u00e9r\u00e9e avant la conversion FERR obligatoire \u00e0 72 ans. Votre REER actuel de <strong>' + f$(p.rrsp || 0) + '</strong> serait r\u00e9duit \u00e0 <strong>' + f$(Math.round(_rrspAt72)) + '</strong> \u00e0 72 ans, soit une r\u00e9duction de <strong>' + _meltPctRed + '%</strong> sur une p\u00e9riode de ' + _meltYrs + ' ans. La cible de retrait est de ' + fR(p.meltTgt || 0) + ' par ann\u00e9e.'
      : 'RRSP meltdown involves accelerated withdrawals before mandatory RRIF conversion at age 72. Your current RRSP of <strong>' + f$(p.rrsp || 0) + '</strong> would be reduced to <strong>' + f$(Math.round(_rrspAt72)) + '</strong> at age 72, a <strong>' + _meltPctRed + '%</strong> reduction over ' + _meltYrs + ' years. The withdrawal target is ' + fR(p.meltTgt || 0) + ' per year.');

    h += '<div class="g4" style="margin-bottom:8px">';
    h += F.KPI('<span class="mono">' + fR(p.rrsp || 0) + '</span>', fr ? 'REER actuel' : 'Current RRSP', C.purple);
    h += F.KPI('<span class="mono">' + fR(Math.round(p.meltTgt || 0)) + '</span>', fr ? 'Cible/an' : 'Target/yr', C.gold);
    h += F.KPI('<span class="mono">' + fR(Math.round(_rrspAt72)) + '</span>', fr ? 'REER \u00e0 72' : 'RRSP at 72', C.amber);
    h += F.KPI('<span class="mono">' + _meltPctRed + '%</span>', fr ? 'R\u00e9duction' : 'Reduction', _meltPctRed > 50 ? C.green : C.amber);
    h += '</div>';

    // Expert detail table
    if (exp) {
      var _meltPreYrs = revData.filter(function(r) { return r.age >= p.retAge && r.age < 72; });
      if (_meltPreYrs.length > 0) {
        h += F.CopyBtn('rpt-t-melt');
        h += '<table id="rpt-t-melt" class="tbl"><thead><tr>';
        h += '<th style="text-align:left">' + (fr ? '\u00c2ge' : 'Age') + '</th><th>' + (fr ? 'Retraits' : 'Withdr.') + '</th>';
        h += '<th>' + F.qppLabel(p.prov, fr) + '</th><th>PSV</th>';
        h += '<th style="color:' + C.red + '">' + (fr ? 'Imp\u00f4t' : 'Tax') + '</th><th>' + (fr ? 'Taux eff.' : 'Eff. rate') + '</th>';
        h += '<th>' + (fr ? 'Rev. imposable' : 'Taxable inc.') + '</th></tr></thead><tbody>';
        _meltPreYrs.forEach(function(r) {
          var _mEffR = (r.taxInc || 0) > 0 ? Math.round((r.tax || 0) / (r.taxInc || 1) * 100) : 0;
          h += '<tr' + (r.age === p.retAge ? ' class="ret"' : '') + '>';
          h += '<td>' + r.age + '</td><td>' + fR(Math.round(r.ret || 0)) + '</td>';
          h += '<td>' + fR(Math.round(r.rrq || 0)) + '</td><td>' + fR(Math.round(r.psv || 0)) + '</td>';
          h += '<td style="color:' + C.red + '">' + fR(Math.round(r.tax || 0)) + '</td><td>' + _mEffR + '%</td>';
          h += '<td>' + fR(Math.round(r.taxInc || 0)) + '</td></tr>';
        });
        h += '</tbody></table>';
      }
    }

    h += F.Card('<table>' +
      F.R(fr ? 'REER initial' : 'Starting RRSP', fR(p.rrsp || 0)) +
      F.R(fr ? 'REER \u00e0 72' : 'RRSP at 72', fR(Math.round(_rrspAt72))) +
      F.R(fr ? 'Cible meltdown' : 'Meltdown target', fR(p.meltTgt || 0) + (fr ? '/an' : '/yr')) +
      F.R(fr ? 'P\u00e9riode' : 'Period', p.retAge + (fr ? ' \u00e0 72 (' : ' to 72 (') + _meltYrs + (fr ? ' ans)' : ' yrs)')) +
      (d._taxAlpha !== null && d._taxAlpha > 0 ? F.R(fr ? 'Alpha fiscal' : 'Tax alpha', '<strong style="color:' + C.green + '">' + fR(Math.round(d._taxAlpha)) + '</strong>') : '') +
      '</table>');

    // Post-data narrative — AI supersedes deterministic
    var _meltDet = fr
      ? 'L\u2019objectif du meltdown est de r\u00e9duire la masse imposable du REER avant la conversion FERR obligatoire. En retirant ' + fR(p.meltTgt || 0) + ' par ann\u00e9e pendant ' + _meltYrs + ' ans, le solde REER diminue de ' + _meltPctRed + '%.' + (d._taxAlpha !== null && d._taxAlpha > 0 ? ' Cette strat\u00e9gie g\u00e9n\u00e8re un alpha fiscal estim\u00e9 de <strong>' + fR(Math.round(d._taxAlpha)) + '</strong>, en r\u00e9duisant les retraits FERR obligatoires, la r\u00e9cup\u00e9ration PSV et l\u2019imp\u00f4t au d\u00e9c\u00e8s.' : ' Cela diminue les retraits FERR obligatoires et la r\u00e9cup\u00e9ration potentielle de la PSV.')
      : 'The meltdown objective is to reduce the taxable RRSP mass before mandatory RRIF conversion. By withdrawing ' + fR(p.meltTgt || 0) + ' per year over ' + _meltYrs + ' years, the RRSP balance decreases by ' + _meltPctRed + '%.' + (d._taxAlpha !== null && d._taxAlpha > 0 ? ' This strategy generates an estimated tax alpha of <strong>' + fR(Math.round(d._taxAlpha)) + '</strong>, by reducing mandatory RRIF withdrawals, OAS clawback, and tax at death.' : ' This reduces mandatory RRIF withdrawals and potential OAS clawback.');
    h += narrAi(_meltDet, d.ai.meltdown_insight, fr, fr ? 'Meltdown \u2014 Analyse IA' : 'Meltdown \u2014 AI Analysis');
    h += secPageEnd();
    return h;
  }

  // === SECTION: SUCCESSION ===
  function renderSuccession(d, secN) {
    var fr = d.fr, mc = d.mc, p = d.p, exp = d.exp;
    var f$ = F.fmtCompact, fR = function(v) { return F.fmtMoney(v, fr); };
    var _grossEstate = (mc.medEstateNet || 0) + (mc.medEstateTax || 0);

    // Skip section if estate data is absent or trivially small
    if (_grossEstate < 1000 && (mc.medEstateNet || 0) < 1000 && (mc.p5EstateNet || 0) < 1000) {
      return '';
    }

    var h = secPage();
    h += F.Sec(secN, F.L('succession', fr), 'sec-succession');

    var _estTaxRate = _grossEstate > 0 ? Math.round((mc.medEstateTax || 0) / _grossEstate * 100) : 0;

    // Intro narrative
    h += narr(fr
      ? 'Au d\u00e9c\u00e8s, les comptes enregistr\u00e9s (REER/FERR) font l\u2019objet d\u2019une disposition r\u00e9put\u00e9e qui g\u00e9n\u00e8re de l\u2019imp\u00f4t. La valeur brute successorale m\u00e9diane est de <strong>' + f$(Math.round(_grossEstate)) + '</strong>. L\u2019imp\u00f4t au d\u00e9c\u00e8s est estim\u00e9 \u00e0 <strong>' + f$(Math.round(mc.medEstateTax || 0)) + '</strong>, soit <strong>' + _estTaxRate + '%</strong> de la valeur brute, laissant un h\u00e9ritage net de <strong>' + f$(Math.round(mc.medEstateNet || 0)) + '</strong>.' + (p.cOn ? ' Le roulement au conjoint survivant pourrait r\u00e9duire cet impact.' : '')
      : 'At death, registered accounts (RRSP/RRIF) undergo a deemed disposition that generates tax. The median gross estate value is <strong>' + f$(Math.round(_grossEstate)) + '</strong>. Tax at death is estimated at <strong>' + f$(Math.round(mc.medEstateTax || 0)) + '</strong>, or <strong>' + _estTaxRate + '%</strong> of gross value, leaving a net estate of <strong>' + f$(Math.round(mc.medEstateNet || 0)) + '</strong>.' + (p.cOn ? ' Spousal rollover could reduce this impact.' : ''));

    h += '<div class="g3" style="margin-bottom:8px">';
    h += F.KPI('<span class="mono">' + f$(Math.round(mc.medEstateTax || 0)) + '</span>', fr ? 'Imp\u00f4t au d\u00e9c\u00e8s' : 'Tax at death', C.red);
    h += F.KPI('<span class="mono">' + f$(Math.round(mc.medEstateNet || 0)) + '</span>', fr ? 'H\u00e9ritage net' : 'Net estate', C.green);
    h += F.KPI('<span class="mono">' + f$(Math.round(mc.p25EstateNet || mc.p5EstateNet || 0)) + '</span>', fr ? 'Sc\u00e9nario prudent' : 'Cautious scenario', C.amber);
    h += '</div>';

    if (exp) {
      h += F.Card('<table>' +
        F.R(fr ? 'Disposition REER' : 'RRSP deemed', F.fmtCurrency((p.rrsp || 0) + (p.cOn ? (p.cRRSP || 0) : 0)) + ' ' + (fr ? 'imposable' : 'taxable')) +
        F.R(fr ? 'Gains en capital' : 'Capital gains', (p.cgIncLo || 0.5) * 100 + '% / ' + ((p.cgIncHi || 0.6667) * 100).toFixed(0) + '%') +
        F.R(fr ? 'Roulement conjoint' : 'Spousal rollover', p.cOn ? (fr ? 'Oui' : 'Yes') : (fr ? 'Non' : 'No')) +
        F.R(fr ? 'R\u00e9sidence principale' : 'Principal res.', fr ? 'Exon\u00e9r\u00e9e' : 'Exempt') +
        '</table>');
    }

    // Post-data narrative — AI supersedes deterministic
    var _estDet = fr
      ? 'Dans un sc\u00e9nario prudent, l\u2019h\u00e9ritage net serait de <strong>' + f$(Math.round(mc.p25EstateNet || mc.p5EstateNet || 0)) + '</strong>. La r\u00e9sidence principale est exon\u00e9r\u00e9e de l\u2019imp\u00f4t sur les gains en capital.' + (p.cOn ? ' Le roulement au conjoint survivant permet de diff\u00e9rer la disposition r\u00e9put\u00e9e du REER/FERR et du CELI, reportant l\u2019imp\u00f4t au deuxi\u00e8me d\u00e9c\u00e8s.' : '')
      : 'In a cautious scenario, the net estate would be <strong>' + f$(Math.round(mc.p25EstateNet || mc.p5EstateNet || 0)) + '</strong>. The principal residence is exempt from capital gains tax.' + (p.cOn ? ' Spousal rollover allows deferral of RRSP/RRIF and TFSA deemed disposition, postponing tax to the second death.' : '');
    h += narrAi(_estDet, d.ai.estateInsight, fr, fr ? 'Succession \u2014 Analyse IA' : 'Estate \u2014 AI Analysis');
    h += secPageEnd();
    return h;
  }

  // === SECTION: REAL ESTATE ===
  function renderRealEstate(d, secN) {
    var props = (d.p.props || []).filter(function(p2) { return p2 && p2.on; });
    if (props.length === 0) return '';
    var fr = d.fr, fR = function(v) { return F.fmtMoney(v, fr); };
    var f$ = F.fmtCompact;
    var h = secPage();
    h += F.Sec(secN, F.L('realestate', fr), 'sec-realestate');

    // Compute aggregates first for narrative
    var _totalVal = props.reduce(function(s, pr) { return s + (pr.val || 0); }, 0);
    var _totalEq = props.reduce(function(s, pr) { return s + (pr.val || 0) - (pr.mb || 0); }, 0);
    var _totalCf = props.reduce(function(s, pr) {
      var mp2 = pr.mb > 0 && pr.mr > 0 ? pr.mb * (pr.mr / 12) / (1 - Math.pow(1 + pr.mr / 12, -(pr.ma || 25) * 12)) : pr.mb > 0 && pr.ma > 0 ? pr.mb / (pr.ma * 12) : 0;
      return s + ((pr.rm || 0) - mp2 - ((pr.pt || 0) + (pr.ins || 0) + (pr.ox || 0)) / 12);
    }, 0);
    var _totalMort = props.reduce(function(s, pr) { return s + (pr.mb || 0); }, 0);
    var _eqPctTotal = _totalVal > 0 ? Math.round(_totalEq / _totalVal * 100) : 0;

    // Intro narrative
    h += narr(fr
      ? 'Votre portefeuille immobilier comprend <strong>' + props.length + ' propri\u00e9t\u00e9' + (props.length > 1 ? 's' : '') + '</strong> d\u2019une valeur totale de <strong>' + f$(_totalVal) + '</strong>. L\u2019\u00e9quit\u00e9 nette est de <strong>' + f$(_totalEq) + '</strong> (' + _eqPctTotal + '% de la valeur), avec un solde hypoth\u00e9caire de ' + f$(_totalMort) + '. Le flux de tr\u00e9sorerie net est de <strong>' + fR(Math.round(_totalCf)) + '</strong> par mois.'
      : 'Your real estate portfolio includes <strong>' + props.length + ' propert' + (props.length > 1 ? 'ies' : 'y') + '</strong> with a total value of <strong>' + f$(_totalVal) + '</strong>. Net equity is <strong>' + f$(_totalEq) + '</strong> (' + _eqPctTotal + '% of value), with a mortgage balance of ' + f$(_totalMort) + '. Net cash flow is <strong>' + fR(Math.round(_totalCf)) + '</strong> per month.');

    props.forEach(function(pr, i) {
      var eq = (pr.val || 0) - (pr.mb || 0);
      var mp = pr.mb > 0 && pr.mr > 0 ? pr.mb * (pr.mr / 12) / (1 - Math.pow(1 + pr.mr / 12, -(pr.ma || 25) * 12)) : pr.mb > 0 && pr.ma > 0 ? pr.mb / (pr.ma * 12) : 0;
      var cf = (pr.rm || 0) - mp - ((pr.pt || 0) + (pr.ins || 0) + (pr.ox || 0)) / 12;
      var _eqPct = pr.val > 0 ? Math.round(eq / pr.val * 100) : 0;
      var _cfClr = cf >= 0 ? C.green : C.red;
      h += '<div class="cd" style="border-left:4px solid ' + (cf >= 0 ? C.green : C.amber) + '">';
      h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
      h += '<div style="font-weight:700;color:' + C.gold + ';font-size:12px">' + F.esc(pr.nm || (fr ? 'Propri\u00e9t\u00e9 ' : 'Property ') + (i + 1)) + '</div>';
      h += '<div style="font-size:10px;color:#888">' + (fr ? '\u00c9quit\u00e9: ' : 'Equity: ') + '<strong style="color:' + C.gold + '">' + _eqPct + '%</strong></div></div>';
      h += '<div class="g4"><table>' +
        F.R(fr ? 'Valeur' : 'Value', '<strong>' + F.fmtCurrency(pr.val) + '</strong>') + F.R(fr ? '\u00c9quit\u00e9' : 'Equity', F.fmtCurrency(eq)) +
        '</table><table>' + F.R(fr ? 'Hypoth\u00e8que' : 'Mortgage', F.fmtCurrency(pr.mb)) + F.R(fr ? 'Paiement' : 'Payment', F.fmtCurrency(Math.round(mp)) + '/m') +
        '</table><table>' + F.R(fr ? 'Loyer' : 'Rent', pr.rm ? F.fmtCurrency(pr.rm) + '/m' : '\u2014') + F.R('Cashflow', '<span style="color:' + _cfClr + '">' + F.fmtCurrency(Math.round(cf)) + '/m</span>') +
        '</table><table>' + F.R(fr ? 'Appr.' : 'Appr.', F.pc(pr.ri) + (fr ? '/an' : '/yr')) + (pr.sa > 0 ? F.R(fr ? 'Vente \u00e0' : 'Sale at', pr.sa + (fr ? ' ans' : ' yrs')) : '') +
        '</table></div></div>';
    });

    // Aggregate KPIs
    if (props.length > 1) {
      h += '<div class="g3" style="margin-top:6px">';
      h += F.KPI('<span class="mono">' + fR(Math.round(_totalEq)) + '</span>', fr ? '\u00c9quit\u00e9 totale' : 'Total equity', C.gold);
      h += F.KPI('<span class="mono" style="color:' + (_totalCf >= 0 ? C.green : C.red) + '">' + fR(Math.round(_totalCf)) + '</span>/m', fr ? 'Cashflow net' : 'Net cashflow', _totalCf >= 0 ? C.green : C.red);
      h += F.KPI('<span class="mono">' + props.length + '</span>', fr ? 'Propri\u00e9t\u00e9s' : 'Properties', C.blue);
      h += '</div>';
    }

    // Post-data narrative — AI supersedes deterministic
    var _salesPlanned = props.filter(function(pr) { return pr.sa > 0; });
    var _reDet = fr
      ? 'L\u2019immobilier repr\u00e9sente une part significative du patrimoine total.' + (_salesPlanned.length > 0 ? ' ' + _salesPlanned.length + ' propri\u00e9t\u00e9' + (_salesPlanned.length > 1 ? 's' : '') + ' ' + (_salesPlanned.length > 1 ? 'sont pr\u00e9vues' : 'est pr\u00e9vue') + ' \u00e0 la vente, ce qui lib\u00e9rera des liquidit\u00e9s pour la retraite.' : ' Aucune vente n\u2019est planifi\u00e9e dans l\u2019horizon de projection.') + (_totalCf < 0 ? ' Le flux de tr\u00e9sorerie n\u00e9gatif de ' + fR(Math.round(Math.abs(_totalCf))) + '/mois doit \u00eatre couvert par d\u2019autres sources de revenus.' : '')
      : 'Real estate represents a significant portion of total wealth.' + (_salesPlanned.length > 0 ? ' ' + _salesPlanned.length + ' propert' + (_salesPlanned.length > 1 ? 'ies are' : 'y is') + ' planned for sale, which would free up liquidity for retirement.' : ' No sales are planned within the projection horizon.') + (_totalCf < 0 ? ' The negative cash flow of ' + fR(Math.round(Math.abs(_totalCf))) + '/mo must be covered by other income sources.' : '');
    h += narrAi(_reDet, d.ai.real_estate_insight, fr, fr ? 'Immobilier \u2014 Analyse IA' : 'Real Estate \u2014 AI Analysis');
    h += secPageEnd();
    return h;
  }

  // === SECTION: RSU ===
  function renderRSU(d, secN) {
    if (!d.R.hasRSU) return '';
    var fr = d.fr, fR = function(v) { return F.fmtMoney(v, fr); };
    var f$ = F.fmtCompact;
    var rsuGrants = d.p.rsuGrants || [];
    var activeGrants = rsuGrants.filter(function(r) { return r.totalShares > 0; });
    var h = secPage();
    h += F.Sec(secN, F.L('rsu', fr), 'sec-rsu');

    // Intro narrative
    var _totalRsuVal = activeGrants.reduce(function(s, r) { return s + r.totalShares * (r.sharePrice || 0); }, 0);
    var _totalRsuTax = activeGrants.reduce(function(s, r) { return s + r.totalShares * (r.sharePrice || 0) * (r.margRate || 0.45) * 0.5; }, 0);
    h += narr(fr
      ? 'Vous d\u00e9tenez <strong>' + activeGrants.length + ' octroi' + (activeGrants.length > 1 ? 's' : '') + ' RSU</strong> d\u2019une valeur totale de <strong>' + f$(_totalRsuVal) + '</strong>. L\u2019imp\u00f4t estim\u00e9 \u00e0 l\u2019acquisition est de <strong>' + f$(Math.round(_totalRsuTax)) + '</strong>, laissant une valeur nette apr\u00e8s imp\u00f4t de ' + f$(Math.round(_totalRsuVal - _totalRsuTax)) + '. Le moment de l\u2019exercice influence le taux marginal applicable.'
      : 'You hold <strong>' + activeGrants.length + ' RSU grant' + (activeGrants.length > 1 ? 's' : '') + '</strong> with a total value of <strong>' + f$(_totalRsuVal) + '</strong>. Estimated tax at vesting is <strong>' + f$(Math.round(_totalRsuTax)) + '</strong>, leaving an after-tax value of ' + f$(Math.round(_totalRsuVal - _totalRsuTax)) + '. The timing of exercise influences the applicable marginal rate.');

    activeGrants.forEach(function(rsu) {
      var vestPerYr = rsu.vestingYears > 0 ? Math.ceil(rsu.totalShares / rsu.vestingYears) : rsu.totalShares;
      var totalVal = rsu.totalShares * (rsu.sharePrice || 0);
      var annualVal = vestPerYr * (rsu.sharePrice || 0);
      h += F.Card(
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-weight:700;color:' + C.gold + ';font-size:12px">' + F.esc(rsu.name || 'RSU') + '</div><div class="mono" style="font-size:11px;color:#888">' + rsu.totalShares + (fr ? ' unit\u00e9s' : ' units') + '</div></div>' +
        '<div class="g4"><table>' + F.R(fr ? 'Prix/unit\u00e9' : 'Price/unit', fR(rsu.sharePrice || 0)) + F.R(fr ? 'Valeur totale' : 'Total value', fR(totalVal)) +
        '</table><table>' + F.R(fr ? 'Acquisition' : 'Vesting', rsu.vestingYears + (fr ? ' ans' : ' yrs')) + F.R(fr ? 'Par ann\u00e9e' : 'Per year', fR(annualVal)) +
        '</table><table>' + F.R(fr ? '\u00c2ge exercice' : 'Exercise age', rsu.exerciseAge || '\u2014') + F.R(fr ? 'Taux marg.' : 'Marg. rate', F.fmtPct(rsu.margRate || 0.45, 1, fr)) +
        '</table><table>' + F.R(fr ? 'Imp\u00f4t estim\u00e9' : 'Est. tax', fR(Math.round(totalVal * (rsu.margRate || 0.45) * 0.5))) + F.R(fr ? 'Net apr\u00e8s imp\u00f4t' : 'After-tax net', fR(Math.round(totalVal * (1 - (rsu.margRate || 0.45) * 0.5)))) +
        '</table></div>'
      );
    });

    // Post-data narrative — AI supersedes deterministic
    var _rsuDet = fr
      ? 'Les RSU sont impos\u00e9es comme un avantage d\u2019emploi \u00e0 l\u2019acquisition, avec un taux d\u2019inclusion de 50% pour les actions de soci\u00e9t\u00e9s publiques admissibles. L\u2019\u00e9talement de l\u2019exercice sur plusieurs ann\u00e9es pourrait r\u00e9duire le taux marginal effectif.'
      : 'RSUs are taxed as an employment benefit at vesting, with a 50% inclusion rate for qualifying public company shares. Spreading the exercise across multiple years could reduce the effective marginal rate.';
    h += narrAi(_rsuDet, d.ai.rsu_insight, fr, fr ? 'RSU \u2014 Analyse IA' : 'RSU \u2014 AI Analysis');
    h += secPageEnd();
    return h;
  }

  // === SECTION: CORPORATION ===
  function renderCorp(d, secN) {
    if (!d.R.ccpc) return '';
    var fr = d.fr, p = d.p, mc = d.mc, exp = d.exp;
    var fR = function(v) { return F.fmtMoney(v, fr); };
    var f$ = F.fmtCompact;
    var _bizRows = (mc && (mc.medRevData || mc.revData)) ? (mc.medRevData || mc.revData) : [];
    var _bizRow = (_bizRows.find(function(r) { return r.age === p.retAge; }) || _bizRows.find(function(r) { return r.age === p.age; }) || _bizRows[0] || {});
    var _bizBal = (_bizRow.corpBal != null) ? _bizRow.corpBal : (p.bizRetainedEarnings || 0);
    var _bizSal = _bizRow.corpSal || 0;
    var _bizDiv = _bizRow.corpDiv || 0;
    var _bizRev = (_bizRow.bizGross != null) ? _bizRow.bizGross : (p.bizRevenue || 0);
    var _bizTaxRate = (_bizRev > 0 && _bizRow.corpTax != null) ? Math.max(0, Math.min(1, _bizRow.corpTax / _bizRev)) : 0.125;
    var _ptInfo = D.PROV_TAX[p.prov || 'QC'] || D.PROV_TAX.QC;
    var _persBase = D.FED_RATES[0] * _ptInfo.abate + _ptInfo.r[0];
    var _intRate = Math.round((_bizTaxRate || 0.125) * 100 + _persBase * 70);

    var h = secPage();
    h += F.Sec(secN, F.L('corp', fr), 'sec-corp');

    // Intro narrative
    h += narr(fr
      ? 'Votre corporation (SPCC) d\u00e9tient un solde de <strong>' + f$(_bizBal || 0) + '</strong> en b\u00e9n\u00e9fices non r\u00e9partis. Le taux d\u2019imposition corporatif observ\u00e9 est de <strong>' + F.fmtPct(_bizTaxRate || 0.125, 1, fr) + '</strong>, et le taux int\u00e9gr\u00e9 (corporatif + personnel) se situe \u00e0 environ <strong>' + _intRate + '%</strong>. La strat\u00e9gie d\u2019extraction combine salaire (' + fR(_bizSal || 0) + ') et dividendes (' + fR(_bizDiv || 0) + ').'
      : 'Your corporation (CCPC) holds <strong>' + f$(_bizBal || 0) + '</strong> in retained earnings. The observed corporate tax rate is <strong>' + F.fmtPct(_bizTaxRate || 0.125, 1, fr) + '</strong>, and the integrated rate (corporate + personal) is approximately <strong>' + _intRate + '%</strong>. The extraction strategy combines salary (' + fR(_bizSal || 0) + ') and dividends (' + fR(_bizDiv || 0) + ').');

    h += '<div class="g3" style="margin-bottom:8px">';
    h += F.KPI('<span class="mono">' + fR(_bizBal || 0) + '</span>', fr ? 'Solde corporatif' : 'Corp. balance', C.purple);
    h += F.KPI('<span class="mono">' + fR(_bizSal || 0) + '</span>', fr ? 'Salaire vers\u00e9' : 'Salary paid', C.blue);
    h += F.KPI('<span class="mono">' + fR(_bizDiv || 0) + '</span>', fr ? 'Dividendes' : 'Dividends', C.green);
    h += '</div>';
    h += F.Card('<table>' +
      F.R(fr ? 'Revenus corporatifs' : 'Corp. revenue', fR(_bizRev || 0)) +
      F.R(fr ? 'Taux d\'imposition' : 'Tax rate', F.fmtPct(_bizTaxRate || 0.125, 1, fr)) +
      F.R('LCGE', fR(1250000)) +
      F.R(fr ? 'Strat\u00e9gie de sortie' : 'Exit strategy', (p.bizSaleAge || 0) > 0 ? (fr ? 'Vente \u00e0 ' : 'Sale at ') + p.bizSaleAge + (fr ? ' ans' : ' yrs') : (fr ? 'Liquidation progressive' : 'Gradual extraction')) +
      '</table>');

    // Post-data narrative — AI supersedes deterministic
    var _corpDet = fr
      ? 'Le taux int\u00e9gr\u00e9 de ' + _intRate + '% signifie que chaque dollar de revenu corporatif, apr\u00e8s imp\u00f4t corporatif et personnel, laisse environ ' + (100 - _intRate) + '\u00a2 net. L\u2019exon\u00e9ration LCGE de 1 250 000$ est disponible lors de la vente d\u2019actions admissibles d\u2019une SPCC active.' + ((p.bizSaleAge || 0) > 0 ? ' Une vente est pr\u00e9vue \u00e0 ' + p.bizSaleAge + ' ans.' : ' La strat\u00e9gie privil\u00e9gie une extraction progressive par salaire et dividendes.')
      : 'The integrated rate of ' + _intRate + '% means each dollar of corporate income, after corporate and personal tax, leaves approximately ' + (100 - _intRate) + '\u00a2 net. The $1,250,000 LCGE exemption is available when selling qualifying shares of an active CCPC.' + ((p.bizSaleAge || 0) > 0 ? ' A sale is planned at age ' + p.bizSaleAge + '.' : ' The strategy favors gradual extraction through salary and dividends.');
    h += narrAi(_corpDet, d.ai.corp_insight, fr, fr ? 'Corporation \u2014 Analyse IA' : 'Corporation \u2014 AI Analysis');
    h += secPageEnd();
    return h;
  }

  // === SECTION: DEBTS ===
  function renderDebts(d, secN) {
    if (!d.R.debt) return '';
    var fr = d.fr, debts = d.p.debts || [], props = d.p.props || [];
    var fR = function(v) { return F.fmtMoney(v, fr); };
    var f$ = F.fmtCompact;
    var h = secPage();
    h += F.Sec(secN, F.L('debt', fr), 'sec-debt');
    var _totalDebt = 0, _totalPay = 0;
    var _activeDebts = debts.filter(function(dd) { return (dd.balance || dd.bal || 0) > 0; });

    // Compute totals first for narrative
    _activeDebts.forEach(function(dd) { _totalDebt += (dd.balance || dd.bal || 0); _totalPay += (dd.payment || dd.pay || 0); });
    var _debtToSavings = d.totalBal > 0 ? Math.round(_totalDebt / d.totalBal * 100) : 0;
    var _netWorth = d.totalBal - _totalDebt + props.reduce(function(s, p2) { return s + (p2 && p2.on ? (p2.val || 0) - (p2.mb || 0) : 0); }, 0);

    // Intro narrative
    h += narr(fr
      ? 'Vous avez <strong>' + _activeDebts.length + ' dette' + (_activeDebts.length > 1 ? 's' : '') + ' active' + (_activeDebts.length > 1 ? 's' : '') + '</strong> totalisant <strong>' + f$(_totalDebt) + '</strong>, avec des paiements mensuels de <strong>' + fR(_totalPay) + '</strong>. Le ratio dette/\u00e9pargne est de <strong>' + _debtToSavings + '%</strong>. L\u2019avoir net (incluant l\u2019\u00e9quit\u00e9 immobili\u00e8re) est de <strong>' + f$(_netWorth) + '</strong>.'
      : 'You have <strong>' + _activeDebts.length + ' active debt' + (_activeDebts.length > 1 ? 's' : '') + '</strong> totaling <strong>' + f$(_totalDebt) + '</strong>, with monthly payments of <strong>' + fR(_totalPay) + '</strong>. The debt-to-savings ratio is <strong>' + _debtToSavings + '%</strong>. Net worth (including real estate equity) is <strong>' + f$(_netWorth) + '</strong>.');

    // Reset for table computation
    _totalDebt = 0; _totalPay = 0;

    h += F.CopyBtn('rpt-t-debt');
    h += '<table id="rpt-t-debt" class="tbl"><thead><tr>';
    h += '<th style="text-align:left">' + (fr ? 'Description' : 'Description') + '</th><th>' + (fr ? 'Solde' : 'Balance') + '</th><th>' + (fr ? 'Taux' : 'Rate') + '</th>';
    h += '<th>' + (fr ? 'Paiement/m' : 'Payment/mo') + '</th><th>' + (fr ? 'Mois restants' : 'Months left') + '</th></tr></thead><tbody>';
    debts.forEach(function(dd) {
      var bal = dd.balance || dd.bal || 0;
      var rate = dd.rate || dd.r || 0;
      var pay = dd.payment || dd.pay || 0;
      var months;
      if (pay > 0 && rate > 0) {
        var _mr = rate / 12;
        var _logArg = 1 - _mr * bal / pay;
        months = _logArg > 0 ? Math.ceil(-Math.log(_logArg) / Math.log(1 + _mr)) : 999;
      } else {
        months = pay > 0 ? Math.ceil(bal / pay) : 0;
      }
      _totalDebt += bal; _totalPay += pay;
      if (bal <= 0) return;
      h += '<tr><td style="font-family:DM Sans,sans-serif">' + F.esc(dd.name || dd.desc || (fr ? 'Dette' : 'Debt')) + '</td>';
      h += '<td>' + fR(bal) + '</td><td>' + F.fmtPct(rate, 1, fr) + '</td>';
      h += '<td>' + fR(pay) + '</td><td>' + months + '</td></tr>';
    });
    h += '</tbody></table>';

    h += '<div class="g3" style="margin-top:8px">';
    h += F.KPI('<span class="mono">' + fR(_totalDebt) + '</span>', fr ? 'Dette totale' : 'Total debt', C.red);
    h += F.KPI('<span class="mono">' + fR(_totalPay) + '</span>/m', fr ? 'Paiements mensuels' : 'Monthly payments', C.amber);
    h += F.KPI('<span class="mono">' + fR(_netWorth) + '</span>', fr ? 'Avoir net' : 'Net worth', _netWorth > 0 ? C.green : C.red);
    h += '</div>';

    // Post-data narrative — AI supersedes deterministic
    var _highRateDebts = _activeDebts.filter(function(dd) { return (dd.rate || dd.r || 0) > 0.08; });
    var _debtDet = (fr
      ? (_highRateDebts.length > 0 ? _highRateDebts.length + ' dette' + (_highRateDebts.length > 1 ? 's' : '') + ' affiche' + (_highRateDebts.length > 1 ? 'nt' : '') + ' un taux sup\u00e9rieur \u00e0 8%, ce qui \u00e9rode le patrimoine plus rapidement que le rendement attendu des placements. ' : '') + 'Les paiements mensuels de ' + fR(_totalPay) + ' repr\u00e9sentent ' + (d.totalSpM > 0 ? Math.round(_totalPay / d.totalSpM * 100) : 0) + '% des d\u00e9penses mensuelles pr\u00e9vues.'
      : (_highRateDebts.length > 0 ? _highRateDebts.length + ' debt' + (_highRateDebts.length > 1 ? 's' : '') + ' carr' + (_highRateDebts.length > 1 ? 'y' : 'ies') + ' a rate above 8%, eroding wealth faster than the expected investment return. ' : '') + 'Monthly payments of ' + fR(_totalPay) + ' represent ' + (d.totalSpM > 0 ? Math.round(_totalPay / d.totalSpM * 100) : 0) + '% of planned monthly spending.');

    if (!d.ai.debt_insight && _totalDebt > d.totalBal * 0.5) {
      h += F.Warning(fr ? 'Le ratio d\'endettement (' + _debtToSavings + '% de l\'\u00e9pargne) est \u00e9lev\u00e9. Prioriser le remboursement des dettes \u00e0 taux \u00e9lev\u00e9 pourrait am\u00e9liorer la trajectoire du patrimoine.' : 'The debt ratio (' + _debtToSavings + '% of savings) is high. Prioritizing high-rate debt repayment could improve the wealth trajectory.');
    }

    h += narrAi(_debtDet, d.ai.debt_insight, fr, fr ? 'Dettes \u2014 Analyse IA' : 'Debts \u2014 AI Analysis');
    h += secPageEnd();
    return h;
  }

  // === SECTION: STRATEGIES (SAM + recos) ===
  function renderStrategies(d, secN) {
    var fr = d.fr, exp = d.exp, ai = d.ai;
    var fR = function(v) { return F.fmtMoney(v, fr); };
    var f$ = F.fmtCompact;
    var samResults = d.p.samResults || [];
    var _recos = window._recos || [];
    if (samResults.length === 0 && _recos.length === 0) return '';

    var h = secPage();
    h += F.Sec(secN, F.L('strategies', fr), 'sec-strategies');

    // Intro narrative
    var stratCount = samResults.length > 0 ? samResults.filter(function(s) { return s.score != null; }).length : _recos.length;
    var _samCards = samResults.filter(function(s) { return s.score != null; }).sort(function(a, b) { return (b.score || 0) - (a.score || 0); });
    var _samTotal = _samCards.filter(function(s) { return s.score > 0; }).slice(0, 3).reduce(function(sum, s) { return sum + (s.score || 0); }, 0);
    h += narr(fr
      ? 'L\u2019analyse a identifi\u00e9 <strong>' + stratCount + ' strat\u00e9gie' + (stratCount > 1 ? 's' : '') + '</strong> pouvant influencer la trajectoire de votre patrimoine.' + (_samTotal > 0 ? ' Les 3 premi\u00e8res strat\u00e9gies combin\u00e9es pourraient g\u00e9n\u00e9rer un gain potentiel de <strong>' + f$(Math.round(_samTotal)) + '</strong> sur le patrimoine final.' : '') + ' Chaque strat\u00e9gie est class\u00e9e par impact potentiel.'
      : 'The analysis identified <strong>' + stratCount + ' strateg' + (stratCount > 1 ? 'ies' : 'y') + '</strong> that could influence your wealth trajectory.' + (_samTotal > 0 ? ' The top 3 strategies combined could generate a potential gain of <strong>' + f$(Math.round(_samTotal)) + '</strong> on final wealth.' : '') + ' Each strategy is ranked by potential impact.');

    if (samResults.length > 0) {
      _samCards.slice(0, exp ? 8 : 5).forEach(function(s) {
        var priLvl = s.score > 50000 ? 3 : s.score > 10000 ? 2 : 1;
        h += F.RecoCard({
          priority: priLvl,
          title: s.title || s.name || '',
          impact: s.score > 0 ? '+' + fR(Math.round(s.score)) : '',
          body: s.description || s.body || '',
          meaning: s.explanation || ''
        });
      });
      if (_samTotal > 0) {
        h += F.Insight(fr ? 'Si les ' + Math.min(3, _samCards.filter(function(s) { return s.score > 0; }).length) + ' premi\u00e8res strat\u00e9gies \u00e9taient appliqu\u00e9es, les projections indiquent un gain potentiel de <strong>' + fR(Math.round(_samTotal)) + '</strong> sur le patrimoine final.' : 'If the top ' + Math.min(3, _samCards.filter(function(s) { return s.score > 0; }).length) + ' strategies were applied, projections indicate a potential gain of <strong>' + fR(Math.round(_samTotal)) + '</strong> on final wealth.');
      }
    } else if (_recos.length > 0) {
      var maxR = exp ? _recos.length : 5;
      _recos.slice(0, maxR).forEach(function(r) {
        var cls = r.pri === 3 ? 'alert' : r.pri === 2 ? 'warning' : 'insight';
        h += '<div class="callout callout-' + cls + '"><div style="display:flex;justify-content:space-between;align-items:center"><strong>' + F.esc(r.icon) + ' ' + F.esc(r.title) + '</strong><span class="mono" style="font-size:10px;padding:2px 8px;border-radius:8px;background:rgba(0,0,0,.05)">' + F.esc(r.impact) + '</span></div><div style="font-size:11px;margin-top:3px;color:#333">' + F.esc(r.body) + '</div></div>';
      });
    }

    // AI strengths/vulnerabilities (expert)
    if (exp && ai.strengths) {
      h += '<div class="g2" style="margin-top:8px">';
      h += '<div class="callout callout-ai"><span class="ai-badge">' + (fr ? 'Forces' : 'Strengths') + '</span>';
      ai.strengths.forEach(function(s) { h += '<div style="margin:4px 0;font-size:10px">\u2713 ' + F.esc(s) + '</div>'; });
      h += '</div><div class="callout callout-ai" style="border-left-color:' + C.red + ';background:#fff5f5;border-color:#e8c8c8"><span class="ai-badge" style="background:#fde8e8;color:' + C.red + '">' + (fr ? 'Vuln\u00e9rabilit\u00e9s' : 'Vulnerabilities') + '</span>';
      (ai.vulnerabilities || []).forEach(function(v) { h += '<div style="margin:4px 0;font-size:10px">\u26a0 ' + F.esc(v) + '</div>'; });
      h += '</div></div>';
    }

    // Cost of inaction callout
    if (d._taxAlpha !== null && d._taxAlpha > 0) {
      h += F.CalloutKPI(
        fr ? 'Co\u00fbt de l\u2019inaction' : 'Cost of Inaction',
        f$(Math.round(d._taxAlpha)),
        fr ? 'Montant suppl\u00e9mentaire en imp\u00f4ts viagers si aucune optimisation fiscale n\u2019est appliqu\u00e9e.' : 'Additional lifetime tax if no tax optimization is applied.',
        'callout-inaction'
      );
    }

    // Post-data narrative — AI supersedes deterministic
    var _stratDet = fr
      ? 'Les strat\u00e9gies ci-dessus sont observ\u00e9es \u00e0 partir des donn\u00e9es du moteur de calcul. Leur impact est estim\u00e9 en comparant le sc\u00e9nario de base au sc\u00e9nario modifi\u00e9. L\u2019application r\u00e9elle de ces strat\u00e9gies d\u00e9pend de votre situation personnelle et devrait \u00eatre valid\u00e9e avec un planificateur financier.'
      : 'The strategies above are observed from the calculation engine data. Their impact is estimated by comparing the baseline scenario to the modified scenario. Actual implementation depends on your personal situation and should be validated with a financial planner.';
    h += narrAi(_stratDet, ai.best_move_explainer, fr, fr ? 'Strat\u00e9gies \u2014 Analyse IA' : 'Strategies \u2014 AI Analysis');
    h += secPageEnd();
    return h;
  }

  // === SECTION: RISK & SENSITIVITY (Expert) ===
  function renderRisk(d, secN) {
    if (!d.exp) return '';
    var fr = d.fr, mc = d.mc, p = d.p, revData = d.revData;
    var f$ = F.fmtCompact, fR = function(v) { return F.fmtMoney(v, fr); };
    var h = secPage();
    h += F.Sec(secN, F.L('risk', fr), 'sec-risk');

    // Intro narrative
    var _p25W = mc.rP25F || mc.p25F || mc.rVar5 || mc.var5 || 0;
    var _p75W = mc.rP75F || mc.p75F || 0;
    var _spread25 = _p75W - _p25W;
    h += narr(fr
      ? 'L\u2019analyse de risque mesure la fourchette des r\u00e9sultats possibles. Dans un sc\u00e9nario prudent (P25), le patrimoine final serait de <strong>' + f$(_p25W) + '</strong>, contre <strong>' + f$(_p75W) + '</strong> dans un sc\u00e9nario favorable (P75). Cette fourchette de <strong>' + f$(Math.round(_spread25)) + '</strong> refl\u00e8te l\u2019incertitude normale li\u00e9e aux march\u00e9s, \u00e0 l\u2019inflation et \u00e0 la long\u00e9vit\u00e9.'
      : 'Risk analysis measures the range of possible outcomes. In a cautious scenario (P25), final wealth would be <strong>' + f$(_p25W) + '</strong>, compared to <strong>' + f$(_p75W) + '</strong> in a favorable scenario (P75). This range of <strong>' + f$(Math.round(_spread25)) + '</strong> reflects normal uncertainty from markets, inflation, and longevity.');

    h += '<div class="g4" style="margin-bottom:8px">';
    h += F.KPI('<span class="mono">' + f$(_p25W) + '</span>', fr ? 'Sc\u00e9nario prudent (P25)' : 'Cautious (P25)', C.amber);
    h += F.KPI('<span class="mono">' + f$(_p75W) + '</span>', fr ? 'Sc\u00e9nario favorable (P75)' : 'Favorable (P75)', C.green);
    h += F.KPI('<span class="mono">' + ((mc.p5Ruin || 999) >= 200 ? (fr ? 'Jamais' : 'Never') : mc.p5Ruin + (fr ? ' ans' : ' yrs')) + '</span>', fr ? 'Durabilit\u00e9 \u00e9pargne' : 'Savings durability', (mc.p5Ruin || 999) >= 200 ? C.green : C.amber);
    h += F.KPI('<span class="mono">' + f$(Math.round(_spread25)) + '</span>', fr ? 'Fourchette P25\u2013P75' : 'P25\u2013P75 range', C.blue);
    h += '</div>';

    // Guyton-Klinger
    if (mc.gkOn) {
      h += F.Card('<div style="font-weight:700;color:' + C.gold + ';font-size:12px;margin-bottom:6px">Guyton-Klinger</div><div class="g4"><table>' +
        F.R(fr ? 'Baisses moy.' : 'Avg cuts', Math.round(mc.gkAvgCuts || 0)) + F.R(fr ? 'Hausses moy.' : 'Avg raises', Math.round(mc.gkAvgRaises || 0)) +
        '</table><table>' + F.R(fr ? 'Facteur min.' : 'Min factor', ((mc.gkAvgMinFactor || 1) * 100).toFixed(0) + '%') + F.R(fr ? 'S\u00e9rie max' : 'Max streak', Math.round(mc.gkAvgMaxStreak || 0)) +
        '</table></div>');
    }

    // Risk observations
    var _riskObs = [];
    if (_p25W > d.totalBal * 2) _riskObs.push(fr ? 'M\u00eame dans un sc\u00e9nario prudent (P25), le patrimoine (' + f$(_p25W) + ') demeure sup\u00e9rieur au double du capital initial \u2014 une marge de s\u00e9curit\u00e9 confortable.' : 'Even in a cautious scenario (P25), wealth (' + f$(_p25W) + ') remains above double the initial capital \u2014 a comfortable safety margin.');
    else if (_p25W > 0) _riskObs.push(fr ? 'Dans un sc\u00e9nario prudent (P25), le patrimoine final serait de ' + f$(_p25W) + ' \u2014 positif mais avec une marge r\u00e9duite.' : 'In a cautious scenario (P25), final wealth would be ' + f$(_p25W) + ' \u2014 positive but with a reduced margin.');
    else _riskObs.push(fr ? 'Dans un sc\u00e9nario prudent, le patrimoine pourrait \u00eatre enti\u00e8rement utilis\u00e9. Les revenus gouvernementaux (' + F.qppLabel(p.prov, fr) + ' + PSV) continueraient d\u2019\u00eatre vers\u00e9s.' : 'In a cautious scenario, savings could be fully drawn down. Government income (' + F.qppLabel(p.prov, fr) + ' + OAS) would continue regardless.');
    var _seqRisk = revData.filter(function(r) { return r.age >= p.retAge && r.age <= p.retAge + 5; }).reduce(function(s, r) { return s + (r.ret || 0); }, 0);
    if (_seqRisk > d.totalBal * 0.25) _riskObs.push(fr ? 'Les retraits cumul\u00e9s des 5 premi\u00e8res ann\u00e9es (' + F.fmtCurrency(Math.round(_seqRisk)) + ') repr\u00e9sentent ' + Math.round(_seqRisk / d.totalBal * 100) + '% du capital, exposant au risque de s\u00e9quence de rendements.' : 'Cumulative withdrawals in the first 5 years (' + F.fmtCurrency(Math.round(_seqRisk)) + ') represent ' + Math.round(_seqRisk / d.totalBal * 100) + '% of capital, creating sequence-of-returns risk.');
    if (_riskObs.length > 0) {
      h += '<div class="cd" style="font-size:11px;line-height:1.8;color:#444">';
      _riskObs.forEach(function(o) { h += '<div style="margin-bottom:4px">\u2022 ' + o + '</div>'; });
      h += '</div>';
    }

    // Stress tests
    if (d.R.hasStress) {
      var strs = Array.isArray(p.strs) ? p.strs : (p.strs ? Object.values(p.strs) : []);
      h += '<div style="font-size:11px;font-weight:600;color:' + C.gold + ';text-transform:uppercase;letter-spacing:.5px;margin:12px 0 6px">' + (fr ? 'Tests de stress' : 'Stress Tests') + '</div>';
      h += F.CopyBtn('rpt-t-stress');
      h += '<table id="rpt-t-stress" class="tbl"><thead><tr>';
      h += '<th style="text-align:left">' + (fr ? 'Sc\u00e9nario' : 'Scenario') + '</th><th>' + (fr ? 'Succ\u00e8s' : 'Success') + '</th><th>P50 final</th><th>Impact</th></tr></thead><tbody>';
      strs.forEach(function(st) {
        if (!st) return;
        var succBase = d.succVal != null ? d.succVal : (st.succ || 0);
        var succDelta = st.succ != null ? Math.round((st.succ - succBase) * 100) : 0;
        var clr = succDelta >= 0 ? C.green : succDelta > -10 ? C.amber : C.red;
        h += '<tr><td style="font-family:DM Sans,sans-serif">' + F.esc(st.name || st.label || '') + '</td>';
        h += '<td style="color:' + clr + ';font-weight:700">' + (st.succ != null ? Math.round(st.succ * 100) + '%' : '\u2014') + '</td>';
        h += '<td>' + (st.medF != null ? fR(st.medF) : '\u2014') + '</td>';
        h += '<td style="color:' + clr + '">' + (succDelta >= 0 ? '+' : '') + succDelta + ' pts</td></tr>';
      });
      h += '</tbody></table>';
    }

    // Sensitivity tornado
    if (d.sensData.length > 0) {
      h += Ch.svgTornado(d.sensData, { title: fr ? 'Sensibilit\u00e9 des param\u00e8tres' : 'Parameter Sensitivity' });
    }

    var _riskDet = fr
      ? 'La fourchette P25\u2013P75 de <strong>' + f$(Math.round(_spread25)) + '</strong> repr\u00e9sente la zone o\u00f9 se situe votre patrimoine dans la moiti\u00e9 des sc\u00e9narios simul\u00e9s. Plus cette fourchette est \u00e9troite, plus le r\u00e9sultat est pr\u00e9visible.'
      : 'The P25\u2013P75 range of <strong>' + f$(Math.round(_spread25)) + '</strong> represents the zone where your wealth falls in half of all simulated scenarios. A narrower range means more predictable outcomes.';
    h += narrAi(_riskDet, d.ai.riskInsight || d.ai.risk_plain_language, fr, fr ? 'Risque \u2014 Analyse IA' : 'Risk \u2014 AI Analysis');
    h += secPageEnd();
    return h;
  }

  // === SECTION: METHODOLOGY ===
  function renderMethodology(d, secN) {
    var fr = d.fr, exp = d.exp, p = d.p, mc = d.mc;
    var _isQC = d._isQC;
    var h = secPage();
    h += F.Sec(secN, F.L('methodology', fr), 'sec-methodology');

    h += '<div class="meth-p">' + (fr ? 'Cette projection utilise ' + (p.nSim || 5000) + ' simulations Monte Carlo ind\u00e9pendantes. Chaque simulation g\u00e9n\u00e8re des trajectoires al\u00e9atoires de rendements (actions et obligations), d\'inflation et de mortalit\u00e9, puis calcule l\'\u00e9volution du patrimoine ann\u00e9e par ann\u00e9e en appliquant les r\u00e8gles fiscales, de d\u00e9caissement et de prestations gouvernementales.' : 'This projection uses ' + (p.nSim || 5000) + ' independent Monte Carlo simulations. Each simulation generates random trajectories for returns (equities and bonds), inflation, and mortality, then calculates year-by-year wealth evolution applying tax rules, withdrawal strategies, and government benefit calculations.') + '</div>';
    h += '<div class="meth-p"><strong>' + (fr ? 'Hypoth\u00e8ses de march\u00e9' : 'Market assumptions') + ':</strong> ' + (fr ? 'Rendement actions ' : 'Equity return ') + F.pc(p.eqRetS || 0.07) + (fr ? ', obligations ' : ' / bonds ') + F.pc(p.bndRetS || 0.035) + '. ' + (p.fatT ? 't-Student (df=5, ' + (fr ? 'queues \u00e9paisses' : 'fat tails') + ')' : 'Normal') + '. ' + (fr ? 'Corr\u00e9lation Cholesky 5\u00d75 (DMS 2024). ' : 'Cholesky 5\u00d75 correlation (DMS 2024). ') + (p.stochInf ? (fr ? 'Inflation stochastique \u00b11.5%.' : 'Stochastic inflation \u00b11.5%.') : (fr ? 'Inflation fixe ' : 'Fixed inflation ') + F.pc(p.inf) + '.') + '</div>';
    h += '<div class="meth-p"><strong>' + (fr ? 'Mortalit\u00e9' : 'Mortality') + ':</strong> ' + (fr ? 'Tables CPM-2023 (ICA). Horizon d\u00e9terministe: ' : 'CPM-2023 tables (CIA). Deterministic horizon: ') + (p.deathAge || 90) + (fr ? ' ans. Esp\u00e9rance de vie CPM: H=85.5, F=87.4 (\u00e0 65 ans).' : ' yrs. CPM life expectancy: M=85.5, F=87.4 (at 65).') + '</div>';
    h += '<div class="meth-p"><strong>' + (fr ? 'Fiscalit\u00e9' : 'Taxation') + ':</strong> ' + (fr ? 'Bar\u00e8mes f\u00e9d\u00e9raux et provinciaux 2026 index\u00e9s. Cr\u00e9dits pour revenu de pension (2\u00a0000$), cr\u00e9dit en raison de l\'\u00e2ge (8\u00a0790$), bonification PSV 75+ (10%). Inclusion des gains en capital: ' : 'Federal and provincial 2026 brackets indexed. Pension credit ($2,000), age credit ($8,790), OAS 75+ bonus (10%). Capital gains inclusion: ') + (p.cgIncLo || 0.5) * 100 + '% / ' + ((p.cgIncHi || 0.6667) * 100).toFixed(0) + '%.</div>';

    if (exp) {
      h += '<div class="meth-p"><strong>' + (fr ? 'Param\u00e8tres avanc\u00e9s' : 'Advanced parameters') + ':</strong> MER REER ' + F.pc(p.merR) + ', CELI ' + F.pc(p.merT) + ', NR ' + F.pc(p.merN) + '. ' + (fr ? 'Alloc. actions: REER ' : 'Equity alloc: RRSP ') + Math.round((p.allocR || 0.6) * 100) + '%, CELI ' + Math.round((p.allocT || 0.8) * 100) + '%, NR ' + Math.round((p.allocN || 0.5) * 100) + '%. ' + (fr ? 'Courbe de d\u00e9penses (Go/Slow/No): ' : 'Spending curve (Go/Slow/No): ') + Math.round((p.goP || 1) * 100) + '/' + Math.round((p.slP || 0.85) * 100) + '/' + Math.round((p.noP || 0.7) * 100) + '%.</div>';
    }

    // Feature checklist
    h += '<div class="meth-grid">';
    var _ck = [
      ['Cholesky 5\u00d75', true], ['CPM-2023', true], [p.fatT ? (fr ? 'Queues \u00e9paisses' : 'Fat tails') : 'Normal', true],
      [(fr ? 'MER d\u00e9duits' : 'MER deducted'), d.merWt > 0], [p.stochInf ? (fr ? 'Inflation stoch.' : 'Stoch. inflation') : (fr ? 'Inflation fixe' : 'Fixed inflation'), true],
      [(fr ? 'Paliers index\u00e9s' : 'Indexed brackets'), true], ['SRG/GIS', true], [_isQC ? 'RRQ2' : 'CPP2', true],
      ['Meltdown', !!p.melt], [(fr ? 'Fractionnement' : 'Splitting'), !!p.split], [(fr ? 'Mortalit\u00e9 CPM-2023' : 'CPM-2023 mortality'), true],
      ['Guyton-Klinger', !!(mc && mc.gkOn)],
      [(fr ? 'Vente forc\u00e9e immo.' : 'Forced RE sale'), (p.props || []).some(function(pr) { return pr && pr.on; })],
      ['CELIAPP/FHSA', (p.fhsaBal || 0) > 0]
    ];
    _ck.forEach(function(c) { h += '<div class="meth-item"><span class="meth-check">' + (c[1] ? '\u2713' : '\u2717') + '</span>' + c[0] + '</div>'; });
    h += '</div>';

    // AI Disclosure
    h += '<div style="background:#f0f4ff;border:1px solid #c0d0f0;border-radius:8px;padding:12px 16px;margin:16px 0">';
    h += '<div style="font-size:10px;font-weight:600;color:#4060b0;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">' + (fr ? 'Intelligence artificielle' : 'Artificial Intelligence') + '</div>';
    h += '<div style="font-size:11px;color:#555;line-height:1.6">' + (fr ? 'Certaines observations de ce rapport ont \u00e9t\u00e9 assist\u00e9es par l\u2019intelligence artificielle (Claude, Anthropic). Le mod\u00e8le AI observe les donn\u00e9es du moteur de calcul et formule des observations en langage clair. Les calculs sous-jacents (fiscalit\u00e9, Monte Carlo, mortalit\u00e9) sont enti\u00e8rement d\u00e9terministes et ne d\u00e9pendent pas de l\u2019AI.' : 'Some observations in this report were assisted by artificial intelligence (Claude, Anthropic). The AI model observes data from the calculation engine and formulates observations in plain language. The underlying calculations (tax, Monte Carlo, mortality) are entirely deterministic and do not depend on AI.') + '</div></div>';

    h += secPageEnd();
    return h;
  }

  // === FOOTER ===
  function renderFooter(d) {
    var fr = d.fr, p = d.p;
    var today = F.fmtDate(null, fr);
    var h = '';

    // Notes
    if (d.client.notes) {
      h += '<div style="margin-top:10px"><div style="font-size:11px;font-weight:700;color:' + C.gold + ';margin-bottom:4px">Notes</div><div class="cd" style="white-space:pre-line;font-size:10px;line-height:1.7">' + F.esc(d.client.notes) + '</div></div>';
    }

    // Disclaimer
    h += '<div class="disclaimer"><strong>\u26a0 ' + (fr ? 'Mise en garde' : 'Disclaimer') + '</strong><br/>' + (fr ? 'Ce rapport est g\u00e9n\u00e9r\u00e9 \u00e0 des fins \u00e9ducatives et informationnelles uniquement. Il ne constitue pas un conseil financier, fiscal ou juridique. Les projections sont bas\u00e9es sur des simulations Monte Carlo avec des hypoth\u00e8ses qui peuvent ne pas se r\u00e9aliser. Consultez un planificateur financier certifi\u00e9 (Pl. Fin.) ou un conseiller en placement inscrit avant toute d\u00e9cision financi\u00e8re.' : 'This report is generated for educational and informational purposes only. It does not constitute financial, tax, or legal advice. Projections are based on Monte Carlo simulations with assumptions that may not materialize. Consult a certified financial planner (CFP) or registered investment advisor before making financial decisions.') + '</div>';

    h += '<div class="ft">BuildFi ' + (fr ? 'Rapport d\u00e9taill\u00e9' : 'Detailed Report') + ' \u00b7 ' + today + ' \u00b7 ' + F.VERSION + ' \u00b7 <span class="mono">' + (p.nSim || 5000) + '</span> simulations MC</div>';
    h += '<div class="page-footer print-only" style="position:fixed;bottom:0;left:0;right:0;text-align:center;font-size:8px;color:#aaa;padding:4px">BuildFi Technologies inc. \u2014 buildfi.ca \u00b7 ' + (fr ? 'Projections. Ne constitue pas un conseil financier.' : 'Projections. Does not constitute financial advice.') + '</div>';
    return h;
  }

  // ══════════════════════════════════════════════════════════════
  // MAIN ORCHESTRATOR
  // ══════════════════════════════════════════════════════════════

  window.buildReport = function(data) {
    _exportMode = !!(data && data.exportMode);
    var d = D.buildReportPayload(data);

    // Empty / loading states
    if (d.empty) {
      if (d.mcComputing) {
        return '<div style="padding:30px;text-align:center;font-family:DM Sans,sans-serif"><div style="font-size:18px;font-weight:600;color:' + C.gold + ';margin-bottom:10px">' + (d.fr ? 'Simulation en cours...' : 'Simulation running...') + '</div><div style="font-size:13px;color:#888">' + (d.fr ? 'Les r\u00e9sultats Monte Carlo appara\u00eetront sous peu.' : 'Monte Carlo results will appear shortly.') + '</div></div>';
      }
      return '';
    }

    // Invalid params guard — only reject truly broken configs (deathAge <= retAge for non-retired)
    var p = d.p;
    if (p.age < p.retAge && (p.deathAge || 90) <= p.retAge) {
      return '<div style="padding:40px;text-align:center;color:' + C.red + ';font-size:16px;font-family:DM Sans,sans-serif">' + (d.fr ? 'Param\u00e8tres invalides. L\u2019horizon doit d\u00e9passer l\u2019\u00e2ge de retraite.' : 'Invalid parameters. Horizon must exceed retirement age.') + '</div>';
    }

    // Build HTML
    var rl = d.rl;
    var h = '<!DOCTYPE html><html lang="' + rl + '"><head><meta charset="utf-8"><title>' + (d.fr ? 'Plan de retraite' : 'Retirement Plan') + ' \u2014 ' + F.esc(d.client.name || 'Client') + '</title><style>' + css + '</style></head><body>';
    h += copyScript;

    // Cover page
    h += renderCover(d);

    // Main report header + grade
    h += renderHeader(d);
    h += renderGrade(d);

    // ── Phase detection for section ordering ──
    var isDecum = d.R.phase === 'decum';
    // Pre-checks for conditional sections
    var _gisCheck = d.revData.filter(function(r) { return r.age >= 65 && (r.srg || r.gis || 0) > 0; });
    var _hasStrats = d.R.hasSAM || (window._recos && window._recos.length > 0);
    // Succession pre-check (skip if all zeros)
    var _grossEstateCheck = (d.mc.medEstateNet || 0) + (d.mc.medEstateTax || 0) + (d.mc.p5EstateNet || 0);

    // ── Build TOC sections array (pre-scan which sections will render) ──
    var tocSections = [];
    var _tocN = 0;
    tocSections.push({ n: '\u2606', id: 'sec-assessment', label: F.L('page_zero', d.fr) });
    _tocN++; tocSections.push({ n: _tocN, id: 'sec-diagnostic', label: F.L('diagnostic', d.fr) });
    _tocN++; tocSections.push({ n: _tocN, id: 'sec-profile', label: F.L('profile', d.fr) });
    if (d.R.hasFamily) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-family', label: F.L('family', d.fr) }); }
    if (d.R.hasGoals) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-goals', label: F.L('goals', d.fr) }); }
    // DECUM: revenue before projection
    if (isDecum) {
      _tocN++; tocSections.push({ n: _tocN, id: 'sec-revenue', label: F.L('revenue', d.fr) });
      _tocN++; tocSections.push({ n: _tocN, id: 'sec-projection', label: F.L('projection', d.fr) });
    } else {
      _tocN++; tocSections.push({ n: _tocN, id: 'sec-projection', label: F.L('projection', d.fr) });
      _tocN++; tocSections.push({ n: _tocN, id: 'sec-revenue', label: F.L('revenue', d.fr) });
    }
    if (_hasStrats) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-strategies', label: F.L('strategies', d.fr) }); }
    _tocN++; tocSections.push({ n: _tocN, id: 'sec-tax', label: F.L('tax', d.fr) });
    if (_gisCheck.length > 0) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-gis', label: F.L('gis', d.fr) }); }
    if (d.R.hasMeltdown) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-meltdown', label: F.L('meltdown', d.fr) }); }
    if (_grossEstateCheck >= 1000) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-succession', label: F.L('succession', d.fr) }); }
    if (d.R.realEstate) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-realestate', label: F.L('realestate', d.fr) }); }
    if (d.R.hasRSU) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-rsu', label: F.L('rsu', d.fr) }); }
    if (d.R.ccpc) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-corp', label: F.L('corp', d.fr) }); }
    if (d.R.debt) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-debt', label: F.L('debt', d.fr) }); }
    if (d.exp) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-risk', label: F.L('risk', d.fr) }); }
    _tocN++; tocSections.push({ n: _tocN, id: 'sec-methodology', label: F.L('methodology', d.fr) });

    // Render TOC
    h += renderTOC(tocSections, d.fr);

    // ── Section rendering (phase-aware ordering) ──
    var secN = 0;

    // 0. Overall Assessment (always, before numbered sections)
    h += renderOverallAssessment(d);

    // 1. Diagnostic / Executive Summary (always)
    secN++;
    h += renderDiagnostic(d, secN);

    // 2. Profile (always)
    secN++;
    h += renderProfile(d, secN);

    // 3. Family (conditional)
    if (d.R.hasFamily) { secN++; h += renderFamily(d, secN); }

    // 4. Goals (conditional)
    if (d.R.hasGoals) { secN++; h += renderGoals(d, secN); }

    // 5-6. Projection & Revenue — DECUM puts revenue first
    if (isDecum) {
      secN++; h += renderRevenue(d, secN);
      secN++; h += renderProjection(d, secN);
    } else {
      secN++; h += renderProjection(d, secN);
      secN++; h += renderRevenue(d, secN);
    }

    // 7. Strategies / SAM (if available)
    if (_hasStrats) { secN++; h += renderStrategies(d, secN); }

    // 8. Tax Strategy (always)
    secN++;
    h += renderTax(d, secN);

    // 9. GIS (conditional)
    var gisHtml = renderGIS(d, secN + 1);
    if (gisHtml) { secN++; h += gisHtml; }

    // 10. Meltdown (conditional)
    var meltHtml = renderMeltdown(d, secN + 1);
    if (meltHtml) { secN++; h += meltHtml; }

    // 11. Succession (conditional — skips if no estate data)
    var succHtml = renderSuccession(d, secN + 1);
    if (succHtml) { secN++; h += succHtml; }

    // 12. Real Estate (conditional)
    var reHtml = renderRealEstate(d, secN + 1);
    if (reHtml) { secN++; h += reHtml; }

    // 13. RSU (conditional)
    var rsuHtml = renderRSU(d, secN + 1);
    if (rsuHtml) { secN++; h += rsuHtml; }

    // 14. Corporation (conditional)
    var corpHtml = renderCorp(d, secN + 1);
    if (corpHtml) { secN++; h += corpHtml; }

    // 15. Debts (conditional)
    var debtHtml = renderDebts(d, secN + 1);
    if (debtHtml) { secN++; h += debtHtml; }

    // 16. Risk & Sensitivity (expert only)
    if (d.exp) { secN++; h += renderRisk(d, secN); }

    // 17. Methodology (always)
    secN++;
    h += renderMethodology(d, secN);

    // Footer
    h += renderFooter(d);

    h += '</body></html>';
    return h;
  };

})();
