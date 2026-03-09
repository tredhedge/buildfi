"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";

// ── URL share helpers (base64url JSON) ──
const b64urlEncode = (str) => {
  try {
    return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  } catch (e) { return ""; }
};
const b64urlDecode = (str) => {
  try {
    const pad = str.length % 4 ? "=".repeat(4 - (str.length % 4)) : "";
    const s = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
    return decodeURIComponent(escape(atob(s)));
  } catch (e) { return null; }
};

// ═══════════════════════════════════════════════════════════════════
// BuildFi — Outil interactif de gestion de dettes / Debt Management Tool
// Standalone bonus for Essentiel + Intermédiaire tiers
// ═══════════════════════════════════════════════════════════════════

// ── Palette aligned with BuildFi planner (warm earth tones) ──
const DK = {
  bg: "#242018", card: "#2c2820", s2: "#353028",
  border: "#443e34", borderLight: "#5a5348",
  tx: "#d4cec4", txDim: "#9a8e80", txMuted: "#6e6458",
  accent: "#c49a1a", accentBg: "rgba(196,154,26,.1)",
  red: "#c45050", redBg: "rgba(196,80,80,.08)",
  green: "#3d9a5e", greenBg: "rgba(61,154,94,.08)",
  blue: "#5a94c4", blueBg: "rgba(90,148,196,.08)",
  orange: "#c48a40", orangeBg: "rgba(196,138,64,.08)",
};

// ── Province tax data — ESTIMATED 2026 combined fed+prov marginal brackets ──
// Source: CRA + Revenu Québec / provincial finance ministry published rates
// These are approximations for comparison purposes (Repay vs Invest).
// They do not account for surtaxes, clawbacks, or personal credits.
// For exact figures, users should consult their accountant.
const PROV_TAX = {
  AB: [{ to:58523, r:.25 },{ to:117045, r:.305 },{ to:154906, r:.36 },{ to:175000, r:.38 },{ to:258482, r:.41 },{ to:Infinity, r:.48 }],
  BC: [{ to:47937, r:.2006 },{ to:58523, r:.2272 },{ to:95875, r:.2850 },{ to:117045, r:.3150 },{ to:155844, r:.3850 },{ to:157748, r:.408 },{ to:253414, r:.4670 },{ to:258482, r:.4970 },{ to:Infinity, r:.535 }],
  MB: [{ to:36842, r:.2580 },{ to:58523, r:.2780 },{ to:79625, r:.338 },{ to:117045, r:.3830 },{ to:157748, r:.4380 },{ to:Infinity, r:.504 }],
  NB: [{ to:49958, r:.2402 },{ to:58523, r:.2782 },{ to:99916, r:.3182 },{ to:117045, r:.3582 },{ to:157748, r:.4282 },{ to:176756, r:.4982 },{ to:258482, r:.5182 },{ to:Infinity, r:.533 }],
  NL: [{ to:43198, r:.235 },{ to:58523, r:.295 },{ to:86395, r:.325 },{ to:117045, r:.375 },{ to:154803, r:.425 },{ to:157748, r:.4550 },{ to:215943, r:.4800 },{ to:258482, r:.510 },{ to:275870, r:.5150 },{ to:Infinity, r:.548 }],
  NS: [{ to:29590, r:.2379 },{ to:58523, r:.2987 },{ to:59180, r:.3487 },{ to:93000, r:.3700 },{ to:117045, r:.3850 },{ to:150000, r:.4350 },{ to:157748, r:.4850 },{ to:258482, r:.5000 },{ to:Infinity, r:.54 }],
  ON: [{ to:52886, r:.2015 },{ to:58523, r:.2415 },{ to:105775, r:.2965 },{ to:117045, r:.3148 },{ to:150000, r:.3348 },{ to:157748, r:.3748 },{ to:220000, r:.4648 },{ to:258482, r:.4798 },{ to:Infinity, r:.5353 }],
  PE: [{ to:32656, r:.245 },{ to:58523, r:.285 },{ to:63969, r:.3250 },{ to:117045, r:.3750 },{ to:157748, r:.4450 },{ to:258482, r:.4870 },{ to:Infinity, r:.51 }],
  QC: [{ to:18571, r:.2753 },{ to:37142, r:.3053 },{ to:51780, r:.3553 },{ to:58523, r:.3753 },{ to:103545, r:.4553 },{ to:117045, r:.4753 },{ to:126000, r:.4953 },{ to:157748, r:.5053 },{ to:258482, r:.5253 },{ to:Infinity, r:.5353 }],
  SK: [{ to:52057, r:.255 },{ to:58523, r:.275 },{ to:117045, r:.355 },{ to:148734, r:.405 },{ to:157748, r:.435 },{ to:258482, r:.445 },{ to:Infinity, r:.479 }],
  NT: [{ to:50597, r:.205 },{ to:58523, r:.245 },{ to:101198, r:.285 },{ to:117045, r:.355 },{ to:147826, r:.395 },{ to:157748, r:.435 },{ to:258482, r:.4450 },{ to:Infinity, r:.479 }],
  NU: [{ to:53268, r:.19 },{ to:58523, r:.23 },{ to:106537, r:.27 },{ to:117045, r:.33 },{ to:157748, r:.40 },{ to:258482, r:.44 },{ to:Infinity, r:.46 }],
  YT: [{ to:58523, r:.2040 },{ to:117045, r:.2840 },{ to:157748, r:.3340 },{ to:258482, r:.4340 },{ to:500000, r:.4800 },{ to:Infinity, r:.48 }],
};

function getMarginalRate(income, prov) {
  const brackets = PROV_TAX[prov] || PROV_TAX.ON;
  for (const b of brackets) {
    if (income <= b.to) return b.r;
  }
  return brackets[brackets.length - 1].r;
}

