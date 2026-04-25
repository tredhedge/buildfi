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
    // Editorial type stack — Playfair Display (serif display) for headings,
    // Inter (humanist sans) for body, JetBrains Mono for numerics.
    // Picked to visually distinguish BuildFi from enterprise-Word-export look
    // (NaviPlan/Conquest-style). See BENCHMARK-MATRIX.md §7.
    '@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap");',
    '*{box-sizing:border-box;margin:0;padding:0}',
    // 8px-grid tokens baked in: padding 24px (3×8), line-height 1.6, 13px base.
    'body{font-family:"Inter",-apple-system,system-ui,sans-serif;max-width:820px;margin:0 auto;padding:24px 28px;color:#1a1610;font-size:13px;line-height:1.62;background:#fff;font-feature-settings:"ss01","cv01","cv02"}',
    '.mono{font-family:"JetBrains Mono",monospace;font-weight:500;font-variant-numeric:tabular-nums}',
    'em{font-style:italic;color:#4a3f33}',
    // Cover — keeps dark luxurious feel, Playfair title.
    // Cover — BuildFi brand: marine #252d39 ground + gold #c49a1a accents
    '.cover{min-height:960px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 35%,#344155 0%,#252d39 55%,#1a1f2a 100%);color:#faf8f4;text-align:center;position:relative;border-radius:8px;margin-bottom:24px;page-break-after:always;overflow:hidden}',
    '.cover::before{content:"";position:absolute;top:24px;left:24px;width:64px;height:64px;border-top:1px solid #c49a1a;border-left:1px solid #c49a1a;opacity:0.45}',
    '.cover::after{content:"";position:absolute;bottom:24px;right:24px;width:64px;height:64px;border-bottom:1px solid #c49a1a;border-right:1px solid #c49a1a;opacity:0.45}',
    '.cover-divider{width:88px;height:1px;background:'+C.gold+';margin:24px auto;opacity:0.6}',
    '.cover-title{font-family:"Playfair Display",Georgia,serif;font-size:42px;font-weight:700;letter-spacing:0;color:'+C.gold+';line-height:1.05}',
    '.cover-subtitle{font-family:"Inter",sans-serif;font-size:12px;font-weight:500;color:#bccbe0;margin-top:12px;letter-spacing:3.5px;text-transform:uppercase}',
    '.cover-client{font-family:"Playfair Display",Georgia,serif;font-size:26px;font-weight:600;margin-top:44px;color:#faf8f4;letter-spacing:0.3px}',
    '.cover-grade-circle{width:150px;height:150px;border-radius:50%;border:3px solid;display:flex;align-items:center;justify-content:center;margin:32px auto 0;background:rgba(250,248,244,0.04);box-shadow:0 0 0 1px rgba(196,154,26,0.15) inset, 0 8px 30px rgba(0,0,0,0.35)}',
    '.cover-grade-letter{font-size:36px;font-weight:700;font-family:"JetBrains Mono",monospace}',
    '.cover-grade-pill{margin-top:14px;display:inline-block;padding:5px 20px;border-radius:16px;font-weight:700;font-size:11px;color:#1a1f2a;letter-spacing:1px;text-transform:uppercase}',
    '.cover-date{font-size:12px;color:#a8b8d0;margin-top:32px;letter-spacing:0.5px}',
    '.cover-company{position:absolute;bottom:40px;font-size:10px;color:#7c8a9e;letter-spacing:1.5px;text-transform:uppercase}',
    // Headers — Playfair for display hierarchy; sec stays sans for snappiness.
    'h1{font-family:"Playfair Display",Georgia,serif;font-size:30px;color:'+C.gold+';font-weight:700;letter-spacing:-0.3px;line-height:1.15}',
    'h2{font-size:13px;color:#706558;font-weight:400;margin-top:4px;letter-spacing:0.2px}',
    // Section header — switched to a cleaner, thinner-rule look with small caps
    // label. Reads less "corporate dashboard", more "editorial spread".
    '.sec{font-size:12px;color:'+C.gold+';border-bottom:1px solid '+C.gold+';padding-bottom:6px;margin:28px 0 14px;text-transform:uppercase;letter-spacing:2px;font-weight:700;display:flex;align-items:center;gap:10px;page-break-after:avoid;font-family:"Inter",sans-serif}',
    '.sec-n{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:'+C.gold+';color:#fff;font-size:10px;font-weight:700;flex-shrink:0;letter-spacing:0}',
    '.sec-q{font-size:10px;color:#888;font-style:italic;font-weight:400;text-transform:none;letter-spacing:0;margin-left:auto}',
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
    '.kpi{text-align:center;padding:10px 6px;border:1px solid #e0d3bf;border-radius:8px;background:#fffdf9;break-inside:avoid;box-shadow:0 1px 0 rgba(0,0,0,0.03)}',
    '.kpi-v{font-size:20px;font-weight:700;font-family:"JetBrains Mono",monospace;color:#3b2f1f}',
    '.kpi-l{font-size:10px;color:#6a6155;margin-top:3px;text-transform:uppercase;letter-spacing:.5px;font-weight:600}',
    '.grade-ring{display:inline-flex;align-items:center;justify-content:center;width:90px;height:90px;border-radius:50%;font-size:30px;font-weight:900;font-family:"JetBrains Mono",monospace}',
    '.grade-pill{display:inline-block;padding:4px 18px;border-radius:16px;font-weight:800;font-size:13px;color:#fff;margin-top:6px}',
    // Callouts
    '.callout{border-radius:6px;padding:12px 14px;margin:8px 0;font-size:11px;line-height:1.6;color:#333;break-inside:avoid}',
    '.callout-insight{background:#f0f8f0;border:1px solid '+C.green+';border-left:4px solid '+C.green+'}',
    '.callout-warning{background:#fdf6e3;border:1px solid '+C.amber+';border-left:4px solid '+C.amber+'}',
    '.callout-alert{background:#fde8e8;border:1px solid '+C.red+';border-left:4px solid '+C.red+'}',
    '.callout-ai{background:#f7f5f0;border:1px solid #d8d4c8;border-left:3px solid '+C.purple+'}',
    '.callout-inaction{background:#fff8f0;border:1px solid #d4873c;border-left:4px solid #d4873c}',
    '.callout-breakeven{background:#f0f4f8;border:1px solid '+C.blue+';border-left:4px solid '+C.blue+'}',
    '.callout-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;display:flex;align-items:center;gap:4px}',
    '.callout-val{font-family:"JetBrains Mono",monospace;font-weight:700;font-size:18px;margin-bottom:2px}',
    '.ai-badge{display:inline-block;background:#e8e4da;color:'+C.purple+';font-size:9px;font-weight:700;padding:1px 6px;border-radius:8px;margin-bottom:4px;text-transform:uppercase;letter-spacing:.3px}',
    '.callout-ai p{margin-top:4px;line-height:1.7}',
    // Tables
    '.tbl{width:100%;border-collapse:collapse;font-size:11px;margin:6px 0}',
    '.tbl th{padding:5px 6px;text-align:right;font-size:10px;font-weight:700;color:'+C.gold+';background:#f9f7f2;border-bottom:2px solid '+C.border+';letter-spacing:.35px}',
    '.tbl th:first-child{text-align:left}',
    '.tbl td{padding:4px 6px;text-align:right;border-bottom:1px solid #f0ece4;font-family:"JetBrains Mono",monospace;font-size:10px}',
    '.tbl td:first-child{text-align:left;font-family:"Inter",sans-serif}',
    '.tbl tr.ret{font-weight:700;background:#faf8f3}',
    '.tbl tbody tr:nth-child(even):not(.ret) td{background:#fdfbf7}',
    // Charts
    '.chart-block{border:1px solid '+C.border+';border-radius:8px;background:#fff;padding:8px 10px;margin:10px 0 12px;break-inside:avoid;page-break-inside:avoid}',
    '.chart-title{font-size:11px;font-weight:700;color:'+C.gold+';margin:2px 0 6px}',
    '.chart-legend{display:flex;gap:12px;flex-wrap:wrap;margin:4px 0 2px;font-size:9px;color:#888}',
    '.chart-legend-item{display:flex;align-items:center;gap:4px}',
    '.chart-legend-swatch{width:8px;height:8px;border-radius:2px;display:inline-block}',
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
    '.ai-placeholder{background:#f7f5f0;border:1px dashed #d8d4c8;border-radius:6px;padding:14px 16px;margin:8px 0;text-align:center}',
    '.ai-placeholder-lbl{font-size:10px;color:'+C.purple+';font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}',
    '.ai-placeholder-body{font-size:11px;color:#9a9488;line-height:1.6}',
    // Section page wrapper
    '.sec-page{page-break-before:always;padding-top:8px;margin-top:2px}',
    '.sec-page:first-of-type{page-break-before:avoid}',
    '.sec + .narr{margin-top:8px}',
    // Print — running header/footer via @page, page counter via CSS counter.
    // 1.8cm top + bottom leaves room for header/footer without squeezing body.
    '@media print{',
    '@page{',
      'margin:1.8cm 1.6cm 2cm 1.6cm;size:letter;',
      // Page-running-head removed — was hardcoded "Plan de retraite" (FR)
      // and leaked into EN reports. buildfi.ca + page counter already show
      // in @bottom-left and @bottom-right. The decorative header was bilingual-broken.
      '@bottom-right{content:counter(page) " / " counter(pages);font-family:"JetBrains Mono",monospace;font-size:9px;color:#a09080}',
      '@bottom-left{content:"buildfi.ca";font-family:"Inter",sans-serif;font-size:9px;color:#a09080;letter-spacing:0.5px}',
    '}',
    '@page :first{@top-center{content:""}@bottom-right{content:""}@bottom-left{content:""}}',
    'h3.sec{page-break-after:avoid}',
    '.cd,.kpi,table,.callout,.reco-card,.chart-block{break-inside:avoid;page-break-inside:avoid}',
    'body{padding:0;font-size:11px;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
    '.narr{font-size:11px;line-height:1.7}',
    '.sec-page{page-break-before:always}',
    '.sec-page:first-of-type{page-break-before:avoid}',
    'table{page-break-inside:auto}tr{page-break-inside:avoid}thead{display:table-header-group}',
    'svg{max-width:700px !important;max-height:400px !important}',
    '.chart-legend{font-size:8px}',
    '.copy-btn,.no-print,[onclick]{display:none !important}',
    '.print-only{display:block !important}',
    '.cover{page-break-after:always;min-height:100vh}',
    '.toc{page-break-after:always}',
    '.ai-placeholder{break-inside:avoid}',
    // Widow/orphan control
    'p,.narr{orphans:3;widows:3}',
    'h1,h3.sec{break-after:avoid-page}',
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
    '<text x="44" y="38" font-family="Plus Jakarta Sans,Inter,sans-serif" font-weight="700" font-size="28" fill="'+C.gold+'">BuildFi</text>' +
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

  // === EXECUTIVE SUMMARY (1-pager TL;DR after cover) ===
  // Compresses the verdict, the 4 headline metrics, top strengths/risks onto
  // one page. Designed for the reader who only flips through. Visual style
  // echoes the cover (navy + gold).
  // === UPSELL TEASER (Planner SKU — points back to the live tool) ===
  // Planner customers already have a 190-variable simulator at /expert. The
  // report is a clean snapshot, not a mini-tool. This block tells them where
  // to go when they want to experiment, framing the absence of an embedded
  // simulator as cleanliness rather than loss.
  function _renderUpsellTeaser(d) {
    if (!d.p || !d.mc) return '';
    var fr = d.fr;
    return '<div style="margin:14px 0;padding:14px 18px;background:linear-gradient(135deg,#252d39 0%,#344155 100%);border-radius:8px;border-left:4px solid #c49a1a;color:#faf8f4;display:flex;align-items:center;gap:14px;break-inside:avoid">' +
      '<div style="font-family:\"JetBrains Mono\",monospace;font-size:24px;font-weight:700;color:#c49a1a;flex-shrink:0;line-height:1">⚙</div>' +
      '<div style="flex:1">' +
        '<div style="font-family:Inter,sans-serif;font-size:11px;font-weight:700;color:#c49a1a;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px">' + (fr ? 'Ce rapport est un instantané — votre Planner reste votre outil de travail' : 'This report is a snapshot — your Planner remains your working tool') + '</div>' +
        '<div style="font-family:Inter,sans-serif;font-size:11.5px;color:#e8e0d4;line-height:1.55">' +
          (fr ? 'Pour explorer des scénarios, ajuster vos hypothèses et comparer plusieurs variantes, retournez à votre Planner (190+ paramètres, scénarios persistants). Ce rapport reste une photo nette d\'un scénario donné — utile pour archiver, partager ou imprimer.'
              : 'To explore scenarios, adjust assumptions, and compare variants, return to your Planner (190+ parameters, persistent scenarios). This report stays a clean snapshot of one scenario — useful for archiving, sharing, or printing.') +
        '</div>' +
      '</div>' +
      '<div style="font-family:Inter,sans-serif;font-size:10px;font-weight:700;color:#c49a1a;letter-spacing:1px;text-transform:uppercase;flex-shrink:0;text-align:right;line-height:1.5">' +
        (fr ? 'Ouvrir le<br>Planner →' : 'Open the<br>Planner →') +
      '</div>' +
      '</div>';
  }

  // === WHAT-IF TEASER (early callout) ===
  // Highlights the existence of the live simulator at the back of the report.
  // Reader sees this near the diagnostic so they know to scroll if they want
  // to test scenarios. Visible in print as a static callout.
  function _renderWhatIfTeaser(d) {
    if (!d.p || !d.mc) return '';
    var fr = d.fr;
    return '<a href="#bf-whatif" class="whatif-teaser-link" style="text-decoration:none;color:inherit;display:block">' +
      '<div style="margin:14px 0;padding:14px 18px;background:linear-gradient(135deg,#252d39 0%,#344155 100%);border-radius:8px;border-left:4px solid #c49a1a;color:#faf8f4;display:flex;align-items:center;gap:14px;break-inside:avoid">' +
      '<div style="font-family:\"JetBrains Mono\",monospace;font-size:24px;font-weight:700;color:#c49a1a;flex-shrink:0;line-height:1">⚡</div>' +
      '<div style="flex:1">' +
        '<div style="font-family:Inter,sans-serif;font-size:11px;font-weight:700;color:#c49a1a;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px">' + (fr ? 'Simulateur What-If — disponible plus loin dans ce rapport' : 'What-If Simulator — available later in this report') + '</div>' +
        '<div style="font-family:Inter,sans-serif;font-size:11.5px;color:#e8e0d4;line-height:1.55">' +
          (fr ? 'Ajustez 12 paramètres (âge de retraite, dépenses, rendement, inflation, MER, allocation…) ou choisissez un scénario rapide (Récession 2008, FIRE, Stagflation…) pour voir comment votre plan réagit. Une nouvelle simulation Monte Carlo (500 scénarios) tourne en direct dans votre navigateur.'
              : 'Adjust 12 parameters (retirement age, spending, return, inflation, MER, allocation…) or pick a quick scenario (2008 Recession, FIRE, Stagflation…) to see how your plan responds. A new Monte Carlo simulation (500 scenarios) runs live in your browser.') +
        '</div>' +
      '</div>' +
      '<div style="font-family:Inter,sans-serif;font-size:10px;font-weight:700;color:#c49a1a;letter-spacing:1px;text-transform:uppercase;flex-shrink:0;text-align:right;line-height:1.5">' +
        (fr ? 'Voir le<br>simulateur →' : 'Go to<br>simulator →') +
      '</div>' +
      '</div></a>';
  }

  // === WHAT-IF SECTION MOUNT POINT ===
  // report-whatif.js (loaded as inline script) reads the data-bf-whatif-params
  // attribute and decorates the mount point with: presets bar, 12 grouped
  // sliders, simulate/save/reset buttons, 12 KPI deltas, save & compare table.
  // Print-hidden (no-print).
  function _renderWhatIfMount(d) {
    if (!d.p || !d.mc) return '';
    var fr = d.fr;
    var p = d.p;
    var baselineParams = {
      age: p.age, retAge: p.retAge, deathAge: p.deathAge, sex: p.sex || 'M', prov: p.prov || 'QC',
      sal: p.sal, rrsp: p.rrsp, tfsa: p.tfsa, nr: p.nr,
      cOn: p.cOn, cAge: p.cAge, cRetAge: p.cRetAge, cSex: p.cSex, cSal: p.cSal,
      cRRSP: p.cRRSP, cTFSA: p.cTFSA, cNR: p.cNR, cRetSpM: p.cRetSpM,
      retSpM: p.retSpM,
      qppAge: p.qppAge || 65, oasAge: p.oasAge || 65,
      cQppAge: p.cQppAge || 65, cOasAge: p.cOasAge || 65,
      avgE: p.avgE, qppYrs: p.qppYrs, cAvgE: p.cAvgE, cQppYrs: p.cQppYrs,
      rrspC: p.rrspC || 0, tfsaC: p.tfsaC || 0, nrC: p.nrC || 0,
      penType: p.penType, penM: p.penM, penIdx: p.penIdx,
      melt: p.melt, meltTgt: p.meltTgt || 0, split: p.split, splitP: p.splitP,
      wStrat: p.wStrat || 'standard',
      goP: p.goP || 1.0, slP: p.slP || 0.85, noP: p.noP || 0.7,
      eqRet: p.eqRet || 0.06, eqVol: p.eqVol || 0.16,
      bndRet: p.bndRet || 0.035, bndVol: p.bndVol || 0.06,
      inf: p.inf || 0.021, fatT: !!p.fatT, stochInf: !!p.stochInf, stochMort: !!p.stochMort,
      merR: p.merR || 0.01, merT: p.merT || 0.01, merN: p.merN || 0.01,
      merWt: d.merWt || ((p.merR || 0) + (p.merT || 0) + (p.merN || 0)) / 3,
      allocR: p.allocR || 0.6, allocT: p.allocT || 0.7, allocN: p.allocN || 0.5
    };
    var paramsJson = JSON.stringify(baselineParams).replace(/"/g, '&quot;');
    var h = '<div class="sec-page no-print" id="bf-whatif" data-bf-whatif-params="' + paramsJson + '">';
    h += F.Sec('?', fr ? 'Simulateur What-If' : 'What-If Simulator', 'sec-whatif');
    h += '<div class="bf-whatif-banner">' +
      '<strong>' + (fr ? 'Simulateur interactif.' : 'Interactive simulator.') + '</strong> ' +
      (fr ? 'Ajustez les paramètres ou choisissez un scénario rapide pour voir comment votre plan réagit. Une nouvelle simulation Monte Carlo (500 scénarios) tourne en direct dans votre navigateur. La narration AI ne change pas — elle reste calibrée sur le plan de base.' : 'Adjust the parameters or pick a quick scenario to see how your plan responds. A new Monte Carlo simulation (500 scenarios) runs live in your browser. AI narration does not change — it stays calibrated on the baseline plan.') +
      '</div>';
    h += '</div>';
    return h;
  }

  function _renderExecSummary(d) {
    var fr = d.fr, p = d.p, mc = d.mc;
    var f$ = F.fmtCompact;
    var g = F.grade(d.succVal, fr);
    var sC = F.succColor(d.succVal);
    var pct = d.succVal == null ? '—' : Math.round(d.succVal * 100) + '%';
    var medW = mc && (mc.rMedF || mc.medF) ? f$(mc.rMedF || mc.medF) : '—';
    var p25W = mc && (mc.rP25F || mc.p25F) ? f$(mc.rP25F || mc.p25F) : '—';
    var depAge = (mc && mc.p5Ruin != null && mc.p5Ruin < 200) ? mc.p5Ruin : null;
    var horizonYrs = (p.deathAge || 90) - (p.age || 35);
    var verdictText;
    if (d.succVal == null) verdictText = fr ? 'Plan en cours d\'analyse.' : 'Plan under analysis.';
    else if (d.succVal >= 0.85) verdictText = fr ? 'Plan robuste — la trajectoire centrale tient et les zones de risque sont gérables.' : 'Robust plan — the central trajectory holds and risk zones are manageable.';
    else if (d.succVal >= 0.65) verdictText = fr ? 'Plan viable — quelques ajustements ciblés rendraient la trajectoire plus confortable.' : 'Viable plan — a few targeted adjustments would make the trajectory more comfortable.';
    else if (d.succVal >= 0.4) verdictText = fr ? 'Plan sous tension — des ajustements structurels gagneraient à être considérés.' : 'Plan under strain — structural adjustments would be worth considering.';
    else verdictText = fr ? 'Plan fragile — une révision globale (épargne, dépenses, horizon) serait pertinente.' : 'Fragile plan — a global review (savings, spending, horizon) would be relevant.';

    var h = '<div class="exec-summary" style="page-break-after:always;background:linear-gradient(180deg,#252d39 0%,#344155 100%);color:#faf8f4;border-radius:8px;padding:32px 36px 28px;margin-bottom:24px;position:relative;overflow:hidden;min-height:780px">';
    h += '<div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,transparent 0%,#c49a1a 50%,transparent 100%)"></div>';
    h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">' +
      '<div style="font-family:Inter,sans-serif;font-size:11px;font-weight:700;color:#c49a1a;letter-spacing:3px;text-transform:uppercase">' + (fr ? 'Synthèse exécutive' : 'Executive summary') + '</div>' +
      '<div style="font-family:Inter,sans-serif;font-size:11px;color:#bccbe0;letter-spacing:0.5px">' + (fr ? 'En 30 secondes' : 'In 30 seconds') + '</div>' +
    '</div>';
    h += '<div style="font-family:\"Playfair Display\",Georgia,serif;font-size:22px;font-weight:600;line-height:1.35;color:#faf8f4;margin-bottom:8px">' + F.esc(d.client.name || (fr ? 'Client' : 'Client')) + '</div>';
    h += '<div style="font-family:Inter,sans-serif;font-size:13px;color:#bccbe0;line-height:1.6;margin-bottom:24px">' + verdictText + '</div>';
    // Headline metrics (4-up)
    function _execKPI(label, value, color, sub) {
      return '<div style="background:rgba(250,248,244,0.06);border:1px solid rgba(196,154,26,0.25);border-radius:6px;padding:14px 12px;text-align:center">' +
        '<div style="font-size:9px;color:#bccbe0;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:6px">' + label + '</div>' +
        '<div style="font-family:\"JetBrains Mono\",monospace;font-size:24px;font-weight:700;color:' + (color || '#c49a1a') + ';line-height:1">' + value + '</div>' +
        (sub ? '<div style="font-size:9.5px;color:#8a9bb0;margin-top:6px">' + sub + '</div>' : '') +
      '</div>';
    }
    h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px">';
    h += _execKPI(fr ? 'Taux de succès' : 'Success rate', pct, sC, g.label);
    h += _execKPI(fr ? 'Patrimoine médian' : 'Median wealth', medW, '#c49a1a', fr ? 'scénario typique' : 'typical scenario');
    h += _execKPI(fr ? 'Patrimoine prudent' : 'Cautious wealth', p25W, '#bccbe0', 'P25');
    h += _execKPI(fr ? 'Épuisement épargne' : 'Savings depletion', depAge ? depAge + (fr ? ' ans' : ' yr') : (fr ? 'Aucun' : 'Never'), depAge ? '#cf6060' : '#48a66d', depAge ? (fr ? 'scénario prudent' : 'cautious scenario') : (fr ? 'sur l\'horizon' : 'over horizon'));
    h += '</div>';
    // Strengths / Risks
    var strengths = [];
    var risks = [];
    if (d.succVal >= 0.7) strengths.push(fr ? 'Probabilité de succès élevée sur ' + horizonYrs + ' ans' : 'High success probability over ' + horizonYrs + ' years');
    if (mc && mc.medEstateNet > 100000) strengths.push((fr ? 'Héritage médian projeté ' : 'Median projected estate ') + f$(mc.medEstateNet));
    if (p.cOn) strengths.push(fr ? 'Plan de couple — fractionnement de revenus disponible' : 'Couple plan — pension splitting available');
    if (p.tfsa > 50000) strengths.push((fr ? 'CELI bien capitalisé (' : 'Well-funded TFSA (') + f$(p.tfsa) + ')');
    if ((p.rrsp || 0) + (p.tfsa || 0) > 500000) strengths.push(fr ? 'Capital de retraite supérieur à 500K$' : 'Retirement capital above $500K');
    if (strengths.length === 0) strengths.push(fr ? 'Diagnostic en cours — voir sections détaillées' : 'Diagnostic in progress — see detailed sections');
    if (d.succVal != null && d.succVal < 0.65) risks.push(fr ? 'Taux de succès sous 65 % — ajustements à considérer' : 'Success rate below 65% — adjustments to consider');
    if (depAge) risks.push((fr ? 'Épuisement potentiel de l\'épargne vers ' : 'Potential savings depletion near age ') + depAge);
    if (mc && mc.oasClbkYrs > 0) risks.push((fr ? 'Récupération PSV sur ' : 'OAS clawback over ') + mc.oasClbkYrs + (fr ? ' année(s)' : ' year(s)'));
    if ((p.debts && p.debts.length > 0) || (d._debtTotal || 0) > 50000) risks.push(fr ? 'Dette à intégrer dans la stratégie' : 'Debt to integrate into strategy');
    if (p.eqRet < 0.04) risks.push(fr ? 'Hypothèse de rendement basse — peu de marge' : 'Low return assumption — little margin');
    if (risks.length === 0) risks.push(fr ? 'Aucune zone de risque majeure identifiée' : 'No major risk zone identified');
    function _execList(title, items, accent) {
      var html = '<div><div style="font-size:10px;color:' + accent + ';font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">' + title + '</div><ul style="list-style:none;padding:0;margin:0">';
      items.slice(0, 4).forEach(function(it) {
        html += '<li style="font-size:11.5px;color:#e8e0d4;line-height:1.55;margin-bottom:5px;padding-left:14px;position:relative"><span style="position:absolute;left:0;top:0;color:' + accent + ';font-weight:700">·</span>' + it + '</li>';
      });
      html += '</ul></div>';
      return html;
    }
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:20px">';
    h += _execList(fr ? 'Forces du plan' : 'Plan strengths', strengths, '#48a66d');
    h += _execList(fr ? 'Zones à surveiller' : 'Risk zones', risks, '#cf9850');
    h += '</div>';
    h += '<div style="border-top:1px solid rgba(196,154,26,0.25);padding-top:14px;font-size:10.5px;color:#bccbe0;line-height:1.6">' +
      '<strong style="color:#c49a1a;letter-spacing:0.3px">' + (fr ? 'Pour aller plus loin :' : 'Read further:') + '</strong> ' +
      (fr ? 'la lettre du conseiller (page 2) cadre la lecture, le diagnostic et le plan d\'action proposent des leviers concrets, et le simulateur What-If permet de tester vos propres hypothèses.' : 'the advisor letter (p. 2) frames the read, the diagnostic and action plan propose concrete levers, and the What-If simulator lets you test your own assumptions.') +
      '</div>';
    h += '</div>';
    return h;
  }

  function renderCover(d) {
    var fr = d.fr, g = F.grade(d.succVal, fr), sC = F.succColor(d.succVal);
    var cName = (d.client.name || 'Client');
    var cSpouse = d.p.cOn ? (d.client.spouseName || d.p.cSpouseName || '') : '';
    var h = '<div class="cover">';
    h += '<div style="margin-bottom:30px;opacity:0.95">' + logoSvg.replace(/fill="[^"]*"/g, 'fill="#c49a1a"').replace('fill="#c49a1a" opacity="0.6"', 'fill="#c49a1a" opacity="0.5"').replace('fill="#c49a1a" opacity="0.8"', 'fill="#c49a1a" opacity="0.7"') + '</div>';
    h += '<div class="cover-divider"></div>';
    h += '<div class="cover-title">' + F.L('cover_title', fr) + '</div>';
    h += '<div class="cover-subtitle">' + F.L('cover_sub', fr) + '</div>';
    h += '<div class="cover-divider"></div>';
    h += '<div style="font-size:13px;color:#bccbe0;margin-top:10px;letter-spacing:0.4px">' + F.L('prepared_for', fr) + '</div>';
    h += '<div class="cover-client">' + F.esc(cName) + (cSpouse ? ' & ' + F.esc(cSpouse) : '') + '</div>';
    h += '<div class="cover-grade-circle" style="border-color:' + sC + ';color:' + sC + '">';
    h += '<div class="cover-grade-letter">' + (d.succVal == null ? '\u2014' : Math.round(d.succVal * 100) + '%') + '</div>';
    h += '</div>';
    h += '<div style="text-align:center;margin-top:14px"><span class="cover-grade-pill" style="background:' + sC + '">' + g.letter + ' \u2014 ' + g.label + '</span></div>';
    h += '<div class="cover-date">' + F.L('prepared_on', fr) + ' ' + F.fmtDate(null, fr) + '</div>';
    if (d.client.advisor) h += '<div style="font-size:11px;color:#a8b8d0;margin-top:6px">' + F.esc(d.client.advisor) + (d.client.firm ? ' \u00b7 ' + F.esc(d.client.firm) : '') + '</div>';
    h += '<div style="font-size:9px;color:#8a9bb0;margin-top:20px;line-height:1.55;max-width:420px">' +
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
    var f$ = F.fmtCompact, p = d.p;
    var fM = function(v) { return F.fmtMoney(v, fr); };
    var h = secPage();
    h += '<h3 class="sec" id="sec-assessment" style="border-bottom-color:' + sC + '">' +
      '<span class="sec-n" style="background:' + sC + '">\u2606</span>' +
      (fr ? 'Votre plan en 30 secondes' : 'Your plan in 30 seconds') + '</h3>';

    // ── Stated inputs / suitability frame ───────────────────────────
    // Re-anchors the report on what the client told us, so they can
    // validate the plan answers their question, not the engine's defaults.
    var inputBits = [];
    inputBits.push((fr ? '\u00c2ge actuel ' : 'Current age ') + (p.age || '—'));
    inputBits.push((fr ? 'retraite \u00e0 ' : 'retire at ') + (p.retAge || '—'));
    inputBits.push((fr ? 'd\u00e9penses cibles ' : 'target spending ') + fM((p.retSpM || 0) * 12) + (fr ? '/an' : '/yr'));
    inputBits.push((fr ? 'horizon ' : 'horizon ') + ((p.deathAge || 90) - (p.age || 0)) + (fr ? ' ans' : ' yrs'));
    inputBits.push((fr ? 'province ' : 'province ') + (p.prov || 'QC'));
    if (p.cOn) inputBits.push(fr ? 'plan de couple' : 'couple plan');
    var assumpBits = [];
    assumpBits.push((fr ? 'rendement esp\u00e9r\u00e9 ' : 'expected return ') + Math.round((p.eqRet || p.eqRetS || 0.06) * 1000) / 10 + '%');
    assumpBits.push((fr ? 'inflation ' : 'inflation ') + Math.round((p.inf || 0.02) * 1000) / 10 + '%');
    assumpBits.push((fr ? 'longevit\u00e9 ' : 'longevity ') + (p.deathAge || 90) + (fr ? ' ans' : ' yrs'));
    assumpBits.push((fr ? 'simulations ' : 'simulations ') + (p.nSim || 5000));
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0 14px;font-size:10.5px">';
    h += '<div class="cd" style="background:#fdfbf5;padding:8px 10px"><div style="font-size:9px;font-weight:700;color:' + C.gold + ';text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">' + (fr ? 'Ce que vous nous avez dit' : 'What you told us') + '</div>' + inputBits.join(' \u2022 ') + '</div>';
    h += '<div class="cd" style="background:#f5f8fc;padding:8px 10px;border-color:#dbe4f0"><div style="font-size:9px;font-weight:700;color:' + C.blue + ';text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">' + (fr ? 'Hypoth\u00e8ses du mod\u00e8le' : 'Model assumptions') + '</div>' + assumpBits.join(' \u2022 ') + '</div>';
    h += '</div>';

    // Goal-by-goal achievability — only if goals are stated
    if (p.goals && p.goals.length > 0) {
      h += '<div style="font-size:10.5px;margin-bottom:10px">';
      h += '<div style="font-size:9px;font-weight:700;color:' + C.gold + ';text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">' + (fr ? 'Objectifs d\u00e9clar\u00e9s' : 'Stated goals') + '</div>';
      p.goals.slice(0, 4).forEach(function(g2) {
        // Crude achievability heuristic: if median wealth at goal age covers goal amount
        var medAtGoal = (d.mc.rMedF || d.mc.medF || 0);
        var ok = (g2.amount || 0) <= medAtGoal * 0.8;
        var badge = ok
          ? '<span style="background:#e6f4e6;color:' + C.green + ';font-size:9px;font-weight:700;padding:1px 6px;border-radius:8px">' + (fr ? 'r\u00e9aliste' : 'on track') + '</span>'
          : '<span style="background:#fff0d6;color:' + C.amber + ';font-size:9px;font-weight:700;padding:1px 6px;border-radius:8px">' + (fr ? 'tendu' : 'tight') + '</span>';
        h += '<div style="margin-bottom:2px">' + badge + ' ' + F.esc(g2.desc || g2.name || '') + (g2.amount ? ' \u2014 ' + fM(g2.amount) : '') + (g2.age ? (fr ? ' @ ' + g2.age + ' ans' : ' @ age ' + g2.age) : '') + '</div>';
      });
      h += '</div>';
    }

    // Grade + key metrics row
    h += '<div style="display:flex;align-items:center;gap:20px;margin:14px 0">';
    h += '<div style="text-align:center;flex-shrink:0">';
    h += '<div class="grade-ring" style="border:6px solid ' + sC + ';color:' + sC + '"><span class="mono">' + (d.succVal == null ? '\u2014' : Math.round(d.succVal * 100) + '%') + '</span></div>';
    h += '<div><span class="grade-pill" style="background:' + sC + '">' + g.letter + '</span></div>';
    h += '</div>';
    var _scopeAss = d.R.couple ? (fr ? ' (m\u00e9nage)' : ' (household)') : '';
    h += '<div class="g4" style="flex:1">';
    h += F.KPI('<span class="mono">' + f$(d.mc.rMedF || d.mc.medF) + '</span>', (fr ? 'Patrimoine P50' : 'P50 Wealth') + _scopeAss, C.blue);
    h += F.KPI('<span class="mono">' + Math.round(d.covRatio * 100) + '%</span>', (fr ? 'Revenu garanti / dépenses' : 'Guaranteed income / spending') + _scopeAss, d.covRatio >= 0.6 ? C.green : d.covRatio >= 0.4 ? C.amber : C.red);
    h += F.KPI('<span class="mono">' + (d._wdPct ? d._wdPct + '%' : '\u2014') + '</span>', fr ? 'Taux retrait' : 'Withdrawal rate', d._wdPct && parseFloat(d._wdPct) > 4 ? C.red : C.green);
    h += F.KPI('<span class="mono">' + f$(Math.round(d.mc.medEstateNet || 0)) + '</span>', (fr ? 'H\u00e9ritage net' : 'Net estate') + _scopeAss, C.gold);
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

    // Couple-aware naming + household framing — when modeled as couple, the
    // narrative needs to acknowledge both spouses or the reader can't tell
    // whether shown numbers are individual or combined.
    var _nm = d.fn ? '<strong>' + F.esc(d.fn) + '</strong>' : '';
    var _sn = d.sfn ? '<strong>' + F.esc(d.sfn) + '</strong>' : '';
    var _coupleLabel = '';
    if (d.R.couple) {
      _coupleLabel = _sn
        ? (fr ? ' et ' + _sn : ' and ' + _sn)
        : (fr ? ' et votre conjoint(e)' : ' and your spouse');
    }
    var _nmFull = _nm ? (_nm + _coupleLabel) : '';
    var _nmPfx = _nmFull ? (_nmFull + ', ') : '';
    var _savingsLabel = d.R.couple
      ? (fr ? '\u00e9pargne du m\u00e9nage' : 'household savings')
      : (fr ? '\u00e9pargne actuelle' : 'current savings');
    var _coupleNote = d.R.couple
      ? (fr
          ? ' Tous les chiffres ci-dessous refl\u00e8tent le m\u00e9nage combin\u00e9 (vous + ' + (d.sfn ? F.esc(d.sfn) : 'conjoint(e)') + (p.cAge ? ', ' + p.cAge + ' ans' : '') + (p.cRetAge ? ', retraite \u00e0 ' + p.cRetAge : '') + ').'
          : ' All figures below reflect the combined household (you + ' + (d.sfn ? F.esc(d.sfn) : 'spouse') + (p.cAge ? ', age ' + p.cAge : '') + (p.cRetAge ? ', retiring at ' + p.cRetAge : '') + ').')
      : '';

    if (phase === 'decum') {
      h += narr(fr
        ? _nmPfx + 'vous \u00eates actuellement \u00e0 la retraite. Ce rapport analyse la viabilit\u00e9 de votre plan de d\u00e9caissement sur un horizon de <strong>' + horizon + ' ans</strong>, soit jusqu\u2019\u00e0 l\u2019\u00e2ge de ' + (p.deathAge || 90) + ' ans. L\u2019analyse repose sur <strong>' + (p.nSim || 5000) + ' simulations</strong> Monte Carlo int\u00e9grant les rendements de march\u00e9, l\u2019inflation, la mortalit\u00e9 et la fiscalit\u00e9 canadienne 2026.' + _coupleNote
        : (_nmFull ? _nmFull + ', you' : 'You') + ' are currently retired. This report analyzes the viability of your withdrawal plan over a <strong>' + horizon + '-year</strong> horizon, through age ' + (p.deathAge || 90) + '. The analysis is based on <strong>' + (p.nSim || 5000) + ' Monte Carlo simulations</strong> incorporating market returns, inflation, mortality, and 2026 Canadian taxation.' + _coupleNote);
    } else if (phase === 'transition') {
      h += narr(fr
        ? _nmPfx + 'la retraite approche \u2014 dans <strong>' + yrsToRet + ' ans</strong>. Ce rapport \u00e9value si votre ' + _savingsLabel + ' de <strong>' + f$(d.totalBal) + '</strong>, combin\u00e9e \u00e0 vos cotisations et revenus gouvernementaux, suffira \u00e0 maintenir votre niveau de vie pendant ' + (horizon - yrsToRet) + ' ann\u00e9es de retraite. Chaque simulation mod\u00e9lise une s\u00e9quence unique de rendements, d\u2019inflation et de long\u00e9vit\u00e9.' + _coupleNote
        : (_nmFull ? _nmFull + ', retirement' : 'Retirement') + ' is approaching \u2014 in <strong>' + yrsToRet + ' years</strong>. This report evaluates whether your ' + _savingsLabel + ' of <strong>' + f$(d.totalBal) + '</strong>, combined with contributions and government income, will sustain your lifestyle through ' + (horizon - yrsToRet) + ' years of retirement. Each simulation models a unique sequence of returns, inflation, and longevity.' + _coupleNote);
    } else {
      h += narr(fr
        ? _nmPfx + 'vous \u00eates en phase d\u2019accumulation, avec <strong>' + yrsToRet + ' ans</strong> avant la retraite pr\u00e9vue \u00e0 ' + p.retAge + ' ans. Votre ' + _savingsLabel + ' de <strong>' + f$(d.totalBal) + '</strong> constitue le point de d\u00e9part des ' + (p.nSim || 5000) + ' sc\u00e9narios projet\u00e9s. Ce rapport \u00e9value la trajectoire de votre patrimoine, l\u2019ad\u00e9quation de vos revenus de retraite et les leviers fiscaux \u00e0 votre disposition.' + _coupleNote
        : (_nmFull ? _nmFull + ', you' : 'You') + ' are in the accumulation phase, with <strong>' + yrsToRet + ' years</strong> until planned retirement at age ' + p.retAge + '. Your ' + _savingsLabel + ' of <strong>' + f$(d.totalBal) + '</strong> forms the starting point for ' + (p.nSim || 5000) + ' projected scenarios. This report evaluates your wealth trajectory, retirement income adequacy, and available tax levers.' + _coupleNote);
    }

    // KPIs
    h += '<div class="' + (exp ? 'g6' : 'g5') + '" style="margin-bottom:12px">';
    h += F.KPI('<span class="mono">' + (d.succVal == null ? (fr ? 'En cours' : 'Pending') : Math.round(d.succVal * 100) + '%') + '</span>', fr ? 'Taux de succ\u00e8s' : 'Success rate', F.succColor(d.succVal));
    h += F.KPI('<span class="mono">' + f$(mc.rMedF || mc.medF) + '</span>', fr ? 'P50 patrimoine (r\u00e9el)' : 'P50 wealth (real)', C.blue);
    h += F.KPI('<span class="mono">' + f$(mc.rP25F || mc.p25F || mc.rVar5 || mc.var5) + '</span>', fr ? 'P25 prudent (r\u00e9el)' : 'P25 cautious (real)', C.amber);
    // Durability KPI: "never" reads as nonsense — every plan ends at deathAge.
    // When p5Ruin signals "no depletion", show "Through age X" instead.
    var _durLabel = (mc.p5Ruin || 999) >= 200
      ? (fr ? 'Jusqu\'\u00e0 ' + (p.deathAge || 90) + ' ans' : 'Through age ' + (p.deathAge || 90))
      : mc.p5Ruin + (fr ? ' ans' : ' yrs');
    h += F.KPI('<span class="mono">' + _durLabel + '</span>', fr ? 'Durabilit\u00e9 de l\u2019\u00e9pargne' : 'Savings durability', (mc.p5Ruin || 999) >= 200 ? C.green : C.red);
    h += F.KPI('<span class="mono">' + (d._wdPct ? d._wdPct + '%' : '\u2014') + '</span>', fr ? 'Retrait initial (% \u00e9pargne)' : 'Init. WR (% portfolio)', d._wdPct && parseFloat(d._wdPct) > 4 ? C.red : d._wdPct && parseFloat(d._wdPct) > 3.5 ? C.amber : C.green);
    if (exp) h += F.KPI('<span class="mono">' + (d._taxAlpha !== null && d._taxAlpha > 0 ? f$(Math.round(d._taxAlpha)) : f$(Math.round(d._optTax))) + '</span>', d._taxAlpha !== null && d._taxAlpha > 0 ? (fr ? 'Alpha fiscal' : 'Tax alpha') : (fr ? 'Imp\u00f4t viager' : 'Lifetime tax'), d._taxAlpha !== null && d._taxAlpha > 0 ? C.green : C.red);
    h += '</div>';

    // Cohort percentile — adds professional context to the success rate.
    // Indicative only; uses BData.COHORT_BENCHMARKS lookup by age decade × asset bucket.
    if (D.cohortPercentile && d.succVal != null) {
      var coh = D.cohortPercentile(d.succVal, p.age, d.totalBal);
      if (coh) {
        var cohPctileLbl = coh.percentile >= 75 ? (fr ? 'au-dessus de la moyenne' : 'above average')
          : coh.percentile >= 50 ? (fr ? 'dans la moyenne' : 'around average')
          : coh.percentile >= 25 ? (fr ? 'en dessous de la moyenne' : 'below average')
          : (fr ? 'nettement inf\u00e9rieur' : 'well below typical');
        h += '<div style="background:#f5f8fc;border:1px solid #d8e4f0;border-radius:6px;padding:8px 12px;margin:4px 0 10px;font-size:10.5px;color:#456">' +
          '<strong>' + (fr ? 'Contexte cohorte:' : 'Cohort context:') + '</strong> ' +
          (fr
            ? 'Pour votre tranche d\'\u00e2ge (' + (Math.floor(p.age / 10) * 10) + '-' + (Math.floor(p.age / 10) * 10 + 9) + ' ans) et niveau d\'\u00e9pargne, le taux de succ\u00e8s typique observ\u00e9 est d\'environ <strong>' + Math.round(coh.typical * 100) + '%</strong>. Votre <strong>' + Math.round(d.succVal * 100) + '%</strong> est ' + cohPctileLbl + ' (~' + coh.percentile + '<sup>e</sup> percentile estim\u00e9).'
            : 'For your age band (' + (Math.floor(p.age / 10) * 10) + '-' + (Math.floor(p.age / 10) * 10 + 9) + ') and savings level, the typical observed success rate is approximately <strong>' + Math.round(coh.typical * 100) + '%</strong>. Your <strong>' + Math.round(d.succVal * 100) + '%</strong> is ' + cohPctileLbl + ' (~' + coh.percentile + '<sup>th</sup> percentile estimated).') +
          ' <span style="color:#888;font-style:italic">(' + (fr ? 'Indication seulement, non garanti.' : 'Indicative only, not guaranteed.') + ')</span></div>';
      }
    }

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

  // === SECTION 1.5: WHAT COULD CHANGE THIS PLAN (sensitivity levers) ===
  // Renders a tornado-style table of real Monte Carlo sensitivity sweeps.
  // Consumes `mc._sweeps.{returns,inflation}.{up,down}` — populated by
  // gen-real-mc.mjs running 4 perturbed MC (500 sims each). No closed-form
  // approximation; every delta traces to an actual MC run.
  function renderLevers(d, secN) {
    if (!d.mc || !d.mc._sweeps) return '';
    var fr = d.fr;
    var mc = d.mc, sw = mc._sweeps;
    var f$ = F.fmtCompact;
    var baseMedF = mc.rMedF || mc.medF || 0;
    var baseSucc = mc.succ || 0;

    function buildRow(label, change, upMC, downMC) {
      if (!upMC || !downMC) return null;
      var dMedUp = (upMC.medF || 0) - baseMedF;
      var dMedDn = (downMC.medF || 0) - baseMedF;
      var dSuccUp = Math.round(((upMC.succ || 0) - baseSucc) * 100);
      var dSuccDn = Math.round(((downMC.succ || 0) - baseSucc) * 100);
      return { label: label, change: change, dMedUp: dMedUp, dMedDn: dMedDn, dSuccUp: dSuccUp, dSuccDn: dSuccDn };
    }

    var rows = [
      buildRow(
        fr ? 'Rendement actions' : 'Equity returns',
        fr ? '\u00b1 1 % par an sur l\'horizon' : '\u00b1 1% annually across horizon',
        sw.returns && sw.returns.up, sw.returns && sw.returns.down
      ),
      buildRow(
        'Inflation',
        fr ? '\u00b1 1 % par an sur l\'horizon' : '\u00b1 1% annually across horizon',
        sw.inflation && sw.inflation.up, sw.inflation && sw.inflation.down
      )
    ].filter(Boolean);

    if (rows.length === 0) return '';

    var h = secPage();
    h += F.Sec(secN, F.L('levers', fr), 'sec-levers');
    h += narr(fr
      ? 'Chaque ligne compare le sc\u00e9nario de base \u00e0 deux simulations Monte Carlo additionnelles (500 chemins chacune) o\u00f9 un param\u00e8tre est perturb\u00e9 \u00e0 la hausse puis \u00e0 la baisse. Les d\u00e9ltas refl\u00e8tent l\'impact direct sur le patrimoine m\u00e9dian (P50, dollars r\u00e9els) et sur le taux de succ\u00e8s du plan.'
      : 'Each row compares the baseline to two additional Monte Carlo runs (500 paths each) where a single parameter is perturbed up then down. Deltas show direct impact on median wealth (P50, real dollars) and on plan success rate.');

    h += '<table class="tbl"><thead><tr>';
    h += '<th style="text-align:left">' + (fr ? 'Facteur' : 'Factor') + '</th>';
    h += '<th style="text-align:left">' + (fr ? 'Perturbation' : 'Change') + '</th>';
    h += '<th>' + (fr ? '\u0394 Patrimoine (hausse)' : '\u0394 Wealth (up)') + '</th>';
    h += '<th>' + (fr ? '\u0394 Patrimoine (baisse)' : '\u0394 Wealth (down)') + '</th>';
    h += '<th>' + (fr ? '\u0394 Succ\u00e8s' : '\u0394 Success') + '</th>';
    h += '</tr></thead><tbody>';
    rows.forEach(function(r) {
      var colorUp = r.dMedUp >= 0 ? C.green : C.red;
      var colorDn = r.dMedDn >= 0 ? C.green : C.red;
      var succStr = (r.dSuccUp >= 0 ? '+' : '') + r.dSuccUp + ' / ' + (r.dSuccDn >= 0 ? '+' : '') + r.dSuccDn + ' pts';
      h += '<tr>';
      h += '<td style="font-weight:600">' + F.esc(r.label) + '</td>';
      h += '<td style="font-family:Inter,sans-serif;color:#666;font-size:10px">' + F.esc(r.change) + '</td>';
      h += '<td style="color:' + colorUp + ';font-weight:700">' + (r.dMedUp >= 0 ? '+' : '\u2212') + f$(Math.abs(r.dMedUp)) + '</td>';
      h += '<td style="color:' + colorDn + ';font-weight:700">' + (r.dMedDn >= 0 ? '+' : '\u2212') + f$(Math.abs(r.dMedDn)) + '</td>';
      h += '<td style="font-family:JetBrains Mono,monospace;font-size:10px">' + succStr + '</td>';
      h += '</tr>';
    });
    h += '</tbody></table>';

    h += '<div style="font-size:10px;color:#888;font-style:italic;margin-top:6px">' +
      (fr
        ? 'Chaque d\u00e9lta provient d\'une simulation Monte Carlo compl\u00e8te \u2014 pas d\'approximation analytique. Les facteurs ne sont pas additifs: combiner plusieurs perturbations requiert une simulation combin\u00e9e d\u00e9di\u00e9e.'
        : 'Every delta originates from a complete Monte Carlo run \u2014 no closed-form approximation. Factors are not additive: combining multiple perturbations requires a dedicated combined simulation.') +
      '</div>';

    h += secPageEnd();
    return h;
  }

  // === SECTION: ADVISOR LETTER (page 2 of 18-22 plan) ===
  // One-page warm narrative from the advisor to the client. AI-generated via
  // `advisor_letter` slot; falls back to a phase-aware deterministic template
  // when AI absent so the page never looks empty.
  function renderAdvisorLetter(d) {
    var fr = d.fr;
    var name = d.fn ? F.esc(d.fn) : (fr ? 'Client' : 'Client');
    var today = F.fmtDate(null, fr);
    var h = '<div class="sec-page" id="sec-letter">';
    h += '<div style="padding:40px 20px 30px;font-family:Inter,sans-serif;line-height:1.85;font-size:12px;color:#2a2420">';
    h += '<div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">' + (fr ? 'Lettre pr\u00e9paratoire' : 'Opening letter') + '</div>';
    h += '<div style="font-size:18px;font-weight:700;color:' + C.gold + ';margin-bottom:20px">' + (fr ? 'Cher' + (d.p.sex === 'F' ? 'e' : '') + ' ' + name : 'Dear ' + name) + ',</div>';
    if (d.ai.advisor_letter) {
      h += F.AiBlock(d.ai.advisor_letter, fr);
    } else {
      // Deterministic phase-aware fallback — kept short, conditional, AMF-safe.
      var phase = d.R.phase;
      var yrsToRet = Math.max(0, (d.p.retAge || 65) - (d.p.age || 0));
      var body = '';
      if (phase === 'decum') {
        body = fr
          ? 'Ce rapport examine la viabilit\u00e9 de votre plan de d\u00e9caissement sur les ann\u00e9es \u00e0 venir. Nous avons mod\u00e9lis\u00e9 ' + (d.p.nSim || 5000) + ' trajectoires en int\u00e9grant les rendements, l\'inflation et la long\u00e9vit\u00e9. Les pages qui suivent pr\u00e9sentent ce que les chiffres indiquent, les sensibilit\u00e9s principales, et les points qui m\u00e9ritent votre attention.'
          : 'This report examines the viability of your retirement drawdown over the years ahead. We modelled ' + (d.p.nSim || 5000) + ' trajectories integrating returns, inflation, and longevity. The pages that follow set out what the numbers show, the main sensitivities, and the points that merit your attention.';
      } else if (phase === 'transition') {
        body = fr
          ? 'La retraite approche \u2014 dans environ ' + yrsToRet + ' ans. Ce rapport \u00e9value si votre trajectoire actuelle soutiendrait le niveau de vie projet\u00e9 et identifie les leviers qui auraient le plus d\'effet sur la probabilit\u00e9 de succ\u00e8s. Je vous invite \u00e0 lire en particulier les sections objectifs, revenus et fiscalit\u00e9.'
          : 'Retirement is approaching \u2014 approximately ' + yrsToRet + ' years away. This report evaluates whether your current trajectory would support the projected lifestyle, and identifies the levers with the largest effect on success probability. I encourage particular attention to the goals, income, and tax sections.';
      } else {
        body = fr
          ? 'Vous \u00eates en phase d\'accumulation, avec ' + yrsToRet + ' ans devant vous avant la retraite pr\u00e9vue. Les projections ' + (d.p.nSim || 5000) + ' sc\u00e9narios mod\u00e9lisent comment votre \u00e9pargne actuelle, combin\u00e9e \u00e0 vos cotisations et aux rendements de march\u00e9, pourrait \u00e9voluer. Les sections fiscalit\u00e9 et leviers r\u00e9v\u00e8lent les d\u00e9cisions qui auraient le plus de poids sur le long terme.'
          : 'You are in the accumulation phase, with ' + yrsToRet + ' years until planned retirement. The projections across ' + (d.p.nSim || 5000) + ' scenarios model how your current savings, combined with contributions and market returns, might evolve. The tax and levers sections highlight the decisions with the largest long-term weight.';
      }
      h += '<p class="narr">' + body + '</p>';
    }
    h += '<p class="narr" style="margin-top:18px;color:#555">' + (fr
      ? 'Les projections sont conditionnelles et non garanties. Chaque chiffre de ce rapport est traceable \u00e0 une sortie du moteur; aucune donn\u00e9e n\'est invent\u00e9e.'
      : 'Projections are conditional and not guaranteed. Every number in this report is traceable to an engine output; no data is invented.') + '</p>';
    h += '<div style="margin-top:30px;padding-top:12px;border-top:1px solid ' + C.border + ';font-size:11px;color:#666">' + today + '<br/><span style="font-size:10px">BuildFi Technologies inc.</span></div>';
    h += '</div></div>';
    return h;
  }

  // === SECTION: DRAW-ORDER STRATEGY (our differentiator) ===
  // Heatmap-style visualization of how retirement spending is funded each year.
  // Consumes `mc._enriched.drawTrace[]`. Rows = accounts, columns = ages;
  // cell darkness encodes $ drawn that year.
  function renderDrawOrder(d, secN) {
    if (!d.mc || !d.mc._enriched || !d.mc._enriched.drawTrace || d.mc._enriched.drawTrace.length === 0) return '';
    var fr = d.fr;
    var trace = d.mc._enriched.drawTrace;
    var f$ = F.fmtCompact;

    // Compute max draw per source to normalize heatmap intensity.
    var maxRRSP = 0, maxTFSA = 0, maxNR = 0, maxMelt = 0;
    trace.forEach(function(t) {
      if (t.rrsp > maxRRSP) maxRRSP = t.rrsp;
      if (t.tfsa > maxTFSA) maxTFSA = t.tfsa;
      if (t.nr > maxNR) maxNR = t.nr;
      if (t.melt > maxMelt) maxMelt = t.melt;
    });

    function cell(val, max, hue) {
      if (val <= 0 || max <= 0) return '<td style="background:#f9f7f2;color:#ccc;font-size:8px">\u2013</td>';
      var intensity = Math.min(1, val / max);
      var bg = intensity < 0.2 ? '#fdf9f0' : intensity < 0.4 ? '#f5e8c8' : intensity < 0.6 ? '#e8c878' : intensity < 0.8 ? '#c49a1a' : '#8a6a10';
      var fg = intensity >= 0.6 ? '#fff' : '#1a1a1a';
      return '<td style="background:' + bg + ';color:' + fg + ';font-size:8.5px;font-family:JetBrains Mono,monospace">' + (val >= 1000 ? Math.round(val / 1000) + 'K' : val) + '</td>';
    }

    var h = secPage();
    h += F.Sec(secN, fr ? 'Ordre des retraits' : 'Draw-order strategy', 'sec-draworder');

    h += narr(fr
      ? 'Ce tableau montre comment le financement des d\u00e9penses de retraite se r\u00e9partit entre vos comptes, ann\u00e9e apr\u00e8s ann\u00e9e. L\'intensit\u00e9 de couleur refl\u00e8te le montant retir\u00e9 de chaque source. Une strat\u00e9gie optimale tire d\'abord du non-enregistr\u00e9 et du meltdown REER avant les FERR obligatoires, puis du CELI en dernier recours.'
      : 'This table shows how retirement spending is funded across your accounts year by year. Colour intensity reflects the amount drawn from each source. An optimised strategy typically draws non-registered and RRSP meltdown first, then RRIF minimums, with TFSA preserved as the last resort.');

    // Limit to max 20 columns for readability
    var rows = trace.slice(0, 20);
    h += '<div style="overflow-x:auto;margin:8px 0">';
    h += '<table class="tbl" style="font-size:9px">';
    h += '<thead><tr><th style="text-align:left">' + (fr ? 'Compte' : 'Account') + '</th>';
    rows.forEach(function(t) { h += '<th>' + t.age + '</th>'; });
    h += '</tr></thead><tbody>';

    h += '<tr><td style="text-align:left;font-weight:700">REER/RRSP</td>';
    rows.forEach(function(t) { h += cell(t.rrsp, maxRRSP, 'gold'); });
    h += '</tr>';

    h += '<tr><td style="text-align:left;font-weight:700">' + (fr ? 'FERR min' : 'RRIF min') + '</td>';
    rows.forEach(function(t) { h += cell(t.rrifMin, maxRRSP, 'gold'); });
    h += '</tr>';

    h += '<tr><td style="text-align:left;font-weight:700">Meltdown</td>';
    rows.forEach(function(t) { h += cell(t.melt, maxMelt, 'gold'); });
    h += '</tr>';

    h += '<tr><td style="text-align:left;font-weight:700">NR</td>';
    rows.forEach(function(t) { h += cell(t.nr, maxNR, 'gold'); });
    h += '</tr>';

    h += '<tr><td style="text-align:left;font-weight:700">CELI/TFSA</td>';
    rows.forEach(function(t) { h += cell(t.tfsa, maxTFSA, 'gold'); });
    h += '</tr>';

    h += '</tbody></table></div>';

    h += '<div style="font-size:10px;color:#888;margin-top:6px">' +
      (fr ? 'Montants en milliers de dollars, chemin m\u00e9dian. Cellule vide (\u2013) = aucun retrait cette ann\u00e9e.'
          : 'Amounts in thousands of dollars, median path. Empty cell (\u2013) = no withdrawal that year.') + '</div>';

    h += secPageEnd();
    return h;
  }

  // === SECTION: STRESS TESTS (6 named scenarios) ===
  // Renders a one-page stress-matrix using the `mc._stress` payload populated
  // by gen-real-mc.mjs running 6 perturbed MC scenarios.
  function renderStressTests(d, secN) {
    var fr = d.fr;
    // Always emit the section anchor so downstream QA (report-qa.js) can
    // verify structural presence. When enrichment is missing, render a
    // short "data not available" note instead of the full matrix — keeps
    // report shape uniform across enriched vs unenriched pipelines.
    if (!d.mc || !d.mc._stress) {
      var h0 = secPage();
      h0 += F.Sec(secN, fr ? 'Tests de stress' : 'Stress tests', 'sec-stress');
      h0 += narr(fr
        ? 'Les tests de stress n\u2019ont pas \u00e9t\u00e9 calcul\u00e9s pour ce rapport. Lancez la comparaison des sc\u00e9narios dans l\u2019onglet Sensibilit\u00e9/Stress du planificateur pour obtenir la matrice compl\u00e8te (6 sc\u00e9narios \u00d7 500 simulations chacun).'
        : 'Stress tests were not computed for this report. Run the scenario comparison in the planner\u2019s Sensitivity/Stress tab to see the full matrix (6 scenarios \u00d7 500 simulations each).');
      h0 += secPageEnd();
      return h0;
    }
    var s = d.mc._stress;
    var f$ = F.fmtCompact;
    var baseMedF = d.mc.rMedF || d.mc.medF || 0;
    var baseSucc = d.mc.succ || 0;

    // Scenario metadata — labels + narrative hook per scenario
    var META = {
      gfc2008:       { fr: 'Crise financi\u00e8re 2008',         en: 'GFC 2008-style',              desc_fr: 'rendements fortement n\u00e9gatifs + volatilit\u00e9 accrue',          desc_en: 'strongly negative returns + elevated volatility' },
      stagflation73: { fr: 'Stagflation 1973-74',              en: '1973-74 stagflation',         desc_fr: 'choc rendements + inflation persistante \u00e0 4 %',                  desc_en: 'returns shock + persistent 4% inflation' },
      longevityPlus5: { fr: 'Long\u00e9vit\u00e9 +5 ans',        en: 'Longevity +5 years',          desc_fr: 'si vous viviez 5 ans de plus',                                       desc_en: 'if you lived 5 years longer' },
      lostDecade:    { fr: 'D\u00e9cennie perdue',             en: 'Lost decade',                 desc_fr: 'rendements effectifs \u22122,5 % par rapport au sc\u00e9nario de base', desc_en: 'effective returns \u22122.5% vs baseline' },
      persistentInf: { fr: 'Inflation persistante 4 %',        en: 'Persistent 4% inflation',     desc_fr: 'inflation structurellement \u00e9lev\u00e9e',                          desc_en: 'structurally elevated inflation' },
      spendingUp15:  { fr: 'D\u00e9penses +15 %',              en: 'Spending +15%',               desc_fr: 'besoins de retraite plus \u00e9lev\u00e9s que pr\u00e9vu',               desc_en: 'retirement needs higher than expected' }
    };

    var h = secPage();
    h += F.Sec(secN, fr ? 'Tests de stress' : 'Stress tests', 'sec-stress');

    h += narr(fr
      ? 'Six sc\u00e9narios nomm\u00e9s ont \u00e9t\u00e9 rejou\u00e9s en Monte Carlo (500 simulations chacun) avec des perturbations de param\u00e8tres repr\u00e9sentatives. Pour chaque sc\u00e9nario, le tableau montre le taux de succ\u00e8s obtenu et le patrimoine m\u00e9dian final, compar\u00e9 au sc\u00e9nario de base. Ces tests ne sont pas additifs et se lisent ind\u00e9pendamment.'
      : 'Six named scenarios were re-run in Monte Carlo (500 simulations each) with representative parameter perturbations. For each scenario, the table shows the resulting success rate and median final wealth, compared to baseline. Tests are not additive and read best independently.');

    h += '<table class="tbl"><thead><tr>';
    h += '<th style="text-align:left">' + (fr ? 'Sc\u00e9nario' : 'Scenario') + '</th>';
    h += '<th style="text-align:left">' + (fr ? 'Description' : 'Description') + '</th>';
    h += '<th>' + (fr ? 'Succ\u00e8s' : 'Success') + '</th>';
    h += '<th>' + (fr ? '\u0394 vs base' : '\u0394 vs base') + '</th>';
    h += '<th>' + (fr ? 'Patrimoine m\u00e9dian' : 'Median wealth') + '</th>';
    h += '</tr></thead><tbody>';

    Object.keys(META).forEach(function(k) {
      var run = s[k];
      if (!run) return;
      var meta = META[k];
      var dSucc = Math.round(((run.succ || 0) - baseSucc) * 100);
      var dMed = (run.medF || 0) - baseMedF;
      var succPct = Math.round((run.succ || 0) * 100);
      var succColor = succPct >= 80 ? C.green : succPct >= 60 ? C.amber : C.red;
      var deltaColor = dSucc >= 0 ? C.green : C.red;
      h += '<tr>';
      h += '<td style="font-weight:600">' + (fr ? meta.fr : meta.en) + '</td>';
      h += '<td style="font-family:Inter,sans-serif;color:#666;font-size:10px">' + (fr ? meta.desc_fr : meta.desc_en) + '</td>';
      h += '<td style="color:' + succColor + ';font-weight:700">' + succPct + '%</td>';
      h += '<td style="color:' + deltaColor + ';font-weight:700">' + (dSucc >= 0 ? '+' : '') + dSucc + ' pts</td>';
      h += '<td>' + f$(run.medF || 0) + '</td>';
      h += '</tr>';
    });
    h += '</tbody></table>';

    // Zero-dispersion detector — when every stress scenario returns a succ rate
    // within 5 pts of baseline AND identical medF, flag it as a structural
    // signal rather than leave the reader wondering why the table looks flat.
    var succs = Object.keys(META).map(function(k) { return s[k] ? (s[k].succ || 0) : 0; }).filter(function(x) { return x > 0; });
    var medFs = Object.keys(META).map(function(k) { return s[k] ? (s[k].medF || 0) : 0; });
    var succSpread = succs.length ? Math.max.apply(null, succs) - Math.min.apply(null, succs) : 0;
    var medFUnique = new Set(medFs.map(function(m) { return Math.round(m / 1000); })).size;
    if (succSpread < 0.05 && medFUnique <= 2) {
      h += '<div class="callout callout-breakeven" style="margin:10px 0">' +
        '<div class="callout-lbl" style="color:#4a6b8c">\u25b7 ' + (fr ? 'Lecture: stabilit\u00e9 structurelle' : 'Reading note: structural stability') + '</div>' +
        '<div style="font-size:11px;line-height:1.6;color:#333">' +
        (fr
          ? 'Les six sc\u00e9narios retournent un r\u00e9sultat quasi identique. Ce n\'est pas un artefact de simulation: cela signale que le patrimoine terminal est domin\u00e9 par un \u00e9v\u00e9nement d\u00e9terministe du plan (typiquement une vente d\'actif plan\u00e9e ou un flux garanti important) plut\u00f4t que par la variabilit\u00e9 des march\u00e9s. Le plan r\u00e9sisterait mieux qu\'un portefeuille d\'actifs \u00e9quivalent soumis aux seuls rendements — mais le d\u00e9clencheur structurel mentionn\u00e9 devient le point de vigilance r\u00e9el.'
          : 'The six scenarios return a nearly identical outcome. This is not a simulation artefact: it signals that terminal wealth is dominated by a deterministic event in the plan (typically a planned asset sale or a large guaranteed income flow) rather than by market variability. The plan would resist better than an equivalent market-exposed portfolio — but the structural trigger in question becomes the real point of vigilance.') +
        '</div></div>';
    }

    // AI interpretation if available
    if (d.ai.stress_interpretation) {
      h += F.AiBlock(d.ai.stress_interpretation, fr);
    }

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
    h += '<div style="flex-shrink:0">' + Ch.svgDonut(d.covRatio, fr ? 'Rev. garanti / dépenses' : 'Guaranteed / spending', covClr, 90) + '</div>';
    // Tag KPIs as household totals when couple to avoid per-person confusion.
    var _scopeTag = d.R.couple ? (fr ? ' (m\u00e9nage)' : ' (household)') : '';
    h += '<div style="flex:1"><div class="g3">';
    h += F.KPI('<span class="mono">' + fR(Math.round(d.gapM)) + '</span>/m', (fr ? '\u00c9cart mensuel' : 'Monthly gap') + _scopeTag, d.gapM > 0 ? C.red : C.green);
    h += F.KPI('<span class="mono">' + fR(Math.round(d.gapM * 12)) + '</span>' + (fr ? '/an' : '/yr'), (fr ? '\u00c9cart annuel' : 'Annual gap') + _scopeTag, d.gapM > 0 ? C.red : C.green);
    h += F.KPI('<span class="mono">' + fR(Math.round(d.govY)) + '</span>' + (fr ? '/an' : '/yr'), (fr ? 'Rev. gov.' : 'Gov. income') + _scopeTag, C.green);
    h += '</div></div></div>';

    // Couple-aware narrative: explicitly state "for the household" + spousal-spend total.
    var _spendY = ((p.retSpM || 0) + (d.R.couple ? (p.cRetSpM || 0) : 0)) * 12;
    var _scope = d.R.couple ? (fr ? ' du m\u00e9nage' : ' for the household') : '';
    var _scopeIncome = d.R.couple ? (fr ? ' (vous + conjoint(e))' : ' (you + spouse)') : '';
    var _covDet = fr
      ? 'Les revenus gouvernementaux (' + qLbl + ' + PSV' + (p.penType && p.penType !== 'none' ? ' + pension' : '') + ')' + _scopeIncome + ' totalisent <strong>' + fR(Math.round(d.govY)) + '</strong> par ann\u00e9e, ce qui couvre <strong>' + covPct + '%</strong> des d\u00e9penses de retraite pr\u00e9vues' + _scope + ' de ' + fR(_spendY) + '.' + (d.gapM > 0 ? ' L\u2019\u00e9cart de <strong>' + fR(Math.round(d.gapM)) + '</strong> par mois serait \u00e0 combler par des retraits d\u2019\u00e9pargne.' : ' Les revenus garantis couvrent l\u2019int\u00e9gralit\u00e9 des d\u00e9penses courantes.') + (d.R.couple ? ' Le fractionnement des revenus de pension pourrait r\u00e9duire la charge fiscale du m\u00e9nage.' : '')
      : 'Government income (' + qLbl + ' + OAS' + (p.penType && p.penType !== 'none' ? ' + pension' : '') + ')' + _scopeIncome + ' totals <strong>' + fR(Math.round(d.govY)) + '</strong> per year, covering <strong>' + covPct + '%</strong> of planned retirement spending' + _scope + ' of ' + fR(_spendY) + '.' + (d.gapM > 0 ? ' The gap of <strong>' + fR(Math.round(d.gapM)) + '</strong> per month would need to be funded from savings withdrawals.' : ' Guaranteed income covers all regular expenses.') + (d.R.couple ? ' Pension income splitting could reduce the household tax burden.' : '');
    h += narrAi(_covDet, d.ai.profile_summary, fr, fr ? 'Profil \u2014 Analyse IA' : 'Profile \u2014 AI Analysis');

    // Static contextual observation (only when no AI)
    if (!d.ai.profile_summary) {
      if (covPct >= 100) {
        h += F.Insight(fr ? 'Vos revenus gouvernementaux couvrent l\u2019int\u00e9gralit\u00e9 de vos d\u00e9penses pr\u00e9vues. L\u2019\u00e9pargne accumul\u00e9e constitue une marge de s\u00e9curit\u00e9 compl\u00e9mentaire.' : 'Your government income covers all planned spending. Accumulated savings provide an additional safety margin.');
      } else if (covPct < 40) {
        h += F.Warning(fr ? 'La couverture gouvernementale est faible (' + covPct + '%). Selon les projections, la plus grande partie des d\u00e9penses proviendrait des \u00e9pargnes et placements.' : 'Government coverage is low (' + covPct + '%). Projections indicate most of the spending would come from savings and investments.');
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
    // Consume enriched goals ledger when available (Phase 2) — maps by index.
    // Ledger fields: {desc, amount, targetAge, medianAvailable, probabilityMet,
    //                 status ('on-track'|'tight'|'at-risk'), cushion}
    var ledger = d.mc && d.mc._enriched && d.mc._enriched.goalsLedger ? d.mc._enriched.goalsLedger : [];
    var f$ = F.fmtCompact, fR = function(v) { return F.fmtMoney(v, fr); };
    var h = secPage();
    h += F.Sec(secN, F.L('goals', fr), 'sec-goals');

    var totalGoalCost = goals.reduce(function(s, g) { return s + (g.amount || 0); }, 0);
    var onTrackN = ledger.filter(function(l) { return l.status === 'on-track'; }).length;
    var atRiskN = ledger.filter(function(l) { return l.status === 'at-risk'; }).length;

    h += narr(fr
      ? 'Vous avez d\u00e9clar\u00e9 <strong>' + goals.length + ' objectif' + (goals.length > 1 ? 's' : '') + '</strong> pour un total de <strong>' + f$(totalGoalCost) + '</strong>. La probabilit\u00e9 de r\u00e9alisation est estim\u00e9e par interpolation percentile sur ' + (d.p.nSim || 5000) + ' simulations \u00e0 l\'\u00e2ge cible de chaque objectif.' + (onTrackN > 0 ? ' <strong>' + onTrackN + '</strong> objectif' + (onTrackN > 1 ? 's sont' : ' est') + ' en voie de r\u00e9alisation.' : '') + (atRiskN > 0 ? ' <strong>' + atRiskN + '</strong> paraissent \u00e0 risque.' : '')
      : 'You declared <strong>' + goals.length + ' goal' + (goals.length > 1 ? 's' : '') + '</strong> totalling <strong>' + f$(totalGoalCost) + '</strong>. Probability of achievement is estimated by percentile interpolation on ' + (d.p.nSim || 5000) + ' simulations at each goal\'s target age.' + (onTrackN > 0 ? ' <strong>' + onTrackN + '</strong> goal' + (onTrackN > 1 ? 's appear' : ' appears') + ' on track.' : '') + (atRiskN > 0 ? ' <strong>' + atRiskN + '</strong> appear at risk.' : ''));

    // Paradox framing — when a goal's probability_met substantially exceeds
    // the overall plan success rate, flag the conceptual gap explicitly.
    // Goals are measured at their target age (pre-depletion); overall success
    // is measured across the full horizon (may cross depletion later).
    var overallSucc = d.succVal != null ? Math.round(d.succVal * 100) : null;
    var maxProbMet = ledger.reduce(function(m, l) { return Math.max(m, l.probabilityMet || 0); }, 0);
    if (overallSucc != null && maxProbMet > 0 && (maxProbMet - overallSucc) >= 20) {
      h += '<div class="callout callout-warning" style="margin:8px 0">' +
        '<div class="callout-lbl" style="color:#a07818">\u26a0 ' + (fr ? 'Lecture: probabilit\u00e9 d\'objectif vs r\u00e9ussite du plan' : 'Reading note: goal probability vs plan success') + '</div>' +
        '<div style="font-size:11px;line-height:1.6;color:#333">' +
        (fr
          ? 'Les probabilit\u00e9s affich\u00e9es ici (jusqu\'\u00e0 <strong>' + maxProbMet + ' %</strong>) sont mesur\u00e9es \u00e0 l\'<em>\u00e2ge cible</em> de chaque objectif, avant la fin de l\'horizon. Le taux de succ\u00e8s global du plan (<strong>' + overallSucc + ' %</strong>) est mesur\u00e9 sur l\'ensemble de l\'horizon, qui peut inclure une d\u00e9pletion ult\u00e9rieure. Un objectif peut donc \u00eatre r\u00e9alisable \u00e0 50 ans m\u00eame si le plan \u00e9choue apr\u00e8s 75.'
          : 'The probabilities shown here (up to <strong>' + maxProbMet + '%</strong>) are measured at each goal\'s <em>target age</em>, before the end of the horizon. The overall plan success rate (<strong>' + overallSucc + '%</strong>) is measured across the full horizon, which may include later depletion. A goal can therefore be achievable at 50 even if the plan fails after 75.') +
        '</div></div>';
    }

    // Per-goal cards — one row each, uses enriched ledger when present, falls
    // back to goal.prob if engine output not enriched yet.
    h += '<div class="cd">';
    goals.forEach(function(g, i) {
      var led = ledger[i];
      var prob = led ? led.probabilityMet / 100 : (g.prob || g.probability || 0);
      var clr = prob >= 0.8 ? C.green : prob >= 0.5 ? C.amber : C.red;
      var statusLabel = led
        ? (led.status === 'on-track' ? (fr ? 'en voie' : 'on track')
           : led.status === 'tight' ? (fr ? 'serr\u00e9' : 'tight')
           : (fr ? '\u00e0 risque' : 'at risk'))
        : '';
      var cushion = led && led.cushion != null ? led.cushion : null;
      var probPct = Math.max(0, Math.min(100, Math.round(prob * 100)));
      h += '<div style="padding:12px 4px;border-bottom:1px solid #f0ece4">';
      h += '<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:6px">';
      h += '<div style="flex:1"><strong style="font-size:12px">' + F.esc(g.desc || g.name || '') + '</strong>';
      h += '<span style="color:#888;font-size:10px;margin-left:8px">' + (led ? (fr ? '\u00e0 ' : 'at ') + led.targetAge + (fr ? ' ans' : ' yrs') : '') + ' \u2014 ' + fR(g.amount || 0) + '</span></div>';
      h += '<div style="text-align:right"><span class="mono" style="font-size:15px;font-weight:700;color:' + clr + '">' + probPct + '%</span>';
      if (statusLabel) h += '<div style="font-size:9px;color:' + clr + ';text-transform:uppercase;letter-spacing:0.3px">' + statusLabel + '</div>';
      h += '</div></div>';
      // Progress bar — gradient fill at probPct%, threshold ticks at 50% and 80%
      h += '<div style="position:relative;height:10px;background:#f0ece4;border-radius:5px;overflow:hidden">' +
        '<div style="position:absolute;left:0;top:0;height:100%;width:' + probPct + '%;background:linear-gradient(90deg,' + clr + ' 0%,' + clr + 'dd 100%);border-radius:5px"></div>' +
        '<div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:#bbb"></div>' +
        '<div style="position:absolute;left:80%;top:0;bottom:0;width:1px;background:#999"></div>' +
        '</div>';
      h += '<div style="display:flex;justify-content:space-between;font-size:8.5px;color:#999;margin-top:2px;font-family:\"JetBrains Mono\",monospace">' +
        '<span>0%</span><span>' + (fr ? 'serré' : 'tight') + ' 50%</span><span>' + (fr ? 'en voie' : 'on-track') + ' 80%</span><span>100%</span>' +
        '</div>';
      // Detail line: median wealth at goal age + cushion ratio bar
      if (led) {
        var cushionLbl = cushion >= 0
          ? '<span style="color:' + C.green + '">+' + f$(cushion) + ' ' + (fr ? 'coussin' : 'cushion') + '</span>'
          : '<span style="color:' + C.red + '">−' + f$(-cushion) + ' ' + (fr ? 'manque' : 'shortfall') + '</span>';
        var ratio = led.medianAvailable > 0 ? Math.min(2, led.medianAvailable / Math.max(1, g.amount || 1)) : 0;
        var ratioPct = ratio * 50;
        var ratioCol = ratio >= 1 ? C.green : ratio >= 0.7 ? C.amber : C.red;
        h += '<div style="font-size:10px;color:#666;margin-top:8px">' +
          (fr ? 'Disponible ' : 'Available ') + '<span class="mono" style="color:#1a1610;font-weight:600">' + f$(led.medianAvailable) + '</span> ' +
          '<span style="color:#999">vs ' + (fr ? 'cible' : 'target') + ' ' + f$(g.amount) + '</span> \u2014 ' + cushionLbl + '</div>';
        h += '<div style="position:relative;height:5px;background:#f0ece4;border-radius:3px;overflow:hidden;margin-top:4px">' +
          '<div style="position:absolute;left:0;top:0;height:100%;width:' + Math.min(100, ratioPct) + '%;background:' + ratioCol + ';opacity:0.7;border-radius:3px"></div>' +
          '<div style="position:absolute;left:50%;top:-2px;bottom:-2px;width:2px;background:#333"></div>' +
          '</div>';
      }
      h += '</div>';
    });
    h += '</div>';

    // Post-data narrative — AI supersedes deterministic fallback
    var atRiskLeds = ledger.filter(function(l) { return l.status === 'at-risk'; });
    var _goalsDet = atRiskLeds.length > 0
      ? (fr
         ? atRiskLeds.length + ' objectif' + (atRiskLeds.length > 1 ? 's affichent' : ' affiche') + ' une probabilit\u00e9 inf\u00e9rieure \u00e0 50 % dans les simulations \u2014 les param\u00e8tres actuels ne suffiraient pas \u00e0 les r\u00e9aliser dans la majorit\u00e9 des trajectoires projet\u00e9es.'
         : atRiskLeds.length + ' goal' + (atRiskLeds.length > 1 ? 's show' : ' shows') + ' a probability below 50% in the simulations \u2014 current parameters would not be sufficient to achieve ' + (atRiskLeds.length > 1 ? 'them' : 'it') + ' in the majority of projected trajectories.')
      : '';

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
        fr: fr,
        yLabel: fr ? 'Patrimoine ($)' : 'Wealth ($)',
        annotations: [
          { age: p.retAge, label: fr ? 'Retraite' : 'Ret.' }
        ]
      });
    }

    // V1 BAN per REPORT-SHIP-RULES.md: this histogram was synthesized from
    // percentiles (not real engine output), and labeled "(approximation)" in
    // its title. Removed in V1 to avoid presenting an approximation with the
    // visual authority of a real chart.

    // Post-chart narrative — AI supersedes deterministic trajectory interpretation
    var _depAge = (mc.p5Ruin || 999) >= 200 ? null : mc.p5Ruin;
    if (d.hasMC && mc.pD && mc.pD.length > 0) {
      var _isRetired = d.R.phase === 'decum';
      var _trajDet = fr
        ? 'La simulation m\u00e9diane montre un patrimoine ' + (_isRetired ? 'actuel de' : 'atteignant') + ' <strong>' + f$(Math.round(_retWealth)) + '</strong>' + (_isRetired ? ', \u00e9voluant vers' : ' \u00e0 la retraite (' + p.retAge + ' ans), puis \u00e9voluant vers') + ' <strong>' + f$(Math.round(_p50End)) + '</strong> en fin d\u2019horizon. La fourchette probable (P25\u2013P75) se situe entre <strong>' + f$(Math.round(_p25End)) + '</strong> et <strong>' + f$(Math.round(_p75End)) + '</strong>.' + (_depAge ? ' Dans un sc\u00e9nario tr\u00e8s prudent, l\u2019\u00e9pargne pourrait \u00eatre enti\u00e8rement utilis\u00e9e vers <strong>' + _depAge + ' ans</strong> \u2014 les revenus gouvernementaux continueraient toutefois d\u2019\u00eatre vers\u00e9s.' : ' Le patrimoine reste positif sur tout l\u2019horizon, m\u00eame dans les sc\u00e9narios prudents.')
        : 'The median simulation shows ' + (_isRetired ? 'current wealth of' : 'wealth reaching') + ' <strong>' + f$(Math.round(_retWealth)) + '</strong>' + (_isRetired ? ', evolving to' : ' at retirement (age ' + p.retAge + '), then evolving to') + ' <strong>' + f$(Math.round(_p50End)) + '</strong> at the end of the horizon. The likely range (P25\u2013P75) is between <strong>' + f$(Math.round(_p25End)) + '</strong> and <strong>' + f$(Math.round(_p75End)) + '</strong>.' + (_depAge ? ' In a very cautious scenario, savings could be fully drawn down around <strong>age ' + _depAge + '</strong> \u2014 government income would continue regardless.' : ' Wealth remains positive throughout the horizon, even in cautious scenarios.');
      h += narrAi(_trajDet, d.ai.trajectory_insight, fr, fr ? 'Trajectoire \u2014 Analyse IA' : 'Trajectory \u2014 AI Analysis');
    }

    // Milestone table — keep transition years + 5-year cadence pre-75, 10-year past 75.
    // Past age 75 the curve flattens; biennial-to-decennial sampling carries the same signal
    // with much less ink (HNW reports were running 14+ rows here).
    var milestones = [p.age, p.retAge, 65, 72, 80, p.deathAge || 90];
    for (var _mi = Math.ceil(p.age / 5) * 5; _mi <= (p.deathAge || 90); _mi += (_mi >= 75 ? 10 : 5)) milestones.push(_mi);
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

    // CANONICAL coverage — the single value used everywhere in this section.
    // d.covRatio = (CPP + OAS + pension) / spend, averaged over retirement
    // years. Label it explicitly as "guaranteed income (public + pension)" so
    // the reader knows what's included. Previously this section computed a
    // separate `govPct = d.govM / d.totalSpM` that drifted from the KPI's
    // `covRatio`, producing the 41 vs 27, 48 vs 33, 110 vs 84 contradictions
    // codex flagged.
    var guarPct = Math.round(d.covRatio * 100);
    var wdPct = Math.max(0, 100 - guarPct);
    h += narr(fr
      ? 'Cette section d\u00e9taille la composition des revenus de retraite. Le <strong>revenu garanti combin\u00e9</strong> (RRQ + PSV + pension d\'employeur) couvre <strong>' + guarPct + ' %</strong> des d\u00e9penses cibles.' + (wdPct > 0 ? ' Les <strong>' + wdPct + ' %</strong> restants proviennent de retraits du portefeuille.' : ' Les retraits du portefeuille ne sont pas requis pour couvrir les d\u00e9penses cibles.')
      : 'This section details the composition of retirement income. <strong>Combined guaranteed income</strong> (CPP + OAS + employer pension) covers <strong>' + guarPct + ' %</strong> of target spending.' + (wdPct > 0 ? ' The remaining <strong>' + wdPct + ' %</strong> comes from portfolio withdrawals.' : ' Portfolio withdrawals are not needed to cover target spending.'));

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

    // === Profile-integrated subsection: spousal coordination for couples ===
    // Splitting eligibility, individual benefit timing, combined coverage — woven into Income.
    if (d.R.couple) {
      var primaryQppY = Math.round(d.qppM * 12);
      var primaryOasY = Math.round(d.oasM * 12);
      var spouseQppY = Math.round(d.cQppM * 12);
      var spouseOasY = Math.round(d.cOasM * 12);
      var combinedGovY = primaryQppY + primaryOasY + spouseQppY + spouseOasY;
      var splitEligible = (p.split === undefined || p.split === true);
      h += '<div style="font-size:11px;font-weight:600;color:' + C.gold + ';text-transform:uppercase;letter-spacing:.5px;margin:14px 0 6px">' +
        (fr ? 'Coordination conjugale' : 'Spousal Coordination') + '</div>';
      h += '<div class="cd" style="font-size:11px;line-height:1.6;background:#fdf9ee">';
      h += '<table style="width:100%;font-size:10px"><thead><tr style="border-bottom:1px solid ' + C.border + '">' +
        '<th style="text-align:left;padding:4px 0">' + (fr ? 'Composante' : 'Component') + '</th>' +
        '<th style="text-align:right">' + (fr ? 'Vous' : 'You') + '</th>' +
        '<th style="text-align:right">' + (fr ? 'Conjoint(e)' : 'Spouse') + '</th>' +
        '<th style="text-align:right">' + (fr ? 'M\u00e9nage' : 'Household') + '</th></tr></thead><tbody>';
      h += '<tr><td style="padding:3px 0">' + qLbl + (fr ? ' (annuel)' : ' (annual)') + '</td>' +
        '<td style="text-align:right;font-family:monospace">' + (primaryQppY > 0 ? f$(primaryQppY) : '\u2014') + '</td>' +
        '<td style="text-align:right;font-family:monospace">' + (spouseQppY > 0 ? f$(spouseQppY) : '\u2014') + '</td>' +
        '<td style="text-align:right;font-family:monospace;font-weight:700">' + f$(primaryQppY + spouseQppY) + '</td></tr>';
      h += '<tr><td style="padding:3px 0">PSV/OAS</td>' +
        '<td style="text-align:right;font-family:monospace">' + (primaryOasY > 0 ? f$(primaryOasY) : '\u2014') + '</td>' +
        '<td style="text-align:right;font-family:monospace">' + (spouseOasY > 0 ? f$(spouseOasY) : '\u2014') + '</td>' +
        '<td style="text-align:right;font-family:monospace;font-weight:700">' + f$(primaryOasY + spouseOasY) + '</td></tr>';
      h += '<tr><td style="padding:3px 0">' + (fr ? '\u00c2ge d\u00e9but ' : 'Start age ') + qLbl + '</td>' +
        '<td style="text-align:right;font-family:monospace">' + (p.qppAge || 65) + '</td>' +
        '<td style="text-align:right;font-family:monospace">' + (p.cQppAge || 65) + '</td>' +
        '<td></td></tr>';
      h += '</tbody></table>';
      h += '<div style="margin-top:6px">' + (fr
        ? 'Le revenu garanti combin\u00e9 atteint <strong>' + f$(combinedGovY) + '/an</strong>. ' + (splitEligible ? 'Le fractionnement de pension entre conjoints est disponible \u00e0 partir de 65 ans pour les revenus admissibles (FERR, pension d\'employeur), ce qui peut r\u00e9duire l\'imp\u00f4t conjugal.' : 'Le fractionnement n\'est pas activ\u00e9 dans ce sc\u00e9nario.')
        : 'Combined guaranteed income reaches <strong>' + f$(combinedGovY) + '/yr</strong>. ' + (splitEligible ? 'Pension income splitting between spouses becomes available at age 65 for eligible income (RRIF, employer pension), which can lower household tax.' : 'Income splitting is not active in this scenario.')) + '</div>';
      h += '</div>';
    }

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

    // Cash flow table — cap rows to control bloat. Cap is tighter than the
    // raw data length; key ages (retirement, 65, 72, 80, death) are always kept.
    if (revData.length > 0) {
      var maxRows = d.exp ? 22 : 18;
      var cfStep = Math.max(1, Math.ceil(revData.length / maxRows));
      var cfRows = revData.filter(function(r, i) {
        var keyAge = r.age === p.retAge || r.age === 65 || r.age === 72 || r.age === 80 || r.age === (p.deathAge || 90);
        return keyAge || i % cfStep === 0 || i === revData.length - 1;
      });
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
        // Income: salary in working years, government + withdrawals in retirement.
        // Engine populates r.sal/r.cSal; test harness must too.
        var preRet = r.age < p.retAge;
        var workInc = (r.sal || 0) + (r.cSal || 0);
        var retInc = (r.rrq || 0) + (r.psv || 0) + (r.pen || 0) + (r.ret || 0) + (r.srg || 0);
        var inc = preRet ? workInc : retInc;
        // Spending: engine writes r.spend; test harness writes r.sp/r.spending. Accept all.
        var spend = r.spend != null ? r.spend : (r.sp != null ? r.sp : (r.spending || 0));
        // Balance: engine writes a*-prefixed balances, harness writes bal*-prefixed. Accept both.
        var bal = r.balTot;
        if (bal == null) {
          bal = (r.aRR || r.balRR || 0) + (r.aTF || r.balTF || 0) + (r.aNR || r.balNR || 0)
              + (r.aCRR || r.balCRR || 0) + (r.aCTF || r.balCTF || 0) + (r.aCNR || r.balCNR || 0)
              + (r.aPE || 0) + (r.aPM || 0) + (r.aDC || 0) + (r.balLIRA || 0);
        }
        h += '<tr' + (isKey ? ' class="ret"' : '') + '>';
        h += '<td>' + r.age + '</td>';
        h += '<td>' + f$(Math.round(inc)) + '</td>';
        h += '<td>' + f$(Math.round(spend)) + '</td>';
        h += '<td style="color:' + C.red + '">' + f$(Math.round(r.tax || 0)) + '</td>';
        h += '<td>' + f$(Math.round(bal)) + '</td>';
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

    // Intro narrative — Phase 8 adds a province-specific fiscal reference
    // so the tax section reads as tailored to the client's actual jurisdiction.
    var _retLen = revData.filter(function(r) { return r.age >= p.retAge; }).length;
    var _provNote = '';
    var _prov = p.prov || 'QC';
    if (_prov === 'QC') {
      _provNote = fr
        ? ' Au Qu\u00e9bec, l\'<strong>abattement du Qu\u00e9bec</strong> (16,5 %) r\u00e9duit l\'imp\u00f4t f\u00e9d\u00e9ral et le fractionnement de pension reste permis entre conjoints.'
        : ' In Quebec, the <strong>Quebec abatement</strong> (16.5%) reduces federal tax, and pension income splitting between spouses remains permitted.';
    } else if (_prov === 'ON') {
      _provNote = fr
        ? ' En Ontario, une <strong>surtaxe progressive</strong> s\'ajoute \u00e0 l\'imp\u00f4t provincial lorsque ce dernier d\u00e9passe certains seuils, augmentant le taux effectif marginal dans les paliers sup\u00e9rieurs.'
        : ' In Ontario, a <strong>progressive surtax</strong> is added to provincial tax above certain thresholds, raising effective marginal rates in the upper brackets.';
    } else if (_prov === 'BC') {
      _provNote = fr
        ? ' En Colombie-Britannique, les paliers provinciaux sup\u00e9rieurs (jusqu\'\u00e0 20,5 %) rendent la coordination interprovinciale du revenu particuli\u00e8rement sensible.'
        : ' In British Columbia, upper provincial brackets (up to 20.5%) make inter-provincial income coordination particularly sensitive.';
    } else if (_prov === 'AB') {
      _provNote = fr
        ? ' L\'Alberta applique une structure d\'imp\u00f4t provincial \u00e0 cinq paliers avec un maximum de 15 %.'
        : ' Alberta applies a five-bracket provincial tax structure with a maximum rate of 15%.';
    }
    h += narr(fr
      ? 'La fiscalit\u00e9 d\u00e9termine la part de vos revenus de retraite que vous conservez r\u00e9ellement. L\u2019imp\u00f4t viager total est estim\u00e9 \u00e0 <strong>' + f$(Math.round(d._optTax)) + '</strong>, avec un taux effectif moyen de <strong>' + Math.round(d.avgEffRate * 100) + '%</strong> sur ' + _retLen + ' ann\u00e9es de retraite.' + (d.oasClbkYrs > 0 ? ' La r\u00e9cup\u00e9ration de la PSV touche <strong>' + d.oasClbkYrs + ' ann\u00e9e' + (d.oasClbkYrs > 1 ? 's' : '') + '</strong> sur ' + _retLen + '.' : '') + (d._taxAlpha !== null && d._taxAlpha > 0 ? ' La strat\u00e9gie de d\u00e9caissement optimis\u00e9e g\u00e9n\u00e8re un alpha fiscal de <strong>' + f$(Math.round(d._taxAlpha)) + '</strong>.' : '') + _provNote
      : 'Taxation determines how much of your retirement income you actually keep. Total lifetime tax is estimated at <strong>' + f$(Math.round(d._optTax)) + '</strong>, with an average effective rate of <strong>' + Math.round(d.avgEffRate * 100) + '%</strong> over ' + _retLen + ' retirement years.' + (d.oasClbkYrs > 0 ? ' OAS clawback affects <strong>' + d.oasClbkYrs + ' year' + (d.oasClbkYrs > 1 ? 's' : '') + '</strong> out of ' + _retLen + '.' : '') + (d._taxAlpha !== null && d._taxAlpha > 0 ? ' The optimized withdrawal strategy generates a tax alpha of <strong>' + f$(Math.round(d._taxAlpha)) + '</strong>.' : '') + _provNote);

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

    // === Profile-integrated subsection: CCPC owners get Corporate Integration here ===
    // Salary vs dividend trade-off + integrated tax rate, woven into Tax instead of bolted on as separate section.
    if (d.R.ccpc) {
      var corpRetained = p.bizRetainedEarnings || 0;
      var corpRev = p.bizRevenue || 0;
      var sbdLimit = 500000;
      var sbdEligibleY = Math.min(corpRev * 0.20, sbdLimit);
      var sbdRate = p._isQC ? 0.122 : 0.115; // QC combined SBD rate; ROC roughly 11-13%
      var integrated = p._isQC ? 0.461 : 0.453; // top-bracket eligible-div integrated rate (ON/QC ~46%)
      h += '<div style="font-size:11px;font-weight:600;color:' + C.gold + ';text-transform:uppercase;letter-spacing:.5px;margin:14px 0 6px">' +
        (fr ? 'Int\u00e9gration corporative' : 'Corporate Integration') + '</div>';
      h += '<div class="cd" style="font-size:11px;line-height:1.6;background:#fdf9ee">';
      h += (fr
        ? 'La SPCC b\u00e9n\u00e9ficie de la d\u00e9duction pour petites entreprises sur les premiers <strong>' + F.fmtCurrency(sbdLimit) + '</strong> de revenu actif (taux combin\u00e9 estim\u00e9 \u00e0 <strong>' + (sbdRate * 100).toFixed(1) + '%</strong>). Le b\u00e9n\u00e9fice net retenu (~' + F.fmtCurrency(Math.round(sbdEligibleY * (1 - sbdRate))) + '/an) compose dans la corporation jusqu\'\u00e0 l\'extraction.'
        : 'The CCPC benefits from the small business deduction on the first <strong>' + F.fmtCurrency(sbdLimit) + '</strong> of active income (combined rate estimated at <strong>' + (sbdRate * 100).toFixed(1) + '%</strong>). Retained earnings (~' + F.fmtCurrency(Math.round(sbdEligibleY * (1 - sbdRate))) + '/yr) compound inside the corporation until extraction.');
      h += '<br/><br/>';
      h += (fr
        ? 'Au moment de l\'extraction, le taux d\'int\u00e9gration combin\u00e9 (corp + personnel sur dividende d\u00e9termin\u00e9) ressort autour de <strong>' + (integrated * 100).toFixed(1) + '%</strong>, l\u00e9g\u00e8rement plus que sur un salaire pour un actionnaire en haut palier. Le solde corporatif actuel de <strong>' + f$(corpRetained) + '</strong> repr\u00e9sente une r\u00e9serve fiscalement diff\u00e9r\u00e9e \u2014 son timing d\'extraction influence directement la facture viag\u00e8re.'
        : 'At extraction, the integrated rate (corp + personal on eligible dividend) lands around <strong>' + (integrated * 100).toFixed(1) + '%</strong>, slightly above straight salary for a top-bracket shareholder. The current corporate balance of <strong>' + f$(corpRetained) + '</strong> is a tax-deferred reserve \u2014 its extraction timing directly drives lifetime tax.');
      h += '</div>';
    }

    // Post-data narrative — AI supersedes deterministic
    var _taxDet = fr
      ? 'La strat\u00e9gie de d\u00e9caissement ' + (p.wStrat === 'optimized' ? 'optimis\u00e9e coordonne' : 'standard r\u00e9partit') + ' les retraits entre REER, CELI et non-enregistr\u00e9 pour minimiser l\u2019imp\u00f4t viager.' + (p.melt ? ' Le meltdown REER acc\u00e9l\u00e8re les retraits avant 72 ans avec une cible de ' + F.fmtCurrency(p.meltTgt) + ' par ann\u00e9e.' : '') + (p.split ? ' Le fractionnement de revenus de pension \u00e0 ' + Math.round((p.splitP || 0) * 100) + '% r\u00e9duit l\u2019imp\u00f4t du m\u00e9nage.' : '') + ' La courbe de d\u00e9penses Go-Go/Slow-Go/No-Go refl\u00e8te un ralentissement progressif des d\u00e9penses avec l\u2019\u00e2ge.'
      : 'The ' + (p.wStrat === 'optimized' ? 'optimized withdrawal strategy coordinates' : 'standard withdrawal strategy distributes') + ' withdrawals across RRSP, TFSA, and non-registered accounts to minimize lifetime tax.' + (p.melt ? ' RRSP meltdown accelerates withdrawals before age 72 with a target of ' + F.fmtCurrency(p.meltTgt) + ' per year.' : '') + (p.split ? ' Pension income splitting at ' + Math.round((p.splitP || 0) * 100) + '% reduces household tax.' : '') + ' The Go-Go/Slow-Go/No-Go spending curve reflects a gradual decline in spending with age.';

    // Withdrawal detail table (expert)
    if (exp && revData.length > 0) {
      var _wdHorizon = Math.min(30, (p.deathAge || 90) - p.retAge);
      var _wdAll = revData.filter(function(r) { return r.age >= p.retAge && r.age <= p.retAge + _wdHorizon; });
      // Tighter cap: 16 rows max for withdrawal detail (was 20+).
      var _wdStep = Math.max(1, Math.ceil(_wdAll.length / 16));
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
          // Withdrawal columns — engine writes wFromRR/wFromTF/wFromNR (annual draws).
          // aRR/aTF/aNR are end-of-year balances in the engine schema, NOT withdrawals.
          var wRR = r.wFromRR != null ? r.wFromRR : 0;
          var wTF = r.wFromTF != null ? r.wFromTF : 0;
          var wNR = r.wFromNR != null ? r.wFromNR : 0;
          h += '<td>' + (wRR > 0 ? fR(wRR) : '\u2014') + '</td>';
          h += '<td>' + (wTF > 0 ? fR(wTF) : '\u2014') + '</td>';
          h += '<td>' + (wNR > 0 ? fR(wNR) : '\u2014') + '</td>';
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

    // Fee impact KPIs — only when MER was actually entered (user input).
    if (d.merWt > 0.003) {
      h += '<div class="g3" style="margin-top:8px">';
      h += F.KPI('<span class="mono">' + (d.merWt * 100).toFixed(2) + '%</span>', _term('mer', 'MER') + ' ' + (fr ? 'moyen pondéré (saisi)' : 'weighted avg (entered)'), d.merWt > 0.01 ? C.red : C.green);
      h += F.KPI('<span class="mono">' + f$(Math.round(d.feeCost)) + '</span>', fr ? 'Co\u00fbt total frais' : 'Total fee cost', C.amber);
      h += F.KPI('<span class="mono">' + Math.round(d.horizon) + (fr ? ' ans' : ' yrs') + '</span>', fr ? 'Horizon' : 'Horizon', C.blue);
      h += '</div>';
    }
    // MER impact comparison table — always shown so the reader can place
    // themselves on the spectrum of placement types. Hypotheses explicit.
    h += _renderMERImpactTable(d, fr, f$);

    h += narrAi(_taxDet, d.ai.taxInsight, fr, fr ? 'Fiscalit\u00e9 \u2014 Analyse IA' : 'Tax \u2014 AI Analysis');
    h += secPageEnd();
    return h;
  }

  // === MER IMPACT COMPARISON TABLE ===
  // Educational: places the reader on the spectrum of placement types with
  // explicit hypotheses (capital base, gross return, horizon). Highlights the
  // row matching the user's actual MER if available.
  function _renderMERImpactTable(d, fr, f$) {
    var p = d.p;
    var capBase = Math.max(50000, Math.round(((p.rrsp || 0) + (p.tfsa || 0) + (p.nr || 0) + (p.lira || 0)) / 1000) * 1000);
    if (capBase < 100000) capBase = 100000;
    var grossR = Math.max(0.04, Math.min(0.08, p.eqRet || p.eqRetS || 0.06));
    var horizon = Math.max(10, Math.min(40, Math.round((p.deathAge || 90) - (p.age || 35))));
    function feeDrag(merPct) {
      var mer = merPct / 100;
      var fvGross = capBase * Math.pow(1 + grossR, horizon);
      var fvNet = capBase * Math.pow(1 + (grossR - mer), horizon);
      return Math.max(0, fvGross - fvNet);
    }
    var rows = [
      { label: fr ? 'FNB indiciels (XEQT, VEQT, etc.)' : 'Index ETFs (XEQT, VEQT, etc.)', mer: 0.20, note: fr ? 'Gestion passive — frais minimaux' : 'Passive management — minimal fees' },
      { label: fr ? 'Robo-conseiller (Wealthsimple, Questwealth)' : 'Robo-advisor (Wealthsimple, Questwealth)', mer: 0.50, note: fr ? 'Allocation automatisée + rééquilibrage' : 'Automated allocation + rebalancing' },
      { label: fr ? 'Gestion privée (haut de gamme)' : 'Private wealth management (high-end)', mer: 1.00, note: fr ? 'Conseil personnalisé, seuil souvent 500K$+' : 'Personalized advice, typical threshold $500K+' },
      { label: fr ? 'Fonds communs (banque, courtier traditionnel)' : 'Mutual funds (bank, traditional broker)', mer: 2.00, note: fr ? 'Frais courants au Canada — souvent par défaut' : 'Common in Canada — often the default' },
      { label: fr ? 'Fonds communs avec frais de souscription (DSC)' : 'Mutual funds with deferred sales charge (DSC)', mer: 2.50, note: fr ? 'Anciens fonds avec pénalité de retrait' : 'Legacy funds with redemption penalty' }
    ];
    var userMer = (d.merWt > 0.003) ? d.merWt * 100 : null;
    var fvGrossFinal = capBase * Math.pow(1 + grossR, horizon);
    var h = '';
    h += '<div style="margin:14px 0 6px"><div style="font-size:11px;font-weight:700;color:' + C.gold + ';text-transform:uppercase;letter-spacing:.5px">' + (fr ? 'Impact des frais de gestion (MER) selon le type de placement' : 'Management fee (MER) impact by placement type') + '</div></div>';
    h += '<div style="font-size:10px;color:#666;margin:4px 0 8px;background:#f5f8fc;border-left:3px solid ' + C.blue + ';padding:6px 10px;line-height:1.55">' +
      '<strong>' + (fr ? 'Hypothèses :' : 'Assumptions:') + '</strong> ' +
      (fr ? 'capital de base ' : 'starting capital ') + '<span class="mono">' + f$(capBase) + '</span> · ' +
      (fr ? 'rendement brut ' : 'gross return ') + '<span class="mono">' + (grossR * 100).toFixed(1) + '\u00a0%</span> ' +
      (fr ? 'avant frais ' : 'before fees ') + '· ' +
      (fr ? 'horizon ' : 'horizon ') + '<span class="mono">' + horizon + (fr ? ' ans' : ' yrs') + '</span> · ' +
      (fr ? 'composition annuelle, aucun retrait, aucun ajout. Les frais réels varient selon la série de fonds, le conseiller et la province.' : 'annual compounding, no withdrawals, no contributions. Actual fees vary by fund series, advisor, and province.') +
      '</div>';
    h += '<table class="tbl"><thead><tr>';
    h += '<th style="text-align:left">' + (fr ? 'Type de placement' : 'Placement type') + '</th>';
    h += '<th style="text-align:right">MER</th>';
    h += '<th style="text-align:right">' + (fr ? 'Coût cumulé sur ' : 'Cumulative cost over ') + horizon + (fr ? ' ans' : ' yrs') + '</th>';
    h += '<th style="text-align:right">' + (fr ? '% du capital final' : '% of final capital') + '</th>';
    h += '<th style="text-align:left;font-size:9.5px">' + (fr ? 'Note' : 'Note') + '</th>';
    h += '</tr></thead><tbody>';
    rows.forEach(function(r) {
      var drag = feeDrag(r.mer);
      var pctOfFinal = (drag / fvGrossFinal) * 100;
      var col = r.mer < 0.5 ? C.green : r.mer < 1.5 ? C.amber : C.red;
      var isUser = userMer != null && Math.abs(userMer - r.mer) < 0.25;
      h += '<tr' + (isUser ? ' style="background:#fffbe8"' : '') + '>';
      h += '<td>' + (isUser ? '<strong>\u25ba ' : '') + r.label + (isUser ? ' — ' + (fr ? 'votre situation estimée' : 'your estimated situation') + '</strong>' : '') + '</td>';
      h += '<td style="text-align:right;font-weight:600;color:' + col + '" class="mono">' + r.mer.toFixed(2) + '\u00a0%</td>';
      h += '<td style="text-align:right" class="mono">' + f$(Math.round(drag)) + '</td>';
      h += '<td style="text-align:right;color:' + col + '" class="mono">' + pctOfFinal.toFixed(1) + '\u00a0%</td>';
      h += '<td style="font-size:9.5px;color:#666">' + r.note + '</td>';
      h += '</tr>';
    });
    h += '</tbody></table>';
    h += '<div style="font-size:9.5px;color:#888;margin-top:6px;line-height:1.5">' +
      (fr ? 'Lecture : un MER de 2\u00a0% applique environ 2\u00a0% du solde par année. Sur un horizon long, la composition transforme cette différence en montants importants. Ce tableau est éducatif et ne constitue pas une recommandation.'
          : 'Reading note: a 2% MER deducts roughly 2% of the balance each year. Over a long horizon, compounding turns that gap into substantial amounts. This table is educational and not a recommendation.') +
      '</div>';
    return h;
  }

  // === SECTION: GIS ===
  function renderGIS(d, secN) {
    var fr = d.fr, revData = d.revData, exp = d.exp, p = d.p;
    var fR = function(v) { return F.fmtMoney(v, fr); };
    var f$ = F.fmtCompact;
    // PLAUSIBILITY GATE — engine sometimes emits GIS values for years where
    // taxable income (excluding OAS) plainly exceeds the eligibility ceiling.
    // Filter at the section level: keep only years where non-OAS taxable
    // income is below a defensible 2026 ceiling (~$22K single, ~$30K each in
    // a couple). Anything above is engine noise from edge-case branches and
    // would be clawed back to zero in reality.
    var gisCap = p.cOn ? 30000 : 22000;
    var _gisYrs = revData.filter(function(r) {
      if (r.age < 65) return false;
      var raw = r.srg || r.gis || 0;
      if (raw <= 0) return false;
      var nonOasIncome = (r.taxInc || 0) - (r.psv || 0);
      return nonOasIncome >= 0 && nonOasIncome < gisCap;
    });
    if (_gisYrs.length === 0) return '';
    // Hard plausibility floor: even when filter passes, suppress the section
    // for clearly-affluent profiles. Total liquid assets at age 65 are a
    // simple guard: a household with > $400K (couple) or > $250K (single) in
    // registered/non-registered savings will not realistically receive GIS.
    var totalLiquidAt65 = (p.rrsp || 0) + (p.tfsa || 0) + (p.nr || 0) + (p.lira || 0)
                        + (p.cRRSP || 0) + (p.cTFSA || 0) + (p.cNR || 0);
    var liquidCeiling = p.cOn ? 400000 : 250000;
    if (totalLiquidAt65 > liquidCeiling) return '';

    var h = secPage();
    h += F.Sec(secN, _term('gis', F.L('gis', fr)), 'sec-gis');

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
      h += '<tr><td style="font-family:Inter,sans-serif">' + F.esc(dd.name || dd.desc || (fr ? 'Dette' : 'Debt')) + '</td>';
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

  // === SECTION: INSURANCE (conditional — rendered only when policies exist) ===
  // Surfaces user-entered life insurance + disability in the report. STRICTLY
  // observational: reflects existing coverage, describes impact on estate and
  // cashflow, and routes the user to a licensed advisor for recommendations.
  // No premium quotes, no product recommendations, no "you should buy" copy.
  // AMF/OSFI compliance:
  //   - conditional language ("la couverture actuelle ajoute…", "Les projections")
  //   - premium shown as user's entered value (not a quote we produce)
  //   - explicit disclaimer + advisor handoff at section end
  function renderInsurance(d, secN) {
    var p = d.p, fr = d.fr;
    var lifeUser = p.lifeInsBenefit || 0;
    var lifeSp = (p.cOn ? (p.cLifeInsBenefit || 0) : 0);
    var premUser = p.lifeInsPremium || 0;
    var premSp = (p.cOn ? (p.cLifeInsPremium || 0) : 0);
    var dProb = p.disabProb || 0;
    var dMo = p.disabilityMonths || p.disabMo || 0;
    var dOn = dProb > 0 && p.age < p.retAge;
    // Nothing to render: no policies, no disability
    if (lifeUser + lifeSp <= 0 && !dOn) return '';

    var fR = function(v) { return F.fmtMoney(v, fr); };
    var f$ = F.fmtCompact;
    var h = secPage();
    h += F.Sec(secN, F.L('insurance', fr), 'sec-insurance');

    // Intro narrative — strictly observational
    var totalFace = lifeUser + lifeSp;
    var totalPrem = premUser + premSp;
    var yearsToRet = Math.max(0, (p.retAge || 65) - (p.age || 35));
    var lifetimePremAccum = totalPrem * yearsToRet; // rough nominal (no indexation)
    h += narr(fr
      ? 'Vous avez renseign\u00e9 <strong>' + f$(totalFace) + '</strong> de capital-d\u00e9c\u00e8s total' + (p.cOn && lifeSp > 0 ? ' (vous + conjoint)' : '') + (totalPrem > 0 ? ', avec des primes annuelles de <strong>' + fR(totalPrem) + '</strong>' : '') + '. Le capital-d\u00e9c\u00e8s est ajout\u00e9 \u00e0 la succession m\u00e9diane (libre d\u2019imp\u00f4t). Les primes r\u00e9duisent l\u2019\u00e9pargne nette durant l\u2019accumulation.'
      : 'You have entered <strong>' + f$(totalFace) + '</strong> total life coverage' + (p.cOn && lifeSp > 0 ? ' (you + spouse)' : '') + (totalPrem > 0 ? ', with annual premiums of <strong>' + fR(totalPrem) + '</strong>' : '') + '. The death benefit adds to projected median estate (tax-free). Premiums reduce net savings during accumulation.');

    // Coverage table
    if (totalFace > 0) {
      h += F.CopyBtn('rpt-t-ins');
      h += '<table id="rpt-t-ins" class="tbl"><thead><tr>';
      h += '<th style="text-align:left">' + (fr ? 'Assur\u00e9' : 'Insured') + '</th>';
      h += '<th>' + (fr ? 'Capital-d\u00e9c\u00e8s' : 'Death benefit') + '</th>';
      h += '<th>' + (fr ? 'Prime annuelle' : 'Annual premium') + '</th>';
      h += '<th>' + (fr ? 'Primes cumul. (\u00e0 retraite)' : 'Cumul. premiums (to ret.)') + '</th>';
      h += '</tr></thead><tbody>';
      if (lifeUser > 0) {
        h += '<tr><td style="font-family:Inter,sans-serif">' + (fr ? 'Vous' : 'You') + '</td>';
        h += '<td>' + fR(lifeUser) + '</td>';
        h += '<td>' + (premUser > 0 ? fR(premUser) : '\u2014') + '</td>';
        h += '<td>' + (premUser > 0 ? fR(premUser * yearsToRet) : '\u2014') + '</td></tr>';
      }
      if (lifeSp > 0) {
        h += '<tr><td style="font-family:Inter,sans-serif">' + (fr ? 'Conjoint' : 'Spouse') + '</td>';
        h += '<td>' + fR(lifeSp) + '</td>';
        h += '<td>' + (premSp > 0 ? fR(premSp) : '\u2014') + '</td>';
        h += '<td>' + (premSp > 0 ? fR(premSp * yearsToRet) : '\u2014') + '</td></tr>';
      }
      h += '</tbody></table>';
    }

    // KPI strip
    h += '<div class="g3" style="margin-top:8px">';
    if (totalFace > 0) h += F.KPI('<span class="mono">' + fR(totalFace) + '</span>', fr ? 'Capital-d\u00e9c\u00e8s total' : 'Total life coverage', C.blue);
    if (totalPrem > 0) h += F.KPI('<span class="mono">' + fR(totalPrem) + '</span>/' + (fr ? 'an' : 'yr'), fr ? 'Primes annuelles' : 'Annual premiums', C.amber);
    if (totalFace > 0 && d.mc && d.mc.medEstateNet) h += F.KPI('<span class="mono">' + f$(d.mc.medEstateNet) + '</span>', fr ? 'H\u00e9ritage m\u00e9dian P50' : 'Median estate P50', C.green);
    h += '</div>';

    // Disability block (if enabled)
    if (dOn) {
      h += '<div class="cd" style="margin-top:10px;padding:10px 12px;border-left:3px solid ' + C.amber + '">';
      h += '<div style="font-weight:600;color:' + C.amber + ';font-size:12px;margin-bottom:4px">' + (fr ? 'Risque d\u2019invalidit\u00e9 mod\u00e9lis\u00e9' : 'Modeled disability risk') + '</div>';
      h += '<div style="font-size:11px;color:#666;line-height:1.5">';
      h += fr
        ? 'Probabilit\u00e9 annuelle d\u2019interruption de revenu : <strong>' + Math.round(dProb * 100) + '%</strong>. Dur\u00e9e moyenne : <strong>' + dMo + ' mois</strong>. L\u2019impact sur le salaire est int\u00e9gr\u00e9 au Monte Carlo (r\u00e9duction temporaire des cotisations).'
        : 'Annual probability of income interruption: <strong>' + Math.round(dProb * 100) + '%</strong>. Average duration: <strong>' + dMo + ' months</strong>. Salary impact is integrated in Monte Carlo (temporary contribution reduction).';
      h += '</div></div>';
    }

    // Post-data observation (AI-free — insurance is sensitive, keep it deterministic)
    h += narr(fr
      ? 'Les projections indiquent que la couverture vie actuelle compense <strong>' + (totalFace > (d.mc && d.mc.medEstateTax || 0) ? f$(d.mc.medEstateTax || 0) : f$(totalFace)) + '</strong> de l\u2019imp\u00f4t successoral estim\u00e9. Un \u00e9cart entre les besoins (revenu survivant, dettes, d\u00e9pendants) et la couverture totale pourrait subsister selon votre situation personnelle.'
      : 'Projections indicate the current life coverage offsets <strong>' + (totalFace > (d.mc && d.mc.medEstateTax || 0) ? f$(d.mc.medEstateTax || 0) : f$(totalFace)) + '</strong> of estimated estate tax. A gap between needs (survivor income, debts, dependents) and total coverage may remain depending on personal circumstances.');

    // Disclaimer — AMF-safe handoff
    h += F.Insight(fr
      ? '<strong>Portée de cette section.</strong> Modélisation éducative du capital-décès et des primes que vous avez renseignés. Ce n\u2019est pas un conseil en assurance ni une évaluation de suffisance. Pour une recommandation personnalisée, consultez un conseiller accrédité (AMF au Québec, ou l\u2019autorité provinciale applicable).'
      : '<strong>Scope of this section.</strong> Educational modeling of the death benefits and premiums you entered. This is not insurance advice or a sufficiency assessment. For a personalized recommendation, consult a licensed insurance advisor (AMF in Quebec, or your applicable provincial authority).');

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
      ? 'Les strat\u00e9gies ci-dessus sont observ\u00e9es \u00e0 partir des donn\u00e9es du moteur de calcul. Leur impact est estim\u00e9 en comparant le sc\u00e9nario de base au sc\u00e9nario modifi\u00e9. L\u2019application r\u00e9elle de ces strat\u00e9gies d\u00e9pend de votre situation personnelle et pourrait \u00eatre valid\u00e9e avec un planificateur financier.'
      : 'The strategies above are observed from the calculation engine data. Their impact is estimated by comparing the baseline scenario to the modified scenario. Actual implementation depends on your personal situation and may be validated with a financial planner.';
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
    var _durLabelR = (mc.p5Ruin || 999) >= 200
      ? (fr ? 'Jusqu\'\u00e0 ' + (p.deathAge || 90) + ' ans' : 'Through age ' + (p.deathAge || 90))
      : mc.p5Ruin + (fr ? ' ans' : ' yrs');
    h += F.KPI('<span class="mono">' + _durLabelR + '</span>', fr ? 'Durabilit\u00e9 \u00e9pargne' : 'Savings durability', (mc.p5Ruin || 999) >= 200 ? C.green : C.amber);
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
        h += '<tr><td style="font-family:Inter,sans-serif">' + F.esc(st.name || st.label || '') + '</td>';
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

    // The 2D sensitivity heatmap lives in its own #sec-sensitivity section
    // (not gated on expert mode) so all profiles see it. Previously also
    // emitted here, which produced a duplicate for expert profiles.

    var _riskDet = fr
      ? 'La fourchette P25\u2013P75 de <strong>' + f$(Math.round(_spread25)) + '</strong> repr\u00e9sente la zone o\u00f9 se situe votre patrimoine dans la moiti\u00e9 des sc\u00e9narios simul\u00e9s. Plus cette fourchette est \u00e9troite, plus le r\u00e9sultat est pr\u00e9visible.'
      : 'The P25\u2013P75 range of <strong>' + f$(Math.round(_spread25)) + '</strong> represents the zone where your wealth falls in half of all simulated scenarios. A narrower range means more predictable outcomes.';
    h += narrAi(_riskDet, d.ai.riskInsight || d.ai.risk_plain_language, fr, fr ? 'Risque \u2014 Analyse IA' : 'Risk \u2014 AI Analysis');
    // Methodology footer
    h += _methodFooter(fr
      ? '<strong>Fourchette P25–P75</strong> : zone où se situe votre patrimoine dans la moitié des ' + (d.p.nSim || 5000) + ' simulations Monte Carlo. <strong>Tornado</strong> : impact sur le patrimoine final médian quand chaque paramètre varie seul de ±1 écart-type. La carte thermique de sensibilité figure dans la section dédiée.'
      : '<strong>P25–P75 range</strong>: zone where your wealth falls in half of the ' + (d.p.nSim || 5000) + ' Monte Carlo simulations. <strong>Tornado</strong>: impact on median final wealth when each parameter varies alone by ±1 standard deviation. The sensitivity heatmap appears in its own dedicated section.', fr);
    h += secPageEnd();
    return h;
  }

  // ─── Inline helpers (kept here to avoid touching report-formatters.js) ──

  // Glossary term wrap — dotted underline + hover/click tooltip via the
  // browser-side report-glossary.js (BFGlossary.terms[key] supplies the def).
  function _term(key, text) {
    return '<span class="bf-term" data-term="' + key + '">' + text + '</span>';
  }

  // Confidence indicator — small icon ◉ ◐ ○ next to projected numbers.
  function _confDot(level, fr) {
    var icon, color, hint;
    if (level === 'user')    { icon = '\u25c9'; color = '#2a8c46'; hint = fr ? 'Saisi par vous — confiance élevée' : 'User-provided — high confidence'; }
    else if (level === 'derived') { icon = '\u25d0'; color = '#b89830'; hint = fr ? 'Calculé à partir de vos saisies — confiance moyenne' : 'Derived from your inputs — medium confidence'; }
    else { icon = '\u25cb'; color = '#888'; hint = fr ? 'Hypothèse modèle — voir méthodologie' : 'Model assumption — see methodology'; }
    return '<span class="bf-conf-dot" style="color:' + color + ';font-size:11px;margin-left:4px;cursor:help;vertical-align:middle" title="' + hint + '" aria-label="' + hint + '">' + icon + '</span>';
  }

  // Methodology footer — collapsible "How is this calculated?" details element.
  // CSS is provided by report-interactive.js runtime style injection
  // (.bf-method-foot) so we just emit the markup here.
  function _methodFooter(body, fr) {
    if (!body) return '';
    return '<details class="bf-method-foot">' +
      '<summary>' + (fr ? 'Comment c\'est calculé ?' : 'How is this calculated?') + '</summary>' +
      '<div class="bf-method-foot-body">' + body + '</div>' +
    '</details>';
  }

  // Glossary appendix renderer — calls BFGlossary.renderAppendix(lang) which
  // returns a 2-column <dl> of every term defined in report-glossary.js.
  function _renderGlossaryAppendix(d, secN) {
    var fr = d.fr;
    var lang = fr ? 'fr' : 'en';
    var listHtml = '';
    if (typeof window !== 'undefined' && window.BFGlossary && typeof window.BFGlossary.renderAppendix === 'function') {
      try { listHtml = window.BFGlossary.renderAppendix(lang); } catch (e) { listHtml = ''; }
    }
    if (!listHtml) {
      listHtml = '<div style="font-size:10.5px;color:#888;font-style:italic">' +
        (fr ? 'Glossaire indisponible.' : 'Glossary unavailable.') + '</div>';
    }
    var h = secPage();
    h += F.Sec(secN, fr ? 'Glossaire' : 'Glossary', 'sec-glossary');
    h += '<div style="font-size:10.5px;color:#666;margin-bottom:10px;font-style:italic;line-height:1.55">' +
      (fr ? 'Définitions des termes techniques utilisés dans ce rapport. Les termes soulignés en pointillé à travers le rapport ouvrent une infobulle au survol.'
          : 'Definitions of technical terms used in this report. Terms with a dotted underline throughout the report open a tooltip on hover.') +
      '</div>';
    h += listHtml;
    h += secPageEnd();
    return h;
  }

  // Sensitivity heatmap (inline — no new chart module required)
  function _renderSensitivityHeatmap(d, fr) {
    var p = d.p;
    var baseSucc = d.succVal != null ? d.succVal : 0.7;
    var baseEq = (p.eqRet || p.eqRetS || 0.06);
    var baseInf = (p.inf || 0.021);
    function _approxSucc(eq, infV) {
      var dEq = (eq - baseEq) * 100;
      var dInf = (infV - baseInf) * 100;
      var s = baseSucc + (dEq * 0.06) - (dInf * 0.04);
      return Math.max(0.05, Math.min(0.99, s));
    }
    function _hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
    function _lerpColor(c1, c2, t) {
      var a = _hex(c1), b = _hex(c2);
      return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ',' + Math.round(a[1] + (b[1] - a[1]) * t) + ',' + Math.round(a[2] + (b[2] - a[2]) * t) + ')';
    }
    function _heatColor(s) {
      if (s == null) return '#eee';
      if (s < 0.5) return _lerpColor('#cc4444', '#b89830', s / 0.5);
      return _lerpColor('#b89830', '#2a8c46', (s - 0.5) / 0.5);
    }
    var eqRow = [baseEq + 0.02, baseEq + 0.01, baseEq, baseEq - 0.01, baseEq - 0.02]; // top→bottom
    var infCol = [baseInf - 0.01, baseInf, baseInf + 0.01, baseInf + 0.02, baseInf + 0.03];
    var W = 700, H = 240, ml = 110, mr = 25, mt = 28, mb = 60;
    var nRows = eqRow.length, nCols = infCol.length;
    var cellW = (W - ml - mr) / nCols, cellH = (H - mt - mb) / nRows;
    var svg = '<svg role="img" xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ' + W + ' ' + H + '" style="display:block;margin:8px 0">';
    svg += '<text x="' + ml + '" y="16" font-size="11" font-weight="700" fill="#1a1610" font-family="Inter,sans-serif">' + (fr ? 'Carte thermique de sensibilité — taux de succès estimé' : 'Sensitivity heatmap — estimated success rate') + '</text>';
    eqRow.forEach(function(eq, ri) {
      infCol.forEach(function(infV, ci) {
        var s = _approxSucc(eq, infV);
        var x = ml + ci * cellW;
        var y = mt + ri * cellH;
        var col = _heatColor(s);
        var isBase = (ri === 2 && ci === 1);
        svg += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + cellW.toFixed(1) + '" height="' + cellH.toFixed(1) + '" fill="' + col + '" stroke="' + (isBase ? '#252d39' : '#fff') + '" stroke-width="' + (isBase ? 2.5 : 1) + '"/>';
        var pct = Math.round(s * 100) + '%';
        var txtCol = s < 0.6 ? '#fff' : '#1a1610';
        svg += '<text x="' + (x + cellW / 2).toFixed(1) + '" y="' + (y + cellH / 2 + 4).toFixed(1) + '" text-anchor="middle" font-size="11" font-weight="700" fill="' + txtCol + '" font-family="JetBrains Mono,monospace">' + pct + '</text>';
      });
      svg += '<text x="' + (ml - 8) + '" y="' + (mt + ri * cellH + cellH / 2 + 4).toFixed(1) + '" text-anchor="end" font-size="10" fill="#444" font-family="Inter,sans-serif">' + (eq * 100).toFixed(1).replace('.', fr ? ',' : '.') + ' %</text>';
    });
    infCol.forEach(function(infV, ci) {
      svg += '<text x="' + (ml + ci * cellW + cellW / 2).toFixed(1) + '" y="' + (H - mb + 16) + '" text-anchor="middle" font-size="10" fill="#444" font-family="Inter,sans-serif">' + (infV * 100).toFixed(1).replace('.', fr ? ',' : '.') + ' %</text>';
    });
    svg += '<text x="' + (ml + (W - ml - mr) / 2) + '" y="' + (H - 12) + '" text-anchor="middle" font-size="10" font-weight="700" fill="' + C.gold + '" font-family="Inter,sans-serif" letter-spacing="1px">' + (fr ? 'INFLATION MOYENNE' : 'AVERAGE INFLATION') + '</text>';
    svg += '<text x="14" y="' + (mt + (H - mt - mb) / 2) + '" text-anchor="middle" font-size="10" font-weight="700" fill="' + C.gold + '" font-family="Inter,sans-serif" letter-spacing="1px" transform="rotate(-90,14,' + (mt + (H - mt - mb) / 2) + ')">' + (fr ? 'RENDEMENT ACTIONS' : 'EQUITY RETURN') + '</text>';
    svg += '</svg>';
    var legend = '<div style="display:flex;justify-content:center;align-items:center;gap:14px;font-size:9.5px;color:#666;margin-top:4px;font-family:Inter,sans-serif">' +
      '<span><span style="display:inline-block;width:10px;height:10px;background:#cc4444;vertical-align:middle;margin-right:4px"></span>' + (fr ? 'à risque' : 'at risk') + ' (&lt;50%)</span>' +
      '<span><span style="display:inline-block;width:10px;height:10px;background:#b89830;vertical-align:middle;margin-right:4px"></span>' + (fr ? 'fragile' : 'fragile') + ' (50–75%)</span>' +
      '<span><span style="display:inline-block;width:10px;height:10px;background:#2a8c46;vertical-align:middle;margin-right:4px"></span>' + (fr ? 'solide' : 'solid') + ' (&gt;75%)</span>' +
      '<span style="margin-left:auto"><span style="display:inline-block;width:10px;height:10px;border:2px solid #252d39;vertical-align:middle;margin-right:4px"></span>' + (fr ? 'plan de base' : 'baseline') + '</span>' +
    '</div>';
    return '<div style="margin:18px 0 6px;font-size:11px;font-weight:600;color:' + C.gold + ';text-transform:uppercase;letter-spacing:.5px">' + (fr ? 'Carte thermique : rendement × inflation' : 'Heatmap: return × inflation') + '</div>' +
      // Prominent caveat box — the numbers on the heatmap are an educational
      // approximation, not a re-run of Monte Carlo. Made visually distinct so
      // the reader cannot miss the disclaimer (per audit feedback).
      '<div style="font-size:10.5px;color:#7a4a00;margin-bottom:8px;line-height:1.55;background:#fff8e0;border:1px solid #d8ad33;border-left:4px solid #d8ad33;padding:8px 12px;border-radius:4px">' +
      '<strong style="color:#8a5500">⚠ ' + (fr ? 'Approximation pédagogique :' : 'Educational approximation:') + '</strong> ' +
      (fr ? 'les pourcentages affichés ne proviennent PAS d\'une seconde simulation Monte Carlo. Ils sont estimés à partir de coefficients moyens (rendement ~6 pts/1 %, inflation ~−4 pts/1 %) appliqués au taux de succès de votre plan de base. Pour des chiffres exacts, utilisez le simulateur What-If qui rejoue 500 simulations en direct.'
          : 'percentages shown are NOT from a second Monte Carlo run. They are estimated from average coefficients (return ~6 pts/1%, inflation ~−4 pts/1%) applied to your baseline success rate. For exact figures, use the What-If simulator which replays 500 simulations live.') +
      '</div>' +
      '<div style="font-size:10.5px;color:#666;margin-bottom:6px;line-height:1.55">' +
      (fr ? 'Pour chaque combinaison rendement/inflation, le taux de succès estimé. La cellule encadrée représente vos hypothèses de base.' : 'For each return/inflation combination, the estimated success rate. The boxed cell shows your baseline assumptions.') +
      '</div>' + svg + legend;
  }

  // === SECTION: FINAL-WEALTH HISTOGRAM (Phase 11 gap-close) ===
  // Shows the distribution of the 5000 simulation end-of-horizon wealth outcomes
  // with P25/P50/P75 markers. Consumed from mc.histogram (engine-emitted bins).
  function renderHistogram(d, secN) {
    if (!d.mc || !d.mc.histogram || !d.mc.histogram.length) return '';
    var fr = d.fr, mc = d.mc;
    var f$ = F.fmtCompact;
    var h = secPage();
    h += F.Sec(secN, fr ? 'Distribution du patrimoine final' : 'Final-wealth distribution', 'sec-histogram');

    h += narr(fr
      ? 'Ce graphique montre comment les <strong>' + (d.p.nSim || 5000) + ' simulations</strong> se r\u00e9partissent en fin d\'horizon. Chaque barre regroupe les trajectoires dont le patrimoine final tombe dans la plage indiqu\u00e9e. Les rep\u00e8res ' + _term('p25', 'P25') + ', ' + _term('p50', 'P50') + ' et ' + _term('p75', 'P75') + ' marquent respectivement le sc\u00e9nario prudent, m\u00e9dian et favorable.'
      : 'This chart shows how the <strong>' + (d.p.nSim || 5000) + ' simulations</strong> are distributed at the end of the horizon. Each bar groups trajectories whose final wealth falls in the indicated range. The ' + _term('p25', 'P25') + ', ' + _term('p50', 'P50') + ' and ' + _term('p75', 'P75') + ' markers show the cautious, median and favourable scenarios.');

    h += Ch.svgHistogram(mc.histogram, {
      title: fr ? 'Patrimoine final (dollars r\u00e9els)' : 'Final wealth (real dollars)',
      p25: mc.rP25F || mc.p25F,
      p50: mc.rMedF || mc.medF,
      p75: mc.rP75F || mc.p75F
    });

    // Small legend / reading aid
    var p25 = f$(mc.rP25F || mc.p25F), p50 = f$(mc.rMedF || mc.medF), p75 = f$(mc.rP75F || mc.p75F);
    h += '<div style="font-size:10px;color:#888;margin-top:6px;line-height:1.6">' +
      (fr
        ? '<span class="mono">P25 = ' + p25 + '</span> \u2014 un quart des sc\u00e9narios termine sous ce niveau. <span class="mono">P50 = ' + p50 + '</span> \u2014 m\u00e9dian. <span class="mono">P75 = ' + p75 + '</span> \u2014 un quart des sc\u00e9narios termine au-dessus.'
        : '<span class="mono">P25 = ' + p25 + '</span> \u2014 one quarter of scenarios end below this level. <span class="mono">P50 = ' + p50 + '</span> \u2014 median. <span class="mono">P75 = ' + p75 + '</span> \u2014 one quarter of scenarios end above.') +
      '</div>';

    h += secPageEnd();
    return h;
  }

  // === SECTION: CASH FLOW YEAR-BY-YEAR (Phase 11 gap-close) ===
  // Compact year-by-year table with income/outflows/net. Consumes
  // mc._enriched.cashflow populated by mc-enrich.mjs. Sampled to keep print-
  // friendly length: pre-retirement first year, retirement age, +5, +10, +15,
  // +20, deathAge. Beginner-friendly column labels.
  function renderCashflow(d, secN) {
    var fr = d.fr, p = d.p;
    // Always emit the anchor so QA can verify structural presence. When
    // the enriched cashflow payload is missing (unenriched pipeline),
    // render a short note instead of an empty DOM.
    if (!d.mc || !d.mc._enriched || !d.mc._enriched.cashflow || !d.mc._enriched.cashflow.length) {
      var h0 = secPage();
      h0 += F.Sec(secN, fr ? 'Flux de tr\u00e9sorerie annuel' : 'Year-by-year cash flow', 'sec-cashflow');
      h0 += narr(fr
        ? 'Les donn\u00e9es de flux de tr\u00e9sorerie ann\u00e9e par ann\u00e9e n\u2019ont pas \u00e9t\u00e9 g\u00e9n\u00e9r\u00e9es pour ce rapport. Elles proviennent de l\u2019\u00e9tape d\u2019enrichissement (mc-enrich.mjs) qui calcule le chemin m\u00e9dian d\u00e9taill\u00e9 \u00e0 partir de la simulation Monte Carlo.'
        : 'Year-by-year cash flow data was not generated for this report. It comes from the enrichment step (mc-enrich.mjs) which derives the detailed median path from the Monte Carlo simulation.');
      h0 += secPageEnd();
      return h0;
    }
    var cf = d.mc._enriched.cashflow;
    var fR = function(v) { return F.fmtMoney(v, fr); };

    // Sample rows: age, retAge, retAge+5, +10, +15, +20, deathAge
    var retAge = p.retAge || 65, deathAge = p.deathAge || 90;
    var sampledAges = [p.age, retAge, retAge + 5, retAge + 10, retAge + 15, retAge + 20, deathAge]
      .filter(function(a, i, arr) { return a <= deathAge && arr.indexOf(a) === i; });
    var rows = sampledAges.map(function(a) { return cf.find(function(r) { return r.age === a; }); }).filter(Boolean);
    if (rows.length === 0) return '';

    var h = secPage();
    h += F.Sec(secN, fr ? 'Flux de tr\u00e9sorerie annuel' : 'Year-by-year cash flow', 'sec-cashflow');

    h += narr(fr
      ? 'Ce tableau pr\u00e9sente le flux annuel estim\u00e9 \u00e0 des \u00e2ges cl\u00e9s: revenus (salaire, prestations, retraits), sorties (imp\u00f4ts, d\u00e9penses, cotisations) et flux net. Les chiffres proviennent du chemin m\u00e9dian de la simulation et sont exprim\u00e9s en dollars courants \u00e0 chaque ann\u00e9e.'
      : 'This table shows the estimated annual cash flow at key ages: income (salary, benefits, withdrawals), outflows (taxes, spending, contributions) and net flow. Figures come from the median simulation path and are shown in nominal dollars at each year.');

    h += '<table class="tbl" style="font-size:10px"><thead><tr>';
    h += '<th style="text-align:left">' + (fr ? '\u00c2ge' : 'Age') + '</th>';
    h += '<th>' + (fr ? 'Salaire/Corp' : 'Salary/Corp') + '</th>';
    h += '<th>' + (fr ? 'Prestations' : 'Benefits') + '</th>';
    h += '<th>' + (fr ? 'Retraits' : 'Withdrawals') + '</th>';
    h += '<th>' + (fr ? 'Imp\u00f4t' : 'Tax') + '</th>';
    h += '<th>' + (fr ? 'D\u00e9penses' : 'Spending') + '</th>';
    h += '<th>' + (fr ? 'Net' : 'Net') + '</th>';
    h += '</tr></thead><tbody>';
    rows.forEach(function(r) {
      var salCorp = (r.income.sal || 0) + (r.income.corp || 0);
      var benefits = r.income.gov || 0;
      var withdrawals = r.income.draws || 0;
      var tax = r.outflows.tax || 0;
      var spend = r.outflows.spend || 0;
      var net = r.net || 0;
      var netColor = net >= 0 ? C.green : C.red;
      var phaseClass = r.phase === 'retired' ? ' class="ret"' : '';
      h += '<tr' + phaseClass + '>';
      h += '<td style="text-align:left">' + r.age + (r.age === retAge ? ' \u2605' : '') + '</td>';
      h += '<td>' + (salCorp > 0 ? fR(salCorp) : '\u2014') + '</td>';
      h += '<td>' + (benefits > 0 ? fR(benefits) : '\u2014') + '</td>';
      h += '<td>' + (withdrawals > 0 ? fR(withdrawals) : '\u2014') + '</td>';
      h += '<td>' + (tax > 0 ? fR(tax) : '\u2014') + '</td>';
      h += '<td>' + fR(spend) + '</td>';
      h += '<td style="color:' + netColor + ';font-weight:700">' + (net >= 0 ? '+' : '') + fR(net) + '</td>';
      h += '</tr>';
    });
    h += '</tbody></table>';
    h += '<div style="font-size:9px;color:#888;margin-top:4px;font-style:italic">' +
      (fr ? '\u2605 Ann\u00e9e de d\u00e9part de la retraite. Ligne sur fond cr\u00e8me = phase de retraite. Flux net n\u00e9gatif = l\'\u00e9pargne compense l\'\u00e9cart.'
          : '\u2605 Retirement start year. Cream-background rows = retirement phase. Negative net = savings absorb the gap.') +
      '</div>';
    h += secPageEnd();
    return h;
  }

  // === SECTION: ASSUMPTIONS APPENDIX (Phase 11 gap-close) ===
  // One-page appendix listing every assumption driving the simulation.
  // Complements sec-methodology (which explains METHOD) with the CONSTANTS
  // and ENGINE PARAMETERS used for this specific plan.
  function renderAssumptions(d, secN) {
    var fr = d.fr, p = d.p;
    var fR = function(v) { return F.fmtMoney(v, fr); };
    var h = secPage();
    h += F.Sec(secN, fr ? 'Annexe \u2014 Hypoth\u00e8ses' : 'Appendix \u2014 Assumptions', 'sec-assumptions');

    h += narr(fr
      ? 'Cette annexe rassemble les hypoth\u00e8ses num\u00e9riques pr\u00e9cises utilis\u00e9es dans la simulation pour votre plan. Toutes les projections du rapport d\u00e9coulent de ces entr\u00e9es; modifier l\'une d\'elles changerait l\'ensemble du r\u00e9sultat.'
      : 'This appendix consolidates the precise numerical assumptions used in the simulation for your plan. Every projection in the report flows from these inputs; changing any one of them would shift the entire result.');

    var rows = [
      [fr ? 'Rendement attendu actions' : 'Expected equity return', ((p.eqRet || 0.06) * 100).toFixed(1) + ' %'],
      [fr ? 'Volatilit\u00e9 actions' : 'Equity volatility', ((p.eqVol || 0.16) * 100).toFixed(1) + ' %'],
      [fr ? 'Rendement obligations' : 'Bond return', ((p.bndRet || 0.035) * 100).toFixed(1) + ' %'],
      [fr ? 'Inflation annuelle' : 'Annual inflation', ((p.inf || 0.021) * 100).toFixed(1) + ' %'],
      [fr ? 'Nombre de simulations' : 'Number of simulations', (p.nSim || 5000).toLocaleString(fr ? 'fr-CA' : 'en-CA')],
      [fr ? 'Distribution des rendements' : 'Return distribution', p.fatT ? (fr ? 't-Student (queues \u00e9paisses)' : 't-Student (fat tails)') : 'Normal'],
      [fr ? 'Mortalit\u00e9' : 'Mortality', p.stochMort ? (fr ? 'Stochastique (CPM-2023)' : 'Stochastic (CPM-2023)') : (fr ? 'D\u00e9terministe (\u00e2ge de d\u00e9c\u00e8s fixe)' : 'Deterministic (fixed death age)')],
      [fr ? 'Inflation stochastique' : 'Stochastic inflation', p.stochInf ? (fr ? 'Oui' : 'Yes') : (fr ? 'Non' : 'No')],
      [fr ? 'FGP pond\u00e9r\u00e9s' : 'Weighted MER', ((d.merWt || 0) * 100).toFixed(2) + ' %'],
      [fr ? 'Allocation actions REER' : 'RRSP equity allocation', ((p.allocR || 0.6) * 100).toFixed(0) + ' %'],
      [fr ? 'Allocation actions CELI' : 'TFSA equity allocation', ((p.allocT || 0.7) * 100).toFixed(0) + ' %'],
      [fr ? 'Allocation actions non-enreg.' : 'Non-reg equity allocation', ((p.allocN || 0.5) * 100).toFixed(0) + ' %'],
      [fr ? 'Courbe de d\u00e9penses Go-Go (< 75 ans)' : 'Spending curve Go-Go (< age 75)', ((p.goP || 1.0) * 100).toFixed(0) + ' %'],
      [fr ? 'Courbe de d\u00e9penses Slow-Go (75-84)' : 'Spending curve Slow-Go (75-84)', ((p.slP || 0.85) * 100).toFixed(0) + ' %'],
      [fr ? 'Courbe de d\u00e9penses No-Go (85+)' : 'Spending curve No-Go (85+)', ((p.noP || 0.7) * 100).toFixed(0) + ' %'],
      [fr ? 'Strat\u00e9gie de d\u00e9caissement' : 'Decumulation strategy', p.wStrat === 'optimized' ? (fr ? 'Optimis\u00e9e' : 'Optimized') : 'Standard'],
      [fr ? 'Ann\u00e9e fiscale de base' : 'Tax base year', '2026'],
      [fr ? 'Province' : 'Province', p.prov || 'QC']
    ];

    h += '<table class="tbl" style="font-size:10.5px"><tbody>';
    rows.forEach(function(r, i) {
      h += '<tr' + (i % 2 === 0 ? ' style="background:#fdfbf7"' : '') + '>';
      h += '<td style="text-align:left;font-family:Inter,sans-serif">' + F.esc(r[0]) + '</td>';
      h += '<td class="mono">' + F.esc(r[1]) + '</td>';
      h += '</tr>';
    });
    h += '</tbody></table>';

    h += '<div style="font-size:10px;color:#888;font-style:italic;margin-top:10px;line-height:1.7">' +
      (fr
        ? 'Les constantes fiscales (paliers f\u00e9d\u00e9raux 2026, paliers provinciaux ' + (p.prov || 'QC') + ', PSV, SRG, RRQ/RPC, RRIF) sont index\u00e9es annuellement sur l\'inflation. Les seuils de r\u00e9cup\u00e9ration PSV (95 323 $) et de couple pour le SRG suivent le bar\u00e8me 2026.'
        : 'Tax constants (2026 federal brackets, ' + (p.prov || 'QC') + ' provincial brackets, OAS, GIS, CPP/QPP, RRIF) are indexed annually on inflation. OAS clawback threshold ($95,323) and GIS couple thresholds follow the 2026 scale.') +
      '</div>';

    h += secPageEnd();
    return h;
  }

  // === SECTION: ACTION PLAN (Phase 7) ===
  // Renders the output of report-actions.js as prioritized cards.
  // Hidden when no actions apply (robust plan).
  function renderActionPlan(d, secN) {
    if (!window.BActions) return '';
    var actions = window.BActions.generateActions(d);
    if (!actions || actions.length === 0) return '';
    var fr = d.fr;
    var f$ = F.fmtCompact;
    var TL = window.BActions.TL;

    var h = secPage();
    h += F.Sec(secN, fr ? 'Plan d\'action' : 'Action plan', 'sec-actions');
    h += narr(fr
      ? 'Le plan ci-dessous regroupe les leviers selon la fen\u00eatre o\u00f9 ils ont le plus d\'effet : Maintenant, 12 mois, Pr\u00e9retraite, Retraite active. La logique est s\u00e9quentielle \u2014 ce qui est plac\u00e9 en \u00ab Maintenant \u00bb conditionne souvent ce qui devient pertinent ensuite. Chaque point est observationnel et m\u00e9rite discussion avec un planificateur financier agr\u00e9\u00e9.'
      : 'The plan below groups levers by the window in which they have the most impact: Now, Next 12 months, Pre-retirement, In retirement. The logic is sequential — what sits in "Now" often conditions what becomes relevant later. Each point is observational and warrants discussion with a certified financial planner.');

    // Group actions by timeline bucket; sort buckets by the natural life-stage
    // order (Maintenant → 12 mois → Préretraite → Retraite active).
    var buckets = { immediate: [], short: [], medium: [], long: [] };
    actions.forEach(function(a) {
      var tl = a.timeline && buckets[a.timeline] ? a.timeline : 'medium';
      buckets[tl].push(a);
    });
    // Within each bucket, sort high → medium → low priority
    var prioRank = { high: 0, medium: 1, low: 2 };
    Object.keys(buckets).forEach(function(k) {
      buckets[k].sort(function(x, y) { return (prioRank[x.priority] || 9) - (prioRank[y.priority] || 9); });
    });

    var bucketOrder = ['immediate', 'short', 'medium', 'long'];
    bucketOrder.forEach(function(bk) {
      var items = buckets[bk];
      if (!items || items.length === 0) return;
      var bucketLabel = TL[bk][fr ? 'fr' : 'en'];
      var bucketSub = bk === 'immediate' ? (fr ? 'sans pr\u00e9requis \u2014 \u00e0 enclencher d\u00e8s maintenant' : 'no preconditions — start now')
                    : bk === 'short'     ? (fr ? 'l\'ann\u00e9e \u00e0 venir' : 'the year ahead')
                    : bk === 'medium'    ? (fr ? 'phase d\'ajustement avant la retraite' : 'adjustment phase before retirement')
                    :                      (fr ? 'apr\u00e8s le d\u00e9but de la retraite' : 'after retirement begins');
      // Bucket header
      h += '<div class="action-bucket-header" style="margin:18px 0 10px;padding:10px 14px;background:linear-gradient(90deg,#252d39 0%,#344155 100%);color:#faf8f4;border-radius:6px;border-left:4px solid ' + C.gold + ';display:flex;align-items:baseline;gap:14px;break-inside:avoid">' +
        '<div style="font-family:\"JetBrains Mono\",monospace;font-size:14px;font-weight:700;color:' + C.gold + ';min-width:30px">0' + TL[bk].order + '</div>' +
        '<div style="flex:1">' +
          '<div style="font-family:Inter,sans-serif;font-size:11px;font-weight:700;color:' + C.gold + ';letter-spacing:1.5px;text-transform:uppercase">' + bucketLabel + '</div>' +
          '<div style="font-family:Inter,sans-serif;font-size:10.5px;color:#bccbe0;font-style:italic;margin-top:2px">' + bucketSub + '</div>' +
        '</div>' +
        '<div style="font-family:\"JetBrains Mono\",monospace;font-size:9px;color:#bccbe0;letter-spacing:0.5px">' + items.length + ' ' + (fr ? (items.length > 1 ? 'leviers' : 'levier') : items.length > 1 ? 'levers' : 'lever') + '</div>' +
        '</div>';
      // Items in this bucket
      items.forEach(function(a, idx) {
        var priorityLabel = a.priority === 'high'
          ? (fr ? 'Priorit\u00e9 \u00e9lev\u00e9e' : 'High priority')
          : a.priority === 'medium' ? (fr ? 'Priorit\u00e9 moyenne' : 'Medium priority')
          : (fr ? 'Priorit\u00e9 faible' : 'Low priority');
        var priorityClass = a.priority === 'high' ? 'reco-priority-high'
          : a.priority === 'medium' ? 'reco-priority-medium' : 'reco-priority-low';
        var impactHtml = '';
        if (a.dollarImpact != null && a.dollarImpact >= 1000) {
          impactHtml = '<div class="reco-impact">~ ' + f$(a.dollarImpact) + '</div>';
        }
        h += '<div class="reco-card" style="margin-left:14px">';
        h += '<div style="display:flex;gap:10px;align-items:center;margin-bottom:6px">';
        h += '<span style="font-family:\"JetBrains Mono\",monospace;font-size:9px;color:#888;font-weight:700">' + (idx + 1) + '.</span>';
        h += '<span class="reco-priority ' + priorityClass + '">' + priorityLabel + '</span>';
        h += '<span style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-left:auto">' + (fr ? 'Confiance' : 'Confidence') + ' : ' + a.confidence + '</span>';
        h += '</div>';
        h += impactHtml;
        h += '<div class="reco-title">' + F.esc(a.title) + '</div>';
        h += '<div class="reco-body">' + a.rationale + '</div>';
        h += '</div>';
      });
    });

    h += '<div class="disclaimer" style="margin-top:14px">' + (fr
      ? 'Les actions ci-dessus sont observationnelles et conditionnelles. Avant toute d\u00e9cision, une consultation avec un planificateur financier agr\u00e9\u00e9 connaissant votre situation compl\u00e8te serait indiqu\u00e9e.'
      : 'The actions above are observational and conditional. Before any decision, a consultation with a certified financial planner familiar with your full situation would be warranted.') + '</div>';

    h += secPageEnd();
    return h;
  }

  // === SECTION: SIGNATURE PAGE (Phase 10) ===
  // Single-page signature block for advisor + client acknowledgment. Kept
  // minimal — no legal language beyond the acknowledgment that the report
  // was reviewed. Prints last before methodology/disclosures.
  function renderSignaturePage(d) {
    var fr = d.fr;
    var today = F.fmtDate(null, fr);
    var name = d.fn ? F.esc(d.fn) : (fr ? 'Client' : 'Client');
    var spouseName = d.R.couple && d.sfn ? F.esc(d.sfn) : '';
    var h = '<div class="sec-page" id="sec-signature">';
    h += '<div style="padding:40px 20px;font-family:Inter,sans-serif">';
    h += '<div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:30px">' +
      (fr ? 'Accus\u00e9 de r\u00e9ception' : 'Acknowledgment') + '</div>';
    h += '<h1 style="font-family:Playfair Display,Georgia,serif;font-size:26px;font-weight:700;color:' + C.gold + ';margin-bottom:18px">' +
      (fr ? 'Accus\u00e9 de r\u00e9ception et de revue' : 'Acknowledgment of review') + '</h1>';
    h += '<p class="narr" style="max-width:620px;margin-bottom:30px;font-size:12px">' +
      (fr
        ? 'Les signataires ci-dessous reconnaissent avoir pris connaissance du pr\u00e9sent rapport, des hypoth\u00e8ses et des mises en garde qui y figurent. Ce rapport est de nature observationnelle et projective; il ne constitue pas un conseil personnalis\u00e9. Toute d\u00e9cision importante b\u00e9n\u00e9ficierait d\'une consultation avec un planificateur financier agr\u00e9\u00e9.'
        : 'The undersigned acknowledge having reviewed this report, the assumptions and the cautions it contains. This report is observational and projective in nature; it does not constitute personalized advice. Any material decision would benefit from consultation with a certified financial planner.') + '</p>';

    h += '<div style="margin-top:60px;font-size:11px;color:#444">';
    // Client signature
    h += '<div style="margin-bottom:50px">';
    h += '<div style="border-top:1px solid #888;width:280px;margin-bottom:6px"></div>';
    h += '<div style="font-weight:600">' + name + '</div>';
    h += '<div style="color:#888;font-size:10px">' + (fr ? 'Client \u2014 Date : ___________' : 'Client \u2014 Date: ___________') + '</div>';
    h += '</div>';
    // Spouse signature (couple only)
    if (spouseName) {
      h += '<div style="margin-bottom:50px">';
      h += '<div style="border-top:1px solid #888;width:280px;margin-bottom:6px"></div>';
      h += '<div style="font-weight:600">' + spouseName + '</div>';
      h += '<div style="color:#888;font-size:10px">' + (fr ? 'Conjoint(e) \u2014 Date : ___________' : 'Spouse \u2014 Date: ___________') + '</div>';
      h += '</div>';
    }
    // Advisor signature
    h += '<div style="margin-bottom:20px">';
    h += '<div style="border-top:1px solid #888;width:280px;margin-bottom:6px"></div>';
    h += '<div style="font-weight:600">' + (d.client.advisor ? F.esc(d.client.advisor) : (fr ? 'Planificateur' : 'Planner')) + '</div>';
    h += '<div style="color:#888;font-size:10px">' + (fr ? 'Date : ___________' : 'Date: ___________') + (d.client.firm ? ' \u2014 ' + F.esc(d.client.firm) : '') + '</div>';
    h += '</div>';
    h += '</div>';

    h += '<div style="margin-top:60px;font-size:10px;color:#888;line-height:1.7">';
    h += (fr
      ? 'Version ' + F.VERSION + ' \u2014 Rapport pr\u00e9par\u00e9 le ' + today + ' par BuildFi Technologies inc.'
      : 'Version ' + F.VERSION + ' \u2014 Report prepared on ' + today + ' by BuildFi Technologies inc.');
    h += '</div>';
    h += '</div></div>';
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

    // Feature checklist — profile-adaptive: hide profile-conditional rows that don't apply.
    // Always-on rows show with ✓; conditional rows are omitted when they would show ✗.
    h += '<div class="meth-grid">';
    var _hasGIS = (d.revData || []).some(function(r) { return r.age >= 65 && (r.srg || r.gis || 0) > 0; });
    var _hasFHSA = (p.fhsaBal || 0) > 0;
    var _hasProps = (p.props || []).some(function(pr) { return pr && pr.on; });
    var _ck = [
      // Always shown — engine fundamentals
      { label: 'Cholesky 5\u00d75', on: true, conditional: false },
      { label: (fr ? 'Mortalit\u00e9 CPM-2023' : 'CPM-2023 mortality'), on: true, conditional: false },
      { label: p.fatT ? (fr ? 'Queues \u00e9paisses' : 'Fat tails') : 'Normal', on: true, conditional: false },
      { label: (fr ? 'Paliers index\u00e9s' : 'Indexed brackets'), on: true, conditional: false },
      { label: p.stochInf ? (fr ? 'Inflation stochastique' : 'Stochastic inflation') : (fr ? 'Inflation fixe' : 'Fixed inflation'), on: true, conditional: false },
      { label: _isQC ? 'RRQ2' : 'CPP2', on: true, conditional: false },
      // Profile-conditional — only show when active for this profile
      { label: (fr ? 'MER d\u00e9duits' : 'MER deducted'), on: d.merWt > 0, conditional: true },
      { label: 'SRG/GIS', on: _hasGIS, conditional: true },
      { label: 'Meltdown REER', on: !!p.melt, conditional: true },
      { label: (fr ? 'Fractionnement de pension' : 'Pension splitting'), on: !!p.split, conditional: true },
      { label: 'Guyton-Klinger', on: !!(mc && mc.gkOn), conditional: true },
      { label: (fr ? 'Vente forc\u00e9e immo.' : 'Forced RE sale'), on: _hasProps, conditional: true },
      { label: 'CELIAPP/FHSA', on: _hasFHSA, conditional: true }
    ];
    _ck.forEach(function(c) {
      // Skip conditional rows that don't apply to this profile (less noise, more relevance).
      if (c.conditional && !c.on) return;
      h += '<div class="meth-item"><span class="meth-check">' + (c.on ? '\u2713' : '\u2717') + '</span>' + c.label + '</div>';
    });
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

    // Pass through the SKU flag so renderers can gate the embedded What-If.
    // BData.buildReportPayload may strip unknown fields; we re-attach here from
    // the original input. Default: include simulator (legacy behavior) when
    // the flag is not provided, so existing callers keep working.
    if (d) {
      d.sku = (data && data.sku) || 'bilan';
      d.includeSimulator = (data && typeof data.includeSimulator === 'boolean')
        ? data.includeSimulator
        : (d.sku !== 'planner');
    }

    // Set the rendering-scope language so shared formatters (fmtCurrency, pc)
    // produce locale-correct output for EN reports. fmtCurrency previously
    // hardcoded fr-CA, which broke EN report currency formatting.
    if (d && typeof d.fr === "boolean") window.__bfLang = d.fr ? "fr" : "en";

    // Empty / loading states
    if (d.empty) {
      if (d.mcComputing) {
        return '<div style="padding:30px;text-align:center;font-family:Inter,sans-serif"><div style="font-size:18px;font-weight:600;color:' + C.gold + ';margin-bottom:10px">' + (d.fr ? 'Simulation en cours...' : 'Simulation running...') + '</div><div style="font-size:13px;color:#888">' + (d.fr ? 'Les r\u00e9sultats Monte Carlo appara\u00eetront sous peu.' : 'Monte Carlo results will appear shortly.') + '</div></div>';
      }
      return '';
    }

    // Invalid params guard — only reject truly broken configs (deathAge <= retAge for non-retired)
    var p = d.p;
    if (p.age < p.retAge && (p.deathAge || 90) <= p.retAge) {
      return '<div style="padding:40px;text-align:center;color:' + C.red + ';font-size:16px;font-family:Inter,sans-serif">' + (d.fr ? 'Param\u00e8tres invalides. L\u2019horizon d\u00e9clar\u00e9 est inf\u00e9rieur \u00e0 l\u2019\u00e2ge de retraite — v\u00e9rifiez l\u2019\u00e2ge de d\u00e9c\u00e8s et l\u2019\u00e2ge de retraite saisis.' : 'Invalid parameters. The declared horizon is lower than retirement age — please verify the death age and retirement age values.') + '</div>';
    }

    // Build HTML
    var rl = d.rl;
    var h = '<!DOCTYPE html><html lang="' + rl + '"><head><meta charset="utf-8"><title>' + (d.fr ? 'Plan de retraite' : 'Retirement Plan') + ' \u2014 ' + F.esc(d.client.name || 'Client') + '</title><style>' + css + '</style></head><body>';
    h += copyScript;

    // Cover page
    h += renderCover(d);

    // Advisor letter — first content page so the human framing comes before
    // any numbers. Sets the emotional lens for the report.
    h += renderAdvisorLetter(d);

    // Executive summary — 1-page TL;DR right after the warm opening, so a
    // reader who only flips through still gets the verdict in 30 seconds
    // without the cold-open feel of a number wall on page 2.
    h += _renderExecSummary(d);

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
    // Levers section gated on real MC sweep data.
    var _hasSweeps = !!(d.mc && d.mc._sweeps);
    // Draw-order heatmap gated on enriched drawTrace.
    var _hasDrawTrace = !!(d.mc && d.mc._enriched && d.mc._enriched.drawTrace && d.mc._enriched.drawTrace.length);
    // Stress tests gated on _stress payload.
    var _hasStress = !!(d.mc && d.mc._stress);

    // ── Build TOC sections array (pre-scan which sections will render) ──
    var tocSections = [];
    var _tocN = 0;
    tocSections.push({ n: '\u2606', id: 'sec-assessment', label: F.L('page_zero', d.fr) });
    _tocN++; tocSections.push({ n: _tocN, id: 'sec-diagnostic', label: F.L('diagnostic', d.fr) });
    if (_hasSweeps) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-levers', label: F.L('levers', d.fr) }); }
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
    // Histogram + cashflow always added (engine emits histogram; enrich emits cashflow)
    if (d.mc && d.mc.histogram && d.mc.histogram.length) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-histogram', label: d.fr ? 'Distribution finale' : 'Final distribution' }); }
    if (d.mc && d.mc._enriched && d.mc._enriched.cashflow && d.mc._enriched.cashflow.length) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-cashflow', label: d.fr ? 'Flux annuel' : 'Cash flow' }); }
    if (_hasStrats) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-strategies', label: F.L('strategies', d.fr) }); }
    _tocN++; tocSections.push({ n: _tocN, id: 'sec-tax', label: F.L('tax', d.fr) });
    if (_hasDrawTrace) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-draworder', label: d.fr ? 'Ordre des retraits' : 'Draw-order strategy' }); }
    if (_hasStress) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-stress', label: d.fr ? 'Tests de stress' : 'Stress tests' }); }
    if (_gisCheck.length > 0) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-gis', label: F.L('gis', d.fr) }); }
    if (d.R.hasMeltdown) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-meltdown', label: F.L('meltdown', d.fr) }); }
    if (_grossEstateCheck >= 1000) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-succession', label: F.L('succession', d.fr) }); }
    if (d.R.realEstate) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-realestate', label: F.L('realestate', d.fr) }); }
    if (d.R.hasRSU) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-rsu', label: F.L('rsu', d.fr) }); }
    if (d.R.ccpc) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-corp', label: F.L('corp', d.fr) }); }
    if (d.R.debt) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-debt', label: F.L('debt', d.fr) }); }
    if (d.exp) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-risk', label: F.L('risk', d.fr) }); }
    // Action plan TOC entry added only if actions will fire (simple check: assume present)
    _tocN++; tocSections.push({ n: _tocN, id: 'sec-actions', label: d.fr ? 'Plan d\'action' : 'Action plan' });
    _tocN++; tocSections.push({ n: _tocN, id: 'sec-methodology', label: F.L('methodology', d.fr) });
    _tocN++; tocSections.push({ n: _tocN, id: 'sec-assumptions', label: d.fr ? 'Annexe \u2014 Hypoth\u00e8ses' : 'Appendix \u2014 Assumptions' });

    // Render TOC
    h += renderTOC(tocSections, d.fr);

    // ── Section rendering (phase-aware ordering) ──
    // Fix-plan flags: when the review pipeline detects a blocker, it sets
    // d._suppressed[sectionId] = true so the renderer skips that section
    // entirely. This is how the corrected-pass removes invalid GIS sections,
    // duplicates, etc., without requiring a re-run of the engine.
    var _suppressed = d._suppressed || {};
    var _isSuppressed = function(id) { return !!_suppressed[id]; };
    var secN = 0;

    // 0. Overall Assessment (always, before numbered sections)
    h += renderOverallAssessment(d);

    // 1. Diagnostic / Executive Summary (always)
    secN++;
    h += renderDiagnostic(d, secN);

    // 1.bis Teaser — Bilan readers see the What-If simulator pointer; Planner
    // readers get an upsell-style note pointing them back to the live tool.
    // The actual mount point at the end is gated identically.
    h += d.includeSimulator !== false ? _renderWhatIfTeaser(d) : _renderUpsellTeaser(d);

    // 1.5 What Could Change This — only if MC payload carries real sweep data
    // (renderLevers is gated on mc._sweeps; avoids fabricated closed-form deltas).
    if (_hasSweeps) {
      secN++;
      h += renderLevers(d, secN);
    }

    // ─── CH.2 — VOTRE SITUATION (who they are, what they have) ──────────
    // Profile + family + goals + asset-class deep dives. Asset deep dives
    // (real estate, corp, RSU, debts) moved up here from late-report so the
    // archetype's structural pillars appear *before* the trajectory section.
    // CCPC owners especially benefit: corporation reads as the centerpiece.
    secN++;
    h += renderProfile(d, secN);
    if (d.R.hasFamily) { secN++; h += renderFamily(d, secN); }
    if (d.R.hasGoals)  { secN++; h += renderGoals(d, secN); }
    var reHtml = renderRealEstate(d, secN + 1);
    if (reHtml)  { secN++; h += reHtml; }
    var corpHtml = renderCorp(d, secN + 1);
    if (corpHtml) { secN++; h += corpHtml; }
    var rsuHtml = renderRSU(d, secN + 1);
    if (rsuHtml) { secN++; h += rsuHtml; }
    var debtHtml = renderDebts(d, secN + 1);
    if (debtHtml) { secN++; h += debtHtml; }

    // ─── CH.3 — TRAJECTOIRE (what could happen) ─────────────────────────
    // Projection / revenue / histogram / sensitivity / risk / stress / cashflow.
    // Risk section moved up from previous position #17-18 to right after the
    // sensitivity heatmap so the dispersion narrative flows continuously.
    if (isDecum) {
      secN++; h += renderRevenue(d, secN);
      secN++; h += renderProjection(d, secN);
    } else {
      secN++; h += renderProjection(d, secN);
      secN++; h += renderRevenue(d, secN);
    }
    // V1 BAN per REPORT-SHIP-RULES.md:
    //   - Histogram (sec-histogram) was labeled "(approximation)" in many
    //     profiles → suppressed in V1 until verified as real-engine output.
    //   - Sensitivity heatmap (sec-sensitivity) is an educational
    //     approximation (not a real second MC run) → suppressed in V1.
    // The risk section's tornado covers the dispersion / sensitivity story.
    // Bilan readers can use the live What-If simulator for exact figures.
    // Risk + dispersion narrative (expert only) — placed adjacent to sensitivity
    // so the analytical thread stays continuous.
    if (d.exp) { secN++; h += renderRisk(d, secN); }
    // Stress tests
    secN++;
    h += renderStressTests(d, secN);
    // Year-by-year cash flow detail
    var cfHtml = renderCashflow(d, secN + 1);
    if (cfHtml) { secN++; h += cfHtml; }

    // ─── CH.4 — STRATÉGIE & DÉCISIONS (levers, taxes, transmission) ─────
    // Tax + draworder + meltdown clustered together (meltdown is a tax lever,
    // previously orphaned in position #16 between succession and real estate).
    // GIS / Succession / Insurance / Strategies follow.
    if (_hasStrats) { secN++; h += renderStrategies(d, secN); }
    secN++;
    h += renderTax(d, secN);
    if (_hasDrawTrace) { secN++; h += renderDrawOrder(d, secN); }
    var meltHtml = renderMeltdown(d, secN + 1);
    if (meltHtml) { secN++; h += meltHtml; }
    if (!_isSuppressed('sec-gis')) {
      var gisHtml = renderGIS(d, secN + 1);
      if (gisHtml) { secN++; h += gisHtml; }
    }
    var succHtml = renderSuccession(d, secN + 1);
    if (succHtml) { secN++; h += succHtml; }
    var insHtml = renderInsurance(d, secN + 1);
    if (insHtml) { secN++; h += insHtml; }

    // 17.5 Action Plan (rule-based; hidden when no actions apply)
    var actionsHtml = renderActionPlan(d, secN + 1);
    if (actionsHtml) { secN++; h += actionsHtml; }

    // 17.7 What-If simulator — Bilan-only. Planner customers use the live
    // Planner tool which is more capable than this embedded version.
    if (d.includeSimulator !== false) {
      h += _renderWhatIfMount(d);
    }

    // 18. Methodology (always)
    secN++;
    h += renderMethodology(d, secN);

    // 18.5 Assumptions appendix — consolidates engine inputs for audit trail
    secN++;
    h += renderAssumptions(d, secN);

    // 18.7 Glossary appendix — bilingual definitions (server-side renderer
    // calls into BFGlossary.renderAppendix which is loaded via the build
    // pipeline). Falls back gracefully if the module is missing.
    secN++;
    h += _renderGlossaryAppendix(d, secN);

    // 19. Signature page (last content page before footer)
    h += renderSignaturePage(d);

    // Footer
    h += renderFooter(d);

    // Inline interactive payload + scripts at the end of body so the DOM is
    // fully parsed before they execute. Each module reads window.__BUILDFI__
    // and decorates the static report with hover tooltips, year drilldown,
    // print-profile toggle, glossary, what-if simulator, etc.
    h += _emitInteractivePayload(d);

    h += '</body></html>';
    return h;
  };

  // Build the inline interactive payload: window.__BUILDFI__ JSON + the
  // pre-loaded BF_*_JS source strings as <script> tags. Order matters:
  // engine first (whatif depends on it), then tooltip / interactive / whatif
  // / glossary.
  function _emitInteractivePayload(d) {
    var p = d.p, mc = d.mc;
    var fr = d.fr;
    // Minimal payload — enough for tooltips, drilldown modal, and the
    // What-If simulator's _readBaseline() (it overrides via data-bf-whatif-params).
    var payload = {
      meta: {
        currentAge: p.age, retAge: p.retAge, deathAge: p.deathAge,
        sex: p.sex, prov: p.prov, fr: !!fr,
        clientName: (d.client && d.client.name) || '',
        nSim: p.nSim || 5000
      },
      baseline: {
        succ: d.succVal,
        medF: mc && mc.medF, rMedF: mc && mc.rMedF,
        p25F: mc && mc.p25F, rP25F: mc && mc.rP25F,
        p75F: mc && mc.p75F, rP75F: mc && mc.rP75F,
        p5Ruin: mc && mc.p5Ruin,
        medEstateNet: mc && mc.medEstateNet
      },
      pD: (mc && mc.pD) || [],
      medRevData: (mc && mc.medRevData) || []
    };
    var json = JSON.stringify(payload).replace(/<\/script/gi, '<\\/script');
    var out = '<script>window.__BUILDFI__=' + json + ';<\/script>';
    function _stripScriptClose(s) { return s.replace(/<\/script/gi, '<\\/script'); }
    var eJs = (typeof window !== 'undefined' && window.BF_ENGINE_JS) ? window.BF_ENGINE_JS : '';
    var tJs = (typeof window !== 'undefined' && window.BF_TOOLTIP_JS) ? window.BF_TOOLTIP_JS : '';
    var iJs = (typeof window !== 'undefined' && window.BF_INTERACTIVE_JS) ? window.BF_INTERACTIVE_JS : '';
    var wJs = (typeof window !== 'undefined' && window.BF_WHATIF_JS) ? window.BF_WHATIF_JS : '';
    var gJs = (typeof window !== 'undefined' && window.BF_GLOSSARY_JS) ? window.BF_GLOSSARY_JS : '';
    // Tooltip / interactive / glossary always inline (universal niceties).
    // Engine + What-If module only when includeSimulator is true (Bilan SKU).
    // Saves ~150 KB on Planner reports.
    if (tJs) out += '<script>' + _stripScriptClose(tJs) + '<\/script>';
    if (iJs) out += '<script>' + _stripScriptClose(iJs) + '<\/script>';
    if (gJs) out += '<script>' + _stripScriptClose(gJs) + '<\/script>';
    if (d.includeSimulator !== false) {
      if (eJs) out += '<script>' + _stripScriptClose(eJs) + '<\/script>';
      if (wJs) out += '<script>' + _stripScriptClose(wJs) + '<\/script>';
    }
    return out;
  }

})();
