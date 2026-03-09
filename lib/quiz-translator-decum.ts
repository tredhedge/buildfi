// /lib/quiz-translator-decum.ts
// Converts quiz-decaissement.html answers into MC engine parameters (Décaissement tier)
//
// Key differences from quiz-translator-inter.ts:
//   — Client is in decumulation: sal=0, monthlyContrib=0, no CCPC, no FHSA
//   — Guyton-Klinger params set explicitly from spendingFlex field
//   — QPP/OAS may already be in payment (amounts passed directly vs computed)
//   — allocR capped at 0.75 (never 0.85+ — accumulation only)
//   — melt param set from meltdownPref; always runs both comparison runs in webhook
//   — stochMort=true, fatT=true, glide=true mandatory — same as Inter/Expert
//   — Spending smile (goP/slP/noP) mandatory — Essentiel uses flat curve (incorrect)
//
// Engine reference:
//   GK params:       lib/engine/index.js:1268
//   stochDeath():    lib/engine/index.js:814  (CPM-2023 tables)
//   spending smile:  lib/engine/index.js:321-326
//   optimizeDecum(): lib/engine/index.js (wStrat="optimal")

// -- QPP/OAS heuristics (2026 figures) --
const QPP_MAX_QC_2026 = 1364;   // RRQ max à 65 ans, 2026 ($/mois)
const CPP_MAX_2026    = 1306;   // CPP max à 65 ans, 2026 ($/mois)
const OAS_65_2026     = 727;    // PSV/OAS à 65 ans, 2026 ($/mois)
const OAS_70_2026     = 1036;   // PSV/OAS à 70 ans, 2026 ($/mois)

// QPP/CPP timing adjustment factors vs baseline at 65
// Early: 0.6%/month penalty (7.2%/year) for each month before 65
// Late: 0.7%/month bonus (8.4%/year) for each month after 65
function qppFactor(age: number): number {
  if (age <= 60) return 0.640;
  if (age >= 70) return 1.420;
  if (age < 65) return 1.0 - (65 - age) * 0.072;
  return 1.0 + (age - 65) * 0.084;
}

// -- Meltdown target: first federal bracket 2026 (income ceiling for tax efficiency) --
const MELT_TARGET_2026 = 58523;

