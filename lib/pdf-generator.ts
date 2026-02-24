// /lib/pdf-generator.ts
// Converts branded HTML report → PDF buffer using Puppeteer
// Uses @sparticuz/chromium for Vercel serverless compatibility (~45MB)

import puppeteer, { type Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";

// Reuse browser instance across warm invocations
let _browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.connected) return _browser;

  const isLocal = process.env.NODE_ENV === "development";

  if (isLocal) {
    // Local dev: use system Chrome
    _browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      // Common paths — adjust for your OS
      executablePath:
        process.platform === "darwin"
          ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
          : process.platform === "win32"
            ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
            : "/usr/bin/google-chrome",
    });
  } else {
    // Vercel serverless: use @sparticuz/chromium
    _browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }

  return _browser;
}

/**
 * Generate a PDF from an HTML string.
 * The HTML should be a complete document with embedded CSS and fonts.
 * Returns a Buffer containing the PDF.
 */
export async function generatePDF(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Set content with generous timeout for font loading
    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // Wait for Google Fonts to load (DM Sans)
    await page.evaluate(() => {
      return document.fonts.ready;
    });

    // Small delay to ensure SVG charts render
    await new Promise((r) => setTimeout(r, 500));

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "Letter", // 8.5 x 11 — standard Canadian
      printBackground: true, // Preserve backgrounds & colors
      margin: {
        top: "0.5in",
        right: "0.6in",
        bottom: "0.5in",
        left: "0.6in",
      },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width:100%;text-align:center;font-size:8px;color:#C4944A;font-family:sans-serif;padding:0 0.6in">
          <span>buildfi.ca — Rapport Essentiel</span>
        </div>
      `,
      footerTemplate: `
        <div style="width:100%;display:flex;justify-content:space-between;font-size:8px;color:#999;font-family:sans-serif;padding:0 0.6in">
          <span>Confidentiel</span>
          <span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
        </div>
      `,
      preferCSSPageSize: false,
      tagged: true, // Accessibility
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

/**
 * Cleanup: close browser (call on process exit if needed)
 */
export async function closeBrowser(): Promise<void> {
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}
