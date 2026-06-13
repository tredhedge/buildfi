# BuildFi — AI Narrative Pipeline: Audit & Drop-in Upgrade

Source audited: the live prompt pipeline in `planner_v3.html` (L11822–11940: system prompt, tone calibration, `_serializeForAI`, `_sanitizeAI`, `/api/ai-narrate` call) plus the production report's embedded payload (`window.__BUILDFI__`, 247 KB, in the uploaded Bilan files). The production `report-ai-prompt.js` wasn't uploaded, but the embedded payload and the rendered narratives let me reverse-engineer its behaviour; everything below applies to both pipelines.

## What's already good (keep)

Server-side key custody with auth + rate limiting (`/api/ai-narrate`, the "Reconciled audit P0" note shows the browser-key hole was already closed). The observational-language compliance rules. The **tone calibration block** (stress level × literacy × detail preference) — genuinely better personalization than most fintech narration. The slot-JSON output format. The honest AI-disclosure text. The instinct to cite engine numbers. None of this needs replacing — it needs guardrails around the numbers.

---

## Part A — Nine failure mechanisms, each matched to a defect observed in the shipped reports

**A1. The model formats and rounds numbers itself.** The payload sends raw values (`succ: 0.3845`, `rP75F: 474530.21`) and the prompt says "CITE SPECIFIC NUMBERS from data." Result: KPI renders 38% while the narrative says 39% (the model's own rounding of 38.45); FR report: 41% vs 37%; prose "$424K" vs the actual 474,530 — a digit transposition while restating a long number. **This single mechanism explains the worst class of defect.** A language model must never be the formatter of record.

**A2. Redundant and derivable data invites derivation.** The payload carries the answer multiple ways: scalar percentiles + the full per-age percentile series (`pD`) + year-by-year `medRevData`. Asked for specifics, the model derives its own depletion ages from the series — the report states 65 (the `p5Ruin` scalar), 68, and 88, while the chart shows ~83. "68" and "88" exist nowhere in the payload; they were *computed by the model*. Narrative payloads must contain exactly one field per citable concept and **no series**.

**A3. A fabricated metric is presented as engine output.** When no naive-strategy comparison run exists, the serializer invents tax alpha: `tA = Math.round(oT*0.18)` — literally 18% of lifetime tax as a placeholder — and the AI is told to cite it. Absent metrics must be omitted, never synthesized.

**A4. The high-stress tone rule instructs the model to contradict the data.** "Avoid alarming language even when numbers are unfavorable" is a directional override — it's the genealogy of the caption *"In most paths your wealth remains durable"* under a 38%-success plan. Tone may modulate **delivery** (pace, warmth, framing of next steps); it must never modulate **direction** (whether the plan is fragile).

**A5. The regex sanitizer mutates meaning and misses most of its targets.** `_sanitizeAI` rewrites mid-sentence ("Consider diversifying…" → "it is observable that diversifying…" — broken grammar shipped to a paying client) and its 5 patterns miss "aim to", "prioritize", "it would be prudent", "look into", "make a point of", FR "il serait sage de", "pensez à". Post-hoc regex surgery on prose is the wrong layer: enforce at generation (rules + examples), **validate** afterward, and *regenerate* on failure rather than mutate.

**A6. No validation of any kind on the numbers.** Nothing checks that figures in the prose exist in the payload, that sections agree with each other, or that the narrative agrees with the KPIs/captions rendered beside it. This is the missing organ.

**A7. Stale facts inside the prompt itself.** The glossary hardcodes "OAS clawback: income exceeds ~$95K" (unindexed — wrong for every projected year) and the serializer duplicates the grade thresholds (A+ ≥0.95…) that also live in the UI — two copies that will drift. The prompt should carry **zero** fiscal constants; the snapshot supplies the indexed threshold for the years it talks about.

**A8. Noisy inputs laundered into narrative.** `recommendations: window._recos.slice(0,5)` feeds the SAM/coach rankings — which the module audit proved are scored by the buggy deterministic harness with four structurally inert cards and a deferral bias — to the model as ground truth. And `p5Ruin` is the unsorted-array bug (engine 2.11). Garbage in, eloquent garbage out: the narrative layer cannot outrun the engine fixes.

**A9. Serializer math errors.** `oM = calcOAS(oasAge, retSpM*12)` uses *spending* as the clawback income proxy; `lifetimeTax`/`avgEffectiveRate` inherit the unfunded-tax defect (audit 1.1); `successRate` at 3 decimals (0.385) maximally invites re-rounding ambiguity.

---

## Part B — The replacement architecture

### B1. Snapshot builder (replaces `_serializeForAI` for narrative purposes)

One seeded engine run → one frozen object. Two sections:

```js
{
  "facts": {                       // machine-readable, for caption logic & validator
    "band": "fragile",             // engine-decided: solid | comfortable | fragile | critical
    "succPct": 38, "grade": "C",
    "medFinalReal": 0, "p25Real": 0, "p75Real": 474530,
    "ruinMedAge": 83,              // post-fix: from ruinAgesSorted
    "ruinP25Age": 68,
    "lifetimeTaxReal": 569000,     // post-engine-fix 1.1
    "monthlyGapToday": 10188, "guaranteedCoveragePct": 27,
    "oasClawbackThresholdAtRet": 109000,   // indexed to the year discussed
    "sensitivity": [ {"lever":"returns","ppts":18}, {"lever":"inflation","ppts":23} ], // pre-sorted desc
    "levers": [ {"id":"retAge+2","dSuccPpts":14,"d$Real":121000}, … ]  // from paired-seed runMC only
  },
  "display": {                     // the ONLY strings the model may emit as numbers
    "succ": "38%", "medFinal": "$0", "p75": "$475K",
    "ruinMed": "age 83", "ruinP25": "age 68",
    "lifetimeTax": "$569K", "monthlyGap": "$10,188/mo", "coverage": "27%", …
  }                                // FR variant: "38 %", "0 $", "475 K$", "83 ans" …
}
```

Rules of construction: **one field per concept** (no `pD`, no `medRevData`, no per-year cashflow in the narrative payload — those feed charts only); **absent = omitted** (no naive run → no `taxAlpha` key, and the prompt forbids mentioning absent concepts); all `display` strings produced by the same `fmtMoney/fmtPct(locale)` the KPI cards use, so narrative and KPI are *bytewise identical by construction*; `band` decided by engine thresholds in one place, consumed by tone, captions, and prompt alike.

### B2. Replacement system prompt (drop-in)

```
You write narrative sections for a Canadian retirement report. You receive
FACTS (context) and DISPLAY (pre-formatted strings).

NUMBERS — ABSOLUTE RULES:
1. You may not perform arithmetic, rounding, conversion, or estimation.
2. Every numeral, percentage, dollar amount, and age in your output must be
   copied character-for-character from DISPLAY. If the figure you want is not
   in DISPLAY, write the sentence without a number.
3. Never mention a concept whose field is absent from FACTS.
4. Comparative claims must follow the given orderings: FACTS.sensitivity is
   pre-sorted — the first item IS the most influential lever; FACTS.levers
   likewise. Never assert an ordering that contradicts them.

DIRECTION vs DELIVERY:
5. FACTS.band fixes the direction of every characterization. fragile/critical
   plans may never be described as durable, solid, comfortable, or on track —
   in any section, caption, or aside. Tone preferences (below) adjust pacing,
   warmth, and framing of next steps only; they never soften the verdict.

COMPLIANCE (AMF):
6. Observational, conditional register only: "the projections indicate",
   "deferring to 70 would add". Banned: you should, we recommend, consider,
   make sure, aim to, prioritize, it would be wise/prudent, any guarantee
   ("will be fine", "assurément"), superlatives as advice ("best move").
   FR equivalents banned: vous devriez, nous recommandons, pensez à, il
   faudrait, il serait sage/prudent de, assurez-vous.
7. Language {locale}. FR: registre québécois, vouvoiement; vocabulaire —
   décaissement, FERR, PSV, RRQ, fractionnement, facture fiscale (jamais
   « viagère »); aucun acronyme anglais. EN: no French acronyms (OAS not PSV,
   RRIF not FERR).

TONE (delivery only): {stress/literacy/detail block — unchanged from current,
minus the "avoid alarming language" sentence, replaced by: "For high stress,
pair each unfavourable fact with the concrete lever from FACTS.levers that
most improves it, stated conditionally."}

OUTPUT: JSON {slotId: prose}. Plain sentences only — no markdown, no manual
list numbering, no headers, no emojis, no exclamation marks. Respect each
slot's word budget. Do not reuse a sentence already present in PRIOR_SECTIONS.
```

User message per call: `FACTS`, `DISPLAY`, the slot list with budgets and one-line briefs, `PRIOR_SECTIONS` (for dedup), and **two few-shot exemplars matching FACTS.band** (harvest the best existing paragraphs — one solid-band, one fragile-band — your current editorial voice is worth preserving verbatim as the examples). Generate **section-by-section**, temperature ≤ 0.5, so the validator can retry surgically.

### B3. The validator (replaces `_sanitizeAI`; ~70 lines, paste-ready)

```js
function validateNarrative(slots, snapshot, priorText, locale) {
  const ok = [], fail = [];
  const allowed = new Set(Object.values(snapshot.display)
    .flatMap(s => s.match(/\d[\d\s,.\u00A0]*/g) || []).map(n => n.replace(/[\s,\u00A0]/g, "")));
  const banned = locale === "fr"
    ? /\b(vous devriez|nous recommandons|pensez \u00e0|il faudrait|il serait (sage|prudent)|assurez-vous|garanti\w*|viag\u00e8re)\b/i
    : /\b(you should|we recommend|consider\b|make sure|aim to|prioriti[sz]e|it would be (wise|prudent)|guarantee[ds]?|will be fine)\b/i;
  const leak = locale === "fr" ? /\b(OAS|RRIF|CPP\b)/ : /\b(PSV|FERR|RRQ)\b/;
  const seen = new Set((priorText.match(/[^.!?]{60,}[.!?]/g) || []).map(s => s.trim()));
  for (const [id, text] of Object.entries(slots)) {
    const errs = [];
    for (const m of text.match(/\d[\d\s,.\u00A0]*/g) || []) {
      const norm = m.replace(/[\s,\u00A0]/g, "").replace(/\.$/, "");
      if (norm.length && !allowed.has(norm)) errs.push("foreign number: " + m.trim());
    }
    if (banned.test(text)) errs.push("banned construction: " + text.match(banned)[0]);
    if (leak.test(text)) errs.push("locale leak: " + text.match(leak)[0]);
    for (const s of text.match(/[^.!?]{60,}[.!?]/g) || []) {
      if (seen.has(s.trim())) errs.push("duplicate sentence");
      seen.add(s.trim());
    }
    if (/\bdurable|on track|solide|comfortable\b/i.test(text)
        && ["fragile","critical"].includes(snapshot.facts.band)) errs.push("direction violation");
    (errs.length ? fail : ok).push({ id, errs });
  }
  return { ok, fail }; // caller: regenerate each failed slot (≤2 retries) → deterministic fallback
}
```

Run it against the generated slots **plus** the template's static captions, so a code-selected caption can't contradict the band either. Deterministic fallbacks per slot ("The plan registers a {display.succ} success rate, in the {band} band.") guarantee a shippable report even if the model misbehaves twice.

### B4. Serializer fixes (independent of the prompt)

Delete the fabricated `taxAlpha` placeholder (omit the key when `_naiveMC` is absent); replace `calcOAS(oasAge, retSpM*12)` with the engine's actual pass-2 OAS for the relevant year; stop feeding `window._recos` until the SAM harness is re-routed through paired-seed `runMC` (addendum §A); send `succPct` as an integer, never a 3-decimal fraction; source grade thresholds and band from one shared function. And the two engine dependencies bear repeating once: `p5Ruin` (unsorted array) and `lifetimeTax` (unfunded taxes) must be fixed upstream or the snapshot is faithfully transmitting wrong numbers.

## Acceptance test

Regenerate the three personas post-upgrade and run the same scan I used: zero numerals outside the display set, zero duplicate long sentences, zero locale leaks, zero direction violations, KPI/narrative/caption agreement on success rate and depletion age. I can re-run that scan on any regenerated report you upload — it's five minutes and it's the same harness that caught 38/39, 41/37, 475/424, and 65/68/88.
