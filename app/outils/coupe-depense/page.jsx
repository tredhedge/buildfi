"use client";
import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { getProductPalette, THEME_STORAGE_KEY } from "@/lib/design/product.tokens";
import { useProductBody } from "@/lib/design/product-components";
import { BuildFiLogo } from "@/lib/design/components";

/* ═══════════════════════════════════════════════════════════
   BuildFi — Calculateur "Si je coupais X" (FV annuity, real $)
   Lead-magnet outil. Aucune donnée envoyée. FR/EN via ?lang=en.
   ═══════════════════════════════════════════════════════════ */

const acBg = (cl) => cl.ac + "18";

const fMoney = (n, fr) => Math.round(Number(n) || 0).toLocaleString(fr ? "fr-CA" : "en-CA").replace(/[  ]/g, " ") + " $";
const fK = (n, fr) => {
  const x = Math.round(Number(n) || 0);
  if (Math.abs(x) >= 1_000_000) return (x / 1_000_000).toFixed(2).replace(".", fr ? "," : ".") + " M$";
  if (Math.abs(x) >= 10_000) return Math.round(x / 1000) + " k$";
  if (Math.abs(x) >= 1000) return (x / 1000).toFixed(1).replace(".", fr ? "," : ".") + " k$";
  return x + " $";
};

/* Multipliers: how many "periods" per year */
const FREQ_MULT = { day: 365, week: 52, biweek: 26, month: 12, year: 1 };

/* Future value of an ordinary annuity in real (today's) dollars
   assuming a constant real return r per year compounded annually.
   r = 0 handled via limit. */
function futureValueAnnuity(annualAmount, realReturnPct, years) {
  const r = (Number(realReturnPct) || 0) / 100;
  const n = Math.max(0, Number(years) || 0);
  const M = Math.max(0, Number(annualAmount) || 0);
  if (n === 0 || M === 0) return 0;
  if (Math.abs(r) < 1e-6) return M * n;
  return M * (Math.pow(1 + r, n) - 1) / r;
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
        style={{ flex: 1, padding: "10px 10px", fontSize: 16, background: "transparent", border: "none", color: cl.tx, outline: "none", width: "100%" }}
      />
      {suffix ? <span style={{ padding: "10px 10px", background: cl.bg, color: cl.dm, fontSize: 12, fontWeight: 700, borderLeft: `1px solid ${cl.bd}` }}>{suffix}</span> : null}
    </div>
  );
}
function SelectInput({ id, value, onChange, options, cl }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", padding: "10px 10px", fontSize: 16, background: cl.s2, border: `1px solid ${cl.bd}`, borderRadius: 8, color: cl.tx, outline: "none" }}
    >
      {options.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
    </select>
  );
}

/* ── Comparison bar (proportional, top-level to avoid render-time re-creation) ──
   v2 framing: value label always placed OUTSIDE the bar end, with reserved right padding
   wide enough for the longest formatted value (e.g. "1,40 M$"). Eliminates the
   inside/outside positioning ambiguity that caused the rightmost label to overflow. */
