// report-tooltip.js — Generic SVG hover tooltip for BuildFi report charts.
//
// Supports: fan chart, stacked area, waterfall, histogram, tornado, donut,
// tolerating SVGs with a data-bf-chart="<type>" attribute and a data-bf-chart-data
// JSON payload of the data points. On mousemove, snap to closest data point along
// X axis, show tooltip with key/value rows derived from the point.
//
// Print-safe: listener attaches after DOMContentLoaded; @media print hides tooltip
// (.bf-tooltip display:none in print CSS).

(function() {
  "use strict";
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var isFR = !!(window.__BUILDFI__ && window.__BUILDFI__.meta && window.__BUILDFI__.meta.fr);

  // ───────── formatters (independent copy — keep tooltip standalone) ─────────
  function fmtCompact(v) {
    if (v == null || !isFinite(v)) return '—';
    var a = Math.abs(v);
    if (a >= 1e6) return (v < 0 ? '−' : '') + (a / 1e6).toFixed(1).replace('.', isFR ? ',' : '.') + ' M$';
    if (a >= 1e3) return (v < 0 ? '−' : '') + Math.round(a / 1e3) + ' K$';
    return Math.round(v) + '$';
  }

  // ───────── tooltip element (one singleton, positioned absolute at body level) ─────────
  var tooltipEl = null;
  function _ensureTooltip() {
    if (tooltipEl) return tooltipEl;
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'bf-tooltip';
    tooltipEl.setAttribute('role', 'tooltip');
    document.body.appendChild(tooltipEl);
    return tooltipEl;
  }

  function _showTooltip(x, y, html) {
    var el = _ensureTooltip();
    el.innerHTML = html;
    // Temporarily make visible for measurement
    el.style.left = '0px'; el.style.top = '0px';
    el.classList.add('visible');
    var rect = el.getBoundingClientRect();
    // Position above-right of cursor, keep inside viewport
    var finalX = x + 14;
    var finalY = y + 14;
    if (finalX + rect.width > window.innerWidth - 10) finalX = x - rect.width - 14;
    if (finalY + rect.height > window.innerHeight - 10) finalY = y - rect.height - 14;
    el.style.left = (finalX + window.scrollX) + 'px';
    el.style.top = (finalY + window.scrollY) + 'px';
  }

  function _hideTooltip() {
    if (tooltipEl) tooltipEl.classList.remove('visible');
  }

  // ───────── per-chart-type content builders ─────────
  // Returns HTML string for the tooltip given the closest data point.
  var TYPE_BUILDERS = {
    fan: function(point) {
      if (!point) return '';
      // P5/P95 intentionally NOT surfaced — extreme tails mislead when base
      // success rate is low. Show only P25/P50/P75 (50% of simulations) to
      // keep the tooltip aligned with the fan chart band visible on screen.
      var lines = [];
      lines.push('<div class="bf-tooltip-title">' + (isFR ? 'Âge ' : 'Age ') + point.age + '</div>');
      if (point.p50 != null && point.p50 > 0) lines.push('<div class="bf-tooltip-row"><span class="bf-tooltip-key">P50 ' + (isFR ? 'médian' : 'median') + '</span><span class="bf-tooltip-val">' + fmtCompact(point.p50) + '</span></div>');
      if (point.p25 != null && point.p25 > 0) lines.push('<div class="bf-tooltip-row"><span class="bf-tooltip-key">P25 ' + (isFR ? 'prudent' : 'cautious') + '</span><span class="bf-tooltip-val">' + fmtCompact(point.p25) + '</span></div>');
      if (point.p75 != null && point.p75 > 0) lines.push('<div class="bf-tooltip-row"><span class="bf-tooltip-key">P75 ' + (isFR ? 'favorable' : 'favourable') + '</span><span class="bf-tooltip-val">' + fmtCompact(point.p75) + '</span></div>');
      return lines.join('');
    },
    area: function(point) {
      if (!point) return '';
      var lines = ['<div class="bf-tooltip-title">' + (isFR ? 'Âge ' : 'Age ') + point.age + '</div>'];
      Object.keys(point).forEach(function(k) {
        if (k === 'age') return;
        lines.push('<div class="bf-tooltip-row"><span class="bf-tooltip-key">' + k + '</span><span class="bf-tooltip-val">' + fmtCompact(point[k]) + '</span></div>');
      });
      return lines.join('');
    },
    histogram: function(point) {
      if (!point) return '';
      return '<div class="bf-tooltip-title">' + (isFR ? 'Plage' : 'Range') + '</div>' +
        '<div class="bf-tooltip-row"><span class="bf-tooltip-key">' + (isFR ? 'Intervalle' : 'From–to') + '</span><span class="bf-tooltip-val">' + fmtCompact(point.lo) + '–' + fmtCompact(point.hi) + '</span></div>' +
        '<div class="bf-tooltip-row"><span class="bf-tooltip-key">' + (isFR ? 'Simulations' : 'Simulations') + '</span><span class="bf-tooltip-val">' + point.count + '</span></div>';
    },
    waterfall: function(point) {
      if (!point) return '';
      return '<div class="bf-tooltip-title">' + (point.label || (isFR ? 'Élément' : 'Item')) + '</div>' +
        '<div class="bf-tooltip-row"><span class="bf-tooltip-key">' + (isFR ? 'Valeur' : 'Value') + '</span><span class="bf-tooltip-val">' + fmtCompact(point.value) + '</span></div>';
    },
    tornado: function(point) {
      if (!point) return '';
      return '<div class="bf-tooltip-title">' + (point.label || (isFR ? 'Facteur' : 'Factor')) + '</div>' +
        '<div class="bf-tooltip-row"><span class="bf-tooltip-key">' + (isFR ? 'Baisse' : 'Down') + '</span><span class="bf-tooltip-val">' + fmtCompact(point.lo) + '</span></div>' +
        '<div class="bf-tooltip-row"><span class="bf-tooltip-key">' + (isFR ? 'Hausse' : 'Up') + '</span><span class="bf-tooltip-val">' + fmtCompact(point.hi) + '</span></div>';
    },
    donut: function(point) {
      if (!point) return '';
      return '<div class="bf-tooltip-title">' + (point.label || '') + '</div>' +
        '<div class="bf-tooltip-row"><span class="bf-tooltip-key">' + (isFR ? 'Part' : 'Share') + '</span><span class="bf-tooltip-val">' + (point.pct != null ? Math.round(point.pct * 100) + '%' : '—') + '</span></div>';
    }
  };

  // ───────── closest-point snap by X in viewBox coordinates ─────────
  function _svgViewBox(svg) {
    var vb = (svg.getAttribute('viewBox') || '0 0 700 220').split(/\s+/).map(parseFloat);
    return { x: vb[0], y: vb[1], w: vb[2], h: vb[3] };
  }

  function _snapClosest(points, xRatio) {
    if (!points || !points.length) return null;
    var idx = Math.round(xRatio * (points.length - 1));
    idx = Math.max(0, Math.min(points.length - 1, idx));
    return points[idx];
  }

  // ───────── event wiring ─────────
  function _wireChart(svg) {
    var type = svg.getAttribute('data-bf-chart');
    var dataAttr = svg.getAttribute('data-bf-chart-data');
    if (!type || !dataAttr || !TYPE_BUILDERS[type]) return;
    var points;
    try { points = JSON.parse(dataAttr.replace(/&quot;/g, '"')); } catch (e) { return; }
    if (!points || !points.length) return;

    var wrap = svg.parentNode;
    if (wrap && !wrap.classList.contains('bf-chart-wrap')) wrap.classList.add('bf-chart-wrap');

    svg.addEventListener('mousemove', function(e) {
      var rect = svg.getBoundingClientRect();
      // Margins differ by chart type — histogram/tornado use 50, fan/area use 55.
      var ml = (type === 'histogram' ? 50 : type === 'tornado' ? 0 : 55);
      var mr = (type === 'histogram' ? 10 : type === 'tornado' ? 0 : 15);
      var vb = _svgViewBox(svg);
      var xViewBox = ((e.clientX - rect.left) / rect.width) * vb.w;
      var xRatio = (xViewBox - ml) / (vb.w - ml - mr);
      // Donut: single-item, always show tooltip on hover inside the SVG.
      if (type === 'donut') {
        var html = TYPE_BUILDERS[type](points[0]);
        if (html) _showTooltip(e.clientX, e.clientY, html);
        return;
      }
      if (xRatio < 0 || xRatio > 1) { _hideTooltip(); return; }
      var point = _snapClosest(points, xRatio);
      var html2 = TYPE_BUILDERS[type](point);
      if (html2) _showTooltip(e.clientX, e.clientY, html2);
    });

    svg.addEventListener('mouseleave', _hideTooltip);

    // Touch support — show on touchstart, hide on touchend
    svg.addEventListener('touchstart', function(e) {
      if (!e.touches.length) return;
      var t = e.touches[0];
      var rect = svg.getBoundingClientRect();
      var ml = 55, mr = 15;
      var vb = _svgViewBox(svg);
      var xViewBox = ((t.clientX - rect.left) / rect.width) * vb.w;
      var xRatio = (xViewBox - ml) / (vb.w - ml - mr);
      if (xRatio < 0 || xRatio > 1) return;
      var point = _snapClosest(points, xRatio);
      var html = TYPE_BUILDERS[type](point);
      if (html) _showTooltip(t.clientX, t.clientY, html);
    }, { passive: true });
    svg.addEventListener('touchend', _hideTooltip);
  }

  function boot() {
    var svgs = document.querySelectorAll('svg[data-bf-chart]');
    for (var i = 0; i < svgs.length; i++) _wireChart(svgs[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.BFTooltip = {
    show: _showTooltip,
    hide: _hideTooltip,
    rebind: boot
  };
})();
