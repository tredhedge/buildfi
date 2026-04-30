// report-whatif.js — split-tool edition (codex 2026-04-27).
//
// The "Explore alternatives" section exposes TWO distinct tools as tabs,
// mirroring the planner's tab-6 (Stress tests) and tab-25 (What-If):
//
//   1. Stress tests — pick a historical/synthetic shock with its real
//      return matrix (Crash 2008, Dotcom 2000, Inflation 70s, Stagflation,
//      COVID, Rate Hike, Prolonged Recession, Longevity +5). Choose an
//      age the shock starts at. Engine re-runs the matrix at that age.
//      A 2008-style crash CANNOT be faked with a permanent equity-return
//      reduction — the timing of the drawdown vs sequence of returns is
//      what makes it a stress test. So this tab is matrix-driven.
//
//   2. What-If — adjust permanent assumptions via a slider lattice
//      (retirement age, monthly spending, RRSP/TFSA contrib, allocation,
//      CPP/OAS start age, equity return, inflation, MER, meltdown). Plus
//      curated one-click "decision" cards for common levers. These are
//      assumptions about your plan, not events; sliders represent them
//      faithfully.
//
// Narration AI is NOT regenerated — both tools are deterministic
// exploration; the main report's narration stays calibrated on the
// baseline simulation.

