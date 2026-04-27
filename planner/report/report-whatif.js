// report-whatif.js — Phase 13 "What-If" live re-simulator (expanded edition).
//
// Reads baseline params from window.__BUILDFI__ + the embedded Monte Carlo
// engine (window.BEngine.runMC). User tweaks 12+ sliders grouped by category,
// or applies a preset (one-click scenario), clicks "Simuler", runMC fires
// client-side at reduced nSim (~500) for snappy response. Results render as
// 12+ KPI deltas vs baseline, with save-and-compare for up to 2 saved scenarios.
//
// Narration AI is NOT regenerated — see explanatory banner in the section
// itself. What-If is a deterministic exploration tool; the narration in the
// main report stays calibrated on the baseline simulation.

(function() {
  "use strict";
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!window.BEngine || typeof window.BEngine.runMC !== 'function') return;
  if (!window.__BUILDFI__ || !window.__BUILDFI__.meta) return;

  var P = window.__BUILDFI__;
  var M = P.meta || {};
  var B = P.baseline || {};
  var isFR = !!M.fr;

  // Saved scenarios store (up to 2)
  var _savedScenarios = [];

  function fmtCompact(v) {
    if (v == null || !isFinite(v)) return '—';
    var a = Math.abs(v);
    if (a >= 1e6) return (v < 0 ? '−' : '') + (a / 1e6).toFixed(1).replace('.', isFR ? ',' : '.') + ' M$';
    if (a >= 1e3) return (v < 0 ? '−' : '') + Math.round(a / 1e3) + ' K$';
    return Math.round(v) + '$';
  }
  function fmtDelta(v, unit) {
    if (v == null || !isFinite(v) || v === 0) return '—';
    var s = v > 0 ? '+' : '−';
    var abs = Math.abs(v);
    if (unit === 'pts') return s + abs.toFixed(1).replace('.', isFR ? ',' : '.') + ' pts';
    if (unit === '$') return s + fmtCompact(abs).replace(/^\−/, '');
    if (unit === 'yrs') return s + abs + (isFR ? ' ans' : ' yrs');
    if (unit === '%') return s + abs.toFixed(1) + '%';
    return s + abs;
  }
  function colorDelta(v, goodIfPositive) {
    if (!v || !isFinite(v)) return '#706558';
    var good = goodIfPositive !== false;
    return v > 0 ? (good ? '#2a8c46' : '#cc4444') : v < 0 ? (good ? '#cc4444' : '#2a8c46') : '#706558';
  }

  // Read params from section wrapper (emitted by report-pdf.js renderWhatIf).
  function _readBaseline() {
    var wrap = document.getElementById('bf-whatif');
    if (!wrap) return null;
    var raw = wrap.getAttribute('data-bf-whatif-params');
    if (!raw) return null;
    try { return JSON.parse(raw.replace(/&quot;/g, '"')); } catch (e) { return null; }
  }

  // ──────────────────────────────────────────────────────────────────────
  // CURATED DECISIONS (Level 1) — codex 2026-04-27 spec.
  //   Show 3-4 cards, framed as REAL CLIENT DECISIONS (not market shocks).
  //   "Retire 2 years later" / "Delay CPP/QPP to 70" / "Reduce fees" / "Spend 10% less".
  //   Market-shock chips (2008 Recession, Stagflation, Bull markets) are
  //   demoted to Level-2 advanced controls below the curated set.
  //   Archetype-driven: decum/transition see decisions about WHEN to draw
  //   on benefits and HOW MUCH to spend; accum/fire see decisions about
  //   timing + saving pace. Beginner readers see only L1.
  // ──────────────────────────────────────────────────────────────────────
  function _curatedDecisions(baseline, archPhase) {
    var decum = (archPhase === 'decum' || archPhase === 'transition');
    var fire = (archPhase === 'fire');
    var defaults = [
      {
        id: 'cpp_delay_70',
        label: isFR ? 'Reporter le RPC/RRQ à 70' : 'Delay CPP/QPP to 70',
        desc: isFR ? 'Vos prestations gouvernementales débutent à 70 — augmentation viagère ~42%.'
                   : 'Public benefits start at 70 — lifetime payout increases ~42%.',
        apply: { qppAge: 70, oasAge: 70 }
      },
      {
        id: 'reduce_fees',
        label: isFR ? 'Baisser les frais de gestion' : 'Reduce investment fees',
        desc: isFR ? 'MER ramené à 0,5% — rendement net plus élevé année après année.'
                   : 'MER lowered to 0.5% — higher net return compounded over time.',
        apply: { eqRet: Math.max(0.02, (baseline.eqRet || 0.06) + Math.max(0, (baseline.merWt || 0.01) - 0.005)) }
      },
      {
        id: 'spend_less',
        label: isFR ? 'Réduire les dépenses de 10%' : 'Spend 10% less',
        desc: isFR ? 'Train de vie ajusté à 90% du niveau de référence.'
                   : 'Lifestyle adjusted to 90% of the baseline level.',
        apply: { retSpM: Math.round((baseline.retSpM || 5000) * 0.9) }
      }
    ];
    if (decum) {
      // For retirees / near-retirees, the fourth card is "downsize later"
      // (drop dependence on dispersed wealth). Implementation: simulate a
      // 5% lifestyle cut starting at age 75. Approximated via retSpM × 0.95
      // since the slider lattice doesn't carry an age-keyed cut.
      defaults.push({
        id: 'downsize_75',
        label: isFR ? 'Ajuster le train de vie à 75 ans' : 'Adjust lifestyle at 75',
        desc: isFR ? 'Petite réduction ciblée des dépenses lorsque la mobilité change.'
                   : 'A small, targeted reduction in spending as mobility shifts.',
        apply: { retSpM: Math.round((baseline.retSpM || 5000) * 0.95) }
      });
    } else if (fire) {
      defaults.push({
        id: 'retire_2_later',
        label: isFR ? 'Repousser la retraite de 2 ans' : 'Retire 2 years later',
        desc: isFR ? 'Deux années supplémentaires de cotisations et de revenu salarial.'
                   : 'Two more years of contributions and salary income.',
        apply: { retAge: Math.min(75, (baseline.retAge || 60) + 2) }
      });
    } else {
      // Accumulation default fourth card
      defaults.push({
        id: 'aggressive_save',
        label: isFR ? 'Augmenter l\'épargne (REER +50%)' : 'Increase savings (RRSP +50%)',
        desc: isFR ? 'Cotisations REER majorées de 50% chaque année jusqu\'à la retraite.'
                   : 'RRSP contributions raised 50% every year until retirement.',
        apply: { rrspC: Math.round(((baseline.rrspC || 5000) || 5000) * 1.5) }
      });
    }
    return defaults;
  }

  // Market-shock chips (Level 2 — advanced). Demoted from L1; only shown
  // inside the collapsed advanced panel for non-beginner readers.
  function _marketShocks(baseline) {
    return [
      { id: 'recession', label: isFR ? 'Récession 2008' : '2008 Recession',
        desc: isFR ? 'Rendement −2 pts, inflation +1 pt' : 'Return −2 pts, inflation +1 pt',
        apply: { eqRet: Math.max(0.02, (baseline.eqRet || 0.06) - 0.02), inf: (baseline.inf || 0.021) + 0.01 } },
      { id: 'stagflation', label: 'Stagflation',
        desc: isFR ? 'Rendement −1 pt, inflation +2 pts' : 'Return −1 pt, inflation +2 pts',
        apply: { eqRet: Math.max(0.02, (baseline.eqRet || 0.06) - 0.01), inf: (baseline.inf || 0.021) + 0.02 } },
      { id: 'optimistic', label: isFR ? 'Marchés porteurs' : 'Bull markets',
        desc: isFR ? 'Rendement +1,5 pt' : 'Return +1.5 pts',
        apply: { eqRet: (baseline.eqRet || 0.06) + 0.015 } },
      { id: 'long_life', label: isFR ? 'Longévité élevée' : 'High longevity',
        desc: isFR ? 'Décès projeté +7 ans' : 'Projected death age +7 yrs',
        apply: { deathAge: Math.min(105, (baseline.deathAge || 90) + 7) } }
    ];
  }

  // Read body.dataset.bfArchetypePhase — single source of truth wired by
  // report-pdf.js. Falls back to phase inference from baseline params if
  // the attr is missing (defensive).
  function _readArchetypePhase(baseline) {
    var v = (typeof document !== 'undefined' && document.body && document.body.dataset)
      ? document.body.dataset.bfArchetypePhase : '';
    if (v) return v;
    var ytr = (baseline.retAge || 65) - (baseline.age || 60);
    if (ytr <= 0) return 'decum';
    if (ytr <= 7 && (baseline.age || 60) >= 52) return 'transition';
    if ((baseline.retAge || 65) < 55 && ytr >= 1) return 'fire';
    return 'accum';
  }

  function _isPlainReader() {
    if (typeof document === 'undefined' || !document.body) return false;
    return document.body.dataset.bfJargonMode === 'plain';
  }

  // Build the UI inside the existing section shell (report-pdf.js emits the
  // header + avertissement; we render the control panel + results here).
  function _buildUI(baselineParams) {
    var wrap = document.getElementById('bf-whatif');
    if (!wrap) return;
    var panel = document.createElement('div');
    panel.className = 'bf-whatif-panel';

    // ─── 12 sliders, organized in 4 categories ────────────────────────
    var slBase = {
      retAge:      { group: 'timing', label: isFR ? 'Âge de retraite' : 'Retirement age',         min: Math.max(50, baselineParams.age + 1), max: 75, step: 1,  val: baselineParams.retAge,    unit: isFR ? ' ans' : ' yrs' },
      deathAge:    { group: 'timing', label: isFR ? 'Âge de décès projeté' : 'Projected death age', min: Math.max(80, baselineParams.retAge + 10), max: 105, step: 1, val: baselineParams.deathAge, unit: isFR ? ' ans' : ' yrs' },
      qppAge:      { group: 'timing', label: isFR ? 'Début RRQ/RPC' : 'CPP/QPP start age',          min: 60, max: 70, step: 1, val: baselineParams.qppAge || 65, unit: isFR ? ' ans' : ' yrs' },
      oasAge:      { group: 'timing', label: isFR ? 'Début PSV' : 'OAS start age',                  min: 65, max: 70, step: 1, val: baselineParams.oasAge || 65, unit: isFR ? ' ans' : ' yrs' },

      retSpM:      { group: 'spending', label: isFR ? 'Dépenses mensuelles' : 'Monthly spending', min: Math.round(baselineParams.retSpM * 0.6), max: Math.round(baselineParams.retSpM * 1.4), step: 100, val: baselineParams.retSpM, unit: '$/mois' },

      eqRet:       { group: 'markets', label: isFR ? 'Rendement actions' : 'Equity return',       min: 3,  max: 10, step: 0.25, val: Math.round((baselineParams.eqRet || 0.06) * 1000) / 10, unit: '%' },
      inf:         { group: 'markets', label: 'Inflation',                                         min: 0.5, max: 6,  step: 0.25, val: Math.round((baselineParams.inf || 0.021) * 1000) / 10, unit: '%' },
      mer:         { group: 'markets', label: isFR ? 'MER (frais portefeuille)' : 'MER (portfolio fees)', min: 0, max: 3, step: 0.1, val: Math.round((baselineParams.merWt || 0) * 1000) / 10, unit: '%' },

      rrspC:       { group: 'strategy', label: isFR ? 'Cotis. REER/an' : 'RRSP contrib/yr',           min: 0,  max: 32000, step: 500, val: baselineParams.rrspC || 0, unit: '$/an' },
      tfsaC:       { group: 'strategy', label: isFR ? 'Cotis. CELI/an' : 'TFSA contrib/yr',           min: 0,  max: 7000, step: 250, val: baselineParams.tfsaC || 0, unit: '$/an' },
      meltTgt:     { group: 'strategy', label: isFR ? 'Cible meltdown REER' : 'RRSP meltdown target', min: 0, max: 150000, step: 5000, val: baselineParams.meltTgt || 0, unit: '$/an' },
      allocR:      { group: 'strategy', label: isFR ? 'Allocation actions REER' : 'RRSP equity alloc', min: 20, max: 95, step: 5, val: Math.round((baselineParams.allocR || 0.6) * 100), unit: '%' }
    };

    // ─── Level 1 — Curated decision cards (always visible) ────────────
    // Codex 2026-04-27 spec: 3-4 cards framed as REAL CLIENT DECISIONS,
    // archetype-driven. Market-shock chips moved to L2 advanced.
    var archPhase = _readArchetypePhase(baselineParams);
    var plainReader = _isPlainReader();
    var curated = _curatedDecisions(baselineParams, archPhase);
    var marketShocks = _marketShocks(baselineParams);
    // L1 wraps in a card grid, not a button bar — each card carries label
    // + description so the reader sees the meaning before clicking.
    var presetsHtml = '<div class="bf-whatif-presets bf-whatif-l1">' +
      '<div class="bf-whatif-presets-label">' + (isFR ? 'Décisions à explorer' : 'Decisions to explore') + '</div>' +
      '<div class="bf-whatif-card-grid">';
    curated.forEach(function(pr) {
      presetsHtml += '<button type="button" class="bf-whatif-decision-card" data-bf-preset="' + pr.id + '">' +
        '<span class="bf-whatif-card-label">' + pr.label + '</span>' +
        '<span class="bf-whatif-card-desc">' + pr.desc + '</span>' +
      '</button>';
    });
    presetsHtml += '</div></div>';
    // The full preset registry — L1 cards + L2 market shocks — for the
    // click-handler dispatcher below.
    var presets = curated.concat(marketShocks);

    // ─── Level 2 — Advanced controls (collapsed, opt-in) ───────────────
    // Codex 2026-04-27: hide entirely for plain readers (beginners).
    // Non-plain readers see a collapsed <details> with sliders + market-
    // shock chips inside. This is the "advanced" tier — visible but
    // demoted, never dominating the main exploration path.
    var groups = {
      timing:   { label: isFR ? 'Échéances' : 'Timing' },
      spending: { label: isFR ? 'Dépenses' : 'Spending' },
      markets:  { label: isFR ? 'Marchés' : 'Markets' },
      strategy: { label: isFR ? 'Stratégie' : 'Strategy' }
    };
    var controlsHtml = '';
    if (!plainReader) {
      controlsHtml = '<details class="bf-whatif-l2">' +
        '<summary class="bf-whatif-l2-summary">' +
          (isFR ? 'Ajuster les hypothèses moi-même (avancé)' : 'Adjust assumptions yourself (advanced)') +
          '<span class="bf-whatif-l2-summary-hint">' +
            (isFR ? ' — curseurs détaillés et chocs de marché' : ' — detailed sliders and market shocks') +
          '</span>' +
        '</summary>' +
        '<div class="bf-whatif-l2-body">';
      // Market-shock chips (demoted from L1).
      controlsHtml += '<div class="bf-whatif-shocks">' +
        '<div class="bf-whatif-shocks-label">' + (isFR ? 'Chocs de marché' : 'Market shocks') + '</div>' +
        '<div class="bf-whatif-shocks-buttons">';
      marketShocks.forEach(function(s) {
        controlsHtml += '<button type="button" class="bf-whatif-shock" data-bf-preset="' + s.id + '" title="' + s.desc + '">' +
          s.label + '</button>';
      });
      controlsHtml += '</div></div>';
      // Slider lattice
      controlsHtml += '<div class="bf-whatif-controls">';
      Object.keys(groups).forEach(function(gKey) {
        var g = groups[gKey];
        controlsHtml += '<div class="bf-whatif-group">' +
          '<div class="bf-whatif-group-header">' +
            '<span class="bf-whatif-group-label">' + g.label + '</span>' +
          '</div>';
        Object.keys(slBase).forEach(function(k) {
          var s = slBase[k];
          if (s.group !== gKey) return;
          controlsHtml += '<div class="bf-whatif-row">' +
            '<label class="bf-whatif-label" for="bfwi-' + k + '">' + s.label + '</label>' +
            '<input type="range" id="bfwi-' + k + '" class="bf-whatif-slider" min="' + s.min + '" max="' + s.max + '" step="' + s.step + '" value="' + s.val + '" data-bf-whatif-key="' + k + '">' +
            '<span class="bf-whatif-val" id="bfwi-' + k + '-out">' + s.val + s.unit + '</span>' +
            '</div>';
        });
        controlsHtml += '</div>';
      });
      controlsHtml += '</div>';
      controlsHtml += '</div></details>';
    } else {
      // Plain reader: no L2 panel rendered. But the card-click dispatcher
      // reads slider DOM elements to apply preset overrides. Without the
      // sliders, the apply step would no-op and the simulation would
      // never change. Emit hidden inputs in lieu of sliders so the
      // existing dispatcher works unchanged. This keeps plain readers in
      // a "guided cards only" UX while preserving the run-loop wiring.
      controlsHtml += '<div class="bf-whatif-hidden-state" style="display:none">';
      Object.keys(slBase).forEach(function(k) {
        var s = slBase[k];
        controlsHtml += '<input type="hidden" id="bfwi-' + k + '" value="' + s.val + '" data-bf-whatif-key="' + k + '">' +
          '<span id="bfwi-' + k + '-out">' + s.val + s.unit + '</span>';
      });
      controlsHtml += '</div>';
    }

    // Action buttons.
    //   plainReader: cards auto-fire → no "See the effect" button. Just
    //     "Keep this alternative" + "Back to my plan" — the minimum to
    //     allow the reader to compare and reset.
    //   non-plain:  all 3 buttons (sliders need an explicit trigger).
    var buttonsHtml = '<div class="bf-whatif-actions">';
    if (!plainReader) {
      buttonsHtml += '<button type="button" id="bf-whatif-simulate" class="bf-whatif-btn">' +
        (isFR ? 'Voir l\'effet sur mon plan' : 'See the effect on my plan') + '</button>';
    }
    buttonsHtml +=
      '<button type="button" id="bf-whatif-save" class="bf-whatif-btn bf-whatif-btn-secondary" disabled>' + (isFR ? 'Conserver cette alternative' : 'Keep this alternative') + '</button>' +
      '<button type="button" id="bf-whatif-reset" class="bf-whatif-btn bf-whatif-btn-secondary">' + (isFR ? 'Revenir à mon plan' : 'Back to my plan') + '</button>' +
      '<span id="bf-whatif-status" class="bf-whatif-status"></span>' +
      '</div>';

    var resultsHtml = '<div id="bf-whatif-results" class="bf-whatif-results"></div>';
    var compareHtml = '<div id="bf-whatif-compare" class="bf-whatif-compare"></div>';

    panel.innerHTML = presetsHtml + controlsHtml + buttonsHtml + resultsHtml + compareHtml;
    wrap.appendChild(panel);

    // Wire sliders → update value display
    var sliderInputs = panel.querySelectorAll('.bf-whatif-slider');
    for (var i = 0; i < sliderInputs.length; i++) {
      (function(inp) {
        var key = inp.getAttribute('data-bf-whatif-key');
        var cfg = slBase[key];
        inp.addEventListener('input', function() {
          var out = document.getElementById('bfwi-' + key + '-out');
          if (out) out.textContent = inp.value + cfg.unit;
        });
      })(sliderInputs[i]);
    }

    // Wire L1 decision cards + L2 market-shock chips. Both share the same
    // click semantics — apply preset overrides to the (visible or hidden)
    // input lattice, then auto-trigger the simulation.
    var presetBtns = panel.querySelectorAll('.bf-whatif-decision-card, .bf-whatif-shock');
    for (var p = 0; p < presetBtns.length; p++) {
      presetBtns[p].addEventListener('click', function() {
        var presetId = this.getAttribute('data-bf-preset');
        var preset = presets.filter(function(pr) { return pr.id === presetId; })[0];
        if (!preset) return;
        // Reset all inputs to baseline (visible sliders OR hidden inputs).
        Object.keys(slBase).forEach(function(k) {
          var inp = document.getElementById('bfwi-' + k);
          if (inp) {
            inp.value = slBase[k].val;
            var out = document.getElementById('bfwi-' + k + '-out');
            if (out) out.textContent = slBase[k].val + slBase[k].unit;
          }
        });
        // Apply preset overrides
        Object.keys(preset.apply).forEach(function(k) {
          var inp = document.getElementById('bfwi-' + k);
          if (!inp) return;
          var v = preset.apply[k];
          var displayV;
          if (k === 'eqRet' || k === 'inf') { v = Math.round(v * 1000) / 10; displayV = v; }
          else if (k === 'allocR') { v = Math.round(v * 100); displayV = v; }
          else if (k === 'mer') { displayV = v; }
          else { v = Math.round(v); displayV = v; }
          inp.value = v;
          var out = document.getElementById('bfwi-' + k + '-out');
          if (out) out.textContent = displayV + slBase[k].unit;
        });
        // Visual: highlight active card
        for (var z = 0; z < presetBtns.length; z++) presetBtns[z].classList.remove('active');
        this.classList.add('active');
        // Auto-trigger simulation
        _runWhatIf(baselineParams, slBase);
      });
    }

    // Simulate button — only present for non-plain readers.
    var simBtn = document.getElementById('bf-whatif-simulate');
    if (simBtn) simBtn.addEventListener('click', function() { _runWhatIf(baselineParams, slBase); });

    // Save button — captures current results into _savedScenarios (max 2)
    var saveBtn = document.getElementById('bf-whatif-save');
    saveBtn.addEventListener('click', function() {
      if (!window.__bfLastWhatIf) return;
      if (_savedScenarios.length >= 2) _savedScenarios.shift(); // FIFO drop
      _savedScenarios.push(window.__bfLastWhatIf);
      _renderCompareTable(baselineParams);
      saveBtn.textContent = (isFR ? '✓ Conservée (' + _savedScenarios.length + '/2)' : '✓ Kept (' + _savedScenarios.length + '/2)');
      setTimeout(function() {
        saveBtn.textContent = isFR ? 'Conserver cette alternative' : 'Keep this alternative';
      }, 1800);
    });

    // Reset button
    var resetBtn = document.getElementById('bf-whatif-reset');
    resetBtn.addEventListener('click', function() {
      Object.keys(slBase).forEach(function(k) {
        var inp = document.getElementById('bfwi-' + k);
        if (inp) {
          inp.value = slBase[k].val;
          var out = document.getElementById('bfwi-' + k + '-out');
          if (out) out.textContent = slBase[k].val + slBase[k].unit;
        }
      });
      document.getElementById('bf-whatif-results').innerHTML = '';
      document.getElementById('bf-whatif-compare').innerHTML = '';
      document.getElementById('bf-whatif-status').textContent = '';
      _savedScenarios = [];
      saveBtn.disabled = true;
      window.__bfLastWhatIf = null;
      for (var z = 0; z < presetBtns.length; z++) presetBtns[z].classList.remove('active');
    });
  }

  // Collect slider state, convert to engine param set, run MC, render deltas.
  function _runWhatIf(baselineParams, slBase) {
    var status = document.getElementById('bf-whatif-status');
    var results = document.getElementById('bf-whatif-results');
    var saveBtn = document.getElementById('bf-whatif-save');
    status.textContent = isFR ? 'Calcul de l\'alternative…' : 'Calculating alternative…';
    status.className = 'bf-whatif-status running';

    // Snapshot slider values
    var whatIfParams = Object.assign({}, baselineParams);
    whatIfParams.retAge = parseInt(document.getElementById('bfwi-retAge').value, 10);
    whatIfParams.deathAge = parseInt(document.getElementById('bfwi-deathAge').value, 10);
    whatIfParams.qppAge = parseInt(document.getElementById('bfwi-qppAge').value, 10);
    whatIfParams.oasAge = parseInt(document.getElementById('bfwi-oasAge').value, 10);
    whatIfParams.retSpM = parseInt(document.getElementById('bfwi-retSpM').value, 10);
    var rawEqRet = parseFloat(document.getElementById('bfwi-eqRet').value) / 100;
    var merVal = parseFloat(document.getElementById('bfwi-mer').value) / 100;
    // Apply MER as a drag on equity return (engine doesn't have MER as a direct
    // input; this is the same approximation the planner uses for fee modeling).
    whatIfParams.eqRet = Math.max(0.005, rawEqRet - merVal);
    whatIfParams.inf = parseFloat(document.getElementById('bfwi-inf').value) / 100;
    whatIfParams.rrspC = parseInt(document.getElementById('bfwi-rrspC').value, 10);
    whatIfParams.tfsaC = parseInt(document.getElementById('bfwi-tfsaC').value, 10);
    whatIfParams.meltTgt = parseInt(document.getElementById('bfwi-meltTgt').value, 10);
    whatIfParams.allocR = parseInt(document.getElementById('bfwi-allocR').value, 10) / 100;
    whatIfParams.melt = whatIfParams.meltTgt > 0;
    var nSim = 500;

    setTimeout(function() {
      var t0 = Date.now();
      var mc;
      try {
        mc = window.BEngine.runMC(whatIfParams, nSim);
      } catch (e) {
        status.textContent = (isFR ? 'Calcul interrompu : ' : 'Calculation interrupted: ') + e.message;
        status.className = 'bf-whatif-status error';
        return;
      }
      var dt = Date.now() - t0;

      // ─── Compute KPIs (12 total) ─────────────────────────────────
      // The entire KPI block is wrapped in try/catch below — quick-
      // scenario engine paths sometimes return a stripped-down result
      // (no _sweeps, no _stress, partial pD, etc.) and any single
      // missing field would otherwise throw "Cannot read properties of
      // undefined (reading 'map')" and demo-kill the simulator. Per-
      // field guards proved insufficient (the error reappeared on
      // 2008 Recession). The wrapper catches anything and renders a
      // user-visible warning instead of a red error stripe.
      mc = mc || {};
      var baselineMedRev = (P && Array.isArray(P.medRevData)) ? P.medRevData : [];
      var whatIfMedRev = Array.isArray(mc.medRevData) ? mc.medRevData : [];
      try {
      var baselineTotalTax = baselineMedRev.reduce(function(s, r) { return s + (r.tax || 0); }, 0);
      var whatIfTotalTax = whatIfMedRev.reduce(function(s, r) { return s + (r.tax || 0); }, 0);

      var dSucc = (mc.succ - (B.succ || 0)) * 100;
      var dMedF = (mc.rMedF || mc.medF) - (B.rMedF || B.medF || 0);
      var dEstate = (mc.medEstateNet || 0) - (B.medEstateNet || 0);
      var dTax = whatIfTotalTax - baselineTotalTax;

      var wiRuin = mc.p5Ruin;
      var baseRuin = B.p5Ruin;
      var ruinDisplay = (wiRuin == null || wiRuin >= 200)
        ? (isFR ? 'Aucun' : 'Never')
        : (isFR ? '\u00c0 ' : 'At age ') + wiRuin + (isFR ? ' ans' : '');
      var dRuin = (wiRuin != null && baseRuin != null && wiRuin < 200 && baseRuin < 200)
        ? wiRuin - baseRuin
        : 0;

      var OAS_THR = 95323;
      var wiOasYrs = whatIfMedRev.filter(function(r) { return (r.taxInc || 0) > OAS_THR * Math.pow(1 + whatIfParams.inf, (r.age || 0) - whatIfParams.age); }).length;
      var baseOasYrs = baselineMedRev.filter(function(r) { return (r.taxInc || 0) > OAS_THR * Math.pow(1 + baselineParams.inf, (r.age || 0) - baselineParams.age); }).length;
      var dOasYrs = wiOasYrs - baseOasYrs;

      var wiRetRow = whatIfMedRev.find(function(r) { return r.age === whatIfParams.retAge; });
      var wiRetBal = wiRetRow ? ((wiRetRow.aRR || 0) + (wiRetRow.aTF || 0) + (wiRetRow.aNR || 0)) : 0;
      var wiWR = wiRetRow && wiRetBal > 1000 ? ((wiRetRow.ret || 0) / wiRetBal * 100) : 0;
      var baseRetRow = baselineMedRev.find(function(r) { return r.age === baselineParams.retAge; });
      var baseRetBal = baseRetRow ? ((baseRetRow.aRR || 0) + (baseRetRow.aTF || 0) + (baseRetRow.aNR || 0)) : 0;
      var baseWR = baseRetRow && baseRetBal > 1000 ? ((baseRetRow.ret || 0) / baseRetBal * 100) : 0;
      var dWR = wiWR - baseWR;

      var wiRetYrs = whatIfMedRev.filter(function(r) { return r.age >= whatIfParams.retAge; });
      var wiAvgGov = wiRetYrs.length ? wiRetYrs.reduce(function(s, r) { return s + (r.rrq || 0) + (r.psv || 0) + (r.pen || 0); }, 0) / wiRetYrs.length : 0;
      var wiAvgSpend = wiRetYrs.length ? wiRetYrs.reduce(function(s, r) { return s + (r.spend || 0); }, 0) / wiRetYrs.length : 1;
      var wiCov = wiAvgSpend > 0 ? wiAvgGov / wiAvgSpend * 100 : 0;
      var baseRetYrs = baselineMedRev.filter(function(r) { return r.age >= baselineParams.retAge; });
      var baseAvgGov = baseRetYrs.length ? baseRetYrs.reduce(function(s, r) { return s + (r.rrq || 0) + (r.psv || 0) + (r.pen || 0); }, 0) / baseRetYrs.length : 0;
      var baseAvgSpend = baseRetYrs.length ? baseRetYrs.reduce(function(s, r) { return s + (r.spend || 0); }, 0) / baseRetYrs.length : 1;
      var baseCov = baseAvgSpend > 0 ? baseAvgGov / baseAvgSpend * 100 : 0;
      var dCov = wiCov - baseCov;

      // NEW KPIs
      // P25 cautious wealth
      var wiP25 = mc.rP25F || mc.p25F || 0;
      var baseP25 = B.rP25F || B.p25F || 0;
      var dP25 = wiP25 - baseP25;

      // Real income at age 75 (mid-retirement check)
      var wiAt75 = whatIfMedRev.find(function(r) { return r.age === 75; });
      var wiInc75 = wiAt75 ? ((wiAt75.rrq || 0) + (wiAt75.psv || 0) + (wiAt75.pen || 0) + (wiAt75.ret || 0) - (wiAt75.tax || 0)) : 0;
      var baseAt75 = baselineMedRev.find(function(r) { return r.age === 75; });
      var baseInc75 = baseAt75 ? ((baseAt75.rrq || 0) + (baseAt75.psv || 0) + (baseAt75.pen || 0) + (baseAt75.ret || 0) - (baseAt75.tax || 0)) : 0;
      var dInc75 = wiInc75 - baseInc75;

      // Tax efficiency: % of gross retirement income kept after tax
      var wiGrossRet = wiRetYrs.reduce(function(s, r) { return s + (r.rrq || 0) + (r.psv || 0) + (r.pen || 0) + (r.ret || 0) + (r.srg || 0); }, 0);
      var wiNetRet = wiGrossRet - wiRetYrs.reduce(function(s, r) { return s + (r.tax || 0); }, 0);
      var wiTaxEff = wiGrossRet > 0 ? (wiNetRet / wiGrossRet) * 100 : 0;
      var baseGrossRet = baseRetYrs.reduce(function(s, r) { return s + (r.rrq || 0) + (r.psv || 0) + (r.pen || 0) + (r.ret || 0) + (r.srg || 0); }, 0);
      var baseNetRet = baseGrossRet - baseRetYrs.reduce(function(s, r) { return s + (r.tax || 0); }, 0);
      var baseTaxEff = baseGrossRet > 0 ? (baseNetRet / baseGrossRet) * 100 : 0;
      var dTaxEff = wiTaxEff - baseTaxEff;

      // Probability of ruin before age 90 (proxy from p5Ruin distribution)
      var wiRuinBefore90 = (wiRuin != null && wiRuin < 90 && wiRuin < 200) ? 'Oui' : 'Non';
      var wiRuinBefore90Lbl = isFR ? wiRuinBefore90 : (wiRuinBefore90 === 'Oui' ? 'Yes' : 'No');
      var baseRuinBefore90 = (baseRuin != null && baseRuin < 90 && baseRuin < 200) ? 'Oui' : 'Non';
      var ruinChanged = wiRuinBefore90 !== baseRuinBefore90;

      } catch (kpiErr) {
        // Quick-scenario engine path returned a partial result. Soft-fail
        // with a user-visible warning instead of the demo-killer red
        // error. Save / Reset stay enabled so the user can retry or
        // tweak parameters. Console captures the actual error for
        // future repro work.
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[whatif] KPI block soft-failed:', kpiErr && kpiErr.message);
        }
        status.textContent = (isFR
          ? 'Alternative partielle — certains résultats ne sont pas disponibles. Essayez une autre alternative ou revenez à votre plan.'
          : 'Partial alternative — some results are unavailable. Try another alternative or return to your plan.');
        status.className = 'bf-whatif-status warn';
        saveBtn.disabled = true;
        return;
      }

      status.textContent = (isFR ? 'Alternative calculée (' + dt + ' ms)' : 'Alternative ready (' + dt + ' ms)');
      status.className = 'bf-whatif-status done';
      saveBtn.disabled = false;

      // Deterministic summary phrase
      var changes = [];
      if (whatIfParams.retAge !== baselineParams.retAge) changes.push((isFR ? 'retraite ' : 'retire ') + whatIfParams.retAge + (isFR ? ' ans' : ' yrs'));
      if (whatIfParams.retSpM !== baselineParams.retSpM) changes.push((isFR ? 'dépenses ' : 'spend ') + whatIfParams.retSpM + '$/mois');
      if (Math.abs(rawEqRet - baselineParams.eqRet) > 0.001) changes.push((isFR ? 'rendement ' : 'return ') + (rawEqRet * 100).toFixed(1) + '%');
      if (Math.abs(whatIfParams.inf - baselineParams.inf) > 0.001) changes.push((isFR ? 'inflation ' : 'inflation ') + (whatIfParams.inf * 100).toFixed(1) + '%');
      if (merVal > 0) changes.push((isFR ? 'MER ' : 'MER ') + (merVal * 100).toFixed(1) + '%');
      if (whatIfParams.qppAge !== (baselineParams.qppAge || 65)) changes.push((isFR ? 'RRQ@' : 'CPP@') + whatIfParams.qppAge);
      if (whatIfParams.oasAge !== (baselineParams.oasAge || 65)) changes.push((isFR ? 'PSV@' : 'OAS@') + whatIfParams.oasAge);

      var summary = isFR
        ? 'Alternative explorée : <strong>' + (changes.join(', ') || 'aucun changement') + '</strong>. Les écarts ci-dessous se lisent par rapport à votre plan de référence.'
        : 'Alternative explored: <strong>' + (changes.join(', ') || 'no change') + '</strong>. The deltas below read against your baseline plan.';

      // KPI tile count adjusts to the reader's literacy. A beginner reader
      // (jargonMode='plain' on body data attribute) sees only the 4
      // headline KPIs — overload was the original concern. Intermediate
      // and advanced see the full 12-tile grid.
      var bodyJargon = '';
      try { bodyJargon = (document.body.getAttribute('data-bf-jargon-mode') || ''); } catch (e) {}
      var isBeginnerReader = bodyJargon === 'plain';

      // 4 essentials (always shown). These four answer "is the plan working?"
      // in the simplest possible terms.
      var headline =
        _kpiCard(isFR ? 'Taux de succès' : 'Success rate', Math.round(mc.succ * 100) + '%', fmtDelta(dSucc, 'pts'), dSucc, true) +
        _kpiCard(isFR ? 'Patrimoine médian (réel)' : 'Median wealth (real)', fmtCompact(mc.rMedF || mc.medF), fmtDelta(dMedF, '$'), dMedF, true) +
        _kpiCard(isFR ? 'Épuisement épargne' : 'Savings depletion', ruinDisplay, dRuin ? fmtDelta(dRuin, 'yrs') : '—', dRuin, true) +
        _kpiCard(isFR ? 'Couverture gouv.' : 'Gov. coverage', Math.round(wiCov) + '%', fmtDelta(dCov, 'pts'), dCov, true);

      // 8 secondary KPIs (intermediate + advanced). Adds dispersion, estate,
      // tax detail, withdrawal rate, income at 75. These are useful for
      // mixed/technical readers but overwhelming for beginners.
      var secondary = isBeginnerReader ? '' : (
        _kpiCard(isFR ? 'Patrimoine prudent P25' : 'Cautious wealth P25', fmtCompact(wiP25), fmtDelta(dP25, '$'), dP25, true) +
        _kpiCard(isFR ? 'Ruine avant 90 ans' : 'Ruin before age 90', wiRuinBefore90Lbl, ruinChanged ? (isFR ? 'changé' : 'changed') : '—', ruinChanged ? (wiRuinBefore90 === 'Non' ? 1 : -1) : 0, true) +
        _kpiCard(isFR ? 'Héritage médian' : 'Median estate', fmtCompact(mc.medEstateNet || 0), fmtDelta(dEstate, '$'), dEstate, true) +
        _kpiCard(isFR ? 'Impôt viager total' : 'Total lifetime tax', fmtCompact(whatIfTotalTax), fmtDelta(dTax, '$'), dTax, false) +
        _kpiCard(isFR ? 'Efficacité fiscale' : 'Tax efficiency', wiTaxEff.toFixed(1) + '%', fmtDelta(dTaxEff, 'pts'), dTaxEff, true) +
        _kpiCard(isFR ? 'Récup. PSV (ans)' : 'OAS clawback (yrs)', wiOasYrs + (isFR ? ' ans' : ' yrs'), fmtDelta(dOasYrs, 'yrs'), dOasYrs, false) +
        _kpiCard(isFR ? 'Retrait initial' : 'Initial withdrawal rate', wiWR.toFixed(1).replace('.', isFR ? ',' : '.') + '%', fmtDelta(dWR, 'pts'), dWR, false) +
        _kpiCard(isFR ? 'Revenu net @75 ans' : 'Net income @ age 75', fmtCompact(wiInc75), fmtDelta(dInc75, '$'), dInc75, true)
      );
      var gridClass = isBeginnerReader ? 'bf-whatif-kpis-4' : 'bf-whatif-kpis-12';
      // Phase 2 split-pane compare strip: codex 2026-04-27 spec — keep
      // the baseline visually anchored on the left, the explored value on
      // the right, with the delta in the middle. Three metrics: success
      // rate, median wealth, depletion. Supports the "your plan stays
      // intact" promise visually, not just textually.
      var baseSucc = Math.round((B.succ || 0) * 100);
      var newSucc = Math.round(mc.succ * 100);
      var baseMedF = B.rMedF || B.medF || 0;
      var newMedF = mc.rMedF || mc.medF || 0;
      var baseRuinDisp = (B.p5Ruin == null || B.p5Ruin >= 200)
        ? (isFR ? 'Aucun' : 'Never')
        : (isFR ? 'À ' : 'At ') + B.p5Ruin + (isFR ? ' ans' : '');
      function _stripRow(label, baseStr, exploredStr, deltaStr, deltaColor) {
        return '<div class="bf-whatif-compare-row">' +
          '<div class="bf-whatif-compare-rowlabel">' + label + '</div>' +
          '<div class="bf-whatif-compare-base"><span class="bf-whatif-compare-tag">' +
            (isFR ? 'Votre plan' : 'Your plan') + '</span><span class="bf-whatif-compare-val">' + baseStr + '</span></div>' +
          '<div class="bf-whatif-compare-arrow">→</div>' +
          '<div class="bf-whatif-compare-explored"><span class="bf-whatif-compare-tag">' +
            (isFR ? 'Exploré' : 'Explored') + '</span><span class="bf-whatif-compare-val">' + exploredStr + '</span></div>' +
          '<div class="bf-whatif-compare-delta" style="color:' + deltaColor + '">' + deltaStr + '</div>' +
        '</div>';
      }
      var dSuccColor = colorDelta(dSucc, true);
      var dMedFColor = colorDelta(dMedF, true);
      var dRuinColor = colorDelta(dRuin || 0, true);
      var compareStripHtml = '<div class="bf-whatif-compare-strip">' +
        _stripRow(isFR ? 'Taux de succès' : 'Success rate',
          baseSucc + '%', newSucc + '%', fmtDelta(dSucc, 'pts'), dSuccColor) +
        _stripRow(isFR ? 'Patrimoine médian (réel)' : 'Median wealth (real)',
          fmtCompact(baseMedF), fmtCompact(newMedF), fmtDelta(dMedF, '$'), dMedFColor) +
        _stripRow(isFR ? 'Épuisement épargne' : 'Savings depletion',
          baseRuinDisp, ruinDisplay, dRuin ? fmtDelta(dRuin, 'yrs') : '—', dRuinColor) +
        '</div>';
      var kpisHtml = '<div class="bf-whatif-summary">' + summary + '</div>' +
        compareStripHtml +
        '<div class="bf-whatif-kpis ' + gridClass + '">' + headline + secondary + '</div>';

      results.innerHTML = kpisHtml;

      // Capture for save-and-compare
      window.__bfLastWhatIf = {
        label: changes.join(', ') || (isFR ? 'Alternative' : 'Alternative'),
        succ: Math.round(mc.succ * 100),
        medF: mc.rMedF || mc.medF,
        p25F: wiP25,
        ruin: ruinDisplay,
        estate: mc.medEstateNet || 0,
        tax: whatIfTotalTax,
        taxEff: wiTaxEff,
        oasYrs: wiOasYrs,
        wr: wiWR,
        cov: wiCov,
        inc75: wiInc75,
        ruinB90: wiRuinBefore90Lbl
      };
    }, 50);
  }

  // ─── Save & compare table ───────────────────────────────────────────
  function _renderCompareTable(baselineParams) {
    var box = document.getElementById('bf-whatif-compare');
    if (!box) return;
    if (_savedScenarios.length === 0) { box.innerHTML = ''; return; }
    var totalBaseTax = (P.medRevData || []).reduce(function(s, r) { return s + (r.tax || 0); }, 0);
    var baseRow = {
      label: isFR ? 'Votre plan' : 'Your plan',
      succ: Math.round((B.succ || 0) * 100),
      medF: B.rMedF || B.medF || 0,
      p25F: B.rP25F || B.p25F || 0,
      ruin: (B.p5Ruin == null || B.p5Ruin >= 200) ? (isFR ? 'Aucun' : 'Never') : (isFR ? '\u00c0 ' : 'At age ') + B.p5Ruin + (isFR ? ' ans' : ''),
      estate: B.medEstateNet || 0,
      tax: totalBaseTax
    };
    var rows = [baseRow].concat(_savedScenarios);
    var html = '<div class="bf-whatif-compare-title">' + (isFR ? 'Alternatives conservées' : 'Kept alternatives') + '</div>';
    html += '<table class="bf-whatif-compare-table"><thead><tr>';
    html += '<th>' + (isFR ? 'Métrique' : 'Metric') + '</th>';
    rows.forEach(function(r, i) {
      html += '<th' + (i === 0 ? ' class="bf-whatif-compare-base"' : '') + '>' + (i === 0 ? r.label : '#' + i + ': ' + r.label) + '</th>';
    });
    html += '</tr></thead><tbody>';
    var metrics = [
      { key: 'succ', label: isFR ? 'Taux de succès' : 'Success rate', fmt: function(v) { return v + '%'; } },
      { key: 'medF', label: isFR ? 'Patrimoine médian (réel)' : 'Median wealth (real)', fmt: fmtCompact },
      { key: 'p25F', label: isFR ? 'Patrimoine prudent P25' : 'Cautious wealth P25', fmt: fmtCompact },
      { key: 'ruin', label: isFR ? 'Épuisement épargne' : 'Savings depletion', fmt: function(v) { return v; } },
      { key: 'estate', label: isFR ? 'Héritage médian' : 'Median estate', fmt: fmtCompact },
      { key: 'tax', label: isFR ? 'Impôt viager total' : 'Total lifetime tax', fmt: fmtCompact }
    ];
    metrics.forEach(function(m) {
      html += '<tr><td class="bf-whatif-compare-metric">' + m.label + '</td>';
      rows.forEach(function(r) {
        html += '<td class="bf-whatif-compare-val">' + m.fmt(r[m.key] != null ? r[m.key] : '—') + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    html += '<div class="bf-whatif-compare-hint">' + (isFR ? 'Vous pouvez conserver jusqu\'à 2 alternatives pour les comparer côte à côte avec votre plan.' : 'You can keep up to 2 alternatives to compare side-by-side with your plan.') + '</div>';
    box.innerHTML = html;
  }

  function _kpiCard(label, value, delta, deltaRaw, goodIfPositive) {
    var c = colorDelta(deltaRaw, goodIfPositive);
    return '<div class="bf-whatif-kpi">' +
      '<div class="bf-whatif-kpi-label">' + label + '</div>' +
      '<div class="bf-whatif-kpi-value">' + value + '</div>' +
      '<div class="bf-whatif-kpi-delta" style="color:' + c + '">' + delta + '</div>' +
      '</div>';
  }

  function boot() {
    var baseline = _readBaseline();
    if (!baseline) return;
    _buildUI(baseline);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
