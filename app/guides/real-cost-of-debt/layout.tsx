import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The real cost of $1 of debt: what interest actually costs you | BuildFi",
  description:
    "$1,000 carried on a credit card costs ~$210/year. The same $1,000 invested in a TFSA at 6% real returns ~$70. Difference: 28¢ per dollar, every year. Cross-debt comparison and 3 repayment strategies for Canadians.",
  keywords: [
    "real cost of credit card debt",
    "compound interest debt",
    "pay down debt or invest",
    "Canadian debt calculator",
    "avalanche vs snowball",
    "debt consolidation",
    "opportunity cost of debt",
    "high interest debt",
  ],
  openGraph: {
    title: "The real cost of $1 of debt | BuildFi",
    description:
      "What credit card debt actually costs you, vs what that dollar would earn invested. With math, debt-type comparison, and 3 proven repayment strategies.",
    url: "https://buildfi.ca/guides/real-cost-of-debt",
    type: "article",
    locale: "en_CA",
    siteName: "BuildFi",
  },
  alternates: {
    canonical: "https://buildfi.ca/guides/real-cost-of-debt",
    languages: {
      "fr-CA": "https://buildfi.ca/guides/cout-reel-dette",
      "en-CA": "https://buildfi.ca/guides/real-cost-of-debt",
    },
  },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const ldArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "The real cost of $1 of debt: what interest actually costs you",
    description:
      "Numerical breakdown of the per-$1 cost of debt by type (credit card, line of credit, auto loan, mortgage) and the opportunity cost vs investing. With 3 repayment strategies.",
    author: { "@type": "Organization", name: "BuildFi", url: "https://buildfi.ca" },
    publisher: {
      "@type": "Organization",
      name: "BuildFi",
      url: "https://buildfi.ca",
      logo: { "@type": "ImageObject", url: "https://buildfi.ca/icon512.png" },
    },
    inLanguage: "en-CA",
    datePublished: "2026-05-03",
    dateModified: "2026-05-03",
    mainEntityOfPage: "https://buildfi.ca/guides/real-cost-of-debt",
  };
  const ldFAQ = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What's the real cost of credit card debt?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "At the average Canadian APR of 20.99% (2026), $1,000 carried for 12 months costs roughly $210 in interest. Add the opportunity cost (the same $1,000 invested in a TFSA at 6% real returns), and the net annual cost is closer to $280 per $1,000 of debt.",
        },
      },
      {
        "@type": "Question",
        name: "Should I pay down debt or invest?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Simple rule: if your debt's interest rate exceeds your portfolio's expected real return (typically 5-7% real for a balanced portfolio), pay down the debt first. For 18-25% debts (credit cards, personal lines of credit), no legal investment beats that net-of-risk return.",
        },
      },
      {
        "@type": "Question",
        name: "Which is better: avalanche or snowball?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Avalanche (highest rate first) is mathematically optimal — it minimizes total interest paid. Snowball (smallest balance first) is psychologically more motivating because the first debts disappear quickly. If discipline isn't an issue, choose avalanche. If you need visible momentum, snowball is defensible.",
        },
      },
      {
        "@type": "Question",
        name: "Is debt consolidation worth it?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Often yes for very high rate debt (credit cards). A 10-12% personal line of credit beats a 21% card. A 5% home equity refinance does even better, but transforms unsecured debt into debt secured by your home — a real risk in case of default. Always compare effective rates (with fees), not just headline rates.",
        },
      },
      {
        "@type": "Question",
        name: "Should I keep an emergency fund while paying down debt?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes — ideally $1,000 to one month of expenses minimum, even during aggressive repayment. Without a buffer, the smallest unexpected expense (tire, appliance) sends the debt back up — exactly what you're trying to avoid. The buffer breaks the cycle.",
        },
      },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldArticle) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldFAQ) }} />
      {children}
    </>
  );
}
