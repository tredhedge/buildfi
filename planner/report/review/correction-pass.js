// correction-pass.js — Applies the fix plan to the DRAFT, producing CORRECTED.
//
// V1 strategy is conservative: we route fixes to the right channel, but
// destructive section-level surgery happens in the renderer (gated on
// d._fixPlan flags). This module returns a mutated `data` payload that the
// renderer will read.
//
// FIX KINDS we apply automatically in V1:
//   remove_section          → set d._suppressed[id] = true (renderer skips)
//   replace_with_callout    → set d._compact[id] = true (renderer emits short callout)
//   rerun_ai_slot           → set d._slotsToRerun[key] = true (NOT actually
//                             re-calling AI here — flag for next pipeline run)
//   recompute_from_canonical → set d._useCanonical[metric] = true
//   localize_label          → set d._localize = true
//   block_data              → set d._dataBlocked = true (NO SHIP)

'use strict';

function applyFixPlan(data, fixPlan) {
  data._suppressed = data._suppressed || {};
  data._compact = data._compact || {};
  data._slotsToRerun = data._slotsToRerun || {};
  data._useCanonical = data._useCanonical || {};
  data._localize = false;
  data._dataBlocked = false;

  (fixPlan.remove_section || []).forEach(function(f) {
    if (f.section) data._suppressed[f.section] = true;
    if (f.target && f.target !== f.section) data._suppressed[f.target] = true;
  });
  (fixPlan.replace_with_callout || []).forEach(function(f) {
    if (f.section) data._compact[f.section] = true;
  });
  (fixPlan.rerun_ai_slot || []).forEach(function(f) {
    if (f.target) data._slotsToRerun[f.target] = true;
  });
  (fixPlan.recompute_from_canonical || []).forEach(function(f) {
    if (f.target) data._useCanonical[f.target] = true;
  });
  if ((fixPlan.localize_label || []).length > 0) data._localize = true;
  if ((fixPlan.block_data || []).length > 0) data._dataBlocked = true;

  return data;
}

module.exports = { applyFixPlan: applyFixPlan };
