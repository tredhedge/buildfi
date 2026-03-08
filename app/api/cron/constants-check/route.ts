// /app/api/cron/constants-check/route.ts
// Automated fiscal constants update checker
// Scrapes CRA/government pages, compares against constants-registry.ts,
// emails a diff report to the owner for manual review + implementation.
//
// Vercel cron: January 10 + February 10 (0 14 10 1,2 *)
// Also callable manually: GET /api/cron/constants-check?force=1
// Protected by CRON_SECRET Authorization header

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import {
  TAX_YEAR,
  FEDERAL,
  CPP_QPP,
  OAS,
  GIS,
  TFSA,
  RRSP,
  EI,
  QPIP,
  CAPITAL_GAINS,
  ANNUAL_UPDATE_CHECKLIST,
} from "@/lib/constants-registry";

export const maxDuration = 120; // scraping can be slow

const resend = new Resend(process.env.RESEND_API_KEY);
const OWNER_EMAIL = process.env.CONSTANTS_NOTIFY_EMAIL || "tredhedge@gmail.com";

// ── Source URLs to scrape ──────────────────────────────────────

interface ScrapTarget {
  id: string;
  label: string;
  url: string;
  extract: (html: string) => ScrapedValue[];
}

interface ScrapedValue {
  field: string;
  scraped: string | number | null;
  current: string | number;
  match: boolean;
  note?: string;
}

// Helper: extract all dollar amounts from text near a keyword
function findAmountsNear(html: string, keyword: string, radius = 500): number[] {
  const plain = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
  const idx = plain.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx < 0) return [];
  const window = plain.slice(Math.max(0, idx - radius), idx + radius);
  const matches = window.match(/\$?\s*[\d,]+(?:\.\d{2})?/g) || [];
  return matches.map((m) => parseFloat(m.replace(/[$,\s]/g, ""))).filter((n) => !isNaN(n) && n > 0);
}

// Helper: extract percentages near a keyword
function findPctsNear(html: string, keyword: string, radius = 500): number[] {
  const plain = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
  const idx = plain.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx < 0) return [];
  const window = plain.slice(Math.max(0, idx - radius), idx + radius);
  const matches = window.match(/[\d]+\.[\d]+\s*%/g) || [];
  return matches.map((m) => parseFloat(m.replace(/%/g, ""))).filter((n) => !isNaN(n));
}

// Helper: check if a number appears in scraped text
function valueInPage(html: string, value: number, tolerance = 0.01): boolean {
  const plain = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/,/g, "");
  // Check for exact number (with possible $ prefix, commas, etc.)
  const str = value.toString();
  if (plain.includes(str)) return true;
  // Check with comma formatting
  const formatted = value.toLocaleString("en-CA");
  if (plain.includes(formatted)) return true;
  // Check dollar amounts with tolerance
  const allNums = plain.match(/[\d]+(?:\.[\d]+)?/g) || [];
  return allNums.some((n) => Math.abs(parseFloat(n) - value) / value < tolerance);
}

