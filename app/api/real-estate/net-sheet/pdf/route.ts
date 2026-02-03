export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { chromium } from 'playwright';
import { formatDateForLocale } from '@/lib/email-templates';
import enMessages from '@/messages/en.json';
import frMessages from '@/messages/fr.json';
import esMessages from '@/messages/es.json';
import zhMessages from '@/messages/zh.json';

const pdfMessages = {
  en: enMessages,
  fr: frMessages,
  es: esMessages,
  zh: zhMessages,
};

interface NetSheetData {
  propertyAddress?: string;
  salePrice: number;
  state: string;
  mortgageBalance: number;
  commissionRate: number;
  closingCosts: {
    commission: number;
    transferTax: number;
    titleInsurance: number;
    escrowFee: number;
    recordingFees: number;
    total: number;
  };
  prepaidItems: {
    propertyTaxProration: number;
    hoaProration: number;
    homeWarranty: number;
    total: number;
  };
  estimatedProceeds: number;
  agentName?: string;
  agentEmail?: string;
  agentPhone?: string;
  agentBrokerage?: string;
}

function generateNetSheetHTML(data: NetSheetData, locale: 'en' | 'fr' | 'es' | 'zh' = 'en'): string {
  const messages = pdfMessages[locale] || pdfMessages.en;
  const t = messages.pdfs?.netSheet || pdfMessages.en.pdfs.netSheet;

  const currentDate = formatDateForLocale(new Date(), locale);

  // Format currency based on locale
  const localeMap: Record<string, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    es: 'es-ES',
    zh: 'zh-CN',
  };
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(localeMap[locale] || 'en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      line-height: 1.6;
      padding: 40px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #059669 0%, #0d9488 100%);
      color: white;
      padding: 32px 40px;
    }
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .header .subtitle {
      font-size: 14px;
      opacity: 0.9;
    }
    .property-info {
      background: rgba(255,255,255,0.15);
      padding: 16px 20px;
      border-radius: 8px;
      margin-top: 20px;
    }
    .property-info .address {
      font-size: 18px;
      font-weight: 600;
    }
    .property-info .state {
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 40px;
    }
    .section {
      margin-bottom: 32px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }
    .line-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .line-item:last-child {
      border-bottom: none;
    }
    .line-item .label {
      color: #475569;
      font-size: 15px;
    }
    .line-item .value {
      font-weight: 600;
      font-size: 15px;
      color: #1e293b;
    }
    .line-item .value.negative {
      color: #dc2626;
    }
    .subtotal {
      background: #f8fafc;
      padding: 16px 20px;
      border-radius: 8px;
      margin-top: 12px;
    }
    .subtotal .line-item {
      border-bottom: none;
      padding: 0;
    }
    .subtotal .label {
      font-weight: 600;
      color: #1e293b;
    }
    .summary-box {
      background: linear-gradient(135deg, #059669 0%, #0d9488 100%);
      color: white;
      padding: 32px;
      border-radius: 12px;
      margin-top: 24px;
    }
    .summary-title {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      opacity: 0.9;
      margin-bottom: 8px;
    }
    .summary-amount {
      font-size: 42px;
      font-weight: 700;
    }
    .summary-note {
      font-size: 13px;
      opacity: 0.8;
      margin-top: 12px;
    }
    .footer {
      padding: 32px 40px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
    }
    .agent-info {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .agent-details h3 {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 4px;
    }
    .agent-details p {
      font-size: 14px;
      color: #64748b;
      margin-bottom: 2px;
    }
    .date-info {
      text-align: right;
    }
    .date-info .label {
      font-size: 12px;
      color: #94a3b8;
      text-transform: uppercase;
    }
    .date-info .date {
      font-size: 14px;
      color: #475569;
      font-weight: 500;
    }
    .disclaimer {
      margin-top: 24px;
      padding: 16px;
      background: #fef3c7;
      border-radius: 8px;
      font-size: 12px;
      color: #92400e;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${t.title}</h1>
      <p class="subtitle">${t.subtitle}</p>
      ${data.propertyAddress ? `
      <div class="property-info">
        <div class="address">${data.propertyAddress}</div>
        <div class="state">${data.state}</div>
      </div>
      ` : ''}
    </div>

    <div class="content">
      <!-- Sale Information -->
      <div class="section">
        <div class="section-title">${t.saleInformation}</div>
        <div class="line-item">
          <span class="label">${t.salePrice}</span>
          <span class="value">${formatCurrency(data.salePrice)}</span>
        </div>
        <div class="line-item">
          <span class="label">${t.commissionRate}</span>
          <span class="value">${data.commissionRate}%</span>
        </div>
      </div>

      <!-- Closing Costs -->
      <div class="section">
        <div class="section-title">${t.closingCosts}</div>
        <div class="line-item">
          <span class="label">${t.realEstateCommission}</span>
          <span class="value negative">-${formatCurrency(data.closingCosts.commission)}</span>
        </div>
        <div class="line-item">
          <span class="label">${t.transferTax}</span>
          <span class="value negative">-${formatCurrency(data.closingCosts.transferTax)}</span>
        </div>
        <div class="line-item">
          <span class="label">${t.titleInsurance}</span>
          <span class="value negative">-${formatCurrency(data.closingCosts.titleInsurance)}</span>
        </div>
        <div class="line-item">
          <span class="label">${t.escrowFee}</span>
          <span class="value negative">-${formatCurrency(data.closingCosts.escrowFee)}</span>
        </div>
        <div class="line-item">
          <span class="label">${t.recordingFees}</span>
          <span class="value negative">-${formatCurrency(data.closingCosts.recordingFees)}</span>
        </div>
        <div class="subtotal">
          <div class="line-item">
            <span class="label">${t.totalClosingCosts}</span>
            <span class="value negative">-${formatCurrency(data.closingCosts.total)}</span>
          </div>
        </div>
      </div>

      <!-- Prepaid Items -->
      <div class="section">
        <div class="section-title">${t.prepaidItems}</div>
        <div class="line-item">
          <span class="label">${t.propertyTaxProration}</span>
          <span class="value negative">-${formatCurrency(data.prepaidItems.propertyTaxProration)}</span>
        </div>
        <div class="line-item">
          <span class="label">${t.hoaProration}</span>
          <span class="value negative">-${formatCurrency(data.prepaidItems.hoaProration)}</span>
        </div>
        <div class="line-item">
          <span class="label">${t.homeWarranty}</span>
          <span class="value negative">-${formatCurrency(data.prepaidItems.homeWarranty)}</span>
        </div>
        <div class="subtotal">
          <div class="line-item">
            <span class="label">${t.totalPrepaidItems}</span>
            <span class="value negative">-${formatCurrency(data.prepaidItems.total)}</span>
          </div>
        </div>
      </div>

      <!-- Mortgage Payoff -->
      <div class="section">
        <div class="section-title">${t.mortgagePayoff}</div>
        <div class="line-item">
          <span class="label">${t.existingMortgageBalance}</span>
          <span class="value negative">-${formatCurrency(data.mortgageBalance)}</span>
        </div>
      </div>

      <!-- Summary -->
      <div class="summary-box">
        <div class="summary-title">${t.estimatedNetProceeds}</div>
        <div class="summary-amount">${formatCurrency(data.estimatedProceeds)}</div>
        <div class="summary-note">${t.summaryNote}</div>
      </div>
    </div>

    <div class="footer">
      <div class="agent-info">
        <div class="agent-details">
          ${data.agentName ? `<h3>${data.agentName}</h3>` : ''}
          ${data.agentBrokerage ? `<p>${data.agentBrokerage}</p>` : ''}
          ${data.agentEmail ? `<p>${data.agentEmail}</p>` : ''}
          ${data.agentPhone ? `<p>${data.agentPhone}</p>` : ''}
        </div>
        <div class="date-info">
          <div class="label">${t.preparedOn}</div>
          <div class="date">${currentDate}</div>
        </div>
      </div>
      <div class="disclaimer">
        <strong>${t.disclaimer}</strong> ${t.disclaimerText}
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data: NetSheetData = await request.json();

    // Add agent info from session if not provided
    if (!data.agentName && session.user.name) {
      data.agentName = session.user.name;
    }
    if (!data.agentEmail && session.user.email) {
      data.agentEmail = session.user.email;
    }

    // Get user's language preference
    let userLanguage: 'en' | 'fr' | 'es' | 'zh' = 'en';
    try {
      const { prisma } = await import('@/lib/db');
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { language: true },
      });
      if (user?.language && ['en', 'fr', 'es', 'zh'].includes(user.language)) {
        userLanguage = user.language as 'en' | 'fr' | 'es' | 'zh';
      }
    } catch (error) {
      console.error('Error fetching user language:', error);
    }

    const htmlContent = generateNetSheetHTML(data, userLanguage);

    // Generate PDF using Playwright
    console.log('[Net Sheet PDF] Generating PDF with Playwright...');
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'], // Required for Vercel/serverless
    });

    try {
      const page = await browser.newPage();
      
      // Set content and wait for it to load
      await page.setContent(htmlContent, { waitUntil: 'networkidle' });
      
      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'Letter',
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
        printBackground: true,
      });

      await browser.close();

      const filename = data.propertyAddress
        ? `Net_Sheet_${data.propertyAddress.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
        : `Seller_Net_Sheet_${Date.now()}.pdf`;

      console.log('[Net Sheet PDF] PDF generated successfully:', filename);

      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } catch (pdfError: any) {
      await browser.close();
      console.error('[Net Sheet PDF] Error generating PDF:', pdfError);
      throw pdfError;
    }
  } catch (error) {
    console.error('Net Sheet PDF error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate PDF' }, { status: 500 });
  }
}
