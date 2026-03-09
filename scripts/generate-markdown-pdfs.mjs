import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

function escapeHtml(input) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function inlineFormat(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function markdownToHtml(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let inUl = false;
  let inOl = false;
  let inCode = false;

  const closeLists = () => {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      out.push("</ol>");
      inOl = false;
    }
  };

  for (const raw of lines) {
    const line = raw;

    if (line.startsWith("```")) {
      closeLists();
      if (!inCode) {
        inCode = true;
        out.push("<pre><code>");
      } else {
        inCode = false;
        out.push("</code></pre>");
      }
      continue;
    }

    if (inCode) {
      out.push(`${escapeHtml(line)}\n`);
      continue;
    }

    if (!line.trim()) {
      closeLists();
      out.push('<div class="spacer"></div>');
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      closeLists();
      const level = h[1].length;
      out.push(`<h${level}>${inlineFormat(h[2])}</h${level}>`);
      continue;
    }

    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    if (ul) {
      if (inOl) {
        out.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        out.push("<ul>");
        inUl = true;
      }
      out.push(`<li>${inlineFormat(ul[1])}</li>`);
      continue;
    }

    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ol) {
      if (inUl) {
        out.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        out.push("<ol>");
        inOl = true;
      }
      out.push(`<li>${inlineFormat(ol[1])}</li>`);
      continue;
    }

    closeLists();
    out.push(`<p>${inlineFormat(line)}</p>`);
  }

  closeLists();
  if (inCode) out.push("</code></pre>");
  return out.join("\n");
}

function makeDoc(title, bodyHtml) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      @page { size: Letter; margin: 0.8in; }
      body { font-family: Georgia, "Times New Roman", serif; color: #111827; font-size: 11pt; line-height: 1.35; }
      h1 { font-size: 19pt; margin: 0 0 10px; }
      h2 { font-size: 14pt; margin: 16px 0 6px; border-bottom: 1px solid #d1d5db; padding-bottom: 3px; }
      h3 { font-size: 12pt; margin: 12px 0 4px; }
      h4,h5,h6 { font-size: 11pt; margin: 10px 0 3px; }
      p { margin: 6px 0; }
      ul,ol { margin: 6px 0 8px 20px; }
      li { margin: 3px 0; }
      code { font-family: Menlo, Consolas, monospace; font-size: 10pt; background: #f3f4f6; padding: 1px 4px; border-radius: 3px; }
      pre { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px; overflow-wrap: anywhere; white-space: pre-wrap; }
      .spacer { height: 3px; }
    </style>
  </head>
  <body>${bodyHtml}</body>
</html>`;
}

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error(
      "Usage: node scripts/generate-markdown-pdfs.mjs <file1.md> <file2.md> ...",
    );
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  try {
    for (const file of files) {
      const abs = path.resolve(file);
      const raw = await fs.readFile(abs, "utf8");
      const html = makeDoc(path.basename(abs), markdownToHtml(raw));
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle" });
      const out = abs.replace(/\.md$/i, ".pdf");
      await page.pdf({
        path: out,
        format: "Letter",
        printBackground: true,
        margin: {
          top: "0.5in",
          right: "0.5in",
          bottom: "0.5in",
          left: "0.5in",
        },
      });
      await page.close();
      console.log(`Generated ${out}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