const TARGETS: ScrapTarget[] = [
  {
    id: "federal-brackets",
    label: "Federal Tax Brackets",
    url: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/canadian-income-tax-rates-individuals-current-previous-years.html",
    extract(html) {
      const results: ScrapedValue[] = [];
      // Check if our bracket thresholds appear on the page
      for (const bracket of FEDERAL.brackets) {
        results.push({
          field: `Federal bracket $${bracket.toLocaleString()}`,
          scraped: valueInPage(html, bracket) ? bracket : null,
          current: bracket,
          match: valueInPage(html, bracket),
          note: valueInPage(html, bracket) ? "Found on page" : "NOT found — may have changed",
        });
      }
      // Check basic personal amount
      results.push({
        field: "Federal basic personal amount",
        scraped: valueInPage(html, FEDERAL.personalAmount) ? FEDERAL.personalAmount : null,
        current: FEDERAL.personalAmount,
        match: valueInPage(html, FEDERAL.personalAmount),
      });
      return results;
    },
  },
  {
    id: "cpp-rates",
    label: "CPP/QPP Rates & Limits",
    url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/canada-pension-plan-cpp/cpp-contribution-rates-maximums-exemptions.html",
    extract(html) {
      return [
        {
          field: "CPP YMPE",
          scraped: valueInPage(html, CPP_QPP.ympe) ? CPP_QPP.ympe : null,
          current: CPP_QPP.ympe,
          match: valueInPage(html, CPP_QPP.ympe),
        },
        {
          field: "CPP YAMPE",
          scraped: valueInPage(html, CPP_QPP.yampe) ? CPP_QPP.yampe : null,
          current: CPP_QPP.yampe,
          match: valueInPage(html, CPP_QPP.yampe),
        },
        {
          field: "CPP basic exemption",
          scraped: valueInPage(html, CPP_QPP.basicExemption) ? CPP_QPP.basicExemption : null,
          current: CPP_QPP.basicExemption,
          match: valueInPage(html, CPP_QPP.basicExemption),
        },
      ];
    },
  },
  {
    id: "oas-amounts",
    label: "OAS Payment Amounts",
    url: "https://www.canada.ca/en/services/benefits/publicpensions/cpp/old-age-security/payments.html",
    extract(html) {
      return [
        {
          field: "OAS max monthly",
          scraped: valueInPage(html, OAS.maxMonthly) ? OAS.maxMonthly : null,
          current: OAS.maxMonthly,
          match: valueInPage(html, OAS.maxMonthly),
          note: "OAS is quarterly — values change Q1 each year",
        },
        {
          field: "OAS clawback threshold",
          scraped: valueInPage(html, OAS.clawbackThreshold) ? OAS.clawbackThreshold : null,
          current: OAS.clawbackThreshold,
          match: valueInPage(html, OAS.clawbackThreshold),
        },
      ];
    },
  },
  {
    id: "gis-amounts",
    label: "GIS Payment Amounts",
    url: "https://www.canada.ca/en/services/benefits/publicpensions/cpp/old-age-security/guaranteed-income-supplement/benefit-amount.html",
    extract(html) {
      return [
        {
          field: "GIS max single",
          scraped: valueInPage(html, GIS.maxSingle) ? GIS.maxSingle : null,
          current: GIS.maxSingle,
          match: valueInPage(html, GIS.maxSingle),
          note: "GIS is quarterly",
        },
      ];
    },
  },
  {
    id: "tfsa-limit",
    label: "TFSA Contribution Limit",
    url: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account/contributions.html",
    extract(html) {
      return [
        {
          field: "TFSA annual limit",
          scraped: valueInPage(html, TFSA.annualLimit) ? TFSA.annualLimit : null,
          current: TFSA.annualLimit,
          match: valueInPage(html, TFSA.annualLimit),
        },
      ];
    },
  },
  {
    id: "rrsp-limit",
    label: "RRSP Dollar Limit",
    url: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/contributing-a-rrsp-prpp/rrsp-mp-limit.html",
    extract(html) {
      return [
        {
          field: "RRSP dollar cap",
          scraped: valueInPage(html, RRSP.dollarCap) ? RRSP.dollarCap : null,
          current: RRSP.dollarCap,
          match: valueInPage(html, RRSP.dollarCap),
        },
      ];
    },
  },
  {
    id: "ei-rates",
    label: "EI Premium Rates",
    url: "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/employment-insurance-ei/ei-premium-rates-maximums.html",
    extract(html) {
      return [
        {
          field: "EI max insurable earnings",
          scraped: valueInPage(html, EI.maxInsurableEarnings) ? EI.maxInsurableEarnings : null,
          current: EI.maxInsurableEarnings,
          match: valueInPage(html, EI.maxInsurableEarnings),
        },
      ];
    },
  },
];

// ── Fetcher ────────────────────────────────────────────────────

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "BuildFi-Constants-Checker/1.0 (fiscal-update-monitor)",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// ── Report builder ─────────────────────────────────────────────

interface CheckResult {
  id: string;
  label: string;
  url: string;
  status: "ok" | "mismatch" | "fetch_failed";
  values: ScrapedValue[];
}

