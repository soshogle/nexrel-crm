export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

function generatePresentationHTML(presentation: any): string {
  const slides = presentation.slides || [];

  const slideHTML = slides
    .filter((s: any) => s.enabled !== false)
    .map((slide: any, index: number) => {
      const bgGradient = index % 2 === 0
        ? 'background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);'
        : 'background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);';

      let contentHTML = '';

      if (slide.stats?.length) {
        contentHTML += `<div class="stats-grid">${slide.stats.map((s: any) =>
          `<div class="stat-item"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>`
        ).join('')}</div>`;
      }

      if (slide.bulletPoints?.length) {
        contentHTML += `<ul class="bullet-list">${slide.bulletPoints.map((b: string) =>
          `<li>${b}</li>`
        ).join('')}</ul>`;
      }

      if (slide.content) {
        contentHTML += `<p class="slide-content">${slide.content}</p>`;
      }

      return `
        <div class="slide" style="${bgGradient}">
          <div class="slide-number">${index + 1}</div>
          <div class="slide-type">${(slide.type || '').toUpperCase()}</div>
          <h2 class="slide-title">${slide.title || ''}</h2>
          ${slide.subtitle ? `<h3 class="slide-subtitle">${slide.subtitle}</h3>` : ''}
          ${contentHTML}
        </div>
      `;
    }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${presentation.title || 'Presentation'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    .slide {
      width: 100%; min-height: 100vh; padding: 60px 80px;
      display: flex; flex-direction: column; justify-content: center;
      color: white; page-break-after: always; position: relative;
    }
    .slide:last-child { page-break-after: avoid; }
    .slide-number {
      position: absolute; bottom: 30px; right: 40px;
      font-size: 14px; opacity: 0.4;
    }
    .slide-type {
      font-size: 12px; letter-spacing: 0.15em;
      color: #f97316; font-weight: 600; margin-bottom: 16px;
    }
    .slide-title {
      font-size: 36px; font-weight: 700; margin-bottom: 12px; line-height: 1.2;
    }
    .slide-subtitle {
      font-size: 20px; color: #f97316; margin-bottom: 32px; font-weight: 400;
    }
    .slide-content {
      font-size: 16px; color: #cbd5e1; line-height: 1.7; max-width: 700px;
    }
    .stats-grid {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 20px; margin-bottom: 24px;
    }
    .stat-item {
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px; padding: 20px; text-align: center;
    }
    .stat-value { font-size: 24px; font-weight: 700; color: #f97316; }
    .stat-label { font-size: 13px; color: #94a3b8; margin-top: 4px; }
    .bullet-list {
      list-style: none; padding: 0; margin-bottom: 24px;
    }
    .bullet-list li {
      position: relative; padding-left: 24px; margin-bottom: 12px;
      font-size: 16px; color: #e2e8f0; line-height: 1.5;
    }
    .bullet-list li::before {
      content: "✓"; position: absolute; left: 0;
      color: #f97316; font-weight: 700;
    }
  </style>
</head>
<body>${slideHTML}</body>
</html>`;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { presentation } = body;

    if (!presentation) {
      return NextResponse.json({ error: 'Presentation data required' }, { status: 400 });
    }

    const html = generatePresentationHTML(presentation);

    // Try Playwright PDF, fall back to HTML
    try {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle' });
      const pdfBuffer = await page.pdf({
        format: 'Letter',
        landscape: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        printBackground: true,
      });
      await browser.close();

      const filename = `${(presentation.title || 'Presentation').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } catch {
      return NextResponse.json({ success: true, html });
    }
  } catch (error) {
    console.error('Presentation PDF error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
