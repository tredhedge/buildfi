"use client";
import React, { useState, useMemo, useEffect } from "react";
import { getProductPalette, THEME_STORAGE_KEY, FONT } from "./product.tokens";
import { useProductBody, ProductNote } from "./product-components";

/* ═══════════════════════════════════════════════════════════
   BuildFi — Simulateur de décaissement (React, deterministic)
   Palette: shared Product system. See docs/DESIGN-SYSTEM.md.
   ═══════════════════════════════════════════════════════════ */

const acBg = (cl) => cl.ac + "18"; // faint accent background — used by lang toggle

const PROV_OPTS = [
  ["QC", "Québec"],
  ["ON", "Ontario"],
  ["BC", "Colombie-Britannique / British Columbia"],
  ["AB", "Alberta"],
  ["MB", "Manitoba"],
  ["NB", "Nouveau-Brunswick / New Brunswick"],
  ["NL", "Terre-Neuve / Newfoundland"],
  ["NS", "Nouvelle-Écosse / Nova Scotia"],
  ["PE", "Île-du-Prince-Édouard / PEI"],
  ["SK", "Saskatchewan"],
  ["NT", "T.N.-O. / NWT"],
  ["NU", "Nunavut"],
  ["YT", "Yukon"],
];

const fMoney = (n, fr) => Math.round(Number(n) || 0).toLocaleString(fr ? "fr-CA" : "en-CA").replace(/[\u00A0\u202F]/g, " ") + " $";
const fK = (n, fr) => {
  const x = Math.round(Number(n) || 0);
  if (Math.abs(x) >= 1_000_000) return (x / 1_000_000).toFixed(1).replace(".", fr ? "," : ".") + " M$";
  if (Math.abs(x) >= 1000) return Math.round(x / 1000) + " k$";
  return x + " $";
};

/* ── Deterministic projection ────────────────────────────────── */
function projectPortfolio(portfolio, annualWd, eqRet, bndRet, allocR, inf, yearsToProject) {
  const glideRed = 0.01;
  const pts = [];
  let p = portfolio;
  let cAllocR = allocR;
  let depletedAtYear = null;
  for (let y = 0; y <= yearsToProject; y++) {
    pts.push(Math.max(0, Math.round(p)));
    if (p <= 0 && depletedAtYear === null) depletedAtYear = y;
    cAllocR = Math.max(0.2, cAllocR - glideRed);
    const r = eqRet * cAllocR + bndRet * (1 - cAllocR) - inf;
    p = p * (1 + r) - annualWd;
  }
  return { pts, depletedAtYear };
}

/* ── Reusable inputs ─────────────────────────────────────────── */
function Field({ id, label, tip, children, cl }) {
  return (
    <div>
      <label htmlFor={id} style={{ display: "block", fontSize: 12, color: cl.dm, marginBottom: 5, fontWeight: 600, letterSpacing: 0.2 }}>
        {label}
        {tip ? <span title={tip} style={{ color: cl.ac, marginLeft: 6, cursor: "help", opacity: 0.7 }}>?</span> : null}
      </label>
      {children}
    </div>
  );
}
function NumInput({ id, value, onChange, step = 1, prefix, suffix, min = 0, max, cl }) {
  return (
    <div style={{ display: "flex", alignItems: "stretch", background: cl.s2, border: `1px solid ${cl.bd}`, borderRadius: 8, overflow: "hidden" }}>
      {prefix ? <span style={{ padding: "9px 10px", background: cl.bg, color: cl.dm, fontSize: 12, fontWeight: 700, borderRight: `1px solid ${cl.bd}` }}>{prefix}</span> : null}
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        max={max}
        value={value === 0 ? 0 : (value || "")}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
        style={{ flex: 1, padding: "9px 10px", fontSize: 14, background: "transparent", border: "none", color: cl.tx, outline: "none", width: "100%" }}
      />
      {suffix ? <span style={{ padding: "9px 10px", background: cl.bg, color: cl.dm, fontSize: 12, fontWeight: 700, borderLeft: `1px solid ${cl.bd}` }}>{suffix}</span> : null}
    </div>
  );
}
function SelectInput({ id, value, onChange, options, cl }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", padding: "9px 10px", fontSize: 14, background: cl.s2, border: `1px solid ${cl.bd}`, borderRadius: 8, color: cl.tx, outline: "none" }}
    >
      {options.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
    </select>
  );
}

