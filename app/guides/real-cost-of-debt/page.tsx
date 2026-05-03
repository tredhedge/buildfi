"use client";
/* eslint-disable react/no-unescaped-entities */
import { useEffect, useState } from "react";
import { getProductPalette } from "@/lib/design/product.tokens";
import { useProductBody } from "@/lib/design/product-components";
import { EditorialHeader, EditorialFooter } from "@/lib/design/components";

const cl = getProductPalette("light");

const TOC: { id: string; label: string }[] = [
  { id: "sec-hook", label: "The shocking number" },
  { id: "sec-formula", label: "The opportunity-cost formula" },
  { id: "sec-comparison", label: "Comparison by debt type" },
  { id: "sec-strategies", label: "3 repayment strategies" },
  { id: "sec-pitfalls", label: "4 common pitfalls" },
  { id: "sec-faq", label: "Frequently asked questions" },
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
  margin: "36px 0 10px",
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

function Pull({ kicker, children }: { kicker?: string; children: React.ReactNode }) {
  return (
    <blockquote style={{ margin: "32px 0", paddingLeft: 22, borderLeft: `2px solid ${cl.ac}` }}>
      {kicker ? (
        <div style={{ fontSize: 11, fontWeight: 700, color: cl.ac, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>
          {kicker}
        </div>
      ) : null}
      <div style={{ fontSize: 18, lineHeight: 1.7, color: cl.al, fontStyle: "italic", fontWeight: 400 }}>
        {children}
      </div>
    </blockquote>
  );
}

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
      <EditorialHeader lang="en" eyebrow="Practical guide · 8 min read" />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px 96px", display: "grid", gridTemplateColumns: "minmax(0, 760px) 240px", gap: 96, justifyContent: "center" }}>
        <main style={{ minWidth: 0, paddingTop: 40 }}>
          <header style={{ marginBottom: 48 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: cl.ac, letterSpacing: "0.20em", textTransform: "uppercase", marginBottom: 16 }}>
              Practical guide · 8 min
            </div>
            <h1 style={{ fontSize: "clamp(38px, 5.5vw, 56px)", fontWeight: 800, color: cl.al, lineHeight: 1.05, letterSpacing: "-0.03em", margin: "0 0 22px" }}>
              The real cost of $1 of debt
            </h1>
            <p style={lead}>
              A credit card doesn't just "cost" its interest. It costs everything that dollar could have earned if it had been invested. Here's the math, the comparison by debt type, and the strategies that actually work.
            </p>
            <div style={{ fontSize: 13, color: cl.dm, letterSpacing: "0.02em" }}>May 3, 2026 · 2026 Canadian rates</div>
          </header>

          <section style={{ margin: "32px 0 56px" }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: cl.ac, letterSpacing: "0.20em", textTransform: "uppercase", margin: "0 0 14px" }}>
              The essentials
            </h3>
            <ul style={{ margin: 0, paddingLeft: 22 }}>
              <li style={liStyle}>Average Canadian credit card: <strong>20.99% APR</strong> (2026). On $1,000 carried a year: ~<strong>$210 in interest</strong>.</li>
              <li style={liStyle}>Opportunity cost: the same $1,000 in a TFSA at 6% real would earn ~<strong>$70</strong>. Net difference: ~<strong>$280/year</strong>.</li>
              <li style={liStyle}>Rate hierarchy: <strong>CC 21% &gt; personal LOC 11% &gt; auto loan 7-9% &gt; mortgage 5-6%</strong>.</li>
              <li style={liStyle}>Simple rule: if debt rate &gt; expected real return on investment → pay down. Otherwise, invest.</li>
              <li style={{ ...liStyle, marginBottom: 0 }}>Avalanche beats snowball mathematically, unless motivation flags.</li>
            </ul>
          </section>

          <Rule />
          <h2 id="sec-hook" style={h2}>The shocking number</h2>
          <p style={para}>
            Most people look at their credit card balance as a negative number on a statement. They pay the minimum, sometimes a little more, and move on. Almost no one calculates what <em>each dollar of debt</em> actually costs them by year-end.
          </p>
          <p style={para}>
            Here's the reality, in plain numbers, for a typical Canadian credit card debt in 2026. On $1,000 carried for 12 months: direct interest ~<strong>$210</strong>. Opportunity cost of a TFSA at 6% real ~<strong>$60</strong>. Total real cost: <strong>$270</strong> — or 27% of capital, per year, that evaporates.
          </p>

          <Pull>
            A $5,000 debt carried for three years costs ~$3,200 in interest and lost opportunity. You repay $5,000, but you actually pay the equivalent of $8,200. You literally worked 64% more for nothing.
          </Pull>

          <Rule />
          <h2 id="sec-formula" style={h2}>The opportunity-cost formula</h2>
          <p style={para}>
            The total cost of debt isn't just the interest rate — it's that rate <strong>plus</strong> what the money could have earned elsewhere. That second component is called opportunity cost.
          </p>
          <p style={{ ...para, fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace', fontSize: 15, color: cl.al, padding: "16px 0", borderTop: `1px solid ${cl.bd}`, borderBottom: `1px solid ${cl.bd}`, margin: "24px 0", lineHeight: 1.8 }}>
            Total annual cost = Capital × (Debt rate + Opportunity return)
            <br />
            <span style={{ color: cl.dm, fontSize: 13 }}>For $1 of CC debt: 1 × (0.21 + 0.06) = $0.27/year</span>
          </p>
          <p style={para}>The opportunity return depends on what account would have received the money. For a typical Canadian:</p>
          <ul style={{ paddingLeft: 22, margin: "0 0 28px" }}>
            <li style={liStyle}><strong>TFSA invested 60/40</strong>: ~6% real long-term. No tax on growth.</li>
            <li style={liStyle}><strong>RRSP with tax refund</strong>: ~6% return + 30-40% immediate tax refund. Taxable on withdrawal.</li>
            <li style={liStyle}><strong>FHSA (first home purchase)</strong>: ~6% + RRSP-like deduction + tax-free withdrawal. The "cheat code".</li>
            <li style={liStyle}><strong>Non-registered account</strong>: ~6% gross, but taxed annually. Net closer to 4%.</li>
          </ul>

          <Rule />
          <h2 id="sec-comparison" style={h2}>Comparison by debt type</h2>
          <p style={para}>
            Not all debts are equal. Here's the annual cost per $1,000 for the most common debt types in Canada in 2026:
          </p>

          <div style={{ overflow: "auto", margin: "20px 0 8px" }}>
            <table style={{ width: "100%", fontSize: 15, borderCollapse: "collapse", minWidth: 540 }}>
              <thead>
                <tr>
                  <th style={{ padding: "10px 0", textAlign: "left", fontSize: 11, color: cl.dm, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, borderBottom: `2px solid ${cl.bd}` }}>Type</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, color: cl.dm, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, borderBottom: `2px solid ${cl.bd}` }}>Rate</th>
                  <th style={{ padding: "10px 12px", textAlign: "right", fontSize: 11, color: cl.dm, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, borderBottom: `2px solid ${cl.bd}` }}>Direct/yr</th>
                  <th style={{ padding: "10px 0 10px 12px", textAlign: "right", fontSize: 11, color: cl.dm, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, borderBottom: `2px solid ${cl.bd}` }}>Total/yr*</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Standard credit card", "20.99%", "$210", "$270"],
                  ["Store credit card", "28.00%", "$280", "$340"],
                  ["Personal line of credit", "11.00%", "$110", "$170"],
                  ["Auto loan (5 years)", "7.50%", "$75", "$135"],
                  ["HELOC", "6.50%", "$65", "$125"],
                  ["Residential mortgage", "5.25%", "$53", "$113"],
                ].map((row, i) => (
                  <tr key={i}>
                    <td style={{ padding: "12px 0", color: cl.al, fontWeight: 600, borderBottom: `1px solid ${cl.bd}` }}>{row[0]}</td>
                    <td style={{ padding: "12px 12px", textAlign: "right", color: cl.tx, fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace', fontSize: 14, borderBottom: `1px solid ${cl.bd}` }}>{row[1]}</td>
                    <td style={{ padding: "12px 12px", textAlign: "right", color: cl.tx, fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace', fontSize: 14, borderBottom: `1px solid ${cl.bd}` }}>{row[2]}</td>
                    <td style={{ padding: "12px 0 12px 12px", textAlign: "right", color: cl.al, fontWeight: 700, fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace', fontSize: 14, borderBottom: `1px solid ${cl.bd}` }}>{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 13, color: cl.dm, fontStyle: "italic", margin: "8px 0 28px" }}>
            * Direct interest + opportunity cost (TFSA 6% real). Simplified assumptions, no fees or RRSP tax-refund effect.
          </p>

          <p style={para}>
            Quick read: <strong>each $1,000 on a credit card costs ~5× more than on a mortgage.</strong> That's why you pay down high-rate debt <em>before</em> investing.
          </p>

          <Pull kicker="Case study · Sarah">
            Sarah has $4,800 on a 20.99% credit card. She's torn between (A) paying off the debt in 18 months, or (B) maxing out her TFSA with $4,800 and paying the minimum. Option A: ~$900 in interest paid. Option B: if the debt drags 5 years, ~$3,600 in interest vs ~$1,600 in TFSA growth. Net: -$2,000. Option A beats option B by ~$1,100.
          </Pull>

          <Rule />
          <h2 id="sec-strategies" style={h2}>3 repayment strategies</h2>

          <h3 style={h3}>1 · Avalanche — highest rate first</h3>
          <p style={para}>
            You pay the minimum on every debt <em>except one</em>: the one with the highest rate, where you concentrate all extra cash. Once it's paid off, you roll its payment into the next-highest rate, and so on.
          </p>
          <p style={para}>
            <strong>Upside:</strong> mathematically minimizes total interest. For 4 typical debts (CC 21%, LOC 11%, auto 7%, mortgage 5%), avalanche typically saves $600-1,200 vs paying equally everywhere. <strong>Downside:</strong> early wins take time if the largest debt also has the highest rate. Discipline must hold.
          </p>

          <h3 style={h3}>2 · Snowball — smallest balance first</h3>
          <p style={para}>
            You attack the smallest debt first, regardless of rate. When it disappears, you absorb its payment into the next one. The "snowball" grows.
          </p>
          <p style={para}>
            <strong>Upside:</strong> psychological momentum. Watching a debt disappear in 2-3 months creates motivation that's hard to replicate with avalanche. <strong>Downside:</strong> typically costs $100-400 more in interest. For who: people who tried avalanche and gave up.
          </p>

          <h3 style={h3}>3 · Consolidation — one loan at a lower rate</h3>
          <p style={para}>
            You roll all your high-rate debts into a single product at a lower rate — typically a personal line of credit (10-12%) or a home equity line (6-7%).
          </p>
          <p style={para}>
            <strong>Upside:</strong> can save $800-2,500/year on $10,000 of CC debt consolidated to a personal LOC. <strong>Downsides:</strong> a HELOC turns unsecured debt into debt secured by your home; not a solution if the underlying cause (spending &gt; income) isn't fixed; check fees that can eat 6-12 months of savings.
          </p>

          <Pull kicker="How to choose">
            Disciplined, debts at varied rates: avalanche. Need visible momentum: snowball for 2-3 months, then switch to avalanche. $10,000+ in CC, stable income: consolidate to a personal LOC (not HELOC at first). Underlying cause not fixed: none of the three works — fix the budget first.
          </Pull>

          <Rule />
          <h2 id="sec-pitfalls" style={h2}>4 common pitfalls</h2>

          <h3 style={h3}>1 · Skipping the emergency fund</h3>
          <p style={para}>
            Putting everything on debt without a $1,000-to-one-month buffer guarantees that the smallest emergency sends the debt back up — often onto the same card you just paid off. The minimum cushion is non-negotiable, even during aggressive repayment.
          </p>

          <h3 style={h3}>2 · Closing cards after paying them off</h3>
          <p style={para}>
            Closing an old card lowers your credit score (shorter history + higher utilization ratio). Keep cards open with a $0 balance, except those with absurd annual fees. Cut the physical card if temptation is too strong, but don't close the account.
          </p>

          <h3 style={h3}>3 · Skipping the minimum on other debts</h3>
          <p style={para}>
            Avalanche concentrates extra cash on one debt, but the minimum on the others is still due. Missing a minimum triggers penalties, late fees, and a credit score drop — wiping out months of effort in days.
          </p>

          <h3 style={h3}>4 · Refinancing without changing behaviour</h3>
          <p style={para}>
            Refinancing $8,000 of CC debt into a HELOC at 6% looks great on paper — theoretical savings of ~$1,200/year. But if the lifestyle that created the CC isn't changed, the CC fills back up in 18-24 months. Now you have <strong>both debts</strong>, plus your home as collateral.
          </p>

          <Rule />
          <h2 id="sec-cta" style={{ ...h2, fontSize: 22, marginTop: 80, marginBottom: 12 }}>Take it further</h2>
          <p style={para}>
            BuildFi's debt calculator compares avalanche, snowball and consolidation on your real numbers. Multi-province, couples, mortgages. No email required.
          </p>
          <p style={{ ...para, marginBottom: 0 }}>
            <a href="/outils/dettes?lang=en" style={{ color: cl.ac, fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 4 }}>
              Open the debt calculator →
            </a>
          </p>

          <Rule />
          <h2 id="sec-faq" style={h2}>Frequently asked questions</h2>

          <h3 style={h3}>Should I pay down debt or invest?</h3>
          <p style={para}>
            If your debt's interest rate exceeds the expected real return on your investments (typically 5-7% real), pay down. For 18-25% debts (cards, lines of credit), no legal investment beats that net-of-risk return.
          </p>

          <h3 style={h3}>What about "good" debt like a mortgage?</h3>
          <p style={para}>
            A 5.25% mortgage vs a TFSA invested at 6% real: the investment wins slightly (~75¢/$ /year). But the margin is thin, and the psychological cost of carrying debt is real. For many, accelerating the mortgage (a few extra payments per year) beats investing because it's guaranteed.
          </p>

          <h3 style={h3}>Should I prioritize TFSA or paying down the auto loan?</h3>
          <p style={para}>
            Auto loan at 7.5% vs TFSA at 6% real: <strong>pay down the auto loan first</strong>. Net difference: ~1.5%/year per dollar. Unless your employer matches RRSP contributions (then RRSP first up to the match, then auto loan, then TFSA).
          </p>

          <h3 style={h3}>How long before I see results?</h3>
          <p style={para}>
            With avalanche on $8,000 of CC at 21% and $350/month above the minimum, the first card is typically gone in 8-12 months. Total debt cleared in 24-30 months. The psychological "click" usually lands in month 3-4.
          </p>

          <div style={{ marginTop: 80, paddingTop: 24, borderTop: `1px solid ${cl.bd}`, fontSize: 13, color: cl.dm, lineHeight: 1.7 }}>
            <strong style={{ color: cl.al }}>Sources:</strong> Bank of Canada — Average credit card interest rates Q1 2026 · Statistics Canada — Household debt 2025 · FCAC — Consumer credit guidelines. Return assumptions: 60/40 balanced portfolio adjusted for 2% inflation.
            <br />
            <br />
            <em>This article is for informational and educational purposes only. Rates mentioned are 2026 averages — your situation may vary. This article does not constitute financial or legal advice. For tailored strategy, consult a Certified Financial Planner (CFP®).</em>
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
