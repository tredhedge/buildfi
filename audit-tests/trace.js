const fs=require('fs');
global.html=''; const store={};
global.localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}};
global.navigator={userAgent:'node'};
eval(fs.readFileSync('sam.js','utf8'));eval(fs.readFileSync('extras.js','utf8'));eval(fs.readFileSync('engine.js','utf8'));
function seed(s){let st=s>>>0;Math.random=function(){st=(st+0x6D2B79F5)|0;let t=st;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}

console.log("=== TRACE optimizeDecum (EXP3 profile) ===");
const p3={age:71,retAge:71,deathAge:81,prov:"QC",rrsp:800000,tfsa:0,nr:0,retSpM:1000,
  qppAge:70,avgE:0,qppYrs:0,oasAge:70,inf:0,eqRet:0,bndRet:0,allocR:0,allocT:0,allocN:0,merR:0,merT:0,merN:0,melt:true};
const r3=optimizeDecum(p3);
console.log("age | rrifMin | melt | fromRR | fromTF | fromNR | balRR | balTF | balNR | spend | govInc");
r3.schedule.forEach(s=>console.log([s.age,s.rrifMin,s.meltdown,s.fromRRSP,s.fromTFSA,s.fromNR,s.balRR,s.balTF,s.balNR,s.spending,s.govInc].map(x=>Math.round(x||0)).join(" | ")));

console.log("\n=== TRACE runMC median path (EXP2 profile) ===");
seed(7);
const p2={age:65,retAge:65,deathAge:95,sex:"M",prov:"QC",rrsp:1000000,tfsa:0,nr:0,
  retSpM:6000, qppAge:65, oasAge:65, avgE:0, qppYrs:0, inf:0, eqRet:0, eqVol:0.0100001, bndRet:0, bndVol:0.0100001,
  allocR:0, allocT:0, allocN:0, merR:0, merT:0, merN:0, nrTaxDrag:0, stochInf:false, stochMort:false, wStrat:"optimal", melt:false};
const r2=runMC(p2,1,()=>{});
console.log("age | total | rr | spend | oas | gis | tax");
r2.medPath.forEach(mp=>console.log([mp.age,mp.total,mp.rr,mp.spend,mp.oas,mp.gis,mp.tax].map(x=>Math.round(x||0)).join(" | ")));
console.log("medRevData (first 12): age spend ret(withdraw) shortfall");
(r2.revData||[]).slice(0,12).forEach(rv=>console.log(rv.age, Math.round(rv.spend||0), Math.round(rv.ret||0), Math.round(rv.shortfall||0)));
