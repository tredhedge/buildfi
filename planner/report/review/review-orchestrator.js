// review-orchestrator.js — Drives the full review loop:
//
//   1. Render DRAFT (existing pipeline)
//   2. Build review pack
//   3. Run reviewers in parallel
//   4. Arbitrate findings → fix plan
//   5. Apply fix plan to data payload
//   6. Render CORRECTED
//   7. Re-audit corrected
//   8. Ship gate (codex 9/10 standard: 0 blocker, ≤5 major)
//
// Output artifacts:
//   draft/{profile}.html
//   review/{profile}.review-pack.json
//   review/{profile}.findings.json
//   review/{profile}.fix-plan.json
//   corrected/{profile}.html
//   review/{profile}.postfix-findings.json
//   final/{profile}.html      (only if gate OK)
//   review/{profile}.fail.json (otherwise)

'use strict';
var fs = require('fs');
var path = require('path');
var packBuilder = require('./review-pack-builder.js');
var arbiter = require('./review-arbiter.js');
var corrector = require('./correction-pass.js');
var dataAuditor = require('./reviewers/data-auditor.js');
var tableAuditor = require('./reviewers/table-auditor.js');
var languageAuditor = require('./reviewers/language-auditor.js');
var chartAuditor = require('./reviewers/chart-auditor.js');
// ─── Premium-rebuild auditors (P1.7) ────────────────────────────────────
// Optional require so a missing file doesn't crash the pipeline. Each
// auditor returns [] when nothing applies. Errors caught + reported as
// minor findings rather than throwing.
function _safeRequire(p) { try { return require(p); } catch (e) { return null; } }
var narrationAuditor      = _safeRequire('./reviewers/narration-auditor.js');
var actionAuditor         = _safeRequire('./reviewers/action-auditor.js');
var riskCollapseAuditor   = _safeRequire('./reviewers/risk-collapse-auditor.js');
var depthAuditor          = _safeRequire('./reviewers/depth-auditor.js');
var complianceAuditor     = _safeRequire('./reviewers/compliance-auditor.js');
var visualIntegrityAuditor = _safeRequire('./reviewers/visual-integrity-auditor.js');
var streamAccountingAuditor = _safeRequire('./reviewers/stream-accounting-auditor.js');
// Phase B (audit-before-render). Both auditors are cross-section
// integrity gates: numbers must trace to canonical (B1), and rhetorical
// posture must match the canonical success-rate band (B2). They run
// after the existing structural auditors so failures dominate the fix
// plan.
var canonicalQuoteAuditor = _safeRequire('./reviewers/canonical-quote-auditor.js');
var thesisCoherenceAuditor = _safeRequire('./reviewers/thesis-coherence-auditor.js');
// Trust/consistency phase — cross-section reconciliation. Catches the
// case where deterministic narrative or tables in one section disagree
// with the canonical metric another section quotes (couple-scope
// drift, OAS clawback alias, lifetime-tax recompute).
var scopeReconciliationAuditor = _safeRequire('./reviewers/scope-reconciliation-auditor.js');
// Sprint 8 — Content-quality regression auditor. Runs LAST so it sees the
// final HTML body and the full canonical metric set the structural
// auditors already validated. Flags shallow sections + missing
// case-driver-required content beats. NEVER affects the orchestrator's
// run order for the existing 14 auditors.
var contentDepthAuditor = _safeRequire('./reviewers/content-depth-auditor.js');

function _runAuditor(aud, pack, label) {
  if (!aud || typeof aud.audit !== 'function') return [];
  try { return aud.audit(pack) || []; }
  catch (e) {
    return [{
      id: 'auditor-error-' + label,
      reviewer: label,
      severity: 'minor',
      category: 'auditor_error',
      message: 'Auditor "' + label + '" threw: ' + (e && e.message),
      fix_kind: 'manual'
    }];
  }
}

function runAuditors(pack) {
  var findings = [];
  findings.push(_runAuditor(dataAuditor, pack, 'data'));
  findings.push(_runAuditor(tableAuditor, pack, 'table'));
  findings.push(_runAuditor(languageAuditor, pack, 'language'));
  findings.push(_runAuditor(chartAuditor, pack, 'chart'));
  findings.push(_runAuditor(narrationAuditor, pack, 'narration'));
  findings.push(_runAuditor(actionAuditor, pack, 'action'));
  findings.push(_runAuditor(riskCollapseAuditor, pack, 'risk-collapse'));
  findings.push(_runAuditor(depthAuditor, pack, 'depth'));
  findings.push(_runAuditor(complianceAuditor, pack, 'compliance'));
  findings.push(_runAuditor(visualIntegrityAuditor, pack, 'visual'));
  findings.push(_runAuditor(streamAccountingAuditor, pack, 'stream'));
  // Phase B cross-section gates — must run AFTER all per-section
  // auditors so they see the final HTML structure they will be quoting.
  findings.push(_runAuditor(canonicalQuoteAuditor, pack, 'canonical-quote'));
  findings.push(_runAuditor(thesisCoherenceAuditor, pack, 'thesis-coherence'));
  findings.push(_runAuditor(scopeReconciliationAuditor, pack, 'scope-reconciliation'));
  // Sprint 8 — content-depth runs last (intentional: needs final HTML).
  findings.push(_runAuditor(contentDepthAuditor, pack, 'content-depth'));
  return arbiter.arbitrate(findings);
}

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

function review(opts) {
  var profile = opts.profile;
  var draftHtmlPath = opts.draftHtmlPath;
  var mcPath = opts.mcPath;
  var responsePath = opts.responsePath;
  var dPayload = opts.dPayload;
  var outDir = opts.outDir;

  ensureDir(path.join(outDir, 'review'));
  ensureDir(path.join(outDir, 'draft'));
  ensureDir(path.join(outDir, 'corrected'));
  ensureDir(path.join(outDir, 'final'));

  // ─── Pass 1: build pack + audit draft ──────────────────────────────
  var pack = packBuilder.buildReviewPack(profile, draftHtmlPath, mcPath, responsePath, dPayload);
  fs.writeFileSync(path.join(outDir, 'review', profile.id + '_' + profile.lang + '.review-pack.json'),
    JSON.stringify({ profile: pack.profile, canonical: pack.canonical, sections: pack.sections, charts: pack.charts, percentages: pack.percentages.slice(0, 50) }, null, 2));
  var arbResult = runAuditors(pack);
  fs.writeFileSync(path.join(outDir, 'review', profile.id + '_' + profile.lang + '.findings.json'),
    JSON.stringify(arbResult, null, 2));
  fs.writeFileSync(path.join(outDir, 'review', profile.id + '_' + profile.lang + '.fix-plan.json'),
    JSON.stringify(arbResult.fix_plan, null, 2));

  return {
    profile: profile.id + '_' + profile.lang,
    pre_findings: arbResult,
    pack: pack,
    fix_plan: arbResult.fix_plan,
    can_ship_pre: arbResult.can_ship
  };
}

module.exports = { review: review, runAuditors: runAuditors };
