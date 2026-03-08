"use client";
import React, { useState, useEffect, useRef, useCallback, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { trackEvent, EVENTS } from "@/lib/tracking";

// ═══════════════════════════════════════════════════════════════════
// BuildFi — Simulateur Expert
// Single-file React page — auth-gated, real-time MC simulation
// ═══════════════════════════════════════════════════════════════════

// ── Expert Kit: Light theme palette (IDENTITY-ALIGNMENT §4.2) ──
const EK = {
  bg: "#faf8f4",
  card: "#ffffff",
  sable: "#e8e4db",
  border: "#d4cec4",
  marine: "#1a2744",
  gold: "#c49a1a",
  tx: "#1a1208",
  txDim: "#666666",
  txMuted: "#999999",
  green: "#1a7a4c",
  red: "#b91c1c",
};

// ── Format helpers ──
const f$ = (v: number) => {
  if (v == null || isNaN(v)) return "$0";
  const abs = Math.abs(Math.round(v));
  const formatted = abs.toLocaleString("en-CA");
  return v < 0 ? `-$${formatted}` : `$${formatted}`;
};
const fPct = (v: number) => `${(v * 100).toFixed(1)}%`;

// ── Bilingual text helper ──
type Lang = "fr" | "en";
const T = (fr: string, en: string, lang: Lang) => (lang === "fr" ? fr : en);

// ── Province list ──
const PROVINCES = [
  { code: "QC", fr: "Québec", en: "Quebec" },
  { code: "ON", fr: "Ontario", en: "Ontario" },
  { code: "BC", fr: "Colombie-Brit.", en: "British Columbia" },
  { code: "AB", fr: "Alberta", en: "Alberta" },
  { code: "MB", fr: "Manitoba", en: "Manitoba" },
  { code: "SK", fr: "Saskatchewan", en: "Saskatchewan" },
  { code: "NS", fr: "Nouvelle-Écosse", en: "Nova Scotia" },
  { code: "NB", fr: "Nouveau-Brunswick", en: "New Brunswick" },
  { code: "NL", fr: "Terre-Neuve", en: "Newfoundland" },
  { code: "PE", fr: "Île-du-Prince-Éd.", en: "Prince Edward Island" },
  { code: "NT", fr: "Territoires du N.-O.", en: "Northwest Terr." },
  { code: "YT", fr: "Yukon", en: "Yukon" },
  { code: "NU", fr: "Nunavut", en: "Nunavut" },
];

// ── Porte B presets ──
const PRESETS = [
  {
    id: "fire35",
    fr: "FIRE 35", en: "FIRE 35",
    descFr: "35 ans, retraite à 45, $110K, croissance", descEn: "Age 35, retire at 45, $110K, growth",
    params: { age: 35, retAge: 45, sex: "M", prov: "QC", sal: 110000, rrsp: 85000, tfsa: 45000, nr: 30000, rrspC: 15000, tfsaC: 7000, nrC: 5000, retSpM: 4000, penType: "none", penM: 0, allocR: 0.85, allocT: 0.85, allocN: 0.65, merR: 0.020, merT: 0.010, merN: 0.010, inf: 0.021, qppAge: 65, oasAge: 65, cOn: false, props: [], debts: [], fatT: true, stochMort: true, stochInf: true, gkOn: true, glide: true, glideSpd: 0.01, wStrat: "optimal", melt: false, avgE: 110000, qppYrs: 17, deathAge: 90, liraBal: 0, dcBal: 0, nrTaxDrag: 0.003, costBase: 30000 },
    disclosure: { couple: false, homeowner: false, pension: false, ccpc: false, taxWorry: false, growthRisk: true },
  },
  {
    id: "couple50",
    fr: "Couple 50", en: "Couple 50",
    descFr: "50 ans, couple, QC, pension DB", descEn: "Age 50, couple, QC, DB pension",
    params: { age: 50, retAge: 65, sex: "M", prov: "QC", sal: 95000, rrsp: 180000, tfsa: 65000, nr: 40000, rrspC: 10000, tfsaC: 7000, nrC: 0, retSpM: 5500, penType: "db", penM: 2800, penIdx: true, allocR: 0.65, allocT: 0.65, allocN: 0.45, merR: 0.018, merT: 0.009, merN: 0.009, inf: 0.021, qppAge: 65, oasAge: 65, cOn: true, cAge: 48, cSex: "F", cRetAge: 65, cSal: 72000, cRRSP: 95000, cTFSA: 40000, cNR: 0, cLiraBal: 0, cPenType: "none", cPenM: 0, cQppAge: 65, cOasAge: 65, cRetSpM: 2200, cDeath: 92, props: [{ on: true, name: "Résidence principale", pri: true, val: 480000, mb: 120000, mr: 0.055, ma: 12, ri: 0.035, rm: 0, ox: 0, pt: 0, ins: 0, sa: 0, cg: 0, landPct: 0.30, heloc: 0, helocRate: 0.065, helocMax: 0.65, smithOn: false, refiAge: 0, refiAmt: 0, dsAge: 0, dsAmt: 0, dpaOn: false, dpaRate: 0.04 }], debts: [], fatT: true, stochMort: true, stochInf: true, gkOn: true, glide: true, glideSpd: 0.01, wStrat: "optimal", split: true, melt: false, avgE: 95000, qppYrs: 32, deathAge: 90, liraBal: 0, dcBal: 0, nrTaxDrag: 0.003, costBase: 40000 },
    disclosure: { couple: true, homeowner: true, pension: true, ccpc: false, taxWorry: false, growthRisk: false },
  },
  {
    id: "ccpc",
    fr: "CCPC", en: "CCPC",
    descFr: "42 ans, $200K revenus entreprise", descEn: "Age 42, $200K business revenue",
    params: { age: 42, retAge: 62, sex: "M", prov: "QC", sal: 80000, rrsp: 120000, tfsa: 50000, nr: 60000, rrspC: 8000, tfsaC: 7000, nrC: 3000, retSpM: 6000, penType: "none", penM: 0, allocR: 0.75, allocT: 0.75, allocN: 0.55, merR: 0.018, merT: 0.009, merN: 0.009, inf: 0.021, qppAge: 65, oasAge: 65, cOn: false, props: [], debts: [], fatT: true, stochMort: true, stochInf: true, gkOn: true, glide: true, glideSpd: 0.01, wStrat: "optimal", melt: false, avgE: 80000, qppYrs: 24, deathAge: 90, liraBal: 0, dcBal: 0, nrTaxDrag: 0.003, costBase: 60000, bizOn: true, bizType: "ccpc", bizRevenue: 200000, bizExpenses: 40000, bizRetainedEarnings: 350000, bizRemun: "mix", bizSalaryPct: 0.50, bizGrowth: 0.02, bizVolatility: 0.15, bizInvAlloc: 0.40, bizExtractYrs: 10, bizOasOptim: true, bizDebtBal: 0, bizDebtRate: 0.065, bizDebtAmort: 10, bizSaleAge: 0, bizSalePrice: 0, bizSaleACB: 100, bizLCGE: false, ippOn: false, ippBal: 0 },
    disclosure: { couple: false, homeowner: false, pension: false, ccpc: true, taxWorry: true, growthRisk: false },
  },
  {
    id: "preretiree",
    fr: "Pre-retraite DB", en: "Pre-retirement DB",
    descFr: "58 ans, retraite à 62, gouvernement", descEn: "Age 58, retire at 62, government",
    params: { age: 58, retAge: 62, sex: "M", prov: "ON", sal: 105000, rrsp: 280000, tfsa: 88000, nr: 50000, rrspC: 5000, tfsaC: 7000, nrC: 0, retSpM: 5000, penType: "db", penM: 3600, penIdx: true, allocR: 0.55, allocT: 0.55, allocN: 0.40, merR: 0.015, merT: 0.008, merN: 0.008, inf: 0.021, qppAge: 65, oasAge: 65, cOn: false, props: [{ on: true, name: "Résidence principale", pri: true, val: 650000, mb: 0, mr: 0.055, ma: 0, ri: 0.035, rm: 0, ox: 0, pt: 0, ins: 0, sa: 0, cg: 0, landPct: 0.30, heloc: 0, helocRate: 0.065, helocMax: 0.65, smithOn: false, refiAge: 0, refiAmt: 0, dsAge: 0, dsAmt: 0, dpaOn: false, dpaRate: 0.04 }], debts: [], fatT: true, stochMort: true, stochInf: true, gkOn: true, glide: true, glideSpd: 0.01, wStrat: "optimal", melt: true, meltTgt: 70000, bridge: false, avgE: 105000, qppYrs: 40, deathAge: 90, liraBal: 0, dcBal: 0, nrTaxDrag: 0.003, costBase: 50000 },
    disclosure: { couple: false, homeowner: true, pension: true, ccpc: false, taxWorry: false, growthRisk: false },
  },
  {
    id: "blank",
    fr: "Profil vierge", en: "Blank profile",
    descFr: "Paramètres minimaux", descEn: "Minimal defaults",
    params: { age: 40, retAge: 65, sex: "M", prov: "QC", sal: 70000, rrsp: 0, tfsa: 0, nr: 0, rrspC: 0, tfsaC: 0, nrC: 0, retSpM: 4000, penType: "none", penM: 0, allocR: 0.70, allocT: 0.70, allocN: 0.50, merR: 0.018, merT: 0.009, merN: 0.009, inf: 0.021, qppAge: 65, oasAge: 65, cOn: false, props: [], debts: [], fatT: true, stochMort: true, stochInf: true, gkOn: true, glide: true, glideSpd: 0.01, wStrat: "optimal", melt: false, avgE: 70000, qppYrs: 22, deathAge: 90, liraBal: 0, dcBal: 0, nrTaxDrag: 0.003, costBase: 0 },
    disclosure: { couple: false, homeowner: false, pension: false, ccpc: false, taxWorry: false, growthRisk: false },
  },
];

// ── Default params (same as blank preset) ──
const DEFAULT_PARAMS = PRESETS[4].params;

// ── Pre-defined decisions by segment (EXECUTION-PLAN §1.3) ──
interface DecisionDef {
  id: string;
  fr: string; en: string;
  descFr: string; descEn: string;
  segments: string[];
  variants: { label: string; labelEn: string; overrides: Record<string, unknown> }[];
}

const DECISIONS: DecisionDef[] = [
  {
    id: "retire_delay", fr: "Décaler la retraite de 2 ans", en: "Delay retirement by 2 years",
    descFr: "Comparer votre âge actuel vs +2 ans", descEn: "Compare current age vs +2 years",
    segments: ["couple", "preretiree", "fire"],
    variants: [
      { label: "Âge actuel", labelEn: "Current age", overrides: {} },
      { label: "+2 ans", labelEn: "+2 years", overrides: { _delta: { retAge: 2 } } },
    ],
  },
  {
    id: "cpp_timing", fr: "RRQ/RPC à 60, 65 ou 70", en: "CPP at 60, 65 or 70",
    descFr: "L'impact du report des prestations gouvernementales", descEn: "Impact of deferring government benefits",
    segments: ["couple", "preretiree", "fire", "ccpc"],
    variants: [
      { label: "RRQ à 60", labelEn: "CPP at 60", overrides: { qppAge: 60 } },
      { label: "RRQ à 65", labelEn: "CPP at 65", overrides: { qppAge: 65 } },
      { label: "RRQ à 70", labelEn: "CPP at 70", overrides: { qppAge: 70 } },
    ],
  },
  {
    id: "meltdown", fr: "Meltdown REER oui ou non", en: "RRSP meltdown yes or no",
    descFr: "Décaisser le REER avant les prestations gouvernementales", descEn: "Draw down RRSP before government benefits",
    segments: ["preretiree", "couple"],
    variants: [
      { label: "Sans meltdown", labelEn: "No meltdown", overrides: { melt: false } },
      { label: "Avec meltdown", labelEn: "With meltdown", overrides: { melt: true, meltTgt: 58523 } },
    ],
  },
  {
    id: "spending", fr: "Réduire les dépenses de 10%", en: "Reduce spending by 10%",
    descFr: "Impact d'une réduction des dépenses à la retraite", descEn: "Impact of reducing retirement spending",
    segments: ["couple", "preretiree", "fire", "ccpc"],
    variants: [
      { label: "Dépenses actuelles", labelEn: "Current spending", overrides: {} },
      { label: "-10%", labelEn: "-10%", overrides: { _delta_pct: { retSpM: -0.10 } } },
    ],
  },
  {
    id: "withdrawal_rate", fr: "Taux de retrait 3.5% vs 4.0% vs 4.5%", en: "Withdrawal rate 3.5% vs 4.0% vs 4.5%",
    descFr: "Comparer différents taux de retrait", descEn: "Compare different withdrawal rates",
    segments: ["fire"],
    variants: [
      { label: "3.5%", labelEn: "3.5%", overrides: { _withdrawal_rate: 0.035 } },
      { label: "4.0%", labelEn: "4.0%", overrides: { _withdrawal_rate: 0.040 } },
      { label: "4.5%", labelEn: "4.5%", overrides: { _withdrawal_rate: 0.045 } },
    ],
  },
  {
    id: "splitting", fr: "Fractionnement du revenu de retraite", en: "Retirement income splitting",
    descFr: "Comparer avec et sans fractionnement", descEn: "Compare with and without splitting",
    segments: ["couple"],
    variants: [
      { label: "Sans fractionnement", labelEn: "No splitting", overrides: { split: false } },
      { label: "Avec fractionnement", labelEn: "With splitting", overrides: { split: true } },
    ],
  },
];

// ── Compare result types ──
interface CompareVariant {
  label: string;
  successRate: number;
  grade: string;
  medianWealth: number;
  p25Wealth: number;
  p75Wealth: number;
  medianEstateTax: number;
  medianEstateNet: number;
  ruinPct: number;
  medianRuinAge: number | null;
}

interface OptimizeLever {
  axis: string;
  label_fr: string;
  label_en: string;
  currentValue: string;
  bestValue: string;
  delta_pp: number;
}

interface OptimizeResults {
  baseline: { successRate: number; grade: string; medianWealth: number };
  top10: { rank: number; params_changed: Record<string, unknown>; successRate: number; grade: string; medianWealth: number; score: number; delta_pp: number }[];
  levers: OptimizeLever[];
  meta: { totalTested: number; pass2Count: number; durationMs: number };
}

// ══════════════════════════════════════════════════════════════
// Reusable UI Components
// ══════════════════════════════════════════════════════════════

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: EK.card, borderRadius: 10, border: `1px solid ${EK.border}`, padding: 16, marginBottom: 12, ...style }}>
      {children}
    </div>
  );
}

