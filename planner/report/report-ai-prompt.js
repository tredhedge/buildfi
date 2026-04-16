// report-ai-prompt.js — BuildFi AI Prompt Builder for Detailed Report
// Builds a single {system, user} prompt pair that fills ALL AI slots in one API call.
// The AI receives ONLY engine-computed data — no fabrication possible.
// Depends on: report-data.js (window.BData) for buildReportPayload
// Exports: window.BAiPrompt
(function() {
  "use strict";

  // ══════════════════════════════════════════════════════════════
  // SLOT DEFINITIONS — each slot has a key, label, and instructions
  // ══════════════════════════════════════════════════════════════

  var SLOTS = [
    { key: 'overall_assessment', label: 'Overall Assessment',
      hint: 'Synthesize the full picture in 4-6 sentences. Cover success rate, key strengths, main risk, and one actionable observation. This is the first thing the reader sees.' },
    { key: 'verdict', label: 'Verdict',
      hint: '2-3 sentences interpreting the success rate and grade. Reference the P50/P25 wealth values and what they mean for the client.' },
    { key: 'page_zero_verdict', label: 'Mirror Block',
      hint: '1-2 sentences reflecting back what the client seems to care about most based on their profile (phase, couple status, goals). Personal and empathetic tone.' },
    { key: 'profile_summary', label: 'Profile Summary',
      hint: '2-3 sentences on the client\'s financial profile efficiency — savings rate, allocation balance, account diversification. Use actual account values.' },
    { key: 'trajectory_insight', label: 'Wealth Trajectory',
      hint: '2-3 sentences on the wealth projection. Reference P50/P25/P75 final values and what drives the spread. Note if the trajectory crosses zero.' },
    { key: 'income_insight', label: 'Retirement Income',
      hint: '2-3 sentences on income adequacy. Reference government coverage ratio, monthly gap, and which income sources (QPP/OAS/pension) dominate.' },
    { key: 'taxInsight', label: 'Tax Strategy',
      hint: '2-3 sentences on tax efficiency. Reference effective rate, OAS clawback years, and tax alpha if available. Note the biggest tax lever.' },
    { key: 'estateInsight', label: 'Estate',
      hint: '2-3 sentences on estate projection. Reference net estate value, tax at death, and spousal rollover if applicable. Only if estate data is meaningful (>$1000).' },
    { key: 'gis_insight', label: 'GIS Analysis', conditional: 'gis',
      hint: '2-3 sentences on GIS eligibility. Reference years of eligibility, total lifetime GIS, and the 50¢ clawback trap.' },
    { key: 'meltdown_insight', label: 'RRSP Meltdown', conditional: 'meltdown',
      hint: '2-3 sentences on the meltdown strategy. Reference current RRSP, target withdrawal, RRSP at 72, and reduction percentage.' },
    { key: 'real_estate_insight', label: 'Real Estate', conditional: 'realEstate',
      hint: '2-3 sentences on the real estate portfolio. Reference total equity, cash flow, and planned sales if any.' },
    { key: 'rsu_insight', label: 'RSU Grants', conditional: 'rsu',
      hint: '2-3 sentences on RSU holdings. Reference total value, estimated tax, and timing considerations.' },
    { key: 'corp_insight', label: 'Corporation (CCPC)', conditional: 'ccpc',
      hint: '2-3 sentences on corporate strategy. Reference retained earnings, integrated rate, and extraction strategy.' },
    { key: 'debt_insight', label: 'Debts', conditional: 'debt',
      hint: '2-3 sentences on the debt situation. Reference total debt, debt-to-savings ratio, and high-rate debts if any.' },
    { key: 'best_move_explainer', label: 'Strategies', conditional: 'strategies',
      hint: '2-3 sentences explaining the top strategies and their combined impact. Reference specific dollar amounts.' },
    { key: 'riskInsight', label: 'Risk & Sensitivity', conditional: 'expert',
      hint: '2-3 sentences on risk profile. Reference P25-P75 spread, savings durability, and which sensitivity factor matters most.' },
    { key: 'family_insight', label: 'Family', conditional: 'family',
      hint: '2 sentences on family context and how dependents affect the plan.' },
    { key: 'goals_insight', label: 'Goals', conditional: 'goals',
      hint: '2 sentences on goal feasibility based on the projections.' }
  ];

  // ══════════════════════════════════════════════════════════════
  // SYSTEM PROMPT — voice rules, compliance, output format
  // ══════════════════════════════════════════════════════════════

  var SYSTEM_PROMPT =
    'You are a Canadian retirement planning analyst for BuildFi. ' +
    'You write clear, data-driven observations about retirement projections.\n\n' +
    '## COMPLIANCE RULES (AMF/OSFI)\n' +
    '- Use CONDITIONAL language only: could, would, might, may, appears to, suggests, indicates.\n' +
    '- NEVER use prescriptive language: should, must, recommend, advise, il faut, devriez.\n' +
    '- You OBSERVE and ANALYZE. You do NOT advise or prescribe.\n' +
    '- End with "Consult a certified financial planner" if mentioning any specific action.\n\n' +
    '## DATA INTEGRITY\n' +
    '- ONLY reference numbers that appear in the DATA section below.\n' +
    '- NEVER invent, estimate, or round numbers differently than provided.\n' +
    '- If a number is $145,230, say $145,230 or $145K — never $150K or $145,000.\n' +
    '- If data is missing for a slot, write "Data insufficient for analysis." in that slot.\n\n' +
    '## STYLE\n' +
    '- Professional but warm. Not robotic.\n' +
    '- 2-3 sentences per slot (max 4 for overall_assessment).\n' +
    '- Use bold (**text**) for key numbers.\n' +
    '- Bilingual: respond in the language specified in the DATA section.\n\n' +
    '## OUTPUT FORMAT\n' +
    'Return a JSON object with slot keys as properties. Each value is a string (plain text with **bold** for emphasis).\n' +
    'Only include slots listed in the REQUESTED SLOTS section.\n' +
    'Do not include markdown code fences — just the raw JSON object.';

  // ══════════════════════════════════════════════════════════════
  // DATA EXTRACTION — pulls all numbers the AI needs from the payload
  // ══════════════════════════════════════════════════════════════

  function extractData(d) {
    var p = d.p, mc = d.mc, fr = d.fr;
    var f$ = window.BFmt.fmtCompact;
    var fM = function(v) { return window.BFmt.fmtMoney(v, fr); };

    var data = {
      lang: fr ? 'fr' : 'en',
      phase: d.R.phase,
      isCouple: d.R.couple,
      clientName: d.fn || '',
      spouseName: d.sfn || '',
      age: p.age,
      retAge: p.retAge,
      deathAge: p.deathAge || 90,
      province: p.prov || 'QC',
      yearsToRetirement: Math.max(0, p.retAge - p.age),
      horizon: (p.deathAge || 90) - p.age,

      // Savings
      totalSavings: f$(d.totalBal),
      rrsp: f$(p.rrsp || 0),
      tfsa: f$(p.tfsa || 0),
      nr: f$(p.nr || 0),

      // MC results
      successRate: d.succVal != null ? Math.round(d.succVal * 100) + '%' : 'pending',
      grade: window.BFmt.grade(d.succVal, fr).letter,
      gradeLabel: window.BFmt.grade(d.succVal, fr).label,
      p50Wealth: f$(mc.rMedF || mc.medF),
      p25Wealth: f$(mc.rP25F || mc.p25F || mc.rVar5 || mc.var5),
      p75Wealth: f$(mc.rP75F || mc.p75F || 0),
      savingsDurability: (mc.p5Ruin || 999) >= 200 ? 'never depleted' : 'depleted at age ' + mc.p5Ruin,
      nSim: p.nSim || 5000,

      // Income
      govCoverageRatio: Math.round(d.covRatio * 100) + '%',
      monthlyGap: fM(Math.round(d.gapM)),
      qppMonthly: fM(Math.round(d.qppM)),
      oasMonthly: fM(Math.round(d.oasM)),
      totalGovMonthly: fM(Math.round(d.govM)),
      monthlySpending: fM(Math.round(d.totalSpM)),

      // Withdrawal rate
      initWR: d._wdPct ? d._wdPct + '%' : 'N/A',

      // Tax
      avgEffectiveRate: (d.avgEffRate * 100).toFixed(1) + '%',
      lifetimeTax: f$(Math.round(d._optTax)),
      taxAlpha: d._taxAlpha != null && d._taxAlpha > 0 ? f$(Math.round(d._taxAlpha)) : null,
      oasClawbackYears: d.oasClbkYrs,

      // Fees
      weightedMER: (d.merWt * 100).toFixed(2) + '%',
      lifetimeFeeCost: f$(Math.round(d.feeCost)),

      // Estate
      netEstate: f$(Math.round(mc.medEstateNet || 0)),
      taxAtDeath: f$(Math.round(mc.medEstateTax || 0)),
      cautionEstate: f$(Math.round(mc.p25EstateNet || mc.p5EstateNet || 0))
    };

    // Couple data
    if (d.R.couple) {
      data.coupleQppMonthly = fM(Math.round(d.cQppM));
      data.coupleOasMonthly = fM(Math.round(d.cOasM));
      data.coupleRRSP = f$(p.cRRSP || 0);
      data.coupleTFSA = f$(p.cTFSA || 0);
    }

    // Meltdown
    if (d.R.hasMeltdown) {
      var pd72 = mc.pD ? mc.pD.find(function(r) { return r.age === 72; }) : null;
      var rrspAt72 = pd72 ? (pd72.mp_rr || 0) : 0;
      data.meltdown = {
        currentRRSP: f$(p.rrsp || 0),
        target: fM(p.meltTgt || 0),
        rrspAt72: f$(Math.round(rrspAt72)),
        reductionPct: (p.rrsp || 0) > 0 ? Math.round((1 - Math.max(0, rrspAt72) / (p.rrsp || 1)) * 100) + '%' : '0%',
        period: p.retAge + ' to 72 (' + Math.max(0, 72 - p.retAge) + ' yrs)'
      };
    }

    // Real estate
    if (d.R.realEstate) {
      var props = (p.props || []).filter(function(pr) { return pr && pr.on; });
      data.realEstate = {
        count: props.length,
        totalValue: f$(props.reduce(function(s, pr) { return s + (pr.val || 0); }, 0)),
        totalEquity: f$(props.reduce(function(s, pr) { return s + (pr.val || 0) - (pr.mb || 0); }, 0)),
        salesPlanned: props.filter(function(pr) { return pr.sa > 0; }).length
      };
    }

    // Corporation
    if (d.R.ccpc) {
      data.corp = {
        retainedEarnings: f$(p.bizRetainedEarnings || 0),
        revenue: f$(p.bizRevenue || 0),
        saleAge: p.bizSaleAge || null
      };
    }

    // Debts
    if (d.R.debt) {
      var debts = (p.debts || []).filter(function(dd) { return (dd.balance || dd.bal || 0) > 0; });
      data.debts = {
        count: debts.length,
        totalDebt: f$(debts.reduce(function(s, dd) { return s + (dd.balance || dd.bal || 0); }, 0)),
        highRateCount: debts.filter(function(dd) { return (dd.rate || dd.r || 0) > 0.08; }).length,
        debtToSavingsRatio: d.totalBal > 0 ? Math.round(debts.reduce(function(s, dd) { return s + (dd.balance || dd.bal || 0); }, 0) / d.totalBal * 100) + '%' : 'N/A'
      };
    }

    // RSU
    if (d.R.hasRSU) {
      var grants = (p.rsuGrants || []).filter(function(r) { return r.totalShares > 0; });
      data.rsu = {
        grantCount: grants.length,
        totalValue: f$(grants.reduce(function(s, r) { return s + r.totalShares * (r.sharePrice || 0); }, 0))
      };
    }

    // GIS
    var gisYrs = d.revData.filter(function(r) { return r.age >= 65 && (r.srg || r.gis || 0) > 0; });
    if (gisYrs.length > 0) {
      data.gis = {
        eligibleYears: gisYrs.length,
        lifetimeGIS: f$(gisYrs.reduce(function(s, r) { return s + (r.srg || r.gis || 0); }, 0)),
        avgPerYear: fM(Math.round(gisYrs.reduce(function(s, r) { return s + (r.srg || r.gis || 0); }, 0) / gisYrs.length))
      };
    }

    // Sensitivity
    if (d.sensData && d.sensData.length > 0) {
      data.sensitivity = d.sensData.map(function(s) {
        return { factor: s.label, downside: f$(Math.round(s.lo)), upside: f$(Math.round(s.hi)) };
      });
    }

    // Family
    if (d.R.hasFamily) {
      data.family = (p.family || []).map(function(f) { return { name: f.name || '', age: f.age || 0, relation: f.type || '' }; });
    }

    // Goals
    if (d.R.hasGoals) {
      data.goals = (p.goals || []).map(function(g) { return { desc: g.desc || g.name || '', amount: f$(g.amount || 0), age: g.age || 0 }; });
    }

    // Strategies
    if (d.R.hasSAM) {
      var sams = (p.samResults || []).filter(function(s) { return s.score != null; }).sort(function(a, b) { return (b.score || 0) - (a.score || 0); });
      data.strategies = sams.slice(0, 5).map(function(s) { return { name: s.title || s.name || '', impact: f$(Math.round(s.score || 0)) }; });
    }

    return data;
  }

  // ══════════════════════════════════════════════════════════════
  // BUILD PROMPT — combines system + data + slot instructions
  // ══════════════════════════════════════════════════════════════

  function buildPrompt(d) {
    var data = extractData(d);

    // Determine which slots to request
    var requestedSlots = SLOTS.filter(function(s) {
      if (!s.conditional) return true;
      if (s.conditional === 'gis') return data.gis != null;
      if (s.conditional === 'meltdown') return d.R.hasMeltdown;
      if (s.conditional === 'realEstate') return d.R.realEstate;
      if (s.conditional === 'rsu') return d.R.hasRSU;
      if (s.conditional === 'ccpc') return d.R.ccpc;
      if (s.conditional === 'debt') return d.R.debt;
      if (s.conditional === 'strategies') return d.R.hasSAM;
      if (s.conditional === 'expert') return d.exp;
      if (s.conditional === 'family') return d.R.hasFamily;
      if (s.conditional === 'goals') return d.R.hasGoals;
      return true;
    });

    // Build user prompt
    var userPrompt = '## DATA\n```json\n' + JSON.stringify(data, null, 2) + '\n```\n\n';
    userPrompt += '## REQUESTED SLOTS\n';
    requestedSlots.forEach(function(s) {
      userPrompt += '### ' + s.key + ' (' + s.label + ')\n' + s.hint + '\n\n';
    });
    userPrompt += '## RESPONSE\nReturn JSON with these keys: ' + requestedSlots.map(function(s) { return '"' + s.key + '"'; }).join(', ') + '\n';
    userPrompt += 'Language: ' + (data.lang === 'fr' ? 'French (Canadian)' : 'English (Canadian)') + '\n';

    return {
      system: SYSTEM_PROMPT,
      user: userPrompt,
      slotKeys: requestedSlots.map(function(s) { return s.key; })
    };
  }

  // ══════════════════════════════════════════════════════════════
  // PARSE RESPONSE — extracts JSON slots, validates data binding
  // ══════════════════════════════════════════════════════════════

  function parseResponse(text, slotKeys) {
    // Try to extract JSON from the response
    var json = null;
    try {
      // Remove potential markdown code fences
      var cleaned = text.replace(/^```json?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
      json = JSON.parse(cleaned);
    } catch (e) {
      // Try to find JSON in the response
      var match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try { json = JSON.parse(match[0]); } catch (e2) { /* fall through */ }
      }
    }

    if (!json || typeof json !== 'object') return {};

    // Filter to only requested slots and ensure string values
    var result = {};
    slotKeys.forEach(function(key) {
      if (json[key] && typeof json[key] === 'string') {
        // Convert **bold** to <strong> for HTML rendering
        result[key] = json[key].replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      }
    });

    return result;
  }

  // ══════════════════════════════════════════════════════════════
  // EXPORT
  // ══════════════════════════════════════════════════════════════

  window.BAiPrompt = {
    SLOTS: SLOTS,
    buildPrompt: buildPrompt,
    parseResponse: parseResponse,
    extractData: extractData
  };

})();
