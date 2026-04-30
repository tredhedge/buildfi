"use client";
import React, { useState, useMemo, useEffect } from "react";
import { getProductPalette, THEME_STORAGE_KEY } from "@/lib/design/product.tokens";
import { useProductBody, ProductNote } from "@/lib/design/product-components";
import { BuildFiLogo } from "@/lib/design/components";

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
    const W = 620, H = 220, PL = 56, PB = 28, PT = 12, PR = 16;
    const chartW = W - PL - PR, chartH = H - PB - PT;
    const maxP = Math.max(portfolio, ...pts, 1);
    const xp = (i) => PL + (i / Math.max(1, pts.length - 1)) * chartW;
    const yp = (v) => PT + chartH - (v / maxP) * chartH;
    const line = pts.map((v, i) => `${i === 0 ? "M" : "L"} ${xp(i).toFixed(1)},${yp(v).toFixed(1)}`).join(" ");
    // Y-axis ticks
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({ v: maxP * t, y: yp(maxP * t) }));
    // X-axis: show every 5 years
    const xLabels = [];
    for (let i = 0; i < pts.length; i += 5) {
      xLabels.push(<text key={i} x={xp(i)} y={H - 10} textAnchor="middle" fontSize={10} fill={cl.dm}>{age + i}</text>);
    }
    // Depletion marker
    const depIdx = depletedAge !== null ? depletedAge - age : null;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {/* grid */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PL} y1={t.y} x2={W - PR} y2={t.y} stroke={cl.bd} strokeDasharray="2 3" opacity={0.4} />
            <text x={PL - 6} y={t.y + 3} textAnchor="end" fontSize={10} fill={cl.dm}>{fK(t.v, fr)}</text>
          </g>
        ))}
        {xLabels}
        {/* deterministic line */}
        <path d={line} fill="none" stroke={cl.ac} strokeWidth={2.5} />
        {/* depletion marker */}
        {depIdx !== null ? (
          <g>
            <line x1={xp(depIdx)} y1={PT} x2={xp(depIdx)} y2={PT + chartH} stroke={cl.rd} strokeWidth={1.5} strokeDasharray="4 3" />
            <text x={xp(depIdx)} y={PT - 2} textAnchor="middle" fontSize={11} fontWeight={700} fill={cl.rd}>
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
    <div suppressHydrationWarning style={{ background: cl.bg, minHeight: "100vh", color: cl.tx, fontFamily: 'var(--font-dm-sans),"Segoe UI",Arial,sans-serif', lineHeight: 1.5 }}>
      {/* Header */}
      <header style={{ background: cl.cd, padding: "14px 20px", borderBottom: `1px solid ${cl.bd}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <a href="/" aria-label="BuildFi home" style={{ display: "inline-flex", textDecoration: "none" }}>
          <BuildFiLogo theme={theme} size="sm" accent={cl.ac} />
        </a>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={fr ? "Changer le thème" : "Toggle theme"}
            aria-label={fr ? "Changer le thème" : "Toggle theme"}
            style={{ background: cl.s2, border: `1px solid ${cl.bd}`, color: cl.tx, padding: "6px 10px", borderRadius: 8, fontSize: 14, cursor: "pointer", fontWeight: 700 }}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <div style={{ display: "flex", gap: 4, background: cl.s2, borderRadius: 8, padding: 3 }}>
            <button onClick={() => setLang("fr")} style={{ fontSize: 12, fontWeight: 700, color: lang === "fr" ? cl.al : cl.dm, background: lang === "fr" ? acBg(cl) : "transparent", border: "none", padding: "5px 12px", borderRadius: 6, cursor: "pointer" }}>FR</button>
            <button onClick={() => setLang("en")} style={{ fontSize: 12, fontWeight: 700, color: lang === "en" ? cl.al : cl.dm, background: lang === "en" ? acBg(cl) : "transparent", border: "none", padding: "5px 12px", borderRadius: 6, cursor: "pointer" }}>EN</button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{ background: cl.cd, padding: "28px 20px 44px", textAlign: "center", borderBottom: `1px solid ${cl.bd}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: cl.ac, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>{fr ? "Outil interactif gratuit" : "Free interactive tool"}</div>
        <h1 style={{ fontSize: "clamp(24px, 4.5vw, 36px)", fontWeight: 800, color: cl.al, margin: "0 0 10px", lineHeight: 1.15 }}>
          {fr ? <>Simulateur de <span style={{ color: cl.ac, fontStyle: "italic" }}>décaissement</span></> : <>Decumulation <span style={{ color: cl.ac, fontStyle: "italic" }}>Simulator</span></>}
        </h1>
        <p style={{ fontSize: 14, color: cl.dm, maxWidth: 560, margin: "0 auto" }}>
          {fr ? "Projection déterministe de votre portefeuille à la retraite. Calcul instantané — aucune donnée envoyée." : "Deterministic projection of your retirement portfolio. Instant calculation — no data sent."}
        </p>
        <div style={{ display: "inline-block", background: cl.bg, border: `1px solid ${cl.bd}`, color: cl.dm, fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 20, marginTop: 12, letterSpacing: 1, textTransform: "uppercase" }}>
          {fr ? "Projection déterministe — un seul scénario" : "Deterministic projection — single scenario"}
        </div>
      </section>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "0 20px 60px" }}>
        {/* INPUTS */}
        <section style={{ background: cl.cd, border: `1px solid ${cl.bd}`, borderRadius: 16, padding: 24, marginTop: 24, boxShadow: theme === "dark" ? "0 4px 16px rgba(0,0,0,0.25)" : "0 2px 6px rgba(15,30,60,0.06)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: cl.al, margin: "0 0 18px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "inline-block", width: 4, height: 18, background: cl.ac, borderRadius: 2 }} />
            {fr ? "Votre situation" : "Your situation"}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
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
            <Field id="dk-alloc" label={`${fr ? "Allocation actions" : "Equity allocation"} : ${Math.round(allocR * 100)} %`} tip={fr ? "% du portefeuille en actions. Glide path -1%/an vers obligations." : "% in equities. Glide path -1%/yr toward bonds."} cl={cl}>
              <input
                id="dk-alloc"
                type="range" min={0.20} max={0.80} step={0.05}
                value={allocR}
                onChange={(e) => setAllocR(Number(e.target.value))}
                style={{ width: "100%", accentColor: cl.ac }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: cl.dm, marginTop: 4 }}>
                <span>20 %</span><span>80 %</span>
              </div>
            </Field>
            <Field id="dk-eq" label={fr ? "Rendement actions (annuel)" : "Equity return (annual)"} cl={cl}>
              <NumInput id="dk-eq" value={eqRet} onChange={setEqRet} step={0.1} suffix="%" cl={cl} />
            </Field>
            <Field id="dk-inf" label={fr ? "Inflation (annuelle)" : "Inflation (annual)"} cl={cl}>
              <NumInput id="dk-inf" value={inf} onChange={setInf} step={0.1} suffix="%" cl={cl} />
            </Field>
          </div>
        </section>

        {/* DETERMINISTIC RESULTS — calm KPI cards: surface card with thin
            colored left bar carrying the semantic state. Value lives in
            JetBrains Mono so the number is the focal point. */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginTop: 18 }}>
          <div style={{ background: cl.cd, border: `1px solid ${cl.bd}`, borderLeft: `2px solid ${sustainColor}`, borderRadius: "0 12px 12px 0", padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: sustainColor, textTransform: "uppercase", letterSpacing: ".18em" }}>{fr ? "Durabilité" : "Sustainability"}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: cl.al, marginTop: 6, fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace' }}>
              {sustains95
                ? (fr ? "Tient jusqu'à 95 ans" : "Sustains to 95")
                : (fr ? `Épuisé à ${depletedAge} ans` : `Depleted at ${depletedAge}`)}
            </div>
          </div>
          <div style={{ background: cl.cd, border: `1px solid ${cl.bd}`, borderLeft: `2px solid ${govColor}`, borderRadius: "0 12px 12px 0", padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: govColor, textTransform: "uppercase", letterSpacing: ".18em" }}>{fr ? "Couverture garantie" : "Guaranteed coverage"}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: cl.al, marginTop: 6, fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace' }}>{govPctRound} %</div>
            <div style={{ fontSize: 11, color: cl.dm, marginTop: 2 }}>{fK(govAn, fr)} / {fK(income, fr)}</div>
          </div>
          <div style={{ background: cl.cd, border: `1px solid ${cl.bd}`, borderLeft: `2px solid ${wdColor}`, borderRadius: "0 12px 12px 0", padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: wdColor, textTransform: "uppercase", letterSpacing: ".18em" }}>{fr ? "Taux de retrait initial" : "Initial withdrawal rate"}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: cl.al, marginTop: 6, fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace' }}>{wdPct.toFixed(1).replace(".", fr ? "," : ".")} %</div>
            <div style={{ fontSize: 11, color: cl.dm, marginTop: 2 }}>{fK(portfolioNeeded, fr)} / an</div>
          </div>
        </section>

        {/* Snapshot balances at key ages */}
        <section style={{ background: cl.cd, border: `1px solid ${cl.bd}`, borderRadius: 16, padding: 20, marginTop: 18 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: cl.al, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: 0.8 }}>
            {fr ? "Solde projeté (dollars réels d'aujourd'hui)" : "Projected balance (today's real dollars)"}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10 }}>
            {[
              [75, balAt75], [85, balAt85], [90, balAt90], [95, balAt95],
            ].map(([a, v]) => {
              const isAfter = a >= age;
              if (!isAfter) return null;
              return (
                <div key={a} style={{ background: cl.s2, border: `1px solid ${cl.bd}`, borderRadius: 10, padding: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: cl.dm, fontWeight: 600 }}>{fr ? `À ${a} ans` : `At ${a}`}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: v > 0 ? cl.ac : cl.rd, marginTop: 4 }}>
                    {v > 0 ? fK(v, fr) : (fr ? "Épuisé" : "Depleted")}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* TRAJECTORY CHART — deterministic single line */}
        <section style={{ background: cl.cd, border: `1px solid ${cl.bd}`, borderRadius: 16, padding: 20, marginTop: 18 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: cl.al, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: 0.8 }}>
            {fr ? "Trajectoire du portefeuille" : "Portfolio trajectory"}
          </h3>
          <TrajChart />
          <div style={{ fontSize: 11, color: cl.dm, marginTop: 6 }}>
            <span style={{ display: "inline-block", width: 16, height: 3, background: cl.ac, verticalAlign: "middle", marginRight: 6 }} />
            {fr ? "Projection unique basée sur vos hypothèses. Pas de simulation Monte Carlo." : "Single projection based on your assumptions. Not a Monte Carlo simulation."}
          </div>
        </section>

        {/* DISCLAIMER — honest about determinism */}
        <section style={{ background: cl.s2, border: `1px solid ${cl.bd}`, borderRadius: 12, padding: "14px 18px", marginTop: 18, fontSize: 12, color: cl.dm, lineHeight: 1.6 }}>
          <strong style={{ color: cl.al }}>{fr ? "Limites du modèle" : "Model limitations"}</strong>{" "}
          {fr
            ? ": cette projection applique vos hypothèses (rendement, inflation, allocation) année par année, en ligne droite. Les rendements réels varient. Un seul krach dans une mauvaise année peut produire un résultat très différent. Le Bilan 360 utilise 5 000 scénarios Monte Carlo avec variation des rendements, mortalité stochastique et optimisation fiscale annuelle."
            : ": this projection applies your assumptions (return, inflation, allocation) year by year, in a straight line. Real returns vary. A single crash in a bad year can produce a very different result. Bilan 360 uses 5,000 Monte Carlo scenarios with return variance, stochastic mortality, and annual tax optimization."}
        </section>

        {/* CTA */}
        <section style={{ background: theme === "dark" ? `linear-gradient(135deg, ${cl.cd}, ${cl.s2})` : cl.cd, border: `1px solid ${cl.ac}`, borderRadius: 16, padding: "24px 24px", marginTop: 20, textAlign: "center" }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: cl.al, margin: "0 0 8px" }}>
            {fr ? "Besoin d'un bilan complet avec variance des rendements ?" : "Need a full assessment with return variance?"}
          </h3>
          <p style={{ fontSize: 14, color: cl.dm, margin: "0 0 16px", maxWidth: 520, marginLeft: "auto", marginRight: "auto", lineHeight: 1.55 }}>
            {fr
              ? "Bilan 360 — 29,99 $ — 5 000 scénarios Monte Carlo, timing optimal RRQ/PSV, tests de résilience, narration IA."
              : "Bilan 360 — $29.99 — 5,000 Monte Carlo scenarios, optimal QPP/OAS timing, resilience tests, AI narration."}
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={`/bilan-360?lang=${lang}`} style={{ display: "inline-block", background: cl.ac, color: theme === "dark" ? cl.bg : "#fff", padding: "11px 22px", borderRadius: 10, fontSize: 14, fontWeight: 800, textDecoration: "none" }}>
              {fr ? "Obtenir mon Bilan 360 →" : "Get my Bilan 360 →"}
            </a>
            <button onClick={copyShare} style={{ background: "transparent", color: cl.tx, border: `1px solid ${cl.bd}`, padding: "11px 22px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {fr ? "Partager cette simulation" : "Share this simulation"}
            </button>
          </div>
          {flash ? <div style={{ marginTop: 10, fontSize: 12, color: cl.gn, fontWeight: 700 }}>{flash}</div> : null}
        </section>

        {/* Related links */}
        <div style={{ marginTop: 20, fontSize: 12, color: cl.dm, textAlign: "center", lineHeight: 1.8 }}>
          {fr ? "Voir aussi : " : "See also: "}
          <a href={`/guides/201?lang=${lang}`} style={{ color: cl.ac, textDecoration: "none" }}>{fr ? "Guide 201 — Optimiser votre retraite" : "Guide 201 — Optimize your retirement"}</a>
          {" · "}
          <a href={`/outils/dettes?lang=${lang}`} style={{ color: cl.ac, textDecoration: "none" }}>{fr ? "Calculateur de dettes" : "Debt calculator"}</a>
        </div>
      </main>
    </div>
  );
}
