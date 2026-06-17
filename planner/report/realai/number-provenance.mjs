#!/usr/bin/env node
// number-provenance.mjs — B3 gate: every numeral in an AI response must exist
// in the DATA block the model was given. Catches re-rounded / fabricated /
// derived numbers (the 38/39, 475/424, 65/68/88 class of defect) that the
// existing qa-check.mjs does not detect.
//
// Also flags: direction violations (band fragile vs "solid/durable" prose)
// and acronym locale-leaks (OAS/RRIF in FR, PSV/FERR/RRQ in EN).
//
// Handles FR + EN number formats: "56,1" (FR decimal) and "4 006" / "4 006"
// (FR thousands w/ space or NBSP) normalize the same as "56.1" and "4006".
//
// Usage: node number-provenance.mjs [--only=profile1,profile2]
// Exit 0 = clean, 1 = at least one defect.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// BF_REALAI_BASE repoints to a separate profile set (e.g. bilan360-personas/).
const DATA_DIR = process.env.BF_REALAI_BASE ? path.resolve(process.env.BF_REALAI_BASE) : __dirname;
const promptDir = path.join(DATA_DIR, 'prompts');
const respDir = path.join(DATA_DIR, 'responses');
const mcDir = path.join(DATA_DIR, 'mc');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true];
}));
const only = args.only ? String(args.only).split(',').map(s => s.trim()) : null;

// Any space variant (regular, NBSP, narrow NBSP, thin) used as a thousands sep.
const SP = '[ \\u00A0\\u202F\\u2009]';

// Canonicalize one numeric token across FR/EN formats.
function canonNum(s) {
  s = s.replace(new RegExp(SP, 'g'), '');           // drop thousands spaces/NBSP
  s = s.replace(/,(\d{1,2})$/, '.$1');               // FR decimal comma (1-2 trailing) -> dot
  s = s.replace(/,/g, '');                            // remaining commas = thousands
  s = s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, ''); // trim trailing zeros + bare dot
  return s;
}

// Unit-aware tokenizer (audit 2026-06-16). The old extractor stripped the
// magnitude suffix and the unit, so "526 K$", "526 %", and a bare "526" all
// canonicalized to "526" — a fabricated $526K estate passed whenever a bare
// 526 appeared anywhere in the prompt, and the gate produced noisy false
// positives on ages. Each token now carries a unit class so a response number
// only matches a prompt number of the SAME magnitude+unit.
//   unit: 'K' = thousands-$, 'M' = millions-$, '$' = plain dollars,
//         '%' = percent, '' = bare (age / year / count).
// Returns canonical "value@unit" keys.
const SPchars = SP.slice(1, -1); // the char-class body, e.g. "    "
const TOKEN_RE = new RegExp(
  '(\\$\\s?)?(\\d[\\d.,' + SPchars + ']*\\d|\\d)\\s?(M\\$|k\\$|K\\$|M\\b|K\\b|\\$|%)?',
  'gi'
);
function tokenize(text) {
  if (!text) return [];
  const cleaned = String(text).replace(/\b[Pp]\d{1,3}\b/g, ' '); // drop P25/p5 percentile tokens
  const out = [];
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(cleaned))) {
    const v = canonNum(m[2]);
    if (!v) continue;
    const suf = m[3] || '';
    let u = '';
    if (/k/i.test(suf)) u = 'K';
    else if (/m/i.test(suf)) u = 'M';
    else if (suf === '%') u = '%';
    else if (suf === '$' || m[1]) u = '$';
    out.push(v + '@' + u);
  }
  return out;
}

// Fixed Canadian-retirement constants the narrative legitimately cites but the
// DATA block does not always carry verbatim: RRIF conversion (71/72), CPP/OAS
// claim ages (60/65/67/70), historical stress years, the projection/current
// years, and the 0%/100% percent bounds. Whitelisting these (by value@unit)
// removes the age/year false positives without masking fabricated money.
const DOMAIN_WHITELIST = [
  '60@', '65@', '67@', '70@', '71@', '72@',
  // historical crisis / decade references narration legitimately cites
  '1929@', '1970@', '1973@', '1981@', '1990@', '2000@', '2008@', '2020@', '2022@', '2025@', '2026@',
  '0@%', '100@%'
];

