"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

// ═══════════════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════════════
const FS = { xxs: 10, xs: 11, sm: 12, base: 13, md: 14, lg: 18, xl: 24, xxl: 30 };
const FW = { normal: 400, medium: 600, bold: 700 };
const SP: Record<number, number> = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24 };
const RAD = { sm: 4, md: 8, lg: 16 };
const CL = { bg: "#242018", cd: "#2c2820", s2: "#353028", bd: "#443e34", bd2: "#5a5348", tx: "#d4cec4", al: "#eee8dd", dm: "#b0a898", ac: "#c4944a", bl: "#5a94c4", gn: "#3d9a5e", rd: "#c45050", or: "#c48a40", go: "#b8a440", pr: "#7a60b0", tl: "#48a898" };

const f$ = (v: number | null | undefined) => { if (v == null || isNaN(v)) return "—"; return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v); };
const f$k = (v: number | null | undefined) => { if (v == null || isNaN(v)) return "—"; const a = Math.abs(v); if (a >= 1e6) return (v < 0 ? "-" : "") + (a / 1e6).toFixed(1) + " M$"; if (a >= 1e3) return (v < 0 ? "-" : "") + Math.round(a / 1e3) + " K$"; return Math.round(v) + " $"; };
const pct = (v: number) => (v * 100).toFixed(1) + "%";
const STORAGE_KEY = "buildfi_bilan_v4";
const uid = () => Math.random().toString(36).substr(2, 8);
function calcPMT(bal: number, rate: number, amYr: number) { if (!bal || bal <= 0 || !amYr) return 0; if (!rate || rate <= 0) return Math.round(bal / (amYr * 12)); const r = rate / 12, n = amYr * 12; return Math.round(bal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)); }

// ═══════════════════════════════════════════════════════
// SAMPLE PROFILE
// ═══════════════════════════════════════════════════════
const SAMPLE_PROFILE = {
  profile: { lang: "fr" },
  accounts: [
    { id: "a1", type: "rrsp", label: "REER — Desjardins", balance: 87500, contribution: 8000, returnRate: 0.055 },
    { id: "a2", type: "tfsa", label: "CELI — Wealthsimple", balance: 42000, contribution: 7000, returnRate: 0.06 },
    { id: "a3", type: "nreg", label: "Non-enregistré — Questrade", balance: 23500, contribution: 3000, returnRate: 0.05 },
    { id: "a4", type: "fhsa", label: "CELIAPP", balance: 8000, contribution: 8000, returnRate: 0.05 },
    { id: "a5", type: "rregop", label: "RREGOP", balance: 62000, contribution: 0, returnRate: 0.04 },
    { id: "a6", type: "savings", label: "CPG — Tangerine", balance: 15000, contribution: 0, returnRate: 0.042 },
  ],
  properties: [
    { id: "p1", label: "Résidence — Sherbrooke", value: 425000, appreciation: 0.03, rentalIncome: 0, isRental: false, mortgage: { balance: 248000, rate: 0.0529, termYears: 3, amortYears: 21, payment: 0, autoCalc: true } },
    { id: "p2", label: "Duplex — Magog", value: 380000, appreciation: 0.025, rentalIncome: 1800, isRental: true, mortgage: { balance: 195000, rate: 0.0579, termYears: 4, amortYears: 23, payment: 0, autoCalc: true } },
  ],
  otherAssets: [{ id: "o1", label: "Honda CR-V 2022", value: 28000, growth: -0.12 }, { id: "o2", label: "Crypto", value: 4500, growth: 0 }],
  debts: [
    { id: "d1", type: "loc", label: "Marge Desjardins", balance: 12000, rate: 0.0795, payment: 400 },
    { id: "d2", type: "auto", label: "Prêt Honda", balance: 18500, rate: 0.0649, termMonths: 48, payment: 440 },
    { id: "d3", type: "card", label: "Visa Infinite", balance: 3200, rate: 0.2099, payment: 200 },
  ],
  income: { salary: 82000, salaryGrowth: 0.025, otherIncome: 0 },
  snapshots: [
    { id: "s1", date: "2025-01-15", note: "Premier bilan", netWorth: 398200, liquid: 210000, totalAssets: 1032000, totalDebts: 468000 },
    { id: "s2", date: "2025-04-12", note: "Après bonus", netWorth: 421800, liquid: 228000, totalAssets: 1058000, totalDebts: 456200 },
    { id: "s3", date: "2025-07-20", note: "Achat duplex Magog", netWorth: 412500, liquid: 218000, totalAssets: 1420000, totalDebts: 640500 },
    { id: "s4", date: "2025-10-05", note: "Marchés en hausse", netWorth: 445100, liquid: 232000, totalAssets: 1455000, totalDebts: 628900 },
    { id: "s5", date: "2026-01-10", note: "Bilan 2026", netWorth: 461500, liquid: 238000, totalAssets: 1470000, totalDebts: 622500 },
  ],
  reminder: { email: "", frequency: "quarterly", enabled: false }
};

// ═══════════════════════════════════════════════════════
// PROJECTION ENGINE
// ═══════════════════════════════════════════════════════
/* eslint-disable @typescript-eslint/no-explicit-any */
function project5Years(data: any, ov?: any) {
  const years = [];
  for (let y = 0; y <= 5; y++) {
    let liq = 0, immo = 0, oth = 0, dbt = 0;
    data.accounts.forEach((a: any) => {
      let c = a.contribution; let r = a.returnRate;
      if (ov?.extraContrib && a.id === ov.targetAccount) c += ov.extraContrib * 12;
      if (ov?.returnOverride != null) r = ov.returnOverride;
      liq += a.balance * Math.pow(1 + r, y) + (r > 0 ? c * ((Math.pow(1 + r, y) - 1) / r) : c * y);
    });
    data.properties.forEach((p: any) => { immo += p.value * Math.pow(1 + p.appreciation, y); });
    (data.otherAssets || []).forEach((a: any) => { oth += (a.value || 0) * Math.pow(1 + (a.growth || 0), y); });
    const amort = (bal: number, rate: number, pmt: number, extra?: number) => {
      if (bal <= 0 || pmt <= 0) return Math.max(0, bal);
      let b = bal; const mr = rate / 12;
      for (let m = 0; m < y * 12 && b > 0; m++) b = Math.max(0, b - Math.max(0, (pmt + (extra||0)) - b * mr));
      return b;
    };
    data.debts.forEach((d: any) => { dbt += amort(d.balance, d.rate, d.payment, ov?.debtExtra || 0); });
    data.properties.forEach((p: any) => {
      if (!p.mortgage?.balance) return;
      const pm = p.mortgage.autoCalc !== false ? calcPMT(p.mortgage.balance, p.mortgage.rate, p.mortgage.amortYears) : p.mortgage.payment;
      dbt += amort(p.mortgage.balance, p.mortgage.rate, pm, 0);
    });
    years.push({ year: y, liquid: Math.round(liq), immo: Math.round(immo), other: Math.round(oth), debt: Math.round(dbt), netWorth: Math.round(liq + immo + oth - dbt) });
  }
  return years;
}

// ═══════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════
function KPI({ label, value, sub, color, trend, quality, tooltip }: any) {
  const [showTip, setShowTip] = useState(false);
  const qc: Record<string, string> = { good: CL.gn, watch: CL.or, bad: CL.rd };
  return (
    <div className="ba-kpi" onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}
      style={{ textAlign: "center", padding: "12px 8px", background: CL.cd, borderRadius: RAD.md, border: `1px solid ${CL.bd}`, borderTop: `3px solid ${color || CL.ac}`, position: "relative", cursor: tooltip ? "help" : "default" }}>
      <div style={{ fontSize: FS.xs, color: CL.dm, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: FW.medium, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: FS.xl, fontWeight: FW.bold, color: color || CL.al, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      {quality && <div style={{ fontSize: FS.xxs, color: qc[quality.level], fontWeight: FW.medium, marginTop: 2 }}>
        {quality.level === "good" ? "●" : quality.level === "watch" ? "◐" : "○"} {quality.text}</div>}
      {sub && <div style={{ fontSize: FS.xs, color: trend === "up" ? CL.gn : trend === "down" ? CL.rd : CL.dm, marginTop: 3, fontWeight: FW.medium }}>
        {trend === "up" ? "▲ " : trend === "down" ? "▼ " : ""}{sub}</div>}
      {tooltip && showTip && <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: "100%", marginTop: 6, background: CL.s2, border: `1px solid ${CL.bd}`, borderRadius: RAD.md, padding: "8px 12px", fontSize: FS.xs, color: CL.tx, lineHeight: 1.6, width: 240, zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.4)", textAlign: "left", pointerEvents: "none" }}>
        {tooltip}</div>}
    </div>
  );
}

function Field({ label, tip, children, half }: any) {
  return (
    <div style={{ marginBottom: SP[3], flex: half ? "1 1 45%" : "1 1 100%", minWidth: half ? 140 : undefined }}>
      <label style={{ fontSize: FS.sm, color: CL.dm, fontWeight: FW.medium, display: "block", marginBottom: 3 }}>
        {label}{tip && <span title={tip} style={{ marginLeft: 4, display: "inline-flex", width: 14, height: 14, borderRadius: "50%", background: "rgba(192,138,78,0.15)", color: CL.ac, fontSize: 9, alignItems: "center", justifyContent: "center", cursor: "help" }}>?</span>}
      </label>{children}
    </div>
  );
}

function PctInput({ value, onChange, presets }: any) {
  const d = value != null ? +(value * 100).toFixed(2) : 0;
  return (<div>
    <div style={{ display: "flex", alignItems: "center", background: CL.bg, border: `1px solid ${CL.bd}`, borderRadius: RAD.sm, overflow: "hidden" }}>
      <input type="number" value={d} onChange={(e: any) => onChange(+e.target.value / 100)} aria-label="Percentage" step={0.1}
        style={{ flex: 1, background: "transparent", border: "none", color: CL.al, fontSize: FS.base, padding: "7px 8px", outline: "none", fontFamily: "'JetBrains Mono'", minWidth: 0, width: "100%" }} />
      <span style={{ padding: "6px 8px", fontSize: FS.sm, color: CL.dm, background: CL.s2, borderLeft: `1px solid ${CL.bd}` }}>%</span>
    </div>
    {presets && <div style={{ display: "flex", gap: 3, marginTop: 3 }}>
      {presets.map((p: any) => <button key={p.v} onClick={() => onChange(p.v)} style={{ padding: "2px 8px", fontSize: FS.xxs, borderRadius: 10, border: `1px solid ${Math.abs(value - p.v) < 0.001 ? CL.ac : CL.bd}`, background: Math.abs(value - p.v) < 0.001 ? CL.ac : "transparent", color: Math.abs(value - p.v) < 0.001 ? CL.bg : CL.dm, cursor: "pointer" }}>{p.label}</button>)}
    </div>}
  </div>);
}

function NumInput({ value, onChange, prefix, type, placeholder, ariaLabel }: any) {
  return (
    <div style={{ display: "flex", alignItems: "center", background: CL.bg, border: `1px solid ${CL.bd}`, borderRadius: RAD.sm, overflow: "hidden" }}>
      {prefix && <span style={{ padding: "6px 8px", fontSize: FS.sm, color: CL.dm, background: CL.s2, borderRight: `1px solid ${CL.bd}`, whiteSpace: "nowrap" }}>{prefix}</span>}
      <input type={type || "number"} value={value} onChange={(e: any) => onChange(type === "text" ? e.target.value : +e.target.value)}
        placeholder={placeholder} aria-label={ariaLabel || "Value"}
        style={{ flex: 1, background: "transparent", border: "none", color: CL.al, fontSize: FS.base, padding: "7px 8px", outline: "none", fontFamily: "'JetBrains Mono'", minWidth: 0, width: "100%" }} />
    </div>
  );
}

