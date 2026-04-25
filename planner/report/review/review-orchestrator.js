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

function runAuditors(pack) {
  var findings = [];
  findings.push(dataAuditor.audit(pack));
  findings.push(tableAuditor.audit(pack));
  findings.push(languageAuditor.audit(pack));
  findings.push(chartAuditor.audit(pack));
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
