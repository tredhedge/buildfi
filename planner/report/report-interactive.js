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
    // Sprint 1.5 — Top sticky bar shrunk. Year + scenario controls
    // migrated to per-chart slicers (income year slicer + MC fan
    // scenario chips). Top bar keeps only the GLOBAL controls: dollar
    // mode (Real/Nominal — affects every dollar figure in the report)
    // + reset. The previous implementation implied global control over
    // the year + scenario but only ~6 KPIs actually responded — false
    // promise of interactivity. Now the controls live where they work.
    // Year slider + scenario badge are still emitted (hidden) so legacy
    // updateLiveValues() listeners don't break.
    bar.innerHTML =
      '<div class="bf-sticky-inner">' +
        '<div class="bf-group">' +
          '<span class="bf-label">' + (isFR ? 'Dollars' : 'Dollars') + '<span class="bf-info" tabindex="0" title="' + tDollars + '" aria-label="' + tDollars + '">\u24d8</span></span>' +
          '<div class="bf-toggle" role="group">' +
            '<button type="button" data-bf-mode-btn="real" class="active">' + (isFR ? 'R\u00e9els' : 'Real') + '</button>' +
            '<button type="button" data-bf-mode-btn="nom">' + (isFR ? 'Nominaux' : 'Nominal') + '</button>' +
          '</div>' +
        '</div>' +
        '<button type="button" id="bf-reset" class="bf-reset" title="' + (isFR ? 'Remettre les contr\u00f4les au d\u00e9faut' : 'Reset controls to default') + '">' +
          '<span class="bf-reset-icon">\u21bb</span>' +
          '<span class="bf-reset-text">' + (isFR ? 'R\u00e9initialiser' : 'Reset') + '</span>' +
        '</button>' +
      '</div>' +
      '<div class="bf-sticky-hint">' +
        '<span>' + (isFR
          ? 'Le bouton Dollars affecte tout le rapport. Les contr\u00f4les d\'ann\u00e9e et de sc\u00e9nario apparaissent sous chaque graphique concern\u00e9.'
          : 'The Dollars toggle affects the whole report. Year and scenario controls appear under each chart that supports them.') + '</span>' +
      '</div>' +
      // Hidden carriers — keep the legacy DOM hooks alive without showing
      // them, so updateLiveValues() / scenario_badge listeners don't break.
      '<input id="bf-year-slider" type="hidden" value="' + state.year + '" />' +
      '<span id="bf-year-out" style="display:none">' + state.year + '</span>' +
      '<span id="bf-scenario-badge" style="display:none"></span>';
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
      // Click affordance hint: a small "Cliquez pour le détail" / "Click for
      // details" badge floats over the top-right of the chart on first
      // appearance, then fades after 6 seconds. Drives discoverability of
      // the year drilldown without permanently cluttering the chart.
      var wrap = svg.parentElement;
      if (wrap && !wrap.querySelector('.bf-click-hint')) {
        var hint = document.createElement('div');
        hint.className = 'bf-click-hint no-print';
        hint.textContent = isFR ? 'Cliquez sur une année ↓' : 'Click on a year ↓';
        wrap.style.position = wrap.style.position || 'relative';
        wrap.appendChild(hint);
        // Fade out after 6s, but keep on hover.
        setTimeout(function() {
          if (hint && hint.parentNode) hint.classList.add('bf-click-hint-fade');
        }, 6000);
      }
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
      // Click affordance hint badge that floats over chart top-right
      '.bf-click-hint{position:absolute;top:6px;right:8px;background:rgba(196,154,26,0.92);color:#fff;font-family:Inter,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.4px;padding:4px 9px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.18);pointer-events:none;animation:bfHintPulse 2.4s ease-in-out 2;z-index:5;transition:opacity 0.6s ease}',
      '.bf-click-hint-fade{opacity:0.18}',
      '.bf-click-hint-fade:hover,svg[data-bf-chart]:hover ~ .bf-click-hint,.chart-block:hover .bf-click-hint{opacity:0.92 !important}',
      '@keyframes bfHintPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}',
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
      // Phase 4: density-collapsed sections always open on print
      '@media print{.bf-density-collapse[open],.bf-density-collapse{display:block !important}.bf-density-collapse>summary{list-style:none}.bf-density-collapse>*{display:block !important}}',
      '.bf-printing .bf-density-collapse,.bf-printing .bf-density-collapse>*{display:block !important}',
      // CLASSIFIER-RENDER-PLAN Phase 6: View mode CSS
      // Lite mode: hide premium/advanced visual blocks
      '.bf-view-lite [data-section-id="sec-stress"],',
      '.bf-view-lite [data-section-id="sec-sensitivity"],',
      '.bf-view-lite [data-section-id="sec-risk"],',
      '.bf-view-lite [data-section-id="sec-premium-deepdive"],',
      '.bf-view-lite #bf-whatif,',
      '.bf-view-lite .whatif-teaser-link,',
      '.bf-view-lite .bf-fan-chips,',
      '.bf-view-lite .bf-chart-slicer,',
      '.bf-view-lite [data-section-id="sec-meltdown"]{display:none !important}',
      // Full mode: force all <details> open + suppress ALL section hides
      '.bf-view-full .bf-density-collapse>*,.bf-view-full details>*{display:block !important}',
      // Phase 6 static-print profile (closes Codex HIGH-3 + MED-3):
      // hides JS/payload/interactive scaffolding for the printed
      // artifact. Activated by @media print + .bf-printing class.
      // The runtime ALSO strips data-bf-chart-data attributes from
      // payload-carrying elements when entering print (see beforeprint
      // listener) — pure-CSS rules below are belt-and-suspenders.
      '@media print{',
      '  .bf-fan-chips,.bf-chart-slicer,.bf-print-toggle,#bf-view-toggle,#bf-sticky-bar,',
      '  #bf-whatif,.whatif-teaser-link,.bf-drilldown-modal,.no-print{display:none !important}',
      '  /* Force full view in print regardless of toggle */',
      '  body.bf-view-lite [data-section-id]{display:block !important}',
      '  /* Strip script-block fallback rendering (browsers honor this) */',
      '  script,noscript{display:none !important}',
      '  /* Phase 6 — system-font fallback so printed PDFs render without',
      '     a network round-trip to fonts.googleapis.com.',
      '     Codex MED-3: Google Fonts dependency neutralized at print. */',
      '  body,h1,h2,h3,p,div,span,td,th{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif !important}',
      '  .mono,code,pre,.cover-grade-letter{font-family:"Courier New",Consolas,monospace !important}',
      '  h1,h2,h3,.cover-title,.cover-client{font-family:Georgia,"Times New Roman",serif !important}',
      '}',
      // Executive view — hide deep-dive sections, keep verdict + action +
      // closing thesis recap. Hide-list selectors target the section
      // WRAPPER (.sec-page tagged with [data-section-id]) — not the H3
      // alone. The wrapper tagging is performed at runtime by
      // _tagSectionPages (see below) since renderer call sites emit
      // <div class="sec-page"><h3 id="sec-X">...</h3>...content...</div>
      // and the H3's id was previously the only hook the CSS could grab,
      // which left content visible. Now [data-section-id="sec-X"] sits
      // on the .sec-page wrapper itself so display:none hides everything.
      '.bf-print-exec [data-section-id="sec-profile"],',
      '.bf-print-exec [data-section-id="sec-family"],',
      '.bf-print-exec [data-section-id="sec-real-estate"],',
      '.bf-print-exec [data-section-id="sec-realestate"],',
      '.bf-print-exec [data-section-id="sec-rsu"],',
      '.bf-print-exec [data-section-id="sec-debt"],',
      '.bf-print-exec [data-section-id="sec-corp"],',
      '.bf-print-exec [data-section-id="sec-gis"],',
      '.bf-print-exec [data-section-id="sec-meltdown"],',
      '.bf-print-exec [data-section-id="sec-projection"],',
      '.bf-print-exec [data-section-id="sec-histogram"],',
      '.bf-print-exec [data-section-id="sec-revenue"],',
      '.bf-print-exec [data-section-id="sec-tax"],',
      '.bf-print-exec [data-section-id="sec-sensitivity"],',
      '.bf-print-exec [data-section-id="sec-strategies"],',
      '.bf-print-exec [data-section-id="sec-risk"],',
      '.bf-print-exec [data-section-id="sec-goals"],',
      '.bf-print-exec [data-section-id="sec-assumptions"],',
      '.bf-print-exec [data-section-id="sec-glossary"],',
      '.bf-print-exec [data-section-id="sec-cashflow"],',
      '.bf-print-exec [data-section-id="sec-stress"],',
      '.bf-print-exec [data-section-id="sec-draworder"],',
      '.bf-print-exec [data-section-id="sec-succession"],',
      '.bf-print-exec [data-section-id="sec-insurance"],',
      '.bf-print-exec [data-section-id="sec-levers"],',
      '.bf-print-exec [data-section-id="sec-diagnostic"],',
      // sec-closing-recap is intentionally NOT in the hide list — exec
      // mode KEEPS the thesis recap so the summary print still ends with
      // the canonical posture statement.
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
      // Beginner-mode 4-tile grid: bigger cards, single row at desktop.
      '.bf-whatif-kpis-4{grid-template-columns:repeat(4,1fr)}',
      '.bf-whatif-kpis-4 .bf-whatif-kpi{padding:14px 12px}',
      '@media (max-width:900px){.bf-whatif-kpis,.bf-whatif-kpis-12,.bf-whatif-kpis-4{grid-template-columns:repeat(2,1fr)}}',
      '@media (max-width:600px){.bf-whatif-kpis,.bf-whatif-kpis-12,.bf-whatif-kpis-4{grid-template-columns:repeat(2,1fr)}}',
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
  // VIEW TOGGLE — CLASSIFIER-RENDER-PLAN Phase 6 escape hatch.
  // ─────────────────────────────────────────────────────────────────────
  // Replaces the prior 2-state Detailed/Executive toggle with a 3-state
  // Lite / Standard / Full toggle. Maps to chartTier on body class:
  //   .bf-view-lite  → hide tornado, sensitivity, sequence, fan band
  //   (no class)     → standard (default render)
  //   .bf-view-full  → show everything, force <details> open
  // Also wires .bf-print-static class triggered on @media print to:
  //   • hide all <script> / What-If mounts
  //   • neutralize data-bf-chart-data attributes (pure CSS)
  //   • swap Google Fonts link with system-font fallback
  // localStorage persists user preference across sessions for the same
  // profile. Print/PDF always renders FULL regardless of in-app pref.
  function _buildPrintToggle() {
    if (document.getElementById('bf-view-toggle')) return;
    if (!document.querySelector('.bf-exec-banner')) {
      var banner = document.createElement('div');
      banner.className = 'bf-exec-banner no-print';
      banner.style.display = 'none';
      document.body.insertBefore(banner, document.body.firstChild);
    }
    var bar = document.createElement('div');
    bar.id = 'bf-view-toggle';
    bar.className = 'bf-print-toggle no-print';
    var tLite = isFR ? 'Format court \u2014 r\u00e9sum\u00e9 sans graphiques avanc\u00e9s' : 'Brief format \u2014 summary without advanced charts';
    var tStd  = isFR ? 'Format standard \u2014 par d\u00e9faut' : 'Standard format \u2014 default';
    var tFull = isFR ? 'Format complet \u2014 tous les graphiques + sections \u00e9tendues' : 'Full format \u2014 all charts + expanded sections';
    bar.innerHTML =
      '<button type="button" data-bf-view="lite" title="' + tLite + '">' + (isFR ? 'Court' : 'Brief') + '</button>' +
      '<button type="button" data-bf-view="std" class="active" title="' + tStd + '">' + (isFR ? 'Standard' : 'Standard') + '</button>' +
      '<button type="button" data-bf-view="full" title="' + tFull + '">' + (isFR ? 'Complet' : 'Full') + '</button>';
    document.body.appendChild(bar);
    var btns = bar.querySelectorAll('button');
    var profileKey = (P && P.meta && P.meta.profileId) ? 'bf-view-' + P.meta.profileId : 'bf-view';
    function setView(mode) {
      for (var j = 0; j < btns.length; j++) {
        btns[j].classList.toggle('active', btns[j].getAttribute('data-bf-view') === mode);
      }
      document.body.classList.toggle('bf-view-lite', mode === 'lite');
      document.body.classList.toggle('bf-view-full', mode === 'full');
      try { localStorage.setItem(profileKey, mode); } catch (e) {}
      if (mode !== 'std') window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function() {
        setView(this.getAttribute('data-bf-view'));
      });
    }
    // Restore saved preference on load
    try {
      var saved = localStorage.getItem(profileKey);
      if (saved === 'lite' || saved === 'full') setView(saved);
    } catch (e) {}
  }

  // ─────────────────────────────────────────────────────────────────────
  // SECTION-PAGE TAGGING (executive-mode hide-list precondition)
  // ─────────────────────────────────────────────────────────────────────
  // The renderer emits each section as <div class="sec-page">
  // <h3 id="sec-X" class="sec">…</h3> …content… </div>. The H3 carries
  // the section id, but executive mode needs to hide the WHOLE wrapper
  // (heading + content). This pass walks every H3.sec[id^="sec-"] and
  // tags its closest .sec-page ancestor with [data-section-id="sec-X"].
  // CSS in _injectRuntimeStyles uses [data-section-id="..."] selectors.
  function _tagSectionPages() {
    var headings = document.querySelectorAll('h3.sec[id^="sec-"]');
    for (var i = 0; i < headings.length; i++) {
      var h = headings[i];
      var page = h.closest ? h.closest('.sec-page') : null;
      if (page && !page.getAttribute('data-section-id')) {
        page.setAttribute('data-section-id', h.id);
      }
    }
    // sec-whatif is a div with id (not an H3.sec). Same treatment.
    var whatif = document.getElementById('bf-whatif');
    if (whatif && !whatif.hasAttribute('data-section-id')) {
      whatif.setAttribute('data-section-id', 'sec-whatif');
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // PER-CHART SLICERS — rebuild bars on slider change. Only charts with
  // class="bf-chart-block" + data-bf-chart-data are participating.
  // Sprint 1.3 patterns: income-sources year slicer.
  // ─────────────────────────────────────────────────────────────────────
  function _bindIncomeYearSlicer() {
    var blocks = document.querySelectorAll('.bf-chart-block[data-bf-chart="income-sources"]');
    for (var i = 0; i < blocks.length; i++) {
      (function(block) {
        var raw = block.getAttribute('data-bf-chart-data') || '';
        var data; try { data = JSON.parse(decodeURIComponent(raw)); } catch (e) { return; }
        if (!data || !Array.isArray(data.yearly) || data.yearly.length === 0) return;
        var slider = block.querySelector('input[data-bf-slicer="income-age"]');
        var out = block.querySelector('[data-bf-slicer-out="income-age"]');
        var reset = block.querySelector('[data-bf-slicer-reset="income-age"]');
        var svgHost = block.querySelector('.bf-chart-svg');
        if (!slider || !svgHost) return;
        var fr = data.lang === 'fr';
        var qLbl = data.qLbl || (fr ? 'RRQ' : 'CPP');

        // Build bars for a specific year (or null = averaged baseline)
        function buildBars(targetAge) {
          var rows;
          if (targetAge == null) {
            // Average across all yearly snapshots
            rows = data.yearly[0] ? Object.keys(data.yearly[0]).reduce(function(acc, k) {
              if (k === 'age') return acc;
              acc[k] = Math.round(data.yearly.reduce(function(s, r) { return s + (r[k] || 0); }, 0) / data.yearly.length);
              return acc;
            }, {}) : {};
          } else {
            rows = data.yearly.find(function(r) { return r.age === targetAge; }) || data.yearly[0];
          }
          var items = [];
          if ((rows.rrq || 0) > 0)    items.push({ label: qLbl,                                  value: rows.rrq,  color: '#5b8db8' });
          if ((rows.psv || 0) > 0)    items.push({ label: 'PSV/OAS',                             value: rows.psv,  color: '#2a8c46' });
          if ((rows.pen || 0) > 0)    items.push({ label: 'Pension',                             value: rows.pen,  color: '#7c60b8' });
          if ((rows.srg || 0) > 0)    items.push({ label: 'SRG/GIS',                             value: rows.srg,  color: '#a07a3a' });
          if ((rows.corp || 0) > 0)   items.push({ label: fr ? 'Dividendes / salaire corp.' : 'Corp dividends / salary', value: rows.corp, color: '#7c60b8' });
          if ((rows.rental || 0) > 0) items.push({ label: fr ? 'Revenu locatif net' : 'Net rental cash flow', value: rows.rental, color: '#3aa39c' });
          if ((rows.pt || 0) > 0)     items.push({ label: fr ? 'Travail à temps partiel' : 'Part-time work', value: rows.pt, color: '#5a87b3' });
          if ((rows.lira || 0) > 0)   items.push({ label: fr ? 'Retraits CRI/LIRA' : 'LIRA withdrawals', value: rows.lira, color: '#7C60B8' });
          if ((rows.ret || 0) > 0)    items.push({ label: fr ? 'Retraits portefeuille (REER + CELI + NR)' : 'Portfolio withdrawals (RRSP + TFSA + NR)', value: rows.ret, color: '#c49a1a' });
          if (data.isCouple) {
            if ((rows.cRrq || 0) > 0) items.push({ label: qLbl + (fr ? ' conj.' : ' sp.'),         value: rows.cRrq, color: '#7390b8' });
            if ((rows.cPsv || 0) > 0) items.push({ label: 'PSV ' + (fr ? 'conj.' : 'sp.'),          value: rows.cPsv, color: '#6da97a' });
            if ((rows.cPen || 0) > 0) items.push({ label: fr ? 'Pension conj.' : 'Spouse pension', value: rows.cPen, color: '#9577c8' });
            if ((rows.cSrg || 0) > 0) items.push({ label: 'SRG ' + (fr ? 'conj.' : 'sp.'),          value: rows.cSrg, color: '#c89a3a' });
          }
          // Suppress sub-$1K
          var below = 0, belowCount = 0;
          var clean = items.filter(function(it) { if (Math.abs(it.value) < 1000) { below += it.value; belowCount += 1; return false; } return true; });
          if (belowCount >= 2) clean.push({ label: fr ? 'Divers (<1\u202fK\u202f$)' : 'Misc. (<1K)', value: below, color: '#9aabc7' });
          var total = clean.reduce(function(s, it) { return s + it.value; }, 0);
          return { items: clean, total: total };
        }

        function fmtCompact(v) {
          if (v >= 1e6) return Math.round(v / 1e5) / 10 + 'M\u202f$';
          if (v >= 1e3) return Math.round(v / 1e3) + 'K\u202f$';
          return Math.round(v) + '\u202f$';
        }

        function renderBars(targetAge) {
          var built = buildBars(targetAge);
          var maxVal = Math.max.apply(null, built.items.map(function(it) { return Math.abs(it.value); })) || 1;
          var titleSuffix = targetAge == null
            ? (fr ? '(moyenne sur la retraite)' : '(averaged across retirement)')
            : (fr ? '— ' + targetAge + '\u00a0ans' : '— age ' + targetAge);
          var html = '<div class="rev-waterfall" style="background:#fafafa;border:1px solid #e5e5e5;border-radius:6px;padding:14px 16px;font-family:Inter,sans-serif;font-size:11px">' +
            '<div style="font-size:10.5px;font-weight:700;color:#c49a1a;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px">' +
              (fr ? 'Sources de revenus annuelles ' : 'Annual income sources ') + titleSuffix + '</div>';
          built.items.forEach(function(it) {
            var w = Math.max(2, (Math.abs(it.value) / maxVal) * 100);
            html += '<div style="display:grid;grid-template-columns:170px 1fr 80px;gap:10px;align-items:center;padding:4px 0">' +
              '<div style="text-align:right;color:' + it.color + ';font-weight:600;font-size:10.5px">' + it.label + '</div>' +
              '<div style="background:#f5f1ea;border-radius:3px;height:14px;overflow:hidden">' +
                '<div style="height:100%;width:' + w + '%;background:' + it.color + '"></div>' +
              '</div>' +
              '<div style="font-family:JetBrains Mono,monospace;font-weight:700;text-align:right;font-size:10.5px">' + fmtCompact(it.value) + '</div>' +
              '</div>';
          });
          html += '<div style="margin-top:8px;padding-top:8px;border-top:2px solid #c49a1a;display:grid;grid-template-columns:170px 1fr 80px;gap:10px;align-items:center;font-weight:700">' +
            '<div style="text-align:right;color:#c49a1a;letter-spacing:0.5px;text-transform:uppercase;font-size:10px">Total</div>' +
            '<div></div>' +
            '<div style="font-family:JetBrains Mono,monospace;text-align:right;font-size:12px;color:#c49a1a">' + fmtCompact(built.total) + '</div>' +
            '</div>';
          html += '</div>';
          svgHost.innerHTML = html;
        }

        slider.addEventListener('input', function() {
          var v = parseInt(slider.value, 10);
          if (out) out.textContent = fr ? v + '\u00a0ans' : v + ' yrs';
          block.setAttribute('data-bf-chart-mode', 'year');
          renderBars(v);
        });
        if (reset) {
          reset.addEventListener('click', function() {
            block.setAttribute('data-bf-chart-mode', 'averaged');
            if (out) out.textContent = fr ? 'Moyenne' : 'Averaged';
            slider.value = slider.min;
            renderBars(null);
          });
        }
      })(blocks[i]);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // MC FAN SCENARIO CHIPS — Sprint 1.4
  // Each fan chart has 3 chips: Cautious (P25) / Median (P50) /
  // Favourable (P75). Active chip emphasizes the corresponding trace
  // and dims the others. Median is default (matches the default render).
  // ─────────────────────────────────────────────────────────────────────
  function _bindFanScenarioChips() {
    // Color anchor table — chip background + chart trace must match so the
    // "active" cue stays consistent. P25=red (cautious), P50=gold (median),
    // P75=green (favourable).
    var MODE_COLOR = {
      cautious:   '#cc4444',
      median:     '#c49a1a',
      favourable: '#2a8c46'
    };
    var fans = document.querySelectorAll('svg[data-bf-chart="fan"]');
    for (var i = 0; i < fans.length; i++) {
      (function(svg) {
        var wrap = svg.parentElement;
        if (!wrap) return;
        var chipBar = wrap.querySelector('.bf-fan-chips');
        if (!chipBar) return;
        var chips = chipBar.querySelectorAll('button[data-bf-fan-chip]');
        var p25 = svg.querySelector('.bf-fan-p25');
        var p50 = svg.querySelector('.bf-fan-p50');
        var p75 = svg.querySelector('.bf-fan-p75');
        var wideBand = svg.querySelector('.bf-fan-wide-band');
        var innerBand = svg.querySelector('.bf-fan-inner-band');

        function setActive(mode) {
          svg.setAttribute('data-bf-fan-active', mode);
          // Chip styling — active chip background + border match its trace color
          for (var k = 0; k < chips.length; k++) {
            var thisMode = chips[k].getAttribute('data-bf-fan-chip');
            var isThis = thisMode === mode;
            var col = MODE_COLOR[thisMode] || '#c49a1a';
            chips[k].classList.toggle('bf-fan-chip-active', isThis);
            chips[k].style.background = isThis ? col : 'transparent';
            chips[k].style.color = isThis ? '#fff' : '#706558';
            chips[k].style.borderColor = isThis ? col : '#e8e0d4';
            chips[k].style.fontWeight = isThis ? '700' : '600';
          }
          // Aggressive dim on non-focused mode: hide bands almost entirely
          // and zero the unfocused traces. Median view shows full bands;
          // cautious/favourable focus a single line so the user can read it.
          if (mode === 'cautious') {
            if (p25) { p25.setAttribute('opacity', '1'); p25.setAttribute('stroke-width', '3.5'); }
            if (p50) { p50.setAttribute('opacity', '0.12'); p50.setAttribute('stroke-width', '1'); }
            if (p75) { p75.setAttribute('opacity', '0'); }
            if (wideBand) wideBand.setAttribute('opacity', '0.02');
            if (innerBand) innerBand.setAttribute('opacity', '0.04');
          } else if (mode === 'favourable') {
            if (p25) { p25.setAttribute('opacity', '0'); }
            if (p50) { p50.setAttribute('opacity', '0.12'); p50.setAttribute('stroke-width', '1'); }
            if (p75) { p75.setAttribute('opacity', '1'); p75.setAttribute('stroke-width', '3.5'); }
            if (wideBand) wideBand.setAttribute('opacity', '0.02');
            if (innerBand) innerBand.setAttribute('opacity', '0.04');
          } else {
            // median (default) — show full bands, P50 prominent
            if (p25) { p25.setAttribute('opacity', '0'); }
            if (p50) { p50.setAttribute('opacity', '1'); p50.setAttribute('stroke-width', '2.5'); }
            if (p75) { p75.setAttribute('opacity', '0'); }
            if (wideBand) wideBand.setAttribute('opacity', '0.1');
            if (innerBand) innerBand.setAttribute('opacity', '0.15');
          }

          // Year-end value label: anchor a $-value tag on the active trace's
          // last point so the reader can read the trajectory's end-state at
          // a glance. Removed and re-attached on every chip click.
          var oldLabel = svg.querySelector('.bf-fan-end-label');
          if (oldLabel) oldLabel.parentNode.removeChild(oldLabel);
          var activePath = mode === 'cautious' ? p25 : (mode === 'favourable' ? p75 : p50);
          if (activePath) {
            try {
              var data = JSON.parse((svg.getAttribute('data-bf-chart-data') || '[]').replace(/&quot;/g, '"'));
              var last = data[data.length - 1];
              var v = mode === 'cautious' ? last.p25 : (mode === 'favourable' ? last.p75 : last.p50);
              if (v != null && isFinite(v)) {
                // Read end point by deterministic d-attribute parse. Path is
                // built by the renderer as "M<x>,<y> L<x>,<y> ... L<x>,<y>"
                // so the last numeric pair is unambiguous. Match every
                // "<digits>.<digits>,<digits>.<digits>" coordinate pair and
                // take the LAST one.
                var dStr = activePath.getAttribute('d') || '';
                var pairs = dStr.match(/-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?/g);
                var endPt = null;
                if (pairs && pairs.length > 0) {
                  var parts = pairs[pairs.length - 1].split(',');
                  endPt = { x: parseFloat(parts[0]), y: parseFloat(parts[1]) };
                }
                if (endPt && isFinite(endPt.x) && isFinite(endPt.y)) {
                  var ex = endPt.x;
                  var ey = endPt.y;
                  var color = MODE_COLOR[mode] || '#c49a1a';
                  var fmt = function(n) {
                    if (Math.abs(n) >= 1e6) return (n/1e6).toFixed(1).replace(/\.0$/,'') + 'M$';
                    if (Math.abs(n) >= 1e3) return Math.round(n/1e3) + 'K$';
                    return Math.round(n) + '$';
                  };
                  var label = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                  label.setAttribute('class', 'bf-fan-end-label');
                  var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                  var txt = fmt(v);
                  var tw = txt.length * 6.2 + 10;
                  rect.setAttribute('x', (ex - tw - 4).toString());
                  rect.setAttribute('y', (ey - 9).toString());
                  rect.setAttribute('width', tw.toString());
                  rect.setAttribute('height', '18');
                  rect.setAttribute('rx', '3');
                  rect.setAttribute('fill', color);
                  rect.setAttribute('opacity', '0.95');
                  label.appendChild(rect);
                  var t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                  t.setAttribute('x', (ex - 9).toString());
                  t.setAttribute('y', (ey + 4).toString());
                  t.setAttribute('text-anchor', 'end');
                  t.setAttribute('fill', '#fff');
                  t.setAttribute('font-size', '10');
                  t.setAttribute('font-weight', '700');
                  t.setAttribute('font-family', 'JetBrains Mono,monospace');
                  t.textContent = txt;
                  label.appendChild(t);
                  svg.appendChild(label);
                }
              }
            } catch (e) { /* no-op: label is decorative */ }
          }
        }

        for (var c = 0; c < chips.length; c++) {
          (function(btn) {
            btn.addEventListener('click', function() {
              setActive(btn.getAttribute('data-bf-fan-chip'));
            });
          })(chips[c]);
        }
        // Initialize to median (matches default opacities)
        setActive('median');
      })(fans[i]);
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // BOOT
  // ─────────────────────────────────────────────────────────────────────
  function boot() {
    _injectRuntimeStyles();
    _tagSectionPages();
    _buildStickyBar();
    // 2026-04-28: floating Court / Standard / Complet toggle removed.
    // Classifier is now the source of truth for report length — a reader
    // who chose "concise" gets the brief render at generate-time. The
    // post-render JS toggle was contradicting that promise (it just
    // hid sections via CSS, which left the FULL HTML present in the
    // delivered file). Readers who want more depth than their classifier
    // picked use the inline <details> disclosure at the back-matter.
    // _buildPrintToggle();
    _bindControls();
    _bindActionToggles();
    _wireDrilldownTriggers();
    _bindIncomeYearSlicer();
    _bindFanScenarioChips();
    updateLiveValues();
    // Freeze state on print — capture current values into static text
    // CLASSIFIER-RENDER-PLAN Phase 6 (closes Codex HIGH-3): strip
    // chart-data payload attributes during print so the printed-as-PDF
    // artifact does not carry the embedded JSON. The originals are
    // re-attached afterprint so interactive features keep working.
    window.addEventListener('beforeprint', function() {
      document.body.classList.add('bf-printing');
      var nodes = document.querySelectorAll('[data-bf-chart-data]');
      for (var i = 0; i < nodes.length; i++) {
        var v = nodes[i].getAttribute('data-bf-chart-data');
        if (v) nodes[i].setAttribute('data-bf-chart-data-saved', v);
        nodes[i].setAttribute('data-bf-chart-data', '');
      }
    });
    window.addEventListener('afterprint', function() {
      document.body.classList.remove('bf-printing');
      var nodes = document.querySelectorAll('[data-bf-chart-data-saved]');
      for (var i = 0; i < nodes.length; i++) {
        var saved = nodes[i].getAttribute('data-bf-chart-data-saved');
        if (saved) nodes[i].setAttribute('data-bf-chart-data', saved);
        nodes[i].removeAttribute('data-bf-chart-data-saved');
      }
    });
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
