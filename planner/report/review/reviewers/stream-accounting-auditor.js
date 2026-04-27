// stream-accounting-auditor.js — Catches when the engine produces a wealth
// or income stream that the renderer fails to surface in the corresponding
// chart. The pattern that motivated this auditor:
//
//   * rental_landlord: tiRe was computed in revData but dropped from
//     medRevData → income chart had no rental row → narrative said
//     "rental is core" while the data showed nothing.
//   * ccpc_owner: corpExtract appeared in revData but the chart didn't
//     surface it → reader saw CPP/OAS only.
//   * low_income_gis / single_parent / debt_young: GIS/SRG was a major
//     income stream but never appeared in the income waterfall as its
//     own bar (was bundled into "Retraits / Withdrawals").
//   * Profiles holding LIRA / DC / FHSA / IPP: those wealth buckets were
//     missing from the composition chart.
//
// Rule: if a stream is non-trivial in the engine's median path
// (>$1K average across the retirement years), the renderer MUST surface
// it in the relevant chart legend OR the income waterfall. Missing
// streams are major findings.

'use strict';

function _sectionHtml(pack, id) {
  var sec = pack.sections.find(function(s) { return s.id === id; });
  return sec ? pack.html.slice(sec.offset, sec.offset + sec.bytes) : '';
}

function _legendItems(html) {
  var out = [];
  var re = /<span class="chart-legend-item"><span class="chart-legend-swatch"[^>]*><\/span>([^<]*)<\/span>/g;
  var m;
  while ((m = re.exec(html)) !== null) {
    out.push(m[1].trim().toLowerCase());
    if (out.length > 40) break;
  }
  return out;
}

function audit(pack) {
  var findings = [];
  var fr = pack.profile.lang === 'fr';
  var p = pack.profile.params || {};
  var revData = pack.revData || [];
  var retAge = p.retAge || 65;
  var retRows = revData.filter(function(r) { return r.age >= retAge; });
  if (retRows.length === 0) return findings;

  // ─── Income-stream coverage ──────────────────────────────────────────
  // For each income stream the engine emits at >$1K avg, verify the
  // revenue section's chart legend mentions it. We pull the legend from
  // the section's full HTML (waterfall + stacked area both render
  // chart-legend-item rows). Patterns are matched generously to avoid
  // false positives across EN/FR.
  var revHtml = _sectionHtml(pack, 'sec-revenue');
  var revLegend = _legendItems(revHtml).join(' | ');

  var streams = [
    { id: 'gis',      avg: function(r) { return (r.srg || r.gis || 0); },
      re: /(srg|gis)/i, label: 'GIS / SRG' },
    { id: 'cgis',     avg: function(r) { return (r.cSrg || r.cGis || 0); },
      re: /(srg conj|gis (sp|conjoint|spouse))/i, label: 'GIS spouse' },
    { id: 'corp',     avg: function(r) { return (r.corpDiv || 0) + (r.corpSal || 0) + (r.corpExtract || 0); },
      re: /(corp|dividend|spcc|ccpc|soci\u00e9t\u00e9)/i, label: 'Corp distributions' },
    { id: 'rental',   avg: function(r) { return (r.tiRe || 0); },
      re: /(rental|locatif|loyer)/i, label: 'Rental income' },
    { id: 'lira',     avg: function(r) { return (r.liraWith || 0) + (r.cLiraWith || 0); },
      re: /(lira|cri)/i, label: 'LIRA withdrawals' },
    { id: 'pt',       avg: function(r) { return (r.pt || 0); },
      re: /(part-time|temps partiel)/i, label: 'Part-time work' },
    { id: 'cqpp',     avg: function(r) { return (r.cRrq || r.cQpp || 0); },
      re: /(cpp |qpp |rrq ).*(spouse|conj)/i, label: 'CPP/QPP spouse' },
    { id: 'coas',     avg: function(r) { return (r.cPsv || r.cOas || 0); },
      re: /(oas |psv ).*(spouse|conj)/i, label: 'OAS spouse' }
  ];

  streams.forEach(function(stream) {
    var avgVal = retRows.reduce(function(s, r) { return s + stream.avg(r); }, 0) / retRows.length;
    if (avgVal < 1000) return; // not material
    if (stream.re.test(revLegend)) return; // surfaced
    findings.push({
      id: 'stream-missing-' + stream.id,
      reviewer: 'visual',
      severity: 'major',
      category: 'visual_chart_incomplete',
      section: 'sec-revenue',
      message: 'Income stream "' + stream.label + '" averages ' + Math.round(avgVal).toLocaleString() + '$/yr in retirement but is missing from the revenue chart legend.',
      evidence: 'avg=' + Math.round(avgVal) + ' legend_excerpt=' + revLegend.slice(0, 200),
      fix_kind: 'manual',
      fix_target: 'sec-revenue'
    });
  });

  // ─── Wealth-bucket coverage ─────────────────────────────────────────
  // For each wealth bucket present in pD with peak > $1K, verify the
  // composition chart legend mentions it. Bucket → legend-token mapping.
  var wealthSec = pack.sections.find(function(s) { return s.id === 'sec-projection'; });
  if (wealthSec) {
    var wealthHtml = pack.html.slice(wealthSec.offset, wealthSec.offset + wealthSec.bytes);
    var compoIdx = wealthHtml.search(/Composition du patrimoine|Wealth Composition/i);
    if (compoIdx >= 0) {
      var legendWindow = wealthHtml.slice(compoIdx, compoIdx + 30000);
      var compoLegend = _legendItems(legendWindow).join(' | ');
      var pD = pack.canonical && pack.canonical._pD;
      // We don't have direct pD access in canonical; use revData balances
      // (aRR/aTF/aNR/aRE/aLIRA/etc.) as a proxy. revData[i].aPE etc. are
      // populated by the engine.
      var buckets = [
        { key: 'aFhsa',  re: /(fhsa|celiapp)/i,                                 label: 'FHSA' },
        { key: 'aDC',    re: /(dc|cd employeur|dc plan|db\/dc)/i,               label: 'DC plan' },
        { key: 'aIpp',   re: /(ipp|rri)/i,                                       label: 'IPP' },
        { key: 'aPE',    re: /(resp|reee)/i,                                     label: 'RESP' },
        { key: 'aPM',    re: /(rdsp|reei)/i,                                     label: 'RDSP' }
      ];
      buckets.forEach(function(b) {
        // peak balance across retirement
        var peak = retRows.reduce(function(m, r) { return Math.max(m, r[b.key] || 0); }, 0);
        if (peak < 1000) return;
        if (b.re.test(compoLegend)) return;
        findings.push({
          id: 'stream-wealth-missing-' + b.key,
          reviewer: 'visual',
          severity: 'major',
          category: 'visual_chart_incomplete',
          section: 'sec-projection',
          message: 'Wealth bucket "' + b.label + '" peaks at ' + Math.round(peak).toLocaleString() + '$ but is missing from the composition chart legend.',
          evidence: 'peak=' + Math.round(peak) + ' legend_excerpt=' + compoLegend.slice(0, 200),
          fix_kind: 'manual',
          fix_target: 'sec-projection'
        });
      });
    }
  }

  return findings;
}

module.exports = { audit: audit };
