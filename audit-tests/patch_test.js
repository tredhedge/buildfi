const fs=require('fs');
global.html=''; const store={};
global.localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}};
global.navigator={userAgent:'node'};
eval(fs.readFileSync('sam.js','utf8'));eval(fs.readFileSync('extras.js','utf8'));

// --- baseline engine ---
let code=fs.readFileSync('engine.js','utf8');
eval(code);
const runMC_base = runMC;

// --- patched engine: fund income tax on fixed retirement income inside the need ---
// (lower bound: ignores extra tax on the discretionary withdrawals themselves)
let patched = code.replace(
  "var need = Math.max(0, spending - govInc - rrifMin - cRrifMin - meltAmt);",
  `var _fxTaxable = (qpp||0)+(oas||0)+(penMonth||0)*12+(ptInc||0)+(rrifMin||0)+(cRrifMin||0)+(meltAmt||0);
   var _fxTax = _fxTaxable>0 ? calcTax(_fxTaxable, y, p.prov||"QC", p.inf, true).total : 0;
   var need = Math.max(0, spending + _fxTax - govInc - rrifMin - cRrifMin - meltAmt);`
);
if (patched===code) { console.log("PATCH FAILED TO MATCH"); process.exit(1); }
eval(patched);
const runMC_taxed = runMC;

function seed(s){let st=s>>>0;Math.random=function(){st=(st+0x6D2B79F5)|0;let t=st;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}

// Representative profile: 60yo, QC, $700K RRSP / $150K TFSA / $100K NR, DB pension $1500/mo, spend $5,500/mo
const prof={age:60,retAge:62,deathAge:94,sex:"M",prov:"QC",sal:95000,rrsp:700000,tfsa:150000,nr:100000,costBase:80000,
  rrspC:15000,tfsaC:7000,nrC:0,retSpM:5500,inf:0.021,eqRet:0.062,eqVol:0.15,bndRet:0.034,bndVol:0.06,
  allocR:0.65,allocT:0.75,allocN:0.6,merR:0.004,merT:0.004,merN:0.004,nrTaxDrag:0.009,
  qppAge:65,avgE:74600,qppYrs:38,oasAge:65,penType:"db",penM:1500,penIdx:1,
  wStrat:"optimal",melt:false,stochMort:false,stochInf:true,fatT:false,goP:1,slP:0.85,noP:0.75};
seed(2026); const a=runMC_base(Object.assign({},prof),1500);
seed(2026); const b=runMC_taxed(Object.assign({},prof),1500);
console.log("BASE   succ:",(a.succ*100).toFixed(1)+"%  medFinal:",Math.round(a.fins[Math.floor(a.fins.length*.5)]).toLocaleString(), " p5:",Math.round(a.fins[Math.floor(a.fins.length*.05)]).toLocaleString());
console.log("TAXED  succ:",(b.succ*100).toFixed(1)+"%  medFinal:",Math.round(b.fins[Math.floor(b.fins.length*.5)]).toLocaleString(), " p5:",Math.round(b.fins[Math.floor(b.fins.length*.05)]).toLocaleString());
console.log("Δ succ:",((b.succ-a.succ)*100).toFixed(1),"pp — and the patch is a LOWER bound (tax on discretionary RRSP draws still unfunded)");

// fat-tail effect on same profile
seed(2026); const c=runMC_base(Object.assign({},prof,{fatT:true}),1500);
console.log("\nfatT=true (unstandardized t5): succ:",(c.succ*100).toFixed(1)+"% vs",(a.succ*100).toFixed(1)+"% — gap mixes tails with +29% vol");
