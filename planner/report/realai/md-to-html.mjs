#!/usr/bin/env node
// md-to-html.mjs — Convert V3-ENGINE-TECHNICAL-REFERENCE.md → styled HTML
// with TOC sidebar, syntax-highlighted code, sticky navigation, print CSS.
//
// Run: node planner/report/realai/md-to-html.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mdPath = path.join(__dirname, 'V3-ENGINE-TECHNICAL-REFERENCE.md');
const htmlPath = path.join(__dirname, 'V3-ENGINE-TECHNICAL-REFERENCE.html');

const md = fs.readFileSync(mdPath, 'utf8');

// Extract H2 headings for TOC
const tocItems = [];
const renderer = new marked.Renderer();
const origHeading = renderer.heading.bind(renderer);
renderer.heading = function(text, level, raw, slugger) {
  const slug = (typeof text === 'string' ? text : (text.text || raw || ''))
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80);
  if (level === 2) tocItems.push({ text: typeof text === 'string' ? text : (text.text || raw), id: slug });
  return `<h${level} id="${slug}">${typeof text === 'string' ? text : marked.parseInline(text.text || raw)}</h${level}>\n`;
};

marked.setOptions({ renderer, gfm: true, breaks: false });

let body = marked.parse(md);

// Marked v9+ uses tokens — fall back: extract H2s manually if tocItems empty
if (tocItems.length === 0) {
  const re = /^##\s+(.+)$/gm;
  let m;
  while ((m = re.exec(md)) !== null) {
    const text = m[1].trim();
    const slug = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 80);
    tocItems.push({ text, id: slug });
  }
  // Inject IDs into rendered H2s
  let i = 0;
  body = body.replace(/<h2>([\s\S]*?)<\/h2>/g, (full, inner) => {
    if (i >= tocItems.length) return full;
    const id = tocItems[i++].id;
    return `<h2 id="${id}">${inner}</h2>`;
  });
}

const tocHtml = '<nav class="toc"><h3>Table of contents</h3><ol>'
  + tocItems.map(t => `<li><a href="#${t.id}">${t.text.replace(/\s*—\s*/g, ' — ')}</a></li>`).join('')
  + '</ol></nav>';

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>planner_v3 Engine — Technical Reference</title>
<style>
  :root {
    --bg: #fdfcfa;
    --text: #1a1a1a;
    --muted: #666;
    --accent: #c4944a;
    --accent-dark: #8a6428;
    --code-bg: #f6f4ee;
    --code-border: #e0d8c8;
    --sidebar-bg: #f9f7f2;
    --link: #4680c0;
    --link-hover: #2a5a8c;
    --table-header: #f5efe2;
    --table-border: #d8d0c0;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0;
    font: 15px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", "DM Sans", system-ui, sans-serif;
    color: var(--text);
    background: var(--bg);
  }
  .layout { display: grid; grid-template-columns: 280px 1fr; min-height: 100vh; }
  @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } .toc { position: relative !important; height: auto !important; max-height: none !important; } }
  .toc {
    background: var(--sidebar-bg);
    border-right: 1px solid var(--code-border);
    padding: 24px 18px;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
    font-size: 12.5px;
  }
  .toc h3 {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: var(--accent-dark);
    margin: 0 0 12px;
    font-weight: 700;
  }
  .toc ol {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .toc li { margin-bottom: 6px; line-height: 1.45; }
  .toc a {
    color: var(--text);
    text-decoration: none;
    display: block;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background 0.15s;
  }
  .toc a:hover {
    background: rgba(196, 148, 74, 0.12);
    color: var(--accent-dark);
  }
  main {
    max-width: 880px;
    padding: 32px 56px 80px;
    margin: 0 auto;
    width: 100%;
  }
  h1 {
    font-size: 32px;
    color: var(--accent-dark);
    margin: 0 0 8px;
    font-weight: 800;
    letter-spacing: -0.5px;
  }
  h2 {
    font-size: 22px;
    color: var(--accent-dark);
    margin: 48px 0 14px;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--accent);
    font-weight: 700;
    letter-spacing: -0.3px;
  }
  h3 {
    font-size: 17px;
    color: #333;
    margin: 28px 0 10px;
    font-weight: 700;
  }
  h4 {
    font-size: 14.5px;
    color: var(--muted);
    margin: 20px 0 8px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  p { margin: 0 0 12px; }
  hr { border: none; border-top: 1px solid var(--code-border); margin: 32px 0; }
  a { color: var(--link); text-decoration: none; }
  a:hover { color: var(--link-hover); text-decoration: underline; }
  ul, ol { margin: 8px 0 12px; padding-left: 24px; }
  li { margin-bottom: 4px; }
  strong { color: #000; font-weight: 700; }
  code {
    font-family: "SF Mono", Menlo, Consolas, "JetBrains Mono", monospace;
    font-size: 13px;
    background: var(--code-bg);
    color: #5a4830;
    padding: 1px 6px;
    border-radius: 3px;
    border: 1px solid var(--code-border);
  }
  pre {
    background: var(--code-bg);
    border: 1px solid var(--code-border);
    border-radius: 6px;
    padding: 14px 16px;
    overflow-x: auto;
    font-family: "SF Mono", Menlo, Consolas, "JetBrains Mono", monospace;
    font-size: 12.5px;
    line-height: 1.55;
    margin: 8px 0 16px;
  }
  pre code {
    background: none;
    border: none;
    padding: 0;
    color: #2a2a2a;
    font-size: 12.5px;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 12px 0 20px;
    font-size: 13.5px;
    background: #fff;
  }
  th {
    background: var(--table-header);
    color: var(--accent-dark);
    font-weight: 700;
    padding: 8px 12px;
    text-align: left;
    border: 1px solid var(--table-border);
    font-size: 12.5px;
  }
  td {
    padding: 7px 12px;
    border: 1px solid var(--table-border);
    vertical-align: top;
  }
  tr:nth-child(even) td { background: #fbfaf6; }
  blockquote {
    border-left: 3px solid var(--accent);
    background: rgba(196, 148, 74, 0.06);
    padding: 8px 16px;
    margin: 12px 0;
    color: var(--muted);
    font-style: italic;
  }
  .header {
    background: linear-gradient(180deg, #2c2418 0%, #1a1610 100%);
    color: #f0ece4;
    padding: 28px 56px;
    border-bottom: 4px solid var(--accent);
  }
  .header h1 { color: var(--accent); margin: 0; }
  .header .subtitle { color: #a09890; font-size: 14px; margin-top: 6px; }
  @media print {
    .layout { display: block; }
    .toc { display: none; }
    main { max-width: none; padding: 0; }
    .header { background: none; color: var(--text); border-bottom: 2px solid var(--accent); padding: 0 0 12px; }
    .header h1 { color: var(--accent-dark); }
    h2 { page-break-before: auto; page-break-after: avoid; }
    pre, table { page-break-inside: avoid; }
    a { color: inherit; text-decoration: none; }
  }
</style>
</head>
<body>
<div class="layout">
${tocHtml}
<main>
<div class="header"><h1>planner_v3 Engine</h1><div class="subtitle">Complete Technical Reference</div></div>
${body}
</main>
</div>
</body>
</html>`;

fs.writeFileSync(htmlPath, html);
console.log('Wrote ' + htmlPath + ' (' + Math.round(html.length / 1024) + ' KB, ' + tocItems.length + ' TOC entries)');
