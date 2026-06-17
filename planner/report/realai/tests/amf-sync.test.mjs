#!/usr/bin/env node
// amf-sync.test.mjs — assert the AMF banned-term lists stay in sync across the
// pipeline so a stem can never be banned in one gate but leak through another.
//
// Sources checked:
//   - planner/report/amf-sanitize.js     (JS, render-path sanitizer — canonical)
//   - lib/ai-constants.ts                (TS, production webhook sanitizer)
//   - planner/report/realai/number-provenance.mjs (CI provenance gate)
//   - planner/report/review/reviewers/compliance-auditor.js (ship-gate auditor)
//
// Every CRITICAL_STEM below must be present in ALL of them, and the JS
// sanitizer must functionally soften the optimis*/optimiz* family and drop an
// irreducible "plan d'action" slot. Run: node planner/report/realai/tests/amf-sync.test.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');

const amf = require(path.join(repoRoot, 'planner/report/amf-sanitize.js'));

const sources = {
  'amf-sanitize.js': amf.FORBIDDEN_TERMS.source,
  'ai-constants.ts': fs.readFileSync(path.join(repoRoot, 'lib/ai-constants.ts'), 'utf8'),
  'number-provenance.mjs': fs.readFileSync(path.join(repoRoot, 'planner/report/realai/number-provenance.mjs'), 'utf8'),
  'compliance-auditor.js': fs.readFileSync(path.join(repoRoot, 'planner/report/review/reviewers/compliance-auditor.js'), 'utf8'),
};

// Substrings that must appear in each source's banned-term regex.
const CRITICAL_STEMS = ['optimis', 'optimiz', "plan d", 'action plan'];

const failures = [];
for (const [name, src] of Object.entries(sources)) {
  for (const stem of CRITICAL_STEMS) {
    if (!src.includes(stem)) failures.push(`${name} is missing banned stem "${stem}"`);
  }
}

// Functional checks on the canonical sanitizer.
function fnCheck(label, cond) { if (!cond) failures.push('functional: ' + label); }
const r1 = amf.sanitizeAiObject({ s: "une extraction optimisée et l'optimisation des décaissements" });
fnCheck('optimisée/optimisation softened (kept, stem-free)',
  r1.ai.s && !/optimis/i.test(r1.ai.s));
const r2 = amf.sanitizeAiObject({ s: 'a documented optimized extraction with optimization' });
fnCheck('optimized/optimization softened (kept, stem-free)',
  r2.ai.s && !/optimiz/i.test(r2.ai.s));
const r3 = amf.sanitizeAiObject({ s: "le diagnostic et le plan d'action concrets" });
fnCheck("irreducible plan d'action slot dropped", r3.ai.s === undefined && r3.dropped.includes('s'));
const r4 = amf.sanitizeAiObject({ s: 'a structured withdrawal order could lower lifetime tax' });
fnCheck('clean observational slot preserved', r4.ai.s && r4.softened.length === 0 && r4.dropped.length === 0);

if (failures.length) {
  console.error('✗ amf-sync FAILED:');
  failures.forEach(f => console.error('  - ' + f));
  process.exit(1);
}
console.log('✓ amf-sync: all 4 sources carry the critical banned stems; sanitizer softens optimis*/optimiz* and drops plan d\'action.');
process.exit(0);
