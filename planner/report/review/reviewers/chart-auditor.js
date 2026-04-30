// chart-auditor.js - Deterministic chart auditor.
//
// Detects:
//   - approximation_visible: any chart whose title contains "approximation" /
//     "approximate" - these must not appear in client deliverables.
//   - duplicate_chart: same chart title rendered twice in the report.
//   - missing_income_source: revenue chart legend omits a material income
//     source flagged by the profile (corp dividends, rental cash flow).
//   - uniform_stress: stress section all rows identical -> callout, not section.

'use strict';

function _legendLabels(sectionHtml) {
  var labels = [];
  var re = /<span class="chart-legend-item">\s*<span class="chart-legend-swatch"[^>]*><\/span>\s*([^<]+)<\/span>/g;
  var m;
  while ((m = re.exec(sectionHtml)) !== null) labels.push((m[1] || '').trim());
  return labels;
}

function audit(pack) {
  var findings = [];
  var p = pack.profile.params || {};
  var revData = pack.revData || [];

  // 1) Approximation labels in chart titles
  pack.charts.forEach(function(c) {
    if (c.title && /approximation|approximate/i.test(c.title)) {
      findings.push({
        id: 'chart-approx-' + c.type,
        reviewer: 'chart',
        severity: 'blocker',
        category: 'approximation_visible',
        section: null,
        message: 'Chart "' + c.title + '" is labeled approximation and must not appear in a client report.',
        evidence: c.title,
        fix_kind: 'remove_section',
        fix_target: c.type
      });
    }
  });

  // 2) Sensitivity heatmap is itself an approximation
  var hasSensHeatmap = pack.charts.some(function(c) { return c.type === 'heatmap-sensitivity'; });
  if (hasSensHeatmap) {
    findings.push({
      id: 'chart-sensitivity-heatmap',
      reviewer: 'chart',
      severity: 'blocker',
      category: 'approximation_visible',
      section: 'sec-sensitivity',
      message: 'Sensitivity heatmap is an educational approximation, not real Monte Carlo output. Ban it from the client report.',
      evidence: 'heatmap present',
      fix_kind: 'remove_section',
      fix_target: 'sec-sensitivity'
    });
  }

  // 3) Duplicate charts of the same title
  var byTitle = {};
  pack.charts.forEach(function(c) {
    if (!c.title) return;
    byTitle[c.title] = (byTitle[c.title] || 0) + 1;
  });
  Object.keys(byTitle).forEach(function(t) {
    if (byTitle[t] > 1) {
      findings.push({
        id: 'chart-dup-' + t.slice(0, 30).replace(/\s+/g, '-'),
        reviewer: 'chart',
        severity: 'major',
        category: 'duplicate_section',
        section: null,
        message: 'Chart titled "' + t + '" rendered ' + byTitle[t] + ' times.',
        evidence: 'count=' + byTitle[t],
        fix_kind: 'remove_section',
        fix_target: t
      });
    }
  });

  // 4) Missing income source for material assets
  var revSection = pack.sections.find(function(s) { return s.id === 'sec-revenue'; });
  if (revSection) {
    var revHtml = pack.html.slice(revSection.offset, revSection.offset + revSection.bytes);
    var legend = _legendLabels(revHtml).join(' | ').toLowerCase();
    var hasCorpProfile = !!(p.bizOn || p.bizRetainedEarnings || p.bizRevenue || p.bizVal);
    var hasRentalProfile = !!((p.props || []).some(function(pr) {
      return pr && pr.on && ((pr.rm || 0) > 0 || (pr.ri || 0) > 0 || (pr.nm && /rental|locatif|plex|duplex|triplex|hamilton|mississauga/i.test(pr.nm)));
    }));
    var hasCorpFlow = revData.some(function(r) {
      return (r.corpDiv || 0) > 0 || (r.corpSal || 0) > 0 || (r.corpExtract || 0) > 0;
    });
    var hasRentalFlow = revData.some(function(r) {
      return (r.tiRe || 0) > 0;
    });
    var requiresCorpLegend = hasCorpProfile && hasCorpFlow;
    var requiresRentalLegend = hasRentalProfile && hasRentalFlow;

    if (requiresCorpLegend && !/dividend|corp|corporate|societe|soci.t.|incorpor/i.test(legend)) {
      findings.push({
        id: 'chart-missing-corp',
        reviewer: 'chart',
        severity: 'blocker',
        category: 'missing_income_source',
        section: 'sec-revenue',
        message: 'Profile has a corporation but the revenue chart legend does not surface corporate income as a distinct stream.',
        evidence: 'legend=' + (legend || '(none)'),
        fix_kind: 'recompute_from_canonical',
        fix_target: 'income_chart'
      });
    }

    if (requiresRentalLegend && !/rental|rent|cash flow|loyer|locatif/i.test(legend)) {
      findings.push({
        id: 'chart-missing-rental',
        reviewer: 'chart',
        severity: 'blocker',
        category: 'missing_income_source',
        section: 'sec-revenue',
        message: 'Profile has rental real estate but the revenue chart legend does not surface rental cash flow.',
        evidence: 'legend=' + (legend || '(none)'),
        fix_kind: 'recompute_from_canonical',
        fix_target: 'income_chart'
      });
    }
  }

  // 5) Stress section uniformity - all rows identical
  var stressSection = pack.sections.find(function(s) { return s.id === 'sec-stress'; });
  if (stressSection) {
    var stressHtml = pack.html.slice(stressSection.offset, stressSection.offset + stressSection.bytes);
    var rowSucc = [];
    var re = /(\d{1,3})\s*%/g;
    var m;
    while ((m = re.exec(stressHtml)) !== null) {
      var v = parseInt(m[1], 10);
      if (v >= 0 && v <= 100) rowSucc.push(v);
    }
    if (rowSucc.length >= 6) {
      var min = Math.min.apply(null, rowSucc.slice(0, 6));
      var max = Math.max.apply(null, rowSucc.slice(0, 6));
      if (max - min <= 2) {
        findings.push({
          id: 'chart-stress-uniform',
          reviewer: 'chart',
          severity: 'major',
          category: 'uniform_stress',
          section: 'sec-stress',
          message: 'All 6 stress scenarios collapse to the same success rate (' + min + '%-' + max + '%). Section should be replaced with a callout.',
          evidence: 'range=' + min + '-' + max,
          fix_kind: 'replace_with_callout',
          fix_target: 'sec-stress'
        });
      }
    }
  }

  return findings;
}

module.exports = { audit: audit };
