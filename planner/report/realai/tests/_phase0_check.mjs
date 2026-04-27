#!/usr/bin/env node
// Quick check: Phase 0 delabel removed visible "Simulator/What-If/Simulate/Reset to baseline" from rendered finals.
import fs from 'node:fs';
import path from 'node:path';

const finalDir = path.resolve('planner/report/realai/final');
const targets = ['low_income_gis_en__beg_mod_con','conservative_retiree_qc_fr__int_low_bal','hnw_couple_fr__adv_low_det','sandwich_gen_en__int_hig_bal'];
const phrases = [
  'Scenario simulator', 'What-If Simulator', 'Simulateur de sc',
  'Simuler ce sc', 'Simulate this scenario',
  "Remettre au plan d'origine", 'Reset to baseline',
  'Enregistrer le sc', 'Save scenario',
  'Simulation en cours', 'Simulating',
  'Simulation termin', 'Simulation complete',
  'Plan de base', 'Baseline plan',
  'simulateur de sc', 'What-If simulator',
];

const expected = ['Explorer des alternatives', 'Explore alternatives', 'Voir l\'effet', 'Back to my plan', 'Votre plan', 'Your plan'];

for (const t of targets) {
  const h = fs.readFileSync(path.join(finalDir, t + '.html'), 'utf8');
  console.log('---', t, '---');
  console.log('  OFFENDING (should be 0):');
  phrases.forEach(p => {
    const re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const c = (h.match(re) || []).length;
    if (c) console.log('   ', c, '×', p);
  });
  console.log('  EXPECTED (should be > 0):');
  expected.forEach(p => {
    const re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const c = (h.match(re) || []).length;
    console.log('   ', c, '×', p);
  });
}
