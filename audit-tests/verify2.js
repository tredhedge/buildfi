const fs=require('fs');
global.html=''; const store={};
global.localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}};
global.navigator={userAgent:'node'};
eval(fs.readFileSync('sam.js','utf8'));eval(fs.readFileSync('extras.js','utf8'));eval(fs.readFileSync('engine.js','utf8'));
tRn = function(){ return 0; }; // exact zero noise -> deterministic mean returns

console.log("=== EXP 2b: falsy-zero parameter bug (eqRet:0 silently becomes 7%) ===");
const base={age:65,retAge:65,deathAge:75,sex:"M",prov:"QC",rrsp:500000,tfsa:0,nr:0,retSpM:0.0001,
  qppAge:71,oasAge:71,avgE:0,qppYrs:0,inf:1e-12,allocR:1,allocT:1,allocN:1,merR:0,merT:0,merN:0,nrTaxDrag:1e-12,
  stochMort:false,stochInf:false,melt:false,wStrat:"optimal",bndRet:1e-12,bndVol:0.010001,eqVol:0.010001};
const rA=runMC(Object.assign({},base,{eqRet:0}),1);     // user explicitly wants 0%
const rB=runMC(Object.assign({},base,{eqRet:1e-12}),1); // workaround value ~0
console.log("eqRet:0      -> 10y final:", Math.round(rA.medPath[10].total), "(grew at 7% default!)");
console.log("eqRet:1e-12  -> 10y final:", Math.round(rB.medPath[10].total), "(true ~0%)");

console.log("\n=== EXP 2-clean: taxes reported but never funded (runMC, exact zero returns) ===");
const p2={age:65,retAge:65,deathAge:95,sex:"M",prov:"QC",rrsp:1000000,tfsa:0,nr:0,
  retSpM:6000,qppAge:65,oasAge:65,avgE:1e-12,qppYrs:0,inf:1e-12,eqRet:1e-12,eqVol:0.010001,bndRet:1e-12,bndVol:0.010001,
  allocR:1,allocT:1,allocN:1,merR:0,merT:0,merN:0,nrTaxDrag:1e-12,stochInf:false,stochMort:false,wStrat:"optimal",melt:false,
  goP:1,slP:1,noP:1,healthMul:1e-12,smileSlAge:200,smileNoAge:201,healthAge:202};
const r2=runMC(p2,1);
let T=0,S=0,O=0,G=0;
r2.medPath.forEach(mp=>{T+=mp.tax||0;S+=mp.spend||0;O+=mp.oas||0;G+=mp.gis||0;});
const fin=r2.medPath[r2.medPath.length-1].total;
console.log("Σspend",Math.round(S),"ΣOAS",Math.round(O),"ΣGIS",Math.round(G),"Σtax(reported)",Math.round(T));
console.log("final:",Math.round(fin)," vs  initial−Σspend+Σgov =",Math.round(1000000-S+O+G));
console.log("-> match within rounding = taxes ($"+Math.round(T)+") never funded by withdrawals; succ:",(r2.succ*100).toFixed(0)+"%");

console.log("\n=== EXP 5: runMC RRIF-surplus evaporation (opposite of optimizeDecum) ===");
const p5={age:75,retAge:75,deathAge:85,sex:"M",prov:"QC",rrsp:1000000,tfsa:0,nr:0,
  retSpM:0.0001,qppAge:76,oasAge:76,avgE:1e-12,qppYrs:0,inf:1e-12,eqRet:1e-12,eqVol:0.010001,bndRet:1e-12,bndVol:0.010001,
  allocR:1,allocT:1,allocN:1,merR:0,merT:0,merN:0,nrTaxDrag:1e-12,stochInf:false,stochMort:false,wStrat:"optimal",melt:false};
const r5=runMC(p5,1);
let rrifSum=0; (r5.revData||[]).forEach(rv=>rrifSum+=(rv.wRrifMin||0));
const f5=r5.medPath[r5.medPath.length-1];
console.log("RRIF mins forced out over 10y:",Math.round(rrifSum),"| spending ~0 | final rr:",Math.round(f5.rr),"tf:",Math.round(f5.tf),"nr:",Math.round(f5.nr));
console.log("-> household wealth should be ~1,000,000 (cash kept), engine shows",Math.round(f5.total),"=> $"+Math.round(1000000-f5.total)+" evaporated (unspent RRIF cash not reinvested)");

console.log("\n=== EXP 3-clean: optimizeDecum surplus double-deposit (exact zero returns) ===");
const p3={age:71,retAge:71,deathAge:81,prov:"QC",rrsp:800000,tfsa:1e-9,nr:1e-9,retSpM:1e-9,
  qppAge:70,avgE:1e-12,qppYrs:1e-12,oasAge:70,inf:1e-12,eqRet:1e-12,bndRet:1e-12,allocR:1,allocT:1,allocN:1,merR:0,merT:0,merN:0,melt:false};
const r3=optimizeDecum(p3);
const L=r3.schedule[r3.schedule.length-1];
let wd=0; r3.schedule.forEach(s=>{wd+=(s.rrifMin||0)+(s.meltdown||0)+(s.fromRRSP||0);});
console.log("RRSP outflows (rrif+melt) over 10y:",Math.round(wd));
console.log("end balRR:",Math.round(L.balRR),"balTF:",Math.round(L.balTF),"balNR:",Math.round(L.balNR),"TOTAL:",Math.round(L.balRR+L.balTF+L.balNR));
console.log("conservation: should be ≈800,000 (nothing spent). Excess over 800,000 =",Math.round(L.balRR+L.balTF+L.balNR-800000),"= phantom money (surplus deposited twice/yr)");

console.log("\n=== EXP 7: stochDeath life expectancy check (claim: ~86 M / ~88.5 F at 65) ===");
// restore real randomness for this one
(function(){let st=12345>>>0;Math.random=function(){st=(st+0x6D2B79F5)|0;let t=st;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};})();
function le(sex){let s=0,n=20000;for(let i=0;i<n;i++)s+=stochDeath(65,sex);return s/n;}
console.log("LE@65 M:",le("M").toFixed(1)," F:",le("F").toFixed(1));

console.log("\n=== EXP 9: p5Ruin uses UNSORTED ruinAges ===");
console.log("(code: ruinAgesSorted built at L5384, but p5Ruin/p10Ruin index raw ruinAges at L~5750) — static finding, see report");

console.log("\n=== EXP 8: calcTax spot values (engine, 2026 base) ===");
[["QC",50000],["QC",100000],["QC",200000],["ON",100000],["AB",70000],["NS",60000],["PE",60000]].forEach(([pv,inc])=>{
  const t=calcTax(inc,0,pv,0,false);
  console.log(pv,inc,"-> total",Math.round(t.total),"fed",Math.round(t.fed),"prov",Math.round(t.prov),"marg",(t.marg*100).toFixed(2)+"%");
});
const dv=calcTax(0,0,"QC",0,false,{eligDiv:50000,nonEligDiv:0});
console.log("QC, $50K eligible dividends only -> total tax:",Math.round(dv.total),"(floor at 0 per credit-no-refund)");
