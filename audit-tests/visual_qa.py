#!/usr/bin/env python3
"""Visual QA harness for the BuildFi aesthetics work order (Parts A-E).

Renders the planner + sample reports at the audit breakpoints, in both themes,
and writes screenshots to ./qa/ for review. Run after every aesthetics task and
eyeball the relevant shots against the task's DoD before committing.

Usage:
    pip install playwright && playwright install chromium
    # serve the repo (the planner loads React from a CDN, so a server is cleaner
    # than file:// and matches production; the MCP browser blocks file:// anyway):
    python -m http.server 8753   # from the repo root, in another shell
    python audit-tests/visual_qa.py http://localhost:8753

    # or pass a file:// base for standalone Playwright (works outside the MCP):
    python audit-tests/visual_qa.py "file:///ABS/PATH/TO/repo"

DoD helpers:
    - chrome-height: printed for the planner (P2 wants <=110px @1440, <=180px @390)
    - contrast: samples 10 helper nodes, prints any below WCAG 4.5:1 (P7)
    - report C2: also emits a Letter PDF per report for page-clipping review
"""
import sys, time, os, pathlib

BASE = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://localhost:8753"
OUT = pathlib.Path("qa"); OUT.mkdir(exist_ok=True)

# (path, viewports, themes)
TARGETS = [
    ("planner/planner_v3.html",
     [(1440, 900), (1100, 900), (900, 900), (390, 844)],
     ["light", "dark"]),
    ("planner/planner_longform.html",
     [(1440, 900), (390, 844)],
     [None]),
    # Report samples live under planner/report/realai/output/ (20 personas).
    ("planner/report/realai/output/early_retiree_single_en.html",
     [(1366, 950), (1040, 950), (900, 1100), (680, 1100), (390, 844)],
     [None]),
    ("planner/report/realai/output/conservative_retiree_qc_fr.html",
     [(1366, 950), (680, 1100)],
     [None]),
]

CONTRAST_JS = r"""
() => {
  function lum(c){const m=c.match(/\d+(\.\d+)?/g).map(Number);const f=x=>{x/=255;return x<=.03928?x/12.92:((x+.055)/1.055)**2.4};return .2126*f(m[0])+.7152*f(m[1])+.0722*f(m[2])};
  function ratio(a,b){const L1=lum(a),L2=lum(b);return (Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05)}
  const nodes=[...document.querySelectorAll('*')].filter(el=>{const t=(el.childElementCount===0?el.textContent:'').trim();const cs=getComputedStyle(el);return t.length>4 && parseFloat(cs.fontSize)<=13 && el.offsetParent;}).slice(0,10);
  return nodes.map(el=>{const cs=getComputedStyle(el);let bg=cs.backgroundColor,p=el;while((bg==='rgba(0, 0, 0, 0)'||bg==='transparent')&&p.parentElement){p=p.parentElement;bg=getComputedStyle(p).backgroundColor;}return {t:(el.textContent||'').trim().slice(0,30),r:+ratio(cs.color,bg).toFixed(2)};});
}
"""

def run():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch()
        for path, sizes, themes in TARGETS:
            for w, h in sizes:
                for th in themes:
                    pg = b.new_page(viewport={"width": w, "height": h})
                    try:
                        pg.goto(f"{BASE}/{path}", wait_until="load", timeout=30000)
                    except Exception as e:
                        print(f"SKIP {path} {w}x{h}: {e}"); pg.close(); continue
                    time.sleep(4)
                    if th == "dark":
                        for label in ("Dark", "Sombre"):
                            try: pg.locator(f"text={label}").first.click(timeout=1200); time.sleep(1); break
                            except Exception: pass
                    name = path.split("/")[-1].replace(".html", "")
                    for i, y in enumerate([0, h, 3 * h]):
                        pg.evaluate(f"window.scrollTo(0,{y})"); time.sleep(.4)
                        pg.screenshot(path=str(OUT / f"{name}_{w}_{th}_{i}.png"))
                    # DoD probes for the planner
                    if "planner_v3" in path:
                        try:
                            ch = pg.evaluate("() => { const c=document.querySelector('#root>div')||document.body; const chrome=[...document.querySelectorAll('header,[class*=tab],[class*=kpi-strip]')]; return Math.round((chrome[0]?chrome[0].getBoundingClientRect().height:0)); }")
                            print(f"  {name} {w}x{h} chrome-ish height: {ch}px")
                        except Exception: pass
                        try:
                            low = [n for n in pg.evaluate(CONTRAST_JS) if n["r"] < 4.5]
                            if low: print(f"  {name} {w}x{h} LOW CONTRAST: {low}")
                        except Exception: pass
                    # report C2: page-clipping PDF
                    if "report" in path or "realai" in path:
                        try: pg.pdf(path=str(OUT / f"{name}_letter.pdf"), format="Letter")
                        except Exception: pass
                    pg.close()
        b.close()
    print(f"\nScreenshots in {OUT.resolve()} — review against each task's DoD before committing.")

if __name__ == "__main__":
    run()
