// report-qa.js — Pre-release audit of generated report HTML.
// Gate 4 of the deployment pipeline (audit 2026-04-20). Runs a set of
// blocking and warning checks against a built HTML document + the data
// used to build it, so regressions in narrative, section structure,
// placeholder leakage, or graph/data coherence are caught before the
// report ships.
//
// Usage (Node, after report-pdf.js has produced the HTML):
//   const { auditReport } = require("./report-qa.js");
//   const { blocking, warnings } = auditReport(html, { mc, params, lang });
//   if (blocking.length) throw new Error("Report QA blocked");
//
// Usage (browser, via window.BReportQA):
//   const r = window.BReportQA.auditReport(html, payload);

(function () {
  "use strict";

  /* Required top-level sections in every report. Identified by a
   * language-neutral anchor (id= or class=) or a visible section title
   * fragment present in both FR and EN. A missing section is BLOCKING. */
  var REQUIRED_SECTIONS = [
    { id: "decision",    label: "Decision card",          fr: "Verdict",           en: "Verdict" },
    { id: "projection",  label: "Projection fan chart",   fr: "Projection",        en: "Projection" },
    { id: "histogram",   label: "Final wealth histogram", fr: "histogramme",       en: "histogram" },
    { id: "scenarios",   label: "Scenarios / stress",     fr: "scénario",          en: "scenario" },
    { id: "methodology", label: "Methodology + assumptions", fr: "Méthodologie",   en: "Methodology" }
  ];

  /* Patterns that indicate a placeholder leaked through the build.
   * Blocking because they break trust (user sees "undefined" in a
   * $-labeled KPI). Patterns kept conservative so technical acronyms
   * like "NaN" inside a variable name don't trigger. */
  var PLACEHOLDER_PATTERNS = [
    { re: /\bundefined\b/g,         label: "literal 'undefined'" },
    { re: /\bNaN\b/g,               label: "literal 'NaN'" },
    { re: /\$NaN\b/g,               label: "'$NaN' in currency slot" },
    { re: /\$null\b/g,              label: "'$null' in currency slot" },
    { re: /\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}/g, label: "unresolved {{placeholder}}" },
    { re: /\[\s*TODO\s*\]/gi,       label: "[TODO] marker" },
    { re: /\[\s*XXX\s*\]/gi,        label: "[XXX] marker" },
    { re: /\b(lorem|ipsum)\b/gi,    label: "lorem-ipsum placeholder" }
  ];

  /* AI slot sentinels — if AI narration fails, static fallback should
   * replace the slot. An empty slot div is a warning (not blocking)
   * since some slots may be intentionally omitted for short profiles. */
  var AI_SLOT_MARKER = /data-ai-slot="[a-zA-Z_]+"\s*>\s*<\/[a-z]+>/g;

  /* Currency/number formatting checks. The engine outputs money as
   * "$ 1 234" (FR) or "$1,234" (EN). A bare un-formatted number next to
   * a $ sign indicates a formatter bypass. */
  var BARE_NUMBER_NEAR_DOLLAR = /\$\s*\d{5,}\.\d{3,}/g; // e.g. "$ 123456.7890"

  function countMatches(html, re) {
    var m = html.match(re);
    return m ? m.length : 0;
  }

  function auditReport(html, payload) {
    var blocking = [];
    var warnings = [];
    var info = {};

    if (typeof html !== "string" || html.length < 500) {
      blocking.push({ check: "html-length", detail: "HTML missing or too short: " + (html ? html.length : "null") });
      return { blocking: blocking, warnings: warnings, info: info };
    }

    var p = payload || {};
    var lang = (p.lang || p.rptLang || "fr").toLowerCase() === "en" ? "en" : "fr";
    info.lang = lang;
    info.htmlLength = html.length;

    /* 1. Required sections. Check both the data-id/id anchor AND the
     *    visible title fragment (either language) so translated reports
     *    still pass even if the id attribute changes. */
    REQUIRED_SECTIONS.forEach(function (s) {
      var idHit = html.indexOf('id="' + s.id + '"') >= 0
               || html.indexOf('data-section="' + s.id + '"') >= 0;
      var titleHit = html.toLowerCase().indexOf(s.fr.toLowerCase()) >= 0
                  || html.toLowerCase().indexOf(s.en.toLowerCase()) >= 0;
      if (!idHit && !titleHit) {
        blocking.push({ check: "section-missing", detail: s.label + " (" + s.id + ")" });
      }
    });

    /* 2. Placeholder leakage. Blocking. */
    PLACEHOLDER_PATTERNS.forEach(function (pt) {
      var n = countMatches(html, pt.re);
      if (n > 0) {
        blocking.push({ check: "placeholder", detail: pt.label + " ×" + n });
      }
    });

    /* 3. Empty AI slots. Warning only — AI may be disabled / offline. */
    var emptyAi = countMatches(html, AI_SLOT_MARKER);
    if (emptyAi > 0) {
      warnings.push({ check: "ai-slot-empty", detail: emptyAi + " unfilled AI slot div(s)" });
    }

    /* 4. Bare un-formatted numbers adjacent to $. */
    var bareNums = countMatches(html, BARE_NUMBER_NEAR_DOLLAR);
    if (bareNums > 0) {
      warnings.push({ check: "bare-number", detail: bareNums + " un-formatted number(s) near $" });
    }

    /* 5. Graph ↔ data coherence. medF (headline number) should appear
     *    in the HTML somewhere close to its formatted value. We check
     *    the currency-formatted medF is present. Skip if MC data
     *    absent (loading state). */
    if (p.mc && typeof p.mc.medF === "number" && p.mc.medF > 0) {
      var medF = p.mc.medF;
      /* Build a few formatting variants the report might emit. */
      var kvariants = [
        Math.round(medF / 1000) + " k$",
        Math.round(medF / 1000) + "k",
        Math.round(medF / 1000000 * 10) / 10 + " M$",
        Math.round(medF / 1000000 * 10) / 10 + "M"
      ];
      var found = kvariants.some(function (v) { return html.indexOf(v) >= 0; });
      /* Also accept the raw thousands-grouped integer anywhere. */
      if (!found) {
        var grouped = Math.round(medF).toLocaleString(lang === "fr" ? "fr-CA" : "en-CA");
        if (html.indexOf(grouped) >= 0) found = true;
      }
      if (!found) {
        warnings.push({ check: "medF-missing", detail: "medF=" + medF + " not found in any expected format" });
      }
      info.medF = medF;
    }

    /* 6. Language consistency. If lang=fr, look for common EN leakage;
     *    if lang=en, look for common FR leakage. Case-sensitive to
     *    avoid false positives on brand names. */
    var FR_ONLY = ["Conjoint(e)", "Épargne", "Décaissement", "Immobilier", "Succession"];
    var EN_ONLY = ["Spouse", "Savings", "Withdrawal strategy", "Real estate", "Estate"];
    if (lang === "fr") {
      var enLeaks = EN_ONLY.filter(function (w) { return html.indexOf(w) >= 0; });
      /* "Estate" is flagged — it appears in tooling code but should not
       * in the rendered report. Narrative would use "Succession". */
      if (enLeaks.length > 2) {
        warnings.push({ check: "lang-leak", detail: "EN terms in FR report: " + enLeaks.slice(0, 3).join(", ") });
      }
    } else if (lang === "en") {
      var frLeaks = FR_ONLY.filter(function (w) { return html.indexOf(w) >= 0; });
      if (frLeaks.length > 2) {
        warnings.push({ check: "lang-leak", detail: "FR terms in EN report: " + frLeaks.slice(0, 3).join(", ") });
      }
    }

    info.blocking = blocking.length;
    info.warnings = warnings.length;
    return { blocking: blocking, warnings: warnings, info: info };
  }

  var api = { auditReport: auditReport, REQUIRED_SECTIONS: REQUIRED_SECTIONS, PLACEHOLDER_PATTERNS: PLACEHOLDER_PATTERNS };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.BReportQA = api;
})();
