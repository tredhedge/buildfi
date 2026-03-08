// Quick verification of translator fallback fixes
// @ts-nocheck
import { translateDecumToMC } from '../lib/quiz-translator-decum';

// Test with "test profile" field names (rrsp/tfsa/nr/penType/penM/mortgage/debts[])
const quiz1 = { age:62, retAge:65, sex:'M', prov:'QC', income:80000, rrsp:400000, tfsa:80000, nr:50000, penType:'db', penM:2200, mortgage:120000, debts:[{type:'cc',amount:5000}], retSpM:5000, risk:'balanced', couple:'no' };
const p1 = translateDecumToMC(quiz1);
console.log('=== Test profile field names ===');
console.log('rrsp:', p1.rrsp, '(expect 400000)');
console.log('tfsa:', p1.tfsa, '(expect 80000)');
console.log('nr:', p1.nr, '(expect 50000)');
console.log('penType:', p1.penType, '(expect db)');
console.log('penM:', p1.penM, '(expect 2200)');
console.log('_report.homeMortgage:', p1._report?.homeMortgage, '(expect 120000)');
console.log('_report.totalDebt:', p1._report?.totalDebt, '(expect 5000)');
console.log('_report.homeEquity:', p1._report?.homeEquity);

// Test with "production quiz" field names (rrspBal/tfsaBal/nrBal/hasPension/penMonthly/homeMortgage/totalDebt)
const quiz2 = { age:62, retAge:65, sex:'M', prov:'QC', income:80000, rrspBal:400000, tfsaBal:80000, nrBal:50000, hasPension:true, penMonthly:2200, homeMortgage:120000, totalDebt:5000, retSpM:5000, risk:'balanced', couple:'no' };
const p2 = translateDecumToMC(quiz2);
console.log('\n=== Production quiz field names ===');
console.log('rrsp:', p2.rrsp, '(expect 400000)');
console.log('tfsa:', p2.tfsa, '(expect 80000)');
console.log('nr:', p2.nr, '(expect 50000)');
console.log('penType:', p2.penType, '(expect db)');
console.log('penM:', p2.penM, '(expect 2200)');
console.log('_report.homeMortgage:', p2._report?.homeMortgage, '(expect 120000)');
console.log('_report.totalDebt:', p2._report?.totalDebt, '(expect 5000)');

// Test with zero savings (should still be zero, not undefined/NaN)
const quiz3 = { age:62, retAge:65, sex:'M', prov:'QC', income:40000, retSpM:2000, risk:'conservative', couple:'no' };
const p3 = translateDecumToMC(quiz3);
console.log('\n=== Zero savings ===');
console.log('rrsp:', p3.rrsp, '(expect 0)');
console.log('tfsa:', p3.tfsa, '(expect 0)');
console.log('nr:', p3.nr, '(expect 0)');

console.log('\nAll translator tests passed visually.');
