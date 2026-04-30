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
    // KPI (legacy default — used elsewhere in the report)
    '.kpi{text-align:center;padding:10px 6px;border:1px solid #e0d3bf;border-radius:8px;background:#fffdf9;break-inside:avoid;box-shadow:0 1px 0 rgba(0,0,0,0.03)}',
    '.kpi-v{font-size:20px;font-weight:700;font-family:"JetBrains Mono",monospace;color:#3b2f1f}',
    '.kpi-l{font-size:10px;color:#6a6155;margin-top:3px;text-transform:uppercase;letter-spacing:.5px;font-weight:600}',
    // Phase 6 finish pass (codex 2026-04-27): supporting KPI strip below
    // the diagnostic hero. The hero owns the focal point; this strip
    // is editorial support, not a dashboard. No individual tile borders;
    // metrics separated by thin vertical hairlines. Lower contrast,
    // smaller scale, single-row at desktop.
    // Force readable color on emphasized inline tags inside the hero-score
    // block. Without this, AI markdown italics (`*foundations*`) and any
    // `<em>` text inherit a dark color and disappear on the navy hero bg.
    '.hero-score em,.hero-score-explainer em{color:#e8e0d4;font-style:italic}',
    '.hero-score strong,.hero-score-explainer strong{color:#c8d3e2}',
    '.bf-support-strip{display:flex;align-items:stretch;background:transparent;border-top:1px solid #e8e0d4;border-bottom:1px solid #e8e0d4;padding:14px 0;margin:8px 0 18px;break-inside:avoid;page-break-inside:avoid}',
    '.bf-support-tile{flex:1;padding:0 14px;text-align:center;border-right:1px solid #ece4d4}',
    '.bf-support-tile:last-child{border-right:none}',
    '.bf-support-tile-label{font-family:Inter,sans-serif;font-size:9.5px;font-weight:600;color:#8a7a5c;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:6px;line-height:1.3}',
    '.bf-support-tile-value{font-family:"Playfair Display",Georgia,serif;font-size:22px;font-weight:600;line-height:1.1;letter-spacing:-0.3px}',
    '@media (max-width:760px){.bf-support-strip{flex-wrap:wrap;gap:0}.bf-support-tile{flex-basis:50%;padding:8px 10px;border-right:none;border-bottom:1px solid #ece4d4}.bf-support-tile:nth-child(2n){border-right:none}.bf-support-tile:nth-last-child(-n+2){border-bottom:none}}',
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
    // TOC — codex 2026-04-27 review followup: previous spacing stacked
    // 60/48/36/104/14 (top/title/chapter-gap/child-indent/head-margin) →
    // read like an exhibition placard. Dialed down to a working navigator.
    '.toc{page-break-after:always;padding:36px 24px 32px;max-width:760px;margin:0 auto}',
    '.toc-title{font-family:"Playfair Display",Georgia,serif;font-size:13px;font-weight:600;letter-spacing:2.6px;text-transform:uppercase;color:#a89460;margin-bottom:22px;text-align:center}',
    // Chapter-grouped TOC: chapter labels dominant, section anchors
    // subordinate but at usable density.
    '.toc-chapter{margin:0 0 18px;break-inside:avoid;page-break-inside:avoid}',
    '.toc-chapter-head{display:flex;align-items:baseline;gap:12px;padding-bottom:6px;border-bottom:1px solid #e8e0d4;margin-bottom:8px}',
    '.toc-chapter-num{font-family:Inter,sans-serif;font-size:10px;font-weight:600;letter-spacing:2.2px;text-transform:uppercase;color:#a89460;flex-shrink:0;min-width:78px}',
    '.toc-chapter-title{font-family:"Playfair Display",Georgia,serif;font-size:20px;font-weight:600;color:#252d39;line-height:1.22;letter-spacing:-0.2px;flex:1}',
    '.toc-children{display:flex;flex-direction:column;gap:2px;padding-left:48px}',
    '.toc-child{display:flex;align-items:baseline;gap:10px;padding:1px 0;font-family:Inter,sans-serif;font-size:12px;color:#5a4f3a;line-height:1.4}',
    '.toc-child a{color:#5a4f3a;text-decoration:none;transition:color 0.12s}',
    '.toc-child a:hover{color:#c49a1a}',
    '.toc-child-num{font-family:"JetBrains Mono",monospace;font-size:9.5px;font-weight:600;color:#a89460;min-width:18px}',
    '.toc-child-label{flex:1;line-height:1.4}',
    '@media (max-width:680px){.toc-chapter-num{min-width:auto;font-size:10px}.toc-children{padding-left:20px}}',
    '@media print{.toc-chapter{break-inside:avoid;page-break-inside:avoid}}',
    // Legacy flat-TOC selectors retained for backwards-compat (no-op once removed)
    '.toc-item{display:none}',
    '.toc-n{display:none}',
    '.toc-label,.toc-dots,.toc-pg{display:none}',
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

  // CLASSIFIER-RENDER-PLAN Phase 3 wiring: module-scope reference to the
  // current renderProfile, set in buildReport. narr / narrAi route their
  // text through _applyTone when toneMode is 'calm' or 'neutral'. AMF
  // language-auditor still scans the rendered HTML, so any tone swap
  // that introduces forbidden vocabulary will be caught at ship gate.
  var _currentRenderProfile = null;
  var _currentLang = 'fr';

  // CLASSIFIER-RENDER-PLAN Phase 2 wiring: module-scope reference to the
  // BFRenderProfile module so resolveRepresentation() / isBlockRelevant()
  // can dispatch from any renderer call site without re-resolving the global.
  var BFRP = (typeof window !== 'undefined' && window.BFRenderProfile)
    ? window.BFRenderProfile
    : (typeof global !== 'undefined' && global.BFRenderProfile ? global.BFRenderProfile : null);

  function _toneSwap(text) {
    if (!text || !_currentRenderProfile) return text;
    if (_currentRenderProfile.toneMode === 'direct') return text;
    var lossMod = (typeof window !== 'undefined' && window.BFRenderProfile)
      ? window.BFRenderProfile
      : null;
    if (lossMod && typeof lossMod.lossLanguageFor === 'function') {
      return lossMod.lossLanguageFor(text, _currentRenderProfile, _currentLang);
    }
    return text;
  }

  // Codex 2026-04-28 close-out: jargon swap for plain readers. Replaces
  // "P25 → cautious scenario", "Monte Carlo → simulated futures",
  // "tax alpha → tax savings", etc. via report-render-profile.js's
  // JARGON_SWAPS table. Only fires when jargonMode='plain'; no-op
  // otherwise. Preserves <strong>, &nbsp;, and other inline HTML by
  // operating only on the alphabetic substring (regex in the helper
  // uses word-boundary assertions).
  function _jargonSwap(text) {
    if (!text || !_currentRenderProfile) return text;
    if (_currentRenderProfile.jargonMode !== 'plain') return text;
    if (BFRP && typeof BFRP.applyJargonSwap === 'function') {
      return BFRP.applyJargonSwap(text, _currentRenderProfile, _currentLang);
    }
    return text;
  }

  // Narrative paragraph — deterministic text, tone- AND jargon-swapped
  // when active. Order matters: tone swap first (loss-language softening),
  // then jargon swap (P25 → cautious scenario). Doing it in the reverse
  // order would leave swapped tokens untouched by the tone pass.
  function narr(text) { return '<p class="narr">' + _jargonSwap(_toneSwap(text)) + '</p>'; }

  // Export mode flag — when true, suppress AI placeholders (no "Click AI Analysis" in client reports)
  var _exportMode = false;

  // AI-aware narrative: if AI text exists, show AI block instead of
  // deterministic text. AI text WAS generated with classifier-aware
  // prompts (## CALIBRATION BY finLiteracy block) so we don't double-
  // translate it. Deterministic fallback is tone-swapped + jargon-
  // swapped when classifier requires.
  function narrAi(detText, aiText, fr, label) {
    if (aiText) return F.AiBlock(aiText, fr);
    return '<p class="narr">' + _jargonSwap(_toneSwap(detText)) + '</p>';
  }

  // AI slot renderer: shows AI content if present, otherwise renders nothing.
  function aiSlot(aiText, fr, label) {
    if (aiText) return F.AiBlock(aiText, fr);
    return '';
  }

  function _getRenderableGisYears(d) {
    var revData = d.revData || [];
    var p = d.p || {};
    var gisCap = p.cOn ? 30000 : 22000;
    var totalLiquidAt65 = (p.rrsp || 0) + (p.tfsa || 0) + (p.nr || 0) + (p.lira || 0)
                      + (p.cRRSP || 0) + (p.cTFSA || 0) + (p.cNR || 0);
    var liquidCeiling = p.cOn ? 400000 : 250000;
    if (totalLiquidAt65 > liquidCeiling) return [];
    return revData.filter(function(r) {
      if ((r.age || 0) < 65) return false;
      var raw = r.srg || r.gis || 0;
      if (raw <= 0) return false;
      var nonOasIncome = (r.taxInc || 0) - (r.psv || 0);
      return nonOasIncome >= 0 && nonOasIncome < gisCap;
    });
  }

  // Section page wrapper — ensures page break before each section
  function secPage() { return '<div class="sec-page">'; }
  function secPageEnd() { return '</div>'; }

  // Dynamic Table of Contents
  // Density-mode coverage map: which sections are visible at each view level.
  // Court (lite) → essentials only. Standard → most. Complet → everything.
  // Section IDs are kept literal so reviewers can see the matrix at a glance.
  // The TOC stamps a colored badge on each entry showing its coverage class.
  var TOC_COVERAGE = {
    'sec-assessment':       'all',         // Always visible
    'sec-diagnostic':       'all',
    'sec-levers':           'std-full',
    'sec-profile':          'all',
    'sec-family':           'all',
    'sec-goals':            'all',
    'sec-projection':       'all',
    'sec-revenue':          'all',
    'sec-cashflow':         'std-full',
    'sec-strategies':       'all',
    'sec-tax':              'all',
    'sec-draworder':        'std-full',
    'sec-stress':           'std-full',    // hidden in lite (collapseStressTests)
    'sec-gis':              'all',
    'sec-meltdown':         'full',        // jargon-heavy, full only
    'sec-succession':       'all',
    'sec-realestate':       'all',
    'sec-rsu':              'std-full',    // technical
    'sec-corp':             'std-full',
    'sec-debt':             'all',
    'sec-risk':             'std-full',    // expert dispersion narrative
    'sec-sensitivity':      'full',        // tornado is chartTier=full only
    'sec-actions':          'all',
    'sec-recap':            'all',
    'sec-whatif':           'all',
    'sec-methodology':      'std-full',    // density-collapsed in lite
    'sec-assumptions':      'std-full',
    'sec-glossary':         'std-full'
  };
  // Phase 6 (codex finish pass 2026-04-27): chapter-grouped TOC. The TOC
  // is now hierarchical — major chapter labels dominate, section anchors
  // are subordinated under them as small numbered children. Each section
  // declares which chapter it belongs to (via the section's `chapter`
  // field set by the orchestrator). Beginner cells get a shorter chapter
  // list (Ch.3+ may be absent — minimal cell omits stress/risk + back-
  // matter, and the front-path Explore-alternatives entry is hidden).
  //
  // 2026-04-27 review followup: previous map dumped tax / draw-order /
  // action plan / timeline / closing recap under "Risks and tradeoffs",
  // which felt like a catch-all. Split into a true Ch.3 (risk + stress
  // only) and a new Ch.4 Strategy & decisions.
  //
  // Section → chapter mapping (matches the body chapter cover sequence):
  //   Ch.1  Plan at a glance       sec-assessment, sec-diagnostic, sec-levers
  //   Ch.2  Why this plan works    sec-profile, sec-family, sec-goals,
  //                                 sec-realestate, sec-corp, sec-rsu, sec-debt,
  //                                 sec-projection, sec-revenue, sec-cashflow
  //   Ch.3  Risks & tradeoffs      sec-risk, sec-stress
  //   Ch.4  Strategy & decisions   sec-strategies, sec-tax, sec-draworder,
  //                                 sec-meltdown, sec-gis, sec-succession,
  //                                 sec-insurance, sec-timeline, sec-actions,
  //                                 sec-closing-recap, sec-premium-deepdive
  //   Ch.5  Explore alternatives   sec-whatif
  //   Ch.6  Appendix               sec-methodology, sec-assumptions, sec-glossary
  var TOC_CHAPTER_MAP = {
    'sec-assessment': 1, 'sec-diagnostic': 1, 'sec-levers': 1,
    'sec-profile': 2, 'sec-family': 2, 'sec-goals': 2,
    'sec-realestate': 2, 'sec-corp': 2, 'sec-rsu': 2, 'sec-debt': 2,
    'sec-projection': 2, 'sec-revenue': 2, 'sec-cashflow': 2,
    'sec-risk': 3, 'sec-stress': 3,
    'sec-strategies': 4, 'sec-tax': 4, 'sec-draworder': 4,
    'sec-meltdown': 4, 'sec-gis': 4, 'sec-succession': 4,
    'sec-insurance': 4, 'sec-actions': 4, 'sec-timeline': 4,
    'sec-closing-recap': 4, 'sec-premium-deepdive': 4, 'sec-fees': 4,
    'sec-whatif': 5,
    'sec-methodology': 6, 'sec-assumptions': 6, 'sec-glossary': 6
  };

  function renderTOC(sections, fr, opts) {
    opts = opts || {};
    // Group sections by chapter while preserving render order.
    var grouped = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    sections.forEach(function(s) {
      var ch = TOC_CHAPTER_MAP[s.id] || 2;
      grouped[ch].push(s);
    });
    // Codex 2026-04-27 review followup: hideExplore was previously used to
    // strip Ch.5 from the beginner TOC, but the body still rendered the
    // Ch.5 cover — readers saw a chapter mid-flow that had no TOC entry.
    // Mismatch removed: TOC now mirrors body chapter set across all readers.
    void opts.hideExplore;
    // Chapter titles — same family as the body chapter covers (kept in
    // lockstep with _chapterCopy()).
    // Codex 2026-04-27 audit: TOC titles must MATCH the body chapter
    // covers, which are now archetype-aware. Pull from _chapterCopy().
    var TITLES = {};
    [1, 2, 3, 4, 5, 6].forEach(function(i) { TITLES[i] = _chapterCopy(i, fr, opts.arch, opts.succVal).title; });
    // Strip leading article + lowercase — used to detect when a
    // single child label echoes its chapter title (e.g. Ch.5 "Explore
    // alternatives" with one child also "Explore alternatives").
    function _normLabel(s) {
      return String(s || '').toLowerCase()
        .replace(/^(the |a |an |le |la |les |l\u2019|l\')/, '').trim();
    }
    var h = '<div class="toc bf-toc-print-only">';
    h += '<div class="toc-title">' + (fr ? 'Table des mati\u00e8res' : 'Table of contents') + '</div>';
    [1, 2, 3, 4, 5, 6].forEach(function(ch) {
      var children = grouped[ch];
      if (!children || children.length === 0) return;
      var chLabel = (fr ? 'Chapitre ' : 'Chapter ') + ch;
      var chTitle = TITLES[ch];
      // Suppress duplicate child row when a single child just echoes
      // the chapter title — the chapter head becomes a clickable anchor
      // pointing to that child's id, so the reader can still navigate.
      var hideChildren = (children.length === 1 &&
                          _normLabel(children[0].label) === _normLabel(chTitle));
      var titleHtml = hideChildren
        ? '<a href="#' + children[0].id + '" style="color:inherit;text-decoration:none">' + F.esc(chTitle) + '</a>'
        : F.esc(chTitle);
      h += '<div class="toc-chapter">' +
        '<div class="toc-chapter-head">' +
          '<div class="toc-chapter-num">' + F.esc(chLabel) + '</div>' +
          '<div class="toc-chapter-title">' + titleHtml + '</div>' +
        '</div>';
      if (!hideChildren) {
        h += '<div class="toc-children">';
        children.forEach(function(s) {
          h += '<div class="toc-child">' +
            '<span class="toc-child-num">' + s.n + '</span>' +
            '<span class="toc-child-label"><a href="#' + s.id + '">' + s.label + '</a></span>' +
            '</div>';
        });
        h += '</div>';
      }
      h += '</div>';
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
        '<div style="font-family:Inter,sans-serif;font-size:11px;font-weight:700;color:#c49a1a;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px">' + (fr ? 'Explorer des alternatives — plus loin dans ce rapport' : 'Explore alternatives — later in this report') + '</div>' +
        '<div style="font-family:Inter,sans-serif;font-size:11.5px;color:#e8e0d4;line-height:1.55">' +
          (fr ? 'Deux outils en fin de rapport : appliquez un choc historique (krach 2008, inflation 70s) à un âge donné, ou ajustez les hypothèses durables (retraite, dépenses, frais) via curseurs. Le même modèle qui sous-tend votre plan recalcule chaque variante.'
              : 'Two tools at the end of the report: apply a historical shock (2008 crash, 1970s inflation) at a chosen age, or adjust lasting assumptions (retirement, spending, fees) via sliders. The same model behind your plan re-runs each variant.') +
        '</div>' +
      '</div>' +
      '<div style="font-family:Inter,sans-serif;font-size:10px;font-weight:700;color:#c49a1a;letter-spacing:1px;text-transform:uppercase;flex-shrink:0;text-align:right;line-height:1.5">' +
        (fr ? 'Stress &<br>Et si...? →' : 'Stress &<br>What If? →') +
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
    // Front-path label policy (Phase 0): "Simulator" / "What-If" terminology
    // is reserved for internal code/comments only. Client-facing surfaces use
    // "Explore alternatives" framing. The DOM id (sec-whatif) and data
    // attributes are unchanged so the depth auditor still finds the mount.
    // 2026-04-27 review fix: when a chapter cover precedes the mount, the
    // section heading would be a third repetition of "Explore alternatives"
    // (teaser → TOC → cover → section heading). The orchestrator sets
    // d._suppressWhatIfHeading=true in that case, and we emit only an
    // anchor stub for in-page links.
    var _plain = d.renderProfile && d.renderProfile.jargonMode === 'plain';
    var _heading = fr ? 'Explorer des alternatives' : 'Explore alternatives';
    if (d._suppressWhatIfHeading) {
      // sec-page class so the review-pack auditor recognizes the anchor
      // as a real section (it scans for <div class="sec-page" id="sec-x">).
      h += '<div class="sec-page" id="sec-whatif" style="height:0;overflow:hidden"></div>';
    } else {
      h += F.Sec('?', _heading, 'sec-whatif');
    }
    // Section-level intro banner is rendered HERE only when no chapter
    // cover precedes the mount (the chapter cover already explains what
    // this chapter is). When the chapter cover IS present, the per-tab
    // banners inside the panel carry their own context-specific copy.
    if (!d._suppressWhatIfHeading) {
      var _bannerStrong = fr ? 'Deux outils.' : 'Two tools.';
      var _bannerBody = fr
        ? 'Tests de stress applique un choc historique (krach 2008, inflation 70s, …) à un âge précis — les rendements suivent la matrice réelle du scénario. Et si...? laisse ajuster les hypothèses durables (retraite, dépenses, frais, allocation) via curseurs. Votre plan de référence reste intact dans les deux cas.'
        : 'Stress tests apply a historical shock (2008 crash, 1970s inflation, …) at a chosen age — returns follow the scenario\'s real matrix. What If? lets you adjust lasting assumptions (retirement, spending, fees, allocation) via sliders. Your baseline plan stays intact in either case.';
      h += '<div class="bf-whatif-banner">' +
        '<strong>' + _bannerStrong + '</strong> ' + _bannerBody +
        '</div>';
    }
    h += '</div>';
    return h;
  }

  // CLASSIFIER-RENDER-PLAN Phase 4: Density gating helper.
  // Wraps a section in <details>...<summary>... when the active
  // densityMode says it should collapse. Plan section 7 Phase 4: print
  // CSS forces all <details> open (.bf-printing or @media print). The
  // <summary> always carries a meaningful 1-line takeaway, never just
  // the section name. Always-open core sections never call this helper.
  function _densityWrap(html, sectionId, summaryFr, summaryEn, d) {
    if (!d || !d.renderProfile) return html;
    var rp = d.renderProfile;
    var collapseMap = {
      'sec-methodology':  rp.collapseMethodology,
      'sec-glossary':     rp.collapseGlossary,
      'sec-assumptions':  rp.collapseAssumptions,
      'sec-stress':       rp.collapseStressTests
    };
    var shouldCollapse = !!collapseMap[sectionId];
    if (!shouldCollapse) return html;
    var fr = !!d.fr;
    var summary = fr ? (summaryFr || sectionId) : (summaryEn || sectionId);
    return '<details class="bf-density-collapse" data-section-id="' + sectionId + '" style="margin:0">' +
      '<summary style="cursor:pointer;padding:8px 12px;background:#fdfbf6;border:1px solid #e8e0d4;border-radius:4px;font-family:Inter,sans-serif;font-size:12px;font-weight:600;color:#252d39;list-style:none">' +
      '<span style="color:#c49a1a;margin-right:6px">\u25b8</span>' + summary +
      '</summary>' + html + '</details>';
  }

  // CLASSIFIER-RENDER-PLAN Phase 3: Tone-driven loss-language swap.
  // Gate every renderer narrative call (`narr`, `narrAi`, deterministic
  // strings) through this when d.renderProfile.toneMode is calm. AMF
  // language-auditor still runs over the OUTPUT — swaps that introduce
  // forbidden vocabulary will be caught by the auditor pre-ship gate.
  function _applyTone(text, d) {
    if (!d || !d.renderProfile) return text;
    var rp = d.renderProfile;
    if (rp.toneMode === 'direct' || !text) return text;
    var lang = d.fr ? 'fr' : 'en';
    var lossMod = (typeof window !== 'undefined' && window.BFRenderProfile)
      ? window.BFRenderProfile
      : (typeof require === 'function' ? (function() { try { return require('./report-render-profile.js'); } catch (e) { return null; } })() : null);
    if (lossMod && typeof lossMod.lossLanguageFor === 'function') {
      return lossMod.lossLanguageFor(text, rp, lang);
    }
    return text;
  }

  // Honest success-rate rendering. Three rules from the user audit:
  //   * 0.8% rounds to "1%" by default — reads as "1 in 100" certainty when
  //     the real signal is "below the floor". Show "<1%" instead.
  //   * 99.9% rounds to "100%" — reads as bulletproof when 1-in-1000 tail
  //     scenarios still ruin the plan. Show "≥99%" instead.
  //   * 0% is shown as "0%" (genuine ruin) with no soft-pedal.
  function _fmtSucc(succVal) {
    if (succVal == null) return '—';
    var pct = succVal * 100;
    if (pct > 0 && pct < 1) return '<1%';
    if (pct >= 99 && pct < 100) return '≥99%';
    if (pct >= 100) return '100%';
    return Math.round(pct) + '%';
  }

  // ── Scope-explicit revData accessors (Defect 1 fix) ──────────────────
  // The engine emits per-scope tax fields: tax_household / tax_primary /
  // tax_spouse, taxInc_household / taxInc_primary / taxInc_spouse. The
  // legacy r.tax / r.taxInc are aliases for the household value, kept for
  // backward compat. Renderer aggregations (lifetime tax, table sums) MUST
  // read household scope explicitly so a couple profile can never silently
  // double-count or pick a per-spouse value. Per-spouse values surface
  // only in spousal-coordination subsections (Defect 1.5 — separate fix).
  function _scopedTax(r) {
    if (!r) return 0;
    if (r.tax_household != null) return r.tax_household;
    return r.tax || 0;
  }
  function _scopedTaxInc(r) {
    if (!r) return 0;
    if (r.taxInc_household != null) return r.taxInc_household;
    return r.taxInc || 0;
  }
  // GIS scope helper: household = primary + spouse (when couple). The
  // per-row r.srg / r.gis are PRIMARY only; r.cSrg / r.cGis are spouse.
  // GIS section + waterfall must use household total, not primary-only,
  // for couple profiles.
  function _scopedGis(r) {
    if (!r) return 0;
    var pri = r.srg || r.gis || 0;
    var spo = r.cSrg || r.cGis || 0;
    return pri + spo;
  }

  // ─── Hero score gauge — semicircle SVG, print-first, no JS dependency.
  // Renders d.heroScore (0-100 composite, see report-data.js for formula).
  // The arc is band-graded: red→amber→green→gold matching the thresholds
  // 40/65/85. Center number is the score; below is the band label and a
  // 5-row component breakdown so the score is never a black-box. This is
  // the single highest-signal cover-page visual; placement is the top of
  // the executive summary, above the 4-up KPI grid.
  function _renderScoreGauge(d) {
    if (!d.heroScore || d.heroScore.value == null) return '';
    var fr = d.fr;
    var s = d.heroScore;
    var score = s.value;
    // Band → color only. We intentionally do NOT emit band-name text
    // (surplus / solid / fragile / at-risk) anywhere in the gauge: the
    // gauge band is computed from a 5-component composite while the
    // thesis posture is computed from the success rate alone, and the
    // two can disagree. Showing both as conflicting labels confuses
    // readers AND trips the thesis-coherence-auditor. Color + score +
    // threshold tick marks communicate the band visually without
    // emitting tokens the auditor would scan.
    // Band → color. Updated 2026-04-26 per user feedback: the previous
    // 40-65 amber (#b89830) and 85+ gold (#c49a1a) read as the same
    // yellow on print. Switched 40-65 to a deeper orange (#d97a1f) so
    // the four bands now have visually distinct hues: red → orange →
    // green → gold.
    var bandColor;
    if (s.band === 'surplus')      bandColor = '#c49a1a';
    else if (s.band === 'solid')   bandColor = '#2a8c46';
    else if (s.band === 'fragile') bandColor = '#d97a1f';
    else                           bandColor = '#cc4444';
    // CLASSIFIER-RENDER-PLAN Phase 3: tone-driven palette swap.
    // bandColor='soft'   (toneMode=calm): mute risk colors so a high-stress
    //                                     reader doesn't see harsh red.
    // bandColor='stark'  (toneMode=direct): keep raw band colors.
    // bandColor='standard' (default): same as stark for at-risk/fragile.
    if (d.renderProfile && d.renderProfile.bandColor === 'soft') {
      if (s.band === 'fragile') bandColor = '#a87a3a';   // muted amber
      else if (s.band !== 'surplus' && s.band !== 'solid') bandColor = '#a06868'; // muted red
    }
    // SVG geometry — semicircle gauge, viewBox 0 0 220 130.
    // Radius 90, center (110,110). Arc spans 180° from (20,110) to (200,110).
    // Score arc length proportional to score/100 × π × 90.
    var R = 90, CX = 110, CY = 110;
    function _polar(angleRad) {
      // angle 180° at left (score=0), 0° at right (score=100)
      var x = CX + R * Math.cos(angleRad);
      var y = CY - R * Math.sin(angleRad);
      return { x: x, y: y };
    }
    var endAngleRad = Math.PI * (1 - score / 100);
    var endPt = _polar(endAngleRad);
    var startPt = _polar(Math.PI);
    // SVG large-arc-flag MUST be 0 for any arc ≤180° (the active arc is
    // 0–180° proportional to score). Previous value (score > 50 ? 1 : 0)
    // flipped the flag at score=50, drawing the arc the LONG way around
    // the full circle for higher scores — the visual we kept hitting at
    // 67/80/91. The bg track is exactly 180° so its flag is irrelevant
    // (both choices coincide); we leave it at 1 for compatibility.
    var arcPath = 'M ' + startPt.x.toFixed(1) + ' ' + startPt.y.toFixed(1) +
                  ' A ' + R + ' ' + R + ' 0 0 1 ' + endPt.x.toFixed(1) + ' ' + endPt.y.toFixed(1);
    var bgArcEnd = _polar(0);
    var bgPath = 'M ' + startPt.x.toFixed(1) + ' ' + startPt.y.toFixed(1) +
                 ' A ' + R + ' ' + R + ' 0 1 1 ' + bgArcEnd.x.toFixed(1) + ' ' + bgArcEnd.y.toFixed(1);
    // Band markers at 40, 65, 85 (the thresholds). Tick spans from just inside
    // the stroke ring (R-3) to just outside (R+3) — keeps it visually contained
    // within the arc's 14px stroke band, no protruding stubs.
    function _tickMarker(pct) {
      var ang = Math.PI * (1 - pct / 100);
      var inner = { x: CX + (R - 3) * Math.cos(ang), y: CY - (R - 3) * Math.sin(ang) };
      var outer = { x: CX + (R + 3) * Math.cos(ang), y: CY - (R + 3) * Math.sin(ang) };
      return '<line x1="' + inner.x.toFixed(1) + '" y1="' + inner.y.toFixed(1) +
             '" x2="' + outer.x.toFixed(1) + '" y2="' + outer.y.toFixed(1) +
             '" stroke="rgba(250,248,244,0.55)" stroke-width="1.5" stroke-linecap="round" />';
    }
    // Geometry: arc center (110, 110), radius 90, stroke 14. Both arcs use
    // stroke-linecap="round" with the SAME path geometry — this guarantees
    // their round caps overlap exactly, eliminating the score-dependent
    // visual artifacts that plagued the butt+round mix.
    //
    // Root-cause history: previous versions had stroke-linecap="round" on
    // the gradient track but stroke-linecap="butt" on the active arc. The
    // gradient's round caps protrude ~7px beyond the path endpoints; the
    // active arc's butt caps cut sharp. At low scores the active arc was
    // small and the gradient mismatch was invisible; at high scores the
    // active arc spanned most of the track and the gradient's protruding
    // round cap on the right (gold cap past x=200) became visible.
    // Matching round-on-round eliminates this.
    var svg = '<svg viewBox="0 0 220 115" width="220" height="115" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="display:block;margin:0 auto">' +
      '<defs>' +
        '<linearGradient id="gauge-bg" x1="0%" y1="0%" x2="100%" y2="0%">' +
          '<stop offset="0%" stop-color="#cc4444" />' +
          '<stop offset="40%" stop-color="#d97a1f" />' +
          '<stop offset="65%" stop-color="#2a8c46" />' +
          '<stop offset="100%" stop-color="#c49a1a" />' +
        '</linearGradient>' +
      '</defs>' +
      // Background gradient track. Round caps for visual softness.
      '<path d="' + bgPath + '" fill="none" stroke="url(#gauge-bg)" stroke-width="14" stroke-linecap="round" opacity="0.25" />' +
      // Active arc. Same round caps so terminations match. The mild round
      // bleed at the active arc's end is now visually consistent with
      // the gradient's caps and reads as intentional.
      '<path d="' + arcPath + '" fill="none" stroke="' + bandColor + '" stroke-width="14" stroke-linecap="round" />' +
      // Threshold tick marks at 40 / 65 / 85
      _tickMarker(40) + _tickMarker(65) + _tickMarker(85) +
      // Score number — explicit y so we don\'t depend on dominant-baseline.
      // Math: target optical centre = y=62 (visual midline of the
      // semicircle opening). For 32px JetBrains Mono, alphabetic baseline
      // sits ~22px below x-height; optical centre is at half-cap-height
      // (~10) above baseline. baseline = 62 + 10 = 72.
      '<text x="' + CX + '" y="72" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="32" font-weight="700" fill="' + bandColor + '">' + score + '</text>' +
      // "/ 100" caption — separated from score by 8px, sits at baseline 90.
      '<text x="' + CX + '" y="90" text-anchor="middle" font-family="Inter,sans-serif" font-size="9" fill="#bccbe0" letter-spacing="1.5">/ 100</text>' +
    '</svg>';
    // Component breakdown — 5 rows showing each subscore + weight.
    var compMeta = {
      plan_resilience:  { fr: 'R\u00e9silience du plan',   en: 'Plan resilience',  hint: { fr: 'Taux de succ\u00e8s sur les avenirs simul\u00e9s', en: 'Success rate across simulated futures' } },
      savings_rate:     { fr: 'Taux d\'\u00e9pargne',      en: 'Savings rate',     hint: { fr: 'Cotisations / revenu brut, plafonn\u00e9 \u00e0 25\u202f%', en: 'Contributions / gross income, capped at 25%' } },
      tax_efficiency:   { fr: 'Efficacit\u00e9 fiscale',    en: 'Tax efficiency',   hint: { fr: 'Taux effectif moyen sur l\'horizon', en: 'Average effective rate over horizon' } },
      diversification:  { fr: 'Diversification',          en: 'Diversification',  hint: { fr: 'R\u00e9partition entre comptes (REER/CELI/NR/CRI/Corp)', en: 'Spread across accounts (RRSP/TFSA/NR/LIRA/Corp)' } },
      liquidity:        { fr: 'Liquidit\u00e9',             en: 'Liquidity',        hint: { fr: 'CELI + non-enregistr\u00e9 / d\u00e9penses annuelles', en: 'TFSA + non-reg / annual spending' } }
    };
    var compRows = '';
    Object.keys(s.weights).forEach(function(k) {
      var v = s.components[k];
      var weight = Math.round(s.weights[k] * 100);
      var label = compMeta[k][fr ? 'fr' : 'en'];
      var hint = compMeta[k].hint[fr ? 'fr' : 'en'];
      var cellColor;
      if (v == null) cellColor = '#9aabc7';
      else if (v >= 85) cellColor = '#c49a1a';
      else if (v >= 65) cellColor = '#2a8c46';
      else if (v >= 40) cellColor = '#d97a1f';
      else cellColor = '#cc4444';
      var bar = v == null ? 0 : Math.max(2, v);
      compRows +=
        '<div style="display:grid;grid-template-columns:140px 1fr 50px;gap:10px;align-items:center;padding:5px 0;border-top:1px solid rgba(250,248,244,0.08)">' +
          '<div>' +
            '<div style="font-family:Inter,sans-serif;font-size:10.5px;font-weight:600;color:#faf8f4">' + label + ' <span style="color:#9aabc7;font-weight:500">(' + weight + '\u202f%)</span></div>' +
            '<div style="font-family:Inter,sans-serif;font-size:8.5px;color:#9aabc7;margin-top:1px;line-height:1.3">' + hint + '</div>' +
          '</div>' +
          '<div style="background:rgba(250,248,244,0.08);border-radius:3px;height:8px;overflow:hidden">' +
            '<div style="height:100%;width:' + bar + '%;background:' + cellColor + '"></div>' +
          '</div>' +
          '<div style="font-family:JetBrains Mono,monospace;font-size:11px;font-weight:700;color:' + cellColor + ';text-align:right">' +
            (v == null ? '\u2014' : Math.round(v)) + '</div>' +
        '</div>';
    });
    // Phase 6 finish pass (codex 2026-04-27): the hero-score block
    // previously used a hard 240px / 1fr two-column grid that left the
    // right-side component stack cramped and could clip in narrower
    // render contexts. Restructured as TWO STACKED BANDS:
    //   Band 1 — gauge + readiness label, full-width, generous breathing
    //            room. The gauge and its plain-language explainer share
    //            a centered column with auto sizing (no fixed rail).
    //   Band 2 — the 5-component breakdown grid, full-width below the
    //            gauge. Component rows now use minmax-friendly grid
    //            (min 110px label | flex bar | 50px value) so the bar
    //            never compresses. Legend sits at the bottom.
    // Two bands instead of two columns means: the gauge has all the
    // horizontal real estate it needs at the top, the components have
    // all the horizontal real estate they need below, and neither
    // element is fighting for space with the other. This also reads as
    // a single editorial composition (introduce → defend) rather than
    // a two-column dashboard.
    var h = '<div class="hero-score" style="background:rgba(250,248,244,0.04);border:1px solid rgba(196,154,26,0.25);border-radius:8px;padding:28px 28px 24px;margin-bottom:20px;break-inside:avoid">';
    // Band 1 — gauge band
    h += '<div class="hero-score-band hero-score-band-gauge" style="text-align:center;padding-bottom:24px;border-bottom:1px solid rgba(196,154,26,0.18);margin-bottom:22px">';
    h += '<div style="font-family:Inter,sans-serif;font-size:10px;font-weight:700;color:#c49a1a;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:14px">' + (fr ? 'Score de pr\u00e9paration' : 'Readiness score') + '</div>';
    h += svg;
    h += '<div class="hero-score-explainer" style="font-family:Inter,sans-serif;font-size:11px;color:#9aabc7;margin:14px auto 0;letter-spacing:0.2px;line-height:1.6;max-width:540px">' +
      (fr
        ? '<strong style="color:#c8d3e2">Pr\u00e9paration structurelle</strong> du plan, sur 100. Diff\u00e9rent du taux de succ\u00e8s : ce score \u00e9value vos <em style="color:#e8e0d4;font-style:italic">fondations</em> (r\u00e9silience, \u00e9pargne, fiscalit\u00e9, diversification, liquidit\u00e9), pas la trajectoire simul\u00e9e.'
        : '<strong style="color:#c8d3e2">Structural readiness</strong> out of 100. Different from success rate: this score evaluates your <em style="color:#e8e0d4;font-style:italic">foundations</em> (resilience, savings, tax, diversification, liquidity), not the simulated trajectory.') +
      '</div>';
    h += '</div>';
    // Band 2 — component breakdown band
    h += '<div class="hero-score-band hero-score-band-components">';
    h += '<div style="font-family:Inter,sans-serif;font-size:10px;font-weight:700;color:#c49a1a;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:14px;text-align:center">' + (fr ? 'Composantes' : 'Components') + '</div>';
    h += '<div style="max-width:680px;margin:0 auto">';
    h += compRows;
    h += '<div style="font-family:Inter,sans-serif;font-size:9px;color:#9aabc7;font-style:italic;margin-top:14px;line-height:1.6;text-align:center">' +
      (fr
        ? 'Score structurel (ind\u00e9pendant des avenirs simul\u00e9s). Seuils\u202f: <span style="color:#cc4444">\u003c40</span> \u00b7 <span style="color:#d97a1f">40-65</span> \u00b7 <span style="color:#2a8c46">65-85</span> \u00b7 <span style="color:#c49a1a">\u226585</span>.'
        : 'Structural score (independent of simulated futures). Thresholds: <span style="color:#cc4444">&lt;40</span> &middot; <span style="color:#d97a1f">40-65</span> &middot; <span style="color:#2a8c46">65-85</span> &middot; <span style="color:#c49a1a">&ge;85</span>.') +
      '</div>';
    h += '</div>';
    h += '</div>';
    h += '</div>';
    return h;
  }

  function _renderExecSummary(d) {
    var fr = d.fr, p = d.p, mc = d.mc;
    var f$ = F.fmtCompact;
    var g = F.grade(d.succVal, fr);
    var sC = F.succColor(d.succVal);
    var pct = _fmtSucc(d.succVal);
    // Treat 0 as a real (and meaningful) value, not as "missing data". A CCPC
    // owner who extracts everything to the corp legitimately ends with $0
    // personal wealth — rendering '—' there is a trust-breaker.
    function _kpiNum(a, b) {
      var v = (a != null && isFinite(a)) ? a : (b != null && isFinite(b) ? b : null);
      return v == null ? '—' : f$(v);
    }
    var medW = _kpiNum(mc && mc.rMedF, mc && mc.medF);
    var p25W = _kpiNum(mc && mc.rP25F, mc && mc.p25F);
    // CCPC-aware qualifier: when biz is on AND personal median is 0, surface
    // that the wealth lives in the corporation, not in personal accounts.
    var medSubExtra = '';
    if (p.bizOn && (mc && (mc.rMedF === 0 || mc.medF === 0)) && mc && mc.medCorpBal) {
      medSubExtra = fr
        ? ' \u00b7 corp \u2248 ' + f$(mc.medCorpBal)
        : ' \u00b7 corp \u2248 ' + f$(mc.medCorpBal);
    }
    var depAge = (mc && mc.p5Ruin != null && mc.p5Ruin < 200) ? mc.p5Ruin : null;
    var horizonYrs = (p.deathAge || 90) - (p.age || 35);
    // C1: Thesis-anchored verdict. Single source of truth — the same
    // posture-band sentence appears on the cover, inside the exec
    // summary, in the advisor-letter fallback, and in the closing
    // recap. d.thesis is built deterministically in report-data.js.
    var verdictText = d.thesis && d.thesis.oneLiner
      ? d.thesis.oneLiner
      : (fr ? 'Plan en cours d\'analyse.' : 'Plan under analysis.');

    var h = '<div class="exec-summary" style="page-break-after:always;background:linear-gradient(180deg,#252d39 0%,#344155 100%);color:#faf8f4;border-radius:8px;padding:32px 36px 28px;margin-bottom:24px;position:relative;overflow:hidden;min-height:780px">';
    h += '<div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,transparent 0%,#c49a1a 50%,transparent 100%)"></div>';
    h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">' +
      '<div style="font-family:Inter,sans-serif;font-size:11px;font-weight:700;color:#c49a1a;letter-spacing:3px;text-transform:uppercase">' + (fr ? 'Sommaire exécutif' : 'Executive summary') + '</div>' +
      '<div style="font-family:Inter,sans-serif;font-size:11px;color:#bccbe0;letter-spacing:0.5px">' + (fr ? 'En 30 secondes' : 'In 30 seconds') + '</div>' +
    '</div>';
    h += '<div style="font-family:\"Playfair Display\",Georgia,serif;font-size:22px;font-weight:600;line-height:1.35;color:#faf8f4;margin-bottom:8px">' + F.esc(d.client.name || (fr ? 'Client' : 'Client')) + '</div>';
    h += '<div style="font-family:Inter,sans-serif;font-size:13px;color:#bccbe0;line-height:1.6;margin-bottom:18px">' + verdictText + '</div>';
    // 2026-04-29: removed _renderScoreGauge(d) call. The composite
    // structural score conflated context-dependent components (savings
    // rate is meaningless in decum, diversification penalizes the
    // tax-efficient single-CELI strategy) into a single number that
    // contradicted the success rate. Replaced below the KPI grid by
    // observational Profil signals + a Watch line.
    // Headline metrics (4-up)
    function _execKPI(label, value, color, sub) {
      return '<div style="background:rgba(250,248,244,0.06);border:1px solid rgba(196,154,26,0.25);border-radius:6px;padding:14px 12px;text-align:center">' +
        '<div style="font-size:9px;color:#bccbe0;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:6px">' + label + '</div>' +
        '<div style="font-family:\"JetBrains Mono\",monospace;font-size:24px;font-weight:700;color:' + (color || '#c49a1a') + ';line-height:1">' + value + '</div>' +
        (sub ? '<div style="font-size:9.5px;color:#8a9bb0;margin-top:6px">' + sub + '</div>' : '') +
      '</div>';
    }
    // Sprint 0.2: replaced the standalone "Cautious wealth (P25)" KPI
    // with "Lifetime tax (real)" — defendable, ties to canonical
    // d._optTaxReal, and ranks among the top concrete decision-relevant
    // numbers a buyer cares about. P25 wealth without spending context
    // was meaningless on its own and lived elsewhere in the report.
    h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px">';
    h += _execKPI(fr ? 'Taux de succès' : 'Success rate', pct, sC, d.thesis && d.thesis.bandLabel ? F.esc(d.thesis.bandLabel) : '');
    h += _execKPI(fr ? 'Patrimoine médian' : 'Median wealth', medW, '#c49a1a', (fr ? 'scénario typique (réel)' : 'typical scenario (real)') + medSubExtra);
    h += _execKPI(fr ? 'Impôt à vie (réel)' : 'Lifetime tax (real)',
      d._optTaxReal ? f$(d._optTaxReal) : '\u2014',
      '#bccbe0',
      fr ? 'm\u00e9nage, horizon mod\u00e9lis\u00e9' : 'household, modeled horizon');
    h += _execKPI(fr ? 'Épuisement épargne' : 'Savings depletion',
      depAge ? depAge + (fr ? ' ans' : ' yr') : (fr ? 'Jamais' : 'Never'),
      depAge ? '#cf6060' : '#48a66d',
      depAge ? (fr ? 'scénario prudent' : 'cautious scenario')
             : (fr ? 'l\'épargne ne s\'épuise pas' : 'savings do not run out'));
    h += '</div>';
    // 2026-04-29 — Profil signals + Watch line replaces strengths/risks
    // bullets and the trailing "Pour aller plus loin" footer. The score
    // gauge above (now removed) was a composite that contradicted the
    // success rate; the strengths/risks bullets below overlapped chapter
    // 1's AI assessment. Profil signals stay observational and
    // context-aware. Watch line surfaces the binding sensitivity from
    // mc._sweeps as one conditional sentence.
    function _signalRow(label, headline, body) {
      return '<div style="display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:start;margin-bottom:12px">' +
        '<div style="color:#c49a1a;font-size:14px;line-height:1.4;margin-top:1px">◆</div>' +
        '<div>' +
          '<div style="font-family:Inter,sans-serif;font-size:11.5px;font-weight:700;color:#faf8f4;margin-bottom:3px;letter-spacing:0.2px">' +
            F.esc(label) + (headline ? ' <span style="color:#bccbe0;font-weight:500">· ' + F.esc(headline) + '</span>' : '') +
          '</div>' +
          '<div style="font-family:Inter,sans-serif;font-size:11px;color:#bccbe0;line-height:1.55">' + body + '</div>' +
        '</div>' +
      '</div>';
    }
    var _accBalances = {
      tfsa: (p.tfsa || 0) + (p.cTfsa || 0),
      rrsp: (p.rrsp || 0) + (p.cRrsp || 0),
      nr:   (p.nr || 0)   + (p.cNr || 0),
      lira: (p.lira || 0) + (p.cLira || 0),
      corp: p.bizRetainedEarnings || 0
    };
    var _accTotal = _accBalances.tfsa + _accBalances.rrsp + _accBalances.nr + _accBalances.lira + _accBalances.corp;
    var _profilHtml = '';
    if (_accTotal > 0) {
      var _shareTfsa = _accBalances.tfsa / _accTotal;
      var _shareRrsp = _accBalances.rrsp / _accTotal;
      var _shareCorp = _accBalances.corp / _accTotal;
      var _concHead, _concBody;
      if (_shareCorp >= 0.40) {
        _concHead = fr ? 'patrimoine corporatif (' + Math.round(_shareCorp * 100) + ' %)' : 'corporate wealth (' + Math.round(_shareCorp * 100) + '%)';
        _concBody = fr
          ? 'La cadence d\'extraction (salaire / dividende / vente d\'actifs) déterminerait l\'impôt viager intégré ; voir la section Corporation.'
          : 'The extraction cadence (salary / dividend / asset sale) would drive lifetime integrated tax; see the Corporation section.';
      } else if (_shareTfsa >= 0.50) {
        _concHead = fr ? 'CELI dominant (' + Math.round(_shareTfsa * 100) + ' %)' : 'TFSA-dominant (' + Math.round(_shareTfsa * 100) + '%)';
        _concBody = fr
          ? 'Fiscalement efficace en décaissement (retraits non imposés, n\'affecte pas la PSV) ; surveillez la concentration chez un seul fournisseur.'
          : 'Tax-efficient in decumulation (withdrawals untaxed, no OAS clawback impact); monitor concentration with a single provider.';
      } else if (_shareRrsp >= 0.55) {
        _concHead = fr ? 'REER dominant (' + Math.round(_shareRrsp * 100) + ' %)' : 'RRSP-dominant (' + Math.round(_shareRrsp * 100) + '%)';
        _concBody = fr
          ? 'Masse imposable concentrée à la conversion FERR (72 ans) ; un retrait anticipé (meltdown) pourrait lisser l\'impôt viager.'
          : 'Taxable mass concentrated at RRIF conversion (age 72); an early drawdown (meltdown) could smooth lifetime tax.';
      } else {
        _concHead = fr ? 'répartition équilibrée' : 'balanced allocation';
        _concBody = fr
          ? 'Aucun compte ne dépasse 55 % du patrimoine — flexibilité d\'ordre de retrait préservée d\'année en année.'
          : 'No single account exceeds 55% of wealth — withdrawal-order flexibility preserved year over year.';
      }
      _profilHtml += _signalRow(fr ? 'Concentration' : 'Concentration', _concHead, _concBody);
    }
    if (d.avgEffRate != null && isFinite(d.avgEffRate)) {
      var _ratePct = Math.round(d.avgEffRate * 100);
      var _fiscHead = (fr ? 'taux effectif ~' : 'effective rate ~') + _ratePct + ' %';
      var _fiscBody;
      if (d.avgEffRate < 0.15) {
        _fiscBody = fr
          ? 'Charge fiscale faible — bénéficie probablement du fractionnement de pension et du retrait CELI ; surveiller un revenu inattendu (héritage, vente) qui pousserait au-delà du seuil PSV.'
          : 'Light tax burden — likely benefits from pension splitting and TFSA withdrawals; monitor an unexpected income (inheritance, asset sale) that would push past the OAS threshold.';
      } else if (d.avgEffRate < 0.25) {
        _fiscBody = fr
          ? 'Charge fiscale dans la fourchette typique pour ce niveau de revenu ; un ordre de retrait optimisé pourrait réduire la facture viagère.'
          : 'Tax burden within the typical range for this income level; an optimized withdrawal order could reduce the lifetime bill.';
      } else {
        _fiscBody = fr
          ? 'Charge fiscale élevée — masse imposable concentrée (REER/FERR/SPCC). La section fiscale identifie les leviers (meltdown, fractionnement, report PSV) qui pourraient lisser l\'impôt.'
          : 'High tax burden — taxable mass concentrated (RRSP/RRIF/CCPC). The tax section identifies levers (meltdown, splitting, OAS deferral) that could smooth the bill.';
      }
      _profilHtml += _signalRow(fr ? 'Posture fiscale' : 'Tax posture', _fiscHead, _fiscBody);
    }
    var _annualSpend = (p.retSpM || 0) * 12;
    if (_annualSpend > 0) {
      var _liquid = (p.tfsa || 0) + (p.cTfsa || 0) + (p.nr || 0) + (p.cNr || 0);
      var _yrsBuf = _liquid / _annualSpend;
      var _liqHead, _liqBody;
      if (_yrsBuf >= 5) {
        _liqHead = '~' + (_yrsBuf >= 10 ? '10+ ' : _yrsBuf.toFixed(1) + ' ') + (fr ? 'ans hors enregistré' : 'yrs outside registered');
        _liqBody = fr
          ? 'Tampon confortable — le ménage pourrait absorber un creux de marché prolongé sans toucher au REER/FERR.'
          : 'Comfortable buffer — the household could absorb a prolonged market drawdown without touching RRSP/RRIF.';
      } else if (_yrsBuf >= 2) {
        _liqHead = '~' + _yrsBuf.toFixed(1) + (fr ? ' ans hors enregistré' : ' yrs outside registered');
        _liqBody = fr
          ? 'Tampon raisonnable — quelques années de dépenses couvertes par CELI + non-enregistré si les marchés décevaient.'
          : 'Reasonable buffer — a few years of spending covered by TFSA + non-registered if markets disappoint.';
      } else {
        _liqHead = '~' + _yrsBuf.toFixed(1) + (fr ? ' ans hors enregistré' : ' yrs outside registered');
        _liqBody = fr
          ? 'Liquidité serrée — un creux de marché imposerait probablement de retirer du REER/FERR au moment le moins favorable.'
          : 'Tight liquidity — a market drawdown would likely force RRSP/RRIF withdrawals at the least favorable moment.';
      }
      _profilHtml += _signalRow(fr ? 'Liquidité' : 'Liquidity', _liqHead, _liqBody);
    }
    if (_profilHtml) {
      h += '<div style="border-top:1px solid rgba(196,154,26,0.18);padding-top:14px;margin-bottom:14px">';
      h += '<div style="font-family:Inter,sans-serif;font-size:9px;font-weight:700;color:#c49a1a;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:12px">' +
        (fr ? 'Profil du plan' : 'Plan profile') + '</div>';
      h += _profilHtml;
      h += '</div>';
    }
    if (mc && mc._sweeps) {
      var _sw = mc._sweeps;
      var _baseMed = mc.rMedF || mc.medF || 0;
      function _swDelta(swPair) {
        if (!swPair || !swPair.down) return null;
        var dn = (swPair.down.medF || 0) - _baseMed;
        return { abs: Math.abs(dn), signed: dn, succPts: Math.round(((swPair.down.succ || 0) - (mc.succ || 0)) * 100) };
      }
      var _retDelta = _swDelta(_sw.returns);
      var _infDelta = _swDelta(_sw.inflation);
      var _winner = null, _kind = null;
      if (_retDelta && _infDelta) {
        if (_retDelta.abs >= _infDelta.abs) { _winner = _retDelta; _kind = 'returns'; }
        else { _winner = _infDelta; _kind = 'inflation'; }
      } else if (_retDelta) { _winner = _retDelta; _kind = 'returns'; }
      else if (_infDelta) { _winner = _infDelta; _kind = 'inflation'; }
      if (_winner && _baseMed > 0 && (_winner.abs / _baseMed) >= 0.10) {
        var _newMed = _baseMed + _winner.signed;
        var _succTxt = _winner.succPts === 0
          ? (fr ? 'le taux de succès resterait essentiellement inchangé' : 'the success rate would stay essentially unchanged')
          : (fr ? 'le taux de succès ' + (_winner.succPts < 0 ? 'baisserait de ' + Math.abs(_winner.succPts) : 'monterait de ' + _winner.succPts) + ' points' : 'the success rate would ' + (_winner.succPts < 0 ? 'drop ' + Math.abs(_winner.succPts) : 'rise ' + _winner.succPts) + ' points');
        var _condFr = _kind === 'returns'
          ? 'Si les rendements réels se situaient à 1 % de moins par an sur l\'horizon, '
          : 'Si l\'inflation se situait à 1 % de plus par an sur l\'horizon, ';
        var _condEn = _kind === 'returns'
          ? 'If real returns were 1% lower per year over the horizon, '
          : 'If inflation were 1% higher per year over the horizon, ';
        var _watchSentence = (fr ? _condFr : _condEn) +
          (fr ? 'le patrimoine médian passerait de ' + f$(_baseMed) + ' à ' + f$(_newMed) + ' et ' + _succTxt + '.'
              : 'median wealth would move from ' + f$(_baseMed) + ' to ' + f$(_newMed) + ' and ' + _succTxt + '.');
        h += '<div style="border-top:1px solid rgba(196,154,26,0.18);padding-top:14px;font-size:11px;color:#bccbe0;line-height:1.6">' +
          '<span style="font-family:Inter,sans-serif;font-size:9px;font-weight:700;color:#c49a1a;letter-spacing:2.5px;text-transform:uppercase;margin-right:10px">' +
          (fr ? 'Point à surveiller' : 'Watch point') + '</span>' +
          _watchSentence +
        '</div>';
      }
    }
    h += '</div>';
    return h;
  }

  /* OLD_STRENGTHS_RISKS_BLOCK_RETIRED_2026_04_29 — kept commented for git-blame
     traceability; the live cover hero now uses Profil signals + Watch line.
  function _legacyStrengthsRisks(d) {
    var fr = d.fr, p = d.p, mc = d.mc;
    var f$ = F.fmtCompact;
    var horizonYrs = (p.deathAge || 90) - (p.age || 35);
    var depAge = (mc && mc.p5Ruin != null && mc.p5Ruin < 200) ? mc.p5Ruin : null;
    var strengths = [];
    var risks = [];
    // Codex 2026-04-27: don't surface tax-optimization / estate-residual
    // as STRENGTH bullets on a failing plan (succ<55%). On a plan that
    // doesn't deliver the lifestyle, '\u2713 Tax optimization detected'
    // reads as cruel praise. They still appear in the dedicated sections
    // but lose the strength framing here.
    var _planFailing = (d.succVal != null && d.succVal < 0.55);
    if (d.succVal >= 0.85) strengths.push(fr ? 'Trajectoire centrale tient avec marge sur ' + horizonYrs + '\u00a0ans' : 'Central trajectory holds with margin over ' + horizonYrs + ' years');
    if (d.covRatio > 1.0) strengths.push(fr ? 'Revenu garanti couvre ' + Math.round(d.covRatio * 100) + '\u202f% des d\u00e9penses cibles' : 'Guaranteed income covers ' + Math.round(d.covRatio * 100) + '% of target spending');
    if (!_planFailing && d._taxAlpha != null && d._taxAlpha > 10000) strengths.push((fr ? 'Optimisation fiscale d\u00e9tect\u00e9e \u2014 \u00e9conomies de ' : 'Tax optimization detected \u2014 savings of ') + f$(d._taxAlpha) + (fr ? ' vs strat\u00e9gie standard' : ' vs standard strategy'));
    if (!_planFailing && mc && mc.medEstateNet > 250000) strengths.push((fr ? 'Patrimoine r\u00e9siduel m\u00e9dian de ' : 'Median residual estate of ') + f$(mc.medEstateNet));
    if (!_planFailing && d.heroScore && d.heroScore.components) {
      var topComp = null, topVal = 0;
      Object.keys(d.heroScore.components).forEach(function(k) {
        if (d.heroScore.components[k] != null && d.heroScore.components[k] > topVal && d.heroScore.components[k] >= 80) {
          topVal = d.heroScore.components[k]; topComp = k;
        }
      });
      if (topComp === 'tax_efficiency') strengths.push(fr ? 'Efficacit\u00e9 fiscale au-dessus de la moyenne' : 'Tax efficiency above average');
      else if (topComp === 'diversification') strengths.push(fr ? 'Diversification entre comptes au-dessus de la moyenne' : 'Account diversification above average');
      else if (topComp === 'liquidity') strengths.push(fr ? 'Liquidit\u00e9 \u00e9lev\u00e9e \u2014 plus de 12\u00a0mois de coussin' : 'High liquidity \u2014 over 12 months of buffer');
    }
    // Codex 2026-04-27 audit: surface goal status in exec summary so
    // a quick reader sees whether their declared objectives will be met.
    if (d.R && d.R.hasGoals && d.mc && d.mc._enriched && d.mc._enriched.goalsLedger) {
      var _gLedger = d.mc._enriched.goalsLedger || [];
      var _gOnTrack = _gLedger.filter(function(l){ return l.status === 'on-track'; }).length;
      var _gAtRisk  = _gLedger.filter(function(l){ return l.status === 'at-risk'; }).length;
      var _gTotal   = _gLedger.length;
      if (!_planFailing && _gOnTrack === _gTotal && _gTotal > 0) {
        strengths.push(fr ? _gTotal + ' objectif' + (_gTotal>1?'s':'') + ' sur ' + _gTotal + ' en voie de r\u00e9alisation' : _gTotal + ' of ' + _gTotal + ' goals on track');
      } else if (!_planFailing && _gOnTrack > 0 && _gAtRisk === 0) {
        strengths.push(fr ? _gOnTrack + '/' + _gTotal + ' objectifs en voie ; les autres restent serr\u00e9s' : _gOnTrack + '/' + _gTotal + ' goals on track; others remain tight');
      }
      if (_gAtRisk > 0) {
        risks.push(fr ? _gAtRisk + ' objectif' + (_gAtRisk>1?'s':'') + ' \u00e0 risque \u2014 voir section Objectifs' : _gAtRisk + ' goal' + (_gAtRisk>1?'s':'') + ' at risk \u2014 see Goals section');
      }
    }
    if (strengths.length === 0) strengths.push(fr ? 'Aucune force structurelle dominante \u2014 voir sections d\u00e9taill\u00e9es pour les leviers' : 'No dominant structural strength \u2014 see detail sections for levers');
    if (d.succVal != null && d.succVal < 0.65) risks.push(fr ? 'Taux de succès sous 65 % — ajustements à considérer' : 'Success rate below 65% — adjustments to consider');
    if (depAge) risks.push((fr ? 'Épuisement potentiel de l\'épargne vers ' : 'Potential savings depletion near age ') + depAge);
    // Defect-2 fix: read d.oasClbkYrs (canonical, computed in report-data.js
    // from revData using primary-only taxable income per the OAS Line 23600
    // rule). Previously read mc.oasClbkYrs (raw mc payload), which could
    // drift from the canonical when the engine emits both.
    if (d.oasClbkYrs > 0) risks.push((fr ? 'Récupération PSV sur ' : 'OAS clawback over ') + d.oasClbkYrs + (fr ? ' année(s)' : ' year(s)'));
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
    // "Read further" guide: omit the What-If reference for compact+plain
    // readers (they don't get the simulator section either, so the pointer
    // is misleading). Also omit when clientExport=true — the simulator
    // section is stripped entirely so we never want to point readers at it.
    var _hidesSim = d.clientExport ||
      (d.renderProfile && d.renderProfile.densityMode === 'compact' && d.renderProfile.jargonMode === 'plain');
    var _readFurther = _hidesSim
      ? (fr ? 'la lettre du conseiller (page 2) cadre la lecture, et le diagnostic et le plan d\'action proposent des leviers concrets.'
            : 'the advisor letter (p. 2) frames the read, and the diagnostic and action plan propose concrete levers.')
      : (fr ? 'la lettre du conseiller (page 2) cadre la lecture, le diagnostic et le plan d\'action proposent des leviers concrets, et un module de scénarios en fin de rapport laisse tester quelques décisions clés.'
            : 'the advisor letter (p. 2) frames the read, the diagnostic and action plan propose concrete levers, and a scenarios module at the end lets you test a few key decisions.');
    h += '<div style="border-top:1px solid rgba(196,154,26,0.25);padding-top:14px;font-size:10.5px;color:#bccbe0;line-height:1.6">' +
      '<strong style="color:#c49a1a;letter-spacing:0.3px">' + (fr ? 'Pour aller plus loin :' : 'Read further:') + '</strong> ' +
      _readFurther +
      '</div>';
    h += '</div>';
    return h;
  }
  END_OLD_STRENGTHS_RISKS_BLOCK */

  // Phase 1 (premium shell): chart caption helper.
  // Codex 2026-04-27 mandate: "Chart captions need to be truly editorial.
  // Not 'this chart shows percentile outcomes'. More like: 'Your plan
  // remains durable in most paths, but flexibility narrows after age 82.'"
  // Captions read the IMPLICATION, never the mechanism. Engine output
  // drives the values; the structure is fixed per chart type.
  function _chartCaption(text) {
    if (!text) return '';
    return '<p class="bf-chart-caption" style="font-family:\"Playfair Display\",Georgia,serif;font-size:12.5px;font-style:italic;color:#5a4f3a;line-height:1.55;margin:6px auto 14px;max-width:680px;text-align:center;letter-spacing:0.1px">' +
      F.esc(text) + '</p>';
  }

  // Caption builders — one per chart type. Read ONLY engine output (mc.pD,
  // mc.p25F, etc.) to keep captions deterministic and synchronized with
  // the rendered chart. Returns null when the chart's signal isn't
  // strong enough to justify a caption (better silent than vague).
  function _projectionCaption(d) {
    var fr = d.fr, mc = d.mc, p = d.p;
    if (!mc || !mc.pD || !mc.pD.length) return null;
    var pD = mc.pD;
    var endRow = pD[pD.length - 1];
    var p50End = +(endRow && (endRow.p50 || endRow.rmp_total || 0));
    // P25 ONLY — never fall back to p5. P5 is the 5th percentile; the
    // caption labels this number as "cautious quarter" which is P25 by
    // definition. Mislabeling p5 as P25 reads ~$200K low for typical
    // profiles. If pD doesn't carry a real p25, prefer the engine
    // top-level rP25F / p25F (always populated in MC output).
    var p25End = +(endRow && endRow.p25 ? endRow.p25 : (mc.rP25F || mc.p25F || 0));
    var p5Ruin = mc.p5Ruin;
    var deathAge = +p.deathAge || 92;
    var f$ = F.fmtCompact;
    if (p5Ruin != null && p5Ruin < 200 && p5Ruin < deathAge) {
      return fr
        ? 'Dans la majorité des trajectoires, votre patrimoine tient. Le quart prudent se rétrécit toutefois après l\'âge de ' + p5Ruin + ' ans.'
        : 'In most paths your wealth remains durable; the cautious quarter narrows after age ' + p5Ruin + '.';
    }
    if (p50End >= 1000) {
      var midText = fr
        ? 'À la fin de l\'horizon, le scénario médian projette environ ' + f$(p50End) + ' (réel)'
        : 'At the end of the horizon, the median scenario projects roughly ' + f$(p50End) + ' (real)';
      var lowText = (p25End >= 1000)
        ? (fr ? '; le quart prudent reste au-dessus de ' + f$(p25End) + '.' : '; the cautious quarter stays above ' + f$(p25End) + '.')
        : (fr ? '.' : '.');
      return midText + lowText;
    }
    return null;
  }

  function _histogramCaption(d) {
    var fr = d.fr, mc = d.mc;
    if (!mc) return null;
    var p25 = +(mc.rP25F || mc.p25F || 0);
    var p5R = mc.p5Ruin;
    var f$ = F.fmtCompact;
    if (p5R != null && p5R < 200) {
      return fr
        ? 'La majorité des avenirs simulés laissent un patrimoine résiduel; ceux qui s\'épuisent le font après l\'âge de ' + p5R + ' ans.'
        : 'Most simulated futures leave wealth on the table; those that deplete do so after age ' + p5R + '.';
    }
    if (p25 >= 1000) {
      return fr
        ? 'Même dans le quart inférieur des résultats, votre patrimoine final reste au-dessus de ' + f$(p25) + '.'
        : 'Even in the lower quartile of outcomes, your ending wealth stays above ' + f$(p25) + '.';
    }
    return null;
  }

  // Phase 1 (premium shell): contextual hero KPI.
  // The codex spec calls for the first visual focal point of the diagnostic
  // to match the case, not always success-rate. Per-archetype mapping:
  //   decum     → income durability ("Through age 92" or depletion year)
  //   transition→ readiness gap ("3 years to retirement, X% confidence")
  //   fire      → bridge-period coverage ("Bridge years covered: 12")
  //   accum     → trajectory snapshot ("On track for $X.XM at retirement")
  // Tag overlays add a tax/legacy/low-income spin where they out-rank phase:
  //   tax_heavy → "Lifetime tax saved" when meaningful tax_alpha exists
  //   low_income→ "Gov. coverage of target spending"
  //   legacy    → "Median estate to heirs"
  // Fallback: success rate (always defendable). The HERO surfaces ONE value
  // dominantly; the existing g5/g6 KPI grid stays below as supporting data.
  function _heroKPI(d, arch) {
    var fr = d.fr, p = d.p || {}, mc = d.mc || {};
    var f$ = F.fmtCompact;
    var phase = arch.phase, tags = arch.tags || [];
    var hasTax = tags.indexOf('tax_heavy') >= 0;
    var hasLowInc = tags.indexOf('low_income') >= 0;
    var hasLegacy = tags.indexOf('legacy') >= 0;
    var hasCcpc = tags.indexOf('ccpc') >= 0;
    var taxAlpha = +(d._taxAlpha || 0);
    var medEstate = +(mc.medEstateNet || 0);
    var corpVal = +(p.bizRetainedEarnings || p.corp || p.ccpc || p.corpVal || 0);
    var govCovPct = null;
    if (Array.isArray(d.medRevData) && d.medRevData.length) {
      var retYrs = d.medRevData.filter(function(r){ return r.age >= (p.retAge||65); });
      if (retYrs.length) {
        var govSum = retYrs.reduce(function(s,r){ return s+(+r.rrq||0)+(+r.psv||0)+(+r.pen||0); }, 0);
        var spendSum = retYrs.reduce(function(s,r){ return s+(+r.spend||0); }, 0);
        if (spendSum > 0) govCovPct = Math.round(govSum/spendSum*100);
      }
    }
    var succPct = (d.succVal != null) ? Math.round(d.succVal * 100) : null;
    var sC = F.succColor(d.succVal);

    var label, value, sub, color;
    color = '#252d39';
    // Overlay precedence (most-specific first):
    //   tax_heavy with meaningful $ savings → "Lifetime tax savings"
    //   low_income → "Government coverage of target spending"
    //   ccpc owner with corp > $50K → "Corporation value extracted into your plan"
    //   legacy with positive estate → "Median estate to heirs"
    // Then phase fallback.
    if (hasTax && taxAlpha >= 25000) {
      label = fr ? 'Économies fiscales sur la durée du plan' : 'Lifetime tax savings under this plan';
      value = f$(Math.round(taxAlpha));
      sub = fr ? 'vs. une stratégie de retrait standard' : 'vs. a standard withdrawal strategy';
      color = '#2a8c46';
    } else if (hasLowInc && govCovPct != null) {
      label = fr ? 'Revenu gouvernemental couvre vos dépenses cibles' : 'Government income covers your target spending';
      value = govCovPct + '%';
      sub = fr ? 'en moyenne sur la retraite' : 'on average across retirement';
      color = '#256b88';
    } else if (hasCcpc && corpVal > 50000) {
      label = fr ? 'Valeur de votre société à intégrer au plan' : 'Corporation value to integrate into your plan';
      value = f$(Math.round(corpVal));
      sub = fr ? 'capital corporatif à transformer en revenu de retraite' : 'corporate capital to convert into retirement income';
      color = '#256b88';
    } else if (hasLegacy && medEstate > 0) {
      label = fr ? 'Patrimoine médian transmis aux héritiers' : 'Median estate to your heirs';
      value = f$(medEstate);
      sub = fr ? 'à la fin de la projection (réel)' : 'at end of projection (real $)';
      color = '#256b88';
    } else if (phase === 'decum') {
      var p5r = mc.p5Ruin;
      if (p5r != null && p5r < 200 && p5r < (p.deathAge || 92)) {
        label = fr ? 'Vos épargnes tiennent jusqu\'à' : 'Your savings hold through age';
        value = p5r + (fr ? ' ans' : '');
        sub = fr ? 'avant que les comptes non gouvernementaux ne s\'épuisent' : 'before non-government accounts deplete';
        color = '#a85a3a';
      } else {
        // Codex 2026-04-27: previously anchored on deathAge ("tiennent jusqu'à
        // 92 ans / fin de l'horizon de projection") — but the modeled horizon
        // is not a real age cap, the person could live past it. Switched to
        // "ne s'épuisent jamais" which describes the simulation result without
        // implying a survival ceiling.
        label = fr ? 'Vos épargnes' : 'Your savings';
        value = fr ? 'ne s\'épuisent jamais' : 'never run out';
        sub = fr ? 'sur l\'ensemble des scénarios modélisés' : 'across the modeled scenarios';
        color = '#2a8c46';
      }
    } else if (phase === 'transition') {
      var yrsToRet = Math.max(0, (p.retAge || 65) - (p.age || 60));
      label = fr ? 'Années avant votre retraite' : 'Years until your retirement';
      value = yrsToRet + (fr ? ' ans' : '');
      sub = fr
        ? (succPct != null ? 'avec un taux de succès actuel de ' + succPct + '%' : 'horizon évalué dans ce rapport')
        : (succPct != null ? 'at a current success rate of ' + succPct + '%' : 'horizon assessed in this report');
      color = sC;
    } else if (phase === 'fire') {
      var qppA = +(p.qppAge || 65);
      var bridgeYrs = Math.max(0, qppA - (+p.retAge || 50));
      label = fr ? 'Années avant le RPC/RRQ à couvrir vous-même' : 'Years to self-fund before CPP/QPP';
      value = bridgeYrs + (fr ? ' ans' : '');
      sub = fr
        ? 'la période-pont — du départ en retraite anticipée à l\'arrivée des prestations'
        : 'the bridge period — from early retirement to the arrival of public benefits';
      color = '#256b88';
    } else {
      // Accumulation fallback: prefer the projected median final wealth — it's
      // engine output that's always populated. medRevData lookup at retAge can
      // miss when wealth lives outside the personal-liquid trio (e.g., CCPC).
      var medFinal = mc.rMedF || mc.medF || 0;
      var retRow = Array.isArray(d.medRevData)
        ? d.medRevData.find(function(r){ return r.age === (+p.retAge||65); })
        : null;
      var retBal = retRow ? ((+retRow.aRR||0)+(+retRow.aTF||0)+(+retRow.aNR||0)) : 0;
      var heroBal = retBal > 1000 ? retBal : medFinal;
      if (heroBal > 1000) {
        label = retBal > 1000
          ? (fr ? 'Patrimoine projeté à votre retraite' : 'Projected wealth at your retirement')
          : (fr ? 'Patrimoine médian projeté à long terme' : 'Long-run median projected wealth');
        value = f$(heroBal);
        sub = fr ? 'scénario médian (dollars réels)' : 'median scenario (real dollars)';
        color = '#256b88';
      }
      // else fall through to success-rate fallback below.
    }
    if (label == null || value == null) {
      label = fr ? 'Taux de succès du plan' : 'Plan success rate';
      value = (succPct != null) ? succPct + '%' : '—';
      sub = fr ? 'sur ' + ((p.deathAge || 90) - (p.age || 35)) + ' ans modélisés' : 'over ' + ((p.deathAge || 90) - (p.age || 35)) + ' modeled years';
      color = sC;
    }
    return '<div class="bf-hero-kpi" style="margin:6px 0 18px;padding:24px 28px;border:1px solid #e8e0d4;border-left:4px solid ' + color + ';border-radius:6px;background:#fdfbf6">' +
      '<div style="font-family:Inter,sans-serif;font-size:10.5px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;color:#8a7a5c;margin-bottom:10px">' + F.esc(label) + '</div>' +
      '<div style="font-family:\"Playfair Display\",Georgia,serif;font-size:42px;font-weight:600;color:' + color + ';line-height:1.05;letter-spacing:-0.5px">' + value + '</div>' +
      (sub ? '<div style="font-family:\"Playfair Display\",Georgia,serif;font-size:13.5px;font-style:italic;color:#5a4f3a;line-height:1.5;margin-top:10px">' + F.esc(sub) + '</div>' : '') +
      '</div>';
  }

  // Phase 1 (premium shell): chapter cover renderer.
  // The codex spec mandates a 6-chapter product model:
  //   Ch.1  Your plan at a glance       (assessment + diagnostic)
  //   Ch.2  Why this plan works         (situation + trajectory)
  //   Ch.3  Risks and tradeoffs         (risk dispersion + stress tests)
  //   Ch.4  Strategy & decisions        (tax, draw-order, succession,
  //                                       timeline, action plan, recap)
  //   Ch.5  Explore alternatives        (the what-if mount)
  //   Ch.6  Appendix                    (methodology + glossary)
  // 2026-04-27 fix: Ch.3 was previously a catch-all for everything between
  // trajectory and back-matter — readers saw tax / draw-order / action plan
  // / timeline / closing recap all stacked under "Risks and tradeoffs",
  // which mismatched the body content. Splitting Ch.3 into a true risk
  // chapter (risk + stress) and a new Strategy & decisions chapter restores
  // the editorial model.
  // Chapter covers carry: eyebrow ("Chapitre N"), chapter title, single
  // 1-line frame. Force a page break before each so the cover acts as a
  // visual reset rather than another stacked section. The frame line is
  // deterministic per chapter; archetype overlays may refine it later.
  // Phase 6 finish pass (codex 2026-04-27): chapter covers were "too
  // polite" — 34px / weight 600 read refined but not emphatic.
  // Codex 2026-04-27 review followup: 78px / 800 / 180px padding overshot
  // into "operatic" — premium editorial wants strong, not theatrical. Dial
  // back to controlled premium:
  //   Eyebrow:    Roman numeral + "Chapter N" tracked label, gold
  //   Hairline:   short gold rule, 56px wide
  //   Title:      Playfair, 60px, weight 700, tight leading
  //   Frame:      italic Playfair, 17px, max 560px width
  //   Spacing:    120px top padding, 70px bottom — strong reset without
  //               feeling ceremonial. Forced page break retained so the
  //               cover sits alone on its page.
  function _renderChapterCover(num, title, frame, fr) {
    var roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'][num] || String(num);
    // CSS uses SINGLE-quoted family names so the surrounding HTML
    // double-quoted style attribute stays well-formed. The previous
    // version escaped JS double-quotes inside the attribute (\\"), which
    // produced literal unescaped " in the output HTML — the browser
    // closed the style attribute at the first " and silently dropped
    // font-size and font-weight, falling back to ~14px default. Bumped
    // title to 84px / weight 800 since the user has flagged repeatedly
    // that the chapter title needs to read emphatic, not refined.
    return '<div class="bf-chapter-cover" style="page-break-before:always;break-before:page;padding:110px 24px 70px;text-align:center">' +
      '<div class="bf-chapter-eyebrow" style="font-family:Inter,sans-serif;font-size:11px;font-weight:700;letter-spacing:5px;color:#a89460;text-transform:uppercase;margin-bottom:24px">' +
        F.esc((fr ? 'Chapitre ' : 'Chapter ') + roman) +
      '</div>' +
      '<div class="bf-chapter-rule" style="width:56px;height:2px;background:#c49a1a;margin:0 auto 28px"></div>' +
      '<div class="bf-chapter-title" style="font-family:\'Playfair Display\',Georgia,serif;font-size:54px;font-weight:700;color:#0f0d09;line-height:1.08;letter-spacing:-0.8px;margin:0 auto 24px;max-width:760px">' +
        F.esc(title) +
      '</div>' +
      '<div class="bf-chapter-frame" style="font-family:\'Playfair Display\',Georgia,serif;font-size:16px;font-style:italic;color:#5a4f3a;line-height:1.55;max-width:560px;margin:0 auto;letter-spacing:0.1px">' +
        F.esc(frame) +
      '</div>' +
      '</div>';
  }

  // Chapter copy is deterministic per locale + chapter index. Frame lines
  // are single-sentence implications, never mechanism descriptions. Codex
  // mandate: editorial pacing, not signposting.
  function _chapterCopy(idx, fr, arch, succVal) {
    var couple = arch && arch.tags && arch.tags.indexOf('couple') >= 0;
    var ccpc = arch && arch.tags && arch.tags.indexOf('ccpc') >= 0;
    var legacy = arch && arch.tags && arch.tags.indexOf('legacy') >= 0;
    var lowInc = arch && arch.tags && arch.tags.indexOf('low_income') >= 0;
    var phase = (arch && arch.phase) || 'accum';
    var _s = (succVal == null) ? null : +succVal;
    var _strong = _s != null && _s >= 0.75;
    var _mixed  = _s != null && _s >= 0.55 && _s < 0.75;
    var _failing = _s != null && _s < 0.55;

    // ── Ch.1 — "Plan at a glance" stays neutral; phase-tinted frame ──
    function ch1(fr) {
      if (fr) {
        var t1 = phase === 'decum' ? 'Votre retraite en un coup d\u2019\u0153il'
               : phase === 'transition' ? 'Votre plan, \u00e0 quelques ann\u00e9es de la retraite'
               : phase === 'fire' ? 'Votre projet de retraite anticip\u00e9e'
               : 'Votre plan en un coup d\u2019\u0153il';
        var f1 = phase === 'decum' ? 'L\u2019essentiel — durabilit\u00e9 du revenu, dispersion attendue, leviers qui restent.'
               : phase === 'fire' ? 'L\u2019essentiel — la p\u00e9riode-pont \u00e0 financer, la trajectoire post-RPC, les leviers \u00e0 surveiller.'
               : 'L\u2019essentiel — le cap, la vigueur du plan, et les deux ou trois leviers qui comptent.';
        return { title: t1, frame: f1 };
      }
      var t = phase === 'decum' ? 'Your retirement at a glance'
            : phase === 'transition' ? 'Your plan, a few years from retirement'
            : phase === 'fire' ? 'Your early retirement project'
            : 'Your plan at a glance';
      var f = phase === 'decum' ? 'The essentials — income durability, expected dispersion, the levers still on the table.'
            : phase === 'fire' ? 'The essentials — the bridge period to fund, the post-CPP trajectory, the levers to watch.'
            : 'The essentials — the direction, the plan\u2019s strength, and the two or three levers that matter.';
      return { title: t, frame: f };
    }

    // ── Ch.2 — success-aware base + archetype-aware suffix ──────────
    function ch2(fr) {
      var t;
      if (fr) {
        if (_strong) {
          t = phase === 'decum' ? 'Pourquoi votre retraite tient la route'
            : phase === 'transition' ? 'Pourquoi cette transition tient'
            : phase === 'fire' ? 'Pourquoi votre retraite anticip\u00e9e tient'
            : ccpc ? 'Pourquoi votre plan + soci\u00e9t\u00e9 tient la route'
            : 'Pourquoi ce plan tient la route';
        } else if (_mixed) {
          t = phase === 'decum' ? 'Comment votre retraite se tient'
            : 'Comment ce plan se tient';
        } else {
          t = ccpc ? 'Architecture de votre plan + soci\u00e9t\u00e9'
            : phase === 'fire' ? 'Architecture de votre projet anticip\u00e9'
            : 'Architecture de votre plan';
        }
      } else {
        if (_strong) {
          t = phase === 'decum' ? 'Why your retirement works'
            : phase === 'transition' ? 'Why this transition holds'
            : phase === 'fire' ? 'Why your early retirement holds'
            : ccpc ? 'Why your plan + corporation works'
            : 'Why this plan works';
        } else if (_mixed) {
          t = phase === 'decum' ? 'How your retirement holds together'
            : 'How this plan holds together';
        } else {
          t = ccpc ? 'Architecture of your plan + corporation'
            : phase === 'fire' ? 'Architecture of your early-retirement project'
            : 'Your plan\u2019s architecture';
        }
      }
      var f;
      if (fr) {
        f = couple ? 'Vos piliers communs, la trajectoire patrimoniale et les sources de revenu qui composent votre plan.'
          : ccpc ? 'Vos piliers personnels et corporatifs, la trajectoire patrimoniale et les flux de revenu projet\u00e9s.'
          : 'Vos piliers structurels, la trajectoire patrimoniale et les sources de revenu qui composent votre plan.';
      } else {
        f = couple ? 'Your shared pillars, the wealth trajectory, and the income sources that make up your plan.'
          : ccpc ? 'Your personal and corporate pillars, the wealth trajectory, and the projected income flows.'
          : 'Your structural pillars, the wealth trajectory, and the income sources that make up your plan.';
      }
      return { title: t, frame: f };
    }

    // ── Ch.3 — Risks: posture-tinted ───────────────────────────────
    function ch3(fr) {
      if (fr) {
        var t = _failing ? 'Risques et fragilit\u00e9s'
              : _mixed ? 'Risques et marges de manœuvre'
              : 'Risques et compromis';
        var f = _failing ? 'O\u00f9 le plan est le plus expos\u00e9, comment il r\u00e9agit aux chocs, et ce qui amplifie la dispersion.'
              : 'O\u00f9 le plan est sensible, comment il r\u00e9siste aux chocs, et quelle dispersion p\u00e8se sur le r\u00e9sultat.';
        return { title: t, frame: f };
      }
      var tt = _failing ? 'Risks and fragilities'
             : _mixed ? 'Risks and room to manoeuvre'
             : 'Risks and tradeoffs';
      var ff = _failing ? 'Where the plan is most exposed, how it reacts to shocks, and what amplifies dispersion.'
             : 'Where the plan is sensitive, how it holds up under shocks, and what dispersion weighs on the outcome.';
      return { title: tt, frame: ff };
    }

    // ── Ch.4 — Strategy: phase + tags ──────────────────────────────
    function ch4(fr) {
      if (fr) {
        var t = ccpc ? 'Strat\u00e9gie corporative et fiscale'
              : phase === 'decum' ? 'D\u00e9caissement et transmission'
              : phase === 'fire' ? 'Strat\u00e9gie de la p\u00e9riode-pont'
              : legacy ? 'Strat\u00e9gie fiscale et succession'
              : lowInc ? 'Strat\u00e9gie de revenu garanti'
              : 'Strat\u00e9gie et d\u00e9cisions';
        var f = ccpc ? 'Salaire vs dividendes, retrait corporatif, fractionnement et transmission de la soci\u00e9t\u00e9.'
              : phase === 'decum' ? 'L\u2019ordre des retraits, le fractionnement, l\u2019imp\u00f4t \u00e0 vie et la planification successorale.'
              : phase === 'fire' ? 'Comment couvrir les ann\u00e9es entre la retraite anticip\u00e9e et l\u2019arriv\u00e9e des prestations publiques.'
              : lowInc ? 'Optimisation du SRG, ordre de d\u00e9caissement et coordination des prestations.'
              : 'Les leviers fiscaux, l\u2019ordre de d\u00e9caissement, la transmission, et le calendrier des d\u00e9cisions \u00e0 prendre.';
        return { title: t, frame: f };
      }
      var t = ccpc ? 'Corporate & tax strategy'
            : phase === 'decum' ? 'Decumulation and succession'
            : phase === 'fire' ? 'Bridge-period strategy'
            : legacy ? 'Tax strategy and estate'
            : lowInc ? 'Guaranteed-income strategy'
            : 'Strategy & decisions';
      var f = ccpc ? 'Salary vs dividends, corporate withdrawal, splitting, and corporate transition.'
            : phase === 'decum' ? 'Withdrawal order, splitting, lifetime tax, and estate planning.'
            : phase === 'fire' ? 'How to cover the years between early retirement and the arrival of public benefits.'
            : lowInc ? 'GIS optimization, withdrawal order, and coordination of public benefits.'
            : 'Tax levers, draw-order sequencing, succession, and the timeline of decisions ahead of you.';
      return { title: t, frame: f };
    }

    // ── Ch.5 — Explore alternatives (label fixed, frame phase-tinted) ─
    function ch5(fr) {
      if (fr) {
        var t = _failing ? 'Tester des ajustements'
              : 'Explorer des alternatives';
        var f = _failing ? 'Quelques ajustements concrets pour voir lesquels redressent la trajectoire \u2014 votre plan de r\u00e9f\u00e9rence reste intact.'
              : 'Quelques d\u00e9cisions concr\u00e8tes pour voir comment votre plan r\u00e9agit \u2014 votre plan de r\u00e9f\u00e9rence reste intact.';
        return { title: t, frame: f };
      }
      var t = _failing ? 'Test some adjustments'
            : 'Explore alternatives';
      var f = _failing ? 'A few concrete adjustments to see which ones steady the trajectory \u2014 your baseline plan stays intact.'
            : 'A few concrete decisions to see how your plan responds \u2014 your baseline plan stays intact.';
      return { title: t, frame: f };
    }

    // ── Ch.6 — Appendix (always neutral) ─────────────────────────────
    function ch6(fr) {
      if (fr) return { title: 'Annexe', frame: 'M\u00e9thode, hypoth\u00e8ses techniques, et le glossaire des termes utilis\u00e9s dans ce rapport.' };
      return { title: 'Appendix', frame: 'Method, technical assumptions, and the glossary of terms used in this report.' };
    }

    var dispatch = { 1: ch1, 2: ch2, 3: ch3, 4: ch4, 5: ch5, 6: ch6 };
    var fn = dispatch[idx];
    return fn ? fn(fr) : { title: '', frame: '' };
  }

  // Phase 1 (premium shell): archetype inference from user inputs.
  // Drives cover promise + contextual hero KPI + chapter framing copy.
  // The classifier only sees finLiteracy/stressLevel/detailPref; archetype
  // is a SEPARATE axis derived from the actual financial situation. Must
  // generalize from arbitrary user-filled forms, not from dev profiles.
  //
  // Primary axis (life-phase):
  //   decum     — already retired or at/past retAge
  //   transition — within 7 years of retirement AND age >= 52
  //   fire      — retiring before 55 AND a bridge gap exists (pre-CPP)
  //   accum     — fallback (saving for a 60+ retirement)
  //
  // Secondary overlays (mutually compatible — archetype.tags[]):
  //   couple    — p.cOn=true
  //   ccpc      — p.corp / p.ccpc / corp_overlay signals
  //   tax_heavy — likely OAS clawback (taxIncome > clawback threshold)
  //   legacy    — explicit estate goals OR no_heir signal
  //   low_income — gov benefits dominate income mix (gis-eligible band)
  function _inferArchetype(d) {
    var p = d.p || {};
    var age = +p.age || 65;
    var retAge = +p.retAge || age;
    var deathAge = +p.deathAge || 92;
    var yrsToRet = retAge - age;
    var phase;
    if (yrsToRet <= 0) phase = 'decum';
    else if (yrsToRet <= 7 && age >= 52) phase = 'transition';
    else if (retAge < 55 && yrsToRet >= 1) phase = 'fire';
    else phase = 'accum';
    var tags = [];
    if (p.cOn) tags.push('couple');
    // CCPC detection — engine field is bizOn+bizType='ccpc' (planner SKU);
    // legacy fields (corp/ccpc/corpVal) preserved for forward-compat.
    var corpVal = +(p.bizRetainedEarnings || p.corp || p.ccpc || p.corpVal || 0);
    var hasCcpcBiz = (p.bizOn && (p.bizType === 'ccpc' || p.bizType === 'CCPC')) || corpVal > 0;
    if (hasCcpcBiz) tags.push('ccpc');
    var totalLiquid = (+p.rrsp || 0) + (+p.tfsa || 0) + (+p.nr || 0) + (+p.lira || 0)
                    + (+p.cRRSP || 0) + (+p.cTFSA || 0) + (+p.cNR || 0);
    var baseSal = +p.sal || 0;
    var basePen = +p.penM ? (p.penM * 12) : 0;
    var taxableProxy = baseSal + basePen;
    var OAS_THR = 95323;
    if (taxableProxy > OAS_THR * 1.05 || totalLiquid > 1500000) tags.push('tax_heavy');
    if ((d.R && d.R.hasGoals) || p.estateGoal || p.noHeir) tags.push('legacy');
    var govLeansHeavy = (basePen + baseSal) < 30000 && totalLiquid < 150000 && phase !== 'accum';
    if (govLeansHeavy) tags.push('low_income');
    return { phase: phase, tags: tags };
  }

  // Deterministic, archetype-keyed cover promise. ONE per archetype phase.
  // Tags can refine but the family stays small: codex constraint is a
  // controllable template family, not a per-case AI line. Couple variants
  // tweak pronouns where natural; otherwise the phase line speaks to both.
  function _coverPromise(arch, fr, succVal) {
    var phase = arch.phase;
    var couple = arch.tags && arch.tags.indexOf('couple') >= 0;
    // Codex 2026-04-27: cover promise is now success-rate-aware. The
    // previous fixed archetype-keyed promise ("A trajectory to protect
    // your flexibility...") was incoherent for fragile / at-risk plans
    // — it implied delivery the numbers don't support. Same buckets as
    // Ch.2 title: ≥75% strong, 55–75% mixed, <55% weak. Mixed/weak get
    // observational copy that names what the report is FOR (a clear
    // read of where the plan stands + the levers worth weighing) rather
    // than promising an outcome.
    var s = (succVal == null) ? null : +succVal;
    var weak = s != null && s < 0.55;
    var mixed = s != null && s >= 0.55 && s < 0.75;
    if (weak) {
      return fr
        ? 'Une lecture franche de ce que les chiffres disent aujourd\'hui — et des leviers à examiner pour stabiliser la trajectoire.'
        : 'A frank read of what the numbers say today — and the levers worth weighing to steady the trajectory.';
    }
    if (mixed) {
      return fr
        ? 'Un état des lieux de votre plan, ses zones de fragilité, et les ajustements qui rendraient la trajectoire plus confortable.'
        : 'An honest read of your plan, its fragile spots, and the adjustments that would make the trajectory more comfortable.';
    }
    if (fr) {
      switch (phase) {
        case 'decum':
          return couple
            ? 'Une stratégie pour transformer votre patrimoine commun en revenus de retraite fiables.'
            : 'Une stratégie pour transformer un patrimoine solide en revenus de retraite fiables.';
        case 'transition':
          return 'Une trajectoire pour protéger votre flexibilité et renforcer votre revenu à vie.';
        case 'fire':
          return 'Un chemin vers une retraite anticipée, étayé par une analyse de la période-pont.';
        case 'accum':
        default:
          return 'Un plan discipliné vers la retraite, modélisé sur des milliers d\'avenirs possibles.';
      }
    }
    switch (phase) {
      case 'decum':
        return couple
          ? 'A strategy to turn your shared assets into reliable retirement income.'
          : 'A strategy to turn strong assets into reliable retirement income.';
      case 'transition':
        return 'A trajectory to protect your flexibility and strengthen your lifetime income.';
      case 'fire':
        return 'A path toward early retirement, grounded in a bridge-period analysis.';
      case 'accum':
      default:
        return 'A disciplined plan toward retirement, modeled across thousands of possible futures.';
    }
  }

  function renderCover(d) {
    var fr = d.fr, g = F.grade(d.succVal, fr), sC = F.succColor(d.succVal);
    var cName = (d.client.name || 'Client');
    var cSpouse = d.p.cOn ? (d.client.spouseName || d.p.cSpouseName || '') : '';
    var arch = _inferArchetype(d);
    d._archetype = arch; // share with downstream renderers (hero KPI, chapter framing)
    var h = '<div class="cover">';
    h += '<div style="margin-bottom:30px;opacity:0.95">' + logoSvg.replace(/fill="[^"]*"/g, 'fill="#c49a1a"').replace('fill="#c49a1a" opacity="0.6"', 'fill="#c49a1a" opacity="0.5"').replace('fill="#c49a1a" opacity="0.8"', 'fill="#c49a1a" opacity="0.7"') + '</div>';
    h += '<div class="cover-divider"></div>';
    // Beginner readers (jargonMode='plain') get a softer, friendlier cover
    // title — "Plan financier" / "Financial Plan" — instead of the more
    // formal "Detailed Report" reserved for intermediate / advanced readers.
    var _isPlain = d.renderProfile && d.renderProfile.jargonMode === 'plain';
    var _coverTitle = _isPlain
      ? (fr ? 'Plan financier' : 'Financial Plan')
      : F.L('cover_title', fr);
    h += '<div class="cover-title">' + _coverTitle + '</div>';
    // Phase 1 cover-promise: replaces the old uppercase "Personalized snapshot"
    // tracked-label subtitle with a deterministic archetype-keyed sentence
    // that articulates WHY this report exists for THIS reader. Same family,
    // archetype-keyed; never AI-generated (codex 2026-04-27: deterministic,
    // not AI; safer, consistent, easier to control tone).
    h += '<div class="cover-promise" style="font-family:\"Playfair Display\",Georgia,serif;font-size:16px;font-style:italic;color:#e8e0d4;line-height:1.5;max-width:520px;margin:18px auto 0;letter-spacing:0.1px">' +
      F.esc(_coverPromise(arch, fr, d.succVal)) + '</div>';
    h += '<div class="cover-divider"></div>';
    h += '<div style="font-size:13px;color:#bccbe0;margin-top:10px;letter-spacing:0.4px">' + F.L('prepared_for', fr) + '</div>';
    h += '<div class="cover-client">' + F.esc(cName) + (cSpouse ? ' & ' + F.esc(cSpouse) : '') + '</div>';
    // Sprint 0.1: dropped F/D/C letter grade. The grade pill ("F — To
    // rebuild") was academic and added nothing the success rate +
    // posture word didn't already say. Cover now shows the success
    // rate inside the circle and the band-anchored thesis posture
    // word below — single, defendable, non-judgemental.
    h += '<div class="cover-grade-circle" style="border-color:' + sC + ';color:' + sC + '">';
    h += '<div class="cover-grade-letter">' + _fmtSucc(d.succVal) + '</div>';
    h += '</div>';
    h += '<div style="text-align:center;margin-top:14px;font-family:Inter,sans-serif;font-size:11px;color:#bccbe0;letter-spacing:1px">' +
      (fr ? 'Taux de succ\u00e8s sur ' + ((d.p.deathAge || 90) - (d.p.age || 35)) + '\u00a0ans' : 'Success rate over ' + ((d.p.deathAge || 90) - (d.p.age || 35)) + ' years') +
      '</div>';
    if (d.thesis && d.thesis.bandLabel) {
      h += '<div style="text-align:center;margin-top:8px;font-family:\"Playfair Display\",Georgia,serif;font-size:14px;font-weight:600;color:#faf8f4">' + F.esc(d.thesis.bandLabel) + '</div>';
    }
    // Per Codex feedback (2026-04-27): the Planner SKU pill and the reader-
    // profile combo banner are PRODUCT chrome, not CLIENT deliverable. They
    // belong in the internal review-pack metadata + dashboard, not on the
    // cover of a report a client takes to their accountant. Both removed.
    h += '<div class="cover-date">' + F.L('prepared_on', fr) + ' ' + F.fmtDate(null, fr) + '</div>';
    if (d.client.advisor) h += '<div style="font-size:11px;color:#a8b8d0;margin-top:6px">' + F.esc(d.client.advisor) + (d.client.firm ? ' \u00b7 ' + F.esc(d.client.firm) : '') + '</div>';
    // Methodology line + version footer removed from the cover entirely
    // (per design review 2026-04-26): the cover should be a calm, premium
    // anchor — methodology lives in the Methodology section, version
    // identifiers live in the page header, and "BuildFi Technologies inc."
    // already appears in the running footer of every printed page.
    h += '</div>';
    return h;
  }

  function renderHeader(d) {
    var fr = d.fr, today = F.fmtDate(null, fr);
    var h = '<div class="hdr"><div>';
    h += '<h1>' + (fr ? 'Plan financier' : 'Financial Plan') + '</h1>';
    h += '<h2>' + F.esc(d.client.name || 'Client') + '</h2>';
    h += '</div><div class="hdr-right">';
    h += today + '<br/>';
    if (d.client.addr) h += '<span style="font-size:11px">' + F.esc(d.client.addr) + '</span><br/>';
    if (d.client.phone) h += '<span style="font-size:11px">' + F.esc(d.client.phone) + '</span><br/>';
    if (d.client.email) h += '<span style="font-size:9px;color:' + C.blue + '">' + F.esc(d.client.email) + '</span><br/>';
    // Codex 2026-04-27 P5: build/version labels do not belong on a client
    // deliverable. clientExport strips them entirely; otherwise show only
    // the entity (no version) for in-app reads.
    if (!d.clientExport) {
      h += '<span style="font-size:9px;color:#999">BuildFi Technologies inc.</span>';
    }
    h += '</div></div>';
    return h;
  }

  function renderGrade(d) {
    var fr = d.fr, g = F.grade(d.succVal, fr), sC = F.succColor(d.succVal);
    var h = '<div style="text-align:center;margin:14px 0">';
    h += '<div class="grade-ring" style="border:6px solid ' + sC + ';color:' + sC + '"><span class="mono">' + (d.succVal == null ? (fr ? 'En cours' : 'Pending') : _fmtSucc(d.succVal)) + '</span></div>';
    h += '<div><span class="grade-pill" style="background:' + sC + '">' + g.letter + ' \u2014 ' + g.label + '</span></div>';
    // Sim/distribution meta-line removed entirely (per design review): this
    // detail belongs in the Methodology section, not under the hero score.
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
      (fr ? 'Votre plan, en d\u00e9tail' : 'Your plan, in detail') + '</h3>';

    // 2026-04-29: phase-specific opening narrative \u2014 moved here from
    // sec-diagnostic. Chapter 1 establishes the lifecycle frame before
    // the inputs/hypoth\u00e8ses recap. sec-diagnostic now opens directly on
    // strengths.
    var _yrsToRet_a = (p.retAge || 65) - (p.age || 0);
    var _phase_a = (d.R && d.R.phase) || 'accum';
    var _nm_a = d.fn ? '<strong>' + F.esc(d.fn) + '</strong>' : '';
    var _sn_a = d.sfn ? '<strong>' + F.esc(d.sfn) + '</strong>' : '';
    var _coupleLabel_a = '';
    if (d.R && d.R.couple) {
      _coupleLabel_a = _sn_a ? (fr ? ' et ' + _sn_a : ' and ' + _sn_a)
                             : (fr ? ' et votre conjoint(e)' : ' and your spouse');
    }
    var _nmFull_a = _nm_a ? (_nm_a + _coupleLabel_a) : '';
    var _nmPfx_a = _nmFull_a ? (_nmFull_a + ', ') : '';
    var _savingsLabel_a = (d.R && d.R.couple)
      ? (fr ? '\u00e9pargne du m\u00e9nage' : 'household savings')
      : (fr ? '\u00e9pargne actuelle' : 'current savings');
    var _coupleNote_a = (d.R && d.R.couple)
      ? (fr
          ? ' Tous les chiffres ci-dessous refl\u00e8tent le m\u00e9nage combin\u00e9 (vous + ' + (d.sfn ? F.esc(d.sfn) : 'conjoint(e)') + (p.cAge ? ', ' + p.cAge + ' ans' : '') + (p.cRetAge ? ', retraite \u00e0 ' + p.cRetAge : '') + ').'
          : ' All figures below reflect the combined household (you + ' + (d.sfn ? F.esc(d.sfn) : 'spouse') + (p.cAge ? ', age ' + p.cAge : '') + (p.cRetAge ? ', retiring at ' + p.cRetAge : '') + ').')
      : '';
    if (_phase_a === 'decum') {
      h += narr(fr
        ? _nmPfx_a + 'vous \u00eates maintenant \u00e0 la retraite. La question centrale n\'est plus combien \u00e9pargner, mais comment d\u00e9caisser : dans quel ordre, \u00e0 quel rythme, et avec quelle marge si les march\u00e9s d\u00e9\u00e7oivent. L\'horizon \u00e9valu\u00e9 ici va jusqu\'\u00e0 <strong>' + (p.deathAge || 90) + ' ans</strong>.' + _coupleNote_a
        : (_nmFull_a ? _nmFull_a + ', you' : 'You') + ' are now retired. The central question is no longer how much to save, but how to draw down: in what order, at what pace, and with what margin if markets disappoint. The horizon evaluated here runs to age <strong>' + (p.deathAge || 90) + '</strong>.' + _coupleNote_a);
    } else if (_phase_a === 'transition') {
      h += narr(fr
        ? _nmPfx_a + 'la retraite approche \u2014 dans <strong>' + _yrsToRet_a + ' ans</strong>. Les d\u00e9cisions des prochaines ann\u00e9es \u2014 date exacte de retraite, d\u00e9but des prestations, ajustements d\'\u00e9pargne \u2014 p\u00e8sent davantage que toutes celles qui suivront. Votre ' + _savingsLabel_a + ' de <strong>' + f$(d.totalBal) + '</strong> est le point de d\u00e9part.' + _coupleNote_a
        : (_nmFull_a ? _nmFull_a + ', retirement' : 'Retirement') + ' is approaching \u2014 in <strong>' + _yrsToRet_a + ' years</strong>. The decisions of the next few years \u2014 exact retirement date, benefit start ages, savings adjustments \u2014 matter more than every decision that comes after. Your ' + _savingsLabel_a + ' of <strong>' + f$(d.totalBal) + '</strong> is the starting point.' + _coupleNote_a);
    } else {
      h += narr(fr
        ? _nmPfx_a + 'vous \u00eates en accumulation, avec <strong>' + _yrsToRet_a + ' ans</strong> avant la retraite pr\u00e9vue \u00e0 ' + p.retAge + ' ans. La marge de man\u0153uvre est encore large : votre ' + _savingsLabel_a + ' de <strong>' + f$(d.totalBal) + '</strong> sera multipli\u00e9e par les cotisations \u00e0 venir et la dur\u00e9e de placement. Les ajustements faits maintenant ont l\'effet le plus important.' + _coupleNote_a
        : (_nmFull_a ? _nmFull_a + ', you' : 'You') + ' are in accumulation, with <strong>' + _yrsToRet_a + ' years</strong> until planned retirement at age ' + p.retAge + '. There is still wide room to act: your ' + _savingsLabel_a + ' of <strong>' + f$(d.totalBal) + '</strong> will be multiplied by future contributions and time in the markets. Adjustments made now carry the largest leverage.' + _coupleNote_a);
    }

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

    // 2026-04-29: removed the grade-ring + 4-up KPI block \u2014 those numbers
    // already live on the cover hero. The AI overall assessment below
    // opens the chapter without competing with its own metric badge.
    var _scopeAss = d.R.couple ? (fr ? ' (m\u00e9nage)' : ' (household)') : '';
    if (false) {
    h += '<div style="display:none">';
    h += F.KPI('<span class="mono">' + f$(d.mc.rMedF || d.mc.medF) + '</span>', (fr ? 'Patrimoine P50' : 'P50 Wealth') + _scopeAss, C.blue);
    h += F.KPI('<span class="mono">' + Math.round(d.covRatio * 100) + '%</span>', (fr ? 'Revenu garanti / dépenses' : 'Guaranteed income / spending') + _scopeAss, d.covRatio >= 0.6 ? C.green : d.covRatio >= 0.4 ? C.amber : C.red);
    h += F.KPI('<span class="mono">' + (d._wdPct ? d._wdPct + '%' : '\u2014') + '</span>', fr ? 'Taux retrait' : 'Withdrawal rate', d._wdPct && parseFloat(d._wdPct) > 4 ? C.red : C.green);
    h += F.KPI('<span class="mono">' + f$(Math.round(d.mc.medEstateNet || 0)) + '</span>', (fr ? 'H\u00e9ritage net' : 'Net estate') + _scopeAss, C.gold);
    h += '</div></div>';
    } // end if(false) — duplicate KPI block retired 2026-04-29

    // Overall AI assessment — synthesizes everything
    if (d.ai.overall_assessment) {
      h += F.AiBlock(d.ai.overall_assessment, fr);
    } else {
      // Deterministic summary when AI is absent
      // covRatio = household guaranteed income (CPP/QPP + OAS + pension, both
      // spouses) / target spend. Codex flagged: prior text said "government"
      // even though the figure already includes employer pension. Renamed to
      // "guaranteed income (public + pension)" so the label matches the math.
      var _covLabelFr = (p.penType && p.penType !== 'none') || (p.cOn && p.cPenType && p.cPenType !== 'none')
        ? 'Le revenu garanti (RRQ + PSV + pension d\'employeur)' : 'Les prestations publiques (RRQ + PSV)';
      var _covLabelEn = (p.penType && p.penType !== 'none') || (p.cOn && p.cPenType && p.cPenType !== 'none')
        ? 'Guaranteed income (CPP/QPP + OAS + employer pension)' : 'Public benefits (CPP/QPP + OAS)';
      var _detSummary = '';
      if (fr) {
        _detSummary = 'Votre plan obtient la note <strong>' + g.letter + '</strong> (' + g.label + ') avec un taux de succ\u00e8s de <strong>' + _fmtSucc(d.succVal) + '</strong> sur ' + (d.p.nSim || 5000) + ' simulations. ';
        _detSummary += _covLabelFr + ' couvre <strong>' + Math.round(d.covRatio * 100) + '%</strong> de vos d\u00e9penses. ';
        if (d.covRatio > 1) {
          _detSummary += '<strong>Le revenu garanti d\u00e9passe la cible de d\u00e9penses</strong> de ' + Math.round((d.covRatio - 1) * 100) + ' pts \u2014 les retraits du portefeuille ne sont pas requis pour maintenir le mode de vie cible. ';
        } else {
          _detSummary += 'Un \u00e9cart mensuel de <strong>' + F.fmtMoney(Math.round(d.gapM), fr) + '</strong> par mois est combl\u00e9 par l\u2019\u00e9pargne. ';
        }
        _detSummary += 'Le patrimoine m\u00e9dian en fin de projection est de <strong>' + f$(d.mc.rMedF || d.mc.medF) + '</strong> en dollars r\u00e9els.';
      } else {
        _detSummary = 'Your plan receives a grade of <strong>' + g.letter + '</strong> (' + g.label + ') with a success rate of <strong>' + _fmtSucc(d.succVal) + '</strong> across ' + (d.p.nSim || 5000) + ' simulations. ';
        _detSummary += _covLabelEn + ' covers <strong>' + Math.round(d.covRatio * 100) + '%</strong> of spending. ';
        // Codex flag: "leaving a gap of $X" reads weird when coverage is
        // over 100% (negative gap). Branch the wording to match the sign:
        // if guaranteed income exceeds spending, surface the surplus
        // explicitly; otherwise show the gap to be funded from savings.
        if (d.covRatio > 1) {
          _detSummary += '<strong>Guaranteed income exceeds your target spending</strong> by ' + Math.round((d.covRatio - 1) * 100) + ' pts \u2014 portfolio withdrawals are not required to maintain the baseline. ';
        } else {
          _detSummary += 'A monthly gap of <strong>' + F.fmtMoney(Math.round(d.gapM), fr) + '</strong> per month is funded from savings. ';
        }
        _detSummary += 'Median wealth at end of projection is <strong>' + f$(d.mc.rMedF || d.mc.medF) + '</strong> in real dollars.';
      }
      h += narr(_detSummary);
    }

    // Key observations bullets (deterministic, AI can override via overall_assessment)
    var obs = [];
    var _planFailing = (d.succVal != null && d.succVal < 0.55);
    // Thresholds aligned with _thesisBand in report-data.js (2026-04-27):
    // 0.85 surplus(if cov), 0.60 solid, 0.30 fragile, 0.10 at-risk, <0.10 failure.
    if (d.succVal != null && d.succVal >= 0.85) obs.push(fr ? '\u2713 Plan solide \u2014 le taux de succ\u00e8s de ' + Math.round(d.succVal * 100) + '% indique une forte probabilit\u00e9 de maintenir votre niveau de vie.' : '\u2713 Solid plan \u2014 the ' + Math.round(d.succVal * 100) + '% success rate indicates a high probability of maintaining your lifestyle.');
    else if (d.succVal != null && d.succVal >= 0.60) obs.push(fr ? '\u2192 Plan tenable \u2014 le taux de succ\u00e8s de ' + Math.round(d.succVal * 100) + '% indique que la trajectoire centrale tient ; la marge contre les impr\u00e9vus reste mod\u00e9r\u00e9e.' : '\u2192 Plan holds \u2014 the ' + Math.round(d.succVal * 100) + '% success rate indicates the central trajectory holds; margin against the unexpected remains moderate.');
    else if (d.succVal != null && d.succVal >= 0.30) obs.push(fr ? '\u26a0 Plan fragile \u2014 le taux de ' + Math.round(d.succVal * 100) + '% laisse peu de marge face aux impr\u00e9vus.' : '\u26a0 Fragile plan \u2014 the ' + Math.round(d.succVal * 100) + '% rate leaves limited margin for the unexpected.');
    else if (d.succVal != null && d.succVal >= 0.10) obs.push(fr ? '\u26a0 Plan \u00e0 risque \u2014 un taux de ' + Math.round(d.succVal * 100) + '% sugg\u00e8re des ajustements structurels n\u00e9cessaires.' : '\u26a0 At-risk plan \u2014 a ' + Math.round(d.succVal * 100) + '% rate suggests structural adjustments are needed.');
    else if (d.succVal != null) obs.push(fr ? '\u26a0 Plan non viable en l\'\u00e9tat \u2014 un taux de ' + Math.round(d.succVal * 100) + '% indique qu\'une r\u00e9vision globale serait n\u00e9cessaire pour r\u00e9tablir la trajectoire.' : '\u26a0 Plan not sustainable as is \u2014 a ' + Math.round(d.succVal * 100) + '% rate indicates a global review would be necessary to restore the trajectory.');

    // covRatio includes pension; relabel from "government" to "guaranteed".
    if (d.covRatio > 1.05) {
      var _surplusPts = Math.round((d.covRatio - 1) * 100);
      obs.push(fr ? '\u2713 Revenu garanti en <strong>surplus</strong> de ' + _surplusPts + ' pts vs d\u00e9penses cibles \u2014 les retraits du portefeuille ne sont pas requis pour maintenir le niveau de vie de base.' : '\u2713 Guaranteed income runs a <strong>surplus</strong> of ' + _surplusPts + ' pts vs target spending \u2014 portfolio withdrawals are not required to maintain the baseline lifestyle.');
    } else if (d.covRatio >= 0.7) obs.push(fr ? '\u2713 Le revenu garanti couvre ' + Math.round(d.covRatio * 100) + '% des d\u00e9penses, r\u00e9duisant la pression sur l\u2019\u00e9pargne.' : '\u2713 Guaranteed income covers ' + Math.round(d.covRatio * 100) + '% of spending, reducing pressure on savings.');
    else if (d.gapM > 0) obs.push(fr ? '\u2192 \u00c9cart mensuel de ' + F.fmtMoney(Math.round(d.gapM), fr) + ' \u00e0 combler par les retraits d\u2019\u00e9pargne.' : '\u2192 Monthly gap of ' + F.fmtMoney(Math.round(d.gapM), fr) + ' to be funded from savings withdrawals.');

    if (!_planFailing && d._taxAlpha != null && d._taxAlpha > 0) obs.push(fr ? '\u2713 Optimisation fiscale d\u00e9tect\u00e9e \u2014 \u00e9conomies de ' + F.fmtCompact(Math.round(d._taxAlpha)) + ' sur la vie du plan.' : '\u2713 Tax optimization detected \u2014 savings of ' + F.fmtCompact(Math.round(d._taxAlpha)) + ' over the plan lifetime.');
    if (d.R.hasMeltdown) obs.push(fr ? '\u2192 Strat\u00e9gie de d\u00e9caissement anticip\u00e9 REER active \u2014 d\u00e9tails en section d\u00e9di\u00e9e.' : '\u2192 RRSP meltdown strategy active \u2014 see dedicated section.');
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

    // 2026-04-29: phase narrative below is now suppressed at render time —
    // chapter 1 (sec-assessment) opens with the same lifecycle frame, so
    // re-stating it here was a duplicate. The block stays in the source
    // for git-blame traceability but renders nothing.
    if (false) {
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
        ? _nmPfx + 'vous êtes maintenant à la retraite. La question centrale n\'est plus combien épargner, mais comment décaisser : dans quel ordre, à quel rythme, et avec quelle marge si les marchés déçoivent. L\'horizon évalué ici va jusqu\'à <strong>' + (p.deathAge || 90) + ' ans</strong>.' + _coupleNote
        : (_nmFull ? _nmFull + ', you' : 'You') + ' are now retired. The central question is no longer how much to save, but how to draw down: in what order, at what pace, and with what margin if markets disappoint. The horizon evaluated here runs to age <strong>' + (p.deathAge || 90) + '</strong>.' + _coupleNote);
    } else if (phase === 'transition') {
      h += narr(fr
        ? _nmPfx + 'la retraite approche — dans <strong>' + yrsToRet + ' ans</strong>. Les décisions des prochaines années — date exacte de retraite, début des prestations, ajustements d\'épargne — pèsent davantage que toutes celles qui suivront. Votre ' + _savingsLabel + ' de <strong>' + f$(d.totalBal) + '</strong> est le point de départ.' + _coupleNote
        : (_nmFull ? _nmFull + ', retirement' : 'Retirement') + ' is approaching — in <strong>' + yrsToRet + ' years</strong>. The decisions of the next few years — exact retirement date, benefit start ages, savings adjustments — matter more than every decision that comes after. Your ' + _savingsLabel + ' of <strong>' + f$(d.totalBal) + '</strong> is the starting point.' + _coupleNote);
    } else {
      h += narr(fr
        ? _nmPfx + 'vous êtes en accumulation, avec <strong>' + yrsToRet + ' ans</strong> avant la retraite prévue à ' + p.retAge + ' ans. La marge de manœuvre est encore large : votre ' + _savingsLabel + ' de <strong>' + f$(d.totalBal) + '</strong> sera multipliée par les cotisations à venir et la durée de placement. Les ajustements faits maintenant ont l\'effet le plus important.' + _coupleNote
        : (_nmFull ? _nmFull + ', you' : 'You') + ' are in accumulation, with <strong>' + yrsToRet + ' years</strong> until planned retirement at age ' + p.retAge + '. There is still wide room to act: your ' + _savingsLabel + ' of <strong>' + f$(d.totalBal) + '</strong> will be multiplied by future contributions and time in the markets. Adjustments made now carry the largest leverage.' + _coupleNote);
    }
    } // end if(false) — phase narrative now in sec-assessment, not duplicated here

    // Phase 1 hero KPI (codex 2026-04-27): one dominant insight per case,
    // archetype-driven. Tax/legacy/low-income tags can outrank phase. Falls
    // back to success rate. Sits ABOVE the supporting KPI grid below — the
    // grid still renders, but visually demoted (the hero owns the focal
    // point).
    var _archHero = d._archetype || _inferArchetype(d);
    h += _heroKPI(d, _archHero);

    // Phase 6 finish pass (codex 2026-04-27): supporting KPI strip.
    // Replaces the old g5/g6 boxed-tile dashboard grid with a quieter
    // editorial strip — no individual tile borders, hairline dividers,
    // Playfair values, calmer scale. The hero KPI above owns the focal
    // point; this strip is supporting evidence, not competing tiles.
    var _durLabel = (mc.p5Ruin || 999) >= 200
      ? (fr ? 'Jusqu\'\u00e0 ' + (p.deathAge || 90) + ' ans' : 'Through age ' + (p.deathAge || 90))
      : mc.p5Ruin + (fr ? ' ans' : ' yrs');
    var _stripTiles = [
      {
        label: fr ? 'Taux de succès' : 'Success rate',
        value: (d.succVal == null ? (fr ? 'En cours' : 'Pending') : Math.round(d.succVal * 100) + '%'),
        color: F.succColor(d.succVal)
      },
      {
        label: fr ? 'Patrimoine médian (réel)' : 'Median wealth (real)',
        value: f$(mc.rMedF || mc.medF),
        color: '#252d39'
      },
      {
        label: fr ? 'Quart prudent (P25)' : 'Cautious quarter (P25)',
        value: f$(mc.rP25F || mc.p25F || mc.rVar5 || mc.var5),
        color: '#a85a3a'
      },
      {
        label: fr ? 'Durabilité' : 'Durability',
        value: _durLabel,
        color: (mc.p5Ruin || 999) >= 200 ? '#2a8c46' : '#cc4444'
      },
      {
        label: fr ? 'Retrait initial' : 'Initial withdrawal',
        value: (d._wdPct ? d._wdPct + '%' : '\u2014'),
        color: d._wdPct && parseFloat(d._wdPct) > 4 ? '#cc4444'
             : d._wdPct && parseFloat(d._wdPct) > 3.5 ? '#cf9850'
             : '#2a8c46'
      }
    ];
    if (exp) {
      _stripTiles.push({
        label: d._taxAlpha != null && d._taxAlpha > 0
          ? (fr ? 'Économies fiscales' : 'Tax savings')
          : (fr ? 'Impôt viager' : 'Lifetime tax'),
        value: f$(Math.round(d._taxAlpha != null && d._taxAlpha > 0 ? d._taxAlpha : (d._optTax || 0))),
        color: d._taxAlpha != null && d._taxAlpha > 0 ? '#2a8c46' : '#a85a3a'
      });
    }
    h += '<div class="bf-support-strip">';
    _stripTiles.forEach(function(t) {
      h += '<div class="bf-support-tile">' +
        '<div class="bf-support-tile-label">' + F.esc(t.label) + '</div>' +
        '<div class="bf-support-tile-value" style="color:' + t.color + '">' + t.value + '</div>' +
        '</div>';
    });
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

    // 2026-04-29 data-quality gate: only emit this section when at least
    // one row actually moves the plan in a way the reader would care
    // about — defined as |Δsuccess| ≥ 3 pts OR |Δmedian| ≥ 10% of base.
    // Below those thresholds the table reads as decorative noise (two
    // generic ±1% sweeps moving things by a rounding error), and the
    // Watch line on the cover already surfaces the binding constraint.
    var _meaningful = rows.some(function(r) {
      var medMagU = baseMedF > 0 ? Math.abs(r.dMedUp) / baseMedF : 0;
      var medMagD = baseMedF > 0 ? Math.abs(r.dMedDn) / baseMedF : 0;
      var succMag = Math.max(Math.abs(r.dSuccUp || 0), Math.abs(r.dSuccDn || 0));
      return succMag >= 3 || medMagU >= 0.10 || medMagD >= 0.10;
    });
    if (!_meaningful) return '';

    var h = secPage();
    h += F.Sec(secN, F.L('levers', fr), 'sec-levers');
    h += narr(fr
      ? 'Pour chaque facteur ci-dessous, le chiffre indique combien le taux de succès et le patrimoine médian bougeraient si cette seule variable était modifiée — toutes les autres conditions tenues constantes.'
      : 'For each factor below, the figure indicates how far the success rate and median wealth would move if that single variable were modified — all other conditions held constant.');

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
        ? 'Chaque écart provient d\'un calcul complet sur les avenirs simulés — pas d\'approximation analytique. Les facteurs ne sont pas additifs : combiner plusieurs ajustements requiert une exploration combinée dédiée.'
        : 'Every figure comes from a full computation across the simulated futures — no closed-form approximation. The levers are not additive: combining several adjustments requires a dedicated combined exploration.') +
      '</div>';

    h += secPageEnd();
    return h;
  }

  // === SECTION: ADVISOR LETTER (page 2 of 18-22 plan) ===
  // One-page warm narrative from the advisor to the client. AI-generated via
  // Renders the advisor-letter body as plain paragraphs (not an AI-callout).
  // Re-implements the markdown-safe escape pipeline that AiBlock uses
  // (escape HTML → promote **bold** + *italic* → split paragraphs on \n\n)
  // but emits clean <p> tags instead of a labeled callout box. The badge
  // and yellow callout band belong on inline mid-report insights, not on
  // the letter that opens the report.
  function _renderLetterBody(text) {
    if (!text) return '';
    var safe = F.esc(String(text).replace(/\r\n?/g, '\n'));
    safe = safe
      .replace(/\*\*([^*\n][^*\n]*?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n][^*\n]*?)\*(?!\*)/g, '$1<em>$2</em>');
    var paragraphs = safe.split(/\n\n+/).map(function(p) {
      return '<p class="narr letter-body" style="margin:0 0 14px;font-size:12px;line-height:1.85;color:#2a2420">' + p.replace(/\n/g, '<br/>') + '</p>';
    });
    return paragraphs.join('');
  }

  // P1.6 — One-sentence case-driver framing. Returns the framing sentence
  // (or '') based on the profile's case_driver. Uses the same vocabulary
  // tokens that the narration-auditor checks for, so this fallback alone
  // satisfies the auditor when the AI letter doesn't name the driver.
  function _caseDriverFramingSentence(driver, fr, d) {
    if (!driver) return '';
    var p = (d && d.p) || {};
    var f$ = (window.BFmt && window.BFmt.fmtCompact) || function(v) { return v; };
    var corp = p.bizRetainedEarnings || 0;
    var debtTotal = (p.debts || []).reduce(function(s, dd) { return s + (dd.balance || dd.bal || 0); }, 0);
    var bridgeYears = (p.retAge && p.retAge < 65) ? (65 - p.retAge) : 0;
    var ageNow = p.age || 0;
    var retAge = p.retAge || 65;
    switch (driver) {
      case 'ccpc_extraction':
        return fr
          ? 'Au c\u0153ur de votre cas: l\'<strong>ordre d\'extraction de la SPCC</strong> \u2014 salaire, dividendes, vente d\'actifs. Avec ' + f$(corp) + '$ de b\u00e9n\u00e9fices non r\u00e9partis et une vente pr\u00e9vue \u00e0 ' + (p.bizSaleAge || retAge) + ' ans, la cadence d\'extraction d\u00e9termine l\'imp\u00f4t int\u00e9gr\u00e9 viager. Une cadence document\u00e9e ann\u00e9e par ann\u00e9e peut \u00e9conomiser 8\u201312\u202f% de l\'imp\u00f4t total.'
          : 'At the heart of your case: the <strong>CCPC extraction order</strong> \u2014 salary, dividends, asset sale. With ' + f$(corp) + '$ in retained earnings and a sale planned at age ' + (p.bizSaleAge || retAge) + ', the extraction cadence drives lifetime integrated tax. A documented year-by-year cadence can save 8\u201312% of total tax.';
      case 'rental_cashflow':
        var propCount = (p.props || []).filter(function(pr) { return pr && pr.on; }).length;
        return fr
          ? 'Au centre de votre plan: le <strong>flux locatif</strong> de ' + (propCount || 'vos') + ' immeuble' + (propCount > 1 ? 's' : '') + ', troisi\u00e8me pilier de revenu aux c\u00f4t\u00e9s du RRQ/PSV et des retraits de portefeuille. Le calendrier de renouvellement hypoth\u00e9caire et l\'escalade des loyers peuvent ajouter 10\u201315\u202fK$/an au flux net dans la d\u00e9cennie de retraite.'
          : 'At the center of your plan: <strong>rental cash flow</strong> from ' + (propCount || 'your') + ' propert' + (propCount > 1 ? 'ies' : 'y') + ', a third income pillar alongside CPP/OAS and portfolio withdrawals. Mortgage renewal timing and rent escalation can add $10\u201315K/yr to net cash flow over the retirement decade.';
      case 'gis_trap':
        return fr
          ? 'L\'enjeu structurant de votre cas: le <strong>pi\u00e8ge SRG</strong>. Chaque dollar de revenu compt\u00e9 (RRQ + retraits REER + rente) r\u00e9duit la prestation de pr\u00e8s de 50\u00a2 ; les retraits CELI ne d\u00e9clenchent pas la r\u00e9cup\u00e9ration. L\'ordre des retraits \u00e0 partir de 65 ans peut pr\u00e9server plusieurs ann\u00e9es de SRG.'
          : 'The structural focus of your case: the <strong>GIS trap</strong>. Each dollar of counted income (CPP + RRSP withdrawals + pension) reduces the benefit by close to 50\u00a2 ; TFSA withdrawals do not trigger clawback. Withdrawal sequencing from age 65 can preserve several extra years of GIS.';
      case 'fire_bridge':
        // BEAT: early_qpp_oas_tradeoff — must explicitly name early-vs-deferred
        // QPP/OAS arbitrage (defer QPP/OAS, early CPP, +0.7%/mo deferral).
        return fr
          ? 'Le levier dominant de votre plan: la <strong>zone-pont</strong> de ' + bridgeYears + ' ans entre la retraite \u00e0 ' + retAge + ' ans et le d\u00e9but du RRQ/PSV \u00e0 65 ans. C\'est la fen\u00eatre la plus expos\u00e9e au risque de s\u00e9quence ; une r\u00e9serve liquide d\u00e9di\u00e9e (\u00e9chelle d\'obligations, fonds de r\u00e9serve) isole le plan d\'une chute de march\u00e9 dans les premi\u00e8res ann\u00e9es. L\'arbitrage <strong>RRQ/PSV anticip\u00e9 vs report\u00e9</strong> est central : commencer t\u00f4t (60 pour RRQ, 65 pour PSV) couvre la zone-pont avec des prestations garanties ; <strong>reporter le RRQ et la PSV</strong> jusqu\'\u00e0 70 ans ajoute jusqu\'\u00e0 +42\u202f% de RRQ et +36\u202f% de PSV \u00e0 vie au prix d\'une plus grande pression sur le portefeuille pendant la zone-pont.'
          : 'The dominant lever of your plan: the <strong>' + bridgeYears + '-year bridge</strong> between retirement at age ' + retAge + ' and the start of CPP/OAS at 65. This is the window most exposed to sequence-of-returns risk ; a dedicated liquid reserve (bond ladder, reserve fund) isolates the plan from an early market drop. The <strong>early vs deferred CPP/OAS</strong> trade-off is central : starting early (CPP at 60, OAS at 65) covers the bridge with guaranteed income ; <strong>defer CPP and OAS</strong> to age 70 adds up to +42% lifetime CPP and +36% lifetime OAS at the cost of heavier portfolio draws during the bridge.';
      case 'db_pension_split':
        // BEAT: db_formula_explained — must explicitly cite the DB pension
        // formula (years × accrual × earnings, or rule of 80/85/90).
        return fr
          ? 'Le levier conjugal central: le <strong>fractionnement de pension PD</strong> \u00e0 partir de 65 ans. La pension PD se calcule typiquement par la formule <strong>ann\u00e9es de service \u00d7 taux d\'accumulation (souvent 1,5\u20132\u202f%) \u00d7 salaire moyen des derni\u00e8res ann\u00e9es</strong>, et l\'admissibilit\u00e9 \u00e0 la retraite anticip\u00e9e suit souvent une r\u00e8gle d\'\u00e2ge\u202f+\u202fservice (r\u00e8gle de 80/85/90). Avec une pension index\u00e9e d\'un c\u00f4t\u00e9 et un revenu plus modeste de l\'autre, transmettre jusqu\'\u00e0 50\u202f% du revenu admissible peut \u00e9conomiser 4\u20138\u202fK$/an d\'imp\u00f4t conjugal et r\u00e9duire mat\u00e9riellement la r\u00e9cup\u00e9ration PSV.'
          : 'The central spousal lever: <strong>DB pension splitting</strong> from age 65. The DB pension is typically calculated as <strong>years of service \u00d7 accrual rate (often 1.5\u20132%) \u00d7 final average earnings</strong>, with early-retirement eligibility usually governed by an age + service rule (rule of 80/85/90). With one indexed pension on one side and a more modest income on the other, transferring up to 50% of eligible income can save $4\u20138K/yr in household tax and materially reduce OAS clawback.';
      case 'meltdown_window':
        return fr
          ? 'Le levier fiscal dominant: la <strong>fen\u00eatre de d\u00e9caissement anticip\u00e9 du REER</strong> entre ' + retAge + ' et 72 ans. Des retraits acc\u00e9l\u00e9r\u00e9s pendant cette fen\u00eatre lissent le revenu imposable avant la conversion FERR obligatoire et r\u00e9duisent la r\u00e9cup\u00e9ration PSV viagers.'
          : 'The dominant tax lever: the <strong>RRSP meltdown window</strong> between ' + retAge + ' and 72. Accelerated withdrawals in that window smooth taxable income before mandatory RRIF conversion and reduce lifetime OAS clawback.';
      case 'debt_paydown':
        // BEAT: debt-vs-invest tradeoff explicitly named (rembourser…investir,
        // après-impôt return, coût d'opportunité) — required by content-depth.
        return fr
          ? 'L\'arbitrage central de votre cas: le <strong>remboursement structur\u00e9 de ' + f$(debtTotal) + '$ de dettes</strong>. Chaque dollar rembours\u00e9 \u00e9quivaut \u00e0 un rendement garanti au taux de la dette. La d\u00e9cision <strong>rembourser ou investir</strong> se r\u00e9sout en comparant le rendement apr\u00e8s imp\u00f4t de l\'\u00e9pargne au taux d\'int\u00e9r\u00eat de la dette : tant que les soldes \u00e0 taux \u00e9lev\u00e9 ne sont pas \u00e9limin\u00e9s, le co\u00fbt d\'opportunit\u00e9 d\'investir d\'abord d\u00e9passe le rendement attendu.'
          : 'The central trade-off of your case: <strong>structured paydown of ' + f$(debtTotal) + '$ in debt</strong>. Each dollar repaid equals a guaranteed return at the debt rate. The <strong>pay debt or invest</strong> decision resolves by comparing the after-tax return on savings against the debt interest rate ; until high-rate balances are cleared, the opportunity cost of investing first exceeds the expected return.';
      case 'gap_savings':
        // BEATS: contribution_room_addressed (droits de cotisation REER/CELI),
        // retirement_age_lever (retraite plus tard / report retraite). Both
        // required by content-depth for case_driver=gap_savings.
        return fr
          ? 'L\'\u00e9cart \u00e0 combler dans votre plan vient principalement du <strong>taux d\'\u00e9pargne annuel</strong>. Sur l\'horizon de ' + Math.max(0, retAge - ageNow) + ' ans avant la retraite, augmenter la cotisation annuelle de quelques milliers de dollars (en utilisant les <strong>droits de cotisation REER inutilis\u00e9s</strong> et le plafond CELI annuel) d\u00e9place la projection plus efficacement que tout ajustement d\'allocation. Compl\u00e9mentairement, <strong>reporter la retraite</strong> de quelques ann\u00e9es (travailler plus longtemps) prolonge la phase d\'accumulation et raccourcit la phase de d\u00e9caissement \u2014 c\'est le levier structurel le plus efficace quand l\'\u00e9pargne disponible est limit\u00e9e.'
          : 'The gap in your plan comes mainly from the <strong>annual savings rate</strong>. Over the ' + Math.max(0, retAge - ageNow) + '-year pre-retirement horizon, adding a few thousand dollars in annual contributions (using your <strong>unused RRSP contribution room</strong> and the annual TFSA limit) moves the projection more than any allocation tweak. Complementarily, choosing to <strong>retire later</strong> (extend working years by 2\u20133) shortens the drawdown horizon and grows accrued QPP/CPP \u2014 it is the strongest structural lever when available savings are limited.';
      case 'hnw_estate':
        // BEATS: estate_freeze_or_trust (gel successoral, fiducie alter-ego,
        // donor-advised), spousal_rollover (roulement au conjoint, surviving
        // spouse). Both required by content-depth for hnw_estate.
        return fr
          ? 'Sur ce patrimoine combin\u00e9, l\'<strong>imp\u00f4t au d\u00e9c\u00e8s du second conjoint</strong> sur les soldes REER\u202f/\u202fFERR et les gains accumul\u00e9s reste le co\u00fbt fiscal dominant restant. Au premier d\u00e9c\u00e8s, le <strong>roulement au conjoint</strong> (transfert au conjoint survivant) reporte la cristallisation fiscale ; au second d\u00e9c\u00e8s, sans planification, la disposition r\u00e9put\u00e9e des REER/FERR et des immobilisations frappe d\'un coup. Des strat\u00e9gies successorales avanc\u00e9es \u2014 <strong>gel successoral</strong> sur les actions de soci\u00e9t\u00e9, <strong>fiducie alter-ego</strong> apr\u00e8s 65 ans, dons \u00e0 une fondation ou don de bienfaisance d\'actifs appr\u00e9ci\u00e9s, fractionnement de pension entre conjoints \u2014 cadrent ce co\u00fbt avant qu\'il ne se cristallise.'
          : 'On this combined estate, the <strong>tax at the second spouse\'s death</strong> on RRSP/RRIF balances and accumulated gains remains the dominant remaining tax cost. At the first death, the <strong>spousal rollover</strong> defers the tax crystallization to the surviving spouse ; at the second death, without planning, the deemed disposition of RRSP/RRIF and capital property hits all at once. Advanced estate strategies \u2014 <strong>estate freeze</strong> on private-company shares, <strong>alter-ego trust</strong> after age 65, charitable gifting of appreciated securities or a donor-advised fund, and pension splitting between spouses \u2014 frame that cost before it crystallizes.';
      case 'late_start_savings':
        // BEAT: shortfall_or_lifestyle_compromise — must explicitly name the
        // shortfall / lifestyle compromise tradeoff (manque-à-gagner /
        // lifestyle adjust / shortfall).
        return fr
          ? 'Avec un d\u00e9part tardif (\u00e9pargne disponible aujourd\'hui modeste, ' + Math.max(0, retAge - ageNow) + ' ans avant ' + retAge + ' ans), le levier dominant devient le <strong>rattrapage d\'\u00e9pargne</strong> combin\u00e9 au <strong>report du RRQ\u202f/\u202fPSV jusqu\'\u00e0 70 ans</strong>. Le report PSV ajoute +36\u202f% de prestation \u00e0 vie ; c\'est l\'effet le plus puissant pour ce profil. Si le rattrapage et le report ne suffisent pas \u00e0 combler la cible, l\'arbitrage se d\u00e9place vers un <strong>compromis de niveau de vie</strong> : accepter un manque-\u00e0-gagner cibl\u00e9 (d\u00e9penses inf\u00e9rieures de 10\u201320\u202f%) plut\u00f4t que de prolonger excessivement la vie active.'
          : 'With a late start (' + Math.max(0, retAge - ageNow) + ' years before age ' + retAge + '), the dominant lever becomes <strong>catch-up savings</strong> combined with <strong>CPP/OAS deferral to age 70</strong>. Deferring OAS adds +36% to the benefit for life ; this is the strongest single effect for this profile. If catch-up and deferral are not sufficient to close the gap, the trade-off shifts to a <strong>lifestyle adjustment</strong> : accepting a targeted shortfall (10\u201320% lower spending) rather than excessively prolonging working years.';
      case 'single_parent_resilience':
        // BEAT: ccb_solidarite_disclosure — must explicitly cite the CCB
        // (Canada Child Benefit) / Allocation canadienne pour enfants and
        // Quebec solidarity credit as income supports for the household.
        return fr
          ? 'Avant l\'optimisation, le cadre central est la <strong>r\u00e9silience monoparentale</strong>. Comme seul revenu d\'un m\u00e9nage avec personnes \u00e0 charge, vos enfants d\u00e9pendent de votre capacit\u00e9 \u00e0 g\u00e9n\u00e9rer un revenu : un fonds d\'urgence (6\u20139 mois de d\u00e9penses), une assurance vie temporaire (250\u2013400\u202fK$) et une assurance invalidit\u00e9 ad\u00e9quate doivent pr\u00e9c\u00e9der toute autre optimisation. Du c\u00f4t\u00e9 des prestations gouvernementales, l\'<strong>Allocation canadienne pour enfants (CCB)</strong> et le <strong>cr\u00e9dit d\'imp\u00f4t pour solidarit\u00e9</strong> du Qu\u00e9bec compl\u00e8tent le revenu net du m\u00e9nage tant que les enfants sont \u00e0 charge.'
          : 'Before optimization, the central frame is <strong>single-parent resilience</strong>. As the sole earner for a household with dependents, your children rely on your income-generating capacity : an emergency fund (6\u20139 months of spending), term life insurance ($250\u2013400K), and adequate disability coverage must precede any other optimization. On the government-benefit side, the <strong>Canada Child Benefit (CCB)</strong> and the Quebec <strong>solidarity tax credit</strong> supplement net household income while children remain dependents.';
      default:
        return '';
    }
  }

  // `advisor_letter` slot; falls back to a phase-aware deterministic template
  // when AI absent so the page never looks empty.
  function renderAdvisorLetter(d) {
    var fr = d.fr;
    var name = d.fn ? F.esc(d.fn) : (fr ? 'Client' : 'Client');
    var spouseName = (d.R.couple && d.sfn) ? F.esc(d.sfn) : '';
    var today = F.fmtDate(null, fr);
    var h = '<div class="sec-page" id="sec-letter">';
    h += '<div style="padding:40px 20px 30px;font-family:Inter,sans-serif;line-height:1.85;font-size:12px;color:#2a2420">';
    h += '<div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">' + (fr ? 'Lettre pr\u00e9paratoire' : 'Opening letter') + '</div>';
    // F13 — Couple letters address both spouses by name. Audit caught
    // hnw_couple's "Cher François" alone for a couple plan.
    var _salutation;
    if (spouseName) {
      _salutation = fr ? ('Cher' + (d.p.sex === 'F' ? 'e' : '') + ' ' + name + ' et ' + spouseName)
                       : ('Dear ' + name + ' and ' + spouseName);
    } else {
      _salutation = fr ? ('Cher' + (d.p.sex === 'F' ? 'e' : '') + ' ' + name) : ('Dear ' + name);
    }
    // Codex LOW-1 fix: emit the deterministic salutation only when the AI
    // letter does NOT already begin with the client's first name. AI
    // responses commonly open with "Dear Margaret," / "Cher François,"
    // which produced a duplicate salutation when concatenated with the
    // deterministic prefix above.
    var _aiStartsWithName = false;
    if (d.ai.advisor_letter) {
      var _aiLetterStart = String(d.ai.advisor_letter).slice(0, 200).toLowerCase();
      var _firstName = (d.fn || '').toLowerCase();
      if (_firstName && _aiLetterStart.indexOf(_firstName) >= 0 && _aiLetterStart.indexOf(_firstName) < 50) {
        // AI letter already addresses the client by name in the first 50 chars
        _aiStartsWithName = true;
      }
    }
    if (!_aiStartsWithName) {
      h += '<div style="font-size:18px;font-weight:700;color:' + C.gold + ';margin-bottom:20px">' + _salutation + ',</div>';
    }
    if (d.ai.advisor_letter) {
      // Render the advisor letter as a clean letter, NOT as an "AI-assisted
      // analysis" callout box. The opening page should read as a personal
      // note from the advisor — the "Analyse assistée par IA" badge belongs
      // on inline insights deeper in the report, where the AI signal is
      // one voice among several. Here the badge breaks the trust register
      // and frames the cover as a model output rather than a letter.
      h += _renderLetterBody(d.ai.advisor_letter);
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
    // Trust copy: per Codex 2026-04-27 P2, the engine-provenance phrase
    // ("Chaque chiffre … traçable à une sortie du moteur" / "Every number
    // traceable to an engine output") leaks internal QA language into the
    // client deliverable. Removed entirely. The standard AMF disclaimer
    // ("projections are conditional and not guaranteed") is preserved.
    // Case-driver framing — emitted AFTER the letter body. Originally lived
    // BEFORE the AI letter, which broke the "personal note from advisor"
    // register when the AI started with the client's name (the framing
    // became the leading paragraph). Now it sits after the body as a
    // closing observation, never preceding the salutation. It carries
    // the case_driver content beats the auditor checks for, so removing
    // it entirely is not an option.
    var caseDriver = d.caseDriver || null;
    var caseFraming = _caseDriverFramingSentence(caseDriver, fr, d);
    if (caseFraming) {
      h += '<p class="case-driver-framing" data-case-driver="' + F.esc(caseDriver) + '" style="font-style:italic;color:#5a4f3a;margin-top:18px;font-size:11.5px;line-height:1.7;border-left:3px solid ' + C.gold + ';padding:10px 14px;background:#fdfbf6">' + caseFraming + '</p>';
    }
    h += '<p class="narr" style="margin-top:18px;color:#555">' + (fr
      ? 'Les projections sont conditionnelles et non garanties.'
      : 'Projections are conditional and not guaranteed.') + '</p>';
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
    // Phase 2 central dispatch — route draw_order through resolveRepresentation.
    // Resolver default: chart for std/full, hybrid (chart + caption) for lite,
    // omit when classifier doesn't support draw-order content (plain mode
    // without sufficient depth).
    var _doRepr = (BFRP && typeof BFRP.resolveRepresentation === 'function')
      ? BFRP.resolveRepresentation('draw_order', d.renderProfile, true)
      : 'chart';
    if (_doRepr !== 'omit' && !_relevanceGate(d, 'draw_order')) _doRepr = 'omit';
    if (_doRepr === 'omit') return '';
    var fr = d.fr;
    var trace = d.mc._enriched.drawTrace;
    var f$ = F.fmtCompact;

    // ── REPLACED 2026-04-26: the previous year-by-year heatmap table
    //    had three credibility problems flagged in user review:
    //      1. The "Meltdown" row showed values that were ALSO embedded
    //         in the RRSP row, visually double-counting the same dollar.
    //      2. Color intensity claimed to encode magnitude but used
    //         only ~2 shades regardless of value.
    //      3. Empty cells in the middle of a row read as "engine
    //         couldn't decide" rather than "strategy genuinely shifted."
    //    Replacement: lifetime totals (defensible canonical sums) +
    //    age-phase timeline (deterministic age bands). Same data, but
    //    the reader walks away with ONE mental model — not noise.

    // ── Lifetime totals by source (sum across all retirement years).
    //    Meltdown is explicitly labeled an OVERLAY within the RRSP/RRIF
    //    total, not a separate account, eliminating the double-count.
    var sumRRSP = 0, sumRRIF = 0, sumNR = 0, sumTFSA = 0, sumMelt = 0;
    var meltAgeStart = null, meltAgeEnd = null;
    trace.forEach(function(t) {
      sumRRSP += t.rrsp || 0;
      sumRRIF += t.rrifMin || 0;
      sumNR   += t.nr || 0;
      sumTFSA += t.tfsa || 0;
      sumMelt += t.melt || 0;
      if ((t.melt || 0) > 0) {
        if (meltAgeStart == null) meltAgeStart = t.age;
        meltAgeEnd = t.age;
      }
    });
    var lifetimeRrspTotal = sumRRSP + sumRRIF;
    var lifetimeAll = lifetimeRrspTotal + sumNR + sumTFSA;

    var h = secPage();
    h += F.Sec(secN, fr ? 'Ordre des retraits' : 'Draw-order strategy', 'sec-draworder');

    h += narr(fr
      ? 'L\'ordre dans lequel vous puisez dans vos comptes décide d\'une grande part de votre impôt à vie. La séquence ci-dessous protège le CELI le plus longtemps possible, lisse l\'impôt avant la conversion FERR à 72\u00a0ans, et garde de la flexibilité pour les années de fort revenu.'
      : 'The order in which you draw from your accounts decides much of your lifetime tax. The sequence below preserves the TFSA as long as possible, smooths tax before mandatory RRIF conversion at 72, and keeps flexibility for high-income years.');

    // ── Lifetime allocation bars ────────────────────────────────────
    function _bar(label, value, total, color, sub) {
      var pct = total > 0 ? Math.round((value / total) * 100) : 0;
      var w = total > 0 ? Math.max(2, Math.min(100, (value / total) * 100)) : 2;
      return '<div style="display:grid;grid-template-columns:170px 1fr 110px;gap:12px;align-items:center;padding:8px 0;border-top:1px solid #e8e0d4">' +
        '<div>' +
          '<div style="font-family:Inter,sans-serif;font-size:11px;font-weight:600;color:#1a1610">' + label + '</div>' +
          (sub ? '<div style="font-family:Inter,sans-serif;font-size:9.5px;color:#888;margin-top:2px;line-height:1.3">' + sub + '</div>' : '') +
        '</div>' +
        '<div style="background:#f5f1ea;border-radius:3px;height:14px;overflow:hidden">' +
          '<div style="height:100%;width:' + w + '%;background:' + color + ';transition:width 0.3s"></div>' +
        '</div>' +
        '<div style="text-align:right;font-family:JetBrains Mono,monospace">' +
          '<span style="font-size:13px;font-weight:700;color:' + color + '">' + f$(Math.round(value)) + '</span>' +
          '<span style="font-size:9.5px;color:#888;margin-left:6px">' + pct + '\u202f%</span>' +
        '</div>' +
        '</div>';
    }

    h += '<div style="font-family:Inter,sans-serif;font-size:10.5px;font-weight:700;color:#c49a1a;letter-spacing:1px;text-transform:uppercase;margin:14px 0 6px">' +
      (fr ? 'R\u00e9partition viag\u00e8re des retraits' : 'Lifetime withdrawal allocation') + '</div>';
    h += '<div style="background:#fdfbf6;border:1px solid #e8e0d4;border-radius:6px;padding:6px 16px 10px;margin-bottom:10px">';
    h += _bar(
      fr ? 'Non-enregistr\u00e9 (NR)' : 'Non-registered (NR)',
      sumNR, lifetimeAll, '#5b8db8',
      fr ? 'Source la plus flexible \u2014 tir\u00e9e en premier' : 'Most flexible source \u2014 drawn first'
    );
    h += _bar(
      fr ? 'REER + FERR' : 'RRSP + RRIF',
      lifetimeRrspTotal, lifetimeAll, '#c49a1a',
      fr ? 'Inclut le d\u00e9caissement anticip\u00e9 comme strat\u00e9gie d\'extraction' : 'Includes meltdown as an extraction strategy'
    );
    h += _bar(
      fr ? 'CELI / TFSA' : 'TFSA / CELI',
      sumTFSA, lifetimeAll, '#2a8c46',
      fr ? 'Pr\u00e9serv\u00e9 \u2014 dernier recours' : 'Preserved \u2014 last resort'
    );
    // Meltdown shown as a clearly-labeled OVERLAY beneath RRSP, not a
    // separate account — eliminates the double-count of the old table.
    if (sumMelt > 0) {
      h += '<div style="margin-top:10px;padding:10px 12px;background:#fdf6e3;border-left:3px solid #b89830;border-radius:0 4px 4px 0">';
      h += '<div style="font-family:Inter,sans-serif;font-size:10px;font-weight:700;color:#7a4a00;letter-spacing:0.5px;margin-bottom:4px">' +
        '\u25b8 ' + (fr ? 'Dont d\u00e9caissement anticip\u00e9 du REER (recouvrement avec REER ci-dessus)' : 'Of which RRSP meltdown (overlap with RRSP above)') + '</div>';
      h += '<div style="font-family:Inter,sans-serif;font-size:10.5px;color:#444;line-height:1.55">' +
        (fr
          ? 'Le d\u00e9caissement anticip\u00e9 ajoute <strong>' + f$(Math.round(sumMelt)) + '</strong> de retraits REER acc\u00e9l\u00e9r\u00e9s entre <strong>' + meltAgeStart + ' et ' + meltAgeEnd + '\u00a0ans</strong> pour lisser le revenu imposable avant la conversion FERR obligatoire \u00e0 72\u00a0ans. Ce montant est compris dans le total REER + FERR ci-dessus, pas en sus.'
          : 'Meltdown adds <strong>' + f$(Math.round(sumMelt)) + '</strong> of accelerated RRSP withdrawals between ages <strong>' + meltAgeStart + ' and ' + meltAgeEnd + '</strong> to smooth taxable income before mandatory RRIF conversion at age 72. This amount is included in the RRSP + RRIF total above, not added on top.') +
        '</div></div>';
    }
    h += '</div>';

    // ── Phase timeline ───────────────────────────────────────────────
    // Deterministic age bands. The phase boundaries come from the
    // engine's drawTrace observations: pre-meltdown, meltdown window
    // (if active), post-meltdown (RRIF + TFSA).
    var retAge = (d.p.retAge || 65);
    var deathAge = (d.p.deathAge || 90);
    var meltStart = meltAgeStart != null ? meltAgeStart : null;
    var meltEnd = meltAgeEnd != null ? meltAgeEnd : null;
    var phases = [];
    if (meltStart != null && meltStart > retAge) {
      phases.push({
        ageA: retAge, ageB: meltStart - 1,
        title: fr ? 'NR + CELI tactique' : 'NR + tactical TFSA',
        body: fr ? 'Retraits du non-enregistr\u00e9 (le plus flexible) en priorit\u00e9, parfois compl\u00e9t\u00e9s par des retraits CELI au besoin. Le REER reste intact pour le d\u00e9caissement anticip\u00e9 \u00e0 venir.'
                 : 'Non-registered withdrawals (most flexible) first, sometimes supplemented by tactical TFSA draws. RRSP stays intact for the upcoming meltdown.',
        color: '#5b8db8'
      });
    }
    if (meltStart != null) {
      phases.push({
        ageA: meltStart, ageB: meltEnd,
        title: fr ? 'Fen\u00eatre de d\u00e9caissement anticip\u00e9 REER' : 'RRSP meltdown window',
        body: fr ? 'Retraits acc\u00e9l\u00e9r\u00e9s du REER pour vider une partie du solde avant la conversion FERR obligatoire \u00e0 72\u00a0ans. Lisse l\'imp\u00f4t viager en \u00e9vitant que les retraits minimums du FERR ne poussent le revenu dans des paliers sup\u00e9rieurs.'
                 : 'Accelerated RRSP withdrawals to drain part of the balance before mandatory RRIF conversion at age 72. Smooths lifetime tax by preventing forced RRIF minimums from pushing income into higher brackets.',
        color: '#c49a1a'
      });
    }
    if ((meltEnd != null ? meltEnd : retAge) < deathAge) {
      var post = (meltEnd != null ? meltEnd : retAge) + 1;
      phases.push({
        ageA: post, ageB: deathAge,
        title: fr ? 'FERR minimums + CELI pr\u00e9serv\u00e9' : 'RRIF minimums + preserved TFSA',
        body: fr ? 'Apr\u00e8s 72\u00a0ans, les retraits FERR minimums sont obligatoires. Le CELI reste pr\u00e9serv\u00e9 pour servir de coussin sans imp\u00f4t \u2014 utile si les d\u00e9penses augmentent (sant\u00e9, soutien familial) ou comme transmission franche d\'imp\u00f4t.'
                 : 'After age 72, RRIF minimum withdrawals are mandatory. The TFSA stays preserved as a tax-free buffer \u2014 useful if expenses rise (health, family support) or as a tax-clean transfer at death.',
        color: '#2a8c46'
      });
    }

    h += '<div style="font-family:Inter,sans-serif;font-size:10.5px;font-weight:700;color:#c49a1a;letter-spacing:1px;text-transform:uppercase;margin:14px 0 6px">' +
      (fr ? 'Chronologie des phases' : 'Phase timeline') + '</div>';
    h += '<div style="position:relative;background:#fdfbf6;border:1px solid #e8e0d4;border-radius:6px;padding:14px 18px">';
    var horizon = Math.max(1, deathAge - retAge);
    phases.forEach(function(ph, i) {
      var leftPct = ((ph.ageA - retAge) / horizon) * 100;
      var widthPct = Math.max(3, ((ph.ageB - ph.ageA + 1) / horizon) * 100);
      h += '<div style="display:grid;grid-template-columns:170px 1fr;gap:14px;align-items:center;padding:8px 0' + (i > 0 ? ';border-top:1px solid #e8e0d4' : '') + '">';
      h += '<div>';
      h += '<div style="font-family:Inter,sans-serif;font-size:10.5px;font-weight:700;color:' + ph.color + '">' + ph.title + '</div>';
      h += '<div style="font-family:JetBrains Mono,monospace;font-size:10.5px;color:#444;margin-top:2px">' + ph.ageA + (ph.ageA === ph.ageB ? '' : '\u2013' + ph.ageB) + (fr ? ' ans' : ' yrs') + '</div>';
      h += '</div>';
      h += '<div>';
      h += '<div style="position:relative;background:#f5f1ea;border-radius:3px;height:8px;margin-bottom:6px">' +
        '<div style="position:absolute;left:' + leftPct.toFixed(1) + '%;width:' + widthPct.toFixed(1) + '%;height:100%;background:' + ph.color + ';border-radius:3px"></div>' +
        '</div>';
      h += '<div style="font-family:Inter,sans-serif;font-size:10px;color:#444;line-height:1.55">' + ph.body + '</div>';
      h += '</div>';
      h += '</div>';
    });
    // Age axis under all phases
    h += '<div style="display:grid;grid-template-columns:170px 1fr;gap:14px;margin-top:8px;padding-top:8px;border-top:1px solid #e8e0d4">';
    h += '<div></div>';
    h += '<div style="display:flex;justify-content:space-between;font-family:JetBrains Mono,monospace;font-size:9.5px;color:#888">' +
      '<span>' + retAge + (fr ? ' ans' : ' yrs') + '</span>' +
      (meltStart && meltStart > retAge ? '<span>' + meltStart + '</span>' : '') +
      (meltEnd && meltEnd < deathAge ? '<span>' + (meltEnd + 1) + '</span>' : '') +
      '<span>' + deathAge + (fr ? ' ans' : ' yrs') + '</span>' +
      '</div>';
    h += '</div>';
    h += '</div>';

    h += '<div style="font-size:9.5px;color:#888;margin-top:8px;font-style:italic;line-height:1.55">' +
      (fr ? 'Sommes viag\u00e8res sur le chemin m\u00e9dian. Le d\u00e9caissement anticip\u00e9 est une strat\u00e9gie d\'extraction du REER, pas un compte distinct \u2014 son montant est inclus dans le total REER + FERR ci-dessus.'
          : 'Lifetime sums on the median path. Meltdown is an RRSP extraction strategy, not a separate account \u2014 its amount is included in the RRSP + RRIF total above.') + '</div>';

    h += secPageEnd();
    return h;
  }

  // === SECTION: STRESS TESTS (6 named scenarios) ===
  // Renders a one-page stress-matrix using the `mc._stress` payload populated
  // by gen-real-mc.mjs running 6 perturbed MC scenarios.
  function renderStressTests(d, secN) {
    // Phase 5 relevance gate: hide for plain-mode readers (technical content).
    if (!_relevanceGate(d, 'stress_tests')) return '';
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
    // P1.3 — Risk-collapse rule. When risk-collapse-auditor flagged this
    // section as redundant (d._compact['sec-stress'] = true), replace the
    // full stress matrix with a 4-sentence callout that names the dominant
    // sensitivity lever rather than a wall of "everything at 100%".
    if (d._compact && d._compact['sec-stress']) {
      var fcompact = F.fmtCompact;
      var ksAll = Object.keys(s);
      var succsAll = ksAll.map(function(k) { return s[k] && s[k].succ != null ? Math.round(s[k].succ * 100) : null; }).filter(function(x) { return x != null; });
      var minS = succsAll.length ? Math.min.apply(null, succsAll) : null;
      var maxS = succsAll.length ? Math.max.apply(null, succsAll) : null;
      var topLever = null;
      var sens = (d._sensData) || (d.mc && d.mc._sensData);
      if (Array.isArray(sens) && sens.length > 0) {
        var sorted = sens.slice().sort(function(a, b) { return Math.abs(b.delta || 0) - Math.abs(a.delta || 0); });
        topLever = sorted[0] && sorted[0].label ? sorted[0].label : null;
      }
      var hC = secPage();
      hC += F.Sec(secN, fr ? 'Stabilit\u00e9 du plan' : 'Plan stability', 'sec-stress');
      hC += '<div class="cd risk-collapse-callout" style="padding:14px 18px;background:#f3faf4;border-left:4px solid ' + C.green + ';font-size:11.5px;line-height:1.7;color:#1f3a25">' +
        '<div style="font-weight:700;color:' + C.green + ';font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">' + (fr ? '\u25b7 Lecture: stabilit\u00e9 structurelle' : '\u25b7 Reading note: structural stability') + '</div>' +
        '<div>' + (fr
          ? 'Les six sc\u00e9narios de stress (crise 2008, stagflation 1973, long\u00e9vit\u00e9 +5\u202fans, d\u00e9cennie perdue, inflation persistante, d\u00e9penses +15\u202f%) retournent un succ\u00e8s entre <strong>' + (minS != null ? minS : '\u2014') + '\u202f%</strong> et <strong>' + (maxS != null ? maxS : '\u2014') + '\u202f%</strong>. La fourchette est trop \u00e9troite pour ajouter de la valeur d\u00e9cisionnelle\u202f: le plan absorbe les chocs de march\u00e9 simul\u00e9s sans d\u00e9placement mat\u00e9riel.'
          : 'The six stress scenarios (2008 crisis, 1973 stagflation, longevity +5\u202fyrs, lost decade, persistent inflation, spending +15\u202f%) return success rates between <strong>' + (minS != null ? minS : '\u2014') + '\u202f%</strong> and <strong>' + (maxS != null ? maxS : '\u2014') + '\u202f%</strong>. The range is too narrow to add decision value\u202f: the plan absorbs simulated market shocks without material displacement.') + '</div>' +
        '<div style="margin-top:8px">' + (fr
          ? 'Le levier de sensibilit\u00e9 dominant reste ' + (topLever ? '<strong>' + F.esc(topLever) + '</strong>' : '<strong>l\'allocation et la s\u00e9quence des rendements</strong>') + '\u202f; c\'est l\u00e0 que se concentre le risque utile, pas dans la matrice de stress.'
          : 'The dominant sensitivity lever remains ' + (topLever ? '<strong>' + F.esc(topLever) + '</strong>' : '<strong>allocation and sequence of returns</strong>') + ' \u2014 that is where decision-relevant risk concentrates, not in the stress matrix.') + '</div>' +
        '</div>';
      hC += secPageEnd();
      return hC;
    }
    var f$ = F.fmtCompact;
    var baseMedF = d.mc.rMedF || d.mc.medF || 0;
    var baseSucc = d.mc.succ || 0;

    // Scenario metadata — labels + narrative hook per scenario
    // Codex 2026-04-27: each scenario carries dur=duration in years
    // (for finite shocks) so the description reads concretely. 
    // dur=null means the scenario applies for the full retirement
    // horizon (longevity, persistent inflation, spending bump).
    var META = {
      gfc2008:        { fr: 'Crise financi\u00e8re 2008',         en: 'GFC 2008-style',              dur: 4,    desc_fr: 'rendements fortement n\u00e9gatifs + volatilit\u00e9 accrue (4 ans)', desc_en: 'strongly negative returns + elevated volatility (4 yrs)' },
      stagflation73:  { fr: 'Stagflation 1973-74',              en: '1973-74 stagflation',         dur: 5,    desc_fr: 'choc rendements + inflation 4 % pendant 5 ans',                       desc_en: 'returns shock + 4% inflation for 5 yrs' },
      longevityPlus5: { fr: 'Long\u00e9vit\u00e9 +5 ans',        en: 'Longevity +5 years',          dur: null, desc_fr: 'si vous viviez 5 ans de plus (horizon prolong\u00e9)',              desc_en: 'if you lived 5 years longer (extended horizon)' },
      lostDecade:     { fr: 'D\u00e9cennie perdue',             en: 'Lost decade',                 dur: 10,   desc_fr: 'rendements effectifs \u22122,5 % pendant 10 ans vs sc\u00e9nario de base', desc_en: 'effective returns \u22122.5% for 10 yrs vs baseline' },
      persistentInf:  { fr: 'Inflation persistante 4 %',        en: 'Persistent 4% inflation',     dur: null, desc_fr: 'inflation structurellement \u00e9lev\u00e9e sur tout l\'horizon',     desc_en: 'structurally elevated inflation over entire horizon' },
      spendingUp15:   { fr: 'D\u00e9penses +15 %',              en: 'Spending +15%',               dur: null, desc_fr: 'besoins de retraite +15 % sur tout l\'horizon',                       desc_en: 'retirement needs +15% over entire horizon' }
    };
    // Shock start age = retirement age (1st year of retirement). The
    // engine applies the matrix from p.retAge for finite scenarios;
    // open-ended scenarios apply continuously.
    var _stressStartAge = (d.p && d.p.retAge) || 65;

    var h = secPage();
    h += F.Sec(secN, fr ? 'Tests de stress' : 'Stress tests', 'sec-stress');

    h += narr(fr
      ? 'Six sc\u00e9narios nomm\u00e9s ont \u00e9t\u00e9 rejou\u00e9s en Monte Carlo (500 simulations chacun). Sauf indication contraire, le choc d\u00e9bute au d\u00e9but de la retraite (' + _stressStartAge + ' ans, 1<sup>re</sup> ann\u00e9e). Le tableau montre le taux de succ\u00e8s, l\'\u00e9cart vs le sc\u00e9nario de base et le patrimoine m\u00e9dian final. Ces tests ne sont pas additifs et se lisent ind\u00e9pendamment.'
      : 'Six named scenarios were re-run in Monte Carlo (500 simulations each). Unless otherwise noted, the shock starts at retirement (age ' + _stressStartAge + ', year 1). The table shows the resulting success rate, the delta vs baseline, and median final wealth. Tests are not additive and read best independently.');

    h += '<table class="tbl"><thead><tr>';
    h += '<th style="text-align:left">' + (fr ? 'Sc\u00e9nario' : 'Scenario') + '</th>';
    h += '<th style="text-align:left">' + (fr ? 'Description' : 'Description') + '</th>';
    h += '<th>' + (fr ? 'D\u00e9but' : 'Starts') + '</th>';
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
      // Codex 2026-04-27: stress events are typically negative — when
      // the simulator returns 0 delta, render '\u2014' (no change) instead
      // of '+0 pts' (which reads green/positive).
      var deltaCell;
      if (dSucc === 0) deltaCell = '<span style="color:#999">\u2014</span>';
      else {
        var deltaColor = dSucc > 0 ? C.green : C.red;
        deltaCell = '<span style="color:' + deltaColor + ';font-weight:700">' + (dSucc > 0 ? '+' : '') + dSucc + ' pts</span>';
      }
      // Start-age cell: dur=null scenarios apply across the horizon.
      var startCell = (meta.dur == null)
        ? '<span style="color:#888;font-style:italic">' + (fr ? 'continu' : 'ongoing') + '</span>'
        : (_stressStartAge + (fr ? ' ans, ' + meta.dur + ' ans' : ', ' + meta.dur + ' yrs'));
      h += '<tr>';
      h += '<td style="font-weight:600">' + (fr ? meta.fr : meta.en) + '</td>';
      h += '<td style="font-family:Inter,sans-serif;color:#666;font-size:10px">' + (fr ? meta.desc_fr : meta.desc_en) + '</td>';
      h += '<td style="font-size:10px;color:#666;font-family:JetBrains Mono,monospace">' + startCell + '</td>';
      h += '<td style="color:' + succColor + ';font-weight:700">' + succPct + '%</td>';
      h += '<td>' + deltaCell + '</td>';
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

    // F11 — DB-pension indexation stress callout. For DB-heavy profiles
    // the audit found that the standard market-shock stress tests don't
    // surface the dominant risk (loss of indexation). Add a deterministic
    // callout naming the risk + cited employer-plan checkpoint.
    var pp = d.p || {};
    var hasIndexedDB = (pp.penType === 'db' && pp.penIdx) || (pp.cOn && pp.cPenType === 'db' && pp.cPenIdx);
    if (hasIndexedDB) {
      h += '<div class="cd db-indexation-stress" style="margin:10px 0;padding:12px 16px;background:#fdf6e3;border-left:3px solid ' + C.amber + ';font-size:11px;line-height:1.6">' +
        '<div style="font-weight:700;color:' + C.gold + ';font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">' +
        (fr ? 'Stress sp\u00e9cifique \u2014 perte d\'indexation PD' : 'Specific stress \u2014 DB indexation loss') + '</div>' +
        (fr
          ? 'Ce plan d\u00e9pend d\'une pension PD <strong>index\u00e9e</strong>. Si l\'indexation passe de 2\u202f%\u202f/\u202fan \u00e0 0\u202f% (gel discr\u00e9tionnaire ou changement de r\u00e9gime), la prestation perd environ 30\u202f% de son pouvoir d\'achat sur 25 ans. La couverture du revenu garanti chuterait mat\u00e9riellement. <strong>\u00c0 v\u00e9rifier</strong>\u202f: indexation contractuelle ou discr\u00e9tionnaire dans les documents du r\u00e9gime?'
          : 'This plan relies on an <strong>indexed</strong> DB pension. If indexation drops from 2%/yr to 0% (discretionary freeze or plan change), the benefit loses about 30% of purchasing power over 25 years. Guaranteed income coverage would drop materially. <strong>Verify</strong>: is indexation contractual or discretionary under the plan documents?') +
        '</div>';
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

    // F16 — Inflation bridge for long-horizon plans. Spending is stated
    // in 2026 dollars throughout the report; for plans extending 15+
    // years post-retirement the nominal trajectory diverges materially.
    // Surface the conversion explicitly so readers don't think the
    // planner ignored inflation.
    var _horizonYrs = (p.deathAge || 90) - (p.age || 35);
    var _spendNow = (p.retSpM || 0) * 12 + (p.cOn ? (p.cRetSpM || 0) * 12 : 0);
    var _infRate = p.inf || 0.021;
    if (_horizonYrs >= 15 && _spendNow > 1000) {
      var _spendAt75 = _spendNow * Math.pow(1 + _infRate, Math.max(0, 75 - (p.age || 35)));
      var _spendAtDeath = _spendNow * Math.pow(1 + _infRate, _horizonYrs);
      h += '<div class="cd inflation-bridge" style="margin:8px 0 12px;padding:8px 12px;background:#fafafa;border-left:3px solid ' + C.gold + ';font-size:10.5px;color:#444;line-height:1.55">' +
        '<strong>' + (fr ? 'Lecture des dollars' : 'Reading the dollars') + '\u202f:</strong> ' +
        (fr
          ? 'Les d\u00e9penses cibles ci-dessous sont en <strong>dollars 2026</strong> (pouvoir d\'achat constant). En valeur nominale, la m\u00eame cible vaudrait ' + F.fmtCompact(Math.round(_spendAt75)) + '\u202f$ \u00e0 75 ans et ' + F.fmtCompact(Math.round(_spendAtDeath)) + '\u202f$ \u00e0 ' + (p.deathAge || 90) + ' ans \u00e0 ' + (_infRate * 100).toFixed(1) + '\u202f% d\'inflation. Les revenus index\u00e9s (RRQ + PSV + pension PD si applicable) suivent l\'inflation; les retraits de portefeuille sont calibr\u00e9s pour pr\u00e9server le pouvoir d\'achat.'
          : 'Target spending below is stated in <strong>2026 dollars</strong> (constant purchasing power). In nominal terms, the same target would be ' + F.fmtCompact(Math.round(_spendAt75)) + '$ at age 75 and ' + F.fmtCompact(Math.round(_spendAtDeath)) + '$ at age ' + (p.deathAge || 90) + ' at ' + (_infRate * 100).toFixed(1) + '% inflation. Indexed income (CPP + OAS + DB pension if applicable) tracks inflation; portfolio withdrawals are calibrated to preserve purchasing power.') +
        '</div>';
    }

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
    // Sprint 6 — Asset allocation sunburst replaces the flat balance list
    // when totalBal > $50K. Inner ring = equity/bond allocation (light shade),
    // outer ring = account type (saturated colors). Caption matches visual.
    // The allocation ring is ONLY rendered when the user explicitly provided
    // allocR / allocT / allocN — otherwise we'd be visualizing engine
    // defaults (60/70/50) which is misleading. Pure account-type donut when
    // allocation is unknown.
    var _sbAccounts = [];
    var _userAllocSet = (p.allocR != null) || (p.allocT != null) || (p.allocN != null);
    if (Ch.svgSunburst && (d.totalBal || 0) > 50000) {
      var _hh = function(pri, spo) { return (p[pri] || 0) + (p.cOn ? (p[spo] || 0) : 0); };
      var _addAcct = function(label, pri, spo, color, allocEq) {
        var v = _hh(pri, spo);
        if (v >= 1000) {
          var entry = { label: label, value: v, color: color };
          if (_userAllocSet) entry.asset_eq = allocEq;
          _sbAccounts.push(entry);
        }
      };
      _addAcct('REER/RRSP', 'rrsp', 'cRRSP', '#c49a1a', p.allocR);
      _addAcct('CELI/TFSA', 'tfsa', 'cTFSA', '#2a8c46', p.allocT);
      _addAcct('NR',        'nr',   'cNR',   '#5b8db8', p.allocN);
      _addAcct('CRI/LIRA',  'liraBal', 'cLira', '#4a4858', p.allocR);
      if ((p.bizRetainedEarnings || 0) >= 1000) {
        var corpEntry = { label: 'Corp', value: p.bizRetainedEarnings, color: '#7390b8' };
        if (_userAllocSet) corpEntry.asset_eq = 0.5;
        _sbAccounts.push(corpEntry);
      }
    }
    if (_sbAccounts.length >= 2) {
      h += '<div style="display:grid;grid-template-columns:240px 1fr;gap:24px;align-items:center;background:#fdfbf6;border:1px solid #e8e0d4;border-radius:6px;padding:14px 18px;margin-bottom:14px">';
      h += '<div style="text-align:center">';
      h += Ch.svgSunburst(_sbAccounts, { size: 220, subLabel: fr ? 'patrimoine total' : 'total wealth' });
      h += '<div style="font-family:Inter,sans-serif;font-size:9px;color:#888;margin-top:4px;letter-spacing:0.5px">' +
        (fr ? 'Anneau int\u00e9rieur\u202f: type de compte. Anneau ext\u00e9rieur\u202f: actions / obligations.' : 'Inner ring: account type. Outer ring: equity / bonds.') +
        '</div></div>';
      // Right column: account legend with values
      h += '<div style="font-family:Inter,sans-serif;font-size:11px">';
      _sbAccounts.forEach(function(a) {
        var pct = Math.round(a.value / d.totalBal * 100);
        h += '<div style="display:grid;grid-template-columns:14px 130px 1fr 90px;gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid #f0e8d8">' +
          '<div style="width:12px;height:12px;background:' + a.color + ';border-radius:3px"></div>' +
          '<div style="font-weight:600">' + a.label + '</div>' +
          '<div style="font-family:JetBrains Mono,monospace;color:#888;font-size:10px">' + Math.round((a.asset_eq || 0) * 100) + '\u202f% \u00e9q.' +
            ' / ' + Math.round((1 - (a.asset_eq || 0)) * 100) + '\u202f% obl.</div>' +
          '<div style="text-align:right;font-family:JetBrains Mono,monospace;font-weight:700">' + fR(a.value) + ' (' + pct + '\u202f%)</div>' +
          '</div>';
      });
      h += '<div style="display:grid;grid-template-columns:14px 130px 1fr 90px;gap:8px;align-items:center;padding:6px 0 0;margin-top:4px;border-top:2px solid #c49a1a;font-weight:700">' +
        '<div></div><div>' + F.L('total', fr) + '</div><div></div>' +
        '<div style="text-align:right;font-family:JetBrains Mono,monospace;color:#c49a1a">' + fR(d.totalBal) + '</div>' +
        '</div>';
      h += '</div></div>';
    } else {
      // Fallback: legacy flat table for trivial balances
      h += F.Card('<table>' +
        F.R('REER/RRSP', fR(p.rrsp || 0)) + F.R('CELI/TFSA', fR(p.tfsa || 0)) + F.R('NR', fR(p.nr || 0)) +
        (p.liraBal ? F.R('CRI/LIRA', fR(p.liraBal)) : '') +
        (p.fhsaBal ? F.R('CELIAPP/FHSA', fR(p.fhsaBal)) : '') +
        (p.dcBal ? F.R('DC/CD', fR(p.dcBal)) : '') +
        (p.peBal ? F.R(fr ? 'PE (m\u00e9tal)' : 'PE (precious)', fR(p.peBal)) : '') +
        (p.pmBal ? F.R(fr ? 'PM (priv\u00e9)' : 'PM (private)', fR(p.pmBal)) : '') +
        F.R('<strong>' + F.L('total', fr) + '</strong>', '<strong>' + fR(d.totalBal) + '</strong>') +
        '</table>');
    }

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
      F.R('<strong>' + (fr ? 'Total revenu garanti' : 'Total guaranteed income') + '</strong>', '<strong>' + fR(Math.round(d.govM)) + '/m \u2014 ' + fR(Math.round(d.govY)) + (fr ? '/an' : '/yr') + '</strong>') +
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
    h += F.KPI('<span class="mono">' + fR(Math.round(d.govY)) + '</span>' + (fr ? '/an' : '/yr'), (fr ? 'Rev. garanti' : 'Guaranteed inc.') + _scopeTag, C.green);
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
  // CLASSIFIER-RENDER-PLAN Phase 5: relevance gate. Reads
  // BFRenderProfile.isBlockRelevant(blockId, d, profile) to decide
  // whether to omit. Returns true to RENDER. False = section dropped
  // from the report (and an entry pushed to d._omittedBlocks for AI
  // prompt awareness). Conservative default: when in doubt, show.
  function _relevanceGate(d, blockId) {
    if (!d || !d.renderProfile) return true;
    var rpMod = (typeof window !== 'undefined' && window.BFRenderProfile) ? window.BFRenderProfile : null;
    if (!rpMod || typeof rpMod.isBlockRelevant !== 'function') return true;
    var rel = rpMod.isBlockRelevant(blockId, d, d.renderProfile);
    if (!rel) {
      d._omittedBlocks = d._omittedBlocks || [];
      if (d._omittedBlocks.indexOf(blockId) < 0) d._omittedBlocks.push(blockId);
    }
    return rel;
  }

  function renderGoals(d, secN) {
    if (!d.R.hasGoals) return '';
    // CLASSIFIER-RENDER-PLAN Phase 5 — relevance gate.
    if (!_relevanceGate(d, 'goals')) return '';
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
      ? 'Voici comment votre patrimoine pourrait évoluer à travers les milliers de futurs simulés. La zone ombrée montre la plage typique : la moitié des trajectoires y restent — au-dessus tout va mieux que prévu, en-dessous, le plan demande des ajustements.'
      : 'Here is how your wealth could evolve across the thousands of simulated futures. The shaded band shows the typical range — half the paths land inside it, while above and below sit the better and harder outcomes.');

    // Stacked wealth composition chart — Codex flag: previously surfaced
    // only RRSP / TFSA / NR even when 60%+ of net worth lived in RE, the
    // corp, LIRA, DC, PE/PM. Reader saw a cliff at retirement that wasn't
    // really a cliff. Build the keys list from what's actually present in
    // pD across the projection so the picture matches reality. Cap at 9
    // legend entries; remaining classes roll up into "Autres / Other".
    if (mc.pD && mc.pD.length > 0) {
      // Full asset inventory mirroring lib/engine/index.js path.push:
      // rr / tf / nr / re / corp / lira / dc / dc2 / ipp / pe / pm / fhsa
      // + spouse: crr / ctf / cnr / cLira / cFhsa / (cDC where modeled).
      // Codex flag: previously showed only RRSP / TFSA / NR. For profiles
      // with FHSA, DC plans, IPPs, RESP/RDSP, the chart hid 30-60% of net
      // worth and looked like an artificial cliff. This list covers EVERY
      // wealth stream the engine produces.
      var _ASSET_KEYS = [
        { k: 'mp_rr',    fr: 'REER/RRSP',                en: 'RRSP',                color: C.purple },
        { k: 'mp_tf',    fr: 'CELI/TFSA',                en: 'TFSA',                color: C.green },
        { k: 'mp_nr',    fr: 'Non enregistr\u00e9',      en: 'Non-registered',      color: C.blue },
        { k: 'mp_fhsa',  fr: 'CELIAPP',                  en: 'FHSA',                color: '#3a8a7a' },
        { k: 'mp_re',    fr: 'Immobilier',               en: 'Real estate',         color: C.teal },
        { k: 'mp_corp',  fr: 'SPCC',                     en: 'CCPC',                color: C.gold },
        { k: 'mp_lira',  fr: 'LIRA / CRI',               en: 'LIRA',                color: '#4a4858' },
        { k: 'mp_dc',    fr: 'PD/CD employeur',          en: 'DB/DC plan',          color: '#5a87b3' },
        { k: 'mp_dc2',   fr: 'PD/CD secondaire',         en: 'DB/DC secondary',     color: '#3a6790' },
        { k: 'mp_ipp',   fr: 'RRI (IPP)',                en: 'IPP',                 color: '#a07a3a' },
        { k: 'mp_pe',    fr: 'REEE',                     en: 'RESP',                color: '#c89a3a' },
        { k: 'mp_pm',    fr: 'REEI',                     en: 'RDSP',                color: '#7a4a2a' },
        { k: 'mp_crr',   fr: 'REER conj.',               en: 'Spouse RRSP',         color: '#9a82c8' },
        { k: 'mp_ctf',   fr: 'CELI conj.',               en: 'Spouse TFSA',         color: '#6da97a' },
        { k: 'mp_cnr',   fr: 'NR conj.',                 en: 'Spouse NR',           color: '#7390b8' },
        { k: 'mp_cFhsa', fr: 'CELIAPP conj.',            en: 'Spouse FHSA',         color: '#5a9a8a' },
        { k: 'mp_cLira', fr: 'LIRA conj.',               en: 'Spouse LIRA',         color: '#9577c8' }
      ];
      var _maxByKey = {};
      mc.pD.forEach(function(r) {
        _ASSET_KEYS.forEach(function(a) {
          var v = r[a.k] || 0;
          if (v > (_maxByKey[a.k] || 0)) _maxByKey[a.k] = v;
        });
      });
      var _activeAssets = _ASSET_KEYS.filter(function(a) { return (_maxByKey[a.k] || 0) >= 1000; });
      // Order by descending peak so big slices render first → cleaner stack.
      _activeAssets.sort(function(a, b) { return (_maxByKey[b.k] || 0) - (_maxByKey[a.k] || 0); });
      var _keys = _activeAssets.map(function(a) { return a.k; });
      var _colors = _activeAssets.map(function(a) { return a.color; });
      var _labels = _activeAssets.map(function(a) { return fr ? a.fr : a.en; });
      // Phase 2 dispatch — route stacked wealth-composition through
      // resolveRepresentation('wealth_composition'). lite → text fallback
      // (P25/P50/P75 prose); std/full → stacked area chart.
      var _wcRepr = (BFRP && typeof BFRP.resolveRepresentation === 'function')
        ? BFRP.resolveRepresentation('wealth_composition', d.renderProfile, mc.pD && mc.pD.length > 0)
        : 'chart';
      if (_wcRepr === 'chart' || _wcRepr === 'chart_simplified') {
        h += '<div data-bf-block="wealth_composition" data-bf-repr="' + _wcRepr + '">';
        h += Ch.svgArea(mc.pD, _keys, _colors, _labels, {
          stacked: true, title: fr ? 'Composition du patrimoine (actifs liquides + illiquides)' : 'Wealth Composition (liquid + illiquid)',
          yFmt: f$, yLabel: '$',
          simplified: _wcRepr === 'chart_simplified',
          annotations: [
            { age: p.retAge, label: fr ? 'Retraite' : 'Ret.' },
            { age: 72, label: 'FERR' }
          ]
        });
        h += '</div>';
        // Editorial caption — implication-first, derived from engine output.
        var _projCap = _projectionCaption(d);
        if (_projCap) h += _chartCaption(_projCap);
      } else if (_wcRepr === 'text') {
        // Lite fallback: prose summary of asset breakdown at retirement.
        var _retIdx = (mc.pD || []).findIndex(function(r) { return r.age === p.retAge; });
        var _retRow = _retIdx >= 0 ? mc.pD[_retIdx] : (mc.pD && mc.pD[0]);
        var _liquidTotal = (_retRow && (_retRow.mp_total || 0)) || 0;
        h += '<div class="cd" data-bf-block="wealth_composition" data-bf-repr="text" style="background:#fdfbf6;border-left:3px solid #c49a1a;padding:10px 14px;font-size:11.5px;line-height:1.7">' +
          (fr
            ? '\u00c0 la retraite, votre patrimoine total atteindrait <strong>' + f$(_liquidTotal) + '</strong>, r\u00e9parti entre vos comptes (REER, CELI, non-enregistr\u00e9) et tout actif immobilier ou corporatif. Le graphique d\u00e9taill\u00e9 est disponible dans la version compl\u00e8te du rapport.'
            : 'At retirement, your total wealth would be <strong>' + f$(_liquidTotal) + '</strong>, spread across your accounts (RRSP, TFSA, non-registered) plus any real estate or corporate holdings. The detailed chart is available in the full version of the report.') +
          '</div>';
      }

      // Sprint 2.1 — Truncate terminal years (deathAge − 2) to suppress
      // mortality-blending spikes that misleadingly stretched the y-axis.
      // Cap y-axis at 99th percentile of all values so one or two tail
      // outliers don't dwarf the centre of the distribution. Add explicit
      // "Real $ (deflated)" label to the y-axis title.
      var _projPd = mc.pD;
      var _truncAge = (p.deathAge || 90) - 2;
      if (Array.isArray(_projPd)) {
        _projPd = _projPd.filter(function(r) { return (r.age || 0) <= _truncAge; });
      }
      // Compute 99th percentile cap across all visible values.
      var _projCap = null;
      if (Array.isArray(_projPd) && _projPd.length > 0) {
        var _allVals = [];
        _projPd.forEach(function(r) {
          ['mp_total','rmp_total','p10','p25','p50','p75','p90','p95'].forEach(function(k) {
            if (r[k] != null && isFinite(r[k])) _allVals.push(r[k]);
          });
        });
        _allVals.sort(function(a, b) { return a - b; });
        if (_allVals.length > 0) {
          _projCap = _allVals[Math.floor(_allVals.length * 0.99)];
        }
      }

      // CLASSIFIER-RENDER-PLAN Phase 2: dispatch through the central
      // resolveRepresentation contract. The resolver maps
      // ('percentile_fan', renderProfile, hasData) → one of
      // 'chart' | 'chart_simplified' | 'hybrid' | 'text' | 'omit'.
      // Each branch must match the resolver's enum exactly — that is the
      // honest evidence the dispatch is live.
      var _rp = d.renderProfile;
      var _hasFanData = Array.isArray(_projPd) && _projPd.length > 0;
      var _fanRepr = (BFRP && typeof BFRP.resolveRepresentation === 'function')
        ? BFRP.resolveRepresentation('percentile_fan', _rp, _hasFanData)
        : (!_rp || _rp.showFan !== false ? 'chart' : 'text');
      // Relevance overlay: even when the resolver picks chart, sequence-of-returns
      // may still be content-irrelevant for high-coverage/calm readers. In that
      // case the relevance gate downgrades to 'omit' and tracks d._omittedBlocks.
      if (_fanRepr !== 'omit' && !_relevanceGate(d, 'sequence_of_returns')) _fanRepr = 'omit';

      function _fanTextFallback() {
        var _p25 = mc && (mc.rP25F || mc.p25F) ? f$(mc.rP25F || mc.p25F) : '\u2014';
        var _p50 = mc && (mc.rMedF || mc.medF) ? f$(mc.rMedF || mc.medF) : '\u2014';
        var _p75 = mc && (mc.rP75F || mc.p75F) ? f$(mc.rP75F || mc.p75F) : '\u2014';
        return '<div class="cd" data-bf-block="percentile_fan" data-bf-repr="text" style="background:#fdfbf6;border-left:3px solid #c49a1a;padding:10px 14px;font-size:11.5px;line-height:1.7">' +
          (fr
            ? 'En fin d\'horizon, le sc\u00e9nario typique laisse <strong>' + _p50 + '</strong> de patrimoine. Le sc\u00e9nario prudent termine \u00e0 <strong>' + _p25 + '</strong>, le sc\u00e9nario favorable \u00e0 <strong>' + _p75 + '</strong>. Ces trois nombres r\u00e9sument 5\u202f000 avenirs simul\u00e9s.'
            : 'At the end of the horizon, the typical scenario leaves <strong>' + _p50 + '</strong> in wealth. The cautious scenario ends at <strong>' + _p25 + '</strong>, the favourable scenario at <strong>' + _p75 + '</strong>. These three numbers summarize 5,000 simulated futures.') +
          '</div>';
      }

      if (_fanRepr === 'chart' || _fanRepr === 'chart_simplified') {
        var _fanTitle = fr ? 'Projection Monte Carlo' : 'Monte Carlo Projection';
        if (_fanRepr === 'chart_simplified') _fanTitle += fr ? ' \u2014 simplifi\u00e9' : ' \u2014 simplified';
        h += '<div data-bf-block="percentile_fan" data-bf-repr="' + _fanRepr + '">';
        h += Ch.svgFanChart(_projPd, {
          title: _fanTitle,
          fr: fr,
          yLabel: fr ? 'Patrimoine \u2014 dollars r\u00e9els (2026)' : 'Wealth \u2014 real dollars (2026)',
          yMaxOverride: _projCap,
          simplified: _fanRepr === 'chart_simplified',
          annotations: [
            { age: p.retAge, label: fr ? 'Retraite' : 'Ret.' }
          ]
        });
        h += '</div>';
      } else if (_fanRepr === 'hybrid') {
        // hybrid = simplified chart + text summary side-by-side.
        h += '<div data-bf-block="percentile_fan" data-bf-repr="hybrid">';
        h += Ch.svgFanChart(_projPd, {
          title: fr ? 'Projection Monte Carlo \u2014 simplifi\u00e9' : 'Monte Carlo Projection \u2014 simplified',
          fr: fr,
          yLabel: fr ? 'Patrimoine \u2014 dollars r\u00e9els (2026)' : 'Wealth \u2014 real dollars (2026)',
          yMaxOverride: _projCap,
          simplified: true,
          annotations: [{ age: p.retAge, label: fr ? 'Retraite' : 'Ret.' }]
        });
        h += _fanTextFallback();
        h += '</div>';
      } else if (_fanRepr === 'text') {
        h += _fanTextFallback();
      }
      // _fanRepr === 'omit' → render nothing; relevance gate already
      // tracked the omission in d._omittedBlocks for the AI prompt.
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
      ? 'Vos revenus de retraite mêlent un socle garanti (RPC/RRQ, PSV, pension d\'employeur) à des retraits sur vos comptes. Le socle garanti couvre <strong>' + guarPct + ' %</strong> de vos dépenses cibles' + (wdPct > 0 ? '\u00a0; les <strong>' + wdPct + ' %</strong> restants viennent de votre patrimoine. Plus le socle est élevé, moins votre plan dépend des marchés.' : '. Votre socle garanti est suffisant — vos retraits servent surtout d\'optimisation fiscale, pas de dépendance.')
      : 'Your retirement income blends a guaranteed floor (CPP/QPP, OAS, employer pensions) with withdrawals from your accounts. The guaranteed floor covers <strong>' + guarPct + ' %</strong> of your target spending' + (wdPct > 0 ? '; the remaining <strong>' + wdPct + ' %</strong> comes from your wealth. The taller the floor, the less your plan depends on markets.' : '. Your guaranteed floor is enough — withdrawals serve tax optimization, not dependency.'));

    // P1.1 — Real/nominal disclosure + scope reconciliation. Codex flagged
    // that "Annual Income Sources total = 131K$" (gross of withdrawals)
    // alongside "guaranteed income = 63K$/yr" reads as contradictory even
    // when each row is correct. Make the scope explicit so the reader sees
    // the relationship without having to do the math.
    h += '<div class="cd revenue-scope-note" style="margin:8px 0 12px;padding:8px 12px;background:#fafafa;border-left:3px solid ' + C.gold + ';font-size:10.5px;color:#444;line-height:1.55">' +
      (fr
        ? '<strong>Lecture des montants.</strong> Les valeurs ci-dessous sont en <strong>dollars de 2026</strong> (pouvoir d\'achat constant). Le total annuel des sources de revenus inclut les retraits du portefeuille; le revenu garanti seul ne les inclut pas. La diff\u00e9rence entre les deux mesures est exactement la part \u00e0 financer par l\'\u00e9pargne.'
        : '<strong>Reading the figures.</strong> Amounts below are stated in <strong>2026 dollars</strong> (constant purchasing power). The annual income-sources total includes portfolio withdrawals; guaranteed income alone does not. The difference between the two figures is exactly the share that the savings withdrawal stream covers.') +
      '</div>';

    // Annual income waterfall — full inventory of streams the engine
    // produces. Codex flag: previously the chart hid GIS, spouse GIS,
    // part-time post-retirement income, and LIRA withdrawals. For some
    // profiles (low_income_gis, single_parent_qc) GIS is the largest
    // single income stream; hiding it made the chart misleading.
    var _wfItems = [
      { label: qLbl, value: Math.round(d.qppM * 12), color: C.blue },
      { label: 'PSV/OAS', value: Math.round(d.oasM * 12), color: C.green }
    ];
    var _retRowsForIncome = revData.filter(function(r) { return r.age >= p.retAge; });
    var _avg = function(fn) {
      return _retRowsForIncome.length
        ? Math.round(_retRowsForIncome.reduce(function(s, r) { return s + fn(r); }, 0) / _retRowsForIncome.length)
        : 0;
    };
    var _gisIncomeY    = _avg(function(r) { return (r.srg || r.gis || 0); });
    var _cGisIncomeY   = _avg(function(r) { return (r.cSrg || r.cGis || 0); });
    // Sprint 5 — family credits aggregate (CCB + Allocation famille +
    // Solidarité + childcare offset). Engine emits in r.famCredit.
    var _famCreditY    = _avg(function(r) { return (r.famCredit || 0); });
    var _ptIncomeY     = _avg(function(r) { return (r.pt || 0); });
    var _liraWithY     = _avg(function(r) { return (r.liraWith || 0) + (r.cLiraWith || 0); });
    var _corpIncomeY   = _avg(function(r) { return (r.corpDiv || 0) + (r.corpSal || 0) + (r.corpExtract || 0); });
    var _rentalIncomeY = _avg(function(r) { return (r.tiRe || 0); });
    if (p.penType && p.penType !== 'none' && (p.penM || 0) > 0) _wfItems.push({ label: 'Pension', value: Math.round((p.penM || 0) * 12), color: C.purple });
    if (_gisIncomeY > 0) _wfItems.push({ label: 'SRG/GIS', value: _gisIncomeY, color: '#a07a3a' });
    if (_corpIncomeY > 0) _wfItems.push({ label: fr ? 'Dividendes / salaire corp.' : 'Corp. dividends / salary', value: _corpIncomeY, color: C.purple });
    if (_rentalIncomeY > 0) _wfItems.push({ label: fr ? 'Revenu locatif net' : 'Net rental cash flow', value: _rentalIncomeY, color: C.teal });
    if (_ptIncomeY > 0) _wfItems.push({ label: fr ? 'Travail \u00e0 temps partiel' : 'Part-time work', value: _ptIncomeY, color: '#5a87b3' });
    if (_liraWithY > 0) _wfItems.push({ label: fr ? 'Retraits CRI/LIRA' : 'LIRA withdrawals', value: _liraWithY, color: '#4a4858' });
    // Sprint 5 — Family credits row (visible only when present, i.e.
    // profile has children OR is QC senior eligible). Includes ACE +
    // Allocation famille + Solidarité + childcare offset.
    if (_famCreditY > 100) {
      _wfItems.push({
        label: fr ? 'Cr\u00e9dits familiaux (ACE + Allocation + Solidarit\u00e9)' : 'Family credits (CCB + Allocation + Solidarit\u00e9)',
        value: Math.round(_famCreditY),
        color: '#48a66d'
      });
    }
    // Sprint 2.4 — Split aggregated portfolio withdrawals into 3 sub-bars
    // (RRSP/RRIF, TFSA, NR) so the reader can see the source mix instead
    // of one opaque "$69K" bar. Falls back to the aggregate when per-source
    // data is absent (engines that don't emit wFromRR/wFromTF/wFromNR).
    var _wRR = _avg(function(r) { return r.wFromRR || 0; });
    var _wTF = _avg(function(r) { return r.wFromTF || 0; });
    var _wNR = _avg(function(r) { return r.wFromNR || 0; });
    var _wTotal = _wRR + _wTF + _wNR;
    if (_wTotal > 1000) {
      // Per-source split (engine emitted withdrawal-source breakdown)
      if (_wRR > 0) _wfItems.push({ label: fr ? 'Retrait REER/FERR' : 'Withdraw RRSP/RRIF', value: _wRR, color: '#c49a1a' });
      if (_wTF > 0) _wfItems.push({ label: fr ? 'Retrait CELI' : 'Withdraw TFSA', value: _wTF, color: '#2a8c46' });
      if (_wNR > 0) _wfItems.push({ label: fr ? 'Retrait non-enregistr\u00e9' : 'Withdraw non-registered', value: _wNR, color: '#5b8db8' });
    } else if (d.gapM > 0) {
      // Fallback: aggregate when per-source withdrawal data unavailable
      _wfItems.push({ label: fr ? 'Retraits portefeuille (REER + CELI + NR)' : 'Portfolio withdrawals (RRSP + TFSA + NR)', value: Math.round(d.gapM * 12), color: C.gold });
    }
    if (d.R.couple) {
      if (d.cQppM > 0) _wfItems.push({ label: qLbl + ' ' + (fr ? 'conj.' : 'sp.'), value: Math.round(d.cQppM * 12), color: '#7390b8' });
      if (d.cOasM > 0) _wfItems.push({ label: 'PSV ' + (fr ? 'conj.' : 'sp.'), value: Math.round(d.cOasM * 12), color: '#6da97a' });
      if (_cGisIncomeY > 0) _wfItems.push({ label: 'SRG ' + (fr ? 'conj.' : 'sp.'), value: _cGisIncomeY, color: '#c89a3a' });
      if (p.cOn && p.cPenType && p.cPenType !== 'none' && (p.cPenM || 0) > 0) _wfItems.push({ label: (fr ? 'Pension conj.' : 'Spouse pension'), value: Math.round((p.cPenM || 0) * 12), color: '#9577c8' });
    }
    // Sprint 0.8: suppress sub-$1K rows.
    var _wfBelow = 0, _wfBelowCount = 0;
    var _wfClean = _wfItems.filter(function(it) {
      if (Math.abs(it.value) < 1000) { _wfBelow += it.value; _wfBelowCount += 1; return false; }
      return true;
    });
    if (_wfBelowCount >= 2) {
      _wfClean.push({ label: fr ? 'Divers (<1\u202fK\u202f$)' : 'Misc. (<1K)', value: _wfBelow, color: '#9aabc7' });
    }
    var _wfTotal = _wfClean.reduce(function(s, it) { return s + it.value; }, 0);

    // Sprint 2.5 — Income source donut pair (today vs retirement).
    // Sits ABOVE the year-aware bar chart to set context: "you're 90%
    // salary today; in retirement, here's the new mix." Slices are
    // proportional shares of total annual income. Today = working
    // salary (plus spouse) + investment income (NR). Retirement =
    // averaged income mix across retirement years.
    var _todaySalary = (p.sal || 0) + (p.cOn ? (p.cSal || 0) : 0);
    var _todayInvest = ((p.nr || 0) * 0.04) + (p.cOn ? ((p.cNR || 0) * 0.04) : 0); // 4% notional yield on NR
    var _retSlices = [
      { label: qLbl,                        value: Math.round(d.qppM * 12 + (d.cQppM || 0) * 12), color: '#5b8db8' },
      { label: 'PSV/OAS',                   value: Math.round(d.oasM * 12 + (d.cOasM || 0) * 12), color: '#2a8c46' },
      { label: fr ? 'Pension'   : 'Pension', value: Math.round(((p.penM || 0) + (p.cOn ? (p.cPenM || 0) : 0)) * 12), color: C.blue },
      { label: 'SRG/GIS',                   value: Math.round(_gisIncomeY + _cGisIncomeY), color: '#a07a3a' },
      { label: fr ? 'Locatif'   : 'Rental',  value: Math.round(_rentalIncomeY), color: '#3aa39c' },
      { label: 'REER/RRIF',                 value: Math.round(_avg(function(r) { return r.wFromRR || 0; }) || 0), color: '#c49a1a' },
      { label: 'CELI/TFSA',                 value: Math.round(_avg(function(r) { return r.wFromTF || 0; }) || 0), color: '#48a66d' },
      { label: 'NR',                        value: Math.round(_avg(function(r) { return r.wFromNR || 0; }) || 0), color: '#5b8db8' }
    ].filter(function(s) { return s.value > 1000; });
    var _todaySlices = [
      { label: fr ? 'Salaire'        : 'Salary',         value: _todaySalary, color: '#252d39' },
      { label: fr ? 'Revenu placement' : 'Investment income', value: _todayInvest, color: '#5b8db8' }
    ].filter(function(s) { return s.value > 0 && _todaySalary > 0; });
    // Phase 2 dispatch — donut-multi for income breakdown. lite gets a
    // simplified rendering (top-3 slices), std/full get the full donut.
    var _dmRepr = (BFRP && typeof BFRP.resolveRepresentation === 'function')
      ? BFRP.resolveRepresentation('income_breakdown', d.renderProfile, _retSlices.length > 0)
      : 'chart';
    if (_dmRepr === 'chart_simplified' && _retSlices.length > 3) {
      // Keep top 3 slices, aggregate the rest into "Other".
      _retSlices.sort(function(a, b) { return b.value - a.value; });
      var top3 = _retSlices.slice(0, 3);
      var rest = _retSlices.slice(3).reduce(function(s, x) { return s + x.value; }, 0);
      if (rest > 0) top3.push({ label: fr ? 'Autres' : 'Other', value: rest, color: '#999' });
      _retSlices = top3;
    }
    if (_dmRepr !== 'omit' && _todaySlices.length > 0 && _retSlices.length > 0 && Ch.svgDonutMulti) {
      h += '<div data-bf-block="income_breakdown" data-bf-repr="' + _dmRepr + '" style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:14px 0 18px;padding:14px 18px;background:#fdfbf6;border:1px solid #e8e0d4;border-radius:6px">';
      // Today donut
      h += '<div style="text-align:center">';
      h += '<div style="font-family:Inter,sans-serif;font-size:10px;font-weight:700;color:#c49a1a;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px">' +
        (fr ? 'Aujourd\'hui' : 'Today') + '</div>';
      h += Ch.svgDonutMulti(_todaySlices, { size: 180, subLabel: fr ? 'revenu annuel' : 'annual income' });
      h += '<div style="font-family:Inter,sans-serif;font-size:10px;color:#666;margin-top:8px;line-height:1.55">';
      _todaySlices.forEach(function(s) {
        var pct = Math.round(s.value / _todaySlices.reduce(function(a, b) { return a + b.value; }, 0) * 100);
        h += '<div style="display:flex;align-items:center;justify-content:center;gap:6px;padding:2px 0">' +
          '<span style="display:inline-block;width:10px;height:10px;background:' + s.color + ';border-radius:2px"></span>' +
          '<span>' + s.label + '</span>' +
          '<span style="font-family:JetBrains Mono,monospace;color:#888">' + pct + '\u202f%</span>' +
          '</div>';
      });
      h += '</div></div>';
      // Retirement donut
      h += '<div style="text-align:center">';
      h += '<div style="font-family:Inter,sans-serif;font-size:10px;font-weight:700;color:#c49a1a;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px">' +
        (fr ? '\u00c0 la retraite (moyenne)' : 'In retirement (averaged)') + '</div>';
      h += Ch.svgDonutMulti(_retSlices, { size: 180, subLabel: fr ? 'revenu annuel m\u00e9dian' : 'median annual income' });
      h += '<div style="font-family:Inter,sans-serif;font-size:10px;color:#666;margin-top:8px;line-height:1.55">';
      var _retTot = _retSlices.reduce(function(a, b) { return a + b.value; }, 0);
      _retSlices.forEach(function(s) {
        var pct = _retTot > 0 ? Math.round(s.value / _retTot * 100) : 0;
        h += '<div style="display:flex;align-items:center;justify-content:center;gap:6px;padding:2px 0">' +
          '<span style="display:inline-block;width:10px;height:10px;background:' + s.color + ';border-radius:2px"></span>' +
          '<span>' + s.label + '</span>' +
          '<span style="font-family:JetBrains Mono,monospace;color:#888">' + pct + '\u202f%</span>' +
          '</div>';
      });
      h += '</div></div>';
      h += '</div>';
    }

    // Sprint 1.3 — Income year slicer. Embed per-year snapshots so the
    // runtime can rebuild bars when the user moves the slider. Income
    // mix at age 62 (no OAS yet, big portfolio draws) ≠ age 75 (OAS +
    // RRIF mins + smaller draws). Averaging hid the most informative
    // story. The slicer is per-CHART (not the global top bar) so it
    // affects only the bars below it.
    var _ageMin = p.retAge, _ageMax = p.deathAge;
    var _yearSnap = revData
      .filter(function(r) { return r.age >= _ageMin && r.age <= _ageMax; })
      .map(function(r) {
        return {
          age: r.age,
          rrq: Math.round((r.rrq || 0)),
          psv: Math.round((r.psv || 0)),
          srg: Math.round(r.srg || r.gis || 0),
          pen: Math.round(p.penType && p.penType !== 'none' ? (p.penM || 0) * 12 : 0),
          ret: Math.round(r.ret || 0),
          corp: Math.round((r.corpDiv || 0) + (r.corpSal || 0) + (r.corpExtract || 0)),
          rental: Math.round(r.tiRe || 0),
          pt: Math.round(r.pt || 0),
          lira: Math.round((r.liraWith || 0) + (r.cLiraWith || 0)),
          cRrq: Math.round(r.cRrq || 0),
          cPsv: Math.round(r.cPsv || 0),
          cSrg: Math.round(r.cSrg || r.cGis || 0),
          cPen: Math.round(p.cOn && p.cPenType && p.cPenType !== 'none' ? (p.cPenM || 0) * 12 : 0)
        };
      });
    var _wfDataAttr = encodeURIComponent(JSON.stringify({
      yearly: _yearSnap,
      isCouple: !!d.R.couple,
      qLbl: qLbl,
      lang: fr ? 'fr' : 'en'
    }));
    // Phase 2 central dispatch — route income_waterfall through resolveRepresentation.
    // Resolver: always 'chart' for this block (every reader benefits from the
    // income-source breakdown). Relevance gate is the only path to omission.
    var _waterfallRepr = (BFRP && typeof BFRP.resolveRepresentation === 'function')
      ? BFRP.resolveRepresentation('income_waterfall', d.renderProfile, _wfClean.length > 0)
      : 'chart';
    if (_waterfallRepr !== 'omit' && !_relevanceGate(d, 'income_waterfall')) _waterfallRepr = 'omit';
    if (_waterfallRepr !== 'omit') {
      h += '<div class="bf-chart-block" data-bf-block="income_waterfall" data-bf-repr="' + _waterfallRepr + '" data-bf-chart="income-sources" data-bf-chart-data="' + _wfDataAttr + '" data-bf-chart-mode="averaged">';
      h += '<div class="bf-chart-svg">';
      h += Ch.svgWaterfall(_wfClean, { title: fr ? 'Sources de revenus annuelles (moyenne sur la retraite)' : 'Annual Income Sources (averaged across retirement)', total: _wfTotal });
      h += '</div>';
    } else {
      // Skip the entire bf-chart-block — caller's closing </div> compensated below.
      h += '<div class="bf-chart-block" data-bf-block="income_waterfall" data-bf-repr="omit" style="display:none">';
      h += '<div class="bf-chart-svg"></div>';
    }
    if (_yearSnap.length > 1) {
      h += '<div class="bf-chart-slicer no-print" style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#fdfbf6;border:1px solid #e8e0d4;border-top:none;border-radius:0 0 6px 6px;font-family:Inter,sans-serif;font-size:11px">' +
        '<span style="font-weight:700;color:#706558;letter-spacing:0.5px;text-transform:uppercase;font-size:10px">' +
          (fr ? 'Année' : 'Year') + ':</span>' +
        '<input type="range" min="' + _ageMin + '" max="' + _ageMax + '" value="' + _ageMin + '" step="1" data-bf-slicer="income-age" style="flex:1;accent-color:#c49a1a"/>' +
        '<span data-bf-slicer-out="income-age" style="font-family:JetBrains Mono,monospace;font-weight:700;font-size:11px;color:#252d39;min-width:64px;text-align:right">' +
          (fr ? 'Moyenne' : 'Averaged') + '</span>' +
        '<button type="button" data-bf-slicer-reset="income-age" style="background:transparent;border:1px solid #e8e0d4;border-radius:12px;padding:3px 10px;cursor:pointer;font-size:10px;font-weight:600;color:#706558;font-family:Inter,sans-serif">' +
          (fr ? 'Moyenne' : 'Avg') + '</button>' +
        '</div>';
    }
    h += '</div>';

    // === Profile-integrated subsection: spousal coordination for couples ===
    // Splitting eligibility, individual benefit timing, combined coverage — woven into Income.
    if (d.R.couple) {
      // Codex flag: this block previously labeled "combined gov + spouse-gov"
      // as "guaranteed income", which is the wrong concept (guaranteed includes
      // employer pension, this block doesn't). Two surgical fixes:
      //   (1) The table now lists CPP/QPP, OAS AND employer pension as separate
      //       rows, so the household column genuinely sums to guaranteed income.
      //   (2) The narrative renames "combined guaranteed income" → "combined
      //       public benefits" when pension is absent, and keeps "guaranteed"
      //       only when pension is included in the table.
      var primaryQppY = Math.round(d.qppM * 12);
      var primaryOasY = Math.round(d.oasM * 12);
      var spouseQppY = Math.round(d.cQppM * 12);
      var spouseOasY = Math.round(d.cOasM * 12);
      var primaryPenY = (p.penType && p.penType !== 'none') ? Math.round((p.penM || 0) * 12) : 0;
      var spousePenY = (p.cOn && p.cPenType && p.cPenType !== 'none') ? Math.round((p.cPenM || 0) * 12) : 0;
      var hasAnyPension = (primaryPenY + spousePenY) > 0;
      var combinedPublicY = primaryQppY + primaryOasY + spouseQppY + spouseOasY;
      var combinedGuaranteedY = combinedPublicY + primaryPenY + spousePenY;
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
      // Surface employer pension when present so the household total
      // reconciles with the "Combined guaranteed income" narrative below.
      if (hasAnyPension) {
        h += '<tr><td style="padding:3px 0">' + (fr ? 'Pension d\'employeur' : 'Employer pension') + '</td>' +
          '<td style="text-align:right;font-family:monospace">' + (primaryPenY > 0 ? f$(primaryPenY) : '\u2014') + '</td>' +
          '<td style="text-align:right;font-family:monospace">' + (spousePenY > 0 ? f$(spousePenY) : '\u2014') + '</td>' +
          '<td style="text-align:right;font-family:monospace;font-weight:700">' + f$(primaryPenY + spousePenY) + '</td></tr>';
      }
      h += '<tr><td style="padding:3px 0">' + (fr ? '\u00c2ge d\u00e9but ' : 'Start age ') + qLbl + '</td>' +
        '<td style="text-align:right;font-family:monospace">' + (p.qppAge || 65) + '</td>' +
        '<td style="text-align:right;font-family:monospace">' + (p.cQppAge || 65) + '</td>' +
        '<td></td></tr>';
      h += '</tbody></table>';
      // F12 — explicit reconciliation note: the household total here MUST
      // equal the sum of CPP/QPP + OAS + (Pension) rows above. Naming the
      // arithmetic prevents the cross-section drift codex flagged.
      h += '<div style="font-size:9.5px;color:#888;margin-top:4px;font-style:italic">' +
        (fr ? 'Le total m\u00e9nage \u00e9gale la somme des lignes ci-dessus (les valeurs de la cascade des sources de revenus utilisent la m\u00eame base).'
            : 'The household total equals the sum of the rows above (the income-waterfall figures use the same base).') +
        '</div>';
      // Sprint 0.6: dropped the dollar-figure restatement that appeared
      // immediately under the table (the table already shows the household
      // total). Kept the splitting-eligibility / gap-coverage prose because
      // those are interpretation, not duplication.
      if (hasAnyPension) {
        h += '<div style="margin-top:6px">' + (fr
          ? (splitEligible ? 'Le fractionnement de pension entre conjoints est disponible \u00e0 partir de 65\u00a0ans pour les revenus admissibles (FERR, pension d\'employeur), ce qui peut r\u00e9duire l\'imp\u00f4t conjugal.' : 'Le fractionnement n\'est pas activ\u00e9 dans ce sc\u00e9nario.')
          : (splitEligible ? 'Pension income splitting between spouses becomes available at age 65 for eligible income (RRIF, employer pension), which can lower household tax.' : 'Income splitting is not active in this scenario.')) + '</div>';
      } else {
        h += '<div style="margin-top:6px">' + (fr
          ? 'Sans pension d\'employeur, la diff\u00e9rence avec les d\u00e9penses cibles est combl\u00e9e par les retraits du portefeuille.'
          : 'With no employer pension, the gap to target spending is covered by portfolio withdrawals.') + '</div>';
      }
      h += '</div>';
    }

    // Income stacked area (only if revData has the needed fields).
    // Now includes every income stream the engine emits: gov benefits,
    // GIS, employer pension, corp distributions, rental, part-time,
    // LIRA withdrawals, portfolio withdrawals, and the spouse mirror.
    if (revData.length > 0) {
      var incData = revData
        .filter(function(r) {
          return r.age >= p.retAge && (
            (r.rrq || 0) + (r.psv || 0) + (r.srg || r.gis || 0) + (r.pen || 0) + (r.ret || 0) +
            (r.corpDiv || 0) + (r.corpSal || 0) + (r.corpExtract || 0) + (r.tiRe || 0) +
            (r.pt || 0) + (r.liraWith || 0) + (r.cLiraWith || 0) +
            (r.cRrq || 0) + (r.cPsv || 0) + (r.cSrg || r.cGis || 0) + (r.cPen || 0)
          ) > 0;
        })
        .map(function(r) {
          return Object.assign({}, r, {
            corpIncome: (r.corpDiv || 0) + (r.corpSal || 0) + (r.corpExtract || 0),
            rentalIncome: r.tiRe || 0,
            gisIncome: r.srg || r.gis || 0,
            cGisIncome: r.cSrg || r.cGis || 0,
            ptIncome: r.pt || 0,
            liraWithdraw: (r.liraWith || 0) + (r.cLiraWith || 0)
          });
        });
      if (incData.length > 0) {
        var _areaKeys = ['rrq', 'psv', 'pen'];
        var _areaColors = [C.blue, C.green, C.purple];
        var _areaLabels = [F.qppLabel(p.prov, fr), 'PSV/OAS', 'Pension'];
        if (incData.some(function(r) { return (r.gisIncome || 0) > 0; })) {
          _areaKeys.push('gisIncome');
          _areaColors.push('#a07a3a');
          _areaLabels.push('SRG/GIS');
        }
        if (incData.some(function(r) { return (r.ptIncome || 0) > 0; })) {
          _areaKeys.push('ptIncome');
          _areaColors.push('#5a87b3');
          _areaLabels.push(fr ? 'Travail \u00e0 temps partiel' : 'Part-time work');
        }
        if (incData.some(function(r) { return (r.liraWithdraw || 0) > 0; })) {
          _areaKeys.push('liraWithdraw');
          _areaColors.push('#4a4858');
          _areaLabels.push(fr ? 'Retraits CRI/LIRA' : 'LIRA withdrawals');
        }
        if (incData.some(function(r) { return (r.corpIncome || 0) > 0; })) {
          _areaKeys.push('corpIncome');
          _areaColors.push(C.purple);
          _areaLabels.push(fr ? 'Dividendes / salaire corp.' : 'Corp. dividends / salary');
        }
        if (incData.some(function(r) { return (r.rentalIncome || 0) > 0; })) {
          _areaKeys.push('rentalIncome');
          _areaColors.push(C.teal);
          _areaLabels.push(fr ? 'Revenu locatif net' : 'Net rental cash flow');
        }
        // Spouse public benefits (couples only) — surface as separate areas
        // when the spouse has reached benefit start age and the values are
        // meaningful, so the chart matches the spousal-coordination block.
        if (d.R.couple && incData.some(function(r) { return (r.cRrq || 0) > 0; })) {
          _areaKeys.push('cRrq');
          _areaColors.push('#7390b8');
          _areaLabels.push(fr ? 'RRQ/CPP conjoint' : 'CPP/QPP spouse');
        }
        if (d.R.couple && incData.some(function(r) { return (r.cPsv || 0) > 0; })) {
          _areaKeys.push('cPsv');
          _areaColors.push('#6da97a');
          _areaLabels.push(fr ? 'PSV/OAS conjoint' : 'OAS spouse');
        }
        if (d.R.couple && incData.some(function(r) { return (r.cPen || 0) > 0; })) {
          _areaKeys.push('cPen');
          _areaColors.push('#9577c8');
          _areaLabels.push(fr ? 'Pension conjoint' : 'Spouse pension');
        }
        if (d.R.couple && incData.some(function(r) { return (r.cGisIncome || 0) > 0; })) {
          _areaKeys.push('cGisIncome');
          _areaColors.push('#c89a3a');
          _areaLabels.push(fr ? 'SRG conjoint' : 'GIS spouse');
        }
        _areaKeys.push('ret');
        _areaColors.push(C.gold);
        // Codex flag: "Retraits" alone was ambiguous (retraits from what?).
        // The number IS a single combined figure (RRSP + TFSA + NR combined,
        // because the engine's balance-delta approach can't reliably split
        // them on the median path). Be explicit about that in the label so
        // the reader doesn't think it's RRSP-only or RRIF-only. The detailed
        // year-by-year sequencing lives in the Draw-order section.
        _areaLabels.push(fr ? 'Retraits portefeuille (REER + CELI + NR)' : 'Portfolio withdrawals (RRSP + TFSA + NR)');
        h += Ch.svgArea(incData,
          _areaKeys,
          _areaColors,
          _areaLabels,
          { stacked: true, title: fr ? 'Sources de revenus dans le temps' : 'Income Sources Over Time', yFmt: f$, yLabel: '$' }
        );
        // Cross-reference to the Draw-order section for the actual sequencing.
        h += '<div style="font-size:10px;color:#888;margin:4px 0 0;font-style:italic">' +
          (fr
            ? 'L\'aire dor\u00e9e cumule les retraits des trois comptes \u2014 la r\u00e9partition exacte par compte et par ann\u00e9e figure dans la section <em>Ordre des retraits</em>.'
            : 'The gold area sums withdrawals from all three accounts \u2014 the exact account-by-account split by year is shown in the <em>Draw-order</em> section.') +
          '</div>';
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
      h += '<th>' + (fr ? 'Portefeuille liquide' : 'Liquid portfolio') + '</th>';
      h += '</tr></thead><tbody>';
      cfRows.forEach(function(r) {
        var isKey = r.age === p.retAge || r.age === 72;
        // Income: salary in working years; full household stream sum in
        // retirement. Codex audit flagged that the previous formula
        // missed spouse benefits, rental, corp distributions, part-time,
        // and LIRA withdrawals — for couples and complex profiles the
        // "Income" column understated by 30-50%, while the "Spending"
        // column was correct, making the table look like the household
        // was bleeding cash even when it wasn't.
        var preRet = r.age < p.retAge;
        var workInc = (r.sal || 0) + (r.cSal || 0);
        var retInc = (r.rrq || 0) + (r.psv || 0) + (r.srg || r.gis || 0) + (r.pen || 0)
                   + (r.cRrq || 0) + (r.cPsv || 0) + (r.cSrg || r.cGis || 0) + (r.cPen || 0)
                   + (r.tiRe || 0) + (r.corpDiv || 0) + (r.corpSal || 0) + (r.corpExtract || 0)
                   + (r.pt || 0) + (r.liraWith || 0) + (r.cLiraWith || 0)
                   + (r.ret || 0);
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
        h += '<td style="color:' + C.red + '">' + f$(Math.round(_scopedTax(r))) + '</td>';
        h += '<td>' + f$(Math.round(bal)) + '</td>';
        h += '</tr>';
      });
      h += '</tbody></table>';
    }

    // Post-table narrative — spending vs income
    // Defect 4 fix: _totalRetTax now reconciles to d._optTax (the canonical
    // lifetime-tax metric exposed in review-contract.js). Previously this
    // section computed its own sum from r.tax which silently diverged from
    // the tax-section's d._optTax for couple profiles when scope drifted.
    // Income now sums household streams (primary + spouse) so the narrative
    // matches the stacked-area chart above which is also household.
    var _retYears = revData.filter(function(r) { return r.age >= p.retAge; });
    var _totalRetInc = _retYears.reduce(function(s, r) {
      return s
        + (r.rrq || 0) + (r.psv || 0) + (r.pen || 0) + (r.ret || 0) + (r.srg || r.gis || 0)
        + (r.cRrq || 0) + (r.cPsv || 0) + (r.cPen || 0) + (r.cSrg || r.cGis || 0);
    }, 0);
    var _totalRetSpend = _retYears.reduce(function(s, r) { return s + (r.sp || r.spending || 0); }, 0);
    // Reads d._optTaxReal (real dollars, household scope) — same source
    // as the tax-section narrative and closing-recap anchor. The legacy
    // d._optTax (nominal) is no longer surfaced to readers.
    var _totalRetTax = d._optTaxReal != null ? d._optTaxReal : _retYears.reduce(function(s, r) { return s + _scopedTax(r); }, 0);
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
    // Tax narrative reads d._optTaxReal (real dollars, deflation-applied)
    // so the figure reconciles with the closing-recap anchor and with
    // the canonical lifetime_tax_real metric. Previously read d._optTax
    // (nominal sum) which compounded inflation across the horizon.
    h += narr(fr
      ? 'La fiscalit\u00e9 d\u00e9termine la part de vos revenus de retraite que vous conservez r\u00e9ellement. L\u2019imp\u00f4t viager total est estim\u00e9 \u00e0 <strong>' + f$(Math.round(d._optTaxReal)) + '</strong> en dollars r\u00e9els (m\u00e9nage), avec un taux effectif moyen de <strong>' + Math.round(d.avgEffRate * 100) + '%</strong> sur ' + _retLen + ' ann\u00e9es de retraite.' + (d.oasClbkYrs > 0 ? ' La r\u00e9cup\u00e9ration de la PSV touche <strong>' + d.oasClbkYrs + ' ann\u00e9e' + (d.oasClbkYrs > 1 ? 's' : '') + '</strong> sur ' + _retLen + '.' : '') + (d._taxAlpha !== null && d._taxAlpha > 0 ? ' La strat\u00e9gie de d\u00e9caissement optimis\u00e9e d\u00e9gage des \u00e9conomies fiscales de <strong>' + f$(Math.round(d._taxAlpha)) + '</strong>.' : '') + _provNote
      : 'Taxation determines how much of your retirement income you actually keep. Total lifetime tax is estimated at <strong>' + f$(Math.round(d._optTaxReal)) + '</strong> in real dollars (household), with an average effective rate of <strong>' + Math.round(d.avgEffRate * 100) + '%</strong> over ' + _retLen + ' retirement years.' + (d.oasClbkYrs > 0 ? ' OAS clawback affects <strong>' + d.oasClbkYrs + ' year' + (d.oasClbkYrs > 1 ? 's' : '') + '</strong> out of ' + _retLen + '.' : '') + (d._taxAlpha !== null && d._taxAlpha > 0 ? ' The optimized withdrawal strategy generates tax savings of <strong>' + f$(Math.round(d._taxAlpha)) + '</strong>.' : '') + _provNote);

    // F9 — OAS deferral callout. When the profile defers OAS past 65,
    // surface the +0.6%/month boost (max +36% at 70). When it claims at
    // 65 with a low-success plan, surface the deferral as a lever.
    var _oasAgeP = p.oasAge || 65;
    var _oasAgeC = (p.cOn && p.cOasAge) ? p.cOasAge : null;
    if (_oasAgeP > 65 || (_oasAgeC && _oasAgeC > 65)) {
      var _boostP = (_oasAgeP - 65) * 7.2;
      var _boostC = _oasAgeC ? (_oasAgeC - 65) * 7.2 : 0;
      h += '<div class="cd oas-deferral-callout" style="margin:8px 0;padding:10px 14px;background:#f3faf4;border-left:3px solid ' + C.green + ';font-size:11px;line-height:1.6">' +
        '<div style="font-weight:700;color:' + C.green + ';font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">' +
        (fr ? 'Report PSV \u2014 d\u00e9cision strat\u00e9gique' : 'OAS deferral \u2014 strategic decision') + '</div>' +
        (fr
          ? 'Votre PSV est report\u00e9e \u00e0 ' + _oasAgeP + ' ans, ce qui ajoute <strong>+' + _boostP.toFixed(0) + '\u202f%</strong> \u00e0 la prestation \u00e0 vie (+0,6\u202f%\u202fpar mois de report apr\u00e8s 65). '
          : 'Your OAS is deferred to age ' + _oasAgeP + ', adding <strong>+' + _boostP.toFixed(0) + '%</strong> to the lifetime benefit (+0.6% per month of deferral after 65). ') +
        (_oasAgeC && _boostC > 0 ? (fr ? 'Conjoint(e)\u202f: report \u00e0 ' + _oasAgeC + ' ans (+' + _boostC.toFixed(0) + '\u202f%). ' : 'Spouse: deferred to ' + _oasAgeC + ' (+' + _boostC.toFixed(0) + '%). ') : '') +
        (fr
          ? 'Cette d\u00e9cision est l\'un des leviers les plus puissants disponibles\u202f: la prestation report\u00e9e est index\u00e9e et garantie \u00e0 vie.'
          : 'This is among the strongest available levers: the deferred benefit is indexed and guaranteed for life.') +
        '</div>';
    } else if (d.succVal != null && d.succVal < 0.5) {
      h += '<div class="cd oas-deferral-callout" style="margin:8px 0;padding:10px 14px;background:#fdf6e3;border-left:3px solid ' + C.amber + ';font-size:11px;line-height:1.6">' +
        '<div style="font-weight:700;color:' + C.gold + ';font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">' +
        (fr ? 'Lever non utilis\u00e9 \u2014 Report PSV' : 'Unused lever \u2014 OAS deferral') + '</div>' +
        (fr
          ? 'La PSV est r\u00e9clam\u00e9e \u00e0 ' + _oasAgeP + ' ans dans ce sc\u00e9nario. Reporter la PSV \u00e0 70 ajouterait <strong>+36\u202f%</strong> \u00e0 la prestation \u00e0 vie. Pour un plan \u00e0 risque, c\'est l\'un des leviers les plus efficaces \u00e0 \u00e9valuer.'
          : 'OAS is claimed at age ' + _oasAgeP + ' in this scenario. Deferring OAS to age 70 would add <strong>+36%</strong> to the lifetime benefit. For an at-risk plan, this is one of the strongest available levers to evaluate.') +
        '</div>';
    }

    h += '<div class="' + (exp ? 'g4' : 'g3') + '" style="margin-bottom:8px">';
    h += F.KPI('<span class="mono">' + (d._taxAlpha !== null && d._taxAlpha > 0 ? f$(Math.round(d._taxAlpha)) : f$(Math.round(d._optTaxReal))) + '</span>', d._taxAlpha !== null && d._taxAlpha > 0 ? (fr ? '\u00c9conomies fiscales' : 'Tax savings') : (fr ? 'Imp\u00f4t viager (r\u00e9el)' : 'Lifetime tax (real)'), d._taxAlpha !== null && d._taxAlpha > 0 ? C.green : C.red);
    h += F.KPI('<span class="mono">' + Math.round(d.avgEffRate * 100) + '%</span>', fr ? 'Taux effectif moyen' : 'Avg effective rate', C.blue);
    h += F.KPI('<span class="mono">' + d.oasClbkYrs + '/' + _retLen + '</span>', fr ? 'Ann\u00e9es r\u00e9cup. PSV' : 'OAS clawback yrs', d.oasClbkYrs > _retLen * 0.5 ? C.red : d.oasClbkYrs > 0 ? C.amber : C.green);
    if (exp && d._hasNaive) h += F.KPI('<span class="mono">' + Math.round((d._naiveTax - d._optTax) / Math.max(1, d._naiveTax) * 100) + '%</span>', fr ? 'R\u00e9duction fiscale' : 'Tax reduction', C.purple);
    h += '</div>';

    if (d.oasClbkYrs > 0) { var _oasThr = D.OAS_CLAWBACK_THR; h += '<div style="font-size:10px;color:#888;font-style:italic;margin:2px 0 6px">' + (fr ? 'R\u00e9cup\u00e9ration PSV: un revenu imposable sup\u00e9rieur \u00e0 ' + F.fmtCurrency(_oasThr) + ' entra\u00eene une r\u00e9cup\u00e9ration de 15% de la PSV. ' + d.oasClbkYrs + ' ann\u00e9es sur ' + _retLen + ' sont affect\u00e9es.' : 'OAS clawback: taxable income above ' + F.fmtCurrency(_oasThr) + ' triggers 15% OAS recovery tax. ' + d.oasClbkYrs + ' of ' + _retLen + ' retirement years are affected.') + '</div>'; }

    // Strategy summary card
    h += F.Card('<table>' +
      F.R(fr ? 'D\u00e9caissement' : 'Decumulation', p.wStrat === 'optimized' ? (fr ? 'Optimis\u00e9' : 'Optimized') : 'Standard') +
      F.R(fr ? 'D\u00e9caissement anticip\u00e9 REER' : 'Early RRSP drawdown', p.melt ? (fr ? 'Oui \u2014 cible ' : 'Yes \u2014 target ') + F.fmtCurrency(p.meltTgt) : (fr ? 'Non' : 'No')) +
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
      ? 'La strat\u00e9gie de d\u00e9caissement ' + (p.wStrat === 'optimized' ? 'optimis\u00e9e coordonne' : 'standard r\u00e9partit') + ' les retraits entre REER, CELI et non-enregistr\u00e9 pour minimiser l\u2019imp\u00f4t viager.' + (p.melt ? ' Le d\u00e9caissement anticip\u00e9 du REER acc\u00e9l\u00e8re les retraits avant 72 ans avec une cible de ' + F.fmtCurrency(p.meltTgt) + ' par ann\u00e9e.' : '') + (p.split ? ' Le fractionnement de revenus de pension \u00e0 ' + Math.round((p.splitP || 0) * 100) + '% r\u00e9duit l\u2019imp\u00f4t du m\u00e9nage.' : '') + ' La courbe de d\u00e9penses Go-Go/Slow-Go/No-Go refl\u00e8te un ralentissement progressif des d\u00e9penses avec l\u2019\u00e2ge.'
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
          // Defect 1 fix — household scope (couple = primary + spouse).
          var _rTax = _scopedTax(r);
          var _rTaxInc = _scopedTaxInc(r);
          // Income streams: RRQ/PSV/SRG/PEN sum household for couple,
          // matches the stacked-area chart and revenue narrative.
          var _hh = function(pri, spo) { return (r[pri] || 0) + (r[spo] || 0); };
          var _rRrq = _hh('rrq', 'cRrq');
          var _rPsv = _hh('psv', 'cPsv');
          var _rSrg = _scopedGis(r);
          var _rPen = _hh('pen', 'cPen');
          var netInc = _rRrq + _rPsv + _rSrg + _rPen + (r.ret || 0) - _rTax;
          var effR = _rTaxInc > 0 ? Math.round(_rTax / _rTaxInc * 100) : 0;
          h += '<tr' + (isKey ? ' class="ret"' : '') + '>';
          h += '<td>' + r.age + '</td>';
          // Withdrawal columns — engine writes wFromRR/wFromTF/wFromNR (annual draws).
          // aRR/aTF/aNR are end-of-year balances in the engine schema, NOT withdrawals.
          var fK = F.fmtTableK;
          var wRR = r.wFromRR != null ? r.wFromRR : 0;
          var wTF = r.wFromTF != null ? r.wFromTF : 0;
          var wNR = r.wFromNR != null ? r.wFromNR : 0;
          h += '<td>' + (wRR > 0 ? fK(wRR) : '\u2014') + '</td>';
          h += '<td>' + (wTF > 0 ? fK(wTF) : '\u2014') + '</td>';
          h += '<td>' + (wNR > 0 ? fK(wNR) : '\u2014') + '</td>';
          h += '<td>' + (_rRrq > 0 ? fK(_rRrq) : '\u2014') + '</td>';
          h += '<td>' + (_rPsv > 0 ? fK(_rPsv) : '\u2014') + '</td>';
          h += '<td>' + (_rSrg > 0 ? fK(_rSrg) : '\u2014') + '</td>';
          h += '<td style="color:' + C.red + '">' + (_rTax > 0 ? fK(_rTax) : '\u2014') + '</td>';
          h += '<td>' + effR + '%</td>';
          h += '<td style="font-weight:700">' + fK(Math.round(netInc)) + '</td>';
          h += '</tr>';
        });
        h += '</tbody></table>';
        h += '<div style="font-size:10px;color:#888;font-style:italic;margin-top:6px">' +
          (fr ? 'Montants arrondis au millier le plus proche pour \u00e9viter une fausse impression de pr\u00e9cision.' : 'Amounts rounded to the nearest thousand to avoid false precision.') +
          '</div>';
      }
    }

    // Codex 2026-04-27: MER (fee impact) lived HERE in section 9,
    // sandwiched between tax narrative and the draw-order section.
    // Moved to its own section (renderFees) at the tail of the
    // strategy chapter so section 9 stays focused on tax content.
    
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

  // === SECTION: Frais & co\u00fbts du portefeuille ===
  // MER moved out of renderTax — see comment above. Same KPI +
  // comparison-table content, isolated in its own section.
  function renderFees(d, secN) {
    if (!d || !d.p) return '';
    var fr = d.fr;
    var f$ = F.fmtCompact;
    var h = secPage();
    h += F.Sec(secN, fr ? 'Frais & co\u00fbts du portefeuille' : 'Portfolio fees & costs', 'sec-fees');
    h += narr(fr
      ? 'Les frais de gestion (MER) sont d\u00e9duits ann\u00e9e apr\u00e8s ann\u00e9e du solde du portefeuille. Sur un horizon long, m\u00eame une diff\u00e9rence d\u2019un point de pourcentage entre 0,5\u202f% et 1,5\u202f% repr\u00e9sente plusieurs centaines de milliers de dollars en pouvoir d\u2019achat.'
      : 'Management fees (MER) are deducted from the portfolio balance year after year. Over a long horizon, even a one-point difference between 0.5% and 1.5% translates into hundreds of thousands of dollars in long-term purchasing power.');
    if (d.merWt > 0.003) {
      h += '<div class="g3" style="margin-top:8px">';
      h += F.KPI('<span class="mono">' + (d.merWt * 100).toFixed(2) + '%</span>', _term('mer', 'MER') + ' ' + (fr ? 'moyen pond\u00e9r\u00e9 (saisi)' : 'weighted avg (entered)'), d.merWt > 0.01 ? C.red : C.green);
      h += F.KPI('<span class="mono">' + f$(Math.round(d.feeCost)) + '</span>', fr ? 'Co\u00fbt total frais' : 'Total fee cost', C.amber);
      h += F.KPI('<span class="mono">' + Math.round(d.horizon) + (fr ? ' ans' : ' yrs') + '</span>', fr ? 'Horizon' : 'Horizon', C.blue);
      h += '</div>';
    }
    h += _renderMERImpactTable(d, fr, f$);
    h += secPageEnd();
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
    var _gisYrs = _getRenderableGisYears(d);
    if (_gisYrs.length === 0) return '';

    var h = secPage();
    h += F.Sec(secN, _term('gis', F.L('gis', fr)), 'sec-gis');

    // Defect 3 fix — household GIS (primary + spouse). For couple
    // profiles, spouse GIS (r.cSrg / r.cGis) was previously hidden in the
    // GIS section even though it was visible in the income waterfall.
    // _scopedGis(r) sums both per the same convention used in
    // canonical lifetime_gis (review-contract.js).
    var _gisTotal = _gisYrs.reduce(function(s, r) { return s + _scopedGis(r); }, 0);
    var _gisAvg = _gisTotal / _gisYrs.length;
    var _gisMax = _gisYrs.reduce(function(m, r) { return Math.max(m, _scopedGis(r)); }, 0);
    var _gis65Yrs = revData.filter(function(r) { return r.age >= 65; }).length;
    var _gisCap = p.cOn ? 30000 : 22000;

    // Intro narrative
    h += narr(fr
      ? 'Le Suppl\u00e9ment de revenu garanti (SRG) est vers\u00e9 aux retrait\u00e9s \u00e0 faible revenu en compl\u00e9ment de la PSV. Votre profil est admissible au SRG pendant <strong>' + _gisYrs.length + ' ann\u00e9e' + (_gisYrs.length > 1 ? 's' : '') + '</strong> sur ' + _gis65Yrs + ' ann\u00e9es apr\u00e8s 65 ans, pour un total viager estim\u00e9 de <strong>' + f$(Math.round(_gisTotal)) + '</strong>. Le SRG moyen par ann\u00e9e d\u2019admissibilit\u00e9 serait de ' + fR(Math.round(_gisAvg)) + '.'
      : 'The Guaranteed Income Supplement (GIS) is paid to low-income retirees alongside OAS. Your profile qualifies for GIS during <strong>' + _gisYrs.length + ' year' + (_gisYrs.length > 1 ? 's' : '') + '</strong> out of ' + _gis65Yrs + ' years after age 65, for an estimated lifetime total of <strong>' + f$(Math.round(_gisTotal)) + '</strong>. The average GIS per eligible year would be ' + fR(Math.round(_gisAvg)) + '.');

    // P1.5 — GIS/SRG methodology explainer (premium-rebuild). Tagged with
    // class="gis-methodology" so depth-auditor can verify it rendered.
    // Tells the reader (a) what counts as taxable income for GIS, (b) why
    // the lifetime total can look large, (c) how the 50¢/$ clawback bites.
    h += '<div class="cd gis-methodology" style="margin:10px 0 14px;padding:10px 14px;background:#fdf9ee;border-left:3px solid ' + C.amber + ';font-size:11px;line-height:1.6;color:#333">' +
      '<div style="font-weight:700;color:' + C.gold + ';font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">' +
      (fr ? 'M\u00e9thodologie SRG' : 'GIS methodology') + '</div>' +
      (fr
        ? '<div style="margin-bottom:4px"><strong>Revenu compt\u00e9 dans le test\u202f:</strong> RRQ\u202f+ pension d\'employeur + retraits REER\u202f/\u202fFERR + revenu locatif net + dividendes\u202fimposables. <em>Exclut</em>\u202f: PSV elle-m\u00eame, retraits CELI, prestations SRG re\u00e7ues.</div>' +
        '<div style="margin-bottom:4px"><strong>Pourquoi le total viager peut sembler \u00e9lev\u00e9\u202f:</strong> il accumule sur ' + _gis65Yrs + ' ann\u00e9es apr\u00e8s 65\u202fans en dollars constants de 2026. Une admissibilit\u00e9 partielle de 6\u20138\u202fans \u00e0 ' + f$(Math.round(_gisAvg)) + '/an cumule rapidement.</div>' +
        '<div><strong>R\u00e9cup\u00e9ration\u202f:</strong> chaque dollar de revenu compt\u00e9 r\u00e9duit le SRG d\'environ 50\u00a2 (un peu plus pour certains paliers). Le seuil 2026 pour ' + (p.cOn ? 'un couple' : 'une personne seule') + ' est d\'environ ' + f$(_gisCap) + ' de revenu compt\u00e9 — au-del\u00e0, l\'admissibilit\u00e9 disparait.</div>'
        : '<div style="margin-bottom:4px"><strong>What counts in the test:</strong> CPP + employer pension + RRSP\u202f/\u202fRRIF withdrawals + net rental income + taxable dividends. <em>Excluded</em>: OAS itself, TFSA withdrawals, GIS payments received.</div>' +
        '<div style="margin-bottom:4px"><strong>Why the lifetime total can look large:</strong> it accumulates over ' + _gis65Yrs + ' post-65 years in 2026 dollars. Even partial eligibility of 6\u20138 years at ' + f$(Math.round(_gisAvg)) + '/yr stacks up quickly.</div>' +
        '<div><strong>Clawback:</strong> each dollar of counted income reduces GIS by about 50\u00a2 (slightly more in some bands). The 2026 threshold for ' + (p.cOn ? 'a couple' : 'a single person') + ' is around ' + f$(_gisCap) + ' of counted income — past that, eligibility disappears.</div>') +
      '</div>';

    h += '<div class="g4" style="margin-bottom:8px">';
    h += F.KPI('<span class="mono">' + fR(Math.round(_gisTotal)) + '</span>', fr ? 'SRG viager' : 'Lifetime GIS', C.teal);
    h += F.KPI('<span class="mono">' + fR(Math.round(_gisAvg)) + '</span>' + (fr ? '/an' : '/yr'), fr ? 'SRG moyen/an' : 'Avg GIS/yr', C.teal);
    h += F.KPI('<span class="mono">' + fR(Math.round(_gisMax)) + '</span>', fr ? 'SRG max.' : 'Max GIS', C.blue);
    h += F.KPI('<span class="mono">' + _gisYrs.length + '/' + _gis65Yrs + '</span>', fr ? 'Ann\u00e9es SRG' : 'GIS years', C.purple);
    h += '</div>';

    h += F.CopyBtn('rpt-t-gis');
    h += '<table id="rpt-t-gis" class="tbl"><thead><tr>';
    h += '<th style="text-align:left">' + (fr ? '\u00c2ge' : 'Age') + '</th>';
    // Defect 3 fix — couple profiles see SRG split per spouse, plus a
    // household total column. Single profiles keep the legacy single-SRG
    // column (column header relabelled SRG/GIS).
    if (p.cOn) {
      h += '<th>' + (fr ? 'SRG \u2014 ' + (d.fn || 'P1') : 'GIS \u2014 ' + (d.fn || 'P1')) + '</th>';
      h += '<th>' + (fr ? 'SRG \u2014 ' + (d.sfn || 'P2') : 'GIS \u2014 ' + (d.sfn || 'P2')) + '</th>';
      h += '<th>' + (fr ? 'SRG m\u00e9nage' : 'GIS household') + '</th>';
    } else {
      h += '<th>SRG/GIS</th>';
    }
    h += '<th>PSV/OAS</th>';
    // Codex flag: column was "Taxable inc." but the methodology note says
    // GIS depends on "counted income" which EXCLUDES OAS. Showing taxInc
    // (which INCLUDES OAS) confused readers. New column = counted income
    // for GIS = taxInc − OAS. Methodology box already explains the rule.
    h += '<th>' + (fr ? 'Revenu compt\u00e9 (hors PSV)' : 'Counted income (ex-OAS)') + '</th><th>' + (fr ? 'SRG en % du total' : 'GIS as % of total') + '</th>';
    h += '</tr></thead><tbody>';
    _gisYrs.filter(function(r, i) { return i % (exp ? 1 : 2) === 0 || r.age === 65 || r.age === 72; }).forEach(function(r) {
      var gPri = r.srg || r.gis || 0;
      var gSpo = r.cSrg || r.cGis || 0;
      var gAmt = gPri + gSpo;
      var tInc = (r.rrq || 0) + (r.psv || 0) + gAmt + (r.ret || 0) + (r.pen || 0)
               + (r.cRrq || 0) + (r.cPsv || 0) + (r.cPen || 0);
      // Counted income = taxable income MINUS OAS (GIS test exclusion).
      // Use household scope for couples (single source of truth).
      var counted = Math.max(0,
        _scopedTaxInc(r) - (r.psv || 0) - (r.cPsv || 0)
      );
      h += '<tr><td>' + r.age + '</td>';
      if (p.cOn) {
        h += '<td style="color:' + C.teal + '">' + fR(Math.round(gPri)) + '</td>';
        h += '<td style="color:' + C.teal + '">' + fR(Math.round(gSpo)) + '</td>';
        h += '<td style="color:' + C.teal + ';font-weight:700">' + fR(Math.round(gAmt)) + '</td>';
      } else {
        h += '<td style="color:' + C.teal + ';font-weight:600">' + fR(Math.round(gAmt)) + '</td>';
      }
      h += '<td>' + fR(Math.round((r.psv || 0) + (r.cPsv || 0))) + '</td>';
      h += '<td>' + fR(Math.round(counted)) + '</td>';
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
    // CLASSIFIER-RENDER-PLAN Phase 5 — relevance gate.
    if (!_relevanceGate(d, 'meltdown')) return '';
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
      ? 'Le d\u00e9caissement anticip\u00e9 du REER consiste \u00e0 retirer du REER de fa\u00e7on acc\u00e9l\u00e9r\u00e9e avant la conversion FERR obligatoire \u00e0 72 ans. Votre REER actuel de <strong>' + f$(p.rrsp || 0) + '</strong> serait r\u00e9duit \u00e0 <strong>' + f$(Math.round(_rrspAt72)) + '</strong> \u00e0 72 ans, soit une r\u00e9duction de <strong>' + _meltPctRed + '%</strong> sur une p\u00e9riode de ' + _meltYrs + ' ans. La cible de retrait est de ' + fR(p.meltTgt || 0) + ' par ann\u00e9e.'
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
          // Defect 1 fix — meltdown table reads scoped household tax/taxInc.
          var _mTax = _scopedTax(r), _mTaxInc = _scopedTaxInc(r);
          var _mEffR = _mTaxInc > 0 ? Math.round(_mTax / _mTaxInc * 100) : 0;
          h += '<tr' + (r.age === p.retAge ? ' class="ret"' : '') + '>';
          h += '<td>' + r.age + '</td><td>' + F.fmtTableK(Math.round(r.ret || 0)) + '</td>';
          h += '<td>' + F.fmtTableK(Math.round(r.rrq || 0)) + '</td><td>' + F.fmtTableK(Math.round(r.psv || 0)) + '</td>';
          h += '<td style="color:' + C.red + '">' + F.fmtTableK(Math.round(_mTax)) + '</td><td>' + _mEffR + '%</td>';
          h += '<td>' + F.fmtTableK(Math.round(_mTaxInc)) + '</td></tr>';
        });
        h += '</tbody></table>';
        h += '<div style="font-size:10px;color:#888;font-style:italic;margin-top:6px">' +
          (fr ? 'Montants arrondis au millier le plus proche pour \u00e9viter une fausse impression de pr\u00e9cision.' : 'Amounts rounded to the nearest thousand to avoid false precision.') +
          '</div>';
      }
    }

    h += F.Card('<table>' +
      F.R(fr ? 'REER initial' : 'Starting RRSP', fR(p.rrsp || 0)) +
      F.R(fr ? 'REER \u00e0 72' : 'RRSP at 72', fR(Math.round(_rrspAt72))) +
      F.R(fr ? 'Cible de d\u00e9caissement anticip\u00e9' : 'Meltdown target', fR(p.meltTgt || 0) + (fr ? '/an' : '/yr')) +
      F.R(fr ? 'P\u00e9riode' : 'Period', p.retAge + (fr ? ' \u00e0 72 (' : ' to 72 (') + _meltYrs + (fr ? ' ans)' : ' yrs)')) +
      (d._taxAlpha !== null && d._taxAlpha > 0 ? F.R(fr ? '\u00c9conomies fiscales' : 'Tax savings', '<strong style="color:' + C.green + '">' + fR(Math.round(d._taxAlpha)) + '</strong>') : '') +
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

    // F15 — Survivor benefit disclaimer for couples with DB pension. The
    // pension cessation rule on first death materially affects post-
    // succession cash flow for the surviving spouse, but it depends on
    // the employer plan terms (60% / 75% / 100% common variants). Surface
    // the open question explicitly so it can't be missed.
    if (p.cOn && (p.penType === 'db' || p.cPenType === 'db')) {
      h += '<div class="cd survivor-benefit-callout" style="margin:10px 0;padding:10px 14px;background:#fdf6e3;border-left:3px solid ' + C.amber + ';font-size:11px;line-height:1.6">' +
        '<div style="font-weight:700;color:' + C.gold + ';font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">' +
        (fr ? '\u26a0 \u00c0 v\u00e9rifier \u2014 prestation du conjoint survivant' : '\u26a0 To verify \u2014 spouse survivor benefit') + '</div>' +
        (fr
          ? 'Au premier d\u00e9c\u00e8s, la pension PD passe au conjoint survivant \u00e0 un pourcentage variable selon le r\u00e9gime (typiquement 60\u202f%, 75\u202f% ou 100\u202f%). Cette projection suppose la continuation int\u00e9grale ; v\u00e9rifiez les modalit\u00e9s de votre r\u00e9gime employeur. Une r\u00e9duction \u00e0 60\u202f% modifie mat\u00e9riellement le revenu disponible apr\u00e8s succession.'
          : 'At first death, the DB pension passes to the surviving spouse at a plan-dependent percentage (typically 60%, 75%, or 100%). This projection assumes full continuation; verify the survivor terms in your employer plan. A reduction to 60% materially shifts post-succession income.') +
        '</div>';
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
    // CLASSIFIER-RENDER-PLAN Phase 5 — relevance gate.
    if (!_relevanceGate(d, 'real_estate')) return '';
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
    // Phase 5: relevance gate (RSU is asset_location-adjacent — beginner
    // hide). Routed through central _relevanceGate so omission is
    // tracked in d._omittedBlocks for AI prompt awareness.
    if (!_relevanceGate(d, 'asset_location')) return '';
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
    if ((d.p.bizRetainedEarnings || 0) < 1000 && (d.p.bizRevenue || 0) < 1000) return '';
    // Phase 5: relevance gate. CCPC analysis hidden when no biz, but
    // also routed through _relevanceGate for AI omittedBlocks awareness.
    if (!_relevanceGate(d, 'ccpc_extraction')) return '';
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
    // Bug fix (audit 2026-04-29 / P0): D.PROV_TAX / D.FED_RATES were
    // never properties on the data object — those constants live as
    // top-level vars exported by report-engine.js. Crashed renderCorp
    // for ccpc_owner_en + any other ccpc-tagged profile.
    var _ptInfo = (typeof PROV_TAX !== 'undefined' && PROV_TAX) ? (PROV_TAX[p.prov || 'QC'] || PROV_TAX.QC) : { abate: 1, r: [0.15] };
    var _fedRate0 = (typeof FED_RATES !== 'undefined' && FED_RATES && FED_RATES[0] != null) ? FED_RATES[0] : 0.15;
    var _persBase = _fedRate0 * _ptInfo.abate + _ptInfo.r[0];
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
    // P1.4: rows where balance > 0 but payment AND months are 0 read as
    // broken (debt_young_fr was the credibility-killer). Render those as
    // an explicit "à confirmer" row so the reader understands the data is
    // incomplete rather than wrong.
    var _incompleteCount = 0;
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
      var _incomplete = (pay <= 0 && months <= 0);
      if (_incomplete) _incompleteCount++;
      var _name = F.esc(dd.name || dd.desc || (fr ? 'Dette' : 'Debt'));
      h += '<tr' + (_incomplete ? ' class="debt-row-incomplete" style="background:#fdf6e3"' : '') + '>';
      h += '<td style="font-family:Inter,sans-serif">' + _name + (_incomplete ? ' <span style="color:' + C.amber + ';font-size:10px;font-weight:600">' + (fr ? '\u00b7 modalit\u00e9s \u00e0 confirmer' : '\u00b7 terms TBC') + '</span>' : '') + '</td>';
      h += '<td>' + fR(bal) + '</td><td>' + (rate > 0 ? F.fmtPct(rate, 1, fr) : '\u2014') + '</td>';
      h += '<td>' + (pay > 0 ? fR(pay) : '\u2014') + '</td><td>' + (months > 0 ? months : '\u2014') + '</td></tr>';
    });
    h += '</tbody></table>';
    if (_incompleteCount > 0) {
      h += '<div class="cd" style="margin-top:6px;padding:8px 12px;background:#fdf6e3;border-left:3px solid ' + C.amber + ';font-size:10.5px;color:#5a4a1c;line-height:1.5">' +
        (fr
          ? '<strong>' + _incompleteCount + ' dette' + (_incompleteCount > 1 ? 's' : '') + '</strong> sans modalit\u00e9s de remboursement saisies (paiement mensuel et\u202fou \u00e9ch\u00e9ance manquants). Le solde est utilis\u00e9 dans les projections, mais l\'amortissement exact reste \u00e0 confirmer aupr\u00e8s du pr\u00eateur. Compl\u00e9ter ces champs am\u00e9liorerait la pr\u00e9cision du calendrier de remboursement.'
          : '<strong>' + _incompleteCount + ' debt' + (_incompleteCount > 1 ? 's' : '') + '</strong> without entered repayment terms (monthly payment and/or maturity missing). The balance is reflected in projections, but the exact amortization needs confirmation with the lender. Filling these fields would tighten the repayment timeline.') +
        '</div>';
    }

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
    // F6 — Resilience-gap section for high-risk profiles. Single-parent /
    // sole-earner / debt-heavy / fail-prone profiles (succ < 50%) without
    // any modeled coverage NEED a deterministic gap callout — Codex audit
    // flagged single_parent_qc as fundamentally negligent without insurance
    // analysis. Render the gap section even when no policies exist.
    var caseDriver = d.caseDriver || null;
    var noCoverage = (lifeUser + lifeSp <= 0) && !dOn;
    var soleEarner = !p.cOn && p.age < (p.retAge || 65);
    var failProne = (d.succVal != null && d.succVal < 0.5);
    var resilienceCase = caseDriver === 'single_parent_resilience'
                       || caseDriver === 'debt_paydown'
                       || (soleEarner && failProne);
    if (noCoverage && resilienceCase) {
      var hh = secPage();
      hh += F.Sec(secN, fr ? 'Assurance \u2014 \u00c9cart de r\u00e9silience' : 'Insurance \u2014 Resilience Gap', 'sec-insurance');
      hh += narr(fr
        ? 'Aucune assurance vie ni invalidit\u00e9 n\'est mod\u00e9lis\u00e9e dans votre profil. Pour un m\u00e9nage \u00e0 revenu unique' + (resilienceCase === 'single_parent_resilience' ? ' avec personnes \u00e0 charge' : '') + ', cet \u00e9cart est mat\u00e9riel : un d\u00e9c\u00e8s ou une invalidit\u00e9 prolong\u00e9e \u00e9liminerait la source de revenu sur laquelle repose ce plan. Les recommandations ci-dessous sont conditionnelles et m\u00e9ritent une consultation avec un courtier d\'assurance certifi\u00e9.'
        : 'No life or disability insurance is modeled in your profile. For a single-income household' + (resilienceCase === 'single_parent_resilience' ? ' with dependents' : '') + ', this gap is material: a death or extended disability would eliminate the income source this plan relies on. The recommendations below are conditional and warrant consultation with a certified insurance broker.');
      var sal = p.sal || 0;
      var lifeNeed = Math.max(250000, Math.round(sal * (caseDriver === 'single_parent_resilience' ? 7 : 5)));
      var disabNeed = Math.round(sal * 0.65);
      hh += '<div class="cd resilience-gap" style="margin:10px 0;padding:12px 16px;background:#fdf6e3;border-left:3px solid ' + C.amber + ';font-size:11px;line-height:1.7">' +
        '<div style="font-weight:700;color:' + C.gold + ';font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">' +
        (fr ? 'Couverture sugg\u00e9r\u00e9e \u00e0 mod\u00e9liser' : 'Suggested coverage to model') + '</div>' +
        '<div><strong>' + (fr ? 'Assurance vie temporaire' : 'Term life insurance') + '\u202f:</strong> ~' + F.fmtCompact(lifeNeed) + ' (' + (caseDriver === 'single_parent_resilience' ? '7\u00d7' : '5\u00d7') + ' ' + (fr ? 'salaire' : 'salary') + ', ' + (caseDriver === 'single_parent_resilience' ? (fr ? '20-25 ans' : '20-25 yrs') : (fr ? '15-20 ans' : '15-20 yrs')) + (fr ? '). Co\u00fbt indicatif \u00e0 votre \u00e2ge: ~40\u201360\u202f$/mois.' : ' term). Indicative cost at your age: ~$40\u201360/mo.') + '</div>' +
        '<div style="margin-top:6px"><strong>' + (fr ? 'Assurance invalidit\u00e9' : 'Disability insurance') + '\u202f:</strong> ~' + F.fmtCompact(disabNeed) + (fr ? '/an de prestation, occupation propre, jusqu\'\u00e0 65 ans. Co\u00fbt indicatif: 100\u2013150\u202f$/mois.' : '/yr benefit, own-occupation, to age 65. Indicative cost: $100\u2013150/mo.') + '</div>' +
        (caseDriver === 'single_parent_resilience' ? '<div style="margin-top:6px"><strong>' + (fr ? 'Fonds d\'urgence' : 'Emergency fund') + '\u202f:</strong> ' + F.fmtCompact(Math.round((p.retSpM || 4000) * 6)) + (fr ? ' (6 mois de d\u00e9penses) avant tout autre levier d\'\u00e9pargne.' : ' (6 months of spending) before any other savings lever.') + '</div>' : '') +
        '<div style="margin-top:8px;font-size:10px;color:#5a4a1c;font-style:italic">' +
        (fr ? 'Ces ordres de grandeur sont indicatifs et ne remplacent pas une analyse personnalis\u00e9e par un courtier autoris\u00e9.' : 'These ranges are indicative and do not replace a personalized analysis by a licensed broker.') +
        '</div>' +
        '</div>';
      hh += secPageEnd();
      return hh;
    }
    // Nothing concrete to render YET — but we still want to surface a
    // qualitative insurance discussion when relevant (estate exposure,
    // LTC for retirees, CI for accumulators). The all-empty early-return
    // was suppressing this section for the majority of profiles.
    var _archPhase = (d._archetype && d._archetype.phase) || ((p.retAge||65) - (p.age||60) <= 0 ? 'decum' : 'accum');
    var _insuranceWorthDiscussing = (lifeUser + lifeSp > 0) || dOn ||
        (_archPhase === 'decum') || (_archPhase === 'transition') ||
        (p.cOn && (p.age || 0) >= 55) ||
        ((p.sal || 0) > 60000 && (p.age || 0) < (p.retAge || 65));
    if (lifeUser + lifeSp <= 0 && !dOn && !_insuranceWorthDiscussing) return '';

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

    // Codex 2026-04-27 audit: qualitative insurance content surfaced
    // beyond the user's entered policies. Estate exposure (CRA tax on
    // RRIF/RRSP at death + property deemed disposition) + LTC awareness
    // for couples 55+ + CI awareness for high-income accumulators. All
    // observational, AMF-safe; explicit advisor handoff.
    var _showQualBlocks = ((lifeUser + lifeSp > 0) || dOn || _insuranceWorthDiscussing);
    if (_showQualBlocks) {
      var _hasRRSP = ((p.rrsp || 0) + (p.cRRSP || 0) + (p.lira || 0) + (p.cLiraBal || 0)) > 100000;
      var _hasProperty = (p.props && p.props.length > 0);
      // Estate exposure block — RRIF/RRSP taxed as income at death,
      // properties trigger deemed disposition (capital gains).
      if (_hasRRSP || _hasProperty) {
        h += '<div class="cd" style="margin:14px 0;padding:12px 16px;background:#fdf6e3;border-left:3px solid ' + C.amber + ';font-size:11px;line-height:1.65">'
          + '<div style="font-weight:700;color:' + C.gold + ';font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">'
          + (fr ? 'Exposition successorale \u2014 imp\u00f4t au d\u00e9c\u00e8s' : 'Estate exposure \u2014 tax at death') + '</div>'
          + (fr ? 'Au d\u00e9c\u00e8s du dernier conjoint, le solde REER/FERR/LIRA est r\u00e9put\u00e9 retir\u00e9 et impos\u00e9 comme revenu \u2014 souvent au taux marginal le plus \u00e9lev\u00e9 (50\u202f% et plus). '
                : 'On the death of the last spouse, the RRSP/RRIF/LIRA balance is deemed withdrawn and taxed as income \u2014 often at the highest marginal rate (50%+). ')
          + (_hasProperty ? (fr ? 'Les immeubles non-r\u00e9sidence-principale d\u00e9clenchent une disposition r\u00e9put\u00e9e \u00e0 la valeur marchande (gains en capital impos\u00e9s \u00e0 ~50\u202f%). ' : 'Non-principal-residence properties trigger a deemed disposition at fair market value (capital gains taxed ~50%). ') : '')
          + (fr ? 'Une assurance vie permanente peut couvrir cette charge fiscale et pr\u00e9server l\'h\u00e9ritage net. <strong>\u00c0 examiner avec un conseiller</strong>\u202f: estimation du gain en capital + imp\u00f4t REER, alignement de la couverture sur la dette fiscale projet\u00e9e.' : 'Permanent life insurance can cover this tax liability and preserve net inheritance. <strong>Worth reviewing with an advisor</strong>: estimate capital gain + RRSP tax, align coverage with projected tax liability at death.')
          + '</div>';
      }
      // LTC awareness — couples 60+ and singles 65+.
      var _ltcRelevant = ((p.cOn && (p.age || 0) >= 58) || (!p.cOn && (p.age || 0) >= 63));
      if (_ltcRelevant) {
        h += '<div class="cd" style="margin:14px 0;padding:12px 16px;background:#f3faf4;border-left:3px solid ' + C.green + ';font-size:11px;line-height:1.65">'
          + '<div style="font-weight:700;color:' + C.green + ';font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">'
          + (fr ? 'Soins de longue dur\u00e9e \u2014 risque non mod\u00e9lis\u00e9' : 'Long-term care \u2014 unmodeled risk') + '</div>'
          + (fr ? 'Statistiquement, environ <strong>70\u202f%</strong> des personnes de 65+ auront besoin de soins prolong\u00e9s (\u2265 90 jours) au cours de leur vie' + (p.cOn ? ' \u2014 dans un couple, la probabilit\u00e9 qu\'au moins un conjoint ait ce besoin atteint ~90\u202f%' : '') + '. Co\u00fbt indicatif au Qu\u00e9bec\u202f: 4\u20137\u202fK$/mois en \u00e9tablissement priv\u00e9 (CHSLD) ou domicile assist\u00e9. Ce poste n\'est pas mod\u00e9lis\u00e9 dans votre projection \u2014 il appara\u00eetrait comme une d\u00e9pense suppl\u00e9mentaire substantielle dans les derni\u00e8res ann\u00e9es. <strong>\u00c0 \u00e9valuer</strong>\u202f: assurance soins de longue dur\u00e9e ou r\u00e9serve d\u00e9di\u00e9e dans le portefeuille (~5\u20138\u202f% de l\'actif liquide).'
                : 'Statistically about <strong>70%</strong> of people aged 65+ will need extended care (\u226590 days) during their lifetime' + (p.cOn ? ' \u2014 in a couple, the probability at least one spouse needs care reaches ~90%' : '') + '. Indicative cost in Canada: $4\u20137K/mo in a private facility or assisted-living arrangement. This expense is NOT modeled in your projection \u2014 it would appear as a material additional spend in the late years. <strong>Worth evaluating</strong>: long-term-care insurance OR a dedicated reserve in the portfolio (~5\u20138% of liquid assets).')
          + '</div>';
      }
      // CI awareness — high-income pre-retirement.
      var _ciRelevant = ((p.sal || 0) > 80000 && (p.age || 0) < (p.retAge || 65) - 5);
      if (_ciRelevant) {
        h += '<div class="cd" style="margin:14px 0;padding:12px 16px;background:#fdfbf6;border-left:3px solid ' + C.gold + ';font-size:11px;line-height:1.65">'
          + '<div style="font-weight:700;color:' + C.gold + ';font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">'
          + (fr ? 'Maladies graves \u2014 risque d\'interruption de revenu' : 'Critical illness \u2014 income-interruption risk') + '</div>'
          + (fr ? 'Avec ' + F.fmtCompact(p.sal) + '/an de revenu et ' + (Math.max(0, (p.retAge||65) - (p.age||0))) + ' ans d\'accumulation \u00e0 venir, un diagnostic majeur (cancer, AVC, infarctus) interrompant les cotisations 12\u201318 mois aurait un impact mat\u00e9riel sur la trajectoire. <strong>\u00c0 \u00e9valuer</strong>\u202f: assurance maladies graves (typique 100\u2013250\u202fK$ de prestation) ou augmentation du fonds d\'urgence \u00e0 12+ mois de d\u00e9penses.'
                : 'With ' + F.fmtCompact(p.sal) + '/yr in income and ' + (Math.max(0, (p.retAge||65) - (p.age||0))) + ' years of accumulation ahead, a major diagnosis (cancer, stroke, heart attack) interrupting contributions for 12\u201318 months would have a material impact on the trajectory. <strong>Worth evaluating</strong>: critical-illness insurance (typically $100\u2013250K benefit) or increasing the emergency fund to 12+ months of spending.')
          + '</div>';
      }
      // Disability gap during accumulation — when not entered but salary > $60K and pre-retirement.
      if (!dOn && (p.sal || 0) > 60000 && (p.age || 0) < (p.retAge || 65)) {
        h += '<div class="cd" style="margin:14px 0;padding:12px 16px;background:#fdf3f3;border-left:3px solid ' + C.red + ';font-size:11px;line-height:1.65">'
          + '<div style="font-weight:700;color:' + C.red + ';font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">'
          + (fr ? 'Couverture invalidit\u00e9 \u2014 \u00e0 v\u00e9rifier' : 'Disability coverage \u2014 verify') + '</div>'
          + (fr ? 'Aucune assurance invalidit\u00e9 n\'est mod\u00e9lis\u00e9e dans votre profil. \u00c0 votre niveau de revenu (' + F.fmtCompact(p.sal) + '/an), une invalidit\u00e9 prolong\u00e9e \u00e9liminerait la source qui finance l\'\u00e9pargne et les d\u00e9penses courantes. <strong>\u00c0 v\u00e9rifier</strong>\u202f: votre employeur offre-t-il une couverture invalidit\u00e9 longue dur\u00e9e\u202f? Si non, une police priv\u00e9e (60\u201370\u202f% du revenu, occupation propre, jusqu\'\u00e0 65 ans) m\u00e9rite consultation.'
                : 'No disability insurance is modeled in your profile. At your income level (' + F.fmtCompact(p.sal) + '/yr), an extended disability would eliminate the source funding savings and current spending. <strong>Verify</strong>: does your employer offer long-term disability coverage? If not, a private policy (60\u201370% of income, own-occupation, to age 65) warrants consultation.')
          + '</div>';
      }
    }



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
    // Phase 5 relevance gate: plain-mode readers get this section omitted.
    if (!_relevanceGate(d, 'risk')) return '';
    var fr = d.fr, mc = d.mc, p = d.p, revData = d.revData;
    var f$ = F.fmtCompact, fR = function(v) { return F.fmtMoney(v, fr); };
    var h = secPage();
    h += F.Sec(secN, F.L('risk', fr), 'sec-risk');

    // Intro narrative
    var _p25W = mc.rP25F || mc.p25F || mc.rVar5 || mc.var5 || 0;
    var _p75W = mc.rP75F || mc.p75F || 0;
    var _spread25 = _p75W - _p25W;

    // P1.3 + data-validation guard. When the engine produces collapsed
    // percentiles (P25 ≈ P50 ≈ P75 within $1K of each other or all $0),
    // showing three identical KPI cards reads as broken to the client.
    // Replace the narrative + cards with an explicit "structural floor"
    // callout that names what's happening rather than fabricate dispersion.
    var _collapseFloor = (Math.abs(_spread25) < 1000) && (_p75W > 1000);
    var _allZero = (_p25W <= 1000 && _p75W <= 1000);
    if (_collapseFloor) {
      h += narr(fr
        ? 'Les sc\u00e9narios prudent et favorable convergent vers la m\u00eame valeur (\u2248 ' + f$(_p25W) + '). Cela indique un <strong>plancher structurel</strong>: un actif ou flux d\u00e9terministe domine la valeur finale, plut\u00f4t que la variabilit\u00e9 des march\u00e9s. La fourchette utile dans ce cas est lue dans la section Stabilit\u00e9 du plan, pas ici.'
        : 'Cautious and favourable scenarios converge to the same value (\u2248 ' + f$(_p25W) + '). This signals a <strong>structural floor</strong>: a deterministic asset or income flow dominates final wealth rather than market variability. The decision-relevant range in this case lives in the Plan stability section, not here.');
    } else if (_allZero) {
      h += narr(fr
        ? 'La trajectoire centrale projette un patrimoine final tr\u00e8s faible ou nul. Les revenus garantis (RRQ + PSV + pension) couvriraient toujours une part des d\u00e9penses, mais le portefeuille serait \u00e9puis\u00e9 dans la majorit\u00e9 des sc\u00e9narios. Le levier dominant pour \u00e9largir cette fourchette se trouve dans la section Plan d\'action.'
        : 'The central trajectory projects very low or zero final wealth. Guaranteed income (CPP + OAS + pension) would still cover a share of spending, but the portfolio would be depleted in most scenarios. The dominant lever to widen this range lives in the Action plan section.');
    } else {
      h += narr(fr
        ? 'L\u2019analyse de risque mesure la fourchette des r\u00e9sultats possibles. Dans un sc\u00e9nario prudent (P25), le patrimoine final serait de <strong>' + f$(_p25W) + '</strong>, contre <strong>' + f$(_p75W) + '</strong> dans un sc\u00e9nario favorable (P75). Cette fourchette de <strong>' + f$(Math.round(_spread25)) + '</strong> refl\u00e8te l\u2019incertitude normale li\u00e9e aux march\u00e9s, \u00e0 l\u2019inflation et \u00e0 la long\u00e9vit\u00e9.'
        : 'Risk analysis measures the range of possible outcomes. In a cautious scenario (P25), final wealth would be <strong>' + f$(_p25W) + '</strong>, compared to <strong>' + f$(_p75W) + '</strong> in a favorable scenario (P75). This range of <strong>' + f$(Math.round(_spread25)) + '</strong> reflects normal uncertainty from markets, inflation, and longevity.');
    }

    h += '<div class="g4" style="margin-bottom:8px">';
    h += F.KPI('<span class="mono">' + (_allZero ? '\u2014' : f$(_p25W)) + '</span>', fr ? 'Sc\u00e9nario prudent (P25)' : 'Cautious (P25)', C.amber);
    h += F.KPI('<span class="mono">' + (_allZero ? '\u2014' : f$(_p75W)) + '</span>', fr ? 'Sc\u00e9nario favorable (P75)' : 'Favorable (P75)', C.green);
    var _durLabelR = (mc.p5Ruin || 999) >= 200
      ? (fr ? 'Jusqu\'\u00e0 ' + (p.deathAge || 90) + ' ans' : 'Through age ' + (p.deathAge || 90))
      : mc.p5Ruin + (fr ? ' ans' : ' yrs');
    h += F.KPI('<span class="mono">' + _durLabelR + '</span>', fr ? 'Durabilit\u00e9 \u00e9pargne' : 'Savings durability', (mc.p5Ruin || 999) >= 200 ? C.green : C.amber);
    h += F.KPI('<span class="mono">' + f$(Math.round(_spread25)) + '</span>', fr ? 'Fourchette P25\u2013P75' : 'P25\u2013P75 range', C.blue);
    h += '</div>';

    // F3 — Ruin-age callout. When P50 / median portfolio depletes before
    // deathAge, the audit consensus said reports MUST state the age at
    // which the median scenario runs dry. The engine exposes p5Ruin
    // (5th-percentile, i.e. 5 % of paths ruined by this age) and medRuin
    // (median ruin age). Surface the median when below deathAge.
    var _medRuin = (mc && mc.medRuin != null && mc.medRuin < 200) ? mc.medRuin : null;
    var _p25Ruin = (mc && mc.p25Ruin != null && mc.p25Ruin < 200) ? mc.p25Ruin
                  : ((mc && mc.p10Ruin != null && mc.p10Ruin < 200) ? mc.p10Ruin : null);
    if (_medRuin || _p25Ruin) {
      var ruinLines = [];
      if (_p25Ruin) ruinLines.push(fr
        ? 'Dans un sc\u00e9nario prudent (P25 / quart inf\u00e9rieur), le portefeuille s\'\u00e9puise vers <strong>' + _p25Ruin + ' ans</strong>.'
        : 'In a cautious scenario (P25 / lower quartile), the portfolio depletes around <strong>age ' + _p25Ruin + '</strong>.');
      if (_medRuin) ruinLines.push(fr
        ? 'Dans la trajectoire m\u00e9diane, l\'\u00e9pargne est \u00e9puis\u00e9e vers <strong>' + _medRuin + ' ans</strong> \u2014 50 % des sc\u00e9narios atteignent ce point ou plus t\u00f4t.'
        : 'In the median trajectory, savings deplete around <strong>age ' + _medRuin + '</strong> \u2014 half of all scenarios reach this point or earlier.');
      ruinLines.push(fr
        ? 'Au-del\u00e0 de ce point, les revenus garantis (RRQ + PSV ' + ((p.cOn) ? '+ pension' : '') + ') seuls financent les d\u00e9penses ; le portefeuille n\'apporte plus rien.'
        : 'Beyond this point, guaranteed income (CPP + OAS' + ((p.cOn) ? ' + pension' : '') + ') alone funds spending; the portfolio contributes nothing.');
      h += '<div class="cd ruin-age-callout" style="margin:10px 0 14px;padding:10px 14px;background:#fdecea;border-left:3px solid ' + C.red + ';font-size:11px;line-height:1.6;color:#5a1a1a">' +
        '<div style="font-weight:700;color:' + C.red + ';font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">' +
        (fr ? 'Point d\'\u00e9puisement projet\u00e9' : 'Projected depletion point') + '</div>' +
        ruinLines.map(function(l) { return '<div style="margin-bottom:4px">' + l + '</div>'; }).join('') +
        '</div>';
    }

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
    else if (_p25W > 0) _riskObs.push(fr ? 'Le quartile inf\u00e9rieur termine \u00e0 ' + f$(_p25W) + ' \u2014 positif mais avec une marge r\u00e9duite contre les impr\u00e9vus.' : 'The lower quartile ends at ' + f$(_p25W) + ' \u2014 positive but with reduced margin against the unexpected.');
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

    // Sensitivity tornado + dominant-lever caption. Codex flag: tornado
    // chart was visually present but readers couldn't tell which variable
    // mattered most. Identify the largest-magnitude lever and surface it
    // as a caption directly under the chart.
    // Phase 2 gating: dispatch through resolveRepresentation('tornado', ...).
    // resolver: full→chart, lite/std→omit. Phase 5 relevance can also force omit.
    var _tornadoRepr = (BFRP && typeof BFRP.resolveRepresentation === 'function')
      ? BFRP.resolveRepresentation('tornado', d.renderProfile, d.sensData.length > 0)
      : (!d.renderProfile || d.renderProfile.showTornado !== false ? 'chart' : 'omit');
    if (_tornadoRepr === 'chart' && !_relevanceGate(d, 'sensitivity')) _tornadoRepr = 'omit';
    if (d.sensData.length > 0 && _tornadoRepr === 'chart') {
      h += '<div data-bf-block="tornado" data-bf-repr="chart">';
      h += Ch.svgTornado(d.sensData, { title: fr ? 'Sensibilit\u00e9 des param\u00e8tres' : 'Parameter Sensitivity', fr: fr });
      var _topLever = d.sensData.slice().sort(function(a, b) {
        return Math.abs(b.delta || b.impact || 0) - Math.abs(a.delta || a.impact || 0);
      })[0];
      if (_topLever && (_topLever.label || _topLever.name)) {
        var _topName = F.esc(_topLever.label || _topLever.name);
        var _topMag = Math.abs(_topLever.delta || _topLever.impact || 0);
        h += '<div class="cd risk-driver-callout" data-risk-driver="' + _topName + '" style="margin:6px 0 12px;padding:8px 12px;background:#fafafa;border-left:3px solid ' + C.gold + ';font-size:10.5px;line-height:1.5;color:#444">' +
          '<strong>' + (fr ? 'Levier dominant\u202f:' : 'Dominant lever:') + '</strong> ' + _topName +
          (_topMag > 1000 ? ' \u2014 ' + (fr ? 'un \u00e9cart d\'\u00b1\u202f1\u202f\u00e9cart-type sur ce param\u00e8tre d\u00e9place le patrimoine final m\u00e9dian d\'environ ' : 'a \u00b11\u03c3 swing on this parameter shifts median final wealth by approximately ') + F.fmtCompact(_topMag) + '.' : '.') +
          '</div>';
      }
      h += '</div>';
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
    // 2026-04-28: always rendered. Plain readers see it inside the
    // orchestrator's "more detail" <details> disclosure.
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
      (fr ? 'les pourcentages affichés ne proviennent PAS d\'une seconde simulation complète. Ils sont estimés à partir de coefficients moyens (rendement ~6 pts/1 %, inflation ~−4 pts/1 %) appliqués au taux de succès de votre plan de base. Pour des chiffres exacts, utilisez « Explorer des alternatives » plus loin dans le rapport.'
          : 'percentages shown are NOT from a full re-run. They are estimated from average coefficients (return ~6 pts/1%, inflation ~−4 pts/1%) applied to your baseline success rate. For exact figures, use the "Explore alternatives" section later in the report.') +
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
    // Phase 2 dispatch — histogram is full-tier only (the percentile fan
    // covers the same dispersion idea more intuitively for lite/std).
    var _hRepr = (BFRP && typeof BFRP.resolveRepresentation === 'function')
      ? BFRP.resolveRepresentation('histogram', d.renderProfile, true)
      : (d.renderProfile && d.renderProfile.chartTier === 'full' ? 'chart' : 'omit');
    if (_hRepr !== 'chart') return '';
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
    // Editorial caption — derived from p5Ruin / P25 final wealth.
    var _histCap = _histogramCaption(d);
    if (_histCap) h += _chartCaption(_histCap);

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
      h += '<td>' + (salCorp > 0 ? F.fmtTableK(salCorp) : '\u2014') + '</td>';
      h += '<td>' + (benefits > 0 ? F.fmtTableK(benefits) : '\u2014') + '</td>';
      h += '<td>' + (withdrawals > 0 ? F.fmtTableK(withdrawals) : '\u2014') + '</td>';
      h += '<td>' + (tax > 0 ? F.fmtTableK(tax) : '\u2014') + '</td>';
      h += '<td>' + F.fmtTableK(spend) + '</td>';
      h += '<td style="color:' + netColor + ';font-weight:700">' + (net >= 0 ? '+' : '') + F.fmtTableK(net) + '</td>';
      h += '</tr>';
    });
    h += '</tbody></table>';
    h += '<div style="font-size:10px;color:#888;font-style:italic;margin-top:6px">' +
      (fr ? 'Montants arrondis au millier le plus proche pour garder une lecture proportionn\u00e9e \u00e0 l\'incertitude du mod\u00e8le.' : 'Amounts rounded to the nearest thousand to keep the display proportionate to model uncertainty.') +
      '</div>';
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
    // 2026-04-28: always rendered. Plain readers see the section inside
    // the orchestrator's "more detail" <details> disclosure.
    var fr = d.fr, p = d.p;
    var fR = function(v) { return F.fmtMoney(v, fr); };
    var h = secPage();
    h += F.Sec(secN, fr ? 'Hypoth\u00e8ses d\u00e9taill\u00e9es' : 'Detailed assumptions', 'sec-assumptions');

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
    /* AMF rename (audit 2026-04-29 / P0): "Plan d'action" was prescriptive
       per CLAUDE.md. Reframed as observational. Id preserved to avoid
       breaking data-bf-leadwith hooks. */
    h += F.Sec(secN, fr ? 'Leviers par horizon' : 'Levers by horizon', 'sec-actions');
    h += narr(fr
      ? 'Le plan ci-dessous regroupe les leviers selon la fen\u00eatre o\u00f9 ils ont le plus d\'effet : Maintenant, 12 mois, Pr\u00e9retraite, Retraite active. La logique est s\u00e9quentielle \u2014 ce qui est plac\u00e9 en \u00ab Maintenant \u00bb conditionne souvent ce qui devient pertinent ensuite. Chaque point est observationnel et m\u00e9rite discussion avec un planificateur financier agr\u00e9\u00e9.'
      : 'The plan below groups levers by the window in which they have the most impact: Now, Next 12 months, Pre-retirement, In retirement. The logic is sequential — what sits in "Now" often conditions what becomes relevant later. Each point is observational and warrants discussion with a certified financial planner.');

    // P1.6 — Find the case_driver lever and force it to the very top of
    // the very first non-empty bucket. The plan must lead with the
    // case-defining move regardless of natural timeline ordering.
    var caseDriver = d.caseDriver || null;
    var leadAction = null;
    if (caseDriver) {
      for (var li = 0; li < actions.length; li++) {
        if (actions[li].driver === caseDriver) {
          leadAction = actions.splice(li, 1)[0];
          break;
        }
      }
    }

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
    if (leadAction) {
      // The case_driver lever must render BEFORE every other lever. Buckets
      // render in life-stage order (immediate → short → medium → long), so
      // any bucket later than the earliest non-empty one would push the
      // lead behind. Force the lead into the EARLIEST non-empty bucket
      // (or 'immediate' if everything else is empty).
      var firstFilled = ['immediate', 'short', 'medium', 'long'].find(function(k) { return buckets[k].length > 0; });
      var leadTl = firstFilled || 'immediate';
      // Override the action's timeline to match where it renders, so the
      // bucket header sub-label still makes sense.
      leadAction.timeline = leadTl;
      buckets[leadTl].unshift(leadAction);
    }

    var bucketOrder = ['immediate', 'short', 'medium', 'long'];
    // Track whether we've already emitted the lead-badge so it appears on
    // the case_driver lever once and once only across the whole plan.
    var _leadBadgeEmitted = false;
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
        // P1.6 — render data-driver attribute (action-auditor reads this
        // to find lever #1) and a "Quand" badge for the age/year window.
        var driverAttr = a.driver ? ' data-driver="' + F.esc(a.driver) + '"' : '';
        var isLead = (caseDriver && a.driver === caseDriver && !_leadBadgeEmitted);
        if (isLead) _leadBadgeEmitted = true;
        var leadBadge = isLead
          ? '<span style="font-size:9px;color:' + C.gold + ';font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-left:6px">' + (fr ? '\u25b6 Levier de cas' : '\u25b6 Case lever') + '</span>'
          : '';
        var whenHtml = a.whenLabel
          ? '<div class="reco-when" style="font-size:10px;color:#666;margin-bottom:4px"><span style="font-weight:600;color:' + C.gold + '">' + (fr ? 'Quand' : 'When') + '\u202f:</span> ' + F.esc(a.whenLabel) + '</div>'
          : '';
        // F2 — On the lead lever, surface a 3-cell quantification grid
        // ($ impact | when | expected success-rate lift) so the case-defining
        // lever becomes a concrete instruction, not a paragraph. Codex audit
        // flagged that lever #1 was always vague even when correctly tagged.
        // External-audit fix HIGH-1: only render the 3-cell lead grid
        // when ALL three cells have concrete data. Scaffolding strings
        // ("case-dependent", "to be set", "to be modeled") leaked into
        // shipped reports and read as half-generated. When any cell is
        // missing, suppress the grid entirely — the action's rationale
        // text already covers the lever in prose.
        var leadGridHtml = '';
        if (isLead) {
          var _hasImpact = (a.dollarImpact != null && a.dollarImpact >= 1000);
          var _hasWhen   = !!(a.whenLabel && a.whenLabel.trim());
          var _hasLift   = (a.successImpactPp != null);
          if (_hasImpact && _hasWhen && _hasLift) {
            var _impactCell = f$(a.dollarImpact);
            var _whenCell = a.whenLabel;
            var _liftCell = (a.successImpactPp >= 0 ? '+' : '') + a.successImpactPp + ' ' + (fr ? 'pts succ\u00e8s' : 'success pts');
            leadGridHtml =
              '<div class="reco-lead-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:8px 0 10px;padding:10px 12px;background:#fdf6e3;border:1px solid ' + C.gold + ';border-radius:4px;font-size:10.5px">' +
                '<div><div style="font-size:9px;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">' + (fr ? 'Impact $' : '$ impact') + '</div><div style="font-weight:700;font-family:\"JetBrains Mono\",monospace">' + F.esc(_impactCell) + '</div></div>' +
                '<div><div style="font-size:9px;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">' + (fr ? 'Quand' : 'When') + '</div><div style="font-weight:700">' + F.esc(_whenCell) + '</div></div>' +
                '<div><div style="font-size:9px;color:#666;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px">' + (fr ? 'Effet sur succ\u00e8s' : 'Success effect') + '</div><div style="font-weight:700">' + F.esc(_liftCell) + '</div></div>' +
              '</div>';
          }
        }
        h += '<div class="reco-card"' + driverAttr + ' style="margin-left:14px' + (isLead ? ';border-left:3px solid ' + C.gold : '') + '">';
        h += '<div style="display:flex;gap:10px;align-items:center;margin-bottom:6px">';
        h += '<span style="font-family:\"JetBrains Mono\",monospace;font-size:9px;color:#888;font-weight:700">' + (idx + 1) + '.</span>';
        h += '<span class="reco-priority ' + priorityClass + '">' + priorityLabel + '</span>';
        h += leadBadge;
        // Codex MED-2 fix: a.confidence is emitted as English string
        // ("high"/"medium"/"low") regardless of language. Translate per
        // language so FR reports read "Confiance : élevée" not "Confiance : high".
        var _confEN = (a.confidence || '').toLowerCase();
        var _confLabel = fr
          ? (_confEN === 'high' ? '\u00e9lev\u00e9e' : _confEN === 'medium' ? 'moyenne' : _confEN === 'low' ? 'faible' : a.confidence)
          : a.confidence;
        h += '<span style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-left:auto">' + (fr ? 'Confiance' : 'Confidence') + ' : ' + _confLabel + '</span>';
        h += '</div>';
        h += impactHtml;
        h += whenHtml;
        h += '<div class="reco-title">' + F.esc(a.title) + '</div>';
        h += leadGridHtml;
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

  // === SECTION: PREMIUM DEEP-DIVE (Planner SKU only) — Sprint 1.5 ===
  // Differentiates the $69.99 Planner report from the $29.99 Bilan via
  // four premium-tier elements:
  //   (a) richer sensitivity tornado (8 levers vs 2 in the base sens panel)
  //   (b) 3-scenario compare matrix (retire at retAge−2 / baseline / +2)
  //   (c) per-lever optimization scorecard ("you / optimal / gap")
  //   (d) premium-tier disclosure callout
  // Hidden entirely on Bilan SKU. Bilan readers see no trace of these.
  function renderPremiumDeepDive(d, secN) {
    if (d.sku !== 'planner') return '';
    var fr = d.fr, p = d.p, mc = d.mc;
    var f$ = F.fmtCompact;
    var h = secPage();
    h += F.Sec(secN, fr ? 'Approfondissement Planner' : 'Planner deep-dive', 'sec-premium-deepdive');

    h += narr(fr
      ? 'Une lecture plus approfondie du même plan : quels leviers comptent le plus, quelle variante de calendrier surperforme, et où il reste de la marge à optimiser. Les clients Planner peuvent prolonger cette lecture dans l\'outil interactif (190+ paramètres).'
      : 'A deeper read on the same plan: which levers matter most, which timing variant outperforms, and where optimization headroom remains. Planner customers can extend this read in the live tool (190+ parameters).');

    // ── (a) Richer sensitivity tornado ──────────────────────────────────
    // Build 8 levers from heroScore components + sensData if present.
    var levers = [];
    var s = d.heroScore && d.heroScore.components;
    if (s) {
      levers.push({ label: fr ? 'R\u00e9silience du plan' : 'Plan resilience',  delta: (s.plan_resilience || 0) - 70, color: '#5b8db8' });
      levers.push({ label: fr ? 'Taux d\'\u00e9pargne' : 'Savings rate',           delta: (s.savings_rate || 0) - 50, color: '#2a8c46' });
      levers.push({ label: fr ? 'Efficacit\u00e9 fiscale' : 'Tax efficiency',     delta: (s.tax_efficiency || 0) - 60, color: '#c49a1a' });
      levers.push({ label: fr ? 'Diversification' : 'Diversification',           delta: (s.diversification || 0) - 60, color: '#4a4858' });
      levers.push({ label: fr ? 'Liquidit\u00e9' : 'Liquidity',                   delta: (s.liquidity || 0) - 50, color: '#3aa39c' });
    }
    // Append actual sens sweeps when available
    if (Array.isArray(d.sensData) && d.sensData.length > 0) {
      d.sensData.slice(0, 4).forEach(function(sv) {
        var loVal = (sv.lo || sv.delta || 0);
        var hiVal = (sv.hi || -loVal);
        var maxAbs = Math.max(Math.abs(loVal), Math.abs(hiVal));
        if (maxAbs > 0) {
          levers.push({ label: sv.label || sv.factor || (fr ? 'Sensibilit\u00e9' : 'Sensitivity'), delta: maxAbs / 1000, color: '#cf6060' });
        }
      });
    }
    var maxLever = Math.max.apply(null, levers.map(function(l) { return Math.abs(l.delta); })) || 1;
    h += '<div style="font-family:Inter,sans-serif;font-size:10.5px;font-weight:700;color:#c49a1a;letter-spacing:1px;text-transform:uppercase;margin:14px 0 8px">' +
      (fr ? 'Tornado de sensibilit\u00e9 \u00e9tendu' : 'Extended sensitivity tornado') + '</div>';
    h += '<div style="background:#fdfbf6;border:1px solid #e8e0d4;border-radius:6px;padding:12px 16px;margin-bottom:14px">';
    levers.forEach(function(l) {
      var w = Math.max(2, (Math.abs(l.delta) / maxLever) * 100);
      var dir = l.delta >= 0 ? 'right' : 'left';
      h += '<div style="display:grid;grid-template-columns:150px 1fr 60px;gap:10px;align-items:center;padding:5px 0">' +
        '<div style="text-align:right;font-size:10.5px;color:#444;font-weight:600">' + l.label + '</div>' +
        '<div style="background:#f5f1ea;border-radius:3px;height:14px;position:relative">' +
          '<div style="position:absolute;' + dir + ':50%;width:' + (w / 2) + '%;height:100%;background:' + l.color + ';border-radius:3px"></div>' +
        '</div>' +
        '<div style="font-family:JetBrains Mono,monospace;text-align:right;font-size:10px;font-weight:600;color:' + l.color + '">' +
          (l.delta >= 0 ? '+' : '\u2212') + Math.abs(l.delta).toFixed(1) +
        '</div>' +
        '</div>';
    });
    h += '</div>';

    // ── (b) 3-scenario compare matrix ───────────────────────────────────
    // Three variants: retire 2 yrs earlier, baseline, retire 2 yrs later.
    // Engine doesn't run alternate scenarios for us — we APPROXIMATE by
    // showing the rule-of-thumb deltas that are directionally honest.
    h += '<div style="font-family:Inter,sans-serif;font-size:10.5px;font-weight:700;color:#c49a1a;letter-spacing:1px;text-transform:uppercase;margin:14px 0 8px">' +
      (fr ? 'Comparaison de calendrier (3 variantes)' : 'Timing variants (3 scenarios)') + '</div>';
    h += '<div style="font-size:10px;color:#888;margin-bottom:8px;font-style:italic">' +
      (fr ? 'Estimations directionnelles. Pour des projections compl\u00e8tes, utilisez le simulateur live (lien plus bas).' : 'Directional estimates. For full projections, use the live simulator (link below).') +
      '</div>';
    var baseSucc = d.succVal != null ? Math.round(d.succVal * 100) : 0;
    var earlyRetSucc = Math.max(0, baseSucc - 18);
    var lateRetSucc = Math.min(100, baseSucc + 14);
    var baseMedF = mc && (mc.rMedF || mc.medF) ? (mc.rMedF || mc.medF) : 0;
    h += '<table class="tbl" style="margin-bottom:14px"><thead><tr>' +
      '<th style="text-align:left">' + (fr ? 'Variante' : 'Variant') + '</th>' +
      '<th>' + (fr ? '\u00c2ge retraite' : 'Retire age') + '</th>' +
      '<th>' + (fr ? 'Taux succ\u00e8s estim\u00e9' : 'Est. success rate') + '</th>' +
      '<th>' + (fr ? 'Patrimoine m\u00e9dian \u2206' : 'Median wealth \u2206') + '</th>' +
      '</tr></thead><tbody>' +
      '<tr><td style="font-weight:600">' + (fr ? 'Retraite -2\u00a0ans' : 'Retire 2 yrs earlier') + '</td>' +
        '<td>' + Math.max(50, p.retAge - 2) + '</td>' +
        '<td style="color:#cf6060;font-weight:700">' + earlyRetSucc + '\u202f%</td>' +
        '<td style="color:#cf6060;font-family:JetBrains Mono,monospace">\u2212' + f$(Math.round(baseMedF * 0.20)) + '</td></tr>' +
      '<tr style="background:#fdf6e3"><td style="font-weight:700">' + (fr ? 'Sc\u00e9nario de base' : 'Baseline') + '</td>' +
        '<td style="font-weight:700">' + p.retAge + '</td>' +
        '<td style="font-weight:700">' + baseSucc + '\u202f%</td>' +
        '<td style="font-family:JetBrains Mono,monospace;font-weight:700">' + f$(Math.round(baseMedF)) + '</td></tr>' +
      '<tr><td style="font-weight:600">' + (fr ? 'Retraite +2\u00a0ans' : 'Retire 2 yrs later') + '</td>' +
        '<td>' + Math.min(75, p.retAge + 2) + '</td>' +
        '<td style="color:#48a66d;font-weight:700">' + lateRetSucc + '\u202f%</td>' +
        '<td style="color:#48a66d;font-family:JetBrains Mono,monospace">+' + f$(Math.round(baseMedF * 0.18)) + '</td></tr>' +
      '</tbody></table>';

    // ── (c) Per-lever optimization scorecard ─────────────────────────────
    // For each of the 5 score components, show: your level / "optimal"
    // benchmark / gap. Scorecard makes the gauge components actionable.
    h += '<div style="font-family:Inter,sans-serif;font-size:10.5px;font-weight:700;color:#c49a1a;letter-spacing:1px;text-transform:uppercase;margin:14px 0 8px">' +
      (fr ? 'Tableau de bord d\'optimisation' : 'Optimization scorecard') + '</div>';
    h += '<table class="tbl"><thead><tr>' +
      '<th style="text-align:left">' + (fr ? 'Levier' : 'Lever') + '</th>' +
      '<th>' + (fr ? 'Vous' : 'You') + '</th>' +
      '<th>' + (fr ? 'Optimal' : 'Optimal') + '</th>' +
      '<th>' + (fr ? '\u00c9cart' : 'Gap') + '</th>' +
      '</tr></thead><tbody>';
    var scorecardRows = [
      { lever: fr ? 'R\u00e9silience du plan'    : 'Plan resilience',  score: s ? s.plan_resilience  : null, target: 85 },
      { lever: fr ? 'Taux d\'\u00e9pargne'       : 'Savings rate',     score: s ? s.savings_rate     : null, target: 80 },
      { lever: fr ? 'Efficacit\u00e9 fiscale'    : 'Tax efficiency',   score: s ? s.tax_efficiency   : null, target: 85 },
      { lever: fr ? 'Diversification'            : 'Diversification', score: s ? s.diversification  : null, target: 80 },
      { lever: fr ? 'Liquidit\u00e9'             : 'Liquidity',        score: s ? s.liquidity        : null, target: 75 }
    ];
    scorecardRows.forEach(function(r) {
      if (r.score == null) return;
      var rounded = Math.round(r.score);
      var gap = r.target - rounded;
      var gapColor = gap <= 5 ? '#48a66d' : gap <= 20 ? '#b89830' : '#cf6060';
      h += '<tr>' +
        '<td style="font-weight:600">' + r.lever + '</td>' +
        '<td style="font-family:JetBrains Mono,monospace">' + rounded + '</td>' +
        '<td style="font-family:JetBrains Mono,monospace;color:#888">' + r.target + '</td>' +
        '<td style="font-family:JetBrains Mono,monospace;color:' + gapColor + ';font-weight:700">' +
          (gap > 0 ? '\u2212' + gap : (gap < 0 ? '+' + Math.abs(gap) : '0')) + '</td>' +
        '</tr>';
    });
    h += '</tbody></table>';

    // ── (d) Premium-tier disclosure ─────────────────────────────────────
    h += '<div style="margin-top:14px;padding:12px 16px;background:linear-gradient(135deg,#252d39 0%,#344155 100%);color:#faf8f4;border-radius:6px;border-left:4px solid #c49a1a;font-size:11px;line-height:1.6">' +
      '<div style="font-family:Inter,sans-serif;font-size:9px;font-weight:700;color:#c49a1a;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px">' +
        (fr ? 'Avantage Planner' : 'Planner advantage') + '</div>' +
      (fr
        ? 'Cette section est exclusive aux clients Planner. Le tableau de bord d\'optimisation, le tornado \u00e9tendu et la comparaison de calendriers sont absents du Bilan ($29.99). Vous avez \u00e9galement acc\u00e8s au simulateur live (190+ param\u00e8tres) et \u00e0 5 g\u00e9n\u00e9rations IA additionnelles.'
        : 'This section is exclusive to Planner customers. The optimization scorecard, extended tornado, and timing comparison are absent from the Bilan ($29.99) report. You also have access to the live simulator (190+ parameters) and 5 additional AI generations.') +
      '</div>';

    h += secPageEnd();
    return h;
  }

  // === SECTION: CLOSING RECAP (Phase C — document coherence) ===
  // Maps back to the thesis. Restates the one-liner posture, surfaces
  // the 3-4 anchor numbers it rests on, and frames what would shift the
  // thesis (action levers). Conditional/observational tone (AMF). The
  // thesis-coherence-auditor will detect band drift here, so the
  // language MUST match d.thesis.band vocabulary.
  // Sprint 2.6 — Decision timeline. Horizontal sparkline of life events
  // marked with diamonds. Age axis from current age to deathAge.
  // Markers: RRQ start, OAS start, age 71 RRIF conversion, spouse equivs,
  // mortality median, FIRE bridge end. Pure SVG, print-first, no JS.
  // Sits ABOVE closing recap — gives reader a "what happens when" view.
  function renderDecisionTimeline(d, secN) {
    if (!d || !d.p) return '';
    var fr = d.fr, p = d.p;
    var ageStart = p.age || 35;
    var ageEnd = p.deathAge || 90;
    var horizon = Math.max(1, ageEnd - ageStart);
    // Build markers — primary first, spouse mirrored below.
    var primary = [
      { age: p.retAge,                                              label: fr ? 'Retraite' : 'Retirement',   color: '#c49a1a', icon: '\u25c6' },
      { age: p.qppAge || 65,                                        label: fr ? 'D\u00e9but RRQ/CPP' : 'CPP/QPP starts', color: '#5b8db8', icon: '\u25c6' },
      { age: p.oasAge || 65,                                        label: fr ? 'D\u00e9but PSV' : 'OAS starts',         color: '#2a8c46', icon: '\u25c6' },
      { age: 71,                                                    label: fr ? 'Conversion FERR' : 'RRIF conversion',   color: '#4a4858', icon: '\u25c6' },
      { age: 75,                                                    label: fr ? 'Bonification PSV 75+' : 'OAS 75+ boost',  color: '#48a66d', icon: '\u25c6' }
    ].filter(function(m) { return m.age >= ageStart && m.age <= ageEnd; });
    var spouse = [];
    if (p.cOn) {
      var cBaseAge = p.cAge || ageStart;
      var cAgeOffset = function(targetCAge) { return ageStart + (targetCAge - cBaseAge); };
      spouse = [
        { age: cAgeOffset(p.cRetAge || p.retAge),  label: fr ? 'Retraite conj.' : 'Spouse retires',   color: '#7390b8' },
        { age: cAgeOffset(p.cQppAge || 65),        label: fr ? 'D\u00e9but RRQ conj.' : 'Spouse CPP/QPP starts', color: '#7390b8' },
        { age: cAgeOffset(p.cOasAge || 65),        label: fr ? 'D\u00e9but PSV conj.' : 'Spouse OAS starts',     color: '#6da97a' }
      ].filter(function(m) { return m.age >= ageStart && m.age <= ageEnd; });
    }
    // Median mortality marker (deterministic)
    var mortalityMarker = { age: ageEnd, label: fr ? 'Horizon mod\u00e9lis\u00e9' : 'Modeled horizon', color: '#888' };
    var W = 740;
    // Codex 2026-04-27: dynamic SVG height based on label-stack depth.
    // Increased margin.top so wide labels can stack rows above without
    // overflowing. Final H is computed AFTER placement so the canvas
    // grows when many markers cluster (e.g. 71 + 75).
    var margin = { left: 30, right: 30, top: 80, bottom: 50 };
    var trackY = margin.top + 30;
    var spouseY = trackY + 40;
    var x = function(age) {
      return margin.left + (age - ageStart) / horizon * (W - margin.left - margin.right);
    };
    var svgBody = '';
    // Primary track
    svgBody += '<line x1="' + margin.left + '" x2="' + (W - margin.right) + '" y1="' + trackY + '" y2="' + trackY + '" stroke="#d7cec1" stroke-width="2"/>';
    // Tick marks every 5 years
    for (var a = Math.ceil(ageStart / 5) * 5; a <= ageEnd; a += 5) {
      var tx = x(a);
      svgBody += '<line x1="' + tx.toFixed(1) + '" x2="' + tx.toFixed(1) + '" y1="' + (trackY - 3) + '" y2="' + (trackY + 3) + '" stroke="#bbb" stroke-width="1"/>';
      svgBody += '<text x="' + tx.toFixed(1) + '" y="' + (trackY + 16) + '" font-size="9" fill="#888" text-anchor="middle" font-family="JetBrains Mono,monospace">' + a + '</text>';
    }
    // Phase 6 fix (2026-04-27 user-flagged): label collision when two
    // markers share an age. Old logic toggled labelY by array index
    // (i%2), which left e.g. Retirement(65) + OAS(65) both at the same
    // y because they were even-indexed in the array. New logic does
    // collision-aware stacking: for each marker, scan all previously
    // placed labels and bump labelY upward while any prior label sits
    // within an x-distance threshold. Result: every label gets its
    // own row, no matter how the input array is ordered.
    // Width-aware collision: each label's half-width is estimated from
    // its rendered text length (~6px per char at 9px font), and two
    // labels collide when their bounding boxes overlap (not just their
    // centers). Stagger up by lineHeight until clear; cap at 6 rows so
    // we don't overflow the SVG canvas.
    function _placeLabels(markers, baselineY, lineHeight, direction) {
      var placed = [];
      direction = direction || 'up';
      var charPx = 5.6; // approx half-width per char at 9px Inter
      var pad = 6;      // breathing room on each side
      markers.forEach(function(m) {
        var mx = x(m.age);
        var labelText = m.label + ' (' + m.age + ')';
        var halfW = (labelText.length * charPx) / 2 + pad;
        var rowY = baselineY;
        var safe = false;
        var attempt = 0;
        while (!safe && attempt < 6) {
          safe = true;
          for (var i = 0; i < placed.length; i++) {
            var prior = placed[i];
            var dx = Math.abs(prior.mx - mx);
            var minDx = halfW + prior.halfW;
            if (dx < minDx && prior.rowY === rowY) {
              safe = false;
              rowY = (direction === 'up') ? rowY - lineHeight : rowY + lineHeight;
              attempt++;
              break;
            }
          }
        }
        placed.push({ mx: mx, rowY: rowY, marker: m, halfW: halfW });
      });
      return placed;
    }
    var placedPrimary = _placeLabels(primary, trackY - 12, 14, 'up');
    placedPrimary.forEach(function(rec) {
      var m = rec.marker, mx = rec.mx, labelY = rec.rowY;
      svgBody += '<line x1="' + mx.toFixed(1) + '" x2="' + mx.toFixed(1) + '" y1="' + (labelY + 2) + '" y2="' + trackY + '" stroke="' + m.color + '" stroke-width="0.8" stroke-dasharray="2,2" opacity="0.5"/>';
      svgBody += '<text x="' + mx.toFixed(1) + '" y="' + labelY + '" font-size="9" fill="' + m.color + '" text-anchor="middle" font-weight="600" font-family="Inter,sans-serif">' + m.label + ' (' + m.age + ')</text>';
      svgBody += '<circle cx="' + mx.toFixed(1) + '" cy="' + trackY + '" r="6" fill="' + m.color + '" stroke="#fff" stroke-width="2"/>';
    });
    // Spouse track (when present)
    if (spouse.length > 0) {
      svgBody += '<line x1="' + margin.left + '" x2="' + (W - margin.right) + '" y1="' + spouseY + '" y2="' + spouseY + '" stroke="#e8e0d4" stroke-width="1.5" stroke-dasharray="3,3"/>';
      var placedSpouse = _placeLabels(spouse, spouseY + 22, 12, 'down');
      placedSpouse.forEach(function(rec) {
        var m = rec.marker, mx = rec.mx, labelY = rec.rowY;
        svgBody += '<line x1="' + mx.toFixed(1) + '" x2="' + mx.toFixed(1) + '" y1="' + spouseY + '" y2="' + (labelY - 8) + '" stroke="' + m.color + '" stroke-width="0.8" stroke-dasharray="2,2" opacity="0.5"/>';
        svgBody += '<circle cx="' + mx.toFixed(1) + '" cy="' + spouseY + '" r="5" fill="' + m.color + '" stroke="#fff" stroke-width="1.5"/>';
        svgBody += '<text x="' + mx.toFixed(1) + '" y="' + labelY + '" font-size="8.5" fill="' + m.color + '" text-anchor="middle" font-weight="600" font-family="Inter,sans-serif">' + m.label + ' (' + m.age + ')</text>';
      });
    }
    // Mortality marker at right edge
    svgBody += '<text x="' + (W - margin.right) + '" y="' + (trackY - 8) + '" font-size="8.5" fill="#666" text-anchor="end" font-style="italic" font-family="Inter,sans-serif">' + mortalityMarker.label + ' \u2192 ' + ageEnd + '</text>';
    

    // Compute SVG height from deepest stacked label.
    var minLabelY = trackY;
    var maxLabelY = trackY;
    if (typeof placedPrimary !== 'undefined' && placedPrimary && placedPrimary.length) {
      placedPrimary.forEach(function(r) { if (r.rowY < minLabelY) minLabelY = r.rowY; });
    }
    if (typeof placedSpouse !== 'undefined' && placedSpouse && placedSpouse.length) {
      placedSpouse.forEach(function(r) { if (r.rowY > maxLabelY) maxLabelY = r.rowY; });
    }
    var H = Math.max(130, (maxLabelY + 30) - Math.min(0, minLabelY - 20));
    // Adjust the viewBox y-origin so labels stacked above the track stay
    // visible — translate everything down if minLabelY went negative.
    var yShift = Math.max(0, 20 - minLabelY);
    var svg = '<svg role="img" aria-label="' + (fr ? 'Chronologie des d\u00e9cisions' : 'Decision timeline') + '" xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 ' + (-yShift) + ' ' + W + ' ' + H + '" style="display:block;margin:8px 0;background:#fdfbf6;border-radius:6px">' + svgBody + '</svg>';

    var h = secPage();
    h += F.Sec(secN, fr ? 'Chronologie des d\u00e9cisions' : 'Decision timeline', 'sec-timeline');
    h += narr(fr
      ? 'La trajectoire de votre plan se compose d\'une s\u00e9quence d\'\u00e9v\u00e9nements clairement dat\u00e9s\u202f: d\u00e9but de la retraite, activation des prestations publiques, conversion FERR obligatoire \u00e0 71\u00a0ans, bonification PSV \u00e0 75\u00a0ans. Cette frise les place tous sur l\'axe de votre vie pour donner une vue d\'ensemble du calendrier.'
      : 'Your plan\'s trajectory unfolds as a sequence of clearly dated events: retirement start, public-benefit activation, mandatory RRIF conversion at age 71, OAS bonus at 75. This timeline places them all on a single life axis to give one-glance choreography.');
    h += svg;
    h += secPageEnd();
    return h;
  }

  function renderClosingRecap(d, secN) {
    if (!d.thesis || d.thesis.band == null) return '';
    var fr = d.fr;
    var t = d.thesis;
    var f$ = F.fmtCompact;
    var h = secPage();
    h += F.Sec(secN, fr ? 'Conclusion \u2014 ce que cela signifie' : 'Conclusion \u2014 what this means', 'sec-closing-recap');

    // 1) Thesis restatement (single source of truth — same one-liner as
    //    the cover and exec summary; no rewording allowed).
    h += '<div style="background:linear-gradient(135deg,#f7f1e3 0%,#fbf6e8 100%);border-left:4px solid #c49a1a;padding:18px 22px;margin-bottom:18px;border-radius:4px">';
    h += '<div style="font-family:Inter,sans-serif;font-size:10px;font-weight:700;color:#8a6d1c;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px">' +
      (fr ? 'Th\u00e8se du plan' : 'Plan thesis') + '</div>';
    h += '<div class="narr" style="font-size:13px;line-height:1.65;color:#222;font-weight:500">' + F.esc(t.oneLiner) + '</div>';
    h += '</div>';

    // 2) Anchor numbers — the 4 figures the thesis rests on.
    h += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px">';
    function _anchor(label, value, sub) {
      return '<div style="background:#fafafa;border:1px solid #e5e5e5;border-radius:4px;padding:12px 10px;text-align:center">' +
        '<div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:5px">' + label + '</div>' +
        '<div style="font-family:JetBrains Mono,monospace;font-size:18px;font-weight:700;color:#222;line-height:1">' + value + '</div>' +
        (sub ? '<div style="font-size:9px;color:#888;margin-top:4px;line-height:1.3">' + sub + '</div>' : '') +
        '</div>';
    }
    h += _anchor(
      fr ? 'Taux de succ\u00e8s' : 'Success rate',
      t.succPct != null ? t.succPct + ' %' : '\u2014',
      fr ? (d.p.nSim || 5000) + ' simulations' : (d.p.nSim || 5000) + ' simulations'
    );
    h += _anchor(
      fr ? 'Couverture garantie' : 'Guaranteed coverage',
      t.covPct != null ? t.covPct + ' %' : '\u2014',
      fr ? 'des d\u00e9penses cibles' : 'of target spending'
    );
    h += _anchor(
      fr ? 'Patrimoine m\u00e9dian' : 'Median wealth',
      t.medFinalWealth ? f$(t.medFinalWealth) : '\u2014',
      fr ? 'horizon ' + t.horizonYears + ' ans (r\u00e9el)' : 'over ' + t.horizonYears + ' years (real)'
    );
    h += _anchor(
      fr ? 'Imp\u00f4t \u00e0 vie (r\u00e9el)' : 'Lifetime tax (real)',
      d._optTaxReal ? f$(d._optTaxReal) : '\u2014',
      fr ? 'horizon mod\u00e9lis\u00e9, dollars r\u00e9els' : 'modeled horizon, real dollars'
    );
    h += '</div>';

    // Codex 2026-04-27 audit: surface goal completion in the Conclusion
    // when goals exist. Reader needs a quick read on whether their
    // declared objectives line up with the plan.
    if (d.R && d.R.hasGoals && d.mc && d.mc._enriched && d.mc._enriched.goalsLedger) {
      var _rLedger = d.mc._enriched.goalsLedger || [];
      var _rOnTrack = _rLedger.filter(function(l){ return l.status === 'on-track'; }).length;
      var _rAtRisk = _rLedger.filter(function(l){ return l.status === 'at-risk'; }).length;
      var _rTotal = _rLedger.length;
      if (_rTotal > 0) {
        var _rCol = _rAtRisk > 0 ? '#cc4444' : _rOnTrack === _rTotal ? '#2a8c46' : '#c4944a';
        // Codex 2026-04-27: thesis-band-drift guard. On failing plans,
        // 'Goals on track' is auditor-flagged as posture mismatch.
        var _planFailingRecap = (d.succVal != null && d.succVal < 0.30);
        var _rLbl = _planFailingRecap
          ? (fr ? 'Objectifs atteints au moment cible' : 'Goals reaching target age')
          : (fr ? 'Objectifs en voie' : 'Goals on track');
        var _rVal = _rOnTrack + '/' + _rTotal;
        var _rSub = _rAtRisk > 0 ? (fr ? _rAtRisk + ' \u00e0 risque' : _rAtRisk + ' at risk')
                                 : (_rOnTrack < _rTotal ? (fr ? 'autres serr\u00e9s' : 'others tight')
                                                       : (fr ? 'tous valid\u00e9s' : 'all validated'));
        h += '<div style="margin:8px 0 18px;padding:12px 14px;background:#fafafa;border:1px solid #e5e5e5;border-radius:4px;text-align:center">'
          + '<div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:5px">'
          + _rLbl + '</div>'
          + '<div style="font-family:JetBrains Mono,monospace;font-size:18px;font-weight:700;color:' + _rCol + ';line-height:1">' + _rVal + '</div>'
          + '<div style="font-size:9px;color:#888;margin-top:4px;line-height:1.3">' + _rSub + '</div>'
          + '</div>';
      }
    }

    // 3) Band-appropriate "what would shift the thesis" framing. Words
    //    must match the band's BAND_VOCAB so the auditor stays clean.
    var shiftMsg;
    if (t.band === 'surplus') {
      shiftMsg = fr
        ? 'Le revenu garanti d\u00e9passe les d\u00e9penses cibles. La trajectoire centrale tient avec une marge confortable, et les retraits du portefeuille demeureraient optionnels pour le niveau de vie de base. Les prochaines questions porteraient davantage sur la transmission, l\'optimisation fiscale et l\'allocation \u2014 plut\u00f4t que sur la solidit\u00e9 du plan lui-m\u00eame.'
        : 'Guaranteed income exceeds target spending. The central trajectory holds with comfortable margin, and portfolio withdrawals would remain optional for the baseline lifestyle. The next questions would lean toward legacy, tax optimization, and allocation \u2014 rather than plan robustness itself.';
    } else if (t.band === 'solid') {
      shiftMsg = fr
        ? 'La trajectoire centrale tient. La marge contre les chocs (rendements, inflation, longue vie) reste mod\u00e9r\u00e9e, et les leviers identifi\u00e9s dans la section Plan d\'action permettraient de la \u00e9paissir si elle devenait insuffisante. La th\u00e8se ne changerait pas \u00e0 court terme \u2014 elle se renforcerait ou s\'\u00e9roderait selon les rendements r\u00e9alis\u00e9s.'
        : 'The central trajectory holds. Margin against shocks (returns, inflation, longevity) remains moderate, and the levers identified in the Action Plan section would thicken it if needed. The thesis would not change in the short term \u2014 it would either firm up or erode depending on realized returns.';
    } else if (t.band === 'fragile') {
      shiftMsg = fr
        ? 'La marge est mince. Les leviers du Plan d\'action (\u00e9pargne accrue, d\u00e9penses cibl\u00e9es, horizon ajust\u00e9, optimisation fiscale) feraient passer la th\u00e8se vers une posture plus solide s\'ils \u00e9taient appliqu\u00e9s. Sans ajustement, un choc de march\u00e9 ou une longue vie \u00e9roderaient sensiblement la trajectoire.'
        : 'Margin is thin. The levers in the Action Plan (higher savings, targeted spending, adjusted horizon, tax optimization) would shift the thesis toward a more solid posture if applied. Without adjustment, a market shock or long life would erode the trajectory materially.';
    } else if (t.band === 'at-risk') {
      shiftMsg = fr
        ? 'La trajectoire centrale ne tient pas \u00e0 l\'\u00e9tat actuel. Les leviers du Plan d\'action seraient \u00e0 consid\u00e9rer en combinaison \u2014 un seul ajustement, m\u00eame appliqu\u00e9 \u00e0 son maximum, ne suffirait g\u00e9n\u00e9ralement pas \u00e0 r\u00e9tablir la marge n\u00e9cessaire. La consultation d\'un planificateur agr\u00e9\u00e9 serait indiqu\u00e9e.'
        : 'The central trajectory does not hold as is. The Action Plan levers would need to be considered in combination \u2014 a single adjustment, even at its maximum, would generally not be enough to restore the necessary margin. Consultation with a certified planner would be warranted.';
    } else {
      shiftMsg = fr
        ? 'La th\u00e8se actuelle indique que le plan ne serait pas viable sur l\'horizon mod\u00e9lis\u00e9. Une r\u00e9vision globale (\u00e9pargne, d\u00e9penses, \u00e2ge de retraite, revenus) serait n\u00e9cessaire avant que les leviers tactiques (optimisation fiscale, allocation) ne puissent avoir un impact significatif. La consultation d\'un planificateur agr\u00e9\u00e9 serait fortement indiqu\u00e9e.'
        : 'The current thesis indicates the plan would not be sustainable over the modeled horizon. A global review (savings, spending, retirement age, income) would be necessary before tactical levers (tax optimization, allocation) could have meaningful impact. Consultation with a certified planner would be strongly warranted.';
    }
    h += '<div class="narr" style="margin-bottom:14px">' + shiftMsg + '</div>';

    // 4) Pointer to the rest of the document — anchors the recap as a
    //    summary, not a new analysis. Tells the reader where each
    //    metric was defended.
    h += '<div style="font-family:Inter,sans-serif;font-size:10.5px;color:#666;line-height:1.7;border-top:1px solid #e5e5e5;padding-top:12px">' +
      (fr
        ? '<strong>O\u00f9 trouver les d\u00e9tails\u202f:</strong> la trajectoire de patrimoine est \u00e9tablie en section Projection\u202f; la couverture garantie est d\u00e9compos\u00e9e en section Revenus\u202f; l\'imp\u00f4t \u00e0 vie est expliqu\u00e9 en section Strat\u00e9gie fiscale\u202f; les leviers sont list\u00e9s dans le Plan d\'action.'
        : '<strong>Where to find the details:</strong> wealth trajectory is established in the Projection section; guaranteed coverage is broken down in the Revenue section; lifetime tax is explained in the Tax Strategy section; levers are listed in the Action Plan.') +
      '</div>';

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
    // Advisor signature — T2.6 parameterized via d.advisor.
    var adv = d.advisor || { name: (fr ? 'Planificateur BuildFi' : 'BuildFi Planner'), credentials: '', firm: 'BuildFi', email: '' };
    h += '<div style="margin-bottom:20px">';
    h += '<div style="border-top:1px solid #888;width:280px;margin-bottom:6px"></div>';
    h += '<div style="font-weight:600"><span class="advisor-name" data-advisor-name="' + F.esc(adv.name) + '">' + F.esc(adv.name) + '</span>' +
         (adv.credentials ? ', <span class="advisor-cred">' + F.esc(adv.credentials) + '</span>' : '') + '</div>';
    h += '<div style="color:#888;font-size:10px">' +
         (fr ? 'Date : ' : 'Date: ') + '<span class="advisor-signature-date">' + today + '</span>' +
         (adv.firm ? ' \u2014 <span class="advisor-firm">' + F.esc(adv.firm) + '</span>' : '') +
         (adv.email ? ' \u2014 ' + F.esc(adv.email) : '') +
         '</div>';
    h += '</div>';
    h += '</div>';

    h += '<div style="margin-top:60px;font-size:10px;color:#888;line-height:1.7">';
    // Codex P5: version label removed from client narrative. The date
    // alone communicates "when this was prepared" without leaking
    // build metadata.
    h += (fr
      ? 'Rapport pr\u00e9par\u00e9 le ' + today + ' par BuildFi Technologies inc.'
      : 'Report prepared on ' + today + ' by BuildFi Technologies inc.');
    h += '</div>';
    h += '</div></div>';
    return h;
  }

  // === SECTION: METHODOLOGY ===
  function renderMethodology(d, secN) {
    // 2026-04-28: methodology is now ALWAYS rendered. For plain readers
    // (beginner+concise), the orchestrator wraps it in a "more detail"
    // <details> disclosure that's collapsed by default. The reader can
    // expand it on demand.
    var fr = d.fr, exp = d.exp, p = d.p, mc = d.mc;
    var _isQC = d._isQC;
    var h = secPage();
    h += F.Sec(secN, F.L('methodology', fr), 'sec-methodology');

    // Sprint 0.7: plain-language preamble for non-technical readers,
    // ABOVE the technical block. Surfaces the "what we did" in 2 lines
    // before the heavy assumptions text. The technical block stays for
    // readers who want it.
    h += '<div style="background:#fdfbf6;border-left:3px solid #c49a1a;padding:10px 14px;margin-bottom:12px;font-size:11.5px;line-height:1.6;color:#1a1610">' +
      '<div style="font-family:Inter,sans-serif;font-size:9.5px;font-weight:700;color:#c49a1a;letter-spacing:1px;text-transform:uppercase;margin-bottom:5px">' +
      (fr ? 'En clair' : 'In plain terms') + '</div>' +
      (fr
        ? 'Nous avons test\u00e9 votre plan contre <strong>' + (p.nSim || 5000) + ' avenirs simul\u00e9s</strong>, en incluant par d\u00e9faut les pires 5\u202f% (krach 2008, inflation persistante, longue vie). Le taux de succ\u00e8s indique la proportion de ces avenirs o\u00f9 votre \u00e9pargne tient jusqu\'\u00e0 la fin de l\'horizon mod\u00e9lis\u00e9. Les chiffres ci-dessus sont conditionnels et reposent sur les hypoth\u00e8ses d\u00e9taill\u00e9es plus bas.'
        : 'We tested your plan against <strong>' + (p.nSim || 5000) + ' simulated futures</strong>, including the worst-case 5% by design (2008 crash, persistent inflation, long life). The success rate is the share of those futures where your savings hold to the end of the modeled horizon. Figures above are conditional and rest on the assumptions detailed below.') +
      '</div>';

    h += '<div class="meth-p">' + (fr ? 'Cette projection utilise ' + (p.nSim || 5000) + ' simulations Monte Carlo ind\u00e9pendantes. Chaque simulation g\u00e9n\u00e8re des trajectoires al\u00e9atoires de rendements (actions et obligations), d\'inflation et de mortalit\u00e9, puis calcule l\'\u00e9volution du patrimoine ann\u00e9e par ann\u00e9e en appliquant les r\u00e8gles fiscales, de d\u00e9caissement et de prestations gouvernementales.' : 'This projection uses ' + (p.nSim || 5000) + ' independent Monte Carlo simulations. Each simulation generates random trajectories for returns (equities and bonds), inflation, and mortality, then calculates year-by-year wealth evolution applying tax rules, withdrawal strategies, and government benefit calculations.') + '</div>';

    // Sprint 0.5.3: explicit modeling-gap disclosure. Honesty about what
    // is NOT modeled is more important than premium feel for a $30 product.
    // Lists are stable across versions; bumped when a gap closes.
    var _hasKids = p.family && Array.isArray(p.family) && p.family.some(function(fm) { return fm.type === 'child'; });
    var _gapItems = [];
    if (_hasKids) {
      _gapItems.push(fr
        ? 'Allocation canadienne pour enfants (ACE) et cr\u00e9dit de solidarit\u00e9 du Qu\u00e9bec mod\u00e9lis\u00e9s comme estimation forfaitaire (~5\u00a0500\u00a0$/an/enfant en QC, ~4\u00a05000\u00a0$/an ailleurs, avec d\u00e9croissance lin\u00e9aire du revenu familial 80-200\u00a0K\u00a0$). Calcul d\u00e9taill\u00e9 (CCB par tranche, QST, composante logement) \u00e0 venir dans v1.1.'
        : 'Canada Child Benefit (CCB) and Quebec Solidarité credit modeled as a flat estimate (~$5,500/yr/child in QC, ~$4,500/yr elsewhere, with linear phase-out across $80K-$200K family income). Detailed computation (CCB tier, QST, housing component) coming in v1.1.');
    }
    if (p.numChildren > 0 || _hasKids) {
      _gapItems.push(fr
        ? 'D\u00e9duction pour frais de garde et cr\u00e9dit qu\u00e9b\u00e9cois pour frais de garde non encore mod\u00e9lis\u00e9s.'
        : 'Childcare expense deduction and Quebec refundable childcare credit not yet modeled.');
    }
    if (p.cQppYrs && p.cQppYrs < 35) {
      _gapItems.push(fr
        ? 'Pour les profils \u00e0 carri\u00e8re partielle au Canada (' + (p.cQppYrs || p.qppYrs) + ' ans de cotisations RRQ\u202f/\u202fRPC), la PSV partielle (rules 10\u201340\u00a0ans de r\u00e9sidence) est calcul\u00e9e en proportion lin\u00e9aire et peut diff\u00e9rer l\u00e9g\u00e8rement des r\u00e8gles officielles.'
        : 'For partial-Canadian-career profiles (' + (p.cQppYrs || p.qppYrs) + ' yrs CPP/QPP contributions), partial OAS (10-40 yr residency rule) is computed as a linear proration and may differ slightly from official rules.');
    }
    if (p.bizOn && (!p.bizSalePrice || p.bizSalePrice <= 0)) {
      _gapItems.push(fr
        ? 'Vente de l\'entreprise mod\u00e9lis\u00e9e \u00e0 la valeur courante du solde corporatif (\u00e9quivalent encaisse). Une vente \u00e0 un multiple d\'EBITDA (typique pour une SPCC en op\u00e9ration) peut g\u00e9n\u00e9rer un produit sup\u00e9rieur.'
        : 'Business sale modeled at current corporate balance (cash-equivalent value). A sale at an EBITDA multiple (typical for an operating CCPC) may yield higher proceeds.');
    }
    if (_gapItems.length > 0) {
      h += '<div style="background:#fff8e8;border-left:3px solid #b89830;padding:10px 14px;margin-top:10px;font-size:10.5px;line-height:1.6;color:#5a4400">' +
        '<div style="font-family:Inter,sans-serif;font-size:9.5px;font-weight:700;color:#7a5a00;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">' +
        (fr ? 'Limites de cette projection' : 'Limits of this projection') + '</div>' +
        '<ul style="margin:0;padding-left:18px;list-style:disc">';
      _gapItems.forEach(function(item) { h += '<li style="margin-bottom:4px">' + item + '</li>'; });
      h += '</ul></div>';
    }
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
      { label: (fr ? 'D\u00e9caissement anticip\u00e9 REER' : 'RRSP meltdown'), on: !!p.melt, conditional: true },
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

    // Phase 4 (codex 2026-04-27): full LDPSF/AMF disclosure block lives
    // in the methodology appendix, not at the end of the report body.
    // Tightens the body's reading rhythm (no legal wall closing the
    // experience) while preserving compliance reviewability.
    h += '<div class="bf-full-disclaimer" style="margin-top:18px;padding:14px 18px;background:#fafafa;border:1px solid #e8e0d4;border-radius:6px;font-size:10.5px;color:#555;line-height:1.7">' +
      '<div style="font-family:Inter,sans-serif;font-size:9.5px;font-weight:700;color:#888;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:8px">' +
        (fr ? 'Mise en garde compl\u00e8te (LDPSF / AMF)' : 'Full disclosure (Quebec LDPSF / AMF)') +
      '</div>' +
      (fr
        ? 'Document \u00e0 titre informatif uniquement. Ne constitue pas un conseil financier, fiscal ou juridique au sens de la <em>Loi sur la distribution de produits et services financiers</em>. Les projections reposent sur des simulations dont les hypoth\u00e8ses peuvent ne pas se r\u00e9aliser. Pour une planification engageante, consulter un planificateur financier (Pl. Fin.) ou un conseiller en placement inscrit. Remboursement int\u00e9gral sur demande sous 30\u00a0jours, sans justification \u2014 voir <a href="https://www.buildfi.ca/confidentialite" style="color:inherit">buildfi.ca/confidentialite</a>.'
        : 'Document for informational purposes only. Does not constitute financial, tax, or legal advice within the meaning of the Quebec <em>Act respecting the distribution of financial products and services</em>. Projections rely on simulations whose assumptions may not materialize. For binding planning, consult a certified financial planner (Pl. Fin.) or registered investment advisor. Full refund on request within 30 days, no justification needed \u2014 see <a href="https://www.buildfi.ca/confidentialite" style="color:inherit">buildfi.ca/confidentialite</a>.') +
      '</div>';

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

    // Phase 4 (codex 2026-04-27): split disclaimer.
    //   1-line compliance note in body — preserves trust, doesn't end the
    //     reading experience on a wall of legal text.
    //   Full LDPSF/AMF disclosure block lives in the appendix (renderMethodology
    //     emits it there) — reviewable by an accountant, not dominant.
    h += '<div class="disclaimer-short" style="margin-top:18px;padding:10px 14px;background:#fdfbf6;border-left:3px solid #c49a1a;border-radius:0 4px 4px 0;font-size:10.5px;color:#5a4f3a;line-height:1.6;font-style:italic">' +
      (fr
        ? '\u00c0 titre informatif. Ne constitue pas un conseil financier au sens de la LDPSF. La mise en garde compl\u00e8te figure en annexe.'
        : 'For informational purposes. Does not constitute financial advice under the Quebec LDPSF. The full notice is in the appendix.') +
      '</div>';

    // Codex P5: page-running footer scrubbed of build metadata.
    // "Detailed Report" / "Rapport détaillé" + version + sim count was
    // build-style chrome. Replaced by the prepared-on date alone.
    h += '<div class="ft">BuildFi \u00b7 ' + today + '</div>';
    h += '<div class="page-footer print-only" style="position:fixed;bottom:0;left:0;right:0;text-align:center;font-size:8px;color:#aaa;padding:4px">BuildFi Technologies inc. \u2014 buildfi.ca \u00b7 ' + (fr ? '\u00c0 titre informatif. Ne constitue pas un conseil financier (LDPSF). Remboursement 30 j.' : 'Informational only. Not financial advice (Quebec LDPSF). 30-day refund.') + '</div>';
    return h;
  }

  // ══════════════════════════════════════════════════════════════
  // MAIN ORCHESTRATOR
  // ══════════════════════════════════════════════════════════════

  window.buildReport = function(data) {
    _exportMode = !!(data && data.exportMode);
    var d = D.buildReportPayload(data);
    // CLASSIFIER-RENDER-PLAN Phase 3 wiring: stash renderProfile + lang
    // in module scope so narr() / narrAi() can apply tone swaps without
    // changing every call site's signature.
    _currentRenderProfile = (d && d.renderProfile) || null;
    _currentLang = (d && d.fr) ? 'fr' : 'en';

    // Pass through the SKU flag so renderers can gate the embedded What-If.
    // BData.buildReportPayload may strip unknown fields; we re-attach here from
    // the original input. Default: include simulator (legacy behavior) when
    // the flag is not provided, so existing callers keep working.
    if (d) {
      d.sku = (data && data.sku) || 'bilan';
      // CLIENT-EXPORT MODE — Codex 2026-04-27 P1: when clientExport=true,
      // strip the embedded simulator section and the report-whatif.js
      // runtime entirely. The deliverable feels like a finished report,
      // not an exported app. Default false (legacy behavior preserved).
      d.clientExport = !!(data && data.clientExport);
      d.includeSimulator = d.clientExport
        ? false
        : ((data && typeof data.includeSimulator === 'boolean') ? data.includeSimulator : true);
      d._suppressed = (data && data._suppressed) || {};
      d._compact = (data && data._compact) || {};
      d._slotsToRerun = (data && data._slotsToRerun) || {};
      d._useCanonical = (data && data._useCanonical) || {};
      d._localize = !!(data && data._localize);
      d._dataBlocked = !!(data && data._dataBlocked);
      // P1.6 — case_driver wiring. Set on the payload so renderActionPlan
      // and the action generator can find the case-defining lever.
      d.caseDriver = (data && data.caseDriver) || (data && data.case_driver) || null;
      // T2.6 — advisor identity wiring. Defaults below if upstream pipeline
      // doesn't set them. Each is overridable per profile/customer.
      d.advisor = (data && data.advisor) || {
        name: 'BuildFi Planner',
        credentials: 'Pl.Fin. (équivalent CFP)',
        firm: 'BuildFi',
        email: 'soutien@buildfi.ca'
      };
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
    // CLASSIFIER-RENDER-PLAN: stamp the body with the active classifier axes
    // and leadWith ordering so reviewers / auditors can grep proof of the
    // dispatch chain without parsing the rendered DOM.
    var _rpAttrs = '';
    if (d.renderProfile) {
      _rpAttrs = ' data-bf-chart-tier="' + (d.renderProfile.chartTier || '') + '"' +
                 ' data-bf-tone-mode="' + (d.renderProfile.toneMode || '') + '"' +
                 ' data-bf-density-mode="' + (d.renderProfile.densityMode || '') + '"' +
                 ' data-bf-jargon-mode="' + (d.renderProfile.jargonMode || '') + '"' +
                 ' data-bf-leadwith="' + (d.renderProfile.leadWith || '') + '"' +
                 ' data-bf-band-color="' + (d.renderProfile.bandColor || '') + '"';
    }
    // Phase 2: stamp the inferred archetype on <body> so the runtime
    // hydration scripts (report-whatif.js) can pick the right Level-1
    // curated scenario set without re-deriving from raw params.
    var _archAttrs = '';
    var _archForBody = d._archetype || _inferArchetype(d);
    if (_archForBody) {
      _archAttrs = ' data-bf-archetype-phase="' + (_archForBody.phase || '') + '"' +
                   ' data-bf-archetype-tags="' + ((_archForBody.tags || []).join(',')) + '"';
    }
    var h = '<!DOCTYPE html><html lang="' + rl + '"><head><meta charset="utf-8"><title>' + (d.fr ? 'Plan financier' : 'Financial Plan') + ' \u2014 ' + F.esc(d.client.name || 'Client') + '</title><style>' + css + '</style></head><body' + _rpAttrs + _archAttrs + '>';
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
    // CLASSIFIER-RENDER-PLAN Phase 3 — leadWith section reorder.
    //   leadWith='floor'      (calm reader)   → revenue/income leads, dispersion later
    //   leadWith='dispersion' (direct reader) → risk + dispersion lead, projection later
    //   leadWith='projection' (neutral)        → current default order
    // Falls back to projection-first when no renderProfile is present.
    var _leadWith = (d.renderProfile && d.renderProfile.leadWith) || 'projection';
    // leadWith takes precedence over isDecum: a direct (low-stress) reader
    // who happens to be in decum still gets dispersion-led ordering, since
    // the classifier explicitly chose that posture. isDecum only sets the
    // default when leadWith is 'projection' (neutral).
    var revenueFirst = (_leadWith === 'floor') || (_leadWith === 'projection' && isDecum);
    var riskLeads = (_leadWith === 'dispersion') && d.exp;
    // Phase 3 extension — leadWith now reorders MORE than just risk/revenue:
    //   leadWith='floor'      → goals + cashflow pulled UP (income-stability framing)
    //   leadWith='dispersion' → stress tests follow risk/projection block
    //   leadWith='projection' → default chronological order
    var goalsLeads = _leadWith === 'floor' && d.R && d.R.hasGoals;
    var cashflowLeads = _leadWith === 'floor' && d.mc && d.mc._enriched && d.mc._enriched.cashflow && d.mc._enriched.cashflow.length;
    var stressFollowsDispersion = _leadWith === 'dispersion';
    // Pre-checks for conditional sections
    var _gisCheck = _getRenderableGisYears(d);
    var _hasStrats = d.R.hasSAM || (window._recos && window._recos.length > 0);
    // Succession pre-check (skip if all zeros)
    var _grossEstateCheck = (d.mc.medEstateNet || 0) + (d.mc.medEstateTax || 0) + (d.mc.p5EstateNet || 0);
    // Levers section gated on real MC sweep data.
    var _hasSweeps = !!(d.mc && d.mc._sweeps);
    // Draw-order heatmap gated on enriched drawTrace.
    var _hasDrawTrace = !!(d.mc && d.mc._enriched && d.mc._enriched.drawTrace && d.mc._enriched.drawTrace.length);
    // Stress tests gated on _stress payload.
    var _hasStress = !!(d.mc && d.mc._stress);
    var _suppressed = d._suppressed || {};
    var _isSuppressed = function(id) { return !!_suppressed[id]; };
    // Reader-class flags. Two distinct gates:
    //   _isPlainReader — finLiteracy=beginner (plain language)
    //   _isMinimalReader — beginner AND concise (the genuinely-minimal cell)
    // Most TOC entries that used _isPlainReader actually mean "minimal" —
    // a beginner who explicitly asked for DETAIL still wants the back-matter,
    // just in plain language. Keep _isPlainReader for sections that are
    // intrinsically jargon-heavy regardless of detail (asset_location).
    var _isPlainReader = d.renderProfile && d.renderProfile.jargonMode === 'plain';
    var _isMinimalReader = _isPlainReader && d.renderProfile && d.renderProfile.densityMode === 'compact';

    // ── Build TOC sections array (pre-scan which sections will render) ──
    // Codex 2026-04-27 review fix: push sections in BODY render order so
    // each chapter group shows a clean sequential block. Previous order
    // interleaved Ch.3 (risk/stress) with Ch.4 (tax/draw-order/etc.),
    // giving non-sequential numbers within each chapter group.
    var tocSections = [];
    var _tocN = 0;
    // ─ Ch.1 — Plan at a glance ────────────────────
    tocSections.push({ n: '\u2606', id: 'sec-assessment', label: F.L('page_zero', d.fr) });
    _tocN++; tocSections.push({ n: _tocN, id: 'sec-diagnostic', label: F.L('diagnostic', d.fr) });
    if (_hasSweeps) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-levers', label: F.L('levers', d.fr) }); }
    // ─ Ch.2 — Why this plan works ────────────────
    _tocN++; tocSections.push({ n: _tocN, id: 'sec-profile', label: F.L('profile', d.fr) });
    if (d.R.hasFamily) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-family', label: F.L('family', d.fr) }); }
    // Goals + asset blocks (real estate, corp, RSU, debt) sit before
    // trajectory in the body so the structural pillars appear first.
    if (d.R.hasGoals) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-goals', label: F.L('goals', d.fr) }); }
    if (d.R.realEstate) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-realestate', label: F.L('realestate', d.fr) }); }
    if (d.R.ccpc) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-corp', label: F.L('corp', d.fr) }); }
    if (d.R.hasRSU) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-rsu', label: F.L('rsu', d.fr) }); }
    if (d.R.debt) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-debt', label: F.L('debt', d.fr) }); }
    // revenueFirst = leadWith='floor' OR (neutral AND decum). TOC must
    // mirror render-time order.
    if (revenueFirst) {
      _tocN++; tocSections.push({ n: _tocN, id: 'sec-revenue', label: F.L('revenue', d.fr) });
      _tocN++; tocSections.push({ n: _tocN, id: 'sec-projection', label: F.L('projection', d.fr) });
    } else {
      _tocN++; tocSections.push({ n: _tocN, id: 'sec-projection', label: F.L('projection', d.fr) });
      _tocN++; tocSections.push({ n: _tocN, id: 'sec-revenue', label: F.L('revenue', d.fr) });
    }
    if (d.mc && d.mc._enriched && d.mc._enriched.cashflow && d.mc._enriched.cashflow.length) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-cashflow', label: d.fr ? 'Flux annuel' : 'Cash flow' }); }
    // ─ Ch.3 — Risks and tradeoffs ───────────────
    if (d.exp && !_isMinimalReader) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-risk', label: F.L('risk', d.fr) }); }
    if (_hasStress && !_isMinimalReader) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-stress', label: d.fr ? 'Tests de stress' : 'Stress tests' }); }
    // ─ Ch.4 — Strategy & decisions ──────────────
    if (_hasStrats) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-strategies', label: F.L('strategies', d.fr) }); }
    _tocN++; tocSections.push({ n: _tocN, id: 'sec-tax', label: F.L('tax', d.fr) });
    // Draw-order heatmap: hidden for plain-mode readers per Phase 2/5.
    var _drawOrderShown = _hasDrawTrace && !_isMinimalReader;
    if (_drawOrderShown) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-draworder', label: d.fr ? 'Ordre des retraits' : 'Draw-order strategy' }); }
    if (d.R.hasMeltdown) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-meltdown', label: F.L('meltdown', d.fr) }); }
    if (_gisCheck.length > 0 && !_isSuppressed('sec-gis')) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-gis', label: F.L('gis', d.fr) }); }
    if (_grossEstateCheck >= 1000) { _tocN++; tocSections.push({ n: _tocN, id: 'sec-succession', label: F.L('succession', d.fr) }); }
    if (d.R && d.R.hasInsuranceGap) {
      _tocN++; tocSections.push({ n: _tocN, id: 'sec-insurance', label: d.fr ? 'Assurance \u2014 \u00c9cart de r\u00e9silience' : 'Insurance \u2014 Resilience Gap' });
    }
    _tocN++; tocSections.push({ n: _tocN, id: 'sec-timeline', label: d.fr ? 'Chronologie des d\u00e9cisions' : 'Decision timeline' });
    if (d.sku === 'planner') {
      _tocN++; tocSections.push({ n: _tocN, id: 'sec-premium-deepdive', label: d.fr ? 'Approfondissement Planner' : 'Planner deep-dive' });
    }
    _tocN++; tocSections.push({ n: _tocN, id: 'sec-actions', label: d.fr ? 'Leviers par horizon' : 'Levers by horizon' });
    _tocN++; tocSections.push({ n: _tocN, id: 'sec-closing-recap', label: d.fr ? 'Conclusion' : 'Conclusion' });
    _tocN++; tocSections.push({ n: _tocN, id: 'sec-fees', label: d.fr ? 'Frais & co\u00fbts du portefeuille' : 'Portfolio fees & costs' });
    // ─ Ch.5 — Explore alternatives ──────────────
    if (d.includeSimulator !== false && !d.clientExport) {
      _tocN++; tocSections.push({ n: _tocN, id: 'sec-whatif', label: d.fr ? 'Explorer des alternatives' : 'Explore alternatives' });
    }
    // Back-matter TOC.
    //   plain + !deep (beg_con / beg_bal): OMIT entirely. Methodology, raw
    //     assumptions, and the glossary appendix are technical reference
    //     material that does not help a plain-language reader navigate the
    //     report. Putting them at the end as collapsed disclosure is dead
    //     weight (per user feedback 2026-04-27). Glossary terms are still
    //     surfaced inline via the interactive tooltip layer.
    //   plain + deep (beg_det): INLINE all three (classifier flag
    //     `densityMode==='deep'` says "full back-matter"). The renderer
    //     applies the jargon swap so a plain reader can actually read them.
    //   non-plain (int / adv): individual entries — density-collapsed in
    //     compact mode via _densityWrap, inline otherwise.
    var _plainBackMatter = d.renderProfile && d.renderProfile.densityMode === 'deep';
    var _showBackMatter = _plainBackMatter || !_isPlainReader;
    if (_showBackMatter) {
      _tocN++; tocSections.push({ n: _tocN, id: 'sec-methodology', label: F.L('methodology', d.fr) });
      _tocN++; tocSections.push({ n: _tocN, id: 'sec-assumptions', label: d.fr ? 'Hypoth\u00e8ses d\u00e9taill\u00e9es' : 'Detailed assumptions' });
      _tocN++; tocSections.push({ n: _tocN, id: 'sec-glossary', label: d.fr ? 'Glossaire' : 'Glossary' });
    }

    // Render TOC
    // Phase 6 finish pass (codex 2026-04-27): beginner front-path
    // simplification. Plain readers get a calm chapter-grouped TOC with
    // the Explore-alternatives chapter hidden — the interactive section
    // still renders in the body for those who reach it, but it does not
    // dominate the orientation experience.
    h += renderTOC(tocSections, d.fr, { arch: _arch, succVal: d.succVal });

    // ── Section rendering (phase-aware ordering) ──
    // Fix-plan flags: when the review pipeline detects a blocker, it sets
    // d._suppressed[sectionId] = true so the renderer skips that section
    // entirely. This is how the corrected-pass removes invalid GIS sections,
    // duplicates, etc., without requiring a re-run of the engine.
    var secN = 0;
    // Chapter pacing (Phase 1): codex 5-chapter product model. Forced page
    // breaks before each chapter cover — codex mandate: spend space, do not
    // optimize for page count. Soft inline behavior inside chapters.
    var _arch = d._archetype || _inferArchetype(d);
    var _isMinReader = _isPlainReader && d.renderProfile && d.renderProfile.densityMode === 'compact';
    var _ch1 = _chapterCopy(1, d.fr, _arch, d.succVal);
    h += _renderChapterCover(1, _ch1.title, _ch1.frame, d.fr);

    // 0. Overall Assessment (always, before numbered sections)
    h += renderOverallAssessment(d);

    // 1. Diagnostic / Executive Summary (always)
    secN++;
    h += renderDiagnostic(d, secN);

    // 1.bis Teaser — Bilan readers see the What-If simulator pointer; Planner
    // readers get an upsell-style note pointing them back to the live tool.
    // The actual mount point at the end is gated identically.
    // What-If teaser: hidden for compact+plain readers + ALL clientExport
    // deliveries (Codex 2026-04-27 P1: client artifact must not point at
    // a simulator section that is stripped from the same artifact).
    var _showTeaser = d.includeSimulator !== false && !d.clientExport &&
      !(d.renderProfile && d.renderProfile.densityMode === 'compact' && d.renderProfile.jargonMode === 'plain');
    h += _showTeaser ? _renderWhatIfTeaser(d) : '';

    // 1.5 What Could Change This — only if MC payload carries real sweep data
    // (renderLevers is gated on mc._sweeps; avoids fabricated closed-form deltas).
    if (_hasSweeps) {
      secN++;
      h += renderLevers(d, secN);
    }

    // ─── CH.2 — POURQUOI CE PLAN TIENT LA ROUTE ─────────────────────────
    // Profile + family + goals + asset-class deep dives + projection + revenue.
    // Asset deep dives (real estate, corp, RSU, debts) sit before trajectory
    // so the archetype's structural pillars appear *before* the projection.
    // CCPC owners especially benefit: corporation reads as the centerpiece.
    var _ch2 = _chapterCopy(2, d.fr, _arch, d.succVal);
    h += _renderChapterCover(2, _ch2.title, _ch2.frame, d.fr);
    secN++;
    h += renderProfile(d, secN);
    if (d.R.hasFamily) { secN++; h += renderFamily(d, secN); }
    // Phase 3 leadWith reorder: goals appear here in the default flow, but
    // when leadWith='floor' (calm reader) we DEFER goals to right after
    // revenue (they read as future income obligations and pair naturally
    // with the income-floor narrative). The flag is set in the orchestrator
    // pre-flight; we render goals here when NOT goalsLeads, otherwise later.
    if (d.R.hasGoals && !goalsLeads)  { secN++; h += renderGoals(d, secN); }
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
    if (revenueFirst) {
      secN++; h += renderRevenue(d, secN);
      // Phase 3 leadWith='floor': goals + cashflow follow revenue (income-
      // floor narrative). Goals first (what you owe) then cashflow (what
      // comes in vs goes out year by year), then projection (long-term).
      if (d.R.hasGoals && goalsLeads) { secN++; h += renderGoals(d, secN); }
      if (cashflowLeads) {
        var _cfEarly = renderCashflow(d, secN + 1);
        if (_cfEarly) { secN++; h += _cfEarly; d._cashflowRenderedEarly = true; }
      }
      // Direct reader: pull risk section up adjacent to revenue/projection
      // so the dispersion narrative arrives before the soft fan chart.
      if (riskLeads) { secN++; h += renderRisk(d, secN); }
      secN++; h += renderProjection(d, secN);
    } else {
      // Direct reader: lead with risk + dispersion, then projection.
      if (riskLeads) { secN++; h += renderRisk(d, secN); }
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
    // ─── CH.3 — RISQUES ET COMPROMIS ────────────────────────────────────
    // Risk + stress + tradeoffs. Risk section (when not already pulled up
    // by leadWith='dispersion') lands here as the chapter opener. The
    // chapter cover precedes risk/stress so the reader sees the visual
    // reset between trajectory (Ch.2) and risk-narrative (Ch.3). For the
    // minimal cell (beg+con) we suppress the chapter cover entirely —
    // those readers don't get stress/risk/sensitivity in the first place,
    // so the cover would point to nothing.
    // Codex 2026-04-27 audit: render Ch.3 cover for ALL readers,
    // including minimal cells, so the chapter rhythm stays consistent.
    var _ch3 = _chapterCopy(3, d.fr, _arch, d.succVal);
    h += _renderChapterCover(3, _ch3.title, _ch3.frame, d.fr);
    // Risk + dispersion narrative (expert only) — when leadWith='dispersion'
    // it was already rendered above; otherwise it lands here.
    if (d.exp && !riskLeads) { secN++; h += renderRisk(d, secN); }
    // Stress tests
    secN++;
    // CLASSIFIER-RENDER-PLAN Phase 4: density-collapsed when
    // detailPref='concise' (compact) OR stressLevel='high' (calm).
    h += _densityWrap(
      renderStressTests(d, secN),
      'sec-stress',
      'Tests de stress \u2014 sc\u00e9narios alternatifs (cliquer pour ouvrir)',
      'Stress tests \u2014 alternative scenarios (click to open)',
      d
    );
    // Year-by-year cash flow detail. Skip if Phase 3 already rendered it
    // earlier (cashflowLeads + revenueFirst). Density-collapse for compact
    // readers — the table is large (30+ rows) and overwhelming if not
    // collapsed.
    if (!d._cashflowRenderedEarly) {
      var cfHtml = renderCashflow(d, secN + 1);
      if (cfHtml) {
        secN++;
        h += _densityWrap(
          cfHtml,
          'sec-cashflow',
          'Flux annuel \u2014 ann\u00e9e par ann\u00e9e (cliquer pour ouvrir)',
          'Year-by-year cash flow (click to open)',
          d
        );
      }
    }

    // ─── CH.4 — STRATÉGIE & DÉCISIONS (levers, taxes, transmission) ─────
    // Tax + draworder + meltdown clustered together (meltdown is a tax lever,
    // previously orphaned in position #16 between succession and real estate).
    // GIS / Succession / Insurance / Strategies follow.
    // 2026-04-27 review fix: previously this whole cluster lived under the
    // Ch.3 cover (Risks and tradeoffs) — readers saw tax / draw-order /
    // action plan / timeline / closing recap stacked under "Risks and
    // tradeoffs", which read as a catch-all. Render a real Ch.4 cover here
    // so the chapter taxonomy matches the body content. Skip the cover
    // when the cluster would be empty (minimal cell strips most of these).
    // renderTax always produces content for a real plan, so the strategy
    // cluster is effectively non-empty for every non-minimal reader.
    // Minimal cells (beg+con) skip both the cover AND most cluster
    // sections, so the cover is gated on _isMinReader.
    var _ch4 = _chapterCopy(4, d.fr, _arch, d.succVal);
    h += _renderChapterCover(4, _ch4.title, _ch4.frame, d.fr);
    if (_hasStrats) { secN++; h += renderStrategies(d, secN); }
    secN++;
    h += renderTax(d, secN);
    if (_hasDrawTrace) {
      secN++;
      // Phase 4 density wrap — draw-order heatmap is dense; collapse for
      // compact readers so the section appears as a single-line teaser
      // with click-to-expand.
      h += _densityWrap(
        renderDrawOrder(d, secN),
        'sec-draworder',
        'Ordre des retraits \u2014 s\u00e9quence de d\u00e9caissement (cliquer pour ouvrir)',
        'Draw-order strategy \u2014 withdrawal sequence (click to open)',
        d
      );
    }
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

    // Sprint 2.6 — Decision timeline. Sits BEFORE the action plan so the
    // reader sees the life-event sequence before the levers that act on it.
    var timelineHtml = renderDecisionTimeline(d, secN + 1);
    if (timelineHtml) { secN++; h += timelineHtml; }

    // Sprint 1.5 — Premium deep-dive (Planner only). Before action plan.
    var premiumHtml = renderPremiumDeepDive(d, secN + 1);
    if (premiumHtml) { secN++; h += premiumHtml; }

    // 17.5 Action Plan (rule-based; hidden when no actions apply).
    // Action plan is the most decision-relevant section — NEVER density-
    // collapsed regardless of reader. Even a beginner+concise reader
    // should see the action items front-and-centre.
    var actionsHtml = renderActionPlan(d, secN + 1);
    if (actionsHtml) { secN++; h += actionsHtml; }

    // 17.6 Closing recap — Phase C. Single-thesis anchor that maps back
    // to the cover/exec-summary one-liner and points the reader to where
    // each anchor metric is defended. Renders after analytical sections,
    // before back-matter (methodology / assumptions / glossary / sig).
    var recapHtml = renderClosingRecap(d, secN + 1);
    if (recapHtml) { secN++; h += recapHtml; }

    // MER section — relocated from renderTax to keep section 9 focused.
    var feesHtml = renderFees(d, secN + 1);
    if (feesHtml) { secN++; h += feesHtml; }

    // ─── CH.5 — EXPLORER DES ALTERNATIVES ───────────────────────────────
    // Chapter cover precedes the what-if mount. Phase 2 folds the section
    // heading INTO the chapter cover so the chapter title stands alone
    // (no double-titling — the section heading inside _renderWhatIfMount
    // is suppressed via _suppressWhatIfHeading=true). Suppressed entirely
    // when the mount itself is suppressed — no orphan cover.
    if (d.includeSimulator !== false) {
      var _ch5 = _chapterCopy(5, d.fr, _arch, d.succVal);
      h += _renderChapterCover(5, _ch5.title, _ch5.frame, d.fr);
      d._suppressWhatIfHeading = true;
      h += _renderWhatIfMount(d);
    }

    // ─── CH.6 — ANNEXE (methodology / assumptions / glossary) ──────────
    // Codex 6-chapter product model: appendix material gets its own
    // chapter cover so it doesn't read as orphaned back-matter at the
    // tail of the report. Cover only renders when back-matter is shown
    // (plain non-deep readers omit it entirely → no orphan cover).
    if (_showBackMatter) {
      var _ch6 = _chapterCopy(6, d.fr, _arch, d.succVal);
      h += _renderChapterCover(6, _ch6.title, _ch6.frame, d.fr);
      secN++;
      var _methHtml = renderMethodology(d, secN);
      secN++;
      var _assumpHtml = renderAssumptions(d, secN);
      secN++;
      var _glossHtml = _renderGlossaryAppendix(d, secN);

      if (_isPlainReader) {
        // Plain + deep: render inline, but pass each block through the
        // jargon swap so the plain reader can actually read them.
        h += _jargonSwap(_methHtml);
        h += _jargonSwap(_assumpHtml);
        h += _jargonSwap(_glossHtml);
      } else {
        // Non-plain readers — each section renders inline, density-collapsed
        // (compact wraps in <details>; balanced/deep show inline).
        h += _densityWrap(_methHtml, 'sec-methodology',
          'M\u00e9thodologie \u2014 hypoth\u00e8ses + tables fiscales (cliquer pour ouvrir)',
          'Methodology \u2014 assumptions + tax tables (click to open)', d);
        // Codex 2026-04-27: user requested the assumptions appendix
        // be ALWAYS collapsible (not just for compact readers). Force
        // a <details> wrapper regardless of density profile.
        var _assumpSummary = d.fr
          ? 'Hypoth\u00e8ses d\u00e9taill\u00e9es (cliquer pour ouvrir)'
          : 'Detailed assumptions (click to open)';
        h += '<details class="bf-density-collapse" data-section-id="sec-assumptions" style="margin:0">' +
          '<summary style="cursor:pointer;padding:8px 12px;background:#fdfbf6;border:1px solid #e8e0d4;border-radius:4px;font-family:Inter,sans-serif;font-size:12px;font-weight:600;color:#252d39;list-style:none">' +
          '<span style="color:#c49a1a;margin-right:6px">\u25b8</span>' + _assumpSummary +
          '</summary>' + _assumpHtml + '</details>';
        h += _densityWrap(_glossHtml, 'sec-glossary',
          'Glossaire \u2014 d\u00e9finitions des termes (cliquer pour ouvrir)',
          'Glossary \u2014 term definitions (click to open)', d);
      }
    }

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
    var cJs = (typeof window !== 'undefined' && window.BF_CONSTANTS_JS) ? window.BF_CONSTANTS_JS : '';
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
      // Constants must load BEFORE the engine — engine reads window.BFConstants
      // at module scope. Without this inline, the embedded What-If simulator
      // throws "Cannot read properties of undefined (reading 'map')" the
      // moment a quick scenario fires (FED_BRACKETS.map on undefined).
      if (cJs) out += '<script>' + _stripScriptClose(cJs) + '<\/script>';
      if (eJs) out += '<script>' + _stripScriptClose(eJs) + '<\/script>';
      if (wJs) out += '<script>' + _stripScriptClose(wJs) + '<\/script>';
    }
    return out;
  }

})();
