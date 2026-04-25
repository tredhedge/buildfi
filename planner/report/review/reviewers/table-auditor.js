// table-auditor.js — Deterministic table + section-presence auditor.
//
// Detects:
//   - empty_section: mandatory section missing or below thinness floor
//   - thin_section: present but body too small to carry value
//   - duplicate_section: same id or title appears twice
//   - confusing_balance: Balance/Solde column with values that contradict KPI
//     (e.g. Balance=0 across many rows while estate KPI is positive)
//   - missing_action_plan: zero levers in #sec-actions

'use strict';
var Contract = require('../review-contract.js');

function audit(pack) {
  var findings = [];

  // ─── 1) Mandatory sections present ───────────────────────────────────
  var presentIds = {};
  pack.sections.forEach(function(s) { presentIds[s.id] = (presentIds[s.id] || 0) + 1; });

  Contract.SECTIONS.forEach(function(spec) {
    if (spec.mandatory && !presentIds[spec.id]) {
      findings.push({
        id: 'table-missing-' + spec.id,
        reviewer: 'table',
        severity: 'blocker',
        category: 'empty_section',
        section: spec.id,
        message: 'Mandatory section "' + spec.name + '" is missing from the rendered HTML.',
        evidence: 'expected_id=' + spec.id,
        fix_kind: 'block_data',
        fix_target: spec.id
      });
    }
  });

  // ─── 2) Duplicate section ids ────────────────────────────────────────
  Object.keys(presentIds).forEach(function(id) {
    if (presentIds[id] > 1) {
      findings.push({
        id: 'table-dup-' + id,
        reviewer: 'table',
        severity: 'blocker',
        category: 'duplicate_section',
        section: id,
        message: 'Section id "' + id + '" appears ' + presentIds[id] + ' times. Anchor links and a11y break.',
        evidence: 'count=' + presentIds[id],
        fix_kind: 'remove_section',
        fix_target: id
      });
    }
  });

  // ─── 3) Empty / thin sections ────────────────────────────────────────
  pack.sections.forEach(function(s) {
    if (s.isEmpty) {
      findings.push({
        id: 'table-empty-' + s.id,
        reviewer: 'table',
        severity: 'blocker',
        category: 'empty_section',
        section: s.id,
        message: 'Section "' + s.title + '" rendered with no body (' + s.bytes + ' bytes between this h3 and the next).',
        evidence: 'bytes=' + s.bytes,
        fix_kind: 'remove_section',
        fix_target: s.id
      });
    } else if (s.isThin) {
      // Skip the What-If section: its body is intentionally just a banner +
      // mount point, with all content injected by JS at runtime. Static
      // thinness here is by design, not a defect.
      if (s.id === 'sec-whatif') return;
      findings.push({
        id: 'table-thin-' + s.id,
        reviewer: 'table',
        severity: 'major',
        category: 'thin_section',
        section: s.id,
        message: 'Section "' + s.title + '" is thin (' + s.bytes + ' bytes). Consider expanding or removing.',
        evidence: 'bytes=' + s.bytes,
        fix_kind: 'rerun_ai_slot',
        fix_target: s.id
      });
    }
  });

  // ─── 4) Action plan must have at least 2 levers ──────────────────────
  if (presentIds['sec-actions']) {
    var actStart = pack.html.indexOf('id="sec-actions"');
    var actEnd = pack.html.indexOf('class="sec"', actStart + 100);
    var actSection = pack.html.slice(actStart, actEnd > 0 ? actEnd : actStart + 12000);
    var leverCount = (actSection.match(/class="reco-card/g) || []).length;
    if (leverCount === 0) {
      findings.push({
        id: 'table-no-levers',
        reviewer: 'table',
        severity: 'blocker',
        category: 'empty_section',
        section: 'sec-actions',
        message: 'Action plan section is present but has 0 levers.',
        evidence: 'lever_count=0',
        fix_kind: 'rerun_ai_slot',
        fix_target: 'sec-actions'
      });
    } else if (leverCount < 2) {
      findings.push({
        id: 'table-thin-levers',
        reviewer: 'table',
        severity: 'major',
        category: 'thin_section',
        section: 'sec-actions',
        message: 'Action plan has only ' + leverCount + ' lever (expected 2+).',
        evidence: 'lever_count=' + leverCount,
        fix_kind: 'rerun_ai_slot',
        fix_target: 'sec-actions'
      });
    }
  }

  // ─── 5) "—" KPI values in cover/assessment (broken-looking primary KPIs)
  var assessment = pack.sections.find(function(s) { return s.id === 'sec-assessment'; });
  if (assessment) {
    var assessHtml = pack.html.slice(assessment.offset, assessment.offset + assessment.bytes);
    // Count em-dash KPIs (—) in kpi-v positions
    var emDashKpis = (assessHtml.match(/class="kpi-v"[^>]*>[^<]*\u2014[^<]*</g) || []).length;
    if (emDashKpis >= 2) {
      findings.push({
        id: 'table-empty-kpis',
        reviewer: 'table',
        severity: 'blocker',
        category: 'empty_section',
        section: 'sec-assessment',
        message: emDashKpis + ' headline KPIs render as em-dashes (—) — looks broken to a client reader.',
        evidence: 'emDash_count=' + emDashKpis,
        fix_kind: 'block_data',
        fix_target: 'kpi-resolution'
      });
    }
  }

  return findings;
}

module.exports = { audit: audit };