// ── Calculation engines (ported 1:1 from planner) ──
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
    case "utilization": sorted = ds.slice().sort((a, b) => {
      const aUtil = a.limit > 0 ? a.bal / a.limit : -1;
      const bUtil = b.limit > 0 ? b.bal / b.limit : -1;
      return bUtil - aUtil;
    }); break;
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
    // freed = extra monthly + all pre-authorized payments from eliminated debts
    let freed = extraMonthly;
    for (let j = 0; j < sorted.length; j++) {
      if (sorted[j].bal <= 0.01) { freed += sorted[j].pay; continue; }
      const mr = sorted[j].rate / 12;
      const intAmt = sorted[j].bal * mr;
      // Target debt gets its own pre-authorized payment + all freed money
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

// ── Format helpers ──
const f$ = v => {
  if (v == null || isNaN(v)) return "$0";
  return "$" + Math.round(v).toLocaleString("en-CA");
};
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

// ── SVG Mini Chart ──
function DebtChart({ timeline, height = 160, color = DK.accent, id = "main" }) {
  if (!timeline || timeline.length < 2) return null;
  const maxVal = Math.max(...timeline.map(t => t.total));
  const maxMo = Math.max(...timeline.map(t => t.month));
  if (maxVal === 0 || maxMo === 0) return null;
  const w = 100, h = 100;
  const gradId = `cg-${id}`;
  const pts = timeline.map(t => ({
    x: (t.month / maxMo) * w,
    y: h - (t.total / maxVal) * h
  }));
  const path = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  const areaPath = path + ` L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg viewBox={`-2 -2 ${w + 4} ${h + 14}`} style={{ width: "100%", height, display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.length > 0 && <circle cx={pts[0].x} cy={pts[0].y} r="2.5" fill={color} />}
      {pts.length > 1 && <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="2.5" fill={DK.green} />}
      <text x="0" y={h + 10} fontSize="6" fill={DK.txDim} fontFamily="DM Sans, sans-serif">0</text>
      <text x={w} y={h + 10} fontSize="6" fill={DK.txDim} textAnchor="end" fontFamily="DM Sans, sans-serif">{maxMo} mo</text>
    </svg>
  );
}

// ── Reusable UI components (defined outside DebtTool to avoid re-creation) ──
const Card = React.forwardRef(({ children, style, ...props }, ref) => (
  <div ref={ref} style={{ background: DK.card, borderRadius: 8, border: `1px solid ${DK.border}`, padding: 14, marginBottom: 10, ...style }} {...props}>{children}</div>
));

const StatBox = ({ label, value, color = DK.tx, sub, small }) => (
  <div style={{ textAlign: "center", padding: small ? "8px 4px" : "10px 8px", background: DK.s2 || DK.bg, borderRadius: 6, border: `1px solid ${DK.border}`, flex: 1, minWidth: 0 }}>
    <div style={{ fontSize: small ? 16 : 20, fontWeight: 700, color, fontFamily: "JetBrains Mono, monospace", letterSpacing: "-0.02em" }}>{value}</div>
    <div style={{ fontSize: 12, color: DK.txDim, marginTop: 2, lineHeight: 1.3 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: DK.txMuted, marginTop: 1 }}>{sub}</div>}
  </div>
);

const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 14, fontWeight: 600, color: DK.accent, borderBottom: `1px solid ${DK.border}`, paddingBottom: 4, marginBottom: 10, marginTop: 14, fontFamily: "DM Sans, sans-serif", letterSpacing: 0.3 }}>{children}</div>
);

const InputRow = ({ label, tip, children }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
      <span style={{ fontSize: 13, color: DK.txDim }}>{label}</span>
      {tip && <span style={{ fontSize: 11, color: DK.accent, cursor: "help", opacity: 0.6 }} title={tip}>?</span>}
    </div>
    {children}
  </div>
);

// NumInput — local state while typing, commit to parent on blur
// Prevents heavy useMemo recomputation on every keystroke
function NumInput({ value, onChange, step = 100, min = 0, max, prefix = "$", style: sx, inputRef }) {
  const [local, setLocal] = useState(String(value ?? ""));
  const [isFocused, setIsFocused] = useState(false);
  const prevValue = useRef(value);
  useEffect(() => {
    if (!isFocused && value !== prevValue.current) {
      setLocal(String(value ?? ""));
    }
    prevValue.current = value;
  }, [value, isFocused]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {prefix && <span style={{ fontSize: 12, color: DK.txDim }}>{prefix}</span>}
      <input ref={inputRef} type="number" value={local} step={step} min={min} max={max}
        onChange={e => setLocal(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          const n = parseFloat(local);
          if (!isNaN(n)) {
            const clamped = min != null ? Math.max(min, max != null ? Math.min(max, n) : n) : n;
            setLocal(String(clamped));
            onChange(clamped);
          } else {
            setLocal(String(value ?? 0));
          }
        }}
        onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
        style={{ flex: 1, background: DK.bg, color: DK.tx, border: `1px solid ${isFocused ? DK.accent : DK.border}`, borderRadius: 6, padding: "6px 8px", fontSize: 15, fontFamily: "JetBrains Mono, monospace", outline: "none", minWidth: 0, ...sx }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════
export default function DebtTool() {
  const [lang, setLang] = useState("fr");
  const [activeTab, setActiveTab] = useState(0);
  const fr = lang === "fr";

  // ── Debts state ──
  const [debts, setDebts] = useState([]);
  const [coupleOn, setCoupleOn] = useState(false);

  // ── Financial context (optional) ──
  const [income, setIncome] = useState(0);
  const [prov, setProv] = useState("QC");
  const [expReturn, setExpReturn] = useState(0.06);
  const [spouseIncome, setSpouseIncome] = useState(0);
  const [spouseProv, setSpouseProv] = useState("QC");

  // ── Strategy & simulation ──
  const [extraPay, setExtraPay] = useState(0);
  const [snowflakeAmt, setSnowflakeAmt] = useState(0);
  const [selectedStrategy, setSelectedStrategy] = useState("avalanche");

  // ── Mortgage ──
  const [mortgages, setMortgages] = useState([]);

  // ── UI state ──
  const [expandedDebt, setExpandedDebt] = useState(-1);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showAllStrategies, setShowAllStrategies] = useState(false);
  const [expandedStrat, setExpandedStrat] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const importRef = useRef(null);
  const [flash, setFlash] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [infoTab, setInfoTab] = useState("notice");
  const [includePrintDetails, setIncludePrintDetails] = useState(false);
  const debtCardRefs = useRef([]);
  const debtPayRefs = useRef([]);
  const debtMinPayRefs = useRef([]);
  const debtLimitRefs = useRef([]);
  const [focusDebt, setFocusDebt] = useState(null);
  const [highlightDebt, setHighlightDebt] = useState(null);

  // ── Debt type labels (must be before derived values that reference them) ──
  const typeLabels = {
    fr: { card: "Carte de crédit", heloc: "HELOC / Marge", auto: "Prêt auto", student: "Prêt étudiant", personal: "Prêt personnel", other: "Autre" },
    en: { card: "Credit card", heloc: "HELOC / LOC", auto: "Car loan", student: "Student loan", personal: "Personal loan", other: "Other" }
  };
  const hasTerm = (type) => ["auto", "student", "personal", "other"].includes(type);
  const severityColor = (rate) => rate >= 0.15 ? DK.red : rate >= 0.08 ? DK.orange : DK.green;

  // ── Derived values ──
  const margRate = income > 0 ? getMarginalRate(income, prov) : 0.35;
  const spouseMargRate = coupleOn && spouseIncome > 0 ? getMarginalRate(spouseIncome, spouseProv) : margRate;
  // After-tax return blend: typical balanced portfolio income composition
  // 50% capital gains (taxed at inclusion rate ~50%), 30% dividends (eligible, ~70% effective), 20% interest (100%)
  // Weighted tax factor = 0.50*0.50 + 0.30*0.70 + 0.20*1.00 = 0.66
  const BLEND_TAX_FACTOR = 0.50 * 0.50 + 0.30 * 0.70 + 0.20 * 1.00;
  const afterTaxRet = expReturn * (1 - margRate * BLEND_TAX_FACTOR);
  const spouseAfterTaxRet = expReturn * (1 - spouseMargRate * BLEND_TAX_FACTOR);

  const activeDebts = useMemo(() => debts.filter(d => d && d.bal > 0), [debts]);
  // B6: debts with pay=0 can't be paid off — exclude from strategy engines
  const payableDebts = useMemo(() => activeDebts.filter(d => d.pay > 0), [activeDebts]);
  const unpayableDebts = useMemo(() => activeDebts.filter(d => !d.pay || d.pay <= 0), [activeDebts]);
  const totalDebt = useMemo(() => activeDebts.reduce((s, d) => s + d.bal, 0), [activeDebts]);
  const totalMinPay = useMemo(() => activeDebts.reduce((s, d) => s + (d.minPay || d.pay || 0), 0), [activeDebts]);
  const totalPreAuth = useMemo(() => activeDebts.reduce((s, d) => s + (d.pay || 0), 0), [activeDebts]);
  const monthlyInterest = useMemo(() => activeDebts.reduce((s, d) => s + d.bal * (d.rate || 0) / 12, 0), [activeDebts]);
  const dailyInterest = useMemo(() => monthlyInterest / 30.44, [monthlyInterest]);
  const wAvgRate = useMemo(() => totalDebt > 0 ? activeDebts.reduce((s, d) => s + d.bal * (d.rate || 0), 0) / totalDebt : 0, [activeDebts, totalDebt]);

  // ── Health signals (simple, fast) ──
  const healthSignals = useMemo(() => {
    const sigs = [];
    const revolving = activeDebts.filter(d => (d.type === "card" || d.type === "heloc") && d.limit > 0);
    const hiUtil = revolving.filter(d => (d.bal / d.limit) >= 0.80);
    if (hiUtil.length) sigs.push({ key: "util", level: "warn", n: hiUtil.length, labelFr: "Utilisation \u2265 80%", labelEn: "Utilization \u2265 80%" });
    const payLtInt = activeDebts.filter(d => d.pay > 0 && (d.bal * (d.rate || 0) / 12) > d.pay);
    if (payLtInt.length) sigs.push({ key: "negAm", level: "bad", n: payLtInt.length, labelFr: "Paiement < int\u00e9r\u00eats", labelEn: "Payment < interest" });
    const payLtMin = activeDebts.filter(d => d.minPay > 0 && d.pay > 0 && d.pay < d.minPay);
    if (payLtMin.length) sigs.push({ key: "min", level: "bad", n: payLtMin.length, labelFr: "Paiement < minimum", labelEn: "Payment < minimum" });
    return sigs;
  }, [activeDebts]);

  // ── Next best action ──
  const nextBestAction = useMemo(() => {
    const payLtMin = activeDebts.filter(d => d.minPay > 0 && d.pay > 0 && d.pay < d.minPay);
    if (payLtMin.length) {
      return {
        key: "min", level: "bad",
        titleFr: "Corriger les paiements sous le minimum", titleEn: "Fix payments below the minimum",
        whyFr: `${payLtMin.length} dette(s) sous le minimum requis.`, whyEn: `${payLtMin.length} debt(s) below the required minimum.`,
        stepsFr: ["Ajuste le paiement au minimum (au moins).", "Ensuite, applique ta strat\u00e9gie sur le surplus.", "Reviens au simulateur pour v\u00e9rifier la dur\u00e9e."],
        stepsEn: ["Raise the payment to the minimum (at least).", "Then apply your strategy on the extra money.", "Return to the simulator to confirm the timeline."],
        goTab: 0, canAuto: true,
        targetIndex: debts.indexOf(payLtMin[0]), targetField: "pay",
        auto: () => { setDebts(prev => prev.map(d => { if (d.minPay > 0 && d.pay > 0 && d.pay < d.minPay) return { ...d, pay: d.minPay }; return d; })); }
      };
    }
    const payLtInt = activeDebts.filter(d => d.pay > 0 && (d.bal * (d.rate || 0) / 12) > d.pay);
    if (payLtInt.length) {
      const worst = payLtInt.slice().sort((a, b) => ((b.bal * b.rate / 12) - b.pay) - ((a.bal * a.rate / 12) - a.pay))[0];
      const need = Math.ceil((worst.bal * (worst.rate || 0) / 12) + 5);
      return {
        key: "negAm", level: "bad",
        titleFr: "Stopper l'amortissement n\u00e9gatif", titleEn: "Stop negative amortization",
        whyFr: `Au moins une dette augmente (paiement < int\u00e9r\u00eats). Exemple: ${worst.name || "dette"}.`,
        whyEn: `At least one debt is growing (payment < interest). Example: ${worst.name || "debt"}.`,
        stepsFr: [`Augmente le paiement de ${worst.name || "cette dette"} \u00e0 ~${f$(need)}/mo.`, "Garde les autres paiements stables.", "Ensuite, utilise Avalanche ou Snowball sur le surplus."],
        stepsEn: [`Increase ${worst.name || "this debt"} payment to ~${f$(need)}/mo.`, "Keep other payments stable.", "Then use Avalanche or Snowball on the extra money."],
        goTab: 0, canAuto: true,
        targetIndex: debts.indexOf(worst), targetField: "pay",
        auto: () => { setDebts(prev => prev.map(d => { if (d.name === worst.name && d.bal === worst.bal) return { ...d, pay: Math.max(d.pay, need) }; return d; })); }
      };
    }
    const revolving = activeDebts.filter(d => (d.type === "card" || d.type === "heloc") && d.limit > 0);
    const hiUtil = revolving.filter(d => (d.bal / d.limit) >= 0.80).sort((a, b) => (b.bal / b.limit) - (a.bal / a.limit));
    if (hiUtil.length) {
      const top = hiUtil[0];
      const delta = Math.max(0, top.bal - Math.round(top.limit * 0.70));
      return {
        key: "util", level: "warn",
        titleFr: "R\u00e9duire l'utilisation des cartes (\u2264 70%)", titleEn: "Lower credit utilization (\u2264 70%)",
        whyFr: `Utilisation \u00e9lev\u00e9e sur ${top.name || "carte"} (~${Math.round((top.bal / top.limit) * 100)}%).`,
        whyEn: `High utilization on ${top.name || "card"} (~${Math.round((top.bal / top.limit) * 100)}%).`,
        stepsFr: [`Vise une baisse d'environ ${f$(delta)} sur ${top.name || "cette carte"}.`, "Si possible, utilise un paiement ponctuel (snowflake).", "Ensuite, applique ta strat\u00e9gie mensuelle habituelle."],
        stepsEn: [`Aim to pay down about ${f$(delta)} on ${top.name || "this card"}.`, "If possible, use a one-time payment (snowflake).", "Then follow your usual monthly strategy."],
        goTab: 2, canAuto: false
      };
    }
    return null;
  }, [activeDebts, debts]);

  const goToDebt = (i, field = "pay") => {
    if (typeof i !== "number" || i < 0) return;
    setActiveTab(0);
    setHighlightDebt(i);
    setFocusDebt({ i, field });
  };

  const applyNextBest = () => {
    if (!nextBestAction) return;
    if (nextBestAction.canAuto && typeof nextBestAction.auto === "function") nextBestAction.auto();
    if (typeof nextBestAction.targetIndex === "number") { goToDebt(nextBestAction.targetIndex, nextBestAction.targetField || "pay"); return; }
    if (typeof nextBestAction.goTab === "number") setActiveTab(nextBestAction.goTab);
  };

  useEffect(() => {
    if (!focusDebt || activeTab !== 0) return;
    const { i, field } = focusDebt;
    const card = debtCardRefs.current[i];
    if (card && typeof card.scrollIntoView === "function") card.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusMap = { pay: debtPayRefs.current[i], minPay: debtMinPayRefs.current[i], limit: debtLimitRefs.current[i] };
    const el = focusMap[field] || debtPayRefs.current[i];
    const t = setTimeout(() => {
      if (el && typeof el.focus === "function") { el.focus(); if (typeof el.select === "function") el.select(); }
      setFocusDebt(null);
      setTimeout(() => setHighlightDebt(null), 1400);
    }, 380);
    return () => clearTimeout(t);
  }, [focusDebt, activeTab]);

  // ── All 6 strategies computed (only payable debts) ──
  const strategies = useMemo(() => {
    if (payableDebts.length === 0) return [];
    const strats = ["avalanche", "snowball", "hybrid", "cashflow", "utilization", "interest_dollar"];
    const names = {
      fr: { avalanche: "Avalanche", snowball: "Snowball", hybrid: "Hybride", cashflow: "Cash flow", utilization: "Utilisation crédit", interest_dollar: "Intérêts en $" },
      en: { avalanche: "Avalanche", snowball: "Snowball", hybrid: "Hybrid", cashflow: "Cash flow", utilization: "Credit utilization", interest_dollar: "Interest in $" }
    };
    const descs = {
      fr: { avalanche: "Taux le plus élevé d'abord", snowball: "Plus petit solde d'abord", hybrid: "Ratio solde/taux", cashflow: "Plus gros paiement d'abord", utilization: "Utilisation la plus élevée d'abord", interest_dollar: "Plus gros $ d'intérêts/mois" },
      en: { avalanche: "Highest rate first", snowball: "Smallest balance first", hybrid: "Balance-to-rate ratio", cashflow: "Largest payment first", utilization: "Highest utilization first", interest_dollar: "Largest monthly interest $" }
    };
    return strats.map(s => {
      const result = multiDebtPayoff(payableDebts, extraPay, s);
      return { key: s, name: names[lang][s], desc: descs[lang][s], ...result };
    });
  }, [payableDebts, extraPay, lang]);

  const basePayoff = useMemo(() => multiDebtPayoff(payableDebts, 0, selectedStrategy), [payableDebts, selectedStrategy]);
  const selectedResult = useMemo(() => {
    const found = strategies.find(s => s.key === selectedStrategy);
    return found || { months: 0, totalInt: 0, order: [], timeline: [], feasible: true };
  }, [strategies, selectedStrategy]);

  // ── Opportunity cost calculator ──
  const opportunityCost = useMemo(() => {
    if (selectedResult.totalInt > 0 && isFinite(selectedResult.totalInt)) {
      const invested = selectedResult.totalInt;
      const fv10 = invested * Math.pow(1 + expReturn, 10);
      const fv20 = invested * Math.pow(1 + expReturn, 20);
      const fv30 = invested * Math.pow(1 + expReturn, 30);
      return { invested, fv10: Math.round(fv10), fv20: Math.round(fv20), fv30: Math.round(fv30) };
    }
    return null;
  }, [selectedResult, expReturn]);

  // ── Mortgage analyses ──
  const mtgAnalyses = useMemo(() => mortgages.filter(m => m.bal > 0).map(m => {
    const mr = m.rate || 0;
    const amortYrs = m.amort || 25;
    const termYrs = m.termYrs || 5;
    const freq = m.frequency || "monthly";
    const ownerMarg = coupleOn && m.owner === "spouse" ? spouseMargRate : margRate;
    const ownerATR = coupleOn && m.owner === "spouse" ? spouseAfterTaxRet : afterTaxRet;

    // Payment calculation based on frequency
    let effectiveMonthlyPay = 0;
    if (mr > 0 && m.bal > 0) {
      const baseMonthlyPay = m.bal * (mr / 12) / (1 - Math.pow(1 + mr / 12, -amortYrs * 12));
      if (freq === "biweekly") {
        // Regular biweekly: 26 payments/yr, each = annual cost / 26. Same total/yr as monthly.
        // No acceleration, but biweekly compounding reduces total interest slightly.
        // For our monthly amortize(), effective monthly = same as base (minor compounding diff ignored).
        effectiveMonthlyPay = baseMonthlyPay;
      } else if (freq === "acc_biweekly") {
        // Accelerated biweekly: 26 payments/yr, each = monthly / 2 → equiv to 13 monthly payments/yr
        effectiveMonthlyPay = baseMonthlyPay * 13 / 12; // ~8.3% more per month
      } else {
        effectiveMonthlyPay = baseMonthlyPay;
      }
    }
    const mp = effectiveMonthlyPay;

    // Base amortization at current rate
    const base = amortize(m.bal, mr, mp);

    // Renewal scenario: after term, remaining balance at new rate
    let renewalInfo = null;
    if (m.renewalRate && m.renewalRate !== mr && termYrs < amortYrs) {
      const termMonths = termYrs * 12;
      const balAtRenewal = base.schedule.find(s => s.month >= termMonths);
      if (balAtRenewal && balAtRenewal.balance > 0) {
        const remainAmort = amortYrs - termYrs;
        const newMp = balAtRenewal.balance * (m.renewalRate / 12) / (1 - Math.pow(1 + m.renewalRate / 12, -remainAmort * 12));
        const renewalAm = amortize(balAtRenewal.balance, m.renewalRate, newMp);
        renewalInfo = {
          balAtRenewal: balAtRenewal.balance,
          newRate: m.renewalRate,
          newPayment: newMp,
          totalIntRenewal: balAtRenewal.interest + renewalAm.totalInt,
          paymentDiff: newMp - mp,
        };
      }
    }

    const extra100 = amortize(m.bal, mr, mp + 100);
    const extra500 = amortize(m.bal, mr, mp + 500);
    const effRate = m.deductible ? mr * (1 - ownerMarg) : mr;
    return { ...m, mp, base, extra100, extra500, effRate, verdict: effRate > ownerATR ? "repay" : "invest", renewalInfo, freq, ownerMarg, ownerATR };
  }), [mortgages, margRate, afterTaxRet, spouseMargRate, spouseAfterTaxRet, coupleOn]);

  // ── Strategy-aware consolidated schedule for Calendar tab ──
  const strategySchedule = useMemo(() => {
    if (payableDebts.length === 0) return [];
    const ds = payableDebts.map(d => ({ name: d.name || typeLabels[lang][d.type], bal: d.bal, rate: d.rate || 0, pay: d.pay || 0, minPay: d.minPay || d.pay || 0, limit: d.limit || 0, wasPaidOff: false }));
    const sortFn = {
      avalanche: (a, b) => b.rate - a.rate,
      snowball: (a, b) => a.bal - b.bal,
      hybrid: (a, b) => (a.bal / Math.max(a.rate, 0.001)) - (b.bal / Math.max(b.rate, 0.001)),
      cashflow: (a, b) => b.pay - a.pay,
      utilization: (a, b) => { const aU = a.limit > 0 ? a.bal / a.limit : -1; const bU = b.limit > 0 ? b.bal / b.limit : -1; return bU - aU; },
      interest_dollar: (a, b) => (b.bal * b.rate / 12) - (a.bal * a.rate / 12),
    };
    const sorted = ds.slice().sort(sortFn[selectedStrategy] || sortFn.avalanche);
    const schedule = [];
    let month = 0, totalInt = 0;
    const maxM = 600;
    while (month < maxM) {
      let allPaid = sorted.every(d => d.bal <= 0.01);
      if (allPaid) break;
      let freed = extraPay;
      let anyJustPaidOff = false;
      for (let j = 0; j < sorted.length; j++) {
        if (sorted[j].bal <= 0.01) { freed += sorted[j].pay; continue; }
        const mr = sorted[j].rate / 12;
        const intAmt = sorted[j].bal * mr;
        totalInt += intAmt;
        let isTarget = true;
        for (let k = 0; k < j; k++) { if (sorted[k].bal > 0.01) { isTarget = false; break; } }
        const totalPay = sorted[j].pay + (isTarget ? freed : 0);
        const princ = Math.min(sorted[j].bal, Math.max(0, totalPay - intAmt));
        sorted[j].bal -= princ;
        if (sorted[j].bal <= 0.01 && !sorted[j].wasPaidOff) {
          sorted[j].wasPaidOff = true;
          anyJustPaidOff = true;
        }
      }
      month++;
      // B8: Sample at year boundaries, first 3 months, and the month a debt is paid off
      if (month % 12 === 0 || month <= 3 || anyJustPaidOff) {
        schedule.push({
          month,
          debts: sorted.map(d => ({ name: d.name, bal: Math.max(0, d.bal) })),
          total: sorted.reduce((s, d) => s + Math.max(0, d.bal), 0),
          totalInt: Math.round(totalInt),
        });
      }
    }
    return schedule;
  }, [payableDebts, selectedStrategy, extraPay, lang]);

  // ── Per-debt analyses (owner-aware marginal rate for couples) ──
  const debtAnalyses = useMemo(() => activeDebts.map(d => {
    const ownerMarg = coupleOn && d.owner === "spouse" ? spouseMargRate : margRate;
    const ownerATR = coupleOn && d.owner === "spouse" ? spouseAfterTaxRet : afterTaxRet;
    const am = amortize(d.bal, d.rate || 0, d.pay || 0);
    const effRate = d.deductible ? (d.rate || 0) * (1 - ownerMarg) : (d.rate || 0);
    const verdict = effRate > ownerATR ? "repay" : "invest";
    return { ...d, am, effRate, verdict, ownerMarg, ownerATR };
  }), [activeDebts, margRate, afterTaxRet, spouseMargRate, spouseAfterTaxRet, coupleOn]);

  // ── Persistence: URL state (?s=...) takes precedence, then localStorage ──
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const s = params.get("s");
      if (s) {
        const decoded = b64urlDecode(s);
        if (decoded) {
          const data = JSON.parse(decoded);
          if (data.debts) setDebts(data.debts);
          if (data.mortgages) setMortgages(data.mortgages);
          if (data.income != null) setIncome(data.income);
          if (data.prov) setProv(data.prov);
          if (data.expReturn != null) setExpReturn(data.expReturn);
          if (data.coupleOn != null) setCoupleOn(!!data.coupleOn);
          if (data.lang) setLang(data.lang);
          if (data.spouseIncome != null) setSpouseIncome(data.spouseIncome);
          if (data.spouseProv) setSpouseProv(data.spouseProv);
          if (data.selectedStrategy) setSelectedStrategy(data.selectedStrategy);
          if (data.extraPay != null) setExtraPay(data.extraPay);
          if (data.snowflakeAmt != null) setSnowflakeAmt(data.snowflakeAmt);
          return;
        }
      }
      const saved = localStorage.getItem("buildfi_debts_v1");
      if (saved) {
        const data = JSON.parse(saved);
        if (data.debts) setDebts(data.debts);
        if (data.mortgages) setMortgages(data.mortgages);
        if (data.income) setIncome(data.income);
        if (data.prov) setProv(data.prov);
        if (data.expReturn) setExpReturn(data.expReturn);
        if (data.coupleOn) setCoupleOn(data.coupleOn);
        if (data.lang) setLang(data.lang);
        if (data.spouseIncome) setSpouseIncome(data.spouseIncome);
        if (data.spouseProv) setSpouseProv(data.spouseProv);
        if (data.selectedStrategy) setSelectedStrategy(data.selectedStrategy);
        if (data.extraPay) setExtraPay(data.extraPay);
        if (data.snowflakeAmt) setSnowflakeAmt(data.snowflakeAmt);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("buildfi_debts_v1", JSON.stringify({ debts, mortgages, income, prov, expReturn, coupleOn, lang, spouseIncome, spouseProv, selectedStrategy, extraPay, snowflakeAmt }));
    } catch (e) {}
  }, [debts, mortgages, income, prov, expReturn, coupleOn, lang, spouseIncome, spouseProv, selectedStrategy, extraPay, snowflakeAmt]);

  // Auto-open advanced section if existing data present (import/localStorage)
  useEffect(() => {
    if (mortgages.length > 0 || income > 0 || coupleOn) setShowAdvanced(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Share link + PDF ──
  const copyShareLink = async () => {
    try {
      const payload = JSON.stringify({ debts, mortgages, income, prov, expReturn, coupleOn, lang, spouseIncome, spouseProv, selectedStrategy, extraPay, snowflakeAmt });
      const s = b64urlEncode(payload);
      const url = new URL(window.location.href);
      url.searchParams.set("s", s);
      const link = url.toString();
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(link); }
      else { const ta = document.createElement("textarea"); ta.value = link; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); }
      setFlash(fr ? "Lien copi\u00e9" : "Link copied");
      setTimeout(() => setFlash(""), 2200);
    } catch (e) { setFlash(fr ? "Impossible de copier le lien" : "Could not copy link"); setTimeout(() => setFlash(""), 2200); }
  };

  const printPDF = () => { try { window.print(); } catch (e) {} };

  // ── Quick-start example presets ──
  const loadExample = (mode) => {
    if (mode === "essentiel") {
      setLang("fr"); setProv("QC"); setIncome(85000); setCoupleOn(false);
      setDebts([
        { name: "Visa", type: "card", bal: 6200, rate: 0.2199, minPay: 150, pay: 250, term: 0, limit: 8000, deductible: false, owner: "me" },
        { name: "Pr\u00eat auto", type: "auto", bal: 14500, rate: 0.069, minPay: 0, pay: 420, term: 48, limit: 0, deductible: false, owner: "me" },
      ]);
      setMortgages([]); setSelectedStrategy("avalanche"); setExtraPay(100); setActiveTab(1);
    } else {
      setLang("fr"); setProv("QC"); setIncome(110000); setCoupleOn(true); setSpouseProv("QC"); setSpouseIncome(75000);
      setDebts([
        { name: "Mastercard", type: "card", bal: 9800, rate: 0.2399, minPay: 220, pay: 350, term: 0, limit: 12000, deductible: false, owner: "me" },
        { name: "Marge (HELOC)", type: "heloc", bal: 18000, rate: 0.084, minPay: 0, pay: 450, term: 0, limit: 35000, deductible: true, owner: "me" },
        { name: "Pr\u00eat \u00e9tudiant", type: "student", bal: 9200, rate: 0.055, minPay: 0, pay: 180, term: 60, limit: 0, deductible: false, owner: "spouse" },
      ]);
      setMortgages([{ name: "Hypoth\u00e8que", bal: 365000, rate: 0.052, amort: 25, termYrs: 5, renewalRate: 0.045, type: "fixed", frequency: "monthly", deductible: false, owner: "me" }]);
      setSelectedStrategy("avalanche"); setExtraPay(200); setShowAdvanced(true); setActiveTab(1);
    }
  };

  // ── Export/Import ──
  const exportData = () => {
    const data = JSON.stringify({ debts, mortgages, income, prov, expReturn, coupleOn, spouseIncome, spouseProv, selectedStrategy, extraPay, snowflakeAmt, version: 1 }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "buildfi-dettes.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.debts) setDebts(data.debts);
        if (data.mortgages) setMortgages(data.mortgages);
        if (data.income) setIncome(data.income);
        if (data.prov) setProv(data.prov);
        if (data.expReturn) setExpReturn(data.expReturn);
        if (data.coupleOn) setCoupleOn(data.coupleOn);
        if (data.spouseIncome) setSpouseIncome(data.spouseIncome);
        if (data.spouseProv) setSpouseProv(data.spouseProv);
        if (data.selectedStrategy) setSelectedStrategy(data.selectedStrategy);
        if (data.extraPay) setExtraPay(data.extraPay);
        if (data.snowflakeAmt) setSnowflakeAmt(data.snowflakeAmt);
      } catch (err) { alert(fr ? "Fichier invalide" : "Invalid file"); }
      // B11: Reset file input so same file can be re-imported
      if (importRef.current) importRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const addDebt = (owner = "me") => {
    setDebts([...debts, { name: "", type: "card", bal: 0, rate: 0.1999, minPay: 0, pay: 0, term: 0, limit: 0, deductible: false, owner }]);
  };

  const updateDebt = (i, field, val) => {
    const nd = debts.slice();
    nd[i] = { ...nd[i], [field]: val };
    // Reset term for revolving types
    if (field === "type" && (val === "card" || val === "heloc")) nd[i].term = 0;
    // Auto-calculate payment from term when we have bal + rate + term
    const d = nd[i];
    if (hasTerm(d.type) && (field === "term" || field === "bal" || field === "rate")) {
      if (d.term > 0 && d.bal > 0) {
        const mr = (d.rate || 0) / 12;
        const autoPay = mr > 0
          ? d.bal * mr / (1 - Math.pow(1 + mr, -d.term))
          : d.bal / d.term;
        const rounded = Math.round(autoPay);
        // Only auto-fill if user hasn't manually set a different payment
        if (!d._payManual) {
          nd[i].pay = rounded;
          nd[i].minPay = rounded;
        }
      }
    }
    // Mark payment as manually set if user directly edits it
    if (field === "pay") nd[i]._payManual = true;
    setDebts(nd);
  };

  const removeDebt = (i) => setDebts(debts.filter((_, j) => j !== i));

  const addMortgage = () => {
    setMortgages([...mortgages, { name: "", bal: 0, rate: 0.05, amort: 25, termYrs: 5, renewalRate: 0.045, type: "fixed", frequency: "monthly", deductible: false, owner: "me" }]);
  };

  const updateMortgage = (i, field, val) => {
    const nm = mortgages.slice();
    nm[i] = { ...nm[i], [field]: val };
    setMortgages(nm);
  };

  const removeMortgage = (i) => setMortgages(mortgages.filter((_, j) => j !== i));

  // ── Tab definitions ──
  const tabs = [
    { id: 0, label: fr ? "Inventaire" : "Inventory" },
    { id: 1, label: fr ? "Stratégies" : "Strategies" },
    { id: 2, label: fr ? "Simulateur" : "Simulator" },
    { id: 4, label: fr ? "Calendrier" : "Calendar" },
    // — advanced tabs —
    { id: 3, label: fr ? "Rembourser vs Investir" : "Repay vs Invest" },
    { id: 5, label: fr ? "Coût réel" : "True Cost" },
  ];

  // ══════════════════════════════════════════════════════════
  // TAB 0: INVENTORY
  // ══════════════════════════════════════════════════════════
  const renderInventory = () => (
    <div>
      {/* Health signals bar */}
      {healthSignals.length > 0 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          {healthSignals.map(s => (
            <span key={s.key} style={{
              fontSize: 12, padding: "3px 10px", borderRadius: 999, fontWeight: 700,
              border: `1px solid ${s.level === "bad" ? DK.red + "55" : DK.orange + "55"}`,
              background: s.level === "bad" ? DK.redBg : DK.orangeBg,
              color: s.level === "bad" ? DK.red : DK.orange,
            }}>
              {(fr ? s.labelFr : s.labelEn)} · {s.n}
            </span>
          ))}
        </div>
      )}

      {/* Next best action card */}
      {nextBestAction && (
        <Card style={{ borderLeft: `3px solid ${nextBestAction.level === "bad" ? DK.red : DK.orange}`, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: nextBestAction.level === "bad" ? DK.red : DK.orange, marginBottom: 4 }}>
            {fr ? nextBestAction.titleFr : nextBestAction.titleEn}
          </div>
          <div style={{ fontSize: 12, color: DK.txDim, lineHeight: 1.5, marginBottom: 6 }}>
            {fr ? nextBestAction.whyFr : nextBestAction.whyEn}
          </div>
          <ol style={{ margin: 0, paddingLeft: 18, color: DK.txDim, fontSize: 12, lineHeight: 1.4 }}>
            {(fr ? nextBestAction.stepsFr : nextBestAction.stepsEn).map((s, i) => <li key={i} style={{ marginBottom: 3 }}>{s}</li>)}
          </ol>
          {nextBestAction.canAuto && (
            <button onClick={applyNextBest} style={{ marginTop: 8, fontSize: 12, padding: "6px 14px", background: DK.accent, color: DK.bg, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
              {fr ? "Corriger automatiquement" : "Auto-fix"}
            </button>
          )}
        </Card>
      )}

      {/* Welcome banner — only when no debts and no mortgages */}
      {activeDebts.length === 0 && mortgages.length === 0 && (
        <Card style={{ borderLeft: `3px solid ${DK.accent}`, marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: DK.accent, marginBottom: 6 }}>
            {fr ? "Reprenez le contr\u00f4le de vos dettes" : "Take control of your debt"}
          </div>
          <div style={{ fontSize: 13, color: DK.txDim, lineHeight: 1.6, marginBottom: 10 }}>
            {fr
              ? "Ajoutez vos dettes ci-dessous \u2014 solde, taux et paiement mensuel suffisent. L'outil calcule automatiquement la meilleure strat\u00e9gie, le calendrier de remboursement et le co\u00fbt r\u00e9el de chaque dette."
              : "Add your debts below \u2014 balance, rate and monthly payment are enough. The tool automatically calculates the best strategy, payoff calendar, and true cost of each debt."}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: DK.tx, marginBottom: 6 }}>
            {fr ? "D\u00e9marrage rapide" : "Quick start"}
          </div>
          <div style={{ fontSize: 12, color: DK.txDim, lineHeight: 1.5, marginBottom: 8 }}>
            {fr ? "Charge un exemple pour voir l'outil en action, puis remplace par tes chiffres." : "Load an example to see the tool in action, then replace with your numbers."}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => loadExample("essentiel")} style={{ fontSize: 12, padding: "8px 14px", background: DK.accentBg, color: DK.accent, border: `1px solid ${DK.accent}40`, borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
              {fr ? "Exemple Essentiel" : "Essentiel example"}
            </button>
            <button onClick={() => loadExample("inter")} style={{ fontSize: 12, padding: "8px 14px", background: "transparent", color: DK.txDim, border: `1px solid ${DK.border}`, borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
              {fr ? "Exemple Interm\u00e9diaire" : "Interm\u00e9diaire example"}
            </button>
          </div>
        </Card>
      )}

      {/* Debts section */}
      <SectionTitle>{fr ? "Vos dettes" : "Your debts"}</SectionTitle>

      {debts.map((d, i) => {
        const calcPayFromTerm = hasTerm(d.type) && d.term > 0 && d.bal > 0 && (d.rate / 12) > 0
          ? d.bal * (d.rate / 12) / (1 - Math.pow(1 + d.rate / 12, -d.term))
          : d.term > 0 && d.bal > 0 ? d.bal / d.term : 0;
        const monthlyInt = d.bal * (d.rate || 0) / 12;

        return (
          <Card key={i} ref={(el) => { debtCardRefs.current[i] = el; }} style={{ borderLeft: `4px solid ${severityColor(d.rate)}`, padding: 12, boxShadow: highlightDebt === i ? "0 0 0 3px rgba(196,154,26,.35)" : "none", transition: "box-shadow .3s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                {coupleOn && (
                  <select value={d.owner || "me"} onChange={e => updateDebt(i, "owner", e.target.value)}
                    style={{ background: DK.bg, color: DK.txDim, border: `1px solid ${DK.border}`, borderRadius: 4, padding: "2px 4px", fontSize: 11 }}>
                    <option value="me">{fr ? "Moi" : "Me"}</option>
                    <option value="spouse">{fr ? "Conjoint(e)" : "Spouse"}</option>
                    <option value="joint">{fr ? "Les deux" : "Joint"}</option>
                  </select>
                )}
                <select value={d.type} onChange={e => updateDebt(i, "type", e.target.value)}
                  style={{ background: DK.bg, color: DK.tx, border: `1px solid ${DK.border}`, borderRadius: 6, padding: "4px 6px", fontSize: 13, fontWeight: 600 }}>
                  {Object.entries(typeLabels[lang]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <input type="text" value={d.name || ""} onChange={e => updateDebt(i, "name", e.target.value)}
                  placeholder={fr ? "Nom (optionnel)" : "Name (optional)"}
                  style={{ background: "transparent", color: DK.tx, border: "none", fontSize: 13, flex: 1, outline: "none", minWidth: 80 }} />
              </div>
              <button onClick={() => removeDebt(i)} style={{ background: "transparent", color: DK.red, border: "none", fontSize: 16, cursor: "pointer", padding: "2px 6px" }}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <InputRow label={fr ? "Solde" : "Balance"} tip={fr ? "Le montant total que vous devez actuellement" : "The total amount you currently owe"}>
                <NumInput value={d.bal} onChange={v => updateDebt(i, "bal", v)} step={500} />
              </InputRow>
              <InputRow label={fr ? "Taux %" : "Rate %"} tip={fr ? "Taux d'intérêt annuel. Ex: 19.99 pour une carte de crédit" : "Annual interest rate. E.g. 19.99 for a credit card"}>
                <NumInput value={Math.round((d.rate || 0) * 10000) / 100} onChange={v => updateDebt(i, "rate", v / 100)} step={0.25} min={0} max={30} prefix="%" />
              </InputRow>
              <InputRow label={fr ? "Paiement minimum/mois" : "Minimum payment/mo"} tip={fr ? "Le montant minimum exigé par le prêteur chaque mois" : "The minimum amount required by the lender each month"}>
                <NumInput value={d.minPay || 0} onChange={v => updateDebt(i, "minPay", v)} step={25} inputRef={(el) => { debtMinPayRefs.current[i] = el; }} />
              </InputRow>
              {hasTerm(d.type) && (
                <InputRow label={fr ? "Terme restant (mois)" : "Remaining term (mo)"} tip={fr ? "Le nombre de mois restants au contrat. Le paiement se calcule automatiquement." : "Remaining months on the contract. Payment auto-calculates."}>
                  <NumInput value={d.term} onChange={v => updateDebt(i, "term", Math.max(0, Math.round(v)))} step={1} prefix="" />
                </InputRow>
              )}
            </div>

            {/* Pre-authorized payment */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
              <InputRow label={fr ? "Paiement pré-autorisé/mois" : "Pre-authorized payment/mo"} tip={fr ? "Le montant que vous payez réellement chaque mois. C'est ce chiffre qui est utilisé dans les calculs." : "The amount you actually pay each month. This is the number used in calculations."}>
                <NumInput value={d.pay} onChange={v => updateDebt(i, "pay", v)} step={25} inputRef={(el) => { debtPayRefs.current[i] = el; }} />
              </InputRow>
              {d.pay > 0 && (d.minPay || 0) > 0 && d.pay > d.minPay && (
                <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 4 }}>
                  <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 4, background: DK.greenBg, color: DK.green }}>
                    +{f$(d.pay - d.minPay)}/{fr ? "mo au-dessus du minimum" : "mo above minimum"}
                  </span>
                </div>
              )}
              {d.pay > 0 && (d.minPay || 0) > 0 && d.pay < d.minPay && (
                <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 4 }}>
                  <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 4, background: DK.redBg, color: DK.red }}>
                    {fr ? "Sous le minimum requis" : "Below required minimum"}
                  </span>
                </div>
              )}
            </div>

            {/* Credit limit for cards */}
            {d.type === "card" && (
              <InputRow label={fr ? "Limite de crédit" : "Credit limit"} tip={fr ? "Sert au calcul du ratio d'utilisation (impact sur cote de crédit)" : "Used to calculate utilization ratio (credit score impact)"}>
                <NumInput value={d.limit || 0} onChange={v => updateDebt(i, "limit", v)} step={500} inputRef={(el) => { debtLimitRefs.current[i] = el; }} />
              </InputRow>
            )}

            {/* Auto-calc confirmation when payment was auto-filled */}
            {hasTerm(d.type) && d.term > 0 && d.pay > 0 && !d._payManual && d.bal > 0 && (
              <div style={{ fontSize: 12, padding: "4px 8px", background: DK.blueBg, borderRadius: 6, color: DK.blue, marginTop: 4 }}>
                {fr ? `Paiement calculé automatiquement : ${f$(d.pay)}/mo` : `Payment auto-calculated: ${f$(d.pay)}/mo`}
              </div>
            )}

            {/* Quick stats */}
            {d.bal > 0 && !d.pay && (
              <div style={{ marginTop: 8, padding: "6px 10px", background: DK.redBg, borderRadius: 6, fontSize: 13, color: DK.red }}>
                {fr ? "Sans paiement mensuel, cette dette n'est pas incluse dans les calculs. Ajoutez un montant dans « Paiement pré-autorisé »." : "Without a monthly payment, this debt isn't included in calculations. Add an amount under 'Pre-authorized payment'."}
              </div>
            )}
            {d.bal > 0 && d.pay > 0 && (
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, padding: "3px 8px", borderRadius: 4, background: DK.orangeBg, color: DK.orange }}>
                  {fr ? "Intérêts/mois : " : "Interest/mo: "}{f$(Math.round(monthlyInt))}
                </span>
                {d.type === "card" && d.limit > 0 && (
                  <span style={{ fontSize: 12, padding: "3px 8px", borderRadius: 4, background: (d.bal / d.limit) > 0.75 ? DK.redBg : (d.bal / d.limit) > 0.30 ? DK.orangeBg : DK.greenBg, color: (d.bal / d.limit) > 0.75 ? DK.red : (d.bal / d.limit) > 0.30 ? DK.orange : DK.green }}>
                    {fr ? "Utilisation : " : "Utilization: "}{Math.round(d.bal / d.limit * 100)}%
                  </span>
                )}
                {d.rate >= 0.15 && (
                  <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, background: DK.redBg, color: DK.red }}>
                    {fr ? "Taux élevé" : "High rate"}
                  </span>
                )}
              </div>
            )}
          </Card>
        );
      })}

      <button onClick={() => addDebt()} style={{ width: "100%", padding: 10, background: "transparent", color: DK.accent, border: `2px dashed ${DK.accent}40`, borderRadius: 10, fontSize: 14, cursor: "pointer", fontWeight: 600, marginBottom: 12 }}>
        + {fr ? "Ajouter une dette" : "Add a debt"}
      </button>

      {/* Summary dashboard — moved up, right after debts */}
      {(activeDebts.length > 0 || mtgAnalyses.length > 0) && (
        <>
          <SectionTitle>{fr ? "Portrait global" : "Overview"}</SectionTitle>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <StatBox label={fr ? "Dettes totales" : "Total debt"} value={f$(totalDebt)} color={totalDebt > 0 ? DK.red : DK.green} />
            {mtgAnalyses.length > 0 && <StatBox label={fr ? "Hypothèques" : "Mortgages"} value={f$(mtgAnalyses.reduce((s, m) => s + m.bal, 0))} color={DK.orange} />}
            <StatBox label={fr ? "Paiements min/mo" : "Min payments/mo"} value={f$(totalMinPay)} color={DK.txDim} />
            <StatBox label={fr ? "Pré-autorisé/mo" : "Pre-authorized/mo"} value={f$(totalPreAuth)} color={DK.accent}
              sub={totalPreAuth > totalMinPay ? `+${f$(totalPreAuth - totalMinPay)} ${fr ? "vs minimum" : "vs minimum"}` : ""} />
            <StatBox label={fr ? "Intérêts/jour" : "Interest/day"} value={f$(Math.round(dailyInterest))} color={DK.red} sub={fr ? `${f$(Math.round(monthlyInterest))}/mois` : `${f$(Math.round(monthlyInterest))}/mo`} />
            <StatBox label={fr ? "Taux moyen pondéré" : "Weighted avg rate"} value={pct(wAvgRate)} color={DK.tx} />
          </div>
        </>
      )}

      {/* Advanced section toggle */}
      <div
        onClick={() => setShowAdvanced(!showAdvanced)}
        style={{
          fontSize: 13, fontWeight: 600, color: DK.txDim, cursor: "pointer",
          padding: "10px 0", marginTop: 12,
          borderTop: `1px solid ${DK.border}`
        }}>
        {showAdvanced ? "\u25be" : "\u25b8"} {fr ? "Hypothèques, contexte financier et options avancées" : "Mortgages, financial context and advanced options"}
      </div>

      {showAdvanced && (
        <div>
          {/* Context section */}
          <SectionTitle>{fr ? "Contexte financier (optionnel)" : "Financial context (optional)"}</SectionTitle>
          <Card>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <InputRow label={fr ? "Revenu brut/an" : "Gross income/yr"} tip={fr ? "Permet de calculer votre taux marginal d'impôt" : "Used to calculate your marginal tax rate"}>
                <NumInput value={income} onChange={setIncome} step={5000} />
              </InputRow>
              <InputRow label={fr ? "Province" : "Province"}>
                <select value={prov} onChange={e => setProv(e.target.value)}
                  style={{ width: "100%", background: DK.bg, color: DK.tx, border: `1px solid ${DK.border}`, borderRadius: 6, padding: "6px 8px", fontSize: 13 }}>
                  {Object.keys(PROV_TAX).sort().map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </InputRow>
              <InputRow label={fr ? "Rendement espéré" : "Expected return"} tip={fr ? "Rendement annuel brut de votre portefeuille. Entrez 6 pour 6%. Utilisé dans l'onglet Rembourser vs Investir." : "Gross annual portfolio return. Enter 6 for 6%. Used in the Repay vs Invest tab."}>
                <NumInput value={Math.round(expReturn * 100 * 10) / 10} onChange={v => {
                  const rate = v > 0 && v < 1 ? v : v / 100;
                  setExpReturn(Math.max(0, Math.min(0.15, rate)));
                }} step={0.5} min={0} max={15} prefix="%" />
              </InputRow>
            </div>
            {income > 0 && (
              <div style={{ marginTop: 8, padding: "6px 10px", background: DK.accentBg, borderRadius: 6, fontSize: 12, color: DK.txDim }}>
                {fr ? `Taux marginal estimé : ${pct(margRate)} · Rendement après impôt (est.) : ${pct(afterTaxRet)}` : `Estimated marginal rate: ${pct(margRate)} · After-tax return (est.): ${pct(afterTaxRet)}`}
              </div>
            )}
            {!income && (
              <div style={{ marginTop: 8, padding: "6px 10px", background: DK.orangeBg, borderRadius: 6, fontSize: 12, color: DK.orange }}>
                {fr ? `Sans revenu saisi, on utilise un taux marginal estimé de ${pct(margRate)}. Pour un calcul plus précis, entrez votre revenu ci-dessus.` : `Without income entered, we use an estimated marginal rate of ${pct(margRate)}. For a more accurate calculation, enter your income above.`}
              </div>
            )}
            {coupleOn && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                <InputRow label={fr ? "Revenu conjoint(e)/an" : "Spouse income/yr"} tip={fr ? "Pour calculer le taux marginal du conjoint (Smith Manoeuvre, Rembourser vs Investir)" : "For computing spouse's marginal rate (Smith Manoeuvre, Repay vs Invest)"}>
                  <NumInput value={spouseIncome} onChange={setSpouseIncome} step={5000} />
                </InputRow>
                <InputRow label={fr ? "Province conjoint(e)" : "Spouse province"}>
                  <select value={spouseProv} onChange={e => setSpouseProv(e.target.value)}
                    style={{ width: "100%", background: DK.bg, color: DK.tx, border: `1px solid ${DK.border}`, borderRadius: 6, padding: "6px 8px", fontSize: 13 }}>
                    {Object.keys(PROV_TAX).sort().map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </InputRow>
              </div>
            )}
          </Card>

          {/* Couple toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: DK.txDim }}>
              <input type="checkbox" checked={coupleOn} onChange={e => setCoupleOn(e.target.checked)}
                style={{ accentColor: DK.accent }} />
              {fr ? "Mode couple" : "Couple mode"}
            </label>
          </div>

          {/* Mortgages */}
          <SectionTitle>{fr ? "Hypothèques" : "Mortgages"}</SectionTitle>
          {mortgages.map((m, i) => (
            <Card key={`m${i}`} style={{ borderLeft: `4px solid ${DK.orange}`, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                  {coupleOn && (
                    <select value={m.owner || "me"} onChange={e => updateMortgage(i, "owner", e.target.value)}
                      style={{ background: DK.bg, color: DK.txDim, border: `1px solid ${DK.border}`, borderRadius: 4, padding: "2px 4px", fontSize: 11 }}>
                      <option value="me">{fr ? "Moi" : "Me"}</option>
                      <option value="spouse">{fr ? "Conjoint(e)" : "Spouse"}</option>
                      <option value="joint">{fr ? "Les deux" : "Joint"}</option>
                    </select>
                  )}
                  <input type="text" value={m.name || ""} onChange={e => updateMortgage(i, "name", e.target.value)}
                    placeholder={fr ? "Nom (ex: Résidence principale)" : "Name (e.g. Primary home)"}
                    style={{ background: "transparent", color: DK.tx, border: "none", fontSize: 14, fontWeight: 600, flex: 1, outline: "none" }} />
                </div>
                <button onClick={() => removeMortgage(i)} style={{ background: "transparent", color: DK.red, border: "none", fontSize: 16, cursor: "pointer" }}>✕</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                <InputRow label={fr ? "Solde" : "Balance"} tip={fr ? "Le solde hypothécaire restant" : "Remaining mortgage balance"}><NumInput value={m.bal} onChange={v => updateMortgage(i, "bal", v)} step={5000} /></InputRow>
                <InputRow label={fr ? "Taux %" : "Rate %"} tip={fr ? "Taux d'intérêt annuel actuel" : "Current annual interest rate"}><NumInput value={Math.round((m.rate || 0) * 10000) / 100} onChange={v => updateMortgage(i, "rate", v / 100)} step={0.1} prefix="%" /></InputRow>
                <InputRow label={fr ? "Amortissement (ans)" : "Amortization (yrs)"} tip={fr ? "Durée totale de remboursement du prêt" : "Total loan repayment period"}><NumInput value={m.amort || 25} onChange={v => updateMortgage(i, "amort", v)} step={1} prefix="" /></InputRow>
                <InputRow label={fr ? "Terme (ans)" : "Term (yrs)"} tip={fr ? "Durée avant le prochain renouvellement" : "Duration until next renewal"}><NumInput value={m.termYrs || 5} onChange={v => updateMortgage(i, "termYrs", v)} step={1} prefix="" /></InputRow>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
                <InputRow label={fr ? "Taux renouvellement estimé" : "Est. renewal rate"}>
                  <NumInput value={Math.round((m.renewalRate || 0) * 10000) / 100} onChange={v => updateMortgage(i, "renewalRate", v / 100)} step={0.1} prefix="%" />
                </InputRow>
                <InputRow label={fr ? "Type" : "Type"}>
                  <select value={m.type || "fixed"} onChange={e => updateMortgage(i, "type", e.target.value)}
                    style={{ width: "100%", background: DK.bg, color: DK.tx, border: `1px solid ${DK.border}`, borderRadius: 6, padding: "6px 8px", fontSize: 13 }}>
                    <option value="fixed">{fr ? "Fixe" : "Fixed"}</option>
                    <option value="variable">{fr ? "Variable" : "Variable"}</option>
                  </select>
                </InputRow>
                <InputRow label={fr ? "Fréquence" : "Frequency"}>
                  <select value={m.frequency || "monthly"} onChange={e => updateMortgage(i, "frequency", e.target.value)}
                    style={{ width: "100%", background: DK.bg, color: DK.tx, border: `1px solid ${DK.border}`, borderRadius: 6, padding: "6px 8px", fontSize: 13 }}>
                    <option value="monthly">{fr ? "Mensuel" : "Monthly"}</option>
                    <option value="biweekly">{fr ? "Aux 2 semaines" : "Biweekly"}</option>
                    <option value="acc_biweekly">{fr ? "Acc. aux 2 semaines" : "Acc. biweekly"}</option>
                  </select>
                </InputRow>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 12, color: DK.txDim, marginTop: 6 }}>
                <input type="checkbox" checked={m.deductible || false} onChange={e => updateMortgage(i, "deductible", e.target.checked)} style={{ accentColor: DK.accent }} />
                {fr ? "Intérêts déductibles (Smith Manoeuvre)" : "Deductible interest (Smith Manoeuvre)"}
              </label>
            </Card>
          ))}

          <button onClick={addMortgage} style={{ width: "100%", padding: 10, background: "transparent", color: DK.orange, border: `2px dashed ${DK.orange}40`, borderRadius: 10, fontSize: 14, cursor: "pointer", fontWeight: 600 }}>
            + {fr ? "Ajouter une hypothèque" : "Add a mortgage"}
          </button>
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════════════════════
  // TAB 1: STRATEGIES COMPARISON
  // ══════════════════════════════════════════════════════════
  const renderStrategies = () => {
    if (payableDebts.length === 0) return <Card><div style={{ textAlign: "center", padding: 32, color: DK.txDim, lineHeight: 1.6 }}>{fr ? "Commencez par ajouter vos dettes dans l'onglet Inventaire. Une fois que vous aurez entré un paiement mensuel, les stratégies apparaîtront ici." : "Start by adding your debts in the Inventory tab. Once you enter a monthly payment, strategies will appear here."}</div></Card>;

    const bestTime = Math.min(...strategies.map(s => s.months));
    const bestInt = Math.min(...strategies.map(s => s.totalInt));

    // One-liner + detail explanations for each strategy
    const stratInfo = {
      avalanche: {
        line: { fr: "Taux le plus élevé en premier", en: "Highest rate first" },
        detail: { fr: "On attaque la dette la plus coûteuse en premier. Les autres reçoivent le paiement minimum. C'est l'approche qui coûte le moins cher en intérêts — mais si votre pire dette est aussi la plus grosse, les premiers résultats peuvent prendre du temps.", en: "You attack the most expensive debt first. Others get minimum payments. This costs the least in interest — but if your worst debt is also the biggest, early results can take a while." },
      },
      snowball: {
        line: { fr: "Plus petit solde en premier", en: "Smallest balance first" },
        detail: { fr: "On élimine la plus petite dette d'abord, peu importe le taux. Chaque dette éliminée libère de l'argent pour la suivante. Les victoires rapides créent du momentum — c'est souvent ce qui fait la différence entre abandonner et continuer.", en: "You eliminate the smallest debt first, regardless of rate. Each eliminated debt frees up cash for the next. Quick wins build momentum — that's often what makes the difference between giving up and pushing through." },
      },
      hybrid: {
        line: { fr: "Petit solde + taux élevé en premier", en: "Small balance + high rate first" },
        detail: { fr: "On trie les dettes par ratio solde/taux. Les petites dettes à taux élevé passent en premier. Un bon compromis entre économies d'intérêts et motivation.", en: "Debts are sorted by balance-to-rate ratio. Small high-rate debts go first. A solid compromise between interest savings and motivation." },
      },
      cashflow: {
        line: { fr: "Plus gros paiement en premier", en: "Largest payment first" },
        detail: { fr: "On élimine la dette avec le plus gros paiement mensuel en premier. L'idée : libérer le maximum de budget le plus vite possible. Utile quand chaque dollar compte.", en: "You eliminate the debt with the biggest monthly payment first. The idea: free up as much budget as possible, fast. Useful when every dollar counts." },
      },
      utilization: {
        line: { fr: "Utilisation la plus élevée en premier", en: "Highest utilization first" },
        detail: { fr: "On réduit en priorité la carte ou marge la plus utilisée par rapport à sa limite. L'objectif : améliorer votre cote de crédit le plus vite possible. Idéal avant une demande d'hypothèque.", en: "You prioritize paying down the card or line most maxed out relative to its limit. Goal: improve your credit score fastest. Ideal before a mortgage application." },
      },
      interest_dollar: {
        line: { fr: "Plus gros $ d'intérêts/mois en premier", en: "Largest interest $/mo first" },
        detail: { fr: "On cible la dette qui génère le plus de dollars d'intérêts chaque mois. C'est solde × taux — pas juste le taux. Votre facture d'intérêts mensuelle baisse le plus vite.", en: "You target the debt generating the most interest dollars per month. That's balance × rate — not just the rate. Your monthly interest bill drops fastest." },
      },
    };

    // Sort strategies by total interest (best first) for ranking
    const ranked = [...strategies].sort((a, b) => a.totalInt - b.totalInt);
    const top3 = ranked.slice(0, 3);
    const rest = ranked.slice(3);

    const renderStratCard = (s, rank) => {
      const isBestTime = s.months === bestTime;
      const isBestInt = Math.round(s.totalInt) === Math.round(bestInt);
      const isSelected = s.key === selectedStrategy;
      const isExpanded = expandedStrat === s.key;
      const info = stratInfo[s.key];

      return (
        <Card key={s.key} style={{
          cursor: "pointer",
          border: isSelected ? `1px solid ${DK.accent}` : `1px solid ${DK.border}`,
          borderLeft: isSelected ? `3px solid ${DK.accent}` : `1px solid ${DK.border}`,
          background: isSelected ? DK.accentBg : DK.card,
        }} onClick={() => setSelectedStrategy(s.key)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                {rank != null && <span style={{ fontSize: 12, fontWeight: 700, color: DK.txDim, minWidth: 18 }}>#{rank}</span>}
                <span style={{ fontSize: 15, fontWeight: 700, color: isSelected ? DK.accent : DK.tx }}>{s.name}</span>
                {isBestInt && <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, background: DK.greenBg, color: DK.green, fontWeight: 600 }}>{fr ? "$ optimal" : "$ optimal"}</span>}
                {isBestTime && !isBestInt && <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, background: DK.blueBg, color: DK.blue, fontWeight: 600 }}>{fr ? "Plus rapide" : "Fastest"}</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13, color: DK.txDim }}>{info.line[lang]}</span>
                <span onClick={(e) => { e.stopPropagation(); setExpandedStrat(isExpanded ? null : s.key); }}
                  style={{ fontSize: 11, color: DK.accent, cursor: "help", opacity: 0.7, fontWeight: 500 }}
                  title={info.detail[lang]}>
                  {isExpanded ? (fr ? "▾ moins" : "▾ less") : (fr ? "▸ en savoir plus" : "▸ learn more")}
                </span>
              </div>
            </div>
            <div style={{ textAlign: "right", marginLeft: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: DK.tx, fontFamily: "JetBrains Mono, monospace" }}>{fMo(s.months, lang)}</div>
              <div style={{ fontSize: 13, color: DK.orange }}>{f$(Math.round(s.totalInt))} {fr ? "int." : "int."}</div>
            </div>
          </div>
          {isExpanded && (
            <div style={{ fontSize: 13, color: DK.txDim, lineHeight: 1.6, marginTop: 8, padding: "8px 10px", background: DK.bg, borderRadius: 6 }}>
              {info.detail[lang]}
            </div>
          )}
          {s.order.length > 0 && (
            <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
              {s.order.map((o, oi) => (
                <span key={oi} style={{ fontSize: 12, padding: "3px 8px", borderRadius: 4, background: DK.greenBg, color: DK.green }}>
                  {o.name || typeLabels[lang][o.type] || o.type} → {fMo(o.month, lang)}
                </span>
              ))}
            </div>
          )}
        </Card>
      );
    };

    return (
      <div>
        {/* Warning for debts without payments */}
        {unpayableDebts.length > 0 && (
          <Card style={{ borderLeft: `3px solid ${DK.orange}`, marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: DK.orange }}>
              {fr
                ? `${unpayableDebts.length} dette(s) sans paiement ne sont pas incluses : ${unpayableDebts.map(d => d.name || typeLabels[lang][d.type]).join(", ")}.`
                : `${unpayableDebts.length} debt(s) without payment excluded: ${unpayableDebts.map(d => d.name || typeLabels[lang][d.type]).join(", ")}.`}
            </div>
          </Card>
        )}

        <SectionTitle>{fr ? "Quelle approche vous convient ?" : "Which approach suits you?"}</SectionTitle>
        <div style={{ fontSize: 13, color: DK.txDim, marginBottom: 12, lineHeight: 1.6 }}>
          {fr
            ? "Classées par économies d'intérêts. Cliquez sur celle qui vous parle — elle sera utilisée dans les autres onglets."
            : "Ranked by interest savings. Click the one that speaks to you — it'll be used across the other tabs."}
        </div>

        {/* Top 3 */}
        {top3.map((s, i) => renderStratCard(s, i + 1))}

        {/* Expandable rest */}
        {rest.length > 0 && (
          <>
            <div
              onClick={() => setShowAllStrategies(!showAllStrategies)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 0", cursor: "pointer", fontSize: 13, color: DK.txDim, userSelect: "none" }}>
              <span style={{ color: DK.accent, fontSize: 14 }}>{showAllStrategies ? "▾" : "▸"}</span>
              {fr ? `Voir les ${rest.length} autres approches` : `See ${rest.length} more approaches`}
            </div>
            {showAllStrategies && rest.map((s, i) => renderStratCard(s, i + 4))}
          </>
        )}

        <div style={{ fontSize: 12, color: DK.txMuted, fontStyle: "italic", marginTop: 10 }}>
          {fr ? "Ces résultats supposent que les paiements sont maintenus comme prévu. En pratique, les imprévus arrivent — et c'est normal." : "These results assume payments are maintained as planned. In practice, the unexpected happens — and that's normal."}
        </div>

        {/* Next step guidance */}
        {selectedResult.months > 0 && (
          <Card style={{ marginTop: 12, borderLeft: `3px solid ${DK.accent}`, background: DK.accentBg }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: DK.accent, marginBottom: 4 }}>{fr ? "Prochaine étape" : "Next step"}</div>
            <div style={{ fontSize: 13, color: DK.txDim, lineHeight: 1.6 }}>
              {fr
                ? `Vous avez choisi ${strategies.find(s => s.key === selectedStrategy)?.name}. Allez dans l'onglet Simulateur pour tester l'impact d'un paiement supplémentaire, ou dans Calendrier pour voir votre plan mois par mois.`
                : `You chose ${strategies.find(s => s.key === selectedStrategy)?.name}. Head to the Simulator tab to test the impact of extra payments, or Calendar to see your month-by-month plan.`}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => setActiveTab(2)} style={{ fontSize: 13, padding: "6px 14px", background: DK.accent, color: DK.bg, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
                {fr ? "Simulateur →" : "Simulator →"}
              </button>
              <button onClick={() => setActiveTab(4)} style={{ fontSize: 13, padding: "6px 14px", background: "transparent", color: DK.accent, border: `1px solid ${DK.accent}40`, borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
                {fr ? "Calendrier →" : "Calendar →"}
              </button>
            </div>
          </Card>
        )}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════
  // TAB 2: SIMULATOR
  // ══════════════════════════════════════════════════════════
  const renderSimulator = () => {
    if (payableDebts.length === 0) return <Card><div style={{ textAlign: "center", padding: 32, color: DK.txDim, lineHeight: 1.6 }}>{fr ? "Le simulateur sera disponible une fois vos dettes ajoutées avec un paiement mensuel." : "The simulator will be available once you've added debts with a monthly payment."}</div></Card>;

    // Determine which debt is the priority target for the selected strategy (by original index)
    const indexedDebts = payableDebts.map((d, idx) => ({ ...d, _origIdx: idx }));
    const sortedForSnowflake = [...indexedDebts].sort((a, b) => {
      switch (selectedStrategy) {
        case "snowball": return a.bal - b.bal;
        case "hybrid": return (a.bal / Math.max(a.rate, 0.001)) - (b.bal / Math.max(b.rate, 0.001));
        case "cashflow": return b.pay - a.pay;
        case "utilization": { const aU = a.limit > 0 ? a.bal / a.limit : -1; const bU = b.limit > 0 ? b.bal / b.limit : -1; return bU - aU; }
        case "interest_dollar": return (b.bal * b.rate / 12) - (a.bal * a.rate / 12);
        default: return b.rate - a.rate; // avalanche + custom
      }
    });
    const targetIdx = sortedForSnowflake[0]?._origIdx;
    const snowflakeResult = snowflakeAmt > 0 && targetIdx != null
      ? multiDebtPayoff(payableDebts.map((d, idx) => {
          return idx === targetIdx ? { ...d, bal: Math.max(0, d.bal - snowflakeAmt) } : d;
        }), extraPay, selectedStrategy)
      : null;

    return (
      <div>
        <SectionTitle>{fr ? "Paiement supplémentaire mensuel" : "Monthly extra payment"}</SectionTitle>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 14, color: DK.txDim }}>{fr ? "Montant supplémentaire/mois" : "Extra amount/mo"}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: DK.accent, fontFamily: "JetBrains Mono, monospace" }}>{f$(extraPay)}/mo</span>
          </div>
          <input type="range" min={0} max={2000} step={25} value={extraPay} onChange={e => setExtraPay(Number(e.target.value))}
            style={{ width: "100%", accentColor: DK.accent, height: 6 }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: DK.txMuted, marginTop: 2 }}>
            <span>$0</span><span>$500</span><span>$1,000</span><span>$1,500</span><span>$2,000</span>
          </div>

          {/* Before / After comparison */}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <StatBox label={fr ? "Sans extra" : "No extra"} value={fMo(basePayoff.months, lang)} color={DK.txDim}
              sub={`${f$(Math.round(basePayoff.totalInt))} int.`} />
            <StatBox label={fr ? `Avec +${f$(extraPay)}/mo` : `With +${f$(extraPay)}/mo`} value={fMo(selectedResult.months, lang)} color={DK.accent}
              sub={`${f$(Math.round(selectedResult.totalInt))} int.`} />
            <StatBox label={fr ? "Économies" : "Savings"} value={fMo(basePayoff.months - selectedResult.months, lang)} color={DK.green}
              sub={`${f$(Math.round(basePayoff.totalInt - selectedResult.totalInt))} ${fr ? "sauvés" : "saved"}`} />
          </div>

          {/* Chart */}
          {selectedResult.timeline && (
            <div style={{ marginTop: 12 }}>
              <DebtChart timeline={selectedResult.timeline} color={DK.accent} />
            </div>
          )}

          {/* Freedom date */}
          <div style={{ textAlign: "center", marginTop: 12, padding: 10, background: DK.greenBg, borderRadius: 6, border: `1px solid rgba(61,154,94,.15)` }}>
            <div style={{ fontSize: 11, color: DK.green, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{fr ? "Date de liberté" : "Freedom date"}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: DK.green, fontFamily: "JetBrains Mono, monospace" }}>{freedomDate(selectedResult.months, lang)}</div>
          </div>
        </Card>

        {/* Snowflake */}
        <SectionTitle>{fr ? "Paiement ponctuel (Snowflake)" : "Lump sum payment (Snowflake)"}</SectionTitle>
        <Card>
          <div style={{ fontSize: 12, color: DK.txDim, marginBottom: 8, lineHeight: 1.6 }}>{fr ? "Un remboursement d'impôt, un bonus, un cadeau de Noël qui traîne... Voyez l'impact d'un paiement unique sur votre plan." : "A tax refund, a bonus, birthday money lying around... See the impact of a one-time payment on your plan."}</div>
          <NumInput value={snowflakeAmt} onChange={setSnowflakeAmt} step={500} />
          {snowflakeAmt > 0 && snowflakeResult && (
            <div style={{ marginTop: 8, padding: 8, background: DK.greenBg, borderRadius: 6, fontSize: 12, color: DK.green }}>
              {fr
                ? `Un paiement de ${f$(snowflakeAmt)} sur votre dette prioritaire économiserait environ ${f$(Math.round(selectedResult.totalInt - snowflakeResult.totalInt))} d'intérêts et ${fMo(selectedResult.months - snowflakeResult.months, lang)}.`
                : `A ${f$(snowflakeAmt)} payment on your priority debt would save approximately ${f$(Math.round(selectedResult.totalInt - snowflakeResult.totalInt))} in interest and ${fMo(selectedResult.months - snowflakeResult.months, lang)}.`}
            </div>
          )}
        </Card>

        {/* Next step CTA */}
        {payableDebts.length > 0 && (
          <Card style={{ marginTop: 12, borderLeft: `3px solid ${DK.accent}`, background: DK.accentBg }}>
            <div style={{ fontSize: 13, color: DK.txDim, lineHeight: 1.6 }}>
              {fr
                ? "Consultez le Calendrier pour voir votre plan mois par mois, ou explorez Rembourser vs Investir pour savoir si accélérer le remboursement est la meilleure utilisation de votre argent."
                : "Check the Calendar for your month-by-month plan, or explore Repay vs Invest to see if accelerating payoff is the best use of your money."}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => setActiveTab(4)} style={{ fontSize: 13, padding: "6px 14px", background: DK.accent, color: DK.bg, border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
                {fr ? "Calendrier \u2192" : "Calendar \u2192"}
              </button>
              <button onClick={() => setActiveTab(3)} style={{ fontSize: 13, padding: "6px 14px", background: "transparent", color: DK.accent, border: `1px solid ${DK.accent}40`, borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
                {fr ? "Rembourser vs Investir \u2192" : "Repay vs Invest \u2192"}
              </button>
            </div>
          </Card>
        )}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════
  // TAB 3: REPAY VS INVEST
  // ══════════════════════════════════════════════════════════
  const renderRepayVsInvest = () => {
    if (activeDebts.length === 0 && mtgAnalyses.length === 0) return <Card><div style={{ textAlign: "center", padding: 32, color: DK.txDim, lineHeight: 1.6 }}>{fr ? "Ajoutez vos dettes ou hypothèques pour voir si rembourser ou investir est plus avantageux dans votre situation." : "Add your debts or mortgages to see whether repaying or investing makes more sense in your situation."}</div></Card>;

    return (
      <div>
        <SectionTitle>{fr ? "Rembourser ou investir ?" : "Repay or invest?"}</SectionTitle>
        <div style={{ fontSize: 13, color: DK.txDim, marginBottom: 12, lineHeight: 1.6 }}>
          {fr
            ? `Pour chaque dette, on compare son coût réel avec ce que vos placements pourraient rapporter après impôt (estimé à ${pct(afterTaxRet)}). Ce n'est pas une recommandation — c'est un point de repère pour prendre votre décision. Pour des chiffres exacts adaptés à votre situation, consultez votre comptable.`
            : `For each debt, we compare its real cost with what your investments could return after tax (estimated at ${pct(afterTaxRet)}). This isn't a recommendation — it's a reference point to help you decide. For exact figures tailored to your situation, consult your accountant.`}
        </div>

        {/* Reference rates */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <StatBox small label={fr ? "Taux marginal (est.)" : "Marginal rate (est.)"} value={pct(margRate)} color={DK.tx} />
          <StatBox small label={fr ? "Rendement espéré" : "Expected return"} value={pct(expReturn)} color={DK.blue} />
          <StatBox small label={fr ? "Rendement après impôt (est.)" : "After-tax return (est.)"} value={pct(afterTaxRet)} color={DK.accent}
            sub={fr ? "(mixte GC/div/int)" : "(blended CG/div/int)"} />
        </div>

        {/* Per-debt comparison */}
        {debtAnalyses.map((da, i) => (
          <Card key={i} style={{ borderLeft: `4px solid ${da.verdict === "repay" ? DK.red : DK.blue}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: DK.tx }}>{da.name || typeLabels[lang][da.type]}</span>
              <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, fontWeight: 600,
                background: da.verdict === "repay" ? DK.redBg : DK.blueBg,
                color: da.verdict === "repay" ? DK.red : DK.blue }}>
                {fr ? (da.verdict === "repay" ? "Scénario : rembourser" : "Scénario : investir") : (da.verdict === "repay" ? "Scenario: repay" : "Scenario: invest")}
              </span>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <StatBox small label={fr ? "Taux nominal" : "Nominal rate"} value={pct(da.rate)} color={DK.red} />
              {da.deductible && <StatBox small label={fr ? "Taux effectif (Smith)" : "Effective rate (Smith)"} value={pct(da.effRate)} color={DK.orange} />}
              <StatBox small label={fr ? "Rendement après impôt" : "After-tax return"} value={pct(da.ownerATR)} color={DK.blue} />
              <StatBox small label={fr ? "Écart" : "Spread"} value={pct(Math.abs(da.effRate - da.ownerATR))} color={da.verdict === "repay" ? DK.red : DK.green} />
            </div>

            <div style={{ fontSize: 13, color: DK.txDim, lineHeight: 1.6, padding: "8px 10px", background: DK.bg, borderRadius: 6 }}>
              {da.verdict === "repay"
                ? (fr
                  ? `À ${pct(da.effRate)}, cette dette coûte plus cher que ce que vos placements pourraient rapporter après impôt (${pct(da.ownerATR)}). Concrètement, chaque dollar remboursé vous rapporte un rendement garanti de ${pct(da.effRate)} — sans risque de marché.`
                  : `At ${pct(da.effRate)}, this debt costs more than what your investments could earn after tax (${pct(da.ownerATR)}). In practice, every dollar repaid earns you a guaranteed return of ${pct(da.effRate)} — with no market risk.`)
                : (fr
                  ? `Cette dette coûte ${pct(da.effRate)}, mais vos placements pourraient rapporter ${pct(da.ownerATR)} après impôt. Historiquement, investir aurait été plus payant — mais les marchés ne sont pas garantis. C'est un compromis entre certitude et rendement potentiel.`
                  : `This debt costs ${pct(da.effRate)}, but your investments could return ${pct(da.ownerATR)} after tax. Historically, investing would have been more rewarding — but markets aren't guaranteed. It's a tradeoff between certainty and potential return.`)
              }
            </div>
          </Card>
        ))}

        {/* Mortgage comparison */}
        {mtgAnalyses.map((ma, i) => (
          <Card key={`m${i}`} style={{ borderLeft: `4px solid ${DK.orange}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: DK.tx }}>{ma.name || (fr ? `Hypothèque ${i + 1}` : `Mortgage ${i + 1}`)}</span>
              <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, fontWeight: 600,
                background: ma.verdict === "repay" ? DK.redBg : DK.blueBg,
                color: ma.verdict === "repay" ? DK.red : DK.blue }}>
                {fr ? (ma.verdict === "repay" ? "Scénario : prépayer" : "Scénario : investir") : (ma.verdict === "repay" ? "Scenario: prepay" : "Scenario: invest")}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <StatBox small label={fr ? "Paiement/mo" : "Payment/mo"} value={f$(Math.round(ma.mp))} color={DK.tx}
                sub={ma.freq !== "monthly" ? (ma.freq === "acc_biweekly" ? (fr ? "Acc. bihebdo" : "Acc. biweekly") : (fr ? "Bihebdo" : "Biweekly")) : ""} />
              <StatBox small label={fr ? "Intérêts totaux" : "Total interest"} value={f$(Math.round(ma.base.totalInt))} color={DK.orange} />
              <StatBox small label={fr ? "Gain +100$/mo" : "Saved +$100/mo"} value={ma.extra100.feasible ? f$(Math.round(ma.base.totalInt - ma.extra100.totalInt)) : "—"} color={DK.green} />
              <StatBox small label={fr ? "Gain +500$/mo" : "Saved +$500/mo"} value={ma.extra500.feasible ? f$(Math.round(ma.base.totalInt - ma.extra500.totalInt)) : "—"} color={DK.green} />
            </div>
            {ma.renewalInfo && (
              <div style={{ padding: "8px 10px", background: DK.bg, borderRadius: 6, fontSize: 13, color: DK.txDim, lineHeight: 1.6 }}>
                <div style={{ fontWeight: 600, color: DK.orange, marginBottom: 4 }}>{fr ? "Scénario de renouvellement" : "Renewal scenario"}</div>
                {fr
                  ? `À la fin du terme de ${ma.termYrs || 5} ans, le solde estimé sera de ${f$(Math.round(ma.renewalInfo.balAtRenewal))}. Au taux de renouvellement de ${pct(ma.renewalInfo.newRate)}, le paiement passerait à ${f$(Math.round(ma.renewalInfo.newPayment))}/mo (${ma.renewalInfo.paymentDiff > 0 ? "+" : ""}${f$(Math.round(ma.renewalInfo.paymentDiff))}). Intérêts totaux estimés sur la vie de l'hypothèque : ${f$(Math.round(ma.renewalInfo.totalIntRenewal))}.`
                  : `At the end of the ${ma.termYrs || 5}-year term, the estimated balance will be ${f$(Math.round(ma.renewalInfo.balAtRenewal))}. At the ${pct(ma.renewalInfo.newRate)} renewal rate, the payment would become ${f$(Math.round(ma.renewalInfo.newPayment))}/mo (${ma.renewalInfo.paymentDiff > 0 ? "+" : ""}${f$(Math.round(ma.renewalInfo.paymentDiff))}). Estimated total interest over the mortgage life: ${f$(Math.round(ma.renewalInfo.totalIntRenewal))}.`}
              </div>
            )}
          </Card>
        ))}

        <div style={{ fontSize: 12, color: DK.txMuted, fontStyle: "italic", padding: "8px 0" }}>
          {fr ? "Ces scénarios comparent des chiffres, mais votre situation personnelle est unique. Le rendement passé des marchés ne garantit pas le rendement futur. Un planificateur financier peut vous aider à trancher." : "These scenarios compare numbers, but your personal situation is unique. Past market returns don't guarantee future results. A financial planner can help you decide."}
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════
  // TAB 4: CALENDAR
  // ══════════════════════════════════════════════════════════
  const renderCalendar = () => {
    if (payableDebts.length === 0) return <Card><div style={{ textAlign: "center", padding: 32, color: DK.txDim, lineHeight: 1.6 }}>{fr ? "Votre calendrier de remboursement apparaîtra ici une fois vos dettes configurées." : "Your payoff calendar will appear here once your debts are set up."}</div></Card>;

    return (
      <div>
        <SectionTitle>{fr ? `Calendrier de remboursement (${strategies.find(s => s.key === selectedStrategy)?.name || ""})` : `Payoff calendar (${strategies.find(s => s.key === selectedStrategy)?.name || ""})`}</SectionTitle>

        {/* Consolidated schedule table */}
        {strategySchedule.length > 0 && (
          <Card>
            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", fontFamily: "JetBrains Mono, monospace" }}>
                <thead>
                  <tr style={{ position: "sticky", top: 0, background: DK.card, borderBottom: `1px solid ${DK.border}` }}>
                    <th style={{ padding: "6px 8px", textAlign: "left", color: DK.txDim, fontWeight: 600 }}>{fr ? "Mois" : "Month"}</th>
                    {strategySchedule[0]?.debts.map((d, di) => (
                      <th key={di} style={{ padding: "6px 8px", textAlign: "right", color: DK.txDim, fontWeight: 600, fontSize: 10 }}>{d.name}</th>
                    ))}
                    <th style={{ padding: "6px 8px", textAlign: "right", color: DK.accent, fontWeight: 600 }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {strategySchedule.map((row, ri) => (
                    <tr key={ri} style={{ borderBottom: `1px solid ${DK.border}`, background: ri % 2 === 0 ? "transparent" : `${DK.bg}80` }}>
                      <td style={{ padding: "4px 8px", color: DK.txDim }}>{row.month}</td>
                      {row.debts.map((d, di) => (
                        <td key={di} style={{ padding: "4px 8px", textAlign: "right", color: d.bal <= 0.01 ? DK.green : DK.red }}>
                          {d.bal <= 0.01 ? "✓" : f$(Math.round(d.bal))}
                        </td>
                      ))}
                      <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: 600, color: row.total <= 0.01 ? DK.green : DK.tx }}>{f$(Math.round(row.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Individual debt amortization (expand/collapse) */}
        <SectionTitle>{fr ? "Détail par dette" : "Per-debt detail"}</SectionTitle>
        {debtAnalyses.map((da, i) => (
          <Card key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, cursor: "pointer" }}
              onClick={() => setExpandedDebt(expandedDebt === i ? -1 : i)}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 600, color: DK.tx }}>{da.name || typeLabels[lang][da.type]}</span>
                <span style={{ fontSize: 12, color: DK.txDim, marginLeft: 8 }}>{f$(da.bal)} @ {pct(da.rate)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: DK.accent }}>{da.am.feasible ? fMo(da.am.months, lang) : "∞"}</span>
                {(!da.pay || da.pay <= 0) && <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: DK.orangeBg, color: DK.orange }}>{fr ? "Sans paiement" : "No payment"}</span>}
                <span style={{ color: DK.txDim }}>{expandedDebt === i ? "▲" : "▼"}</span>
              </div>
            </div>

            {expandedDebt === i && da.am.feasible && da.am.schedule.length > 0 && (
              <div style={{ maxHeight: 300, overflowY: "auto", marginTop: 8 }}>
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", fontFamily: "JetBrains Mono, monospace" }}>
                  <thead>
                    <tr style={{ position: "sticky", top: 0, background: DK.card, borderBottom: `1px solid ${DK.border}` }}>
                      <th style={{ padding: "6px 8px", textAlign: "left", color: DK.txDim, fontWeight: 600 }}>{fr ? "Année" : "Year"}</th>
                      <th style={{ padding: "6px 8px", textAlign: "right", color: DK.txDim, fontWeight: 600 }}>{fr ? "Solde" : "Balance"}</th>
                      <th style={{ padding: "6px 8px", textAlign: "right", color: DK.txDim, fontWeight: 600 }}>{fr ? "Capital payé" : "Principal"}</th>
                      <th style={{ padding: "6px 8px", textAlign: "right", color: DK.txDim, fontWeight: 600 }}>{fr ? "Intérêts cum." : "Cumul. int."}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {da.am.schedule.map((row, ri) => (
                      <tr key={ri} style={{ borderBottom: `1px solid ${DK.border}`, background: ri % 2 === 0 ? "transparent" : `${DK.bg}80` }}>
                        <td style={{ padding: "4px 8px" }}>{Math.ceil(row.month / 12)}</td>
                        <td style={{ padding: "4px 8px", textAlign: "right", color: DK.red }}>{f$(Math.round(row.balance))}</td>
                        <td style={{ padding: "4px 8px", textAlign: "right", color: DK.green }}>{f$(Math.round(row.principal))}</td>
                        <td style={{ padding: "4px 8px", textAlign: "right", color: DK.orange }}>{f$(Math.round(row.interest))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        ))}

        {/* Milestones */}
        {selectedResult.order.length > 0 && (
          <>
            <SectionTitle>{fr ? "Jalons" : "Milestones"}</SectionTitle>
            <Card>
              {selectedResult.order.map((o, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < selectedResult.order.length - 1 ? `1px solid ${DK.border}` : "none" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: DK.greenBg, color: DK.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>✓</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: DK.tx }}>{o.name || typeLabels[lang][o.type] || o.type}</div>
                    <div style={{ fontSize: 12, color: DK.txDim }}>{fMo(o.month, lang)} → {freedomDate(o.month, lang)}</div>
                  </div>
                </div>
              ))}
            </Card>
          </>
        )}

        {/* Next step CTA */}
        <Card style={{ marginTop: 12, borderLeft: `3px solid ${DK.accent}`, background: DK.accentBg }}>
          <div style={{ fontSize: 13, color: DK.txDim, lineHeight: 1.6 }}>
            {fr
              ? "Pour comprendre combien vos dettes vous coûtent au-delà du solde affiché, consultez l'onglet Coût réel."
              : "To understand what your debts cost beyond the balance on your statement, check the True Cost tab."}
          </div>
          <button onClick={() => setActiveTab(5)} style={{ fontSize: 13, padding: "6px 14px", background: "transparent", color: DK.accent, border: `1px solid ${DK.accent}40`, borderRadius: 6, cursor: "pointer", fontWeight: 600, marginTop: 8 }}>
            {fr ? "Coût réel \u2192" : "True Cost \u2192"}
          </button>
        </Card>
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════
  // TAB 5: TRUE COST (opportunity cost)
  // ══════════════════════════════════════════════════════════
  const renderTrueCost = () => {
    if (activeDebts.length === 0) return <Card><div style={{ textAlign: "center", padding: 32, color: DK.txDim, lineHeight: 1.6 }}>{fr ? "Une fois vos dettes ajoutées, vous verrez ici combien elles vous coûtent réellement — au-delà du solde affiché." : "Once your debts are added, you'll see here what they truly cost you — beyond the balance on your statement."}</div></Card>;

    return (
      <div>
        <SectionTitle>{fr ? "Ce que vos dettes coûtent vraiment" : "What your debt really costs"}</SectionTitle>
        <div style={{ fontSize: 13, color: DK.txDim, marginBottom: 12, lineHeight: 1.6 }}>
          {fr ? "Le solde sur votre relevé, ce n'est qu'une partie de l'histoire. Chaque dollar payé en intérêts est un dollar qui ne travaille pas pour vous." : "The balance on your statement is only part of the story. Every dollar paid in interest is a dollar not working for you."}
        </div>

        {/* Daily cost */}
        <Card style={{ textAlign: "center", borderLeft: `3px solid ${DK.red}` }}>
          <div style={{ fontSize: 11, color: DK.red, textTransform: "uppercase", letterSpacing: "0.05em" }}>{fr ? "Vous payez actuellement" : "You are currently paying"}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: DK.red, fontFamily: "JetBrains Mono, monospace", margin: "6px 0" }}>{f$(Math.round(dailyInterest))}<span style={{ fontSize: 13 }}>/{fr ? "jour" : "day"}</span></div>
          <div style={{ fontSize: 12, color: DK.txDim }}>{f$(Math.round(monthlyInterest))}/{fr ? "mois" : "mo"} · {f$(Math.round(monthlyInterest * 12))}/{fr ? "an" : "yr"}</div>
        </Card>

        {/* Opportunity cost */}
        {opportunityCost && (
          <Card>
            <div style={{ fontSize: 13, fontWeight: 600, color: DK.tx, marginBottom: 8 }}>
              {fr ? `Autrement dit : les ${f$(Math.round(opportunityCost.invested))} payés en intérêts, s'ils avaient été investis à ${pct(expReturn)}, vaudraient...` : `Put another way: the ${f$(Math.round(opportunityCost.invested))} paid in interest, if invested at ${pct(expReturn)}, would be worth...`}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <StatBox label={fr ? "Dans 10 ans" : "In 10 years"} value={f$(opportunityCost.fv10)} color={DK.accent} />
              <StatBox label={fr ? "Dans 20 ans" : "In 20 years"} value={f$(opportunityCost.fv20)} color={DK.green} />
              <StatBox label={fr ? "Dans 30 ans" : "In 30 years"} value={f$(opportunityCost.fv30)} color={DK.green} />
            </div>
            <div style={{ fontSize: 11, color: DK.txMuted, marginTop: 8 }}>
              {fr ? "Basé sur la croissance composée. Les rendements réels varient — c'est un scénario, pas une promesse." : "Based on compound growth. Actual returns vary — this is a scenario, not a promise."}
            </div>
          </Card>
        )}

        {/* Per-debt cost breakdown */}
        <SectionTitle>{fr ? "Coût par dette" : "Cost per debt"}</SectionTitle>
        {debtAnalyses.map((da, i) => {
          const totalInt = da.am.feasible ? da.am.totalInt : da.bal * da.rate; // 1 year estimate if infeasible
          const fv10 = totalInt * Math.pow(1 + expReturn, 10);
          return (
            <Card key={i} style={{ borderLeft: `4px solid ${severityColor(da.rate)}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: DK.tx }}>{da.name || typeLabels[lang][da.type]}</span>
                <span style={{ fontSize: 12, color: DK.txDim }}>{f$(da.bal)} @ {pct(da.rate)}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <StatBox small label={fr ? "Intérêts totaux" : "Total interest"} value={da.am.feasible ? f$(Math.round(totalInt)) : "∞"} color={DK.red} />
                <StatBox small label={fr ? "Coût/jour actuel" : "Current cost/day"} value={f$(Math.round(da.bal * da.rate / 365))} color={DK.orange} />
                <StatBox small label={fr ? "Coût d'opportunité 10 ans" : "Opportunity cost 10 yrs"} value={da.am.feasible ? f$(Math.round(fv10)) : "—"} color={DK.accent} />
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════
  // MAIN LAYOUT
  // ══════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", background: DK.bg, color: DK.tx, fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      {/* Google Fonts — @import in <style> is intentional for standalone JSX artifact portability.
          In production build, these would be <link> tags in the HTML shell. */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=range] { -webkit-appearance: none; height: 4px; border-radius: 2px; background: ${DK.border}; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: ${DK.accent}; cursor: pointer; border: 2px solid ${DK.bg}; }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.3; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${DK.border}; border-radius: 3px; }
        select { cursor: pointer; outline: none; }
        select:focus { border-color: ${DK.accent}; }
        .print-only { display: none; }
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: #fff !important; }
        }
        .mobile-bottom-bar { display: none; }
        @media (max-width: 560px) {
          .mobile-bottom-bar { display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 50; padding: 10px 12px; gap: 10px; background: rgba(36,32,24,.96); backdrop-filter: blur(10px); border-top: 1px solid ${DK.border}; }
          .mobile-bottom-bar button { flex: 1; min-height: 44px; border-radius: 8px; font-weight: 600; }
          .dt-content-wrap { padding-bottom: 80px !important; }
        }
      `}</style>

      {/* Header */}
      <div className="no-print" style={{ borderBottom: `1px solid ${DK.border}`, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: DK.card }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: DK.accent, letterSpacing: 0.5 }}>BuildFi</span>
          <span style={{ fontSize: 12, color: DK.txDim, fontWeight: 500 }}>{fr ? "Gestion de dettes" : "Debt Management"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={() => {
              if (!confirmReset) { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 3000); }
              else { setDebts([]); setMortgages([]); setIncome(0); setExtraPay(0); setSnowflakeAmt(0); setProv("QC"); setExpReturn(0.06); setCoupleOn(false); setSpouseIncome(0); setSpouseProv("QC"); setSelectedStrategy("avalanche"); setExpandedDebt(-1); setConfirmReset(false); setShowInfo(false); setIncludePrintDetails(false); setHighlightDebt(null); setFocusDebt(null); setFlash(""); localStorage.removeItem("buildfi_debts_v1"); }
            }} title={fr ? "Effacer toutes les données et recommencer" : "Clear all data and start over"}
            style={{ fontSize: 12, padding: "5px 12px", background: confirmReset ? DK.red : "transparent", color: confirmReset ? "#fff" : DK.red, border: `1px solid ${DK.red}${confirmReset ? "" : "40"}`, borderRadius: 6, cursor: "pointer", transition: "all .15s" }}>
            {confirmReset ? (fr ? "Confirmer ?" : "Confirm?") : (fr ? "Réinitialiser" : "Reset")}
          </button>
          <button onClick={exportData}
            title={fr ? "Télécharger vos données en fichier JSON (sauvegarde)" : "Download your data as a JSON file (backup)"}
            style={{ fontSize: 12, padding: "5px 12px", background: "transparent", color: DK.txDim, border: `1px solid ${DK.border}`, borderRadius: 6, cursor: "pointer" }}>
            {fr ? "Sauvegarder" : "Save"} ↓
          </button>
          <button onClick={() => importRef.current?.click()}
            title={fr ? "Charger un fichier JSON exporté précédemment" : "Load a previously exported JSON file"}
            style={{ fontSize: 12, padding: "5px 12px", background: "transparent", color: DK.txDim, border: `1px solid ${DK.border}`, borderRadius: 6, cursor: "pointer" }}>
            {fr ? "Charger" : "Load"} ↑
          </button>
          <input ref={importRef} type="file" accept=".json" onChange={importData} style={{ display: "none" }} />
          <button onClick={copyShareLink}
            title={fr ? "G\u00e9n\u00e9rer un lien partageable avec vos donn\u00e9es" : "Generate a shareable link with your data"}
            style={{ fontSize: 12, padding: "5px 12px", background: DK.accentBg, color: DK.accent, border: `1px solid ${DK.accent}40`, borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            {fr ? "Lien" : "Link"}
          </button>
          <button onClick={printPDF}
            title={fr ? "Imprimer / exporter en PDF via le navigateur" : "Print / export to PDF via the browser"}
            style={{ fontSize: 12, padding: "5px 12px", background: "transparent", color: DK.txDim, border: `1px solid ${DK.border}`, borderRadius: 6, cursor: "pointer" }}>
            PDF
          </button>
          <button onClick={() => { setInfoTab("notice"); setShowInfo(true); }}
            title={fr ? "Conformit\u00e9, hypoth\u00e8ses et confidentialit\u00e9" : "Compliance, assumptions, and privacy"}
            style={{ fontSize: 12, padding: "5px 12px", background: "transparent", color: DK.txDim, border: `1px solid ${DK.border}`, borderRadius: 6, cursor: "pointer" }}>
            Info
          </button>
          <button onClick={() => setLang(lang === "fr" ? "en" : "fr")}
            style={{ fontSize: 12, padding: "5px 12px", background: DK.accentBg, color: DK.accent, border: `1px solid ${DK.accent}40`, borderRadius: 6, cursor: "pointer", fontWeight: 600 }}>
            {lang === "fr" ? "EN" : "FR"}
          </button>
        </div>
      </div>

      {/* Flash toast */}
      {flash && (
        <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 100, padding: "8px 18px", borderRadius: 8, background: DK.accent, color: DK.bg, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,.3)" }}>
          {flash}
        </div>
      )}

      {/* Tab bar */}
      <div className="no-print" style={{ display: "flex", gap: 2, padding: "6px 12px", overflowX: "auto", borderBottom: `1px solid ${DK.border}`, background: DK.card }}>
        {tabs.map((t, idx) => {
          const isActive = activeTab === t.id;
          const hasData = payableDebts.length > 0 || t.id === 0;
          return (
            <React.Fragment key={t.id}>
              {idx === 4 && <span style={{ borderLeft: `1px solid ${DK.border}`, margin: "4px 4px" }} />}
              <button onClick={() => setActiveTab(t.id)}
                style={{
                  padding: "6px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  whiteSpace: "nowrap", border: "none", letterSpacing: 0.3, transition: "all .15s",
                  background: isActive ? DK.accentBg : "transparent",
                  color: isActive ? DK.accent : hasData ? DK.txDim : DK.txMuted,
                  opacity: hasData ? 1 : 0.4,
                }}>
                {t.label}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Print-only summary */}
      <div className="print-only" style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>BuildFi — {fr ? "Gestion de dettes" : "Debt Management"}</div>
        {payableDebts.length > 0 && (
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            <div><strong>{fr ? "Stratégie :" : "Strategy:"}</strong> {strategies.find(s => s.key === selectedStrategy)?.name || selectedStrategy}</div>
            <div><strong>{fr ? "Nombre de dettes :" : "Number of debts:"}</strong> {payableDebts.length}</div>
            <div><strong>{fr ? "Solde total :" : "Total balance:"}</strong> {f$(totalDebt)}</div>
            <div><strong>{fr ? "Durée estimée :" : "Estimated duration:"}</strong> {fMo(selectedResult.months, lang)}</div>
            <div><strong>{fr ? "Intérêts totaux :" : "Total interest:"}</strong> {f$(Math.round(selectedResult.totalInt))}</div>
            {extraPay > 0 && <div><strong>{fr ? "Extra/mois :" : "Extra/mo:"}</strong> {f$(extraPay)}</div>}
            <div><strong>{fr ? "Date de liberté :" : "Freedom date:"}</strong> {freedomDate(selectedResult.months, lang)}</div>
          </div>
        )}
        <hr style={{ margin: "12px 0", border: "none", borderTop: "1px solid #ccc" }} />
      </div>

      {/* Content */}
      <div className="dt-content-wrap" style={{ maxWidth: 800, margin: "0 auto", padding: "14px 16px 24px" }}>
        {activeTab === 0 && renderInventory()}
        {activeTab === 1 && renderStrategies()}
        {activeTab === 2 && renderSimulator()}
        {activeTab === 3 && renderRepayVsInvest()}
        {activeTab === 4 && renderCalendar()}
        {activeTab === 5 && renderTrueCost()}
      </div>

      {/* Footer disclaimer */}
      <div className="no-print" style={{ borderTop: `1px solid ${DK.border}`, padding: "8px 16px", textAlign: "center", background: DK.card, marginTop: 20 }}>
        <div style={{ fontSize: 12, color: DK.txMuted, maxWidth: 800, margin: "0 auto", lineHeight: 1.4 }}>
          {fr
            ? "Cet outil présente des scénarios à titre informatif et éducatif. Il ne constitue pas un avis financier, fiscal ou juridique. Les rendements des marchés financiers ne sont pas garantis. Consultez un planificateur financier certifié pour des conseils adaptés à votre situation."
            : "This tool presents scenarios for informational and educational purposes. It does not constitute financial, tax, or legal advice. Financial market returns are not guaranteed. Consult a certified financial planner for advice tailored to your situation."}
          <span style={{ marginLeft: 6, color: DK.accent }}>buildfi.ca</span>
        </div>
      </div>

      {/* Bridge CTA: debt tool → retirement planning */}
      <div className="no-print" style={{ background: DK.s2, borderTop: `1px solid ${DK.border}`, padding: "24px 16px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: DK.tx, marginBottom: 8, lineHeight: 1.4 }}>
            {fr
              ? "Comment cette dette affecte-t-elle votre retraite?"
              : "How does this debt affect your retirement?"}
          </div>
          <div style={{ fontSize: 13, color: DK.txDim, lineHeight: 1.6, marginBottom: 16 }}>
            {fr
              ? "La dette est un morceau du plan. BuildFi simule 5 000 scénarios de retraite canadiens — impôts, RRQ/PSV, inflation, marchés — pour voir si votre argent dure."
              : "Debt is one piece of the plan. BuildFi simulates 5,000 Canadian retirement scenarios — taxes, CPP/OAS, inflation, markets — to see if your money lasts."}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {(coupleOn || mortgages.length > 0) ? (
              <a href={`/bilan-360?lang=${lang}`} style={{
                display: "inline-block", padding: "10px 20px", fontSize: 14, fontWeight: 700,
                background: DK.accent, color: "#1a1714", borderRadius: 8, textDecoration: "none",
                transition: "opacity .2s"
              }}>
                {fr ? "Bilan 360 — couples et propriétaires" : "Snapshot 360 — couples & homeowners"}
                <span style={{ marginLeft: 6 }} aria-hidden="true">→</span>
              </a>
            ) : (
              <a href={`/bilan?lang=${lang}`} style={{
                display: "inline-block", padding: "10px 20px", fontSize: 14, fontWeight: 700,
                background: DK.accent, color: "#1a1714", borderRadius: 8, textDecoration: "none",
                transition: "opacity .2s"
              }}>
                {fr ? "Bilan — votre portrait financier" : "Snapshot — your financial portrait"}
                <span style={{ marginLeft: 6 }} aria-hidden="true">→</span>
              </a>
            )}
          </div>
          <div style={{ fontSize: 11, color: DK.txMuted, marginTop: 10 }}>
            {fr ? "Paiement unique, rapport livré par courriel." : "One-time payment, report delivered by email."}
          </div>
        </div>
      </div>

      {/* Info / Compliance modal */}
      {showInfo && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowInfo(false)}>
          <div style={{ background: DK.card, border: `1px solid ${DK.border}`, borderRadius: 12, maxWidth: 540, width: "92%", maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column" }}
            onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${DK.border}` }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: DK.accent }}>Info</span>
              <button onClick={() => setShowInfo(false)} style={{ background: "transparent", color: DK.txDim, border: "none", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            {/* Modal tabs */}
            <div style={{ display: "flex", gap: 2, padding: "8px 16px", borderBottom: `1px solid ${DK.border}` }}>
              {[
                { key: "notice", label: fr ? "Avis" : "Notice" },
                { key: "scope", label: fr ? "Portée" : "Scope" },
                { key: "assumptions", label: fr ? "Hypothèses" : "Assumptions" },
                { key: "privacy", label: fr ? "Vie privée" : "Privacy" },
              ].map(t => (
                <button key={t.key} onClick={() => setInfoTab(t.key)}
                  style={{ padding: "4px 10px", fontSize: 12, fontWeight: 600, borderRadius: 4, border: "none", cursor: "pointer",
                    background: infoTab === t.key ? DK.accentBg : "transparent", color: infoTab === t.key ? DK.accent : DK.txDim }}>
                  {t.label}
                </button>
              ))}
            </div>
            {/* Modal body */}
            <div style={{ padding: "16px", overflowY: "auto", fontSize: 13, color: DK.txDim, lineHeight: 1.7 }}>
              {infoTab === "notice" && (
                <div>
                  <div style={{ fontWeight: 600, color: DK.tx, marginBottom: 8 }}>{fr ? "Avis de conformité" : "Compliance notice"}</div>
                  {fr
                    ? "BuildFi Technologies inc. n'est pas un cabinet de services financiers au sens de la Loi sur la distribution de produits et services financiers (LDPSF). Cet outil ne constitue pas un avis financier, fiscal ou juridique. Les projections sont des scénarios hypothétiques basés sur les données que vous fournissez. Aucune recommandation personnelle n'est formulée. Consultez un planificateur financier certifié pour des conseils adaptés à votre situation."
                    : "BuildFi Technologies inc. is not a financial services firm within the meaning of the LDPSF (Quebec). This tool does not constitute financial, tax, or legal advice. Projections are hypothetical scenarios based on data you provide. No personalized recommendations are made. Consult a certified financial planner for advice tailored to your situation."}
                </div>
              )}
              {infoTab === "scope" && (
                <div>
                  <div style={{ fontWeight: 600, color: DK.tx, marginBottom: 8 }}>{fr ? "Ce que cet outil fait et ne fait pas" : "What this tool does and doesn't do"}</div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, color: DK.green, marginBottom: 4 }}>{fr ? "L'outil fait :" : "The tool does:"}</div>
                    <ul style={{ paddingLeft: 18, margin: 0 }}>
                      <li>{fr ? "Calculer l'amortissement de chaque dette" : "Calculate amortization for each debt"}</li>
                      <li>{fr ? "Comparer 6 stratégies de remboursement" : "Compare 6 repayment strategies"}</li>
                      <li>{fr ? "Simuler l'impact de paiements supplémentaires" : "Simulate the impact of extra payments"}</li>
                      <li>{fr ? "Comparer rembourser vs investir" : "Compare repaying vs investing"}</li>
                      <li>{fr ? "Estimer le coût réel et le coût d'opportunité" : "Estimate true cost and opportunity cost"}</li>
                    </ul>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: DK.red, marginBottom: 4 }}>{fr ? "L'outil ne fait pas :" : "The tool doesn't:"}</div>
                    <ul style={{ paddingLeft: 18, margin: 0 }}>
                      <li>{fr ? "Formuler des recommandations personnelles" : "Make personalized recommendations"}</li>
                      <li>{fr ? "Remplacer un planificateur financier" : "Replace a financial planner"}</li>
                      <li>{fr ? "Garantir des rendements de marché" : "Guarantee market returns"}</li>
                      <li>{fr ? "Tenir compte de votre situation fiscale complète" : "Account for your complete tax situation"}</li>
                    </ul>
                  </div>
                </div>
              )}
              {infoTab === "assumptions" && (
                <div>
                  <div style={{ fontWeight: 600, color: DK.tx, marginBottom: 8 }}>{fr ? "Hypothèses du modèle" : "Model assumptions"}</div>
                  <ul style={{ paddingLeft: 18, margin: 0 }}>
                    <li>{fr ? "Les paiements sont maintenus mensuellement sans interruption" : "Payments are maintained monthly without interruption"}</li>
                    <li>{fr ? "Les taux d'intérêt restent constants (sauf scénario de renouvellement hypothécaire)" : "Interest rates remain constant (except mortgage renewal scenario)"}</li>
                    <li>{fr ? "Taux marginaux d'impôt : estimations fédérales + provinciales combinées 2026" : "Marginal tax rates: estimated 2026 combined federal + provincial rates"}</li>
                    <li>{fr ? "Rendement après impôt : mixte 50% gains en capital, 30% dividendes, 20% intérêts" : "After-tax return: blended 50% capital gains, 30% dividends, 20% interest"}</li>
                    <li>{fr ? "L'inflation n'est pas prise en compte (montants nominaux)" : "Inflation is not factored in (nominal amounts)"}</li>
                  </ul>
                </div>
              )}
              {infoTab === "privacy" && (
                <div>
                  <div style={{ fontWeight: 600, color: DK.tx, marginBottom: 8 }}>{fr ? "Vos données restent chez vous" : "Your data stays with you"}</div>
                  {fr
                    ? "Aucune donnée n'est envoyée à un serveur. Tout est calculé localement dans votre navigateur et sauvegardé dans le localStorage de votre appareil. Si vous utilisez la fonction Lien, vos données sont encodées dans l'URL — quiconque possède le lien peut voir vos chiffres. Aucun cookie n'est utilisé par cet outil."
                    : "No data is sent to a server. Everything is calculated locally in your browser and saved in your device's localStorage. If you use the Link feature, your data is encoded in the URL — anyone with the link can see your numbers. No cookies are used by this tool."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom bar */}
      <div className="mobile-bottom-bar no-print">
        <button onClick={() => setActiveTab(0)}
          style={{ background: activeTab === 0 ? DK.accentBg : "transparent", color: activeTab === 0 ? DK.accent : DK.txDim, border: `1px solid ${activeTab === 0 ? DK.accent + "40" : DK.border}`, fontSize: 12 }}>
          {fr ? "Inventaire" : "Inventory"}
        </button>
        <button onClick={() => setActiveTab(1)}
          style={{ background: activeTab === 1 ? DK.accentBg : "transparent", color: activeTab === 1 ? DK.accent : DK.txDim, border: `1px solid ${activeTab === 1 ? DK.accent + "40" : DK.border}`, fontSize: 12 }}>
          {fr ? "Stratégies" : "Strategies"}
        </button>
        <button onClick={() => setActiveTab(2)}
          style={{ background: activeTab === 2 ? DK.accentBg : "transparent", color: activeTab === 2 ? DK.accent : DK.txDim, border: `1px solid ${activeTab === 2 ? DK.accent + "40" : DK.border}`, fontSize: 12 }}>
          {fr ? "Simulateur" : "Simulator"}
        </button>
        <button onClick={() => setActiveTab(4)}
          style={{ background: activeTab === 4 ? DK.accentBg : "transparent", color: activeTab === 4 ? DK.accent : DK.txDim, border: `1px solid ${activeTab === 4 ? DK.accent + "40" : DK.border}`, fontSize: 12 }}>
          {fr ? "Calendrier" : "Calendar"}
        </button>
      </div>
    </div>
  );
}

