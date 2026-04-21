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
    { key: 'advisor_letter', label: 'Advisor Letter',
      hint: '180-220 words. Warm, personal opening letter from the advisor to the client. Address them by first name. Reflect what they are likely worried about given their phase (accum/transition/decum), couple status, and any declared goals. Set expectations for what the report contains. End with "Consult a certified financial planner" if any action is hinted at. Tone: professional-human, not corporate. No numbers yet.' },
    { key: 'overall_assessment', label: 'Overall Assessment',
      hint: 'Synthesize the full picture in 4-6 sentences. Cover success rate, key strengths, main risk, and one actionable observation. This is the first thing the reader sees after the advisor letter.' },
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
      hint: '2 sentences on goal feasibility based on the projections. Reference specific goals by their declared description (verbatim) and their computed probability_met from the goals_ledger.' },
    { key: 'stress_interpretation', label: 'Stress Test Interpretation', conditional: 'stress',
      hint: '2-3 sentences reading the stress_scenarios results. Identify which scenario the plan is most vulnerable to, which it handles well, and what the pattern indicates about the plan\'s robustness. Reference the specific Δ success rate deltas.' }
  ];

  // ══════════════════════════════════════════════════════════════
  // SYSTEM PROMPT — voice rules, compliance, output format
  // ══════════════════════════════════════════════════════════════

  var SYSTEM_PROMPT =
    'You are a Canadian retirement planning analyst for BuildFi. ' +
    'You write clear, data-driven observations about retirement projections.\n\n' +
    '## COMPLIANCE RULES (AMF/OSFI)\n' +
    '- Use CONDITIONAL language only: could, would, might, may, appears to, suggests, indicates, pourrait, serait.\n' +
    '- NEVER use prescriptive language: should, must, recommend, advise, il faut, faudrait, doit, devra, devrait, devriez.\n' +
    '- NEVER use "il faudrait" or equivalent passive constructions that imply duty.\n' +
    '- You OBSERVE and ANALYZE. You do NOT advise or prescribe.\n' +
    '- End with "Consult a certified financial planner" if mentioning any specific action.\n\n' +
    '## DATA INTEGRITY — STRICT\n' +
    '- ONLY use numbers that appear LITERALLY in the DATA section below.\n' +
    '- Do NOT derive, sum, ratio, multiply, or recompute numbers in the narrative.\n' +
    '- If the DATA shows "p25Wealth: 435K$", write **435K$**, not **$435,000** and not "around $440K".\n' +
    '- If a value is null or absent, OMIT it from the narrative — do not infer it.\n' +
    '- The only allowed transformations are: copy verbatim, round already-rounded values differently is forbidden.\n' +
    '- If data is missing for a slot, write "Data insufficient for analysis." in that slot.\n\n' +
    '## CALIBRATION BY finLiteracy\n' +
    '- "beginner": NEVER use P25/P50/P75, percentiles, stochastic, volatility, alpha, MER, FERR/RRIF jargon. Translate to plain language.\n' +
    '  - P50 → "typical scenario" / "scenario typique"\n' +
    '  - P25 → "cautious scenario" / "scenario prudent"\n' +
    '  - P75 → "favourable scenario" / "scenario favorable"\n' +
    '  - Monte Carlo → "5000 simulated futures" / "5000 avenirs simules"\n' +
    '- "intermediate": technical terms OK but with brief context on first use.\n' +
    '- "advanced": full technical vocabulary acceptable.\n\n' +
    '## CALIBRATION BY detailPreference\n' +
    '- "concise": MAX 2 sentences per slot. Strip qualifying clauses. Use short sentences.\n' +
    '- "balanced": 2-3 sentences per slot.\n' +
    '- "detailed": 2-4 sentences per slot (max 5 for overall_assessment).\n\n' +
    '## STYLE\n' +
    '- Professional but warm. Not robotic.\n' +
    '- Use bold (**text**) for key numbers — and only for numbers that appear in DATA verbatim.\n' +
    '- Bilingual: respond in the language specified in the DATA section.\n' +
    '- Use client first name and goal descriptions verbatim when relevant.\n\n' +
    '## CROSS-SECTION SYNTHESIS\n' +
    '- An "adjacent_findings" object provides numbers from neighboring sections.\n' +
    '- For each slot, weave in ONE relevant adjacent finding (not all of them).\n' +
    '- The goal is one continuous analysis — not isolated paragraphs.\n\n' +
    '## OUTPUT FORMAT\n' +
    'Return a JSON object with slot keys as properties. Each value is a string (plain text with **bold** for emphasis).\n' +
    'Only include slots listed in the REQUESTED SLOTS section.\n' +
    'Do not include markdown code fences — just the raw JSON object.';

  // ══════════════════════════════════════════════════════════════
  // DATA EXTRACTION — pulls all numbers the AI needs from the payload
  // ══════════════════════════════════════════════════════════════

  // Numeric integrity helpers — guard against NaN/Infinity/null reaching the AI.
  // f$ and fM render "—" on invalid input; "—" in the DATA block invites hallucination.
  function _fin(v) { return (typeof v === 'number' && isFinite(v)) ? v : null; }
  function _finStr(fn, v, fallback) {
    var n = _fin(v);
    return n === null ? (fallback == null ? null : fallback) : fn(n);
  }

  function extractData(d) {
    var p = d.p, mc = d.mc, fr = d.fr;
    var f$ = window.BFmt.fmtCompact;
    var fM = function(v) { return window.BFmt.fmtMoney(v, fr); };

    // Validate core numerics up front. If any are invalid, downstream slots are unreliable.
    var _coreFields = {
      succVal: _fin(d.succVal),
      medF: _fin(mc && (mc.rMedF != null ? mc.rMedF : mc.medF)),
      covRatio: _fin(d.covRatio),
      avgEffRate: _fin(d.avgEffRate)
    };
    var _missingCore = Object.keys(_coreFields).filter(function(k) { return _coreFields[k] === null; });
    var _coreInvalid = _missingCore.length > 0;

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
      narrativePreferences: {
        finLiteracy: d.finLiteracy || p.finLiteracy || 'intermediate',
        stressLevel: d.stressLevel || p.stressLevel || 'moderate',
        detailPreference: d.detailPref || p.detailPref || 'balanced'
      },

      // Savings
      totalSavings: f$(d.totalBal),
      rrsp: f$(p.rrsp || 0),
      tfsa: f$(p.tfsa || 0),
      nr: f$(p.nr || 0),

      // MC results
      successRate: _coreFields.succVal == null ? 'pending' : Math.round(_coreFields.succVal * 100) + '%',
      grade: window.BFmt.grade(_coreFields.succVal, fr).letter,
      gradeLabel: window.BFmt.grade(_coreFields.succVal, fr).label,
      p50Wealth: _finStr(f$, _coreFields.medF),
      p25Wealth: _finStr(f$, (mc.rP25F != null ? mc.rP25F : (mc.p25F != null ? mc.p25F : (mc.rVar5 != null ? mc.rVar5 : mc.var5)))),
      p75Wealth: _finStr(f$, (mc.rP75F != null ? mc.rP75F : mc.p75F)),
      savingsDurability: (function() {
        var r = _fin(mc && mc.p5Ruin);
        if (r == null) return null;
        return r >= 200 ? 'never depleted' : 'depleted at age ' + r;
      })(),
      nSim: p.nSim || 5000,

      // Income
      govCoverageRatio: _coreFields.covRatio == null ? null : Math.round(_coreFields.covRatio * 100) + '%',
      monthlyGap: _finStr(fM, d.gapM),
      qppMonthly: _finStr(fM, d.qppM),
      oasMonthly: _finStr(fM, d.oasM),
      totalGovMonthly: _finStr(fM, d.govM),
      monthlySpending: _finStr(fM, d.totalSpM),

      // Withdrawal rate
      initWR: d._wdPct ? d._wdPct + '%' : null,

      // Tax
      avgEffectiveRate: _coreFields.avgEffRate == null ? null : (_coreFields.avgEffRate * 100).toFixed(1) + '%',
      lifetimeTax: _finStr(f$, d._optTax),
      taxAlpha: (function() {
        var a = _fin(d._taxAlpha);
        return (a != null && a > 0) ? f$(Math.round(a)) : null;
      })(),
      oasClawbackYears: _fin(d.oasClbkYrs),

      // Fees
      weightedMER: _fin(d.merWt) == null ? null : (d.merWt * 100).toFixed(2) + '%',
      lifetimeFeeCost: _finStr(f$, d.feeCost),

      // Estate
      netEstate: _finStr(f$, mc && mc.medEstateNet),
      taxAtDeath: _finStr(f$, mc && mc.medEstateTax),
      cautionEstate: _finStr(f$, mc && (mc.p25EstateNet != null ? mc.p25EstateNet : mc.p5EstateNet))
    };

    // Integrity flag — callers should skip AI or show fallbacks when core data is invalid.
    data._integrity = {
      coreInvalid: _coreInvalid,
      missingCoreFields: _missingCore
    };

    // NOTE: `adjacent_findings` is built AFTER the conditional blocks below
    // (couple/meltdown/realEstate/corp/debt/rsu/gis/family/goals/strategies).
    // A prior version built it here, at which point data.corp/gis/debts/meltdown
    // were all undefined → the AI received nulls for cross-section synthesis.
    // See the end of extractData for the actual assembly.

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

    // Adjacent-section findings — assembled LAST so conditional blocks above
    // (corp/gis/debts/meltdown/realEstate/rsu) have populated their data.
    // The AI is encouraged to reference 1 adjacent finding per slot so the
    // document reads as one continuous analysis, not N disconnected sections.
    data.adjacent_findings = {
      income: {
        coverage: data.govCoverageRatio,
        gap_monthly: data.monthlyGap,
        dominant_source: (function() {
          var q = _fin(d.qppM) || 0, o = _fin(d.oasM) || 0, pen = (p.penM || 0);
          var top = Math.max(q, o, pen);
          if (top === 0) return null;
          return top === q ? (fr ? 'RRQ/RPC' : 'QPP/CPP') : (top === o ? 'PSV/OAS' : (fr ? 'pension' : 'pension'));
        })()
      },
      tax: {
        lifetime: data.lifetimeTax,
        effective_rate: data.avgEffectiveRate,
        clawback_years: data.oasClawbackYears,
        alpha: data.taxAlpha
      },
      estate: {
        net: data.netEstate,
        tax_at_death: data.taxAtDeath
      },
      risk: {
        p25: data.p25Wealth,
        p75: data.p75Wealth,
        durability: data.savingsDurability
      },
      corp: data.corp || null,
      gis: data.gis || null,
      debt: data.debts || null,
      meltdown: data.meltdown || null,
      realEstate: data.realEstate || null,
      rsu: data.rsu || null
    };

    // Enriched engine data (Phase 2) — surfaces real goals ledger, estate
    // waterfall decomposition, stress-test succession, and allocation view
    // so the AI has concrete numbers to weave into each section without
    // fabricating. Only populated when gen-real-mc.mjs has written them.
    var enr = mc && mc._enriched ? mc._enriched : null;
    if (enr) {
      if (enr.goalsLedger && enr.goalsLedger.length) {
        data.goals_ledger = enr.goalsLedger.map(function(g) {
          return {
            desc: g.desc,
            amount: f$(g.amount),
            age: g.targetAge,
            probability_met: g.probabilityMet + '%',
            status: g.status,
            median_available: f$(g.medianAvailable)
          };
        });
      }
      if (enr.estateWaterfall) {
        var ew = enr.estateWaterfall;
        data.estate_waterfall = {
          gross: f$(ew.grossEstate),
          rrsp_tax: f$(ew.deductions.rrspTax),
          cg_tax: f$(ew.deductions.cgTax),
          probate: f$(ew.deductions.probate),
          probate_note: ew.probateConfig ? ew.probateConfig.note : null,
          net: f$(ew.net),
          p25_net: ew.p25Net != null ? f$(ew.p25Net) : null
        };
      }
      if (enr.allocation) {
        data.allocation = {
          equity_pct: enr.allocation.blended.equityPct + '%',
          bond_pct: enr.allocation.blended.bondPct + '%',
          total: f$(enr.allocation.totalWealth)
        };
      }
    }

    // Stress scenarios — per-scenario success rate + medF for AI to reference.
    if (mc && mc._stress) {
      data.stress_scenarios = Object.keys(mc._stress).map(function(k) {
        var s = mc._stress[k];
        return {
          scenario: k,
          success_rate: s.succ != null ? Math.round(s.succ * 100) + '%' : null,
          medF: s.medF != null ? f$(s.medF) : null,
          p25: s.p25F != null ? f$(s.p25F) : null
        };
      });
    }

    // Sweeps — paired up/down deltas vs baseline. AI can quote "returns -1% → medF drops X".
    if (mc && mc._sweeps) {
      data.sensitivity_sweeps = {
        returns_up_medF: mc._sweeps.returns && mc._sweeps.returns.up ? f$(mc._sweeps.returns.up.medF) : null,
        returns_down_medF: mc._sweeps.returns && mc._sweeps.returns.down ? f$(mc._sweeps.returns.down.medF) : null,
        inflation_up_medF: mc._sweeps.inflation && mc._sweeps.inflation.up ? f$(mc._sweeps.inflation.up.medF) : null,
        inflation_down_medF: mc._sweeps.inflation && mc._sweeps.inflation.down ? f$(mc._sweeps.inflation.down.medF) : null
      };
    }

    return data;
  }

  // ══════════════════════════════════════════════════════════════
  // BUILD PROMPT — combines system + data + slot instructions
  // ══════════════════════════════════════════════════════════════

  function buildPrompt(d) {
    var data = extractData(d);
    var prefs = data.narrativePreferences || {};

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
      if (s.conditional === 'stress') return !!(data.stress_scenarios && data.stress_scenarios.length);
      return true;
    });

    // Build user prompt
    var userPrompt = '## DATA\n```json\n' + JSON.stringify(data, null, 2) + '\n```\n\n';
    if (data._integrity && data._integrity.coreInvalid) {
      userPrompt += '## DATA INTEGRITY WARNING\n';
      userPrompt += 'Core metrics are missing or invalid (' + data._integrity.missingCoreFields.join(', ') + '). ';
      userPrompt += 'Respond with "Data insufficient for analysis." for every slot. Do not infer or estimate.\n\n';
    }
    userPrompt += '## NARRATIVE CALIBRATION\n';
    userPrompt += '- stress_level: ' + (prefs.stressLevel || 'moderate') + '\n';
    userPrompt += '- financial_literacy: ' + (prefs.finLiteracy || 'intermediate') + '\n';
    userPrompt += '- detail_preference: ' + (prefs.detailPreference || 'balanced') + '\n\n';
    userPrompt += '## REQUESTED SLOTS\n';
    requestedSlots.forEach(function(s) {
      userPrompt += '### ' + s.key + ' (' + s.label + ')\n' + s.hint + '\n\n';
    });
    userPrompt += '## RESPONSE\nReturn JSON with these keys: ' + requestedSlots.map(function(s) { return '"' + s.key + '"'; }).join(', ') + '\n';
    userPrompt += 'Language: ' + (data.lang === 'fr' ? 'French (Canadian)' : 'English (Canadian)') + '\n';

    return {
      system: SYSTEM_PROMPT,
      user: userPrompt,
      slotKeys: requestedSlots.map(function(s) { return s.key; }),
      integrity: data._integrity
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

    // Filter to only requested slots and ensure string values.
    // Leave markdown intact — AiBlock escapes HTML first, then promotes **bold**.
    // This guarantees no raw HTML from the AI reaches the DOM.
    var result = {};
    slotKeys.forEach(function(key) {
      if (json[key] && typeof json[key] === 'string') {
        result[key] = json[key];
      }
    });

    return result;
  }

  // ══════════════════════════════════════════════════════════════
  // EXPORT
  // ══════════════════════════════════════════════════════════════

  window.BAiPrompt = Object.freeze({
    SLOTS: SLOTS,
    buildPrompt: buildPrompt,
    parseResponse: parseResponse,
    extractData: extractData
  });

})();
