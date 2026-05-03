"use client";
/* eslint-disable react/no-unescaped-entities */
import { useEffect, useState } from "react";
import { getProductPalette } from "@/lib/design/product.tokens";
import { useProductBody } from "@/lib/design/product-components";
import { EditorialHeader, EditorialFooter } from "@/lib/design/components";

const cl = getProductPalette("light");

const TOC: { id: string; label: string }[] = [
  { id: "sec-why", label: "Why 90 days" },
  { id: "sec-matrix", label: "The effort × impact matrix" },
  { id: "sec-actions", label: "The 10 actions" },
  { id: "sec-plan", label: "30 / 60 / 90 day plan" },
  { id: "sec-pitfalls", label: "3 pitfalls to avoid" },
];

const h2: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 700,
  color: cl.al,
  letterSpacing: "-0.015em",
  margin: "80px 0 18px",
  scrollMarginTop: 96,
  lineHeight: 1.2,
};

const h3: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: cl.al,
  margin: "36px 0 8px",
  lineHeight: 1.3,
};

const para: React.CSSProperties = {
  fontSize: 17,
  lineHeight: 1.78,
  color: cl.tx,
  margin: "0 0 20px",
};

const lead: React.CSSProperties = {
  fontSize: 20,
  lineHeight: 1.55,
  color: cl.dm,
  margin: "0 0 18px",
  fontWeight: 400,
};

const liStyle: React.CSSProperties = {
  fontSize: 17,
  lineHeight: 1.78,
  color: cl.tx,
  marginBottom: 8,
};

function Rule() {
  return <div style={{ width: 40, height: 2, background: cl.ac, marginTop: 80, marginBottom: -60 }} aria-hidden />;
}

type Action = {
  num: string;
  title: string;
  amount: string;
  effort: string;
  difficulty: "Easy" | "Medium" | "More demanding";
  steps: string[];
  resource?: string;
};

