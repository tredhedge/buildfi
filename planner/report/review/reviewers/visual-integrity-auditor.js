// visual-integrity-auditor.js — Catches the kind of "looks broken / looks
// sketchy" defects that the structural auditors don't see.
//
// Built after a user review surfaced four issues none of the existing
// auditors caught:
//   1. Wealth-composition chart hides illiquid assets (CCPC, RE, LIRA, DC).
//      A reader sees "0$ patrimoine" and concludes the report is broken,
//      when actually 80% of net worth is sitting in hidden buckets.
//   2. Fan chart uses P5 / P95 — outliers dominate the y-axis on FIRE-style
//      profiles, making the wealth picture meaningless.
//   3. Income-chart "Retraits" is a single ambiguous lump (RRSP? TFSA? NR?
//      everything?) — reader can't tell what's being drawn.
//   4. "Detailed vs Executive" mode silently hides 5+ sections in
//      static reports. Reader pays for a premium report, gets a shallow one.
//
// Each finding here is `major` (rerun_ai_slot or manual fix) so the ship
// gate stops the pipeline until the renderer catches up.

'use strict';
var Contract = require('../review-contract.js');

function _sectionHtml(pack, id) {
  var sec = pack.sections.find(function(s) { return s.id === id; });
  return sec ? pack.html.slice(sec.offset, sec.offset + sec.bytes) : '';
}

