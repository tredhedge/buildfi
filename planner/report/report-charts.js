// report-charts.js — BuildFi SVG Chart Generators
// Depends on: report-formatters.js (window.BFmt)
// Exports: window.BCharts
(function() {
  "use strict";

  if (!window.BFmt) { console.error("[BCharts] report-formatters.js must load first"); return; }
  var C = window.BFmt.COLORS;
  var f$ = window.BFmt.fmtCompact;

  function _chartTitle(title) {
    return title ? '<div class="chart-title">' + title + '</div>' : '';
  }

  function _wrapChart(inner, title) {
    return '<div class="chart-block">' + _chartTitle(title) + inner + '</div>';
  }

  // ══════════════════════════════════════════════════════════════
  // svgArea — Stacked or multi-line area/line chart
  // ══════════════════════════════════════════════════════════════

  function svgArea(data, keys, colors, labels, opts) {
    opts = opts || {};
    var W = opts.width || 700, H = opts.height || 200;
    var ml = 55, mr = 15, mt = 15, mb = 30;
    var w = W - ml - mr, h2 = H - mt - mb;
    if (!data || data.length === 0) return "";

    // Y range
    var yMin = 0, yMax = 0;
    data.forEach(function(d) {
      if (opts.stacked) {
        var sum = 0;
        keys.forEach(function(k) { sum += Math.max(0, d[k] || 0); });
        yMax = Math.max(yMax, sum);
      } else {
        keys.forEach(function(k) {
          yMax = Math.max(yMax, d[k] || 0);
          yMin = Math.min(yMin, d[k] || 0);
        });
      }
    });
    if (yMax === yMin) yMax = yMin + 1;
    var yRange = yMax - yMin;
    var x = function(i) { return ml + i / Math.max(1, data.length - 1) * w; };
    var y = function(v) { return mt + h2 - (v - yMin) / yRange * h2; };

    // Tooltip payload — pass full row keyed by age so report-tooltip.js can
    // surface each series value at hover. Filters out non-numeric fields.
    var _areaDataJson = JSON.stringify(data.map(function(r) {
      var pt = { age: r.age };
      keys.forEach(function(k, ki) {
        if (typeof r[k] === 'number') pt[labels && labels[ki] ? labels[ki] : k] = r[k];
      });
      return pt;
    })).replace(/"/g, '&quot;');
    var svg = '<svg role="img"' + (opts.title ? ' aria-label="' + opts.title + '"' : '') + ' xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ' + W + ' ' + H + '" style="display:block;margin:8px 0"' +
      ' data-bf-chart="area" data-bf-chart-data="' + _areaDataJson + '">';

    // Grid lines
    for (var gi = 0; gi <= 4; gi++) {
      var gv = yMin + yRange * gi / 4;
      svg += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y(gv).toFixed(1) + '" y2="' + y(gv).toFixed(1) + '" stroke="#e8e0d4" stroke-width="0.5" stroke-dasharray="3,3"/>';
      svg += '<text x="' + (ml - 6) + '" y="' + (y(gv) + 3).toFixed(1) + '" fill="#999" font-size="9" text-anchor="end" font-family="JetBrains Mono">' + (opts.yFmt ? opts.yFmt(gv) : f$(gv)) + '</text>';
    }
    svg += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + (H - mb) + '" y2="' + (H - mb) + '" stroke="#d7cec1" stroke-width="0.8"/>';
    svg += '<line x1="' + ml + '" x2="' + ml + '" y1="' + mt + '" y2="' + (H - mb) + '" stroke="#d7cec1" stroke-width="0.8"/>';

    // X axis labels
    var xStep = Math.max(1, Math.floor(data.length / 8));
    for (var xi = 0; xi < data.length; xi += xStep) {
      svg += '<text x="' + x(xi).toFixed(1) + '" y="' + (H - 6) + '" fill="#999" font-size="9" text-anchor="middle" font-family="JetBrains Mono">' + (data[xi].age || xi) + '</text>';
    }
    if (data.length > 1 && (data.length - 1) % xStep !== 0) {
      svg += '<text x="' + x(data.length - 1).toFixed(1) + '" y="' + (H - 6) + '" fill="#999" font-size="9" text-anchor="middle" font-family="JetBrains Mono">' + (data[data.length - 1].age || (data.length - 1)) + '</text>';
    }

    // Draw areas or lines
    if (opts.stacked) {
      var baseline = data.map(function() { return 0; });
      keys.forEach(function(k, ki) {
        var top = data.map(function(d, i) { baseline[i] += Math.max(0, d[k] || 0); return baseline[i]; });
        var prev = ki === 0 ? data.map(function() { return 0; }) : data.map(function(_, i2) { return baseline[i2] - Math.max(0, data[i2][k] || 0); });
        var pathUp = data.map(function(_, i2) { return (i2 === 0 ? 'M' : 'L') + x(i2).toFixed(1) + ',' + y(top[i2]).toFixed(1); }).join(' ');
        var pathDn = '';
        for (var ri = data.length - 1; ri >= 0; ri--) pathDn += ' L' + x(ri).toFixed(1) + ',' + y(prev[ri]).toFixed(1);
        svg += '<path d="' + pathUp + pathDn + ' Z" fill="' + colors[ki] + '" opacity="0.35" stroke="' + colors[ki] + '" stroke-width="1"/>';
      });
    } else {
      keys.forEach(function(k, ki) {
        var pathD = data.map(function(d, i2) { return (i2 === 0 ? 'M' : 'L') + x(i2).toFixed(1) + ',' + y(d[k] || 0).toFixed(1); }).join(' ');
        svg += '<path d="' + pathD + '" fill="none" stroke="' + colors[ki] + '" stroke-width="2"/>';
      });
    }

    // Annotations (vertical marker lines)
    if (opts.annotations) {
      opts.annotations.forEach(function(a) {
        var ai2 = -1;
        for (var _a = 0; _a < data.length; _a++) { if (data[_a].age == a.age) { ai2 = _a; break; } }
        if (ai2 >= 0) {
          svg += '<line x1="' + x(ai2).toFixed(1) + '" x2="' + x(ai2).toFixed(1) + '" y1="' + mt + '" y2="' + (mt + h2) + '" stroke="' + C.gold + '" stroke-width="1" stroke-dasharray="3,3" opacity="0.5"/>';
          svg += '<rect x="' + (x(ai2) - 24) + '" y="' + (mt - 1) + '" width="48" height="13" rx="3" fill="' + C.gold + '" opacity="0.15"/>';
          svg += '<text x="' + x(ai2).toFixed(1) + '" y="' + (mt + 9) + '" fill="' + C.gold + '" font-size="8" text-anchor="middle" font-weight="700">' + a.label + '</text>';
        }
      });
    }

    // Zero line
    if (yMin < 0 && yMax > 0) {
      svg += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y(0).toFixed(1) + '" y2="' + y(0).toFixed(1) + '" stroke="#cc4444" stroke-width="1" opacity="0.4"/>';
    }

    // Axis title
    if (opts.yLabel) svg += '<text x="12" y="' + (mt + h2/2) + '" fill="#aaa" font-size="9" text-anchor="middle" font-family="Inter,sans-serif" transform="rotate(-90,12,' + (mt + h2/2) + ')">' + opts.yLabel + '</text>';

    svg += '</svg>';

    // Legend
    if (opts.showLegend !== false && labels) {
      svg += '<div class="chart-legend" style="padding-left:' + ml + 'px">';
      labels.forEach(function(l, li) {
        svg += '<span class="chart-legend-item"><span class="chart-legend-swatch" style="background:' + colors[li] + '"></span>' + l + '</span>';
      });
      svg += '</div>';
    }

    return _wrapChart(svg, opts.title);
  }

  // ══════════════════════════════════════════════════════════════
  // svgFanChart — MC percentile fan chart with deterministic overlay
  // ══════════════════════════════════════════════════════════════

  function svgFanChart(pD, opts) {
    opts = opts || {};
    var W = opts.width || 700, H = opts.height || 220;
    var ml = 55, mr = 15, mt = 15, mb = 30;
    var w = W - ml - mr, h2 = H - mt - mb;
    if (!pD || pD.length === 0) return "";

    // Collect Y range from all percentiles
    var yMin = 0, yMax = 0;
    pD.forEach(function(d) {
      var vals = [d.mp_total || 0, d.rmp_total || 0];
      if (d.p5 != null) vals.push(d.p5);
      if (d.p95 != null) vals.push(d.p95);
      vals.forEach(function(v) { yMax = Math.max(yMax, v); yMin = Math.min(yMin, v); });
    });
    if (yMax === yMin) yMax = yMin + 1;
    var yRange = yMax - yMin;
    var x = function(i) { return ml + i / Math.max(1, pD.length - 1) * w; };
    var y = function(v) { return mt + h2 - (v - yMin) / yRange * h2; };

    // Tooltip data — encoded so report-tooltip.js can snap to nearest point
    // on hover. Keep only the fields the tooltip surfaces (age + percentiles).
    var _fanDataJson = JSON.stringify(pD.map(function(r) {
      return { age: r.age, p25: r.p25, p50: r.p50, p75: r.p75 };
    })).replace(/"/g, '&quot;');
    var svg = '<svg role="img"' + (opts.title ? ' aria-label="' + opts.title + '"' : '') + ' xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ' + W + ' ' + H + '" style="display:block;margin:8px 0"' +
      ' data-bf-chart="fan" data-bf-chart-data="' + _fanDataJson + '">';

    // Grid
    for (var gi = 0; gi <= 4; gi++) {
      var gv = yMin + yRange * gi / 4;
      svg += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y(gv).toFixed(1) + '" y2="' + y(gv).toFixed(1) + '" stroke="#e8e0d4" stroke-width="0.5" stroke-dasharray="3,3"/>';
      svg += '<text x="' + (ml - 6) + '" y="' + (y(gv) + 3).toFixed(1) + '" fill="#999" font-size="9" text-anchor="end" font-family="JetBrains Mono">' + f$(gv) + '</text>';
    }
    svg += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + (H - mb) + '" y2="' + (H - mb) + '" stroke="#d7cec1" stroke-width="0.8"/>';
    svg += '<line x1="' + ml + '" x2="' + ml + '" y1="' + mt + '" y2="' + (H - mb) + '" stroke="#d7cec1" stroke-width="0.8"/>';

    // X axis
    var xStep = Math.max(1, Math.floor(pD.length / 8));
    for (var xi = 0; xi < pD.length; xi += xStep) {
      svg += '<text x="' + x(xi).toFixed(1) + '" y="' + (H - 6) + '" fill="#999" font-size="9" text-anchor="middle" font-family="JetBrains Mono">' + (pD[xi].age || xi) + '</text>';
    }
    if (pD.length > 1 && (pD.length - 1) % xStep !== 0) {
      svg += '<text x="' + x(pD.length - 1).toFixed(1) + '" y="' + (H - 6) + '" fill="#999" font-size="9" text-anchor="middle" font-family="JetBrains Mono">' + (pD[pD.length - 1].age || (pD.length - 1)) + '</text>';
    }

    // P5-P95 band
    var hasBands = pD[0] && pD[0].p5 != null;
    if (hasBands) {
      // P5-P95 band
      var p5Up = pD.map(function(d, i) { return (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ',' + y(d.p95 || d.rmp_total || 0).toFixed(1); }).join(' ');
      var p5Dn = '';
      for (var ri = pD.length - 1; ri >= 0; ri--) p5Dn += ' L' + x(ri).toFixed(1) + ',' + y(pD[ri].p5 || 0).toFixed(1);
      svg += '<path d="' + p5Up + p5Dn + ' Z" fill="' + C.gold + '" opacity="0.1"/>';

      // P25-P75 band
      if (pD[0].p25 != null) {
        var p25Up = pD.map(function(d, i) { return (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ',' + y(d.p75 || d.rmp_total || 0).toFixed(1); }).join(' ');
        var p25Dn = '';
        for (var ri2 = pD.length - 1; ri2 >= 0; ri2--) p25Dn += ' L' + x(ri2).toFixed(1) + ',' + y(pD[ri2].p25 || 0).toFixed(1);
        svg += '<path d="' + p25Up + p25Dn + ' Z" fill="' + C.gold + '" opacity="0.15"/>';
      }

      // P50 line
      var p50Path = pD.map(function(d, i) { return (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ',' + y(d.p50 || d.rmp_total || 0).toFixed(1); }).join(' ');
      svg += '<path d="' + p50Path + '" fill="none" stroke="' + C.gold + '" stroke-width="2"/>';
    }

    // Deterministic line (dashed gold or main if no bands)
    var detPath = pD.map(function(d, i) { return (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ',' + y(d.mp_total || d.rmp_total || 0).toFixed(1); }).join(' ');
    svg += '<path d="' + detPath + '" fill="none" stroke="' + (hasBands ? '#333' : C.gold) + '" stroke-width="' + (hasBands ? '1.5' : '2') + '"' + (hasBands ? ' stroke-dasharray="4,3"' : '') + '/>';

    // Zero line
    if (yMin < 0) {
      svg += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y(0).toFixed(1) + '" y2="' + y(0).toFixed(1) + '" stroke="' + C.red + '" stroke-width="1" opacity="0.4"/>';
    }

    // Annotations
    if (opts.annotations) {
      opts.annotations.forEach(function(a) {
        var ai2 = -1;
        for (var _a = 0; _a < pD.length; _a++) { if (pD[_a].age == a.age) { ai2 = _a; break; } }
        if (ai2 >= 0) {
          svg += '<line x1="' + x(ai2).toFixed(1) + '" x2="' + x(ai2).toFixed(1) + '" y1="' + mt + '" y2="' + (mt + h2) + '" stroke="' + C.gold + '" stroke-width="1" stroke-dasharray="3,3" opacity="0.5"/>';
          svg += '<text x="' + x(ai2).toFixed(1) + '" y="' + (mt + 9) + '" fill="' + C.gold + '" font-size="8" text-anchor="middle" font-weight="700">' + a.label + '</text>';
        }
      });
    }

    // Axis title
    if (opts.yLabel) svg += '<text x="12" y="' + (mt + h2/2) + '" fill="#aaa" font-size="9" text-anchor="middle" font-family="Inter,sans-serif" transform="rotate(-90,12,' + (mt + h2/2) + ')">' + opts.yLabel + '</text>';

    svg += '</svg>';

    // Legend
    svg += '<div class="chart-legend" style="padding-left:' + ml + 'px">';
    if (hasBands) {
      svg += '<span class="chart-legend-item"><span class="chart-legend-swatch" style="width:14px;height:8px;background:' + C.gold + ';opacity:0.2"></span>P25\u2013P75</span>';
      svg += '<span class="chart-legend-item"><span class="chart-legend-swatch" style="width:14px;height:8px;background:' + C.gold + ';opacity:0.08"></span>P5\u2013P95</span>';
      svg += '<span class="chart-legend-item"><span class="chart-legend-swatch" style="width:14px;height:2px;background:' + C.gold + ';border-radius:0"></span>P50</span>';
      svg += '<span class="chart-legend-item"><span class="chart-legend-swatch" style="width:14px;height:0;border-top:1.5px dashed #333;border-radius:0;background:transparent"></span>' + (opts.fr ? 'D\u00e9terministe' : 'Deterministic') + '</span>';
    }
    svg += '</div>';

    return _wrapChart(svg, opts.title);
  }

  // ══════════════════════════════════════════════════════════════
  // svgTornado — Horizontal dual-color impact bars
  // ══════════════════════════════════════════════════════════════

  function svgTornado(factors, opts) {
    if (!factors || factors.length === 0) return "";
    opts = opts || {};
    var W = opts.width || 500, _tH = 30 * factors.length + 40;
    var _tMax = 1;
    factors.forEach(function(s) { _tMax = Math.max(_tMax, Math.abs(s.lo), Math.abs(s.hi)); });
    var _tScale = function(v) { return 250 + (v / _tMax) * 200; };

    var html = '';

    var _tornDataJson = JSON.stringify(factors).replace(/"/g, '&quot;');
    html += '<svg role="img" aria-label="' + (opts.title || (opts.fr ? 'Analyse de sensibilit\u00e9' : 'Sensitivity analysis')) + '" xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ' + W + ' ' + _tH + '" style="display:block;margin:6px 0" data-bf-chart="tornado" data-bf-chart-data="' + _tornDataJson + '"><title>' + (opts.title || (opts.fr ? 'Analyse de sensibilit\u00e9' : 'Sensitivity analysis')) + '</title>';
    html += '<line x1="250" x2="250" y1="15" y2="' + (_tH - 10) + '" stroke="' + C.gold + '" stroke-width="1" stroke-dasharray="2,2"/>';

    factors.forEach(function(s, i) {
      var yPos = 25 + i * 30;
      var xLo = _tScale(s.lo);
      var xHi = _tScale(s.hi);
      html += '<text x="10" y="' + (yPos + 5) + '" font-size="10" fill="#555" font-family="Inter,sans-serif">' + s.label + '</text>';
      if (s.lo < 0) html += '<rect x="' + Math.min(250, xLo) + '" y="' + (yPos - 8) + '" width="' + Math.abs(250 - xLo) + '" height="16" fill="' + C.red + '" rx="2" opacity=".7"/>';
      if (s.hi > 0) html += '<rect x="250" y="' + (yPos - 8) + '" width="' + Math.abs(xHi - 250) + '" height="16" fill="' + C.green + '" rx="2" opacity=".7"/>';
      html += '<text x="' + (xLo - 4) + '" y="' + (yPos + 4) + '" font-size="8" fill="' + C.red + '" text-anchor="end" font-family="JetBrains Mono,monospace">' + (s.lo < 0 ? f$(Math.round(s.lo)) : '') + '</text>';
      html += '<text x="' + (xHi + 4) + '" y="' + (yPos + 4) + '" font-size="8" fill="' + C.green + '" font-family="JetBrains Mono,monospace">' + (s.hi > 0 ? '+' + f$(Math.round(s.hi)) : '') + '</text>';
    });

    html += '<text x="250" y="' + (_tH - 2) + '" font-size="8" fill="#888" text-anchor="middle">Base</text>';
    html += '<text x="60" y="' + (_tH - 2) + '" font-size="7" fill="' + C.red + '" text-anchor="middle">\u2212 Impact ($)</text>';
    html += '<text x="440" y="' + (_tH - 2) + '" font-size="7" fill="' + C.green + '" text-anchor="middle">+ Impact ($)</text>';
    html += '</svg>';
    return _wrapChart(html, opts.title);
  }

  // ══════════════════════════════════════════════════════════════
  // svgHistogram — MC final wealth distribution
  // ══════════════════════════════════════════════════════════════

  function svgHistogram(bins, opts) {
    if (!bins || bins.length === 0) return "";
    opts = opts || {};
    var W = opts.width || 600, H = opts.height || 180;
    var ml = 50, mr = 10, mt = 14, mb = 36;
    var w = W - ml - mr, h2 = H - mt - mb;
    var maxCount = Math.max.apply(null, bins.map(function(b) { return b.count; })) || 1;
    var n = bins.length;
    var barW = w / n - 1;

    var _histDataJson = JSON.stringify(bins.map(function(b) { return { lo: b.lo, hi: b.hi, count: b.count }; })).replace(/"/g, '&quot;');
    var svg = '<svg role="img" aria-label="' + (opts.title || 'Histogram') + '" xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ' + W + ' ' + H + '" style="display:block;margin:8px 0" data-bf-chart="histogram" data-bf-chart-data="' + _histDataJson + '">';

    // Y-axis gridlines (visual reference — counts are approximate)
    for (var gi = 1; gi <= 3; gi++) {
      var gy = mt + h2 - h2 * gi / 4;
      svg += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + gy.toFixed(1) + '" y2="' + gy.toFixed(1) + '" stroke="#e8e0d4" stroke-width="0.5" stroke-dasharray="3,3"/>';
    }
    svg += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + (mt + h2) + '" y2="' + (mt + h2) + '" stroke="#d7cec1" stroke-width="0.8"/>';
    svg += '<line x1="' + ml + '" x2="' + ml + '" y1="' + mt + '" y2="' + (mt + h2) + '" stroke="#d7cec1" stroke-width="0.8"/>';

    // Bars — color based on percentile position relative to P25/P75
    bins.forEach(function(b, i) {
      var barH = b.count / maxCount * h2;
      var bx = ml + i * (w / n);
      var col;
      if (opts.p25 != null && opts.p75 != null) {
        var binMid = (b.lo + b.hi) / 2;
        col = binMid < 0 ? C.red : binMid < opts.p25 ? C.amber : binMid > opts.p75 ? C.green : C.gold;
      } else {
        var pct = i / Math.max(1, n - 1);
        col = pct < 0.3 ? C.red : pct < 0.6 ? C.gold : C.green;
      }
      svg += '<rect x="' + bx.toFixed(1) + '" y="' + (mt + h2 - barH).toFixed(1) + '" width="' + Math.max(1, barW - 1).toFixed(1) + '" height="' + barH.toFixed(1) + '" fill="' + col + '" opacity="0.65" rx="1"/>';
    });

    // X-axis wealth labels
    var xLabelStep = Math.max(1, Math.floor(n / 5));
    for (var xi = 0; xi < n; xi += xLabelStep) {
      var xPos = ml + xi * (w / n) + barW / 2;
      var xVal = (bins[xi].lo + bins[xi].hi) / 2;
      svg += '<text x="' + xPos.toFixed(1) + '" y="' + (mt + h2 + 14) + '" fill="#999" font-size="8" text-anchor="middle" font-family="JetBrains Mono">' + f$(xVal) + '</text>';
    }
    if (n > 1 && (n - 1) % xLabelStep !== 0) {
      var lastX = ml + (n - 1) * (w / n) + barW / 2;
      var lastVal = (bins[n - 1].lo + bins[n - 1].hi) / 2;
      svg += '<text x="' + lastX.toFixed(1) + '" y="' + (mt + h2 + 14) + '" fill="#999" font-size="8" text-anchor="middle" font-family="JetBrains Mono">' + f$(lastVal) + '</text>';
    }

    // P25/P50/P75 markers
    [{ v: opts.p25, label: 'P25', col: C.amber }, { v: opts.p50, label: 'P50', col: C.gold }, { v: opts.p75, label: 'P75', col: C.green }].forEach(function(m) {
      if (m.v !== undefined) {
        var mi = -1;
        for (var bi = 0; bi < bins.length; bi++) { if (m.v >= bins[bi].lo && m.v < bins[bi].hi) { mi = bi; break; } }
        if (mi >= 0) {
          var mx = ml + mi * (w / n) + barW / 2;
          svg += '<line x1="' + mx.toFixed(1) + '" x2="' + mx.toFixed(1) + '" y1="' + mt + '" y2="' + (mt + h2) + '" stroke="' + m.col + '" stroke-width="1.5" stroke-dasharray="4,2"/>';
          svg += '<text x="' + mx.toFixed(1) + '" y="' + (mt - 2) + '" fill="' + m.col + '" font-size="8" text-anchor="middle" font-weight="700">' + m.label + '</text>';
        }
      }
    });

    // Deterministic marker
    if (opts.detValue !== undefined) {
      var di = -1;
      for (var dbi = 0; dbi < bins.length; dbi++) { if (opts.detValue >= bins[dbi].lo && opts.detValue < bins[dbi].hi) { di = dbi; break; } }
      if (di >= 0) {
        var dx = ml + di * (w / n) + barW / 2;
        svg += '<line x1="' + dx.toFixed(1) + '" x2="' + dx.toFixed(1) + '" y1="' + mt + '" y2="' + (mt + h2) + '" stroke="#333" stroke-width="2"/>';
        svg += '<text x="' + dx.toFixed(1) + '" y="' + (mt + h2 + 26) + '" fill="#333" font-size="8" text-anchor="middle" font-weight="700">' + (opts.fr ? 'D\u00e9t.' : 'Det.') + '</text>';
      }
    }

    svg += '</svg>';

    // Color legend — labels reflect the actual percentile cutoffs plotted above.
    if (opts.p25 != null && opts.p75 != null) {
      svg += '<div class="chart-legend" style="padding-left:' + ml + 'px">';
      svg += '<span class="chart-legend-item"><span class="chart-legend-swatch" style="background:' + C.amber + ';opacity:0.65"></span>&lt; P25</span>';
      svg += '<span class="chart-legend-item"><span class="chart-legend-swatch" style="background:' + C.gold + ';opacity:0.65"></span>P25\u2013P75</span>';
      svg += '<span class="chart-legend-item"><span class="chart-legend-swatch" style="background:' + C.green + ';opacity:0.65"></span>&gt; P75</span>';
      svg += '</div>';
    }

    return _wrapChart(svg, opts.title);
  }

  // ══════════════════════════════════════════════════════════════
  // svgWaterfall — Horizontal bar waterfall
  // ══════════════════════════════════════════════════════════════

  function svgWaterfall(items, opts) {
    if (!items || items.length === 0) return "";
    opts = opts || {};
    var maxVal = Math.max.apply(null, items.map(function(i2) { return i2.value; }).concat([opts.total || 0])) || 1;
    var html = '';
    html += '<div style="border:1px solid ' + C.border + ';border-radius:6px;padding:10px;background:' + C.bg + '">';
    items.forEach(function(item) {
      var pct = item.value / maxVal * 100;
      html += '<div style="display:flex;align-items:center;margin-bottom:4px;gap:6px">';
      html += '<div style="width:100px;font-size:10px;color:#666;text-align:right;flex-shrink:0">' + item.label + '</div>';
      html += '<div style="flex:1;height:18px;background:#f5f0e8;border-radius:3px;overflow:hidden"><div style="width:' + Math.max(1, pct) + '%;height:100%;background:' + (item.color || C.gold) + ';border-radius:3px;opacity:0.75"></div></div>';
      html += '<div style="width:70px;font-size:10px;font-family:\'JetBrains Mono\',monospace;text-align:right">' + f$(item.value) + '</div>';
      html += '</div>';
    });
    if (opts.total) {
      html += '<div style="display:flex;align-items:center;gap:6px;padding-top:6px;border-top:2px solid ' + C.gold + ';margin-top:4px">';
      html += '<div style="width:100px;font-size:10px;font-weight:700;color:' + C.gold + ';text-align:right">Total</div>';
      html += '<div style="flex:1"></div>';
      html += '<div style="width:70px;font-size:12px;font-family:\'JetBrains Mono\',monospace;font-weight:700;color:' + C.gold + ';text-align:right">' + f$(opts.total) + '</div>';
      html += '</div>';
    }
    html += '</div>';
    return _wrapChart(html, opts.title);
  }

  // ══════════════════════════════════════════════════════════════
  // svgTimeline — Horizontal timeline with age markers
  // ══════════════════════════════════════════════════════════════

  function svgTimeline(markers) {
    if (!markers || markers.length === 0) return "";
    var html = '<div style="position:relative;height:60px;margin:16px 0;padding:0 20px">';
    html += '<div style="position:absolute;left:20px;right:20px;top:28px;height:3px;background:linear-gradient(90deg,' + C.gold + ',' + C.border + ');border-radius:2px"></div>';
    var n = markers.length;
    markers.forEach(function(m, i) {
      var left = (i / Math.max(1, n - 1)) * 100;
      html += '<div style="position:absolute;left:' + left + '%;top:12px;transform:translateX(-50%);text-align:center;z-index:1">';
      html += '<div style="width:12px;height:12px;border-radius:50%;background:' + C.gold + ';border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.15);margin:0 auto 3px"></div>';
      html += '<div style="font-size:11px;font-weight:700;color:' + C.gold + ';font-family:\'JetBrains Mono\',monospace">' + m.age + '</div>';
      html += '<div style="font-size:8px;color:#888;white-space:nowrap">' + m.label + '</div>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  // ══════════════════════════════════════════════════════════════
  // svgDonut — Simple donut chart for coverage ratio
  // ══════════════════════════════════════════════════════════════

  function svgDonut(pct, label, color, size) {
    size = size || 80;
    var r = size / 2 - 6;
    var circ = 2 * Math.PI * r;
    var dash = Math.min(1, Math.max(0, pct)) * circ;
    return '<svg role="img" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" style="display:block;margin:0 auto">' +
      '<circle cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + r + '" fill="none" stroke="#e8e0d4" stroke-width="6"/>' +
      '<circle cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + r + '" fill="none" stroke="' + (color || C.gold) + '" stroke-width="6" stroke-dasharray="' + dash.toFixed(1) + ' ' + circ.toFixed(1) + '" transform="rotate(-90 ' + (size / 2) + ' ' + (size / 2) + ')"/>' +
      '<text x="' + (size / 2) + '" y="' + (size / 2 + 4) + '" text-anchor="middle" font-size="14" font-weight="700" fill="' + (color || C.gold) + '" font-family="JetBrains Mono,monospace">' + Math.round(pct * 100) + '%</text>' +
      '</svg>' +
      (label ? '<div style="text-align:center;font-size:9px;color:#888;margin-top:2px">' + label + '</div>' : '');
  }

  // ══════════════════════════════════════════════════════════════
  // EXPORT
  // ══════════════════════════════════════════════════════════════

  window.BCharts = Object.freeze({
    svgArea: svgArea,
    svgFanChart: svgFanChart,
    svgTornado: svgTornado,
    svgHistogram: svgHistogram,
    svgWaterfall: svgWaterfall,
    svgTimeline: svgTimeline,
    svgDonut: svgDonut
  });

})();
