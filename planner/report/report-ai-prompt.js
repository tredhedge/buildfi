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
      hint: '320-380 words. 4 paragraphs. Warm, personal opening letter from the advisor to the client. Address them by first name. Structure: (¶1) greet by name + reflect what they are likely worried about given their phase (accum: "decisions made now compound the most"; transition: "the next 3-5 years carry more weight than the next 30"; decum: "you have done the saving — now comes the part you have never had to do before") + one sentence specific to their declared goals or family situation. (¶2) acknowledge in plain terms the work that brought them here — wealth amount in round figures, dominant income sources, the one or two structural choices already made (couple plan, real estate, CCPC, etc.). (¶3) preview the report by what each piece DELIVERS, not by topic: name the executive summary (verdict in 30 seconds), Chapter I (foundations and projection), Chapter II (the risk you would be taking), Chapter III (strategies and decisions), Chapter IV (alternatives to test). Use "I encourage particular attention to..." once for the most relevant chapter. (¶4) close with a personal sign-off and "Consult a certified financial planner before acting on any observation in this report." Tone: professional-human, observational, AMF-safe (conditional language for projections — pourrait/serait/might/would). No raw numbers in ¶1; round figures OK in ¶2.' },
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
      hint: '4-5 sentences (80\u2013120 words) on tax efficiency. Cover ALL of: (1) effective rate vs gross income, (2) OAS clawback years and their fiscal cost, (3) tax-alpha vs naive strategy if available, (4) the dominant lever (account ordering, meltdown window, splitting, deferral), (5) one province-specific note (QC vs ROC bracket impact). Avoid the word "alpha" \u2014 use "savings" / "\u00e9conomies".' },
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
    '## COMPLIANCE RULES (AMF/OSFI) — FIRM, NON-NEGOTIABLE\n' +
    'Your output is post-processed by a server-side regex sanitizer that DROPS\n' +
    'any slot containing prescriptive verbs. A dropped slot ships an empty\n' +
    'fallback to the user — bad outcome. Stay observational to keep your text.\n\n' +
    'OBSERVATIONAL VERBS (use these): could, would, might, may, appears to,\n' +
    'suggests, indicates, pourrait, serait, semblerait, paraît.\n\n' +
    'PRESCRIPTIVE VERBS (FORBIDDEN, output gets dropped): should, must,\n' +
    'recommend, advise, suggest (as in "we suggest"), ought to, need to, make\n' +
    'sure, ensure, consider <X>ing, optimisez, priorisez, il faut, il faudrait,\n' +
    'doit, devra, devrait, devraient, devriez, vous devez, recommandons,\n' +
    'conseillons, plan d\'action, action plan.\n\n' +
    'BANNED STEM (audit 2.5): never use the optimis*/optimiz* family in ANY\n' +
    'form — not optimize, optimise, optimization, optimisation, optimized,\n' +
    'optimisé, optimisée, optimal. Use neutral observational alternatives:\n' +
    'sequenced/séquencé, adjusted/ajusté, "tax savings detected", or describe\n' +
    'the mechanism plainly. A slot containing the stem is rejected.\n\n' +
    'ROLE: you OBSERVE and ANALYZE the simulation results. You are NOT an\n' +
    'advisor, not a planner, not a fiduciary. AI assistance, not advice.\n' +
    'For action-relevant content, append "Consult a certified financial\n' +
    'planner" or the FR equivalent.\n\n' +
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
    '## RENDER PROFILE & OMITTED BLOCKS — CLASSIFIER-RENDER-PLAN Phase 5\n' +
    'The DATA section contains `renderProfile` (chart_tier, tone_mode, density_mode, jargon_mode) and `omittedBlocks` (an array of section IDs the renderer hid for this reader).\n' +
    '- Do NOT reference any block listed in `omittedBlocks`. The reader will not see it.\n' +
    '- Examples: if `omittedBlocks` contains `tornado`, do not write "as the sensitivity tornado shows". If it contains `oas_clawback`, do not mention OAS clawback at all.\n' +
    '- Do NOT reference "the percentile fan above" or "the chart at the top" if `chart_tier=\'lite\'` — those visuals are replaced by prose.\n' +
    '- If `jargon_mode=\'plain\'`, never use: alpha, t-Student, P25/P50/P75, Monte Carlo (use "simulated futures"), engine output, sequence-of-returns (use "order of returns").\n\n' +
    '## STYLE\n' +
    '- Professional but warm. Not robotic.\n' +
    '- Use bold (**text**) for key numbers — and only for numbers that appear in DATA verbatim.\n' +
    '- Bilingual: respond in the language specified in the DATA section.\n' +
    '- The client first name is provided ONLY as the literal placeholder token [[CLIENT_NAME]] (and [[SPOUSE_NAME]] for a partner). When you address the reader by name, write the token verbatim — never invent, guess, or substitute a real name. The token is replaced with the real name after generation. Use goal descriptions verbatim when relevant.\n\n' +
    '## ANTI-REPETITION DOCTRINE — CRITICAL\n' +
    'The reader sees ALL slots in sequence. Each slot must ADVANCE the reasoning, not restate it. Reference the same fact at most ONCE across these opening slots:\n' +
    '- advisor_letter: WHY this report matters to THIS person — frame their concern, set the lens. NO success rate, NO P50/P25, NO mention of depletion or GIS. Human situation only.\n' +
    '- overall_assessment: STATE the verdict using the success rate ONCE, name the SINGLE biggest risk and SINGLE biggest strength. Do not re-explain what the success rate means.\n' +
    '- verdict: ANALYZE the dispersion — why the spread is wide or tight, what that implies. Do NOT repeat the success rate number a second time.\n' +
    '- page_zero_verdict: MIRROR the client\'s emotional starting point in one sentence. Cannot say "your plan has X% success" — that\'s overall_assessment\'s job.\n' +
    'If you are about to write a sentence whose meaning was already in a previous slot, REPLACE IT with new information. Slots are coordinated, not redundant.\n\n' +
    '## SEQUENTIAL ACTION ARC\n' +
    'When writing best_move_explainer or any action-oriented slot, structure the levers as a SEQUENCE, not a list:\n' +
    '- Identify ONE primary lever — the action that, if not done, makes the rest pointless. Name it first and explain why it is structural.\n' +
    '- Identify ONE secondary lever that depends on or amplifies the primary.\n' +
    '- Optionally mention ONE tertiary lever as nice-to-have.\n' +
    '- Use connecting phrases: "Once X is done, Y becomes feasible" / "Une fois X enclenché, Y devient pertinent". Do NOT say "do A, B, C" without ordering.\n' +
    '- A reader should be able to write down a numbered to-do list from your text.\n\n' +
    '## STRESS-CALIBRATED TONE\n' +
    'When stressLevel is "high" or finLiteracy is "beginner":\n' +
    '- Open with reassurance about what is in their control. ("Several elements work in your favor" / "Plusieurs éléments jouent en votre faveur") before naming any risk.\n' +
    '- Break complex ideas into 2 short sentences. Plain everyday vocabulary.\n' +
    '- Avoid catastrophic phrasing ("plan unsustainable", "ruin", "exhausted savings") — prefer "the plan would benefit from adjustments" / "le plan gagnerait à être ajusté".\n' +
    '- Frame risks as PROGRESSIVE: most actionable lever first, harder ones later.\n' +
    'When stressLevel is "low" and finLiteracy is "advanced": deliver the verdict directly without softening.\n\n' +
    '## SENSITIVE TOPICS — GIS / OAS / DEPLETION\n' +
    '- NEVER write "your plan works because you become eligible for GIS" or any equivalent. That phrasing implies impoverishment is the strategy.\n' +
    '- DO write: "Public benefits (CPP/OAS, and possibly GIS at certain income levels) form the backbone of your retirement income, with personal savings as a complement" / "Les prestations publiques forment l\'ossature du revenu et l\'épargne personnelle s\'ajoute en complément".\n' +
    '- Mention GIS WITH the eligibility threshold context, not as a destination.\n' +
    '- Depletion: name the AGE conditionally and what would prevent it. Prefer: "In a cautious scenario, savings could be depleted near age X if spending is not adjusted; in the typical scenario this does not occur" / "Dans un scénario prudent, l\'épargne pourrait s\'épuiser vers X ans si les dépenses ne sont pas ajustées".\n' +
    '- OAS clawback: explain it ONCE if the client crosses the threshold. Don\'t name the same percentage clawback in 3 slots.\n\n' +
    '## TONE BY GRADE — MANDATORY\n' +
    'Match the rhetorical posture to the success rate:\n' +
    '- **A / A+** (90 %+): solidity with blind spots. NEVER write a glowing report. ALWAYS name at least ONE concrete zone the reader could not improve trivially (sequence-of-returns near retirement, OAS clawback if portfolio outperforms, longevity beyond projection, inflation persistence, single-asset concentration). A rating of 100 % without a named blind spot reads simplistic.\n' +
    '- **A-** (80-89): solid plan, success likely. Identify the one or two zones where discipline matters. Do NOT call this "fragile" — it is solid. Tone: confident with realistic caveat.\n' +
    '- **B+ / B** (60-79): robust if discipline holds. The plan works under expected behavior; departures (overspending, retiring earlier, carrying unexpected debt) erode the margin. Frame the lever that protects the most.\n' +
    '- **C** (45-59): under strain. Adjustments are needed but not catastrophic. Identify the structural lever (spending, retirement age, savings rate) whose change moves the rate the most.\n' +
    '- **D / F** (under 45 %): mandatory recovery trajectory. Open with reassurance about what is in their control. Then structure the path in 4 phases (stabilize → priority lever → rebuild → re-plan). DO NOT just diagnose failure. The reader must finish the report seeing a path forward, not an obituary.\n\n' +
    '## PER-ARCHETYPE NARRATIVE ARC\n' +
    'Detect the archetype from the data and shape the report\'s arc:\n' +
    '- CCPC owner: structural lens. The corporation is the centerpiece. Hierarchy: corporate extraction → tax integration → personal RRSP/TFSA → public benefits. Make the order of decisions explicit.\n' +
    '- HNW couple: tension between "solid plan if discipline maintained" and "zones that could derail" (sequence-of-returns near retirement, OAS clawback if portfolio outperforms). Find the one or two zones that matter; do not list everything.\n' +
    '- Low-income / GIS-eligible: the engine is public income, not accumulation. Be empathetic. Identify what would BREAK the plan. Don\'t leave the reader with false comfort.\n' +
    '- FIRE-seeker: focus on the "hinge age" — earliest age the plan holds. Discuss the 2-3 adjustments that buy the most freedom. Sequence-of-returns over a 50-year horizon.\n' +
    '- Debt-heavy / young: do NOT just diagnose failure. Frame a recovery trajectory: phase 1 stabilize cash flow; phase 2 deleverage high-rate debt; phase 3 rebuild savings capacity; phase 4 re-plan goals. The reader should feel a path forward, not an obituary.\n' +
    'Each archetype has its own RHYTHM. Do not write the same arc for all.\n\n' +
    '## CASE-DRIVER MANDATE (P1.6) — MANDATORY\n' +
    'The DATA block carries a `case_driver` field. This is the SINGLE MOST CASE-DEFINING LEVER for this profile, set by the pipeline. The auditors will verify two things:\n' +
    '1. The `advisor_letter` AND/OR `overall_assessment` slot must explicitly NAME the concept this case_driver represents. Use one of the natural-language tokens listed below in at least one of those two slots.\n' +
    '2. The first lever in the action plan section will be enforced by the renderer to align with the case_driver. Your `best_move_explainer` (or equivalent action-oriented slot) must lead with that same case_driver lever.\n\n' +
    'CASE_DRIVER TOKEN MAP (use any natural form, not literal):\n' +
    '- **ccpc_extraction** → "extraction order", "salary vs dividend", "CCPC integration", "corp distributions" / "ordre d\'extraction", "salaire vs dividende", "intégration CCPC".\n' +
    '- **rental_cashflow** → "rental cash flow", "tenant strategy", "property maintenance window", "duplex/plex" / "flux locatif", "loyer", "renouvellement hypothécaire".\n' +
    '- **gis_trap** → "GIS trap", "50¢-per-dollar clawback", "eligibility threshold" / "piège SRG", "récupération à 50 ¢", "seuil d\'admissibilité".\n' +
    '- **fire_bridge** → "bridge years", "pre-CPP horizon", "sequence-of-returns window" / "zone-pont", "horizon avant 65 ans", "fenêtre séquentielle".\n' +
    '- **db_pension_split** → "DB pension splitting", "indexed pension", "couple income shifting" / "fractionnement pension PD", "indexée à vie", "transfert conjugal".\n' +
    '- **meltdown_window** → "meltdown window", "RRIF conversion at 72", "accelerated RRSP withdrawal" / "fenêtre de meltdown", "conversion FERR à 72", "retraits accélérés".\n' +
    '- **debt_paydown** → "high-rate debt", "structured paydown", "guaranteed return" / "remboursement structuré", "taux élevé", "rendement garanti".\n' +
    '- **gap_savings** → "savings rate", "annual contribution gap", "pre-retirement runway" / "taux d\'épargne", "écart de cotisation".\n' +
    '- **hnw_estate** → "estate transfer", "second-spouse death tax", "RRSP-on-death deemed disposition" / "transmission successorale", "imp\u00f4t au d\u00e9c\u00e8s du second conjoint".\n' +
    '- **late_start_savings** → "catch-up program", "delay retirement window", "deferred CPP/OAS to 70" / "rattrapage", "report RRQ\u202f/\u202fPSV jusqu\'\u00e0 70 ans".\n' +
    '- **single_parent_resilience** → "emergency fund", "term life coverage", "disability insurance", "single-income resilience" / "fonds d\'urgence", "assurance vie temporaire", "r\u00e9silience monoparentale".\n' +
    'Without naming the case_driver concept in the opening slots, the entire report thesis lacks case-specific framing. The narration-auditor flags this; the report does not ship.\n\n' +
    '## TONE-vs-SUCCESS GUARD (Codex review pattern) — MANDATORY\n' +
    'A reader who sees "solid plan / strong fundamentals" in the opening slots while the success rate is 7 % loses trust immediately. The grade band drives the rhetorical posture (already detailed in TONE BY GRADE above), but in addition:\n' +
    '- When `successRate < 50 %`: NEVER use the words "solid", "robust", "strong", "fort", "robuste", "solide", "fiable", "stable", "sain" in advisor_letter / overall_assessment / verdict / page_zero_verdict slots without an explicit qualifier ("solid X but fragile Y", "robuste sur le plan X, à risque sur le plan Y").\n' +
    '- When `successRate < 25 %`: open the assessment with the diagnosis, not reassurance. "This plan faces significant challenges" is appropriate; "solid plan" is not.\n' +
    '- When `successRate ≥ 90 %`: still name at least one zone of vigilance per the A/A+ rule. A glowing report reads simplistic and erodes trust as much as a paradox.\n\n' +
    '## SUCCESS-RATE DISPLAY GUARD\n' +
    'Use the SAME success-rate string the renderer surfaces (the DATA block "successRate" field). The renderer applies <1% / ≥99% boundaries — so when DATA says "<1%" or "≥99%", quote that wording, not "0%" or "100%". Numeric rounding errors in narration break the cover/section reconciliation.\n\n' +
    '## DISPERSION DRIVER MANDATE (B7) — when |dispersion_pts| ≥ 15\n' +
    'When the DATA block reports `dispersion_pts ≥ 15`, the risk narration must NAME the dominant driver of the spread. Allowed drivers (use one or two): sequence-of-returns / inflation / longevity / spending variance / allocation choice / market volatility. Pure number-quoting without naming a driver gets flagged as narration_dispersion_driver_missing.\n\n' +
    '## COVERAGE METRIC GUARD — NEVER INTRODUCE COMPETING DEFINITIONS\n' +
    '- The DATA section provides ONE coverage number: `guaranteed_income_coverage`. It includes CPP/QPP + OAS + GIS + employer pension. It EXCLUDES portfolio withdrawals.\n' +
    '- DO NOT compute or quote any other coverage percentage. NEVER write "government coverage X%" or "couverture gouvernementale Y%" with a different number than `guaranteed_income_coverage`.\n' +
    '- If you want to describe the "public-only" share (CPP/OAS/GIS without pension), say so explicitly: "Public benefits alone (CPP/OAS) cover roughly..." but do NOT attach a percentage that contradicts the canonical one.\n' +
    '- Past reports failed because the AI introduced a "government coverage 27%" while the section KPI showed "guaranteed income 41%". Same concept, two numbers, reader loses trust. NEVER again.\n\n' +
    '## FEES / MER GUARD\n' +
    '- DO NOT quote a MER percentage or absolute fee cost in the narrative. The report shows a dedicated MER impact table elsewhere with explicit assumptions.\n' +
    '- If discussing fees, refer the reader to the fee comparison table.\n' +
    '- Never write "your MER is 1.5%" or "frais de 1,5%" — these unattributed numbers confuse readers.\n' +
    '- NEVER invent a MER percentage. Only the table is allowed to surface MER values.\n\n' +
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

    // P1.6/B7 — surface the case_driver and dispersion to the AI so it can
    // honor the CASE-DRIVER and DISPERSION DRIVER mandates in the system prompt.
    var _caseDriver = d.caseDriver || (d.profile && d.profile.case_driver) || null;
    var _dispPts = (mc && mc.succP75 != null && mc.succP25 != null)
      ? Math.round((mc.succP75 - mc.succP25) * 100)
      : null;

    var data = {
      lang: fr ? 'fr' : 'en',
      phase: d.R.phase,
      isCouple: d.R.couple,
      // L2(a) PII — never send a real name to Anthropic. Emit a neutral
      // placeholder token (only signalling whether a name exists); the renderer
      // rehydrates [[CLIENT_NAME]]/[[SPOUSE_NAME]] from the local client record.
      clientName: d.fn ? '[[CLIENT_NAME]]' : '',
      spouseName: d.sfn ? '[[SPOUSE_NAME]]' : '',
      age: p.age,
      retAge: p.retAge,
      deathAge: p.deathAge || 90,
      province: p.prov || 'QC',
      yearsToRetirement: Math.max(0, p.retAge - p.age),
      horizon: (p.deathAge || 90) - p.age,
      // CLASSIFIER-RENDER-PLAN Phase 5: surface renderProfile + omitted
      // blocks so the AI never references analyses the renderer hid.
      // The system prompt's anti-repetition + per-archetype arc rules
      // already key off finLiteracy/stress/detail — adding renderProfile
      // and omittedBlocks lets the prompt strictly enforce "do not
      // mention these blocks: [list]" when the renderer omits them.
      renderProfile: d.renderProfile || null,
      omittedBlocks: d._omittedBlocks || [],
      narrativePreferences: {
        finLiteracy: d.finLiteracy || p.finLiteracy || 'intermediate',
        stressLevel: d.stressLevel || p.stressLevel || 'moderate',
        detailPreference: d.detailPref || p.detailPref || 'balanced'
      },
      // P1.6 — case_driver mandate. AI must name this concept in advisor_letter
      // OR overall_assessment. Auditor verifies post-render.
      case_driver: _caseDriver,
      // B7 — dispersion driver mandate. When |dispersion_pts| >= 15, the AI
      // must name a driver (sequence/inflation/longevity/spending/allocation/markets).
      dispersion_pts: _dispPts,

      // Savings
      totalSavings: f$(d.totalBal),
      rrsp: f$(p.rrsp || 0),
      tfsa: f$(p.tfsa || 0),
      nr: f$(p.nr || 0),

      // MC results
      successRate: (function() {
        // Mirror the renderer's _fmtSucc helper so the AI quotes the same
        // boundary-aware string the reader will see: "<1%" / "≥99%" /
        // "100%" / nearest whole percent. Eliminates the 0.8% → "1%"
        // rounding mismatch the user audit flagged.
        var v = _coreFields.succVal;
        if (v == null) return 'pending';
        var pct = v * 100;
        if (pct > 0 && pct < 1) return '<1%';
        if (pct >= 99 && pct < 100) return '≥99%';
        if (pct >= 100) return '100%';
        return Math.round(pct) + '%';
      })(),
      grade: window.BFmt.grade(_coreFields.succVal, fr).letter,
      gradeLabel: window.BFmt.grade(_coreFields.succVal, fr).label,
      p50Wealth: _finStr(f$, _coreFields.medF),
      p25Wealth: _finStr(f$, (mc.rP25F != null ? mc.rP25F : (mc.p25F != null ? mc.p25F : (mc.rVar5 != null ? mc.rVar5 : mc.var5)))),
      p75Wealth: _finStr(f$, (mc.rP75F != null ? mc.rP75F : mc.p75F)),
      // Localized sentinel (audit 2026-06-16): this was emitted in English
      // regardless of report language, and the model copied "depleted at age N"
      // / "never depleted" verbatim into FR narration (qa-check language_leak).
      // FR/EN strings now match the report language.
      savingsDurability: (function() {
        var r = _fin(mc && mc.p5Ruin);
        if (r == null) return null;
        if (fr) return r >= 200 ? 'jamais épuisée' : 'épuisée vers ' + r + ' ans';
        return r >= 200 ? 'never depleted' : 'depleted at age ' + r;
      })(),
      nSim: p.nSim || 5000,

      // Income
      // Canonical coverage metric: percent of target spending covered by
      // guaranteed income (CPP + OAS + employer pension), excluding portfolio
      // withdrawals. The label "guaranteed_income_coverage" is mandated; AI
      // must NOT introduce a separate "government coverage" number that
      // omits pension — that's how 41/27, 48/33, 110/84 contradictions were
      // produced in earlier rendered reports.
      guaranteed_income_coverage: _coreFields.covRatio == null ? null : Math.round(_coreFields.covRatio * 100) + '%',
      monthlyGap: _finStr(fM, d.gapM),
      qppMonthly: _finStr(fM, d.qppM),
      oasMonthly: _finStr(fM, d.oasM),
      totalGovMonthly: _finStr(fM, d.govM),
      monthlySpending: _finStr(fM, d.totalSpM),

      // Withdrawal rate
      initWR: d._wdPct ? d._wdPct + '%' : null,

      // Tax
      avgEffectiveRate: _coreFields.avgEffRate == null ? null : (_coreFields.avgEffRate * 100).toFixed(1) + '%',
      // Use the REAL-dollar lifetime tax (audit 2026-06-16): the renderer surfaces
      // _optTaxReal to readers (report-pdf.js ~1264/4500); feeding the AI the
      // nominal _optTax made the narrative quote a different number than the report.
      lifetimeTax: _finStr(f$, (d._optTaxReal != null ? d._optTaxReal : d._optTax)),
      taxAlpha: (function() {
        var a = _fin(d._taxAlpha);
        return (a != null && a > 0) ? f$(Math.round(a)) : null;
      })(),
      oasClawbackYears: _fin(d.oasClbkYrs),

      // Fees
      // Fees intentionally omitted from AI data — MER values surface only via
      // the dedicated MER impact comparison table (with explicit assumptions),
      // so the AI cannot quote unattributed percentages.
      // weightedMER / lifetimeFeeCost removed by design.

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
        guaranteed_income_coverage: data.guaranteed_income_coverage,
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
          // The rrsp_tax / cg_tax split is an indicative breakdown of the engine
          // estate-tax total, not a separate engine output. Flag so the narrative
          // does not present the component split as a precise engine figure.
          tax_split_basis: ew.taxSplitIndicative ? 'indicative split of estate-tax total (only the total and probate are engine-canonical)' : null,
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

    // Stamp canonical raw values (audit 2026-06-16). This was previously dead —
    // `data.canonical` was never populated, so the anti-drift pinning block in
    // buildPrompt never emitted. Source each value from the SAME raw variable
    // that feeds the formatted DATA field, so the canonical line and the DATA
    // block agree by construction. Stamped here in extractData (where mc/d/
    // _coreFields are in scope). Null entries are skipped by canonMap.
    // Only pin metrics whose canonical formatter (compact "K$"/"%") matches the
    // format the DATA block already shows for that field — otherwise the AI gets
    // two conflicting strings for one number. Wealth/tax/estate use compact f$
    // (matches _fmtMoney); success + coverage use rounded % (matches _fmtPct).
    // Monthly $ fields (gap/qpp/oas) use the PRECISE "3 274 $" form in the DATA
    // block, which _fmtMoney would render as "3K$" — so they are intentionally
    // NOT pinned here (the DATA block is their single source).
    data.canonical = {
      success_rate: _coreFields.succVal,
      p25_wealth_real: _fin(mc && (mc.rP25F != null ? mc.rP25F : (mc.p25F != null ? mc.p25F : (mc.rVar5 != null ? mc.rVar5 : mc.var5)))),
      p50_wealth_real: _coreFields.medF,
      p75_wealth_real: _fin(mc && (mc.rP75F != null ? mc.rP75F : mc.p75F)),
      lifetime_tax_real: _fin(d._optTaxReal != null ? d._optTaxReal : d._optTax),
      net_estate: _fin(mc && mc.medEstateNet),
      guaranteed_income_coverage: _coreFields.covRatio
    };

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

    // ── Canonical-number pinning (Codex 2026-04-27 — anti-drift fix) ────
    // Earlier prompt iterations let the LLM round / re-format / re-quote
    // numbers from the DATA block, which produced canonical-quote drift
    // (e.g. P25=$405,044 → "around $466K" in narrative). Now we list every
    // canonical metric in BOTH the raw form AND the pre-formatted display
    // form the renderer would emit, and instruct the AI to use ONLY those
    // verbatim formatted strings.
    function _fmtMoney(v) {
      if (v == null || !isFinite(v)) return null;
      var abs = Math.abs(v);
      if (abs >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M$';
      if (abs >= 1e3) return Math.round(v / 1e3) + 'K$';
      return Math.round(v) + '$';
    }
    function _fmtPct(v) {
      if (v == null || !isFinite(v)) return null;
      return Math.round(v * 100) + '%';
    }
    function _fmtPct1(v) {
      if (v == null || !isFinite(v)) return null;
      return (v * 100).toFixed(1).replace(/\.0$/, '') + '%';
    }
    // canonical raw values are stamped on `data` in extractData (where mc/d/
    // _coreFields are in scope); buildPrompt just reads them here.
    var canon = data.canonical || {};
    var canonLines = [];
    var canonMap = {
      success_rate:                { val: canon.success_rate,            fmt: _fmtPct,    label: 'Success rate' },
      p25_wealth_real:             { val: canon.p25_wealth_real,         fmt: _fmtMoney,  label: 'P25 wealth (real)' },
      p50_wealth_real:             { val: canon.p50_wealth_real,         fmt: _fmtMoney,  label: 'P50 (median) wealth (real)' },
      p75_wealth_real:             { val: canon.p75_wealth_real,         fmt: _fmtMoney,  label: 'P75 wealth (real)' },
      lifetime_tax_real:           { val: canon.lifetime_tax_real,       fmt: _fmtMoney,  label: 'Lifetime tax (real)' },
      lifetime_taxable_income_real:{ val: canon.lifetime_taxable_income_real, fmt: _fmtMoney, label: 'Lifetime taxable income' },
      lifetime_effective_tax_rate: { val: canon.lifetime_effective_tax_rate, fmt: _fmtPct1, label: 'Lifetime effective tax rate' },
      net_estate:                  { val: canon.net_estate,              fmt: _fmtMoney,  label: 'Net estate' },
      monthly_gap:                 { val: canon.monthly_gap,             fmt: _fmtMoney,  label: 'Monthly income gap' },
      lifetime_gis:                { val: canon.lifetime_gis,            fmt: _fmtMoney,  label: 'Lifetime GIS' },
      gis_years:                   { val: canon.gis_years,               fmt: function(v) { return v + ' yrs'; }, label: 'GIS years' },
      oas_clawback_years:          { val: canon.oas_clawback_years,      fmt: function(v) { return v + ' yrs'; }, label: 'OAS clawback years' },
      gov_coverage_only:           { val: canon.gov_coverage_only,       fmt: _fmtPct,    label: 'Gov-only coverage' },
      guaranteed_income_coverage:  { val: canon.guaranteed_income_coverage, fmt: _fmtPct, label: 'Guaranteed income coverage' }
    };
    Object.keys(canonMap).forEach(function(k) {
      var entry = canonMap[k];
      if (entry.val == null) return;
      var formatted = entry.fmt(entry.val);
      if (formatted == null) return;
      canonLines.push('  - **' + k + '** (' + entry.label + '): use **`' + formatted + '`** verbatim. Raw value = ' + entry.val + '.');
    });
    if (canonLines.length > 0) {
      userPrompt += '## CANONICAL NUMBERS \u2014 QUOTE VERBATIM\n';
      userPrompt += 'Every dollar amount, percentage, or year-count below MUST appear in your\n';
      userPrompt += 'narrative EXACTLY in the formatted form shown. Do not round differently.\n';
      userPrompt += 'Do not infer adjacent numbers. Do not write "around" / "roughly" / "near" forms.\n';
      userPrompt += 'If a number is not in this list, do not invent one for that field.\n\n';
      userPrompt += canonLines.join('\n') + '\n\n';
    }

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
