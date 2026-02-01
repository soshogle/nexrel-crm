
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GENERATE RECEIPT
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, receiptType = 'SALE', emailTo } = body;

    // Validate required fields
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get order details
    const order = await prisma.pOSOrder.findFirst({
      where: {
        id: orderId,
        userId: session.user.id,
      },
      include: {
        items: true,
        staff: {
          select: {
            employeeId: true,
            user: { select: { name: true } },
          },
        },
        user: {
          select: {
            name: true,
            phone: true,
            address: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Generate receipt number
    const receiptNumber = `REC-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Generate receipt HTML
    const receiptHTML = generateReceiptHTML(order, receiptNumber, receiptType);

    // Create receipt record
    const receipt = await prisma.receipt.create({
      data: {
        userId: session.user.id,
        orderId,
        receiptNumber,
        receiptType: receiptType as any,
        content: receiptHTML,
        emailSentTo: emailTo,
        emailSentAt: emailTo ? new Date() : undefined,
      },
    });

    // TODO: Send email if emailTo is provided
    // This would integrate with your existing email service

    console.log(`✅ Receipt generated: ${receiptNumber}`);

    return NextResponse.json({
      success: true,
      receipt,
      receiptHTML,
    });
  } catch (error) {
    console.error('❌ Receipt generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate receipt' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to generate receipt HTML
 */
function generateReceiptHTML(order: any, receiptNumber: string, receiptType: string): string {
  const businessName = order.user.name || 'Business Name';
  const businessPhone = order.user.phone || '';
  const businessAddress = order.user.address || '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Courier New', monospace; max-width: 300px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .business-name { font-size: 18px; font-weight: bold; }
        .receipt-type { font-size: 14px; margin-top: 10px; }
        .divider { border-top: 1px dashed #000; margin: 10px 0; }
        .item { display: flex; justify-content: space-between; margin: 5px 0; }
        .total { font-weight: bold; font-size: 16px; margin-top: 10px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="business-name">${businessName}</div>
        <div>${businessAddress}</div>
        <div>${businessPhone}</div>
        <div class="receipt-type">${receiptType} RECEIPT</div>
      </div>

      <div class="divider"></div>

      <div>
        <div>Receipt #: ${receiptNumber}</div>
        <div>Order #: ${order.orderNumber}</div>
        <div>Date: ${new Date(order.createdAt).toLocaleString()}</div>
        ${order.staff ? `<div>Cashier: ${order.staff.user.name}</div>` : ''}
        ${order.tableNumber ? `<div>Table: ${order.tableNumber}</div>` : ''}
        ${order.customerName ? `<div>Customer: ${order.customerName}</div>` : ''}
      </div>

      <div class="divider"></div>

      <div>
        ${order.items
          .map(
            (item: any) => `
          <div class="item">
            <div>${item.quantity}x ${item.name}</div>
            <div>$${parseFloat(item.total.toString()).toFixed(2)}</div>
          </div>
        `
          )
          .join('')}
      </div>

      <div class="divider"></div>

      <div>
        <div class="item">
          <div>Subtotal:</div>
          <div>$${parseFloat(order.subtotal.toString()).toFixed(2)}</div>
        </div>
        <div class="item">
          <div>Tax:</div>
          <div>$${parseFloat(order.tax.toString()).toFixed(2)}</div>
        </div>
        ${
          parseFloat(order.discount.toString()) > 0
            ? `
        <div class="item">
          <div>Discount:</div>
          <div>-$${parseFloat(order.discount.toString()).toFixed(2)}</div>
        </div>
        `
            : ''
        }
        ${
          parseFloat(order.tip.toString()) > 0
            ? `
        <div class="item">
          <div>Tip:</div>
          <div>$${parseFloat(order.tip.toString()).toFixed(2)}</div>
        </div>
        `
            : ''
        }
        <div class="item total">
          <div>TOTAL:</div>
          <div>$${parseFloat(order.total.toString()).toFixed(2)}</div>
        </div>
        ${
          order.paymentMethod
            ? `
        <div class="item">
          <div>Payment Method:</div>
          <div>${order.paymentMethod}</div>
        </div>
        `
            : ''
        }
      </div>

      <div class="divider"></div>

      <div class="footer">
        <div>Thank you for your business!</div>
        <div>Have a great day!</div>
      </div>
    </body>
    </html>
  `;
}