const ACTIONS: Action[] = [
  {
    num: "01",
    title: "Renegotiate auto and home insurance",
    amount: "$20-60/month",
    effort: "1 h",
    difficulty: "Easy",
    steps: [
      "Pull out your most recent renewal.",
      "Get 3 competitive quotes online (CAA, Belairdirect, Intact, TD Insurance).",
      "Call your current broker with the best offer — they match or you leave. Typical savings: $240-720/year.",
    ],
  },
  {
    num: "02",
    title: "Audit ghost subscriptions",
    amount: "$30-80/month",
    effort: "30 min",
    difficulty: "Easy",
    steps: [
      "List all your recurring charges over the last 90 days (bank + CC statements).",
      "Mark the ones you haven't actually used this quarter: rarely-watched streaming, forgotten gym, expired SaaS.",
      "Cancel them. Most Canadians find 4-7 forgotten subscriptions totalling $30-80/month.",
    ],
  },
  {
    num: "03",
    title: "Move credit card debt to a personal LOC",
    amount: "$40-150/month",
    effort: "1-2 h",
    difficulty: "Medium",
    steps: [
      "If you have $3,000+ on a 21% card, request an unsecured personal LOC at your bank (typical rate: 9-12%).",
      "Transfer the entire CC balance to the LOC.",
      "Savings on $5,000: ~$50/month in interest. Keep the CC open but cut up the physical card.",
    ],
    resource: "/guides/real-cost-of-debt",
  },
  {
    num: "04",
    title: "Renegotiate internet and cell plans",
    amount: "$20-50/month",
    effort: "45 min",
    difficulty: "Easy",
    steps: [
      "Check competitor plans (Public Mobile, Fizz, Freedom, Bell, Telus, Rogers).",
      "Call retention (not regular customer service — say you want to cancel).",
      "Mention the competing offer. Most providers adjust. If not, switch. Savings: $25-50/month for both services.",
    ],
  },
  {
    num: "05",
    title: "Raise your auto insurance deductible",
    amount: "$10-25/month",
    effort: "15 min",
    difficulty: "Easy",
    steps: [
      "If your current deductible is $250 or $500, request $1,000.",
      "Typical savings: $120-300/year for $500 of additional risk — favourable if you haven't claimed in 3+ years.",
      "Break-even reached in 18-24 months without a claim.",
    ],
  },
  {
    num: "06",
    title: "Optimize RRSP vs TFSA by tax bracket",
    amount: "$0-50/month",
    effort: "2 h + tax filing",
    difficulty: "Medium",
    steps: [
      "If your taxable income is under $57,375 (federal bracket 1, 2026), your marginal rate is ~27% (Quebec) or ~20% (most provinces). RRSP gives only a modest refund.",
      "Above $57,375 (marginal rate ~37%+), RRSP becomes much more advantageous than TFSA.",
      "Redirect contributions to the right vehicle. The RRSP refund (1-3 months after filing) can be reinvested immediately.",
    ],
  },
  {
    num: "07",
    title: "Activate automatic round-up savings",
    amount: "$20-40/month",
    effort: "10 min",
    difficulty: "Easy",
    steps: [
      "Several Canadian banks (Tangerine, Wealthsimple, RBC NOMI) offer transaction round-ups to a savings account.",
      "Activate the feature. Zero behaviour change.",
      "For 40-60 monthly transactions, accumulates $20-40/month invisibly.",
    ],
  },
  {
    num: "08",
    title: "Batch cook once a week",
    amount: "$60-120/month",
    effort: "3 h/week",
    difficulty: "Medium",
    steps: [
      "Block 3 hours on Sunday. Cook 4-5 portions of 2 main dishes.",
      "Cuts delivery orders (Uber Eats, DoorDash, SkipTheDishes) by 60-70%.",
      "Delivery cost ~$22/meal vs batch ~$5/portion. Realistic savings: $60-120/month for 1-2 people.",
    ],
  },
  {
    num: "09",
    title: "Sell dormant items",
    amount: "$300-1,500 one-time",
    effort: "4-6 h over 2 weeks",
    difficulty: "Medium",
    steps: [
      "Walk through your home. Photograph 10-20 items unused for 12 months (bike, electronics, furniture, sports gear).",
      "List on Facebook Marketplace, Kijiji. Realistic price = 30-50% of new.",
      "Pour proceeds directly into TFSA or onto highest-rate debt. Equivalent to ~$50-100/month over 90 days.",
    ],
  },
  {
    num: "10",
    title: "Adjust source deductions",
    amount: "$0-150/month",
    effort: "30 min",
    difficulty: "More demanding",
    steps: [
      "If you receive a $2,000+ tax refund every year, your deductions are too high — you're lending money to the government at 0%.",
      "Ask your employer to adjust (TD1 federal + provincial equivalent: TP-1015.3 in Quebec, TD1ON in Ontario, etc.).",
      "Effect: $100-250/month extra on your paycheque, redirected to TFSA or debt. Caution: only if your tax situation is stable, otherwise tax owing in April.",
    ],
  },
];

