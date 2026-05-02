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

    // Collect Y range from the visible percentile band only. We intentionally
    // exclude P5 / P95 so the chart axis is calibrated to the decision-relevant
    // range (P10–P90). P5/P95 are statistical outliers that stretch the y-axis
    // and dwarf the centre of the distribution — they read as misleading on
    // fail-prone profiles (FIRE, debt, single parent) where the upper tail is
    // a few rare runaway scenarios, not a meaningful "favourable" outcome.
    var yMin = 0, yMax = 0;
    pD.forEach(function(d) {
      var vals = [d.mp_total || 0, d.rmp_total || 0];
      if (d.p10 != null) vals.push(d.p10);
      if (d.p90 != null) vals.push(d.p90);
      else if (d.p95 != null) vals.push(d.p95); // back-compat for old MC payloads
      vals.forEach(function(v) { yMax = Math.max(yMax, v); yMin = Math.min(yMin, v); });
    });
    if (yMax === yMin) yMax = yMin + 1;
    // Sprint 2.1: yMaxOverride caps visible range at caller's 99th percentile.
    if (opts.yMaxOverride != null && isFinite(opts.yMaxOverride) && opts.yMaxOverride > yMin) {
      yMax = Math.min(yMax, opts.yMaxOverride * 1.05);
    }
    var yRange = yMax - yMin;
    var x = function(i) { return ml + i / Math.max(1, pD.length - 1) * w; };
    var y = function(v) { return mt + h2 - (v - yMin) / yRange * h2; };

    // Tooltip data — encoded so report-tooltip.js can snap to nearest point
    // on hover. Keep only the fields the tooltip surfaces (age + percentiles).
    var _fanDataJson = JSON.stringify(pD.map(function(r) {
      return { age: r.age, p25: r.p25, p50: r.p50, p75: r.p75 };
    })).replace(/"/g, '&quot;');
    var svg = '<svg role="img"' + (opts.title ? ' aria-label="' + opts.title + '"' : '') + ' xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 ' + W + ' ' + H + '" style="display:block;margin:8px 0"' +
      ' data-bf-chart="fan" data-bf-chart-data="' + _fanDataJson + '" data-bf-fan-active="median">';

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

    // P10-P90 wide band + P25-P75 inner band. P5/P95 deliberately not
    // surfaced: they're noise for the reader, not signal.
    var hasBands = pD[0] && (pD[0].p10 != null || pD[0].p5 != null);
    if (hasBands) {
      var hasP90 = pD[0].p90 != null;
      // Wide band: P10-P90 (or P5-P95 fallback for legacy MC payloads)
      var wideUp = pD.map(function(d, i) {
        var top = hasP90 ? (d.p90 != null ? d.p90 : d.rmp_total) : (d.p95 != null ? d.p95 : d.rmp_total);
        return (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ',' + y(top || 0).toFixed(1);
      }).join(' ');
      var wideDn = '';
      for (var ri = pD.length - 1; ri >= 0; ri--) {
        var bot = hasP90 ? pD[ri].p10 : pD[ri].p5;
        wideDn += ' L' + x(ri).toFixed(1) + ',' + y(bot || 0).toFixed(1);
      }
      svg += '<path class="bf-fan-wide-band" d="' + wideUp + wideDn + ' Z" fill="' + C.gold + '" opacity="0.1"/>';

      // P25-P75 inner band — also draw P25-only and P75-only edge lines so
      // scenario chips can highlight them individually.
      if (pD[0].p25 != null) {
        var p25Up = pD.map(function(d, i) { return (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ',' + y(d.p75 || d.rmp_total || 0).toFixed(1); }).join(' ');
        var p25Dn = '';
        for (var ri2 = pD.length - 1; ri2 >= 0; ri2--) p25Dn += ' L' + x(ri2).toFixed(1) + ',' + y(pD[ri2].p25 || 0).toFixed(1);
        svg += '<path class="bf-fan-inner-band" d="' + p25Up + p25Dn + ' Z" fill="' + C.gold + '" opacity="0.15"/>';
        // Edge traces — hidden by default, revealed by scenario chip
        var p25Path = pD.map(function(d, i) { return (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ',' + y(d.p25 || d.rmp_total || 0).toFixed(1); }).join(' ');
        var p75Path = pD.map(function(d, i) { return (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ',' + y(d.p75 || d.rmp_total || 0).toFixed(1); }).join(' ');
        svg += '<path class="bf-fan-trace bf-fan-p25" d="' + p25Path + '" fill="none" stroke="#cc4444" stroke-width="2" stroke-dasharray="0" opacity="0"/>';
        svg += '<path class="bf-fan-trace bf-fan-p75" d="' + p75Path + '" fill="none" stroke="#2a8c46" stroke-width="2" stroke-dasharray="0" opacity="0"/>';
      }

      // P50 line
      var p50Path = pD.map(function(d, i) { return (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ',' + y(d.p50 || d.rmp_total || 0).toFixed(1); }).join(' ');
      svg += '<path class="bf-fan-trace bf-fan-p50" d="' + p50Path + '" fill="none" stroke="' + C.gold + '" stroke-width="2"/>';
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
      var wideLbl = (pD[0] && pD[0].p90 != null) ? 'P10\u2013P90' : 'P5\u2013P95';
      svg += '<span class="chart-legend-item"><span class="chart-legend-swatch" style="width:14px;height:8px;background:' + C.gold + ';opacity:0.2"></span>P25\u2013P75</span>';
      svg += '<span class="chart-legend-item"><span class="chart-legend-swatch" style="width:14px;height:8px;background:' + C.gold + ';opacity:0.08"></span>' + wideLbl + '</span>';
      svg += '<span class="chart-legend-item"><span class="chart-legend-swatch" style="width:14px;height:2px;background:' + C.gold + ';border-radius:0"></span>P50</span>';
      svg += '<span class="chart-legend-item"><span class="chart-legend-swatch" style="width:14px;height:0;border-top:1.5px dashed #333;border-radius:0;background:transparent"></span>' + (opts.fr ? 'D\u00e9terministe' : 'Deterministic') + '</span>';
    }
    svg += '</div>';

    // Sprint 1.4 — Scenario chip selector. Wraps the SVG + legend in a
    // chart-block so the runtime can switch which percentile trace is
    // emphasized. Chips: Cautious (P25 red), Median (P50 gold default),
    // Favourable (P75 green). Print-hidden — the active state freezes
    // on print so the saved PDF reflects the user's chosen lens.
    if (hasBands && pD[0] && pD[0].p25 != null) {
      var chipsHtml = '<div class="bf-fan-chips no-print" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#fdfbf6;border:1px solid #e8e0d4;border-top:none;border-radius:0 0 6px 6px;font-family:Inter,sans-serif;font-size:11px">' +
        '<span style="font-weight:700;color:#706558;letter-spacing:0.5px;text-transform:uppercase;font-size:10px">' +
          (opts.fr ? 'Sc\u00e9nario' : 'Scenario') + ':</span>' +
        '<button type="button" data-bf-fan-chip="cautious" style="background:transparent;border:1px solid #e8e0d4;border-radius:14px;padding:4px 12px;cursor:pointer;font-size:11px;font-weight:600;color:#706558;font-family:Inter,sans-serif">' +
          (opts.fr ? 'Prudent (P25)' : 'Cautious (P25)') + '</button>' +
        '<button type="button" data-bf-fan-chip="median" class="bf-fan-chip-active" style="background:#c49a1a;border:1px solid #c49a1a;border-radius:14px;padding:4px 12px;cursor:pointer;font-size:11px;font-weight:700;color:#fff;font-family:Inter,sans-serif">' +
          (opts.fr ? 'M\u00e9dian (P50)' : 'Median (P50)') + '</button>' +
        '<button type="button" data-bf-fan-chip="favourable" style="background:transparent;border:1px solid #e8e0d4;border-radius:14px;padding:4px 12px;cursor:pointer;font-size:11px;font-weight:600;color:#706558;font-family:Inter,sans-serif">' +
          (opts.fr ? 'Favorable (P75)' : 'Favourable (P75)') + '</button>' +
        '</div>';
      return _wrapChart(svg + chipsHtml, opts.title);
    }

    return _wrapChart(svg, opts.title);
  }

  // ══════════════════════════════════════════════════════════════
  // svgTornado — Horizontal dual-color impact bars
  // ══════════════════════════════════════════════════════════════

  function svgTornado(factors, opts) {
    if (!factors || factors.length === 0) return "";
    opts = opts || {};
    // Degenerate case: every factor's ±1σ swing rounds to ~$0 (e.g. when
    // capital exhausts at the floor under the deterministic plan, returns
    // and inflation swings can no longer move the median outcome). Drawing
    // a tornado here produces an empty axis with row labels and nothing
    // else — a trust-breaker. Substitute an explanatory callout instead.
    var _maxAbs = 0;
    factors.forEach(function(s) {
      _maxAbs = Math.max(_maxAbs, Math.abs(s.lo || 0), Math.abs(s.hi || 0));
    });
    if (_maxAbs < 100) {
      var fr = !!opts.fr;
      var note = fr
        ? 'Les variations de \u00b11\u202f\u00e9cart-type sur ces leviers ne d\u00e9placent plus le patrimoine final m\u00e9dian. Le plan se trouve coll\u00e9 contre une borne (\u00e9pargne \u00e9puis\u00e9e ou plafond fiscal), donc rendements et inflation cessent d\'\u00eatre les leviers dominants \u2014 la variance des d\u00e9penses et la s\u00e9quence de retraits prennent le relais.'
        : 'A \u00b11\u03c3 swing on these levers no longer moves median final wealth. The plan is pinned against a boundary (savings exhausted or tax ceiling), so returns and inflation are no longer the dominant levers \u2014 spending variance and the withdrawal sequence become the deciding factors.';
      return _wrapChart(
        '<div data-bf-chart="tornado" data-bf-chart-empty="boundary" style="background:#fdfbf6;border-left:3px solid ' + C.gold + ';padding:14px 18px;margin:8px 0;font-family:Inter,sans-serif;font-size:11.5px;line-height:1.65;color:#5a5448">' +
          '<strong style="color:' + C.gold + ';display:block;margin-bottom:4px;font-size:10.5px;text-transform:uppercase;letter-spacing:0.5px">' +
            (fr ? 'Sensibilit\u00e9 satur\u00e9e' : 'Sensitivity saturated') +
          '</strong>' + note +
        '</div>',
        opts.title
      );
    }
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
  // svgDonutMulti — Multi-slice donut for income source composition
  // ══════════════════════════════════════════════════════════════
  // Each slice consumes its proportional share of the circumference.
  // Renders the SVG only (caller wraps in layout). Center number is
  // the total annual income; legend is emitted as a separate <ul>.
  function svgDonutMulti(slices, opts) {
    opts = opts || {};
    var size = opts.size || 200;
    var r = size / 2 - 12;
    var cx = size / 2, cy = size / 2;
    var total = slices.reduce(function(s, sl) { return s + Math.max(0, sl.value || 0); }, 0);
    if (total <= 0) return '';
    var circ = 2 * Math.PI * r;
    var rotation = -90;
    var svg = '<svg role="img" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" style="display:block;margin:0 auto">';
    var offset = 0;
    slices.forEach(function(sl) {
      var v = Math.max(0, sl.value || 0);
      if (v <= 0) return;
      var dashLen = (v / total) * circ;
      svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + sl.color + '" stroke-width="22" ' +
        'stroke-dasharray="' + dashLen.toFixed(1) + ' ' + (circ - dashLen).toFixed(1) + '" ' +
        'stroke-dashoffset="' + (-offset).toFixed(1) + '" ' +
        'transform="rotate(' + rotation + ' ' + cx + ' ' + cy + ')"/>';
      offset += dashLen;
    });
    // Center text — total
    var totalLbl = total >= 1e6 ? Math.round(total / 1e5) / 10 + 'M$' : Math.round(total / 1e3) + 'K$';
    svg += '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" font-size="22" font-weight="700" fill="#252d39" font-family="JetBrains Mono,monospace">' + totalLbl + '</text>';
    if (opts.subLabel) {
      svg += '<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" font-size="10" fill="#888" font-family="Inter,sans-serif">' + opts.subLabel + '</text>';
    }
    svg += '</svg>';
    return svg;
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
    svgDonut: svgDonut,
    svgDonutMulti: svgDonutMulti,
    svgSunburst: svgSunburst
  });

  // ══════════════════════════════════════════════════════════════
  // svgSunburst — 2-ring donut: account types (inner) + asset class (outer)
  // ══════════════════════════════════════════════════════════════
  // accounts: [{ label, value, color, asset_eq?, asset_bnd? }] where the
  // outer ring uses asset_eq + asset_bnd proportions per account (default
  // 60/40 if not provided). Pure SVG, no JS, prints identically.
  function svgSunburst(accounts, opts) {
    opts = opts || {};
    var size = opts.size || 240;
    var cx = size / 2, cy = size / 2;
    var rOuter = size / 2 - 8;
    var rMid = rOuter - 24;
    var rInner = rMid - 28;
    var total = accounts.reduce(function(s, a) { return s + Math.max(0, a.value || 0); }, 0);
    if (total <= 0) return '';

    // Convert polar (angle in radians, radius) to (x,y).
    function polar(angle, r) {
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    }
    // Build an SVG arc path between two angles at given inner+outer radius.
    function arc(a0, a1, rIn, rOut) {
      var p0 = polar(a0, rOut), p1 = polar(a1, rOut);
      var p2 = polar(a1, rIn),  p3 = polar(a0, rIn);
      var large = (a1 - a0) > Math.PI ? 1 : 0;
      return 'M ' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) +
             ' A ' + rOut + ' ' + rOut + ' 0 ' + large + ' 1 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) +
             ' L ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1) +
             ' A ' + rIn + ' ' + rIn + ' 0 ' + large + ' 0 ' + p3[0].toFixed(1) + ' ' + p3[1].toFixed(1) +
             ' Z';
    }

    var svg = '<svg role="img" aria-label="' + (opts.title || 'Asset allocation') + '" xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" style="display:block;margin:0 auto">';

    // Two-ring rendering only when at least one account carries an explicit
    // asset_eq value. Without that, the inner ring would show a fake 60/40
    // default that visually reads as "equity/bond split" but is really just
    // a paler version of the outer ring — misleading. User flagged this.
    // 2026-05-01: pure single-ring donut when no allocation is provided.
    var hasAlloc = accounts.some(function(a) { return a.asset_eq != null; });

    // Sunburst convention (2026-05-01): the broader category (account type,
    // 3-5 buckets) goes on the INNER ring; the more granular split (equity
    // vs bond) goes on the OUTER ring. User flagged the previous rendering
    // as "l'inverse" — outer was account, inner was equity/bond, which is
    // backwards from how every other sunburst (Excel, D3, Tableau) reads.
    // Swapped now: inner = account type, outer = equity/bond.
    var startAngle = -Math.PI / 2;
    accounts.forEach(function(a) {
      var v = Math.max(0, a.value || 0);
      if (v <= 0) return;
      var sweep = (v / total) * 2 * Math.PI;
      var endAngle = startAngle + sweep;
      if (hasAlloc) {
        // 2-ring: inner = account type (bold), outer = equity/bond split.
        svg += '<path d="' + arc(startAngle, endAngle, rInner, rMid) + '" fill="' + a.color + '" stroke="#fff" stroke-width="2"/>';
        var eqShare = a.asset_eq != null ? a.asset_eq : 0.6;
        var bndShare = 1 - eqShare;
        var eqEnd = startAngle + sweep * eqShare;
        svg += '<path d="' + arc(startAngle, eqEnd, rMid, rOuter) + '" fill="' + a.color + '" opacity="0.55" stroke="#fff" stroke-width="1"/>';
        if (bndShare > 0) {
          svg += '<path d="' + arc(eqEnd, endAngle, rMid, rOuter) + '" fill="' + a.color + '" opacity="0.25" stroke="#fff" stroke-width="1"/>';
        }
      } else {
        // Single-ring: account type only, full radius. No fake equity/bond.
        svg += '<path d="' + arc(startAngle, endAngle, rInner, rOuter) + '" fill="' + a.color + '" stroke="#fff" stroke-width="2"/>';
      }
      startAngle = endAngle;
    });
    // Center total
    var totalLbl = total >= 1e6 ? Math.round(total / 1e5) / 10 + 'M$' : Math.round(total / 1e3) + 'K$';
    svg += '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" font-size="20" font-weight="700" fill="#252d39" font-family="JetBrains Mono,monospace">' + totalLbl + '</text>';
    if (opts.subLabel) {
      svg += '<text x="' + cx + '" y="' + (cy + 14) + '" text-anchor="middle" font-size="9" fill="#888" font-family="Inter,sans-serif">' + opts.subLabel + '</text>';
    }
    svg += '</svg>';
    return svg;
  }

})();
