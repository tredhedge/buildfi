// report-interactive.js — Phase 13 core interactivity layer.
//
// Runs inside the generated report HTML (self-contained, no CDN) and manages:
//   - Year slider (scrub pD year-by-year, highlight fan chart + cashflow)
//   - Real/Nominal dollar toggle (swap across the entire report)
//   - Scenario toggle P25/P50/P75 (rebind KPIs + tables to the selected band)
//   - Action plan toggle (visualize delta when an action is applied)
//
// Data contract (window.__BUILDFI__ emitted inline by report-pdf.js):
//   {
//     meta: { currentAge, retAge, deathAge, fr, clientName, ... },
//     baseline: { medF, rMedF, p25F, rP25F, p75F, rP75F, medEstateNet, ... },
//     pD: [ { age, p5, p25, p50, p75, p95, rp5, rp25, ..., mp_total, rmp_total, ... } ],
//     medRevData: [ { age, rrq, psv, ret, spend, tax, ... } ],
//     enriched: { cashflow, drawTrace, estateWaterfall, goalsLedger, allocation },
//     stress: { gfc2008, stagflation73, ... },
//     sweeps: { returns: {up, down}, inflation: {up, down} },
//     actions: [ { id, dollarImpact, title } ]
//   }
//
// Binding contract — elements opt in via data attributes:
//   <span data-bf-live="medF" data-bf-real="..." data-bf-nom="...">  → real/nominal swap
//   <span data-bf-live="ageBal" data-bf-age-field="mp_total">        → year-scrub (pulls pD[age].field)
//   <span data-bf-live="scenarioKPI" data-bf-scenario-field="medF">   → scenario toggle
//   <tr data-bf-age="62">                                              → highlight row matching year
//   <svg data-bf-chart="fan" data-bf-chart-data='[{x:42,y:...}]'>      → tooltip-enabled
//
// Print safety: sticky bar .no-print + @media print hides all widgets; values
// remain at whatever state the user chose when triggering print.

