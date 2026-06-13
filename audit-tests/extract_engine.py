#!/usr/bin/env python3
"""Extract engine.js, sam.js, extras.js from planner_v3.html for the audit tests.
Usage: python3 extract_engine.py [path/to/planner_v3.html]   (default: ../planner_v3.html or ./planner_v3.html)
Run from the audit-tests/ directory; outputs land beside this script."""
import re, sys, os
cands = sys.argv[1:] or ["planner_v3.html", "../planner_v3.html", "../../planner_v3.html"]
src_path = next((c for c in cands if os.path.exists(c)), None)
if not src_path: sys.exit("planner_v3.html not found; pass its path as an argument")
src = open(src_path, encoding="utf-8", errors="replace").read()
here = os.path.dirname(os.path.abspath(__file__))

# Engine: the real markers sit on their own line (preceded by a newline). The
# earlier occurrences are inside _getEngineCode's own indexOf string literals
# (preceded by a double-quote) — exclude those with a negative lookbehind.
starts = [m.start() for m in re.finditer(r'(?<=\n)/\*__ENGINE_START__\*/', src)]
ends   = [m.start() for m in re.finditer(r'(?<=\n)/\*__ENGINE_END__\*/', src)]
s, e = starts[0], ends[-1]
open(os.path.join(here, "engine.js"), "w", encoding="utf-8").write(src[s+len("/*__ENGINE_START__*/"):e])

# SAM_STRATEGIES (defined outside the engine block)
i = src.find("var SAM_STRATEGIES"); j = src.find("[", i); depth = 0; k = j
while k < len(src):
    if src[k] == "[": depth += 1
    elif src[k] == "]":
        depth -= 1
        if depth == 0: break
    k += 1
open(os.path.join(here, "sam.js"), "w", encoding="utf-8").write(src[i:src.find(";", k)+1])

# Helpers the embedded suite needs that live outside the engine markers
def fn(name):
    i = src.find("function " + name)
    if i < 0: return ""
    j = src.find("{", i); depth = 0; k = j
    while k < len(src):
        if src[k] == "{": depth += 1
        elif src[k] == "}":
            depth -= 1
            if depth == 0: break
        k += 1
    return src[i:k+1]
extras = "\n".join(fn(n) for n in ["calcInsuranceNeed","calcGoalSpending","amortize","debtVsInvest","multiDebtPayoff","runSmithSim","_sumSmith"])
open(os.path.join(here, "extras.js"), "w", encoding="utf-8").write(extras)
print("extracted engine.js (%d chars), sam.js, extras.js from %s" % (e-s, src_path))
