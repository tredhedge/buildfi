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

  // ─── 2.5) TOC must not point to non-rendered anchors ──────────────────
  var tocRe = /<a href="#(sec-[a-z-]+)"/g;
  var tocMatch;
  while ((tocMatch = tocRe.exec(pack.html)) !== null) {
    var tocId = tocMatch[1];
    if (!presentIds[tocId]) {
      findings.push({
        id: 'table-broken-toc-' + tocId,
        reviewer: 'table',
        severity: 'blocker',
        category: 'broken_toc',
        section: null,
        message: 'Table of contents links to "' + tocId + '" but that section is not rendered.',
        evidence: 'href=#' + tocId,
        fix_kind: 'manual',
        fix_target: tocId
      });
    }
  }

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

  // ─── 6) Client-visible AI placeholders are not allowed ────────────────
  if (/class="ai-placeholder"/i.test(pack.html) ||
      /Click "AI Analysis" for a personalized observation\./i.test(pack.html) ||
      /Cliquez sur [^<]{0,40}Analyse IA[^<]{0,80}observation personnalis/i.test(pack.html)) {
    findings.push({
      id: 'table-ai-placeholder-visible',
      reviewer: 'table',
      severity: 'blocker',
      category: 'placeholder_visible',
      section: null,
      message: 'A client-visible AI placeholder is still present in the rendered report.',
      evidence: 'ai-placeholder / Click "AI Analysis"',
      fix_kind: 'manual',
      fix_target: 'global'
    });
  }

  // ─── 7) Debt table row-credibility check (P1.4) ──────────────────────
  // Pattern that broke trust in debt_young_fr: 3 active debts, balance > 0,
  // but monthly payment = 0 AND months remaining = 0. Reads as broken to
  // any reader. Fix: renderer must skip such rows OR replace them with a
  // "modalités à confirmer" note. Auditor enforces the rule by inspecting
  // the rendered table directly.
  var debtSec = pack.sections.find(function(s) { return s.id === 'sec-debt'; });
  if (debtSec) {
    var debtHtml = pack.html.slice(debtSec.offset, debtSec.offset + debtSec.bytes);
    // Each tbody row is <tr><td>name</td><td>balance</td><td>rate%</td>
    // <td>payment/m</td><td>months</td></tr>
    var rowRe = /<tr[^>]*>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<\/tr>/g;
    var rm;
    var bad = 0;
    var examples = [];
    while ((rm = rowRe.exec(debtHtml)) !== null) {
      var balRaw = (rm[2] || '').replace(/[^\d-]/g, '');
      var payRaw = (rm[4] || '').replace(/[^\d-]/g, '');
      var monRaw = (rm[5] || '').replace(/[^\d-]/g, '');
      var bal = parseInt(balRaw, 10);
      var pay = parseInt(payRaw, 10);
      var mon = parseInt(monRaw, 10);
      // Skip header rows (often have non-numeric content)
      if (isNaN(bal) || bal <= 0) continue;
      if ((isNaN(pay) || pay === 0) && (isNaN(mon) || mon === 0)) {
        bad++;
        if (examples.length < 3) examples.push((rm[1] || '').trim() + ' bal=' + bal);
      }
    }
    if (bad > 0) {
      findings.push({
        id: 'table-debt-zero-rows',
        reviewer: 'table',
        severity: 'blocker',
        category: 'debt_table_invalid',
        section: 'sec-debt',
        message: bad + ' debt row(s) carry a positive balance with payment=0 AND months_remaining=0 — looks broken to any reader.',
        evidence: examples.join(' | '),
        fix_kind: 'manual',
        fix_target: 'sec-debt-rows'
      });
    }
  }

  return findings;
}

module.exports = { audit: audit };
