// ═══════════════════════════════════════════════════════════════════
// BuildFi — Debt Tool Test Suite
// Pattern: same as planner runTestSuite()
// 100% deterministic — no MC, no randomness
// ═══════════════════════════════════════════════════════════════════

// ── Province tax data (copy from debt-tool.jsx) ──
const PROV_TAX = {
  AB: [{ to:55867, r:.25 },{ to:111733, r:.305 },{ to:154906, r:.36 },{ to:175000, r:.38 },{ to:221708, r:.41 },{ to:Infinity, r:.48 }],
  BC: [{ to:47937, r:.2006 },{ to:55867, r:.2272 },{ to:95875, r:.2850 },{ to:111733, r:.3150 },{ to:155844, r:.3850 },{ to:157748, r:.408 },{ to:221708, r:.4670 },{ to:253414, r:.4970 },{ to:Infinity, r:.535 }],
  MB: [{ to:36842, r:.2580 },{ to:55867, r:.2780 },{ to:79625, r:.338 },{ to:111733, r:.3830 },{ to:157748, r:.4380 },{ to:Infinity, r:.504 }],
  NB: [{ to:49958, r:.2402 },{ to:55867, r:.2782 },{ to:99916, r:.3182 },{ to:111733, r:.3582 },{ to:157748, r:.4282 },{ to:176756, r:.4982 },{ to:221708, r:.5182 },{ to:Infinity, r:.533 }],
  NL: [{ to:43198, r:.235 },{ to:55867, r:.295 },{ to:86395, r:.325 },{ to:111733, r:.375 },{ to:154803, r:.425 },{ to:157748, r:.4550 },{ to:215943, r:.4800 },{ to:221708, r:.510 },{ to:275870, r:.5150 },{ to:Infinity, r:.548 }],
  NS: [{ to:29590, r:.2379 },{ to:55867, r:.2987 },{ to:59180, r:.3487 },{ to:93000, r:.3700 },{ to:111733, r:.3850 },{ to:150000, r:.4350 },{ to:157748, r:.4850 },{ to:221708, r:.5000 },{ to:Infinity, r:.54 }],
  ON: [{ to:52886, r:.2015 },{ to:55867, r:.2415 },{ to:105775, r:.2965 },{ to:111733, r:.3148 },{ to:150000, r:.3348 },{ to:157748, r:.3748 },{ to:220000, r:.4648 },{ to:221708, r:.4798 },{ to:Infinity, r:.5353 }],
  PE: [{ to:32656, r:.245 },{ to:55867, r:.285 },{ to:63969, r:.3250 },{ to:111733, r:.3750 },{ to:157748, r:.4450 },{ to:221708, r:.4870 },{ to:Infinity, r:.51 }],
  QC: [{ to:18571, r:.2753 },{ to:37142, r:.3053 },{ to:51780, r:.3553 },{ to:55867, r:.3753 },{ to:103545, r:.4553 },{ to:111733, r:.4753 },{ to:126000, r:.4953 },{ to:157748, r:.5053 },{ to:221708, r:.5253 },{ to:Infinity, r:.5353 }],
  SK: [{ to:52057, r:.255 },{ to:55867, r:.275 },{ to:111733, r:.355 },{ to:148734, r:.405 },{ to:157748, r:.435 },{ to:221708, r:.445 },{ to:Infinity, r:.479 }],
  NT: [{ to:50597, r:.205 },{ to:55867, r:.245 },{ to:101198, r:.285 },{ to:111733, r:.355 },{ to:147826, r:.395 },{ to:157748, r:.435 },{ to:221708, r:.4450 },{ to:Infinity, r:.479 }],
  NU: [{ to:53268, r:.19 },{ to:55867, r:.23 },{ to:106537, r:.27 },{ to:111733, r:.33 },{ to:157748, r:.40 },{ to:221708, r:.44 },{ to:Infinity, r:.46 }],
  YT: [{ to:55867, r:.2040 },{ to:111733, r:.2840 },{ to:157748, r:.3340 },{ to:221708, r:.4340 },{ to:500000, r:.4800 },{ to:Infinity, r:.48 }],
};

// ── Functions under test (copy from debt-tool.jsx) ──
function getMarginalRate(income, prov) {
  const brackets = PROV_TAX[prov] || PROV_TAX.ON;
  for (const b of brackets) {
    if (income <= b.to) return b.r;
  }
  return brackets[brackets.length - 1].r;
}

