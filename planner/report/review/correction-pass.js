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
//   rerun_ai_slot           → clear the contaminated AI slot so the renderer
//                             falls back to deterministic prose on pass 2
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
  // Premium-rebuild flag: when narration-auditor flags a slot, the
  // corresponding section-level flag tells the renderer to fall back to
  // deterministic prose for THAT slot specifically. _slotsToRerun already
  // captures this via the same key as the AI slot name.

  // Sprint 8 follow-up: build a "protected slots" set BEFORE we apply any
  // clearing actions. When the content-depth auditor flagged a slot for
  // missing required beats, that slot must NOT be cleared — clearing it
  // produces a deterministic-fallback that lacks the beats, defeating the
  // purpose. The content-depth finding itself uses fix_kind=rerun_ai_slot,
  // but here we treat its target as a soft "preserve" for the current pass:
  // the slot's text stays in place; the regen queue captures it for AI
  // regeneration in the next production cycle. Other auditors (canonical
  // quote, thesis coherence) lose to content-depth in V1 — wrong numbers
  // are a worse problem than missing beats, but the corrector clearing
  // a slot to fix one number AND erasing 5 beats is the wrong tradeoff.
  // When the V1 AI-regen pipeline lands, this preserve becomes obsolete.
  var protectedSlots = {};
  (fixPlan.rerun_ai_slot || []).forEach(function(f) {
    if (f.reviewer === 'content-depth' && f.target) {
      // f.target may be a section ID like 'sec-corp' (not a slot key).
      // For now, also try to map common section→slot pairs. This is
      // imperfect but gets the most common cases covered.
      protectedSlots[f.target] = true;
    }
  });
  // Section→slot inference: if content-depth flagged sec-corp, the
  // primary AI slot at risk is corp_insight. Same for tax→taxInsight,
  // trajectory→trajectory_insight, etc.
  var SECTION_TO_SLOT = {
    'sec-corp': 'corp_insight',
    'sec-tax': 'taxInsight',
    'sec-revenue': 'income_insight',
    'sec-projection': 'trajectory_insight',
    'sec-gis': 'gis_insight',
    'sec-meltdown': 'meltdown_insight',
    'sec-debt': 'debt_insight',
    'sec-real-estate': 'real_estate_insight',
    'sec-realestate': 'real_estate_insight',
    'sec-rsu': 'rsu_insight',
    'sec-risk': 'riskInsight',
    'sec-succession': 'estateInsight',
    'sec-goals': 'goals_insight',
    'sec-family': 'family_insight',
    'sec-stress': 'stress_interpretation',
    'sec-letter': 'advisor_letter',
    'sec-assessment': 'overall_assessment'
  };
  Object.keys(protectedSlots).forEach(function(sec) {
    var slot = SECTION_TO_SLOT[sec];
    if (slot) protectedSlots[slot] = true;
  });

  (fixPlan.remove_section || []).forEach(function(f) {
    if (f.section) data._suppressed[f.section] = true;
    if (f.target && f.target !== f.section) data._suppressed[f.target] = true;
  });
  (fixPlan.replace_with_callout || []).forEach(function(f) {
    if (f.section) data._compact[f.section] = true;
    if (f.target && f.target !== f.section) data._compact[f.target] = true;
  });
  (fixPlan.rerun_ai_slot || []).forEach(function(f) {
    if (f.target) {
      data._slotsToRerun[f.target] = true;
      // Skip the clear when the slot is protected by a content-depth finding.
      // The slot stays in place; AI-regen queue captures it for next cycle.
      if (protectedSlots[f.target]) return;
      if (data.ai && Object.prototype.hasOwnProperty.call(data.ai, f.target)) {
        data.ai[f.target] = '';
      }
    }
  });
  (fixPlan.recompute_from_canonical || []).forEach(function(f) {
    if (f.target) data._useCanonical[f.target] = true;
  });
  if ((fixPlan.localize_label || []).length > 0) data._localize = true;
  if ((fixPlan.block_data || []).length > 0) data._dataBlocked = true;

  return data;
}

module.exports = { applyFixPlan: applyFixPlan };
