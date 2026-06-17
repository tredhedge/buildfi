// planner/report/amf-sanitize.js — AMF sanitizer for the report pipeline (lab + render).
//
// Single JS source of truth for AMF/OSFI compliance filtering of AI narration
// in the realai/report pipeline (CommonJS-requirable by build-realai-reports.js
// and importable by run-pipeline.mjs). It MIRRORS the production sanitizer in
// lib/ai-constants.ts (softenAISlot + FORBIDDEN_TERMS) and MUST stay in sync —
// the test planner/report/realai/tests/amf-sync.test.mjs asserts the two regex
// sources carry the same banned stems and fails CI on drift.
//
// Why this exists (audit 2026-06-16): the lab render path
// (build-realai-reports.js / run-pipeline.mjs) injected responses/*.json into
// the HTML with NO server-side softening, so any banned stem committed in a
// stale response leaked to output. Production sanitizes every slot; the lab did
// not. This module closes that gap and is applied to data.ai before render.
'use strict';

// AMF/OSFI forbidden prescriptive terms + scenario combination + filler.
// Kept in lockstep with FORBIDDEN_TERMS in lib/ai-constants.ts, PLUS:
//   - the optimis*/optimiz* stem (audit 2.5 — forbidden in any form)
//   - insurance-distribution prescriptions (mirrors scripts/lint-amf.js)
const FORBIDDEN_TERMS =
  /\bdevriez\b|\bdevrait\b|\bdevraient\b|\bdevra(s|i|ent)?\b|\bfaudrait\b|\bil faut\b|\brecommandons\b|\brecommande\b|\bconseillons\b|\bconseille\b|\bvous devez\b|\bassurez-vous\b|\bil est essentiel\b|\bil est crucial\b|\bil est impératif\b|\bwe recommend\b|\bwe suggest\b|\bwe advise\b|\byou should\b|\byou must\b|\byou ought to\b|\byou need to\b|\bmake sure (that |to )?\b|\bensure that\b|\bcombiner les\b|\bcombine the\b|\bconsiderez\b|\bconsidérez\b|\bconsider \w+ing\b|\boptimisez\b|\bpriorisez\b|\boptimis[a-zàâçéèêëîïôûùüÿœæ]+|\boptimiz[a-z]+|\bplan d'action\b|\baction plan\b|\brecommandation\b|\brecommandations\b|\brecommendation\b|\brecommendations\b|\bsouscrivez\b|\bachetez (cette|une|de l')\s*assurance\b|\bvous (devez|devriez) (souscrire|acheter)\b|\byou should buy\b|\byou need (life|disability|critical|term)?\s*insurance\b|\bil est important de noter\b|\bil convient de souligner\b|\bil convient de noter\b|\bil est à noter\b|\bnotons que\b|\bsoulignons que\b|\bmentionnons que\b|\bit is important to note\b|\bit should be noted\b|\bworth noting\b/i;

// Soft-rewrite map: rescue a slot by swapping the prescriptive verb / banned
// stem for an observational equivalent BEFORE deciding to drop it. Order
// matters — specific multi-word patterns first, then the optimis*/optimiz*
// family, so a slot is only dropped when it carries irreducibly prescriptive
// content. Mirrors SOFT_REWRITES in lib/ai-constants.ts + the optimis swaps.
const SOFT_REWRITES = [
  [/\bwe recommend\s+/gi, "an option to consider is "],
  [/\bwe suggest\s+/gi, "one approach is "],
  [/\bwe advise\s+/gi, "one approach is "],
  [/\byou should\s+/gi, "you could "],
  [/\byou must\s+/gi, "the plan would benefit from "],
  [/\byou ought to\s+/gi, "you could "],
  [/\byou need to\s+/gi, "the plan benefits from "],
  [/\bmake sure (?:that |to )?/gi, "an avenue is to "],
  [/\bensure that\s+/gi, "an avenue is that "],
  [/\bvous devez\s+/gi, "vous pourriez "],
  [/\bvous devriez\s+/gi, "vous pourriez "],
  [/\bdevriez\s+/gi, "pourriez "],
  [/\bdevrait\s+/gi, "pourrait "],
  [/\bdevraient\s+/gi, "pourraient "],
  [/\bil faut\s+/gi, "une avenue est de "],
  [/\bil faudrait\s+/gi, "il pourrait être utile de "],
  [/\brecommandons\s+/gi, "observons que "],
  [/\bconseillons\s+/gi, "observons que "],
  // optimis*/optimiz* family → neutral observational vocabulary. FR.
  [/\boptimisez\s+/gi, "vous pourriez ajuster "],
  [/\boptimisations\b/gi, "ajustements"],
  [/\boptimisation\b/gi, "ajustement"],
  [/\boptimiser\b/gi, "ajuster"],
  [/\boptimisées\b/gi, "structurées"],
  [/\boptimisée\b/gi, "structurée"],
  [/\boptimisés\b/gi, "structurés"],
  [/\boptimisé\b/gi, "structuré"],
  [/\boptimise\b/gi, "ajuste"],
  [/\boptimisons\b/gi, "ajustons"],
  [/\boptimales\b/gi, "favorables"],
  [/\boptimale\b/gi, "favorable"],
  [/\boptimaux\b/gi, "favorables"],
  [/\boptimal\b/gi, "favorable"],
  // optimiz* family. EN.
  [/\boptimizations\b/gi, "adjustments"],
  [/\boptimization\b/gi, "adjustment"],
  [/\boptimizing\b/gi, "adjusting"],
  [/\boptimizes\b/gi, "structures"],
  [/\boptimized\b/gi, "structured"],
  [/\boptimize\b/gi, "adjust"],
  [/\bpriorisez\s+/gi, "vous pourriez prioriser "],
];