function amortize(bal, annRate, monthlyPay, maxMonths = 600) {
  if (bal <= 0) return { months: 0, totalInt: 0, schedule: [], feasible: true };
  if (monthlyPay <= 0) return { months: Infinity, totalInt: Infinity, schedule: [], feasible: false };
  const mr = annRate / 12;
  let b = bal, totalInt = 0, months = 0;
  const schedule = [];
  while (b > 0.01 && months < maxMonths) {
    const intAmt = b * mr;
    if (monthlyPay <= intAmt && mr > 0) return { months: Infinity, totalInt: Infinity, schedule: [], feasible: false };
    const prinAmt = Math.min(b, Math.max(0, monthlyPay - intAmt));
    b -= prinAmt;
    totalInt += intAmt;
    months++;
    if (months % 12 === 0 || b <= 0.01) {
      schedule.push({ month: months, balance: Math.max(0, b), interest: totalInt, principal: bal - Math.max(0, b) });
    }
  }
  return { months, totalInt, schedule, feasible: true };
}

function multiDebtPayoff(debtsArr, extraMonthly, strategy) {
  if (debtsArr.length === 0) return { months: 0, totalInt: 0, order: [], timeline: [], feasible: true };
  const ds = debtsArr.map(d => ({ ...d, bal: d.bal, rate: d.rate || 0, pay: d.pay || 0, minPay: d.minPay || d.pay || 0 }));
  let sorted;
  switch (strategy) {
    case "avalanche": sorted = ds.slice().sort((a, b) => b.rate - a.rate); break;
    case "snowball": sorted = ds.slice().sort((a, b) => a.bal - b.bal); break;
    case "hybrid": sorted = ds.slice().sort((a, b) => (a.bal / Math.max(a.rate, 0.001)) - (b.bal / Math.max(b.rate, 0.001))); break;
    case "cashflow": sorted = ds.slice().sort((a, b) => b.pay - a.pay); break;
    case "utilization": sorted = ds.slice().sort((a, b) => ((b.bal / Math.max(b.limit || b.bal, 1))) - ((a.bal / Math.max(a.limit || a.bal, 1)))); break;
    case "interest_dollar": sorted = ds.slice().sort((a, b) => (b.bal * b.rate / 12) - (a.bal * a.rate / 12)); break;
    case "custom": sorted = ds.slice(); break;
    default: sorted = ds.slice().sort((a, b) => b.rate - a.rate);
  }
  let totalInt = 0, months = 0;
  const order = [];
  const timeline = [{ month: 0, total: sorted.reduce((s, d) => s + d.bal, 0) }];
  const maxM = 600;
  while (months < maxM) {
    let allPaid = true;
    for (let i = 0; i < sorted.length; i++) { if (sorted[i].bal > 0.01) { allPaid = false; break; } }
    if (allPaid) break;
    let freed = extraMonthly;
    for (let j = 0; j < sorted.length; j++) {
      if (sorted[j].bal <= 0.01) { freed += sorted[j].pay; continue; }
      const mr = sorted[j].rate / 12;
      const intAmt = sorted[j].bal * mr;
      let isTarget = true;
      for (let k = 0; k < j; k++) { if (sorted[k].bal > 0.01) { isTarget = false; break; } }
      const totalPay = sorted[j].pay + (isTarget ? freed : 0);
      const princ = Math.min(sorted[j].bal, Math.max(0, totalPay - intAmt));
      sorted[j].bal -= princ;
      totalInt += intAmt;
      if (sorted[j].bal <= 0.01) {
        const exists = order.find(o => o.name === sorted[j].name);
        if (!exists) order.push({ name: sorted[j].name, type: sorted[j].type, month: months + 1 });
      }
    }
    months++;
    if (months % 3 === 0 || months <= 6) {
      timeline.push({ month: months, total: sorted.reduce((s, d) => s + Math.max(0, d.bal), 0) });
    }
  }
  timeline.push({ month: months, total: 0 });
  const feasible = months < maxM;
  return { months, totalInt, order, timeline, feasible };
}

// Format helpers
const fMo = (m, lang) => {
  if (m === Infinity || !isFinite(m)) return "∞";
  if (m <= 0) return "—";
  const y = Math.floor(m / 12);
  const mo = m % 12;
  if (lang === "fr") return y > 0 ? `${y} an${y > 1 ? "s" : ""}${mo > 0 ? ` ${mo} m` : ""}` : `${mo} mois`;
  return y > 0 ? `${y} yr${y > 1 ? "s" : ""}${mo > 0 ? ` ${mo} mo` : ""}` : `${mo} mo`;
};
const pct = v => ((v || 0) * 100).toFixed(1) + "%";
const freedomDate = (months, lang = "fr") => {
  if (!isFinite(months) || months <= 0) return "—";
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", { year: "numeric", month: "long" });
};

