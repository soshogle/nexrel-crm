/**
 * Invoice PDF Generation API
 * Phase 6: Generate PDF invoices for dental treatments
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { chromium } from 'playwright';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Generate HTML for invoice
function generateInvoiceHTML(invoice: any, practiceInfo: any) {
  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const issueDate = new Date(invoice.issueDate).toLocaleDateString();
  const dueDate = invoice.dueDate
    ? new Date(invoice.dueDate).toLocaleDateString()
    : 'N/A';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 40px;
      color: #333;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
    }
    .practice-info {
      flex: 1;
    }
    .invoice-info {
      text-align: right;
    }
    .invoice-number {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .customer-info {
      margin-bottom: 30px;
    }
    .customer-info h3 {
      margin-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    .text-right {
      text-align: right;
    }
    .totals {
      margin-left: auto;
      width: 300px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    .totals-row.total {
      font-weight: bold;
      font-size: 18px;
      border-top: 2px solid #333;
      padding-top: 10px;
      margin-top: 10px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .status-paid {
      background-color: #10b981;
      color: white;
    }
    .status-pending {
      background-color: #f59e0b;
      color: white;
    }
    .status-overdue {
      background-color: #ef4444;
      color: white;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="practice-info">
      <h1>${practiceInfo.name || 'Dental Practice'}</h1>
      ${practiceInfo.address ? `<p>${practiceInfo.address}</p>` : ''}
      ${practiceInfo.phone ? `<p>Phone: ${practiceInfo.phone}</p>` : ''}
      ${practiceInfo.email ? `<p>Email: ${practiceInfo.email}</p>` : ''}
    </div>
    <div class="invoice-info">
      <div class="invoice-number">INVOICE #${invoice.invoiceNumber}</div>
      <p>Issue Date: ${issueDate}</p>
      <p>Due Date: ${dueDate}</p>
      <span class="status-badge status-${invoice.status.toLowerCase()}">${invoice.status}</span>
    </div>
  </div>

  <div class="customer-info">
    <h3>Bill To:</h3>
    <p><strong>${invoice.customerName}</strong></p>
    ${invoice.customerEmail ? `<p>${invoice.customerEmail}</p>` : ''}
    ${invoice.customerPhone ? `<p>${invoice.customerPhone}</p>` : ''}
    ${invoice.billingAddress ? `<p>${JSON.stringify(invoice.billingAddress)}</p>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="text-right">Quantity</th>
        <th class="text-right">Unit Price</th>
        <th class="text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${items
        .map(
          (item: any) => `
        <tr>
          <td>${item.description || item.name || 'Service'}</td>
          <td class="text-right">${item.quantity || 1}</td>
          <td class="text-right">$${Number(item.unitPrice || item.price || 0).toFixed(2)}</td>
          <td class="text-right">$${Number(item.total || item.unitPrice || item.price || 0).toFixed(2)}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>Subtotal:</span>
      <span>$${Number(invoice.subtotal || 0).toFixed(2)}</span>
    </div>
    ${invoice.taxRate && invoice.taxRate > 0 ? `
    <div class="totals-row">
      <span>Tax (${(invoice.taxRate * 100).toFixed(1)}%):</span>
      <span>$${Number(invoice.taxAmount || 0).toFixed(2)}</span>
    </div>
    ` : ''}
    ${invoice.discountAmount && invoice.discountAmount > 0 ? `
    <div class="totals-row">
      <span>Discount:</span>
      <span>-$${Number(invoice.discountAmount).toFixed(2)}</span>
    </div>
    ` : ''}
    <div class="totals-row total">
      <span>Total:</span>
      <span>$${Number(invoice.totalAmount || 0).toFixed(2)}</span>
    </div>
    ${invoice.paidAmount && invoice.paidAmount > 0 ? `
    <div class="totals-row">
      <span>Paid:</span>
      <span>$${Number(invoice.paidAmount).toFixed(2)}</span>
    </div>
    <div class="totals-row">
      <span>Balance:</span>
      <span>$${(Number(invoice.totalAmount || 0) - Number(invoice.paidAmount || 0)).toFixed(2)}</span>
    </div>
    ` : ''}
  </div>

  ${invoice.notes ? `
  <div class="footer">
    <p><strong>Notes:</strong></p>
    <p>${invoice.notes}</p>
  </div>
  ` : ''}

  ${invoice.paymentTerms ? `
  <div class="footer">
    <p><strong>Payment Terms:</strong> ${invoice.paymentTerms}</p>
  </div>
  ` : ''}
</body>
</html>
  `;
}

// POST - Generate PDF invoice
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { invoiceId } = body;

    if (!invoiceId) {
      return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 });
    }

    // Fetch invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Verify ownership
    if (invoice.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get practice info
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        phone: true,
      },
    });

    const practiceInfo = {
      name: user?.name || 'Dental Practice',
      email: user?.email || '',
      phone: user?.phone || '',
    };

    // Generate HTML
    const html = generateInvoiceHTML(invoice, practiceInfo);

    // Generate PDF using Playwright
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });

      await browser.close();

      // Convert to base64 for response
      const base64 = pdfBuffer.toString('base64');

      // Optionally save to storage and update invoice
      // For now, return the PDF directly
      return NextResponse.json({
        success: true,
        pdf: `data:application/pdf;base64,${base64}`,
        invoiceNumber: invoice.invoiceNumber,
      });
    } catch (pdfError) {
      await browser.close();
      throw pdfError;
    }
  } catch (error: any) {
    console.error('Error generating invoice PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error.message },
      { status: 500 }
    );
  }
}
