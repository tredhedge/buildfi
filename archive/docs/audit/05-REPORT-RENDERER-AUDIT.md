# 05 — Report Renderer Audit

## Architecture

All report renderers are server-side Node.js functions that produce self-contained HTML documents. They consume MC results + AI slots + quiz answers and output a complete report page. Reports are uploaded to Vercel Blob (public, `addRandomSuffix:true`) and delivered via email link.

## Renderer Inventory

### Essentiel — `lib/report-html.js` (~1,941 lines)

**Sections**: 8
1. Snapshot (grade card, success rate, summary)
2. Portrait financier (income, savings, debt overview)
3. Trajectory (year-by-year wealth projection, percentile bands)
4. Revenus projetés (income sources breakdown per year)
5. Fiscalité (tax efficiency, effective rate, OAS clawback)
6. Longévité (survival probability curve, fail age)
7. Succession (estate value at various ages)
8. Méthodologie (MC parameters, disclaimers)

**AI slots consumed**: 13 (snapshot_intro through obs_5)
**Static fallbacks**: Yes — all 13 slots have default text
**Also contains**: `buildAIPrompt()` for Essentiel tier (prompt builder embedded in renderer)
**Key function**: `renderReportHTML(D, mc, quiz, lang, ai, costDelay, minReturn)`

---

### Intermédiaire — `lib/report-html-inter.js` (~1,631 lines)

**Sections**: 16
1. Sommaire exécutif
2. Profil financier
3. Analyse de couple (conditional)
4. Portrait immobilier (conditional)
5. Stratégie fiscale
6. Revenus projetés
7. Trajectory (5 strategies compared)
8. Comparaison des stratégies (500 sims × 5)
9. Risque de longévité
10. Risque de séquence
11. Succession
12. Observations (obs_1-5)
13. Priorités identifiées
14. Stratégie recommandée
15. CCPC analysis (conditional)
16. Méthodologie

**AI slots consumed**: 17
**Static fallbacks**: Yes
**Special**: 5-strategy comparison engine (conservative/balanced/moderate/growth/aggressive)

---

### Décaissement — `lib/report-html-decum.js` (~923 lines)

**Sections**: 13
1. Profil du retraité
2. Trajectory de patrimoine
3. **SVG donut chart** (success rate visualization)
4. Sources de revenus
5. Efficacité fiscale du décaissement
6. Ordre de décaissement
7. Flexibilité des dépenses (GK)
8. Test de stress (meltdown year 1 + year 5)
9. Timing RRQ/PSV (3 scenarios: 60/65/70)
10. Succession
11. Observations (obs_1-3)
12. Hypothèses
13. Méthodologie

**AI slots consumed**: 12
**Static fallbacks**: Yes — all 12 slots
**Special**: Consumes 6 MC runs (1 base + 2 meltdown + 3 CPP timing)
**Guard**: `validateMC()` checks succ, medRevData, retSpM, age≥retAge

---

### Expert — `lib/report-html-expert.ts` (~925 lines)

**Sections**: 9 base + 10 conditional + 5 exclusive
- Base: sommaire, robustesse, revenus, projections, fiscal, priorités, observations, méthodologie, disclaimers
- Conditional (gated by profile): couple, homeowner, pensionDB, CCPC, insurance, FIRE, succession, debt, real estate, multi-scenario
- Exclusive (Lab-only): scenario comparison, sensitivity analysis, optimization results, changelog, annual review

**AI slots consumed**: Variable (section-gated)
**Static fallbacks**: Yes
**Special**: Handles scenario comparison with driver attribution

---

## Shared Utilities — `lib/report-shared.ts` (~180 lines)

| Function | Purpose |
|----------|---------|
| `gradeFromSuccess(rate)` | Maps success rate to letter grade (A+ through F) |
| `successColor(rate)` | Returns color code for success rate display |
| `probTranslation(rate, lang)` | Human-readable probability label |
| `buildProbTranslation(rate, lang)` | Extended probability context |

## Data Flow

```
MC result + quiz answers + AI slots
  → extractReportData*(mc, params) → structured object D
  → renderReportHTML*(D, mc, quiz, lang, ai, ...) → HTML string
  → Vercel Blob upload (public, addRandomSuffix:true)
  → URL stored + emailed to user
```

## Audit Checklist

- [ ] All renderers produce valid, self-contained HTML (no external JS/CSS dependencies)
- [ ] Static fallbacks work when AI slots are empty object `{}`
- [ ] All monetary values use correct locale formatting (FR: 1 000,00 $ / EN: $1,000.00)
- [ ] rMedF (real) displayed, never medF (nominal)
- [ ] AMF conditional tense in all projection text
- [ ] SVG donut chart renders correctly at all success rates (0-100%)
- [ ] Responsive layout works on mobile/tablet/desktop
- [ ] No API keys or sensitive data embedded in report HTML
- [ ] validateMC() guard prevents rendering with corrupt/incomplete MC data
- [ ] Conditional sections correctly hidden when data absent (couple, CCPC, real estate)
