// Run the embedded runTestSuite() from planner_v3.html in Node.
// The suite lives between the engine markers but references main-thread globals
// (html, SAM_STRATEGIES, localStorage). We extract the engine block + the
// SAM_STRATEGIES literal, supply stubs, then call runTestSuite().
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const file = path.join(__dirname, '..', 'planner', 'planner_v3.html');
const src = fs.readFileSync(file, 'utf8');

// 1) engine block
const s = src.lastIndexOf('/*__ENGINE_START__*/');
const e = src.lastIndexOf('/*__ENGINE_END__*/');
const engine = src.substring(s + 20, e);

// 1b) runTestSuite was moved OUT of the engine markers (audit 3.2). Extract it
// by brace-matching from its definition wherever it now lives.
function braceBlock(text, fnSignature) {
  const start = text.indexOf(fnSignature);
  if (start < 0) return '';
  let depth = 0, i = text.indexOf('{', start);
  const open = i;
  for (; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') { depth--; if (depth === 0) return text.substring(start, i + 1); }
  }
  return '';
}
const suiteFn = braceBlock(src, 'function runTestSuite()');

// 2) SAM_STRATEGIES literal: from "var SAM_STRATEGIES = [" up to "// === END SAM STRATEGIES ==="
const samStart = src.indexOf('var SAM_STRATEGIES = [');
const samEndMarker = src.indexOf('// === END SAM STRATEGIES ===');
const samBlock = src.substring(samStart, samEndMarker);

// 2b) externally-defined helpers the suite calls: calcGoalSpending + calcInsuranceNeed
const extrasStart = src.indexOf('function calcGoalSpending');
const extrasEnd = src.indexOf('function buildTabModel');
const extras = src.substring(extrasStart, extrasEnd);

// 3) sandbox with stubs
const store = {};
const sandbox = {
  Math, JSON, Date, Array, Object, Number, String, Boolean, RegExp,
  isNaN, isFinite, parseFloat, parseInt, console,
  html: src,                       // suite does html.indexOf("function runMC") etc.
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  },
  window: {},
  document: { createElement: () => ({ style: {}, appendChild() {}, remove() {} }) },
};
sandbox.window.localStorage = sandbox.localStorage;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

let code = engine + '\n' + suiteFn + '\n' + samBlock + '\n' + extras + '\n' +
  ';this.__suite = (typeof runTestSuite === "function") ? runTestSuite() : {error:"runTestSuite missing"};';

try {
  vm.runInContext(code, sandbox, { filename: 'suite.js' });
} catch (err) {
  console.error('EVAL ERROR:', err.message);
  console.error(err.stack.split('\n').slice(0, 4).join('\n'));
  process.exit(2);
}

const r = sandbox.__suite;
if (r.error) { console.error('SUITE ERROR:', r.error); process.exit(2); }
console.log(`TOTAL: ${r.total}  PASS: ${r.pass}  FAIL: ${r.fail}`);
if (r.fail > 0 && r.results) {
  console.log('\n--- FAILURES ---');
  r.results.filter(x => x.ok === false).forEach(x => {
    console.log(`[${x.cat}] ${x.name}: got=${x.got}  exp=${x.exp}`);
  });
}