function audit(pack) {
  var findings = [];
  var fr = pack.profile.lang === 'fr';
  var html = pack.html;
  var p = pack.profile.params || {};

  // ─── 1) Wealth-composition chart must include illiquid assets ────────
  // The chart legend lives next to the SVG with class="chart-legend-item".
  // Detect the composition chart by title and verify the legend covers
  // every asset class the profile actually owns.
  var wealthSec = pack.sections.find(function(s) { return s.id === 'sec-projection'; });
  if (wealthSec) {
    var wealthHtml = _sectionHtml(pack, 'sec-projection');
    var compoTitle = /Composition du patrimoine|Wealth Composition/i;
    var compoIdx = wealthHtml.search(compoTitle);
    if (compoIdx >= 0) {
      // Read legend items in the window after the chart title. svgArea
      // emits each legend entry as
      //   <span class="chart-legend-item"><span class="chart-legend-swatch" ...></span>LABEL</span>
      // so the regex captures the LABEL slice after the swatch closes.
      var legendWindow = wealthHtml.slice(compoIdx, compoIdx + 30000);
      var legendItems = [];
      var _legRe = /<span class="chart-legend-item"><span class="chart-legend-swatch"[^>]*><\/span>([^<]*)<\/span>/g;
      var _lm;
      while ((_lm = _legRe.exec(legendWindow)) !== null) {
        legendItems.push(_lm[1].trim().toLowerCase());
        if (legendItems.length > 30) break;
      }
      var legend = legendItems.join(' | ');
      var expected = [];
      if ((p.props || []).some(function(pr) { return pr && pr.on; })) expected.push({ key: 'real-estate', re: /(immobilier|real estate|locatif|rental|plex)/i });
      if (p.bizOn) expected.push({ key: 'corp', re: /(spcc|ccpc|corp|incorporat|soci\u00e9t\u00e9)/i });
      if ((p.lira || 0) > 5000 || (p.cLira || 0) > 5000) expected.push({ key: 'lira', re: /(lira|cri)/i });
      if ((p.dcBal || 0) > 5000 || (p.cDCBal || 0) > 5000) expected.push({ key: 'dc', re: /(pd\/cd|db\/dc plan|defined-?(benefit|contribution)|cd employeur)/i });
      var missing = expected.filter(function(e) { return !e.re.test(legend); });
      if (missing.length > 0) {
        findings.push({
          id: 'visual-composition-coverage',
          reviewer: 'visual',
          severity: 'major',
          category: 'visual_chart_incomplete',
          section: 'sec-projection',
          message: 'Wealth-composition chart legend is missing asset classes the profile actually owns: ' + missing.map(function(m) { return m.key; }).join(', ') + '. Reader sees a wealth cliff that\'s really a hidden bucket.',
          evidence: 'legend=' + (legend || '(empty)'),
          fix_kind: 'manual',
          fix_target: 'sec-projection-composition'
        });
      }
    }
  }

  // ─── 2) Fan chart must use P10–P90, not P5–P95 ───────────────────────
  // Tail outliers on fail-prone profiles (FIRE, debt, single parent) make
  // P95 a misleading "favourable" anchor. The chart legend now reads
  // "P10–P90" when correctly upgraded; flag legacy "P5–P95" labels.
  if (/data-bf-chart="fan"/.test(html) && /P5\s*[\u2013-]\s*P95/.test(html)) {
    findings.push({
      id: 'visual-percentile-band-outliers',
      reviewer: 'visual',
      severity: 'major',
      category: 'visual_percentile_outliers',
      section: 'sec-projection',
      message: 'Fan chart uses P5\u2013P95 band. Outliers dominate the y-axis on fail-prone profiles. Use P10\u2013P90 instead.',
      evidence: 'legend mentions P5\u2013P95',
      fix_kind: 'manual',
      fix_target: 'sec-projection-fan'
    });
  }

  // ─── 3) Income chart: single "Retraits" / "Withdrawals" lump banned ──
  // It must either be split by source OR carry an explicit composite
  // label like "Retraits portefeuille (REER + CELI + NR)" so the reader
  // knows what's bundled.
  var revSec = pack.sections.find(function(s) { return s.id === 'sec-revenue'; });
  if (revSec) {
    var revHtml = _sectionHtml(pack, 'sec-revenue');
    var hasExplicitLabel = /Retraits portefeuille|Portfolio withdrawals|REER \+ CELI|RRSP \+ TFSA/.test(revHtml);
    var hasGenericLabel = /\bRetraits\b\s*<|\bWithdrawals\b\s*</.test(revHtml);
    if (hasGenericLabel && !hasExplicitLabel) {
      findings.push({
        id: 'visual-withdrawal-ambiguous',
        reviewer: 'visual',
        severity: 'major',
        category: 'visual_label_ambiguous',
        section: 'sec-revenue',
        message: 'Income chart shows a single "Retraits / Withdrawals" lump without naming what\'s bundled. Reader can\'t tell if it\'s RRSP, TFSA, NR, or all combined.',
        evidence: 'generic Retraits label without composite note',
        fix_kind: 'manual',
        fix_target: 'sec-revenue-income-chart'
      });
    }
  }

  // ─── 4) Premium report should always render in expert mode ───────────
  // We can't test the toggle directly from the rendered HTML, but we can
  // detect the absence of the expert-only sections (risk, sensitivity)
  // when their data exists in the canonical pack. If the sensitivity
  // tornado data is in the MC payload but the section isn't rendered,
  // the report is silently shallow — a premium-quality regression.
  // 3×3 matrix gating (2026-04-28). The MINIMAL cell (beginner+concise)
  // legitimately omits sec-risk via the relevance gate. A beginner+detailed
  // reader keeps the section, so this auditor must only exempt the
  // minimal cell, not all plain-mode readers.
  var rp = (pack.dPayload && pack.dPayload.renderProfile) || pack.renderProfile || {};
  var jargonMode = rp.jargonMode
    || (pack.profile && pack.profile.finLiteracy === 'beginner' ? 'plain' : 'mixed');
  var densityMode = rp.densityMode
    || (pack.profile && pack.profile.detailPref === 'concise' ? 'compact' : 'balanced');
  var isMinimal = jargonMode === 'plain' && densityMode === 'compact';
  var hasRiskSec = pack.sections.some(function(s) { return s.id === 'sec-risk'; });
  if (!hasRiskSec && !isMinimal) {
    findings.push({
      id: 'visual-shallow-mode',
      reviewer: 'visual',
      severity: 'major',
      category: 'visual_shallow_mode',
      section: null,
      message: 'Risk & sensitivity section is not rendered. Premium reports must be in expert mode (mode="expert" in profiles.json).',
      evidence: 'sec-risk absent',
      fix_kind: 'manual',
      fix_target: 'profile-mode'
    });
  }

  return findings;
}

module.exports = { audit: audit };
