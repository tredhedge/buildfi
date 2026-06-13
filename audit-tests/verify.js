const fs=require('fs');
global.html=''; const store={};
global.localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}};
global.navigator={userAgent:'node'};
eval(fs.readFileSync('sam.js','utf8'));
eval(fs.readFileSync('extras.js','utf8'));
eval(fs.readFileSync('engine.js','utf8'));

// Seeded RNG for reproducibility
function seed(s){let st=s>>>0;Math.random=function(){st=(st+0x6D2B79F5)|0;let t=st;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}

console.log("=== EXP 1: Return generator statistics (eq, simple mode) ===");
function genStats(fatT, n){
  seed(42); const draws=[];
  // emulate engine: rw of 5 t-draws, CHL multiply, eqR = mean + vol*zz[0]
  for(let i=0;i<n;i++){const rw=[];for(let r=0;r<5;r++)rw.push(fatT?tRn(5):tRn(999));
    const zz=CHL.map(row=>row.reduce((s,v,j)=>s+v*rw[j],0));
    draws.push({eq:0.07+0.16*zz[0], bd:0.035+0.06*zz[1]});}
  const m=a=>a.reduce((x,y)=>x+y,0)/a.length;
  const sd=a=>{const mu=m(a);return Math.sqrt(m(a.map(x=>(x-mu)**2)));};
  const eq=draws.map(d=>d.eq), bd=draws.map(d=>d.bd);
  const cov=m(eq.map((x,i)=>(x-m(eq))*(bd[i]-m(bd))));
  return {eqMean:m(eq),eqSd:sd(eq),bdMean:m(bd),bdSd:sd(bd),corr:cov/(sd(eq)*sd(bd))};
}
const sN=genStats(false,200000), sT=genStats(true,200000);
console.log("normal : eqMean %s eqSd %s bdSd %s corr(eq,bd) %s", sN.eqMean.toFixed(4),sN.eqSd.toFixed(4),sN.bdSd.toFixed(4),sN.corr.toFixed(3));
console.log("fatTail: eqMean %s eqSd %s bdSd %s corr(eq,bd) %s", sT.eqMean.toFixed(4),sT.eqSd.toFixed(4),sT.bdSd.toFixed(4),sT.corr.toFixed(3));
console.log("-> configured eqVol=0.16; fat-tail effective vol = "+sT.eqSd.toFixed(4)+" ("+((sT.eqSd/0.16-1)*100).toFixed(1)+"% inflation)");

console.log("\n=== EXP 2: Tax computed but never funded (zero-return drain test) ===");
// Single, QC, retire now, all RRSP, zero returns/inflation/vol -> deterministic drain
seed(7);
const p2={age:65,retAge:65,deathAge:95,sex:"M",prov:"QC",rrsp:1000000,tfsa:0,nr:0,
  retSpM:6000, qppAge:65, oasAge:65, avgE:0, qppYrs:0, inf:0, eqRet:0, eqVol:0.0100001, bndRet:0, bndVol:0.0100001,
  allocR:0, allocT:0, allocN:0, merR:0, merT:0, merN:0, nrTaxDrag:0, stochInf:false, stochMort:false, wStrat:"optimal", melt:false};
const r2=runMC(p2,1,()=>{});
// walk median path
let totTax=0,totSpend=0,totQpp=0,totOas=0,totGis=0;
r2.medPath.forEach(mp=>{totTax+=mp.tax||0;totSpend+=mp.spend||0;totQpp+=mp.qpp||0;totOas+=mp.oas||0;totGis+=mp.gis||0;});
const final=r2.medPath[r2.medPath.length-1].total;
console.log("initial 1,000,000 | sum spending %s | sum OAS %s | sum GIS %s | sum tax (reported) %s", Math.round(totSpend), Math.round(totOas), Math.round(totGis), Math.round(totTax));
console.log("final balance %s vs identity initial - spend + gov = %s", Math.round(final), Math.round(1000000-totSpend+totOas+totGis+totQpp));
console.log("-> if equal, the reported tax of $"+Math.round(totTax)+" was never debited from any account");
console.log("ruinPct:",(r2.ruinPct*100).toFixed(1)+"%  succ:",(r2.succ*100).toFixed(1)+"%");

console.log("\n=== EXP 3: optimizeDecum money conservation (melt surplus double-deposit) ===");
const p3={age:71,retAge:71,deathAge:81,prov:"QC",rrsp:800000,tfsa:0,nr:0,retSpM:1000,
  qppAge:70,avgE:0,qppYrs:0,oasAge:70,inf:0,eqRet:0,bndRet:0,allocR:0,allocT:0,allocN:0,merR:0,merT:0,merN:0,melt:true,meltTgt:60000};
const r3=optimizeDecum(p3);
let inflow=800000, outSpend=0, outBal=0;
r3.schedule.forEach(s=>{outSpend+=Math.min(s.spending||0,(s.rrifMin||0)+(s.meltdown||0)+(s.fromRRSP||0)+(s.fromTFSA||0)+(s.fromNR||0)+(s.govInc||0));});
const last=r3.schedule[r3.schedule.length-1];
outBal=(last.balRR||0)+(last.balTF||0)+(last.balNR||0);
let totalWith=0,totalSpendNeed=0;
r3.schedule.forEach(s=>{totalWith+=(s.rrifMin||0)+(s.cRrifMin||0)+(s.meltdown||0)+(s.fromRRSP||0)+(s.fromTFSA||0)+(s.fromNR||0);totalSpendNeed+=(s.spending||0)-(s.govInc||0);});
console.log("withdrawn from RRSP over 10y (rrif+melt+vol): %s | spending need: %s", Math.round(totalWith), Math.round(totalSpendNeed));
console.log("ending balances RR %s TF %s NR %s | TOTAL %s", Math.round(last.balRR),Math.round(last.balTF),Math.round(last.balNR), Math.round(outBal));
console.log("conservation check: start - withdrawn = expected RR; surplus should appear ONCE in TF/NR");
console.log("identity: 800000 - totalWith + (totalWith - spendNeed reinvested once) should equal total; total=%s vs 800000-spendNeed=%s; excess = phantom money", Math.round(outBal), Math.round(800000-totalSpendNeed));

console.log("\n=== EXP 4: OAS deflation inconsistency in optimizeDecum ===");
const p4={age:64,retAge:64,deathAge:90,prov:"ON",rrsp:0,tfsa:0,nr:0,retSpM:2000,penType:"db",penM:13000,penIdx:true,
  qppAge:65,avgE:74600,qppYrs:40,oasAge:65,inf:0.021,eqRet:0,bndRet:0,melt:false};
const r4=optimizeDecum(p4);
const yr20=r4.schedule.find(s=>s.age===84);
console.log("age 84 | DB pension(nominal) %s | govInc.oas-in-cash %s | taxInc %s | tax %s", Math.round(13000*12*Math.pow(1.021,20)), Math.round(yr20.oas), Math.round(yr20.taxInc), Math.round(yr20.tax));
const oasFull=calcOAS(65,0,20,0.021,84)*12;
const oasOnNominal=calcOAS(65,yr20.taxInc,20,0.021,84)*12;
console.log("full OAS at yr20 = %s | OAS if clawback applied on nominal income = %s | granted in cash flow = %s",Math.round(oasFull),Math.round(oasOnNominal),Math.round(yr20.oas));
