export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

function generateNetSheetHTML(data: NetSheetData): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Seller Net Sheet</title>
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
      <h1>Seller Net Sheet</h1>
      <p class="subtitle">Estimated Proceeds from Sale</p>
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
        <div class="section-title">Sale Information</div>
        <div class="line-item">
          <span class="label">Sale Price</span>
          <span class="value">${formatCurrency(data.salePrice)}</span>
        </div>
        <div class="line-item">
          <span class="label">Commission Rate</span>
          <span class="value">${data.commissionRate}%</span>
        </div>
      </div>

      <!-- Closing Costs -->
      <div class="section">
        <div class="section-title">Closing Costs</div>
        <div class="line-item">
          <span class="label">Real Estate Commission</span>
          <span class="value negative">-${formatCurrency(data.closingCosts.commission)}</span>
        </div>
        <div class="line-item">
          <span class="label">Transfer Tax</span>
          <span class="value negative">-${formatCurrency(data.closingCosts.transferTax)}</span>
        </div>
        <div class="line-item">
          <span class="label">Title Insurance</span>
          <span class="value negative">-${formatCurrency(data.closingCosts.titleInsurance)}</span>
        </div>
        <div class="line-item">
          <span class="label">Escrow Fee</span>
          <span class="value negative">-${formatCurrency(data.closingCosts.escrowFee)}</span>
        </div>
        <div class="line-item">
          <span class="label">Recording Fees</span>
          <span class="value negative">-${formatCurrency(data.closingCosts.recordingFees)}</span>
        </div>
        <div class="subtotal">
          <div class="line-item">
            <span class="label">Total Closing Costs</span>
            <span class="value negative">-${formatCurrency(data.closingCosts.total)}</span>
          </div>
        </div>
      </div>

      <!-- Prepaid Items -->
      <div class="section">
        <div class="section-title">Prepaid Items & Prorations</div>
        <div class="line-item">
          <span class="label">Property Tax Proration</span>
          <span class="value negative">-${formatCurrency(data.prepaidItems.propertyTaxProration)}</span>
        </div>
        <div class="line-item">
          <span class="label">HOA Proration</span>
          <span class="value negative">-${formatCurrency(data.prepaidItems.hoaProration)}</span>
        </div>
        <div class="line-item">
          <span class="label">Home Warranty (Optional)</span>
          <span class="value negative">-${formatCurrency(data.prepaidItems.homeWarranty)}</span>
        </div>
        <div class="subtotal">
          <div class="line-item">
            <span class="label">Total Prepaid Items</span>
            <span class="value negative">-${formatCurrency(data.prepaidItems.total)}</span>
          </div>
        </div>
      </div>

      <!-- Mortgage Payoff -->
      <div class="section">
        <div class="section-title">Mortgage Payoff</div>
        <div class="line-item">
          <span class="label">Existing Mortgage Balance</span>
          <span class="value negative">-${formatCurrency(data.mortgageBalance)}</span>
        </div>
      </div>

      <!-- Summary -->
      <div class="summary-box">
        <div class="summary-title">Estimated Net Proceeds</div>
        <div class="summary-amount">${formatCurrency(data.estimatedProceeds)}</div>
        <div class="summary-note">This is an estimate. Actual proceeds may vary based on final closing figures.</div>
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
          <div class="label">Prepared On</div>
          <div class="date">${currentDate}</div>
        </div>
      </div>
      <div class="disclaimer">
        <strong>Disclaimer:</strong> This Seller Net Sheet is an estimate only and is not a guarantee of actual proceeds.
        Actual costs may vary based on final contract terms, title company fees, and other factors.
        Please consult with your real estate professional for accurate figures.
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

    const htmlContent = generateNetSheetHTML(data);

    // Step 1: Create the PDF generation request
    const createResponse = await fetch('https://apps.abacus.ai/api/createConvertHtmlToPdfRequest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        html_content: htmlContent,
        pdf_options: {
          format: 'Letter',
          margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
          print_background: true,
        },
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json().catch(() => ({ error: 'Failed to create PDF request' }));
      console.error('PDF create error:', error);
      return NextResponse.json({ success: false, error: error.error || 'Failed to create PDF' }, { status: 500 });
    }

    const { request_id } = await createResponse.json();
    if (!request_id) {
      return NextResponse.json({ success: false, error: 'No request ID returned' }, { status: 500 });
    }

    // Step 2: Poll for status
    const maxAttempts = 60; // 60 seconds max
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statusResponse = await fetch('https://apps.abacus.ai/api/getConvertHtmlToPdfStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: request_id,
          deployment_token: process.env.ABACUSAI_API_KEY,
        }),
      });

      const statusResult = await statusResponse.json();
      const status = statusResult?.status || 'FAILED';
      const result = statusResult?.result || null;

      if (status === 'SUCCESS') {
        if (result && result.result) {
          const pdfBuffer = Buffer.from(result.result, 'base64');
          const filename = data.propertyAddress
            ? `Net_Sheet_${data.propertyAddress.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
            : `Seller_Net_Sheet_${Date.now()}.pdf`;

          return new NextResponse(pdfBuffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${filename}"`,
            },
          });
        } else {
          return NextResponse.json({ success: false, error: 'PDF generation completed but no result' }, { status: 500 });
        }
      } else if (status === 'FAILED') {
        return NextResponse.json({ success: false, error: result?.error || 'PDF generation failed' }, { status: 500 });
      }

      attempts++;
    }

    return NextResponse.json({ success: false, error: 'PDF generation timed out' }, { status: 500 });
  } catch (error) {
    console.error('Net Sheet PDF error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate PDF' }, { status: 500 });
  }
}
