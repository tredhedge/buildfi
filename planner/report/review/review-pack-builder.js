// review-pack-builder.js — Builds the unified review pack consumed by every
// auditor. Without this, auditors would inspect HTML by eye and reproduce the
// chaos of the previous QA setup.
//
// The pack includes:
//   - profile (from profiles.json)
//   - canonical metrics (single source of truth)
//   - section manifest (which sections rendered, with id + size + headline)
//   - chart manifest (which charts rendered, with type + data-bf-chart attr)
//   - table manifest (which tables, columns, row count)
//   - AI slots used (verbatim, keyed by slot name)
//   - rendered HTML (full)
//   - render version

'use strict';
var fs = require('fs');
var path = require('path');
var Contract = require('./review-contract.js');

function _read(p) { return fs.readFileSync(p, 'utf8'); }
function _safeJson(p) { try { return JSON.parse(_read(p)); } catch (e) { return null; } }

// Extract section manifest from rendered HTML — every <h3 class="sec" id="...">
// becomes one entry; we capture the section's title + the byte range it spans
// (until the next <h3 class="sec"> or end-of-doc).
function extractSections(html) {
  // Sections are emitted in several patterns:
  //   A) <h3 class="sec"... id="sec-..."> ... </h3>           (numbered sections)
  //   B) <div class="sec-page" id="sec-..."> ... </div>       (advisor letter, signature)
  //   C) <div id="sec-..." data-bf-anchor ...>                (anchored blocks, e.g.
  //                                                            sec-diagnostic) and any
  //                                                            other element carrying a
  //                                                            sec-* id.
  // Audit 2026-06-16: only A+B were detected, so anchored blocks like
  // <div id="sec-diagnostic"> were reported "missing from the rendered HTML"
  // even though they render — false empty_section blockers on every report. The
  // general pass (C) catches any element-level sec-* anchor, deduped by id.
  var anchors = [];
  var reH3 = /<h3 class="sec"[^>]*id="(sec-[a-z-]+)"[^>]*>([\s\S]*?)<\/h3>/g;
  var reDiv = /<div class="sec-page"[^>]*id="(sec-[a-z-]+)"[^>]*>/g;
  var reAny = /<(?:div|section|h[1-6])[^>]*\bid="(sec-[a-z-]+)"[^>]*>/g;
  var m;
  while ((m = reH3.exec(html)) !== null) {
    var titleText = m[2].replace(/<[^>]*>/g, '').trim();
    anchors.push({ id: m[1], title: titleText, start: m.index, kind: 'h3' });
  }
  while ((m = reDiv.exec(html)) !== null) {
    // Don't double-count: if h3 inside this div has same id, skip
    var sameAsH3 = anchors.some(function(a) { return a.id === m[1] && a.kind === 'h3'; });
    if (!sameAsH3) anchors.push({ id: m[1], title: m[1], start: m.index, kind: 'div' });
  }
  while ((m = reAny.exec(html)) !== null) {
    // General element-level anchor — add only ids not already captured by A/B.
    if (!anchors.some(function(a) { return a.id === m[1]; })) {
      anchors.push({ id: m[1], title: m[1], start: m.index, kind: 'el' });
    }
  }
  anchors.sort(function(a, b) { return a.start - b.start; });
  var sections = [];
  anchors.forEach(function(curr, i) {
    var next = anchors[i + 1];
    var end = next ? next.start : html.length;
    var body = html.slice(curr.start, end);
    sections.push({
      id: curr.id,
      title: curr.title,
      bytes: body.length,
      offset: curr.start,
      isThin: body.length < 600,
      isEmpty: body.length < 250
    });
  });
  return sections;
}

// Extract chart manifest — every <svg data-bf-chart="..."> + heatmap divs
function extractCharts(html) {
  // Build an ordered list of all chart-title divs, then for each SVG find the
  // CLOSEST preceding title within a tight window (≤ 800 bytes). A title that
  // sits 5000 bytes upstream is from another chart block, not this one.
  var titleList = [];
  var titleRe = /<div class="chart-title">([^<]+)<\/div>/g;
  var tm;
  while ((tm = titleRe.exec(html)) !== null) {
    titleList.push({ pos: tm.index, end: tm.index + tm[0].length, text: tm[1].trim() });
  }
  // Each title attaches to AT MOST one SVG (the first SVG after it within the
  // window). Use a usedSet so we don't double-assign.
  var used = {};
  var charts = [];
  var re = /<svg[^>]*data-bf-chart="([a-z]+)"[^>]*>/g;
  var m;
  while ((m = re.exec(html)) !== null) {
    var bestTitle = null;
    var bestPos = -1;
    for (var i = 0; i < titleList.length; i++) {
      var t = titleList[i];
      if (used[t.pos]) continue;
      if (t.end > m.index) break;            // title is AFTER svg — too far
      if (m.index - t.end > 800) continue;   // title is too far upstream
      if (t.pos > bestPos) { bestPos = t.pos; bestTitle = t; }
    }
    if (bestTitle) used[bestTitle.pos] = true;
    charts.push({ type: m[1], title: bestTitle ? bestTitle.text : null, offset: m.index });
  }
  // Also catch the inline heatmap (uses data-bf-chart pattern? probably no — it's an SVG without that attr)
  var hasSensitivityHeatmap = /Sensitivity heatmap|Carte thermique de sensibilité/.test(html);
  if (hasSensitivityHeatmap) {
    charts.push({ type: 'heatmap-sensitivity', title: 'Sensitivity heatmap', offset: html.search(/Sensitivity heatmap|Carte thermique de sensibilité/) });
  }
  return charts;
}

