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
  // PRESETS — one-click scenario applicators. Each returns a partial
  // params object that overrides the baseline. Naming kept evocative.
  // ──────────────────────────────────────────────────────────────────────
  function _presets(baseline) {
    return [
      {
        id: 'recession',
        label: isFR ? 'Récession 2008' : '2008 Recession',
        icon: '↘',
        desc: isFR ? 'Rendement −2 pts, inflation +1 pt' : 'Return −2 pts, inflation +1 pt',
        apply: { eqRet: Math.max(0.02, (baseline.eqRet || 0.06) - 0.02), inf: (baseline.inf || 0.021) + 0.01 }
      },
      {
        id: 'stagflation',
        label: isFR ? 'Stagflation' : 'Stagflation',
        icon: '⚠',
        desc: isFR ? 'Rendement −1 pt, inflation +2 pts' : 'Return −1 pt, inflation +2 pts',
        apply: { eqRet: Math.max(0.02, (baseline.eqRet || 0.06) - 0.01), inf: (baseline.inf || 0.021) + 0.02 }
      },
      {
        id: 'optimistic',
        label: isFR ? 'Marchés porteurs' : 'Bull markets',
        icon: '↗',
        desc: isFR ? 'Rendement +1,5 pt, inflation stable' : 'Return +1.5 pts, inflation stable',
        apply: { eqRet: (baseline.eqRet || 0.06) + 0.015 }
      },
      {
        id: 'fire',
        label: isFR ? 'FIRE (retraite hâtive)' : 'FIRE (early retirement)',
        icon: '◐',
        desc: isFR ? 'Retraite −5 ans, dépenses −15%' : 'Retire 5 yrs earlier, spend 15% less',
        apply: { retAge: Math.max(50, (baseline.retAge || 65) - 5), retSpM: Math.round((baseline.retSpM || 5000) * 0.85) }
      },
      {
        id: 'late_ret',
        label: isFR ? 'Retraite tardive' : 'Late retirement',
        icon: '⏳',
        desc: isFR ? 'Retraite +3 ans, cotisation +5K$' : 'Retire 3 yrs later, +5K contrib',
        apply: { retAge: Math.min(75, (baseline.retAge || 65) + 3), rrspC: (baseline.rrspC || 0) + 5000 }
      },
      {
        id: 'long_life',
        label: isFR ? 'Longévité élevée' : 'High longevity',
        icon: '∞',
        desc: isFR ? 'Décès projeté +7 ans' : 'Projected death age +7 yrs',
        apply: { deathAge: Math.min(105, (baseline.deathAge || 90) + 7) }
      },
      {
        id: 'high_mer',
        label: isFR ? 'Frais bancaires (MER 2%)' : 'Bank fund fees (MER 2%)',
        icon: '%',
        desc: isFR ? 'MER fixé à 2%, rendement net réduit' : 'MER set to 2%, net return reduced',
        // Approximation: subtract the extra MER drag from eqRet (engine doesn't have direct MER)
        apply: { eqRet: Math.max(0.02, (baseline.eqRet || 0.06) - 0.013) }
      },
      {
        id: 'aggressive_save',
        label: isFR ? 'Épargne agressive' : 'Aggressive saving',
        icon: '↑',
        desc: isFR ? 'Cotisations REER +50%' : 'RRSP contributions +50%',
        apply: { rrspC: Math.round((baseline.rrspC || 5000) * 1.5) }
      }
    ];
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

    // ─── Presets bar ──────────────────────────────────────────────────
    var presets = _presets(baselineParams);
    var presetsHtml = '<div class="bf-whatif-presets">' +
      '<div class="bf-whatif-presets-label">' + (isFR ? 'Scénarios rapides :' : 'Quick scenarios:') + '</div>' +
      '<div class="bf-whatif-presets-buttons">';
    presets.forEach(function(pr) {
      presetsHtml += '<button type="button" class="bf-whatif-preset" data-bf-preset="' + pr.id + '" title="' + pr.desc + '">' +
        '<span class="bf-whatif-preset-icon">' + pr.icon + '</span>' +
        '<span class="bf-whatif-preset-label">' + pr.label + '</span>' +
      '</button>';
    });
    presetsHtml += '</div></div>';

    // ─── Grouped sliders ──────────────────────────────────────────────
    var groups = {
      timing:   { label: isFR ? 'Échéances' : 'Timing',     icon: '⏱' },
      spending: { label: isFR ? 'Dépenses' : 'Spending',     icon: '$' },
      markets:  { label: isFR ? 'Marchés' : 'Markets',       icon: '∿' },
      strategy: { label: isFR ? 'Stratégie' : 'Strategy',    icon: '◇' }
    };
    var controlsHtml = '<div class="bf-whatif-controls">';
    Object.keys(groups).forEach(function(gKey) {
      var g = groups[gKey];
      controlsHtml += '<div class="bf-whatif-group">' +
        '<div class="bf-whatif-group-header">' +
          '<span class="bf-whatif-group-icon">' + g.icon + '</span>' +
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

    var buttonsHtml = '<div class="bf-whatif-actions">' +
      '<button type="button" id="bf-whatif-simulate" class="bf-whatif-btn">' + (isFR ? 'Simuler ce scénario' : 'Simulate this scenario') + '</button>' +
      '<button type="button" id="bf-whatif-save" class="bf-whatif-btn bf-whatif-btn-secondary" disabled>' + (isFR ? 'Enregistrer le scénario' : 'Save scenario') + '</button>' +
      '<button type="button" id="bf-whatif-reset" class="bf-whatif-btn bf-whatif-btn-secondary">' + (isFR ? 'Remettre au plan d\'origine' : 'Reset to baseline') + '</button>' +
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

    // Wire preset buttons
    var presetBtns = panel.querySelectorAll('.bf-whatif-preset');
    for (var p = 0; p < presetBtns.length; p++) {
      presetBtns[p].addEventListener('click', function() {
        var presetId = this.getAttribute('data-bf-preset');
        var preset = presets.filter(function(pr) { return pr.id === presetId; })[0];
        if (!preset) return;
        // First reset all sliders to baseline
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
        // Visual: highlight active preset
        for (var z = 0; z < presetBtns.length; z++) presetBtns[z].classList.remove('active');
        this.classList.add('active');
        // Auto-trigger simulation
        _runWhatIf(baselineParams, slBase);
      });
    }

    // Simulate button
    var simBtn = document.getElementById('bf-whatif-simulate');
    simBtn.addEventListener('click', function() { _runWhatIf(baselineParams, slBase); });

    // Save button — captures current results into _savedScenarios (max 2)
    var saveBtn = document.getElementById('bf-whatif-save');
    saveBtn.addEventListener('click', function() {
      if (!window.__bfLastWhatIf) return;
      if (_savedScenarios.length >= 2) _savedScenarios.shift(); // FIFO drop
      _savedScenarios.push(window.__bfLastWhatIf);
      _renderCompareTable(baselineParams);
      saveBtn.textContent = (isFR ? '✓ Enregistré (' + _savedScenarios.length + '/2)' : '✓ Saved (' + _savedScenarios.length + '/2)');
      setTimeout(function() {
        saveBtn.textContent = isFR ? 'Enregistrer le scénario' : 'Save scenario';
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
    status.textContent = isFR ? 'Simulation en cours…' : 'Simulating…';
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
        status.textContent = (isFR ? 'Erreur de simulation: ' : 'Simulation error: ') + e.message;
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
          ? 'Scénario partiel — certains KPIs ne sont pas disponibles pour ce scénario. Essayez un autre scénario rapide ou revenez à la base.'
          : 'Partial scenario — some KPIs are unavailable for this scenario. Try another quick scenario or reset to baseline.');
        status.className = 'bf-whatif-status warn';
        saveBtn.disabled = true;
        return;
      }

      status.textContent = (isFR ? 'Simulation terminée (' + nSim + ' scénarios, ' : 'Simulation complete (' + nSim + ' scenarios, ') + dt + ' ms)';
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
        ? 'Scénario testé : <strong>' + (changes.join(', ') || 'plan d\'origine') + '</strong>. Les chiffres ci-dessous montrent le delta par rapport au plan de base.'
        : 'Scenario tested: <strong>' + (changes.join(', ') || 'baseline plan') + '</strong>. Figures below show the delta vs. baseline plan.';

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
      var kpisHtml = '<div class="bf-whatif-summary">' + summary + '</div>' +
        '<div class="bf-whatif-kpis ' + gridClass + '">' + headline + secondary + '</div>';

      results.innerHTML = kpisHtml;

      // Capture for save-and-compare
      window.__bfLastWhatIf = {
        label: changes.join(', ') || (isFR ? 'Scénario' : 'Scenario'),
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
      label: isFR ? 'Plan de base' : 'Baseline plan',
      succ: Math.round((B.succ || 0) * 100),
      medF: B.rMedF || B.medF || 0,
      p25F: B.rP25F || B.p25F || 0,
      ruin: (B.p5Ruin == null || B.p5Ruin >= 200) ? (isFR ? 'Aucun' : 'Never') : (isFR ? '\u00c0 ' : 'At age ') + B.p5Ruin + (isFR ? ' ans' : ''),
      estate: B.medEstateNet || 0,
      tax: totalBaseTax
    };
    var rows = [baseRow].concat(_savedScenarios);
    var html = '<div class="bf-whatif-compare-title">' + (isFR ? 'Comparaison de scénarios enregistrés' : 'Saved scenarios comparison') + '</div>';
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
    html += '<div class="bf-whatif-compare-hint">' + (isFR ? 'Vous pouvez enregistrer jusqu\'à 2 scénarios pour les comparer côte à côte avec le plan de base.' : 'You can save up to 2 scenarios to compare side-by-side with the baseline plan.') + '</div>';
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
