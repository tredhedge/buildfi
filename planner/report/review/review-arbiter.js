// review-arbiter.js — Aggregates findings from all reviewers.
// Dedupes, classifies severity, emits fix-plan.

'use strict';
var Contract = require('./review-contract.js');

function arbitrate(findingsArray) {
  // Flatten + dedupe by id
  var byId = {};
  findingsArray.forEach(function(arr) {
    (arr || []).forEach(function(f) {
      if (!byId[f.id]) byId[f.id] = f;
    });
  });
  var findings = Object.values(byId);

  // Classify
  var blockers = findings.filter(function(f) { return f.severity === 'blocker'; });
  var majors   = findings.filter(function(f) { return f.severity === 'major'; });
  var minors   = findings.filter(function(f) { return f.severity === 'minor'; });

  // Build fix plan — group by fix_kind so the correction pass can route
  var fixPlan = {
    remove_section: [],
    rerun_ai_slot: [],
    recompute_from_canonical: [],
    block_data: [],
    replace_with_callout: [],
    localize_label: [],
    manual: []
  };
  findings.forEach(function(f) {
    var kind = f.fix_kind || 'manual';
    if (!fixPlan[kind]) fixPlan[kind] = [];
    fixPlan[kind].push({ section: f.section, target: f.fix_target, severity: f.severity, message: f.message });
  });

  // Ship decision
  var canShip = blockers.length === 0 && majors.length <= Contract.SHIP_GATE.max_majors_for_ship;

  return {
    findings: findings,
    blockers: blockers,
    majors: majors,
    minors: minors,
    fix_plan: fixPlan,
    can_ship: canShip,
    blocker_count: blockers.length,
    major_count: majors.length,
    minor_count: minors.length
  };
}

module.exports = { arbitrate: arbitrate };
