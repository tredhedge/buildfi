// /lib/pdf-generator.ts
// Converts branded HTML report -> PDF buffer using Puppeteer
// Uses @sparticuz/chromium-min + remote binary for Vercel compatibility
import puppeteer, { type Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium-min";

const CHROMIUM_PACK = "https://github.com/nichochar/chromium-headless-aws/releases/download/v143.0.0/chromium-v143.0.0-pack.tar";

let _browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.connected) return _browser;

  const isLocal = process.env.NODE_ENV === "development";

  if (isLocal) {
    _browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath:
        process.platform === "darwin"
          ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
          : process.platform === "win32"
            ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
            : "/usr/bin/google-chrome",
    });
  } else {
    _browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 900 },
      executablePath: await chromium.executablePath(CHROMIUM_PACK),
      headless: true,
    });
  }

  return _browser;
}

export async function generatePDF(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    await page.evaluate(() => {
      return document.fonts.ready;
    });

    await new Promise((r) => setTimeout(r, 500));

    const pdfBuffer = await page.pdf({
      format: "Letter",
      printBackground: true,
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
      tagged: true,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

export async function closeBrowser(): Promise<void> {
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}