function StatBox({ label, value, color = EK.tx, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "12px 8px", background: EK.bg, borderRadius: 8, border: `1px solid ${EK.border}`, flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.02em" }}>{value}</div>
      <div style={{ fontSize: 12, color: EK.txDim, marginTop: 2, lineHeight: 1.3, fontFamily: "'DM Sans', sans-serif" }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: EK.txMuted, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function NumInput({ value, onChange, step = 100, min = 0, max, prefix = "$", isDefault = false, style: sx, "aria-label": ariaLabel }: {
  value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; prefix?: string; isDefault?: boolean; style?: React.CSSProperties; "aria-label"?: string;
}) {
  const [local, setLocal] = useState(String(value ?? ""));
  const [isFocused, setIsFocused] = useState(false);
  const prevValue = useRef(value);
  useEffect(() => {
    if (!isFocused && value !== prevValue.current) setLocal(String(value ?? ""));
    prevValue.current = value;
  }, [value, isFocused]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {prefix && <span style={{ fontSize: 12, color: EK.txDim }}>{prefix}</span>}
      <input
        type="number" value={local} step={step} min={min} max={max}
        aria-label={ariaLabel}
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
        onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        style={{
          flex: 1, background: EK.bg, color: EK.tx, border: `1px solid ${isFocused ? EK.gold : EK.border}`,
          borderRadius: 6, padding: "6px 8px", fontSize: 15, fontFamily: "'JetBrains Mono', monospace",
          outline: "none", minWidth: 0,
          borderLeft: isDefault ? `3px solid ${EK.sable}` : undefined,
          ...sx,
        }}
      />
    </div>
  );
}

function SelectInput({ value, onChange, options, "aria-label": ariaLabel }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; "aria-label"?: string }) {
  return (
    <select
      value={value} onChange={e => onChange(e.target.value)}
      aria-label={ariaLabel}
      style={{ flex: 1, background: EK.bg, color: EK.tx, border: `1px solid ${EK.border}`, borderRadius: 6, padding: "6px 8px", fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", cursor: "pointer" }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function InputRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, color: EK.txDim, marginBottom: 3, fontFamily: "'DM Sans', sans-serif" }}>{label}</div>
      {children}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// GradeRing SVG
// ══════════════════════════════════════════════════════════════

function GradeRing({ grade, succ }: { grade: string; succ: number }) {
  const r = 54, cx = 64, cy = 64, circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, succ));
  const offset = circumference * (1 - pct);
  const color = pct >= 0.75 ? EK.green : pct >= 0.55 ? EK.gold : EK.red;
  return (
    <svg width={128} height={128} viewBox="0 0 128 128">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={EK.sable} strokeWidth={8} />
      <circle
        cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="central" fontSize={28} fontWeight={800} fill={EK.marine} fontFamily="'Newsreader', serif">{grade}</text>
      <text x={cx} y={cy + 20} textAnchor="middle" fontSize={13} fill={EK.txDim} fontFamily="'JetBrains Mono', monospace">{(pct * 100).toFixed(0)}%</text>
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════
// FanChart SVG
// ══════════════════════════════════════════════════════════════

interface PdRow {
  age: number;
  rp5?: number; rp25?: number; rp50?: number; rp75?: number; rp95?: number;
  p5?: number; p25?: number; p50?: number; p75?: number; p95?: number;
  [key: string]: unknown;
}

function FanChart({ pD, retAge, lang }: { pD: PdRow[]; retAge: number; lang: Lang }) {
  if (!pD || pD.length < 2) return null;

  const W = 600, H = 260, pad = { l: 56, r: 16, t: 16, b: 36 };
  const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b;

  const ages = pD.map(r => r.age);
  const minAge = Math.min(...ages), maxAge = Math.max(...ages);
  const ageSpan = maxAge - minAge || 1;

  // Use real (inflation-adjusted) values
  const allVals = pD.flatMap(r => [r.rp5 ?? r.p5 ?? 0, r.rp95 ?? r.p95 ?? 0]);
  const maxVal = Math.max(...allVals, 1);

  const x = (age: number) => pad.l + ((age - minAge) / ageSpan) * cw;
  const y = (val: number) => pad.t + ch - (Math.max(0, val) / maxVal) * ch;

  const bandPath = (keyLo: string, keyHi: string) => {
    const fwd = pD.map(r => `${x(r.age)},${y((r[keyHi] as number) ?? 0)}`).join(" ");
    const rev = [...pD].reverse().map(r => `${x(r.age)},${y((r[keyLo] as number) ?? 0)}`).join(" ");
    return `M ${fwd} L ${rev} Z`;
  };

  const linePath = (key: string) =>
    pD.map((r, i) => `${i === 0 ? "M" : "L"} ${x(r.age)},${y((r[key] as number) ?? 0)}`).join(" ");

  // Y-axis ticks
  const yTicks: number[] = [];
  const step = Math.pow(10, Math.floor(Math.log10(maxVal))) / 2;
  for (let v = 0; v <= maxVal; v += step) yTicks.push(v);
  if (yTicks.length < 3) { for (let v = 0; v <= maxVal; v += maxVal / 4) yTicks.push(v); }

  const retX = retAge >= minAge && retAge <= maxAge ? x(retAge) : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 240, display: "block" }}>
      {/* Y axis grid */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={pad.l} y1={y(v)} x2={W - pad.r} y2={y(v)} stroke={EK.border} strokeWidth={0.5} />
          <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" fontSize={10} fill={EK.txMuted} fontFamily="'JetBrains Mono', monospace">
            {v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}K` : String(Math.round(v))}
          </text>
        </g>
      ))}
      {/* Retirement marker */}
      {retX != null && (
        <g>
          <line x1={retX} y1={pad.t} x2={retX} y2={H - pad.b} stroke={EK.gold} strokeWidth={1} strokeDasharray="4,4" />
          <text x={retX} y={H - pad.b + 26} textAnchor="middle" fontSize={10} fill={EK.gold} fontFamily="'DM Sans', sans-serif">
            {T("Retraite", "Retirement", lang)}
          </text>
        </g>
      )}
      {/* P5-P95 band */}
      <path d={bandPath("rp5", "rp95")} fill={EK.marine} opacity={0.08} />
      {/* P25-P75 band */}
      <path d={bandPath("rp25", "rp75")} fill={EK.marine} opacity={0.15} />
      {/* P50 median line */}
      <path d={linePath("rp50")} fill="none" stroke={EK.marine} strokeWidth={2.5} strokeLinecap="round" />
      {/* X axis labels */}
      {pD.filter((_, i) => i % Math.max(1, Math.floor(pD.length / 8)) === 0 || i === pD.length - 1).map(r => (
        <text key={r.age} x={x(r.age)} y={H - pad.b + 14} textAnchor="middle" fontSize={10} fill={EK.txMuted} fontFamily="'JetBrains Mono', monospace">
          {r.age}
        </text>
      ))}
      {/* Legend */}
      <rect x={W - pad.r - 140} y={pad.t + 2} width={136} height={50} rx={4} fill={EK.card} fillOpacity={0.9} stroke={EK.border} strokeWidth={0.5} />
      <rect x={W - pad.r - 132} y={pad.t + 10} width={18} height={8} rx={2} fill={EK.marine} opacity={0.08} />
      <text x={W - pad.r - 110} y={pad.t + 18} fontSize={9} fill={EK.txDim} fontFamily="'DM Sans', sans-serif">P5 - P95</text>
      <rect x={W - pad.r - 132} y={pad.t + 24} width={18} height={8} rx={2} fill={EK.marine} opacity={0.15} />
      <text x={W - pad.r - 110} y={pad.t + 32} fontSize={9} fill={EK.txDim} fontFamily="'DM Sans', sans-serif">P25 - P75</text>
      <line x1={W - pad.r - 132} y1={pad.t + 40} x2={W - pad.r - 114} y2={pad.t + 40} stroke={EK.marine} strokeWidth={2.5} />
      <text x={W - pad.r - 110} y={pad.t + 44} fontSize={9} fill={EK.txDim} fontFamily="'DM Sans', sans-serif">{T("Médiane", "Median", lang)} (P50)</text>
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════
// Driver Attribution (AMF-compliant observational phrases)
// ══════════════════════════════════════════════════════════════

function getDriverPhrase(results: SimResults, params: Record<string, unknown>, lang: Lang): string {
  const succ = results.successRate;
  const retAge = (params.retAge as number) || 65;
  const age = (params.age as number) || 40;
  const horizon = retAge - age;
  const retSpM = (params.retSpM as number) || 4000;
  const rrsp = (params.rrsp as number) || 0;
  const tfsa = (params.tfsa as number) || 0;
  const nr = (params.nr as number) || 0;
  const totalSavings = rrsp + tfsa + nr;
  const sal = (params.sal as number) || 0;
  const savingsRatio = sal > 0 ? totalSavings / sal : 0;

  if (succ >= 0.90) {
    return lang === "fr"
      ? "Le taux de réussite élevé pourrait refléter un bon équilibre entre épargne et dépenses prévues."
      : "The high success rate could reflect a good balance between savings and planned spending.";
  }
  if (horizon < 15 && savingsRatio < 3) {
    return lang === "fr"
      ? `L'horizon de ${horizon} ans avant la retraite, combiné à l'épargne actuelle, pourrait limiter la croissance du capital.`
      : `The ${horizon}-year horizon before retirement, combined with current savings, could limit capital growth.`;
  }
  if (retSpM > 6000 && succ < 0.70) {
    return lang === "fr"
      ? `Les dépenses mensuelles prévues de ${f$(retSpM)} à la retraite représentent un facteur déterminant dans ces résultats.`
      : `The planned monthly retirement spending of ${f$(retSpM)} is a determining factor in these results.`;
  }
  if (succ < 0.55) {
    return lang === "fr"
      ? "Les données indiquent que le taux de retrait prévu pourrait être un facteur limitant."
      : "The data indicates that the planned withdrawal rate could be a limiting factor.";
  }
  return lang === "fr"
    ? "Les résultats dépendent de l'interaction entre l'épargne, les dépenses et l'horizon de retraite."
    : "Results depend on the interaction between savings, spending, and retirement horizon.";
}

// ══════════════════════════════════════════════════════════════
// Skeleton loader
// ══════════════════════════════════════════════════════════════

function Skeleton({ height = 200 }: { height?: number }) {
  return (
    <div style={{
      height, background: `linear-gradient(90deg, ${EK.sable} 25%, ${EK.bg} 50%, ${EK.sable} 75%)`,
      backgroundSize: "200% 100%", borderRadius: 8, animation: "shimmer 1.5s infinite",
    }} />
  );
}

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

interface SimResults {
  successRate: number;
  grade: string;
  medianWealth: number;
  percentiles: { p5: number; p10: number; p25: number; p50: number; p75: number; p90: number; p95: number };
  liquidWealth: { median: number; p5: number; p25: number; p75: number; p95: number };
  estate: { medianTax: number; medianNet: number; p5Net: number; p25Net: number; p75Net: number; p95Net: number };
  ruin: { medianAge: number; pct: number; p5Age: number; p10Age: number };
  yearByYear: PdRow[];
  medRevData: unknown;
  sensitivity: unknown;
  medPath: unknown;
  gk: { on: boolean; avgCuts: number; avgRaises: number; avgSpend: number; p5MinSpend: number } | null;
  histogram: unknown;
  deathVsRuin: unknown;
}

interface AuthProfile {
  authenticated: boolean;
  email?: string;
  tier?: string;
  exportsAI?: number;
  expiry?: string;
  sophistication?: "rapide" | "personnalise" | "avance";
  profile?: {
    profiles?: { id: string; name: string; data: Record<string, unknown>; created: string; lastUsed: string }[];
    quizData?: Record<string, unknown>;
    changelog?: { date: string; action: string; details: Record<string, unknown> }[];
    reportsGenerated?: { id: string; date: string; type: string; blobUrl: string; aiStatus: string }[];
    referralCode?: string;
  };
}

// ── Derive disclosure flags from quiz data (BUG 3 fix) ──
function disclosureFromQuizData(qd: Record<string, unknown>) {
  return {
    couple: qd.cOn === true || qd.couple === "yes",
    homeowner: !!(qd.props && (qd.props as unknown[]).length > 0) || qd.homeowner === true,
    pension: qd.penType !== undefined && qd.penType !== "none",
    ccpc: qd.bizOn === true || qd.ccpc === true,
    taxWorry: !!qd.taxWorry,
    growthRisk: !!qd.growthRisk || (Number(qd.allocR) >= 0.8),
  };
}

// ══════════════════════════════════════════════════════════════
// useSimulation hook
// ══════════════════════════════════════════════════════════════

function useSimulation(params: Record<string, unknown>, token: string, authOk: boolean) {
  const [results, setResults] = useState<SimResults | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const simulate = useCallback(() => {
    if (!token || !authOk) return;

    // Abort previous
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setError(null);

    fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ params, sims: 1000 }),
      signal: controller.signal,
    })
      .then(res => {
        if (!res.ok) throw new Error(res.status === 429 ? "Rate limit exceeded" : `Server error (${res.status})`);
        return res.json();
      })
      .then(data => {
        if (controller.signal.aborted) return;
        if (data.success) {
          setResults(data.results);
          setStatus("idle");
        } else {
          setError(data.error || "Simulation failed");
          setStatus("error");
        }
      })
      .catch(err => {
        if (err.name === "AbortError") return;
        setError(err.message || "Network error");
        setStatus("error");
      });
  }, [params, token, authOk]);

  // 1.5s debounce after param change
  const paramsJson = JSON.stringify(params);
  useEffect(() => {
    if (!authOk || !token) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(simulate, 1500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [paramsJson, simulate, authOk, token]);

  // Cleanup: abort in-flight request on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return { results, status, error };
}

// ══════════════════════════════════════════════════════════════
// Core tabs
// ══════════════════════════════════════════════════════════════

const CORE_TABS = ["diagnostic", "revenus", "projection", "patrimoine", "analyse"] as const;
const CONDITIONAL_TABS = ["couple", "immobilier", "strategie", "entreprise", "fiscalite", "optimiseur"] as const;

const TAB_LABELS: Record<string, { fr: string; en: string }> = {
  diagnostic: { fr: "Diagnostic", en: "Diagnostic" },
  revenus: { fr: "Revenus", en: "Income" },
  projection: { fr: "Projection", en: "Projection" },
  patrimoine: { fr: "Patrimoine", en: "Wealth" },
  analyse: { fr: "Analyse", en: "Analysis" },
  couple: { fr: "Couple", en: "Couple" },
  immobilier: { fr: "Immobilier", en: "Real Estate" },
  strategie: { fr: "Stratégie", en: "Strategy" },
  entreprise: { fr: "Entreprise", en: "Business" },
  fiscalite: { fr: "Fiscalité", en: "Tax" },
  optimiseur: { fr: "Optimiseur", en: "Optimizer" },
};

function getActiveTabs(
  disclosure: { couple: boolean; homeowner: boolean; pension: boolean; ccpc: boolean; taxWorry: boolean; growthRisk: boolean },
  sophistication?: "rapide" | "personnalise" | "avance"
): string[] {
  // rapide mode: only core tabs, no conditional tabs regardless of disclosure
  if (sophistication === "rapide") {
    return [...CORE_TABS];
  }
  // personnalise (default) and avance: disclosure-based conditional tabs
  const tabs: string[] = [...CORE_TABS];
  if (disclosure.couple) tabs.push("couple");
  if (disclosure.homeowner) tabs.push("immobilier");
  if (disclosure.pension) tabs.push("strategie");
  if (disclosure.ccpc) tabs.push("entreprise");
  if (disclosure.taxWorry) tabs.push("fiscalite");
  if (disclosure.growthRisk) tabs.push("optimiseur");
  return tabs;
}

// ── Denied / access-gate screen ────────────────────────────────────
function SimulateurDeniedScreen({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const fr = lang === "fr";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");

  async function handleResend(ev: React.FormEvent) {
    ev.preventDefault();
    if (!email.trim() || status === "sending") return;
    setStatus("sending");
    try {
      await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
    } catch { /* server always returns 200 */ }
    setStatus("sent");
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: EK.bg, fontFamily: "'DM Sans', sans-serif", padding: "40px 24px" }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: EK.marine, fontFamily: "'Newsreader', serif" }}>buildfi.ca</div>
            <div style={{ fontSize: 11, color: EK.gold, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: 2 }}>Simulateur Expert</div>
          </div>
          <button onClick={() => setLang(fr ? "en" : "fr")} style={{ background: "rgba(26,39,68,.08)", border: "none", borderRadius: 6, color: EK.marine, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            {fr ? "EN" : "FR"}
          </button>
        </div>

        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(196,154,26,.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={EK.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: EK.marine, marginBottom: 10, fontFamily: "'Newsreader', serif" }}>
          {fr ? "Accès réservé aux membres Expert" : "Access reserved for Expert members"}
        </h1>
        <p style={{ fontSize: 15, color: EK.txDim, lineHeight: 1.7, marginBottom: 24 }}>
          {fr
            ? "Utilisez le lien dans votre courriel de confirmation pour accéder au simulateur."
            : "Use the link in your confirmation email to access the simulator."}
        </p>

        <a href="/expert/landing" style={{ display: "block", padding: "13px 28px", background: EK.marine, color: "#fff", borderRadius: 8, fontSize: 15, fontWeight: 600, textDecoration: "none", marginBottom: 20 }}>
          {fr ? "Découvrir le simulateur Expert" : "Discover the Expert simulator"}
        </a>

        {/* Resend form */}
        <div style={{ background: EK.card, border: `1px solid ${EK.border}`, borderRadius: 12, padding: "20px 24px", textAlign: "left" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: EK.txDim, marginBottom: 12, textAlign: "center" }}>
            {fr ? "Déjà membre ? Recevez votre lien d'accès." : "Already a member? Get your access link."}
          </div>
          {status === "sent" ? (
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "13px 16px", fontSize: 14, color: EK.green, fontWeight: 600, textAlign: "center" }}>
              {fr ? "Vérifiez votre boîte courriel — si un compte existe, le lien a été envoyé." : "Check your inbox — if an account exists, the link was sent."}
            </div>
          ) : (
            <form onSubmit={handleResend} style={{ display: "flex", gap: 8 }}>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder={fr ? "Votre adresse courriel" : "Your email address"}
                required
                style={{ flex: 1, border: `1px solid ${EK.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 14, outline: "none", color: EK.tx, fontFamily: "'DM Sans', sans-serif" }}
              />
              <button type="submit" disabled={status === "sending"} style={{ background: EK.gold, border: "none", borderRadius: 8, color: "#fff", padding: "10px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" as const }}>
                {status === "sending" ? "..." : (fr ? "Envoyer" : "Send")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN: SimulateurContent (inside Suspense)
// ══════════════════════════════════════════════════════════════

function SimulateurContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";
  // Capture initial token on first render — prevents re-auth after URL cleanup
  const initialTokenRef = useRef(tokenFromUrl);
  if (tokenFromUrl && !initialTokenRef.current) initialTokenRef.current = tokenFromUrl;

  // ── State ──
  const [authStatus, setAuthStatus] = useState<"loading" | "ok" | "denied">("loading");
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [lang, setLang] = useState<Lang>("fr");
  const [params, setParams] = useState<Record<string, unknown>>({ ...DEFAULT_PARAMS });
  const [defaults, setDefaults] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("diagnostic");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["general"]));
  const [showPorteB, setShowPorteB] = useState(false);
  const [showMobileBanner, setShowMobileBanner] = useState(true);
  const [disclosure, setDisclosure] = useState({ couple: false, homeowner: false, pension: false, ccpc: false, taxWorry: false, growthRisk: false });
  // Sophistication level from quiz (BUG 4 fix: rapide = core tabs only, personnalise = disclosure-based, avance = iframe)
  const [sophistication, setSophistication] = useState<"rapide" | "personnalise" | "avance" | undefined>(undefined);
  // Workflow state
  const [activeWorkflow, setActiveWorkflow] = useState<"none" | "tester" | "optimiser" | "bilan">("none");
  const [selectedDecision, setSelectedDecision] = useState<string | null>(null);
  const [compareResults, setCompareResults] = useState<CompareVariant[] | null>(null);
  const [compareStatus, setCompareStatus] = useState<"idle" | "loading" | "error">("idle");
  const [optimizeResults, setOptimizeResults] = useState<OptimizeResults | null>(null);
  const [optimizeStatus, setOptimizeStatus] = useState<"idle" | "loading" | "error">("idle");
  const [showResume, setShowResume] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  // paramSource: tracks where current params came from for the Profile button label
  const [paramSource, setParamSource] = useState<{ type: "quiz" | "preset" | "saved" | "empty"; label: string }>({ type: "empty", label: "" });
  // Guided/Planner mode: simplified React UI vs full planner iframe
  const [viewMode, setViewMode] = useState<"react" | "planner">("react");
  // Planner iframe ref for postMessage bridge
  const plannerRef = useRef<HTMLIFrameElement>(null);
  // Ref always tracking current params — used by bridge so planner always receives latest state
  const paramsRef = useRef<Record<string, unknown>>({ ...DEFAULT_PARAMS });
  // Track quiz params for planner bridge (kept for backward-compat; bridge now uses paramsRef)
  const [quizParamsForPlanner, setQuizParamsForPlanner] = useState<Record<string, unknown> | null>(null);

  const fr = lang === "fr";

  // ── Auth gate ──
  useEffect(() => {
    const tkn = initialTokenRef.current;
    if (!tkn) { setAuthStatus("denied"); return; }
    setToken(tkn);
    fetch(`/api/auth/verify?token=${tkn}`)
      .then(async r => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          console.error("[auth] Verify failed:", r.status, err);
          throw new Error(err.error || "Auth failed");
        }
        return r.json();
      })
      .then(data => {
        if (data.authenticated) {
          setProfile(data);
          setAuthStatus("ok");
          // BUG 4 fix: Store sophistication level for tab routing
          if (data.sophistication) setSophistication(data.sophistication);

          // ── Porte A: Load quiz params into simulator (BUG 1 fix) ──
          const quizData = data.profile?.quizData as Record<string, unknown> | undefined;
          const hasQuizParams = quizData && Object.keys(quizData).length > 0
            && Object.keys(quizData).some(k => k !== "sophistication");

          if (hasQuizParams && quizData) {
            // Map quiz data directly to simulator params (keys match MC param keys from quiz-translator-expert.ts)
            const quizParams: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(quizData)) {
              if (k === "sophistication") continue; // meta field, not a sim param
              quizParams[k] = v;
            }
            // Merge quiz params over defaults (quiz overrides, defaults fill gaps)
            setParams(prev => ({ ...prev, ...quizParams }));
            // Mark all quiz-loaded fields as defaults (shows left-border indicator)
            setDefaults(new Set(Object.keys(quizParams)));
            // Auto-set disclosure flags from quiz data (BUG 3 fix)
            setDisclosure(disclosureFromQuizData(quizData));
            // Store quiz params for planner bridge
            setQuizParamsForPlanner(quizParams);
            // Track source for Profile button label
            setParamSource({ type: "quiz", label: data.email?.split("@")[0] || "Quiz" });
            trackEvent(EVENTS.LAB_PROFILE_LOADED, { source: "quiz" });
            // Skip Porte B modal — user already filled the quiz (Porte A path)
            // Avancé users go straight to full planner
            if (data.sophistication === "avance") {
              setViewMode("planner");
              trackEvent(EVENTS.LAB_PLANNER_OPENED, { source: "auto" });
            }
            // Do NOT show Porte B — quiz data is loaded
          } else {
            // No quiz data — show Porte B preset chooser or planner
            if (data.sophistication === "avance") {
              setViewMode("planner");
              trackEvent(EVENTS.LAB_PLANNER_OPENED, { source: "auto" });
            } else {
              setShowPorteB(true);
            }
            setParamSource({ type: "empty", label: "" });
          }

          // Remove token from URL bar for security (C9 fix)
          const url = new URL(window.location.href);
          url.searchParams.delete("token");
          window.history.replaceState({}, "", url.toString());
        } else {
          setAuthStatus("denied");
        }
      })
      .catch(() => setAuthStatus("denied"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keep paramsRef current so bridge always sends latest React state ──
  useEffect(() => { paramsRef.current = params; }, [params]);

  // ── Planner iframe postMessage bridge (bidirectional) ──
  // Bug fixes:
  //   A) Send current params (paramsRef) not original quiz params — preserves Standard edits
  //   B) No quizParamsForPlanner guard — bridge works for Porte B (preset) users too
  useEffect(() => {
    if (viewMode !== "planner") return;

    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "buildfi-planner-ready") {
        // Planner iframe is ready — send current React state (not original quiz snapshot)
        plannerRef.current?.contentWindow?.postMessage(
          { type: "buildfi-load-params", params: paramsRef.current },
          window.location.origin
        );
      }
      // Receive param updates from planner → merge into React state
      if (e.data?.type === "buildfi-params-update" && e.data.params) {
        const updated = e.data.params as Record<string, unknown>;
        setParams(prev => ({ ...prev, ...updated }));
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [viewMode]);

  // ── useSimulation ──
  const { results, status: simStatus, error: simError } = useSimulation(params, token, authStatus === "ok");

  // ── Param updater (clears default marker) ──
  const setParam = useCallback((key: string, value: unknown) => {
    setParams(prev => ({ ...prev, [key]: value }));
    setDefaults(prev => { const next = new Set(prev); next.delete(key); return next; });
  }, []);

  // ── Load preset ──
  const loadPreset = useCallback((preset: typeof PRESETS[0]) => {
    setParams({ ...preset.params });
    setDisclosure(preset.disclosure);
    setDefaults(new Set(Object.keys(preset.params)));
    setShowPorteB(false);
    setActiveTab("diagnostic");
    setParamSource({ type: "preset", label: preset.fr });
    trackEvent(EVENTS.LAB_PROFILE_LOADED, { source: "preset", presetId: preset.id });
  }, []);

  // ── Sidebar group toggle ──
  const toggleGroup = useCallback((g: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g); else next.add(g);
      return next;
    });
  }, []);

  // ── Active tabs (BUG 4: rapide = core only, personnalise = disclosure-based) ──
  const activeTabs = getActiveTabs(disclosure, sophistication);

  // ── Segment for decision filtering ──
  const detectedSegment = useMemo(() => {
    if (disclosure.ccpc) return "ccpc";
    if ((params.age as number) >= 55 && disclosure.pension) return "preretiree";
    if ((params.retAge as number) <= 50) return "fire";
    return "couple";
  }, [disclosure, params.age, params.retAge]);

  // ── Available decisions for current segment ──
  const availableDecisions = useMemo(() =>
    DECISIONS.filter(d => d.segments.includes(detectedSegment)),
    [detectedSegment]
  );

  // ── Run comparison ──
  const runCompare = useCallback(async (decisionId: string) => {
    const decision = DECISIONS.find(d => d.id === decisionId);
    if (!decision || !token) return;

    setCompareStatus("loading");
    setCompareResults(null);
    setSelectedDecision(decisionId);

    // Build variants with resolved overrides
    const variants = decision.variants.map(v => {
      const overrides: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v.overrides)) {
        if (k === "_delta") {
          // Relative delta: add to current param
          for (const [pk, dv] of Object.entries(val as Record<string, number>)) {
            overrides[pk] = (params[pk] as number || 0) + dv;
          }
        } else if (k === "_delta_pct") {
          // Percentage delta
          for (const [pk, pv] of Object.entries(val as Record<string, number>)) {
            overrides[pk] = Math.round((params[pk] as number || 0) * (1 + pv));
          }
        } else if (k === "_withdrawal_rate") {
          // Convert rate to monthly spending from total savings
          const total = ((params.rrsp as number) || 0) + ((params.tfsa as number) || 0) + ((params.nr as number) || 0);
          overrides.retSpM = Math.round((total * (val as number)) / 12);
        } else {
          overrides[k] = val;
        }
      }
      return { label: fr ? v.label : v.labelEn, overrides };
    });

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ baseParams: params, variants }),
      });
      if (!res.ok) throw new Error(res.status === 429 ? "Rate limit exceeded" : `Server error (${res.status})`);
      const data = await res.json();
      if (data.success) {
        setCompareResults(data.variants);
        setCompareStatus("idle");
        trackEvent(EVENTS.LAB_COMPARE_RUN, { decisionId, variantCount: data.variants?.length ?? 0 });
      } else {
        setCompareStatus("error");
      }
    } catch {
      setCompareStatus("error");
    }
  }, [params, token, fr]);

  // ── Run optimizer ──
  const runOptimize = useCallback(async () => {
    if (!token) return;
    setOptimizeStatus("loading");
    setOptimizeResults(null);
    trackEvent(EVENTS.LAB_OPTIMIZER_RUN, { successRate: results?.successRate ?? 0, leversFound: 0 });

    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ params }),
      });
      if (!res.ok) throw new Error(res.status === 429 ? "Rate limit exceeded" : `Server error (${res.status})`);
      const data = await res.json();
      if (data.success) {
        setOptimizeResults(data);
        setOptimizeStatus("idle");
        trackEvent(EVENTS.LAB_OPTIMIZER_RUN, { successRate: data.baseline?.successRate ?? 0, leversFound: data.levers?.length ?? 0 });
      } else {
        setOptimizeStatus("error");
      }
    } catch {
      setOptimizeStatus("error");
    }
  }, [params, token, results]);

  // ── Loading screen ──
  if (authStatus === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: EK.bg }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: EK.marine, marginBottom: 8, fontFamily: "'Newsreader', serif" }}>buildfi.ca</div>
          <div style={{ fontSize: 14, color: EK.txDim }}>Chargement...</div>
        </div>
      </div>
    );
  }

  // ── Denied screen ──
  if (authStatus === "denied") {
    return <SimulateurDeniedScreen lang={lang} setLang={setLang} />;
  }

  // ══════════════════════════════════════════════════════════════
  // MAIN SIMULATOR UI
  // ══════════════════════════════════════════════════════════════

  return (
    <div style={{ minHeight: "100vh", background: EK.bg, fontFamily: "'DM Sans', sans-serif", color: EK.tx }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,700;0,6..72,800&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* ── Mobile/tablet banner — deliberate responsive policy ── */}
      {showMobileBanner && viewMode === "planner" && (
        <div id="planner-mobile-banner" style={{ display: "none", background: "#7a1c1c", color: "#fff", padding: "10px 16px", fontSize: 13, textAlign: "center", position: "relative" }}>
          <style>{`@media (max-width: 1023px) { #planner-mobile-banner { display: block !important; } }`}</style>
          {fr
            ? "Le Mode Planificateur est optimisé pour ordinateur. Sur tablette ou téléphone, utilisez le Mode Guidé."
            : "Planner Mode is optimized for desktop. On tablet or phone, use Guided Mode instead."}
          <button onClick={() => setShowMobileBanner(false)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer" }} aria-label="Fermer">×</button>
        </div>
      )}
      {showMobileBanner && viewMode !== "planner" && (
        <div id="guided-mobile-banner" style={{ display: "none", background: EK.marine, color: "#fff", padding: "8px 16px", fontSize: 12, textAlign: "center", position: "relative" }}>
          <style>{`@media (max-width: 479px) { #guided-mobile-banner { display: block !important; } }`}</style>
          {fr ? "Mode Guidé — expérience optimale sur tablette ou ordinateur." : "Guided Mode — best experience on tablet or desktop."}
          <button onClick={() => setShowMobileBanner(false)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#fff", fontSize: 16, cursor: "pointer" }} aria-label="Fermer">×</button>
        </div>
      )}

      {/* ── Header ── */}
      <header style={{ background: EK.marine, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <a href={`/expert?token=${token}`} style={{ fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: "'Newsreader', serif", textDecoration: "none" }}>buildfi.ca</a>
          <span style={{ fontSize: 13, color: EK.gold, fontWeight: 600 }}>
            {T("Laboratoire", "Lab", lang)}
          </span>
          {/* Mode indicator pill */}
          <span style={{
            fontSize: 11, fontWeight: 600, color: viewMode === "planner" ? EK.gold : "rgba(255,255,255,0.5)",
            background: viewMode === "planner" ? "rgba(196,154,26,0.15)" : "rgba(255,255,255,0.07)",
            border: `1px solid ${viewMode === "planner" ? "rgba(196,154,26,0.3)" : "rgba(255,255,255,0.12)"}`,
            borderRadius: 10, padding: "2px 8px", letterSpacing: "0.03em",
          }}>
            {viewMode === "planner" ? T("Mode Planificateur", "Planner Mode", lang) : T("Mode Guidé", "Guided Mode", lang)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Profile button — shows source context */}
          <button
            onClick={() => setShowPorteB(true)}
            style={{ background: "none", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, color: "#fff", padding: "4px 12px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            title={paramSource.type !== "empty"
              ? (fr ? `Chargé depuis: ${paramSource.type === "quiz" ? "quiz" : paramSource.type === "preset" ? `profil ${paramSource.label}` : paramSource.label}` : `Loaded from: ${paramSource.type === "quiz" ? "quiz" : paramSource.type === "preset" ? `preset ${paramSource.label}` : paramSource.label}`)
              : (fr ? "Choisir un profil de départ" : "Choose a starting profile")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            {paramSource.type !== "empty"
              ? (paramSource.type === "quiz" ? T("Quiz", "Quiz", lang) : paramSource.label.length > 12 ? paramSource.label.slice(0, 12) + "…" : paramSource.label)
              : T("Profil", "Profile", lang)}
          </button>

          {/* Help button — real panel */}
          <button
            onClick={() => setShowHelp(h => !h)}
            style={{
              background: showHelp ? "rgba(255,255,255,0.12)" : "none",
              border: `1px solid ${showHelp ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.2)"}`,
              borderRadius: 6, color: "#fff", padding: "4px 12px", fontSize: 12, cursor: "pointer",
            }}
          >
            {T("Aide", "Help", lang)}
          </button>

          {/* Mode switch button */}
          <button
            onClick={() => {
              const next = viewMode === "planner" ? "react" : "planner";
              trackEvent(EVENTS.LAB_MODE_SWITCH, { from: viewMode === "planner" ? "planner" : "guided", to: next === "planner" ? "planner" : "guided" });
              if (next === "planner") trackEvent(EVENTS.LAB_PLANNER_OPENED, { source: "mode_switch" });
              setViewMode(next);
            }}
            style={{
              background: viewMode === "planner" ? "rgba(196,154,26,0.2)" : "rgba(255,255,255,0.08)",
              border: `1px solid ${viewMode === "planner" ? EK.gold : "rgba(255,255,255,0.25)"}`,
              borderRadius: 6, color: viewMode === "planner" ? EK.gold : "#fff",
              padding: "4px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
            title={viewMode === "planner"
              ? T("Revenir au Mode Guidé — workflows, analyses, résumé", "Return to Guided Mode — workflows, analysis, summary", lang)
              : T("Ouvrir le Mode Planificateur — contrôle total de 190 paramètres", "Open Planner Mode — full control of 190 parameters", lang)}
          >
            {viewMode === "planner"
              ? T("← Mode Guidé", "← Guided Mode", lang)
              : T("Mode Planificateur →", "Planner Mode →", lang)}
          </button>

          <button
            onClick={() => setLang(l => l === "fr" ? "en" : "fr")}
            style={{ background: EK.gold, border: "none", borderRadius: 6, color: "#fff", padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            {lang === "fr" ? "EN" : "FR"}
          </button>
        </div>
      </header>

      {/* ── Help panel (collapsible below header) ── */}
      {showHelp && viewMode !== "planner" && (
        <div style={{ background: "#132057", borderBottom: `1px solid rgba(255,255,255,0.1)`, padding: "16px 24px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {[
              {
                icon: "⊕",
                title: T("Mode Guidé", "Guided Mode", lang),
                desc: T("Workflows pour tester vos décisions, optimiser automatiquement et générer un Bilan Annuel.", "Workflows to test decisions, auto-optimize, and generate an Annual Assessment.", lang),
              },
              {
                icon: "⊞",
                title: T("Mode Planificateur", "Planner Mode", lang),
                desc: T("Accès complet à 190 paramètres. Idéal pour explorer des hypothèses avancées.", "Full access to 190 parameters. Ideal for exploring advanced assumptions.", lang),
              },
              {
                icon: "◑",
                title: T("Tester une décision", "Test a decision", lang),
                desc: T("Comparez deux ou trois scénarios côte à côte. Ex: RRQ à 60, 65 ou 70 ans.", "Compare two or three scenarios side by side. E.g. CPP at 60, 65, or 70.", lang),
              },
              {
                icon: "↑",
                title: T("Optimiser", "Optimize", lang),
                desc: T("Le modèle explore des milliers de combinaisons et identifie vos leviers les plus impactants.", "The model explores thousands of combinations and identifies your most impactful levers.", lang),
              },
              {
                icon: "▤",
                title: T("Résumé 1 page", "1-Page Summary", lang),
                desc: T("Apparaît après la première simulation. Résumé imprimable de votre plan.", "Appears after the first simulation. Printable plan summary.", lang),
              },
              {
                icon: "↻",
                title: T("Bilan Annuel", "Annual Assessment", lang),
                desc: T("Mise à jour annuelle de votre plan en 7 champs. Génère un rapport comparatif de 9 pages.", "Annual plan update in 7 fields. Generates a 9-page comparative report.", lang),
              },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 10 }}>
                <span style={{ fontSize: 18, color: EK.gold, flexShrink: 0, lineHeight: 1.2 }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 3 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowHelp(false)}
            style={{ display: "block", margin: "12px auto 0", background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer" }}
          >
            {T("Fermer l'aide", "Close help", lang)}
          </button>
        </div>
      )}

      {/* ═══ PLANNER IFRAME MODE (Avancé — 30+ modules, 190 paramètres) ═══ */}
      {viewMode === "planner" ? (
        <iframe
          ref={plannerRef}
          key={`planner-${lang}`}
          src={`/planner-expert.html?lang=${lang}`}
          style={{ width: "100%", height: "calc(100vh - 56px)", border: "none", display: "block" }}
          title={fr ? "Simulateur Expert BuildFi" : "BuildFi Expert Simulator"}
          allow="clipboard-write"
        />
      ) : (
      <>
      {/* ── Workflow buttons ── */}
      <div style={{ background: EK.marine, padding: "0 24px 12px", display: "flex", gap: 8, flexWrap: "wrap" }}>
        {([
          { key: "tester" as const, fr: "Tester une décision", en: "Test a decision" },
          { key: "optimiser" as const, fr: "Optimiser", en: "Optimize" },
          { key: "bilan" as const, fr: "Bilan Annuel", en: "Annual Assessment" },
        ] as const).map(w => (
          <button key={w.key} onClick={() => setActiveWorkflow(activeWorkflow === w.key ? "none" : w.key)} style={{
            background: activeWorkflow === w.key ? "rgba(196,154,26,0.2)" : "rgba(255,255,255,0.08)",
            border: `1px solid ${activeWorkflow === w.key ? EK.gold : "rgba(255,255,255,0.15)"}`, borderRadius: 6,
            color: EK.gold, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", position: "relative",
          }}>
            {T(w.fr, w.en, lang)}
          </button>
        ))}
        {/* Resume 1 page button */}
        {results && (
          <button onClick={() => { setShowResume(true); trackEvent(EVENTS.LAB_SUMMARY_OPENED); }} style={{
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6,
            color: "#fff", padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif", marginLeft: "auto",
          }}>
            {fr ? "Résumé 1 page" : "1-Page Summary"}
          </button>
        )}
      </div>

      {/* ── Workflow Panel (collapsible) ── */}
      {activeWorkflow !== "none" && (
        <div style={{ borderBottom: `1px solid ${EK.border}`, background: EK.card, padding: "16px 24px" }}>
          {activeWorkflow === "tester" && (
            <TesterPanel
              decisions={availableDecisions} selectedDecision={selectedDecision}
              compareResults={compareResults} compareStatus={compareStatus}
              onSelect={runCompare} lang={lang}
            />
          )}
          {activeWorkflow === "optimiser" && (
            <OptimiserPanel
              optimizeResults={optimizeResults} optimizeStatus={optimizeStatus}
              onRun={runOptimize} lang={lang}
              onExplore={(axis, value) => {
                // Apply the best scenario's params for this lever, then switch to diagnostic
                if (optimizeResults?.top10?.[0]?.params_changed) {
                  const best = optimizeResults.top10[0].params_changed;
                  for (const [k, v] of Object.entries(best)) {
                    if (k === "splitP") {
                      setParam("split", (v as number) > 0);
                      setParam("splitP", v);
                    } else if (k === "strat") {
                      setParam("wStrat", v);
                    } else {
                      setParam(k, v);
                    }
                  }
                } else {
                  // Fallback: apply single lever
                  if (axis === "retAge") setParam("retAge", Number(value));
                  else if (axis === "qppAge") setParam("qppAge", Number(value));
                  else if (axis === "oasAge") setParam("oasAge", Number(value));
                  else if (axis === "retSpM") setParam("retSpM", Number(value));
                  else if (axis === "melt") setParam("melt", value === "On");
                  else if (axis === "strat") setParam("wStrat", value);
                  else if (axis === "splitP") { setParam("split", value !== "Off"); setParam("splitP", parseFloat(value) / 100 || 0); }
                  else if (axis === "ptWork") {
                    if (value === "Off") { setParam("ptM", 0); setParam("ptYrs", 0); }
                    else {
                      const m = value.match(/^(\d+)\/m/);
                      const y = value.match(/x\s*(\d+)y/);
                      if (m) setParam("ptM", Number(m[1]));
                      if (y) setParam("ptYrs", Number(y[1]));
                    }
                  }
                }
                setActiveWorkflow("none");
                setActiveTab("diagnostic");
              }}
            />
          )}
          {activeWorkflow === "bilan" && (
            <BilanPanel lang={lang} token={token} params={params} profile={profile} onClose={() => setActiveWorkflow("none")} />
          )}
        </div>
      )}

      {/* ── Main layout: Sidebar + Content ── */}
      <div style={{ display: "flex", minHeight: "calc(100vh - 120px)" }}>

        {/* ═══ SIDEBAR ═══ */}
        <aside style={{ width: 320, minWidth: 320, borderRight: `1px solid ${EK.border}`, background: EK.card, overflowY: "auto", padding: "16px 14px", flexShrink: 0 }}>
          <style>{`@media (max-width: 767px) { aside { display: none !important; } }`}</style>
          <div style={{ fontSize: 13, fontWeight: 700, color: EK.marine, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 12 }}>
            {fr ? "Paramètres" : "Parameters"}
          </div>

          {/* ── General ── */}
          <SidebarGroup title={fr ? "Général" : "General"} expanded={expandedGroups.has("general")} onToggle={() => toggleGroup("general")}>
            <InputRow label={fr ? "Age" : "Age"}>
              <NumInput value={params.age as number} onChange={v => setParam("age", v)} step={1} min={18} max={85} prefix="" isDefault={defaults.has("age")} />
            </InputRow>
            <InputRow label={fr ? "Age de retraite" : "Retirement age"}>
              <NumInput value={params.retAge as number} onChange={v => setParam("retAge", v)} step={1} min={(params.age as number) + 1} max={85} prefix="" isDefault={defaults.has("retAge")} />
            </InputRow>
            <InputRow label="Province">
              <SelectInput value={params.prov as string} onChange={v => setParam("prov", v)}
                options={PROVINCES.map(p => ({ value: p.code, label: fr ? p.fr : p.en }))} />
            </InputRow>
            <InputRow label={fr ? "Sexe" : "Sex"}>
              <SelectInput value={params.sex as string} onChange={v => { setParam("sex", v); setParam("deathAge", v === "F" ? 92 : 90); }}
                options={[{ value: "M", label: fr ? "Homme" : "Male" }, { value: "F", label: fr ? "Femme" : "Female" }]} />
            </InputRow>
          </SidebarGroup>

          {/* ── Revenus ── */}
          <SidebarGroup title={fr ? "Revenus" : "Income"} expanded={expandedGroups.has("revenus")} onToggle={() => toggleGroup("revenus")}>
            <InputRow label={fr ? "Salaire annuel" : "Annual salary"}>
              <NumInput value={params.sal as number} onChange={v => { setParam("sal", v); setParam("avgE", v); }} step={1000} isDefault={defaults.has("sal")} />
            </InputRow>
            <InputRow label={fr ? "Type de pension" : "Pension type"}>
              <SelectInput value={params.penType as string} onChange={v => setParam("penType", v)}
                options={[
                  { value: "none", label: fr ? "Aucune" : "None" },
                  { value: "db", label: fr ? "Prestations déterminées" : "Defined benefit" },
                  { value: "cd", label: fr ? "Cotisations déterminées" : "Defined contribution" },
                ]} />
            </InputRow>
            {(params.penType === "db") && (
              <InputRow label={fr ? "Pension mensuelle" : "Monthly pension"}>
                <NumInput value={params.penM as number} onChange={v => setParam("penM", v)} step={100} isDefault={defaults.has("penM")} />
              </InputRow>
            )}
            <InputRow label={fr ? "Dépenses retraite ($/mois)" : "Retirement spending ($/mo)"}>
              <NumInput value={params.retSpM as number} onChange={v => setParam("retSpM", v)} step={100} isDefault={defaults.has("retSpM")} />
            </InputRow>
          </SidebarGroup>

          {/* ── Épargne ── */}
          <SidebarGroup title={fr ? "Épargne" : "Savings"} expanded={expandedGroups.has("epargne")} onToggle={() => toggleGroup("epargne")}>
            <InputRow label={fr ? "REER" : "RRSP"}>
              <NumInput value={params.rrsp as number} onChange={v => setParam("rrsp", v)} step={1000} isDefault={defaults.has("rrsp")} />
            </InputRow>
            <InputRow label={fr ? "CELI" : "TFSA"}>
              <NumInput value={params.tfsa as number} onChange={v => setParam("tfsa", v)} step={1000} isDefault={defaults.has("tfsa")} />
            </InputRow>
            <InputRow label={fr ? "Non-enregistré" : "Non-registered"}>
              <NumInput value={params.nr as number} onChange={v => { setParam("nr", v); setParam("costBase", v); }} step={1000} isDefault={defaults.has("nr")} />
            </InputRow>
            <InputRow label={fr ? "Cotisation REER/an" : "RRSP contrib/yr"}>
              <NumInput value={params.rrspC as number} onChange={v => setParam("rrspC", v)} step={500} isDefault={defaults.has("rrspC")} />
            </InputRow>
            <InputRow label={fr ? "Cotisation CELI/an" : "TFSA contrib/yr"}>
              <NumInput value={params.tfsaC as number} onChange={v => setParam("tfsaC", v)} step={500} max={7000} isDefault={defaults.has("tfsaC")} />
            </InputRow>
          </SidebarGroup>

          {/* ── Immobilier (conditional) ── */}
          <SidebarGroup title={fr ? "Immobilier" : "Real Estate"} expanded={expandedGroups.has("immobilier")} onToggle={() => toggleGroup("immobilier")}
            badge={disclosure.homeowner ? undefined : (fr ? "Inactif" : "Inactive")}
          >
            <InputRow label={fr ? "Proprietaire" : "Homeowner"}>
              <SelectInput value={disclosure.homeowner ? "yes" : "no"} onChange={v => {
                const ho = v === "yes";
                setDisclosure(d => ({ ...d, homeowner: ho }));
                if (ho && !(params.props as unknown[])?.length) {
                  setParam("props", [{ on: true, name: "Résidence principale", pri: true, val: 400000, mb: 200000, mr: 0.055, ma: 20, ri: 0.035, rm: 0, ox: 0, pt: 0, ins: 0, sa: 0, cg: 0, landPct: 0.30, heloc: 0, helocRate: 0.065, helocMax: 0.65, smithOn: false, refiAge: 0, refiAmt: 0, dsAge: 0, dsAmt: 0, dpaOn: false, dpaRate: 0.04 }]);
                } else if (!ho) {
                  setParam("props", []);
                }
              }} options={[{ value: "no", label: fr ? "Non" : "No" }, { value: "yes", label: fr ? "Oui" : "Yes" }]} />
            </InputRow>
            {disclosure.homeowner && (
              <>
                <InputRow label={fr ? "Valeur propriété" : "Home value"}>
                  <NumInput value={((params.props as Record<string, unknown>[])?.[0]?.val as number) || 0} onChange={v => {
                    const p = [...(params.props as Record<string, unknown>[])];
                    if (p[0]) { p[0] = { ...p[0], val: v }; setParam("props", p); }
                  }} step={10000} />
                </InputRow>
                <InputRow label={fr ? "Hypothèque" : "Mortgage"}>
                  <NumInput value={((params.props as Record<string, unknown>[])?.[0]?.mb as number) || 0} onChange={v => {
                    const p = [...(params.props as Record<string, unknown>[])];
                    if (p[0]) { p[0] = { ...p[0], mb: v }; setParam("props", p); }
                  }} step={5000} />
                </InputRow>
              </>
            )}
          </SidebarGroup>

          {/* ── Couple (conditional) ── */}
          <SidebarGroup title="Couple" expanded={expandedGroups.has("couple")} onToggle={() => toggleGroup("couple")}
            badge={disclosure.couple ? undefined : (fr ? "Inactif" : "Inactive")}
          >
            <InputRow label={fr ? "En couple" : "Couple"}>
              <SelectInput value={disclosure.couple ? "yes" : "no"} onChange={v => {
                const c = v === "yes";
                setDisclosure(d => ({ ...d, couple: c }));
                setParam("cOn", c);
                if (c && !(params.cAge as number)) {
                  setParam("cAge", 40); setParam("cSex", "F"); setParam("cRetAge", 65);
                  setParam("cSal", 50000); setParam("cRRSP", 30000); setParam("cTFSA", 20000);
                  setParam("cNR", 0); setParam("cRetSpM", 2000); setParam("cDeath", 92);
                  setParam("split", true);
                }
              }} options={[{ value: "no", label: fr ? "Non" : "No" }, { value: "yes", label: fr ? "Oui" : "Yes" }]} />
            </InputRow>
            {disclosure.couple && (
              <>
                <InputRow label={fr ? "Age du conjoint" : "Spouse age"}>
                  <NumInput value={params.cAge as number} onChange={v => setParam("cAge", v)} step={1} min={18} max={85} prefix="" />
                </InputRow>
                <InputRow label={fr ? "Revenu conjoint" : "Spouse income"}>
                  <NumInput value={params.cSal as number} onChange={v => setParam("cSal", v)} step={1000} />
                </InputRow>
                <InputRow label={fr ? "REER conjoint" : "Spouse RRSP"}>
                  <NumInput value={params.cRRSP as number} onChange={v => setParam("cRRSP", v)} step={1000} />
                </InputRow>
                <InputRow label={fr ? "CELI conjoint" : "Spouse TFSA"}>
                  <NumInput value={params.cTFSA as number} onChange={v => setParam("cTFSA", v)} step={1000} />
                </InputRow>
              </>
            )}
          </SidebarGroup>

          {/* ── Avancé ── */}
          <SidebarGroup title={fr ? "Avancé" : "Advanced"} expanded={expandedGroups.has("avance")} onToggle={() => toggleGroup("avance")}>
            <InputRow label={fr ? "Allocation actions (%)" : "Equity allocation (%)"}>
              <NumInput value={Math.round((params.allocR as number) * 100)} onChange={v => { const a = v / 100; setParam("allocR", a); setParam("allocT", a); setParam("allocN", Math.max(0.3, a - 0.2)); }} step={5} min={0} max={100} prefix="%" isDefault={defaults.has("allocR")} />
            </InputRow>
            <InputRow label={fr ? "Frais de gestion (%)" : "MER (%)"}>
              <NumInput value={Number(((params.merR as number) * 100).toFixed(2))} onChange={v => { const m = v / 100; setParam("merR", m); setParam("merT", m * 0.5); setParam("merN", m * 0.5); }} step={0.1} min={0} max={5} prefix="%" isDefault={defaults.has("merR")} />
            </InputRow>
            <InputRow label={fr ? "Inflation (%)" : "Inflation (%)"}>
              <NumInput value={Number(((params.inf as number) * 100).toFixed(1))} onChange={v => setParam("inf", v / 100)} step={0.1} min={0} max={10} prefix="%" isDefault={defaults.has("inf")} />
            </InputRow>
          </SidebarGroup>

          {/* ── BUG 19: Recent changes (changelog) ── */}
          {profile?.profile?.changelog && profile.profile.changelog.length > 0 && (
            <SidebarGroup
              title={fr ? "Historique" : "History"}
              expanded={expandedGroups.has("changelog")}
              onToggle={() => toggleGroup("changelog")}
              badge={String(Math.min(5, profile.profile.changelog.length))}
            >
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {[...profile.profile.changelog]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 5)
                  .map((entry, i) => {
                    const d = new Date(entry.date);
                    const dateStr = d.toLocaleDateString(fr ? "fr-CA" : "en-CA", { month: "short", day: "numeric" });
                    const actionLabels: Record<string, { fr: string; en: string }> = {
                      account_created: { fr: "Compte créé", en: "Account created" },
                      export: { fr: "Bilan exporte", en: "Report exported" },
                      "bilan-annuel": { fr: "Bilan Annuel", en: "Annual Assessment" },
                      renewal: { fr: "Renouvellement", en: "Renewal" },
                      profile_saved: { fr: "Profil sauvegardé", en: "Profile saved" },
                      profile_loaded: { fr: "Profil chargé", en: "Profile loaded" },
                      simulate: { fr: "Simulation", en: "Simulation" },
                      addon_purchase: { fr: "Crédit supplémentaire", en: "Addon purchased" },
                      referral_reward: { fr: "Récompense parrainage", en: "Referral reward" },
                      referral_reward_3: { fr: "Parrainage (3e)", en: "Referral (3rd)" },
                      anniversary_6m_sent: { fr: "Rappel 6 mois", en: "6-month reminder" },
                      profile_deleted: { fr: "Profil supprimé", en: "Profile deleted" },
                    };
                    const label = actionLabels[entry.action]
                      ? T(actionLabels[entry.action].fr, actionLabels[entry.action].en, lang)
                      : entry.action;
                    const grade = entry.details?.grade as string | undefined;
                    return (
                      <div key={i} style={{ padding: "6px 0", borderBottom: i < 4 ? `1px solid ${EK.sable}` : "none", fontSize: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: EK.tx, fontWeight: 600 }}>{label}</span>
                          <span style={{ color: EK.txMuted, fontSize: 11 }}>{dateStr}</span>
                        </div>
                        {grade && (
                          <span style={{ fontSize: 10, color: EK.gold, fontWeight: 600 }}>
                            {fr ? "Note" : "Grade"}: {grade}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </SidebarGroup>
          )}
        </aside>

        {/* ═══ MAIN CONTENT ═══ */}
        <main style={{ flex: 1, padding: "16px 24px", overflowY: "auto", minWidth: 0 }}>

          {/* ── Tab bar ── */}
          <div role="tablist" aria-label={fr ? "Sections du simulateur" : "Simulator sections"} style={{ display: "flex", gap: 4, overflowX: "auto", marginBottom: 16, paddingBottom: 4, borderBottom: `1px solid ${EK.border}` }}>
            {activeTabs.map(tab => (
              <button
                key={tab} onClick={() => setActiveTab(tab)}
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`tabpanel-${tab}`}
                id={`tab-${tab}`}
                style={{
                  padding: "8px 16px", fontSize: 13, fontWeight: activeTab === tab ? 700 : 500,
                  color: activeTab === tab ? EK.gold : EK.txDim,
                  background: activeTab === tab ? "rgba(196,154,26,0.08)" : "transparent",
                  border: "none", borderBottom: activeTab === tab ? `2px solid ${EK.gold}` : "2px solid transparent",
                  borderRadius: "6px 6px 0 0", cursor: "pointer", whiteSpace: "nowrap",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {TAB_LABELS[tab] ? T(TAB_LABELS[tab].fr, TAB_LABELS[tab].en, lang) : tab}
              </button>
            ))}
          </div>

          {/* ── Tab content ── */}
          <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
            {renderTab(activeTab, results, simStatus, simError, params, lang, disclosure)}
          </div>
        </main>
      </div>

      {/* ── Footer ── */}
      <footer style={{ borderTop: `1px solid ${EK.border}`, padding: "16px 24px", textAlign: "center", fontSize: 12, color: EK.txMuted }}>
        buildfi.ca &middot; {fr ? "À titre informatif seulement" : "For informational purposes only"}
        <span style={{ margin: "0 8px" }}>|</span>
        <a href="/confidentialite" style={{ color: EK.txMuted, textDecoration: "none" }}>{fr ? "Confidentialité" : "Privacy"}</a>
        <span style={{ margin: "0 8px" }}>|</span>
        <a href="/conditions" style={{ color: EK.txMuted, textDecoration: "none" }}>{fr ? "Conditions" : "Terms"}</a>
      </footer>

      {/* ── Resume 1 page overlay ── */}
      {showResume && results && (
        <ResumeOverlay results={results} params={params} lang={lang} onClose={() => setShowResume(false)} />
      )}

      {/* ── Porte B modal ── */}
      {showPorteB && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
          <div style={{ background: EK.card, borderRadius: 12, maxWidth: 560, width: "100%", padding: "28px 24px", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: EK.marine, marginBottom: 4, fontFamily: "'Newsreader', serif" }}>
              {fr ? "Choisissez un profil" : "Choose a profile"}
            </h2>
            <p style={{ fontSize: 13, color: EK.txDim, marginBottom: 20, lineHeight: 1.5 }}>
              {fr
                ? "Sélectionnez un profil de départ pour explorer le simulateur. Vous pourrez modifier tous les paramètres ensuite."
                : "Select a starting profile to explore the simulator. You can modify all parameters afterwards."}
            </p>

            {/* ── Saved profiles from KV (BUG 2 fix) ── */}
            {profile?.profile?.profiles && profile.profile.profiles.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: EK.marine, marginBottom: 8, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {fr ? "Mes profils sauvegardés" : "My saved profiles"}
                </div>
                {profile.profile.profiles.map(sp => (
                  <button
                    key={sp.id}
                    onClick={() => {
                      const savedData = sp.data as Record<string, unknown>;
                      setParams(prev => ({ ...prev, ...savedData }));
                      setDefaults(new Set(Object.keys(savedData)));
                      // Derive disclosure from saved profile data
                      setDisclosure(disclosureFromQuizData(savedData));
                      setParamSource({ type: "saved", label: sp.name });
                      trackEvent(EVENTS.LAB_PROFILE_LOADED, { source: "saved" });
                      setShowPorteB(false);
                      setActiveTab("diagnostic");
                    }}
                    style={{
                      display: "block", width: "100%", textAlign: "left", padding: "14px 16px", marginBottom: 8,
                      background: EK.card, border: `2px solid ${EK.gold}`, borderRadius: 8, cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: EK.marine }}>{sp.name}</div>
                      <div style={{ fontSize: 11, color: EK.txMuted, fontFamily: "'JetBrains Mono', monospace" }}>
                        {new Date(sp.lastUsed).toLocaleDateString(fr ? "fr-CA" : "en-CA")}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: EK.txDim, marginTop: 2 }}>
                      {fr ? "Profil sauvegardé" : "Saved profile"}
                    </div>
                  </button>
                ))}
                <div style={{ borderBottom: `1px solid ${EK.border}`, margin: "12px 0", opacity: 0.5 }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: EK.marine, marginBottom: 8, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {fr ? "Profils de départ" : "Starter profiles"}
                </div>
              </div>
            )}

            {PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => loadPreset(preset)}
                style={{
                  display: "block", width: "100%", textAlign: "left", padding: "14px 16px", marginBottom: 8,
                  background: EK.bg, border: `1px solid ${EK.border}`, borderRadius: 8, cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 700, color: EK.marine }}>{T(preset.fr, preset.en, lang)}</div>
                <div style={{ fontSize: 12, color: EK.txDim, marginTop: 2 }}>{T(preset.descFr, preset.descEn, lang)}</div>
              </button>
            ))}
            <button onClick={() => setShowPorteB(false)} style={{
              marginTop: 12, width: "100%", padding: "10px 0", background: "none", border: `1px solid ${EK.border}`,
              borderRadius: 8, color: EK.txDim, fontSize: 13, cursor: "pointer",
            }}>
              {fr ? "Fermer" : "Close"}
            </button>
          </div>
        </div>
      )}

      {/* (Workflow panels are inline above main layout, no longer modals) */}
      </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SidebarGroup (collapsible)
// ══════════════════════════════════════════════════════════════

function SidebarGroup({ title, expanded, onToggle, badge, children }: {
  title: string; expanded: boolean; onToggle: () => void; badge?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <button
        onClick={onToggle}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
          padding: "8px 4px", background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: EK.marine }}>
          {expanded ? "\u25BE" : "\u25B8"} {title}
        </span>
        {badge && <span style={{ fontSize: 10, color: EK.txMuted, background: EK.sable, borderRadius: 4, padding: "2px 6px" }}>{badge}</span>}
      </button>
      {expanded && <div style={{ paddingLeft: 8, paddingTop: 4 }}>{children}</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Diagnostic Tab (fully built)
// ══════════════════════════════════════════════════════════════

function DiagnosticTab({ results, simStatus, simError, params, lang }: {
  results: SimResults | null; simStatus: string; simError: string | null; params: Record<string, unknown>; lang: Lang;
}) {
  const fr = lang === "fr";

  if (simStatus === "loading" && !results) {
    return (
      <div>
        <Skeleton height={128} />
        <div style={{ height: 12 }} />
        <Skeleton height={80} />
        <div style={{ height: 12 }} />
        <Skeleton height={240} />
      </div>
    );
  }

  if (simStatus === "error") {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: 24, color: EK.red }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{fr ? "Erreur de simulation" : "Simulation error"}</div>
          <div style={{ fontSize: 13, color: EK.txDim }}>{simError || (fr ? "Veuillez réessayer." : "Please try again.")}</div>
        </div>
      </Card>
    );
  }

  if (!results) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: 40, color: EK.txDim }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{fr ? "Sélectionnez un profil pour commencer" : "Select a profile to begin"}</div>
          <div style={{ fontSize: 13 }}>{fr ? "Utilisez le sélecteur de profil ou modifiez les paramètres." : "Use the profile selector or modify parameters."}</div>
        </div>
      </Card>
    );
  }

  const retAge = (params.retAge as number) || 65;
  const retSpM = (params.retSpM as number) || 4000;
  const sal = (params.sal as number) || 0;
  const rrsp = (params.rrsp as number) || 0;
  const tfsa = (params.tfsa as number) || 0;
  const nr = (params.nr as number) || 0;
  const totalSavings = rrsp + tfsa + nr;
  const allocR = (params.allocR as number) || 0.7;
  const rrspC = (params.rrspC as number) || 0;
  const tfsaC = (params.tfsaC as number) || 0;
  const nrC = (params.nrC as number) || 0;
  const totalContrib = rrspC + tfsaC + nrC;
  const wStrat = (params.wStrat as string) || "optimal";
  const hasProps = (params.props as unknown[])?.length > 0;

  // BUG 8 fix: contextual driver phrase for each KPI
  const successDriver = (() => {
    const savingsRate = sal > 0 ? totalContrib / sal : 0;
    if (results.successRate >= 0.85 && savingsRate >= 0.15)
      return fr ? "Taux d'épargne élevé (" + Math.round(savingsRate * 100) + "%)" : "High savings rate (" + Math.round(savingsRate * 100) + "%)";
    if (results.successRate < 0.60 && retSpM > 5000)
      return fr ? "Dépenses élevées (" + f$(retSpM) + "/mois)" : "High spending (" + f$(retSpM) + "/mo)";
    if (results.successRate < 0.60)
      return fr ? "Épargne ou horizon insuffisant" : "Insufficient savings or horizon";
    return fr ? "Équilibre épargne/dépenses" : "Savings/spending balance";
  })();

  const wealthDriver = (() => {
    if (allocR >= 0.80 && totalContrib >= 15000)
      return fr ? "Allocation croissance + cotisations soutenues" : "Growth allocation + sustained contributions";
    if (allocR >= 0.80)
      return fr ? "Allocation croissance (" + Math.round(allocR * 100) + "% actions)" : "Growth allocation (" + Math.round(allocR * 100) + "% equity)";
    if (totalContrib >= 15000)
      return fr ? "Cotisations annuelles de " + f$(totalContrib) : "Annual contributions of " + f$(totalContrib);
    return fr ? "Portefeuille équilibré" : "Balanced portfolio";
  })();

  const estateDriver = (() => {
    if (hasProps && results.estate.medianNet > 500000)
      return fr ? "Immobilier + comptes enregistrés" : "Real estate + registered accounts";
    if (hasProps)
      return fr ? "Valeur immobilière incluse" : "Property value included";
    if (results.estate.medianNet > totalSavings * 1.5)
      return fr ? "Croissance des placements" : "Investment growth";
    return fr ? "Comptes enregistrés et non-enregistrés" : "Registered and non-registered accounts";
  })();

  const ruinDriver = (() => {
    const ruinPct = results.ruin.pct ?? 0;
    if (ruinPct <= 0.02)
      return fr ? "Marge de sécurité adéquate" : "Adequate safety margin";
    if (wStrat === "optimal")
      return fr ? "Stratégie de retrait optimisée" : "Optimized withdrawal strategy";
    if (ruinPct > 0.15 && retSpM > 5000)
      return fr ? "Taux de retrait élevé relatif au capital" : "High withdrawal rate relative to capital";
    if (ruinPct > 0.10)
      return fr ? "Horizon long ou volatilité élevée" : "Long horizon or high volatility";
    return fr ? "Stratégie de retrait: " + wStrat : "Withdrawal strategy: " + wStrat;
  })();

  const rangeDriver = (() => {
    const spread = results.percentiles.p75 - results.percentiles.p25;
    const median = results.medianWealth || 1;
    const relSpread = spread / Math.abs(median);
    if (allocR >= 0.80 && relSpread > 1.0)
      return fr ? "Dispersion élevée liée à l'allocation actions" : "High dispersion linked to equity allocation";
    if (relSpread > 1.0)
      return fr ? "Large éventail de trajectoires possibles" : "Wide range of possible trajectories";
    if (relSpread < 0.3)
      return fr ? "Trajectoires relativement concentrées" : "Relatively concentrated trajectories";
    return fr ? "Dispersion typique pour ce profil" : "Typical dispersion for this profile";
  })();

  const estateTaxDriver = (() => {
    const taxAmt = results.estate.medianTax ?? 0;
    const netAmt = results.estate.medianNet ?? 0;
    if (taxAmt <= 0)
      return fr ? "Aucun impôt successoral estimé" : "No estimated estate tax";
    const taxRate = netAmt + taxAmt > 0 ? taxAmt / (netAmt + taxAmt) : 0;
    if (taxRate > 0.25)
      return fr ? "Forte proportion de REER/FERR au décès" : "High RRSP/RRIF proportion at death";
    if (taxRate > 0.10)
      return fr ? "Impôt sur les comptes enregistrés au décès" : "Tax on registered accounts at death";
    return fr ? "Charge fiscale modérée au décès" : "Moderate tax burden at death";
  })();

  return (
    <div style={{ opacity: simStatus === "loading" ? 0.6 : 1, transition: "opacity 0.3s" }}>
      {/* ── Grade + KPI row ── */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <GradeRing grade={results.grade} succ={results.successRate} />
          <div style={{ flex: 1, display: "flex", gap: 10, flexWrap: "wrap", minWidth: 0 }}>
            <StatBox
              label={fr ? "Taux de réussite" : "Success rate"}
              value={fPct(results.successRate)}
              color={results.successRate >= 0.75 ? EK.green : results.successRate >= 0.55 ? EK.gold : EK.red}
              sub={successDriver}
            />
            <StatBox
              label={fr ? "Patrimoine médian (réel)" : "Median wealth (real)"}
              value={f$(results.medianWealth)}
              sub={wealthDriver}
            />
            <StatBox
              label={fr ? "Fourchette P25-P75" : "P25-P75 range"}
              value={`${f$(results.percentiles.p25)} - ${f$(results.percentiles.p75)}`}
              sub={rangeDriver}
            />
          </div>
        </div>
      </Card>

      {/* ── Driver attribution ── */}
      <Card>
        <div style={{ fontSize: 12, fontWeight: 600, color: EK.marine, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 6 }}>
          {fr ? "Observation" : "Observation"}
        </div>
        <p style={{ fontSize: 14, color: EK.txDim, lineHeight: 1.7, fontStyle: "italic" }}>
          {getDriverPhrase(results, params, lang)}
        </p>
      </Card>

      {/* ── Fan chart ── */}
      <Card>
        <div style={{ fontSize: 16, fontWeight: 700, color: EK.marine, marginBottom: 12, fontFamily: "'Newsreader', serif" }}>
          {fr ? "Projection du patrimoine ($ réels)" : "Wealth projection (real $)"}
        </div>
        {results.yearByYear && results.yearByYear.length > 0 ? (
          <FanChart pD={results.yearByYear} retAge={retAge} lang={lang} />
        ) : (
          <Skeleton height={240} />
        )}
      </Card>

      {/* ── Estate + Ruin KPIs ── */}
      <Card>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatBox
            label={fr ? "Succession nette (médiane)" : "Net estate (median)"}
            value={f$(results.estate.medianNet)}
            sub={estateDriver}
          />
          <StatBox
            label={fr ? "Impôt successoral (médiane)" : "Estate tax (median)"}
            value={f$(results.estate.medianTax)}
            color={EK.red}
            sub={estateTaxDriver}
          />
          <StatBox
            label={fr ? "Risque de ruine" : "Ruin risk"}
            value={fPct(results.ruin.pct ?? 0)}
            color={(results.ruin.pct ?? 0) > 0.10 ? EK.red : EK.green}
            sub={ruinDriver}
          />
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Tab Router
// ══════════════════════════════════════════════════════════════

function renderTab(
  tab: string, results: SimResults | null, simStatus: string, simError: string | null,
  params: Record<string, unknown>, lang: Lang,
  disclosure: { couple: boolean; homeowner: boolean; pension: boolean; ccpc: boolean; taxWorry: boolean; growthRisk: boolean }
) {
  const sharedProps = { results, simStatus, simError, params, lang };
  if (tab === "diagnostic") return <DiagnosticTab {...sharedProps} />;
  // All other tabs need results
  if (simStatus === "loading" && !results) return <div><Skeleton height={128} /><div style={{ height: 12 }} /><Skeleton height={240} /></div>;
  if (!results) return <Card style={{ textAlign: "center", padding: 40 }}><div style={{ fontSize: 14, color: EK.txDim }}>{lang === "fr" ? "Sélectionnez un profil pour commencer." : "Select a profile to begin."}</div></Card>;
  const tp = { results, params, lang };
  if (tab === "revenus") return <RevenusTab {...tp} />;
  if (tab === "projection") return <ProjectionTab {...tp} />;
  if (tab === "patrimoine") return <PatrimoineTab {...tp} />;
  if (tab === "analyse") return <AnalyseTab {...tp} />;
  if (tab === "couple") return <CoupleTab {...tp} />;
  if (tab === "immobilier") return <ImmobilierTab {...tp} />;
  if (tab === "strategie") return <StrategieTab {...tp} />;
  if (tab === "entreprise") return <EntrepriseTab {...tp} />;
  if (tab === "fiscalite") return <FiscaliteTab {...tp} />;
  if (tab === "optimiseur") return <OptimiseurTab {...tp} />;
  return null;
}

type TabProps = { results: SimResults; params: Record<string, unknown>; lang: Lang };
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 16, fontWeight: 700, color: EK.marine, marginBottom: 12, fontFamily: "'Newsreader', serif" }}>{children}</div>
);

// ══════════════════════════════════════════════════════════════
// Revenus Tab — Income sources stacked area + KPIs
// ══════════════════════════════════════════════════════════════

function RevenusTab({ results, params, lang }: TabProps) {
  const fr = lang === "fr";
  const retAge = (params.retAge as number) || 65;
  const retSpM = (params.retSpM as number) || 4000;
  const sal = (params.sal as number) || 0;
  const mrd = results.medRevData as { age: number; rrq: number; psv: number; srg: number; pen: number; pt: number; ret: number }[] | null;

  // KPIs
  const annualSpend = retSpM * 12;
  const replacementRate = sal > 0 ? Math.round((annualSpend / sal) * 100) : 0;

  // Filter retirement years
  const retData = mrd ? mrd.filter(r => r.age >= retAge) : [];
  const govYear1 = retData.length > 0 ? (retData[0].rrq || 0) + (retData[0].psv || 0) + (retData[0].srg || 0) + (retData[0].pen || 0) : 0;
  const govCoverage = annualSpend > 0 ? Math.round((govYear1 / annualSpend) * 100) : 0;

  // Stacked area SVG
  const W = 700, H = 260;
  const pad = { t: 20, r: 20, b: 35, l: 55 };

  return (
    <div style={{ opacity: 1 }}>
      {/* KPI row */}
      <Card>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatBox label={fr ? "Taux de remplacement" : "Replacement rate"} value={`${replacementRate}%`} color={replacementRate > 100 ? EK.red : EK.green} />
          <StatBox label={fr ? "Couverture gouvernementale" : "Government coverage"} value={`${govCoverage}%`} color={govCoverage > 40 ? EK.green : EK.gold} />
          <StatBox label={fr ? "Revenus gouv. an 1" : "Gov income year 1"} value={f$(govYear1)} />
          <StatBox label={fr ? "Dépenses annuelles" : "Annual spending"} value={f$(annualSpend)} />
        </div>
      </Card>

      {/* Stacked area chart */}
      <Card>
        <SectionTitle>{fr ? "Sources de revenus à la retraite" : "Retirement income sources"}</SectionTitle>
        {retData.length > 2 ? (() => {
          const keys = ["rrq", "psv", "srg", "pen", "pt", "ret"] as const;
          const colors = ["#3b82f6", "#22c55e", "#a855f7", "#f59e0b", "#06b6d4", "#ef4444"];
          const labels = fr
            ? ["RRQ/RPC", "PSV/SV", "SRG/GIS", "Pension", "Travail partiel", "Retraits"]
            : ["CPP/QPP", "OAS", "GIS", "Pension", "Part-time", "Withdrawals"];
          const maxY = Math.max(1, ...retData.map(r => keys.reduce((s, k) => s + (r[k] || 0), 0)));
          const x = (age: number) => pad.l + ((age - retData[0].age) / Math.max(1, retData[retData.length - 1].age - retData[0].age)) * (W - pad.l - pad.r);
          const y = (v: number) => pad.t + (1 - v / maxY) * (H - pad.t - pad.b);

          // Build stacked paths
          const areas: string[] = [];
          for (let ki = keys.length - 1; ki >= 0; ki--) {
            const pts: string[] = [];
            const ptsBot: string[] = [];
            for (const r of retData) {
              const xp = x(r.age);
              let cumTop = 0;
              for (let j = 0; j <= ki; j++) cumTop += (r[keys[j]] || 0);
              let cumBot = 0;
              for (let j = 0; j < ki; j++) cumBot += (r[keys[j]] || 0);
              pts.push(`${xp},${y(cumTop)}`);
              ptsBot.unshift(`${xp},${y(cumBot)}`);
            }
            areas[ki] = `M${pts.join("L")}L${ptsBot.join("L")}Z`;
          }

          return (
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
              {areas.map((d, i) => <path key={i} d={d} fill={colors[i]} opacity={0.7} />)}
              {/* Y axis labels */}
              {[0, 0.25, 0.5, 0.75, 1].map(f => (
                <g key={f}>
                  <line x1={pad.l} y1={y(maxY * f)} x2={W - pad.r} y2={y(maxY * f)} stroke={EK.border} strokeWidth={0.5} strokeDasharray={f > 0 ? "3,3" : "0"} />
                  <text x={pad.l - 6} y={y(maxY * f) + 4} textAnchor="end" fontSize={9} fill={EK.txMuted} fontFamily="'JetBrains Mono', monospace">{f$(maxY * f)}</text>
                </g>
              ))}
              {/* X axis labels */}
              {retData.filter((_, i) => i % Math.max(1, Math.floor(retData.length / 6)) === 0).map(r => (
                <text key={r.age} x={x(r.age)} y={H - pad.b + 14} textAnchor="middle" fontSize={10} fill={EK.txMuted} fontFamily="'JetBrains Mono', monospace">{r.age}</text>
              ))}
              {/* Legend */}
              {labels.map((l, i) => (
                <g key={i} transform={`translate(${pad.l + i * 95}, ${H - 6})`}>
                  <rect width={10} height={6} rx={1} fill={colors[i]} opacity={0.7} />
                  <text x={13} y={6} fontSize={8} fill={EK.txDim} fontFamily="'DM Sans', sans-serif">{l}</text>
                </g>
              ))}
            </svg>
          );
        })() : <Skeleton height={200} />}
      </Card>

      {/* Income table */}
      {retData.length > 0 && (
        <Card>
          <SectionTitle>{fr ? "Détail par âge" : "Detail by age"}</SectionTitle>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${EK.border}` }}>
                  {[fr ? "Age" : "Age", "RRQ/CPP", "PSV/OAS", "SRG/GIS", fr ? "Pension" : "Pension", fr ? "Retraits" : "Withdrawals", "Total"].map(h => (
                    <th key={h} style={{ padding: "6px 8px", textAlign: "right", color: EK.txDim, fontWeight: 600, fontSize: 10 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {retData.filter((_, i) => i % (retData.length > 20 ? 2 : 1) === 0).map(r => {
                  const total = (r.rrq || 0) + (r.psv || 0) + (r.srg || 0) + (r.pen || 0) + (r.pt || 0) + (r.ret || 0);
                  return (
                    <tr key={r.age} style={{ borderBottom: `1px solid ${EK.sable}` }}>
                      <td style={{ padding: "5px 8px", fontWeight: 600, color: EK.marine }}>{r.age}</td>
                      <td style={{ padding: "5px 8px", textAlign: "right" }}>{f$(r.rrq || 0)}</td>
                      <td style={{ padding: "5px 8px", textAlign: "right" }}>{f$(r.psv || 0)}</td>
                      <td style={{ padding: "5px 8px", textAlign: "right" }}>{f$(r.srg || 0)}</td>
                      <td style={{ padding: "5px 8px", textAlign: "right" }}>{f$(r.pen || 0)}</td>
                      <td style={{ padding: "5px 8px", textAlign: "right", color: (r.ret || 0) > 0 ? EK.red : EK.txDim }}>{f$(r.ret || 0)}</td>
                      <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700 }}>{f$(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Projection Tab — Year-by-year table with percentile selector
// ══════════════════════════════════════════════════════════════

function ProjectionTab({ results, params, lang }: TabProps) {
  const fr = lang === "fr";
  const [pctKey, setPctKey] = useState<"p5" | "p25" | "p50" | "p75" | "p95">("p50");
  const retAge = (params.retAge as number) || 65;
  const pD = results.yearByYear || [];

  const pctLabels: Record<string, string> = { p5: "P5", p25: "P25", p50: fr ? "Médiane" : "Median", p75: "P75", p95: "P95" };

  return (
    <div>
      {/* Percentile selector */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: EK.txDim, marginRight: 8 }}>{fr ? "Percentile:" : "Percentile:"}</span>
          {(["p5", "p25", "p50", "p75", "p95"] as const).map(k => (
            <button key={k} onClick={() => setPctKey(k)} style={{
              padding: "4px 12px", fontSize: 12, fontWeight: pctKey === k ? 700 : 500,
              background: pctKey === k ? EK.marine : EK.sable, color: pctKey === k ? "#fff" : EK.tx,
              border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
            }}>
              {pctLabels[k]}
            </button>
          ))}
        </div>
      </Card>

      {/* Projection table */}
      <Card>
        <SectionTitle>{fr ? "Projection annuelle" : "Year-by-year projection"}</SectionTitle>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${EK.border}` }}>
                {[fr ? "Age" : "Age", fr ? "Patrimoine" : "Wealth", "RRSP", "TFSA", fr ? "Non-enr." : "Non-reg", fr ? "Dépenses" : "Spending"].map(h => (
                  <th key={h} style={{ padding: "6px 6px", textAlign: "right", color: EK.txDim, fontWeight: 600, fontSize: 10, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pD.map((r) => {
                const rr = Number(r[`rr_${pctKey}`] ?? r["mp_rr"] ?? 0);
                const tf = Number(r[`tf_${pctKey}`] ?? r["mp_tf"] ?? 0);
                const nr = Number(r[`nr_${pctKey}`] ?? r["mp_nr"] ?? 0);
                const total = Number(r[`total_${pctKey}`]) || (rr + tf + nr);
                const spend = Number(r[`sp_${pctKey}`] ?? r["mp_spend"] ?? 0);
                const isRetAge = r.age === retAge;
                return (
                  <tr key={r.age} style={{
                    borderBottom: `1px solid ${EK.sable}`,
                    background: isRetAge ? "rgba(196,154,26,0.06)" : "transparent",
                    borderLeft: isRetAge ? `3px solid ${EK.gold}` : "3px solid transparent",
                  }}>
                    <td style={{ padding: "4px 6px", fontWeight: isRetAge ? 700 : 500, color: EK.marine }}>{r.age}</td>
                    <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700, color: Number(total) <= 0 ? EK.red : EK.tx }}>{f$(Number(total))}</td>
                    <td style={{ padding: "4px 6px", textAlign: "right" }}>{f$(Number(rr))}</td>
                    <td style={{ padding: "4px 6px", textAlign: "right" }}>{f$(Number(tf))}</td>
                    <td style={{ padding: "4px 6px", textAlign: "right" }}>{f$(Number(nr))}</td>
                    <td style={{ padding: "4px 6px", textAlign: "right", color: EK.txDim }}>{f$(Number(spend))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Patrimoine Tab — Wealth composition + estate
// ══════════════════════════════════════════════════════════════

function PatrimoineTab({ results, params, lang }: TabProps) {
  const fr = lang === "fr";
  const pD = results.yearByYear || [];
  const retAge = (params.retAge as number) || 65;
  const cOn = !!params.cOn;

  // Account balances
  const rrsp = (params.rrsp as number) || 0;
  const tfsa = (params.tfsa as number) || 0;
  const nr = (params.nr as number) || 0;
  const totalNow = rrsp + tfsa + nr + ((params.liraBal as number) || 0);

  // Stacked area chart for wealth composition
  const W = 700, H = 280;
  const pad = { t: 20, r: 20, b: 35, l: 60 };

  const keys = ["mp_rr", "mp_tf", "mp_nr"] as const;
  const colors = ["#3b82f6", "#22c55e", "#a855f7"];
  const labels = fr ? ["REER/FERR", "CELI", "Non-enregistré"] : ["RRSP/RRIF", "TFSA", "Non-registered"];

  // Add couple accounts if applicable
  const allKeys = cOn ? [...keys, "mp_crr" as const, "mp_ctf" as const] : keys;
  const allColors = cOn ? [...colors, "#60a5fa", "#4ade80"] : colors;
  const allLabels = cOn ? [...labels, fr ? "REER conjoint" : "Spouse RRSP", fr ? "CELI conjoint" : "Spouse TFSA"] : labels;

  return (
    <div>
      {/* Current balances */}
      <Card>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatBox label="RRSP/REER" value={f$(rrsp)} />
          <StatBox label="TFSA/CELI" value={f$(tfsa)} />
          <StatBox label={fr ? "Non-enregistré" : "Non-registered"} value={f$(nr)} />
          <StatBox label="Total" value={f$(totalNow)} color={EK.marine} />
        </div>
      </Card>

      {/* Wealth composition chart */}
      <Card>
        <SectionTitle>{fr ? "Évolution du patrimoine (médiane)" : "Wealth trajectory (median)"}</SectionTitle>
        {pD.length > 2 ? (() => {
          const maxY = Math.max(1, ...pD.map((r) => {
            let s = 0; for (const k of allKeys) s += (Number(r[k]) || 0); return s;
          }));
          const ages = pD;
          const x = (i: number) => pad.l + (i / (ages.length - 1)) * (W - pad.l - pad.r);
          const y = (v: number) => pad.t + (1 - v / maxY) * (H - pad.t - pad.b);

          const areas: string[] = [];
          for (let ki = allKeys.length - 1; ki >= 0; ki--) {
            const pts: string[] = []; const ptsBot: string[] = [];
            ages.forEach((r, idx) => {
              let cumTop = 0; for (let j = 0; j <= ki; j++) cumTop += Math.max(0, Number(r[allKeys[j]]) || 0);
              let cumBot = 0; for (let j = 0; j < ki; j++) cumBot += Math.max(0, Number(r[allKeys[j]]) || 0);
              pts.push(`${x(idx)},${y(cumTop)}`);
              ptsBot.unshift(`${x(idx)},${y(cumBot)}`);
            });
            areas[ki] = `M${pts.join("L")}L${ptsBot.join("L")}Z`;
          }

          const retIdx = ages.findIndex(r => r.age >= retAge);
          return (
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
              {areas.map((d, i) => <path key={i} d={d} fill={allColors[i]} opacity={0.65} />)}
              {retIdx > 0 && <line x1={x(retIdx)} y1={pad.t} x2={x(retIdx)} y2={H - pad.b} stroke={EK.gold} strokeWidth={1.5} strokeDasharray="4,4" />}
              {[0, 0.25, 0.5, 0.75, 1].map(f => (
                <text key={f} x={pad.l - 6} y={y(maxY * f) + 4} textAnchor="end" fontSize={9} fill={EK.txMuted} fontFamily="'JetBrains Mono', monospace">{f$(maxY * f)}</text>
              ))}
              {ages.filter((_, i) => i % Math.max(1, Math.floor(ages.length / 8)) === 0).map((r, _, __, idx = ages.indexOf(r)) => (
                <text key={r.age} x={x(idx)} y={H - pad.b + 14} textAnchor="middle" fontSize={10} fill={EK.txMuted} fontFamily="'JetBrains Mono', monospace">{r.age}</text>
              ))}
              {allLabels.map((l, i) => (
                <g key={i} transform={`translate(${pad.l + i * 110}, ${H - 6})`}>
                  <rect width={10} height={6} rx={1} fill={allColors[i]} opacity={0.65} />
                  <text x={13} y={6} fontSize={8} fill={EK.txDim} fontFamily="'DM Sans', sans-serif">{l}</text>
                </g>
              ))}
            </svg>
          );
        })() : <Skeleton height={220} />}
      </Card>

      {/* Estate summary */}
      <Card>
        <SectionTitle>{fr ? "Succession" : "Estate"}</SectionTitle>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatBox label={fr ? "Succession nette (médiane)" : "Net estate (median)"} value={f$(results.estate.medianNet)} />
          <StatBox label={fr ? "Impôt successoral" : "Estate tax"} value={f$(results.estate.medianTax)} color={EK.red} />
          <StatBox label={fr ? "P25 - P75" : "P25 - P75"} value={`${f$(results.estate.p25Net)} - ${f$(results.estate.p75Net)}`} />
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Analyse Tab — Tornado + Histogram + Death vs Ruin
// ══════════════════════════════════════════════════════════════

function AnalyseTab({ results, params, lang }: TabProps) {
  const fr = lang === "fr";
  const sens = results.sensitivity as { name: string; lo: number; hi: number }[] | null;
  const hist = results.histogram as { bin: number; count: number }[] | null;
  const dvr = results.deathVsRuin as { age: number; alive: number; ruined: number }[] | null;

  return (
    <div>
      {/* Tornado chart */}
      <Card>
        <SectionTitle>{fr ? "Analyse de sensibilité (Tornado)" : "Sensitivity analysis (Tornado)"}</SectionTitle>
        <p style={{ fontSize: 12, color: EK.txDim, marginBottom: 16 }}>{fr ? "Impact sur le taux de réussite (±1 écart-type)" : "Impact on success rate (±1 std dev)"}</p>
        {sens && sens.length > 0 ? (
          <div>
            {sens.slice(0, 8).map((s, i) => {
              const maxAbs = Math.max(0.01, ...sens.map(x => Math.max(Math.abs(x.lo), Math.abs(x.hi))));
              const barW = 280;
              const loW = (Math.abs(s.lo) / maxAbs) * (barW / 2);
              const hiW = (s.hi / maxAbs) * (barW / 2);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: i < sens.length - 1 ? `1px solid ${EK.sable}` : "none" }}>
                  <div style={{ width: 100, fontSize: 11, fontWeight: 600, color: EK.tx, textAlign: "right", flexShrink: 0 }}>{s.name}</div>
                  <div style={{ width: barW, display: "flex", alignItems: "center", position: "relative" as const }}>
                    {/* Center line */}
                    <div style={{ position: "absolute" as const, left: barW / 2, top: 0, bottom: 0, width: 1, background: EK.border }} />
                    {/* Lo bar (left, red) */}
                    <div style={{ position: "absolute" as const, right: barW / 2, width: loW, height: 16, background: EK.red, opacity: 0.6, borderRadius: "4px 0 0 4px" }} />
                    {/* Hi bar (right, green) */}
                    <div style={{ position: "absolute" as const, left: barW / 2, width: hiW, height: 16, background: EK.green, opacity: 0.6, borderRadius: "0 4px 4px 0" }} />
                  </div>
                  <div style={{ fontSize: 10, color: EK.txDim, fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" as const }}>
                    {(s.lo * 100).toFixed(1)}% / +{(s.hi * 100).toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        ) : <div style={{ fontSize: 13, color: EK.txDim }}>{fr ? "Données de sensibilité non disponibles." : "Sensitivity data not available."}</div>}
      </Card>

      {/* Top sensitivity diagnosis */}
      {sens && sens.length > 0 && (
        <Card>
          <SectionTitle>{fr ? "Facteurs les plus impactants" : "Most impactful factors"}</SectionTitle>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {sens.slice(0, 3).map((s, i) => {
              const impact = Math.max(Math.abs(s.lo), s.hi);
              const medal = ["#c0392b", "#e67e22", "#f1c40f"][i];
              return (
                <div key={i} style={{ flex: 1, minWidth: 150, background: EK.bg, borderRadius: 8, padding: 14, borderLeft: `4px solid ${medal}` }}>
                  <div style={{ fontSize: 11, color: EK.txMuted, marginBottom: 4 }}>#{i + 1}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: EK.marine }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: EK.txDim, fontFamily: "'JetBrains Mono', monospace" }}>
                    {fr ? "Impact:" : "Impact:"} ±{(impact * 100).toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Histogram */}
      <Card>
        <SectionTitle>{fr ? "Distribution du patrimoine final" : "Terminal wealth distribution"}</SectionTitle>
        {hist && hist.length > 0 ? (() => {
          const maxC = Math.max(1, ...hist.map(h => h.count));
          const W2 = 600, H2 = 180;
          const barW2 = (W2 - 60) / hist.length;
          return (
            <svg viewBox={`0 0 ${W2} ${H2}`} width="100%" style={{ display: "block" }}>
              {hist.map((h, i) => {
                const bh = (h.count / maxC) * (H2 - 40);
                return (
                  <g key={i}>
                    <rect x={30 + i * barW2} y={H2 - 25 - bh} width={Math.max(1, barW2 - 1)} height={bh} fill={h.bin < 0 ? EK.red : EK.marine} opacity={0.6} rx={1} />
                    {i % Math.max(1, Math.floor(hist.length / 8)) === 0 && (
                      <text x={30 + i * barW2 + barW2 / 2} y={H2 - 8} textAnchor="middle" fontSize={8} fill={EK.txMuted} fontFamily="'JetBrains Mono', monospace">{f$(h.bin)}</text>
                    )}
                  </g>
                );
              })}
            </svg>
          );
        })() : <div style={{ fontSize: 13, color: EK.txDim }}>{fr ? "Histogramme non disponible." : "Histogram not available."}</div>}
      </Card>

      {/* Death vs Ruin */}
      <Card>
        <SectionTitle>{fr ? "Décès vs épuisement" : "Death vs ruin"}</SectionTitle>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <StatBox label={fr ? "Risque de ruine" : "Ruin risk"} value={fPct(results.ruin.pct ?? 0)} color={(results.ruin.pct ?? 0) > 0.10 ? EK.red : EK.green} />
          {results.ruin.medianAge > 0 && <StatBox label={fr ? "Âge médian de ruine" : "Median ruin age"} value={`${results.ruin.medianAge}`} color={EK.red} />}
        </div>
        {dvr && dvr.length > 0 ? (() => {
          const W3 = 600, H3 = 160;
          const barW3 = (W3 - 60) / dvr.length;
          const maxV = Math.max(1, ...dvr.map(d => d.alive + d.ruined));
          return (
            <svg viewBox={`0 0 ${W3} ${H3}`} width="100%" style={{ display: "block" }}>
              {dvr.map((d, i) => {
                const totalH = ((d.alive + d.ruined) / maxV) * (H3 - 35);
                const ruinH = (d.ruined / maxV) * (H3 - 35);
                return (
                  <g key={i}>
                    <rect x={30 + i * barW3} y={H3 - 20 - totalH} width={Math.max(1, barW3 - 1)} height={totalH - ruinH} fill={EK.marine} opacity={0.5} rx={1} />
                    <rect x={30 + i * barW3} y={H3 - 20 - ruinH} width={Math.max(1, barW3 - 1)} height={ruinH} fill={EK.red} opacity={0.6} rx={1} />
                    {i % Math.max(1, Math.floor(dvr.length / 8)) === 0 && (
                      <text x={30 + i * barW3 + barW3 / 2} y={H3 - 6} textAnchor="middle" fontSize={8} fill={EK.txMuted} fontFamily="'JetBrains Mono', monospace">{d.age}</text>
                    )}
                  </g>
                );
              })}
              <g transform={`translate(${W3 - 140}, 10)`}>
                <rect width={8} height={8} fill={EK.marine} opacity={0.5} /><text x={12} y={8} fontSize={9} fill={EK.txDim}>{fr ? "Solvable" : "Solvent"}</text>
                <rect y={14} width={8} height={8} fill={EK.red} opacity={0.6} /><text x={12} y={22} fontSize={9} fill={EK.txDim}>{fr ? "Épuisé" : "Ruined"}</text>
              </g>
            </svg>
          );
        })() : <div style={{ fontSize: 13, color: EK.txDim }}>{fr ? "Données non disponibles." : "Data not available."}</div>}
      </Card>

      {/* Guardrails */}
      {results.gk && results.gk.on && (
        <Card>
          <SectionTitle>{fr ? "Guardrails Guyton-Klinger" : "Guyton-Klinger guardrails"}</SectionTitle>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <StatBox label={fr ? "Coupes moyennes" : "Avg cuts"} value={results.gk.avgCuts.toFixed(1)} color={EK.red} />
            <StatBox label={fr ? "Hausses moyennes" : "Avg raises"} value={results.gk.avgRaises.toFixed(1)} color={EK.green} />
            <StatBox label={fr ? "Dépenses moyennes" : "Avg spending"} value={f$(results.gk.avgSpend)} />
            <StatBox label={fr ? "Min depenses P5" : "Min spending P5"} value={f$(results.gk.p5MinSpend)} color={EK.gold} />
          </div>
        </Card>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Couple Tab — Spouse comparison + account split
// ══════════════════════════════════════════════════════════════

function CoupleTab({ results, params, lang }: TabProps) {
  const fr = lang === "fr";
  const cAge = (params.cAge as number) || 0;
  const cRetAge = (params.cRetAge as number) || 65;
  const cSal = (params.cSal as number) || 0;
  const cRRSP = (params.cRRSP as number) || 0;
  const cTFSA = (params.cTFSA as number) || 0;
  const cNR = (params.cNR as number) || 0;
  const cRetSpM = (params.cRetSpM as number) || 0;
  const age = (params.age as number) || 0;
  const sal = (params.sal as number) || 0;
  const rrsp = (params.rrsp as number) || 0;
  const tfsa = (params.tfsa as number) || 0;
  const nrP = (params.nr as number) || 0;
  const retSpM = (params.retSpM as number) || 0;
  const splitOn = !!params.split;
  const splitP = (params.splitP as number) || 0;

  const totalP = rrsp + tfsa + nrP;
  const totalS = cRRSP + cTFSA + cNR;

  return (
    <div>
      {/* Side-by-side comparison */}
      <Card>
        <SectionTitle>{fr ? "Comparaison du couple" : "Couple comparison"}</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            { label: fr ? "Personne 1" : "Person 1", age, sal, rrsp, tfsa, nr: nrP, retSpM, total: totalP },
            { label: fr ? "Conjoint(e)" : "Spouse", age: cAge, sal: cSal, rrsp: cRRSP, tfsa: cTFSA, nr: cNR, retSpM: cRetSpM, total: totalS },
          ].map((p, i) => (
            <div key={i} style={{ background: EK.bg, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: EK.marine, marginBottom: 12 }}>{p.label}</div>
              {[
                [fr ? "Age" : "Age", String(p.age)],
                [fr ? "Salaire" : "Salary", f$(p.sal)],
                ["REER/RRSP", f$(p.rrsp)],
                ["CELI/TFSA", f$(p.tfsa)],
                [fr ? "Non-enr." : "Non-reg", f$(p.nr)],
                [fr ? "Dépenses/mois" : "Spending/mo", f$(p.retSpM)],
                ["Total", f$(p.total)],
              ].map(([k, v], j) => (
                <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: j < 6 ? `1px solid ${EK.sable}` : "none", fontSize: 12 }}>
                  <span style={{ color: EK.txDim }}>{k}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: j === 6 ? 700 : 400 }}>{v}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>

      {/* Combined summary */}
      <Card>
        <SectionTitle>{fr ? "Ménage combiné" : "Combined household"}</SectionTitle>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatBox label={fr ? "Épargne totale" : "Total savings"} value={f$(totalP + totalS)} color={EK.marine} />
          <StatBox label={fr ? "Dépenses menage/mois" : "Household spending/mo"} value={f$(retSpM + cRetSpM)} />
          <StatBox label={fr ? "Fractionnement" : "Pension splitting"} value={splitOn ? `${Math.round(splitP * 100)}%` : "Off"} color={splitOn ? EK.green : EK.txDim} />
        </div>
      </Card>

      {/* Observation */}
      <Card>
        <div style={{ fontSize: 12, fontWeight: 600, color: EK.marine, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 6 }}>
          {fr ? "Observation" : "Observation"}
        </div>
        <p style={{ fontSize: 14, color: EK.txDim, lineHeight: 1.7, fontStyle: "italic" }}>
          {totalS > totalP * 1.5
            ? (fr ? "L'épargne du conjoint représente une part significative du patrimoine du ménage. La stratégie de retrait pourrait tenir compte de cet écart."
                  : "Spouse savings represent a significant portion of household wealth. The withdrawal strategy could account for this gap.")
            : totalP > totalS * 3
            ? (fr ? "Un écart important existe entre les deux épargnes. Le fractionnement du revenu de retraite pourrait influencer l'efficacité fiscale."
                  : "A significant gap exists between the two savings. Retirement income splitting could influence tax efficiency.")
            : (fr ? "Les épargnes du ménage sont relativement équilibrées entre les deux conjoints."
                  : "Household savings are relatively balanced between both spouses.")}
        </p>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Immobilier Tab — Real estate properties
// ══════════════════════════════════════════════════════════════

function ImmobilierTab({ results, params, lang }: TabProps) {
  const fr = lang === "fr";
  const props = (params.props as { on: boolean; name: string; val: number; mb: number; mr: number; ma: number; ri: number; rm: number; pri: boolean }[] | null) || [];
  const activeProps = props.filter(p => p.on);

  const totalValue = activeProps.reduce((s, p) => s + (p.val || 0), 0);
  const totalMortgage = activeProps.reduce((s, p) => s + (p.mb || 0), 0);
  const netEquity = totalValue - totalMortgage;

  return (
    <div>
      {/* Portfolio summary */}
      <Card>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatBox label={fr ? "Valeur totale" : "Total value"} value={f$(totalValue)} />
          <StatBox label={fr ? "Hypothèques" : "Mortgages"} value={f$(totalMortgage)} color={EK.red} />
          <StatBox label={fr ? "Avoir net immobilier" : "Net real estate equity"} value={f$(netEquity)} color={EK.green} />
        </div>
      </Card>

      {/* Property cards */}
      {activeProps.map((p, i) => {
        const equity = (p.val || 0) - (p.mb || 0);
        const monthlyPayment = p.mb > 0 && p.mr > 0 && p.ma > 0
          ? (p.mb * (p.mr / 12)) / (1 - Math.pow(1 + p.mr / 12, -p.ma * 12))
          : 0;
        const appreciation10y = p.val * Math.pow(1 + (p.ri || 0.035), 10) - p.val;

        return (
          <Card key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: EK.marine }}>{p.name || `${fr ? "Propriété" : "Property"} ${i + 1}`}</div>
                <div style={{ fontSize: 11, color: EK.txMuted }}>{p.pri ? (fr ? "Résidence principale" : "Primary residence") : (fr ? "Locatif" : "Rental")}</div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: EK.green, fontFamily: "'JetBrains Mono', monospace" }}>{f$(equity)}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                [fr ? "Valeur" : "Value", f$(p.val || 0)],
                [fr ? "Hypothèque" : "Mortgage", f$(p.mb || 0)],
                [fr ? "Taux" : "Rate", `${((p.mr || 0) * 100).toFixed(2)}%`],
                [fr ? "Paiement/mois" : "Payment/mo", f$(Math.round(monthlyPayment))],
                [fr ? "Appréciation" : "Appreciation", `${((p.ri || 0) * 100).toFixed(1)}%/an`],
                [fr ? "Gain 10 ans" : "10-yr gain", f$(Math.round(appreciation10y))],
                ...(p.rm > 0 ? [[fr ? "Loyer/mois" : "Rent/mo", f$(p.rm)]] : []),
              ].map(([k, v], j) => (
                <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
                  <span style={{ color: EK.txDim }}>{k}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </Card>
        );
      })}

      {activeProps.length === 0 && (
        <Card style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 14, color: EK.txDim }}>{fr ? "Aucune propriété configurée dans les paramètres." : "No properties configured in parameters."}</div>
        </Card>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Strategie Tab — Withdrawal strategy + meltdown
// ══════════════════════════════════════════════════════════════

function StrategieTab({ results, params, lang }: TabProps) {
  const fr = lang === "fr";
  const wStrat = String(params.wStrat || "optimal");
  const melt = !!params.melt;
  const meltTgt = (params.meltTgt as number) || 0;
  const qppAge = (params.qppAge as number) || 65;
  const oasAge = (params.oasAge as number) || 65;
  const penType = String(params.penType || "none");
  const penM = (params.penM as number) || 0;
  const splitOn = !!params.split;

  const stratLabels: Record<string, { fr: string; en: string; desc: string; descEn: string }> = {
    optimal: { fr: "Optimal", en: "Optimal", desc: "Retire dans l'ordre le plus fiscalement efficient.", descEn: "Withdraws in the most tax-efficient order." },
    optimized: { fr: "Optimisé", en: "Optimized", desc: "Similaire à optimal avec ajustements annuels.", descEn: "Similar to optimal with annual adjustments." },
    tfsaFirst: { fr: "CELI d'abord", en: "TFSA first", desc: "Retire le CELI en premier pour préserver la croissance libre d'impôt.", descEn: "Withdraws TFSA first to preserve tax-free growth." },
  };

  return (
    <div>
      {/* Current strategy */}
      <Card>
        <SectionTitle>{fr ? "Stratégie de décaissement" : "Withdrawal strategy"}</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {Object.entries(stratLabels).map(([key, s]) => (
            <div key={key} style={{
              background: key === wStrat ? "rgba(196,154,26,0.08)" : EK.bg,
              border: `2px solid ${key === wStrat ? EK.gold : EK.border}`,
              borderRadius: 10, padding: 14,
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: key === wStrat ? EK.gold : EK.marine, marginBottom: 4 }}>
                {fr ? s.fr : s.en} {key === wStrat && " ✓"}
              </div>
              <div style={{ fontSize: 12, color: EK.txDim, lineHeight: 1.5 }}>{fr ? s.desc : s.descEn}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Key parameters */}
      <Card>
        <SectionTitle>{fr ? "Paramètres clés" : "Key parameters"}</SectionTitle>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatBox label={fr ? "REER Meltdown" : "RRSP Meltdown"} value={melt ? `${f$(meltTgt)}/an` : "Off"} color={melt ? EK.gold : EK.txDim} />
          <StatBox label="RRQ/CPP" value={`${fr ? "Age" : "Age"} ${qppAge}`} />
          <StatBox label="PSV/OAS" value={`${fr ? "Age" : "Age"} ${oasAge}`} />
          {penType !== "none" && <StatBox label={fr ? "Pension" : "Pension"} value={`${f$(penM)}/mois`} color={EK.green} />}
          {splitOn && <StatBox label={fr ? "Fractionnement" : "Splitting"} value={`${Math.round((params.splitP as number || 0) * 100)}%`} color={EK.green} />}
        </div>
      </Card>

      {/* Observation */}
      <Card>
        <div style={{ fontSize: 12, fontWeight: 600, color: EK.marine, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 6 }}>
          {fr ? "Observation" : "Observation"}
        </div>
        <p style={{ fontSize: 14, color: EK.txDim, lineHeight: 1.7, fontStyle: "italic" }}>
          {melt
            ? (fr ? `La stratégie de meltdown REER vise un retrait accéléré de ${f$(meltTgt)}/an pour réduire la charge fiscale future. Cette approche pourrait être favorable si les taux marginaux actuels sont plus bas qu'à la retraite.`
                  : `The RRSP meltdown strategy targets accelerated withdrawals of ${f$(meltTgt)}/yr to reduce future tax burden. This approach could be favorable if current marginal rates are lower than in retirement.`)
            : (fr ? "La stratégie de retrait actuelle suit l'ordre optimal standard. L'utilisation de l'outil 'Optimiser' pourrait révéler des combinaisons plus efficaces."
                  : "The current withdrawal strategy follows the standard optimal order. Using the 'Optimize' tool could reveal more efficient combinations.")}
        </p>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Entreprise Tab — CCPC/Business dashboard
// ══════════════════════════════════════════════════════════════

function EntrepriseTab({ results, params, lang }: TabProps) {
  const fr = lang === "fr";
  const bizRevenue = (params.bizRevenue as number) || 0;
  const bizExpenses = (params.bizExpenses as number) || 0;
  const bizRetainedEarnings = (params.bizRetainedEarnings as number) || 0;
  const bizSalaryPct = (params.bizSalaryPct as number) || 0.5;
  const bizRemun = String(params.bizRemun || "mix");
  const sal = (params.sal as number) || 0;
  const ippOn = !!params.ippOn;
  const ippBal = (params.ippBal as number) || 0;

  const netIncome = bizRevenue - bizExpenses;
  const salaryPortion = Math.round(netIncome * bizSalaryPct);
  const dividendPortion = netIncome - salaryPortion;

  const remunLabels: Record<string, string> = {
    salary: fr ? "Salaire seulement" : "Salary only",
    dividend: fr ? "Dividendes seulement" : "Dividends only",
    mix: fr ? "Mixte" : "Mixed",
  };

  return (
    <div>
      {/* Business KPIs */}
      <Card>
        <SectionTitle>{fr ? "Tableau de bord corporatif" : "Corporate dashboard"}</SectionTitle>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatBox label={fr ? "Revenus bruts" : "Gross revenue"} value={f$(bizRevenue)} />
          <StatBox label={fr ? "Dépenses" : "Expenses"} value={f$(bizExpenses)} color={EK.red} />
          <StatBox label={fr ? "Revenu net" : "Net income"} value={f$(netIncome)} color={EK.green} />
          <StatBox label={fr ? "Bénéfices non répartis" : "Retained earnings"} value={f$(bizRetainedEarnings)} color={EK.marine} />
        </div>
      </Card>

      {/* Remuneration strategy */}
      <Card>
        <SectionTitle>{fr ? "Stratégie de rémunération" : "Compensation strategy"}</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={{ background: EK.bg, borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 12, color: EK.txMuted, marginBottom: 4 }}>{fr ? "Mode actuel" : "Current mode"}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: EK.marine }}>{remunLabels[bizRemun] || bizRemun}</div>
          </div>
          <div style={{ background: EK.bg, borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 12, color: EK.txMuted, marginBottom: 4 }}>{fr ? "Salaire déclaré" : "Declared salary"}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: EK.marine }}>{f$(sal)}</div>
          </div>
        </div>
        {bizRemun === "mix" && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <StatBox label={fr ? "Part salaire" : "Salary portion"} value={`${Math.round(bizSalaryPct * 100)}% (${f$(salaryPortion)})`} />
            <StatBox label={fr ? "Part dividendes" : "Dividend portion"} value={`${Math.round((1 - bizSalaryPct) * 100)}% (${f$(dividendPortion)})`} />
          </div>
        )}
      </Card>

      {/* IPP */}
      {ippOn && (
        <Card>
          <SectionTitle>{fr ? "Régime de pension individuel (RPI)" : "Individual Pension Plan (IPP)"}</SectionTitle>
          <StatBox label={fr ? "Solde RPI" : "IPP balance"} value={f$(ippBal)} color={EK.marine} />
        </Card>
      )}

      {/* Observation */}
      <Card>
        <div style={{ fontSize: 12, fontWeight: 600, color: EK.marine, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 6 }}>
          {fr ? "Observation" : "Observation"}
        </div>
        <p style={{ fontSize: 14, color: EK.txDim, lineHeight: 1.7, fontStyle: "italic" }}>
          {bizRetainedEarnings > 500000
            ? (fr ? "Les bénéfices non répartis importants pourraient offrir une flexibilité significative pour la planification de la retraite. L'extraction optimale dépend du taux marginal personnel."
                  : "Significant retained earnings could offer substantial flexibility for retirement planning. Optimal extraction depends on personal marginal rate.")
            : (fr ? "La stratégie de rémunération actuelle influence directement les cotisations REER et RRQ admissibles. L'équilibre salaire-dividendes pourrait être exploré."
                  : "The current compensation strategy directly influences RRSP and CPP contribution eligibility. The salary-dividend balance could be explored.")}
        </p>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Fiscalite Tab — Tax brackets + efficiency
// ══════════════════════════════════════════════════════════════

function FiscaliteTab({ results, params, lang }: TabProps) {
  const fr = lang === "fr";
  const prov = String(params.prov || "QC");
  const sal = (params.sal as number) || 0;
  const retSpM = (params.retSpM as number) || 0;
  const melt = !!params.melt;
  const oasAge = (params.oasAge as number) || 65;
  const isQC = prov === "QC";

  // Federal brackets 2026
  const fedBrackets = [
    { limit: 58523, rate: 0.15 }, { limit: 117045, rate: 0.205 },
    { limit: 181440, rate: 0.26 }, { limit: 258482, rate: 0.29 },
    { limit: Infinity, rate: 0.33 },
  ];

  // Estimate marginal rate
  let margRate = 0;
  for (const b of fedBrackets) { if (sal <= b.limit) { margRate = b.rate; break; } }
  const provRate = isQC ? 0.2575 : prov === "ON" ? 0.0505 : prov === "AB" ? 0.10 : prov === "BC" ? 0.0506 : 0.10;
  const combinedMarg = margRate + provRate;

  return (
    <div>
      {/* Current tax situation */}
      <Card>
        <SectionTitle>{fr ? "Situation fiscale actuelle" : "Current tax situation"}</SectionTitle>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatBox label={fr ? "Taux marginal combiné" : "Combined marginal rate"} value={`${(combinedMarg * 100).toFixed(1)}%`} color={combinedMarg > 0.45 ? EK.red : EK.gold} />
          <StatBox label={fr ? "Taux federal" : "Federal rate"} value={`${(margRate * 100).toFixed(1)}%`} />
          <StatBox label={fr ? "Taux provincial" : "Provincial rate"} value={`${(provRate * 100).toFixed(1)}%`} />
          <StatBox label={fr ? "Province" : "Province"} value={prov} color={EK.marine} />
        </div>
      </Card>

      {/* Tax optimization features */}
      <Card>
        <SectionTitle>{fr ? "Leviers fiscaux actifs" : "Active tax levers"}</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { label: fr ? "REER Meltdown" : "RRSP Meltdown", active: melt, desc: fr ? "Retrait accéléré pour réduire l'impôt futur" : "Accelerated withdrawal to reduce future tax" },
            { label: fr ? "Report PSV/OAS" : "OAS deferral", active: oasAge > 65, desc: fr ? `Report à ${oasAge} ans — augmente la prestation de ${((oasAge - 65) * 7.2).toFixed(1)}%` : `Deferred to age ${oasAge} — increases benefit by ${((oasAge - 65) * 7.2).toFixed(1)}%` },
            { label: fr ? "Fractionnement" : "Income splitting", active: !!params.split, desc: fr ? "Répartition du revenu de retraite entre conjoints" : "Retirement income split between spouses" },
          ].map((l, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: l.active ? "rgba(26,122,76,0.06)" : EK.bg, borderRadius: 8, border: `1px solid ${l.active ? EK.green : EK.border}` }}>
              <div style={{ width: 24, height: 24, borderRadius: 12, background: l.active ? EK.green : EK.sable, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: l.active ? "#fff" : EK.txMuted }}>
                {l.active ? "✓" : "—"}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: l.active ? EK.green : EK.txDim }}>{l.label}</div>
                <div style={{ fontSize: 11, color: EK.txMuted }}>{l.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Estate tax */}
      <Card>
        <SectionTitle>{fr ? "Impôt successoral estimé" : "Estimated estate tax"}</SectionTitle>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatBox label={fr ? "Impôt (médiane)" : "Tax (median)"} value={f$(results.estate.medianTax)} color={EK.red} />
          <StatBox label={fr ? "Succession nette" : "Net estate"} value={f$(results.estate.medianNet)} color={EK.green} />
          <StatBox label={fr ? "Fourchette P5-P95" : "P5-P95 range"} value={`${f$(results.estate.p5Net)} - ${f$(results.estate.p95Net)}`} />
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Optimiseur Tab — Links to optimizer workflow
// ══════════════════════════════════════════════════════════════

function OptimiseurTab({ results, params, lang }: TabProps) {
  const fr = lang === "fr";
  const sens = results.sensitivity as { name: string; lo: number; hi: number }[] | null;

  return (
    <div>
      {/* Top sensitivity factors */}
      {sens && sens.length > 0 && (
        <Card>
          <SectionTitle>{fr ? "Facteurs de sensibilité" : "Sensitivity factors"}</SectionTitle>
          <p style={{ fontSize: 12, color: EK.txDim, marginBottom: 12 }}>{fr ? "Les paramètres qui influencent le plus votre taux de réussite:" : "Parameters that most influence your success rate:"}</p>
          {sens.slice(0, 5).map((s, i) => {
            const impact = Math.max(Math.abs(s.lo), s.hi);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0", borderBottom: `1px solid ${EK.sable}` }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: EK.gold, fontFamily: "'JetBrains Mono', monospace", width: 24, textAlign: "center" }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: EK.marine }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: EK.txDim }}>
                    {fr ? "Impact:" : "Impact:"} <span style={{ color: EK.red }}>{(s.lo * 100).toFixed(1)}%</span> / <span style={{ color: EK.green }}>+{(s.hi * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {/* Call to action */}
      <Card style={{ textAlign: "center", padding: 32, background: `linear-gradient(135deg, rgba(26,39,68,0.03), rgba(196,154,26,0.05))` }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: EK.marine, marginBottom: 8, fontFamily: "'Newsreader', serif" }}>
          {fr ? "Optimiseur automatique" : "Automatic optimizer"}
        </div>
        <p style={{ fontSize: 14, color: EK.txDim, lineHeight: 1.7, maxWidth: 400, margin: "0 auto 16px" }}>
          {fr
            ? "L'optimiseur teste des milliers de combinaisons de paramètres et identifie les leviers les plus impactants."
            : "The optimizer tests thousands of parameter combinations and identifies the most impactful levers."}
        </p>
        <div style={{ fontSize: 13, color: EK.gold, fontWeight: 600 }}>
          {fr ? "Utilisez le bouton 'Optimiser' dans la barre de workflows ci-dessus." : "Use the 'Optimize' button in the workflow bar above."}
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TesterPanel — "Tester une decision" workflow
// ══════════════════════════════════════════════════════════════

function TesterPanel({ decisions, selectedDecision, compareResults, compareStatus, onSelect, lang }: {
  decisions: DecisionDef[]; selectedDecision: string | null;
  compareResults: CompareVariant[] | null; compareStatus: string;
  onSelect: (id: string) => void; lang: Lang;
}) {
  const fr = lang === "fr";
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, color: EK.marine, marginBottom: 8, fontFamily: "'Newsreader', serif" }}>
        {fr ? "Tester une décision" : "Test a decision"}
      </div>
      <p style={{ fontSize: 13, color: EK.txDim, marginBottom: 12, lineHeight: 1.5 }}>
        {fr
          ? "Sélectionnez une décision pour comparer les scénarios. Le modèle explore 1 000 trajectoires par variante."
          : "Select a decision to compare scenarios. The model explores 1,000 trajectories per variant."}
      </p>

      {/* Decision selector */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {decisions.map(d => (
          <button
            key={d.id}
            onClick={() => onSelect(d.id)}
            disabled={compareStatus === "loading"}
            style={{
              padding: "8px 14px", borderRadius: 6, fontSize: 13, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
              background: selectedDecision === d.id ? EK.marine : EK.bg,
              color: selectedDecision === d.id ? "#fff" : EK.tx,
              border: `1px solid ${selectedDecision === d.id ? EK.marine : EK.border}`,
              opacity: compareStatus === "loading" ? 0.6 : 1,
            }}
          >
            {fr ? d.fr : d.en}
          </button>
        ))}
      </div>

      {/* Loading */}
      {compareStatus === "loading" && (
        <div style={{ textAlign: "center", padding: 20 }}>
          <Skeleton height={60} />
          <div style={{ fontSize: 13, color: EK.txDim, marginTop: 8 }}>
            {fr ? "Simulation en cours..." : "Running simulation..."}
          </div>
        </div>
      )}

      {/* Error */}
      {compareStatus === "error" && (
        <div style={{ textAlign: "center", padding: 16, color: EK.red, fontSize: 14 }}>
          {fr ? "Erreur lors de la comparaison. Veuillez réessayer." : "Comparison error. Please try again."}
        </div>
      )}

      {/* Results table */}
      {compareResults && compareStatus === "idle" && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${EK.border}` }}>
                <th style={{ textAlign: "left", padding: "8px 12px", color: EK.txDim, fontWeight: 600 }}>{fr ? "Scénario" : "Scenario"}</th>
                <th style={{ textAlign: "center", padding: "8px 12px", color: EK.txDim, fontWeight: 600 }}>{fr ? "Note" : "Grade"}</th>
                <th style={{ textAlign: "center", padding: "8px 12px", color: EK.txDim, fontWeight: 600 }}>{fr ? "Réussite" : "Success"}</th>
                <th style={{ textAlign: "right", padding: "8px 12px", color: EK.txDim, fontWeight: 600 }}>{fr ? "Patrimoine médian" : "Median wealth"}</th>
                <th style={{ textAlign: "right", padding: "8px 12px", color: EK.txDim, fontWeight: 600 }}>{fr ? "Succession nette" : "Net estate"}</th>
              </tr>
            </thead>
            <tbody>
              {compareResults.map((v, i) => {
                const best = compareResults.reduce((a, b) => a.successRate > b.successRate ? a : b);
                const isBest = v === best;
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${EK.border}`, background: isBest ? "rgba(26,122,76,0.04)" : "transparent" }}>
                    <td style={{ padding: "10px 12px", fontWeight: isBest ? 700 : 400 }}>
                      {v.label}
                      {isBest && <span style={{ marginLeft: 6, fontSize: 10, color: EK.green, fontWeight: 700 }}>{fr ? "Meilleur" : "Best"}</span>}
                    </td>
                    <td style={{ textAlign: "center", padding: "10px 12px", fontWeight: 700, color: EK.marine, fontFamily: "'JetBrains Mono', monospace" }}>{v.grade}</td>
                    <td style={{ textAlign: "center", padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace", color: v.successRate >= 0.75 ? EK.green : v.successRate >= 0.55 ? EK.gold : EK.red }}>
                      {fPct(v.successRate)}
                    </td>
                    <td style={{ textAlign: "right", padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace" }}>{f$(v.medianWealth)}</td>
                    <td style={{ textAlign: "right", padding: "10px 12px", fontFamily: "'JetBrains Mono', monospace" }}>{f$(v.medianEstateNet)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Delta callout */}
          {compareResults.length >= 2 && (() => {
            const sorted = [...compareResults].sort((a, b) => b.successRate - a.successRate);
            const delta = Math.round((sorted[0].successRate - sorted[sorted.length - 1].successRate) * 100);
            if (delta <= 0) return null;
            return (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(26,122,76,0.06)", borderRadius: 6, border: `1px solid rgba(26,122,76,0.15)`, fontSize: 13, color: EK.txDim }}>
                {fr
                  ? `L'écart entre les scénarios pourrait atteindre ${delta} points de pourcentage de taux de réussite.`
                  : `The gap between scenarios could reach ${delta} percentage points in success rate.`}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// OptimiserPanel — "Optimiser automatiquement" workflow
// ══════════════════════════════════════════════════════════════

function OptimiserPanel({ optimizeResults, optimizeStatus, onRun, onExplore, lang }: {
  optimizeResults: OptimizeResults | null; optimizeStatus: string;
  onRun: () => void; onExplore: (axis: string, value: string) => void; lang: Lang;
}) {
  const fr = lang === "fr";
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: EK.marine, fontFamily: "'Newsreader', serif" }}>
          {fr ? "Optimiser automatiquement" : "Auto-optimize"}
        </div>
        <button
          onClick={onRun}
          disabled={optimizeStatus === "loading"}
          style={{
            padding: "8px 20px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: EK.marine, color: "#fff", border: "none",
            opacity: optimizeStatus === "loading" ? 0.6 : 1,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {optimizeStatus === "loading"
            ? (fr ? "Analyse en cours..." : "Analyzing...")
            : (fr ? "Lancer l'analyse" : "Run analysis")}
        </button>
      </div>
      <p style={{ fontSize: 13, color: EK.txDim, marginBottom: 12, lineHeight: 1.5 }}>
        {fr
          ? "Le modèle explore 8 axes et des milliers de combinaisons pour identifier les leviers les plus impactants."
          : "The model explores 8 axes and thousands of combinations to identify the most impactful levers."}
      </p>

      {/* Loading */}
      {optimizeStatus === "loading" && (
        <div>
          <Skeleton height={40} />
          <div style={{ height: 8 }} />
          <Skeleton height={40} />
          <div style={{ height: 8 }} />
          <Skeleton height={40} />
          <div style={{ fontSize: 12, color: EK.txDim, marginTop: 8, textAlign: "center" }}>
            {fr ? "Cette analyse prend habituellement 5 à 10 secondes." : "This analysis typically takes 5 to 10 seconds."}
          </div>
        </div>
      )}

      {/* Error */}
      {optimizeStatus === "error" && (
        <div style={{ textAlign: "center", padding: 16, color: EK.red, fontSize: 14 }}>
          {fr ? "Erreur lors de l'optimisation. Veuillez réessayer." : "Optimization error. Please try again."}
        </div>
      )}

      {/* Results: Top 3 levers */}
      {optimizeResults && optimizeStatus === "idle" && (
        <div>
          {/* Baseline */}
          <div style={{ fontSize: 12, color: EK.txMuted, marginBottom: 8 }}>
            {fr ? "Scénario de référence" : "Baseline"}: {optimizeResults.baseline.grade} — {fPct(optimizeResults.baseline.successRate)} — {f$(optimizeResults.baseline.medianWealth)}
          </div>

          {/* Levers */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {optimizeResults.levers.slice(0, 3).map((lever, i) => {
              const positive = lever.delta_pp > 0;
              const barWidth = Math.min(100, Math.abs(lever.delta_pp) * 4);
              return (
                <div key={i} style={{ padding: "12px 14px", background: EK.bg, borderRadius: 8, border: `1px solid ${EK.border}`, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: EK.marine, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: EK.marine }}>
                      {fr ? lever.label_fr : lever.label_en}
                    </div>
                    <div style={{ fontSize: 12, color: EK.txDim, marginTop: 2 }}>
                      {lever.currentValue} → {lever.bestValue}
                    </div>
                    {/* Delta bar */}
                    <div style={{ marginTop: 4, height: 6, background: EK.sable, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        width: `${barWidth}%`, height: "100%", borderRadius: 3,
                        background: positive ? EK.green : EK.red,
                        transition: "width 0.5s ease",
                      }} />
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: positive ? EK.green : EK.red }}>
                      {positive ? "+" : ""}{lever.delta_pp}pp
                    </div>
                    <button
                      onClick={() => onExplore(lever.axis, lever.bestValue)}
                      style={{
                        marginTop: 4, fontSize: 11, color: EK.gold, background: "none",
                        border: `1px solid ${EK.gold}`, borderRadius: 4, padding: "3px 8px",
                        cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      {fr ? "Explorer" : "Explore"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Meta */}
          <div style={{ marginTop: 10, fontSize: 11, color: EK.txMuted, textAlign: "right" }}>
            {optimizeResults.meta.totalTested.toLocaleString()} {fr ? "combinaisons testées en" : "combinations tested in"} {(optimizeResults.meta.durationMs / 1000).toFixed(1)}s
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// BilanPanel — Bilan Annuel (7-field form + API call)
// ══════════════════════════════════════════════════════════════

function BilanPanel({ lang, token, params, profile, onClose }: {
  lang: Lang; token: string; params: Record<string, unknown>;
  profile: AuthProfile | null; onClose: () => void;
}) {
  const fr = lang === "fr";
  // 7 fields pre-filled from current params
  const [bilanFields, setBilanFields] = useState({
    rrsp: Math.round(Number(params.rrsp) || 0),
    tfsa: Math.round(Number(params.tfsa) || 0),
    nr: Math.round(Number(params.nr) || 0),
    cRRSP: Math.round(Number(params.cRRSP) || 0),
    cTFSA: Math.round(Number(params.cTFSA) || 0),
    sal: Math.round(Number(params.sal) || 0),
    mortgageBalance: Math.round(Number(
      (params.props as unknown[])?.length
        ? ((params.props as Record<string, unknown>[])[0]?.mb as number) || 0
        : 0
    )),
    mortgageRate: Number(
      (params.props as unknown[])?.length
        ? ((params.props as Record<string, unknown>[])[0]?.mr as number) || 0.05
        : 0.05
    ) * 100,
    rrspC: Math.round(Number(params.rrspC) || 0),
    tfsaC: Math.round(Number(params.tfsaC) || 0),
    nrC: Math.round(Number(params.nrC) || 0),
    retSpM: Math.round(Number(params.retSpM) || 0),
    events: "",
    changes: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<{ downloadUrl: string; grade: string; successPct: number; delta?: Record<string, number> } | null>(null);
  const [error, setError] = useState("");

  const setBF = (key: string, val: unknown) => setBilanFields(prev => ({ ...prev, [key]: val }));

  const runBilan = async () => {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/bilan-annuel", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ params, bilanFields, lang }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Bilan generation failed");
      setResult(data);
      setStatus("done");
      trackEvent(EVENTS.LAB_ANNUAL_RUN, { grade: data.grade, successPct: data.successPct });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  };

  if (status === "done" && result) {
    return (
      <div style={{ textAlign: "center", padding: "16px 0" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: EK.green, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: EK.marine, marginBottom: 8, fontFamily: "'Newsreader', serif" }}>
          {fr ? "Bilan Annuel généré" : "Annual Assessment generated"}
        </h3>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ background: EK.bg, border: `1px solid ${EK.border}`, borderRadius: 8, padding: "12px 20px" }}>
            <div style={{ fontSize: 11, color: EK.txDim, textTransform: "uppercase" as const }}>{fr ? "Note" : "Grade"}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: EK.marine }}>{result.grade}</div>
          </div>
          <div style={{ background: EK.bg, border: `1px solid ${EK.border}`, borderRadius: 8, padding: "12px 20px" }}>
            <div style={{ fontSize: 11, color: EK.txDim, textTransform: "uppercase" as const }}>{fr ? "Taux de réussite" : "Success rate"}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: result.successPct >= 80 ? EK.green : result.successPct >= 60 ? EK.gold : EK.red }}>{result.successPct}%</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <a href={result.downloadUrl} target="_blank" rel="noopener noreferrer" style={{
            display: "inline-block", padding: "10px 24px", background: EK.marine, color: "#fff",
            borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: "none",
          }}>
            {fr ? "Voir le bilan (9 pages)" : "View assessment (9 pages)"}
          </a>
          <button onClick={onClose} style={{
            padding: "10px 24px", background: "none", border: `1px solid ${EK.border}`,
            borderRadius: 6, color: EK.txDim, fontSize: 13, cursor: "pointer",
          }}>
            {fr ? "Fermer" : "Close"}
          </button>
        </div>
      </div>
    );
  }

  const fieldStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: `1px solid ${EK.sable}` };
  const labelStyle = { fontSize: 13, color: EK.tx, fontWeight: 500 as const, flex: "1 1 auto" as const };
  const inputStyle = { width: 130, padding: "6px 10px", border: `1px solid ${EK.border}`, borderRadius: 6, fontSize: 13, textAlign: "right" as const, fontFamily: "'JetBrains Mono', monospace" };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "8px 0" }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: EK.marine, marginBottom: 4, fontFamily: "'Newsreader', serif" }}>
        {fr ? "Bilan Annuel — Mise à jour" : "Annual Assessment — Update"}
      </h3>
      <p style={{ fontSize: 13, color: EK.txDim, lineHeight: 1.6, marginBottom: 16 }}>
        {fr
          ? "Mettez à jour vos 7 chiffres clés. Les champs sont pré-remplis avec vos paramètres actuels. Le modèle comparera votre situation à votre dernier profil."
          : "Update your 7 key numbers. Fields are pre-filled from your current parameters. The model will compare your situation to your last profile."}
      </p>

      {/* Field 1: Account balances */}
      <div style={{ fontSize: 12, fontWeight: 700, color: EK.gold, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 6, marginTop: 12 }}>
        {fr ? "1. Soldes des comptes" : "1. Account balances"}
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>{fr ? "REER" : "RRSP"}</span>
        <input type="number" value={bilanFields.rrsp} onChange={e => setBF("rrsp", Number(e.target.value))} style={inputStyle} />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>{fr ? "CELI" : "TFSA"}</span>
        <input type="number" value={bilanFields.tfsa} onChange={e => setBF("tfsa", Number(e.target.value))} style={inputStyle} />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>{fr ? "Non-enregistré" : "Non-registered"}</span>
        <input type="number" value={bilanFields.nr} onChange={e => setBF("nr", Number(e.target.value))} style={inputStyle} />
      </div>

      {/* Field 2: Income */}
      <div style={{ fontSize: 12, fontWeight: 700, color: EK.gold, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 6, marginTop: 16 }}>
        {fr ? "2. Revenu annuel" : "2. Annual income"}
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>{fr ? "Salaire brut" : "Gross salary"}</span>
        <input type="number" value={bilanFields.sal} onChange={e => setBF("sal", Number(e.target.value))} style={inputStyle} />
      </div>

      {/* Field 3: Mortgage */}
      <div style={{ fontSize: 12, fontWeight: 700, color: EK.gold, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 6, marginTop: 16 }}>
        {fr ? "3. Hypothèque" : "3. Mortgage"}
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>{fr ? "Solde" : "Balance"}</span>
        <input type="number" value={bilanFields.mortgageBalance} onChange={e => setBF("mortgageBalance", Number(e.target.value))} style={inputStyle} />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>{fr ? "Taux (%)" : "Rate (%)"}</span>
        <input type="number" value={bilanFields.mortgageRate} onChange={e => setBF("mortgageRate", Number(e.target.value))} style={inputStyle} step="0.1" />
      </div>

      {/* Field 4: Annual savings */}
      <div style={{ fontSize: 12, fontWeight: 700, color: EK.gold, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 6, marginTop: 16 }}>
        {fr ? "4. Cotisations annuelles" : "4. Annual contributions"}
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>{fr ? "REER" : "RRSP"}</span>
        <input type="number" value={bilanFields.rrspC} onChange={e => setBF("rrspC", Number(e.target.value))} style={inputStyle} />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>{fr ? "CELI" : "TFSA"}</span>
        <input type="number" value={bilanFields.tfsaC} onChange={e => setBF("tfsaC", Number(e.target.value))} style={inputStyle} />
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>{fr ? "Non-enregistré" : "Non-registered"}</span>
        <input type="number" value={bilanFields.nrC} onChange={e => setBF("nrC", Number(e.target.value))} style={inputStyle} />
      </div>

      {/* Field 5: Retirement spending */}
      <div style={{ fontSize: 12, fontWeight: 700, color: EK.gold, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 6, marginTop: 16 }}>
        {fr ? "5. Dépenses estimées" : "5. Estimated spending"}
      </div>
      <div style={fieldStyle}>
        <span style={labelStyle}>{fr ? "Dépenses retraite ($/mois)" : "Retirement spending ($/mo)"}</span>
        <input type="number" value={bilanFields.retSpM} onChange={e => setBF("retSpM", Number(e.target.value))} style={inputStyle} />
      </div>

      {/* Field 6: Events */}
      <div style={{ fontSize: 12, fontWeight: 700, color: EK.gold, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 6, marginTop: 16 }}>
        {fr ? "6. Événements de l'année" : "6. This year's events"}
      </div>
      <textarea
        value={bilanFields.events}
        onChange={e => setBF("events", e.target.value)}
        placeholder={fr ? "Ex: Bonus de 10 000 $, vente auto, renovation..." : "Ex: $10,000 bonus, car sale, renovation..."}
        style={{ width: "100%", padding: "8px 10px", border: `1px solid ${EK.border}`, borderRadius: 6, fontSize: 13, minHeight: 48, resize: "vertical" as const, fontFamily: "'DM Sans', sans-serif" }}
      />

      {/* Field 7: Major changes */}
      <div style={{ fontSize: 12, fontWeight: 700, color: EK.gold, textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 6, marginTop: 16 }}>
        {fr ? "7. Changements majeurs" : "7. Major changes"}
      </div>
      <textarea
        value={bilanFields.changes}
        onChange={e => setBF("changes", e.target.value)}
        placeholder={fr ? "Ex: Nouveau conjoint, enfant, changement d'emploi, diagnostic sante..." : "Ex: New spouse, child, job change, health diagnosis..."}
        style={{ width: "100%", padding: "8px 10px", border: `1px solid ${EK.border}`, borderRadius: 6, fontSize: 13, minHeight: 48, resize: "vertical" as const, fontFamily: "'DM Sans', sans-serif" }}
      />

      {/* Actions */}
      {error && (
        <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(185,28,28,0.08)", border: `1px solid ${EK.red}`, borderRadius: 6, fontSize: 12, color: EK.red }}>
          {error}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        <button onClick={onClose} style={{
          padding: "10px 20px", background: "none", border: `1px solid ${EK.border}`,
          borderRadius: 6, color: EK.txDim, fontSize: 13, cursor: "pointer",
        }}>
          {fr ? "Annuler" : "Cancel"}
        </button>
        <button onClick={runBilan} disabled={status === "loading"} style={{
          padding: "10px 24px", background: status === "loading" ? EK.txDim : EK.marine, color: "#fff",
          border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: status === "loading" ? "wait" : "pointer",
        }}>
          {status === "loading"
            ? (fr ? "Génération en cours..." : "Generating...")
            : (fr ? "Générer mon bilan" : "Generate my assessment")}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ResumeOverlay — 1-page print-friendly summary
// ══════════════════════════════════════════════════════════════

function ResumeOverlay({ results, params, lang, onClose }: {
  results: SimResults;
  params: Record<string, unknown>;
  lang: Lang;
  onClose: () => void;
}) {
  const fr = lang === "fr";
  const grade = results.grade || "?";
  const succPct = Math.round((results.successRate || 0) * 100);
  const sC = succPct >= 90 ? EK.green : succPct >= 75 ? EK.gold : EK.red;
  const circ = 2 * Math.PI * 38;
  const dashVal = circ * (1 - (results.successRate || 0));
  const medW = results.medianWealth || 0;
  const p5 = results.percentiles?.p5 || 0;
  const p25 = results.percentiles?.p25 || 0;
  const p75 = results.percentiles?.p75 || 0;
  const p95 = results.percentiles?.p95 || 0;
  const pD: any[] = results.yearByYear || [];
  const retAge = Number(params.retAge) || 65;
  const retSpM = Number(params.retSpM) || 0;

  // Mini fan chart data
  const chartW = 300, chartH = 140, cPL = 36, cPR = 8, cPT = 12, cPB = 22;
  const cCW = chartW - cPL - cPR, cCH = chartH - cPT - cPB;
  let mx = 0;
  pD.forEach((r: any) => { mx = Math.max(mx, r.rp95 || r.p95 || 0); });
  mx = Math.max(mx * 1.05, 100000);
  const csx = (i: number) => cPL + (pD.length > 1 ? i / (pD.length - 1) * cCW : 0);
  const csy = (v: number) => cPT + cCH - Math.min(v, mx) / mx * cCH;
  const cpts = (key: string) => pD.map((r: any, i: number) => csx(i) + "," + csy(r[key] || 0)).join(" ");
  const cptsRev = (key: string) => pD.slice().reverse().map((r: any, i: number) => csx(pD.length - 1 - i) + "," + csy(r[key] || 0)).join(" ");

  // Ref for PNG capture
  const resumeContentRef = useRef<HTMLDivElement>(null);
  const [pngExporting, setPngExporting] = useState(false);

  // Driver phrases
  const drivers: string[] = [];
  const wdRate = retSpM > 0 && medW > 0 ? (retSpM * 12 / medW * 100).toFixed(1) : "?";
  if (succPct >= 85) {
    drivers.push(fr ? "Taux de succès élevé, indicateur de robustesse." : "High success rate indicates robustness.");
  } else if (succPct >= 65) {
    drivers.push(fr ? "Taux de succès modéré. Le taux de retrait (" + wdRate + "%) pourrait être un facteur limitant." : "Moderate success rate. Withdrawal rate (" + wdRate + "%) could be a limiting factor.");
  } else {
    drivers.push(fr ? "Taux de succès faible. Les données suggèrent un risque d'épuisement prématuré." : "Low success rate. Data suggests risk of premature depletion.");
  }
  if (medW > 500000) {
    drivers.push(fr ? "Patrimoine médian supérieur à 500 000 $ en dollars réels." : "Median wealth exceeds $500,000 in real dollars.");
  }
  if (p25 <= 0) {
    drivers.push(fr ? "Le 25e percentile atteindrait zéro, indiquant un risque dans les scénarios défavorables." : "The 25th percentile would reach zero, indicating risk in adverse scenarios.");
  }

  // PNG download handler
  const handlePngDownload = async () => {
    const el = resumeContentRef.current;
    if (!el) return;
    setPngExporting(true);
    try {
      // Dynamic import: try npm package first, fallback to CDN
      let h2c: any;
      try {
        h2c = (await import("html2canvas")).default;
      } catch {
        // Fallback: load from CDN if npm package not installed
        h2c = (window as any).html2canvas || await new Promise<any>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          s.onload = () => resolve((window as any).html2canvas);
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      const canvas = await h2c(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `buildfi-resume-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("PNG export failed:", err);
      alert(fr ? "Erreur lors de l'export PNG. Utilisez Imprimer/PDF comme alternative." : "PNG export failed. Use Print/PDF as an alternative.");
    } finally {
      setPngExporting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      {/* Print styles */}
      <style>{`
        @media print {
          .resume-backdrop { display: none !important; }
          .resume-page { position: static !important; box-shadow: none !important; max-width: none !important; width: 100% !important; margin: 0 !important; border-radius: 0 !important; }
          .resume-actions { display: none !important; }
        }
      `}</style>
      <div className="resume-backdrop" style={{ position: "absolute", inset: 0 }} onClick={onClose} />
      <div className="resume-page" style={{
        position: "relative", background: "#fff", borderRadius: 12, maxWidth: 640, width: "100%",
        padding: "32px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", maxHeight: "95vh", overflowY: "auto",
      }}>
      {/* Capture target: wraps all visible resume content */}
      <div ref={resumeContentRef} style={{ background: "#fff", padding: 0 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: EK.txMuted, letterSpacing: 2, textTransform: "uppercase" }}>buildfi.ca</div>
            <div style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: 22, fontWeight: 700, color: EK.marine, marginTop: 2 }}>
              {fr ? "Résumé 1 page" : "1-Page Summary"}
            </div>
            <div style={{ fontSize: 11, color: EK.txMuted, marginTop: 2 }}>
              {new Date().toLocaleDateString(fr ? "fr-CA" : "en-CA")} &middot; {params.prov as string} &middot; {fr ? "Constantes 2026" : "Constants 2026"}
            </div>
          </div>
          {/* Grade ring */}
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="38" fill="none" stroke="#e8e4db" strokeWidth="6"/>
            <circle cx="40" cy="40" r="38" fill="none" stroke={sC} strokeWidth="6"
              strokeDasharray={Math.round(circ)} strokeDashoffset={Math.round(dashVal)}
              strokeLinecap="round" transform="rotate(-90 40 40)"/>
            <text x="40" y="37" textAnchor="middle" fontSize="22" fontWeight="800" fill={sC} fontFamily="Newsreader, Georgia, serif">{grade}</text>
            <text x="40" y="52" textAnchor="middle" fontSize="11" fill={EK.txDim} fontFamily="'JetBrains Mono', monospace">{succPct}%</text>
          </svg>
        </div>

        {/* KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { v: succPct + "%", l: fr ? "Taux de succès" : "Success rate", c: sC },
            { v: f$(medW), l: fr ? "Patrimoine médian (réel)" : "Median wealth (real)", c: EK.marine },
            { v: f$(p25) + " \u2013 " + f$(p75), l: "P25 \u2013 P75", c: EK.gold },
          ].map((k, i) => (
            <div key={i} style={{ textAlign: "center", padding: "12px 8px", background: EK.bg, borderRadius: 8, border: `1px solid ${EK.border}` }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 800, color: k.c }}>{k.v}</div>
              <div style={{ fontSize: 10, color: EK.txDim, marginTop: 3 }}>{k.l}</div>
            </div>
          ))}
        </div>

        {/* Mini fan chart */}
        {pD.length > 2 && (
          <div style={{ marginBottom: 20, background: EK.bg, borderRadius: 8, padding: "12px 8px", border: `1px solid ${EK.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: EK.marine, marginBottom: 6, paddingLeft: cPL }}>
              {fr ? "Projection du patrimoine" : "Wealth projection"}
            </div>
            <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: "100%", height: "auto" }}>
              {[0, 2, 4].map(g => {
                const yy = cPT + cCH - cCH * g / 4;
                return <g key={g}>
                  <line x1={cPL} x2={chartW - cPR} y1={yy} y2={yy} stroke="#e8e4db" strokeWidth="0.5"/>
                  <text x={cPL - 4} y={yy + 3} textAnchor="end" fontSize="7" fill="#999" fontFamily="'JetBrains Mono', monospace">{Math.round(mx * g / 4 / 1000)}K</text>
                </g>;
              })}
              <polygon points={cpts("rp95") + " " + cptsRev("rp5")} fill="rgba(196,154,26,0.08)"/>
              <polygon points={cpts("rp75") + " " + cptsRev("rp25")} fill="rgba(196,154,26,0.2)"/>
              <polyline points={cpts("rp50")} fill="none" stroke={EK.gold} strokeWidth="2" strokeLinejoin="round"/>
              {pD.map((r: any, i: number) => {
                if (r.age === retAge) return <line key={i} x1={csx(i)} x2={csx(i)} y1={cPT} y2={cPT + cCH} stroke={EK.marine} strokeDasharray="3,2" strokeWidth="0.8"/>;
                return null;
              })}
              {pD.filter((_: any, i: number) => i % Math.ceil(pD.length / 6) === 0 || i === pD.length - 1).map((r: any, idx: number) => {
                const i = pD.indexOf(r);
                return <text key={idx} x={csx(i)} y={chartH - 4} textAnchor="middle" fontSize="7" fill="#999" fontFamily="'JetBrains Mono', monospace">{r.age}</text>;
              })}
            </svg>
          </div>
        )}

        {/* 3 key findings */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: EK.marine, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {fr ? "Constats clés" : "Key findings"}
          </div>
          {drivers.map((d, i) => (
            <div key={i} style={{ fontSize: 12, color: EK.tx, lineHeight: 1.7, paddingLeft: 14, position: "relative", marginBottom: 4 }}>
              <span style={{ position: "absolute", left: 0, color: EK.gold, fontWeight: 700 }}>&bull;</span>
              {d}
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div style={{ fontSize: 10, color: EK.txMuted, lineHeight: 1.6, paddingTop: 12, borderTop: `1px solid ${EK.border}` }}>
          buildfi.ca &middot; {fr ? "À titre informatif seulement. Ne constitue pas un conseil financier." : "For informational purposes only. Does not constitute financial advice."}
        </div>

        </div>{/* end resumeContentRef capture target */}

        {/* Action buttons */}
        <div className="resume-actions" style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={() => window.print()} style={{
            flex: 1, padding: "10px 0", background: EK.marine, color: "#fff", border: "none",
            borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          }}>
            {fr ? "Imprimer / PDF" : "Print / PDF"}
          </button>
          <button
            onClick={handlePngDownload}
            disabled={pngExporting}
            style={{
              flex: 1, padding: "10px 0", background: EK.gold, color: "#fff", border: "none",
              borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: pngExporting ? "wait" : "pointer",
              opacity: pngExporting ? 0.7 : 1,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {pngExporting ? (fr ? "Export en cours..." : "Exporting...") : (fr ? "Télécharger PNG" : "Download PNG")}
          </button>
          <button onClick={onClose} style={{
            padding: "10px 20px", background: "none", border: `1px solid ${EK.border}`,
            borderRadius: 8, fontSize: 13, color: EK.txDim, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          }}>
            {fr ? "Fermer" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Page export with Suspense wrapper
// ══════════════════════════════════════════════════════════════

export default function SimulateurPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#faf8f4" }}>
          <div style={{ fontSize: 16, color: "#999" }}>Chargement...</div>
        </div>
      }
    >
      <SimulateurContent />
    </Suspense>
  );
}
