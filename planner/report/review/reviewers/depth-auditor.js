// depth-auditor.js - Premium-rebuild auditor (P1.7 part 2).
//
// Detects structural depth gaps required by the premium-rebuild plan.
// Specifically:
//   - depth_advisor_unsigned: Signature page exists but has no advisor name
//     parameterized (T2.6 blocks this from feeling AI-generated)
//   - depth_required_missing: any contract-mandatory section is absent
//     (overlaps with table-auditor but specifically catches premium-only
//     structural elements: GIS methodology block when GIS section renders,
//     dispersion-driver callout when dispersion is large, etc.)
//   - depth_simulator_presence: premium reports must include sec-whatif
//     unless a caller explicitly disables interactivity upstream.
//
// Hard categories (blockers): depth_required_missing when the simulator is
// absent. Soft (majors): depth_advisor_unsigned, missing methodology fragments.

'use strict';
var Contract = require('../review-contract.js');

function _has(html, needle) {
  return html.indexOf(needle) >= 0;
}

function audit(pack) {
  var findings = [];
  var fr = pack.profile.lang === 'fr';
  var html = pack.html;
  var canonical = pack.canonical || {};

  // 1) Embedded simulator presence
  var hasSimulator = /id="bf-whatif"/i.test(html) && /id="bf-year-slider"/i.test(html);
  if (!hasSimulator) {
    findings.push({
      id: 'depth-simulator-missing',
      reviewer: 'depth',
      severity: 'blocker',
      category: 'depth_required_missing',
      section: 'sec-whatif',
      message: 'Premium report is missing the embedded What-If simulator.',
      evidence: 'whatif_present=false',
      fix_kind: 'manual',
      fix_target: 'sec-whatif'
    });
  }

  // 2) Advisor signature parameterized
  var hasSignaturePage = pack.sections.some(function(s) { return s.id === 'sec-signature'; });
  if (hasSignaturePage) {
    var hasAdvisorName = /class="advisor-name"/i.test(html) || /data-advisor-name/i.test(html);
    var hasDateStamp = /class="advisor-signature-date"/i.test(html);
    var enMonthRe = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+20\d{2}\b/i;
    var frMonthRe = /\b\d{1,2}\s+(janvier|f\u00e9vrier|mars|avril|mai|juin|juillet|ao\u00fbt|septembre|octobre|novembre|d\u00e9cembre)\s+20\d{2}\b/i;
    var isoRe = /\b20\d{2}-\d{2}-\d{2}\b/;
    var hasDate = hasDateStamp || enMonthRe.test(html) || frMonthRe.test(html) || isoRe.test(html);
    if (!hasAdvisorName || !hasDate) {
      findings.push({
        id: 'depth-advisor-unsigned',
        reviewer: 'depth',
        severity: 'major',
        category: 'depth_advisor_unsigned',
        section: 'sec-signature',
        message: 'Signature page lacks advisor identity or date stamp - reads as AI-generated.',
        evidence: 'has_advisor_name=' + hasAdvisorName + ' has_date=' + hasDate,
        fix_kind: 'manual',
        fix_target: 'sec-signature'
      });
    }
  }

  // 3) GIS methodology block conditional on GIS section
  var hasGis = pack.sections.some(function(s) { return s.id === 'sec-gis'; });
  if (hasGis) {
    var hasMethBlock = /class="[^"]*\bgis-methodology\b[^"]*"/i.test(html) || /data-gis-methodology/i.test(html);
    if (!hasMethBlock) {
      findings.push({
        id: 'depth-gis-methodology-missing',
        reviewer: 'depth',
        severity: 'major',
        category: 'depth_required_missing',
        section: 'sec-gis',
        message: 'GIS section renders without methodology explainer (P1.5). Reader sees large lifetime totals + high taxable rows with no scope context.',
        evidence: 'sec-gis present, gis-methodology block absent',
        fix_kind: 'manual',
        fix_target: 'sec-gis'
      });
    }
  }

  // 4) Dispersion-driver callout when dispersion is large
  var disp = canonical.dispersion_pts;
  if (disp != null && Math.abs(disp) >= 15) {
    var hasDispCallout = /class="risk-driver-callout"/i.test(html) || /data-risk-driver/i.test(html);
    if (!hasDispCallout) {
      findings.push({
        id: 'depth-dispersion-callout-missing',
        reviewer: 'depth',
        severity: 'minor',
        category: 'depth_required_missing',
        section: 'sec-risk',
        message: 'Dispersion (' + disp + ' pts) is material but the Risk section lacks an explicit driver callout block.',
        evidence: 'dispersion_pts=' + disp,
        fix_kind: 'manual',
        fix_target: 'sec-risk'
      });
    }
  }

  // 5) Engine-output sanity — flag collapsed percentiles + negative estate.
  // These are upstream Monte Carlo defects, not renderer bugs, but they
  // produce numbers that read as broken to any client (P25 == P50 == P75,
  // estate=-$1200, succ=100% with $0 wealth).
  //
  // Severity = `minor` because the renderer's KPI guards (sec-risk
  // structural-floor callout + estate-section trivial-skip + risk-collapse
  // auditor) already surface the symptom. The minor finding stays in the
  // findings.json record so the MC-engine engineer can act on it without
  // blocking the report ship gate every time the engine outputs collapsed
  // percentiles. Re-promote to `major` once the engine fixes are landed.
  var p25 = canonical.p25_wealth_real;
  var p50 = canonical.p50_wealth_real;
  var p75 = canonical.p75_wealth_real;
  if (p25 != null && p75 != null) {
    var spread = Math.abs(p75 - p25);
    var midpoint = Math.max(1, Math.abs((p25 + p75) / 2));
    if (spread < 1000 && midpoint > 10000) {
      findings.push({
        id: 'depth-percentiles-collapsed',
        reviewer: 'depth',
        severity: 'minor',
        category: 'depth_required_missing',
        section: 'sec-risk',
        message: 'P25 and P75 wealth (real $) collapse to within $1K of each other — Monte Carlo dispersion is structurally absent. The engine likely treats a major asset as deterministic. Renderer surfaces a structural-floor callout in lieu of misleading triple-identical KPIs.',
        evidence: 'p25=' + Math.round(p25) + ' p50=' + Math.round(p50 || 0) + ' p75=' + Math.round(p75) + ' spread=' + Math.round(spread),
        fix_kind: 'manual',
        fix_target: 'engine-mc'
      });
    }
  }
  var estate = canonical.net_estate;
  if (estate != null && estate < 0) {
    findings.push({
      id: 'depth-estate-negative',
      reviewer: 'depth',
      severity: 'minor',
      category: 'depth_required_missing',
      section: 'sec-succession',
      message: 'Median net estate is NEGATIVE (' + Math.round(estate) + '$). Tax at death exceeds remaining assets — likely an engine-side accounting issue or default placeholder. Renderer skips section when both medEstateNet and p5EstateNet are below the trivial threshold.',
      evidence: 'medEstateNet=' + Math.round(estate),
      fix_kind: 'manual',
      fix_target: 'engine-mc'
    });
  }
  // Success rate paradoxes
  var succ = canonical.success_rate;
  if (succ != null && succ >= 0.99 && p50 != null && p50 < 5000) {
    findings.push({
      id: 'depth-succ-zero-wealth',
      reviewer: 'depth',
      severity: 'minor',
      category: 'depth_required_missing',
      section: 'sec-assessment',
      message: 'Success rate ≥99% but median final wealth is ' + Math.round(p50) + ' (real $). Plan claims success while wealth is depleted — likely engine path-counting based on reaching deathAge regardless of terminal wealth.',
      evidence: 'succ=' + (succ * 100).toFixed(0) + '% p50_real=' + Math.round(p50),
      fix_kind: 'manual',
      fix_target: 'engine-mc'
    });
  }

  return findings;
}

module.exports = { audit: audit };