export function translateDecumToMC(a: Record<string, any>): Record<string, any> {

  // ── SECTION 1: PROFIL DE BASE ─────────────────────────────────────────────

  const age     = Math.max(50, Math.min(95, a.age || 65));
  const prov    = a.prov || "QC";
  const sex     = (a.sex === "F" || a.sex === "M") ? a.sex : "M";
  // NOTE: sex is mandatory — engine defaults to "M" if absent, producing ~4yr longevity bias for women
  // CPM-2023 tables (CPM_M / CPM_F in engine/index.js:700-825)

  const cOn     = a.couple === "yes" && (a.cAge || 0) > 0;
  const cAge    = a.cAge  || 0;
  const cSex    = (a.cSex === "F" || a.cSex === "M") ? a.cSex : "F";

  // ── SECTION 2: PHASE DE RETRAITE ─────────────────────────────────────────

  let retAge: number;
  const status = a.retirementStatus || "retired";
  if (status === "retired") {
    retAge = age; // already retired — retAge === age
  } else if (status === "within_1yr") {
    retAge = age + 1;
  } else {
    retAge = age + 2; // within_2yr
  }
  // Override with explicit retAge if provided (set by UX slider for non-retired)
  if (a.retAge && a.retAge > age && status !== "retired") {
    retAge = Math.max(age + 1, Math.min(80, a.retAge));
  }

  // Décaissement: no active income (client is retired or within 2 years)
  const sal           = 0;   // salaire = 0
  const monthlyContrib = 0;  // pas de contributions actives

  // ── SECTION 3: PATRIMOINE ────────────────────────────────────────────────

  // REER and FERR both map to params.rrsp
  // Engine handles FERR minimum withdrawals automatically at age 71
  // The rrspIsFerf toggle is UX only — no distinct engine param
  const rrsp = Math.max(0, Math.round(a.rrspBal || a.rrsp || 0));
  const tfsa = Math.max(0, Math.round(a.tfsaBal || a.tfsa || 0));
  const nr   = Math.max(0, Math.round(a.nrBal   || a.nr   || 0));

  // Couple savings
  const cRRSP = cOn ? Math.max(0, Math.round(a.cRrspBal || a.cRrsp || a.cRRSP || 0)) : 0;
  const cTFSA = cOn ? Math.max(0, Math.round(a.cTfsaBal || a.cTfsa || a.cTFSA || 0)) : 0;
  const cNR   = cOn ? Math.max(0, Math.round(a.cNrBal   || a.cNr   || a.cNR   || 0)) : 0;
  const liraBal  = Math.max(0, Math.round(a.liraBal || a.lira || 0));
  const cLiraBal = cOn ? Math.max(0, Math.round(a.cLiraBal || a.cLira || 0)) : 0;

  // No active contributions in decumulation
  const rrspC = 0;
  const tfsaC = 0;
  const nrC   = 0;

  // ── SECTION 4: REVENUS GOUVERNEMENTAUX (RRQ/CPP + PSV/OAS) ──────────────

  const isQC = prov === "QC";
  const qppBaseMonthly = isQC ? QPP_MAX_QC_2026 : CPP_MAX_2026;

  // QPP/CPP —————————————————————————————————————————————————————————————
  let qppAge: number;
  let qppBenefit: number; // annualisé pour le moteur

  if (a.qppAlreadyClaiming) {
    // Already in payment — pass current amount, set qppAge to current age (already started)
    qppAge     = age; // moteur: déjà en cours depuis un âge passé
    const rawMonthly = a.qppMonthly > 0 ? a.qppMonthly : qppBaseMonthly;
    qppBenefit = rawMonthly * 12;
  } else {
    // Not yet claimed — use planned age + heuristic if amount not provided
    qppAge = Math.max(60, Math.min(70, a.qppPlannedAge || 65));
    const factor = qppFactor(qppAge);
    if (a.qppMonthly > 0) {
      qppBenefit = a.qppMonthly * 12;
    } else {
      // Heuristic: factored by age timing
      qppBenefit = Math.round(qppBaseMonthly * factor) * 12;
    }
  }

  // PSV/OAS —————————————————————————————————————————————————————————————
  let oasAge: number;
  let oasBenefit: number; // annualisé

  if (a.oasAlreadyClaiming) {
    oasAge     = age;
    const rawMonthly = a.oasMonthly > 0 ? a.oasMonthly : OAS_65_2026;
    oasBenefit = rawMonthly * 12;
  } else {
    oasAge = Math.max(65, Math.min(70, a.oasPlannedAge || 65));
    if (a.oasMonthly > 0) {
      oasBenefit = a.oasMonthly * 12;
    } else {
      oasBenefit = (oasAge === 70 ? OAS_70_2026 : OAS_65_2026) * 12;
    }
  }

  // ── SECTION 5: PENSION D'EMPLOYEUR ───────────────────────────────────────

  let penType: string  = "none";
  let penM: number     = 0;
  let penIdx: number   = 0; // engine: 0=non-indexed, 1=half CPI, 2=full CPI

  const hasPen = a.hasPension || a.penType === "db";
  const penMonthlyRaw = a.penMonthly || a.penM || 0;
  if (hasPen && penMonthlyRaw > 0) {
    penType = "db";
    penM    = Math.round(penMonthlyRaw); // mensuel → le moteur gère l'annualisation
    penIdx  = (a.penIndexed === "yes" || a.penIdx === true || a.penIdx === 2) ? 2
            : (a.penIndexed === "partial" || a.penIdx === 1) ? 1
            : 0;
  }

  // Couple pension
  let cPenType: string = "none";
  let cPenM: number    = 0;
  let cPenIdx: number  = 0;

  const cHasPen = a.cHasPension || a.cPenType === "db";
  const cPenMonthlyRaw = a.cPenMonthly || a.cPenM || 0;
  if (cOn && cHasPen && cPenMonthlyRaw > 0) {
    cPenType = "db";
    cPenM    = Math.round(cPenMonthlyRaw);
    cPenIdx  = (a.cPenIndexed === "yes" || a.cPenIdx === true || a.cPenIdx === 2) ? 2
             : (a.cPenIndexed === "partial" || a.cPenIdx === 1) ? 1
             : 0;
  }

  // ── SECTION 6: DÉPENSES ET GUYTON-KLINGER ────────────────────────────────

  // retIncome is the annual spending target in nominal dollars
  const retIncome = Math.max(0, a.retIncome || 0);
  // retSpM is the monthly equivalent used by the engine
  const retSpM = Math.round(retIncome / 12);

  // Guyton-Klinger params — fully implemented in engine/index.js:1268
  // spendingFlex → rigid/moderate/flexible → gkOn + gkMaxCut
  let gkOn: boolean       = false;
  let gkCeil: number      = 0.055;
  let gkFloor: number     = 0.030;
  let gkCut: number       = 0.10;
  let gkRaise: number     = 0.10;
  let gkMaxCut: number    = 0.20; // default (moderate)

  const spendingFlex = a.spendingFlex || "moderate";

  if (spendingFlex === "rigid") {
    // Fixed spending — no GK adjustments, engine uses retSpM without market adjustment
    gkOn = false;
  } else if (spendingFlex === "moderate") {
    // GK active, max cut 20% — floor at retIncome × 0.80
    gkOn     = true;
    gkMaxCut = 0.20;
  } else if (spendingFlex === "flexible") {
    // GK standard (Guyton & Klinger 2006) — max cut 25%
    gkOn     = true;
    gkMaxCut = 0.25;
  }

  // ── SECTION 7: STRATÉGIE REER/FERR (MELTDOWN) ───────────────────────────

  // meltdownPref: true | false | null
  // null = "Je ne sais pas" → default to true (engine always runs both comparisons)
  const meltdownPref = a.meltdownPref;
  let melt: boolean;
  if (meltdownPref === false) {
    melt = false;
  } else {
    melt = true; // true or null → default meltdown active
  }

  // Meltdown target: first federal bracket 2026 ($58,523)
  // The engine draws from RRSP until total income reaches this threshold
  const meltTgt = MELT_TARGET_2026;

  // ── SECTION 8: OBJECTIF SUCCESSORAL → AJUSTEMENT ALLOCATION ─────────────

  // allocR from risk tolerance (Screen 9), then adjusted for estate preference (Screen 8)
  // Processing order: risque → estatePref adjustment
  // IMPORTANT: allocR capped at 0.75 in decumulation (never 0.85+ — accumulation only)
  const rawAllocR = a.allocR || 0.60;
  const clampedAllocR = Math.max(0.30, Math.min(0.75, rawAllocR));

  const estatePref = a.estatePref || "balanced";
  let allocR: number;
  if (estatePref === "maximize") {
    // More conservative — protect capital for heirs
    allocR = Math.max(0.30, clampedAllocR - 0.10);
  } else if (estatePref === "spenddown") {
    // Slightly more growth-oriented — priority is consumption
    allocR = Math.min(0.75, clampedAllocR + 0.05);
  } else {
    allocR = clampedAllocR; // "balanced" — no adjustment
  }

  // Bond allocation derived from equity allocation
  const allocT = allocR;
  const allocN = Math.max(0.30, allocR - 0.20);

  // MER estimate by allocation — same formula as Inter translator
  const mer = allocR > 0.70 ? 0.017 : allocR > 0.50 ? 0.015 : 0.012;

  // ── SECTION 9: TOLÉRANCE AU RISQUE — processed above with estatePref ────

  // ── SECTION 10: HYPOTHÈSES DE RENDEMENT ─────────────────────────────────

  const eqRet  = Math.max(0.01, Math.min(0.12, (a.eqRet || 5.0) / 100));
  const inf    = Math.max(0.01, Math.min(0.06, (a.inf  || 2.1)  / 100));

  // Bond return heuristic: same as Inter translator
  // bndRet = eqRet - spread (typically ~3.5% below equity)
  const bndRet = Math.max(0.01, eqRet - 0.035);

  // ── SECTION 11: CONTEXTE ADDITIONNEL (immobilier, dettes) ───────────────

  const homeValue    = Math.max(0, a.homeValue    || 0);
  const homeMortgage = Math.max(0, a.homeMortgage || a.mortgage || 0);
  // totalDebt: accept direct value or sum from debts array
  const totalDebtFromArray = Array.isArray(a.debts)
    ? a.debts.reduce((s: number, d: any) => s + (d.amount || d.bal || 0), 0)
    : 0;
  const totalDebt    = Math.max(0, a.totalDebt || totalDebtFromArray || 0);

  // Properties: modeled as net asset in wealth summary only — not as a liquid withdrawal source
  const props: any[] = [];
  if (homeValue > 0) {
    props.push({
      on: true, name: "R\u00e9sidence principale", pri: true,
      val: homeValue,
      mb: homeMortgage,
      mr: 0.055, ma: 20,
      ri: 0.035, rm: 0, ox: 0,
      pt: 0, ins: 0, sa: 0, cg: 0, landPct: 0.30,
      heloc: 0, helocRate: 0.065, helocMax: 0.65, smithOn: false,
      refiAge: 0, refiAmt: 0,
      dsAge: 0, dsAmt: 0, dpaOn: false, dpaRate: 0.04,
    });
  }

  // Remaining debts: passed through _report for display only
  const debts: any[] = [];
  if (totalDebt > 0) {
    // Generic debt entry — no type breakdown in the decum quiz
    debts.push({
      type: "other", bal: totalDebt, rate: 0.07,
      minPay: Math.max(100, Math.round(totalDebt * 0.01)),
      months: Math.round(totalDebt / Math.max(1, totalDebt * 0.01 - totalDebt * 0.07 / 12)),
      totalInt: Math.round(totalDebt * 0.07 * 10),
      feasible: true,
      annualCost: Math.round(totalDebt * 0.07),
    });
  }

  // ── DEATH AGE (hard upper cap — stochDeath() terminates most simulations much earlier) ──
  // With stochMort:true, stochDeath() uses CPM-2023 tables for each sim.
  // deathAge=105 is only the absolute ceiling (no sim runs past this age).
  const deathAge = 105;

  // ── FIXED ENGINE PARAMS — DÉCAISSEMENT ───────────────────────────────────
  // These must not change across profiles. All verified against engine/index.js.
  //
  // stochMort=true:  mortalité stochastique CPM-2023 — distribution d'âges de décès
  //                  Inter: true. Expert: true. Décaissement: obligatoire.
  //                  Remplace 3 horizons fixes (85/90/95) — distribution émerge naturellement.
  //
  // fatT=true:       queues épaisses t-Student df=5 — même que Inter/Expert
  //
  // goP=1.05:        Phase go-go: dépenses +5% début retraite (voyages, loisirs actifs)
  // slP=0.88:        Phase slow-go: dépenses –12% à partir de 75 ans
  // noP=0.75:        Phase no-go: dépenses –25% à partir de 85 ans
  // NOTE: Essentiel utilise goP=slP=noP=1.0 (courbe plate — incorrect pour 30 ans de retraite)
  //       Inter/Expert/Décaissement utilisent cette courbe réaliste.
  //
  // glide=true:      Glide path — allocation actions réduite de 1%/an avec l'âge
  // glideSpd=0.01:   Même valeur que Expert
  //
  // wStrat="optimal": optimizeDecum() gère le séquencement optimal
  //                   FERR minimums, CÉLI room, protection PSV, spousal rollover, tax-aware
  //
  // sal=0:           Pas de revenus de travail en décaissement
  // monthlyContrib=0: Pas de contributions actives

  const params: Record<string, any> = {
    // Identity
    age, retAge, sex, prov, sal, deathAge, retIncome,
    // Savings
    rrsp, tfsa, nr,
    rrspC, tfsaC, nrC, // all zero — no active contributions
    // Pension
    penType, penM, penIdx,
    dcBal: 0, // no DC plan in decumulation context
    // Government income
    qppAge, oasAge,
    avgE: 0,             // no employment income
    qppYrs: Math.min(40, Math.max(0, age - 18)),
    // Spending
    retSpM,
    // Allocation
    allocR, allocT, allocN,
    merR: mer, merT: mer * 0.5, merN: mer * 0.5,
    nrTaxDrag: 0.003,
    // GK — Guyton-Klinger guardrails
    gkOn, gkCeil, gkFloor, gkCut, gkRaise, gkMaxCut,
    // Meltdown
    melt, meltTgt,
    // Returns & inflation
    inf,
    eqRet, bndRet,
    // Properties
    props,
    // Cost basis (non-reg)
    costBase: Math.round(nr * 0.5),  // ~50% unrealized gains assumed for retirees
    // ── MANDATORY FIXED PARAMS ──────────────────────────────
    fatT: true,             // t-Student df=5 fat tails
    eqVol: 0.16,            // equity volatility (annualized std dev)
    bndVol: 0.06,           // bond volatility (annualized std dev)
    stochMort: true,        // mortalité stochastique CPM-2023
    stochInf: false,
    // Spending smile curve
    goP: 1.05,              // go-go phase multiplier (retAge–75)
    slP: 0.88,              // slow-go phase multiplier (75–85)
    noP: 0.75,              // no-go phase multiplier (85+)
    smileSlAge: 75,         // onset of slow-go
    smileNoAge: 85,         // onset of no-go
    healthMul: 0.015,       // health cost inflation +1.5%/yr after healthAge
    healthAge: 85,          // health cost onset age
    // Glide path
    glide: true,            // réduction automatique du risque avec l'âge
    glideSpd: 0.01,         // 1%/year (same as Expert)
    // Drawdown strategy
    wStrat: "optimal",      // optimizeDecum() — tax-aware, FERR minimums, OAS protection
    // Couple splitting
    split: cOn,
    bridge: false,          // no bridge benefit in decum context (already in retirement)
    // FHSA / LIRA / other accounts
    fhsaBal: 0, fhsaC: 0, fhsaForHome: false, fhsaHomeAge: 0,
    ftqOn: false,
    liraBal,
    // Capital gains inclusion rates
    cgIncLo: 0.5, cgIncHi: 0.6667, cgThresh: 250000,
    // Business
    bizOn: false,
    // Misc
    pen2Type: "none", pen2M: 0, pen2Idx: false,
    peExitStrat: "lump", pmExitStrat: "lump",
    strs: "none", strs2: "none", stWhen: "start", stWhen2: "start",
    qppShare: 0, contGr: 0,
    // ── COUPLE ──────────────────────────────────────────────
    cOn,
    cAge, cSex,
    cRetAge: cOn ? (a.cAge || 0) : 0, // partner retirement = partner current age (already retired)
    cSal: 0,     // no partner employment income
    cRRSP, cTFSA, cNR, cLiraBal,
    cPenType, cPenM, cPenIdx,
    cDCBal: 0,
    cRRSPC: 0, cTFSAC: 0, cNRC: 0, // no couple contributions
    cAvgE: 0,
    cQppYrs: cOn ? Math.min(40, Math.max(0, cAge - 18)) : 0,
    cQppAge: cOn ? Math.max(60, Math.min(70, cAge >= 60 ? cAge : 65)) : 0,  // partner QPP: use partner age if 60+, else 65
    cOasAge: oasAge,
    cRetSpM: cOn ? Math.round(retSpM * 0.5) : 0, // equal spending split for couple
    cDeath: 105,  // same hard cap as main person — stochMort=true handles realistic mortality via CPM-2023
    // Life insurance — not collected in decum quiz
    lifeInsBenefit: 0, lifeInsPremium: 0,
    cLifeInsBenefit: 0, cLifeInsPremium: 0,
  };

  // ── QUIZ PASSTHROUGH (for AI narration + report, not MC) ─────────────────
  params._quiz = {
    retirementStatus: status,
    spendingFlex,
    meltdownPref: a.meltdownPref ?? null,
    estatePref,
    allocRRaw: rawAllocR,
    couple: a.couple || "no",
    confidence: a.confidence || 3,
    qppAlreadyClaiming: !!a.qppAlreadyClaiming,
    oasAlreadyClaiming: !!a.oasAlreadyClaiming,
    hasPension: !!a.hasPension,
    cHasPension: cOn ? !!a.cHasPension : false,
    // BUG-003 fix: pass psych fields for AI voice adaptation
    psych_anxiety: a.psychAnxiety || a.psych_anxiety || null,
    psych_discipline: a.psychDiscipline || a.psych_discipline || null,
    psych_literacy: a.psychLiteracy || a.psych_literacy || null,
    detailPreference: a.detailPreference || null,
  };

  // ── REPORT METADATA (for report-html-decum.js display) ───────────────────
  params._report = {
    // Wealth summary
    rrsp, tfsa, nr, liraBal, cRRSP, cTFSA, cNR, cLiraBal,
    totalLiquidSavings: rrsp + tfsa + nr + liraBal + (cOn ? cRRSP + cTFSA + cNR + cLiraBal : 0),
    homeValue, homeMortgage,
    homeEquity: Math.max(0, homeValue - homeMortgage),
    totalDebt,
    // Guaranteed income (monthly) — for coverage ratio display
    govQppMonthly: Math.round(qppBenefit / 12),
    govOasMonthly: Math.round(oasBenefit / 12),
    govPenMonthly: penType === "db" ? penM : 0,
    cPenMonthly: cOn && cPenType === "db" ? cPenM : 0,
    govTotalMonthly: Math.round(qppBenefit / 12) + Math.round(oasBenefit / 12) + (penType === "db" ? penM : 0),
    govCoveragePct: retSpM > 0
      ? Math.min(100, Math.round(
          (Math.round(qppBenefit / 12) + Math.round(oasBenefit / 12) + (penType === "db" ? penM : 0))
          / retSpM * 100
        ))
      : 0,
    retIncome,
    // Meltdown scenario base preference (for report section 6 "base" label)
    meltIsBase: melt,
    meltTarget: meltTgt,
    // GK: whether flexibility is active
    gkActive: gkOn,
    // Debt for display
    debts,
    debtBal: totalDebt,
  };

  return params;
}
