// risk-collapse-auditor.js — Premium-rebuild auditor (P1.3).
//
// The Risk + Stress sections cannibalize each other when the plan is
// ultra-stable. Codex flagged this in ccpc_owner_en (P25=P75 collapsed,
// stress all 100%) and conservative_retiree_qc_fr (stress all 100%, median
// wealth 0$). Showing two full sections of "everything is stable" is
// padding that erodes trust.
//
// Rule (per plan §P1.3):
//   if dispersion_pts ≤ 5 AND stress_pts ≤ 2 → collapse both into a single
//   "Stabilité du plan" callout. Renderer reads d._compact[id]=true.
//
// Categories:
//   - risk_redundant: rule fires → emit replace_with_callout for sec-stress
//     (keep sec-risk because tornado still adds info; collapse the stress
//     table). When the renderer collapses, a future audit run sees no
//     stress section, which is the desired terminal state.
//
// Not a blocker — this is a quality finding. Emitted as `major` so the
// correction pass repairs it, then ship gate clears.

'use strict';
var Contract = require('../review-contract.js');

function audit(pack) {
  var findings = [];
  var disp = pack.canonical.dispersion_pts;
  var stress = pack.canonical.stress_pts;
  var thresh = (Contract.COLLAPSE_THRESHOLDS) || { dispersion_pts_max: 5, stress_pts_max: 2 };

  var hasRisk = pack.sections.some(function(s) { return s.id === 'sec-risk'; });
  var hasStress = pack.sections.some(function(s) { return s.id === 'sec-stress'; });

  if (!hasRisk && !hasStress) return findings;

  // Both signals must be present and below threshold to collapse. Missing
  // canonical values mean the engine didn't compute them — we can't safely
  // decide, so we don't fire.
  if (disp == null || stress == null) return findings;
  if (Math.abs(disp) > thresh.dispersion_pts_max) return findings;
  if (Math.abs(stress) > thresh.stress_pts_max) return findings;

  // Plan is structurally stable. Replace the stress section with a callout.
  if (hasStress) {
    findings.push({
      id: 'risk-collapse-stress',
      reviewer: 'narrative',
      severity: 'major',
      category: 'risk_redundant',
      section: 'sec-stress',
      message: 'Risk dispersion (' + disp + ' pts) and stress range (' + stress + ' pts) are both below collapse thresholds. Stress table is padding — collapse to callout.',
      evidence: 'dispersion=' + disp + ' stress=' + stress + ' thresh=' + thresh.dispersion_pts_max + '/' + thresh.stress_pts_max,
      fix_kind: 'replace_with_callout',
      fix_target: 'sec-stress'
    });
  }

  return findings;
}

module.exports = { audit: audit };
