// report-render-profile.js — CLASSIFIER-RENDER-PLAN Phase 1.
// ══════════════════════════════════════════════════════════════════════
// Derives a `renderProfile` object from the three classifier inputs
// (finLiteracy, stressLevel, detailPref) collected at quiz time. The
// renderProfile becomes a first-class dispatch key consumed by:
//   • report-pdf.js / report-html-360.js  → chart visibility, density
//   • report-charts.js                    → text/hybrid/chart per block
//   • report-ai-prompt.js                 → jargon mode, omitted blocks
//   • review/* auditors                   → suppress false positives on
//                                            hidden blocks
//
// Phase 1 is PURELY ADDITIVE. The renderProfile is computed and stamped
// on the data payload but nothing reads from it yet. Phase 2-6 wire the
// dispatch downstream.
//
// Decision tree per CLASSIFIER-RENDER-PLAN.md section 3.
// ══════════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  // ── Decision tree ──────────────────────────────────────────────────
  function deriveRenderProfile(finLiteracy, stressLevel, detailPref) {
    finLiteracy = finLiteracy || 'intermediate';
    stressLevel = stressLevel || 'moderate';
    detailPref  = detailPref  || 'balanced';

    // Axis A — chart tier (driven by finLiteracy)
    var chartTier =
      finLiteracy === 'beginner' ? 'lite' :
      finLiteracy === 'advanced' ? 'full' : 'std';

    // Axis B — tone mode (driven by stressLevel)
    var toneMode =
      stressLevel === 'high' ? 'calm' :
      stressLevel === 'low'  ? 'direct' : 'neutral';

    // Axis C — density mode (driven by detailPref)
    var densityMode =
      detailPref === 'concise'  ? 'compact' :
      detailPref === 'detailed' ? 'deep'    : 'balanced';

    // Derived flags — chart visibility
    var showFan          = chartTier !== 'lite';
    var showTornado      = chartTier === 'full';
    var showSensitivity  = chartTier === 'full';
    var showSequenceRisk = chartTier === 'full' || (chartTier === 'std' && densityMode === 'deep');
    var showFeeBar       = chartTier !== 'lite';

    // Section collapse rules
    var collapseAssumptions = densityMode === 'compact';
    var collapseStressTests = densityMode === 'compact' || toneMode === 'calm';
    var collapseMethodology = densityMode !== 'deep';
    var collapseGlossary    = densityMode !== 'deep';

    // Tone-driven visual rules
    var bandColor =
      toneMode === 'calm'   ? 'soft' :
      toneMode === 'direct' ? 'stark' : 'standard';
    var leadWith =
      toneMode === 'calm'   ? 'floor' :
      toneMode === 'direct' ? 'dispersion' : 'projection';

    // Vocabulary
    var jargonMode =
      finLiteracy === 'beginner' ? 'plain' :
      finLiteracy === 'advanced' ? 'technical' : 'mixed';

    // Glossary on first use
    var inlineGlossary = finLiteracy === 'beginner' || densityMode === 'deep';

    // Footnotes
    var showFootnotes = densityMode === 'deep';

    return {
      // Raw axis values (preserved at top level for cover banner + auditors)
      finLiteracy: finLiteracy, stressLevel: stressLevel, detailPref: detailPref,
      chartTier: chartTier, toneMode: toneMode, densityMode: densityMode,
      jargonMode: jargonMode,
      showFan: showFan, showTornado: showTornado, showSensitivity: showSensitivity,
      showSequenceRisk: showSequenceRisk, showFeeBar: showFeeBar,
      collapseAssumptions: collapseAssumptions, collapseStressTests: collapseStressTests,
      collapseMethodology: collapseMethodology, collapseGlossary: collapseGlossary,
      bandColor: bandColor, leadWith: leadWith,
      inlineGlossary: inlineGlossary, showFootnotes: showFootnotes,
      // Back-compat — earlier wirings consumed _input.{finLiteracy,...}
      _input: { finLiteracy: finLiteracy, stressLevel: stressLevel, detailPref: detailPref }
    };
  }

  // ── Per-block representation resolver ──────────────────────────────
  // Returns 'chart' | 'hybrid' | 'text' | 'chart_simplified' | 'omit'.
  // Phase 2 wires this into the dispatch chain. Phase 1 is dormant.
  function resolveRepresentation(blockId, profile, hasData) {
    if (!hasData) return 'omit';
    if (!profile) return 'chart'; // safety: missing profile → default to chart

    if (blockId === 'income_waterfall') return 'chart';

    if (blockId === 'stress_tests' && profile.toneMode === 'calm' && profile.chartTier !== 'full') {
      return 'text';
    }

    if (blockId === 'sequence_of_returns') {
      if (profile.chartTier === 'lite') return 'omit';
      if (profile.chartTier === 'std')  return profile.densityMode === 'deep' ? 'hybrid' : 'omit';
      return 'chart';
    }

    if (blockId === 'fee_impact') {
      if (profile.chartTier === 'lite') return 'text';
      if (profile.chartTier === 'std')  return 'hybrid';
      return 'chart';
    }

    if (blockId === 'tornado' || blockId === 'sensitivity') {
      return profile.chartTier === 'full' ? 'chart' : 'omit';
    }

    if (blockId === 'percentile_fan') {
      if (profile.chartTier === 'lite') return 'text';
      if (profile.chartTier === 'std')  return 'chart_simplified';
      return 'chart';
    }

    return profile.chartTier === 'lite' ? 'hybrid' : 'chart';
  }

  // ── Content-layer relevance filter ─────────────────────────────────
  // Returns false to OMIT a block from the rendered report. Phase 5
  // wires this in. Conservative by default: when in doubt, show.
  function isBlockRelevant(blockId, data, profile) {
    if (!profile || !data) return true;
    var p = data.p || {};

    // OAS clawback irrelevant when reader can't act on it AND clawback is zero
    if (blockId === 'oas_clawback') {
      if (profile.jargonMode === 'plain' && (data.oasClbkYrs || 0) === 0) return false;
    }
    // CCPC analysis only when a corp exists
    if (blockId === 'ccpc_extraction' && !p.bizOn) return false;
    // Asset-location strategy hidden for beginners
    if (blockId === 'asset_location' && profile.jargonMode === 'plain') return false;
    // Sequence-of-returns can be hidden for high-coverage calm readers
    if (blockId === 'sequence_of_returns' && (data.covRatio || 0) > 0.8 && profile.toneMode === 'calm') {
      return false;
    }
    // RRSP meltdown is an advanced tax-arbitrage strategy. Beginners get it
    // hidden (technical jargon-heavy and easy to misapply); meltdown belongs
    // to mixed/technical readers OR readers who explicitly chose 'detailed'.
    if (blockId === 'meltdown') {
      if (profile.jargonMode === 'plain' && profile.densityMode !== 'deep') return false;
    }
    // Real estate / rental-property analysis: no rentals → omit by content;
    // for beginner+compact readers we also drop it because the property tables
    // overwhelm someone with a single primary residence and nothing to model.
    if (blockId === 'real_estate') {
      var props = (p && p.props) || [];
      var rentalCount = props.filter(function(pr) {
        return pr && pr.on && (pr.rm || 0) > 0;
      }).length;
      if (rentalCount === 0 && profile.jargonMode === 'plain') return false;
    }
    // Goals: always relevant when present, but a beginner+calm reader with
    // a single small goal sees a sparse table — keep it; only suppress when
    // the data layer marks it empty.
    if (blockId === 'goals') {
      var goals = (p && p.goals) || [];
      if (goals.length === 0) return false;
    }
    // Sensitivity tornado already gated on chartTier='full' by resolveRepresentation;
    // here we add a content-relevance veto for beginner readers regardless.
    if (blockId === 'sensitivity' && profile.jargonMode === 'plain') return false;
    // Risk dispersion narrative (sec-risk) and stress-tests (sec-stress) are
    // technical sections per Audit 8 (2026-04-27): plain-mode readers do not
    // benefit from "P25-P75 dispersion" or "9 named stress scenarios" — they
    // overload the reader and undercut the beginner-friendly framing.
    if ((blockId === 'risk' || blockId === 'stress_tests') && profile.jargonMode === 'plain') return false;
    // Codex 2026-04-27 P4: methodology, assumptions, glossary back-matter
    // is for advanced/intermediate readers. Plain-mode (beginner+concise)
    // gets inline term hovers + a calmer cover; these appendices are too
    // dense and feel like machinery.
    if ((blockId === 'methodology' || blockId === 'assumptions' || blockId === 'glossary')
        && profile.jargonMode === 'plain') return false;
    return true;
  }

  // ── Jargon swap table — Phase 2 jargonMode='plain' substitutions ───
  // Each entry: { fr: { from, to }, en: { from, to } }. Used by a
  // future jargon-swap helper that runs over deterministic narrative
  // when jargonMode === 'plain'. The AI prompt's CALIBRATION block
  // already handles the AI text — this swaps the deterministic
  // copy that the renderer emits.
  var JARGON_SWAPS = {
    en: {
      'tax alpha':              'tax savings',
      'lifetime effective rate':'average tax rate',
      'OAS clawback':           'OAS reduction',
      'P25':                    'cautious scenario',
      'P50':                    'typical scenario',
      'P75':                    'favourable scenario',
      'Monte Carlo':            'simulated futures',
      'engine output':          'projection',
      'traceable to an engine output': 'reflects the projection',
      't-Student':              'fat-tailed',
      'fat-tailed':             'with rare-event allowance',
      'sequence-of-returns':    'order-of-returns'
    },
    fr: {
      'alpha fiscal':           '\u00e9conomies fiscales',
      'taux effectif viager':   'taux d\'imp\u00f4t moyen',
      'r\u00e9cup\u00e9ration de la PSV': 'r\u00e9duction de la PSV',
      'P25':                    'sc\u00e9nario prudent',
      'P50':                    'sc\u00e9nario typique',
      'P75':                    'sc\u00e9nario favorable',
      'Monte Carlo':            'avenirs simul\u00e9s',
      'sortie du moteur':       'projection',
      's\u00e9quence des rendements': 'ordre des rendements'
    }
  };

  function applyJargonSwap(text, profile, lang) {
    if (!profile || profile.jargonMode !== 'plain') return text;
    if (!text) return text;
    var swaps = JARGON_SWAPS[lang === 'en' ? 'en' : 'fr'] || {};
    var out = text;
    Object.keys(swaps).forEach(function(from) {
      // Case-insensitive whole-word replace; preserve first letter case.
      var re = new RegExp('\\b' + from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
      out = out.replace(re, swaps[from]);
    });
    return out;
  }

  // ── Loss-language swap (Phase 3 will use this) ─────────────────────
  // For toneMode='calm', soften loss vocabulary. For 'direct', keep raw.
  // For 'neutral', mild softening. Output goes through language-auditor
  // before being merged (per Q4 from plan-question debrief).
  var LOSS_LANGUAGE = {
    en: {
      calm:    { 'depletion': 'later-life adjustment window', 'fails': 'would benefit from review', 'ruin': 'savings shortfall', 'crisis': 'pressure point' },
      direct:  {},
      neutral: { 'fails': 'would benefit from review' }
    },
    fr: {
      calm:    { '\u00e9puisement': 'ajustement en fin de vie', '\u00e9chec': 'b\u00e9n\u00e9ficierait d\'une r\u00e9vision', 'ruine': 'p\u00e9nurie d\'\u00e9pargne', 'crise': 'point de pression' },
      direct:  {},
      neutral: { '\u00e9chec': 'b\u00e9n\u00e9ficierait d\'une r\u00e9vision' }
    }
  };

  function lossLanguageFor(text, profile, lang) {
    if (!profile || !text) return text;
    var modeMap = (LOSS_LANGUAGE[lang === 'en' ? 'en' : 'fr'] || {})[profile.toneMode] || {};
    var out = text;
    Object.keys(modeMap).forEach(function(from) {
      var re = new RegExp('\\b' + from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
      out = out.replace(re, modeMap[from]);
    });
    return out;
  }

  // ── Export ─────────────────────────────────────────────────────────
  var api = {
    deriveRenderProfile: deriveRenderProfile,
    resolveRepresentation: resolveRepresentation,
    isBlockRelevant: isBlockRelevant,
    applyJargonSwap: applyJargonSwap,
    lossLanguageFor: lossLanguageFor,
    _JARGON_SWAPS: JARGON_SWAPS,
    _LOSS_LANGUAGE: LOSS_LANGUAGE
  };

  if (typeof window !== 'undefined') {
    window.BFRenderProfile = api;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

})();