function buildEmailHTML(
  results: CheckResult[],
  taxYear: number,
  nextTaxYear: number
): string {
  const mismatches = results.filter((r) => r.status === "mismatch");
  const failures = results.filter((r) => r.status === "fetch_failed");
  const allOk = mismatches.length === 0 && failures.length === 0;

  const statusBadge = allOk
    ? '<span style="color:#22c55e;font-weight:bold">ALL CURRENT</span>'
    : `<span style="color:#ef4444;font-weight:bold">${mismatches.length} MISMATCHES, ${failures.length} FETCH FAILURES</span>`;

  let html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#FEFCF9;color:#1A1208;padding:20px;max-width:800px;margin:0 auto">
  <h1 style="color:#c49a1a;margin-bottom:4px">BuildFi Constants Check</h1>
  <p style="color:#666;margin-top:0">Tax Year ${taxYear} &rarr; checking for ${nextTaxYear} updates</p>
  <p style="font-size:18px">${statusBadge}</p>
  <hr style="border-color:#E8E0D4">
`;

  for (const r of results) {
    const icon =
      r.status === "ok" ? "&#9989;" : r.status === "fetch_failed" ? "&#9888;" : "&#10060;";
    html += `
  <h3>${icon} ${r.label} <span style="font-weight:normal;font-size:12px;color:#666">[${r.status}]</span></h3>
  <p style="font-size:12px;color:#999;word-break:break-all"><a href="${r.url}">${r.url}</a></p>
`;

    if (r.status === "fetch_failed") {
      html += `<p style="color:#f59e0b">Could not fetch this page. Check manually.</p>`;
      continue;
    }

    html += `<table style="border-collapse:collapse;width:100%;font-size:14px;margin-bottom:16px">
      <tr style="background:#F8F4EE">
        <th style="text-align:left;padding:6px;border:1px solid #E8E0D4">Field</th>
        <th style="text-align:left;padding:6px;border:1px solid #E8E0D4">Current in Engine</th>
        <th style="text-align:left;padding:6px;border:1px solid #E8E0D4">Found on CRA</th>
        <th style="text-align:center;padding:6px;border:1px solid #E8E0D4">Match</th>
      </tr>`;

    for (const v of r.values) {
      const bg = v.match ? "" : 'style="background:#fef2f2"';
      html += `
      <tr ${bg}>
        <td style="padding:6px;border:1px solid #E8E0D4">${v.field}</td>
        <td style="padding:6px;border:1px solid #E8E0D4"><strong>${v.current}</strong></td>
        <td style="padding:6px;border:1px solid #E8E0D4">${v.scraped ?? '<em style="color:#999">not found</em>'}</td>
        <td style="padding:6px;border:1px solid #E8E0D4;text-align:center">${v.match ? "&#9989;" : "&#10060;"}</td>
      </tr>`;
      if (v.note) {
        html += `
      <tr ${bg}>
        <td colspan="4" style="padding:2px 6px;border:1px solid #E8E0D4;font-size:12px;color:#666">&nbsp;&nbsp;&rarr; ${v.note}</td>
      </tr>`;
      }
    }
    html += `</table>`;
  }

  // Checklist section
  html += `
  <hr style="border-color:#E8E0D4">
  <h2 style="color:#c49a1a">Annual Update Checklist</h2>
  <p style="color:#666;font-size:14px">Files to update when constants change:</p>
  <table style="border-collapse:collapse;width:100%;font-size:13px">
    <tr style="background:#F8F4EE">
      <th style="text-align:left;padding:6px;border:1px solid #E8E0D4">Category</th>
      <th style="text-align:left;padding:6px;border:1px solid #E8E0D4">Files</th>
    </tr>`;

  for (const item of ANNUAL_UPDATE_CHECKLIST) {
    html += `
    <tr>
      <td style="padding:6px;border:1px solid #E8E0D4">${item.category}</td>
      <td style="padding:6px;border:1px solid #E8E0D4;font-family:monospace;font-size:12px">${item.files.join("<br>")}</td>
    </tr>`;
  }

  html += `</table>
  <hr style="border-color:#E8E0D4">
  <p style="font-size:12px;color:#999">
    Generated ${new Date().toISOString()}<br>
    Source: /api/cron/constants-check<br>
    Registry: lib/constants-registry.ts
  </p>
</body>
</html>`;

  return html;
}

// ── Main handler ───────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Auth: CRON_SECRET or ?force=1 with secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const force = req.nextUrl.searchParams.get("force");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    // Allow manual trigger with CRON_SECRET as query param
    const qs = req.nextUrl.searchParams.get("secret");
    if (!qs || qs !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  console.log("[cron/constants-check] Starting fiscal constants scan...");

  const results: CheckResult[] = [];

  // Scrape all targets in parallel
  const fetches = TARGETS.map(async (target) => {
    const html = await fetchPage(target.url);
    if (!html) {
      return {
        id: target.id,
        label: target.label,
        url: target.url,
        status: "fetch_failed" as const,
        values: [],
      };
    }

    const values = target.extract(html);
    const hasMismatch = values.some((v) => !v.match);

    return {
      id: target.id,
      label: target.label,
      url: target.url,
      status: hasMismatch ? ("mismatch" as const) : ("ok" as const),
      values,
    };
  });

  const settled = await Promise.all(fetches);
  results.push(...settled);

  const mismatches = results.filter((r) => r.status === "mismatch");
  const failures = results.filter((r) => r.status === "fetch_failed");
  const allOk = mismatches.length === 0 && failures.length === 0;

  // Determine next tax year
  const now = new Date();
  const nextYear = now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();

  // Build + send email
  const emailHTML = buildEmailHTML(results, TAX_YEAR, nextYear);
  const subject = allOk
    ? `[BuildFi] Constants Check: All current (${TAX_YEAR})`
    : `[BuildFi] Constants Check: ${mismatches.length} mismatches, ${failures.length} failures`;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM || "BuildFi <noreply@buildfi.ca>",
      to: OWNER_EMAIL,
      subject,
      html: emailHTML,
    });
    console.log(`[cron/constants-check] Email sent to ${OWNER_EMAIL}`);
  } catch (err) {
    console.error("[cron/constants-check] Failed to send email:", err);
  }

  // Log summary
  const summary = {
    taxYear: TAX_YEAR,
    checked: results.length,
    ok: results.filter((r) => r.status === "ok").length,
    mismatches: mismatches.length,
    fetchFailures: failures.length,
    allCurrent: allOk,
    details: results.map((r) => ({
      id: r.id,
      status: r.status,
      mismatched: r.values.filter((v) => !v.match).map((v) => v.field),
    })),
  };

  console.log("[cron/constants-check] Complete:", JSON.stringify(summary));

  return NextResponse.json(summary);
}