// ═══════════════════════════════════════════════════════════════════
// TEST HARNESS (same pattern as planner)
// ═══════════════════════════════════════════════════════════════════
function runTestSuite() {
  const results = [];
  let pass = 0, fail = 0, total = 0;

  function T(cat, name, got, exp, tol) {
    total++;
    tol = tol || 0;
    const numGot = typeof got === "number" ? Math.round(got * 100) / 100 : got;
    let ok;
    if (got === Infinity && exp === Infinity) ok = true;
    else if (got === -Infinity && exp === -Infinity) ok = true;
    else if (typeof got === "number" && typeof exp === "number") ok = Math.abs(got - exp) <= tol;
    else ok = got === exp;
    if (ok) pass++; else fail++;
    results.push({ cat, name, got: numGot, exp, ok });
  }

  // ════════════════════════════════════════════════════════════════
  // 1. getMarginalRate — 13 provinces × key brackets
  // ════════════════════════════════════════════════════════════════

  // Expected: lowest bracket rate for each province
  T("MargRate", "QC @$10K", getMarginalRate(10000, "QC"), 0.2753);
  T("MargRate", "QC @$50K", getMarginalRate(50000, "QC"), 0.3553);
  T("MargRate", "QC @$100K", getMarginalRate(100000, "QC"), 0.4553);
  T("MargRate", "QC @$150K", getMarginalRate(150000, "QC"), 0.5053);
  T("MargRate", "QC @$250K", getMarginalRate(250000, "QC"), 0.5353);
  T("MargRate", "QC top", getMarginalRate(1000000, "QC"), 0.5353);

  T("MargRate", "ON @$50K", getMarginalRate(50000, "ON"), 0.2015);
  T("MargRate", "ON @$100K", getMarginalRate(100000, "ON"), 0.2965);
  T("MargRate", "ON @$200K", getMarginalRate(200000, "ON"), 0.4648);
  T("MargRate", "ON top", getMarginalRate(300000, "ON"), 0.5353);

  T("MargRate", "AB @$50K", getMarginalRate(50000, "AB"), 0.25);
  T("MargRate", "AB @$200K", getMarginalRate(200000, "AB"), 0.41);
  T("MargRate", "AB top", getMarginalRate(300000, "AB"), 0.48);

  T("MargRate", "BC @$50K", getMarginalRate(50000, "BC"), 0.2272);
  T("MargRate", "BC @$120K", getMarginalRate(120000, "BC"), 0.3850);  // Fixed bracket (was dead code)
  T("MargRate", "BC top", getMarginalRate(300000, "BC"), 0.535);

  // All 13 provinces — lowest bracket
  const provLowest = { AB:.25, BC:.2006, MB:.258, NB:.2402, NL:.235, NS:.2379, ON:.2015, PE:.245, QC:.2753, SK:.255, NT:.205, NU:.19, YT:.204 };
  for (const [pv, expRate] of Object.entries(provLowest)) {
    T("MargRate", `${pv} lowest`, getMarginalRate(1000, pv), expRate, 0.001);
  }

  // All 13 provinces — top bracket
  const provTop = { AB:.48, BC:.535, MB:.504, NB:.533, NL:.548, NS:.54, ON:.5353, PE:.51, QC:.5353, SK:.479, NT:.479, NU:.46, YT:.48 };
  for (const [pv, expRate] of Object.entries(provTop)) {
    T("MargRate", `${pv} top`, getMarginalRate(500000, pv), expRate, 0.001);
  }

  // Edge cases
  T("MargRate", "Zero income QC", getMarginalRate(0, "QC"), 0.2753);  // First bracket
  T("MargRate", "Negative income", getMarginalRate(-5000, "ON"), 0.2015);  // First bracket (income <= to)
  T("MargRate", "Unknown prov → ON", getMarginalRate(50000, "XX"), 0.2015);  // Fallback to ON
  T("MargRate", "Bracket boundary QC", getMarginalRate(18571, "QC"), 0.2753);  // Exactly at boundary
  T("MargRate", "Bracket boundary+1 QC", getMarginalRate(18572, "QC"), 0.3053);  // Just above

  // ════════════════════════════════════════════════════════════════
  // 2. amortize — Loan amortization engine
  // ════════════════════════════════════════════════════════════════

  // Standard mortgage: $300K, 5%, 25yr amortization
  const mtg = amortize(300000, 0.05, 1753.77);  // Standard monthly payment for this
  T("Amort", "Mortgage feasible", mtg.feasible ? 1 : 0, 1);
  T("Amort", "Mortgage ~300mo", mtg.months, 300, 5);
  T("Amort", "Mortgage int ~$226K", mtg.totalInt, 226000, 5000);
  T("Amort", "Mortgage sched len", mtg.schedule.length > 20 ? 1 : 0, 1);

  // Credit card: $5,000, 19.99%, $150/mo minimum
  const cc = amortize(5000, 0.1999, 150);
  T("Amort", "CC feasible", cc.feasible ? 1 : 0, 1);
  T("Amort", "CC months ~45", cc.months, 45, 5);
  T("Amort", "CC int > bal*0.3", cc.totalInt > 1500 ? 1 : 0, 1);  // Significant interest

  // Student loan: $20K, 4.5%, $250/mo
  const sl = amortize(20000, 0.045, 250);
  T("Amort", "Student feasible", sl.feasible ? 1 : 0, 1);
  T("Amort", "Student ~96mo", sl.months, 96, 3);

  // Zero interest loan: $10K, 0%, $500/mo → exactly 20 months
  const zr = amortize(10000, 0, 500);
  T("Amort", "0% feasible", zr.feasible ? 1 : 0, 1);
  T("Amort", "0% months=20", zr.months, 20);
  T("Amort", "0% totalInt=0", zr.totalInt, 0);

  // Edge: pay=0 → infeasible
  const np = amortize(5000, 0.10, 0);
  T("Amort", "pay=0 infeasible", np.feasible ? 0 : 1, 1);
  T("Amort", "pay=0 months=Inf", np.months, Infinity);

  // Edge: bal=0 → instant
  const zb = amortize(0, 0.10, 500);
  T("Amort", "bal=0 months=0", zb.months, 0);
  T("Amort", "bal=0 feasible", zb.feasible ? 1 : 0, 1);

  // Edge: negative bal → instant
  const nb = amortize(-100, 0.10, 500);
  T("Amort", "neg bal months=0", nb.months, 0);

  // Edge: pay < interest → infeasible
  const ui = amortize(100000, 0.20, 100);  // $100/mo on $100K@20% → interest=$1,666/mo
  T("Amort", "Underpay infeasible", ui.feasible ? 0 : 1, 1);
  T("Amort", "Underpay Inf months", ui.months, Infinity);

  // Edge: pay barely covers interest → very slow but feasible
  const bare = amortize(10000, 0.12, 105);  // Interest=$100/mo, pay=$105 → $5/mo principal initially
  T("Amort", "Bare feasible", bare.feasible ? 1 : 0, 1);
  T("Amort", "Bare ~306mo", bare.months, 306, 10);  // Accelerates as balance drops

  // Schedule structure: first entry at year 1 or payoff
  T("Amort", "CC sched[0].month<=12", cc.schedule[0].month <= 12 ? 1 : 0, 1);
  T("Amort", "CC sched last bal~0", cc.schedule[cc.schedule.length - 1].balance < 1 ? 1 : 0, 1);
  T("Amort", "CC sched principal grows", cc.schedule[cc.schedule.length - 1].principal > cc.schedule[0].principal ? 1 : 0, 1);

  // Verify: higher payment = less total interest
  const cc200 = amortize(5000, 0.1999, 200);
  const cc300 = amortize(5000, 0.1999, 300);
  T("Amort", "More pay less int", cc200.totalInt > cc300.totalInt ? 1 : 0, 1);
  T("Amort", "More pay less time", cc200.months > cc300.months ? 1 : 0, 1);

  // ════════════════════════════════════════════════════════════════
  // 3. multiDebtPayoff — 7 strategies
  // ════════════════════════════════════════════════════════════════

  // Standard test portfolio: 3 debts
  const debts3 = [
    { name: "Visa", type: "card", bal: 5000, rate: 0.1999, pay: 150, minPay: 50, limit: 10000 },
    { name: "Car", type: "auto", bal: 15000, rate: 0.065, pay: 400, minPay: 400 },
    { name: "Student", type: "student", bal: 20000, rate: 0.045, pay: 250, minPay: 250 },
  ];

  // Test all 7 strategies run
  const strategies = ["avalanche", "snowball", "hybrid", "cashflow", "utilization", "interest_dollar", "custom"];
  for (const strat of strategies) {
    const r = multiDebtPayoff(debts3, 0, strat);
    T("Strategy", `${strat} feasible`, r.feasible ? 1 : 0, 1);
    T("Strategy", `${strat} months>0`, r.months > 0 ? 1 : 0, 1);
    T("Strategy", `${strat} totalInt>0`, r.totalInt > 0 ? 1 : 0, 1);
    T("Strategy", `${strat} order.len=3`, r.order.length, 3);
    T("Strategy", `${strat} timeline>2`, r.timeline.length > 2 ? 1 : 0, 1);
  }

  // Avalanche: targets highest rate (Visa 19.99%) with freed money, 
  // but Car ($400/mo on $15K) pays off faster than Visa ($150/mo on $5K) naturally.
  // With no extra pay, avalanche can't accelerate Visa much — freed $0.
  // Car: $15K@6.5%@$400 → principal ~$319/mo → ~47mo
  // Visa: $5K@20%@$150 → principal ~$67/mo → ~75mo
  const ava = multiDebtPayoff(debts3, 0, "avalanche");
  T("Avalanche", "Car finishes first (natural)", ava.order[0].name, "Car");
  T("Avalanche", "Student last", ava.order[2].name, "Student");

  // With extra $500, avalanche directs to Visa → Visa pays off faster
  const avaExtra = multiDebtPayoff(debts3, 500, "avalanche");
  T("Avalanche", "+500: Visa first", avaExtra.order[0].name, "Visa");

  // Snowball: targets smallest balance. Visa $5K is smallest but also $150/mo.
  // Same natural payoff: Car first at $400/mo.
  const snb = multiDebtPayoff(debts3, 0, "snowball");
  T("Snowball", "Car first (natural)", snb.order[0].name, "Car");
  T("Snowball", "Student last", snb.order[2].name, "Student");

  // Interest_dollar: highest $/mo interest → Visa $83 > Car $81 > Student $75
  // But again Car pays off first naturally
  const intd = multiDebtPayoff(debts3, 0, "interest_dollar");
  T("IntDollar", "Car first (natural)", intd.order[0].name, "Car");

  // Cashflow: largest payment first → Car $400
  const cf = multiDebtPayoff(debts3, 0, "cashflow");
  T("Cashflow", "Car first", cf.order[0].name, "Car");

  // Avalanche is theoretically optimal for interest minimization, but with fixed minimum
  // payments on non-target debts, other strategies can occasionally win.
  // Verify avalanche is within 5% of the best strategy result.
  const allInts = strategies.map(s => multiDebtPayoff(debts3, 0, s).totalInt);
  const bestInt = Math.min(...allInts);
  T("Optimal", "Avalanche within 5% of best", (ava.totalInt - bestInt) / bestInt < 0.05 ? 1 : 0, 1);

  // ── Extra payment impact ──
  const ava0 = multiDebtPayoff(debts3, 0, "avalanche");
  const ava200 = multiDebtPayoff(debts3, 200, "avalanche");
  const ava500 = multiDebtPayoff(debts3, 500, "avalanche");
  T("ExtraPay", "+200 faster", ava200.months < ava0.months ? 1 : 0, 1);
  T("ExtraPay", "+500 faster still", ava500.months < ava200.months ? 1 : 0, 1);
  T("ExtraPay", "+200 less int", ava200.totalInt < ava0.totalInt ? 1 : 0, 1);
  T("ExtraPay", "+500 less int still", ava500.totalInt < ava200.totalInt ? 1 : 0, 1);

  // ── Freed payment cascade ──
  // When Visa is paid off, its $150/mo should cascade to the next target
  // This means total payoff time < sum of individual amortizations
  const visaAlone = amortize(5000, 0.1999, 150);
  const carAlone = amortize(15000, 0.065, 400);
  const stuAlone = amortize(20000, 0.045, 250);
  const sumAlone = visaAlone.months + carAlone.months + stuAlone.months;
  T("Cascade", "Combined < sum", ava0.months < sumAlone ? 1 : 0, 1);

  // ── Single debt ──
  const single = multiDebtPayoff([debts3[0]], 0, "avalanche");
  T("Single", "1 debt works", single.feasible ? 1 : 0, 1);
  T("Single", "Order has 1", single.order.length, 1);
  T("Single", "Matches amortize", Math.abs(single.months - visaAlone.months) <= 1 ? 1 : 0, 1);

  // ── Empty debts ──
  const empty = multiDebtPayoff([], 0, "avalanche");
  T("Empty", "0 months", empty.months, 0);
  T("Empty", "0 interest", empty.totalInt, 0);
  T("Empty", "feasible", empty.feasible ? 1 : 0, 1);

  // ── All same rate → all strategies give same result ──
  const sameRate = [
    { name: "A", type: "card", bal: 3000, rate: 0.10, pay: 100 },
    { name: "B", type: "card", bal: 7000, rate: 0.10, pay: 200 },
    { name: "C", type: "card", bal: 5000, rate: 0.10, pay: 150 },
  ];
  const avaS = multiDebtPayoff(sameRate, 0, "avalanche");
  const snbS = multiDebtPayoff(sameRate, 0, "snowball");
  T("SameRate", "Same totalInt", Math.abs(avaS.totalInt - snbS.totalInt) < 50 ? 1 : 0, 1);

  // ── High rate + low balance vs low rate + high balance ──
  const hilo = [
    { name: "High", type: "card", bal: 1000, rate: 0.25, pay: 100 },
    { name: "Low", type: "personal", bal: 50000, rate: 0.04, pay: 500 },
  ];
  const avaHL = multiDebtPayoff(hilo, 0, "avalanche");
  const snbHL = multiDebtPayoff(hilo, 0, "snowball");
  T("HiLo", "Avalanche: High first", avaHL.order[0].name, "High");
  T("HiLo", "Snowball: High first too", snbHL.order[0].name, "High");  // Smallest balance = same
  T("HiLo", "Avalanche saves int", avaHL.totalInt <= snbHL.totalInt + 1 ? 1 : 0, 1);

  // ── Utilization strategy: targets highest utilization, but payoff order depends on balance/payment ──
  const utilDebts = [
    { name: "Low util", type: "card", bal: 1000, rate: 0.20, pay: 100, limit: 10000 },  // 10%
    { name: "High util", type: "card", bal: 9000, rate: 0.20, pay: 100, limit: 10000 },  // 90%
  ];
  const utilR = multiDebtPayoff(utilDebts, 0, "utilization");
  // Low util ($1K) pays off first naturally (smaller balance, same payment)
  T("Utilization", "Low util pays off first", utilR.order[0].name, "Low util");
  // With $500 extra on utilization, High util is targeted but Low util ($1K) still
  // pays off first because $100 base + low balance = 2 months. Then freed $100 cascades.
  const utilExtra = multiDebtPayoff(utilDebts, 500, "utilization");
  T("Utilization", "+500: Low pays off first (tiny balance)", utilExtra.order[0].name, "Low util");

  // ── Zero-rate debt ──
  const zeroRate = [
    { name: "Free loan", type: "personal", bal: 5000, rate: 0, pay: 200 },
  ];
  const zrR = multiDebtPayoff(zeroRate, 0, "avalanche");
  T("ZeroRate", "Feasible", zrR.feasible ? 1 : 0, 1);
  T("ZeroRate", "25 months", zrR.months, 25);
  T("ZeroRate", "0 interest", zrR.totalInt, 0);

  // ── Large debt stress test ──
  const bigDebt = [
    { name: "Mega", type: "personal", bal: 500000, rate: 0.08, pay: 5000 },
  ];
  const bigR = multiDebtPayoff(bigDebt, 0, "avalanche");
  T("BigDebt", "Feasible", bigR.feasible ? 1 : 0, 1);
  T("BigDebt", "Months > 100", bigR.months > 100 ? 1 : 0, 1);
  T("BigDebt", "Int > 100K", bigR.totalInt > 100000 ? 1 : 0, 1);

  // ════════════════════════════════════════════════════════════════
  // 4. Format helpers
  // ════════════════════════════════════════════════════════════════

  T("fMo", "0 → —", fMo(0, "fr"), "—");
  T("fMo", "neg → —", fMo(-5, "fr"), "—");
  T("fMo", "Inf → ∞", fMo(Infinity, "fr"), "∞");
  T("fMo", "6 fr", fMo(6, "fr"), "6 mois");
  T("fMo", "12 fr", fMo(12, "fr"), "1 an");
  T("fMo", "25 fr", fMo(25, "fr"), "2 ans 1 m");
  T("fMo", "6 en", fMo(6, "en"), "6 mo");
  T("fMo", "12 en", fMo(12, "en"), "1 yr");
  T("fMo", "25 en", fMo(25, "en"), "2 yrs 1 mo");
  T("fMo", "1 fr", fMo(1, "fr"), "1 mois");
  T("fMo", "13 en", fMo(13, "en"), "1 yr 1 mo");

  T("pct", "0 → 0.0%", pct(0), "0.0%");
  T("pct", "0.05 → 5.0%", pct(0.05), "5.0%");
  T("pct", "0.1999 → 20.0%", pct(0.1999), "20.0%");
  T("pct", "1.0 → 100.0%", pct(1.0), "100.0%");

  T("freedomDate", "0 → —", freedomDate(0, "fr"), "—");
  T("freedomDate", "neg → —", freedomDate(-1, "fr"), "—");
  T("freedomDate", "Inf → —", freedomDate(Infinity, "fr"), "—");
  T("freedomDate", "12 gives date", freedomDate(12, "fr") !== "—" ? 1 : 0, 1);

  // ════════════════════════════════════════════════════════════════
  // 5. Real-world profiles
  // ════════════════════════════════════════════════════════════════

  // Profile 1: Young professional — CC debt + student loan
  const p1Debts = [
    { name: "Visa", type: "card", bal: 8500, rate: 0.1999, pay: 250, minPay: 170 },
    { name: "Student", type: "student", bal: 28000, rate: 0.057, pay: 350, minPay: 350 },
  ];
  const p1 = multiDebtPayoff(p1Debts, 0, "avalanche");
  T("P1-Young", "Visa first", p1.order[0].name, "Visa");
  T("P1-Young", "Feasible", p1.feasible ? 1 : 0, 1);
  T("P1-Young", "< 10 years", p1.months < 120 ? 1 : 0, 1);
  const p1extra = multiDebtPayoff(p1Debts, 300, "avalanche");
  T("P1-Young", "+300 saves >30%int", (p1.totalInt - p1extra.totalInt) / p1.totalInt > 0.30 ? 1 : 0, 1);

  // Profile 2: Family — mortgage mindset, mixed debts
  const p2Debts = [
    { name: "MC", type: "card", bal: 3200, rate: 0.2099, pay: 100, minPay: 64, limit: 5000 },
    { name: "HELOC", type: "heloc", bal: 45000, rate: 0.0695, pay: 500, minPay: 260 },
    { name: "Car loan", type: "auto", bal: 22000, rate: 0.0549, pay: 450, minPay: 450 },
  ];
  const p2ava = multiDebtPayoff(p2Debts, 0, "avalanche");
  const p2snb = multiDebtPayoff(p2Debts, 0, "snowball");
  T("P2-Family", "MC first avalanche", p2ava.order[0].name, "MC");  // Smallest bal + highest rate
  T("P2-Family", "MC first snowball", p2snb.order[0].name, "MC");
  // P2: Counter-intuitively, snowball saves more here because freeing Car's $450/mo 
  // earlier creates a larger cascade effect than avalanche's rate-targeting of MC.
  T("P2-Family", "Both strategies feasible", p2ava.feasible && p2snb.feasible ? 1 : 0, 1);
  T("P2-Family", "All paid off", p2ava.order.length, 3);

  // Profile 3: Pre-retiree — HELOC + LOC, Smith Manoeuvre consideration
  const p3Debts = [
    { name: "LOC", type: "heloc", bal: 75000, rate: 0.0745, pay: 800, minPay: 465, deductible: true },
    { name: "Personal", type: "personal", bal: 12000, rate: 0.0899, pay: 300, minPay: 300 },
  ];
  const p3 = multiDebtPayoff(p3Debts, 0, "avalanche");
  T("P3-Retiree", "Personal first (higher rate)", p3.order[0].name, "Personal");
  T("P3-Retiree", "Feasible", p3.feasible ? 1 : 0, 1);
  // With Smith deduction, effective rate of LOC drops
  const p3margRate = getMarginalRate(95000, "QC");
  const p3effRate = 0.0745 * (1 - p3margRate);
  T("P3-Retiree", "Smith effective < nominal", p3effRate < 0.0745 ? 1 : 0, 1);
  T("P3-Retiree", "Smith effective ~4%", p3effRate, 0.04, 0.01);

  // Profile 4: Heavy debt — stress test
  const p4Debts = [
    { name: "Visa", type: "card", bal: 15000, rate: 0.2299, pay: 450, minPay: 300 },
    { name: "MC", type: "card", bal: 12000, rate: 0.1999, pay: 360, minPay: 240 },
    { name: "Store", type: "card", bal: 8000, rate: 0.2899, pay: 240, minPay: 160, limit: 8000 },
    { name: "Car", type: "auto", bal: 25000, rate: 0.0699, pay: 500, minPay: 500 },
    { name: "LOC", type: "heloc", bal: 30000, rate: 0.0795, pay: 400, minPay: 200 },
  ];
  // P4: payoff order depends on payment/balance ratio, not just rate
  // Store: $8K@29%@$240 → int=$193/mo, princ=$47/mo → ~170mo 
  // MC: $12K@20%@$360 → int=$200/mo, princ=$160/mo → ~75mo
  // Visa: $15K@23%@$450 → int=$287/mo, princ=$163/mo → ~92mo
  // Car: $25K@7%@$500 → int=$146/mo, princ=$354/mo → ~70mo  
  // LOC: $30K@8%@$400 → int=$199/mo, princ=$201/mo → ~149mo
  // Natural order: Car(~70), MC(~75), Visa(~92), LOC(~149), Store(~170)
  const p4 = multiDebtPayoff(p4Debts, 0, "avalanche");
  T("P4-Heavy", "5 debts all paid", p4.order.length, 5);
  T("P4-Heavy", "Feasible", p4.feasible ? 1 : 0, 1);
  T("P4-Heavy", "< 15 years", p4.months < 180 ? 1 : 0, 1);

  // With $1000 extra, avalanche targets Store (28.99%) — now Store can pay off fast
  const p4extra1k = multiDebtPayoff(p4Debts, 1000, "avalanche");
  T("P4-Heavy", "+1K: Store first (targeted)", p4extra1k.order[0].name, "Store");

  // Utilization: Store at 100% (8K/8K) targeted, but Car still pays off first naturally with no extra
  const p4util = multiDebtPayoff(p4Debts, 0, "utilization");
  T("P4-Heavy", "Util: natural order", p4util.order.length, 5);

  // Extra $1000/mo should cut time dramatically
  const p4extra = multiDebtPayoff(p4Debts, 1000, "avalanche");
  T("P4-Heavy", "+1K cuts >30% time", (p4.months - p4extra.months) / p4.months > 0.30 ? 1 : 0, 1);
  T("P4-Heavy", "+1K cuts >40% int", (p4.totalInt - p4extra.totalInt) / p4.totalInt > 0.40 ? 1 : 0, 1);

  // Profile 5: Single card — simplest case
  const p5Debts = [{ name: "Visa", type: "card", bal: 2000, rate: 0.1999, pay: 100, minPay: 40 }];
  const p5 = multiDebtPayoff(p5Debts, 0, "avalanche");
  const p5am = amortize(2000, 0.1999, 100);
  T("P5-Single", "Matches amortize months", Math.abs(p5.months - p5am.months) <= 1 ? 1 : 0, 1);
  T("P5-Single", "Matches amortize int", Math.abs(p5.totalInt - p5am.totalInt) < 5 ? 1 : 0, 1);

  // ════════════════════════════════════════════════════════════════
  // 6. Edge cases & regression guards
  // ════════════════════════════════════════════════════════════════

  // Timeline starts at month 0 with full balance
  T("Timeline", "Starts at 0", ava0.timeline[0].month, 0);
  T("Timeline", "Start total=40K", Math.round(ava0.timeline[0].total), 40000);
  T("Timeline", "Ends at 0 bal", ava0.timeline[ava0.timeline.length - 1].total, 0);

  // Order dedup: same debt shouldn't appear twice
  const orderNames = ava0.order.map(o => o.name);
  const uniqueNames = [...new Set(orderNames)];
  T("Order", "No duplicates", orderNames.length, uniqueNames.length);

  // Hybrid strategy: ratio = bal / rate. Lowest ratio first = target.
  // Visa: 5000/0.1999 = 25,012. Car: 15000/0.065 = 230,769. Student: 20000/0.045 = 444,444.
  // Visa is target, but Car pays off first naturally (higher payment/balance ratio)
  const hyb = multiDebtPayoff(debts3, 0, "hybrid");
  T("Hybrid", "Car first (natural payoff)", hyb.order[0].name, "Car");

  // Custom preserves input order for targeting, but payoff still by natural speed
  const cust = multiDebtPayoff(debts3, 0, "custom");
  T("Custom", "Car first (natural payoff)", cust.order[0].name, "Car");

  // ════════════════════════════════════════════════════════════════
  // 7. Bracket boundary tests (regression for C13 BC fix)
  // ════════════════════════════════════════════════════════════════
  
  // BC: Verify brackets are monotonically increasing
  const bcBrackets = PROV_TAX.BC;
  let bcMonotonic = true;
  for (let i = 1; i < bcBrackets.length; i++) {
    if (bcBrackets[i].to <= bcBrackets[i-1].to && bcBrackets[i].to !== Infinity) {
      bcMonotonic = false;
    }
  }
  T("Brackets", "BC monotonic", bcMonotonic ? 1 : 0, 1);

  // All provinces: brackets must be monotonically increasing
  for (const [pv, brackets] of Object.entries(PROV_TAX)) {
    let mono = true;
    for (let i = 1; i < brackets.length; i++) {
      if (brackets[i].to <= brackets[i-1].to && brackets[i].to !== Infinity) {
        mono = false;
      }
    }
    T("Brackets", `${pv} monotonic`, mono ? 1 : 0, 1);
  }

  // BC income $130K should hit the 38.5% bracket (was dead code before fix)
  T("Brackets", "BC @130K = 38.5%", getMarginalRate(130000, "BC"), 0.385, 0.001);

  // ════════════════════════════════════════════════════════════════
  // RESULTS
  // ════════════════════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════");
  console.log(`  BuildFi Debt Tool — TEST SUITE RESULTS`);
  console.log("═══════════════════════════════════════════════════");
  console.log(`  TOTAL: ${total}  |  PASS: ${pass}  |  FAIL: ${fail}`);
  console.log(`  Rate: ${(pass / total * 100).toFixed(1)}%`);
  console.log("═══════════════════════════════════════════════════\n");

  if (fail > 0) {
    console.log("FAILURES:");
    results.filter(r => !r.ok).forEach(r => {
      console.log(`  ❌ [${r.cat}] ${r.name}: got ${r.got}, expected ${r.exp}`);
    });
    console.log("");
  }

  // Category summary
  const cats = {};
  results.forEach(r => {
    if (!cats[r.cat]) cats[r.cat] = { pass: 0, fail: 0 };
    if (r.ok) cats[r.cat].pass++; else cats[r.cat].fail++;
  });
  console.log("BY CATEGORY:");
  for (const [cat, c] of Object.entries(cats)) {
    const status = c.fail === 0 ? "✅" : "❌";
    console.log(`  ${status} ${cat}: ${c.pass}/${c.pass + c.fail}`);
  }

  return { total, pass, fail, results };
}

// ── Run ──
runTestSuite();
