// lib/report-shared.ts
// ══════════════════════════════════════════════════════════════════════
// Shared helpers for report renderers (Essentiel, Inter, Décaissement)
// ══════════════════════════════════════════════════════════════════════
// Extracted from duplicated logic across report-html.js,
// report-html-inter.js, and report-html-decum.js.
// Single source of truth for grade mapping, formatting, and
// probability translation.
// ══════════════════════════════════════════════════════════════════════

// ── Grade Scale ──────────────────────────────────────────────────────
// Canonical 8-level scale. Used by all tiers + Expert.

export type Grade = "A+" | "A" | "B+" | "B" | "C+" | "C" | "D" | "F";

export function gradeFromSuccess(pct: number): Grade {
  if (pct >= 95) return "A+";
  if (pct >= 85) return "A";
  if (pct >= 75) return "B+";
  if (pct >= 65) return "B";
  if (pct >= 55) return "C+";
  if (pct >= 45) return "C";
  if (pct >= 35) return "D";
  return "F";
}

// ── Grade Color ──────────────────────────────────────────────────────
// Maps grade letter to brand color token.
// Green for A-tier, blue for B-tier, amber for C-tier, red for D/F.

export function gradeColor(grade: Grade | string): string {
  if (grade === "A+" || grade === "A") return "#2A8C46";
  if (grade === "B+" || grade === "B") return "#4680C0";
  if (grade === "C+" || grade === "C") return "#E0882A";
  return "#CC4444";
}

// Legacy helper: maps success ratio (0-1) to traffic-light color.
// Used by Ess/Inter gCol() — kept for backward compatibility.
export function successColor(succ: number): string {
  return succ >= 0.9 ? "#2A8C46" : succ >= 0.75 ? "#B89830" : "#CC4444";
}

// ── Grade Label ──────────────────────────────────────────────────────
// Human-readable grade interpretation for the report hero.

export function gradeLabel(successPct: number, fr: boolean): string {
  if (successPct >= 85) return fr ? "Très solide" : "Very solid";
  if (successPct >= 65) return fr ? "Solide" : "Solid";
  if (successPct >= 50) return fr ? "Fragile" : "Fragile";
  return fr ? "À corriger" : "Needs attention";
}

// ── Number Formatting ────────────────────────────────────────────────

/** Format integer with locale-aware thousands separator + " $" suffix. */
export function fmtDollars(n: number, fr: boolean): string {
  if (n == null || isNaN(n)) return "\u2014";
  const abs = Math.abs(Math.round(n));
  const formatted = fr
    ? abs.toLocaleString("fr-CA")
    : abs.toLocaleString("en-CA");
  return (n < 0 ? "\u2212" : "") + formatted + "\u00a0$";
}

/** Format integer with locale-aware thousands separator (no $ suffix). */
export function fmtNumber(n: number, fr: boolean): string {
  return fr
    ? Math.round(n).toLocaleString("fr-CA")
    : Math.round(n).toLocaleString("en-CA");
}

/** Format as percentage with 1 decimal, appending " %". */
export function fmtPct(n: number): string {
  return (Math.round(n * 10) / 10).toString() + " %";
}

/** Round to 1 decimal (no suffix). For embedding in strings. */
export function fmtPctRaw(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Integer percentage from ratio. e.g. fmtPctInt(0.72) → "72%". */
export function fmtPctInt(n: number): string {
  if (n == null || isNaN(n)) return "\u2014";
  return Math.round(n) + "%";
}

// ── HTML Escaping ────────────────────────────────────────────────────

export function escHtml(s: string): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Probability Translation ──────────────────────────────────────────
// 9-bracket human-readable reformulation of success percentage.
// tier = "accumulation" (Ess/Inter: savings depletion language)
//      | "decumulation" (Décum: income insufficiency language)

export type ProbTier = "accumulation" | "decumulation";

export function probTranslation(
  successPct: number,
  fr: boolean,
  tier: ProbTier = "accumulation"
): string {
  const isDecum = tier === "decumulation";

  // Low-success brackets use different language per tier
  const depletionFr = isDecum
    ? "le revenu pourrait s\u2019avérer insuffisant avant la fin de la retraite."
    : "l\u2019épargne pourrait s\u2019épuiser avant la fin de la retraite.";
  const depletionEn = isDecum
    ? "income could prove insufficient before the end of retirement."
    : "savings could be depleted before the end of retirement.";
  const runOutFr = isDecum
    ? "des ajustements de dépenses pourraient devenir nécessaires."
    : "l\u2019épargne pourrait s\u2019épuiser avant la fin de la retraite.";
  const runOutEn = isDecum
    ? "spending adjustments could become necessary."
    : "savings could be depleted before the end of retirement.";
  const runOut34Fr = isDecum
    ? "des ajustements pourraient être nécessaires."
    : "l\u2019épargne pourrait s\u2019épuiser avant la fin de la retraite.";
  const runOut34En = isDecum
    ? "adjustments may be needed."
    : "savings could run out before the end of retirement.";

  const t = (f: string, e: string) => fr ? f : e;

  if (successPct === 0)
    return t(
      "Autrement dit\u00a0: dans la totalité des scénarios simulés, " + depletionFr,
      "In other words: in all simulated scenarios, " + depletionEn
    );
  if (successPct <= 10)
    return t(
      "Autrement dit\u00a0: dans environ 9 scénarios sur 10, " + runOutFr,
      "In other words: in roughly 9 out of 10 scenarios, " + runOutEn
    );
  if (successPct <= 25)
    return t(
      "Autrement dit\u00a0: dans environ 3 scénarios sur 4, " + runOut34Fr,
      "In other words: in roughly 3 out of 4 scenarios, " + runOut34En
    );
  if (successPct <= 40)
    return t(
      "Autrement dit\u00a0: dans plus de 1 scénario sur 2, des ajustements pourraient être nécessaires.",
      "In other words: in more than 1 out of 2 scenarios, adjustments may be needed."
    );
  if (successPct <= 50)
    return t(
      "Autrement dit\u00a0: dans environ 1 scénario sur 2, des ajustements pourraient être nécessaires en cours de retraite.",
      "In other words: in roughly 1 out of 2 scenarios, adjustments may be needed during retirement."
    );
  if (successPct <= 74)
    return t(
      "Autrement dit\u00a0: dans environ 1 scénario sur 4, le plan pourrait nécessiter des ajustements.",
      "In other words: in roughly 1 out of 4 scenarios, the plan may require some adjustments."
    );
  if (successPct <= 89)
    return t(
      "Autrement dit\u00a0: dans environ 1 scénario sur 10, le plan pourrait nécessiter des ajustements.",
      "In other words: in roughly 1 out of 10 scenarios, the plan may require some adjustments."
    );
  if (successPct <= 99)
    return t(
      "Autrement dit\u00a0: le plan pourrait résister dans la grande majorité des scénarios simulés.",
      "In other words: the plan could hold in the vast majority of simulated scenarios."
    );
  return t(
    "Autrement dit\u00a0: le plan pourrait résister dans la totalité des scénarios simulés.",
    "In other words: the plan could hold in all simulated scenarios."
  );
}
