// chart-auditor.js — Deterministic chart auditor.
//
// Detects:
//   - approximation_visible: any chart whose title contains "approximation" /
//     "approximate" — these must not appear in client deliverables.
//   - duplicate_chart: same chart type rendered twice in the report.
//   - missing_income_source: income chart legend doesn't include a material
//     income source flagged by the profile (corp dividends, rental cashflow).
//   - uniform_stress: stress section all rows identical → callout, not section.

'use strict';

function audit(pack) {
  var findings = [];
  var fr = pack.profile.lang === 'fr';
  var p = pack.profile.params || {};

  // ─── 1) Approximation labels in chart titles ─────────────────────────
  pack.charts.forEach(function(c) {
    if (c.title && /approximation|approximate/i.test(c.title)) {
      findings.push({
        id: 'chart-approx-' + c.type,
        reviewer: 'chart',
        severity: 'blocker',
        category: 'approximation_visible',
        section: null,
        message: 'Chart "' + c.title + '" is labeled approximation — should not appear in client report.',
        evidence: c.title,
        fix_kind: 'remove_section',
        fix_target: c.type
      });
    }
  });

  // ─── 2) Sensitivity heatmap is itself an approximation ───────────────
  // Even when the chart-title doesn't say so, the dedicated heatmap is
  // explicitly described as an educational approximation. In V1 we ban it
  // from client reports.
  var hasSensHeatmap = pack.charts.some(function(c) { return c.type === 'heatmap-sensitivity'; });
  if (hasSensHeatmap) {
    findings.push({
      id: 'chart-sensitivity-heatmap',
      reviewer: 'chart',
      severity: 'blocker',
      category: 'approximation_visible',
      section: 'sec-sensitivity',
      message: 'Sensitivity heatmap is an educational approximation, not real Monte Carlo output. Ban from client report.',
      evidence: 'heatmap present',
      fix_kind: 'remove_section',
      fix_target: 'sec-sensitivity'
    });
  }

  // ─── 3) Duplicate charts of the same TITLE (not type) ─────────────────
  // Two charts of the same SVG type (e.g. two area charts: one for income,
  // one for couple coordination) are legitimate — they show different data.
  // True duplication is two charts with the same TITLE; that's a render bug.
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

  // ─── 4) Missing income source for material assets ────────────────────
  // If profile has a corp (bizOn / bizRetainedEarnings) or rentals (props),
  // the income chart should surface those streams. We detect by scanning the
  // sec-revenue section for those keywords.
  var revSection = pack.sections.find(function(s) { return s.id === 'sec-revenue'; });
  if (revSection) {
    var revHtml = pack.html.slice(revSection.offset, revSection.offset + revSection.bytes);
    if ((p.bizOn || p.bizRetainedEarnings) && !/dividend|corp|société|incorpor/i.test(revHtml)) {
      findings.push({
        id: 'chart-missing-corp',
        reviewer: 'chart',
        severity: 'blocker',
        category: 'missing_income_source',
        section: 'sec-revenue',
        message: 'Profile has a corporation but the revenue section / chart does not surface corporate income as a distinct stream.',
        evidence: 'bizOn=' + !!p.bizOn + ', bizRetainedEarnings=' + p.bizRetainedEarnings,
        fix_kind: 'recompute_from_canonical',
        fix_target: 'income_chart'
      });
    }
    if (p.props && p.props.length > 0 && !/rental|locati(ve|f)|loyer/i.test(revHtml)) {
      findings.push({
        id: 'chart-missing-rental',
        reviewer: 'chart',
        severity: 'blocker',
        category: 'missing_income_source',
        section: 'sec-revenue',
        message: 'Profile has ' + p.props.length + ' rental properties but the revenue section / chart does not surface rental cashflow.',
        evidence: 'props_count=' + p.props.length,
        fix_kind: 'recompute_from_canonical',
        fix_target: 'income_chart'
      });
    }
  }

  // ─── 5) Stress section uniformity — all rows identical ───────────────
  var stressSection = pack.sections.find(function(s) { return s.id === 'sec-stress'; });
  if (stressSection) {
    var stressHtml = pack.html.slice(stressSection.offset, stressSection.offset + stressSection.bytes);
    // Extract success-rate values per scenario row
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