function Card({ children, title, icon, color, onRemove, defaultCollapsed, summary }: any) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed || false);
  return (
    <div className="ba-fi" style={{ background: CL.cd, borderRadius: RAD.md, border: `1px solid ${CL.bd}`, borderLeft: `4px solid ${color || CL.ac}`, marginBottom: SP[3], overflow: "hidden" }}>
      {title && (
        <div onClick={() => setCollapsed(!collapsed)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: CL.s2, borderBottom: collapsed ? "none" : `1px solid ${CL.bd}`, cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
            {icon && <span style={{ fontSize: FS.lg }}>{icon}</span>}
            <span style={{ fontSize: FS.md, fontWeight: FW.bold, color: CL.al, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
            {collapsed && summary && <span style={{ fontSize: FS.sm, color: CL.ac, fontFamily: "'JetBrains Mono'", marginLeft: 8 }}>{summary}</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {onRemove && <button onClick={(e: any) => { e.stopPropagation(); onRemove(); }} style={{ background: "none", border: "none", color: CL.rd, cursor: "pointer", fontSize: FS.lg, lineHeight: 1, padding: "2px 6px" }}>×</button>}
            <span style={{ color: CL.dm, fontSize: FS.sm, transform: collapsed ? "rotate(-90deg)" : "rotate(0)", transition: "transform 0.15s", display: "inline-block" }}>▼</span>
          </div>
        </div>
      )}
      <div style={{ maxHeight: collapsed ? 0 : 2000, overflow: "hidden", transition: "max-height 0.25s ease" }}>
        <div style={{ padding: "12px 14px" }}>{children}</div>
      </div>
    </div>
  );
}

function AddButton({ label, onClick }: any) {
  return <button onClick={onClick} style={{ width: "100%", padding: "10px 16px", background: "transparent", border: `1px dashed ${CL.bd2}`, borderRadius: RAD.md, color: CL.ac, fontSize: FS.base, fontWeight: FW.medium, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>+ {label}</button>;
}

function TabBar({ tabs, active, onChange }: any) {
  return (
    <div style={{ display: "flex", gap: 2, padding: "6px 10px", background: CL.cd, borderBottom: `1px solid ${CL.bd}`, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" } as any}>
      <style>{`.ba-tabs::-webkit-scrollbar{display:none}`}</style>
      {tabs.map((t: string, i: number) => (
        <button key={i} onClick={() => onChange(i)} style={{ padding: "7px 12px", borderRadius: RAD.lg, border: "none",
          background: active === i ? CL.ac : "transparent", color: active === i ? CL.bg : CL.dm,
          fontSize: FS.sm, fontWeight: active === i ? FW.bold : FW.medium, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s" }}>{t}</button>
      ))}
    </div>
  );
}

function InfoModal({ show, onClose, fr }: any) {
  const [t, setT] = useState(0);
  if (!show) return null;
  const tabs = fr ? ["Avis", "Portée", "Hypothèses", "Vie privée"] : ["Notice", "Scope", "Assumptions", "Privacy"];
  const content = [
    fr ? "Le Bilan Annuel est un outil de suivi patrimonial à titre informatif seulement. Il ne constitue pas un conseil financier, fiscal ou juridique. Consultez un planificateur financier certifié (Pl. Fin.) pour toute décision importante." : "The Annual Balance Sheet is informational only. Not financial, tax, or legal advice. Consult a certified financial planner.",
    fr ? "Calcule votre valeur nette et projette sur 5 ans (déterministe). NE modélise PAS: fiscalité, CPP/OAS/GIS, mortalité, stress tests, inflation variable." : "Calculates net worth and 5-year deterministic projection. Does NOT model: taxes, CPP/OAS/GIS, mortality, stress tests, variable inflation.",
    fr ? "Rendements fixes annuels. Appréciation immobilière fixe. Amortissement standard. Aucune corrélation. Au-delà de 5 ans → Bilan Pro (5,000 sims MC)." : "Fixed annual returns. Fixed appreciation. Standard amortization. No correlation. Beyond 5 years → Bilan Pro (5,000 MC sims).",
    fr ? "Données stockées localement (localStorage). BuildFi n'y a pas accès. Si rappels activés, seul votre email est stocké. Désabonnement possible en tout temps." : "Data stored locally (localStorage). BuildFi has no access. If reminders enabled, only email is stored. Unsubscribe anytime.",
  ];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: CL.cd, borderRadius: RAD.md + 4, border: `1px solid ${CL.bd}`, maxWidth: 480, width: "100%", maxHeight: "80vh", overflow: "auto" }} onClick={(e: any) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${CL.bd}` }}>
          <span style={{ fontSize: FS.md, fontWeight: FW.bold, color: CL.al }}>Info</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: CL.dm, cursor: "pointer", fontSize: FS.lg }}>×</button>
        </div>
        <div style={{ display: "flex", gap: 2, padding: "8px 12px", borderBottom: `1px solid ${CL.bd}` }}>
          {tabs.map((x: string, i: number) => <button key={i} onClick={() => setT(i)} style={{ padding: "4px 10px", borderRadius: RAD.sm, border: "none", background: t === i ? CL.ac : "transparent", color: t === i ? CL.bg : CL.dm, fontSize: FS.xs, cursor: "pointer" }}>{x}</button>)}
        </div>
        <div style={{ padding: 16, fontSize: FS.sm, color: CL.tx, lineHeight: 1.8 }}>{content[t]}</div>
      </div>
    </div>
  );
}

function SaveModal({ show, onConfirm, onCancel, totals, fr }: any) {
  if (!show) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onCancel}>
      <div className="ba-fi" style={{ background: CL.cd, borderRadius: RAD.md + 4, border: `1px solid ${CL.bd}`, maxWidth: 400, width: "100%", padding: 20 }} onClick={(e: any) => e.stopPropagation()}>
        <div style={{ fontSize: FS.lg, fontWeight: FW.bold, color: CL.al, marginBottom: 12 }}>{fr ? "Confirmer la sauvegarde" : "Confirm save"}</div>
        <div style={{ fontSize: FS.sm, color: CL.dm, marginBottom: 12 }}>{fr ? "Voici ce qui sera sauvegardé:" : "This will be saved:"}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16 }}>
          {[
            { l: fr ? "Valeur nette" : "Net worth", v: f$(totals.netWorth), c: totals.netWorth >= 0 ? CL.gn : CL.rd },
            { l: fr ? "Actifs" : "Assets", v: f$(totals.totalAssets), c: CL.bl },
            { l: fr ? "Passifs" : "Liabilities", v: f$(totals.totalDebts), c: CL.rd },
            { l: fr ? "Endettement" : "Debt ratio", v: pct(totals.debtRatio), c: CL.or },
          ].map((r, i) => (
            <div key={i} style={{ padding: 6, background: CL.s2, borderRadius: RAD.sm, textAlign: "center" }}>
              <div style={{ fontSize: FS.md, fontWeight: FW.bold, color: r.c, fontFamily: "'JetBrains Mono'" }}>{r.v}</div>
              <div style={{ fontSize: FS.xxs, color: CL.dm }}>{r.l}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onConfirm} style={{ flex: 1, padding: "10px", background: CL.ac, color: CL.bg, border: "none", borderRadius: RAD.md, fontSize: FS.sm, fontWeight: FW.bold, cursor: "pointer" }}>
            {fr ? "Sauvegarder" : "Save"}
          </button>
          <button onClick={onCancel} style={{ padding: "10px 16px", background: "transparent", color: CL.dm, border: `1px solid ${CL.bd}`, borderRadius: RAD.md, fontSize: FS.sm, cursor: "pointer" }}>
            {fr ? "Annuler" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Charts
function NetWorthChart({ projection: proj, altProjection: alt, fr }: any) {
  if (!proj || proj.length < 2) return null;
  const W = 680, H = 250, ml = 65, mr = 20, mt = 20, mb = 28, w = W-ml-mr, h = H-mt-mb;
  const av = [...proj.map((p: any) => p.liquid+p.immo+p.other), ...proj.map((p: any) => p.netWorth)];
  if (alt) av.push(...alt.map((p: any) => p.netWorth));
  const mx = Math.max(...av)*1.05, mn = Math.min(0, ...proj.map((p: any) => -p.debt))*1.05, rng = mx-mn||1;
  const yS = (v: number) => mt+h-((v-mn)/rng)*h, xS = (i: number) => ml+(i/(proj.length-1))*w;
  const cats = ["liquid","immo","other"] as const, cols: Record<string, string> = {liquid:CL.bl,immo:CL.gn,other:CL.pr};
  const areas = cats.map((c,ci) => {
    const pts = proj.map((p: any,i: number) => { let sb=0; for(let j=0;j<ci;j++) sb+=proj[i][cats[j]]; return {x:xS(i),yt:yS(sb+p[c]),yb:yS(sb)}; });
    return {d:`M${pts.map((p: any)=>`${p.x},${p.yt}`).join(" L")} L${[...pts].reverse().map((p: any)=>`${p.x},${p.yb}`).join(" L")} Z`,c:cols[c]};
  });
  const nwP = proj.map((p: any,i: number) => `${i===0?"M":"L"}${xS(i)},${yS(p.netWorth)}`).join(" ");
  const altP = alt ? alt.map((p: any,i: number) => `${i===0?"M":"L"}${xS(i)},${yS(p.netWorth)}`).join(" ") : null;
  const lbl: Record<string, string> = {liquid:fr?"Liquide":"Liquid",immo:fr?"Immo":"R.E.",other:fr?"Autres":"Other"};
  return (<div><svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto"}}>
    {[0,.25,.5,.75,1].map(p=>{const v=mn+p*rng;return<g key={p}><line x1={ml} y1={yS(v)} x2={W-mr} y2={yS(v)} stroke={CL.bd} strokeWidth={.5} strokeDasharray="4,4"/><text x={ml-8} y={yS(v)+4} textAnchor="end" fill={CL.dm} fontSize={10} fontFamily="'JetBrains Mono'">{f$k(Math.round(v))}</text></g>})}
    {areas.map((a,i)=><path key={i} d={a.d} fill={a.c} fillOpacity={.2} stroke={a.c} strokeWidth={.8} strokeOpacity={.4}/>)}
    <path d={nwP} fill="none" stroke={CL.ac} strokeWidth={2.5}/>{altP&&<path d={altP} fill="none" stroke={CL.gn} strokeWidth={2} strokeDasharray="6,4"/>}
    {proj.map((p: any,i: number)=><circle key={i} cx={xS(i)} cy={yS(p.netWorth)} r={4} fill={CL.ac} stroke={CL.bg} strokeWidth={2}/>)}
    {alt&&alt.map((p: any,i: number)=><circle key={`a${i}`} cx={xS(i)} cy={yS(p.netWorth)} r={3} fill={CL.gn} stroke={CL.bg} strokeWidth={1.5}/>)}
    {proj.map((_: any,i: number)=><text key={i} x={xS(i)} y={H-6} textAnchor="middle" fill={CL.dm} fontSize={11} fontFamily="'JetBrains Mono'">{i===0?(fr?"Auj.":"Now"):`An ${i}`}</text>)}
  </svg>
  <div style={{display:"flex",justifyContent:"center",gap:12,marginTop:4,flexWrap:"wrap",fontSize:FS.xs}}>
    {cats.map(c=><div key={c} style={{display:"flex",alignItems:"center",gap:4,color:CL.dm}}><div style={{width:10,height:10,borderRadius:2,background:cols[c],opacity:.6}}/>{lbl[c]}</div>)}
    <div style={{display:"flex",alignItems:"center",gap:4,color:CL.ac}}><div style={{width:16,height:2,background:CL.ac}}/>{fr?"Valeur nette":"Net worth"}</div>
    {alt&&<div style={{display:"flex",alignItems:"center",gap:4,color:CL.gn}}><div style={{width:16,height:2,background:CL.gn,borderTop:"1px dashed"}}/>{fr?"Scénario":"What-if"}</div>}
  </div></div>);
}

function SnapChart({ snaps, fr }: any) {
  if (!snaps || snaps.length < 2) return null;
  const W=680,H=200,ml=65,mr=20,mt=15,mb=35,w=W-ml-mr,h=H-mt-mb;
  const mx=Math.max(...snaps.map((s: any)=>s.netWorth))*1.08, mn=Math.min(...snaps.map((s: any)=>s.netWorth),0)*.95, rng=mx-mn||1;
  const yS=(v: number)=>mt+h-((v-mn)/rng)*h, xS=(i: number)=>ml+(i/Math.max(1,snaps.length-1))*w;
  const path=snaps.map((s: any,i: number)=>`${i===0?"M":"L"}${xS(i)},${yS(s.netWorth)}`).join(" ");
  return (<svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto"}}>
    {[0,.5,1].map(p=>{const v=mn+p*rng;return<g key={p}><line x1={ml} y1={yS(v)} x2={W-mr} y2={yS(v)} stroke={CL.bd} strokeWidth={.5} strokeDasharray="4,4"/><text x={ml-8} y={yS(v)+4} textAnchor="end" fill={CL.dm} fontSize={10} fontFamily="'JetBrains Mono'">{f$k(Math.round(v))}</text></g>})}
    <path d={path+` L${xS(snaps.length-1)},${yS(mn)} L${xS(0)},${yS(mn)} Z`} fill={CL.gn} fillOpacity={.08}/>
    <path d={path} fill="none" stroke={CL.gn} strokeWidth={2}/>
    {snaps.map((s: any,i: number)=>{const up=i===0||s.netWorth>=snaps[i-1].netWorth;
      return<g key={i}><circle cx={xS(i)} cy={yS(s.netWorth)} r={5} fill={up?CL.gn:CL.rd} stroke={CL.bg} strokeWidth={2}/>
        <text x={xS(i)} y={H-6} textAnchor="middle" fill={CL.dm} fontSize={8} fontFamily="'JetBrains Mono'">{s.date?.substring(5)}</text>
        <text x={xS(i)} y={yS(s.netWorth)-10} textAnchor="middle" fill={CL.al} fontSize={9} fontWeight={600} fontFamily="'JetBrains Mono'">{f$k(s.netWorth)}</text></g>})}
  </svg>);
}

const ACC_TYPES = [{key:"rrsp",label:"REER",icon:"🏦",color:CL.bl},{key:"tfsa",label:"CELI",icon:"🛡️",color:CL.gn},{key:"nreg",label:"Non-enregistré",icon:"📈",color:CL.pr},{key:"fhsa",label:"CELIAPP",icon:"🏠",color:CL.tl},{key:"lira",label:"CRI",icon:"🔒",color:CL.or},{key:"rregop",label:"RREGOP/RPD",icon:"🏛️",color:CL.go},{key:"savings",label:"Épargne/CPG",icon:"💰",color:CL.dm}];
const DEBT_TYPES = [{key:"loc",label:"Marge de crédit",icon:"💳",color:CL.or,hasTerm:false},{key:"auto",label:"Prêt auto",icon:"🚗",color:CL.bl,hasTerm:true},{key:"card",label:"Carte de crédit",icon:"💳",color:CL.rd,hasTerm:false},{key:"student",label:"Prêt étudiant",icon:"🎓",color:CL.pr,hasTerm:true},{key:"other",label:"Autre",icon:"📄",color:CL.dm,hasTerm:true}];
const RET_PRESETS = [{v:.03,label:"Prudent 3%"},{v:.05,label:"Équilibré 5%"},{v:.07,label:"Croissance 7%"}];

// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════
export default function BilanAnnuel() {
  // ALL HOOKS MUST BE BEFORE ANY CONDITIONAL RETURN
  const [data, setData] = useState(() => {
    if (typeof window === "undefined") return JSON.parse(JSON.stringify(SAMPLE_PROFILE));
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...JSON.parse(JSON.stringify(SAMPLE_PROFILE)), ...parsed };
      }
      return JSON.parse(JSON.stringify(SAMPLE_PROFILE));
    } catch {
      return JSON.parse(JSON.stringify(SAMPLE_PROFILE));
    }
  });
  const [tab, setTab] = useState(-1);
  const [showInfo, setShowInfo] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [whatIf, setWhatIf] = useState({ mode:"contrib", active:false, targetAccount:"", extraContrib:200, debtExtra:100, returnOverride:0.04 });
  const [saveNote, setSaveNote] = useState("");
  const [showReminder, setShowReminder] = useState(false);
  const [reminderEmail, setReminderEmail] = useState(data.reminder?.email||"");
  const [express, setExpress] = useState({ age: 42, province: "QC", salary: 70000, rrsp: 45000, tfsa: 22000, home: 400000, mortgage: 200000, debtsTotal: 15000, savingsMonthly: 1000 });
  const [expressDone, setExpressDone] = useState(false);
  const [tabKey, setTabKey] = useState(0);

  const changeTab = useCallback((i: number) => { setTab(i); setTabKey(k => k+1); }, []);

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* quota */ } }, [data]);

  const up = useCallback((path: string, val: any) => { setData((prev: any) => { const n=JSON.parse(JSON.stringify(prev)); const p=path.split("."); let o=n; for(let i=0;i<p.length-1;i++) o=o[p[i]]; o[p[p.length-1]]=val; return n; }); }, []);
  const upItem = useCallback((col: string, id: string, field: string, val: any) => { setData((prev: any) => { const n=JSON.parse(JSON.stringify(prev)); const it=n[col].find((i: any)=>i.id===id); if(it){const p=field.split(".");let o=it;for(let i=0;i<p.length-1;i++)o=o[p[i]];o[p[p.length-1]]=val;} return n; }); }, []);
  const addItem = useCallback((col: string, it: any) => setData((p: any) => ({...p,[col]:[...p[col],it]})), []);
  const rmItem = useCallback((col: string, id: string) => setData((p: any) => ({...p,[col]:p[col].filter((i: any)=>i.id!==id)})), []);

  const totals = useMemo(() => {
    const liq=data.accounts.reduce((s: number,a: any)=>s+(a.balance||0),0), ig=data.properties.reduce((s: number,p: any)=>s+(p.value||0),0),
      mort=data.properties.reduce((s: number,p: any)=>s+(p.mortgage?.balance||0),0), oth=(data.otherAssets||[]).reduce((s: number,a: any)=>s+(a.value||0),0),
      dbt=data.debts.reduce((s: number,d: any)=>s+(d.balance||0),0), ta=liq+ig+oth, td=dbt+mort;
    return {liquid:liq,immoGross:ig,mortgages:mort,other:oth,debts:dbt,totalAssets:ta,totalDebts:td,netWorth:ta-td,debtRatio:ta>0?td/ta:0,liquidRatio:td>0?liq/td:Infinity};
  }, [data]);
  const proj = useMemo(() => project5Years(data), [data]);
  const altProj = useMemo(() => {
    if (!whatIf.active) return null;
    if (whatIf.mode==="contrib"&&whatIf.targetAccount) return project5Years(data,{extraContrib:whatIf.extraContrib,targetAccount:whatIf.targetAccount});
    if (whatIf.mode==="debt") return project5Years(data,{debtExtra:whatIf.debtExtra});
    if (whatIf.mode==="return") return project5Years(data,{returnOverride:whatIf.returnOverride});
    return null;
  }, [data, whatIf]);
  const fr = data.profile?.lang !== "en";
  const tabs = fr ? ["Portrait","Actifs","Passifs","Revenus","Projection","Évolution","Réglages"] : ["Dashboard","Assets","Liabilities","Income","Projection","History","Settings"];

  const expressNetWorth = useMemo(() => {
    const assets = express.rrsp + express.tfsa + express.home;
    const liabilities = express.mortgage + express.debtsTotal;
    return assets - liabilities;
  }, [express]);

  const expressProjection = useMemo(() => {
    const r = 0.05;
    const appreciation = 0.03;
    const years = [];
    for (let y = 0; y <= 5; y++) {
      const liquid = (express.rrsp + express.tfsa) * Math.pow(1 + r, y) + (r > 0 ? express.savingsMonthly * 12 * ((Math.pow(1 + r, y) - 1) / r) : express.savingsMonthly * 12 * y);
      const immo = express.home * Math.pow(1 + appreciation, y);
      let mort = express.mortgage;
      if (mort > 0) { const mr = 0.055 / 12; const pmt = mort * (mr * Math.pow(1+mr, 300)) / (Math.pow(1+mr, 300) - 1); for (let m = 0; m < y*12 && mort > 0; m++) mort = Math.max(0, mort - Math.max(0, pmt - mort * mr)); }
      let dbt = express.debtsTotal;
      if (dbt > 0) { const pmt = dbt * 0.03; for (let m = 0; m < y*12 && dbt > 0; m++) dbt = Math.max(0, dbt - Math.max(0, pmt - dbt * (0.08/12))); }
      years.push({ year: y, liquid: Math.round(liquid), immo: Math.round(immo), other: 0, debt: Math.round(mort + dbt), netWorth: Math.round(liquid + immo - mort - dbt) });
    }
    return years;
  }, [express]);

  const expressDebtRatio = useMemo(() => {
    const assets = express.rrsp + express.tfsa + express.home;
    return assets > 0 ? (express.mortgage + express.debtsTotal) / assets : 0;
  }, [express]);

  const doSave = () => {
    const snap = {id:uid(),date:new Date().toISOString().split("T")[0],note:saveNote,...totals};
    setData((p: any) => ({...p,snapshots:[...p.snapshots,snap]}));
    setSaveNote(""); setShowSaveConfirm(false); setShowReminder(true);
    trackEvent("ba_snapshot_saved", { netWorth: totals.netWorth, snapshotCount: (data.snapshots?.length || 0) + 1 });
  };

  const storageUsed = useMemo(() => { if (typeof window === "undefined") return "0"; try { const s = localStorage.getItem(STORAGE_KEY); return s ? (new Blob([s]).size / 1024).toFixed(1) : "0"; } catch { return "?"; } }, [data]);

  // BA-SEC-06: localStorage quota check
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const used = new Blob([localStorage.getItem(STORAGE_KEY) || ""]).size;
      if (used > 4.5 * 1024 * 1024) setStorageError(fr ? "Stockage presque plein. Exportez vos données." : "Storage almost full. Export your data.");
      else setStorageError("");
    } catch { setStorageError(fr ? "Erreur de stockage" : "Storage error"); }
  }, [data, fr]);

  // BA-SEC-01: Cookie consent (Law 25)
  const [showConsent, setShowConsent] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("buildfi_consent")) setShowConsent(true);
  }, []);
  const acceptConsent = useCallback(() => {
    localStorage.setItem("buildfi_consent", "yes");
    setShowConsent(false);
    // BA-SEC-02: Init PostHog after consent
    if (typeof window !== "undefined" && (window as any).__bf_consentGranted) (window as any).__bf_consentGranted();
  }, []);
  const declineConsent = useCallback(() => {
    localStorage.setItem("buildfi_consent", "no");
    setShowConsent(false);
  }, []);

  // BA-SEC-02: PostHog tracking helper
  const trackEvent = useCallback((name: string, props?: Record<string, any>) => {
    try {
      if (typeof window !== "undefined" && localStorage.getItem("buildfi_consent") === "yes" && (window as any).posthog) {
        (window as any).posthog.capture(name, props);
      }
    } catch { /* silent */ }
  }, []);

  // Track tab changes
  useEffect(() => { if (tab >= 0) trackEvent("ba_tab_change", { tab: tabs[tab] }); }, [tab, tabs, trackEvent]);

  // BA-SEC-05: XSS sanitize for text labels
  const sanitize = (s: string) => typeof s === "string" ? s.replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c] || c)) : s;

  // ═══════════════════════════════════════════════════
  // WELCOME SCREEN (tab === -1)
  // ═══════════════════════════════════════════════════
  if (tab === -1) return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", background:CL.bg, color:CL.tx, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <style>{`.ba-fi{animation:bafi .3s ease both}@keyframes bafi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div className="ba-fi" style={{ maxWidth:480, textAlign:"center" }}>
        <div style={{ width:56,height:56,borderRadius:14,background:`linear-gradient(135deg,${CL.ac},#d4a856)`,margin:"0 auto 16px",display:"flex",alignItems:"center",justifyContent:"center" }}>
          <svg viewBox="0 0 24 24" width={28} height={28} fill="none" stroke="#1a1a2e" strokeWidth={2}><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-5"/></svg>
        </div>
        <h1 style={{ fontSize:28,fontWeight:FW.bold,color:CL.al,marginBottom:8 }}>{fr?"Bilan Annuel":"Balance Sheet"}</h1>
        <div style={{ fontSize:FS.sm,color:CL.ac,fontWeight:FW.medium,letterSpacing:1,textTransform:"uppercase",marginBottom:20 }}>buildfi.ca</div>
        <p style={{ fontSize:FS.md,color:CL.tx,lineHeight:1.7,marginBottom:20 }}>
          {fr?"En 5 minutes, un portrait complet de votre patrimoine et une projection sur 5 ans. Gratuit. Privé.":"In 5 minutes, a complete net worth picture and 5-year projection. Free. Private."}
        </p>
        <div style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:20,background:"rgba(61,154,94,0.1)",border:"1px solid rgba(61,154,94,0.25)",marginBottom:24 }}>
          <span>🔒</span><span style={{ fontSize:FS.xs,color:CL.gn,fontWeight:FW.medium }}>{fr?"Données sur votre appareil seulement":"Data on your device only"}</span>
        </div>
        <div style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"4px 12px",borderRadius:20,background:"rgba(192,138,78,0.08)",border:"1px solid rgba(192,138,78,0.15)",marginBottom:24,marginLeft:8 }}>
          <span style={{ fontSize:FS.xs,color:CL.ac,fontWeight:FW.medium }}>✓ {fr?"Moteur validé — 453 tests":"Engine validated — 453 tests"}</span>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
          <button onClick={() => changeTab(-2)}
            style={{ padding:"14px 28px",background:CL.ac,color:CL.bg,border:"none",borderRadius:RAD.md,fontSize:FS.md,fontWeight:FW.bold,cursor:"pointer" }}>
            {fr ? "Mode express (60 secondes)" : "Express mode (60 seconds)"}
          </button>
          <button onClick={() => {
            const empty = JSON.parse(JSON.stringify(SAMPLE_PROFILE));
            empty.accounts = []; empty.properties = []; empty.otherAssets = []; empty.debts = []; empty.snapshots = [];
            empty.income = { salary: 0, salaryGrowth: 0.025, otherIncome: 0 };
            setData(empty);
            changeTab(1);
          }}
            style={{ padding:"10px 28px",background:"transparent",color:CL.ac,border:`1px solid ${CL.ac}`,borderRadius:RAD.md,fontSize:FS.sm,fontWeight:FW.medium,cursor:"pointer" }}>
            {fr ? "Mode complet (tous les détails)" : "Full mode (all details)"}
          </button>
          <button onClick={() => {
            const sample = JSON.parse(JSON.stringify(SAMPLE_PROFILE));
            setData(sample);
            changeTab(0);
          }} style={{ padding:"8px 28px",background:"transparent",color:CL.dm,border:`1px solid ${CL.bd}`,borderRadius:RAD.md,fontSize:FS.xs,cursor:"pointer" }}>
            {fr ? "Voir le profil exemple (Marie-Ève & Julien)" : "See sample profile"}
          </button>
        </div>
        <div style={{ marginTop:16,fontSize:FS.xs,color:CL.dm,lineHeight:1.6 }}>
          {fr ? "Express: 6 champs → résultat immédiat → raffinez ensuite" : "Express: 6 fields → instant result → refine later"}
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════
  // EXPRESS MODE (tab === -2)
  // ═══════════════════════════════════════════════════
  if (tab === -2) return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", background:CL.bg, color:CL.tx, minHeight:"100vh", padding: 24 }}>
      <style>{`.ba-fi{animation:bafi .3s ease both}@keyframes bafi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        {!expressDone ? (
          <div className="ba-fi">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${CL.ac},#d4a856)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="#1a1a2e" strokeWidth={2}><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-5"/></svg>
              </div>
              <div>
                <div style={{ fontSize: FS.lg, fontWeight: FW.bold, color: CL.al }}>{fr ? "Mode express" : "Express mode"}</div>
                <div style={{ fontSize: FS.xs, color: CL.dm }}>{fr ? "6 champs. 60 secondes. Résultat immédiat." : "6 fields. 60 seconds. Instant result."}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP[3] }}>
              <Field label={fr ? "Âge" : "Age"}>
                <NumInput value={express.age} onChange={(v: number) => setExpress(p => ({...p, age: v}))} ariaLabel="Age" />
              </Field>
              <Field label="Province">
                <select value={express.province} onChange={(e: any) => setExpress(p => ({...p, province: e.target.value}))} aria-label="Province"
                  style={{ width: "100%", background: CL.bg, border: `1px solid ${CL.bd}`, borderRadius: RAD.sm, color: CL.al, fontSize: FS.base, padding: "7px 8px" }}>
                  {["QC","ON","BC","AB","SK","MB","NB","NS","PE","NL","NT","YT","NU"].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label={fr ? "Revenu annuel brut" : "Annual gross income"}>
                <NumInput value={express.salary} onChange={(v: number) => setExpress(p => ({...p, salary: v}))} prefix="$" ariaLabel="Salary" />
              </Field>
              <Field label={fr ? "Épargne mensuelle" : "Monthly savings"} tip={fr ? "REER + CELI + autre" : "RRSP + TFSA + other"}>
                <NumInput value={express.savingsMonthly} onChange={(v: number) => setExpress(p => ({...p, savingsMonthly: v}))} prefix="$" ariaLabel="Monthly savings" />
              </Field>
              <Field label={fr ? "REER total" : "RRSP total"}>
                <NumInput value={express.rrsp} onChange={(v: number) => setExpress(p => ({...p, rrsp: v}))} prefix="$" ariaLabel="RRSP" />
              </Field>
              <Field label={fr ? "CELI total" : "TFSA total"}>
                <NumInput value={express.tfsa} onChange={(v: number) => setExpress(p => ({...p, tfsa: v}))} prefix="$" ariaLabel="TFSA" />
              </Field>
              <Field label={fr ? "Valeur de la maison" : "Home value"} tip={fr ? "0 si locataire" : "0 if renting"}>
                <NumInput value={express.home} onChange={(v: number) => setExpress(p => ({...p, home: v}))} prefix="$" ariaLabel="Home value" />
              </Field>
              <Field label={fr ? "Solde hypothèque" : "Mortgage balance"}>
                <NumInput value={express.mortgage} onChange={(v: number) => setExpress(p => ({...p, mortgage: v}))} prefix="$" ariaLabel="Mortgage" />
              </Field>
              <Field label={fr ? "Autres dettes (total)" : "Other debts (total)"} tip={fr ? "Cartes, marge, auto, etc." : "Cards, LOC, car, etc."}>
                <NumInput value={express.debtsTotal} onChange={(v: number) => setExpress(p => ({...p, debtsTotal: v}))} prefix="$" ariaLabel="Total debts" />
              </Field>
            </div>

            <button onClick={() => setExpressDone(true)}
              style={{ width: "100%", padding: "14px", background: CL.ac, color: CL.bg, border: "none", borderRadius: RAD.md, fontSize: FS.md, fontWeight: FW.bold, cursor: "pointer", marginTop: SP[4] }}>
              {fr ? "Voir mon portrait" : "See my portrait"}
            </button>

            <div style={{ marginTop: SP[3], textAlign: "center" }}>
              <button onClick={() => changeTab(-1)} style={{ background: "none", border: "none", color: CL.dm, cursor: "pointer", fontSize: FS.xs, textDecoration: "underline" }}>
                {fr ? "← Retour" : "← Back"}
              </button>
            </div>
          </div>
        ) : (
          /* EXPRESS RESULTS */
          <div className="ba-fi">
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: FS.sm, color: CL.ac, fontWeight: FW.medium, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
                {fr ? "Votre portrait express" : "Your express portrait"}
              </div>
              <div style={{ fontSize: 36, fontWeight: FW.bold, color: expressNetWorth >= 0 ? CL.gn : CL.rd, fontFamily: "'JetBrains Mono', monospace" }}>
                {f$(expressNetWorth)}
              </div>
              <div style={{ fontSize: FS.sm, color: CL.dm }}>{fr ? "Valeur nette estimée" : "Estimated net worth"}</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: SP[2], marginBottom: SP[4] }}>
              <KPI label={fr ? "Actifs" : "Assets"} value={f$(express.rrsp + express.tfsa + express.home)} color={CL.bl} />
              <KPI label={fr ? "Passifs" : "Liabilities"} value={f$(express.mortgage + express.debtsTotal)} color={CL.rd} />
              <KPI label={fr ? "Endettement" : "Debt ratio"} value={pct(expressDebtRatio)}
                color={expressDebtRatio > 0.5 ? CL.rd : expressDebtRatio > 0.3 ? CL.or : CL.gn}
                quality={expressDebtRatio <= 0.3 ? { level: "good", text: fr ? "Sain" : "Healthy" } :
                  expressDebtRatio <= 0.5 ? { level: "watch", text: fr ? "À surveiller" : "Watch" } :
                    { level: "bad", text: fr ? "Élevé" : "High" }} />
            </div>

            <Card title={fr ? "Projection 5 ans (simplifiée)" : "5-Year Projection (simplified)"} icon="📈" color={CL.ac}>
              <div style={{ padding: "8px 12px", background: "rgba(192,138,78,0.06)", borderRadius: RAD.sm, marginBottom: SP[3], fontSize: FS.sm, color: CL.al, lineHeight: 1.6 }}>
                {fr ? `Votre valeur nette pourrait passer de ${f$(expressProjection[0]?.netWorth)} à ${f$(expressProjection[5]?.netWorth)} en 5 ans `
                  : `Your net worth could go from ${f$(expressProjection[0]?.netWorth)} to ${f$(expressProjection[5]?.netWorth)} in 5 years `}
                <strong style={{ color: CL.gn }}>({f$(expressProjection[5]?.netWorth - expressProjection[0]?.netWorth)})</strong>
              </div>
              <NetWorthChart projection={expressProjection} fr={fr} />
              <div style={{ fontSize: FS.xxs, color: CL.dm, marginTop: SP[2], fontStyle: "italic" }}>
                {fr ? "Hypothèses: rendement 5%, appréciation 3%, hypothèque 5.5%, 25 ans amort." : "Assumptions: 5% return, 3% appreciation, 5.5% mortgage, 25yr amort."}
              </div>
            </Card>

            <div style={{ display: "grid", gap: SP[2], marginBottom: SP[4] }}>
              {express.debtsTotal > 0 && express.debtsTotal > express.rrsp * 0.3 && (
                <div style={{ padding: "10px 14px", background: CL.s2, borderRadius: RAD.md, borderLeft: `4px solid ${CL.or}`, fontSize: FS.sm, color: CL.tx, lineHeight: 1.6 }}>
                  {fr ? `Vos dettes de ${f$(express.debtsTotal)} représentent ${pct(express.debtsTotal / (express.rrsp + express.tfsa))} de vos placements liquides. Un plan de remboursement structuré pourrait accélérer votre progression.`
                    : `Your ${f$(express.debtsTotal)} debt is ${pct(express.debtsTotal / (express.rrsp + express.tfsa))} of your liquid savings. A structured repayment plan could accelerate your progress.`}
                </div>
              )}
              {express.savingsMonthly > 0 && (
                <div style={{ padding: "10px 14px", background: CL.s2, borderRadius: RAD.md, borderLeft: `4px solid ${CL.gn}`, fontSize: FS.sm, color: CL.tx, lineHeight: 1.6 }}>
                  {fr ? `À ${f$(express.savingsMonthly)}/mois, vous ajoutez ${f$(express.savingsMonthly * 12)}/an à votre patrimoine. En 5 ans, ça représente ~${f$(Math.round(express.savingsMonthly * 12 * 5 * 1.15))} avec rendements.`
                    : `At ${f$(express.savingsMonthly)}/mo, you add ${f$(express.savingsMonthly * 12)}/yr. In 5 years, that's ~${f$(Math.round(express.savingsMonthly * 12 * 5 * 1.15))} with returns.`}
                </div>
              )}
              {expressDebtRatio > 0.5 && (
                <div style={{ padding: "10px 14px", background: CL.s2, borderRadius: RAD.md, borderLeft: `4px solid ${CL.rd}`, fontSize: FS.sm, color: CL.tx, lineHeight: 1.6 }}>
                  {fr ? "Votre ratio d'endettement dépasse 50%. Les planificateurs visent généralement sous 35%." : "Your debt ratio exceeds 50%. Planners generally aim below 35%."}
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: SP[2] }}>
              <button onClick={() => {
                const fresh = JSON.parse(JSON.stringify(SAMPLE_PROFILE));
                fresh.accounts = [
                  { id: uid(), type: "rrsp", label: "REER", balance: express.rrsp, contribution: Math.round(express.savingsMonthly * 12 * 0.6), returnRate: 0.055 },
                  { id: uid(), type: "tfsa", label: "CELI", balance: express.tfsa, contribution: Math.round(express.savingsMonthly * 12 * 0.4), returnRate: 0.06 },
                ];
                fresh.properties = express.home > 0 ? [{ id: uid(), label: fr ? "Résidence principale" : "Primary residence", value: express.home, appreciation: 0.03, rentalIncome: 0, isRental: false, mortgage: { balance: express.mortgage, rate: 0.055, termYears: 5, amortYears: 25, payment: 0, autoCalc: true } }] : [];
                fresh.debts = express.debtsTotal > 0 ? [{ id: uid(), type: "loc", label: fr ? "Dettes consolidées" : "Consolidated debts", balance: express.debtsTotal, rate: 0.08, payment: Math.round(express.debtsTotal * 0.03) }] : [];
                fresh.income = { salary: express.salary, salaryGrowth: 0.025, otherIncome: 0 };
                fresh.otherAssets = [];
                fresh.snapshots = [];
                setData(fresh);
                setExpressDone(false);
                changeTab(0);
              }}
                style={{ padding: "14px", background: CL.ac, color: CL.bg, border: "none", borderRadius: RAD.md, fontSize: FS.md, fontWeight: FW.bold, cursor: "pointer" }}>
                {fr ? "Raffiner mon portrait (mode complet)" : "Refine my portrait (full mode)"}
              </button>

              <div style={{ padding: "16px", background: "linear-gradient(135deg,rgba(192,138,78,0.08),rgba(192,138,78,0.02))", borderRadius: RAD.md + 2, border: `1px solid rgba(192,138,78,0.2)`, textAlign: "center" }}>
                <div style={{ fontSize: FS.md, fontWeight: FW.bold, color: CL.ac, marginBottom: 4 }}>
                  {fr ? "Cette projection est simplifiée." : "This is a simplified projection."}
                </div>
                <div style={{ fontSize: FS.xs, color: CL.dm, lineHeight: 1.6, marginBottom: 8 }}>
                  {fr ? "Elle ne teste pas les crashs, l'inflation, la fiscalité ni les revenus gouvernementaux. Le Bilan Pro teste votre situation dans 5,000 scénarios réalistes."
                    : "It doesn't test crashes, inflation, taxes, or government income. Bilan Pro tests 5,000 realistic scenarios."}
                </div>
                <button style={{ padding: "10px 24px", background: CL.ac, color: CL.bg, border: "none", borderRadius: RAD.sm, fontSize: FS.sm, fontWeight: FW.bold, cursor: "pointer" }}>
                  {fr ? "Bilan Pro — 19,99 $" : "Bilan Pro — $19.99"}
                </button>
              </div>

              <button onClick={() => { setExpressDone(false); changeTab(-2); }}
                style={{ padding: "8px", background: "transparent", color: CL.dm, border: `1px solid ${CL.bd}`, borderRadius: RAD.sm, fontSize: FS.xs, cursor: "pointer" }}>
                {fr ? "← Modifier mes chiffres" : "← Edit my numbers"}
              </button>
            </div>

            <div style={{ marginTop: SP[4], textAlign: "center", fontSize: FS.xxs, color: CL.dm }}>
              {fr ? "Projection déterministe simplifiée. Ne constitue pas un conseil financier." : "Simplified deterministic projection. Not financial advice."}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════
  // MODALS
  // ═══════════════════════════════════════════════════
  const reminderModal = showReminder && (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
      <div className="ba-fi" style={{ background:CL.cd,borderRadius:RAD.md+4,border:`1px solid ${CL.bd}`,maxWidth:420,width:"100%",padding:24 }}>
        <div style={{ fontSize:FS.lg,fontWeight:FW.bold,color:CL.al,marginBottom:4 }}>{fr?"Bilan sauvegardé!":"Saved!"}</div>
        <div style={{ fontSize:FS.sm,color:CL.dm,marginBottom:16 }}>{fr?"Rappel de mise à jour?":"Update reminder?"}</div>
        <div style={{ display:"flex",gap:6,marginBottom:12 }}>
          {([["quarterly",fr?"Trimestriel":"Quarterly"],["annual",fr?"Annuel":"Annual"]] as const).map(([v,l])=>
            <button key={v} onClick={()=>up("reminder.frequency",v)} style={{ flex:1,padding:"6px 10px",borderRadius:RAD.sm,border:`1px solid ${data.reminder?.frequency===v?CL.ac:CL.bd}`,background:data.reminder?.frequency===v?CL.ac:"transparent",color:data.reminder?.frequency===v?CL.bg:CL.dm,fontSize:FS.sm,fontWeight:FW.bold,cursor:"pointer" }}>{l}</button>)}
        </div>
        <input type="email" value={reminderEmail} onChange={(e: any)=>setReminderEmail(e.target.value)} placeholder={fr?"votre@courriel.ca":"your@email.ca"} aria-label="Email"
          style={{ width:"100%",background:CL.bg,border:`1px solid ${CL.bd}`,borderRadius:RAD.sm,color:CL.al,fontSize:FS.sm,padding:"8px 10px",outline:"none",marginBottom:12,boxSizing:"border-box" }}/>
        <div style={{ display:"flex",gap:8 }}>
          <button onClick={()=>{up("reminder",{email:reminderEmail,frequency:data.reminder?.frequency||"quarterly",enabled:true});setShowReminder(false);fetch("/api/ba-reminder/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:reminderEmail,frequency:data.reminder?.frequency||"quarterly",lang:fr?"fr":"en"})}).catch(()=>{});trackEvent("ba_reminder_subscribe",{frequency:data.reminder?.frequency||"quarterly"});}}
            style={{ flex:1,padding:"10px",background:CL.ac,color:CL.bg,border:"none",borderRadius:RAD.md,fontSize:FS.sm,fontWeight:FW.bold,cursor:"pointer" }}>{fr?"Activer":"Enable"}</button>
          <button onClick={()=>setShowReminder(false)} style={{ padding:"10px 16px",background:"transparent",color:CL.dm,border:`1px solid ${CL.bd}`,borderRadius:RAD.md,fontSize:FS.sm,cursor:"pointer" }}>{fr?"Non merci":"Skip"}</button>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════
  // TAB RENDERERS
  // ═══════════════════════════════════════════════════
  function renderPortrait() {
    const ls = data.snapshots?.[data.snapshots.length-1]; const nd = ls ? totals.netWorth-ls.netWorth : null;
    return (<div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:SP[2],marginBottom:SP[5] }}>
        {[
          { l:fr?"Valeur nette":"Net worth", v:f$(totals.netWorth), c:totals.netWorth>=0?CL.gn:CL.rd, sub:nd!=null?`${nd>=0?"+":""}${f$(nd)}`:undefined, trend:nd!=null?(nd>0?"up":nd<0?"down":undefined):undefined,
            tip:fr?"Actifs totaux moins passifs totaux. C'est votre richesse réelle.":"Total assets minus total liabilities. Your real wealth." },
          { l:fr?"Actifs":"Assets", v:f$(totals.totalAssets), c:CL.bl, tip:fr?"Somme de vos comptes, propriétés et autres actifs.":"Sum of accounts, properties, and other assets." },
          { l:fr?"Passifs":"Liabilities", v:f$(totals.totalDebts), c:CL.rd, tip:fr?"Hypothèques + dettes. Total de vos obligations.":"Mortgages + debts. What you owe." },
          { l:fr?"Endettement":"Debt ratio", v:pct(totals.debtRatio), c:totals.debtRatio>.5?CL.rd:totals.debtRatio>.3?CL.or:CL.gn,
            quality:totals.debtRatio<=.3?{level:"good",text:fr?"Sain (<30%)":"Healthy (<30%)"}:totals.debtRatio<=.5?{level:"watch",text:fr?"À surveiller":"Watch (30-50%)"}:{level:"bad",text:fr?"Élevé (>50%)":"High (>50%)"},
            tip:fr?"Passifs ÷ actifs. Sous 30% = sain. Au-dessus de 50% = élevé.":"Liabilities ÷ assets. Below 30% = healthy. Above 50% = high." },
          { l:fr?"Cotisations/an":"Savings/yr", v:f$(data.accounts.reduce((s: number,a: any)=>s+(a.contribution||0),0)), c:CL.ac, tip:fr?"Total annuel de vos cotisations planifiées.":"Total planned annual contributions." },
        ].map((k,i) => <div key={i} style={{ animationDelay:`${i*60}ms` }}><KPI {...k} tooltip={k.tip} /></div>)}
      </div>

      <Card title={fr?"Projection 5 ans":"5-Year Projection"} icon="📈" color={CL.ac}>
        <div style={{ padding:"8px 12px",background:"rgba(192,138,78,0.06)",borderRadius:RAD.sm,marginBottom:SP[3],fontSize:FS.sm,color:CL.al,lineHeight:1.6 }}>
          {fr?`Valeur nette: ${f$(proj[0]?.netWorth)} → ${f$(proj[5]?.netWorth)} en 5 ans `:`Net worth: ${f$(proj[0]?.netWorth)} → ${f$(proj[5]?.netWorth)} in 5 years `}
          <strong style={{color:CL.gn}}>({f$(proj[5]?.netWorth-proj[0]?.netWorth)})</strong>
        </div>
        <NetWorthChart projection={proj} fr={fr} />
      </Card>

      <div style={{ display:"flex",gap:SP[2],alignItems:"center",marginTop:SP[3] }}>
        <input type="text" value={saveNote} onChange={(e: any)=>setSaveNote(e.target.value)} placeholder={fr?"Note (ex: après bonus...)":"Note (e.g. after bonus...)"} aria-label="Note"
          style={{ flex:1,background:CL.bg,border:`1px solid ${CL.bd}`,borderRadius:RAD.sm,color:CL.al,fontSize:FS.sm,padding:"10px 12px",outline:"none" }}/>
        <button onClick={()=>setShowSaveConfirm(true)} style={{ padding:"10px 20px",background:CL.ac,color:CL.bg,border:"none",borderRadius:RAD.md,fontSize:FS.sm,fontWeight:FW.bold,cursor:"pointer",whiteSpace:"nowrap" }}>
          {fr?"Sauvegarder":"Save"}
        </button>
      </div>

      {ls && <div style={{ marginTop:SP[4],padding:"10px 14px",background:CL.s2,borderRadius:RAD.md,border:`1px solid ${CL.bd}`,borderLeft:`4px solid ${nd!=null&&nd>=0?CL.gn:CL.rd}` }}>
        <div style={{ fontSize:FS.sm,fontWeight:FW.bold,color:CL.al,marginBottom:3 }}>{fr?`Depuis le ${ls.date}:`:`Since ${ls.date}:`}</div>
        <div style={{ fontSize:FS.sm,color:CL.tx,lineHeight:1.7 }}>VN: {f$(ls.netWorth)} → {f$(totals.netWorth)} <span style={{color:nd!=null&&nd>=0?CL.gn:CL.rd,fontWeight:FW.bold}}>({nd!=null&&nd>=0?"+":""}{f$(nd)})</span></div>
      </div>}

      <div style={{ marginTop:SP[4],textAlign:"center" }}>
        <button onClick={()=>{navigator.clipboard?.writeText("https://buildfi.ca/outils/bilan-annuel");alert(fr?"Lien copié!":"Link copied!");}}
          style={{ padding:"8px 20px",background:"transparent",border:`1px solid ${CL.bd}`,borderRadius:RAD.md,color:CL.dm,fontSize:FS.sm,cursor:"pointer" }}>
          {fr?"Partager cet outil avec un ami":"Share this tool with a friend"}
        </button>
      </div>
    </div>);
  }

  function renderActifs() {
    return (<div>
      <div style={{ fontSize:FS.lg,fontWeight:FW.bold,color:CL.al,marginBottom:SP[3] }}>{fr?"Comptes":"Accounts"} <span style={{fontSize:FS.sm,color:CL.dm,fontWeight:FW.normal}}>({data.accounts.length})</span></div>
      {data.accounts.map((a: any) => {
        const t = ACC_TYPES.find(x=>x.key===a.type)||ACC_TYPES[0];
        return (<Card key={a.id} title={a.label||t.label} icon={t.icon} color={t.color} onRemove={()=>rmItem("accounts",a.id)} summary={f$(a.balance)}>
          <div style={{display:"flex",flexWrap:"wrap",gap:SP[3]}}>
            <Field label={fr?"Nom":"Name"} half><NumInput value={a.label} onChange={(v: any)=>upItem("accounts",a.id,"label",v)} type="text" ariaLabel="Account name"/></Field>
            <Field label={fr?"Solde":"Balance"} half><NumInput value={a.balance} onChange={(v: any)=>upItem("accounts",a.id,"balance",v)} prefix="$" ariaLabel="Balance"/></Field>
            <Field label={fr?"Cotisation/an":"Contrib/yr"} half><NumInput value={a.contribution} onChange={(v: any)=>upItem("accounts",a.id,"contribution",v)} prefix="$" ariaLabel="Annual contribution"/></Field>
            <Field label={fr?"Rendement":"Return"} half><PctInput value={a.returnRate} onChange={(v: any)=>upItem("accounts",a.id,"returnRate",v)} presets={RET_PRESETS}/></Field>
          </div>
        </Card>);
      })}
      <AddButton label={fr?"Ajouter un compte":"Add account"} onClick={()=>addItem("accounts",{id:uid(),type:"rrsp",label:"",balance:0,contribution:0,returnRate:.05})}/>

      <div style={{fontSize:FS.lg,fontWeight:FW.bold,color:CL.al,marginTop:SP[6],marginBottom:SP[3]}}>{fr?"Immobilier":"Real estate"}</div>
      {data.properties.map((p: any) => {
        const ap = calcPMT(p.mortgage.balance,p.mortgage.rate,p.mortgage.amortYears);
        return (<Card key={p.id} title={p.label||(fr?"Propriété":"Property")} icon={p.isRental?"🏢":"🏠"} color={CL.gn} onRemove={()=>rmItem("properties",p.id)} summary={f$(p.value)}>
          <div style={{display:"flex",flexWrap:"wrap",gap:SP[3]}}>
            <Field label="Description" half><NumInput value={p.label} onChange={(v: any)=>upItem("properties",p.id,"label",v)} type="text"/></Field>
            <Field label={fr?"Valeur":"Value"} half><NumInput value={p.value} onChange={(v: any)=>upItem("properties",p.id,"value",v)} prefix="$"/></Field>
            <Field label={fr?"Appréciation/an":"Apprec./yr"} half><PctInput value={p.appreciation} onChange={(v: any)=>upItem("properties",p.id,"appreciation",v)}/></Field>
            <Field label="" half><label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:FS.base,color:CL.tx,padding:"7px 0"}}>
              <input type="checkbox" checked={p.isRental} onChange={(e: any)=>upItem("properties",p.id,"isRental",e.target.checked)} style={{accentColor:CL.ac}}/>{fr?"Locatif":"Rental"}</label></Field>
            {p.isRental&&<Field label={fr?"Loyer net/mois":"Net rent/mo"} half><NumInput value={p.rentalIncome} onChange={(v: any)=>upItem("properties",p.id,"rentalIncome",v)} prefix="$"/></Field>}
          </div>
          <div style={{marginTop:SP[3],paddingTop:SP[3],borderTop:`1px solid ${CL.bd}`}}>
            <div style={{fontSize:FS.sm,fontWeight:FW.bold,color:CL.or,marginBottom:SP[2]}}>{fr?"Hypothèque":"Mortgage"}</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:SP[3]}}>
              <Field label={fr?"Solde":"Balance"} half><NumInput value={p.mortgage.balance} onChange={(v: any)=>upItem("properties",p.id,"mortgage.balance",v)} prefix="$"/></Field>
              <Field label={fr?"Taux":"Rate"} half><PctInput value={p.mortgage.rate} onChange={(v: any)=>upItem("properties",p.id,"mortgage.rate",v)}/></Field>
              <Field label={fr?"Amortissement":"Amort. (yrs)"} half><NumInput value={p.mortgage.amortYears} onChange={(v: any)=>upItem("properties",p.id,"mortgage.amortYears",v)}/></Field>
              <Field label={fr?"Paiement/mois":"Payment/mo"} half tip={fr?"Calculé auto. Modifiez pour surcharger.":"Auto-calculated. Edit to override."}>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <NumInput value={p.mortgage.autoCalc!==false?ap:p.mortgage.payment} onChange={(v: any)=>{upItem("properties",p.id,"mortgage.payment",v);upItem("properties",p.id,"mortgage.autoCalc",false);}} prefix="$"/>
                  {p.mortgage.autoCalc!==false&&<span style={{fontSize:FS.xxs,color:CL.gn,whiteSpace:"nowrap"}}>auto</span>}
                </div>
              </Field>
            </div>
          </div>
        </Card>);
      })}
      <AddButton label={fr?"Ajouter une propriété":"Add property"} onClick={()=>addItem("properties",{id:uid(),label:"",value:0,appreciation:.03,rentalIncome:0,isRental:false,mortgage:{balance:0,rate:.055,termYears:5,amortYears:25,payment:0,autoCalc:true}})}/>

      <div style={{fontSize:FS.lg,fontWeight:FW.bold,color:CL.al,marginTop:SP[6],marginBottom:SP[3]}}>{fr?"Autres actifs":"Other assets"}</div>
      {(data.otherAssets||[]).map((a: any)=>(<Card key={a.id} title={a.label||"Autre"} icon="📦" color={CL.pr} onRemove={()=>rmItem("otherAssets",a.id)} summary={f$(a.value)}>
        <div style={{display:"flex",flexWrap:"wrap",gap:SP[3]}}>
          <Field label="Description" half><NumInput value={a.label} onChange={(v: any)=>upItem("otherAssets",a.id,"label",v)} type="text"/></Field>
          <Field label={fr?"Valeur":"Value"} half><NumInput value={a.value} onChange={(v: any)=>upItem("otherAssets",a.id,"value",v)} prefix="$"/></Field>
          <Field label={fr?"Croissance/an":"Growth/yr"} half><PctInput value={a.growth||0} onChange={(v: any)=>upItem("otherAssets",a.id,"growth",v)}/></Field>
        </div>
      </Card>))}
      <AddButton label={fr?"Ajouter":"Add"} onClick={()=>addItem("otherAssets",{id:uid(),label:"",value:0,growth:0})}/>
    </div>);
  }

  function renderPassifs() {
    return (<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:SP[2],marginBottom:SP[5]}}>
        <KPI label={fr?"Dettes":"Debt"} value={f$(totals.totalDebts)} color={CL.rd} tooltip={fr?"Hypothèques + dettes non-hypothécaires":"Mortgages + non-mortgage debts"}/>
        <KPI label={fr?"Paiements/mois":"Payments/mo"} value={f$(data.debts.reduce((s: number,d: any)=>s+(d.payment||0),0)+data.properties.reduce((s: number,p: any)=>s+(p.mortgage?.autoCalc!==false?calcPMT(p.mortgage?.balance,p.mortgage?.rate,p.mortgage?.amortYears):(p.mortgage?.payment||0)),0))} color={CL.or}/>
        <KPI label={fr?"Endettement":"Debt ratio"} value={pct(totals.debtRatio)} color={totals.debtRatio>.5?CL.rd:CL.or}
          quality={totals.debtRatio<=.3?{level:"good",text:"<30%"}:totals.debtRatio<=.5?{level:"watch",text:"30-50%"}:{level:"bad",text:">50%"}}/>
      </div>
      {data.properties.some((p: any)=>p.mortgage?.balance>0)&&<div style={{padding:"8px 12px",background:"rgba(192,138,78,0.06)",borderRadius:RAD.md,marginBottom:SP[4],fontSize:FS.sm,color:CL.ac}}>{fr?`Hypothèques (${f$(totals.mortgages)}) dans Actifs.`:`Mortgages (${f$(totals.mortgages)}) in Assets.`}</div>}
      {data.debts.map((d: any)=>{
        const t=DEBT_TYPES.find(x=>x.key===d.type)||DEBT_TYPES[0];
        let po=Infinity; if(d.balance>0&&d.payment>0){const mr=d.rate/12; if(mr>0&&d.payment>d.balance*mr) po=Math.ceil(-Math.log(1-(d.balance*mr)/d.payment)/Math.log(1+mr)); else if(mr===0) po=Math.ceil(d.balance/d.payment);}
        return(<Card key={d.id} title={d.label||t.label} icon={t.icon} color={d.rate>=.15?CL.rd:d.rate>=.08?CL.or:CL.gn} onRemove={()=>rmItem("debts",d.id)} summary={f$(d.balance)}>
          {d.balance>0&&d.payment>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:SP[2],marginBottom:SP[3]}}>
            <div style={{textAlign:"center",padding:6,background:CL.s2,borderRadius:RAD.sm}}><div style={{fontSize:FS.md,fontWeight:FW.bold,color:CL.al}}>{po<Infinity?`${Math.floor(po/12)}a ${po%12}m`:"∞"}</div><div style={{fontSize:FS.xs,color:CL.dm}}>{fr?"Remboursement":"Payoff"}</div></div>
            <div style={{textAlign:"center",padding:6,background:CL.s2,borderRadius:RAD.sm}}><div style={{fontSize:FS.md,fontWeight:FW.bold,color:CL.or}}>{po<Infinity?f$(Math.round(d.payment*po-d.balance)):"—"}</div><div style={{fontSize:FS.xs,color:CL.dm}}>{fr?"Intérêts":"Interest"}</div></div>
          </div>}
          <div style={{display:"flex",flexWrap:"wrap",gap:SP[3]}}>
            <Field label="Description" half><NumInput value={d.label} onChange={(v: any)=>upItem("debts",d.id,"label",v)} type="text"/></Field>
            <Field label={fr?"Solde":"Balance"} half><NumInput value={d.balance} onChange={(v: any)=>upItem("debts",d.id,"balance",v)} prefix="$"/></Field>
            <Field label={fr?"Taux":"Rate"} half><PctInput value={d.rate} onChange={(v: any)=>upItem("debts",d.id,"rate",v)}/></Field>
            {t.hasTerm&&<Field label={fr?"Terme (mois)":"Term (mo)"} half><NumInput value={d.termMonths} onChange={(v: any)=>upItem("debts",d.id,"termMonths",v)}/></Field>}
            <Field label={fr?"Paiement/mois":"Payment/mo"} half><NumInput value={d.payment} onChange={(v: any)=>upItem("debts",d.id,"payment",v)} prefix="$"/></Field>
          </div>
        </Card>);
      })}
      <AddButton label={fr?"Ajouter une dette":"Add debt"} onClick={()=>addItem("debts",{id:uid(),type:"loc",label:"",balance:0,rate:.06,termMonths:60,payment:0})}/>
    </div>);
  }

  function renderRevenus() {
    const rt=data.properties.filter((p: any)=>p.isRental).reduce((s: number,p: any)=>s+(p.rentalIncome||0)*12,0);
    return (<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:SP[2],marginBottom:SP[5]}}>
        <KPI label={fr?"Revenu total/an":"Total/yr"} value={f$((data.income?.salary||0)+rt+(data.income?.otherIncome||0))} color={CL.ac}/>
        <KPI label={fr?"Salaire":"Salary"} value={f$(data.income?.salary||0)} color={CL.bl}/>
        {rt>0&&<KPI label={fr?"Locatifs":"Rental"} value={f$(rt)} color={CL.gn}/>}
      </div>
      <Card title={fr?"Emploi":"Employment"} icon="💼" color={CL.bl}>
        <div style={{display:"flex",flexWrap:"wrap",gap:SP[3]}}>
          <Field label={fr?"Salaire annuel brut":"Annual gross"} half><NumInput value={data.income?.salary||0} onChange={(v: any)=>up("income.salary",v)} prefix="$" ariaLabel="Salary"/></Field>
          <Field label={fr?"Croissance/an":"Growth/yr"} half><PctInput value={data.income?.salaryGrowth||0} onChange={(v: any)=>up("income.salaryGrowth",v)}/></Field>
        </div>
      </Card>
      <div style={{padding:"10px 14px",background:"rgba(192,138,78,0.06)",borderRadius:RAD.md,border:`1px solid rgba(192,138,78,0.15)`,fontSize:FS.sm,color:CL.ac,marginTop:SP[3]}}>
        {fr?"RRQ/CPP, PSV/OAS, SRG/GIS et pensions → Bilan Pro":"CPP, OAS, GIS & pensions → Bilan Pro"}
      </div>
    </div>);
  }

  function renderProjection() {
    return (<div>
      <Card title={fr?"Projection 5 ans":"5-Year Projection"} icon="📈" color={CL.ac}>
        <div style={{padding:"8px 12px",background:"rgba(192,138,78,0.06)",borderRadius:RAD.sm,marginBottom:SP[3],fontSize:FS.sm,color:CL.al}}>
          {fr?"Valeur nette":"Net worth"}: {f$(proj[0]?.netWorth)} → {f$(proj[5]?.netWorth)} <strong style={{color:CL.gn}}>({f$(proj[5]?.netWorth-proj[0]?.netWorth)})</strong>
        </div>
        <NetWorthChart projection={proj} altProjection={altProj} fr={fr}/>
      </Card>

      <Card title={fr?"Et si...?":"What if...?"} icon="🔮" color={CL.gn}>
        <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:SP[3],cursor:"pointer"}}>
          <input type="checkbox" checked={whatIf.active} onChange={(e: any)=>setWhatIf(p=>({...p,active:e.target.checked}))} style={{accentColor:CL.gn}}/>
          <span style={{fontSize:FS.base,color:CL.al}}>{fr?"Activer":"Enable"}</span>
        </label>
        {whatIf.active&&(<>
          <div style={{display:"flex",gap:3,marginBottom:SP[3],flexWrap:"wrap"}}>
            {([["contrib",fr?"Cotisation +":"Contribute +"],["debt",fr?"Rembourser +":"Pay down +"],["return",fr?"Rendement":"Return rate"]] as const).map(([m,l])=>
              <button key={m} onClick={()=>setWhatIf(p=>({...p,mode:m}))} style={{padding:"5px 12px",borderRadius:RAD.sm,border:`1px solid ${whatIf.mode===m?CL.gn:CL.bd}`,background:whatIf.mode===m?CL.gn:"transparent",color:whatIf.mode===m?"#fff":CL.dm,fontSize:FS.sm,cursor:"pointer"}}>{l}</button>)}
          </div>
          {whatIf.mode==="contrib"&&<div style={{display:"flex",flexWrap:"wrap",gap:SP[3]}}>
            <Field label={fr?"Compte":"Account"} half>
              <select value={whatIf.targetAccount} onChange={(e: any)=>setWhatIf(p=>({...p,targetAccount:e.target.value}))} aria-label="Target account"
                style={{width:"100%",background:CL.bg,border:`1px solid ${CL.bd}`,borderRadius:RAD.sm,color:CL.al,fontSize:FS.base,padding:"7px 8px"}}>
                <option value="">{fr?"Choisir...":"Select..."}</option>
                {data.accounts.map((a: any)=><option key={a.id} value={a.id}>{a.label||a.type}</option>)}
              </select></Field>
            <Field label={fr?"Extra/mois":"Extra/mo"} half><NumInput value={whatIf.extraContrib} onChange={(v: any)=>setWhatIf(p=>({...p,extraContrib:v}))} prefix="$"/></Field>
          </div>}
          {whatIf.mode==="debt"&&<Field label={fr?"Paiement supplémentaire/mois":"Extra payment/mo"}><NumInput value={whatIf.debtExtra} onChange={(v: any)=>setWhatIf(p=>({...p,debtExtra:v}))} prefix="$"/></Field>}
          {whatIf.mode==="return"&&<Field label={fr?"Rendement alternatif (tous comptes)":"Alt return (all accounts)"} tip={fr?"Appliqué à tous les comptes":"Applied to all accounts"}>
            <PctInput value={whatIf.returnOverride} onChange={(v: any)=>setWhatIf(p=>({...p,returnOverride:v}))} presets={RET_PRESETS}/></Field>}
          {altProj&&<div style={{padding:"8px 12px",background:CL.s2,borderRadius:RAD.sm,fontSize:FS.sm,color:CL.gn,marginTop:SP[2]}}>
            {fr?"Impact 5 ans: ":"5yr impact: "}<strong>{f$(altProj[5].netWorth-proj[5].netWorth)}</strong>
          </div>}
          <div style={{fontSize:FS.xxs,color:CL.dm,marginTop:SP[2],fontStyle:"italic"}}>{fr?"Illustratif seulement. Pas un conseil financier.":"Illustrative only. Not financial advice."}</div>
        </>)}
      </Card>

      <Card title={fr?"Détail":"Details"} icon="📊" color={CL.bl}>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:FS.sm}}>
          <thead><tr style={{borderBottom:`2px solid ${CL.ac}`}}>
            {[fr?"An":"Yr",fr?"Liquide":"Liquid",fr?"Immo":"R.E.",fr?"Dettes":"Debts",fr?"V.N.":"N.W.","Δ"].map((h,i)=>
              <th key={i} style={{padding:"5px 6px",textAlign:i===0?"left":"right",color:CL.ac,fontWeight:FW.bold,fontSize:FS.xs}}>{h}</th>)}</tr></thead>
          <tbody>{proj.map((r: any,i: number)=>{const d=i>0?r.netWorth-proj[i-1].netWorth:0;
            return<tr key={i} style={{borderBottom:`1px solid ${CL.bd}`,background:i===0?"rgba(192,138,78,0.04)":"transparent"}}>
              <td style={{padding:"4px 6px",color:CL.al,fontWeight:i===0?FW.bold:FW.normal}}>{i===0?(fr?"Auj.":"Now"):`An ${i}`}</td>
              {[r.liquid,r.immo,-r.debt,r.netWorth].map((v: number,j: number)=><td key={j} style={{padding:"4px 6px",textAlign:"right",fontFamily:"'JetBrains Mono'",fontSize:FS.xs,color:v<0?CL.rd:CL.tx}}>{f$k(v)}</td>)}
              <td style={{padding:"4px 6px",textAlign:"right",fontFamily:"'JetBrains Mono'",fontSize:FS.xs,color:d>0?CL.gn:d<0?CL.rd:CL.dm}}>{i===0?"—":`${d>=0?"+":""}${f$k(d)}`}</td>
            </tr>})}</tbody>
        </table></div>
      </Card>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:SP[3],marginTop:SP[4]}}>
        <div style={{padding:"16px",background:"linear-gradient(135deg,rgba(192,138,78,0.08),rgba(192,138,78,0.02))",borderRadius:RAD.md+2,border:`1px solid rgba(192,138,78,0.2)`,textAlign:"center"}}>
          <div style={{fontSize:FS.md,fontWeight:FW.bold,color:CL.ac,marginBottom:4}}>{fr?"Au-delà de 5 ans?":"Beyond 5 years?"}</div>
          <div style={{fontSize:FS.xs,color:CL.dm,lineHeight:1.6,marginBottom:8}}>{fr?"Bilan Pro: 5,000 scénarios MC + fiscalité + CPP/OAS":"Bilan Pro: 5,000 MC sims + taxes + CPP/OAS"}</div>
          <button style={{padding:"8px 20px",background:CL.ac,color:CL.bg,border:"none",borderRadius:RAD.sm,fontSize:FS.sm,fontWeight:FW.bold,cursor:"pointer"}}>Bilan Pro — 19,99 $</button>
        </div>
        <div style={{padding:"16px",background:"linear-gradient(135deg,rgba(90,148,196,0.08),rgba(90,148,196,0.02))",borderRadius:RAD.md+2,border:`1px solid rgba(90,148,196,0.2)`,textAlign:"center"}}>
          <div style={{fontSize:FS.md,fontWeight:FW.bold,color:CL.bl,marginBottom:4}}>{fr?"Scénarios illimités?":"Unlimited scenarios?"}</div>
          <div style={{fontSize:FS.xs,color:CL.dm,lineHeight:1.6,marginBottom:8}}>{fr?"Laboratoire: Tornado, backtesting 2008/COVID, CCPC":"Lab: Tornado, backtesting 2008/COVID, CCPC"}</div>
          <button style={{padding:"8px 20px",background:CL.bl,color:"#fff",border:"none",borderRadius:RAD.sm,fontSize:FS.sm,fontWeight:FW.bold,cursor:"pointer"}}>Laboratoire — 49,99 $</button>
        </div>
      </div>
    </div>);
  }

  function renderEvolution() {
    const sn=data.snapshots||[];
    if(!sn.length) return(<div style={{textAlign:"center",padding:"60px 20px",color:CL.dm}}><div style={{fontSize:48,marginBottom:SP[3]}}>📈</div><div style={{fontSize:FS.lg,marginBottom:SP[2]}}>{fr?"Aucun bilan":"No balances"}</div><div style={{fontSize:FS.sm,maxWidth:400,margin:"0 auto"}}>{fr?"Sauvegardez dans Portrait.":"Save in Dashboard."}</div></div>);
    return(<div>
      {sn.length>=2&&<Card title={fr?"Évolution":"Evolution"} icon="📈" color={CL.gn}><SnapChart snaps={sn} fr={fr}/></Card>}
      <div style={{fontSize:FS.md,fontWeight:FW.bold,color:CL.al,marginBottom:SP[3]}}>{sn.length} {fr?"bilans":"snapshots"}</div>
      {[...sn].reverse().map((s: any,i: number)=>{const prev=i<sn.length-1?[...sn].reverse()[i+1]:null;const d=prev?s.netWorth-prev.netWorth:null;
        return(<Card key={s.id} title={s.date} icon="📅" color={d!=null?(d>0?CL.gn:d<0?CL.rd:CL.ac):CL.ac} onRemove={()=>setData((p: any)=>({...p,snapshots:p.snapshots.filter((x: any)=>x.id!==s.id)}))} summary={f$(s.netWorth)}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:SP[2]}}>
            {[{l:fr?"Valeur nette":"Net worth",v:f$(s.netWorth),c:CL.al},d!=null&&{l:"Δ",v:`${d>=0?"+":""}${f$(d)}`,c:d>=0?CL.gn:CL.rd},{l:fr?"Actifs":"Assets",v:f$(s.totalAssets),c:CL.bl},{l:fr?"Dettes":"Debts",v:f$(s.totalDebts),c:CL.or}].filter(Boolean).map((m: any,j: number)=>
              <div key={j} style={{textAlign:"center",padding:5,background:CL.s2,borderRadius:RAD.sm}}><div style={{fontSize:FS.sm,fontWeight:FW.bold,color:m.c,fontFamily:"'JetBrains Mono'"}}>{m.v}</div><div style={{fontSize:FS.xxs,color:CL.dm}}>{m.l}</div></div>)}
          </div>
          {s.note&&<div style={{marginTop:SP[2],fontSize:FS.sm,color:CL.dm,fontStyle:"italic"}}>{s.note}</div>}
        </Card>);
      })}
    </div>);
  }

  function renderSettings() {
    return (<div>
      <Card title={fr?"Exporter / Importer":"Export / Import"} icon="💾" color={CL.bl}>
        <div style={{display:"flex",gap:SP[3],flexWrap:"wrap"}}>
          <button onClick={()=>{const b=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=`buildfi-bilan-${new Date().toISOString().split("T")[0]}.json`;a.click();}}
            style={{flex:1,padding:"12px",background:CL.ac,color:CL.bg,border:"none",borderRadius:RAD.md,fontSize:FS.md,fontWeight:FW.bold,cursor:"pointer",minWidth:130}}>Export</button>
          <label style={{flex:1,padding:"12px",background:CL.s2,color:CL.al,border:`1px solid ${CL.bd}`,borderRadius:RAD.md,fontSize:FS.md,fontWeight:FW.bold,cursor:"pointer",textAlign:"center",minWidth:130}}>
            Import<input type="file" accept=".json" style={{display:"none"}} onChange={(e: any) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev: any) => {
                try {
                  const imported = JSON.parse(ev.target.result);
                  const merged = { ...JSON.parse(JSON.stringify(SAMPLE_PROFILE)), ...imported };
                  setData(merged);
                } catch {
                  alert("Invalid file");
                }
              };
              reader.readAsText(file);
            }} /></label>
        </div>
        <div style={{marginTop:SP[2],fontSize:FS.xxs,color:CL.dm}}>{fr?"Stockage utilisé":"Storage used"}: {storageUsed} KB / 5,000 KB</div>
      </Card>
      <Card title={fr?"Rappels":"Reminders"} icon="🔔" color={CL.ac}>
        <div style={{fontSize:FS.sm,color:CL.dm,marginBottom:SP[2]}}>{data.reminder?.enabled?`✅ ${data.reminder.email} (${data.reminder.frequency})`:(fr?"Aucun rappel":"No reminder")}</div>
        {data.reminder?.enabled&&<button onClick={()=>up("reminder.enabled",false)} style={{padding:"6px 14px",background:"transparent",color:CL.rd,border:`1px solid ${CL.rd}`,borderRadius:RAD.sm,fontSize:FS.xs,cursor:"pointer"}}>{fr?"Désactiver":"Disable"}</button>}
      </Card>
      <Card title={fr?"Langue":"Language"} icon="🌐" color={CL.dm}>
        <div style={{display:"flex",gap:SP[2]}}>{([["fr","Français"],["en","English"]] as const).map(([c,l])=>
          <button key={c} onClick={()=>up("profile.lang",c)} style={{flex:1,padding:"8px",borderRadius:RAD.sm,border:`1px solid ${data.profile?.lang===c?CL.ac:CL.bd}`,background:data.profile?.lang===c?CL.ac:"transparent",color:data.profile?.lang===c?CL.bg:CL.dm,fontSize:FS.base,fontWeight:FW.bold,cursor:"pointer"}}>{l}</button>)}</div>
      </Card>
      <Card title={fr?"Profil exemple":"Sample"} icon="👤" color={CL.pr}>
        <button onClick={() => {
          if (confirm(fr ? "Charger exemple?" : "Load sample?")) {
            localStorage.removeItem(STORAGE_KEY);
            const fresh = JSON.parse(JSON.stringify(SAMPLE_PROFILE));
            setData(fresh);
          }
        }}
          style={{padding:"8px 16px",background:CL.s2,color:CL.al,border:`1px solid ${CL.bd}`,borderRadius:RAD.md,fontSize:FS.sm,cursor:"pointer"}}>{fr?"Charger Marie-Ève & Julien":"Load sample"}</button>
      </Card>
      <Card title={fr?"Réinitialiser":"Reset"} icon="⚠️" color={CL.rd}>
        <button onClick={() => {
          if (confirm(fr ? "Tout supprimer?" : "Delete all?")) {
            localStorage.removeItem(STORAGE_KEY);
            const fresh = JSON.parse(JSON.stringify(SAMPLE_PROFILE));
            setData(fresh);
            changeTab(-1);
          }
        }}
          style={{padding:"8px 16px",background:"transparent",color:CL.rd,border:`1px solid ${CL.rd}`,borderRadius:RAD.md,fontSize:FS.sm,cursor:"pointer"}}>{fr?"Supprimer":"Delete all"}</button>
      </Card>
    </div>);
  }

  const content = [renderPortrait,renderActifs,renderPassifs,renderRevenus,renderProjection,renderEvolution,renderSettings];

  // ═══════════════════════════════════════════════════
  // MAIN LAYOUT
  // ═══════════════════════════════════════════════════
  return (
    <div style={{fontFamily:"'DM Sans',-apple-system,system-ui,sans-serif",background:CL.bg,color:CL.tx,minHeight:"100vh",WebkitFontSmoothing:"antialiased"}}>
      <style>{`
        .ba-fi{animation:bafi .25s ease both}
        @keyframes bafi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .ba-kpi{animation:bafi .3s ease both}
        @media print{.ba-np{display:none!important}body{background:#fff!important;color:#000!important}}
        @media(max-width:600px){.ba-kpi-grid{grid-template-columns:repeat(2,1fr)!important}}
      `}</style>
      {reminderModal}
      <SaveModal show={showSaveConfirm} onConfirm={doSave} onCancel={()=>setShowSaveConfirm(false)} totals={totals} fr={fr}/>
      <InfoModal show={showInfo} onClose={()=>setShowInfo(false)} fr={fr}/>

      {/* BA-SEC-01: Cookie consent banner */}
      {showConsent && (
        <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:9998,background:"rgba(36,32,24,.97)",backdropFilter:"blur(8px)",padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"center",gap:16,flexWrap:"wrap",fontSize:14,color:"rgba(255,255,255,.85)",borderTop:`1px solid ${CL.bd}`}}>
          <span>{fr?"Ce site utilise des témoins analytiques pour améliorer l'expérience.":"This site uses analytics cookies to improve the experience."}</span>
          <button onClick={acceptConsent} style={{padding:"8px 20px",border:"none",borderRadius:8,fontWeight:700,fontSize:13,cursor:"pointer",background:`linear-gradient(135deg,#c49a1a,#d4af37)`,color:"#fff"}}>{fr?"Accepter":"Accept"}</button>
          <button onClick={declineConsent} style={{padding:"8px 20px",border:"1px solid rgba(255,255,255,.25)",borderRadius:8,fontWeight:700,fontSize:13,cursor:"pointer",background:"transparent",color:"rgba(255,255,255,.7)"}}>{fr?"Refuser":"Decline"}</button>
        </div>
      )}

      {/* BA-SEC-06: Storage warning */}
      {storageError && <div style={{padding:"8px 16px",background:CL.rd,color:"#fff",fontSize:FS.xs,textAlign:"center"}}>{storageError}</div>}

      <div style={{padding:"12px 16px",borderBottom:`1px solid ${CL.bd}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {/* BA-FEAT-06: BuildFi logo (inline SVG matching logo.js) */}
          <svg xmlns="http://www.w3.org/2000/svg" width="110" height="24" viewBox="0 0 220 48">
            <g><rect x="0" y="32" width="28" height="8" rx="2" fill={CL.al}/><rect x="4" y="22" width="26" height="8" rx="2" fill={CL.al} opacity={0.5}/><rect x="8" y="12" width="24" height="8" rx="2" fill={CL.ac}/></g>
            <text x="40" y="38" fontFamily="'DM Sans',sans-serif" fontSize="34" fontWeight="700" letterSpacing="-0.5"><tspan fill={CL.al}>build</tspan><tspan fill={CL.ac}>fi</tspan></text>
          </svg>
          <div style={{borderLeft:`1px solid ${CL.bd}`,paddingLeft:10,marginLeft:2}}><div style={{fontSize:FS.sm,fontWeight:FW.bold,color:CL.al,letterSpacing:-.3}}>{fr?"Bilan Annuel":"Balance Sheet"}</div></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{textAlign:"right"}}><div style={{fontSize:20,fontWeight:FW.bold,color:totals.netWorth>=0?CL.gn:CL.rd,fontFamily:"'JetBrains Mono'"}}>{f$(totals.netWorth)}</div><div style={{fontSize:FS.xxs,color:CL.dm}}>{fr?"Valeur nette":"Net worth"}</div></div>
          <button onClick={()=>setShowInfo(true)} style={{background:"none",border:`1px solid ${CL.bd}`,borderRadius:"50%",width:28,height:28,color:CL.dm,cursor:"pointer",fontSize:FS.sm,display:"flex",alignItems:"center",justifyContent:"center"}}>i</button>
        </div>
      </div>

      <TabBar tabs={tabs} active={tab} onChange={changeTab}/>

      <div key={tabKey} className="ba-fi" style={{maxWidth:820,margin:"0 auto",padding:"16px 14px"}}>
        {tab>=0&&tab<content.length&&content[tab]()}
      </div>

      <div style={{textAlign:"center",padding:"14px",borderTop:`1px solid ${CL.bd}`,fontSize:FS.xs,color:CL.dm}}>
        BuildFi Technologies inc. · <a href="/avis-legal" style={{color:CL.dm,textDecoration:"underline"}}>{fr?"Avis légal":"Legal"}</a> · <a href="/confidentialite" style={{color:CL.dm,textDecoration:"underline"}}>{fr?"Confidentialité":"Privacy"}</a> · buildfi.ca
      </div>
    </div>
  );
}