// Extract table manifest — count tables + rough column count
function extractTables(html) {
  var tables = [];
  var re = /<table[^>]*(?:id="([^"]+)")?[^>]*>([\s\S]*?)<\/table>/g;
  var m;
  while ((m = re.exec(html)) !== null) {
    var inner = m[2];
    var headers = (inner.match(/<th[^>]*>([\s\S]*?)<\/th>/g) || []).map(function(s) {
      return s.replace(/<[^>]*>/g, '').trim();
    });
    var rowCount = (inner.match(/<tr[^>]*>/g) || []).length;
    tables.push({
      id: m[1] || null,
      headers: headers,
      rowCount: rowCount,
      offset: m.index
    });
  }
  return tables;
}

// Extract every percentage value paired with a short context window so the
// data-auditor can detect contradictions (e.g. 41% government coverage in
// section A vs 27% in section B for the same concept).
function extractPercentages(html) {
  var found = [];
  // Match "<strong>NN%</strong>" or "NN%" with a 60-char context window before
  var re = /([A-Za-zÀ-ÿ\s\-,'"]{20,60})(\d{1,3})\s*%/g;
  var m;
  while ((m = re.exec(html)) !== null) {
    var ctx = m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    var pct = parseInt(m[2], 10);
    if (pct > 0 && pct <= 200 && ctx.length > 5) {
      found.push({ pct: pct, context: ctx, offset: m.index });
    }
  }
  return found;
}

function buildReviewPack(profile, htmlPath, mcPath, responsePath, dPayload) {
  var html = _read(htmlPath);
  var mc = _safeJson(mcPath);
  var aiResponse = _safeJson(responsePath) || {};
  // Build a complete dPayload — guarantee revData / succVal / R are present,
  // even when the caller passes a partial data object. Previous bug: when
  // `dPayload.revData` was undefined the gis_plausibility check evaluated
  // false unconditionally, flagging Linda's report (a true GIS profile) as
  // impossible. The fallback chain below derives missing fields from `mc`.
  var canonicalInput = {
    p: (dPayload && dPayload.p) || profile.params,
    mc: (dPayload && dPayload.mc) || mc,
    fr: dPayload ? dPayload.fr : (profile.lang === 'fr'),
    revData: (dPayload && dPayload.revData) || (mc && mc.medRevData) || [],
    succVal: (dPayload && dPayload.succVal != null) ? dPayload.succVal : (mc && mc.succ),
    R: (dPayload && dPayload.R) || { phase: profile.params.retAge <= profile.params.age ? 'decum' : 'accum' },
    oasClbkYrs: (dPayload && dPayload.oasClbkYrs != null) ? dPayload.oasClbkYrs : (mc && mc.oasClbkYrs),
    _sensData: (dPayload && dPayload.sensData) || (mc && mc._sensData) || null,
    _caseDriver: profile.case_driver || null
  };
  var canonical = Contract.buildCanonicalMetrics(canonicalInput);
  // CLASSIFIER-RENDER-PLAN Phase 1: surface renderProfile on pack so
  // auditors can suppress false positives on hidden blocks (e.g. don't
  // flag a missing tornado when chartTier='lite' deliberately omits it).
  var renderProfileObj = (dPayload && dPayload.renderProfile) || null;
  if (!renderProfileObj) {
    // Best-effort derive from classifiers when dPayload didn't carry it.
    var rpMod = (function() { try { return require('../report-render-profile.js'); } catch (e) { return null; } })();
    if (rpMod && typeof rpMod.deriveRenderProfile === 'function') {
      renderProfileObj = rpMod.deriveRenderProfile(profile.finLiteracy, profile.stressLevel, profile.detailPref, profile.sku);
    }
  }
  return {
    profile: {
      id: profile.id,
      lang: profile.lang,
      sku: profile.sku || 'bilan',
      mode: profile.mode,
      finLiteracy: profile.finLiteracy,
      stressLevel: profile.stressLevel,
      detailPref: profile.detailPref,
      case_driver: profile.case_driver || null,
      params: profile.params || {}
    },
    renderProfile: renderProfileObj,
    canonical: canonical,
    revData: canonicalInput.revData,
    sections: extractSections(html),
    charts: extractCharts(html),
    tables: extractTables(html),
    percentages: extractPercentages(html),
    ai_slots: (dPayload && dPayload.ai) || aiResponse,
    // dPayload exposes payload-level flags (clientExport, _suppressed,
    // includeSimulator) so auditors can branch on them.
    dPayload: dPayload || null,
    html: html,
    html_size: html.length,
    render_version: 'v12.2.0-premium'
  };
}

module.exports = { buildReviewPack: buildReviewPack };