function ComparisonBar({ cl, monthly, annual, fv, retAge, fr, isPositive }) {
  const W = 640, H = 140, PL = 110, PR = 120, PT = 14, PB = 14;
  const chartW = W - PL - PR;
  const items = [
    { label: fr ? "Ce mois" : "This month", v: monthly, color: cl.dm },
    { label: fr ? "Cette année" : "This year", v: annual, color: cl.ac },
    { label: fr ? `À ${retAge} ans` : `At ${retAge}`, v: fv, color: isPositive ? cl.gn : cl.dm },
  ];
  const maxV = Math.max(1, ...items.map(i => i.v));
  const rowH = (H - PT - PB) / items.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block", overflow: "visible" }}>
      {items.map((it, i) => {
        const w = (it.v / maxV) * chartW;
        const y = PT + i * rowH;
        const barEnd = PL + Math.max(2, w);
        return (
          <g key={i}>
            <text x={PL - 8} y={y + rowH / 2 + 4} textAnchor="end" fontSize={11} fill={cl.dm} fontWeight={600}>{it.label}</text>
            <rect x={PL} y={y + 6} width={Math.max(2, w)} height={rowH - 12} fill={it.color} rx={3} />
            <text
              x={barEnd + 8}
              y={y + rowH / 2 + 4}
              textAnchor="start"
              fontSize={12}
              fill={cl.tx}
              fontWeight={700}
              fontFamily='var(--font-jetbrains-mono),"Courier New",monospace'
            >
              {fK(it.v, fr)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Page ───────────────────────────────────────────────────── */
export default function CoupeDepensePage() {
  const [lang, setLang] = useState("fr");
  const [theme, setTheme] = useState("light");
  const [mounted, setMounted] = useState(false);
  const cl = getProductPalette(mounted && theme === "dark" ? "dark" : "light");
  useProductBody(mounted && theme === "dark" ? "dark" : "light");
  const fr = lang === "fr";

  /* inputs */
  const [amount, setAmount] = useState(5);
  const [freq, setFreq] = useState("day");
  const [age, setAge] = useState(35);
  const [retAge, setRetAge] = useState(65);
  const [realReturn, setRealReturn] = useState(4.5); // real, net inflation

  /* persisted state + query params */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional hydration gate
    setMounted(true);
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("lang") === "en") setLang("en");
      if (sp.get("theme") === "light") setTheme("light");
      const setters = { amount: setAmount, age: setAge, retAge: setRetAge, realReturn: setRealReturn };
      Object.keys(setters).forEach((k) => {
        const v = sp.get(k); if (v != null) { const n = Number(v); if (Number.isFinite(n)) setters[k](n); }
      });
      const f = sp.get("freq"); if (f && FREQ_MULT[f]) setFreq(f);
    } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch {} }, [theme]);

  const calc = useMemo(() => {
    const periodsPerYear = FREQ_MULT[freq] || 12;
    const annual = (Number(amount) || 0) * periodsPerYear;
    const monthly = annual / 12;
    const years = Math.max(0, retAge - age);
    const fv = futureValueAnnuity(annual, realReturn, years);
    // Perpetual annual income at 4% safe withdrawal
    const perpetualIncome = fv * 0.04;
    return { annual, monthly, years, fv, perpetualIncome };
  }, [amount, freq, age, retAge, realReturn]);

  const { annual, monthly, years, fv, perpetualIncome } = calc;
  const hasYears = years > 0;
  const isPositive = fv > 0;

  /* Presets v2 — calibrés Québec 2026, montants réalistes par catégorie unique */
  const presets = fr ? [
    { label: "Café 5 $/jour", amount: 5, freq: "day" },
    { label: "Lunch midi 18 $/jour", amount: 18, freq: "day" },
    { label: "Streaming 20 $/mois", amount: 20, freq: "month" },
    { label: "Bière 25 $/sem", amount: 25, freq: "week" },
    { label: "Stationnement 220 $/mois", amount: 220, freq: "month" },
    { label: "Frais bancaires 16 $/mois", amount: 16, freq: "month" },
    { label: "Uber 60 $/sem", amount: 60, freq: "week" },
    { label: "Resto sortie 90 $/sem", amount: 90, freq: "week" },
  ] : [
    { label: "Coffee $5/day", amount: 5, freq: "day" },
    { label: "Lunch $18/day", amount: 18, freq: "day" },
    { label: "Streaming $20/mo", amount: 20, freq: "month" },
    { label: "Beer $25/wk", amount: 25, freq: "week" },
    { label: "Parking $220/mo", amount: 220, freq: "month" },
    { label: "Bank fees $16/mo", amount: 16, freq: "month" },
    { label: "Uber $60/wk", amount: 60, freq: "week" },
    { label: "Dining out $90/wk", amount: 90, freq: "week" },
  ];

  const FREQ_OPTS = fr ? [
    ["day", "par jour"],
    ["week", "par semaine"],
    ["biweek", "aux 2 semaines"],
    ["month", "par mois"],
    ["year", "par an"],
  ] : [
    ["day", "per day"],
    ["week", "per week"],
    ["biweek", "every 2 weeks"],
    ["month", "per month"],
    ["year", "per year"],
  ];

  /* ── Share ── */
  const [flash, setFlash] = useState("");
  const copyShare = async () => {
    try {
      const url = new URL(typeof window !== "undefined" ? window.location.href : "https://buildfi.ca/outils/coupe-depense");
      const params = { amount, freq, age, retAge, realReturn, lang, theme };
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
        <Link href="/" aria-label="BuildFi home" style={{ display: "inline-flex", textDecoration: "none" }}>
          <BuildFiLogo theme={theme} size="sm" accent={cl.ac} />
        </Link>
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
          {fr
            ? <>Si je coupais <span style={{ color: cl.ac, fontStyle: "italic" }}>cette dépense</span>…</>
            : <>If I cut <span style={{ color: cl.ac, fontStyle: "italic" }}>this expense</span>…</>}
        </h1>
        <p style={{ fontSize: 14, color: cl.dm, maxWidth: 560, margin: "0 auto" }}>
          {fr
            ? "Combien vaut une dépense récurrente coupée aujourd'hui, projetée jusqu'à la retraite ? Calcul instantané — aucune donnée envoyée."
            : "How much could a recurring expense be worth, if cut today and invested until retirement? Instant calculation — no data sent."}
        </p>
        <div style={{ display: "inline-block", background: cl.bg, border: `1px solid ${cl.bd}`, color: cl.dm, fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 20, marginTop: 12, letterSpacing: 1, textTransform: "uppercase" }}>
          {fr ? "Dollars d'aujourd'hui (rendement réel net inflation)" : "Today's dollars (real return, net of inflation)"}
        </div>
      </section>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "0 20px 60px" }}>
        {/* PRESETS */}
        <section style={{ marginTop: 24, marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: cl.dm, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
            {fr ? "Essais rapides" : "Quick examples"}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {presets.map((p, i) => (
              <button
                key={i}
                onClick={() => { setAmount(p.amount); setFreq(p.freq); }}
                style={{ background: cl.s2, border: `1px solid ${cl.bd}`, color: cl.tx, padding: "7px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>

        {/* INPUTS */}
        <section style={{ background: cl.cd, border: `1px solid ${cl.bd}`, borderRadius: 16, padding: 24, marginTop: 16, boxShadow: theme === "dark" ? "0 4px 16px rgba(0,0,0,0.25)" : "0 2px 6px rgba(15,30,60,0.06)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: cl.al, margin: "0 0 18px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "inline-block", width: 4, height: 18, background: cl.ac, borderRadius: 2 }} />
            {fr ? "La dépense à couper" : "The expense to cut"}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
            <Field id="cd-amt" label={fr ? "Montant" : "Amount"} cl={cl}>
              <NumInput id="cd-amt" value={amount} onChange={setAmount} step={1} prefix="$" cl={cl} />
            </Field>
            <Field id="cd-freq" label={fr ? "Fréquence" : "Frequency"} cl={cl}>
              <SelectInput id="cd-freq" value={freq} onChange={setFreq} options={FREQ_OPTS} cl={cl} />
            </Field>
            <Field id="cd-age" label={fr ? "Âge actuel" : "Current age"} cl={cl}>
              <NumInput id="cd-age" value={age} onChange={setAge} min={18} max={75} cl={cl} />
            </Field>
            <Field id="cd-ret" label={fr ? "Âge de retraite cible" : "Target retirement age"} cl={cl}>
              <NumInput id="cd-ret" value={retAge} onChange={setRetAge} min={Math.max(age + 1, 50)} max={75} cl={cl} />
            </Field>
            <Field id="cd-rr" label={fr ? "Rendement réel (annuel, net inflation)" : "Real return (annual, net inflation)"} tip={fr ? "Rendement attendu APRÈS inflation. Référence : portefeuille équilibré ~3-5 % réel à long terme." : "Expected return AFTER inflation. Reference: balanced portfolio ~3-5% real, long-term."} cl={cl}>
              <NumInput id="cd-rr" value={realReturn} onChange={setRealReturn} step={0.1} suffix="%" min={0} max={10} cl={cl} />
            </Field>
          </div>
        </section>

        {/* WARNING if invalid */}
        {!hasYears ? (
          <section style={{ background: cl.cd, border: `1px solid ${cl.or}`, borderLeft: `4px solid ${cl.or}`, borderRadius: 12, padding: 16, marginTop: 18 }}>
            <strong style={{ color: cl.al }}>{fr ? "Âge ≥ retraite" : "Age ≥ retirement"}</strong>
            <div style={{ fontSize: 13, color: cl.dm, marginTop: 4 }}>
              {fr ? "Aucun horizon de capitalisation. Pour estimer la valeur d'une dépense coupée à la retraite, ajustez les âges." : "No accumulation horizon. To estimate the value of a cut expense at retirement, adjust the ages."}
            </div>
          </section>
        ) : null}

        {/* KPI CARDS */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginTop: 18 }}>
          <div style={{ background: cl.cd, borderTop: `1px solid ${cl.bd}`, borderRight: `1px solid ${cl.bd}`, borderBottom: `1px solid ${cl.bd}`, borderLeft: `2px solid ${cl.dm}`, borderRadius: "0 12px 12px 0", padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: cl.dm, textTransform: "uppercase", letterSpacing: ".18em" }}>{fr ? "Libéré ce mois" : "Freed this month"}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: cl.al, marginTop: 6, fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace' }}>{fMoney(monthly, fr)}</div>
            <div style={{ fontSize: 11, color: cl.dm, marginTop: 2 }}>{fr ? "Cash-flow immédiat" : "Immediate cash-flow"}</div>
          </div>
          <div style={{ background: cl.cd, borderTop: `1px solid ${cl.bd}`, borderRight: `1px solid ${cl.bd}`, borderBottom: `1px solid ${cl.bd}`, borderLeft: `2px solid ${cl.ac}`, borderRadius: "0 12px 12px 0", padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: cl.ac, textTransform: "uppercase", letterSpacing: ".18em" }}>{fr ? "Libéré cette année" : "Freed this year"}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: cl.al, marginTop: 6, fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace' }}>{fMoney(annual, fr)}</div>
            <div style={{ fontSize: 11, color: cl.dm, marginTop: 2 }}>{fr ? `${FREQ_MULT[freq]} × ${fMoney(amount, fr)}` : `${FREQ_MULT[freq]} × ${fMoney(amount, fr)}`}</div>
          </div>
          <div style={{ background: cl.cd, borderTop: `1px solid ${cl.bd}`, borderRight: `1px solid ${cl.bd}`, borderBottom: `1px solid ${cl.bd}`, borderLeft: `2px solid ${isPositive ? cl.gn : cl.dm}`, borderRadius: "0 12px 12px 0", padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: isPositive ? cl.gn : cl.dm, textTransform: "uppercase", letterSpacing: ".18em" }}>{fr ? `Valeur à ${retAge} ans` : `Value at ${retAge}`}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: cl.al, marginTop: 6, fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace' }}>{fMoney(fv, fr)}</div>
            <div style={{ fontSize: 11, color: cl.dm, marginTop: 2 }}>{fr ? `Sur ${years} an${years > 1 ? "s" : ""} à ${realReturn.toFixed(1).replace(".", ",")} % réel` : `Over ${years} year${years > 1 ? "s" : ""} at ${realReturn.toFixed(1)}% real`}</div>
          </div>
          <div style={{ background: cl.cd, borderTop: `1px solid ${cl.bd}`, borderRight: `1px solid ${cl.bd}`, borderBottom: `1px solid ${cl.bd}`, borderLeft: `2px solid ${cl.ac}`, borderRadius: "0 12px 12px 0", padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: cl.ac, textTransform: "uppercase", letterSpacing: ".18em" }}>{fr ? "Revenu retraite équivalent" : "Equivalent retirement income"}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: cl.al, marginTop: 6, fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace' }}>{fMoney(perpetualIncome, fr)}</div>
            <div style={{ fontSize: 11, color: cl.dm, marginTop: 2 }}>{fr ? "par an, à 4 % de retrait" : "per year, at 4% withdrawal"}</div>
          </div>
        </section>

        {/* COMPARISON CHART */}
        <section style={{ background: cl.cd, border: `1px solid ${cl.bd}`, borderRadius: 16, padding: 20, marginTop: 18 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: cl.al, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: 0.8 }}>
            {fr ? "Comparaison à l'échelle" : "At-scale comparison"}
          </h3>
          <ComparisonBar cl={cl} monthly={monthly} annual={annual} fv={fv} retAge={retAge} fr={fr} isPositive={isPositive} />
          <div style={{ fontSize: 11, color: cl.dm, marginTop: 6 }}>
            {fr
              ? "L'effet boule de neige des intérêts composés se voit : le cumul à la retraite domine largement le cash-flow mensuel."
              : "The compounding effect is visible: the retirement-age total dwarfs the monthly cash-flow."}
          </div>
        </section>

        {/* DISCLAIMER */}
        <section style={{ background: cl.s2, border: `1px solid ${cl.bd}`, borderRadius: 12, padding: "14px 18px", marginTop: 18, fontSize: 12, color: cl.dm, lineHeight: 1.6 }}>
          <strong style={{ color: cl.al }}>{fr ? "Méthodologie et limites" : "Methodology and limits"}</strong>{" "}
          {fr
            ? ": projection à titre informatif uniquement. Calcul de la valeur future d'une rente ordinaire, contributions annuelles constantes, rendement réel constant net d'inflation. Ne tient pas compte des impôts, frais, volatilité ou variations de revenus. Les rendements passés ne garantissent pas les performances futures. Cet outil ne constitue pas un conseil financier."
            : ": projection for informational purposes only. Future-value-of-ordinary-annuity calculation, constant annual contributions, constant real return net of inflation. Does not account for taxes, fees, volatility, or income changes. Past returns do not guarantee future performance. This tool does not constitute financial advice."}
        </section>

        {/* CTA */}
        <section style={{ background: theme === "dark" ? `linear-gradient(135deg, ${cl.cd}, ${cl.s2})` : cl.cd, border: `1px solid ${cl.ac}`, borderRadius: 16, padding: "24px 24px", marginTop: 20, textAlign: "center" }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: cl.al, margin: "0 0 8px" }}>
            {fr ? "Tu veux savoir si tu es sur la bonne voie ?" : "Want to know if you're on track?"}
          </h3>
          <p style={{ fontSize: 14, color: cl.dm, margin: "0 0 16px", maxWidth: 520, marginLeft: "auto", marginRight: "auto", lineHeight: 1.55 }}>
            {fr
              ? "Bilan 360 — un rapport personnalisé qui projette ton revenu de retraite, identifie les écarts et propose des scénarios à examiner."
              : "Bilan 360 — a personalized report that projects your retirement income, identifies gaps, and outlines scenarios to consider."}
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href={`/wizard?lang=${lang}`} style={{ display: "inline-block", background: cl.ac, color: theme === "dark" ? cl.bg : "#fff", padding: "11px 22px", borderRadius: 10, fontSize: 14, fontWeight: 800, textDecoration: "none" }}>
              {fr ? "Commencer mon Bilan 360 →" : "Start my Bilan 360 →"}
            </Link>
            <button onClick={copyShare} style={{ background: "transparent", color: cl.tx, border: `1px solid ${cl.bd}`, padding: "11px 22px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {fr ? "Partager ce calcul" : "Share this calculation"}
            </button>
          </div>
          {flash ? <div style={{ marginTop: 10, fontSize: 12, color: cl.gn, fontWeight: 700 }}>{flash}</div> : null}
        </section>

        {/* Related links */}
        <div style={{ marginTop: 20, fontSize: 12, color: cl.dm, textAlign: "center", lineHeight: 1.8 }}>
          {fr ? "Voir aussi : " : "See also: "}
          <a href={`/outils/dettes?lang=${lang}`} style={{ color: cl.ac, textDecoration: "none" }}>{fr ? "Calculateur de dettes" : "Debt calculator"}</a>
          {" · "}
          <a href={`/outils/decaissement?lang=${lang}`} style={{ color: cl.ac, textDecoration: "none" }}>{fr ? "Simulateur de décaissement" : "Decumulation simulator"}</a>
        </div>
      </main>
    </div>
  );
}
