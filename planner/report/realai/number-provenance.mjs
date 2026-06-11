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
const promptDir = path.join(__dirname, 'prompts');
const respDir = path.join(__dirname, 'responses');
const mcDir = path.join(__dirname, 'mc');

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

function nums(text) {
  if (!text) return [];
  const cleaned = String(text).replace(/\b[Pp]\d{1,3}\b/g, ' '); // drop P25/p5 percentile tokens
  const raw = cleaned.match(new RegExp(`\\d[\\d.,${SP.slice(1, -1)}]*\\d|\\d`, 'g')) || [];
  return raw.map(canonNum).filter(Boolean);
}

const FRAGILE_EN = /\b(solid|robust|strong|durable|on track|comfortable|secure|healthy)\b/i;
const FRAGILE_FR = /\b(solide|robuste|fort|fiable|stable|sain|confortable|durable|en bonne voie)\b/i;
const LEAK_EN_IN_FR = /\b(OAS|RRIF|CPP|GIS)\b/;
const LEAK_FR_IN_EN = /\b(PSV|FERR|RRQ|SRG)\b/;
const QUALIFIER = /\b(but|though|yet|however|while|mais|toutefois|cependant|tandis)\b/i;

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

  const allowed = new Set(nums(prompt.user));
  for (let i = 0; i <= 12; i++) allowed.add(String(i)); // sentence counts / phase numbers

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
    const foreign = [...new Set(nums(text).filter(n => !allowed.has(n)))];
    if (foreign.length) defects.push({ tag, slot, kind: 'foreign_number', detail: foreign.slice(0, 8).join(', ') });
    if (fragile && openingSlots.has(slot)) {
      const re = locale === 'fr' ? FRAGILE_FR : FRAGILE_EN;
      const m = text.match(re);
      if (m && !QUALIFIER.test(text)) defects.push({ tag, slot, kind: 'direction_violation', detail: `"${m[0]}" with band=fragile` });
    }
    const leak = (locale === 'fr' ? LEAK_EN_IN_FR : LEAK_FR_IN_EN).exec(text);
    if (leak) defects.push({ tag, slot, kind: 'locale_leak', detail: leak[0] });
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