const FRAGILE_EN = /\b(solid|robust|strong|durable|on track|comfortable|secure|healthy)\b/i;
const FRAGILE_FR = /\b(solide|robuste|fort|fiable|stable|sain|confortable|durable|en bonne voie)\b/i;
const LEAK_EN_IN_FR = /\b(OAS|RRIF|CPP|GIS)\b/;
const LEAK_FR_IN_EN = /\b(PSV|FERR|RRQ|SRG)\b/;
// Bilingual gloss exception (audit 2026-06-16): "PSV/OAS", "RRQ/CPP" etc. are
// deliberate native-acronym + translation pairs, not leaks.
const GLOSS = /(PSV\s*\/\s*OAS|OAS\s*\/\s*PSV|RRQ\s*\/\s*(RPC|CPP)|(RPC|CPP)\s*\/\s*RRQ|SRG\s*\/\s*GIS|GIS\s*\/\s*SRG|FERR\s*\/\s*RRIF|RRIF\s*\/\s*FERR|CELI\s*\/\s*TFSA|TFSA\s*\/\s*CELI|REER\s*\/\s*RRSP|RRSP\s*\/\s*REER)/i;
// Number-FORMAT locale leak (audit 2026-06-16, conservative — only unambiguous
// signals so the bilingual "K$" compact form is never flagged):
//  FR must not use the EN dollar-PREFIX ("$2,400" / "$526K"); FR uses suffix "$".
//  EN must not use FR space/NBSP thousands on a suffix-$ amount ("3 382 $") nor
//  an FR decimal comma in a percent/decimal ("59,9 %").
const FMT_LEAK_EN_IN_FR = /\$\s?\d/;
const FMT_LEAK_FR_IN_EN = /\d[\u00A0\u202F\u2009 ]\d{3}\s?\$|\d,\d{1,2}\s?%/;
const QUALIFIER = /\b(but|though|yet|however|while|mais|toutefois|cependant|tandis)\b/i;
// AMF hard-negative (audit 2.5): the conditional/observational register forbids
// the "optimis*/optimiz*" stem and directive phrasing in any AI slot. The noun
// "recommandation(s)" inside a disclaimer is fine; "we recommend / nous
// recommandons / you should / vous devriez / plan d'action" are not.
const BANNED_AMF = /(optimis[a-zé]+|optimiz[a-z]+|vous devriez|you should|plan d['’]action|action plan|nous recommandons|we recommend\b|il faut que)/i;

const files = fs.readdirSync(promptDir).filter(f => f.endsWith('.json'));
const considered = files.filter(f => !only || only.some(o => f.startsWith(o)));
const defects = [];

for (const f of considered) {
  const tag = f.replace('.json', '');
  const prompt = JSON.parse(fs.readFileSync(path.join(promptDir, f), 'utf8'));
  const respPath = path.join(respDir, tag + '.json');
  if (!fs.existsSync(respPath)) continue;
  const resp = JSON.parse(fs.readFileSync(respPath, 'utf8'));
  const locale = prompt.lang === 'fr' ? 'fr' : 'en';

  const allowed = new Set(tokenize(prompt.user));
  for (let i = 0; i <= 12; i++) allowed.add(i + '@'); // sentence counts / phase numbers (bare)
  for (const w of DOMAIN_WHITELIST) allowed.add(w);   // fixed retirement constants

  let band = null;
  const mcPath = path.join(mcDir, tag + '.json');
  if (fs.existsSync(mcPath)) {
    try {
      const succ = JSON.parse(fs.readFileSync(mcPath, 'utf8')).succ;
      if (succ != null) band = succ < 0.45 ? 'fragile' : 'sound';
    } catch { /* ignore */ }
  }
  const fragile = band === 'fragile';
  const openingSlots = new Set(['advisor_letter', 'overall_assessment', 'verdict', 'page_zero_verdict']);

  for (const [slot, text] of Object.entries(resp)) {
    if (typeof text !== 'string') continue;
    const foreign = [...new Set(tokenize(text).filter(n => !allowed.has(n)))];
    if (foreign.length) defects.push({ tag, slot, kind: 'foreign_number', detail: foreign.slice(0, 8).join(', ') });
    if (fragile && openingSlots.has(slot)) {
      const re = locale === 'fr' ? FRAGILE_FR : FRAGILE_EN;
      const m = text.match(re);
      if (m && !QUALIFIER.test(text)) defects.push({ tag, slot, kind: 'direction_violation', detail: `"${m[0]}" with band=fragile` });
    }
    const leak = (locale === 'fr' ? LEAK_EN_IN_FR : LEAK_FR_IN_EN).exec(text);
    if (leak && !GLOSS.test(text)) defects.push({ tag, slot, kind: 'locale_leak', detail: leak[0] });
    const fmtLeak = (locale === 'fr' ? FMT_LEAK_EN_IN_FR : FMT_LEAK_FR_IN_EN).exec(text);
    if (fmtLeak) defects.push({ tag, slot, kind: 'format_leak', detail: fmtLeak[0].trim() });
    const amf = BANNED_AMF.exec(text);
    if (amf) defects.push({ tag, slot, kind: 'amf_banned', detail: amf[0] });
  }
}

console.log(`Number-provenance scan: ${considered.length} profile(s) considered.`);
if (defects.length === 0) { console.log('  ✓ No foreign numbers, direction, or locale-leak defects.'); process.exit(0); }
const by = {};
for (const d of defects) (by[d.tag] ??= []).push(d);
for (const tag of Object.keys(by).sort()) {
  console.log(`  ⨉ ${tag}`);
  for (const d of by[tag]) console.log(`      [${d.kind}] ${d.slot}: ${d.detail}`);
}
console.log(`\n${defects.length} defect(s) across ${Object.keys(by).length} profile(s).`);
process.exit(1);