export default function Article() {
  useProductBody("light");
  const [activeId, setActiveId] = useState<string>(TOC[0].id);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px" }
    );
    TOC.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <div suppressHydrationWarning style={{ background: cl.bg, minHeight: "100vh", color: cl.tx, fontFamily: 'var(--font-dm-sans),"Inter","Segoe UI",sans-serif' }}>
      <EditorialHeader lang="en" eyebrow="Action plan · 12 min read" />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 96px", display: "grid", gridTemplateColumns: "minmax(0, 760px) 240px", gap: 96, justifyContent: "center" }}>
        <main style={{ minWidth: 0, paddingTop: 40 }}>
          <header style={{ marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: cl.ac, letterSpacing: "0.20em", textTransform: "uppercase", marginBottom: 16 }}>
              Action plan · 12 min
            </div>
            <h1 style={{ fontSize: "clamp(38px, 5.5vw, 56px)", fontWeight: 800, color: cl.al, lineHeight: 1.05, letterSpacing: "-0.03em", margin: "0 0 22px" }}>
              10 actions to free up $200/month in 90 days
            </h1>
            <p style={lead}>
              No financial yoga, no empty promises. 10 concrete actions ranked by effort × impact, with average amounts and exact steps. 30 / 60 / 90 day plan to execute without burning out.
            </p>
            <div style={{ fontSize: 13, color: cl.dm, letterSpacing: "0.02em" }}>May 3, 2026 · 2026 Canadian rates</div>
          </header>

          <section style={{ margin: "32px 0 56px" }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: cl.ac, letterSpacing: "0.20em", textTransform: "uppercase", margin: "0 0 14px" }}>
              The essentials
            </h3>
            <ul style={{ margin: 0, paddingLeft: 22 }}>
              <li style={liStyle}>Doing all 10 actions over 90 days typically frees up <strong>$200-740/month</strong>, with no fundamental lifestyle change.</li>
              <li style={liStyle}>The first 4 (insurance, subscriptions, internet/cell, CC debt) usually cover the $200/month target on their own.</li>
              <li style={liStyle}>Realistic total effort: ~12-18 hours over 90 days (1-2 h/week).</li>
              <li style={liStyle}>Classic mistake: doing it all in one weekend. Burns out after 2 months. Spread it out.</li>
              <li style={{ ...liStyle, marginBottom: 0 }}>$200/month × 30 years at 6% real = ~<strong>$200,000</strong> at retirement, from money you were wasting.</li>
            </ul>
          </section>

          <Rule />
          <h2 id="sec-why" style={h2}>Why 90 days</h2>
          <p style={para}>
            Three months is the sweet spot for habit formation — long enough for routines to take hold, not so long that you stall. Behavioural studies (Lally et al. 2010, BJ Fogg models) suggest a simple routine sticks in 60-90 days. Too short, momentum drops at the first hiccup. Too long, the goal gets fuzzy.
          </p>
          <p style={para}>
            Ninety days also makes financial sense: several actions (insurance renegotiation, refinancing, source deductions) need 3-6 weeks before their first dollar of savings shows up. A 30-day window doesn't give effects time to compound.
          </p>
          <p style={para}>
            Most importantly, 90 days is <strong>traceable</strong>: at the end, compare your bank statement from D-90 to today, and you see the cash-flow difference clearly.
          </p>

          <Rule />
          <h2 id="sec-matrix" style={h2}>The effort × impact matrix</h2>
          <p style={para}>
            Not all actions are equal. Some free up $50/month in 30 minutes (renegotiating insurance), others $100/month but require 12 hours of recurring work (batch cooking). The 10 actions sort onto two axes:
          </p>

          <div style={{ overflow: "auto", margin: "20px 0 8px" }}>
            <table style={{ width: "100%", fontSize: 15, borderCollapse: "collapse", minWidth: 540 }}>
              <thead>
                <tr>
                  <th style={{ padding: "10px 0", textAlign: "left", fontSize: 11, color: cl.dm, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, borderBottom: `2px solid ${cl.bd}` }}>Quadrant</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, color: cl.dm, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, borderBottom: `2px solid ${cl.bd}` }}>Characteristic</th>
                  <th style={{ padding: "10px 0 10px 12px", textAlign: "left", fontSize: 11, color: cl.dm, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, borderBottom: `2px solid ${cl.bd}` }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Quick wins", "Low effort, high impact — do these first", "01, 02, 04, 05, 07"],
                  ["Targeted work", "Medium effort, high impact — worth the detour", "03, 06, 10"],
                  ["Long-term", "Recurring or one-shot effort", "08, 09"],
                ].map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding: "12px 0", color: cl.al, fontWeight: 700, borderBottom: `1px solid ${cl.bd}` }}>{row[0]}</td>
                    <td style={{ padding: "12px 12px", color: cl.tx, borderBottom: `1px solid ${cl.bd}` }}>{row[1]}</td>
                    <td style={{ padding: "12px 0 12px 12px", color: cl.ac, fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace', fontSize: 14, borderBottom: `1px solid ${cl.bd}` }}>{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ ...para, marginTop: 28 }}>
            <strong>Rule:</strong> quick wins first (month 1), targeted work next (month 2), long-term at the end (month 3). This order generates cash-flow early, which finances — psychologically and literally — the more demanding actions later.
          </p>

          <Rule />
          <h2 id="sec-actions" style={h2}>The 10 actions, in detail</h2>

          {ACTIONS.map((a, idx) => (
            <section
              key={a.num}
              style={{
                margin: "0",
                padding: idx === 0 ? "8px 0 36px" : "36px 0",
                borderTop: idx === 0 ? "none" : `1px solid ${cl.bd}`,
              }}
            >
              <h3 style={{ ...h3, margin: "0 0 6px", display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
                <span style={{ fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace', fontSize: 14, color: cl.ac, fontWeight: 700, letterSpacing: "0.06em" }}>
                  {a.num}
                </span>
                <span style={{ flex: 1 }}>{a.title}</span>
              </h3>
              <div style={{ fontSize: 13.5, color: cl.dm, fontStyle: "italic", margin: "0 0 14px" }}>
                <strong style={{ color: cl.al, fontStyle: "normal" }}>{a.amount}</strong> freed · ~{a.effort} of effort · {a.difficulty}
              </div>
              <ol style={{ paddingLeft: 22, margin: 0 }}>
                {a.steps.map((step, j) => (
                  <li key={j} style={{ ...liStyle, fontSize: 16.5 }} dangerouslySetInnerHTML={{ __html: step }} />
                ))}
              </ol>
              {a.resource ? (
                <div style={{ marginTop: 12, fontSize: 14 }}>
                  <a href={a.resource} style={{ color: cl.ac, textDecoration: "underline", textUnderlineOffset: 4, fontWeight: 600 }}>
                    Further reading →
                  </a>
                </div>
              ) : null}
            </section>
          ))}

          <Rule />
          <h2 id="sec-plan" style={h2}>30 / 60 / 90 day execution plan</h2>
          <p style={para}>
            The classic mistake is to do everything in one weekend, then collapse. Here's the sustainable rhythm:
          </p>

          <h3 style={h3}>Month 1 — Quick wins (4-6 h total)</h3>
          <ul style={{ paddingLeft: 22, margin: "0 0 24px" }}>
            <li style={liStyle}><strong>Wk 1:</strong> action 02 (subscription audit) + 07 (round-up savings) — 1 h.</li>
            <li style={liStyle}><strong>Wk 2:</strong> action 04 (internet/cell) — 1 h.</li>
            <li style={liStyle}><strong>Wk 3:</strong> action 01 (insurance) — 1-2 h.</li>
            <li style={{ ...liStyle, marginBottom: 0 }}><strong>Wk 4:</strong> action 05 (auto deductible) — 30 min. Result: ~$80-180/month freed in 30 days.</li>
          </ul>

          <h3 style={h3}>Month 2 — Targeted work (4-6 h total)</h3>
          <ul style={{ paddingLeft: 22, margin: "0 0 24px" }}>
            <li style={liStyle}><strong>Wks 5-6:</strong> action 03 (CC debt consolidation) — 2 h.</li>
            <li style={liStyle}><strong>Wk 7:</strong> action 06 (RRSP vs TFSA by bracket) — 2 h.</li>
            <li style={{ ...liStyle, marginBottom: 0 }}><strong>Wk 8:</strong> action 10 (source deductions) — 30 min, effect on next paycheque. Cumulative: ~$140-330/month.</li>
          </ul>

          <h3 style={h3}>Month 3 — Long-term + review (4-6 h total)</h3>
          <ul style={{ paddingLeft: 22, margin: "0 0 24px" }}>
            <li style={liStyle}><strong>Wk 9:</strong> action 09 (sell dormant items) — 4 h over 2 weeks.</li>
            <li style={liStyle}><strong>Wks 10-11:</strong> action 08 (batch cooking) — install the routine.</li>
            <li style={liStyle}><strong>Wk 12:</strong> full review. Compare D-90 vs today statements.</li>
            <li style={{ ...liStyle, marginBottom: 0 }}><strong>Final:</strong> $200-740/month freed depending on starting profile and engagement.</li>
          </ul>

          <Rule />
          <h2 id="sec-pitfalls" style={h2}>3 pitfalls to avoid</h2>

          <h3 style={h3}>1 · Doing it all in one weekend</h3>
          <p style={para}>
            Classic reflex: see the list, block a Saturday, attack 6 actions. Result: burnout after 2 months, back to zero. The 90-day spread is designed to generate <em>visible</em> wins each week, which keeps momentum.
          </p>

          <h3 style={h3}>2 · Not reinvesting the freed cash-flow</h3>
          <p style={para}>
            If the $200/month saved blends into the chequing account, it disappears in invisible consumption (spending expands to fill space). <strong>Automate the transfer</strong> from the first paycheque: automatic contribution to TFSA, RRSP, or extra debt payment the day after each deposit.
          </p>

          <h3 style={h3}>3 · Underestimating the 30-year effect</h3>
          <p style={para}>
            $200/month sounds small. But invested at 6% real for 30 years, that $200/month becomes ~$200,000 — or 4-6 extra years of retirement spending, from <em>money you were wasting</em>. BuildFi's savings calculator makes the number tangible.
          </p>

          <Rule />
          <h2 id="sec-cta" style={{ ...h2, fontSize: 22, marginTop: 80, marginBottom: 12 }}>Take it further</h2>
          <p style={para}>
            BuildFi's savings calculator projects any recurring expense, cut today, all the way to retirement — in today's dollars. Multi-frequency, instant, no email required.
          </p>
          <p style={{ ...para, marginBottom: 0 }}>
            <a href="/outils/coupe-depense?lang=en" style={{ color: cl.ac, fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 4 }}>
              Open the savings calculator →
            </a>
          </p>

          <div style={{ marginTop: 80, paddingTop: 24, borderTop: `1px solid ${cl.bd}`, fontSize: 13, color: cl.dm, lineHeight: 1.7 }}>
            <strong style={{ color: cl.al }}>Sources:</strong> Statistics Canada — Household expenditure 2024 · Insurance Bureau of Canada — Average auto/home premiums 2026 · CRA + provincial revenue agencies — TD1 forms · Bank of Canada — Q1 2026 reference rates. Return assumptions: 60/40 balanced portfolio adjusted for 2% inflation.
            <br />
            <br />
            <em>This article is for informational and educational purposes only. The dollar amounts shown are typical orders of magnitude for Canadian profiles in 2026 — your situation may vary substantially. This article does not constitute financial or legal advice. For tailored strategy, consult a Certified Financial Planner (CFP®).</em>
          </div>
        </main>

        <aside style={{ paddingTop: 40 }}>
          <div style={{ position: "sticky", top: 96 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: cl.dm, letterSpacing: "0.20em", textTransform: "uppercase", marginBottom: 16 }}>
              Contents
            </div>
            <nav aria-label="Table of contents" style={{ borderLeft: `1px solid ${cl.bd}` }}>
              {TOC.map((s) => {
                const active = s.id === activeId;
                return (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    style={{
                      display: "block",
                      padding: "9px 0 9px 16px",
                      marginLeft: -1,
                      fontSize: 13.5,
                      lineHeight: 1.4,
                      color: active ? cl.al : cl.dm,
                      fontWeight: active ? 600 : 400,
                      textDecoration: "none",
                      borderLeft: active ? `2px solid ${cl.ac}` : "2px solid transparent",
                      transition: "color 0.15s ease, border-color 0.15s ease",
                    }}
                  >
                    {s.label}
                  </a>
                );
              })}
            </nav>
          </div>
        </aside>
      </div>
      <EditorialFooter lang="en" hideObservational />
    </div>
  );
}
