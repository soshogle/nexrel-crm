
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET POS ORDERS
 * List all POS orders with filtering
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const staffId = searchParams.get('staffId');

    const where: any = { userId: session.user.id };

    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (staffId) where.staffId = staffId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const orders = await prisma.pOSOrder.findMany({
      where,
      include: {
        items: true,
        staff: {
          select: {
            id: true,
            employeeId: true,
            user: {
              select: {
                name: true,
              },
            },
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('❌ POS orders fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

/**
 * CREATE POS ORDER
 * Create a new POS order
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      staffId,
      orderType,
      customerName,
      customerPhone,
      customerEmail,
      tableNumber,
      items,
      discount = 0,
      tip = 0,
      notes,
    } = body;

    // Validate required fields
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Order must have at least one item' },
        { status: 400 }
      );
    }

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => {
      return sum + item.quantity * item.unitPrice;
    }, 0);

    const tax = subtotal * 0.08; // 8% tax (customize as needed)
    const total = subtotal + tax - discount + tip;

    // Generate order number
    const orderNumber = `POS-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    // Create order with items
    const order = await prisma.pOSOrder.create({
      data: {
        userId: session.user.id,
        staffId,
        orderNumber,
        orderType: orderType || 'DINE_IN',
        status: 'PENDING',
        customerName,
        customerPhone,
        customerEmail,
        tableNumber,
        subtotal,
        tax,
        discount,
        tip,
        total,
        paymentStatus: 'UNPAID',
        notes,
        items: {
          create: items.map((item: any) => ({
            name: item.name,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
            modifiers: item.modifiers ? JSON.stringify(item.modifiers) : null,
            notes: item.notes,
            discount: item.discount || 0,
            tax: (item.quantity * item.unitPrice) * 0.08,
          })),
        },
      },
      include: {
        items: true,
        staff: {
          select: {
            employeeId: true,
            user: { select: { name: true } },
          },
        },
      },
    });

    console.log(`✅ POS order created: ${orderNumber}`);

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('❌ POS order creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
