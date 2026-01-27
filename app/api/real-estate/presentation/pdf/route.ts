export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { presentation } = await request.json();

    if (!presentation) {
      return NextResponse.json({ error: 'Presentation data required' }, { status: 400 });
    }

    // Generate HTML for the presentation
    const html = generatePresentationHTML(presentation);

    // Use the HTML2PDF API
    const html2pdfUrl = process.env.HTML2PDF_API_URL;
    if (!html2pdfUrl) {
      // Return HTML for client-side PDF generation
      return NextResponse.json({ html, method: 'client' });
    }

    const pdfResponse = await fetch(html2pdfUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html,
        options: {
          format: 'A4',
          landscape: true,
          margin: { top: '0', right: '0', bottom: '0', left: '0' },
          printBackground: true,
        },
      }),
    });

    if (!pdfResponse.ok) {
      throw new Error('PDF generation failed');
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${presentation.title || 'presentation'}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

function generatePresentationHTML(presentation: any): string {
  const { slides, theme, brandColor, agentInfo } = presentation;
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#0f172a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#1e293b';
  const subtextColor = isDark ? '#94a3b8' : '#64748b';

  const slideHTML = slides.map((slide: any, index: number) => {
    let content = '';

    switch (slide.type) {
      case 'cover':
        content = `
          <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; text-align: center; background: linear-gradient(135deg, ${bgColor} 0%, ${isDark ? '#1e1b4b' : '#f1f5f9'} 100%);">
            ${slide.imageUrl ? `<div style="position: absolute; inset: 0; opacity: 0.3;"><img src="${slide.imageUrl}" style="width: 100%; height: 100%; object-fit: cover;" /></div>` : ''}
            <div style="position: relative; z-index: 10; padding: 40px;">
              <h1 style="font-size: 48px; font-weight: 700; color: ${textColor}; margin-bottom: 16px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">${slide.title}</h1>
              <p style="font-size: 24px; color: ${brandColor}; font-weight: 500;">${slide.subtitle || ''}</p>
            </div>
          </div>
        `;
        break;

      case 'property':
        content = `
          <div style="padding: 60px; height: 100%;">
            <h2 style="font-size: 36px; font-weight: 700; color: ${textColor}; margin-bottom: 8px;">${slide.title}</h2>
            <p style="font-size: 18px; color: ${brandColor}; margin-bottom: 40px;">${slide.subtitle || ''}</p>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 40px;">
              ${(slide.stats || []).map((stat: any) => `
                <div style="background: ${isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)'}; border: 1px solid ${isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)'}; border-radius: 12px; padding: 24px; text-align: center;">
                  <p style="font-size: 28px; font-weight: 700; color: ${brandColor};">${stat.value}</p>
                  <p style="font-size: 14px; color: ${subtextColor}; margin-top: 4px;">${stat.label}</p>
                </div>
              `).join('')}
            </div>
            ${slide.content ? `<p style="font-size: 16px; color: ${subtextColor}; line-height: 1.6;">${slide.content}</p>` : ''}
          </div>
        `;
        break;

      case 'features':
        content = `
          <div style="padding: 60px; height: 100%;">
            <h2 style="font-size: 36px; font-weight: 700; color: ${textColor}; margin-bottom: 8px;">${slide.title}</h2>
            <p style="font-size: 18px; color: ${brandColor}; margin-bottom: 40px;">${slide.subtitle || ''}</p>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
              ${(slide.bulletPoints || []).map((point: string) => `
                <div style="display: flex; align-items: flex-start; gap: 12px; padding: 16px; background: ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'}; border-radius: 8px;">
                  <span style="color: ${brandColor}; font-size: 20px;">✓</span>
                  <p style="font-size: 16px; color: ${textColor};">${point}</p>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        break;

      case 'area':
        content = `
          <div style="padding: 60px; height: 100%;">
            <h2 style="font-size: 36px; font-weight: 700; color: ${textColor}; margin-bottom: 8px;">${slide.title}</h2>
            <p style="font-size: 18px; color: ${brandColor}; margin-bottom: 24px;">${slide.subtitle || ''}</p>
            ${slide.stats ? `
              <div style="display: flex; gap: 24px; margin-bottom: 32px;">
                ${slide.stats.map((stat: any) => `
                  <div style="background: ${isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)'}; border: 1px solid ${isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)'}; border-radius: 8px; padding: 16px 24px; text-align: center;">
                    <p style="font-size: 24px; font-weight: 700; color: #10b981;">${stat.value}</p>
                    <p style="font-size: 12px; color: ${subtextColor};">${stat.label}</p>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
              ${(slide.bulletPoints || []).map((point: string) => `
                <div style="padding: 12px 16px; background: ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'}; border-radius: 8px;">
                  <p style="font-size: 15px; color: ${textColor};">${point}</p>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        break;

      case 'market':
        content = `
          <div style="padding: 60px; height: 100%;">
            <h2 style="font-size: 36px; font-weight: 700; color: ${textColor}; margin-bottom: 8px;">${slide.title}</h2>
            <p style="font-size: 18px; color: ${brandColor}; margin-bottom: 40px;">${slide.subtitle || ''}</p>
            <div style="background: ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'}; border-radius: 16px; padding: 40px;">
              <p style="font-size: 18px; color: ${textColor}; line-height: 1.8;">${slide.content || ''}</p>
            </div>
          </div>
        `;
        break;

      case 'contact':
        content = `
          <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; text-align: center; background: linear-gradient(135deg, ${brandColor}22 0%, ${bgColor} 100%);">
            <h2 style="font-size: 40px; font-weight: 700; color: ${textColor}; margin-bottom: 16px;">${slide.title}</h2>
            <p style="font-size: 20px; color: ${brandColor}; margin-bottom: 48px;">${slide.subtitle || ''}</p>
            <div style="background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}; border-radius: 16px; padding: 40px 60px;">
              <p style="font-size: 24px; font-weight: 600; color: ${textColor}; margin-bottom: 8px;">${agentInfo?.name || ''}</p>
              <p style="font-size: 16px; color: ${subtextColor}; margin-bottom: 4px;">${agentInfo?.title || ''}</p>
              <p style="font-size: 16px; color: ${subtextColor}; margin-bottom: 24px;">${agentInfo?.company || ''}</p>
              <p style="font-size: 18px; color: ${textColor};">📞 ${agentInfo?.phone || ''}</p>
              <p style="font-size: 18px; color: ${textColor};">✉️ ${agentInfo?.email || ''}</p>
            </div>
          </div>
        `;
        break;

      default:
        content = `
          <div style="padding: 60px; height: 100%;">
            <h2 style="font-size: 36px; font-weight: 700; color: ${textColor}; margin-bottom: 24px;">${slide.title}</h2>
            ${slide.content ? `<p style="font-size: 18px; color: ${textColor}; line-height: 1.6;">${slide.content}</p>` : ''}
            ${slide.bulletPoints ? `
              <ul style="list-style: none; padding: 0;">
                ${slide.bulletPoints.map((point: string) => `
                  <li style="font-size: 16px; color: ${textColor}; margin-bottom: 12px; padding-left: 24px; position: relative;">
                    <span style="position: absolute; left: 0; color: ${brandColor};">•</span>
                    ${point}
                  </li>
                `).join('')}
              </ul>
            ` : ''}
          </div>
        `;
    }

    return `
      <div style="width: 100%; height: 100vh; background: ${bgColor}; page-break-after: always; position: relative; overflow: hidden;">
        ${content}
        <div style="position: absolute; bottom: 20px; right: 40px; font-size: 12px; color: ${subtextColor};">
          ${index + 1} / ${slides.length}
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${presentation.title || 'Presentation'}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        @page { size: landscape; margin: 0; }
      </style>
    </head>
    <body>
      ${slideHTML}
    </body>
    </html>
  `;
}
