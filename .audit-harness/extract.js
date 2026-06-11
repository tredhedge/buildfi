const fs = require('fs'); const path = require('path'); const vm = require('vm');
function loadEngine(htmlPath) {
  const src = fs.readFileSync(htmlPath, 'utf8');
  const s = src.lastIndexOf('/*__ENGINE_START__*/'); const e = src.lastIndexOf('/*__ENGINE_END__*/');
  let code = src.substring(s + 20, e);
  const sandbox = { Math, JSON, Date, Array, Object, Number, String, Boolean, isNaN, isFinite, parseFloat, parseInt, console,
    html: '', localStorage: { getItem: () => null, setItem: () => {} }, SAM_STRATEGIES: [], window: {}, self: {} };
  sandbox.globalThis = sandbox; vm.createContext(sandbox);
  vm.runInContext(code + '\n;this.__engine={runMC,optimizeDecum,calcCorpTax,calcOAS,calcGIS,calcPayroll,tRn,C,calcTax};', sandbox, { filename: 'engine.js' });
  return sandbox.__engine;
}
module.exports = { loadEngine };
