#!/usr/bin/env node
// Phase 1 verification: cover-promise, chapter covers (Ch.1–Ch.5), hero KPI.
import fs from 'node:fs';
import path from 'node:path';

const finalDir = path.resolve('planner/report/realai/final');
const targets = [
  ['low_income_gis_en__beg_mod_con',     'beg+con EN'],
  ['conservative_retiree_qc_fr__int_low_bal', 'int+bal FR'],
  ['hnw_couple_fr__adv_low_det',         'adv+det FR'],
  ['ccpc_owner_en__adv_mod_det',         'adv+det EN (CCPC)'],
  ['fire_seeker_fr__adv_low_det',        'adv+det FR (FIRE)'],
];

for (const [tag, label] of targets) {
  const h = fs.readFileSync(path.join(finalDir, tag + '.html'), 'utf8');
  console.log('\n---', label, '/', tag, '---');
  // cover-promise: presence + first 80 chars of italic line
  const promiseM = h.match(/<div class="cover-promise"[^>]*>([^<]+)<\/div>/);
  console.log('  cover-promise:', promiseM ? '"'+promiseM[1].trim().slice(0,90)+'"' : 'MISSING');
  // chapter covers
  const chapterCovers = (h.match(/class="bf-chapter-cover"/g) || []).length;
  console.log('  chapter covers rendered:', chapterCovers);
  const chapterTitles = [...h.matchAll(/<div class="bf-chapter-title"[^>]*>([^<]+)<\/div>/g)].map(m=>m[1].trim());
  chapterTitles.forEach((t,i)=>console.log('    Ch.'+(i+1)+':', t));
  // hero KPI: presence + label + value
  const heroM = h.match(/<div class="bf-hero-kpi"[\s\S]{0,800}/);
  if (heroM) {
    const lblM = heroM[0].match(/text-transform:uppercase;[^>]*>([^<]+)/);
    const valM = heroM[0].match(/Playfair Display[^>]*>([^<]+)/);
    console.log('  hero KPI label:', lblM ? '"'+lblM[1].trim()+'"' : '?');
    console.log('  hero KPI value:', valM ? '"'+valM[1].trim()+'"' : '?');
  } else {
    console.log('  hero KPI: MISSING');
  }
}