function SurfaceCard({ children, cl, theme, style }) {
  return (
    <section
      style={{
        background: cl.cd,
        border: `1px solid ${cl.bd}`,
        borderRadius: 18,
        padding: 24,
        boxShadow: theme === "dark" ? "0 16px 36px rgba(0,0,0,0.22)" : "0 16px 32px rgba(24,34,54,0.06)",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

function SectionHeading({ kicker, title, body, cl }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: cl.ac, letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 8 }}>
        {kicker}
      </div>
      <h2 style={{ fontSize: 21, lineHeight: 1.15, margin: 0, color: cl.al, fontFamily: FONT.sans, fontWeight: 800 }}>
        {title}
      </h2>
      {body ? <p style={{ fontSize: 13, lineHeight: 1.65, color: cl.dm, maxWidth: 720, margin: "8px 0 0" }}>{body}</p> : null}
    </div>
  );
}

function MetricCard({ label, value, sub, accent, cl }) {
  return (
    <div style={{ background: cl.cd, border: `1px solid ${cl.bd}`, borderLeft: `2px solid ${accent}`, borderRadius: "0 12px 12px 0", padding: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: ".18em" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: cl.al, marginTop: 6, fontFamily: FONT.mono }}>{value}</div>
      {sub ? <div style={{ fontSize: 11, color: cl.dm, marginTop: 3, lineHeight: 1.45 }}>{sub}</div> : null}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────── */
export default function DecaissementPage() {
  const [lang, setLang] = useState("fr");
  const [theme, setTheme] = useState("light"); // "light" default | "dark" opt-in
  const [mounted, setMounted] = useState(false);
  // Server always renders light (default). Client switches to saved theme AFTER hydration.
  const cl = getProductPalette(mounted && theme === "dark" ? "dark" : "light");
  // Opt body into Product system. See docs/DESIGN-SYSTEM.md.
  useProductBody(mounted && theme === "dark" ? "dark" : "light");
  const fr = lang === "fr";

  /* inputs */
  const [age, setAge] = useState(65);
  const [prov, setProv] = useState("QC");
  const [portfolio, setPortfolio] = useState(500_000);
  const [income, setIncome] = useState(55_000);
  const [qpp, setQpp] = useState(900);
  const [oas, setOas] = useState(727);
  const [pension, setPension] = useState(0);
  const [allocR, setAllocR] = useState(0.5);
  const [eqRet, setEqRet] = useState(6.5);
  const [inf, setInf] = useState(2.0);

  /* load persisted state + query params on mount */
  useEffect(() => {
    setMounted(true);
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("lang") === "en") setLang("en");
      if (sp.get("theme") === "light") setTheme("light");
      const setters = { age: setAge, income: setIncome, allocR: setAllocR, portfolio: setPortfolio, qpp: setQpp, oas: setOas, pension: setPension };
      Object.keys(setters).forEach((k) => {
        const v = sp.get(k); if (v != null) { const n = Number(v); if (Number.isFinite(n)) setters[k](n); }
      });
      const provV = sp.get("province"); if (provV) setProv(provV);
    } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch {} }, [theme]);

  const eq = eqRet / 100;
  const infR = inf / 100;
  const bndRet = Math.max(0.01, eq - 0.035);

  const calc = useMemo(() => {
    const govMo = (qpp || 0) + (oas || 0) + (pension || 0);
    const govAn = govMo * 12;
    const govCovPct = income > 0 ? Math.min(1, govAn / income) : 0;
    const portfolioNeeded = Math.max(0, income - govAn);
    const wdRate = portfolio > 0 ? portfolioNeeded / portfolio : 0;
    const maxY = Math.max(0, 100 - age);
    const { pts, depletedAtYear } = projectPortfolio(portfolio, portfolioNeeded, eq, bndRet, allocR, infR, maxY);
    // Snapshot ages
    const getAt = (targetAge) => {
      const idx = targetAge - age;
      if (idx < 0) return portfolio;
      if (idx >= pts.length) return 0;
      return pts[idx];
    };
    const balAt75 = getAt(75);
    const balAt85 = getAt(85);
    const balAt90 = getAt(90);
    const balAt95 = getAt(95);
    const depletedAge = depletedAtYear !== null ? age + depletedAtYear : null;
    const sustains95 = depletedAge === null;
    return { govMo, govAn, govCovPct, portfolioNeeded, wdRate, pts, depletedAge, sustains95, balAt75, balAt85, balAt90, balAt95 };
  }, [age, portfolio, income, qpp, oas, pension, allocR, eq, bndRet, infR]);

  const { govMo, govAn, govCovPct, portfolioNeeded, wdRate, pts, depletedAge, sustains95, balAt75, balAt85, balAt90, balAt95 } = calc;
  const wdPct = wdRate * 100;
  const govPctRound = Math.round(govCovPct * 100);

  /* Status colors — color is reserved for the bar/value, not flooded as
     background. Keeps KPI cards calm in cream/slate but lets the semantic
     state still scan at a glance. */
  const sustainColor = sustains95 ? cl.gn : cl.rd;
  const govColor = govCovPct >= 0.7 ? cl.gn : govCovPct >= 0.4 ? cl.or : cl.rd;
  const wdColor = wdPct <= 4 ? cl.gn : wdPct <= 5.5 ? cl.or : cl.rd;

  const isQC = prov === "QC";

  /* ── Chart: single deterministic line (NO fake band) ── */
  function TrajChart() {
    const W = 760, H = 300, PL = 68, PB = 38, PT = 18, PR = 24;
    const chartW = W - PL - PR, chartH = H - PB - PT;
    const maxP = Math.max(portfolio, ...pts, 1);
    const xp = (i) => PL + (i / Math.max(1, pts.length - 1)) * chartW;
    const yp = (v) => PT + chartH - (v / maxP) * chartH;
    const line = pts.map((v, i) => `${i === 0 ? "M" : "L"} ${xp(i).toFixed(1)},${yp(v).toFixed(1)}`).join(" ");
    const area = `${line} L ${(W - PR).toFixed(1)},${(PT + chartH).toFixed(1)} L ${PL.toFixed(1)},${(PT + chartH).toFixed(1)} Z`;
    // Y-axis ticks
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({ v: maxP * t, y: yp(maxP * t) }));
    // X-axis: show every 5 years
    const xLabels = [];
    for (let i = 0; i < pts.length; i += 5) {
      xLabels.push(<text key={i} x={xp(i)} y={H - 10} textAnchor="middle" fontSize={11} fill={cl.dm}>{age + i}</text>);
    }
    // Depletion marker
    const depIdx = depletedAge !== null ? depletedAge - age : null;
    const endX = xp(pts.length - 1);
    const endY = yp(pts[pts.length - 1]);
    const gradientId = `decum-grad-${theme}-${lang}`;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block", width: "100%", height: "clamp(280px, 42vw, 360px)" }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cl.ac} stopOpacity="0.18" />
            <stop offset="100%" stopColor={cl.ac} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* grid */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PL} y1={t.y} x2={W - PR} y2={t.y} stroke={cl.bd} strokeDasharray="2 3" opacity={0.4} />
            <text x={PL - 8} y={t.y + 4} textAnchor="end" fontSize={11} fill={cl.dm}>{fK(t.v, fr)}</text>
          </g>
        ))}
        {xLabels}
        <path d={area} fill={`url(#${gradientId})`} />
        {/* deterministic line */}
        <path d={line} fill="none" stroke={cl.ac} strokeWidth={2.5} />
        <circle cx={PL} cy={yp(pts[0])} r={3.2} fill={cl.ac} />
        <circle cx={endX} cy={endY} r={3.6} fill={sustains95 ? cl.gn : cl.rd} />
        <text x={endX} y={Math.max(16, endY - 10)} textAnchor="end" fontSize={11.5} fontWeight={700} fill={sustains95 ? cl.gn : cl.rd}>
          {sustains95 ? (fr ? "Encore positif" : "Still positive") : (fr ? "Épuisement" : "Depletion")}
        </text>
        {/* depletion marker */}
        {depIdx !== null ? (
          <g>
            <line x1={xp(depIdx)} y1={PT} x2={xp(depIdx)} y2={PT + chartH} stroke={cl.rd} strokeWidth={1.5} strokeDasharray="4 3" />
            <text x={xp(depIdx)} y={PT - 4} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={cl.rd}>
              {fr ? `Épuisé à ${depletedAge}` : `Depleted at ${depletedAge}`}
            </text>
          </g>
        ) : null}
        <text x={PL} y={H - 28} fontSize={9} fill={cl.dm}>{fr ? "Âge" : "Age"}</text>
      </svg>
    );
  }

  /* ── Share ── */
  const [flash, setFlash] = useState("");
  const copyShare = async () => {
    try {
      const url = new URL(typeof window !== "undefined" ? window.location.href : "https://buildfi.ca/outils/decaissement");
      const params = { age, province: prov, portfolio, income, qpp, oas, pension, allocR, lang, theme };
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
      const link = url.toString();
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(link);
      setFlash(fr ? "Lien copié" : "Link copied");
      setTimeout(() => setFlash(""), 2000);
    } catch { setFlash(fr ? "Impossible de copier" : "Could not copy"); setTimeout(() => setFlash(""), 2000); }
  };

  return (
    <div suppressHydrationWarning style={{ background: `linear-gradient(180deg, ${cl.bg} 0%, ${cl.bg2} 100%)`, minHeight: "100vh", color: cl.tx, fontFamily: FONT.sans, lineHeight: 1.5 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; }
        input[type=range] { -webkit-appearance: none; height: 4px; border-radius: 2px; background: ${cl.bd}; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: ${cl.ac}; cursor: pointer; border: 2px solid ${cl.bg}; }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.35; }
        a { color: inherit; }
      `}</style>

      <header style={{ borderBottom: `1px solid ${cl.bd}`, padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", background: cl.cd, boxShadow: theme === "dark" ? "0 10px 28px rgba(0,0,0,.18)" : "0 10px 28px rgba(24,34,54,.05)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: cl.ac, letterSpacing: 0.5 }}>BuildFi</span>
            <span style={{ fontSize: 12, color: cl.dm, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase" }}>{fr ? "Décaissement" : "Decumulation"}</span>
          </div>
          <div style={{ fontSize: 12, color: cl.dm, lineHeight: 1.45 }}>
            {fr ? "Même moteur, lecture plus claire." : "Same engine, clearer reading layer."}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={fr ? "Changer le thème" : "Toggle theme"}
            aria-label={fr ? "Changer le thème" : "Toggle theme"}
            style={{ background: "transparent", border: `1px solid ${cl.bd}`, color: cl.tx, padding: "6px 10px", borderRadius: 8, fontSize: 14, cursor: "pointer", fontWeight: 700 }}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <div style={{ display: "flex", gap: 4, background: cl.s2, borderRadius: 8, padding: 3 }}>
            <button onClick={() => setLang("fr")} style={{ fontSize: 12, fontWeight: 700, color: lang === "fr" ? cl.al : cl.dm, background: lang === "fr" ? acBg(cl) : "transparent", border: "none", padding: "5px 12px", borderRadius: 6, cursor: "pointer" }}>FR</button>
            <button onClick={() => setLang("en")} style={{ fontSize: 12, fontWeight: 700, color: lang === "en" ? cl.al : cl.dm, background: lang === "en" ? acBg(cl) : "transparent", border: "none", padding: "5px 12px", borderRadius: 6, cursor: "pointer" }}>EN</button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "22px 20px 68px" }}>
        <section style={{ background: cl.cd, border: `1px solid ${cl.bd}`, borderRadius: 24, padding: "30px 28px", boxShadow: theme === "dark" ? "0 18px 40px rgba(0,0,0,.22)" : "0 18px 38px rgba(24,34,54,.06)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: cl.ac, letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 10 }}>
            {fr ? "Outil interactif gratuit" : "Free interactive tool"}
          </div>
          <h1 style={{ fontSize: "clamp(28px, 4.8vw, 40px)", fontWeight: 800, color: cl.al, margin: "0 0 10px", lineHeight: 1.08 }}>
            {fr ? <>Simulateur de <span style={{ color: cl.ac, fontStyle: "italic" }}>décaissement</span></> : <>Decumulation <span style={{ color: cl.ac, fontStyle: "italic" }}>simulator</span></>}
          </h1>
          <p style={{ fontSize: 14, color: cl.dm, maxWidth: 700, margin: 0, lineHeight: 1.65 }}>
            {fr ? "Projection déterministe de votre portefeuille à la retraite. Le calcul reste instantané et privé, mais la lecture devient plus claire: ce que votre plan tient, où il fragilise, et quand passer à une analyse plus complète." : "Deterministic projection of your retirement portfolio. The calculation stays instant and private, but the reading is calmer: what your plan sustains, where it narrows, and when to move to a fuller assessment."}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
            {[
              fr ? "Projection déterministe" : "Deterministic projection",
              fr ? "Aucune donnée envoyée" : "No data sent",
              fr ? "Lecture en dollars réels" : "Real-dollar readout",
            ].map((item) => (
              <span key={item} style={{ display: "inline-flex", alignItems: "center", minHeight: 30, padding: "0 12px", borderRadius: 999, background: cl.s2, border: `1px solid ${cl.bd}`, color: cl.dm, fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>
                {item}
              </span>
            ))}
          </div>
        </section>

        <ProductNote tone="rule" kicker={fr ? "Lecture du tool" : "How to read this tool"} cl={cl} style={{ marginTop: 18 }}>
          {fr ? "Commencez par la lecture des trois indicateurs principaux. Ils donnent le sens du plan avant même de regarder la trajectoire détaillée. Les champs plus bas servent ensuite à tester vos hypothèses, pas à deviner ce que le plan raconte." : "Start with the three headline indicators. They frame the plan before you even study the detailed trajectory. The fields below then help you test assumptions instead of guessing what the plan is saying."}
        </ProductNote>

        <SurfaceCard cl={cl} theme={theme} style={{ marginTop: 18 }}>
          <SectionHeading
            kicker={fr ? "Base du plan" : "Plan inputs"}
            title={fr ? "Définissez la retraite que vous voulez tester" : "Set the retirement line you want to test"}
            body={fr ? "Le premier bloc décrit votre situation et le revenu que vous voulez protéger. Le second bloc décrit vos hypothèses de marché. Ensemble, ils donnent une lecture simple du risque de décaissement." : "The first block describes your situation and the income you want to protect. The second block describes your market assumptions. Together they give a simple read on drawdown risk."}
            cl={cl}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18 }}>
            <div style={{ background: cl.s2, border: `1px solid ${cl.bd}`, borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: cl.ac, letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 14 }}>
                {fr ? "Situation" : "Current situation"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
                <Field id="dk-age" label={fr ? "Âge actuel" : "Current age"} cl={cl}>
                  <NumInput id="dk-age" value={age} onChange={setAge} min={50} max={85} cl={cl} />
                </Field>
                <Field id="dk-prov" label={fr ? "Province" : "Province"} cl={cl}>
                  <SelectInput id="dk-prov" value={prov} onChange={setProv} options={PROV_OPTS} cl={cl} />
                </Field>
                <Field id="dk-port" label={fr ? "Portefeuille (REER + CELI + NE)" : "Portfolio (RRSP + TFSA + NR)"} cl={cl}>
                  <NumInput id="dk-port" value={portfolio} onChange={setPortfolio} step={1000} prefix="$" cl={cl} />
                </Field>
                <Field id="dk-inc" label={fr ? "Revenu cible annuel (après impôt)" : "Target annual income (after tax)"} cl={cl}>
                  <NumInput id="dk-inc" value={income} onChange={setIncome} step={500} prefix="$" cl={cl} />
                </Field>
                <Field id="dk-qpp" label={isQC ? (fr ? "RRQ (par mois)" : "QPP (per month)") : (fr ? "RPC (par mois)" : "CPP (per month)")} cl={cl}>
                  <NumInput id="dk-qpp" value={qpp} onChange={setQpp} step={25} prefix="$" cl={cl} />
                </Field>
                <Field id="dk-oas" label={fr ? "PSV (par mois)" : "OAS (per month)"} tip={fr ? "Maximum 2026 : 742 $/mois (65-74 ans), 817 $/mois (75+)" : "2026 max: $742/mo (65-74), $817/mo (75+)"} cl={cl}>
                  <NumInput id="dk-oas" value={oas} onChange={setOas} step={10} prefix="$" cl={cl} />
                </Field>
                <Field id="dk-pen" label={fr ? "Pension PD (par mois, optionnel)" : "DB pension (per month, optional)"} cl={cl}>
                  <NumInput id="dk-pen" value={pension} onChange={setPension} step={25} prefix="$" cl={cl} />
                </Field>
              </div>
            </div>

            <div style={{ background: cl.s2, border: `1px solid ${cl.bd}`, borderRadius: 14, padding: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: cl.ac, letterSpacing: ".16em", textTransform: "uppercase", marginBottom: 14 }}>
                {fr ? "Hypothèses" : "Assumptions"}
              </div>
              <div style={{ display: "grid", gap: 14 }}>
                <Field id="dk-alloc" label={`${fr ? "Allocation actions" : "Equity allocation"} : ${Math.round(allocR * 100)} %`} tip={fr ? "% du portefeuille en actions. Glide path -1%/an vers obligations." : "% in equities. Glide path -1%/yr toward bonds."} cl={cl}>
                  <input
                    id="dk-alloc"
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={allocR}
                    onChange={(e) => setAllocR(Number(e.target.value))}
                    style={{ width: "100%", accentColor: cl.ac }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: cl.dm, marginTop: 4 }}>
                    <span>0 %</span><span>100 %</span>
                  </div>
                </Field>
                <Field id="dk-eq" label={fr ? "Rendement actions (annuel)" : "Equity return (annual)"} cl={cl}>
                  <NumInput id="dk-eq" value={eqRet} onChange={setEqRet} step={0.1} suffix="%" cl={cl} />
                </Field>
                <Field id="dk-inf" label={fr ? "Inflation (annuelle)" : "Inflation (annual)"} cl={cl}>
                  <NumInput id="dk-inf" value={inf} onChange={setInf} step={0.1} suffix="%" cl={cl} />
                </Field>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: cl.dm, borderTop: `1px solid ${cl.bd}`, paddingTop: 12 }}>
                  {fr ? "Le modèle réduit progressivement la part d'actions d'environ 1 % par année. Il ne simule pas plusieurs futurs possibles: il déroule un seul chemin à partir de vos hypothèses." : "The model gradually reduces the equity mix by about 1% per year. It does not simulate multiple futures: it walks a single path from your assumptions."}
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: cl.dm, background: cl.bg, border: `1px solid ${cl.bd}`, borderRadius: 10, padding: "12px 12px 11px" }}>
                  <strong style={{ color: cl.al }}>{fr ? "Outil simplifié" : "Simplified tool"}</strong>{" "}
                  {fr ? "Cette version traite le portefeuille comme une seule enveloppe. Elle ne tient pas compte de la fiscalité propre à chaque compte (REER, CELI, non enregistré) ni de l'ordre fiscal optimal des retraits." : "This version treats the portfolio as one combined pool. It does not account for account-specific tax treatment (RRSP, TFSA, non-registered) or the tax-optimal withdrawal order."}
                </div>
              </div>
            </div>
          </div>
        </SurfaceCard>

        <div style={{ marginTop: 18 }}>
          <SectionHeading
            kicker={fr ? "Lire d'abord" : "Read first"}
            title={fr ? "Ce que ce plan dit avant d'explorer les détails" : "What this plan says before you explore the details"}
            body={fr ? "Ces trois indicateurs résument la résistance du plan, la part de revenu déjà garantie, et la pression exercée sur le portefeuille dès le départ." : "These three indicators summarize plan durability, how much income is already guaranteed, and the pressure placed on the portfolio from the start."}
            cl={cl}
          />
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            <MetricCard
              label={fr ? "Durabilité" : "Sustainability"}
              value={sustains95 ? (fr ? "Tient jusqu'à 95 ans" : "Sustains to 95") : (fr ? `Épuisé à ${depletedAge} ans` : `Depleted at ${depletedAge}`)}
              sub={fr ? "Le verdict le plus simple du plan actuel." : "The clearest bottom-line read on the current plan."}
              accent={sustainColor}
              cl={cl}
            />
            <MetricCard
              label={fr ? "Couverture garantie" : "Guaranteed coverage"}
              value={`${govPctRound} %`}
              sub={`${fK(govAn, fr)} / ${fK(income, fr)}`}
              accent={govColor}
              cl={cl}
            />
            <MetricCard
              label={fr ? "Retrait initial" : "Initial withdrawal"}
              value={`${wdPct.toFixed(1).replace(".", fr ? "," : ".")} %`}
              sub={`${fK(portfolioNeeded, fr)} / ${fr ? "an" : "yr"}`}
              accent={wdColor}
              cl={cl}
            />
          </section>
        </div>

        <div style={{ display: "grid", gap: 18, marginTop: 18 }}>
          <SurfaceCard cl={cl} theme={theme}>
            <SectionHeading
              kicker={fr ? "Jalons" : "Milestones"}
              title={fr ? "Solde projeté aux âges clés" : "Projected balance at key ages"}
              body={fr ? "Lecture en dollars réels d'aujourd'hui. Cela permet de voir quand la flexibilité se rétrécit, même si le portefeuille n'est pas encore épuisé." : "Read in today's real dollars. This helps show when flexibility narrows even if the portfolio has not yet depleted."}
              cl={cl}
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10 }}>
              {[
                [75, balAt75], [85, balAt85], [90, balAt90], [95, balAt95],
              ].map(([a, v]) => {
                const isAfter = a >= age;
                if (!isAfter) return null;
                return (
                  <div key={a} style={{ background: cl.s2, border: `1px solid ${cl.bd}`, borderRadius: 10, padding: 12, textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: cl.dm, fontWeight: 600 }}>{fr ? `À ${a} ans` : `At ${a}`}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: v > 0 ? cl.ac : cl.rd, marginTop: 4, fontFamily: FONT.mono }}>
                      {v > 0 ? fK(v, fr) : (fr ? "Épuisé" : "Depleted")}
                    </div>
                  </div>
                );
              })}
            </div>
          </SurfaceCard>

          <SurfaceCard cl={cl} theme={theme}>
            <SectionHeading
              kicker={fr ? "Trajectoire" : "Trajectory"}
              title={fr ? "Comment le portefeuille évolue" : "How the portfolio evolves"}
              body={fr ? "Cette courbe ne montre pas plusieurs scénarios. Elle montre le seul chemin impliqué par vos hypothèses actuelles." : "This curve does not show multiple scenarios. It shows the single path implied by your current assumptions."}
              cl={cl}
            />
            <div style={{ background: cl.s2, border: `1px solid ${cl.bd}`, borderRadius: 14, padding: "18px 18px 14px" }}>
              <TrajChart />
            </div>
            <div style={{ fontSize: 12, color: cl.dm, lineHeight: 1.6, marginTop: 10 }}>
              {sustains95
                ? (fr ? "Le portefeuille reste positif jusqu'à 95 ans dans ce scénario, mais les soldes tardifs vous disent combien de marge de manœuvre il vous reste réellement." : "The portfolio stays positive to age 95 in this scenario, but the late balances tell you how much flexibility is actually left.")
                : (fr ? "Le point de rupture est visible ici. La vraie question devient alors: faut-il réduire le revenu cible, retarder certains retraits, ou refaire l'analyse avec plus de scénarios?" : "The breaking point is visible here. The real question then becomes: should you reduce the target income, delay some withdrawals, or rerun the plan with more scenarios?")}
            </div>
          </SurfaceCard>
        </div>

        <ProductNote tone="caution" kicker={fr ? "Limites du modèle" : "Model limits"} cl={cl} style={{ marginTop: 18 }}>
          {fr
            ? "Cette projection applique vos hypothèses (rendement, inflation, allocation) année par année, en ligne droite. Les rendements réels varient. Un seul krach dans une mauvaise année peut produire un résultat très différent. Le Bilan 360 ajoute 5 000 scénarios Monte Carlo, la fiscalité annuelle et des tests de résilience."
            : "This projection applies your assumptions (return, inflation, allocation) year by year in a straight line. Real returns vary. A single crash in a bad year can produce a very different result. Bilan 360 adds 5,000 Monte Carlo scenarios, annual tax logic, and resilience tests."}
        </ProductNote>

        <SurfaceCard cl={cl} theme={theme} style={{ marginTop: 18, borderColor: cl.ac }}>
          <SectionHeading
            kicker={fr ? "Prochaine étape" : "Next step"}
            title={fr ? "Quand ce tool suffit, et quand il faut aller plus loin" : "When this tool is enough, and when to go further"}
            body={fr ? "Utilisez ce simulateur pour cadrer l'ordre de grandeur. Passez ensuite au guide ou au bilan complet si vous devez arbitrer entre timing RRQ/PSV, variabilité des rendements, ou résilience du revenu." : "Use this simulator to frame the order of magnitude. Then move to the guide or full assessment if you need to arbitrate QPP/OAS timing, return variability, or income resilience."}
            cl={cl}
          />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href={`/bilan-360?lang=${lang}`} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 44, padding: "0 18px", borderRadius: 999, background: cl.ac, color: theme === "dark" ? cl.bg : "#fff", fontSize: 14, fontWeight: 800, textDecoration: "none" }}>
              {fr ? "Obtenir mon Bilan 360 →" : "Get my Bilan 360 →"}
            </a>
            <button onClick={copyShare} style={{ background: "transparent", color: cl.tx, border: `1px solid ${cl.bd}`, minHeight: 44, padding: "0 18px", borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {fr ? "Partager cette simulation" : "Share this simulation"}
            </button>
            <a href={`/guides/201?lang=${lang}`} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 44, padding: "0 18px", borderRadius: 999, border: `1px solid ${cl.bd}`, textDecoration: "none", fontSize: 13, fontWeight: 700, color: cl.tx }}>
              {fr ? "Guide 201 retraite" : "Guide 201 retirement"}
            </a>
            <a href={`/outils/dettes?lang=${lang}`} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 44, padding: "0 18px", borderRadius: 999, border: `1px solid ${cl.bd}`, textDecoration: "none", fontSize: 13, fontWeight: 700, color: cl.tx }}>
              {fr ? "Calculateur de dettes" : "Debt calculator"}
            </a>
          </div>
          {flash ? <div style={{ marginTop: 12, fontSize: 12, color: cl.gn, fontWeight: 700 }}>{flash}</div> : null}
        </SurfaceCard>
      </div>
    </div>
  );
}