// Disclaimer phrasing that legitimately contains a forbidden token — strip
// before the FORBIDDEN_TERMS check so "ne sont pas des recommandations" passes.
const SAFE_DISCLAIMER_PATTERNS =
  /ne (sont|constitue(nt)?|s'agi(t|ssent)) pas (d'une?|des?) recommandation(s)?/gi;

function softenAISlot(text) {
  if (typeof text !== 'string') return text;
  var out = text;
  for (var i = 0; i < SOFT_REWRITES.length; i++) {
    out = out.replace(SOFT_REWRITES[i][0], SOFT_REWRITES[i][1]);
  }
  return out;
}

// Soften every slot in an AI narration object. Slots that still trip
// FORBIDDEN_TERMS after softening are DROPPED (omitted from the result) so the
// renderer falls back to its deterministic copy — never ship prescriptive text.
// Returns { ai: <clean object>, softened: [keys], dropped: [keys] }.
function sanitizeAiObject(raw) {
  var out = {};
  var softened = [];
  var dropped = [];
  if (!raw || typeof raw !== 'object') return { ai: out, softened: softened, dropped: dropped };
  Object.keys(raw).forEach(function (key) {
    var val = raw[key];
    if (typeof val !== 'string') { out[key] = val; return; }
    var clean = softenAISlot(val);
    if (clean !== val) softened.push(key);
    var forCheck = clean.replace(SAFE_DISCLAIMER_PATTERNS, '');
    if (FORBIDDEN_TERMS.test(forCheck)) {
      dropped.push(key);
      return; // omit → renderer fallback
    }
    out[key] = clean;
  });
  return { ai: out, softened: softened, dropped: dropped };
}

// EN currency convention (audit 2026-06-17). The prompt DATA block expresses
// compact money with the FR suffix form ("200K$", "1.4M$") regardless of report
// language, so EN narration that quotes DATA verbatim inherits the wrong
// convention ("a 200K$ RRSP" instead of "a $200K RRSP"). The renderer's own
// tables/charts are already lang-aware (fmtCompact reads window.__bfLang); this
// normalizes the AI slots for EN reports only. FR is left untouched.
function localizeCurrencyEN(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\b(\d+(?:\.\d+)?)\s*K\$/g, '$$$1K')
    .replace(/\b(\d+(?:\.\d+)?)\s*M\$/g, '$$$1M');
}

// Apply EN currency normalization to every string slot in an AI object when the
// report language is English. Returns { ai, changed: [keys] }.
function normalizeCurrency(raw, lang) {
  if (lang !== 'en' || !raw || typeof raw !== 'object') return { ai: raw, changed: [] };
  var out = {};
  var changed = [];
  Object.keys(raw).forEach(function (k) {
    var v = raw[k];
    if (typeof v === 'string') {
      var nv = localizeCurrencyEN(v);
      if (nv !== v) changed.push(k);
      out[k] = nv;
    } else { out[k] = v; }
  });
  return { ai: out, changed: changed };
}

module.exports = {
  FORBIDDEN_TERMS: FORBIDDEN_TERMS,
  localizeCurrencyEN: localizeCurrencyEN,
  normalizeCurrency: normalizeCurrency,
  SOFT_REWRITES: SOFT_REWRITES,
  SAFE_DISCLAIMER_PATTERNS: SAFE_DISCLAIMER_PATTERNS,
  softenAISlot: softenAISlot,
  sanitizeAiObject: sanitizeAiObject,
};