(function() {
  "use strict";
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!window.BEngine || typeof window.BEngine.runMC !== 'function') return;
  if (!window.__BUILDFI__ || !window.__BUILDFI__.meta) return;

  var P = window.__BUILDFI__;
  var M = P.meta || {};
  var B = P.baseline || {};
  var isFR = !!M.fr;

  // STR comes from the inlined report-engine.js — same matrix the planner
  // uses (planner_v3.html line 5548 onward).
  var STR = (typeof window !== 'undefined' && window.STR) ? window.STR : null;

  // Saved scenarios store (up to 2) — shared across both tools so users
  // can compare a stress run against a what-if run side-by-side.
  var _savedScenarios = [];

  // ── Formatting helpers ────────────────────────────────────────────────
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
  function fmtPct(v, decimals) {
    if (v == null || !isFinite(v)) return '—';
    var d = decimals == null ? 1 : decimals;
    var s = (v * 100).toFixed(d);
    return (v >= 0 ? '+' : '') + s.replace('.', isFR ? ',' : '.') + '%';
  }
  function colorDelta(v, goodIfPositive) {
    if (!v || !isFinite(v)) return '#706558';
    var good = goodIfPositive !== false;
    return v > 0 ? (good ? '#2a8c46' : '#cc4444') : v < 0 ? (good ? '#cc4444' : '#2a8c46') : '#706558';
  }

  function _readBaseline() {
    var wrap = document.getElementById('bf-whatif');
    if (!wrap) return null;
    var raw = wrap.getAttribute('data-bf-whatif-params');
    if (!raw) return null;
    try { return JSON.parse(raw.replace(/&quot;/g, '"')); } catch (e) { return null; }
  }
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

  // ──────────────────────────────────────────────────────────────────────
  // STRESS-TEST CATALOG — pulls from window.STR (inlined report-engine).
  // Each entry exposes id, label (lang-aware), description, and a return-
  // matrix preview the user can scan before running. Order mirrors the
  // planner's tab-6 dropdown.
  // ──────────────────────────────────────────────────────────────────────
  var STRESS_IDS = ['crash08', 'dotcom', 'inflation70', 'stagflation', 'covid', 'ratehike', 'prolonged', 'longevity'];

  function _stressScenarios() {
    if (!STR) return [];
    return STRESS_IDS.map(function(id) {
      var s = STR[id];
      if (!s) return null;
      return {
        id: id,
        label: isFR ? s.n : (s.ne || s.n),
        desc: isFR ? s.d : (s.de || s.d),
        eq: s.eq || [],
        bd: s.bd || [],
        inf: s.inf || [],
        extra: s.extra || null
      };
    }).filter(Boolean);
  }

  // Render the tiny return-matrix preview shown on each scenario card.
  // Three rows (Equities / Bonds / Inflation) × N years. Compact: each
  // value is 1 cell, color-coded green/red. Width = duration + label col.
  function _renderMatrixPreview(sc) {
    if (sc.extra && sc.extra.deathAge) {
      return '<div class="bf-stress-matrix-extra">' +
        (isFR ? 'Horizon prolongé +' : 'Horizon extended +') + sc.extra.deathAge +
        (isFR ? ' ans (pas de choc de marché)' : ' yrs (no market shock)') +
        '</div>';
    }
    if (!sc.eq.length) return '';
    var dur = sc.eq.length;
    function row(label, arr, isInf) {
      var cells = arr.map(function(v) {
        var col;
        if (isInf) col = v > 0.05 ? '#cc4444' : v > 0.03 ? '#c4944a' : '#706558';
        else col = v < -0.05 ? '#cc4444' : v < 0 ? '#c4944a' : v > 0.05 ? '#2a8c46' : '#706558';
        var pct = (v * 100).toFixed(0);
        var sign = v > 0 && !isInf ? '+' : '';
        return '<span class="bf-stress-cell" style="color:' + col + '">' + sign + pct + '%</span>';
      }).join('');
      return '<div class="bf-stress-row"><span class="bf-stress-rowlabel">' + label + '</span>' + cells + '</div>';
    }
    var html = '<div class="bf-stress-matrix">' +
      '<div class="bf-stress-matrix-header">' +
        (isFR ? 'Trajectoire sur ' : 'Path over ') + dur + (isFR ? ' ans' : ' yrs') +
      '</div>' +
      row(isFR ? 'Actions' : 'Equities', sc.eq, false) +
      row(isFR ? 'Oblig.' : 'Bonds', sc.bd, false) +
      row('Infl.', sc.inf, true) +
      '</div>';
    return html;
  }

  // ──────────────────────────────────────────────────────────────────────
  // WHAT-IF DECISIONS — curated permanent-assumption nudges. Stripped of
  // the old "market shock" chips (those are now in the Stress tab where
  // they belong, with real return matrices).
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
        apply: { mer: 0.5 }
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

  // ──────────────────────────────────────────────────────────────────────
  // SHARED RESULTS RENDERING — used by both Stress and What-If tabs.
  // ──────────────────────────────────────────────────────────────────────
  function _kpiCard(label, value, delta, deltaRaw, goodIfPositive) {
    var c = colorDelta(deltaRaw, goodIfPositive);
    return '<div class="bf-whatif-kpi">' +
      '<div class="bf-whatif-kpi-label">' + label + '</div>' +
      '<div class="bf-whatif-kpi-value">' + value + '</div>' +
      '<div class="bf-whatif-kpi-delta" style="color:' + c + '">' + delta + '</div>' +
      '</div>';
  }
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
  function _renderResults(targetEl, summaryHtml, mc, label) {
    mc = mc || {};
    var baselineMedRev = (P && Array.isArray(P.medRevData)) ? P.medRevData : [];
    var whatIfMedRev = Array.isArray(mc.medRevData) ? mc.medRevData : [];

    var dSucc = (mc.succ - (B.succ || 0)) * 100;
    var dMedF = (mc.rMedF || mc.medF) - (B.rMedF || B.medF || 0);
    var dEstate = (mc.medEstateNet || 0) - (B.medEstateNet || 0);

    var wiRuin = mc.p5Ruin;
    var baseRuin = B.p5Ruin;
    var ruinDisplay = (wiRuin == null || wiRuin >= 200)
      ? (isFR ? 'Aucun' : 'Never')
      : (isFR ? 'À ' : 'At age ') + wiRuin + (isFR ? ' ans' : '');
    var dRuin = (wiRuin != null && baseRuin != null && wiRuin < 200 && baseRuin < 200)
      ? wiRuin - baseRuin : 0;

    var wiP25 = mc.rP25F || mc.p25F || 0;
    var baseP25 = B.rP25F || B.p25F || 0;
    var dP25 = wiP25 - baseP25;

    var baselineTotalTax = baselineMedRev.reduce(function(s, r) { return s + (r.tax || 0); }, 0);
    var whatIfTotalTax = whatIfMedRev.reduce(function(s, r) { return s + (r.tax || 0); }, 0);
    var dTax = whatIfTotalTax - baselineTotalTax;

    var bodyJargon = '';
    try { bodyJargon = (document.body.getAttribute('data-bf-jargon-mode') || ''); } catch (e) {}
    var isBeginnerReader = bodyJargon === 'plain';

    var headline =
      _kpiCard(isFR ? 'Taux de succès' : 'Success rate',
        Math.round(mc.succ * 100) + '%', fmtDelta(dSucc, 'pts'), dSucc, true) +
      _kpiCard(isFR ? 'Patrimoine médian (réel)' : 'Median wealth (real)',
        fmtCompact(mc.rMedF || mc.medF), fmtDelta(dMedF, '$'), dMedF, true) +
      _kpiCard(isFR ? 'Épuisement épargne' : 'Savings depletion',
        ruinDisplay, dRuin ? fmtDelta(dRuin, 'yrs') : '—', dRuin, true) +
      _kpiCard(isFR ? 'Patrimoine prudent P25' : 'Cautious wealth P25',
        fmtCompact(wiP25), fmtDelta(dP25, '$'), dP25, true);

    var secondary = isBeginnerReader ? '' : (
      _kpiCard(isFR ? 'Héritage médian' : 'Median estate',
        fmtCompact(mc.medEstateNet || 0), fmtDelta(dEstate, '$'), dEstate, true) +
      _kpiCard(isFR ? 'Impôt viager total' : 'Total lifetime tax',
        fmtCompact(whatIfTotalTax), fmtDelta(dTax, '$'), dTax, false)
    );

    var baseSucc = Math.round((B.succ || 0) * 100);
    var newSucc = Math.round(mc.succ * 100);
    var baseMedF = B.rMedF || B.medF || 0;
    var newMedF = mc.rMedF || mc.medF || 0;
    var baseRuinDisp = (B.p5Ruin == null || B.p5Ruin >= 200)
      ? (isFR ? 'Aucun' : 'Never')
      : (isFR ? 'À ' : 'At ') + B.p5Ruin + (isFR ? ' ans' : '');
    var compareStripHtml = '<div class="bf-whatif-compare-strip">' +
      _stripRow(isFR ? 'Taux de succès' : 'Success rate',
        baseSucc + '%', newSucc + '%', fmtDelta(dSucc, 'pts'), colorDelta(dSucc, true)) +
      _stripRow(isFR ? 'Patrimoine médian (réel)' : 'Median wealth (real)',
        fmtCompact(baseMedF), fmtCompact(newMedF), fmtDelta(dMedF, '$'), colorDelta(dMedF, true)) +
      _stripRow(isFR ? 'Épuisement épargne' : 'Savings depletion',
        baseRuinDisp, ruinDisplay, dRuin ? fmtDelta(dRuin, 'yrs') : '—', colorDelta(dRuin || 0, true)) +
      '</div>';

    var gridClass = isBeginnerReader ? 'bf-whatif-kpis-4' : 'bf-whatif-kpis-12';
    targetEl.innerHTML =
      '<div class="bf-whatif-summary">' + summaryHtml + '</div>' +
      compareStripHtml +
      '<div class="bf-whatif-kpis ' + gridClass + '">' + headline + secondary + '</div>';

    window.__bfLastWhatIf = {
      label: label || (isFR ? 'Alternative' : 'Alternative'),
      succ: Math.round(mc.succ * 100),
      medF: mc.rMedF || mc.medF,
      p25F: wiP25,
      ruin: ruinDisplay,
      estate: mc.medEstateNet || 0,
      tax: whatIfTotalTax
    };
  }

  function _renderCompareTable() {
    var box = document.getElementById('bf-whatif-compare');
    if (!box) return;
    if (_savedScenarios.length === 0) { box.innerHTML = ''; return; }
    var totalBaseTax = (P.medRevData || []).reduce(function(s, r) { return s + (r.tax || 0); }, 0);
    var baseRow = {
      label: isFR ? 'Votre plan' : 'Your plan',
      succ: Math.round((B.succ || 0) * 100),
      medF: B.rMedF || B.medF || 0,
      p25F: B.rP25F || B.p25F || 0,
      ruin: (B.p5Ruin == null || B.p5Ruin >= 200) ? (isFR ? 'Aucun' : 'Never') : (isFR ? 'À ' : 'At age ') + B.p5Ruin + (isFR ? ' ans' : ''),
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
    html += '<div class="bf-whatif-compare-hint">' +
      (isFR ? 'Vous pouvez conserver jusqu\'à 2 alternatives pour les comparer côte à côte avec votre plan.'
            : 'You can keep up to 2 alternatives to compare side-by-side with your plan.') +
      '</div>';
    box.innerHTML = html;
  }

  // ──────────────────────────────────────────────────────────────────────
  // RUNNERS
  // ──────────────────────────────────────────────────────────────────────
  function _runStress(baselineParams, scenarioId, shockAge) {
    var status = document.getElementById('bf-stress-status');
    var results = document.getElementById('bf-stress-results');
    var saveBtn = document.getElementById('bf-stress-save');
    var sc = _stressScenarios().filter(function(s) { return s.id === scenarioId; })[0];
    if (!sc) return;
    if (status) {
      status.textContent = isFR ? 'Application du choc…' : 'Applying shock…';
      status.className = 'bf-whatif-status running';
    }
    setTimeout(function() {
      var stressParams = Object.assign({}, baselineParams, {
        strs: scenarioId,
        stWhen: 'age',
        stAge: shockAge,
        strs2: 'none'
      });
      // Longevity scenario carries no market matrix — it extends deathAge.
      if (sc.extra && sc.extra.deathAge) {
        stressParams.deathAge = (baselineParams.deathAge || 90) + sc.extra.deathAge;
        stressParams.strs = 'none';
      }
      var t0 = Date.now();
      var mc;
      try {
        mc = window.BEngine.runMC(stressParams, 500);
      } catch (e) {
        if (status) {
          status.textContent = (isFR ? 'Calcul interrompu : ' : 'Calculation interrupted: ') + e.message;
          status.className = 'bf-whatif-status error';
        }
        return;
      }
      var dt = Date.now() - t0;
      var summary = isFR
        ? 'Choc appliqué : <strong>' + sc.label + '</strong> à ' + shockAge + ' ans. ' +
          'Les écarts ci-dessous se lisent par rapport à votre plan de référence.'
        : 'Shock applied: <strong>' + sc.label + '</strong> at age ' + shockAge + '. ' +
          'The deltas below read against your baseline plan.';
      _renderResults(results, summary, mc, sc.label + ' @' + shockAge);
      if (status) {
        status.textContent = (isFR ? 'Choc calculé (' : 'Shock ready (') + dt + ' ms)';
        status.className = 'bf-whatif-status done';
      }
      if (saveBtn) saveBtn.disabled = false;
    }, 30);
  }

  function _runWhatIf(baselineParams, slBase) {
    var status = document.getElementById('bf-whatif-status');
    var results = document.getElementById('bf-whatif-results');
    var saveBtn = document.getElementById('bf-whatif-save');
    if (status) {
      status.textContent = isFR ? 'Calcul de l\'alternative…' : 'Calculating alternative…';
      status.className = 'bf-whatif-status running';
    }
    setTimeout(function() {
      var whatIfParams = Object.assign({}, baselineParams, { strs: 'none', strs2: 'none' });
      whatIfParams.retAge = parseInt(document.getElementById('bfwi-retAge').value, 10);
      whatIfParams.deathAge = parseInt(document.getElementById('bfwi-deathAge').value, 10);
      whatIfParams.qppAge = parseInt(document.getElementById('bfwi-qppAge').value, 10);
      whatIfParams.oasAge = parseInt(document.getElementById('bfwi-oasAge').value, 10);
      whatIfParams.retSpM = parseInt(document.getElementById('bfwi-retSpM').value, 10);
      var rawEqRet = parseFloat(document.getElementById('bfwi-eqRet').value) / 100;
      var merVal = parseFloat(document.getElementById('bfwi-mer').value) / 100;
      whatIfParams.eqRet = Math.max(0.005, rawEqRet - merVal);
      whatIfParams.inf = parseFloat(document.getElementById('bfwi-inf').value) / 100;
      whatIfParams.rrspC = parseInt(document.getElementById('bfwi-rrspC').value, 10);
      whatIfParams.tfsaC = parseInt(document.getElementById('bfwi-tfsaC').value, 10);
      whatIfParams.meltTgt = parseInt(document.getElementById('bfwi-meltTgt').value, 10);
      whatIfParams.allocR = parseInt(document.getElementById('bfwi-allocR').value, 10) / 100;
      whatIfParams.melt = whatIfParams.meltTgt > 0;
      var t0 = Date.now();
      var mc;
      try {
        mc = window.BEngine.runMC(whatIfParams, 500);
      } catch (e) {
        if (status) {
          status.textContent = (isFR ? 'Calcul interrompu : ' : 'Calculation interrupted: ') + e.message;
          status.className = 'bf-whatif-status error';
        }
        return;
      }
      var dt = Date.now() - t0;
      var changes = [];
      if (whatIfParams.retAge !== baselineParams.retAge) changes.push((isFR ? 'retraite ' : 'retire ') + whatIfParams.retAge + (isFR ? ' ans' : ' yrs'));
      if (whatIfParams.retSpM !== baselineParams.retSpM) changes.push((isFR ? 'dépenses ' : 'spend ') + whatIfParams.retSpM + '$/mois');
      if (Math.abs(rawEqRet - baselineParams.eqRet) > 0.001) changes.push((isFR ? 'rendement ' : 'return ') + (rawEqRet * 100).toFixed(1) + '%');
      if (Math.abs(whatIfParams.inf - baselineParams.inf) > 0.001) changes.push((isFR ? 'inflation ' : 'inflation ') + (whatIfParams.inf * 100).toFixed(1) + '%');
      if (merVal > 0) changes.push((isFR ? 'MER ' : 'MER ') + (merVal * 100).toFixed(1) + '%');
      if (whatIfParams.qppAge !== (baselineParams.qppAge || 65)) changes.push((isFR ? 'RRQ@' : 'CPP@') + whatIfParams.qppAge);
      if (whatIfParams.oasAge !== (baselineParams.oasAge || 65)) changes.push((isFR ? 'PSV@' : 'OAS@') + whatIfParams.oasAge);
      var summary = isFR
        ? 'Alternative explorée : <strong>' + (changes.join(', ') || 'aucun changement') + '</strong>. Les écarts se lisent par rapport à votre plan de référence.'
        : 'Alternative explored: <strong>' + (changes.join(', ') || 'no change') + '</strong>. The deltas read against your baseline plan.';
      _renderResults(results, summary, mc, changes.join(', ') || (isFR ? 'Alternative' : 'Alternative'));
      if (status) {
        status.textContent = (isFR ? 'Alternative calculée (' : 'Alternative ready (') + dt + ' ms)';
        status.className = 'bf-whatif-status done';
      }
      if (saveBtn) saveBtn.disabled = false;
    }, 30);
  }

  // ──────────────────────────────────────────────────────────────────────
  // UI BUILDERS
  // ──────────────────────────────────────────────────────────────────────
  function _buildStressTab(baselineParams) {
    var scenarios = _stressScenarios();
    if (!scenarios.length) {
      return '<div class="bf-whatif-empty">' +
        (isFR ? 'Catalogue de stress indisponible.' : 'Stress catalog unavailable.') +
        '</div>';
    }
    var defaultAge = Math.max(baselineParams.age + 1, baselineParams.retAge || 65);
    var ageOptions = [];
    var seen = {};
    [baselineParams.age, baselineParams.retAge,
     Math.max(baselineParams.age, (baselineParams.retAge || 65) - 5),
     baselineParams.retAge || 65,
     Math.min(baselineParams.deathAge - 5, (baselineParams.retAge || 65) + 5),
     70, 80].forEach(function(a) {
      if (a == null || isNaN(a)) return;
      if (a < baselineParams.age || a > (baselineParams.deathAge || 95)) return;
      if (seen[a]) return;
      seen[a] = true;
      ageOptions.push(a);
    });
    ageOptions.sort(function(a, b) { return a - b; });

    var bannerStrong = isFR ? 'Tests de stress.' : 'Stress tests.';
    var bannerBody = isFR
      ? 'Choisissez un scénario historique ou synthétique. La matrice de rendements ci-dessous (actions, obligations, inflation) s\'applique à partir de l\'âge que vous choisissez. Votre plan de référence ne change pas.'
      : 'Pick a historical or synthetic scenario. The return matrix below (equities, bonds, inflation) is applied starting from the age you choose. Your baseline plan stays intact.';

    var ageBarHtml = '<div class="bf-stress-agebar">' +
      '<span class="bf-stress-agebar-label">' +
        (isFR ? 'Choc à l\'âge de :' : 'Shock at age:') +
      '</span>' +
      '<div class="bf-stress-agebar-buttons">';
    ageOptions.forEach(function(a, i) {
      var lbl = a === baselineParams.age ? a + (isFR ? ' (auj.)' : ' (now)')
              : a === baselineParams.retAge ? a + (isFR ? ' (ret.)' : ' (ret.)')
              : String(a);
      ageBarHtml += '<button type="button" class="bf-stress-age-btn' +
        (a === defaultAge ? ' active' : '') +
        '" data-bf-stress-age="' + a + '">' + lbl + '</button>';
    });
    ageBarHtml += '</div>' +
      '<input type="number" id="bf-stress-age-input" class="bf-stress-age-input" min="' +
      baselineParams.age + '" max="' + ((baselineParams.deathAge || 95) - 1) +
      '" value="' + defaultAge + '">' +
      '</div>';

    // Codex 2026-04-27: compact card grid — title only. Description and
    // return matrix are surfaced in a SHARED detail panel below the grid
    // when the user clicks a card. Eliminates the wall-of-text problem
    // (8 cards × full desc + 3-row matrix = 3 screens of vertical scroll).
    var cardsHtml = '<div class="bf-stress-cards bf-stress-cards-compact">';
    scenarios.forEach(function(sc) {
      cardsHtml += '<button type="button" class="bf-stress-card-compact" data-bf-stress-id="' + sc.id + '" title="' + sc.label + ' — ' + sc.desc.replace(/"/g, '&quot;') + '">' +
        '<span class="bf-stress-card-label">' + sc.label + '</span>' +
      '</button>';
    });
    cardsHtml += '</div>';

    // Detail panel — populated on card click. Shows the selected scenario's
    // description + return-matrix preview, framed once instead of repeated
    // across every card.
    var detailHtml = '<div id="bf-stress-detail" class="bf-stress-detail" hidden>' +
      '<div class="bf-stress-detail-head">' +
        '<span class="bf-stress-detail-label" id="bf-stress-detail-label"></span>' +
        '<span class="bf-stress-detail-tag">' +
          (isFR ? 'sélectionné' : 'selected') +
        '</span>' +
      '</div>' +
      '<div class="bf-stress-detail-desc" id="bf-stress-detail-desc"></div>' +
      '<div class="bf-stress-detail-matrix" id="bf-stress-detail-matrix"></div>' +
    '</div>' +
    '<div class="bf-stress-empty-hint" id="bf-stress-empty-hint">' +
      (isFR ? 'Choisissez un scénario ci-dessus pour voir sa description, sa matrice de rendements et son impact sur votre plan.'
            : 'Pick a scenario above to see its description, return matrix, and impact on your plan.') +
    '</div>';

    var actionsHtml = '<div class="bf-whatif-actions">' +
      '<button type="button" id="bf-stress-save" class="bf-whatif-btn bf-whatif-btn-secondary" disabled>' +
        (isFR ? 'Conserver ce stress' : 'Keep this stress') + '</button>' +
      '<button type="button" id="bf-stress-reset" class="bf-whatif-btn bf-whatif-btn-secondary">' +
        (isFR ? 'Revenir à mon plan' : 'Back to my plan') + '</button>' +
      '<span id="bf-stress-status" class="bf-whatif-status"></span>' +
      '</div>';

    // 2026-04-30: instructional banner removed — it duplicated the
    // chapter cover frame ("Explorer des alternatives") and the tab
    // labels themselves. The age picker + scenario cards are
    // self-explanatory. Kept the strong+body strings live for the
    // tab tooltip but no longer rendered above the age bar.
    void bannerStrong; void bannerBody;
    return ageBarHtml +
      cardsHtml +
      detailHtml +
      actionsHtml +
      '<div id="bf-stress-results" class="bf-whatif-results"></div>';
  }

  function _buildWhatIfTab(baselineParams) {
    var slBase = {
      retAge:      { group: 'timing',   label: isFR ? 'Âge de retraite' : 'Retirement age',         min: Math.max(50, baselineParams.age + 1), max: 75, step: 1, val: baselineParams.retAge,    unit: isFR ? ' ans' : ' yrs' },
      deathAge:    { group: 'timing',   label: isFR ? 'Âge de décès projeté' : 'Projected death age', min: Math.max(80, baselineParams.retAge + 10), max: 105, step: 1, val: baselineParams.deathAge, unit: isFR ? ' ans' : ' yrs' },
      qppAge:      { group: 'timing',   label: isFR ? 'Début RRQ/RPC' : 'CPP/QPP start age',         min: 60, max: 70, step: 1, val: baselineParams.qppAge || 65, unit: isFR ? ' ans' : ' yrs' },
      oasAge:      { group: 'timing',   label: isFR ? 'Début PSV' : 'OAS start age',                 min: 65, max: 70, step: 1, val: baselineParams.oasAge || 65, unit: isFR ? ' ans' : ' yrs' },
      retSpM:      { group: 'spending', label: isFR ? 'Dépenses mensuelles' : 'Monthly spending',    min: Math.round(baselineParams.retSpM * 0.6), max: Math.round(baselineParams.retSpM * 1.4), step: 100, val: baselineParams.retSpM, unit: '$/mois' },
      eqRet:       { group: 'markets',  label: isFR ? 'Rendement actions' : 'Equity return',         min: 3, max: 10, step: 0.25, val: Math.round((baselineParams.eqRet || 0.06) * 1000) / 10, unit: '%' },
      inf:         { group: 'markets',  label: 'Inflation',                                          min: 0.5, max: 6, step: 0.25, val: Math.round((baselineParams.inf || 0.021) * 1000) / 10, unit: '%' },
      mer:         { group: 'markets',  label: isFR ? 'MER (frais portefeuille)' : 'MER (portfolio fees)', min: 0, max: 3, step: 0.1, val: Math.round((baselineParams.merWt || 0) * 1000) / 10, unit: '%' },
      rrspC:       { group: 'strategy', label: isFR ? 'Cotis. REER/an' : 'RRSP contrib/yr',          min: 0, max: 32000, step: 500, val: baselineParams.rrspC || 0, unit: '$/an' },
      tfsaC:       { group: 'strategy', label: isFR ? 'Cotis. CELI/an' : 'TFSA contrib/yr',          min: 0, max: 7000, step: 250, val: baselineParams.tfsaC || 0, unit: '$/an' },
      meltTgt:     { group: 'strategy', label: isFR ? 'Cible meltdown REER' : 'RRSP meltdown target', min: 0, max: 150000, step: 5000, val: baselineParams.meltTgt || 0, unit: '$/an' },
      allocR:      { group: 'strategy', label: isFR ? 'Allocation actions REER' : 'RRSP equity alloc', min: 20, max: 95, step: 5, val: Math.round((baselineParams.allocR || 0.6) * 100), unit: '%' }
    };
    var archPhase = _readArchetypePhase(baselineParams);
    var plainReader = _isPlainReader();
    var curated = _curatedDecisions(baselineParams, archPhase);

    var bannerStrong = isFR ? 'Et si...?' : 'What If?';
    var bannerBody = isFR
      ? 'Ajustez les hypothèses durables de votre plan : âge de retraite, dépenses, cotisations, allocation, frais. Pour les chocs ponctuels (crash, inflation, longévité), utilisez l\'onglet Tests de stress. Votre plan de référence reste intact.'
      : 'Adjust the lasting assumptions of your plan: retirement age, spending, contributions, allocation, fees. For one-time shocks (crash, inflation, longevity), use the Stress tests tab. Your baseline plan stays intact.';

    // Codex 2026-04-27: compact decision cards — title only. Description
    // surfaces in a shared detail panel below when a card is selected
    // (same pattern as Stress tab). Native title="" attribute also acts
    // as a hover tooltip for users who want a quick preview without
    // committing to a click.
    var presetsHtml = '<div class="bf-whatif-presets bf-whatif-l1">' +
      '<div class="bf-whatif-presets-label">' + (isFR ? 'Décisions à explorer' : 'Decisions to explore') + '</div>' +
      '<div class="bf-whatif-card-grid bf-whatif-card-grid-compact">';
    curated.forEach(function(pr) {
      presetsHtml += '<button type="button" class="bf-whatif-decision-card-compact" data-bf-preset="' + pr.id + '" title="' + pr.label + ' — ' + pr.desc.replace(/"/g, '&quot;') + '">' +
        '<span class="bf-whatif-card-label">' + pr.label + '</span>' +
      '</button>';
    });
    presetsHtml += '</div>' +
      '<div id="bf-whatif-decision-detail" class="bf-whatif-decision-detail" hidden>' +
        '<div class="bf-stress-detail-head">' +
          '<span class="bf-stress-detail-label" id="bf-whatif-decision-label"></span>' +
          '<span class="bf-stress-detail-tag">' +
            (isFR ? 'sélectionnée' : 'selected') +
          '</span>' +
        '</div>' +
        '<div class="bf-stress-detail-desc" id="bf-whatif-decision-desc"></div>' +
      '</div>' +
    '</div>';

    var groups = {
      timing:   { label: isFR ? 'Échéances' : 'Timing' },
      spending: { label: isFR ? 'Dépenses' : 'Spending' },
      markets:  { label: isFR ? 'Marchés' : 'Markets' },
      strategy: { label: isFR ? 'Stratégie' : 'Strategy' }
    };
    var controlsHtml = '';
    if (!plainReader) {
      controlsHtml = '<details class="bf-whatif-l2" open>' +
        '<summary class="bf-whatif-l2-summary">' +
          (isFR ? 'Ajuster les hypothèses moi-même' : 'Adjust assumptions yourself') +
          '<span class="bf-whatif-l2-summary-hint">' +
            (isFR ? ' — curseurs détaillés' : ' — detailed sliders') +
          '</span>' +
        '</summary>' +
        '<div class="bf-whatif-l2-body">' +
        '<div class="bf-whatif-controls">';
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
      controlsHtml += '<div class="bf-whatif-hidden-state" style="display:none">';
      Object.keys(slBase).forEach(function(k) {
        var s = slBase[k];
        controlsHtml += '<input type="hidden" id="bfwi-' + k + '" value="' + s.val + '" data-bf-whatif-key="' + k + '">' +
          '<span id="bfwi-' + k + '-out">' + s.val + s.unit + '</span>';
      });
      controlsHtml += '</div>';
    }

    var buttonsHtml = '<div class="bf-whatif-actions">';
    if (!plainReader) {
      buttonsHtml += '<button type="button" id="bf-whatif-simulate" class="bf-whatif-btn">' +
        (isFR ? 'Voir l\'effet sur mon plan' : 'See the effect on my plan') + '</button>';
    }
    buttonsHtml +=
      '<button type="button" id="bf-whatif-save" class="bf-whatif-btn bf-whatif-btn-secondary" disabled>' +
        (isFR ? 'Conserver cette alternative' : 'Keep this alternative') + '</button>' +
      '<button type="button" id="bf-whatif-reset" class="bf-whatif-btn bf-whatif-btn-secondary">' +
        (isFR ? 'Revenir à mon plan' : 'Back to my plan') + '</button>' +
      '<span id="bf-whatif-status" class="bf-whatif-status"></span>' +
      '</div>';

    // 2026-04-30: banner removed (duplicates chapter cover + tab label).
    void bannerStrong; void bannerBody;
    return {
      html:
        presetsHtml + controlsHtml + buttonsHtml +
        '<div id="bf-whatif-results" class="bf-whatif-results"></div>',
      slBase: slBase,
      curated: curated
    };
  }

  function _buildUI(baselineParams) {
    var wrap = document.getElementById('bf-whatif');
    if (!wrap) return;
    var panel = document.createElement('div');
    panel.className = 'bf-whatif-panel';

    var stressHtml = _buildStressTab(baselineParams);
    var whatIfBundle = _buildWhatIfTab(baselineParams);

    var tabsHtml =
      '<div class="bf-whatif-tabs" role="tablist">' +
        '<button type="button" class="bf-whatif-tab active" data-bf-tab="stress" role="tab" aria-selected="true">' +
          (isFR ? 'Tests de stress' : 'Stress tests') +
          '<span class="bf-whatif-tab-hint">' +
            (isFR ? ' — chocs historiques' : ' — historical shocks') +
          '</span>' +
        '</button>' +
        '<button type="button" class="bf-whatif-tab" data-bf-tab="whatif" role="tab" aria-selected="false">' +
          (isFR ? 'Et si...?' : 'What If?') +
          '<span class="bf-whatif-tab-hint">' +
            (isFR ? ' — décisions et hypothèses' : ' — decisions & assumptions') +
          '</span>' +
        '</button>' +
      '</div>';

    panel.innerHTML =
      tabsHtml +
      '<div class="bf-whatif-tabpanel" data-bf-panel="stress">' + stressHtml + '</div>' +
      '<div class="bf-whatif-tabpanel" data-bf-panel="whatif" hidden>' + whatIfBundle.html + '</div>' +
      '<div id="bf-whatif-compare" class="bf-whatif-compare"></div>';
    wrap.appendChild(panel);

    // Tab switching.
    var tabs = panel.querySelectorAll('.bf-whatif-tab');
    var panels = panel.querySelectorAll('.bf-whatif-tabpanel');
    for (var t = 0; t < tabs.length; t++) {
      tabs[t].addEventListener('click', function() {
        var key = this.getAttribute('data-bf-tab');
        for (var i = 0; i < tabs.length; i++) {
          var on = tabs[i].getAttribute('data-bf-tab') === key;
          tabs[i].classList.toggle('active', on);
          tabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
        }
        for (var j = 0; j < panels.length; j++) {
          panels[j].hidden = (panels[j].getAttribute('data-bf-panel') !== key);
        }
      });
    }

    // ─── Stress tab wiring ────────────────────────────────────────────
    var stressAgeBtns = panel.querySelectorAll('.bf-stress-age-btn');
    var stressAgeInput = document.getElementById('bf-stress-age-input');
    function _currentStressAge() {
      if (!stressAgeInput) return baselineParams.retAge || 65;
      var v = parseInt(stressAgeInput.value, 10);
      return isNaN(v) ? (baselineParams.retAge || 65) : v;
    }
    for (var sa = 0; sa < stressAgeBtns.length; sa++) {
      stressAgeBtns[sa].addEventListener('click', function() {
        var age = parseInt(this.getAttribute('data-bf-stress-age'), 10);
        for (var i = 0; i < stressAgeBtns.length; i++) stressAgeBtns[i].classList.remove('active');
        this.classList.add('active');
        if (stressAgeInput) stressAgeInput.value = age;
      });
    }
    if (stressAgeInput) {
      stressAgeInput.addEventListener('change', function() {
        var v = _currentStressAge();
        for (var i = 0; i < stressAgeBtns.length; i++) {
          stressAgeBtns[i].classList.toggle('active',
            parseInt(stressAgeBtns[i].getAttribute('data-bf-stress-age'), 10) === v);
        }
      });
    }
    var stressCards = panel.querySelectorAll('.bf-stress-card-compact, .bf-stress-card');
    var stressDetailEl = document.getElementById('bf-stress-detail');
    var stressEmptyHint = document.getElementById('bf-stress-empty-hint');
    var stressDetailLabel = document.getElementById('bf-stress-detail-label');
    var stressDetailDesc = document.getElementById('bf-stress-detail-desc');
    var stressDetailMatrix = document.getElementById('bf-stress-detail-matrix');
    var stressScenariosCache = _stressScenarios();
    for (var c = 0; c < stressCards.length; c++) {
      stressCards[c].addEventListener('click', function() {
        var id = this.getAttribute('data-bf-stress-id');
        var sc = stressScenariosCache.filter(function(s) { return s.id === id; })[0];
        for (var i = 0; i < stressCards.length; i++) stressCards[i].classList.remove('active');
        this.classList.add('active');
        // Populate the shared detail panel with the selected scenario's
        // description + matrix preview. Hides the empty-state hint.
        if (sc && stressDetailEl) {
          if (stressDetailLabel) stressDetailLabel.textContent = sc.label;
          if (stressDetailDesc) stressDetailDesc.textContent = sc.desc;
          if (stressDetailMatrix) stressDetailMatrix.innerHTML = _renderMatrixPreview(sc);
          stressDetailEl.hidden = false;
          if (stressEmptyHint) stressEmptyHint.hidden = true;
        }
        _runStress(baselineParams, id, _currentStressAge());
      });
    }
    var stressSaveBtn = document.getElementById('bf-stress-save');
    if (stressSaveBtn) stressSaveBtn.addEventListener('click', function() {
      if (!window.__bfLastWhatIf) return;
      if (_savedScenarios.length >= 2) _savedScenarios.shift();
      _savedScenarios.push(window.__bfLastWhatIf);
      _renderCompareTable();
      stressSaveBtn.textContent = (isFR ? '✓ Conservé (' : '✓ Kept (') + _savedScenarios.length + '/2)';
      setTimeout(function() {
        stressSaveBtn.textContent = isFR ? 'Conserver ce stress' : 'Keep this stress';
      }, 1800);
    });
    var stressResetBtn = document.getElementById('bf-stress-reset');
    if (stressResetBtn) stressResetBtn.addEventListener('click', function() {
      for (var i = 0; i < stressCards.length; i++) stressCards[i].classList.remove('active');
      var rEl = document.getElementById('bf-stress-results');
      if (rEl) rEl.innerHTML = '';
      var sEl = document.getElementById('bf-stress-status');
      if (sEl) sEl.textContent = '';
      if (stressSaveBtn) stressSaveBtn.disabled = true;
      window.__bfLastWhatIf = null;
    });

    // ─── What-If tab wiring ───────────────────────────────────────────
    var slBase = whatIfBundle.slBase;
    var curated = whatIfBundle.curated;
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
    var presetBtns = panel.querySelectorAll('.bf-whatif-decision-card-compact, .bf-whatif-decision-card');
    var decisionDetailEl = document.getElementById('bf-whatif-decision-detail');
    var decisionDetailLabel = document.getElementById('bf-whatif-decision-label');
    var decisionDetailDesc = document.getElementById('bf-whatif-decision-desc');
    for (var p = 0; p < presetBtns.length; p++) {
      presetBtns[p].addEventListener('click', function() {
        var presetId = this.getAttribute('data-bf-preset');
        var preset = curated.filter(function(pr) { return pr.id === presetId; })[0];
        if (!preset) return;
        // Populate shared detail panel with the selected decision's label
        // + description (codex 2026-04-27 redesign — single detail panel
        // replaces per-card description text).
        if (decisionDetailEl) {
          if (decisionDetailLabel) decisionDetailLabel.textContent = preset.label;
          if (decisionDetailDesc) decisionDetailDesc.textContent = preset.desc;
          decisionDetailEl.hidden = false;
        }
        Object.keys(slBase).forEach(function(k) {
          var inp = document.getElementById('bfwi-' + k);
          if (inp) {
            inp.value = slBase[k].val;
            var out = document.getElementById('bfwi-' + k + '-out');
            if (out) out.textContent = slBase[k].val + slBase[k].unit;
          }
        });
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
        for (var z = 0; z < presetBtns.length; z++) presetBtns[z].classList.remove('active');
        this.classList.add('active');
        _runWhatIf(baselineParams, slBase);
      });
    }
    var simBtn = document.getElementById('bf-whatif-simulate');
    if (simBtn) simBtn.addEventListener('click', function() { _runWhatIf(baselineParams, slBase); });
    var saveBtn = document.getElementById('bf-whatif-save');
    if (saveBtn) saveBtn.addEventListener('click', function() {
      if (!window.__bfLastWhatIf) return;
      if (_savedScenarios.length >= 2) _savedScenarios.shift();
      _savedScenarios.push(window.__bfLastWhatIf);
      _renderCompareTable();
      saveBtn.textContent = (isFR ? '✓ Conservée (' : '✓ Kept (') + _savedScenarios.length + '/2)';
      setTimeout(function() {
        saveBtn.textContent = isFR ? 'Conserver cette alternative' : 'Keep this alternative';
      }, 1800);
    });
    var resetBtn = document.getElementById('bf-whatif-reset');
    if (resetBtn) resetBtn.addEventListener('click', function() {
      Object.keys(slBase).forEach(function(k) {
        var inp = document.getElementById('bfwi-' + k);
        if (inp) {
          inp.value = slBase[k].val;
          var out = document.getElementById('bfwi-' + k + '-out');
          if (out) out.textContent = slBase[k].val + slBase[k].unit;
        }
      });
      var rEl = document.getElementById('bf-whatif-results');
      if (rEl) rEl.innerHTML = '';
      var sEl = document.getElementById('bf-whatif-status');
      if (sEl) sEl.textContent = '';
      if (saveBtn) saveBtn.disabled = true;
      window.__bfLastWhatIf = null;
      for (var z = 0; z < presetBtns.length; z++) presetBtns[z].classList.remove('active');
    });
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