(function() {
  "use strict";

  // Boot gate — requires payload embedded by the server-side renderer.
  if (typeof window === 'undefined' || !window.__BUILDFI__) return;
  var P = window.__BUILDFI__;

  // ─────────────────────────────────────────────────────────────────────
  // STATE — single source of truth. Any UI change fires updateState().
  // ─────────────────────────────────────────────────────────────────────
  var state = {
    year: P.meta.retAge || 65,
    mode: 'real',          // 'real' | 'nom'
    scenario: 'p50',       // 'p5' | 'p25' | 'p50' | 'p75' | 'p95'
    actions: {}            // { actionId: true } when toggled ON
  };

  // ─────────────────────────────────────────────────────────────────────
  // FORMATTERS — lightweight, locale-aware (matches report-formatters.js).
  // Kept in-file so interactivity works even if formatters load order shifts.
  // ─────────────────────────────────────────────────────────────────────
  var isFR = !!(P.meta && P.meta.fr);

  function fmtCompact(v) {
    if (v == null || !isFinite(v)) return '\u2014';
    var a = Math.abs(v);
    if (a >= 1e6) return (v < 0 ? '\u2212' : '') + (a / 1e6).toFixed(1).replace('.', isFR ? ',' : '.') + ' M$';
    if (a >= 1e3) return (v < 0 ? '\u2212' : '') + Math.round(a / 1e3) + ' K$';
    return Math.round(v) + '$';
  }
  function fmtMoney(v) {
    if (v == null || !isFinite(v)) return '\u2014';
    var abs = Math.abs(Math.round(v));
    var formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, isFR ? '\u00a0' : ',');
    return isFR ? (v < 0 ? '\u2212' : '') + formatted + '\u00a0$' : (v < 0 ? '\u2212$' : '$') + formatted;
  }
  function fmtPct(v, dec) {
    if (v == null || !isFinite(v)) return '\u2014';
    var n = (v * 100).toFixed(dec == null ? 1 : dec);
    return isFR ? n.replace('.', ',') + '\u00a0%' : n + '%';
  }

  // ─────────────────────────────────────────────────────────────────────
  // PAYLOAD HELPERS — resolve field value under current state.
  // ─────────────────────────────────────────────────────────────────────
  function _pDAt(age) {
    if (!P.pD || !P.pD.length) return null;
    for (var i = 0; i < P.pD.length; i++) {
      if (P.pD[i].age === age) return P.pD[i];
    }
    // Snap to closest
    var closest = P.pD[0], minDiff = Math.abs(P.pD[0].age - age);
    for (var j = 1; j < P.pD.length; j++) {
      var d = Math.abs(P.pD[j].age - age);
      if (d < minDiff) { minDiff = d; closest = P.pD[j]; }
    }
    return closest;
  }

  function _revAt(age) {
    if (!P.medRevData || !P.medRevData.length) return null;
    for (var i = 0; i < P.medRevData.length; i++) {
      if (P.medRevData[i].age === age) return P.medRevData[i];
    }
    return null;
  }

  // Given scenario + real/nominal, produce the field name to read from pD.
  // Nominal: p5/p25/p50/p75/p95. Real: rp5/rp25/rp50/rp75/rp95.
  // Custom mp_* fields for totals/account-breakdowns always per-percentile.
  function _pDFieldName(base, scenario, mode) {
    var pctKey = scenario; // p5, p25, p50, p75, p95
    // Map 'p50' → 'p50' for baseline, 'rp50' for real. For median path fields
    // (mp_total, mp_rr...), those are already the median (P50); no percentile.
    if (base === 'p50') return mode === 'real' ? 'rp50' : 'p50';
    return mode === 'real' ? 'r' + pctKey : pctKey;
  }

  // Resolve a "scenarioKPI" field. For baseline KPIs (medF, rMedF, etc.),
  // the scenario toggle maps to different baseline keys:
  //   p25 → p25F (nom) / rP25F (real)
  //   p50 → medF / rMedF
  //   p75 → p75F / rP75F
  function _resolveScenarioKPI(field, scenario, mode) {
    if (!P.baseline) return null;
    var b = P.baseline;
    var key;
    // Common field aliases used in report
    if (field === 'medF' || field === 'wealth') {
      if (scenario === 'p25') key = mode === 'real' ? 'rP25F' : 'p25F';
      else if (scenario === 'p75') key = mode === 'real' ? 'rP75F' : 'p75F';
      else if (scenario === 'p5') key = mode === 'real' ? 'rP5F' : 'p5F';
      else if (scenario === 'p95') key = mode === 'real' ? 'rP95F' : 'p95F';
      else key = mode === 'real' ? 'rMedF' : 'medF';
    } else if (field === 'estateNet') {
      if (scenario === 'p25') key = 'p25EstateNet';
      else if (scenario === 'p5') key = 'p5EstateNet';
      else if (scenario === 'p75') key = 'p75EstateNet';
      else if (scenario === 'p95') key = 'p95EstateNet';
      else key = 'medEstateNet';
    } else {
      key = field; // pass-through
    }
    return b[key];
  }

  // ─────────────────────────────────────────────────────────────────────
  // LIVE UPDATE DISPATCHER — scan [data-bf-live] elements and rewrite.
  // ─────────────────────────────────────────────────────────────────────
  function updateLiveValues() {
    var nodes = document.querySelectorAll('[data-bf-live]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var kind = el.getAttribute('data-bf-live');
      var newText = null;

      if (kind === 'scalar') {
        // Simple real/nominal swap. data-bf-real="..." data-bf-nom="..."
        newText = state.mode === 'real' ? el.getAttribute('data-bf-real') : el.getAttribute('data-bf-nom');
      } else if (kind === 'ageBal') {
        // Year-scrub: pull pD[state.year][field], respecting real/nominal.
        var field = el.getAttribute('data-bf-age-field') || 'mp_total';
        var row = _pDAt(state.year);
        if (row) {
          // For balance fields, 'mp_' is nominal median, 'rmp_' is real median
          var fieldKey = state.mode === 'real' && row[('r' + field)] != null ? ('r' + field)
                       : state.mode === 'real' && row['rmp_total'] != null && field === 'mp_total' ? 'rmp_total'
                       : field;
          // Handle rmp_ prefix explicitly for total/account-level
          if (state.mode === 'real') {
            var rKey = field.replace(/^mp_/, 'rmp_');
            if (row[rKey] != null) fieldKey = rKey;
          }
          var v = row[fieldKey];
          newText = v != null ? fmtCompact(v) : '\u2014';
        }
      } else if (kind === 'ageRev') {
        // Year-scrub from medRevData (for cashflow, tax, spending at age).
        var fieldR = el.getAttribute('data-bf-age-field') || 'ret';
        var rowR = _revAt(state.year);
        if (rowR) {
          var vR = rowR[fieldR] || 0;
          newText = fmtCompact(vR);
        }
      } else if (kind === 'scenarioKPI') {
        // Scenario swap: resolves baseline[scenario + mode]
        var sField = el.getAttribute('data-bf-scenario-field') || 'medF';
        var sV = _resolveScenarioKPI(sField, state.scenario, state.mode);
        newText = sV != null ? fmtCompact(sV) : '\u2014';
      } else if (kind === 'scenarioPct') {
        // Scenario-dependent success percentage
        var scKey = el.getAttribute('data-bf-scenario-field') || 'succ';
        newText = scKey === 'succ' && P.baseline && P.baseline.succ != null
          ? Math.round(P.baseline.succ * 100) + '%'
          : '\u2014';
      } else if (kind === 'yearLabel') {
        newText = state.year + (isFR ? ' ans' : ' yrs');
      }

      if (newText != null) el.textContent = newText;
    }

    // Highlight the row in any table that has data-bf-age matching state.year
    var rows = document.querySelectorAll('[data-bf-age]');
    for (var k = 0; k < rows.length; k++) {
      var r = rows[k];
      var ageAttr = parseInt(r.getAttribute('data-bf-age'), 10);
      if (ageAttr === state.year) r.classList.add('bf-age-active');
      else r.classList.remove('bf-age-active');
    }

    // Scenario badge (sticky bar)
    _updateScenarioBadge();

    // Fan chart marker — vertical line at selected year + bold trace
    // re-drawn along the selected percentile (p25/p50/p75).
    var fanCharts = document.querySelectorAll('[data-bf-chart="fan"]');
    for (var f = 0; f < fanCharts.length; f++) {
      _redrawFanMarker(fanCharts[f]);
      _redrawFanBoldTrace(fanCharts[f]);
    }

    // Fire custom event so tooltip/other modules can react
    try {
      document.dispatchEvent(new CustomEvent('bf-state-change', { detail: state }));
    } catch (e) { /* older browsers — ignore */ }
  }

  // Redraws the bold line inside the fan chart along the selected percentile.
  // The chart's original bold trace is a <path class="bf-fan-trace"> emitted by
  // svgFanChart; we rebuild its `d` attribute from the embedded datapoints.
  function _redrawFanBoldTrace(svg) {
    var trace = svg.querySelector('.bf-fan-trace');
    var dataAttr = svg.getAttribute('data-bf-chart-data');
    if (!trace || !dataAttr) return;
    var points;
    try { points = JSON.parse(dataAttr.replace(/&quot;/g, '"')); } catch (e) { return; }
    if (!points || !points.length) return;
    var vb = (svg.getAttribute('viewBox') || '0 0 700 220').split(/\s+/).map(parseFloat);
    var vbW = vb[2] || 700, vbH = vb[3] || 220;
    var ml = 55, mr = 15, mt = 15, mb = 30;
    var plotW = vbW - ml - mr, plotH = vbH - mt - mb;
    // Compute Y range from all percentile fields, matches svgFanChart math.
    var yMin = 0, yMax = 0;
    points.forEach(function(d) {
      [d.p5, d.p25, d.p50, d.p75, d.p95].forEach(function(v) {
        if (v == null) return;
        if (v > yMax) yMax = v;
        if (v < yMin) yMin = v;
      });
    });
    if (yMax === yMin) yMax = yMin + 1;
    var yRange = yMax - yMin;
    var field = state.scenario; // 'p25' | 'p50' | 'p75' (skip p5/p95 for clarity)
    if (['p25','p50','p75'].indexOf(field) < 0) field = 'p50';
    var n = points.length;
    var d = '';
    for (var i = 0; i < n; i++) {
      var xv = ml + (i / Math.max(1, n - 1)) * plotW;
      var yv = mt + plotH - ((points[i][field] || 0) - yMin) / yRange * plotH;
      d += (i === 0 ? 'M' : 'L') + xv.toFixed(1) + ',' + yv.toFixed(1) + ' ';
    }
    trace.setAttribute('d', d.trim());
    // Colour the trace by scenario tone
    var stroke = field === 'p25' ? '#b89830' : field === 'p75' ? '#2a8c46' : '#c4944a';
    trace.setAttribute('stroke', stroke);
  }

  function _redrawFanMarker(svg) {
    // Remove existing marker
    var existing = svg.querySelector('.bf-year-marker');
    if (existing) existing.parentNode.removeChild(existing);
    // Extract chart data (age range) from data-bf-chart-min / -max
    var minAge = parseFloat(svg.getAttribute('data-bf-chart-min') || '0');
    var maxAge = parseFloat(svg.getAttribute('data-bf-chart-max') || '0');
    if (maxAge <= minAge) return;
    var vb = (svg.getAttribute('viewBox') || '0 0 700 220').split(/\s+/).map(parseFloat);
    var vbW = vb[2] || 700;
    var ml = 55; // left margin (matches report-charts.js)
    var mr = 15;
    var plotW = vbW - ml - mr;
    var ratio = (state.year - minAge) / (maxAge - minAge);
    var x = ml + ratio * plotW;
    var ns = 'http://www.w3.org/2000/svg';
    var g = document.createElementNS(ns, 'g');
    g.setAttribute('class', 'bf-year-marker');
    var line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', x); line.setAttribute('x2', x);
    line.setAttribute('y1', 15); line.setAttribute('y2', (vb[3] || 220) - 30);
    line.setAttribute('stroke', '#1a1610');
    line.setAttribute('stroke-width', '1.5');
    line.setAttribute('stroke-dasharray', '4,3');
    line.setAttribute('opacity', '0.8');
    g.appendChild(line);
    var tbg = document.createElementNS(ns, 'rect');
    tbg.setAttribute('x', x - 18); tbg.setAttribute('y', 2);
    tbg.setAttribute('width', 36); tbg.setAttribute('height', 14);
    tbg.setAttribute('rx', 3);
    tbg.setAttribute('fill', '#1a1610');
    g.appendChild(tbg);
    var tx = document.createElementNS(ns, 'text');
    tx.setAttribute('x', x); tx.setAttribute('y', 12);
    tx.setAttribute('text-anchor', 'middle');
    tx.setAttribute('fill', '#fff');
    tx.setAttribute('font-size', '9');
    tx.setAttribute('font-family', 'JetBrains Mono,monospace');
    tx.setAttribute('font-weight', '700');
    tx.textContent = state.year;
    g.appendChild(tx);
    svg.appendChild(g);
  }

  // ─────────────────────────────────────────────────────────────────────
  // STICKY BAR BUILDER — injected once into DOM if markup not present.
  // ─────────────────────────────────────────────────────────────────────
  function _buildStickyBar() {
    if (document.getElementById('bf-sticky-bar')) return;
    var bar = document.createElement('div');
    bar.id = 'bf-sticky-bar';
    bar.className = 'bf-sticky-bar no-print';
    var minAge = P.meta.currentAge || 40;
    var maxAge = P.meta.deathAge || 95;
    // i tooltips explicate each control — pedagogical, not decorative.
    var tYear = isFR
      ? '\u00c2ge de r\u00e9f\u00e9rence pour les valeurs affich\u00e9es dans les tableaux (patrimoine, flux, imp\u00f4ts \u00e0 cet \u00e2ge). Un trait vertical marque cet \u00e2ge sur les graphiques.'
      : 'Reference age for values shown in tables (wealth, cash flow, tax at this age). A vertical line marks this age on the charts.';
    var tDollars = isFR
      ? 'R\u00e9els = pouvoir d\'achat en dollars 2026 (inflation d\u00e9duite). Nominaux = dollars futurs bruts, sans ajustement.'
      : 'Real = purchasing power in 2026 dollars (inflation deducted). Nominal = gross future dollars, no adjustment.';
    var tScenario = isFR
      ? 'Prudent (P25) = 25 % des simulations terminent sous ce niveau. M\u00e9dian (P50) = le sc\u00e9nario central. Favorable (P75) = 25 % des simulations terminent au-dessus.'
      : 'Cautious (P25) = 25% of simulations end below this level. Median (P50) = central scenario. Favourable (P75) = 25% of simulations end above.';
    bar.innerHTML =
      '<div class="bf-sticky-inner">' +
        '<div class="bf-group">' +
          '<span class="bf-label">' + (isFR ? 'Ann\u00e9e de r\u00e9f\u00e9rence' : 'Reference year') + '<span class="bf-info" tabindex="0" title="' + tYear + '" aria-label="' + tYear + '">\u24d8</span></span>' +
          '<input id="bf-year-slider" type="range" min="' + minAge + '" max="' + maxAge + '" value="' + state.year + '" step="1" aria-label="' + (isFR ? 'S\u00e9lectionner l\'\u00e2ge' : 'Select age') + '">' +
          '<span id="bf-year-out" class="bf-year-out">' + state.year + (isFR ? ' ans' : ' yrs') + '</span>' +
        '</div>' +
        '<div class="bf-group bf-group-divider">' +
          '<span class="bf-label">' + (isFR ? 'Dollars' : 'Dollars') + '<span class="bf-info" tabindex="0" title="' + tDollars + '" aria-label="' + tDollars + '">\u24d8</span></span>' +
          '<div class="bf-toggle" role="group">' +
            '<button type="button" data-bf-mode-btn="real" class="active">' + (isFR ? 'R\u00e9els' : 'Real') + '</button>' +
            '<button type="button" data-bf-mode-btn="nom">' + (isFR ? 'Nominaux' : 'Nominal') + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="bf-group bf-group-divider">' +
          '<span class="bf-label">' + (isFR ? 'Sc\u00e9nario affich\u00e9' : 'Displayed scenario') + '<span class="bf-info" tabindex="0" title="' + tScenario + '" aria-label="' + tScenario + '">\u24d8</span></span>' +
          '<div class="bf-toggle" role="group">' +
            '<button type="button" data-bf-scen-btn="p25">' + (isFR ? 'Prudent' : 'Cautious') + '</button>' +
            '<button type="button" data-bf-scen-btn="p50" class="active">' + (isFR ? 'M\u00e9dian' : 'Median') + '</button>' +
            '<button type="button" data-bf-scen-btn="p75">' + (isFR ? 'Favorable' : 'Favourable') + '</button>' +
          '</div>' +
        '</div>' +
        '<button type="button" id="bf-reset" class="bf-reset" title="' + (isFR ? 'Remettre tous les contr\u00f4les au d\u00e9faut' : 'Reset all controls to default') + '">' +
          '<span class="bf-reset-icon">\u21bb</span>' +
          '<span class="bf-reset-text">' + (isFR ? 'R\u00e9initialiser' : 'Reset') + '</span>' +
        '</button>' +
      '</div>' +
      '<div class="bf-sticky-hint">' +
        '<span>' + (isFR ? 'Glissez, basculez, survolez \u2014 le rapport r\u00e9agit en direct. Impression: fig\u00e9 sur l\'\u00e9tat courant.' : 'Slide, toggle, hover \u2014 the report updates live. Print freezes the current state.') + '</span>' +
        '<span id="bf-scenario-badge" class="bf-scenario-badge">' + (isFR ? 'Sc\u00e9nario m\u00e9dian (P50) \u2014 la trajectoire centrale' : 'Median scenario (P50) \u2014 central trajectory') + '</span>' +
      '</div>';
    document.body.insertBefore(bar, document.body.firstChild);
  }

  // Scenario badge copywriting — updates based on toggle state
  function _updateScenarioBadge() {
    var badge = document.getElementById('bf-scenario-badge');
    if (!badge) return;
    var txt;
    if (state.scenario === 'p25') txt = isFR ? 'Sc\u00e9nario prudent (P25) \u2014 25 % des simulations terminent sous ce niveau' : 'Cautious scenario (P25) \u2014 25% of simulations end below this level';
    else if (state.scenario === 'p75') txt = isFR ? 'Sc\u00e9nario favorable (P75) \u2014 25 % des simulations terminent au-dessus' : 'Favourable scenario (P75) \u2014 25% of simulations end above';
    else txt = isFR ? 'Sc\u00e9nario m\u00e9dian (P50) \u2014 la trajectoire centrale' : 'Median scenario (P50) \u2014 central trajectory';
    badge.textContent = txt;
    badge.setAttribute('data-bf-scen', state.scenario);
  }

  // ─────────────────────────────────────────────────────────────────────
  // CONTROL BINDINGS
  // ─────────────────────────────────────────────────────────────────────
  function _bindControls() {
    var slider = document.getElementById('bf-year-slider');
    if (slider) {
      slider.addEventListener('input', function() {
        state.year = parseInt(this.value, 10);
        var out = document.getElementById('bf-year-out');
        if (out) out.textContent = state.year + (isFR ? ' ans' : ' yrs');
        updateLiveValues();
      });
    }
    var modeBtns = document.querySelectorAll('[data-bf-mode-btn]');
    for (var i = 0; i < modeBtns.length; i++) {
      modeBtns[i].addEventListener('click', function() {
        state.mode = this.getAttribute('data-bf-mode-btn');
        for (var j = 0; j < modeBtns.length; j++) modeBtns[j].classList.toggle('active', modeBtns[j] === this);
        updateLiveValues();
      });
    }
    var scenBtns = document.querySelectorAll('[data-bf-scen-btn]');
    for (var k = 0; k < scenBtns.length; k++) {
      scenBtns[k].addEventListener('click', function() {
        state.scenario = this.getAttribute('data-bf-scen-btn');
        for (var m = 0; m < scenBtns.length; m++) scenBtns[m].classList.toggle('active', scenBtns[m] === this);
        updateLiveValues();
      });
    }
    var reset = document.getElementById('bf-reset');
    if (reset) {
      reset.addEventListener('click', function() {
        state.year = P.meta.retAge || 65;
        state.mode = 'real';
        state.scenario = 'p50';
        state.actions = {};
        if (slider) slider.value = state.year;
        var yo = document.getElementById('bf-year-out');
        if (yo) yo.textContent = state.year + (isFR ? ' ans' : ' yrs');
        var mb = document.querySelectorAll('[data-bf-mode-btn]');
        for (var a = 0; a < mb.length; a++) mb[a].classList.toggle('active', mb[a].getAttribute('data-bf-mode-btn') === 'real');
        var sb = document.querySelectorAll('[data-bf-scen-btn]');
        for (var b = 0; b < sb.length; b++) sb[b].classList.toggle('active', sb[b].getAttribute('data-bf-scen-btn') === 'p50');
        // Reset action toggles
        var actionCards = document.querySelectorAll('.reco-card[data-bf-action-id]');
        for (var c = 0; c < actionCards.length; c++) {
          actionCards[c].classList.remove('bf-action-active');
          var btn = actionCards[c].querySelector('.bf-action-toggle');
          if (btn) btn.textContent = isFR ? 'Projeter l\'effet' : 'Project effect';
        }
        updateLiveValues();
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // ACTION TOGGLE — each reco-card can project a +$ delta on baseline
  // ─────────────────────────────────────────────────────────────────────
  function _bindActionToggles() {
    var cards = document.querySelectorAll('.reco-card[data-bf-action-id]');
    for (var i = 0; i < cards.length; i++) {
      (function(card) {
        var impact = parseFloat(card.getAttribute('data-bf-action-impact') || '0');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'bf-action-toggle no-print';
        btn.textContent = isFR ? 'Projeter l\'effet' : 'Project effect';
        btn.addEventListener('click', function() {
          var active = card.classList.toggle('bf-action-active');
          state.actions[card.getAttribute('data-bf-action-id')] = active;
          btn.textContent = active
            ? (isFR ? 'Effet projet\u00e9 \u2713' : 'Effect projected \u2713')
            : (isFR ? 'Projeter l\'effet' : 'Project effect');
          // Visual marker — can be extended to redraw deltas globally
          var out = card.querySelector('.bf-action-delta');
          if (!out) {
            out = document.createElement('div');
            out.className = 'bf-action-delta no-print';
            card.appendChild(out);
          }
          out.innerHTML = active && impact
            ? (isFR ? 'Impact projet\u00e9: <strong>' : 'Projected impact: <strong>') + fmtCompact(impact) + '</strong> ' + (isFR ? 'sur le patrimoine final' : 'on final wealth')
            : '';
        });
        card.appendChild(btn);
      })(cards[i]);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // YEAR DRILLDOWN MODAL — click any year on the fan chart or cashflow row
  // to open a modal with that year's full breakdown (income sources,
  // withdrawals, taxes, balances). Pulls from medRevData[age]. Read-only.
  // ─────────────────────────────────────────────────────────────────────
  var _drillModal = null;
  function _ensureDrillModal() {
    if (_drillModal) return _drillModal;
    _drillModal = document.createElement('div');
    _drillModal.className = 'bf-drilldown-modal no-print';
    _drillModal.innerHTML = '<div class="bf-drilldown-backdrop"></div>' +
      '<div class="bf-drilldown-card" role="dialog" aria-modal="true">' +
        '<button type="button" class="bf-drilldown-close" aria-label="' + (isFR ? 'Fermer' : 'Close') + '">×</button>' +
        '<div class="bf-drilldown-header">' +
          '<div class="bf-drilldown-title"></div>' +
          '<div class="bf-drilldown-subtitle"></div>' +
        '</div>' +
        '<div class="bf-drilldown-body"></div>' +
      '</div>';
    document.body.appendChild(_drillModal);
    _drillModal.querySelector('.bf-drilldown-close').addEventListener('click', _closeDrill);
    _drillModal.querySelector('.bf-drilldown-backdrop').addEventListener('click', _closeDrill);
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') _closeDrill(); });
    return _drillModal;
  }
  function _closeDrill() { if (_drillModal) _drillModal.classList.remove('visible'); }
  function _openDrillForAge(age) {
    var rev = (P.medRevData || []).find(function(r) { return r.age === age; });
    var pdRow = (P.pD || []).find(function(r) { return r.age === age; });
    if (!rev && !pdRow) return;
    var modal = _ensureDrillModal();
    var fM = function(v) { return v && isFinite(v) && v !== 0 ? fmtCompact(v) : '—'; };
    var phase = age < (P.meta.retAge || 65)
      ? (isFR ? 'phase d\'accumulation' : 'accumulation phase')
      : (isFR ? 'phase de décaissement' : 'drawdown phase');
    modal.querySelector('.bf-drilldown-title').textContent = (isFR ? 'Année ' : 'Year ') + age + (isFR ? ' ans' : ' yrs');
    modal.querySelector('.bf-drilldown-subtitle').textContent = phase + ' · ' + (P.meta.clientName || '');

    var body = modal.querySelector('.bf-drilldown-body');
    var sections = '';
    // Income sources
    if (rev) {
      sections += '<div class="bf-drill-section"><div class="bf-drill-section-title">' + (isFR ? 'Revenus' : 'Income sources') + '</div><table class="bf-drill-table">';
      sections += '<tr><td>' + (isFR ? 'RRQ/RPC' : 'CPP/QPP') + '</td><td>' + fM(rev.rrq) + '</td></tr>';
      sections += '<tr><td>' + (isFR ? 'PSV' : 'OAS') + '</td><td>' + fM(rev.psv) + '</td></tr>';
      if (rev.srg || rev.gis) sections += '<tr><td>' + (isFR ? 'SRG' : 'GIS') + '</td><td>' + fM(rev.srg || rev.gis) + '</td></tr>';
      if (rev.pen) sections += '<tr><td>' + (isFR ? 'Pension' : 'Pension') + '</td><td>' + fM(rev.pen) + '</td></tr>';
      if (rev.sal) sections += '<tr><td>' + (isFR ? 'Salaire' : 'Salary') + '</td><td>' + fM(rev.sal) + '</td></tr>';
      sections += '</table></div>';

      // Withdrawals
      var hasW = rev.wFromRR || rev.wFromTF || rev.wFromNR;
      if (hasW) {
        sections += '<div class="bf-drill-section"><div class="bf-drill-section-title">' + (isFR ? 'Retraits' : 'Withdrawals') + '</div><table class="bf-drill-table">';
        if (rev.wFromRR) sections += '<tr><td>REER/RRSP</td><td>' + fM(rev.wFromRR) + '</td></tr>';
        if (rev.wFromTF) sections += '<tr><td>CELI/TFSA</td><td>' + fM(rev.wFromTF) + '</td></tr>';
        if (rev.wFromNR) sections += '<tr><td>' + (isFR ? 'Non-enregistré' : 'Non-registered') + '</td><td>' + fM(rev.wFromNR) + '</td></tr>';
        sections += '</table></div>';
      }
      // Tax + spending
      sections += '<div class="bf-drill-section"><div class="bf-drill-section-title">' + (isFR ? 'Sortie' : 'Outflows') + '</div><table class="bf-drill-table">';
      sections += '<tr><td>' + (isFR ? 'Impôt' : 'Tax') + '</td><td style="color:#cc4444">' + fM(rev.tax) + '</td></tr>';
      if (rev.spend) sections += '<tr><td>' + (isFR ? 'Dépenses' : 'Spending') + '</td><td>' + fM(rev.spend) + '</td></tr>';
      if (rev.taxInc) sections += '<tr><td>' + (isFR ? 'Revenu imposable' : 'Taxable income') + '</td><td>' + fM(rev.taxInc) + '</td></tr>';
      sections += '</table></div>';
    }
    // Balances at year end (from pD)
    if (pdRow) {
      sections += '<div class="bf-drill-section bf-drill-section-full"><div class="bf-drill-section-title">' + (isFR ? 'Soldes en fin d\'année' : 'Year-end balances') + '</div><table class="bf-drill-table">';
      sections += '<tr><td>' + (isFR ? 'Patrimoine total (médian)' : 'Total wealth (median)') + '</td><td><strong>' + fM(pdRow.mp_total || pdRow.p50) + '</strong></td></tr>';
      if (pdRow.mp_rr != null) sections += '<tr><td>REER/RRSP</td><td>' + fM(pdRow.mp_rr) + '</td></tr>';
      if (pdRow.mp_tf != null) sections += '<tr><td>CELI/TFSA</td><td>' + fM(pdRow.mp_tf) + '</td></tr>';
      if (pdRow.mp_nr != null) sections += '<tr><td>' + (isFR ? 'Non-enregistré' : 'Non-registered') + '</td><td>' + fM(pdRow.mp_nr) + '</td></tr>';
      if (pdRow.p25 != null) sections += '<tr><td style="color:#888">' + (isFR ? 'Scénario prudent (P25)' : 'Cautious scenario (P25)') + '</td><td style="color:#888">' + fM(pdRow.p25) + '</td></tr>';
      if (pdRow.p75 != null) sections += '<tr><td style="color:#888">' + (isFR ? 'Scénario favorable (P75)' : 'Favourable scenario (P75)') + '</td><td style="color:#888">' + fM(pdRow.p75) + '</td></tr>';
      sections += '</table></div>';
    }
    body.innerHTML = sections || '<div style="color:#888;font-style:italic">' + (isFR ? 'Aucune donnée disponible pour cette année.' : 'No data available for this year.') + '</div>';
    modal.classList.add('visible');
  }

  function _wireDrilldownTriggers() {
    // 1. Click on fan chart at any X position → derive year and open modal
    document.querySelectorAll('svg[data-bf-chart="fan"], svg[data-bf-chart="area"]').forEach(function(svg) {
      svg.style.cursor = 'pointer';
      svg.addEventListener('click', function(e) {
        var pD = P.pD || [];
        if (!pD.length) return;
        var rect = svg.getBoundingClientRect();
        var ml = 55, mr = 15;
        var vbStr = (svg.getAttribute('viewBox') || '0 0 700 220').split(/\s+/);
        var vbW = parseFloat(vbStr[2]) || 700;
        var xViewBox = ((e.clientX - rect.left) / rect.width) * vbW;
        var xRatio = (xViewBox - ml) / (vbW - ml - mr);
        if (xRatio < 0 || xRatio > 1) return;
        var idx = Math.round(xRatio * (pD.length - 1));
        idx = Math.max(0, Math.min(pD.length - 1, idx));
        var age = pD[idx].age;
        if (age != null) _openDrillForAge(age);
      });
    });
    // 2. Click on any data-bf-age row in tables
    document.querySelectorAll('tr[data-bf-age]').forEach(function(row) {
      row.style.cursor = 'pointer';
      row.addEventListener('click', function() {
        var age = parseInt(row.getAttribute('data-bf-age'), 10);
        if (!isNaN(age)) _openDrillForAge(age);
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // STYLE INJECTION — drilldown modal, print profiles, typography polish.
  // Injected at boot so report-interactive.js carries the visual layer for
  // the dynamic modal + the print-profile toggles + typography enhancements.
  // Avoids touching the static CSS list in report-pdf.js (which other tooling
  // re-formats heavily).
  // ─────────────────────────────────────────────────────────────────────
  function _injectRuntimeStyles() {
    if (document.getElementById('bf-runtime-styles')) return;
    var style = document.createElement('style');
    style.id = 'bf-runtime-styles';
    style.textContent = [
      // ── Drilldown modal
      '.bf-drilldown-modal{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;font-family:Inter,sans-serif}',
      '.bf-drilldown-modal.visible{display:flex}',
      '.bf-drilldown-backdrop{position:absolute;inset:0;background:rgba(26,39,68,0.55);backdrop-filter:blur(2px)}',
      '.bf-drilldown-card{position:relative;background:#fff;border-radius:10px;max-width:580px;width:90%;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.35);border-top:4px solid #c4944a}',
      '.bf-drilldown-close{position:absolute;top:10px;right:14px;background:transparent;border:none;font-size:24px;color:#888;cursor:pointer;line-height:1;width:32px;height:32px;border-radius:16px;transition:background 0.15s}',
      '.bf-drilldown-close:hover{background:#f0ece4;color:#1a1610}',
      '.bf-drilldown-header{padding:22px 28px 14px;border-bottom:1px solid #e8e0d4}',
      '.bf-drilldown-title{font-family:"Playfair Display",Georgia,serif;font-size:22px;font-weight:700;color:#c4944a}',
      '.bf-drilldown-subtitle{font-size:11px;color:#888;letter-spacing:0.4px;margin-top:4px;text-transform:uppercase;font-weight:600}',
      '.bf-drilldown-body{padding:18px 28px 24px;display:grid;grid-template-columns:1fr 1fr;gap:18px}',
      '.bf-drill-section-full{grid-column:1/-1}',
      '.bf-drill-section-title{font-size:10px;font-weight:700;color:#c4944a;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #f0ece4}',
      '.bf-drill-table{width:100%;border-collapse:collapse;font-size:11px}',
      '.bf-drill-table tr td:first-child{padding:5px 4px;color:#444;border-bottom:1px solid #f5f1ea}',
      '.bf-drill-table tr td:last-child{padding:5px 4px;text-align:right;font-family:"JetBrains Mono",monospace;font-weight:600;color:#1a1610;border-bottom:1px solid #f5f1ea}',
      '@media (max-width:600px){.bf-drilldown-body{grid-template-columns:1fr}}',
      '@media print{.bf-drilldown-modal{display:none !important}}',
      // ── Print profile toggle (executive vs detailed)
      // Default: detailed view (everything visible). When body has class
      // .bf-print-exec, hide deep-dive sections and the appendices for a
      // condensed advisor-style print. Toggle via the print profile chooser.
      '.bf-print-toggle{position:fixed;top:14px;right:14px;z-index:9990;background:#fff;border:1px solid #e8e0d4;border-radius:24px;padding:5px;display:flex;gap:4px;box-shadow:0 2px 12px rgba(0,0,0,0.08);font-family:Inter,sans-serif;font-size:11px}',
      '.bf-print-toggle button{background:transparent;border:none;padding:5px 12px;border-radius:18px;cursor:pointer;font-weight:600;color:#888;letter-spacing:0.3px;transition:all 0.15s}',
      '.bf-print-toggle button.active{background:#252d39;color:#d2a764}',
      '.bf-print-toggle button:hover:not(.active){background:#f0ece4;color:#1a1610}',
      '@media print{.bf-print-toggle{display:none !important}}',
      // Executive view — hide deep-dive sections, keep verdict + action.
      // Hide list (sections that disappear in exec view):
      '.bf-print-exec #sec-profile,',
      '.bf-print-exec #sec-family,',
      '.bf-print-exec #sec-real-estate,',
      '.bf-print-exec #sec-rsu,',
      '.bf-print-exec #sec-debt,',
      '.bf-print-exec #sec-corp,',
      '.bf-print-exec #sec-gis,',
      '.bf-print-exec #sec-meltdown,',
      '.bf-print-exec #sec-projection,',
      '.bf-print-exec #sec-histogram,',
      '.bf-print-exec #sec-revenue,',
      '.bf-print-exec #sec-tax,',
      '.bf-print-exec #sec-sensitivity,',
      '.bf-print-exec #sec-strategies,',
      '.bf-print-exec #sec-risk,',
      '.bf-print-exec #sec-goals,',
      '.bf-print-exec #sec-assumptions,',
      '.bf-print-exec #sec-glossary,',
      '.bf-print-exec #bf-whatif,',
      '.bf-print-exec .whatif-teaser-link,',
      '.bf-print-exec .bf-method-foot{display:none !important}',
      // Banner injected via JS in _buildPrintToggle — class .bf-exec-banner
      '.bf-exec-banner{display:none;position:sticky;top:0;z-index:99;background:#fdf9ee;border-bottom:2px solid #d2a764;color:#7a4a00;text-align:center;padding:8px 16px;font-family:Inter,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.3px}',
      '.bf-print-exec .bf-exec-banner{display:block}',
      // ── Sticky control bar (year slider, dollar mode, scenario toggle, reset)
      '.bf-sticky-bar{position:sticky;top:0;z-index:90;background:#fff;border-bottom:1px solid #e8e0d4;padding:10px 16px;box-shadow:0 2px 8px rgba(0,0,0,0.04);font-family:Inter,sans-serif;font-size:11px;color:#1a1610}',
      '.bf-sticky-inner{display:flex;align-items:center;gap:14px;flex-wrap:wrap;max-width:820px;margin:0 auto}',
      '.bf-group{display:flex;align-items:center;gap:8px}',
      '.bf-group-divider{padding-left:14px;border-left:1px solid #e8e0d4}',
      '.bf-label{font-size:10px;font-weight:700;color:#706558;text-transform:uppercase;letter-spacing:0.6px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap}',
      '.bf-info{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;color:#bbb;cursor:help;font-size:11px;font-style:normal;margin-left:2px}',
      '.bf-info:hover,.bf-info:focus{color:#d2a764;outline:none}',
      '.bf-toggle{display:inline-flex;background:#f5f8fc;border:1px solid #e8e0d4;border-radius:14px;padding:2px;gap:2px}',
      '.bf-toggle button{background:transparent;border:none;padding:4px 10px;border-radius:12px;cursor:pointer;font-size:10.5px;font-weight:600;color:#888;letter-spacing:0.3px;font-family:Inter,sans-serif;transition:all 0.15s}',
      '.bf-toggle button.active{background:#252d39;color:#d2a764}',
      '.bf-toggle button:hover:not(.active){background:#fff;color:#1a1610}',
      '#bf-year-slider{width:120px;accent-color:#d2a764;vertical-align:middle}',
      '#bf-year-out{font-family:"JetBrains Mono",monospace;font-size:11px;font-weight:700;color:#252d39;min-width:48px;display:inline-block}',
      '.bf-reset{background:transparent;border:1px solid #e8e0d4;border-radius:14px;padding:4px 10px;cursor:pointer;font-size:10.5px;font-weight:600;color:#706558;display:inline-flex;align-items:center;gap:4px;font-family:Inter,sans-serif;transition:all 0.15s;margin-left:auto}',
      '.bf-reset:hover{background:#fdf9ee;color:#252d39;border-color:#d2a764}',
      '.bf-reset-icon{font-size:13px}',
      '.bf-sticky-hint{max-width:820px;margin:6px auto 0;display:flex;justify-content:space-between;align-items:center;font-size:9.5px;color:#9aa0a6;font-style:italic;flex-wrap:wrap;gap:8px}',
      '.bf-scenario-badge{font-style:normal;font-weight:600;color:#252d39;background:#f5f8fc;padding:2px 8px;border-radius:10px;font-size:9px;letter-spacing:0.3px}',
      '.bf-scenario-badge[data-bf-scen="p25"]{background:#fdf3e0;color:#7a4a00}',
      '.bf-scenario-badge[data-bf-scen="p75"]{background:#e8f3eb;color:#2a8c46}',
      '@media print{.bf-sticky-bar,.bf-sticky-hint{display:none !important}}',
      '@media (max-width:700px){.bf-sticky-inner{font-size:10px}.bf-group-divider{padding-left:8px;border-left:none}}',
      // ── Chart hover tooltip (fan, area, histogram, tornado, donut)
      '.bf-tooltip{position:absolute;z-index:99998;background:#252d39;color:#faf8f4;padding:8px 12px;border-radius:5px;font-family:Inter,sans-serif;font-size:11px;line-height:1.5;max-width:240px;box-shadow:0 4px 16px rgba(0,0,0,0.3);pointer-events:none;opacity:0;transition:opacity 0.1s;border:1px solid #d2a764}',
      '.bf-tooltip.visible{opacity:1}',
      '.bf-tooltip-title{font-weight:700;color:#d2a764;font-size:10.5px;letter-spacing:0.5px;margin-bottom:5px;padding-bottom:4px;border-bottom:1px solid rgba(210,167,100,0.3);text-transform:uppercase}',
      '.bf-tooltip-row{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:2px 0}',
      '.bf-tooltip-key{color:#9aabc7;font-size:10.5px}',
      '.bf-tooltip-val{color:#faf8f4;font-family:"JetBrains Mono",monospace;font-weight:700;font-size:10.5px}',
      '.bf-chart-wrap{position:relative}',
      '@media print{.bf-tooltip{display:none !important}}',
      // ── Typography polish — widow/orphan + heading hyphenation guards
      'h1,h2,h3,.cover-title,.cover-client{orphans:3;widows:3;-webkit-hyphens:none;hyphens:none;page-break-after:avoid}',
      '.narr,p,.callout,.kpi-l{orphans:2;widows:2;-webkit-hyphens:auto;hyphens:auto;-webkit-hyphenate-limit-chars:7 3 3;hyphenate-limit-chars:7 3 3}',
      'tr,.cd,.kpi,.callout,.reco-card,.chart-block{break-inside:avoid;page-break-inside:avoid}',
      // First-letter drop cap on the advisor letter (subtle editorial touch).
      // The renderer uses class="sec-letter" on the wrapper; target both forms
      // for resilience against future class renames.
      '#sec-letter p:first-of-type::first-letter,.sec-letter p:first-of-type::first-letter,.advisor-letter p:first-of-type::first-letter{font-family:"Playfair Display",Georgia,serif;font-size:42px;font-weight:700;color:#c4944a;float:left;line-height:0.85;margin:6px 8px 0 0}',
      '@media print{#sec-letter p:first-of-type::first-letter,.sec-letter p:first-of-type::first-letter,.advisor-letter p:first-of-type::first-letter{color:#252d39}}',
      // ── Glossary appendix (alphabetical bilingual list, 2-column layout)
      '.glossary-appendix{margin-top:12px;column-count:2;column-gap:24px;column-rule:1px solid #e8e0d4}',
      '@media (max-width:700px){.glossary-appendix{column-count:1}}',
      '.glossary-list{margin:0}',
      '.glossary-term{font-weight:700;color:#c4944a;font-size:11px;margin-top:8px;break-inside:avoid;page-break-inside:avoid}',
      '.glossary-term:first-child{margin-top:0}',
      '.glossary-def{margin:2px 0 0;font-size:10.5px;color:#444;line-height:1.55;break-inside:avoid;page-break-inside:avoid}',
      // ── Inline glossary terms (dotted underline anchors)
      '.bf-term{border-bottom:1px dotted #c4944a;cursor:help;color:inherit}',
      '.bf-term:hover{background:#fdf9ee;color:#c4944a}',
      '.bf-glossary-tip{position:absolute;z-index:99999;background:#252d39;color:#faf8f4;padding:10px 14px;border-radius:6px;font-size:11.5px;line-height:1.55;max-width:300px;box-shadow:0 6px 24px rgba(0,0,0,0.25);pointer-events:none;opacity:0;transition:opacity 0.12s;border:1px solid #c4944a}',
      '.bf-glossary-tip.visible{opacity:1}',
      '.bf-glossary-tip-label{font-weight:700;color:#c4944a;font-size:11px;letter-spacing:0.3px;margin-bottom:4px;text-transform:uppercase}',
      '.bf-glossary-tip-def{color:#e8e0d4;font-weight:400}',
      '@media print{.bf-glossary-tip{display:none !important}.bf-term{border-bottom:none;cursor:auto}}',
      // ── Methodology footer (collapsible "How is this calculated?")
      '.bf-method-foot{margin:14px 0 4px;border-top:1px dashed #e8e0d4;padding-top:8px;font-family:Inter,sans-serif}',
      '.bf-method-foot summary{font-size:10px;color:#888;cursor:pointer;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;outline:none;list-style:none;padding:2px 0}',
      '.bf-method-foot summary::-webkit-details-marker{display:none}',
      '.bf-method-foot summary::before{content:"+";display:inline-block;width:14px;font-weight:700;color:#c4944a}',
      '.bf-method-foot[open] summary::before{content:"\u2212"}',
      '.bf-method-foot summary:hover{color:#c4944a}',
      '.bf-method-foot-body{font-size:10.5px;color:#555;line-height:1.6;padding:8px 12px 8px 12px;border-left:2px solid #c4944a;background:#fdfbf5;border-radius:0 4px 4px 0;margin-top:6px}',
      '@media print{.bf-method-foot{display:none}}', // hidden in detailed print (kept clean)
      // ── What-If simulator panel (12 sliders + presets + save & compare)
      '.bf-whatif-banner{background:#fdf9ee;border:1px solid #c4944a;border-left:4px solid #c4944a;padding:12px 16px;margin:10px 0;border-radius:6px;font-size:11px;line-height:1.7;color:#4a3f33;font-family:Inter,sans-serif}',
      '.bf-whatif-banner strong{color:#c4944a}',
      '.bf-whatif-panel{background:#fdfbf7;border:1px solid #e8e0d4;border-radius:8px;padding:14px;margin:12px 0;font-family:Inter,sans-serif}',
      '.bf-whatif-presets{margin-bottom:14px;padding:10px 12px;background:#f5f8fc;border-radius:6px;border:1px solid #dbe4f0}',
      '.bf-whatif-presets-label{font-size:10px;font-weight:700;color:#4680c0;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px}',
      '.bf-whatif-presets-buttons{display:flex;flex-wrap:wrap;gap:6px}',
      '.bf-whatif-preset{display:inline-flex;align-items:center;gap:5px;background:#fff;border:1px solid #e8e0d4;border-radius:14px;padding:5px 11px;font-size:10.5px;font-weight:600;color:#4a3f33;cursor:pointer;transition:all 0.15s;font-family:Inter,sans-serif}',
      '.bf-whatif-preset:hover{background:#c4944a;color:#fff;border-color:#c4944a}',
      '.bf-whatif-preset.active{background:#c4944a;color:#fff;border-color:#c4944a;box-shadow:0 1px 3px rgba(196,154,26,0.4)}',
      '.bf-whatif-preset-icon{font-family:"JetBrains Mono",monospace;font-weight:700;font-size:11px}',
      '.bf-whatif-controls{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}',
      '.bf-whatif-group{padding:10px;background:#fff;border:1px solid #e8e0d4;border-radius:6px}',
      '.bf-whatif-group-header{display:flex;align-items:center;gap:6px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #e8e0d4}',
      '.bf-whatif-group-icon{font-family:"JetBrains Mono",monospace;font-size:13px;color:#c4944a;font-weight:700}',
      '.bf-whatif-group-label{font-size:10px;font-weight:700;color:#c4944a;text-transform:uppercase;letter-spacing:0.7px}',
      '.bf-whatif-row{display:flex;align-items:center;gap:10px;margin-bottom:6px}',
      '.bf-whatif-label{font-size:10.5px;color:#4a3f33;font-weight:600;min-width:140px;flex-shrink:0}',
      '.bf-whatif-slider{flex:1;accent-color:#c4944a}',
      '.bf-whatif-val{font-family:"JetBrains Mono",monospace;font-size:11px;font-weight:700;color:#c4944a;min-width:70px;text-align:right}',
      '.bf-whatif-actions{display:flex;align-items:center;gap:10px;margin:12px 0;padding-top:10px;border-top:1px solid #e8e0d4;flex-wrap:wrap}',
      '.bf-whatif-btn{background:#c4944a;color:#fff;border:none;padding:8px 16px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;text-transform:uppercase;letter-spacing:0.5px;font-family:Inter,sans-serif}',
      '.bf-whatif-btn:hover:not(:disabled){background:#b89830}',
      '.bf-whatif-btn:disabled{background:#ccc;cursor:not-allowed}',
      '.bf-whatif-btn-secondary{background:transparent;color:#c4944a;border:1px solid #c4944a}',
      '.bf-whatif-btn-secondary:hover:not(:disabled){background:#fdf9ee}',
      '.bf-whatif-status{font-size:10.5px;color:#706558;font-style:italic;margin-left:auto;font-family:Inter,sans-serif}',
      '.bf-whatif-status.running{color:#c4944a}',
      '.bf-whatif-status.done{color:#2a8c46}',
      '.bf-whatif-status.error{color:#cc4444}',
      '.bf-whatif-summary{font-size:11px;color:#4a3f33;margin:8px 0 10px;padding:8px 12px;background:#f9f7f2;border-radius:4px;line-height:1.55}',
      '.bf-whatif-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}',
      '.bf-whatif-kpis-12{grid-template-columns:repeat(4,1fr)}',
      '@media (max-width:900px){.bf-whatif-kpis,.bf-whatif-kpis-12{grid-template-columns:repeat(3,1fr)}}',
      '@media (max-width:600px){.bf-whatif-kpis,.bf-whatif-kpis-12{grid-template-columns:repeat(2,1fr)}}',
      '.bf-whatif-kpi{background:#fff;border:1px solid #e8e0d4;border-radius:6px;padding:10px;text-align:center}',
      '.bf-whatif-kpi-label{font-size:9px;color:#706558;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;font-weight:600}',
      '.bf-whatif-kpi-value{font-family:"JetBrains Mono",monospace;font-size:16px;font-weight:700;color:#1a1610;margin-bottom:3px}',
      '.bf-whatif-kpi-delta{font-family:"JetBrains Mono",monospace;font-size:11px;font-weight:600}',
      '.bf-whatif-results:empty{display:none}',
      '.bf-whatif-compare{margin-top:14px}',
      '.bf-whatif-compare:empty{display:none}',
      '.bf-whatif-compare-title{font-size:11px;font-weight:700;color:#c4944a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px}',
      '.bf-whatif-compare-table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e8e0d4;border-radius:6px;overflow:hidden;font-size:10.5px}',
      '.bf-whatif-compare-table th{background:#f9f7f2;padding:8px 10px;text-align:left;font-weight:700;color:#4a3f33;border-bottom:1px solid #e8e0d4;font-size:10px;text-transform:uppercase;letter-spacing:0.3px}',
      '.bf-whatif-compare-table th.bf-whatif-compare-base{background:#fdf9ee;color:#c4944a}',
      '.bf-whatif-compare-table td{padding:7px 10px;border-bottom:1px solid #f0ece4}',
      '.bf-whatif-compare-table tr:last-child td{border-bottom:none}',
      '.bf-whatif-compare-metric{font-weight:600;color:#4a3f33}',
      '.bf-whatif-compare-val{font-family:"JetBrains Mono",monospace;font-weight:600;color:#1a1610}',
      '.bf-whatif-compare-hint{font-size:9.5px;color:#888;margin-top:6px;font-style:italic}',
      '@media print{.bf-whatif-panel,.bf-whatif-banner{display:none}}',
      ''
    ].join('\n');
    document.head.appendChild(style);
  }

  // ─────────────────────────────────────────────────────────────────────
  // PRINT PROFILE TOGGLE — executive (terse) vs detailed (full) print views
  // ─────────────────────────────────────────────────────────────────────
  function _buildPrintToggle() {
    if (document.getElementById('bf-print-toggle')) return;
    // Inject the visual feedback banner first (hidden until exec mode)
    if (!document.querySelector('.bf-exec-banner')) {
      var banner = document.createElement('div');
      banner.className = 'bf-exec-banner no-print';
      banner.textContent = isFR
        ? 'Vue exécutive active — sections détaillées masquées (cliquer Détaillé pour les revoir)'
        : 'Executive view active — detailed sections hidden (click Detailed to restore)';
      document.body.insertBefore(banner, document.body.firstChild);
    }
    var bar = document.createElement('div');
    bar.id = 'bf-print-toggle';
    bar.className = 'bf-print-toggle no-print';
    bar.innerHTML = '<button type="button" data-bf-print="detailed" class="active" title="' + (isFR ? 'Vue complète — toutes les sections' : 'Full view — all sections') + '">' + (isFR ? 'Détaillé' : 'Detailed') + '</button>' +
      '<button type="button" data-bf-print="exec" title="' + (isFR ? 'Vue exécutive — sections clés seulement, idéal pour le conseiller' : 'Executive view — key sections only, advisor-style') + '">' + (isFR ? 'Exécutif' : 'Executive') + '</button>';
    document.body.appendChild(bar);
    var btns = bar.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function() {
        var mode = this.getAttribute('data-bf-print');
        for (var j = 0; j < btns.length; j++) btns[j].classList.toggle('active', btns[j] === this);
        document.body.classList.toggle('bf-print-exec', mode === 'exec');
        // Scroll to top so user sees the banner + cover when switching modes
        if (mode === 'exec') window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // BOOT
  // ─────────────────────────────────────────────────────────────────────
  function boot() {
    _injectRuntimeStyles();
    _buildStickyBar();
    _buildPrintToggle();
    _bindControls();
    _bindActionToggles();
    _wireDrilldownTriggers();
    updateLiveValues();
    // Freeze state on print — capture current values into static text
    window.addEventListener('beforeprint', function() { document.body.classList.add('bf-printing'); });
    window.addEventListener('afterprint', function() { document.body.classList.remove('bf-printing'); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Expose for debugging + external control
  window.BFInteractive = {
    state: state,
    update: updateLiveValues,
    setYear: function(y) { state.year = y; updateLiveValues(); },
    setMode: function(m) { state.mode = m; updateLiveValues(); },
    setScenario: function(s) { state.scenario = s; updateLiveValues(); }
  };
})();
